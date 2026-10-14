// ♦ 8 · Les Ombres. A giant shadow theatre, black and gold, open to a dusk sky. Projectors throw
// the shadows of paper cut-outs (and of the two players) onto tall canvas screens; in the narrow
// strip right in front of a screen, "le monde des ombres", every shadow is solid ground.
//  1. Salle des escaliers / Salle du bosquet: one pilots a projector and its cut-outs from the
//     régie, the other walks the shadows across the pit (roles swap between the two rooms).
//  2. Les silhouettes: the screen door opens when the combined shadow of both bodies and props
//     matches a target only one of you can see (le couple, la clé).
//  3. Les deux lumières: a red and a blue projector; only where both shadows meet (black) is solid.
//  4. Le Montreur d'ombres: a giant shadow puppet on the main screen; the light pilot corners it by
//     switching the three projectors, the runner climbs the shadows and cuts its four strings.
// Pure geometry, shadow maths and visuals here; rules, sync and HUD live in js/levels/tr_d6.js.
const D6W = (() => {
  const O = V3(700, 0, 8400);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- the cut-out silhouettes: one atlas, drawn once; masks read back for the colliders ----------
  const TILE = { stairs: 0, cloud: 1, tree: 2, heart: 3, ring: 4, teeth: 5, bar: 6, gate: 7, balcony: 8, moon: 9, arch: 10, post: 11 };
  const TS = 512;
  const TC = 4;
  const TRW = 3;
  const MG = 64; // mask resolution read back per tile
  const G = 32; // collider grid per cut-out
  const atlasCv = document.createElement('canvas');
  atlasCv.width = TS * TC;
  atlasCv.height = TS * TRW;
  const masks = [];
  const shapes = {
    stairs(g) {
      // four steps rising to the right (as seen from the stalls)
      for (let k = 0; k < 4; k++) g.rect(16 + k * 120, 496 - (k + 1) * 120, 121, (k + 1) * 120);
    },
    cloud(g) {
      // flat on top (you stand on it), scalloped underneath
      g.moveTo(70, 40);
      g.lineTo(442, 40);
      g.arc(442, 150, 110, -Math.PI / 2, Math.PI / 2);
      g.lineTo(70, 260);
      g.arc(70, 150, 110, Math.PI / 2, (3 * Math.PI) / 2);
      g.closePath();
      [
        [130, 300, 110],
        [256, 330, 140],
        [384, 300, 110],
      ].forEach(([x, y, r]) => {
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      });
    },
    tree(g) {
      g.rect(226, 380, 60, 116);
      // three tiers with flat tops, a little star on the crown
      for (let i = 0; i < 3; i++) {
        const bw = 480 - i * 120;
        const tw = bw * 0.46;
        const yb = 400 - i * 118;
        const h = 132;
        g.moveTo(256 - bw / 2, yb);
        g.lineTo(256 + bw / 2, yb);
        g.lineTo(256 + tw / 2, yb - h);
        g.lineTo(256 - tw / 2, yb - h);
        g.closePath();
      }
      g.rect(236, 16, 40, 40);
    },
    heart(g) {
      for (let i = 0; i <= 120; i++) {
        const [x, y] = Heart.curve((i / 120) * TAU);
        const px = 256 + x * 14.6;
        const py = 252 - (y - 2.5) * 15.4;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.closePath();
    },
    ring(g) {
      g.moveTo(256 + 236, 256);
      g.arc(256, 256, 236, 0, TAU);
      g.moveTo(256 + 128, 256);
      g.arc(256, 256, 128, 0, TAU, true);
    },
    teeth(g) {
      // a key bit: a spine on the left, three teeth to the right
      g.rect(16, 16, 150, 480);
      g.rect(16, 30, 470, 110);
      g.rect(16, 218, 370, 92);
      g.rect(16, 386, 440, 100);
    },
    bar(g) {
      g.roundRect ? g.roundRect(16, 16, 480, 480, 36) : g.rect(16, 16, 480, 480);
    },
    gate(g) {
      // a tall arched grille, solid
      g.moveTo(16, 496);
      g.lineTo(16, 200);
      g.arc(256, 200, 240, Math.PI, 0);
      g.lineTo(496, 496);
      g.closePath();
    },
    balcony(g) {
      // a theatre box: flat ledge on top, a draped valance and a corbel below
      g.rect(16, 30, 480, 84);
      g.moveTo(40, 114);
      g.lineTo(472, 114);
      g.lineTo(472, 200);
      for (let k = 5; k >= 0; k--) {
        const x0 = 40 + (k + 1) * 72;
        const x1 = 40 + k * 72;
        g.quadraticCurveTo((x0 + x1) / 2, 290, x1, 200);
      }
      g.closePath();
      g.moveTo(190, 240);
      g.lineTo(322, 240);
      g.lineTo(256, 470);
      g.closePath();
    },
    moon(g) {
      g.moveTo(256 + 236, 256);
      g.arc(256, 256, 236, 0, TAU);
    },
    arch(g) {
      // a bridge: a flat deck on two piers, the arch carved out below
      g.moveTo(16, 40);
      g.lineTo(496, 40);
      g.lineTo(496, 496);
      g.lineTo(416, 496);
      g.arc(256, 496, 160, 0, Math.PI, true);
      g.lineTo(16, 496);
      g.closePath();
    },
    post(g) {
      g.rect(176, 60, 160, 400);
      g.rect(130, 16, 252, 60);
      g.rect(130, 440, 252, 56);
    },
  };
  const drawAtlas = () => {
    const g = atlasCv.getContext('2d');
    g.clearRect(0, 0, atlasCv.width, atlasCv.height);
    Object.entries(TILE).forEach(([k, i]) => {
      g.save();
      g.translate((i % TC) * TS, Math.floor(i / TC) * TS);
      g.beginPath();
      shapes[k](g);
      g.fillStyle = '#000';
      // only the ring has a hole (its inner arc is drawn backwards); overlapping parts stay solid
      g.fill(k === 'ring' ? 'evenodd' : 'nonzero');
      if (k === 'moon') {
        // the crescent: bite out a second disc
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.arc(356, 196, 214, 0, TAU);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      g.restore();
    });
    const img = g.getImageData(0, 0, atlasCv.width, atlasCv.height).data;
    Object.values(TILE).forEach((i) => {
      const m = new Uint8Array(MG * MG);
      const ox = (i % TC) * TS;
      const oy = Math.floor(i / TC) * TS;
      for (let y = 0; y < MG; y++)
        for (let x = 0; x < MG; x++) {
          const px = ox + Math.floor(((x + 0.5) / MG) * TS);
          const py = oy + Math.floor(((y + 0.5) / MG) * TS);
          m[y * MG + x] = img[(py * atlasCv.width + px) * 4 + 3] > 127 ? 1 : 0;
        }
      masks[i] = m;
    });
  };
  let atlasTex = null;
  // oriented (u, v) in [-0.5, 0.5] (u to the viewer's right, v up) -> base tile coords
  const ORI = [];
  for (let o = 0; o < 8; o++) {
    const rot = o & 3;
    const f = o >> 2 ? -1 : 1;
    const c = [1, 0, -1, 0][rot];
    const s = [0, 1, 0, -1][rot];
    ORI.push([f * c, f * s, -s, c]);
  }
  const maskAt = (tile, bu, bv) => {
    if (bu < 0 || bu >= 1 || bv < 0 || bv >= 1) return 0;
    return masks[tile][Math.floor((1 - bv) * MG) * MG + Math.floor(bu * MG)];
  };
  const oMask = (tile, o, u, v) => {
    const M = ORI[o];
    return maskAt(tile, M[0] * u + M[1] * v + 0.5, M[2] * u + M[3] * v + 0.5);
  };
  // the oriented mask as rectangles (normalized, a to the viewer's right, b up), merged greedily
  const rectCache = new Map();
  const rectsOf = (tile, o) => {
    const k = tile * 8 + o;
    if (rectCache.has(k)) return rectCache.get(k);
    const out = [];
    let open = new Map();
    for (let j = 0; j < G; j++) {
      const runs = [];
      let i = 0;
      while (i < G) {
        while (i < G && !oMask(tile, o, (i + 0.5) / G - 0.5, (j + 0.5) / G - 0.5)) i++;
        if (i >= G) break;
        const i0 = i;
        while (i < G && oMask(tile, o, (i + 0.5) / G - 0.5, (j + 0.5) / G - 0.5)) i++;
        runs.push([i0, i]);
      }
      const next = new Map();
      runs.forEach(([a, b]) => {
        const key = a + ',' + b;
        const r = open.get(key);
        if (r) {
          r[3] = (j + 1) / G;
          next.set(key, r);
          open.delete(key);
        } else {
          const nr = [a / G, b / G, j / G, (j + 1) / G];
          out.push(nr);
          next.set(key, nr);
        }
      });
      open = next;
    }
    rectCache.set(k, out);
    return out;
  };
  const osize = (c) => (c.o & 1 ? [c.h, c.w] : [c.w, c.h]);

  // ---------- shadow maths (relative coordinates) ----------
  // a point on the cut-out plane, seen from light L, lands on the screen at z = zw
  const projT = (L, cz, zw) => (zw - L.z) / (cz - L.z);
  const shadowRects = (w, L, out) => {
    for (const c of w.cuts) {
      if (!c.on) continue;
      if (c.z <= L.z + 0.2 || c.z >= w.zw) continue;
      const [ww, hh] = osize(c);
      const t = projT(L, c.z, w.zw);
      for (const r of rectsOf(c.tile, c.o)) {
        const xa = c.x - (r[1] - 0.5) * ww;
        const xb = c.x - (r[0] - 0.5) * ww;
        const ya = c.y + (r[2] - 0.5) * hh;
        const yb = c.y + (r[3] - 0.5) * hh;
        out.push([L.x + (xa - L.x) * t, L.x + (xb - L.x) * t, L.y + (ya - L.y) * t, L.y + (yb - L.y) * t]);
      }
    }
    return out;
  };
  const clipR = (r, x0, x1, y0, y1) => {
    const a = Math.max(r[0], x0);
    const b = Math.min(r[1], x1);
    const c = Math.max(r[2], y0);
    const d = Math.min(r[3], y1);
    return b - a > 0.06 && d - c > 0.06 ? [a, b, c, d] : null;
  };
  const solidsOf = (w) => {
    const act = w.lights.filter((l) => l.on);
    let acc = [];
    if (!act.length) return acc;
    if (w.mode === 'split') {
      act.forEach((L) => {
        const b = L.beam;
        shadowRects(w, L, []).forEach((r) => {
          const q = clipR(r, Math.max(b[0], w.x0), Math.min(b[1], w.x1), Math.max(b[2], 0), Math.min(b[3], w.H));
          if (q) acc.push(q);
        });
      });
      return acc;
    }
    acc = shadowRects(w, act[0], [])
      .map((r) => clipR(r, w.x0, w.x1, 0, w.H))
      .filter(Boolean);
    for (let i = 1; i < act.length; i++) {
      const other = shadowRects(w, act[i], []);
      const nx = [];
      acc.forEach((a) =>
        other.forEach((b) => {
          const q = clipR(a, b[0], b[1], b[2], b[3]);
          if (q) nx.push(q);
        }),
      );
      acc = nx;
    }
    if (w.keepOut) {
      w.keepOut.forEach(([k0, k1, ky]) => {
        const nx = [];
        acc.forEach((r) => {
          if (r[1] <= k0 || r[0] >= k1 || r[2] >= ky) return nx.push(r);
          if (r[0] < k0) nx.push([r[0], k0, r[2], r[3]]);
          if (r[1] > k1) nx.push([k1, r[1], r[2], r[3]]);
          if (r[3] > ky) nx.push([Math.max(r[0], k0), Math.min(r[1], k1), ky, r[3]]);
        });
        acc = nx.filter((r) => r[1] - r[0] > 0.06 && r[3] - r[2] > 0.06);
      });
    }
    return acc;
  };
  // is a screen point (relative x, y) cut off from light L by this wall's cut-outs?
  const blockedCut = (w, L, X, Y) => {
    for (const c of w.cuts) {
      if (!c.on || c.z <= L.z + 0.2 || c.z >= w.zw) continue;
      const s = (c.z - L.z) / (w.zw - L.z);
      const px = L.x + (X - L.x) * s;
      const py = L.y + (Y - L.y) * s;
      const [ww, hh] = osize(c);
      const u = (c.x - px) / ww;
      const v = (py - c.y) / hh;
      if (Math.abs(u) < 0.5 && Math.abs(v) < 0.5 && oMask(c.tile, c.o, u, v)) return true;
    }
    return false;
  };
  // the bodies: a capsule (legs and torso) and a head; hands joined when close enough
  const BODY = { a: 0.28, b: 1.3, r: 0.25, head: 1.6, hr: 0.17, hand: 1.02, hrad: 0.075 };
  const segDist = (p1, q1, p2, q2) => {
    const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]];
    const d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]];
    const r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const a = dot(d1, d1);
    const e = dot(d2, d2);
    const f = dot(d2, r);
    const c = dot(d1, r);
    const b = dot(d1, d2);
    const den = a * e - b * b;
    let s = den > 1e-6 ? clamp((b * f - c * e) / den, 0, 1) : 0;
    let t = (b * s + f) / e;
    if (t < 0) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else if (t > 1) {
      t = 1;
      s = clamp((b - c) / a, 0, 1);
    }
    return Math.hypot(p1[0] + d1[0] * s - p2[0] - d2[0] * t, p1[1] + d1[1] * s - p2[1] - d2[1] * t, p1[2] + d1[2] * s - p2[2] - d2[2] * t);
  };
  const ptSeg = (p, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2), 0, 1);
    return Math.hypot(a[0] + ab[0] * t - p[0], a[1] + ab[1] * t - p[1], a[2] + ab[2] * t - p[2]);
  };
  const handsOf = (bodies) => {
    if (bodies.length < 2) return null;
    const [a, b] = bodies;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    if (d > 1.75 || d < 0.3 || Math.abs(a.y - b.y) > 0.5) return null;
    const k = 0.22 / d;
    return [
      [a.x + dx * k, a.y + BODY.hand, a.z + dz * k],
      [b.x - dx * k, b.y + BODY.hand, b.z - dz * k],
    ];
  };
  const blockedBody = (L, Wp, bodies, hands) => {
    const l = [L.x, L.y, L.z];
    for (const p of bodies) {
      if (segDist(Wp, l, [p.x, p.y + BODY.a, p.z], [p.x, p.y + BODY.b, p.z]) < BODY.r) return true;
      if (ptSeg([p.x, p.y + BODY.head, p.z], Wp, l) < BODY.hr) return true;
    }
    if (hands && segDist(Wp, l, hands[0], hands[1]) < BODY.hrad) return true;
    return false;
  };
  /** the shadow mask of a screen region: 1 where no light reaches (relative coords) */
  const shadowGrid = (w, bodies, x0, x1, y0, y1, nx, ny) => {
    const out = new Uint8Array(nx * ny);
    const act = w.lights.filter((l) => l.on);
    const hands = handsOf(bodies);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const X = x1 - ((i + 0.5) / nx) * (x1 - x0); // i grows to the viewer's right (= -x)
        const Y = y0 + ((j + 0.5) / ny) * (y1 - y0);
        let dark = act.length > 0;
        for (const L of act) {
          if (!blockedCut(w, L, X, Y) && !blockedBody(L, [X, Y, w.zw], bodies, hands)) {
            dark = false;
            break;
          }
        }
        out[(ny - 1 - j) * nx + i] = dark ? 1 : 0;
      }
    return out;
  };

  // ---------- materials ----------
  const velvet = new THREE.MeshStandardMaterial({ color: '#4a0b18', roughness: 0.95, metalness: 0, emissive: '#0a0106', emissiveIntensity: 1 });
  const seatVelvet = new THREE.MeshStandardMaterial({ color: '#36070f', roughness: 0.93 });
  const blackVelvet = new THREE.MeshStandardMaterial({ color: '#0d0a0e', roughness: 1 });
  const stageWood = Tex.mat('wood', { color: '#3a2519', scale: 3.4, rough: 0.66, bump: 0.45 });
  const darkWood = Tex.mat('wood', { color: '#2a1a14', scale: 2, rough: 0.8, bump: 0.6 });
  const plaster = Tex.mat('plaster', { color: '#2a2230', scale: 4, rough: 0.95, bump: 0.5 });
  const marble = Tex.mat('marble', { color: '#2c2630', scale: 3, rough: 0.6, bump: 0.3 });
  const stone = Tex.mat('stone', { color: '#3a3238', scale: 3, rough: 0.9, bump: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c99a48', roughness: 0.38, metalness: 0.25, emissive: '#3a2406', emissiveIntensity: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.45, metalness: 0.2, emissive: '#1e1206', emissiveIntensity: 0.5 });
  const lacquer = new THREE.MeshStandardMaterial({ color: '#16121a', roughness: 0.45, metalness: 0.1 });
  const glow = (c, k = 1) => LvKit.glow(c, k);

  // ---------- layout (relative to O) ----------
  // pit rooms: stalls, then the pit, then the screen; the walker's strip is the last D metres
  const D = 2.4;
  const SX = 16; // screen half width in the pit rooms
  const ROOMS = {
    r1: { kind: 'pit', zs: 0, zw: 24, sw: 1.5, ew: 7.5, H: 14 },
    r2: { kind: 'pit', zs: 33, zw: 57, sw: 1.5, ew: 4.5, H: 14 },
    r3: { kind: 'stage', zs: 66, zw: 90, H: 9 },
    r4: { kind: 'stage', zs: 91, zw: 113, H: 9 },
    r5: { kind: 'pit', zs: 114, zw: 138, sw: 1.5, ew: 1.5, H: 12 },
    boss: { kind: 'boss', zs: 154, zw: 188, H: 22 },
  };
  Object.values(ROOMS).forEach((r) => {
    if (r.kind === 'pit') r.zp = r.zw - 6.5;
  });
  const BOSS = { zp: 178, apron: 184.5, sx: 27, D: 2.3, secs: [[9, 27], [-9, 9], [-27, -9]], lightZ: 174, lightY: 5, cutZ: 183 };
  // the walker's goal plate: the exit wing (viewer's right = -x)
  const exitWing = (r) => ({ x0: -22, x1: -SX, z0: r.zw - D, z1: r.zw, top: r.ew });
  const startWing = (r) => ({ x0: SX, x1: 22, z0: r.zw - D, z1: r.zw, top: r.sw });
  const CONSOLE = {
    r1: [5.5, 7.5],
    r2: [5.5, 40.5],
    r4: [8.5, 99.5],
    r5: [5.5, 121.5],
  };
  // walls: lights and cut-outs (all positions relative; x grows to the viewer's left)
  const warm = [0.92, 0.8, 0.6];
  const WALLS = {};
  const wallDef = (id, room, extra) => {
    const r = ROOMS[room];
    const w = {
      id,
      room,
      zw: r.zw,
      x0: r.kind === 'boss' ? -BOSS.sx : r.kind === 'stage' ? -12 : -SX,
      x1: r.kind === 'boss' ? BOSS.sx : r.kind === 'stage' ? 12 : SX,
      H: r.H,
      D: r.kind === 'boss' ? BOSS.D : D,
      mode: 'full',
      lights: [],
      cuts: [],
      solids: [],
      key: '',
      active: false,
      ...extra,
    };
    WALLS[id] = w;
    return w;
  };
  // R1 · one projector (moves on the floor: across, and nearer or further), a cloud and a stair
  wallDef('r1', 'r1', {
    lights: [{ x: 0, y: 3.5, z: 12, on: true, col: warm }],
    cuts: [
      { name: 'Le nuage', tile: TILE.cloud, w: 2.8, h: 1.1, o: 0, x: 9.1, y: 1.62, z: 20, on: true, lim: { x: [-11, 11], y: [0.6, 3.6] } },
      { name: 'L’escalier', tile: TILE.stairs, w: 2.4, h: 2.4, o: 0, x: -3, y: 2.2, z: 19.6, on: true, lim: { x: [-11, 11], y: [1.2, 4.2] } },
    ],
    rig: { light: { x: [-9, 9], z: [9, 15] } },
  });
  // R2 · a tree that only turns (upside down, its tiers make a table), a heart that moves and turns,
  // a high moon that only the projector moves
  wallDef('r2', 'r2', {
    lights: [{ x: 0, y: 3.5, z: 45, on: true, col: warm }],
    cuts: [
      { name: 'L’arbre', tile: TILE.tree, w: 2.6, h: 3.4, o: 0, x: -7.5, y: 2.6, z: 53, on: true, turn: true, lim: { x: [-7.5, -7.5], y: [2.6, 2.6] } },
      { name: 'Le cœur', tile: TILE.heart, w: 1.7, h: 1.6, o: 2, x: 8.4, y: 1.43, z: 52.6, on: true, turn: true, lim: { x: [-11, 11], y: [0.6, 2.4] } },
      { name: 'La lune', tile: TILE.moon, w: 1.5, h: 1.5, o: 0, x: 3, y: 7.4, z: 53.4, on: true, fixed: true },
    ],
    rig: { light: { x: [-9, 9], z: [42, 48] } },
  });
  // R3 · le couple: a low lamp, a heart hung above the place where the hands should meet
  wallDef('r3', 'r3', {
    lights: [{ x: 0, y: 1.25, z: 74, on: true, col: warm }],
    cuts: [{ tile: TILE.heart, w: 0.62, h: 0.58, o: 0, x: 0, y: 2.55, z: 84.6, on: true, fixed: true }],
  });
  // R4 · la clé: the bow and the bit on fly bars (the régie), the shaft is a body
  wallDef('r4', 'r4', {
    lights: [{ x: 0, y: 1.3, z: 97, on: true, col: warm }],
    cuts: [
      { name: 'L’anneau', tile: TILE.ring, w: 0.95, h: 0.95, o: 0, x: 2.6, y: 3.3, z: 106.2, on: true, lim: { x: [-3.4, 3.4], y: [1.0, 3.8] } },
      { name: 'Le panneton', tile: TILE.teeth, w: 0.62, h: 0.78, o: 0, x: -2.8, y: 1.4, z: 106.6, on: true, turn: true, lim: { x: [-3.4, 3.4], y: [0.25, 2.6] } },
    ],
  });
  // R5 · two projectors on two rails, red and blue: only where both shadows overlap is solid
  const NOTCH = { red: [11, 8.5, 6, 3.5], blue: [-3.5, -6, -8.5, -11] };
  wallDef('r5', 'r5', {
    lights: [
      { x: NOTCH.red[1], y: 4, z: 123, on: true, col: [0.78, 0.13, 0.15], name: 'Rouge' },
      { x: NOTCH.blue[1], y: 4, z: 123, on: true, col: [0.17, 0.3, 0.84], name: 'Bleu' },
    ],
    // filled in below (the course)
    cuts: [],
  });
  // the boss screen: three projectors, each lighting its own third (barn doors)
  wallDef('boss', 'boss', {
    mode: 'split',
    lights: BOSS.secs.map(([a, b]) => ({ x: (a + b) / 2, y: BOSS.lightY, z: BOSS.lightZ, on: true, col: [0.9, 0.74, 0.5], beam: [a, b, 0, 22] })),
    cuts: [],
  });
  // R5 course (wall coordinates first, turned into cut-outs). Stone posts to wait on; between
  // them a platform that only exists where a red bar's shadow meets a blue bar's shadow, for one
  // pair of notches; and a gate in every stretch, a solid wall under a single light (both lights on,
  // its two shadows always split apart: colour, not ground).
  const POSTS = [
    [7.6, 9.4, 1.5],
    [-0.8, 0.8, 2.6],
    [-9.4, -7.6, 1.5],
  ];
  const R5SEG = [
    { p: [11.0, 13.6], top: 1.8, red: 0, blue: 2 },
    { p: [3.0, 5.6], top: 2.3, red: 2, blue: 0 },
    { p: [-5.6, -3.0], top: 2.3, red: 1, blue: 3 },
    { p: [-13.6, -11.0], top: 1.8, red: 3, blue: 1 },
  ];
  const r5Course = () => {
    const w = WALLS.r5;
    const Ly = 4;
    const Lz = 123;
    const cz = 133;
    const t = (w.zw - Lz) / (cz - Lz);
    // a cut-out whose shadow, under a light at x = lx, spans [X0, X1] x [Y0, Y1]
    const cutFor = (tile, X0, X1, Y0, Y1, lx) => {
      const xa = lx + (X0 - lx) / t;
      const xb = lx + (X1 - lx) / t;
      const ya = Ly + (Y0 - Ly) / t;
      const yb = Ly + (Y1 - Ly) / t;
      return { tile, w: xb - xa, h: yb - ya, o: 0, x: (xa + xb) / 2, y: (ya + yb) / 2, z: cz, on: true, fixed: true };
    };
    const C = [];
    R5SEG.forEach((sg) => {
      const [p0, p1] = sg.p;
      C.push(cutFor(TILE.bar, p0 - 1.3, p1, sg.top - 0.6, sg.top, NOTCH.red[sg.red]));
      C.push(cutFor(TILE.bar, p0, p1 + 1.3, sg.top - 0.6, sg.top, NOTCH.blue[sg.blue]));
    });
    // gates: centred on each stretch under the middle red notches; the last one for the blue rail
    const midR = (NOTCH.red[1] + NOTCH.red[2]) / 2;
    const midB = (NOTCH.blue[1] + NOTCH.blue[2]) / 2;
    [12.3, 4.3, -4.3, -12.3].forEach((m) => C.push(cutFor(TILE.gate, m - 0.6, m + 0.6, 0, 11.5, midR)));
    // (placed in the last gap, so that under the right notches it never meets a bar's shadow)
    C.push(cutFor(TILE.gate, -15.2, -14.0, 0, 11.5, midB));
    w.cuts = C;
    // nothing solid ever grows over the posts or the wings (you would be pushed off)
    w.keepOut = [...POSTS.map(([a, b, top]) => [a - 0.35, b + 0.35, top + 2.3]), [15.65, 99, 3.8], [-99, -15.65, 3.8]];
  };
  r5Course();
  // boss balconies: the same layout in each third, two seen from each side
  // a zig-zag of boxes, 0.9 m apart sideways, each one 2.2 m above the last (a jump up and over);
  // the apron keeps a free lane in front of the strip (BOSS.D < apron depth) to run between thirds
  const BAL = [
    [-4.6, 2.4, 4.0],
    [0.2, 4.6, 3.8],
    [-4.5, 6.8, 3.8],
    [0.2, 9.0, 3.8],
  ];
  const KNOTS = [
    [-3.2, 3.6],
    [1.0, 5.8],
    [-3.2, 8.0],
    [1.0, 10.2],
  ];
  const bossCuts = () => {
    const w = WALLS.boss;
    BOSS.secs.forEach(([a, b], s) => {
      const cx = (a + b) / 2;
      const L = w.lights[s];
      const t = projT(L, BOSS.cutZ, w.zw);
      BAL.forEach(([u, top, wd], k) => {
        // shadow: x in [cx + u - wd/2, cx + u + wd/2] (u to the viewer's right is -x), top at `top`
        const X = cx - u;
        const hW = 1.9; // shadow height of the whole balcony
        const xa = L.x + (X - wd / 2 - L.x) / t;
        const xb = L.x + (X + wd / 2 - L.x) / t;
        const ya = L.y + (top - hW - L.y) / t;
        const yb = L.y + (top - L.y) / t;
        w.cuts.push({ tile: TILE.balcony, w: xb - xa, h: yb - ya, o: k & 1 ? 4 : 0, x: (xa + xb) / 2, y: (ya + yb) / 2, z: BOSS.cutZ, on: true, fixed: true, sec: s });
      });
    });
  };
  bossCuts();
  // the rig as designed, to start every visit from it (a saved rig is applied on top)
  const DEF = {};
  Object.values(WALLS).forEach((w) => {
    DEF[w.id] = { L: w.lights.map((l) => [l.x, l.y, l.z, l.on]), C: w.cuts.map((c) => [c.x, c.y, c.o, c.on]) };
  });
  const resetRig = () =>
    Object.values(WALLS).forEach((w) => {
      DEF[w.id].L.forEach(([x, y, z, on], i) => Object.assign(w.lights[i], { x, y, z, on }));
      DEF[w.id].C.forEach(([x, y, o, on], i) => Object.assign(w.cuts[i], { x, y, o, on }));
      w.key = '';
    });
  const RINGS = BOSS.secs.map(([a, b]) => V3((a + b) / 2 - 0.4, 12.6, ROOMS.boss.zw - 1.4));

  // ---------- the screen shader ----------
  const MAXL = 3;
  const MAXC = 13;
  const screenMat = (w) => {
    const U = {
      uAtlas: { value: atlasTex },
      uL: { value: [...Array(MAXL)].map(() => new THREE.Vector4()) },
      uLC: { value: [...Array(MAXL)].map(() => new THREE.Vector3()) },
      uLB: { value: [...Array(MAXL)].map(() => new THREE.Vector4(-1e4, 1e4, -1e4, 1e4)) },
      uC: { value: [...Array(MAXC)].map(() => new THREE.Vector4()) },
      uCS: { value: [...Array(MAXC)].map(() => new THREE.Vector4(1, 1, 0, 0)) },
      uCM: { value: [...Array(MAXC)].map(() => new THREE.Vector4(1, 0, 0, 1)) },
      uP: { value: [new THREE.Vector4(), new THREE.Vector4()] },
      uH0: { value: new THREE.Vector4() },
      uH1: { value: new THREE.Vector4() },
      uTime: { value: 0 },
      uGold: { value: 0 },
      uWarn: { value: new THREE.Vector4(0, 0, 0, 0) },
      uWarnK: { value: 0 },
      uRect: { value: new THREE.Vector4(O.x + w.x0, O.x + w.x1, O.y, O.y + w.H) },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: `
        varying vec3 vW;
        void main() {
          vec4 p = modelMatrix * vec4(position, 1.0);
          vW = p.xyz;
          gl_Position = projectionMatrix * viewMatrix * p;
        }`,
      fragmentShader: `
        uniform sampler2D uAtlas;
        uniform vec4 uL[${MAXL}];
        uniform vec3 uLC[${MAXL}];
        uniform vec4 uLB[${MAXL}];
        uniform vec4 uC[${MAXC}];
        uniform vec4 uCS[${MAXC}];
        uniform vec4 uCM[${MAXC}];
        uniform vec4 uP[2];
        uniform vec4 uH0, uH1, uWarn, uRect;
        uniform float uTime, uGold, uWarnK;
        varying vec3 vW;
        float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
        }
        float segSeg(vec3 p1, vec3 q1, vec3 p2, vec3 q2) {
          vec3 d1 = q1 - p1; vec3 d2 = q2 - p2; vec3 r = p1 - p2;
          float a = dot(d1, d1); float e = dot(d2, d2); float f = dot(d2, r);
          float c = dot(d1, r); float b = dot(d1, d2);
          float den = a * e - b * b;
          float s = den > 1e-6 ? clamp((b * f - c * e) / den, 0.0, 1.0) : 0.0;
          float t = (b * s + f) / e;
          if (t < 0.0) { t = 0.0; s = clamp(-c / a, 0.0, 1.0); }
          else if (t > 1.0) { t = 1.0; s = clamp((b - c) / a, 0.0, 1.0); }
          return length(p1 + d1 * s - p2 - d2 * t);
        }
        float ptSeg(vec3 p, vec3 a, vec3 b) {
          vec3 ab = b - a;
          float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
          return length(a + ab * t - p);
        }
        float occ(vec3 W, vec3 L) {
          float o = 0.0;
          for (int j = 0; j < ${MAXC}; j++) {
            vec4 c = uC[j];
            if (c.w < 0.5) continue;
            float s = (c.z - L.z) / (W.z - L.z);
            if (s <= 0.0 || s >= 1.0) continue;
            vec3 X = L + (W - L) * s;
            vec2 uv = vec2((c.x - X.x) / uCS[j].x, (X.y - c.y) / uCS[j].y);
            if (abs(uv.x) > 0.5 || abs(uv.y) > 0.5) continue;
            vec4 m = uCM[j];
            vec2 b = vec2(m.x * uv.x + m.y * uv.y, m.z * uv.x + m.w * uv.y) + 0.5;
            b = clamp(b, 0.003, 0.997);
            float a = texture2D(uAtlas, uCS[j].zw + b * vec2(0.25, 0.33333)).a;
            o = max(o, smoothstep(0.25, 0.75, a));
          }
          for (int k = 0; k < 2; k++) {
            vec4 p = uP[k];
            if (p.w < 0.5) continue;
            float d = segSeg(W, L, p.xyz + vec3(0.0, ${BODY.a}, 0.0), p.xyz + vec3(0.0, ${BODY.b}, 0.0));
            o = max(o, smoothstep(${BODY.r + 0.03}, ${BODY.r - 0.03}, d));
            float dh = ptSeg(p.xyz + vec3(0.0, ${BODY.head}, 0.0), W, L);
            o = max(o, smoothstep(${BODY.hr + 0.025}, ${BODY.hr - 0.025}, dh));
          }
          if (uH0.w > 0.5) {
            float dd = segSeg(W, L, uH0.xyz, uH1.xyz);
            o = max(o, smoothstep(${BODY.hrad + 0.02}, ${BODY.hrad - 0.02}, dd));
          }
          return o;
        }
        void main() {
          vec3 W = vW;
          // the canvas: a coarse weave, faint seams, the paint worn at the bottom
          float wv = 0.5 + 0.5 * sin(W.x * 70.0) * sin(W.y * 70.0);
          float n = vn(W.xy * 0.9) * 0.6 + vn(W.xy * 3.1) * 0.4;
          vec3 base = vec3(0.86, 0.79, 0.66) * (0.9 + 0.06 * wv + 0.08 * n);
          base *= 1.0 - 0.18 * smoothstep(2.0, 0.0, W.y - uRect.z);
          vec3 lit = vec3(0.0);
          for (int i = 0; i < ${MAXL}; i++) {
            vec4 L = uL[i];
            if (L.w < 0.5) continue;
            vec4 B = uLB[i];
            float bk = smoothstep(B.x - 0.25, B.x + 0.25, W.x) * smoothstep(B.y + 0.25, B.y - 0.25, W.x)
              * smoothstep(B.z - 0.25, B.z + 0.25, W.y) * smoothstep(B.w + 0.25, B.w - 0.25, W.y);
            if (bk < 0.002) continue;
            vec2 d = W.xy - L.xy;
            float fall = 0.3 + 0.7 * exp(-dot(d, d) / 150.0);
            float o = occ(W, L.xyz);
            lit += uLC[i] * fall * bk * (1.0 - o) * L.w;
          }
          vec3 col = base * (vec3(0.05, 0.045, 0.07) + lit);
          // a soft dark border where the canvas meets its frame
          float ex = min(W.x - uRect.x, uRect.y - W.x);
          float ey = uRect.w - W.y;
          col *= smoothstep(0.0, 0.7, ex) * smoothstep(0.0, 0.7, ey);
          // the puppet's telegraphed strikes: a pulsing glow over the column / band
          if (uWarnK > 0.001) {
            float inx = smoothstep(uWarn.x - 0.2, uWarn.x + 0.2, W.x) * smoothstep(uWarn.y + 0.2, uWarn.y - 0.2, W.x);
            float iny = smoothstep(uWarn.z - 0.2, uWarn.z + 0.2, W.y) * smoothstep(uWarn.w + 0.2, uWarn.w - 0.2, W.y);
            col += vec3(0.55, 0.12, 0.08) * inx * iny * uWarnK;
          }
          // the gold warms the lit canvas; the shadows stay dark (a little glow creeps in)
          col += vec3(0.42, 0.3, 0.12) * uGold * (0.7 + 0.3 * n) * (0.18 + 0.82 * min(1.0, dot(lit, vec3(0.45))));
          gl_FragColor = vec4(min(col, vec3(0.86)), 1.0);
        }`,
    });
    m.userData.U = U;
    return m;
  };
  const setScreenU = (w) => {
    const U = w.U;
    for (let i = 0; i < MAXL; i++) {
      const L = w.lights[i];
      if (!L) {
        U.uL.value[i].set(0, 0, 0, 0);
        continue;
      }
      U.uL.value[i].set(O.x + L.x, O.y + L.y, O.z + L.z, L.on ? L.k == null ? 1 : L.k : 0);
      const fl = L.flick == null ? 1 : L.flick;
      U.uLC.value[i].set(L.col[0] * fl, L.col[1] * fl, L.col[2] * fl);
      const b = L.beam;
      if (b) U.uLB.value[i].set(O.x + b[0], O.x + b[1], O.y + b[2], O.y + b[3]);
    }
    for (let j = 0; j < MAXC; j++) {
      const c = w.cuts[j];
      if (!c || !c.on) {
        U.uC.value[j].w = 0;
        continue;
      }
      const [ww, hh] = osize(c);
      U.uC.value[j].set(O.x + c.x, O.y + c.y, O.z + c.z, 1);
      U.uCS.value[j].set(ww, hh, (c.tile % TC) / TC, 1 - (Math.floor(c.tile / TC) + 1) / TRW);
      const M = ORI[c.o];
      U.uCM.value[j].set(M[0], M[1], M[2], M[3]);
    }
  };

  // ---------- the solid shadows: colliders + a smoky volume and a gold edge for each ----------
  const POOL = 220;
  const volGeo = new THREE.BoxGeometry(1, 1, 1);
  const volMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vW;
      void main() {
        vec4 p = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = p.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `
      uniform float uTime; varying vec3 vN; varying vec3 vW;
      float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float sm = vn(vW.xy * 1.6 + vec2(uTime * 0.3, -uTime * 0.5)) * 0.6 + vn(vW.zy * 2.3 - uTime * 0.4) * 0.4;
        float top = smoothstep(0.6, 0.95, vN.y);
        vec3 c = mix(vec3(0.015, 0.01, 0.02), vec3(0.2, 0.14, 0.05), top * 0.6);
        float a = (0.34 + 0.22 * sm) * (1.0 - top * 0.35);
        gl_FragColor = vec4(c, a);
      }`,
  });
  const stripGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const stripMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vU; varying vec3 vW;
      void main() {
        vU = uv;
        vec4 p = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vU; varying vec3 vW;
      void main() {
        // the wall edge (v = 0) burns gold, the front edge a thinner line, a faint sheen between
        float wall = exp(-vU.y * 26.0);
        float front = exp(-(1.0 - vU.y) * 40.0) * 0.55;
        float fill = 0.07;
        float sp = 0.75 + 0.25 * sin(vW.x * 3.0 - uTime * 2.2);
        vec3 c = vec3(0.85, 0.6, 0.22) * (wall + front + fill) * sp;
        gl_FragColor = vec4(min(c, vec3(0.8)), 1.0);
      }`,
  });
  const initSolids = (w) => {
    w.boxes = [];
    for (let i = 0; i < POOL; i++) {
      const b = Phys.box(0, -999, 0, 0.1, 0.1, 0.1, { dyn: true, tag: 'nocam' });
      b.on = false;
      w.boxes.push(b);
    }
    w.vol = new THREE.InstancedMesh(volGeo, volMat, POOL);
    w.vol.count = 0;
    w.vol.frustumCulled = false;
    w.vol.renderOrder = 2;
    group.add(w.vol);
    w.strip = new THREE.InstancedMesh(stripGeo, stripMat, POOL * 2);
    w.strip.count = 0;
    w.strip.frustumCulled = false;
    w.strip.renderOrder = 3;
    group.add(w.strip);
  };
  const m4 = new THREE.Matrix4();
  const qI = new THREE.Quaternion();
  const vA = V3();
  const vB = V3();
  const rigKey = (w) =>
    (w.active ? 1 : 0) +
    w.lights.map((l) => [l.on ? 1 : 0, l.x.toFixed(3), l.y.toFixed(3), l.z.toFixed(3)].join(',')).join(';') +
    '|' +
    w.cuts.map((c) => [c.on ? 1 : 0, c.x.toFixed(3), c.y.toFixed(3), c.o].join(',')).join(';');
  const refreshSolids = (w, force) => {
    const k = rigKey(w);
    if (!force && k === w.key) return false;
    w.key = k;
    const S = w.active ? solidsOf(w).slice(0, POOL) : [];
    w.solids = S;
    const z0 = w.zw - w.D;
    S.forEach((r, i) => {
      const b = w.boxes[i];
      b.min[0] = O.x + r[0];
      b.max[0] = O.x + r[1];
      b.min[1] = O.y + r[2];
      b.max[1] = O.y + r[3];
      b.min[2] = O.z + z0;
      b.max[2] = O.z + w.zw;
      b.on = true;
      m4.compose(vA.set(O.x + (r[0] + r[1]) / 2, O.y + (r[2] + r[3]) / 2, O.z + w.zw - w.D / 2), qI, vB.set(r[1] - r[0], r[3] - r[2], w.D - 0.02));
      w.vol.setMatrixAt(i, m4);
    });
    for (let i = S.length; i < POOL; i++) w.boxes[i].on = false;
    w.vol.count = S.length;
    w.vol.instanceMatrix.needsUpdate = true;
    // exposed top edges: the part of each top not covered by a rectangle sitting on it
    let n = 0;
    S.forEach((r) => {
      let segs = [[r[0], r[1]]];
      S.forEach((q) => {
        if (q === r) return;
        if (q[2] > r[3] + 0.02 || q[3] < r[3] + 0.005) return;
        if (q[2] > r[3] - 0.02 || (q[2] < r[3] && q[3] > r[3])) {
          const nx = [];
          segs.forEach(([a, b]) => {
            if (q[1] <= a || q[0] >= b) nx.push([a, b]);
            else {
              if (q[0] > a) nx.push([a, q[0]]);
              if (q[1] < b) nx.push([q[1], b]);
            }
          });
          segs = nx;
        }
      });
      segs.forEach(([a, b]) => {
        if (b - a < 0.12 || n >= POOL * 2) return;
        m4.compose(vA.set(O.x + (a + b) / 2, O.y + r[3] + 0.012, O.z + w.zw - w.D / 2), qI, vB.set(b - a, 1, w.D - 0.02));
        w.strip.setMatrixAt(n++, m4);
      });
    });
    w.strip.count = n;
    w.strip.instanceMatrix.needsUpdate = true;
    return true;
  };
  // which cut-out (and where on it) the feet stand on, seen from light L: used to carry a walker
  const anchorAt = (w, L, X, Y) => {
    for (let ci = 0; ci < w.cuts.length; ci++) {
      const c = w.cuts[ci];
      if (!c.on || c.z <= L.z + 0.2) continue;
      const s = (c.z - L.z) / (w.zw - L.z);
      const px = L.x + (X - L.x) * s;
      const py = L.y + (Y - L.y) * s;
      const [ww, hh] = osize(c);
      const u = (c.x - px) / ww;
      const v = (py - c.y) / hh;
      if (Math.abs(u) < 0.5 && Math.abs(v) < 0.5 && oMask(c.tile, c.o, u, v)) return { ci, du: px - c.x, dv: py - c.y };
    }
    return null;
  };
  const anchorPos = (w, L, a) => {
    const c = w.cuts[a.ci];
    const t = projT(L, c.z, w.zw);
    return [L.x + (c.x + a.du - L.x) * t, L.y + (c.y + a.dv - L.y) * t];
  };

  // ---------- builders ----------
  // mat null: the collider alone (screen walls: the visible plaster sits further back, so the
  // canvas never z-fights with it in the 16-bit depth of the post-processing targets)
  const box = (x, y, z, sx, sy, sz, mat, col = true) => {
    if (col) K.collider(x, y, z, sx, sy, sz);
    if (!mat) return null;
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.copy(P(x, y, z));
    group.add(m);
    return m;
  };
  // a wall along z at x, from z0 to z1, y0..y1, with rectangular holes [za, zb, ya, yb]
  const wallX = (x, z0, z1, y0, y1, holes, mat, th = 1) => {
    const hs = holes.slice().sort((a, b) => a[0] - b[0]);
    let z = z0;
    hs.forEach(([za, zb, ya, yb]) => {
      if (za > z) box(x, (y0 + y1) / 2, (z + za) / 2, th, y1 - y0, za - z, mat);
      if (ya > y0) box(x, (y0 + ya) / 2, (za + zb) / 2, th, ya - y0, zb - za, mat);
      if (yb < y1) box(x, (yb + y1) / 2, (za + zb) / 2, th, y1 - yb, zb - za, mat);
      z = zb;
    });
    if (z1 > z) box(x, (y0 + y1) / 2, (z + z1) / 2, th, y1 - y0, z1 - z, mat);
  };
  const wallZ = (z, x0, x1, y0, y1, holes, mat, th = 1, col = true) => {
    const hs = holes.slice().sort((a, b) => a[0] - b[0]);
    let x = x0;
    hs.forEach(([xa, xb, ya, yb]) => {
      if (xa > x) box((x + xa) / 2, (y0 + y1) / 2, z, xa - x, y1 - y0, th, mat, col);
      if (ya > y0) box((xa + xb) / 2, (y0 + ya) / 2, z, xb - xa, ya - y0, th, mat, col);
      if (yb < y1) box((xa + xb) / 2, (yb + y1) / 2, z, xb - xa, y1 - yb, th, mat, col);
      x = xb;
    });
    if (x1 > x) box((x + x1) / 2, (y0 + y1) / 2, z, x1 - x, y1 - y0, th, mat, col);
  };
  // a door leaf that slides up into the wall
  const doors = {};
  const door = (id, x, y, z, sx, sy, sz, axis) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y + sy / 2, z));
    group.add(g);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), lacquer);
    g.add(leaf);
    // gold inlay: a frame and a diamond
    const thin = axis === 'x' ? [0.06, sy - 0.3, sz - 0.4] : [sx - 0.4, sy - 0.3, 0.06];
    [-1, 1].forEach((s) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(...thin), gold);
      if (axis === 'x') f.position.x = s * (sx / 2 + 0.01);
      else f.position.z = s * (sz / 2 + 0.01);
      f.scale.set(axis === 'x' ? 1 : 1, 1, 1);
      g.add(f);
      const dmd = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), glow('#ffcf7a', 0.55));
      dmd.scale.set(axis === 'x' ? 0.15 : 1, 1.3, axis === 'x' ? 1 : 0.15);
      if (axis === 'x') dmd.position.x = s * (sx / 2 + 0.05);
      else dmd.position.z = s * (sz / 2 + 0.05);
      dmd.position.y = 0.2;
      g.add(dmd);
    });
    const b = Phys.box(O.x + x, O.y + y + sy / 2, O.z + z, sx, sy, sz, { dyn: true });
    doors[id] = { g, b, k: 0, want: 0, y, sy, x, z, sx, sz };
    return doors[id];
  };
  // a velvet curtain with real folds, gathered with a gold tie
  const curtainGeo = (wd, h, folds, seed) => {
    const g = new THREE.PlaneGeometry(wd, h, folds * 6, 8);
    const p = g.attributes.position;
    const r = rng(seed);
    const ph = r() * 6;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const k = (y + h / 2) / h;
      p.setZ(i, Math.sin((x / wd) * folds * TAU + ph) * (0.18 + 0.12 * (1 - k)) + Math.sin(x * 7.3 + ph) * 0.03);
    }
    g.computeVertexNormals();
    return g;
  };
  const curtain = (x, z, wd, h, rotY = 0, y0 = 0, seed = 1) => {
    const m = new THREE.Mesh(curtainGeo(wd, h, Math.max(3, Math.round(wd * 1.4)), seed), velvet);
    m.material.side = THREE.DoubleSide;
    m.position.copy(P(x, y0 + h / 2, z));
    m.rotation.y = rotY;
    group.add(m);
    return m;
  };
  // the gilded frame around a screen
  const frame = (x0, x1, H, zw) => {
    const t = 0.55;
    box((x0 + x1) / 2, H + t / 2, zw + 0.3, x1 - x0 + t * 2, t, 1.6, gold, false);
    [x0 - t / 2, x1 + t / 2].forEach((x) => box(x, H / 2, zw + 0.3, t, H, 1.6, gold, false));
    // a crest at the top: a heart flanked by two diamonds
    const crest = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.9)), gold);
    crest.position.copy(P((x0 + x1) / 2, H + 0.25, zw - 0.52));
    crest.rotation.y = Math.PI;
    group.add(crest);
  };
  const heartShape = (s) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 60; i++) {
      const [x, y] = Heart.curve((i / 60) * TAU);
      if (i) sh.lineTo((x / 16) * s, ((y - 2.5) / 16) * s + s * 0.9);
      else sh.moveTo((x / 16) * s, ((y - 2.5) / 16) * s + s * 0.9);
    }
    return sh;
  };
  const screens = {};
  const screenFace = (w) => {
    w.mat = screenMat(w);
    w.U = w.mat.userData.U;
    // stage screens keep a hole for their door (the leaves carry the same canvas)
    const parts = ROOMS[w.room].kind === 'stage' ? [[w.x0, -2.1, 0, w.H], [2.1, w.x1, 0, w.H], [-2.1, 2.1, 4.4, w.H]] : [[w.x0, w.x1, 0, w.H]];
    parts.forEach(([a, b, c, d]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, d - c), w.mat);
      m.position.copy(P((a + b) / 2, (c + d) / 2, w.zw - 0.012));
      m.rotation.y = Math.PI;
      group.add(m);
      screens[w.id] = m;
    });
    frame(w.x0, w.x1, w.H, w.zw);
    initSolids(w);
  };

  // stalls seats: instanced, in blocks with colliders per row
  const seatGeo = (() => {
    // a theatre fauteuil: a foot, a cushion, a curved back, two armrests
    const foot = new THREE.BoxGeometry(0.44, 0.3, 0.36).translate(0, 0.15, 0.02);
    const cushion = new THREE.BoxGeometry(0.56, 0.14, 0.5).translate(0, 0.37, -0.02);
    const back = new THREE.CylinderGeometry(0.33, 0.33, 0.66, 12, 1, false, -0.7, 1.4).scale(1, 1, 0.35).translate(0, 0.78, 0.12);
    const backB = new THREE.BoxGeometry(0.56, 0.62, 0.08).translate(0, 0.76, 0.2);
    const arms = [-1, 1].map((sx) => new THREE.BoxGeometry(0.07, 0.1, 0.52).translate(sx * 0.31, 0.6, 0.02));
    const legs = [-1, 1].map((sx) => new THREE.BoxGeometry(0.06, 0.6, 0.08).translate(sx * 0.31, 0.3, 0.2));
    return mergeGeos([foot, cushion, back, backB, ...arms, ...legs]);
  })();
  function mergeGeos(list) {
    const pos = [];
    const nor = [];
    list.forEach((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      pos.push(...n.attributes.position.array);
      nor.push(...n.attributes.normal.array);
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return out;
  }
  const seats = [];
  const seatBlock = (x0, x1, z0, rows) => {
    for (let r = 0; r < rows; r++) {
      const z = z0 + r * 1.05;
      for (let x = x0 + 0.35; x <= x1 - 0.3; x += 0.7) seats.push([x, z]);
      K.collider((x0 + x1) / 2, 0.5, z + 0.05, x1 - x0, 1.0, 0.62);
    }
  };

  // a theatre projector on a wheeled cart (aimed at the screen), its lens glows in its colour
  const projector = (col, big = 1) => {
    const g = new THREE.Group();
    group.add(g);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3), lacquer);
    cart.position.y = 0.35;
    g.add(cart);
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14).rotateZ(Math.PI / 2), brass);
        wh.position.set(sx * 0.55, 0.16, sz * 0.5);
        g.add(wh);
      }),
    );
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1, 10).translate(0, 0.5, 0), brass);
    pole.position.y = 0.5;
    g.add(pole);
    const head = new THREE.Group();
    g.add(head);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.52 * big, 0.05, 8, 20, Math.PI), brass);
    yoke.rotation.z = Math.PI;
    head.add(yoke);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * big, 0.36 * big, 1.25 * big, 20).rotateX(Math.PI / 2), lacquer);
    head.add(body);
    [-0.35, 0.1, 0.5].forEach((z) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.43 * big, 0.03, 6, 26), gold);
      band.position.z = z * big;
      head.add(band);
    });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.34 * big, 28), glow('#ffffff', 0.85));
    lens.position.z = 0.64 * big;
    head.add(lens);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * big, 0.42 * big, 0.3, 20, 1, true).rotateX(Math.PI / 2), lacquer);
    hood.material = lacquer;
    hood.position.z = 0.78 * big;
    head.add(hood);
    // barn doors
    [0, 1, 2, 3].forEach((k) => {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.62 * big, 0.3 * big), lacquer);
      d.material = lacquer;
      const a = (k * Math.PI) / 2;
      d.position.set(Math.cos(a) * 0.48 * big, Math.sin(a) * 0.48 * big, 0.95 * big);
      d.rotation.z = a + Math.PI / 2;
      d.rotation.x = Math.PI / 2 - 0.5;
      head.add(d);
    });
    const vents = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 12), lacquer);
    vents.position.y = 0.46 * big;
    head.add(vents);
    lens.material.color.set(new THREE.Color(col[0], col[1], col[2]).multiplyScalar(0.95));
    return { g, head, lens, pole, col, k: 1 };
  };
  // the light's cone, from the lens to the corners of what it lights on the screen
  const beamMat = (col) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Vector3(...col) }, uK: { value: 1 } },
      vertexShader: `
        attribute float aK; varying float vK; varying vec3 vW;
        void main() { vK = aK; vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `
        uniform vec3 uCol; uniform float uK; varying float vK; varying vec3 vW;
        void main() {
          float a = (0.075 * (1.0 - vK) + 0.012) * uK * smoothstep(0.0, 0.08, vK);
          gl_FragColor = vec4(uCol * a, a);
        }`,
    });
  const beam = (col) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(5 * 3), 3));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(new Float32Array([0, 1, 1, 1, 1]), 1));
    g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const m = new THREE.Mesh(g, beamMat(col));
    m.frustumCulled = false;
    m.renderOrder = 4;
    group.add(m);
    return m;
  };
  const setBeam = (m, from, x0, x1, y0, y1, zw) => {
    const a = m.geometry.attributes.position.array;
    a.set([from.x, from.y, from.z, O.x + x0, O.y + y0, O.z + zw, O.x + x1, O.y + y0, O.z + zw, O.x + x1, O.y + y1, O.z + zw, O.x + x0, O.y + y1, O.z + zw]);
    m.geometry.attributes.position.needsUpdate = true;
  };

  // a régie console: a desk with levers and a little glowing plan of the screen
  const consoles = {};
  const consoleAt = (id, x, z, rotY = 0) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 0, z));
    g.rotation.y = rotY;
    group.add(g);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.8).translate(0, 0.5, 0), darkWood);
    g.add(desk);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.95).rotateX(-0.35), lacquer);
    top.position.set(0, 1.08, 0.02);
    g.add(top);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.04, 0.04), gold);
    trim.position.set(0, 1.0, 0.42);
    g.add(trim);
    const knobs = [];
    for (let i = 0; i < 4; i++) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8).translate(0, 0.16, 0), brass);
      k.position.set(-0.6 + i * 0.4, 1.12, -0.1);
      g.add(k);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glow('#ffcf7a', 0.6));
      ball.position.y = 0.34;
      k.add(ball);
      knobs.push(k);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glow('#ffb060', 0.7));
    lamp.position.set(0.82, 1.2, -0.3);
    g.add(lamp);
    K.collider(x, 0.55, z, 1.8, 1.1, 0.8);
    consoles[id] = { g, knobs, lamp, x, z };
    return consoles[id];
  };

  // a cut-out on its fly bar: black card with a gold rim, hung on two brass rods
  const cutMeshes = {};
  const cutoutMesh = (wid, c, i) => {
    const g = new THREE.Group();
    group.add(g);
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ map: atlasTex.clone(), color: '#100a0c', roughness: 0.9, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#000000' });
    mat.map.needsUpdate = true;
    const m = new THREE.Mesh(geo, mat);
    m.rotation.y = Math.PI;
    g.add(m);
    // the rods to the fly gallery
    const rods = [-1, 1].map(() => {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6).translate(0, 0.5, 0), brass);
      group.add(r);
      return r;
    });
    const kind = ROOMS[WALLS[wid].room].kind;
    const o = { g, m, rods, c, o: -1, top: kind === 'boss' ? 24 : kind === 'stage' ? 12.2 : 15.5 };
    cutMeshes[wid + i] = o;
    return o;
  };
  const setCutUV = (o) => {
    const c = o.c;
    if (o.o === c.o) return;
    o.o = c.o;
    const uv = o.m.geometry.attributes.uv;
    const pos = o.m.geometry.attributes.position;
    const M = ORI[c.o];
    const u0 = (c.tile % TC) / TC;
    const v0 = 1 - (Math.floor(c.tile / TC) + 1) / TRW;
    for (let i = 0; i < pos.count; i++) {
      // plane local x (after the half turn: to the viewer's right) and y
      const u = pos.getX(i);
      const v = pos.getY(i);
      const bu = clamp(M[0] * u + M[1] * v + 0.5, 0.004, 0.996);
      const bv = clamp(M[2] * u + M[3] * v + 0.5, 0.004, 0.996);
      uv.setXY(i, u0 + bu / TC, v0 + bv / TRW);
    }
    uv.needsUpdate = true;
  };
  const placeCut = (o) => {
    const c = o.c;
    setCutUV(o);
    const [ww, hh] = osize(c);
    o.g.visible = c.on;
    o.m.scale.set(ww, hh, 1);
    o.g.position.copy(P(c.x, c.y, c.z));
    o.rods.forEach((r, k) => {
      const x = c.x + (k ? 1 : -1) * ww * 0.3;
      const y = c.y + hh * 0.3;
      r.position.copy(P(x, y, c.z + 0.03));
      r.scale.y = Math.max(0.1, o.top - y);
      r.visible = c.on;
    });
  };

  // ---------- the rooms ----------
  const pitRoom = (id) => {
    const r = ROOMS[id];
    const { zs, zw, zp } = r;
    // stalls floor, the pit's front wall, the pit floor far below
    box(0, -0.5, (zs + zp) / 2, 44, 1, zp - zs, stageWood);
    box(0, -5.5, zp - 0.3, 44, 10, 0.6, blackVelvet);
    box(0, -10.5, (zp + zw) / 2, 44, 1, zw - zp, blackVelvet, false);
    // back wall (a door in the middle for rooms entered from behind)
    // (r5's back wall is r4's screen wall)
    if (id !== 'r5') wallZ(zs - 0.5, -23, 23, -1, 18, id === 'r1' ? [[-2, 2, 0, 4.2]] : [], plaster);
    // left wall (x = +22.5, viewer's left): plain
    wallX(22.5, zs - 1, zw + 1, -11, 18, [], plaster);
    // right wall (x = -22.5): in door (if any), the pilot's out door, the walker's exit
    const holes = [
      [zp - 4.5, zp - 1.5, 0, 3.2],
      [zw - 2.25, zw - 0.15, r.ew, r.ew + 3],
    ];
    if (id === 'r2') holes.push([zs + 1.5, zs + 4.5, 0, 3.2]);
    wallX(-22.5, zs - 1, zw + 1, -11, 18, holes, plaster);
    // the screen wall: plaster around a canvas
    box(0, 3.5, zw + 0.5, 46, 29, 1, null);
    box(0, 3.5, zw + 0.95, 46, 29, 1, plaster, false);
    // velvet wings either side of the screen, down into the pit
    box(19, -4, zw - 0.08, 6, 30, 0.1, blackVelvet, false);
    box(-19, -4, zw - 0.08, 6, 30, 0.1, blackVelvet, false);
    // start wing (viewer's left, +x) with the catwalk that climbs to it; exit wing (-x)
    const sw = startWing(r);
    box((sw.x0 + sw.x1) / 2, (sw.top - 11) / 2, (sw.z0 + sw.z1) / 2, sw.x1 - sw.x0, sw.top + 11, sw.z1 - sw.z0, marble);
    const cat0 = zp - 3;
    for (let k = 0; k < 4; k++) {
      const top = ((k + 1) / 4) * sw.top;
      box(20.75, (top - 11) / 2, cat0 + k + 0.5, 2.5, top + 11, 1, marble);
    }
    box(20.75, (sw.top - 11) / 2, (cat0 + 4 + sw.z0) / 2, 2.5, sw.top + 11, sw.z0 - cat0 - 4, marble);
    const ew = exitWing(r);
    box((ew.x0 + ew.x1) / 2, (ew.top - 11) / 2, (ew.z0 + ew.z1) / 2, ew.x1 - ew.x0, ew.top + 11, ew.z1 - ew.z0, marble);
    // gold lip on the wings' edges
    box(SX + 0.05, sw.top + 0.03, (sw.z0 + sw.z1) / 2, 0.1, 0.06, D, gold, false);
    box(-SX - 0.05, ew.top + 0.03, (ew.z0 + ew.z1) / 2, 0.1, 0.06, D, gold, false);
    // R5: stone posts in the strip, to wait on between two stretches
    if (id === 'r5')
      POSTS.forEach(([a, b, top]) => {
        box((a + b) / 2, (top - 11) / 2, zw - D / 2, b - a, top + 11, D, marble);
        box((a + b) / 2, top + 0.03, zw - D / 2, b - a + 0.06, 0.06, D + 0.06, gold, false);
      });
    // balustrade along the pit (open at the catwalk)
    box(-1.25, 0.52, zp - 0.2, 41.5, 1.04, 0.25, darkWood);
    box(-1.25, 1.08, zp - 0.2, 41.5, 0.08, 0.34, gold, false);
    // doors
    door(id + 'out', -22.5, 0, zp - 3, 0.4, 3.2, 3, 'x');
    door(id + 'exit', -22.5, r.ew, zw - 1.2, 0.4, 3, 2.1, 'x');
    if (id === 'r2') door(id + 'in', -22.5, 0, zs + 3, 0.4, 3.2, 3, 'x');
    // curtains: the big swags left and right of the frame, a valance on top
    curtain(18.6, zw - 0.6, 5.2, 17, Math.PI, -1, zw);
    curtain(-18.6, zw - 0.6, 5.2, 17, Math.PI, -1, zw + 7);
    curtain(0, zw - 0.7, 40, 2.6, Math.PI, r.H + 0.6, zw + 3);
    // seats behind the régie (two blocks, a central aisle)
    seatBlock(2, 14, zs + 0.8, 3);
    seatBlock(-14, -2, zs + 0.8, 3);
    // the projector's track: a gold-edged rectangle inlaid in the floor
    const wv = WALLS[id];
    if (wv && wv.rig) {
      const R_ = wv.rig.light;
      const x0 = R_.x[0] - 0.9;
      const x1 = R_.x[1] + 0.9;
      const z0 = R_.z[0] - 0.9;
      const z1 = R_.z[1] + 0.9;
      [
        [(x0 + x1) / 2, z0, x1 - x0, 0.08],
        [(x0 + x1) / 2, z1, x1 - x0, 0.08],
        [x0, (z0 + z1) / 2, 0.08, z1 - z0],
        [x1, (z0 + z1) / 2, 0.08, z1 - z0],
      ].forEach(([x, z, sx, sz]) => box(x, 0.006, z, sx, 0.012, sz, gold, false));
    }
    // the fly gallery: a dark batten across the room above the cut-outs
    box(0, 16.2, zw - 4.2, 44, 0.4, 0.4, lacquer, false);
    box(0, 16.2, zw - 3.2, 44, 0.4, 0.4, lacquer, false);
  };

  // a corridor on the -x side from a pit room to the next door; stairs if the exit wing is high
  const corridor = (id, endZ, nextDoor) => {
    const r = ROOMS[id];
    const { zw, zp } = r;
    const z0 = zp - 6.5;
    box(-26, -0.5, (z0 + endZ) / 2, 6, 1, endZ - z0, stageWood);
    wallX(-29.5, z0, endZ, -1, 13, [], plaster);
    wallZ(z0 - 0.5, -29.5, -23, -1, 13, [], plaster);
    if (nextDoor !== 'end') wallZ(endZ + 0.5, -29.5, -23, -1, 13, [], plaster);
    // between this room and the next one, the inner wall
    const gapEnd = nextDoor === 'end' ? endZ : endZ - 7;
    wallX(-22.5, zw + 1, gapEnd, -1, 13, nextDoor && nextDoor !== 'end' ? [] : [], plaster);
    if (r.ew > 3.5) {
      box(-26, r.ew - 0.2, zw - 0.6, 6, 0.4, 3.6, darkWood);
      box(-26, r.ew + 0.55, zw - 2.35, 6, 1.1, 0.12, gold, false);
      const n = Math.ceil(r.ew / 0.45);
      for (let i = 1; i <= n; i++) {
        const top = Math.max(0.05, r.ew - 0.45 * i);
        box(-27.5, top / 2, zw + 1.2 + (i - 0.5) * 0.7, 3, top, 0.7, marble);
      }
    }
  };

  // a stage room (the silhouettes): a wooden stage up to the screen, a fixed low projector
  const stageRoom = (id) => {
    const r = ROOMS[id];
    const { zs, zw } = r;
    box(0, -0.5, (zs + zw) / 2, 44, 1, zw - zs, stageWood);
    if (id === 'r3') wallZ(zs - 0.5, -23, 23, -1, 16, [], plaster);
    // a batten for the props' rods
    box(0, 12.2, zw - 6.6, 30, 0.35, 0.35, lacquer, false);
    const holes = id === 'r3' ? [[zs + 1.5, zs + 4.5, 0, 3.2]] : [];
    wallX(-22.5, zs - 1, zw + 1, -1, 16, holes, plaster);
    wallX(22.5, zs - 1, zw + 1, -1, 16, [], plaster);
    // the screen wall with its door (closed by the door leaves below)
    wallZ(zw + 0.5, -23, 23, -1, 16, [[-2.1, 2.1, 0, 4.4]], null);
    wallZ(zw + 0.95, -23, 23, -1, 16, [[-2.1, 2.1, 0, 4.4]], plaster, 1, false);
    // the door's reveal, lined in black lacquer and gold, from the canvas to the plaster
    [-1, 1].forEach((s) => box(s * 2.16, 2.2, zw + 0.7, 0.12, 4.4, 1.4, lacquer, false));
    box(0, 4.46, zw + 0.7, 4.44, 0.12, 1.4, gold, false);
    box(17, 7.5, zw - 0.08, 10, 17, 0.1, blackVelvet, false);
    box(-17, 7.5, zw - 0.08, 10, 17, 0.1, blackVelvet, false);
    curtain(13.4, zw - 0.6, 3.6, 13, Math.PI, 0, zw + 11);
    curtain(-13.4, zw - 0.6, 3.6, 13, Math.PI, 0, zw + 12);
    curtain(0, zw - 0.7, 28, 2.4, Math.PI, r.H + 0.5, zw + 13);
    if (id === 'r3') door('r3in', -22.5, 0, zs + 3, 0.4, 3.2, 3, 'x');
    // the screen door: two canvas leaves that swing open backwards (they share the screen shader)
    const w = WALLS[id];
    const leaves = [-1, 1].map((s) => {
      const piv = new THREE.Group();
      piv.position.copy(P(s * 2.1, 0, zw - 0.012));
      group.add(piv);
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 4.4), w.mat);
      lf.position.set(-s * 1.05, 2.2, 0);
      lf.rotation.y = Math.PI;
      piv.add(lf);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.4, 0.06), gold);
      edge.position.set(-s * 2.1, 2.2, -0.02);
      piv.add(edge);
      return piv;
    });
    const b = Phys.box(O.x, O.y + 2.2, O.z + zw + 0.3, 4.2, 4.4, 0.8, { dyn: true });
    doors[id + 'scr'] = { leaves, b, k: 0, want: 0, screen: true };
    // the low projector on its pedestal
    const L = w.lights[0];
    box(L.x, 0.04, L.z, 1.6, 0.08, 1.6, gold, false);
    K.collider(L.x, 0.6, L.z, 1.2, 1.2, 1.2);
  };

  const bossRoom = () => {
    const r = ROOMS.boss;
    const { zs, zw } = r;
    box(0, -0.5, (zs + BOSS.zp) / 2, 66, 1, BOSS.zp - zs, stageWood);
    box(0, -5.5, BOSS.zp - 0.3, 58, 10, 0.6, blackVelvet);
    box(0, -10.5, (BOSS.zp + BOSS.apron) / 2, 66, 1, BOSS.apron - BOSS.zp, blackVelvet, false);
    // the apron (the strip in front of the screen has a floor here)
    box(0, -0.5, (BOSS.apron + zw) / 2, 66, 1, zw - BOSS.apron, stageWood);
    box(0, -5.5, BOSS.apron + 0.3, 58, 10, 0.6, blackVelvet);
    // the bridges over the orchestra pit, either side
    [-31, 31].forEach((x) => box(x, -0.5, (BOSS.zp + BOSS.apron) / 2, 4, 1, BOSS.apron - BOSS.zp + 0.02, marble));
    wallZ(zs - 0.5, -34, 34, -1, 26, [[-28, -24, 0, 4.2]], plaster);
    wallX(33.5, zs - 1, zw + 1, -11, 26, [], plaster);
    wallX(-33.5, zs - 1, zw + 1, -11, 26, [], plaster);
    box(0, 7.5, zw + 0.5, 68, 37, 1, null);
    box(0, 7.5, zw + 1.1, 68, 37, 1, plaster, false);
    box(30.5, 9, zw - 0.08, 6, 30, 0.1, blackVelvet, false);
    box(-30.5, 9, zw - 0.08, 6, 30, 0.1, blackVelvet, false);
    curtain(29.6, zw - 0.6, 5, 25, Math.PI, 0, 501);
    curtain(-29.6, zw - 0.6, 5, 25, Math.PI, 0, 502);
    curtain(0, zw - 0.8, 60, 3.4, Math.PI, 22.5, 503);
    // balustrade along the orchestra pit
    box(0, 0.52, BOSS.zp - 0.2, 58, 1.04, 0.25, darkWood);
    box(0, 1.08, BOSS.zp - 0.2, 58.2, 0.08, 0.34, gold, false);
    seatBlock(3, 22, zs + 1.5, 7);
    seatBlock(-22, -3, zs + 1.5, 7);
    // the fly gallery
    box(0, 24, BOSS.cutZ, 66, 0.5, 0.5, lacquer, false);
  };
  // a playbill for the foyer walls: a cream sheet, a black silhouette, the evening's title
  const poster = (kind) =>
    LvKit.tex(256, 360, (g, w, h) => {
      g.fillStyle = '#1a0a10';
      g.fillRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.5, h * 0.7);
      gr.addColorStop(0, '#f2e2c0');
      gr.addColorStop(1, '#b8986a');
      g.fillStyle = gr;
      g.fillRect(14, 14, w - 28, h - 28);
      g.strokeStyle = '#c99a48';
      g.lineWidth = 3;
      g.strokeRect(20, 20, w - 40, h - 40);
      g.fillStyle = '#140a0e';
      g.textAlign = 'center';
      g.font = 'italic 30px Georgia, serif';
      g.fillText('Les Ombres', w / 2, 62);
      g.font = '11px Georgia, serif';
      g.fillText(kind ? 'LE MONTREUR D’OMBRES' : 'THÉÂTRE D’OMBRES · CE SOIR', w / 2, 84);
      g.beginPath();
      if (!kind) {
        // two figures hand in hand under a heart
        [-1, 1].forEach((sx) => {
          const x = w / 2 + sx * 34;
          g.moveTo(x + 16, 300);
          g.arc(x, 196, 16, 0, TAU);
          g.rect(x - 16, 216, 32, 84);
        });
        g.rect(w / 2 - 22, 246, 44, 9);
        for (let i = 0; i <= 60; i++) {
          const [hx, hy] = Heart.curve((i / 60) * TAU);
          const px = w / 2 + hx * 1.6;
          const py = 140 - (hy - 2.5) * 1.6;
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        }
      } else {
        // a top-hatted puppet on its strings
        g.rect(w / 2 - 14, 112, 28, 26);
        g.rect(w / 2 - 22, 136, 44, 5);
        g.ellipse(w / 2, 156, 14, 17, 0, 0, TAU);
        g.moveTo(w / 2 - 22, 176);
        g.lineTo(w / 2 + 22, 176);
        g.lineTo(w / 2 + 16, 250);
        g.lineTo(w / 2 - 16, 250);
        g.closePath();
        [-1, 1].forEach((sx) => {
          g.save();
          g.translate(w / 2 + sx * 22, 180);
          g.rotate(-sx * 0.9);
          g.rect(-4, 0, 8, 58);
          g.restore();
          g.save();
          g.translate(w / 2 + sx * 10, 248);
          g.rotate(-sx * 0.25);
          g.rect(-5, 0, 10, 62);
          g.restore();
        });
      }
      g.fill();
      if (kind) {
        g.strokeStyle = '#8a6a3a';
        g.lineWidth = 1.2;
        [[-60, 150], [60, 150], [-24, 300], [24, 300]].forEach(([dx, y]) => {
          g.beginPath();
          g.moveTo(w / 2 + dx * 0.5, 96);
          g.lineTo(w / 2 + dx, y);
          g.stroke();
        });
      }
      g.font = 'italic 12px Georgia, serif';
      g.fillStyle = '#3a2418';
      g.fillText('♦  six  ♦', w / 2, h - 34);
    });
  // the foyer: where you arrive, a gilded hall with the title on a screen
  const foyer = () => {
    box(0, -0.5, -8, 20, 1, 15, marble);
    // a velvet runner to the auditorium door, gold-edged
    box(0, 0.004, -7.6, 2.4, 0.008, 13.6, seatVelvet, false);
    [-1.25, 1.25].forEach((x) => box(x, 0.006, -7.6, 0.1, 0.012, 13.6, gold, false));
    // two playbills in gilded frames
    [10, -10].forEach((x, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8), new THREE.MeshStandardMaterial({ map: poster(k), roughness: 0.8 }));
      m.position.copy(P(x - Math.sign(x) * 0.1, 2.6, -8));
      m.rotation.y = (-Math.sign(x) * Math.PI) / 2;
      group.add(m);
      box(x - Math.sign(x) * 0.04, 2.6, -8, 0.08, 3.1, 2.3, gold, false);
    });
    wallX(10.5, -15.5, -0.5, -1, 10, [], plaster);
    wallX(-10.5, -15.5, -0.5, -1, 10, [], plaster);
    wallZ(-16, -11, 11, -1, 10, [], plaster);
    [-6, 6].forEach((x) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 9, 20), marble);
      col.position.copy(P(x, 4.5, -4));
      group.add(col);
      K.collider(x, 4.5, -4, 0.9, 9, 0.9);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.5, 20), gold);
      cap.position.copy(P(x, 8.8, -4));
      group.add(cap);
    });
  };

  // ---------- the puppet (boss): a hierarchy of flat shadow parts, drawn on the boss screen ----------
  const puppet = {};
  const puppetTex = () =>
    LvKit.tex(1024, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#fff';
      // [0] head with a top hat, [1] torso (tail coat), [2] upper arm, [3] forearm + open hand,
      // [4] thigh, [5] shin + pointed shoe; each in a 256 x 512 cell
      const cell = (i, fn) => {
        g.save();
        g.translate((i % 4) * 256, Math.floor(i / 4) * 512);
        g.beginPath();
        fn();
        g.fill();
        g.restore();
      };
      cell(0, () => {
        g.ellipse(128, 360, 74, 92, 0, 0, TAU);
        g.moveTo(40, 268);
        g.lineTo(216, 268);
        g.lineTo(216, 284);
        g.lineTo(40, 284);
        g.rect(66, 70, 124, 200);
        g.rect(20, 252, 216, 26);
        // a long nose
        g.moveTo(190, 350);
        g.lineTo(246, 372);
        g.lineTo(190, 384);
      });
      cell(1, () => {
        g.moveTo(60, 20);
        g.lineTo(196, 20);
        g.quadraticCurveTo(236, 120, 200, 300);
        g.lineTo(236, 500);
        g.lineTo(150, 420);
        g.lineTo(128, 330);
        g.lineTo(106, 420);
        g.lineTo(20, 500);
        g.lineTo(56, 300);
        g.quadraticCurveTo(20, 120, 60, 20);
      });
      cell(2, () => {
        g.ellipse(128, 256, 46, 240, 0, 0, TAU);
      });
      cell(3, () => {
        g.ellipse(128, 160, 36, 150, 0, 0, TAU);
        // the hand: palm and five long fingers
        g.ellipse(128, 350, 58, 54, 0, 0, TAU);
        [-2, -1, 0, 1, 2].forEach((k) => {
          const a = k * 0.26;
          g.save();
          g.translate(128 + k * 20, 380);
          g.rotate(a);
          g.rect(-9, 0, 18, k === -2 ? 70 : 120 - Math.abs(k) * 12);
          g.restore();
        });
      });
      cell(4, () => {
        g.ellipse(128, 256, 52, 240, 0, 0, TAU);
      });
      cell(5, () => {
        g.ellipse(128, 220, 38, 210, 0, 0, TAU);
        g.moveTo(90, 420);
        g.quadraticCurveTo(240, 420, 250, 470);
        g.lineTo(90, 480);
      });
    });
  const buildPuppet = () => {
    const w = WALLS.boss;
    const tex = puppetTex();
    const mat = new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: tex, transparent: true, opacity: 0.94, depthWrite: false });
    const part = (i, wd, ht, pivotY) => {
      const g = new THREE.PlaneGeometry(wd, ht);
      g.translate(0, -ht / 2 + pivotY, 0);
      const uv = g.attributes.uv;
      const u0 = (i % 4) / 4;
      const v0 = 1 - (Math.floor(i / 4) + 1) / 2;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.25, v0 + uv.getY(k) * 0.5);
      const m = new THREE.Mesh(g, mat);
      m.renderOrder = 1;
      return m;
    };
    const root = new THREE.Group();
    root.position.copy(P(0, 0, w.zw - 0.3));
    root.rotation.y = Math.PI;
    group.add(root);
    const hip = new THREE.Group();
    hip.position.y = 6.7;
    root.add(hip);
    const torso = part(1, 4.2, 5.6, 5.6);
    hip.add(torso);
    const neck = new THREE.Group();
    neck.position.y = 5.4;
    torso.add(neck);
    const head = part(0, 3.0, 5.4, 5.0);
    neck.add(head);
    const limb = (side) => {
      const sh = new THREE.Group();
      sh.position.set(side * 1.7, 5.0, 0);
      torso.add(sh);
      const up = part(2, 1.0, 4.0, 0);
      sh.add(up);
      const el = new THREE.Group();
      el.position.y = -3.7;
      sh.add(el);
      const fore = part(3, 1.5, 5.4, 0);
      el.add(fore);
      const hipJ = new THREE.Group();
      hipJ.position.set(side * 0.95, 0.3, 0);
      torso.add(hipJ);
      const th = part(4, 1.2, 3.8, 0);
      hipJ.add(th);
      const kn = new THREE.Group();
      kn.position.y = -3.6;
      hipJ.add(kn);
      const sn = part(5, 1.3, 3.4, 0);
      kn.add(sn);
      return { sh, el, fore, hipJ, kn, sn };
    };
    const L = limb(-1);
    const Rr = limb(1);
    // the strings: gold threads from the knees and wrists to a knot, then up into the dark
    const thread = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf7a').multiplyScalar(0.85), toneMapped: false });
    const strings = [0, 1, 2, 3].map(() => {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0), thread);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0), thread);
      const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), glow('#ffcf7a', 0.8));
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.62, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf7a').multiplyScalar(0.8), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
      );
      group.add(a, b, knot, halo);
      return { a, b, knot, halo, cut: false, drop: 0 };
    });
    // the cross-bar the strings hang from, high above the screen, half lost in the dark
    const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 0.25), brass);
    group.add(bar);
    // telegraph marks on the apron floor
    const floorMark = new THREE.Mesh(
      new THREE.PlaneGeometry(1, BOSS.D).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a3a').multiplyScalar(0.8), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
    );
    floorMark.position.copy(P(0, 0.02, ROOMS.boss.zw - BOSS.D / 2));
    group.add(floorMark);
    Object.assign(puppet, { root, hip, torso, neck, head, L, R: Rr, strings, bar, mat, floorMark });
  };
  // ring targets for the grapple on the boss strip
  const ringMeshes = [];
  const buildRings = () => {
    RINGS.forEach((p) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 10, 36), glow('#ffcf7a', 0.8));
      m.position.set(O.x + p.x, O.y + p.y, O.z + p.z);
      group.add(m);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 12, 6).translate(0, 6.7, 0), brass);
      m.add(chain);
      ringMeshes.push(m);
    });
  };

  // ---------- sky: a dusk dome, first stars, a thin moon; dust in the beams ----------
  let dome = null;
  let dust = null;
  const buildSky = () => {
    dome = new THREE.Mesh(
      new THREE.SphereGeometry(760, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: { value: 0 }, uWon: { value: 0 } },
        vertexShader: `
          varying vec3 vD;
          void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime, uWon; varying vec3 vD;
          float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
          float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.07; a *= 0.5; } return s; }
          void main() {
            float y = vD.y;
            // the sun went down in the west (-x): a rose and amber band there, indigo above
            float west = smoothstep(0.2, -0.9, vD.x) * 0.6 + 0.4;
            vec3 hor = mix(vec3(0.36, 0.13, 0.16), vec3(0.62, 0.3, 0.16), west * smoothstep(0.25, -0.02, y));
            vec3 mid = vec3(0.18, 0.08, 0.2);
            vec3 zen = vec3(0.025, 0.025, 0.07);
            vec3 col = mix(hor, mid, smoothstep(0.02, 0.22, y));
            col = mix(col, zen, smoothstep(0.2, 0.75, y));
            // long thin clouds lit from below
            vec2 uv = vD.xz / (abs(y) + 0.2) * 1.6 + vec2(uTime * 0.004, 0.0);
            float cl = fbm(uv * vec2(0.6, 2.4));
            col = mix(col, vec3(0.5, 0.2, 0.18) * (0.55 + 0.6 * west), smoothstep(0.55, 0.85, cl) * smoothstep(0.55, 0.06, y) * 0.65);
            // stars, more of them high up
            vec2 sp = vD.xz / (y + 1.2) * 340.0;
            float st = step(0.9965, h1(floor(sp))) * smoothstep(0.15, 0.6, y);
            float tw = 0.6 + 0.4 * sin(uTime * 2.0 + h1(floor(sp) + 3.0) * 30.0);
            col += vec3(0.8, 0.75, 0.9) * st * tw * 0.8;
            col = mix(col, col * 1.25 + vec3(0.12, 0.08, 0.02), uWon);
            gl_FragColor = vec4(min(col, vec3(0.85)), 1.0);
          }`,
      }),
    );
    dome.renderOrder = -2;
    dome.frustumCulled = false;
    group.add(dome);
    // a thin crescent moon low in the east
    const mtex = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,240,220,0.25)');
      gr.addColorStop(1, 'rgba(255,240,220,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff3e0';
      g.beginPath();
      g.arc(128, 128, 54, 0, TAU);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(150, 112, 50, 0, TAU);
      g.fill();
    });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: mtex, color: new THREE.Color('#ffe8d0').multiplyScalar(0.8), fog: false, depthWrite: false, transparent: true }));
    moon.scale.setScalar(60);
    moon.userData.off = V3(420, 230, 300);
    dome.userData.moon = moon;
    group.add(moon);
    // dust motes floating in the beams (positions are a parameter inside a light's cone)
    const N = 2400;
    const g = new THREE.BufferGeometry();
    const a = new Float32Array(N * 4);
    const r = rng(606);
    for (let i = 0; i < N; i++) a.set([r(), r(), r(), r()], i * 4);
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aR', new THREE.BufferAttribute(a, 4));
    dust = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPx: { value: 1 },
          uA: { value: [V3(), V3(), V3()] },
          uX: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
          uZ: { value: 0 },
          uC: { value: [V3(), V3(), V3()] },
        },
        vertexShader: `
          uniform float uTime, uPx, uZ; uniform vec3 uA[3]; uniform vec4 uX[3]; uniform vec3 uC[3];
          attribute vec4 aR; varying vec3 vC; varying float vA;
          void main() {
            int li = int(floor(aR.w * 3.0));
            vec3 A = li == 0 ? uA[0] : li == 1 ? uA[1] : uA[2];
            vec4 X = li == 0 ? uX[0] : li == 1 ? uX[1] : uX[2];
            vC = li == 0 ? uC[0] : li == 1 ? uC[1] : uC[2];
            float s = fract(aR.x + uTime * 0.004 * (0.5 + aR.y));
            s = 0.06 + 0.9 * s;
            float u = fract(aR.y + 0.02 * sin(uTime * 0.3 + aR.z * 20.0));
            float v = fract(aR.z + uTime * 0.006 * (aR.x - 0.5));
            vec3 F = vec3(mix(X.x, X.y, u), mix(X.z, X.w, v), uZ);
            vec3 p = mix(A, F, s);
            vec4 mv = viewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.4 + aR.x * 2.0) * uPx * (10.0 / -mv.z);
            vA = (0.35 + 0.65 * sin(uTime * (0.7 + aR.y) + aR.x * 40.0) * 0.5 + 0.5) * smoothstep(0.06, 0.2, s) * (1.0 - s * 0.5);
          }`,
        fragmentShader: `
          varying vec3 vC; varying float vA;
          void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d) * vA * 0.55; gl_FragColor = vec4(vC * a, a); }`,
      }),
    );
    dust.frustumCulled = false;
    group.add(dust);
  };

  // ---------- state built once ----------
  const projs = {};
  const beams = {};
  let card = null;
  let cardHeart = null;
  let playerLight = null;
  let screenLight = null;
  let screen = null;
  let finalStair = null;
  const build = () => {
    if (built) return;
    built = true;
    drawAtlas();
    atlasTex = new THREE.CanvasTexture(atlasCv);
    atlasTex.anisotropy = 8;
    foyer();
    pitRoom('r1');
    corridor('r1', ROOMS.r2.zs + 6, 'r2');
    pitRoom('r2');
    corridor('r2', ROOMS.r3.zs + 6, 'r3');
    Object.values(WALLS).forEach((w) => screenFace(w));
    stageRoom('r3');
    stageRoom('r4');
    pitRoom('r5');
    corridor('r5', ROOMS.boss.zs - 0.5, 'end');
    bossRoom();
    // the inner wall of the corridor that leads to the boss hall stops at the back wall door
    // seats, all rooms at once
    const sm = new THREE.InstancedMesh(seatGeo, seatVelvet, seats.length);
    const q = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI);
    seats.forEach(([x, z], i) => {
      m4.compose(P(x, 0, z), q, V3(1, 1, 1));
      sm.setMatrixAt(i, m4);
    });
    group.add(sm);
    // projectors, beams, cut-outs
    Object.values(WALLS).forEach((w) => {
      projs[w.id] = w.lights.map((L) => projector(L.col, w.id === 'boss' ? 1.4 : ROOMS[w.room].kind === 'stage' ? 0.72 : 1));
      beams[w.id] = w.lights.map((L) => beam(L.col));
      w.cuts.forEach((c, i) => placeCut(cutoutMesh(w.id, c, i)));
    });
    consoleAt('r1', ...CONSOLE.r1);
    consoleAt('r2', ...CONSOLE.r2);
    consoleAt('r4', ...CONSOLE.r4);
    consoleAt('r5', ...CONSOLE.r5);
    // boss levers: one per projector
    BOSS.secs.forEach(([a, b], s) => consoleAt('lev' + s, (a + b) / 2 - 3.2, BOSS.lightZ + 1.8));
    buildPuppet();
    buildRings();
    buildSky();
    // the card, at the centre of the apron after the fight
    card = LvKit.trialCard('d6', true);
    card.position.copy(P(0, 2.2, ROOMS.boss.zw - 1.6));
    group.add(card);
    cardHeart = Heart.galaxy(6000, 4, 66);
    cardHeart.group.scale.setScalar(0.04);
    cardHeart.group.position.copy(P(0, 12, ROOMS.boss.zw - 1));
    cardHeart.core.material.opacity = 0;
    cardHeart.U.uFade.value = 0.7;
    cardHeart.group.visible = false;
    group.add(cardHeart.group);
    // the title screen in the foyer
    screen = makeScreen(9, 3.4, 1024);
    screen.mesh.position.copy(P(0, 6.4, -1.08));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    // two lights for the whole trial (count never changes: no shader recompiles)
    playerLight = new THREE.PointLight('#ffcf9a', 0.9, 16, 1.8);
    group.add(playerLight);
    screenLight = new THREE.PointLight('#ffe0b0', 0, 40, 1.6);
    group.add(screenLight);
    // a little stair back up from the boss apron at the centre, for after the fight
    finalStair = null;
    sleep();
  };

  // ---------- per frame ----------
  const sleep = () => {
    group.visible = false;
    Object.values(WALLS).forEach((w) => {
      w.active = false;
      if (w.boxes) w.boxes.forEach((b) => (b.on = false));
      if (w.vol) w.vol.count = 0;
      if (w.strip) w.strip.count = 0;
      w.key = '';
    });
    Object.values(doors).forEach((d) => (d.b.on = false));
  };
  const wake = () => {
    group.visible = true;
    Object.values(doors).forEach((d) => (d.b.on = true));
  };

  // the pilot's current pick glows (only on the pilot's own screen)
  let pick = null;
  const select = (wid, k, i) => {
    pick = wid ? { wid, k, i } : null;
  };
  const lensPos = V3();
  /** v: { stage, room (current wall id), bodies: [{x,y,z}], walls active, doors {id: 0/1}, puppet, won } */
  const update = (dt, t, v) => {
    if (!built) return;
    volMat.uniforms.uTime.value = t;
    stripMat.uniforms.uTime.value = t;
    // walls: lights, cut-outs, solids
    const rb = v.bodies.map((p) => ({ x: p.x - O.x, y: p.y - O.y, z: p.z - O.z }));
    Object.values(WALLS).forEach((w) => {
      w.active = !!v.walls[w.id];
      refreshSolids(w);
      if (!w.U) return;
      setScreenU(w);
      w.U.uTime.value = t;
      for (let k = 0; k < 2; k++) {
        const p = v.bodies[k];
        if (p && v.near[w.id]) w.U.uP.value[k].set(p.x, p.y, p.z, 1);
        else w.U.uP.value[k].w = 0;
      }
      const hd = v.near[w.id] ? handsOf(rb) : null;
      if (hd) {
        w.U.uH0.value.set(O.x + hd[0][0], O.y + hd[0][1], O.z + hd[0][2], 1);
        w.U.uH1.value.set(O.x + hd[1][0], O.y + hd[1][1], O.z + hd[1][2], 1);
      } else w.U.uH0.value.w = 0;
      // projectors follow their light; cut-outs follow their fly bars
      projs[w.id].forEach((pr, i) => {
        const L = w.lights[i];
        pr.g.position.copy(P(L.x, 0, L.z));
        pr.pole.scale.y = Math.max(0.3, L.y - 0.55);
        pr.head.position.set(0, L.y, 0);
        const on = L.on ? (L.k == null ? 1 : L.k) : 0;
        pr.k = damp(pr.k, on, 10, dt);
        const picked = pick && pick.wid === w.id && pick.k !== 'cut' && pick.i === i;
        pr.lens.material.color.setRGB(L.col[0], L.col[1], L.col[2]).multiplyScalar((0.08 + 0.85 * pr.k) * (picked ? 0.82 + 0.18 * Math.sin(t * 6) : 1));
        pr.head.scale.setScalar(picked ? 1.06 : 1);
        const bm = beams[w.id][i];
        bm.visible = pr.k > 0.02 && v.near[w.id];
        if (bm.visible) {
          pr.lens.getWorldPosition(lensPos);
          const b = L.beam || [w.x0, w.x1, 0, w.H];
          setBeam(bm, lensPos, b[0], b[1], b[2], b[3], w.zw - 0.02);
          bm.material.uniforms.uK.value = pr.k * (L.flick == null ? 1 : L.flick);
        }
      });
      w.cuts.forEach((c, i) => {
        const o = cutMeshes[w.id + i];
        if (!o) return;
        placeCut(o);
        const picked = pick && pick.wid === w.id && pick.k === 'cut' && pick.i === i;
        o.m.material.emissive.setRGB(0.72, 0.46, 0.12).multiplyScalar(picked ? 0.7 + 0.3 * Math.sin(t * 6) : 0);
      });
    });
    // doors
    Object.entries(doors).forEach(([id, d]) => {
      const want = v.doors[id] ? 1 : 0;
      const was = d.k;
      d.k = damp(d.k, want, 2.2, dt);
      if (d.screen) {
        d.leaves.forEach((l, s) => (l.rotation.y = (s ? 1 : -1) * d.k * 1.7));
        d.b.on = group.visible && d.k < 0.5;
      } else {
        d.g.position.y = O.y + d.y + d.sy / 2 + d.k * (d.sy + 0.2);
        d.b.on = group.visible && d.k < 0.6;
      }
      if (want && was < 0.02 && d.k >= 0.02) Sound.play('door');
    });
    // dust in the beams of the room you are in
    const cw = WALLS[v.room];
    const du = dust.material.uniforms;
    du.uTime.value = t;
    du.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    dust.visible = !!cw;
    if (cw) {
      du.uZ.value = O.z + cw.zw - 0.05;
      for (let i = 0; i < 3; i++) {
        const L = cw.lights[i % cw.lights.length];
        const pr = projs[cw.id][i % cw.lights.length];
        pr.lens.getWorldPosition(du.uA.value[i]);
        const b = L.beam || [cw.x0, cw.x1, 0, cw.H];
        du.uX.value[i].set(O.x + b[0], O.x + b[1], O.y + b[2], O.y + b[3]);
        const k = pr.k;
        du.uC.value[i].set(L.col[0] * k, L.col[1] * k, L.col[2] * k);
      }
      // the screen's bounce light, in front of the canvas
      const lit = cw.lights.reduce((s, L) => s + (L.on ? 1 : 0), 0);
      screenLight.position.copy(P(0, cw.H * 0.45, cw.zw - 7));
      screenLight.intensity = damp(screenLight.intensity, 0.35 + 0.35 * Math.min(2, lit) + (v.won ? 0.8 : 0), 3, dt);
    }
    const pp = Player.body.p;
    playerLight.position.set(pp.x, pp.y + 2.4, pp.z - 1.2);
    // consoles: their lamp breathes
    Object.values(consoles).forEach((c, i) => c.lamp.material.color.set('#ffb060').multiplyScalar(0.45 + 0.25 * Math.sin(t * 2 + i)));
    // rings
    ringMeshes.forEach((m, i) => {
      m.rotation.y = t * 1.2 + i;
      m.visible = !!v.rings;
    });
    // sky
    dome.position.copy(R.camera.position);
    dome.material.uniforms.uTime.value = t;
    dome.material.uniforms.uWon.value = damp(dome.material.uniforms.uWon.value, v.won ? 1 : 0, 0.5, dt);
    const mo = dome.userData.moon;
    mo.position.copy(R.camera.position).add(mo.userData.off);
    // the card
    card.visible = !!v.card;
    cardHeart.group.visible = !!v.card;
    if (v.card) {
      card.rotation.y = t * 0.8;
      card.position.y = O.y + 1.9 + Math.sin(t * 2) * 0.12 + (1 - Math.min(1, v.cardK || 1)) * 9;
      cardHeart.U.uTime.value = t;
      cardHeart.U.uPx.value = R.renderer.getPixelRatio() * 0.22;
      cardHeart.U.uForm.value = Math.min(1, cardHeart.U.uForm.value + dt * 0.4);
    } else cardHeart.U.uForm.value = 0;
    if (screen) screen.update(dt, t);
  };

  // ---------- the puppet's pose (called by the level with its animation state) ----------
  const pv = V3();
  const posePuppet = (s, t) => {
    const p = puppet;
    if (!p.root) return;
    const w = WALLS.boss;
    p.root.visible = s.vis > 0.01;
    p.mat.opacity = 0.94 * s.vis;
    // root x on the screen (relative), a puppet's bob, a lean
    p.root.position.set(O.x + s.x, O.y + s.lift + Math.abs(Math.sin(t * 2.2)) * 0.25 * s.walk, O.z + w.zw - 0.3);
    p.hip.rotation.z = s.lean;
    p.neck.rotation.z = s.head;
    // arms: shoulder angle (0 = hanging), elbow; legs: hip and knee
    p.L.sh.rotation.z = s.armL[0];
    p.L.el.rotation.z = s.armL[1];
    p.R.sh.rotation.z = s.armR[0];
    p.R.el.rotation.z = s.armR[1];
    p.L.fore.scale.y = s.reachL;
    p.R.fore.scale.y = s.reachR;
    p.L.hipJ.rotation.z = s.legL[0];
    p.L.kn.rotation.z = s.legL[1];
    p.R.hipJ.rotation.z = s.legR[0];
    p.R.kn.rotation.z = s.legR[1];
    p.root.updateMatrixWorld(true);
    // strings: from the limb to the knot (on the strip), then up to the bar
    const anchors = [p.L.kn, p.R.kn, p.L.el, p.R.el];
    const bx = O.x + s.x;
    p.bar.position.set(bx, O.y + 25.5, O.z + w.zw - 1.3);
    p.bar.rotation.z = Math.sin(t * 0.9) * 0.05 + s.lean * 0.4;
    p.strings.forEach((st, i) => {
      const kn = s.knots[i];
      anchors[i].getWorldPosition(pv);
      pv.z = O.z + w.zw - 0.32;
      const K3 = V3(O.x + kn[0], O.y + kn[1], O.z + w.zw - 1.3);
      const top = V3(bx + (i & 1 ? -3.6 : 3.6) * (i < 2 ? 0.6 : 1), O.y + 25.5, O.z + w.zw - 1.3);
      const seg = (m, a, b) => {
        const d = b.clone().sub(a);
        m.position.copy(a);
        m.scale.set(1, Math.max(0.01, d.length()), 1);
        m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
      };
      st.a.visible = st.b.visible = st.knot.visible = s.vis > 0.05;
      if (st.cut) {
        // the cut thread: the upper end swings, the lower end hangs from the limb
        st.drop = Math.min(1, st.drop + 0.016);
        const hang = V3(pv.x + Math.sin(t * 2 + i) * 0.4, pv.y - 2.5 * st.drop, pv.z - 0.4);
        seg(st.a, pv, hang);
        const swing = V3(top.x + Math.sin(t * 1.4 + i) * 1.5, top.y - 6 + 4 * (1 - st.drop), top.z);
        seg(st.b, swing, top);
        st.knot.visible = false;
        st.halo.visible = false;
        return;
      }
      seg(st.a, pv, K3);
      seg(st.b, K3, top);
      st.knot.position.copy(K3);
      st.knot.rotation.y = t * 2;
      const hot = s.hot;
      st.knot.material.color.set(hot ? '#ffd27a' : '#a07840').multiplyScalar(hot ? 0.75 + 0.15 * Math.sin(t * 8 + i) : 0.4);
      st.knot.scale.setScalar(hot ? 1.25 + 0.15 * Math.sin(t * 6 + i) : 0.8);
      st.halo.visible = hot && s.vis > 0.5;
      st.halo.position.copy(K3);
      st.halo.position.z -= 0.05;
      st.halo.rotation.y = Math.PI;
      st.halo.scale.setScalar(1 + 0.2 * Math.sin(t * 5 + i));
    });
    // the telegraph: on the screen (shader) and on the apron
    const U = w.U;
    if (s.warn) {
      U.uWarn.value.set(O.x + s.warn[0], O.x + s.warn[1], O.y + s.warn[2], O.y + s.warn[3]);
      U.uWarnK.value = s.warnK;
      p.floorMark.visible = s.warn[2] < 0.5;
      p.floorMark.position.x = O.x + (s.warn[0] + s.warn[1]) / 2;
      p.floorMark.scale.x = s.warn[1] - s.warn[0];
      p.floorMark.material.opacity = 0.5 * s.warnK;
    } else {
      U.uWarnK.value = 0;
      p.floorMark.visible = false;
    }
    U.uGold.value = s.gold || 0;
  };

  // ---------- queries ----------
  const rel = (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z);
  const inBox = (q, b, dy = 1.2) => q.x > b.x0 && q.x < b.x1 && q.z > b.z0 - 0.3 && q.z < b.z1 + 0.3 && Math.abs(q.y - b.top) < dy;
  return {
    O,
    P,
    rel,
    get built() {
      return built;
    },
    build,
    resetRig,
    wake,
    sleep,
    update,
    posePuppet,
    select,
    WALLS,
    ROOMS,
    BOSS,
    BAL,
    KNOTS,
    RINGS,
    NOTCH,
    POSTS,
    R5SEG,
    CONSOLE,
    TILE,
    D,
    SX,
    doors,
    consoles,
    puppet,
    get screen() {
      return screen;
    },
    solidsOf,
    shadowGrid,
    refreshSolids,
    anchorAt,
    anchorPos,
    osize,
    projT,
    handsOf,
    exitWing,
    startWing,
    onExit: (id, q) => inBox(q, exitWing(ROOMS[id])),
    inStrip: (id, q) => {
      const w = WALLS[id];
      return q.z > w.zw - w.D - 0.4 && q.z < w.zw + 0.1 && q.x > w.x0 - 6 && q.x < w.x1 + 6;
    },
    inRoom: (id, q) => {
      const r = ROOMS[id];
      const hx = r.kind === 'boss' ? 33 : 22;
      return q.z > r.zs - 0.5 && q.z < r.zw && Math.abs(q.x) < hx;
    },
    nearConsole: (id, q, d = 2.3) => {
      const c = consoles[id];
      return !!c && Math.hypot(q.x - c.x, q.z - (c.z - 0.9)) < d && q.y < 1.5;
    },
    ringPos: (i) => P(RINGS[i].x, RINGS[i].y, RINGS[i].z),
    secOf: (x) => BOSS.secs.findIndex(([a, b]) => x >= a && x < b),
    groundOn: (w, body) => (w.boxes ? w.boxes.indexOf(body.ground) : -1),
  };
})();
