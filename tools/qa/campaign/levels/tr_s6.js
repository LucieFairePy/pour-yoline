// tr_s6 « Le Sol de lave » (♠9). Kits swapped: Yoline carries the valet kit (Frost F + sword),
// William the dame kit (grapple F + rifle). Each page plays its own kit (Story.role).
//   1A  valet freezes two crust discs over the 15 m lava gap, both hop across them
//   1B  the sinking columns (fixed hop path), the 1B → C mesa
//   1C  dame: grapple ring 0 → pillar, lever A (E), grapple ring 1 → mesa D
//       valet: low stones + frost-plugged geyser → islet, lever B (E), back by stones + bridge
//   2   both on the dock → board the raft, lean to steer around rocks / lava falls, fight
//       (dame shoots, valet freezes + swords salamanders on the deck)
//   3   the Titan: valet frosts plates twice (cold = blue), dame shoots cold plates; then the
//       heart (valet double frost, dame shoots it while blue); jump shock rings, dodge rain/sink
//   4   both walk onto the card next to the column
// Everything goes through Input.sim (stick, buttons, camera); no Story.ctx.act is sent directly.
window.CL = {
  timeout: 1300,
  async run() {
    const W = TrS6;
    B.W = W;
    const Bd = Player.body;
    const S = Input.sim;
    const me = Story.role;
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_s6';
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const wait = (ms) => B.sl(ms);
    const rel = () => W.rel(Bd.p);
    const r2 = (v) => +v.toFixed(2);
    const release = () => {
      S.x = 0;
      S.z = 0;
      S.held.clear();
    };
    const tap = async (a, n = 1) => {
      S.held.add(a);
      for (let i = 0; i < n; i++) await frame();
      S.held.delete(a);
      await frame();
    };
    const until = async (fn, ms = 60000) => {
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        if (!live()) return false;
        try {
          if (fn()) return true;
        } catch (e) {}
        await frame();
      }
      return false;
    };
    // steer toward a target (level coords), jumping when the target is a gap away (o.jumpAt) and
    // double-jumping near the apex (o.dj)
    const steer = async (tgt, done, o = {}) => {
      const t0 = performance.now();
      let air = false;
      while (performance.now() - t0 < (o.ms || 20000)) {
        if (!live()) break;
        await frame();
        const q = rel();
        if (done(q)) {
          release();
          return { ok: true, q: [q.x, q.y, q.z].map(r2) };
        }
        const g = tgt(q);
        if (!g) {
          S.z = 0;
          continue;
        }
        const dx = g.x - q.x;
        const dz = g.z - q.z;
        const d = Math.hypot(dx, dz);
        Cam.yaw = Math.atan2(dx, dz);
        S.x = 0;
        S.z = d > (o.stop || 0.2) ? 1 : 0;
        if (o.sprint !== false && d > 2.5) S.held.add('sprint');
        else S.held.delete('sprint');
        if (Bd.grounded) air = false;
        const level = Math.abs(q.y - g.y) < 0.25 && d < 2.6;
        if (Bd.grounded && g.jump && !level && d < (g.jumpAt || 3.2)) {
          S.held.add('jump');
          await frame();
          S.held.delete('jump');
          air = true;
        } else if (!Bd.grounded && air && g.dj && Player.jumps < 2 && Bd.v.y < 1.5) {
          S.held.add('jump');
          await frame();
          S.held.delete('jump');
        }
      }
      release();
      const q = rel();
      return { ok: false, q: [q.x, q.y, q.z].map(r2) };
    };
    const goTo = (x, y, z, o = {}) =>
      steer(
        () => ({ x, y, z, jump: o.jump, jumpAt: o.jumpAt, dj: o.dj }),
        (q) => Math.hypot(q.x - x, q.z - z) < (o.r || 0.6) && Math.abs(q.y - y) < 0.5 && Bd.grounded,
        o,
      );
    // camera ray through a world point (third-person orbit: iterate a few frames)
    const aimAt = async (p) => {
      for (let i = 0; i < 12; i++) {
        B.aim(p);
        await frame();
      }
    };
    const frostAt = async (x, z, ly = 0) => {
      await aimAt(W.P(x, ly, z));
      await tap('ability');
    };
    const hopCol = (i) => {
      const c = W.COLS[i];
      return steer(
        () => ({ x: c.x, y: c.top, z: c.z, jump: W.colUnder(Bd) !== i, jumpAt: 4.8, dj: W.colUnder(Bd) !== i }),
        (q) => W.colUnder(Bd) === i && Math.hypot(q.x - c.x, q.z - c.z) < 0.8,
        { ms: 5000, sprint: false },
      );
    };
    // the low stones drown at high tide (announced on screen, the lava visibly rises): wait for a
    // calm window of at least 4 s
    const calm = async () => {
      for (let i = 0; i < 1500 && live(); i++) {
        const c = X().clk || 0;
        if (!W.tideWarn(c) && W.tideAt(c) < 0.02 && !W.tideWarn(c + 4) && W.tideAt(c + 4) < 0.02) return i;
        await frame();
      }
      return -1;
    };
    const grapple = async (i) => {
      for (let k = 0; k < 40 && live(); k++) {
        await aimAt(W.ringPos(i).clone().add(V3(0, 1.2, 0)));
        if (Player.lockTarget === i) break;
      }
      if (Player.lockTarget !== i) return 'pas de visée ' + Player.lockTarget;
      await tap('ability');
      for (let k = 0; k < 400; k++) {
        await frame();
        if (Player.mode === 'walk' && Bd.grounded && k > 10) break;
      }
      return B.rel();
    };
    const log = [];
    const mark = (k, v) => {
      log.push(k + '=' + (typeof v === 'string' ? v : JSON.stringify(v)));
      B.note('reelle', k + ' : ' + (typeof v === 'string' ? v : JSON.stringify(v)));
    };

    // ======================= stage 1 =======================
    await until(() => X().stage >= 1, 15000);
    if (X().stage === 1) {
      // ---- 1A: frost discs across the first lava gap ----
      const crossA = async () => {
        if ((X().cp || 0) >= 1) return { ok: true };
        const r1 = await goTo(me === 'dame' ? 0.8 : 1.1, 0.3, 10.5, { jump: true, jumpAt: 5.3, dj: true, ms: 6000 });
        if (!r1.ok) return r1;
        const r2_ = await goTo(me === 'dame' ? 0.5 : 0.7, 0.3, 15.8, { jump: true, jumpAt: 4.4, dj: true, ms: 6000 });
        if (!r2_.ok) return r2_;
        return goTo(me === 'dame' ? -1 : 1, 2, 23, { jump: true, jumpAt: 5.4, dj: true, ms: 6000 });
      };
      let a = null;
      if ((X().cp || 0) < 1) {
        for (let i = 0; i < 5 && !a && live(); i++) {
          if (me === 'valet') {
            await goTo(1, 2, 2.4, { ms: 6000, sprint: false });
            await frostAt(1, 10.5);
            await wait(300);
            await frostAt(0.6, 15.2);
            await wait(300);
          } else {
            // the partner's two discs, seen on the lava
            await until(() => (X().ice || []).filter((o) => o && (X().clk || 0) - o.t < 8).length >= 2, 30000);
            await goTo(-1.5, 2, 2.4, { ms: 6000, sprint: false });
            await wait(600);
          }
          const r = await crossA();
          if (r.ok) a = r;
          else await wait(300);
        }
        mark('1A disques de givre, traversée', !!a);
      }
      // ---- 1B: the sinking columns ----
      const PATH = [[0, 33.4], [2.5, 37], [4.3, 40.4], [2.3, 44.3], [-0.2, 47.6], [1.9, 51.4], [0.4, 55], [2.4, 58.4], [-0.3, 62], [-1.9, 65.6], [-4.2, 69.1], [-6.7, 72.8], [-4.3, 76.1]];
      let bOk = (X().cp || 0) >= 2 || rel().z > 79;
      for (let k = 0; k < 6 && !bOk && live(); k++) {
        const q = rel();
        if (q.z < 30 && Math.abs(q.y - 2) < 0.3) await goTo(me === 'dame' ? -1 : 1, 2, 28.5, { ms: 6000, sprint: false });
        if (me === 'dame' && k === 0) await wait(1200);
        let ok = true;
        for (const [x, z] of PATH) {
          const i = W.COLS.findIndex((c) => Math.hypot(c.x - x, c.z - z) < 0.3);
          if (i < 0) {
            mark('1B colonne introuvable', [x, z]);
            ok = false;
            break;
          }
          const r = await hopCol(i);
          if (!r.ok) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const e = await goTo(-3.5 + (me === 'dame' ? -1 : 1), 2, 81.6, { jump: true, jumpAt: 5.8, dj: true, ms: 5000, sprint: false });
          bOk = e.ok;
        }
      }
      mark('1B colonnes', bOk);
      // ---- 1C: the levers ----
      if (me === 'dame') {
        let ok = X().lev && X().lev.a != null;
        for (let k = 0; k < 5 && !ok && live(); k++) {
          await goTo(-8, 2, 90.5, { ms: 8000 });
          const g = await grapple(0);
          mark('grappin anneau 1', g);
          const l = await goTo(-15, 9, 107.4, { r: 0.7, ms: 4000 });
          if (!l.ok) continue;
          await tap('interact', 3);
          await wait(600);
          ok = X().lev && X().lev.a != null;
        }
        mark('levier A (E)', ok);
        await grapple(1);
        if (rel().z < 127) await goTo(0, 2, 131, { ms: 8000 });
      } else {
        let ok = X().lev && X().lev.b != null;
        for (let k = 0; k < 6 && !ok && live(); k++) {
          await goTo(9, 2, 90.8, { ms: 8000 });
          await calm();
          const s1 = await goTo(9.5, 0.8, 95.6, { jump: true, jumpAt: 4.2, dj: true, ms: 5000, sprint: false });
          if (!s1.ok) continue;
          await frostAt(13.4, 100.5, 0);
          await wait(400);
          const p = await goTo(13.4, 0.45, 100.5, { jump: true, jumpAt: 5.5, dj: true, ms: 5000, sprint: false });
          if (!p.ok) continue;
          const s2 = await goTo(13.6, 0.8, 105.2, { jump: true, jumpAt: 4.9, dj: true, ms: 5000, sprint: false });
          if (!s2.ok) continue;
          const il = await goTo(15, 2, 110.8, { jump: true, jumpAt: 4.6, dj: true, ms: 5000, sprint: false });
          if (!il.ok) continue;
          await tap('interact', 3);
          await wait(600);
          ok = X().lev && X().lev.b != null;
        }
        mark('levier B (E) sur l’îlot', ok);
        // back over the stones and the bridge (the bridge needs lever A)
        let back = rel().z > 127;
        for (let k = 0; k < 6 && !back && live(); k++) {
          await until(() => X().lev && X().lev.a != null, 90000);
          if (rel().z < 109) {
            // respawned on mesa C: run the bridge
            await goTo(0, 2, 91, { ms: 8000 });
            back = (await goTo(0, 2, 131, { ms: 9000 })).ok;
            continue;
          }
          await calm();
          const s3 = await goTo(10.2, 0.8, 115.6, { jump: true, jumpAt: 4.9, dj: true, ms: 5000, sprint: false });
          if (!s3.ok) continue;
          const s4 = await goTo(5.6, 0.8, 118.4, { jump: true, jumpAt: 5.2, dj: true, ms: 5000, sprint: false });
          if (!s4.ok) continue;
          const br = await goTo(0, 2, 118.6, { jump: true, jumpAt: 4.8, dj: true, ms: 5000, sprint: false });
          if (!br.ok) continue;
          back = (await goTo(0, 2, 131, { ms: 6000 })).ok;
        }
        mark('retour sur la mesa D', back);
      }
      // ---- the gate, the dock ----
      await until(() => X().lev && X().lev.a != null && X().lev.b != null, 120000);
      await wait(1500);
      // a fall into the lava after the gate opened sends you back to mesa C: walk the bridge
      for (let k = 0; k < 4 && live() && X().stage === 1 && !W.onDock(rel()); k++) {
        if (rel().z < 127) {
          await goTo(0, 2, 91, { ms: 8000 });
          await goTo(0, 2, 131, { ms: 9000 });
        }
        await goTo(me === 'dame' ? -1.2 : 1.2, 0.7, 165, { ms: 15000 });
      }
      mark('quai', W.onDock(rel()));
    }
    // ======================= stage 2: the raft =======================
    if (live() && X().stage <= 2) {
      await until(() => X().stage >= 2, 60000);
      if (X().stage === 2 && !X().go) {
        await goTo(me === 'dame' ? -1 : 1, 0.7, 173, { ms: 8000 });
        await until(() => X().go || X().stage !== 2, 60000);
      }
      mark('radeau parti', !!X().go);
      // lean toward the safe lane, fight what lands on the deck
      let atk = 0;
      while (live() && X().stage === 2 && !X().arrived) {
        await frame();
        const x = X();
        const rz = x.rz;
        const ru = x.ru;
        const rocks = W.ROCKS.filter(([z]) => z > rz - 4 && z < rz + 15);
        const fall = W.FALLS.findIndex((f) => f.z > rz - 4 && f.z < rz + 14);
        let want = ru;
        let bd = 1e9;
        for (let u = -W.RAFT.umax; u <= W.RAFT.umax + 1e-6; u += 0.2) {
          const clear = rocks.every(([, ur, r]) => Math.abs(u - ur) > r * 0.75 + W.RAFT.hx + 0.25);
          const dry = fall < 0 || u * W.FALLS[fall].side < -2.6;
          const cost = Math.abs(u - ru) + (clear ? 0 : 100) + (dry ? 0 : 30);
          if (cost < bd) {
            bd = cost;
            want = u;
          }
        }
        const lean = clamp((want - ru) / 1.2, -1, 1);
        const rx = W.cx(rz) + ru;
        const spot = W.P(rx + lean * (W.RAFT.hx - 0.5), W.RAFT.top, rz + (me === 'dame' ? -1.4 : 1.2));
        let foe = null;
        let fd = 1e9;
        for (const e of Enemies.list.values()) {
          const vis = (e.type === 'salamandre' && e.st === 3) || (e.type === 'cracheur' && e.st === 4);
          if (!vis) continue;
          const d = e.pos.distanceTo(Bd.p);
          if (d < fd) {
            fd = d;
            foe = e;
          }
        }
        let goal = spot;
        if (me === 'valet' && foe && foe.type === 'salamandre' && fd < 4) goal = foe.pos;
        const dx = goal.x - Bd.p.x;
        const dz = goal.z - Bd.p.z;
        const d = Math.hypot(dx, dz);
        atk -= 1 / 60;
        if (me === 'dame' && foe && fd < 30) {
          // rifle: aim at it, fire (strafe toward the spot meanwhile)
          B.aim(foe.pos.clone().add(V3(0, foe.type === 'cracheur' ? 0.7 : 0.4, 0)));
          S.held.add('attack');
          const fx = Math.sin(Cam.yaw);
          const fz = Math.cos(Cam.yaw);
          S.z = d > 0.3 ? (dx * fx + dz * fz) / d : 0;
          S.x = d > 0.3 ? (dz * fx - dx * fz) / d : 0;
        } else {
          S.held.delete('attack');
          S.x = 0;
          Cam.yaw = Math.atan2(dx, dz);
          Cam.pitch = 0.3;
          S.z = d > 0.3 ? Math.min(1, d) : 0;
          if (me === 'valet' && foe && foe.type === 'salamandre' && fd < 2.4 && atk <= 0) {
            atk = 0.6;
            Cam.yaw = Math.atan2(foe.pos.x - Bd.p.x, foe.pos.z - Bd.p.z);
            await tap('attack');
          }
        }
        // a downed partner: go and lift them (hold E)
        const rs = Remote.state;
        if (rs.down && !Combat.down) {
          const rp = Remote.pos;
          const dd = Math.hypot(rp.x - Bd.p.x, rp.z - Bd.p.z);
          S.held.delete('attack');
          Cam.yaw = Math.atan2(rp.x - Bd.p.x, rp.z - Bd.p.z);
          S.x = 0;
          S.z = dd > 1.4 ? 1 : 0;
          if (dd < 2) S.held.add('interact');
        } else S.held.delete('interact');
      }
      release();
      mark('rivière', { rz: X().rz, arrived: X().arrived, stage: X().stage });
    }
    // ======================= stage 3: the Titan, stage 4: the card =======================
    const C = W.CAL;
    const tileAt = (x, z) => W.tiles.find((t) => Math.abs(t.x - (x - C.x)) <= W.TILE / 2 && Math.abs(t.z - (z - C.z)) <= W.TILE / 2);
    // sinking tiles glow before they drop, the rain is telegraphed by rings: both on screen
    const unsafe = (t, x, clk) => {
      if (!t) return true;
      const s = x.tsink;
      if (!t.rim && s && W.inPattern(t, s) && clk - s.t > -0.5 && clk - s.t < W.SINK_LIFE) return true;
      const rn = x.rain;
      if (rn && clk < rn.t + 1.6 && rn.p.some(([px, pz]) => Math.hypot(px - (C.x + t.x), pz - (C.z + t.z)) < 3.2)) return true;
      return false;
    };
    let fcd = 0;
    let scd = 0;
    let saidBoss = false;
    let saidCard = false;
    const t0 = performance.now();
    while (live() && performance.now() - t0 < 900000) {
      await frame();
      const x = X();
      const clk = x.clk || 0;
      const q = rel();
      if (x.stage >= 4) {
        if (!saidCard) {
          saidCard = true;
          mark('Titan vaincu, vers la carte', true);
        }
        S.held.delete('attack');
        S.x = 0;
        const dx = C.x + (me === 'dame' ? -1.6 : 1.6) - q.x;
        const dz = C.z - 2.2 - q.z;
        Cam.yaw = Math.atan2(dx, dz);
        S.z = Math.hypot(dx, dz) > 0.4 ? 1 : 0;
        continue;
      }
      const ti = Enemies.boss();
      if (!ti) {
        // walk in from the dock (stage 2 arrived → 3 needs both in the arena)
        const dx = C.x + (me === 'dame' ? -2 : 2) - q.x;
        const dz = C.z - 19 - q.z;
        Cam.yaw = Math.atan2(dx, dz);
        Cam.pitch = 0.1;
        S.x = 0;
        S.z = Math.hypot(dx, dz) > 0.5 ? 1 : 0;
        continue;
      }
      if (!saidBoss) {
        saidBoss = true;
        mark('Titan', 'combat engagé');
      }
      const ang = Math.atan2(q.z - C.z, q.x - C.x);
      const rad = me === 'dame' ? 16.5 : ti.st === 2 || ti.vuln ? 10.4 : 14.5;
      let goal = { x: C.x + Math.cos(ang) * rad, z: C.z + Math.sin(ang) * rad };
      const plates = [...Enemies.list.values()].filter((e) => e.type === 'plaque');
      if (me === 'valet' && ti.st === 2) {
        // the fists rest on the tiles after a slam: go next to the nearest fist plate
        let f = null;
        let fd = 1e9;
        plates
          .filter((e) => e.k >= 2)
          .forEach((e) => {
            const d = e.pos.distanceTo(Bd.p);
            if (d < fd) {
              fd = d;
              f = e;
            }
          });
        if (f) {
          const fr = W.rel(f.pos);
          const dir = Math.atan2(fr.z - C.z, fr.x - C.x);
          goal = { x: fr.x + Math.cos(dir) * 1.8, z: fr.z + Math.sin(dir) * 1.8 };
        }
      }
      if (unsafe(tileAt(goal.x, goal.z), x, clk) || unsafe(tileAt(q.x, q.z), x, clk)) {
        let best = null;
        let bd = 1e9;
        W.tiles.forEach((t) => {
          if (unsafe(t, x, clk)) return;
          const d = Math.hypot(C.x + t.x - q.x, C.z + t.z - q.z) + Math.abs(t.r - rad) * 0.3;
          if (d < bd) {
            bd = d;
            best = t;
          }
        });
        if (best) goal = { x: C.x + best.x, z: C.z + best.z };
      }
      // the shock ring: jump as it reaches me
      if (x.wave) {
        const rr = W.POOL_R + (clk - x.wave.t) * 9.5;
        const d = Math.hypot(q.x - C.x, q.z - C.z);
        if (d - rr < 1.5 && d - rr > 0.1 && Bd.grounded) await tap('jump');
      }
      const gx = goal.x - q.x;
      const gz = goal.z - q.z;
      const gd = Math.hypot(gx, gz);
      let aimP = null;
      const heart = ti.view && ti.view.heart ? ti.view.heart.getWorldPosition(V3()) : ti.pos.clone().add(V3(0, 7, 0));
      let fire = false;
      let frost = false;
      if (me === 'dame') {
        const cold = plates.find((p) => p.vuln);
        if (cold) {
          aimP = cold.pos.clone().add(V3(0, 0.6, 0));
          fire = true;
        } else if ((ti.phase || 1) === 2 && ti.vuln) {
          aimP = heart;
          fire = true;
        } else aimP = heart;
      } else {
        const hot = plates.filter((p) => !p.vuln).sort((a, b) => a.k - b.k)[0];
        if (hot) {
          const fist = plates.find((p) => !p.vuln && p.k >= 2);
          const tgt = ti.st === 2 && fist ? fist : hot;
          aimP = tgt.pos.clone().add(V3(0, 0.6, 0));
          frost = fcd <= 0;
        } else if ((ti.phase || 1) === 2 && !ti.vuln && ti.st !== 8 && ti.st !== 9) {
          aimP = heart;
          frost = fcd <= 0;
        } else aimP = heart;
      }
      fcd -= 1 / 60;
      scd -= 1 / 60;
      if (aimP) B.aim(aimP);
      const fx = Math.sin(Cam.yaw);
      const fz = Math.cos(Cam.yaw);
      if (gd > 0.35) {
        S.z = (gx * fx + gz * fz) / gd;
        S.x = (gz * fx - gx * fz) / gd;
        if (gd > 3) S.held.add('sprint');
        else S.held.delete('sprint');
      } else {
        S.z = 0;
        S.x = 0;
      }
      if (fire) S.held.add('attack');
      else S.held.delete('attack');
      if (frost && aimP) {
        await tap('ability');
        fcd = 1.1;
      }
      // the sword: only the cooled fist plates resting on the ground (the level refuses the
      // valet's hits on the heart and the shoulder plates)
      if (me === 'valet' && scd <= 0) {
        const pl = plates.find((p) => p.vuln && p.k >= 2 && Math.hypot(p.pos.x - Bd.p.x, p.pos.z - Bd.p.z) < 3.2);
        if (pl) {
          Cam.yaw = Math.atan2(pl.pos.x - Bd.p.x, pl.pos.z - Bd.p.z);
          await tap('attack');
          scd = 0.6;
        }
      }
      if (Remote.state.down && !Combat.down) {
        const rp = Remote.pos;
        const dd = Math.hypot(rp.x - Bd.p.x, rp.z - Bd.p.z);
        Cam.yaw = Math.atan2(rp.x - Bd.p.x, rp.z - Bd.p.z);
        S.x = 0;
        S.z = dd > 1.4 ? 1 : 0;
        S.held.delete('attack');
        if (dd < 2) S.held.add('interact');
      } else S.held.delete('interact');
    }
    release();
    return me + ': ' + log.join(', ') + ' → ' + (Story.S && Story.S.phase) + '/' + (Story.S && Story.S.x && Story.S.x.stage);
  },
};
