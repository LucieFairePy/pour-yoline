// ♥ 5 · La Chute: sky islands over an endless sea of clouds at sunset. Leaps of faith onto
// clouds only the partner can see, a cloud-raft that has to be under the one who drops through
// the rings, then a long dive together down the Well, hand in hand, to a heart-shaped island.
const H5 = (() => {
  const O = V3(-2100, 0, 7000);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;

  // ---------- layout (relative to O, the way runs along +z) ----------
  const ISLANDS = {
    s0: [0, 0, 18, 18],
    i1: [0, 58, 18, 18],
    i2: [0, 120, 18, 18],
    p4: [0, 206, 12, 12],
  };
  // leap A: the Dame kit jumps, the Valet kit sees. Leap B: the other way round.
  // [x, z, top y, size, drift: [axis, amplitude, period] or null]
  const LEAP_A = [
    [0, 12, 0, 3.2],
    [-2.6, 16.8, 0.6, 3],
    [-4.2, 21.6, 1.2, 3],
    [-1.2, 26.2, 1.2, 3],
    [2.4, 30.4, 0.6, 3],
    [2, 35.2, 0.3, 3, ['x', 2.6, 6.5]],
    [0, 40, 0, 3],
    [-2.2, 44.2, 0, 3],
    [0, 47.4, 0, 3],
  ];
  const LEAP_B = [
    [0, 70.6, 0, 2.8],
    [3, 74.6, 0.4, 2.6],
    [3, 79.4, 0.4, 2.6, ['x', 3, 5.4]],
    [0, 84, 0, 2.6],
    [-3, 91.6, 6, 3],
    [0, 96.6, 6.6, 2.6],
    [2.6, 101, 5.6, 2.6, ['z', 1.6, 7]],
    [0, 105, 4, 2.6],
    [0, 108.6, 2, 2.6],
  ];
  // the updraft between the low and the high clouds of leap B
  const UPDRAFTS = [{ x: -3, z: 88, r: 1.6, y0: -9, y1: 7.6, leap: 'B' }];
  const TOWER_A = { x: -7, z: 5 };
  const TOWER_B = { x: 7, z: 63 };
  const TOWER_TOP = 4.8;
  // the light bridges that carry the guide across once the jumper made it
  const BRIDGES = { A: { x: 6, z0: 9, z1: 49 }, B: { x: -6, z0: 67, z1: 111 } };

  // the net: a causeway over the basin, four planks, four drifting heart rings below them
  const CAUSE = { z0: 129, z1: 200, w: 3.2 };
  const PLANKS = [
    { z: 140, side: 1 },
    { z: 156, side: -1 },
    { z: 172, side: 1 },
    { z: 188, side: -1 },
  ];
  const RING_Y = -7;
  const RING_R = 1.75;
  // the net rings: a heart about 3.8 m wide
  const H5K = 0.12;
  const RAFT_Y = -18;
  const RAFT_S = 4.4;
  const BASIN = { x0: -13, x1: 13, z0: 131, z1: 198 };
  const MIST_Y = -10;
  // where the raft waits for the next drop (opposite side to the plank), and at the end
  const DOCKS = [
    [-3.9, 134],
    [3.9, 150],
    [-3.9, 166],
    [3.9, 182],
    [-3.9, 195.6],
  ];

  // the Well: a dive of 300 m to the heart island
  const WELL = { x: 0, z: 228, r: 13 };
  const BOARD = { z0: 212, z1: 217, w: 2.6 };
  const HEART_Y = -300;
  const DIVE_RINGS = [
    [3, -30, 0],
    [-4, -62, 3],
    [2, -94, -5],
    [-5, -126, -1],
    [5, -158, 4],
    [0, -190, 6],
    [-6, -222, -3],
    [3, -254, -2],
  ];
  const DIVE_RING_R = 2.6;
  const ROCKS = [
    [0, -46, -2, 4.2],
    [-3, -110, 3, 3.6],
    [4, -172, -3, 4],
    [-2, -205, 2, 3.4],
    [-3, -238, 5, 3.6],
  ];

  let built = false;
  let screen = null;
  const hidden = [];
  const PILLARS = [];
  const updrafts = [];
  const bridges = {};
  const rings = [];
  const diveRings = [];
  const flags = [];
  const birds = [];
  const puffs = [];
  let raft = null;
  let mist = null;
  let sea = null;
  let sun = null;
  let rays = null;
  let board = null;
  let heartIsland = null;
  let card = null;
  let galaxy = null;
  let shadowMark = null;
  let ringMark = null;
  let fallCards = null;
  let bolts = [];
  const tmp = V3();
  const SUN_DIR = V3(-0.32, 0.2, 1).normalize();

  // ---------- materials ----------
  const grass = Tex.mat('grass', { color: '#6f8a52', scale: 2.4, rough: 0.95, bump: 0.6 });
  const rock = Tex.mat('rock', { color: '#8a6a62', scale: 3, rough: 0.9, bump: 0.9 });
  const rockDark = Tex.mat('rock', { color: '#5a4452', scale: 4, rough: 0.92, bump: 0.8 });
  const stone = Tex.mat('stone', { color: '#c4ae9e', scale: 1.6, rough: 0.8, bump: 0.6 });
  const pave = Tex.mat('cobble', { color: '#b59c8c', scale: 1.3, rough: 0.85, bump: 0.6 });
  const wood = Tex.mat('wood', { color: '#6a4632', scale: 1.4, rough: 0.8, bump: 0.5 });
  // matte: a polished floor under the low sun burns a white highlight
  const marble = Tex.mat('plaster', { color: '#d6c2ba', scale: 3, rough: 1, bump: 0.3 });
  // brass without an env map renders black: keep it dielectric and warm
  const brass = new THREE.MeshStandardMaterial({
    color: '#a87e44',
    roughness: 0.62,
    metalness: 0.1,
    emissive: '#3a2008',
    emissiveIntensity: 0.3,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: '#ffe2ec',
    roughness: 0.2,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    emissive: '#ff9ab8',
    emissiveIntensity: 0.15,
  });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#5a8a52', roughness: 0.9, flatShading: true, emissive: '#16240e', emissiveIntensity: 0.5 });
  const blossom = new THREE.MeshStandardMaterial({ color: '#f2a0b8', roughness: 0.85, flatShading: true, emissive: '#5a1a2a', emissiveIntensity: 0.5 });
  const glow = LvKit.glow;
  // deck planks (raft, planks, diving board): painted, so the grain does not shimmer
  const deckTex = LvKit.tex(1080, 1080, (g, w, h) => {
    let sd = 23;
    const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const y = (i / n) * h;
      const base = [118 + r() * 20, 78 + r() * 14, 56 + r() * 10];
      g.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`;
      g.fillRect(0, y, w, h / n);
      for (let k = 0; k < 70; k++) {
        g.strokeStyle = `rgba(60,34,22,${0.08 + r() * 0.14})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        const yy = y + r() * (h / n);
        g.moveTo(0, yy);
        g.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 8, w * 0.7, yy + (r() - 0.5) * 8, w, yy + (r() - 0.5) * 6);
        g.stroke();
      }
      g.fillStyle = 'rgba(40,20,12,0.85)';
      g.fillRect(0, y, w, 4);
      // nails
      [0.08, 0.5, 0.92].forEach((u) => {
        g.fillStyle = 'rgba(200,170,120,0.8)';
        g.beginPath();
        g.arc(w * u, y + h / n / 2 - 18, 5, 0, Math.PI * 2);
        g.arc(w * u, y + h / n / 2 + 18, 5, 0, Math.PI * 2);
        g.fill();
      });
    }
  });
  const deck = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.82, color: '#d8c0b0' });

  // ---------- small helpers ----------
  const rng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  };
  const heartPts = (k, n = 96) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = Heart.curve((i / n) * Math.PI * 2);
      out.push([x * k, (y - 2.5) * k]);
    }
    return out;
  };
  const inPoly = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const heartPath = (g, cx, cy, k) => {
    g.beginPath();
    heartPts(k, 90).forEach(([x, y], i) => (i ? g.lineTo(cx + x, cy - y) : g.moveTo(cx + x, cy - y)));
    g.closePath();
  };
  const puffTex = canvasTex(512, 512, (g, w, h) => {
    // a soft cumulus: overlapping round blobs, lit from the top
    const r = rng(17);
    for (let i = 0; i < 22; i++) {
      const x = w * (0.22 + r() * 0.56);
      const y = h * (0.38 + r() * 0.3);
      const rad = w * (0.1 + r() * 0.16);
      const gr = g.createRadialGradient(x, y - rad * 0.3, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.6, 'rgba(255,240,240,0.45)');
      gr.addColorStop(1, 'rgba(255,230,235,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  });
  const haloTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,220,1)');
    gr.addColorStop(0.2, 'rgba(255,190,140,0.55)');
    gr.addColorStop(0.55, 'rgba(255,120,110,0.15)');
    gr.addColorStop(1, 'rgba(255,90,110,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const rayTex = canvasTex(128, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,210,170,0)');
    gr.addColorStop(0.3, 'rgba(255,200,160,0.5)');
    gr.addColorStop(1, 'rgba(255,170,150,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,1)');
    gx.addColorStop(0.5, 'rgba(0,0,0,0)');
    gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = gx;
    g.fillRect(0, 0, w, h);
  });
  // a heart traced on the top of the hidden clouds (what the guide points at)
  const runeTex = LvKit.tex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,220,230,0.95)';
    g.lineWidth = 14;
    heartPath(g, w / 2, h / 2 + 20, 9.5);
    g.stroke();
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(255,180,200,0.6)';
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
    g.stroke();
  });
  const sprite = (tex, color, size, opacity = 1, add = true) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    s.scale.setScalar(size);
    return s;
  };

  // ---------- the sea of clouds (follows the camera, pattern fixed in the world) ----------
  const seaMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uFog: { value: R.scene.fog.color },
      uDen: { value: 0.006 },
      uSun: { value: SUN_DIR },
      uAlpha: { value: 1 },
    },
    transparent: false,
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uFog;
      uniform float uDen;
      uniform vec3 uSun;
      uniform float uAlpha;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
      }
      void main() {
        vec2 q = vW.xz * 0.011 + vec2(uTime * 0.006, uTime * 0.0025);
        float big = fbm(q);
        float fine = fbm(q * 4.3 + big * 1.5);
        float h = big * 0.72 + fine * 0.28;
        vec3 shadow = vec3(0.30, 0.15, 0.32);
        vec3 lit = vec3(0.86, 0.52, 0.42);
        vec3 top = vec3(0.92, 0.70, 0.55);
        vec3 col = mix(shadow, lit, smoothstep(0.32, 0.62, h));
        col = mix(col, top, smoothstep(0.62, 0.8, h) * 0.6);
        vec3 V = normalize(vW - cameraPosition);
        float s = max(dot(normalize(vec2(V.x, V.z)), normalize(vec2(uSun.x, uSun.z))), 0.0);
        col += vec3(0.5, 0.32, 0.2) * pow(s, 10.0) * smoothstep(0.45, 0.75, h) * 0.5;
        float d = length(vW - cameraPosition);
        float f = 1.0 - exp(-pow(d * uDen, 2.0));
        col = mix(col, uFog, clamp(f, 0.0, 1.0));
        gl_FragColor = vec4(min(col, vec3(0.82)), uAlpha);
      }
    `,
  });

  // ---------- islands ----------
  const tree = (x, z, s = 1, flower = false, y = 0) => {
    const tr = K.deco(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 2.4 * s, 7), wood, x, y + 1.2 * s, z);
    tr.rotation.z = (((x * 13 + z * 7) % 5) - 2) * 0.03;
    const r = rng(Math.abs(Math.round(x * 31 + z * 17)) + 3);
    for (let k = 0; k < 4; k++) {
      const c = K.deco(new THREE.IcosahedronGeometry((0.9 + r() * 0.5) * s, 0), flower ? blossom : leafMat, x + (r() - 0.5) * 1.2 * s, y + (2.6 + r() * 0.9) * s, z + (r() - 0.5) * 1.2 * s);
      c.rotation.set(r() * 3, r() * 3, 0);
    }
    K.collider(x, y + 1.2 * s, z, 0.5 * s, 2.4 * s, 0.5 * s);
  };
  const flowerBed = (x, z, k = 0.09, y = 0) => {
    // a heart of little flowers on the grass
    const pts = heartPts(k, 28);
    const geo = new THREE.SphereGeometry(0.09, 6, 4);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ff8fb0', emissive: '#6a1a2a', emissiveIntensity: 0.6, roughness: 0.8 }), pts.length);
    const M = new THREE.Matrix4();
    pts.forEach(([px, py], i) => {
      M.makeTranslation(O.x + x + px, O.y + y + 0.1, O.z + z - py);
      m.setMatrixAt(i, M);
    });
    group.add(m);
  };
  const flag = (x, z, h = 4.2, color = '#ff8fb0') => {
    K.deco(new THREE.CylinderGeometry(0.05, 0.06, h, 6), brass, x, h / 2, z);
    K.collider(x, h / 2, z, 0.2, h, 0.2);
    const geo = new THREE.PlaneGeometry(1.6, 0.9, 10, 4);
    geo.translate(0.8, 0, 0);
    const tex = LvKit.tex(320, 180, (g, w, hh) => {
      g.fillStyle = color;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = 'rgba(255,240,230,0.85)';
      heartPath(g, w / 2, hh / 2 + 6, 3.2);
      g.fill();
    });
    const m = K.deco(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9, emissive: '#3a1018', emissiveIntensity: 0.5 }), x, h - 0.5, z);
    flags.push({ m, base: geo.attributes.position.array.slice(), ph: x * 0.7 + z });
  };
  const island = (name, opt = {}) => {
    const [x, z, sx, sz] = ISLANDS[name];
    K.solid(x, -1, z, sx, 2, sz, opt.top || grass);
    // the rocky underside, tapering towards the sea of clouds
    const under = K.deco(new THREE.ConeGeometry(Math.max(sx, sz) * 0.66, 26, 9, 4), rock, x, -14, z);
    under.rotation.x = Math.PI;
    under.scale.set(sx / Math.max(sx, sz), 1, sz / Math.max(sx, sz));
    const lip = K.deco(new THREE.CylinderGeometry(Math.max(sx, sz) * 0.7, Math.max(sx, sz) * 0.66, 1.4, 9), rockDark, x, -2.6, z);
    lip.scale.set(sx / Math.max(sx, sz), 1, sz / Math.max(sx, sz));
    // hanging roots and stones under the rim
    const r = rng(name.charCodeAt(1) * 7 + 1);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const st = K.deco(new THREE.DodecahedronGeometry(0.5 + r() * 0.9, 0), rock, x + Math.cos(a) * sx * 0.45, -4 - r() * 6, z + Math.sin(a) * sz * 0.45);
      st.rotation.set(r() * 3, r() * 3, 0);
    }
    // a rim of stones so the edge reads from far
    const n = Math.round((sx + sz) * 0.8);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      let d = u * 2 * (sx + sz);
      let px;
      let pz;
      if (d < sx) [px, pz] = [x - sx / 2 + d, z - sz / 2];
      else if ((d -= sx) < sz) [px, pz] = [x + sx / 2, z - sz / 2 + d];
      else if ((d -= sz) < sx) [px, pz] = [x + sx / 2 - d, z + sz / 2];
      else [px, pz] = [x - sx / 2, z + sz / 2 - (d - sx)];
      const st = K.deco(new THREE.DodecahedronGeometry(0.26 + ((i * 37) % 7) * 0.04, 0), stone, px, 0.06, pz);
      st.rotation.set(i, i * 2.1, 0);
    }
  };

  // ---------- guide towers ----------
  const tower = (T, side) => {
    // a stone belvedere: stairs climb from the island to a balcony over the void
    K.solid(T.x, TOWER_TOP / 2, T.z, 4, TOWER_TOP, 4, stone);
    K.solid(T.x, TOWER_TOP + 0.1, T.z, 4.6, 0.2, 4.6, pave);
    // 12 steps of 0.4 m: low enough to walk up without jumping
    for (let i = 0; i < 12; i++) {
      const h = (i + 1) * 0.4;
      K.solid(T.x, h / 2, T.z - 2 - (11 - i) * 0.6 - 0.3, 2, h, 0.6, stone);
    }
    // glass railings, open on the stair side
    const rail = (cx, cz, sx, sz) => {
      K.deco(new THREE.BoxGeometry(sx, 1.05, sz), glass, cx, TOWER_TOP + 0.72, cz);
      K.deco(new THREE.BoxGeometry(sx + 0.06, 0.07, sz + 0.06), brass, cx, TOWER_TOP + 1.26, cz);
      K.collider(cx, TOWER_TOP + 0.7, cz, sx, 1.1, sz);
    };
    rail(T.x, T.z + 2.25, 4.6, 0.1);
    rail(T.x + 2.25, T.z, 0.1, 4.6);
    rail(T.x - 2.25, T.z, 0.1, 4.6);
    rail(T.x - 1.8, T.z - 2.25, 1, 0.1);
    rail(T.x + 1.8, T.z - 2.25, 1, 0.1);
    // a little brass telescope pointing at the clouds
    const tele = K.deco(new THREE.CylinderGeometry(0.07, 0.11, 0.9, 10), brass, T.x + side * 1.4, TOWER_TOP + 1.25, T.z + 1.6);
    tele.rotation.x = Math.PI / 2.6;
    K.deco(new THREE.CylinderGeometry(0.03, 0.05, 1, 6), brass, T.x + side * 1.4, TOWER_TOP + 0.7, T.z + 1.6);
    // a pennant on top
    flag(T.x - side * 1.9, T.z + 1.9, 3.6, '#e46a8a');
    flags[flags.length - 1].m.position.y = O.y + TOWER_TOP + 3.1;
    flags[flags.length - 1].pole = true;
  };

  // ---------- hidden clouds (only the guide sees them, only the jumper stands on them) ----------
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffdce6',
    roughness: 0.95,
    emissive: '#ff7fa4',
    emissiveIntensity: 0.42,
  });
  // the decorative clouds of the raft and the islands stay white
  const puffMat = new THREE.MeshStandardMaterial({ color: '#fff2f0', roughness: 0.95, emissive: '#ffb0a0', emissiveIntensity: 0.12 });
  const hiddenCloud = (d, leap) => {
    const [x, z, y, s, drift] = d;
    const g = new THREE.Group();
    const r = rng(Math.round(x * 13 + z * 7 + 40));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rad = k === 0 ? 0 : s * 0.3;
      const b = new THREE.Mesh(new THREE.SphereGeometry(s * (0.32 + r() * 0.1), 14, 10), cloudMat);
      b.position.set(Math.cos(a) * rad, -0.32 + r() * 0.08, Math.sin(a) * rad);
      b.scale.y = 0.42;
      g.add(b);
    }
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(s * 0.92, s * 0.92).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: runeTex, color: new THREE.Color('#ff7fa4').multiplyScalar(0.85), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    top.position.y = 0.02;
    g.add(top);
    const halo = sprite(haloTex, '#ff8fb0', s * 2.4, 0.32);
    halo.position.y = -0.2;
    g.add(halo);
    g.position.copy(P(x, y, z));
    group.add(g);
    const b = K.collider(x, y - 0.3, z, s, 0.6, s, { dyn: !!drift });
    const c = { g, b, x, y, z, s, drift, leap, off: 0, top };
    hidden.push(c);
    return c;
  };
  const updraftMat = () =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uK: { value: 1 } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float uTime; uniform float uK; varying vec2 vUv;
        void main() {
          float s = sin((vUv.x * 6.2832 * 3.0) + (vUv.y * 14.0) - uTime * 6.0);
          float band = smoothstep(0.55, 1.0, s);
          float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          gl_FragColor = vec4(vec3(1.0, 0.78, 0.6) * 0.55, (0.08 + band * 0.4) * fade * uK);
        }
      `,
    });

  // ---------- a heart-shaped tube ring ----------
  const heartRing = (k, tube, color) => {
    const pts = heartPts(k, 120).map(([x, y]) => new THREE.Vector3(x, 0, -y));
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const g = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, tube, 8, true),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, emissive: color, emissiveIntensity: 0.55 }),
    );
    g.add(m);
    const halo = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, tube * 3.2, 8, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    g.add(halo);
    // a translucent membrane so the hole reads from above
    const shape = new THREE.Shape(heartPts(k, 60).map(([x, y]) => new THREE.Vector2(x, y)));
    const mem = new THREE.Mesh(
      new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.35), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    g.add(mem);
    return { g, m, halo, mem };
  };

  // ---------- the cloud raft ----------
  const makeRaft = () => {
    const g = new THREE.Group();
    const dk = new THREE.Mesh(new THREE.BoxGeometry(RAFT_S, 0.4, RAFT_S), deck);
    dk.position.y = -0.2;
    g.add(dk);
    // planks lines and a brass rim
    for (let i = -2; i <= 2; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(RAFT_S + 0.02, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: '#4a2a1a', roughness: 0.9 }));
      l.position.set(0, 0.005, i * 0.85);
      g.add(l);
    }
    [-1, 1].forEach((s) => {
      const a = new THREE.Mesh(new THREE.BoxGeometry(RAFT_S + 0.1, 0.12, 0.12), brass);
      a.position.set(0, 0.02, (s * RAFT_S) / 2);
      g.add(a);
      const b = a.clone();
      b.rotation.y = Math.PI / 2;
      b.position.set((s * RAFT_S) / 2, 0.02, 0);
      g.add(b);
    });
    // the cloud it floats on
    const r = rng(77);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.SphereGeometry(1.1 + r() * 0.4, 14, 10), puffMat);
      c.position.set(Math.cos(a) * 1.6, -0.75, Math.sin(a) * 1.6);
      c.scale.y = 0.5;
      g.add(c);
    }
    // the helm in the middle, and a heart on the deck where to land
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 10), brass);
    post.position.set(0, 0.45, -1.4);
    g.add(post);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 24), brass);
    wheel.position.set(0, 0.95, -1.35);
    g.add(wheel);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.84, 5), brass);
      sp.rotation.z = (k / 4) * Math.PI;
      sp.position.copy(wheel.position);
      g.add(sp);
    }
    const heart = new THREE.Mesh(
      new THREE.ShapeGeometry(new THREE.Shape(heartPts(0.07, 60).map(([x, y]) => new THREE.Vector2(x, y)))).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7fa0').multiplyScalar(0.7), transparent: true, opacity: 0.75, depthWrite: false }),
    );
    heart.position.set(0, 0.02, 0.5);
    g.add(heart);
    const halo = sprite(haloTex, '#ffb0a0', 7, 0.18);
    halo.position.y = -0.6;
    g.add(halo);
    group.add(g);
    const b = Phys.box(0, -999, 0, RAFT_S, 0.4, RAFT_S, { dyn: true });
    return { g, b, wheel, pos: V3(), y: 0, last: V3() };
  };

  // ---------- birds ----------
  const birdGeo = (() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.2, 0.9, 0.05, 0], 3));
    g.computeVertexNormals();
    return g;
  })();
  const birdMat = new THREE.MeshBasicMaterial({ color: '#2a1424', side: THREE.DoubleSide });
  const makeFlock = (cx, cy, cz, rad, n, seed) => {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group();
      const L = new THREE.Mesh(birdGeo, birdMat);
      const Rw = new THREE.Mesh(birdGeo, birdMat);
      Rw.scale.x = -1;
      b.add(L, Rw);
      b.scale.setScalar(0.9 + r() * 0.5);
      group.add(b);
      birds.push({ b, L, Rw, cx, cy: cy + r() * 4, cz, rad: rad + r() * 6, ph: r() * 6, sp: 0.12 + r() * 0.05, flap: 6 + r() * 3 });
    }
  };

  // ---------- the heart island at the bottom of the Well ----------
  const heartPoly = heartPts(0.72, 120);
  const ringPolys = {};
  const inHeart = (q) => inPoly(heartPoly, q.x - WELL.x, -(q.z - WELL.z));

  const build = () => {
    if (built) {
      group.visible = true;
      return;
    }
    built = true;
    group.visible = true;

    // the sea of clouds, endless: it follows the camera
    sea = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200, 1, 1).rotateX(-Math.PI / 2), seaMat);
    sea.renderOrder = -5;
    sea.frustumCulled = false;
    group.add(sea);
    // the sun low on the horizon, and its rays
    sun = new THREE.Group();
    const disc = sprite(haloTex, '#ffd2a0', 180, 0.85);
    disc.material.fog = false;
    const core = sprite(haloTex, '#fff0d0', 46, 0.9);
    core.material.fog = false;
    sun.add(disc, core);
    group.add(sun);
    rays = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(14 + i * 3, 160),
        new THREE.MeshBasicMaterial({ map: rayTex, color: new THREE.Color('#ffc8a0').multiplyScalar(0.4), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
      );
      m.userData.k = i;
      rays.add(m);
    }
    group.add(rays);

    // ---------- section 1 · islands, towers, hidden clouds, bridges ----------
    island('s0');
    island('i1');
    island('i2');
    island('p4', { top: marble });
    tower(TOWER_A, 1);
    tower(TOWER_B, -1);
    LEAP_A.forEach((d) => hiddenCloud(d, 'A'));
    LEAP_B.forEach((d) => hiddenCloud(d, 'B'));
    UPDRAFTS.forEach((u) => {
      const h = u.y1 - u.y0;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(u.r, u.r, h, 24, 1, true), updraftMat());
      m.position.copy(P(u.x, u.y0 + h / 2, u.z));
      group.add(m);
      const swirl = sprite(haloTex, '#ffd0a0', 4, 0.3);
      swirl.position.copy(P(u.x, u.y1 - 0.5, u.z));
      group.add(swirl);
      updrafts.push({ ...u, m, swirl });
    });
    Object.entries(BRIDGES).forEach(([k, b]) => {
      const len = b.z1 - b.z0;
      const g = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, len), glass.clone());
      deck.material.opacity = 0.42;
      deck.position.z = len / 2;
      g.add(deck);
      [-1, 1].forEach((s) => {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), glow('#ffb0c8', 0.8));
        e.position.set(s * 1.1, 0.1, len / 2);
        g.add(e);
      });
      // heart steps glowing along the way
      for (let z = 2; z < len; z += 4) {
        const h = new THREE.Mesh(
          new THREE.ShapeGeometry(new THREE.Shape(heartPts(0.03, 40).map(([x, y]) => new THREE.Vector2(x, y)))).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9ab8').multiplyScalar(0.7), transparent: true, opacity: 0.8, depthWrite: false }),
        );
        h.position.set(0, 0.09, z);
        g.add(h);
      }
      g.position.copy(P(b.x, -0.08, b.z0));
      g.scale.z = 0.001;
      g.visible = false;
      group.add(g);
      const col = K.collider(b.x, -0.08, (b.z0 + b.z1) / 2, 2.2, 0.16, len);
      col.on = false;
      bridges[k] = { g, col, k: 0 };
    });

    // dressing: trees, flowers, flags, stone arches
    tree(-6, -5, 1.1, true);
    tree(6.5, -6, 0.9);
    tree(5.5, 3.5, 1, true);
    flowerBed(0, -3, 0.1);
    flag(-2.6, 7.6);
    flag(2.6, 7.6, 4.2, '#ffb07a');
    tree(-6.5, 54, 1, true);
    tree(-5, 63.5, 0.9);
    tree(5.5, 52, 1.1);
    flowerBed(-1, 57, 0.09);
    flag(-2.4, 66);
    flag(2.4, 66, 4.2, '#ffb07a');
    tree(6, 114.5, 1, true);
    tree(-6, 116, 1.1);
    tree(-5.5, 125, 0.9, true);
    flowerBed(2, 118, 0.09);
    // an arch over the start of the causeway
    [-1, 1].forEach((s) => {
      K.solid(s * 2.1, 2, 128.2, 0.6, 4, 0.6, stone);
    });
    const arch = K.deco(new THREE.TorusGeometry(2.1, 0.25, 8, 24, Math.PI), stone, 0, 4, 128.2);
    arch.rotation.y = 0;

    // ---------- section 2 · the causeway, the planks, the rings, the raft ----------
    const len = CAUSE.z1 - CAUSE.z0;
    K.solid(0, -0.4, (CAUSE.z0 + CAUSE.z1) / 2, CAUSE.w, 0.8, len, pave);
    K.deco(new THREE.BoxGeometry(CAUSE.w + 0.3, 0.6, len), rockDark, 0, -1, (CAUSE.z0 + CAUSE.z1) / 2);
    // pillars falling into the clouds under it, so it reads as a bridge in the sky
    for (let z = CAUSE.z0 + 7; z < CAUSE.z1 - 3; z += 14) {
      PILLARS.push(z);
      K.deco(new THREE.CylinderGeometry(0.9, 0.55, 3.2, 10), stone, 0, -2.4, z);
      K.deco(new THREE.CylinderGeometry(0.5, 0.9, 14, 8), rock, 0, -11, z);
      const st = K.deco(new THREE.DodecahedronGeometry(1.3, 0), rock, 0, -18.5, z);
      st.rotation.set(z, z * 0.3, 0);
    }
    // lanterns along the causeway (no light: emissive only)
    for (let z = CAUSE.z0 + 4; z < CAUSE.z1; z += 8) {
      [-1, 1].forEach((s) => {
        if (PLANKS.some((p) => p.side === s && Math.abs(p.z - z) < 3)) return;
        K.deco(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 6), brass, s * 1.45, 0.7, z);
        const l = K.deco(new THREE.SphereGeometry(0.16, 10, 8), glow('#ffcf9a', 0.75), s * 1.45, 1.5, z);
        l.add(sprite(haloTex, '#ffb070', 1.4, 0.35));
      });
    }
    PLANKS.forEach((pl, i) => {
      const x = pl.side * (CAUSE.w / 2 + 1.5);
      K.solid(x, -0.12, pl.z, 3, 0.24, 1.6, deck);
      // brass end and a little heart sign
      K.deco(new THREE.BoxGeometry(0.1, 0.1, 1.6), brass, pl.side * (CAUSE.w / 2 + 3), 0.04, pl.z);
      const sign = K.deco(
        new THREE.PlaneGeometry(0.9, 0.9),
        new THREE.MeshBasicMaterial({
          map: LvKit.tex(256, 256, (g, w, h) => {
            g.fillStyle = '#2a1424';
            g.fillRect(0, 0, w, h);
            g.fillStyle = '#ff8fb0';
            heartPath(g, w / 2, h / 2 + 10, 4.2);
            g.fill();
            g.fillStyle = '#fff0e6';
            g.font = 'bold 64px Georgia';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(String(i + 1), w / 2, h / 2);
          }),
          side: THREE.DoubleSide,
        }),
        pl.side * (CAUSE.w / 2 + 0.2),
        1.2,
        pl.z - 1.05,
      );
      sign.material.color.setScalar(0.8);
      K.deco(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), brass, pl.side * (CAUSE.w / 2 + 0.2), 0.6, pl.z - 1.05);
      const rg = heartRing(H5K, 0.08, '#ffc070');
      rg.g.position.copy(P(pl.side * 5.3, RING_Y, pl.z));
      group.add(rg.g);
      rings.push({ ...rg, base: V3(pl.side * 5.3, RING_Y, pl.z), side: pl.side, z: pl.z, cur: V3() });
    });
    raft = makeRaft();
    // the mist the faller sees below the causeway (the raft hides under it)
    mist = new THREE.Mesh(
      new THREE.PlaneGeometry(BASIN.x1 - BASIN.x0 + 16, BASIN.z1 - BASIN.z0 + 10, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uFog: { value: R.scene.fog.color },
          uRect: { value: new THREE.Vector4(O.x + BASIN.x0 - 8, O.z + BASIN.z0 - 5, O.x + BASIN.x1 + 8, O.z + BASIN.z1 + 5) },
        },
        vertexShader: seaMat.vertexShader,
        fragmentShader: `
          uniform float uTime; uniform vec3 uFog; varying vec3 vW;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
          float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.1 + 3.1; a *= 0.5; } return v; }
          uniform vec4 uRect;
          void main() {
            float h = fbm(vW.xz * 0.09 + vec2(uTime * 0.05, uTime * 0.02));
            float h2 = fbm(vW.xz * 0.025 - vec2(uTime * 0.01, 0.0));
            vec3 col = mix(vec3(0.46, 0.28, 0.40), vec3(0.90, 0.66, 0.60), smoothstep(0.3, 0.75, h * 0.6 + h2 * 0.4));
            // feathered borders: the mist frays into the open sky
            vec2 e = min(vW.xz - uRect.xy, uRect.zw - vW.xz);
            float edge = smoothstep(0.0, 7.0 + h2 * 6.0, min(e.x, e.y) + (h - 0.5) * 6.0);
            gl_FragColor = vec4(col * 0.88, (0.9 + h * 0.1) * edge);
          }
        `,
      }),
    );
    mist.position.copy(P((BASIN.x0 + BASIN.x1) / 2, MIST_Y, (BASIN.z0 + BASIN.z1) / 2));
    mist.renderOrder = 2;
    group.add(mist);
    // the marker the catcher sees: where the faller would land
    shadowMark = new THREE.Group();
    const mk = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.15, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7fa0').multiplyScalar(0.75), transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }),
    );
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#2a0a1a', transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadowMark.add(mk, dot);
    shadowMark.visible = false;
    group.add(shadowMark);
    // and the active ring, projected down to the raft (also for the catcher only)
    ringMark = new THREE.Mesh(
      new THREE.ShapeGeometry(new THREE.Shape(heartPts(H5K, 60).map(([x, y]) => new THREE.Vector2(x, y)))).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc070').multiplyScalar(0.55), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    );
    ringMark.visible = false;
    group.add(ringMark);

    // ---------- section 3 · the diving board, the Well, the heart island ----------
    // the diving board: a trapdoor that opens for both at once
    board = new THREE.Group();
    const bl = BOARD.z1 - BOARD.z0;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, 0.24, bl), deck);
    plank.position.set(0, -0.12, bl / 2);
    board.add(plank);
    [-1, 1].forEach((s) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, bl), brass);
      e.position.set((s * BOARD.w) / 2, 0.02, bl / 2);
      board.add(e);
    });
    const bh = new THREE.Mesh(
      new THREE.ShapeGeometry(new THREE.Shape(heartPts(0.05, 50).map(([x, y]) => new THREE.Vector2(x, y)))).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8fb0').multiplyScalar(0.7), transparent: true, opacity: 0.8, depthWrite: false }),
    );
    bh.position.set(0, 0.01, bl * 0.65);
    board.add(bh);
    board.position.copy(P(0, 0, BOARD.z0));
    group.add(board);
    board.userData.col = K.collider(0, -0.12, (BOARD.z0 + BOARD.z1) / 2, BOARD.w, 0.24, bl);
    // posts with the countdown lamps
    board.userData.lamps = [];
    [-1, 1].forEach((s) => {
      K.solid(s * 1.9, 1.3, BOARD.z0 - 0.4, 0.4, 2.6, 0.4, marble);
      for (let k = 0; k < 3; k++) {
        const l = K.deco(new THREE.SphereGeometry(0.13, 10, 8), glow('#ff6f8f', 0.25), s * 1.9, 1.7 + k * 0.35, BOARD.z0 - 0.62);
        board.userData.lamps.push({ l, k });
      }
    });
    // the platform's arch and benches
    const arch2 = K.deco(new THREE.TorusGeometry(2.4, 0.22, 8, 30, Math.PI), brass, 0, 2.6, BOARD.z0 - 0.4);
    arch2.scale.set(0.8, 0.9, 1);
    flowerBed(0, 207.5, 0.11);
    flag(-5, 201.5, 4.2, '#ff8fb0');
    flag(5, 201.5, 4.2, '#ffb07a');

    // the Well: floating stones and giant cards spiral down around it
    const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
    const N = 90;
    const im = new THREE.InstancedMesh(stoneGeo, rock, N);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const r = rng(5);
    for (let i = 0; i < N; i++) {
      const a = i * 0.7 + r() * 0.4;
      const rad = WELL.r + 3 + r() * 9;
      const y = -6 - (i / N) * 290 + r() * 5;
      const s = 1 + r() * 2.8;
      Q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
      M.compose(P(WELL.x + Math.cos(a) * rad, y, WELL.z + Math.sin(a) * rad), Q, V3(s, s * (0.6 + r() * 0.5), s));
      im.setMatrixAt(i, M);
    }
    group.add(im);
    const cardSuits = [
      ['A', '♥'],
      ['K', '♠'],
      ['Q', '♥'],
      ['J', '♣'],
      ['5', '♥'],
      ['7', '♦'],
    ];
    for (let i = 0; i < 18; i++) {
      const [rk, su] = cardSuits[i % cardSuits.length];
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 4.5),
        new THREE.MeshBasicMaterial({ map: Tex.card(rk, su), side: THREE.DoubleSide, alphaTest: 0.5 }),
      );
      m.material.color.setScalar(0.62);
      const a = i * 1.37;
      const rad = WELL.r + 4 + (i % 3) * 3;
      m.position.copy(P(WELL.x + Math.cos(a) * rad, -12 - i * 15.5, WELL.z + Math.sin(a) * rad));
      m.rotation.set(r() * 0.8 - 0.4, a + Math.PI / 2, r() * 0.6 - 0.3);
      m.userData.spin = (r() - 0.5) * 0.3;
      group.add(m);
      puffs.push({ card: m });
    }
    // rocks in the way (solid: landing on one costs time)
    ROCKS.forEach(([x, y, z, s]) => {
      const m = K.deco(new THREE.CylinderGeometry(s * 0.62, s * 0.3, 1.6, 8), rock, WELL.x + x, y - 0.8, WELL.z + z);
      const top = K.deco(new THREE.CylinderGeometry(s * 0.6, s * 0.62, 0.2, 8), grass, WELL.x + x, y - 0.1, WELL.z + z);
      top.userData.r = true;
      K.collider(WELL.x + x, y - 0.8, WELL.z + z, s * 0.85, 1.6, s * 0.85);
      m.add(sprite(haloTex, '#ff9070', s * 2, 0.12));
    });
    // the heart rings of the dive
    DIVE_RINGS.forEach(([x, y, z], i) => {
      const rg = heartRing(0.165, 0.12, i % 2 ? '#ff8fb0' : '#ffc070');
      rg.g.position.copy(P(WELL.x + x, y, WELL.z + z));
      group.add(rg.g);
      diveRings.push({ ...rg, pos: P(WELL.x + x, y, WELL.z + z), ok: 0, mine: 0 });
    });
    // the falling cards around the divers (points that drift upwards in the camera's frame)
    {
      const n = 260;
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const rad = 2 + r() * (WELL.r + 6);
        pos.set([WELL.x + Math.cos(a) * rad, -8 - r() * 262, WELL.z + Math.sin(a) * rad], i * 3);
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const tex = canvasTex(64, 96, (gg, w, h) => {
        gg.fillStyle = '#fff4ee';
        gg.fillRect(6, 4, w - 12, h - 8);
        gg.fillStyle = '#d8324f';
        heartPath(gg, w / 2, h / 2 + 4, 1.1);
        gg.fill();
      });
      fallCards = new THREE.Points(
        g,
        new THREE.PointsMaterial({ size: 0.9, map: tex, transparent: true, alphaTest: 0.4, color: new THREE.Color(0.7, 0.68, 0.66), sizeAttenuation: true }),
      );
      fallCards.position.copy(O);
      fallCards.frustumCulled = false;
      group.add(fallCards);
    }
    // the heart island
    {
      const shape = new THREE.Shape(heartPoly.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.4, bevelSegments: 2, curveSegments: 6 });
      // shape y runs towards -z (same as every heart here), the depth grows upwards
      geo.rotateX(-Math.PI / 2);
      const top = new THREE.Mesh(geo, grass);
      top.position.copy(P(WELL.x, HEART_Y - 3.4, WELL.z));
      group.add(top);
      const under = K.deco(new THREE.ConeGeometry(11, 30, 10, 3), rock, WELL.x, HEART_Y - 18, WELL.z - 2);
      under.rotation.x = Math.PI;
      // rim of glowing flowers so the target reads from 300 m up
      const pts = heartPts(0.7, 70);
      const fm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), glow('#ff8fb0', 0.8), pts.length);
      pts.forEach(([x, y], i) => {
        M.makeTranslation(O.x + WELL.x + x, O.y + HEART_Y + 0.2, O.z + WELL.z - y);
        fm.setMatrixAt(i, M);
      });
      group.add(fm);
      // a soft pink glow under the island so the target reads from 300 m up
      const big = new THREE.Mesh(
        new THREE.CircleGeometry(20, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: haloTex, color: new THREE.Color('#ff8fb0').multiplyScalar(0.6), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      big.position.copy(P(WELL.x, HEART_Y - 6, WELL.z + 3));
      group.add(big);
      heartIsland = { top, big };
      // colliders: a 1.5 m grid of the heart's inside
      for (let x = -12; x <= 12; x += 1.5)
        for (let z = -12; z <= 12; z += 1.5)
          if (inPoly(heartPoly, x, -z)) K.collider(WELL.x + x, HEART_Y - 1.5, WELL.z + z, 1.55, 3, 1.55);
      // a pedestal in the middle, and blossom trees
      K.solid(WELL.x, HEART_Y + 0.3, WELL.z - 1, 1.6, 0.6, 1.6, stone);
      K.deco(new THREE.BoxGeometry(1.7, 0.08, 1.7), brass, WELL.x, HEART_Y + 0.62, WELL.z - 1);
      tree(WELL.x - 6, WELL.z + 3, 0.9, true, HEART_Y);
      tree(WELL.x + 6, WELL.z + 3, 0.9, true, HEART_Y);
      flowerBed(WELL.x, WELL.z - 6, 0.08, HEART_Y);
    }
    card = LvKit.card('5', '♥', true);
    card.position.copy(P(WELL.x, HEART_Y + 14, WELL.z - 1));
    group.add(card);
    galaxy = Heart.galaxy(9000, 1.1, 51);
    galaxy.group.position.copy(P(WELL.x, HEART_Y + 26, WELL.z + 30));
    galaxy.group.lookAt(P(WELL.x, HEART_Y, WELL.z - 20));
    galaxy.U.uForm.value = 0;
    galaxy.core.material.opacity = 0;
    galaxy.group.visible = false;
    group.add(galaxy.group);

    // ---------- the lightning of the Well ----------
    bolts = [0, 1, 2].map(() => {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 70, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2f5f').multiplyScalar(0.75), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      const pts = [];
      for (let k = 0; k <= 24; k++) pts.push(new THREE.Vector3(0, 35 - k * (70 / 24), 0));
      const bg = new THREE.BufferGeometry().setFromPoints(pts);
      const bolt = new THREE.Line(bg, new THREE.LineBasicMaterial({ color: new THREE.Color('#e8d0ff').multiplyScalar(0.85), transparent: true, opacity: 0 }));
      const glowB = sprite(haloTex, '#c8a0ff', 18, 0);
      const g = new THREE.Group();
      g.add(col, bolt, glowB);
      g.visible = false;
      group.add(g);
      return { g, col, bolt, glowB, t: -1, x: 0, y: 0, z: 0, hit: false };
    });

    // ---------- clouds, birds ----------
    const r2 = rng(99);
    for (let i = 0; i < 70; i++) {
      const s = sprite(puffTex, '#ffd6cc', 14 + r2() * 26, 0.55 + r2() * 0.3, false);
      s.material.color.multiplyScalar(0.8);
      const z = -30 + r2() * 270;
      const side = r2() < 0.5 ? -1 : 1;
      // keep the basin of the net clear: the catcher has to see the causeway above
      const wide = z > 120 && z < 210 ? 38 : 22;
      s.position.copy(P(side * (wide + r2() * 60), -12 - r2() * 22, z));
      s.userData.v = 0.3 + r2() * 0.6;
      group.add(s);
      puffs.push({ s, z0: z });
    }
    makeFlock(0, 14, 40, 26, 7, 3);
    makeFlock(0, 18, 140, 30, 6, 4);
    makeFlock(10, 10, 210, 24, 5, 5);

    // ---------- the screen at the start ----------
    screen = makeScreen(6.4, 2.9, 1024);
    screen.mesh.position.copy(P(5.6, 3.6, -7.2));
    screen.mesh.rotation.y = -0.35;
    group.add(screen.mesh);
    [-1, 1].forEach((s) => {
      const x = 5.6 + s * 3 * Math.cos(0.35);
      const z = -7.2 + s * 3 * Math.sin(0.35);
      K.deco(new THREE.CylinderGeometry(0.1, 0.13, 5.2, 8), brass, x, 2.6, z);
      K.collider(x, 2.6, z, 0.3, 5.2, 0.3);
    });
  };

  // ---------- per-frame ----------
  // clock: the shared time base (sent by the host), so drifting clouds and rings agree
  const driftOff = (c, clock) => {
    if (!c.drift) return 0;
    const [, amp, per] = c.drift;
    return Math.sin((clock / per) * Math.PI * 2) * amp;
  };
  const setBox = (b, x, y, z, sx, sy, sz) => {
    b.min[0] = O.x + x - sx / 2;
    b.max[0] = O.x + x + sx / 2;
    b.min[1] = O.y + y - sy / 2;
    b.max[1] = O.y + y + sy / 2;
    b.min[2] = O.z + z - sz / 2;
    b.max[2] = O.z + z + sz / 2;
  };
  const ringAt = (i, clock, out) => {
    const rg = rings[i];
    // the rings drift slowly under their plank: drop when yours passes beneath
    const ph = clock * 0.42 + i * 1.7;
    return out.set(rg.base.x + Math.sin(ph * 0.6) * 0.7 * rg.side, RING_Y + Math.sin(ph * 1.3) * 0.25, rg.base.z + Math.sin(ph) * (1.6 + i * 0.2));
  };

  let clockNow = 0;
  const update = (dt, t, st) => {
    const cam = R.camera.position;
    clockNow = st.clock;
    // sea and sky follow the camera
    seaMat.uniforms.uTime.value = t;
    sea.position.set(cam.x, O.y + st.seaY, cam.z);
    seaMat.uniforms.uDen.value = st.seaY < -100 ? 0.0035 : 0.006;
    sun.position.copy(cam).addScaledVector(SUN_DIR, 640);
    rays.position.copy(cam).addScaledVector(SUN_DIR, 300);
    rays.lookAt(cam);
    rays.children.forEach((m) => {
      const k = m.userData.k;
      m.rotation.z = (k - 3) * 0.16 + Math.sin(t * 0.1 + k) * 0.02;
      m.material.opacity = 0.1 + Math.sin(t * 0.3 + k * 1.3) * 0.04;
    });
    // hidden clouds: seen by the guide only, solid for the jumper only
    hidden.forEach((c) => {
      const off = driftOff(c, st.clock);
      const x = c.drift && c.drift[0] === 'x' ? c.x + off : c.x;
      const z = c.drift && c.drift[0] === 'z' ? c.z + off : c.z;
      c.dx = x - (c.cx == null ? x : c.cx);
      c.dz = z - (c.cz == null ? z : c.cz);
      c.cx = x;
      c.cz = z;
      const sees = st.seer[c.leap];
      c.g.visible = sees;
      c.g.position.set(O.x + x, O.y + c.y + Math.sin(t * 1.2 + c.z) * 0.03, O.z + z);
      c.top.material.opacity = 0.75 + Math.sin(t * 2 + c.z) * 0.2;
      c.b.on = st.solid[c.leap];
      if (c.drift) setBox(c.b, x, c.y - 0.3, z, c.s, 0.6, c.s);
    });
    updrafts.forEach((u) => {
      u.m.visible = st.seer[u.leap];
      u.swirl.visible = st.seer[u.leap];
      u.m.material.uniforms.uTime.value = t;
      u.swirl.material.rotation = t;
    });
    // bridges grow from the guide's side
    Object.entries(bridges).forEach(([k, b]) => {
      const want = st.bridge[k] ? 1 : 0;
      b.k = want ? Math.min(1, b.k + dt / 2.4) : 0;
      b.g.visible = b.k > 0;
      b.g.scale.z = Math.max(0.001, b.k);
      b.col.on = b.k >= 1;
    });
    // flags flutter
    flags.forEach((f) => {
      const a = f.m.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = f.base[i * 3];
        a.array[i * 3 + 2] = Math.sin(x * 2.6 - t * 6 + f.ph) * 0.12 * x;
        a.array[i * 3 + 1] = f.base[i * 3 + 1] + Math.sin(x * 2 - t * 4 + f.ph) * 0.04 * x;
      }
      a.needsUpdate = true;
    });
    // birds wheel around the islands
    birds.forEach((b) => {
      const a = b.ph + t * b.sp;
      b.b.position.copy(P(b.cx + Math.cos(a) * b.rad, b.cy + Math.sin(t * 0.6 + b.ph) * 1.2, b.cz + Math.sin(a) * b.rad));
      b.b.rotation.y = -a;
      const f = Math.sin(t * b.flap + b.ph) * 0.6;
      b.L.rotation.z = f;
      b.Rw.rotation.z = -f;
    });
    // drifting clouds and cards
    puffs.forEach((p) => {
      if (p.s) {
        p.s.position.x += p.s.userData.v * dt;
        if (p.s.position.x > O.x + 90) p.s.position.x = O.x - 90;
      }
      if (p.card) p.card.rotation.y += p.card.userData.spin * dt;
    });
    // rings of the net
    rings.forEach((rg, i) => {
      ringAt(i, st.clock, rg.cur);
      rg.g.position.copy(rg.cur).add(O);
      const on = st.ringOn(i);
      rg.m.material.emissiveIntensity = on ? 0.6 + Math.sin(t * 4) * 0.1 : 0.15;
      rg.halo.material.opacity = on ? 0.3 : 0.06;
      rg.g.rotation.y = Math.sin(t * 0.5 + i) * 0.2;
    });
    mist.visible = st.mist;
    mist.material.uniforms.uTime.value = t;
    // dive rings: gold until both of you passed, then pink and soft
    diveRings.forEach((rg, i) => {
      const s = st.diveRing(i);
      rg.g.rotation.y = Math.sin(t * 0.4 + i) * 0.4;
      rg.m.material.emissiveIntensity = s === 2 ? 0.2 : 0.55 + Math.sin(t * 3 + i) * 0.1;
      rg.halo.material.opacity = s === 2 ? 0.08 : s === 1 ? 0.45 : 0.25;
      rg.m.material.emissive.set(s === 2 ? '#7a3a5a' : s === 1 ? '#ffd090' : i % 2 ? '#ff8fb0' : '#ffc070');
    });
    // the falling cards rise around the camera (they fall slower than you)
    if (st.diving) {
      const a = fallCards.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.array[i * 3 + 1] + dt * (3 + (i % 5));
        if (y > -8) y -= 262;
        a.array[i * 3 + 1] = y;
      }
      a.needsUpdate = true;
    }
    fallCards.visible = st.stage >= 4;
    // board lamps
    board.userData.lamps.forEach(({ l, k }) => l.material.color.set('#ff6f8f').multiplyScalar(st.count > k ? 1.2 : 0.2));
    // the card at the end
    if (st.won > 0) {
      galaxy.group.visible = true;
      galaxy.U.uTime.value = t;
      galaxy.U.uPx.value = R.renderer.getPixelRatio() * 0.45;
      galaxy.U.uForm.value = Math.min(1, st.won * 0.7);
      galaxy.core.material.opacity = Math.min(1, st.won) * 0.1;
      card.visible = true;
      card.position.y = O.y + HEART_Y + Math.max(1.9, 14 - st.won * 6) + Math.sin(t * 1.6) * 0.1;
      card.rotation.y = t * 0.8;
    } else {
      card.visible = false;
      galaxy.group.visible = false;
    }
    heartIsland.big.material.opacity = 0.24 + Math.sin(t * 2) * 0.06;
    // lightning
    bolts.forEach((b) => {
      if (b.t < 0) {
        b.g.visible = false;
        return;
      }
      b.t += dt;
      b.g.visible = true;
      b.g.position.copy(P(b.x, b.y, b.z));
      if (b.t < 1.4) {
        b.col.material.opacity = 0.04 + (b.t / 1.4) * 0.14 + Math.sin(b.t * 30) * 0.02;
        b.col.scale.set(1 - b.t * 0.15, 1, 1 - b.t * 0.15);
        b.bolt.material.opacity = 0;
        b.glowB.material.opacity = 0;
      } else if (b.t < 1.75) {
        if (!b.flashed) {
          b.flashed = true;
          const a = b.bolt.geometry.attributes.position;
          for (let k = 1; k < a.count - 1; k++) {
            a.array[k * 3] = (Math.random() - 0.5) * 2.4;
            a.array[k * 3 + 2] = (Math.random() - 0.5) * 2.4;
          }
          a.needsUpdate = true;
        }
        const f = 1 - (b.t - 1.4) / 0.35;
        b.col.material.opacity = 0.12 * f;
        b.bolt.material.opacity = f;
        b.glowB.material.opacity = 0.6 * f;
      } else {
        b.t = -1;
        b.flashed = false;
        b.g.visible = false;
      }
    });
  };

  const at = (name, q, pad = 0) => {
    const [x, z, sx, sz] = ISLANDS[name];
    return Math.abs(q.x - x) < sx / 2 + pad && Math.abs(q.z - z) < sz / 2 + pad && q.y > -1 && q.y < 3;
  };

  return {
    O,
    P,
    build,
    get built() {
      return built;
    },
    hide() {
      group.visible = false;
      if (raft) raft.b.on = false;
    },
    rel: K.rel,
    update,
    setBox,
    ringAt,
    get clock() {
      return clockNow;
    },
    at,
    get raft() {
      return raft;
    },
    get screen() {
      return screen;
    },
    get shadowMark() {
      return shadowMark;
    },
    get ringMark() {
      return ringMark;
    },
    get board() {
      return board;
    },
    get bolts() {
      return bolts;
    },
    hidden,
    updrafts,
    rings,
    diveRings,
    PLANKS,
    PILLARS,
    DOCKS,
    CAUSE,
    BASIN,
    RAFT_Y,
    RAFT_S,
    RING_Y,
    RING_R,
    RING_K: H5K,
    MIST_Y,
    WELL,
    BOARD,
    HEART_Y,
    DIVE_RING_R,
    TOWER_A,
    TOWER_B,
    TOWER_TOP,
    inHeart,
    // is (dx, dz) from a ring's centre inside its heart (k: the ring's scale)
    inRing(k, dx, dz) {
      if (!ringPolys[k]) ringPolys[k] = heartPts(k, 60);
      return inPoly(ringPolys[k], dx, -dz);
    },
    onCause: (q) => Math.abs(q.x) < CAUSE.w / 2 + 0.1 && q.z > CAUSE.z0 - 1 && q.z < CAUSE.z1 + 1 && q.y > -0.6 && q.y < 2,
    onBoard: (q) => Math.abs(q.x) < BOARD.w / 2 + 0.05 && q.z > BOARD.z0 + 0.6 && q.z < BOARD.z1 && q.y > -0.4 && q.y < 1.5,
    inWell: (q) => Math.hypot(q.x - WELL.x, q.z - WELL.z) < WELL.r + 2 && q.y < -1,
    nearCard: (q) => Math.hypot(q.x - WELL.x, q.z - (WELL.z - 1)) < 3 && Math.abs(q.y - HEART_Y) < 2.5,
    onTower: (T, q) => Math.abs(q.x - T.x) < 2.3 && Math.abs(q.z - T.z) < 2.3 && q.y > TOWER_TOP - 0.3,
    spawn(stage, who, sub = {}) {
      const d = who === 'dame' ? -1.6 : 1.6;
      if (stage <= 1) return who === 'dame' ? P(1.5, 0, 5.5) : P(-4, 0, -3);
      if (stage === 2) return who === 'valet' ? P(0, 0, 64.5) : P(4, 0, 54);
      if (stage === 3) {
        if (sub.raft) return sub.raft;
        if (sub.catcher) {
          const [dx, dz] = DOCKS[Math.min(sub.ring || 0, 4)];
          return P(dx * 0.35, 0, dz - 1.5);
        }
        return P(0, 0, (PLANKS[Math.min(sub.ring || 0, 3)] || PLANKS[3]).z - 6);
      }
      if (stage === 4) return P(d, 0, 205);
      return P(WELL.x + d, HEART_Y, WELL.z + 2);
    },
  };
})();
