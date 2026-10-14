// ♥ 7 · Le Jardin: a giant overgrown glasshouse. One of you carries the watering can, the other a
// little sun on a chain: a plant only grows where water and light meet. Vines become bridges,
// flowers springboards, lily pads stepping stones, a sunflower turns to follow the light. Then the
// four seasons, and the Thorn Queen strangling the glass dome: grow three heart-roses at her roots.
const H6 = (() => {
  const O = V3(-2100, 0, 8400);
  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);

  // the garden runs along +z; each zone has its own group so only the near ones are drawn
  const ZONES = {
    A: [-8, 84],
    B: [66, 148],
    S: [130, 184],
    U: [172, 244],
    N: [210, 292],
    W: [266, 348],
    Q: [326, 398],
  };
  const zg = {};
  const KZ = {};
  Object.keys(ZONES).forEach((k) => {
    zg[k] = new THREE.Group();
    root.add(zg[k]);
    KZ[k] = LvKit.builder(O, zg[k]);
  });
  const P = KZ.A.P;
  const rel = KZ.A.rel;
  const glow = LvKit.glow;

  // ---------- layout (relative to O) ----------
  const C = V3(0, 0, 366); // the Thorn Queen's dome
  const DOME_R = 23;
  const ROSE_R = 10;
  const SUN = { pivot: [6, 104], arm: 7, top: 6 };
  const LILY = [
    [-1, 44.6],
    [1.5, 50.4],
    [-0.5, 56.2],
  ];
  const ICE = [
    [-4, 292],
    [-2, 296],
    [-4, 300],
    [3, 310],
    [5, 314],
    [3, 318],
  ];
  const CAPS = [
    [4.4, 1.0, 264.3],
    [1.8, 2.0, 264.5],
    [-0.8, 3.0, 264.5],
    [-3.4, 4.0, 264.6],
  ];
  // autumn: 7 rows x 10 columns of 3 m cells, 'o' = a hole hidden under the leaves (row 0 = entrance)
  const HOLES = [
    'o##o#o#o#o',
    'oo#oo#o#o#',
    'o###o#oo#o',
    'ooo###o##o',
    '#o#oo#o#oo',
    '#o##o#oo#o',
    '##o#o##o#o',
  ];
  const HZ0 = 242;
  const RINGS = {
    sun: { pos: [-4, 10.5, 104], land: [-4, 6, 114.5], stage: 4 },
    w1: { pos: [7, 8.5, 296.5], land: [7, 0, 304.6], stage: 8 },
    w2: { pos: [-7, 8.5, 314.5], land: [-7, 0, 322.6], stage: 8 },
  };
  const BEAN_STEM = [0, 194];

  // [id, kind, req, stage, x, y, z, seconds of growth]
  const BUD_DEFS = [
    ['vine', 'vine', 'both', 1, 0, 0, 14.2, 3.0],
    ['lily1', 'lily', 'both', 2, LILY[0][0], -0.35, LILY[0][1], 2.2],
    ['lily2', 'lily', 'both', 2, LILY[1][0], -0.35, LILY[1][1], 2.2],
    ['lily3', 'lily', 'both', 2, LILY[2][0], -0.35, LILY[2][1], 2.2],
    ['bloom', 'flower', 'both', 3, -4, 0, 70, 3.0],
    ['sun', 'sunflower', 'both', 4, 6, 6, 94.9, 3.2],
    ['dand', 'dandelion', 'both', 5, -6, 0, 148.5, 3.0],
    ['bean1', 'bean', 'both', 6, 1.8, 0, 191.2, 3.4],
    ['bean2', 'bean', 'both', 6, 0.8, 4.5, 199.8, 3.4],
    ['mush', 'mushroom', 'both', 7, 0, 0, 264.6, 3.4],
    ...ICE.map(([x, z], i) => ['ice' + i, 'ice', 'water', 8, x, -0.2, z, 1.0]),
    ['wice', 'icebox', 'light', 8, 0, 0, 328.6, 3.0],
    ['wrose', 'rose', 'both', 8, 0, 0, 328.6, 4.0],
    ['r1', 'rose', 'both', 9, 0, 0, C.z - ROSE_R, 5.0],
    ['r2', 'rose', 'both', 9, Math.sin((Math.PI * 2) / 3) * ROSE_R, 0, C.z + ROSE_R / 2, 5.0],
    ['r3', 'rose', 'both', 9, -Math.sin((Math.PI * 2) / 3) * ROSE_R, 0, C.z + ROSE_R / 2, 5.0],
  ];
  const zoneOfZ = (z) => (z < 74 ? 'A' : z < 136 ? 'B' : z < 178 ? 'S' : z < 238 ? 'U' : z < 282 ? 'N' : z < 338 ? 'W' : 'Q');

  let built = false;
  const buds = {};
  const doors = {};
  const movers = [];
  const seeds = [];
  const holeCells = [];
  const fx = [];
  const butterflies = [];
  const tools = {};
  let sunflower = null;
  let screen = null;
  let boss = null;
  let card = null;
  let bigRose = null;
  let bloomField = null;
  let bloomHeart = null;
  let iceWall = null;
  let spot = null;
  let lampLight = null;
  const tmp = V3();
  const tmp2 = V3();
  const UP = V3(0, 1, 0);

  // ---------- textures (all drawn at 1080 px or more) ----------
  const T = {};
  const heartPath = (g, cx, cy, k) => {
    g.beginPath();
    for (let i = 0; i <= 80; i++) {
      const [x, y] = Heart.curve((i / 80) * Math.PI * 2);
      const px = cx + x * k;
      const py = cy - (y - 2.5) * k;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
  };
  const makeTextures = () => {
    // glass panes in a painted iron frame
    T.glass = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(200,236,226,0.10)';
      g.fillRect(0, 0, w, h);
      const sh = g.createLinearGradient(0, 0, w, h);
      sh.addColorStop(0.0, 'rgba(255,255,255,0)');
      sh.addColorStop(0.42, 'rgba(255,255,255,0)');
      sh.addColorStop(0.47, 'rgba(255,255,255,0.10)');
      sh.addColorStop(0.52, 'rgba(255,255,255,0)');
      g.fillStyle = sh;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(38,66,52,1)';
      g.lineWidth = 7;
      g.strokeRect(3.5, 3.5, w - 7, h - 7);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w / 2, 0);
      g.lineTo(w / 2, h);
      g.moveTo(0, h / 3);
      g.lineTo(w, h / 3);
      g.moveTo(0, (2 * h) / 3);
      g.lineTo(w, (2 * h) / 3);
      g.stroke();
      // a little arched fanlight in each pane
      g.lineWidth = 2;
      g.beginPath();
      g.arc(w / 4, h / 3, w / 4 - 6, Math.PI, 0);
      g.arc((3 * w) / 4, h / 3, w / 4 - 6, Math.PI, 0);
      g.stroke();
    });
    T.leaf = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const leaf = (cx, cy, l, wd, a, col) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(a);
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(wd, -l * 0.3, wd * 0.8, -l * 0.8, 0, -l);
        g.bezierCurveTo(-wd * 0.8, -l * 0.8, -wd, -l * 0.3, 0, 0);
        const gr = g.createLinearGradient(0, 0, 0, -l);
        gr.addColorStop(0, col[0]);
        gr.addColorStop(1, col[1]);
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = 'rgba(20,40,16,0.6)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -l * 0.95);
        g.stroke();
        for (let k = 1; k < 6; k++) {
          const y = (-l * k) / 6.5;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(wd * 0.55, y - l * 0.08);
          g.moveTo(0, y);
          g.lineTo(-wd * 0.55, y - l * 0.08);
          g.stroke();
        }
        g.restore();
      };
      // a fern frond: many leaflets along a curved rachis
      for (let i = 0; i < 9; i++) {
        const y = 240 - i * 24;
        const s = 1 - i / 11;
        leaf(128, y, 70 * s, 16 * s, -1.25 + i * 0.03, ['#2f6a2a', '#7fbf4a']);
        leaf(128, y, 70 * s, 16 * s, 1.25 - i * 0.03, ['#2f6a2a', '#7fbf4a']);
      }
      leaf(128, 40, 40, 12, 0, ['#3d7a30', '#8fcf58']);
      g.strokeStyle = '#2c4a1e';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(128, 256);
      g.lineTo(128, 20);
      g.stroke();
    });
    T.bigLeaf = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      // a heart-shaped leaf (the beanstalk's), with veins
      g.save();
      heartPath(g, w / 2, h / 2 + 6, 7.2);
      const gr = g.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h / 2, w * 0.55);
      gr.addColorStop(0, '#4f8a30');
      gr.addColorStop(1, '#1d4a1e');
      g.fillStyle = gr;
      g.fill();
      g.clip();
      g.strokeStyle = 'rgba(190,225,150,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w / 2, h * 0.88);
      g.lineTo(w / 2, h * 0.2);
      g.stroke();
      for (let k = 0; k < 6; k++) {
        const y = h * (0.78 - k * 0.1);
        g.beginPath();
        g.moveTo(w / 2, y);
        g.quadraticCurveTo(w / 2 + 40, y - 18, w / 2 + 90, y - 50);
        g.moveTo(w / 2, y);
        g.quadraticCurveTo(w / 2 - 40, y - 18, w / 2 - 90, y - 50);
        g.stroke();
      }
      g.restore();
    });
    T.pad = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.save();
      g.beginPath();
      g.moveTo(w / 2, h / 2);
      g.arc(w / 2, h / 2, w / 2 - 4, -Math.PI / 2 + 0.22, (3 * Math.PI) / 2 - 0.22);
      g.closePath();
      const gr = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#5f9a3e');
      gr.addColorStop(0.8, '#2f6a32');
      gr.addColorStop(1, '#244f28');
      g.fillStyle = gr;
      g.fill();
      g.clip();
      g.strokeStyle = 'rgba(190,230,150,0.35)';
      g.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI / 2 + 0.3 + (i / 17) * (Math.PI * 2 - 0.6);
        g.beginPath();
        g.moveTo(w / 2, h / 2);
        g.lineTo(w / 2 + Math.cos(a) * w * 0.48, h / 2 + Math.sin(a) * h * 0.48);
        g.stroke();
      }
      g.restore();
    });
    T.petal = LvKit.tex(128, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.beginPath();
      g.moveTo(w / 2, h);
      g.bezierCurveTo(w * 1.05, h * 0.65, w * 0.95, h * 0.08, w / 2, 4);
      g.bezierCurveTo(w * 0.05, h * 0.08, -w * 0.05, h * 0.65, w / 2, h);
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.5, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0.95)');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      g.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(w / 2, h - 6);
        g.quadraticCurveTo(w / 2 + i * 12, h * 0.5, w / 2 + i * 18, h * 0.12);
        g.stroke();
      }
    });
    T.seeds = LvKit.tex(256, 256, (g, w, h) => {
      g.fillStyle = '#3a220e';
      g.fillRect(0, 0, w, h);
      // golden-angle seed spiral
      for (let i = 0; i < 900; i++) {
        const r = Math.sqrt(i) * 4.1;
        const a = i * 2.39996;
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r;
        g.fillStyle = i % 3 ? '#6b3e14' : '#8a5a1c';
        g.beginPath();
        g.arc(x, y, 1.9, 0, Math.PI * 2);
        g.fill();
      }
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,190,90,0.25)');
      gr.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    T.soft = LvKit.tex(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    T.drop = LvKit.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.beginPath();
      g.moveTo(w / 2, 4);
      g.quadraticCurveTo(w * 0.85, h * 0.55, w / 2, h - 6);
      g.quadraticCurveTo(w * 0.15, h * 0.55, w / 2, 4);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.fill();
    });
    T.petalFall = LvKit.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * 0.42, h * 0.26, 0.6, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.fill();
    });
    T.maple = LvKit.tex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.translate(w / 2, h / 2);
      g.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 22 : 58;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fillStyle = '#fff';
      g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0);
    });
    // leaf litter: the same on every cell of the autumn floor, holes included
    T.litter = LvKit.tex(256, 256, (g, w, h) => {
      g.fillStyle = '#4a2a16';
      g.fillRect(0, 0, w, h);
      const cols = ['#8a3a1a', '#a85a22', '#c27a2a', '#6a2a14', '#b8862e'];
      for (let i = 0; i < 420; i++) {
        g.save();
        g.translate(Math.random() * w, Math.random() * h);
        g.rotate(Math.random() * 6.28);
        g.fillStyle = cols[i % cols.length];
        g.globalAlpha = 0.75 + Math.random() * 0.25;
        g.beginPath();
        const r = 5 + Math.random() * 7;
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          const rr = k % 2 ? r * 0.45 : r;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.fill();
        g.restore();
      }
    });
    T.flake = LvKit.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 3;
      g.translate(w / 2, h / 2);
      for (let i = 0; i < 6; i++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, 26);
        g.moveTo(0, 14);
        g.lineTo(7, 20);
        g.moveTo(0, 14);
        g.lineTo(-7, 20);
        g.stroke();
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    });
    T.wing = LvKit.tex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.beginPath();
      g.moveTo(4, h / 2);
      g.bezierCurveTo(30, -10, 128, 0, 120, 50);
      g.bezierCurveTo(118, 70, 70, 62, 4, h / 2);
      g.moveTo(4, h / 2);
      g.bezierCurveTo(40, 120, 100, 126, 96, 92);
      g.bezierCurveTo(92, 72, 50, 70, 4, h / 2);
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#d9d9d9');
      g.fillStyle = gr;
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.arc(92, 34, 9, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.lineWidth = 3;
      g.stroke();
    });
    T.beam = LvKit.tex(64, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.7)');
      gr.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const sx = g.createLinearGradient(0, 0, w, 0);
      sx.addColorStop(0, 'rgba(0,0,0,0.9)');
      sx.addColorStop(0.5, 'rgba(0,0,0,0)');
      sx.addColorStop(1, 'rgba(0,0,0,0.9)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = sx;
      g.fillRect(0, 0, w, h);
    });
    T.mosaic = LvKit.tex(512, 512, (g, w, h) => {
      // a heart of green and gold tesserae, set into the floor
      g.clearRect(0, 0, w, h);
      g.save();
      heartPath(g, w / 2, h / 2 + 10, 13);
      g.clip();
      for (let y = 0; y < h; y += 12)
        for (let x = 0; x < w; x += 12) {
          const v = Math.random();
          g.fillStyle = v < 0.5 ? '#1f4a24' : v < 0.85 ? '#2e5a2a' : '#8a6a2a';
          g.fillRect(x + 1, y + 1, 10, 10);
        }
      g.restore();
      g.lineWidth = 8;
      g.strokeStyle = '#8a6a2a';
      heartPath(g, w / 2, h / 2 + 10, 13);
      g.stroke();
    });
    T.thorn = LvKit.tex(128, 128, (g, w, h) => {
      g.fillStyle = '#2a1c14';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        g.strokeStyle = `rgba(${60 + Math.random() * 40},${40 + Math.random() * 30},20,0.8)`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const y = Math.random() * h;
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2);
        g.stroke();
      }
    });
  };

  // ---------- materials ----------
  const M = {};
  const makeMats = () => {
    M.tiles = Tex.mat('brick', { color: '#4a2e26', scale: 1.4, rough: 0.85, bump: 0.6 });
    M.path = Tex.mat('cobble', { color: '#706960', scale: 1.5, rough: 0.85, bump: 0.6 });
    M.soil = Tex.mat('sand', { color: '#4e3828', scale: 2, rough: 1, bump: 0.9 });
    M.grass = Tex.mat('grass', { color: '#2c4422', scale: 2.4, rough: 0.95, bump: 0.6 });
    M.stone = Tex.mat('stone', { color: '#a19a8c', scale: 2, rough: 0.8, bump: 0.7 });
    M.rock = Tex.mat('rock', { color: '#4a4844', scale: 4, rough: 0.9, bump: 1.2 });
    M.bark = Tex.mat('wood', { color: '#5a3f2c', scale: 0.8, rough: 0.85, bump: 0.8 });
    M.dry = Tex.mat('sand', { color: '#4a3a28', scale: 2.2, rough: 0.95, bump: 0.8 });
    M.snow = Tex.mat('sand', { color: '#4e5862', scale: 3, rough: 0.9, bump: 0.4 });
    M.leafFloor = Tex.mat('sand', { color: '#4a2a14', scale: 2, rough: 0.95, bump: 0.7 });
    M.iron = new THREE.MeshStandardMaterial({ color: '#2f4a3c', roughness: 0.45, metalness: 0.2 });
    M.brass = new THREE.MeshStandardMaterial({
      color: '#c19a52',
      roughness: 0.35,
      metalness: 0.2,
      emissive: '#3a2810',
    });
    M.copper = new THREE.MeshStandardMaterial({
      color: '#4d8a78',
      roughness: 0.45,
      metalness: 0.15,
      emissive: '#0c2018',
    });
    M.glass = new THREE.MeshStandardMaterial({
      map: T.glass,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      roughness: 0.15,
      metalness: 0,
    });
    M.water = new THREE.MeshStandardMaterial({
      color: '#071c24',
      roughness: 0.1,
      metalness: 0,
      emissive: '#020a0e',
    });
    M.chasm = new THREE.MeshStandardMaterial({ color: '#14201a', roughness: 1, side: THREE.DoubleSide });
    M.foliage = new THREE.MeshStandardMaterial({
      map: T.leaf,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.8,
      color: '#a6c090',
      emissive: '#0a1608',
    });
    M.heartLeaf = new THREE.MeshStandardMaterial({
      map: T.bigLeaf,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.8,
      color: '#8a9a7a',
      // the underside of a leaf is never black
      emissive: '#0c1c0a',
    });
    M.padMat = new THREE.MeshStandardMaterial({ map: T.pad, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 });
    M.stem = new THREE.MeshStandardMaterial({ color: '#1f4a1a', roughness: 0.7, emissive: '#061206' });
    M.vine = new THREE.MeshStandardMaterial({ color: '#2c3e18', roughness: 0.8, emissive: '#060c04' });
    M.thorn = new THREE.MeshStandardMaterial({ map: T.thorn, color: '#7a5a48', roughness: 0.8 });
    M.thornTip = new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.6 });
    M.ice = new THREE.MeshStandardMaterial({
      color: '#6a9ab4',
      roughness: 0.18,
      transparent: true,
      opacity: 0.78,
      emissive: '#0f2a3a',
    });
    M.litter = new THREE.MeshStandardMaterial({ map: T.litter, roughness: 0.95, color: '#a89888' });
    M.mosaic = new THREE.MeshStandardMaterial({ map: T.mosaic, roughness: 0.75, alphaTest: 0.5 });
  };
  const petalMat = (col, em = '#000000') =>
    new THREE.MeshStandardMaterial({
      map: T.petal,
      color: col,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.6,
      emissive: em,
    });

  // ---------- small helpers ----------
  const uvScale = (geo, sx, sy) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
    return geo;
  };
  const sprite = (tex, color, size, opacity = 1, add = true) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      }),
    );
    s.scale.setScalar(size);
    return s;
  };
  const rng = (seed) => {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };
  const instanced = (z, geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = V3();
    list.forEach(([x, y, zz, sc, ry, rx = 0, rz = 0, sy = 1], i) => {
      e.set(rx, ry, rz);
      q.setFromEuler(e);
      s.set(sc, sc * sy, sc);
      m4.compose(P(x, y, zz), q, s);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    zg[z].add(im);
    return im;
  };
  // fern: three crossed fronds that droop outward
  let fernCache = null;
  const fernGeo = () => {
    if (fernCache) return fernCache;
    const gs = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.PlaneGeometry(0.9, 1.6, 1, 4).translate(0, 0.8, 0);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k);
        p.setZ(k, (y * y) * 0.28);
      }
      g.rotateX(-0.35);
      g.rotateY((i / 5) * Math.PI * 2);
      gs.push(g);
    }
    fernCache = mergeGeos(gs);
    return fernCache;
  };
  // tiny fallback merge (BufferGeometryUtils is not loaded on every page)
  function mergeGeos(list) {
    let n = 0;
    let ni = 0;
    list.forEach((g) => {
      n += g.attributes.position.count;
      ni += g.index ? g.index.count : g.attributes.position.count;
    });
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const idx = new Uint32Array(ni);
    let o = 0;
    let oi = 0;
    list.forEach((g) => {
      const c = g.attributes.position.count;
      if (!g.attributes.normal) g.computeVertexNormals();
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (g.index) {
        for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.array[i] + o;
        oi += g.index.count;
      } else {
        for (let i = 0; i < c; i++) idx[oi + i] = i + o;
        oi += c;
      }
      o += c;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }
  const bentPetal = (w, l, curl) => {
    const g = new THREE.PlaneGeometry(w, l, 2, 6).translate(0, l / 2, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) / l;
      const x = p.getX(k) / w;
      p.setZ(k, curl * y * y * l + Math.abs(x) * w * 0.25);
    }
    g.computeVertexNormals();
    return g;
  };

  // ---------- a rose: layered petals that open (0 = bud, 1 = full bloom) ----------
  const makeRose = (scale, col = '#d8406a', withStem = true) => {
    const g = new THREE.Group();
    const head = new THREE.Group();
    const mat = petalMat(col, '#2a0610');
    const inner = petalMat('#b8284e', '#20040c');
    const petals = [];
    const layers = [
      [5, 0.42, 0.55, inner],
      [6, 0.55, 0.7, mat],
      [7, 0.7, 0.85, mat],
      [8, 0.82, 1.0, mat],
    ];
    layers.forEach(([n, w, l, m], li) => {
      for (let i = 0; i < n; i++) {
        const piv = new THREE.Group();
        const pm = new THREE.Mesh(bentPetal(w, l, -0.25), m);
        piv.add(pm);
        piv.rotation.order = 'YXZ';
        piv.rotation.y = (i / n) * Math.PI * 2 + li * 0.45;
        piv.position.set(Math.sin(piv.rotation.y) * 0.05 * li, 0, Math.cos(piv.rotation.y) * 0.05 * li);
        head.add(piv);
        petals.push({ piv, li });
      }
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), inner);
    core.scale.set(1, 1.4, 1);
    core.position.y = 0.2;
    head.add(core);
    // green sepals under the head
    const sep = new THREE.MeshStandardMaterial({ color: '#3f7a34', roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(bentPetal(0.22, 0.5, 0.3), sep);
      s.rotation.order = 'YXZ';
      s.rotation.y = (i / 5) * Math.PI * 2;
      s.rotation.x = 1.9;
      head.add(s);
    }
    g.add(head);
    if (withStem) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.6, 8).translate(0, -0.8, 0), M.stem);
      g.add(stem);
      [-1, 1].forEach((sd) => {
        const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7).translate(0, 0.35, 0), M.heartLeaf);
        lf.position.set(0, -0.8 + sd * 0.2, 0);
        lf.rotation.set(-0.9, sd > 0 ? 0 : Math.PI, 0);
        g.add(lf);
      });
      head.position.y = 0;
    }
    g.scale.setScalar(scale);
    const setOpen = (k) => {
      petals.forEach(({ piv, li }) => {
        // tilt outward from upright; outer layers open first and furthest
        const lag = clamp(k * 1.25 - li * -0.08 - (3 - li) * 0.12, 0, 1);
        piv.rotation.x = 0.12 + lag * (0.55 + li * 0.32);
      });
      core.scale.set(1, 1.4 - k * 0.5, 1);
    };
    setOpen(0);
    return { g, head, setOpen };
  };

  // ---------- the glass halls ----------
  const hall = (z, hw, z0, z1, wallH, opt = {}) => {
    const K = KZ[z];
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    const y0 = opt.y0 || 0;
    [-1, 1].forEach((sd) => {
      const w = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(len, wallH), len / 4, wallH / 4), M.glass);
      w.position.copy(P(sd * hw, y0 + wallH / 2, zc));
      w.rotation.y = Math.PI / 2;
      w.renderOrder = 2;
      zg[z].add(w);
      K.collider(sd * (hw + 0.25), y0 + 14, zc, 0.5, 40, len);
      // iron columns and a low stone plinth along the glass
      for (let zz = z0; zz <= z1 + 0.01; zz += 4) {
        K.deco(new THREE.BoxGeometry(0.22, wallH, 0.22), M.iron, sd * hw, y0 + wallH / 2, zz);
      }
      K.deco(new THREE.BoxGeometry(0.5, 0.6, len), M.stone, sd * (hw - 0.1), y0 + 0.3, zc);
    });
    // arched glass roof with iron ribs
    if (!opt.noRoof) {
      const roofGeo = uvScale(
        new THREE.CylinderGeometry(hw, hw, len, 28, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2),
        (hw * Math.PI) / 4,
        len / 4,
      );
      const roof = new THREE.Mesh(roofGeo, M.glass);
      roof.position.copy(P(0, y0 + wallH, zc));
      roof.renderOrder = 2;
      zg[z].add(roof);
      for (let zz = z0; zz <= z1 + 0.01; zz += 4) {
        const rib = K.deco(new THREE.TorusGeometry(hw, 0.13, 6, 32, Math.PI), M.iron, 0, y0 + wallH, zz);
        rib.rotation.z = 0;
      }
      // a ridge beam and a few hanging vines from the ribs
      K.deco(new THREE.BoxGeometry(0.3, 0.3, len), M.iron, 0, y0 + wallH + hw - 0.1, zc);
    }
    (opt.ends || []).forEach(([zz, gap, gy0 = y0, gy1]) => {
      // end wall of glass with a doorway gap [-gap, gap] from gy0 to gy1
      const top = y0 + wallH + (opt.noRoof ? 0 : hw);
      const sideW = hw - gap;
      [-1, 1].forEach((sd) => {
        const w = new THREE.Mesh(
          uvScale(new THREE.PlaneGeometry(sideW, top - y0), sideW / 4, (top - y0) / 4),
          M.glass,
        );
        w.position.copy(P(sd * (gap + sideW / 2), (top + y0) / 2, zz));
        w.renderOrder = 2;
        zg[z].add(w);
        K.collider(sd * (gap + sideW / 2), (top + y0) / 2, zz, sideW, top - y0 + 30, 0.5);
      });
      const g1 = gy1 != null ? gy1 : gy0 + 3.6;
      if (g1 < top) {
        const w = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(gap * 2, top - g1), gap / 2, (top - g1) / 4), M.glass);
        w.position.copy(P(0, (top + g1) / 2, zz));
        w.renderOrder = 2;
        zg[z].add(w);
        K.collider(0, (top + g1) / 2 + 10, zz, gap * 2, top - g1 + 20, 0.5);
      }
      if (gy0 > y0) K.collider(0, (gy0 + y0) / 2, zz, gap * 2, gy0 - y0, 0.5);
    });
  };

  // a glass double door; open slides the leaves into the wall
  const makeDoor = (z, id, x, y, zz, w, h) => {
    const K = KZ[z];
    const g = new THREE.Group();
    g.position.copy(P(x, y, zz));
    zg[z].add(g);
    const leaves = [-1, 1].map((sd) => {
      const l = new THREE.Group();
      const pane = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(w / 2, h), 1, h / 4), M.glass);
      pane.position.set(0, h / 2, 0);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.14, 0.12), M.iron);
      fr.position.y = h;
      const fr2 = fr.clone();
      fr2.position.y = 0.07;
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), M.iron);
      side.position.set((-sd * w) / 4, h / 2, 0);
      // a brass heart on each leaf: together they make one when the door is shut
      const hs = new THREE.Shape();
      for (let i = 0; i <= 40; i++) {
        const [hx, hy] = Heart.curve((i / 40) * Math.PI * 2);
        if (i) hs.lineTo(hx * 0.045, hy * 0.045);
        else hs.moveTo(hx * 0.045, hy * 0.045);
      }
      const ht = new THREE.Mesh(new THREE.ShapeGeometry(hs), M.brass);
      ht.position.set((-sd * w) / 4, h * 0.55, 0.07);
      ht.scale.x = 1;
      l.add(pane, fr, fr2, side, ht);
      l.position.x = (sd * w) / 4;
      g.add(l);
      return { l, sd };
    });
    const b = K.collider(x, y + h / 2, zz, w, h, 0.4);
    doors[id] = { g, leaves, b, open: 0, want: 0, w };
    return doors[id];
  };

  const plaque = (z, text, sub, x, y, zz, ry = 0, col = '#c9a24e') => {
    const tex = LvKit.tex(1080, 300, (g, w, h) => {
      g.fillStyle = '#1e2a22';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = col;
      g.lineWidth = 10;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#e8d8b0';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 110px Georgia';
      g.fillText(text, w / 2, h * 0.43);
      g.font = '42px Georgia';
      g.fillStyle = col;
      g.fillText(sub, w / 2, h * 0.78);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    m.material.color.setScalar(0.8);
    m.position.copy(P(x, y, zz));
    m.rotation.y = ry;
    zg[z].add(m);
    // two chains
    [-1.4, 1.4].forEach((dx) => {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), M.iron);
      ch.position.set(dx, 1.2, 0);
      m.add(ch);
    });
    return m;
  };

  // water surfaces (ponds, channels) with a slow ripple
  const waters = [];
  const water = (z, x, zz, sx, sz, y = -0.45) => {
    const tex = LvKit.tex(256, 256, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(150,200,210,${0.15 + Math.random() * 0.25})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 3 + Math.random() * 8, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }, sx / 6, sz / 6);
    const mat = M.water.clone();
    mat.map = tex;
    const m = KZ[z].deco(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), mat, x, y, zz);
    waters.push(tex);
    // dark basin walls under the surface
    [-1, 1].forEach((sd) => {
      KZ[z].deco(new THREE.BoxGeometry(sx, 3, 0.4), M.rock, x, y - 1.5, zz + (sd * sz) / 2);
    });
    return m;
  };
  // a deep chasm (sunflower, spring wind): rock walls into the mist
  const chasm = (z, zz, sz, hw) => {
    [-1, 1].forEach((sd) => {
      const w = KZ[z].deco(new THREE.BoxGeometry(hw * 2, 26, 0.6), M.rock, 0, -13, zz + (sd * sz) / 2);
      w.scale.y = 1;
    });
    [-1, 1].forEach((sd) => KZ[z].deco(new THREE.BoxGeometry(0.6, 26, sz), M.rock, sd * hw, -13, zz));
    const fog = new THREE.Mesh(
      new THREE.PlaneGeometry(hw * 2, sz).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#2d4a40', transparent: true, opacity: 0.85 }),
    );
    fog.position.copy(P(0, -9, zz));
    zg[z].add(fog);
    const mist = sprite(T.soft, '#9fc8b4', hw * 2.4, 0.22, false);
    mist.position.copy(P(0, -5, zz));
    zg[z].add(mist);
  };

  // planting beds along the glass with ferns, flowers and a few palms
  const beds = (z, hw, z0, z1, seed, opt = {}) => {
    const r = rng(seed);
    const ferns = [];
    const flowers = [];
    const y = opt.y || 0;
    for (let zz = z0 + 1; zz < z1 - 1; zz += 1.6) {
      [-1, 1].forEach((sd) => {
        ferns.push([sd * (hw - 1.1 - r() * 0.5), y + 0.55, zz + r() * 0.8, 0.9 + r() * 0.8, r() * 6]);
        if (r() < 0.6) flowers.push([sd * (hw - 0.6 - r() * 1.4), y + 0.6, zz + r(), 0.6 + r() * 0.5, r() * 6]);
      });
    }
    [-1, 1].forEach((sd) => {
      KZ[z].solid(sd * (hw - 1.1), y + 0.3, (z0 + z1) / 2, 2.2, 0.6, z1 - z0 - 0.2, M.soil);
    });
    instanced(z, fernGeo(), M.foliage, ferns);
    if (flowers.length) {
      const fg = new THREE.ConeGeometry(0.18, 0.28, 6).rotateX(Math.PI);
      const cols = opt.flower || '#e86a8a';
      const fm = new THREE.MeshStandardMaterial({ color: cols, roughness: 0.6, emissive: '#2a0a10' });
      instanced(z, fg.translate(0, 0.6, 0), fm, flowers);
      instanced(z, new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4).translate(0, 0.3, 0), M.stem, flowers);
    }
  };
  const palm = (z, x, zz, h = 7) => {
    const K = KZ[z];
    const curve = new THREE.CatmullRomCurve3([P(x, 0, zz), P(x + 0.4, h * 0.4, zz + 0.2), P(x + 0.2, h, zz - 0.3)]);
    zg[z].add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.28, 8, false), M.bark));
    const top = curve.getPoint(1);
    for (let i = 0; i < 9; i++) {
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.8, 1, 6).translate(0, 1.9, 0), M.foliage);
      const p = fr.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) p.setZ(k, -Math.pow(p.getY(k) / 3.8, 2) * 1.6);
      fr.geometry.computeVertexNormals();
      fr.position.copy(top);
      fr.rotation.order = 'YXZ';
      fr.rotation.y = (i / 9) * Math.PI * 2;
      fr.rotation.x = 1.0;
      zg[z].add(fr);
    }
    K.collider(x, h / 2, zz, 0.7, h, 0.7);
  };
  const hangingVines = (z, hw, z0, z1, top, seed) => {
    const r = rng(seed);
    for (let zz = z0 + 2; zz < z1; zz += 4 + r() * 4) {
      const x = (r() - 0.5) * hw * 1.4;
      const l = 2 + r() * 3.5;
      const pts = [];
      for (let k = 0; k <= 6; k++) pts.push(P(x + Math.sin(k + zz) * 0.25, top - (k / 6) * l, zz + Math.cos(k * 1.3) * 0.2));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.04, 4), M.vine);
      zg[z].add(tube);
      const lv = [];
      for (let k = 1; k < 6; k++) {
        const p = rel(pts[k]);
        lv.push([p.x, p.y, p.z, 0.25 + r() * 0.15, r() * 6, r() - 0.5]);
      }
      instanced(z, new THREE.PlaneGeometry(1, 1), M.heartLeaf, lv);
    }
  };

  // falling things: petals, leaves, snow, pollen
  const particles = (z, box, n, tex, color, size, fall, sway, opacity = 0.9, add = false) => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = [];
    const [x0, x1, y0, y1, z0, z1] = box;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = O.x + x0 + Math.random() * (x1 - x0);
      pos[i * 3 + 1] = O.y + y0 + Math.random() * (y1 - y0);
      pos[i * 3 + 2] = O.z + z0 + Math.random() * (z1 - z0);
      ph.push(Math.random() * 10);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        map: tex,
        color: new THREE.Color(color),
        size,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    m.frustumCulled = false;
    zg[z].add(m);
    const sys = {
      m,
      wind: 0,
      update(dt, t) {
        const a = g.attributes.position.array;
        for (let i = 0; i < n; i++) {
          a[i * 3 + 1] -= fall * dt;
          a[i * 3] += (Math.sin(t * 0.9 + ph[i]) * sway + sys.wind) * dt;
          a[i * 3 + 2] += Math.cos(t * 0.7 + ph[i] * 1.3) * sway * 0.6 * dt;
          if (a[i * 3 + 1] < O.y + y0 || a[i * 3] > O.x + x1 + 2) {
            a[i * 3] = O.x + x0 + Math.random() * (x1 - x0);
            a[i * 3 + 1] = O.y + y1;
            a[i * 3 + 2] = O.z + z0 + Math.random() * (z1 - z0);
          }
          if (fall <= 0 && a[i * 3 + 1] > O.y + y1) a[i * 3 + 1] = O.y + y0;
        }
        g.attributes.position.needsUpdate = true;
      },
      zone: z,
    };
    fx.push(sys);
    return sys;
  };

  const butterfly = (z, center, rad, col, seed) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      map: T.wing,
      color: col,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.6,
      emissive: new THREE.Color(col).multiplyScalar(0.18),
    });
    const wings = [-1, 1].map((sd) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34).translate(0.17, 0, 0), mat);
      w.scale.x = sd;
      w.rotation.x = -Math.PI / 2;
      const pv = new THREE.Group();
      pv.add(w);
      g.add(pv);
      return pv;
    });
    zg[z].add(g);
    const b = { g, wings, center: center.clone(), rad, seed, on: true, zone: z };
    butterflies.push(b);
    return b;
  };

  // ---------- a bud: a soil mound, a sprout and the progress ring (water half, light half) ----------
  const ringMat = () =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uProg: { value: 0 },
        uW: { value: 0 },
        uL: { value: 0 },
        uT: { value: 0 },
        uReq: { value: 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `
        varying vec2 vUv; uniform float uProg, uW, uL, uT, uReq;
        void main(){
          vec2 p = vUv * 2. - 1.;
          float r = length(p);
          float a = atan(p.x, p.y) / 6.2831853 + .5;
          float ring = smoothstep(.70, .74, r) * (1. - smoothstep(.92, .96, r));
          float inner = smoothstep(.48, .5, r) * (1. - smoothstep(.56, .58, r));
          vec3 base = vec3(.55, .5, .45);
          vec3 wc = vec3(.35, .62, .85);
          vec3 lc = vec3(.85, .68, .3);
          // left half shows the water, right half the light (lit while each one is given)
          vec3 hc = p.x < 0. ? mix(base * .5, wc, uW) : mix(base * .5, lc, uL);
          if (uReq > .5 && uReq < 1.5) hc = mix(base * .5, wc, uW);
          if (uReq > 1.5) hc = mix(base * .5, lc, uL);
          float fill = step(a, uProg);
          vec3 col = mix(hc * .8, vec3(.85, .45, .6), fill);
          float pulse = .65 + .35 * sin(uT * 3.);
          float alpha = ring * (.45 + .45 * fill) + inner * .35 * pulse;
          gl_FragColor = vec4(col, alpha * .9);
        }`,
    });
  const budMarker = (z, b) => {
    const g = new THREE.Group();
    g.position.copy(b.pos);
    zg[z].add(g);
    const water = b.kind === 'lily' || b.kind === 'ice';
    if (!water) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.soil);
      mound.scale.y = 0.35;
      g.add(mound);
    }
    const sprout = new THREE.Group();
    if (b.kind === 'ice') {
      // a dark open ripple where the water can freeze
      const rp = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.5, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#7fb8d0', transparent: true, opacity: 0.25, depthWrite: false }),
      );
      sprout.add(rp);
    } else if (b.kind === 'icebox') {
      // nothing: the frozen rose bud is drawn by the rose itself
    } else {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 6).translate(0, 0.25, 0), M.stem);
      sprout.add(st);
      [-1, 1].forEach((sd) => {
        const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42).translate(0, 0.21, 0), M.heartLeaf);
        lf.position.y = 0.4;
        lf.rotation.set(-0.7, sd > 0 ? 0.3 : Math.PI + 0.3, 0);
        sprout.add(lf);
      });
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 8),
        new THREE.MeshStandardMaterial({ color: '#e07898', roughness: 0.5, emissive: '#3a0c18' }),
      );
      bulb.position.y = 0.55;
      bulb.scale.set(1, 1.4, 1);
      sprout.add(bulb);
      sprout.position.y = water ? 0.05 : 0.2;
    }
    g.add(sprout);
    const rm = ringMat();
    rm.uniforms.uReq.value = b.req === 'water' ? 1 : b.req === 'light' ? 2 : 0;
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), rm);
    ring.position.y = water ? 0.12 : 0.3;
    ring.renderOrder = 3;
    g.add(ring);
    const halo = sprite(T.soft, '#c88a60', 1.4, 0.0);
    halo.position.y = 0.7;
    g.add(halo);
    b.marker = { g, sprout, ring, rm, halo };
  };

  // ---------- the plants themselves ----------
  const vineBridge = (b) => {
    const pts = [P(0, 0.05, 14.6), P(0.6, 0.35, 18), P(-0.5, 0.45, 22.3), P(0.4, 0.35, 26.4), P(0, 0.05, 29.6)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const parts = [];
    const main = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.55, 10, false), M.vine);
    main.scale.y = 0.45;
    main.position.y = -0.2 * 0;
    parts.push(main);
    // two braided strands around it, and side rails of thinner vines
    [0, Math.PI].forEach((ph) => {
      const bp = [];
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const c = curve.getPoint(u);
        bp.push(V3(c.x + Math.cos(u * 26 + ph) * 0.45, c.y + 0.12 + Math.sin(u * 26 + ph) * 0.18, c.z));
      }
      parts.push(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 120, 0.13, 6, false), M.stem));
    });
    [-1, 1].forEach((sd) => {
      const rp = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const c = curve.getPoint(u);
        rp.push(V3(c.x + sd * 1.25, c.y + 0.9 + Math.sin(u * Math.PI) * 0.2, c.z));
      }
      parts.push(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp), 60, 0.06, 5, false), M.vine));
      // posts of curled tendrils holding the rail
      for (let i = 1; i < 6; i++) {
        const c = curve.getPoint(i / 6);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1, 5), M.vine);
        post.position.set(c.x + sd * 1.25, c.y + 0.45, c.z);
        post.userData.u = i / 6;
        parts.push(post);
      }
    });
    parts.forEach((m) => {
      m.userData.full = m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
      zg.A.add(m);
    });
    const leaves = [];
    for (let i = 0; i < 46; i++) {
      const u = 0.03 + (i / 46) * 0.94;
      const c = rel(curve.getPoint(u));
      const sd = i % 2 ? 1 : -1;
      leaves.push([c.x + sd * (0.4 + (i % 3) * 0.12), c.y + 0.25, c.z, 0.55, i * 1.7, -0.6, sd * 0.4]);
    }
    const lm = instanced('A', new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), M.heartLeaf, leaves);
    const flowers = [];
    for (let i = 0; i < 14; i++) {
      const c = rel(curve.getPoint(0.05 + i / 15));
      flowers.push([c.x + (i % 2 ? 1.25 : -1.25), c.y + 1.0, c.z, 1, i]);
    }
    const fm = instanced(
      'A',
      new THREE.SphereGeometry(0.11, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#f08ab0', roughness: 0.5, emissive: '#3a0a18' }),
      flowers,
    );
    const col = KZ.A.collider(0, -0.15, 22.1, 2.4, 0.6, 15.2);
    col.on = false;
    const railL = KZ.A.collider(-1.3, 0.8, 22.1, 0.2, 1.4, 14);
    const railR = KZ.A.collider(1.3, 0.8, 22.1, 0.2, 1.4, 14);
    railL.on = railR.on = false;
    b.cols = [col, railL, railR];
    b.setGrow = (k) => {
      parts.forEach((m) => {
        if (m.userData.u != null) {
          m.visible = k > m.userData.u;
          return;
        }
        const n = m.userData.full;
        m.geometry.setDrawRange(0, Math.floor((n * clamp(k, 0, 1)) / 6) * 6);
      });
      lm.visible = k > 0.15;
      lm.scale.setScalar(1);
      lm.count = Math.floor(leaves.length * clamp(k, 0, 1));
      fm.count = Math.floor(flowers.length * clamp(k * 1.1 - 0.1, 0, 1));
    };
  };

  const lilyPad = (b, i) => {
    const g = new THREE.Group();
    g.position.copy(P(LILY[i][0], -0.18, LILY[i][1]));
    zg.A.add(g);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(1.62, 40).rotateX(-Math.PI / 2), M.padMat);
    pad.rotation.y = i * 2.1;
    g.add(pad);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.07, 6, 40).rotateX(Math.PI / 2), M.stem);
    g.add(rim);
    // a lotus on its edge
    const lotus = new THREE.Group();
    const lm = petalMat('#f2a4c0', '#3a1020');
    for (let k = 0; k < 10; k++) {
      const p = new THREE.Mesh(bentPetal(0.3, 0.55, -0.3), lm);
      p.rotation.order = 'YXZ';
      p.rotation.y = (k / 10) * Math.PI * 2;
      p.rotation.x = 0.5 + (k % 2) * 0.35;
      lotus.add(p);
    }
    lotus.position.set(0.9, 0.02, 0.4);
    g.add(lotus);
    const col = KZ.A.collider(LILY[i][0], -0.25, LILY[i][1], 3.0, 0.3, 3.0);
    col.on = false;
    b.cols = [col];
    b.pad = g;
    b.setGrow = (k) => {
      const e = k >= 1 ? 1 : k * k * (3 - 2 * k);
      g.scale.setScalar(0.05 + e * 0.95);
      g.position.y = O.y - 0.6 + e * 0.42;
      g.visible = k > 0.01;
    };
  };

  const bloomFlower = (b) => {
    const g = new THREE.Group();
    g.position.copy(P(-4, 0, 70));
    zg.A.add(g);
    const head = new THREE.Group();
    const pm = petalMat('#e86aa0', '#3a0820');
    for (let k = 0; k < 12; k++) {
      const p = new THREE.Mesh(bentPetal(1.1, 2.2, -0.12), pm);
      p.rotation.order = 'YXZ';
      p.rotation.y = (k / 12) * Math.PI * 2;
      p.rotation.x = 1.15 + (k % 2) * 0.12;
      p.position.y = 0.55;
      head.add(p);
    }
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.3, 0.45, 32),
      [new THREE.MeshStandardMaterial({ color: '#c79a3a', roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: T.seeds, roughness: 0.85 }), M.stem],
    );
    disc.position.y = 0.67;
    head.add(disc);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.5, 10), M.stem);
    stem.position.y = 0.25;
    g.add(stem, head);
    [0, 2.1, 4.2].forEach((a) => {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2).translate(0, 1, 0), M.heartLeaf);
      lf.rotation.order = 'YXZ';
      lf.rotation.y = a;
      lf.rotation.x = -1.2;
      g.add(lf);
    });
    // a ring of light on the floor to read "jump here"
    const col = KZ.A.collider(-4, 0.45, 70, 2.8, 0.9, 2.8);
    col.on = false;
    b.cols = [col];
    b.bounce = col;
    b.head = head;
    b.squash = 0;
    b.setGrow = (k) => {
      const e = k >= 1 ? 1 : k * k * (3 - 2 * k);
      g.scale.set(0.05 + e * 0.95, 0.05 + e * 0.95, 0.05 + e * 0.95);
      g.visible = k > 0.01;
    };
  };

  const makeSunflower = (b) => {
    const pivot = new THREE.Group();
    pivot.position.copy(P(SUN.pivot[0], 0, SUN.pivot[1]));
    zg.B.add(pivot);
    const rise = new THREE.Group();
    pivot.add(rise);
    // stem: straight up from the chasm, then an arm bending out to the head
    const path = new THREE.CatmullRomCurve3([
      V3(0, -14, 0),
      V3(0, -4, 0),
      V3(0, 2.4, 0.6),
      V3(0, 4.6, 3.2),
      V3(0, 5.2, SUN.arm - 1.2),
      V3(0, 5.5, SUN.arm),
    ]);
    rise.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.34, 10, false), M.stem));
    for (let i = 0; i < 5; i++) {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3).translate(0, 1.5, 0), M.heartLeaf);
      const p = path.getPoint(0.15 + i * 0.12);
      lf.position.copy(p);
      lf.rotation.order = 'YXZ';
      lf.rotation.y = i * 2.4;
      lf.rotation.x = -1.0;
      rise.add(lf);
    }
    const head = new THREE.Group();
    head.position.set(0, SUN.top, SUN.arm);
    rise.add(head);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.6, 0.4, 40), [
      new THREE.MeshStandardMaterial({ color: '#5a3a14', roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ map: T.seeds, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: '#3a2a10', roughness: 0.85 }),
    ]);
    disc.position.y = -0.2;
    head.add(disc);
    const pm = petalMat('#d8a018', '#2a1802');
    for (let k = 0; k < 26; k++) {
      const p = new THREE.Mesh(bentPetal(0.7, 1.5, -0.08), pm);
      p.rotation.order = 'YXZ';
      p.rotation.y = (k / 26) * Math.PI * 2;
      p.rotation.x = 1.42 - (k % 2) * 0.18;
      p.position.set(Math.sin(p.rotation.y) * 1.55, -0.12, Math.cos(p.rotation.y) * 1.55);
      head.add(p);
    }
    const box = Phys.box(0, -100, 0, 3.4, 0.4, 3.4, { dyn: true });
    box.on = false;
    const mover = { box, delta: V3(), last: V3(), on: false };
    movers.push(mover);
    sunflower = { pivot, rise, head, box, a: Math.PI, mover, grow: 0 };
    b.cols = [];
    b.setGrow = (k) => {
      sunflower.grow = k;
      const e = k >= 1 ? 1 : k * k * (3 - 2 * k);
      rise.position.y = -16 * (1 - e);
      pivot.visible = k > 0.01;
    };
  };

  const dandelion = (b) => {
    const g = new THREE.Group();
    g.position.copy(P(-6, 0, 148.5));
    zg.S.add(g);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 3.4, 8).translate(0, 1.7, 0), M.stem);
    g.add(stem);
    // a sphere of white filaments
    const pos = [];
    for (let i = 0; i < 260; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = V3(s * Math.cos(a), u, s * Math.sin(a));
      pos.push(0, 3.5, 0, d.x * 1.2, 3.5 + d.y * 1.2, d.z * 1.2);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const fil = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#e8eef0', transparent: true, opacity: 0.6 }));
    g.add(fil);
    const puff = sprite(T.soft, '#dfe8ea', 3.2, 0.35, false);
    puff.position.y = 3.5;
    g.add(puff);
    [0, 2, 4].forEach((a) => {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.8).translate(0, 0.9, 0), M.foliage);
      lf.rotation.order = 'YXZ';
      lf.rotation.y = a;
      lf.rotation.x = -1.1;
      g.add(lf);
    });
    b.head = { fil, puff };
    b.cols = [];
    b.setGrow = (k) => {
      const e = k >= 1 ? 1 : k * k * (3 - 2 * k);
      g.scale.setScalar(0.05 + e * 0.95);
      g.visible = k > 0.01;
    };
    // the flying seeds: little white parachutes you can stand on
    for (let i = 0; i < 3; i++) {
      const sg = new THREE.Group();
      zg.S.add(sg);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.1, 0.2, 24),
        new THREE.MeshStandardMaterial({ color: '#7a8284', roughness: 0.95, transparent: true, opacity: 0.8 }),
      );
      sg.add(disc);
      const fp = [];
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        fp.push(0, -0.4, 0, Math.cos(a) * 1.3, 0.05, Math.sin(a) * 1.3);
      }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
      sg.add(new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: '#f0f4f4', transparent: true, opacity: 0.7 })));
      const seedM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6).rotateX(Math.PI), M.bark);
      seedM.position.y = -0.7;
      sg.add(seedM);
      const fl = sprite(T.soft, '#ffffff', 3.4, 0.25, false);
      sg.add(fl);
      sg.visible = false;
      const box = Phys.box(0, -100, 0, 2.5, 0.3, 2.5, { dyn: true });
      box.on = false;
      const mover = { box, delta: V3(), last: V3(), on: false };
      movers.push(mover);
      seeds.push({ g: sg, box, mover, i });
    }
  };
  // where a seed is at time s since the gust (null = not out)
  const SEED_REST = 4.0;
  const SEED_FLY = 5.2;
  const SEED_LAND = 1.6;
  const seedAt = (i, s, out) => {
    const lx = -6 + (i - 1) * 2.8;
    const t = s - i * 0.25;
    if (t < 0 || t > SEED_REST + SEED_FLY + SEED_LAND) return null;
    if (t < SEED_REST) {
      // puffed out of the dandelion, settling on the near edge
      const k = clamp(t / 0.9, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      return out.set(-6 + (lx + 6) * e, 3.5 + (0.25 - 3.5) * e, 148.5 + (150.9 - 148.5) * e);
    }
    if (t < SEED_REST + SEED_FLY) {
      const u = (t - SEED_REST) / SEED_FLY;
      const e = u * u * (3 - 2 * u);
      return out.set(lx + Math.sin(u * Math.PI * 2) * 1.2 + u * 2, 0.25 + Math.sin(u * Math.PI) * 2.6, 150.9 + e * (167.3 - 150.9));
    }
    return out.set(lx + 2, 0.25, 167.3);
  };

  const beanstalk = (b1, b2) => {
    const [sx, sz] = BEAN_STEM;
    const leaves = [];
    const th0 = Math.PI / 2 + (2 * Math.PI) / 7;
    for (let i = 0; i < 14; i++) {
      const th = th0 + (i * 2 * Math.PI) / 7;
      const y = i < 7 ? 0.65 * (i + 1) : 4.5 + 0.6 * (i - 6);
      const x = sx + Math.cos(th) * 2.9;
      const z = sz + Math.sin(th) * 2.9;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), M.heartLeaf);
      m.position.copy(P(x, y + 0.03, z));
      m.rotation.y = -th + Math.PI / 2;
      zg.U.add(m);
      const c = KZ.U.collider(x, y - 0.15, z, 2.1, 0.3, 2.1);
      c.on = false;
      // a little curled petiole back to the stem
      const pet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 5), M.stem);
      pet.position.copy(P(sx + Math.cos(th) * 1.4, y - 0.3, sz + Math.sin(th) * 1.4));
      pet.rotation.z = Math.PI / 2;
      pet.rotation.y = -th;
      zg.U.add(pet);
      leaves.push({ m, c, pet, i });
    }
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2), M.heartLeaf);
    p1.position.copy(P(0, 4.53, 199.4));
    zg.U.add(p1);
    const p1c = KZ.U.collider(0, 4.35, 199.4, 3.4, 0.3, 3.4);
    p1c.on = false;
    const bridge = new THREE.Group();
    zg.U.add(bridge);
    for (let k = 0; k < 4; k++) {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.2).rotateX(-Math.PI / 2), M.heartLeaf);
      lf.position.copy(P(0, 9.03, 197.8 + k * 2.6));
      lf.rotation.y = k % 2 ? 0.2 : -0.2;
      bridge.add(lf);
    }
    const brc = KZ.U.collider(0, 8.85, 201.6, 2.6, 0.3, 10.2);
    brc.on = false;
    // the stem grows in two parts
    const stemCurve = new THREE.CatmullRomCurve3([P(sx, -0.2, sz), P(sx + 0.3, 3, sz), P(sx - 0.2, 6, sz + 0.2), P(sx, 9.6, sz), P(sx, 10.6, sz + 0.6)]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 60, 0.55, 10, false), M.stem);
    zg.U.add(stem);
    const stemN = stem.geometry.index.count;
    const stemCol = KZ.U.collider(sx, 5, sz, 1.1, 10, 1.1);
    stemCol.on = false;
    // tendrils spiralling around the stem
    const tp = [];
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      tp.push(P(sx + Math.cos(u * 30) * 0.7, u * 10, sz + Math.sin(u * 30) * 0.7));
    }
    const tendril = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp), 240, 0.07, 5, false), M.vine);
    zg.U.add(tendril);
    const tenN = tendril.geometry.index.count;
    const state = { k1: 0, k2: 0 };
    const apply = () => {
      const k = state.k1 * 0.5 + state.k2 * 0.5;
      stem.geometry.setDrawRange(0, Math.floor((stemN * k) / 6) * 6);
      tendril.geometry.setDrawRange(0, Math.floor((tenN * k) / 6) * 6);
      leaves.forEach((L) => {
        const kk = L.i < 7 ? state.k1 * 7 - L.i : state.k2 * 7 - (L.i - 7);
        const e = clamp(kk, 0, 1);
        L.m.scale.setScalar(Math.max(0.01, e));
        L.m.visible = L.pet.visible = e > 0.01;
      });
      p1.scale.setScalar(Math.max(0.01, clamp(state.k1 * 1.2 - 0.2, 0, 1)));
      bridge.scale.set(1, 1, 1);
      bridge.visible = state.k2 > 0.9;
      bridge.children.forEach((lf, i) => lf.scale.setScalar(clamp(state.k2 * 10 - 9 - i * 0.1, 0.01, 1)));
    };
    b1.cols = [...leaves.filter((L) => L.i < 7).map((L) => L.c), p1c, stemCol];
    b2.cols = [...leaves.filter((L) => L.i >= 7).map((L) => L.c), brc];
    b1.setGrow = (k) => {
      state.k1 = k;
      apply();
    };
    b2.setGrow = (k) => {
      state.k2 = k;
      apply();
    };
  };

  const mushrooms = (b) => {
    const caps = CAPS.map(([x, y, z], i) => {
      const g = new THREE.Group();
      g.position.copy(P(x, 0, z));
      zg.N.add(g);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, y, 10).translate(0, y / 2, 0), new THREE.MeshStandardMaterial({ color: '#e6dcc6', roughness: 0.8 }));
      const capTex = LvKit.tex(256, 128, (gg, w, h) => {
        gg.fillStyle = i % 2 ? '#b8442a' : '#c8622c';
        gg.fillRect(0, 0, w, h);
        for (let k = 0; k < 26; k++) {
          gg.fillStyle = 'rgba(240,230,210,0.9)';
          gg.beginPath();
          gg.arc(Math.random() * w, Math.random() * h * 0.8, 4 + Math.random() * 7, 0, Math.PI * 2);
          gg.fill();
        }
      });
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.6 }),
      );
      cap.scale.y = 0.42;
      cap.position.y = y - 0.25;
      const gill = new THREE.Mesh(new THREE.CircleGeometry(1.33, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8c8a8', roughness: 0.9 }));
      gill.position.y = y - 0.25;
      g.add(stem, cap, gill);
      // solid down to the ground: no bumping your head under a cap
      const c = KZ.N.collider(x, y / 2, z, 2.4, y, 2.4);
      c.on = false;
      return { g, c, i };
    });
    b.cols = caps.map((c) => c.c);
    b.setGrow = (k) => {
      caps.forEach((c) => {
        const e = clamp(k * 4 - c.i, 0, 1);
        const s = e < 1 ? e * e * (3 - 2 * e) : 1;
        c.g.scale.set(0.05 + s * 0.95, 0.02 + s * 0.98, 0.05 + s * 0.95);
        c.g.visible = e > 0.01;
      });
    };
  };

  const iceFloe = (b, i) => {
    const [x, z] = ICE[i];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.5, 7), M.ice.clone());
    m.position.copy(P(x, -0.27, z));
    m.rotation.y = i;
    zg.W.add(m);
    // a frosty top you can read as walkable
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(1.95, 7).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#8aa8b8', roughness: 0.6, transparent: true, opacity: 0.6 }),
    );
    top.position.y = 0.26;
    m.add(top);
    // a little wider than the gaps between the circles: no slipping between two floes
    const c = KZ.W.collider(x, -0.25, z, 3.7, 0.5, 3.7);
    c.on = false;
    b.cols = [c];
    b.floe = m;
    b.hp = 0;
    b.setGrow = (k) => {
      m.visible = k > 0.01;
      m.scale.set(0.3 + k * 0.7, 1, 0.3 + k * 0.7);
    };
  };

  // ---------- the Thorn Queen ----------
  const thornCones = (z, curves, per, size) => {
    const list = [];
    const t = V3();
    curves.forEach((cv) => {
      for (let i = 0; i < per; i++) {
        const u = (i + Math.random()) / per;
        const p = rel(cv.getPoint(u));
        cv.getTangent(u, t);
        list.push([p.x + (Math.random() - 0.5) * 0.3, p.y + (Math.random() - 0.5) * 0.3, p.z, size * (0.6 + Math.random() * 0.8), Math.random() * 6, Math.random() * 3, Math.random() * 3]);
      }
    });
    return instanced(z, new THREE.ConeGeometry(0.09, 0.5, 5).translate(0, 0.25, 0), M.thornTip, list);
  };
  const makeBoss = () => {
    const g = new THREE.Group();
    g.position.copy(P(C.x, 0, C.z));
    zg.Q.add(g);
    const body = new THREE.Group();
    g.add(body);
    const curves = [];
    // the bramble mass at her feet
    const base = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
      const r1 = 2 + Math.random();
      const r2 = 5.5 + Math.random() * 2.5;
      const cv = new THREE.CatmullRomCurve3([
        P(C.x + Math.cos(a) * 0.8, 2.5 + Math.random(), C.z + Math.sin(a) * 0.8),
        P(C.x + Math.cos(a + 0.3) * r1, 1.6 + Math.random(), C.z + Math.sin(a + 0.3) * r1),
        P(C.x + Math.cos(a - 0.2) * (r1 + r2) / 2, 0.9, C.z + Math.sin(a - 0.2) * (r1 + r2) / 2),
        P(C.x + Math.cos(a) * r2, 0.15, C.z + Math.sin(a) * r2),
      ]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(cv, 24, 0.24 + Math.random() * 0.12, 7, false), M.thorn);
      zg.Q.add(m);
      base.push(m);
      curves.push(cv);
    }
    // the torso: twisted stems rising into a figure
    const torso = [];
    for (let i = 0; i < 7; i++) {
      const a0 = (i / 7) * Math.PI * 2;
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        const r = 1.7 * (1 - u) + 0.7 * u + Math.sin(u * Math.PI) * 0.3;
        const a = a0 + u * 2.6;
        pts.push(V3(Math.cos(a) * r, u * 9, Math.sin(a) * r * 0.8));
      }
      const cv = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.Mesh(new THREE.TubeGeometry(cv, 30, 0.32, 7, false), M.thorn);
      body.add(m);
      torso.push(m);
    }
    // shoulders, arms raised like a queen's mantle
    const arms = [-1, 1].map((sd) => {
      const pv = new THREE.Group();
      pv.position.set(sd * 1.2, 8.3, 0);
      const cv = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(sd * 1.6, 0.6, 0.4), V3(sd * 3.2, -0.8, 1.2), V3(sd * 4.2, -2.6, 2.2)]);
      pv.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 24, 0.3, 7, false), M.thorn));
      body.add(pv);
      return pv;
    });
    // face: a mask of bark with two pink eyes, a crown of roses
    const head = new THREE.Group();
    head.position.set(0, 10.2, 0.2);
    body.add(head);
    const mask = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), M.thorn);
    mask.scale.set(0.9, 1.15, 0.8);
    head.add(mask);
    const eyes = [-1, 1].map((sd) => {
      const e = sprite(T.soft, '#ff4a7a', 0.8, 0.85);
      e.position.set(sd * 0.36, 0.12, 0.85);
      head.add(e);
      return e;
    });
    const crown = [];
    for (let i = 0; i < 7; i++) {
      const r = makeRose(0.55, '#c8304e', false);
      const a = -Math.PI / 2 + ((i - 3) / 6) * Math.PI * 0.9;
      r.g.position.set(Math.sin(a) * 0.9, 1.1 + Math.cos(i - 3) * 0.1, Math.cos(a) * 0.3 - 0.1);
      r.g.rotation.z = -Math.sin(a) * 0.5;
      r.setOpen(0.85);
      head.add(r.g);
      crown.push(r);
    }
    // the heart in her chest: a closed pink bud that glows
    const hs = new THREE.Shape();
    for (let i = 0; i <= 50; i++) {
      const [hx, hy] = Heart.curve((i / 50) * Math.PI * 2);
      if (i) hs.lineTo(hx * 0.09, hy * 0.09);
      else hs.moveTo(hx * 0.09, hy * 0.09);
    }
    const heart = new THREE.Mesh(
      new THREE.ExtrudeGeometry(hs, { depth: 0.4, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }),
      new THREE.MeshStandardMaterial({ color: '#d84a78', roughness: 0.5, emissive: '#5a0a24' }),
    );
    heart.position.set(0, 6.2, 0.9);
    body.add(heart);
    const heartGlow = sprite(T.soft, '#ff5f8a', 3.2, 0.35);
    heartGlow.position.set(0, 6.4, 1.2);
    body.add(heartGlow);
    const thorns = thornCones('Q', curves, 14, 1.4);
    const bossCols = [KZ.Q.collider(C.x, 6, C.z, 5.6, 12, 5.6), KZ.Q.collider(C.x, 0.6, C.z, 9, 1.2, 9)];
    // attack props: lash strips + whips, thorn patches, the ring
    const strip = (col) =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
    const lashes = [0, 1, 2].map(() => {
      const tel = strip('#ff3a5a');
      tel.position.copy(P(C.x, 0.07, C.z));
      zg.Q.add(tel);
      const whip = new THREE.Group();
      const wc = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.3, 0.2, 7), V3(-0.3, 0.1, 14), V3(0.2, 0.1, 21), V3(0, 0, 26)]);
      whip.add(new THREE.Mesh(new THREE.TubeGeometry(wc, 50, 0.35, 7, false), M.thorn));
      const tl = [];
      for (let i = 0; i < 70; i++) {
        const u = i / 70;
        const p = wc.getPoint(u);
        tl.push([p.x, p.y, p.z]);
      }
      const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.55, 5).translate(0, 0.27, 0), M.thornTip, tl.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      tl.forEach(([x, y, z], i) => {
        e.set(Math.cos(i * 2.4) * 1.4, 0, Math.sin(i * 2.4) * 1.4);
        q.setFromEuler(e);
        m4.compose(V3(x, y, z), q, V3(1, 1, 1));
        im.setMatrixAt(i, m4);
      });
      im.frustumCulled = false;
      whip.add(im);
      whip.position.copy(P(C.x, 0, C.z));
      whip.visible = false;
      zg.Q.add(whip);
      return { tel, whip, t: -1, a: 0 };
    });
    const patches = [0, 1, 2, 3, 4, 5].map(() => {
      const tel = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.0, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      zg.Q.add(tel);
      const pg = new THREE.Group();
      const tl = [];
      for (let i = 0; i < 38; i++) {
        const r = Math.sqrt(Math.random()) * 2.7;
        const a = Math.random() * Math.PI * 2;
        tl.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
      }
      const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 1.1, 5).translate(0, 0.55, 0), M.thornTip, tl.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      tl.forEach(([x, y, z], i) => {
        e.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
        q.setFromEuler(e);
        m4.compose(V3(x, y, z), q, V3(1, 0.6 + Math.random() * 0.8, 1));
        im.setMatrixAt(i, m4);
      });
      im.frustumCulled = false;
      pg.add(im);
      const bramble = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.2, 6, 24).rotateX(Math.PI / 2), M.thorn);
      bramble.position.y = 0.15;
      pg.add(bramble);
      pg.visible = false;
      zg.Q.add(pg);
      return { tel, pg, t: -1, x: 0, z: 0 };
    });
    const ringTel = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.4, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ringTel.position.copy(P(C.x, 0.08, C.z));
    zg.Q.add(ringTel);
    const ringMat = M.thorn.clone();
    ringMat.side = THREE.DoubleSide;
    ringMat.emissive = new THREE.Color('#3a0a14');
    const ringWave = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.75, 120, 1, true).translate(0, 0.375, 0), ringMat);
    ringWave.position.copy(P(C.x, 0, C.z));
    ringWave.visible = false;
    zg.Q.add(ringWave);
    boss = {
      g,
      body,
      base,
      torso,
      arms,
      head,
      eyes,
      crown,
      heart,
      heartGlow,
      thorns,
      lashes,
      patches,
      ring: { tel: ringTel, wave: ringWave, t: -1 },
      alive: 1,
      hurt: 0,
      cast: 0,
      withered: 0,
      face: 0,
      cols: bossCols,
    };
  };

  // ---------- build ----------
  const build = () => {
    if (built) {
      root.visible = true;
      return;
    }
    built = true;
    root.visible = true;
    makeTextures();
    makeMats();

    // ----- outside: lawns around the glasshouse and a few distant trees -----
    const lawn = Tex.mat('grass', { color: '#2e4826', scale: 4, rough: 0.95 });
    [
      [-90.3, 200, 150, 520],
      [90.3, 200, 150, 520],
      [0, -56, 30.6, 108],
      [0, 446, 30.6, 108],
      [-13.65, 36, 3.3, 76],
      [13.65, 36, 3.3, 76],
    ].forEach(([x, z, sx, sz]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), lawn);
      m.position.copy(P(x, -0.02, z));
      root.add(m);
    });
    const treeG = new THREE.ConeGeometry(2.6, 9, 7).translate(0, 4.5, 0);
    const treeM = new THREE.MeshStandardMaterial({ color: '#1c3220', roughness: 0.9, flatShading: true });
    const tr = rng(7);
    const tlist = [];
    for (let i = 0; i < 80; i++) {
      const sd = i % 2 ? 1 : -1;
      tlist.push([sd * (30 + tr() * 40), 0, -20 + tr() * 430, 0.8 + tr() * 0.9, tr() * 6]);
    }
    const trees = new THREE.InstancedMesh(treeG, treeM, tlist.length);
    const m4 = new THREE.Matrix4();
    tlist.forEach(([x, y, z, s, r], i) => {
      m4.compose(P(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r, 0)), V3(s, s, s));
      trees.setMatrixAt(i, m4);
    });
    trees.frustumCulled = false;
    root.add(trees);

    // ===== zone A: the vestibule, the stream, the lily pond, the flower =====
    const KA = KZ.A;
    hall('A', 12, -2, 74, 7, { ends: [[-2, 2.2]] });
    makeDoor('A', 'd0', 0, 0, -2, 4.4, 3.6);
    KA.solid(0, -0.5, 7, 24, 1, 18, M.tiles);
    // the heart mosaic in the vestibule
    KA.deco(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), M.mosaic, 0, 0.012, 7.5);
    KA.solid(0, -0.5, 34.5, 24, 1, 11, M.path);
    KA.solid(0, -0.5, 67, 24, 1, 14, M.path);
    water('A', 0, 22.5, 24, 13);
    water('A', 0, 50, 24, 20);
    // stone edges of the stream and the pond
    [16, 29, 40, 60].forEach((zz) => KA.deco(new THREE.BoxGeometry(24, 0.25, 0.5), M.stone, 0, 0.05, zz + (zz === 16 || zz === 40 ? -0.25 : 0.25)));
    beds('A', 12, -1, 15.5, 11);
    beds('A', 12, 29.5, 39.5, 12, { flower: '#f0c050' });
    beds('A', 12, 60.5, 73.5, 13, { flower: '#b07ae0' });
    palm('A', -8.5, 3, 8);
    palm('A', 8.5, 11, 7);
    palm('A', -8.5, 36, 6.5);
    palm('A', 8.6, 66, 7.5);
    hangingVines('A', 12, 0, 74, 13, 21);
    // reeds in the water
    const reeds = [];
    const rr = rng(31);
    for (let i = 0; i < 70; i++) {
      const sd = rr() < 0.5 ? -1 : 1;
      const zz = rr() < 0.4 ? 17 + rr() * 11 : 41 + rr() * 18;
      reeds.push([sd * (8 + rr() * 3.5), -0.45, zz, 0.7 + rr() * 0.6, rr() * 6, (rr() - 0.5) * 0.2, (rr() - 0.5) * 0.2]);
    }
    instanced('A', new THREE.CylinderGeometry(0.02, 0.04, 2.2, 4).translate(0, 1.1, 0), M.stem, reeds);
    // the screen of the épreuve, hung from the first rib
    screen = makeScreen(7, 3, 1024);
    screen.mesh.position.copy(P(0, 5.2, -1.6));
    zg.A.add(screen.mesh);
    plaque('A', 'Le Jardin', 'serre des quatre saisons', 0, 2.9, -1.5, 0);
    // the tools' racks at the entrance: a watering can and a little sun
    [-1, 1].forEach((sd) => KA.solid(sd * 3.2, 0.45, 1.2, 1.2, 0.9, 0.7, M.bark));

    // ===== zone B: the terrace, the sunflower chasm, the stairs down =====
    const KB = KZ.B;
    hall('B', 15, 74, 140, 9, { ends: [[74, 12, 0, 19]] });
    // glass wall above the A hall roof line where the halls meet
    KB.solid(0, 3, 85, 30, 6, 22, M.stone);
    KB.deco(new THREE.BoxGeometry(30.02, 0.3, 22.02), M.path, 0, 6.0, 85);
    KB.solid(0, 3, 118, 30, 6, 12, M.stone);
    KB.deco(new THREE.BoxGeometry(30.02, 0.3, 12.02), M.path, 0, 6.0, 118);
    chasm('B', 104, 16, 15);
    for (let k = 0; k < 10; k++) {
      const top = 6 - 0.6 * (k + 1);
      if (top > 0) KB.solid(0, top / 2, 124.5 + k, 30, top, 1, M.stone);
    }
    KB.solid(0, -0.5, 137, 30, 1, 6, M.tiles);
    // the A-hall's end above the terrace face
    const face = KA.deco(new THREE.BoxGeometry(24, 6, 0.5), M.stone, 0, 3, 74.2);
    face.visible = true;
    // ivy on the terrace face
    const ivy = [];
    const ir = rng(41);
    for (let i = 0; i < 90; i++) ivy.push([-11 + ir() * 22, 0.3 + ir() * 5.4, 73.85, 0.35 + ir() * 0.25, 0, 0, ir() * 6]);
    instanced('A', new THREE.PlaneGeometry(1, 1), M.heartLeaf, ivy);
    beds('B', 15, 75, 95, 14, { flower: '#f2c23a', y: 6 });
    beds('B', 15, 113, 123.5, 15, { flower: '#f08ab0', y: 6 });
    hangingVines('B', 15, 74, 140, 18, 22);
    plaque('B', 'Le Tournesol', 'il suit la lumière', -6, 9.2, 96.6, 0, '#f2c23a');

    // ===== zone S: spring (wind, dandelion) =====
    const KS = KZ.S;
    hall('S', 15, 140, 176, 8, { ends: [[140, 2.2], [176, 2.2]] });
    KS.solid(0, -0.5, 146, 30, 1, 12, M.grass);
    KS.solid(0, -0.5, 171, 30, 1, 10, M.grass);
    chasm('S', 159, 14, 15);
    KS.solid(0, -0.5, 178, 6, 1, 4, M.tiles);
    KS.collider(-3.2, 2, 178, 0.4, 4, 4);
    KS.collider(3.2, 2, 178, 0.4, 4, 4);
    beds('S', 15, 140.5, 151.5, 16, { flower: '#ffb6d0' });
    beds('S', 15, 166.5, 175.5, 17, { flower: '#ffd6e6' });
    // cherry trees in blossom
    [
      [-11, 144],
      [11, 147],
      [-11, 171],
      [11, 173],
    ].forEach(([x, z], i) => {
      const cv = new THREE.CatmullRomCurve3([P(x, 0, z), P(x + 0.5, 2.5, z), P(x - 0.3, 4.5, z + 0.4)]);
      zg.S.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.3, 7), M.bark));
      KS.collider(x, 2.5, z, 0.7, 5, 0.7);
      const blossoms = [];
      const br = rng(50 + i);
      for (let k = 0; k < 40; k++) blossoms.push([x + (br() - 0.5) * 4.4, 4.6 + br() * 2.4, z + (br() - 0.5) * 4.4, 0.6 + br() * 0.6, br() * 6]);
      instanced('S', new THREE.IcosahedronGeometry(0.8, 0), new THREE.MeshStandardMaterial({ color: '#f4b6cc', roughness: 0.8, flatShading: true, emissive: '#2a0a14' }), blossoms);
    });
    plaque('S', 'Printemps', 'le vent porte les graines', 0, 5.6, 140.4, 0, '#ffb6d0');
    makeDoor('S', 'd1', 0, 0, 140, 4.4, 3.6);
    makeDoor('S', 'd2', 0, 0, 176, 4.4, 3.6);
    T.springPetals = particles('S', [-15, 15, 0, 9, 140, 176], 380, T.petalFall, '#f6c0d4', 0.22, 0.5, 0.6);
    T.gustPetals = particles('S', [-14, 14, 0.3, 4, 151, 167], 260, T.petalFall, '#ffe0ea', 0.26, -0.2, 0.2, 0);

    // ===== zone U: summer (beanstalk, fountain) =====
    const KU = KZ.U;
    hall('U', 15, 180, 214, 13, { ends: [[180, 2.2], [214, 2, 9, 12.6]] });
    KU.solid(0, -0.5, 197, 30, 1, 34, M.dry);
    KU.solid(0, 4.5, 210, 12, 9, 8, M.stone);
    KU.deco(new THREE.BoxGeometry(12.02, 0.3, 8.02), M.path, 0, 9.0, 210);
    // cracked dry earth around a dead fountain basin, and a living one
    const basin = (x, y, z, r) => {
      KU.solid(x, y + 0.35, z, r * 2, 0.7, r * 2, M.stone);
      const w = KU.deco(new THREE.CircleGeometry(r - 0.25, 24).rotateX(-Math.PI / 2), M.water, x, y + 0.71, z);
      const jet = sprite(T.soft, '#bfe6ff', 1.6, 0.45, false);
      jet.position.copy(P(x, y + 1.4, z));
      zg.U.add(jet);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 8), M.copper);
      col.position.copy(P(x, y + 1.1, z));
      zg.U.add(col);
      return { w, jet };
    };
    T.fountains = [basin(-5, 0, 185, 1.5)];
    // the dew cup on the first big leaf: a small refill up there
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.copper);
    cup.position.copy(P(-1.2, 4.95, 200.5));
    zg.U.add(cup);
    const dew = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16).rotateX(-Math.PI / 2), M.water);
    dew.position.copy(P(-1.2, 4.9, 200.5));
    zg.U.add(dew);
    T.cup = cup;
    const ivyU = [];
    const iu = rng(83);
    for (let i = 0; i < 140; i++) {
      const x = -5.8 + iu() * 11.6;
      const y = 0.3 + Math.pow(iu(), 0.7) * 8.4;
      ivyU.push([x, y, 205.88, 0.4 + iu() * 0.3, 0, 0, iu() * 6]);
    }
    instanced('U', new THREE.PlaneGeometry(1, 1), M.heartLeaf, ivyU);
    // a wooden trellis on the face
    for (let k = 0; k < 7; k++) {
      KU.deco(new THREE.BoxGeometry(0.1, 8.6, 0.1), M.bark, -5.4 + k * 1.8, 4.5, 205.9);
      KU.deco(new THREE.BoxGeometry(11.4, 0.1, 0.1), M.bark, 0, 1 + k * 1.25, 205.9);
    }
    const potM = Tex.mat('brick', { color: '#8a4a32', scale: 0.6, rough: 0.9 });
    const pots = [];
    for (let i = 0; i < 10; i++) {
      const sd = i % 2 ? 1 : -1;
      const z = 183 + Math.floor(i / 2) * 4.5;
      pots.push([sd * 7.8, 0, z]);
    }
    pots.forEach(([x, y, z], i) => {
      KU.deco(new THREE.CylinderGeometry(0.58, 0.42, 0.9, 16), potM, x, 0.45, z);
      KU.deco(new THREE.TorusGeometry(0.58, 0.07, 6, 16).rotateX(Math.PI / 2), potM, x, 0.9, z);
      KU.collider(x, 0.45, z, 1.1, 0.9, 1.1);
      instanced('U', fernGeo(), M.foliage, [[x, 0.9, z, 0.9, i]]);
    });
    beds('U', 15, 180.5, 205.5, 18, { flower: '#f2c23a' });
    // sunflowers on the sides (decor), all turned to the light
    const sfl = [];
    for (let i = 0; i < 16; i++) sfl.push([(i % 2 ? 1 : -1) * 12.8, 0, 182 + i * 1.5, 1, i % 2 ? -Math.PI / 2 : Math.PI / 2]);
    instanced('U', new THREE.CylinderGeometry(0.05, 0.07, 3, 5).translate(0, 1.5, 0), M.stem, sfl);
    instanced('U', new THREE.CircleGeometry(0.45, 16).rotateX(-0.4).translate(0, 3, 0.2), new THREE.MeshStandardMaterial({ color: '#b88a1e', roughness: 0.7, side: THREE.DoubleSide }), sfl);
    plaque('U', 'Été', 'l’eau est rare, la lumière brûle', 0, 7.5, 180.4, 0, '#f2c23a');
    makeDoor('U', 'd3', 0, 9, 214, 4, 3.6);
    T.pollen = particles('U', [-15, 15, 0.5, 12, 180, 214], 260, T.soft, '#ffd77a', 0.16, -0.08, 0.4, 0.75, true);
    // bridge and stairs down to autumn
    KU.solid(0, 8.5, 217, 6, 1, 6, M.stone);
    for (let k = 0; k < 15; k++) {
      const top = 9 - 0.6 * (k + 1);
      if (top > 0) KU.solid(0, top / 2, 220.5 + k, 6, top, 1, M.stone);
    }
    KU.solid(0, -0.5, 236.5, 6, 1, 3, M.tiles);
    [-1, 1].forEach((sd) => {
      KU.solid(sd * 3.2, 6, 227, 0.4, 14, 22, M.stone);
    });
    KU.collider(0, 16, 226, 6, 2, 22);

    // ===== zone N: autumn (holes under the leaves, mushrooms) =====
    const KN = KZ.N;
    hall('N', 15, 238, 272, 9, { ends: [[238, 2.2], [272, 2, 5, 8.6]] });
    KN.solid(0, -0.5, 240, 30, 1, 4, M.path);
    KN.solid(0, -0.5, 264.5, 30, 1, 3, M.leafFloor);
    KN.solid(0, 2.5, 269, 30, 5, 6, M.stone);
    KN.deco(new THREE.BoxGeometry(30.02, 0.3, 6.02), M.leafFloor, 0, 5.0, 269);
    // the hole field: solid cells merged per row
    HOLES.forEach((row, r) => {
      const z = HZ0 + 1.5 + r * 3;
      let start = -1;
      for (let c = 0; c <= row.length; c++) {
        const solid = c < row.length && row[c] === '#';
        if (solid && start < 0) start = c;
        if (!solid && start >= 0) {
          const x0 = -15 + start * 3;
          const x1 = -15 + c * 3;
          KN.collider((x0 + x1) / 2, -0.5, z, x1 - x0, 1, 3);
          start = -1;
        }
        if (c < row.length && row[c] === 'o') holeCells.push({ x: -13.5 + c * 3, z, r, c });
      }
    });
    // one leaf carpet over everything: you cannot tell where the holes are
    const carpet = KN.deco(new THREE.PlaneGeometry(30, 21).rotateX(-Math.PI / 2), M.leafFloor, 0, 0.01, HZ0 + 10.5);
    carpet.visible = false;
    const leafMat = new THREE.MeshStandardMaterial({ map: T.maple, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
    const lc = rng(61);
    const cells = [];
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 10; c++) {
        const hole = HOLES[r][c] === 'o';
        const pts = [];
        for (let k = 0; k < 34; k++) {
          const hue = lc();
          pts.push([-15 + c * 3 + lc() * 3, 0.03 + lc() * 0.06, HZ0 + r * 3 + lc() * 3, 0.26 + lc() * 0.22, lc() * 6, -Math.PI / 2 + (lc() - 0.5) * 0.3, 0, 1, hue]);
        }
        cells.push({ hole, pts, r, c });
      }
    // three leaf colours, solid cells in one mesh each, holes each in their own (they fade)
    const leafCols = ['#a8481e', '#b8781e', '#8a2a14'];
    leafCols.forEach((col, ci) => {
      const lm = leafMat.clone();
      lm.color.set(col);
      const list = [];
      cells.filter((c) => !c.hole).forEach((c) => c.pts.forEach((p) => p[8] * 3 >= ci && p[8] * 3 < ci + 1 && list.push(p)));
      instanced('N', new THREE.PlaneGeometry(1, 1), lm, list);
    });
    // ground under the solid cells (so the carpet has a floor colour) and the pits
    HOLES.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const x = -13.5 + c * 3;
        const z = HZ0 + 1.5 + r * 3;
        if (row[c] === '#') KN.deco(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2).rotateY(((r * 7 + c * 3) % 4) * (Math.PI / 2)), M.litter, x, 0.005, z);
      }
    });
    holeCells.forEach((h) => {
      // a pit: dark walls going down
      const pit = new THREE.Mesh(new THREE.BoxGeometry(2.96, 6, 2.96), new THREE.MeshStandardMaterial({ color: '#100a06', roughness: 1, side: THREE.BackSide }));
      pit.position.copy(P(h.x, -3.02, h.z));
      zg.N.add(pit);
      // the cover of leaves over it (fades in the light) and the glowing rim (shows in the light)
      const cover = new THREE.Group();
      const lm = leafMat.clone();
      lm.color.set(leafCols[(h.r + h.c) % 3]);
      lm.transparent = true;
      const cell = cells.find((cc) => cc.r === h.r && cc.c === h.c);
      const im = instanced('N', new THREE.PlaneGeometry(1, 1), lm, cell.pts);
      zg.N.remove(im);
      cover.add(im);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2).rotateY(((h.r * 7 + h.c * 3) % 4) * (Math.PI / 2)), M.litter.clone());
      floor.material.transparent = true;
      floor.position.copy(P(h.x, 0.005, h.z));
      cover.add(floor);
      zg.N.add(cover);
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 1.5, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a3a').multiplyScalar(0.9), transparent: true, opacity: 0, depthWrite: false }),
      );
      rim.scale.setScalar(1.42);
      rim.position.copy(P(h.x, 0.09, h.z));
      zg.N.add(rim);
      h.cover = cover;
      h.coverMats = [lm, floor.material];
      h.rim = rim;
      h.k = 0;
    });
    // maples
    [
      [-12, 246],
      [12, 251],
      [-12, 259],
      [12, 243],
    ].forEach(([x, z], i) => {
      const cv = new THREE.CatmullRomCurve3([P(x, 0, z), P(x - 0.4, 3, z), P(x + 0.3, 5, z - 0.3)]);
      zg.N.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.32, 7), M.bark));
      KN.collider(x, 2.5, z, 0.7, 5, 0.7);
      const crown = [];
      const cr = rng(70 + i);
      for (let k = 0; k < 34; k++) crown.push([x + (cr() - 0.5) * 4.6, 5 + cr() * 2.6, z + (cr() - 0.5) * 4.6, 0.7 + cr() * 0.6, cr() * 6]);
      instanced('N', new THREE.IcosahedronGeometry(0.85, 0), new THREE.MeshStandardMaterial({ color: ['#c8622c', '#d89a32', '#a83a22'][i % 3], roughness: 0.85, flatShading: true }), crown);
    });
    plaque('N', 'Automne', 'les feuilles cachent les trous', 0, 5.6, 238.4, 0, '#d89a32');
    makeDoor('N', 'd4', 0, 0, 238, 4.4, 3.6);
    makeDoor('N', 'd5', 0, 5, 272, 4, 3.6);
    T.autumnLeaves = particles('N', [-15, 15, 0, 9, 238, 272], 220, T.maple, '#a8521e', 0.3, 0.55, 0.9, 0.9);
    // the spotlight disc of the little sun
    spot = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#ffd27a').multiplyScalar(0.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    spot.scale.setScalar(4.2);
    root.add(spot);
    // stairs down from the autumn ledge to winter
    KN.solid(0, 4.5, 274, 6, 1, 4, M.stone);
    for (let k = 0; k < 8; k++) {
      const top = 5 - 0.625 * (k + 1);
      if (top > 0) KN.solid(0, top / 2, 276.5 + k, 6, top, 1, M.stone);
    }
    [-1, 1].forEach((sd) => KN.solid(sd * 3.2, 6, 279, 0.4, 12, 14, M.stone));
    KN.collider(0, 13, 279, 6, 2, 14);

    // ===== zone W: winter (ice, rings, the frozen rose) =====
    const KW = KZ.W;
    hall('W', 15, 284, 334, 9, { ends: [[284, 2.2], [334, 4.2, 0, 6]] });
    KW.solid(0, -0.5, 287, 30, 1, 6, M.snow);
    KW.solid(0, -0.5, 305, 30, 1, 6, M.snow);
    KW.solid(0, -0.5, 327, 30, 1, 14, M.snow);
    water('W', 0, 296, 30, 12, -0.5);
    water('W', 0, 314, 30, 12, -0.5);
    // frozen crust along the channel banks
    [290, 302, 308, 320].forEach((zz) => KW.deco(new THREE.BoxGeometry(30, 0.2, 0.8), M.ice, 0, 0.0, zz));
    beds('W', 15, 284.5, 289.5, 19, { flower: '#cfe6ff' });
    beds('W', 15, 320.5, 333.5, 20, { flower: '#cfe6ff' });
    // bare trees white with frost
    [
      [-11, 305],
      [11, 306],
      [-11, 325],
      [11, 328],
    ].forEach(([x, z]) => {
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3;
        const cv = new THREE.CatmullRomCurve3([P(x, 0, z), P(x, 2.4, z), P(x + Math.cos(a) * 1.4, 3.6 + k * 0.2, z + Math.sin(a) * 1.4), P(x + Math.cos(a) * 2.4, 4.6 + k * 0.3, z + Math.sin(a) * 2.4)]);
        zg.W.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.12 + (k === 0 ? 0.12 : 0), 6), new THREE.MeshStandardMaterial({ color: '#b8c4cc', roughness: 0.8 })));
      }
      KW.collider(x, 2.2, z, 0.6, 4.4, 0.6);
    });
    // the ice wall that seals the dome, with the frozen rose in front
    iceWall = new THREE.Mesh(new THREE.BoxGeometry(8.4, 6, 1.2), M.ice.clone());
    iceWall.position.copy(P(0, 3, 333.2));
    zg.W.add(iceWall);
    iceWall.userData.b = KW.collider(0, 3, 333.2, 8.4, 6, 1.2);
    const icicles = [];
    for (let i = 0; i < 30; i++) icicles.push([-4 + i * 0.28, 6, 332.6, 0.5 + Math.random() * 0.9, 0, Math.PI, 0]);
    instanced('W', new THREE.ConeGeometry(0.12, 1.2, 5).translate(0, 0.6, 0), M.ice, icicles);
    plaque('W', 'Hiver', 'l’eau gèle, la lumière fait fondre', 0, 5.6, 284.4, 0, '#cfe6ff');
    T.snow = particles('W', [-15, 15, 0, 10, 284, 334], 420, T.flake, '#ffffff', 0.18, 0.7, 0.35, 0.85);
    // rings for the one with the grapple
    Object.entries(RINGS).forEach(([id, r]) => {
      const z = id === 'sun' ? 'B' : 'W';
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 10, 32), M.brass);
      ring.position.copy(P(...r.pos));
      zg[z].add(ring);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 6, 5), M.iron);
      chain.position.copy(P(r.pos[0], r.pos[1] + 3.8, r.pos[2]));
      zg[z].add(chain);
      const h = sprite(T.soft, '#ffd88a', 1.6, 0.25);
      h.position.copy(ring.position);
      zg[z].add(h);
      r.mesh = ring;
      r.halo = h;
      r.wp = P(...r.pos);
    });

    // ===== zone Q: the Thorn Queen's dome =====
    const KQ = KZ.Q;
    KQ.solid(0, -0.5, 338, 8.4, 1, 8, M.path);
    [-1, 1].forEach((sd) => KQ.solid(sd * 4.4, 3, 338, 0.4, 6, 8, M.stone));
    KQ.solid(0, -0.5, C.z, 50, 1, 50, M.tiles);
    // the heart mosaic under her: hidden by the brambles until she withers
    KQ.deco(new THREE.CircleGeometry(7.5, 64).rotateX(-Math.PI / 2), M.mosaic, 0, 0.012, C.z);
    KQ.deco(new THREE.TorusGeometry(7.6, 0.12, 6, 64).rotateX(Math.PI / 2), M.brass, 0, 0.02, C.z);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = Math.sin(a) * (DOME_R + 0.4);
      const z = C.z + Math.cos(a) * (DOME_R + 0.4);
      if (Math.abs(x) < 4.6 && z < C.z) continue;
      KQ.collider(x, 10, z, 3.8, 40, 3.8);
    }
    const domeGeo = uvScale(new THREE.SphereGeometry(DOME_R, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), 20, 6);
    const dome = new THREE.Mesh(domeGeo, M.glass);
    dome.position.copy(P(0, 6, C.z));
    dome.renderOrder = 2;
    zg.Q.add(dome);
    const wallG = uvScale(new THREE.CylinderGeometry(DOME_R, DOME_R, 6, 40, 1, true), 30, 1.5);
    const wall = new THREE.Mesh(wallG, M.glass);
    wall.position.copy(P(0, 3, C.z));
    wall.renderOrder = 2;
    zg.Q.add(wall);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(DOME_R, 0.15, 6, 24, Math.PI / 2), M.iron);
      rib.position.copy(P(0, 6, C.z));
      rib.rotation.set(0, a, Math.PI / 2);
      rib.rotation.order = 'YXZ';
      zg.Q.add(rib);
      KQ.deco(new THREE.BoxGeometry(0.25, 6, 0.25), M.iron, Math.sin(a) * DOME_R, 3, C.z + Math.cos(a) * DOME_R);
    }
    // the glass is choked with brambles until she withers
    const choke = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      // not across the doorway
      if (Math.abs(a - Math.PI) < 0.45) continue;
      const pts = [];
      const rr = DOME_R * 0.96;
      [0, 2, 4, 6].forEach((y, k) => pts.push(P(Math.sin(a + k * 0.04) * rr, y, C.z + Math.cos(a + k * 0.04) * rr)));
      for (let k = 1; k <= 6; k++) {
        const el = (k / 6) * (0.9 + (i % 3) * 0.15);
        const az = a + 0.16 + k * 0.07 + Math.sin(k * 1.7 + i) * 0.05;
        pts.push(P(Math.sin(az) * rr * Math.cos(el), 6 + rr * Math.sin(el), C.z + Math.cos(az) * rr * Math.cos(el)));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.32, 6), M.thorn);
      zg.Q.add(m);
      choke.push(m);
    }
    makeBoss();
    boss.choke = choke;
    // the roses at her roots get a stone ring each
    ['r1', 'r2', 'r3'].forEach((id) => {
      const d = BUD_DEFS.find((x) => x[0] === id);
      KQ.deco(new THREE.TorusGeometry(1.6, 0.18, 8, 32).rotateX(Math.PI / 2), M.stone, d[4], 0.1, d[6]);
    });
    // after her: a field of flowers, a giant rose, the card, the heart of the voyage
    const bf = [];
    const brr = rng(91);
    for (let i = 0; i < 420; i++) {
      const r = 3 + Math.sqrt(brr()) * (DOME_R - 4);
      const a = brr() * Math.PI * 2;
      bf.push([Math.sin(a) * r, 0, C.z + Math.cos(a) * r, 0.7 + brr() * 0.6, brr() * 6]);
    }
    const flowerGeo = mergeGeos([
      new THREE.CylinderGeometry(0.03, 0.04, 0.7, 4).translate(0, 0.35, 0),
      ...[0, 1, 2, 3, 4].map((k) => new THREE.SphereGeometry(0.11, 6, 4).scale(1, 0.4, 1.6).translate(0, 0.72, 0.13).rotateY((k / 5) * Math.PI * 2)),
    ]);
    bloomField = [
      ['#c8406a', 0],
      ['#d89a18', 1],
      ['#8a4ac0', 2],
      ['#d8c8d0', 3],
    ].map(([col, k]) => {
      const list = bf.filter((_, i) => i % 4 === k);
      const im = instanced('Q', flowerGeo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }), list);
      im.visible = false;
      im.userData.list = list;
      return im;
    });
    bigRose = makeRose(4.2, '#e04a74', false);
    bigRose.g.position.copy(P(C.x, -9, C.z));
    zg.Q.add(bigRose.g);
    card = LvKit.trialCard('h6', true);
    card.position.copy(P(C.x, 3.4, C.z));
    zg.Q.add(card);
    bloomHeart = Heart.galaxy(5000, 0.42, 66);
    bloomHeart.group.position.copy(P(C.x, 12, C.z));
    bloomHeart.U.uForm.value = 0;
    bloomHeart.core.material.opacity = 0;
    bloomHeart.group.visible = false;
    zg.Q.add(bloomHeart.group);
    T.bloomPollen = particles('Q', [-20, 20, 0.5, 10, C.z - 20, C.z + 20], 300, T.soft, '#ffd77a', 0.16, -0.12, 0.5, 0, true);

    // butterflies
    const bc = ['#f2a4c0', '#f2c23a', '#9fd8ff', '#b07ae0'];
    for (let i = 0; i < 8; i++) butterfly('A', P(-6 + (i % 4) * 4, 2.2, 6 + i * 8), 2.5, bc[i % 4], i);
    for (let i = 0; i < 4; i++) butterfly('S', P(-8 + i * 5, 2.5, 145 + (i % 2) * 24), 2.2, bc[i % 4], 10 + i);
    for (let i = 0; i < 14; i++) {
      const b = butterfly('Q', P(Math.sin(i) * 12, 2.5, C.z + Math.cos(i) * 12), 3.5, bc[i % 4], 20 + i);
      b.bloom = true;
      b.g.visible = false;
    }
    T.dust = particles('A', [-12, 12, 0.5, 9, 0, 74], 160, T.soft, '#ffe6b0', 0.12, -0.05, 0.3, 0.6, true);

    // ----- buds -----
    BUD_DEFS.forEach(([id, kind, req, stage, x, y, z, need]) => {
      const b = { id, kind, req, stage, pos: P(x, y, z), need, prog: 0, grown: false, k: 0, w: 0, l: 0, cols: [], setGrow: () => {} };
      buds[id] = b;
    });
    Object.values(buds).forEach((b) => budMarker(zoneOfZ(rel(b.pos).z), b));
    vineBridge(buds.vine);
    [0, 1, 2].forEach((i) => lilyPad(buds['lily' + (i + 1)], i));
    bloomFlower(buds.bloom);
    makeSunflower(buds.sun);
    dandelion(buds.dand);
    beanstalk(buds.bean1, buds.bean2);
    mushrooms(buds.mush);
    ICE.forEach((_, i) => iceFloe(buds['ice' + i], i));
    // the frozen rose: a block of ice around a bud; the same rose blooms afterwards
    const wr = makeRose(0.9, '#d8406a');
    wr.g.position.copy(P(0, 1.45, 328.6));
    zg.W.add(wr.g);
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.4, 1.9), M.ice.clone());
    block.position.copy(P(0, 1.2, 328.6));
    zg.W.add(block);
    KZ.W.collider(0, 0.6, 328.6, 1.9, 1.2, 1.9);
    buds.wice.block = block;
    buds.wice.setGrow = (k) => {
      block.scale.set(1 - k * 0.6, Math.max(0.01, 1 - k), 1 - k * 0.6);
      block.position.y = O.y + 1.2 * (1 - k);
      block.visible = k < 0.99;
    };
    buds.wrose.rose = wr;
    buds.wrose.setGrow = (k) => wr.setOpen(k);
    ['r1', 'r2', 'r3'].forEach((id) => {
      const r = makeRose(1.1, '#e04a74');
      r.g.position.copy(buds[id].pos).add(V3(0, 1.75, 0));
      zg.Q.add(r.g);
      r.g.scale.setScalar(0.4);
      buds[id].rose = r;
      buds[id].setGrow = (k) => {
        r.g.scale.setScalar(0.4 + k * 0.7);
        r.setOpen(k);
      };
    });
    Object.values(buds).forEach((b) => b.setGrow(0));

    // ----- the tools: the little sun and the watering can -----
    const lamp = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(0.85) }));
    const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: '#c19a52', wireframe: true, roughness: 0.4 }));
    const halo = sprite(T.soft, '#ffc870', 0.7, 0.22);
    lamp.add(core, cage, halo);
    root.add(lamp);
    lampLight = new THREE.PointLight('#ffd9a0', 0.8, 8, 2);
    lamp.add(lampLight);
    const can = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.32, 14), M.copper);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 6), M.copper);
    spout.position.set(0, 0.06, 0.28);
    spout.rotation.x = 1.0;
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.06, 10), M.brass);
    rose.position.set(0, 0.26, 0.48);
    rose.rotation.x = 1.0;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 16, Math.PI), M.copper);
    handle.position.set(0, 0.16, -0.02);
    handle.rotation.y = Math.PI / 2;
    const level = new THREE.Mesh(new THREE.CircleGeometry(0.15, 14).rotateX(-Math.PI / 2), M.water);
    level.position.y = 0.12;
    can.add(body, spout, rose, handle, level);
    root.add(can);
    tools.lamp = lamp;
    tools.can = can;
    tools.canLevel = level;
    tools.halo = halo;
    // the water: a stream of drops along an arc; the light: a soft cone
    const N = 56;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const stream = new THREE.Points(
      sg,
      new THREE.PointsMaterial({ map: T.drop, color: '#a6d8ff', size: 0.2, transparent: true, depthWrite: false, opacity: 0.9 }),
    );
    stream.frustumCulled = false;
    stream.visible = false;
    root.add(stream);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.9, 1, 20, 1, true).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ map: T.beam, color: new THREE.Color('#ffd27a').multiplyScalar(0.55), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.visible = false;
    root.add(beam);
    const beamSpot = sprite(T.soft, '#ffcf7a', 2.2, 0.45);
    beamSpot.visible = false;
    root.add(beamSpot);
    tools.stream = stream;
    tools.beam = beam;
    tools.beamSpot = beamSpot;
  };

  // ---------- per-frame ----------
  const zoneVis = (pz) => {
    Object.entries(ZONES).forEach(([k, [z0, z1]]) => {
      zg[k].visible = pz > z0 - 40 && pz < z1 + 40;
    });
  };
  const waterArc = (from, to, t) => {
    const a = tools.stream.geometry.attributes.position.array;
    const n = a.length / 3;
    const d = from.distanceTo(to);
    const h = 0.5 + d * 0.12;
    for (let i = 0; i < n; i++) {
      const u = ((i / n + t * 1.6) % 1 + 1) % 1;
      const j = Math.sin(i * 12.9898) * 0.06;
      a[i * 3] = from.x + (to.x - from.x) * u + j;
      a[i * 3 + 1] = from.y + (to.y - from.y) * u + 4 * h * u * (1 - u) + j;
      a[i * 3 + 2] = from.z + (to.z - from.z) * u + Math.cos(i * 7.1) * 0.06;
    }
    tools.stream.geometry.attributes.position.needsUpdate = true;
  };
  const update = (dt, t, st) => {
    if (!built) return;
    const me = rel(st.me);
    zoneVis(me.z);
    waters.forEach((w) => (w.offset.x = (w.offset.x + dt * 0.01) % 1));
    // buds: the ring, the halves of water and light, and the sprout trembling while it grows
    Object.values(buds).forEach((b) => {
      const mk = b.marker;
      if (!mk || !zg[zoneOfZ(rel(b.pos).z)].visible) return;
      b.w = damp(b.w, st.water === b.id ? 1 : 0, 8, dt);
      b.l = damp(b.l, st.light === b.id ? 1 : 0, 8, dt);
      mk.rm.uniforms.uProg.value = b.grown ? 1 : b.prog;
      mk.rm.uniforms.uW.value = b.w;
      mk.rm.uniforms.uL.value = b.l;
      mk.rm.uniforms.uT.value = t;
      const active = !b.grown && st.stage === b.stage && (b.ok ? b.ok() : true);
      mk.ring.visible = active || (b.kind === 'ice' && st.stage === 8 && !b.grown);
      mk.g.visible = b.kind === 'rose' || b.kind === 'icebox' ? mk.ring.visible : !b.grown || b.kind === 'ice' ? !b.grown : false;
      if (b.kind === 'rose' || b.kind === 'icebox') mk.sprout.visible = false;
      mk.halo.material.opacity = b.w * b.l * (0.16 + 0.06 * Math.sin(t * 10));
      mk.sprout.rotation.z = Math.sin(t * 20) * 0.08 * b.w * b.l;
      mk.sprout.scale.setScalar(1 + b.prog * 0.6);
      // a visible growth (eased) and, once grown, the full plant
      const target = b.grown ? 1 : b.prog * 0.18;
      b.k = damp(b.k, target, b.grown ? 1.6 : 4, dt);
      if (b.kind === 'ice') b.k = b.grown ? Math.max(0.05, b.hp) : damp(b.k, 0, 6, dt);
      b.setGrow(b.k);
      // colliders only for a grown plant (ice: while it has not melted)
      const solid = b.grown && (b.kind !== 'ice' || b.hp > 0);
      b.cols.forEach((c) => (c.on = solid));
      if (b.kind === 'ice' && b.floe) {
        b.floe.material.opacity = 0.45 + b.hp * 0.4;
        b.floe.material.color.set(b.hp < 0.3 ? '#9ab8c8' : '#6a9ab4');
      }
    });
    // the bloom springboard squashes when it launches someone
    const bl = buds.bloom;
    if (bl.head) {
      bl.squash = Math.max(0, bl.squash - dt * 3);
      bl.head.scale.set(1 + bl.squash * 0.15, 1 - bl.squash * 0.35, 1 + bl.squash * 0.15);
    }
    // the sunflower turns to follow the light
    if (sunflower) {
      const a = st.sunA != null ? st.sunA : sunflower.a;
      sunflower.a = a;
      sunflower.pivot.rotation.y = a;
      const hx = SUN.pivot[0] + Math.sin(a) * SUN.arm;
      const hz = SUN.pivot[1] + Math.cos(a) * SUN.arm;
      sunflower.head.rotation.y = 0;
      const m = sunflower.mover;
      const on = buds.sun.grown && sunflower.grow > 0.95;
      m.box.on = on;
      const cx = O.x + hx;
      const cz = O.z + hz;
      const top = O.y + SUN.top;
      m.delta.set(cx - m.last.x, 0, cz - m.last.z);
      if (!m.on || !on) m.delta.set(0, 0, 0);
      m.on = on;
      m.last.set(cx, top, cz);
      m.box.min[0] = cx - 1.7;
      m.box.max[0] = cx + 1.7;
      m.box.min[2] = cz - 1.7;
      m.box.max[2] = cz + 1.7;
      m.box.min[1] = top - 0.4;
      m.box.max[1] = top;
    }
    // spring seeds: out when a gust blows
    seeds.forEach((s) => {
      const p = st.gust >= 0 ? seedAt(s.i, st.gust, tmp) : null;
      const m = s.mover;
      if (!p) {
        s.g.visible = false;
        s.box.on = false;
        m.on = false;
        m.delta.set(0, 0, 0);
        return;
      }
      const w = P(p.x, p.y, p.z);
      s.g.visible = true;
      s.g.position.copy(w).add(V3(0, -0.1, 0));
      s.g.rotation.y += dt * 0.6;
      const land = st.gust - s.i * 0.25 > SEED_REST + SEED_FLY;
      // resting on the edge: the seed glows, "step on me"
      const rest = st.gust - s.i * 0.25 > 0.9 && st.gust - s.i * 0.25 < SEED_REST;
      s.g.children[3].material.opacity = rest ? 0.3 + Math.sin(st.gust * 8) * 0.12 : 0.18;
      s.g.scale.setScalar(land ? clamp(1 - (st.gust - s.i * 0.25 - SEED_REST - SEED_FLY - SEED_LAND + 0.6) / 0.6, 0.05, 1) : 1);
      m.delta.set(w.x - m.last.x, w.y - m.last.y, w.z - m.last.z);
      if (!m.on) m.delta.set(0, 0, 0);
      m.on = true;
      m.last.copy(w);
      s.box.on = st.gust - s.i * 0.25 > 0.9;
      s.box.min[0] = w.x - 1.25;
      s.box.max[0] = w.x + 1.25;
      s.box.min[2] = w.z - 1.25;
      s.box.max[2] = w.z + 1.25;
      s.box.min[1] = w.y - 0.3;
      s.box.max[1] = w.y;
    });
    if (buds.dand.head) {
      buds.dand.head.fil.material.opacity = st.gust >= 0 && st.gust < 1 ? 0.25 : 0.6;
    }
    if (T.gustPetals) {
      T.gustPetals.m.material.opacity = st.wind;
      T.gustPetals.wind = st.wind * 6;
      T.springPetals.wind = st.wind * 3;
    }
    // doors
    Object.values(doors).forEach((d) => {
      d.open = damp(d.open, d.want, 2.5, dt);
      d.leaves.forEach(({ l, sd }) => (l.position.x = (sd * d.w) / 4 + sd * d.open * (d.w / 2 + 0.1)));
      d.b.on = d.open < 0.6;
    });
    // autumn: the holes show (and the leaves over them fade) only in the light of the little sun
    if (spot) {
      spot.visible = !!st.spot;
      if (st.spot) {
        spot.position.copy(st.spot).add(V3(0, 0.12, 0));
        spot.material.opacity = 0.55 + Math.sin(t * 4) * 0.05;
      }
    }
    holeCells.forEach((h) => {
      let k = 0;
      if (st.spot) {
        const d = Math.hypot(O.x + h.x - st.spot.x, O.z + h.z - st.spot.z);
        k = clamp((5.2 - d) / 1.8, 0, 1);
      }
      if (st.reveal) k = 1;
      h.k = damp(h.k, k, 6, dt);
      h.coverMats.forEach((m) => (m.opacity = 1 - h.k * 0.92));
      h.rim.material.opacity = h.k * (0.85 + Math.sin(t * 5) * 0.15);
    });
    // winter: the ice wall melts when the frozen rose blooms
    if (iceWall) {
      const k = st.wallMelt || 0;
      iceWall.scale.set(1, Math.max(0.01, 1 - k), 1);
      iceWall.position.y = O.y + 3 * (1 - k);
      iceWall.visible = k < 0.99;
      iceWall.userData.b.on = k < 0.5;
    }
    // particles and butterflies (only the visible zones)
    fx.forEach((s) => zg[s.zone].visible && s.update(dt, t));
    butterflies.forEach((b) => {
      if (!zg[b.zone].visible || !b.g.visible) return;
      const s = b.seed;
      const tt = t * 0.45 + s * 3;
      b.g.position.set(
        b.center.x + Math.sin(tt * 1.1) * b.rad + Math.sin(tt * 2.3) * 0.6,
        b.center.y + Math.sin(tt * 1.7) * 0.8,
        b.center.z + Math.cos(tt * 0.9) * b.rad,
      );
      b.g.rotation.y = Math.atan2(Math.cos(tt * 1.1) * 1.1, -Math.sin(tt * 0.9) * 0.9);
      const f = Math.sin(t * 18 + s) * 0.9;
      b.wings[0].rotation.z = f;
      b.wings[1].rotation.z = -f;
    });
    // rings glow while they can be used
    Object.values(RINGS).forEach((r) => {
      if (!r.halo) return;
      const on = st.rings && st.rings.includes(r);
      r.halo.material.opacity = on ? 0.35 + Math.sin(t * 3) * 0.12 : 0.08;
    });
    // the boss
    if (boss) bossTick(dt, t, st);
    if (card) {
      card.visible = st.stage >= 10 && st.bloom > 1.2;
      card.rotation.y = t * 0.8;
      card.position.y = O.y + 3.4 + Math.sin(t * 1.4) * 0.15;
    }
    if (screen) screen.update && screen.update(dt, t);
  };

  const bossTick = (dt, t, st) => {
    const B = boss;
    if (!zg.Q.visible) return;
    B.hurt = Math.max(0, B.hurt - dt * 1.5);
    B.cast = Math.max(0, B.cast - dt);
    const roses = st.roses || 0;
    // she withers rose after rose, then completely
    const w = st.stage >= 10 ? 1 : 0;
    B.withered = damp(B.withered, w, w ? 0.7 : 4, dt);
    const sway = Math.sin(t * 0.8) * 0.08;
    B.body.rotation.y = damp(B.body.rotation.y, B.face, 2, dt) + sway * 0.2;
    B.body.rotation.x = -B.hurt * 0.25 + B.cast * 0.08;
    B.body.position.y = -B.withered * 9;
    B.body.scale.setScalar(1 - B.withered * 0.4);
    B.arms.forEach((a, i) => {
      a.rotation.z = (i ? -1 : 1) * (Math.sin(t * 1.3 + i) * 0.12 + B.cast * 0.6);
      a.rotation.x = -B.cast * 0.5;
    });
    B.eyes.forEach((e) => (e.material.opacity = (0.65 + Math.sin(t * 6) * 0.2) * (1 - B.withered)));
    B.heart.scale.setScalar(1 + Math.sin(t * 3.2) * 0.06 + B.hurt * 0.25);
    B.heartGlow.material.opacity = 0.3 + B.hurt * 0.4 - B.withered * 0.3;
    const dead = new THREE.Color('#6a5a48');
    M.thorn.color.set('#7a5a48').lerp(dead, B.withered);
    // the bramble mass shrinks a third with each rose
    B.base.forEach((m, i) => {
      const gone = i % 3 < roses ? 1 : 0;
      m.scale.setScalar(Math.max(0.01, 1 - (gone ? 0.7 : 0) - B.withered * 0.3));
    });
    B.thorns.visible = B.withered < 0.9;
    B.cols.forEach((c) => (c.on = B.withered < 0.5));
    B.choke.forEach((m, i) => {
      m.visible = B.withered < 0.98;
      m.scale.setScalar(1 - B.withered * 0.98);
    });
    // lashes: a red strip, then the whip
    B.lashes.forEach((L) => {
      if (L.t < 0) {
        L.tel.material.opacity = 0;
        L.whip.visible = false;
        return;
      }
      L.t += dt;
      const tele = 1.25;
      L.tel.rotation.y = L.a;
      L.tel.scale.set(2.8, 1, 26);
      L.tel.material.opacity = L.t < tele ? (0.25 + 0.25 * Math.sin(L.t * 18)) * Math.min(1, L.t * 4) : Math.max(0, 0.5 - (L.t - tele) * 2);
      L.whip.visible = L.t >= tele - 0.15 && L.t < tele + 1.1;
      L.whip.rotation.y = L.a;
      const k = clamp((L.t - tele + 0.15) / 0.2, 0, 1);
      L.whip.position.y = O.y + 4 * (1 - k) + (L.t > tele + 0.7 ? (L.t - tele - 0.7) * 6 : 0);
      L.whip.rotation.x = -(1 - k) * 0.3;
      if (L.t > tele + 1.1) L.t = -1;
    });
    B.patches.forEach((Pt) => {
      if (Pt.t < 0) {
        Pt.tel.material.opacity = 0;
        Pt.pg.visible = false;
        return;
      }
      Pt.t += dt;
      Pt.tel.position.copy(P(Pt.x, 0.08, Pt.z));
      Pt.pg.position.copy(P(Pt.x, 0, Pt.z));
      Pt.tel.scale.setScalar(Pt.t < 1.5 ? 0.3 + (Pt.t / 1.5) * 0.7 : 1);
      Pt.tel.material.opacity = Pt.t < 1.5 ? 0.5 + Math.sin(Pt.t * 14) * 0.2 : Math.max(0, 0.25 - (Pt.t - 1.5) * 0.1);
      Pt.pg.visible = Pt.t >= 1.4;
      const grow = clamp((Pt.t - 1.4) / 0.35, 0, 1) * clamp((8.6 - Pt.t) / 0.6, 0, 1);
      Pt.pg.scale.set(1, Math.max(0.01, grow), 1);
      if (Pt.t > 8.6 || st.stage >= 10) Pt.t = -1;
    });
    const Rg = B.ring;
    if (Rg.t >= 0) {
      Rg.t += dt;
      Rg.tel.material.opacity = Rg.t < 1.2 ? 0.4 + Math.sin(Rg.t * 16) * 0.25 : 0;
      Rg.wave.visible = Rg.t >= 1.2;
      const r = ringRadius(Rg.t);
      Rg.wave.scale.set(r, 1, r);
      if (Rg.t > 1.2 + RING_DUR || st.stage >= 10) {
        Rg.t = -1;
        Rg.wave.visible = false;
        Rg.tel.material.opacity = 0;
      }
    }
    // the bloom: flowers everywhere, the giant rose rising, the heart above
    const bk = st.stage >= 10 ? st.bloom || 0 : 0;
    bloomField.forEach((im, i) => {
      im.visible = bk > 0.2 + i * 0.25;
    });
    bloomField.forEach((im) => {
      if (!im.visible) return;
      const s = clamp(bk - 0.2, 0, 1);
      im.scale.set(1, s, 1);
    });
    butterflies.forEach((b) => b.bloom && (b.g.visible = bk > 1));
    T.bloomPollen.m.material.opacity = clamp(bk - 0.5, 0, 0.8);
    bigRose.g.position.y = O.y - 9 + clamp(bk / 1.6, 0, 1) * 9 - 0.6;
    bigRose.setOpen(clamp((bk - 0.8) / 1.5, 0, 1));
    bigRose.g.rotation.y = t * 0.1;
    bigRose.g.visible = bk > 0.05;
    bloomHeart.group.visible = bk > 0.8;
    if (bloomHeart.group.visible) {
      bloomHeart.U.uTime.value = t;
      bloomHeart.U.uPx.value = R.renderer.getPixelRatio() * 0.4;
      bloomHeart.U.uForm.value = Math.min(1, (bk - 0.8) * 0.5);
      bloomHeart.core.material.opacity = Math.min(1, bk - 0.8) * 0.08;
      bloomHeart.group.rotation.y = t * 0.15;
    }
  };
  const RING_DUR = 2.4;
  const ringRadius = (t) => 3.5 + clamp((t - 1.2) / RING_DUR, 0, 1) * (DOME_R - 3.5);

  // ---------- queries ----------
  const at = (zone, q) => {
    switch (zone) {
      case 'A1':
        return q.z > 29.3 && q.z < 40 && q.y > -0.4;
      case 'A2':
        return q.z > 62.3 && q.z < 74 && q.y > -0.4;
      case 'T1':
        return q.z > 74 && q.z < 96 && q.y > 5.5;
      case 'LOB':
        return q.z > 129 && q.z < 140.5 && q.y < 4;
      case 'SPF':
        return q.z > 166.2 && q.z < 177 && q.y > -0.4;
      case 'SUT':
        return q.z > 205.5 && q.y > 8.5;
      case 'AUL':
        return q.z > 265.8 && q.y > 4.5;
      case 'WIF':
        return q.z > 320 && q.y > -0.4;
      case 'ISL':
        return q.z > 302 && q.z < 308 && q.y > -0.4;
      case 'DOME':
        return Math.hypot(q.x - C.x, q.z - C.z) < DOME_R - 1.5;
      default:
        return false;
    }
  };
  const SPAWN = {
    1: [[-2, 0, 4.5], [2, 0, 4.5]],
    2: [[-2, 0, 33], [2, 0, 33]],
    3: [[-2, 0, 65], [2, 0, 65]],
    4: [[-3, 6, 86], [3, 6, 86]],
    5: [[-3, 0, 143.5], [3, 0, 143.5]],
    6: [[-3, 0, 183], [3, 0, 183]],
    7: [[-3, 0, 239.6], [3, 0, 239.6]],
    8: [[6, 0, 286.5], [-3, 0, 286.5]],
    9: [[-2, 0, 337], [2, 0, 337]],
    10: [[-3, 0, C.z - 14], [3, 0, C.z - 14]],
  };
  const spawn = (stage, who, sub = {}) => {
    const s = SPAWN[stage] || SPAWN[1];
    let p = s[who === 'dame' ? 0 : 1];
    if (sub.t2) p = who === 'dame' ? [-3, 6, 116] : [3, 6, 116];
    if (sub.springFar) p = who === 'dame' ? [-3, 0, 170] : [3, 0, 170];
    if (sub.island) p = who === 'dame' ? [8, 0, 305] : [-2, 0, 305];
    if (sub.top) p = who === 'dame' ? [-2, 5, 269] : [2, 5, 269];
    if (sub.arena) p = who === 'dame' ? [-5, 0, C.z - 17] : [5, 0, C.z - 17];
    return P(p[0], p[1], p[2]);
  };
  const ringsFor = (stage, sub = {}) =>
    Object.values(RINGS).filter((r) => r.stage === stage && (stage !== 4 || buds.sun.grown));
  const grappleLand = (q) => {
    let best = null;
    let bd = 6;
    Object.values(RINGS).forEach((r) => {
      const d = Math.hypot(q.x - r.pos[0], q.y - r.pos[1], q.z - r.pos[2]);
      if (d < bd) {
        bd = d;
        best = r;
      }
    });
    return best ? P(...best.land) : null;
  };
  // the head of the sunflower can be lit from anywhere you see it
  const sunHead = (out = V3()) => {
    const a = sunflower ? sunflower.a : Math.PI;
    return out.copy(P(SUN.pivot[0] + Math.sin(a) * SUN.arm, SUN.top + 0.4, SUN.pivot[1] + Math.cos(a) * SUN.arm));
  };
  const sunAngleFor = (lampPos) => {
    let a = Math.atan2(lampPos.x - (O.x + SUN.pivot[0]), lampPos.z - (O.z + SUN.pivot[1]));
    // the head swings over the +x side only: from the terrace (pi) to the far side (0)
    if (a < 0) a = a < -Math.PI / 2 ? Math.PI : 0;
    return a;
  };
  const nearFountain = (q) => Math.hypot(q.x + 5, q.z - 185) < 2.8 || (Math.hypot(q.x + 1.2, q.z - 200.5) < 1.6 && q.y > 4);
  const inHole = (q) => holeCells.some((h) => Math.abs(q.x - h.x) < 1.5 && Math.abs(q.z - h.z) < 1.5);
  const ringPos = (t) => ringRadius(t);

  return {
    O,
    P,
    rel,
    C,
    DOME_R,
    ROSE_R,
    SEED_TOTAL: SEED_REST + SEED_FLY + SEED_LAND + 0.6,
    RING_DUR,
    build,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
    },
    update,
    buds,
    doors,
    movers,
    tools,
    RINGS,
    get boss() {
      return boss;
    },
    get screen() {
      return screen;
    },
    get sunflower() {
      return sunflower;
    },
    get lampLight() {
      return lampLight;
    },
    holeCells,
    at,
    spawn,
    ringsFor,
    grappleLand,
    sunHead,
    sunAngleFor,
    nearFountain,
    inHole,
    ringPos,
    seedAt,
  };
})();
