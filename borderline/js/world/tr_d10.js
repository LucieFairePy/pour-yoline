// ♦ 10 · Le Lac gelé: a frozen lake in a basin under the storm, at night, an aurora over it. The
// crossing is a lane of ice slabs between two channels of open, smoking water and walls of piled
// ice. One player walks on it and sees the cracks under the powder snow, only close to their feet;
// the other kneels at a fishing hole and sees, under the ice, what the cracks cannot say: the keels
// that bear (◆) and the hollow ice full of bubbles (○), mirrored as anything seen from below.
// Six fields of slabs (three crossings, then three in the storm), islets between them, a rock ridge
// along the third field, the card on the far shore.
const D10 = (() => {
  const O = V3(-3500, 0, 11200);
  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);
  // what follows the camera (snow, the under-ice motes) is never culled by distance
  const wx = new THREE.Group();
  wx.visible = false;
  wx.userData.noCull = true;
  R.scene.add(wx);
  // what only the one leaning over the hole sees (symbols, light shafts, the walker's glow)
  const under = new THREE.Group();
  under.visible = false;
  under.userData.noCull = true;
  R.scene.add(under);
  const K = LvKit.builder(O, root);
  const P = K.P;
  const rel = K.rel;
  const glow = LvKit.glow;

  // ---------- layout (relative to O) ----------
  const S = 2.6; // slab pitch
  const SLAB = 2.46; // slab size (the rest is a hairline of black water)
  const TH = 0.36; // ice thickness
  const LAND_Y = 0.3;
  // fields of slabs: cols x rows from z0; the reader's hole [x, z] and the way they face it
  const GRIDS = [
    { cols: 4, rows: 5, z0: 0.4, hole: [-8.2, -1.9], face: [0, 1] },
    { cols: 5, rows: 6, z0: 26.4, hole: [8.3, 24.3], face: [-1, 0] },
    { cols: 5, rows: 7, z0: 54.4, hole: [4.4, 74.8], face: [0, -1] },
    { cols: 5, rows: 4, z0: 90.4, hole: [-8.3, 88.4], face: [0, 1] },
    { cols: 5, rows: 4, z0: 110.4, hole: [8.3, 108.4], face: [-1, 0] },
    { cols: 5, rows: 4, z0: 130.4, hole: [-8.3, 128.4], face: [1, 0] },
  ];
  GRIDS.forEach((G, i) => {
    G.i = i;
    G.n = G.cols * G.rows;
    G.hw = (G.cols * S) / 2;
    G.z1 = G.z0 + G.rows * S;
    G.zc = (G.z0 + G.z1) / 2;
    // the camera under the ice frames the whole field (long side across the screen when it can)
    const side = G.face[0] !== 0;
    G.depth = ((side ? G.cols : G.rows) * S + 1) / 0.7;
  });
  const cellPos = (G, i) => {
    const col = i % G.cols;
    const row = Math.floor(i / G.cols);
    return [-G.hw + S / 2 + col * S, G.z0 + S / 2 + row * S];
  };
  // land: [x0, x1, z0, z1]
  const LANDS = [
    { id: 'shore', r: [-13, 13, -36, GRIDS[0].z0 - 0.06] },
    { id: 'A', r: [-9.6, 9.6, GRIDS[0].z1 + 0.06, GRIDS[1].z0 - 0.06] },
    { id: 'B', r: [-9.6, 10.4, GRIDS[1].z1 + 0.06, GRIDS[2].z0 - 0.06] },
    { id: 'C', r: [-9.6, 15.5, GRIDS[2].z1 + 0.06, GRIDS[3].z0 - 0.06] },
    { id: 'D', r: [-9.6, 9.6, GRIDS[3].z1 + 0.06, GRIDS[4].z0 - 0.06] },
    { id: 'E', r: [-9.6, 9.6, GRIDS[4].z1 + 0.06, GRIDS[5].z0 - 0.06] },
    { id: 'far', r: [-13, 13, GRIDS[5].z1 + 0.06, 178] },
  ];
  // the rock ridge along the third field (only the grapple reaches its top), its steps down to C
  const RIDGE = { x0: 10.4, x1: 15.5, z0: 44, z1: 74, top: 6.2 };
  const RIDGE_STEPS = [
    [74, 75.5, 4.9],
    [75.5, 77, 3.6],
    [77, 78.5, 2.3],
    [78.5, 80, 1.0],
  ];
  const RING = { pos: [9.4, 10.0, 46.6], land: [13, RIDGE.top, 49] };
  const LANE = { x: 10.4, wall: 24, z0: GRIDS[0].z0 - 0.06, z1: GRIDS[5].z1 + 0.06 };
  const CARD = V3(0, 1.7, 156);
  const SPAWN0 = [
    [-1.2, LAND_Y, -14],
    [1.2, LAND_Y, -14],
  ];

  let built = false;
  const tmp = V3();
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const ONE = V3(1, 1, 1);
  let screen = null;
  let card = null;

  // ---------- scanned materials (Poly Haven, lazily for this level only) ----------
  // Tex.mat's triplanar shader with this level's own maps: the procedural kind stands in until the
  // scan is there (or for good with ?noassets); nothing global is swapped
  const scan = (kind, id, mul, opt) => {
    const m = Tex.mat(kind, Object.assign({}, opt, { d10: id }));
    if (!m.onBeforeCompile || !Tex.build) return m;
    const T = Tex.build(kind);
    const U = {
      tAlb: { value: T.uAlb.value },
      tDat: { value: T.uDat.value },
      triMul: { value: 1 },
      triNrm: { value: 0 },
    };
    const ob = m.onBeforeCompile;
    m.onBeforeCompile = (sh) => {
      ob(sh);
      Object.assign(sh.uniforms, U);
    };
    m.customProgramCacheKey = () => 'tri|' + (typeof Look !== 'undefined' ? 'look' : '');
    Promise.all([Assets.get(id + '.alb'), Assets.get(id + '.nrm')])
      .then(([a, d]) => {
        [a, d].forEach((t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.needsUpdate = true;
        });
        U.tAlb.value = a;
        U.tDat.value = d;
        U.triMul.value = mul;
        U.triNrm.value = 1;
      })
      .catch(() => {});
    return m;
  };
  const M = {};
  const makeMats = () => {
    M.snow = scan('sand', 'tex.d10snow', 0.55, { color: '#b4c2d8', scale: 3, rough: 0.9, bump: 1.1 });
    M.snowB = scan('sand', 'tex.d10snow', 0.55, { color: '#97a6be', scale: 4, rough: 0.95, bump: 1.2 });
    M.rock = scan('rock', 'tex.d10rock', 0.5, { color: '#7d8796', scale: 3, rough: 0.85, bump: 1.2 });
    M.rockD = scan('rock', 'tex.d10rock', 0.5, { color: '#4a5260', scale: 6, rough: 0.9, bump: 1.4 });
    M.cliff = scan('rock', 'tex.d10rock', 0.5, { color: '#3a4250', scale: 10, rough: 0.9, bump: 1.6 });
    // the existing Poly Haven planks of Terre 39, reused for the windbreaks and the sled
    M.wood = scan('wood', 'tex.wood', 0.75, { color: '#6e5040', scale: 2.4, rough: 0.7 });
    M.iron = new THREE.MeshStandardMaterial({ color: '#2a2e36', roughness: 0.45, metalness: 0.7 });
    M.chaosS = new THREE.MeshStandardMaterial({ color: '#dfe9f6', roughness: 0.92 });
    M.pine = new THREE.MeshStandardMaterial({ color: '#132019', roughness: 0.95 });
    M.pineS = new THREE.MeshStandardMaterial({ color: '#b8c6da', roughness: 0.9 });
    M.bark = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.95 });
    M.cloth = new THREE.MeshStandardMaterial({ color: '#7a2a34', roughness: 0.85 });
    M.clothB = new THREE.MeshStandardMaterial({ color: '#2c3a5a', roughness: 0.85 });
    M.lamp = glow('#ffb46a', 2.2);
    M.ring = new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.35, metalness: 0.8, emissive: '#ffb070', emissiveIntensity: 0.5 });
  };

  // ---------- textures drawn once ----------
  const T = {};
  const crackPath = (g, r, x, y, a, len, w, depth) => {
    let px = x;
    let py = y;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(px, py);
    const n = Math.max(3, Math.floor(len / 9));
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 0.9;
      px += Math.cos(a) * (len / n);
      py += Math.sin(a) * (len / n);
      g.lineTo(px, py);
      if (depth > 0 && r() < 0.18) {
        g.stroke();
        crackPath(g, r, px, py, a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.7), len * (0.25 + r() * 0.35), w * 0.65, depth - 1);
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(px, py);
      }
    }
    g.stroke();
  };
  // atlas 4 x 2 cells of 256: 0-3 cracks (R = the white fractured edge, G = the dark core),
  // 4 footprints (B), 5 the web of a slab that groans, 6 frozen bubbles (decor)
  const makeCracks = () => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 1024, 512);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const cell = (k, fn) => {
      g.save();
      g.translate((k % 4) * 256, Math.floor(k / 4) * 256);
      g.beginPath();
      g.rect(6, 6, 244, 244);
      g.clip();
      fn();
      g.restore();
    };
    const crackCell = (k, seed, kind) => {
      const r = rng(seed);
      cell(k, () => {
        const draw = (pass) => {
          const rr = rng(seed);
          g.strokeStyle = pass ? 'rgb(0,255,0)' : 'rgba(255,0,0,0.55)';
          g.shadowColor = 'rgb(255,0,0)';
          g.shadowBlur = pass ? 0 : 10;
          const w = pass ? 1.6 : 5;
          if (kind === 'star') {
            const cx = 90 + rr() * 76;
            const cy = 90 + rr() * 76;
            const m = 6 + Math.floor(rr() * 3);
            for (let i = 0; i < m; i++) crackPath(g, rr, cx, cy, (i / m) * TAU + rr() * 0.4, 80 + rr() * 70, w, 2);
            g.beginPath();
            g.lineWidth = w * 0.7;
            for (let i = 0; i <= m * 2; i++) {
              const a = (i / (m * 2)) * TAU;
              const rad = 22 + rr() * 16;
              g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
            }
            g.stroke();
          } else if (kind === 'line') {
            crackPath(g, rr, rr() * 40, 40 + rr() * 170, -0.2 + rr() * 0.4, 280, w, 3);
            crackPath(g, rr, 60 + rr() * 140, 250, -1.4 - rr() * 0.4, 160, w * 0.8, 2);
          } else {
            for (let i = 0; i < 4; i++) crackPath(g, rr, rr() * 256, rr() * 256, rr() * TAU, 120 + rr() * 90, w, 2);
          }
        };
        draw(0);
        draw(1);
        void r;
      });
    };
    crackCell(0, 11, 'star');
    crackCell(1, 23, 'line');
    crackCell(2, 37, 'web');
    crackCell(3, 51, 'line');
    // footprints: two boots, walking up the cell
    cell(4, () => {
      g.fillStyle = 'rgb(0,0,255)';
      g.shadowColor = 'rgb(0,0,255)';
      g.shadowBlur = 6;
      for (let i = 0; i < 4; i++) {
        const x = 128 + (i % 2 ? 22 : -22);
        const y = 220 - i * 56;
        g.beginPath();
        g.ellipse(x, y, 12, 20, (i % 2 ? 0.08 : -0.08), 0, TAU);
        g.fill();
        g.beginPath();
        g.ellipse(x, y + 26, 9, 9, 0, 0, TAU);
        g.fill();
      }
    });
    // the groaning slab: a dense web from the middle
    cell(5, () => {
      const rr = rng(77);
      g.strokeStyle = 'rgba(255,0,0,0.6)';
      g.shadowColor = 'rgb(255,0,0)';
      g.shadowBlur = 8;
      for (let i = 0; i < 11; i++) crackPath(g, rr, 128, 128, (i / 11) * TAU, 120 + rr() * 30, 4, 2);
      g.shadowBlur = 0;
      g.strokeStyle = 'rgb(0,255,0)';
      const r2 = rng(77);
      for (let i = 0; i < 11; i++) crackPath(g, r2, 128, 128, (i / 11) * TAU, 120 + r2() * 30, 1.4, 2);
    });
    // frozen bubbles, decor inside every slab
    cell(6, () => {
      const rr = rng(91);
      for (let i = 0; i < 70; i++) {
        const x = rr() * 256;
        const y = rr() * 256;
        const s = 1 + rr() * 5;
        g.strokeStyle = `rgba(255,0,0,${0.3 + rr() * 0.5})`;
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, s, 0, TAU);
        g.stroke();
      }
    });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  };
  const numeral = (n) =>
    LvKit.tex(256, 256, (g, w, h) => {
      g.fillStyle = '#e8f2ff';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#7da4c4';
      g.lineWidth = 10;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#18324a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 120px Georgia';
      g.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n], w / 2, h / 2 + 6);
    });
  const soft = () =>
    LvKit.tex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    });

  // ---------- shared shader bits ----------
  const SH = {
    time: { value: 0 },
    me: { value: V3() },
    crackK: { value: 0 },
    crackR: { value: 3 },
    reformZ: { value: -1e4 },
    sky: { value: new THREE.Color('#5a7aa8') },
    hor: { value: new THREE.Color('#16263a') },
    aur: { value: new THREE.Color('#3cd6a0') },
    moon: { value: V3(-0.3, 0.36, 0.88).normalize() },
    storm: { value: 0 },
    lean: { value: 0 },
  };
  const NOISE = `
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }`;

  // the ice of the slabs: fresnel reflection of the aurora sky, a moon glint, a deep subsurface
  // tint with frozen bubbles at two depths (parallax), powder snow, and the cracks: drawn only on
  // the walker's screen, only close to their feet. Seen from below: light through the ice, darker
  // where the snow lies, and never a crack.
  const iceMat = () => {
    const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(U, {
      uTime: SH.time,
      uMe: SH.me,
      uCrackK: SH.crackK,
      uCrackR: SH.crackR,
      uReformZ: SH.reformZ,
      uSky: SH.sky,
      uHor: SH.hor,
      uAur: SH.aur,
      uMoon: SH.moon,
      uStorm: SH.storm,
      tCrack: { value: T.crack },
    });
    return new THREE.ShaderMaterial({
      uniforms: U,
      fog: true,
      transparent: true,
      vertexShader: `
        attribute vec4 aInfo;
        varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec4 vInfo; varying vec3 vC;
        #include <fog_pars_vertex>
        void main() {
          mat4 m = modelMatrix;
          #ifdef USE_INSTANCING
            m = modelMatrix * instanceMatrix;
          #endif
          vec4 wp = m * vec4(position, 1.0);
          vW = wp.xyz;
          vN = normalize(mat3(m) * normal);
          vUv = position.xz / ${SLAB.toFixed(2)} + 0.5;
          vInfo = aInfo;
          vC = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime, uCrackK, uCrackR, uReformZ, uStorm;
        uniform vec3 uMe, uSky, uHor, uAur, uMoon;
        uniform sampler2D tCrack;
        varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec4 vInfo; varying vec3 vC;
        #include <fog_pars_fragment>
        ${NOISE}
        vec4 cellAt(float k, vec2 uv) {
          uv = clamp(uv, 0.01, 0.99);
          vec2 c = vec2(mod(k, 4.0), floor(k / 4.0));
          // the canvas is flipped (row 0 on top)
          return texture2D(tCrack, vec2((c.x + uv.x) / 4.0, (1.0 - c.y + uv.y) / 2.0));
        }
        vec2 rot(vec2 uv, float k) {
          float a = floor(k * 4.0) * 1.5707963;
          vec2 p = uv - 0.5;
          float s = sin(a), c = cos(a);
          return vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
        }
        void main() {
          vec3 V = normalize(cameraPosition - vW);
          vec3 N = normalize(vN);
          float e = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
          // powder blown along the lane in streaks, banked against the slab edges
          float snowN = fbm(vec2(vW.x * 0.8, vW.z * 2.3) + 3.0) * 0.65 + fbm(vW.xz * 5.0) * 0.35;
          float snow = smoothstep(0.55, 0.86, snowN + e * e * e * 0.5);
          vec3 col;
          float a = 1.0;
          if (N.y > 0.5) {
            // ----- the top: what the walker sees -----
            vec2 nz = vec2(vn(vW.xz * 7.0) - 0.5, vn(vW.zx * 7.0 + 9.0) - 0.5) * 0.06;
            vec3 Nn = normalize(vec3(nz.x, 1.0, nz.y));
            float ndv = max(dot(Nn, V), 0.0);
            float F = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
            vec3 Rf = reflect(-V, Nn);
            vec3 sky = mix(uHor, uSky, smoothstep(0.0, 0.6, Rf.y));
            sky += uAur * pow(max(0.0, 1.0 - abs(Rf.y - 0.35) * 2.2), 3.0) * (0.55 + 0.45 * sin(vW.x * 0.08 + uTime * 0.3)) * (1.0 - uStorm * 0.6);
            // subsurface: deep water through clear ice, bubbles frozen at two depths
            vec3 deep = mix(vec3(0.005, 0.018, 0.042), vec3(0.03, 0.085, 0.16), vn(vW.xz * 0.35) * 0.8 + 0.2 * vn(vW.xz * 2.0));
            vec2 par = V.xz / max(V.y, 0.25);
            float b1 = cellAt(6.0, fract((vW.xz - par * 0.12) * 0.42)).r;
            float b2 = cellAt(6.0, fract((vW.xz - par * 0.28) * 0.31 + 0.37)).r;
            float veins = smoothstep(0.62, 0.7, fbm((vW.xz - par * 0.2) * 1.3));
            vec3 ice = deep + vec3(0.55, 0.78, 0.9) * (b1 * 0.1 + b2 * 0.06 + veins * 0.06);
            // the chipped rim of each slab catches the light
            ice = mix(ice, vec3(0.45, 0.62, 0.72), smoothstep(0.9, 0.99, e) * 0.55);
            col = mix(ice, sky, F);
            // the moon on the ice, and a sparkle in the snow
            // the moon's path on the ice, far ahead: sharp glints on the clear ice only
            vec3 Rs = reflect(-V, normalize(vec3(nz.x * 0.4, 1.0, nz.y * 0.4)));
            float sp = pow(max(dot(Rs, uMoon), 0.0), 900.0) * 1.6 + pow(max(dot(Rs, uMoon), 0.0), 40.0) * 0.06;
            col += vec3(0.85, 0.92, 1.0) * sp * (1.0 - snow);
            vec3 snowC = vec3(0.7, 0.77, 0.88) * (0.84 + 0.16 * vn(vW.xz * 13.0));
            snowC *= 0.72 + 0.28 * max(dot(vec3(0.0, 1.0, 0.0), uMoon), 0.0);
            float glint = step(0.985, h21(floor(vW.xz * 40.0))) * pow(max(dot(Rf, uMoon), 0.0), 6.0);
            snowC += vec3(1.0) * glint * 1.6;
            col = mix(col, snowC, snow * 0.92 + 0.06);
            // footprints: the snow pressed, the dark ice shows
            if (vInfo.y > 0.5) {
              float fp = cellAt(4.0, fract(vUv)).b;
              col = mix(col, deep * 1.6 + vec3(0.04, 0.07, 0.1), fp * 0.85);
            }
            // cracks, near the walker only
            float vis = uCrackK * (1.0 - smoothstep(uCrackR - 0.4, uCrackR + 0.6, distance(vC.xz, uMe.xz)));
            if (vInfo.x > 0.5 && vis > 0.0) {
              vec2 cu = rot(vUv, vInfo.w);
              // the crack goes down into the ice: its plane drawn again a little deeper, bluer
              vec4 c0 = cellAt(vInfo.x - 1.0, cu);
              vec4 c1 = cellAt(vInfo.x - 1.0, rot(vUv - par * 0.04, vInfo.w));
              vec4 c2 = cellAt(vInfo.x - 1.0, rot(vUv - par * 0.09, vInfo.w));
              col = mix(col, vec3(0.45, 0.75, 0.9), max(c1.r, c2.r * 0.7) * vis * 0.7);
              col = mix(col, vec3(0.92, 0.98, 1.0), min(1.0, c0.r * 1.6) * vis);
              col = mix(col, vec3(0.0, 0.01, 0.02), c0.g * vis);
            }
            // a slab that groans: its web shows on every screen
            if (vInfo.z > 0.01) {
              vec2 gu = (vUv - 0.5) / max(vInfo.z, 0.05) + 0.5;
              if (gu.x > 0.0 && gu.x < 1.0 && gu.y > 0.0 && gu.y < 1.0) {
                vec4 c5 = cellAt(5.0, gu);
                col = mix(col, vec3(0.95, 0.98, 1.0), c5.r * 0.9);
                col = mix(col, vec3(0.0, 0.02, 0.04), c5.g);
              }
            }
            // the ice reforming after a fall: a band of white frost runs across the field
            float rf = exp(-pow((vW.z - uReformZ) * 0.6, 2.0));
            col = mix(col, vec3(0.85, 0.95, 1.0), rf * 0.75);
            a = 0.97;
          } else if (N.y < -0.5) {
            // ----- the underside: light through the ice -----
            float th = 1.0 - snow * 0.75;
            col = mix(vec3(0.12, 0.38, 0.5), vec3(0.6, 0.88, 1.0), th * (0.55 + 0.45 * vn(vW.xz * 1.5 + uTime * 0.05)));
            col *= 0.55 + 0.45 * th;
            float b = cellAt(6.0, fract(vW.xz * 0.42)).r;
            col += vec3(0.6, 0.85, 1.0) * b * 0.12;
            a = 0.5 + snow * 0.3;
          } else {
            float F = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            col = mix(vec3(0.03, 0.12, 0.16), vec3(0.35, 0.6, 0.72), F);
            col = mix(col, vec3(0.75, 0.82, 0.92), smoothstep(0.08, 0.0, abs(vW.y)) * 0.5);
            a = 0.92;
          }
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }`,
    });
  };

  // the piled-up ice of the chaos: thick blue-green ice lit from inside by the snow light, powder
  // on whatever faces up, white where a block broke
  const chaosMat = () => {
    const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(U, { uSky: SH.sky, uHor: SH.hor, uAur: SH.aur, uMoon: SH.moon, uStorm: SH.storm });
    return new THREE.ShaderMaterial({
      uniforms: U,
      fog: true,
      vertexShader: `
        varying vec3 vW; varying vec3 vN;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform vec3 uSky, uHor, uAur, uMoon; uniform float uStorm;
        varying vec3 vW; varying vec3 vN;
        #include <fog_pars_fragment>
        ${NOISE}
        void main() {
          vec3 N = normalize(vN);
          vec3 V = normalize(cameraPosition - vW);
          float ndv = max(dot(N, V), 0.0);
          float F = 0.04 + 0.96 * pow(1.0 - ndv, 4.0);
          vec3 Rf = reflect(-V, N);
          vec3 sky = mix(uHor, uSky, smoothstep(-0.1, 0.6, Rf.y)) + uAur * 0.4 * smoothstep(0.1, 0.5, Rf.y);
          // thick ice: dark at the core, glowing toward the thin edges seen edge-on
          float n = fbm(vW.xz * 0.6 + vW.y * 0.8);
          vec3 body = mix(vec3(0.03, 0.1, 0.14), vec3(0.2, 0.42, 0.52), pow(1.0 - ndv, 1.5) * 0.7 + n * 0.3);
          // frozen bubbles and white veins inside the block
          body += vec3(0.5, 0.7, 0.8) * smoothstep(0.62, 0.7, fbm(vW.xy * 1.3 + vW.z * 0.7)) * 0.12;
          vec3 col = mix(body, sky, F * 0.8);
          col += vec3(0.8, 0.9, 1.0) * pow(max(dot(Rf, uMoon), 0.0), 120.0) * 0.8;
          // powder on the faces that look up
          float sn = smoothstep(0.45, 0.8, N.y + (fbm(vW.xz * 2.0) - 0.5) * 0.5);
          col = mix(col, vec3(0.66, 0.73, 0.84) * (0.8 + 0.2 * vn(vW.xz * 9.0)), sn);
          col *= 1.0 - uStorm * 0.25;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    });
  };

  // the open water: black, rippled, the sky in it, a breath of mist where it meets the cold air
  const waterMat = (k = 1) => {
    const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(U, { uTime: SH.time, uSky: SH.sky, uHor: SH.hor, uAur: SH.aur, uMoon: SH.moon, uK: { value: k } });
    return new THREE.ShaderMaterial({
      uniforms: U,
      fog: true,
      vertexShader: `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime, uK; uniform vec3 uSky, uHor, uAur, uMoon;
        varying vec3 vW;
        #include <fog_pars_fragment>
        ${NOISE}
        void main() {
          vec3 V = normalize(cameraPosition - vW);
          vec2 p = vW.xz;
          float t = uTime;
          vec2 g = vec2(fbm(p * 0.7 + vec2(t * 0.12, 0.0)) - fbm(p * 0.7 + vec2(0.3, t * 0.1) + 5.0),
                        fbm(p * 0.9 + vec2(0.0, t * 0.15) + 9.0) - fbm(p * 0.9 + vec2(t * 0.08, 0.0) + 2.0));
          vec3 N = normalize(vec3(g.x * 0.28, 1.0, g.y * 0.28));
          float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 Rf = reflect(-V, N);
          vec3 sky = mix(uHor, uSky, smoothstep(0.0, 0.5, Rf.y)) + uAur * 0.35 * pow(max(0.0, 1.0 - abs(Rf.y - 0.3) * 2.0), 3.0);
          vec3 col = mix(vec3(0.004, 0.012, 0.02), sky, F * 0.9);
          col += vec3(0.8, 0.9, 1.0) * pow(max(dot(Rf, uMoon), 0.0), 400.0) * 1.1;
          col *= uK;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    });
  };

  // what lies under the slabs, for the eyes at the hole: ◆ a keel of clear ice (the slab bears),
  // ○ a cloud of bubbles (the ice is hollow). Drawn as distance fields, additive.
  const symMat = () =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: SH.time },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSym; attribute float aSeed;
        varying vec2 vUv; varying float vS; varying float vSeed;
        void main() {
          vUv = uv; vS = aSym; vSeed = aSeed;
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = aSym < 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv; varying float vS; varying float vSeed;
        float h(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          vec3 col = vec3(0.0);
          float pulse = 0.85 + 0.15 * sin(uTime * 2.0 + vSeed * 20.0);
          if (vS < 1.5) {
            float d = abs(p.x) + abs(p.y);
            float ring = smoothstep(0.08, 0.0, abs(d - 0.62));
            float fill = smoothstep(0.5, 0.42, d) * 0.45;
            float halo = exp(-d * 2.6) * 0.5;
            col = vec3(1.0, 0.86, 0.52) * (ring * 1.6 + fill + halo) * pulse;
          } else {
            float a = 0.0;
            for (int i = 0; i < 9; i++) {
              float fi = float(i);
              vec2 c = vec2(h(vSeed * 13.1 + fi * 7.3), h(vSeed * 3.7 + fi * 11.9)) * 1.2 - 0.6;
              float r = 0.08 + h(fi * 5.1 + vSeed) * 0.16;
              float d = length(p - c);
              a += smoothstep(0.035, 0.0, abs(d - r)) + smoothstep(r, 0.0, d) * 0.12;
            }
            float big = smoothstep(0.06, 0.0, abs(length(p) - 0.78)) * 0.6;
            col = vec3(0.7, 0.92, 1.0) * (a + big) * pulse;
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });

  // ---------- the slabs ----------
  const fields = [];
  const makeField = (G) => {
    const geo = new THREE.BoxGeometry(SLAB, TH, SLAB, 1, 1, 1).translate(0, -TH / 2, 0);
    const info = new Float32Array(G.n * 4);
    const mesh = new THREE.InstancedMesh(geo, iceMat(), G.n);
    geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    const cols = [];
    const st = [];
    for (let i = 0; i < G.n; i++) {
      const [x, z] = cellPos(G, i);
      tmpM.makeTranslation(O.x + x, O.y, O.z + z);
      mesh.setMatrixAt(i, tmpM);
      cols.push(Phys.box(O.x + x, O.y - TH / 2, O.z + z, S, TH, S, { tag: 'ice' }));
      st.push({ x, z, brk: 0, sink: 0, tilt: [0, 0], groan: 0 });
    }
    root.add(mesh);
    // symbols under the slabs
    const sg = new THREE.PlaneGeometry(1.7, 1.7).rotateX(Math.PI / 2);
    const sym = new Float32Array(G.n);
    const seed = new Float32Array(G.n);
    sg.setAttribute('aSym', new THREE.InstancedBufferAttribute(sym, 1));
    sg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    const sm = new THREE.InstancedMesh(sg, symMat(), G.n);
    for (let i = 0; i < G.n; i++) {
      const [x, z] = cellPos(G, i);
      tmpM.makeTranslation(O.x + x, O.y - TH - 0.05, O.z + z);
      sm.setMatrixAt(i, tmpM);
      seed[i] = Math.random();
    }
    sm.frustumCulled = false;
    sm.renderOrder = 4;
    under.add(sm);
    const f = { G, mesh, info, cols, st, sm, sym, dirty: true };
    fields.push(f);
    return f;
  };
  const setField = (gi, cells, trod) => {
    const f = fields[gi];
    if (!f) return;
    for (let i = 0; i < f.G.n; i++) {
      const c = cells ? cells[i] : null;
      f.info[i * 4] = c && c.crack ? c.crack : 0;
      f.info[i * 4 + 1] = trod && trod.includes(i) ? 1 : 0;
      f.info[i * 4 + 3] = c ? c.rot : 0;
      f.sym[i] = c ? c.sym : 0;
    }
    f.mesh.geometry.attributes.aInfo.needsUpdate = true;
    f.sm.geometry.attributes.aSym.needsUpdate = true;
  };
  const setTrod = (gi, trod) => {
    const f = fields[gi];
    if (!f) return;
    for (let i = 0; i < f.G.n; i++) f.info[i * 4 + 1] = trod && trod.includes(i) ? 1 : 0;
    f.mesh.geometry.attributes.aInfo.needsUpdate = true;
  };
  const setGroan = (gi, i, k) => {
    const f = fields[gi];
    if (!f || i < 0) return;
    if (Math.abs(f.info[i * 4 + 2] - k) < 0.01) return;
    f.info[i * 4 + 2] = k;
    f.mesh.geometry.attributes.aInfo.needsUpdate = true;
  };
  const clearGroan = (gi) => {
    const f = fields[gi];
    if (!f) return;
    let ch = false;
    for (let i = 0; i < f.G.n; i++)
      if (f.info[i * 4 + 2] !== 0) {
        f.info[i * 4 + 2] = 0;
        ch = true;
      }
    if (ch) f.mesh.geometry.attributes.aInfo.needsUpdate = true;
  };
  // a slab gives way: its collider goes, it tips and sinks, shards and black water
  const breakSlab = (gi, i) => {
    const f = fields[gi];
    if (!f || i < 0 || i >= f.G.n) return;
    const s = f.st[i];
    if (s.brk) return;
    s.brk = 1;
    s.sink = 0;
    s.tilt = [(Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2];
    f.cols[i].on = false;
    const p = P(s.x, 0.1, s.z);
    Fx.burst(p, '#cfeaff', 70, 4, 0.9, -9);
    Fx.burst(p.clone().add(V3(0, -0.2, 0)), '#16323e', 40, 3, 0.7, -6);
    AU.crack(p, 1);
    setTimeout(() => AU.splash(p, 1), 220);
  };
  const resetField = (gi) => {
    const f = fields[gi];
    if (!f) return;
    f.st.forEach((s, i) => {
      s.brk = 0;
      s.sink = 0;
      f.cols[i].on = true;
      tmpM.makeTranslation(O.x + s.x, O.y, O.z + s.z);
      f.mesh.setMatrixAt(i, tmpM);
    });
    f.mesh.instanceMatrix.needsUpdate = true;
    clearGroan(gi);
  };
  const tickFields = (dt) => {
    fields.forEach((f) => {
      let ch = false;
      f.st.forEach((s, i) => {
        if (!s.brk) return;
        s.sink = Math.min(1, s.sink + dt * 0.9);
        const k = smooth(s.sink);
        tmpE.set(s.tilt[0] * k, 0, s.tilt[1] * k);
        tmpQ.setFromEuler(tmpE);
        tmpM.compose(tmp.set(O.x + s.x, O.y - k * 1.6, O.z + s.z), tmpQ, ONE);
        f.mesh.setMatrixAt(i, tmpM);
        ch = true;
      });
      if (ch) f.mesh.instanceMatrix.needsUpdate = true;
    });
  };
  // which slab is under q (relative), or -1
  const cellAt = (gi, q) => {
    const G = GRIDS[gi];
    if (!G) return -1;
    if (q.z < G.z0 || q.z > G.z1 || Math.abs(q.x) > G.hw) return -1;
    const col = clamp(Math.floor((q.x + G.hw) / S), 0, G.cols - 1);
    const row = clamp(Math.floor((q.z - G.z0) / S), 0, G.rows - 1);
    return row * G.cols + col;
  };
  const gridOf = (q) => GRIDS.findIndex((G) => q.z >= G.z0 - 0.05 && q.z <= G.z1 + 0.05 && Math.abs(q.x) <= G.hw + 0.05);

  // ---------- sky, aurora, snow ----------
  const auroraMat = (c1, c2, seed) =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: SH.time, uA: { value: new THREE.Color(c1) }, uB: { value: new THREE.Color(c2) }, uSeed: { value: seed }, uK: { value: 1 } },
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime, uSeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(uv.x * 9.0 + uTime * 0.13 + uSeed) * 18.0 + sin(uv.x * 23.0 - uTime * 0.21) * 6.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime, uSeed, uK; uniform vec3 uA, uB;
        varying vec2 vUv;
        ${NOISE}
        void main() {
          float x = vUv.x * 14.0 + uSeed * 5.0;
          float folds = pow(vn(vec2(x, uTime * 0.12)), 2.0) * 0.8 + vn(vec2(x * 4.0, uTime * 0.3)) * 0.35;
          float rays = 0.55 + 0.45 * vn(vec2(vUv.x * 120.0, uTime * 0.6));
          float bottom = smoothstep(0.0, 0.12, vUv.y);
          float fade = pow(1.0 - vUv.y, 1.6);
          float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
          vec3 col = mix(uA, uB, smoothstep(0.2, 0.85, vUv.y));
          float a = folds * rays * bottom * fade * ends * uK;
          gl_FragColor = vec4(col * a * 0.9, 1.0);
        }`,
    });
  // falling snow in a box that follows the camera, carried by the wind (uOff accumulates the drift)
  const snowPts = (o) => {
    const N = o.n;
    const W = o.box[0];
    const H = o.box[1];
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    const a = new Float32Array(N * 2);
    const r = rng(o.seed || 5);
    for (let i = 0; i < N; i++) {
      p.set([r() * W - W / 2, r() * H, r() * W - W / 2], i * 3);
      a.set([r(), r()], i * 2);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(a, 2));
    const U = { uTime: { value: 0 }, uCam: { value: V3() }, uOff: { value: V3() }, uPx: { value: 1 }, uK: { value: 1 }, uCol: { value: new THREE.Color(o.color) } };
    const f = (v) => (Number.isInteger(v) ? v + '.0' : String(v));
    const pts = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `
          uniform float uTime, uPx; uniform vec3 uCam, uOff;
          attribute vec2 aR; varying float vA;
          void main() {
            vec3 p = position + uOff * (0.7 + aR.x * 0.6);
            p.x += sin(uTime * (0.5 + aR.y) + aR.x * 40.0) * ${f(o.sway)};
            p.z += cos(uTime * (0.4 + aR.x) + aR.y * 30.0) * ${f(o.sway)};
            p.y -= uTime * mix(${f(o.fall[0])}, ${f(o.fall[1])}, aR.x);
            vec3 w = vec3(uCam.x + mod(p.x - uCam.x + ${f(W / 2)}, ${f(W)}) - ${f(W / 2)},
              uCam.y - ${f(o.below)} + mod(p.y - uCam.y + ${f(o.below)}, ${f(H)}),
              uCam.z + mod(p.z - uCam.z + ${f(W / 2)}, ${f(W)}) - ${f(W / 2)});
            vec4 mv = viewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = ${f(o.size)} * (0.6 + aR.y * 0.8) * uPx * (12.0 / max(-mv.z, 0.4));
            float yy = w.y - (uCam.y - ${f(o.below)});
            vA = ${f(o.alpha)} * smoothstep(0.0, 2.0, yy) * smoothstep(${f(H)}, ${f(H - 2)}, yy);
          }`,
        fragmentShader: `
          uniform float uK; uniform vec3 uCol; varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.1, d) * vA * uK;
            gl_FragColor = vec4(uCol * a, a);
          }`,
      }),
    );
    pts.frustumCulled = false;
    pts.userData.U = U;
    wx.add(pts);
    return pts;
  };
  // mist rising off the open water of the channels
  const mistPts = () => {
    const N = 520;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    const a = new Float32Array(N * 2);
    const r = rng(17);
    for (let i = 0; i < N; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const x = side * (6.8 + r() * 3.4);
      const z = LANE.z0 + r() * (LANE.z1 - LANE.z0);
      p.set([O.x + x, O.y - 0.2, O.z + z], i * 3);
      a.set([r(), r()], i * 2);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(a, 2));
    const pts = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: SH.time, uPx: { value: 1 }, tSoft: { value: T.soft } },
        vertexShader: `
          uniform float uTime, uPx; attribute vec2 aR; varying float vA;
          void main() {
            float t = fract(uTime * (0.05 + aR.x * 0.05) + aR.y);
            vec3 p = position + vec3(sin(t * 6.0 + aR.x * 9.0) * 0.6, t * 3.2, cos(t * 5.0 + aR.y * 7.0) * 0.6);
            vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (90.0 + aR.y * 120.0) * uPx / max(-mv.z, 1.0) * (0.4 + t);
            vA = sin(t * 3.14159) * 0.11;
          }`,
        fragmentShader: `
          uniform sampler2D tSoft; varying float vA;
          void main() {
            float a = texture2D(tSoft, gl_PointCoord).a * vA;
            gl_FragColor = vec4(vec3(0.62, 0.74, 0.86) * a, a);
          }`,
        blending: THREE.AdditiveBlending,
      }),
    );
    pts.frustumCulled = false;
    root.add(pts);
    return pts;
  };

  // ---------- pieces of scenery ----------
  // a land mass: a block of dark rock under a cap of snow whose edges slump into the water
  const land = (L, bt, br, bs) => {
    const [x0, x1, z0, z1] = L.r;
    const w = x1 - x0;
    const l = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    K.collider(cx, LAND_Y - 2, cz, w, 4, l, { tag: 'snow' });
    // the cap: a subdivided plane, drifts at the edges, flat where you walk
    const sx = Math.max(4, Math.round(w / 1.2));
    const sz = Math.max(4, Math.round(l / 1.2));
    const cap = new THREE.PlaneGeometry(w + 1.2, l + 1.2, sx, sz).rotateX(-Math.PI / 2);
    const pa = cap.attributes.position;
    const r = rng(Math.round(cz * 7 + 3));
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      const z = pa.getZ(i);
      const ex = Math.abs(x) / ((w + 1.2) / 2);
      const ez = Math.abs(z) / ((l + 1.2) / 2);
      const e = Math.max(ex, ez);
      let y = LAND_Y + 0.02 + (r() - 0.5) * 0.05;
      if (e > 0.86) y -= smooth((e - 0.86) / 0.14) * 0.85;
      // drifts against the outer rocks, never on the way
      if (ex > 0.7 && ez < 0.9) y += Math.sin(z * 0.7 + x) * 0.18 * (ex - 0.7) / 0.3;
      pa.setY(i, y);
    }
    cap.computeVertexNormals();
    bs.add(cap, P(cx, 0, cz));
    // the rock block under it (seen from below the ice, and at the water line)
    bt.add(new THREE.BoxGeometry(w + 0.4, 3, l + 0.4), P(cx, LAND_Y - 1.85, cz));
    // boulders along the sides, away from the lane
    const n = Math.round((w + l) / 3);
    for (let i = 0; i < n; i++) {
      const side = r();
      let x;
      let z;
      if (side < 0.5) {
        x = (r() < 0.5 ? x0 : x1) + (r() - 0.5) * 1.2;
        z = z0 + r() * l;
      } else {
        x = x0 + r() * w;
        z = (r() < 0.5 ? z0 : z1) + (r() - 0.5) * 1.0;
        // keep the way onto the ice clear
        if (Math.abs(x) < 7.4) continue;
      }
      const s = 0.4 + r() * 1.1;
      br.add(new THREE.DodecahedronGeometry(1, 1), P(x, LAND_Y - 0.2 + s * 0.2, z), [r() * 3, r() * 3, r() * 3], [s * (0.9 + r() * 0.5), s * (0.5 + r() * 0.4), s]);
    }
  };
  const pine = (bp, bn, bb, x, y, z, s) => {
    bb.add(new THREE.CylinderGeometry(0.09 * s, 0.14 * s, 1.2 * s, 6), P(x, y + 0.6 * s, z));
    for (let k = 0; k < 4; k++) {
      const rr = (1.25 - k * 0.27) * s;
      const yy = y + (0.9 + k * 0.85) * s;
      bp.add(new THREE.ConeGeometry(rr, 1.4 * s, 8), P(x, yy, z), [0, k * 0.7, 0]);
      bn.add(new THREE.ConeGeometry(rr * 0.82, 0.5 * s, 8), P(x, yy + 0.38 * s, z), [0, k * 0.7, 0]);
    }
  };
  // jagged piled-up ice along the lane: you do not climb it
  const chaos = (bc, bs, x0, x1, z0, z1, seed) => {
    const r = rng(seed);
    const n = Math.round(((z1 - z0) * Math.abs(x1 - x0)) / 9);
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      const z = z0 + r() * (z1 - z0);
      const near = 1 - Math.min(1, Math.abs(Math.abs(x) - LANE.x) / 8);
      const h = 0.8 + r() * 2.6 + near * 1.8;
      const w = 1 + r() * 2.6;
      bc.add(new THREE.BoxGeometry(w, h, 0.4 + r() * 1.2), P(x, h * 0.3 - 0.4, z), [(r() - 0.5) * 1.1, r() * 3, (r() - 0.5) * 1.1]);
      if (r() < 0.5) bs.add(new THREE.BoxGeometry(w * 0.9, 0.18, 1.2), P(x, h * 0.62 - 0.4, z), [(r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4]);
    }
  };
  // the fishing hole: a rim of ice, black water, a windbreak of planks, a lantern
  const holes = [];
  const lanterns = [];
  const fishingHole = (G, bw, bi) => {
    const [hx, hz] = G.hole;
    const [fx, fz] = G.face;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.13, 8, 28).rotateX(Math.PI / 2), M.chaosS);
    rim.position.copy(P(hx, LAND_Y + 0.05, hz));
    rim.scale.y = 0.6;
    root.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.6, 28).rotateX(-Math.PI / 2), waterMat(1.6));
    water.position.copy(P(hx, LAND_Y + 0.02, hz));
    water.renderOrder = 1;
    root.add(water);
    // the windbreak stands on the open side of the hole, the lane side stays clear
    const ry = Math.atan2(fx, fz);
    const side = V3(Math.cos(ry), 0, -Math.sin(ry));
    const out = hx * side.x + (hz - G.zc) * side.z > 0 ? 1 : -1;
    const bx = hx + side.x * 1.7 * out - fx * 0.6;
    const bz = hz + side.z * 1.7 * out - fz * 0.6;
    [-1, 0, 1].forEach((k) => {
      const px = bx + fx * k * 0.75;
      const pz = bz + fz * k * 0.75;
      bw.add(new THREE.BoxGeometry(0.08, 1.5, 0.72), P(px, LAND_Y + 0.75, pz), [(k - 0.2) * 0.05, ry + k * 0.16, 0]);
    });
    [-1.2, 1.2].forEach((k) => bi.add(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), P(bx + fx * k, LAND_Y + 0.9, bz + fz * k)));
    // a stool and the lantern on a post
    bw.add(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10), P(hx - fx * 1.05 + side.x * 0.6, LAND_Y + 0.42, hz - fz * 1.05 + side.z * 0.6));
    bi.add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), P(hx - fx * 1.05 + side.x * 0.6, LAND_Y + 0.2, hz - fz * 1.05 + side.z * 0.6));
    const lp = P(hx + side.x * 1.3 - fx * 0.4, LAND_Y + 1.6, hz + side.z * 1.3 - fz * 0.4);
    bi.add(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6), lp.clone().add(V3(0, -0.8, 0)));
    const lan = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), M.lamp);
    lan.position.copy(lp).add(V3(0, 0.1, 0));
    root.add(lan);
    const halo = sprite(T.soft, '#ffb46a', 1.6, 0.55);
    halo.position.copy(lan.position);
    root.add(halo);
    lanterns.push({ m: lan, halo, pos: lan.position.clone(), ph: Math.random() * 10 });
    holes.push({ G, pos: P(hx, LAND_Y, hz), water });
  };
  const sprite = (tex, color, size, opacity = 1) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }),
    );
    s.scale.setScalar(size);
    return s;
  };
  // row numbers on little floating ice cakes in the channels (seen from below, mirrored): one
  // mesh per numeral, on top and (for the eyes at the hole) under the cakes
  const plates = { top: [], low: [] };
  const buoys = (G, bc) => {
    for (let r = 0; r < G.rows; r++) {
      const z = G.z0 + S / 2 + r * S;
      [-1, 1].forEach((sd) => {
        const x = sd * (G.hw + 0.95);
        bc.add(new THREE.CylinderGeometry(0.62, 0.7, 0.3, 9), P(x, -0.18, z), [0, r * 0.7 + sd, 0]);
        const g = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2).rotateY(Math.PI);
        plates.top[r].add(g, P(x, 0.0, z));
        plates.low[r].add(g, P(x, -0.36, z));
      });
    }
  };

  // ---------- build ----------
  const lights = {};
  let snow = null;
  let squallSnow = null;
  let mist = null;
  let water = null;
  let skyDome = null;
  const auroras = [];
  let shafts = null;
  let mark = null;
  let uMotes = null;
  const build = () => {
    if (built) return;
    built = true;
    makeMats();
    T.crack = makeCracks();
    T.soft = soft();
    T.num = [0, 1, 2, 3, 4, 5, 6].map(numeral);

    // the open water under the whole lane (the slabs float on it)
    water = new THREE.Mesh(new THREE.PlaneGeometry(LANE.x * 2 + 2, LANE.z1 - LANE.z0 + 4).rotateX(-Math.PI / 2), waterMat(1));
    water.position.copy(P(0, -0.26, (LANE.z0 + LANE.z1) / 2));
    root.add(water);
    GRIDS.forEach(makeField);

    const bs = LvKit.batch();
    const bsB = LvKit.batch();
    const bt = LvKit.batch();
    const br = LvKit.batch();
    const bc = LvKit.batch();
    const bcs = LvKit.batch();
    const bp = LvKit.batch();
    const bn = LvKit.batch();
    const bb = LvKit.batch();
    const bw = LvKit.batch();
    const bi = LvKit.batch();
    const bcl = LvKit.batch();
    LANDS.forEach((L) => land(L, bt, br, bs));

    // the ice chaos along both sides of the lane; tall invisible walls so nobody walks on it
    chaos(bc, bcs, -LANE.wall, -LANE.x - 0.3, LANE.z0, LANE.z1, 3);
    chaos(bc, bcs, LANE.x + 0.3, LANE.wall, LANE.z0, RIDGE.z0, 5);
    chaos(bc, bcs, RIDGE.x1 + 0.3, LANE.wall, RIDGE.z0, 92, 7);
    chaos(bc, bcs, LANE.x + 0.3, LANE.wall, 92, LANE.z1, 9);
    const wall = (x0, x1, z0, z1) => K.collider((x0 + x1) / 2, 4, (z0 + z1) / 2, x1 - x0, 10, z1 - z0, { tag: 'ice' });
    wall(-LANE.wall, -LANE.x, LANE.z0 - 0.5, LANE.z1 + 0.5);
    wall(LANE.x, LANE.wall, LANE.z0 - 0.5, RIDGE.z0);
    wall(RIDGE.x1, LANE.wall, RIDGE.z0, 92);
    wall(LANE.x, LANE.wall, 92, LANE.z1 + 0.5);
    // the land ends: cliffs behind the shores
    wall(-LANE.wall, LANE.wall, -40, -36);
    wall(-LANE.wall, LANE.wall, 178, 182);
    wall(-LANE.wall - 4, -13, -36, LANE.z0);
    wall(13, LANE.wall + 4, -36, LANE.z0);
    wall(-LANE.wall - 4, -13, LANE.z1, 178);
    wall(13, LANE.wall + 4, LANE.z1, 178);

    // the ridge of rock along the third field, and its steps down to C
    K.collider((RIDGE.x0 + RIDGE.x1) / 2, RIDGE.top / 2 - 1, (RIDGE.z0 + RIDGE.z1) / 2, RIDGE.x1 - RIDGE.x0, RIDGE.top + 2, RIDGE.z1 - RIDGE.z0, { tag: 'rock' });
    {
      const r = rng(41);
      for (let z = RIDGE.z0; z < RIDGE.z1; z += 2.2) {
        const h = RIDGE.top + 0.6 + r() * 1.2;
        br.add(new THREE.DodecahedronGeometry(1, 1), P(RIDGE.x0 + 0.6 + r() * 0.4, h / 2 - 0.6, z + 1.1), [r() * 3, r() * 3, r()], [1.4, h / 2 + 0.3, 1.6]);
        br.add(new THREE.DodecahedronGeometry(1, 1), P(RIDGE.x1 - 0.5, h / 2 - 0.3, z + 1.1), [r() * 3, r() * 3, r()], [1.6, h / 2 + 0.6, 1.5]);
      }
      bt.add(new THREE.BoxGeometry(RIDGE.x1 - RIDGE.x0 - 1, RIDGE.top + 0.6, RIDGE.z1 - RIDGE.z0), P((RIDGE.x0 + RIDGE.x1) / 2, RIDGE.top / 2 - 0.6, (RIDGE.z0 + RIDGE.z1) / 2));
      const top = new THREE.PlaneGeometry(RIDGE.x1 - RIDGE.x0 - 0.6, RIDGE.z1 - RIDGE.z0, 6, 24).rotateX(-Math.PI / 2);
      const pa = top.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setY(i, RIDGE.top + 0.03 + (r() - 0.5) * 0.06);
      top.computeVertexNormals();
      bs.add(top, P((RIDGE.x0 + RIDGE.x1) / 2, 0, (RIDGE.z0 + RIDGE.z1) / 2));
      RIDGE_STEPS.forEach(([z0, z1, y]) => {
        K.collider((RIDGE.x0 + RIDGE.x1) / 2, y / 2 - 1, (z0 + z1) / 2, RIDGE.x1 - RIDGE.x0, y + 2, z1 - z0, { tag: 'rock' });
        bt.add(new THREE.BoxGeometry(RIDGE.x1 - RIDGE.x0 - 0.4, y + 1, z1 - z0), P((RIDGE.x0 + RIDGE.x1) / 2, y / 2 - 0.5, (z0 + z1) / 2));
        bs.add(new THREE.BoxGeometry(RIDGE.x1 - RIDGE.x0 - 0.5, 0.08, z1 - z0 - 0.1), P((RIDGE.x0 + RIDGE.x1) / 2, y + 0.03, (z0 + z1) / 2));
      });
      // the spire with its ring, the only way up
      br.add(new THREE.DodecahedronGeometry(1, 1), P(RING.pos[0] + 1.0, 4.6, RING.pos[2]), [0.2, 1, 0.1], [0.9, 5.0, 0.9]);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 24), M.ring);
      ring.position.copy(P(...RING.pos));
      root.add(ring);
      RING.mesh = ring;
      RING.wp = ring.position.clone();
      const rh = sprite(T.soft, '#ffc890', 2.2, 0.4);
      rh.position.copy(ring.position);
      root.add(rh);
    }

    // pines on the shores, a few on the islets and the ridge
    {
      const r = rng(61);
      const spots = [];
      for (let i = 0; i < 26; i++) spots.push([(r() < 0.5 ? -1 : 1) * (6 + r() * 6.5), -34 + r() * 24]);
      for (let i = 0; i < 24; i++) spots.push([(r() < 0.5 ? -1 : 1) * (6 + r() * 6.5), 146 + r() * 30]);
      [[-8.4, 18], [8.6, 21], [-8.6, 49], [-8.2, 80], [8.8, 84], [-8.6, 103], [8.6, 125]].forEach((s) => spots.push(s));
      spots.forEach(([x, z]) => {
        const L = LANDS.find((l) => x > l.r[0] && x < l.r[1] && z > l.r[2] && z < l.r[3]);
        if (!L) return;
        const ex = Math.abs(x);
        // never on the way, never on a hole
        if (ex < 5.2 && (L.id === 'shore' || L.id === 'far')) return;
        if (GRIDS.some((G) => Math.hypot(G.hole[0] - x, G.hole[1] - z) < 3.2)) return;
        if (Math.abs(x - SPAWN0[0][0]) < 3 && Math.abs(z - SPAWN0[0][2]) < 4) return;
        pine(bp, bn, bb, x, LAND_Y - 0.1, z, 1.1 + r() * 1.3);
      });
      for (let z = RIDGE.z0 + 3; z < RIDGE.z1; z += 7) pine(bp, bn, bb, RIDGE.x1 - 1.2, RIDGE.top - 0.1, z + r() * 2, 0.9 + r() * 0.6);
    }

    // the basin: cliffs all around, far off in the snow
    {
      const r = rng(83);
      for (let i = 0; i < 70; i++) {
        const a = (i / 70) * TAU;
        const rx = 64 + r() * 18;
        const rz = 120 + r() * 18;
        const x = Math.sin(a) * rx;
        const z = 70 + Math.cos(a) * rz;
        const h = 18 + r() * 34;
        bcl.add(new THREE.DodecahedronGeometry(1, 1), P(x, h * 0.4 - 4, z), [r() * 3, r() * 3, r() * 3], [10 + r() * 10, h, 10 + r() * 10]);
        if (r() < 0.6) bsB.add(new THREE.DodecahedronGeometry(1, 0), P(x * 0.97, h * 0.62 - 4, z * 0.98 + 2.5), [r() * 3, r() * 3, 0], [8, 1.2, 7]);
      }
      // the frozen basin beyond the chaos: a white field to the cliffs
      const far = new THREE.PlaneGeometry(220, 320, 1, 1).rotateX(-Math.PI / 2);
      bsB.add(far, P(0, -0.35, 70));
    }

    // the start camp: a sled with bundles, a little tent, a brazier (and the screen on two poles)
    {
      const sx = 4.8;
      const sz = -18;
      bw.add(new THREE.BoxGeometry(1.1, 0.12, 2.4), P(sx, LAND_Y + 0.36, sz));
      bi.add(new THREE.BoxGeometry(0.06, 0.06, 2.8), P(sx - 0.5, LAND_Y + 0.1, sz + 0.1), [0.04, 0, 0]);
      bi.add(new THREE.BoxGeometry(0.06, 0.06, 2.8), P(sx + 0.5, LAND_Y + 0.1, sz + 0.1), [0.04, 0, 0]);
      const bundles = LvKit.batch();
      bundles.add(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10), P(sx - 0.2, LAND_Y + 0.68, sz - 0.4), [0, 0, Math.PI / 2]);
      bundles.add(new THREE.BoxGeometry(0.6, 0.4, 0.5), P(sx + 0.15, LAND_Y + 0.62, sz + 0.5));
      root.add(bundles.mesh(M.cloth));
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.4, 4, 1, true), M.clothB);
      tent.position.copy(P(-6.2, LAND_Y + 1.2, -24));
      tent.rotation.y = 0.5;
      root.add(tent);
      K.collider(-6.2, LAND_Y + 1, -24, 2.4, 2, 2.4);
      // brazier
      bi.add(new THREE.CylinderGeometry(0.45, 0.3, 0.5, 10, 1, true), P(-2.8, LAND_Y + 0.5, -20));
      [0, 1, 2].forEach((k) => bi.add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), P(-2.8 + Math.cos(k * 2.1) * 0.32, LAND_Y + 0.2, -20 + Math.sin(k * 2.1) * 0.32)));
      const fire = sprite(T.soft, '#ff8a3a', 1.6, 0.8);
      fire.position.copy(P(-2.8, LAND_Y + 1.0, -20));
      root.add(fire);
      lanterns.push({ m: null, halo: fire, pos: fire.position.clone(), ph: 3, fire: true });
      lights.fire = LvKit.light(root, P(-2.8, LAND_Y + 1.6, -20), '#ff9a50', 2.4, 12);
      // the poles of the banner
      [-3.6, 3.6].forEach((x) => bi.add(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), P(x, LAND_Y + 3, -6)));
      screen = makeScreen(6.6, 2.2, 1024);
      screen.mesh.position.copy(P(0, LAND_Y + 4.3, -6));
      screen.mesh.rotation.y = Math.PI;
      root.add(screen.mesh);
    }

    for (let r = 0; r < 7; r++) {
      plates.top.push(LvKit.batch());
      plates.low.push(LvKit.batch());
    }
    GRIDS.forEach((G) => {
      fishingHole(G, bw, bi);
      buoys(G, bc);
    });
    for (let r = 0; r < 7; r++) {
      const m = new THREE.MeshBasicMaterial({ map: T.num[r], side: THREE.DoubleSide, fog: true });
      m.color.setScalar(0.62);
      root.add(plates.top[r].mesh(m));
      under.add(plates.low[r].mesh(m));
    }

    root.add(bs.mesh(M.snow));
    root.add(bsB.mesh(M.snowB));
    root.add(bt.mesh(M.rockD));
    root.add(br.mesh(M.rock));
    root.add(bc.mesh(chaosMat()));
    root.add(bcs.mesh(M.chaosS));
    root.add(bp.mesh(M.pine));
    root.add(bn.mesh(M.pineS));
    root.add(bb.mesh(M.bark));
    root.add(bw.mesh(M.wood));
    root.add(bi.mesh(M.iron));
    root.add(bcl.mesh(M.cliff));

    mist = mistPts();

    // the lantern at the reader's hole (moved from field to field)
    lights.hole = LvKit.light(root, P(0, 2, 0), '#ffb070', 2.6, 11);
    lights.walker = LvKit.light(root, P(0, 2, 0), '#a8d0ff', 0, 9);

    // the far shore: a cairn of flat stones, a ring of lanterns where the card comes down
    {
      const r = rng(97);
      const cb = LvKit.batch();
      let y = LAND_Y;
      for (let k = 0; k < 6; k++) {
        const w = 1.3 - k * 0.17;
        const h = 0.26 + r() * 0.08;
        cb.add(new THREE.DodecahedronGeometry(1, 1), P(CARD.x + (r() - 0.5) * 0.12, y + h * 0.5, CARD.z + 3.2), [0, r() * 3, (r() - 0.5) * 0.1], [w, h, w * 0.85]);
        y += h * 0.9;
      }
      root.add(cb.mesh(M.rock));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + 0.3;
        const lp = P(CARD.x + Math.sin(a) * 3.6, LAND_Y + 0.9, CARD.z + Math.cos(a) * 3.6);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), M.iron);
        post.position.copy(lp).add(V3(0, -0.45, 0));
        root.add(post);
        const lan = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), M.lamp);
        lan.position.copy(lp).add(V3(0, 0.08, 0));
        root.add(lan);
        const halo = sprite(T.soft, '#ffb46a', 1.3, 0.5);
        halo.position.copy(lan.position);
        root.add(halo);
        lanterns.push({ m: lan, halo, pos: lan.position.clone(), ph: k * 1.7 });
      }
      lights.card = LvKit.light(root, P(CARD.x, LAND_Y + 2.4, CARD.z), '#ffb070', 2.2, 12);
    }
    // the card on the far shore
    card = LvKit.trialCard('d10', true);
    card.position.copy(P(CARD.x, CARD.y, CARD.z));
    root.add(card);

    // ---------- the sky ----------
    skyDome = LvKit.sky({ hor: '#16263a', zen: '#04060e', cloud: '#1c2638', cloudK: 0.75, stars: 0.7, glow: '#1d5a52', glowDir: V3(0, 0.25, 1) });
    [
      ['#2fe0a0', '#8a4cff', 0, 160, 120, 0.3],
      ['#3cf0b8', '#5a7cff', 1.7, 230, 160, -0.2],
      ['#28c890', '#b04cd8', 3.1, 120, 90, 0.7],
    ].forEach(([a, b, sd, z, h, ry], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(420, h, 120, 1), auroraMat(a, b, sd));
      m.position.copy(P(-40 + i * 50, 70 + i * 18 + h / 2, z + 120));
      m.rotation.y = ry;
      m.frustumCulled = false;
      m.renderOrder = -1;
      m.userData.noCull = true;
      wx.add(m);
      auroras.push(m);
    });
    snow = snowPts({ n: 1600, box: [46, 22], below: 6, size: 2.2, sway: 0.7, fall: [0.9, 1.6], alpha: 0.75, color: '#eaf2ff', seed: 7 });
    squallSnow = snowPts({ n: 2200, box: [30, 14], below: 4, size: 1.6, sway: 0.3, fall: [2.5, 4.0], alpha: 0.9, color: '#f4f8ff', seed: 13 });
    squallSnow.userData.U.uK.value = 0;

    // ---------- under the ice ----------
    // shafts of light through the slabs, specks drifting in the cold water, a glow under the walker
    const sg = LvKit.batch();
    GRIDS.forEach((G) => {
      for (let k = 0; k < 6; k++) {
        const x = (Math.random() - 0.5) * G.hw * 1.6;
        const z = G.z0 + Math.random() * (G.z1 - G.z0);
        sg.add(new THREE.PlaneGeometry(1.2 + Math.random() * 1.6, 9), P(x, -4.8, z), [0, Math.random() * 3, 0.12]);
      }
    });
    shafts = sg.mesh(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: SH.time },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uTime; varying vec2 vUv;
          void main() { float a = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x) * pow(vUv.y, 1.6) * (0.75 + 0.25 * sin(uTime * 0.7 + vUv.x * 6.0)) * 0.16;
          gl_FragColor = vec4(vec3(0.5, 0.85, 1.0) * a, a); }`,
      }),
    );
    shafts.frustumCulled = false;
    under.add(shafts);
    // the surface seen from below (the channels, and the ice sheet beyond the lane): no stars
    const ub = LvKit.batch();
    GRIDS.forEach((G) => {
      [-1, 1].forEach((sd) => ub.add(new THREE.PlaneGeometry(LANE.x - G.hw - 0.06, G.z1 - G.z0 + 0.3).rotateX(Math.PI / 2), P(sd * (G.hw + 0.06 + (LANE.x - G.hw - 0.06) / 2), -0.3, G.zc)));
    });
    [-1, 1].forEach((sd) => ub.add(new THREE.PlaneGeometry(300, 420).rotateX(Math.PI / 2), P(sd * (LANE.x + 150), -0.45, 70)));
    const roof = ub.mesh(
      new THREE.ShaderMaterial({
        uniforms: { uTime: SH.time },
        vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform float uTime; varying vec3 vW; ${NOISE}
          void main() { float n = fbm(vW.xz * 0.25 + vec2(uTime * 0.03, 0.0));
          vec3 c = mix(vec3(0.01, 0.05, 0.07), vec3(0.05, 0.16, 0.2), n);
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    );
    roof.frustumCulled = false;
    under.add(roof);
    mark = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#ffb070').multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    mark.renderOrder = 5;
    under.add(mark);
    uMotes = LvKit.motes({ n: 500, size: 1.4, colors: ['#7fc8e0', '#cfefff'], rise: [-0.05, 0.12], sway: 0.6, box: [30, 16], alpha: 0.4, below: -2, seed: 4 });
    uMotes.visible = false;
  };

  // ---------- state the level drives ----------
  const ST = {
    lean: null, // the field index whose underside the hole shows, or null
    hole: -1, // which field's hole has its lantern lit
    squall: 0, // 0..1
    wind: new THREE.Vector2(),
    storm: 0, // 0..1, the finale's darkness
    win: 0,
    card: false,
    walker: null, // where to put the glow under the ice
    me: V3(),
    crackK: 0,
    crackR: 3,
  };
  const drift = V3();
  let flashT = 0;
  let flashK = 0;
  const flash = (k) => {
    flashK = Math.max(flashK, k);
  };
  const hz = new THREE.Color('#0b1622');
  const HZ_AIR = new THREE.Color('#0b1622');
  const HZ_UNDER = new THREE.Color('#06222c');
  const HZ_STORM = new THREE.Color('#1a2430');

  const update = (dt, t) => {
    if (!built) return;
    SH.time.value = t;
    tickFields(dt);
    LvKit.tick(t);
    // cracks: only the walker's screen draws them, only near their feet
    SH.me.value.copy(ST.me);
    SH.crackK.value = damp(SH.crackK.value, ST.lean != null ? 0 : ST.crackK, 6, dt);
    SH.crackR.value = damp(SH.crackR.value, ST.crackR * (1 - ST.squall * 0.75), 3, dt);
    SH.storm.value = ST.storm;
    // snow and wind
    drift.x += ST.wind.x * dt * (1 + ST.squall * 3);
    drift.z += ST.wind.y * dt * (1 + ST.squall * 3);
    [snow, squallSnow].forEach((s) => {
      const U = s.userData.U;
      U.uTime.value = t;
      U.uCam.value.copy(R.camera.position);
      U.uOff.value.copy(drift);
      U.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    });
    // the storm: thicker snow all the time, the sky closes over the stars
    squallSnow.userData.U.uK.value = Math.max(ST.squall, ST.storm * 0.3 * (1 - ST.win));
    const su = skyDome.material.uniforms;
    su.uCK.value = 0.75 + ST.storm * 0.25;
    su.uStars.value = 0.7 * (1 - ST.storm * 0.8);
    snow.userData.U.uK.value = 1 - ST.squall * 0.3;
    mist.material.uniforms.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    const leaning = ST.lean != null;
    snow.visible = squallSnow.visible = !leaning;
    under.visible = leaning;
    uMotes.visible = leaning;
    water.visible = !leaning;
    mist.visible = !leaning;
    holes.forEach((h) => (h.water.visible = !leaning));
    if (leaning) {
      fields.forEach((f, i) => (f.sm.visible = i === ST.lean));
      if (ST.walker) {
        mark.visible = true;
        mark.position.set(ST.walker.x, O.y - TH - 0.12, ST.walker.z);
      } else mark.visible = false;
    }
    // the haze: cold night air, the storm's grey, the green-black water under the ice
    hz.copy(HZ_AIR).lerp(HZ_STORM, ST.storm * 0.6 + ST.squall * 0.4);
    if (leaning) hz.copy(HZ_UNDER);
    R.scene.fog.density = leaning ? 0.02 : 0.016 + ST.squall * 0.035 + ST.storm * 0.006;
    // aurora: dimmer in the storm, back in full at the end
    const ak = (1 - ST.storm * 0.7) * (1 - ST.squall * 0.6) + ST.win * 0.6;
    auroras.forEach((m) => (m.material.uniforms.uK.value = ak));
    SH.aur.value.setRGB(0.16, 0.75, 0.55).multiplyScalar(0.45 + ak * 0.55);
    // lightning far in the storm clouds (the finale)
    flashT -= dt;
    if (ST.storm > 0.2 && flashT <= 0) {
      flashT = 6 + Math.random() * 9;
      flash(0.5 + Math.random() * 0.6);
      AU.thunder(0.3 + Math.random() * 0.4);
    }
    flashK = Math.max(0, flashK - dt * 3);
    R.hemi.intensity = base.hemi + flashK * 0.8 * (leaning ? 0.3 : 1);
    // lanterns flicker
    lanterns.forEach((l) => {
      const f = 0.85 + Math.sin(t * 9 + l.ph) * 0.06 + Math.sin(t * 23 + l.ph * 2) * 0.05;
      l.halo.material.opacity = (l.fire ? 0.75 : 0.5) * f;
      if (l.fire) l.halo.scale.setScalar(1.5 + Math.sin(t * 7) * 0.12);
    });
    if (ST.hole >= 0 && holes[ST.hole]) {
      lights.hole.position.copy(holes[ST.hole].pos).add(V3(0, 1.8, 0));
      lights.hole.intensity = 2.6 * (0.9 + Math.sin(t * 9) * 0.05);
    } else lights.hole.intensity = 0;
    lights.fire.intensity = 2.4 * (0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 27) * 0.05);
    // the walker's own little cold light on the ice (so the cracks near them read at night)
    if (ST.crackK > 0 && !leaning) {
      lights.walker.position.copy(ST.me).add(V3(0, 2.2, 0));
      lights.walker.intensity = 0.9;
    } else lights.walker.intensity = 0;
    if (RING.mesh) RING.mesh.rotation.y = t * 0.8;
    // the card
    card.visible = ST.card;
    if (card.visible) {
      card.rotation.y = t * 0.9;
      card.position.y = O.y + CARD.y + Math.sin(t * 1.4) * 0.15 + Math.max(0, 5 - ST.win * 2.5);
    }
    if (screen) screen.update(dt, t);
  };
  const base = { hemi: 0.55 };

  // ---------- sound: wind, singing ice, cracks, water ----------
  const AU = (() => {
    let ctx = null;
    let out = null;
    let WN = null;
    const N = {};
    let ambT = 4;
    const buf = (sec, fill) => {
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
      fill(b.getChannelData(0), ctx.sampleRate);
      return b;
    };
    const src = (b, loop = true) => {
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = loop;
      return s;
    };
    const filt = (type, f, q = 0.7) => {
      const x = ctx.createBiquadFilter();
      x.type = type;
      x.frequency.value = f;
      x.Q.value = q;
      return x;
    };
    const gain = (v) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const pan = (pos, ref = 4, roll = 1.1) => {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = ref;
      p.rolloffFactor = roll;
      if (p.positionX) {
        p.positionX.value = pos.x;
        p.positionY.value = pos.y;
        p.positionZ.value = pos.z;
      } else p.setPosition(pos.x, pos.y, pos.z);
      return p;
    };
    const init = () => {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }
      if (typeof Sound === 'undefined' || !Sound.ready) return false;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
      } catch (e) {
        ctx = null;
        return false;
      }
      out = gain((typeof SETTINGS !== 'undefined' && SETTINGS.vol != null ? SETTINGS.vol : 0.8) * 0.9);
      N.muff = filt('lowpass', 16000);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      out.connect(N.muff).connect(comp).connect(ctx.destination);
      WN = buf(3, (d) => {
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      });
      // wind: two bands of noise, slowly breathing
      N.wind = gain(0.0);
      N.windF = filt('bandpass', 420, 0.8);
      const w = src(WN);
      w.connect(N.windF).connect(N.wind).connect(out);
      w.start();
      N.gust = gain(0.0);
      N.gustF = filt('bandpass', 900, 1.4);
      const w2 = src(WN);
      w2.connect(N.gustF).connect(N.gust).connect(out);
      w2.start(0, 1.3);
      // under the ice: a low hum and bubbles
      N.deep = gain(0);
      const d = src(WN);
      d.connect(filt('lowpass', 160)).connect(gain(1.6)).connect(N.deep).connect(out);
      d.start(0, 0.7);
      return true;
    };
    const now = () => ctx.currentTime;
    // the singing ice of frozen lakes: a fast falling chirp, echoing far over the ice
    const sing = (pos, k = 1) => {
      if (!init()) return;
      const t0 = now();
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = 2400 + Math.random() * 1800;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(140 + Math.random() * 80, t0 + 0.32 + Math.random() * 0.2);
      const g = gain(0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12 * k, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      const dl = ctx.createDelay(1);
      dl.delayTime.value = 0.21;
      const fb = gain(0.42);
      o.connect(g);
      const p = pan(pos, 30, 0.4);
      g.connect(p).connect(out);
      g.connect(dl).connect(fb).connect(dl);
      dl.connect(filt('lowpass', 1800)).connect(p);
      o.start(t0);
      o.stop(t0 + 0.8);
    };
    // the deep groan of the ice sheet
    const groan = (pos, k = 1) => {
      if (!init()) return;
      const t0 = now();
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(70 + Math.random() * 30, t0);
      o.frequency.exponentialRampToValueAtTime(38 + Math.random() * 10, t0 + 1.6);
      const f = filt('lowpass', 220, 6);
      f.frequency.setValueAtTime(320, t0);
      f.frequency.exponentialRampToValueAtTime(90, t0 + 1.6);
      const g = gain(0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.32 * k, t0 + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
      o.connect(f).connect(g).connect(pan(pos, 8, 0.6)).connect(out);
      o.start(t0);
      o.stop(t0 + 2);
    };
    const burst = (pos, dur, f, q, v, type = 'bandpass', ref = 3) => {
      const t0 = now();
      const s = src(WN, false);
      const g = gain(0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(filt(type, f, q)).connect(g).connect(pos ? pan(pos, ref) : out);
      if (pos) g.connect(out);
      s.start(t0, Math.random() * 2);
      s.stop(t0 + dur + 0.05);
    };
    return {
      get on() {
        return !!ctx;
      },
      resume() {
        if (init() && ctx.state === 'suspended') ctx.resume();
      },
      suspend() {
        if (ctx && ctx.state === 'running') ctx.suspend();
      },
      tick(dt, o) {
        if (!init()) return;
        const t = now();
        N.wind.gain.setTargetAtTime((0.05 + o.storm * 0.08) * (o.under ? 0.3 : 1), t, 0.4);
        N.windF.frequency.setTargetAtTime(380 + Math.sin(t * 0.37) * 120 + o.squall * 300, t, 0.6);
        N.gust.gain.setTargetAtTime(o.squall * 0.2 * (o.under ? 0.2 : 1), t, 0.25);
        N.gustF.frequency.setTargetAtTime(700 + Math.sin(t * 1.3) * 300, t, 0.3);
        N.deep.gain.setTargetAtTime(o.under ? 0.22 : 0, t, 0.3);
        N.muff.frequency.setTargetAtTime(o.under ? 700 : 16000, t, 0.2);
        // the lake sings and groans by itself, now and then
        ambT -= dt;
        if (ambT <= 0) {
          ambT = 5 + Math.random() * 9 - o.storm * 2;
          const p = R.camera.position.clone().add(V3((Math.random() - 0.5) * 60, 0, 10 + Math.random() * 40));
          if (Math.random() < 0.6) sing(p, 0.8);
          else groan(p, 0.6);
        }
        const l = ctx.listener;
        const c = R.camera;
        const f = V3(0, 0, -1).applyQuaternion(c.quaternion);
        const u = V3(0, 1, 0).applyQuaternion(c.quaternion);
        if (l.positionX) {
          l.positionX.value = c.position.x;
          l.positionY.value = c.position.y;
          l.positionZ.value = c.position.z;
          l.forwardX.value = f.x;
          l.forwardY.value = f.y;
          l.forwardZ.value = f.z;
          l.upX.value = u.x;
          l.upY.value = u.y;
          l.upZ.value = u.z;
        } else {
          l.setPosition(c.position.x, c.position.y, c.position.z);
          l.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
        }
      },
      sing,
      groan,
      crack(pos, k = 1) {
        if (!init()) return;
        burst(pos, 0.09, 3200, 0.8, 0.5 * k, 'highpass', 5);
        burst(pos, 0.35, 900, 1.2, 0.35 * k, 'bandpass', 5);
        groan(pos, 0.8 * k);
      },
      creak(pos) {
        if (!init()) return;
        burst(pos, 0.12, 2400, 4, 0.09, 'bandpass', 3);
      },
      splash(pos, k = 1) {
        if (!init()) return;
        burst(pos, 0.6, 700, 0.6, 0.45 * k, 'lowpass', 4);
        burst(pos, 0.25, 2500, 1, 0.2 * k, 'bandpass', 4);
        for (let i = 0; i < 6; i++) {
          const t0 = now() + 0.15 + Math.random() * 0.6;
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(500 + Math.random() * 700, t0);
          o.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 900, t0 + 0.05);
          const g = gain(0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.05 * k, t0 + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
          o.connect(g).connect(pan(pos, 4)).connect(out);
          o.start(t0);
          o.stop(t0 + 0.08);
        }
      },
      thunder(k = 0.5) {
        if (!init()) return;
        burst(null, 2.6, 90, 0.5, 0.35 * k, 'lowpass');
        burst(null, 1.2, 300, 0.7, 0.12 * k, 'lowpass');
      },
      reform() {
        if (!init()) return;
        for (let i = 0; i < 5; i++) setTimeout(() => sing(R.camera.position.clone().add(V3((Math.random() - 0.5) * 12, -1, 6 + i * 3)), 0.6), i * 140);
      },
    };
  })();

  // ---------- zones (relative) ----------
  const at = (id, q) => {
    const L = LANDS.find((l) => l.id === id);
    if (L) return q.x > L.r[0] - 0.4 && q.x < L.r[1] + 0.4 && q.z > L.r[2] - 0.4 && q.z < L.r[3] + 0.4 && q.y > -0.5;
    if (id === 'RIDGE') return q.x > RIDGE.x0 - 0.3 && q.x < RIDGE.x1 + 0.3 && q.z > RIDGE.z0 && q.z < 80 && q.y > 0.9;
    return false;
  };
  // the land after field gi, where the walker arrives
  const LAND_AFTER = ['A', 'B', 'C', 'D', 'E', 'far'];
  const startOf = (gi, k = 0) => {
    const G = GRIDS[gi];
    return P(k * 1.2, LAND_Y + 0.05, G.z0 - 2.4);
  };
  const holeSpot = (gi) => {
    const G = GRIDS[gi];
    const [hx, hz] = G.hole;
    return P(hx - G.face[0] * 0.95, LAND_Y + 0.05, hz - G.face[1] * 0.95);
  };
  const faceYaw = (gi) => Math.atan2(GRIDS[gi].face[0], GRIDS[gi].face[1]);

  // the camera under the ice, below the middle of field gi, its screen-up the way the reader faces
  const UP = V3(0, 1, 0);
  const underCam = (gi, cam, t, wobble) => {
    const G = GRIDS[gi];
    // a little toward the reader, so the field sits above the prompts at the bottom of the screen
    const cx = -G.face[0] * G.depth * 0.1;
    const cz = G.zc - G.face[1] * G.depth * 0.1;
    cam.up.set(G.face[0], 0, G.face[1]);
    cam.position.copy(P(cx + Math.sin(t * 0.5) * 0.08 * wobble, -G.depth, cz + Math.cos(t * 0.4) * 0.08 * wobble));
    cam.lookAt(O.x + cx + Math.sin(t * 0.7) * 0.05 * wobble, O.y + 10, O.z + cz);
    cam.up.copy(UP);
  };

  return {
    O,
    P,
    rel,
    S,
    GRIDS,
    LANDS,
    RIDGE,
    RING,
    CARD,
    SPAWN0,
    LAND_AFTER,
    ST,
    SH,
    AU,
    base,
    cellPos,
    cellAt,
    gridOf,
    at,
    startOf,
    holeSpot,
    faceYaw,
    underCam,
    setField,
    setTrod,
    setGroan,
    clearGroan,
    breakSlab,
    resetField,
    flash,
    hz,
    build() {
      build();
    },
    get built() {
      return built;
    },
    show() {
      root.visible = true;
      wx.visible = true;
    },
    hide() {
      root.visible = false;
      wx.visible = false;
      under.visible = false;
      AU.suspend();
    },
    update,
    get screen() {
      return screen;
    },
    get card() {
      return card;
    },
    get sky() {
      return skyDome;
    },
    get motes() {
      return uMotes;
    },
    holes,
    reform(gi) {
      const G = GRIDS[gi];
      if (!G) return;
      const t0 = performance.now();
      const run = () => {
        const k = (performance.now() - t0) / 1600;
        SH.reformZ.value = O.z + G.z0 - 2 + k * (G.z1 - G.z0 + 4);
        if (k < 1) requestAnimationFrame(run);
        else SH.reformZ.value = -1e4;
      };
      run();
      AU.reform();
    },
  };
})();
