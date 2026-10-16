// tr_s6 « Le Sol de lave » (kits swapped here: Story.role gives each page's kit): the world is
// unloaded in the city and rebuilt on re-entry (same fingerprint on both pages), then the lava
// fields (stage 1): a lever belongs to its kit (the valet cannot pull the dame's), the dame pulls
// lever A on the high pillar, the valet lever B on the islet (the gate's two marks on both
// screens), and the valet's frost lays a crust disc on the lava that both screens show.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    "(() => { let n = 0; TrS6.group.traverse(() => n++); return JSON.stringify([n, TrS6.group.children.length, TrS6.tiles.length, TrS6.tiles.filter((t) => t.rim).length]); })()";
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_s6');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_s6')");
    const bu = await p.ev('TrS6.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify({ stage: Story.S.x.stage, lev: Story.S.x.lev || {}, ice: Story.S.x.ice || [] })').then(JSON.parse);
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.lev = {}; s.x.ice = []; }); 1');
  await sleep(900);

  // lever A is the dame's: the valet's pull is refused
  await valet.ev("Story.ctx.act({ a: 'lev', id: 'a' }); 1");
  await sleep(700);
  let a = await x(A);
  if (a.lev.a != null) return { covered, ok: false, notes: "the valet pulled the dame's lever A" };

  await dame.ev("Story.ctx.act({ a: 'lev', id: 'a' }); 1");
  await sleep(900);
  a = await x(A);
  let b = await x(B);
  if (a.lev.a == null || b.lev.a == null) return { covered, ok: false, notes: `lever A not pulled on both screens: ${JSON.stringify({ a: a.lev, b: b.lev })}` };
  covered.push(`dame pulls lever A on the pillar, on both screens (${who(dame)})`);

  await valet.ev("Story.ctx.act({ a: 'lev', id: 'b' }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (a.lev.b == null || b.lev.b == null) return { covered, ok: false, notes: `lever B not pulled on both screens: ${JSON.stringify({ a: a.lev, b: b.lev })}` };
  covered.push(`valet pulls lever B on the islet, both marks on both screens (${who(valet)})`);

  // the frost: a crust disc on the lava in front of the start mesa
  await valet.ev("Story.ctx.act({ a: 'frost', k: 'ice', x: 0, z: 14 }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  const ok = (l) => l[0] && l[0].x === 0 && l[0].z === 14;
  if (!ok(a.ice) || !ok(b.ice)) return { covered, ok: false, notes: `frost disc not on both screens: ${JSON.stringify({ a: a.ice, b: b.ice })}` };
  covered.push(`valet's frost lays a crust disc, on both screens (${who(valet)})`);
  return { covered, ok: true };
};
