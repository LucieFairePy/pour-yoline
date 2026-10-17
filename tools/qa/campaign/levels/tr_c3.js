// tr_c3 « La Bascule » — solver (both pages). Real keys only (E: crate / lever / winch held;
// the level's update() sends take/drop/lever/winch/slam). Roles by kit (Story.role):
//   stage 1  valet carries the crate (E) to the near end of seesaw A and puts it down (E): the far
//            end rises, its light gate opens; dame crosses first and locks the plank at the lever
//            (E) on island B; valet crosses
//   stage 2  valet goes to the far end of seesaw B; dame climbs the steps to the perch and steps
//            off the diving board onto the near end (slam → valet catapulted onto cliff C); valet
//            holds E at the winch while dame rides the lift
//   stage 3  both walk on the maze table and lean together (same side) to roll each marble along
//            a fixed route into ♥, ♦, ♣ (marble read from what the table shows)
//   stage 4  one on each side of the hanging bridges; on a gust both move toward the wind side
//   stage 5  each on a half-heart of the dais, shifting a step against the gust
//   stage 6  both walk to the card
window.CL = {
  timeout: 900,
  async run() {
    const W = TrC3;
    B.W = W;
    const S = Input.sim;
    const me = Story.role;
    const sd = me === 'dame' ? -1 : 1;
    const x = () => Story.S.x;
    const ab = () => !!CL.abort || Story.S.phase !== 'tr_c3';
    const until = (f, ms = 30000) => B.until(() => ab() || f(), ms, 50);
    const mq = () => W.rel(Remote.pos);
    const q = () => W.rel(Player.body.p);
    const log = [];
    const L = (s) => {
      log.push(x().stage + ':' + s);
      B.note('reelle', 'étape ' + x().stage + ' — ' + s + ' @' + B.rel().join(','));
    };
    // steer toward a level point with a stick proportional to the distance (fine positioning)
    const hold = (tx, tz, dead = 0.15, run = true) => {
      const p = W.P(tx, 0, tz);
      const b = Player.body.p;
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      if (d < dead) {
        S.x = 0;
        S.z = 0;
        S.held.delete('sprint');
        return d;
      }
      Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
      B.steer(p);
      const k = clamp(d * 0.8, 0.25, 1);
      S.x *= k;
      S.z *= k;
      if (run && d > 1.5) S.held.add('sprint');
      else S.held.delete('sprint');
      return d;
    };
    const t0 = performance.now();

    // ---------------- stage 1: crate, seesaw A, lever ----------------
    if (x().stage === 1 && !ab()) {
      if (me === 'valet') {
        for (let i = 0; i < 4 && x().crate.st !== 'plank' && !ab(); i++) {
          const c = x().crate;
          if (c.st !== 'carry') {
            await B.go([c.x, c.y || 0, c.z - 0.8], { near: 0.6, ms: 20000 });
            await B.tap('interact');
            await until(() => x().crate.st === 'carry', 2000);
            if (x().crate.st !== 'carry') continue;
            L('caisse portée (E)');
          }
          // straight +z to the near end so the crate goes down on the plank in front
          await B.walk([0, 0, 9], 0.4, 10000);
          await B.walk([0, 0, 11.9], 0.2, 5000);
          await B.tap('interact');
          await until(() => x().crate.st !== 'carry', 2000);
        }
        L('caisse ' + x().crate.st + ' z ' + (x().crate.z ?? '-'));
        await B.walk([2, 0, 10.2], 0.5, 5000);
        await until(() => x().lock || (mq().z > 26.6 && mq().y > W.ISLE - 0.4), 60000);
        await until(() => W.st.tA > 0.22, 15000);
        L('traverse la bascule A');
        await B.walk([0.6, 0, 11.2], 0.4, 6000);
        await B.walk([0.6, W.ISLE, 27.5], 0.5, 15000, true);
        await B.walk([1.5, W.ISLE, 29.5], 0.5, 5000);
      } else {
        await until(() => x().crate.st === 'plank' && W.st.tA > 0.25, 120000);
        L('bascule levée, porte ouverte : traverse');
        await B.walk([-0.6, 0, 10.5], 0.5, 12000);
        await B.walk([-0.6, W.ISLE, 27.6], 0.5, 15000, true);
        await B.walk([3.6, W.ISLE, 28.4], 0.4, 6000);
        await until(() => W.st.tA > 0.25, 8000);
        for (let i = 0; i < 3 && !x().lock && !ab(); i++) {
          await B.tap('interact');
          await until(() => x().lock, 1500);
        }
        L(x().lock ? 'levier : bascule bloquée (E)' : 'levier : pas de blocage');
        await B.walk([5.25, W.ISLE, 29.5], 0.5, 5000);
      }
      await until(() => x().stage >= 2, 30000);
    }

    // ---------------- stage 2: catapult, winch and lift ----------------
    if (x().stage === 2 && !ab()) {
      if (me === 'dame') {
        const STEPS = [
          [5.25, W.ISLE, 29.5],
          [5.25, 5.5, 32],
          [5.25, 8.0, 35],
          [3.5, 8.4, 38.6],
        ];
        const climb = async () => {
          for (let k = 0; k < 8 && !ab(); k++) {
            const y = q().y;
            if (y > 8.2 && q().z > 37) return true;
            // the step I stand on, then leap to the next one
            let i = 0;
            for (let j = 0; j < STEPS.length; j++) if (y > STEPS[j][1] - 0.4) i = j;
            if (i >= STEPS.length - 1) {
              // already on the perch's height: walk onto it
              await B.walk(STEPS[STEPS.length - 1], 0.5, 6000);
              continue;
            }
            await B.walk(STEPS[i], 0.5, 6000);
            await B.leap(STEPS[i + 1]);
          }
          if (q().y > 8.2) return true;
          // the grapple ring over the perch (the dame's own way up)
          await B.walk([2.4, W.ISLE, 31], 0.5, 6000);
          B.aim(W.RING);
          await B.sl(150);
          await B.tap('ability');
          await until(() => Player.mode === 'walk' && Player.body.grounded && q().y > 8.2, 4000);
          return q().y > 8.2;
        };
        for (let tries = 0; tries < 3 && x().stage === 2 && !ab(); tries++) {
          await climb();
          L('au perchoir (essai ' + (tries + 1) + ')');
          await until(() => Math.abs(mq().z - 53) < 1.8 && Remote.state.grounded && mq().y < 3, 60000);
          await B.sl(800);
          await B.walk([0.7, 8.4, 39.8], 0.3, 5000);
          await B.walk([0.7, 8.4, 41.2], 0.3, 5000);
          await B.walk([0.6, 8.4, 43.0], 0.2, 3000);
          await until(() => Player.body.grounded && q().y < 6, 4000);
          L('saut du plongeoir sur la bascule B');
          if (await until(() => mq().y > 9.5, 6000)) break;
          await B.walk([0, W.ISLE, 39.6], 0.5, 8000);
        }
        // onto the lift, against the cliff face
        await B.walk([0, 0, 50], 0.5, 6000);
        await B.walk([-1.4, 0, 53.6], 0.3, 6000);
        await B.walk([-3.2, 0, 54.1], 0.3, 6000);
        L('sur le monte-charge');
        await until(() => q().y > 9.5, 60000);
        await B.sl(500);
        await B.walk([-3.2, W.CLIFF, 56.4], 0.4, 4000);
        await B.walk([-1.2, W.CLIFF, 56.8], 0.4, 4000);
      } else {
        await B.walk([0, W.ISLE, 39.5], 0.5, 12000);
        await B.walk([0.3, 2, 52.5], 0.3, 8000);
        L('au bout de la bascule B, attend la catapulte');
        // catapulted: keep pushing toward the cliff while in the air
        const t1 = performance.now();
        while (performance.now() - t1 < 120000 && !ab() && !(Player.body.grounded && q().y > W.CLIFF - 0.5)) {
          const b = Player.body;
          if (!b.grounded && q().y > 3) {
            Cam.yaw = 0;
            S.x = 0;
            S.z = 1;
          } else {
            S.x = 0;
            S.z = 0;
            // fell off: back to the far end
            if (b.grounded && q().y < 2.5 && Math.abs(q().z - 53) > 2.5) await B.walk([0.3, 2, 52.5], 0.3, 8000);
          }
          await B.sl(30);
        }
        B.stop();
        L('catapulté sur la falaise');
        await B.walk([-3, W.CLIFF, 59.2], 0.4, 6000);
        Cam.yaw = Math.PI;
        await until(() => W.onLift(mq()) && Remote.state.grounded, 90000);
        await B.sl(1000);
        L('treuil (E maintenu)');
        S.held.add('interact');
        await until(() => mq().y > 9.5 && mq().z > 55.3, 40000);
        S.held.delete('interact');
        await B.walk([1, W.CLIFF, 62], 0.5, 5000);
      }
      await until(() => x().stage >= 3, 20000);
    }

    // ---------------- stage 3: the maze table ----------------
    if (x().stage === 3 && !ab()) {
      const T = W.TBL;
      await B.walk([sd * 1, W.CLIFF, 71], 0.5, 12000);
      await B.walk([sd * 1, W.CLIFF, 73.3], 0.4, 5000);
      await B.walk([sd * 0.6, W.CLIFF, T.z], 0.5, 8000);
      await until(() => Math.abs(mq().z - T.z) < 4, 15000);
      L('sur la table : on penche ensemble');
      // routes in table space (walls and traps avoided), one per marble
      const ROUTES = [
        [[-7.4, -5.7], [7.5, -5.7], [7.5, -7.3]],
        [[-7.4, -5.7], [6.8, -5.7], [6.8, -1.6], [-6.8, -1.6], [-6.8, 4.2], [7.4, 4.2], [7.4, 3.1]],
        [[-7.4, -5.7], [6.8, -5.7], [6.8, -1.6], [-6.8, -1.6], [-6.8, 4.2], [6.2, 4.2], [6.2, 8.2], [-7.4, 8.2], [-7.4, 7.4]],
      ];
      const RAD = 6.0; // both at 6 m on an axis: a tilt past what one player can give
      let wi = 0;
      let lastMi = x().mi;
      let lastReset = 0;
      const stuck = { t: 0, n: 0, log: performance.now() };
      const t1 = performance.now();
      while (x().mi < 3 && x().stage === 3 && performance.now() - t1 < 480000 && !ab()) {
        const mi = x().mi;
        if (mi !== lastMi) {
          lastMi = mi;
          wi = 0;
          L('bille ' + mi + ' dans son trou');
        }
        const m = W.st.marbles[mi];
        let px = 0;
        let pz = 0;
        // a marble resting against a wall short of its waypoint: back off to the previous one a
        // moment (what a player does), then on again
        if (m && !m.done) {
          const sp = Math.hypot(m.vx || 0, m.vz || 0);
          if (sp > 0.15 || !stuck.t) stuck.t = performance.now();
          if (performance.now() - stuck.t > 5000 && wi > 0) {
            wi--;
            stuck.t = performance.now();
            stuck.n++;
          }
          if (performance.now() - stuck.log > 30000) {
            stuck.log = performance.now();
            B.note('reelle', `table : bille ${mi + 1} en ${m.x.toFixed(1)},${m.z.toFixed(1)}, étape ${wi}, reculs ${stuck.n}`);
          }
        }
        if (m && !m.done) {
          if (Math.hypot(m.x - W.CHUTE[0], m.z - W.CHUTE[1]) < 0.4 && wi > 0 && performance.now() - lastReset > 3000) {
            wi = 0;
            lastReset = performance.now();
          }
          const R = ROUTES[mi];
          const wp = R[Math.min(wi, R.length - 1)];
          const ex = wp[0] - m.x;
          const ez = wp[1] - m.z;
          if (Math.hypot(ex, ez) < 0.45 && wi < R.length - 1) wi++;
          const ctl = (e, v) => {
            // the last marble's long way passes close to a trap: slower
            const vmax = mi === 2 ? 0.8 : 1.2;
            const dv = clamp(e * 0.6, -vmax, vmax) - (v || 0);
            return dv > 0.3 ? 1 : dv < -0.3 ? -1 : 0;
          };
          px = ctl(ex, m.vx);
          pz = ctl(ez, m.vz);
        }
        // standing toward +x rolls the marble toward +x (same for z)
        hold(px * RAD + sd * 0.6, T.z + pz * RAD, 0.3);
        await B.sl(50);
      }
      B.stop();
      L('table : ' + x().mi + ' billes');
      await B.walk([sd * 1.5, W.CLIFF, 91], 0.5, 10000, true);
      await B.walk([sd * 1.5, W.CLIFF, 99], 0.5, 8000);
      await until(() => x().stage >= 4, 20000);
    }

    // ---------------- stage 4: the hanging bridges in the storm ----------------
    if (x().stage === 4 && !ab()) {
      L('ponts : chacun son côté');
      const t1 = performance.now();
      let lastG = 0;
      while (q().z < 162 && x().stage === 4 && performance.now() - t1 < 180000 && !ab()) {
        const z = q().z;
        // a gust (announced on screen): both toward the side it comes from, not to the edge
        const g = W.st.gust;
        if (g && !lastG) L('rafale ' + (W.st.gustDir > 0 ? 'côté rose' : 'côté turquoise'));
        lastG = g;
        const tx = g ? -W.st.gustDir * 1.0 : sd * 1.1;
        const go = z < mq().z + 6;
        hold(tx, go ? Math.min(z + 3, 170) : z, 0.12);
        if (!go) S.z = Math.min(S.z, 0.15);
        await B.sl(30);
      }
      B.stop();
      L('traversé');
      await until(() => x().stage >= 5, 20000);
    }

    // ---------------- stage 5: the dais ----------------
    if (x().stage === 5 && !ab()) {
      L('dais : chacun sa moitié du cœur');
      const t1 = performance.now();
      while (x().stage === 5 && performance.now() - t1 < 120000 && !ab()) {
        const blow = W.st.gust === 1 ? W.st.gustDir : 0;
        hold(sd * 2.6 - blow * 1.0, W.DAIS.z, 0.15, false);
        await B.sl(30);
      }
      B.stop();
      L('équilibre tenu');
    }

    // ---------------- stage 6: the card ----------------
    if (x().stage === 6 && !ab()) {
      await B.walk([sd * 0.8, W.DAIS.y, W.DAIS.z], 0.4, 8000);
      L('à la carte');
    }
    await until(() => Story.S.phase !== 'tr_c3', 10000);
    S.held.clear();
    B.stop();
    return me + ': ' + log.join(' | ') + ' · fin ' + Story.S.phase + ' ' + ((performance.now() - t0) / 1000).toFixed(0) + 's';
  },
};
