// Campaign solver — tr_s5 « Les Lames » (♠8). Base kits: dame = grapple + rifle, valet = sword.
// Everything through keys (Input.sim); the level's update() sends its own actions ('jam' on E at a
// lever, hits from Combat).
//   stage 1 hall, first half: the dame climbs to gallery A (left), the valet runs the lane; for each
//     trap the watcher stands at its lever and presses E when the runner waits on the pad before
//     it; the runner sprints through while it is jammed (4 s).
//   stage 2 second half: roles swapped (valet on gallery B, dame runs).
//   stage 3 armoury: three waves (rifle on flying blades and on stunned shield-bearers, sword on
//     duellists and on shields), side-steps out of the red dash lines.
//   stage 4 the Maître: the valet cracks his guard with the sword (4-5 blows), the dame shoots the
//     open heart; both side-step his telegraphed attacks, jump the saw spokes in phase 3.
//   stage 5 both to the card in the middle of the forge.
window.CL = {
  timeout: 900,
  async run() {
    const W = TrS5;
    B.W = W;
    const S = Input.sim;
    const X = () => Story.S.x;
    const role = Story.role;
    const dame = role === 'dame';
    const mateRole = dame ? 'valet' : 'dame';
    const P = () => Player.body.p;
    const rel = () => W.rel(P());
    const mate = () => W.rel(Story.ctx.pos(mateRole));
    const TT = () => W.T || 0;
    const hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const ab = () => !!CL.abort || !Story.S || Story.S.phase !== 'tr_s5';
    const log = [];
    const t0 = performance.now();
    const T = () => Math.round((performance.now() - t0) / 1000) + 's';
    const release = () => {
      S.x = 0;
      S.z = 0;
      ['attack', 'aim', 'interact', 'sprint', 'jump', 'ability'].forEach((a) => S.held.delete(a));
    };
    // walk to a level-relative point (x, z); stairs climb by themselves
    const goTo = (x, z, near = 0.45, ms = 20000, sprint = false) => B.walk([x, 0, z], near, ms, sprint);
    const path = async (pts, near = 0.5, sprint = false) => {
      for (const [x, z] of pts) {
        if (ab()) return false;
        if (!(await goTo(x, z, near, 25000, sprint))) return false;
      }
      return true;
    };

    // ================================================================ the hall
    // [trap, pad before it, next pad (end of the crossing), lane x]
    const PLAN = {
      1: [
        ['pa', -2, -16, 0],
        ['pb', -16, -32.5, 1.6],
        ['pc', -32.5, -46.5, 0],
        ['pd', -46.5, -58, 0],
      ],
      2: [
        ['pe', -68, -80.6, 0],
        ['pf', -80.6, -95, -1.6],
        ['pg', -95, -110, 0],
        ['ph', -110, -121, 0],
      ],
    };
    // time (s) the runner needs from the pad to clear the last blade of a trap, sprinting
    const need = (id, z0) => {
      const tr = W.TRAP[id];
      const last = Math.min(...tr.items.map((it) => it.z)) - (tr.kind === 'scy' ? 3.3 : tr.kind === 'drum' ? 2.4 : 0.6);
      return (z0 - last) / 7.5 + 0.35;
    };
    // the runner: waits on each pad until the watcher jams that trap, then sprints through
    const runHalf = async (half) => {
      const out = [];
      for (const [id, z0, z1, lx] of PLAN[half]) {
        let tries = 0;
        for (;;) {
          if (ab()) return out;
          await goTo(lx, z0, 0.35, 15000);
          await B.until(() => Player.body.grounded, 2000);
          const n = need(id, z0);
          const ok = await B.until(() => {
            const j = X().jam;
            return ab() || (j && j.id === id && TT() > j.s + 0.42 && TT() < j.e - n);
          }, 90000, 30);
          if (!ok || ab()) {
            out.push(id + ':nojam');
            if (++tries > 4) return out;
            continue;
          }
          const hits0 = W.hits || 0;
          await goTo(lx, z1, 0.6, 8000, true);
          const passed = rel().z < z1 + 1;
          out.push(id + (passed ? ':ok' : ':x') + ((W.hits || 0) - hits0 ? ':hit' : ''));
          if (passed || ++tries > 8) break;
        }
      }
      return out;
    };
    // the watcher: stands at each lever and jams it when the runner waits on the pad
    const watchHalf = async (half) => {
      const out = [];
      for (const [id, z0, z1] of PLAN[half]) {
        const [lx, , lz] = W.TRAP[id].lever;
        await goTo(lx < 0 ? -5.3 : 5.3, lz, 0.4, 25000);
        for (;;) {
          if (ab()) return out;
          const ok = await B.until(() => ab() || (Math.abs(mate().z - z0) < 1.2 && mate().y < 1) || mate().z < z1 + 0.5, 150000);
          if (!ok || ab() || mate().z < z1 + 0.5) break;
          await B.until(() => ab() || (!X().jam && TT() >= (X().jcd || 0)), 10000);
          Cam.yaw = lx < 0 ? Math.PI / 2 : -Math.PI / 2;
          await B.tap('interact');
          out.push(id + '@' + (X().jam ? X().jam.id : '-'));
          await B.until(() => ab() || mate().z < z1 + 0.5 || !X().jam, 9000);
          if (mate().z < z1 + 0.5) break;
        }
      }
      return out;
    };
    const hall = async () => {
      if (X().stage === 1) {
        if (dame) {
          await path([[-5.7, 10.4], [-5.7, 2.0]]);
          await B.until(() => X().gA || ab(), 8000);
          B.note('reelle', 'montée sur la passerelle A (la grille s’ouvre pour William)');
          const r = await watchHalf(1);
          B.note('reelle', 'leviers (E) moitié 1, un piège bloqué à chaque fois que William attend au repère : ' + r.join(' '));
          await path([[-5.8, -55.6], [-5.8, -63.5], [-1.6, -63]]);
        } else {
          await B.until(() => X().gA || ab(), 90000);
          const r = await runHalf(1);
          B.note('reelle', 'couloir moitié 1 couru en bas, traversée pendant chaque blocage : ' + r.join(' '));
        }
        if (!(await B.until(() => X().stage >= 2 || ab(), 90000))) return 'no st2 ' + B.rel();
      }
      if (X().stage === 2) {
        if (dame) {
          await B.until(() => X().gB || ab(), 90000);
          const r = await runHalf(2);
          B.note('reelle', 'couloir moitié 2 couru en bas : ' + r.join(' '));
          await path([[-1.5, -128], [-1.5, -138]], 0.6, true);
        } else {
          await path([[1.5, -56.6], [5.8, -56.6], [5.8, -64.5]]);
          await B.until(() => X().gB || ab(), 8000);
          B.note('reelle', 'montée sur la passerelle B');
          const r = await watchHalf(2);
          B.note('reelle', 'leviers (E) moitié 2 : ' + r.join(' '));
          await path([[5.8, -121.5], [5.8, -128.6], [1.5, -130], [1.5, -138]], 0.6);
        }
        if (!(await B.until(() => X().stage >= 3 || ab(), 90000))) return 'no st3 ' + B.rel();
      }
      return null;
    };

    // ================================================================ fighting
    let pressT = 0;
    const swingAt = (p) => {
      Cam.yaw = Math.atan2(p.x - P().x, p.z - P().z);
      if (S.held.has('attack')) S.held.delete('attack');
      else if (Combat.atkCd <= 0 && performance.now() - pressT > 120) {
        S.held.add('attack');
        pressT = performance.now();
      }
    };
    const moveTo = (dest, near = 0.5, sprint = true) => {
      if (!dest || hd(P(), dest) < near) {
        S.x = 0;
        S.z = 0;
        S.held.delete('sprint');
        return true;
      }
      B.steer(dest);
      if (sprint) S.held.add('sprint');
      else S.held.delete('sprint');
      return false;
    };
    const reviveTick = () => {
      const rs = Remote.state || {};
      if (!rs.down || Combat.down) {
        S.held.delete('interact');
        return false;
      }
      S.held.delete('attack');
      S.held.delete('aim');
      const rp = Remote.pos;
      if (hd(rp, P()) > 1.4) {
        S.held.delete('interact');
        moveTo(rp, 1.2);
      } else {
        moveTo(null);
        S.held.add('interact');
      }
      return true;
    };
    const yawOf = (e) => (e.yawT != null ? e.yawT : e.yaw);
    const aimPoint = (e) => {
      const Ty = Enemies.TYPES[e.type] || {};
      return e.pos.clone().add(V3(0, (Ty.height || 2) * 0.55, 0));
    };

    // ---- armoury: the real weapons per automaton (see the level's mult functions)
    const LINE = { lame: [12, 1.1], duelliste: [7.5, 1.3], bouclier: [9, 1.4] };
    const armPick = (e) => {
      const t = e.type;
      if (dame) {
        if (t === 'lame') return { m: 'shoot' };
        if (t === 'bouclier') return e.stun > 0 ? { m: 'shoot', pri: -20 } : null;
        return null;
      }
      if (t === 'duelliste') return { m: 'swing' };
      if (t === 'bouclier') return e.stun > 0 ? null : { m: 'swing', pri: -2 };
      // a blow only knocks a flying blade out of its dash: worth it when one is close
      if (t === 'lame') return { m: 'swing', pri: 6 };
      return null;
    };
    const AC = W.P(W.ARM_C.x, 0, W.ARM_C.z);
    const inArm = (p, r = W.ARM_R - 2.5) => {
      const dx = p.x - AC.x;
      const dz = p.z - AC.z;
      const d = Math.hypot(dx, dz);
      return d > r ? V3(AC.x + (dx / d) * r, p.y, AC.z + (dz / d) * r) : p;
    };
    let dodge = null;
    const lineDodge = () => {
      if (dodge && performance.now() < dodge.until) return dodge.to;
      dodge = null;
      for (const e of Enemies.list.values()) {
        const L = LINE[e.type];
        if (!L || e.st !== 1) continue;
        const y = yawOf(e);
        const fx = Math.sin(y);
        const fz = Math.cos(y);
        const dx = P().x - e.pos.x;
        const dz = P().z - e.pos.z;
        const along = dx * fx + dz * fz;
        const perp = dx * fz - dz * fx;
        if (along < -1 || along > L[0] + 1 || Math.abs(perp) > L[1] + 0.6) continue;
        const sgn = perp >= 0 ? 1 : -1;
        const k = L[1] + 2 - Math.abs(perp);
        dodge = { to: inArm(V3(P().x + fz * sgn * k, P().y, P().z - fx * sgn * k)), until: performance.now() + 900 };
        return dodge.to;
      }
      return null;
    };
    const armory = async () => {
      B.note('reelle', 'armurerie : ' + (dame ? 'fusil sur les lames volantes et les porte-boucliers sonnés' : 'épée sur les duellistes et les boucliers') + ', pas de côté hors des lignes rouges');
      const home = W.P(dame ? -3 : 3, 0, -146);
      let wave = X().wave;
      while (!ab() && X().stage === 3 && X().wave < 4) {
        await B.sl(50);
        if (X().wave !== wave) {
          wave = X().wave;
          B.note('reelle', 'vague ' + wave);
        }
        if (Combat.down) {
          release();
          continue;
        }
        if (reviveTick()) continue;
        const dg = lineDodge();
        let best = null;
        let bd = 1e9;
        let how = null;
        for (const e of Enemies.list.values()) {
          const h = armPick(e);
          if (!h) continue;
          const d = hd(e.pos, P()) + (h.pri || 0);
          if (d < bd) {
            bd = d;
            best = e;
            how = h;
          }
        }
        if (!best) {
          S.held.delete('attack');
          S.held.delete('aim');
          moveTo(dg || home, 0.8);
          continue;
        }
        const d = hd(best.pos, P());
        if (how.m === 'swing') {
          S.held.delete('aim');
          const reach = (Enemies.TYPES[best.type] || {}).reach || 3.2;
          if (best.type === 'lame' && d > 4) {
            // not worth chasing: back toward the middle
            moveTo(dg || home, 0.8);
            S.held.delete('attack');
            continue;
          }
          if (dg) moveTo(dg, 0.4);
          else if (d > reach - 1.2) {
            const dir = V3(P().x - best.pos.x, 0, P().z - best.pos.z).normalize();
            moveTo(V3(best.pos.x + dir.x * 1.7, P().y, best.pos.z + dir.z * 1.7), 0.4);
          } else moveTo(null);
          if (d < reach - 0.3) swingAt(best.pos);
          else S.held.delete('attack');
        } else {
          const ap = aimPoint(best);
          if (dg) {
            S.held.delete('aim');
            moveTo(dg, 0.4);
          } else if (d > 16) {
            S.held.delete('aim');
            moveTo(inArm(best.pos), 12);
          } else {
            moveTo(null);
            S.held.add('aim');
          }
          B.aim(ap);
          S.held.add('attack');
        }
      }
      release();
    };

    // ---- the Maître
    const BC = W.P(W.BOSS_C.x, 0, W.BOSS_C.z);
    const angOf = (p) => Math.atan2(p.x - BC.x, p.z - BC.z);
    const at = (a, r) => V3(BC.x + Math.sin(a) * r, P().y, BC.z + Math.cos(a) * r);
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const heartPos = (e) => (e.view && e.view.heart ? e.view.heart.getWorldPosition(V3()) : e.pos.clone().add(V3(0, 4.1, 0)));
    const boss = async () => {
      B.note('reelle', 'le Maître : ' + (dame ? 'à distance, feu sur le cœur quand sa garde est brisée' : 'au contact, épée pour briser sa garde (clic gauche à son rythme)') + ' ; pas de côté hors des zones rouges');
      let myA = angOf(P());
      let off = 0; // the dame's offset from her spot opposite the valet's flank
      let prevSt = -1;
      let spinUntil = 0;
      let flip = 1;
      const seenBoom = new Set();
      let lastJump = 0;
      let stuns = 0;
      while (!ab() && X().stage === 4) {
        await B.sl(40);
        if (Combat.down) {
          release();
          continue;
        }
        if (reviveTick()) continue;
        const e = Enemies.boss();
        const x = X();
        const p3 = x.p3 != null;
        const rMax = p3 ? Math.max(5, W.ringR(TT(), x) - 2.2) : 17;
        if (!e) {
          moveTo(at(myA, Math.min(6, rMax)), 0.8);
          continue;
        }
        const me = P();
        const dB = hd(me, BC);
        const st = e.st || 0;
        // ---- reactions to his telegraphs (each once, when it starts)
        if (st !== prevSt) {
          if (st === 2) {
            const y = yawOf(e);
            const dd = wrap(angOf(me) - y);
            if (dB < 10.8 && Math.abs(dd) < 1.35) {
              const sgn = dd >= 0 ? 1 : -1;
              if (dame) off += sgn * 0.9;
              else myA = y + sgn * 1.95;
            }
          } else if (st === 3) spinUntil = performance.now() + 1500;
          else if (st === 1 || st === 7) {
            flip = -flip;
            const step = (st === 1 ? 3.8 : 3.4) / Math.max(3, dB);
            if (dame) off += flip * step;
            else myA += flip * step;
          } else if (prevSt === 3) spinUntil = performance.now() + 250;
          prevSt = st;
        }
        if (Math.abs(off) > 1.4) off = Math.sign(off) * 0.5;
        // flying blades: off their line until they are back
        for (const b of W.booms) {
          const key = b.t0 + ':' + b.dx;
          if (seenBoom.has(key)) continue;
          const dx = me.x - b.x;
          const dz = me.z - b.z;
          const along = dx * b.dx + dz * b.dz;
          const perp = Math.abs(dx * b.dz - dz * b.dx);
          if (along > -1 && along < W.BOOM.out + 1.5 && perp < 2.0) {
            seenBoom.add(key);
            const step = 3.4 / Math.max(3, dB);
            if (dame) off += flip * step;
            else myA += flip * step;
          }
        }
        // the saw spokes (phase 3): jump the one coming at us
        if (p3 && Player.body.grounded && performance.now() - lastJump > 700 && TT() > x.p3 + 2) {
          const q = rel();
          const r = Math.hypot(q.x - W.BOSS_C.x, q.z - W.BOSS_C.z);
          const aMe = Math.atan2(-(q.z - W.BOSS_C.z), q.x - W.BOSS_C.x);
          for (let k = 0; k < 2; k++) {
            const da = wrap(aMe - W.spokeAng(TT(), x, k));
            if (r > 1.3 && da > 0 && r * da < 0.8) {
              lastJump = performance.now();
              S.held.add('jump');
              setTimeout(() => S.held.delete('jump'), 90);
              break;
            }
          }
        }
        if (dame) {
          // opposite the valet's flank, far enough to be the one his open chest turns to
          const va = angOf(Story.ctx.pos('valet'));
          const r = Math.min(9.5, rMax);
          const spot = at(va + 2.1 + off, e.stun > 0 ? Math.max(r, hd(Story.ctx.pos('valet'), BC) + 3) : r);
          const far = hd(spot, me) > 1.5;
          if (e.stun > 0) {
            moveTo(spot, 0.8, false);
            if (far) S.held.delete('aim');
            else S.held.add('aim');
            B.aim(heartPos(e));
            S.held.add('attack');
            if (!stuns || performance.now() - stuns > 5000) {
              stuns = performance.now();
              B.note('reelle', 'garde brisée : feu sur le cœur (' + Math.round(e.hp) + ' pv)');
            }
          } else {
            S.held.delete('attack');
            S.held.delete('aim');
            moveTo(spot, 0.8);
            B.face(BC);
          }
        } else {
          const r = performance.now() < spinUntil ? Math.min(8.2, rMax) : Math.min(3.6, rMax);
          const spot = at(myA, r);
          moveTo(spot, 0.5);
          if (!(e.stun > 0) && dB < 5.0 && performance.now() > spinUntil) swingAt(BC);
          else S.held.delete('attack');
        }
      }
      release();
    };

    // ================================================================ main
    try {
      while (!ab()) {
        const st = X().stage;
        if (st <= 2) {
          const e = await hall();
          if (e) return role + ': ' + e + ' ' + JSON.stringify(log);
          log.push('hall@' + T());
        } else if (st === 3) {
          if (!W.inArmory(rel())) await path([[dame ? -1.6 : 1.6, -140]], 0.8, true);
          if (X().wave < 4) await armory();
          if (ab()) break;
          if (X().wave >= 4 && X().stage === 3) {
            log.push('arm@' + T());
            B.note('reelle', 'armurerie vidée, vers la forge');
            await B.go([dame ? -1.5 : 1.5, 0, -186], { near: 0.8, ms: 40000 });
            await B.until(() => X().stage !== 3 || ab(), 30000);
          }
        } else if (st === 4) {
          await boss();
          if (X().stage === 5) log.push('boss@' + T());
        } else if (st === 5) {
          await goTo(dame ? -1 : 1, W.BOSS_C.z, 0.5, 25000, true);
          B.note('reelle', 'à la carte au cœur de la forge');
          await B.until(() => ab(), 20000);
        } else await B.sl(500);
      }
    } finally {
      release();
    }
    return role + ': done ' + (Story.S && Story.S.phase) + ' ' + T() + ' ' + JSON.stringify(log);
  },
};
