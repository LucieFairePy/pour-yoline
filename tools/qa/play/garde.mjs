// garde « La Garde royale »: the world is unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens), then both walk into the hall (wave 1 comes, stage 2) and each
// strikes a Pion down with real hits (the level's hit action, one per role), seen on both screens.
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
    Garde.group.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++;
      if (o.isInstancedMesh) n += o.count;
    });
    return JSON.stringify([m, n, Object.keys(Garde.plates).length]);
  })()`;
  // ---- unload in the city, rebuild on the way back (each page has its own Life.log)
  const pages = [A, B];
  const n0 = await both('Life.log.length');
  const fp0 = await both(FP);
  await go('city');
  // Garde serves two phases ('garde' and 'stand'): once stand.js is loaded in a page the world
  // waits through the city (shared world) and goes only when another épreuve is entered, so it is
  // unloaded here as that épreuve would. Without stand.js the city unloads it by itself.
  for (const p of pages) await p.ev('Garde.built && Life.unload(Garde); 1');
  for (let i = 0; i < 2; i++)
    if (!(await pages[i].ev(`!Garde.built && Life.log.slice(${n0[i]}).some((r) => r.world === 'garde')`)))
      return { covered, ok: false, notes: `not unloaded in the city on ${who(pages[i])}` };
  await go('garde');
  if (!(await until(A, 'Garde.built')) || !(await until(B, 'Garde.built')))
    return { covered, ok: false, notes: 'not built again on entry' };
  const fp1 = await both(FP);
  if (fp0[0] !== fp1[0] || fp0[1] !== fp1[1])
    return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city, rebuilt identical ${fp1[0]} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; }); 1');
  await sleep(800);

  // ---- both in the hall: wave 1 (eight Pions), stage 2
  await dame.ev('Story.ctx.spawn(Garde.P(-3, 0.05, 30), 0); 1');
  await valet.ev('Story.ctx.spawn(Garde.P(3, 0.05, 30), 0); 1');
  await sleep(1500);
  const st = await both("Story.S.x.stage === 2 && Enemies.alive('pion') > 0");
  if (!st[0] || !st[1]) {
    const x = await both("JSON.stringify([Story.S.x, Enemies.alive('pion')])");
    return { covered, ok: false, notes: `wave 1 not on both screens: ${JSON.stringify(x)}` };
  }
  covered.push('both in the hall: wave 1, stage 2 (both)');

  // ---- one Pion struck down by each, with real hits (the weapon's own damage, in reach, at its
  // own pace: the host validates the guest's hits) — the host resolves, the guest sees it go
  for (const [p, k] of [[valet, 'valet'], [dame, 'dame']]) {
    const id = await A.ev("[...Enemies.list.values()].find((e) => e.type === 'pion').id");
    const hit =
      k === 'valet'
        ? `{ a: 'hit', id: ${JSON.stringify(id)}, dmg: 12, stun: (Enemies.TYPES.pion.stunP != null ? Enemies.TYPES.pion.stunP : 2.5) }`
        : `{ a: 'hit', id: ${JSON.stringify(id)}, dmg: 9 }`;
    for (let i = 0; i < 14; i++) {
      const gone = await A.ev(`!Enemies.list.has(${JSON.stringify(id)})`);
      if (gone) break;
      // stand next to the Pion (as a player would), then strike
      await p.ev(`(() => { const e = Enemies.list.get(${JSON.stringify(id)}); if (e) Player.body.p.set(e.pos.x + 1.6, e.pos.y + 0.05, e.pos.z); return 1; })()`);
      await sleep(250);
      await p.ev(`Story.ctx.act(${hit}); 1`);
      await sleep(k === 'valet' ? 700 : 200);
    }
    await sleep(900);
    const g = await both(`!Enemies.list.has(${JSON.stringify(id)})`);
    if (!g[0] || !g[1]) return { covered, ok: false, notes: `${k} hit: Pion ${id} still there: ${JSON.stringify(g)}` };
    covered.push(`${k} hit, Pion down (${who(p)})`);
  }
  return { covered, ok: true };
};
