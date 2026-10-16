// tr_c7 « Le Pilote »: the world is unloaded in the city and rebuilt on re-entry (same fingerprint
// on both pages), then the landing shelf (stage 0): the dame casts off the first mooring, the valet
// takes the pilot's seat. Both screens must agree (only one seat taken: the skiff stays moored).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    '(() => { let n = 0; TrC7.group.traverse(() => n++); return JSON.stringify([n, TrC7.pad.boxes.length, TrC7.pad.moor.length, TrC7.plat.boxes.length, TrC7.drones.length, TrC7.trails.length, TrC7.mom.cores.length, TrC7.ship.flames.length, TrC7.bolt3.length]); })()';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_c7');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_c7')");
    const bu = await p.ev('TrC7.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify({ stage: Story.S.x.stage, moor: Story.S.x.moor, seats: Story.S.x.seats })').then(JSON.parse);
  await A.ev('Story.ctx.set((s) => { s.x.stage = 0; s.x.moor = [0, 0]; s.x.seats = { pilot: null, nav: null }; }); 1');
  await sleep(800);

  await dame.ev("Story.ctx.act({ a: 'moor', i: 0 }); 1");
  await sleep(900);
  let a = await x(A), b = await x(B);
  if (a.moor[0] !== 1 || b.moor[0] !== 1 || a.moor[1] !== 0 || b.moor[1] !== 0) return { covered, ok: false, notes: `mooring 0 not cast off on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`dame casts off mooring 0 (${who(dame)})`);

  await valet.ev("Story.ctx.act({ a: 'seat', k: 'pilot' }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (a.seats.pilot !== 'valet' || b.seats.pilot !== 'valet' || a.stage !== 0 || b.stage !== 0) return { covered, ok: false, notes: `the valet's pilot seat not on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`valet takes the pilot's seat (${who(valet)})`);
  return { covered, ok: true };
};
