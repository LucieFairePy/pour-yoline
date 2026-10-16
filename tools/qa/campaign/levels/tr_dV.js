// tr_dV · Le Valet de Carreau (Salle des Facettes, js/world/cour_d.js area A). Kits swapped.
// Stage 1: both walk the quay and the bridge into the hall. Stage 2: three rounds; each round six
// gems on six pedestals, the dame kit sees their colours + a colour clue, the valet kit their cuts
// + a cut clue; the picker (valet, dame, valet) walks to the one pedestal fitting both clues and
// presses E (the level's update() sends {a:'take', i, n}). Stage 3: both by the card (0, 30).
// The answer is worked out from the two halves the players are shown (each half is on one
// screen, told aloud to the other) — never from deal.t.
(() => {
  const W = CourD;
  B.W = W;
  const X = () => Story.S.x;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_dV';
  const PICKER = ['valet', 'dame', 'valet'];
  const fits = (cl, g) => {
    const v = cl.t === 'c' ? g.c : g.k;
    return cl.neg ? !cl.v.includes(v) : cl.v.includes(v);
  };
  // 1.25 m in front of pedestal i, on the middle's side (nearPed wants < 1.9 m)
  const standAt = (i) => {
    const p = W.PEDS[i];
    const dx = W.A.x - p.x;
    const dz = W.A.z - p.z;
    const d = Math.hypot(dx, dz);
    return [p.x + (dx / d) * 1.25, 0, p.z + (dz / d) * 1.25];
  };
  const side = () => (Story.role === 'dame' ? -1.5 : 1.5);

  window.CL = {
    timeout: 900,
    async run() {
      const me = Story.role;
      // ---- stage 1: quay → bridge → the hall ----
      if (X().stage === 1) {
        await B.walk([side(), 0, 10], 0.5, 15000);
        await B.walk([side(), 0, 21], 0.5, 15000);
        B.note('reelle', 'pont traversé, dans la Salle des Facettes');
        await B.until(() => !live() || X().stage >= 2, 60000);
      }
      // ---- stage 2: the three gems ----
      let took = 0;
      let wrong = 0;
      while (live() && X().stage === 2) {
        const x = X();
        const dl = x.deal;
        const picker = PICKER[Math.min(2, (x.round || 1) - 1)];
        if (!dl || (x.res && x.res.dn === dl.n) || picker !== me) {
          await B.sl(300);
          continue;
        }
        // the colour half (dame screen) and the cut half (valet screen), put together aloud
        const cand = dl.gems.map((g, i) => (fits(dl.cc, g) && fits(dl.ck, g) ? i : -1)).filter((i) => i >= 0);
        if (cand.length !== 1) {
          B.note('reelle', 'donne ' + dl.n + ' : ' + cand.length + ' socles possibles ?!');
          await B.sl(1000);
          continue;
        }
        const i = cand[0];
        B.note('reelle', 'manche ' + x.round + ' : indices croisés (couleur vue par la dame, taille par le valet) → socle ' + W.ROMAN[i]);
        await B.go(standAt(i), { near: 0.4, ms: 25000 });
        B.face([W.PEDS[i].x, 1.6, W.PEDS[i].z]);
        await B.sl(250);
        const n0 = x.res ? x.res.n : 0;
        await B.tap('interact');
        const ok = await B.until(() => !live() || (X().res && X().res.n !== n0), 5000);
        if (!ok) {
          B.note('reelle', 'E au socle ' + W.ROMAN[i] + ' sans réponse, on recommence');
          continue;
        }
        if (!live()) break;
        if (X().res.ok) took++;
        else wrong++;
        B.note('reelle', 'gemme ' + W.ROMAN[i] + ' prise : ' + (X().res.ok ? 'bonne' : 'mauvaise'));
        // step back toward the middle, out of the way
        await B.go([side(), 0, 26], { near: 0.8, ms: 15000 });
      }
      if (!live()) return me + ': ' + took + ' gemmes';
      // ---- stage 3: the card in the middle ----
      await B.go([side() * 0.8, 0, 29], { near: 0.6, ms: 25000 });
      B.note('reelle', 'près de la carte');
      await B.until(() => !live(), 60000, 200);
      return me + ': ' + took + ' gemmes, ' + wrong + ' erreurs';
    },
  };
})();
