// tr_h10 « Le Marché »: the world is unloaded in the city and built again on entry (same
// fingerprint on both pages), then one action per role through the level's own rules:
// the dame walks into the Joker's door (took1, stage 1), the valet takes the key on the terrace
// (key, stage 4: the seals fall back to 0 and the key vanishes on both screens).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const FP = 'JSON.stringify([H10.root.children.length, H10.lights.length, Object.keys(H10.mats).length, H10.boothPos.length])';
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  // ---- unload in the city, rebuild on entry ----
  await go('city');
  await go('tr_h10');
  await sleep(800);
  for (const p of [A, B]) {
    const r = JSON.parse(await p.ev("JSON.stringify({ un: Life.log.some((r) => r.world === 'tr_h10'), built: H10.built })"));
    if (!r.un || !r.built) return { covered, ok: false, notes: `${who(p)}: unloaded ${r.un}, built again ${r.built}` };
  }
  const fp1 = [await A.ev(FP), await B.ev(FP)];
  if (fp1[0] !== fp0[0] || fp1[1] !== fp0[1]) return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city and rebuilt, same fingerprint on both pages ${fp1[0]}`);

  const x = (p) => p.ev('JSON.stringify(Story.S.x)').then(JSON.parse);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;

  // ---- dame: through the Joker's door (stage 1) ----
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.cp = '1'; s.x.non1 = 0; s.x.took1 = 0; }); 1");
  await sleep(800);
  await dame.ev("Story.ctx.act({ a: 'took1' }); 1");
  await sleep(1000);
  for (const p of [A, B]) {
    const s = await x(p);
    const portal = await p.ev('H10.ST.portal');
    if (s.took1 !== 1 || portal !== 1) return { covered, ok: false, notes: `${who(p)}: took1 ${s.took1}, portal ${portal} after the door` };
  }
  covered.push(`door taken (took1) by ${who(dame)} as dame: counted on both pages`);

  // ---- valet: the key on the terrace (stage 4) ----
  await A.ev("Story.ctx.set((s) => { s.x.stage = 4; s.x.cp = 'terrace'; s.x.done4 = 0; s.x.seals = 2; s.x.ask4 = null; s.x.key4 = 0; }); 1");
  await sleep(800);
  await valet.ev('(() => { const k = H10.KEY4; Story.ctx.spawn(H10.P(k[0] + 1.4, H10.Y4 + 0.2, k[1]), 0); return 1; })()');
  await sleep(1300);
  const keyOn = [await A.ev('H10.ST.key'), await B.ev('H10.ST.key')];
  await valet.ev("Story.ctx.act({ a: 'key' }); 1");
  await sleep(900);
  for (const p of [A, B]) {
    const s = await x(p);
    const key = await p.ev('H10.ST.key');
    if (s.key4 !== 1 || s.seals !== 0 || key !== 0)
      return { covered, ok: false, notes: `${who(p)}: key4 ${s.key4}, seals ${s.seals}, world key ${key} (before ${JSON.stringify(keyOn)})` };
  }
  covered.push(`key taken by ${who(valet)} as valet: seals back to 0, key gone on both pages`);
  return { covered, ok: true };
};
