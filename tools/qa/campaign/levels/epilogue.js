// epilogue « Le vrai Joker » (the roof bench, again): both sit on the bench (E), the Joker speaks,
// the heart fills, they float up; the host rolls the credits.
window.CL = {
  timeout: 240,
  async run() {
    const dame = Story.role === 'dame';
    const b = City.roofBench;
    await B.sl(1500);
    await B.go(V3(b.pos.x + (dame ? -0.5 : 0.5), b.pos.y, b.pos.z + 1.4), { near: 0.6, ms: 30000 });
    for (let i = 0; i < 6 && Player.mode !== 'sit'; i++) {
      await B.tap('interact');
      await B.sl(400);
    }
    B.note('reelle', Player.mode === 'sit' ? 'assis sur le banc du toit (E)' : 'PAS assis ' + B.where().join(','));
    const s1 = await B.until(() => Story.S.phase !== 'epilogue' || Story.S.x.step >= 1, 30000);
    B.note('attente', s1 ? 'le Joker parle (étape 1)' : 'pas d’étape 1');
    await B.until(() => Story.S.phase !== 'epilogue' || CL.abort, 120000, 500);
    return 'sat, step ' + (Story.S.x.step ?? '-') + ', phase ' + Story.S.phase;
  },
};
