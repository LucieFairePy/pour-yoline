// ♥ 9 · L’Averse: a city at night under a downpour. Wet cobbles, pink neons, gutters, puddles that
// mirror the signs. One umbrella for two (the rain chills whoever is out from under it), a street
// that floods (one sees the currents from a balcony, the other wades), roofs that only a flash of
// lightning shows, and the Storm Spirit above the roofs: open its four lightning-rod umbrellas.
const H8 = (() => {
  const O = V3(2100, 0, 9800);
  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);
  // what follows the camera (rain, splashes, cloud dome) is never culled by distance
  const wx = new THREE.Group();
  wx.visible = false;
  wx.userData.noCull = true;
  R.scene.add(wx);

  // the street runs along +z; one group per stretch so only the near ones are drawn
  const ZONES = { A: [-14, 128], B: [118, 240], C: [228, 340], D: [328, 410] };
  const MARGIN = { A: [40, 70], B: [60, 60], C: [80, 70], D: [120, 60] };
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
  const zoneOfZ = (z) => (z < 124 ? 'A' : z < 236 ? 'B' : z < 336 ? 'C' : 'D');

  // ---------- layout (relative to O) ----------
  // shelters: [x0, z0, x1, z1, roof y, floor y] (the rain does not reach under them)
  const SHELTERS = [
    { id: 'bus', r: [1.3, -1.2, 6.9, 5.2], y: 2.65, f: 0, spawn: [[3, 0, 1.2], [5, 0, 1.2]] },
    { id: 'cafe', r: [-7, 29.5, -2.6, 38.5], y: 3.0, f: 0, spawn: [[-3.6, 0, 32.4], [-3.6, 0, 34.6]] },
    { id: 'shop', r: [2.6, 63.5, 7, 72.5], y: 3.0, f: 0, spawn: [[4, 0, 66], [5.5, 0, 69]] },
    { id: 'arcade', r: [-7, 86.6, 7, 104.2], y: 5.0, f: 0, spawn: [[-2, 0, 96], [2, 0, 96]] },
    { id: 'porch', r: [-7, 118.2, 7, 126.6], y: 4.2, f: 0, spawn: [[-2, 0, 122], [2, 0, 122]] },
    { id: 'tower', c: [0, 342], rad: 3.1, y: 18, f: 14, spawn: [[-1, 14, 341], [1, 14, 341]] },
  ];
  const BARRIER_Z = 58;
  const SHUT = { z: 86.25, x0: -1.6, x1: 1.6, h: 3.2 };
  const CURTAINS = [107.5, 111.3, 115.1];
  const GUST_Z = [5, 58];
  // the flood: two basins, the walker wades, the guide watches from a balcony
  const BASINS = {
    A: { z0: 128.4, z1: 177, x0: -7, x1: 4.6, walker: 'valet', guide: 'dame', valve: [0, 175.4], gateZ: 177, bal: [4.6, 7, 140, 172.5], side: 1 },
    B: { z0: 184.8, z1: 229, x0: -4.6, x1: 7, walker: 'dame', guide: 'valet', valve: [0, 227.4], gateZ: 229, bal: [-7, -4.6, 196, 224.5], side: -1 },
  };
  // sewer plates that suck you down [x, z], and currents [x0, z0, x1, z1, fx, fz]
  const PLATES = {
    A: [[-2.6, 133.2], [2.4, 136.8], [-5.4, 139.8], [0.4, 141.6], [3.0, 148.6], [-3.2, 149.4], [-0.6, 154.4], [-5.6, 156.6], [2.6, 157.8], [-2.4, 162.8], [1.4, 166.6], [-5.0, 168.2], [3.4, 171.2], [-2.0, 172.0]],
    B: [[2.6, 189.2], [-2.0, 192.2], [5.4, 194.8], [-0.4, 197.6], [-3.4, 201.8], [3.0, 203.4], [0.4, 207.6], [5.6, 210.4], [-2.8, 212.0], [2.0, 215.6], [-0.6, 219.6], [4.6, 221.2], [-3.2, 223.6], [2.4, 225.4]],
  };
  const CURRENTS = {
    A: [[-7, 144.2, 4.6, 146.2, 2.3, 0], [-7, 159.6, 4.6, 161.4, -2.5, 0], [-7, 168.8, 4.6, 170.2, 2.4, 0]],
    B: [[-4.6, 199.0, 7, 200.8, -2.4, 0], [-4.6, 216.6, 7, 218.4, 2.5, 0]],
  };
  const SUCK_R = 1.25;
  // the lightning: the dark path only a flash shows [x, top, z, sx, sz]
  const DARK_A = [
    [-5.6, 1.1, 243.0, 2.6, 2.2],
    [-5.6, 2.9, 246.8, 2.6, 2.2],
    [-2.9, 4.5, 249.8, 2.0, 2.0],
    [-5.6, 6.1, 253.4, 2.6, 2.4],
    [-5.6, 6.1, 258.6, 2.6, 2.2],
    [-2.7, 7.8, 262.2, 2.0, 2.0],
    [-5.6, 9.4, 265.8, 2.6, 2.2],
    [-5.6, 11.0, 270.0, 2.6, 2.2],
    [-2.9, 12.5, 273.6, 2.0, 2.0],
    [-5.4, 13.2, 277.0, 2.2, 2.2],
  ];
  const DARK_B = [
    // [x0, x1, top, z0, z1] rooftops and a plank
    [-16, -8, 15.4, 303, 309],
    [-12.3, -11.7, 15.4, 309, 318],
    [-16, -8, 16.6, 318, 323],
    [-22, -13, 15.0, 330, 334.6],
  ];
  const RING_B = { pos: [-12.5, 20.4, 326.5], land: [-17, 15, 332] };
  const LIT_STAIR = { x0: 4.6, x1: 7, z0: 241, z1: 270, n: 35 };
  const BRIDGE = { z0: 281, z1: 284 };
  const TUNNEL = { x0: -6.4, x1: -3.4, z0: 293.6, z1: 336, y: 14, h: 3.4, door: [295, 297.6] };
  const GATE5 = { x0: -16, x1: -3.4, z: 336.3 };
  const LEVERS = { lever4: [-10, 14, 279], lever5: [-20, 15, 332.6] };
  // the arena on the roof
  const C = V3(0, 14, 370);
  const ARENA = { x0: -22, x1: 22, z0: 336.6, z1: 404, y: 14 };
  const RODS = [
    [-13, 352],
    [13, 352],
    [-13, 388],
    [13, 388],
  ];
  const CRANK_OFF = 1.9;
  const crankPos = (i) => {
    const [x, z] = RODS[i];
    const d = Math.hypot(C.x - x, C.z - z);
    return [x + ((C.x - x) / d) * CRANK_OFF, z + ((C.z - z) / d) * CRANK_OFF];
  };
  const BOSS = V3(0, 33, 394);
  const HEART = V3(0, 44, 430);

  let built = false;
  const tmp = V3();
  const tmp2 = V3();
  const UP = V3(0, 1, 0);
  const fx = [];
  const anchors = [];
  const sh = {};
  let screen = null;
  let card = null;
  let finale = null;

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
  const FAC = [
    { wall: '#8a7a6a', trim: '#a5947f', shutter: '#3c564e', rail: '#17161a' },
    { wall: '#6a3e3a', trim: '#8e6456', shutter: '#2b3a4c', rail: '#141316' },
    { wall: '#4e4a5c', trim: '#6c6680', shutter: '#5a2a3c', rail: '#121116' },
    { wall: '#5c5048', trim: '#7e6e60', shutter: '#4a2c2a', rail: '#141214' },
  ];
  // a facade: 4 windows x 4 floors (12 m x 14 m), some windows lit (amber, a few TV blue)
  const facadeTex = (st, seed) => {
    const r = rng(seed);
    const W = 1200;
    const Hh = 1400;
    const lit = [];
    for (let i = 0; i < 16; i++) {
      const v = r();
      lit.push(v < 0.3 ? (r() < 0.18 ? 'tv' : r() < 0.2 ? 'pink' : 'warm') : null);
    }
    const shut = [];
    for (let i = 0; i < 16; i++) shut.push(r() < 0.35);
    const curtain = [];
    for (let i = 0; i < 16; i++) curtain.push(r());
    const win = (f, c) => ({ x: c * 300 + 90, y: f * 350 + 74, w: 120, h: 214 });
    const map = LvKit.tex(W, Hh, (g) => {
      LvKit.grain(g, W, Hh, st.wall, 0.07, 26000);
      // rain stains running down the wall
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
        g.fillRect(r() * W, r() * Hh, 2 + r() * 5, 60 + r() * 380);
      }
      for (let f = 0; f < 4; f++) {
        const y0 = f * 350;
        // cornice and string course
        g.fillStyle = st.trim;
        g.fillRect(0, y0 + 326, W, 24);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(0, y0 + 348, W, 4);
        for (let c = 0; c < 4; c++) {
          const w = win(f, c);
          const i = f * 4 + c;
          g.fillStyle = st.trim;
          g.fillRect(w.x - 14, w.y - 16, w.w + 28, w.h + 30);
          // the lintel keystone
          g.fillRect(w.x + w.w / 2 - 14, w.y - 30, 28, 18);
          g.fillStyle = '#10131a';
          g.fillRect(w.x, w.y, w.w, w.h);
          // a cold reflection in the dark panes
          const rf = g.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
          rf.addColorStop(0, 'rgba(120,140,190,0.10)');
          rf.addColorStop(0.5, 'rgba(120,140,190,0.0)');
          rf.addColorStop(1, 'rgba(255,120,180,0.06)');
          g.fillStyle = rf;
          g.fillRect(w.x, w.y, w.w, w.h);
          g.fillStyle = st.trim;
          g.fillRect(w.x + w.w / 2 - 3, w.y, 6, w.h);
          g.fillRect(w.x, w.y + w.h * 0.36, w.w, 5);
          if (shut[i] && !lit[i]) {
            g.fillStyle = st.shutter;
            g.fillRect(w.x - 52, w.y, 38, w.h);
            g.fillRect(w.x + w.w + 14, w.y, 38, w.h);
            g.strokeStyle = 'rgba(0,0,0,0.35)';
            g.lineWidth = 2;
            for (let k = 0; k < w.h; k += 9) {
              g.beginPath();
              g.moveTo(w.x - 52, w.y + k);
              g.lineTo(w.x - 14, w.y + k);
              g.moveTo(w.x + w.w + 14, w.y + k);
              g.lineTo(w.x + w.w + 52, w.y + k);
              g.stroke();
            }
          }
          // a wrought-iron rail across the bottom of the window
          g.strokeStyle = st.rail;
          g.lineWidth = 4;
          g.strokeRect(w.x - 8, w.y + w.h - 54, w.w + 16, 54);
          g.lineWidth = 2;
          for (let k = 0; k < w.w + 16; k += 12) {
            g.beginPath();
            g.moveTo(w.x - 8 + k, w.y + w.h - 54);
            g.lineTo(w.x - 8 + k, w.y + w.h);
            g.stroke();
          }
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.arc(w.x + 6 + k * 27, w.y + w.h - 27, 9, 0, Math.PI * 2);
            g.stroke();
          }
        }
      }
      // a long balcony on the second floor
      g.strokeStyle = st.rail;
      g.lineWidth = 5;
      g.strokeRect(0, 350 + 230, W, 58);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(0, 350 + 286, W, 10);
    });
    const emi = LvKit.tex(W, Hh, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, Hh);
      for (let f = 0; f < 4; f++)
        for (let c = 0; c < 4; c++) {
          const i = f * 4 + c;
          if (!lit[i]) continue;
          const w = win(f, c);
          const col = lit[i] === 'tv' ? ['#4a78c8', '#1c2a5a'] : lit[i] === 'pink' ? ['#c8507a', '#4a1a30'] : ['#e8a050', '#6a3a14'];
          const gr = g.createRadialGradient(w.x + w.w / 2, w.y + w.h * 0.6, 10, w.x + w.w / 2, w.y + w.h / 2, w.h * 0.7);
          gr.addColorStop(0, col[0]);
          gr.addColorStop(1, col[1]);
          g.fillStyle = gr;
          g.fillRect(w.x, w.y, w.w, w.h);
          // curtains, a silhouette now and then
          g.fillStyle = 'rgba(0,0,0,0.55)';
          const cw = 18 + curtain[i] * 30;
          g.fillRect(w.x, w.y, cw, w.h);
          g.fillRect(w.x + w.w - cw, w.y, cw, w.h);
          if (curtain[i] > 0.75) {
            g.beginPath();
            g.arc(w.x + w.w * 0.55, w.y + w.h * 0.45, 16, 0, Math.PI * 2);
            g.fillRect(w.x + w.w * 0.55 - 22, w.y + w.h * 0.45 + 14, 44, 80);
            g.fill();
          }
          g.fillStyle = '#000';
          g.fillRect(w.x + w.w / 2 - 3, w.y, 6, w.h);
          g.fillRect(w.x, w.y + w.h * 0.36, w.w, 5);
          g.fillRect(w.x - 8, w.y + w.h - 54, w.w + 16, 4);
        }
    });
    return { map, emi };
  };
  // a row of four shop fronts (16 m x 4 m)
  const SHOPS = [
    ['BOULANGERIE', 'FLEURISTE', 'LIBRAIRIE', 'CAFÉ DES AMANTS'],
    ['PHARMACIE', 'TABAC · PRESSE', 'BISTROT', 'DISQUAIRE'],
    ['PÂTISSERIE', 'HORLOGER', 'ÉPICERIE FINE', 'CINÉMA'],
  ];
  const SHOP_COL = ['#24382e', '#4a1a24', '#1c2440', '#3a2a18', '#2a1a3a'];
  const shopTex = (names, seed) => {
    const r = rng(seed);
    const W = 1600;
    const Hh = 400;
    const map = LvKit.tex(W, Hh, (g) => {
      LvKit.grain(g, W, Hh, '#3a3436', 0.08, 12000);
      names.forEach((n, i) => {
        const x = i * 400;
        g.fillStyle = SHOP_COL[(i + seed) % SHOP_COL.length];
        g.fillRect(x + 14, 30, 372, 340);
        // the sign board
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x + 22, 38, 356, 62);
        g.fillStyle = '#d8b46a';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        let fs = 40;
        g.font = `bold ${fs}px Georgia, serif`;
        while (g.measureText(n).width > 330 && fs > 16) {
          fs -= 2;
          g.font = `bold ${fs}px Georgia, serif`;
        }
        g.fillText(n, x + 200, 70);
        // shop window and door
        g.fillStyle = '#0c0e14';
        g.fillRect(x + 34, 118, 230, 230);
        g.fillRect(x + 286, 118, 80, 252);
        g.strokeStyle = '#c8a860';
        g.lineWidth = 4;
        g.strokeRect(x + 34, 118, 230, 230);
        g.strokeRect(x + 286, 118, 80, 252);
        g.fillStyle = '#c8a860';
        g.fillRect(x + 352, 240, 6, 18);
      });
    });
    const emi = LvKit.tex(W, Hh, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, Hh);
      names.forEach((n, i) => {
        const x = i * 400;
        const on = r() < 0.8;
        if (on) {
          const gr = g.createLinearGradient(0, 118, 0, 348);
          gr.addColorStop(0, '#d8944c');
          gr.addColorStop(1, '#5a2c10');
          g.fillStyle = gr;
          g.fillRect(x + 34, 118, 230, 230);
          // goods on shelves
          g.fillStyle = 'rgba(0,0,0,0.55)';
          for (let k = 0; k < 3; k++) {
            g.fillRect(x + 40, 170 + k * 62, 218, 5);
            for (let j = 0; j < 6; j++) {
              const h = 16 + r() * 26;
              g.fillRect(x + 48 + j * 34, 170 + k * 62 - h, 22, h);
            }
          }
          g.fillStyle = 'rgba(240,180,110,0.55)';
          g.fillRect(x + 292, 124, 68, 120);
        }
        g.fillStyle = '#6a5228';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        let fs = 40;
        g.font = `bold ${fs}px Georgia, serif`;
        while (g.measureText(n).width > 330 && fs > 16) {
          fs -= 2;
          g.font = `bold ${fs}px Georgia, serif`;
        }
        g.fillText(n, x + 200, 70);
      });
    });
    return { map, emi };
  };
  const makeTextures = () => {
    T.fac = FAC.map((st, i) => facadeTex(st, 11 + i * 7));
    T.shops = SHOPS.map((n, i) => shopTex(n, 3 + i));
    T.soft = LvKit.tex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    // reflection of a light on the wet road: a long soft vertical streak
    T.streak = LvKit.tex(64, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y++) {
        const k = Math.pow(1 - y / h, 1.6);
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, `rgba(255,255,255,${k})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, y, w, 1);
      }
      // broken by ripples
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 70; i++) {
        g.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`;
        g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 4);
      }
    });
    T.awn = ['#b8244e', '#2c6a58', '#5a2a6a'].map((c, i) =>
      LvKit.tex(512, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        for (let k = 0; k < 8; k++) {
          g.fillStyle = k % 2 ? '#e8dcc8' : c;
          g.fillRect((k * w) / 8, 0, w / 8 + 1, h * 0.8);
        }
        // scalloped edge
        for (let k = 0; k < 8; k++) {
          g.fillStyle = k % 2 ? '#e8dcc8' : c;
          g.beginPath();
          g.arc(((k + 0.5) * w) / 8, h * 0.8, w / 16, 0, Math.PI);
          g.fill();
        }
        // wet streaks
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let k = 0; k < 40; k++) g.fillRect(Math.random() * w, 0, 2, h * 0.8);
        if (i === 0) {
          g.fillStyle = '#e8dcc8';
          heartPath(g, w / 2, h * 0.36, 2.6);
          g.fill();
        }
      }),
    );
    // the umbrella's fabric: deep rose with small hearts and a darker border
    T.umb = LvKit.tex(512, 512, (g, w, h) => {
      g.fillStyle = '#9a1c3c';
      g.fillRect(0, 0, w, h);
      for (let k = 0; k < 16; k++) {
        g.fillStyle = k % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
        g.fillRect((k * w) / 16, 0, w / 16, h);
      }
      g.fillStyle = 'rgba(255,190,210,0.55)';
      for (let k = 0; k < 40; k++) {
        heartPath(g, (k * 97) % w, ((k * 61) % (h * 0.8)) + 20, 0.55);
        g.fill();
      }
      g.fillStyle = '#4a0a1c';
      g.fillRect(0, h - 40, w, 40);
      g.fillStyle = '#e8c070';
      g.fillRect(0, h - 44, w, 4);
    });
    // the giant lightning-rod umbrellas: charcoal canvas with a pink heart that glows when open
    T.rod = LvKit.tex(512, 512, (g, w, h) => {
      LvKit.grain(g, w, h, '#2a2630', 0.08, 8000);
      for (let k = 0; k < 8; k++) {
        g.fillStyle = k % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.03)';
        g.fillRect((k * w) / 8, 0, w / 8, h);
      }
      g.fillStyle = '#b8325a';
      g.fillRect(0, h - 36, w, 36);
    });
    T.grate = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#26242a';
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#4a4650';
      g.lineWidth = 8;
      g.stroke();
      g.fillStyle = '#08080a';
      for (let k = -4; k <= 4; k++) g.fillRect(w / 2 + k * 22 - 6, h * 0.16, 12, h * 0.68);
      g.fillStyle = '#5a5660';
      g.font = 'bold 22px Georgia';
      g.textAlign = 'center';
      g.fillText('EAUX', w / 2, h * 0.12 + 6);
    });
    // currents, seen from above: chevrons
    T.chev = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 16;
      g.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        const x = 50 + k * 128;
        g.beginPath();
        g.moveTo(x, 60);
        g.lineTo(x + 60, 128);
        g.lineTo(x, 196);
        g.stroke();
      }
    });
    T.stripe = LvKit.tex(512, 128, (g, w, h) => {
      g.fillStyle = '#e8e0d8';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8243a';
      for (let k = -2; k < 12; k++) {
        g.beginPath();
        g.moveTo(k * 56, h);
        g.lineTo(k * 56 + 28, h);
        g.lineTo(k * 56 + 28 + h, 0);
        g.lineTo(k * 56 + h, 0);
        g.fill();
      }
    });
    T.devia = LvKit.tex(512, 192, (g, w, h) => {
      g.fillStyle = '#e8a020';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#141414';
      g.fillRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#e8a020';
      g.fillRect(16, 16, w - 32, h - 32);
      g.fillStyle = '#141414';
      g.font = 'bold 70px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('DÉVIATION', w / 2, h / 2);
    });
    T.poster = LvKit.tex(400, 600, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#1a0a26');
      gr.addColorStop(1, '#4a1430');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      Heart.paint(g, w / 2, h * 0.4, 240, { fill: 1, t: 1 });
      g.fillStyle = '#f0dce4';
      g.textAlign = 'center';
      g.font = 'italic 44px Georgia';
      g.fillText('L’Averse', w / 2, h * 0.76);
      g.font = '20px Georgia';
      g.fillStyle = '#c8a0b0';
      g.fillText('on aurait pu courir.', w / 2, h * 0.84);
      g.fillText('on est restés.', w / 2, h * 0.89);
    });
    T.laundry = ['#e8c8d0', '#c8d8e8', '#e8e0c0', '#d0c0e8'].map((c, i) =>
      LvKit.tex(128, 160, (g, w, h) => {
        g.fillStyle = c;
        g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let k = 0; k < 6; k++) g.fillRect(0, (k * h) / 6, w, 3);
        if (i === 0) {
          g.fillStyle = '#c84a6a';
          heartPath(g, w / 2, h / 2, 1.6);
          g.fill();
        }
      }),
    );
    T.cloud = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let k = 0; k < 26; k++) {
        const x = w / 2 + (Math.random() - 0.5) * w * 0.5;
        const y = h / 2 + (Math.random() - 0.5) * h * 0.4;
        const rr = 30 + Math.random() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, 'rgba(255,255,255,0.22)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
    });
    T.envA = envTex(false);
    T.envB = envTex(true);
  };

  // what the puddles mirror: an equirect sky band (u = heading, v = elevation, 0 at the horizon)
  // storm: low clouds and the smudged neons of the street; clear: stars, the rainbow, the heart
  const ENV_W = 2048;
  const ENV_H = 512;
  const envUV = (d) => {
    const n = d.clone().normalize();
    const u = Math.atan2(n.x, n.z) / (Math.PI * 2) + 0.5;
    const v = Math.asin(clamp(n.y, 0, 1)) / (Math.PI / 2);
    return [u * ENV_W, (1 - v) * ENV_H];
  };
  const envTex = (clear) => {
    const c = document.createElement('canvas');
    c.width = ENV_W;
    c.height = ENV_H;
    const g = c.getContext('2d');
    const r = rng(clear ? 77 : 33);
    const gr = g.createLinearGradient(0, 0, 0, ENV_H);
    if (clear) {
      gr.addColorStop(0, '#05030c');
      gr.addColorStop(0.6, '#140a26');
      gr.addColorStop(1, '#3a1c3e');
    } else {
      gr.addColorStop(0, '#07060c');
      gr.addColorStop(0.7, '#141220');
      gr.addColorStop(1, '#2a2030');
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, ENV_W, ENV_H);
    if (clear) {
      for (let i = 0; i < 2600; i++) {
        const y = Math.pow(r(), 1.4) * ENV_H * 0.9;
        g.fillStyle = `rgba(255,240,250,${0.25 + r() * 0.6})`;
        const s = r() < 0.05 ? 2.2 : 1.1;
        g.fillRect(r() * ENV_W, y, s, s);
      }
      // the rainbow, low over the +z horizon (where the street goes)
      const [ru, rv] = envUV(V3(0, -0.15, 1));
      const bands = ['#ff4a6a', '#ff9a4a', '#ffe06a', '#6ae08a', '#4ab0ff', '#8a6aff'];
      g.globalCompositeOperation = 'lighter';
      bands.forEach((col, i) => {
        g.strokeStyle = col;
        g.globalAlpha = 0.28;
        g.lineWidth = 9;
        g.beginPath();
        g.ellipse(ru, rv, 300 - i * 9, 330 - i * 9, 0, Math.PI, Math.PI * 2);
        g.stroke();
      });
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // the heart above the arena, and the one in the sky (Sky.galaxy, from the camera)
      const [hu, hv] = envUV(V3(HEART.x - C.x, HEART.y - C.y, HEART.z - C.z));
      Heart.paint(g, hu, hv, 190, { fill: 1, t: 2 });
      const [su, sv] = envUV(V3(-110, 390, -470));
      Heart.paint(g, su, sv, 120, { fill: 0.8, t: 3, alpha: 0.8 });
    } else {
      // heavy clouds
      for (let i = 0; i < 260; i++) {
        const x = r() * ENV_W;
        const y = r() * ENV_H * 0.8;
        const rr = 30 + r() * 90;
        const cg = g.createRadialGradient(x, y, 0, x, y, rr);
        cg.addColorStop(0, `rgba(70,62,90,${0.12 + r() * 0.1})`);
        cg.addColorStop(1, 'rgba(70,62,90,0)');
        g.fillStyle = cg;
        g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
    }
    // the city along the horizon: windows and smudged neons (pink, cyan, amber)
    const pal = clear ? ['#ff5f8a', '#ffb060', '#6cc8ff', '#ffd090'] : ['#ff3d7f', '#3ad6ff', '#ffa050', '#ff3d7f', '#b07cff'];
    for (let i = 0; i < (clear ? 160 : 220); i++) {
      const x = r() * ENV_W;
      const h = 20 + r() * 90;
      const w = 4 + r() * 18;
      const col = pal[(r() * pal.length) | 0];
      const lg = g.createLinearGradient(0, ENV_H - h, 0, ENV_H);
      lg.addColorStop(0, 'rgba(0,0,0,0)');
      lg.addColorStop(1, col);
      g.globalAlpha = 0.25 + r() * 0.5;
      g.fillStyle = lg;
      g.fillRect(x, ENV_H - h, w, h);
    }
    g.globalAlpha = 1;
    // building silhouettes against the sky
    g.fillStyle = clear ? 'rgba(8,6,14,0.85)' : 'rgba(6,5,10,0.8)';
    for (let x = 0; x < ENV_W; ) {
      const w = 30 + r() * 80;
      const h = 20 + r() * 70;
      g.fillRect(x, ENV_H - h, w, h);
      x += w;
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  };

  // ---------- materials ----------
  const M = {};
  const std = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
  const makeMats = () => {
    M.cobble = Tex.mat('cobble', { color: '#4e4954', scale: 2.4, rough: 0.42, bump: 1.3 });
    M.pave = Tex.mat('pavement', { color: '#5c5662', scale: 2.4, rough: 0.46 });
    M.curb = Tex.mat('stone', { color: '#6e6872', scale: 1.6, rough: 0.5 });
    M.brick = Tex.mat('brick', { color: '#6a4240', scale: 3 });
    M.plaster = Tex.mat('plaster', { color: '#6c6270', scale: 4 });
    M.stone = Tex.mat('stone', { color: '#7e766e', scale: 3 });
    M.roof = Tex.mat('concrete', { color: '#46424c', scale: 4, rough: 0.6 });
    M.tar = Tex.mat('asphalt', { color: '#3a3840', scale: 3, rough: 0.5 });
    M.roofD = Tex.mat('concrete', { color: '#5a5462', scale: 3, rough: 0.72, bump: 0.6 });
    M.iron = Tex.mat('metal', { color: '#3c3a46', scale: 1.5, rough: 0.5 });
    M.dark = Tex.mat('metal', { color: '#24222c', scale: 1.5, rough: 0.55 });
    M.wood = Tex.mat('wood', { color: '#46342a', scale: 3, rough: 0.55 });
    M.bag = Tex.mat('fabric', { color: '#6a5a40', scale: 1 });
    M.deck = Tex.mat('wood', { color: '#3a2c24', scale: 4, rough: 0.55 });
    M.tile = Tex.mat('tiles', { color: '#5a5258', scale: 2, rough: 0.45 });
    M.glass = new THREE.MeshStandardMaterial({ color: '#8ab4cc', transparent: true, opacity: 0.16, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
    M.glassLit = new THREE.MeshStandardMaterial({ color: '#c8a070', transparent: true, opacity: 0.12, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide, emissive: '#3a2410' });
    M.bulb = glow('#ffc070', 1.6);
    M.bulbPink = glow('#ff5f8a', 1.6);
    M.copper = std('#9a5a3a', 0.45);
    M.brass = std('#b08a40', 0.4);
    M.black = std('#141218', 0.7);
    M.umb = new THREE.MeshStandardMaterial({ map: T.umb, roughness: 0.55, side: THREE.DoubleSide });
    M.rod = new THREE.MeshStandardMaterial({ map: T.rod, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ff4a7a', emissiveIntensity: 0 });
    M.stripe = new THREE.MeshStandardMaterial({ map: T.stripe, roughness: 0.6 });
    M.devia = new THREE.MeshStandardMaterial({ map: T.devia, roughness: 0.6, emissive: '#3a2400' });
    M.poster = new THREE.MeshBasicMaterial({ map: T.poster, toneMapped: false });
    M.poster.color.setScalar(0.8);
    M.fac = T.fac.map((f) => new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emi, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.72 }));
    M.shop = T.shops.map((f) => new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emi, emissive: '#ffffff', emissiveIntensity: 0.48, roughness: 0.5 }));
    M.awn = T.awn.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, side: THREE.DoubleSide, alphaTest: 0.5 }));
    M.grate = new THREE.MeshStandardMaterial({ map: T.grate, transparent: true, roughness: 0.5 });
  };

  // ---------- small builders ----------
  // a plane of facade (inner face of the street), UVs scaled so a 12 m x 14 m tile repeats
  const facade = (z, side, z0, z1, h, style, y0 = 4, shops = true, seed = 1) => {
    const len = z1 - z0;
    const fh = h - y0;
    const g = new THREE.PlaneGeometry(len, fh);
    const uv = g.attributes.uv;
    const ou = (seed * 0.37) % 1;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / 12) + ou, uv.getY(i) * (fh / 14) + (1 - fh / 14));
    const m = new THREE.Mesh(g, M.fac[style % M.fac.length]);
    m.position.copy(P(side * 6.99, y0 + fh / 2, (z0 + z1) / 2));
    m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    zg[z].add(m);
    if (shops && y0 > 0) {
      const sg = new THREE.PlaneGeometry(len, y0);
      const su = sg.attributes.uv;
      for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) * (len / 16) + ou * 3, su.getY(i));
      const s = new THREE.Mesh(sg, M.shop[seed % M.shop.length]);
      s.position.copy(P(side * 6.985, y0 / 2, (z0 + z1) / 2));
      s.rotation.y = m.rotation.y;
      zg[z].add(s);
      // the shop light spills on the pavement
      for (let k = z0 + 4; k < z1 - 2; k += 8) anchors.push({ p: P(side * 5.6, 1.6, k), c: '#ffb070', i: 0.9, d: 7, z });
    }
    return m;
  };
  // a building block: collider + a box for the sides and roof
  const block = (z, x0, x1, z0, z1, top, mat = M.plaster, roofMat = M.roof) => {
    const K = KZ[z];
    const b = K.solid((x0 + x1) / 2, top / 2, (z0 + z1) / 2, x1 - x0, top, z1 - z0, mat);
    // a tar roof skin on top so the roofs read as roofs
    const r = K.deco(new THREE.BoxGeometry(x1 - x0, 0.06, z1 - z0), roofMat, (x0 + x1) / 2, top + 0.03, (z0 + z1) / 2);
    return { b, r };
  };
  const sprite = (tex, color, size, opacity = 1, add = true) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }),
    );
    s.scale.setScalar(size);
    return s;
  };
  // a neon sign: strokes drawn white with a glow, tinted by the material (additive)
  const neonSigns = [];
  const neon = (z, x, y, zz, ry, w, h, color, draw, opt = {}) => {
    const tex = LvKit.tex(Math.round(256 * (w / h)), 256, (g, W, H) => {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = '#ffffff';
      g.fillStyle = '#ffffff';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.shadowColor = '#ffffff';
      g.shadowBlur = 18;
      draw(g, W, H);
      g.shadowBlur = 0;
      draw(g, W, H);
    });
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(color).multiplyScalar(opt.k || 1.7),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(P(x, y, zz));
    m.rotation.y = ry;
    zg[z].add(m);
    const base = mat.color.clone();
    neonSigns.push({ m, base, flick: opt.flick || 0, ph: Math.random() * 10, z });
    anchors.push({ p: P(x + Math.sin(ry) * 1.2, y, zz + Math.cos(ry) * 1.2), c: color, i: opt.li || 1.4, d: opt.ld || 9, z });
    return m;
  };
  const neonText = (text, font = 'italic bold 150px Georgia') => (g, W, H) => {
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 7;
    g.strokeText(text, W / 2, H / 2);
  };
  const neonHeart = (k = 5.6) => (g, W, H) => {
    g.lineWidth = 10;
    heartPath(g, W / 2, H / 2 + 6, k);
    g.stroke();
  };
  // merged quads lying flat (puddles, decals): [x, y, z, sx, sz, rot, seed]
  const flatQuads = (list) => {
    const n = list.length;
    const pos = new Float32Array(n * 12);
    const uv = new Float32Array(n * 8);
    const sd = new Float32Array(n * 4);
    const idx = [];
    list.forEach(([x, y, z, sx, sz, rot, seed], i) => {
      const c = Math.cos(rot || 0);
      const s = Math.sin(rot || 0);
      [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ].forEach(([u, v], k) => {
        const lx = u * sx;
        const lz = v * sz;
        pos[i * 12 + k * 3] = O.x + x + lx * c - lz * s;
        pos[i * 12 + k * 3 + 1] = O.y + y;
        pos[i * 12 + k * 3 + 2] = O.z + z + lx * s + lz * c;
        uv[i * 8 + k * 2] = u + 0.5;
        uv[i * 8 + k * 2 + 1] = v + 0.5;
        sd[i * 4 + k] = seed != null ? seed : i * 0.37;
      });
      const b = i * 4;
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  };
  const instanced = (z, geo, mat, list, target) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    list.forEach(([x, y, zz, s = 1, ry = 0, sy, rx = 0], i) => {
      e.set(rx, ry, 0);
      q.setFromEuler(e);
      m4.compose(P(x, y, zz), q, V3(s, sy != null ? sy : s, s));
      im.setMatrixAt(i, m4);
    });
    im.frustumCulled = false;
    (target || zg[z]).add(im);
    return im;
  };

  // ---------- shared shader state ----------
  const SH = {
    time: { value: 0 },
    flash: { value: 0 },
    rain: { value: 1 },
    clear: { value: 0 },
  };
  const NOISE_GLSL = `
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float a = 0.5;
      float s = 0.0;
      for (int i = 0; i < 4; i++) {
        s += vn(p) * a;
        p = p * 2.03 + 17.1;
        a *= 0.5;
      }
      return s;
    }`;
  // puddles and flood water: rain rings, the mirrored sky (storm, then clear with the heart)
  const waterMat = (flood) => {
    const U = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
    Object.assign(U, {
      uTime: SH.time,
      uFlash: SH.flash,
      uRain: SH.rain,
      uClear: SH.clear,
      uEnvA: { value: T.envA },
      uEnvB: { value: T.envB },
      uDeep: { value: new THREE.Color(flood ? '#1a1712' : '#0a0910') },
      uMurk: { value: flood ? 1 : 0 },
    });
    return new THREE.ShaderMaterial({
      uniforms: U,
      fog: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      vertexShader: `
        attribute float aSeed;
        varying vec3 vW;
        varying vec2 vUv;
        varying float vSeed;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv;
          vSeed = aSeed;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlash;
        uniform float uRain;
        uniform float uClear;
        uniform float uMurk;
        uniform sampler2D uEnvA;
        uniform sampler2D uEnvB;
        uniform vec3 uDeep;
        varying vec3 vW;
        varying vec2 vUv;
        varying float vSeed;
        #include <fog_pars_fragment>
        ${NOISE_GLSL}
        vec2 rip(vec2 p, float t, float sc) {
          vec2 q = p * sc;
          vec2 c = floor(q);
          vec2 f = fract(q) - 0.5;
          float h = h21(c);
          f -= (vec2(h21(c + 3.1), h21(c + 7.7)) - 0.5) * 0.5;
          float ph = fract(t * (0.8 + h * 0.7) + h * 9.0);
          float d = length(f);
          float r = ph * 0.42;
          float w = sin((d - r) * 55.0) * exp(-abs(d - r) * 22.0) * (1.0 - ph) * (1.0 - ph);
          return d > 0.001 ? f / d * w : vec2(0.0);
        }
        void main() {
          vec3 V = normalize(vW - cameraPosition);
          vec2 g = (rip(vW.xz, uTime, 1.7) + rip(vW.xz + 11.3, uTime * 1.13, 2.6) * 0.8 + rip(vW.xz + 5.1, uTime * 0.91, 1.1) * 0.7) * uRain;
          g += (vec2(vn(vW.xz * 0.7 + uTime * 0.3), vn(vW.zx * 0.7 - uTime * 0.25)) - 0.5) * 0.08 * (0.3 + uMurk);
          vec3 N = normalize(vec3(g.x * 0.45, 1.0, g.y * 0.45));
          vec3 Rr = reflect(V, N);
          float u = atan(Rr.x, Rr.z) / 6.2831853 + 0.5;
          float v = asin(clamp(Rr.y, 0.0, 1.0)) / 1.5707963;
          vec2 e = vec2(u, 1.0 - v);
          vec3 env = mix(texture2D(uEnvA, e).rgb, texture2D(uEnvB, e).rgb, uClear);
          env += uFlash * vec3(0.7, 0.75, 1.0) * (0.2 + 0.8 * v);
          float fres = 0.06 + 0.94 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
          vec3 col = mix(uDeep, env * 1.2, clamp(fres * 1.3 + 0.14, 0.0, 1.0));
          // a flash turns every sheet of water into a mirror of the white sky
          col += uFlash * vec3(0.5, 0.53, 0.7) * (0.35 + fres);
          float a;
          if (uMurk > 0.5) {
            float foam = smoothstep(0.7, 0.92, vn(vW.xz * 1.3 + vec2(uTime * 0.4, -uTime * 0.2)));
            col += foam * 0.05;
            a = 0.95;
          } else {
            vec2 c = vUv - 0.5;
            float n = vn(vUv * 5.0 + vSeed * 13.0) * 0.24 + vn(vUv * 11.0 + vSeed * 7.0) * 0.08;
            float d = length(c) * 2.0 + n;
            a = smoothstep(1.0, 0.8, d) * 0.96;
          }
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }`,
    });
  };

  // ---------- the rain: instanced streaks around the camera, never under a roof or the umbrella ----------
  const NDRY = 8;
  const RAIN = {};
  const dryUniforms = () => ({
    uDry: { value: Array.from({ length: NDRY }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uDryY: { value: new Array(NDRY).fill(-1e4) },
    uUmb: { value: new THREE.Vector4(0, 0, 0, -1e4) },
  });
  const DRY_GLSL = `
    uniform vec4 uDry[${NDRY}];
    uniform float uDryY[${NDRY}];
    uniform vec4 uUmb;
    float dry(vec3 p) {
      float h = 0.0;
      for (int i = 0; i < ${NDRY}; i++) {
        vec4 d = uDry[i];
        if (p.x > d.x && p.x < d.z && p.z > d.y && p.z < d.w && p.y < uDryY[i]) h = 1.0;
      }
      if (distance(p.xz, uUmb.xy) < uUmb.z && p.y < uUmb.w) h = 1.0;
      return h;
    }`;
  const makeRain = () => {
    const N = 12000;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const sd = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) sd[i] = Math.random();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4));
    g.instanceCount = N;
    const D = dryUniforms();
    const U = {
      uTime: SH.time,
      uFlash: SH.flash,
      uCam: { value: V3() },
      uBox: { value: V3(34, 24, 34) },
      uWind: { value: new THREE.Vector2(0, 0) },
      uSpeed: { value: 16 },
      uLen: { value: 1.05 },
      uGround: { value: -1e4 },
      uAmt: { value: 1 },
      ...D,
    };
    const m = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        // the streaks face the camera with their back side
        side: THREE.DoubleSide,
        vertexShader: `
          attribute vec4 aSeed;
          uniform float uTime;
          uniform float uSpeed;
          uniform float uLen;
          uniform float uGround;
          uniform float uAmt;
          uniform vec3 uCam;
          uniform vec3 uBox;
          uniform vec2 uWind;
          varying vec2 vUv;
          varying float vA;
          ${DRY_GLSL}
          void main() {
            float sp = uSpeed * (0.85 + 0.3 * aSeed.w);
            float fall = fract(aSeed.z - uTime * sp / uBox.y);
            vec2 b = aSeed.xy * uBox.xz + uWind * ((1.0 - fall) * uBox.y / sp);
            vec3 p;
            p.y = uCam.y - uBox.y * 0.4 + fall * uBox.y;
            p.xz = uCam.xz + mod(b - uCam.xz + 0.5 * uBox.xz, uBox.xz) - 0.5 * uBox.xz;
            float hide = step(uAmt, aSeed.w) + step(p.y, uGround) + dry(p);
            vec3 dir = normalize(vec3(uWind.x, -sp, uWind.y));
            vec3 toC = cameraPosition - p;
            float dc = length(toC);
            vec3 side = normalize(cross(dir, toC / max(dc, 0.001)));
            float w = 0.014 + 0.0019 * dc;
            vec3 wp = p - dir * position.y * uLen * (0.7 + 0.6 * aSeed.w) + side * position.x * w;
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
            vec3 c = mix(vec3(0.72, 0.77, 0.92), vec3(1.6, 1.65, 1.8), uFlash);
            gl_FragColor = vec4(c, a * (0.58 + uFlash * 0.4));
          }`,
      }),
    );
    m.frustumCulled = false;
    m.renderOrder = 5;
    wx.add(m);
    RAIN.mesh = m;
    RAIN.U = U;
    // splashes: little crowns where the drops land, around the player
    const NS = 1600;
    const sg = new THREE.InstancedBufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
    sg.setIndex([0, 1, 2, 0, 2, 3]);
    const ss = new Float32Array(NS * 4);
    for (let i = 0; i < NS * 4; i++) ss[i] = Math.random();
    sg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(ss, 4));
    sg.instanceCount = NS;
    const D2 = dryUniforms();
    const SU = { uTime: SH.time, uFlash: SH.flash, uCam: U.uCam, uGround: { value: -1e4 }, uAmt: U.uAmt, uB: { value: 22 }, ...D2 };
    const sm = new THREE.Mesh(
      sg,
      new THREE.ShaderMaterial({
        uniforms: SU,
        transparent: true,
        depthWrite: false,
        vertexShader: `
          attribute vec4 aSeed;
          uniform float uTime;
          uniform float uGround;
          uniform float uAmt;
          uniform float uB;
          uniform vec3 uCam;
          varying vec2 vUv;
          varying float vPh;
          varying float vA;
          ${DRY_GLSL}
          void main() {
            float k = uTime * 2.4 + aSeed.z * 7.0;
            float cyc = floor(k);
            float ph = fract(k);
            vec2 r = fract(sin(vec2(cyc * 12.9898 + aSeed.x * 78.233, cyc * 39.346 + aSeed.y * 11.135)) * 43758.5453);
            vec2 xz = uCam.xz + (r - 0.5) * uB;
            float s = 0.16 + 0.22 * aSeed.w;
            vec3 p = vec3(xz.x, uGround + 0.025, xz.y);
            float hide = step(uAmt, aSeed.w) + dry(p + vec3(0.0, 0.5, 0.0));
            vec3 wp = p + vec3(position.x * s, 0.0, position.y * s);
            vUv = position.xy + 0.5;
            vPh = ph;
            vA = 1.0 - smoothstep(8.0, 11.0, distance(xz, uCam.xz));
            gl_Position = hide > 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0);
          }`,
        fragmentShader: `
          uniform float uFlash;
          varying vec2 vUv;
          varying float vPh;
          varying float vA;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float ring = smoothstep(0.12, 0.0, abs(d - vPh)) * (1.0 - vPh);
            float crown = (1.0 - smoothstep(0.0, 0.3, d)) * clamp(1.0 - vPh * 5.0, 0.0, 1.0);
            float a = (ring * 0.5 + crown * 0.6) * vA;
            gl_FragColor = vec4(mix(vec3(0.7, 0.75, 0.88), vec3(1.5), uFlash), a);
          }`,
      }),
    );
    sm.frustumCulled = false;
    sm.renderOrder = 4;
    wx.add(sm);
    RAIN.splash = sm;
    RAIN.SU = SU;
  };
  // which roofs are near: the eight closest shelters (and roofs) feed the dry boxes
  const DRY_BOXES = [];
  const setDry = (me, umb) => {
    const list = DRY_BOXES.map((b) => [b, Math.hypot((b[0] + b[2]) / 2 - me.x, (b[1] + b[3]) / 2 - me.z)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, NDRY);
    [RAIN.U, RAIN.SU].forEach((U) => {
      for (let i = 0; i < NDRY; i++) {
        const b = list[i];
        if (b) {
          U.uDry.value[i].set(b[0][0], b[0][1], b[0][2], b[0][3]);
          U.uDryY.value[i] = b[0][4];
        } else U.uDryY.value[i] = -1e4;
      }
      if (umb) U.uUmb.value.set(umb.x, umb.z, umb.r, umb.y);
      else U.uUmb.value.set(0, 0, 0, -1e4);
    });
  };

  // ---------- the storm sky: a churning cloud ceiling lit by the flashes ----------
  const SKY = {};
  const makeSky = () => {
    const U = { uTime: SH.time, uFlash: SH.flash, uStorm: { value: 1 }, uBolt: { value: new THREE.Vector3(0, 1, 0) } };
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(380, 40, 20),
      new THREE.ShaderMaterial({
        uniforms: U,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        vertexShader: `
          varying vec3 vD;
          void main() {
            vD = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uTime;
          uniform float uFlash;
          uniform float uStorm;
          uniform vec3 uBolt;
          varying vec3 vD;
          ${NOISE_GLSL}
          void main() {
            vec3 d = normalize(vD);
            float y = d.y;
            vec2 q = d.xz / (0.22 + max(y, 0.0)) * 1.1;
            float n = fbm(q * 1.2 + vec2(uTime * 0.025, uTime * 0.012));
            float n2 = fbm(q * 3.3 - vec2(uTime * 0.04, 0.0));
            float c = smoothstep(0.3, 0.85, n * 0.75 + n2 * 0.35);
            vec3 col = mix(vec3(0.028, 0.024, 0.04), vec3(0.1, 0.088, 0.13), c);
            // the city glow on the cloud bellies near the horizon
            col += vec3(0.14, 0.045, 0.08) * pow(1.0 - clamp(y, 0.0, 1.0), 5.0);
            // a flash lights the clouds, strongest around the bolt
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.25 + 0.9 * c) * vec3(0.72, 0.74, 1.0) * (0.45 + 1.2 * near);
            gl_FragColor = vec4(col, uStorm);
          }`,
      }),
    );
    m.renderOrder = -9;
    m.frustumCulled = false;
    wx.add(m);
    SKY.mesh = m;
    SKY.U = U;
  };

  // ---------- lightning bolts: jagged cross-ribbons, a white core in a violet halo ----------
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
    for (let i = 0; i < 4; i++) {
      const core = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8e4ff').multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }),
      );
      const halo = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#8a6aff').multiplyScalar(1.2), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }),
      );
      core.visible = halo.visible = false;
      core.frustumCulled = halo.frustumCulled = false;
      wx.add(core, halo);
      bolts.push({ core, halo, t: -1, life: 0.5 });
    }
  };
  // a bolt from a to b (world space); pink ones are the rods sending the storm back up
  const bolt = (a, b, opt = {}) => {
    const B = bolts.find((x) => x.t < 0) || bolts[0];
    const seed = (Math.random() * 1e6) | 0;
    B.core.geometry.dispose();
    B.halo.geometry.dispose();
    B.core.geometry = boltGeo(a, b, seed, opt.w || 0.13, opt.branches != null ? opt.branches : 2);
    B.halo.geometry = boltGeo(a, b, seed, (opt.w || 0.13) * 4, opt.branches != null ? opt.branches : 2);
    B.core.material.color.set(opt.pink ? '#ffd0e4' : '#e8e4ff').multiplyScalar(3);
    B.halo.material.color.set(opt.pink ? '#ff4a8a' : '#8a6aff').multiplyScalar(1.2);
    B.t = 0;
    B.life = opt.life || 0.55;
    B.core.visible = B.halo.visible = true;
    SKY.U.uBolt.value.copy(a).sub(R.camera.position).normalize();
    flash(opt.flash != null ? opt.flash : 1);
    return B;
  };
  let flashV = 0;
  const flash = (k) => {
    flashV = Math.max(flashV, k);
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

  // ---------- an umbrella (the little one in your hand, and the giant lightning rods) ----------
  const makeUmbrella = (Rr, mat, rib, shaftLen, opt = {}) => {
    const g = new THREE.Group();
    const top = shaftLen;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(Rr * 0.022, Rr * 0.022, shaftLen, 6).translate(0, shaftLen / 2, 0), rib);
    g.add(shaft);
    const can = new THREE.Group();
    can.position.y = top;
    g.add(can);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(Rr, 16, 6, 0, TAU, 0, Math.PI * 0.36), mat);
    canopy.scale.y = 0.55;
    canopy.position.y = -Rr * 0.55;
    can.add(canopy);
    const ribs = new THREE.Group();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(Rr * 0.008, Rr * 0.008, Rr * 0.95, 4).translate(0, -Rr * 0.475, 0), rib);
      r.rotation.order = 'YXZ';
      r.rotation.y = a;
      r.rotation.x = -1.15;
      ribs.add(r);
      // the tips of the ribs
      const tip = new THREE.Mesh(new THREE.SphereGeometry(Rr * 0.02, 6, 4), opt.tipMat || rib);
      tip.position.set(Math.sin(a) * Rr * 0.9, -Rr * 0.31, Math.cos(a) * Rr * 0.9);
      ribs.add(tip);
    }
    can.add(ribs);
    const ferrule = new THREE.Mesh(new THREE.ConeGeometry(Rr * 0.03, Rr * 0.16, 6).translate(0, Rr * 0.08, 0), opt.tipMat || rib);
    can.add(ferrule);
    let handle = null;
    if (opt.handle !== false) {
      handle = new THREE.Mesh(new THREE.TorusGeometry(Rr * 0.07, Rr * 0.018, 6, 12, Math.PI), opt.handleMat || rib);
      handle.rotation.z = Math.PI;
      handle.position.set(Rr * 0.07, 0, 0);
      g.add(handle);
    }
    const setOpen = (k) => {
      const s = 0.12 + 0.88 * k;
      can.scale.set(s, 1 + (1 - k) * 1.9, s);
      ribs.visible = k > 0.15;
    };
    setOpen(1);
    return { g, can, canopy, setOpen, shaft };
  };

  // ---------- the Storm Spirit: a cloud of soft puffs with two pale eyes and a mouth ----------
  const makeBoss = (z) => {
    const g = new THREE.Group();
    g.position.copy(P(BOSS.x, BOSS.y, BOSS.z));
    const n = 900;
    const pos = new Float32Array(n * 3);
    const sz = new Float32Array(n);
    const sd = new Float32Array(n);
    const r = rng(5);
    for (let i = 0; i < n; i++) {
      // a lumpy anvil: wide on top, a belly below, a hanging chin in front
      const u = r() * TAU;
      const v = Math.acos(2 * r() - 1);
      const k = Math.pow(r(), 0.35);
      let x = Math.sin(v) * Math.cos(u) * 19 * k;
      let y = Math.cos(v) * 7.5 * k;
      let zz = Math.sin(v) * Math.sin(u) * 12 * k;
      if (y > 2) {
        x *= 1.25;
        zz *= 1.2;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = zz;
      sz[i] = 5 + r() * 7;
      sd[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const U = {
      uTime: SH.time,
      uFlash: { value: 0 },
      uHurt: { value: 0 },
      uFade: { value: 1 },
      uSpread: { value: 0 },
      uPx: { value: 1 },
      uMap: { value: T.cloud },
      uCharge: { value: 0 },
    };
    const pts = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        vertexShader: `
          attribute float aSize;
          attribute float aSeed;
          uniform float uTime;
          uniform float uSpread;
          uniform float uPx;
          varying float vShade;
          varying float vSeed;
          void main() {
            vec3 p = position;
            float a = uTime * (0.08 + aSeed * 0.05) + aSeed * 6.28;
            p.x += sin(a) * 1.2;
            p.y += cos(a * 1.3) * 0.6;
            p.z += sin(a * 0.7) * 0.9;
            p *= 1.0 + uSpread * (1.5 + aSeed);
            p.y += uSpread * 6.0 * aSeed;
            vShade = clamp(0.5 + position.y / 14.0, 0.0, 1.0);
            vSeed = aSeed;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = aSize * uPx * (300.0 / -mv.z) * (1.0 + uSpread);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform sampler2D uMap;
          uniform float uFlash;
          uniform float uHurt;
          uniform float uFade;
          uniform float uCharge;
          varying float vShade;
          varying float vSeed;
          void main() {
            vec4 t = texture2D(uMap, gl_PointCoord);
            vec3 c = mix(vec3(0.05, 0.045, 0.07), vec3(0.2, 0.18, 0.26), vShade);
            c += vec3(0.5, 0.52, 0.8) * uFlash * (0.4 + vSeed);
            c += vec3(0.6, 0.1, 0.3) * uHurt;
            c += vec3(0.25, 0.25, 0.6) * uCharge * step(0.85, vSeed);
            gl_FragColor = vec4(c, t.a * 3.2 * uFade);
          }`,
      }),
    );
    pts.frustumCulled = false;
    g.add(pts);
    // the face, turned to the gate
    const face = new THREE.Group();
    face.position.set(0, -1, -11.5);
    g.add(face);
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe0ff').multiplyScalar(1.6), toneMapped: false, transparent: true });
    const eyes = [-4.2, 4.2].map((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 10), eyeMat);
      e.scale.set(1.5, 0.75, 0.6);
      e.position.set(x, 1.6, 0);
      face.add(e);
      const halo = sprite(T.soft, '#9ac8ff', 7, 0.5);
      halo.position.copy(e.position);
      face.add(halo);
      return e;
    });
    const mouthMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9ac8ff').multiplyScalar(1.2), toneMapped: false, transparent: true, opacity: 0.8 });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.32, 6, 24, Math.PI * 0.8), mouthMat);
    // a scowl: the arc turned down, and two brows that pinch toward the nose
    mouth.rotation.z = Math.PI * 0.1;
    mouth.position.set(0, -4.6, 0);
    face.add(mouth);
    [-1, 1].forEach((sd) => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.42, 0.3), mouthMat);
      brow.position.set(sd * 4.0, 3.15, 0.2);
      brow.rotation.z = sd * 0.38;
      face.add(brow);
    });
    const core = sprite(T.soft, '#6a5aff', 30, 0.0);
    g.add(core);
    zg[z].add(g);
    return { g, pts, U, face, eyes, eyeMat, mouth, mouthMat, core, inhale: 0, cast: 0, hurt: 0, dead: 0, look: 0 };
  };

  // ---------- the rainbow over the city ----------
  const makeRainbow = (z) => {
    const U = { uK: { value: 0 } };
    const m = new THREE.Mesh(
      new THREE.RingGeometry(150, 172, 160, 1, 0, Math.PI),
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `
          varying float vR;
          varying float vA;
          void main() {
            vR = (length(position.xy) - 150.0) / 22.0;
            vA = atan(position.y, position.x);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uK;
          varying float vR;
          varying float vA;
          vec3 spec(float t) {
            return clamp(vec3(abs(t * 6.0 - 3.0) - 1.0, 2.0 - abs(t * 6.0 - 2.0), 2.0 - abs(t * 6.0 - 4.0)), 0.0, 1.0);
          }
          void main() {
            float t = clamp(vR, 0.0, 1.0);
            vec3 c = spec(1.0 - t * 0.85);
            float a = sin(t * 3.14159) * uK * 0.5 * smoothstep(0.0, 0.5, vA) * smoothstep(3.14159, 2.64, vA);
            gl_FragColor = vec4(c * a, a);
          }`,
      }),
    );
    m.position.copy(P(0, -40, 640));
    m.visible = false;
    zg[z].add(m);
    return { m, U };
  };

  // ---------- mechanisms ----------
  const mech = {};
  const crank = (z, id, x, zz, ry, y = 0) => {
    const K = KZ[z];
    const g = new THREE.Group();
    g.position.copy(P(x, y, zz));
    g.rotation.y = ry;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.34).translate(0, 0.55, 0), M.iron);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.44).translate(0, 1.18, 0), M.copper);
    const wheel = new THREE.Group();
    wheel.position.set(0, 1.18, 0.25);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16).rotateX(Math.PI / 2), M.brass);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05).translate(0, 0.15, 0.04), M.brass);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8).rotateX(Math.PI / 2).translate(0, 0.28, 0.12), M.black);
    wheel.add(disc, arm, knob);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glow('#ff5f8a', 1.4));
    lamp.position.set(0, 1.45, 0.2);
    g.add(post, box, wheel, lamp);
    zg[z].add(g);
    K.collider(x, y + 0.55, zz, 0.36, 1.1, 0.36);
    mech[id] = { id, pos: P(x, y, zz), wheel, lamp, prog: 0, kind: 'crank' };
    return mech[id];
  };
  const valve = (z, id, x, zz) => {
    const K = KZ[z];
    const g = new THREE.Group();
    g.position.copy(P(x, 0, zz));
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.0, 12).translate(0, 0.5, 0), M.iron);
    const wheel = new THREE.Group();
    wheel.position.set(0, 1.12, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24).rotateX(Math.PI / 2), M.copper);
    wheel.add(rim);
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.04), M.copper);
      s.rotation.y = (k * Math.PI) / 4;
      wheel.add(s);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow('#ff5f8a', 1.4));
    lamp.position.set(0, 1.28, 0);
    g.add(ped, wheel, lamp);
    zg[z].add(g);
    K.collider(x, 0.5, zz, 0.6, 1.0, 0.6);
    mech[id] = { id, pos: P(x, 0, zz), wheel, lamp, prog: 0, kind: 'valve' };
    return mech[id];
  };
  const lever = (z, id, x, y, zz, ry) => {
    const K = KZ[z];
    const g = new THREE.Group();
    g.position.copy(P(x, y, zz));
    g.rotation.y = ry;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5).translate(0, 0.45, 0), M.iron);
    const arm = new THREE.Group();
    arm.position.set(0, 0.9, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8).translate(0, 0.45, 0), M.brass);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow('#ff5f8a', 1.2));
    knob.position.y = 0.9;
    arm.add(rod, knob);
    arm.rotation.x = -0.7;
    g.add(base, arm);
    zg[z].add(g);
    K.collider(x, y + 0.45, zz, 0.7, 0.9, 0.5);
    mech[id] = { id, pos: P(x, y, zz), arm, knob, prog: 0, kind: 'lever' };
    return mech[id];
  };
  // bars (shutters, gates): a grid drawn once
  T.bars = null;
  const barsMat = () => {
    if (!T.bars)
      T.bars = LvKit.tex(256, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = '#ffffff';
        for (let k = 0; k < 8; k++) g.fillRect(k * 32 + 12, 0, 8, h);
        for (let k = 0; k < 4; k++) g.fillRect(0, k * 64 + 28, w, 8);
      });
    return new THREE.MeshStandardMaterial({ map: T.bars, color: '#4a4652', roughness: 0.5, alphaTest: 0.5, side: THREE.DoubleSide });
  };
  const barGate = (z, x0, x1, y0, h, zz, ox = 1) => {
    const K = KZ[z];
    const w = x1 - x0;
    const mat = barsMat().clone();
    mat.map = T.bars.clone();
    mat.map.needsUpdate = true;
    mat.map.repeat.set(w / 1.6, h / 1.6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(P((x0 + x1) / 2, y0 + h / 2, zz));
    zg[z].add(m);
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), M.iron);
    bottom.position.copy(P((x0 + x1) / 2, y0 + 0.07, zz));
    zg[z].add(bottom);
    const b = K.collider((x0 + x1) / 2, y0 + h / 2, zz, w, h, 0.4);
    return { m, bottom, b, x0, x1, y0, h, zz, k: 0, want: 0 };
  };

  // ---------- build ----------
  const lamps = [];
  const streaks = [];
  const waters = {};
  const overlays = {};
  const stairs = {};
  const gates = {};
  const darkEdges = {};
  const shutter = { k: 0 };
  let bridge = null;
  let gate5 = null;
  let chasm = null;
  const rods = [];
  let boss = null;
  let rainbow = null;
  let towerShelter = null;
  const lights = [];
  let flashLight = null;
  const playerLights = [];
  const curtains = [];
  const spills = [];
  const plateMeshes = {};
  const build = () => {
    if (built) {
      root.visible = true;
      wx.visible = true;
      return;
    }
    built = true;
    root.visible = true;
    wx.visible = true;
    makeTextures();
    makeMats();
    makeRain();
    makeSky();
    makeBolts();

    const KA = KZ.A;
    const KB = KZ.B;
    const KC = KZ.C;
    const KD = KZ.D;
    // ===== the street floor, all along =====
    KA.solid(0, -0.5, 55, 14, 1, 138, M.cobble);
    KB.solid(0, -0.5, 182, 14, 1, 116, M.cobble);
    KC.solid(0, -0.5, 287, 14, 1, 98, M.cobble);
    // pavements with a curb (zone A and the dark street)
    [
      ['A', -14, 86],
      ['C', 238, 336],
    ].forEach(([z, z0, z1]) => {
      [-1, 1].forEach((s) => {
        KZ[z].solid(s * 6, 0.06, (z0 + z1) / 2, 2, 0.12, z1 - z0, M.pave);
        KZ[z].deco(new THREE.BoxGeometry(0.22, 0.16, z1 - z0), M.curb, s * 4.95, 0.08, (z0 + z1) / 2);
      });
    });

    // ===== zone A: la rue des Auvents =====
    // the dead end behind the bus stop
    block('A', -20, 20, -18, -10, 18, M.stone);
    facadeEnd('A', -10, 18, 2);
    // buildings, left and right: [x side, z0, z1, top, style]
    const rowA = [
      [-1, -10, 12, 17, 0],
      [-1, 12, 29, 21, 2],
      [-1, 29, 52, 15, 1],
      [-1, 52, 74, 19, 3],
      [-1, 74, 104, 16, 0],
      [1, -10, 18, 19, 1],
      [1, 18, 40, 16, 3],
      [1, 40, 62, 22, 0],
      [1, 62, 86, 15, 2],
      [1, 86, 104, 17, 1],
      [-1, 118, 128, 15, 2],
      [1, 118, 128, 18, 0],
    ];
    rowA.forEach(([s, z0, z1, top, st], i) => {
      block('A', s > 0 ? 7 : -20, s > 0 ? 20 : -7, z0, z1, top, [M.plaster, M.brick, M.stone][st % 3]);
      facade('A', s, z0, z1, top, st, 4, true, i + 3);
    });
    // the alley: two blocks squeeze the street to 3.2 m
    block('A', -20, -1.6, 104.5, 118.2, 13, M.brick);
    block('A', 1.6, 20, 104.5, 118.2, 12, M.brick);
    alleyFace('A', -1, 104.5, 118.2, 13, 1);
    alleyFace('A', 1, 104.5, 118.2, 12, 3);

    // --- the bus stop (abribus): where it starts, where it ends ---
    const bus = new THREE.Group();
    zg.A.add(bus);
    [
      [1.4, -1.1],
      [1.4, 5.1],
      [6.8, -1.1],
      [6.8, 5.1],
    ].forEach(([x, z]) => KA.solid(x, 1.32, z, 0.1, 2.64, 0.1, M.iron));
    KA.solid(4.1, 2.7, 2, 5.7, 0.12, 6.6, M.iron);
    KA.deco(new THREE.BoxGeometry(5.6, 0.04, 6.5), M.glass, 4.1, 2.62, 2);
    // the glass side, the lit poster
    KA.solid(4.1, 1.4, -1.1, 5.2, 2.2, 0.06, M.glass);
    const poster = KA.deco(new THREE.PlaneGeometry(1.3, 1.95), M.poster, 6.0, 1.35, -1.04);
    anchors.push({ p: P(5.4, 1.6, -0.2), c: '#ff9ac0', i: 1.2, d: 6, z: 'A' });
    // the bench
    KA.solid(6.1, 0.42, 2, 0.6, 0.08, 4.2, M.wood);
    [0.4, 3.6].forEach((dz) => KA.solid(6.1, 0.2, dz, 0.5, 0.4, 0.1, M.iron));
    // a bus timetable post and the sign
    KA.solid(1.0, 1.6, 5.6, 0.1, 3.2, 0.1, M.iron);
    neon('A', 1.0, 3.3, 5.6, 0, 0.9, 0.9, '#3ad6ff', (g, W, H) => {
      g.lineWidth = 9;
      g.beginPath();
      g.arc(W / 2, H / 2, W * 0.4, 0, TAU);
      g.stroke();
      g.font = 'bold 120px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 6;
      g.strokeText('BUS', W / 2, H / 2 + 4);
    }, { k: 1.4, li: 0.8 });
    // the screen of the épreuve, a banner across the street
    screen = makeScreen(6, 2.4, 1024);
    screen.mesh.position.copy(P(0, 6.4, 12));
    screen.mesh.rotation.y = Math.PI;
    zg.A.add(screen.mesh);
    [-1, 1].forEach((s) => {
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 4).rotateZ(Math.PI / 2 - s * 0.25), M.black);
      cab.position.copy(P(s * 4.8, 7.4, 12));
      zg.A.add(cab);
    });

    // --- awnings: the café (left), the shop after the barrier (right) ---
    awning('A', -1, 29.5, 38.5, 4.4, 3.0, 0);
    awning('A', 1, 63.5, 72.5, 4.4, 3.0, 1);
    awning('A', -1, 6, 11, 1.8, 3.2, 2);
    awning('A', 1, 44, 49, 1.8, 3.2, 2);
    // café tables under the awning
    [
      [-5.6, 31.5],
      [-5.6, 35.5],
    ].forEach(([x, z]) => {
      KA.solid(x, 0.37, z, 0.7, 0.06, 0.7, M.wood);
      KA.collider(x, 0.35, z, 0.16, 0.7, 0.16);
      KA.deco(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6), M.iron, x, 0.36, z);
    });
    neon('A', -6.95, 4.0, 34, Math.PI / 2, 2.6, 0.9, '#ff3d7f', neonText('Café', 'italic bold 150px Georgia'), { flick: 0.15 });
    neon('A', -6.95, 4.0, 31.6, Math.PI / 2, 0.8, 0.8, '#ff3d7f', neonHeart(5));
    // blade signs, perpendicular to the street
    bladeSign('A', 1, 24, 7.5, 'HÔTEL', '#ffb050');
    bladeSign('A', -1, 60, 6.5, 'BAL', '#ff3d7f');
    neon('A', 6.95, 4.2, 46.5, -Math.PI / 2, 2.2, 0.8, '#3ad6ff', neonText('BAR', 'bold 160px Georgia'), { flick: 0.05 });
    neon('A', -6.95, 4.4, 78, Math.PI / 2, 3, 0.9, '#b07cff', neonText('Dancing', 'italic bold 140px Georgia'), { flick: 0.3 });
    neon('A', 6.95, 4.3, 68, -Math.PI / 2, 2.4, 0.8, '#ff6a9a', neonText('Fleurs', 'italic bold 150px Georgia'));

    // --- the barrier: too high to climb with an umbrella in your hand ---
    KA.collider(0, 0.98, BARRIER_Z, 14, 1.96, 0.6);
    [-5.25, -1.75, 1.75, 5.25].forEach((x, i) => {
      // two stacked barricades of planks with red and white stripes
      [0.5, 1.4].forEach((y) => {
        const b = KA.deco(new THREE.BoxGeometry(3.3, 0.36, 0.12), M.stripe, x, y, BARRIER_Z - 0.2);
        b.rotation.z = (i % 2 ? 1 : -1) * 0.02;
        KA.deco(new THREE.BoxGeometry(3.3, 0.36, 0.12), M.stripe, x, y, BARRIER_Z + 0.2);
      });
      [-1.5, 1.5].forEach((dx) => KA.deco(new THREE.BoxGeometry(0.1, 1.96, 0.6), M.wood, x + dx, 0.98, BARRIER_Z));
      // warning lamps on top
      const l = KA.deco(new THREE.SphereGeometry(0.1, 8, 6), glow('#ffa020', 1.8), x, 2.05, BARRIER_Z);
      neonSigns.push({ m: l, base: l.material.color.clone(), flick: 0, blink: i * 0.25, ph: 0, z: 'A' });
    });
    KA.deco(new THREE.BoxGeometry(14, 0.5, 0.3), M.wood, 0, 1.0, BARRIER_Z);
    const dev = KA.deco(new THREE.PlaneGeometry(2.2, 0.82), M.devia, 0, 1.25, BARRIER_Z - 0.32);
    dev.rotation.y = Math.PI;
    anchors.push({ p: P(0, 2.4, BARRIER_Z - 1.2), c: '#ffa040', i: 1.0, d: 8, z: 'A' });

    // --- the arcade: a glass-roofed gallery, closed by an iron shutter ---
    [
      [-4.3, 5.4],
      [4.3, 5.4],
    ].forEach(([x, w]) => KA.solid(x, 2.5, SHUT.z, w, 5, 0.5, M.stone));
    KA.solid(0, 4.1, SHUT.z, 3.2, 1.8, 0.5, M.stone);
    neon('A', 0, 4.25, SHUT.z - 0.3, Math.PI, 1.3, 1.1, '#ff3d7f', neonHeart(5.4), { li: 1.6 });
    neon('A', -3.6, 4.0, SHUT.z - 0.3, Math.PI, 3.6, 0.7, '#ffd090', neonText('Galerie des Pluies', 'italic 120px Georgia'), { k: 1.2, li: 0.8 });
    // the shutter (a grille: the umbrella goes through)
    const sm = barsMat();
    sm.map = T.bars.clone();
    sm.map.needsUpdate = true;
    sm.map.repeat.set(2, 2);
    shutter.m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, SHUT.h), sm);
    shutter.m.position.copy(P(0, SHUT.h / 2, SHUT.z));
    zg.A.add(shutter.m);
    shutter.bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.16), M.iron);
    zg.A.add(shutter.bar);
    shutter.b = KA.collider(0, SHUT.h / 2, SHUT.z, 3.2, SHUT.h, 0.5);
    crank('A', 'crankO', 3.2, 84.6, Math.PI);
    crank('A', 'crankI', -3.2, 87.9, 0);
    // inside: glass roof on iron ribs, columns, hanging lanterns
    KA.collider(0, 5.12, 95.3, 14, 0.25, 17.6);
    KA.deco(new THREE.BoxGeometry(14, 0.05, 17.6), M.glassLit, 0, 5.1, 95.3);
    for (let z = 87.5; z < 104; z += 2.2) KA.deco(new THREE.BoxGeometry(14, 0.12, 0.12), M.iron, 0, 5.0, z);
    [-4.6, 4.6].forEach((x) => {
      for (let z = 90; z < 104; z += 4.4) {
        KA.solid(x, 2.5, z, 0.42, 5, 0.42, M.stone);
        const lan = KA.deco(new THREE.SphereGeometry(0.18, 10, 8), M.bulb, x * 0.45, 4.1, z);
        KA.deco(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 4), M.black, x * 0.45, 4.6, z);
        void lan;
        anchors.push({ p: P(x * 0.45, 3.9, z), c: '#ffc070', i: 1.2, d: 9, z: 'A' });
      }
    });
    neon('A', 6.95, 3.4, 95, -Math.PI / 2, 2.4, 0.8, '#ff3d7f', neonText('Parapluies', 'italic bold 130px Georgia'));
    neon('A', -6.95, 3.4, 99, Math.PI / 2, 2.0, 0.8, '#3ad6ff', neonText('Thé', 'italic bold 150px Georgia'));
    // umbrellas hanging in a shop window (decor)
    for (let k = 0; k < 4; k++) {
      const u = makeUmbrella(0.5, M.umb, M.black, 0.5, { handle: true });
      u.g.position.copy(P(6.3, 2.9 - (k % 2) * 0.2, 91.5 + k * 0.9));
      u.g.rotation.z = Math.PI;
      u.setOpen(k % 2 ? 0.2 : 0.9);
      zg.A.add(u.g);
    }
    // the far end of the gallery opens into the alley
    [
      [-4.3, 5.4],
      [4.3, 5.4],
    ].forEach(([x, w]) => KA.solid(x, 2.5, 104.25, w, 5, 0.5, M.stone));
    KA.solid(0, 4.1, 104.25, 3.2, 1.8, 0.5, M.stone);

    // --- the alley of gutters: three water curtains from a broken gutter ---
    const fm = fallMat();
    CURTAINS.forEach((z, i) => {
      const pipe = KA.deco(new THREE.CylinderGeometry(0.14, 0.14, 3.6, 10).rotateZ(Math.PI / 2), M.iron, 0, 11.6 - i * 0.5, z);
      void pipe;
      const top = 11.6 - i * 0.5;
      const c1 = KA.deco(new THREE.PlaneGeometry(3.2, top), fm, 0, top / 2, z);
      const c2 = KA.deco(new THREE.PlaneGeometry(3.2, top), fm, 0, top / 2, z + 0.3);
      curtains.push({ z, m: [c1, c2] });
      puddlesList.push([0, 0.012, z + 0.15, 3.1, 1.6, 0, i * 3.1]);
    });
    // clotheslines with laundry
    for (let k = 0; k < 3; k++) {
      const z = 106 + k * 4.4;
      const y = 6.5 + k * 0.8;
      KA.deco(new THREE.CylinderGeometry(0.008, 0.008, 3.2, 3).rotateZ(Math.PI / 2), M.black, 0, y, z);
      for (let j = 0; j < 3; j++) {
        const c = KA.deco(new THREE.PlaneGeometry(0.62, 0.8), new THREE.MeshStandardMaterial({ map: T.laundry[(k + j) % 4], roughness: 0.9, side: THREE.DoubleSide }), -0.95 + j * 0.95, y - 0.42, z);
        spills.push({ cloth: c, ph: k * 2 + j });
      }
    }
    anchors.push({ p: P(0, 3.5, 110), c: '#ffb070', i: 0.8, d: 7, z: 'A' });
    const al = KA.deco(new THREE.SphereGeometry(0.14, 8, 6), M.bulb, 1.3, 3.6, 110);
    void al;
    // --- the porch at the end of the street ---
    KA.collider(0, 4.32, 122.4, 14, 0.25, 8.4);
    KA.deco(new THREE.BoxGeometry(14, 0.25, 8.4), M.stone, 0, 4.32, 122.4);
    [-6.6, -2.4, 2.4, 6.6].forEach((x) => KA.solid(x, 2.1, 126.3, 0.4, 4.2, 0.4, M.stone));
    anchors.push({ p: P(0, 3.6, 122.4), c: '#ffc080', i: 1.2, d: 9, z: 'A' });
    KA.deco(new THREE.SphereGeometry(0.2, 10, 8), M.bulb, 0, 3.9, 122.4);

    // ===== zone B: la crue =====
    const rowB = [
      [-1, 126, 150, 18, 1],
      [-1, 150, 184, 15, 3],
      [-1, 184, 210, 20, 0],
      [-1, 210, 236, 16, 2],
      [1, 126, 158, 16, 0],
      [1, 158, 184, 21, 2],
      [1, 184, 212, 15, 1],
      [1, 212, 236, 18, 3],
    ];
    rowB.forEach(([s, z0, z1, top, st], i) => {
      block('B', s > 0 ? 7 : -20, s > 0 ? 20 : -7, z0, z1, top, [M.plaster, M.brick, M.stone][st % 3]);
      facade('B', s, z0, z1, top, st, 4, true, i + 20);
    });
    Object.entries(BASINS).forEach(([k, Bs]) => buildBasin(k, Bs));
    neon('B', -6.95, 6.5, 160, Math.PI / 2, 3.2, 1.0, '#ff3d7f', neonText('Hôtel de la Gare', 'italic bold 110px Georgia'), { flick: 0.1 });
    neon('B', 6.95, 6.0, 210, -Math.PI / 2, 2.8, 1.0, '#3ad6ff', neonText('Brasserie', 'italic bold 130px Georgia'));
    bladeSign('B', 1, 132, 7, 'BAINS', '#3ad6ff');
    bladeSign('B', -1, 214, 7.2, 'CINÉ', '#ff3d7f');

    // ===== zone C: les éclairs =====
    block('C', -24, -7, 236, 300, 14, M.brick);
    block('C', 7, 24, 236, 284, 14, M.plaster);
    block('C', 7, 24, 284, 336, 24, M.stone);
    block('C', -24, -16, 300, 330, 7, M.plaster);
    // the courtyard wall: the gaps between the dark roofs are deep yards, closed off from the street
    block('C', -8.2, -7, 300, 336, 6.5, M.brick);
    facade('C', -1, 300, 336, 6.5, 2, 0, false, 43);
    KC.solid(-16, -0.5, 318, 16, 1, 36, M.cobble);
    facade('C', -1, 236, 300, 14, 2, 4, true, 40);
    facade('C', 1, 236, 284, 14, 1, 4, true, 41);
    facade('C', 1, 284, 336, 24, 0, 4, true, 42);
    // the hotel's great sign: the only warm light in the dark street
    neon('C', 6.95, 14, 310, -Math.PI / 2, 14, 3, '#ff3d7f', neonText('Hôtel du Cœur', 'italic bold 120px Georgia'), { flick: 0.08, li: 2.4, ld: 18 });
    neon('C', 6.95, 18.5, 310, -Math.PI / 2, 2.6, 2.6, '#ff3d7f', neonHeart(5.4), { li: 1.8, ld: 14 });
    // the dark fire escape on the left facade
    const dg = [];
    DARK_A.forEach(([x, top, z, sx, sz]) => {
      KC.solid(x, top - 0.12, z, sx, 0.24, sz, M.dark);
      dg.push([x - sx / 2, x + sx / 2, top, z - sz / 2, z + sz / 2]);
      // struts to the wall, a rail on the outside
      KC.deco(new THREE.BoxGeometry(Math.abs(-7 - (x + sx / 2)) + sx, 0.08, 0.08), M.dark, (x - 7) / 2, top - 0.6, z);
      KC.deco(new THREE.BoxGeometry(0.05, 0.9, sz), M.dark, x + sx / 2 - 0.03, top + 0.45, z);
    });
    // ladders between some landings (just decor in the dark)
    for (let i = 0; i < DARK_A.length - 1; i += 2) {
      const [x, top, z] = DARK_A[i];
      KC.deco(new THREE.BoxGeometry(0.5, 1.8, 0.05), M.dark, x - 0.8, top + 0.9, z + 1.0);
    }
    darkEdges.A = edges('C', dg);
    // the lever on the left roof (it lets the bridge out)
    lever('C', 'lever4', LEVERS.lever4[0], LEVERS.lever4[1], LEVERS.lever4[2], Math.PI / 2);
    // the lit stair (the way of the one who watches the sky)
    const LS = LIT_STAIR;
    const sl = [];
    for (let i = 0; i < LS.n; i++) {
      const zz = LS.z0 + ((i + 0.5) * (LS.z1 - LS.z0)) / LS.n;
      const top = (14 * (i + 1)) / LS.n;
      KC.collider((LS.x0 + LS.x1) / 2, top / 2, zz, LS.x1 - LS.x0, top, (LS.z1 - LS.z0) / LS.n);
      sl.push([(LS.x0 + LS.x1) / 2, top - 0.1, zz]);
    }
    instanced('C', new THREE.BoxGeometry(LS.x1 - LS.x0, 0.2, (LS.z1 - LS.z0) / LS.n + 0.02), M.iron, sl);
    // a stringer under the steps and a rail
    const len = Math.hypot(LS.z1 - LS.z0, 14);
    const ang = Math.atan2(14, LS.z1 - LS.z0);
    const str = KC.deco(new THREE.BoxGeometry(0.2, 0.5, len), M.iron, LS.x0 + 0.1, 6.8, (LS.z0 + LS.z1) / 2);
    str.rotation.x = -ang;
    const rail = KC.deco(new THREE.BoxGeometry(0.06, 0.06, len), M.brass, LS.x0 + 0.05, 7.9, (LS.z0 + LS.z1) / 2);
    rail.rotation.x = -ang;
    for (let k = 0; k < 6; k++) {
      const zz = LS.z0 + 2 + k * 5;
      const yy = (14 * (zz - LS.z0)) / (LS.z1 - LS.z0);
      KC.deco(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 4), M.black, LS.x0 + 0.1, yy + 1.2, zz);
      KC.deco(new THREE.SphereGeometry(0.16, 10, 8), M.bulb, LS.x0 + 0.1, yy + 2.35, zz);
      anchors.push({ p: P(LS.x0 + 0.3, yy + 2.2, zz), c: '#ffbf70', i: 1.5, d: 8, z: 'C', lit: true });
    }
    // the landing at the top of the lit stair: a gallery along the facade to where the bridge comes
    KC.solid((LS.x0 + LS.x1) / 2, 13.85, 277.6, LS.x1 - LS.x0, 0.3, 15.2, M.iron);
    [
      [LS.z1, BRIDGE.z0],
      [BRIDGE.z1, 285.2],
    ].forEach(([z0, z1]) => {
      KC.collider(LS.x0 + 0.05, 14.55, (z0 + z1) / 2, 0.08, 1.1, z1 - z0);
      KC.deco(new THREE.BoxGeometry(0.06, 0.06, z1 - z0), M.brass, LS.x0 + 0.05, 15.05, (z0 + z1) / 2);
      for (let z = z0; z <= z1; z += 1.2) KC.deco(new THREE.BoxGeometry(0.04, 1.0, 0.04), M.black, LS.x0 + 0.05, 14.5, z);
    });
    KC.deco(new THREE.SphereGeometry(0.16, 10, 8), M.bulb, LS.x1 - 0.3, 16.4, 280.5);
    anchors.push({ p: P(LS.x1 - 0.5, 16.2, 280.5), c: '#ffbf70', i: 1.5, d: 8, z: 'C', lit: true });
    // the bridge that slides out of the left roof
    const bg = new THREE.Group();
    zg.C.add(bg);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 3), M.iron);
    plank.position.set(0, -0.15, 0);
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.06, 0.06), M.brass);
    r1.position.set(0, 1.0, -1.45);
    const r2 = r1.clone();
    r2.position.z = 1.45;
    bg.add(plank, r1, r2);
    for (let k = 0; k < 8; k++) {
      [-1.45, 1.45].forEach((zz) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), M.iron);
        p.position.set(-7 + k * 2, 0.5, zz);
        bg.add(p);
      });
    }
    bridge = { g: bg, k: 0, want: 0, b: KC.collider(0, 13.85, (BRIDGE.z0 + BRIDGE.z1) / 2, 14, 0.3, BRIDGE.z1 - BRIDGE.z0) };
    bridge.b.on = false;
    // the lit way stays on its side of the street: no leap from the stair, the landing or the roof
    // behind it onto the dark fire escape or the left roof (only the bridge, once it is out)
    const nc = { tag: 'nocam' };
    const lx = LS.x0 - 0.05;
    KC.collider(lx, 10.5, (240.5 + BRIDGE.z0) / 2, 0.1, 21, BRIDGE.z0 - 240.5, nc);
    KC.collider(lx, 10.5, (BRIDGE.z1 + 288) / 2, 0.1, 21, 288 - BRIDGE.z1, nc);
    KC.collider(lx, 6.85, (BRIDGE.z0 + BRIDGE.z1) / 2, 0.1, 13.7, BRIDGE.z1 - BRIDGE.z0, nc);
    bridge.wall = KC.collider(lx, 17.5, (BRIDGE.z0 + BRIDGE.z1) / 2, 0.1, 7, BRIDGE.z1 - BRIDGE.z0, nc);
    // dark rooftops (stage 5) and the grapple ring over the wide gap
    const dgB = [];
    DARK_B.forEach(([x0, x1, top, z0, z1], i) => {
      if (i === 1) {
        KC.solid((x0 + x1) / 2, top - 0.1, (z0 + z1) / 2, x1 - x0, 0.2, z1 - z0, M.wood);
      } else {
        KC.solid((x0 + x1) / 2, top / 2, (z0 + z1) / 2, x1 - x0, top, z1 - z0, M.dark);
        // chimneys on the roofs
        KC.solid(x0 + 1, top + 0.7, z0 + 1, 0.8, 1.4, 0.8, M.brick);
      }
      dgB.push([x0, x1, top, z0, z1]);
    });
    darkEdges.B = edges('C', dgB);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 8, 24), glow('#ff5f8a', 0.9));
    ring.position.copy(P(...RING_B.pos));
    zg.C.add(ring);
    KC.deco(new THREE.CylinderGeometry(0.05, 0.05, 6, 4), M.dark, RING_B.pos[0], RING_B.pos[1] + 3.6, RING_B.pos[2]);
    RING_B.wp = P(...RING_B.pos);
    RING_B.mesh = ring;
    lever('C', 'lever5', LEVERS.lever5[0], LEVERS.lever5[1], LEVERS.lever5[2], 0);
    // the glass tunnel over the street (the lit way, stage 5)
    const TN = TUNNEL;
    KC.solid((TN.x0 + TN.x1) / 2, TN.y - 0.15, (TN.z0 + TN.z1) / 2, TN.x1 - TN.x0, 0.3, TN.z1 - TN.z0, M.wood);
    KC.solid(-6.7, TN.y - 0.15, (TN.door[0] + TN.door[1]) / 2, 0.6, 0.3, TN.door[1] - TN.door[0], M.wood);
    KC.solid((TN.x0 + TN.x1) / 2, TN.y + TN.h + 0.12, (TN.z0 + TN.z1) / 2, TN.x1 - TN.x0, 0.24, TN.z1 - TN.z0, M.glassLit);
    KC.solid((TN.x0 + TN.x1) / 2, TN.y + TN.h / 2, TN.z0 - 0.1, TN.x1 - TN.x0, TN.h, 0.2, M.glass);
    // side walls: glass, the left one has a door onto the left roof
    KC.solid(TN.x1 - 0.1, TN.y + TN.h / 2, (TN.z0 + TN.z1) / 2, 0.2, TN.h, TN.z1 - TN.z0, M.glass);
    KC.solid(TN.x0 + 0.1, TN.y + TN.h / 2, (TN.z0 + TN.door[0]) / 2, 0.2, TN.h, TN.door[0] - TN.z0, M.glass);
    KC.solid(TN.x0 + 0.1, TN.y + TN.h / 2, (TN.door[1] + TN.z1) / 2, 0.2, TN.h, TN.z1 - TN.door[1], M.glass);
    const fr = [];
    for (let z = TN.z0; z <= TN.z1; z += 3) {
      fr.push([TN.x0 + 0.1, TN.y + TN.h / 2, z, 1, 0, 1]);
      fr.push([TN.x1 - 0.1, TN.y + TN.h / 2, z, 1, 0, 1]);
    }
    instanced('C', new THREE.BoxGeometry(0.12, TN.h, 0.12), M.iron, fr);
    for (let z = TN.z0 + 8; z < TN.z1; z += 12) KC.solid((TN.x0 + TN.x1) / 2, (TN.y - 0.3) / 2, z, 0.6, TN.y - 0.3, 0.6, M.iron);
    // nobody walks on the tunnel's glass roof (it would skip the dark roofs and the gate)
    KC.collider((TN.x0 + TN.x1) / 2, 21, (TN.z0 + TN.z1) / 2, TN.x1 - TN.x0 + 0.4, 6.7, TN.z1 - TN.z0 + 0.4, nc);
    // the wide gap of the dark roofs: only the grapple crosses it (the level opens this screen while it pulls)
    chasm = KC.collider(-16.15, 17, RING_B.pos[2], 19.7, 12, 0.3, nc);
    for (let z = TN.z0 + 3; z < TN.z1; z += 6.5) {
      KC.deco(new THREE.SphereGeometry(0.14, 10, 8), M.bulb, (TN.x0 + TN.x1) / 2, TN.y + TN.h - 0.35, z);
      anchors.push({ p: P((TN.x0 + TN.x1) / 2, TN.y + TN.h - 0.6, z), c: '#ffbf70', i: 1.4, d: 7, z: 'C', lit: true });
    }

    // ===== zone D: the roof of the storm =====
    block('D', ARENA.x0, ARENA.x1, 336, ARENA.z1, ARENA.y, M.brick, M.roofD);
    // the front wall with the gate (lever 5 opens it)
    KD.solid((ARENA.x0 + GATE5.x0) / 2, 16.1, 336.3, GATE5.x0 - ARENA.x0, 4.2, 0.6, M.brick);
    KD.solid((GATE5.x1 + ARENA.x1) / 2, 16.1, 336.3, ARENA.x1 - GATE5.x1, 4.2, 0.6, M.brick);
    KD.solid((GATE5.x0 + GATE5.x1) / 2, 17.8, 336.3, GATE5.x1 - GATE5.x0, 0.8, 0.6, M.brick);
    gate5 = barGate('D', GATE5.x0, GATE5.x1, 14, 3.4, 336.3);
    // no leap over the front wall (from the lever, a chimney) or round its end: the gate is the way in
    KD.collider(0, 21.2, 336.3, 52, 6, 0.6, { tag: 'nocam' });
    KD.collider(-24, 17.1, 339, 4, 14.2, 6, { tag: 'nocam' });
    // parapets, with an iron railing on top (a bolt's blast can't throw anyone off the roof)
    KD.solid(ARENA.x0 + 0.2, 14.6, (336.6 + ARENA.z1) / 2, 0.4, 1.2, ARENA.z1 - 336.6, M.brick);
    KD.solid(ARENA.x1 - 0.2, 14.6, (336.6 + ARENA.z1) / 2, 0.4, 1.2, ARENA.z1 - 336.6, M.brick);
    KD.solid(0, 14.6, ARENA.z1 - 0.2, ARENA.x1 - ARENA.x0, 1.2, 0.4, M.brick);
    const railPosts = [];
    [
      [ARENA.x0 + 0.2, ARENA.x0 + 0.2, 336.6, ARENA.z1],
      [ARENA.x1 - 0.2, ARENA.x1 - 0.2, 336.6, ARENA.z1],
      [ARENA.x0, ARENA.x1, ARENA.z1 - 0.2, ARENA.z1 - 0.2],
    ].forEach(([x0, x1, z0, z1]) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      KD.collider((x0 + x1) / 2, 16.2, (z0 + z1) / 2, Math.max(0.3, x1 - x0), 2.0, Math.max(0.3, z1 - z0));
      const top = KD.deco(new THREE.BoxGeometry(x1 === x0 ? 0.07 : len, 0.07, x1 === x0 ? len : 0.07), M.iron, (x0 + x1) / 2, 16.2, (z0 + z1) / 2);
      void top;
      for (let k = 0; k <= len; k += 1.0) railPosts.push([x0 + ((x1 - x0) * k) / len, 15.7, z0 + ((z1 - z0) * k) / len, 1, 0, 1]);
    });
    instanced('D', new THREE.BoxGeometry(0.04, 1.0, 0.04), M.black, railPosts);
    // the water tower: shelter at the gate
    const tw = new THREE.Group();
    tw.position.copy(P(0, 14, 342));
    zg.D.add(tw);
    [
      [-1.9, -1.9],
      [1.9, -1.9],
      [-1.9, 1.9],
      [1.9, 1.9],
    ].forEach(([x, z]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.2, 6).translate(0, 2.1, 0), M.iron);
      l.position.set(x, 0, z);
      tw.add(l);
      KD.collider(x, 16.1, 342 + z, 0.3, 4.2, 0.3);
    });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 3.4, 20), M.wood);
    tank.position.y = 5.9;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.4, 20), M.iron);
    cone.position.y = 8.3;
    const floorT = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.2, 20), M.iron);
    floorT.position.y = 4.2;
    tw.add(tank, cone, floorT);
    [4.9, 6.9].forEach((y) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.72, 0.04, 6, 32).rotateX(Math.PI / 2), M.iron);
      hoop.position.y = y;
      tw.add(hoop);
    });
    anchors.push({ p: P(0, 17.4, 342), c: '#ffc080', i: 1.5, d: 8, z: 'D' });
    KD.deco(new THREE.SphereGeometry(0.2, 10, 8), M.bulb, 0, 18.0, 342);
    // roof clutter: vents, skylights, chimneys
    [
      [-6, 360, 2.4, 1.6, 1.8],
      [7, 380, 2.0, 1.4, 2.6],
      [-5, 396, 3.0, 1.2, 1.6],
      [6, 364, 1.2, 2.2, 1.2],
      [-17, 372, 1.4, 1.8, 3.0],
      [17, 372, 1.4, 1.8, 3.0],
    ].forEach(([x, z, sx, sy, sz]) => KD.solid(x, 14 + sy / 2, z, sx, sy, sz, M.iron));
    [
      [0, 356],
      [0, 386],
    ].forEach(([x, z]) => {
      KD.solid(x, 14.35, z, 3, 0.7, 2, M.iron);
      KD.deco(new THREE.BoxGeometry(2.8, 0.05, 1.8), M.glassLit, x, 14.72, z);
      anchors.push({ p: P(x, 15.2, z), c: '#ffb070', i: 0.8, d: 6, z: 'D' });
    });
    // antennas with red lights
    [
      [-20, 340],
      [20, 402],
      [-20, 402],
    ].forEach(([x, z]) => {
      KD.deco(new THREE.CylinderGeometry(0.05, 0.08, 8, 5), M.iron, x, 18, z);
      const l = KD.deco(new THREE.SphereGeometry(0.14, 8, 6), glow('#ff2030', 1.8), x, 22.1, z);
      neonSigns.push({ m: l, base: l.material.color.clone(), flick: 0, blink: (x + z) * 0.01, ph: 0, z: 'D' });
    });
    // the great heart sign at the back of the roof
    KD.solid(0, 17, 403.2, 0.3, 6, 0.3, M.iron);
    finale = { sign: neon('D', 0, 20.5, 402.9, Math.PI, 5, 5, '#ff3d7f', neonHeart(5.6), { k: 0.5, li: 1.2, ld: 16 }) };
    // the four lightning-rod umbrellas
    RODS.forEach(([x, z], i) => {
      KD.solid(x, 14.3, z, 2.2, 0.6, 2.2, M.stone);
      const u = makeUmbrella(4.4, M.rod.clone(), M.iron, 7.2, { handle: false, tipMat: M.copper });
      u.g.position.copy(P(x, 14.6, z));
      zg.D.add(u.g);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.6, 8).translate(0, 0.8, 0), M.copper);
      spike.position.y = 7.2;
      u.g.add(spike);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glow('#bfe0ff', 1.2));
      orb.position.y = 8.9;
      u.g.add(orb);
      KD.collider(x, 18, z, 0.3, 7, 0.3);
      // a work lamp on each base, so the roof is never a black hole
      KD.deco(new THREE.SphereGeometry(0.14, 10, 8), M.bulb, x + 1.0, 14.75, z);
      anchors.push({ p: P(x + 0.6, 16.6, z), c: '#ffb48a', i: 1.8, d: 13, z: 'D', lit: true });
      u.setOpen(0);
      const [cx, cz] = crankPos(i);
      const m = crank('D', 'rod' + i, cx, cz, Math.atan2(x - cx, z - cz) + Math.PI, 14);
      m.rod = { u, orb, open: 0, want: 0, top: P(x, 14.6 + 8.9, z) };
      rods.push(m);
    });
    // the Storm Spirit
    boss = makeBoss('D');
    rainbow = makeRainbow('D');
    // the card, and the heart that forms once the sky clears
    card = LvKit.trialCard('h8', true);
    card.position.copy(P(C.x, 15.8, C.z));
    zg.D.add(card);
    const hg = Heart.galaxy(9000, 1.05, 88);
    hg.group.position.copy(P(HEART.x, HEART.y, HEART.z));
    hg.group.rotation.y = Math.PI;
    hg.U.uForm.value = 0;
    hg.core.material.opacity = 0;
    hg.group.visible = false;
    zg.D.add(hg.group);
    finale.heart = hg;

    // ===== the city around (instanced towers with lit windows) =====
    backdrop();
    // ===== lamps along the streets =====
    [
      ['A', -6.3, 8],
      ['A', 6.3, 26],
      ['A', -6.3, 44],
      ['A', 6.3, 56],
      ['A', -6.3, 70],
      ['B', -6.3, 150],
      ['B', -6.3, 168],
      ['B', 6.3, 202],
      ['B', 6.3, 220],
      ['B', 6.3, 180],
      ['C', 6.3, 238.5],
      ['D', -21, 346],
      ['D', 21, 346],
      ['D', -21, 394],
      ['D', 21, 394],
    ].forEach(([z, x, zz]) => streetLamp(z, x, zz));
    buildLamps();
    // ===== puddles =====
    const pr = rng(91);
    for (let i = 0; i < 46; i++) {
      const z = -6 + pr() * 82;
      const x = (pr() - 0.5) * 12;
      if (Math.abs(z - BARRIER_Z) < 1.2) continue;
      puddlesList.push([x, 0.012, z, 1.4 + pr() * 2.6, 1.0 + pr() * 1.8, pr() * 3, pr() * 9]);
    }
    for (let i = 0; i < 10; i++) puddlesList.push([(pr() - 0.5) * 12, 0.012, 87 + pr() * 16, 1.2 + pr() * 2, 1 + pr() * 1.4, pr() * 3, pr() * 9]);
    for (let i = 0; i < 18; i++) puddlesList.push([(pr() - 0.5) * 12, 0.012, 239 + pr() * 44, 1.4 + pr() * 2.6, 1.0 + pr() * 1.8, pr() * 3, pr() * 9]);
    const pm = waterMat(false);
    const byZone = {};
    puddlesList.forEach((p) => (byZone[zoneOfZ(p[2])] = byZone[zoneOfZ(p[2])] || []).push(p));
    // the arena roof: big shallow pools where the heart will show
    byZone.D = [];
    for (let i = 0; i < 26; i++) {
      const x = -19 + pr() * 38;
      const z = 345 + pr() * 55;
      if (RODS.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 3.5) || Math.hypot(x, z - 342) < 4) continue;
      byZone.D.push([x, 14.012, z, 2 + pr() * 3.5, 1.6 + pr() * 2.6, pr() * 3, pr() * 9]);
    }
    byZone.D.push([0, 14.012, 370, 7, 5, 0.3, 2]);
    Object.entries(byZone).forEach(([z, list]) => {
      const m = new THREE.Mesh(flatQuads(list), pm);
      m.renderOrder = 1;
      zg[z].add(m);
    });
    // ===== light pool: the nearest lamps get a real light =====
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight('#ffffff', 0, 8, 2);
      root.add(l);
      lights.push(l);
    }
    flashLight = new THREE.DirectionalLight('#cfd6ff', 0);
    flashLight.position.set(0.3, 1, -0.2);
    root.add(flashLight);
    root.add(flashLight.target);
    for (let i = 0; i < 2; i++) {
      const l = new THREE.PointLight('#b8c4ff', 0, 3.2, 2);
      root.add(l);
      playerLights.push(l);
    }
    DRY_BOXES.length = 0;
    SHELTERS.forEach((s) => {
      if (s.r) DRY_BOXES.push([O.x + s.r[0], O.z + s.r[1], O.x + s.r[2], O.z + s.r[3], O.y + s.y]);
    });
    // the alley blocks and the barrier roof-free; the arcade is in the list (glass roof)
    DRY_BOXES.push([O.x - 24, O.z + 236, O.x - 7, O.z + 300, O.y + 14]);
    DRY_BOXES.push([O.x + 7, O.z + 236, O.x + 24, O.z + 284, O.y + 14]);
    DRY_BOXES.push([O.x + TUNNEL.x0, O.z + TUNNEL.z0, O.x + TUNNEL.x1, O.z + TUNNEL.z1, O.y + TUNNEL.y + TUNNEL.h]);
    DRY_BOXES.push([O.x - 2.9, O.z + 339.1, O.x + 2.9, O.z + 344.9, O.y + 18.2]);
  };
  const puddlesList = [];

  // ---------- builders used above ----------
  const facadeEnd = (z, zz, h, st) => {
    const g = new THREE.PlaneGeometry(14, h - 4);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (14 / 12), uv.getY(i) * ((h - 4) / 14));
    const m = new THREE.Mesh(g, M.fac[st]);
    m.position.copy(P(0, 4 + (h - 4) / 2, zz + 0.01));
    zg[z].add(m);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), M.shop[1]);
    s.position.copy(P(0, 2, zz + 0.015));
    zg[z].add(s);
  };
  const alleyFace = (z, side, z0, z1, h, st) => {
    const len = z1 - z0;
    const g = new THREE.PlaneGeometry(len, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / 12), uv.getY(i) * (h / 14));
    const m = new THREE.Mesh(g, M.fac[st]);
    m.position.copy(P(side * 1.59, h / 2, (z0 + z1) / 2));
    m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    zg[z].add(m);
  };
  const awning = (z, side, z0, z1, depth, y, style) => {
    const len = z1 - z0;
    const x0 = side * 7;
    const g = new THREE.PlaneGeometry(len, depth * 1.03);
    const m = new THREE.Mesh(g, M.awn[style]);
    m.rotation.order = 'YXZ';
    m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    m.rotation.x = -Math.PI / 2 + 0.25;
    m.position.copy(P(x0 - side * depth * 0.5, y - 0.28, (z0 + z1) / 2));
    zg[z].add(m);
    // the valance (scalloped front)
    const v = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.42), M.awn[style]);
    v.rotation.y = m.rotation.y;
    v.position.copy(P(x0 - side * depth, y - 0.75, (z0 + z1) / 2));
    zg[z].add(v);
    // iron arms
    [z0 + 0.2, z1 - 0.2].forEach((zz) => {
      const a = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.05, 0.05), M.iron);
      a.position.copy(P(x0 - side * depth * 0.5, y - 0.3, zz));
      a.rotation.z = side * 0.25;
      zg[z].add(a);
    });
    spills.push({ valance: v, ph: z0 });
    // water drips from the front edge
    for (let k = z0 + 0.6; k < z1; k += 1.4) puddlesList.push([x0 - side * (depth + 0.2), 0.012, k, 0.9, 0.7, 0, k]);
  };
  const bladeSign = (z, side, zz, y, text, color) => {
    const x = side * 6.1;
    KZ[z].deco(new THREE.BoxGeometry(1.8, 0.06, 0.06), M.iron, side * 6.1, y + 1.7, zz);
    neon(z, x, y, zz, Math.PI / 2, 1.0, 3.2, color, (g, W, H) => {
      g.lineWidth = 6;
      g.strokeRect(10, 10, W - 20, H - 20);
      g.font = 'bold 110px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 5;
      const n = text.length;
      for (let i = 0; i < n; i++) g.strokeText(text[i], W / 2, ((i + 0.6) * H) / (n + 0.2));
    }, { flick: 0.05 });
  };
  const lampList = [];
  const streetLamp = (z, x, zz) => {
    const top = z === 'D' ? 14 : 0;
    lampList.push([z, x, zz, top]);
    KZ[z].collider(x, top + 2.1, zz, 0.25, 4.2, 0.25);
    anchors.push({ p: P(x + (x > 0 ? -0.7 : 0.7), top + 3.9, zz), c: '#ffc080', i: 1.6, d: 11, z, lamp: true });
  };
  const buildLamps = () => {
    const poles = [];
    const heads = [];
    const arms = [];
    lampList.forEach(([z, x, zz, top]) => {
      poles.push([x, top + 2.1, zz]);
      heads.push([x + (x > 0 ? -0.7 : 0.7), top + 4.05, zz]);
      arms.push([x + (x > 0 ? -0.35 : 0.35), top + 4.3, zz]);
    });
    instanced('A', new THREE.CylinderGeometry(0.07, 0.11, 4.2, 8), M.iron, poles, root);
    instanced('A', new THREE.BoxGeometry(0.7, 0.06, 0.06), M.iron, arms, root);
    instanced('A', new THREE.CylinderGeometry(0.12, 0.2, 0.42, 6), M.bulb, heads, root);
    // halos (one Points for all) and streaks on the wet road
    const pos = [];
    const col = [];
    const cc = new THREE.Color();
    anchors.forEach((a) => {
      if (!a.lamp && !a.lit && a.i < 1.1) return;
      pos.push(a.p.x, a.p.y, a.p.z);
      cc.set(a.c).multiplyScalar(a.lamp ? 0.5 : 0.35);
      col.push(cc.r, cc.g, cc.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: T.soft, size: 2.6, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    pts.frustumCulled = false;
    root.add(pts);
    const src = anchors.filter((a) => a.p.y - O.y < 9 && (a.lamp || a.i >= 1.2));
    const sg = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(
      sg,
      new THREE.MeshBasicMaterial({ map: T.streak, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }),
      src.length,
    );
    src.forEach((a, i) => {
      im.setColorAt(i, cc.set(a.c).multiplyScalar(0.55));
      const floor = a.p.y - O.y > 12 ? 14 : 0;
      streaks.push({ a, i, floor, h: a.p.y - O.y - floor });
    });
    im.frustumCulled = false;
    im.renderOrder = 2;
    root.add(im);
    streaks.im = im;
  };
  // afterglow outlines of the dark path (a flash leaves them on your eyes for a moment)
  const edges = (z, list) => {
    const pos = [];
    list.forEach(([x0, x1, top, z0, z1]) => {
      const y = top + 0.02;
      const c = [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ];
      for (let k = 0; k < 4; k++) {
        const a = c[k];
        const b = c[(k + 1) % 4];
        pos.push(O.x + a[0], O.y + y, O.z + a[1], O.x + b[0], O.y + y, O.z + b[1]);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color('#9ab8ff').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.frustumCulled = false;
    zg[z].add(m);
    return m;
  };
  const fallMat = () =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: SH.time, uFlash: SH.flash },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vW;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlash;
        varying vec3 vW;
        varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          float s = vn(vec2((vW.x + vW.z) * 9.0, vW.y * 0.9 + uTime * 7.0));
          float s2 = vn(vec2((vW.x - vW.z) * 23.0, vW.y * 1.7 + uTime * 9.0));
          float a = smoothstep(0.35, 0.85, s) * 0.45 + smoothstep(0.6, 0.9, s2) * 0.3 + 0.1;
          a *= smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          vec3 c = mix(vec3(0.6, 0.66, 0.8), vec3(1.6), uFlash);
          gl_FragColor = vec4(c, a * 0.75);
        }`,
    });
  const buildBasin = (k, Bs) => {
    const K = KZ.B;
    const s = Bs.side;
    // sandbags at the entry
    const bags = [];
    const zb = Bs.z0 - 0.4;
    for (let x = Bs.x0 + 0.3; x < Bs.x1 - 0.2; x += 0.62) {
      bags.push([x, 0.13, zb, 1, 0.2, 0.42]);
      bags.push([x + 0.31, 0.33, zb, 1, -0.2, 0.42]);
    }
    instanced('B', new THREE.SphereGeometry(0.32, 12, 8).scale(1, 0.95, 0.7), M.bag, bags);
    K.collider((Bs.x0 + Bs.x1) / 2, 0.2, zb, Bs.x1 - Bs.x0, 0.4, 0.7);
    // the up-stair along the facade, the balcony, the folding stair down
    const [bx0, bx1, bz0, bz1] = Bs.bal;
    const sx = (bx0 + bx1) / 2;
    const n = 12;
    const st = [];
    for (let i = 0; i < n; i++) {
      const top = 0.42 * (i + 1);
      const zz = bz0 - 11 + (i + 0.5) * (11 / n);
      K.collider(sx, top / 2, zz, bx1 - bx0, top, 11 / n);
      st.push([sx, top / 2, zz, 1, 0, top / 0.42]);
    }
    instanced('B', new THREE.BoxGeometry(bx1 - bx0, 0.42, 11 / n + 0.01), M.iron, st);
    K.solid(sx, 4.9, (bz0 + bz1) / 2, bx1 - bx0, 0.28, bz1 - bz0, M.deck);
    // the railing on the water side (a real rail: you can't fall by mistake)
    const rx = s > 0 ? bx0 + 0.04 : bx1 - 0.04;
    K.collider(rx, 5.6, (bz0 + bz1) / 2, 0.08, 1.1, bz1 - bz0);
    K.deco(new THREE.BoxGeometry(0.06, 0.06, bz1 - bz0), M.brass, rx, 6.1, (bz0 + bz1) / 2);
    const rp = [];
    for (let z = bz0; z <= bz1; z += 0.5) rp.push([rx, 5.55, z, 1, 0, 1]);
    instanced('B', new THREE.BoxGeometry(0.03, 1.0, 0.03), M.black, rp);
    // the guide stays up there: no jumping over the rail, nor off the end before the stair unfolds
    K.collider(rx, 7.4, (bz0 + bz1) / 2, 0.1, 4.6, bz1 - bz0, { tag: 'nocam' });
    const endCap = K.collider(sx, 7.4, bz1 + 0.05, bx1 - bx0, 4.6, 0.1, { tag: 'nocam' });
    // under the balcony, a grille down to the water: the walker can't hug the facade past the drains
    const gw = bz1 - bz0;
    const gx = s > 0 ? bx0 : bx1;
    const grm = barsMat().clone();
    grm.map = T.bars.clone();
    grm.map.needsUpdate = true;
    grm.map.repeat.set(gw / 1.6, 4.7 / 1.6);
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(gw, 4.7), grm);
    grille.rotation.y = Math.PI / 2;
    grille.position.copy(P(gx, 2.35, (bz0 + bz1) / 2));
    zg.B.add(grille);
    K.collider(gx, 2.35, (bz0 + bz1) / 2, 0.2, 4.7, gw);
    anchors.push({ p: P(sx, 7.2, (bz0 + bz1) / 2), c: '#ffc080', i: 1.2, d: 10, z: 'B' });
    KZ.B.deco(new THREE.SphereGeometry(0.16, 10, 8), M.bulb, sx + s * 0.6, 7.4, (bz0 + bz1) / 2);
    // the folding stair (down to the far side, once the valve is turned)
    const fg = new THREE.Group();
    fg.position.copy(P(sx, 5.04, bz1));
    zg.B.add(fg);
    const fcols = [];
    for (let i = 0; i < n; i++) {
      const top = 5.04 - 0.42 * (i + 1);
      const zz = bz1 + (i + 0.5) * (11 / n);
      const m = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, 0.16, 11 / n + 0.02), M.iron);
      m.position.set(0, top - 0.08 - 5.04, zz - bz1);
      fg.add(m);
      const b = K.collider(sx, top - 0.2, zz, bx1 - bx0, 0.4, 11 / n);
      b.on = false;
      fcols.push(b);
    }
    stairs[k] = { g: fg, cols: fcols, k: 0, want: 0, endCap };
    // the floodgate wall and its two gates (the walkway and, under the balcony, the stair's way)
    const gz = Bs.gateZ;
    const wallPieces = s > 0 ? [[-7, -1.5], [1.5, bx0]] : [[bx1, -1.5], [1.5, 7]];
    wallPieces.forEach(([a, b]) => K.solid((a + b) / 2, 1.7, gz + 0.3, b - a, 3.4, 0.6, M.stone));
    const g1 = barGate('B', -1.5, 1.5, 0, 3.4, gz + 0.3);
    const g2 = barGate('B', bx0, bx1, 0, 3.4, gz + 0.3);
    gates[k] = [g1, g2];
    // no leap over the floodgate wall (from the valve's wheel) while the valve is shut
    gates[k].cap = K.collider(0, 5.7, gz + 0.3, 14, 4.6, 0.6, { tag: 'nocam' });
    valve('B', 'valve' + k, Bs.valve[0], Bs.valve[1]);
    // the drains on the floor (visible once the water is gone)
    const grates = PLATES[k].map(([x, z]) => [x, 0.015, z, 1.9, 1.9, Math.random() * 3, 0]);
    const gm = new THREE.Mesh(flatQuads(grates), M.grate);
    gm.visible = false;
    zg.B.add(gm);
    // the water itself
    const len = Bs.z1 - Bs.z0;
    const wm = new THREE.Mesh(flatQuads([[0, 0, (Bs.z0 + Bs.z1) / 2, 14, len, 0, 1]]), waterMat(true));
    wm.renderOrder = 3;
    zg.B.add(wm);
    waters[k] = { m: wm, level: 0, grate: gm };
    // what only the one on the balcony sees: the sucking drains and the currents
    const ov = new THREE.Group();
    zg.B.add(ov);
    const vortex = new THREE.ShaderMaterial({
      uniforms: { uTime: SH.time },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float r = length(c) * 2.0;
          float a = atan(c.y, c.x);
          float sp = sin(a * 3.0 + r * 9.0 - uTime * 6.0) * 0.5 + 0.5;
          float ring = smoothstep(0.08, 0.0, abs(r - 0.82));
          float body = (1.0 - smoothstep(0.55, 1.0, r)) * sp * 0.75;
          float k = (ring + body) * (1.0 - smoothstep(0.92, 1.0, r));
          gl_FragColor = vec4(vec3(1.0, 0.18, 0.32) * 1.4 * k, k);
        }`,
    });
    PLATES[k].forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(SUCK_R * 2.4, SUCK_R * 2.4).rotateX(-Math.PI / 2), vortex);
      m.position.copy(P(x, 0, z));
      ov.add(m);
    });
    const chev = [];
    CURRENTS[k].forEach(([x0, z0, x1, z1, fx2]) => {
      const t = T.chev.clone();
      t.needsUpdate = true;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set((x1 - x0) / 1.6, 1);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color('#3ad6ff').multiplyScalar(1.3), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      );
      if (fx2 < 0) m.rotation.y = Math.PI;
      m.position.copy(P((x0 + x1) / 2, 0, (z0 + z1) / 2));
      ov.add(m);
      chev.push({ t, sp: Math.abs(fx2) / 1.6 });
    });
    ov.visible = false;
    overlays[k] = { g: ov, chev };
    // the guide's lamp: a beam and a spot on the water (both of you see it)
  };
  const backdrop = () => {
    const r = rng(404);
    const lists = [[], [], []];
    const add = (x, z, w, d, h) => lists[(r() * 3) | 0].push([x, h / 2, z, 1, 0, h, 0, w, d]);
    for (let z = -60; z < 470; z += 14 + r() * 10) {
      [-1, 1].forEach((s) => {
        for (let k = 0; k < 3; k++) {
          const x = s * (34 + k * 26 + r() * 10);
          add(x, z + r() * 6, 14 + r() * 10, 12 + r() * 8, 18 + r() * 40 + k * 8);
        }
      });
    }
    for (let x = -100; x < 100; x += 18) {
      add(x, -40 - r() * 30, 16, 14, 20 + r() * 40);
      add(x, 440 + r() * 40, 16, 14, 24 + r() * 50);
    }
    lists.forEach((list, i) => {
      const f = T.fac[(i + 1) % T.fac.length];
      const map = f.map.clone();
      const emi = f.emi.clone();
      [map, emi].forEach((x) => {
        x.needsUpdate = true;
        x.repeat.set(1.4, 3.2);
      });
      const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: emi, emissive: '#ffffff', emissiveIntensity: 0.8, roughness: 0.8 });
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
      const m4 = new THREE.Matrix4();
      list.forEach(([x, y, z, , , h, , w, d], j) => {
        m4.compose(P(x, y, z), new THREE.Quaternion(), V3(w, h, d));
        im.setMatrixAt(j, m4);
      });
      im.frustumCulled = false;
      root.add(im);
    });
  };

  // ---------- procedural sound: rain, patter, gutters, thunder, wind, hail, gurgles ----------
  const AU = (() => {
    let ctx = null;
    let out = null;
    let WN = null;
    let BN = null;
    const N = {};
    const gutters = [];
    const buf = (sec, fill) => {
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
      fill(b.getChannelData(0), ctx.sampleRate);
      return b;
    };
    // drops on fabric, glass, metal: damped sines at random times
    const patter = (sec, rate, f0, f1, dec, amp) =>
      buf(sec, (d, sr) => {
        const n = Math.floor(sec * rate);
        for (let k = 0; k < n; k++) {
          const t0 = Math.floor(Math.random() * d.length);
          const f = f0 + Math.random() * (f1 - f0);
          const a = amp * (0.3 + Math.random() * 0.7);
          const L = Math.floor(dec * sr * 5);
          for (let i = 0; i < L; i++) {
            const j = (t0 + i) % d.length;
            d[j] += Math.sin((i / sr) * f * TAU) * a * Math.exp(-i / (dec * sr));
          }
        }
      });
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
    const pan = (pos, ref = 4, roll = 1.2) => {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = ref;
      p.rolloffFactor = roll;
      p.maxDistance = 2000;
      setP(p, pos);
      return p;
    };
    const setP = (p, v) => {
      if (p.positionX) {
        p.positionX.value = v.x;
        p.positionY.value = v.y;
        p.positionZ.value = v.z;
      } else p.setPosition(v.x, v.y, v.z);
    };
    const init = () => {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }
      if (typeof Sound === 'undefined' || !Sound.ready) return false;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      out = gain((typeof SETTINGS !== 'undefined' && SETTINGS.vol != null ? SETTINGS.vol : 0.8) * 0.9);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      out.connect(comp).connect(ctx.destination);
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
      // the rain bed: a hiss and a deep roar, muffled under a roof
      N.rain = gain(0);
      N.muff = filt('lowpass', 12000);
      N.rain.connect(N.muff).connect(out);
      const hi = src(WN);
      const hiF = filt('highpass', 900);
      const hiL = filt('lowpass', 8000);
      hi.connect(hiF).connect(hiL).connect(gain(0.32)).connect(N.rain);
      hi.start();
      const lo = src(BN);
      lo.connect(filt('lowpass', 420)).connect(gain(0.9)).connect(N.rain);
      lo.start();
      const drops = src(patter(2.5, 420, 1800, 5200, 0.0025, 0.22));
      drops.connect(gain(0.6)).connect(N.rain);
      drops.start();
      // the patter on the umbrella's fabric, and on awnings and glass roofs
      N.umb = gain(0);
      const u = src(patter(2, 260, 380, 900, 0.006, 0.35));
      u.connect(filt('lowpass', 2400)).connect(N.umb).connect(out);
      u.start();
      N.roof = gain(0);
      const r = src(patter(2, 300, 900, 2600, 0.004, 0.28));
      r.connect(N.roof).connect(out);
      r.start();
      // wind
      N.wind = gain(0.0);
      N.windF = filt('bandpass', 380, 0.9);
      const w = src(WN);
      w.connect(N.windF).connect(N.wind).connect(out);
      w.start();
      // three gutter streams that follow the nearest falls
      for (let i = 0; i < 3; i++) {
        const p = pan(V3(), 2.5, 1.4);
        const g = gain(0);
        const s = src(WN);
        s.connect(filt('bandpass', 900 + i * 300, 0.6)).connect(g).connect(p).connect(out);
        const s2 = src(patter(1.5, 200, 300, 800, 0.01, 0.4));
        s2.connect(g);
        s.start(0, Math.random() * 2);
        s2.start();
        gutters.push({ p, g });
      }
      return true;
    };
    const now = () => ctx.currentTime;
    const tgt = (param, v, k = 0.15) => param.setTargetAtTime(v, now(), k);
    const env = (g, t0, a, peak, d) => {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    };
    const listener = () => {
      const l = ctx.listener;
      const c = R.camera;
      const f = V3(0, 0, -1).applyQuaternion(c.quaternion);
      if (l.positionX) {
        l.positionX.value = c.position.x;
        l.positionY.value = c.position.y;
        l.positionZ.value = c.position.z;
        l.forwardX.value = f.x;
        l.forwardY.value = f.y;
        l.forwardZ.value = f.z;
        l.upX.value = 0;
        l.upY.value = 1;
        l.upZ.value = 0;
      } else {
        l.setPosition(c.position.x, c.position.y, c.position.z);
        l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
      }
    };
    let stopped = false;
    return {
      get on() {
        return !!ctx;
      },
      init,
      tick(dt, s) {
        if (!init()) return;
        listener();
        const rain = stopped ? 0 : s.rain;
        tgt(N.rain.gain, rain * (s.under ? 0.42 : 0.62), 0.12);
        tgt(N.muff.frequency, s.under === 'roof' ? 1600 : s.under === 'umb' ? 5200 : 12000, 0.1);
        tgt(N.umb.gain, s.under === 'umb' ? rain * 0.75 : 0, 0.08);
        tgt(N.roof.gain, s.under === 'roof' ? rain * 0.5 : 0, 0.15);
        const w = Math.min(1, s.wind / 6);
        tgt(N.wind.gain, (0.03 + w * 0.22) * (stopped ? 0.3 : 1), 0.3);
        tgt(N.windF.frequency, 300 + w * 700, 0.4);
        gutters.forEach((gt, i) => {
          const p = s.falls[i];
          if (p) setP(gt.p, p);
          tgt(gt.g.gain, p ? rain * 0.5 : 0, 0.2);
        });
      },
      stopRain() {
        if (!ctx) return;
        stopped = true;
        [N.rain.gain, N.umb.gain, N.roof.gain].forEach((g) => {
          g.cancelScheduledValues(now());
          g.setValueAtTime(g.value, now());
          g.linearRampToValueAtTime(0, now() + 0.12);
        });
      },
      startRain() {
        stopped = false;
      },
      thunder(pos, k = 1) {
        if (!init()) return;
        const c = R.camera.position;
        const d = pos ? pos.distanceTo(c) : 300;
        const t0 = now() + Math.min(2.6, d / 343);
        if (d < 140) {
          const n = src(WN, false);
          const g = gain(0);
          const f = filt('highpass', 1400);
          n.connect(f).connect(g).connect(pos ? pan(pos, 30, 0.6) : out);
          if (pos) g.connect(out);
          env(g, t0, 0.004, 0.9 * k * (1 - d / 160), 0.35);
          n.start(t0, Math.random());
          n.stop(t0 + 0.5);
        }
        const b = src(BN, false);
        const lp = filt('lowpass', 150 + 160 * k * Math.max(0, 1 - d / 400));
        const g = gain(0);
        b.connect(lp).connect(g);
        g.connect(out);
        const dur = 3.5 + Math.random() * 2.5;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.9 * k, t0 + 0.12);
        let tt = t0 + 0.12;
        for (let i = 0; i < 4; i++) {
          tt += dur / 5;
          g.gain.exponentialRampToValueAtTime((0.25 + Math.random() * 0.6) * k * (1 - i * 0.18), tt);
        }
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        b.start(t0, Math.random() * 2);
        b.stop(t0 + dur + 0.1);
      },
      // the low growl that announces the next flash (heard only by the one who watches the sky)
      growl(sec) {
        if (!init()) return;
        const b = src(BN, false);
        const g = gain(0);
        b.connect(filt('lowpass', 110)).connect(g).connect(out);
        const t0 = now();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + sec);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec + 0.4);
        b.start(t0, Math.random());
        b.stop(t0 + sec + 0.5);
      },
      crackle(pos, sec) {
        if (!init()) return;
        const b = src(patter(1, 90, 2500, 6000, 0.0015, 0.8), true);
        const g = gain(0);
        b.connect(g).connect(pan(pos, 5, 1)).connect(out);
        const t0 = now();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.7, t0 + sec);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec + 0.1);
        b.start(t0);
        b.stop(t0 + sec + 0.2);
      },
      gust(sec) {
        if (!init()) return;
        const n = src(WN, false);
        const f = filt('bandpass', 250, 1.2);
        const g = gain(0);
        n.connect(f).connect(g).connect(out);
        const t0 = now();
        f.frequency.setValueAtTime(220, t0);
        f.frequency.exponentialRampToValueAtTime(900, t0 + sec * 0.4);
        f.frequency.exponentialRampToValueAtTime(260, t0 + sec);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.55, t0 + sec * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec);
        n.start(t0, Math.random());
        n.stop(t0 + sec + 0.1);
      },
      hail(pos, covered) {
        if (!init()) return;
        const b = src(covered ? patter(1.1, 260, 420, 1100, 0.007, 0.5) : patter(1.1, 320, 2400, 6500, 0.002, 0.6), false);
        const g = gain(covered ? 0.9 : 0.7);
        b.connect(g).connect(pan(pos, 6, 1)).connect(out);
        b.start();
      },
      gurgle(pos) {
        if (!init()) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        const g = gain(0);
        o.connect(g).connect(pan(pos, 2, 1.6)).connect(out);
        const t0 = now();
        const f = 160 + Math.random() * 160;
        o.frequency.setValueAtTime(f, t0);
        o.frequency.exponentialRampToValueAtTime(f * (2.5 + Math.random()), t0 + 0.07);
        env(g, t0, 0.01, 0.28, 0.09);
        o.start(t0);
        o.stop(t0 + 0.15);
      },
      splash(v = 1, pos) {
        if (!init()) return;
        const n = src(WN, false);
        const g = gain(0);
        n.connect(filt('bandpass', 600 + Math.random() * 500, 1.1)).connect(g).connect(pos ? pan(pos, 3, 1.2) : out);
        const t0 = now();
        env(g, t0, 0.01, 0.35 * v, 0.22);
        n.start(t0, Math.random() * 2);
        n.stop(t0 + 0.35);
      },
      drench(pos) {
        if (!init()) return;
        const n = src(WN, false);
        const g = gain(0);
        n.connect(filt('lowpass', 2200)).connect(g).connect(out);
        const t0 = now();
        env(g, t0, 0.02, 0.6, 0.6);
        n.start(t0, Math.random() * 2);
        n.stop(t0 + 0.8);
        void pos;
      },
      suspend() {
        if (ctx && ctx.state === 'running') ctx.suspend();
      },
      resume() {
        stopped = false;
        if (ctx && ctx.state === 'suspended') ctx.resume();
      },
    };
  })();

  // ---------- telegraphs (the boss's lightning, hail) and hail pellets ----------
  const teles = [];
  let hailPts = null;
  const hail = [];
  const makeTeles = () => {
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#c8c0ff').multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      );
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false }),
      );
      ring.frustumCulled = disc.frustumCulled = false;
      ring.renderOrder = disc.renderOrder = 6;
      zg.D.add(ring, disc);
      teles.push({ ring, disc, t: -1, dur: 1, kind: '', r: 2 });
    }
    const n = 400;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3).fill(-9999);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    hailPts = new THREE.Points(g, new THREE.PointsMaterial({ map: T.soft, color: '#b8c4dc', size: 0.13, transparent: true, depthWrite: false }));
    hailPts.frustumCulled = false;
    zg.D.add(hailPts);
    for (let i = 0; i < n; i++) hail.push({ p: V3(0, -9999, 0), v: V3(), life: 0, floor: 0 });
  };
  const tele = (kind, x, z, r, dur) => {
    const T2 = teles.find((q) => q.t < 0) || teles[0];
    T2.kind = kind;
    T2.t = 0;
    T2.dur = dur;
    T2.r = r;
    T2.x = x;
    T2.z = z;
    T2.ring.position.copy(P(x, ARENA.y + 0.05, z));
    T2.disc.position.copy(P(x, ARENA.y + 0.04, z));
    T2.ring.material.color.set(kind === 'hail' ? '#bfe0ff' : '#c8c0ff').multiplyScalar(1.6);
    return T2;
  };
  // pellets: fall in a disc; the ones above the umbrella bounce off its canopy
  const hailBurst = (x, z, r, umb) => {
    let k = 0;
    for (const h of hail) {
      if (h.life > 0) continue;
      const a = Math.random() * TAU;
      const d = Math.sqrt(Math.random()) * r;
      h.p.copy(P(x + Math.cos(a) * d, ARENA.y + 9 + Math.random() * 4, z + Math.sin(a) * d));
      h.v.set((Math.random() - 0.5) * 1.5, -24 - Math.random() * 6, (Math.random() - 0.5) * 1.5);
      h.life = 1.4;
      h.floor = O.y + ARENA.y;
      if (umb && Math.hypot(h.p.x - umb.x, h.p.z - umb.z) < umb.r) h.floor = umb.y;
      if (++k > 70) break;
    }
  };
  const tickHail = (dt) => {
    if (!hailPts) return;
    const a = hailPts.geometry.attributes.position.array;
    let any = false;
    hail.forEach((h, i) => {
      if (h.life <= 0) return;
      any = true;
      h.life -= dt;
      h.v.y -= 30 * dt;
      h.p.addScaledVector(h.v, dt);
      if (h.p.y < h.floor && h.v.y < 0) {
        h.p.y = h.floor;
        h.v.y *= -0.3;
        h.v.x += (Math.random() - 0.5) * 3;
        h.v.z += (Math.random() - 0.5) * 3;
      }
      a[i * 3] = h.p.x;
      a[i * 3 + 1] = h.life > 0 ? h.p.y : -9999;
      a[i * 3 + 2] = h.p.z;
    });
    if (any) hailPts.geometry.attributes.position.needsUpdate = true;
  };

  // ---------- per-frame ----------
  // what the world shows, set by the level (as after a page load again on unbuild)
  const ST0 = () => ({
    rain: 1,
    wind: new THREE.Vector2(),
    clear: 0,
    storm: 1,
    hemi: 0.3,
    flashK: 1,
    umbCover: null,
    level: { A: 0, B: 0 },
    guide: null,
    lamp: null,
    shutter: 0,
    stairs: { A: 0, B: 0 },
    gates: { A: 0, B: 0 },
    bridge: 0,
    gate5: 0,
    prog: {},
    rods: [0, 0, 0, 0],
    after: 0,
    dark: 0,
    plights: [null, null],
    card: false,
    win: 0,
    lit: 1,
  });
  const ST = ST0();
  let lightT = 0;
  const lastProg = {};
  let beam = null;
  let beamSpot = null;
  const zoneVis = (pz) => {
    Object.entries(ZONES).forEach(([k, [z0, z1]]) => {
      zg[k].visible = pz > z0 - MARGIN[k][0] && pz < z1 + MARGIN[k][1];
    });
  };
  const update = (dt, t, me) => {
    if (!built) return;
    const q = rel(me);
    zoneVis(q.z);
    SH.time.value = t;
    flashV = Math.max(0, flashV - dt * 3.4);
    SH.flash.value = flashV;
    SH.clear.value = ST.clear;
    SH.rain.value = ST.rain;
    flashLight.intensity = flashV * 1.5 * ST.flashK;
    R.hemi.intensity = ST.hemi + flashV * 1.25 * ST.flashK;
    const cam = R.camera.position;
    // rain
    RAIN.U.uCam.value.copy(cam);
    RAIN.U.uWind.value.copy(ST.wind);
    RAIN.U.uAmt.value = ST.rain;
    let gy = Phys.groundAt(me.x, me.y + 0.5, me.z);
    if (!isFinite(gy)) gy = me.y;
    if (ST.waterY != null) gy = Math.max(gy, ST.waterY);
    RAIN.SU.uGround.value = gy;
    RAIN.U.uGround.value = Math.min(gy, cam.y - 3) - 0.3;
    RAIN.mesh.visible = RAIN.splash.visible = ST.rain > 0.01;
    setDry(me, ST.umbCover);
    SKY.U.uStorm.value = ST.storm;
    SKY.mesh.position.copy(cam);
    SKY.mesh.visible = ST.storm > 0.01;
    tickBolts(dt);
    tickHail(dt);
    // neons: some flicker, warning lamps blink
    neonSigns.forEach((n) => {
      if (!zg[n.z].visible) return;
      let k = ST.lit;
      if (n.blink != null) k *= Math.sin((t + n.blink) * 6) > 0 ? 1 : 0.15;
      else if (n.flick && Math.sin(t * 7.3 + n.ph) + Math.sin(t * 13.1 + n.ph * 2) > 2 - n.flick * 2.4) k *= 0.25;
      n.m.material.color.copy(n.base).multiplyScalar(k);
    });
    // the light pool: nearest anchors get the real lights (re-chosen a few times a second)
    lightT -= dt;
    if (lightT <= 0) {
      lightT = 0.2;
      const list = anchors.filter((a) => zg[a.z].visible && (!ST.dark || a.lit || a.i >= 2)).map((a) => [a, a.p.distanceToSquared(cam)]);
      list.sort((a, b) => a[1] - b[1]);
      lights.forEach((l, i) => {
        const a = list[i] && list[i][0];
        if (!a) {
          l.intensity = 0;
          return;
        }
        l.position.copy(a.p);
        l.color.set(a.c);
        l.distance = a.d;
        l.userData.i = a.i * (a.lit ? 1 : ST.lit);
      });
    }
    lights.forEach((l) => (l.intensity = damp(l.intensity, l.userData.i || 0, 6, dt)));
    ST.plights.forEach((p, i) => {
      const l = playerLights[i];
      if (p) {
        l.position.copy(p);
        l.intensity = 1.1;
      } else l.intensity = 0;
    });
    // reflections of the lights on the wet road, stretched towards the eye
    if (streaks.im) {
      const m4 = new THREE.Matrix4();
      const qq = new THREE.Quaternion();
      streaks.forEach((s) => {
        const a = s.a;
        const on = zg[a.z].visible && (!ST.dark || a.lit || a.i >= 2);
        const bx = a.p.x;
        const bz = a.p.z;
        const dx = cam.x - bx;
        const dz = cam.z - bz;
        const d = Math.hypot(dx, dz) || 1;
        const L = on ? clamp(s.h * 2.4, 2, 10) * Math.min(1, d / 6) : 0.0001;
        qq.setFromAxisAngle(UP, Math.atan2(-dx / d, -dz / d));
        m4.compose(tmp.set(bx, O.y + s.floor + 0.03, bz), qq, tmp2.set(0.9, 1, L));
        streaks.im.setMatrixAt(s.i, m4);
      });
      streaks.im.instanceMatrix.needsUpdate = true;
    }
    // falls, laundry, valances in the wind
    curtains.forEach((c) => c.m.forEach((m) => (m.visible = ST.rain > 0.01)));
    spills.forEach((s) => {
      if (s.cloth) s.cloth.rotation.x = Math.sin(t * 1.7 + s.ph) * 0.18 + ST.wind.y * 0.04;
      if (s.valance) s.valance.rotation.x = Math.sin(t * 2.3 + s.ph) * 0.05 + ST.wind.length() * 0.05;
    });
    // the shutter rolls up
    const sk = ST.shutter;
    const shh = SHUT.h * (1 - sk * 0.94);
    shutter.m.scale.y = shh / SHUT.h;
    shutter.m.position.y = O.y + SHUT.h - shh / 2;
    shutter.bar.position.copy(P(0, SHUT.h - shh + 0.06, SHUT.z));
    shutter.b.on = sk < 0.62;
    // mechanisms turn while someone works them
    Object.values(mech).forEach((m) => {
      const p = ST.prog[m.id] || 0;
      const was = lastProg[m.id] || 0;
      const turning = p > was + 1e-4;
      lastProg[m.id] = p;
      if (m.kind === 'crank') m.wheel.rotation.z += turning ? dt * 7 : 0;
      if (m.kind === 'valve') m.wheel.rotation.y = p * Math.PI * 4;
      if (m.kind === 'lever') m.arm.rotation.x = -0.7 + p * 1.4;
      const lmp = m.lamp || m.knob;
      if (lmp) lmp.material.color.set(p >= 1 ? '#7aff9a' : '#ff5f8a').multiplyScalar(1.2 + (turning ? Math.sin(t * 20) * 0.4 : 0));
    });
    // basins: water, gates, folding stairs, what the guide sees
    ['A', 'B'].forEach((k) => {
      const w = waters[k];
      const lv = ST.level[k];
      w.m.position.y = lv;
      w.m.visible = lv > 0.02 && zg.B.visible;
      // the drains only show once the water is gone (no peeking through the murk)
      w.grate.visible = lv < 0.03;
      gates[k].forEach((g) => {
        g.k = damp(g.k, ST.gates[k], 2.5, dt);
        g.m.position.y = O.y + g.y0 + g.h / 2 - g.k * (g.h + 0.1);
        g.bottom.position.y = O.y + g.y0 + 0.07 - g.k * (g.h + 0.1);
        g.b.on = g.k < 0.5;
      });
      const s = stairs[k];
      s.k = damp(s.k, ST.stairs[k], 2.2, dt);
      s.g.rotation.x = (-Math.PI / 2) * (1 - s.k);
      s.cols.forEach((b) => (b.on = s.k > 0.97));
      s.endCap.on = !ST.stairs[k];
      gates[k].cap.on = !ST.gates[k];
      const ov = overlays[k];
      ov.g.visible = ST.guide === k && lv > 0.05;
      if (ov.g.visible) {
        ov.g.position.y = lv + 0.04;
        ov.chev.forEach((c) => (c.t.offset.x = (c.t.offset.x - dt * c.sp) % 1));
      }
    });
    // the guide's lamp: a cone of light and a spot on the water
    if (!beam) {
      beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.55, 1, 16, 1, true).translate(0, 0.5, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd0e0').multiplyScalar(0.5), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide }),
      );
      beamSpot = sprite(T.soft, '#ff9ac0', 2.4, 0.9);
      root.add(beam, beamSpot);
    }
    beam.visible = beamSpot.visible = !!ST.lamp;
    if (ST.lamp) {
      const [from, to] = ST.lamp;
      tmp.copy(to).sub(from);
      const len = tmp.length();
      // the cone starts a little ahead of the hand, so the eye of the guide is never inside it
      tmp.normalize();
      beam.position.copy(from).addScaledVector(tmp, 0.7);
      beam.quaternion.setFromUnitVectors(UP, tmp);
      beam.scale.set(1 + len * 0.05, Math.max(0.1, len - 0.7), 1 + len * 0.05);
      beamSpot.position.copy(to);
      beamSpot.position.y += 0.1;
      beamSpot.material.opacity = 0.75 + Math.sin(t * 9) * 0.15;
    }
    // the bridge slides out, the gate drops into the roof
    bridge.k = damp(bridge.k, ST.bridge, 1.6, dt);
    bridge.g.position.copy(P(-14 + 14 * bridge.k, 14, (BRIDGE.z0 + BRIDGE.z1) / 2));
    bridge.g.visible = bridge.k > 0.02;
    bridge.b.on = bridge.k > 0.97;
    bridge.wall.on = !bridge.b.on;
    gate5.k = damp(gate5.k, ST.gate5, 2, dt);
    gate5.m.position.y = O.y + 14 + 1.7 - gate5.k * 3.6;
    gate5.bottom.position.y = O.y + 14.07 - gate5.k * 3.6;
    gate5.b.on = gate5.k < 0.5;
    // afterglow of the dark path, the players' little lights
    if (darkEdges.A) darkEdges.A.material.opacity = ST.afterA || 0;
    if (darkEdges.B) darkEdges.B.material.opacity = ST.afterB || 0;
    RING_B.mesh.material.color.set('#ff5f8a').multiplyScalar(0.5 + flashV * 1.5 + (ST.ringHint || 0));
    // the rods
    rods.forEach((m, i) => {
      const r = m.rod;
      r.open = damp(r.open, ST.rods[i], 2.2, dt);
      r.u.setOpen(r.open);
      r.u.canopy.material.emissiveIntensity = r.open * (0.35 + Math.sin(t * 2 + i) * 0.08);
      r.orb.material.color.set(r.open > 0.9 ? '#ff9ac0' : '#bfe0ff').multiplyScalar(0.8 + (ST.prog[m.id] || 0) * 1.2 + flashV);
    });
    // telegraphs
    teles.forEach((T2) => {
      if (T2.t < 0) {
        T2.ring.material.opacity = 0;
        T2.disc.material.opacity = 0;
        return;
      }
      T2.t += dt;
      const k = T2.t / T2.dur;
      if (T2.kind === 'bolt') {
        const r = T2.r * (1.2 - 0.25 * Math.min(1, k));
        T2.ring.scale.setScalar(r);
        T2.ring.material.opacity = k < 1 ? 0.5 + 0.4 * Math.sin(T2.t * (10 + k * 30)) : Math.max(0, 1 - (T2.t - T2.dur) * 3);
        T2.disc.scale.setScalar(T2.r);
        T2.disc.material.color.set('#2a2050');
        T2.disc.material.opacity = k < 1 ? 0.25 + k * 0.3 : Math.max(0, 0.6 - (T2.t - T2.dur) * 0.4);
      } else {
        T2.ring.scale.setScalar(T2.r);
        T2.ring.material.opacity = k < 1 ? 0.35 + 0.3 * Math.sin(T2.t * 14) : 0;
        T2.disc.scale.setScalar(T2.r * (0.4 + 0.6 * Math.min(1, k)));
        T2.disc.material.color.set('#000000');
        T2.disc.material.opacity = k < 1 ? 0.18 + k * 0.32 : 0;
      }
      if (T2.t > T2.dur + 1.6) T2.t = -1;
    });
    // the Storm Spirit
    const B = boss;
    if (B && zg.D.visible) {
      const bs = ST.boss || {};
      B.inhale = damp(B.inhale, bs.inhale ? 1 : 0, 3, dt);
      B.hurt = Math.max(0, B.hurt - dt * 1.2);
      B.cast = Math.max(0, B.cast - dt * 2);
      B.dead = damp(B.dead, bs.dead ? 1 : 0, 0.7, dt);
      const s = (1 + B.inhale * 0.12 - B.hurt * 0.06) * (1 - (bs.lost || 0) * 0.09);
      B.g.scale.setScalar(s);
      B.g.position.copy(P(BOSS.x + Math.sin(t * 0.3) * 1.5, BOSS.y + Math.sin(t * 0.5) * 0.8, BOSS.z));
      B.U.uFlash.value = flashV + B.cast * 0.6;
      B.U.uHurt.value = B.hurt;
      B.U.uCharge.value = bs.charge || 0;
      B.U.uSpread.value = B.dead * 1.3;
      B.U.uFade.value = 1 - B.dead;
      B.U.uPx.value = R.renderer.getPixelRatio();
      // the face looks at its target and narrows its eyes to strike
      if (bs.look) {
        const yaw = Math.atan2(bs.look.x - B.g.position.x, bs.look.z - B.g.position.z);
        B.g.rotation.y = angleDamp(B.g.rotation.y, yaw + Math.PI, 2, dt);
      }
      const squint = 0.75 - B.cast * 0.45 + B.inhale * 0.2;
      B.eyes.forEach((e) => (e.scale.y = Math.max(0.12, squint)));
      B.eyeMat.color.set(B.hurt > 0.2 ? '#ff9ac0' : '#bfe0ff').multiplyScalar(1.6 * (1 - B.dead));
      B.eyeMat.opacity = 1 - B.dead;
      B.mouth.scale.set(1 + B.inhale * 0.3, 1 + B.inhale * 0.8 + B.cast * 0.3, 1);
      B.mouthMat.opacity = (0.6 + B.cast * 0.4) * (1 - B.dead);
      B.core.material.opacity = (0.12 + flashV * 0.5 + B.cast * 0.3) * (1 - B.dead);
      B.g.visible = B.dead < 0.98;
    }
    // the clearing: card, heart, rainbow
    card.visible = ST.card;
    if (card.visible) {
      card.rotation.y = t * 0.9;
      card.position.y = O.y + 15.6 + Math.sin(t * 1.4) * 0.15 + Math.max(0, 6 - ST.win * 2.5);
    }
    const fk = clamp((ST.win - 1.2) / 3, 0, 1);
    const hg = finale.heart;
    hg.group.visible = fk > 0.01 && zg.D.visible;
    if (hg.group.visible) {
      hg.U.uTime.value = t;
      hg.U.uPx.value = R.renderer.getPixelRatio() * 0.6;
      hg.U.uForm.value = fk;
      hg.core.material.opacity = fk * 0.1;
    }
    rainbow.m.visible = ST.clear > 0.01;
    rainbow.U.uK.value = clamp((ST.win - 0.6) / 3, 0, 1);
    finale.sign.material.color.set('#ff3d7f').multiplyScalar(0.5 + fk * 1.3);
    fx.forEach((s) => s.update(dt, t));
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the street's own geometry, materials and canvas textures (the zone groups, the
  // camera-following rain and sky), takes its colliders out and forgets every reference build()
  // made, so the next build() makes it again. The sound (AU) stays: tr_c10 plays it too. The
  // level's umbrella lives in the scene from its first entry: what it uses stays alive with it.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    const r = Life.free([root, wx, ...Object.values(zg)], [M, T]);
    Object.values(zg).forEach((g) => root.add(g));
    r.world = 'tr_h8';
    r.colliders = Phys.drop('tr_h8');
    built = false;
    [T, M, RAIN, SKY, mech, waters, overlays, stairs, gates, darkEdges, plateMeshes, lastProg, sh, shutter, ST].forEach(clear);
    [fx, anchors, neonSigns, DRY_BOXES, bolts, lamps, streaks, rods, lights, playerLights, curtains, spills, puddlesList, lampList, teles, hail].forEach((a) => (a.length = 0));
    delete streaks.im;
    delete RING_B.wp;
    delete RING_B.mesh;
    shutter.k = 0;
    screen = card = finale = bridge = gate5 = chasm = boss = rainbow = towerShelter = flashLight = hailPts = beam = beamSpot = null;
    flashV = 0;
    lightT = 0;
    SH.flash.value = 0;
    Object.assign(ST, ST0());
    return r;
  };

  // ---------- queries ----------
  const inShelter = (q) => {
    for (const s of SHELTERS) {
      if (s.r) {
        if (q.x > s.r[0] && q.x < s.r[2] && q.z > s.r[1] && q.z < s.r[3] && q.y < s.y - 0.5 && q.y > s.f - 1) return s;
      } else if (Math.hypot(q.x - s.c[0], q.z - s.c[1]) < s.rad && q.y > s.f - 0.5 && q.y < s.y) return s;
    }
    return null;
  };
  const at = (zone, q) => {
    switch (zone) {
      case 'PORCH':
        return q.z > 118.6 && q.z < 126.8 && q.y > -0.5 && q.y < 4;
      case 'MID':
        return q.z > 177.8 && q.z < 184.2 && q.y > -0.5 && q.y < 3;
      case 'C0':
        return q.z > 230 && q.z < 239 && q.y > -0.5 && q.y < 3;
      case 'LROOF':
        return q.x < -7.1 && q.y > 13.5 && q.z > 274 && q.z < 300;
      case 'ARENA':
        return q.z > 337.2 && q.y > 13.5 && Math.abs(q.x) < 22;
      case 'WATER_A':
        return q.z > BASINS.A.z0 && q.z < BASINS.A.z1 && q.y < 1.5;
      case 'WATER_B':
        return q.z > BASINS.B.z0 && q.z < BASINS.B.z1 && q.y < 1.5;
      case 'BAL_A':
        return q.y > 3.5 && q.x > 4.4 && q.z > 128 && q.z < 177;
      case 'BAL_B':
        return q.y > 3.5 && q.x < -4.4 && q.z > 184 && q.z < 229;
      case 'GUSTS':
        return q.z > GUST_Z[0] && q.z < GUST_Z[1];
      case 'ALLEY':
        return q.z > 104.5 && q.z < 118.2;
      default:
        return false;
    }
  };
  const SPAWN = {
    1: [[3, 0, 1.2], [5, 0, 1.2]],
    2: [[5.8, 0, 125], [0, 0, 125]],
    3: [[0, 0, 181.5], [-5.8, 0, 181.5]],
    4: [[2.5, 0, 236], [-2.5, 0, 236]],
    5: [[-10, 14, 290], [-12, 14, 290]],
    6: [[-1, 14, 340.6], [1, 14, 340.6]],
    7: [[-2, 14, 364], [2, 14, 364]],
  };
  const spawn = (stage, who, sub = {}) => {
    const s = SPAWN[stage] || SPAWN[1];
    let p = s[who === 'dame' ? 0 : 1];
    if (sub.shelter) {
      const sh2 = SHELTERS.find((x) => x.id === sub.shelter);
      if (sh2) p = sh2.spawn[who === 'dame' ? 0 : 1];
    }
    if (sub.p) p = sub.p;
    return P(p[0], p[1], p[2]);
  };
  // the nearest falls (for the gutter sounds)
  const nearFalls = (me, out) => {
    out.length = 0;
    const q = rel(me);
    const list = CURTAINS.map((z) => [P(0, 2, z), Math.abs(q.z - z) + Math.abs(q.x)]);
    list.sort((a, b) => a[1] - b[1]);
    list.slice(0, 3).forEach((l) => l[1] < 40 && out.push(l[0]));
    return out;
  };

  return {
    O,
    P,
    rel,
    C,
    ARENA,
    BASINS,
    PLATES,
    CURRENTS,
    SUCK_R,
    SHELTERS,
    CURTAINS,
    BARRIER_Z,
    SHUT,
    LIT_STAIR,
    DARK_A,
    DARK_B,
    RING_B,
    TUNNEL,
    BRIDGE,
    GATE5,
    LEVERS,
    RODS,
    BOSS,
    HEART,
    crankPos,
    ST,
    AU,
    mech,
    rods,
    // the colliders made while building belong to the world (Phys.drop on unbuild)
    build() {
      Phys.owner('tr_h8');
      try {
        build();
        if (!teles.length) makeTeles();
      } finally {
        Phys.owner(null);
      }
    },
    unbuild,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
      wx.visible = false;
      AU.suspend();
    },
    update,
    bolt,
    flash,
    tele,
    hailBurst,
    inShelter,
    at,
    spawn,
    nearFalls,
    makeUmbrella: (r, len) => makeUmbrella(r, M.umb, M.black, len, { handle: true, tipMat: M.brass }),
    get root() {
      return root;
    },
    get boss() {
      return boss;
    },
    get chasm() {
      return chasm;
    },
    get screen() {
      return screen;
    },
    get card() {
      return card;
    },
    get flashV() {
      return flashV;
    },
    get teles() {
      return teles;
    },
    sprite: (c, s, o) => sprite(T.soft, c, s, o),
    T,
  };
})();
