// tr_s5 « Les Lames »: the world is unloaded in the city and rebuilt on re-entry (same fingerprint
// on both pages), then the watcher jams a trap with its lever: the dame in the first half of the
// hall (stage 1), the valet in the second (stage 2). Both screens must agree on the jam.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP = '(() => { let n = 0; TrS5.group.traverse(() => n++); return JSON.stringify([n, TrS5.TRAPS.length, !!TrS5.screen, !!TrS5.screen3]); })()';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_s5');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_s5')");
    const bu = await p.ev('TrS5.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify({ stage: Story.S.x.stage, jam: Story.S.x.jam && Story.S.x.jam.id, fz: Story.S.x.fz })').then(JSON.parse);

  // stage 1: the valet runs, the dame jams « pa » from gallery A
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.jam = null; s.x.jcd = 0; s.x.fz = {}; }); 1');
  await sleep(800);
  await dame.ev("Story.ctx.act({ a: 'jam', id: 'pa' }); 1");
  await sleep(900);
  let a = await x(A), b = await x(B);
  if (a.jam !== 'pa' || b.jam !== 'pa') return { covered, ok: false, notes: `jam pa not on both screens: ${JSON.stringify({ a, b })}` };
  if (!(await A.ev("TrS5.jw('pa', TrS5.T, Story.S.x) > 0"))) return { covered, ok: false, notes: 'the world does not show pa jammed on the host' };
  // the jam runs out after 4 s: its time is folded into fz.pa on both pages
  await sleep(4200);
  a = await x(A);
  b = await x(B);
  if (a.jam || b.jam || !(a.fz.pa > 0) || !(b.fz.pa > 0)) return { covered, ok: false, notes: `jam pa did not run out on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`dame jams pendulum pa, stage 1 (${who(dame)})`);

  // stage 2: the roles swap, the valet jams « pe » from gallery B
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; s.x.jam = null; s.x.jcd = 0; }); 1');
  await sleep(1000);
  await valet.ev("Story.ctx.act({ a: 'jam', id: 'pe' }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (a.jam !== 'pe' || b.jam !== 'pe') return { covered, ok: false, notes: `jam pe not on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`valet jams pe, stage 2 (${who(valet)})`);
  return { covered, ok: true };
};
