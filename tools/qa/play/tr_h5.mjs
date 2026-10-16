// tr_h5 « La Chute »: the world is unloaded in the city and rebuilt on re-entry (same fingerprint
// on both pages), then each jumper falls once: the dame at the first leap (stage 1), the valet at
// the second (stage 2). Each fall draws a new layout for that leap's hidden clouds: the seed must
// reach both pages and both must slide their clouds the same way.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP = 'JSON.stringify([H5.hidden.length, H5.updrafts.length, H5.rings.length, H5.diveRings.length, H5.PILLARS.length, H5.bolts.length])';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_h5');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_h5')");
    const bu = await p.ev('H5.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const lay = (p, k) => p.ev(`Story.S.x.lay && Story.S.x.lay.${k}`);
  const ox = (p, k) => p.ev(`JSON.stringify(H5.hidden.filter((c) => c.leap === '${k}').map((c) => +c.ox.toFixed(3)))`);

  // one fall: the jumper of that stage sends 'refall', the host draws a new seed for the leap
  const fall = async (stage, k, jumper, kit) => {
    await A.ev(`Story.ctx.set((s) => { s.x.stage = ${stage}; }); 1`);
    await sleep(900);
    const before = await lay(A, k);
    await jumper.ev("Story.ctx.act({ a: 'refall' }); 1");
    await sleep(1000);
    const la = await lay(A, k), lb = await lay(B, k);
    if (!la || la === before || la !== lb) return `leap ${k}: seed not renewed on both pages (before ${before}, ${la} / ${lb})`;
    const oa = await ox(A, k), ob = await ox(B, k);
    if (oa !== ob) return `leap ${k}: the clouds slid differently (${oa} / ${ob})`;
    covered.push(`${kit} falls at leap ${k}: new cloud layout on both screens (${who(jumper)})`);
    return null;
  };
  const e1 = await fall(1, 'A', dame, 'dame');
  if (e1) return { covered, ok: false, notes: e1 };
  const e2 = await fall(2, 'B', valet, 'valet');
  if (e2) return { covered, ok: false, notes: e2 };
  return { covered, ok: true };
};
