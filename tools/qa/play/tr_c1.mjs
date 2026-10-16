// tr_c1 « Le Câble »: the world is unloaded in the city and rebuilt on re-entry (same fingerprint
// on both pages), then the level is driven through its own rules: the dame turns the crank in the
// alcove (stage 2, the chasm bridge comes out on both screens), both cross to the far landing
// (the host moves on to stage 3), the valet steps onto the first crumbling ledge (it shakes on
// both screens).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    '(() => { let n = 0; TrC1.group.traverse(() => n++); return JSON.stringify([n, TrC1.group.children.length, TrC1.LEDGES.map((L) => TrC1.onLedge({ x: L.x, y: TrC1.UP, z: L.z })).join()]); })()';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_c1');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_c1')");
    const bu = await p.ev('TrC1.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify({ stage: Story.S.x.stage, bridge: Story.S.x.bridge, cr: Story.S.x.cr, bk: TrC1._bk || 0 })').then(JSON.parse);

  // stage 2: the crank in the alcove brings the chasm bridge out
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; s.x.bridge = false; s.x.cr = [0, 0, 0, 0, 0, 0]; s.x.front = null; }); 1');
  await sleep(800);
  await dame.ev("Story.ctx.act({ a: 'lever' }); 1");
  await sleep(1200);
  let a = await x(A), b = await x(B);
  if (!a.bridge || !b.bridge) return { covered, ok: false, notes: `the crank did not bring the bridge out on both screens: ${JSON.stringify({ a, b })}` };
  if (!(a.bk > 0.05 && b.bk > 0.05)) return { covered, ok: false, notes: `the bridge segments did not start sliding: ${JSON.stringify({ a, b })}` };
  covered.push(`dame turns the crank, the bridge slides out on both screens (${who(dame)})`);

  // both on the far landing: the host moves on to the ledges
  const put = (p, dx, y, z) =>
    p.ev(`(() => { const s = Story.role === 'dame' ? -1 : 1; const q = TrC1.P(${dx} * s, ${y}, ${z}); Player.body.p.copy(q); Player.body.v.set(0, 0, 0); return 1; })()`);
  await put(dame, 1.5, 'TrC1.UP + 0.05', 51);
  await put(valet, 1.5, 'TrC1.UP + 0.05', 51);
  await sleep(1500);
  a = await x(A);
  b = await x(B);
  if (a.stage !== 3 || b.stage !== 3) return { covered, ok: false, notes: `both on the far landing, stage did not move to 3: ${a.stage} / ${b.stage}` };
  covered.push('both cross to the far landing: stage 3 on both screens');

  // the valet steps onto the first ledge (nobody anchored): it starts to shake
  await valet.ev('(() => { const L = TrC1.LEDGES[0]; Player.body.p.copy(TrC1.P(L.x, TrC1.UP + 0.02, L.z)); Player.body.v.set(0, 0, 0); return 1; })()');
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (!(a.cr[0] > 0 && b.cr[0] > 0)) return { covered, ok: false, notes: `the first ledge did not react on both screens: ${JSON.stringify({ a: a.cr, b: b.cr })}` };
  covered.push(`valet steps onto ledge 1, it gives way on both screens (${who(valet)})`);
  return { covered, ok: true };
};
