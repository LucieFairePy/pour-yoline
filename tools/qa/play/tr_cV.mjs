// tr_cV « Le Valet de Trèfle » (the tug of war, table of clubs of the Cour): the table's world
// waits through the city, is unloaded at another épreuve and rebuilt identical. Then, with real
// input (Input.sim, tools/qa/campaign/lib.js; the drum strokes from the level's own list,
// CourC.dbgV.beats(), what the drum shows):
// - both walk to the grip circle of their kit: the round starts on both screens;
// - on one stroke only the dame pulls (E): the rope slips back on both screens (alone);
// - on the next two strokes both pull: the rope comes in two notches on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_c', 'CourC')}, ${meshes('CourC.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_cV', { world: 'cour_c', fp: FP, built: 'CourC.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  try {
    const grip = (p) =>
      p.ev(`(async () => { const g = CourC.VA.grip[Story.role]; await CB.trek(CourC.P(g[0], 0, g[1]), 0.35, 15000); CB.face(CourC.P(0, 1.6, 33)); return CourC.atGrip(Story.role, Player.body.p); })()`);
    const g = await Promise.all([grip(dame), grip(valet)]);
    if (!(await untilBoth(A, B, 'Story.S.x.on === true', 8000))) return fail(`the round did not start: at grip ${JSON.stringify(g)}`);
    covered.push('both walk to their grip circles: the round starts on both screens');
    await sleep(500);
    // the next real stroke (not a feint) far enough ahead, by index in the shared list
    const nextStroke = () => A.ev('(() => { const L = CourC.dbgV.local, b = CourC.dbgV.beats(); return b.findIndex((q) => !q.f && q.t > L.rt + 0.8); })()');
    // on stroke i: wait for it on this screen's drum clock, pull (E) if asked, then let it be judged
    const stroke = (p, i, pull) =>
      p.ev(`(async () => { const L = CourC.dbgV.local, b = CourC.dbgV.beats()[${i}];
        if (!b) return false;
        while (L.rt < b.t + 0.05) await CB.sl(6);
        if (${pull}) await CB.tap('interact', 70);
        while (L.rt < b.t + 0.75) await CB.sl(10);
        return true; })()`);
    const k = () => both(A, B, 'Story.S.x.k | 0');
    const k0 = await k();
    let i = await nextStroke();
    await Promise.all([stroke(dame, i, true), stroke(valet, i, false)]);
    await sleep(300);
    const k1 = await k();
    if (!(k1[0] === k0[0] - 1 && k1[1] === k1[0])) return fail(`one pull alone: k ${JSON.stringify([k0, k1])}`);
    covered.push(`${who(dame)} as dame pulls alone on a stroke (E): the rope slips back on both screens (k ${k1[0]})`);
    for (let n = 0; n < 2; n++) {
      i = await nextStroke();
      await Promise.all([stroke(dame, i, true), stroke(valet, i, true)]);
    }
    await sleep(300);
    const k2 = await k();
    if (!(k2[0] === k1[0] + 2 && k2[1] === k2[0])) return fail(`two pulls together: k ${JSON.stringify([k1, k2])}`);
    covered.push(`both pull (E) on the next two strokes: the rope comes in two notches on both screens (k ${k2[0]})`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
