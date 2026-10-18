// ♦ 8 · Les Ombres (tr_d6). No swap: Yoline = dame, William = valet. Pilots (régie) per stage:
//   1 dame (salle 1)   2 valet (salle 2)   3 both pose   4 valet (régie de la clé, dame = la tige)
//   5 dame (les deux lumières)   6 valet (leviers du Montreur, dame = coureuse)   7 both to the card.
// Everything goes through the keys: the pilot takes the console (E), cycles the rig items (F),
// moves them with the stick (camera yaw 0: stick x = screen side, stick z = depth / height), turns
// a cut-out (Space), steps the coloured lights notch by notch (stick x) ; the walker walks and
// jumps on the shadows (its own screen's shadow boxes, D6W.WALLS[id].solids, are what it sees).
//  · Salles 1 et 2 « ascenseur » : the pilot puts a cut-out's shadow against the start wing at
//    wing height, the walker steps on, the pilot slides the cut-out (the shadow carries the walker,
//    the level's own carry) next to the high exit wing; the walker climbs / jumps onto the wing.
//    Salle 1: projector (0, 15), cloud parked (11, 0.6), stairs (7.0, 3.02) → (-7.1, 4.2): the
//    walker rides the lowest step, then climbs the four steps (1.1 m each) to the 7.5 m wing.
//    Salle 2: projector (6.5, 48) (the tree's shadow falls off the screen), heart turned once
//    (o 2 → 3, on its side), (11, 1.65) → (-4.28, 2.4); then one double jump to the 4.5 m wing.
//  · Salle 3: both stand hand in hand at (±0.62, 84.2) (the seer's panel shows the couple).
//  · Salle 4: the dame (the shaft) moves until her shadow covers the stem of the key on her panel,
//    then describes the key (the panel is framed like the screen; the simulated voice relays the
//    picture). The valet finds, on the wall, where
//    each cut-out's shadow fills what is missing, slides it there watching it move, then nudges by
//    the resemblance shown on screen.
//  · Salle 5: the pilot tries the notch pairs until the black stretch in front of the walker's
//    post is crossable (seen on her screen; small blocks a jump clears may sit on it), the walker
//    waits on each post for it, then jumps.
//  · Montreur: the valet keeps the centre projector off (lever 1): the puppet is cornered in an
//    outer third. The dame grapples that third's ring from the apron on the far side of the
//    balconies (from under them the rope catches on the top box), lands on it and cuts the strings
//    (hold E): top knot, then the second box (jump across), then from the apron lane onto the
//    lowest box, then the jump to the second-lowest one.
// Shortcut only as a fallback (labelled, never seen used): a walker that has not crossed a pit
// room (salles 1, 2) after 5 min is teleported onto the exit wing.
window.CL = {
  timeout: 1500,
  async run() {
    const W = D6W;
    B.W = W;
    const S = Input.sim;
    const sl = B.sl;
    const now = () => performance.now();
    const ME = Story.role;
    const X = () => Story.S.x || {};
    const stage = () => X().stage;
    const live = () => !window.CL.abort && Story.S.phase === 'tr_d6';
    const me = () => B.rel();
    const mate = () => {
      const q = W.rel(Remote.pos);
      return [q.x, q.y, q.z];
    };
    const log = [];
    const say = (how, t) => {
      B.note(how, t);
      log.push(t);
    };
    const clampv = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------------- movement helpers ----------------
    const route = async (pts) => {
      for (const [k, p] of pts) {
        if (!live()) return;
        if (k === 'g') {
          const ok = await B.go(p, { near: 0.6, ms: 60000 });
          if (!ok) await B.walk(p, 0.6, 20000, true);
        } else await B.walk(p, 0.45, 20000, true);
      }
      B.stop();
    };
    // fine placement: short pushes of the stick toward the spot
    const settle = async (p, tol = 0.08, ms = 8000) => {
      p = B.abs(p);
      const t = now();
      while (now() - t < ms && live()) {
        const b = Player.body.p;
        const dx = p.x - b.x;
        const dz = p.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d < tol) {
          B.stop();
          if (Math.hypot(Player.body.v.x, Player.body.v.z) < 0.2) break;
          await sl(80);
          continue;
        }
        Cam.yaw = Math.atan2(dx, dz);
        S.x = 0;
        S.z = Math.min(1, 0.12 + d * 0.9);
        await sl(d < 0.5 ? 40 : 30);
        if (d < 0.5) {
          S.z = 0;
          await sl(90);
        }
      }
      B.stop();
      return Math.hypot(p.x - Player.body.p.x, p.z - Player.body.p.z) < tol * 1.6;
    };
    const flatDist = (p) => {
      const q = me();
      return Math.hypot(q[0] - p[0], q[2] - p[2]);
    };

    // ---------------- the régie ----------------
    const STAND = { r1: [5.5, 0, 6.3], r2: [5.5, 0, 39.3], r4: [8.5, 0, 98.2], r5: [5.5, 0, 120.3] };
    const takeConsole = async (id) => {
      for (let k = 0; k < 6 && live(); k++) {
        if (W.local.ctl) return true;
        if (!W.nearConsole(id, W.rel(Player.body.p))) {
          await B.go(STAND[id], { near: 0.4, ms: 40000 });
          await settle(STAND[id], 0.25, 3000);
        }
        await B.tap('interact');
        await sl(350);
      }
      return W.local.ctl;
    };
    const sel = async (i, n) => {
      for (let k = 0; k < 8 && W.local.sel % n !== i && live(); k++) {
        await B.tap('ability');
        await sl(150);
      }
    };
    // stick toward a target value. light: (x, z) on the floor; cut: (x, y) on its fly bar.
    // with Cam.yaw = 0 the level reads: screen side = -stick.x on x, stick.z on z (light) / y (cut)
    const drive = async (id, kind, i, tx, ty, o = {}) => {
      const w = W.WALLS[id];
      const st = stage();
      const max = o.max ?? 1;
      const t = now();
      let ok = false;
      while (now() - t < (o.ms ?? 40000) && live() && stage() === st && W.local.ctl) {
        if (o.abort && o.abort()) break;
        const it = kind === 'light' ? w.lights[i] : w.cuts[i];
        const ex = tx - it.x;
        const ey = ty - (kind === 'light' ? it.z : it.y);
        if (Math.abs(ex) < 0.012 && Math.abs(ey) < 0.012) {
          ok = true;
          break;
        }
        Cam.yaw = 0;
        let mx = clampv(-ex * 2.5, -max, max);
        let mz = clampv(ey * 2.5, -max, max);
        if (Math.abs(ex) >= 0.012 && Math.abs(mx) < 0.05) mx = ex > 0 ? -0.05 : 0.05;
        if (Math.abs(ey) >= 0.012 && Math.abs(mz) < 0.05) mz = ey > 0 ? 0.05 : -0.05;
        S.x = mx;
        S.z = mz;
        await sl(16);
      }
      S.x = 0;
      S.z = 0;
      await sl(60);
      return ok;
    };

    // ---------------- the shadows as the walker sees them ----------------
    // exposed tops of this screen's solid rectangles (what is drawn with a gold edge): [a, b, top]
    const tops = (id) => {
      const R = W.WALLS[id].solids || [];
      const out = [];
      R.forEach((r) => {
        let segs = [[r[0], r[1]]];
        R.forEach((q) => {
          if (q === r) return;
          if (q[2] > r[3] + 1.8 || q[3] < r[3] + 0.005) return;
          const nx = [];
          segs.forEach(([a, b]) => {
            if (q[1] <= a || q[0] >= b) nx.push([a, b]);
            else {
              if (q[0] > a) nx.push([a, q[0]]);
              if (q[1] < b) nx.push([q[1], b]);
            }
          });
          segs = nx;
        });
        segs.forEach(([a, b]) => {
          if (b - a >= 0.2) out.push([a, b, r[3]]);
        });
      });
      return out;
    };
    const onExit = (id) => W.onExit(id, W.rel(Player.body.p));
    // climb shadow tops toward the exit wing (viewer's right, -x), then jump onto it
    const climbTo = async (id, G) => {
      for (let k = 0; k < 9 && live(); k++) {
        if (onExit(id)) return true;
        const q = me();
        if (q[1] < 0.5) return false;
        if (G.top - q[1] <= 2.2 && q[0] - G.edge <= 3.4) {
          say('reelle', 'saut sur la coulisse de sortie depuis ' + q[1].toFixed(1) + ' m');
          await B.leap([G.x, G.top, G.z], { ms: 2500 });
          await sl(300);
          continue;
        }
        const T = tops(id).filter(([a, b, t]) => t > q[1] + 0.3 && t <= q[1] + 2.1 && (a + b) / 2 < q[0] - 0.2);
        if (!T.length) return false;
        T.sort((u, v) => Math.abs((u[0] + u[1]) / 2 - q[0]) - Math.abs((v[0] + v[1]) / 2 - q[0]));
        const s = T[0];
        await B.leap([(s[0] + s[1]) / 2, s[2], G.z], s[2] - q[1] > 1.35 ? { ms: 2500 } : { dj: false, ms: 2500 });
        await sl(250);
      }
      return onExit(id);
    };
    // the walker rides a moving shadow until it stops
    const waitLift = async () => {
      const y0 = me()[1];
      let moved = false;
      let ref = me();
      let refT = now();
      const t = now();
      while (live() && now() - t < 70000) {
        await sl(150);
        const q = me();
        if (q[1] < y0 - 0.8) return false;
        if (Math.abs(q[0] - ref[0]) + Math.abs(q[1] - ref[1]) > 0.06) {
          ref = q;
          refT = now();
          if (q[1] > y0 + 0.6) moved = true;
        } else if (moved && now() - refT > 1500) return true;
      }
      return moved;
    };
    // a shadow top held steady near the start wing: [a, b, top]
    const waitSeg = async (id, lo, hi, minB, best, minW = 0.5) => {
      let prev = null;
      let since = 0;
      const t = now();
      while (live() && now() - t < 90000) {
        const c = tops(id).filter(([a, b, top]) => top >= lo && top <= hi && b >= minB && b - a >= minW);
        const s = c.length ? c.sort(best)[0] : null;
        if (s && prev && Math.abs(s[1] - prev[1]) < 0.05 && Math.abs(s[2] - prev[2]) < 0.05) since += 0.1;
        else since = 0;
        prev = s;
        if (s && since >= 1.2) return s;
        await sl(100);
      }
      return null;
    };
    // salles 1 et 2, the walker
    const elevatorWalker = async (id, st, o) => {
      const r = W.ROOMS[id];
      const Z = r.zw - 1.2;
      const G = { x: -18.5, top: r.ew, edge: -16, z: Z };
      const t0 = now();
      let falls = 0;
      while (live() && stage() === st) {
        if (now() - t0 > 300000) {
          B.tp([-18.5, r.ew + 0.05, Z], 'salle ' + id + ' : coulisse de sortie pas atteinte en 5 min (' + falls + ' chutes), le solveur ne sait pas finir');
          await sl(2500);
          continue;
        }
        const q = me();
        if (onExit(id)) {
          await sl(300);
          continue;
        }
        if (q[0] > 15.8 && Math.abs(q[1] - 1.5) < 0.4) {
          await B.walk([17.2, 0, Z], 0.3, 4000, false);
          const seg = await waitSeg(id, o.lo, o.hi, o.minB, o.best, o.minW);
          if (!seg || stage() !== st) continue;
          const tx = o.pick(seg);
          say('reelle', 'ombre posée contre la coulisse (haut ' + seg[2].toFixed(2) + ' m) : ' + ME + ' monte dessus');
          await B.walk([tx, 0, Z], 0.12, 5000, false);
          B.stop();
          const ok = await waitLift();
          if (ok) say('reelle', 'porté par l’ombre jusqu’à x ' + me()[0].toFixed(1) + ', ' + me()[1].toFixed(1) + ' m');
          else falls++;
          continue;
        }
        if (Player.body.grounded && q[1] < 1.9 && q[0] > 10 && q[0] < 15.8) {
          // left standing on the shadow by the wing and never carried: back to the wing
          await B.walk([17.2, 0, Z], 0.3, 4000, false);
          continue;
        }
        if (Player.body.grounded && q[1] > 1.9) {
          const ok = await climbTo(id, G);
          if (!ok) {
            falls++;
            await sl(400);
          }
          continue;
        }
        await sl(250);
      }
    };
    // salles 1 et 2, the pilot: setup → wait for the walker on the shadow → lift → (fall: again)
    const elevatorPilot = async (id, st, o) => {
      const r = W.ROOMS[id];
      const n = 3;
      let phase = 'setup';
      let readyT = 0;
      while (live() && stage() === st) {
        if (!W.local.ctl) {
          await takeConsole(id);
          continue;
        }
        const m = mate();
        if (phase === 'setup') {
          await o.setup(n);
          await sel(o.ci + 1, n);
          await drive(id, 'cut', o.ci, o.from[0], o.from[1]);
          say('reelle', 'régie ' + id + ' : ombre posée contre la coulisse de départ');
          phase = 'ready';
          readyT = 0;
          continue;
        }
        if (phase === 'ready') {
          const on = m[0] > o.onX[0] && m[0] < o.onX[1] && m[1] > o.onY[0] && m[1] < o.onY[1] && m[2] > r.zw - 2.6;
          readyT = on ? readyT + 0.15 : 0;
          if (readyT >= 0.9) phase = 'lift';
          await sl(150);
          continue;
        }
        if (phase === 'lift') {
          say('reelle', 'régie ' + id + ' : la découpe glisse et porte ' + (ME === 'dame' ? 'William' : 'Yoline') + ' vers la coulisse de sortie');
          await sel(o.ci + 1, n);
          const ok = await drive(id, 'cut', o.ci, o.to[0], o.to[1], { max: 0.35, ms: 60000, abort: () => mate()[1] < o.onY[0] - 0.8 });
          phase = ok ? 'done' : 'setup';
          continue;
        }
        if (m[0] > 15.9 && Math.abs(m[1] - 1.5) < 0.35) phase = 'setup';
        await sl(250);
      }
    };

    // ---------------- salle 5 (two lights) ----------------
    const supports = () => [[16, 22, 1.5], ...W.POSTS.map(([a, b, t]) => [a, b, t]), [-22, -16, 1.5]];
    const R5Z = W.ROOMS.r5.zw - 1.2;
    const supportOf = (q) => supports().findIndex(([a, b, t]) => q[0] > a - 0.3 && q[0] < b + 0.3 && Math.abs(q[1] - t) < 0.4 && q[2] > W.ROOMS.r5.zw - 2.8);
    // a black stretch that holds between support g and support g+1, nothing in the way that a jump
    // does not clear (other bars' shadows meet by chance into small blocks, often a step up on the
    // stretch's far end: up to 1.1 m higher, a jump goes over it)
    const okStretch = (g) => {
      const sp = supports();
      const e0 = sp[g][0];
      const e1 = sp[g + 1][1];
      const R = W.WALLS.r5.solids || [];
      for (const r of R) {
        if (r[3] < 1.0 || r[3] > 3.3 || r[1] - r[0] < 1.6) continue;
        if (r[0] < e1 - 0.1 || r[1] > e0 + 0.1) continue;
        if (r[0] - e1 > 2.7 || e0 - r[1] > 2.7) continue;
        if (R.some((q) => q !== r && q[1] > e1 && q[0] < e0 && q[3] > r[3] + 1.1 && q[2] < r[3] + 2.4)) continue;
        return r;
      }
      return null;
    };
    const walkerR5 = async () => {
      const t0 = now();
      while (live() && stage() === 5) {
        const q = me();
        const g = supportOf(q);
        if (g === 4) {
          await sl(300);
          continue;
        }
        const sp = supports();
        if (g < 0) {
          // on a black stretch: on to the next post (or the exit wing)
          if (Player.body.grounded && q[1] > 1.0 && q[2] > W.ROOMS.r5.zw - 2.8) {
            let k = -1;
            sp.forEach(([a, b], i) => {
              if (b < q[0] && (k < 0 || b > sp[k][1])) k = i;
            });
            if (k >= 0) await B.leap([k === 4 ? -18.5 : (sp[k][0] + sp[k][1]) / 2, sp[k][2], R5Z], { ms: 2500 });
          } else await sl(200);
          continue;
        }
        // on support g: wait for the stretch to hold, steady for 1 s
        let prev = null;
        let since = 0;
        let r = null;
        const t1 = now();
        while (live() && stage() === 5 && now() - t1 < 60000 && supportOf(me()) === g) {
          const c = okStretch(g);
          if (c && prev && Math.abs(c[0] - prev[0]) < 0.05) since += 0.1;
          else since = 0;
          prev = c;
          if (c && since >= 1.0) {
            r = c;
            break;
          }
          await sl(100);
        }
        if (!r) continue;
        say('reelle', 'tronçon ' + (g + 1) + ' noir et solide : saut');
        await B.walk([sp[g][0] + 0.45, 0, R5Z], 0.25, 4000, false);
        await B.leap([(r[0] + r[1]) / 2, r[3], R5Z], { ms: 2500 });
        await sl(200);
      }
    };
    const setNotch = async (i, n) => {
      await sel(i, 2);
      for (let k = 0; k < 8 && W.local.notch[i] !== n && live(); k++) {
        S.x = n > W.local.notch[i] ? 1 : -1;
        await sl(70);
        S.x = 0;
        await sl(70);
      }
    };
    const lightsAt = () => W.WALLS.r5.lights.every((l, i) => Math.abs(l.x - W.NOTCH[i ? 'blue' : 'red'][W.local.notch[i]]) < 0.01);
    const pilotR5 = async () => {
      let g = 0;
      let held = -1;
      while (live() && stage() === 5) {
        if (!W.local.ctl) {
          await takeConsole('r5');
          continue;
        }
        // both lights on (one alone closes the gates)
        for (let i = 0; i < 2; i++)
          if (!W.WALLS.r5.lights[i].on) {
            await sel(i, 2);
            await B.tap('jump');
            await sl(200);
          }
        const k = supportOf(mate());
        if (k >= 0 && k < 4) g = k;
        if (k === 4) {
          await sl(300);
          continue;
        }
        if (okStretch(g)) {
          if (held !== g) {
            held = g;
            say('reelle', 'crans rouge ' + W.local.notch[0] + ' / bleu ' + W.local.notch[1] + ' : le tronçon ' + (g + 1) + ' est noir et solide');
          }
          await sl(200);
          continue;
        }
        // try the notch pairs, watching the stretch in front of the walker
        let found = false;
        for (let a = 0; a < 4 && !found; a++)
          for (let b = 0; b < 4 && !found; b++) {
            if (!live() || stage() !== 5 || !W.local.ctl) return;
            const kk = supportOf(mate());
            if (kk >= 0 && kk < 4 && kk !== g) break;
            await setNotch(0, a);
            await setNotch(1, b);
            await B.until(lightsAt, 3000, 30);
            await sl(160);
            if (okStretch(g)) found = true;
          }
        await sl(100);
      }
    };

    // ---------------- the Montreur ----------------
    const BZ = W.ROOMS.boss.zw;
    const ZL = 185.1; // the apron lane in front of the shadow strip
    const ZK = BZ - 1.3; // the knots' plane
    const secC = (s) => (W.BOSS.secs[s][0] + W.BOSS.secs[s][1]) / 2;
    const balAt = (q) => {
      const s = W.secOf(q[0]);
      if (s < 0 || q[1] < 1 || q[2] < BZ - W.BOSS.D - 0.4) return null;
      const cx = secC(s);
      for (let j = 0; j < 4; j++) {
        const [u, top, wd] = W.BAL[j];
        if (Math.abs(q[1] - top) < 0.35 && Math.abs(q[0] - (cx - u)) < wd / 2 + 0.3) return [s, j];
      }
      return null;
    };
    const toFloor = async () => {
      const q = me();
      if (q[1] > 0.4 || q[2] > ZL + 0.5) {
        await B.walk([q[0], 0, ZL], 0.3, 4000, false);
        await B.until(() => Player.body.grounded && me()[1] < 0.4, 4000, 50);
      }
    };
    const toSec = async (s) => {
      await toFloor();
      await B.walk([secC(s) + 5.6, 0, ZL], 0.5, 15000, true);
    };
    // the grapple from the apron, on the side away from the balconies' zig-zag: from under them
    // (the console side) the rope drags her into the top box from below and she hangs there
    const grapple = async (s) => {
      const ring = W.ringPos(s);
      for (let k = 0; k < 3 && live() && stage() === 6; k++) {
        await B.walk([secC(s) - 7, 0, ZL], 0.4, 10000, true);
        B.stop();
        await sl(150);
        for (let i = 0; i < 8; i++) {
          B.aim(ring);
          await sl(40);
        }
        await B.tap('ability');
        const ok = await B.until(() => Player.mode !== 'grapple' && Player.body.grounded && me()[1] > 8, 5000, 50);
        if (ok) return true;
        if (Player.mode === 'grapple') {
          // caught on something: let go (Space)
          await B.tap('jump');
          await B.until(() => Player.body.grounded, 4000, 50);
        }
        await toFloor();
      }
      return false;
    };
    const cut = async (j) => {
      S.held.add('interact');
      await B.until(() => X().cut[j] || !W.local.pose.hot || X().stage !== 6, 3500, 50);
      S.held.delete('interact');
      await sl(150);
      return !!X().cut[j];
    };
    const runner = async () => {
      const t0 = now();
      let lastCut = now();
      while (live() && stage() === 6) {
        const x = X();
        const pose = W.local.pose;
        const left = [3, 2, 0, 1].filter((i) => !x.cut[i]);
        if (!left.length || !pose.hot) {
          await sl(200);
          continue;
        }
        const s = W.secOf(pose.x);
        if (s < 0) {
          await sl(200);
          continue;
        }
        const cx = secC(s);
        const j = left[0];
        const kx = cx - W.KNOTS[j][0];
        const q = me();
        const b = balAt(q);
        if (b && b[0] === s && b[1] === j) {
          if (Math.abs(q[0] - kx) > 1.2) await B.walk([kx + (j & 1 ? 0.4 : 0.6), 0, ZK], 0.25, 3000, false);
          if (await cut(j)) {
            lastCut = now();
            say('reelle', 'fil ' + (4 - left.length + 1) + '/4 coupé (nœud ' + j + ', tiers ' + s + ')');
          }
          continue;
        }
        if (b && b[0] !== s) {
          await toSec(s);
          continue;
        }
        if (j === 3 || j === 2) {
          if (b && b[1] === 3 && j === 2) {
            await B.leap([cx + 3.6, W.BAL[2][1], ZK], { dj: false, ms: 2500 });
            continue;
          }
          if (b) {
            await toFloor();
            continue;
          }
          if (W.secOf(q[0]) !== s) await toSec(s);
          if (await grapple(s)) say('reelle', 'grappin sur l’anneau du tiers ' + s + ' : la loge du haut');
          continue;
        }
        if (j === 0 || (j === 1 && !b)) {
          if (b) {
            await toFloor();
            continue;
          }
          if (W.secOf(q[0]) !== s) await toSec(s);
          await B.walk([cx + 4.4, 0, ZL], 0.3, 10000, true);
          B.stop();
          await sl(100);
          await B.leap([cx + 4.0, W.BAL[0][1], ZK], { ms: 2500 });
          continue;
        }
        // j === 1, on a balcony of this third
        if (b[1] === 0) {
          await B.walk([cx + 2.9, 0, ZK], 0.2, 3000, false);
          await B.leap([cx + 0.6, W.BAL[1][1], ZK], { ms: 2500 });
        } else await toFloor();
      }
      return now() - t0;
    };
    const pilotBoss = async () => {
      let n = 0;
      while (live() && stage() === 6) {
        const q = W.rel(Player.body.p);
        if (!W.nearConsole('lev1', q, 2.4)) {
          await B.go([-3.2, 0, 174.6], { near: 0.4, ms: 30000 });
          continue;
        }
        if (X().lit && X().lit[1]) {
          await B.tap('interact');
          await B.until(() => !X().lit[1], 1500, 50);
          if (++n === 1) say('reelle', 'projecteur du centre éteint (levier 1) : la marionnette est coincée dans un tiers extérieur');
        }
        await sl(150);
      }
      if (n > 1) say('reelle', 'levier du centre rabattu ' + n + ' fois (la marionnette le rallume)');
    };

    // ---------------- the stages ----------------
    const stage1 = async () => {
      if (ME === 'dame') {
        say('reelle', 'Yoline à la régie de la salle des escaliers');
        await route([['g', [5.5, 0, 6.3]]]);
        await takeConsole('r1');
        await elevatorPilot('r1', 1, {
          ci: 1,
          setup: async (n) => {
            await sel(1, n);
            await drive('r1', 'cut', 0, 11, 0.6); // the cloud off the screen
            await sel(0, n);
            await drive('r1', 'light', 0, 0, 15);
          },
          from: [7.0, 3.02],
          to: [-7.1, 4.2],
          onX: [10.5, 15.95],
          onY: [1.1, 1.8],
        });
      } else {
        say('reelle', 'William par la passerelle jusqu’à la coulisse de départ');
        await route([
          ['g', [20.75, 0, 13.6]],
          ['w', [20.75, 0, 20.2]],
          ['w', [17.2, 0, 22.8]],
        ]);
        await elevatorWalker('r1', 1, {
          lo: 1.2,
          hi: 1.75,
          minB: 15.3,
          best: (u, v) => v[1] - u[1],
          pick: (s) => Math.max(s[0] + 0.3, s[1] - 0.45),
        });
      }
    };
    const stage2 = async () => {
      if (ME === 'valet') {
        say('reelle', 'William descend de la coulisse vers la régie de la salle du bosquet');
        await route([
          ['w', [-24.3, 0, 22.8]],
          ['w', [-27.5, 0, 24.6]],
          ['w', [-27.5, 0, 37.8]],
          ['w', [-24.5, 0, 36]],
          ['w', [-20.5, 0, 36]],
          ['g', [5.5, 0, 39.3]],
        ]);
        await takeConsole('r2');
        await elevatorPilot('r2', 2, {
          ci: 1,
          setup: async (n) => {
            await sel(0, n);
            await drive('r2', 'light', 0, 6.5, 48);
            await sel(2, n);
            for (let k = 0; k < 4 && (W.WALLS.r2.cuts[1].o & 3) !== 3 && live(); k++) {
              await B.tap('jump');
              await sl(220);
            }
          },
          from: [11, 1.65],
          to: [-4.28, 2.4],
          onX: [12.3, 15.95],
          onY: [0.95, 1.8],
        });
      } else {
        say('reelle', 'Yoline quitte la régie, couloir, passerelle de la salle du bosquet');
        await route([
          ['g', [-21.0, 0, 14.5]],
          ['w', [-25.0, 0, 14.5]],
          ['w', [-24.5, 0, 35.8]],
          ['w', [-20.5, 0, 36]],
          ['g', [20.75, 0, 46.6]],
          ['w', [20.75, 0, 53.0]],
          ['w', [17.2, 0, 55.8]],
        ]);
        await elevatorWalker('r2', 2, {
          lo: 1.1,
          hi: 1.75,
          minB: 13.5,
          minW: 0.2,
          best: (u, v) => v[2] - u[2],
          pick: (s) => Math.min(15.6, (s[0] + s[1]) / 2),
        });
      }
    };
    const holdPose = async (p, st) => {
      await settle(p, 0.07);
      let warned = false;
      const t = now();
      while (live() && stage() === st) {
        if (flatDist(p) > 0.14) await settle(p, 0.07, 4000);
        if (!warned && now() - t > 45000) {
          warned = true;
          say('reelle', 'salle ' + st + ' : pose tenue 45 s, ressemblance ' + Math.round((W.local.match || 0) * 100) + ' %');
        }
        await sl(300);
      }
    };
    const stage3 = async () => {
      const p = ME === 'dame' ? [0.62, 0, 84.2] : [-0.62, 0, 84.2];
      if (ME === 'dame')
        await route([
          ['w', [-24.3, 0, 55.8]],
          ['w', [-27.5, 0, 57.4]],
          ['w', [-27.5, 0, 66.2]],
          ['w', [-24.5, 0, 69]],
          ['w', [-20.5, 0, 69]],
          ['g', p],
        ]);
      else
        await route([
          ['g', [-21.0, 0, 47.5]],
          ['w', [-25.0, 0, 47.5]],
          ['w', [-24.5, 0, 69]],
          ['w', [-20.5, 0, 69]],
          ['g', p],
        ]);
      say('reelle', (ME === 'dame' ? 'Yoline' : 'William') + ' en place pour le couple (silhouette du panneau de William), main dans la main');
      await holdPose(p, 3);
    };
    // ---------------- salle 4 : the key ----------------
    // the screen region the panel frames (the level's match area), sampled finely: 1 cell = 3.3 cm
    const KA = { x0: -3.4, x1: 3.4, y0: 0, y1: 4.4 };
    const NX = 204;
    const NY = 132;
    const CW = (KA.x1 - KA.x0) / NX;
    // the seer's panel as she sees it: the dark shape on the warm canvas, one char per cell
    const readPanel = () => {
      const cv = [...document.querySelectorAll('canvas')].find((c) => c.width === 500 && c.height === 324 && c.parentElement && /silhouette/i.test(c.parentElement.textContent));
      if (!cv || cv.parentElement.style.display === 'none') return null;
      const d = cv.getContext('2d').getImageData(0, 0, 500, 324).data;
      let out = '';
      for (let r = 0; r < NY; r++)
        for (let i = 0; i < NX; i++) {
          const k = (Math.floor(((r + 0.5) * 324) / NY) * 500 + Math.floor(((i + 0.5) * 500) / NX)) * 4;
          out += d[k] + d[k + 1] + d[k + 2] < 240 ? '1' : '0';
        }
      return out.includes('1') ? out : null;
    };
    // what the screen shows (the level's own shadow test, the CPU twin of the wall's shader): the
    // bodies in the light and the cut-outs over the panel's frame, or one cut-out's shadow over a
    // wider stretch of the wall (3 frames wide, 2 high; the frame is its bottom middle)
    const onWall = (w) =>
      [Player.body.p, Remote.has ? Remote.pos : null]
        .filter(Boolean)
        .map((p) => W.rel(p))
        .filter((q) => W.inRoom('r4', q) && q.z > w.lights[0].z + 0.5);
    const shadowOf = (w, i, o) => {
      const c = w.cuts[i];
      const g = W.shadowGrid({ ...w, cuts: [{ ...c, o: o ?? c.o }] }, [], KA.x0 - 6.8, KA.x1 + 6.8, 0, 8.8, NX * 3, NY * 2);
      const pts = [];
      for (let k = 0; k < g.length; k++) if (g[k]) pts.push([(k % (NX * 3)) - NX, ((k / (NX * 3)) | 0) - NY]);
      return pts;
    };
    // where a shadow sits on the wall (its centre, metres)
    const centreOf = (pts) => {
      let a = 0;
      let b = 0;
      for (const [i, r] of pts) {
        a += i;
        b += r;
      }
      return pts.length ? [KA.x1 - (a / pts.length + 0.5) * CW, KA.y1 - (b / pts.length + 0.5) * CW] : null;
    };
    // the valet compares the described shape with the wall: where would this cut-out's shadow
    // (turned o) fill what is still missing, without darkening what should stay light
    const bestSpot = (w, T, i) => {
      const others = W.shadowGrid({ ...w, cuts: w.cuts.filter((_, j) => j !== i) }, onWall(w), KA.x0, KA.x1, KA.y0, KA.y1, NX, NY);
      let t0 = NX;
      let t1 = -1;
      let r0 = NY;
      let r1 = -1;
      for (let k = 0; k < T.length; k++)
        if (T[k] === '1') {
          const ii = k % NX;
          const rr = (k / NX) | 0;
          t0 = Math.min(t0, ii);
          t1 = Math.max(t1, ii);
          r0 = Math.min(r0, rr);
          r1 = Math.max(r1, rr);
        }
      let best = null;
      const os = w.cuts[i].turn ? [0, 1, 2, 3] : [w.cuts[i].o];
      for (const o of os) {
        const pts = shadowOf(w, i, o);
        if (!pts.length) continue;
        let m0 = 1e9;
        let m1 = -1e9;
        let n0 = 1e9;
        let n1 = -1e9;
        for (const [a, b] of pts) {
          m0 = Math.min(m0, a);
          m1 = Math.max(m1, a);
          n0 = Math.min(n0, b);
          n1 = Math.max(n1, b);
        }
        for (let dr = r0 - n1; dr <= r1 - n0; dr++)
          for (let di = t0 - m1; di <= t1 - m0; di++) {
            let sc = 0;
            for (const [a, b] of pts) {
              const ii = a + di;
              const rr = b + dr;
              if (ii < 0 || rr < 0 || ii >= NX || rr >= NY) continue;
              const k = rr * NX + ii;
              sc += T[k] === '1' ? (others[k] ? 0 : 1) : -1;
            }
            if (!best || sc > best.sc) best = { sc, o, di, dr, n: pts.length, from: centreOf(pts) };
          }
      }
      return best;
    };
    // slide cut-out i until its shadow's centre is at (gx, gy) on the wall, watching it move
    const slideShadow = async (w, i, gx, gy) => {
      const c = w.cuts[i];
      const L = c.lim || { x: [-9, 9], y: [-9, 9] };
      let k = 0.5; // how far the cut-out goes for its shadow to go 1 m (seen after the first push)
      for (let it = 0; it < 6 && live() && stage() === 4; it++) {
        const cur = centreOf(shadowOf(w, i));
        if (!cur) return false;
        const ex = gx - cur[0];
        const ey = gy - cur[1];
        if (Math.hypot(ex, ey) < 0.015) return true;
        const x0 = c.x;
        const y0 = c.y;
        await sel(i, 2);
        await drive('r4', 'cut', i, clampv(x0 + ex * k, L.x[0], L.x[1]), clampv(y0 + ey * k, L.y[0], L.y[1]), { ms: 20000 });
        const aft = centreOf(shadowOf(w, i));
        const sm = Math.hypot(aft[0] - cur[0], aft[1] - cur[1]);
        const cm = Math.hypot(c.x - x0, c.y - y0);
        if (sm > 0.1 && cm > 0.05) k = cm / sm;
      }
      return false;
    };
    const keyFit = async (w) => {
      const T = B.heard.r4panel;
      // the ring, then the teeth, then the ring once more (with the teeth in place)
      for (const i of [0, 1, 0]) {
        if (!live() || stage() !== 4) return true;
        const b = bestSpot(w, T, i);
        if (!b) continue;
        if (b.o !== w.cuts[i].o) {
          await sel(i, 2);
          for (let k = 0; k < 4 && w.cuts[i].o !== b.o && live(); k++) {
            await B.tap('jump');
            await sl(220);
          }
        }
        const c0 = centreOf(shadowOf(w, i));
        // the best spot, from where the shadow was when it was measured
        const gx = b.from[0] - b.di * CW;
        const gy = b.from[1] - b.dr * CW;
        await slideShadow(w, i, gx, gy);
        say('reelle', (i ? 'panneton' : 'anneau') + ' : son ombre glissée de (' + c0.map((v) => v.toFixed(2)).join(', ') + ') à (' + gx.toFixed(2) + ', ' + gy.toFixed(2) + ') sur le mur' + (i ? ', tourné ' + b.o : ''));
      }
      // then by the resemblance shown on screen: small nudges, kept when it rises
      const shown = async () => {
        await sl(1100);
        return W.local.match || 0;
      };
      let m = await shown();
      for (let round = 0; round < 3 && live() && stage() === 4 && m < 0.8; round++) {
        for (const i of [0, 1])
          for (const [dx, dy] of [[0.03, 0], [-0.03, 0], [0, 0.03], [0, -0.03]]) {
            if (!live() || stage() !== 4) return true;
            const c = w.cuts[i];
            const x0 = c.x;
            const y0 = c.y;
            await sel(i, 2);
            await drive('r4', 'cut', i, x0 + dx, y0 + dy, { ms: 6000 });
            const m2 = await shown();
            if (m2 > m + 0.005) m = m2;
            else await drive('r4', 'cut', i, x0, y0, { ms: 6000 });
          }
      }
      return !live() || stage() !== 4 || (W.local.match || 0) >= 0.72;
    };
    const stage4 = async () => {
      await route([
        ['g', [0, 0, 89.0]],
        ['w', [0, 0, 92.5]],
      ]);
      if (ME === 'dame') {
        // she is the shaft: she moves until her own shadow on the wall covers the panel's stem,
        // no more (starting on the room's middle line, steps halved as it gets right)
        await route([['g', [0, 0, 104]]]);
        await B.until(() => !live() || stage() !== 4 || readPanel(), 10000, 200);
        const T0 = readPanel();
        const fitMe = () => {
          const g = W.shadowGrid({ ...W.WALLS.r4, cuts: [] }, [W.rel(Player.body.p)], KA.x0, KA.x1, KA.y0, KA.y1, NX, NY);
          let sc = 0;
          for (let k = 0; k < g.length; k++) if (g[k]) sc += T0[k] === '1' ? 1 : -1;
          return sc;
        };
        let at = [0, 0, 104];
        if (T0) {
          await settle(at, 0.07);
          let best = fitMe();
          for (const step of [1.6, 0.8, 0.4, 0.2, 0.1]) {
            for (let more = true, n = 0; more && n < 12 && live() && stage() === 4; n++) {
              more = false;
              for (const [dx, dz] of [[0, step], [0, -step], [step, 0], [-step, 0]]) {
                const p = [at[0] + dx, 0, clampv(at[2] + dz, 99, 111.5)];
                await settle(p, 0.05, 4000);
                const sc = fitMe();
                if (sc > best) {
                  best = sc;
                  at = p;
                  more = true;
                  break;
                }
              }
            }
          }
          await settle(at, 0.05);
        }
        say('reelle', 'Yoline est la tige de la clé : son ombre posée sur la tige de son panneau, à (' + me()[0].toFixed(2) + ', ' + me()[2].toFixed(2) + ')');
        // she describes the shape on her panel to the valet, as precisely as she can (it is framed
        // like the screen): the simulated voice carries the picture she sees
        let told = 0;
        let warned = false;
        const t = now();
        while (live() && stage() === 4) {
          const pic = readPanel();
          if (pic && now() - told > 6000) {
            if (!told) say('info', 'Yoline décrit à William la clé de son panneau, cadré comme l’écran (voix simulée : la page relaie l’image du panneau)');
            B.tell('r4panel', pic);
            told = now();
          }
          if (flatDist(at) > 0.14) await settle(at, 0.05, 4000);
          if (!warned && now() - t > 60000) {
            warned = true;
            say('reelle', 'salle 4 : pose tenue 60 s, ressemblance ' + Math.round((W.local.match || 0) * 100) + ' %');
          }
          await sl(300);
        }
        return;
      }
      await route([['g', [8.5, 0, 98.2]]]);
      await takeConsole('r4');
      const w4 = W.WALLS.r4;
      await B.until(() => !live() || stage() !== 4 || B.heard.r4panel, 90000, 200);
      if (!B.heard.r4panel) return;
      say('reelle', 'William écoute Yoline décrire la clé et regarde le mur');
      const ok4 = await keyFit(w4);
      say('reelle', 'anneau et panneton placés à l’œil (leurs ombres sur la forme décrite), puis à la ressemblance affichée' + (stage() === 4 ? ' : ' + Math.round((W.local.match || 0) * 100) + ' %' : ' : la porte s’ouvre') + (ok4 ? '' : ' (?)'));
      while (live() && stage() === 4) {
        if (!W.local.ctl) await takeConsole('r4');
        await sl(400);
      }
    };
    const stage5 = async () => {
      await route([
        ['g', [0, 0, 111.8]],
        ['w', [0, 0, 115.0]],
      ]);
      if (ME === 'dame') {
        await route([['g', [5.5, 0, 120.3]]]);
        await takeConsole('r5');
        say('reelle', 'Yoline aux deux lumières');
        await pilotR5();
      } else {
        await route([
          ['g', [20.75, 0, 127.8]],
          ['w', [20.75, 0, 134.0]],
          ['w', [17.2, 0, 136.8]],
        ]);
        say('reelle', 'William sur la coulisse de départ de la salle des deux lumières');
        await walkerR5();
      }
    };
    const stage6 = async () => {
      if (ME === 'valet') {
        await route([
          ['w', [-24.8, 0, 136.8]],
          ['w', [-26, 0, 151.5]],
          ['w', [-26, 0, 156.5]],
          ['g', [-3.2, 0, 174.6]],
        ]);
        await pilotBoss();
      } else {
        await route([
          ['g', [-21.0, 0, 128.5]],
          ['w', [-25.0, 0, 128.5]],
          ['w', [-26, 0, 151.5]],
          ['w', [-26, 0, 156.5]],
          ['g', [-31, 0, 176.3]],
          ['w', [-31, 0, 185.1]],
        ]);
        say('reelle', 'Yoline sur l’avant-scène, en attente de la marionnette coincée');
        await runner();
      }
    };
    const stage7 = async () => {
      const q = me();
      if (ME === 'valet' && q[2] < 178) {
        await route([
          ['g', [-31, 0, 176.3]],
          ['w', [-31, 0, 185.1]],
          ['w', [-1.5, 0, 185.6]],
        ]);
      } else {
        await toFloor();
        await B.walk([ME === 'dame' ? 1.5 : -1.5, 0, 185.6], 0.4, 20000, true);
      }
      B.stop();
      say('reelle', (ME === 'dame' ? 'Yoline' : 'William') + ' à la carte');
      while (live() && stage() === 7) {
        if (Math.hypot(me()[0], me()[2] - (BZ - 1.6)) > 3) await B.walk([ME === 'dame' ? 1.5 : -1.5, 0, 185.6], 0.4, 10000, true);
        await sl(300);
      }
    };
    const STAGES = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7 };

    let last = 0;
    while (live()) {
      const st = stage();
      if (st !== last && STAGES[st]) {
        last = st;
        try {
          await STAGES[st]();
        } catch (e) {
          say('reelle', 'étape ' + st + ' : erreur du solveur ' + (e && e.message));
        }
        B.stop();
        S.held.clear();
        continue;
      }
      await sl(200);
    }
    B.stop();
    S.held.clear();
    return ME + ': ' + log.slice(-6).join(' · ');
  },
};
