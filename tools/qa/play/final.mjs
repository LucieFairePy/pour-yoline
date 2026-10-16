// final « Le Oui »: the world (Finale) is unloaded in the city and built again on entry (same
// fingerprint on both pages); each player closes the letter (letter, recorded per role), then
// both stand in the glowing circle together: the Joker breaks on both screens. The step is put
// back to 'joker' at the end so the finale does not run on to the epilogue.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const FP = 'JSON.stringify([Finale.built, !!Finale.screen, Finale.screen ? Finale.screen.mesh.parent.children.length : 0])';
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  // ---- unload in the city, rebuild on entry ----
  await go('city');
  await go('final');
  await sleep(800);
  for (const p of [A, B]) {
    const r = JSON.parse(await p.ev("JSON.stringify({ un: Life.log.some((r) => r.world === 'final'), built: Finale.built })"));
    if (!r.un || !r.built) return { covered, ok: false, notes: `${who(p)}: unloaded ${r.un}, built again ${r.built}` };
  }
  const fp1 = [await A.ev(FP), await B.ev(FP)];
  if (fp1[0] !== fp0[0] || fp1[1] !== fp0[1]) return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city and rebuilt, same fingerprint on both pages ${fp1[0]}`);

  const x = (p) => p.ev('JSON.stringify(Story.S.x)').then(JSON.parse);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const out = 'Story.ctx.spawn(Finale.spawn(Story.role), 0); 1';
  await A.ev(out);
  await B.ev(out);
  await A.ev("Story.ctx.set((s) => { s.x.step = 'joker'; s.x.done = []; }); 1");
  await sleep(900);

  // ---- the letter, each role ----
  await dame.ev("Story.ctx.act({ a: 'letter' }); 1");
  await valet.ev("Story.ctx.act({ a: 'letter' }); 1");
  await sleep(900);
  for (const p of [A, B]) {
    const s = await x(p);
    if (!(s.done.includes('dame') && s.done.includes('valet'))) return { covered, ok: false, notes: `${who(p)}: done ${JSON.stringify(s.done)}` };
  }
  covered.push(`letter closed by ${who(dame)} as dame and ${who(valet)} as valet: both recorded`);
  await A.ev("Story.ctx.set((s) => { s.x.done = []; }); 1");

  // ---- both in the circle: the Joker breaks ----
  const hid = 'Finale.screen.mesh.parent.children.filter((o) => o.isMesh && !o.visible).length';
  await dame.ev('Story.ctx.spawn(Finale.P(-1, 0.1, 0), 0); 1');
  await valet.ev('Story.ctx.spawn(Finale.P(1, 0.1, 0), 0); 1');
  await sleep(1800);
  let res = null;
  for (const p of [A, B]) {
    const s = await x(p);
    const h = await p.ev(hid);
    const inRing = await p.ev('Finale.inRing(Player.body.p)');
    if (!res && (s.step !== 'broken' || h !== 1 || !inRing)) res = { covered, ok: false, notes: `${who(p)}: step ${s.step}, hidden meshes ${h}, in ring ${inRing}` };
  }
  // back out of the circle, and back to the first step (no run on to the epilogue)
  await A.ev(out);
  await B.ev(out);
  await A.ev("Story.ctx.set((s) => { s.x.step = 'joker'; s.x.done = []; }); 1");
  if (res) return res;
  covered.push('both in the circle: step broken, Joker hidden on both pages');
  return { covered, ok: true };
};
