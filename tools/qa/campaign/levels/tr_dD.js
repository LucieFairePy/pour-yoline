// tr_dD · La Dame de Carreau (Galerie des Prismes, js/world/cour_d.js area B). Kits as usual.
// Two rounds; the guide (round 1: dame kit, round 2: valet kit) sees the beam and the target
// crystal, the hands (the other kit) turn the mirrors (E near a mirror: turn → lower → raise,
// the level's update() sends {a:'turn', i, pn}) and pull the lever (E: {a:'valid', pn}).
// The hands' page works out the presses from what the guide's screen shows (the beam traced
// through the shared mirrors, the golden target crystal) — the guide would say it aloud. It
// re-solves after every press, since the Dame flips a mirror herself every ~30 s.
(() => {
  const W = CourD;
  B.W = W;
  const X = () => Story.S.x;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_dD';
  const guideOf = (x) => ((x.round || 1) === 1 ? 'dame' : 'valet');
  const st = (m) => (m.low ? 2 : m.a);
  const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
  // the cheapest presses (0..2 per mirror) that send the beam to the target crystal
  const solve = (pz) => {
    const tc = pz.cry.find((c) => c.target);
    if (!tc) return null;
    const n = pz.mir.length;
    let best = null;
    for (let k = 0; k < Math.pow(3, n); k++) {
      let v = k;
      const mir = pz.mir.map((m) => {
        const s = v % 3;
        v = Math.floor(v / 3);
        return { c: m.c, r: m.r, a: s === 2 ? 0 : s, low: s === 2 ? 1 : 0, s };
      });
      const tr = W.trace(pz.src, mir);
      if (!same(tr.exit, tc.slot)) continue;
      const presses = mir.map((m, i) => (m.s - st(pz.mir[i]) + 3) % 3);
      const cost = presses.reduce((a, b) => a + b, 0);
      if (!best || cost < best.cost) best = { cost, presses };
    }
    return best;
  };
  const side = () => (Story.role === 'dame' ? -1.2 : 1.2);

  const hands = async () => {
    let pulls = 0;
    let presses = 0;
    let noted = 0;
    while (live() && X().stage === 2 && guideOf(X()) !== Story.role) {
      const pz = X().puz;
      if (!pz) {
        await B.sl(300);
        continue;
      }
      const b = solve(pz);
      if (!b) {
        B.note('reelle', 'donne ' + pz.n + ' : pas de solution trouvée');
        await B.sl(1500);
        continue;
      }
      if (noted !== pz.n) {
        noted = pz.n;
        B.note('reelle', 'manche ' + X().round + ' (donne ' + pz.n + ') : le guide voit le rayon et le cristal doré → ' + b.cost + ' pressions');
      }
      const i = b.presses.findIndex((p) => p > 0);
      if (i >= 0) {
        const m = pz.mir[i];
        await B.go([W.cellX(m.c) + 1.3, 0, W.cellZ(m.r) - 0.2], { near: 0.35, ms: 25000 });
        B.face([W.cellX(m.c), 1.3, W.cellZ(m.r)]);
        const before = JSON.stringify(X().puz.mir[i]);
        await B.tap('interact');
        await B.until(() => !live() || !X().puz || JSON.stringify(X().puz.mir[i]) !== before, 2500, 50);
        presses++;
        await B.sl(150);
        continue;
      }
      // the beam reaches the target: pull the lever
      await B.go([W.LEVER_B[0], 0, W.LEVER_B[1] + 1.3], { near: 0.35, ms: 25000 });
      B.face([W.LEVER_B[0], 1.2, W.LEVER_B[1]]);
      // the Dame may have flipped one on the way
      const b2 = solve(X().puz);
      if (!b2 || b2.cost > 0) continue;
      const n0 = X().res ? X().res.n : 0;
      await B.tap('interact');
      await B.until(() => !live() || (X().res && X().res.n !== n0), 4000);
      pulls++;
      if (live() && X().res) B.note('reelle', 'levier tiré : ' + (X().res.ok ? 'bon cristal' : 'mauvais (' + X().res.end + ')'));
      await B.sl(500);
    }
    return { pulls, presses };
  };

  window.CL = {
    timeout: 900,
    async run() {
      const me = Story.role;
      // ---- stage 1: corridor → the gallery (both inside starts it) ----
      await B.walk([side(), 0, 55], 0.5, 15000);
      B.note('reelle', 'dans la Galerie des Prismes');
      await B.until(() => !live() || X().stage >= 2, 60000);
      let pulls = 0;
      let presses = 0;
      while (live() && X().stage === 2) {
        if (guideOf(X()) === me) {
          // the guide watches (the beam is drawn on this screen only); out of the way by the lever wall
          await B.go([me === 'dame' ? 3 : -3, 0, 56], { near: 0.8, ms: 15000 });
          await B.until(() => !live() || X().stage !== 2 || guideOf(X()) !== me, 600000, 300);
        } else {
          const r = await hands();
          pulls += r.pulls;
          presses += r.presses;
        }
      }
      if (!live()) return me + ': leviers ' + pulls + ', pressions ' + presses;
      // ---- stage 3: the card over the grid ----
      await B.go([side(), 0, 68], { near: 1.0, ms: 30000 });
      B.note('reelle', 'près de la carte');
      await B.until(() => !live(), 60000, 200);
      return me + ': leviers ' + pulls + ', pressions ' + presses;
    },
  };
})();
