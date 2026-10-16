// ♠ Premiers pas (tr_s1) — solver. Kits may be swapped by the plan: everything keys on Story.role
// ('dame' = grapple kit, 'valet' = the other). Real keys only (stick, E, F, jump).
//  1 twin slabs: relay on the plates, one slab each
//  2 drawbridge: dame grapples the ring and holds the lever, valet holds the winch (both E held)
//  3 card-block: valet carries the block under the notch (dame "sees" it), both climb
//  4 the wave: crumbling slabs, double gate plates, altar plates
window.CL = {
  timeout: 600,
  async run() {
    const PH = 'tr_s1';
    const W = TrS1;
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
    const on = (g) => (x().on || []).includes(g);
    const log = [];

    const st1 = async () => {
      const steps = dame
        ? [['gL1', 26.8], ['gL2', 43.8], ['gL3', 60.5]]
        : [['gR1', 26.8], ['gR2', 43.8], ['gR3', 62]];
      const lx = dame ? -4.6 : 4.6;
      // valet starts on its first plate (it lights the dame's first slab)
      if (!dame) await B.walk([lx, 0, 9.7], 0.5, 10000);
      for (const [g, z] of steps) {
        if (!(await wait(() => on(g), 45000))) return 'dalle ' + g + ' jamais allumée';
        await B.sl(300);
        if (!(await B.walk([lx, 0, z], 0.5, 15000, true))) return 'pas arrivé au bout de ' + g + ' ' + B.rel();
      }
      await B.walk([dame ? -2 : 2, 0, 64], 0.6, 8000);
      B.note('reelle', 'dalles jumelles traversées en relais (plaques)');
      return (await wait(() => x().stage >= 2, 30000)) ? 'st1 ok' : 'st1 attente ' + B.rel();
    };

    const st2 = async () => {
      if (dame) {
        await B.walk([0, 0, 66], 0.5, 8000);
        let ok = false;
        for (let i = 0; i < 40 && !ok && live(); i++) {
          B.aim(W.ringA());
          await B.sl(100);
          if (Player.lockTarget >= 0) {
            await B.tap('ability');
            ok = true;
          }
        }
        if (!ok) return 'anneau du gouffre non verrouillé';
        await wait(() => Player.mode === 'walk' && Player.body.grounded && W.rel(Player.body.p).z > 86, 8000);
        B.note('reelle', 'grappin sur l’anneau du gouffre ' + JSON.stringify(B.rel()));
        await B.walk([5.5, 0, 88.3], 0.5, 8000);
        B.face([5.5, 0, 89.5]);
        S.held.add('interact');
        const r = await wait(() => x().bridge, 60000);
        S.held.delete('interact');
        if (!r) return 'pont non baissé (treuil ' + x().winch + ', levier ' + x().leverHold + ') ' + B.rel();
        B.note('reelle', 'levier tenu (E) pendant que le partenaire tient le treuil : pont baissé');
        await B.walk([-2.5, 0, 92], 0.6, 8000);
      } else {
        await B.walk([-5.5, 0, 67.3], 0.5, 10000);
        B.face([-5.5, 0, 68.4]);
        S.held.add('interact');
        const r = await wait(() => x().bridge, 90000);
        S.held.delete('interact');
        if (!r) return 'pont non baissé (côté treuil)';
        B.note('reelle', 'treuil tenu (E) : pont baissé');
        await B.sl(1500);
        await B.walk([0, 0, 72], 0.6, 6000);
        await B.walk([2.5, 0, 92], 0.6, 12000, true);
      }
      return (await wait(() => x().stage >= 3, 15000)) ? 'st2 ok' : 'st2 attente ' + B.rel();
    };

    const climb = async () => {
      await B.walk([3.4, 0, 96.8], 0.4, 8000);
      let r = await B.leap([3.4, 1.6, 99.2], { ms: 1500, dj: false });
      if (r[1] < 1.5) r = await B.leap([3.4, 1.6, 99.2], { ms: 1500 });
      const r2 = await B.leap([3.4, 4, 104], { ms: 2500 });
      await B.walk([dame ? 1 : 5, 4, 106], 0.5, 4000);
      return [r, r2, B.rel()];
    };

    const st3 = async () => {
      if (!dame) {
        if (!x().block.c && !W.blockOk(x().block.p)) {
          const q = W.rel(W.blockPos());
          await B.walk([q.x, 0, q.z - 1.3], 0.6, 10000);
          B.face(W.blockPos());
          await B.tap('interact');
          if (!(await wait(() => x().block.c === 'valet', 3000))) return 'carte-bloc pas prise';
          B.note('reelle', 'carte-bloc portée (E)');
        }
        if (x().block.c === 'valet') {
          // set down where the guide says: under the notch, against the wall
          await B.walk([3.4, 0, 96.6], 0.3, 8000);
          await B.walk([3.4, 0, 98.2], 0.15, 3000);
          await B.sl(400);
          Cam.yaw = 0;
          Player.yaw = 0; // face the wall (the player turns toward it before dropping)
          await B.sl(80);
          await B.tap('interact');
          await wait(() => !x().block.c, 3000);
          B.note('reelle', 'carte-bloc posée sous l’encoche (guidé) ' + JSON.stringify(x().block.p) + (W.blockOk(x().block.p) ? ' bonne place' : ' MAUVAISE place'));
        }
        if (!W.blockOk(x().block.p)) return 'bloc mal posé ' + JSON.stringify(x().block.p);
        await B.sl(800);
        const c = await climb();
        B.note('reelle', 'mur escaladé par le bloc ' + JSON.stringify(c));
        return (await wait(() => x().stage >= 4, 30000)) ? 'st3 ok' : 'st3 attente ' + JSON.stringify(c);
      }
      if (!(await wait(() => !x().block.c && W.blockOk(x().block.p), 60000))) return 'bloc pas encore bien posé';
      await B.sl(4500);
      const c = await climb();
      B.note('reelle', 'mur escaladé par le bloc ' + JSON.stringify(c));
      return (await wait(() => x().stage >= 4, 15000)) ? 'st3 ok' : 'st3 attente ' + JSON.stringify(c);
    };

    const st4 = async () => {
      const L = [];
      let ok = false;
      for (let tries = 0; tries < 5 && !ok && live(); tries++) {
        await wait(() => !x().wrun, 5000);
        await B.walk([dame ? -0.6 : 0.6, 4, 110.8], 0.5, 5000);
        await wait(() => x().wrun, 8000);
        ok = true;
        for (const t of W.TILES) {
          const r = await B.leap([t[0], t[1], t[2]], { ms: 2200 });
          L.push(r.join(',') + '@' + x().wz);
          if (r[1] < t[1] - 0.3 || r[2] < t[2] - 3) {
            ok = false;
            L.push('RESET');
            break;
          }
        }
        if (!ok) B.note('reelle', 'course perdue (vague ou chute), on recommence');
      }
      if (!ok) return 'course ratée ' + L.slice(-12).join(' | ');
      B.note('reelle', 'dalles qui s’effondrent traversées');
      await B.leap([dame ? -4 : 4, 6.2, 166], { ms: 2200 });
      await B.walk([dame ? -4 : 4, 6.2, 167.5], 0.4, 5000);
      if (!(await wait(() => x().gate, 20000))) return 'grille fermée ' + B.rel();
      B.note('reelle', 'plaques de la grille tenues ensemble');
      await B.sl(1500);
      await B.walk([0, 6.2, 176], 0.6, 6000, true);
      await B.leap([0, 6.2, 179], { ms: 2000 });
      await B.walk([0, 6.2, 189], 0.6, 6000, true);
      await B.walk([dame ? -2.4 : 2.4, 6.2, 195], 0.4, 6000);
      if (!(await wait(() => x().won, 15000))) return 'autel : pas de victoire ' + B.rel();
      B.note('reelle', 'plaques de l’autel tenues : épreuve gagnée');
      await wait(() => false, 12000);
      return 'won';
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
      const fn = ST[st];
      if (!fn) {
        await B.sl(500);
        continue;
      }
      const r = await fn();
      log.push(r);
      B.stop();
      S.held.clear();
      if (live() && x().stage === st) await wait(() => x().stage !== st, 8000);
    }
    return Story.role + ': ' + log.join(' / ');
  },
};
