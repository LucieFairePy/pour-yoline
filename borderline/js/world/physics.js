const Phys = (() => {
  const CELL = 12;
  const grid = new Map();
  const dyn = [];
  let stamp = 0;

  const key = (x, z) => (x * 73856093) ^ (z * 19349663);

  const add = (min, max, opt = {}) => {
    const b = {
      min: [...min],
      max: [...max],
      on: true,
      dyn: !!opt.dyn,
      tag: opt.tag || '',
      // what a bullet hits (concrete, metal, wood, glass, dirt); '' = guessed from the tag
      surf: opt.surf || '',
      s: 0,
    };
    if (b.dyn) dyn.push(b);
    else {
      const x0 = Math.floor(b.min[0] / CELL);
      const x1 = Math.floor(b.max[0] / CELL);
      const z0 = Math.floor(b.min[2] / CELL);
      const z1 = Math.floor(b.max[2] / CELL);
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const k = key(x, z);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(b);
        }
    }
    return b;
  };

  const box = (cx, cy, cz, sx, sy, sz, opt) =>
    add([cx - sx / 2, cy - sy / 2, cz - sz / 2], [cx + sx / 2, cy + sy / 2, cz + sz / 2], opt);

  const out = [];
  const query = (x0, z0, x1, z1) => {
    out.length = 0;
    stamp++;
    const a = Math.floor(x0 / CELL);
    const b = Math.floor(x1 / CELL);
    const c = Math.floor(z0 / CELL);
    const d = Math.floor(z1 / CELL);
    for (let x = a; x <= b; x++)
      for (let z = c; z <= d; z++) {
        const l = grid.get(key(x, z));
        if (!l) continue;
        for (const bx of l)
          if (bx.s !== stamp) {
            bx.s = stamp;
            if (bx.on) out.push(bx);
          }
      }
    for (const bx of dyn) if (bx.on) out.push(bx);
    return out;
  };

  const hit = (b, p, r, h) =>
    p.x + r > b.min[0] &&
    p.x - r < b.max[0] &&
    p.z + r > b.min[2] &&
    p.z - r < b.max[2] &&
    p.y + h > b.min[1] &&
    p.y < b.max[1];

  const STEP = 0.45;

  const move = (body, dt) => {
    const { p, v, r, h } = body;
    const dist = Math.hypot(v.x, v.y, v.z) * dt;
    const n = Math.min(8, Math.max(1, Math.ceil(dist / 0.25)));
    const sdt = dt / n;
    const list = query(p.x - r - 2, p.z - r - 2, p.x + r + 2, p.z + r + 2).slice();
    body.ground = null;
    let grounded = false;
    for (let i = 0; i < n; i++) {
      p.y += v.y * sdt;
      for (const b of list) {
        if (!hit(b, p, r, h)) continue;
        if (v.y <= 0 && p.y - v.y * sdt >= b.max[1] - 0.05) {
          p.y = b.max[1];
          v.y = 0;
          grounded = true;
          body.ground = b;
        } else if (v.y > 0) {
          p.y = b.min[1] - h;
          v.y = 0;
        } else if (b.max[1] - p.y <= (b.dyn ? 1.4 : STEP)) {
          p.y = b.max[1];
          v.y = 0;
          grounded = true;
          body.ground = b;
        } else {
          const px = Math.min(p.x + r - b.min[0], b.max[0] - (p.x - r));
          const pz = Math.min(p.z + r - b.min[2], b.max[2] - (p.z - r));
          if (px < pz)
            p.x = p.x < (b.min[0] + b.max[0]) / 2 ? b.min[0] - r - 1e-3 : b.max[0] + r + 1e-3;
          else p.z = p.z < (b.min[2] + b.max[2]) / 2 ? b.min[2] - r - 1e-3 : b.max[2] + r + 1e-3;
        }
      }
      for (const ax of ['x', 'z']) {
        const ai = ax === 'x' ? 0 : 2;
        p[ax] += v[ax] * sdt;
        for (const b of list) {
          if (!hit(b, p, r, h)) continue;
          const top = b.max[1] - p.y;
          if (top > 0 && top <= STEP && (body.grounded || grounded)) {
            let free = true;
            const py = p.y;
            p.y = b.max[1];
            for (const o of list)
              if (o !== b && hit(o, p, r, h)) {
                free = false;
                break;
              }
            if (free) continue;
            p.y = py;
          }
          if (v[ax] > 0) p[ax] = b.min[ai] - r - 1e-4;
          else if (v[ax] < 0) p[ax] = b.max[ai] + r + 1e-4;
          else {
            const c = (b.min[ai] + b.max[ai]) / 2;
            p[ax] = p[ax] < c ? b.min[ai] - r - 1e-4 : b.max[ai] + r + 1e-4;
          }
          v[ax] = 0;
          body.wall = true;
        }
      }
    }
    if (!grounded && v.y <= 0) {
      p.y -= 0.06;
      for (const b of list)
        if (hit(b, p, r, h)) {
          grounded = true;
          body.ground = b;
          break;
        }
      p.y += 0.06;
    }
    body.grounded = grounded;
  };

  const ray = (o, d, max) => {
    const ex = o.x + d.x * max;
    const ez = o.z + d.z * max;
    const list = query(Math.min(o.x, ex), Math.min(o.z, ez), Math.max(o.x, ex), Math.max(o.z, ez));
    let best = max;
    for (const b of list) {
      if (b.tag === 'nocam') continue;
      let t0 = 0;
      let t1 = best;
      let ok = true;
      for (let i = 0; i < 3; i++) {
        const oo = i === 0 ? o.x : i === 1 ? o.y : o.z;
        const dd = i === 0 ? d.x : i === 1 ? d.y : d.z;
        if (Math.abs(dd) < 1e-8) {
          if (oo < b.min[i] || oo > b.max[i]) {
            ok = false;
            break;
          }
        } else {
          let a = (b.min[i] - oo) / dd;
          let c = (b.max[i] - oo) / dd;
          if (a > c) [a, c] = [c, a];
          t0 = Math.max(t0, a);
          t1 = Math.min(t1, c);
          if (t0 > t1) {
            ok = false;
            break;
          }
        }
      }
      if (ok && t0 < best) best = t0;
    }
    return best;
  };

  // A bullet through the world: the nearest box (moving ones included, invisible walls not) that
  // the ray enters past tmin, with the face it enters by. Returns null or the shared hit object.
  const rh = { t: 0, b: null, n: V3(), surf: '' };
  const rayHit = (o, d, max, tmin = 0) => {
    const ex = o.x + d.x * max;
    const ez = o.z + d.z * max;
    const list = query(Math.min(o.x, ex), Math.min(o.z, ez), Math.max(o.x, ex), Math.max(o.z, ez));
    let best = max;
    let bb = null;
    let axis = 0;
    const test = (b) => {
      if (b.tag === 'nocam' || !b.on) return;
      let t0 = -Infinity;
      let t1 = best;
      let ax = 0;
      for (let i = 0; i < 3; i++) {
        const oo = i === 0 ? o.x : i === 1 ? o.y : o.z;
        const dd = i === 0 ? d.x : i === 1 ? d.y : d.z;
        if (Math.abs(dd) < 1e-8) {
          if (oo < b.min[i] || oo > b.max[i]) return;
        } else {
          let a = (b.min[i] - oo) / dd;
          let c = (b.max[i] - oo) / dd;
          if (a > c) [a, c] = [c, a];
          if (a > t0) {
            t0 = a;
            ax = i;
          }
          t1 = Math.min(t1, c);
          if (t0 > t1) return;
        }
      }
      if (t0 >= tmin && t0 < best) {
        best = t0;
        bb = b;
        axis = ax;
      }
    };
    for (const b of list) test(b);
    if (!bb) return null;
    rh.t = best;
    rh.b = bb;
    const dd = axis === 0 ? d.x : axis === 1 ? d.y : d.z;
    rh.n.set(0, 0, 0).setComponent(axis, dd > 0 ? -1 : 1);
    rh.surf =
      bb.surf ||
      (bb.tag === 'glass'
        ? 'glass'
        : bb.tag === 'bench'
          ? 'wood'
          : bb.tag === 'ground'
            ? 'dirt'
            : bb.dyn
              ? 'metal'
              : 'concrete');
    return rh;
  };

  const groundAt = (x, y, z) => {
    let best = -Infinity;
    for (const b of query(x, z, x, z))
      if (x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2] && b.max[1] <= y + 0.3)
        best = Math.max(best, b.max[1]);
    return best;
  };

  return { add, box, move, ray, rayHit, query, groundAt };
})();
