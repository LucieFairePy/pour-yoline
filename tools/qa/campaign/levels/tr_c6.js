// tr_c6 « Les Mondes miroirs » — campaign solver (both pages). Each page plays its own garden:
// side 'U' (day, above) / 'L' (night, below), from C6M.sideOf(S.x, Story.role) (valet above at
// first, every inversion swaps, stage 5 brings both above). Everything goes through Input.sim:
//  - stage 1: E at the levers (the level's update() sends {a:'lever'}), walking the bridges once
//    they are up; the bridge of reflections is crossed side by side (step by step, waiting for the
//    partner's height along z, which each one sees through the mirror);
//  - stage 2: E to pick / throw in the well / place (update() sends pick / well / place). Which
//    lock takes the key (S.x.keySlot) is drawn on the Dame's screen (glyphs) — she tells the Valet;
//  - stage 3: inversion circles, the day hold plate + the Dame's grapple (aim at the ring, F),
//    the twin dials (one steps on, the other steps on when they see it), the 3 m jump at z 215-218;
//  - stage 4: the striker walks under the Reflet and presses E while it is figé (st 2, visible: it
//    reddens); the lure sidesteps the telegraphed attacks (drawn on screen) and jumps the rings;
//  - stage 5: both walk to the card in the middle of the arena.
// Nothing writes Story.S or the level's state.
window.CL = {
  timeout: 1300,
  async run() {
    const W = C6M;
    const L = W.local;
    const S = Input.sim;
    const role = Story.role;
    const sl = B.sl;
    const X = () => Story.S.x;
    const inLevel = () => Story.S && Story.S.phase === 'tr_c6';
    const ck = () => {
      if (CL.abort) throw new Error('abort');
    };
    const myW = () => W.worldOf(Player.body.p);
    const side = () => W.sideOf(X(), role);
    const me = () => W.rel(Player.body.p);
    const mate = () => W.rel(Remote.pos);
    // level-relative coords in the world I stand in
    B.W = { P: (x, y, z) => W.P(myW(), x, y, z), rel: (p) => W.rel(p) };
    const wait = async (fn, ms = 30000, step = 100) => {
      const t = performance.now();
      while (performance.now() - t < ms) {
        ck();
        if (!inLevel()) return false;
        try {
          if (fn()) return true;
        } catch (e) {}
        await sl(step);
      }
      return false;
    };
    // settled: not in an inversion's flight, standing in the world the level wants me in
    const settled = () => !L.trans && Player.mode !== 'frozen' && myW() === side();
    const walk = async (x, z, o = {}) => {
      ck();
      await wait(settled, 8000);
      return B.walk([x, 0, z], o.near ?? 0.6, o.ms ?? 15000, o.sprint ?? false);
    };
    const go = async (x, z, o = {}) => {
      ck();
      await wait(settled, 8000);
      const ok = await B.go([x, 0, z], { near: o.near ?? 0.7, ms: o.ms ?? 30000, tries: 4 });
      if (ok) return true;
      return B.walk([x, 0, z], o.near ?? 0.7, 8000, false);
    };
    const out = [];

    await B.until(() => W.built && X() && X().items, 20000);
    B.note('reelle', 'départ : ' + role + ' côté ' + side() + ' (étape ' + X().stage + ')');

    // ---------------- stage 1: the four chasms ----------------
    // E at a lever until its effect shows (partner close enough along z, else « miroir trouble »)
    const lever = async (id, done) => {
      if (done()) return true;
      const [, , lx, lz] = W.LEVERS[id];
      await wait(() => !Remote.has || Math.abs(mate().z - me().z) < 14, 20000);
      await walk(lx > 0 ? lx - 1.2 : lx + 1.2, lz, { near: 0.4 });
      for (let k = 0; k < 6 && !done(); k++) {
        B.face([lx, 0.9, lz]);
        await B.tap('interact');
        await wait(done, 1500);
      }
      B.note('reelle', 'levier ' + id + ' (E) → ' + (done() ? 'ok' : 'SANS EFFET'));
      return done();
    };
    const stage1 = async () => {
      const s = side();
      const x = X;
      if (s === 'U') {
        // gap 1: my lever raises the night bridge; the night lever raises mine
        await walk(1.4, 9, { near: 0.5, sprint: true });
        await lever('l1U', () => x().b1L);
        await wait(() => x().b1U, 60000);
        await walk(0, 10.8, { near: 0.4 });
        await walk(0, 21.5, { near: 0.5 });
        B.note('reelle', 'gouffre 1 traversé (passerelle levée par le partenaire)');
        // gap 2: the single bridge starts on my side; I cross then send it over
        await walk(0, 30.5, { near: 0.5 });
        await wait(() => x().b2 === 'U', 30000);
        await walk(0, 41.5, { near: 0.5 });
        await lever('l2Uf', () => x().b2 === 'L');
        B.note('reelle', 'gouffre 2 traversé, passerelle envoyée de l’autre côté');
        // gap 3: half bridges; island lever swaps them
        await walk(0, 48.5, { near: 0.5 });
        await wait(() => x().b3 === 0, 30000);
        await walk(0, 56, { near: 0.5 });
        await lever('l3Ui', () => x().b3 === 1);
        await walk(0, 63.5, { near: 0.5 });
        B.note('reelle', 'gouffre 3 traversé (demi-passerelles)');
      } else {
        await walk(0, 10.8, { near: 0.4, sprint: true });
        await wait(() => x().b1L, 60000);
        await walk(0, 21.5, { near: 0.5 });
        await lever('l1L', () => x().b1U);
        B.note('reelle', 'gouffre 1 traversé, passerelle du partenaire levée');
        await walk(0, 30.5, { near: 0.5 });
        await wait(() => x().b2 === 'L', 90000);
        await walk(0, 41.5, { near: 0.5 });
        B.note('reelle', 'gouffre 2 traversé (passerelle envoyée par le partenaire)');
        await walk(0, 48.5, { near: 0.5 });
        await wait(() => x().b3 === 1, 90000);
        await walk(0, 56, { near: 0.5 });
        // the partner must be past their second half before I swap the halves back
        await wait(() => !Remote.has || mate().z > 62.3, 20000);
        await lever('l3Li', () => x().b3 === 0);
        await walk(0, 63.5, { near: 0.5 });
        B.note('reelle', 'gouffre 3 traversé (demi-passerelles)');
      }
      // gap 4: the bridge of reflections, side by side
      for (let tries = 0; tries < 6 && X().stage === 1; tries++) {
        await walk(W.MARK4[0], W.MARK4[1], { near: 0.5 });
        if (!(await wait(() => X().b4 || X().stage !== 1, 60000))) break;
        if (X().stage !== 1) break;
        B.note('reelle', 'sur la marque, pont des reflets formé');
        let t = me().z;
        while (X().stage === 1 && X().b4 && me().z < 87.6) {
          ck();
          const next = Math.min(t + 2, 88);
          await wait(() => !Remote.has || mate().z >= t - 0.8 || !X().b4, 8000, 50);
          if (!X().b4) break;
          await walk(0, next, { near: 0.4, ms: 4000 });
          t = next;
        }
        if (me().z >= 86.6) {
          await wait(() => X().stage !== 1, 20000);
          break;
        }
        B.note('reelle', 'le pont s’est brisé (ou chute) : retour aux marques');
        await sl(1500);
      }
      B.note('reelle', 'section 1 finie → étape ' + X().stage);
    };

    // ---------------- stage 2: the well ----------------
    const items = () => X().items;
    const heldId = () => Object.keys(items()).find((id) => items()[id].s === 'held' && items()[id].h === role);
    const pick = async (id) => {
      for (let k = 0; k < 5; k++) {
        if (heldId() === id) return true;
        const it = items()[id];
        if (it.w !== myW() || it.s === 'held') return false;
        // the key's cage stands on a pedestal (collider): take it from just in front
        if (it.s === 'cage') await go(it.p[0] - 1.3, it.p[2], { near: 0.4 });
        else await go(it.p[0], it.p[2], { near: 0.9 });
        await B.tap('interact');
        await wait(() => heldId() === id, 1500);
      }
      B.note('reelle', 'prendre ' + id + ' (E) → ' + (heldId() === id ? 'ok' : 'ÉCHEC'));
      return heldId() === id;
    };
    const throwIt = async (id) => {
      const w0 = myW();
      for (let k = 0; k < 5; k++) {
        await go(0, W.WELL.z - 3.0, { near: 0.4 });
        await B.tap('interact');
        if (await wait(() => items()[id].w !== w0, 1500)) break;
      }
      B.note('reelle', id + ' jeté dans le puits (E) → ' + (items()[id].w !== w0 ? 'passé de l’autre côté' : 'ÉCHEC'));
    };
    const place = async (slot, sx, sz, done) => {
      for (let k = 0; k < 5 && !done(); k++) {
        await go(sx, sz, { near: 0.4 });
        await B.tap('interact');
        await wait(done, 1500);
      }
      B.note('reelle', 'poser sur ' + slot + ' (E) → ' + (done() ? 'ok' : 'ÉCHEC'));
      return done();
    };
    const fromWell = async (id) => {
      // it comes out on the side where I stand: wait close to the well, then go and take it
      await go(0, W.WELL.z + 5, { near: 0.8 });
      await wait(() => items()[id].w === myW() && items()[id].s === 'floor', 180000);
      return pick(id);
    };
    const stage2 = async () => {
      const s = side();
      const S2 = W.S2;
      if (s === 'U') {
        await pick('cube');
        await throwIt('cube');
        await fromWell('key');
        // which lock takes the key: the Dame sees it (glyphs on her screen) and says it
        const ks = X().keySlot;
        const ko = ks === 'slotl' ? 'slotr' : 'slotl';
        const sp = (k) => S2.slot[k === 'slotl' ? 'l' : 'r'];
        B.note('reelle', 'la serrure de la clé est ' + ks + ' (montrée à la Dame par les glyphes, elle le dit au Valet)');
        await place(ks, sp(ks)[0], sp(ks)[2] - 1.6, () => X().slots[ks] === 'key');
        await fromWell('cube');
        await place(ko, sp(ko)[0], sp(ko)[2] - 1.6, () => X().doorU);
        await wait(() => X().doorU, 5000);
        await walk(0, 131, { near: 0.6 });
        await pick('weight');
        await walk(0, 129, { near: 0.6 });
        await place('bal', S2.bal[0] + 1.3, S2.bal[2], () => X().doorL);
      } else {
        await go(0, W.WELL.z - 4.5, { near: 0.5 });
        await wait(() => items().cube.w === 'L' && items().cube.s === 'floor', 180000);
        await pick('cube');
        await place('cagep', S2.cagePlate[0] - 0.6, S2.cagePlate[2] + 0.4, () => X().cage);
        await pick('key');
        await throwIt('key');
        await pick('cube');
        await throwIt('cube');
      }
      await wait(() => X().doorU && X().doorL, 240000);
      await go(0, 131, { near: 0.8 });
      await walk(0, 152, { near: 0.8, sprint: true });
      await wait(() => X().stage !== 2, 30000);
      B.note('reelle', 'section 2 finie → étape ' + X().stage);
    };

    // ---------------- stage 3: inversions, hold plate + grapple, twin dials ----------------
    const inversion = async (i) => {
      const sw0 = i;
      await walk(0, W.INV[i], { near: 0.5, sprint: true });
      await wait(() => X().sw > sw0, 30000);
      await wait(settled, 10000);
      await sl(400);
      B.note('reelle', 'inversion ' + (i + 1) + ' : les deux dans les cercles → mondes échangés (côté ' + side() + ')');
    };
    const onPlate = (q, p) => Math.hypot(q.x - p[0], q.z - p[2]) < 0.75 && Math.abs(q.y - p[1]) < 0.4;
    const twin = async (k) => {
      const tw = W.TWIN[k];
      const my = tw[side()];
      const theirs = tw[W.other(side())];
      const pre = [my[0], my[2] - 1.5];
      const lead = side() === 'U';
      const step = async () => {
        if (my[1] > 0) await B.leap([my[0], my[1], my[2]], { dj: false, ms: 1500 });
        else await walk(my[0], my[2], { near: 0.3, ms: 3000 });
      };
      for (let n = 0; n < 8 && X().gt <= k; n++) {
        await walk(pre[0], pre[1], { near: 0.35 });
        if (lead) {
          // wait for the partner at their foot of the dial (not on it)
          await wait(() => X().gt > k || (Remote.has && Math.hypot(mate().x - theirs[0], mate().z - (theirs[2] - 1.5)) < 1.2), 60000);
          if (X().gt > k) break;
          await sl(300);
          await step();
        } else {
          await wait(() => X().gt > k || onPlate(mate(), theirs), 60000);
          if (X().gt > k) break;
          await step();
        }
        await wait(() => X().gt > k, tw.win * 1000 + 1500);
        if (X().gt > k) break;
        B.note('reelle', 'cadrans ' + k + ' : trop tard, on recommence');
      }
      B.note('reelle', 'cadrans jumeaux ' + k + ' → ' + (X().gt > k ? 'vitre ouverte' : 'ÉCHEC'));
    };
    const stage3 = async () => {
      if (X().sw === 0) await inversion(0);
      if (X().sw === 1 && me().z < 187) {
        if (side() === 'U') {
          // the Dame, by day: hold plate keeps the night bridge while the Valet crosses, then grapple
          const H = W.HOLD;
          for (let n = 0; n < 4 && me().z < 187; n++) {
            await walk(H[0], H[1], { near: 0.3 });
            B.note('reelle', 'sur la dalle d’or (la passerelle de nuit tient)');
            await wait(() => !Remote.has || mate().z > 187.5, 60000);
            const R = W.RING.pos;
            for (let j = 0; j < 4 && me().z < 187; j++) {
              for (let a = 0; a < 6; a++) {
                B.aim(W.P('U', R[0], R[1], R[2]));
                await sl(40);
              }
              await B.tap('ability');
              await wait(() => Player.mode === 'grapple', 600, 30);
              await wait(() => Player.mode !== 'grapple' && Player.body.grounded, 4000, 50);
            }
            B.note('reelle', 'grappin sur l’anneau (F) → ' + (me().z > 186 ? 'traversé' : 'raté'));
          }
        } else {
          for (let n = 0; n < 4 && me().z < 187; n++) {
            await walk(0, 174.8, { near: 0.4 });
            await wait(() => X().hold, 60000);
            await sl(300);
            await walk(0, 188.5, { near: 0.5 });
          }
          B.note('reelle', 'passerelle de nuit traversée (dalle tenue par la Dame) → z ' + me().z.toFixed(1));
        }
      }
      if (X().gt < 1) await twin(0);
      if (X().gt < 2) {
        await walk(0, 200, { near: 0.6 });
        await twin(1);
      }
      if (X().gt < 3) {
        // the 3 m gap between the two floors (no bridge, no wall): a jump
        const tx = side() === 'U' ? W.TWIN[2].U[0] : W.TWIN[2].L[0];
        if (me().z < 217) {
          await walk(tx, 212.8, { near: 0.4 });
          for (let n = 0; n < 4 && me().z < 217; n++) {
            await B.leap([tx, 0, 219.5], { run: 250, ms: 2500 });
            await wait(settled, 4000);
            if (me().z < 217) await walk(tx, 212.8, { near: 0.4 });
          }
          B.note('reelle', 'saut du fossé 215-218 → z ' + me().z.toFixed(1));
        }
        await twin(2);
      }
      if (X().sw === 1) await inversion(1);
      await walk(0, 250, { near: 0.8, sprint: true });
      await wait(() => X().stage !== 3, 30000);
      B.note('reelle', 'section 3 finie → étape ' + X().stage);
    };

    // ---------------- stage 4: the Reflet ----------------
    const stage4 = async () => {
      const C = W.ARENA;
      await walk(role === 'dame' ? -1.5 : 1.5, C.z - 8, { near: 0.6, sprint: true });
      await wait(() => X().fight || X().won, 30000);
      B.note('reelle', 'combat contre le Reflet commencé');
      const seen = new Set();
      let spot = null;
      let hits = 0;
      let lastStrike = 0;
      let lastRole = '';
      const t0 = performance.now();
      while (inLevel() && X().stage === 4 && !X().won && performance.now() - t0 < 600000) {
        ck();
        const b = L.bossNet;
        const w = myW();
        const q = me();
        if (!b) {
          await sl(60);
          continue;
        }
        const bw = b[5] ? 'L' : 'U';
        const lure = bw === w;
        if ((lure ? 'lure' : 'striker') !== lastRole) {
          lastRole = lure ? 'lure' : 'striker';
          B.note('reelle', 'rôle contre le Reflet : ' + (lure ? 'appât (esquive)' : 'frappeur') + ' (pv ' + X().hp + ')');
          B.stop();
        }
        if (!lure) {
          // under it, E while it is figé (st 2)
          const d = Math.hypot(q.x - b[0], q.z - b[2]);
          if (d > 1.2) {
            const p = W.P(w, b[0], 0, b[2]);
            Cam.yaw = Math.atan2(p.x - Player.body.p.x, p.z - Player.body.p.z);
            B.steer(p);
            S.held.add('sprint');
          } else B.stop();
          if (b[4] === 2 && d < 2.2 && performance.now() - lastStrike > 650) {
            lastStrike = performance.now();
            const hp0 = X().hp;
            await B.tap('interact');
            if (await wait(() => X().hp < hp0, 400, 30)) hits++;
          }
          await sl(30);
          continue;
        }
        // lure: sidestep each new telegraph aimed at my world, jump the rings
        for (const A of L.atks) {
          if (A.d.w !== w || seen.has(A)) continue;
          seen.add(A);
          if (A.d.k === 'r') continue;
          let ax, az;
          if (A.d.k === 'l') {
            ax = Math.cos(A.d.a);
            az = -Math.sin(A.d.a);
          } else {
            ax = q.x - A.d.x;
            az = q.z - A.d.z;
            if (Math.hypot(ax, az) < 0.3) {
              ax = q.x - b[0];
              az = q.z - b[2];
              const l0 = Math.hypot(ax, az) || 1;
              [ax, az] = [-az / l0, ax / l0];
            }
          }
          const l = Math.hypot(ax, az) || 1;
          let sx = q.x + (ax / l) * 4.5;
          let sz = q.z + (az / l) * 4.5;
          const r = Math.hypot(sx, sz - C.z);
          if (r > 10) {
            // the other way, toward the middle
            sx = q.x - (ax / l) * 4.5;
            sz = q.z - (az / l) * 4.5;
          }
          spot = [sx, sz];
        }
        for (const A of L.atks) {
          if (A.d.w !== w || A.d.k !== 'r' || A.t < A.d.dur) continue;
          const rr = W.ringR(A.t, A.d);
          const gap = Math.hypot(q.x - A.d.x, q.z - A.d.z) - rr;
          if (gap > 0.2 && gap < 1.5 && Player.body.grounded) {
            S.held.add('jump');
            setTimeout(() => S.held.delete('jump'), 60);
          }
        }
        if (spot) {
          const p = W.P(w, spot[0], 0, spot[1]);
          if (Math.hypot(q.x - spot[0], q.z - spot[1]) < 0.6) {
            spot = null;
            B.stop();
          } else {
            Cam.yaw = Math.atan2(p.x - Player.body.p.x, p.z - Player.body.p.z);
            B.steer(p);
            S.held.add('sprint');
          }
        }
        await sl(30);
      }
      B.stop();
      B.note('reelle', 'Reflet : ' + (X().won ? 'brisé' : 'pas fini') + ' (' + hits + ' coups de ce côté)');
      out.push('reflet ' + hits + ' coups');
    };

    // ---------------- stage 5: the card ----------------
    const stage5 = async () => {
      await wait(() => X().stage === 5, 15000);
      await wait(() => myW() === 'U' && settled(), 15000);
      await walk(role === 'dame' ? -1 : 1, W.ARENA.z, { near: 0.6 });
      B.note('reelle', 'au centre de l’arène, à la carte');
      await wait(() => !inLevel(), 30000);
    };

    try {
      for (let guard = 0; guard < 20 && inLevel(); guard++) {
        const st = X().stage;
        if (st === 1) await stage1();
        else if (st === 2) await stage2();
        else if (st === 3) await stage3();
        else if (st === 4) await stage4();
        else if (st === 5) {
          await stage5();
          break;
        }
        out.push('étape ' + st + '→' + (inLevel() ? X().stage : Story.S.phase));
      }
    } catch (e) {
      B.stop();
      S.held.clear();
      if (String(e.message) === 'abort') return role + ': abort ' + out.join(', ');
      throw e;
    }
    B.stop();
    return role + ': ' + out.join(', ') + ' → ' + Story.S.phase;
  },
};
