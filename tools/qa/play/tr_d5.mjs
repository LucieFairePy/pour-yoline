// tr_d5 « La Gravité »: the world is unloaded in the city and rebuilt on re-entry (same
// fingerprint on both pages), then the valet picks up and puts down a crate in the turning room
// (stage 1, both screens see it carried then placed), and the dame switches the gravity beam on in
// room 2 (stage 2).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    'JSON.stringify([D5.crates.length, D5.plates.length, Object.keys(D5.stations).length, D5.lanes.length, D5.stones.length, D5.lifts.length, D5.bells.length, D5.r2.gates.length, D5.r2.bubbles.length, !!D5.screen])';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_d5');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_d5')");
    const bu = await p.ev('D5.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const crate = (p) => p.ev('JSON.stringify([Story.S.x.r1.crates[0][3], D5.crates[0].held])').then(JSON.parse);

  // stage 1: the valet carries crate 0, then sets it down where it started
  await valet.ev("Story.ctx.act({ a: 'pick', i: 0 }); 1");
  await sleep(900);
  let a = await crate(A), b = await crate(B);
  if (a[0] !== 'valet' || b[0] !== 'valet' || !a[1] || !b[1]) return { covered, ok: false, notes: `crate 0 not carried on both screens: ${JSON.stringify({ a, b })}` };
  await valet.ev("Story.ctx.act({ a: 'drop', p: [-4, 0, 9.5] }); 1");
  await sleep(900);
  a = await crate(A);
  b = await crate(B);
  if (a[0] !== null || b[0] !== null || a[1] || b[1]) return { covered, ok: false, notes: `crate 0 not put down on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`valet picks up and puts down a crate (${who(valet)})`);

  // stage 2: the dame switches the gravity beam on
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; s.x.r2.grab = false; }); 1');
  await sleep(1000);
  await dame.ev("Story.ctx.act({ a: 'grab' }); 1");
  await sleep(900);
  const g = (p) => p.ev('JSON.stringify([Story.S.x.r2.grab, !!D5.r2.block, !!D5.r2.beam])').then(JSON.parse);
  const ga = await g(A), gb = await g(B);
  if (!ga[0] || !gb[0] || !ga[1] || !gb[1] || !ga[2] || !gb[2]) return { covered, ok: false, notes: `beam not on on both screens: ${JSON.stringify({ ga, gb })}` };
  covered.push(`dame switches the gravity beam on in room 2 (${who(dame)})`);
  return { covered, ok: true };
};
