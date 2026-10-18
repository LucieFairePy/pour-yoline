// BORDERLINE regression suite: two headless players in local co-op (yoline = host, william),
// driven over the DevTools protocol. Checks loading, returning to the city, co-op agreement,
// save/resume, and records performance and memory, so a change can be compared with a baseline.
//
//   node tools/qa/suite.mjs [options]
//     --tests boot,phases,coop,save,cycles,play  which tests (default: all)
//     --play tr_s1,tr_c10                     interaction scripts to run (default: every tools/qa/play/*.mjs)
//     --phases tr_s1,tr_c10                   phases for the "phases" test (default: every level)
//     --cycles tr_c10:3,tr_h8:2               city -> level -> city round trips (default tr_s1:3,tr_c10:3)
//     --fresh                                 reload the pages before each phase (cold numbers)
//     --shots                                 screenshot each phase (both screens)
//     --compare tools/qa/baseline/x.json      print the difference with an earlier report
//     --out tools/qa/out/<name>               where to write report.json + summary.md
//     --port 8850 --cdp 9420                  server / DevTools ports (pick free ones per agent)
//     --url http://127.0.0.1:8820/borderline/ test an already running server instead
//
// Exit code 1 if a test failed or the page threw. Windows: GPU memory comes from the performance
// counters of this run's own Chrome GPU process; elsewhere it is null.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);

const TESTS = list(arg('tests')) || ['boot', 'phases', 'coop', 'save', 'cycles', 'play'];
const OUT = resolve(arg('out', join(HERE, 'out', new Date().toISOString().replace(/[:.]/g, '-'))));
const PORT = +arg('port', 8850);
const CDP = +arg('cdp', 9420);
const FRESH = !!arg('fresh', false);
const SHOTS = !!arg('shots', false);
mkdirSync(OUT, { recursive: true });

const PROBE = readFileSync(join(HERE, 'probe.js'), 'utf8');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const report = { started: new Date().toISOString(), tests: {}, phases: {}, cycles: {}, play: {}, errors: [], failures: [] };
const fail = (test, msg) => {
  report.failures.push({ test, msg });
  log('FAIL', test, msg);
};

let srv = null;
let base = arg('url', null);
if (!base) {
  srv = await serve(PORT);
  base = `http://127.0.0.1:${PORT}/borderline/`;
}
const chrome = await launch({ out: OUT, port: CDP });
const room = 'qa' + Math.random().toString(36).slice(2, 8);
const urlA = `${base}index.html?local=${room}&role=yoline&host=1&auto=1&nointro=1`;
const urlB = `${base}index.html?local=${room}&role=william&auto=1&nointro=1`;
const A = await chrome.page('A', null);
const B = await chrome.page('B', null);

const inject = async (p) => {
  await p.until("typeof Story !== 'undefined' && typeof R !== 'undefined' && !!R.renderer", 60000);
  await p.ev(PROBE + ';1');
};
// open (or reopen) both players and wait until they share a phase
const open = async () => {
  const t0 = Date.now();
  await A.go(urlA);
  await sleep(500);
  await B.go(urlB);
  await inject(A);
  await inject(B);
  const ok = await A.until('!!__qa.phase()', 60000) && (await B.until('!!__qa.phase()', 60000));
  const pa = await A.ev('__qa.phase()');
  const pb = await B.ev('__qa.phase()');
  return { ok: ok && pa === pb, phaseA: pa, phaseB: pb, ms: Date.now() - t0 };
};
// host jumps to a phase; both screens must follow; returns the time until the world settled
const go = async (ph) => {
  const t0 = Date.now();
  await A.ev(`Story.goto(${JSON.stringify(ph)});1`);
  const both =
    (await A.until(`__qa.phase() === ${JSON.stringify(ph)}`, 20000)) &&
    (await B.until(`__qa.phase() === ${JSON.stringify(ph)}`, 20000));
  const settle = await A.ev('__qa.settle()');
  return { both, ms: Date.now() - t0, settleMs: settle };
};
const errorsSince = (n) => chrome.errors.slice(n);

const levels = () =>
  A.ev(`(() => {
    const plan = typeof Trials !== 'undefined' ? Trials.list.map((t) => t.phase) : [];
    const extra = ['city', 'act1', 'act2', 'act3', 'act4', 'act5', 'final'];
    return [...extra, ...plan].filter((p, i, a) => a.indexOf(p) === i && Story.has(p));
  })()`);

