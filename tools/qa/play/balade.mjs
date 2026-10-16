// balade « La Rivière »: the world is unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens), then at the lantern stall (stage 2) each takes a lantern (one action
// per role): the stall empties on both screens and the walk goes on to the pier (stage 3).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const both = async (e) => [await A.ev(e), await B.ev(e)];
  const until = async (p, e, ms = 8000) => {
    for (let t = 0; t < ms; t += 200) {
      if (await p.ev(e)) return true;
      await sleep(200);
    }
    return false;
  };
  const FP = `(() => {
    let m = 0, n = 0;
    Balade.group.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++;
      if (o.isInstancedMesh) n += o.count;
    });
    return JSON.stringify([m, n, Balade.benches.length, Balade.signs.length, Balade.stall.length]);
  })()`;
  // ---- unload in the city, rebuild on the way back (each page has its own Life.log)
  const pages = [A, B];
  const n0 = await both('Life.log.length');
  const fp0 = await both(FP);
  await go('city');
  for (let i = 0; i < 2; i++)
    if (!(await pages[i].ev(`!Balade.built && Life.log.slice(${n0[i]}).some((r) => r.world === 'balade')`)))
      return { covered, ok: false, notes: `not unloaded in the city on ${who(pages[i])}` };
  await go('balade');
  if (!(await until(A, 'Balade.built')) || !(await until(B, 'Balade.built')))
    return { covered, ok: false, notes: 'not built again on entry' };
  const fp1 = await both(FP);
  if (fp0[0] !== fp1[0] || fp0[1] !== fp1[1])
    return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city, rebuilt identical ${fp1[0]} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  // the bench of the rebuilt world replaced the old one in the city's list (no stale duplicate)
  const bench = await both(
    'Balade.benches.length === 1 && City.benches.includes(Balade.benches[0]) && ' +
      'City.benches.filter((b) => b.pos.distanceTo(Balade.benches[0].pos) < 0.01).length === 1',
  );
  if (!bench[0] || !bench[1]) return { covered, ok: false, notes: `waterfall bench stale in City.benches: ${JSON.stringify(bench)}` };
  covered.push('waterfall bench swapped in City.benches (both)');
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; s.x.lan = {}; s.x.released = false; }); 1');
  await sleep(800);

  // ---- dame takes her lantern
  await dame.ev("Story.ctx.act({ a: 'lan' }); 1");
  await sleep(800);
  const d = await both('!!Story.S.x.lan.dame && Story.S.x.stage === 2 && !Balade.stall[0].visible && Balade.stall[1].visible');
  if (!d[0] || !d[1]) return { covered, ok: false, notes: `dame lantern not on both screens: ${JSON.stringify(d)}` };
  covered.push(`dame lantern taken (${who(dame)})`);

  // ---- valet takes his: both lanterns gone from the stall, stage 3
  await valet.ev("Story.ctx.act({ a: 'lan' }); 1");
  await sleep(1200);
  const v = await both('!!Story.S.x.lan.valet && Story.S.x.stage === 3 && Balade.stall.every((l) => !l.visible)');
  if (!v[0] || !v[1]) {
    const x = await A.ev('JSON.stringify(Story.S.x)');
    return { covered, ok: false, notes: `valet lantern / stage 3 not on both screens: ${x}` };
  }
  covered.push(`valet lantern taken, stall empty, stage 3 (${who(valet)})`);
  return { covered, ok: true };
};
