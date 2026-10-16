// raid « Le Caveau »: the world is unloaded in the city and rebuilt on the way back (same fingerprint
// on both screens), then each stands on their seal of the vault door (the host sees both, the door
// opens: stage 2) and the valet raises the Égide (his own action), seen on both screens.
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
    Raid.group.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++;
      if (o.isInstancedMesh) n += o.count;
    });
    return JSON.stringify([m, n, Raid.pillars.length]);
  })()`;
  // ---- unload in the city, rebuild on the way back (each page has its own Life.log)
  const pages = [A, B];
  const n0 = await both('Life.log.length');
  const fp0 = await both(FP);
  await go('city');
  for (let i = 0; i < 2; i++)
    if (!(await pages[i].ev(`!Raid.built && Life.log.slice(${n0[i]}).some((r) => r.world === 'raid')`)))
      return { covered, ok: false, notes: `not unloaded in the city on ${who(pages[i])}` };
  await go('raid');
  if (!(await until(A, 'Raid.built')) || !(await until(B, 'Raid.built')))
    return { covered, ok: false, notes: 'not built again on entry' };
  const fp1 = await both(FP);
  if (fp0[0] !== fp1[0] || fp0[1] !== fp1[1])
    return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city, rebuilt identical ${fp1[0]} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.held = []; s.x.latch = []; s.x.aegis = false; }); 1');
  await sleep(800);

  // ---- both on their door seal (dame left, valet right) for 0.8 s: the vault opens
  await dame.ev('Story.ctx.spawn(Raid.P(-4, Raid.FLOOR + 0.05, 61), 0); 1');
  await valet.ev('Story.ctx.spawn(Raid.P(4, Raid.FLOOR + 0.05, 61), 0); 1');
  await sleep(2200);
  const st = await both('Story.S.x.stage === 2');
  if (!st[0] || !st[1]) {
    const x = await A.ev('JSON.stringify(Story.S.x)');
    return { covered, ok: false, notes: `the door seals did not open the vault on both screens: ${x}` };
  }
  covered.push(`door seals held together, stage 2 (dame ${who(dame)}, valet ${who(valet)})`);

  // ---- valet: the Égide (only he can raise it, in the galerie)
  await valet.ev("Story.ctx.act({ a: 'aegis' }); 1");
  await sleep(700);
  const ae = await both('Story.S.x.aegis === true');
  if (!ae[0] || !ae[1]) return { covered, ok: false, notes: `the Égide is not up on both screens: ${JSON.stringify(ae)}` };
  covered.push(`valet Égide up (${who(valet)})`);
  return { covered, ok: true };
};
