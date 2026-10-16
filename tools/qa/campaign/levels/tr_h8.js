// tr_h8 « L’Averse » (♥9). Kits swapped: Yoline carries the valet kit, William the dame kit
// (Story.role). One umbrella (Story.S.x.umb, the valet holds it first); the rain chills whoever is
// out from under it in stages 1 and 6.
//   1  street: the holder leads, the other stays under the umbrella; barrier (the free one double-
//      jumps over, the umbrella is passed over with E, the other jumps); shutter (the free one
//      cranks outside, the holder walks in, the umbrella goes through the grille (E), the other
//      cranks inside); alley + porch together
//   2  flood A: the valet wades to the valve (path planned around the drains and currents the
//      dame sees from the balcony and points her lamp at, E held), turns it (E held); regroup
//   3  flood B: roles swapped (dame wades, valet guides from the left balcony)
//   4  dark street: the valet climbs the dark fire escape after each warned flash, pulls lever 4;
//      the dame takes the lit stair, warns (E) before each strike, crosses the bridge
//   5  dark roofs: the dame hops the roofs after warned flashes, grapples the ring (F), pulls
//      lever 5, drops into the arena; the valet warns from the glass tunnel
//   6  Storm Spirit: the free one cranks each rod (E held), the holder stands over them (hail),
//      both step out of the bolt circles; 7: both walk to the card
// All through Input.sim (stick, keys, camera). No Story.ctx.act is sent directly.
window.CL = {
  timeout: 1600,
  async run() {
    const W = H8;
    B.W = W;
    const L = W.local;
    const Bd = Player.body;
    const S = Input.sim;
    const me = Story.role;
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_h8';
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const now = () => performance.now();
    const P = (x, y, z) => W.P(x, y, z);
    const rel = (v) => W.rel(v || Bd.p);
    const mateRel = () => W.rel(Remote.pos);
    const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const holder = () => X().umb || 'valet';
    const log = [];
    const mark = (k, v) => {
      const s = k + (v === undefined ? '' : ' : ' + (typeof v === 'string' ? v : JSON.stringify(v)));
      log.push(s);
      B.note('reelle', s);
    };
    const until = async (fn, ms = 30000) => {
      const t = now();
      while (now() - t < ms) {
        if (!live()) return false;
        try {
          if (fn()) return true;
        } catch (e) {}
        await frame();
      }
      return false;
    };
    const hands = () => {
      S.x = 0;
      S.z = 0;
      S.held.delete('sprint');
    };
    const walk = (x, y, z, near = 0.5, ms = 15000, sprint = false) => B.walk(P(x, y, z), near, ms, sprint);
    const holdE = async (done, ms) => {
      S.held.add('interact');
      const ok = await until(done, ms);
      S.held.delete('interact');
      return ok;
    };

    // ---- the follower: stays right under the holder's umbrella ----
    const follow = async (stop, ms = 180000) => {
      const t = now();
      let ref = Bd.p.clone();
      let refT = now();
      while (live() && now() - t < ms && !stop()) {
        const rp = Remote.pos;
        const d = d2(rp, Bd.p);
        if (d > 0.7) {
          Cam.yaw = Math.atan2(rp.x - Bd.p.x, rp.z - Bd.p.z);
          B.steer(rp);
          if (d > 2.2) S.held.add('sprint');
          else S.held.delete('sprint');
        } else hands();
        if (now() - refT > 1500) {
          if (d > 1.6 && Bd.p.distanceTo(ref) < 0.3) {
            hands();
            await B.go(Remote.pos.clone(), { near: 0.9, ms: 6000, tries: 2 });
          }
          ref = Bd.p.clone();
          refT = now();
        }
        await frame();
      }
      hands();
    };
    // ---- the holder: walks a path, waiting for the other to keep up under the umbrella ----
    const lead = async (x, y, z, near = 0.6) => {
      const to = P(x, y, z);
      for (let tries = 0; tries < 4 && live(); tries++) {
        const pts = B.path(to, { near });
        if (!pts) return B.go(to, { near });
        let stuck = false;
        for (let i = 0; i < pts.length && !stuck; i++) {
          const p = pts[i];
          const last = i === pts.length - 1;
          let ref = Bd.p.clone();
          let refT = now();
          const st = now();
          while (live() && now() - st < 30000) {
            if (d2(p, Bd.p) < (last ? near : 0.7)) break;
            if (Remote.has && d2(Remote.pos, Bd.p) > 2.0) {
              hands();
              ref = Bd.p.clone();
              refT = now();
              await frame();
              continue;
            }
            Cam.yaw = Math.atan2(p.x - Bd.p.x, p.z - Bd.p.z);
            B.steer(p);
            await frame();
            if (now() - refT > 1500) {
              if (Bd.p.distanceTo(ref) < 0.3) stuck = true;
              ref = Bd.p.clone();
              refT = now();
            }
          }
        }
        hands();
        if (d2(to, Bd.p) < near + 0.2) return true;
      }
      return B.go(to, { near });
    };

    // ======================= stage 1: the street =======================
    const stage1 = async () => {
      // -- the barrier (z 58, 1.96 m: only a free pair of hands double-jumps it) --
      if (rel().z < 58) {
        if (holder() === me) {
          await lead(0, 0, 57.1, 0.4);
          mark('barrière : en place avec le parapluie');
          await until(() => {
            const m = mateRel();
            return m.z > 58.5 && m.z < 59.7 && Math.abs(m.x) < 1.2;
          }, 60000);
          await B.sl(400);
          for (let k = 0; k < 4 && holder() === me; k++) {
            B.face(P(0, 1, 60));
            await B.tap('interact');
            await until(() => holder() !== me, 1500);
          }
          mark('barrière : parapluie passé par-dessus (E)', holder() !== me);
          await until(() => mateRel().z > 60.5, 8000);
          for (let k = 0; k < 4 && rel().z < 58.4; k++) {
            await walk(1.2, 0, 56.4, 0.3, 5000);
            await B.leap(P(1.2, 0, 60.4));
          }
          mark('barrière : sauté (double saut)', rel().z > 58.4);
        } else {
          await follow(() => mateRel().z > 55.5 && Remote.state && d2(Remote.pos, P(0, 0, 57.1)) < 1, 240000);
          for (let k = 0; k < 4 && rel().z < 58.4; k++) {
            await walk(-1.4, 0, 56.6, 0.4, 6000);
            await B.leap(P(-1.4, 0, 60.6));
          }
          mark('barrière : sautée sans le parapluie (double saut)', rel().z > 58.4);
          await walk(0, 0, 59.0, 0.3, 6000);
          await until(() => holder() === me, 40000);
          await walk(0, 0, 62, 0.5, 5000);
          await until(() => mateRel().z > 58.6, 30000);
        }
      }
      // -- the shutter (z 86.25): a crank outside, a crank inside, the umbrella through the grille --
      if (rel().z < 86.25) {
        if (holder() === me) {
          await lead(0, 0, 83.6, 0.4);
          mark('rideau de fer : devant, parapluie en main');
          await until(() => L.shut >= 0.72, 60000);
          await walk(0, 0, 87.6, 0.3, 6000);
          mark('rideau de fer : entré(e) pendant que l’autre tourne', rel().z > 86.6);
          await until(() => {
            const m = mateRel();
            return m.z > 84.6 && m.z < 85.7 && Math.abs(m.x) < 0.8;
          }, 30000);
          await B.sl(300);
          for (let k = 0; k < 4 && holder() === me; k++) {
            B.face(P(0, 1, 84));
            await B.tap('interact');
            await until(() => holder() !== me, 1500);
          }
          mark('rideau de fer : parapluie passé à travers la grille (E)', holder() !== me);
          await walk(-3.2, 0, 89.05, 0.25, 6000);
          B.face(P(-3.2, 1, 87.9));
          await holdE(() => mateRel().z > 89.4, 40000);
          mark('manivelle intérieure tenue (E), l’autre est entré(e)', mateRel().z > 89.4);
        } else {
          await follow(() => d2(Remote.pos, P(0, 0, 83.6)) < 0.8, 240000);
          await walk(3.2, 0, 83.45, 0.25, 6000);
          B.face(P(3.2, 1, 84.6));
          await holdE(() => mateRel().z > 87.2, 40000);
          mark('manivelle extérieure tenue (E)', mateRel().z > 87.2);
          await walk(0, 0, 85.3, 0.25, 6000);
          await until(() => holder() === me, 30000);
          await until(() => L.shut >= 0.72, 40000);
          await walk(0, 0, 90.2, 0.4, 6000);
          mark('entré(e) dans la galerie avec le parapluie', rel().z > 87);
        }
      }
      // -- the alley and the porch, together under the umbrella --
      if (holder() === me) {
        await lead(0, 0, 102.8, 0.6);
        await lead(0, 0, 122.4, 0.6);
        mark('porche atteint');
      } else {
        await follow(() => X().stage !== 1);
      }
    };

    // ======================= stages 2-3: the flood =======================
    // the drains and currents only the guide sees from the balcony (her lamp shows the walker the
    // way): the walker's path is planned around them
    const plan = (k, from, goal) => {
      const Bs = W.BASINS[k];
      const PL = W.PLATES[k];
      const CU = W.CURRENTS[k];
      const st = 0.3;
      const x0 = Bs.x0 + 0.45;
      const x1 = Bs.x1 - 0.45;
      const z0 = Bs.z0 - 1.6;
      const z1 = goal[1] + 0.6;
      const nx = Math.floor((x1 - x0) / st) + 1;
      const nz = Math.floor((z1 - z0) / st) + 1;
      const cx = (i) => x0 + i * st;
      const cz = (j) => z0 + j * st;
      const band = (x, z) => CU.find(([a, b, c, d]) => x > a && x < c && z > b && z < d);
      const clr = (x, z) => {
        let m = 1e9;
        for (const [px, pz] of PL) m = Math.min(m, Math.hypot(x - px, z - pz));
        const bd = band(x, z);
        if (bd) for (const [px, pz] of PL) m = Math.min(m, Math.hypot(x + bd[4] * 0.8 - px, z - pz));
        return m;
      };
      const R0 = 1.95;
      // the lamp posts and anything else standing in the water
      const solid = (x, z) => {
        const w = P(x, 0, z);
        const r = 0.55;
        return Phys.query(w.x - r, w.z - r, w.x + r, w.z + r).some(
          (b) => b.on && b.max[0] > w.x - r && b.min[0] < w.x + r && b.max[2] > w.z - r && b.min[2] < w.z + r && b.max[1] > w.y + 0.45 && b.min[1] < w.y + 1.8,
        );
      };
      const cost = new Float32Array(nx * nz);
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          const c = clr(cx(i), cz(j));
          cost[i * nz + j] = c < R0 || solid(cx(i), cz(j)) ? Infinity : 1 + Math.max(0, 3.2 - c) * 2.5;
        }
      const ci = (x) => clamp(Math.round((x - x0) / st), 0, nx - 1);
      const cj = (z) => clamp(Math.round((z - z0) / st), 0, nz - 1);
      const s0 = ci(from.x) * nz + cj(Math.max(from.z, z0));
      const g0 = ci(goal[0]) * nz + cj(goal[1]);
      const g = new Float32Array(nx * nz).fill(Infinity);
      const came = new Int32Array(nx * nz).fill(-1);
      const done = new Uint8Array(nx * nz);
      g[s0] = 0;
      const open = [s0];
      while (open.length) {
        let bi = 0;
        for (let q = 1; q < open.length; q++) if (g[open[q]] < g[open[bi]]) bi = q;
        const k2 = open.splice(bi, 1)[0];
        if (done[k2]) continue;
        done[k2] = 1;
        if (k2 === g0) break;
        const i = (k2 / nz) | 0;
        const j = k2 % nz;
        for (let di = -1; di <= 1; di++)
          for (let dj = -1; dj <= 1; dj++) {
            if (!di && !dj) continue;
            const a = i + di;
            const b = j + dj;
            if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
            const kk = a * nz + b;
            if (done[kk] || cost[kk] === Infinity) continue;
            const ng = g[k2] + cost[kk] * (di && dj ? 1.414 : 1);
            if (ng < g[kk]) {
              g[kk] = ng;
              came[kk] = k2;
              open.push(kk);
            }
          }
      }
      if (came[g0] < 0) return null;
      const cells = [];
      for (let k2 = g0; k2 >= 0; k2 = came[k2]) cells.push([cx((k2 / nz) | 0), cz(k2 % nz)]);
      cells.reverse();
      // keep every 4th cell (the controller follows the cells closely)
      const out = cells.filter((c, i) => i % 4 === 0 || i === cells.length - 1);
      return out;
    };
    const wadeTo = async (k, pts) => {
      const CU = W.CURRENTS[k];
      for (let i = 0; i < pts.length; i++) {
        const [tx, tz] = pts[i];
        const last = i === pts.length - 1;
        const st = now();
        while (live()) {
          if (L.suck || Player.mode === 'hang') return 'aspiré';
          if (X()['valve' + k]) return 'vanne';
          const q = rel();
          const dx = tx - q.x;
          const dz = tz - q.z;
          const d = Math.hypot(dx, dz);
          if (d < (last ? 0.3 : 0.45)) break;
          if (now() - st > 12000) return 'bloqué';
          // aim so that walk + current carries me toward the point
          const ux = dx / d;
          const uz = dz / d;
          const bd = W.at('WATER_' + k, q) ? CU.find(([a, b, c, e]) => q.x > a && q.x < c && q.z > b && q.z < e) : null;
          let mx = ux;
          let mz = uz;
          if (bd) {
            const s = Math.max(1.2, 3.0 - (L.lv[k] || 0.25) * 0.6);
            const cxv = bd[4];
            const czv = bd[5];
            const dc = ux * cxv + uz * czv;
            const disc = dc * dc - (cxv * cxv + czv * czv) + s * s;
            if (disc > 0) {
              const kk = dc + Math.sqrt(disc);
              mx = ux * kk - cxv;
              mz = uz * kk - czv;
            } else {
              mx = -cxv;
              mz = uz * s;
            }
          }
          Cam.yaw = Math.atan2(mx, mz);
          S.x = 0;
          S.z = 1;
          S.held.add('sprint');
          await frame();
        }
        hands();
      }
      return 'là';
    };
    const walker = async (k) => {
      const Bs = W.BASINS[k];
      const goal = [Bs.valve[0], Bs.valve[1] - 1.15];
      for (let tries = 0; tries < 8 && live() && !X()['valve' + k]; tries++) {
        await until(() => !L.suck && Player.mode === 'walk', 5000);
        await B.sl(300);
        const q = rel();
        if (q.z < Bs.z0 - 0.2) await walk(clamp(q.x, Bs.x0 + 1, Bs.x1 - 1), 0, Bs.z0 - 1.0, 0.5, 10000);
        const pts = plan(k, rel(), goal);
        if (!pts) {
          mark('pas de chemin dans le bassin ' + k);
          return;
        }
        const r = await wadeTo(k, pts);
        mark('bassin ' + k + ' : traversée (guidé par la lampe) → ' + r);
        if (r === 'là') {
          B.face(P(Bs.valve[0], 1, Bs.valve[1]));
          await holdE(() => X()['valve' + k], 6000);
          mark('vanne ' + k + ' tournée (E maintenu)', !!X()['valve' + k]);
        } else if (r === 'aspiré') await until(() => !L.suck, 4000);
      }
      // through the gate to the other side
      const ex = k === 'A' ? 181 : 234;
      await B.sl(1500);
      // round the valve's post (it stands right in front of the gate)
      await walk(1.0, 0, Bs.valve[1] - 0.6, 0.4, 5000);
      await walk(1.0, 0, Bs.valve[1] + 1.2, 0.4, 5000);
      await walk(0, 0, ex, 0.6, 15000);
    };
    const guide = async (k) => {
      const Bs = W.BASINS[k];
      const [bx0, bx1, bz0, bz1] = Bs.bal;
      const sx = (bx0 + bx1) / 2;
      const st = X().stage;
      if (!W.at('BAL_' + k, rel())) {
        await walk(sx, 0, bz0 - 11.6, 0.5, 15000);
        await walk(sx, 5, bz0 + 1.2, 0.5, 15000);
      }
      mark('balcon ' + k + ' : lampe pointée sur le chemin (E maintenu)', W.at('BAL_' + k, rel()));
      while (live() && X().stage === st && !X()['valve' + k]) {
        const m = Remote.pos;
        const mq = mateRel();
        // the lamp a little ahead of the walker, toward the valve
        const ahead = P(mq.x * 0.6, 0, Math.min(Bs.valve[1], mq.z + 3));
        B.aim(ahead);
        const tz = clamp(mq.z + 2, bz0 + 0.8, bz1 - 0.8);
        const tgt = P(sx, 5, tz);
        if (d2(tgt, Bd.p) > 0.6) B.steer(tgt);
        else {
          S.x = 0;
          S.z = 0;
        }
        S.held.add('interact');
        void m;
        await frame();
      }
      S.held.delete('interact');
      hands();
      // down the stair that unfolds once the valve is turned
      await walk(sx, 5, bz1 - 0.4, 0.4, 15000);
      await B.sl(2600);
      await walk(sx, 0.3, bz1 + 11.2, 0.5, 15000);
      await walk(k === 'A' ? 3 : -3, 0, k === 'A' ? 181 : 234, 0.6, 10000);
      mark('bassin ' + k + ' : guide redescendu(e)', rel().z);
    };
    const flood = async (k) => {
      const Bs = W.BASINS[k];
      if (me === Bs.walker) {
        // wait for the guide to be on the stair before going in (the water starts rising then)
        await until(() => mateRel().y > 2 || X()['valve' + k], 30000);
        await walker(k);
      } else await guide(k);
    };

    // ======================= stages 4-5: the dark =======================
    const watcherWarn = async (st, doneFn) => {
      let last = null;
      while (live() && X().stage === st && !doneFn()) {
        const s = L.strike;
        if (s && s !== last && !s.amb && s.t < 1.3 && s.t > 0.15 && !(L.warnCd > 0)) {
          last = s;
          await B.tap('interact');
        }
        await frame();
      }
    };
    let lastFlash = -1e9;
    const flashSeen = (st) => {
      if ((st === 4 ? L.afterA : L.afterB) > 0.55) lastFlash = now();
    };
    // the way shows only in a warned flash: wait for one before a run of hops
    const needFlash = async (st) => {
      flashSeen(st);
      if (now() - lastFlash < 4500) return true;
      return until(() => {
        flashSeen(st);
        return now() - lastFlash < 600;
      }, 16000);
    };
    const stage4 = async () => {
      if (me === 'valet') {
        const D = W.DARK_A;
        const onPlat = () => {
          const q = rel();
          return D.findIndex(([x, top, z, sx, sz]) => Math.abs(q.x - x) < sx / 2 + 0.15 && Math.abs(q.z - z) < sz / 2 + 0.15 && Math.abs(q.y - top) < 0.4);
        };
        let hops = 0;
        for (let n = 0; n < 50 && live() && X().stage === 4 && !W.at('LROOF', rel()); n++) {
          const q = rel();
          const i = onPlat();
          if (i < 0 && q.y < 0.6) {
            await walk(-5.6, 0, 240.5, 0.35, 12000);
            await needFlash(4);
            await B.leap(P(-5.6, 1.1, 243));
            hops++;
            continue;
          }
          if (i < 0) {
            await B.sl(300);
            continue;
          }
          const [x, top, z] = D[i];
          await walk(x, top, z, 0.3, 2500);
          await needFlash(4);
          if (i === D.length - 1) await B.leap(P(-9, 14, 277.6));
          else await B.leap(P(D[i + 1][0], D[i + 1][1], D[i + 1][2]));
          hops++;
        }
        mark('escalier de secours noir grimpé (sauts après chaque éclair prévenu)', { toit: W.at('LROOF', rel()), sauts: hops });
        await walk(-9.05, 14, 279, 0.25, 6000);
        B.face(P(-10, 15, 279));
        await holdE(() => X().bridge, 8000);
        mark('levier 4 (E maintenu) : passerelle', !!X().bridge);
        await until(() => X().stage !== 4, 60000);
      } else {
        const warn = watcherWarn(4, () => X().bridge);
        await walk(5.8, 0, 240.2, 0.5, 12000);
        await walk(5.8, 14, 270.8, 0.5, 25000);
        await walk(5.8, 14, 282.5, 0.4, 10000);
        mark('escalier éclairé monté, prévient avant les éclairs (E)');
        await until(() => X().bridge, 240000);
        await warn;
        await B.sl(2600);
        await walk(-9, 14, 282.5, 0.5, 15000);
        mark('passerelle traversée', W.at('LROOF', rel()));
        await until(() => X().stage !== 4, 60000);
      }
    };
    const grapple = async () => {
      for (let k = 0; k < 60 && live(); k++) {
        B.aim(W.RING_B.wp);
        await frame();
        if (Player.lockTarget === 0) break;
      }
      if (Player.lockTarget !== 0) return 'pas de visée';
      await B.tap('ability');
      await until(() => Player.mode === 'grapple', 1500);
      await until(() => Player.mode === 'walk' && Bd.grounded, 5000);
      return JSON.stringify(B.rel());
    };
    const stage5 = async () => {
      if (me === 'dame') {
        const DB = W.DARK_B;
        const onRoof = (i) => {
          const q = rel();
          const [x0, x1, top, z0, z1] = DB[i];
          return q.x > x0 - 0.2 && q.x < x1 + 0.2 && q.z > z0 - 0.2 && q.z < z1 + 0.2 && Math.abs(q.y - top) < 0.45;
        };
        for (let n = 0; n < 40 && live() && X().stage === 5 && !X().gate; n++) {
          const q = rel();
          if (onRoof(3)) {
            await walk(-19.5, 15, 331.8, 0.25, 6000);
            B.face(P(-20, 16, 332.6));
            await holdE(() => X().gate, 6000);
            mark('levier 5 (E maintenu) : grille', !!X().gate);
          } else if (onRoof(2)) {
            await walk(-12.5, 16.6, 321.6, 0.3, 5000);
            await needFlash(5);
            mark('grappin (F) sur l’anneau', await grapple());
          } else if (onRoof(1)) {
            await walk(-12, 15.4, 317.4, 0.25, 8000);
            await needFlash(5);
            await B.leap(P(-12, 16.6, 320.4));
          } else if (onRoof(0)) {
            await walk(-12, 15.4, 308.3, 0.25, 6000);
            await needFlash(5);
            await walk(-12, 15.4, 317.4, 0.25, 8000);
          } else if (q.y > 13.5 && q.y < 14.5 && q.z < 300.5 && q.x < -7.1) {
            await walk(-12, 14, 299.2, 0.3, 10000);
            await needFlash(5);
            await B.leap(P(-12, 15.4, 305));
          } else await B.sl(400);
        }
        await until(() => X().gate, 20000);
        await walk(-14.5, 15, 333.0, 0.3, 6000);
        // off the roof edge straight through the gate (a jump would hit the lintel)
        await B.walk(P(-14.5, 14, 339.2), 0.5, 5000, true);
        await walk(-10, 14, 341, 0.6, 6000);
        mark('entrée sur le grand toit', W.at('ARENA', rel()));
      } else {
        const warn = watcherWarn(5, () => X().gate);
        await walk(-7.3, 14, 296.3, 0.4, 12000);
        await walk(-4.9, 14, 296.3, 0.4, 6000);
        await walk(-4.9, 14, 334.6, 0.5, 20000);
        mark('passerelle vitrée, prévient avant les éclairs (E)');
        await until(() => X().gate, 300000);
        await warn;
        await B.sl(1500);
        await walk(-4.9, 14, 341, 0.6, 8000);
        mark('entrée sur le grand toit', W.at('ARENA', rel()));
      }
      await until(() => X().stage !== 5, 60000);
    };

    // ======================= stage 6: the Storm Spirit =======================
    const C0 = W.C;
    const spotOf = (i) => {
      const [cx, cz] = W.crankPos(i);
      const d = Math.hypot(C0.x - cx, C0.z - cz);
      return [cx + ((C0.x - cx) / d) * 1.0, cz + ((C0.z - cz) / d) * 1.0];
    };
    const boltNear = (q) => {
      for (const T2 of W.teles) {
        if (T2.kind !== 'bolt' || T2.t < 0 || T2.t > T2.dur + 0.15) continue;
        const d = Math.hypot(q.x - T2.x, q.z - T2.z);
        if (d < T2.r + 0.9) return { T2, d };
      }
      return null;
    };
    const stage6 = async () => {
      await until(() => X().fight || X().stage !== 6, 20000);
      let cur = -1;
      let saidDodge = 0;
      while (live() && X().stage === 6 && !X().won) {
        const x = X();
        const rods = x.rods || [];
        const i = [0, 1, 2, 3].find((j) => !rods[j]);
        if (i == null) {
          hands();
          S.held.delete('interact');
          await frame();
          continue;
        }
        const iHold = holder() === me;
        const [sx, sz] = spotOf(i);
        const q = rel();
        if (i !== cur) {
          cur = i;
          S.held.delete('interact');
          mark('paratonnerre ' + (i + 1) + ' : ' + (iHold ? 'je couvre avec le parapluie' : 'je tourne la manivelle (E)'));
          if (Math.hypot(q.x - sx, q.z - sz) > 3) await B.go(P(sx, 14, sz), { near: iHold ? 1.6 : 0.6, ms: 15000 });
          continue;
        }
        let tx;
        let tz;
        if (iHold) {
          // stand between the cranker and the centre, 0.8 m from them (the canopy leans over them)
          const m = mateRel();
          const dd = Math.hypot(C0.x - m.x, C0.z - m.z) || 1;
          tx = m.x + ((C0.x - m.x) / dd) * 0.8;
          tz = m.z + ((C0.z - m.z) / dd) * 0.8;
        } else {
          tx = sx;
          tz = sz;
        }
        // a bolt circle on me: out of it until it has struck
        const bn = boltNear(q);
        if (bn) {
          const ax = q.x - bn.T2.x;
          const az = q.z - bn.T2.z;
          const al = Math.hypot(ax, az) || 1;
          tx = bn.T2.x + (ax / al) * (bn.T2.r + 2);
          tz = bn.T2.z + (az / al) * (bn.T2.r + 2);
          if (now() - saidDodge > 20000) {
            saidDodge = now();
            B.note('reelle', 'cercle de foudre : je sors du cercle puis je reviens');
          }
        }
        const tgt = P(tx, 14, tz);
        const d = d2(tgt, Bd.p);
        if (d > 0.3) {
          Cam.yaw = Math.atan2(tgt.x - Bd.p.x, tgt.z - Bd.p.z);
          B.steer(tgt);
          if (d > 1) S.held.add('sprint');
          else S.held.delete('sprint');
        } else hands();
        // E only within reach of the crank (elsewhere a fresh E press near the holder would pass the umbrella)
        if (!iHold && !bn && Math.hypot(q.x - sx, q.z - sz) < 0.5) S.held.add('interact');
        else if (!iHold && Math.hypot(q.x - sx, q.z - sz) > 0.6) S.held.delete('interact');
        else if (iHold) S.held.delete('interact');
        await frame();
      }
      hands();
      S.held.delete('interact');
      mark('paratonnerres ouverts', X().opened);
    };
    const stage7 = async () => {
      await walk(me === 'dame' ? -1.5 : 1.5, 14, 368.6, 0.5, 30000);
      mark('vers la carte');
      await until(() => !live(), 30000);
    };

    // ======================= the stages =======================
    const RUN = {
      1: stage1,
      2: () => flood('A'),
      3: () => flood('B'),
      4: stage4,
      5: stage5,
      6: stage6,
      7: stage7,
    };
    const tries = {};
    while (live()) {
      const st = X().stage;
      tries[st] = (tries[st] || 0) + 1;
      if (tries[st] > 4) {
        mark('étape ' + st + ' : abandon après 4 essais');
        break;
      }
      try {
        await RUN[st]();
      } catch (e) {
        mark('étape ' + st + ' exception', String(e && e.message));
      }
      hands();
      S.held.delete('interact');
      await until(() => X().stage !== st, st === 7 ? 30000 : 45000);
    }
    hands();
    S.held.clear();
    return me + ': ' + log.join(' | ') + ' → ' + (Story.S && Story.S.phase) + '/' + (Story.S && Story.S.x && Story.S.x.stage);
  },
};
