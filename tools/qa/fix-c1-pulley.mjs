// tr_c1 (Le Câble), the pulley, played the way the level asks: the dame jumps into the well holding
// E (ballast) and hoists the valet to the wheel; she lets go of everything at the bottom and stands
// still; the valet walks onto the terrace, anchors (E) and reels in (Maj). She must be hoisted.
// Before: a grounded player who does not touch the stick kept her « feet planted » (cable share 0)
// unless the partner's anchor was registered, and the partner, still held against the wheel by the
// cable, often never got grounded enough to anchor: she stayed at the bottom until she moved or
// jumped, with nothing telling her so. And where the hoist stops by the wheel varies: a valet left
// hanging against the wall under the edge (seen 1.7 m under it) could not climb out either.
// Every move goes through Input.sim (the keyboard's path), with tools/qa/campaign/lib.js.
//   node tools/qa/fix-c1-pulley.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './fix-kit.mjs';

const LIB = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'campaign', 'lib.js'), 'utf8');

run('c1-pulley', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_c1'))) return { ok: false, notes: 'tr_c1 did not load' };
  await sleep(2500);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  for (const p of [A, B]) await p.ev(LIB + ';1');
  // stage 4, both on the pulley platform (the level's own spawn for that stage)
  await A.ev('Story.ctx.set((s) => { s.x.stage = 4; }); 1');
  const s4 = 'Story.S.x.stage === 4 && TrC1.built';
  if (!((await A.until(s4, 10000)) && (await B.until(s4, 10000)))) return { ok: false, notes: 'stage 4 not reached' };
  for (const p of [A, B]) await p.ev('(() => { Player.teleport(TrC1.spawn(4, Story.role), Player.yaw); return 1; })()');
  await sleep(1500);
  const rel = (p) => p.ev('JSON.stringify(TrC1.rel(Player.body.p).toArray().map((v) => +v.toFixed(2)))').then(JSON.parse);
  const TOP = await A.ev('TrC1.TOP');

  // the valet waits by the well's edge, the dame walks there and jumps in holding E
  await Promise.all([
    valet.ev('B.walk(TrC1.P(0.5, 2.95, 102), 0.5).then(() => 1)'),
    dame.ev('B.walk(TrC1.P(0, 2.95, 103), 0.5).then(() => 1)'),
  ]);
  await sleep(800);
  await dame.ev(`(async () => {
    const t = performance.now();
    while (performance.now() - t < 3000 && Player.body.grounded) {
      Cam.yaw = 0; B.steer(TrC1.P(0, 0, 110)); await B.sl(16);
    }
    B.stop(); Input.sim.held.add('interact'); return 1;
  })()`);
  // hoisted by her weight
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    await sleep(500);
    up = (await rel(valet))[1] > TOP - 0.6;
  }
  // she lets go of everything: from now on she stands still
  await dame.ev("Input.sim.held.clear(); B.stop(); 1");
  if (!up) return { ok: false, notes: 'the ballast did not hoist the valet', valet: await rel(valet) };
  await sleep(1500);
  const bottom = await rel(dame);
  // where a hoist stops by the wheel varies (frame rate, a landing on the very edge that frees the
  // cable): the worst case seen, hanging against the wall 1.7 m under the edge, is set up here
  // (a labelled shortcut). Touching nothing, he must end up standing on the terrace
  await valet.ev('Player.body.p.copy(TrC1.P(0, TrC1.TOP - 1.75, 115.6)); Player.body.v.set(0, 0, 0); 1');
  let hungOut = false;
  for (let i = 0; i < 16 && !hungOut; i++) {
    await sleep(250);
    hungOut = await valet.ev('Player.body.grounded && Math.abs(TrC1.rel(Player.body.p).y - TrC1.TOP) < 0.3 && TrC1.rel(Player.body.p).z > 116');
  }
  const afterHang = await rel(valet);
  // the valet walks onto the terrace, anchors (E) and reels in (Maj)
  await valet.ev('B.walk(TrC1.P(0.5, TrC1.TOP, 117.8), 0.4, 5000).then(() => 1)');
  await sleep(1200);
  const anchorAt = await rel(valet);
  const anchorGrounded = await valet.ev('Player.body.grounded');
  await valet.ev("Input.sim.held.add('interact'); 1");
  await sleep(300);
  await valet.ev("Input.sim.held.add('sprint'); 1");
  let yMax = bottom[1];
  let valetMinY = anchorAt[1];
  const dbg = [];
  let still = true;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const d = await rel(dame);
    const v = await rel(valet);
    yMax = Math.max(yMax, d[1]);
    valetMinY = Math.min(valetMinY, v[1]);
    still = still && (await dame.ev('Input.sim.x === 0 && Input.sim.z === 0 && Input.sim.held.size === 0'));
    if (i % 4 === 0) dbg.push({ dame: d, valet: v, dameCable: await dame.ev('JSON.stringify(TrC1.dbg || null)') });
    if (d[1] > TOP - 3) break;
  }
  await valet.ev("Input.sim.held.clear(); 1");
  const r = { hungOut, afterHang, dameAtBottom: bottom, valetAnchoredAt: anchorAt, anchorGrounded, valetMinY, dameStill: still, dameMaxY: yMax, rose: +(yMax - bottom[1]).toFixed(2), dbg };
  log(JSON.stringify(r));
  // the valet anchored standing on the terrace and stayed there; the dame, who never touched
  // anything, was reeled up the 39 m well to the wheel
  const onTerrace = anchorGrounded && Math.abs(anchorAt[1] - TOP) < 0.3 && valetMinY > TOP - 0.6;
  return { ok: hungOut && still && bottom[1] < -20 && onTerrace && yMax > TOP - 3, ...r };
});
