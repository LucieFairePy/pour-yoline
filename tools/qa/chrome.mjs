// Headless Chrome driven over the DevTools protocol, no dependencies (Node 22: global WebSocket).
// One Chrome per run, its own profile under tools/qa/out/, lowest CPU priority, closed at the end.
import { spawn, execFileSync } from 'node:child_process';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const win = process.platform === 'win32';

// Windows only: PowerShell over the processes whose command line holds our profile dir
const ps = (script) => {
  if (!win) return '';
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
};
const ours = (prof) =>
  `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${prof.replace(/'/g, "''")}*' }`;

export const launch = async ({ out, port = 9420, width = 960, height = 540, headless = true }) => {
  const prof = resolve(out, 'prof');
  rmSync(prof, { recursive: true, force: true });
  mkdirSync(prof, { recursive: true });
  const args = [
    '--remote-debugging-port=' + port,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--enable-precise-memory-info',
    '--user-data-dir=' + prof, `--window-size=${width},${height}`, 'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let version;
  for (let k = 0; k < 120 && !version; k++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    } catch (e) {
      await sleep(250);
    }
  }
  if (!version) throw new Error('Chrome did not start on port ' + port);
  ps(`${ours(prof)} | ForEach-Object { try { (Get-Process -Id $_.ProcessId).PriorityClass = 'Idle' } catch {} }`);

  const errors = [];
  const page = async (tag, url) => {
    const bws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => (bws.onopen = r));
    const tid = await new Promise((r) => {
      bws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id === 1) r(d.result.targetId);
      };
      bws.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: 'about:blank', newWindow: true } }));
    });
    const ws = new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${tid}`);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pend = new Map();
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pend.has(d.id)) {
        pend.get(d.id)(d.result || { error: d.error });
        pend.delete(d.id);
      } else if (d.method === 'Runtime.exceptionThrown') {
        const x = d.params.exceptionDetails;
        errors.push({ page: tag, kind: 'exception', text: ((x.exception && x.exception.description) || x.text || '').slice(0, 500) });
      } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
        errors.push({ page: tag, kind: 'console.error', text: d.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300) });
      }
    };
    const send = (method, params = {}) =>
      new Promise((r) => {
        const i = ++id;
        pend.set(i, r);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    const p = {
      tag,
      send,
      // evaluate an expression in the page (promises awaited); throws on a page exception
      async ev(expr) {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(tag + ': ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
        return r.result && r.result.value;
      },
      async go(u) {
        await send('Page.navigate', { url: u });
      },
      async shot(file) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        if (r && r.data) writeFileSync(file, Buffer.from(r.data, 'base64'));
      },
      // wait until fn (an expression) is truthy in the page
      async until(expr, ms = 30000) {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) {
          try {
            if (await p.ev(expr)) return true;
          } catch (e) {}
          await sleep(200);
        }
        return false;
      },
    };
    if (url) await p.go(url);
    return p;
  };

  // dedicated GPU memory of this Chrome's GPU process (MB), from the Windows performance counter
  const gpuMB = () => {
    const v = ps(
      `$g = ${ours(prof)} | Where-Object { $_.CommandLine -like '*--type=gpu-process*' } | Select-Object -First 1; ` +
        `if ($g) { $s = (Get-Counter ('\\GPU Process Memory(pid_' + $g.ProcessId + '*)\\Dedicated Usage')).CounterSamples; ` +
        `[int](($s | Measure-Object CookedValue -Sum).Sum / 1MB) }`,
    );
    return v === '' ? null : +v;
  };

  const close = async () => {
    try {
      proc.kill();
    } catch (e) {}
    await sleep(800);
    ps(`${ours(prof)} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`);
  };

  return { page, errors, gpuMB, close, prof };
};
