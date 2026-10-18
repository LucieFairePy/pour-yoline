// The grapple (js/game/player.js: Player.targets, findTarget, mode 'grapple', grappleLand; the
// rope js/game/rope.js, drawn for the partner from the snapshot in js/game/remote.js), checked on
// tr_h6's sunflower ring (stage 4, the sunflower grown: setup set by the host), with real input
// (Input.sim through tools/qa/campaign/lib.js: the camera aimed like a mouse, F, Space):
// - the valet kit never locks the ring; the dame does not lock it looking away, nor from 29 m;
// - aiming at it she locks it; F: mode 'grapple' on her page, the partner's screen draws her in
//   'grapple' with the rope's hook on the ring; Space during the flight lets go (back to 'walk'
//   at once, the rope released on both screens);
// - a full flight lands her on the level's landing spot (grappleLand) past the gap, seen there on
//   the partner's screen, the rope gone on both.
//   node tools/qa/check-grapple.mjs [--port 8864 --cdp 9434]
import { run } from './fix-kit.mjs';
import { hands, kits, until, json } from './play-kit.mjs';

run('grapple', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_h6'))) return { ok: false, notes: 'tr_h6 did not load' };
  await A.until('H6.built', 20000);
  await B.until('H6.built', 20000);
  await sleep(2000);
  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const steps = [];
  const bad = (t) => ({ ok: false, notes: t, steps });
  await A.ev("Story.ctx.set((s) => { s.x.stage = 4; s.x.grown = { ...(s.x.grown || {}), sun: 1 }; }); 1");
  if (!(await until(dame, 'Story.S.x.stage === 4 && H6.ringsFor(4).length === 1', 5000)) || !(await until(valet, 'H6.ringsFor(4).length === 1', 5000)))
    return bad('stage 4 / the sunflower ring not up on both pages');
  const at = (p, x, z, yaw = 0) => p.ev(`Story.ctx.spawn(H6.P(${x}, 6.05, ${z}), ${yaw}); 1`);
  await at(dame, -4, 93);
  await at(valet, 8.5, 93);
  steps.push('setup: stage 4 with the sunflower grown, both put on the terrace T1');
  await sleep(1200);
  // aim like a mouse at the ring (from the feet + 1.2 m, as findTarget measures), n frames
  const aim = (p, away = false) =>
    p.ev(`(async () => { const r = H6.P(...H6.RINGS.sun.pos);
      for (let i = 0; i < 12; i++) { const q = Player.body.p, dx = r.x - q.x, dy = r.y - 1.2 - q.y, dz = r.z - q.z;
        Cam.yaw = Math.atan2(dx, dz) + (${away} ? Math.PI : 0); Cam.pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.95, 1.2); await CB.sl(40); }
      return Player.lockTarget; })()`);
  // the rope's hook drawn on this screen at the ring
  const HOOK = `R.scene.children.some((o) => o.isMesh && o.visible && o.geometry && o.geometry.type === 'OctahedronGeometry' && o.position.distanceTo(H6.P(...H6.RINGS.sun.pos)) < 1.2)`;

  // ---- refusals ----
  const lv = await aim(valet);
  await valet.ev("CB.tap('ability')");
  await sleep(400);
  if (lv !== -1 || (await valet.ev('Player.mode')) === 'grapple') return bad(`the valet kit locked / grappled: ${lv}`);
  steps.push('valet kit: aimed at the ring, no lock, F does nothing');
  const la = await aim(dame, true);
  await dame.ev("CB.tap('ability')");
  await sleep(400);
  if (la !== -1 || (await dame.ev('Player.mode')) === 'grapple') return bad(`locked looking away: ${la}`);
  steps.push('dame looking away from the ring: no lock, F does nothing');
  await at(dame, -4, 75);
  await sleep(600);
  const far = await dame.ev('H6.P(...H6.RINGS.sun.pos).distanceTo(Player.body.p)');
  const lf = await aim(dame);
  if (lf !== -1) return bad(`locked from ${far.toFixed(1)} m`);
  steps.push(`dame ${far.toFixed(1)} m away aiming at it: no lock (range 26 m)`);

  // ---- a flight let go with Space ----
  await at(dame, -4, 93);
  await sleep(600);
  if ((await aim(dame)) !== 0) return bad('no lock aiming at the ring from the terrace');
  await valet.ev(`window.__g = { mode: 0, hook: 0 }; window.__gT = setInterval(() => { if (Remote.state.mode === 'grapple') __g.mode = 1; if (${HOOK}) __g.hook = 1; }, 20); 1`);
  await dame.ev("CB.tap('ability')");
  if (!(await until(dame, "Player.mode === 'grapple'", 1500, 20))) return bad('F with the ring locked: no grapple');
  await sleep(250);
  const mine = await dame.ev(HOOK + ' || Player.rope && Player.rope.state');
  await dame.ev("CB.tap('jump', 60)");
  const let1 = await dame.ev("Player.mode === 'walk' ? +Player.body.v.y.toFixed(1) : Player.mode");
  await sleep(1200);
  const g1 = await valet.ev('clearInterval(__gT), JSON.stringify(__g)').then(JSON.parse);
  const released = await valet.ev(`Remote.state.mode !== 'grapple'`);
  if (typeof let1 !== 'number') return bad(`Space during the flight: mode ${let1}`);
  if (!g1.mode || !g1.hook || !released) return bad(`the partner's screen: grapple ${g1.mode}, hook at the ring ${g1.hook}, released ${released}`);
  steps.push(`dame locks it and presses F: in flight (own rope ${mine}), the partner's screen draws her grappling with the hook on the ring; Space lets go at once (walk, v.y ${let1}), released on the partner's screen`);

  // ---- a full flight: the landing spot ----
  await until(dame, 'Player.body.grounded', 6000, 50);
  await sleep(800);
  await at(dame, -4, 93);
  steps.push('setup: the dame put back on the terrace');
  await sleep(800);
  if ((await aim(dame)) !== 0) return bad('no lock for the second flight');
  await dame.ev("CB.tap('ability')");
  if (!(await until(dame, "Player.mode === 'grapple'", 1500, 20))) return bad('second F: no grapple');
  await until(dame, "Player.mode !== 'grapple'", 5000, 30);
  await until(dame, 'Player.body.grounded', 4000, 30);
  await sleep(800);
  const q = await json(dame, 'H6.rel(Player.body.p).toArray().map((v) => +v.toFixed(2))');
  const land = await json(dame, 'H6.RINGS.sun.land');
  const off = Math.hypot(q[0] - land[0], q[2] - land[2]);
  const seen = await valet.ev(`H6.rel(Remote.pos).distanceTo(V3(${q.join(',')}))`);
  const hooks = [await dame.ev(HOOK), await valet.ev(HOOK)];
  log(JSON.stringify({ q, land, off, seen, hooks }));
  // on the far terrace (z > 111.8, y > 5.5: where the level counts her across)
  if (!(q[2] > 111.8 && q[1] > 5.5) || off > 3) return bad(`landed at ${JSON.stringify(q)}, ${off.toFixed(2)} m from the spot ${JSON.stringify(land)}`);
  if (seen > 0.6 || hooks.some(Boolean)) return bad(`partner's screen: ${seen.toFixed(2)} m off, hooks still drawn ${JSON.stringify(hooks)}`);
  steps.push(`a full flight lands her at ${JSON.stringify(q)}, ${off.toFixed(2)} m from the ring's landing spot, on the far terrace past the gap, seen there on the partner's screen, the rope gone on both`);
  return { ok: true, steps };
});
