// Shared helpers of the tools/qa/play/<phase>.mjs scripts (kept out of play/: every .mjs there is
// a phase). A = Yoline (host), B = William (guest), pages from chrome.mjs.
//
// - hands(A, B): injects tools/qa/campaign/lib.js in the pages, a player's hands through the
//   game's own input path (Input.sim read by Input.poll like the keyboard): in a page, CB.walk,
//   CB.go (path finder), CB.tap('interact'), CB.hold, CB.face, CB.aim… (the page's global B is
//   also the lib: write CB in page expressions to keep it apart from the guest page B here).
// - kits(A, B): { dame, valet } pages for the level entered (Story.role).
// - rebuild(ctx, phase, { world, fp, built }): the level's world unloaded in the city (Life.log)
//   and built again on re-entry with the same fingerprint on both pages.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LIB = readFileSync(join(HERE, 'campaign', 'lib.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CB.trek: CB.walk with a hop when the body stops moving (a step lip, a stair start), as a
// player does; stops early once stop() is true (e.g. the level moved the player)
const TREK = `CB.trek = async (p, near = 0.45, ms = 15000, stop = null) => {
  const t = performance.now(); let last = Player.body.p.clone(), stuck = 0;
  while (performance.now() - t < ms) {
    const b = Player.body.p;
    if (Math.hypot(p.x - b.x, p.z - b.z) < near || (stop && stop())) { CB.stop(); return true; }
    Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
    CB.steer(p);
    await CB.sl(50);
    if (Player.body.p.distanceTo(last) < 0.02) stuck++; else stuck = 0;
    last.copy(Player.body.p);
    if (stuck > 6) { await CB.tap('jump', 80); stuck = 0; }
  }
  CB.stop(); return false;
}; 1`;
export const hands = async (...pages) => {
  for (const p of pages) if (!(await p.ev("typeof CB !== 'undefined' && !!CB.trek"))) await p.ev(LIB + ';' + TREK);
};
export const who = (A) => (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
export const kits = async (A, B) => {
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  return { dame, valet: dame === A ? B : A };
};
export const until = async (p, expr, ms = 10000, step = 200) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.ev(expr).catch(() => false)) return true;
    await sleep(step);
  }
  return false;
};
export const untilBoth = async (A, B, expr, ms = 10000) => (await until(A, expr, ms)) && (await until(B, expr, ms));
export const both = async (A, B, expr) => [await A.ev(expr), await B.ev(expr)];
export const json = async (p, expr) => JSON.parse(await p.ev(`JSON.stringify(${expr})`));
// a real key press through the DevTools protocol (memory cards and letters close with Enter)
export const key = async (p, code) => {
  const k = { KeyE: ['e', 69], Enter: ['Enter', 13], Space: [' ', 32], Escape: ['Escape', 27] }[code] || [code, 0];
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k[0], windowsVirtualKeyCode: k[1] });
  await sleep(90);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k[0], windowsVirtualKeyCode: k[1] });
};
// release every simulated key on both pages (a script never leaves a stick pushed)
export const release = async (...pages) => {
  for (const p of pages) await p.ev('Input.sim.x = 0; Input.sim.z = 0; Input.sim.held.clear(); 1').catch(() => {});
};

// unloaded in the city, rebuilt on re-entry, same fingerprint on both pages. `built` is the
// world's built flag expression; `fp` an expression returning a string.
// go() is the suite's ({ both }) or fix-kit's (boolean)
const bad = (g) => g === false || (g && g.both === false);
export const rebuild = async ({ A, B, go, sleep }, phase, { world, fp, built }) => {
  const w = who(A);
  const fp0 = await both(A, B, fp);
  const n0 = await both(A, B, 'Life.log.length');
  const g1 = await go('city');
  if (bad(g1)) return { ok: false, notes: 'the city did not load on both screens' };
  const g2 = await go(phase);
  if (bad(g2)) return { ok: false, notes: `${phase} did not load again on both screens` };
  if (!(await untilBoth(A, B, built, 15000))) return { ok: false, notes: `${phase}: world not built again on entry` };
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev(`Life.log.slice(${n0[i]}).some((r) => r.world === ${JSON.stringify(world)})`);
    if (!un) return { ok: false, notes: `${w(p)}: world ${world} not unloaded in the city (Life.log)` };
  }
  const fp1 = await both(A, B, fp);
  if (fp1[0] !== fp0[0] || fp1[1] !== fp0[1]) return { ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  return { ok: true, text: `unloaded in the city and rebuilt, same fingerprint on both pages ${fp1[0].slice(0, 80)}` };
};

// how many colliders a world owns (Phys.owner at build), for fingerprints: Phys.count() also
// counts the city's, which grows when a new door is put up. Searched within r m of the world's
// origin (W.P(0, 0, 0), W the world's global name).
export const owned = (name, W, r = 1200) =>
  `(() => { const o = ${W}.P(0, 0, 0), s = new Set(); Phys.query(o.x - ${r}, o.z - ${r}, o.x + ${r}, o.z + ${r}).forEach((b) => b.owner === ${JSON.stringify(name)} && s.add(b)); return s.size; })()`;
// [meshes, instances] of the scene-level group holding an object of the world (e.g. its screen
// mesh), for worlds that do not expose their root group
export const meshes = (obj) =>
  `(() => { let r = ${obj}; while (r && r.parent && r.parent !== R.scene) r = r.parent; let m = 0, n = 0; if (r) r.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++; if (o.isInstancedMesh) n += o.count; }); return [m, n]; })()`;
// the first Object3D held by a world's record (e.g. a book, a slot), for meshes()
export const obj3d = (rec) => `(() => { const r = ${rec}; return r && (r.isObject3D ? r : Object.values(r).find((v) => v && v.isObject3D)); })()`;
