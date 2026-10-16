// soleil « Un, deux, trois, Soleil »: the world is unloaded in the city and rebuilt on the way back
// (same fingerprint on both screens), then at the doll (stage 2) both must touch her within 3 s: the
// dame alone does nothing, the valet's touch puts her to sleep (stage 3, she faces the players).
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
    Soleil.group.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++;
      if (o.isInstancedMesh) n += o.count;
    });
    return JSON.stringify([m, n, !!Soleil.screen]);
  })()`;
  // ---- unload in the city, rebuild on the way back (each page has its own Life.log)
  const pages = [A, B];
  const n0 = await both('Life.log.length');
  const fp0 = await both(FP);
  await go('city');
  for (let i = 0; i < 2; i++)
    if (!(await pages[i].ev(`!Soleil.built && Life.log.slice(${n0[i]}).some((r) => r.world === 'soleil')`)))
      return { covered, ok: false, notes: `not unloaded in the city on ${who(pages[i])}` };
  await go('soleil');
  if (!(await until(A, 'Soleil.built')) || !(await until(B, 'Soleil.built')))
    return { covered, ok: false, notes: 'not built again on entry' };
  const fp1 = await both(FP);
  if (fp0[0] !== fp1[0] || fp0[1] !== fp1[1])
    return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city, rebuilt identical ${fp1[0]} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; }); 1');
  await sleep(800);

  // ---- dame touches the doll: alone, nothing happens
  await dame.ev("Story.ctx.act({ a: 'touch' }); 1");
  await sleep(500);
  const one = await both('Story.S.x.stage');
  if (one[0] !== 2 || one[1] !== 2) return { covered, ok: false, notes: `one touch changed the stage: ${JSON.stringify(one)}` };
  covered.push(`dame touch alone refused (${who(dame)})`);

  // ---- valet touches within 3 s: the doll sleeps and turns to face the players
  await valet.ev("Story.ctx.act({ a: 'touch' }); 1");
  await sleep(1500);
  const st = await both("Story.S.x.stage === 3 && Story.S.x.d.ph === 'sleep' && Soleil.yaw > 2.5");
  if (!st[0] || !st[1]) {
    const x = await both('JSON.stringify([Story.S.x, Soleil.yaw])');
    return { covered, ok: false, notes: `the doll did not sleep on both screens: ${JSON.stringify(x)}` };
  }
  covered.push(`valet touch: doll asleep, stage 3, turned on both screens (${who(valet)})`);
  return { covered, ok: true };
};
