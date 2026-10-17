// ♦ 4 · Les Miroirs (tr_d2). Kits swapped: Yoline = valet, William = dame (solver uses Story.role).
// Stage 1 (La Galerie): emitter e1 (-14,10) shoots +x. Path m1 → m2 → (glass) → m3 → m4 → c1 (14.8,14).
//   Dame (♥, west) turns m1 90→225 (3 × E) and m2 0→45 (1 × E); valet (♠, east) turns m3 90→135
//   (1 × E) and m4 0→315 (1 × F). Each one stands within 2.4 m of their own mirror (update() → 'rot').
// Stage 2 (L'Atelier): dame shoots plaque ta (15.6,42) (clic → 'aim' plaque): the beam runs +x along
//   z = 42. Valet takes the mirror block bm from rack r1 (F), puts it on socket s1 (6,42) (F), turns it
//   0→45 (E: 'brot'), so the beam goes +z along x = 6; then takes the prism bp (rack r2) to s2 (6,62):
//   it splits the beam ±x into c2a (14.8,62) and c2b (-14.8,62).
// Stage 3: both walk into the arena. Stage 4 (the Guardian): the dame lights the rim turrets (clic →
//   aimA, F → aimB) of the mirror nearest the gap and of the next one; the valet turns the arena
//   mirrors to (θ + 105°) (E +15°, F −15°), nearest the gap first. Both jump the ring waves; the dame
//   side-steps the red strips. Stage 7: both walk to the card at the centre.
// The gap, the mirror angles and which turret is lit are all on screen (Story.S.x read for them).
window.CL = {
  timeout: 900,
  async run() {
    const W = TrD2;
    B.W = W;
    const me = Story.role;
    const S = Input.sim;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort || Story.S.phase !== 'tr_d2';
    const log = [];
    const q = () => W.rel(Player.body.p);
    const DEG = [30, 90, 150, 210, 270, 330];
    const mirror = (id) => W.mirrors.find((m) => m.id === id);
    const angOk = (a, set) => set.includes(a);

    // stand near a mirror stand (offset by (ox, oz)), then turn it until its angle is in `set`
    const turnMirror = async (id, set, ox, oz, stage, fwdKey = 'interact', backKey = 'ability') => {
      const m = mirror(id);
      for (let tries = 0; tries < 3 && !ab() && X().stage === stage; tries++) {
        if (Math.hypot(q().x - (m.x + ox), q().z - (m.z + oz)) > 0.5) {
          if (!(await B.go([m.x + ox, 0, m.z + oz], { near: 0.4, ms: 30000 })))
            await B.walk([m.x + ox, 0, m.z + oz], 0.4, 6000);
        }
        B.stop();
        await B.sl(250);
        let n = 0;
        while (!ab() && X().stage === stage && n < 30) {
          const cur = X().mirrors[id];
          if (angOk(cur, set)) return true;
          // shortest way to the closest accepted angle (the dame has only E: forward)
          let best = null;
          for (const t of set) {
            const fw = (((t - cur) % 360) + 360) % 360;
            const d = backKey && fw > 180 ? { k: backKey, n: 360 - fw } : { k: fwdKey, n: fw };
            if (!best || d.n < best.n) best = d;
          }
          const nm = W.nearMirror(q(), null);
          if (!nm || nm.id !== id) break; // shoved away: walk back
          await B.tap(best.k, 90);
          await B.until(() => X().mirrors[id] !== cur || X().stage !== stage, 1200, 30);
          n++;
        }
        if (angOk(X().mirrors[id], set)) return true;
      }
      return angOk(X().mirrors[id], set);
    };

    // ---------------- stage 1 · La Galerie ----------------
    if (X().stage === 1) {
      if (me === 'dame') {
        const a = await turnMirror('m1', [45, 225], 1.6, -1.2, 1, 'interact', null);
        B.note('reelle', 'dame tourne m1 (E) → ' + X().mirrors.m1 + (a ? ' ok' : ' KO'));
        const b = await turnMirror('m2', [45, 225], 1.6, -1.4, 1, 'interact', null);
        B.note('reelle', 'dame tourne m2 (E) → ' + X().mirrors.m2 + (b ? ' ok' : ' KO'));
      } else {
        const a = await turnMirror('m3', [135, 315], -1.6, -1.4, 1);
        B.note('reelle', 'valet tourne m3 (E/F) → ' + X().mirrors.m3 + (a ? ' ok' : ' KO'));
        const b = await turnMirror('m4', [135, 315], -1.6, 1.2, 1);
        B.note('reelle', 'valet tourne m4 (E/F) → ' + X().mirrors.m4 + (b ? ' ok' : ' KO'));
      }
      // the partner may still be turning; recheck own mirrors if something moved them
      while (X().stage === 1 && !ab()) {
        const own = me === 'dame' ? [['m1', 1.6, -1.2], ['m2', 1.6, -1.4]] : [['m3', -1.6, -1.4], ['m4', -1.6, 1.2]];
        for (const [id, ox, oz] of own)
          if (!angOk(X().mirrors[id], [45, 225, 135, 315].filter((v) => (me === 'dame' ? v % 180 === 45 : v % 180 === 135))))
            await turnMirror(id, me === 'dame' ? [45, 225] : [135, 315], ox, oz, 1, 'interact', me === 'dame' ? null : 'ability');
        await B.until(() => X().stage !== 1 || ab(), 3000, 200);
      }
      log.push('s1 ' + (X().stage >= 2 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');
    await B.until(() => X().stage >= 2 || ab(), 60000, 200);
    await B.sl(1200); // the doors slide open

    // ---------------- stage 2 · L'Atelier ----------------
    if (X().stage === 2) {
      if (me === 'dame') {
        await B.go([-10, 0, 36], { near: 0.6, ms: 30000 });
        await B.go([-8, 0, 46], { near: 0.6, ms: 30000 });
        let n = 0;
        while (X().stage === 2 && !ab() && n < 20) {
          if (X().aim !== 'ta') {
            for (let k = 0; k < 8; k++) {
              B.aim([15.6, 1.5, 42]);
              await B.sl(50);
            }
            await B.tap('attack', 90);
            await B.until(() => X().aim === 'ta', 1500, 50);
            n++;
            B.note('reelle', 'dame tire sur la plaque ta (clic) → aim ' + X().aim);
          }
          await B.until(() => X().stage !== 2 || X().aim !== 'ta' || ab(), 5000, 200);
        }
      } else {
        const sock = (id) => W.sockets[id];
        const toSock = async (id) => {
          const s = sock(id);
          if (!(await B.go([s.x, 0, s.z - 0.9], { near: 0.4, ms: 30000 }))) await B.walk([s.x, 0, s.z - 0.9], 0.4, 6000);
          B.stop();
          await B.sl(300);
        };
        const press = async (key, cond) => {
          await B.tap(key, 90);
          return B.until(() => cond() || X().stage !== 2, 1500, 40);
        };
        let n = 0;
        while (X().stage === 2 && !ab() && n < 40) {
          n++;
          const bl = X().blocks;
          const carried = Object.entries(bl).find(([, b]) => b.by === 'valet');
          if (carried) {
            const [id] = carried;
            const dest = id === 'bm' ? 's1' : id === 'bp' ? 's2' : 'r3';
            if (Object.values(bl).some((b) => b.at === dest)) {
              // the socket is taken (should not happen): put it back on its rack
              B.note('reelle', 'socle ' + dest + ' occupé');
            }
            await toSock(dest);
            await press('ability', () => X().blocks[id].at === dest);
            B.note('reelle', 'valet pose ' + id + ' sur ' + dest + ' (F) → ' + X().blocks[id].at);
            continue;
          }
          const bm = bl.bm;
          const bp = bl.bp;
          if (bm.at !== 's1') {
            // anything else on s1 first goes away
            const other = Object.entries(bl).find(([k, b]) => k !== 'bm' && b.at === 's1');
            const from = other ? 's1' : bm.at;
            await toSock(from);
            await press('ability', () => Object.values(X().blocks).some((b) => b.by === 'valet'));
            B.note('reelle', 'valet prend le bloc sur ' + from + ' (F)');
            continue;
          }
          if (bm.a % 180 !== 45) {
            await toSock('s1');
            const a0 = X().blocks.bm.a;
            await press('interact', () => X().blocks.bm.a !== a0);
            B.note('reelle', 'valet tourne le miroir posé (E) → ' + X().blocks.bm.a + '°');
            continue;
          }
          if (bp.at !== 's2') {
            await toSock(bp.at);
            await press('ability', () => X().blocks.bp.by === 'valet');
            B.note('reelle', 'valet prend le prisme sur ' + bp.at + ' (F)');
            continue;
          }
          // all placed: wait for the dame's aim (shown by the turret) and the crystals
          await B.until(() => X().stage !== 2 || ab(), 4000, 200);
        }
      }
      log.push('s2 ' + (X().stage >= 3 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');
    await B.until(() => X().stage >= 3 || ab(), 120000, 200);
    await B.sl(1200);

    // ---------------- stage 3 · into the arena ----------------
    const side = me === 'dame' ? -1 : 1;
    if (X().stage === 3) {
      await B.go([side * 2, 0, 80], { near: 0.8, ms: 40000 });
      await B.go([side * 2, 0, 88], { near: 0.8, ms: 20000 });
      B.note('reelle', 'entre dans l’arène ' + B.rel());
      await B.until(() => X().stage !== 3 || ab(), 60000, 200);
    }
    if (ab()) return log.join(', ');

    // ---------------- stage 4 · the Guardian ----------------
    if (X().stage === 4) {
      const seen = {};
      const ageOf = (id) => {
        const now = performance.now() / 1000;
        if (seen[id] == null) seen[id] = now;
        return now - seen[id];
      };
      // ring waves: jump as the ring reaches us (each screen counts from when it first saw it)
      let jumps = 0;
      const waver = (async () => {
        while (!ab() && X().stage === 4) {
          const bs = X().boss;
          if (bs && bs.wave) {
            const ag = ageOf('w' + bs.wave.id);
            const r = 3 + Math.max(0, ag - 0.6) * 10;
            const p = q();
            const d = Math.hypot(p.x, p.z - 100);
            if (ag >= 0.45 && d - r > 0.6 && d - r < 2.0 && Player.body.grounded && !seen['j' + bs.wave.id]) {
              seen['j' + bs.wave.id] = 1;
              S.held.add('jump');
              setTimeout(() => S.held.delete('jump'), 90);
              jumps++;
            }
          }
          (bs && bs.atk ? bs.atk : []).forEach((a) => ageOf(a.id));
          await B.sl(20);
        }
      })();
      const gapIdx = () => {
        const bs = X().boss;
        if (!bs) return null;
        const ds = DEG.map((d, i) => {
          const a = (d * Math.PI) / 180;
          return [Math.abs(Math.atan2(Math.sin(a - bs.gap), Math.cos(a - bs.gap))), i];
        }).sort((u, v) => u[0] - v[0]);
        const i0 = ds[0][1];
        // the next mirror the gap is turning to (phases 2-3), else the second nearest
        const i1 = bs.phase >= 2 ? (i0 + (bs.n % 2 ? -1 : 1) + 6) % 6 : ds[1][1];
        return [i0, i1];
      };
      if (me === 'dame') {
        const home = [0, 0, 88];
        let shots = 0;
        let dodges = 0;
        while (!ab() && X().stage === 4) {
          const bs = X().boss;
          if (!bs) {
            await B.sl(200);
            continue;
          }
          // a red strip toward me: step aside before the shard flies
          const p = q();
          const threat = (bs.atk || []).find((a) => {
            const ag = ageOf(a.id);
            if (ag > a.wind + 0.3) return false;
            const dx = Math.cos(a.ang);
            const dz = -Math.sin(a.ang);
            const along = p.x * dx + (p.z - 100) * dz;
            const perp = p.x * dz - (p.z - 100) * dx;
            return along > 1.5 && Math.abs(perp) < 1.9;
          });
          if (threat) {
            const dx = Math.cos(threat.ang);
            const dz = -Math.sin(threat.ang);
            const perp = p.x * dz - (p.z - 100) * dx;
            const s = perp >= 0 ? 1 : -1;
            await B.walk([p.x + s * dz * 2.6, 0, p.z - s * dx * 2.6], 0.3, 900, true);
            dodges++;
            continue;
          }
          if (Math.hypot(p.x - home[0], p.z - home[2]) > 3.5) await B.walk(home, 0.8, 4000, true);
          const g = gapIdx();
          if (!g) {
            await B.sl(150);
            continue;
          }
          const want = [['A', 'attack', 'aimA', g[0]], ['B', 'ability', 'aimB', g[1]]];
          let did = false;
          for (const [, key, field, i] of want) {
            const wid = 'w' + i;
            if (X()[field] === wid || X().stage !== 4) continue;
            const w = W.ARENA.wells[i];
            for (let k = 0; k < 8; k++) {
              B.aim([w[1], 1.5, w[2]]);
              await B.sl(40);
            }
            await B.tap(key, 90);
            await B.until(() => X()[field] === wid || X().stage !== 4, 800, 40);
            shots++;
            did = true;
          }
          if (!did) await B.sl(150);
        }
        B.note('reelle', 'dame allume les tourelles (clic / F) du miroir le plus proche de la brèche : ' + shots + ' tirs, ' + dodges + ' pas de côté, ' + jumps + ' sauts');
      } else {
        let turns = 0;
        while (!ab() && X().stage === 4) {
          const bs = X().boss;
          const g = gapIdx();
          if (!bs || !g) {
            await B.sl(200);
            continue;
          }
          const sol = (i) => (DEG[i] + 105) % 360;
          // nearest first; when it is right, prepare the next one
          const i = X().mirrors['a' + g[0]] !== sol(g[0]) ? g[0] : X().mirrors['a' + g[1]] !== sol(g[1]) ? g[1] : null;
          if (i == null) {
            await B.sl(150);
            continue;
          }
          const m = mirror('a' + i);
          const a = (DEG[i] * Math.PI) / 180;
          // stand just outside the mirror, on its radius (1.7 m away)
          const sx = Math.cos(a) * 10.7;
          const sz = 100 - Math.sin(a) * 10.7;
          if (Math.hypot(q().x - sx, q().z - sz) > 0.9) {
            if (!(await B.go([sx, 0, sz], { near: 0.6, ms: 8000, tries: 2 }))) await B.walk([sx, 0, sz], 0.6, 3000, true);
          }
          B.stop();
          const nm = W.nearMirror(q(), null);
          if (!nm || nm.id !== m.id) {
            await B.sl(200);
            continue;
          }
          // turn only while the gap still points at it (or the next one)
          for (let k = 0; k < 14 && !ab() && X().stage === 4; k++) {
            const cur = X().mirrors[m.id];
            if (cur === sol(i)) break;
            const g2 = gapIdx();
            if (!g2 || !g2.includes(i)) break;
            const nm2 = W.nearMirror(q(), null);
            if (!nm2 || nm2.id !== m.id) break;
            const fw = (((sol(i) - cur) % 360) + 360) % 360;
            await B.tap(fw <= 180 ? 'interact' : 'ability', 80);
            await B.until(() => X().mirrors[m.id] !== cur || X().stage !== 4, 900, 25);
            turns++;
          }
        }
        B.note('reelle', 'valet tourne les miroirs de l’arène (E/F) vers la brèche : ' + turns + ' crans, ' + jumps + ' sauts');
      }
      await waver;
      log.push('boss ' + (X().stage === 7 ? 'brisé, fissures ' + X().cracks : 'stage ' + X().stage));
    }
    if (ab()) return log.join(', ');

    // ---------------- stage 7 · the card ----------------
    await B.until(() => X().stage === 7 || ab(), 30000, 200);
    if (X().stage === 7) {
      await B.sl(800);
      if (!(await B.go([side * 1.2, 0, 100], { near: 0.6, ms: 30000 }))) await B.walk([side * 1.2, 0, 100], 0.6, 8000);
      B.note('reelle', 'marche jusqu’à la carte ' + B.rel());
      await B.until(() => ab(), 30000, 200);
    }
    log.push('fin ' + Story.S.phase);
    return me + ': ' + log.join(', ');
  },
};
