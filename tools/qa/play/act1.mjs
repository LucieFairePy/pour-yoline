// act1 (Arena, the glass bridges): the world is unloaded in the city and rebuilt identical, then
// stage 2 (the valet hooks onto the harness, the dame holds the winch) and stage 3 (the valet's
// crank lights the rings: a world-side colour change on both screens).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const until = async (p, expr, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await p.ev(expr).catch(() => false)) return true;
      await sleep(250);
    }
    return false;
  };
  // the group's objects (the screen hangs in it), the rings, the cable's ends, the cabins
  const FP = `(() => {
    let n = 0;
    Arena.screen.mesh.parent.traverse(() => n++);
    return JSON.stringify([n, Arena.rings.length, Arena.harnessPos(0).toArray(), Arena.harnessPos(1).toArray(), Arena.ceilingFor('dame'), Arena.ceilingFor('valet')]);
  })()`;
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  await go('city');
  if (!(await until(A, '!Arena.built')) || !(await until(B, '!Arena.built')))
    return { covered, ok: false, notes: 'Arena still built in the city' };
  await go('act1');
  if (!(await until(A, 'Arena.built')) || !(await until(B, 'Arena.built')))
    return { covered, ok: false, notes: 'Arena not built again on re-entry' };
  await sleep(800);
  for (const p of [A, B]) {
    if (!(await p.ev("Life.log.some((r) => r.world === 'arena')")))
      return { covered, ok: false, notes: `${who(p)}: no unload of arena in Life.log` };
    const f = await p.ev(FP);
    const f0 = p === A ? fp0[0] : fp0[1];
    if (f !== f0) return { covered, ok: false, notes: `${who(p)}: fingerprint ${f} after rebuild, ${f0} before` };
  }
  covered.push('unloaded in the city, rebuilt identical (both)');

  const valet = (await A.ev('Story.role')) === 'valet' ? A : B;
  const dame = valet === A ? B : A;
  const x = (p) =>
    p.ev('JSON.stringify({ stage: Story.S.x.stage, att: !!Story.S.x.att, hold: !!Story.S.x.hold, lit: !!Story.S.x.lit })').then(JSON.parse);

  // stage 2: the harness and the winch
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; s.x.att = false; s.x.hold = false; s.x.lit = false; }); 1');
  await sleep(900);
  await valet.ev("Story.ctx.act({ a: 'attach' }); 1");
  await sleep(900);
  if (!(await x(A)).att || !(await x(B)).att) return { covered, ok: false, notes: 'harness attach did not reach both screens' };
  covered.push(`harness attached (${who(valet)} as valet)`);
  await dame.ev("Story.ctx.act({ a: 'winch', on: true }); 1");
  await sleep(900);
  if (!(await x(A)).hold || !(await x(B)).hold) return { covered, ok: false, notes: 'winch held did not reach both screens' };
  covered.push(`winch held (${who(dame)} as dame)`);
  await dame.ev("Story.ctx.act({ a: 'winch', on: false }); 1");

  // stage 3: the rings glow (colour above 1) only while the valet's crank is turned
  await A.ev('Story.ctx.set((s) => { s.x.stage = 3; s.x.att = false; s.x.hold = false; s.x.lit = false; }); 1');
  await sleep(1200);
  const ring = 'Arena.rings[0].m.material.color.r';
  if ((await A.ev(ring)) > 1 || (await B.ev(ring)) > 1) return { covered, ok: false, notes: 'rings lit before the crank' };
  await valet.ev("Story.ctx.act({ a: 'lit', on: true }); 1");
  await sleep(1000);
  const a = await x(A);
  const b = await x(B);
  const ra = await A.ev(ring);
  const rb = await B.ev(ring);
  if (!(a.lit && b.lit && ra > 1 && rb > 1))
    return { covered, ok: false, notes: `rings not lit on both screens: ${JSON.stringify({ a, b, ra, rb })}` };
  covered.push(`rings crank lit, rings glow on both screens (${who(valet)} as valet)`);
  await valet.ev("Story.ctx.act({ a: 'lit', on: false }); 1");
  return { covered, ok: true };
};
