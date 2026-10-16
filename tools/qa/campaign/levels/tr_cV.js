// tr_cV · Le Valet de Trèfle: the tug of war. Each player walks to the grip circle of their kit,
// then presses E (the level's update() sends {a:'pull'}) on every real drum stroke, letting the
// red feints pass. Three rounds; the drum is seen by both, then only by the dame kit, then only
// by the valet kit. The one who sees it reacts to the stroke it sees; the blind one, in a real game,
// pulls on the partner's spoken call: here it reads the same stroke list (labelled raccourci).
// Then both walk to the card (rel 0, 17).
window.CL = {
  timeout: 600,
  async run() {
    const W = CourC;
    B.W = W;
    const me = Story.role;
    const L = W.dbgV.local;
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_cV';
    const g = W.VA.grip[me];
    // spawn (±2.4, 4) → grip (±2.4, 13): a straight flat walk
    await B.walk([g[0], 0, g[1]], 0.35, 15000);
    B.stop();
    B.face([0, 1.6, 33]);
    B.note('reelle', 'à ma corde (' + me + ') ' + JSON.stringify(B.rel()));
    let lastRound = -1;
    let pulls = 0;
    const blindNoted = {};
    while (live() && X().stage === 0) {
      const x = X();
      // pushed off the grip (fall, respawn): back to it
      if (!W.atGrip(me, Player.body.p)) {
        await B.walk([g[0], 0, g[1]], 0.35, 8000);
        B.face([0, 1.6, 33]);
        continue;
      }
      if (!x.on) {
        await B.sl(80);
        continue;
      }
      if (x.round !== lastRound) {
        lastRound = x.round;
        B.note('reelle', 'manche ' + (x.round + 1) + ' (roll ' + (x.roll | 0) + '), tambour ' + (W.dbgV.ROUNDS[x.round].see.includes(me) ? 'visible' : 'caché'));
      }
      const sees = W.dbgV.ROUNDS[x.round].see.includes(me);
      if (!sees && !blindNoted[x.round + '|' + x.roll]) {
        blindNoted[x.round + '|' + x.roll] = 1;
        B.note('raccourci', 'manche ' + (x.round + 1) + ' : le tambour est caché sur cet écran, le partenaire donne le rythme à voix haute ; le bot lit la liste des coups (W.dbgV.beats) au lieu d’entendre sa voix');
      }
      const key = L.key;
      const list = W.dbgV.beats();
      const b = list && list.find((q) => q.t > L.rt - 0.05);
      if (!b) {
        await B.sl(60);
        continue;
      }
      // wait for the stroke (seen on the drum, or called aloud), then react
      while (live() && L.key === key && L.rt < b.t + 0.05) await B.sl(6);
      if (L.key !== key) continue;
      if (b.f) {
        // a red feint: let it pass
        while (live() && L.key === key && L.rt < b.t + 0.3) await B.sl(10);
        continue;
      }
      await B.tap('interact', 70);
      pulls++;
      while (live() && L.key === key && L.rt < b.t + 0.45) await B.sl(10);
    }
    if (!live()) return me + ': interrompu, ' + JSON.stringify(X());
    B.note('reelle', 'trois manches gagnées, ' + pulls + ' tirages');
    // the card comes down between the ropes (rel 0, 1.8, 17): both within 3 m
    await B.walk([me === 'dame' ? -0.8 : 0.8, 0, 17], 0.4, 15000);
    B.note('reelle', 'devant la carte ' + JSON.stringify(B.rel()));
    await B.until(() => !live(), 60000, 200);
    return me + ': ' + pulls + ' tirages, phase ' + (Story.S && Story.S.phase);
  },
};
