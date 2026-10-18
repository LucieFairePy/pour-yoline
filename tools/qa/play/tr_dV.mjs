// tr_dV « Le Valet de Carreau » (Salle des Facettes, table of diamonds): the table's world waits
// through the city, is unloaded at another épreuve and rebuilt identical. Then, with real input
// (Input.sim, tools/qa/campaign/lib.js; the pedestal is worked out from the two clue halves the
// two screens show, never from the deal's answer):
// - both walk the quay and the bridge into the hall: the gems are dealt (stage 2) on both screens;
// - the one who is not the picker presses E at a pedestal: nothing;
// - the picker takes a gem that does not fit the clues: a miss on both screens, a new deal;
// - the picker takes the gem fitting both clues: the next round on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_d', 'CourD')}, ${meshes('CourD.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_dV', { world: 'cour_d', fp: FP, built: 'CourD.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, round: Story.S.x.round, miss: Story.S.x.miss || 0, res: Story.S.x.res || null, n: Story.S.x.deal && Story.S.x.deal.n }');
  // the gem fitting the colour clue (dame's screen) and the cut clue (valet's screen)
  const FIT = `(() => { const dl = Story.S.x.deal, fits = (cl, g) => { const v = cl.t === 'c' ? g.c : g.k; return cl.neg ? !cl.v.includes(v) : cl.v.includes(v); };
    return dl.gems.map((g, i) => (fits(dl.cc, g) && fits(dl.ck, g) ? i : -1)).filter((i) => i >= 0); })()`;
  // stand 1.25 m before pedestal i and press E
  const take = (p, i) =>
    p.ev(`(async () => { const P = CourD.PEDS[${i}], dx = CourD.A.x - P.x, dz = CourD.A.z - P.z, d = Math.hypot(dx, dz);
      await CB.go(CourD.P(P.x + (dx / d) * 1.25, 0, P.z + (dz / d) * 1.25), { near: 0.4, ms: 25000 });
      CB.face(CourD.P(P.x, 1.6, P.z)); await CB.sl(250); await CB.tap('interact'); await CB.sl(1200); return 1; })()`);
  try {
    const side = (p) => (p === dame ? -1.5 : 1.5);
    const walk = (p) => p.ev(`(async () => { await CB.trek(CourD.P(${side(p)}, 0, 10), 0.5, 15000); return CB.trek(CourD.P(${side(p)}, 0, 21), 0.5, 15000); })()`);
    await Promise.all([walk(dame), walk(valet)]);
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 2 && !!Story.S.x.deal', 10000))) return fail(`not in the hall: ${JSON.stringify(await x(A))}`);
    covered.push('both walk the quay and the bridge into the hall: the gems dealt on both screens');
    await sleep(1500);
    const picker = (await A.ev("['valet', 'dame', 'valet'][Math.min(2, (Story.S.x.round || 1) - 1)]")) === 'dame' ? dame : valet;
    const other = picker === dame ? valet : dame;
    const fit = await A.ev(FIT);
    if (fit.length !== 1) return fail(`the clues fit ${fit.length} pedestals`);
    const s0 = await x(A);
    await take(other, fit[0]);
    if (JSON.stringify(await x(A)) !== JSON.stringify(s0)) return fail(`the non-picker took a gem: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(other)} (not the picker this round) presses E at the right pedestal: nothing`);
    await other.ev(`CB.go(CourD.P(${side(other)}, 0, 26), { near: 0.8, ms: 15000 })`);
    const wrong = (fit[0] + 1) % 6;
    await take(picker, wrong);
    if (!(await untilBoth(A, B, `(Story.S.x.miss || 0) === ${s0.miss + 1} && Story.S.x.res && Story.S.x.res.ok === 0`, 4000))) return fail(`wrong gem: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(picker)} as picker takes a gem that does not fit: a miss on both screens`);
    if (!(await untilBoth(A, B, `!!Story.S.x.deal && Story.S.x.deal.n !== ${s0.n}`, 6000))) return fail('no new deal after the miss');
    await sleep(800);
    const fit2 = await A.ev(FIT);
    if (fit2.length !== 1) return fail(`the new clues fit ${fit2.length} pedestals`);
    const r0 = await A.ev('Story.S.x.round');
    await take(picker, fit2[0]);
    if (!(await untilBoth(A, B, `Story.S.x.round === ${r0 + 1} && Story.S.x.res.ok === 1`, 4000))) return fail(`right gem: ${JSON.stringify(await x(A))}`);
    covered.push(`new deal; the picker takes the gem fitting both clues: round ${r0 + 1} on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
