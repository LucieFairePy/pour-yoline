// ♠ 9 · Le Sol de lave. A volcano, three parts along +z:
//  1. Les champs de lave: a basalt canyon flooded with lava. The frost kit freezes lava into
//     floating crust discs (and plugs geysers), the grapple kit reaches the high lever. Sinking
//     columns, crumbling bridge, a lava tide that swells on a shared clock.
//  2. La rivière de forge: an obsidian raft rides a lava river between cliffs; both steer by
//     standing left or right; salamanders leap from the lava.
//  3. La caldeira: the Lava Titan rises from the pool; floor tiles sink in patterns.
// Only geometry, visuals and pure timing helpers here; Enemies/Combat live in the level file.
const TrS6 = (() => {
  const O = V3(-700, 0, 8400);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- layout (relative to O) ----------
  const TOP = 2; // basalt platform tops in the lava fields
  const MESAS = {
    start: [0, -3.5, 18, 17],
    b: [0, 25, 14, 10],
    c: [0, 86, 22, 12],
    d: [0, 134, 18, 12],
  };
  // geyser vents (part 1B, one in 1C) and the sinking basalt columns around them
  const GEYSERS = [
    { x: -2.2, z: 39.5, per: 7.2, off: 0 },
    { x: 4.4, z: 49.4, per: 6.4, off: 2.3 },
    { x: -4.6, z: 58.3, per: 7.8, off: 4.1 },
    { x: 2.1, z: 67.2, per: 6.8, off: 1.2 },
    { x: -1.0, z: 74.6, per: 7.4, off: 5.0 },
    // part 1C: one on the islet route
    { x: 13.4, z: 100.5, per: 6.0, off: 3.0 },
  ];
  const COLS = [];
  {
    const r = rng(606);
    let row = 0;
    for (let z = 33.6; z < 78; z += 3.55, row++) {
      const n = row % 2 ? 4 : 3;
      for (let k = 0; k < n; k++) {
        const x = (k - (n - 1) / 2) * 4.3 + (r() - 0.5) * 0.9;
        const cz = z + (r() - 0.5) * 0.6;
        const top = 1.5 + r() * 1.1;
        const cr = 1.05 + r() * 0.2;
        // a vent takes the place of the column it would touch
        if (GEYSERS.some((g) => Math.hypot(g.x - x, g.z - cz) < 3.1)) continue;
        COLS.push({ x, z: cz, top, r: cr });
      }
    }
  }
  const G_R = 1.7;
  const G_H = 9;
  // part 1C: lever A on the high pillar (grapple), lever B on the islet (frost route)
  const PILLAR = { x: -15, z: 107, top: 9, s: 3.6 };
  const ISLET = { x: 15, z: 111, top: TOP, s: 4.6 };
  const LEVERS = { a: V3(-15, 9, 106.4), b: V3(15, TOP, 111.6) };
  const STONES = [
    [9.5, 95.6],
    [13.6, 105.2],
    [10.2, 115.6],
    [5.6, 118.4],
  ];
  const STONE_TOP = 0.8;
  const RINGS_G = [
    { p: [-13.5, 13.4, 101.5], land: [-15, PILLAR.top, 107.6] },
    { p: [-4.5, 9.4, 124], land: [-2, TOP, 131] },
  ];
  const BRIDGE = { z0: 92, z1: 128, n: 12, w: 2.6 };
  const GATE_Z = 140.8;
  // part 2: the river
  const RIVER = { z0: 170.5, z1: 584, hw: 7.5 };
  const cx = (z) => (z <= RIVER.z0 || z >= RIVER.z1 ? 0 : 6 * Math.sin((3 * Math.PI * (z - RIVER.z0)) / (RIVER.z1 - RIVER.z0)));
  const RAFT = { hx: 2.4, hz: 3.2, top: 0.7, z0: 174, z1: 580.4, umax: 4.2 };
  // rock pillars in the stream: [z, u, radius]; lava falls: [z, side, length]
  const ROCKS = [
    [214, -3.6, 1.8],
    [246, 3.4, 2.0],
    [262, -2.2, 1.5],
    [300, 0, 1.4],
    [338, 3.8, 1.9],
    [352, -3.9, 1.7],
    [404, -1.2, 2.0],
    [430, 3.0, 1.6],
    [466, -4.0, 1.5],
    [470, 4.1, 1.4],
    [512, 0.4, 1.4],
    [546, -3.6, 1.8],
  ];
  const FALLS = [
    { z: 230, side: 1, len: 7, per: 7, off: 0 },
    { z: 318, side: -1, len: 8, per: 6.5, off: 2 },
    { z: 386, side: 1, len: 8, per: 7.5, off: 1 },
    { z: 448, side: -1, len: 9, per: 6, off: 3.5 },
    { z: 528, side: 1, len: 8, per: 6.8, off: 0.5 },
  ];
  const FALL_ON = 3.6;
  // part 3: the caldera
  const CAL = V3(0, 0, 626);
  const TILE = 4;
  const TILE_TOP = 0.8;
  const POOL_R = 8;
  const WALL_R = 25.5;

  // ---------- shared timing (pure functions of the host clock) ----------
  const TIDE_P = 20;
  const TIDE_H = 1.25;
  const tideAt = (clk) => {
    const p = ((clk % TIDE_P) + TIDE_P) % TIDE_P;
    if (p < 1.5) return TIDE_H * (1 - p / 1.5);
    if (p < 16.5) return 0;
    if (p < 17.5) return TIDE_H * (p - 16.5);
    return TIDE_H;
  };
  const tideWarn = (clk) => {
    const p = ((clk % TIDE_P) + TIDE_P) % TIDE_P;
    return p >= 13.8 && p < 16.5;
  };
  const geyserState = (i, clk, frozenAt) => {
    if (frozenAt != null && clk - frozenAt < 10 && clk >= frozenAt) return 'frozen';
    const g = GEYSERS[i];
    const p = (((clk + g.off) % g.per) + g.per) % g.per;
    if (p < 1.4) return 'erupt';
    if (p >= g.per - 1.9) return 'warn';
    return 'idle';
  };
  const eruptK = (i, clk) => {
    const g = GEYSERS[i];
    const p = (((clk + g.off) % g.per) + g.per) % g.per;
    return p < 1.4 ? Math.sin((p / 1.4) * Math.PI) : 0;
  };
  // a sinking column: shakes, sinks under the lava, comes back
  const colDrop = (d) => {
    if (d == null || d < 0) return 0;
    if (d < 0.5) return 0;
    if (d < 2.7) return (-(d - 0.5) / 2.2) * 4.6;
    if (d < 6.2) return -4.6;
    if (d < 7.8) return -4.6 * (1 - (d - 6.2) / 1.6);
    return 0;
  };
  const COL_LIFE = 7.8;
  const crumbDrop = (d) => {
    if (d == null || d < 0) return 0;
    if (d < 0.6) return 0;
    if (d < 1.3) return -((d - 0.6) / 0.7) * 4.5;
    if (d < 7) return -4.5;
    if (d < 8) return -4.5 * (1 - (d - 7));
    return 0;
  };
  const CRUMB_LIFE = 8;
  const ICE_LIFE = 12;
  const tileDrop = (d) => {
    if (d == null || d < 2.2) return 0;
    if (d < 2.7) return (-(d - 2.2) / 0.5) * 3.2;
    if (d < 5.9) return -3.2;
    if (d < 6.8) return -3.2 * (1 - (d - 5.9) / 0.9);
    return 0;
  };
  const SINK_LIFE = 6.8;
  const fallOn = (i, clk) => {
    const f = FALLS[i];
    const p = (((clk + f.off) % f.per) + f.per) % f.per;
    return p < FALL_ON ? 1 : p > f.per - 1.2 ? 0.5 : 0;
  };

  // ---------- materials ----------
  const basalt = Tex.mat('rock', { color: '#3a3032', scale: 3, rough: 0.9, bump: 0.9 });
  const basaltTop = Tex.mat('rock', { color: '#463b3c', scale: 1.6, rough: 0.92, bump: 1 });
  const cliff = Tex.mat('rock', { color: '#3a2f33', scale: 6, rough: 0.95, bump: 1 });
  const ash = Tex.mat('sand', { color: '#3b3236', scale: 3, rough: 0.95, bump: 0.4 });
  const tileMat = Tex.mat('rock', { color: '#4a3e40', scale: 1.8, rough: 0.92, bump: 1 });
  // obsidian: dark glass, rough enough that the lava light never burns a white highlight
  const obsidian = new THREE.MeshStandardMaterial({
    color: '#1e1620',
    roughness: 0.42,
    metalness: 0.15,
    emissive: '#0c0306',
  });
  const iron = new THREE.MeshStandardMaterial({ color: '#5a4c4a', roughness: 0.55, metalness: 0.2, emissive: '#140806' });
  const brass = new THREE.MeshStandardMaterial({
    color: '#b0763a',
    roughness: 0.4,
    metalness: 0.2,
    emissive: '#3a1a06',
    emissiveIntensity: 0.6,
  });
  const glow = (c, k = 1) => LvKit.glow(c, k);
  // lava: flowing crust cells over glowing magma; capped under the bloom threshold
  const lavaU = {
    uTime: { value: 0 },
    uHeat: { value: 1 },
    uCool: { value: 0 },
  };
  const lavaMat = (flow = [0, 0.04], vert = 0, heat = 1) => {
    const U = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uFlow: { value: new THREE.Vector2(flow[0], flow[1]) }, uVert: { value: vert }, uH: { value: heat }, uGlow: { value: 0 } },
    ]);
    U.uTime = lavaU.uTime;
    U.uHeat = lavaU.uHeat;
    U.uCool = lavaU.uCool;
    return new THREE.ShaderMaterial({
      uniforms: U,
      fog: true,
      side: vert ? THREE.DoubleSide : THREE.FrontSide,
      vertexShader: `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime, uHeat, uCool, uVert, uH, uGlow;
        uniform vec2 uFlow;
        varying vec3 vW;
        #include <fog_pars_fragment>
        float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec2 h2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float vn(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
        }
        float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
        float cells(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          float d1 = 8.0, d2 = 8.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = h2(i + g);
            o = 0.5 + 0.42 * sin(uTime * 0.35 + 6.2831 * o);
            float d = length(g + o - f);
            if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
          }
          return d2 - d1;
        }
        void main() {
          vec2 q = uVert > 0.5 ? vec2(vW.x + vW.z, vW.y) : vW.xz;
          vec2 p = q * 0.16 - uFlow * uTime;
          float n = fbm(p + fbm(p * 0.6 + uTime * 0.04) * 1.3);
          float e = cells(q * 0.32 - uFlow * uTime * 2.0 + n * 0.8);
          float crack = 1.0 - smoothstep(0.03, 0.16 + 0.1 * n, e);
          float heat = clamp(n * 0.95 + crack * 0.85 - 0.25, 0.0, 1.0) * uHeat * uH;
          heat = clamp(heat + uGlow * 0.35, 0.0, 1.0);
          heat *= 1.0 - uCool * 0.92;
          vec3 crust = mix(vec3(0.05, 0.028, 0.03), vec3(0.11, 0.05, 0.035), n);
          vec3 hot = mix(vec3(0.5, 0.07, 0.02), vec3(0.85, 0.34, 0.05), smoothstep(0.55, 1.0, heat));
          vec3 col = mix(crust, hot, smoothstep(0.2, 0.8, heat));
          // a dim ember glow left in the cooled crust
          col += vec3(0.18, 0.03, 0.0) * crack * uCool * 0.6;
          gl_FragColor = vec4(min(col, vec3(0.86)), 1.0);
          #include <fog_fragment>
        }`,
    });
  };

  // ---------- geometry helpers ----------
  const jitter = (geo, amt, seed, keepTop = true) => {
    const r = rng(seed);
    const pos = geo.attributes.position;
    const map = new Map();
    let ymax = -1e9;
    for (let i = 0; i < pos.count; i++) ymax = Math.max(ymax, pos.getY(i));
    for (let i = 0; i < pos.count; i++) {
      const k = pos.getX(i).toFixed(3) + ',' + pos.getY(i).toFixed(3) + ',' + pos.getZ(i).toFixed(3);
      if (!map.has(k)) map.set(k, [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]);
      const d = map.get(k);
      const top = keepTop && Math.abs(pos.getY(i) - ymax) < 1e-3;
      pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + (top ? 0 : d[1]), pos.getZ(i) + d[2]);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const hexGeo = (r, h, seed) => {
    const g = new THREE.CylinderGeometry(r, r * 1.04, h, 6, 3);
    g.translate(0, -h / 2, 0);
    return jitter(g, r * 0.12, seed);
  };
  // instanced basalt prisms around a slab's sides: the columnar-basalt look
  const prismGeo = new THREE.CylinderGeometry(0.55, 0.6, 1, 6, 1).translate(0, -0.5, 0);
  const prisms = [];
  const prismRim = (x, z, sx, sz, top) => {
    const r = rng(Math.round(x * 31 + z * 17 + 99));
    const add = (px, pz) => prisms.push([px, top - 0.06 - r() * 0.35, pz, 1 + r() * 0.25, top + 3.5, r() * 6]);
    // inset by the prism's widest radius: nothing you can see sticks out past the collider
    const e = 0.72;
    for (let a = -sx / 2 + e; a <= sx / 2 - e; a += 1.05) {
      add(x + a, z - sz / 2 + e);
      add(x + a, z + sz / 2 - e);
    }
    for (let b = -sz / 2 + e + 1.05; b <= sz / 2 - e - 1.05; b += 1.05) {
      add(x - sx / 2 + e, z + b);
      add(x + sx / 2 - e, z + b);
    }
  };
  const mesa = (x, z, sx, sz, top = TOP, mat = basaltTop) => {
    const h = top + 4;
    const g = jitter(new THREE.BoxGeometry(sx, h, sz, Math.ceil(sx / 2), 3, Math.ceil(sz / 2)), 0.2, x * 7 + z);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(P(x, top - h / 2, z));
    group.add(m);
    K.collider(x, top - h / 2, z, sx, h, sz);
    prismRim(x, z, sx, sz, top);
    return m;
  };
  const setBox = (b, x, y, z, sx, sy, sz) => {
    b.min[0] = O.x + x - sx / 2;
    b.max[0] = O.x + x + sx / 2;
    b.min[1] = O.y + y - sy / 2;
    b.max[1] = O.y + y + sy / 2;
    b.min[2] = O.z + z - sz / 2;
    b.max[2] = O.z + z + sz / 2;
  };
  const dyn = () => {
    const b = Phys.box(0, -999, 0, 1, 1, 1, { dyn: true });
    b.on = false;
    dynBoxes.push(b);
    return b;
  };
  const dynBoxes = [];

  // a lever on a stone base
  const lever = (pos, rotY, col) => {
    const g = new THREE.Group();
    g.position.copy(P(pos.x, pos.y, pos.z));
    g.rotation.y = rotY;
    group.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.9), basalt);
    base.position.y = 0.25;
    g.add(base);
    const pivot = new THREE.Group();
    pivot.position.y = 0.55;
    g.add(pivot);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 10).translate(0, 0.65, 0), iron);
    pivot.add(stick);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow(col, 0.8));
    knob.position.y = 1.32;
    pivot.add(knob);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.32, 28), glow(col, 0.5));
    plate.position.set(0, 0.36, 0.46);
    g.add(plate);
    K.collider(pos.x, pos.y + 0.25, pos.z, 1.0, 0.5, 0.8);
    return { g, pivot, knob, plate, k: 0, col };
  };

  // ---------- state built once ----------
  let lakeMesh = null;
  let riverMesh = null;
  let calMesh = null;
  const cols = [];
  const geys = [];
  const bridge = [];
  const ice = [];
  const tiles = [];
  const falls = [];
  let levers = {};
  let gate = null;
  let raft = null;
  let raftBox = null;
  let poolCrust = null;
  let pillarCard = null;
  let card = null;
  let cardHeart = null;
  let lavaLight = null;
  let heartLight = null;
  let embers = null;
  let screen = null;
  let screen2 = null;
  let ringMeshes = [];
  let volcano = null;
  let dome = null;
  let plume = [];
  const tmp = V3();

  const buildLava = () => {
    // the lava fields' lake (raised by the tide), the river, the caldera pool
    lakeMesh = new THREE.Mesh(new THREE.PlaneGeometry(64, 166).rotateX(-Math.PI / 2), lavaMat([0.01, 0.02]));
    lakeMesh.position.copy(P(0, 0, 59));
    group.add(lakeMesh);
    riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 420, 1, 1).rotateX(-Math.PI / 2), lavaMat([0, -0.16]));
    riverMesh.position.copy(P(0, 0, 378));
    group.add(riverMesh);
    calMesh = new THREE.Mesh(new THREE.CircleGeometry(38, 64).rotateX(-Math.PI / 2), lavaMat([0.015, 0.01]));
    calMesh.position.copy(P(CAL.x, 0, CAL.z));
    group.add(calMesh);
  };

  const buildCanyon = () => {
    // cliffs on both sides of the lava fields, with colliders; the back wall behind the start
    const cliffWall = (x0, x1, z0, z1, h, seed, shift = 0, jit = 2.2) => {
      const sx = x1 - x0;
      const sz = z1 - z0;
      const g = jitter(new THREE.BoxGeometry(sx, h, sz, Math.max(2, Math.ceil(sx / 3)), 6, Math.max(2, Math.ceil(sz / 3))), jit, seed, false);
      const m = new THREE.Mesh(g, cliff);
      // the jitter bulges up to 1.1 m: the visual is pushed back so it never overhangs a path
      m.position.copy(P((x0 + x1) / 2 + shift, h / 2 - 4, (z0 + z1) / 2));
      group.add(m);
      K.collider((x0 + x1) / 2, h / 2 - 4, (z0 + z1) / 2, sx, h + 8, sz);
    };
    for (let z = -14; z < 141; z += 22) {
      const r = rng(z + 400);
      cliffWall(-36, -26, z, z + 22, 22 + r() * 14, z * 3 + 1, -1.1);
      cliffWall(26, 36, z, z + 22, 22 + r() * 14, z * 3 + 2, 1.1);
    }
    cliffWall(-36, 36, -24, -12, 30, 77);
    // the gate wall, then a narrow pass down to the dock
    cliffWall(-26, -3.6, GATE_Z - 0.8, GATE_Z + 1.6, 20, 81, 0, 0.5);
    cliffWall(3.6, 26, GATE_Z - 0.8, GATE_Z + 1.6, 20, 82, 0, 0.5);
    for (let z = GATE_Z + 1.6; z < RIVER.z0 + 2; z += 10) {
      cliffWall(-20, -7, z, z + 10, 22, z * 5 + 3, -1.1);
      cliffWall(7, 20, z, z + 10, 22, z * 5 + 4, 1.1);
    }
  };

  const buildPart1 = () => {
    Object.values(MESAS).forEach(([x, z, sx, sz]) => mesa(x, z, sx, sz));
    // 1B: sinking columns
    COLS.forEach((c, i) => {
      const m = new THREE.Mesh(hexGeo(c.r * 1.15, c.top + 6, 300 + i), basalt);
      group.add(m);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(c.r * 1.1, 6).rotateX(-Math.PI / 2), basaltTop);
      cap.position.y = 0.01;
      m.add(cap);
      // ember seams on the side, lit when it starts to sink
      const seam = new THREE.Mesh(
        new THREE.CylinderGeometry(c.r * 1.17, c.r * 1.2, 0.12, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: '#ff6a20', transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
      );
      seam.position.y = -0.35;
      m.add(seam);
      const b = Phys.box(O.x + c.x, O.y + c.top - 3, O.z + c.z, c.r * 1.75, 6, c.r * 1.75, { dyn: true });
      dynBoxes.push(b);
      cols.push({ c, m, b, seam, shake: 0 });
    });
    // geysers: a crusted vent on the lava, a spout when it erupts, a plug when frozen
    GEYSERS.forEach((gz, i) => {
      const g = new THREE.Group();
      g.position.copy(P(gz.x, 0, gz.z));
      group.add(g);
      const rim = new THREE.Mesh(jitter(new THREE.TorusGeometry(G_R * 0.75, 0.32, 8, 18).rotateX(Math.PI / 2), 0.12, 700 + i, false), basalt);
      rim.position.y = -0.14;
      g.add(rim);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(G_R * 0.72, 24).rotateX(-Math.PI / 2), glow('#ff7a20', 0.45));
      mouth.position.y = 0.08;
      g.add(mouth);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(G_R * 0.55, G_R * 0.85, 1, 18, 4, true).translate(0, 0.5, 0), lavaMat([0, 0.5], 1, 1.2));
      spout.visible = false;
      g.add(spout);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(G_R * 0.9, 16, 10), lavaMat([0.1, 0.4], 0, 1.2));
      crown.visible = false;
      g.add(crown);
      const plug = new THREE.Mesh(
        new THREE.CylinderGeometry(G_R * 0.85, G_R, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: '#2b2a36', roughness: 0.6, emissive: '#183850', emissiveIntensity: 0.8 }),
      );
      plug.position.y = 0.2;
      plug.visible = false;
      g.add(plug);
      const frost = new THREE.Mesh(new THREE.RingGeometry(G_R * 0.9, G_R * 1.15, 32).rotateX(-Math.PI / 2), glow('#7ce0ff', 0.7));
      frost.position.y = 0.47;
      frost.visible = false;
      g.add(frost);
      const warnRing = new THREE.Mesh(
        new THREE.RingGeometry(G_R * 0.95, G_R * 1.12, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a2a').multiplyScalar(0.85), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
      );
      warnRing.position.y = 0.09;
      g.add(warnRing);
      geys.push({ g, mouth, spout, crown, plug, frost, warnRing, last: 'idle', pb: dyn() });
    });
    // 1C: the high pillar (lever A), the islet (lever B), low stepping stones, the bridge
    mesa(PILLAR.x, PILLAR.z, PILLAR.s, PILLAR.s, PILLAR.top, basaltTop);
    mesa(ISLET.x, ISLET.z, ISLET.s, ISLET.s, ISLET.top, basaltTop);
    STONES.forEach(([x, z], i) => {
      const m = new THREE.Mesh(hexGeo(1.2, STONE_TOP + 4, 900 + i), basaltTop);
      m.position.copy(P(x, STONE_TOP, z));
      group.add(m);
      K.collider(x, STONE_TOP - 2, z, 2.0, 4, 2.0);
    });
    levers.a = lever(LEVERS.a, Math.PI, '#b9a6ff');
    levers.b = lever(LEVERS.b, Math.PI, '#7ce0ff');
    const seg = (BRIDGE.z1 - BRIDGE.z0) / BRIDGE.n;
    for (let i = 0; i < BRIDGE.n; i++) {
      const z = BRIDGE.z0 + seg * (i + 0.5);
      const g = new THREE.Group();
      group.add(g);
      const slab = new THREE.Mesh(jitter(new THREE.BoxGeometry(BRIDGE.w, 0.9, seg - 0.12, 3, 1, 3), 0.08, 950 + i), basaltTop);
      slab.position.y = -0.45;
      g.add(slab);
      const under = new THREE.Mesh(jitter(new THREE.ConeGeometry(BRIDGE.w * 0.5, 2.4, 6, 2), 0.15, 970 + i, false), basalt);
      under.rotation.x = Math.PI;
      under.position.y = -2.0;
      g.add(under);
      const crack = new THREE.Mesh(
        new THREE.PlaneGeometry(BRIDGE.w * 0.9, seg * 0.8).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
      );
      crack.position.y = 0.012;
      g.add(crack);
      const b = Phys.box(O.x, O.y - 50, O.z + z, BRIDGE.w, 0.9, seg - 0.05, { dyn: true });
      dynBoxes.push(b);
      bridge.push({ g, b, z, seg, crack, shake: 0 });
    }
    // grapple rings for the grapple kit
    ringMeshes = RINGS_G.map((r) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 10, 36), glow('#b9a6ff', 0.85));
      m.position.copy(P(r.p[0], r.p[1], r.p[2]));
      group.add(m);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 30, 6).translate(0, 15.75, 0), iron);
      m.add(chain);
      return m;
    });
    // the gate: two basalt leaves with the spade seams, they sink when both levers are pulled
    const gg = new THREE.Group();
    gg.position.copy(P(0, 0, GATE_Z));
    group.add(gg);
    const leafTex = LvKit.tex(512, 1024, (g, w, h) => {
      LvKit.grain(g, w, h, '#2a2024', 0.18, 14000);
      g.strokeStyle = '#ff7a2a';
      g.lineWidth = 7;
      g.shadowColor = '#ff5a10';
      g.shadowBlur = 16;
      g.strokeRect(34, 34, w - 68, h - 68);
      g.font = '300px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#ff7a2a';
      Icons.fillText(g, '♠', w / 2, h * 0.42);
      g.font = 'bold 120px Georgia';
      Icons.fillText(g, '6', w / 2, h * 0.75);
    });
    const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.85, emissive: '#ffffff', emissiveMap: leafTex, emissiveIntensity: 0.35 });
    const leaves = [-1, 1].map((s) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.6, 10, 0.9), [basalt, basalt, basalt, basalt, leafMat, leafMat]);
      m.position.set(s * 1.8, 5, 0.4);
      gg.add(m);
      return m;
    });
    const lintel = new THREE.Mesh(jitter(new THREE.BoxGeometry(9, 2.4, 2.6, 4, 1, 1), 0.2, 991), basalt);
    lintel.position.set(0, 11.2, 0.4);
    gg.add(lintel);
    const gateBox = Phys.box(O.x, O.y + 5, O.z + GATE_Z + 0.4, 7.2, 10, 1.2, { dyn: true });
    dynBoxes.push(gateBox);
    gate = { g: gg, leaves, b: gateBox, k: 0 };
    // the pass down to the dock: three steps
    [
      [GATE_Z + 6, 14, 1.57],
      [GATE_Z + 13, 3, 1.14],
      [GATE_Z + 17.5, 6, 0.7],
    ].forEach(([z, sz, top]) => mesa(0, z, 14, sz + 0.02, top, ash));
    mesa(0, (RIVER.z0 + GATE_Z + 20.5) / 2, 14, RIVER.z0 - (GATE_Z + 20.5), 0.7, basaltTop);
  };

  const crackTex = (() => {
    let t = null;
    return () => {
      if (t) return t;
      t = LvKit.tex(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.strokeStyle = '#ff8a30';
        g.lineCap = 'round';
        const r = rng(55);
        const branch = (x, y, a, len, wd) => {
          if (len < 12 || wd < 0.6) return;
          const x2 = x + Math.cos(a) * len;
          const y2 = y + Math.sin(a) * len;
          g.lineWidth = wd;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x2, y2);
          g.stroke();
          branch(x2, y2, a + (r() - 0.5) * 1.1, len * 0.78, wd * 0.8);
          if (r() < 0.45) branch(x2, y2, a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), len * 0.6, wd * 0.6);
        };
        for (let i = 0; i < 6; i++) branch(w / 2, h / 2, (i / 6) * TAU + r() * 0.5, 60 + r() * 40, 7);
      });
      return t;
    };
  })();

  const buildIce = () => {
    // a pool of frozen-lava discs (the frost kit's work): crust slab, frost rim, a collider each
    const crustMat = new THREE.MeshStandardMaterial({ color: '#30282e', roughness: 0.75, emissive: '#0a1622', emissiveIntensity: 1 });
    const geo = jitter(new THREE.CylinderGeometry(1.5, 1.7, 0.6, 8, 1).translate(0, -0.3, 0), 0.1, 1201);
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      g.visible = false;
      group.add(g);
      const m = new THREE.Mesh(geo, crustMat.clone());
      g.add(m);
      const rim = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.62, 8).rotateX(-Math.PI / 2), glow('#7ce0ff', 0.7));
      rim.material.transparent = true;
      rim.position.y = 0.01;
      g.add(rim);
      const frostTop = new THREE.Mesh(
        new THREE.CircleGeometry(1.42, 8).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: frostTex(), transparent: true, opacity: 0.7, toneMapped: false, depthWrite: false }),
      );
      frostTop.position.y = 0.012;
      g.add(frostTop);
      ice.push({ g, m, rim, frostTop, b: dyn(), key: null });
    }
  };
  const frostTex = (() => {
    let t = null;
    return () => {
      if (t) return t;
      t = LvKit.tex(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const r = rng(77);
        g.strokeStyle = 'rgba(160,225,255,0.55)';
        for (let i = 0; i < 70; i++) {
          const a = r() * TAU;
          const x = w / 2 + Math.cos(a) * r() * w * 0.42;
          const y = h / 2 + Math.sin(a) * r() * h * 0.42;
          g.lineWidth = 1 + r() * 2.5;
          g.beginPath();
          g.moveTo(x, y);
          for (let k = 0; k < 4; k++) g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60);
          g.stroke();
        }
        const grd = g.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.5);
        grd.addColorStop(0, 'rgba(120,190,230,0.05)');
        grd.addColorStop(1, 'rgba(160,225,255,0.35)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      });
      return t;
    };
  })();

  const buildRiver = () => {
    // cliffs along the channel: a displaced vertical ribbon on each side, colliders every 4 m
    const zs = [];
    for (let z = RIVER.z0 - 4; z <= RIVER.z1 + 4; z += 2) zs.push(z);
    [-1, 1].forEach((s) => {
      const H = [0, 3, 7, 12, 18, 26, 34];
      const pos = [];
      const idx = [];
      const r = rng(s > 0 ? 1301 : 1302);
      const noise = zs.map(() => H.map(() => (r() - 0.5) * 1.6));
      zs.forEach((z, i) =>
        H.forEach((y, j) => {
          const out = s * (RIVER.hw + 0.4 + j * 0.9 + Math.sin(z * 0.11 + j) * 0.6 + noise[i][j]);
          pos.push(cx(z) + out, y - 1.5, z + noise[i][j] * 0.6);
        }),
      );
      for (let i = 0; i < zs.length - 1; i++)
        for (let j = 0; j < H.length - 1; j++) {
          const a = i * H.length + j;
          const b = a + H.length;
          if (s > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
          else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, cliff);
      m.position.copy(O);
      group.add(m);
      for (let z = RIVER.z0; z < RIVER.z1; z += 4) K.collider(cx(z + 2) + s * (RIVER.hw + 2.2), 10, z + 2, 3, 30, 4.2);
    });
    // boulders and basalt spires in the stream (rocks the raft must avoid)
    ROCKS.forEach(([z, u, r], i) => {
      const h = 5 + (i % 4) * 2.5;
      const m = new THREE.Mesh(hexGeo(r, h + 3, 1400 + i), basalt);
      m.position.copy(P(cx(z) + u, h, z));
      group.add(m);
      const glowRing = new THREE.Mesh(new THREE.RingGeometry(r * 1.02, r * 1.5, 24).rotateX(-Math.PI / 2), glow('#ff6a1a', 0.55));
      glowRing.material.transparent = true;
      glowRing.material.opacity = 0.55;
      glowRing.position.copy(P(cx(z) + u, 0.03, z));
      group.add(glowRing);
      K.collider(cx(z) + u, h / 2, z, r * 1.6, h, r * 1.6);
    });
    // lava falls pouring from the cliff tops onto half the channel
    FALLS.forEach((f, i) => {
      const x = cx(f.z) + f.side * (RIVER.hw - f.len / 2 + 0.6);
      const g = new THREE.Group();
      g.position.copy(P(x, 0, f.z));
      group.add(g);
      const curtain = new THREE.Group();
      const sheet = lavaMat([0, -0.9], 1, 1.15);
      [-0.5, 0.5].forEach((dz) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(f.len, 22, 1, 1).translate(0, 11, dz), sheet);
        curtain.add(m);
      });
      // the ends of the curtain, so it reads as a thick sheet from the side too
      [-1, 1].forEach((sx) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 22).rotateY(Math.PI / 2).translate((sx * f.len) / 2, 11, 0), sheet);
        curtain.add(m);
      });
      g.add(curtain);
      const lip = new THREE.Mesh(jitter(new THREE.BoxGeometry(f.len + 2, 1.6, 3, 4, 1, 2), 0.3, 1500 + i), basalt);
      lip.position.set(f.side * 1, 22.4, 0);
      g.add(lip);
      const splash = new THREE.Mesh(new THREE.CircleGeometry(f.len * 0.55, 24).rotateX(-Math.PI / 2), glow('#ff7a20', 0.6));
      splash.material.transparent = true;
      splash.position.y = 0.05;
      g.add(splash);
      falls.push({ f, g, curtain, splash, x, k: 1 });
    });
    // the docks
    mesa(0, RIVER.z1 + 9, 14, 18, RAFT.top, basaltTop);
    // the raft: an obsidian slab on pumice floats, a mast with a heart lantern
    raft = new THREE.Group();
    group.add(raft);
    const deck = new THREE.Mesh(jitter(new THREE.BoxGeometry(RAFT.hx * 2, 0.5, RAFT.hz * 2, 4, 1, 5), 0.06, 1601), obsidian);
    deck.position.y = -0.25;
    raft.add(deck);
    const plankTex = LvKit.tex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#100c10';
      g.fillRect(0, 0, w, h);
      const r = rng(1602);
      // conchoidal ripples of the glass, and a few ember-lit cracks
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(${90 + r() * 50},${70 + r() * 30},${90 + r() * 40},${0.06 + r() * 0.08})`;
        g.lineWidth = 1 + r() * 3;
        g.beginPath();
        const y = r() * h;
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 120, w * 0.7, y + (r() - 0.5) * 120, w, y + (r() - 0.5) * 60);
        g.stroke();
      }
      // a heart inlay at the centre and the steering marks at both sides
      g.save();
      g.translate(w / 2, h / 2);
      g.fillStyle = 'rgba(255,110,60,0.28)';
      g.beginPath();
      for (let i = 0; i <= 80; i++) {
        const [x, y] = Heart.curve((i / 80) * TAU);
        if (i) g.lineTo(x * 6, -(y - 2.5) * 6);
        else g.moveTo(x * 6, -(y - 2.5) * 6);
      }
      g.fill();
      g.restore();
    });
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(RAFT.hx * 2 - 0.2, RAFT.hz * 2 - 0.2).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.78, metalness: 0.05, emissive: '#ffffff', emissiveMap: plankTex, emissiveIntensity: 0.18 }),
    );
    top.position.y = 0.012;
    raft.add(top);
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        const f = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(0.8, 1), 0.15, 1610 + sx * 3 + sz), basalt);
        f.scale.set(1.2, 0.6, 1.4);
        f.position.set(sx * (RAFT.hx - 0.4), -0.45, sz * (RAFT.hz - 0.6));
        raft.add(f);
      }),
    );
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 10).translate(0, 1.3, 0), iron);
    mast.position.set(0, 0, RAFT.hz - 0.4);
    raft.add(mast);
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), glow('#ffb070', 0.85));
    lantern.position.set(0, 2.55, RAFT.hz - 0.4);
    raft.add(lantern);
    raft.userData.lantern = lantern;
    // steering arrows on the deck edges light up with the lean
    raft.userData.arrows = [-1, 1].map((s) => {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.6).rotateX(-Math.PI / 2), glow('#ffb070', 0.6));
      a.material.transparent = true;
      a.material.opacity = 0.2;
      a.position.set(s * (RAFT.hx - 0.55), 0.02, 0);
      raft.add(a);
      return a;
    });
    raftBox = dyn();
  };

  const buildCaldera = () => {
    // basalt tiles over the lava (4 m grid); the inner ring sinks in patterns, the rim holds
    for (let i = -6; i <= 6; i++)
      for (let j = -6; j <= 6; j++) {
        const x = i * TILE;
        const z = j * TILE;
        const r = Math.hypot(x, z);
        if (r < POOL_R + 1.2 || r > WALL_R - 1) continue;
        const rim = r > 19;
        const m = new THREE.Mesh(jitter(new THREE.BoxGeometry(TILE - 0.18, 3, TILE - 0.18, 2, 1, 2), 0.06, 1700 + i * 13 + j), tileMat);
        m.position.copy(P(CAL.x + x, TILE_TOP - 1.5, CAL.z + z));
        group.add(m);
        const seam = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE - 0.1, TILE - 0.1).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: seamTex(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
        );
        seam.position.y = 1.513;
        m.add(seam);
        const b = rim
          ? K.collider(CAL.x + x, TILE_TOP - 1.5, CAL.z + z, TILE, 3, TILE)
          : Phys.box(O.x + CAL.x + x, O.y + TILE_TOP - 1.5, O.z + CAL.z + z, TILE, 3, TILE, { dyn: true });
        if (!rim) dynBoxes.push(b);
        tiles.push({ x, z, r, a: Math.atan2(z, x), rim, m, b, seam, i, j });
      }
    // the crater wall around the arena
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * TAU;
      const r = rng(1800 + k);
      const h = 14 + r() * 16;
      if (Math.abs(a - (3 * Math.PI) / 2) < 0.36) continue;
      const m = new THREE.Mesh(jitter(new THREE.BoxGeometry(6.4, h, 6.4, 2, 4, 2), 0.5, 1850 + k, false), cliff);
      const x = Math.cos(a) * (WALL_R + 3.2);
      const z = Math.sin(a) * (WALL_R + 3.2);
      // leave the way in from the dock open
      if (Math.abs(a - (3 * Math.PI) / 2) < 0.36) continue;
      m.position.copy(P(CAL.x + x, h / 2 - 3, CAL.z + z));
      group.add(m);
      K.collider(CAL.x + x, h / 2, CAL.z + z, 6.4, h + 6, 6.4);
    }
    // the cooled pool after the fight, and the basalt column that brings up the card
    poolCrust = Phys.box(O.x + CAL.x, O.y - 1, O.z + CAL.z, POOL_R * 2 + 2, 2, POOL_R * 2 + 2, { dyn: true });
    poolCrust.on = false;
    dynBoxes.push(poolCrust);
    pillarCard = new THREE.Mesh(hexGeo(1.3, 8, 1901), basaltTop);
    pillarCard.position.copy(P(CAL.x, -6, CAL.z));
    group.add(pillarCard);
    pillarCard.userData.box = dyn();
    card = LvKit.trialCard('s6', false);
    card.position.copy(P(CAL.x, 2.6, CAL.z));
    group.add(card);
    cardHeart = Heart.galaxy(6000, 4, 61);
    cardHeart.group.scale.setScalar(0.04);
    cardHeart.group.position.copy(P(CAL.x, 9, CAL.z));
    cardHeart.core.material.opacity = 0;
    cardHeart.U.uFade.value = 0.7;
    cardHeart.group.visible = false;
    group.add(cardHeart.group);
  };
  const seamTex = (() => {
    let t = null;
    return () => {
      if (t) return t;
      t = LvKit.tex(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.strokeStyle = '#ff7a2a';
        g.lineWidth = 22;
        g.shadowColor = '#ff4a10';
        g.shadowBlur = 30;
        g.strokeRect(14, 14, w - 28, h - 28);
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(w * 0.2, h * 0.3);
        g.lineTo(w * 0.45, h * 0.52);
        g.lineTo(w * 0.8, h * 0.4);
        g.moveTo(w * 0.45, h * 0.52);
        g.lineTo(w * 0.5, h * 0.85);
        g.stroke();
      });
      return t;
    };
  })();

  const buildSky = () => {
    // the volcano on the horizon, its glowing crater and the ash plume
    volcano = new THREE.Group();
    volcano.position.copy(P(-480, -10, 480));
    volcano.scale.setScalar(0.62);
    group.add(volcano);
    const cone = new THREE.Mesh(
      jitter(new THREE.ConeGeometry(420, 300, 48, 8, true), 18, 2001, false),
      new THREE.MeshBasicMaterial({ color: '#1d0b10', fog: false }),
    );
    cone.position.y = 150;
    volcano.add(cone);
    const crater = new THREE.Mesh(new THREE.CircleGeometry(60, 32).rotateX(-Math.PI / 2), glow('#ff6a1a', 0.75));
    crater.material.fog = false;
    crater.position.y = 296;
    volcano.add(crater);
    // lava rivulets down the flank
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.22;
      const path = [];
      for (let s = 0; s <= 10; s++) {
        const t = s / 10;
        const rr = 60 + t * 330;
        path.push(new THREE.Vector3(Math.cos(a + Math.sin(t * 7 + k) * 0.05) * rr, 296 - t * 300, Math.sin(a + Math.sin(t * 7 + k) * 0.05) * rr));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 40, 3 + (k % 3), 6, false), glow('#ff5a14', 0.55 + (k % 3) * 0.08));
      m.material.fog = false;
      volcano.add(m);
    }
    const smokeTex = LvKit.tex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = rng(2010);
      for (let i = 0; i < 60; i++) {
        const x = w / 2 + (r() - 0.5) * w * 0.5;
        const y = h / 2 + (r() - 0.5) * h * 0.5;
        const rad = 40 + r() * 120;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, 'rgba(60,40,48,0.25)');
        grd.addColorStop(1, 'rgba(60,40,48,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      }
    });
    for (let k = 0; k < 10; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.85, color: '#9a6e72', fog: false }));
      s.userData.k = k;
      volcano.add(s);
      plume.push(s);
    }
    // an ash sky: a dome inside the global sky, dark red, lit from below by the lava, thin
    // enough at the top that the sky's heart still glimmers through
    dome = new THREE.Mesh(
      new THREE.SphereGeometry(770, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: { value: 0 }, uWon: { value: 0 } },
        vertexShader: `
          varying vec3 vD;
          void main() {
            vD = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uTime, uWon;
          varying vec3 vD;
          float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
          }
          float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.1; a *= 0.5; } return s; }
          void main() {
            float y = vD.y;
            vec2 uv = vD.xz / (abs(y) + 0.25) * 2.2 + vec2(uTime * 0.01, uTime * 0.004);
            float cl = fbm(uv) * 0.7 + fbm(uv * 2.7 + 3.0) * 0.3;
            vec3 hor = mix(vec3(0.24, 0.05, 0.035), vec3(0.3, 0.16, 0.12), uWon);
            vec3 zen = mix(vec3(0.025, 0.008, 0.014), vec3(0.08, 0.04, 0.07), uWon);
            vec3 col = mix(hor, zen, smoothstep(-0.05, 0.55, y));
            // ash clouds, lit orange from underneath
            col = mix(col, vec3(0.32, 0.09, 0.05) * (0.6 + 0.6 * cl), smoothstep(0.45, 0.8, cl) * smoothstep(0.7, 0.05, y) * 0.8);
            col *= 0.75 + 0.35 * cl;
            float a = mix(0.97, 0.72, smoothstep(0.2, 0.9, y)) * (1.0 - uWon * 0.35);
            gl_FragColor = vec4(col, a);
          }`,
      }),
    );
    dome.renderOrder = -2;
    dome.frustumCulled = false;
    group.add(dome);
    // embers rising and ash falling around the camera (wrapped in a box that follows it)
    const N = 1600;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    const a = new Float32Array(N * 2);
    const r = rng(2020);
    for (let i = 0; i < N; i++) {
      p.set([r() * 60 - 30, r() * 24, r() * 60 - 30], i * 3);
      a.set([r(), r() < 0.55 ? 1 : 0], i * 2);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(a, 2));
    embers = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uCam: { value: V3() }, uPx: { value: 1 }, uK: { value: 1 } },
        vertexShader: `
          uniform float uTime, uPx; uniform vec3 uCam;
          attribute vec2 aR; varying float vA; varying float vE;
          void main() {
            vec3 p = position;
            float ember = aR.y;
            float sp = ember > 0.5 ? (1.2 + aR.x * 2.2) : -(0.5 + aR.x * 0.7);
            p.y = mod(p.y + uTime * sp, 24.0);
            p.x += sin(uTime * (0.6 + aR.x) + aR.x * 40.0) * 1.2;
            p.z += cos(uTime * (0.5 + aR.x) + aR.x * 30.0) * 1.2;
            vec3 w = vec3(uCam.x + mod(p.x - uCam.x + 30.0, 60.0) - 30.0, uCam.y - 8.0 + p.y, uCam.z + mod(p.z - uCam.z + 30.0, 60.0) - 30.0);
            vec4 mv = viewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (ember > 0.5 ? 2.2 + aR.x * 2.6 : 2.6 + aR.x * 3.0) * uPx * (12.0 / -mv.z);
            vA = (ember > 0.5 ? 0.55 + 0.45 * sin(uTime * 6.0 + aR.x * 80.0) : 0.35) * smoothstep(0.0, 3.0, p.y) * smoothstep(24.0, 18.0, p.y);
            vE = ember;
          }`,
        fragmentShader: `
          uniform float uK; varying float vA; varying float vE;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * vA * uK;
            vec3 c = vE > 0.5 ? vec3(0.85, 0.36, 0.08) : vec3(0.22, 0.2, 0.22);
            gl_FragColor = vec4(c * a, a);
          }`,
      }),
    );
    embers.frustumCulled = false;
    group.add(embers);
  };

  // where the frost would land (only on the frost carrier's screen)
  let aimMark = null;
  const buildAim = () => {
    aimMark = new THREE.Group();
    aimMark.visible = false;
    group.add(aimMark);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.5, 8).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe6ff').multiplyScalar(0.8), transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false }),
    );
    aimMark.add(ring);
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe8ff').multiplyScalar(0.8), transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }),
    );
    aimMark.add(dot);
    aimMark.userData = { ring, dot };
  };

  const buildLights = () => {
    // one orange light under the local player (the lava's glow) and one for the titan's heart;
    // both always present so the light count never changes (no shader recompiles)
    lavaLight = new THREE.PointLight('#ff7a30', 1.5, 30, 1.6);
    group.add(lavaLight);
    heartLight = new THREE.PointLight('#ff5a3a', 0, 30, 1.8);
    heartLight.position.copy(P(CAL.x, 8, CAL.z));
    group.add(heartLight);
  };

  const build = () => {
    if (built) return;
    built = true;
    buildLava();
    buildCanyon();
    buildPart1();
    buildIce();
    buildRiver();
    buildCaldera();
    buildSky();
    buildLights();
    buildAim();
    // the instanced basalt prisms round every slab
    const pm = new THREE.InstancedMesh(prismGeo, basalt, prisms.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    prisms.forEach(([x, y, z, s, h, rot], i) => {
      q.setFromAxisAngle(V3(0, 1, 0), rot);
      m4.compose(P(x, y, z), q, V3(s, h, s));
      pm.setMatrixAt(i, m4);
    });
    group.add(pm);
    // the screens
    screen = makeScreen(8, 3.2, 1024);
    screen.mesh.position.copy(P(-6.2, 8.4, 29.4));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    const pylon = new THREE.Mesh(hexGeo(0.5, 6.4, 2101), basalt);
    pylon.position.copy(P(-6.2, 6.6, 29.8));
    group.add(pylon);
    screen2 = makeScreen(10, 4, 1024);
    screen2.mesh.position.copy(P(0, 12.5, GATE_Z - 1));
    screen2.mesh.rotation.y = Math.PI;
    group.add(screen2.mesh);
    sleep();
  };

  // ---------- per-frame ----------
  const shake = (t, k) => (k > 0 ? Math.sin(t * 55) * 0.06 * k : 0);
  const iceTop = (lavaY) => lavaY + 0.3;
  let lastClk = 0;

  const sleep = () => {
    dynBoxes.forEach((b) => (b.on = false));
    group.visible = false;
  };

  const update = (dt, t, x, role, v) => {
    if (!built) return;
    const clk = v.clk;
    lastClk = clk;
    lavaU.uTime.value = t;
    lavaU.uCool.value = damp(lavaU.uCool.value, x.stage >= 4 ? 0.85 : 0, 0.8, dt);
    const tide = x.stage === 1 ? tideAt(clk) : 0;
    lakeMesh.position.y = O.y + tide;
    lakeMesh.material.uniforms.uGlow.value = x.stage === 1 && tideWarn(clk) ? 0.5 + 0.5 * Math.sin(t * 10) : tide > 0.1 ? 0.6 : 0;
    // 1B columns: host-shared sink start times
    cols.forEach((o, i) => {
      const t0 = x.sink && x.sink[i];
      const d = t0 != null ? clk - t0 : null;
      const drop = colDrop(d);
      const sh = d != null && d < 0.7 ? 1 : 0;
      o.m.position.copy(P(o.c.x + shake(t, sh), o.c.top + drop, o.c.z));
      o.seam.material.opacity = d != null && d < COL_LIFE ? 0.75 : 0;
      setBox(o.b, o.c.x, o.c.top + drop - 3, o.c.z, o.c.r * 1.75, 6, o.c.r * 1.75);
      o.b.on = x.stage === 1;
    });
    // geysers
    geys.forEach((gy, i) => {
      const st = geyserState(i, clk, x.gfz && x.gfz[i]);
      const k = st === 'erupt' ? eruptK(i, clk) : 0;
      gy.spout.visible = k > 0.02;
      gy.spout.scale.set(1, Math.max(0.01, k * G_H), 1);
      gy.crown.visible = k > 0.02;
      gy.crown.position.y = k * G_H;
      gy.crown.scale.setScalar(0.6 + k * 0.6);
      gy.plug.visible = st === 'frozen';
      gy.frost.visible = st === 'frozen';
      gy.mouth.material.color.set('#ff7a20').multiplyScalar(st === 'warn' ? 0.55 + 0.3 * Math.sin(t * 22) : st === 'frozen' ? 0.05 : 0.4);
      gy.warnRing.material.opacity = st === 'warn' ? 0.5 + 0.35 * Math.sin(t * 14) : st === 'erupt' ? 0.6 : 0;
      gy.warnRing.scale.setScalar(st === 'warn' ? 1 + 0.06 * Math.sin(t * 14) : 1);
      gy.g.position.y = O.y + tide;
      // a frozen vent is a stepping stone
      gy.pb.on = st === 'frozen' && x.stage === 1;
      setBox(gy.pb, GEYSERS[i].x, tide + 0.2, GEYSERS[i].z, 2.6, 0.5, 2.6);
      if (st !== gy.last) {
        const wp = P(GEYSERS[i].x, tide + 0.5, GEYSERS[i].z);
        if (st === 'warn' && x.stage === 1 && wp.distanceTo(Player.body.p) < 30) Sound.play('rumble', 0.35);
        if (st === 'erupt' && x.stage === 1 && wp.distanceTo(Player.body.p) < 40) {
          Sound.play('boom', wp);
          Fx.burst(wp, '#ff7a2a', 50, 7, 0.9, -12);
        }
        gy.last = st;
      }
      if (st === 'warn' && Math.random() < dt * 14) Fx.burst(P(GEYSERS[i].x + (Math.random() - 0.5) * 1.6, tide + 0.2, GEYSERS[i].z + (Math.random() - 0.5) * 1.6), '#ff8a30', 3, 2, 0.4, -4);
    });
    // levers
    ['a', 'b'].forEach((id) => {
      const l = levers[id];
      const on = !!(x.lev && x.lev[id]);
      l.k = damp(l.k, on ? 1 : 0, 8, dt);
      l.pivot.rotation.x = 0.7 - l.k * 1.4;
      l.knob.material.color.set(on ? '#7cffb0' : l.col).multiplyScalar(on ? 0.8 : 0.55 + 0.25 * Math.sin(t * 3));
      l.plate.material.color.set(on ? '#7cffb0' : l.col).multiplyScalar(on ? 0.6 : 0.35);
    });
    // the bridge: rises when lever A is pulled; segments crumble under feet
    const tA = x.lev && x.lev.a;
    bridge.forEach((s, i) => {
      let y = -4.6;
      if (tA != null) {
        const k = clamp((clk - tA - i * 0.12) / 0.8, 0, 1);
        y = -4.6 + smooth(k) * 4.6;
      }
      const t0 = x.crumb && x.crumb[i];
      const d = t0 != null ? clk - t0 : null;
      y += crumbDrop(d);
      const sh = d != null && d < 0.6 ? 1 : 0;
      s.g.position.copy(P(shake(t, sh), TOP + y, s.z));
      s.crack.material.opacity = d != null && d < 1.3 ? Math.min(1, d * 3) * 0.85 : 0;
      setBox(s.b, 0, TOP + y - 0.45, s.z, BRIDGE.w, 0.9, s.seg - 0.05);
      s.b.on = x.stage === 1 && y > -4;
    });
    ringMeshes.forEach((m, i) => {
      m.rotation.y = t * 1.3 + i;
      m.visible = x.stage === 1;
    });
    // the gate
    const open = x.stage > 1 || !!(x.lev && x.lev.a != null && x.lev.b != null);
    gate.k = damp(gate.k, open ? 1 : 0, 1.2, dt);
    gate.leaves.forEach((l) => (l.position.y = 5 - gate.k * 10.2));
    gate.b.on = gate.k < 0.6;
    // frozen discs
    const list = x.ice || [];
    ice.forEach((o, i) => {
      const d = list[i];
      const age = d ? clk - d.t : 99;
      const alive = d && age < ICE_LIFE && age > -0.5;
      o.g.visible = !!alive;
      o.b.on = !!alive && age < ICE_LIFE - 0.4;
      if (!alive) return;
      const ly = d.z < GATE_Z ? tide : 0;
      const form = clamp(age / 0.3, 0, 1);
      const melt = clamp((age - (ICE_LIFE - 3)) / 3, 0, 1);
      const yy = iceTop(ly) - melt * 0.5;
      o.g.position.copy(P(d.x, yy, d.z));
      o.g.scale.set(form, 1, form);
      o.rim.material.opacity = (1 - melt) * 0.9;
      o.frostTop.material.opacity = 0.7 * (1 - melt);
      o.m.material.emissive.set(melt > 0 ? '#ff4a10' : '#0a1622').multiplyScalar(melt > 0 ? melt * (0.5 + 0.5 * Math.sin(t * 16)) : 1);
      setBox(o.b, d.x, yy - 0.3, d.z, 2.6, 0.6, 2.6);
    });
    // the raft
    const rz = v.rz;
    const ru = v.ru;
    const rx = cx(rz) + ru;
    raft.position.copy(P(rx, RAFT.top + Math.sin(t * 1.7) * 0.03, rz));
    raft.rotation.set(Math.sin(t * 1.1) * 0.012, 0, Math.sin(t * 1.3) * 0.015 + (v.lean || 0) * 0.04);
    setBox(raftBox, rx, RAFT.top - 0.3, rz, RAFT.hx * 2, 0.6, RAFT.hz * 2);
    raftBox.on = x.stage >= 1 && x.stage <= 3;
    raft.userData.arrows.forEach((a, i) => (a.material.opacity = 0.15 + Math.max(0, (i ? 1 : -1) * (v.lean || 0)) * 0.75));
    raft.userData.lantern.material.color.set('#ffb070').multiplyScalar(0.7 + Math.sin(t * 3) * 0.12);
    // lava falls
    falls.forEach((o, i) => {
      const on = fallOn(i, clk);
      o.k = damp(o.k, on === 1 ? 1 : 0, 5, dt);
      o.curtain.scale.y = Math.max(0.02, o.k);
      o.curtain.position.y = (1 - o.k) * 22;
      o.curtain.visible = o.k > 0.03;
      o.splash.material.opacity = on === 0.5 ? 0.35 + 0.35 * Math.sin(t * 20) : o.k * 0.8;
      if (on === 0.5 && Math.random() < dt * 10) Fx.burst(P(o.x + (Math.random() - 0.5) * o.f.len, 21.5, o.f.z), '#ff8a30', 4, 1, 0.8, -10);
    });
    // caldera tiles
    tiles.forEach((tl) => {
      if (tl.rim) return;
      const s = x.tsink;
      let d = null;
      if (s && inPattern(tl, s)) d = clk - s.t;
      const drop = x.stage >= 4 ? 0 : tileDrop(d);
      const warn = d != null && d < 2.2 && d >= 0;
      tl.m.position.y = O.y + TILE_TOP - 1.5 + drop + (warn ? shake(t, 0.5) : 0);
      tl.seam.material.opacity = warn ? 0.45 + 0.4 * Math.sin(t * 14) : d != null && d < SINK_LIFE ? 0.25 : 0;
      setBox(tl.b, CAL.x + tl.x, TILE_TOP - 1.5 + drop, CAL.z + tl.z, TILE, 3, TILE);
      tl.b.on = x.stage >= 3;
    });
    // after the fight: the pool crusts over, the column rises with the card
    const won = x.stage >= 4;
    poolCrust.on = won;
    const pk = (pillarCard.userData.k = damp(pillarCard.userData.k || 0, won ? 1 : 0, 0.8, dt));
    pillarCard.position.y = O.y - 6 + pk * 7.2;
    setBox(pillarCard.userData.box, CAL.x, -6 + pk * 7.2 - 4, CAL.z, 2.0, 8, 2.0);
    pillarCard.userData.box.on = won;
    card.visible = won && pk > 0.6;
    cardHeart.group.visible = won;
    if (won) {
      card.rotation.y = t * 0.8;
      card.position.y = O.y + 1.2 + pk * 1.6 + Math.sin(t * 2) * 0.12;
      cardHeart.U.uTime.value = t;
      cardHeart.U.uPx.value = R.renderer.getPixelRatio() * 0.22;
      cardHeart.U.uForm.value = Math.min(1, cardHeart.U.uForm.value + dt * 0.4);
    } else cardHeart.U.uForm.value = 0;
    // light that follows the player, from the lava below
    const pp = Player.body.p;
    lavaLight.position.set(pp.x, O.y + 0.4, pp.z + 2.5);
    lavaLight.intensity = won ? 0.8 : 1.5;
    heartLight.intensity = x.stage === 3 ? 2.4 + Math.sin(t * 3) * 0.4 : 0;
    // sky
    plume.forEach((s) => {
      const k = s.userData.k;
      const ph = (t * 0.01 + k / plume.length) % 1;
      s.position.set(Math.sin(k * 2.1) * 30 + ph * 120, 300 + ph * 260, Math.cos(k * 1.7) * 30);
      s.scale.setScalar(120 + ph * 260);
      s.material.opacity = 0.75 * Math.sin(ph * Math.PI);
    });
    dome.position.copy(R.camera.position);
    dome.material.uniforms.uTime.value = t;
    dome.material.uniforms.uWon.value = damp(dome.material.uniforms.uWon.value, won ? 1 : 0, 0.6, dt);
    embers.material.uniforms.uTime.value = t;
    embers.material.uniforms.uCam.value.copy(R.camera.position);
    embers.material.uniforms.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    embers.material.uniforms.uK.value = won ? 0.4 : 1;
    screen.update(dt, t);
    screen2.update(dt, t);
  };

  // ---------- sinking patterns in the caldera ----------
  const inPattern = (tl, s) => {
    const p = s.p;
    if (p === 'half') {
      const d = Math.cos(tl.a - s.a);
      return d > 0.05;
    }
    if (p === 'checker') return ((tl.i + tl.j + (s.a > 0 ? 1 : 0)) & 1) === 0;
    if (p === 'inner') return tl.r < 13.2;
    if (p === 'outer') return tl.r >= 13.2;
    if (p === 'cross') {
      const da = ((tl.a - s.a + TAU * 2) % (Math.PI / 2)) - Math.PI / 4;
      return Math.abs(da) > 0.35;
    }
    return false;
  };

  // ---------- queries ----------
  const rel = (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z);
  // the lava surface under a point (relative coords), for the lava check
  const lavaY = (q, x, clk) => (q.z < GATE_Z ? (x.stage === 1 ? tideAt(clk) : 0) : 0);
  const onRaft = (q, rz, ru) => Math.abs(q.x - (cx(rz) + ru)) < RAFT.hx + 0.1 && Math.abs(q.z - rz) < RAFT.hz + 0.1 && Math.abs(q.y - RAFT.top) < 0.6;
  const spawn = (x, who, v) => {
    const s = who === 'dame' ? -1 : 1;
    const st = x.stage;
    if (st <= 1) {
      const cp = x.cp || 0;
      if (cp === 0) return P(s * 2.2, TOP, -1);
      if (cp === 1) return P(s * 2.2, TOP, 25);
      return P(s * 2.2, TOP, 85);
    }
    if (st === 2) {
      if (!x.go) return P(s * 2.0, RAFT.top, RIVER.z0 - 3);
      return P(cx(v.rz) + v.ru + s * 1.1, RAFT.top + 0.05, v.rz - 0.8);
    }
    return P(CAL.x + s * 2.4, TILE_TOP, CAL.z - 21.5);
  };

  /** show the frost marker at a relative point; kind: 'ok', 'gey', 'no' (null hides it) */
  const aim = (p, kind, t) => {
    if (!aimMark) return;
    aimMark.visible = !!p;
    if (!p) return;
    aimMark.position.copy(P(p.x, p.y + 0.06, p.z));
    const col = kind === 'no' ? '#ff5a4a' : '#9fe6ff';
    aimMark.userData.ring.material.color.set(col).multiplyScalar(0.8);
    aimMark.userData.dot.material.color.set(col).multiplyScalar(0.8);
    aimMark.scale.setScalar(kind === 'gey' ? 1.35 : 1);
    aimMark.rotation.y = t * 0.8;
    aimMark.userData.ring.material.opacity = 0.45 + 0.2 * Math.sin(t * 6);
  };

  return {
    O,
    P,
    rel,
    aim,
    get built() {
      return built;
    },
    build,
    wake() {
      group.visible = true;
    },
    sleep,
    update,
    TOP,
    COLS,
    GEYSERS,
    G_R,
    G_H,
    LEVERS,
    RINGS_G,
    BRIDGE,
    GATE_Z,
    RIVER,
    RAFT,
    ROCKS,
    FALLS,
    CAL,
    TILE,
    TILE_TOP,
    POOL_R,
    WALL_R,
    COL_LIFE,
    CRUMB_LIFE,
    ICE_LIFE,
    SINK_LIFE,
    cx,
    tideAt,
    tideWarn,
    geyserState,
    eruptK,
    fallOn,
    colDrop,
    tileDrop,
    inPattern,
    lavaY,
    onRaft,
    spawn,
    tiles,
    get raftBox() {
      return raftBox;
    },
    get screen() {
      return screen;
    },
    get screen2() {
      return screen2;
    },
    ringPos: (i) => P(...RINGS_G[i].p),
    ringLand: (i) => P(...RINGS_G[i].land),
    nearLever: (q, id) => {
      const p = LEVERS[id];
      return Math.hypot(q.x - p.x, q.z - p.z) < 2.2 && Math.abs(q.y - p.y) < 1.3;
    },
    colUnder: (body) => cols.findIndex((o) => o.b === body.ground),
    bridgeUnder: (body) => bridge.findIndex((o) => o.b === body.ground),
    tileUnder: (body) => tiles.find((o) => o.b === body.ground) || null,
    onDock: (q) => q.z > GATE_Z + 4 && q.z < RIVER.z0 + 8 && q.y > 0.4,
    pastGate: (q) => q.z > GATE_Z + 2,
    inArena: (q) => Math.hypot(q.x - CAL.x, q.z - CAL.z) < WALL_R + 1 && q.z > RIVER.z1 + 12,
    nearCard: (q) => Math.hypot(q.x - CAL.x, q.z - CAL.z) < 3.2,
    // a ray from the camera against the lava sheet (relative y), within range of the shooter
    lavaHit(o, dir, ly, max = 22) {
      if (dir.y > -0.02) return null;
      const t = (O.y + ly - o.y) / dir.y;
      if (t < 0 || t > max + 12) return null;
      const p = o.clone().addScaledVector(dir, t);
      return rel(p);
    },
    geyserNear(q, r = 2.6) {
      return GEYSERS.findIndex((g) => Math.hypot(q.x - g.x, q.z - g.z) < r);
    },
    // solid ground (other than lava) close under a relative point: frost is wasted there
    solidAt(q) {
      return Phys.groundAt(O.x + q.x, O.y + q.y + 3, O.z + q.z) - O.y > q.y - 0.2;
    },
  };
})();
