// ♣ 10 · La Tour de Babel. A stone tower on a mesa above Terre 39, in the storm, climbed floor by
// floor; each of you reads a script only the other can translate:
//  0. the parvis: the gate's inscription and its six levers
//  1. the hall of bells (a ringing order)
//  2. the hall of rings (three rings turned to a sentence, with its grammar)
//  3. the terrace in the wind: two drawbridges, two inscriptions read at the same time
//  4. the lift up the split tower, under the lightning: read, translate and pull before the bolt
//  5. the crown opens toward the rift
// Geometry, visuals and pure helpers only; the rules live in js/levels/tr_c10.js.
const C10 = (() => {
  const O = V3(3500, 0, 12600);
  const root = new THREE.Group();
  root.visible = false;
  root.userData.noCull = true;
  R.scene.add(root);
  // what follows the camera (rain, cloud dome, bolts) is never culled
  const wx = new THREE.Group();
  wx.visible = false;
  wx.userData.noCull = true;
  R.scene.add(wx);
  const K = LvKit.builder(O, root);
  const P = K.P;
  const rel = K.rel;
  let built = false;

  // ---------- layout (relative to O) ----------
  // lower tower: outer half 11, inner 9.8; floors every 10 m (F3 = the open terrace)
  const LT = 11;
  const IN = 9.8;
  const FY = [0, 10, 20, 30];
  // the upper tower (the lift and the crown), split from the lower one by the storm
  const UT = { x0: -7, x1: 7, z0: 18, z1: 32, top: 72 };
  const LIFT = { x: 0, z: 25, h: 3, base: 30, step: 7, n: 6 };
  const liftYOf = (k) => LIFT.base + LIFT.step * k;
  // the gates at the foot of each stair (1: hall → bells, 2: bells → rings, 3: rings → terrace)
  const GATES = {
    1: { x: -8.7, z: 7.4, y: 0, ax: 'x', w: 2.2 },
    2: { x: 8.7, z: -7.4, y: 10, ax: 'x', w: 2.2 },
    3: { x: 7.4, z: -6.1, y: 20, ax: 'z', w: 2.4 },
  };
  // the six levers of the gate (parvis), the six bells, the three rings and their cranks
  const LEV0 = [-8.2, -6.2, -4.2, 4.2, 6.2, 8.2].map((x) => [x, 0, -13.6]);
  const BELLS = [0, 1, 2, 3, 4, 5].map((i) => {
    // west half (dame) then east half (valet), on a ring around the hall
    const a = [-150, -90, -30, 30, 90, 150][i] * (Math.PI / 180);
    return [Math.sin(a) * 5.4, 10, Math.cos(a) * 4.2 - 0.6];
  });
  const RINGS = { x: 0, z: 1.2, r: 2.2, y: [24.2, 23.0, 21.8] };
  const CRANKS = [
    [-3.4, 20, -3.6],
    [0, 20, -4.2],
    [3.4, 20, -3.6],
  ];
  const CHECK = [-6.6, 20, -2.2];
  const PLATES = {
    dame: { x: -5, z: -4.4 },
    valet: { x: 3.6, z: -4.4 },
    r: 2.05,
  };
  const BRIDGE = { dame: -4, valet: 4, z0: 11, z1: 18, w: 2.2 };
  const STELE = {
    s0: { p: [0, 7.7, -11.12], ry: Math.PI, w: 4.0, h: 2.2 },
    s1: { p: [0, 14.6, 0], ry: 0, w: 2.6, h: 1.4, two: true },
    s2: { p: [-9.65, 23.4, 1.2], ry: Math.PI / 2, w: 3.2, h: 2.6 },
    s3d: { p: [-5, 32.1, -10.0], ry: 0, w: 2.6, h: 1.3 },
    s3v: { p: [3.6, 32.1, -10.0], ry: 0, w: 2.6, h: 1.3 },
  };
  const CROWN = V3(0, 72, 25);
  const RIFT = V3(0, 128, 70);

  // ---------- the two scripts: glyphs = a frame and a mark (8 x 6), pictures (8) ----------
  // SVG paths in a 100 x 100 box: the HUD draws them as SVG, the stone as Path2D on a canvas
  const FRAMES = [
    'M50 12 A38 38 0 1 1 49.9 12 Z',
    'M50 8 L92 84 L8 84 Z',
    'M14 14 H86 V86 H14 Z',
    'M50 5 L94 50 L50 95 L6 50 Z',
    'M16 92 V50 A34 34 0 0 1 84 50 V92',
    'M16 8 V50 A34 34 0 0 0 84 50 V8',
    'M28 6 V94 M72 6 V94',
    'M50 6 L89 28 V72 L50 94 L11 72 V28 Z',
  ];
  // [stroke path, dots]: none, dot, bar, two dots, cross, upright stroke
  const MARKS = [
    ['', []],
    ['', [[50, 56]]],
    ['M33 56 H67', []],
    ['', [[38, 56], [62, 56]]],
    ['M40 46 L60 66 M60 46 L40 66', []],
    ['M50 38 V72', []],
  ];
  const NG = FRAMES.length * MARKS.length;
  const PICS = [
    { f: ['M64 10 A42 42 0 1 0 92 68 A34 34 0 1 1 64 10 Z'] },
    { f: ['M50 31 A19 19 0 1 1 49.9 31 Z'], s: 'M50 4V18 M50 82V96 M4 50H18 M82 50H96 M17 17L27 27 M73 73L83 83 M83 17L73 27 M27 73L17 83' },
    { f: ['M50 5 L61 38 L96 38 L68 59 L79 93 L50 72 L21 93 L32 59 L4 38 L39 38 Z'] },
    { f: ['M50 90 C20 68 5 52 5 32 C5 16 17 7 30 7 C40 7 47 13 50 21 C53 13 60 7 70 7 C83 7 95 16 95 32 C95 52 80 68 50 90 Z'] },
    { s: 'M8 50 A16 16 0 1 0 40 50 A16 16 0 1 0 8 50 M40 50 H94 M82 50 V68 M68 50 V64' },
    { s: 'M5 50 Q50 8 95 50 Q50 92 5 50 Z', f: ['M50 37 A13 13 0 1 1 49.9 37 Z'] },
    { f: ['M60 3 L18 57 H46 L36 97 L84 39 H55 Z'] },
    { f: ['M8 82 L13 28 L31 52 L50 16 L69 52 L87 28 L92 82 Z'] },
  ];
  const STY = {
    rose: { c: '#ffc2d8', glow: '#ff4f8f', lw: 7.5, join: 'round', hud: '#ff9cc0' },
    gold: { c: '#ffe6ac', glow: '#ffa21e', lw: 7, join: 'miter', hud: '#ffd27a' },
  };
  const gSvg = (id, style, size = 40) => {
    const s = STY[style];
    const [mp, dots] = MARKS[id % MARKS.length];
    const fr = FRAMES[Math.floor(id / MARKS.length)];
    return `<svg viewBox="-6 -6 112 112" width="${size}" height="${size}"><g fill="none" stroke="${s.hud}" stroke-width="${s.lw}" stroke-linecap="${s.join === 'round' ? 'round' : 'square'}" stroke-linejoin="${s.join}"><path d="${fr}"/>${mp ? `<path d="${mp}"/>` : ''}</g>${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${s.hud}"/>`).join('')}</svg>`;
  };
  const pSvg = (k, size = 30, color = '#f1dcc0') => {
    const p = PICS[k];
    return `<svg viewBox="-4 -4 108 108" width="${size}" height="${size}">${(p.f || []).map((d) => `<path d="${d}" fill="${color}"/>`).join('')}${p.s ? `<path d="${p.s}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</svg>`;
  };
  // "en face": two arrows facing each other across a circle
  const faceSvg = (size = 30, color = '#f1dcc0') =>
    `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="30" stroke-dasharray="6 10"/><path d="M50 4 V30 M40 20 L50 30 L60 20 M50 96 V70 M40 80 L50 70 L60 80"/></svg>`;
  const P2 = {};
  const path2 = (d) => P2[d] || (P2[d] = new Path2D(d));
  const drawGlyph = (g, id, cx, cy, size, style, a = 1) => {
    const s = STY[style];
    const [mp, dots] = MARKS[id % MARKS.length];
    const fr = FRAMES[Math.floor(id / MARKS.length)];
    g.save();
    g.translate(cx - size / 2, cy - size / 2);
    g.scale(size / 100, size / 100);
    g.globalAlpha = a;
    g.lineWidth = s.lw;
    g.lineCap = s.join === 'round' ? 'round' : 'square';
    g.lineJoin = s.join;
    g.strokeStyle = s.c;
    g.fillStyle = s.c;
    g.shadowColor = s.glow;
    for (const blur of [26, 10]) {
      g.shadowBlur = blur * (size / 100);
      g.stroke(path2(fr));
      if (mp) g.stroke(path2(mp));
      dots.forEach(([x, y]) => {
        g.beginPath();
        g.arc(x, y, 6.5, 0, TAU);
        g.fill();
      });
    }
    g.restore();
  };
  const drawPic = (g, k, cx, cy, size, color) => {
    const p = PICS[k];
    g.save();
    g.translate(cx - size / 2, cy - size / 2);
    g.scale(size / 100, size / 100);
    g.fillStyle = g.strokeStyle = color;
    g.lineWidth = 8;
    g.lineCap = g.lineJoin = 'round';
    (p.f || []).forEach((d) => g.fill(path2(d)));
    if (p.s) g.stroke(path2(p.s));
    g.restore();
  };
  // ---------- scanned materials (Poly Haven, this level only, procedural until they arrive) ----------
  // Tex.mat gives the triplanar shader and the procedural maps of the kind; this material then
  // binds its own maps, so the scans never leak into the other levels using the same kind
  const scans = [];
  const scan = (kind, id, opt = {}) => {
    const m = Tex.mat(kind, Object.assign({ c10: id }, opt));
    if (!m.userData.tri || m.userData.c10) return m;
    // the kind's own procedural maps stand in (not a scan another world may have put on the kind)
    const T = Tex.build(kind);
    const U = { tAlb: { value: T.albedo }, tDat: { value: T.data }, triMul: { value: 1 }, triNrm: { value: 0 } };
    m.userData.c10 = U;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      Object.assign(sh.uniforms, U);
    };
    scans.push({ id, U });
    return m;
  };
  const loadScans = () => {
    const ids = [...new Set(scans.map((s) => s.id))];
    ids.forEach((id) => {
      Promise.all([Assets.get(id + '.alb'), Assets.get(id + '.nrm')])
        .then(([a, d]) => {
          [a, d].forEach((t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
            t.needsUpdate = true;
          });
          scans.filter((s) => s.id === id).forEach(({ U }) => {
            U.tAlb.value = a;
            U.tDat.value = d;
            U.triNrm.value = 1;
          });
        })
        .catch(() => {});
    });
  };

  const M = {};
  const glow = LvKit.glow;
  const makeMats = () => {
    M.stone = scan('stone', 'tex.c10stone', { color: '#c9beb0', scale: 2.6, bump: 1.2 });
    M.stoneDark = scan('stone', 'tex.c10stone', { color: '#6e6660', scale: 5, bump: 1.4 });
    M.stoneLit = scan('stone', 'tex.c10stone', { color: '#e0d2bf', scale: 2.2, bump: 1 });
    M.brick = scan('brick', 'tex.c10brick', { color: '#d6b4a0', scale: 2.4, bump: 1.1 });
    M.wood = scan('wood', 'tex.wood', { color: '#d9b493', scale: 2.2, bump: 0.9 });
    M.beam = scan('wood', 'tex.wood', { color: '#8a6a50', scale: 1.6, bump: 0.8 });
    M.metal = scan('metal', 'tex.c10metal', { color: '#9fb5a0', scale: 1.4, rough: 0.9, metal: 0.55, bump: 0.7 });
    M.bronze = scan('metal', 'tex.c10metal', { color: '#c9a070', scale: 1.1, rough: 0.7, metal: 0.75, bump: 0.6 });
    M.iron = new THREE.MeshStandardMaterial({ color: '#3a3a42', roughness: 0.5, metalness: 0.7 });
    // no environment map out here: the metals get the assets' small studio light, else they read black
    [M.metal, M.bronze, M.iron].forEach((m) => Assets.envify(m, 0.7));
    M.rope = new THREE.MeshStandardMaterial({ color: '#8a7058', roughness: 0.95 });
    M.rose = new THREE.MeshStandardMaterial({ color: '#c8406e', roughness: 0.6, emissive: '#5a0c28' });
    M.gold = new THREE.MeshStandardMaterial({ color: '#d8a03c', roughness: 0.5, metalness: 0.4, emissive: '#4a2c04' });
    M.fire = glow('#ffb060', 2.2);
    M.ember = glow('#ff7a2a', 1.6);
    M.rune = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fd0ff').multiplyScalar(1.4), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  };

  // ---------- canvas textures ----------
  const T = {};
  const picTex = [];
  const picMat = { dame: [], valet: [], none: [] };
  const makePicTex = () => {
    PICS.forEach((p, k) => {
      picTex[k] = {};
      ['dame', 'valet', 'none'].forEach((own) => {
        const t = LvKit.tex(256, 256, (g) => {
          g.clearRect(0, 0, 256, 256);
          const gr = g.createRadialGradient(128, 128, 20, 128, 128, 124);
          gr.addColorStop(0, '#3a3430');
          gr.addColorStop(1, '#16120f');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(128, 128, 122, 0, TAU);
          g.fill();
          g.lineWidth = 10;
          g.strokeStyle = own === 'dame' ? '#ff6f9e' : own === 'valet' ? '#ffc04a' : '#bba58a';
          g.shadowColor = g.strokeStyle;
          g.shadowBlur = 14;
          g.beginPath();
          g.arc(128, 128, 112, 0, TAU);
          g.stroke();
          g.shadowColor = '#ffd9a0';
          g.shadowBlur = 16;
          drawPic(g, k, 128, 128, 150, '#f6e2c0');
        });
        picTex[k][own] = t;
        const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, side: THREE.DoubleSide });
        m.color.setScalar(0.95);
        picMat[own][k] = m;
      });
    });
  };
  const veilTex = () =>
    LvKit.tex(512, 256, (g) => {
      g.clearRect(0, 0, 512, 256);
      const r = rng(77);
      // worn marks nobody can read: the inscription is not for these eyes
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(150,170,190,${0.05 + r() * 0.12})`;
        g.lineWidth = 2 + r() * 5;
        g.beginPath();
        const x = 30 + r() * 452;
        const y = 30 + r() * 196;
        g.moveTo(x, y);
        g.quadraticCurveTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60, x + (r() - 0.5) * 80, y + (r() - 0.5) * 50);
        g.stroke();
      }
    });
  const windowsTex = () =>
    LvKit.tex(256, 256, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 256, 256);
      const r = rng(5);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 8; x++) {
          if (r() < 0.55) continue;
          const c = r() < 0.75 ? `rgba(255,${170 + r() * 60},${90 + r() * 60},1)` : `rgba(${150 + r() * 60},${190 + r() * 40},255,1)`;
          g.fillStyle = c;
          g.globalAlpha = 0.35 + r() * 0.65;
          g.fillRect(x * 32 + 8, y * 16 + 4, 16, 8);
        }
      g.globalAlpha = 1;
    });
  const softTex = () =>
    LvKit.tex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    });
  // a frieze of glyphs from an older, dead script (decor only: never in a lexicon)
  const friezeTex = () =>
    LvKit.tex(1024, 128, (g) => {
      g.clearRect(0, 0, 1024, 128);
      const r = rng(31);
      g.strokeStyle = '#cfefff';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.shadowColor = '#4ab0ff';
      g.shadowBlur = 10;
      for (let i = 0; i < 16; i++) {
        const x = 32 + i * 64;
        g.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = [x - 16 + r() * 32, 30 + r() * 68];
          const b = [x - 16 + r() * 32, 30 + r() * 68];
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
        g.stroke();
        if (r() < 0.5) {
          g.beginPath();
          g.arc(x, 64, 6 + r() * 14, 0, TAU);
          g.stroke();
        }
      }
    });

  // ---------- builders ----------
  const batches = {};
  const bat = (k) => batches[k] || (batches[k] = LvKit.batch());
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const put = (k, x, y, z, sx, sy, sz, rot) => bat(k).add(BOX, P(x, y, z), rot, [sx, sy, sz]);
  const col = (x, y, z, sx, sy, sz, opt) => K.collider(x, y, z, sx, sy, sz, opt);
  // box from corners (x0..x1, y0..y1, z0..z1)
  const cube = (k, x0, x1, y0, y1, z0, z1, c = true) => {
    put(k, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
    return c ? col((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0) : null;
  };
  // the parts of a wall rectangle a0..a1 x b0..b1 left around rectangular holes
  const split = (a0, a1, b0, b1, holes) => {
    const out = [];
    const hs = holes.filter((h) => h[1] > a0 && h[0] < a1).sort((p, q) => p[0] - q[0]);
    let a = a0;
    hs.forEach(([h0, h1, v0, v1]) => {
      if (h0 > a) out.push([a, h0, b0, b1]);
      if (v0 > b0) out.push([Math.max(a0, h0), Math.min(a1, h1), b0, v0]);
      if (v1 < b1) out.push([Math.max(a0, h0), Math.min(a1, h1), v1, b1]);
      a = Math.max(a, h1);
    });
    if (a < a1) out.push([a, a1, b0, b1]);
    return out;
  };
  // a wall along x at depth z0..z1 (holes in x / y), and one along z
  const wallX = (k, x0, x1, z0, z1, y0, y1, holes = [], pass = []) => {
    split(x0, x1, y0, y1, holes).forEach(([a, b, c, d]) => cube(k, a, b, c, d, z0, z1, false));
    split(x0, x1, y0, y1, pass).forEach(([a, b, c, d]) => col((a + b) / 2, (c + d) / 2, (z0 + z1) / 2, b - a, d - c, z1 - z0));
  };
  const wallZ = (k, z0, z1, x0, x1, y0, y1, holes = [], pass = []) => {
    split(z0, z1, y0, y1, holes).forEach(([a, b, c, d]) => cube(k, x0, x1, c, d, a, b, false));
    split(z0, z1, y0, y1, pass).forEach(([a, b, c, d]) => col((x0 + x1) / 2, (c + d) / 2, (a + b) / 2, x1 - x0, d - c, b - a));
  };
  // a floor slab minus one rectangular hole
  const slab = (k, x0, x1, z0, z1, y0, y1, hole) => {
    if (!hole) return cube(k, x0, x1, y0, y1, z0, z1);
    const [hx0, hx1, hz0, hz1] = hole;
    if (hz0 > z0) cube(k, x0, x1, y0, y1, z0, hz0);
    if (hz1 < z1) cube(k, x0, x1, y0, y1, hz1, z1);
    if (hx0 > x0) cube(k, x0, hx0, y0, y1, hz0, hz1);
    if (hx1 < x1) cube(k, hx1, x1, y0, y1, hz0, hz1);
  };
  // a straight flight of 25 steps (0.4 up, 0.52 along), solid down to its floor
  const flight = (axis, dir, a0, c0, c1, base) => {
    for (let i = 0; i < 25; i++) {
      const top = base + 0.4 * (i + 1);
      const s0 = a0 + dir * i * 0.52;
      const s1 = s0 + dir * 0.52;
      const lo = Math.min(s0, s1);
      const hi = Math.max(s0, s1);
      if (axis === 'x') {
        cube('stoneLit', lo, hi, base, top - 0.08, c0, c1);
        put('wood', (lo + hi) / 2, top - 0.04, (c0 + c1) / 2, hi - lo + 0.04, 0.08, c1 - c0);
      } else {
        cube('stoneLit', c0, c1, base, top - 0.08, lo, hi);
        put('wood', (c0 + c1) / 2, top - 0.04, (lo + hi) / 2, c1 - c0, 0.08, hi - lo + 0.04);
      }
      // the collider includes the tread
      if (axis === 'x') col((lo + hi) / 2, top - 0.04, (c0 + c1) / 2, hi - lo, 0.08, c1 - c0);
      else col((c0 + c1) / 2, top - 0.04, (lo + hi) / 2, c1 - c0, 0.08, hi - lo);
    }
  };
  const rail = (k, x0, x1, z0, z1, y) => cube(k, x0, x1, y, y + 1.1, z0, z1);

  // ---------- the storm: cloud dome, rain, bolts ----------
  const SH = { time: { value: 0 }, flash: { value: 0 } };
  const SKY = {};
  const makeSky = () => {
    const U = { uTime: SH.time, uFlash: SH.flash, uBolt: { value: V3(0, 1, 0) }, uRift: { value: V3(0, 0.6, 0.8).normalize() }, uOpen: { value: 0 } };
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(400, 40, 20),
      new THREE.ShaderMaterial({
        uniforms: U,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec3 vD;
          void main() {
            vD = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uTime, uFlash, uOpen;
          uniform vec3 uBolt, uRift;
          varying vec3 vD;
          float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
          }
          float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
          void main() {
            vec3 d = normalize(vD);
            float y = d.y;
            vec2 q = d.xz / (0.25 + max(y, 0.0)) * 1.2;
            // the storm turns around the tower
            float a = uTime * 0.02;
            q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
            float n = fbm(q * 1.1 + vec2(uTime * 0.03, uTime * 0.014));
            float n2 = fbm(q * 3.1 - vec2(uTime * 0.05, 0.0));
            float c = smoothstep(0.28, 0.85, n * 0.75 + n2 * 0.35);
            vec3 col = mix(vec3(0.03, 0.03, 0.05), vec3(0.11, 0.11, 0.16), c);
            // the city lights glowing on the cloud bellies, down near the horizon
            col += vec3(0.16, 0.09, 0.05) * pow(1.0 - clamp(abs(y), 0.0, 1.0), 6.0);
            // the rift: a pale pink seam in the clouds, above the crown
            float rf = pow(max(dot(d, uRift), 0.0), 90.0);
            col += vec3(1.0, 0.5, 0.72) * rf * (0.25 + uOpen * 1.2);
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.22 + 0.9 * c) * vec3(0.72, 0.76, 1.0) * (0.4 + 1.2 * near);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    m.renderOrder = -9;
    m.frustumCulled = false;
    wx.add(m);
    SKY.mesh = m;
    SKY.U = U;
  };
  const RAIN = {};
  // dry boxes [x0, z0, x1, z1] (world) under y: the lower tower's rooms
  const DRY = { box: new THREE.Vector4(), y: { value: 0 } };
  const makeRain = () => {
    const N = 7000;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const sd = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) sd[i] = Math.random();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4));
    g.instanceCount = N;
    const U = {
      uTime: SH.time,
      uFlash: SH.flash,
      uCam: { value: V3() },
      uBox: { value: V3(34, 26, 34) },
      uWind: { value: new THREE.Vector2(0, 0) },
      uAmt: { value: 1 },
      uDry: { value: DRY.box },
      uDryY: DRY.y,
    };
    const m = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        // the streaks turn to face the camera either way round
        side: THREE.DoubleSide,
        vertexShader: `
          attribute vec4 aSeed;
          uniform float uTime, uAmt, uDryY;
          uniform vec3 uCam, uBox;
          uniform vec2 uWind;
          uniform vec4 uDry;
          varying vec2 vUv;
          varying float vA;
          void main() {
            float sp = 17.0 * (0.85 + 0.3 * aSeed.w);
            float fall = fract(aSeed.z - uTime * sp / uBox.y);
            vec2 b = aSeed.xy * uBox.xz + uWind * ((1.0 - fall) * uBox.y / sp);
            vec3 p;
            p.y = uCam.y - uBox.y * 0.45 + fall * uBox.y;
            p.xz = uCam.xz + mod(b - uCam.xz + 0.5 * uBox.xz, uBox.xz) - 0.5 * uBox.xz;
            float dry = (p.x > uDry.x && p.x < uDry.z && p.z > uDry.y && p.z < uDry.w && p.y < uDryY) ? 1.0 : 0.0;
            float hide = step(uAmt, aSeed.w) + dry;
            vec3 dir = normalize(vec3(uWind.x, -sp, uWind.y));
            vec3 toC = cameraPosition - p;
            float dc = length(toC);
            vec3 side = normalize(cross(dir, toC / max(dc, 0.001)));
            float w = 0.014 + 0.0019 * dc;
            vec3 wp = p - dir * position.y * 1.1 * (0.7 + 0.6 * aSeed.w) + side * position.x * w;
            vUv = vec2(position.x + 0.5, position.y);
            vA = smoothstep(0.5, 2.2, dc) * (1.0 - smoothstep(13.0, 17.0, dc));
            gl_Position = hide > 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0);
          }`,
        fragmentShader: `
          uniform float uFlash;
          varying vec2 vUv;
          varying float vA;
          void main() {
            float a = vA * (1.0 - abs(vUv.x * 2.0 - 1.0)) * (1.0 - vUv.y * 0.7);
            vec3 c = mix(vec3(0.7, 0.75, 0.9), vec3(1.6, 1.65, 1.8), uFlash);
            gl_FragColor = vec4(c, a * (0.42 + uFlash * 0.4));
          }`,
      }),
    );
    m.frustumCulled = false;
    m.renderOrder = 5;
    wx.add(m);
    RAIN.mesh = m;
    RAIN.U = U;
  };
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
      const e = s.clone().add(V3((r() - 0.5) * len, -len * (0.4 + r() * 0.5), (r() - 0.5) * len));
      lines.push([jag(s, e, 4, 0.25), w * 0.55]);
    }
    const pos = [];
    const dir = V3();
    const s1 = V3();
    const s2 = V3();
    const UP = V3(0, 1, 0);
    lines.forEach(([pts, ww]) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        dir.copy(p1).sub(p0).normalize();
        s1.crossVectors(dir, Math.abs(dir.y) > 0.9 ? V3(1, 0, 0) : UP).normalize();
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
      const mk = (c, o) =>
        new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(o ? 1.2 : 3), transparent: true, opacity: o || 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }),
        );
      const core = mk('#e8e4ff');
      const halo = mk('#8a7aff', 0.3);
      core.visible = halo.visible = false;
      core.frustumCulled = halo.frustumCulled = false;
      wx.add(core, halo);
      bolts.push({ core, halo, t: -1, life: 0.5 });
    }
  };
  let flashV = 0;
  const flash = (k) => (flashV = Math.max(flashV, k));
  const bolt = (a, b, opt = {}) => {
    // a late message from the partner may still ask for one once the world is unloaded
    if (!built) return;
    const B = bolts.find((x) => x.t < 0) || bolts[0];
    const seed = (Math.random() * 1e6) | 0;
    B.core.geometry.dispose();
    B.halo.geometry.dispose();
    B.core.geometry = boltGeo(a, b, seed, opt.w || 0.14, opt.branches != null ? opt.branches : 2);
    B.halo.geometry = boltGeo(a, b, seed, (opt.w || 0.14) * 4, opt.branches != null ? opt.branches : 2);
    B.core.material.color.set(opt.pink ? '#ffd0e4' : '#e8e4ff').multiplyScalar(3);
    B.halo.material.color.set(opt.pink ? '#ff4a8a' : '#8a7aff').multiplyScalar(1.2);
    B.t = 0;
    B.life = opt.life || 0.55;
    B.core.visible = B.halo.visible = true;
    SKY.U.uBolt.value.copy(a).sub(R.camera.position).normalize();
    flash(opt.flash != null ? opt.flash : 1);
  };
  const tickBolts = (dt) => {
    bolts.forEach((B) => {
      if (B.t < 0) return;
      B.t += dt;
      const on = B.t < 0.07 || (B.t > 0.13 && B.t < 0.2) || (B.t > 0.27 && B.t < B.life);
      const k = on ? 1 - (B.t / B.life) * 0.6 : 0.15;
      B.core.material.opacity = k;
      B.halo.material.opacity = k * 0.3;
      if (B.t > B.life) {
        B.t = -1;
        B.core.visible = B.halo.visible = false;
      }
    });
  };

  // ---------- Terre 39 below: the mesa, the city lights far down ----------
  const city = () => {
    const wt = windowsTex();
    wt.repeat.set(1, 2);
    const N = 420;
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ map: wt, color: new THREE.Color('#ffffff').multiplyScalar(0.75), fog: false, toneMapped: false });
    const body = new THREE.MeshBasicMaterial({ color: '#07060a', fog: false });
    const inst = new THREE.InstancedMesh(geo, [mat, mat, body, body, mat, mat], N);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const r = rng(12);
    for (let i = 0; i < N; i++) {
      const a = r() * TAU;
      const d = 110 + Math.pow(r(), 0.7) * 420;
      const h = 12 + r() * r() * 70;
      const w = 10 + r() * 16;
      q.setFromAxisAngle(V3(0, 1, 0), r() * TAU);
      m4.compose(P(Math.sin(a) * d, -150, Math.cos(a) * d), q, V3(w, h, w * (0.6 + r() * 0.8)));
      inst.setMatrixAt(i, m4);
    }
    inst.frustumCulled = false;
    root.add(inst);
    // the streets: a dim warm grid, far below
    const st = LvKit.tex(512, 512, (g) => {
      g.fillStyle = '#040306';
      g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(255,170,90,0.55)';
      g.lineWidth = 3;
      for (let i = 0; i < 512; i += 64) {
        g.beginPath();
        g.moveTo(i + 8, 0);
        g.lineTo(i + 8, 512);
        g.moveTo(0, i + 8);
        g.lineTo(512, i + 8);
        g.stroke();
      }
    });
    st.repeat.set(16, 16);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: st, fog: false, color: new THREE.Color('#ffffff').multiplyScalar(0.5) }));
    ground.position.copy(P(0, -150.5, 0));
    root.add(ground);
    // the mesa: a column of rock under the parvis
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(45, 70, 150, 28, 6, true), M.stoneDark);
    const pa = mesa.geometry.attributes.position;
    const rr = rng(4);
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i);
      if (y > 74) continue;
      const k = 1 + (rr() - 0.5) * 0.16;
      pa.setX(i, pa.getX(i) * k);
      pa.setZ(i, pa.getZ(i) * k);
    }
    mesa.geometry.computeVertexNormals();
    mesa.position.copy(P(0, -75.2, 0));
    root.add(mesa);
  };

  // ---------- props ----------
  const lev0 = [];
  const bells = [];
  const rings = [];
  const cranks = [];
  const plates = { dame: [], valet: [] };
  const liftLev = [];
  const steles = {};
  const gates = {};
  const lights = [];
  const fires = [];
  let soft = null;
  let screen = null;
  let card = null;
  let gate0 = null;
  let check = null;
  let bridges = {};
  let lift = null;
  let petals = [];
  let rift = null;

  // a plaque with a picture (owner colour on the rim), facing ry
  const plaque = (own, size) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 32), picMat[own][0]);
    m.userData.own = own;
    return m;
  };
  const setPic = (m, k) => {
    m.material = picMat[m.userData.own][k];
    m.userData.pic = k;
  };
  const lever = (x, y, z, ry, own, parent = root, local = false, cage = false) => {
    const g = new THREE.Group();
    g.position.copy(local ? V3(x, y, z) : P(x, y, z));
    g.rotation.y = ry;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), M.stoneLit);
    base.position.y = 0.45;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.4), M.iron);
    slot.position.y = 0.92;
    const arm = new THREE.Group();
    arm.position.y = 0.92;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.85, 8).translate(0, 0.42, 0), M.metal);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), own === 'dame' ? M.rose : own === 'valet' ? M.gold : M.bronze);
    knob.position.y = 0.86;
    arm.add(rod, knob);
    arm.rotation.x = 0.6;
    // a board behind the lever carries its picture, at eye height
    // (in the lift's cage it hangs on the bars behind instead)
    const pl = plaque(own, 0.74);
    pl.position.set(0, cage ? 1.55 : 1.42, cage ? -0.38 : -0.115);
    g.add(base, slot, arm, pl);
    if (!cage) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.16), M.stone);
      board.position.set(0, 1.42, -0.2);
      g.add(board);
    }
    parent.add(g);
    return { g, arm, pl, k: 0, pull: 0 };
  };
  const BRZ = {
    leg: new THREE.CylinderGeometry(0.08, 0.14, 1.1, 8).translate(0, 0.55, 0),
    bowl: new THREE.CylinderGeometry(0.5, 0.25, 0.35, 16, 1, true).translate(0, 1.25, 0),
    coal: new THREE.CircleGeometry(0.45, 16).rotateX(-Math.PI / 2).translate(0, 1.36, 0),
  };
  const brazier = (x, y, z) => {
    // the iron and the coals join the merged meshes, only the flame is its own
    bat('iron').add(BRZ.leg, P(x, y, z));
    bat('metal').add(BRZ.bowl, P(x, y, z));
    bat('ember').add(BRZ.coal, P(x, y, z));
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color('#ff9a40').multiplyScalar(2), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    fl.position.copy(P(x, y + 1.75, z));
    fl.scale.set(1.0, 1.4, 1);
    root.add(fl);
    fires.push(fl);
    return fl;
  };
  // a stele: a stone frame and the glowing inscription plane (the level draws it per screen)
  const makeStele = (key, s) => {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = Math.round((1024 * s.h) / s.w);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const g = new THREE.Group();
    g.position.copy(P(...s.p));
    g.rotation.y = s.ry;
    const slabM = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.4, s.h + 0.4, 0.22), M.stoneDark);
    slabM.position.z = -0.12;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    plane.position.z = 0.012;
    plane.renderOrder = 6;
    g.add(slabM, plane);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshBasicMaterial({ map: T.veil, transparent: true, depthWrite: false }));
    veil.position.z = 0.013;
    g.add(veil);
    const planes = [plane];
    const veils = [veil];
    if (s.two) {
      [plane, veil].forEach((m, i) => {
        const back = m.clone();
        back.rotation.y = Math.PI;
        back.position.z = -0.252;
        g.add(back);
        (i ? veils : planes).push(back);
      });
    }
    root.add(g);
    const vis = (list) => ({ set visible(v) { list.forEach((m) => (m.visible = v)); } });
    steles[key] = { g, cv, tex, plane: vis(planes), veil: vis(veils), s, key: '' };
    return steles[key];
  };
  // draw an inscription: words = [[glyph, face?], ...], layout 'row' (in order) or 'lines' (rings)
  const inscribe = (cv, words, style, layout) => {
    const g = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    g.clearRect(0, 0, W, H);
    if (!words) return;
    if (layout === 'lines') {
      const n = words.length;
      const lh = H / n;
      words.forEach((w, i) => {
        const cy = lh * (i + 0.5);
        // which ring: three bars, this one lit
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k === i ? STY[style].c : 'rgba(255,255,255,0.18)';
          g.fillRect(W * 0.06, cy - lh * 0.24 + k * lh * 0.18, W * 0.1, lh * 0.1);
        }
        drawGlyph(g, w[0], W * 0.42, cy, lh * 0.72, style);
        if (w[1] != null) drawGlyph(g, w[1], W * 0.68, cy, lh * 0.62, style);
      });
      return;
    }
    const n = words.reduce((s, w) => s + (w[1] != null ? 1.7 : 1), 0);
    const cell = Math.min(H * 0.86, (W * 0.88) / (n + (words.length - 1) * 0.35));
    let x = (W - cell * (n + (words.length - 1) * 0.35)) / 2;
    words.forEach((w) => {
      drawGlyph(g, w[0], x + cell / 2, H / 2, cell * 0.92, style);
      x += cell;
      if (w[1] != null) {
        drawGlyph(g, w[1], x + cell * 0.35, H / 2, cell * 0.62, style);
        x += cell * 0.7;
      }
      x += cell * 0.35;
    });
  };
  // the stone shows the inscription only to its reader; anyone else sees worn marks
  const setStele = (key, words, style, layout, mine) => {
    const S = steles[key];
    if (!S) return;
    const k = JSON.stringify([words, style, layout, mine]);
    if (S.key === k) return;
    S.key = k;
    inscribe(S.cv, mine ? words : null, style, layout);
    S.tex.needsUpdate = true;
    S.plane.visible = !!(mine && words);
    S.veil.visible = !(mine && words);
    S.glow = mine && words ? 1 : 0;
  };

  // ---------- build ----------
  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) return;
    Phys.owner('tr_c10');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    makeMats();
    soft = softTex();
    T.veil = veilTex();
    T.frieze = friezeTex();
    makePicTex();
    M.frieze = new THREE.MeshBasicMaterial({ map: T.frieze, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    makeSky();
    makeRain();
    makeBolts();
    city();

    // ---- the parvis on the mesa ----
    const parvis = new THREE.Mesh(new THREE.CylinderGeometry(45.5, 45.5, 1.2, 40), M.stone);
    parvis.position.copy(P(0, -0.6, 0));
    root.add(parvis);
    col(0, -0.6, 0, 58, 1.2, 70);
    // ruined rim: blocks on the edge (and an invisible wall: the drop is long)
    const rr = rng(9);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      const h = 0.5 + rr() * 1.1;
      put('stoneDark', Math.sin(a) * 44.3, h / 2, Math.cos(a) * 44.3, 1.6 + rr() * 1.2, h, 1.2, [0, a, 0]);
    }
    col(-29.5, 1.5, 0, 1, 3, 70);
    col(29.5, 1.5, 0, 1, 3, 70);
    col(0, 1.5, -35.5, 58, 3, 1);
    col(0, 1.5, 35.5, 58, 3, 1);
    // the path to the gate: flagstones and two rows of broken columns
    for (let z = -32; z < -12; z += 2.2) put('stoneLit', 0, 0.04, z, 4.2, 0.1, 2.0);
    [-1, 1].forEach((s) => {
      for (let z = -30; z < -14; z += 5.5) {
        const h = 2 + rr() * 4;
        cube('stone', s * 4.6 - 0.45, s * 4.6 + 0.45, 0, h, z - 0.45, z + 0.45);
        put('stoneDark', s * 4.6, h + 0.15, z, 1.2, 0.3, 1.2);
      }
    });

    // ---- the lower tower ----
    const win = (c) => [c - 1.1, c + 1.1];
    for (let f = 0; f < 3; f++) {
      const y = FY[f];
      const hw = [-4.5, 4.5].map((c) => [...win(c), y + 2.6, y + 6.6]);
      // the south wall: the gate on the ground floor
      const sh = f === 0 ? [[-2.2, 2.2, 0, 5.2], [-7.6, -5.4, 2.6, 6.6], [5.4, 7.6, 2.6, 6.6]] : [[-6.6, -4.4, y + 2.6, y + 6.6], [4.4, 6.6, y + 2.6, y + 6.6], [-1.1, 1.1, y + 2.6, y + 6.6]];
      wallX('stone', -LT, LT, -LT, -IN - 0.2, y, y + 10, sh, f === 0 ? [[-2.2, 2.2, 0, 5.2]] : []);
      wallX('brick', -IN, IN, -IN - 0.2, -IN, y, y + 9.2, sh.map((h) => [Math.max(-IN, h[0]), Math.min(IN, h[1]), h[2], h[3]]), f === 0 ? [[-2.2, 2.2, 0, 5.2]] : []);
      // north wall (the stairs run along it on floors 0 and 2: high windows only)
      const nh = [[-1.2, 1.2, y + 5.6, y + 8.4]];
      wallX('stone', -LT, LT, IN + 0.2, LT, y, y + 10, nh);
      wallX('brick', -IN, IN, IN, IN + 0.2, y, y + 9.2, nh);
      // east and west walls
      wallZ('stone', -IN - 0.2, IN + 0.2, -LT, -IN - 0.2, y, y + 10, hw);
      wallZ('stone', -IN - 0.2, IN + 0.2, IN + 0.2, LT, y, y + 10, f === 2 ? hw.slice(0, 1) : hw);
      wallZ('brick', -IN, IN, -IN - 0.2, -IN, y, y + 9.2, hw);
      wallZ('brick', -IN, IN, IN, IN + 0.2, y, y + 9.2, f === 2 ? hw.slice(0, 1) : hw);
      // bars in the windows
      const barsAt = (cx, cz, axis) => {
        for (let k = -2; k <= 2; k++) {
          const o = k * 0.42;
          if (axis === 'x') put('iron', cx + o, y + 4.6, cz, 0.06, 4, 0.06);
          else put('iron', cx, y + 4.6, cz + o, 0.06, 4, 0.06);
        }
      };
      sh.forEach((h) => h[2] > y + 1 && barsAt((h[0] + h[1]) / 2, -LT + 0.4, 'x'));
      hw.forEach((h) => {
        barsAt(-LT + 0.4, (h[0] + h[1]) / 2, 'z');
        if (f !== 2 || h[0] < 0) barsAt(LT - 0.4, (h[0] + h[1]) / 2, 'z');
      });
      // a string course of darker stone outside, and the frieze of the dead script inside
      put('stoneDark', 0, y + 9.95, -LT - 0.12, 2 * LT + 0.5, 0.35, 0.3);
      put('stoneDark', 0, y + 9.95, LT + 0.12, 2 * LT + 0.5, 0.35, 0.3);
      put('stoneDark', -LT - 0.12, y + 9.95, 0, 0.3, 0.35, 2 * LT + 0.5);
      put('stoneDark', LT + 0.12, y + 9.95, 0, 0.3, 0.35, 2 * LT + 0.5);
      if (f > 0) {
        [[0, -IN + 0.03, 0], [0, IN - 0.03, Math.PI]].forEach(([x, z, ry]) => {
          bat('frieze').add(new THREE.PlaneGeometry(14, 0.9), P(x, y + 8.2, z), [0, ry, 0]);
        });
      }
    }
    // the corner buttresses, stepped
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        cube('stoneDark', sx * LT - 1.2, sx * LT + 1.2, 0, 4, sz * LT - 1.2, sz * LT + 1.2);
        put('stone', sx * LT, 17, sz * LT, 1.8, 26, 1.8);
      }),
    );
    // the gate: an arch of darker voussoirs, two iron-bound doors that swing in
    put('stoneDark', 0, 5.8, -LT - 0.2, 6, 1.2, 0.5);
    put('stoneDark', -2.6, 2.6, -LT - 0.2, 0.8, 5.2, 0.5);
    put('stoneDark', 2.6, 2.6, -LT - 0.2, 0.8, 5.2, 0.5);
    gate0 = { leaves: [], k: 0, b: col(0, 2.6, -LT + 0.6, 4.4, 5.2, 0.4) };
    [-1, 1].forEach((s) => {
      const hinge = new THREE.Group();
      hinge.position.copy(P(s * 2.2, 0, -LT + 0.6));
      const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.1, 0.22), M.beam);
      door.position.set(-s * 1.1, 2.55, 0);
      hinge.add(door);
      for (let k = 0; k < 4; k++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.12, 0.26), M.iron);
        band.position.set(-s * 1.1, 0.6 + k * 1.3, 0);
        hinge.add(band);
      }
      root.add(hinge);
      gate0.leaves.push({ hinge, s });
    });
    // the floors: F1, F2 (planks on stone, beams under), F3 the terrace (stone)
    const HOLES = {
      1: [-7.6, 6.2, 7.4, IN],
      2: [-6.2, 7.6, -IN, -7.4],
      3: [7.4, IN, -4.9, 8.7],
    };
    for (let f = 1; f <= 3; f++) {
      const y = FY[f];
      slab('stone', -IN, IN, -IN, IN, y - 0.8, y - 0.06, HOLES[f]);
      if (f < 3) slab('wood', -IN, IN, -IN, IN, y - 0.06, y, HOLES[f]);
      else slab('stoneLit', -IN, IN, -IN, IN, y - 0.06, y, HOLES[f]);
      for (let x = -8; x <= 8; x += 2.6) put('beam', x, y - 1.05, 0, 0.36, 0.5, 2 * IN);
    }
    // ground floor: flagstones
    put('stoneLit', 0, 0.02, 0, 2 * IN, 0.06, 2 * IN);
    // the stairs: F0→F1 along the north wall, F1→F2 along the south wall, F2→F3 along the east
    flight('x', 1, -7.0, 7.6, IN, 0);
    flight('x', -1, 7.0, -IN, -7.6, 10);
    flight('z', 1, -4.5, 7.6, IN, 20);
    // stairwell walls (brick), rails around the holes upstairs
    cube('brick', -7.6, 6.2, 0, 9.2, 7.25, 7.55);
    cube('brick', -6.2, 7.6, 10, 19.2, -7.55, -7.25);
    cube('brick', 7.25, 7.55, 20, 29.2, -4.9, IN);
    rail('stoneLit', -7.6, 6.2, 7.25, 7.55, 10);
    rail('stoneLit', -7.9, -7.6, 7.25, IN, 10);
    rail('stoneLit', -6.2, 7.6, -7.55, -7.25, 20);
    rail('stoneLit', 7.6, 7.9, -IN, -7.25, 20);
    rail('stoneLit', 7.25, 7.55, -4.9, 7.0, 30);
    rail('stoneLit', 7.25, IN, -5.2, -4.9, 30);
    // the barred gates at the foot of each stair
    Object.entries(GATES).forEach(([k, G]) => {
      const g = new THREE.Group();
      g.position.copy(P(G.x, G.y, G.z));
      if (G.ax === 'z') g.rotation.y = Math.PI / 2;
      const gb = LvKit.batch();
      for (let i = 0; i < 9; i++) gb.add(BOX, V3(-G.w / 2 + 0.12 + (i * (G.w - 0.24)) / 8, 1.6, 0), null, [0.07, 3.2, 0.07]);
      [0.4, 2.9].forEach((y) => gb.add(BOX, V3(0, y, 0), null, [G.w, 0.1, 0.1]));
      g.add(gb.mesh(M.iron));
      root.add(g);
      const b = G.ax === 'x' ? col(G.x, G.y + 1.6, G.z, G.w, 3.2, 0.3) : col(G.x, G.y + 1.6, G.z, 0.3, 3.2, G.w);
      gates[k] = { g, b, k: 0 };
    });

    // ---- the terrace: parapet with crenels, the drawbridge heads on the north side ----
    const crenel = (x0, x1, z0, z1, along) => {
      const len = along === 'x' ? x1 - x0 : z1 - z0;
      const n = Math.round(len / 1.6);
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const a = (along === 'x' ? x0 : z0) + (i + 0.5) * (len / n);
        if (along === 'x') put('stone', a, 31.85, (z0 + z1) / 2, len / n, 0.9, z1 - z0);
        else put('stone', (x0 + x1) / 2, 31.85, a, x1 - x0, 0.9, len / n);
      }
    };
    const heads = [[-5.1, -2.9, 30, 33], [2.9, 5.1, 30, 33]];
    wallX('stone', -LT, LT, -LT, -IN, 30, 31.4);
    crenel(-LT, LT, -LT, -IN, 'x');
    wallX('stone', -LT, LT, IN, LT, 30, 31.4, heads, heads);
    [[-LT, -5.1], [-2.9, 2.9], [5.1, LT]].forEach(([a, b]) => crenel(a, b, IN, LT, 'x'));
    wallZ('stone', -IN, IN, -LT, -IN, 30, 31.4);
    crenel(-LT, -IN, -IN, IN, 'z');
    wallZ('stone', -IN, IN, IN, LT, 30, 31.4);
    crenel(IN, LT, -IN, IN, 'z');
    col(0, 33, -LT + 0.6, 2 * LT, 3, 1.2);
    [[-LT, -5.1], [-2.9, 2.9], [5.1, LT]].forEach(([a, b]) => col((a + b) / 2, 33, LT - 0.6, b - a, 3, 1.2));
    col(-LT + 0.6, 33, 0, 1.2, 3, 2 * LT);
    col(LT - 0.6, 33, 0, 1.2, 3, 2 * LT);
    // the plates of the terrace (dame west, valet east): two rings of eight, a picture on each
    ['dame', 'valet'].forEach((own) => {
      const C = PLATES[own];
      const ringM = new THREE.Mesh(new THREE.RingGeometry(PLATES.r + 0.55, PLATES.r + 0.75, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(own === 'dame' ? '#ff6f9e' : '#ffc04a').multiplyScalar(0.8), transparent: true, opacity: 0.5, toneMapped: false }));
      ringM.position.copy(P(C.x, 30.03, C.z));
      root.add(ringM);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const x = C.x + Math.sin(a) * PLATES.r;
        const z = C.z + Math.cos(a) * PLATES.r;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.12, 24), M.bronze);
        base.position.copy(P(x, 30.06, z));
        root.add(base);
        const pl = plaque(own, 1.0);
        pl.rotation.x = -Math.PI / 2;
        pl.rotation.z = -a + Math.PI;
        pl.position.copy(P(x, 30.135, z));
        root.add(pl);
        plates[own].push({ base, pl, p: [x, 30, z], k: 0 });
      }
    });
    // the drawbridges: hinged on the terrace edge, raised until they fall across the gap
    ['dame', 'valet'].forEach((own) => {
      const x = BRIDGE[own];
      const hinge = new THREE.Group();
      hinge.position.copy(P(x, 30, BRIDGE.z0));
      const len = BRIDGE.z1 - BRIDGE.z0 + 0.6;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.w, 0.24, len), M.wood);
      deck.position.set(0, -0.12, len / 2);
      hinge.add(deck);
      [-1, 1].forEach((s) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, len), M.metal);
        beam.position.set((s * BRIDGE.w) / 2, -0.1, len / 2);
        hinge.add(beam);
      });
      const chainM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), M.iron);
      root.add(hinge);
      root.add(chainM);
      hinge.rotation.x = -Math.PI / 2;
      const b = col(x, 29.88, (BRIDGE.z0 + BRIDGE.z1) / 2, BRIDGE.w, 0.24, len);
      b.on = false;
      bridges[own] = { hinge, chain: chainM, b, k: 0 };
    });

    // ---- the upper tower: the lift shaft, breaches open to the storm, the crown ----
    const U = UT;
    const breach = [[-5.2, 5.2, 30, 34.6]];
    const bigE = [[20.5, 25, 38, 44], [24, 29.5, 49, 56], [20.5, 26, 60, 66]];
    const bigW = [[23, 29.5, 41, 47], [20.5, 25.5, 53, 59], [24.5, 29.5, 63, 68]];
    const bigN = [[-4, 2, 44, 50], [-2, 4, 57, 62]];
    wallX('stone', U.x0, U.x1, U.z0, U.z0 + 1, 0, U.top, [...breach, [-4.5, -1.5, 46, 52], [1.5, 4.5, 58, 64]], breach);
    wallX('stone', U.x0, U.x1, U.z1 - 1, U.z1, 0, U.top, bigN);
    wallZ('stone', U.z0 + 1, U.z1 - 1, U.x0, U.x0 + 1, 0, U.top, bigW);
    wallZ('stone', U.z0 + 1, U.z1 - 1, U.x1 - 1, U.x1, 0, U.top, bigE);
    // the core under the lift landing, and the landing ledge inside the breach
    cube('stoneDark', U.x0 + 1, U.x1 - 1, 0, 29.4, U.z0 + 1, U.z1 - 1, false);
    col(0, 14.7, 25, 12, 29.4, 12);
    slab('stoneLit', U.x0 + 1, U.x1 - 1, U.z0 + 1, U.z1 - 1, 29.4, 30, [-3, 3, 22, 28]);
    // the crown floor around the shaft top, its parapet
    slab('stoneLit', U.x0 + 1, U.x1 - 1, U.z0 + 1, U.z1 - 1, 71.4, 72, [-3, 3, 22, 28]);
    wallX('stone', U.x0, U.x1, U.z0, U.z0 + 1, 72, 73.3);
    wallX('stone', U.x0, U.x1, U.z1 - 1, U.z1, 72, 73.3);
    wallZ('stone', U.z0 + 1, U.z1 - 1, U.x0, U.x0 + 1, 72, 73.3);
    wallZ('stone', U.z0 + 1, U.z1 - 1, U.x1 - 1, U.x1, 72, 73.3);
    col(0, 74, U.z0 + 0.5, 14, 4, 1);
    col(0, 74, U.z1 - 0.5, 14, 4, 1);
    col(U.x0 + 0.5, 74, 25, 1, 4, 14);
    col(U.x1 - 0.5, 74, 25, 1, 4, 14);
    for (let y = 10; y < 72; y += 10) {
      put('stoneDark', 0, y, U.z0 - 0.12, 14.5, 0.35, 0.3);
      put('stoneDark', U.x0 - 0.12, y, 25, 0.3, 0.35, 14.5);
      put('stoneDark', U.x1 + 0.12, y, 25, 0.3, 0.35, 14.5);
    }
    // outside, bands of the old dead script glow on the split tower, floor after floor
    for (let y = 36; y < 72; y += 9) {
      [[0, U.z0 - 0.06, Math.PI, 13], [0, U.z1 + 0.06, 0, 13], [U.x0 - 0.06, 25, -Math.PI / 2, 13], [U.x1 + 0.06, 25, Math.PI / 2, 13]].forEach(([x, z, ry, w]) => {
        bat('frieze').add(new THREE.PlaneGeometry(w, 0.9), P(x, y + 1.2, z), [0, ry, 0]);
      });
    }
    // inside the shaft, the old dead script runs up the walls
    for (let y = 36; y < 70; y += 7) {
      [[0, 30.97, Math.PI], [-5.97, 25, Math.PI / 2], [5.97, 25, -Math.PI / 2]].forEach(([x, z, ry]) => {
        bat('frieze').add(new THREE.PlaneGeometry(10, 0.7), P(x, y, z), [0, ry, 0]);
      });
    }
    // the petals of the crown: eight bronze leaves closed over the top, opened at the end
    const leafS = new THREE.Shape();
    leafS.moveTo(-1.0, 0);
    leafS.quadraticCurveTo(-2.2, 4.5, 0, 9.2);
    leafS.quadraticCurveTo(2.2, 4.5, 1.0, 0);
    leafS.lineTo(-1.0, 0);
    const petalGeo = new THREE.ExtrudeGeometry(leafS, { depth: 0.2, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -0.1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const hinge = new THREE.Group();
      hinge.position.copy(P(Math.sin(a) * 7.6, 73.2, 25 + Math.cos(a) * 7.6));
      hinge.rotation.order = 'YXZ';
      hinge.rotation.y = a;
      const leaf = new THREE.Mesh(petalGeo, M.bronze);
      const vein = new THREE.Mesh(new THREE.BoxGeometry(0.1, 7.6, 0.1).translate(0, 4.4, -0.12), M.rune);
      hinge.add(leaf, vein);
      root.add(hinge);
      petals.push({ hinge, k: 0 });
    }

    // ---- the lift: a platform in a cage, eight levers (four each), the glyph column ----
    lift = { g: new THREE.Group(), y: liftYOf(0), cols: {} };
    lift.g.position.copy(P(LIFT.x, liftYOf(0), LIFT.z));
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 6), M.wood);
    deck.position.y = -0.3;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.2, 6.2), M.metal);
    rim.position.y = -0.55;
    lift.g.add(deck, rim);
    const cage = new THREE.Group();
    const barG = new THREE.BoxGeometry(0.06, 3.6, 0.06);
    const bars = LvKit.batch();
    const door = LvKit.batch();
    const tops = LvKit.batch();
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < 12; i++) {
        const o = -2.9 + (i * 5.8) / 11;
        const ax = s % 2 === 0;
        const sgn = s < 2 ? 1 : -1;
        (s === 2 && Math.abs(o) < 1.3 ? door : bars).add(barG, V3(ax ? o : sgn * 2.95, 1.8, ax ? sgn * 2.95 : o));
      }
      tops.add(BOX, V3(s % 2 === 0 ? 0 : (s < 2 ? 1 : -1) * 2.95, 3.6, s % 2 === 0 ? (s < 2 ? 1 : -1) * 2.95 : 0), null, [s % 2 === 0 ? 6 : 0.12, 0.12, s % 2 === 0 ? 0.12 : 6]);
    }
    const doorM = door.mesh(M.iron);
    doorM.userData.door = true;
    cage.add(bars.mesh(M.iron), doorM, tops.mesh(M.metal));
    lift.g.add(cage);
    lift.cage = cage;
    // the cables up into the dark
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 60, 6).translate(0, 30, 0), M.iron);
    lift.cables = [-2.6, 2.6].map((x) => {
      const c = cable.clone();
      c.position.set(x, 3.6, 0);
      lift.g.add(c);
      return c;
    });
    // the column with the inscription (four faces), and the lamp of the lift
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.0, 10).translate(0, 1.0, 0), M.bronze);
    lift.g.add(pillar);
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 512;
    const ltex = new THREE.CanvasTexture(cv);
    const lmat = new THREE.MeshBasicMaterial({ map: ltex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    lmat.color.setScalar(0.7);
    const lvm = new THREE.MeshBasicMaterial({ map: T.veil, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const colG = new THREE.Group();
    colG.position.y = 2.75;
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), lmat);
      pl.position.set(Math.sin((i * Math.PI) / 2) * 0.63, 0, Math.cos((i * Math.PI) / 2) * 0.63);
      pl.rotation.y = (i * Math.PI) / 2;
      pl.renderOrder = 6;
      const v = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), lvm);
      v.position.copy(pl.position);
      v.rotation.copy(pl.rotation);
      colG.add(pl, v);
    }
    [-0.7, 0.7].forEach((y) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.045, 8, 4), M.bronze);
      ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      ring.position.y = y;
      colG.add(ring);
    });
    lift.g.add(colG);
    lift.colG = colG;
    lift.pillar = pillar;
    steles.lift = { g: colG, cv, tex: ltex, plane: { set visible(v) { colG.children.forEach((c) => c.material === lmat && (c.visible = v)); } }, veil: { set visible(v) { colG.children.forEach((c) => c.material === lvm && (c.visible = v)); } }, s: { w: 1.25, h: 1.25 }, key: '' };
    lift.lamp = new THREE.PointLight('#ffd0a0', 1.1, 14, 2);
    lift.lamp.position.set(0, 3.3, 0);
    lift.g.add(lift.lamp);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const own = i < 4 ? 'valet' : 'dame';
      const L = lever(Math.sin(a) * 2.5, 0, Math.cos(a) * 2.5, a + Math.PI, own, lift.g, true, true);
      liftLev.push(L);
    }
    root.add(lift.g);
    lift.floor = col(LIFT.x, liftYOf(0) - 0.3, LIFT.z, 6, 0.6, 6, { dyn: true });
    // cage walls: north, east, west; the south door closes when the lift leaves
    lift.walls = [
      col(0, 0, 0, 6, 3.6, 0.2, { dyn: true }),
      col(0, 0, 0, 0.2, 3.6, 6, { dyn: true }),
      col(0, 0, 0, 0.2, 3.6, 6, { dyn: true }),
      col(0, 0, 0, 6, 3.6, 0.2, { dyn: true }),
    ];

    // ---- the gate levers (parvis), bells, rings and cranks ----
    LEV0.forEach(([x, y, z]) => lev0.push(lever(x, y, z, Math.PI, 'valet')));
    // the bells hang from a frame of beams; the ropes come down to a post with the picture
    for (let x = -6; x <= 6; x += 6) put('beam', x, 17.2, 0, 0.4, 0.5, 2 * IN);
    put('beam', 0, 17.2, -0.6, 2 * IN, 0.45, 0.4);
    BELLS.forEach(([x, , z], i) => {
      const own = i < 3 ? 'dame' : 'valet';
      const g = new THREE.Group();
      g.position.copy(P(x, 16.9, z));
      const bell = new THREE.Mesh(
        new THREE.LatheGeometry(
          [[0.05, 0], [0.45, -0.1], [0.62, -0.5], [0.72, -1.1], [0.95, -1.45], [0.98, -1.55], [0.0, -1.55]].map(([r, y]) => new THREE.Vector2(r, y)),
          28,
        ),
        M.bronze,
      );
      const clap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), M.iron);
      clap.position.y = -1.4;
      const ropeM = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.9, 6).translate(0, -3.5, 0), M.rope);
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.4, 8), own === 'dame' ? M.rose : M.gold);
      tassel.position.y = -5.6;
      g.add(bell, clap, ropeM, tassel);
      root.add(g);
      // the post with the picture, by the rope
      const pz = z + (z > 0 ? -0.75 : 0.75);
      put('stoneLit', x, 10.65, pz, 0.34, 1.3, 0.34);
      const pl = plaque(own, 0.7);
      pl.position.copy(P(x, 11.55, pz));
      pl.rotation.y = z > 0 ? Math.PI : 0;
      root.add(pl);
      bells.push({ g, pl, t: 9, swing: 0 });
    });
    // the rings: a stone core, three bronze bands of eight pictures, a front marker (south)
    cube('stoneDark', -0.9, 0.9, 20, 25.2, RINGS.z - 0.9, RINGS.z + 0.9);
    col(RINGS.x, 23, RINGS.z, 2 * RINGS.r + 0.2, 3.6, 2 * RINGS.r + 0.2);
    put('stone', 0, 25.4, RINGS.z, 2.4, 0.4, 2.4);
    RINGS.y.forEach((y, ri) => {
      const g = new THREE.Group();
      g.position.copy(P(RINGS.x, y, RINGS.z));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(RINGS.r, RINGS.r, 0.95, 48, 1, true), M.bronze);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(RINGS.r - 0.12, RINGS.r - 0.12, 0.95, 48, 1, true), M.metal);
      inner.material = M.metal;
      const spokes = new THREE.Mesh(new THREE.BoxGeometry(2 * RINGS.r, 0.12, 0.16), M.metal);
      const spokes2 = spokes.clone();
      spokes2.rotation.y = Math.PI / 2;
      g.add(band, inner, spokes, spokes2);
      const pls = [];
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * TAU;
        const pl = plaque(ri === 1 ? 'dame' : 'valet', 0.78);
        pl.position.set(Math.sin(a) * (RINGS.r + 0.01), 0, Math.cos(a) * (RINGS.r + 0.01));
        pl.rotation.y = a;
        g.add(pl);
        pls.push(pl);
      }
      root.add(g);
      rings.push({ g, pls, r: 0, ang: Math.PI });
    });
    // the marker: a lit bracket on the south side, and the three cranks before it
    const mk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.8, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(1.4), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    mk.position.copy(P(RINGS.x, 23.0, RINGS.z - RINGS.r - 0.3));
    root.add(mk);
    [-1, 1].forEach((s) => put('metal', s * 0.55, 23.0, RINGS.z - RINGS.r - 0.32, 0.08, 3.9, 0.1));
    CRANKS.forEach(([x, y, z], i) => {
      const own = i === 1 ? 'dame' : 'valet';
      const g = new THREE.Group();
      g.position.copy(P(x, y, z));
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.6), M.stoneLit);
      ped.position.y = 0.5;
      const wheel = new THREE.Group();
      wheel.position.set(0, 1.15, 0);
      const rimW = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24), own === 'dame' ? M.rose : M.gold);
      rimW.rotation.x = Math.PI / 2;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.06), M.metal);
      const bar2 = bar.clone();
      bar2.rotation.y = Math.PI / 2;
      wheel.add(rimW, bar, bar2);
      // which ring this crank turns: three marks, one lit
      for (let k = 0; k < 3; k++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.03), k === i ? new THREE.MeshBasicMaterial({ color: new THREE.Color(own === 'dame' ? '#ff8fb8' : '#ffd27a').multiplyScalar(1.6), toneMapped: false }) : M.iron);
        d.position.set(0, 0.85 - k * 0.14, -0.31);
        g.add(d);
      }
      g.add(ped, wheel);
      root.add(g);
      cranks.push({ g, wheel, spin: 0 });
    });
    check = lever(CHECK[0], CHECK[1], CHECK[2], Math.PI / 2, 'dame');
    check.pl.visible = false;

    // ---- the steles (the one of the bells hangs from the beam on two chains) ----
    Object.entries(STELE).forEach(([k, s]) => makeStele(k, s));
    [-1.1, 1.1].forEach((x) => put('iron', x, 16.25, 0, 0.05, 1.9, 0.05));

    // ---- set dressing: braziers, hanging lanterns of the hall, banners ----
    [[-6, 0, -6], [6, 0, -6], [-5, 10, -5.8], [8.6, 10, 4.5], [-7.4, 20, 6.4], [5.6, 20, 6.4], [-8.6, 30, -0.5], [-0.6, 30, -8.6], [6.4, 30, 3.0]].forEach((p) => brazier(...p));
    col(-6, 0.7, -6, 0.9, 1.4, 0.9);
    col(6, 0.7, -6, 0.9, 1.4, 0.9);
    [-1, 1].forEach((s) => {
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5.2), new THREE.MeshStandardMaterial({ color: s < 0 ? '#5a1830' : '#4a3410', roughness: 0.9, side: THREE.DoubleSide }));
      ban.position.copy(P(s * 8, 4.6, -IN + 0.25));
      root.add(ban);
      const sym = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), picMat.none[s < 0 ? 3 : 7]);
      sym.position.copy(P(s * 8, 5.4, -IN + 0.27));
      root.add(sym);
    });
    // the title screen of the épreuve, on the parvis
    screen = makeScreen(7, 2.6, 1024);
    screen.mesh.position.copy(P(10.5, 4.6, -24.2));
    screen.mesh.rotation.y = Math.PI + 0.55;
    root.add(screen.mesh);
    [-1, 1].forEach((s) => {
      const px = 10.5 + Math.cos(0.55) * s * 3.2;
      const pz = -24.2 - Math.sin(0.55) * s * 3.2;
      cube('stoneDark', px - 0.3, px + 0.3, 0, 6.1, pz - 0.3, pz + 0.3);
    });
    put('stoneDark', 10.5, 6.05, -24.2, 7.4, 0.3, 0.4, [0, 0.55, 0]);
    // the card, at the crown
    card = LvKit.trialCard('c10', false);
    card.position.copy(P(0, 74.5, 25));
    root.add(card);
    // the rift: a pink seam in the clouds over the crown
    rift = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 140),
      new THREE.ShaderMaterial({
        uniforms: { uTime: SH.time, uOpen: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime, uOpen;
          varying vec2 vUv;
          void main() {
            float y = vUv.y;
            float w = 0.008 + 0.018 * uOpen + 0.004 * sin(y * 30.0 + uTime * 2.0);
            float x = abs(vUv.x - 0.5 - 0.04 * sin(y * 7.0 + uTime * 0.6));
            float core = smoothstep(w, 0.0, x);
            float halo = smoothstep(w * 6.0, 0.0, x) * 0.22;
            float ends = smoothstep(0.0, 0.25, y) * smoothstep(1.0, 0.75, y);
            vec3 c = mix(vec3(1.0, 0.4, 0.7), vec3(1.0, 0.9, 0.95), core);
            gl_FragColor = vec4(c * (core * 1.1 + halo) * ends * (0.45 + 0.35 * uOpen), 1.0);
          }`,
      }),
    );
    rift.position.copy(P(RIFT.x, RIFT.y, RIFT.z));
    rift.rotation.x = -0.35;
    rift.frustumCulled = false;
    root.add(rift);

    // ---- lights (a fixed set, moved to where the play is) ----
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffb070', 0, 18, 2);
      root.add(l);
      lights.push(l);
    }
    const flashL = new THREE.DirectionalLight('#b8c4ff', 0);
    flashL.position.copy(P(-40, 120, -60));
    flashL.target.position.copy(P(0, 20, 0));
    root.add(flashL, flashL.target);
    lift.flashL = flashL;

    // the merged geometry, one mesh per material
    Object.entries(batches).forEach(([k, b]) => {
      if (!b.size) return;
      root.add(b.mesh(M[k]));
    });
    loadScans();
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the world's own geometry, materials and canvas textures, takes its colliders out and
  // forgets every reference build() made, so the next build() makes it again from scratch.
  // The materials of Tex (and the scans bound to them, see scan) are shared and stay cached.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    const extra = [Object.values(M), Object.values(T), soft, picTex.map((p) => Object.values(p)), Object.values(picMat)];
    const r = Life.free([root, wx], extra);
    r.world = 'tr_c10';
    r.colliders = Phys.drop('tr_c10');
    built = false;
    [M, T, batches, SKY, RAIN, steles, gates].forEach(clear);
    [picTex, picMat.dame, picMat.valet, picMat.none, bolts, lev0, bells, rings, cranks, liftLev, lights, fires, petals].forEach((a) => (a.length = 0));
    plates.dame.length = plates.valet.length = 0;
    soft = screen = card = gate0 = check = lift = rift = null;
    bridges = {};
    flashV = 0;
    SH.flash.value = 0;
    liftY = liftYOf(0);
    Object.assign(ST, ST0());
    return r;
  };

  // ---------- per-frame ----------
  // where the four warm lights hang for each stage (braziers of the floor being played)
  const LIGHTS = {
    0: [[-6, 2.2, -6], [6, 2.2, -6], [0, 6.5, -14], [0, 4, 4]],
    1: [[-5, 12.2, -5.8], [8.6, 12.2, 4.5], [0, 15, 0], [-6, 3, 2]],
    2: [[-7.4, 22.2, 6.4], [5.6, 22.2, 6.4], [0, 24, -3], [-9, 23, 1.2]],
    3: [[-8.6, 32.2, -0.5], [-0.6, 32.2, -8.6], [6.4, 32.2, 3.0], [0, 33, 14]],
    4: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
    5: [[-4, 75, 21], [4, 75, 29], [0, 76, 25], [0, 0, 0]],
  };
  // what the world shows, set by the level from the shared state (as after a page load on unbuild)
  const ST0 = () => ({
    stage: 0,
    gate0: 0,
    gates: { 1: 0, 2: 0, 3: 0 },
    rings: [0, 0, 0],
    bridges: { dame: 0, valet: 0 },
    lift: 0,
    cage: 0,
    crown: 0,
    card: false,
    hemi: 0.22,
    wind: new THREE.Vector2(),
    rain: 1,
    open: 0,
  });
  const ST = ST0();
  let liftY = liftYOf(0);
  const placeLift = () => {
    lift.g.position.y = O.y + liftY;
    const f = lift.floor;
    f.min = [O.x - 3, O.y + liftY - 0.6, O.z + LIFT.z - 3];
    f.max = [O.x + 3, O.y + liftY, O.z + LIFT.z + 3];
    const w = lift.walls;
    const y0 = O.y + liftY;
    const y1 = y0 + 3.6;
    const set = (b, x0, x1, z0, z1) => {
      b.min = [O.x + x0, y0, O.z + LIFT.z + z0];
      b.max = [O.x + x1, y1, O.z + LIFT.z + z1];
    };
    set(w[0], -3, 3, 2.85, 3.05);
    set(w[1], 2.85, 3.05, -3, 3);
    set(w[2], -3.05, -2.85, -3, 3);
    set(w[3], -3, 3, -3.05, -2.85);
    const caged = ST.cage === 1;
    w.forEach((b, i) => (b.on = ST.cage < 2 && (i < 3 || caged)));
  };
  const update = (dt, t, me) => {
    if (!built) return;
    SH.time.value = t;
    flashV = Math.max(0, flashV - dt * 3.2);
    SH.flash.value = flashV;
    R.hemi.intensity = ST.hemi + flashV * 1.1;
    lift.flashL.intensity = flashV * 1.6;
    const cam = R.camera.position;
    RAIN.U.uCam.value.copy(cam);
    RAIN.U.uWind.value.copy(ST.wind);
    RAIN.U.uAmt.value = ST.rain;
    RAIN.mesh.visible = ST.rain > 0.01;
    DRY.box.set(O.x - LT, O.z - LT, O.x + LT, O.z + LT);
    DRY.y.value = O.y + 29.2;
    SKY.mesh.position.copy(cam);
    SKY.U.uOpen.value = ST.open;
    tickBolts(dt);
    LvKit.tick(t);
    // fires flicker
    fires.forEach((f, i) => {
      const k = 0.85 + Math.sin(t * 11 + i * 3) * 0.08 + Math.sin(t * 23 + i) * 0.07;
      f.scale.set(1.0 * k, 1.4 * k, 1);
    });
    const LP = LIGHTS[ST.stage] || LIGHTS[0];
    lights.forEach((l, i) => {
      const p = LP[i];
      const on = ST.stage !== 4 && !(p[0] === 0 && p[1] === 0 && p[2] === 0);
      if (on) l.position.copy(P(p[0], p[1], p[2]));
      l.intensity = on ? (ST.stage === 5 && i === 2 ? 1.6 : 1.25) * (0.9 + Math.sin(t * 9 + i * 2) * 0.06) : 0;
      l.color.set(ST.stage === 5 && i === 2 ? '#ff9cc8' : '#ffb070');
    });
    // the gate of the parvis, the stair gates
    gate0.k = damp(gate0.k, ST.gate0, 1.6, dt);
    gate0.leaves.forEach(({ hinge, s }) => (hinge.rotation.y = s * gate0.k * 1.75));
    gate0.b.on = ST.gate0 < 0.5;
    Object.entries(gates).forEach(([k, G]) => {
      G.k = damp(G.k, ST.gates[k], 1.4, dt);
      G.g.position.y = O.y + GATES[k].y + G.k * 3.3;
      G.b.on = ST.gates[k] < 0.5;
    });
    // levers fall back
    [...lev0, check, ...liftLev].forEach((L) => {
      L.pull = Math.max(0, L.pull - dt * 1.6);
      L.arm.rotation.x = 0.6 - Math.sin(Math.min(1, L.pull) * Math.PI) * 1.0;
    });
    // bells swing after a ring
    bells.forEach((B) => {
      B.t += dt;
      B.g.rotation.z = Math.sin(B.t * 6) * Math.exp(-B.t * 1.2) * 0.35 * B.swing;
    });
    // rings turn to their step
    rings.forEach((Rg, i) => {
      const want = Math.PI - ST.rings[i] * (TAU / 8);
      // always the short way, one notch at a time
      let d = want - Rg.ang;
      d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
      Rg.ang += d * (1 - Math.exp(-5 * dt));
      Rg.g.rotation.y = Rg.ang;
    });
    cranks.forEach((C) => {
      C.spin = Math.max(0, C.spin - dt);
      C.wheel.rotation.y += C.spin * dt * 9;
    });
    plates.dame.concat(plates.valet).forEach((pl) => {
      pl.k = Math.max(0, pl.k - dt * 1.5);
      pl.base.position.y = O.y + 30.06 - pl.k * 0.05;
    });
    // drawbridges fall across the gap
    Object.entries(bridges).forEach(([own, B]) => {
      B.k = damp(B.k, ST.bridges[own], 1.3, dt);
      B.hinge.rotation.x = -Math.PI / 2 + B.k * (Math.PI / 2);
      B.b.on = ST.bridges[own] > 0.5 && B.k > 0.9;
      const tip = V3(0, 0, BRIDGE.z1 - BRIDGE.z0).applyAxisAngle(V3(1, 0, 0), B.hinge.rotation.x).add(B.hinge.position);
      const top = P(BRIDGE[own], 36, BRIDGE.z0 - 0.4);
      B.chain.position.copy(tip).add(top).multiplyScalar(0.5);
      B.chain.scale.y = tip.distanceTo(top);
      B.chain.lookAt(top);
      B.chain.rotateX(Math.PI / 2);
    });
    // the lift climbs to its landing, a steady pace
    const want = liftYOf(ST.lift);
    const sp = want > liftY ? 1.45 : 3.5;
    liftY = Math.abs(want - liftY) < sp * dt ? want : liftY + Math.sign(want - liftY) * sp * dt;
    placeLift();
    lift.cage.children.forEach((c) => {
      // the door slides down into the deck while the cage waits at the bridges
      if (c.userData.door) c.position.y = -(ST.cage === 0 ? 3.7 : 0);
    });
    lift.cage.position.y = damp(lift.cage.position.y, ST.cage === 2 ? -3.8 : 0, 1.5, dt);
    // at the crown the lift's machinery is put away: only the floor stays, flush with the crown
    lift.cables.forEach((c) => (c.visible = ST.cage !== 2));
    lift.colG.visible = lift.pillar.visible = ST.cage !== 2;
    liftLev.forEach((L) => (L.g.visible = ST.cage !== 2));
    lift.lamp.intensity = ST.stage >= 3 ? 1.2 + flashV : 0;
    // the crown opens
    petals.forEach((pt, i) => {
      pt.k = damp(pt.k, ST.crown, 0.9 + i * 0.05, dt);
      pt.hinge.rotation.x = lerp(-0.62, 0.95, pt.k);
    });
    rift.material.uniforms.uOpen.value = ST.open;
    card.visible = ST.card;
    if (card.visible) {
      card.rotation.y = t * 0.9;
      card.position.y = O.y + 74.4 + Math.sin(t * 1.4) * 0.15;
    }
    if (screen) screen.update(dt, t);
    void me;
  };

  // ---------- queries ----------
  const inLower = (q) => Math.abs(q.x) < IN && Math.abs(q.z) < IN;
  const at = (zone, q) => {
    switch (zone) {
      case 'F1':
        return inLower(q) && q.y > 9.5 && q.y < 13 && !(q.z < -7.4 && q.x > -6.4);
      case 'F2':
        return inLower(q) && q.y > 19.5 && q.y < 23 && !(q.x > 7.4 && q.z > -5);
      case 'F3':
        return Math.abs(q.x) < LT && Math.abs(q.z) < LT && q.y > 29.5 && q.y < 33 && !(q.x > 7.4);
      case 'LIFT':
        return Math.abs(q.x - LIFT.x) < 2.9 && Math.abs(q.z - LIFT.z) < 2.9 && Math.abs(q.y - liftY) < 1.2;
      case 'CROWN':
        return q.x > UT.x0 && q.x < UT.x1 && q.z > UT.z0 && q.z < UT.z1 && q.y > 71.5;
      default:
        return false;
    }
  };
  const SPAWN = {
    0: [[-1.5, 0, -33], [1.5, 0, -33]],
    1: [[5.0, 10, 5.4], [7.0, 10, 5.4]],
    2: [[-7.2, 20, -5.8], [-5.6, 20, -5.8]],
    3: [[-5, 30, -1.6], [3.6, 30, -1.6]],
    5: [[-1.2, 72, 25], [1.2, 72, 25]],
  };
  const spawn = (stage, who) => {
    if (stage === 4) return P(LIFT.x + (who === 'dame' ? -1 : 1), liftY + 0.05, LIFT.z - 1.2);
    const s = SPAWN[stage] || SPAWN[0];
    const p = s[who === 'dame' ? 0 : 1];
    return P(p[0], p[1], p[2]);
  };
  // world positions of the things you work with
  const leverPos = (i) => P(...LEV0[i]).add(V3(0, 1, -0.6));
  const bellPos = (i) => P(BELLS[i][0], 10, BELLS[i][2]);
  const crankPos = (i) => P(...CRANKS[i]);
  const checkPos = () => P(...CHECK);
  const platePos = (own, i) => P(...plates[own][i].p);
  const liftLeverPos = (i) => {
    const a = (i / 8) * TAU;
    return P(LIFT.x + Math.sin(a) * 2.5, liftY, LIFT.z + Math.cos(a) * 2.5);
  };

  return {
    O,
    P,
    rel,
    LIFT,
    BRIDGE,
    PLATES,
    CROWN,
    RIFT,
    UT,
    ST,
    STY,
    NG,
    NF: FRAMES.length,
    NM: MARKS.length,
    gSvg,
    pSvg,
    faceSvg,
    build,
    unbuild,
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
    },
    update,
    bolt,
    flash,
    at,
    spawn,
    leverPos,
    bellPos,
    crankPos,
    checkPos,
    platePos,
    liftLeverPos,
    liftYOf,
    get liftY() {
      return liftY;
    },
    set liftY(v) {
      liftY = v;
    },
    setStele,
    // pictures on things: which picture each lever, bell, ring slot, plate, lift lever shows
    setPics(o) {
      if (o.lev0) lev0.forEach((L, i) => setPic(L.pl, o.lev0[i]));
      if (o.bells) bells.forEach((B, i) => setPic(B.pl, o.bells[i]));
      if (o.rings) rings.forEach((Rg, i) => Rg.pls.forEach((pl, s) => setPic(pl, o.rings[i][s])));
      if (o.plD) plates.dame.forEach((pl, i) => setPic(pl.pl, o.plD[i]));
      if (o.plV) plates.valet.forEach((pl, i) => setPic(pl.pl, o.plV[i]));
      if (o.lift) liftLev.forEach((L, i) => setPic(L.pl, o.lift[i]));
    },
    pull(kind, i) {
      const L = kind === 'lev0' ? lev0[i] : kind === 'lift' ? liftLev[i] : check;
      if (L) L.pull = 1;
    },
    ring(i) {
      const B = bells[i];
      if (!B) return;
      B.t = 0;
      B.swing = 1;
    },
    crank(i) {
      if (cranks[i]) cranks[i].spin = 0.5;
    },
    press(own, i) {
      const pl = plates[own] && plates[own][i];
      if (pl) pl.k = 1;
    },
    bellTop: (i) => P(BELLS[i][0], 16.2, BELLS[i][2]),
    get screen() {
      return screen;
    },
    get card() {
      return card;
    },
    get rift() {
      return rift;
    },
  };
})();