try {
  // ---- boot (always): both players load, connect and agree on the opening phase
  {
    const n = chrome.errors.length;
    const r = await open();
    report.tests.boot = { ...r, errors: errorsSince(n).length };
    log('boot', JSON.stringify(r));
    if (!r.ok) fail('boot', `players disagree or did not start: ${r.phaseA} / ${r.phaseB}`);
    report.gpuAtBootMB = chrome.gpuMB();
    // every playable phase, for the coverage summary (which have a play script)
    report.allPhases = await levels().catch(() => []);
  }

  // ---- phases: every level loads on both screens without a page error
  if (TESTS.includes('phases')) {
    const want = list(arg('phases')) || (await levels());
    report.tests.phases = { count: want.length, ok: 0 };
    for (const ph of want) {
      if (FRESH) await open();
      const n = chrome.errors.length;
      let r;
      try {
        r = await go(ph);
        const m = await A.ev('__qa.metrics()');
        const errs = errorsSince(n);
        report.phases[ph] = { ...r, ...m, gpuMB: chrome.gpuMB(), errors: errs };
        if (SHOTS) {
          await A.shot(join(OUT, `${ph}-A.png`));
          await B.shot(join(OUT, `${ph}-B.png`));
        }
        if (!r.both) fail('phases', `${ph}: the two screens did not both enter`);
        else if (errs.length) fail('phases', `${ph}: ${errs.length} page error(s): ${errs[0].text.slice(0, 160)}`);
        else report.tests.phases.ok++;
        log('phase', ph, `${m.calls} calls ${(m.tris / 1e6).toFixed(2)}M tris ${m.fps} fps ${r.settleMs} ms`);
      } catch (e) {
        fail('phases', `${ph}: ${e.message.slice(0, 200)}`);
      }
    }
  }

  // ---- coop: the partner each screen draws is where the other player really is
  if (TESTS.includes('coop')) {
    const ph = list(arg('coop'))?.[0] || 'tr_s1';
    await go(ph);
    await sleep(1500);
    const a = await A.ev('__qa.where()');
    const b = await B.ev('__qa.where()');
    const d = (p, q) => (p && q ? Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) : null);
    const r = { phase: ph, yolineSeenByWilliam: d(a.me, b.mate), williamSeenByYoline: d(b.me, a.mate) };
    report.tests.coop = r;
    log('coop', JSON.stringify(r));
    if (!(r.yolineSeenByWilliam < 0.5 && r.williamSeenByYoline < 0.5))
      fail('coop', `partner drawn away from the real position: ${JSON.stringify(r)}`);
  }

  // ---- save: a level is saved by the host and both players resume it after a reload
  if (TESTS.includes('save')) {
    const ph = list(arg('save'))?.[0] || 'tr_c10';
    await go(ph);
    await sleep(3000);
    const saved = await A.ev(`(JSON.parse(localStorage.getItem('borderline') || '{}').progress || {}).phase`);
    const r2 = await open();
    const r = { phase: ph, saved, resumedA: r2.phaseA, resumedB: r2.phaseB };
    report.tests.save = r;
    log('save', JSON.stringify(r));
    if (saved !== ph || r2.phaseA !== ph || r2.phaseB !== ph) fail('save', JSON.stringify(r));
  }

  // ---- cycles: city -> level -> city, measuring the city each time we come back
  if (TESTS.includes('cycles')) {
    const spec = list(arg('cycles')) || ['tr_s1:3', 'tr_c10:3'];
    await open();
    await go('city');
    const city0 = { ...(await A.ev('__qa.metrics()')), gpuMB: chrome.gpuMB() };
    report.cycles.cityStart = city0;
    log('city start', `${city0.fps} fps ${city0.gpuMB} MB gpu ${city0.heapMB} MB heap ${city0.meshes} meshes`);
    for (const s of spec) {
      const [ph, k] = s.split(':');
      const rows = [];
      for (let i = 0; i < (+k || 1); i++) {
        const n = chrome.errors.length;
        const into = await go(ph);
        const inLevel = await A.ev('__qa.metrics(60)');
        const back = await go('city');
        const city = await A.ev('__qa.metrics()');
        const row = {
          into: into.ms, intoSettle: into.settleMs, back: back.ms, backSettle: back.settleMs,
          levelFps: inLevel.fps, cityFps: city.fps, gpuMB: chrome.gpuMB(), heapMB: city.heapMB,
          geometries: city.geometries, textures: city.textures, programs: city.programs,
          meshes: city.meshes, sceneChildren: city.sceneChildren, colliders: city.colliders,
          errors: errorsSince(n).length,
        };
        rows.push(row);
        log('cycle', ph, i + 1, JSON.stringify(row));
        if (!into.both || !back.both) fail('cycles', `${ph} #${i + 1}: a screen did not follow`);
        if (row.errors) fail('cycles', `${ph} #${i + 1}: ${row.errors} page error(s)`);
      }
      report.cycles[ph] = rows;
    }
  }

  // ---- play: scripted interactions, one file per phase in tools/qa/play/<phase>.mjs.
  // A script exports `default async ({ A, B, go, sleep, log }) => ({ covered: [...], ok, notes })`:
  // A is Yoline (host), B is William (guest), kits per level in `Story.role`; `covered` names each interaction it
  // drove and checked on both screens (e.g. 'dame grapple', 'valet lever 2', 'wrong answer re-roll').
  if (TESTS.includes('play')) {
    const dir = join(HERE, 'play');
    const all = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)) : [];
    const want = list(arg('play')) || all;
    for (const ph of want) {
      if (!all.includes(ph)) {
        fail('play', `${ph}: no script tools/qa/play/${ph}.mjs`);
        continue;
      }
      const n = chrome.errors.length;
      try {
        await open();
        await go(ph);
        const mod = await import(pathToFileURL(join(dir, ph + '.mjs')).href);
        const r = (await mod.default({ A, B, go, sleep, log })) || {};
        const errs = errorsSince(n);
        report.play[ph] = { covered: r.covered || [], ok: !!r.ok, notes: r.notes || '', errors: errs.length };
        log('play', ph, r.ok ? 'ok' : 'FAILED', (r.covered || []).join(', '));
        if (!r.ok) fail('play', `${ph}: ${r.notes || 'script reported a failure'}`);
        if (errs.length) fail('play', `${ph}: ${errs.length} page error(s): ${errs[0].text.slice(0, 160)}`);
      } catch (e) {
        fail('play', `${ph}: ${e.message.slice(0, 200)}`);
      }
    }
  }
} catch (e) {
  fail('suite', e.stack || String(e));
} finally {
  report.errors = chrome.errors;
  report.finished = new Date().toISOString();
  report.gpuAtEndMB = chrome.gpuMB();
  await chrome.close();
  if (srv) srv.close();
}

