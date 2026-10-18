// tr_hK « Le Roi de Cœur » (le théâtre, table of hearts; round 0: the valet throws from the rug,
// the dame guides from the stage): the table's world waits through the city, is unloaded at
// another épreuve and rebuilt identical. Then, with real input (Input.sim, tools/qa/campaign/
// lib.js; the aim is worked out from the vases' places the guide sees on the stage):
// - the dame goes up to the stage by the coulisses on her side (seen there on both screens);
// - a throw sent from the guide's page (as the level would) is refused: not the thrower;
// - the valet walks onto the rug and opens the aim (E), sets aim and strength with stick taps,
//   throws (E): a rose used and a vase filled on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_h', 'CourH')}, ${meshes('CourH.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_hK', { world: 'cour_h', fp: FP, built: 'CourH.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, round: Story.S.x.round, used: Story.S.x.used | 0, full: Story.S.x.full | 0 }');
  try {
    if ((await A.ev('CourH.dbgK.throwerOf(Story.S.x)')) !== 'valet') return fail('round 0 thrower is not the valet');
    const up = await dame.ev(`(async () => { const s = -1; await CB.go(CourH.P(s * 12.4, 0, 118.5), { near: 0.5, ms: 40000 });
      await CB.trek(CourH.P(s * 12.4, 1.2, 124.5), 0.5, 15000); await CB.trek(CourH.P(s * 12.0, 1.2, 127), 0.5, 15000); await CB.trek(CourH.P(s * 5, 1.2, 127.5), 0.6, 15000);
      Cam.yaw = 0; Cam.pitch = 0.38; return CourH.onStage(Player.body.p); })()`);
    if (!up || !(await until(valet, 'CourH.onStage(Remote.pos)', 3000))) return fail(`${who(dame)} not on the stage (both screens) ${up}`);
    covered.push(`${who(dame)} as guide goes up to the stage by the coulisses (seen there on both screens)`);
    const s0 = await x(A);
    await dame.ev("Story.ctx.act({ a: 'throw', ang: 0, pow: 20 }); 1");
    await sleep(800);
    if (JSON.stringify(await x(A)) !== JSON.stringify(s0)) return fail(`the guide threw: ${JSON.stringify(await x(A))}`);
    covered.push("a throw from the guide's page (the level's action) refused");
    // on the rug, aim opened (E), dial the throw to vase 0 (single stick taps), throw (E)
    const thr = await valet.ev(`(async () => { const K = CourH.dbgK, S = Input.sim;
      await CB.go(CourH.P(0, 0, 109.6), { near: 0.35, ms: 40000 }); Cam.yaw = 0; await CB.sl(200);
      if (!K.local.aiming) await CB.tap('interact');
      if (!(await CB.until(() => K.local.aiming, 2000))) return 'no aim';
      const v = K.vaseDeal()[0], q = K.vasePos(v, K.carAng()); let best = null;
      for (let a = -25; a <= 25; a++) for (let pw = 0; pw <= 40; pw++) { const p = CourH.throwPath(a, pw);
        if (p.blocked || p.land.z < CourH.CURTAIN_Z) continue; const d = Math.hypot(p.land.x - q.x, p.land.z - q.z); if (!best || d < best.d) best = { a, p: pw, d }; }
      for (let k = 0; k < 140; k++) { const L = K.local, da = best.a - L.ang, dp = best.p - L.pow; if (!da && !dp) break;
        if (da) S.x = Math.sign(da); else S.z = Math.sign(dp); await CB.sl(50); S.x = 0; S.z = 0; await CB.sl(60); }
      await CB.tap('interact'); return [best.a, best.p, +best.d.toFixed(2)]; })()`);
    if (typeof thr === 'string') return fail(`${who(valet)}: ${thr}`);
    if (!(await untilBoth(A, B, `(Story.S.x.used | 0) === ${s0.used + 1}`, 3000))) return fail(`the throw did not go: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(valet)} as thrower on the rug: aim opened (E), aim ${thr[0]}° and strength ${thr[1]} by stick taps, thrown (E): a rose used on both screens`);
    if (!(await untilBoth(A, B, '((Story.S.x.full | 0) & 1) === 1', 6000))) return fail(`vase 0 not filled (landing ${thr[2]} m off): ${JSON.stringify(await x(A))}`);
    covered.push('the rose lands in vase 1: filled on both screens');
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
