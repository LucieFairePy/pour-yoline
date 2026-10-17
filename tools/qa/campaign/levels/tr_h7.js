// ♥8 Le Bal (tr_h7) — solver. Both pages run this; each plays its own kit (Story.role).
// Stages: 1 walk into the salon · 2 the waltz (3 figures x 8 steps, leader on the marks, follower
// keeps 0.6-2.6 m) · 3 the masked ball (pick a sign with E, own curtain, then find the partner's
// mannequin and invite it with E) · 4 the gallery of mirrors (each guides the other with E on a
// tile, walks only on the tiles shown to them) · 5 the Grand Lustre (both press E on the « un »
// near an unlit candle, dodging crystals and falling squares) · 6 meet under the lustre.
window.CL = {
  timeout: 1200,
  async run() {
    const W = H7;
    B.W = W;
    const L = W.local;
    const S = Input.sim;
    const me = Story.role;
    const mate = me === 'dame' ? 'valet' : 'dame';
    const myLane = me === 'dame' ? 'L' : 'R';
    const mateLane = me === 'dame' ? 'R' : 'L';
    const side = me === 'dame' ? -1 : 1;
    const x = () => Story.S.x;
    const over = () => CL.abort || Story.S.phase !== 'tr_h7';
    const q = () => W.rel(Player.body.p);
    const rq = () => W.rel(Remote.pos);
    const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const steer = (tx, tz, sprint) => {
      const b = Player.body.p;
      const p = W.P(tx, 0, tz);
      Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
      if (sprint) S.held.add('sprint');
      else S.held.delete('sprint');
      B.steer(p);
    };
    const tapNB = (a, ms = 50) => {
      S.held.add(a);
      setTimeout(() => S.held.delete(a), ms);
    };
    const log = [];
    const said = new Set();
    const once = (k, how, t) => {
      if (said.has(k)) return;
      said.add(k);
      B.note(how, t);
    };

    // ---------------- stage 1: into the salon ----------------
    const stage1 = async () => {
      once('s1', 'reelle', 'entre dans le salon de valse');
      // the doorway is 3.6 m wide: through its middle, then to our side
      await B.walk([side * 0.7, 0, -12.5], 0.4, 12000);
      await B.walk([side * 0.7, 0, -16], 0.4, 6000);
      await B.walk([side * 1.5, 0, -18], 0.6, 6000);
      await B.until(() => over() || x().stage !== 1, 15000);
    };

    // ---------------- stage 2: the waltz ----------------
    const stage2 = async () => {
      const C = W.R1C;
      let lastKey = '';
      while (!over() && x().stage === 2) {
        const X = x();
        if (X.fig >= 3) {
          await B.sl(100);
          continue;
        }
        const F = W.FIGS[X.fig];
        const key = X.fig + ':' + (X.run ? X.step : 'w');
        if (key !== lastKey) {
          lastKey = key;
          if (!X.run) B.note('reelle', 'valse figure ' + X.fig + ' : position de départ (' + (W.leaderOf(X.fig, 1) === me ? 'meneur, cercle d’or' : 'suiveur, cercle rose') + ')');
          else if (X.step === 1 || X.step === 8) B.note('reelle', 'valse figure ' + X.fig + ' pas ' + X.step + ' / 8');
        }
        const p = q();
        if (!X.run) {
          // the starting pose (leader in the gold circle, follower in the pink one)
          const lead = W.leaderOf(X.fig, 1) === me;
          const t = lead ? F[0] : W.followStart(X.fig);
          const tx = C.x + t[0];
          const tz = C.z + t[1];
          if (Math.hypot(p.x - tx, p.z - tz) > 0.35) steer(tx, tz, Math.hypot(p.x - tx, p.z - tz) > 2);
          else B.stop();
          await B.sl(30);
          continue;
        }
        const k = Math.max(1, X.step);
        const lead = W.leaderOf(X.fig, k) === me;
        if (lead) {
          // on the mark of the current step (it stays lit until the « un »)
          const tx = C.x + F[k][0];
          const tz = C.z + F[k][1];
          const d = Math.hypot(p.x - tx, p.z - tz);
          if (d > 0.35) steer(tx, tz, d > 1.2);
          else B.stop();
        } else {
          // follow: stay about 1.6 m from the one who leads, facing them
          const r = rq();
          const d = Math.hypot(p.x - r.x, p.z - r.z);
          if (d < 1.15 || d > 2.0) {
            const ux = (p.x - r.x) / (d || 1);
            const uz = (p.z - r.z) / (d || 1);
            steer(r.x + ux * 1.6, r.z + uz * 1.6, d > 2.6);
          } else B.stop();
        }
        await B.sl(30);
      }
      B.stop();
    };

    // ---------------- stage 3: the masked ball ----------------
    const stage3 = async () => {
      // the corridor of the signs: pick one at a pedestal (E), then go through my curtain
      if (x().mask === 0) {
        once('s3a', 'reelle', 'bal masqué : passe la porte du salon');
        await B.walk([side * 0.8, 0, -47], 0.6, 15000, true);
        await B.walk([side * 0.8, 0, -51.2], 0.5, 8000);
        // the outer pedestals (dame left, valet right): the way to the curtain passes outside them
        const sign = me === 'dame' ? 'coeur' : 'eventail';
        const px = [-3.4, -1.7, 0, 1.7, 3.4][W.SIGNS.indexOf(sign)];
        await B.walk([px, 0, -52.5], 0.3, 8000);
        for (let i = 0; i < 6 && !over() && !(x().sig && x().sig[me]); i++) {
          B.face([px, 1, -53.6]);
          await B.tap('interact');
          await B.sl(400);
        }
        B.note('reelle', 'signe choisi au piédestal (E) : ' + (x().sig && x().sig[me]));
        // my curtain (dame on the left, valet on the right)
        await B.walk([side * 4.4, 0, -52.5], 0.35, 6000);
        await B.walk([side * 4.4, 0, -55.2], 0.35, 6000);
        await B.walk([side * 2.55, 0, -56.8], 0.35, 6000);
        B.note('reelle', 'devant mon rideau, j’attends l’autre');
        await B.until(() => over() || x().mask !== 0 || x().stage !== 3, 60000);
      }
      if (over() || x().stage !== 3) return;
      // the crowd: raise my sign (F) now and then, walk to the mannequin that shows the partner's
      // sign in their colour (the proxy stands where the partner is), invite it (E)
      if (x().mask === 1) {
        B.note('reelle', 'dans la foule : je lève mon signe (F) et je vais vers le masque qui montre le signe de l’autre');
        await B.sl(800);
        let sigT = 0;
        let invT = 0;
        const t0 = performance.now();
        while (!over() && x().stage === 3 && x().mask === 1 && performance.now() - t0 < 180000) {
          const now = performance.now();
          if (now - sigT > 2500) {
            sigT = now;
            B.stop();
            await B.tap('ability');
          }
          const p = q();
          const r = rq();
          const d = hyp(p, r);
          if (d > 0.9) steer(r.x, r.z, d > 4);
          else B.stop();
          if (d < 1.8 && now - invT > 1400) {
            invT = now;
            B.stop();
            B.face(Remote.pos);
            await B.sl(60);
            await B.tap('interact');
          }
          await B.sl(40);
        }
        B.stop();
        B.note('reelle', 'retrouvés (invitation E) : mask=' + x().mask);
      }
      if (over() || x().stage !== 3) return;
      // found: through the door to the gallery
      await B.walk([side * 1.2, 0, -97], 0.6, 15000, true);
      await B.walk([side * 1.0, 0, -101.5], 0.5, 8000);
      await B.until(() => over() || x().stage !== 3, 20000);
    };

    // ---------------- stage 4: the gallery of mirrors ----------------
    const stage4 = async () => {
      once('s4', 'reelle', 'galerie : chacun guide l’autre (E sur un carreau) et ne marche que sur ceux qu’on lui montre');
      // through the door of the gallery to my lane's landing
      await B.walk([side * 0.9, 0, -103.4], 0.4, 8000);
      await B.walk([side * 0.9, 0, -105], 0.4, 6000);
      const ordered = (half, lane) => {
        const P = L.paths && L.paths[half + lane];
        if (!P || L.pathSeed !== x().gseed) return null;
        return [...P].map((s) => s.split(':').map(Number));
      };
      const landingZ = (half) => W.rowZ(half, 0) + 1.3;
      const endZ = (half) => W.rowZ(half, W.ROWS - 1) - 2.3;
      // where a body is on its lane: -1 before the tiles, ROWS after, else the tile (or null in the air)
      const placeOf = (qq, half) => {
        const tl = W.standing(qq);
        if (tl && tl.half === half) return tl;
        if (qq.y < -0.8) return null;
        if (qq.z > W.rowZ(half, 0) + 0.72) return 'start';
        if (qq.z < W.rowZ(half, W.ROWS - 1) - 0.72) return 'end';
        return null;
      };
      let markT = 0;
      let lastHalf = 0;
      let doneLane = false;
      let fallN = 0;
      const t0 = performance.now();
      while (!over() && x().stage === 4 && performance.now() - t0 < 600000) {
        const half = x().half || 1;
        if (half !== lastHalf) {
          lastHalf = half;
          doneLane = false;
          B.note('reelle', 'galerie, moitié ' + half + ' (' + (half === 1 ? (me === 'dame' ? 'je vois son chemin dans les miroirs' : 'je vois son chemin au sol') : me === 'valet' ? 'je vois son chemin dans les miroirs' : 'je vois son chemin au sol') + ')');
          if (half === 2) await B.walk([W.LANE_X[myLane][1], 0, -128.4], 0.4, 6000);
        }
        // --- guide: show the partner the next tile of their way (shown on my screen) ---
        const path = ordered(half, mateLane);
        const rp = rq();
        const pl = placeOf(rp, half);
        let next = null;
        if (path && pl) {
          if (pl === 'start') next = path[0];
          else if (pl !== 'end') {
            const i = path.findIndex(([r, c]) => r === pl.row && c === pl.col && pl.lane === mateLane);
            if (i >= 0 && i < path.length - 1) next = path[i + 1];
          }
        }
        const nextId = next ? half + mateLane + next[0] + ':' + next[1] : null;
        if (nextId && L.marks[mateLane] !== nextId && performance.now() - markT > 500) {
          markT = performance.now();
          B.stop();
          const tl = W.gallery.tiles[nextId];
          let ok = false;
          let ax = tl.x;
          let az = tl.z;
          B.aim([ax, 0, az]);
          for (let i = 0; i < 40 && !over(); i++) {
            B.aimFine([ax, 0, az]);
            await B.sl(35);
            if (L.aim === nextId) {
              ok = true;
              break;
            }
            // correct by where the ray really lands
            const cam = R.camera;
            const dir = V3(0, 0, -1).applyQuaternion(cam.quaternion);
            const hit = W.aimTile(cam.position, dir);
            if (hit && i > 3) {
              ax += (tl.x - hit.x) * 0.6;
              az += (tl.z - hit.z) * 0.6;
            }
          }
          if (ok) {
            await B.tap('interact');
            log.push('m' + next.join(':'));
          }
        }
        // --- walker: go to the tile shown to me ---
        const myQ = q();
        if (myQ.y < -1.2) {
          // fell: the game puts me back on the landing
          fallN++;
          B.stop();
          B.note('reelle', 'tombé dans la galerie (' + fallN + '), retour au palier');
          await B.until(() => q().y > -0.5 && Player.body.grounded, 8000);
          await B.sl(300);
          continue;
        }
        if (!doneLane) {
          const mine = placeOf(myQ, half);
          const mk = L.marks[myLane];
          const tl = mk ? W.gallery.tiles[mk] : null;
          if (mine === 'end') doneLane = true;
          else if (mine && mine !== 'start' && mine.row === W.ROWS - 1 && mine.lane === myLane && mine.dropT < 0) {
            // the last row: straight on to the landing
            await B.walk([mine.x, 0, endZ(half)], 0.4, 4000);
            doneLane = true;
          } else if (tl && tl.half === half && tl.lane === myLane && mine) {
            if (mine === 'start') await B.walk([tl.x, 0, landingZ(half)], 0.3, 5000);
            await B.walk([tl.x, 0, tl.z], 0.28, 4000);
            await B.sl(120);
          }
        } else {
          const e = placeOf(myQ, half);
          if (e !== 'end') doneLane = false;
          else await B.walk([W.LANE_X[myLane][1], 0, endZ(half)], 0.5, 3000);
        }
        await B.sl(60);
      }
      B.stop();
      B.note('reelle', 'galerie franchie (' + log.length + ' carreaux montrés, ' + fallN + ' chutes)');
    };

    // ---------------- stage 5: the Grand Lustre ----------------
    const stage5 = async () => {
      const C = W.R4C;
      once('s5', 'reelle', 'grande salle : on entre ensemble sous le lustre');
      await B.walk([side * 1.0, 0, -160], 0.5, 10000, true);
      await B.walk([side * 1.5, 0, -167], 0.5, 8000, true);
      await B.until(() => over() || x().fight || x().stage !== 5, 20000);
      if (over() || x().stage !== 5) return;
      B.note('reelle', 'combat : E ensemble sur le « un » près d’un candélabre éteint, en esquivant pampilles et carreaux');
      const ORDER = [3, 2, 1, 0];
      const cellOk = (px, pz) => {
        if (Math.abs(px) > 12.95 || Math.abs(pz - C.z) > 12.95) return true; // the marble surround
        const cl = W.cellAt(px, pz);
        if (!cl) return true;
        return cl.fixed || (cl.st === 0 && cl.fall < 0.02);
      };
      const footOk = (px, pz, r = 0.2) => cellOk(px - r, pz - r) && cellOk(px + r, pz - r) && cellOk(px - r, pz + r) && cellOk(px + r, pz + r);
      const pend = () => {
        const beat = L.beat;
        return W.boss.drops.filter((dr) => dr.t >= 0 && dr.land > beat - 0.05);
      };
      const dropOk = (px, pz, drops, m = 2.0) => drops.every((dr) => Math.hypot(px - dr.x, pz - dr.z) > m);
      // the same plan on both screens: a pair of spots by the candle, safe from crystals and squares
      const plan = (k) => {
        const cd = W.boss.cands[k];
        const drops = pend();
        const cands = [];
        for (let dx = -3.5; dx <= 3.51; dx += 0.5)
          for (let dz = -3.5; dz <= 3.51; dz += 0.5) {
            if (Math.hypot(dx, dz) > 3.6 || Math.max(Math.abs(dx), Math.abs(dz)) < 0.85) continue;
            const px = cd.x + dx;
            const pz = cd.z + dz;
            if (!footOk(px, pz) || !dropOk(px, pz, drops)) continue;
            cands.push([px, pz]);
          }
        const hD = [cd.x - 0.9, cd.z];
        const hV = [cd.x + 0.9, cd.z];
        let best = null;
        let bc = 1e9;
        for (const a of cands)
          for (const b of cands) {
            const s = Math.hypot(a[0] - b[0], a[1] - b[1]);
            if (s < 1.0 || s > 2.3) continue;
            const c = Math.hypot(a[0] - hD[0], a[1] - hD[1]) + Math.hypot(b[0] - hV[0], b[1] - hV[1]);
            if (c < bc - 1e-6) {
              bc = c;
              best = [a, b];
            }
          }
        return best ? (me === 'dame' ? best[0] : best[1]) : null;
      };
      let lastB = -99;
      let presses = 0;
      let lastK = -1;
      const t0 = performance.now();
      while (!over() && x().stage === 5 && performance.now() - t0 < 600000) {
        const X = x();
        const k = ORDER.find((i) => (X.lit[i] || 0) < 4);
        if (k === undefined) {
          await B.sl(100);
          continue;
        }
        if (k !== lastK) {
          lastK = k;
          B.note('reelle', 'candélabre ' + k + ' (allumés ' + X.lit.filter((v) => v >= 4).length + ' / 4)');
        }
        const cd = W.boss.cands[k];
        const p = q();
        if (p.y < -1.5) {
          B.stop();
          await B.until(() => q().y > -0.5 && Player.body.grounded, 8000);
          continue;
        }
        const drops = pend();
        let tgt = plan(k);
        const dC = Math.hypot(p.x - cd.x, p.z - cd.z);
        // a crystal about to land on me: step away first
        const close = drops.find((dr) => dr.land - L.beat < 1.4 && Math.hypot(p.x - dr.x, p.z - dr.z) < 1.9);
        if (close && (!tgt || Math.hypot(p.x - tgt[0], p.z - tgt[1]) > 1.2)) {
          const ux = p.x - close.x;
          const uz = p.z - close.z;
          const l = Math.hypot(ux, uz) || 1;
          const cand = [p.x + (ux / l) * 2.2, p.z + (uz / l) * 2.2];
          if (footOk(cand[0], cand[1]) && Math.max(Math.abs(cand[0] - cd.x), Math.abs(cand[1] - cd.z)) > 0.8) tgt = cand;
        }
        if (tgt) {
          const d = Math.hypot(p.x - tgt[0], p.z - tgt[1]);
          // never walk onto a square that is warned, falling or gone
          const l = d || 1;
          const ax = p.x + ((tgt[0] - p.x) / l) * Math.min(d, 0.8);
          const az = p.z + ((tgt[1] - p.z) / l) * Math.min(d, 0.8);
          if (d > 0.22 && footOk(ax, az, 0.15)) steer(tgt[0], tgt[1], d > 1.5);
          else B.stop();
        } else B.stop();
        // on the « un », together, near the candle
        const b = Math.round(L.beat / 3);
        const off = L.beat - b * 3;
        if (Math.abs(off) < 0.22 && b !== lastB && dC < 4.0 && hyp(p, rq()) < 2.8 && X.fight) {
          lastB = b;
          tapNB('interact', 45);
          presses++;
        }
        await B.sl(25);
      }
      B.stop();
      B.note('reelle', 'lustre : ' + presses + ' appuis sur le « un », stage ' + x().stage);
    };

    // ---------------- stage 6: under the lustre ----------------
    const stage6 = async () => {
      once('s6', 'reelle', 'le bal est sauvé : on se rejoint sous le lustre (carte)');
      const C = W.R4C;
      await B.walk([side * 1.2, 0, C.z], 0.5, 20000, true);
      await B.until(() => over(), 30000);
    };

    // ---------------- main ----------------
    const t0 = performance.now();
    while (!over() && performance.now() - t0 < 1180000) {
      const st = x().stage;
      if (st === 1) await stage1();
      else if (st === 2) await stage2();
      else if (st === 3) await stage3();
      else if (st === 4) await stage4();
      else if (st === 5) await stage5();
      else if (st === 6) await stage6();
      else await B.sl(200);
      B.stop();
      await B.sl(50);
    }
    B.stop();
    S.held.clear();
    return me + ': ' + (CL.abort ? 'abort' : 'fin') + ' phase ' + Story.S.phase + ' stage ' + (Story.S.x && Story.S.x.stage);
  },
};
