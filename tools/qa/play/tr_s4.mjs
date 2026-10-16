// tr_s4 « La Tour » (kits swapped here: Story.role gives each page's kit): the world is unloaded in
// the city and rebuilt on re-entry (same fingerprint on both pages), then the cog hall (stage 1):
// the dame holds the floor brake, the valet the balcony brake; both screens agree on the held
// brakes and slow the cogs (the world's braked flag), then both let go.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    "(() => { let n = 0; TrS4.group.traverse(() => n++); return JSON.stringify([n, TrS4.discs.length, TrS4.discs.reduce((k, d) => k + d.boxes.length, 0)]); })()";
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_s4');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_s4')");
    const bu = await p.ev('TrS4.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify({ stage: Story.S.x.stage, brk: Story.S.x.brk, braked: !!(TrS4.v && TrS4.v.braked) })').then(JSON.parse);
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.brk = []; }); 1");
  await sleep(900);

  await dame.ev("Story.ctx.act({ a: 'brk', id: 'f', v: 1 }); 1");
  await sleep(900);
  let a = await x(A), b = await x(B);
  if (a.brk.join() !== 'f' || b.brk.join() !== 'f' || !a.braked || !b.braked) return { covered, ok: false, notes: `floor brake: ${JSON.stringify({ a, b })}` };
  covered.push(`dame holds the floor brake, the cogs slow on both screens (${who(dame)})`);

  await valet.ev("Story.ctx.act({ a: 'brk', id: 'm', v: 1 }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (a.brk.join() !== 'f,m' || b.brk.join() !== 'f,m') return { covered, ok: false, notes: `balcony brake: ${JSON.stringify({ a, b })}` };
  covered.push(`valet holds the balcony brake, both brakes held on both screens (${who(valet)})`);

  await dame.ev("Story.ctx.act({ a: 'brk', id: 'f', v: 0 }); 1");
  await valet.ev("Story.ctx.act({ a: 'brk', id: 'm', v: 0 }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (a.brk.length || b.brk.length || a.braked || b.braked) return { covered, ok: false, notes: `brakes released: ${JSON.stringify({ a, b })}` };
  covered.push('both let go: no brake, the cogs run again on both screens');
  return { covered, ok: true };
};
