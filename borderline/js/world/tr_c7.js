// ♣ 9 · Le Pilote. A two-seat skiff in a pink sandstone canyon of Terre 39 that winds back and
// forth (nine passes, ~10 km) above a sea of clouds, under floating ruins:
//  0. the landing shelf: cast off the two moorings, choose the seats (pilot / navigation)
//  1. the canyon: light arches only the navigator sees, then rockfalls with a single gap each
//  2. the storm: the pilot flies blind, the navigator reads the radar; telegraphed lightning
//  3. the attack: Veilleur drones; the turret, dodging, hull fires, repair hearts
//  4. the rift closes behind; the mothership; four cores torn off with the grapple
//  5. a precision landing on the heart-shaped platform; the card
// Geometry, visuals and pure helpers only; the rules live in js/levels/tr_c7.js.
const TrC7 = (() => {
  const O = V3(700, 0, 9800);
  const group = new THREE.Group();
  group.visible = false;
  group.userData.noCull = true;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- noise (shared by the geometry and the collision checks) ----------
  const hash = (i, j) => {
    let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, y) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = hash(i, j);
    const b = hash(i + 1, j);
    const c = hash(i, j + 1);
    const d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm2 = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.03 + 17.1, y * 2.03 + 3.7) * 0.3 + vnoise(x * 4.1 + 5.3, y * 4.1 + 11.9) * 0.2;

  // ---------- the track: a serpentine canyon, sampled every 2 m ----------
  const SP = 140; // between passes
  const XE = 470; // where the passes turn
  const RT = 70; // turn radius
  const Z0 = -560;
  const NP = 9;
  const DS = 2;
  const BASIN = { x: 560, z: Z0 + 8 * SP, r: 66 };
  const raw = [];
  const passRaw = [];
  for (let k = 0; k < NP; k++) {
    const z0 = Z0 + k * SP;
    const dir = k % 2 ? -1 : 1;
    const xa = k === 0 ? -612 : -dir * XE;
    const xb = dir * XE;
    const A = [0, 16, 20, 14, 18, 22, 15, 19, 12][k];
    const m = [3, 4, 5, 3, 4, 5, 4, 3, 4][k];
    passRaw.push(raw.length / 2);
    const n = Math.ceil(Math.abs(xb - xa) / 0.5);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      raw.push(xa + (xb - xa) * t, z0 + A * Math.sin(m * Math.PI * t) * Math.sin(Math.PI * t) ** 2);
    }
    if (k < NP - 1) {
      const cx = dir * XE;
      const cz = z0 + RT;
      const n2 = Math.ceil((Math.PI * RT) / 0.5);
      for (let i = 0; i < n2; i++) {
        const th = (i / n2) * Math.PI;
        raw.push(cx + dir * RT * Math.sin(th), cz - RT * Math.cos(th));
      }
    } else for (let x = xb; x <= BASIN.x + BASIN.r + 0.01; x += 0.5) raw.push(x, z0);
  }
  const NR = raw.length / 2;
  const cum = new Float64Array(NR);
  for (let i = 1; i < NR; i++) cum[i] = cum[i - 1] + Math.hypot(raw[i * 2] - raw[i * 2 - 2], raw[i * 2 + 1] - raw[i * 2 - 1]);
  const LEN = cum[NR - 1];
  const NS = Math.floor(LEN / DS) + 1;
  const X = new Float32Array(NS);
  const Z = new Float32Array(NS);
  const TX = new Float32Array(NS);
  const TZ = new Float32Array(NS);
  const W = new Float32Array(NS);
  const RIM = new Float32Array(NS);
  const CURV = new Float32Array(NS);
  {
    let j = 0;
    for (let i = 0; i < NS; i++) {
      const s = i * DS;
      while (j < NR - 2 && cum[j + 1] < s) j++;
      const k = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      X[i] = raw[j * 2] + (raw[j * 2 + 2] - raw[j * 2]) * k;
      Z[i] = raw[j * 2 + 1] + (raw[j * 2 + 3] - raw[j * 2 + 1]) * k;
    }
    for (let i = 0; i < NS; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(NS - 1, i + 1);
      const dx = X[b] - X[a];
      const dz = Z[b] - Z[a];
      const l = Math.hypot(dx, dz) || 1;
      TX[i] = dx / l;
      TZ[i] = dz / l;
    }
    for (let i = 0; i < NS; i++) {
      const a = Math.max(0, i - 3);
      const b = Math.min(NS - 1, i + 3);
      CURV[i] = Math.abs(Math.atan2(TX[a] * TZ[b] - TZ[a] * TX[b], TX[a] * TX[b] + TZ[a] * TZ[b])) / ((b - a) * DS);
    }
  }
  const passS = passRaw.map((r) => cum[r]);
  const END_S = LEN - BASIN.r; // the centre of the basin (the heart)
  const PAD_S = 46;
  const PAD_Y = 30;
  const PLAT_Y = 30;
  const SEC = [PAD_S, passS[2], passS[4], passS[6], END_S];
  const RIFT_S = passS[6];
  for (let i = 0; i < NS; i++) {
    const s = i * DS;
    let w = 31 + (vnoise(s / 140, 3.3) - 0.5) * 8 + Math.min(1, CURV[i] * 60) * 5;
    if (s > passS[1] && s < passS[2]) w -= 2; // the rockfall pass is a little tighter
    if (s > RIFT_S) w -= 3.5; // the rift
    if (s < 34) w *= Math.sqrt(Math.max(0, 1 - ((34 - s) / 34) ** 2));
    const d = s - END_S;
    if (Math.abs(d) < BASIN.r) {
      const c = Math.sqrt(BASIN.r * BASIN.r - d * d);
      w = d > 0 ? c : Math.max(w, c);
    } else if (d > 0) w = 0;
    W[i] = w;
    RIM[i] = 108 + (vnoise(s / 200, 7.1) - 0.5) * 20;
  }

  // the face of the rock: outward offset (m) at track s, height y, side ±1 (negative = juts in)
  const rockOff = (s, y, side) => {
    const a = fbm2(s / 26 + side * 40, y / 14);
    const b = vnoise(s / 7 + side * 13, y / 5);
    const band = hash(Math.floor((y + 40) / 7.5), side > 0 ? 3 : 7) - 0.5;
    const lean = y > 62 ? -Math.min(1, (y - 62) / 40) * 3 : 0;
    return (a - 0.5) * 9 + (b - 0.5) * 2.2 + band * 2.6 + lean;
  };

  const F = { x: 0, z: 0, tx: 1, tz: 0, w: 30, rim: 100, i: 0 };
  const at = (s, o = F) => {
    const f = clamp(s / DS, 0, NS - 1.0001);
    const i = Math.floor(f);
    const k = f - i;
    o.i = i;
    o.x = X[i] + (X[i + 1] - X[i]) * k;
    o.z = Z[i] + (Z[i + 1] - Z[i]) * k;
    let tx = TX[i] + (TX[i + 1] - TX[i]) * k;
    let tz = TZ[i] + (TZ[i + 1] - TZ[i]) * k;
    const l = Math.hypot(tx, tz) || 1;
    o.tx = tx / l;
    o.tz = tz / l;
    o.w = W[i] + (W[i + 1] - W[i]) * k;
    o.rim = RIM[i] + (RIM[i + 1] - RIM[i]) * k;
    return o;
  };
  // track coordinates (s along, u to the right, y up) -> world
  const world = (s, u, y, out = V3()) => {
    const f = at(s);
    return out.set(O.x + f.x - f.tz * u, O.y + y, O.z + f.z + f.tx * u);
  };
  const yawAt = (s) => {
    const f = at(s);
    return Math.atan2(f.tx, f.tz);
  };
  // world -> track coordinates, searching around a hint (track s) when given
  const locate = (wx, wz, hint, out = { s: 0, u: 0 }) => {
    const px = wx - O.x;
    const pz = wz - O.z;
    let best = 0;
    let bd = 1e18;
    if (hint == null) {
      for (let i = 0; i < NS; i += 4) {
        const d = (X[i] - px) ** 2 + (Z[i] - pz) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
    }
    const c = hint == null ? best : Math.round(clamp(hint, 0, LEN) / DS);
    const a = Math.max(0, c - (hint == null ? 6 : 40));
    const b = Math.min(NS - 1, c + (hint == null ? 6 : 40));
    bd = 1e18;
    for (let i = a; i <= b; i++) {
      const d = (X[i] - px) ** 2 + (Z[i] - pz) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const dx = px - X[best];
    const dz = pz - Z[best];
    out.s = clamp(best * DS + clamp(dx * TX[best] + dz * TZ[best], -DS, DS), 0, LEN);
    out.u = -dx * TZ[best] + dz * TX[best];
    return out;
  };
  // half width of the canyon at s, height y, on a side (the rock face), and how far the rift
  // has closed it (k: 1 open, 0 shut)
  const closeK = (s, front) => (front == null ? 1 : clamp((s - front) / 70, 0.03, 1));
  const face = (s, y, side, front) => {
    const f = at(s);
    return (f.w + rockOff(s, y, side)) * closeK(s, front);
  };
  const ceilAt = (s) => at(s).rim - 14;
  const FLOOR = 10;

  // ---------- the course: arches, rockfalls, spires, hearts ----------
  const r1 = rng(7107);
  const ARCHES = [];
  const ROCKFALLS = [];
  {
    let s = PAD_S + 170;
    while (s < passS[2] - 70) {
      const f = at(s);
      const inTurn = CURV[f.i] > 0.004;
      const fall = s > passS[1] + 40 && !inTurn && ARCHES.length % 1 === 0;
      const lim = f.w - (fall ? 18 : 13);
      const u = (r1() * 2 - 1) * lim;
      const y = 22 + r1() * 44;
      ARCHES.push({ s, u, y, r: 7.2, fall });
      if (fall) ROCKFALLS.push({ s, u, y, g: 9, i: ARCHES.length - 1 });
      s += 98 + r1() * 34;
    }
    // a gentler start: the first arches stay near the middle
    ARCHES.slice(0, 3).forEach((a, i) => {
      a.u *= 0.35 + i * 0.2;
      a.y = 34 + i * 4;
    });
  }
  const SPIRES = [];
  {
    let s = passS[2] + 70;
    while (s < passS[4] - 60) {
      const f = at(s);
      const lim = f.w - 15;
      const fu = (r1() * 2 - 1) * lim;
      const n = r1() < 0.55 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        for (let tries = 0; tries < 12; tries++) {
          const r = 3.6 + r1() * 2.6;
          const u = (r1() * 2 - 1) * (f.w + 2);
          if (Math.abs(u - fu) < r + 10) continue;
          if (SPIRES.some((p) => Math.abs(p.s - s) < 2 && Math.abs(p.u - u) < p.r + r + 3)) continue;
          SPIRES.push({ s: s + (r1() - 0.5) * 6, u, r });
          break;
        }
      }
      s += 48 + r1() * 24;
    }
  }
  const HEARTS = [];
  {
    let s = passS[4] + 140;
    while (s < END_S - 320) {
      const f = at(s);
      HEARTS.push({ s, u: (r1() * 2 - 1) * (f.w - 14), y: 26 + r1() * 34 });
      s += 230 + r1() * 70;
    }
  }
  const BAR_S = passS[6] - 50; // the Veilleur dam at the end of the attack
  const BOSS_BAR_S = END_S - 150; // where the mothership bars the way, if it still can
  const GATES = passS.slice(1);

  // ---------- materials ----------
  const rockMat = (k) => {
    const m = Tex.mat('rock', { color: '#ffffff', scale: 9, bump: 1.25, rough: 0.93, c7: k });
    m.vertexColors = true;
    return m;
  };
  const wallMat = rockMat('wall');
  const riftU = { uFront: { value: -1e4 } };
  const riftMat = (() => {
    const m = rockMat('rift');
    const base = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (base) base(sh, r);
      sh.uniforms.uFront = riftU.uFront;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aRift;\nuniform float uFront;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            float ck = clamp((aRift.x - uFront) / 70.0, 0.03, 1.0);
            transformed.x -= aRift.y * (1.0 - ck);
            transformed.z -= aRift.z * (1.0 - ck);
          }`,
        );
    };
    return m;
  })();
  const capMat = rockMat('cap');
  const stone = Tex.mat('stone', { color: '#e8c4bc', scale: 2.2, rough: 0.9 });
  const marble = Tex.mat('marble', { color: '#f4e4de', scale: 1.6, rough: 0.55 });
  const grass = Tex.mat('grass', { color: '#d48aa2', scale: 2.5, rough: 0.95 });
  const islandRock = Tex.mat('rock', { color: '#c88a90', scale: 5, rough: 0.95, bump: 1.1 });
  const hull = Tex.mat('plaster', { color: '#f6ebe4', scale: 1.2, rough: 0.5 });
  const accent = new THREE.MeshStandardMaterial({ color: '#c9707f', roughness: 0.45, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2d2230', roughness: 0.6, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: '#ffd8e6', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false });
  const porcelain = Tex.mat('plaster', { color: '#efe9ea', scale: 0.8, rough: 0.4 });
  const veil = Tex.mat('marble', { color: '#e3d6de', scale: 3, rough: 0.55 });
  const glow = (c, k = 1) => LvKit.glow(c, k);
  const addGlow = (c, op = 0.5) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

  // ---------- shapes ----------
  const heartShape = (s) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -s * 0.9);
    sh.bezierCurveTo(-s * 0.2, -s * 0.65, -s * 1.0, -s * 0.3, -s * 1.0, s * 0.25);
    sh.bezierCurveTo(-s * 1.0, s * 0.75, -s * 0.45, s * 0.95, 0, s * 0.55);
    sh.bezierCurveTo(s * 0.45, s * 0.95, s * 1.0, s * 0.75, s * 1.0, s * 0.25);
    sh.bezierCurveTo(s * 1.0, -s * 0.3, s * 0.2, -s * 0.65, 0, -s * 0.9);
    return sh;
  };
  const heartGeo = (s, depth) =>
    depth ? new THREE.ExtrudeGeometry(heartShape(s), { depth, bevelEnabled: true, bevelSize: depth * 0.25, bevelThickness: depth * 0.25, bevelSegments: 2, curveSegments: 18 }) : new THREE.ShapeGeometry(heartShape(s), 18);
  const softTex = (n, seed, puffs = 26) =>
    LvKit.tex(n, n, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = rng(seed);
      for (let i = 0; i < puffs; i++) {
        const a = r() * TAU;
        const d = Math.pow(r(), 0.7) * w * 0.26;
        const x = w / 2 + Math.cos(a) * d;
        const y = h / 2 + Math.sin(a) * d * 0.6;
        const rad = w * (0.12 + r() * 0.16);
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, 'rgba(255,255,255,0.42)');
        grd.addColorStop(0.6, 'rgba(255,255,255,0.14)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      }
    });
  const dotTex = LvKit.tex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  dotTex.wrapS = dotTex.wrapT = THREE.ClampToEdgeWrapping;

  // ---------- the canyon walls ----------
  const STRATA = ['#eaa3a8', '#f3c3b2', '#d98a98', '#f6d8c8', '#cf7f90', '#ecb3a4', '#e19aa0', '#f0cdbd'].map((c) => new THREE.Color(c));
  const LOW = new THREE.Color('#7a4a6a');
  const TOPC = new THREE.Color('#f7dccd');
  const tc = new THREE.Color();
  const strata = (s, y, side, out) => {
    const b = Math.floor((y + 40 + (vnoise(s / 60, side * 3) - 0.5) * 6) / 7.5);
    const k = Math.floor(hash(b, 11) * STRATA.length);
    out.copy(STRATA[k]);
    const v = 0.86 + vnoise(s / 9, y / 3) * 0.22;
    out.multiplyScalar(v);
    if (y < 30) out.lerp(LOW, clamp((30 - y) / 50, 0, 0.85));
    return out;
  };
  const wallChunks = [];
  const buildWalls = () => {
    const STEP = 2; // samples per column (4 m)
    const CH = 100; // columns per chunk
    const YR = (rim) => {
      const a = [-40, -12, 4];
      const n = 15;
      for (let k = 0; k <= n; k++) a.push(10 + ((rim + 2 - 10) * k) / n);
      return a;
    };
    const CAP = [5, 16, 36, 70];
    for (let c0 = 0; c0 * STEP < NS - 1; c0 += CH) {
      const i0 = c0 * STEP;
      const i1 = Math.min(NS - 1, (c0 + CH) * STEP);
      const rift = i1 * DS > RIFT_S - 120;
      [-1, 1].forEach((side) => {
        const cols = Math.floor((i1 - i0) / STEP) + 1;
        const rows = YR(100).length + CAP.length;
        const pos = new Float32Array(cols * rows * 3);
        const col = new Float32Array(cols * rows * 3);
        const rf = rift ? new Float32Array(cols * rows * 3) : null;
        let v = 0;
        for (let ci = 0; ci < cols; ci++) {
          const i = Math.min(NS - 1, i0 + ci * STEP);
          const s = i * DS;
          const nx = -TZ[i];
          const nz = TX[i];
          const ys = YR(RIM[i]);
          let lastLat = 0;
          ys.forEach((y) => {
            const lat = side * Math.max(0.2, W[i] + rockOff(s, y, side));
            lastLat = lat;
            pos[v * 3] = X[i] + nx * lat;
            pos[v * 3 + 1] = y;
            pos[v * 3 + 2] = Z[i] + nz * lat;
            strata(s, y, side, tc);
            col[v * 3] = tc.r;
            col[v * 3 + 1] = tc.g;
            col[v * 3 + 2] = tc.b;
            if (rf) {
              rf[v * 3] = s;
              rf[v * 3 + 1] = nx * lat;
              rf[v * 3 + 2] = nz * lat;
            }
            v++;
          });
          CAP.forEach((d, k) => {
            const lat = lastLat + side * d;
            const y = RIM[i] + 2 + (k ? 1.5 + vnoise(s / 30, k * 7 + side) * 5 : 0.8);
            pos[v * 3] = X[i] + nx * lat;
            pos[v * 3 + 1] = y;
            pos[v * 3 + 2] = Z[i] + nz * lat;
            tc.copy(TOPC).multiplyScalar(0.8 + vnoise(s / 11, k + side * 5) * 0.25);
            col[v * 3] = tc.r;
            col[v * 3 + 1] = tc.g;
            col[v * 3 + 2] = tc.b;
            if (rf) {
              rf[v * 3] = s;
              rf[v * 3 + 1] = nx * lat;
              rf[v * 3 + 2] = nz * lat;
            }
            v++;
          });
        }
        const idx = [];
        for (let ci = 0; ci < cols - 1; ci++)
          for (let r = 0; r < rows - 1; r++) {
            const a = ci * rows + r;
            const b = (ci + 1) * rows + r;
            const d = a + 1;
            const e = b + 1;
            if (side > 0) idx.push(a, d, b, b, d, e);
            else idx.push(a, b, d, b, e, d);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        if (rf) g.setAttribute('aRift', new THREE.BufferAttribute(rf, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        if (rf) g.boundingSphere.radius += 40;
        const m = new THREE.Mesh(g, rf ? riftMat : wallMat);
        m.position.copy(O);
        group.add(m);
        wallChunks.push(m);
      });
    }
  };

  // ---------- the sky: a sunset dome, a sea of clouds below, cloud banks in the canyon ----------
  const SUN = V3(0.8, 0.16, -0.58).normalize();
  const skyU = { uTime: { value: 0 }, uStorm: { value: 0 }, uFlash: { value: 0 }, uSun: { value: SUN } };
  let dome = null;
  let sea = null;
  let clouds = null;
  let dust = null;
  let rain = null;
  const NOISE_GLSL = `
    float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.07 + 13.1; a *= 0.5; } return s; }
  `;
  const seaU = { uTime: skyU.uTime, uStorm: skyU.uStorm, uFlash: skyU.uFlash, uSun: skyU.uSun, uCam: { value: V3() }, uFog: { value: 0.006 }, uFogCol: { value: new THREE.Color('#b77890') } };
  const buildSky = () => {
    dome = new THREE.Mesh(
      new THREE.SphereGeometry(760, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: skyU,
        vertexShader: `
          varying vec3 vD;
          void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime, uStorm, uFlash; uniform vec3 uSun;
          varying vec3 vD;
          ${NOISE_GLSL}
          void main() {
            vec3 d = normalize(vD);
            float y = d.y;
            float sd = max(dot(d, uSun), 0.0);
            vec3 zen = vec3(0.13, 0.06, 0.25);
            vec3 mid = vec3(0.58, 0.24, 0.42);
            vec3 hor = vec3(0.96, 0.5, 0.42);
            vec3 col = mix(hor, mid, smoothstep(0.02, 0.28, y));
            col = mix(col, zen, smoothstep(0.22, 0.9, y));
            col = mix(col, vec3(0.55, 0.3, 0.45), smoothstep(0.0, -0.25, y));
            // the low sun, its halo, the warm side of the sky
            col += vec3(1.0, 0.5, 0.32) * pow(sd, 6.0) * 0.5;
            col += vec3(1.0, 0.72, 0.5) * pow(sd, 60.0) * 0.6;
            col += vec3(1.2, 0.95, 0.75) * smoothstep(0.9985, 0.9993, sd) * (1.0 - uStorm);
            // two cloud layers, lit pink from the sun's side
            vec2 uv = d.xz / (abs(y) + 0.14);
            float c1 = fbm(uv * 1.1 + vec2(uTime * 0.004, uTime * 0.0015));
            float c2 = fbm(uv * 2.6 + vec2(-uTime * 0.006, 3.0));
            float cl = smoothstep(0.48, 0.78, c1 * 0.7 + c2 * 0.3) * smoothstep(-0.02, 0.12, y) * smoothstep(0.85, 0.2, y);
            vec3 lit = mix(vec3(0.62, 0.3, 0.46), vec3(1.0, 0.7, 0.6), clamp(pow(sd, 2.0) + c2 * 0.4, 0.0, 1.0));
            col = mix(col, lit, cl * 0.85);
            // the storm: low and dark, lightning flashes inside it
            vec3 st = mix(vec3(0.07, 0.06, 0.1), vec3(0.16, 0.12, 0.2), fbm(uv * 1.6 + uTime * 0.03));
            st += vec3(0.6, 0.55, 0.8) * uFlash * (0.4 + fbm(uv * 3.0));
            col = mix(col, st, uStorm);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -2;
    dome.frustumCulled = false;
    group.add(dome);
    // the sea of clouds under the canyon
    sea = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 1500, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        fog: false,
        uniforms: seaU,
        vertexShader: `
          varying vec3 vW;
          void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform float uTime, uStorm, uFlash, uFog; uniform vec3 uCam, uFogCol, uSun;
          varying vec3 vW;
          ${NOISE_GLSL}
          void main() {
            vec2 p = vW.xz * 0.011 + vec2(uTime * 0.014, uTime * 0.005);
            float c = fbm(p);
            float c2 = fbm(p * 2.9 - vec2(uTime * 0.02, 0.0));
            float h = c * 0.68 + c2 * 0.32;
            vec3 lo = vec3(0.3, 0.13, 0.3);
            vec3 hi = vec3(0.95, 0.66, 0.68);
            vec3 col = mix(lo, hi, smoothstep(0.32, 0.78, h));
            col *= mix(vec3(1.0), vec3(0.32, 0.3, 0.42), uStorm);
            col += vec3(0.4, 0.38, 0.55) * uFlash * h;
            float dd = length(vW - uCam);
            float f = 1.0 - exp(-pow(dd * uFog * 0.8, 2.0));
            gl_FragColor = vec4(mix(col, uFogCol, f), 1.0);
          }`,
      }),
    );
    sea.position.copy(P(0, 6, 0));
    sea.frustumCulled = false;
    group.add(sea);
    // cloud banks drifting in the canyon (billboards)
    const N = 320;
    const ct = softTex(256, 3901, 30);
    ct.wrapS = ct.wrapT = THREE.ClampToEdgeWrapping;
    clouds = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { tMap: { value: ct }, uTime: skyU.uTime, uStorm: skyU.uStorm, uFog: seaU.uFog, uFogCol: seaU.uFogCol },
        vertexShader: `
          uniform float uTime, uFog;
          varying vec2 vUv; varying float vA; varying float vK;
          void main() {
            vUv = uv;
            vec3 c = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float sc = length(instanceMatrix[0].xyz);
            vK = fract(sc * 13.7);
            c.x += sin(uTime * 0.04 + c.z * 0.013) * 7.0;
            c.z += cos(uTime * 0.035 + c.x * 0.011) * 7.0;
            vec4 mv = viewMatrix * vec4(c, 1.0);
            mv.xy += position.xy * vec2(sc * 1.6, sc);
            gl_Position = projectionMatrix * mv;
            float d = length(mv.xyz);
            vA = smoothstep(sc * 0.25, sc * 0.75 + 8.0, d) * exp(-pow(d * uFog * 0.7, 2.0));
          }`,
        fragmentShader: `
          uniform sampler2D tMap; uniform float uStorm; uniform vec3 uFogCol;
          varying vec2 vUv; varying float vA; varying float vK;
          void main() {
            float a = texture2D(tMap, vUv).a;
            vec3 lit = mix(vec3(0.95, 0.68, 0.72), vec3(1.0, 0.8, 0.7), vK);
            vec3 sh = vec3(0.55, 0.32, 0.5);
            vec3 col = mix(sh, lit, smoothstep(0.1, 0.9, vUv.y));
            col = mix(col, vec3(0.2, 0.17, 0.25), uStorm * 0.85);
            gl_FragColor = vec4(col, a * vA * 0.8);
          }`,
      }),
      N,
    );
    {
      const r = rng(3911);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < N; i++) {
        const s = r() * (END_S - 100) + 60;
        const f = at(s);
        const low = r() < 0.45;
        const u = (r() * 2 - 1) * (f.w + (low ? 10 : 0));
        const y = low ? 6 + r() * 10 : 18 + r() * 80;
        const sc = (low ? 26 : 14) + r() * 22;
        const p = world(s, u, y);
        m4.makeScale(sc, sc, sc).setPosition(p);
        clouds.setMatrixAt(i, m4);
      }
    }
    clouds.frustumCulled = false;
    clouds.renderOrder = 2;
    group.add(clouds);
    // dust motes around the camera: speed you can feel
    const ND = 900;
    const dg = new THREE.BufferGeometry();
    const dp = new Float32Array(ND * 3);
    const rr = rng(3921);
    for (let i = 0; i < ND; i++) dp.set([rr() * 90 - 45, rr() * 60 - 30, rr() * 90 - 45], i * 3);
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dust = new THREE.Points(
      dg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uCam: { value: V3() }, uPx: { value: 1 }, uK: { value: 1 }, uStorm: skyU.uStorm },
        vertexShader: `
          uniform vec3 uCam; uniform float uPx;
          varying float vA;
          void main() {
            vec3 p = position;
            vec3 w = uCam + mod(p - uCam + vec3(45.0, 30.0, 45.0), vec3(90.0, 60.0, 90.0)) - vec3(45.0, 30.0, 45.0);
            vec4 mv = viewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            float d = -mv.z;
            gl_PointSize = uPx * 26.0 / max(d, 1.0);
            vA = smoothstep(45.0, 20.0, d) * smoothstep(0.5, 3.0, d);
          }`,
        fragmentShader: `
          uniform float uK, uStorm;
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * vA * uK * 0.5;
            vec3 c = mix(vec3(1.0, 0.75, 0.7), vec3(0.6, 0.6, 0.75), uStorm);
            gl_FragColor = vec4(c * a, a);
          }`,
      }),
    );
    dust.frustumCulled = false;
    group.add(dust);
    // the storm's rain: streaks wrapped around the camera
    const NRn = 2600;
    const rg = new THREE.BufferGeometry();
    const rp = new Float32Array(NRn * 6);
    const rr2 = rng(3931);
    for (let i = 0; i < NRn; i++) {
      const x = rr2() * 70 - 35;
      const y = rr2() * 50;
      const z = rr2() * 70 - 35;
      rp.set([x, y, z, x, y, z], i * 6);
    }
    const rk = new Float32Array(NRn * 2);
    for (let i = 0; i < NRn; i++) rk.set([0, 1], i * 2);
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rg.setAttribute('aEnd', new THREE.BufferAttribute(rk, 1));
    rain = new THREE.LineSegments(
      rg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uCam: { value: V3() }, uTime: skyU.uTime, uK: { value: 0 }, uVel: { value: V3() } },
        vertexShader: `
          uniform vec3 uCam, uVel; uniform float uTime;
          attribute float aEnd;
          varying float vA;
          void main() {
            vec3 p = position;
            p.y = mod(p.y - uTime * 38.0, 50.0);
            vec3 w = uCam + vec3(mod(p.x - uCam.x + 35.0, 70.0) - 35.0, p.y - 25.0, mod(p.z - uCam.z + 35.0, 70.0) - 35.0);
            // a streak along the fall, bent by the wind and our own speed
            w += aEnd * (vec3(0.0, 2.2, 0.0) + uVel * 0.06);
            vec4 mv = viewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            vA = smoothstep(35.0, 6.0, -mv.z) * (1.0 - aEnd * 0.8);
          }`,
        fragmentShader: `
          uniform float uK;
          varying float vA;
          void main() { float a = vA * uK * 0.35; gl_FragColor = vec4(vec3(0.7, 0.72, 0.9) * a, a); }`,
      }),
    );
    rain.frustumCulled = false;
    rain.visible = false;
    group.add(rain);
  };

  // ---------- floating ruins (instanced) and ruin bridges ----------
  const islands = [];
  const isl = { parts: [] };
  const buildIslands = () => {
    const r = rng(4101);
    const cone = new THREE.ConeGeometry(1, 1.9, 10, 4).rotateX(Math.PI).translate(0, -0.95, 0);
    {
      const p = cone.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const n = 1 + (hash(Math.round(x * 50) + 99, Math.round(z * 50 + y * 31)) - 0.5) * 0.35;
        if (y < -0.02) p.setXYZ(i, x * n, y * (0.9 + n * 0.1), z * n);
      }
      cone.computeVertexNormals();
    }
    const disc = new THREE.CylinderGeometry(1.03, 1.0, 0.16, 14).translate(0, 0.02, 0);
    const colG = new THREE.CylinderGeometry(0.05, 0.06, 1, 10).translate(0, 0.5, 0);
    const lintel = new THREE.BoxGeometry(1, 0.08, 0.12);
    const hg = heartGeo(0.12, 0.04);
    hg.center();
    const parts = {
      cone: { geo: cone, mat: islandRock, list: [] },
      disc: { geo: disc, mat: grass, list: [] },
      col: { geo: colG, mat: marble, list: [] },
      lin: { geo: lintel, mat: marble, list: [] },
      heart: { geo: hg, mat: glow('#ff6f9a', 0.75), list: [] },
    };
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let n = 0; n < 46; n++) {
      const s = 60 + r() * (END_S - 40);
      const f = at(s);
      const side = r() < 0.5 ? -1 : 1;
      const high = r() < 0.7;
      const sc = high ? 9 + r() * 16 : 5 + r() * 5;
      // high ones float above the rim, low ones hug a wall above the flight ceiling
      const u = high ? side * (f.w + 10 + r() * 50) : side * (f.w + 2);
      const y = high ? f.rim + 12 + r() * 70 : f.rim - 6 + r() * 6;
      const c = world(s, u, y);
      const it = { c, sc, ph: r() * TAU, rot: r() * TAU, i0: {} };
      islands.push(it);
      const add = (k, lp, ls, rot = 0, rx = 0) => {
        e.set(rx, it.rot + rot, 0);
        q.setFromEuler(e);
        parts[k].list.push({ it, lp: lp.clone(), ls: ls.clone(), q: q.clone() });
      };
      add('cone', V3(0, 0, 0), V3(sc, sc * (0.8 + r() * 0.5), sc));
      add('disc', V3(0, 0, 0), V3(sc, sc, sc));
      const nc = 2 + Math.floor(r() * 4);
      const a0 = r() * TAU;
      for (let k = 0; k < nc; k++) {
        const a = a0 + (k / nc) * TAU * 0.6;
        const rr = sc * 0.55;
        const hgt = sc * (0.35 + r() * 0.45) * (r() < 0.3 ? 0.45 : 1);
        add('col', V3(Math.cos(a) * rr, 0.1, Math.sin(a) * rr), V3(sc * 1.4, hgt, sc * 1.4));
      }
      if (r() < 0.6) {
        const a = a0 + 0.3;
        add('lin', V3(Math.cos(a) * sc * 0.5, sc * 0.62, Math.sin(a) * sc * 0.5), V3(sc * 0.7, sc, sc), -a);
        add('heart', V3(Math.cos(a) * sc * 0.5, sc * 0.72, Math.sin(a) * sc * 0.5), V3(sc, sc, sc), -a + Math.PI / 2);
      }
    }
    Object.values(parts).forEach((pt) => {
      const m = new THREE.InstancedMesh(pt.geo, pt.mat, pt.list.length);
      m.frustumCulled = false;
      group.add(m);
      pt.mesh = m;
      isl.parts.push(pt);
    });
    updateIslands(0, true);
    // stone bridges across the canyon, above the flight ceiling
    const deckG = new THREE.BoxGeometry(1, 1, 1);
    for (let n = 0; n < 9; n++) {
      const s = 300 + n * ((END_S - 600) / 9) + r() * 80;
      const f = at(s);
      const y = f.rim - 3;
      const span = (f.w + 12) * 2;
      const b = new THREE.Group();
      b.position.copy(world(s, 0, y));
      b.rotation.y = Math.atan2(f.tx, f.tz) + Math.PI / 2 + (r() - 0.5) * 0.2;
      const deck = new THREE.Mesh(deckG, stone);
      deck.scale.set(span, 2.4, 5);
      b.add(deck);
      // broken: a gap in the middle on some
      if (r() < 0.45) {
        deck.scale.x = span * 0.36;
        deck.position.x = -span * 0.32;
        const d2 = deck.clone();
        d2.position.x = span * 0.32;
        b.add(d2);
      }
      for (let k = -3; k <= 3; k++) {
        const pil = new THREE.Mesh(colG, marble);
        pil.scale.set(10, 4, 10);
        pil.position.set((k / 3.5) * span * 0.5, 1.2, 2.2);
        b.add(pil);
      }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(span * 0.25, 1.1, 8, 24, Math.PI), stone);
      arch.position.y = -0.8;
      arch.rotation.z = Math.PI;
      arch.scale.y = 0.35;
      b.add(arch);
      group.add(b);
    }
  };
  const m4i = new THREE.Matrix4();
  const v3i = V3();
  const updateIslands = (t, force) => {
    isl.parts.forEach((pt) => {
      pt.list.forEach((o, i) => {
        const it = o.it;
        const bob = Math.sin(t * 0.35 + it.ph) * 1.6;
        v3i.x = o.lp.x * Math.cos(it.rot) + o.lp.z * Math.sin(it.rot);
        v3i.z = -o.lp.x * Math.sin(it.rot) + o.lp.z * Math.cos(it.rot);
        v3i.y = o.lp.y;
        v3i.add(it.c);
        v3i.y += bob;
        m4i.compose(v3i, o.q, o.ls);
        pt.mesh.setMatrixAt(i, m4i);
      });
      pt.mesh.instanceMatrix.needsUpdate = true;
    });
    void force;
  };

  // ---------- the course pieces ----------
  const arches = [];
  const navOnly = new THREE.Group();
  const buildArches = () => {
    group.add(navOnly);
    const ringG = new THREE.TorusGeometry(1, 0.06, 10, 64);
    const discG = new THREE.CircleGeometry(1, 48);
    const hg = heartGeo(0.16, 0);
    hg.center();
    const chev = new THREE.Shape();
    chev.moveTo(-1, -0.4);
    chev.lineTo(0, 0.5);
    chev.lineTo(1, -0.4);
    chev.lineTo(1, -0.05);
    chev.lineTo(0, 0.85);
    chev.lineTo(-1, -0.05);
    chev.closePath();
    const chevG = new THREE.ShapeGeometry(chev);
    ARCHES.forEach((a, i) => {
      const g = new THREE.Group();
      g.position.copy(world(a.s, a.u, a.y));
      g.rotation.y = yawAt(a.s);
      const ring = new THREE.Mesh(ringG, glow('#ff7aa8', 1.15));
      ring.scale.setScalar(a.r);
      g.add(ring);
      const inner = new THREE.Mesh(discG, addGlow('#ff9ac0', 0.07));
      inner.scale.setScalar(a.r);
      g.add(inner);
      const key = new THREE.Mesh(hg, glow('#ffb0c8', 1.1));
      key.scale.setScalar(a.r * 1.0);
      key.position.y = a.r + 0.6;
      g.add(key);
      navOnly.add(g);
      // chevrons leading to the arch, 30 and 55 m before it (navigator only too)
      const cs = [];
      [55, 30].forEach((back) => {
        const s0 = a.s - back;
        const f = at(s0);
        const c = new THREE.Mesh(chevG, addGlow('#ffc0d6', 0.55));
        const k = back / 85;
        const u = a.u * (1 - k) + 0;
        const y = a.y * (1 - k) + 40 * k;
        c.position.copy(world(s0, u, y));
        // the chevron points from where it is toward the arch
        const tgt = world(a.s, a.u, a.y);
        c.lookAt(tgt);
        c.rotateX(Math.PI / 2);
        c.scale.setScalar(3.2);
        navOnly.add(c);
        cs.push(c);
        void f;
      });
      arches.push({ g, ring, inner, key, cs, got: 0, i });
    });
  };
  const rockfalls = [];
  const buildRockfalls = () => {
    const mat = Tex.mat('rock', { color: '#c98c8e', scale: 4, rough: 0.95, bump: 1.2 });
    const bG = new THREE.DodecahedronGeometry(1, 0);
    ROCKFALLS.forEach((rf) => {
      const f = at(rf.s);
      const g = new THREE.Group();
      g.position.copy(world(rf.s, 0, 0));
      g.rotation.y = Math.atan2(f.tx, f.tz);
      // local: x = -u (left), y up, z along. Build the four blocks around the gap.
      const W2 = f.w + 12;
      const top = f.rim + 4;
      const gu = rf.u;
      const G = rf.g;
      const blk = (u0, u1, y0, y1) => {
        if (u1 - u0 < 0.5 || y1 - y0 < 0.5) return;
        const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, 7, 3, 3, 1), mat);
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const y = p.getY(i);
          const z = p.getZ(i);
          p.setZ(i, z + (hash(Math.round(x * 3), Math.round(y * 3)) - 0.5) * 3);
        }
        m.geometry.computeVertexNormals();
        m.position.set(-(u0 + u1) / 2, (y0 + y1) / 2, 0);
        g.add(m);
      };
      blk(-W2, gu - G, -20, top);
      blk(gu + G, W2, -20, top);
      blk(gu - G, gu + G, rf.y + G, top);
      blk(gu - G, gu + G, -20, rf.y - G);
      // boulders on the rims of the gap
      const r = rng(5000 + Math.round(rf.s));
      for (let k = 0; k < 10; k++) {
        const b = new THREE.Mesh(bG, mat);
        const a = r() * TAU;
        const rr = G + 1 + r() * 2.5;
        b.position.set(-(gu + Math.cos(a) * rr), rf.y + Math.sin(a) * rr, (r() - 0.5) * 6);
        b.scale.setScalar(1.2 + r() * 2);
        b.rotation.set(r() * 3, r() * 3, r() * 3);
        g.add(b);
      }
      group.add(g);
      rockfalls.push({ g, rf });
    });
  };
  let spires = null;
  const buildSpires = () => {
    const g = new THREE.CylinderGeometry(0.85, 1, 1, 12, 14).translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const n = 1 + (vnoise(a * 2.2, y * 9) - 0.5) * 0.35 + (hash(Math.floor(y * 14), 5) - 0.5) * 0.18;
      p.setXYZ(i, x * n, y, z * n);
    }
    g.computeVertexNormals();
    const mat = Tex.mat('rock', { color: '#b88088', scale: 5, rough: 0.95, bump: 1.25 });
    spires = new THREE.InstancedMesh(g, mat, SPIRES.length);
    const m4 = new THREE.Matrix4();
    SPIRES.forEach((sp, i) => {
      const f = at(sp.s);
      const pos = world(sp.s, sp.u, -30);
      m4.compose(pos, new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), sp.s), V3(sp.r, f.rim + 40, sp.r));
      spires.setMatrixAt(i, m4);
    });
    group.add(spires);
  };
  // checkpoint gates: two light strips on the walls and a faint curtain (everyone sees them)
  const gates = [];
  const buildGates = () => {
    GATES.forEach((s, k) => {
      const f = at(s);
      const g = new THREE.Group();
      g.position.copy(world(s, 0, 0));
      g.rotation.y = Math.atan2(f.tx, f.tz);
      [-1, 1].forEach((side) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.6, f.rim - 20, 0.6), glow('#ffd2a8', 0.9));
        strip.position.set(-side * (f.w - 3), (f.rim - 20) / 2 + 12, 0);
        g.add(strip);
      });
      const cur = new THREE.Mesh(new THREE.PlaneGeometry(f.w * 2 - 6, f.rim - 20), addGlow('#ffcfa8', 0.035));
      cur.position.y = (f.rim - 20) / 2 + 12;
      g.add(cur);
      group.add(g);
      gates.push({ g, cur, k: k + 1 });
    });
  };
  // the Veilleur dams (force fields across the canyon)
  const dams = [];
  const damMat = () =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: skyU.uTime, uK: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime, uK; varying vec2 vUv;
        void main() {
          vec2 p = vUv * vec2(28.0, 40.0);
          vec2 r = vec2(1.0, 1.732);
          vec2 h = r * 0.5;
          vec2 a = mod(p, r) - h;
          vec2 b = mod(p - h, r) - h;
          vec2 g = dot(a, a) < dot(b, b) ? a : b;
          float e = smoothstep(0.42, 0.5, max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y)));
          float scan = 0.5 + 0.5 * sin(vUv.y * 40.0 - uTime * 3.0);
          // the eye of the Veilleurs in the middle
          vec2 c = (vUv - 0.5) * vec2(2.2, 1.6);
          float eye = smoothstep(0.32, 0.3, length(c * vec2(1.0, 2.1))) - smoothstep(0.12, 0.1, length(c));
          float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.05, vUv.y);
          float a1 = (e * (0.35 + scan * 0.25) + 0.06 + eye * 0.5) * edge * uK;
          gl_FragColor = vec4(vec3(1.0, 0.42, 0.55) * a1, a1);
        }`,
    });
  const buildDams = () => {
    [BAR_S, BOSS_BAR_S].forEach((s) => {
      const f = at(s);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(f.w * 2 + 16, f.rim + 20), damMat());
      m.position.copy(world(s, 0, (f.rim + 20) / 2 - 15));
      m.rotation.y = Math.atan2(f.tx, f.tz);
      m.visible = false;
      group.add(m);
      dams.push({ m, s, k: 0 });
    });
  };
  // repair hearts
  const hearts = [];
  const buildHearts = () => {
    const hg = heartGeo(1.3, 0.5);
    hg.center();
    HEARTS.forEach((h, i) => {
      const g = new THREE.Group();
      g.position.copy(world(h.s, h.u, h.y));
      const m = new THREE.Mesh(hg, glow('#ff6f9a', 0.85));
      g.add(m);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ff8fb0'), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      halo.scale.setScalar(9);
      g.add(halo);
      group.add(g);
      hearts.push({ g, m, halo, i, got: false });
    });
  };

  // ---------- the skiff ----------
  const ship = { g: null, body: null, turret: null, gun: null, gear: [], flames: [], seats: {}, fires: [], lights: [], light: null };
  const SHIP_FIRES = [V3(2.8, 0.3, -0.6), V3(-1.9, 0.1, -3.4), V3(0.4, 0.9, -4.1)];
  const SEAT = { pilot: V3(0, -0.42, 1.55), nav: V3(0, 0.22, 0) };
  const TURRET = V3(0, 0.78, -1.45);
  const buildShip = () => {
    const g = new THREE.Group();
    group.add(g);
    ship.g = g;
    const body = new THREE.Group();
    g.add(body);
    ship.body = body;
    // fuselage: a lathe, laid along z, flattened
    const prof = [
      [0.02, -5],
      [0.55, -4.75],
      [1.0, -4.0],
      [1.25, -2.6],
      [1.36, -0.6],
      [1.3, 1.3],
      [1.08, 2.9],
      [0.66, 4.2],
      [0.18, 4.95],
      [0.02, 5.05],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 28).rotateX(Math.PI / 2), hull);
    fus.scale.set(1, 0.78, 1);
    body.add(fus);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 8, 40), accent);
    stripe.scale.set(1.03, 0.8, 1);
    stripe.position.z = 0.2;
    body.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.z = -2.7;
    stripe2.scale.set(0.97, 0.76, 1);
    body.add(stripe2);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), accent);
    nose.position.z = 5.0;
    body.add(nose);
    // cockpit: a dark well and a glass canopy
    const well = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI / 2), dark);
    well.scale.set(0.82, 0.25, 1.45);
    well.position.set(0, 0.62, 1.55);
    body.add(well);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14, 0, TAU, 0, Math.PI / 2), glass);
    canopy.scale.set(0.9, 0.95, 1.6);
    canopy.position.set(0, 0.58, 1.55);
    canopy.renderOrder = 3;
    body.add(canopy);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 6, 36, Math.PI), accent);
    frame.scale.set(0.9, 0.95, 1);
    frame.position.set(0, 0.58, 1.55);
    body.add(frame);
    // wings
    const ws = new THREE.Shape();
    ws.moveTo(0, 1.9);
    ws.lineTo(4.6, -0.5);
    ws.quadraticCurveTo(5.05, -0.9, 4.8, -1.4);
    ws.lineTo(0, -2.3);
    ws.closePath();
    const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 });
    wg.rotateX(Math.PI / 2);
    [-1, 1].forEach((side) => {
      const w = new THREE.Mesh(wg, hull);
      w.scale.x = side;
      w.position.set(side * 0.7, 0.05, -0.6);
      w.rotation.z = side * 0.09;
      body.add(w);
      // the edge trim and the heart on each wing
      const trim = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.22), accent);
      trim.position.set(side * 2.9, 0.18 + 0.2, 0.15);
      trim.rotation.y = side * -0.47;
      trim.rotation.z = side * 0.09;
      body.add(trim);
      const ht = new THREE.Mesh(heartGeo(0.42, 0), glow('#ff6f9a', 0.7));
      ht.rotation.x = -Math.PI / 2;
      ht.rotation.z = Math.PI;
      ht.position.set(side * 2.6, 0.38, -1.0);
      body.add(ht);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(side > 0 ? '#ff7aa8' : '#ffe2c8', 1.3));
      tip.position.set(side * 5.2, 0.53, -1.6);
      body.add(tip);
      ship.lights.push(tip);
      // engines
      const eng = new THREE.Group();
      eng.position.set(side * 1.85, -0.18, -2.4);
      body.add(eng);
      const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 3.4, 18).rotateX(Math.PI / 2), hull);
      eng.add(nac);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 24), accent);
      lip.position.z = 1.7;
      eng.add(lip);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 24), dark);
      ring.position.z = -1.7;
      eng.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), glow('#ff8ab0', 0.95));
      disc.position.z = -1.72;
      disc.rotation.y = Math.PI;
      eng.add(disc);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.36, 1, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          uniforms: { uTime: skyU.uTime, uK: { value: 0.5 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform float uTime, uK; varying vec2 vUv;
            void main() {
              float f = vUv.y;
              float fl = 0.75 + 0.25 * sin(uTime * 40.0 + vUv.x * 30.0);
              float a = pow(f, 1.6) * fl * (0.4 + uK * 0.6);
              vec3 c = mix(vec3(1.0, 0.35, 0.6), vec3(1.0, 0.85, 0.8), pow(f, 4.0));
              gl_FragColor = vec4(c * a, a);
            }`,
        }),
      );
      flame.position.z = -1.72;
      eng.add(flame);
      ship.flames.push(flame);
      // tail fins
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.5), hull);
      fin.position.set(side * 0.75, 0.95, -4.0);
      fin.rotation.z = side * -0.3;
      fin.rotation.x = 0.3;
      body.add(fin);
      const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 1.5), accent);
      finTip.position.set(side * 0.95, 1.55, -4.2);
      finTip.rotation.z = side * -0.3;
      finTip.rotation.x = 0.3;
      body.add(finTip);
    });
    // the turret: a ring, a glass dome, two barrels, and a little grapple launcher
    const tb = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.32, 24), accent);
    tb.position.copy(TURRET).add(V3(0, -0.12, 0));
    body.add(tb);
    const tur = new THREE.Group();
    tur.position.copy(TURRET);
    body.add(tur);
    ship.turret = tur;
    const dm = new THREE.Mesh(new THREE.SphereGeometry(1.0, 22, 12, 0, TAU, 0, Math.PI / 2), glass);
    dm.scale.set(1, 1.15, 1);
    dm.renderOrder = 3;
    tur.add(dm);
    const gun = new THREE.Group();
    gun.position.set(0, 0.55, 0.3);
    tur.add(gun);
    ship.gun = gun;
    [-1, 1].forEach((side) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 2.0, 10).rotateX(Math.PI / 2), dark);
      b.position.set(side * 0.42, 0, 1.25);
      gun.add(b);
      const mz = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), accent);
      mz.position.set(side * 0.42, 0, 2.25);
      gun.add(mz);
    });
    const hook = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 8).rotateX(Math.PI / 2), accent);
    hook.position.set(0, 0.28, 1.3);
    gun.add(hook);
    ship.hook = hook;
    // landing gear
    [
      [0, -0.95, 3.0],
      [1.6, -0.95, -1.8],
      [-1.6, -0.95, -1.8],
    ].forEach(([x, y, z]) => {
      const leg = new THREE.Group();
      leg.position.set(x, y + 0.6, z);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), dark);
      st.position.y = -0.4;
      leg.add(st);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 14), accent);
      foot.position.y = -0.92;
      leg.add(foot);
      body.add(leg);
      ship.gear.push(leg);
    });
    // fire slots on the hull (shown by the level when burning)
    SHIP_FIRES.forEach((p) => {
      const f = new THREE.Group();
      f.position.copy(p);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ff7a30'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      core.scale.setScalar(1.6);
      f.add(core);
      const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#2a1e26'), transparent: true, opacity: 0.6, depthWrite: false }));
      smoke.scale.setScalar(2.4);
      smoke.position.y = 0.6;
      f.add(smoke);
      f.visible = false;
      body.add(f);
      ship.fires.push({ g: f, core, smoke });
    });
    ship.light = new THREE.PointLight('#ff8ab0', 1.4, 16, 2);
    ship.light.position.set(0, 0.2, -4.6);
    body.add(ship.light);
    ship.g.rotation.order = 'YXZ';
  };

  // trails behind the wingtips and the engines (ribbons, world space)
  const trails = [];
  const makeTrail = (n, width, col, alpha) => {
    const pos = new Float32Array(n * 2 * 3);
    const a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) a[i * 2] = a[i * 2 + 1] = 1 - i / (n - 1);
    const idx = [];
    for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aK', new THREE.BufferAttribute(a, 1));
    g.setIndex(idx);
    const m = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uC: { value: new THREE.Color(col) }, uA: { value: alpha } },
        vertexShader: `attribute float aK; varying float vK; void main(){ vK = aK; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uC; uniform float uA; varying float vK; void main(){ float a = pow(vK, 1.5) * uA; gl_FragColor = vec4(uC * a, a); }`,
      }),
    );
    m.frustumCulled = false;
    group.add(m);
    const tr = { m, n, width, pts: [], ups: [], on: true };
    trails.push(tr);
    return tr;
  };
  const tv = V3();
  const tu = V3();
  const pushTrail = (tr, p, up, w) => {
    if (tr.pts.length >= tr.n) {
      tr.pts.pop();
      tr.ups.pop();
    }
    tr.pts.unshift(p.clone());
    tr.ups.unshift(up.clone().multiplyScalar(w));
    const a = tr.m.geometry.attributes.position.array;
    for (let i = 0; i < tr.n; i++) {
      const q = tr.pts[Math.min(i, tr.pts.length - 1)];
      const u = tr.ups[Math.min(i, tr.ups.length - 1)];
      const k = 1 - i / tr.n;
      a[i * 6] = q.x + u.x * k;
      a[i * 6 + 1] = q.y + u.y * k;
      a[i * 6 + 2] = q.z + u.z * k;
      a[i * 6 + 3] = q.x - u.x * k;
      a[i * 6 + 4] = q.y - u.y * k;
      a[i * 6 + 5] = q.z - u.z * k;
    }
    tr.m.geometry.attributes.position.needsUpdate = true;
  };
  const resetTrails = () => trails.forEach((tr) => ((tr.pts.length = 0), (tr.ups.length = 0)));

  // ---------- Veilleur drones, bolts, mines, lasers ----------
  const drones = [];
  const buildDrones = () => {
    const bodyG = new THREE.SphereGeometry(1, 20, 14);
    const bandG = new THREE.TorusGeometry(1.0, 0.16, 8, 28);
    const haloG = new THREE.TorusGeometry(1.7, 0.05, 6, 40);
    const finG = new THREE.ConeGeometry(0.25, 1.3, 6);
    const eyeG = new THREE.SphereGeometry(0.34, 14, 10);
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(bodyG, porcelain);
      g.add(b);
      const band = new THREE.Mesh(bandG, dark);
      band.rotation.y = Math.PI / 2;
      band.scale.set(1, 1, 1);
      g.add(band);
      const eye = new THREE.Mesh(eyeG, glow('#ff3a5a', 1.4));
      eye.position.z = 0.92;
      g.add(eye);
      const halo = new THREE.Mesh(haloG, glow('#ffd6e0', 0.55));
      halo.rotation.x = Math.PI / 2;
      g.add(halo);
      for (let k = 0; k < 3; k++) {
        const f = new THREE.Mesh(finG, porcelain);
        const a = (k / 3) * TAU;
        f.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, -0.6);
        f.rotation.z = a - Math.PI / 2;
        f.rotation.x = -0.5;
        g.add(f);
      }
      g.scale.setScalar(1.25);
      g.visible = false;
      group.add(g);
      drones.push({ g, eye, halo, flash: 0 });
    }
  };
  const bolts = [];
  const buildBolts = () => {
    const sg = new THREE.SphereGeometry(0.7, 12, 10);
    for (let i = 0; i < 32; i++) {
      const g = new THREE.Group();
      const c = new THREE.Mesh(sg, glow('#ff4a6a', 1.6));
      g.add(c);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ff3a5a'), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      h.scale.setScalar(5);
      g.add(h);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.6, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5), addGlow('#ff5a7a', 0.45));
      tail.scale.z = 7;
      g.add(tail);
      g.visible = false;
      group.add(g);
      bolts.push({ g });
    }
  };
  const mines = [];
  const buildMines = () => {
    const ig = new THREE.IcosahedronGeometry(1.5, 0);
    const spike = new THREE.ConeGeometry(0.28, 1.5, 6).translate(0, 1.7, 0);
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(ig, dark));
      const dirs = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
      dirs.forEach((d) => {
        const s = new THREE.Mesh(spike, porcelain);
        s.quaternion.setFromUnitVectors(V3(0, 1, 0), d);
        g.add(s);
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), glow('#ff3a5a', 1.3));
      g.add(core);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ff3a5a'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      h.scale.setScalar(7);
      g.add(h);
      g.visible = false;
      group.add(g);
      mines.push({ g, core, h });
    }
  };
  const lasers = [];
  const laserMat = () =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: { uTime: skyU.uTime, uOn: { value: 0 }, uWarn: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime, uOn, uWarn; varying vec2 vUv;
        void main() {
          float lines = 0.5 + 0.5 * sin((vUv.x + vUv.y) * 90.0 - uTime * 14.0);
          float edge = max(smoothstep(0.06, 0.0, min(vUv.x, 1.0 - vUv.x)), smoothstep(0.06, 0.0, min(vUv.y, 1.0 - vUv.y)));
          float warn = uWarn * (0.05 + 0.2 * step(0.5, fract(uTime * 4.0)) + edge * 0.6);
          float on = uOn * (0.35 + lines * 0.35 + edge * 0.6);
          float a = clamp(warn + on, 0.0, 1.0);
          vec3 c = mix(vec3(1.0, 0.25, 0.35), vec3(1.0, 0.8, 0.85), uOn * lines * 0.5);
          gl_FragColor = vec4(c * a, a);
        }`,
    });
  const buildLasers = () => {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), laserMat());
      m.visible = false;
      group.add(m);
      lasers.push({ m });
    }
  };

  // ---------- the mothership ----------
  const mom = { g: null, cores: [], eye: null, iris: null, hurt: 0, k: 0 };
  const CORES = [V3(-10, -8.5, -14), V3(10, -8.5, -14), V3(-6.5, -10.5, 7), V3(6.5, -10.5, 7)];
  const buildMom = () => {
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    group.add(g);
    mom.g = g;
    const top = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), veil);
    top.scale.set(17, 6.5, 34);
    g.add(top);
    const bm = Tex.mat('plaster', { color: '#8f6a86', scale: 2, rough: 0.6, emissive: '#5a2448', emissiveIntensity: 0.55 });
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), bm);
    belly.scale.set(15.5, 5.2, 31);
    belly.position.y = -2.4;
    g.add(belly);
    // running lights along the belly (they show its shape against the sky)
    const dotG = new THREE.SphereGeometry(0.32, 8, 6);
    const dotM = glow('#ff8fb0', 0.85);
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * TAU;
      const d = new THREE.Mesh(dotG, dotM);
      d.position.set(Math.cos(a) * 14.2, -4.4, Math.sin(a) * 28.4);
      g.add(d);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), glow('#ff5a7a', 0.7));
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(17.2, 34.4, 1);
    rim.position.y = -0.6;
    g.add(rim);
    // ribs on the back
    for (let k = -3; k <= 3; k++) {
      const rb = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40, Math.PI), dark);
      rb.scale.set(16.4, 6.4, 1);
      rb.position.z = k * 7.5;
      rb.scale.x *= Math.sqrt(1 - (k / 4.6) ** 2);
      rb.scale.y *= Math.sqrt(1 - (k / 4.6) ** 2);
      g.add(rb);
    }
    // the eye
    const eye = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 20), porcelain);
    eye.position.set(0, -1.5, 30.5);
    g.add(eye);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), glow('#ff3a5a', 1.2));
    iris.position.set(0, -1.5, 35.55);
    g.add(iris);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color: '#0a0408' }));
    pupil.position.set(0, -1.5, 35.6);
    g.add(pupil);
    mom.eye = eye;
    mom.iris = iris;
    // engines at the back
    [-7, 0, 7].forEach((x) => {
      const e = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), glow('#ff6f9a', 0.8));
      e.position.set(x, -1, -33.8);
      e.rotation.y = Math.PI;
      g.add(e);
    });
    // the four cores on pylons under the belly
    CORES.forEach((p) => {
      const c = new THREE.Group();
      c.position.copy(p);
      const py = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 6, 10), dark);
      py.position.y = 3;
      c.add(py);
      const core = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 14), glow('#ff9cc4', 0.8));
      c.add(core);
      const cage1 = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.14, 8, 32), dark);
      c.add(cage1);
      const cage2 = cage1.clone();
      cage2.rotation.y = Math.PI / 2;
      c.add(cage2);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ff8fc0'), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      halo.scale.setScalar(12);
      c.add(halo);
      const stub = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), glow('#ff7a30', 1.2));
      stub.visible = false;
      c.add(stub);
      // the shield: a faceted shell the turret has to break before the grapple can bite
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(3.1, 1), addGlow('#ff5a7a', 0.16));
      c.add(shell);
      const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(3.15, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8fb0'), wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      c.add(wire);
      g.add(c);
      mom.cores.push({ g: c, core, cage1, cage2, halo, stub, shell, wire, flash: 0, open: 0, off: false });
    });
    // kept in the world group (always counted) so lighting never recompiles when it appears
    mom.light = new THREE.PointLight('#ff6f9a', 0, 90, 1.6);
    group.add(mom.light);
    g.visible = false;
  };

  // ---------- turret tracers, grapple cable, flares, explosions, lightning ----------
  const tracers = [];
  const buildTracers = () => {
    const tg = new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(tg, addGlow('#ffd0e0', 0.9));
      m.visible = false;
      group.add(m);
      tracers.push({ m, t: 0 });
    }
  };
  let tri = 0;
  const tracer = (a, b) => {
    const tr = tracers[tri++ % tracers.length];
    tr.m.position.copy(a);
    tr.m.lookAt(b);
    tr.m.scale.set(1, 1, a.distanceTo(b));
    tr.t = 0.09;
    tr.m.visible = true;
  };
  let cable = null;
  const buildCable = () => {
    cable = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), glow('#ffc8dc', 1.1));
    cable.visible = false;
    group.add(cable);
  };
  const setCable = (a, b) => {
    cable.visible = !!a;
    if (!a) return;
    cable.position.copy(a);
    cable.lookAt(b);
    cable.scale.set(1, 1, a.distanceTo(b));
  };
  const flares = [];
  const buildFlares = () => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ffb0e0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.visible = false;
      group.add(s);
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color('#ff6fa8'), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      ring.visible = false;
      group.add(ring);
      flares.push({ s, ring, t: 0 });
    }
  };
  let fli = 0;
  const flare = (p) => {
    const f = flares[fli++ % flares.length];
    f.s.position.copy(p);
    f.ring.position.copy(p);
    f.t = 5;
    f.s.visible = f.ring.visible = true;
  };
  const booms = [];
  const fireTex = LvKit.tex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,250,235,1)');
    grd.addColorStop(0.25, 'rgba(255,190,140,0.9)');
    grd.addColorStop(0.55, 'rgba(255,90,110,0.45)');
    grd.addColorStop(1, 'rgba(120,20,60,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  fireTex.wrapS = fireTex.wrapT = THREE.ClampToEdgeWrapping;
  const buildBooms = () => {
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.visible = false;
      group.add(s);
      booms.push({ s, t: 1, size: 1 });
    }
  };
  let bi = 0;
  const boom = (p, size = 6) => {
    const b = booms[bi++ % booms.length];
    b.s.position.copy(p);
    b.t = 0;
    b.size = size;
    b.s.visible = true;
  };
  const bolt3 = [];
  const buildLightning = () => {
    for (let i = 0; i < 4; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0), addGlow('#c8b8ff', 0.08));
      col.visible = false;
      group.add(col);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), addGlow('#d8c8ff', 0.4));
      ring.visible = false;
      group.add(ring);
      bolt3.push({ col, ring, line: null, t: 0 });
    }
  };
  // boulders torn from the closing rift (the escape after the mothership)
  const debris = [];
  const buildDebris = () => {
    const mat = Tex.mat('rock', { color: '#b98088', scale: 3, rough: 0.95, bump: 1.2 });
    const g = new THREE.DodecahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n = 1 + (hash(Math.round(x * 9) + 31, Math.round(y * 9 + z * 13)) - 0.5) * 0.4;
      p.setXYZ(i, x * n, y * n * 0.85, z * n);
    }
    g.computeVertexNormals();
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(g, mat);
      m.scale.setScalar(4.2);
      m.visible = false;
      group.add(m);
      const trail = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.4, 1, 10, 1, true).translate(0, 0.5, 0), addGlow('#ffb08a', 0.16));
      trail.visible = false;
      group.add(trail);
      debris.push({ m, trail });
    }
  };
  const strikeMesh = (b, base, top) => {
    if (b.line) {
      group.remove(b.line);
      b.line.geometry.dispose();
    }
    const pts = [];
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const p = top.clone().lerp(base, t);
      if (k > 0 && k < n) {
        p.x += (Math.random() - 0.5) * 9;
        p.z += (Math.random() - 0.5) * 9;
      }
      pts.push(p);
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 64, 0.45, 5, false);
    b.line = new THREE.Mesh(geo, glow('#e8e0ff', 2.2));
    group.add(b.line);
  };

  // ---------- the landing shelf and the heart platform ----------
  const pad = { boxes: [], moor: [], chains: [], screen: null };
  const PAD = { s0: 16, s1: 60, hw: 15 };
  const plat = { g: null, boxes: [], ring: null, lights: [], card: null, beacon: null };
  const buildPad = () => {
    // the shelf runs along +x at the start (the track is straight here)
    const f = at(PAD_S);
    const cx = (PAD.s0 + PAD.s1) / 2;
    const c0 = at(cx);
    const len = PAD.s1 - PAD.s0;
    const sl = K.solid(c0.x, PAD_Y - 2, c0.z, len, 4, PAD.hw * 2, stone);
    pad.boxes.push(sl.b);
    // the rock pillar it stands on, down into the clouds
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(PAD.hw * 1.15, PAD.hw * 0.5, PAD_Y + 10, 14, 6), islandRock);
    pil.position.copy(P(c0.x, (PAD_Y - 4) / 2 - 5, c0.z));
    pil.scale.set(len / (PAD.hw * 2), 1, 1);
    group.add(pil);
    // railings
    const rail = (x, z, sx, sz) => {
      const r = K.solid(x, PAD_Y + 0.55, z, sx, 1.1, sz, marble);
      pad.boxes.push(r.b);
    };
    rail(c0.x, c0.z - PAD.hw + 0.25, len, 0.5);
    rail(c0.x, c0.z + PAD.hw - 0.25, len, 0.5);
    rail(c0.x - len / 2 + 0.25, c0.z, 0.5, PAD.hw * 2);
    // the front edge: two short rails, the middle open toward the canyon
    rail(c0.x + len / 2 - 0.25, c0.z - PAD.hw + 4, 0.5, 8);
    rail(c0.x + len / 2 - 0.25, c0.z + PAD.hw - 4, 0.5, 8);
    // landing marks: a heart painted on the shelf
    const hm = new THREE.Mesh(heartGeo(5, 0), addGlow('#ff6f9a', 0.32));
    hm.rotation.x = -Math.PI / 2;
    hm.rotation.z = Math.PI / 2;
    hm.position.copy(P(f.x, PAD_Y + 0.03, f.z));
    group.add(hm);
    // the ruin arch at the back, with its heart keystone, and lanterns
    const ax = c0.x - len / 2 + 5;
    [-1, 1].forEach((side) => {
      const col = K.solid(ax, PAD_Y + 4, c0.z + side * 6, 1.4, 8, 1.4, marble);
      pad.boxes.push(col.b);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), glow('#ffcf9a', 1.2));
      lamp.position.copy(P(c0.x + 6, PAD_Y + 1.6, c0.z + side * (PAD.hw - 0.6)));
      group.add(lamp);
      const lamp2 = lamp.clone();
      lamp2.position.x += 16;
      group.add(lamp2);
    });
    const lin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 14), marble);
    lin.position.copy(P(ax, PAD_Y + 8.6, c0.z));
    group.add(lin);
    const key = new THREE.Mesh(heartGeo(0.9, 0.3), glow('#ff6f9a', 0.8));
    key.geometry.center();
    key.rotation.y = Math.PI / 2;
    key.position.copy(P(ax + 0.9, PAD_Y + 8.6, c0.z));
    group.add(key);
    // moorings: rings on the shelf (the clamps on the ship are drawn with the ship)
    [-1, 1].forEach((side) => {
      const p = P(f.x - 0.5, PAD_Y + 0.25, f.z + side * 7.6);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 8, 20), dark);
      ring.position.copy(p);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.9, 10), accent);
      post.position.copy(p).add(V3(0, 0.2, 0));
      group.add(post);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5), glow('#ffd2a8', 0.55));
      group.add(chain);
      pad.moor.push({ p, ring, post, chain, side });
    });
    pad.screen = makeScreen(10, 4, 1024);
    pad.screen.mesh.position.copy(P(ax + 0.95, PAD_Y + 4.4, c0.z));
    pad.screen.mesh.rotation.y = Math.PI / 2;
    group.add(pad.screen.mesh);
  };
  const HEART_S = 14;
  const heartPoly = heartShape(HEART_S).getPoints(40);
  const inPoly = (x, y) => {
    let ins = false;
    for (let i = 0, j = heartPoly.length - 1; i < heartPoly.length; j = i++) {
      const a = heartPoly[i];
      const b = heartPoly[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
    }
    return ins;
  };
  // world point -> heart shape coords (the heart's tip points back down the canyon, to -x)
  const heartLocal = (wx, wz) => {
    const c = at(END_S);
    const dx = wx - (O.x + c.x);
    const dz = wz - (O.z + c.z);
    // shape (x, y) -> after rotations: world dx = -sy... tip (0,-0.9s) at -x
    return { x: dz, y: dx };
  };
  const onHeart = (wx, wz, margin = 0) => {
    const h = heartLocal(wx, wz);
    if (!inPoly(h.x, h.y)) return false;
    if (margin <= 0) return true;
    return [
      [margin, 0],
      [-margin, 0],
      [0, margin],
      [0, -margin],
    ].every(([a, b]) => inPoly(h.x + a, h.y + b));
  };
  const buildPlatform = () => {
    const c = at(END_S);
    const g = new THREE.Group();
    g.position.copy(P(c.x, PLAT_Y, c.z));
    group.add(g);
    plat.g = g;
    const hm = new THREE.Mesh(heartGeo(HEART_S, 2.2), marble);
    // shape (x, y, extrude z) -> (x: shape x, y: up, z: -shape y), then turned so the tip faces -x
    hm.rotation.x = -Math.PI / 2;
    hm.position.y = -2.2 - 0.55;
    const hg = new THREE.Group();
    hg.rotation.y = -Math.PI / 2;
    hg.add(hm);
    g.add(hg);
    // glowing rim and a soft inner heart
    const pts = heartShape(HEART_S + 0.2)
      .getPoints(80)
      .map((p) => V3(p.x, 0.12, -p.y));
    const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.28, 6, true), glow('#ff6f9a', 1.0));
    hg.add(rim);
    plat.ring = rim;
    const inner = new THREE.Mesh(heartGeo(HEART_S * 0.55, 0), addGlow('#ff8fb0', 0.12));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.06;
    hg.add(inner);
    plat.inner = inner;
    // landing lights around the heart
    heartShape(HEART_S - 1.2)
      .getPoints(24)
      .forEach((p, i) => {
        if (i === 24) return;
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glow('#ffd2a8', 1.2));
        l.position.set(p.x, 0.25, -p.y);
        hg.add(l);
        plat.lights.push(l);
      });
    // the floating rock under it
    const under = new THREE.Mesh(new THREE.ConeGeometry(HEART_S * 1.05, 34, 12, 4).rotateX(Math.PI), islandRock);
    under.position.y = -2.8 - 17;
    g.add(under);
    // colliders: rows of boxes along the heart, sampled from its outline
    for (let y = -HEART_S * 0.9; y < HEART_S * 0.9; y += 1) {
      let x0 = 1e9;
      let x1 = -1e9;
      for (let x = -HEART_S; x <= HEART_S; x += 0.25)
        if (inPoly(x, y + 0.5)) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
        }
      if (x1 < x0) continue;
      // shape (x, y) -> world dz = x, dx = y
      const b = K.collider(c.x + y + 0.5, PLAT_Y - 1.5, c.z + (x0 + x1) / 2, 1, 3, x1 - x0 + 0.3);
      b.on = false;
      plat.boxes.push(b);
    }
    // the card, hidden until the landing
    const card = LvKit.trialCard('c7', false);
    card.scale.setScalar(1.6);
    g.add(card);
    plat.card = card;
    plat.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 60, 16, 1, true).translate(0, 30, 0), addGlow('#ff8fb0', 0.12));
    g.add(plat.beacon);
  };

  // ---------- lights ----------
  let flashLight = null;
  const buildLights = () => {
    flashLight = new THREE.PointLight('#d8d0ff', 0, 400, 1.2);
    group.add(flashLight);
  };

  // ---------- build / wake / sleep ----------
  const build = () => {
    if (built) return;
    built = true;
    buildWalls();
    buildSky();
    buildIslands();
    buildArches();
    buildRockfalls();
    buildSpires();
    buildGates();
    buildDams();
    buildHearts();
    buildShip();
    buildDrones();
    buildBolts();
    buildMines();
    buildLasers();
    buildMom();
    buildTracers();
    buildCable();
    buildFlares();
    buildBooms();
    buildLightning();
    buildDebris();
    buildPad();
    buildPlatform();
    buildLights();
    makeTrail(56, 0.18, '#ffe4ec', 0.55);
    makeTrail(56, 0.18, '#ffe4ec', 0.55);
    makeTrail(30, 0.5, '#ff7aa8', 0.5);
    makeTrail(30, 0.5, '#ff7aa8', 0.5);
    sleep();
  };
  const wake = () => {
    group.visible = true;
    pad.boxes.forEach((b) => (b.on = true));
  };
  const sleep = () => {
    group.visible = false;
    pad.boxes.forEach((b) => (b.on = false));
    plat.boxes.forEach((b) => (b.on = false));
  };

  // ---------- per-frame visuals ----------
  const tmp = V3();
  const tmp2 = V3();
  const qv = new THREE.Quaternion();
  /** pose the skiff: world position, yaw, pitch (+ nose up), roll (+ banks left) */
  const setShip = (p, yaw, pitch, roll) => {
    ship.g.position.copy(p);
    ship.g.rotation.set(-pitch, yaw, -roll);
    ship.g.updateMatrixWorld(true);
  };
  const shipPoint = (local, out = V3()) => out.copy(local).applyMatrix4(ship.g.matrixWorld);
  const shipUp = (out = V3()) => out.set(0, 1, 0).applyQuaternion(ship.g.getWorldQuaternion(qv));
  const update = (dt, t, v) => {
    if (!built) return;
    skyU.uTime.value = t;
    const cam = R.camera.position;
    dome.position.copy(cam);
    seaU.uCam.value.copy(cam);
    dust.material.uniforms.uCam.value.copy(cam);
    dust.material.uniforms.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    rain.material.uniforms.uCam.value.copy(cam);
    rain.visible = skyU.uStorm.value > 0.02;
    rain.material.uniforms.uK.value = skyU.uStorm.value;
    if (v.vel) rain.material.uniforms.uVel.value.copy(v.vel).multiplyScalar(-1);
    updateIslands(t);
    // arches (navigator only), passed ones fade to gold
    navOnly.visible = !!v.navView;
    arches.forEach((a) => {
      const got = v.archGot && v.archGot[a.i];
      a.got = damp(a.got, got ? 1 : 0, 3, dt);
      a.ring.material.color.set(got ? '#ffd27a' : '#ff7aa8').multiplyScalar(got ? 0.6 : 1.0 + 0.25 * Math.sin(t * 4 + a.i));
      a.inner.material.opacity = (1 - a.got) * (0.06 + 0.03 * Math.sin(t * 3 + a.i));
      a.key.rotation.y = t * 1.2;
      a.cs.forEach((c, k) => (c.material.opacity = (1 - a.got) * (0.35 + 0.3 * Math.sin(t * 5 - k * 1.4))));
      a.g.visible = v.stage <= 1;
    });
    // gates glow when they are the next checkpoint
    gates.forEach((g) => {
      g.cur.material.opacity = 0.03 + (v.cpNext === g.k ? 0.04 + 0.03 * Math.sin(t * 3) : 0);
    });
    // dams
    dams.forEach((d, i) => {
      const on = i === 0 ? v.dam0 : v.dam1;
      d.k = damp(d.k, on ? 1 : 0, 2.5, dt);
      d.m.visible = d.k > 0.02;
      d.m.material.uniforms.uK.value = d.k * (0.8 + 0.2 * Math.sin(t * 7));
    });
    // repair hearts
    hearts.forEach((h) => {
      h.got = !!(v.heartGot && v.heartGot[h.i]);
      h.g.visible = !h.got && v.stage >= 3 && v.stage <= 4;
      if (!h.g.visible) return;
      h.m.rotation.y = t * 1.6 + h.i;
      h.g.position.y = O.y + HEARTS[h.i].y + Math.sin(t * 2 + h.i) * 0.6;
      h.halo.material.opacity = 0.35 + 0.15 * Math.sin(t * 4 + h.i);
    });
    // tracers, flares, booms
    tracers.forEach((tr) => {
      if (tr.t <= 0) return;
      tr.t -= dt;
      tr.m.visible = tr.t > 0;
      tr.m.material.opacity = Math.max(0, tr.t / 0.09) * 0.9;
    });
    flares.forEach((f) => {
      if (f.t <= 0) return;
      f.t -= dt;
      const k = clamp(f.t / 5, 0, 1);
      f.s.scale.setScalar(6 + Math.sin(t * 10) * 0.8);
      f.s.material.opacity = Math.min(1, f.t) * 0.95;
      f.ring.scale.setScalar(10 + (1 - (f.t % 1)) * 16);
      f.ring.material.opacity = (f.t % 1) * 0.35 * k;
      f.s.visible = f.ring.visible = f.t > 0;
    });
    booms.forEach((b) => {
      if (b.t >= 1) return;
      b.t = Math.min(1, b.t + dt * 1.4);
      b.s.visible = b.t < 1;
      b.s.scale.setScalar(b.size * (0.4 + b.t * 1.8));
      b.s.material.opacity = (1 - b.t) * (1 - b.t);
      b.s.material.rotation = b.t * 0.6;
    });
    bolt3.forEach((b) => {
      if (b.t > 0) {
        b.t -= dt;
        if (b.line) {
          b.line.visible = b.t > 0;
          b.line.material.color.set('#e8e0ff').multiplyScalar(2.2 * Math.max(0, b.t / 0.35));
        }
      } else if (b.line) b.line.visible = false;
    });
    flashLight.intensity = damp(flashLight.intensity, 0, 9, dt);
    skyU.uFlash.value = damp(skyU.uFlash.value, 0, 6, dt);
    // platform
    if (plat.g) {
      plat.ring.material.color.set('#ff6f9a').multiplyScalar(0.8 + 0.3 * Math.sin(t * 2.4));
      plat.lights.forEach((l, i) => l.material.color.set('#ffd2a8').multiplyScalar(((t * 8 - i) % 24 + 24) % 24 < 3 ? 1.6 : 0.45));
      plat.inner.material.opacity = v.stage >= 5 ? 0.22 + 0.1 * Math.sin(t * 3) : 0.08;
      plat.beacon.visible = v.stage >= 5 && v.stage < 6;
      plat.beacon.material.opacity = 0.08 + 0.05 * Math.sin(t * 2);
      plat.card.visible = v.stage >= 6;
      if (plat.card.visible) {
        plat.card.rotation.y = t * 0.8;
        plat.card.position.y = 2.4 + Math.min(1, v.cardK || 0) * 1.6 + Math.sin(t * 2) * 0.12;
      }
    }
    pad.screen && pad.screen.update(dt, t);
  };

  return {
    O,
    P,
    get built() {
      return built;
    },
    build,
    wake,
    sleep,
    update,
    group,
    // track
    LEN,
    END_S,
    PAD_S,
    PAD_Y,
    PLAT_Y,
    SEC,
    passS,
    RIFT_S,
    BAR_S,
    BOSS_BAR_S,
    FLOOR,
    at,
    world,
    yawAt,
    locate,
    face,
    closeK,
    ceilAt,
    rockOff,
    CURV,
    DS,
    NS,
    X,
    Z,
    W,
    ARCHES,
    ROCKFALLS,
    SPIRES,
    HEARTS,
    GATES,
    // visuals
    ship,
    setShip,
    shipPoint,
    shipUp,
    SEAT,
    TURRET,
    SHIP_FIRES,
    trails,
    pushTrail,
    resetTrails,
    drones,
    bolts,
    mines,
    lasers,
    mom,
    CORES,
    tracer,
    setCable,
    flare,
    boom,
    bolt3,
    strikeMesh,
    debris,
    skyU,
    seaU,
    riftU,
    pad,
    PAD,
    plat,
    onHeart,
    heartLocal,
    HEART_S,
    get flashLight() {
      return flashLight;
    },
    get dome() {
      return dome;
    },
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
  };
})();
