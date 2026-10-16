// tr_d10 « Le Lac gelé »: the world is unloaded in the city and built again on entry (same
// fingerprint on both pages), then the walker's own action on each side: a fall re-draws the ice
// (new seed, falls + 1) and both screens lay the new field out in the rebuilt world. Stage 1 is
// walked by the valet (the dame's fall is refused there), stage 2 by the dame.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const FP = 'JSON.stringify([D10.holes.length, D10.GRIDS.length, !!D10.card, !!D10.screen, !!D10.RING.wp, !!(D10.sky && D10.sky.parent), !!(D10.motes && D10.motes.parent)])';
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  // ---- unload in the city, rebuild on entry ----
  await go('city');
  await go('tr_d10');
  await sleep(800);
  for (const p of [A, B]) {
    const r = JSON.parse(await p.ev("JSON.stringify({ un: Life.log.some((r) => r.world === 'tr_d10'), built: D10.built })"));
    if (!r.un || !r.built) return { covered, ok: false, notes: `${who(p)}: unloaded ${r.un}, built again ${r.built}` };
  }
  const fp1 = [await A.ev(FP), await B.ev(FP)];
  if (fp1[0] !== fp0[0] || fp1[1] !== fp0[1]) return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city and rebuilt, same fingerprint on both pages ${fp1[0]}`);

  const x = (p) => p.ev('JSON.stringify({ seed: Story.S.x.seed, falls: Story.S.x.falls, stage: Story.S.x.stage, laid: D10.local.seed === Story.S.x.seed })').then(JSON.parse);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const fall = "Story.ctx.act({ a: 'fall', s: Story.S.x.seed, i: 0 }); 1";

  // ---- stage 1: the valet walks; the dame's fall is not hers to make ----
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.crossed = false; s.x.trod = []; s.x.falls = 0; }); 1");
  await sleep(1600);
  const s0 = await x(A);
  await dame.ev(fall);
  await sleep(800);
  if ((await x(A)).falls !== 0) return { covered, ok: false, notes: 'the reader (dame) re-drew the ice at stage 1' };
  covered.push(`fall refused from ${who(dame)} (the dame reads at stage 1)`);
  await valet.ev(fall);
  await sleep(1400);
  for (const p of [A, B]) {
    const s = await x(p);
    if (s.falls !== 1 || s.seed === s0.seed || !s.laid) return { covered, ok: false, notes: `${who(p)} after the valet's fall: ${JSON.stringify({ s0, s })}` };
  }
  covered.push(`fall by ${who(valet)} as valet (stage 1): new seed, laid out on both pages`);

  // ---- stage 2: the dame walks (the host takes one fall per 1.5 s) ----
  await A.ev("Story.ctx.set((s) => { s.x.stage = 2; s.x.crossed = false; s.x.trod = []; s.x.falls = 0; }); 1");
  await sleep(1700);
  const s2 = await x(A);
  await dame.ev(fall);
  await sleep(1400);
  for (const p of [A, B]) {
    const s = await x(p);
    if (s.stage !== 2 || s.falls !== 1 || s.seed === s2.seed || !s.laid) return { covered, ok: false, notes: `${who(p)} after the dame's fall: ${JSON.stringify({ s2, s })}` };
  }
  covered.push(`fall by ${who(dame)} as dame (stage 2): new seed, laid out on both pages`);
  return { covered, ok: true };
};