// ---- summary
const L = [];
L.push(`# BORDERLINE QA run ${report.started}`, '');
L.push(`Failures: ${report.failures.length} · page errors: ${report.errors.length} · GPU at boot ${report.gpuAtBootMB} MB, at end ${report.gpuAtEndMB} MB`, '');
for (const f of report.failures) L.push(`- FAIL ${f.test}: ${f.msg}`);
if (Object.keys(report.phases).length) {
  L.push('', '| phase | calls | tris | fps | p95 ms | geo | tex | programs | meshes | settle ms | GPU MB | errors |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [ph, m] of Object.entries(report.phases))
    L.push(`| ${ph} | ${m.calls} | ${(m.tris / 1e6).toFixed(2)}M | ${m.fps} | ${m.p95} | ${m.geometries} | ${m.textures} | ${m.programs} | ${m.meshes} | ${m.settleMs} | ${m.gpuMB} | ${m.errors.length} |`);
}
for (const [ph, rows] of Object.entries(report.cycles)) {
  if (ph === 'cityStart') {
    const c = rows;
    L.push('', `City at start: ${c.fps} fps, GPU ${c.gpuMB} MB, heap ${c.heapMB} MB, geo ${c.geometries}, tex ${c.textures}, programs ${c.programs}, meshes ${c.meshes}`);
    continue;
  }
  L.push('', `Cycles city -> ${ph} -> city`, '', '| # | into ms | back ms | level fps | city fps | GPU MB | heap MB | geo | tex | programs | meshes | errors |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => L.push(`| ${i + 1} | ${r.into} | ${r.back} | ${r.levelFps} | ${r.cityFps} | ${r.gpuMB} | ${r.heapMB} | ${r.geometries} | ${r.textures} | ${r.programs} | ${r.meshes} | ${r.errors} |`));
}
for (const k of ['boot', 'coop', 'save']) if (report.tests[k]) L.push('', `${k}: ${JSON.stringify(report.tests[k])}`);

// ---- coverage: what this run actually exercised
L.push('', '## Coverage', '');
L.push(`Tests run: ${TESTS.join(', ')}. Both players every time: A = Yoline (host), B = William (guest); their kits (dame / valet) follow each level.`);
const loaded = Object.entries(report.phases).filter(([, m]) => m.both !== false && !m.errors.length).map(([p]) => p);
if (Object.keys(report.phases).length) L.push(`Loaded on both screens without error: ${loaded.length}/${Object.keys(report.phases).length} phases.`);
const cyc = Object.keys(report.cycles).filter((k) => k !== 'cityStart');
if (cyc.length) L.push(`Unload/rebuild round trips from the city: ${cyc.join(', ')}.`);
if (report.tests.coop) L.push(`Partner position agreement checked in: ${report.tests.coop.phase}.`);
if (report.tests.save) L.push(`Save and resume after reload checked in: ${report.tests.save.phase}.`);
const pl = Object.entries(report.play);
L.push(`Scripted interactions (tools/qa/play): ${pl.length ? '' : 'none'}`);
for (const [ph, r] of pl) L.push(`- ${ph} ${r.ok ? 'ok' : 'FAILED'}: ${r.covered.join(', ') || '(nothing reported)'}${r.notes ? ' — ' + r.notes : ''}`);
if (Object.keys(report.phases).length) {
  const none = Object.keys(report.phases).filter((p) => !report.play[p]);
  L.push(`Phases loaded but with no scripted interaction (load, render and errors only): ${none.length} — ${none.join(', ')}`);
}
{
  const dir = join(HERE, 'play');
  const have = new Set(existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)) : []);
  const all = report.allPhases || [];
  const missing = all.filter((p) => !have.has(p));
  if (all.length) L.push(`Play scripts in tools/qa/play: ${all.length - missing.length}/${all.length} phases; without one: ${missing.length ? missing.join(', ') : 'none'}.`);
}

