// tr_cK « Le Roi de Trèfle » (the balance disc): the table's world waits through the city, is
// unloaded at another épreuve and rebuilt identical. Then, with real input (Input.sim,
// tools/qa/campaign/lib.js; each one's clover is read from the level's pairPos, the place the
// partner's screen shows and calls out):
// - the dame walks round the ring and over the west bridge onto the disc: alone on it, the
//   pairs do not start; the valet comes over the east bridge: stage 1 on both screens;
// - both walk to their clovers at matched speeds (the disc stays level): the pair is made, the
//   next one comes on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_c', 'CourC')}, ${meshes('CourC.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_cK', { world: 'cour_c', fp: FP, built: 'CourC.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  // round the ring floor (radius 13.6) from the entrance to my bridge, then onto the disc
  const onto = (p) =>
    p.ev(`(async () => { const C = CourC.C, s = Story.role === 'dame' ? -1 : 1, R = (x, z) => CourC.P(C.x + x, 0, C.z + z);
      const q0 = CourC.rel(Player.body.p), a0 = Math.atan2(q0.x - C.x, q0.z - C.z), a1 = (s * Math.PI) / 2;
      const a00 = Math.abs(a0) > 2.6 ? s * Math.PI : a0;
      for (let k = 1; k <= 5; k++) { const a = a00 + ((a1 - a00) * k) / 5; await CB.trek(R(Math.sin(a) * 13.6, Math.cos(a) * 13.6), 0.6, 10000); }
      for (const x of [11.5, 8.6, 2.5]) await CB.trek(R(s * x, 0), 0.4, 8000);
      return CourC.onDisc(Player.body.p); })()`);
  try {
    if (!(await onto(dame))) return fail(`${who(dame)} is not on the disc ${await dame.ev('JSON.stringify(CourC.rel(Player.body.p))')}`);
    await sleep(2000);
    if ((await both(A, B, 'Story.S.x.stage')).some((s) => s !== 0)) return fail('the pairs started with the dame alone on the disc');
    covered.push(`${who(dame)} as dame walks round the ring and over the west bridge onto the disc: alone, the pairs wait`);
    if (!(await onto(valet))) return fail(`${who(valet)} is not on the disc`);
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 1', 5000))) return fail('both on the disc: stage 1 not on both screens');
    covered.push(`${who(valet)} as valet comes over the east bridge: both on the disc, the pairs start on both screens`);

    // ---- pair 0: both to their clovers, speeds matched ----
    const pair0 = await A.ev('Story.S.x.pair | 0');
    const tip0 = await A.ev('Story.S.x.tip | 0');
    const clover = (p) =>
      p.ev(`(async () => { const C = CourC.C, me = Story.role, mate = me === 'dame' ? 'valet' : 'dame', S = Input.sim, t0 = performance.now(), n0 = Story.S.x.pair;
        while (performance.now() - t0 < 40000 && Story.S.x.stage === 1 && Story.S.x.pair === n0) {
          const tg = CourC.dbgK.pairPos(), q = CourC.P(C.x + tg[me].x, 0, C.z + tg[me].z), qm = CourC.P(C.x + tg[mate].x, 0, C.z + tg[mate].z);
          const dm = Math.hypot(qm.x - Remote.pos.x, qm.z - Remote.pos.z), dd = Math.hypot(q.x - Player.body.p.x, q.z - Player.body.p.z);
          const k = dd > 0.3 ? clamp(dd / Math.max(dd, dm, 0.01), 0.3, 1) : 1;
          if (dd < 0.2) { S.x = 0; S.z = 0; } else { Cam.yaw = Math.atan2(q.x - Player.body.p.x, q.z - Player.body.p.z); S.x = 0; S.z = Math.min(1, dd * 1.2) * k; }
          await CB.sl(30);
        }
        S.x = 0; S.z = 0; return Story.S.x.pair; })()`);
    const r = await Promise.all([clover(dame), clover(valet)]);
    if (!(await untilBoth(A, B, `(Story.S.x.pair | 0) === ${pair0 + 1}`, 4000))) return fail(`pair not made: ${JSON.stringify(r)}, tips ${await A.ev('Story.S.x.tip | 0')}`);
    const tips = (await A.ev('Story.S.x.tip | 0')) - tip0;
    covered.push(`both walk to their clovers at matched speeds: pair ${pair0 + 1} made, the next one on both screens${tips ? ` (${tips} tip on the way)` : ', the disc kept level'}`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
