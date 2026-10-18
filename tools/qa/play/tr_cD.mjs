// tr_cD « La Dame de Trèfle » (the carriage over the pit; ride 0: the valet rides, the dame
// drives): the table's world waits through the city, is unloaded at another épreuve and rebuilt
// identical. Then, with real input (Input.sim, tools/qa/campaign/lib.js):
// - the valet walks onto the docked carriage at the quay: aboard, seen aboard on both screens;
// - a steer sent from the rider's page (as the level would) is refused: the carriage stays;
// - the dame walks to the console and takes the cranks (E): she is held at the console; she
//   pushes the stick: the carriage moves along the pit on both screens, the rider still aboard;
// - the dame lets go of the cranks (E): free again.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_c', 'CourC')}, ${meshes('CourC.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_cD', { world: 'cour_c', fp: FP, built: 'CourC.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const car = () => both(A, B, 'JSON.stringify([+CourC.ST.car.z.toFixed(2), +CourC.ST.car.y.toFixed(2)])');
  try {
    if ((await A.ev('CourC.dbgD.riderOf(Story.S.x)')) !== 'valet') return fail('ride 0 is not the valet riding');
    // ---- the valet boards at the quay ----
    const board = await valet.ev(`(async () => { const q = CourC.rel(Player.body.p);
      if (q.x < -8.5 && q.z > 56) await CB.trek(CourC.P(-11.5, 0, 54), 0.5, 20000);
      await CB.trek(CourC.P(0, 0, 54.2), 0.4, 20000);
      await CB.until(() => Math.abs(CourC.ST.car.z - CourC.CAR.z0) < 0.08 && Math.abs(CourC.ST.car.y) < 0.08, 10000);
      await CB.walk(CourC.P(0, 0, CourC.CAR.z0), 0.3, 6000); await CB.sl(400);
      return CourC.onCar(Player.body.p); })()`);
    if (!board || !(await until(dame, 'CourC.onCar(Remote.pos)', 4000))) return fail(`the valet is not aboard on both screens (${board})`);
    covered.push(`${who(valet)} as valet walks onto the docked carriage: aboard on both screens`);
    const c0 = await car();
    await valet.ev("Story.ctx.act({ a: 'steer', z: 1, y: 0 }); 1");
    await sleep(1200);
    await valet.ev("Story.ctx.act({ a: 'steer', z: 0, y: 0 }); 1");
    if (JSON.stringify(await car()) !== JSON.stringify(c0)) return fail(`the rider steered the carriage: ${JSON.stringify([c0, await car()])}`);
    covered.push("a steer from the rider's page (the level's action) refused: the carriage stays on both screens");

    // ---- the dame at the console ----
    const taken = await dame.ev(`(async () => { const q = CourC.rel(Player.body.p);
      if (q.x > -8.5) await CB.trek(CourC.P(-11.5, 0, 54), 0.5, 20000);
      await CB.trek(CourC.P(CourC.CONSOLE.op[0], 0, CourC.CONSOLE.op[1]), 0.4, 20000);
      for (let i = 0; i < 4 && !CourC.dbgD.local.driving; i++) { CB.face([CourC.CONSOLE.x, 1, CourC.CONSOLE.z]); await CB.tap('interact'); await CB.sl(300); }
      return CourC.dbgD.local.driving && Player.mode === 'frozen'; })()`);
    if (!taken) return fail(`${who(dame)} could not take the cranks at the console`);
    covered.push(`${who(dame)} as dame takes the cranks at the console (E): held there`);
    // a free run along the pit at the dock height (no beam in the way)
    const dz = await A.ev(`(() => { const z0 = CourC.ST.car.z, y = CourC.ST.car.y; let k = 0;
      for (let d = 0.2; d <= 3; d += 0.2) { if (z0 + d > CourC.CAR.z1 || CourC.carHits(z0 + d, y)) break; k = d; } return k; })()`);
    if (dz < 1) return fail(`no free run ahead of the carriage (${dz} m)`);
    const drove = await dame.ev(`(async () => { const L = CourC.dbgD.local, z = CourC.ST.car.z + ${dz} - 0.4;
      for (let k = 0; k < 400 && L.driving && CourC.ST.car.z < z; k++) { Input.sim.x = -1; Input.sim.z = 0; await CB.sl(25); }
      Input.sim.x = 0; return +CourC.ST.car.z.toFixed(2); })()`);
    await sleep(1000);
    const c1 = await car();
    const z0 = JSON.parse(c0[0])[0], z1 = JSON.parse(c1[0])[0], zb = JSON.parse(c1[1])[0];
    if (!(z1 - z0 > 0.5) || Math.abs(z1 - zb) > 0.15) return fail(`the carriage did not move on both screens: ${JSON.stringify([c0, c1, drove])}`);
    if (!(await valet.ev('CourC.onCar(Player.body.p)')) || !(await dame.ev('CourC.onCar(Remote.pos)'))) return fail('the rider fell off the moving carriage');
    covered.push(`the dame steers (stick): the carriage moves ${(z1 - z0).toFixed(1)} m along the pit on both screens, the rider still aboard`);
    await dame.ev("CB.tap('interact')");
    if (!(await until(dame, "!CourC.dbgD.local.driving && Player.mode === 'walk'", 2000))) return fail('E did not let go of the cranks');
    covered.push('E again: she lets go of the cranks');
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
