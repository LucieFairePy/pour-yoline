// portes « Les Portes »: the world is unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens), then the dame shoots a portal onto a panel and the valet stands on
// the button behind the glass of room 1 (the door opens, stage 2). Checked on both screens.
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
    Portes.group.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++;
      if (o.isInstancedMesh) n += o.count;
    });
    return JSON.stringify([m, n, Portes.panels.length, Object.keys(Portes.buttons).length]);
  })()`;

  // ---- unload in the city, rebuild on the way back (each page has its own Life.log)
  const pages = [A, B];
  const n0 = await both('Life.log.length');
  const fp0 = await both(FP);
  await go('city');
  for (let i = 0; i < 2; i++)
    if (!(await pages[i].ev(`!Portes.built && Life.log.slice(${n0[i]}).some((r) => r.world === 'portes')`)))
      return { covered, ok: false, notes: `not unloaded in the city on ${who(pages[i])}` };
  await go('portes');
  if (!(await until(A, 'Portes.built')) || !(await until(B, 'Portes.built')))
    return { covered, ok: false, notes: 'not built again on entry' };
  const fp1 = await both(FP);
  if (fp0[0] !== fp1[0] || fp0[1] !== fp1[1])
    return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city, rebuilt identical ${fp1[0]} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.open = []; s.x.portals = { a: null, b: null }; }); 1');
  await sleep(800);

  // ---- dame: a portal on panel p1 (her own action), seen by both and resolved on the new panels
  await dame.ev(`(() => {
    const p = Portes.panels.find((q) => q.id === 'p1');
    Story.ctx.act({ a: 'portal', which: 'a', panel: 'p1', pos: p.pos.toArray().map((v) => +v.toFixed(3)) });
    return 1;
  })()`);
  await sleep(1000);
  const portal = `(() => {
    const d = Story.S.x.portals.a;
    if (!d || d.panel !== 'p1') return false;
    const pd = Portes.portalData('a', d);
    return Portes.panels.includes(pd.panel);
  })()`;
  const pa = await both(portal);
  if (!pa[0] || !pa[1]) return { covered, ok: false, notes: `portal a not on p1 on both screens: ${JSON.stringify(pa)}` };
  covered.push(`dame portal on p1 (${who(dame)})`);

  // ---- valet: stands on button b1 behind the glass: door d1 opens, stage 2
  await valet.ev('Story.ctx.spawn(Portes.P(7, 0.1, 20), 0); 1');
  await sleep(1500);
  const st = await both("Story.S.x.stage >= 2 && Story.S.x.open.includes('d1')");
  if (!st[0] || !st[1]) {
    const x = await A.ev('JSON.stringify(Story.S.x)');
    return { covered, ok: false, notes: `button b1 did not open d1 on both screens: ${x}` };
  }
  covered.push(`valet button b1, door open, stage 2 (${who(valet)})`);
  return { covered, ok: true };
};
