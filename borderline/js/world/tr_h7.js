// ♥ 8 · Le Bal: an abandoned, enchanted palace at night. Crystal chandeliers, marquetry parquet,
// mirrors, columns, tall windows on the stars and the heart-galaxy. Four rooms: the waltz salon
// (one leads and sees the steps, the other follows), the masked ball (find each other among the
// masks by an agreed sign), the gallery of mirrors (one sees the way in the mirrors, the other on
// the floor) and the great ballroom, where the Grand Lustre comes loose.
// The palace runs towards -z (the galaxy hangs in that direction, above the far windows).
const H7 = (() => {
  const O = V3(-2100, 0, 9800);
  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);

  // each zone has its own group: only the near ones are drawn
  const ZONES = {
    A: [-56, 6],
    B: [-104, -46],
    C: [-162, -96],
    D: [-206, -150],
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

  // ---------- layout (relative to O) ----------
  const R1C = V3(0, 0, -32); // the waltz floor
  const R2C = V3(0, 0, -78); // the masked ball
  const R4C = V3(0, 0, -182); // the great ballroom
  const R4R = 20;
  const MIRX = 5.8;
  const LANE_X = { L: [-4.95, -3.45, -1.95], R: [1.95, 3.45, 4.95] };
  const ROWS = 12;
  const rowZ = (half, i) => (half === 1 ? -108.75 : -130.75) - 1.5 * i;
  const CANDLES = [
    [-8, -8],
    [8, -8],
    [8, 8],
    [-8, 8],
  ];
  // the great floor: 13 x 13 cells of 2 m around R4C, the centre 3 x 3 and the four candles fixed
  const CELL = 2;
  const NC = 13;
  const cellXZ = (i, j) => [-12 + i * CELL, R4C.z - 12 + j * CELL];
  const fixedCell = (i, j) => {
    const [x, z] = cellXZ(i, j);
    const dz = z - R4C.z;
    if (Math.abs(x) <= 2 && Math.abs(dz) <= 2) return true;
    return CANDLES.some(([cx, cz]) => cx === x && cz === dz);
  };

  // ---------- the waltz figures (leader marks, relative to R1C) ----------
  const FIGS = (() => {
    const circle = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI / 2 + (k * TAU) / 8;
      circle.push([Math.cos(a) * 4.4, Math.sin(a) * 4.4]);
    }
    const eight = [];
    for (let k = 0; k <= 8; k++) {
      const t = (k * TAU) / 8 + TAU / 16;
      eight.push([Math.sin(t) * 5.6, Math.sin(t) * Math.cos(t) * 6.4]);
    }
    const heart = [];
    for (let k = 0; k <= 8; k++) {
      const t = (k * TAU) / 8 + 0.35;
      const [hx, hy] = Heart.curve(t);
      heart.push([hx * 0.36, -(hy - 2.5) * 0.36 + 0.6]);
    }
    return [circle, eight, heart];
  })();
  // who leads step k (1..8) of figure f; step 0 is the starting pose
  const leaderOf = (f, k) => (f === 0 ? 'valet' : f === 1 ? 'dame' : ((Math.max(1, k) - 1) >> 1) % 2 ? 'dame' : 'valet');
  const followStart = (f) => {
    const F = FIGS[f];
    const dx = F[1][0] - F[0][0];
    const dz = F[1][1] - F[0][1];
    const d = Math.hypot(dx, dz) || 1;
    return [F[0][0] + (dx / d) * 1.7, F[0][1] + (dz / d) * 1.7];
  };

  // ---------- the masked ball ----------
  const SIGNS = ['coeur', 'etoile', 'lune', 'rose', 'eventail'];
  const SPOTS = [
    [-6.5, -71],
    [6.6, -86],
    [-10.6, -87],
    [10.8, -69],
    [0.4, -67.5],
    [-0.6, -89],
    [-14, -78],
    [14, -78.5],
  ];

  let built = false;
  const M = {};
  const T = {};
  const doors = {};
  const flames = [];
  const dust = [];
  const petals = [];
  const lights = [];
  const ghosts = [];
  const crowd = [];
  const wanderers = [];
  const bowers = [];
  const waltz = {};
  const signs = {};
  const gallery0 = () => ({ tiles: {}, glow: {}, mark: {}, refl: [] });
  const gallery = gallery0();
  const boss = {};
  let screen = null;
  let card = null;
  let proxy = null;
  let thread = null;
  let mySign = null;
  const tmp = V3();
  const tmp2 = V3();
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const s4 = V3();

  // ---------- textures (all drawn at 1080 px or more) ----------
  const heartPath = (g, cx, cy, k) => {
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const [x, y] = Heart.curve((i / 90) * TAU);
      const px = cx + x * k;
      const py = cy - (y - 2.5) * k;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
  };
  const starPath = (g, cx, cy, n, r0, r1, rot = -Math.PI / 2) => {
    g.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const r = i % 2 ? r1 : r0;
      if (i) g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
  };
  // wood with its grain, inside the current clip
  const woodFill = (g, x, y, w, h, base, ang, seed) => {
    const r = rng(seed);
    g.save();
    g.fillStyle = base;
    g.fillRect(x, y, w, h);
    g.translate(x + w / 2, y + h / 2);
    g.rotate(ang);
    const L = Math.hypot(w, h);
    for (let i = 0; i < 110; i++) {
      const yy = -L / 2 + r() * L;
      g.strokeStyle = r() < 0.5 ? `rgba(40,18,6,${0.05 + r() * 0.12})` : `rgba(255,236,200,${0.04 + r() * 0.08})`;
      g.lineWidth = 0.4 + r() * 1.6;
      g.beginPath();
      g.moveTo(-L / 2, yy);
      for (let s = -L / 2; s <= L / 2; s += L / 12) g.lineTo(s, yy + Math.sin(s * 0.03 + i) * 2.2 * r());
      g.stroke();
    }
    g.restore();
  };
  const makeTextures = () => {
    T.soft = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.3, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    T.flame = LvKit.tex(128, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h * 0.68, 2, w / 2, h * 0.6, h * 0.5);
      gr.addColorStop(0, 'rgba(255,255,240,1)');
      gr.addColorStop(0.25, 'rgba(255,214,140,0.95)');
      gr.addColorStop(0.6, 'rgba(255,140,60,0.35)');
      gr.addColorStop(1, 'rgba(255,90,40,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w / 2, h * 0.04);
      g.bezierCurveTo(w * 0.95, h * 0.5, w * 0.92, h * 0.96, w / 2, h * 0.97);
      g.bezierCurveTo(w * 0.08, h * 0.96, w * 0.05, h * 0.5, w / 2, h * 0.04);
      g.fill();
    });
    // the marquetry rosace of the waltz floor (and, in rose wood, of the great ballroom's dais)
    const rosace = (dark, light, rose, gold) => (g, w, h) => {
      const c = w / 2;
      g.clearRect(0, 0, w, h);
      const ring = (r0, r1, col, seed, ang) => {
        g.save();
        g.beginPath();
        g.arc(c, c, r1, 0, TAU);
        g.arc(c, c, r0, 0, TAU, true);
        g.clip();
        woodFill(g, 0, 0, w, h, col, ang, seed);
        g.restore();
      };
      ring(0, c - 2, dark, 1, 0.3);
      // 32 alternating wedges in the outer band
      for (let i = 0; i < 32; i++) {
        g.save();
        g.beginPath();
        g.moveTo(c, c);
        g.arc(c, c, c - 6, (i * TAU) / 32, ((i + 1) * TAU) / 32);
        g.closePath();
        g.arc(c, c, c * 0.8, 0, TAU, true);
        g.clip('evenodd');
        woodFill(g, 0, 0, w, h, i % 2 ? light : dark, (i * TAU) / 32, 10 + i);
        g.restore();
      }
      ring(c * 0.78, c * 0.8, gold, 3, 0);
      ring(c * 0.5, c * 0.78, light, 4, 1.2);
      // the 16-point star, each point split light / dark
      for (let i = 0; i < 32; i++) {
        const a0 = (i >> 1) * (TAU / 16) - Math.PI / 2;
        const tip = c * 0.76;
        const half = i % 2 ? 1 : -1;
        g.save();
        g.beginPath();
        g.moveTo(c, c);
        g.lineTo(c + Math.cos(a0 + half * (TAU / 32)) * c * 0.3, c + Math.sin(a0 + half * (TAU / 32)) * c * 0.3);
        g.lineTo(c + Math.cos(a0) * tip * ((i >> 1) % 2 ? 0.72 : 1), c + Math.sin(a0) * tip * ((i >> 1) % 2 ? 0.72 : 1));
        g.closePath();
        g.clip();
        woodFill(g, 0, 0, w, h, i % 2 ? dark : rose, a0, 40 + i);
        g.restore();
      }
      ring(c * 0.22, c * 0.25, gold, 5, 0);
      ring(0, c * 0.22, light, 6, 0.6);
      g.save();
      heartPath(g, c, c * 1.03, c * 0.0105);
      g.clip();
      woodFill(g, 0, 0, w, h, rose, 0.8, 7);
      g.restore();
      g.strokeStyle = gold;
      g.lineWidth = 4;
      heartPath(g, c, c * 1.03, c * 0.0105);
      g.stroke();
      // fine gold fillets
      g.strokeStyle = 'rgba(214,170,90,0.75)';
      [0.25, 0.5, 0.8, 0.995].forEach((k) => {
        g.lineWidth = k > 0.9 ? 8 : 3;
        g.beginPath();
        g.arc(c, c, c * k - (k > 0.9 ? 6 : 0), 0, TAU);
        g.stroke();
      });
      // a worn, dusty varnish
      const v = g.createRadialGradient(c, c, c * 0.2, c, c, c);
      v.addColorStop(0, 'rgba(255,230,190,0.06)');
      v.addColorStop(1, 'rgba(20,8,4,0.22)');
      g.fillStyle = v;
      g.beginPath();
      g.arc(c, c, c - 2, 0, TAU);
      g.fill();
    };
    T.medal = LvKit.tex(1024, 1024, rosace('#3e2210', '#9a6a3a', '#7a2620', '#c99a48'));
    T.medal4 = LvKit.tex(1024, 1024, rosace('#3a1c12', '#a8804e', '#8a2a3c', '#d4a850'));
    // Venetian masks: gold, silver, night
    const mask = (base, edge, ink) =>
      LvKit.tex(512, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const shape = () => {
          g.beginPath();
          g.moveTo(w * 0.5, h * 0.3);
          g.bezierCurveTo(w * 0.62, h * 0.08, w * 0.9, h * 0.02, w * 0.99, h * 0.16);
          g.bezierCurveTo(w * 0.98, h * 0.55, w * 0.82, h * 0.86, w * 0.6, h * 0.8);
          g.bezierCurveTo(w * 0.55, h * 0.78, w * 0.53, h * 0.62, w * 0.5, h * 0.62);
          g.bezierCurveTo(w * 0.47, h * 0.62, w * 0.45, h * 0.78, w * 0.4, h * 0.8);
          g.bezierCurveTo(w * 0.18, h * 0.86, w * 0.02, h * 0.55, w * 0.01, h * 0.16);
          g.bezierCurveTo(w * 0.1, h * 0.02, w * 0.38, h * 0.08, w * 0.5, h * 0.3);
          g.closePath();
        };
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, base[0]);
        gr.addColorStop(0.5, base[1]);
        gr.addColorStop(1, base[0]);
        g.fillStyle = gr;
        shape();
        g.fill();
        g.save();
        shape();
        g.clip();
        // filigree
        g.strokeStyle = ink;
        g.lineWidth = 2.2;
        for (let s = -1; s <= 1; s += 2) {
          for (let i = 0; i < 5; i++) {
            g.beginPath();
            const x0 = w * 0.5 + s * w * (0.08 + i * 0.075);
            g.moveTo(x0, h * 0.72);
            g.bezierCurveTo(x0 + s * 30, h * 0.5, x0 - s * 20, h * 0.3, x0 + s * 26, h * 0.12);
            g.stroke();
            g.beginPath();
            g.arc(x0 + s * 26, h * 0.12 + 8, 7, 0, TAU);
            g.stroke();
          }
        }
        g.restore();
        g.strokeStyle = edge;
        g.lineWidth = 7;
        shape();
        g.stroke();
        // the eyes, cut out
        g.globalCompositeOperation = 'destination-out';
        [0.32, 0.68].forEach((ex) => {
          g.beginPath();
          g.ellipse(w * ex, h * 0.42, w * 0.085, h * 0.11, ex < 0.5 ? 0.18 : -0.18, 0, TAU);
          g.fill();
        });
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = edge;
        g.lineWidth = 4;
        [0.32, 0.68].forEach((ex) => {
          g.beginPath();
          g.ellipse(w * ex, h * 0.42, w * 0.085, h * 0.11, ex < 0.5 ? 0.18 : -0.18, 0, TAU);
          g.stroke();
        });
        // a little heart on the brow
        g.fillStyle = edge;
        heartPath(g, w * 0.5, h * 0.2, 1.3);
        g.fill();
      });
    T.masks = [
      mask(['#9a6a22', '#e2bf6a'], '#fff1c4', 'rgba(90,50,10,0.55)'),
      mask(['#8a8c98', '#e6e8f0'], '#ffffff', 'rgba(40,40,60,0.5)'),
      mask(['#1a1018', '#4a2a3a'], '#d8aa58', 'rgba(216,170,88,0.6)'),
      mask(['#7a1830', '#c8405a'], '#ffd6a0', 'rgba(60,10,20,0.6)'),
    ];
    // the signs (white, coloured by the material): a heart, a star, a moon, a rose, a fan
    const sign = (draw) =>
      LvKit.tex(360, 360, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,0.35)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff';
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.lineWidth = 10;
        g.shadowColor = '#fff';
        g.shadowBlur = 24;
        draw(g, w, h);
      });
    T.sign = {
      coeur: sign((g, w, h) => {
        heartPath(g, w / 2, h * 0.55, 6.2);
        g.fill();
      }),
      etoile: sign((g, w, h) => {
        starPath(g, w / 2, h / 2, 5, w * 0.36, w * 0.15);
        g.fill();
      }),
      lune: sign((g, w, h) => {
        g.beginPath();
        g.arc(w / 2, h / 2, w * 0.32, 0, TAU);
        g.fill();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.arc(w * 0.64, h * 0.42, w * 0.27, 0, TAU);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }),
      rose: sign((g, w, h) => {
        for (let i = 0; i < 5; i++) {
          const a = (i * TAU) / 5 - Math.PI / 2;
          g.beginPath();
          g.ellipse(w / 2 + Math.cos(a) * w * 0.15, h / 2 + Math.sin(a) * h * 0.15, w * 0.16, w * 0.11, a, 0, TAU);
          g.fill();
        }
      }),
      eventail: sign((g, w, h) => {
        g.beginPath();
        g.moveTo(w / 2, h * 0.78);
        g.arc(w / 2, h * 0.78, w * 0.44, Math.PI * 1.15, Math.PI * 1.85);
        g.closePath();
        g.fill();
      }),
    };
    // footprints and the countdown ring of a waltz step
    T.step = LvKit.tex(360, 360, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#fff';
      g.lineWidth = 9;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.44, 0, TAU);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.38, 0, TAU);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      [-1, 1].forEach((s) => {
        g.save();
        g.translate(w / 2 + s * w * 0.09, h / 2 + s * h * 0.03);
        g.rotate(s * 0.12);
        g.beginPath();
        g.ellipse(0, -h * 0.06, w * 0.05, h * 0.1, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.ellipse(0, h * 0.1, w * 0.04, h * 0.045, 0, 0, TAU);
        g.fill();
        g.restore();
      });
    });
    T.ring = LvKit.tex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#fff';
      for (let i = 0; i < 48; i++) {
        if (i % 2) continue;
        g.lineWidth = 10;
        g.beginPath();
        g.arc(w / 2, h / 2, w * 0.46, (i * TAU) / 48, ((i + 1) * TAU) / 48);
        g.stroke();
      }
    });
    T.crack = LvKit.tex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = rng(77);
      const branch = (x, y, a, len, wd, depth) => {
        let px = x;
        let py = y;
        const n = 8;
        g.lineWidth = wd;
        g.beginPath();
        g.moveTo(px, py);
        for (let i = 0; i < n; i++) {
          a += (r() - 0.5) * 0.9;
          px += (Math.cos(a) * len) / n;
          py += (Math.sin(a) * len) / n;
          g.lineTo(px, py);
          if (depth < 3 && r() < 0.28) {
            g.stroke();
            branch(px, py, a + (r() < 0.5 ? -1 : 1) * (0.6 + r()), len * 0.5, wd * 0.6, depth + 1);
            g.lineWidth = wd;
            g.beginPath();
            g.moveTo(px, py);
          }
        }
        g.stroke();
      };
      g.lineCap = 'round';
      g.shadowColor = '#ffb050';
      g.shadowBlur = 14;
      g.strokeStyle = '#ffd890';
      for (let i = 0; i < 9; i++) branch(w / 2, h / 2, (i * TAU) / 9 + r(), w * 0.42, 6, 0);
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(40,10,0,0.8)';
      for (let i = 0; i < 5; i++) branch(w / 2, h / 2, r() * TAU, w * 0.3, 3, 1);
    });
    // a lit tile: a bright inlaid frame and a soft heart of light
    T.tileGlow = LvKit.tex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.62);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.28)');
      gr.addColorStop(1, 'rgba(255,255,255,0.05)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.shadowColor = '#fff';
      g.shadowBlur = 26;
      g.strokeStyle = 'rgba(255,255,255,1)';
      g.lineWidth = 16;
      g.strokeRect(26, 26, w - 52, h - 52);
      g.lineWidth = 5;
      g.strokeRect(58, 58, w - 116, h - 116);
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.9)';
      heartPath(g, w / 2, h * 0.53, 4.2);
      g.fill();
    });
    // a shaft of light rising from a tile (seen over the balustrades, in the mirrors)
    T.shaft = LvKit.tex(64, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.4)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    T.rug = LvKit.tex(256, 1024, (g, w, h) => {
      g.fillStyle = '#3e0a16';
      g.fillRect(0, 0, w, h);
      const r = rng(5);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,200,200,0.05)';
        g.fillRect(r() * w, r() * h, 2, 2);
      }
      g.strokeStyle = '#c99a48';
      g.lineWidth = 6;
      g.strokeRect(14, -10, w - 28, h + 20);
      g.lineWidth = 2;
      g.strokeRect(26, -10, w - 52, h + 20);
      g.fillStyle = 'rgba(201,154,72,0.4)';
      for (let y = 64; y < h; y += 128) {
        heartPath(g, w / 2, y, 2.4);
        g.fill();
      }
    });
    T.abyss = LvKit.tex(512, 512, (g, w, h) => {
      g.fillStyle = '#05020a';
      g.fillRect(0, 0, w, h);
      const r = rng(9);
      for (let i = 0; i < 900; i++) {
        const a = r();
        g.fillStyle = `rgba(255,${180 + r() * 60},${120 + r() * 60},${a * a * 0.8})`;
        const s = 1 + r() * 2.5;
        g.fillRect(r() * w, r() * h, s, s);
      }
    });
    T.lattice = LvKit.tex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#d8b26a';
      g.lineWidth = 10;
      g.strokeRect(0, 0, w, h);
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(w / 2, 0);
      g.lineTo(w / 2, h);
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
      g.stroke();
      g.lineWidth = 4;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.2, 0, TAU);
      g.stroke();
    });
  };

  // ---------- materials ----------
  const makeMats = () => {
    M.parquet = Tex.mat('wood', { color: '#8a5634', scale: 2.4, rough: 0.6 });
    M.parquet2 = Tex.mat('wood', { color: '#c49462', scale: 2.4, rough: 0.6 });
    M.marble = Tex.mat('marble', { color: '#e6d9c8', scale: 5, rough: 0.45 });
    M.marbleRose = Tex.mat('marble', { color: '#d8aeb0', scale: 5, rough: 0.45 });
    M.marbleD = Tex.mat('marble', { color: '#3e2a34', scale: 5, rough: 0.45 });
    M.plaster = Tex.mat('plaster', { color: '#d2bca4', scale: 4, rough: 0.92 });
    M.plasterRose = Tex.mat('plaster', { color: '#c99a9a', scale: 4, rough: 0.92 });
    M.panel = Tex.mat('wood', { color: '#4a2618', scale: 6, rough: 0.7 });
    M.velvet = new THREE.MeshStandardMaterial({ color: '#5a0c20', roughness: 0.78, emissive: '#160206', side: THREE.DoubleSide });
    M.velvetB = new THREE.MeshStandardMaterial({ color: '#22123a', roughness: 0.78, emissive: '#08040e', side: THREE.DoubleSide });
    M.tileA = Tex.mat('marble', { color: '#4a3040', scale: 3, rough: 0.45 });
    M.tileB = Tex.mat('marble', { color: '#6a4a52', scale: 3, rough: 0.45 });
    M.stone = Tex.mat('stone', { color: '#4a3c46', scale: 4, rough: 0.9 });
    M.pit = new THREE.MeshStandardMaterial({ color: '#1a1018', roughness: 0.95 });
    // gilding without an env map: a warm non-metal with a little glow of its own
    M.gold = new THREE.MeshStandardMaterial({ color: '#c79a4a', roughness: 0.36, metalness: 0, emissive: '#3a2208', emissiveIntensity: 0.6 });
    M.goldDark = new THREE.MeshStandardMaterial({ color: '#8a6432', roughness: 0.45, metalness: 0, emissive: '#1a0e04' });
    M.crystal = new THREE.MeshStandardMaterial({ color: '#f4ecff', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.72, emissive: '#5a4a70', emissiveIntensity: 0.55 });
    M.candle = new THREE.MeshStandardMaterial({ color: '#f2e6d0', roughness: 0.6, emissive: '#3a2a14', emissiveIntensity: 0.4 });
    M.glass = new THREE.MeshStandardMaterial({ color: '#8a9cd8', roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    M.mirror = new THREE.MeshBasicMaterial({ color: '#c8d4f0', transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending });
    M.mirrorDark = new THREE.MeshStandardMaterial({ color: '#2a3048', roughness: 0.15, emissive: '#0a0c18' });
    M.lattice = new THREE.MeshBasicMaterial({ map: T.lattice, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: new THREE.Color('#c79a4a').multiplyScalar(0.7) });
    M.porcelain = new THREE.MeshStandardMaterial({ color: '#efe4dc', roughness: 0.42, emissive: '#2a1e1a', emissiveIntensity: 0.3 });
    M.hair = new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 0.7 });
    M.coat = new THREE.MeshStandardMaterial({ color: '#16121e', roughness: 0.7 });
    M.coatB = new THREE.MeshStandardMaterial({ color: '#1c2444', roughness: 0.7 });
    M.shirt = new THREE.MeshStandardMaterial({ color: '#e8e0d4', roughness: 0.8 });
    M.dress = ['#7a1430', '#1e2a5a', '#0e4a3a', '#d8c8b0', '#a0406a', '#3a1a4a'].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, emissive: c, emissiveIntensity: 0.06 }),
    );
    M.maskMats = T.masks.map((t) => new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.4, emissive: '#2a1a08', emissiveIntensity: 0.4 }));
    M.ghost = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(0.55), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    M.refl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8e0ff').multiplyScalar(0.5), transparent: true, opacity: 0.3, depthWrite: false });
    M.rug = new THREE.MeshStandardMaterial({ map: T.rug, roughness: 0.95 });
    M.medal = new THREE.MeshStandardMaterial({ map: T.medal, roughness: 0.5, transparent: true });
    M.medal4 = new THREE.MeshStandardMaterial({ map: T.medal4, roughness: 0.5, transparent: true });
    M.abyss = new THREE.MeshBasicMaterial({ map: T.abyss, color: '#a08070' });
  };

  const sprite = (tex, color, size, opacity = 1, k = 1) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(color).multiplyScalar(k),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    s.scale.setScalar(size);
    return s;
  };
  const flat = (tex, color, size, opacity = 1, k = 1, normal = false) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color(color).multiplyScalar(k),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );

  // ---------- building blocks ----------
  const TH = 0.6;
  // a wall at z = c (axis 'z') spanning x a0..a1, or at x = c (axis 'x') spanning z a0..a1.
  // doors: [[centre, width, height]], wins: [[centre, width, y0, y1]], inner: side of the room
  const drapeGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 24, 1);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(a.getX(i) * 24) * 0.05);
    g.computeVertexNormals();
    return g;
  })();
  const wall = (zk, axis, c, a0, a1, h, opt = {}) => {
    const K = KZ[zk];
    const inner = opt.inner || 1;
    const cuts = [];
    (opt.doors || []).forEach(([m, w, dh]) => cuts.push({ a: m - w / 2, b: m + w / 2, kind: 'door', dh }));
    (opt.wins || []).forEach(([m, w, y0, y1]) => cuts.push({ a: m - w / 2, b: m + w / 2, kind: 'win', y0, y1 }));
    cuts.sort((p, q) => p.a - q.a);
    const segs = [];
    let x = a0;
    cuts.forEach((k) => {
      if (k.a > x) segs.push({ a: x, b: k.a, kind: 'full' });
      segs.push(k);
      x = k.b;
    });
    if (x < a1) segs.push({ a: x, b: a1, kind: 'full' });
    const mat = opt.mat || M.plaster;
    const box = (a, b, y0, y1, m, off = 0, th = TH) => {
      const L = b - a;
      const mid = (a + b) / 2;
      if (L <= 0.001 || y1 - y0 <= 0.001) return null;
      if (axis === 'z') return K.deco(new THREE.BoxGeometry(L, y1 - y0, th), m, mid, (y0 + y1) / 2, c + off);
      return K.deco(new THREE.BoxGeometry(th, y1 - y0, L), m, c + off, (y0 + y1) / 2, mid);
    };
    const col = (a, b) => {
      const L = b - a;
      const mid = (a + b) / 2;
      if (axis === 'z') K.collider(mid, h / 2, c, L, h, TH);
      else K.collider(c, h / 2, mid, TH, h, L);
    };
    const face = (inner * TH) / 2;
    segs.forEach((s) => {
      if (s.kind === 'full') {
        box(s.a, s.b, 0, h, mat);
        col(s.a, s.b);
        if (!opt.bare) {
          box(s.a, s.b, 0, 1.05, M.panel, face + inner * 0.03, 0.06);
          box(s.a, s.b, 1.05, 1.13, M.gold, face + inner * 0.05, 0.08);
        }
      } else if (s.kind === 'door') {
        box(s.a, s.b, s.dh, h, mat);
        // a gilded frame
        box(s.a - 0.18, s.a, 0, s.dh + 0.2, M.gold, face + inner * 0.06, 0.12);
        box(s.b, s.b + 0.18, 0, s.dh + 0.2, M.gold, face + inner * 0.06, 0.12);
        box(s.a - 0.18, s.b + 0.18, s.dh, s.dh + 0.22, M.gold, face + inner * 0.06, 0.12);
      } else {
        box(s.a, s.b, 0, s.y0, mat);
        box(s.a, s.b, s.y1, h, mat);
        col(s.a, s.b);
        if (!opt.bare) {
          box(s.a, s.b, 0, 1.05, M.panel, face + inner * 0.03, 0.06);
          box(s.a, s.b, 1.05, 1.13, M.gold, face + inner * 0.05, 0.08);
        }
        // glass, mullions, a frame
        const mid = (s.a + s.b) / 2;
        const w = s.b - s.a;
        const gl = axis === 'z' ? new THREE.PlaneGeometry(w, s.y1 - s.y0) : new THREE.PlaneGeometry(w, s.y1 - s.y0).rotateY(Math.PI / 2);
        if (axis === 'z') K.deco(gl, M.glass, mid, (s.y0 + s.y1) / 2, c);
        else K.deco(gl, M.glass, c, (s.y0 + s.y1) / 2, mid);
        const bar = (a, b, y0, y1) => box(a, b, y0, y1, M.gold, 0, 0.1);
        bar(mid - 0.05, mid + 0.05, s.y0, s.y1);
        for (let y = s.y0 + 1.6; y < s.y1 - 0.3; y += 1.6) bar(s.a, s.b, y - 0.04, y + 0.04);
        box(s.a - 0.14, s.a, s.y0 - 0.1, s.y1 + 0.1, M.gold, face + inner * 0.04, 0.12);
        box(s.b, s.b + 0.14, s.y0 - 0.1, s.y1 + 0.1, M.gold, face + inner * 0.04, 0.12);
        box(s.a - 0.14, s.b + 0.14, s.y1, s.y1 + 0.16, M.gold, face + inner * 0.04, 0.12);
        box(s.a - 0.2, s.b + 0.2, s.y0 - 0.14, s.y0, M.marble, face + inner * 0.1, 0.25);
        // velvet drapes on both sides
        if (opt.drapes !== false) {
          const dh = s.y1 - s.y0 + 1.2;
          [s.a - 0.35, s.b + 0.35].forEach((dm, i) => {
            const d = new THREE.Mesh(drapeGeo, opt.drape || M.velvet);
            d.scale.set(0.9, dh, 1);
            if (axis === 'z') {
              d.position.copy(P(dm, s.y0 - 0.6 + dh / 2 + 0.3, c + face + inner * 0.22));
              if (inner < 0) d.rotation.y = Math.PI;
            } else {
              d.position.copy(P(c + face + inner * 0.22, s.y0 - 0.6 + dh / 2 + 0.3, dm));
              d.rotation.y = inner > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
            zg[zk].add(d);
            void i;
          });
        }
      }
    });
    // the cornice
    if (!opt.bare) {
      if (axis === 'z') K.deco(new THREE.BoxGeometry(a1 - a0, 0.35, 0.3), M.gold, (a0 + a1) / 2, h - 0.5, c + face + inner * 0.15);
      else K.deco(new THREE.BoxGeometry(0.3, 0.35, a1 - a0), M.gold, c + face + inner * 0.15, h - 0.5, (a0 + a1) / 2);
    }
  };
  // a ceiling over x0..x1, z0..z1 at height y, with an optional glazed hole
  const ceiling = (zk, x0, x1, z0, z1, y, hole, mat = M.plaster) => {
    const K = KZ[zk];
    const slab = (a, b, c, d) => {
      if (b - a <= 0 || d - c <= 0) return;
      K.deco(new THREE.BoxGeometry(b - a, 0.5, d - c), mat, (a + b) / 2, y + 0.25, (c + d) / 2);
    };
    if (!hole) slab(x0, x1, z0, z1);
    else {
      const [hx0, hx1, hz0, hz1] = hole;
      slab(x0, x1, z0, hz0);
      slab(x0, x1, hz1, z1);
      slab(x0, hx0, hz0, hz1);
      slab(hx1, x1, hz0, hz1);
      // the skylight: a gilded lattice, the night behind
      const lat = new THREE.Mesh(new THREE.PlaneGeometry(hx1 - hx0, hz1 - hz0).rotateX(Math.PI / 2), M.lattice);
      lat.material = M.lattice.clone();
      lat.material.map = T.lattice.clone();
      lat.material.map.needsUpdate = true;
      lat.material.map.repeat.set((hx1 - hx0) / 2, (hz1 - hz0) / 2);
      lat.position.copy(P((hx0 + hx1) / 2, y + 0.3, (hz0 + hz1) / 2));
      zg[zk].add(lat);
    }
    // coffers: gilded beams
    for (let x = x0 + 4; x < x1 - 1; x += 4) K.deco(new THREE.BoxGeometry(0.22, 0.3, z1 - z0), M.goldDark, x, y - 0.1, (z0 + z1) / 2);
    for (let z = z0 + 4; z < z1 - 1; z += 4) K.deco(new THREE.BoxGeometry(x1 - x0, 0.3, 0.22), M.goldDark, (x0 + x1) / 2, y - 0.1, z);
  };
  const floor = (zk, x0, x1, z0, z1, mat) => KZ[zk].solid((x0 + x1) / 2, -0.5, (z0 + z1) / 2, x1 - x0, 1, z1 - z0, mat);

  // a column: marble shaft, gilded base and capital
  const column = (zk, x, z, h, r = 0.45) => {
    const K = KZ[zk];
    K.deco(new THREE.CylinderGeometry(r, r * 1.08, h - 1.2, 20), M.marble, x, 0.6 + (h - 1.2) / 2, z);
    K.deco(new THREE.BoxGeometry(r * 2.6, 0.6, r * 2.6), M.marbleD, x, 0.3, z);
    K.deco(new THREE.TorusGeometry(r * 1.1, 0.08, 6, 20).rotateX(Math.PI / 2), M.gold, x, 0.62, z);
    K.deco(new THREE.CylinderGeometry(r * 1.5, r, 0.5, 20), M.gold, x, h - 0.35, z);
    K.deco(new THREE.BoxGeometry(r * 3, 0.25, r * 3), M.gold, x, h - 0.05, z);
    K.collider(x, h / 2, z, r * 2.2, h, r * 2.2);
  };

  // a candle with its flame (flames flicker in update)
  const candle = (parent, x, y, z, k = 1) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * k, 0.04 * k, 0.24 * k, 8), M.candle);
    c.position.set(x, y + 0.12 * k, z);
    parent.add(c);
    const f = sprite(T.flame, '#ffc070', 0.16 * k, 0.95, 1.5);
    f.scale.set(0.11 * k, 0.2 * k, 1);
    f.position.set(x, y + 0.31 * k, z);
    parent.add(f);
    const fl = { s: f, k, base: 0.11 * k, ph: Math.random() * 10, on: 1 };
    flames.push(fl);
    return fl;
  };

  // a crystal chandelier: tiers of gilded rings, candles, strands of pendants
  const chandelier = (scale = 1, tiers = 2, nArms = 10) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0.02, -0.5],
          [0.12, -0.3],
          [0.3, 0.02],
          [0.18, 0.2],
          [0.3, 0.45],
          [0.22, 0.7],
          [0.1, 1.0],
          [0.14, 1.3],
          [0.02, 1.4],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        20,
      ),
      M.gold,
    );
    g.add(body);
    const fls = [];
    const crystals = [];
    for (let t = 0; t < tiers; t++) {
      const R0 = 0.7 + t * 0.55;
      const y = 0.25 - t * 0.35;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.035, 6, 40).rotateX(Math.PI / 2), M.gold);
      ring.position.y = y;
      g.add(ring);
      const n = nArms + t * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + t * 0.3;
        const cx = Math.cos(a) * R0;
        const cz = Math.sin(a) * R0;
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.06, 8), M.gold);
        cup.position.set(cx, y + 0.04, cz);
        g.add(cup);
        fls.push(candle(g, cx, y + 0.06, cz, 1));
        // a strand of crystals between this arm and the next
        for (let s = 0; s < 3; s++) crystals.push([Math.cos(a + (TAU / n) * 0.5) * R0, y - 0.12 - s * 0.13, Math.sin(a + (TAU / n) * 0.5) * R0, 0.05 - s * 0.008]);
      }
      // a swag of crystals hanging inside
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const sag = Math.sin(((i % 2) + 0.5) * Math.PI * 0.5) * 0.18;
        crystals.push([Math.cos(a) * (R0 - 0.08), y - 0.08 - sag, Math.sin(a) * (R0 - 0.08), 0.03]);
      }
    }
    // the drop at the bottom
    for (let i = 0; i < 6; i++) crystals.push([0, -0.6 - i * 0.12, 0, 0.06 - i * 0.006]);
    const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), M.crystal, crystals.length);
    crystals.forEach(([x, y, z, s], i) => {
      m4.compose(V3(x, y, z), q4.setFromEuler(e4.set(0, i, 0)), s4.set(s, s * 1.8, s));
      im.setMatrixAt(i, m4);
    });
    g.add(im);
    const halo = sprite(T.soft, '#ffcf8a', 3.4, 0.22, 1);
    halo.position.y = 0.1;
    g.add(halo);
    g.scale.setScalar(scale);
    return { g, fls, halo, crystals: im };
  };

  // a standing candelabra (five branches)
  const candelabra = (parent, x, y, z, k = 1) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.5, 10), M.gold);
    stem.position.y = 0.75;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.14, 16), M.gold);
    base.position.y = 0.07;
    g.add(stem, base);
    const fls = [];
    [-0.42, -0.21, 0, 0.21, 0.42].forEach((dx, i) => {
      const yy = 1.5 + (i === 2 ? 0.2 : Math.abs(dx) > 0.3 ? 0 : 0.1);
      if (dx) {
        const arm = new THREE.Mesh(new THREE.TorusGeometry(Math.abs(dx) / 2, 0.025, 6, 12, Math.PI), M.gold);
        arm.position.set(dx / 2, 1.5, 0);
        arm.rotation.z = Math.PI;
        g.add(arm);
      }
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.06, 8), M.gold);
      cup.position.set(dx, yy, 0);
      g.add(cup);
      fls.push(candle(g, dx, yy + 0.02, 0, 1.3));
    });
    g.scale.setScalar(k);
    parent.add(g);
    return { g, fls };
  };

  // ---------- the mannequins (masked dancers) ----------
  const skirtGeo = new THREE.LatheGeometry(
    [
      [0.001, 0.0],
      [0.7, 0.0],
      [0.72, 0.04],
      [0.58, 0.25],
      [0.36, 0.6],
      [0.2, 0.92],
      [0.17, 1.02],
      [0.001, 1.02],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    28,
  );
  const dancer = (fem, pal = 0, maskI = 0, ghost = false) => {
    const mat = (m) => (ghost ? M.ghost : m);
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const dressM = M.dress[pal % M.dress.length];
    if (fem) {
      const sk = new THREE.Mesh(skirtGeo, mat(dressM));
      g.add(sk);
      const bod = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.42, 14), mat(dressM));
      bod.position.y = 1.22;
      body.add(bod);
      const bust = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, TAU, 0, Math.PI / 2), mat(dressM));
      bust.position.y = 1.42;
      bust.scale.set(1, 0.4, 0.85);
      body.add(bust);
    } else {
      [-0.1, 0.1].forEach((dx) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.92, 8), mat(M.coat));
        leg.position.set(dx, 0.46, 0);
        g.add(leg);
      });
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.72, 14), mat(pal % 2 ? M.coatB : M.coat));
      coat.position.y = 1.22;
      body.add(coat);
      const tails = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.05), mat(pal % 2 ? M.coatB : M.coat));
      tails.position.set(0, 0.75, -0.17);
      tails.rotation.x = 0.12;
      body.add(tails);
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.05), mat(M.shirt));
      shirt.position.set(0, 1.36, 0.18);
      body.add(shirt);
    }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 8), mat(M.porcelain));
    neck.position.y = 1.5;
    body.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(M.porcelain));
    head.position.y = 1.64;
    head.scale.set(0.9, 1.08, 0.95);
    body.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(fem ? 0.1 : 0.125, 12, 8), mat(M.hair));
    hair.position.set(0, fem ? 1.76 : 1.7, fem ? -0.06 : -0.02);
    hair.scale.set(1, fem ? 0.9 : 0.6, 1);
    body.add(hair);
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15, 6, 1), ghost ? M.ghost : M.maskMats[maskI % M.maskMats.length]);
    // curve the mask round the face
    const ma = mask.geometry.attributes.position;
    for (let i = 0; i < ma.count; i++) ma.setZ(i, -Math.pow(ma.getX(i) / 0.15, 2) * 0.06);
    mask.geometry.computeVertexNormals();
    mask.position.set(0, 1.66, 0.1);
    body.add(mask);
    const arms = [-1, 1].map((s) => {
      const piv = new THREE.Group();
      piv.position.set(s * (fem ? 0.18 : 0.23), 1.4, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.56, 8).translate(0, -0.28, 0), mat(fem ? M.porcelain : pal % 2 ? M.coatB : M.coat));
      piv.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(M.porcelain));
      hand.position.y = -0.58;
      piv.add(hand);
      body.add(piv);
      return piv;
    });
    // the sign it may raise (a coloured shape over the head)
    const sign = sprite(T.sign.coeur, '#ffffff', 0.62, 0, 1);
    sign.position.y = 2.35;
    g.add(sign);
    return { g, body, arms, mask, head, sign, fem, sigT: 0, sigKind: null, bow: 0, maskFall: 0 };
  };
  // a waltz pose: arms up round the partner, the body swaying on the beat
  const poseDance = (d, beat, k = 1) => {
    const ph = ((beat % 3) + 3) % 3;
    d.arms[0].rotation.set(-1.2 * k, 0, -0.7 * k);
    d.arms[1].rotation.set(-0.9 * k, 0, 0.5 * k);
    d.body.rotation.z = Math.sin((ph / 3) * TAU) * 0.05 * k;
    d.g.position.y += (ph < 1 ? -0.03 : 0.03 * Math.sin(((ph - 1) / 2) * Math.PI)) * k;
  };

  // ---------- doors (double doors swinging inward) ----------
  const makeDoor = (zk, id, x, z, w, h, inner = -1) => {
    const K = KZ[zk];
    const b = K.collider(x, h / 2, z, w, h, 0.3);
    const leaves = [-1, 1].map((sd) => {
      const piv = new THREE.Group();
      piv.position.copy(P(x + (sd * w) / 2, 0, z));
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(w / 2, h, 0.12), M.plaster);
      leaf.position.set((-sd * w) / 4, h / 2, 0);
      piv.add(leaf);
      // gilded panels on the leaf
      [0.28, 0.66].forEach((ky) => {
        const pn = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.3, h * 0.3, 0.16), M.gold);
        pn.position.set((-sd * w) / 4, h * ky, 0);
        pn.scale.set(1, 1, 0.5);
        piv.add(pn);
        const inl = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.46, h * 0.3 - 0.16, 0.18), M.plasterRose);
        inl.position.set((-sd * w) / 4, h * ky, 0);
        piv.add(inl);
      });
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.gold);
      knob.position.set((-sd * w) / 2 + sd * 0.15, h * 0.47, 0.1 * -inner);
      piv.add(knob);
      zg[zk].add(piv);
      return { piv, sd };
    });
    doors[id] = { b, leaves, open: 0, want: 0, inner, played: 0 };
  };

  // ---------- particles: golden dust and rose petals ----------
  const makeDust = (zk, x0, x1, z0, z1, y1, n, color = '#ffd9a0') => {
    const geo = new THREE.BufferGeometry();
    const a = new Float32Array(n * 3);
    const r = rng(n + Math.round(z0));
    const seeds = [];
    for (let i = 0; i < n; i++) seeds.push([x0 + r() * (x1 - x0), r() * y1, z0 + r() * (z1 - z0), r() * 10]);
    geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ map: T.soft, color: new THREE.Color(color).multiplyScalar(0.8), size: 0.045, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    pts.frustumCulled = false;
    zg[zk].add(pts);
    dust.push({ zk, pts, seeds, y1 });
  };
  const petalGeo = (() => {
    const g = new THREE.PlaneGeometry(0.09, 0.07, 2, 2);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) a.setZ(i, (a.getX(i) * a.getX(i)) * 6);
    g.computeVertexNormals();
    return g;
  })();
  const makePetals = (zk, cx, cz, rad, y1, n) => {
    const mat = new THREE.MeshStandardMaterial({ color: '#c8405a', roughness: 0.6, side: THREE.DoubleSide, emissive: '#3a0a14', emissiveIntensity: 0.6 });
    const im = new THREE.InstancedMesh(petalGeo, mat, n);
    im.frustumCulled = false;
    const r = rng(n + 3);
    const seeds = [];
    for (let i = 0; i < n; i++) seeds.push([cx + (r() - 0.5) * rad * 2, cz + (r() - 0.5) * rad * 2, r() * 20, 0.25 + r() * 0.25, r() * TAU]);
    zg[zk].add(im);
    petals.push({ zk, im, seeds, y1 });
  };

  // ---------- the rooms ----------
  const buildVestibule = () => {
    const K = KZ.A;
    floor('A', -7, 7, -14, 0.5, M.marble);
    // a heart mosaic and a red runner
    const rug = K.deco(new THREE.PlaneGeometry(2.6, 13.6).rotateX(-Math.PI / 2), M.rug, 0, 0.012, -7);
    void rug;
    wall('A', 'x', -7.3, -14, 0.5, 8, { inner: 1, wins: [[-7, 2.4, 2.4, 6.4]] });
    wall('A', 'x', 7.3, -14, 0.5, 8, { inner: -1, wins: [[-7, 2.4, 2.4, 6.4]] });
    wall('A', 'z', 0.8, -7.6, 7.6, 8, { inner: -1 });
    ceiling('A', -7.6, 7.6, -14.3, 0.8, 8);
    // the screen of the épreuve, above the doors to the salon
    screen = makeScreen(6, 2.4, 1024);
    screen.mesh.position.copy(P(0, 6.1, -13.62));
    screen.mesh.rotation.y = 0;
    zg.A.add(screen.mesh);
    // a gilded frame round it
    K.deco(new THREE.BoxGeometry(6.4, 0.16, 0.2), M.gold, 0, 7.38, -13.7);
    K.deco(new THREE.BoxGeometry(6.4, 0.16, 0.2), M.gold, 0, 4.82, -13.7);
    // the plaque
    plaque('A', 'Le Bal', 'salle des fêtes · minuit', 0, 2.2, 0.42, Math.PI);
    // candelabras on marble consoles
    [-5.6, 5.6].forEach((x) => {
      K.solid(x, 0.45, -6, 1.2, 0.9, 2.4, M.marbleD);
      candelabra(zg.A, O.x + x, 0.9, O.z - 6, 0.8);
      // a tall framed portrait of nobody (an empty gilded frame, a dark canvas)
      K.deco(new THREE.BoxGeometry(0.08, 3.2, 2.2), M.gold, x + Math.sign(x) * 1.55, 3.6, -6);
      K.deco(new THREE.BoxGeometry(0.06, 2.9, 1.9), M.velvetB, x + Math.sign(x) * 1.5, 3.6, -6);
    });
    makeDoor('A', 'd0', 0, -14, 3.6, 4.2);
    const ch = chandelier(0.9, 2, 8);
    ch.g.position.copy(P(0, 6.6, -6));
    zg.A.add(ch.g);
    makeDust('A', -6, 6, -13, 0, 7, 180);
  };

  const buildSalon = () => {
    const K = KZ.A;
    floor('A', -14, 14, -50, -14, M.parquet);
    // the marquetry rosace
    const med = new THREE.Mesh(new THREE.CircleGeometry(10.4, 96).rotateX(-Math.PI / 2), M.medal);
    med.position.copy(P(R1C.x, 0.01, R1C.z));
    med.rotation.y = 0;
    zg.A.add(med);
    // a marble border round the floor
    K.deco(new THREE.RingGeometry(10.4, 10.9, 96).rotateX(-Math.PI / 2), M.marbleRose, R1C.x, 0.012, R1C.z);
    const wins = [-20, -32, -44].map((z) => [z, 3, 2.4, 9]);
    wall('A', 'x', -14.3, -50, -14, 12, { inner: 1, wins });
    wall('A', 'x', 14.3, -50, -14, 12, { inner: -1, wins });
    wall('A', 'z', -14, -14.6, 14.6, 12, { inner: -1, doors: [[0, 3.6, 4.2]] });
    // the far wall: tall windows on the night (the galaxy above), the door in between
    wall('A', 'z', -50, -14.6, 14.6, 12, { inner: 1, doors: [[0, 3.6, 4.2]], wins: [[-8, 4, 2.2, 10.6], [8, 4, 2.2, 10.6]] });
    K.deco(new THREE.TorusGeometry(1.6, 0.14, 8, 40), M.gold, 0, 7.6, -49.62);
    K.deco(new THREE.CircleGeometry(1.5, 40), M.plasterRose, 0, 7.6, -49.66);
    ceiling('A', -14.6, 14.6, -50.3, -13.7, 12, [-6, 6, -48, -36]);
    makeDoor('A', 'd1', 0, -50, 3.6, 4.2);
    // columns along the walls
    [-24, -40].forEach((z) => [-12.6, 12.6].forEach((x) => column('A', x, z, 12, 0.5)));
    // two chandeliers
    [-24, -40].forEach((z) => {
      const ch = chandelier(1.25, 2, 10);
      ch.g.position.copy(P(0, 9.2, z));
      zg.A.add(ch.g);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), M.gold);
      chain.position.copy(P(0, 11, z));
      zg.A.add(chain);
    });
    // benches (velvet banquettes) along the side walls
    [-26, -38].forEach((z) =>
      [-13.2, 13.2].forEach((x) => {
        K.solid(x, 0.25, z, 0.9, 0.5, 3, M.velvet);
        K.deco(new THREE.BoxGeometry(1, 0.08, 3.1), M.gold, x, 0.52, z);
      }),
    );
    // the waltz marks (leader), the start circles, the follower's ring, the cracks
    const mk = (k = 1, col = '#ff9a2a') => {
      const g = new THREE.Group();
      // a solid (not additive) ring: it must read on the pale marquetry
      const ring = flat(T.step, col, 1.7, 0.85, 1, true);
      const fill = flat(T.soft, '#ffcf8a', 1.4, 0.5, 1.2);
      const halo = sprite(T.soft, '#ffcf8a', 2.2, 0.35, 1);
      halo.position.y = 0.3;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.75, 3.2, 16, 1, true).translate(0, 1.6, 0),
        new THREE.MeshBasicMaterial({ map: T.shaft, color: new THREE.Color(col).multiplyScalar(0.9), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
      );
      g.add(ring, fill, halo, shaft);
      g.shaft = shaft;
      g.visible = false;
      g.scale.setScalar(k);
      zg.A.add(g);
      return { g, ring, fill, halo, shaft };
    };
    waltz.marks = [mk(), mk(0.8)];
    waltz.startL = mk();
    waltz.startF = mk(1, '#ff4f8a');
    waltz.startF.ring.material.color.set('#ff4f8a');
    waltz.startF.fill.material.color.set(new THREE.Color('#ff8fb0').multiplyScalar(0.9));
    waltz.band = flat(T.ring, '#ffd9a0', 3.4, 0.0, 1.2);
    zg.A.add(waltz.band);
    waltz.cracks = [0, 1, 2].map(() => {
      const c = flat(T.crack, '#ffb060', 3.2, 0, 1);
      c.position.y = O.y + 0.03;
      zg.A.add(c);
      return { m: c, k: 0 };
    });
    // ghost couples circling the edge of the floor
    for (let i = 0; i < 4; i++) {
      const a = dancer(false, i, 0, true);
      const b = dancer(true, i, 0, true);
      zg.A.add(a.g, b.g);
      ghosts.push({ zk: 'A', a, b, c: R1C, r: 12.3, ph: (i * TAU) / 4, w: 0.09 });
    }
    makeDust('A', -13, 13, -49, -15, 11, 500);
    makePetals('A', R1C.x, R1C.z, 11, 10, 90);
  };

  const buildMasked = () => {
    const K = KZ.B;
    // the corridor of the signs
    floor('B', -5, 5, -58, -50, M.marble);
    wall('B', 'x', -5.3, -58, -50, 6, { inner: 1 });
    wall('B', 'x', 5.3, -58, -50, 6, { inner: -1 });
    ceiling('B', -5.6, 5.6, -58.3, -49.7, 6);
    // three pedestals with five signs: each of you picks one
    const pedX = [-3.4, -1.7, 0, 1.7, 3.4];
    signs.peds = SIGNS.map((k, i) => {
      const x = pedX[i];
      KZ.B.solid(x, 0.5, -53.6, 0.7, 1.0, 0.7, M.marbleD);
      K.deco(new THREE.BoxGeometry(0.8, 0.08, 0.8), M.gold, x, 1.04, -53.6);
      const s = sprite(T.sign[k], '#ffd9a0', 0.7, 0.85, 1.1);
      s.position.copy(P(x, 1.7, -53.6));
      zg.B.add(s);
      const ringD = flat(T.ring, Avatar.LOOK.dame.glow, 1.3, 0, 1.1);
      const ringV = flat(T.ring, Avatar.LOOK.valet.glow, 1.55, 0, 1.1);
      ringD.position.copy(P(x, 0.02, -53.6));
      ringV.position.copy(P(x, 0.025, -53.6));
      zg.B.add(ringD, ringV);
      return { k, x, s, ringD, ringV };
    });
    // the far end: two curtained arches, one for each of you
    signs.curtains = [-2.55, 2.55].map((x) => {
      K.deco(new THREE.BoxGeometry(2.3, 0.2, 0.3), M.gold, x, 4.1, -57.55);
      [-1.1, 1.1].forEach((dx) => K.deco(new THREE.BoxGeometry(0.2, 4.2, 0.3), M.gold, x + dx, 2.1, -57.55));
      const c = new THREE.Mesh(drapeGeo, M.velvet);
      c.scale.set(1.9, 4, 1);
      c.position.copy(P(x, 2, -57.6));
      zg.B.add(c);
      const glowC = flat(T.soft, x < 0 ? Avatar.LOOK.dame.glow : Avatar.LOOK.valet.glow, 2.2, 0, 0.9);
      glowC.position.copy(P(x, 0.02, -56.9));
      zg.B.add(glowC);
      return { x, c, glowC };
    });
    const sconces = [-53.6].map((z) => [-4.9, 4.9].map((x) => {
      const fl = candle(zg.B, O.x + x, 2.4, O.z + z, 1.4);
      K.deco(new THREE.BoxGeometry(0.12, 0.3, 0.3), M.gold, x + Math.sign(x) * 0.15, 2.3, z);
      return fl;
    }));
    void sconces;

    // the masked ball
    floor('B', -17, 17, -98, -58, M.marble);
    // a checkerboard of marble, a rose in the middle
    const cells = [[], []];
    for (let x = -16; x < 17; x += 2)
      for (let z = -97; z < -58; z += 2) cells[(Math.round(x / 2) + Math.round(z / 2)) & 1].push([x, z]);
    cells.forEach((list, k) => {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.98, 0.02, 1.98), k ? M.marbleD : M.marble, list.length);
      list.forEach(([x, z], i) => {
        m4.makeTranslation(O.x + x, O.y + 0.01, O.z + z);
        im.setMatrixAt(i, m4);
      });
      zg.B.add(im);
    });
    const rose = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64).rotateX(-Math.PI / 2), M.medal4);
    rose.position.copy(P(R2C.x, 0.03, R2C.z));
    zg.B.add(rose);
    const wins2 = [-66, -78, -90].map((z) => [z, 3, 2.6, 10]);
    wall('B', 'x', -17.3, -98, -58, 13, { inner: 1, wins: wins2, drape: M.velvetB });
    wall('B', 'x', 17.3, -98, -58, 13, { inner: -1, wins: wins2, drape: M.velvetB });
    wall('B', 'z', -58, -17.6, 17.6, 13, { inner: -1 });
    wall('B', 'z', -98, -17.6, 17.6, 13, { inner: 1, doors: [[0, 3.6, 4.2]], wins: [[-9, 4.4, 2.4, 11.4], [9, 4.4, 2.4, 11.4]], drape: M.velvetB });
    ceiling('B', -17.6, 17.6, -98.3, -57.7, 13, [-7, 7, -92, -64]);
    makeDoor('B', 'd2', 0, -98, 3.6, 4.2);
    [[-15, -64], [15, -64], [-15, -92], [15, -92], [-15, -78], [15, -78]].forEach(([x, z]) => column('B', x, z, 13, 0.55));
    const ch = chandelier(1.6, 3, 10);
    ch.g.position.copy(P(R2C.x, 9.6, R2C.z));
    zg.B.add(ch.g);
    [-66, -90].forEach((z) =>
      [-9, 9].forEach((x) => {
        const c2 = chandelier(0.9, 2, 8);
        c2.g.position.copy(P(x, 9.4, z));
        zg.B.add(c2.g);
      }),
    );
    // the crowd: couples turning on three rings, a few loners strolling
    const rings = [
      [4.6, 3, 0.16],
      [8.6, 5, -0.11],
      [12.4, 7, 0.08],
    ];
    let n = 0;
    rings.forEach(([r, k, w], ri) => {
      for (let i = 0; i < k; i++) {
        const a = dancer(false, n, n + 1);
        const b = dancer(true, n + 2, n);
        zg.B.add(a.g, b.g);
        crowd.push({ a, b, r, ph: (i * TAU) / k + ri, w, spin: 1.1 + ((n * 7) % 5) * 0.08 });
        n++;
      }
    });
    for (let i = 0; i < 7; i++) {
      const d = dancer(i % 2 === 0, i + 3, i + 2);
      zg.B.add(d.g);
      const r = rng(100 + i);
      wanderers.push({ d, from: V3(), to: V3(), t: 1, dur: 1, r, yaw: 0, wait: r() * 3 });
    }
    makeDust('B', -16, 16, -97, -59, 12, 500, '#ffe0b0');
  };

  // the mirror gallery: two lanes of tiles over the void, mirrors on both walls. Behind each mirror
  // stands a reflected copy of the gallery (the old trick of theatres), so a mirror shows what a
  // mirror would; the path of the other lane glows in it, for the one who must see it there.
  const reflX = (side, x) => (side === 'L' ? -2 * MIRX - x : 2 * MIRX - x);
  const galStatic = new THREE.Group();
  const galWall = { '-1': new THREE.Group(), 1: new THREE.Group() };
  const galEnds = new THREE.Group();
  const buildGallery = () => {
    const K = KZ.C;
    floor('C', -4, 4, -104, -98, M.marble);
    wall('C', 'x', -4.3, -104, -98, 6, { inner: 1 });
    wall('C', 'x', 4.3, -104, -98, 6, { inner: -1 });
    ceiling('C', -4.6, 4.6, -104.3, -97.7, 6);
    const add = (grp, geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      grp.add(m);
      return m;
    };
    // landings (drawn in the static group so the mirrors show them too)
    const land = (z0, z1) => {
      K.collider(0, -0.5, (z0 + z1) / 2, 2 * MIRX, 1, z1 - z0);
      add(galStatic, new THREE.BoxGeometry(2 * MIRX, 1, z1 - z0), M.marbleRose, 0, -0.5, (z0 + z1) / 2);
      add(galStatic, new THREE.BoxGeometry(2 * MIRX, 0.02, 0.18), M.gold, 0, 0.005, z0 + 0.09);
      add(galStatic, new THREE.BoxGeometry(2 * MIRX, 0.02, 0.18), M.gold, 0, 0.005, z1 - 0.09);
    };
    land(-108, -104);
    land(-130, -126);
    land(-156, -148);
    // the pit under the lanes
    const pit = (z0, z1) => {
      add(galStatic, new THREE.PlaneGeometry(2 * MIRX, z1 - z0).rotateX(-Math.PI / 2), M.abyss, 0, -14, (z0 + z1) / 2);
      [-1, 1].forEach((s) => add(galWall[s], new THREE.BoxGeometry(0.4, 14, z1 - z0), M.pit, s * (MIRX - 0.2), -7.2, (z0 + z1) / 2));
      add(galStatic, new THREE.BoxGeometry(2 * MIRX, 14, 0.4), M.pit, 0, -8, z1 - 0.2);
      add(galStatic, new THREE.BoxGeometry(2 * MIRX, 14, 0.4), M.pit, 0, -8, z0 + 0.2);
    };
    pit(-126, -108);
    pit(-148, -130);
    // the centre: a gilded balustrade and a glass screen up to the ceiling
    [[-126, -108], [-148, -130]].forEach(([z0, z1]) => {
      const zc = (z0 + z1) / 2;
      const L = z1 - z0;
      K.collider(0, 3.75, zc, 2.3, 7.5, L);
      add(galStatic, new THREE.BoxGeometry(2.3, 14.3, L), M.pit, 0, -7.0, zc);
      add(galStatic, new THREE.BoxGeometry(2.3, 0.36, L), M.marble, 0, 0.12, zc);
      [-1, 1].forEach((sd) => {
        add(galStatic, new THREE.BoxGeometry(0.16, 0.08, L), M.gold, sd * 1.08, 0.31, zc);
        add(galStatic, new THREE.BoxGeometry(0.22, 0.1, L), M.gold, sd * 1.02, 1.05, zc);
        for (let z = z0 + 0.3; z < z1; z += 0.5) add(galStatic, new THREE.CylinderGeometry(0.045, 0.07, 0.7, 8), M.gold, sd * 1.02, 0.66, z);
        add(galStatic, new THREE.PlaneGeometry(L, 6.4).rotateY(Math.PI / 2), M.glass, sd * 1.16, 4.3, zc);
        for (let z = z0; z <= z1 + 0.01; z += 3) add(galStatic, new THREE.BoxGeometry(0.1, 6.4, 0.1), M.gold, sd * 1.16, 4.3, z);
      });
      add(galStatic, new THREE.BoxGeometry(2.3, 0.3, L), M.gold, 0, 7.45, zc);
    });
    // the side walls: 17 bays of mirror between gilded pilasters
    const mirZ = [];
    for (let k = 0; k < 17; k++) mirZ.push(-105.8 - 3 * k);
    gallery.mirZ = mirZ;
    [-1, 1].forEach((s) => {
      const x = s * (MIRX + TH / 2);
      const Gw = galWall[s];
      K.collider(x, 3.75, -130, TH, 7.5, 52.6);
      const pil = (z) => {
        add(Gw, new THREE.BoxGeometry(TH, 7.5, 0.6), M.plasterRose, x, 3.75, z);
        add(Gw, new THREE.BoxGeometry(0.16, 7.5, 0.34), M.gold, x - s * 0.36, 3.75, z);
        add(Gw, new THREE.BoxGeometry(0.26, 0.5, 0.5), M.gold, x - s * 0.4, 6.9, z);
      };
      mirZ.forEach((z) => {
        pil(z + 1.5);
        add(Gw, new THREE.BoxGeometry(TH, 2.3, 2.4), M.plasterRose, x, 6.35, z);
        add(Gw, new THREE.TorusGeometry(1.2, 0.08, 6, 20, Math.PI).rotateY(Math.PI / 2), M.gold, x - s * 0.32, 5.1, z);
        add(Gw, new THREE.BoxGeometry(0.16, 0.12, 2.4), M.gold, x - s * 0.32, 0.06, z);
        // a candle sconce on each pilaster
      });
      pil(mirZ[mirZ.length - 1] - 1.5);
      add(Gw, new THREE.BoxGeometry(TH, 7.5, 0.8), M.plaster, x, 3.75, -155.9);
      add(Gw, new THREE.BoxGeometry(TH, 7.5, 0.4), M.plaster, x, 3.75, -104.1);
    });
    // mirror glass (on the real walls only)
    gallery.glass = [];
    [-1, 1].forEach((s) => {
      mirZ.forEach((z) => {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.1).rotateY(s < 0 ? Math.PI / 2 : -Math.PI / 2), M.mirror);
        g.position.copy(P(s * MIRX, 2.55, z));
        zg.C.add(g);
        gallery.glass.push(g);
      });
    });
    // ceiling, beams, small chandeliers
    add(galStatic, new THREE.BoxGeometry(2 * MIRX, 0.5, 52), M.panel, 0, 7.75, -130);
    for (let z = -108; z > -156; z -= 4) add(galStatic, new THREE.BoxGeometry(2 * MIRX, 0.3, 0.25), M.goldDark, 0, 7.4, z);
    [-116, -139].forEach((z) => {
      const ch = chandelier(0.85, 2, 8);
      ch.g.position.set(0, 6.0, z);
      galStatic.add(ch.g);
    });
    // the ends (real ones are walls with doors; the reflections get plain walls)
    wall('C', 'z', -104, -MIRX - 0.6, MIRX + 0.6, 7.5, { inner: -1, doors: [[0, 3.6, 4.2]], bare: true });
    wall('C', 'z', -156, -MIRX - 0.6, MIRX + 0.6, 7.5, { inner: 1, doors: [[0, 3.6, 4.2]], bare: true });
    makeDoor('C', 'd3', 0, -156, 3.6, 4.2);
    add(galEnds, new THREE.BoxGeometry(2 * MIRX, 7.5, 0.6), M.plaster, 0, 3.75, -104);
    add(galEnds, new THREE.BoxGeometry(2 * MIRX, 7.5, 0.6), M.plaster, 0, 3.75, -156);
    add(galEnds, new THREE.BoxGeometry(3.4, 4.4, 0.7), M.plasterRose, 0, 2.2, -104);
    add(galEnds, new THREE.BoxGeometry(3.4, 4.4, 0.7), M.plasterRose, 0, 2.2, -156);
    // place the gallery in the world, and its two reflections behind the mirrors
    [galStatic, galWall[-1], galWall[1]].forEach((g) => {
      g.position.copy(O);
      zg.C.add(g);
    });
    ['L', 'R'].forEach((side) => {
      const opp = side === 'L' ? galWall[1] : galWall[-1];
      [galStatic, opp, galEnds].forEach((src) => {
        const c = src.clone(true);
        c.scale.x = -1;
        c.position.set(O.x + (side === 'L' ? -2 * MIRX : 2 * MIRX), O.y, O.z);
        zg.C.add(c);
      });
      // the reflected far wall shows dark mirrors rather than holes
      mirZ.forEach((z) => {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.1).rotateY(Math.PI / 2), M.mirrorDark);
        g.position.copy(P(side === 'L' ? reflX('L', MIRX + 0.02) : reflX('R', -MIRX - 0.02), 2.55, z));
        if (side === 'R') g.rotation.y = Math.PI;
        zg.C.add(g);
      });
    });
    // the tiles: real ones (with colliders) and their two reflections
    const tileGeo = new THREE.BoxGeometry(1.42, 0.3, 1.42);
    const shaftGeo = new THREE.CylinderGeometry(0.5, 0.6, 2.4, 14, 1, true).translate(0, 1.2, 0);
    const glowGeo = new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2);
    const glowMat = () =>
      new THREE.MeshBasicMaterial({ map: T.tileGlow, color: new THREE.Color('#ffb840').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    [1, 2].forEach((half) =>
      ['L', 'R'].forEach((lane) =>
        LANE_X[lane].forEach((x, col) => {
          for (let row = 0; row < ROWS; row++) {
            const z = rowZ(half, row);
            const id = half + lane + row + ':' + col;
            const mat = (row + col) % 2 ? M.tileA : M.tileB;
            const m = K.deco(tileGeo, mat, x, -0.15, z);
            const b = K.collider(x, -0.15, z, 1.42, 0.3, 1.42);
            const copies = ['L', 'R'].map((side) => K.deco(tileGeo, mat, reflX(side, x), -0.15, z));
            // glow on the real floor, and in each reflection
            const gReal = new THREE.Mesh(glowGeo, glowMat());
            gReal.position.copy(P(x, 0.02, z));
            zg.C.add(gReal);
            const gRef = ['L', 'R'].map((side) => {
              const gm = new THREE.Mesh(glowGeo, glowMat());
              gm.position.copy(P(reflX(side, x), 0.02, z));
              zg.C.add(gm);
              gm.shaft = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ map: T.shaft, color: GOLDC, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
              gm.shaft.visible = false;
              gm.add(gm.shaft);
              return gm;
            });
            gallery.tiles[id] = { id, half, lane, row, col, x, z, m, b, copies, gReal, gRef, drop: 0, dropT: -1, lit: 0, glow: 0, want: 0 };
          }
        }),
      ),
    );
    // an unseen ceiling just over your head above the tiles: the gallery is walked, not jumped
    // (one double jump used to skip most rows)
    [1, 2].forEach((half) => {
      const z0 = rowZ(half, 0) + 0.71;
      const z1 = rowZ(half, ROWS - 1) - 0.71;
      K.collider(0, 4.8, (z0 + z1) / 2, 2 * MIRX, 5.8, z0 - z1, { tag: 'nocam' });
    });
    // markers (a heart laid on a tile by the guide), one per lane, also seen in the mirrors
    ['L', 'R'].forEach((lane) => {
      const mk = (x) => {
        const h = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: T.sign.coeur, color: new THREE.Color('#ff7fa8').multiplyScalar(1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
        );
        h.visible = false;
        h.position.x = x;
        zg.C.add(h);
        return h;
      };
      gallery.mark[lane] = { real: mk(0), refl: [mk(0), mk(0)], tile: null, t: 0 };
    });
    // where my eyes point (only on my screen)
    gallery.aim = flat(T.ring, '#ffffff', 1.5, 0.0, 1);
    gallery.aim.visible = false;
    zg.C.add(gallery.aim);
    // the reflections of the two of you (soft silhouettes)
    ['L', 'R'].forEach((side) =>
      [0, 1].forEach((w) => {
        const d = dancer(w === 0, 0, 0, true);
        d.g.children.forEach((c) => c !== d.sign && c.traverse((o) => o.material && (o.material = M.refl)));
        d.body.traverse((o) => o.material && (o.material = M.refl));
        d.sign.visible = false;
        zg.C.add(d.g);
        gallery.refl.push({ side, w, d });
      }),
    );
    makeDust('C', -5.5, 5.5, -155, -104, 7, 320);
  };

  // the great ballroom: a round hall under a glass dome, a parquet of falling squares
  const buildBallroom = () => {
    const K = KZ.D;
    // the short passage from the gallery
    floor('D', -3, 3, -162.5, -156, M.marble);
    wall('D', 'x', -3.3, -162.8, -156, 6, { inner: 1 });
    wall('D', 'x', 3.3, -162.8, -156, 6, { inner: -1 });
    ceiling('D', -3.6, 3.6, -162.8, -155.7, 6);
    // the marble surround: a round floor with a square hole (the parquet goes there)
    const sh = new THREE.Shape();
    sh.absarc(0, 0, R4R + 0.6, 0, TAU, false);
    const hole = new THREE.Path();
    hole.moveTo(-13, -13);
    hole.lineTo(13, -13);
    hole.lineTo(13, 13);
    hole.lineTo(-13, 13);
    hole.lineTo(-13, -13);
    sh.holes.push(hole);
    const sg = new THREE.ShapeGeometry(sh, 64).rotateX(-Math.PI / 2);
    const sur = new THREE.Mesh(sg, M.marble);
    sur.position.copy(P(R4C.x, 0, R4C.z));
    zg.D.add(sur);
    const band = new THREE.Mesh(new THREE.RingGeometry(R4R - 2.4, R4R - 2.1, 96).rotateX(-Math.PI / 2), M.gold);
    band.position.copy(P(R4C.x, 0.01, R4C.z));
    zg.D.add(band);
    // colliders of the surround (four slabs around the square)
    K.collider(0, -0.5, R4C.z - 17.4, 2 * R4R + 2, 1, 8.8);
    K.collider(0, -0.5, R4C.z + 17.4, 2 * R4R + 2, 1, 8.8);
    K.collider(-17.4, -0.5, R4C.z, 8.8, 1, 26);
    K.collider(17.4, -0.5, R4C.z, 8.8, 1, 26);
    // the square edge: a gilded fillet
    [[0, -13, 26.2, 0.2], [0, 13, 26.2, 0.2], [-13, 0, 0.2, 26.2], [13, 0, 0.2, 26.2]].forEach(([x, z, sx, sz]) =>
      K.deco(new THREE.BoxGeometry(sx, 0.04, sz), M.gold, x, 0.01, R4C.z + z),
    );
    // the pit under the parquet
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), M.abyss);
    pb.position.copy(P(0, -14, R4C.z));
    zg.D.add(pb);
    [[0, -13.2, 26.4, 0.4], [0, 13.2, 26.4, 0.4], [-13.2, 0, 0.4, 26.4], [13.2, 0, 0.4, 26.4]].forEach(([x, z, sx, sz]) =>
      K.deco(new THREE.BoxGeometry(sx, 14, sz), M.pit, x, -7.2, R4C.z + z),
    );
    // the parquet squares: two tones, instanced; each has its own collider
    boss.cells = [];
    const lists = [[], []];
    for (let i = 0; i < NC; i++)
      for (let j = 0; j < NC; j++) {
        const [x, z] = cellXZ(i, j);
        const fixed = fixedCell(i, j);
        const b = K.collider(x, -0.5, z, CELL, 1, CELL);
        const c = { i, j, x, z, fixed, b, tone: (i + j) & 1, idx: -1, st: 0, t: 0, fall: 0, y: 0, back: 0 };
        c.idx = lists[c.tone].length;
        c.wi = boss.cells.length;
        lists[c.tone].push(c);
        boss.cells.push(c);
      }
    boss.tileIM = lists.map((list, k) => {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL - 0.04, 0.4, CELL - 0.04), k ? M.parquet2 : M.parquet, list.length);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      zg.D.add(im);
      return im;
    });
    boss.lists = lists;
    // the warning glow on squares about to fall
    boss.warnIM = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(CELL - 0.1, CELL - 0.1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#ff6a3a').multiplyScalar(1.1), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      boss.cells.length,
    );
    boss.warnIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    boss.warnIM.frustumCulled = false;
    zg.D.add(boss.warnIM);
    // the dais rosace in the middle
    const dais = new THREE.Mesh(new THREE.CircleGeometry(2.9, 64).rotateX(-Math.PI / 2), M.medal4);
    dais.position.copy(P(0, 0.012, R4C.z));
    zg.D.add(dais);
    // the round wall: 32 segments, tall arched windows, the entrance at +z
    const NSEG = 32;
    for (let k = 0; k < NSEG; k++) {
      const a = (k / NSEG) * TAU;
      const nx = Math.sin(a);
      const nz = Math.cos(a);
      const entrance = k === 0;
      const segW = 2 * (R4R + 0.3) * Math.tan(Math.PI / NSEG) + 0.05;
      const win = k % 2 === 0;
      const g = new THREE.Group();
      g.position.copy(P(nx * (R4R + 0.3), 0, R4C.z + nz * (R4R + 0.3)));
      g.rotation.y = a;
      const add = (geo, mat, y) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y;
        g.add(m);
        return m;
      };
      if (entrance) {
        add(new THREE.BoxGeometry(segW, 14 - 4.2, TH), M.plaster, 4.2 + (14 - 4.2) / 2);
      } else if (win) {
        add(new THREE.BoxGeometry(segW, 2.6, TH), M.plaster, 1.3);
        add(new THREE.BoxGeometry(segW, 2.4, TH), M.plaster, 12.8);
        const gl = add(new THREE.PlaneGeometry(segW, 9), M.glass, 7.1);
        void gl;
        add(new THREE.BoxGeometry(0.1, 9, 0.12), M.gold, 7.1);
        for (let y = 4.2; y < 11.4; y += 1.8) add(new THREE.BoxGeometry(segW, 0.06, 0.1), M.gold, y);
        add(new THREE.BoxGeometry(segW + 0.04, 0.2, 0.5), M.marble, 2.6);
      } else {
        add(new THREE.BoxGeometry(segW, 14, TH), M.plaster, 7);
        const pil = add(new THREE.BoxGeometry(0.9, 13, 0.3), M.marbleRose, 6.5);
        pil.position.z = -0.4;
      }
      if (!entrance) {
        const pan = add(new THREE.BoxGeometry(segW, 1.05, 0.06), M.panel, 0.52);
        pan.position.z = -TH / 2 - 0.04;
      }
      const cor = add(new THREE.BoxGeometry(segW, 0.4, 0.4), M.gold, 13.6);
      cor.position.z = -0.4;
      zg.D.add(g);
      // colliders: small boxes along the circle (axis-aligned), not across the entrance
      if (!entrance) {
        for (let s = 0; s < 2; s++) {
          const aa = ((k - 0.25 + s * 0.5) / NSEG) * TAU;
          K.collider(Math.sin(aa) * (R4R + 0.9), 7, R4C.z + Math.cos(aa) * (R4R + 0.9), 2.6, 14, 2.6);
        }
      }
    }
    // the dome: gilded ribs and glass, the night through it
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R4R + 0.4, 48, 16, 0, TAU, 0, Math.PI / 2), M.glass);
    dome.position.copy(P(0, 14, R4C.z));
    dome.scale.y = 0.55;
    zg.D.add(dome);
    for (let k = 0; k < 16; k++) {
      // a quarter arc from the rim to the top, in a vertical plane
      const rib = new THREE.Mesh(new THREE.TorusGeometry(R4R + 0.3, 0.12, 6, 40, Math.PI / 2), M.gold);
      rib.position.copy(P(0, 14, R4C.z));
      rib.scale.set(1, 0.55, 1);
      rib.rotation.y = (k / 16) * TAU;
      zg.D.add(rib);
    }
    [0.42, 0.75].forEach((h) => {
      const rr = Math.sqrt(1 - h * h) * (R4R + 0.3);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.1, 6, 64).rotateX(Math.PI / 2), M.gold);
      ring.position.copy(P(0, 14 + h * (R4R + 0.3) * 0.55, R4C.z));
      zg.D.add(ring);
    });
    // the Grand Lustre
    const L = chandelier(2.6, 3, 14);
    L.g.position.copy(P(0, 12.5, R4C.z));
    zg.D.add(L.g);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6).translate(0, 0.5, 0), M.gold);
    chain.position.copy(P(0, 12.5, R4C.z));
    zg.D.add(chain);
    boss.L = L;
    boss.chain = chain;
    boss.lustre = { y: 12.5, x: 0, z: R4C.z, spin: 0, tilt: 0 };
    // the four candelabras (dark until relit)
    boss.cands = CANDLES.map(([x, dz], k) => {
      K.solid(x, 0.55, R4C.z + dz, 1.1, 1.1, 1.1, M.marbleD);
      K.deco(new THREE.BoxGeometry(1.24, 0.1, 1.24), M.gold, x, 1.12, R4C.z + dz);
      const cd = candelabra(zg.D, O.x + x, 1.15, O.z + R4C.z + dz, 1.3);
      cd.fls.forEach((f) => (f.on = 0));
      // a ring of four quarters on the floor: the measures danced
      const quarters = [0, 1, 2, 3].map((q) => {
        const m = new THREE.Mesh(
          new THREE.RingGeometry(1.5, 1.85, 24, 1, (q * TAU) / 4 + 0.06, TAU / 4 - 0.12).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(1.2), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
        );
        m.position.copy(P(x, 1.19, R4C.z + dz));
        zg.D.add(m);
        return m;
      });
      const halo = sprite(T.soft, '#ffcf8a', 5, 0, 1);
      halo.position.copy(P(x, 3.4, R4C.z + dz));
      zg.D.add(halo);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 1.2, 12, 16, 1, true).translate(0, 6, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(0.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      beam.position.copy(P(x, 1.2, R4C.z + dz));
      zg.D.add(beam);
      return { k, x, z: R4C.z + dz, cd, quarters, halo, beam, lvl: 0, show: 0 };
    });
    // falling crystals (pampilles): a pool, with their warning circles
    boss.drops = [];
    for (let i = 0; i < 16; i++) {
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), M.crystal);
      cr.scale.set(1, 2.2, 1);
      cr.visible = false;
      zg.D.add(cr);
      const tel = flat(T.ring, '#ff7a5a', 3.0, 0, 1.2);
      tel.visible = false;
      zg.D.add(tel);
      const tel2 = flat(T.soft, '#ff6a4a', 2.6, 0, 1);
      tel2.visible = false;
      zg.D.add(tel2);
      boss.drops.push({ cr, tel, tel2, t: -1, x: 0, z: 0, land: 0, start: 0, from: V3(), hit: false });
    }
    // ghost couples whirling round the hall; dancers who bow at the end
    for (let i = 0; i < 6; i++) {
      const a = dancer(false, i, 0, true);
      const b = dancer(true, i, 0, true);
      zg.D.add(a.g, b.g);
      ghosts.push({ zk: 'D', a, b, c: R4C, r: 16.6, ph: (i * TAU) / 6, w: 0.07 });
    }
    for (let i = 0; i < 10; i++) {
      const d = dancer(i % 2 === 1, i + 1, i);
      const a = (i / 10) * TAU + 0.31;
      d.g.position.copy(P(Math.sin(a) * 6.2, 0, R4C.z + Math.cos(a) * 6.2));
      d.g.rotation.y = a + Math.PI;
      d.g.visible = false;
      zg.D.add(d.g);
      bowers.push(d);
    }
    makeDust('D', -18, 18, R4C.z - 18, R4C.z + 18, 20, 700);
    makePetals('D', 0, R4C.z, 17, 16, 160);
    card = LvKit.trialCard('h7', true);
    card.position.copy(P(0, 3.6, R4C.z));
    zg.D.add(card);
  };

  const plaque = (zk, text, sub, x, y, z, ry = 0) => {
    const tex = LvKit.tex(1080, 300, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#2a1420');
      gr.addColorStop(1, '#1a0c16');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c99a48';
      g.lineWidth = 10;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.lineWidth = 3;
      g.strokeRect(30, 30, w - 60, h - 60);
      g.fillStyle = '#f0dcc0';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 112px "Bodoni Moda", Georgia, serif';
      g.fillText(text, w / 2, h * 0.43);
      g.font = '40px Georgia';
      g.fillStyle = '#c99a48';
      g.fillText(sub, w / 2, h * 0.78);
      g.fillStyle = '#c8405a';
      heartPath(g, w * 0.18, h * 0.47, 2.2);
      g.fill();
      heartPath(g, w * 0.82, h * 0.47, 2.2);
      g.fill();
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    m.material.color.setScalar(0.8);
    m.position.copy(P(x, y, z));
    m.rotation.y = ry;
    zg[zk].add(m);
    return m;
  };

  // the light rig: a few warm lamps moved from room to room (a constant count: no recompiles)
  const RIG = {
    1: [[0, 5.5, -6], [0, 8, -24], [0, 8, -40], [0, 4, -54]],
    2: [[0, 8, -24], [0, 8, -40], [-10, 4, -32], [10, 4, -32]],
    3: [[0, 4, -54], [0, 8, -78], [-9, 7, -66], [9, 7, -90]],
    4: [[0, 5.5, -112], [0, 5.5, -124], [0, 5.5, -140], [0, 5.5, -152]],
    5: [[0, 9, -182], [-8, 4, -190], [8, 4, -174], [0, 4, -160]],
    6: [[0, 6, -182], [-8, 4, -190], [8, 4, -174], [0, 4, -160]],
  };

  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) {
      root.visible = true;
      return;
    }
    Phys.owner('tr_h7');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    root.visible = true;
    makeTextures();
    makeMats();
    // outside: a terrace of dark lawn round the palace (not under the pits), cypresses far off
    const lawn = Tex.mat('grass', { color: '#1a2418', scale: 5, rough: 0.95 });
    [
      [-170, 40, -270, 60],
      [24, 170, -270, 60],
      [-24, 24, 6, 60],
      [-24, 24, -270, -208],
      [-24, -18.4, -158, -102],
      [18.4, 24, -158, -102],
      [-24, -14.6, -206, -158],
      [14.6, 24, -206, -158],
      [-24, 24, -102, 6],
    ].forEach(([x0, x1, z0, z1]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), lawn);
      m.position.copy(P((x0 + x1) / 2, -0.6, (z0 + z1) / 2));
      root.add(m);
    });
    const treeG = new THREE.ConeGeometry(1.4, 10, 8).translate(0, 5, 0);
    const treeM = new THREE.MeshStandardMaterial({ color: '#10180f', roughness: 0.9, flatShading: true });
    const tr = rng(17);
    const tl = [];
    for (let i = 0; i < 70; i++) {
      const sd = i % 2 ? 1 : -1;
      tl.push([sd * (32 + tr() * 50), -0.6, 10 - tr() * 230, 0.8 + tr() * 0.8]);
    }
    const trees = new THREE.InstancedMesh(treeG, treeM, tl.length);
    tl.forEach(([x, y, z, s], i) => {
      m4.compose(P(x, y, z), q4.identity(), s4.set(s, s * (0.9 + (i % 3) * 0.15), s));
      trees.setMatrixAt(i, m4);
    });
    trees.frustumCulled = false;
    root.add(trees);
    buildVestibule();
    buildSalon();
    buildMasked();
    buildGallery();
    buildBallroom();
    // the golden thread between two hands
    thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1, 6, 1, true).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(1.3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    thread.visible = false;
    root.add(thread);
    mySign = sprite(T.sign.coeur, '#ffffff', 0.62, 0, 1);
    mySign.visible = false;
    root.add(mySign);
    // the partner, as a mannequin among the masks
    proxy = dancer(true, 4, 3);
    proxy.g.visible = false;
    root.add(proxy.g);
    const proxyM = dancer(false, 3, 3);
    proxyM.g.visible = false;
    root.add(proxyM.g);
    proxy = { fem: proxy, man: proxyM, cur: null, yaw: 0, last: V3(), speed: 0 };
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffb870', 0, 22, 2);
      root.add(l);
      lights.push(l);
    }
    tileMatrices();
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the palace's own geometry, materials and canvas textures (the zone groups and the
  // gallery's groups that its mirrors copy), takes its colliders out and forgets every reference
  // build() made; the tables the level reads (doors, crowd, gallery, boss...) are emptied in place.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    const r = Life.free([root, ...Object.values(zg), galStatic, galWall[-1], galWall[1], galEnds], [M, T, skirtGeo]);
    Object.values(zg).forEach((g) => root.add(g));
    r.world = 'tr_h7';
    r.colliders = Phys.drop('tr_h7');
    built = false;
    [M, T, doors, waltz, signs, boss, gallery].forEach(clear);
    Object.assign(gallery, gallery0());
    [flames, dust, petals, lights, ghosts, crowd, wanderers, bowers].forEach((a) => (a.length = 0));
    screen = card = proxy = thread = mySign = null;
    return r;
  };

  // ---------- per frame ----------
  const zoneVis = (pz) => {
    Object.entries(ZONES).forEach(([k, [z0, z1]]) => {
      zg[k].visible = pz > z0 - 26 && pz < z1 + 26;
    });
  };
  const tileMatrices = () => {
    boss.cells.forEach((c) => {
      const im = boss.tileIM[c.tone];
      const y = c.y;
      if (c.fall > 0.999) m4.makeScale(0, 0, 0);
      else {
        e4.set(c.fall * 0.9 * ((c.i % 2) * 2 - 1), 0, c.fall * 0.7 * ((c.j % 2) * 2 - 1));
        m4.compose(P(c.x, -0.2 + y, c.z), q4.setFromEuler(e4), s4.set(1, 1, 1));
      }
      im.setMatrixAt(c.idx, m4);
      if (c.st === 1) {
        const k = c.warn || 0;
        m4.compose(P(c.x, 0.02, c.z), q4.identity(), s4.set(k, 1, k));
      } else m4.makeScale(0, 0, 0);
      boss.warnIM.setMatrixAt(c.wi, m4);
    });
    boss.tileIM.forEach((im) => (im.instanceMatrix.needsUpdate = true));
    boss.warnIM.instanceMatrix.needsUpdate = true;
  };

  const placeDancer = (d, x, z, yaw) => {
    d.g.position.set(O.x + x, O.y, O.z + z);
    d.g.rotation.y = yaw;
  };

  const update = (dt, t, st) => {
    if (!built) return;
    const me = rel(st.me);
    zoneVis(me.z);
    const beat = st.beat || 0;
    // the light rig follows the stage
    const rig = RIG[st.stage] || RIG[1];
    lights.forEach((l, i) => {
      const p = rig[i];
      l.position.copy(P(p[0], p[1], p[2]));
      const target = (st.stage === 5 || st.stage === 6) && i > 0 ? 0.6 + (st.lit || 0) * 0.25 : 1.15;
      l.intensity = damp(l.intensity, target * (0.92 + Math.sin(t * 7 + i * 3) * 0.04 + Math.sin(t * 13 + i) * 0.03), 4, dt);
    });
    // flames flicker
    flames.forEach((f) => {
      const k = f.base * (0.88 + Math.sin(t * 11 + f.ph) * 0.07 + Math.sin(t * 23 + f.ph * 2) * 0.05) * f.on;
      f.s.scale.set(Math.max(0.0001, k), Math.max(0.0001, k * 1.8), 1);
      f.s.visible = f.on > 0.01;
    });
    // dust and petals of the visible zones
    dust.forEach((D) => {
      if (!zg[D.zk].visible) return;
      const a = D.pts.geometry.attributes.position.array;
      D.seeds.forEach(([x, y, z, s], i) => {
        const yy = (y + t * 0.08 + s) % D.y1;
        a[i * 3] = O.x + x + Math.sin(t * 0.3 + s) * 0.6;
        a[i * 3 + 1] = O.y + yy;
        a[i * 3 + 2] = O.z + z + Math.cos(t * 0.27 + s * 1.3) * 0.6;
      });
      D.pts.geometry.attributes.position.needsUpdate = true;
    });
    petals.forEach((Pt) => {
      if (!zg[Pt.zk].visible) return;
      const storm = Pt.zk === 'D' && st.stage === 6 ? 2.2 : 1;
      Pt.seeds.forEach(([x, z, s, v, r0], i) => {
        const y = Pt.y1 - ((t * v * storm + s) % Pt.y1);
        e4.set(t * 1.3 + r0, t * 0.7 + s, Math.sin(t * 2 + s) * 0.8);
        m4.compose(P(x + Math.sin(t * 0.6 + s) * 1.2, y, z + Math.cos(t * 0.5 + r0) * 1.2), q4.setFromEuler(e4), s4.set(1, 1, 1));
        Pt.im.setMatrixAt(i, m4);
      });
      Pt.im.instanceMatrix.needsUpdate = true;
    });
    // doors swing open
    Object.values(doors).forEach((d) => {
      d.open = damp(d.open, d.want, 2.2, dt);
      d.leaves.forEach(({ piv, sd }) => (piv.rotation.y = sd * d.open * 2.75 * d.inner));
      d.b.on = d.open < 0.5;
    });
    // ghost couples
    ghosts.forEach((G) => {
      if (!zg[G.zk].visible) return;
      const fast = G.zk === 'D' ? (st.stage === 5 ? 1.8 + (st.lit || 0) * 0.35 : st.stage === 6 ? 0.6 : 1) : 1;
      G.ang = (G.ang == null ? G.ph : G.ang) + dt * G.w * fast * (st.music ? 1 : 0.4);
      const cx = G.c.x + Math.sin(G.ang) * G.r;
      const cz = G.c.z + Math.cos(G.ang) * G.r;
      const spin = (beat / 3) * Math.PI * 0.9 + G.ph;
      [G.a, G.b].forEach((d, k) => {
        const a = spin + k * Math.PI;
        placeDancer(d, cx + Math.sin(a) * 0.38, cz + Math.cos(a) * 0.38, a + Math.PI);
        poseDance(d, beat, 1);
        const fade = G.zk === 'D' && st.stage === 6 ? 0.5 : 1;
        d.g.visible = fade > 0.05;
      });
    });
    if (screen && screen.update) screen.update(dt, t);
    if (zg.A.visible) updateSalon(dt, t, st);
    if (zg.B.visible) updateMasked(dt, t, st);
    if (zg.C.visible) updateGallery(dt, t, st);
    if (zg.D.visible) updateBall(dt, t, st);
    // my own sign, raised over my head
    if (st.mySign) {
      const [kind, col, left] = st.mySign;
      if (mySign.material.map !== T.sign[kind]) {
        mySign.material.map = T.sign[kind];
        mySign.material.needsUpdate = true;
      }
      mySign.material.color.set(col).multiplyScalar(1.15);
      const k = clamp(Math.min(left, 2.6 - left) * 3, 0, 1);
      mySign.material.opacity = k * 0.95;
      mySign.position.set(st.me.x, st.me.y + 2.4 + (1 - k) * 0.3, st.me.z);
      mySign.visible = true;
    } else mySign.visible = false;
    // the golden thread: two hands holding
    if (st.thread) {
      const [a, b, k] = st.thread;
      thread.visible = k > 0.02;
      tmp.copy(b).sub(a);
      const len = tmp.length();
      thread.position.copy(a);
      thread.quaternion.setFromUnitVectors(V3(0, 1, 0), tmp.normalize());
      thread.scale.set(1, Math.max(0.01, len), 1);
      thread.material.opacity = k * (0.55 + Math.sin(t * 6) * 0.15);
    } else thread.visible = false;
  };

  const updateSalon = (dt, t, st) => {
    const W = st.waltz || {};
    // leader marks
    waltz.marks.forEach((m, i) => {
      const mk = W.marks && W.marks[i];
      m.g.visible = !!mk;
      if (!mk) return;
      m.g.position.copy(P(R1C.x + mk[0], 0.03, R1C.z + mk[1]));
      const k = mk[2]; // 0..1 how close the beat is
      m.fill.scale.setScalar(Math.max(0.05, k));
      m.fill.material.opacity = (i ? 0.15 : 0.55) * (0.6 + k * 0.4);
      m.ring.material.opacity = i ? 0.3 : 0.9;
      m.halo.material.opacity = i ? 0.1 : 0.2 + k * 0.4;
      m.shaft.material.opacity = i ? 0.08 : 0.15 + k * k * 0.4;
      m.shaft.scale.set(1, 0.6 + k * 0.4, 1);
      m.ring.rotation.y = t * 0.6;
    });
    const sL = W.startL;
    waltz.startL.g.visible = !!sL;
    if (sL) {
      waltz.startL.g.position.copy(P(R1C.x + sL[0], 0.03, R1C.z + sL[1]));
      waltz.startL.fill.material.opacity = sL[2] ? 0.7 : 0.25 + Math.sin(t * 4) * 0.1;
    }
    const sF = W.startF;
    waltz.startF.g.visible = !!sF;
    if (sF) {
      waltz.startF.g.position.copy(P(R1C.x + sF[0], 0.03, R1C.z + sF[1]));
      waltz.startF.fill.material.opacity = sF[2] ? 0.7 : 0.25 + Math.sin(t * 4 + 1) * 0.1;
    }
    // the follower's band round the leader (only on the follower's screen)
    const bd = W.band;
    if (bd) {
      waltz.band.visible = true;
      waltz.band.position.set(bd[0], O.y + 0.04, bd[1]);
      waltz.band.material.opacity = damp(waltz.band.material.opacity, bd[2], 6, dt);
      waltz.band.material.color.set(bd[3] ? '#ff6a5a' : '#ffd9a0').multiplyScalar(1.2);
      waltz.band.rotation.y = -t * 0.4;
    } else waltz.band.visible = false;
    // cracks fade when the parquet mends
    waltz.cracks.forEach((c, i) => {
      const want = W.cracks > i ? 1 : 0;
      c.k = damp(c.k, want, want ? 9 : 1.2, dt);
      c.m.material.opacity = c.k * (0.85 + Math.sin(t * 9 + i) * 0.1);
      c.m.visible = c.k > 0.01;
      if (W.crackAt && W.crackAt[i]) c.m.position.set(O.x + W.crackAt[i][0], O.y + 0.03 + i * 0.002, O.z + W.crackAt[i][1]);
      c.m.rotation.y = i * 2.1;
    });
  };

  const updateMasked = (dt, t, st) => {
    const beat = st.beat || 0;
    const MS = st.mask || {};
    const found = MS.found;
    // the pedestals: who picked what
    signs.peds.forEach((pd) => {
      pd.s.position.y = O.y + 1.7 + Math.sin(t * 2 + pd.x) * 0.06;
      const picked = MS.signs || {};
      pd.ringD.material.opacity = picked.dame === pd.k ? 0.8 : 0;
      pd.ringV.material.opacity = picked.valet === pd.k ? 0.8 : 0;
      pd.ringD.rotation.y = t * 0.5;
      pd.ringV.rotation.y = -t * 0.5;
      pd.s.material.opacity = MS.phase === 0 ? 0.9 : 0.35;
    });
    signs.curtains.forEach((c, i) => {
      c.glowC.material.opacity = MS.phase === 0 && MS.ready ? 0.35 + Math.sin(t * 3 + i) * 0.12 : 0;
    });
    // the crowd turns (slows and bows once you have found each other)
    const slow = found ? 0 : 1;
    crowd.forEach((C, i) => {
      C.ang = (C.ang == null ? C.ph : C.ang) + dt * C.w * slow;
      const cx = R2C.x + Math.sin(C.ang) * C.r;
      const cz = R2C.z + Math.cos(C.ang) * C.r;
      C.sp = (C.sp || 0) + dt * C.spin * slow * 1.6;
      [C.a, C.b].forEach((d, k) => {
        const a = C.sp + k * Math.PI;
        placeDancer(d, cx + Math.sin(a) * 0.42, cz + Math.cos(a) * 0.42, a + Math.PI);
        if (!found) poseDance(d, beat + i * 0.13, 1);
        else {
          d.bow = damp(d.bow, 1, 2, dt);
          d.body.rotation.x = d.bow * 0.5;
          d.arms.forEach((a2, j) => a2.rotation.set(-0.3 * d.bow, 0, (j ? 1 : -1) * 0.2));
          d.maskFall = Math.min(1, d.maskFall + dt * 0.8);
          d.mask.position.y = 1.66 - d.maskFall * d.maskFall * 1.6;
          d.mask.rotation.x = d.maskFall * 1.4;
        }
        tickSign(d, dt, t);
      });
    });
    wanderers.forEach((W) => {
      const d = W.d;
      if (!found) {
        if (W.wait > 0) W.wait -= dt;
        else {
          W.t += dt / W.dur;
          if (W.t >= 1) {
            W.from.copy(W.to.lengthSq() ? W.to : V3(W.r() * 20 - 10, 0, R2C.z + W.r() * 20 - 10));
            const a = W.r() * TAU;
            const rr = 2.5 + W.r() * 11.5;
            W.to.set(Math.sin(a) * rr, 0, R2C.z + Math.cos(a) * rr);
            W.dur = W.from.distanceTo(W.to) / (1.6 + W.r() * 1.4);
            W.t = 0;
            W.wait = W.r() < 0.4 ? W.r() * 2.5 : 0;
          }
        }
        const k = smooth(clamp(W.t, 0, 1));
        const x = lerp(W.from.x, W.to.x, k);
        const z = lerp(W.from.z, W.to.z, k);
        const want = Math.atan2(W.to.x - W.from.x, W.to.z - W.from.z);
        W.yaw = angleDamp(W.yaw, want, 6, dt);
        placeDancer(d, x, z, W.yaw);
        const walking = W.wait <= 0 && W.t < 1;
        d.g.position.y = O.y + (walking ? Math.abs(Math.sin(t * 7 + W.dur)) * 0.04 : 0);
        d.arms.forEach((a, j) => a.rotation.set(walking ? Math.sin(t * 7 + j * Math.PI) * 0.35 : 0, 0, (j ? 1 : -1) * 0.12));
      } else {
        d.bow = damp(d.bow, 1, 2, dt);
        d.body.rotation.x = d.bow * 0.5;
        d.maskFall = Math.min(1, d.maskFall + dt * 0.8);
        d.mask.position.y = 1.66 - d.maskFall * d.maskFall * 1.6;
      }
      tickSign(d, dt, t);
    });
    // the partner's mannequin
    const px = proxy;
    const show = MS.proxy;
    const kind = MS.proxyFem ? px.fem : px.man;
    const other = MS.proxyFem ? px.man : px.fem;
    other.g.visible = false;
    kind.g.visible = !!show;
    if (show) {
      const p = MS.proxy;
      const dx = p.x - px.last.x;
      const dz = p.z - px.last.z;
      const sp = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
      px.speed = damp(px.speed, sp, 8, dt);
      if (sp > 0.3) px.yaw = angleDamp(px.yaw, Math.atan2(dx, dz), 10, dt);
      px.last.copy(p);
      kind.g.position.copy(p);
      kind.g.rotation.y = px.yaw;
      const walking = px.speed > 0.6;
      kind.g.position.y += walking ? Math.abs(Math.sin(t * 8)) * 0.04 : 0;
      const raise = kind.sigT > 0 ? 1 : 0;
      kind.arms[0].rotation.set(walking ? Math.sin(t * 8) * 0.35 : 0, 0, -0.12);
      kind.arms[1].rotation.set(raise ? -2.7 : walking ? -Math.sin(t * 8) * 0.35 : 0, 0, raise ? 0.15 : 0.12);
      kind.mask.position.y = 1.66;
      tickSign(kind, dt, t);
    }
  };
  // a raised sign shows for a moment over a mannequin
  const tickSign = (d, dt, t) => {
    if (d.sigT > 0) {
      d.sigT -= dt;
      const k = clamp(Math.min(d.sigT, 2.6 - d.sigT) * 3, 0, 1);
      d.sign.material.opacity = k * 0.95;
      d.sign.position.y = 2.25 + (1 - k) * 0.3 + Math.sin(t * 5) * 0.04;
      d.sign.visible = true;
    } else if (d.sign.visible) {
      d.sign.visible = false;
      d.sign.material.opacity = 0;
    }
  };
  const showSign = (d, kind, color) => {
    d.sigT = 2.6;
    d.sigKind = kind;
    d.sign.material.map = T.sign[kind];
    d.sign.material.color.set(color).multiplyScalar(1.15);
    d.sign.material.needsUpdate = true;
  };

  const GOLDC = new THREE.Color('#ffb840').multiplyScalar(1.4);
  const ROSEC = new THREE.Color('#ff7fa8').multiplyScalar(0.9);
  const updateGallery = (dt, t, st) => {
    const G = st.gal || {};
    Object.values(gallery.tiles).forEach((tl) => {
      // the drop of a false tile
      if (tl.dropT >= 0) {
        tl.dropT += dt;
        tl.drop = tl.dropT < 0.35 ? 0 : Math.min(1, (tl.dropT - 0.35) / 0.8);
        if (tl.dropT > 3.2) {
          tl.dropT = -1;
          tl.drop = 0;
        }
      }
      const shake = tl.dropT >= 0 && tl.dropT < 0.35 ? Math.sin(t * 60) * 0.03 : 0;
      const y = -0.15 - tl.drop * tl.drop * 9;
      tl.m.position.set(O.x + tl.x + shake, O.y + y, O.z + tl.z);
      tl.m.rotation.set(tl.drop * 0.8, 0, tl.drop * 0.5);
      tl.m.visible = tl.drop < 0.99;
      tl.copies.forEach((c, i) => {
        c.position.set(O.x + reflX(i ? 'R' : 'L', tl.x) - shake, O.y + y, O.z + tl.z);
        c.rotation.set(tl.drop * 0.8, 0, -tl.drop * 0.5);
        c.visible = tl.m.visible;
      });
      tl.b.on = tl.dropT < 0.35;
      // glows: the path (as told by the level) and the tiles already walked on
      const want = tl.want;
      tl.glow = damp(tl.glow, want, 5, dt);
      tl.lit = damp(tl.lit, tl.litWant || 0, 4, dt);
      const pulse = 0.8 + Math.sin(t * 3 + tl.row * 0.6) * 0.2;
      tl.gReal.material.opacity = Math.max(tl.glow * 0.95 * pulse, tl.lit * 0.45) * (tl.m.visible ? 1 : 0);
      if (tl.glow > 0.05 || tl.lit > 0.05) tl.gReal.material.color.copy(tl.glow * 0.95 >= tl.lit * 0.45 ? GOLDC : ROSEC);
      tl.gReal.visible = tl.gReal.material.opacity > 0.01;
      tl.gReal.position.y = O.y + y + 0.17;
      tl.gRef.forEach((gm, i) => {
        const side = i ? 'R' : 'L';
        const on = tl.mirrorWant === side ? 1 : 0;
        tl.mg = tl.mg || [0, 0];
        tl.mg[i] = damp(tl.mg[i], on, 5, dt);
        gm.material.opacity = Math.max(tl.mg[i] * 0.95 * pulse, tl.lit * 0.3) * (tl.m.visible ? 1 : 0);
        if (tl.mg[i] > 0.05 || tl.lit > 0.05) gm.material.color.copy(tl.mg[i] * 0.95 >= tl.lit * 0.3 ? GOLDC : ROSEC);
        gm.shaft.material.opacity = tl.mg[i] * (0.32 + Math.sin(t * 2.2 + tl.row) * 0.08) * (tl.m.visible ? 1 : 0);
        gm.shaft.visible = gm.shaft.material.opacity > 0.01;
        gm.visible = gm.material.opacity > 0.01;
        gm.position.y = O.y + y + 0.17;
      });
    });
    // the markers
    ['L', 'R'].forEach((lane) => {
      const mk = gallery.mark[lane];
      const id = G.marks && G.marks[lane];
      const tl = id && gallery.tiles[id];
      mk.real.visible = !!tl;
      mk.refl.forEach((r) => (r.visible = !!tl));
      if (!tl) return;
      const k = 1 + Math.sin(t * 6) * 0.08;
      mk.real.position.set(O.x + tl.x, O.y + 0.05, O.z + tl.z);
      mk.real.scale.setScalar(k);
      mk.real.rotation.y = 0;
      mk.refl.forEach((r, i) => {
        r.position.set(O.x + reflX(i ? 'R' : 'L', tl.x), O.y + 0.05, O.z + tl.z);
        r.scale.set(-k, k, k);
      });
    });
    const at = G.aim && gallery.tiles[G.aim];
    gallery.aim.visible = !!at;
    if (at) {
      gallery.aim.position.set(O.x + at.x, O.y + 0.06, O.z + at.z);
      gallery.aim.rotation.y = t;
      gallery.aim.material.opacity = 0.55 + Math.sin(t * 8) * 0.15;
    }
    // reflections of the two of you
    gallery.refl.forEach((R0) => {
      const p = R0.w === 0 ? G.dame : G.valet;
      R0.d.g.visible = !!p;
      if (!p) return;
      R0.d.g.position.set(2 * (O.x + (R0.side === 'L' ? -MIRX : MIRX)) - p.x, p.y, p.z);
      R0.d.g.rotation.y = -(R0.w === 0 ? G.dameYaw : G.valetYaw) || 0;
      R0.d.g.scale.set(-1, 1, 1);
    });
    gallery.glass.forEach((g, i) => (g.material.opacity = 0.15 + Math.sin(t * 0.7 + i) * 0.03));
  };

  const updateBall = (dt, t, st) => {
    const B = st.ball || {};
    const beat = st.beat || 0;
    // the Grand Lustre: hangs, comes loose, swings and spins over the floor, lands at the end
    const L = boss.lustre;
    const want = B.lustre || { y: 12.5, x: 0, z: R4C.z, spin: 0, tilt: 0 };
    L.y = damp(L.y, want.y, want.fast ? 6 : 1.4, dt);
    L.x = damp(L.x, want.x, 2.5, dt);
    L.z = damp(L.z, want.z, 2.5, dt);
    L.spin += dt * want.spin;
    L.tilt = damp(L.tilt, want.tilt, 3, dt);
    boss.L.g.position.copy(P(L.x, L.y, L.z));
    boss.L.g.rotation.set(L.tilt * Math.cos(L.spin * 0.7), L.spin, L.tilt * Math.sin(L.spin * 0.7));
    boss.L.halo.material.opacity = 0.18 + (B.lit || 0) * 0.05 + Math.pow(Math.max(0, Math.sin((beat / 3) * TAU)), 8) * 0.12;
    boss.chain.visible = want.chain !== false;
    boss.chain.position.copy(P(L.x, L.y + 3.6, L.z));
    boss.chain.scale.set(1, Math.max(0.01, 25 - L.y - 3.6), 1);
    // the candelabras
    boss.cands.forEach((c, k) => {
      const lvl = (B.lit && B.lit[k]) || 0;
      c.show = damp(c.show, lvl, 4, dt);
      c.quarters.forEach((q, i) => {
        q.material.opacity = i < lvl ? 0.85 : B.near === k ? 0.22 + Math.sin(t * 5) * 0.08 : 0.1;
      });
      c.cd.fls.forEach((f, i) => (f.on = clamp(c.show - i * 0.8 + 0.2, 0, 1)));
      c.halo.material.opacity = c.show / 4 * 0.45;
      c.beam.material.opacity = lvl >= 4 ? 0.12 + Math.sin(t * 2 + k) * 0.04 : 0;
    });
    // squares: warning, fall, rise again
    let dirty = false;
    boss.cells.forEach((c) => {
      if (c.st === 0 && c.fall === 0 && c.y === 0) return;
      dirty = true;
      if (c.st === 1) {
        c.warn = 0.6 + Math.sin(t * 22) * 0.2;
        c.y = Math.sin(t * 50 + c.i) * 0.03;
        if (beat >= c.at) {
          c.st = 2;
          c.y = 0;
        }
      } else if (c.st === 2) {
        c.fall = Math.min(1, c.fall + dt * 1.4);
        c.y = -c.fall * c.fall * 12;
        if (beat >= c.back) c.st = 3;
      } else if (c.st === 3) {
        c.fall = Math.max(0, c.fall - dt * (st.stage === 6 ? 3 : 1.2));
        c.y = -c.fall * c.fall * 12;
        if (c.fall <= 0) {
          c.st = 0;
          c.y = 0;
        }
      } else {
        c.fall = Math.max(0, c.fall - dt * 1.2);
        c.y = -c.fall * c.fall * 12;
      }
      // once the ball is won the parquet holds everywhere, even while it rises back
      c.b.on = st.stage === 6 || c.st <= 1 || (c.st === 3 && c.fall < 0.05) || (c.st === 0 && c.fall < 0.05);
    });
    if (dirty || !boss.matOnce) {
      boss.matOnce = true;
      tileMatrices();
    }
    // the crystals
    boss.drops.forEach((d) => {
      if (d.t < 0) return;
      const k = (beat - d.start) / Math.max(0.01, d.land - d.start);
      d.tel.visible = d.tel2.visible = k < 1.25;
      d.tel.position.set(O.x + d.x, O.y + 0.05, O.z + d.z);
      d.tel2.position.copy(d.tel.position);
      const kk = clamp(k, 0, 1);
      d.tel.scale.setScalar(1.25 - kk * 0.25);
      d.tel.rotation.y = t * 2;
      d.tel.material.opacity = k < 1 ? 0.45 + kk * 0.45 + Math.sin(t * 20) * 0.1 : Math.max(0, 1.25 - k) * 2;
      d.tel2.material.opacity = k < 1 ? kk * 0.5 : 0;
      // falls in the last third of its time
      const fk = clamp((k - 0.62) / 0.38, 0, 1);
      d.cr.visible = k > 0.55 && k < 1.02;
      d.cr.position.set(O.x + lerp(d.from.x, d.x, fk), O.y + lerp(d.from.y, 0.6, fk * fk), O.z + lerp(d.from.z, d.z, fk));
      d.cr.rotation.y += dt * 6;
      if (k >= 1.3) {
        d.t = -1;
        d.tel.visible = d.tel2.visible = d.cr.visible = false;
      }
    });
    // the dancers who bow at the end
    bowers.forEach((d, i) => {
      d.g.visible = !!B.bow;
      if (!B.bow) return;
      const k = clamp(B.bow - i * 0.08, 0, 1);
      d.body.rotation.x = Math.sin(k * Math.PI) * 0.6;
      d.arms.forEach((a, j) => a.rotation.set(-0.2 - Math.sin(k * Math.PI) * 0.5, 0, (j ? 1 : -1) * (0.3 + k * 0.3)));
      d.g.position.y = O.y;
    });
    card.visible = !!B.card;
    if (card.visible) {
      card.rotation.y = t * 0.8;
      card.position.y = O.y + 4.2 + Math.sin(t * 1.4) * 0.15;
    }
  };

  // ---------- queries ----------
  const at = (zone, q) => {
    switch (zone) {
      case 'V':
        return q.z > -14 && q.z < 1;
      case 'R1':
        return q.z < -15.5 && q.z > -50 && Math.abs(q.x) < 14;
      case 'C1':
        return q.z < -50.4 && q.z > -58;
      case 'ALC_dame':
        return q.z < -55.6 && q.z > -58 && q.x > -3.6 && q.x < -1.5;
      case 'ALC_valet':
        return q.z < -55.6 && q.z > -58 && q.x < 3.6 && q.x > 1.5;
      case 'R2':
        return q.z < -58 && q.z > -98 && Math.abs(q.x) < 17;
      case 'C2':
        return q.z < -98.4 && q.z > -108 && q.y > -0.5;
      case 'L1':
        return q.z < -126.1 && q.z > -130 && q.y > -0.5;
      case 'L2':
        return q.z < -148.1 && q.z > -156 && q.y > -0.5;
      case 'R4':
        return Math.hypot(q.x - R4C.x, q.z - R4C.z) < R4R - 3 && q.y > -0.5;
      case 'R4in':
        return Math.hypot(q.x - R4C.x, q.z - R4C.z) < 17 && q.y > -1;
      default:
        return false;
    }
  };
  const SPAWN = {
    1: [[-1.5, 0, -4], [1.5, 0, -4]],
    2: [[-1.5, 0, -17], [1.5, 0, -17]],
    3: [[-1.5, 0, -51.4], [1.5, 0, -51.4]],
    4: [[-3.45, 0, -105.6], [3.45, 0, -105.6]],
    5: [[-1.5, 0, -158], [1.5, 0, -158]],
    6: [[-1.5, 0, -166], [1.5, 0, -166]],
  };
  const spawn = (stage, who, sub = {}) => {
    const s = SPAWN[stage] || SPAWN[1];
    let p = s[who === 'dame' ? 0 : 1];
    if (sub.spot) p = [sub.spot[0], 0, sub.spot[1]];
    if (sub.found) p = who === 'dame' ? [-1.5, 0, -95] : [1.5, 0, -95];
    if (sub.half2) p = who === 'dame' ? [-3.45, 0, -128] : [3.45, 0, -128];
    if (sub.arena) p = who === 'dame' ? [-1.5, 0, -165.5] : [1.5, 0, -165.5];
    return P(p[0], p[1], p[2]);
  };
  // the tile a gallery ray points at (straight, or through a mirror): null if none
  const aimTile = (o, d) => {
    // to local
    let ox = o.x - O.x;
    let oy = o.y - O.y;
    let oz = o.z - O.z;
    let dx = d.x;
    let dy = d.y;
    let dz = d.z;
    for (let bounce = 0; bounce < 2; bounce++) {
      // floor
      const tf = dy < -1e-4 ? (0 - oy) / dy : Infinity;
      // mirror walls
      let tm = Infinity;
      let side = 0;
      if (dx > 1e-4) {
        tm = (MIRX - ox) / dx;
        side = 1;
      } else if (dx < -1e-4) {
        tm = (-MIRX - ox) / dx;
        side = -1;
      }
      if (tf < tm) {
        const x = ox + dx * tf;
        const z = oz + dz * tf;
        return { x, z, viaMirror: bounce > 0 };
      }
      if (tm === Infinity) return null;
      const y = oy + dy * tm;
      const z = oz + dz * tm;
      // only through a mirror pane
      const onPane = y > 0.05 && y < 5.1 && gallery.mirZ.some((mz) => Math.abs(z - mz) < 1.2);
      if (!onPane) return null;
      ox = side * MIRX;
      oy = y;
      oz = z;
      dx = -dx;
      void side;
    }
    return null;
  };
  const tileAt = (half, x, z) => {
    let best = null;
    Object.values(gallery.tiles).forEach((tl) => {
      if (tl.half !== half) return;
      if (Math.abs(x - tl.x) < 0.75 && Math.abs(z - tl.z) < 0.75) best = tl;
    });
    return best;
  };
  // the tile a body stands on (its centre over it)
  const standing = (q) => {
    if (q.y > 0.3 || q.y < -1) return null;
    for (const half of [1, 2]) {
      const tl = tileAt(half, q.x, q.z);
      if (tl) return tl;
    }
    return null;
  };

  return {
    O,
    P,
    rel,
    R1C,
    R2C,
    R4C,
    R4R,
    FIGS,
    leaderOf,
    followStart,
    SIGNS,
    SPOTS,
    LANE_X,
    ROWS,
    rowZ,
    CANDLES,
    MIRX,
    reflX,
    build,
    unbuild,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
    },
    update,
    doors,
    crowd,
    wanderers,
    get proxy() {
      return proxy;
    },
    showSign,
    gallery,
    boss,
    get screen() {
      return screen;
    },
    at,
    spawn,
    aimTile,
    tileAt,
    standing,
    cellAt(x, z) {
      const i = Math.round((x + 12) / CELL);
      const j = Math.round((z - (R4C.z - 12)) / CELL);
      if (i < 0 || j < 0 || i >= NC || j >= NC) return null;
      if (Math.abs(x - cellXZ(i, j)[0]) > 1 || Math.abs(z - cellXZ(i, j)[1]) > 1) return null;
      return boss.cells[i * NC + j];
    },
    cellXZ,
    NC,
    // all the mannequins of the masked ball (decoys), for an invitation or a push
    allDancers() {
      const out = [];
      crowd.forEach((C) => out.push(C.a, C.b));
      wanderers.forEach((W) => out.push(W.d));
      return out;
    },
  };
})();
