// ♦ Les Portes (portes) — solver. Kits swapped by the plan (Yoline carries 'valet'); everything
// keys on Story.role: 'dame' shoots the two portals (attack = blue 'a', ability = orange 'b',
// camera aimed at the panel), 'valet' is the one the portals carry.
//  1 button behind the glass: a on p1, b on p2, valet walks into p1 and presses b1 in the cage
//  2 fast in, fast out: a on the floor p4, b on the wall p3; valet drops from the ledge into p4,
//    is flung across the void and presses b2 (the bridge lights for the dame)
//  3 two buttons: a on p6, b on p5 (cage); valet goes through to b3a, dame climbs to b3b
//  4 both to the card
window.CL = {
  timeout: 600,
  async run() {
    const PH = 'portes';
    const W = Portes;
    B.W = W;
    const S = Input.sim;
    const x = () => Story.S.x;
    const dame = Story.role === 'dame';
    const live = () => !CL.abort && Story.S && Story.S.phase === PH;
    const wait = async (fn, ms = 20000) => {
      await B.until(() => !live() || fn(), ms);
      try {
        return live() && !!fn();
      } catch (e) {
        return false;
      }
    };
    const pan = (k) => x().portals && x().portals[k] && x().portals[k].panel;
    const log = [];
    // shoot a portal on a panel: the camera turned to the point, then the button
    const shoot = async (which, panel, pt) => {
      if (pan(which) === panel) return panel;
      for (let i = 0; i < 25 && live(); i++) {
        for (let k = 0; k < 8; k++) {
          B.aim(pt);
          await B.sl(120);
        }
        await B.tap(which === 'a' ? 'attack' : 'ability');
        await B.sl(300);
        if (pan(which) === panel) {
          B.note('reelle', 'portail ' + which + ' tiré sur ' + panel);
          return panel;
        }
      }
      return 'raté ' + panel + ' (' + pan(which) + ')';
    };

    const st1 = async () => {
      if (dame) {
        await B.walk([-4, 0, 8], 0.5, 8000);
        const a = await shoot('a', 'p1', [-5.5, 1.6, 14]);
        await B.walk([0, 0, 20], 0.5, 8000);
        const b = await shoot('b', 'p2', [10, 1.6, 20]);
        await B.walk([-2, 0, 8], 0.5, 8000);
        return (await wait(() => x().stage >= 2, 40000)) ? 'st1 ok ' + a + b : 'st1 attente ' + a + b;
      }
      if (!(await wait(() => pan('a') === 'p1' && pan('b') === 'p2', 60000))) return 'portails p1/p2 absents';
      await B.sl(800);
      await B.walk([-5.5, 0, 12], 0.4, 8000);
      await B.walk([-5.5, 0, 14.5], 0.2, 4000);
      await B.sl(600);
      await B.walk([7, 0, 20], 0.5, 5000);
      B.note('reelle', 'passé par le portail p1 → p2, bouton b1 ' + JSON.stringify(B.rel()));
      return (await wait(() => x().stage >= 2, 10000)) ? 'st1 ok' : 'st1 bloqué ' + B.rel();
    };

    const throughDoor = async () => {
      if (B.rel()[2] < 26.3) {
        await B.walk([2, 0, 25.2], 0.5, 10000);
        await B.walk([6, 0, 25.2], 0.5, 6000);
        await B.walk([6, 0, 28.5], 0.5, 6000);
      }
    };

    const st2 = async () => {
      await B.sl(1500);
      await throughDoor();
      if (dame) {
        await B.walk([2, 0, 31], 0.5, 8000);
        const a = await shoot('a', 'p4', [-0.5, 0.02, 34.6]);
        await B.walk([5, 0, 36], 0.5, 6000);
        await B.walk([5, 0, 41.2], 0.4, 6000);
        await B.walk([2.5, 0, 41.4], 0.4, 6000);
        Cam.yaw = Math.PI;
        Cam.pitch = 0.2;
        await B.sl(600);
        const b = await shoot('b', 'p3', [2, 3, 39.32]);
        if (!(await wait(() => x().bridge, 90000))) return 'pas de pont ' + a + b + ' ' + B.rel();
        B.note('reelle', 'le pont est allumé, traversée');
        await B.sl(500);
        await B.walk([6, 0, 40.4], 0.4, 6000);
        await B.leap([6, 1.2, 41.6], { ms: 1500, dj: false });
        await B.leap([6, 2, 44], { ms: 1500, dj: false });
        await B.walk([-2, 2, 64], 0.6, 15000, true);
        return (await wait(() => x().stage >= 3, 8000)) ? 'st2 ok' : 'st2 attente ' + B.rel();
      }
      if (!(await wait(() => pan('a') === 'p4' && pan('b') === 'p3', 60000))) return 'portails p4/p3 absents';
      for (const p of [[-8.5, 0, 27.5], [-8.5, 4.6, 37.6], [-6.3, 4.6, 38.6], [-5.7, 9.2, 28.6], [-0.5, 9.24, 29.0]])
        await B.walk(p, 0.4, 12000);
      const top = B.rel();
      await B.walk([-0.5, 0, 33], 0.3, 1200);
      S.z = 1;
      Cam.yaw = 0;
      await wait(() => Player.body.grounded && W.rel(Player.body.p).z > 44, 6000);
      S.z = 0;
      const land = B.rel();
      B.note('reelle', 'saut du rebord dans p4, éjecté par p3 au-dessus du vide (haut ' + top + ', posé ' + land + ')');
      if (land[2] < 44) return 'vol raté ' + land;
      await B.walk([-4, 2, 58], 0.5, 8000);
      return (await wait(() => x().stage >= 3, 10000)) ? 'st2 ok' : 'st2 bloqué ' + B.rel();
    };

    const st3 = async () => {
      await B.sl(1500);
      if (dame) {
        await B.walk([5, 2, 78], 0.5, 10000);
        const a = await shoot('a', 'p6', [9, 3.6, 72.0]);
        await B.walk([-6, 2, 86], 0.5, 10000);
        const b = await shoot('b', 'p5', [-14.78, 3.6, 88]);
        await B.walk([9, 2, 79], 0.5, 10000);
        for (const p of [[9, 3.25, 82], [12, 4.65, 86], [9, 6.25, 90], [9, 7.2, 94]]) await B.leap(p, { ms: 2000 });
        await B.walk([9, 7.2, 95], 0.3, 4000);
        B.note('reelle', 'grimpé jusqu’au bouton b3b ' + JSON.stringify(B.rel()));
        if (B.rel()[1] < 6.5) return 'chute pendant la montée ' + B.rel();
        return (await wait(() => x().stage >= 4, 40000)) ? 'st3 ok ' + a + b : 'st3 attente ' + B.rel();
      }
      if (!(await wait(() => pan('a') === 'p6' && pan('b') === 'p5', 60000))) return 'portails p6/p5 absents';
      await B.walk([3, 2, 75], 0.4, 8000);
      await B.walk([9, 2, 74], 0.4, 8000);
      await B.walk([9, 2, 71.5], 0.2, 3000);
      await B.sl(500);
      B.stop();
      await B.sl(800);
      await B.walk([-12, 2, 88], 0.3, 5000);
      B.note('reelle', 'passé par p6 → p5, sur le bouton b3a ' + JSON.stringify(B.rel()));
      return (await wait(() => x().stage >= 4, 40000)) ? 'st3 ok' : 'st3 attente ' + B.rel();
    };

    const st4 = async () => {
      await B.sl(1000);
      await B.walk([dame ? -1 : 1, 2, 99], 0.6, 20000);
      B.note('reelle', 'à la carte');
      await wait(() => false, 10000);
      return live() ? 'pas fini ' + B.rel() : 'won';
    };

    const ST = { 1: st1, 2: st2, 3: st3, 4: st4 };
    let last = null;
    let same = 0;
    while (live()) {
      const st = x().stage;
      if (st === last && ++same > 3) {
        log.push('bloqué à l’étape ' + st);
        break;
      }
      if (st !== last) same = 0;
      last = st;
      const r = await ST[st]();
      log.push(r);
      B.stop();
      S.held.clear();
      if (live() && x().stage === st) await wait(() => x().stage !== st, 8000);
    }
    return Story.role + ': ' + log.join(' / ');
  },
};
