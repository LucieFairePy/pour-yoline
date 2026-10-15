// The Cour · the ♦ table (Valet, Dame and Roi de Carreau): the Observatoire de Carreau, a hall of
// glass, brass and crystal on a rock above the storm. Three rooms on one axis (+z):
//  A. la Salle des Facettes (Valet): a round room, six crystal pedestals on a ring
//  B. la Galerie des Prismes (Dame): a long gallery, a 5 x 4 grid of mirror pits, a heliostat,
//     crystals on the edges, and a balcony (the lens) over the south end
//  C. la Coupole (Roi): a domed room under a brass orrery, four gem slots, two levers, the board
// Each room has its figure: a tall Veilleur in a court costume and a carreau mask (built by
// figure(), also used by the end-of-table cinematic, js/cine/cour_d.js).
// Scanned materials (Poly Haven, lazily loaded for these levels only, procedural until they arrive).
// Geometry, visuals, sound and pure helpers only; the rules live in js/levels/tr_dV.js, tr_dD.js,
// tr_dK.js.
const CourD = (() => {
  const O = V3(-2000, 0, 16000);
  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);
  // what follows the camera (sky, cloud sea, bolts) is never culled by distance
  const wx = new THREE.Group();
  wx.visible = false;
  wx.userData.noCull = true;
  R.scene.add(wx);
  const K = LvKit.builder(O, root);
  const P = K.P;
  const rel = K.rel;
  let built = false;

  // ---------- layout (relative to O) ----------
  const A = { x: 0, z: 30, r: 12 };
  // pedestals I..VI: a horseshoe around the middle, open toward the Valet (north); numbered left
  // to right as seen from the door (looking north, +x is on the left)
  const PEDS = Array.from({ length: 6 }, (_, i) => {
    const a = ((200 - i * 44) * Math.PI) / 180;
    return { i, x: Math.cos(a) * -6.6, z: A.z + Math.sin(a) * -6.6 + 1 };
  });
  const FIG_A = [0, 0.5, 37.2];
  const GATE_A = 42;
  // B: the grid of mirrors
  const B = { z0: 52, z1: 84, w: 17 };
  const CELL = 4;
  const COLS = 5;
  const ROWS = 4;
  const cellX = (c) => -8 + c * CELL;
  const cellZ = (r) => 62 + r * CELL;
  const BAL_Y = 4.5;
  const BAL_Z = [52.4, 57.6];
  const LEVER_B = [-6, 55.4];
  // the great lens on the balcony, and the view through it (over the whole grid)
  const LENS = [0, 56.6];
  const LENS_EYE = [0, 8.3, 55.6];
  const LENS_AT = [0, 0.4, 68.4];
  const FIG_B = [0, 0.6, 81];
  const GATE_B = 84;
  // C: the dome
  const C = { x: 0, z: 106, r: 14 };
  const SLOTS = [
    { i: 0, x: 7, z: 104, who: 'dame' },
    { i: 1, x: 4, z: 104, who: 'dame' },
    { i: 2, x: -4, z: 104, who: 'valet' },
    { i: 3, x: -7, z: 104, who: 'valet' },
  ];
  const LEVERS_C = { dame: [10.4, 104], valet: [-10.4, 104] };
  const FIG_C = [0, 1.2, 114];
  const BOARD = { y: 8.8, z: 118, w: 12, h: 5.17 };

  // the gems: colours (♦V and ♦R) and cuts (♦V)
  const GEMS = [
    { name: 'ambre', c: '#e88a10' },
    { name: 'rose', c: '#e8326e' },
    { name: 'azur', c: '#2a78e8' },
    { name: 'verte', c: '#1aa84a' },
    { name: 'blanche', c: '#eeeefa' },
  ];
  const CUTS = ['en losange', 'en goutte', 'en dé', 'en pointe'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  // ---------- noise ----------
  const hash = (i, j) => {
    let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const NOISE_GLSL = `
    float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }`;

  // ---------- scanned materials (Poly Haven, CC0; assets/CATALOG.md) ----------
  const SCAN = {
    mosaic: { ids: ['tex.dcour.mosaic.alb', 'tex.dcour.mosaic.nrm'], mul: 1 },
    // shared with ♥10 Le Marché and ♣10 La Tour de Babel (their files)
    plaster: { ids: ['tex.h10.plaster.alb', 'tex.h10.plaster.nrm'], mul: 1 },
    stone: { ids: ['tex.c10stone.alb', 'tex.c10stone.nrm'], mul: 1 },
    wood: { ids: ['tex.wood.alb', 'tex.wood.nrm'], mul: 0.75 },
  };
  const scansOn = () => typeof Look === 'undefined' || Look.on('tex');
  const loadScans = () => {
    if (!scansOn() || typeof Assets === 'undefined') return;
    Object.values(SCAN).forEach((s) => {
      if (s.req) return;
      s.req = true;
      Promise.all(s.ids.map((id) => Assets.get(id)))
        .then(([a, d]) => {
          [a, d].forEach((t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
            t.needsUpdate = true;
          });
          s.alb = a;
          s.dat = d;
        })
        .catch(() => {});
    });
  };
  const scan = (kind, name, opt) => {
    const m = Tex.mat(kind, Object.assign({ dcour: name }, opt));
    if (!m.userData.tri) return m;
    const T = Tex.build(kind);
    const s = SCAN[name];
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      sh.uniforms.tAlb = { get value() { return s.alb || T.uAlb.value; } };
      sh.uniforms.tDat = { get value() { return s.dat || T.uDat.value; } };
      sh.uniforms.triMul = { get value() { return s.alb ? s.mul : T.uMul.value; } };
      sh.uniforms.triNrm = { get value() { return s.alb ? 1 : T.uNrm.value; } };
    };
    return m;
  };

  // ---------- canvas textures ----------
  const T = {};
  const diamondPath = (g, cx, cy, w, h) => {
    g.beginPath();
    g.moveTo(cx, cy - h);
    g.quadraticCurveTo(cx + w * 0.18, cy - h * 0.18, cx + w, cy);
    g.quadraticCurveTo(cx + w * 0.18, cy + h * 0.18, cx, cy + h);
    g.quadraticCurveTo(cx - w * 0.18, cy + h * 0.18, cx - w, cy);
    g.quadraticCurveTo(cx - w * 0.18, cy - h * 0.18, cx, cy - h);
    g.closePath();
  };
  const plaqueTex = (text) =>
    LvKit.tex(256, 160, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#e9c27a');
      gr.addColorStop(0.5, '#b8873e');
      gr.addColorStop(1, '#7a5426');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#5a3a18';
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#2a1608';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 92px Georgia';
      g.fillText(text, w / 2, h / 2 + 6);
    });
  const makeTextures = () => {
    T.plaque = ROMAN.map(plaqueTex);
    // the carreau mask: gold leaf, two almond eye holes, a ruby lozenge on the brow
    T.mask = LvKit.tex(512, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#f0c25a');
      gr.addColorStop(0.5, '#c8862a');
      gr.addColorStop(1, '#7a4612');
      g.fillStyle = gr;
      // a wide lozenge across the eyes, its wings pointed
      g.beginPath();
      g.moveTo(w * 0.5, 0);
      g.bezierCurveTo(w * 0.7, h * 0.12, w * 0.88, h * 0.3, w * 0.99, h * 0.52);
      g.bezierCurveTo(w * 0.84, h * 0.66, w * 0.66, h * 0.9, w * 0.5, h * 0.97);
      g.bezierCurveTo(w * 0.34, h * 0.9, w * 0.16, h * 0.66, w * 0.01, h * 0.52);
      g.bezierCurveTo(w * 0.12, h * 0.3, w * 0.3, h * 0.12, w * 0.5, 0);
      g.fill();
      g.strokeStyle = '#7a0c1c';
      g.lineWidth = 10;
      g.stroke();
      // filigree
      g.strokeStyle = 'rgba(90,50,10,.55)';
      g.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(w * (0.08 + k * 0.03), h * 0.52);
        g.bezierCurveTo(w * 0.2, h * (0.2 + k * 0.05), w * 0.4, h * (0.12 + k * 0.08), w * 0.5, h * (0.1 + k * 0.1));
        g.bezierCurveTo(w * 0.6, h * (0.12 + k * 0.08), w * 0.8, h * (0.2 + k * 0.05), w * (0.92 - k * 0.03), h * 0.52);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,250,220,.5)';
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        g.beginPath();
        g.arc(w * 0.5 + Math.cos(a) * w * 0.44, h * 0.53 + Math.sin(a) * h * 0.4, 2.4, 0, TAU);
        g.fill();
      }
      // the ruby
      diamondPath(g, w * 0.5, h * 0.2, w * 0.05, h * 0.14);
      g.fillStyle = '#c4102e';
      g.fill();
      g.strokeStyle = '#ffe2a0';
      g.lineWidth = 4;
      g.stroke();
      // eye holes
      g.globalCompositeOperation = 'destination-out';
      [-1, 1].forEach((s) => {
        g.save();
        g.translate(w * (0.5 + s * 0.215), h * 0.6);
        g.rotate(s * 0.28);
        g.beginPath();
        g.ellipse(0, 0, w * 0.085, h * 0.13, 0, 0, TAU);
        g.fill();
        g.restore();
      });
      g.globalCompositeOperation = 'source-over';
    });
    // ermine: white fur with black tails
    T.ermine = LvKit.tex(256, 256, (g, w, h) => {
      LvKit.grain(g, w, h, '#f4f0e8', 0.08, 3000);
      g.fillStyle = '#16121a';
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const cx = (x + (y % 2) * 0.5) * (w / 4) + 20;
          const cy = y * (h / 4) + 30;
          g.beginPath();
          g.moveTo(cx, cy - 14);
          g.lineTo(cx + 6, cy + 10);
          g.lineTo(cx, cy + 16);
          g.lineTo(cx - 6, cy + 10);
          g.fill();
        }
    }, 3, 1);
    // brocade for the robes: a lozenge lattice
    T.brocade = LvKit.tex(256, 256, (g, w, h) => {
      LvKit.grain(g, w, h, '#ffffff', 0.05, 2000);
      g.strokeStyle = 'rgba(160,120,60,.55)';
      g.lineWidth = 3;
      for (let i = -4; i < 8; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64 + h, h);
        g.moveTo(i * 64, h);
        g.lineTo(i * 64 + h, 0);
        g.stroke();
      }
      g.fillStyle = 'rgba(190,150,70,.6)';
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          diamondPath(g, x * 64 + 32, y * 64, 7, 10);
          g.fill();
        }
    }, 2, 2);
    // a soft round glow
    T.soft = LvKit.tex(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    // the grid's brass inlay (lines and pits drawn on the floor of the gallery)
    T.rainbow = LvKit.tex(256, 32, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      ['#ff4a4a', '#ffa83a', '#fff25a', '#4aff8a', '#4ac8ff', '#8a6aff'].forEach((c, i) => gr.addColorStop(i / 5, c));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const fade = g.createLinearGradient(0, 0, 0, h);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(0.5, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = fade;
      g.fillRect(0, 0, w, h);
    });
  };

  // ---------- materials ----------
  const M = {};
  const std = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
  const makeMats = () => {
    M.mosaic = scan('tiles', 'mosaic', { color: '#fff1dc', scale: 4, rough: 1 });
    M.plaster = scan('plaster', 'plaster', { color: '#f3e2c4', scale: 3, rough: 1 });
    M.garnetWall = scan('plaster', 'plaster', { color: '#6a1820', scale: 3, rough: 1 });
    M.stone = scan('stone', 'stone', { color: '#b8a48c', scale: 4, rough: 1 });
    M.rock = scan('stone', 'stone', { color: '#5e5662', scale: 9, rough: 1, bump: 1.4 });
    M.wood = scan('wood', 'wood', { color: '#8a5634', scale: 2.2, rough: 0.85 });
    M.brass = Tex.mat('metal', { color: '#dcaa52', rough: 0.3, metal: 1, scale: 1.4, dcour: 'brass' });
    M.bronze = Tex.mat('metal', { color: '#7a5228', rough: 0.42, metal: 0.9, scale: 2, dcour: 'bronze' });
    // no env map in the game: metals get a cheap studio reflection, else they render black
    if (typeof Assets !== 'undefined' && Assets.envify) [M.brass, M.bronze].forEach((m) => Assets.envify(m, 0.7));
    M.glass = std('#ffe2a8', 0.05, { metalness: 0.4, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
    M.velvet = std('#7a1424', 0.92, { map: T.brocade });
    M.dark = std('#1a120e', 0.7);
    // a mirror without real reflections: a silvered gradient that catches the gold of the room
    T.mirror = LvKit.tex(256, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w * 0.3, h);
      gr.addColorStop(0, '#f4f2ee');
      gr.addColorStop(0.35, '#b8b4b0');
      gr.addColorStop(0.55, '#e8d2a8');
      gr.addColorStop(0.8, '#8e8a88');
      gr.addColorStop(1, '#d8d4d0');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.35;
      g.fillStyle = '#ffffff';
      [0.18, 0.26, 0.62].forEach((k, i) => {
        g.beginPath();
        g.moveTo(w * k, 0);
        g.lineTo(w * (k + 0.06 + i * 0.03), 0);
        g.lineTo(w * (k - 0.2 + i * 0.03), h);
        g.lineTo(w * (k - 0.26), h);
        g.fill();
      });
    });
    M.mirror = std('#ffffff', 0.12, { map: T.mirror, metalness: 0.35, emissive: '#ffffff', emissiveMap: T.mirror, emissiveIntensity: 0.32, side: THREE.DoubleSide });
    M.lamp = LvKit.glow('#ffcf8a', 2.4);
    M.amber = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#c06010', emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.88, flatShading: true });
    M.panel = scan('wood', 'wood', { color: '#5a3020', scale: 2.2, rough: 0.7 });
    M.gold = LvKit.glow('#ffc65a', 1.8);
    M.crystal = std('#fff4e0', 0.05, { metalness: 0.2, emissive: '#6a4a20', transparent: true, opacity: 0.75, flatShading: true });
    if (typeof Assets !== 'undefined' && Assets.envify) Assets.envify(M.crystal, 1);
  };

  // ---------- batching of the static scenery (one draw call per material) ----------
  const BAT = {};
  const bat = (k) => BAT[k] || (BAT[k] = LvKit.batch());
  const G = {};
  const put = (k, geo, x, y, z, rot, scl) => bat(k).add(geo, P(x, y, z), rot, scl);
  const box = (k, x, y, z, sx, sy, sz, rot) => put(k, G.box, x, y, z, rot, [sx, sy, sz]);
  const flushBatches = () =>
    Object.entries(BAT).forEach(([k, b]) => {
      if (!b.size) return;
      root.add(b.mesh(M[k]));
    });
  const wall = (x, y, z, sx, sy, sz) => K.collider(x, y + sy / 2, z, sx, sy, sz);
  // a floor slab with its collider (top at y)
  const slab = (k, x, top, z, w, d, th = 0.6) => {
    box(k, x, top - th / 2, z, w, th, d);
    K.collider(x, top - th / 2, z, w, th, d);
  };
  // a round floor (top at y) with a square collider inside the walls
  const disc = (k, x, top, z, r) => {
    put(k, G.disc, x, top - 0.3, z, null, [r, 0.6, r]);
    K.collider(x, top - 0.3, z, r * 2, 0.6, r * 2);
  };
  // a round wall of radius r, from angle a0 to a1 (0 = +x, counter-clockwise seen from above,
  // z = -sin), height h; colliders as a chain of small boxes; gaps are left by the caller
  const ring = (x, z, r, a0, a1, h, opt = {}) => {
    const n = Math.max(2, Math.ceil(((a1 - a0) * r) / 2.2));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((i + 0.5) / n) * (a1 - a0);
      const w = ((a1 - a0) * r) / n + 0.05;
      const px = x + Math.cos(a) * r;
      const pz = z - Math.sin(a) * r;
      const ry = a + Math.PI / 2;
      // wainscot of plaster, brass rail, then glass up to the dome
      box(opt.low || 'plaster', px, 1.4, pz, w, 2.8, 0.5, [0, ry, 0]);
      box('brass', Math.cos(a) * -0.28 + px, 2.85, pz + Math.sin(a) * 0.28, w, 0.12, 0.1, [0, ry, 0]);
      if (h > 3) {
        box('glass', px, 2.9 + (h - 2.9) / 2, pz, w, h - 2.9, 0.05, [0, ry, 0]);
        // the brass mullions
        if (i % 2 === 0) box('brass', px + Math.cos(a) * 0.02, 2.9 + (h - 2.9) / 2, pz - Math.sin(a) * 0.02, 0.1, h - 2.9, 0.12, [0, ry, 0]);
      }
    }
    for (let s = 0; s < ((a1 - a0) * r) / 0.9; s++) {
      const a = a0 + (s + 0.5) * (0.9 / r);
      if (a > a1) break;
      wall(x + Math.cos(a) * (r + 0.1), 0, z - Math.sin(a) * (r + 0.1), 0.9, 6, 0.9);
    }
  };
  // a glass dome with brass ribs over a round room
  const dome = (x, y, z, r, ribs = 16) => {
    put('glass', G.dome, x, y, z, null, [r, r * 0.8, r]);
    for (let i = 0; i < ribs; i++) put('brass', G.rib, x, y, z, [0, (i / ribs) * Math.PI, 0], [r, r * 0.8, r]);
    put('brass', G.ringFlat, x, y, z, [Math.PI / 2, 0, 0], [r, r, 1]);
    put('brass', G.ringFlat, x, y + r * 0.55, z, [Math.PI / 2, 0, 0], [r * 0.7, r * 0.7, 1]);
  };
  // a brass lamp on a pole (and its light in the pool)
  const lamps = [];
  const LIGHTS = [];
  const lamp = (x, y, z, o = {}) => {
    box('bronze', x, y + 1.4, z, 0.12, 2.8, 0.12);
    put('brass', G.lampCap, x, y + 2.95, z);
    put('lamp', G.lampGlass, x, y + 2.75, z);
    LIGHTS.push({ p: P(x, y + 2.7, z), c: new THREE.Color(o.c || '#ffc47a'), i: o.i || 1.4, d: o.d || 16 });
  };
  const hang = (x, y, z, o = {}) => {
    // a hanging crystal lantern
    box('brass', x, y + 1.2, z, 0.04, 2.4, 0.04);
    put('brass', G.lampCap, x, y + 0.2, z);
    put('lamp', G.lampGlass, x, y, z, null, [1.2, 1.2, 1.2]);
    LIGHTS.push({ p: P(x, y - 0.3, z), c: new THREE.Color(o.c || '#ffcf8a'), i: o.i || 1.6, d: o.d || 18 });
  };
  const balustrade = (x0, z0, x1, z1, y) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(2, Math.round(len / 0.55));
    const ry = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      put('brass', G.baluster, lerp(x0, x1, k), y + 0.45, lerp(z0, z1, k));
    }
    box('brass', (x0 + x1) / 2, y + 0.92, (z0 + z1) / 2, 0.14, 0.08, len, [0, ry, 0]);
    box('wood', (x0 + x1) / 2, y + 0.04, (z0 + z1) / 2, 0.3, 0.08, len, [0, ry, 0]);
    K.collider((x0 + x1) / 2, y + 0.55, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.2, 1.1, Math.abs(z1 - z0) + 0.2);
  };
  // stairs from (x, y0, z0) to y1, each step 0.3 high, going along dz (+1 / -1), width w
  const stairs = (x, z0, y0, y1, dz, w, k = 'wood') => {
    const n = Math.ceil((y1 - y0) / 0.3);
    const step = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const top = y0 + step * (i + 1);
      const z = z0 + dz * (i * 0.72 + 0.36);
      box(k, x, top - 0.15, z, w, 0.3, 0.72);
      K.collider(x, (top + y0 - 0.2) / 2, z, w, top - y0 + 0.2, 0.72);
      put('brass', G.box, x, top + 0.005, z + dz * 0.33, null, [w, 0.02, 0.06]);
    }
    return z0 + dz * n * 0.72;
  };
  // the rock that carries the observatory
  const rockGeo = (seed) => {
    const g = new THREE.CylinderGeometry(0.5, 0.05, 1, 20, 10, false);
    const p = g.attributes.position;
    const r = rng(seed);
    const ph = [r() * 10, r() * 10, r() * 10, r() * 10];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const t = 0.5 - y;
      const n =
        1 +
        0.16 * Math.sin(a * 3 + ph[0] + t * 5) +
        0.1 * Math.sin(a * 7 + ph[1] - t * 9) +
        0.05 * Math.sin(a * 13 + ph[2] + t * 3) +
        (t > 0.05 ? 0.12 * (hash(Math.round(a * 4), Math.round(t * 9) + seed) - 0.5) : 0);
      const belly = 1 + 0.25 * Math.sin(t * Math.PI) * (t < 0.6 ? 1 : 0.6);
      p.setXYZ(i, x * n * belly, -t + 0.02 * Math.sin(a * 5 + ph[3]) * t, z * n * belly);
    }
    g.computeVertexNormals();
    return g;
  };

  // ---------- the sky above the storm (warmer than the Marché's: a gold glow in the rift) ----------
  const SH = { time: { value: 0 }, flash: { value: 0 }, bolt: { value: V3(0, 1, 0) }, fp: { value: V3(0, 0, 0) }, cam: { value: V3() } };
  const HOR = new THREE.Color('#2c1e24');
  const SKY = {};
  const makeSky = () => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(700, 48, 24),
      new THREE.ShaderMaterial({
        uniforms: { uTime: SH.time, uFlash: SH.flash, uBolt: SH.bolt, uHor: { value: HOR } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec3 vD;
          void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime, uFlash; uniform vec3 uBolt, uHor;
          varying vec3 vD;
          ${NOISE_GLSL}
          void main() {
            vec3 d = normalize(vD);
            float y = d.y;
            vec3 zen = vec3(0.02, 0.016, 0.03);
            vec3 col = mix(uHor, zen, smoothstep(-0.02, 0.55, y));
            vec2 q = d.xz / (0.18 + max(y, 0.0)) * 0.8;
            float n = fbm(q * 1.2 + vec2(uTime * 0.012, uTime * 0.005));
            float n2 = fbm(q * 3.1 - vec2(uTime * 0.02, 0.0));
            float c = smoothstep(0.38, 0.86, n * 0.75 + n2 * 0.35) * smoothstep(0.04, 0.3, y);
            col = mix(col, vec3(0.1, 0.075, 0.08) * (0.7 + 0.6 * n2), c * 0.85);
            // the rift, seen from the Cour: a tear lit gold at its heart
            vec3 N = normalize(vec3(0.85, 0.22, -0.48));
            float along = atan(d.z, d.x);
            float wid = 0.025 + 0.05 * fbm(vec2(along * 3.0, uTime * 0.03));
            float k = abs(dot(d, N));
            float lip = exp(-k / (wid * 1.1)) * smoothstep(0.08, 0.4, y);
            float core = exp(-k / (wid * 0.22)) * smoothstep(0.12, 0.45, y);
            col += vec3(0.62, 0.22, 0.18) * lip * 0.4 + vec3(1.0, 0.86, 0.6) * core * 0.75;
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.15 + 0.9 * c) * vec3(0.78, 0.76, 1.0) * (0.35 + 1.3 * near);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    m.renderOrder = -9;
    m.frustumCulled = false;
    wx.add(m);
    SKY.dome = m;
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(3200, 3200, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: { uTime: SH.time, uFlash: SH.flash, uFP: SH.fp, uCam: SH.cam, uHor: { value: HOR } },
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec3 vW;
          void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform float uTime, uFlash; uniform vec3 uFP, uCam, uHor;
          varying vec3 vW;
          ${NOISE_GLSL}
          void main() {
            vec2 p = vW.xz * 0.011;
            float n = fbm(p + vec2(uTime * 0.012, uTime * 0.007));
            float n2 = fbm(p * 2.6 - vec2(uTime * 0.018, -uTime * 0.01));
            float h = n * 0.65 + n2 * 0.35;
            vec3 col = mix(vec3(0.055, 0.04, 0.05), vec3(0.3, 0.24, 0.26), smoothstep(0.3, 0.82, h));
            col += vec3(0.45, 0.28, 0.12) * 0.1 * smoothstep(0.55, 0.9, n2);
            float dd = length(vW.xz - uFP.xy);
            col += vec3(0.66, 0.66, 1.0) * uFP.z * exp(-dd / 70.0) * (0.4 + h) * 1.4;
            col += uFlash * 0.22 * vec3(0.7, 0.7, 1.0) * h;
            float dist = length(vW.xz - uCam.xz);
            col = mix(col, uHor, smoothstep(180.0, 1100.0, dist));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    sea.renderOrder = -8;
    sea.frustumCulled = false;
    wx.add(sea);
    SKY.sea = sea;
  };

  // ---------- lightning ----------
  const boltGeo = (a, b, seed, w, branches = 2) => {
    const r = rng(seed);
    const lines = [];
    const jag = (p0, p1, it, ampK) => {
      let pts = [p0.clone(), p1.clone()];
      let amp = p0.distanceTo(p1) * ampK;
      for (let k = 0; k < it; k++) {
        const np = [];
        for (let i = 0; i < pts.length - 1; i++) {
          np.push(pts[i]);
          const m = pts[i].clone().lerp(pts[i + 1], 0.5);
          m.x += (r() - 0.5) * amp;
          m.y += (r() - 0.5) * amp * 0.4;
          m.z += (r() - 0.5) * amp;
          np.push(m);
        }
        np.push(pts[pts.length - 1]);
        pts = np;
        amp *= 0.52;
      }
      return pts;
    };
    const main = jag(a, b, 6, 0.2);
    lines.push([main, w]);
    for (let k = 0; k < branches; k++) {
      const i = 6 + ((r() * (main.length - 20)) | 0);
      const s = main[i];
      const len = a.distanceTo(b) * (0.15 + r() * 0.2);
      const e = s.clone().add(V3((r() - 0.5) * len, -len * (0.3 + r() * 0.5), (r() - 0.5) * len));
      lines.push([jag(s, e, 4, 0.25), w * 0.55]);
    }
    const pos = [];
    const dir = V3();
    const s1 = V3();
    const s2 = V3();
    const up = V3(0, 1, 0);
    lines.forEach(([pts, ww]) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        dir.copy(p1).sub(p0).normalize();
        s1.crossVectors(dir, Math.abs(dir.y) > 0.9 ? V3(1, 0, 0) : up).normalize();
        s2.crossVectors(dir, s1).normalize();
        const tw = ww * (1 - (i / pts.length) * 0.5);
        [s1, s2].forEach((s) => {
          const a0 = p0.clone().addScaledVector(s, tw);
          const a1 = p0.clone().addScaledVector(s, -tw);
          const b0 = p1.clone().addScaledVector(s, tw);
          const b1 = p1.clone().addScaledVector(s, -tw);
          pos.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, a0.x, a0.y, a0.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
        });
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeBoundingSphere();
    return g;
  };
  const bolts = [];
  const makeBolts = () => {
    for (let i = 0; i < 3; i++) {
      const mk = (c, k, op) =>
        new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }),
        );
      const core = mk('#f0eaff', 3, 1);
      const halo = mk('#9a8aff', 1.2, 0.3);
      core.visible = halo.visible = false;
      core.frustumCulled = halo.frustumCulled = false;
      wx.add(core, halo);
      bolts.push({ core, halo, t: -1, life: 0.5 });
    }
  };
  let flashV = 0;
  const flash = (k) => (flashV = Math.max(flashV, k));
  const bolt = (a, b, opt = {}) => {
    const Bo = bolts.find((x) => x.t < 0) || bolts[0];
    const seed = (Math.random() * 1e6) | 0;
    Bo.core.geometry.dispose();
    Bo.halo.geometry.dispose();
    Bo.core.geometry = boltGeo(a, b, seed, opt.w || 0.3, opt.branches != null ? opt.branches : 3);
    Bo.halo.geometry = boltGeo(a, b, seed, (opt.w || 0.3) * 4, opt.branches != null ? opt.branches : 3);
    Bo.core.material.color.set(opt.gold ? '#fff0c8' : '#f0eaff').multiplyScalar(3);
    Bo.halo.material.color.set(opt.gold ? '#ffb040' : '#9a8aff').multiplyScalar(1.2);
    Bo.t = 0;
    Bo.life = opt.life || 0.55;
    Bo.core.visible = Bo.halo.visible = true;
    SH.bolt.value.copy(a).sub(R.camera.position).normalize();
    flash(opt.flash != null ? opt.flash : 1);
  };
  const tickBolts = (dt) => {
    bolts.forEach((Bo) => {
      if (Bo.t < 0) return;
      Bo.t += dt;
      const on = Bo.t < 0.07 || (Bo.t > 0.13 && Bo.t < 0.2) || (Bo.t > 0.27 && Bo.t < Bo.life);
      const k = on ? 1 - (Bo.t / Bo.life) * 0.6 : 0.15;
      Bo.core.material.opacity = k;
      Bo.halo.material.opacity = k * 0.3;
      if (Bo.t > Bo.life) {
        Bo.t = -1;
        Bo.core.visible = Bo.halo.visible = false;
      }
    });
  };
  let stormT = 3;
  let innerT = 1;
  const tickStorm = (dt, me) => {
    stormT -= dt;
    innerT -= dt;
    const cy = O.y - 32;
    if (innerT <= 0) {
      innerT = 1.4 + Math.random() * 3;
      const a = Math.random() * TAU;
      const d = 60 + Math.random() * 300;
      SH.fp.value.set(me.x + Math.sin(a) * d, me.z + Math.cos(a) * d, 0.5 + Math.random() * 0.6);
    }
    if (stormT <= 0) {
      stormT = 6 + Math.random() * 8;
      const a = Math.random() * TAU;
      const d = 110 + Math.random() * 220;
      const x = me.x + Math.sin(a) * d;
      const z = me.z + Math.cos(a) * d;
      const up = Math.random() < 0.5;
      const p0 = V3(x, cy - 4, z);
      const p1 = V3(x + (Math.random() - 0.5) * 60, O.y + 120 + Math.random() * 80, z + (Math.random() - 0.5) * 60);
      bolt(up ? p0 : p1, up ? p1 : p0, { w: 0.6, life: 0.6, flash: 0.4 + Math.random() * 0.4 });
      SH.fp.value.set(x, z, 1.4);
      AU.thunder(d);
    }
  };

  // ---------- the figures: tall Veilleurs in court costume, a carreau mask ----------
  // kind 'V' (Valet: tabard, toque and plume, a halberd), 'D' (Dame: gown, lace fan collar, tiara
  // and veil, a crystal flower), 'R' (Roi: robe, ermine and mantle, crown, sceptre). Each holds
  // its card in the left hand. pose({ t, talk, bow, look, lay }) animates it.
  const FIGMAT = {};
  const figMats = () => {
    if (FIGMAT.skin) return FIGMAT;
    FIGMAT.skin = std('#cfd7cc', 0.45, { metalness: 0.05 });
    FIGMAT.garnet = std('#8c1d2c', 0.75, { map: T.brocade || null });
    FIGMAT.crimson = std('#b8283c', 0.7);
    FIGMAT.ivory = std('#f1e6d0', 0.65);
    FIGMAT.dark = std('#24161a', 0.6);
    FIGMAT.boot = std('#140c0c', 0.25, { metalness: 0.3 });
    FIGMAT.glove = std('#f6f1e8', 0.55);
    FIGMAT.gold = std('#e4b55a', 0.28, { metalness: 1 });
    FIGMAT.eye = std('#07060c', 0.06, { metalness: 0.3 });
    FIGMAT.ruby = new THREE.MeshStandardMaterial({ color: '#c4102e', emissive: '#7a0414', roughness: 0.1, metalness: 0.3, flatShading: true });
    FIGMAT.mask = new THREE.MeshStandardMaterial({ map: T.mask, alphaTest: 0.4, roughness: 0.35, metalness: 0.45, emissive: '#ffffff', emissiveMap: T.mask, emissiveIntensity: 0.22, side: THREE.DoubleSide });
    FIGMAT.ermine = std('#ffffff', 0.9, { map: T.ermine });
    FIGMAT.veil = std('#f6e8dc', 0.9, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    FIGMAT.lace = std('#f6efe2', 0.8, { side: THREE.DoubleSide });
    FIGMAT.plume = std('#fff6e6', 0.9, { side: THREE.DoubleSide });
    FIGMAT.crystal = new THREE.MeshStandardMaterial({ color: '#ffe8c0', emissive: '#a06a20', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85, flatShading: true });
    if (typeof Assets !== 'undefined' && Assets.envify) [FIGMAT.gold, FIGMAT.mask, FIGMAT.boot].forEach((m) => Assets.envify(m, 0.8));
    return FIGMAT;
  };
  const diamondGeo = (w, h, d) => {
    const s = new THREE.Shape();
    s.moveTo(0, h);
    s.lineTo(w, 0);
    s.lineTo(0, -h);
    s.lineTo(-w, 0);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: d * 0.4, bevelThickness: d * 0.4, bevelSegments: 1 }).translate(0, 0, -d / 2);
  };
  // fewer draw calls: inside each rigid group, the plain meshes that share a material become one
  const compact = (root0) => {
    const groups = [];
    root0.traverse((o) => o.children.length && groups.push(o));
    groups.forEach((grp) => {
      const by = new Map();
      grp.children.forEach((m) => {
        if (!m.isMesh || m.children.length || m.userData.keep) return;
        const k = m.material.uuid;
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(m);
      });
      by.forEach((list) => {
        if (list.length < 2) return;
        const b = LvKit.batch();
        list.forEach((m) => {
          b.add(m.geometry, m.position, [m.rotation.x, m.rotation.y, m.rotation.z], m.scale);
          grp.remove(m);
        });
        grp.add(b.mesh(list[0].material));
      });
    });
  };
  const figure = (kind) => {
    if (!T.mask) makeTextures();
    const F = figMats();
    const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const g = new THREE.Group();
    const H = kind === 'R' ? 3.8 : kind === 'D' ? 3.5 : 3.3;
    const k = H / 3;
    const inner = new THREE.Group();
    inner.scale.setScalar(k);
    g.add(inner);
    const WAIST = 1.3;
    // the lower costume (does not bend)
    if (kind === 'V') {
      // breeches, stockings and boots under a knee-long tabard
      [-1, 1].forEach((s) => {
        add(inner, new THREE.CylinderGeometry(0.09, 0.07, 0.75, 12), F.ivory, s * 0.13, 0.55, 0);
        add(inner, new THREE.CylinderGeometry(0.1, 0.1, 0.32, 12), F.boot, s * 0.13, 0.16, 0.02);
        add(inner, new THREE.SphereGeometry(0.1, 12, 8).scale(1, 0.55, 1.6), F.boot, s * 0.13, 0.04, 0.07);
      });
      add(inner, new THREE.LatheGeometry([V2(0.001, 0.75), V2(0.42, 0.72), V2(0.36, 1.05), V2(0.3, WAIST + 0.02)], 28), F.garnet);
      add(inner, new THREE.TorusGeometry(0.42, 0.025, 6, 32).rotateX(Math.PI / 2), F.gold, 0, 0.74, 0);
    } else {
      const flare = kind === 'R' ? 0.72 : 0.78;
      add(inner, new THREE.LatheGeometry([V2(0.001, 0.0), V2(flare, 0.0), V2(flare * 0.92, 0.25), V2(0.5, 0.75), V2(0.32, WAIST + 0.02)], 36), kind === 'D' ? F.crimson : F.garnet);
      add(inner, new THREE.TorusGeometry(flare, 0.03, 6, 40).rotateX(Math.PI / 2), F.gold, 0, 0.02, 0);
      add(inner, new THREE.TorusGeometry(flare * 0.88, 0.02, 6, 40).rotateX(Math.PI / 2), F.gold, 0, 0.3, 0);
      if (kind === 'D') {
        // the ivory front panel of the gown, embroidered with lozenges
        const panel = add(inner, new THREE.CylinderGeometry(0.3, 0.6, 1.2, 24, 1, true, -0.5, 1.0), F.ivory, 0, 0.62, 0.02);
        panel.scale.set(1.04, 1, 1.04);
        for (let i = 0; i < 5; i++) add(inner, diamondGeo(0.05, 0.08, 0.02), F.ruby, 0, 0.2 + i * 0.22, 0.56 - i * 0.055);
      }
    }
    // the upper body bends at the waist (bows)
    const body = new THREE.Group();
    body.position.y = WAIST;
    inner.add(body);
    add(body, new THREE.LatheGeometry([V2(0.31, 0), V2(0.36, 0.3), V2(0.38, 0.52), V2(0.3, 0.7), V2(0.1, 0.78)], 28), kind === 'D' ? F.crimson : F.garnet);
    add(body, new THREE.TorusGeometry(0.31, 0.035, 6, 28).rotateX(Math.PI / 2), F.gold, 0, 0.02, 0);
    // the suit on the chest: a ruby lozenge in a gold frame
    add(body, diamondGeo(0.13, 0.19, 0.03), F.gold, 0, 0.42, 0.355).rotation.x = -0.12;
    add(body, diamondGeo(0.095, 0.15, 0.05), F.ruby, 0, 0.42, 0.37).rotation.x = -0.12;
    // shoulders and arms
    const arms = [];
    [-1, 1].forEach((s) => {
      const sh = new THREE.Group();
      sh.position.set(s * 0.4, 0.64, 0);
      body.add(sh);
      add(sh, new THREE.SphereGeometry(0.12, 14, 10), kind === 'D' ? F.crimson : F.garnet);
      const up = new THREE.Group();
      sh.add(up);
      if (kind === 'D') add(up, new THREE.CylinderGeometry(0.08, 0.2, 0.62, 14, 1, true).translate(0, -0.31, 0), F.lace);
      add(up, new THREE.CylinderGeometry(0.075, 0.065, 0.56, 12).translate(0, -0.28, 0), kind === 'D' ? F.crimson : F.garnet);
      const el = new THREE.Group();
      el.position.y = -0.56;
      up.add(el);
      add(el, new THREE.CylinderGeometry(0.065, 0.055, 0.5, 12).translate(0, -0.25, 0), kind === 'R' ? F.garnet : F.ivory);
      add(el, new THREE.TorusGeometry(0.068, 0.02, 6, 16).rotateX(Math.PI / 2), F.gold, 0, -0.47, 0);
      const hand = new THREE.Group();
      hand.position.y = -0.52;
      el.add(hand);
      add(hand, new THREE.SphereGeometry(0.07, 12, 8).scale(0.8, 1.25, 0.6), F.glove, 0, -0.05, 0);
      arms.push({ s, sh, up, el, hand });
    });
    // collar
    const neck = new THREE.Group();
    neck.position.y = 0.76;
    body.add(neck);
    if (kind === 'V') add(neck, new THREE.TorusGeometry(0.14, 0.05, 8, 24).rotateX(Math.PI / 2), F.lace, 0, 0.02, 0);
    if (kind === 'D')
      add(neck, new THREE.LatheGeometry([V2(0.1, 0), V2(0.16, 0.08), V2(0.3, 0.28), V2(0.34, 0.33)], 28, Math.PI * 0.7, Math.PI * 1.6), F.lace, 0, 0, 0).rotation.y = 0;
    if (kind === 'R') {
      add(neck, new THREE.TorusGeometry(0.3, 0.1, 10, 28).rotateX(Math.PI / 2).scale(1, 1, 0.85), F.ermine, 0, -0.06, -0.02);
      // the mantle: an open half-cylinder hanging from the shoulders, ermine hem
      const mantle = add(body, new THREE.CylinderGeometry(0.42, 0.95, 2.05, 28, 1, true, Math.PI * 0.55, Math.PI * 0.9), F.crimson, 0, -0.35, -0.06);
      mantle.material = F.crimson.clone();
      mantle.material.side = THREE.DoubleSide;
      add(body, new THREE.CylinderGeometry(0.94, 0.97, 0.16, 28, 1, true, Math.PI * 0.55, Math.PI * 0.9), F.ermine, 0, -1.33, -0.06).material = F.ermine.clone();
    }
    add(neck, new THREE.CylinderGeometry(0.06, 0.07, 0.16, 12).translate(0, 0.08, 0), F.skin);
    // head: the Veilleurs' egg, big glossy eyes behind the mask
    const head = new THREE.Group();
    head.position.y = 0.36;
    neck.add(head);
    const hr = 0.2;
    add(head, new THREE.SphereGeometry(hr, 32, 24).scale(1, 1.25, 1.03), F.skin);
    [-1, 1].forEach((s) => {
      const e = add(head, new THREE.SphereGeometry(hr * 0.3, 18, 12).scale(1.25, 0.75, 0.5), F.eye, s * hr * 0.38, hr * 0.06, hr * 0.86);
      e.rotation.z = s * -0.35;
      add(e, new THREE.SphereGeometry(hr * 0.06, 8, 6), LvKit.glow('#ffffff', 1.2), s * -0.05 * hr, hr * 0.08, hr * 0.12);
    });
    add(head, new THREE.TorusGeometry(hr * 0.12, hr * 0.018, 6, 16, Math.PI), std('#4a3540', 0.6), 0, -hr * 0.52, hr * 0.98).rotation.z = Math.PI;
    add(head, new THREE.SphereGeometry(hr * 1.07, 32, 16, Math.PI / 2 - 0.95, 1.9, 0.95, 0.95).scale(1, 1.25, 1.03), F.mask);
    // headwear
    const hat = new THREE.Group();
    hat.position.y = hr * 1.05;
    head.add(hat);
    if (kind === 'V') {
      add(hat, new THREE.CylinderGeometry(0.2, 0.22, 0.2, 24), F.garnet, 0, 0.05, 0);
      add(hat, new THREE.TorusGeometry(0.22, 0.03, 8, 28).rotateX(Math.PI / 2), F.gold, 0, -0.04, 0);
      add(hat, diamondGeo(0.04, 0.06, 0.02), F.ruby, 0, 0.04, 0.22);
      // the plume, curling back
      const pl = new THREE.Group();
      pl.position.set(0.12, 0.12, 0.05);
      hat.add(pl);
      for (let i = 0; i < 6; i++) {
        const f = add(pl, new THREE.SphereGeometry(0.06, 10, 6).scale(0.5, 1, 3), F.plume, 0, i * 0.035, -i * 0.07);
        f.rotation.x = -0.4 - i * 0.18;
      }
    }
    if (kind === 'D') {
      add(hat, new THREE.TorusGeometry(0.19, 0.025, 8, 28).rotateX(Math.PI / 2), F.gold, 0, -0.02, 0);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const tall = i === 0 ? 0.2 : i % 2 ? 0.08 : 0.13;
        add(hat, new THREE.ConeGeometry(0.025, tall, 4), F.gold, Math.sin(a) * 0.19, tall / 2, Math.cos(a) * 0.19);
        if (i % 2 === 0) add(hat, new THREE.SphereGeometry(0.022, 8, 6), F.ruby, Math.sin(a) * 0.19, tall + 0.01, Math.cos(a) * 0.19);
      }
      add(hat, new THREE.CylinderGeometry(0.19, 0.4, 1.2, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76), F.veil, 0, -0.6, -0.03);
    }
    if (kind === 'R') {
      add(hat, new THREE.SphereGeometry(0.19, 20, 10, 0, TAU, 0, Math.PI / 2), F.crimson, 0, 0.02, 0);
      add(hat, new THREE.CylinderGeometry(0.22, 0.21, 0.1, 28, 1, true), F.gold, 0, 0.03, 0).material = F.gold;
      add(hat, new THREE.TorusGeometry(0.215, 0.03, 8, 28).rotateX(Math.PI / 2), F.ermine, 0, -0.03, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        add(hat, new THREE.ConeGeometry(0.035, 0.2, 4), F.gold, Math.sin(a) * 0.21, 0.17, Math.cos(a) * 0.21);
        add(hat, new THREE.SphereGeometry(0.026, 8, 6), i % 2 ? F.gold : F.ruby, Math.sin(a) * 0.21, 0.28, Math.cos(a) * 0.21);
      }
      add(hat, diamondGeo(0.05, 0.075, 0.03), F.ruby, 0, 0.06, 0.23);
      add(hat, new THREE.SphereGeometry(0.045, 10, 8), F.gold, 0, 0.24, 0);
      add(hat, new THREE.BoxGeometry(0.02, 0.1, 0.02), F.gold, 0, 0.32, 0);
      add(hat, new THREE.BoxGeometry(0.07, 0.02, 0.02), F.gold, 0, 0.33, 0);
    }
    // props: right hand (halberd / flower / sceptre), left hand the card; the figure faces +z,
    // so its own right is -x
    const right = arms.find((a) => a.s < 0);
    const left = arms.find((a) => a.s > 0);
    const prop = new THREE.Group();
    right.hand.add(prop);
    prop.position.set(0, -0.08, 0.02);
    if (kind === 'V') {
      add(prop, new THREE.CylinderGeometry(0.022, 0.022, 2.4, 8), F.gold, 0, 0.5, 0);
      add(prop, diamondGeo(0.09, 0.2, 0.03), FIGMAT.crystal, 0, 1.85, 0);
      add(prop, new THREE.TorusGeometry(0.08, 0.015, 6, 4).rotateZ(Math.PI / 4), F.gold, 0, 1.62, 0);
    }
    if (kind === 'D') {
      add(prop, new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), F.gold, 0, 0.18, 0);
      add(prop, new THREE.OctahedronGeometry(0.07, 0).scale(1, 1.6, 1), FIGMAT.crystal, 0, 0.45, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        add(prop, new THREE.OctahedronGeometry(0.04, 0).scale(1, 1.8, 1), FIGMAT.crystal, Math.sin(a) * 0.06, 0.42, Math.cos(a) * 0.06).rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7);
      }
    }
    if (kind === 'R') {
      add(prop, new THREE.CylinderGeometry(0.025, 0.02, 1.1, 10), F.gold, 0, 0.2, 0);
      add(prop, new THREE.SphereGeometry(0.05, 12, 8), F.gold, 0, 0.78, 0);
      add(prop, new THREE.OctahedronGeometry(0.11, 0).scale(1, 1.5, 1), FIGMAT.crystal, 0, 0.98, 0);
    }
    const RANK = { V: 'V', D: 'D', R: 'R' }[kind];
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.72),
      new THREE.MeshStandardMaterial({ map: Tex.card(RANK, '♦'), roughness: 0.5, side: THREE.DoubleSide }),
    );
    card.position.set(0, -0.2, 0.05);
    card.rotation.set(0.2, -0.5, 0);
    card.userData.keep = true;
    left.hand.add(card);
    compact(g);
    const fig = {
      g,
      kind,
      H,
      card,
      body,
      head,
      prop,
      arms: { right, left },
      // where the card is in the world (the cinematic takes it from there)
      cardWorld(out = V3()) {
        g.updateMatrixWorld(true);
        return card.getWorldPosition(out);
      },
      pose(o) {
        const t = o.t || 0;
        const talk = o.talk || 0;
        const bow = o.bow || 0;
        const lay = o.lay || 0;
        const br = Math.sin(t * 1.3 + (kind === 'D' ? 1 : kind === 'R' ? 2 : 0));
        body.rotation.set(Math.min(0.95, bow * 0.62 + lay * 0.4), 0, Math.sin(t * 0.55) * 0.025 * (1 - bow));
        body.position.y = WAIST + br * 0.006;
        head.rotation.set(-0.08 + bow * 0.35 + Math.sin(t * 7) * 0.03 * talk + lay * 0.2, clamp(o.look || 0, -0.7, 0.7) * (1 - bow), Math.sin(t * 0.8) * 0.04);
        // right arm: holds its prop, gestures when talking, sweeps to the chest in a bow
        const gst = talk * (0.5 + 0.5 * Math.sin(t * 2.6));
        right.up.rotation.set(-0.25 - gst * 0.9 - bow * 0.9, 0, -0.12 - gst * 0.2 + bow * 0.5);
        right.el.rotation.set(-0.9 + gst * 0.2 - bow * 0.9, 0, 0);
        // left arm: the card at its side; held out and down to lay it
        left.up.rotation.set(-0.15 - lay * 0.9 + bow * 0.35 * (1 - lay), 0, 0.18 + bow * 0.3 * (1 - lay));
        left.el.rotation.set(-0.55 - lay * 0.2, 0, 0);
        if (o.noCard) card.visible = false;
        else card.visible = true;
      },
    };
    fig.pose({ t: 0 });
    return fig;
  };

  // ---------- the interactive things ----------
  const figs = {};
  const gems = []; // room A: per pedestal { g, col: mesh (round, coloured), cut: [4 meshes], plaque }
  const mirrors = []; // room B: a pool of mirror pivots
  const crystals = []; // room B: crystal stands on the edges
  const beam = { segs: [], src: null };
  const slotGems = []; // room C
  const levers = {};
  const gates = {};
  let board = null;
  let orrery = null;
  let screen = null;
  let card = null;
  const pool = [];

  const cutGeo = (k) => {
    if (k === 0) return new THREE.OctahedronGeometry(0.26, 0).scale(1, 1.45, 1);
    if (k === 1) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI;
        const r = Math.sin(a) * (0.24 * (1 - i / 16)) + 0.001;
        pts.push(new THREE.Vector2(r * (i > 6 ? 1 : 1 - (6 - i) * 0.06), 0.3 - (1 - Math.cos(a)) * 0.3 * (i < 6 ? 1.3 : 1)));
      }
      return new THREE.LatheGeometry(pts, 7).translate(0, 0.05, 0);
    }
    if (k === 2) return new THREE.BoxGeometry(0.34, 0.34, 0.34);
    return new THREE.ConeGeometry(0.24, 0.6, 3);
  };
  const gemMat = (c, clear) =>
    new THREE.MeshStandardMaterial({
      color: clear ? '#eef4ff' : c,
      emissive: new THREE.Color(clear ? '#5a6a7a' : c).multiplyScalar(clear ? 0.3 : 0.32),
      roughness: clear ? 0.04 : 0.28,
      metalness: clear ? 0.15 : 0,
      transparent: clear,
      opacity: clear ? 0.78 : 1,
      flatShading: true,
    });
  const makeGems = () => {
    const clear = gemMat('#ffffff', true);
    if (typeof Assets !== 'undefined' && Assets.envify) Assets.envify(clear, 1.2);
    const round = new THREE.IcosahedronGeometry(0.27, 1).scale(1, 0.8, 1);
    PEDS.forEach((p) => {
      const g = new THREE.Group();
      g.position.copy(P(p.x, 1.55, p.z));
      g.scale.setScalar(1.35);
      root.add(g);
      const cols = GEMS.map((c) => {
        const m = new THREE.Mesh(round, gemMat(c.c, false));
        m.visible = false;
        g.add(m);
        return m;
      });
      const cuts = [0, 1, 2, 3].map((k) => {
        const m = new THREE.Mesh(cutGeo(k), clear);
        m.visible = false;
        g.add(m);
        return m;
      });
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: '#ffd89a', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(1.1);
      g.add(halo);
      gems.push({ g, cols, cuts, halo, k: 0, lift: 0, fly: 0 });
    });
  };
  const makeMirror = () => {
    const g = new THREE.Group();
    root.add(g);
    const piv = new THREE.Group();
    g.add(piv);
    // a two-sided mirror in a brass frame (the frame is one mesh, shared)
    if (!G.mirFrame) {
      const fb = LvKit.batch();
      [
        [0, 2.32, 2.3, 0.14],
        [0, 0.28, 2.3, 0.14],
        [-1.1, 1.3, 0.12, 2.1],
        [1.1, 1.3, 0.12, 2.1],
      ].forEach(([x, y, w, h]) => fb.add(G.box, V3(x, y, 0), null, [w, h, 0.14]));
      G.mirFrame = fb.mesh(M.brass).geometry;
    }
    piv.add(new THREE.Mesh(G.mirFrame, M.brass));
    const gl = new THREE.Mesh(G.mirGlass, M.mirror);
    gl.position.y = 1.3;
    piv.add(gl);
    const foot = new THREE.Mesh(G.mirFoot, M.bronze);
    foot.position.y = 0.12;
    piv.add(foot);
    const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.plaque[0], transparent: false, depthWrite: true }));
    plaque.scale.set(1.0, 0.63, 1);
    plaque.position.y = 2.95;
    g.add(plaque);
    g.visible = false;
    // a moving collider (the mirror stands in its pit, or is sunk into it)
    const b = Phys.box(0, -50, 0, 0.9, 2.4, 0.9, { dyn: true, surf: 'metal' });
    b.on = false;
    const m = { g, piv, plaque, b, a: 0, low: 0, n: -1 };
    mirrors.push(m);
    return m;
  };
  const makeCrystal = () => {
    const g = new THREE.Group();
    root.add(g);
    const stand = new THREE.Mesh(G.cryStand, M.bronze);
    stand.position.y = 0.55;
    g.add(stand);
    const c = new THREE.Mesh(G.cryGem, M.crystal);
    c.position.y = 1.55;
    g.add(c);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: '#ffcf6a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.y = 1.55;
    halo.scale.setScalar(2.4);
    g.add(halo);
    g.visible = false;
    const o = { g, c, halo, on: 0, hit: 0 };
    crystals.push(o);
    return o;
  };
  const beamMat = () => ({
    // drawn over everything: whoever sees the light sees all of it, mirrors or not
    core: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c8').multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffab3a').multiplyScalar(1.1), toneMapped: false, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  });
  const makeBeam = () => {
    const bm = beamMat();
    for (let i = 0; i < 24; i++) {
      const c = new THREE.Mesh(G.box, bm.core);
      const h = new THREE.Mesh(G.box, bm.glow);
      c.visible = h.visible = false;
      c.renderOrder = h.renderOrder = 5;
      root.add(c, h);
      beam.segs.push({ c, h });
    }
    beam.mats = bm;
  };

  // ---------- the board of the Roi (a canvas, one per screen: gold or silver marks) ----------
  const drawBoard = (hist, mine, reveal, tries) => {
    const c = board.canvas;
    const g = board.g;
    const w = c.width;
    const h = c.height;
    const s = w / 1300;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2a1a10');
    bg.addColorStop(1, '#170e08');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.scale(s, s);
    g.strokeStyle = '#d8a656';
    g.lineWidth = 8;
    g.strokeRect(14, 14, 1300 - 28, 560 - 28);
    g.lineWidth = 2;
    g.strokeRect(28, 28, 1300 - 56, 560 - 56);
    g.fillStyle = '#f2d9a0';
    g.font = 'italic 600 44px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Le Code du Roi', 650, 70);
    g.font = '26px Georgia';
    g.fillStyle = '#c9a874';
    g.fillText(mine === 'gold' ? 'Tes marques : les losanges d’or (bonne pierre, bonne place)' : 'Tes marques : les losanges d’argent (bonne pierre, mauvaise place)', 650, 112);
    const rows = 7;
    for (let i = 0; i < rows; i++) {
      const y = 158 + i * 54;
      const e = hist[i];
      g.fillStyle = i < hist.length ? '#f2d9a0' : '#5a4630';
      g.font = '600 28px Georgia';
      g.textAlign = 'right';
      g.fillText(ROMAN[i], 210, y + 2);
      for (let j = 0; j < 4; j++) {
        const x = 300 + j * 120;
        g.beginPath();
        g.arc(x, y, 20, 0, TAU);
        if (e) {
          const gr = g.createRadialGradient(x - 6, y - 6, 2, x, y, 20);
          gr.addColorStop(0, '#ffffff');
          gr.addColorStop(0.35, GEMS[e.g[j]].c);
          gr.addColorStop(1, '#000000');
          g.fillStyle = gr;
          g.fill();
        } else {
          g.strokeStyle = '#4a3a28';
          g.lineWidth = 3;
          g.stroke();
        }
      }
      // the marks: only mine are shown, the others' are a question
      const n = e ? (mine === 'gold' ? e.b : e.w) : 0;
      for (let j = 0; j < 4; j++) {
        const x = 830 + j * 56;
        diamondPath(g, x, y, 16, 22);
        if (e && j < n) {
          g.fillStyle = mine === 'gold' ? '#ffcc4a' : '#e8eef8';
          g.fill();
        } else {
          g.strokeStyle = e ? '#6a5236' : '#3a2c1e';
          g.lineWidth = 2.5;
          g.stroke();
        }
      }
      if (e) {
        g.fillStyle = '#8a7258';
        g.font = 'italic 24px Georgia';
        g.textAlign = 'left';
        g.fillText(mine === 'gold' ? 'argent : demande' : 'or : demande', 1070, y + 2);
      }
    }
    // the gem the Roi showed (after a lost hand)
    if (reveal && reveal.length) {
      g.textAlign = 'center';
      g.font = 'italic 24px Georgia';
      g.fillStyle = '#ffcf7a';
      g.fillText(reveal.map((r) => ROMAN[r[0]] + ' : ' + GEMS[r[1]].name).join('   ·   ') + '   (montré par le Roi)', 650, 540);
    } else if (tries != null) {
      g.textAlign = 'center';
      g.font = 'italic 24px Georgia';
      g.fillStyle = '#c9a874';
      g.fillText('Essais restants : ' + tries, 650, 540);
    }
    board.tex.needsUpdate = true;
  };

  // ---------- build ----------
  const build = () => {
    if (built) {
      root.visible = true;
      wx.visible = true;
      return;
    }
    built = true;
    root.visible = true;
    wx.visible = true;
    loadScans();
    makeTextures();
    makeMats();
    G.box = new THREE.BoxGeometry(1, 1, 1);
    G.disc = new THREE.CylinderGeometry(1, 1, 1, 48);
    G.shaft = new THREE.CylinderGeometry(0.3, 0.36, 1, 20);
    G.baluster = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 8);
    G.lampCap = new THREE.ConeGeometry(0.28, 0.25, 8);
    G.lampGlass = new THREE.OctahedronGeometry(0.2, 0).scale(1, 1.4, 1);
    G.dome = new THREE.SphereGeometry(1, 40, 14, 0, TAU, 0, Math.PI / 2);
    G.rib = new THREE.TorusGeometry(1, 0.012, 6, 40, Math.PI);
    G.ringFlat = new THREE.TorusGeometry(1, 0.02, 6, 64);
    G.ped = new THREE.CylinderGeometry(0.42, 0.55, 1, 8);
    G.pedTop = new THREE.CylinderGeometry(0.55, 0.45, 0.14, 8);
    G.mirGlass = new THREE.PlaneGeometry(2.1, 1.9);
    G.mirFoot = new THREE.CylinderGeometry(0.5, 0.6, 0.24, 16);
    G.cryStand = new THREE.CylinderGeometry(0.18, 0.35, 1.1, 8);
    G.cryGem = new THREE.OctahedronGeometry(0.42, 0).scale(1, 1.5, 1);
    G.gate = new THREE.BoxGeometry(1, 1, 1);
    const rockGeos = [0, 1, 2, 3].map((i) => rockGeo(41 + i * 13));
    makeSky();
    makeBolts();

    // ===== the rock and the quay =====
    put('rock', rockGeos[0], 0, -0.6, 4, [0, 0.4, 0], [24, 30, 30]);
    put('rock', rockGeos[1], 0, -0.6, 32, [0, 1.3, 0], [34, 42, 34]);
    put('rock', rockGeos[2], 0, -0.6, 68, [0, 2.2, 0], [44, 48, 44]);
    put('rock', rockGeos[3], 0, -0.6, 106, [0, 0.8, 0], [38, 46, 38]);
    put('rock', rockGeos[1], 14, -2, 92, [0, 3.1, 0], [16, 22, 16]);
    put('rock', rockGeos[2], -15, -2.5, 48, [0, 1.7, 0], [14, 20, 14]);
    slab('mosaic', 0, 0, 3, 14, 18);
    box('stone', 0, -0.35, 3, 14.6, 0.5, 18.6);
    balustrade(-7, -6, 7, -6, 0);
    balustrade(-7, -6, -7, 12, 0);
    balustrade(7, -6, 7, 12, 0);
    slab('mosaic', 0, 0, 15, 5, 6.2);
    balustrade(-2.5, 12, -2.5, 18.2, 0);
    balustrade(2.5, 12, 2.5, 18.2, 0);
    lamp(-6.2, 0, -4.8, { i: 1.2 });
    lamp(6.2, 0, -4.8);
    lamp(-6.2, 0, 10.8);
    lamp(6.2, 0, 10.8, { i: 1.2 });
    // a pair of great brass telescopes on the quay, aimed at the rift
    [-1, 1].forEach((s) => {
      box('stone', s * 4.6, 0.5, 6, 1.4, 1, 1.4);
      put('bronze', G.shaft, s * 4.6, 1.6, 6, null, [0.6, 1.4, 0.6]);
      const tube = new THREE.CylinderGeometry(0.22, 0.34, 3.4, 18);
      put('brass', tube, s * 4.6, 3.1, 6.4, [0.9, s * 0.4, 0]);
      K.collider(s * 4.6, 1, 6, 1.4, 2, 1.4);
    });
    screen = makeScreen(5.2, 2.0, 1024);
    screen.mesh.position.copy(P(0, 4.1, 17.4));
    screen.mesh.rotation.y = Math.PI;
    root.add(screen.mesh);

    // ===== A · la Salle des Facettes =====
    disc('mosaic', A.x, 0, A.z, A.r + 0.4);
    put('garnetWall', G.disc, A.x, 0.01, A.z, null, [5.6, 0.02, 5.6]);
    put('brass', G.ringFlat, A.x, 0.03, A.z, [Math.PI / 2, 0, 0], [5.6, 5.6, 1]);
    put('brass', G.ringFlat, A.x, 0.03, A.z, [Math.PI / 2, 0, 0], [8.4, 8.4, 1]);
    // the wall, open south (door) and north (to the gallery)
    const gapA = 0.2;
    ring(A.x, A.z, A.r, -Math.PI / 2 + gapA, Math.PI / 2 - gapA, 7.5, { low: 'panel' });
    ring(A.x, A.z, A.r, Math.PI / 2 + gapA, (3 * Math.PI) / 2 - gapA, 7.5, { low: 'panel' });
    dome(A.x, 7.5, A.z, A.r, 16);
    [-1, 1].forEach((s) => {
      // the door posts (south) and the arch to the gallery (north)
      [A.z - A.r, A.z + A.r].forEach((z) => {
        box('plaster', s * 2.55, 2.4, z, 0.9, 4.8, 1);
        box('brass', s * 2.55, 0.1, z, 1.0, 0.2, 1.1);
        box('brass', s * 2.55, 4.75, z, 1.0, 0.1, 1.1);
      });
    });
    box('garnetWall', 0, 5.1, A.z - A.r, 6, 0.6, 1);
    box('garnetWall', 0, 5.1, A.z + A.r, 6, 0.6, 1);
    PEDS.forEach((p) => {
      put('plaster', G.ped, p.x, 0.55, p.z, null, [1, 1.1, 1]);
      put('brass', G.ringFlat, p.x, 0.12, p.z, [Math.PI / 2, 0, 0], [0.56, 0.56, 3]);
      put('brass', G.pedTop, p.x, 1.17, p.z);
      K.collider(p.x, 0.62, p.z, 1.0, 1.24, 1.0);
      // its number, on a brass plaque facing the middle
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.53), new THREE.MeshStandardMaterial({ map: T.plaque[p.i], roughness: 0.35, metalness: 0.6 }));
      pl.position.copy(P(p.x, 0.78, p.z));
      pl.lookAt(P(A.x, 0.8, A.z));
      pl.translateZ(0.5);
      root.add(pl);
    });
    makeGems();
    // the Valet's dais
    put('wood', G.disc, FIG_A[0], 0.25, FIG_A[2], null, [2.2, 0.5, 2.2]);
    put('brass', G.ringFlat, FIG_A[0], 0.5, FIG_A[2], [Math.PI / 2, 0, 0], [2.2, 2.2, 1]);
    K.collider(FIG_A[0], 0.25, FIG_A[2], 3.6, 0.5, 3.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      hang(A.x + Math.cos(a) * 7.8, 5.6, A.z + Math.sin(a) * 7.8);
    }
    hang(A.x, 6.4, A.z, { i: 1.8, d: 20 });
    // tall brass prisms between the pedestals, throwing rainbows on the floor
    for (let i = 0; i < 5; i++) {
      const a = ((198 - i * 44 - 22) * Math.PI) / 180;
      const x = Math.cos(a) * -9.6;
      const z = A.z + Math.sin(a) * -9.6 + 1;
      put('bronze', G.shaft, x, 0.1, z, null, [1.1, 0.2, 1.1]);
      put('brass', G.shaft, x, 1.1, z, null, [0.16, 1.9, 0.16]);
      put('brass', G.ringFlat, x, 2.05, z, [Math.PI / 2, 0, 0], [0.26, 0.26, 2]);
      put('amber', G.lampGlass, x, 2.45, z, [0, i, 0], [1.1, 1.3, 1.1]);
      K.collider(x, 1.2, z, 0.6, 2.4, 0.6);
    }
    gates.A = { m: new THREE.Group(), k: 0, b: K.collider(0, 2.2, GATE_A, 4.4, 4.4, 0.5) };
    for (let i = -4; i <= 4; i++) {
      const bar = new THREE.Mesh(G.box, M.brass);
      bar.scale.set(0.09, 4.2, 0.09);
      bar.position.set(i * 0.5, 2.1, 0);
      gates.A.m.add(bar);
    }
    [0.6, 2.2, 3.9].forEach((y) => {
      const r = new THREE.Mesh(G.box, M.brass);
      r.scale.set(4.4, 0.08, 0.1);
      r.position.y = y;
      gates.A.m.add(r);
    });
    const dA = new THREE.Mesh(diamondGeo(0.4, 0.6, 0.08), M.gold);
    dA.position.set(0, 2.2, 0.05);
    gates.A.m.add(dA);
    gates.A.m.position.copy(P(0, 0, GATE_A));
    root.add(gates.A.m);

    // ===== the corridor A → B =====
    slab('mosaic', 0, 0, 47, 6, 10.4);
    [-1, 1].forEach((s) => {
      box('plaster', s * 3.2, 1.4, 47, 0.4, 2.8, 10.4);
      box('brass', s * 3.0, 2.85, 47, 0.1, 0.12, 10.4);
      box('glass', s * 3.2, 4.4, 47, 0.05, 3.2, 10.4);
      wall(s * 3.3, 0, 47, 0.6, 6, 10.4);
      for (let z = 42.4; z <= 52; z += 2.4) {
        box('brass', s * 3.15, 4.4, z, 0.12, 3.2, 0.12);
        put('brass', G.rib, 0, 6, z, null, [3.2, 1.2, 1]);
      }
    });
    box('glass', 0, 6.9, 47, 6.2, 0.05, 10.4);
    hang(0, 5, 47, { i: 1.4 });

    // ===== B · la Galerie des Prismes =====
    const bz = (B.z0 + B.z1) / 2;
    const bl = B.z1 - B.z0;
    slab('mosaic', 0, 0, bz, B.w * 2, bl);
    // the walls (south has the entrance under the balcony, north the arch to the dome)
    [-1, 1].forEach((s) => {
      box('plaster', s * B.w, 1.4, bz, 0.5, 2.8, bl);
      box('brass', s * (B.w - 0.28), 2.85, bz, 0.1, 0.12, bl);
      box('glass', s * B.w, 5.7, bz, 0.05, 5.8, bl);
      for (let z = B.z0; z <= B.z1; z += 4) box('brass', s * (B.w - 0.03), 5.7, z, 0.14, 5.8, 0.14);
      wall(s * (B.w + 0.1), 0, bz, 0.6, 9, bl);
      // the end walls, around their openings
      box('plaster', s * 9.75, 1.4, B.z0, 14.5, 2.8, 0.5);
      box('plaster', s * 9.75, 1.4, B.z1, 14.5, 2.8, 0.5);
      box('glass', s * 9.75, 5.7, B.z1, 14.5, 5.8, 0.05);
      box('glass', s * 9.75, 5.7, B.z0, 14.5, 5.8, 0.05);
      wall(s * 9.75, 0, B.z0, 14.5, 9, 0.6);
      wall(s * 9.75, 0, B.z1, 14.5, 9, 0.6);
    });
    box('glass', 0, 7.3, B.z0, 5, 2.6, 0.05);
    for (let x = -15; x <= 15; x += 3.75) box('brass', x, 5.7, B.z0, 0.12, 5.8, 0.14);
    box('stone', 0, 6.5, B.z1, 5, 4.2, 0.5);
    // the roof: brass trusses and glass, a gable
    for (let z = B.z0; z <= B.z1; z += 4) {
      put('brass', G.rib, 0, 8.6, z, [0, 0, 0], [B.w, 3.2, 1]);
      box('brass', 0, 8.6, z, B.w * 2, 0.1, 0.1);
    }
    [-1, 1].forEach((s) => box('glass', s * B.w * 0.5, 10.2, bz, B.w * 1.05, 0.05, bl, [0, 0, s * -0.19]));
    // the grid: brass inlay in the floor, a pit at every cell
    for (let c = 0; c <= COLS; c++) box('brass', cellX(c) - CELL / 2, 0.012, cellZ(0) + (ROWS * CELL) / 2 - CELL / 2, 0.08, 0.02, ROWS * CELL);
    for (let r = 0; r <= ROWS; r++) box('brass', cellX(0) + (COLS * CELL) / 2 - CELL / 2, 0.012, cellZ(r) - CELL / 2, COLS * CELL, 0.02, 0.08);
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        put('dark', G.disc, cellX(c), 0.008, cellZ(r), null, [0.8, 0.01, 0.8]);
        put('brass', G.ringFlat, cellX(c), 0.02, cellZ(r), [Math.PI / 2, 0, 0], [0.84, 0.84, 1]);
      }
    for (let i = 0; i < 8; i++) makeMirror();
    for (let i = 0; i < 6; i++) makeCrystal();
    makeBeam();
    // the heliostat: a brass sun-catcher on the west side, its lens glowing
    beam.src = new THREE.Group();
    const hs = beam.src;
    const hsBase = new THREE.Mesh(G.mirFoot, M.bronze);
    hsBase.position.y = 0.12;
    hs.add(hsBase);
    const hsPost = new THREE.Mesh(G.shaft, M.brass);
    hsPost.scale.set(0.5, 1.4, 0.5);
    hsPost.position.y = 0.8;
    hs.add(hsPost);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 18).rotateZ(Math.PI / 2), M.brass);
    tube.position.y = 1.55;
    hs.add(tube);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24).rotateY(Math.PI / 2), LvKit.glow('#ffe2a0', 2.6));
    lens.position.set(0.81, 1.55, 0);
    hs.add(lens);
    beam.lens = lens;
    root.add(hs);
    // the balcony over the south end, and its two stairs
    slab('wood', 0, BAL_Y, (BAL_Z[0] + BAL_Z[1]) / 2, B.w * 2 - 1, BAL_Z[1] - BAL_Z[0], 0.4);
    box('brass', 0, BAL_Y - 0.45, BAL_Z[1], B.w * 2 - 1, 0.14, 0.14);
    balustrade(-12.6, BAL_Z[1] + 0.1, 12.6, BAL_Z[1] + 0.1, BAL_Y);
    [-1, 1].forEach((s) => {
      stairs(s * 14.6, BAL_Z[1] + 0.05 + 15 * 0.72, 0, BAL_Y, -1, 3.2);
      balustrade(s * 12.9, BAL_Z[1] + 0.2, s * 12.9, BAL_Z[1] + 11, 0);
      for (let z = 59; z < 69; z += 3) box('bronze', s * 12.95, 2.3, z, 0.12, 4.6, 0.12);
    });
    // the great lens on the balcony (the guide's place): a brass ring on a stand, tilted down
    put('brass', G.ringFlat, 0, BAL_Y + 1.7, LENS[1], [-0.6, 0, 0], [0.75, 0.75, 4]);
    put('brass', G.ringFlat, 0, BAL_Y + 1.7, LENS[1], [-0.6, 0, 0], [0.6, 0.6, 2]);
    box('bronze', 0, BAL_Y + 0.65, LENS[1] - 0.2, 0.16, 1.3, 0.16);
    put('bronze', G.mirFoot, 0, BAL_Y + 0.1, LENS[1] - 0.2, null, [0.6, 0.8, 0.6]);
    lamp(-9, BAL_Y, 53.4, { i: 1.1 });
    lamp(9, BAL_Y, 53.4, { i: 1.1 });
    // the Dame's dais and her mirror-throne
    put('wood', G.disc, FIG_B[0], 0.3, FIG_B[2], null, [2.4, 0.6, 2.4]);
    put('brass', G.ringFlat, FIG_B[0], 0.6, FIG_B[2], [Math.PI / 2, 0, 0], [2.4, 2.4, 1]);
    K.collider(FIG_B[0], 0.3, FIG_B[2], 4, 0.6, 4);
    box('brass', 0, 3.6, 83.4, 4.2, 6, 0.2);
    put('mirror', G.mirGlass, 0, 3.6, 83.2, [0, Math.PI, 0], [1.8, 2.8, 1]);
    // the validation lever (the one who turns the mirrors pulls it)
    levers.B = makeLever(LEVER_B[0], 0, LEVER_B[1], 0);
    for (let z = 60; z <= 80; z += 10) [-1, 1].forEach((s) => hang(s * 11, 6.4, z, { i: 1.3, d: 16 }));
    gates.B = { m: new THREE.Group(), k: 0, b: K.collider(0, 2.2, GATE_B, 4.4, 4.4, 0.5) };
    gates.A.m.children.forEach((ch) => gates.B.m.add(ch.clone()));
    gates.B.m.position.copy(P(0, 0, GATE_B));
    root.add(gates.B.m);

    // ===== the corridor B → C =====
    slab('mosaic', 0, 0, 88, 6, 8.4);
    [-1, 1].forEach((s) => {
      box('plaster', s * 3.2, 1.4, 88, 0.4, 2.8, 8.4);
      box('glass', s * 3.2, 4.4, 88, 0.05, 3.2, 8.4);
      wall(s * 3.3, 0, 88, 0.6, 6, 8.4);
      for (let z = 84.4; z <= 92; z += 2.4) box('brass', s * 3.15, 4.4, z, 0.12, 3.2, 0.12);
    });
    box('glass', 0, 6.9, 88, 6.2, 0.05, 8.4);
    hang(0, 5, 88, { i: 1.3 });

    // ===== C · la Coupole =====
    disc('mosaic', C.x, 0, C.z, C.r + 0.4);
    put('garnetWall', G.disc, C.x, 0.01, C.z - 2, null, [6.5, 0.02, 6.5]);
    put('brass', G.ringFlat, C.x, 0.03, C.z - 2, [Math.PI / 2, 0, 0], [6.5, 6.5, 1]);
    ring(C.x, C.z, C.r, Math.PI / 2 + 0.16, (5 * Math.PI) / 2 - 0.16, 9, { low: 'panel' });
    dome(C.x, 9, C.z, C.r, 20);
    [-1, 1].forEach((s) => box('stone', s * 2.55, 2.4, C.z - C.r, 0.9, 4.8, 1));
    box('stone', 0, 5.1, C.z - C.r, 6, 0.6, 1);
    // the throne on its dais, the board above
    put('wood', G.disc, FIG_C[0], 0.6, FIG_C[2], null, [3, 1.2, 3]);
    put('brass', G.ringFlat, FIG_C[0], 1.2, FIG_C[2], [Math.PI / 2, 0, 0], [3, 3, 1]);
    K.collider(FIG_C[0], 0.6, FIG_C[2], 5, 1.2, 5);
    stairs(0, FIG_C[2] - 3 - 4 * 0.72, 0, 1.2, 1, 2.4, 'wood');
    box('velvet', 0, 3.2, 116.3, 2.2, 4, 0.5);
    box('brass', 0, 5.35, 116.3, 2.6, 0.3, 0.6);
    put('gold', diamondGeo(0.4, 0.6, 0.1), 0, 5.9, 116.1);
    [-1, 1].forEach((s) => box('brass', s * 1.25, 2.6, 116.2, 0.3, 4, 0.7));
    {
      const c = document.createElement('canvas');
      c.width = 1300;
      c.height = 560;
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, (BOARD.w * 560) / 1300), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      m.material.color.setScalar(0.85);
      m.position.copy(P(0, BOARD.y, BOARD.z));
      m.rotation.y = Math.PI;
      root.add(m);
      box('brass', 0, BOARD.y, BOARD.z + 0.12, BOARD.w + 0.5, BOARD.h + 0.5, 0.15);
      board = { canvas: c, g: c.getContext('2d'), tex, m, key: '' };
      drawBoard([], 'gold', null, 7);
    }
    // the four slots, the balance between them, the two levers
    SLOTS.forEach((s) => {
      put('plaster', G.ped, s.x, 0.55, s.z, null, [1, 1.1, 1]);
      put('brass', G.ringFlat, s.x, 0.12, s.z, [Math.PI / 2, 0, 0], [0.56, 0.56, 3]);
      put('brass', G.pedTop, s.x, 1.17, s.z);
      K.collider(s.x, 0.62, s.z, 1.0, 1.24, 1.0);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.39), new THREE.MeshStandardMaterial({ map: T.plaque[s.i], roughness: 0.35, metalness: 0.6 }));
      pl.position.copy(P(s.x, 0.8, s.z - 0.52));
      pl.rotation.y = Math.PI;
      root.add(pl);
      const g = new THREE.Group();
      g.position.copy(P(s.x, 1.6, s.z));
      root.add(g);
      const round = new THREE.OctahedronGeometry(0.3, 1);
      const cols = GEMS.map((c) => {
        const m = new THREE.Mesh(round, gemMat(c.c, false));
        m.visible = false;
        g.add(m);
        return m;
      });
      const empty = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: '#8a7a6a', wireframe: true }));
      g.add(empty);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: '#ffd89a', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(1.2);
      g.add(halo);
      slotGems.push({ g, cols, empty, halo, c: -1, pulse: 0 });
    });
    put('brass', G.shaft, 0, 0.6, 104, null, [0.7, 1.2, 0.7]);
    put('amber', new THREE.OctahedronGeometry(0.4, 0).scale(1, 1.5, 1), 0, 1.75, 104);
    K.collider(0, 0.6, 104, 1, 1.2, 1);
    levers.dame = makeLever(LEVERS_C.dame[0], 0, LEVERS_C.dame[1], Math.PI);
    levers.valet = makeLever(LEVERS_C.valet[0], 0, LEVERS_C.valet[1], Math.PI);
    // the orrery under the dome: brass rings, crystal planets
    orrery = new THREE.Group();
    orrery.position.copy(P(C.x, 12.2, C.z));
    root.add(orrery);
    orrery.userData.rings = [3, 4.2, 5.4].map((r, i) => {
      const g = new THREE.Group();
      g.rotation.set(0.12 + i * 0.1, i, 0.08 - i * 0.06);
      orrery.add(g);
      const rm = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 96), M.brass);
      g.add(rm);
      const planet = new THREE.Mesh(new THREE.OctahedronGeometry(0.45 - i * 0.08, 1), gemMat(GEMS[i].c, false));
      planet.position.x = r;
      g.add(planet);
      return { g, sp: 0.12 - i * 0.03 };
    });
    const sun = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0).scale(1, 1.5, 1), M.gold);
    orrery.add(sun);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      if (Math.abs(Math.sin(a)) > 0.85 && Math.cos(a) < 0) continue;
      hang(C.x + Math.cos(a) * 10, 5.8, C.z + Math.sin(a) * 10, { i: 1.3 });
    }
    lamp(-5.6, 0, 96, { i: 1.2 });
    lamp(5.6, 0, 96, { i: 1.2 });

    // the figures (the level poses them)
    [['V', FIG_A], ['D', FIG_B], ['R', FIG_C]].forEach(([k, p]) => {
      const f = figure(k);
      f.g.position.copy(P(p[0], p[1], p[2]));
      f.g.rotation.y = Math.PI;
      root.add(f.g);
      f.st = { talk: 0, bow: 0, look: 0, want: 0, on: 1 };
      figs[k] = f;
      K.collider(p[0], p[1] + 1.8, p[2], 1.4, 3.6, 1.4);
    });
    flushBatches();
    // a pool of real lights for the nearest lamps
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffc47a', 0, 18, 2);
      l.userData = { at: -1, k: 0 };
      root.add(l);
      pool.push(l);
    }
    flashLight = new THREE.PointLight('#c8ccff', 0, 120, 1.4);
    root.add(flashLight);
    amb.motes = LvKit.motes({ n: 300, size: 1.4, colors: ['#ffe2a8', '#ffffff'], rise: [-0.1, 0.25], sway: 1.1, box: [44, 16], alpha: 0.4, seed: 23 });
  };
  function makeLever(x, y, z, ry) {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    g.rotation.y = ry;
    root.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), M.wood);
    base.position.y = 0.55;
    g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.7), M.brass);
    top.position.y = 1.12;
    g.add(top);
    const pv = new THREE.Group();
    pv.position.y = 1.15;
    g.add(pv);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8).translate(0, 0.45, 0), M.brass);
    pv.add(arm);
    const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), LvKit.glow('#ff6a7a', 1.4));
    knob.position.y = 0.92;
    pv.add(knob);
    K.collider(x, 0.6, z, 1, 1.2, 1);
    return { g, pv, knob, k: 0 };
  }
  const amb = { haze: new THREE.Color('#2a1e1c') };
  let flashLight = null;

  // ---------- procedural sound: wind over the clouds, distant thunder, a crystal hum ----------
  const AU = (() => {
    let ctx = null;
    let out = null;
    let WN = null;
    let BN = null;
    const N = {};
    const init = () => {
      if (ctx) return true;
      if (typeof Sound === 'undefined' || !Sound.ready) return false;
      const ok = Sound.score((c, master) => {
        ctx = c;
        out = c.createGain();
        out.gain.value = 0;
        out.connect(master);
        return true;
      });
      if (!ok) return false;
      const buf = (sec, fill) => {
        const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
        fill(b.getChannelData(0));
        return b;
      };
      WN = buf(3, (d) => {
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      });
      BN = buf(4, (d) => {
        let l = 0;
        for (let i = 0; i < d.length; i++) {
          l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          d[i] = l * 3.5;
        }
      });
      const src = (b) => {
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.loop = true;
        s.start(0, Math.random() * 2);
        return s;
      };
      N.windF = ctx.createBiquadFilter();
      N.windF.type = 'bandpass';
      N.windF.frequency.value = 340;
      N.windF.Q.value = 0.8;
      N.wind = ctx.createGain();
      N.wind.gain.value = 0.1;
      src(WN).connect(N.windF).connect(N.wind).connect(out);
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowpass';
      lo.frequency.value = 110;
      N.rum = ctx.createGain();
      N.rum.gain.value = 0.35;
      src(BN).connect(lo).connect(N.rum).connect(out);
      // the crystals sing softly (two detuned sines, a fifth apart)
      N.hum = ctx.createGain();
      N.hum.gain.value = 0.012;
      [523.25, 524.1, 784].forEach((f) => {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        o.connect(N.hum);
        o.start();
      });
      N.hum.connect(out);
      return true;
    };
    let on = false;
    return {
      set(v) {
        if (!init()) return;
        on = v;
        out.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.6);
      },
      tick(t) {
        if (!ctx) {
          if (root.visible) this.set(true);
          if (!ctx) return;
        }
        N.windF.frequency.setTargetAtTime(300 + Math.sin(t * 0.21) * 110 + Math.sin(t * 0.67) * 50, ctx.currentTime, 0.4);
        N.wind.gain.setTargetAtTime(0.08 + 0.04 * Math.sin(t * 0.33), ctx.currentTime, 0.5);
        N.hum.gain.setTargetAtTime(0.01 + 0.006 * Math.sin(t * 0.5), ctx.currentTime, 0.5);
      },
      thunder(dist = 150) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime + Math.min(2.2, dist / 340);
        const s = ctx.createBufferSource();
        s.buffer = BN;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(900, t0);
        f.frequency.exponentialRampToValueAtTime(120, t0 + 2.5);
        const g = ctx.createGain();
        const k = clamp(1.3 - dist / 400, 0.2, 1);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(k, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(k * 0.5, t0 + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random() * 0.5);
        s.stop(t0 + 3.4);
      },
      // a crystal note (the gems, the mirrors, the board)
      ping(m = 76, v = 0.05) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime;
        [1, 2.01, 3.02].forEach((h, i) => {
          const o = ctx.createOscillator();
          o.frequency.value = 440 * Math.pow(2, (m - 69) / 12) * h;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(v / (i + 1), t0 + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6 / (i + 1));
          o.connect(g).connect(out);
          o.start(t0);
          o.stop(t0 + 1.7);
        });
      },
    };
  })();

  // ---------- per-frame (the levels write ST, the world follows it) ----------
  const ST = {
    gateA: 0,
    gateB: 0,
    // room A: per pedestal { c: colour, k: cut } or null; view 'col' | 'cut'
    gems: null,
    gemView: 'col',
    take: -1, // the pedestal whose gem flies to the Valet
    // room B
    mir: [], // [{ c, r, a: 0 '/' | 1 '\\', low, n }]
    cry: [], // [{ slot: [c, r], target }]
    beamOn: false,
    beamPath: null, // [[x, z], ...] in room coordinates
    beamEnd: -1, // which crystal the beam lights
    showTarget: false,
    src: [-12, 62],
    // room C
    slots: [-1, -1, -1, -1],
    lever: { B: 0, dame: 0, valet: 0 },
    card: null, // [x, y, z] when the reward card shows
  };
  let lightT = 0;
  let snapNext = false;
  const tmpQ = V3();
  const update = (dt, t, me) => {
    if (!built) return;
    const dd = snapNext ? 30 : dt;
    snapNext = false;
    SH.time.value = t;
    SH.cam.value.copy(R.camera.position);
    SKY.dome.position.copy(R.camera.position);
    SKY.sea.position.set(R.camera.position.x, O.y - 32, R.camera.position.z);
    flashV = Math.max(0, flashV - dt * 3.2);
    SH.flash.value = flashV;
    SH.fp.value.z = Math.max(0, SH.fp.value.z - dt * 2.2);
    flashLight.position.copy(R.camera.position).add(V3(30, 60, 20));
    flashLight.intensity = flashV * 2;
    tickBolts(dt);
    tickStorm(dt, me);
    AU.tick(t);
    LvKit.tick(t);
    tickBig(dt);
    if (screen) screen.update(dt, t);
    // the figures: idle, talking, bowing; they look at whoever is nearest
    Object.values(figs).forEach((f) => {
      const s = f.st;
      s.talkK = damp(s.talkK || 0, s.talk > 0 ? 1 : 0, 6, dt);
      s.talk = Math.max(0, s.talk - dt);
      s.bowK = damp(s.bowK != null ? s.bowK : s.bow, s.bow, 2.2, dd);
      f.g.visible = !!s.on;
      if (!s.on) return;
      tmpQ.copy(R.camera.position).sub(f.g.position);
      const yaw = Math.atan2(tmpQ.x, tmpQ.z) - f.g.rotation.y;
      const ly = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      s.lookK = damp(s.lookK || 0, ly, 2, dt);
      f.pose({ t, talk: s.talkK, bow: s.bowK, look: s.lookK });
    });
    // gates
    [
      ['A', ST.gateA],
      ['B', ST.gateB],
    ].forEach(([k, open]) => {
      const g = gates[k];
      g.k = damp(g.k, open, 1.6, dd);
      g.m.position.y = O.y + g.k * 4.6;
      g.b.on = !open;
    });
    // room A: the gems, as each screen sees them
    gems.forEach((gm, i) => {
      const s = ST.gems && ST.gems[i];
      gm.cols.forEach((m, c) => (m.visible = !!s && ST.gemView === 'col' && s.c === c));
      gm.cuts.forEach((m, k) => (m.visible = !!s && ST.gemView === 'cut' && s.k === k));
      gm.halo.visible = !!s;
      gm.fly = damp(gm.fly, ST.take === i ? 1 : 0, ST.take === i ? 2.4 : 30, dd);
      const p = P(PEDS[i].x, 1.72, PEDS[i].z);
      const fp = P(FIG_A[0] - 0.65, FIG_A[1] + 2.9, FIG_A[2] - 0.5);
      gm.g.position.copy(p).lerp(fp, gm.fly);
      gm.g.position.y += Math.sin(t * 1.7 + i) * 0.06 + Math.sin(gm.fly * Math.PI) * 1.5;
      gm.g.rotation.y = t * 0.7 + i;
      gm.halo.material.opacity = 0.14 + 0.06 * Math.sin(t * 2.3 + i * 1.7);
    });
    // room B: mirrors, crystals, the beam
    mirrors.forEach((m, i) => {
      const s = ST.mir[i];
      m.g.visible = !!s;
      m.b.on = !!s && !s.low && root.visible;
      if (!s) return;
      const cx = O.x + cellX(s.c);
      const cz = O.z + cellZ(s.r);
      m.b.min[0] = cx - 0.45;
      m.b.max[0] = cx + 0.45;
      m.b.min[1] = O.y;
      m.b.max[1] = O.y + 2.4;
      m.b.min[2] = cz - 0.45;
      m.b.max[2] = cz + 0.45;
      if (m.n !== s.n) {
        m.n = s.n;
        m.plaque.material.map = T.plaque[s.n];
        m.plaque.material.needsUpdate = true;
      }
      m.g.position.copy(P(cellX(s.c), 0, cellZ(s.r)));
      const ta = s.a === 0 ? -Math.PI / 4 : Math.PI / 4;
      m.a = damp(m.a, ta, 9, dd);
      m.piv.rotation.y = m.a;
      m.low = damp(m.low, s.low ? 1 : 0, 6, dd);
      m.piv.position.y = -m.low * 2.45;
    });
    crystals.forEach((cr, i) => {
      const s = ST.cry[i];
      cr.g.visible = !!s;
      if (!s) return;
      cr.g.position.copy(P(slotX(s.slot), 0, slotZ(s.slot)));
      const lit = ST.beamOn && ST.beamEnd === i;
      cr.hit = damp(cr.hit, lit ? 1 : 0, 6, dt);
      const tgt = ST.showTarget && s.target;
      cr.on = damp(cr.on, tgt ? 1 : 0, 4, dt);
      cr.halo.material.opacity = cr.on * (0.45 + 0.15 * Math.sin(t * 3)) + cr.hit * 0.6;
      cr.halo.material.color.set(tgt ? '#ffcf5a' : '#ffffff');
      cr.c.rotation.y = t * 0.6 + i;
      cr.c.material = tgt ? M.gold : M.crystal;
    });
    beam.src.position.copy(P(ST.src[0], 0, ST.src[1]));
    beam.lens.material.color.set('#ffe2a0').multiplyScalar(2 + Math.sin(t * 4) * 0.4);
    const path = ST.beamOn ? ST.beamPath : null;
    beam.segs.forEach((sg, i) => {
      const a = path && path[i];
      const b = path && path[i + 1];
      sg.c.visible = sg.h.visible = !!(a && b);
      if (!a || !b) return;
      const mx = (a[0] + b[0]) / 2;
      const mz = (a[1] + b[1]) / 2;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.05;
      const along = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
      sg.c.position.copy(P(mx, 1.55, mz));
      sg.h.position.copy(sg.c.position);
      const w = 0.11 + Math.sin(t * 9 + i) * 0.01;
      sg.c.scale.set(along ? len : w, w, along ? w : len);
      sg.h.scale.set(along ? len : 0.5, 0.5, along ? 0.5 : len);
    });
    beam.mats.glow.opacity = 0.18 + Math.sin(t * 5) * 0.04;
    // room C: the slots, the orrery
    slotGems.forEach((sg, i) => {
      const c = ST.slots[i];
      sg.cols.forEach((m, k) => (m.visible = c === k));
      sg.empty.visible = c < 0;
      sg.g.rotation.y = t * 0.8 + i;
      sg.g.position.y = O.y + 1.6 + Math.sin(t * 1.6 + i) * 0.05;
      sg.pulse = Math.max(0, sg.pulse - dt * 2);
      sg.halo.material.opacity = 0.25 + sg.pulse * 0.7;
      sg.halo.scale.setScalar(1.2 + sg.pulse * 0.8);
    });
    if (orrery) {
      orrery.rotation.y = t * 0.05;
      orrery.userData.rings.forEach((r) => (r.g.rotation.z += r.sp * dt));
    }
    Object.entries(levers).forEach(([k, lv]) => {
      lv.k = damp(lv.k, ST.lever[k] || 0, 12, dd);
      lv.pv.rotation.x = -0.6 + lv.k * 1.2;
    });
    if (card) card.visible = !!ST.card;
    if (card && card.visible) {
      card.position.copy(P(ST.card[0], ST.card[1] + Math.sin(t * 1.5) * 0.12, ST.card[2]));
      card.rotation.y = t * 0.8;
    }
    // the real lights follow the nearest lamps (4 at most, faded in and out)
    lightT -= dt;
    if (lightT <= 0) {
      lightT = 0.3;
      const c = R.camera.position;
      const want = LIGHTS.map((L, i) => [L.p.distanceToSquared(c), i])
        .sort((a, b) => a[0] - b[0])
        .slice(0, pool.length)
        .map((x) => x[1]);
      pool.forEach((l) => (l.userData.want = want.includes(l.userData.at) ? l.userData.at : -1));
      want.forEach((i) => {
        if (pool.some((l) => l.userData.at === i)) return;
        const free = pool.find((l) => l.userData.want === -1 && !want.includes(l.userData.at));
        if (free) free.userData.want = i;
      });
    }
    pool.forEach((l) => {
      const u = l.userData;
      if (u.want !== u.at) {
        u.k = Math.max(0, u.k - dt * 4);
        if (u.k === 0) {
          u.at = u.want;
          if (u.at >= 0) {
            const L = LIGHTS[u.at];
            l.position.copy(L.p);
            l.color.copy(L.c);
            l.distance = L.d;
          }
        }
      } else if (u.at >= 0) u.k = Math.min(1, u.k + dt * 3);
      const L = LIGHTS[u.at];
      l.intensity = L ? L.i * u.k * (0.95 + Math.sin(t * 3 + u.at) * 0.05) : 0;
    });
  };

  // ---------- the grid of room B (pure helpers, the level traces the beam) ----------
  // an edge slot is a cell index outside the grid: c = -1 / COLS (west / east), r = -1 / ROWS
  const slotX = (s) => (s[0] < 0 ? -12 : s[0] >= COLS ? 12 : cellX(s[0]));
  const slotZ = (s) => (s[1] < 0 ? 58.2 : s[1] >= ROWS ? 77.8 : cellZ(s[1]));
  const EDGES = [];
  for (let r = 0; r < ROWS; r++) EDGES.push([-1, r], [COLS, r]);
  for (let c = 0; c < COLS; c++) EDGES.push([c, -1], [c, ROWS]);
  /** Traces the beam from the west edge at row r0 through mirrors [{c, r, a, low}]: returns
   *  { path: [[x, z]...] (room coordinates), exit: [c, r], hits: mirror indices }. */
  const trace = (r0, mir) => {
    let c = -1;
    let r = r0;
    let dc = 1;
    let dr = 0;
    const path = [[slotX([-1, r0]) + 0.8, cellZ(r0)]];
    const hits = [];
    for (let k = 0; k < 40; k++) {
      c += dc;
      r += dr;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) {
        path.push([slotX([c, r]), slotZ([c, r])]);
        return { path, exit: [c, r], hits };
      }
      const mi = mir.findIndex((m) => m.c === c && m.r === r && !m.low);
      if (mi >= 0) {
        const m = mir[mi];
        hits.push(mi);
        path.push([cellX(c), cellZ(r)]);
        if (m.a === 0) [dc, dr] = [dr, dc];
        else [dc, dr] = [-dr, -dc];
      }
    }
    return { path, exit: null, hits };
  };

  // ---------- a big word in the middle of the screen (instant, not queued like the lines) ----------
  const BIG = { el: null, t: 0 };
  const big = (text, hold = 1.4, color = '#ffd27a') => {
    if (!BIG.el) {
      const css = document.createElement('style');
      css.textContent = `#dcourBig{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.92);z-index:6;pointer-events:none;opacity:0;font:italic 600 44px/1.1 Georgia,serif;color:#fff;text-shadow:0 0 18px var(--c),0 2px 6px #000;transition:opacity .2s,transform .2s;white-space:nowrap}
        #dcourBig.on{opacity:1;transform:translate(-50%,-50%) scale(1)}`;
      document.head.appendChild(css);
      BIG.el = document.createElement('div');
      BIG.el.id = 'dcourBig';
      document.body.appendChild(BIG.el);
    }
    Icons.set(BIG.el, Story.fmt(text));
    BIG.el.style.setProperty('--c', color);
    BIG.el.classList.add('on');
    BIG.t = hold;
  };
  const tickBig = (dt) => {
    if (BIG.t <= 0) return;
    BIG.t -= dt;
    if (BIG.t <= 0 && BIG.el) BIG.el.classList.remove('on');
  };

  // ---------- queries ----------
  const at = (zone, q) => {
    switch (zone) {
      case 'QUAY':
        return q.z < 18 && q.y > -1;
      case 'A':
        return Math.hypot(q.x - A.x, q.z - A.z) < A.r && q.y > -1 && q.y < 6;
      case 'CORR_AB':
        return q.z > 42 && q.z < 52 && Math.abs(q.x) < 3.2;
      case 'B':
        return q.z > B.z0 && q.z < B.z1 && Math.abs(q.x) < B.w && q.y > -1;
      case 'BAL':
        return q.z > BAL_Z[0] - 0.2 && q.z < BAL_Z[1] + 0.4 && q.y > BAL_Y - 0.6 && Math.abs(q.x) < 13;
      case 'FLOOR_B':
        return q.z > 57.8 && q.z < B.z1 && Math.abs(q.x) < 12.8 && q.y < 1.2 && q.y > -1;
      case 'CORR_BC':
        return q.z > 84 && q.z < 92 && Math.abs(q.x) < 3.2;
      case 'C':
        return Math.hypot(q.x - C.x, q.z - C.z) < C.r && q.y > -1;
      default:
        return false;
    }
  };
  const SPAWN = {
    V: [[-1.6, 0, 1], [1.6, 0, 1]],
    A: [[-1.5, 0, 20.5], [1.5, 0, 20.5]],
    D: [[-1.2, 0, 48], [1.2, 0, 48]],
    K: [[1.2, 0, 90], [-1.2, 0, 90]],
  };
  const spawn = (key2, who) => {
    const s = SPAWN[key2] || SPAWN.V;
    const p = s[who === 'dame' ? 0 : 1];
    return P(p[0], p[1], p[2]);
  };
  // which figure stands, which bows, which gates are open, for the level being played
  const setup = (lv) => {
    ST.gateA = lv === 'V' ? 0 : 1;
    ST.gateB = lv === 'K' ? 1 : 0;
    figs.V.st.bow = lv === 'V' ? 0 : 1;
    figs.D.st.bow = lv === 'K' ? 1 : 0;
    figs.R.st.bow = 0;
    // only the figures that can be seen from the level's rooms are drawn
    figs.V.st.on = lv !== 'K' ? 1 : 0;
    figs.D.st.on = lv !== 'V' ? 1 : 0;
    figs.R.st.on = lv === 'K' ? 1 : 0;
    ST.gems = null;
    ST.take = -1;
    ST.mir = [];
    ST.cry = [];
    ST.beamOn = false;
    ST.slots = [-1, -1, -1, -1];
    ST.card = null;
    // the reward card of this figure
    const tid = { V: 'dV', D: 'dD', K: 'dK' }[lv];
    if (!card || card.userData.tid !== tid) {
      if (card) root.remove(card);
      card = LvKit.trialCard(tid, true);
      card.userData.tid = tid;
      root.add(card);
    }
    const pos = { V: [0, 4.1, 17.4, Math.PI], D: [0, 3.2, 52.6, 0], K: [0, 4.1, 92.6, 0] }[lv];
    screen.mesh.position.copy(P(pos[0], pos[1], pos[2]));
    screen.mesh.rotation.y = pos[3];
    snapNext = true;
  };

  return {
    O,
    P,
    rel,
    A,
    PEDS,
    FIG_A,
    GATE_A,
    B,
    CELL,
    COLS,
    ROWS,
    cellX,
    cellZ,
    slotX,
    slotZ,
    EDGES,
    trace,
    BAL_Y,
    BAL_Z,
    LEVER_B,
    LENS,
    LENS_EYE,
    LENS_AT,
    FIG_B,
    C,
    SLOTS,
    LEVERS_C,
    FIG_C,
    GEMS,
    CUTS,
    ROMAN,
    ST,
    AU,
    amb,
    figs,
    figure,
    diamondGeo,
    build,
    setup,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
      mirrors.forEach((m) => (m.b.on = false));
      BIG.t = 0;
      if (BIG.el) BIG.el.classList.remove('on');
      wx.visible = false;
      AU.set(false);
      flashV = 0;
    },
    update,
    snap() {
      snapNext = true;
    },
    bolt,
    flash,
    big,
    at,
    spawn,
    board(hist, mine, reveal, tries) {
      if (!board) return;
      const key = JSON.stringify([hist, mine, reveal, tries]);
      if (key === board.key) return;
      board.key = key;
      drawBoard(hist, mine, reveal, tries);
    },
    pulseSlot(i) {
      if (slotGems[i]) slotGems[i].pulse = 1;
    },
    talk(k, sec = 1.6) {
      if (figs[k]) figs[k].st.talk = Math.max(figs[k].st.talk, sec);
    },
    get screen() {
      return screen;
    },
    get card() {
      return card;
    },
    get root() {
      return root;
    },
    get mats() {
      return M;
    },
    get lights() {
      return pool;
    },
  };
})();
