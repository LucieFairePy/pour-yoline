// tr_h5 « La Chute » — solver (both pages; plays this page's kit, Story.role).
// Stage 1: the Dame kit jumps across the hidden clouds (only the Valet kit sees them: it climbs
//   the belvedere and calls the jumps; the jumper uses those positions), then the Valet crosses
//   the light bridge. Stage 2: the other way round (updraft to the high clouds).
// Stage 3, the net: the faller walks off the plank through the drifting ring, the catcher steers
//   the raft under them with the stick (the level's own raft control), four times, roles swap
//   at ring 3. Stage 4: both on the diving board, hand in hand (E), dive steering through the
//   rings, dodging the telegraphed lightning, land on the heart island. Stage 5: the card.
window.CL = {
  timeout: 1800,
  async run() {
    const W = (B.W = H5);
    const S = Input.sim;
    const role = Story.role;
    const dame = role === 'dame';
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S.phase === 'tr_h5';
    const body = Player.body;
    const q = () => W.rel(body.p);
    const rq = () => W.rel(Remote.pos);
    const log = [];
    const say = (how, t) => {
      B.note(how, t);
      log.push(t);
    };
    const T2 = Math.PI * 2;
    const walkPts = async (pts, near = 0.6, sprint = true) => {
      for (const p of pts) {
        if (!live()) return false;
        if (!(await B.walk(p, near, 15000, sprint))) return false;
      }
      return true;
    };
    // stick toward a horizontal direction (camera frame), scaled
    const stick = (dx, dz, m = 1) => {
      const d = Math.hypot(dx, dz);
      if (d < 1e-3 || m <= 0) {
        S.x = 0;
        S.z = 0;
        return;
      }
      const fx = Math.sin(Cam.yaw), fz = Math.cos(Cam.yaw);
      m = Math.min(1, m);
      S.z = ((dx * fx + dz * fz) / d) * m;
      S.x = (-(dx * fz - dz * fx) / d) * m;
    };
    // in the air: the horizontal velocity that lands on (tx, tz) when the body reaches height ty
    const airSteer = (tx, ty, tz, minT = 0.12) => {
      const p = q(), v = body.v;
      const disc = v.y * v.y + 52 * (p.y - ty);
      const tl = Math.max(minT, disc > 0 ? (v.y + Math.sqrt(disc)) / 26 : minT);
      const wx = (tx - p.x) / tl - v.x;
      const wz = (tz - p.z) / tl - v.z;
      stick(wx, wz, Math.hypot(wx, wz) / 1.5);
    };
    // the point most inside a polygon test (sampled centroid)
    const centroid = (inside, R, step) => {
      let sx = 0, sz = 0, n = 0;
      for (let dx = -R; dx <= R; dx += step)
        for (let dz = -R; dz <= R; dz += step)
          if (inside(dx, dz)) {
            sx += dx;
            sz += dz;
            n++;
          }
      return n ? [sx / n, sz / n] : [0, 0];
    };
    const netC = centroid((dx, dz) => W.inRing(W.RING_K, dx, dz), 3, 0.1);
    const diveC = centroid((dx, dz) => W.inRing(0.165, dx, dz), 4, 0.1);
    const heartC = centroid((dx, dz) => W.inHeart({ x: W.WELL.x + dx, z: W.WELL.z + dz }), 14, 0.5);

    // ================= stages 1 and 2: the leaps =================
    const cloudAt = (c, dt) => {
      let x = c.x + c.ox, z = c.z;
      if (c.drift) {
        const [ax, amp, per] = c.drift;
        const off = Math.sin(((W.clock + dt) / per) * T2) * amp;
        if (ax === 'x') x += off;
        else z += off;
      }
      return [x, c.y, z];
    };
    const driftOk = (c, dt) => {
      if (!c.drift) return true;
      const [, amp, per] = c.drift;
      return Math.abs(Math.sin(((W.clock + dt) / per) * T2)) < 0.45;
    };
    const fell = () => q().y < -10;
    // one hop onto a cloud (or the far island); true when standing on it
    const hop = async (c, last) => {
      if (c && c.drift) await B.until(() => driftOk(c, 0.9) || !live(), 8000, 20);
      const p = c ? cloudAt(c, 0.9) : last;
      await B.leap(p, { ms: 3000 });
      await B.until(() => body.grounded || fell(), 1500, 20);
      if (fell()) return false;
      if (c) return body.ground === c.b;
      return Math.abs(q().z - last[2]) < 6 && q().y > -0.8;
    };
    // the updraft (leap B): fall into it, rise, glide to the high cloud it feeds
    const updraft = async (u, next) => {
      S.held.add('sprint');
      S.held.add('jump');
      await B.sl(60);
      S.held.delete('jump');
      let t = performance.now();
      // into the column, then hold the middle until high enough
      while (performance.now() - t < 6000 && live() && !fell()) {
        const p = q();
        if (p.y > u.y1 - 0.6) break;
        // hold the middle of the column (velocity toward it, damped)
        const wx = (u.x - p.x) / 0.5 - body.v.x, wz = (u.z - p.z) / 0.5 - body.v.z;
        stick(wx, wz, Math.hypot(wx, wz) / 1.5);
        if (body.grounded && performance.now() - t > 400 && p.y < u.y1 - 2) {
          // landed back somewhere: jump again toward the column
          S.held.add('jump');
          await B.sl(60);
          S.held.delete('jump');
        }
        await B.sl(16);
      }
      // glide to the high cloud
      const tp = cloudAt(next, 0.5);
      t = performance.now();
      while (performance.now() - t < 3000 && live() && !fell()) {
        airSteer(tp[0], tp[1], tp[2]);
        if (body.grounded && performance.now() - t > 150) break;
        await B.sl(16);
      }
      B.stop();
      return body.ground === next.b;
    };
    const leapChain = async (leap, startZ, island) => {
      const cl = W.hidden.filter((c) => c.leap === leap);
      const ud = W.updrafts.find((u) => u.leap === leap);
      const feed = ud ? cl.findIndex((c) => c.y > ud.y1 - 3) : -1;
      for (let attempt = 1; attempt <= 12 && live(); attempt++) {
        // to the edge, in front of the first cloud
        await B.until(() => body.grounded, 4000);
        const c0 = cloudAt(cl[0], 0);
        // (the flags by the edge stand at |x| ≈ 2.5)
        const sx = Math.max(-1.6, Math.min(1.6, c0[0]));
        await B.walk([sx, 0, startZ - 2], 0.7, 15000, true);
        await B.walk([sx, 0, startZ], 0.35, 4000);
        B.face([c0[0], 0, c0[2]]);
        let ok = true;
        for (let i = 0; i < cl.length && ok && live(); i++) {
          if (i === feed) ok = await updraft(ud, cl[i]);
          else ok = await hop(cl[i]);
          if (!ok) say('reelle', 'saut ' + leap + ' : chute au nuage ' + (i + 1) + ' (essai ' + attempt + ')');
        }
        if (ok) ok = await hop(null, island);
        if (ok) {
          say('reelle', 'saut ' + leap + ' : traversé (essai ' + attempt + ')');
          return true;
        }
        // the level respawns the jumper at the edge (and draws a new layout)
        await B.until(() => !fell() && body.grounded, 6000);
        await B.sl(600);
      }
      return false;
    };

    if (live() && X().stage === 1) {
      if (dame) {
        say('reelle', 'saut A : positions des nuages annoncées par le Valet (il les voit depuis le belvédère)');
        await B.until(() => !dame || W.rel(Remote.pos).y > 4 || !live(), 25000);
        await leapChain('A', 8.4, [0, 0, 51.5]);
        await B.walk([-1, 0, 57], 0.7, 8000);
      } else {
        // up the belvedere to guide
        await walkPts([[-4.5, 0, -6.5], [-7, 0, -6], [-7, 0, 4.6]]);
        say('reelle', 'sur le belvédère A, guide la Dame');
        await B.until(() => !live() || X().bridgeA, 600000);
        await B.until(() => W.rel(Remote.pos).y > -1 && W.at('i1', W.rel(Remote.pos)), 5000);
        await B.sl(2800);
        await walkPts([[-7, 0, -5], [6, 0, 8], [6, 0, 50], [3.5, 0, 51], [2, 0, 56]]);
        say('reelle', 'pont de lumière A traversé');
      }
      await B.until(() => !live() || X().stage >= 2, 60000);
    }
    if (live() && X().stage === 2) {
      await B.sl(500);
      if (!dame) {
        say('reelle', 'saut B : positions des nuages annoncées par la Dame (belvédère B)');
        await B.until(() => W.rel(Remote.pos).y > 4 || !live(), 25000);
        await leapChain('B', 66.3, [0, 0, 113.5]);
        await B.walk([1, 0, 118], 0.7, 8000);
      } else {
        await walkPts([[5, 0, 55], [7, 0, 53.3], [7, 0, 62.6]]);
        say('reelle', 'sur le belvédère B, guide le Valet');
        await B.until(() => !live() || X().bridgeB, 600000);
        await B.sl(2800);
        await walkPts([[7, 0, 53.3], [0, 0, 58], [-3.5, 0, 65.2], [-6, 0, 66], [-6, 0, 112], [-1, 0, 118]]);
        say('reelle', 'pont de lumière B traversé');
      }
      await B.until(() => !live() || X().stage >= 3, 60000);
    }

    // ================= stage 3: the net =================
    const fallerOf = (ring) => (ring < 2 ? 'dame' : 'valet');
    const raftC = () => {
      const b = W.raft.b;
      return W.rel(V3((b.min[0] + b.max[0]) / 2, b.max[1], (b.min[2] + b.max[2]) / 2));
    };
    const onRaft = () => body.ground === W.raft.b;
    const ringNow = (i, dt = 0) => {
      const r = W.ringAt(i, W.clock + dt, V3());
      return [r.x + netC[0], r.y, r.z + netC[1]];
    };
    if (live() && X().stage === 3) {
      say('reelle', 'le Filet');
      let lastRing = -1, misses = 0;
      while (live() && X().stage === 3) {
        const x = X();
        if (x.ring >= 4) {
          // everyone to the diving platform
          if (x.raft !== 'dock') {
            await B.sl(200);
            continue;
          }
          const d = W.DOCKS[4];
          await walkPts([[0, 0, d[1]], [dame ? -1.5 : 1.5, 0, 205]]);
          await B.until(() => !live() || X().stage !== 3, 20000);
          continue;
        }
        const faller = fallerOf(x.ring);
        const pl = W.PLANKS[x.ring];
        if (x.ring !== lastRing) {
          lastRing = x.ring;
          say('reelle', 'anneau ' + (x.ring + 1) + ' : ' + (role === faller ? 'saute (planche ' + (x.ring + 1) + ')' : 'tient la barre du radeau'));
        }
        if (role === faller) {
          // off the raft, along the causeway, to the end of the plank
          if (onRaft()) {
            if (x.raft !== 'dock') {
              await B.sl(150);
              continue;
            }
            await B.walk([0, 0, q().z], 0.5, 5000);
          }
          if (q().y < -1) {
            await B.sl(200);
            continue;
          }
          const endX = pl.side * 4.3;
          if (Math.abs(q().z - pl.z) > 0.6 || Math.abs(q().x - endX) > 0.5) {
            await walkPts([[0, 0, pl.z], [endX, 0, pl.z]], 0.4);
            await B.walk([endX, 0, pl.z], 0.3, 2000);
          }
          // the catcher calls the drop: raft down, under the ring
          const ready = () => {
            const xx = X();
            if (xx.raft !== 'down' || xx.ring !== x.ring) return false;
            const r = raftC(), g = ringNow(x.ring, 0);
            if (r.y > -15.5 || Math.hypot(r.x - g[0], r.z - g[2]) > 1.2) return false;
            const g2 = ringNow(x.ring, 0.8);
            return Math.hypot(g2[0] - q().x, g2[2] - q().z) < 2.2;
          };
          if (!(await B.until(() => ready() || !live() || X().ring !== x.ring, 40000, 30))) continue;
          if (X().ring !== x.ring || !live()) continue;
          // drop through the ring, then onto the raft
          S.held.add('sprint');
          const t = performance.now();
          let ph = 0;
          while (performance.now() - t < 6000 && live()) {
            const p = q();
            if (ph === 0) {
              const g = ringNow(x.ring, body.grounded ? 0.8 : Math.max(0.05, Math.sqrt(Math.max(0, (p.y - W.RING_Y) / 13))));
              if (body.grounded) stick(g[0] - p.x, g[2] - p.z, 1);
              else airSteer(g[0], W.RING_Y, g[2], 0.15);
              if (p.y < W.RING_Y - 0.3) ph = 1;
            } else {
              const r = raftC();
              airSteer(r.x, r.y, r.z, 0.15);
              if (body.grounded || p.y < -24) break;
            }
            await B.sl(16);
          }
          B.stop();
          const caught = await B.until(() => X().ring !== x.ring || X().raft === 'up', 2500);
          if (caught && X().ring !== x.ring) say('reelle', 'anneau ' + (x.ring + 1) + ' passé, rattrapé');
          else {
            misses++;
            say('reelle', 'anneau ' + (x.ring + 1) + ' : manqué (' + misses + ')');
            await B.until(() => q().y > -1 && body.grounded, 6000);
          }
        } else {
          // the catcher: aboard at the dock, then steer
          if (x.raft === 'dock' && !onRaft()) {
            const d = W.DOCKS[Math.min(x.dock || 0, 4)];
            await walkPts([[0, 0, d[1]], [d[0], 0, d[1]]], 0.5);
            await B.sl(300);
            continue;
          }
          if (x.raft !== 'down') {
            await B.sl(100);
            continue;
          }
          // the way across under the causeway: along the dock side to the plank's z, then out
          const r = raftC();
          const fq = rq();
          let tx, tz;
          if (fq.y < -0.4 && fq.y > -24) {
            tx = fq.x;
            tz = fq.z;
          } else {
            const g = ringNow(x.ring, 0.3);
            tx = g[0];
            tz = g[2];
          }
          if (Math.sign(r.x) !== Math.sign(tx) && Math.abs(r.z - pl.z) > 1) tx = r.x;
          stick(tx - r.x, tz - r.z, Math.hypot(tx - r.x, tz - r.z) / 2.5);
          await B.sl(30);
        }
        await B.sl(30);
      }
      B.stop();
    }

    // ================= stage 4: the dive =================
    const nearMate = () => Remote.has && body.p.distanceTo(Remote.pos) < 3.2;
    let handT = 0;
    const tryHand = async () => {
      if (X().hand || !nearMate() || performance.now() - handT < 1600) return;
      handT = performance.now();
      if (X().hand) return;
      await B.tap('interact');
    };
    while (live() && X().stage === 4) {
      const n0 = X().diveN || 0;
      await B.until(() => body.grounded && q().y > -1, 8000);
      const bx = dame ? -0.55 : 0.55;
      await walkPts([[bx, 0, 209], [bx, 0, 214.6]], 0.4, false);
      say('reelle', 'sur le plongeoir (essai ' + (n0 + 1) + ')');
      // hand in hand before the trapdoor opens
      const tw = performance.now();
      while (live() && !X().open && performance.now() - tw < 30000) {
        if (W.onBoard(q()) && W.onBoard(rq())) await tryHand();
        else if (!W.onBoard(q())) await B.walk([bx, 0, 214.6], 0.4, 2000);
        await B.sl(100);
      }
      if (X().hand) say('reelle', 'main dans la main (E)');
      await B.until(() => X().open || !live(), 20000);
      // the dive
      S.held.add('sprint');
      const rings = W.diveRings.map((rg) => {
        const p = W.rel(rg.pos);
        return [p.x + diveC[0], p.y, p.z + diveC[1]];
      });
      const t = performance.now();
      let lastZap = 0;
      while (live() && X().stage === 4 && (X().diveN || 0) === n0 && performance.now() - t < 120000) {
        const p = q();
        if (X().landed && X().landed[role]) {
          stick(0, 0, 0);
          await B.sl(100);
          continue;
        }
        const nxt = rings.find((r) => r[1] < p.y - 0.4);
        let tx, ty, tz;
        if (nxt) [tx, ty, tz] = nxt;
        else [tx, ty, tz] = [W.WELL.x + heartC[0], W.HEART_Y, W.WELL.z + heartC[1]];
        // the lightning column is visible 1.4 s before it strikes: step out of it
        let dodge = null;
        for (const bo of W.bolts) {
          if (bo.t < 0 || bo.t >= 1.4) continue;
          const dx = p.x - bo.x, dz = p.z - bo.z;
          if (Math.hypot(dx, dz) < 3.4 && Math.abs(p.y - bo.y) < 36) {
            const d = Math.hypot(dx, dz) || 1;
            dodge = [p.x + (dx / d) * 4 + (dx ? 0 : 3), p.z + (dz / d) * 4];
          }
        }
        if (dodge) {
          stick(dodge[0] - p.x, dodge[1] - p.z, 1);
          if (performance.now() - lastZap > 3000) {
            lastZap = performance.now();
            B.note('reelle', 'éclair annoncé : écart');
          }
        } else if (body.grounded && p.y > W.HEART_Y + 3) stick(tx - p.x, tz - p.z, 1);
        else {
          const v = body.v;
          const tl = Math.max(0.3, (p.y - ty) / Math.max(2, -v.y));
          const wx = (tx - p.x) / tl - v.x, wz = (tz - p.z) / tl - v.z;
          stick(wx, wz, Math.hypot(wx, wz) / 1.5);
        }
        if (!X().hand && !body.grounded) await tryHand();
        await B.sl(16);
      }
      B.stop();
      const x = X();
      if (x.stage === 4) say('reelle', 'plongeon raté (anneaux ensemble : ' + (x.dr || []).filter((r) => r && r.dame != null && r.valet != null && Math.abs(r.dame - r.valet) < 4.5).length + ') : on remonte');
      await B.until(() => !live() || X().stage !== 4 || ((X().diveN || 0) !== n0 && q().y > -1), 15000);
    }

    // ================= stage 5: the card =================
    if (live() && X().stage === 5) {
      say('reelle', 'sur l’île-cœur');
      await B.until(() => body.grounded, 5000);
      await B.walk([W.WELL.x + (dame ? -1.2 : 1.2), W.HEART_Y, W.WELL.z + 1], 0.4, 10000);
      await B.until(() => !live(), 30000);
    }
    B.stop();
    return role + ': ' + log.slice(-4).join(' | ') + ' → ' + Story.S.phase;
  },
};
