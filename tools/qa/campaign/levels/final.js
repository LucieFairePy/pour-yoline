// final « Le Oui »: both walk into the glowing circle (the Joker breaks), the reveal plays, the
// letter opens on each screen and is closed by its button (the runner presses Enter once the
// button shows: a real key), then the visa and the epilogue.
window.CL = {
  timeout: 400,
  async run() {
    const dame = Story.role === 'dame';
    B.W = Finale;
    await B.sl(1500);
    const ok = await B.go(Finale.P(dame ? -1.6 : 1.6, 0, -1.2), { near: 0.5, ms: 30000 });
    B.note('reelle', `marche dans le cercle (${ok ? 'dedans' : 'pas arrivé'}, inRing ${Finale.inRing(Player.body.p)})`);
    const br = await B.until(() => Story.S.phase !== 'final' || Story.S.x.step !== 'joker', 20000);
    B.note('reelle', br ? 'les deux dans le cercle : le Joker se brise' : 'le Joker ne se brise pas');
    const le = await B.until(() => Story.S.phase !== 'final' || Story.S.x.step === 'letter', 90000);
    B.note('attente', le ? 'la lettre s’ouvre' : 'pas de lettre');
    await B.until(() => Story.S.phase !== 'final' || CL.abort, 300000, 500);
    return 'ring ' + ok + ', phase ' + Story.S.phase;
  },
};
