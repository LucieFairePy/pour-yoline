// act5 « Deux mondes » (kits swapped): the dame is in the library (OD), the valet on the parkour
// above the void (OV), the Joker's red wall chasing him through its three segments.
//  dame: light tiles (lights-out 3x3, E on a tile) → p1, the valet's first bridge
//  valet: segment A, the bridge, segment B, switch 1 (E) → s1, the dame's first door; he reads the
//         symbol sequence on his wall (only his screen shows it) and tells her
//  dame: the pedestals in that order (E) → p2, his second bridge
//  valet: segment C, switch 2 (E) → s2, her second door; both at their world's end → converge
//  converge: the dame grapples the ring (F) while the valet leaps to the heart, within 2 s → caught
window.CL = {
  timeout: 900,
  async run() {
    const dame = Story.role === 'dame';
    const x = () => Story.S.x;
    await B.until(() => Worlds.built, 20000);
    await B.sl(1500);
    const log = [];
    const OD = Worlds.OD;
    const OV = Worlds.OV;
    const D = { P: (a, b, c) => V3(OD.x + a, OD.y + b, OD.z + c), rel: Worlds.drel };
    const V = { P: (a, b, c) => V3(OV.x + a, OV.y + b, OV.z + c), rel: Worlds.vrel };
    const at = (st) => B.until(() => Story.S.phase !== 'act5' || x().stage !== 'worlds' || st(), 600000, 150);

    if (dame) {
      B.W = D;
      // ---- the tiles: find which presses light them all (lights-out), press them with E
      const NEIGH = (i) => [i, i % 3 > 0 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1, i > 2 ? i - 3 : -1, i < 6 ? i + 3 : -1].filter((k) => k >= 0);
      const L0 = x().lights.slice();
      let sol = null;
      for (let m = 0; m < 512 && !sol; m++) {
        const l = L0.slice();
        for (let i = 0; i < 9; i++) if (m & (1 << i)) NEIGH(i).forEach((k) => (l[k] = !l[k]));
        if (l.every(Boolean)) sol = [...Array(9).keys()].filter((i) => m & (1 << i));
      }
      B.note('reelle', `dalles allumées ${L0.map((v) => (v ? 1 : 0)).join('')}, appuis à faire ${JSON.stringify(sol)}`);
      for (const i of sol || []) {
        if (CL.abort) return 'aborted';
        const tx = ((i % 3) - 1) * 2.4;
        const tz = 7 + (((i / 3) | 0) - 1) * 2.4;
        await B.walk([tx, 0, tz], 0.35, 10000);
        const before = JSON.stringify(x().lights);
        await B.tap('interact');
        await B.until(() => JSON.stringify(x().lights) !== before, 3000);
      }
      const p1 = await B.until(() => x().p1, 5000);
      B.note('reelle', p1 ? 'dalles toutes allumées : le premier pont du valet apparaît' : 'dalles PAS résolues ' + JSON.stringify(x().lights));
      log.push('tiles ' + p1);
      // ---- the pedestals, once the valet's first switch opened her door
      await at(() => x().s1);
      B.note('attente', 'premier interrupteur du valet : la porte s’ouvre');
      // the sequence is on the valet's wall only: he says it (this page reads it from the state)
      const seq = x().seq.slice();
      B.note('info', `séquence ${seq.map((k) => Worlds.SYMS[k]).join(' ')} : affichée sur le mur du valet, qui la dit à voix haute (voix simulée : la page la lit dans l’état partagé)`);
      await B.sl(1500);
      for (let tries = 0; tries < 3 && !x().p2; tries++) {
        for (let n = x().input.length; n < seq.length; n++) {
          const k = seq[n];
          const px = [-4.5, -1.5, 1.5, 4.5][k];
          await B.walk([px, 0, 19.6], 0.3, 12000);
          const len = x().input.length;
          await B.tap('interact');
          await B.until(() => x().input.length !== len || x().p2, 3000);
          if (x().input.length === 0 && !x().p2) break;
        }
      }
      B.note('reelle', x().p2 ? 'socles dans l’ordre : le second pont du valet' : 'socles PAS résolus ' + JSON.stringify(x().input));
      log.push('peds ' + x().p2);
      await at(() => x().s2);
      await B.walk([0, 0, 39], 0.6, 20000);
      B.note('reelle', 'au bout de la bibliothèque ' + B.rel().join(','));
    } else {
      B.W = V;
      // ---- the parkour: platform tops [x, y, z] (world/worlds.js P_A, P_B, P_C)
      const segA = [[0, 0, 7], [2, 0.8, 11.5], [-1, 1.4, 16], ['m', 0], [2, 0.6, 27], [0, 0, 32], [0, 0, 38.5]];
      const segB = [[3, 0.9, 64.5], [-1, 1.6, 69], ['m', 1], [-1, 0.7, 80], [3, 0, 85], [0, 0, 91]];
      const segC = [[-3, 1, 118.5], ['m', 2], [4, 2.8, 129], [1, 1.8, 135], [-2, 1, 140], [0, 0, 148]];
      const mv = (k) => {
        const m = Worlds.moving[k];
        return Worlds.vrel(m.m.position.clone().add(V3(0, 0.3, 0)));
      };
      const run = async (seg, startZ, endZ) => {
        for (let attempt = 0; attempt < 8; attempt++) {
          if (CL.abort) return false;
          await B.walk([0, 0, startZ], 0.5, 20000);
          await B.sl(600);
          let fell = false;
          for (const s of seg) {
            let tgt;
            if (s[0] === 'm') {
              // wait for the moving slab to swing near us, then jump onto it
              const me = B.rel();
              await B.until(() => {
                const q = mv(s[1]);
                return Math.hypot(q.x - me[0], q.z - me[2]) < 4.6;
              }, 6000, 30);
              const q = mv(s[1]);
              tgt = [q.x, q.y, q.z];
            } else tgt = s;
            const r = await B.leap(tgt, { ms: 2500 });
            if (r[1] < tgt[1] - 0.6 || Math.abs(r[2] - tgt[2]) > 2.5) {
              fell = true;
              B.note('reelle', `saut raté vers ${tgt.map((v) => +(+v).toFixed(1))} (arrivé ${r}) : retour au point de contrôle`);
              break;
            }
          }
          if (!fell && B.rel()[2] > endZ - 3) return true;
          await B.until(() => Math.abs(B.rel()[1]) < 0.3 && B.rel()[2] < endZ - 3, 8000);
          await B.sl(1200);
        }
        return false;
      };
      const a = await run(segA, 1.5, 39);
      B.note('reelle', 'segment A ' + (a ? 'traversé' : 'ÉCHEC') + ' ' + B.rel().join(','));
      await at(() => x().p1);
      await B.walk([0, 0, 57], 0.6, 20000);
      B.note('reelle', 'pont 1 traversé ' + B.rel().join(','));
      const b = await run(segB, 58.5, 92);
      B.note('reelle', 'segment B ' + (b ? 'traversé' : 'ÉCHEC') + ' ' + B.rel().join(','));
      await B.walk([2.2, 0, 92.6], 0.4, 10000);
      for (let i = 0; i < 5 && !x().s1; i++) {
        await B.tap('interact');
        await B.sl(500);
      }
      B.note('reelle', x().s1 ? 'interrupteur 1 (E) : la porte de la dame s’ouvre' : 'interrupteur 1 SANS effet ' + B.rel().join(','));
      await at(() => x().p2);
      await B.walk([0, 0, 111], 0.6, 20000);
      B.note('reelle', 'pont 2 traversé ' + B.rel().join(','));
      const c = await run(segC, 112.5, 149);
      B.note('reelle', 'segment C ' + (c ? 'traversé' : 'ÉCHEC') + ' ' + B.rel().join(','));
      await B.walk([0, 0, 149.6], 0.4, 10000);
      for (let i = 0; i < 5 && !x().s2; i++) {
        await B.tap('interact');
        await B.sl(500);
      }
      B.note('reelle', x().s2 ? 'interrupteur 2 (E) : la seconde porte de la dame' : 'interrupteur 2 SANS effet ' + B.rel().join(','));
      log.push('A ' + a + ' B ' + b + ' C ' + c);
    }
    // ---- converge: both reach the heart within 2 s (same clock on both pages)
    if (!(await B.until(() => Story.S.phase !== 'act5' || x().stage !== 'worlds', 120000))) return log.join(' ') + ' — no converge';
    if (Story.S.phase !== 'act5') return log.join(' ');
    await B.sl(2500);
    B.W = null;
    for (let tries = 0; tries < 10 && x().stage === 'converge' && !CL.abort; tries++) {
      // both go at the same wall-clock instant (both pages share the machine's clock)
      const T = Math.ceil((Date.now() + 2500) / 4000) * 4000;
      await B.sl(T - Date.now() - (dame ? 0 : 500));
      if (dame) {
        B.aim(Worlds.ring);
        for (let i = 0; i < 20 && Player.lockTarget < 0; i++) {
          await B.sl(30);
          B.aim(Worlds.ring);
        }
        await B.tap('ability');
        await B.until(() => x().stage !== 'converge', 2500);
      } else {
        await B.leap(Worlds.C.center.clone().add(V3(0, -1, 0)), { ms: 2500, run: 280 });
      }
      if (x().stage !== 'converge') break;
      await B.sl(1500);
      // back on our platform (a respawn put us there if we fell)
      await B.walk(Worlds.spawnConverge(Story.role), 0.5, 6000);
      B.note('reelle', 'convergence ratée, on recommence');
    }
    B.note('reelle', x().stage === 'caught' ? 'les deux au cœur ensemble : pris' : 'convergence PAS faite (' + x().stage + ')');
    await B.until(() => Story.S.phase !== 'act5' || CL.abort, 30000);
    return log.join(' ') + ' — ' + Story.S.phase;
  },
};
