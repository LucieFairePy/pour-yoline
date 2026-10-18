// Injected into both game pages by tools/qa/campaign/run.mjs. A player's hands: everything goes
// through the game's own input path (Input.sim is read by Input.poll exactly like the keyboard:
// sim.x / sim.z = the stick, sim.held = buttons), with the camera turned the way a player turns it
// (Cam.yaw / Cam.pitch). Nothing here writes Story.S: what a level hears is what its update() sends.
//
// Every step a solver takes is noted (CB.note) with how it was done:
//   'reelle'    simulated keys / stick through Input (the level's update() turns them into actions)
//   'action'    Story.ctx.act(d) sent directly, the same object the level's update() would send
//   'raccourci' anything else (a teleport, a state read used to skip a search…), with the reason
// run.mjs drains the notes into the journal.
window.B = window.CB = (() => {
  const S = Input.sim;
  const sl = (ms) => new Promise((r) => setTimeout(r, ms));
  const pos = () => Player.body.p;
  const t0 = performance.now();
  const notes = [];
  let W = null;
  const B = {
    sl,
    notes,
    set W(w) {
      W = w;
    },
    get W() {
      return W;
    },
  };
  B.note = (how, text) => {
    notes.push({ at: Date.now(), who: Story.me, kit: Story.role, phase: Story.S && Story.S.phase, how, text: String(text) });
    if (notes.length > 400) notes.shift();
  };
  B.drain = () => notes.splice(0);
  // the simulated voice: what this player says out loud (B.tell) is relayed by run.mjs (about once
  // a second) into the partner's B.heard — for what only one screen shows (note it 'info')
  B.out = [];
  B.heard = {};
  B.tell = (k, v) => B.out.push([k, v]);
  B.x = () => Story.S.x;
  B.until = async (fn, ms = 20000, step = 100) => {
    // always give the page a turn first: a solver loop of calls that are already true would
    // otherwise run on microtasks only and freeze the page
    await sl(0);
    const t = performance.now();
    while (performance.now() - t < ms) {
      try {
        if (fn()) return true;
      } catch (e) {}
      await sl(step);
    }
    return false;
  };
  // level-relative coordinates (a level world with P(x,y,z) → world and rel(v) → level)
  B.abs = (p) => (Array.isArray(p) ? (W && W.P ? W.P(p[0], p[1], p[2]) : V3(p[0], p[1], p[2])) : p);
  B.rel = () => {
    const q = W && W.rel ? W.rel(pos()) : pos();
    return [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)];
  };
  B.where = () => pos().toArray().map((v) => +v.toFixed(2));
  B.steer = (p) => {
    const b = pos();
    const dx = p.x - b.x;
    const dz = p.z - b.z;
    const d = Math.hypot(dx, dz) || 1;
    const y = Cam.yaw;
    const fx = Math.sin(y);
    const fz = Math.cos(y);
    S.z = (dx * fx + dz * fz) / d;
    S.x = -(dx * fz - dz * fx) / d;
  };
  B.face = (p) => {
    p = B.abs(p);
    const b = pos();
    Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
  };
  B.stop = () => {
    S.x = 0;
    S.z = 0;
    S.held.delete('sprint');
  };
  // walk (flat) toward p; true once within `near`
  B.walk = async (p, near = 0.6, ms = 15000, sprint = false) => {
    await sl(0);
    p = B.abs(p);
    const t = performance.now();
    if (sprint) S.held.add('sprint');
    while (performance.now() - t < ms) {
      const b = pos();
      if (Math.hypot(p.x - b.x, p.z - b.z) < near) {
        B.stop();
        return true;
      }
      Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
      B.steer(p);
      await sl(30);
    }
    B.stop();
    return false;
  };
  B.tap = async (a, ms = 90) => {
    S.held.add(a);
    await sl(ms);
    S.held.delete(a);
    await sl(50);
  };
  B.hold = async (a, ms) => {
    S.held.add(a);
    await sl(ms);
    S.held.delete(a);
  };
  // run toward p and jump (double jump at the apex), steering in the air until grounded again
  B.leap = async (p, o = {}) => {
    p = B.abs(p);
    S.held.add('sprint');
    const b = Player.body;
    const t = performance.now();
    while (performance.now() - t < (o.run || 0)) {
      Cam.yaw = Math.atan2(p.x - b.p.x, p.z - b.p.z);
      B.steer(p);
      await sl(16);
    }
    Cam.yaw = Math.atan2(p.x - b.p.x, p.z - b.p.z);
    B.steer(p);
    S.held.add('jump');
    await sl(50);
    S.held.delete('jump');
    let dj = o.dj === false;
    const t1 = performance.now();
    await sl(80);
    while (performance.now() - t1 < (o.ms || 2500)) {
      const disc = b.v.y * b.v.y + 52 * (b.p.y - p.y);
      const tl = Math.max(0.12, disc > 0 ? (b.v.y + Math.sqrt(disc)) / 26 : 0.12);
      const wx = (p.x - b.p.x) / tl - b.v.x;
      const wz = (p.z - b.p.z) / tl - b.v.z;
      const m = Math.hypot(wx, wz);
      if (m > 0.05) {
        B.steer(V3(b.p.x + wx, 0, b.p.z + wz));
        S.x *= Math.min(1, m / 1.5);
        S.z *= Math.min(1, m / 1.5);
      } else {
        S.x = 0;
        S.z = 0;
      }
      if (!dj && b.v.y <= 0.5) {
        dj = true;
        S.held.add('jump');
        await sl(50);
        S.held.delete('jump');
      }
      if (b.grounded && performance.now() - t1 > 200) break;
      await sl(16);
    }
    B.stop();
    return B.rel();
  };
  // one tick of air control toward p (what a player does with the stick while falling): reach p
  // when coming down to its height
  B.airStep = (p) => {
    p = B.abs(p);
    const b = Player.body;
    const disc = b.v.y * b.v.y + 52 * (b.p.y - p.y);
    const tl = Math.max(0.12, disc > 0 ? (b.v.y + Math.sqrt(disc)) / 26 : 0.12);
    const wx = (p.x - b.p.x) / tl - b.v.x;
    const wz = (p.z - b.p.z) / tl - b.v.z;
    const m = Math.hypot(wx, wz);
    if (m > 0.05) {
      B.steer(V3(b.p.x + wx, 0, b.p.z + wz));
      S.x *= Math.min(1, m / 1.5);
      S.z *= Math.min(1, m / 1.5);
    } else {
      S.x = 0;
      S.z = 0;
    }
  };
  // after a grapple (or any fall): steer in the air onto p until grounded
  B.air = async (p, ms = 4000) => {
    const t = performance.now();
    while (performance.now() - t < ms) {
      if (Player.mode !== 'grapple') {
        if (Player.body.grounded && performance.now() - t > 150) break;
        B.airStep(p);
      }
      await sl(16);
    }
    B.stop();
    return B.rel();
  };
  B.aim = (p) => {
    p = B.abs(p);
    const c = R.camera.position;
    Cam.yaw = Math.atan2(p.x - c.x, p.z - c.z);
    Cam.pitch = clamp(-Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)), -0.95, 1.2);
  };
  // closed-loop aim, like a mouse: turn the camera by the angle between where it really looks
  // (its forward vector, which B.aim's formula only approximates: the orbit camera looks at a
  // point beside and above the player) and the target. Call it every frame or so; it converges.
  B.aimFine = (p, gain = 1) => {
    p = B.abs(p);
    const cam = R.camera;
    const f = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    const w = p.clone().sub(cam.position).normalize();
    let dy = Math.atan2(w.x, w.z) - Math.atan2(f.x, f.z);
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const dp = Math.asin(clamp(-w.y, -1, 1)) - Math.asin(clamp(-f.y, -1, 1));
    Cam.yaw += dy * gain;
    Cam.pitch = clamp(Cam.pitch + dp * gain, -0.95, 1.2);
    return Math.hypot(dy, dp);
  };
  // an action exactly as the level's update() sends it, from this page (the right kit)
  B.act = (d, why) => {
    Story.ctx.act(d);
    B.note('action', (why ? why + ' — ' : '') + 'act ' + JSON.stringify(d));
  };
  // a labelled shortcut: teleport (the way a respawn does) when walking there is not feasible
  B.tp = (p, why, yaw) => {
    p = B.abs(p);
    Player.mode = 'walk';
    Player.teleport(p.clone ? p.clone() : V3(p.x, p.y, p.z), yaw ?? Player.yaw);
    B.note('raccourci', 'téléportation à ' + [p.x, p.y, p.z].map((v) => v.toFixed(1)).join(',') + ' : ' + why);
  };

  // ---- grid path finding over the physics boxes (the city's streets, any flat level) ----
  // cell = 0.5 m; a cell is blocked by a box the body cannot step onto at the current floor
  // height. A*, then the path is pulled tight and walked waypoint by waypoint.
  const CELL = 0.5;
  const blockedAt = (x, z, gy, r) => {
    const list = Phys.query(x - r, z - r, x + r, z + r);
    for (const b of list) {
      if (!b.on) continue;
      if (b.max[0] < x - r || b.min[0] > x + r || b.max[2] < z - r || b.min[2] > z + r) continue;
      if (b.max[1] <= gy + 0.44) continue;
      if (b.min[1] >= gy + 1.8) continue;
      return true;
    }
    return false;
  };
  B.path = (to, o = {}) => {
    const from = pos();
    const gy = o.gy ?? from.y;
    const r = o.r ?? 0.5;
    const pad = o.pad ?? 24;
    const x0 = Math.min(from.x, to.x) - pad;
    const z0 = Math.min(from.z, to.z) - pad;
    const nx = Math.ceil((Math.max(from.x, to.x) + pad - x0) / CELL);
    const nz = Math.ceil((Math.max(from.z, to.z) + pad - z0) / CELL);
    if (nx * nz > 1.2e6) return null;
    const blk = new Uint8Array(nx * nz); // 0 unknown, 1 free, 2 blocked
    const free = (i, j) => {
      const k = i * nz + j;
      if (!blk[k]) blk[k] = blockedAt(x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL, gy, r) ? 2 : 1;
      return blk[k] === 1;
    };
    const ci = (x) => Math.max(0, Math.min(nx - 1, Math.floor((x - x0) / CELL)));
    const cj = (z) => Math.max(0, Math.min(nz - 1, Math.floor((z - z0) / CELL)));
    const si = ci(from.x), sj = cj(from.z), ti = ci(to.x), tj = cj(to.z);
    const g = new Float32Array(nx * nz).fill(Infinity);
    const came = new Int32Array(nx * nz).fill(-1);
    const closed = new Uint8Array(nx * nz);
    // binary heap
    const heap = [];
    const push = (k, f) => {
      heap.push([f, k]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, rr = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const h = (i, j) => Math.hypot(i - ti, j - tj);
    const sk = si * nz + sj;
    g[sk] = 0;
    push(sk, h(si, sj));
    const goalR = (o.near ?? 0.6) / CELL;
    let found = -1;
    let n = 0;
    while (heap.length && n < 400000) {
      n++;
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      const i = (k / nz) | 0, j = k % nz;
      if (Math.hypot(i - ti, j - tj) <= Math.max(1, goalR)) {
        found = k;
        break;
      }
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue;
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const kk = a * nz + b;
          if (closed[kk]) continue;
          // the start cell may be inside a box's margin: allow leaving it
          if (kk !== sk && !free(a, b)) continue;
          if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
          const ng = g[k] + (di && dj ? 1.4142 : 1);
          if (ng < g[kk]) {
            g[kk] = ng;
            came[kk] = k;
            push(kk, ng + h(a, b));
          }
        }
    }
    if (found < 0) return null;
    const cells = [];
    for (let k = found; k >= 0; k = came[k]) cells.push(k);
    cells.reverse();
    const pts = cells.map((k) => V3(x0 + (((k / nz) | 0) + 0.5) * CELL, gy, z0 + ((k % nz) + 0.5) * CELL));
    // pull tight: keep a point only when the straight line from the last kept one is blocked
    const clear = (a, b) => {
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      const st = Math.max(1, Math.ceil(d / (CELL / 2)));
      for (let s = 1; s < st; s++) {
        const x = a.x + ((b.x - a.x) * s) / st;
        const z = a.z + ((b.z - a.z) * s) / st;
        if (!free(ci(x), cj(z))) return false;
      }
      return true;
    };
    const out = [pts[0]];
    let last = pts[0];
    for (let i = 1; i < pts.length; i++) {
      if (!clear(last, pts[i])) {
        last = pts[i - 1];
        out.push(last);
      }
    }
    out.push(V3(to.x, gy, to.z));
    return out.slice(1);
  };
  // walk to a point by the path finder (true when there), replanning when stuck
  B.go = async (to, o = {}) => {
    to = B.abs(to);
    const near = o.near ?? 0.8;
    const t = performance.now();
    const ms = o.ms ?? 120000;
    let tries = 0;
    while (performance.now() - t < ms && tries < (o.tries ?? 6)) {
      tries++;
      const pts = B.path(to, o);
      if (!pts) {
        B.note('reelle', 'pas de chemin vers ' + [to.x, to.z].map((v) => v.toFixed(1)).join(','));
        return false;
      }
      let stuck = false;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const lastOne = i === pts.length - 1;
        // walk with a progress watch
        const st = performance.now();
        let ref = pos().clone();
        let refT = performance.now();
        if (o.sprint !== false) S.held.add('sprint');
        while (performance.now() - st < 60000) {
          const b = pos();
          if (Math.hypot(p.x - b.x, p.z - b.z) < (lastOne ? near : 0.7)) break;
          Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
          B.steer(p);
          await sl(30);
          if (performance.now() - refT > 1500) {
            if (b.distanceTo(ref) < 0.4) {
              stuck = true;
              break;
            }
            ref = b.clone();
            refT = performance.now();
          }
        }
        if (stuck) break;
      }
      B.stop();
      if (!stuck && Math.hypot(to.x - pos().x, to.z - pos().z) < near + 0.2) return true;
      if (stuck) {
        // a small hop sideways and replan
        S.x = Math.random() < 0.5 ? -1 : 1;
        S.held.add('jump');
        await sl(300);
        S.held.delete('jump');
        await sl(300);
        B.stop();
      }
    }
    B.stop();
    return Math.hypot(to.x - pos().x, to.z - pos().z) < near + 0.2;
  };
  return B;
})();
'lib ok';
