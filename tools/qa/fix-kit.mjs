// Shared harness of the tools/qa/fix-*.mjs checks: one Chrome, two players in local co-op
// (A = Yoline, host; B = William, guest), a check function, a verdict. Each fix-*.mjs reproduces a
// bug that was fixed: it fails on the code before the fix and passes after it.
//
//   node tools/qa/fix-<name>.mjs [--port 8864] [--cdp 9434] [--root <checkout>] [--url <base>]
//
// --root serves another checkout (e.g. an export of the commit before the fix) to show the bug.
// Exit code 1 when the check fails or a page threw.
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';
import { launch } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i < 0 || !process.argv[i + 1] ? d : process.argv[i + 1];
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const run = async (name, check) => {
  const port = +arg('port', 8864);
  const out = join(HERE, 'out', 'fix-' + name + '-' + Date.now());
  mkdirSync(out, { recursive: true });
  let srv = null;
  let base = arg('url', null);
  if (!base) {
    const root = arg('root', null);
    srv = await serve(port, root ? resolve(root) : undefined);
    base = `http://127.0.0.1:${port}/borderline/`;
  }
  const chrome = await launch({ out, port: +arg('cdp', 9434) });
  const room = 'fx' + Math.random().toString(36).slice(2, 8);
  const urlA = `${base}index.html?local=${room}&role=yoline&host=1&auto=1&nointro=1`;
  const urlB = `${base}index.html?local=${room}&role=william&auto=1&nointro=1`;
  const A = await chrome.page('A', null);
  const B = await chrome.page('B', null);
  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
  const ph = 'Story.S && Story.S.phase';
  // (re)open both players (a reload: the host resumes its save) and wait until they agree
  const open = async () => {
    await A.go(urlA);
    await sleep(500);
    await B.go(urlB);
    await A.until(ph, 60000);
    await B.until(ph, 60000);
    for (let i = 0; i < 100; i++) {
      const [a, b] = [await A.ev(ph).catch(() => null), await B.ev(ph).catch(() => null)];
      if (a && a === b) return a;
      await sleep(200);
    }
    return null;
  };
  // reload one page only (the other keeps running)
  const reload = async (p) => {
    await p.go(p === A ? urlA : urlB);
    await p.until(ph, 60000);
  };
  // the host jumps to a phase; both screens must follow
  const go = async (phase, ms = 25000) => {
    await A.ev(`Story.goto(${JSON.stringify(phase)});1`);
    const q = `Story.S && Story.S.phase === ${JSON.stringify(phase)}`;
    return (await A.until(q, ms)) && (await B.until(q, ms));
  };
  let r;
  try {
    log(name, 'serving', base);
    if (!(await open())) throw new Error('the two players did not start');
    r = await check({ A, B, open, reload, go, sleep, log, chrome, base, urlA, urlB });
  } catch (e) {
    r = { ok: false, notes: e.stack || String(e) };
  } finally {
    await chrome.close();
    if (srv) srv.close();
  }
  const errs = chrome.errors.filter((e) => e.kind === 'exception');
  console.log(JSON.stringify({ check: name, ok: !!r.ok, ...r, pageErrors: chrome.errors }, null, 1));
  console.log(r.ok && !errs.length ? 'PASS' : 'FAIL', name);
  process.exit(r.ok && !errs.length ? 0 : 1);
};
