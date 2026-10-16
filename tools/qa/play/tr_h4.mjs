// tr_h4 « La Lanterne »: the world is unloaded in the city and rebuilt on re-entry (same
// fingerprint on both pages), then the one lantern changes hands: the dame takes it from its first
// post (stage 1), then gives it to the valet standing by her. Both screens must agree on who
// carries it, and the world's light must follow the bearer (no post).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    '(() => { let n = 0; H4.group.traverse(() => n++); return JSON.stringify([n, Object.keys(H4.posts).length, H4.slabs.length, H4.wraiths.length, H4.braziers.length, H4.blind.b1.length, H4.blind.b2.length]); })()';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_h4');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_h4')");
    const bu = await p.ev('H4.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const lan = (p) => p.ev('JSON.stringify([Story.S.x.lan.who, Story.S.x.lan.post, H4.light.post])').then(JSON.parse);
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.lan = { who: null, post: 'p0' }; }); 1");
  // both by the first post (p0 hangs at x 0, y 1.15, z 5)
  await dame.ev('Player.body.p.copy(H4.P(-1.2, 0.05, 5)); Player.body.v.set(0, 0, 0); 1');
  await valet.ev('Player.body.p.copy(H4.P(1.2, 0.05, 5)); Player.body.v.set(0, 0, 0); 1');
  await sleep(1500);

  await dame.ev("Story.ctx.act({ a: 'take', post: 'p0' }); 1");
  await sleep(1000);
  let a = await lan(A), b = await lan(B);
  if (a[0] !== 'dame' || b[0] !== 'dame' || a[2] !== null || b[2] !== null) return { covered, ok: false, notes: `the dame did not take the lantern on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`dame takes the lantern from p0 (${who(dame)})`);

  await dame.ev("Story.ctx.act({ a: 'give' }); 1");
  await sleep(1000);
  a = await lan(A);
  b = await lan(B);
  if (a[0] !== 'valet' || b[0] !== 'valet') return { covered, ok: false, notes: `the lantern did not pass to the valet on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`dame gives it, the valet carries it (${who(valet)})`);

  // the valet hangs it back on p0
  await valet.ev("Story.ctx.act({ a: 'place', post: 'p0' }); 1");
  await sleep(1000);
  a = await lan(A);
  b = await lan(B);
  if (a[1] !== 'p0' || b[1] !== 'p0' || a[2] !== 'p0' || b[2] !== 'p0') return { covered, ok: false, notes: `the valet did not hang it on p0 on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`valet hangs the lantern back on p0 (${who(valet)})`);
  return { covered, ok: true };
};