// ---- comparison with an earlier report
const cmp = arg('compare', null);
if (cmp && existsSync(cmp)) {
  const old = JSON.parse(readFileSync(cmp, 'utf8'));
  L.push('', `## Compared with ${cmp}`, '', '| phase | calls | tris | fps | geo | tex | settle ms |', '|---|---|---|---|---|---|---|');
  const dd = (a, b) => (a == null || b == null ? '?' : `${b} → ${a}`);
  for (const [ph, m] of Object.entries(report.phases)) {
    const o = old.phases && old.phases[ph];
    if (o) L.push(`| ${ph} | ${dd(m.calls, o.calls)} | ${dd((m.tris / 1e6).toFixed(2), (o.tris / 1e6).toFixed(2))} | ${dd(m.fps, o.fps)} | ${dd(m.geometries, o.geometries)} | ${dd(m.textures, o.textures)} | ${dd(m.settleMs, o.settleMs)} |`);
  }
  for (const ph of Object.keys(report.cycles)) {
    const n = report.cycles[ph], o = old.cycles && old.cycles[ph];
    if (!o || ph === 'cityStart') continue;
    const ln = n[n.length - 1], lo = o[o.length - 1];
    L.push('', `Last ${ph} cycle: GPU ${dd(ln.gpuMB, lo.gpuMB)} MB, heap ${dd(ln.heapMB, lo.heapMB)} MB, city fps ${dd(ln.cityFps, lo.cityFps)}, geo ${dd(ln.geometries, lo.geometries)}, tex ${dd(ln.textures, lo.textures)}, programs ${dd(ln.programs, lo.programs)}, meshes ${dd(ln.meshes, lo.meshes)}`);
  }
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
writeFileSync(join(OUT, 'summary.md'), L.join('\n') + '\n');
console.log('\n' + L.join('\n'));
console.log('\nreport:', OUT);
process.exit(report.failures.length || report.errors.some((e) => e.kind === 'exception') ? 1 : 0);
