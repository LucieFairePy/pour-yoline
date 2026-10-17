// tr_d10 · Le Lac gelé (♦ 10). Kits SWAPPED here: Yoline = valet, William = dame. Six crossings;
// WALKER per stage (valet, dame, valet, dame, valet, dame), the other one reads at the fishing hole.
// Real keys only: walking (Input.sim), E to lean over the hole, F (ability) on the ring of the
// ridge at the 3rd crossing. The level's update() sends 'step' for each slab walked on.
//
// What each one knows, as in the game: the reader (leaning at the hole) sees every keel ◆ and,
// from the 3rd crossing, every bubble ○ — they say them aloud; the walker sees the cracks only
// around their feet (the level's CRACK_R, shrunk by squalls). The walker's plan uses the keels and
// bubbles for the whole field, and a crack only once a slab's centre has come within sight of
// the walker's feet; an unseen slab is first looked at from the edge of the current one (or of
// the bank). Bears = keel ◆, or no crack and no bubble. The follower walks the footprints (trod).
window.CL = {
  timeout: 1500,
  async run() {
    const W = D10;
    B.W = W;
    const X = () => Story.S.x;
    const r = Story.role;
    const k = r === 'dame' ? -1 : 1;
    const WALKER = { 1: 'valet', 2: 'dame', 3: 'valet', 4: 'dame', 5: 'valet', 6: 'dame' };
    const FIELD = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const CRACK_R = { 1: 3.4, 2: 1.9, 3: 2.7, 4: 2.7, 5: 2.7, 6: 2.7 };
    const KEEL = 1;
    const BUB = 2;
    const S = 2.6;
    const log = [];
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_d10';
    const q = () => W.rel(Player.body.p);
    const wait = (fn, ms = 30000, step = 100) => B.until(() => !live() || fn(), ms, step);
    const cellXZ = (G, i) => W.cellPos(G, i);
    const pt = (x, z) => W.P(x, 0.3, z);
    // a slow approach (ice: no overshoot onto a slab we have not looked at)
    const creep = async (x, z, near = 0.3, ms = 8000) => {
      const p = pt(x, z);
      const t = performance.now();
      while (live() && performance.now() - t < ms) {
        const b = Player.body.p;
        const d = Math.hypot(p.x - b.x, p.z - b.z);
        if (d < near) break;
        Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
        B.steer(p);
        const m = Math.max(0.3, Math.min(1, d / 1.6));
        Input.sim.x *= m;
        Input.sim.z *= m;
        await B.sl(30);
      }
      B.stop();
      await B.sl(120);
      return Math.hypot(p.x - Player.body.p.x, p.z - Player.body.p.z) < near + 0.25;
    };
    const plunging = () => !!(W.local.plunge || W.local.layPending);

    // ---------- the walker ----------
    const cross = async (st) => {
      const gi = FIELD[st];
      const G = W.GRIDS[gi];
      let seed = null;
      let L = null;
      let seen = null;
      let falls0 = X().falls || 0;
      const nb = (i) => {
        const c = i % G.cols;
        const row = Math.floor(i / G.cols);
        const o = [];
        if (row + 1 < G.rows) o.push(i + G.cols);
        if (c > 0) o.push(i - 1);
        if (c + 1 < G.cols) o.push(i + 1);
        if (row > 0) o.push(i - G.cols);
        return o;
      };
      const look = () => {
        const sq = W.local.sqK || 0;
        const R = CRACK_R[st] * (1 - sq * 0.75) - 0.15;
        const p = q();
        for (let i = 0; i < G.n; i++) {
          const [cx, cz] = cellXZ(G, i);
          if (Math.hypot(cx - p.x, cz - p.z) < R) seen[i] = 1;
        }
      };
      // 2 bears, 0 gives way, 1 not known yet
      const st8 = (i) => {
        const c = L.cells[i];
        if (c.sym === KEEL) return 2;
        if (c.sym === BUB) return 0;
        if (!seen[i]) return 1;
        return c.crack ? 0 : 2;
      };
      for (let guard = 0; guard < 400 && live(); guard++) {
        const x = X();
        if (x.stage !== st || x.crossed) return;
        if (plunging()) {
          await B.sl(200);
          continue;
        }
        if (x.seed !== seed) {
          // a new layout (start, or the ice reformed after a fall)
          if (seed !== null) log.push('fall');
          seed = x.seed;
          L = W.layout(st, seed);
          seen = new Array(G.n).fill(0);
          const s0 = W.startOf(gi, k);
          await B.walk(s0, 0.5, 20000);
          B.note('reelle', `traversée ${st} : ${Story.name(Story.ctx.other)} au trou dit les quilles ◆${st >= 3 ? ' et les bulles ○' : ''} ; les fissures se voient autour des pieds`);
          continue;
        }
        look();
        const p = q();
        const here = W.cellAt(gi, p);
        const onBank = here < 0 && p.z < G.z0;
        if (here >= 0 && Math.floor(here / G.cols) === G.rows - 1) {
          // last row: onto the land after
          const [cx] = cellXZ(G, here);
          await creep(cx, G.z1 + 2.6, 0.5, 6000);
          await wait(() => X().crossed || X().seed !== seed, 3000);
          continue;
        }
        if (here < 0 && !onBank) {
          // pushed off somewhere odd: back to the start
          await B.walk(W.startOf(gi, k), 0.5, 15000);
          continue;
        }
        // Dijkstra from here (or the bank) to the last row, over slabs not known to give way
        const dist = new Array(G.n).fill(Infinity);
        const prev = new Array(G.n).fill(-1);
        const open = [];
        const cost = (i) => (st8(i) === 2 ? 1 : 4);
        if (here >= 0) {
          dist[here] = 0;
          open.push(here);
        } else
          for (let c = 0; c < G.cols; c++)
            if (st8(c) > 0) {
              dist[c] = cost(c) + Math.abs(cellXZ(G, c)[0] - p.x) / S;
              open.push(c);
            }
        let goal = -1;
        while (open.length) {
          open.sort((a, b) => dist[a] - dist[b]);
          const i = open.shift();
          if (Math.floor(i / G.cols) === G.rows - 1 && st8(i) === 2) {
            goal = i;
            break;
          }
          for (const j of nb(i)) {
            if (st8(j) === 0) continue;
            const d = dist[i] + cost(j);
            if (d < dist[j]) {
              dist[j] = d;
              prev[j] = i;
              if (!open.includes(j)) open.push(j);
            }
          }
          // a last-row slab not seen yet: reach it, look, then decide
          if (!open.length && goal < 0) break;
        }
        if (goal < 0) {
          // best unknown last-row slab as a goal
          let best = Infinity;
          for (let c = 0; c < G.cols; c++) {
            const i = (G.rows - 1) * G.cols + c;
            if (dist[i] < best) {
              best = dist[i];
              goal = i;
            }
          }
        }
        if (goal < 0) {
          log.push('no path st' + st);
          B.note('reelle', 'pas de chemin connu : retour au bord');
          await B.walk(W.startOf(gi, k), 0.5, 15000);
          await B.sl(1000);
          continue;
        }
        const chain = [];
        for (let i = goal; i >= 0; i = prev[i]) {
          chain.unshift(i);
          if (i === here) break;
        }
        const next = here >= 0 ? chain[1] : chain[0];
        if (next === undefined) {
          await B.sl(200);
          continue;
        }
        const [nx, nz] = cellXZ(G, next);
        if (st8(next) === 2) {
          if (here < 0) await creep(nx, G.z0 - 0.5, 0.35, 8000);
          await creep(nx, nz, 0.35, 6000);
        } else {
          // not seen yet: to the edge facing it, and look (wait out a squall, it hides the cracks)
          if (here < 0) await creep(nx, G.z0 - 0.2, 0.25, 8000);
          else {
            const [hx, hz] = cellXZ(G, here);
            const dx = Math.sign(nx - hx);
            const dz = Math.sign(nz - hz);
            await creep(hx + dx * 1.0, hz + dz * 1.0, 0.25, 6000);
          }
          for (let w = 0; w < 12 && (W.local.sqK || 0) > 0.15 && live(); w++) await B.sl(250);
        }
        if ((X().falls || 0) !== falls0) falls0 = X().falls || 0;
      }
    };

    // ---------- the reader ----------
    const lean = async (st) => {
      const gi = FIELD[st];
      if (st === 3 && !W.local.ridge) {
        // the ridge: F on the ring, along the top, down the steps to the far hole
        for (let t = 0; t < 4 && live() && !W.local.ridge; t++) {
          await B.walk(pt(2.6, 46.6), 0.5, 20000);
          const R = W.RING;
          for (let j = 0; j < 8 && Player.lockTarget < 0; j++) {
            const b = Player.body.p;
            Cam.yaw = Math.atan2(R.wp.x - b.x, R.wp.z - b.z);
            Cam.pitch = clamp(-Math.atan2(R.wp.y - b.y - 1.2, Math.hypot(R.wp.x - b.x, R.wp.z - b.z)), -0.95, 1.2);
            await B.sl(150);
          }
          await B.tap('ability');
          await B.sl(2600);
          Cam.pitch = 0.2;
          if (q().y > 4) {
            B.note('reelle', 'grappin (F) sur l’anneau, sur la crête');
            await B.walk(pt(13, 72), 0.6, 15000);
            await B.walk(pt(13, 81), 0.6, 8000);
          }
          await B.sl(300);
        }
      }
      const h = W.holeSpot(gi);
      if (st !== 3) await B.go(h, { near: 0.5, ms: 30000 });
      else await B.walk(h, 0.5, 20000);
      for (let t = 0; t < 4 && live() && !W.local.lean && !X().crossed && X().stage === st; t++) {
        await B.tap('interact');
        await B.sl(500);
      }
      if (W.local.lean) B.note('reelle', 'penché(e) sur le trou (E) : lit les ◆' + (st >= 3 ? ' et ○' : '') + ' pour ' + Story.name(Story.ctx.other));
      await wait(() => X().crossed || X().stage !== st, 400000, 250);
    };
    const follow = async (st) => {
      const gi = FIELD[st];
      const G = W.GRIDS[gi];
      if (st === 3) return; // the reader of the 3rd crossing is already on the far land
      for (let tries = 0; tries < 4 && live() && X().stage === st; tries++) {
        const tr = (X().trod || []).slice();
        // footprints: a 4-connected way from the first row to the last
        const prev = new Map();
        const qq = [];
        for (const i of tr)
          if (i < G.cols) {
            prev.set(i, -1);
            qq.push(i);
          }
        let end = -1;
        while (qq.length) {
          const i = qq.shift();
          if (Math.floor(i / G.cols) === G.rows - 1) {
            end = i;
            break;
          }
          const c = i % G.cols;
          for (const j of [i + G.cols, i - G.cols, c > 0 ? i - 1 : -1, c + 1 < G.cols ? i + 1 : -1])
            if (j >= 0 && j < G.n && tr.includes(j) && !prev.has(j)) {
              prev.set(j, i);
              qq.push(j);
            }
        }
        if (end < 0) {
          log.push('no trod path');
          B.note('raccourci', 'les traces ne forment pas un chemin complet : chemin lu dans la disposition (fissures visibles une fois la traversée faite, quilles vues du trou)');
          const L = W.layout(st, X().seed);
          // fall back to every slab that bears
          const ok = (i) => !L.cells[i].weak;
          prev.clear();
          const q2 = [];
          for (let c = 0; c < G.cols; c++)
            if (ok(c)) {
              prev.set(c, -1);
              q2.push(c);
            }
          while (q2.length) {
            const i = q2.shift();
            if (Math.floor(i / G.cols) === G.rows - 1) {
              end = i;
              break;
            }
            const c = i % G.cols;
            for (const j of [i + G.cols, i - G.cols, c > 0 ? i - 1 : -1, c + 1 < G.cols ? i + 1 : -1])
              if (j >= 0 && j < G.n && ok(j) && !prev.has(j)) {
                prev.set(j, i);
                q2.push(j);
              }
          }
        }
        if (end < 0) return;
        const path = [];
        for (let i = end; i >= 0; i = prev.get(i)) path.unshift(i);
        await B.walk(W.startOf(gi, k), 0.5, 25000);
        const [fx] = cellXZ(G, path[0]);
        await creep(fx, G.z0 - 0.8, 0.4, 8000);
        let fell = false;
        for (const i of path) {
          const [cx, cz] = cellXZ(G, i);
          await creep(cx, cz, 0.4, 6000);
          if (plunging()) {
            fell = true;
            break;
          }
        }
        if (fell) {
          await wait(() => !plunging(), 5000);
          continue;
        }
        const [lx] = cellXZ(G, path[path.length - 1]);
        await creep(lx * 0.5, G.z1 + 2.2, 0.5, 6000);
        B.note('reelle', `suivi des traces de ${Story.name(Story.ctx.other)} (traversée ${st})`);
        await wait(() => X().stage !== st, 4000);
        return;
      }
    };

    // ---------- the crossings ----------
    for (let guard = 0; guard < 200 && live(); guard++) {
      const x = X();
      const st = x.stage;
      if (st >= 7) break;
      const walker = WALKER[st] === r;
      const gi = FIELD[st];
      if (walker && !x.crossed) {
        // wait for the reader at the hole (they say the keels), at most a minute and a half
        await B.walk(W.startOf(gi, k), 0.5, 25000);
        const hs = W.rel(W.holeSpot(gi));
        await wait(() => {
          const m = W.rel(Remote.pos);
          return Math.hypot(m.x - hs.x, m.z - hs.z) < 2.2;
        }, 90000, 200);
        await B.sl(800);
        await cross(st);
        log.push('crossed ' + st);
      } else if (walker) {
        await wait(() => X().stage !== st, 60000, 200);
      } else if (!x.crossed) {
        await lean(st);
      } else {
        await follow(st);
        await wait(() => X().stage !== st, 20000, 200);
        log.push('followed ' + st);
      }
    }
    if (!live()) return r + ': ' + log.join(', ');
    // ---------- the shore: the card ----------
    const C = W.CARD;
    await B.walk(pt(C.x + k * 1.5, C.z - 2), 0.6, 20000);
    B.note('reelle', 'sur la rive, à la carte');
    await wait(() => false, 25000);
    return r + ': ' + log.join(', ') + ' → ' + (Story.S && Story.S.phase);
  },
};
