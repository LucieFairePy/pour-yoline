// ♣ 5 · La Bombe à cœurs II: the Veilleurs' night train. A heart-shaped bomb rides in the luggage
// van; one of you defuses it, the other reads the manual three cars away. Then the bomb rolls
// to the locomotive, the roles swap, the reader also fights the steam valves, and the last
// module needs both hands on the bomb while the train dives into a tunnel.
const C5 = (() => {
  const O = V3(2100, 0, 7000);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  const glow = LvKit.glow;

  // ================= the rules (shared by the bomb, the manuals and the level logic) =================
  const WCOL = {
    r: ['rouge', '#c8243c'],
    p: ['rose', '#ff7aa8'],
    o: ['or', '#e0ad52'],
    b: ['bleu', '#3a7bd5'],
    k: ['noir', '#1c1820'],
    w: ['blanc', '#e8e2dc'],
  };
  const GLYPHS = {
    // the keypad symbols: suit icons and old letters, the kind you have to describe out loud
    cols: [
      ['Ω', 'anchor', 'λ', 'Ψ', 'heart', 'Ж', '¿'],
      ['Б', 'Ω', '¿', '‡', 'crown', 'λ', '§'],
      ['eye', 'Ξ', '‡', 'Ж', 'Э', 'Ψ', 'crown'],
      ['∞', '¶', 'spade', 'Э', '‡', '¿', 'π'],
      ['δ', 'π', 'spade', 'Ф', '¶', 'Я', 'lock'],
      ['∞', 'Б', 'club', 'æ', 'δ', 'Σ', 'ß'],
    ],
  };
  const SIMON = ['rose', 'bleu', 'or', 'vert'];
  const SIMON_COL = ['#ff6f9a', '#5aa8ff', '#f0b54a', '#5fe08a'];
  // [vowel in the serial][strikes][flash] -> button to press
  const SIMON_MAP = [
    [
      [1, 2, 3, 0],
      [0, 0, 3, 2],
      [2, 3, 0, 1],
    ],
    [
      [1, 0, 3, 2],
      [2, 3, 1, 0],
      [3, 0, 2, 1],
    ],
  ];
  const DIAL_GLYPHS = ['heart', 'crown', 'spade', 'anchor', 'diamond', 'eye', 'club', 'lock'];
  const DIAL_PAT = [
    ['101100010011', 'crown'],
    ['011010100101', 'anchor'],
    ['110001001110', 'heart'],
    ['100110011001', 'eye'],
    ['010101101010', 'spade'],
    ['111000000111', 'lock'],
  ];
  // six fixed 6×6 mazes (same seeds on both screens), each with its two green markers
  const MAZES = (() => {
    const out = [];
    for (let m = 0; m < 6; m++) {
      const r = rng(311 + m * 17);
      // open[cell] = bits: 1 up, 2 right, 4 down, 8 left
      const open = new Array(36).fill(0);
      const seen = new Array(36).fill(false);
      const stack = [(r() * 36) | 0];
      seen[stack[0]] = true;
      while (stack.length) {
        const c = stack[stack.length - 1];
        const row = (c / 6) | 0;
        const col = c % 6;
        const nb = [];
        if (row > 0 && !seen[c - 6]) nb.push([c - 6, 1, 4]);
        if (col < 5 && !seen[c + 1]) nb.push([c + 1, 2, 8]);
        if (row < 5 && !seen[c + 6]) nb.push([c + 6, 4, 1]);
        if (col > 0 && !seen[c - 1]) nb.push([c - 1, 8, 2]);
        if (!nb.length) {
          stack.pop();
          continue;
        }
        const [n, a, b] = nb[(r() * nb.length) | 0];
        open[c] |= a;
        open[n] |= b;
        seen[n] = true;
        stack.push(n);
      }
      // a few extra openings so there is more than one way round
      for (let k = 0; k < 4; k++) {
        const c = (r() * 30) | 0;
        if (c % 6 < 5) {
          open[c] |= 2;
          open[c + 1] |= 8;
        }
      }
      out.push({ open, marks: [m * 5 + 1 + (m % 2) * 6, 34 - m * 5 - ((m + 1) % 2) * 6] });
    }
    return out;
  })();
  const MEMO_TXT = [
    ['Écran 1 ou 2 : le bouton en 2e position.', 'Écran 3 : le bouton en 3e position.', 'Écran 4 : le bouton en 4e position.'],
    [
      'Écran 1 : le bouton étiqueté 4.',
      'Écran 2 : le bouton à la même position qu’à l’étape 1.',
      'Écran 3 : le bouton en 1re position.',
      'Écran 4 : le bouton à la même position qu’à l’étape 1.',
    ],
    [
      'Écran 1 : le bouton de même étiquette qu’à l’étape 2.',
      'Écran 2 : le bouton de même étiquette qu’à l’étape 1.',
      'Écran 3 : le bouton en 3e position.',
      'Écran 4 : le bouton étiqueté 4.',
    ],
  ];

  const pick = (a) => a[(Math.random() * a.length) | 0];
  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const RULES = {
    serial() {
      const L = 'ABCDEFGHJKLMNPQRSTUVXZ';
      const s = pick(L) + pick(L) + '-' + ((Math.random() * 10) | 0) + ((Math.random() * 10) | 0) + ((Math.random() * 10) | 0) + '-' + pick(L);
      return s;
    },
    odd: (serial) => +serial[5] % 2 === 1,
    vowel: (serial) => /[AEIOUY]/.test(serial),
    wires() {
      const n = 4 + ((Math.random() * 3) | 0);
      return { k: 'wires', w: Array.from({ length: n }, () => pick(Object.keys(WCOL))), cut: [], solved: false };
    },
    wireAnswer(w, serial) {
      const odd = RULES.odd(serial);
      const n = (c) => w.filter((x) => x === c).length;
      const last = w.length - 1;
      if (w.length === 4) {
        if (!n('r') && odd) return 1;
        if (w[last] === 'w' && n('b') >= 1) return 0;
        if (n('o') > 1) return w.lastIndexOf('o');
        return 2;
      }
      if (w.length === 5) {
        if (w[last] === 'k' && odd) return 3;
        if (n('r') === 1 && n('p') > 1) return 0;
        if (!n('k')) return 1;
        return 0;
      }
      if (!n('o') && odd) return 2;
      if (n('o') === 1 && n('w') > 1) return 3;
      if (!n('r')) return 5;
      return 3;
    },
    keys() {
      for (;;) {
        const col = (Math.random() * 6) | 0;
        const g = shuffle(GLYPHS.cols[col]).slice(0, 4);
        const others = GLYPHS.cols.filter((c, i) => i !== col && g.every((x) => c.includes(x)));
        if (!others.length) return { k: 'keys', g, col, pressed: [], solved: false };
      }
    },
    keyOrder: (m) => GLYPHS.cols[m.col].filter((x) => m.g.includes(x)).map((x) => m.g.indexOf(x)),
    simon: () => ({ k: 'simon', seq: Array.from({ length: 4 }, () => (Math.random() * 4) | 0), stage: 0, input: [], solved: false }),
    simonWant: (m, serial, strikes) =>
      m.seq.slice(0, m.stage + 2).map((c) => SIMON_MAP[RULES.vowel(serial) ? 0 : 1][Math.min(2, strikes)][c]),
    maze() {
      for (;;) {
        const m = (Math.random() * 6) | 0;
        const s = (Math.random() * 36) | 0;
        const g = (Math.random() * 36) | 0;
        if (RULES.mazeDist(m, s, g) >= 6) return { k: 'maze', m, pos: s, goal: g, solved: false };
      }
    },
    mazeStep(m, c, dir) {
      // dir 0 up 1 right 2 down 3 left; returns the new cell or -1 against a wall
      const bit = [1, 2, 4, 8][dir];
      if (!(MAZES[m].open[c] & bit)) return -1;
      return c + [-6, 1, 6, -1][dir];
    },
    mazeDist(m, a, b) {
      const d = new Array(36).fill(-1);
      d[a] = 0;
      const q = [a];
      while (q.length) {
        const c = q.shift();
        for (let k = 0; k < 4; k++) {
          const n = RULES.mazeStep(m, c, k);
          if (n >= 0 && d[n] < 0) {
            d[n] = d[c] + 1;
            q.push(n);
          }
        }
      }
      return d[b];
    },
    memo: () => ({ k: 'memo', st: 0, d: 1 + ((Math.random() * 4) | 0), lab: shuffle([1, 2, 3, 4]), hist: [], solved: false }),
    // the position (0..3) to press at the current stage
    memoWant(m) {
      const d = m.d;
      const h = m.hist;
      const posOfLabel = (l) => m.lab.indexOf(l);
      if (m.st === 0) return d <= 2 ? 1 : d - 1;
      if (m.st === 1) return d === 1 ? posOfLabel(4) : d === 3 ? 0 : h[0][0];
      return d === 1 ? posOfLabel(h[1][1]) : d === 2 ? posOfLabel(h[0][1]) : d === 3 ? 2 : posOfLabel(4);
    },
    dial: () => ({ k: 'dial', pat: (Math.random() * 6) | 0, knob: (Math.random() * 8) | 0, solved: false }),
    dialOk: (m) => DIAL_GLYPHS[m.knob] === DIAL_PAT[m.pat][1],
  };

  // ================= materials =================
  const painted = (draw, opt, w = 512, h = 512) => {
    const t = LvKit.tex(w, h, draw);
    return new THREE.MeshStandardMaterial({ map: t, ...opt });
  };
  const noise = (g, w, h, n, a) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a * Math.random()})` : `rgba(0,0,0,${a * Math.random()})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  };
  const brushed = (base, hi) => (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
      g.fillRect(0, y, w, 1);
    }
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, hi);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    noise(g, w, h, 2000, 0.05);
  };
  const brass = painted(brushed('#b8862f', 'rgba(255,230,160,0.25)'), { roughness: 0.38, metalness: 0.35 });
  const steel = painted(brushed('#6c717c', 'rgba(255,255,255,0.18)'), { roughness: 0.45, metalness: 0.3 });
  const iron = painted(brushed('#34313a', 'rgba(255,255,255,0.08)'), { roughness: 0.6, metalness: 0.25 });
  const copper = painted(brushed('#9a5a36', 'rgba(255,200,160,0.2)'), { roughness: 0.42, metalness: 0.3 });
  const mahogany = painted(
    (g, w, h) => {
      g.fillStyle = '#3e1a12';
      g.fillRect(0, 0, w, h);
      for (let k = 0; k < 90; k++) {
        g.strokeStyle = `rgba(${30 + Math.random() * 40},${8 + Math.random() * 10},4,${0.2 + Math.random() * 0.3})`;
        g.lineWidth = 0.6 + Math.random() * 2;
        g.beginPath();
        const y = Math.random() * h;
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * 0.015 + k) * 3);
        g.stroke();
      }
      noise(g, w, h, 3000, 0.05);
    },
    { roughness: 0.5, metalness: 0 },
  );
  // marquetry panels for the salon car: framed wood with a little inlaid heart
  const marquetry = painted(
    (g, w, h) => {
      g.fillStyle = '#4a2216';
      g.fillRect(0, 0, w, h);
      for (let k = 0; k < 60; k++) {
        g.strokeStyle = `rgba(20,6,2,${0.15 + Math.random() * 0.2})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const x = Math.random() * w;
        g.moveTo(x, 0);
        g.lineTo(x + Math.sin(k) * 8, h);
        g.stroke();
      }
      g.strokeStyle = '#c99a4a';
      g.lineWidth = 6;
      g.strokeRect(36, 36, w - 72, h - 72);
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 3;
      g.strokeRect(48, 48, w - 96, h - 96);
      g.fillStyle = '#7a1a2a';
      Icons.draw(g, 'heart', w / 2, h / 2, 90);
      g.strokeStyle = '#c99a4a';
      g.lineWidth = 3;
      noise(g, w, h, 3000, 0.05);
    },
    { roughness: 0.55, metalness: 0 },
  );
  const velvet = painted(
    (g, w, h) => {
      g.fillStyle = '#5a0f1f';
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 12000, 0.08);
    },
    { roughness: 0.95, metalness: 0 },
  );
  const carpet = painted(
    (g, w, h) => {
      g.fillStyle = '#4a0c1a';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b07a3a';
      g.lineWidth = 6;
      g.strokeRect(10, 10, w - 20, h - 20);
      g.globalAlpha = 0.45;
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          g.fillStyle = (r + c) % 2 ? '#b07a3a' : '#8a2238';
          Icons.draw(g, (r + c) % 2 ? 'club' : 'heart', 64 + c * 128, 64 + r * 128, 46);
        }
      g.globalAlpha = 1;
      noise(g, w, h, 9000, 0.06);
    },
    { roughness: 0.95, metalness: 0 },
  );
  const planks = painted(
    (g, w, h) => {
      for (let p = 0; p < 8; p++) {
        g.fillStyle = ['#5a3a24', '#4e3220', '#62402a', '#553622'][p % 4];
        g.fillRect((p * w) / 8, 0, w / 8, h);
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect((p * w) / 8, 0, 3, h);
        for (let k = 0; k < 10; k++) {
          g.strokeStyle = `rgba(20,10,4,${0.2 + Math.random() * 0.2})`;
          g.lineWidth = 1;
          g.beginPath();
          const x = (p * w) / 8 + Math.random() * (w / 8);
          g.moveTo(x, 0);
          g.lineTo(x + Math.random() * 6 - 3, h);
          g.stroke();
        }
      }
      noise(g, w, h, 6000, 0.06);
    },
    { roughness: 0.75, metalness: 0 },
  );
  const checker = painted(
    (g, w, h) => {
      g.fillStyle = '#3e3d44';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          g.save();
          g.translate(x * 32 + 16, y * 32 + 16);
          g.rotate((x + y) % 2 ? Math.PI / 4 : -Math.PI / 4);
          g.fillStyle = 'rgba(255,255,255,0.12)';
          g.fillRect(-10, -3, 20, 6);
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(-10, 3, 20, 2);
          g.restore();
        }
      noise(g, w, h, 4000, 0.06);
    },
    { roughness: 0.6, metalness: 0.25 },
  );
  const plates = painted(
    (g, w, h) => {
      g.fillStyle = '#3a3640';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          g.strokeStyle = 'rgba(0,0,0,0.6)';
          g.lineWidth = 4;
          g.strokeRect(x * 256 + 4, y * 256 + 4, 248, 248);
          for (let i = 0; i < 6; i++) {
            [
              [x * 256 + 20 + i * 43, y * 256 + 18],
              [x * 256 + 20 + i * 43, y * 256 + 238],
            ].forEach(([a, b]) => {
              g.fillStyle = '#25222a';
              g.beginPath();
              g.arc(a, b, 6, 0, TAU);
              g.fill();
              g.fillStyle = 'rgba(255,255,255,0.25)';
              g.beginPath();
              g.arc(a - 1.5, b - 1.5, 2, 0, TAU);
              g.fill();
            });
          }
        }
      noise(g, w, h, 5000, 0.07);
    },
    { roughness: 0.6, metalness: 0.2 },
  );
  // the moon and the sky light reach inside (no shadows): every painted interior map is toned down
  [brass, steel, iron, copper, mahogany, marquetry, velvet, carpet, planks, checker, plates].forEach((m, i) =>
    m.color.setScalar([0.8, 0.75, 0.8, 0.8, 0.62, 0.5, 0.6, 0.45, 0.42, 0.48, 0.45][i]),
  );
  const lacquer = new THREE.MeshStandardMaterial({ color: '#6e1226', roughness: 0.42, metalness: 0.1 });
  const darkPanel = new THREE.MeshStandardMaterial({ color: '#16101a', roughness: 0.7, metalness: 0.1 });
  const bellows = painted(
    (g, w, h) => {
      g.fillStyle = '#1e1a20';
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        const gr = g.createLinearGradient(x, 0, x + 32, 0);
        gr.addColorStop(0, '#141016');
        gr.addColorStop(0.5, '#3a343e');
        gr.addColorStop(1, '#141016');
        g.fillStyle = gr;
        g.fillRect(x, 0, 32, h);
      }
      noise(g, w, h, 3000, 0.05);
    },
    { roughness: 0.9, metalness: 0 },
  );
  const glass = new THREE.MeshStandardMaterial({
    color: '#a8c8e8',
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    metalness: 0.1,
    depthWrite: false,
  });
  // box faces get UVs in meters so painted maps never stretch
  const bx = (sx, sy, sz, tile = 1) => {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const uv = geo.attributes.uv;
    const dims = [
      [sz, sy],
      [sz, sy],
      [sx, sz],
      [sx, sz],
      [sx, sy],
      [sx, sy],
    ];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
      }
    return geo;
  };
  const deco = (sx, sy, sz, mat, x, y, z, tile) => K.deco(bx(sx, sy, sz, tile), mat, x, y, z);
  const solid = (x, y, z, sx, sy, sz, mat, tile) => {
    deco(sx, sy, sz, mat, x, y, z, tile);
    return K.collider(x, y, z, sx, sy, sz);
  };

  // ================= canvas helpers (1080 px minimum on the long side) =================
  const canvasMat = (w, h, draw, opt = {}) => {
    const k = Math.max(1, Math.ceil(1080 / Math.max(w, h)));
    const c = document.createElement('canvas');
    c.width = w * k;
    c.height = h * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 16;
    const m = new THREE.MeshBasicMaterial({
      map: t,
      toneMapped: false,
      transparent: !!opt.transparent,
      depthWrite: !opt.transparent,
      side: opt.side || THREE.FrontSide,
    });
    m.color.setScalar(opt.k != null ? opt.k : 0.8);
    m.userData = { c, g, k, w, h, t };
    return m;
  };
  const redraw = (m, draw) => {
    const { c, g, k, w, h, t } = m.userData;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.scale(k, k);
    draw(g, w, h);
    t.needsUpdate = true;
  };
  const serif = (px) => `italic ${px}px "Bodoni Moda", Georgia, serif`;
  const mono = (px) => `${px}px "IBM Plex Mono", monospace`;
  const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const ICON_GLYPHS = ['heart', 'spade', 'club', 'diamond', 'crown', 'anchor', 'eye', 'lock'];
  const drawGlyph = (g, s, x, y, size, col) => {
    g.fillStyle = col;
    g.strokeStyle = col;
    if (ICON_GLYPHS.includes(s)) Icons.draw(g, s, x, y, size);
    else {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${size}px Georgia, "Times New Roman", serif`;
      g.fillText(s, x, y + size * 0.04);
    }
  };
  const heartPath = (g, x, y, s) => {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * TAU;
      const hx = 16 * Math.sin(t) ** 3;
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const px = x + (hx * s) / 17;
      const py = y - (hy * s) / 17;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
  };
  const heartShape = (s) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * TAU;
      const hx = (16 * Math.sin(t) ** 3 * s) / 17;
      const hy = ((13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s) / 17;
      if (i) sh.lineTo(hx, hy);
      else sh.moveTo(hx, hy);
    }
    return sh;
  };

  // ================= layout =================
  const HW = 3; // half the inner width of a car
  const CH = 3.8; // ceiling
  const CARS = { A: [0, 22], B: [24, 46], C: [48, 66], D: [68, 88] };
  const DOORS = [23, 47, 67];
  const BOMB_Z = { 1: 35, 2: 78 };
  const LECTERN = { 1: V3(0, 0, 15), 2: V3(0, 0, 52.5) };
  const VALVES = [V3(-2.45, 0, 57.5), V3(2.45, 0, 60.5), V3(-2.45, 0, 63.5)];
  const KEYS = { dame: V3(-1.7, 0, 76.1), valet: V3(1.7, 0, 76.1) };
  const SPEED = 24; // m/s, the land rushing past

  let built = false;
  const doors = [];
  const slots = [];
  const books = {};
  const valves = [];
  const keyPosts = {};
  const lamps = [];
  const wheels = [];
  const repeaters = {};
  let bomb = null;
  let bombCol = null;
  let timerMat = null;
  let serialMat = null;
  let beatRing = null;
  let card = null;
  let heart = null;
  let confetti = null;
  let shock = null;
  let scenery = null;
  let tunnel = null;
  let flash = null;
  const lights = [];

  // ================= the train =================
  // a car: floor, walls with a band of windows, ceiling with ribs, end walls with a wide door
  const carShell = (z0, z1, floorMat, wallMat, upperMat, ceilMat) => {
    const zc = (z0 + z1) / 2;
    const len = z1 - z0;
    K.solid(0, -0.2, zc, HW * 2 + 0.4, 0.4, len, floorMat);
    deco(HW * 2, 0.02, len, floorMat, 0, 0.005, zc, 2);
    // the walls are one collider each; the look is lower panel, window band, upper panel
    [-1, 1].forEach((sd) => {
      K.collider(sd * (HW + 0.1), CH / 2, zc, 0.2, CH, len);
      deco(0.2, 1.0, len, wallMat, sd * (HW + 0.1), 0.5, zc, 2);
      deco(0.22, CH - 2.3, len, upperMat, sd * (HW + 0.1), 2.3 + (CH - 2.3) / 2, zc, 2);
      deco(0.3, 0.08, len, brass, sd * (HW - 0.02), 1.02, zc);
      deco(0.3, 0.08, len, brass, sd * (HW - 0.02), 2.3, zc);
      // pillars between the windows
      const n = Math.floor(len / 2.4);
      const step = len / n;
      for (let i = 0; i <= n; i++) deco(0.24, 1.3, i === 0 || i === n ? 0.5 : 0.36, upperMat, sd * (HW + 0.1), 1.65, z0 + i * step);
      const gl = plane(len, 1.3, glass);
      gl.position.copy(P(sd * (HW + 0.12), 1.65, zc));
      gl.rotation.y = sd * Math.PI / 2;
      group.add(gl);
    });
    deco(HW * 2 + 0.6, 0.2, len, ceilMat, 0, CH + 0.1, zc, 2);
    K.collider(0, CH + 0.1, zc, HW * 2 + 0.6, 0.2, len);
    // ceiling ribs and a clerestory
    for (let z = z0 + 1.2; z < z1 - 0.6; z += 2.4) deco(HW * 2, 0.12, 0.14, brass, 0, CH - 0.06, z);
    deco(1.4, 0.06, len - 1, darkPanel, 0, CH - 0.02, zc);
  };
  // end wall with a wide door opening (2.6 × 2.6) at x = 0
  const endWall = (z, mat) => {
    const side = (HW * 2 - 2.6) / 2;
    solid(-(1.3 + side / 2), CH / 2, z, side, CH, 0.3, mat);
    solid(1.3 + side / 2, CH / 2, z, side, CH, 0.3, mat);
    solid(0, (CH + 2.6) / 2, z, 2.6, CH - 2.6, 0.3, mat);
    deco(2.9, 0.16, 0.36, brass, 0, 2.68, z);
    [-1, 1].forEach((sd) => deco(0.14, 2.6, 0.36, brass, sd * 1.37, 1.3, z));
  };
  // the gangway between two cars, with a sliding double door in the middle
  const gangway = (z0, z1, dz) => {
    const zc = (z0 + z1) / 2;
    const len = z1 - z0;
    K.solid(0, -0.2, zc, 3.0, 0.4, len, checker);
    [-1, 1].forEach((sd) => {
      deco(0.2, 2.9, len, bellows, sd * 1.5, 1.45, zc, 0.5);
      K.collider(sd * 1.5, 1.45, zc, 0.2, 2.9, len);
    });
    deco(3.2, 0.2, len, bellows, 0, 2.95, zc);
    K.collider(0, 2.95, zc, 3.2, 0.2, len);
    // the door: two leaves that slide into the bellows, a little window, a suit plate
    const leaves = [-1, 1].map((sd) => {
      const g = new THREE.Group();
      const leaf = new THREE.Mesh(bx(1.3, 2.6, 0.1), mahogany);
      leaf.position.set(0, 1.3, 0);
      g.add(leaf);
      const frame = new THREE.Mesh(bx(0.5, 0.7, 0.12), brass);
      frame.position.set(sd * -0.15, 1.75, 0);
      g.add(frame);
      const win = plane(0.42, 0.62, new THREE.MeshBasicMaterial({ color: '#1a2230', transparent: true, opacity: 0.55 }));
      win.position.set(sd * -0.15, 1.75, 0.065);
      g.add(win);
      const win2 = win.clone();
      win2.position.z = -0.065;
      win2.rotation.y = Math.PI;
      g.add(win2);
      const handle = new THREE.Mesh(bx(0.04, 0.4, 0.08), brass);
      handle.position.set(sd * -0.58, 1.1, 0.08);
      g.add(handle);
      g.position.copy(P(sd * 0.65, 0, dz));
      group.add(g);
      return { g, sd };
    });
    const col = K.collider(0, 1.3, dz, 2.6, 2.6, 0.3);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), glow('#ff3b55', 1.2));
    lamp.position.copy(P(0, 2.78, dz - 0.2));
    group.add(lamp);
    const lamp2 = lamp.clone();
    lamp2.position.z = O.z + dz + 0.2;
    group.add(lamp2);
    doors.push({ leaves, col, open: 0, lamps: [lamp, lamp2], z: dz });
  };
  const bogie = (z) => {
    // under the floor: wheels you glimpse through the gangway gaps, turning
    [-1, 1].forEach((sd) =>
      [-1, 1].forEach((f) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 20), iron);
        w.rotation.z = Math.PI / 2;
        w.position.copy(P(sd * 0.75, -0.85, z + f * 1.1));
        group.add(w);
        wheels.push(w);
      }),
    );
    deco(1.9, 0.3, 3.2, iron, 0, -0.7, z);
  };
  const lamp = (x, y, z, col = '#ffd2a0', swing = true) => {
    const g = new THREE.Group();
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), brass);
    chain.position.y = -0.11;
    g.add(chain);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#2a3a2a', roughness: 0.5, side: THREE.DoubleSide }));
    shade.position.y = -0.3;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), glow(col, 0.8));
    bulb.position.y = -0.37;
    g.add(bulb);
    g.position.copy(P(x, y, z));
    group.add(g);
    if (swing) lamps.push({ g, ph: Math.random() * TAU });
    return g;
  };
  const sconce = (x, y, z, rotY) => {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(bx(0.06, 0.4, 0.22), brass);
    g.add(plate);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), brass);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(0.15, 0.04, 0);
    g.add(arm);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), glow('#ffcf98', 0.85));
    globe.position.set(0.3, 0.12, 0);
    g.add(globe);
    g.position.copy(P(x, y, z));
    g.rotation.y = rotY;
    group.add(g);
  };
  const crate = (x, z, s, rot = 0, h = s) => {
    const m = deco(s, h, s, planks, x, h / 2, z, 0.8);
    m.rotation.y = rot;
    deco(s + 0.04, 0.08, s + 0.04, iron, x, h * 0.85, z).rotation.y = rot;
    deco(s + 0.04, 0.08, s + 0.04, iron, x, h * 0.15, z).rotation.y = rot;
    const r = Math.abs(Math.cos(rot)) + Math.abs(Math.sin(rot));
    K.collider(x, h / 2, z, s * r, h, s * r);
  };
  const armchair = (x, z, rotY) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(bx(0.8, 0.42, 0.8), velvet);
    seat.position.y = 0.21;
    g.add(seat);
    const back = new THREE.Mesh(bx(0.8, 0.7, 0.16), velvet);
    back.position.set(0, 0.7, -0.34);
    g.add(back);
    [-1, 1].forEach((sd) => {
      const arm = new THREE.Mesh(bx(0.14, 0.56, 0.8), velvet);
      arm.position.set(sd * 0.4, 0.4, 0);
      g.add(arm);
      const cap = new THREE.Mesh(bx(0.16, 0.04, 0.82), mahogany);
      cap.position.set(sd * 0.4, 0.69, 0);
      g.add(cap);
    });
    g.position.copy(P(x, 0, z));
    g.rotation.y = rotY;
    group.add(g);
    K.collider(x, 0.45, z, 0.9, 0.9, 0.9);
  };
  const bookshelf = (x, z, rotY, len = 1.8) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bx(len, 0.95, 0.4), mahogany);
    body.position.y = 0.475;
    g.add(body);
    const r = rng(Math.round(z * 31 + x * 7));
    for (let row = 0; row < 2; row++) {
      let px = -len / 2 + 0.08;
      while (px < len / 2 - 0.12) {
        const w = 0.04 + r() * 0.05;
        const h = 0.26 + r() * 0.1;
        const b = new THREE.Mesh(
          bx(w, h, 0.22),
          new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(r() < 0.5 ? 0.98 : 0.08 + r() * 0.05, 0.5, 0.18 + r() * 0.15), roughness: 0.8 }),
        );
        b.position.set(px + w / 2, 0.12 + row * 0.42 + h / 2, 0.1);
        g.add(b);
        px += w + 0.008;
      }
    }
    g.position.copy(P(x, 0, z));
    g.rotation.y = rotY;
    group.add(g);
  };

  // ================= the bomb =================
  // slot layout on the bomb's front face (bomb-local: +z faces the defuser)
  const SLOT_X = [-0.62, 0, 0.62];
  const SLOT_Y = 1.32;
  const SLOT_W = 0.56;
  // module faces are canvas-drawn (1080²) with a few raised 3D parts on top
  const moduleMat = () => canvasMat(1080, 1080, (g, w, h) => {
    g.fillStyle = '#120c14';
    g.fillRect(0, 0, w, h);
  });
  const buildSlot = (i) => {
    const pivot = new THREE.Group();
    pivot.position.set(SLOT_X[i], SLOT_Y, 0.52);
    bomb.inner.add(pivot);
    const faces = [0, 1].map((f) => {
      const g = new THREE.Group();
      g.rotation.y = f ? Math.PI : 0;
      pivot.add(g);
      const back = new THREE.Mesh(bx(SLOT_W + 0.06, SLOT_W + 0.06, 0.05), brass);
      back.position.z = f ? 0.0 : 0;
      g.add(back);
      const face = plane(SLOT_W, SLOT_W, moduleMat());
      face.position.z = 0.03;
      g.add(face);
      // the four corner screws
      [-1, 1].forEach((a) =>
        [-1, 1].forEach((b) => {
          const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), brass);
          s.rotation.x = Math.PI / 2;
          s.position.set((a * (SLOT_W + 0.02)) / 2, (b * (SLOT_W + 0.02)) / 2, 0.03);
          g.add(s);
        }),
      );
      const parts = new THREE.Group();
      parts.position.z = 0.035;
      g.add(parts);
      // the solved lamp, top right
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), glow('#3a1a20', 1));
      led.position.set(SLOT_W / 2 - 0.05, SLOT_W / 2 - 0.05, 0.045);
      g.add(led);
      return { g, face, parts, led, key: '' };
    });
    const cursor = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.062, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(0.85), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
    );
    cursor.visible = false;
    pivot.add(cursor);
    slots.push({ i, pivot, faces, cursor, flip: 0 });
  };
  const buildBomb = () => {
    const g = new THREE.Group();
    g.position.copy(P(0, 0, BOMB_Z[1]));
    g.rotation.y = Math.PI;
    group.add(g);
    const inner = new THREE.Group();
    g.add(inner);
    bomb = { g, inner, z: BOMB_Z[1], open: 0 };
    // the cart on its rail, with four wheels
    const cart = new THREE.Mesh(bx(2.5, 0.28, 1.5), iron);
    cart.position.y = 0.32;
    g.add(cart);
    [-1, 1].forEach((a) =>
      [-1, 1].forEach((b) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), steel);
        w.rotation.z = Math.PI / 2;
        w.position.set(a * 1.05, 0.16, b * 0.55);
        g.add(w);
      }),
    );
    const rim = new THREE.Mesh(bx(2.56, 0.06, 1.56), brass);
    rim.position.y = 0.47;
    g.add(rim);
    // the casing: a lacquered heart with a brass rim
    const hs = 1.16;
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(heartShape(hs), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 40 }),
      lacquer,
    );
    body.position.set(0, 1.45, -0.45);
    inner.add(body);
    const ringShape = heartShape(hs + 0.07);
    ringShape.holes.push(heartShape(hs - 0.02));
    [0.53, -0.53].forEach((z) => {
      const r = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.05, bevelEnabled: false, curveSegments: 40 }), brass);
      r.position.set(0, 1.45, z - 0.025);
      inner.add(r);
    });
    // a dark recessed panel behind the modules
    const recess = new THREE.Mesh(bx(1.95, 0.72, 0.04), darkPanel);
    recess.position.set(0, SLOT_Y, 0.5);
    inner.add(recess);
    // the timer and the strike hearts above, the serial plate below
    timerMat = canvasMat(1080, 360, () => {});
    const timer = plane(0.78, 0.26, timerMat);
    timer.position.set(0, 1.9, 0.53);
    inner.add(timer);
    const tFrame = new THREE.Mesh(bx(0.84, 0.32, 0.03), brass);
    tFrame.position.set(0, 1.9, 0.51);
    inner.add(tFrame);
    serialMat = canvasMat(1080, 260, () => {});
    const serial = plane(0.64, 0.155, serialMat);
    serial.position.set(0, 0.86, 0.53);
    inner.add(serial);
    const sFrame = new THREE.Mesh(bx(0.68, 0.19, 0.03), brass);
    sFrame.position.set(0, 0.86, 0.51);
    inner.add(sFrame);
    // the fuse: copper coils and a heart-shaped glass vial on top
    const vial = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.16), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: '#ff5f8a', transparent: true, opacity: 0.55, roughness: 0.1, emissive: '#5a0f24' }));
    vial.position.set(0, 2.62, -0.07);
    inner.add(vial);
    bomb.vial = vial;
    for (let k = 0; k < 2; k++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), copper);
      coil.position.set(k ? 0.34 : -0.34, 2.38, 0);
      coil.rotation.y = Math.PI / 2;
      inner.add(coil);
    }
    // the beat ring for the last module: four numbered lamps that light in turn
    beatRing = new THREE.Group();
    beatRing.position.set(0, 2.92, 0);
    inner.add(beatRing);
    beatRing.lamps = [0, 1, 2, 3].map((n) => {
      const a = (n / 4) * TAU;
      const lg = new THREE.Group();
      lg.position.set(Math.sin(a) * 0.58, 0, Math.cos(a) * 0.58);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a1420'), toneMapped: false }));
      lg.add(bulb);
      // the number, on both sides so each of you can read it
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((ry) => {
        const lab = plane(0.2, 0.2, canvasMat(256, 256, (gg) => {
          gg.clearRect(0, 0, 256, 256);
          gg.fillStyle = '#ffe2b0';
          gg.textAlign = 'center';
          gg.textBaseline = 'middle';
          gg.font = 'bold 190px Georgia, serif';
          gg.fillText(String(n + 1), 128, 138);
        }, { transparent: true, k: 0.75 }));
        lab.position.set(Math.sin(ry) * 0.12, 0.25, Math.cos(ry) * 0.12);
        lab.rotation.y = ry;
        lg.add(lab);
      });
      beatRing.add(lg);
      return bulb;
    });
    const beatBase = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.03, 8, 48), brass);
    beatBase.rotation.x = Math.PI / 2;
    beatBase.position.y = -0.06;
    beatRing.add(beatBase);
    beatRing.visible = false;
    for (let i = 0; i < 3; i++) buildSlot(i);
    bombCol = [BOMB_Z[1], BOMB_Z[2]].map((z) => Phys.box(O.x, 1.4, O.z + z, 2.5, 2.8, 1.6));
    // the floor rail it rolls on, all the way to the locomotive
    [-0.55, 0.55].forEach((x) => {
      deco(0.08, 0.04, 66, steel, x, 0.03, 52);
    });
  };

  // ---------- the module faces ----------
  const drawFrame = (g, w, h, title) => {
    g.fillStyle = '#130c15';
    g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.75);
    gr.addColorStop(0, 'rgba(90,30,50,0.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b8862f';
    g.lineWidth = 10;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.fillStyle = '#d8b878';
    g.font = mono(40);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(title, 60, 74);
  };
  const raised = (geo, mat, x, y, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const labelMat = (draw, k = 0.8) => canvasMat(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    draw(g);
  }, { transparent: true, k });
  const glyphCache = {};
  const glyphMat = (s, col = '#f2e2c0') => {
    const key = s + col;
    if (!glyphCache[key]) glyphCache[key] = labelMat((g) => drawGlyph(g, s, 128, 128, 170, col));
    return glyphCache[key];
  };
  const numCache = {};
  const numMat = (n, col = '#f2e2c0') => {
    const key = n + col;
    if (!numCache[key])
      numCache[key] = labelMat((g) => {
        g.fillStyle = col;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = 'bold 190px Georgia, serif';
        g.fillText(String(n), 128, 140);
      });
    return numCache[key];
  };
  const S = SLOT_W;
  // where the cursor ring sits for each module element (slot-local), and how many there are
  const elements = (m) => {
    if (!m) return [];
    if (m.k === 'wires') return m.w.map((_, i) => [0, S * 0.32 - (i * S * 0.64) / Math.max(1, m.w.length - 1)]);
    if (m.k === 'keys') return [0, 1, 2, 3].map((i) => [(i % 2 ? 1 : -1) * S * 0.2, (i < 2 ? 1 : -1) * S * 0.16 - 0.02]);
    if (m.k === 'memo') return [0, 1, 2, 3].map((i) => [(i - 1.5) * S * 0.2, -S * 0.25]);
    return [];
  };
  const buildParts = (face, m, serial) => {
    const pg = face.parts;
    while (pg.children.length) pg.remove(pg.children[0]);
    face.dyn = {};
    if (!m) return;
    if (m.k === 'wires') {
      const n = m.w.length;
      face.dyn.wires = m.w.map((c, i) => {
        const y = S * 0.32 - (i * S * 0.64) / (n - 1);
        const mat = new THREE.MeshStandardMaterial({ color: WCOL[c][1], roughness: 0.45, metalness: 0.05, emissive: new THREE.Color(WCOL[c][1]).multiplyScalar(0.12) });
        const halves = [-1, 1].map((sd) => {
          const h = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, S * 0.33, 10).rotateZ(Math.PI / 2).translate((sd * S * 0.33) / 2, 0, 0), mat);
          h.position.set(sd * -0.005, y, 0.02);
          pg.add(h);
          return h;
        });
        [-1, 1].forEach((sd) => {
          const post = raised(new THREE.CylinderGeometry(0.018, 0.022, 0.035, 12).rotateX(Math.PI / 2), brass, sd * S * 0.36, y, 0.012);
          pg.add(post);
          const clip = raised(new THREE.ExtrudeGeometry(heartShape(0.022), { depth: 0.01, bevelEnabled: false }), mat, sd * S * 0.36, y - 0.002, 0.03);
          pg.add(clip);
        });
        return halves;
      });
    }
    if (m.k === 'keys') {
      face.dyn.keys = m.g.map((s, i) => {
        const [x, y] = elements(m)[i];
        const cap = raised(bx(S * 0.3, S * 0.24, 0.035), new THREE.MeshStandardMaterial({ color: '#d8ccb4', roughness: 0.6 }), x, y, 0.018);
        pg.add(cap);
        const gl = plane(S * 0.17, S * 0.17, glyphMat(s, '#2a1820'));
        gl.position.set(x, y - 0.006, 0.037);
        pg.add(gl);
        const led = raised(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: '#2a1416', toneMapped: false }), x, y + S * 0.1, 0.04);
        pg.add(led);
        return { cap, gl, led, press: 0 };
      });
    }
    if (m.k === 'simon') {
      // a heart split in four quarters, each a coloured button
      face.dyn.simon = [0, 1, 2, 3].map((q) => {
        const a = [0, 1, 2, 3][q];
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(SIMON_COL[q]).multiplyScalar(0.28), toneMapped: false });
        const geo = new THREE.CylinderGeometry(S * 0.13, S * 0.13, 0.03, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4);
        const b = raised(geo, mat, [0, 1, 0, -1][a] * S * 0.19, [1, 0, -1, 0][a] * S * 0.19 - 0.02, 0.016);
        pg.add(b);
        return { b, mat, base: new THREE.Color(SIMON_COL[q]), lit: 0 };
      });
      const hub = raised(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 24).rotateX(Math.PI / 2), brass, 0, -0.02, 0.02);
      pg.add(hub);
    }
    if (m.k === 'maze') {
      face.dyn.maze = true;
      // four arrow buttons around the grid
      [
        [0, S * 0.41, 0],
        [S * 0.41, -0.01, -Math.PI / 2],
        [0, -S * 0.43, Math.PI],
        [-S * 0.41, -0.01, Math.PI / 2],
      ].forEach(([x, y, r], k) => {
        const tri = raised(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 3).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 0.5 }), x, y, 0.014);
        tri.rotation.z = r + Math.PI / 6 + Math.PI / 2;
        pg.add(tri);
        face.dyn['arrow' + k] = tri;
      });
    }
    if (m.k === 'memo') {
      face.dyn.memo = [0, 1, 2, 3].map((i) => {
        const [x, y] = elements(m)[i];
        const cap = raised(bx(S * 0.16, S * 0.22, 0.035), new THREE.MeshStandardMaterial({ color: '#cfc2a8', roughness: 0.6 }), x, y, 0.018);
        pg.add(cap);
        const lab = plane(S * 0.13, S * 0.13, numMat(1, '#2a1820'));
        lab.position.set(x, y, 0.037);
        pg.add(lab);
        return { cap, lab, press: 0 };
      });
    }
    if (m.k === 'dial') {
      const knob = new THREE.Group();
      knob.position.set(0, -S * 0.14, 0.01);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.045, 32).rotateX(Math.PI / 2), brass);
      base.position.z = 0.022;
      knob.add(base);
      const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 8), glow('#ffcf8a', 0.85));
      ptr.position.set(0, 0.065, 0.05);
      knob.add(ptr);
      pg.add(knob);
      face.dyn.knob = knob;
    }
  };
  const drawFace = (face, m, serial, strikes, phaseOn, sel) => {
    redraw(face.face.material, (g, w, h) => {
      if (!m) {
        drawFrame(g, w, h, '');
        g.fillStyle = '#4a3040';
        Icons.draw(g, 'club', w / 2, h / 2, 260);
        return;
      }
      const titles = { wires: 'FILS-CŒURS', keys: 'SYMBOLES', simon: 'BATTEMENT', maze: 'LABYRINTHE', memo: 'MÉMOIRE', dial: 'CADRAN' };
      drawFrame(g, w, h, titles[m.k]);
      if (m.k === 'wires') {
        const n = m.w.length;
        m.w.forEach((c, i) => {
          const yy = h * 0.18 + (i * h * 0.64) / (n - 1);
          g.fillStyle = '#d8b878';
          g.font = mono(42);
          g.textAlign = 'right';
          g.fillText(String(i + 1), 110, yy);
          g.strokeStyle = 'rgba(0,0,0,0.6)';
          g.lineWidth = 18;
          g.beginPath();
          g.moveTo(170, yy + 10);
          g.lineTo(w - 170, yy + 10);
          g.stroke();
        });
      }
      if (m.k === 'keys') {
        g.fillStyle = '#8a7060';
        g.font = mono(30);
        g.textAlign = 'center';
        g.fillText('quatre touches · un seul ordre', w / 2, h - 70);
      }
      if (m.k === 'simon') {
        // the heart the four buttons sit in
        g.strokeStyle = '#6a2a3a';
        g.lineWidth = 14;
        heartPath(g, w / 2, h / 2 + 30, 400);
        g.stroke();
        g.fillStyle = 'rgba(90,20,40,0.35)';
        g.fill();
        g.fillStyle = '#8a7060';
        g.font = mono(30);
        g.textAlign = 'center';
        g.fillText('étape ' + Math.min(3, m.stage + 1) + ' / 3', w / 2, h - 70);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k < m.stage || m.solved ? '#3fe08a' : '#3a2a30';
          g.beginPath();
          g.arc(w - 120 - k * 46, 74, 14, 0, TAU);
          g.fill();
        }
      }
      if (m.k === 'maze') {
        const mz = MAZES[m.m];
        const gx = w * 0.2;
        const gy = h * 0.18;
        const cs = (w * 0.6) / 6;
        g.fillStyle = '#0a0a10';
        g.fillRect(gx - 12, gy - 12, cs * 6 + 24, cs * 6 + 24);
        for (let c = 0; c < 36; c++) {
          const x = gx + (c % 6) * cs + cs / 2;
          const y = gy + ((c / 6) | 0) * cs + cs / 2;
          g.fillStyle = '#2e2a36';
          g.beginPath();
          g.arc(x, y, 7, 0, TAU);
          g.fill();
          if (mz.marks.includes(c)) {
            g.strokeStyle = '#3fe08a';
            g.lineWidth = 9;
            g.beginPath();
            g.arc(x, y, cs * 0.36, 0, TAU);
            g.stroke();
          }
          if (c === m.goal) {
            g.fillStyle = '#ff3b6a';
            heartPath(g, x, y + 4, cs * 0.34);
            g.fill();
          }
          if (c === m.pos) {
            g.fillStyle = '#f4ecdc';
            g.beginPath();
            g.arc(x, y, cs * 0.2, 0, TAU);
            g.fill();
          }
        }
      }
      if (m.k === 'memo') {
        g.fillStyle = '#05060a';
        g.fillRect(w * 0.3, h * 0.17, w * 0.4, h * 0.36);
        g.strokeStyle = '#6a5040';
        g.lineWidth = 6;
        g.strokeRect(w * 0.3, h * 0.17, w * 0.4, h * 0.36);
        g.fillStyle = m.solved ? '#3fe08a' : '#7cf0c8';
        g.font = 'bold 260px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(m.solved ? '·' : String(m.d), w / 2, h * 0.36);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k < m.st || m.solved ? '#3fe08a' : '#3a2a30';
          g.fillRect(w * 0.79, h * 0.44 - k * 80, 40, 56);
        }
        g.fillStyle = '#8a7060';
        g.font = mono(30);
        g.fillText('étape ' + Math.min(3, m.st + 1) + ' / 3', w / 2, h - 70);
      }
      if (m.k === 'dial') {
        // the LED grid on top, the glyph ring round the knob
        const pat = DIAL_PAT[m.pat][0];
        for (let i = 0; i < 12; i++) {
          const x = w * 0.2 + (i % 6) * (w * 0.12);
          const y = h * 0.2 + ((i / 6) | 0) * 90;
          const on = pat[i] === '1';
          g.fillStyle = on ? '#ff5f8a' : '#2a1a22';
          heartPath(g, x, y + 4, 30);
          g.fill();
        }
        const cx = w / 2;
        const cy = h * 0.64;
        g.strokeStyle = '#5a4030';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(cx, cy, 215, 0, TAU);
        g.stroke();
        DIAL_GLYPHS.forEach((s, k) => {
          const a = (k / 8) * TAU;
          drawGlyph(g, s, cx + Math.sin(a) * 270, cy - Math.cos(a) * 270, 74, k === m.knob ? '#ffe2a8' : '#a08a74');
        });
      }
      if (m.solved) {
        g.fillStyle = 'rgba(20,60,36,0.35)';
        g.fillRect(24, 24, w - 48, h - 48);
        g.fillStyle = '#3fe08a';
        g.font = mono(44);
        g.textAlign = 'right';
        g.fillText('DÉSAMORCÉ', w - 70, 74);
      }
      void serial;
      void strikes;
      void phaseOn;
      void sel;
    });
  };

  const drawTimer = (txt, strikes, col) =>
    redraw(timerMat, (g, w, h) => {
      g.fillStyle = '#07040a';
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.07;
      g.fillStyle = '#ff3d7f';
      for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
      g.globalAlpha = 1;
      g.fillStyle = col;
      g.font = 'bold 230px "IBM Plex Mono", monospace';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(txt, 60, h / 2 + 10);
      for (let k = 0; k < 3; k++) {
        const broken = k < strikes;
        g.fillStyle = broken ? '#3a1a22' : '#ff4f7a';
        heartPath(g, w - 270 + k * 92, h / 2 + 4, 40);
        g.fill();
        if (broken) {
          g.strokeStyle = '#ff3b55';
          g.lineWidth = 8;
          g.beginPath();
          g.moveTo(w - 300 + k * 92, h / 2 - 30);
          g.lineTo(w - 240 + k * 92, h / 2 + 34);
          g.stroke();
        }
      }
    });
  const drawSerial = (serial) =>
    redraw(serialMat, (g, w, h) => {
      g.fillStyle = '#e8dcc0';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3a2418';
      g.lineWidth = 8;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#3a2418';
      g.font = mono(54);
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText('N° DE SÉRIE', 50, h / 2);
      g.font = 'bold 120px "IBM Plex Mono", monospace';
      g.textAlign = 'right';
      g.fillText(serial || '------', w - 50, h / 2 + 6);
    });

  // ================= the manuals =================
  const PAGE_W = 1.1;
  const PAGE_H = 0.76;
  const ink = '#2a1810';
  const pageBg = (g, w, h, left) => {
    const gr = g.createLinearGradient(left ? w : 0, 0, left ? 0 : w, 0);
    gr.addColorStop(0, '#cfc0a0');
    gr.addColorStop(0.08, '#efe4c8');
    gr.addColorStop(1, '#f4ead2');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    noise(g, w, h, 6000, 0.04);
    g.strokeStyle = 'rgba(120,80,40,0.4)';
    g.lineWidth = 3;
    g.strokeRect(40, 40, w - 80, h - 80);
  };
  const wrap = (g, text, x, y, maxW, lh) => {
    const words = text.split(' ');
    let line = '';
    words.forEach((wd) => {
      const t = line ? line + ' ' + wd : wd;
      if (g.measureText(t).width > maxW && line) {
        g.fillText(line, x, y);
        y += lh;
        line = wd;
      } else line = t;
    });
    if (line) g.fillText(line, x, y);
    return y + lh;
  };
  const heading = (g, w, t, sub) => {
    g.fillStyle = '#6a1424';
    g.font = serif(64);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillText(t, w / 2, 130);
    if (sub) {
      g.fillStyle = '#7a5a40';
      g.font = mono(28);
      g.fillText(sub, w / 2, 172);
    }
    g.strokeStyle = '#8a6a40';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(120, 196);
    g.lineTo(w - 120, 196);
    g.stroke();
  };
  const body = (g, px = 32) => {
    g.fillStyle = ink;
    g.font = `${px}px Georgia, serif`;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  };
  const PAGES = {
    1: [
      // spread 1: how to + the wires
      [
        (g, w, h) => {
          pageBg(g, w, h, true);
          heading(g, w, 'Manuel de désamorçage', 'TOME II · LE TRAIN DE NUIT');
          body(g, 34);
          let y = 260;
          y = wrap(g, 'Celle ou celui qui tient la bombe ne voit pas ce manuel. Vous seul le lisez. Parlez.', 90, y, w - 180, 46) + 20;
          y = wrap(g, 'Chaque module se désamorce à part. Une erreur coûte un cœur. Trois cœurs brisés, ou le temps écoulé : la bombe éclate, et tout ce qui n’était pas désamorcé recommence.', 90, y, w - 180, 46) + 20;
          y = wrap(g, 'Le numéro de série est gravé sur la plaque, sous les modules. Demandez-le d’abord : plusieurs règles en dépendent.', 90, y, w - 180, 46) + 30;
          g.fillStyle = '#6a1424';
          g.font = serif(40);
          g.textAlign = 'center';
          g.fillText('Modules de ce tome', w / 2, y + 10);
          body(g, 34);
          g.textAlign = 'center';
          ['Fils-cœurs · page de droite', 'Symboles · page suivante', 'Battement · page suivante'].forEach((l, i) => g.fillText(l, w / 2, y + 70 + i * 50));
          g.fillStyle = '#9a7a60';
          g.font = mono(26);
          g.fillText('Flèches gauche / droite : tourner les pages', w / 2, h - 80);
        },
        (g, w, h) => {
          pageBg(g, w, h, false);
          heading(g, w, 'Fils-cœurs', 'COUPEZ UN SEUL FIL · COMPTEZ DE HAUT EN BAS');
          const blocks = [
            ['4 fils', [
              'S’il n’y a aucun fil rouge et que le dernier chiffre du numéro de série est impair : le 2e fil.',
              'Sinon, si le dernier fil est blanc et qu’il y a au moins un fil bleu : le 1er fil.',
              'Sinon, s’il y a plus d’un fil or : le dernier fil or.',
              'Sinon : le 3e fil.',
            ]],
            ['5 fils', [
              'Si le dernier fil est noir et que le dernier chiffre est impair : le 4e fil.',
              'Sinon, s’il y a exactement un fil rouge et plus d’un fil rose : le 1er fil.',
              'Sinon, s’il n’y a aucun fil noir : le 2e fil.',
              'Sinon : le 1er fil.',
            ]],
            ['6 fils', [
              'S’il n’y a aucun fil or et que le dernier chiffre est impair : le 3e fil.',
              'Sinon, s’il y a exactement un fil or et plus d’un fil blanc : le 4e fil.',
              'Sinon, s’il n’y a aucun fil rouge : le dernier fil.',
              'Sinon : le 4e fil.',
            ]],
          ];
          let y = 250;
          blocks.forEach(([t, rules]) => {
            g.fillStyle = '#6a1424';
            g.font = serif(38);
            g.textAlign = 'left';
            g.fillText(t, 80, y);
            y += 44;
            body(g, 27);
            rules.forEach((r) => (y = wrap(g, '· ' + r, 100, y, w - 190, 34)));
            y += 22;
          });
          g.fillStyle = '#7a5a40';
          g.font = mono(24);
          g.textAlign = 'center';
          g.fillText('Couleurs : rouge, rose, or, bleu, noir, blanc.', w / 2, h - 70);
        },
      ],
      // spread 2: keypad + simon
      [
        (g, w, h) => {
          pageBg(g, w, h, true);
          heading(g, w, 'Symboles', 'QUATRE TOUCHES · UNE SEULE COLONNE');
          body(g, 28);
          wrap(g, 'Une seule colonne contient les quatre symboles de la bombe. Appuyez sur les quatre touches dans l’ordre de cette colonne, de haut en bas.', 80, 250, w - 160, 36);
          const cw = (w - 160) / 6;
          GLYPHS.cols.forEach((col, ci) => {
            col.forEach((s, ri) => {
              const x = 80 + cw * ci + cw / 2;
              const y = 400 + ri * 128;
              g.strokeStyle = 'rgba(90,60,40,0.35)';
              g.lineWidth = 2;
              g.strokeRect(x - cw / 2 + 6, y - 58, cw - 12, 116);
              drawGlyph(g, s, x, y, 76, ink);
            });
          });
        },
        (g, w, h) => {
          pageBg(g, w, h, false);
          heading(g, w, 'Battement', 'LE CŒUR CLIGNOTE · RÉPONDEZ');
          body(g, 28);
          let y = wrap(g, 'Le cœur s’allume en une suite de couleurs. Pour chaque couleur de la suite, appuyez sur la couleur donnée par le tableau. La suite s’allonge à chaque étape. Trois étapes.', 80, 250, w - 160, 36);
          y = wrap(g, 'Attention : le tableau change avec le nombre de cœurs déjà brisés.', 80, y + 6, w - 160, 36) + 10;
          const table = (title, map, y0) => {
            g.fillStyle = '#6a1424';
            g.font = serif(34);
            g.textAlign = 'left';
            g.fillText(title, 80, y0);
            const x0 = 300;
            const cw = (w - x0 - 80) / 4;
            g.font = mono(24);
            g.fillStyle = '#7a5a40';
            g.textAlign = 'center';
            SIMON.forEach((c, i) => {
              g.fillStyle = SIMON_COL[i];
              g.fillRect(x0 + cw * i + 14, y0 + 16, cw - 28, 10);
              g.fillStyle = '#5a4030';
              g.fillText('si ' + c, x0 + cw * i + cw / 2, y0 + 56);
            });
            ['0 brisé', '1 brisé', '2 brisés'].forEach((l, r) => {
              const yy = y0 + 104 + r * 52;
              g.fillStyle = '#5a4030';
              g.textAlign = 'left';
              g.font = mono(24);
              g.fillText(l, 90, yy);
              g.font = 'bold 28px Georgia, serif';
              g.textAlign = 'center';
              map[r].forEach((v, i) => {
                g.fillStyle = ink;
                g.fillText(SIMON[v], x0 + cw * i + cw / 2, yy);
              });
            });
          };
          table('Le numéro de série contient une voyelle', SIMON_MAP[0], y + 20);
          table('Il ne contient aucune voyelle', SIMON_MAP[1], y + 300);
          g.fillStyle = '#7a5a40';
          g.font = mono(22);
          g.textAlign = 'center';
          g.fillText('Voyelles : A E I O U Y', w / 2, h - 70);
        },
      ],
    ],
    2: [
      // spread 1: valves + mazes
      [
        (g, w, h) => {
          pageBg(g, w, h, true);
          heading(g, w, 'Manuel de désamorçage', 'TOME III · LA LOCOMOTIVE');
          body(g, 33);
          let y = 260;
          y = wrap(g, 'La bombe est dans la locomotive. Vous êtes dans la voiture des machines : la chaudière souffre.', 90, y, w - 180, 44) + 16;
          y = wrap(g, 'Les trois vannes montent en pression. Si une aiguille atteint le rouge, la vapeur secoue toute la rame : la bombe compte une erreur. Maintenez E sur une vanne pour la purger.', 90, y, w - 180, 44) + 16;
          y = wrap(g, 'Lisez, courez, purgez, revenez. Celui ou celle qui tient la bombe a besoin de votre voix.', 90, y, w - 180, 44) + 30;
          g.fillStyle = '#6a1424';
          g.font = serif(40);
          g.textAlign = 'center';
          g.fillText('Modules de ce tome', w / 2, y);
          body(g, 33);
          g.textAlign = 'center';
          ['Labyrinthe · page de droite', 'Mémoire · page suivante', 'Cadran · page suivante'].forEach((l, i) => g.fillText(l, w / 2, y + 60 + i * 48));
        },
        (g, w, h) => {
          pageBg(g, w, h, false);
          heading(g, w, 'Labyrinthe', 'LES DEUX CERCLES VERTS DISENT LEQUEL');
          body(g, 26);
          wrap(g, 'Le point blanc doit rejoindre le cœur. Les murs ne se voient que dans ce manuel. Un pas dans un mur : une erreur.', 80, 245, w - 160, 32);
          const cell = 46;
          MAZES.forEach((mz, k) => {
            const ox = 90 + (k % 2) * 450;
            const oy = 340 + ((k / 2) | 0) * 330;
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.fillRect(ox - 6, oy - 6, cell * 6 + 12, cell * 6 + 12);
            g.strokeStyle = ink;
            g.lineWidth = 5;
            g.strokeRect(ox, oy, cell * 6, cell * 6);
            for (let c = 0; c < 36; c++) {
              const x = ox + (c % 6) * cell;
              const y = oy + ((c / 6) | 0) * cell;
              g.lineWidth = 5;
              g.beginPath();
              if (!(mz.open[c] & 2) && c % 6 < 5) {
                g.moveTo(x + cell, y);
                g.lineTo(x + cell, y + cell);
              }
              if (!(mz.open[c] & 4) && c < 30) {
                g.moveTo(x, y + cell);
                g.lineTo(x + cell, y + cell);
              }
              g.stroke();
              g.fillStyle = 'rgba(42,24,16,0.35)';
              g.beginPath();
              g.arc(x + cell / 2, y + cell / 2, 3, 0, TAU);
              g.fill();
              if (mz.marks.includes(c)) {
                g.strokeStyle = '#1f8a4a';
                g.lineWidth = 5;
                g.beginPath();
                g.arc(x + cell / 2, y + cell / 2, 15, 0, TAU);
                g.stroke();
                g.strokeStyle = ink;
              }
            }
          });
        },
      ],
      // spread 2: memory + dial
      [
        (g, w, h) => {
          pageBg(g, w, h, true);
          heading(g, w, 'Mémoire', 'TROIS ÉTAPES · NOTEZ CE QUI A ÉTÉ PRESSÉ');
          body(g, 28);
          let y = wrap(g, 'Un grand chiffre s’affiche à l’écran ; quatre boutons portent des étiquettes. Les positions se comptent de gauche à droite. Retenez, à chaque étape, la position et l’étiquette du bouton pressé.', 80, 250, w - 160, 36) + 12;
          y = wrap(g, 'Une erreur : le module repart de l’étape 1.', 80, y, w - 160, 36) + 20;
          MEMO_TXT.forEach((rules, i) => {
            g.fillStyle = '#6a1424';
            g.font = serif(36);
            g.textAlign = 'left';
            g.fillText('Étape ' + (i + 1), 80, y);
            y += 42;
            body(g, 27);
            rules.forEach((r) => (y = wrap(g, '· ' + r, 100, y, w - 190, 34)));
            y += 18;
          });
        },
        (g, w, h) => {
          pageBg(g, w, h, false);
          heading(g, w, 'Cadran', 'LISEZ LES CŒURS ALLUMÉS · TOURNEZ LE BOUTON');
          body(g, 27);
          wrap(g, 'Deux rangées de six petits cœurs. Trouvez le motif allumé ci-dessous, tournez le bouton jusqu’au symbole indiqué, puis validez.', 80, 245, w - 160, 34);
          DIAL_PAT.forEach(([pat, s], k) => {
            const ox = 110 + (k % 2) * 450;
            const oy = 400 + ((k / 2) | 0) * 250;
            for (let i = 0; i < 12; i++) {
              const x = ox + (i % 6) * 46;
              const y = oy + ((i / 6) | 0) * 52;
              g.fillStyle = pat[i] === '1' ? '#c8244a' : 'rgba(42,24,16,0.18)';
              heartPath(g, x, y, 20);
              g.fill();
            }
            g.fillStyle = '#7a5a40';
            g.font = mono(26);
            g.textAlign = 'left';
            g.fillText('→', ox + 280, oy + 32);
            drawGlyph(g, s, ox + 345, oy + 24, 58, ink);
          });
        },
      ],
    ],
  };
  const buildLectern = (k, pos) => {
    const g = new THREE.Group();
    g.position.copy(P(pos.x, 0, pos.z));
    group.add(g);
    // a carved stand, slanted top
    const foot = new THREE.Mesh(bx(0.8, 0.1, 0.6), mahogany);
    foot.position.y = 0.05;
    g.add(foot);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.0, 16), mahogany);
    post.position.y = 0.55;
    g.add(post);
    const top = new THREE.Group();
    top.position.set(0, 1.12, 0);
    top.rotation.x = -0.55;
    g.add(top);
    const board = new THREE.Mesh(bx(PAGE_W * 2 + 0.2, 0.05, PAGE_H + 0.16), mahogany);
    top.add(board);
    const lip = new THREE.Mesh(bx(PAGE_W * 2 + 0.2, 0.06, 0.04), brass);
    lip.position.set(0, 0.04, PAGE_H / 2 + 0.08);
    top.add(lip);
    // the book: leather cover, two page planes, and a page that turns
    const cover = new THREE.Mesh(bx(PAGE_W * 2 + 0.08, 0.04, PAGE_H + 0.06), velvet);
    cover.position.y = 0.045;
    top.add(cover);
    const mats = [canvasMat(1100, 1520, () => {}, { k: 0.78 }), canvasMat(1100, 1520, () => {}, { k: 0.78 })];
    // flat on the board, text upright for the reader standing on the -z side (whose right is -x)
    const flat = (w, h) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(Math.PI);
    const pages = [-1, 1].map((sd, i) => {
      const p = new THREE.Mesh(flat(PAGE_W, PAGE_H), mats[i]);
      p.position.set((-sd * PAGE_W) / 2, 0.07, 0);
      top.add(p);
      return p;
    });
    // closed look for whoever is not the reader: a cover with a club
    const closed = new THREE.Mesh(
      flat(PAGE_W * 2, PAGE_H),
      canvasMat(2200, 1520, (gg, w, h) => {
        gg.fillStyle = '#3a0a16';
        gg.fillRect(0, 0, w, h);
        noise(gg, w, h, 30000, 0.06);
        gg.strokeStyle = '#b8862f';
        gg.lineWidth = 14;
        gg.strokeRect(60, 60, w - 120, h - 120);
        gg.fillStyle = '#b8862f';
        Icons.draw(gg, 'club', w / 2, h / 2 - 80, 380);
        gg.font = serif(110);
        gg.textAlign = 'center';
        gg.fillText('Manuel · Tome ' + (k === 1 ? 'II' : 'III'), w / 2, h - 260);
      }, { k: 0.7 }),
    );
    closed.position.y = 0.072;
    top.add(closed);
    const turn = new THREE.Group();
    top.add(turn);
    const turnPage = new THREE.Mesh(
      new THREE.PlaneGeometry(PAGE_W, PAGE_H).translate(PAGE_W / 2, 0, 0),
      new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.9, side: THREE.DoubleSide }),
    );
    turnPage.rotation.x = -Math.PI / 2;
    turn.add(turnPage);
    turn.position.y = 0.075;
    turn.visible = false;
    // a reading lamp
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), brass);
    arm.position.set(PAGE_W + 0.15, 1.4, -0.25);
    arm.rotation.z = 0.4;
    g.add(arm);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(PAGE_W - 0.05, 1.7, -0.25);
    shade.rotation.z = 0.9;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), glow('#ffe0b0', 1.0));
    bulb.position.set(PAGE_W - 0.1, 1.64, -0.25);
    g.add(bulb);
    K.collider(pos.x, 0.6, pos.z, 0.9, 1.2, 0.7);
    books[k] = { g, top, mats, pages, closed, turn, spread: -1, flip: 0, dir: 1 };
  };
  const setSpread = (k, s) => {
    const b = books[k];
    if (b.spread === s) return;
    b.spread = s;
    const sp = PAGES[k][s];
    redraw(b.mats[0], (g, w, h) => sp[0](g, w, h));
    redraw(b.mats[1], (g, w, h) => sp[1](g, w, h));
  };

  // ================= valves =================
  const gaugeMat = () =>
    canvasMat(512, 512, (g, w, h) => {
      g.fillStyle = '#efe6d2';
      g.beginPath();
      g.arc(w / 2, h / 2, 240, 0, TAU);
      g.fill();
      g.strokeStyle = '#2a1a10';
      g.lineWidth = 12;
      g.stroke();
      // the scale: green, amber, red
      [
        ['#3a9a5a', -2.3, 0.2],
        ['#d89a2a', 0.2, 1.3],
        ['#c8243c', 1.3, 2.3],
      ].forEach(([c, a0, a1]) => {
        g.strokeStyle = c;
        g.lineWidth = 34;
        g.beginPath();
        g.arc(w / 2, h / 2, 180, a0 - Math.PI / 2, a1 - Math.PI / 2);
        g.stroke();
      });
      g.fillStyle = '#2a1a10';
      g.font = mono(36);
      g.textAlign = 'center';
      g.fillText('PRESSION', w / 2, h / 2 + 120);
    });
  const buildValve = (i, pos) => {
    const sd = pos.x < 0 ? -1 : 1;
    const g = new THREE.Group();
    g.position.copy(P(pos.x, 0, pos.z));
    group.add(g);
    // the pipe from floor to ceiling, a flange, the wheel facing the aisle
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, CH, 18), copper);
    pipe.position.set(sd * 0.25, CH / 2, 0);
    g.add(pipe);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 18), brass);
    flange.position.set(sd * 0.25, 1.2, 0);
    g.add(flange);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 10), steel);
    stem.rotation.z = Math.PI / 2;
    stem.position.set(sd * 0.05, 1.2, 0);
    g.add(stem);
    const wheel = new THREE.Group();
    wheel.position.set(-sd * 0.15, 1.2, 0);
    wheel.rotation.y = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 32), new THREE.MeshStandardMaterial({ color: '#8a1a26', roughness: 0.5 }));
    wheel.add(ring);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 6), steel);
      sp.rotation.z = (k / 4) * Math.PI;
      wheel.add(sp);
    }
    g.add(wheel);
    const gm = gaugeMat();
    const gauge = plane(0.42, 0.42, gm);
    gauge.position.set(-sd * 0.02, 1.95, 0);
    gauge.rotation.y = -sd * Math.PI / 2;
    g.add(gauge);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.02, 8, 32), brass);
    rim.position.copy(gauge.position);
    rim.rotation.y = gauge.rotation.y;
    g.add(rim);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.17, 0.01).translate(0, 0.07, 0), new THREE.MeshBasicMaterial({ color: '#1a0a08' }));
    needle.position.copy(gauge.position).add(V3(-sd * 0.012, 0, 0));
    needle.rotation.y = gauge.rotation.y;
    g.add(needle);
    const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), glow('#3a1a10', 1));
    lampM.position.set(-sd * 0.05, 2.32, 0);
    g.add(lampM);
    K.collider(pos.x + sd * 0.2, CH / 2, pos.z, 0.5, CH, 0.5);
    valves.push({ g, wheel, needle, lamp: lampM, p: 0, spin: 0, pos: P(pos.x - sd * 0.6, 1.2, pos.z), sd });
  };

  // ================= the two keys (last module) =================
  const buildKeyPost = (who) => {
    const pos = KEYS[who];
    const g = new THREE.Group();
    g.position.copy(P(pos.x, 0, pos.z));
    group.add(g);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.0, 20), brass);
    col.position.y = 0.5;
    g.add(col);
    const head = new THREE.Mesh(bx(0.42, 0.62, 0.3), iron);
    head.position.y = 1.3;
    g.add(head);
    const cap = new THREE.Mesh(bx(0.46, 0.05, 0.34), brass);
    cap.position.y = 1.63;
    g.add(cap);
    // the keyhole plate and the key face whoever stands behind the post (the -z side)
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), brass);
    plate.position.set(0, 1.12, -0.152);
    plate.rotation.y = Math.PI;
    g.add(plate);
    const key = new THREE.Group();
    key.position.set(0, 1.12, -0.16);
    key.rotation.y = Math.PI;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8).rotateX(Math.PI / 2), steel);
    shaft.position.z = 0.06;
    key.add(shaft);
    const bow = new THREE.Mesh(
      new THREE.ExtrudeGeometry(heartShape(0.06), { depth: 0.015, bevelEnabled: false }).translate(0, 0, 0.11),
      new THREE.MeshStandardMaterial({ color: who === 'dame' ? '#c83a64' : '#3a6ad0', roughness: 0.4, metalness: 0.2 }),
    );
    key.add(bow);
    g.add(key);
    // the digit window above: only drawn on its owner's screen
    const digMat = canvasMat(512, 512, () => {});
    const dig = plane(0.3, 0.3, digMat);
    dig.position.set(0, 1.42, -0.168);
    dig.rotation.y = Math.PI;
    g.add(dig);
    const shutter = new THREE.Mesh(bx(0.32, 0.32, 0.01), darkPanel);
    shutter.position.set(0, 1.42, -0.157);
    g.add(shutter);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.52, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(who === 'dame' ? '#ff5f8a' : '#6cc8ff').multiplyScalar(0.7), transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }),
    );
    ring.position.set(0, 0.02, -0.95);
    g.add(ring);
    K.collider(pos.x, 0.85, pos.z, 0.44, 1.7, 0.34);
    keyPosts[who] = { g, key, digMat, dig, ring, turn: 0, digit: 0 };
  };
  const drawDigit = (who, n, lit) =>
    redraw(keyPosts[who].digMat, (g, w, h) => {
      g.fillStyle = '#07040a';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = who === 'dame' ? '#ff5f8a' : '#6cc8ff';
      g.lineWidth = 16;
      g.strokeRect(20, 20, w - 40, h - 40);
      g.fillStyle = lit ? '#3fe08a' : '#ffe2b0';
      g.font = 'bold 330px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(n ? String(n) : '·', w / 2, h / 2 + 20);
    });

  // ================= outside: the land rushing past =================
  const buildScenery = () => {
    const sc = { trees: null, poles: null, sleepers: null, offset: 0, ground: null, tunnel: null };
    const groundTex = LvKit.tex(512, 512, (g, w, h) => {
      g.fillStyle = '#121a14';
      g.fillRect(0, 0, w, h);
      // fields in long rows, a few dark hedges
      for (let k = 0; k < 8; k++) {
        g.fillStyle = ['#16211a', '#1a2418', '#141c18', '#1c2216'][k % 4];
        g.fillRect(0, (k * h) / 8, w, h / 8);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.fillRect(0, (k * h) / 8 + i * 1.6, w, 0.6);
        }
      }
      noise(g, w, h, 20000, 0.08);
    }, 60, 60);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
    ground.position.copy(P(0, -1.6, 40));
    group.add(ground);
    sc.ground = groundTex;
    // ballast and two rails under the train
    const ballastTex = LvKit.tex(256, 512, (g, w, h) => {
      g.fillStyle = '#2a2628';
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 30000, 0.25);
    }, 1, 120);
    const ballast = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 900).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 1 }));
    ballast.position.copy(P(0, -1.55, 40));
    group.add(ballast);
    sc.ballast = ballastTex;
    [-0.75, 0.75].forEach((x) => deco(0.08, 0.14, 900, steel, x, -1.3, 40));
    const sleeperGeo = bx(2.6, 0.12, 0.25);
    sc.sleepers = new THREE.InstancedMesh(sleeperGeo, mahogany, 600);
    sc.sleepers.frustumCulled = false;
    group.add(sc.sleepers);
    // poles and their wires
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9, 8).translate(0, 4.5, 0);
    sc.poles = new THREE.InstancedMesh(poleGeo, mahogany, 24);
    sc.poles.frustumCulled = false;
    group.add(sc.poles);
    const barGeo = bx(1.8, 0.12, 0.12);
    sc.bars = new THREE.InstancedMesh(barGeo, mahogany, 24);
    sc.bars.frustumCulled = false;
    group.add(sc.bars);
    [-0.7, 0, 0.7].forEach((dx) => deco(0.02, 0.02, 1000, iron, 7 + dx, 6.8, 40));
    // trees: dark pines at every distance, so near ones whip past and far ones drift
    const r = rng(551);
    const treeGeo = new THREE.ConeGeometry(1.6, 6, 7).translate(0, 4, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.4, 6).translate(0, 0.7, 0);
    const N = 700;
    sc.trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: '#0e1e16', roughness: 0.9 }), N);
    sc.trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.9 }), N);
    sc.trees.frustumCulled = sc.trunks.frustumCulled = false;
    group.add(sc.trees, sc.trunks);
    sc.treeData = Array.from({ length: N }, () => {
      const side = r() < 0.5 ? -1 : 1;
      const x = side * (11 + Math.pow(r(), 1.6) * 260);
      return { x, z: r() * 900 - 420, s: 0.6 + r() * 1.3 };
    });
    // far hills, still (too far to move)
    const hillMat = new THREE.MeshStandardMaterial({ color: '#0c1410', roughness: 1 });
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * TAU;
      const d = 520 + r() * 260;
      const h = new THREE.Mesh(new THREE.ConeGeometry(90 + r() * 120, 60 + r() * 90, 6), hillMat);
      h.position.copy(P(Math.sin(a) * d, 10, 40 + Math.cos(a) * d));
      group.add(h);
    }
    // far villages: clusters of warm windows in the dark
    const vill = [];
    for (let k = 0; k < 14; k++) {
      const a = r() * TAU;
      const d = 160 + r() * 380;
      const cx = Math.sin(a) * d;
      const cz = Math.cos(a) * d;
      for (let n = 0; n < 30; n++) vill.push(cx + (r() - 0.5) * 40, -1 + r() * 6, 40 + cz + (r() - 0.5) * 40);
    }
    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(vill, 3));
    const village = new THREE.Points(vg, new THREE.PointsMaterial({ color: new THREE.Color('#ffc070').multiplyScalar(0.8), size: 1.6, sizeAttenuation: true, toneMapped: false }));
    village.position.copy(O);
    group.add(village);
    sc.village = village;
    // the tunnel (the last module): an arch tube with lamps that comes from ahead
    const tun = new THREE.Group();
    group.add(tun);
    const archGeo = new THREE.CylinderGeometry(6.2, 6.2, 20, 28, 1, true).rotateX(Math.PI / 2);
    const stoneTex = LvKit.tex(512, 512, (g, w, h) => {
      g.fillStyle = '#26222a';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 6; x++) {
          g.fillStyle = `rgba(${40 + Math.random() * 20},${36 + Math.random() * 16},${44 + Math.random() * 16},1)`;
          g.fillRect(x * 86 + (y % 2) * 43 + 3, y * 64 + 3, 80, 58);
        }
      noise(g, w, h, 10000, 0.1);
    }, 4, 2);
    // dark: the moon reaches in here too (no shadows)
    const archMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: '#5a5260', roughness: 0.95, side: THREE.BackSide });
    const segs = [];
    const lampGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const lampMat = glow('#ffb070', 1.05);
    for (let k = 0; k < 70; k++) {
      const s = new THREE.Group();
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.y = 1.0;
      s.add(arch);
      [-1, 1].forEach((sd) => {
        const l = new THREE.Mesh(lampGeo, lampMat);
        l.position.set(sd * 5.2, 2.6, 0);
        s.add(l);
      });
      tun.add(s);
      segs.push(s);
    }
    // the portal facing the train
    const portalMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: '#6a6270', roughness: 0.95, side: THREE.DoubleSide });
    const portal = new THREE.Mesh(new THREE.RingGeometry(6.2, 16, 40), portalMat);
    portal.position.y = 1.0;
    tun.add(portal);
    // the hillside the tunnel goes into
    [-1, 1].forEach((sd) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(70, 50, 1400), new THREE.MeshStandardMaterial({ color: '#0c1410', roughness: 1 }));
      side.position.set(sd * (6.5 + 35), 10, 700);
      tun.add(side);
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(14, 40, 1400), new THREE.MeshStandardMaterial({ color: '#0c1410', roughness: 1 }));
    top.position.set(0, 7.4 + 20, 700);
    tun.add(top);
    tun.visible = false;
    sc.tunnel = { g: tun, segs, portal, d: 1e9, len: 70 * 20 };
    return sc;
  };
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpS = V3();
  const tmpP = V3();
  const updateScenery = (dt, t, inTunnel) => {
    const sc = scenery;
    const dz = SPEED * dt;
    sc.offset += dz;
    sc.ground.offset.y = (sc.ground.offset.y + (dz / 2400) * 60) % 1;
    sc.ballast.offset.y = (sc.ballast.offset.y + (dz / 900) * 120) % 1;
    // sleepers every 0.75 m, the wheel of the world
    const base = sc.offset % 0.75;
    for (let i = 0; i < 600; i++) {
      tmpP.set(O.x, O.y - 1.45, O.z - 180 + i * 0.75 - base);
      tmpM.makeTranslation(tmpP.x, tmpP.y, tmpP.z);
      sc.sleepers.setMatrixAt(i, tmpM);
    }
    sc.sleepers.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 24; i++) {
      const z = ((((i * 40 - sc.offset) % 960) + 960) % 960) - 420;
      tmpM.makeTranslation(O.x + 7, O.y - 1.6, O.z + z);
      sc.poles.setMatrixAt(i, tmpM);
      tmpM.makeTranslation(O.x + 7, O.y + 6.9, O.z + z);
      sc.bars.setMatrixAt(i, tmpM);
    }
    sc.poles.instanceMatrix.needsUpdate = true;
    sc.bars.instanceMatrix.needsUpdate = true;
    sc.treeData.forEach((d, i) => {
      const z = ((((d.z - sc.offset) % 900) + 900) % 900) - 420;
      tmpP.set(O.x + d.x, O.y - 1.6, O.z + z);
      tmpS.setScalar(inTunnel ? 0.0001 : d.s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      sc.trees.setMatrixAt(i, tmpM);
      sc.trunks.setMatrixAt(i, tmpM);
    });
    sc.trees.instanceMatrix.needsUpdate = true;
    sc.village.visible = !inTunnel;
    sc.trunks.instanceMatrix.needsUpdate = true;
    // the tunnel
    const tu = sc.tunnel;
    if (tu.d < 1e8) {
      tu.d -= dz;
      tu.g.visible = tu.d < 900 && tu.d + tu.len > -400;
      tu.g.position.set(O.x, O.y, O.z + 88 + tu.d);
      tu.segs.forEach((s, k) => (s.position.z = k * 20 + 10));
    }
  };

  // ================= confetti, the boom =================
  const buildConfetti = () => {
    const N = 900;
    const geo = new THREE.ShapeGeometry(heartShape(0.07));
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.InstancedMesh(geo, mat, N);
    m.frustumCulled = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    group.add(m);
    const parts = Array.from({ length: N }, () => ({ life: 0, p: V3(), v: V3(), r: V3(), w: V3() }));
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) m.setMatrixAt(i, hide);
    confetti = { m, parts, head: 0, N, hide };
    // the shockwave ring of a boom
    shock = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.0, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8244a').multiplyScalar(0.8), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    );
    shock.visible = false;
    group.add(shock);
    // a red screen pulse (only on the screens near the bomb)
    flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(255,60,110,0.55),rgba(120,0,30,0.65));opacity:0;transition:opacity .9s ease-out;z-index:5';
    document.body.appendChild(flash);
  };
  const PAL_HAPPY = ['#ff5f8a', '#ffb0c8', '#e0ad52', '#b07cff', '#6cc8ff', '#c8244a'];
  const PAL_BOOM = ['#c8243c', '#ff3b55', '#7a1028', '#ff6f9a', '#3a0a14'];
  const burst = (pos, n, pal, speed, up = 2) => {
    const c = confetti;
    const col = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const i = c.head;
      c.head = (c.head + 1) % c.N;
      const p = c.parts[i];
      p.life = 3.5 + Math.random() * 2.5;
      p.p.copy(pos);
      p.v.set(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      p.v.y += up;
      p.r.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      p.w.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
      // never above 0.8: they stay coloured under the bloom
      col.set(pick(pal)).multiplyScalar(0.55 + Math.random() * 0.25);
      c.m.setColorAt(i, col);
    }
    c.m.instanceColor.needsUpdate = true;
  };
  const eul = new THREE.Euler();
  const updateConfetti = (dt) => {
    const c = confetti;
    let any = false;
    c.parts.forEach((p, i) => {
      if (p.life <= 0) return;
      any = true;
      p.life -= dt;
      p.v.y -= 5.5 * dt;
      p.v.multiplyScalar(1 - 1.6 * dt);
      p.p.addScaledVector(p.v, dt);
      const floor = O.y + 0.03;
      if (p.p.y < floor) {
        p.p.y = floor;
        p.v.set(0, 0, 0);
        p.w.multiplyScalar(0.9);
      }
      p.r.addScaledVector(p.w, dt);
      eul.set(p.r.x, p.r.y, p.r.z);
      tmpQ.setFromEuler(eul);
      tmpS.setScalar(p.life <= 0 ? 0 : Math.min(1, p.life * 2));
      tmpM.compose(p.p, tmpQ, tmpS);
      c.m.setMatrixAt(i, tmpM);
    });
    if (any) c.m.instanceMatrix.needsUpdate = true;
    if (shock.visible) {
      shock.userData.t += dt;
      const k = shock.userData.t / 0.9;
      shock.scale.setScalar(1 + k * 9);
      shock.material.opacity = Math.max(0, 0.75 * (1 - k));
      if (k >= 1) shock.visible = false;
    }
  };

  // ================= build =================
  const build = () => {
    group.visible = true;
    if (built) return;
    built = true;

    // ===== car A · the salon-library =====
    carShell(0, 22, carpet, marquetry, marquetry, mahogany);
    endWall(0, marquetry);
    endWall(22, marquetry);
    bogie(4);
    bogie(18);
    // armchairs by the windows, little tables with lamps, bookshelves under the windows
    [4, 8, 18].forEach((z, i) => {
      armchair(-2.3, z, Math.PI / 2);
      armchair(2.3, z + 1.4, -Math.PI / 2);
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 24), mahogany);
      tb.position.copy(P(-2.4, 0.66, z + 1.2));
      group.add(tb);
      deco(0.06, 0.64, 0.06, brass, -2.4, 0.32, z + 1.2);
      K.collider(-2.4, 0.35, z + 1.2, 0.6, 0.7, 0.6);
      const tl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), glow('#ffd2a0', 1.05));
      tl.position.copy(P(-2.4, 0.86, z + 1.2));
      group.add(tl);
      void i;
    });
    bookshelf(-2.75, 11.5, Math.PI / 2, 2.6);
    bookshelf(2.75, 11.5, -Math.PI / 2, 2.6);
    K.collider(-2.75, 0.5, 11.5, 0.45, 1, 2.6);
    K.collider(2.75, 0.5, 11.5, 0.45, 1, 2.6);
    buildLectern(1, LECTERN[1]);
    // the bar at the back
    solid(0, 0.55, 1.2, 3.2, 1.1, 0.7, mahogany);
    deco(3.3, 0.06, 0.8, brass, 0, 1.12, 1.2);
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.32, 10), new THREE.MeshStandardMaterial({ color: ['#2a5a3a', '#5a1a2a', '#3a2a10'][k % 3], roughness: 0.15, transparent: true, opacity: 0.85 }));
      b.position.copy(P(-1.2 + k * 0.4, 1.31, 1.2));
      group.add(b);
    }
    lamp(-1.7, CH, 6);
    lamp(1.7, CH, 6);
    lamp(-1.7, CH, 12);
    lamp(1.7, CH, 12);
    lamp(-1.7, CH, 18);
    lamp(1.7, CH, 18);
    [5, 11, 17].forEach((z) => {
      sconce(-HW + 0.02, 2.0, z, 0);
      sconce(HW - 0.02, 2.0, z, Math.PI);
    });
    repeaters[1] = makeScreen(2.2, 0.8, 1024);
    repeaters[1].mesh.position.copy(P(0, 3.15, 21.83));
    repeaters[1].mesh.rotation.y = Math.PI;
    group.add(repeaters[1].mesh);
    gangway(22, 24, 23);

    // ===== car B · the luggage van =====
    carShell(24, 46, planks, plates, plates, iron);
    endWall(24, plates);
    endWall(46, plates);
    bogie(28);
    bogie(42);
    crate(-2.3, 26.5, 1.1, 0.1);
    crate(-2.4, 27.8, 0.9, -0.2, 0.9);
    crate(2.3, 27, 1.2, 0.05);
    crate(2.35, 43.2, 1.1, -0.1);
    crate(-2.3, 43.6, 1.0, 0.25);
    crate(-2.35, 42.4, 0.8, 0, 1.6);
    // trunks and suitcases with travel labels
    [
      [2.35, 30.5],
      [-2.35, 31],
      [2.4, 39.5],
    ].forEach(([x, z], k) => {
      deco(0.8, 0.5, 1.0, velvet, x, 0.25, z);
      deco(0.84, 0.06, 1.04, brass, x, 0.5, z);
      K.collider(x, 0.25, z, 0.8, 0.5, 1.0);
      void k;
    });
    // cargo nets on the walls
    [-1, 1].forEach((sd) => {
      for (let k = 0; k < 9; k++) deco(0.02, 1.2, 0.02, iron, sd * (HW - 0.05), 3.0, 30 + k * 1.2);
      for (let k = 0; k < 4; k++) deco(0.02, 0.02, 10, iron, sd * (HW - 0.05), 2.45 + k * 0.38, 35);
    });
    lamp(-1.7, CH, 29);
    lamp(1.7, CH, 29);
    lamp(-1.6, CH, 35);
    lamp(1.6, CH, 35);
    lamp(-1.7, CH, 41);
    lamp(1.7, CH, 41);
    gangway(46, 48, 47);

    // ===== car C · the machine car =====
    carShell(48, 66, checker, plates, plates, iron);
    endWall(48, plates);
    endWall(66, plates);
    bogie(52);
    bogie(62);
    buildLectern(2, LECTERN[2]);
    VALVES.forEach((v, i) => buildValve(i, v));
    // the boiler drums and pipes along the walls
    [-1, 1].forEach((sd) => {
      deco(0.14, 0.14, 18, copper, sd * (HW - 0.12), 3.2, 57);
      deco(0.1, 0.1, 18, copper, sd * (HW - 0.12), 2.95, 57);
    });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 24), steel);
    drum.rotation.x = Math.PI / 2;
    drum.position.copy(P(2.2, 0.75, 54));
    group.add(drum);
    K.collider(2.2, 0.75, 54, 1.4, 1.5, 2.2);
    lamp(-1.7, CH, 51, '#ffc890');
    lamp(1.7, CH, 51, '#ffc890');
    lamp(-1.7, CH, 57.5, '#ffc890');
    lamp(1.7, CH, 57.5, '#ffc890');
    lamp(-1.7, CH, 63, '#ffc890');
    lamp(1.7, CH, 63, '#ffc890');
    repeaters[2] = makeScreen(2.2, 0.8, 1024);
    repeaters[2].mesh.position.copy(P(0, 3.15, 65.83));
    repeaters[2].mesh.rotation.y = Math.PI;
    group.add(repeaters[2].mesh);
    gangway(66, 68, 67);

    // ===== car D · the locomotive =====
    carShell(68, 88, checker, plates, plates, iron);
    endWall(68, plates);
    bogie(72);
    bogie(84);
    // the front: a windshield onto the track and the night ahead
    solid(0, 0.6, 88.15, HW * 2 + 0.4, 1.2, 0.3, iron);
    solid(0, 3.25, 88.15, HW * 2 + 0.4, 1.1, 0.3, iron);
    K.collider(0, 1.95, 88.15, HW * 2 + 0.4, 1.5, 0.3);
    const ws = plane(HW * 2, 1.5, glass);
    ws.position.copy(P(0, 1.95, 88.05));
    ws.rotation.y = Math.PI;
    group.add(ws);
    [-1.5, 0, 1.5].forEach((x) => deco(0.12, 1.5, 0.2, iron, x, 1.95, 88.05));
    // the controls: a desk of levers and gauges
    solid(0, 0.55, 86.6, 4.4, 1.1, 0.9, iron);
    for (let k = 0; k < 5; k++) {
      const lv = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), brass);
      lv.position.copy(P(-1.6 + k * 0.8, 1.35, 86.4));
      lv.rotation.x = -0.4;
      group.add(lv);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#8a1a26', roughness: 0.4 }));
      knob.position.copy(P(-1.6 + k * 0.8, 1.58, 86.3));
      group.add(knob);
    }
    for (let k = 0; k < 3; k++) {
      const gm = gaugeMat();
      const gp = plane(0.32, 0.32, gm);
      gp.position.copy(P(-1 + k, 1.3, 87.06));
      gp.rotation.y = Math.PI;
      gp.rotation.x = 0;
      group.add(gp);
    }
    // the firebox glow on the right
    solid(2.3, 0.9, 82.5, 1.2, 1.8, 1.6, iron);
    const fire = plane(0.7, 0.45, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a').multiplyScalar(0.8), toneMapped: false }));
    fire.position.copy(P(1.68, 0.8, 82.5));
    fire.rotation.y = -Math.PI / 2;
    group.add(fire);
    lamps.push({ g: fire, ph: 0, fire: true });
    lamp(-1.7, CH, 74, '#ffc890');
    lamp(1.7, CH, 74, '#ffc890');
    lamp(-1.7, CH, 81, '#ffc890');
    lamp(1.7, CH, 81, '#ffc890');
    buildKeyPost('dame');
    buildKeyPost('valet');

    // ===== the bomb, scenery, the finale =====
    buildBomb();
    scenery = buildScenery();
    buildConfetti();
    card = LvKit.card('5', '♣', false);
    card.position.copy(P(0, 3.4, BOMB_Z[2]));
    group.add(card);
    heart = Heart.galaxy(5200, 1.5, 61);
    heart.group.position.copy(P(0, 26, 230));
    heart.group.rotation.y = Math.PI;
    heart.U.uForm.value = 0;
    heart.core.material.opacity = 0;
    group.add(heart.group);
    heart.group.visible = false;
    // one soft light per car
    lights.push(LvKit.light(group, P(0, 3.1, 11), '#ffd2a0', 1.3, 20));
    lights.push(LvKit.light(group, P(0, 3.1, 35), '#ffd2a0', 1.3, 20));
    lights.push(LvKit.light(group, P(0, 3.1, 57), '#ffc890', 1.2, 18));
    lights.push(LvKit.light(group, P(0, 3.1, 78), '#ffc890', 1.3, 20));
  };

  // ================= per frame =================
  const fmt = (s) => {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  let lastTimer = '';
  let lastSerial = '';
  let lastDigits = '';
  const update = (dt, t, x, role, L) => {
    if (!built) return;
    // the train sways a little and the land runs past
    updateScenery(dt, t, L.inTunnel);
    wheels.forEach((w) => (w.rotation.x -= dt * SPEED / 0.45));
    lamps.forEach((l) => {
      if (l.fire) {
        l.g.material.color.set('#ff7a2a').multiplyScalar(0.6 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05);
        return;
      }
      l.g.rotation.z = Math.sin(t * 1.7 + l.ph) * 0.06 + (L.shake || 0) * Math.sin(t * 30) * 0.2;
      l.g.rotation.x = Math.sin(t * 1.3 + l.ph * 2) * 0.03;
    });
    // tunnel lamps flashing past light up the cars
    const tunnelK = L.inTunnel ? 0.75 + 0.25 * Math.max(0, Math.sin(((scenery.offset % 20) / 20) * TAU)) : 1;
    lights.forEach((l, i) => (l.intensity = (i === 3 ? 1.3 : 1.25) * tunnelK * (L.flicker ? 0.4 + Math.random() * 0.6 : 1)));
    // doors
    doors.forEach((d, i) => {
      const want = L.doorOpen[i] ? 1 : 0;
      d.open = damp(d.open, want, 5, dt);
      d.leaves.forEach((lf) => (lf.g.position.x = O.x + lf.sd * (0.65 + d.open * 1.2)));
      d.col.on = !L.doorPass[i];
      d.lamps.forEach((lm) => lm.material.color.set(L.doorPass[i] ? '#3fe08a' : '#ff3b55').multiplyScalar(1.1));
    });
    // the bomb rolls to the locomotive between the two phases
    const bz = L.bombZ;
    bomb.g.position.z = O.z + bz;
    bombCol[0].on = !L.moving && Math.abs(bz - BOMB_Z[1]) < 0.5;
    bombCol[1].on = !L.moving && Math.abs(bz - BOMB_Z[2]) < 0.5;
    bomb.vial.material.emissive.set(L.danger ? '#a0183a' : '#5a0f24').multiplyScalar(L.danger ? 0.6 + 0.4 * Math.sin(t * 12) : 1);
    // timer and strikes
    const tk = fmt(L.time) + '/' + x.strikes + '/' + (L.timeCol || '');
    if (tk !== lastTimer) {
      lastTimer = tk;
      drawTimer(L.time == null ? '-:--' : fmt(L.time), x.strikes || 0, L.timeCol || '#ff6f9a');
    }
    if ((x.serial || '') !== lastSerial) {
      lastSerial = x.serial || '';
      drawSerial(x.serial);
    }
    // slots: the active phase's modules, flipped to face the defuser
    slots.forEach((sl, i) => {
      sl.flip = damp(sl.flip, L.face, 3, dt);
      sl.pivot.rotation.y = sl.flip * Math.PI;
      [0, 1].forEach((f) => {
        const face = sl.faces[f];
        const m = x.mods && x.mods[f] ? x.mods[f][i] : null;
        const key = m ? JSON.stringify(m) + (f === 1 ? '' : '') : 'none';
        if (key !== face.key) {
          const kind = m ? m.k + (m.w ? m.w.join('') : '') + (m.g ? m.g.join('') : '') : '';
          if (kind !== face.kind) {
            face.kind = kind;
            buildParts(face, m, x.serial);
          }
          face.key = key;
          drawFace(face, m, x.serial, x.strikes, true, -1);
        }
        face.led.material.color.set(m && m.solved ? '#3fe08a' : '#4a1a22').multiplyScalar(m && m.solved ? 1.0 : 0.8);
        const dyn = face.dyn || {};
        if (dyn.wires && m)
          dyn.wires.forEach((hv, k) => {
            const cut = m.cut.includes(k);
            hv[0].rotation.z = damp(hv[0].rotation.z, cut ? -0.5 : 0, 6, dt);
            hv[1].rotation.z = damp(hv[1].rotation.z, cut ? 0.5 : 0, 6, dt);
            hv[0].scale.x = hv[1].scale.x = damp(hv[0].scale.x, cut ? 0.82 : 1, 6, dt);
          });
        if (dyn.keys && m)
          dyn.keys.forEach((kk, k) => {
            const on = m.pressed.includes(k) || m.solved;
            kk.press = Math.max(0, kk.press - dt * 3);
            kk.cap.position.z = 0.018 - (on ? 0.012 : 0) - kk.press * 0.01;
            kk.gl.position.z = kk.cap.position.z + 0.019;
            kk.led.material.color.set(on ? '#3fe08a' : '#2a1416');
          });
        if (dyn.simon && m) {
          const fl = f === L.face ? L.simonFlash : -1;
          dyn.simon.forEach((sb, q) => {
            sb.lit = Math.max(0, sb.lit - dt * 4);
            const k = Math.max(fl === q ? 1 : 0, sb.lit);
            sb.mat.color.copy(sb.base).multiplyScalar(0.25 + k * 0.6);
          });
        }
        if (dyn.memo && m)
          dyn.memo.forEach((mb, k) => {
            const lab = m.lab[k];
            if (mb.lab.userData.n !== lab) {
              mb.lab.userData.n = lab;
              mb.lab.material = numMat(lab, '#2a1820');
            }
            mb.press = Math.max(0, mb.press - dt * 3);
            mb.cap.position.z = 0.018 - mb.press * 0.012;
            mb.lab.position.z = mb.cap.position.z + 0.019;
          });
        if (dyn.knob && m) {
          const want = -(m.knob / 8) * TAU;
          let da = want - dyn.knob.rotation.z;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          dyn.knob.rotation.z += da * Math.min(1, dt * 10);
        }
      });
      // the cursor ring on the module being examined
      const show = L.focus === i && L.sel >= 0;
      sl.cursor.visible = show;
      if (show) {
        const m = x.mods[L.face][i];
        const el = elements(m)[L.sel];
        if (el) {
          sl.cursor.position.set(L.face ? -el[0] : el[0], el[1], L.face ? -0.08 : 0.08);
          sl.cursor.rotation.y = L.face ? Math.PI : 0;
          sl.cursor.scale.setScalar(m.k === 'memo' ? 1.0 : 1.4);
          if (m.k === 'wires') sl.cursor.scale.set(4.2, 0.55, 1);
        } else sl.cursor.visible = false;
        sl.cursor.material.opacity = 0.7 + Math.sin(t * 6) * 0.25;
      }
    });
    // the beat ring and the key posts
    beatRing.visible = x.stage >= 3;
    if (beatRing.visible) {
      beatRing.rotation.y = 0;
      beatRing.lamps.forEach((b, n) => {
        const on = L.beat === n + 1;
        b.material.color.set(on ? '#ffcf8a' : '#3a1420').multiplyScalar(on ? 0.85 : 1);
        b.scale.setScalar(on ? 1 + 0.25 * (1 - L.beatFrac) : 1);
      });
    }
    ['dame', 'valet'].forEach((who) => {
      const kp = keyPosts[who];
      kp.turn = damp(kp.turn, L.turned && L.turned[who] ? 1 : 0, 10, dt);
      kp.key.rotation.z = kp.turn * (Math.PI / 2);
      kp.ring.visible = x.stage === 3;
      kp.ring.material.opacity = 0.3 + Math.sin(t * 3) * 0.1;
      // the digit window only for the one standing on its side
      kp.dig.visible = x.stage === 3 && role === who;
    });
    const dk = x.stage === 3 && x.fin ? role + x.fin.round + ':' + x.fin.dig[role] : 'off';
    if (dk !== lastDigits) {
      lastDigits = dk;
      if (x.stage === 3 && x.fin) drawDigit(role, x.fin.dig[role], false);
    }
    // valves
    valves.forEach((v, i) => {
      const p = (L.press && L.press[i]) || 0;
      v.needle.rotation.x = 0;
      v.needle.rotation.z = (p * 4.6 - 2.3) * -1 * v.sd * 0 + -(p * 4.6 - 2.3);
      v.spin = Math.max(0, v.spin - dt);
      v.wheel.rotation.z += dt * (L.venting === i ? 6 : 0);
      v.lamp.material.color.set(p > 0.78 ? '#ff3b55' : p > 0.5 ? '#ffb040' : '#3a6a40').multiplyScalar(p > 0.78 ? 0.6 + 0.4 * Math.sin(t * 14) : 0.8);
    });
    // books: open only for the reader of this phase
    [1, 2].forEach((k) => {
      const b = books[k];
      const reader = L.reader === k;
      b.pages.forEach((p) => (p.visible = reader));
      b.closed.visible = !reader;
      if (reader) setSpread(k, L.spread || 0);
      if (b.flip > 0) {
        b.flip = Math.max(0, b.flip - dt * 2.2);
        b.turn.visible = reader;
        b.turn.rotation.z = b.dir > 0 ? b.flip * Math.PI : (1 - b.flip) * Math.PI;
      } else b.turn.visible = false;
    });
    // repeaters
    [1, 2].forEach((k) => {
      const r = repeaters[k];
      r.update(dt, t);
      const want = L.repeat && L.repeat[k];
      const key = want ? want.join('|') : '';
      if (r.key !== key) {
        r.key = key;
        if (want) r.show(want[0], want[1], want[2]);
        else r.show('♣ 5', 'La Bombe à cœurs II', '#7ce0ff');
      }
    });
    // the card and the heart in the sky at the end
    card.visible = x.stage >= 4 && L.cardUp > 0.1;
    if (card.visible) {
      const k1 = Math.min(1, L.cardUp * 2);
      const k2 = smooth(Math.max(0, L.cardUp * 2 - 1));
      card.position.set(O.x, O.y + lerp(2.6 + k1 * 0.9, 1.75, k2) + Math.sin(t * 2) * 0.06, O.z + bz - k2 * 2.0);
      card.rotation.y = t * 0.9;
    }
    heart.group.visible = x.stage >= 4;
    if (heart.group.visible) {
      heart.U.uForm.value = damp(heart.U.uForm.value, 1, 0.5, dt);
      heart.core.material.opacity = heart.U.uForm.value * 0.06;
      heart.U.uTime.value = t;
      heart.U.uPx.value = R.renderer.getPixelRatio() * 0.5;
    }
    updateConfetti(dt);
  };

  return {
    O,
    P,
    RULES,
    WCOL,
    SIMON,
    SIMON_COL,
    DIAL_GLYPHS,
    DIAL_PAT,
    MAZES,
    CARS,
    DOORS,
    BOMB_Z,
    LECTERN,
    VALVES,
    KEYS,
    PAGES,
    build,
    update,
    elements,
    get built() {
      return built;
    },
    slots,
    books,
    valves,
    keyPosts,
    rel: K.rel,
    hide() {
      group.visible = false;
      if (flash) flash.style.opacity = 0;
    },
    flip(k, dir) {
      const b = books[k];
      b.flip = 1;
      b.dir = dir;
    },
    pressFx(face, slot, kind, idx) {
      const fc = slots[slot].faces[face];
      const d = fc.dyn || {};
      if (kind === 'keys' && d.keys && d.keys[idx]) d.keys[idx].press = 1;
      if (kind === 'memo' && d.memo && d.memo[idx]) d.memo[idx].press = 1;
      if (kind === 'simon' && d.simon && d.simon[idx]) d.simon[idx].lit = 1;
    },
    confetti(pos, n = 420) {
      burst(pos, n, PAL_HAPPY, 7, 3);
    },
    boom(pos, near) {
      burst(pos, 360, PAL_BOOM, 11, 2);
      shock.position.copy(pos);
      shock.lookAt(R.camera.position);
      shock.userData.t = 0;
      shock.visible = true;
      Fx.burst(pos, '#3a3038', 60, 3, 1.6, 1.2);
      if (near && flash) {
        flash.style.transition = 'none';
        flash.style.opacity = 1;
        requestAnimationFrame(() => {
          flash.style.transition = 'opacity .9s ease-out';
          flash.style.opacity = 0;
        });
      }
    },
    steam(i) {
      const v = valves[i];
      // grey and sparse: additive white sparks would burn the screen white
      Fx.burst(v.pos.clone().add(V3(0, 0.9, 0)), '#5a5660', 26, 2.2, 1.3, 1.2);
    },
    startTunnel(d) {
      scenery.tunnel.d = d;
      scenery.tunnel.g.visible = true;
    },
    endTunnel() {
      const tu = scenery.tunnel;
      // if we are inside, the exit comes up quickly; otherwise it just goes away
      if (tu.d < 0 && tu.d + tu.len > 0) tu.d = Math.max(-tu.len + 60, tu.d);
      else tu.d = 1e9;
    },
    tunnelState() {
      const tu = scenery.tunnel;
      return { d: tu.d, inside: 88 + tu.d < 60 && 88 + tu.d + tu.len > 20 };
    },
    // where the bomb's modules are, for the close-up camera
    slotWorld(i, z) {
      return V3(O.x - SLOT_X[i], O.y + SLOT_Y, O.z + z - 0.58);
    },
    // the close-up camera on the open book
    bookView(k) {
      const b = books[k];
      const c = P(LECTERN[k].x, 0, LECTERN[k].z);
      return { pos: c.clone().add(V3(0, 2.15, -0.72)), look: c.clone().add(V3(0, 1.1, 0.04)) };
    },
    // ---- queries (q = relative position) ----
    inCar: (q, k) => q.z > CARS[k][0] - 0.2 && q.z < CARS[k][1] + 0.2,
    nearBomb: (q, z) => q.z > z - 2.9 && q.z < z - 0.6 && Math.abs(q.x) < 1.9 && q.y < 1.2,
    slotOf: (q) => (q.x < -0.36 ? 2 : q.x > 0.36 ? 0 : 1),
    nearLectern: (q, k) => Math.hypot(q.x - LECTERN[k].x, q.z - (LECTERN[k].z - 0.9)) < 1.1 && q.y < 1.2,
    nearValve(q) {
      return VALVES.findIndex((v) => Math.hypot(q.x - (v.x - Math.sign(v.x) * 0.75), q.z - v.z) < 1.0 && q.y < 1.2);
    },
    nearKey: (q, who) => Math.hypot(q.x - KEYS[who].x, q.z - (KEYS[who].z - 0.95)) < 0.75 && q.y < 1.2,
    nearCard: (q) => Math.hypot(q.x, q.z - (BOMB_Z[2] - 2.6)) < 1.15 && q.y < 1.4,
    spawn(stage, who, x) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) {
        if (who === 'dame' && x && x.seal1) return P(-0.8, 0, 30);
        return P(s * 1.0, 0, who === 'valet' && x && x.seal1 ? 13 : 7);
      }
      if (stage === 2) {
        if (who === 'valet') return x && x.seal2 ? P(0.8, 0, 72) : P(0.8, 0, 50);
        return P(-0.8, 0, 50);
      }
      return P(s * 1.7, 0, 72);
    },
  };
})();
