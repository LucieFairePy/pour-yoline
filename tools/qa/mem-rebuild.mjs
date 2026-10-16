// Rebuild check for unloadable worlds (js/world/LIFECYCLE.md): for each phase, the first build and
// the build after a trip to the city must look and count the same. Per phase, on both pages:
// scene counts (meshes, lights, GPU geometries/textures, colliders), the world's own unload record
// (Life.log), and a screenshot of the spawn view compared pixel by pixel with the first one.
// With --reload, the pages are reloaded in the level after the rebuild (save/resume).
//
//   node tools/qa/mem-rebuild.mjs --phases tr_d4,tr_c2 [--reload tr_d4] [--port 8850 --cdp 9420]
// Writes tools/qa/out/rebuild-<time>/report.json and the screenshots (first / again, A and B).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { serve } from './serve.mjs';
import { launch } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  if (i < 0) return d;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
};
const list = (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHASES = list(arg('phases'));
const RELOAD = list(arg('reload'));
// --fp '<expression>': a world fingerprint read at each step (e.g. a hash of the maze walls)
const FPX = typeof arg('fp') === 'string' ? arg('fp') : null;
const PORT = +arg('port', 8850);
const CDP = +arg('cdp', 9420);
const OUT = resolve(arg('out', join(HERE, 'out', 'rebuild-' + new Date().toISOString().replace(/[:.]/g, '-'))));
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// minimal PNG decoder (8-bit RGB/RGBA, non-interlaced: what Chrome's screenshots are)
const png = (buf) => {
  let p = 8, w, h, ct, idat = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') (w = d.readUInt32BE(0)), (h = d.readUInt32BE(4)), (ct = d[9]);
    else if (t === 'IDAT') idat.push(d);
    p += 12 + n;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], row = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)), o = y * st;
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0, b = y ? out[o - st + x] : 0, c = x >= bpp && y ? out[o - st + x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[o + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
};
// share of pixels whose colour moved by more than 40 (of 255) on a channel, and the mean luminance
const diff = (a, b) => {
  const A = png(a), B = png(b);
  let n = 0, la = 0, lb = 0;
  const N = A.w * A.h;
  for (let i = 0; i < N; i++) {
    const j = i * A.bpp, k = i * B.bpp;
    if (Math.abs(A.px[j] - B.px[k]) > 40 || Math.abs(A.px[j + 1] - B.px[k + 1]) > 40 || Math.abs(A.px[j + 2] - B.px[k + 2]) > 40) n++;
    la += A.px[j] + A.px[j + 1] + A.px[j + 2];
    lb += B.px[k] + B.px[k + 1] + B.px[k + 2];
  }
  return { changed: +(n / N).toFixed(3), lumA: Math.round(la / N / 3), lumB: Math.round(lb / N / 3) };
};

const PROBE = readFileSync(join(HERE, 'probe.js'), 'utf8');
const srv = await serve(PORT);
const base = `http://127.0.0.1:${PORT}/borderline/`;
const chrome = await launch({ out: OUT, port: CDP });
const room = 'rb' + Math.random().toString(36).slice(2, 8);
const A = await chrome.page('A', null);
const B = await chrome.page('B', null);
const P = [A, B];
const open = async () => {
  await A.go(`${base}index.html?local=${room}&role=yoline&host=1&auto=1&nointro=1`);
  await sleep(500);
  await B.go(`${base}index.html?local=${room}&role=william&auto=1&nointro=1`);
  for (const p of P) {
    await p.until("typeof Story !== 'undefined' && typeof R !== 'undefined' && !!R.renderer", 60000);
    await p.ev(PROBE + ';1');
    await p.until('!!__qa.phase()', 60000);
  }
};
const go = async (ph) => {
  await A.ev(`Story.goto(${JSON.stringify(ph)});1`);
  for (const p of P) await p.until(`__qa.phase() === ${JSON.stringify(ph)}`, 20000);
  await A.ev('__qa.settle()');
  await sleep(1500);
};
const stats = (p) =>
  p.ev(`(() => {
    let meshes = 0, lights = 0, visible = 0;
    R.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { meshes++; if (o.visible) visible++; } if (o.isLight) lights++; });
    const m = R.renderer.info.memory;
    // what each top-level child of the scene holds, to tell which one changed between two builds
    const kids = {};
    R.scene.children.forEach((c, i) => { let k = 0; c.traverse((o) => (o.isMesh || o.isPoints || o.isLine || o.isSprite) && k++); const key = (c.name || c.type) + '#' + i; kids[key] = k; });
    let fp = null;
    try { fp = ${FPX ? JSON.stringify(FPX) : 'null'} && eval(${FPX ? JSON.stringify(FPX) : 'null'}); } catch (e) { fp = 'ERR ' + e.message; }
    return { fp, kids, meshes, visible, lights, geo: m.geometries, tex: m.textures, colliders: Phys.count(), last: Life.log.length ? Life.log[Life.log.length - 1] : null };
  })()`);
const shot = async (p, f) => {
  const r = await p.send('Page.captureScreenshot', { format: 'png' });
  const b = Buffer.from(r.data, 'base64');
  writeFileSync(join(OUT, f), b);
  return b;
};

const report = { phases: {}, errors: chrome.errors };
let fails = 0;
try {
  await open();
  // the city makes some of its own things on its first visit: warm it up before counting
  await go('city');
  for (const ph of PHASES) {
    const n0 = chrome.errors.length;
    const r = (report.phases[ph] = {});
    try {
      await go(ph);
      r.first = await Promise.all(P.map(stats));
      const s1 = await Promise.all(P.map((p) => shot(p, `${ph}-first-${p.tag}.png`)));
      await go('city');
      r.city = await Promise.all(P.map(stats));
      r.unloaded = r.city.map((c) => c.last);
      await go(ph);
      r.again = await Promise.all(P.map(stats));
      const s2 = await Promise.all(P.map((p) => shot(p, `${ph}-again-${p.tag}.png`)));
      r.pixels = s1.map((b, i) => diff(b, s2[i]));
      const same = (k) => r.first.every((f, i) => f[k] === r.again[i][k]);
      r.kidsDiff = r.first.map((f, i) => Object.keys({ ...f.kids, ...r.again[i].kids }).filter((k) => f.kids[k] !== r.again[i].kids[k]).map((k) => `${k}: ${f.kids[k]} -> ${r.again[i].kids[k]}`));
      r.same = { meshes: same('meshes'), lights: same('lights'), colliders: same('colliders'), geo: same('geo'), tex: same('tex') };
      if (RELOAD.includes(ph)) {
        await sleep(3500); // the host saves the level within its sync tick
        await open();
        r.reload = { phase: await Promise.all(P.map((p) => p.ev('__qa.phase()'))), stats: await Promise.all(P.map(stats)) };
        await A.ev('__qa.settle()');
        await Promise.all(P.map((p) => shot(p, `${ph}-reload-${p.tag}.png`)));
      }
    } catch (e) {
      r.failure = e.message;
    }
    r.errors = chrome.errors.slice(n0);
    const bad = r.failure || r.errors.length || !r.unloaded || r.unloaded.some((u) => !u || !u.world) || !r.same.meshes || !r.same.colliders || !r.same.lights;
    if (bad) fails++;
    log(bad ? 'CHECK' : 'ok   ', ph.padEnd(8), JSON.stringify({ unloaded: r.unloaded && r.unloaded.map((u) => u && `${u.world} g${u.geometries} m${u.materials} t${u.textures} c${u.colliders} ${u.ms}ms`), same: r.same, first: r.first && r.first.map((s) => `${s.meshes}/${s.lights}/${s.colliders}`), again: r.again && r.again.map((s) => `${s.meshes}/${s.lights}/${s.colliders}`), pixels: r.pixels, kidsDiff: r.kidsDiff, reload: r.reload && r.reload.phase, fp: [r.first, r.again, r.reload && r.reload.stats].map((x) => x && x.map((s) => s.fp)), errors: r.errors.length, failure: r.failure }));
  }
} finally {
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await chrome.close();
  srv.close();
  log('fails', fails, '·', OUT);
}
process.exit(fails ? 1 : 0);
