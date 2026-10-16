// tr_c6 « Les Mondes miroirs »: the world is unloaded in the city and rebuilt on re-entry (same
// fingerprint on both pages), then each player pulls the first lever of their own garden (stage 1,
// sw 0: the valet walks the day above, the dame the night below); each lever raises the bridge in
// the OTHER world, on both screens.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    '(() => { let n = 0; C6M.root.traverse(() => n++); return JSON.stringify([n, Object.keys(C6M.bridges).length, Object.keys(C6M.levers).length, Object.keys(C6M.plates).length, Object.keys(C6M.items).length, C6M.LIDS.length]); })()';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_c6');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_c6')");
    const bu = await p.ev('C6M.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify([Story.S.x.b1U, Story.S.x.b1L, C6M.bridges.b1U.want, C6M.bridges.b1L.want])').then(JSON.parse);
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.sw = 0; s.x.b1U = 0; s.x.b1L = 0; s.x.lv = {}; }); 1");
  await sleep(600);
  // each at their lever (less than 16 m apart along z, so the host lets the levers answer)
  await valet.ev("Player.body.p.copy(C6M.P('U', 1.6, 0.2, 8.4)); Player.body.v.set(0, 0, 0); 1");
  await dame.ev("Player.body.p.copy(C6M.P('L', 1.6, 0.2, 22.4)); Player.body.v.set(0, 0, 0); 1");
  await sleep(1500);

  await valet.ev("Story.ctx.act({ a: 'lever', id: 'l1U' }); 1");
  await sleep(1000);
  let a = await x(A), b = await x(B);
  if (a[1] !== 1 || b[1] !== 1 || a[3] !== 1 || b[3] !== 1) return { covered, ok: false, notes: `the day lever did not raise the night bridge on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`valet lever l1U raises the night bridge b1L (${who(valet)})`);

  await dame.ev("Story.ctx.act({ a: 'lever', id: 'l1L' }); 1");
  await sleep(1000);
  a = await x(A);
  b = await x(B);
  if (a[0] !== 1 || b[0] !== 1 || a[2] !== 1 || b[2] !== 1) return { covered, ok: false, notes: `the night lever did not raise the day bridge on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`dame lever l1L raises the day bridge b1U (${who(dame)})`);
  return { covered, ok: true };
};
