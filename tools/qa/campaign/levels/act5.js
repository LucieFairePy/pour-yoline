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
          // through the door's opening (walls either side), so by the path finder
          if (!(await B.walk([px, 0, 19.6], 0.3, 4000))) await B.go([px, 0, 19.6], { near: 0.3, ms: 15000, pad: 8 });
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
              // the moving slab swings on the game clock (world/worlds.js update): predict where it
              // will be when we land (~0.75 s) and go when that spot is within a jump
              const m = Worlds.moving[s[1]];
              const at = (dt) => {
                const off = Math.sin((Game.clock.t + dt) * 0.9 + m.ph) * (m.axis === 'x' ? 3 : 2);
                return [m.x + (m.axis === 'x' ? off : 0), m.y, m.z + (m.axis === 'z' ? off : 0)];
              };
              const me = B.rel();
              await B.until(() => {
                // its swing passes closest to us (x for the x-sliders, z for the z-slider)
                const p = at(0.8);
                return m.axis === 'x' ? Math.abs(p[0] - me[0]) < 0.9 : Math.abs(p[2] - me[2]) < 4.2;
              }, 8000, 16);
              tgt = at(0.8);
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
      // the switch answers within 1.6 m of its post (3, 94): stand right in front of it
      for (let i = 0; i < 5 && !x().s1; i++) {
        await B.walk([2.75, 0, 92.95], 0.2, 10000);
        await B.tap('interact');
        await B.sl(500);
      }
      B.note('reelle', x().s1 ? 'interrupteur 1 (E) : la porte de la dame s’ouvre' : 'interrupteur 1 SANS effet ' + B.rel().join(','));
      await at(() => x().p2);
      await B.walk([0, 0, 111], 0.6, 20000);
      B.note('reelle', 'pont 2 traversé ' + B.rel().join(','));
      const c = await run(segC, 112.5, 149);
      B.note('reelle', 'segment C ' + (c ? 'traversé' : 'ÉCHEC') + ' ' + B.rel().join(','));
      for (let i = 0; i < 5 && !x().s2; i++) {
        await B.walk([0, 0, 149.95], 0.2, 10000);
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
    // the dame grapples the ring when both stand ready on their platforms; the valet leaps as soon
    // as he sees her fly (her grapple on his screen): both reach the heart within the 2 s
    const ready = (p, who) => Math.hypot(p.x - Worlds.spawnConverge(who).x, p.z - Worlds.spawnConverge(who).z) < 2.2 && Math.abs(p.y - Worlds.OC.y) < 0.6;
    const other = dame ? 'valet' : 'dame';
    for (let tries = 0; tries < 12 && x().stage === 'converge' && !CL.abort; tries++) {
      await B.walk(Worlds.spawnConverge(Story.role), 0.5, 6000);
      if (dame) {
        await B.until(() => x().stage !== 'converge' || (Remote.has && ready(Remote.pos, other) && Remote.state && Remote.state.grounded), 15000, 50);
        await B.sl(600);
        B.aim(Worlds.ring);
        for (let i = 0; i < 30 && Player.lockTarget < 0; i++) {
          await B.sl(30);
          B.aimFine(Worlds.ring);
        }
        await B.tap('ability');
        await B.until(() => x().stage !== 'converge', 3000);
      } else {
        const flew = await B.until(() => x().stage !== 'converge' || (Remote.state && Remote.state.mode === 'grapple'), 15000, 16);
        if (flew && x().stage === 'converge') await B.leap(Worlds.C.center.clone().add(V3(0, -1, 0)), { ms: 2500, run: 280 });
      }
      if (x().stage !== 'converge') break;
      await B.sl(2000);
      B.note('reelle', 'convergence ratée, on recommence');
    }
    B.note('reelle', x().stage === 'caught' ? 'les deux au cœur ensemble : pris' : 'convergence PAS faite (' + x().stage + ')');
    await B.until(() => Story.S.phase !== 'act5' || CL.abort, 30000);
    return log.join(' ') + ' — ' + Story.S.phase;
  },
};
