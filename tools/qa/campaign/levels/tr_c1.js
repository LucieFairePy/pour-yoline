// tr_c1 « Le Câble » — solver (both pages). Real keys only: E held = anchor (ground) / ballast
// (air), E + Maj = reel, the crank by E in the alcove. Roles by kit (Story.role):
//   stage 1  valet double-jumps the 2.95 m wall, anchors and reels; dame waits at the foot
//   stage 2  valet anchors at the edge; dame drops onto the alcove lip, turns the crank, is reeled up
//   stage 3  both hop the crumbling ledges together (re-try / reel a partner left hanging)
//   stage 4  dame jumps into the well holding E (ballast) → valet hoisted; valet anchors + reels
//   stage 5  both sprint the collapsing bridge, jumping the gaps, anchoring on each gust
//   stage 6  both walk to the card
window.CL = {
  timeout: 900,
  async run() {
    const W = TrC1;
    B.W = W;
    const S = Input.sim;
    const me = Story.role;
    const sd = me === 'dame' ? -1 : 1;
    const x = () => Story.S.x;
    const ab = () => !!CL.abort || Story.S.phase !== 'tr_c1';
    const until = (f, ms = 30000) => B.until(() => ab() || f(), ms, 50);
    const mq = () => W.rel(Remote.pos);
    const q = () => W.rel(Player.body.p);
    const log = [];
    const L = (s) => {
      log.push(x().stage + ':' + s);
      B.note('reelle', 'étape ' + x().stage + ' — ' + s + ' @' + B.rel().join(','));
    };
    const release = () => {
      S.held.delete('interact');
      S.held.delete('sprint');
      B.stop();
    };
    // slow approach (stick at a fraction): stops close to an edge without sliding over it
    const creep = async (p, near = 0.2, ms = 6000, k = 0.35) => {
      p = B.abs(p);
      const t = performance.now();
      while (performance.now() - t < ms && !ab()) {
        const b = Player.body.p;
        if (Math.hypot(p.x - b.x, p.z - b.z) < near) break;
        Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
        B.steer(p);
        S.x *= k;
        S.z *= k;
        await B.sl(20);
      }
      B.stop();
    };
    // while hanging on the cable near a top edge, push toward it (the level's mantle)
    const pushWhile = async (cond, yaw, minY, ms, any = false) => {
      const t = performance.now();
      while (performance.now() - t < ms && !ab() && cond()) {
        const b = Player.body;
        if (!b.grounded && q().y > minY && (any || Remote.pos.y > b.p.y - 0.5)) {
          Cam.yaw = yaw;
          S.x = 0;
          S.z = 1;
        } else {
          S.x = 0;
          S.z = 0;
        }
        await B.sl(30);
      }
      S.x = 0;
      S.z = 0;
    };
    const t0 = performance.now();

    // ---------------- stage 1: the wall ----------------
    if (x().stage === 1 && !ab()) {
      if (me === 'dame') {
        await B.walk([-1.5, 0, 20.5]);
        L('au pied du mur');
        await pushWhile(() => x().stage === 1, 0, 1.0, 60000);
      } else {
        await B.walk([1.5, 0, 18.5]);
        await until(() => mq().z > 18.5, 15000);
        for (let i = 0; i < 4 && q().y < 2.5 && !ab(); i++) {
          if (i) await B.walk([1.5, 0, 18.5], 0.5, 6000);
          await B.leap([1.5, 2.95, 24.5]);
        }
        await B.walk([0.5, 2.95, 24.2], 0.4, 3000);
        L('en haut du mur (double saut), ancrage E + Maj');
        S.held.add('interact');
        await B.sl(300);
        S.held.add('sprint');
        await until(() => x().stage >= 2, 40000);
        release();
      }
    }

    // ---------------- stage 2: the alcove and the crank ----------------
    if (x().stage === 2 && !ab()) {
      if (me === 'valet') {
        await B.walk([0, 2.95, 32.6], 0.4, 10000);
        await creep([0, 2.95, 33.7], 0.15);
        L('ancré au bord (E)');
        S.held.add('interact');
        await until(() => x().bridge && W.inAlcove(mq()), 60000);
        await B.sl(500);
        L('remonte le partenaire (E + Maj)');
        S.held.add('sprint');
        await until(() => mq().y > 2.5 && Remote.state.grounded, 30000);
        release();
        await B.sl(300);
      } else {
        await B.walk([0, 2.95, 32.0], 0.4, 10000);
        await until(() => Remote.state.grounded && mq().z > 33.2 && mq().y > 2.5, 15000);
        await B.sl(1000);
        // step off the edge onto the lip below
        {
          const t1 = performance.now();
          while (performance.now() - t1 < 4000 && !ab()) {
            Cam.yaw = 0;
            B.steer(W.P(0, 0, 35.3));
            if (Player.body.grounded && q().y < -3) break;
            await B.sl(16);
          }
          B.stop();
        }
        L('descendu sur le rebord de l’alcôve');
        await B.walk([0, -3.6, 31.2], 0.4, 8000);
        for (let i = 0; i < 4 && !x().bridge && !ab(); i++) {
          await B.tap('interact');
          await until(() => x().bridge, 1500);
          if (!x().bridge) await B.walk([0, -3.6, 31.0], 0.3, 2000);
        }
        L(x().bridge ? 'manivelle tournée (E) : pont sorti' : 'manivelle : le pont ne sort pas');
        await pushWhile(() => q().y < 2.5 || !Player.body.grounded, Math.PI, 1.5, 40000);
        await B.sl(800);
      }
      L('remontés');
      await B.sl(1500);
      await B.walk([sd * 0.6, 2.95, 32.5], 0.4, 8000);
      await B.walk([sd * 0.6, 2.95, 50.5], 0.6, 15000);
      await until(() => x().stage >= 3, 10000);
    }

    // ---------------- stage 3: the crumbling ledges ----------------
    if (x().stage === 3 && !ab()) {
      await B.walk([sd * 1, 2.95, 52.5], 0.4, 5000);
      await until(() => Math.abs(mq().z - 52.5) < 1.2, 8000);
      L('corniches : sauts ensemble');
      for (let tries = 0; tries < 6 && x().stage === 3 && !ab(); tries++) {
        // hop from wherever I stand to every ledge ahead, then the pulley platform
        for (const l of W.LEDGES) {
          if (ab() || x().stage !== 3) break;
          if (l.z < q().z + 1) continue;
          if (q().y < 2.5) break;
          await B.leap([l.x + sd * 0.6, 2.95, l.z]);
        }
        if (q().y > 2.5 && q().z > 86) await B.leap([sd * 1, 2.95, 94]);
        if (q().z > 91.9 && q().y > 2.5) {
          // partner left hanging on the cable: anchor here and reel them up
          await B.walk([sd * 1, 2.95, 95], 0.5, 3000);
          // wait for the partner; if they hang on the cable below an edge, anchor and reel them
          const tw = performance.now();
          while (x().stage === 3 && !ab() && performance.now() - tw < 90000) {
            const m = mq();
            const hanging = !Remote.state.grounded && m.y < 2.4 && m.y > -30 && Remote.pos.distanceTo(Player.body.p) < 12;
            if (hanging && Player.body.grounded && !S.held.has('interact')) {
              L('ancre + remonte le partenaire suspendu');
              S.held.add('interact');
              await B.sl(300);
              S.held.add('sprint');
            } else if (!hanging && S.held.has('interact') && Remote.state.grounded) release();
            await B.sl(100);
          }
          release();
          break;
        }
        // fell: hanging on the cable (push toward the ledge ahead) or back at the checkpoint
        L('chute (essai ' + (tries + 1) + ')');
        const tf = performance.now();
        while (performance.now() - tf < 15000 && !ab() && !(Player.body.grounded && q().y > 2.5)) {
          const b = Player.body;
          if (!b.grounded) {
            const nx = W.LEDGES.find((l) => l.z > q().z - 1.5);
            const tgt = nx ? W.P(nx.x, 0, nx.z) : W.P(0, 0, 94);
            Cam.yaw = Math.atan2(tgt.x - b.p.x, tgt.z - b.p.z);
            S.x = 0;
            S.z = 1;
          } else B.stop();
          await B.sl(30);
        }
        B.stop();
        await B.sl(600);
      }
      await until(() => x().stage >= 4, 10000);
    }

    // ---------------- stage 4: the pulley ----------------
    if (x().stage === 4 && !ab()) {
      if (me === 'dame') {
        await B.walk([0, 2.95, 103], 0.5);
        await until(() => Math.abs(mq().z - 102) < 3 && Remote.state.grounded, 10000);
        L('saute dans le puits en maintenant E (lest)');
        {
          const t1 = performance.now();
          while (performance.now() - t1 < 3000 && Player.body.grounded && !ab()) {
            Cam.yaw = 0;
            B.steer(W.P(0, 0, 110));
            await B.sl(16);
          }
          B.stop();
        }
        S.held.add('interact');
        await until(() => mq().y > W.TOP - 0.6, 25000);
        release();
        L('partenaire en haut, attend d’être remontée');
        // standing still at the bottom of the well, the feet stay planted (the cable cannot lift a
        // player who does not move): hop now and then so the reel takes her
        {
          const t2 = performance.now();
          let hopT = 0;
          while (performance.now() - t2 < 60000 && !ab() && !(q().y > W.TOP - 0.6 && q().z > 116.4 && Player.body.grounded)) {
            const b = Player.body;
            if (b.grounded && q().y < W.TOP - 2.5 && performance.now() - hopT > 1200) {
              hopT = performance.now();
              await B.tap('jump');
            } else if (!b.grounded && q().y > W.TOP - 2.5) {
              Cam.yaw = 0;
              S.x = 0;
              S.z = 1;
            } else {
              S.x = 0;
              S.z = 0;
            }
            await B.sl(30);
          }
          B.stop();
        }
        await B.sl(500);
        await B.walk([-1, W.TOP, 119], 0.5, 8000);
      } else {
        await B.walk([0.5, 2.95, 102], 0.5);
        await until(() => mq().y < 0, 25000);
        L('hissé par le lest du partenaire');
        await pushWhile(() => !(q().y > W.TOP - 0.6 && Player.body.grounded), 0, W.TOP - 2.5, 30000, true);
        await B.sl(800);
        await B.walk([0.5, W.TOP, 117.8], 0.4, 5000);
        await B.sl(1200);
        L('ancré sur la terrasse, remonte (E + Maj)');
        S.held.add('interact');
        await B.sl(300);
        S.held.add('sprint');
        await until(() => mq().y > W.TOP - 0.6 && mq().z > 116.4 && Remote.state.grounded, 45000);
        release();
        await B.walk([1, W.TOP, 119], 0.5, 8000);
      }
      await until(() => x().stage >= 5, 10000);
    }

    // ---------------- stage 5: the collapsing bridge ----------------
    if (x().stage === 5 && !ab()) {
      const G = [141, 151, 163, 171, 183];
      for (let tries = 0; tries < 5 && x().stage === 5 && !ab(); tries++) {
        const rn = x().rn || 0;
        await until(() => Math.abs(mq().z - q().z) < 3, 6000);
        L('course sur le pont (essai ' + (tries + 1) + ')');
        let gw = x().gw;
        const t1 = performance.now();
        S.held.add('sprint');
        while (performance.now() - t1 < 40000 && q().z < 198.5 && x().stage === 5 && (x().rn || 0) === rn && !ab()) {
          const z = q().z;
          // a gust over the middle: anchor (E on the ground) until it has blown over
          if (x().gw !== gw) {
            gw = x().gw;
            if (z > 138 && z < 180 && Player.body.grounded) {
              B.stop();
              S.held.add('interact');
              await B.sl(1900);
              S.held.delete('interact');
              S.held.add('sprint');
              continue;
            }
          }
          Cam.yaw = 0;
          // a point a little ahead on the centre line: lateral drift is corrected fast
          B.steer(W.P(sd * 0.25, 0, Math.min(z + 2.5, 199)));
          if (Player.body.grounded && G.some((g) => g - z > 0.2 && g - z < 1.3)) {
            S.held.add('jump');
            await B.sl(60);
            S.held.delete('jump');
          }
          await B.sl(16);
        }
        release();
        if (x().stage !== 5) break;
        if ((x().rn || 0) !== rn) {
          L('tombés : retour à la terrasse');
          await B.sl(1500);
          continue;
        }
        await until(() => x().stage >= 6, 8000);
      }
    }

    // ---------------- stage 6: the card ----------------
    if (x().stage === 6 && !ab()) {
      await B.walk([sd * 1, W.TOP, 203.2], 0.5, 15000);
      L('à la carte');
    }
    await until(() => Story.S.phase !== 'tr_c1', 10000);
    S.held.clear();
    B.stop();
    return me + ': ' + log.join(' | ') + ' · fin ' + Story.S.phase + ' ' + ((performance.now() - t0) / 1000).toFixed(0) + 's';
  },
};
