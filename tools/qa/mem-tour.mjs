// GPU memory tour: city -> phase -> city for every level, with the WebGL allocation ledger
// (mem-gl.js) in each page, the three.js counters and the Windows counter of the run's own Chrome
// GPU process, measured after each return to the city. Used to tell real leaks (the ledger grows)
// from the counter's own behaviour (the ledger is flat, the counter is not).
//
//   node tools/qa/mem-tour.mjs [options]
//     --root <checkout>        the checkout to serve (default: this one), e.g. a wt-ref-* worktree
//     --pages 2|1              both players (default) or the host alone (the guest page stays blank)
//     --gc                     force a garbage collection (HeapProfiler.collectGarbage) before each measure
//     --phases a,b,c           the levels to visit (default: the order of the baseline report)
//     --lose                   at the end, WEBGL_lose_context on every page and measure again
//     --out <file.json>        where to write the rows (default tools/qa/out/mem-<time>.json)
//     --port 8850 --cdp 9420   server / DevTools ports (unique per agent)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  if (i < 0) return d;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROOT = resolve(arg('root', join(HERE, '../..')));
const PAGES = +arg('pages', 2);
const GC = !!arg('gc', false);
const LOSE = !!arg('lose', false);
const PORT = +arg('port', 8850);
const CDP = +arg('cdp', 9420);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUTF = resolve(arg('out', join(HERE, 'out', `mem-${stamp}.json`)));
mkdirSync(dirname(OUTF), { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const BASE = JSON.parse(readFileSync(join(HERE, 'baseline/2026-10-16-main-85fdce1.json'), 'utf8'));
const ORDER = typeof arg('phases') === 'string' ? arg('phases').split(',') : Object.keys(BASE.phases).filter((p) => p !== 'city');

const GLJS = readFileSync(join(HERE, 'mem-gl.js'), 'utf8');
const PROBE = readFileSync(join(HERE, 'probe.js'), 'utf8');
const srv = await serve(PORT, ROOT);
const base = `http://127.0.0.1:${PORT}/borderline/`;
const chrome = await launch({ out: join(dirname(OUTF), 'mem-chrome-' + stamp), port: CDP });
// the Windows counters of our GPU process (dedicated and shared), and of the whole adapter (every
// process on the GPU: other Chromes, the desktop), which sets how much dedicated memory we get
const counters = () => {
  if (process.platform !== 'win32') return {};
  const prof = chrome.prof.replace(/'/g, "''");
  const ps =
    `$g = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${prof}*' -and $_.CommandLine -like '*--type=gpu-process*' } | Select-Object -First 1; ` +
    String.raw`$o = @{}; if ($g) { foreach ($k in 'Dedicated Usage','Shared Usage','Total Committed') { $s = (Get-Counter ('\GPU Process Memory(pid_' + $g.ProcessId + '*)\' + $k)).CounterSamples; $o[$k] = [int](($s | Measure-Object CookedValue -Sum).Sum / 1MB) } }; ` +
    String.raw`$a = (Get-Counter '\GPU Adapter Memory(*)\Dedicated Usage').CounterSamples; $o['Adapter Dedicated'] = [int](($a | Measure-Object CookedValue -Maximum).Maximum / 1MB); ` +
    `$o | ConvertTo-Json -Compress`;
  try {
    const j = JSON.parse(execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }));
    return { dedicated: j['Dedicated Usage'], shared: j['Shared Usage'], committed: j['Total Committed'], adapter: j['Adapter Dedicated'] };
  } catch (e) {
    return {};
  }
};
const room = 'mem' + Math.random().toString(36).slice(2, 8);
const A = await chrome.page('A', null);
const B = await chrome.page('B', null);
const pages = PAGES === 2 ? [A, B] : [A];
for (const p of [A, B]) {
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: GLJS });
  await p.send('HeapProfiler.enable');
}
const run = { root: ROOT, pages: PAGES, gc: GC, started: new Date().toISOString(), rows: [], errors: chrome.errors };
try {
  await A.go(`${base}index.html?local=${room}&role=yoline&host=1&auto=1&nointro=1`);
  if (PAGES === 2) {
    await sleep(500);
    await B.go(`${base}index.html?local=${room}&role=william&auto=1&nointro=1`);
  }
  for (const p of pages) {
    await p.until("typeof Story !== 'undefined' && typeof R !== 'undefined' && !!R.renderer", 60000);
    await p.ev(PROBE + ';1');
    await p.until('!!__qa.phase()', 60000);
  }
  const has = await A.ev(`(${JSON.stringify(ORDER)}).filter((p) => Story.has(p))`);
  const go = async (ph) => {
    const t0 = Date.now();
    await A.ev(`Story.goto(${JSON.stringify(ph)});1`);
    for (const p of pages) await p.until(`__qa.phase() === ${JSON.stringify(ph)}`, 20000);
    const settle = await A.ev('__qa.settle()');
    return { ms: Date.now() - t0, settle };
  };
  const measure = async (label, ph) => {
    if (GC) for (const p of pages) await p.send('HeapProfiler.collectGarbage');
    await sleep(GC ? 1500 : 300);
    const c = counters();
    const row = { label, ph, gpuMB: c.dedicated, ...c, at: Date.now() };
    for (const p of pages)
      row[p.tag] = await p.ev(`(() => {
        const s = __gl.summary(12), m = R.renderer.info.memory;
        let meshes = 0; R.scene.traverse((o) => o.isMesh && meshes++);
        return { gl: s.totalMB, topTex: s.topTex, kinds: s.kinds, byPhase: s.byPhase, totals: s.totals, geo: m.geometries, tex: m.textures,
          programs: R.renderer.info.programs.length, meshes, colliders: Phys.count ? Phys.count() : null,
          heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) };
      })()`);
    run.rows.push(row);
    const s = pages.map((p) => `${p.tag} gl ${row[p.tag].gl} MB geo ${row[p.tag].geo} tex ${row[p.tag].tex} meshes ${row[p.tag].meshes}`).join(' | ');
    log(label.padEnd(16), `ded ${row.dedicated} sh ${row.shared} adapter ${row.adapter} MB |`, s);
    return row;
  };
  await go('city');
  await measure('start city', 'city');
  for (const ph of has) {
    await go(ph);
    await measure('in ' + ph, ph);
    await go('city');
    await measure('back from ' + ph, 'city');
  }
  for (const p of pages) await p.send('HeapProfiler.collectGarbage');
  await sleep(2000);
  await measure('end, after GC', 'city');
  // what keeps the remaining GPU objects alive: the scene (city, held table, avatars...) or a
  // cache off the scene (Tex maps of every kind met so far, scans, cards, models)
  run.census = {};
  for (const p of pages)
    run.census[p.tag] = await p.ev(`(() => {
      const G = new Set(), M = new Set(), X = new Set();
      R.scene.traverse((o) => { if (o.geometry) G.add(o.geometry); [].concat(o.material || []).forEach((m) => m && M.add(m)); });
      M.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) X.add(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) X.add(v); } });
      let big = 0, bigMB = 0;
      __gl.live.tex.forEach((r) => { if (r.w >= 2048) { big++; bigMB += r.bytes / 1048576; } });
      const ext = [...Tex.ext.values()];
      return { sceneGeo: G.size, gpuGeo: R.renderer.info.memory.geometries, sceneMat: M.size, sceneTexDirect: X.size,
        gpuTex: R.renderer.info.memory.textures, ledgerTex: __gl.live.tex.size, tex2048: big, tex2048MB: Math.round(bigMB),
        scansLoaded: ext.filter((e) => e.state === 'on').length, scansRegistered: ext.length,
        heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) };
    })()`);
  log('census', JSON.stringify(run.census));
  if (LOSE) {
    for (const p of pages) await p.ev("(() => { const x = R.renderer.getContext().getExtension('WEBGL_lose_context'); x && x.loseContext(); __gl.reset(); return 1; })()");
    await sleep(4000);
    run.lost = counters();
    run.lostMB = run.lost.dedicated;
    log('after lose_context', run.lostMB, 'MB counter');
  }
  run.peakMB = Math.max(...run.rows.map((r) => r.gpuMB || 0));
} catch (e) {
  run.failure = e.stack || String(e);
  log('FAIL', run.failure);
} finally {
  run.finished = new Date().toISOString();
  writeFileSync(OUTF, JSON.stringify(run, null, 1));
  await chrome.close();
  srv.close();
  log('peak', run.peakMB, 'MB · rows', run.rows.length, '·', OUTF);
}
