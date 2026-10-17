// ♦ 5 · Les Poids (tr_d3). No swap: Yoline = dame (reads the numbers, grapple-yanks light weights,
// pulls « Peser »), William = valet (carries heavy weights and the orbs).
// Stage 1: both scales balanced at once. A layout is solved from the numbers (the dame reads them
//   on the weights, the fixed counterweights are on her objective line); the dame yanks the light
//   weights from the shelves (aim + F) and lays them on the right pans (E), the valet carries the
//   heavy ones (E pick / E put), then both stand on their pans until the gate opens.
// Stage 2: the pulley. Valet loads both irons (3+3) on platform A, the dame stands on B, the valet
//   releases the brake (E, bottom lever): B rises to the ledge. The dame sets the brake at the top
//   (E) so B comes back, the valet steps on B, the dame releases it: both on the ledge.
// Stage 3: nine orbs, one heavier. Weighing 1: orbs 1-3 vs 4-6; weighing 2 inside the heavy group
//   (or 7 vs 8 when balanced). The valet carries (E take / E put), the dame pulls « Peser » (E)
//   once the pans hold the planned orbs, then the valet lays the heavy one on the heart (E).
// Stage 4: both walk to the altar card.
window.CL = {
  timeout: 900,
  async run() {
    const W = D3;
    B.W = W;
    const me = Story.role;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const log = [];
    const rel = () => W.rel(Player.body.p);
    const mateRel = () => (Remote.has ? W.rel(Remote.pos) : null);
    const settle = () => B.until(() => Player.body.grounded, 3000, 40);
    const heldBlock = () => X().blocks.findIndex((b) => b.at === 'carry:' + me);
    const heldOrb = () => X().r3.orbs.findIndex((a) => a === 'carry:' + me);
    const ME = 2;

    // ================= stage 1 =================
    if (X().stage === 1) {
      const x = X();
      const vals = x.blocks.slice(0, 6).map((b) => b.v);
      // the same search as the level's own (solutions()), keeping the layout with the fewest moves
      let sol = null;
      for (let m = 0; m < 729; m++) {
        let a = 0;
        let b = 0;
        let k = m;
        const asg = [];
        for (let i = 0; i < 6; i++) {
          const s = k % 3;
          k = (k / 3) | 0;
          asg.push(s);
          if (s === 1) a += vals[i];
          if (s === 2) b += vals[i];
        }
        for (let p = 0; p < 9; p++) {
          const p1 = p % 3;
          const p2 = (p / 3) | 0;
          if (!p1 || !p2) continue;
          const wa = a + (p1 === 1 ? ME : 0) + (p2 === 1 ? ME : 0);
          const wb = b + (p1 === 2 ? ME : 0) + (p2 === 2 ? ME : 0);
          if (wa !== x.fA || wb !== x.fB) continue;
          const cost = asg.filter(Boolean).length;
          if (!sol || cost < sol.cost) sol = { asg, p1, p2, cost };
        }
      }
      if (!sol) {
        B.note('reelle', 'aucune disposition trouvée pour ' + vals + ' / ' + x.fA + ',' + x.fB);
        return me + ': pas de solution';
      }
      B.note('reelle', 'disposition lue par la dame (poids ' + vals.join(',') + ', contrepoids ' + x.fA + '/' + x.fB + ') : ' + JSON.stringify(sol));
      const panR = (id) => W.scales[id].pans.R;
      const toPan = async (id) => {
        const p = panR(id);
        await B.go([p.x, 0, p.z - p.r - 0.45], { near: 0.5, ms: 30000 });
        await B.sl(150);
      };
      const mine = me === 'dame' ? [3, 4, 5] : [0, 1, 2];
      for (const i of mine) {
        if (!sol.asg[i] || ab()) continue;
        const id = sol.asg[i] === 1 ? 'A' : 'B';
        if (me === 'dame') {
          // stand ~7 m from the shelf and yank the light weight with the grapple
          const h = W.rel(W.homes[X().blocks[i].at]);
          const sx = h.x < 0 ? h.x + 6.5 : h.x - 6.5;
          await B.go([sx, 0, h.z], { near: 0.5, ms: 30000 });
          for (let k = 0; k < 4 && heldBlock() !== i; k++) {
            B.aim(W.blockPos(i));
            await B.sl(250);
            B.aim(W.blockPos(i));
            await B.sl(100);
            await B.tap('ability');
            await B.until(() => heldBlock() === i, 1500, 50);
          }
          B.note('reelle', 'dame vise le petit poids ' + vals[i] + ' et tire au grappin (F) : ' + (heldBlock() === i ? 'ramené' : 'raté'));
          if (heldBlock() !== i) continue;
        } else {
          const at = X().blocks[i].at;
          const h = W.rel(W.homes[at]);
          await B.go([h.x, 0, h.z - 0.9], { near: 0.5, ms: 30000 });
          await B.walk([h.x, 0, h.z - 0.6], 0.3, 3000);
          await B.tap('interact');
          await B.until(() => heldBlock() === i, 1500, 50);
          if (heldBlock() !== i) {
            B.note('reelle', 'valet : poids ' + vals[i] + ' pas pris (' + B.rel() + ')');
            continue;
          }
        }
        await toPan(id);
        await B.tap('interact');
        await B.until(() => X().blocks[i].at === 'pan:' + id + ':R', 1500, 50);
        B.note('reelle', me + ' pose le poids ' + vals[i] + ' sur la balance ' + id + ' → ' + X().blocks[i].at);
      }
      // both astronauts on their pans (2 each)
      const myPan = (me === 'dame' ? sol.p1 : sol.p2) === 1 ? 'A' : 'B';
      const p = panR(myPan);
      const off = me === 'dame' ? 0.55 : -0.55;
      // wait for the other one's weights to be on (the dame says « monte »)
      await B.until(
        () => X().blocks.every((b, i) => i > 5 || !sol.asg[i] || b.at === 'pan:' + (sol.asg[i] === 1 ? 'A' : 'B') + ':R') || X().stage !== 1,
        120000,
        200,
      );
      for (let k = 0; k < 4 && X().stage === 1 && !W.onPan(rel(), myPan, 'R') && !ab(); k++) {
        await toPan(myPan);
        await B.leap([p.x + off, p.y, p.z], { dj: false, ms: 1500 });
        await settle();
        if (!W.onPan(rel(), myPan, 'R')) await B.walk([p.x + off, 0, p.z], 0.3, 2000);
      }
      B.note('reelle', me + ' monte sur le plateau droit de la balance ' + myPan + ' : ' + W.onPan(rel(), myPan, 'R'));
      await B.until(() => X().stage !== 1 || ab(), 60000, 100);
      log.push('salle1 ' + (X().stage >= 2 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ================= stage 2 =================
    if (X().stage === 2) {
      await B.sl(800);
      await B.until(() => rel().z > 46, 3000, 100);
      const L = W.lift;
      const onB = (q) => q && W.onLift(q, 'B');
      if (me === 'valet') {
        for (const w of ['W0', 'W1']) {
          const i = X().blocks.findIndex((b) => b.at === w);
          if (i < 0) continue;
          const h = W.rel(W.homes[w]);
          await B.walk([h.x, 0, h.z], 0.4, 6000);
          await B.tap('interact');
          await B.until(() => heldBlock() === i, 1500, 50);
          await B.walk([4.15, 0, 56.2], 0.35, 6000);
          await B.tap('interact');
          await B.until(() => X().blocks[i].at === 'pA', 1500, 50);
        }
        B.note('reelle', 'valet charge les deux fers sur le plateau A : ' + X().blocks.slice(6).map((b) => b.at).join(','));
        // the dame steps on B, then the valet releases the brake from the bottom lever
        await B.walk([1.6, 0, 49.6], 0.4, 5000);
        await B.until(() => onB(mateRel()) || ab(), 60000, 100);
        await B.sl(600);
        if (X().r2.brake) await B.tap('interact');
        B.note('reelle', 'valet desserre le frein (E) : la dame monte');
        // the dame sets the brake at the top: B comes back down, the valet steps on
        await B.until(() => X().r2.brake || ab(), 60000, 100);
        await B.until(() => Math.abs(L.B.y) < 0.12 || ab(), 15000, 50);
        await B.walk([-4.15, 0, 56.5], 0.4, 6000);
        await B.walk([-4.15, 0, 60.5], 0.4, 4000);
        B.note('reelle', 'valet sur la nacelle B (onLift=' + onB(rel()) + ')');
        await B.until(() => rel().y > 5.8 || ab(), 20000, 100);
        await B.walk([-3, 6, 68.5], 0.4, 6000);
      } else {
        await B.walk([-4.15, 0, 56.5], 0.4, 6000);
        await B.walk([-4.15, 0, 60.5], 0.4, 4000);
        B.note('reelle', 'dame sur la nacelle B, attend le frein');
        await B.until(() => rel().y > 5.8 || ab(), 60000, 100);
        await B.walk([-3, 6, 67.5], 0.4, 6000);
        await B.walk([-1.2, 6, 68.5], 0.4, 4000);
        // brake on: the platforms come back level
        if (!X().r2.brake) await B.tap('interact');
        B.note('reelle', 'dame en haut, serre le frein (E) pour faire redescendre la nacelle');
        await B.until(() => onB(mateRel()) || ab(), 30000, 100);
        await B.sl(600);
        if (X().r2.brake) await B.tap('interact');
        B.note('reelle', 'dame desserre le frein (E) : le valet monte');
        await B.walk([-3, 6, 69.5], 0.4, 4000);
      }
      await B.until(() => X().stage !== 2 || ab(), 60000, 200);
      log.push('salle2 ' + (X().stage >= 3 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ================= stage 3 =================
    if (X().stage === 3) {
      await B.sl(1200); // the gate slides open
      const s = me === 'dame' ? -1 : 1;
      await B.go([s * 1.2, 6, 82], { near: 0.6, ms: 20000 });
      const G = W.scales.G.pans;
      const C = { x: 0, z: 95 };
      const sockStand = (k) => {
        const [sx, sz] = W.socketXZ[k];
        return [C.x + (sx - C.x) * 0.8, 6, C.z + (sz - C.z) * 0.8];
      };
      const plan = (weighs, res1) => {
        if (weighs === 0) return { L: [0, 1, 2], R: [3, 4, 5] };
        if (res1 === 0) return { L: [0, 1, 2, 6], R: [3, 4, 5, 7] };
        return res1 < 0 ? { L: [0], R: [1] } : { L: [3], R: [4] };
      };
      const heavyOf = (res1, res2) => {
        const g = res1 === 0 ? [6, 7, 8] : res1 < 0 ? [0, 1, 2] : [3, 4, 5];
        return res2 < 0 ? g[0] : res2 > 0 ? g[1] : g[2];
      };
      const matches = (pl) => {
        const o = X().r3.orbs;
        return o.every((a, i) => (pl.L.includes(i) ? a === 'L' : pl.R.includes(i) ? a === 'R' : a !== 'L' && a !== 'R'));
      };
      let res1 = null;
      let res2 = null;
      let lastTry = -1;
      const t0 = performance.now();
      while (X().stage === 3 && !ab() && performance.now() - t0 < 600000) {
        const r3 = X().r3;
        if (r3.state === 'fail') {
          res1 = res2 = null;
          await B.sl(300);
          continue;
        }
        if (r3.weighs === 0) res1 = res2 = null;
        if (r3.weighs >= 1 && res1 == null && r3.weighs === 1) res1 = r3.res;
        if (r3.weighs >= 2 && res2 == null && r3.weighs === 2) res2 = r3.res;
        if (r3.weighs >= 1 && res1 == null) {
          // joined late: no way to know the first result, weigh again from scratch next round
          await B.sl(300);
          continue;
        }
        const done = r3.weighs >= 2 && res2 != null;
        if (me === 'dame') {
          if (Math.hypot(rel().x + 1.4, rel().z - 92.8) > 0.6) await B.go([-1.4, 6, 92.8], { near: 0.4, ms: 15000 });
          if (done) {
            await B.sl(300);
            continue;
          }
          const pl = plan(r3.weighs, res1);
          const ready = matches(pl) && !r3.orbs.some((a) => typeof a === 'string' && a.startsWith('carry')) && !W.onGreatPan(mateRel() || rel());
          if (ready && lastTry !== r3.weighs) {
            await B.sl(400);
            const w0 = X().r3.weighs;
            await B.tap('interact');
            await B.until(() => X().r3.weighs !== w0, 2000, 50);
            if (X().r3.weighs !== w0) {
              lastTry = w0;
              B.note('reelle', 'dame tire « Peser » (E) : pesée ' + X().r3.weighs + ', ' + JSON.stringify(pl) + ' → ' + X().r3.res);
            }
          }
          await B.sl(200);
          continue;
        }
        // ---- valet: move the orbs ----
        if (done) {
          const hv = heavyOf(res1, res2);
          B.note('reelle', 'valet porte l’orbe ' + (hv + 1) + ' (désignée par la dame) au cœur');
          if (heldOrb() !== hv) {
            if (heldOrb() >= 0) await putTo('off');
            await takeOrb(hv);
          }
          if (heldOrb() === hv) {
            await B.go([1.0, 6, 110], { near: 0.4, ms: 30000 });
            await B.tap('interact');
            await B.until(() => X().stage !== 3 || X().r3.state === 'fail', 3000, 50);
          }
          if (X().stage === 3) await B.sl(500);
          continue;
        }
        const pl = plan(r3.weighs, res1);
        if (matches(pl) && heldOrb() < 0) {
          // stand clear of the pans, wait for the dame's weighing
          if (rel().z > 95.5 || Math.hypot(rel().x, rel().z - 94) < 2.4) await B.go([4, 6, 91.5], { near: 0.6, ms: 10000 });
          await B.sl(200);
          continue;
        }
        // one move at a time: the first orb not where the plan wants it
        const o = X().r3.orbs;
        const want = (i) => (pl.L.includes(i) ? 'L' : pl.R.includes(i) ? 'R' : 'off');
        const where = (a) => (a === 'L' || a === 'R' ? a : 'off');
        let i = heldOrb();
        if (i < 0) {
          i = o.findIndex((a, k) => where(a) !== want(k) && (where(a) !== 'off' || want(k) !== 'off'));
          if (i < 0) {
            await B.sl(200);
            continue;
          }
          await takeOrb(i);
          if (heldOrb() !== i) continue;
        }
        await putTo(want(i));
        if (heldOrb() >= 0) await B.sl(300);
      }
      log.push('salle3 ' + (X().stage >= 4 ? 'ok' : 'ko'));

      // helpers (function declarations are hoisted)
      async function takeOrb(i) {
        const at = X().r3.orbs[i];
        if (typeof at === 'number') await B.go(sockStand(at), { near: 0.35, ms: 20000 });
        else if (at === 'L' || at === 'R') {
          const p = W.orbPos(i);
          await B.go([p.x, 6, G[at].z - 2.75], { near: 0.3, ms: 20000 });
        } else return;
        await B.sl(150);
        await B.tap('interact');
        await B.until(() => heldOrb() === i, 1500, 50);
        if (heldOrb() !== i && heldOrb() >= 0) await putTo('off');
      }
      async function putTo(side) {
        const i = heldOrb();
        if (i < 0) return;
        if (side === 'L' || side === 'R') await B.go([G[side].x, 6, G[side].z - 3.1], { near: 0.35, ms: 20000 });
        else {
          const o = X().r3.orbs;
          const q = rel();
          let best = -1;
          let bd = 1e9;
          for (let k = 0; k < 9; k++) {
            if (o.includes(k)) continue;
            const [sx, sz] = W.socketXZ[k];
            const d = Math.hypot(sx - q.x, sz - q.z);
            if (d < bd) {
              bd = d;
              best = k;
            }
          }
          if (best < 0) return;
          await B.go(sockStand(best), { near: 0.35, ms: 20000 });
        }
        await B.sl(150);
        await B.tap('interact');
        await B.until(() => heldOrb() !== i, 1500, 50);
      }
    }
    if (ab()) return log.join(', ');

    // ================= stage 4: the card on the altar =================
    await B.until(() => X().stage >= 4 || ab(), 30000, 200);
    const s = me === 'dame' ? -1 : 1;
    await B.go([s * 1.8, 6, 109.5], { near: 0.6, ms: 30000 });
    B.note('reelle', me + ' à la carte');
    await B.until(() => Story.S.phase !== 'tr_d3' || ab(), 15000, 200);
    return me + ': ' + log.join(', ');
  },
};
