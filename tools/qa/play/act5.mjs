// act5 (Worlds: the library, the parkour, the convergence): the world is unloaded in the city and
// rebuilt identical, then the dame solves the light tiles, the valet throws the first switch and
// the dame presses the first pedestal of the sequence; every step on both screens.
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
  // the group's objects and book instances, the moving slabs, the convergence ring
  const FP = `(() => {
    let n = 0, k = 0;
    Worlds.dscreen.mesh.parent.traverse((o) => { n++; if (o.isInstancedMesh) k += o.count; });
    return JSON.stringify([n, k, Worlds.moving.length, Worlds.C.center.toArray(), Worlds.ring.toArray()]);
  })()`;
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  await go('city');
  if (!(await until(A, '!Worlds.built')) || !(await until(B, '!Worlds.built')))
    return { covered, ok: false, notes: 'Worlds still built in the city' };
  await go('act5');
  if (!(await until(A, 'Worlds.built')) || !(await until(B, 'Worlds.built')))
    return { covered, ok: false, notes: 'Worlds not built again on re-entry' };
  await sleep(1000);
  for (const p of [A, B]) {
    if (!(await p.ev("Life.log.some((r) => r.world === 'worlds')")))
      return { covered, ok: false, notes: `${who(p)}: no unload of worlds in Life.log` };
    const f = await p.ev(FP);
    const f0 = p === A ? fp0[0] : fp0[1];
    if (f !== f0) return { covered, ok: false, notes: `${who(p)}: fingerprint ${f} after rebuild, ${f0} before` };
    // the world's tables answer again: the centre tile of the library, the first switch
    const t = await p.ev('Worlds.tileAt(V3(Worlds.OD.x, Worlds.OD.y, Worlds.OD.z + 7))');
    const s = await p.ev('Worlds.switchAt(V3(Worlds.OV.x + 3, Worlds.OV.y, Worlds.OV.z + 94))');
    if (t !== 4 || s !== 0) return { covered, ok: false, notes: `${who(p)}: tileAt ${t}, switchAt ${s} after rebuild` };
  }
  covered.push('unloaded in the city, rebuilt identical (both)');

  const valet = (await A.ev('Story.role')) === 'valet' ? A : B;
  const dame = valet === A ? B : A;
  const x = (p) =>
    p
      .ev('JSON.stringify({ stage: Story.S.x.stage, p1: Story.S.x.p1, s1: Story.S.x.s1, input: Story.S.x.input, lights: Story.S.x.lights })')
      .then(JSON.parse);

  // the light tiles one press from solved: the centre and its four neighbours off
  await A.ev(
    "Story.ctx.set((s) => { s.x.stage = 'worlds'; s.x.lights = [true, false, true, false, false, false, true, false, true]; s.x.p1 = s.x.s1 = s.x.p2 = s.x.s2 = false; s.x.input = []; }); 1",
  );
  await sleep(900);
  await dame.ev("Story.ctx.act({ a: 'tile', i: 4 }); 1");
  await sleep(900);
  let a = await x(A);
  let b = await x(B);
  if (!(a.p1 && b.p1 && a.lights.every(Boolean) && b.lights.every(Boolean)))
    return { covered, ok: false, notes: `tiles: ${JSON.stringify({ a, b })}` };
  covered.push(`light tiles solved (${who(dame)} as dame)`);

  await valet.ev("Story.ctx.act({ a: 'switch', i: 0 }); 1");
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (!(a.s1 && b.s1)) return { covered, ok: false, notes: `first switch: ${JSON.stringify({ a, b })}` };
  covered.push(`first switch thrown (${who(valet)} as valet)`);

  const k = await A.ev('Story.S.x.seq[0]');
  await dame.ev(`Story.ctx.act({ a: 'ped', k: ${k} }); 1`);
  await sleep(900);
  a = await x(A);
  b = await x(B);
  if (!(a.input.length === 1 && a.input[0] === k && b.input.length === 1 && b.input[0] === k))
    return { covered, ok: false, notes: `pedestal: ${JSON.stringify({ a: a.input, b: b.input, k })}` };
  covered.push(`first pedestal of the sequence (${who(dame)} as dame)`);
  return { covered, ok: true };
};
