// ♥ 10 · Le Marché (épreuve h10b): the Joker's market at the door of the Cour, in the rift above
// the storm. A causeway of floating rock islands carrying an ivory market hall on a harlequin floor,
// under iron arches and a torn glass roof; below, a sea of clouds lit from inside by the lightning;
// above, the violet tear of the rift. Four stations, one shortcut each:
//  1. Le Raccourci: the Joker's door « pour un seul », two « Non » plates, the gate behind
//  2. La Preuve: a round place, four curtained booths (one heart, three Joker boxes)
//  3. Les Loges: two booths split by a wall, levers « Prendre » / « Non », a clock in each
//  4. La Porte: the door of the Cour, three seals, a glitching wall between two « Non » lecterns
// Scanned materials (Poly Haven, lazily loaded for this level only, procedural until they arrive).
// Geometry, visuals, sound and pure helpers only; the rules live in js/levels/tr_h10.js.
const H10 = (() => {
  const O = V3(-3500, 0, 12600);
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

  // ---------- layout (relative to O; the way runs along +z) ----------
  const Y2 = 3; // the place, the loges and the bridge
  const Y4 = 6; // the terrace of the door
  const PLATES1 = { dame: [-4.5, 40], valet: [4.5, 40] };
  const PORTAL = { x: 0, z: 47.2 };
  const GATE1_Z = 61;
  const PLAZA = { x: 0, z: 128, r: 14 };
  const BOOTH_R = 10.5;
  // numbered left to right as seen from the way in (looking north, +x is on the left)
  const BOOTHS = [70, 35, -35, -70].map((d, i) => {
    const a = (d * Math.PI) / 180;
    return {
      i,
      a,
      x: Math.sin(a) * BOOTH_R,
      z: PLAZA.z + Math.cos(a) * BOOTH_R,
      // where you stand to pull its cord
      fx: Math.sin(a) * (BOOTH_R - 2.1),
      fz: PLAZA.z + Math.cos(a) * (BOOTH_R - 2.1),
    };
  });
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const GATE2_Z = 141.6;
  const LEVERS3 = {
    dame: { take: [-6.3, 193], non: [-3.7, 193] },
    valet: { take: [6.3, 193], non: [3.7, 193] },
  };
  const CLOCK3 = { dame: [-5, 205.55], valet: [5, 205.55] };
  const LECT4 = { dame: [-6, 268], valet: [6, 268] };
  const KEY4 = [0, 247.6];
  const DOOR_Z = 282;
  const CARD = [0, 294];

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
  // Each scan feeds one Tex.mat of this level only: its triplanar shader reads our textures once
  // they are loaded, and the procedural maps of the kind until then (or with ?noassets / ?look=0).
  const SCAN = {
    floor: { ids: ['tex.h10.floor.alb', 'tex.h10.floor.nrm'], mul: 1 },
    plaster: { ids: ['tex.h10.plaster.alb', 'tex.h10.plaster.nrm'], mul: 1 },
    // the same rock face as ♦10 Le Lac gelé (its files, shared)
    rock: { ids: ['tex.d10rock.alb', 'tex.d10rock.nrm'], mul: 1 },
    // already in the game for Terre 39: the same files, shared
    stone: { ids: ['tex.stone.alb', 'tex.stone.nrm'], mul: 0.5 },
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
    const m = Tex.mat(kind, Object.assign({ h10: name }, opt));
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
  const heartPath = (g, cx, cy, k) => {
    g.beginPath();
    g.moveTo(cx, cy + k * 0.32);
    g.bezierCurveTo(cx - k * 0.95, cy - k * 0.25, cx - k * 0.45, cy - k * 0.95, cx, cy - k * 0.42);
    g.bezierCurveTo(cx + k * 0.45, cy - k * 0.95, cx + k * 0.95, cy - k * 0.25, cx, cy + k * 0.32);
    g.closePath();
  };
  const makeTextures = () => {
    // striped market canvas with a scalloped edge (alpha)
    const stripes = (a, b) =>
      LvKit.tex(512, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const n = 8;
        for (let i = 0; i < n; i++) {
          g.fillStyle = i % 2 ? b : a;
          g.fillRect((i * w) / n, 0, w / n + 1, h * 0.84);
          g.beginPath();
          g.arc(((i + 0.5) * w) / n, h * 0.84, w / n / 2, 0, Math.PI);
          g.fill();
        }
        // weave and grime
        for (let y = 0; y < h * 0.9; y += 3) {
          g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
          g.fillRect(0, y, w, 1);
        }
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(255,255,255,0.12)');
        gr.addColorStop(1, 'rgba(0,0,0,0.25)');
        g.fillStyle = gr;
        g.globalCompositeOperation = 'source-atop';
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over';
      });
    T.awnR = stripes('#8e1630', '#e9dcc6');
    T.awnB = stripes('#1b1420', '#d9c7a4');
    // heavy velvet with gold fringe (the booths' curtains)
    T.velvet = LvKit.tex(256, 320, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i <= 10; i++) {
        const k = 0.55 + 0.45 * Math.sin(i * 1.9) * Math.sin(i * 0.7 + 1);
        gr.addColorStop(i / 10, `rgb(${Math.round(110 * k + 30)},${Math.round(10 * k + 6)},${Math.round(26 * k + 10)})`);
      }
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 6);
      }
      g.fillStyle = '#c8973e';
      g.fillRect(0, h - 26, w, 6);
      for (let x = 0; x < w; x += 6) g.fillRect(x, h - 20, 3, 18);
      g.fillRect(0, 6, w, 4);
    });
    // the Joker's mask: white porcelain, diamond eyes, a thin smile
    T.mask = LvKit.tex(256, 320, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.save();
      g.translate(w / 2, h / 2);
      const fg = g.createRadialGradient(-20, -40, 10, 0, 0, 150);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(1, '#bdb6c4');
      g.fillStyle = fg;
      g.beginPath();
      g.ellipse(0, 0, 104, 140, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#0b0710';
      [-1, 1].forEach((s) => {
        g.beginPath();
        g.moveTo(s * 44, -58);
        g.lineTo(s * 70, -30);
        g.lineTo(s * 44, -4);
        g.lineTo(s * 18, -30);
        g.closePath();
        g.fill();
      });
      g.strokeStyle = '#0b0710';
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-58, 46);
      g.quadraticCurveTo(0, 104, 58, 46);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-58, 46);
      g.lineTo(-66, 38);
      g.moveTo(58, 46);
      g.lineTo(66, 38);
      g.stroke();
      // a red diamond on the cheek, and a black tear
      g.fillStyle = '#d0213f';
      g.beginPath();
      g.moveTo(62, 10);
      g.lineTo(72, 24);
      g.lineTo(62, 38);
      g.lineTo(52, 24);
      g.closePath();
      g.fill();
      g.restore();
    });
    // brass plaque « NON » (top of the plates and the lecterns)
    T.non = LvKit.tex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w * 0.6);
      gr.addColorStop(0, '#f1d08a');
      gr.addColorStop(1, '#8a5f22');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - 2, 0, TAU);
      g.fill();
      g.strokeStyle = '#5a3a12';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - 14, 0, TAU);
      g.stroke();
      g.fillStyle = '#3a220a';
      g.font = 'bold italic 92px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('NON', w / 2, h / 2 + 6);
    });
    // clock dials: the Capitaine's watch (true) and the Joker's clock (lies)
    const dial = (joker) =>
      LvKit.tex(512, 512, (g, w, h) => {
        const c = w / 2;
        g.fillStyle = joker ? '#0e0912' : '#efe6d2';
        g.beginPath();
        g.arc(c, c, c - 2, 0, TAU);
        g.fill();
        g.strokeStyle = joker ? '#b0123a' : '#9a7a3a';
        g.lineWidth = 10;
        g.beginPath();
        g.arc(c, c, c - 12, 0, TAU);
        g.stroke();
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const R2 = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * TAU;
          const big = i % 5 === 0;
          const r0 = c - 26;
          const r1 = c - (big ? 52 : 38);
          // the Joker's ticks wobble
          const j = joker ? Math.sin(i * 2.7) * 0.03 : 0;
          g.strokeStyle = joker ? '#d8c8d8' : '#1d1410';
          g.lineWidth = big ? 6 : 2;
          g.beginPath();
          g.moveTo(c + Math.sin(a + j) * r0, c - Math.cos(a + j) * r0);
          g.lineTo(c + Math.sin(a + j) * r1, c - Math.cos(a + j) * r1);
          g.stroke();
        }
        R2.forEach((s, i) => {
          const a = (i / 12) * TAU;
          const r = c - 92;
          g.save();
          g.translate(c + Math.sin(a) * r, c - Math.cos(a) * r);
          if (joker) g.rotate(Math.sin(i * 3.1) * 0.5);
          g.fillStyle = joker ? (i === 0 ? '#ff2f5a' : '#e8d8e8') : '#1d1410';
          g.font = (joker ? 'italic ' : '') + 'bold 40px Georgia';
          g.fillText(joker && i === 0 ? '★' : s, 0, 0);
          g.restore();
        });
        g.fillStyle = joker ? '#ff2f5a' : '#6a4a1a';
        g.font = 'italic 30px Georgia';
        g.fillText(joker ? 'Joker' : 'Capitaine', c, c + 92);
        if (!joker) {
          // the monocle on its chain
          g.strokeStyle = '#6a4a1a';
          g.lineWidth = 5;
          g.beginPath();
          g.arc(c, c - 70, 22, 0, TAU);
          g.stroke();
          g.beginPath();
          g.moveTo(c + 16, c - 54);
          g.quadraticCurveTo(c + 40, c - 20, c + 30, c);
          g.stroke();
        } else {
          g.fillStyle = '#e8d8e8';
          g.beginPath();
          g.arc(c, c - 70, 6, 0, TAU);
          g.fill();
        }
      });
    T.dialCap = dial(false);
    T.dialJoker = dial(true);
    // a covered clock (the other loge's, never seen from here)
    T.dialOff = LvKit.tex(256, 256, (g, w, h) => {
      g.fillStyle = '#2a1e2a';
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - 2, 0, TAU);
      g.fill();
      g.strokeStyle = '#5a4a5a';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - 10, 0, TAU);
      g.stroke();
    });
    // soft round glow
    T.soft = LvKit.tex(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    // the threshold of the Cour: an arch of gold light
    T.arch = LvKit.tex(256, 384, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = w * 0.42;
      const path = () => {
        g.beginPath();
        g.moveTo(w / 2 - r, h);
        g.lineTo(w / 2 - r, r + 24);
        g.arc(w / 2, r + 24, r, Math.PI, 0);
        g.lineTo(w / 2 + r, h);
        g.closePath();
      };
      const gr = g.createRadialGradient(w / 2, h * 0.62, 10, w / 2, h * 0.55, h * 0.6);
      gr.addColorStop(0, 'rgba(255,250,235,1)');
      gr.addColorStop(0.35, 'rgba(255,214,140,0.95)');
      gr.addColorStop(1, 'rgba(200,120,60,0.55)');
      g.fillStyle = gr;
      path();
      g.fill();
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 18; i++) {
        g.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`;
        const x = w * (0.1 + Math.random() * 0.8);
        g.fillRect(x, 0, 2 + Math.random() * 8, h);
      }
      g.globalCompositeOperation = 'source-over';
    });
    T.heart = LvKit.tex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.shadowColor = '#ff5f8a';
      g.shadowBlur = 18;
      g.fillStyle = '#ff8fb0';
      heartPath(g, w / 2, h / 2 + 8, 70);
      g.fill();
    });
  };
  // gold lettering on a dark board
  const signTex = (text, sub, red) =>
    LvKit.tex(512, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, red ? '#4a0c1a' : '#17101c');
      gr.addColorStop(1, red ? '#2a0610' : '#0a070d');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8973e';
      g.lineWidth = 4;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#f0c878';
      g.shadowColor = 'rgba(255,200,120,0.6)';
      g.shadowBlur = 8;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let size = sub ? 44 : 54;
      g.font = `italic bold ${size}px Georgia`;
      while (g.measureText(text).width > w - 60 && size > 14) {
        size -= 2;
        g.font = `italic bold ${size}px Georgia`;
      }
      Icons.fillText(g, text, w / 2, sub ? h * 0.4 : h / 2 + 2);
      if (sub) {
        g.shadowBlur = 0;
        g.fillStyle = '#c9a8b8';
        g.font = '22px "IBM Plex Mono", monospace';
        Icons.fillText(g, sub.toUpperCase(), w / 2, h * 0.76);
      }
    });

  // ---------- materials ----------
  const M = {};
  const std = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
  const makeMats = () => {
    M.floor = scan('tiles', 'floor', { color: '#d6cec8', scale: 6, rough: 1 });
    M.plaster = scan('plaster', 'plaster', { color: '#f1e6d6', scale: 3, rough: 1 });
    M.wine = scan('plaster', 'plaster', { color: '#7a2034', scale: 3, rough: 1 });
    M.rock = scan('rock', 'rock', { color: '#a596b4', scale: 9, rough: 1, bump: 1.2 });
    M.stone = scan('stone', 'stone', { color: '#d9cfc6', scale: 4, rough: 1 });
    M.wood = scan('wood', 'wood', { color: '#a06a4c', scale: 2.4, rough: 0.9 });
    M.iron = Tex.mat('metal', { color: '#3a3440', rough: 0.45, metal: 0.75, scale: 2, h10: 'iron' });
    M.brass = Tex.mat('metal', { color: '#d8a656', rough: 0.32, metal: 1, scale: 1.4, h10: 'brass' });
    // no env map in the game: metals get a cheap studio reflection, else they render black
    if (typeof Assets !== 'undefined' && Assets.envify) [M.iron, M.brass].forEach((m) => Assets.envify(m, 0.6));
    M.glass = std('#3c3a58', 0.05, { metalness: 0.5, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    M.awnR = std('#ffffff', 0.85, { map: T.awnR, alphaTest: 0.5, side: THREE.DoubleSide });
    M.awnB = std('#ffffff', 0.85, { map: T.awnB, alphaTest: 0.5, side: THREE.DoubleSide });
    M.velvet = std('#ffffff', 0.9, { map: T.velvet, side: THREE.DoubleSide });
    M.cards = std('#f4efe6', 0.6);
    M.chipR = std('#a8142e', 0.4);
    M.chipK = std('#16121a', 0.4);
    M.lamp = LvKit.glow('#ffc47a', 2.2);
    M.rose = LvKit.glow('#ff5f8a', 1.6);
    M.non = std('#ffffff', 0.35, { map: T.non, metalness: 0.6 });
    M.dark = std('#120c16', 0.7);
    M.porcelain = std('#f6eff2', 0.3, { metalness: 0.05 });
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
      const m = b.mesh(M[k]);
      root.add(m);
    });
  // a solid that walks: a floor slab (top at y) with a stone kerb and a rock island under it
  const slab = (x, top, z, w, d, o = {}) => {
    box(o.mat || 'floor', x, top - 0.25, z, w, 0.5, d);
    K.collider(x, top - 0.25, z, w, 0.5, d);
    if (o.kerb !== false) {
      box('stone', x, top - 0.3, z - d / 2 - 0.15, w + 0.6, 0.62, 0.3);
      box('stone', x, top - 0.3, z + d / 2 + 0.15, w + 0.6, 0.62, 0.3);
      box('stone', x - w / 2 - 0.15, top - 0.3, z, 0.3, 0.62, d);
      box('stone', x + w / 2 + 0.15, top - 0.3, z, 0.3, 0.62, d);
    }
    if (o.rock !== false) rockUnder(x, top - 0.55, z, w, d, o.depth || Math.max(8, Math.min(w, d) * 1.4), o.seed || ((x * 7 + z * 13) | 0));
  };
  // a floating island's rocky underside: a rough cone, flat on top
  const rockGeo = (seed) => {
    const g = new THREE.CylinderGeometry(0.5, 0.05, 1, 16, 10, false);
    const p = g.attributes.position;
    const r = rng(seed);
    const ph = [r() * 10, r() * 10, r() * 10, r() * 10];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const t = 0.5 - y; // 0 at the top .. 1 at the tip
      const n =
        1 +
        0.18 * Math.sin(a * 3 + ph[0] + t * 5) +
        0.1 * Math.sin(a * 7 + ph[1] - t * 9) +
        0.06 * Math.sin(a * 13 + ph[2] + t * 3) +
        (t > 0.05 ? 0.12 * (hash(Math.round(a * 4), Math.round(t * 9) + seed) - 0.5) : 0);
      // a lumpy, slightly bellied profile
      const belly = 1 + 0.25 * Math.sin(t * Math.PI) * (t < 0.6 ? 1 : 0.6);
      p.setXYZ(i, x * n * belly, -t + 0.02 * Math.sin(a * 5 + ph[3]) * t, z * n * belly);
    }
    g.computeVertexNormals();
    return g;
  };
  const rockGeos = [];
  const rockUnder = (x, y, z, w, d, depth, seed) => {
    const g = rockGeos[Math.abs(seed) % rockGeos.length];
    put('rock', g, x, y, z, [0, (seed % 7) * 0.9, 0], [w * 1.12, depth, d * 1.12]);
  };

  // ---------- the sky above the storm: a dark dome, churning clouds high up, the rift ----------
  const SH = { time: { value: 0 }, flash: { value: 0 }, bolt: { value: V3(0, 1, 0) }, fp: { value: V3(0, 0, 0) }, cam: { value: V3() } };
  const HOR = new THREE.Color('#2a1a3a');
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
            vec3 zen = vec3(0.018, 0.014, 0.045);
            vec3 col = mix(uHor, zen, smoothstep(-0.02, 0.55, y));
            // a ceiling of storm high above, slowly turning
            vec2 q = d.xz / (0.18 + max(y, 0.0)) * 0.8;
            float n = fbm(q * 1.2 + vec2(uTime * 0.012, uTime * 0.005));
            float n2 = fbm(q * 3.1 - vec2(uTime * 0.02, 0.0));
            float c = smoothstep(0.38, 0.86, n * 0.75 + n2 * 0.35) * smoothstep(0.04, 0.3, y);
            col = mix(col, vec3(0.085, 0.065, 0.12) * (0.7 + 0.6 * n2), c * 0.85);
            // the rift: a long tear across the sky, magenta at its lips, white in its heart
            vec3 N = normalize(vec3(0.92, 0.18, 0.34));
            float along = atan(d.z, d.x);
            float wid = 0.025 + 0.05 * fbm(vec2(along * 3.0, uTime * 0.03));
            float k = abs(dot(d, N));
            float lip = exp(-k / (wid * 1.1)) * smoothstep(0.08, 0.4, y);
            float core = exp(-k / (wid * 0.22)) * smoothstep(0.12, 0.45, y);
            col += vec3(0.62, 0.1, 0.36) * lip * 0.42 + vec3(1.0, 0.82, 0.92) * core * 0.75;
            // the clouds catch the flashes, strongest around the bolt
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.15 + 0.9 * c) * vec3(0.72, 0.74, 1.0) * (0.35 + 1.3 * near);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    m.renderOrder = -9;
    m.frustumCulled = false;
    wx.add(m);
    SKY.dome = m;
    // the sea of clouds below: the storm seen from above, lit from inside
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
            vec3 col = mix(vec3(0.05, 0.036, 0.08), vec3(0.27, 0.22, 0.36), smoothstep(0.3, 0.82, h));
            col += vec3(0.4, 0.16, 0.36) * 0.12 * smoothstep(0.55, 0.9, n2);
            // a flash inside the clouds, and the wide pulse of the strike
            float dd = length(vW.xz - uFP.xy);
            col += vec3(0.62, 0.64, 1.0) * uFP.z * exp(-dd / 70.0) * (0.4 + h) * 1.4;
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

  // ---------- lightning: jagged cross-ribbons, a white core in a violet halo ----------
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
      const core = mk('#e8e4ff', 3, 1);
      const halo = mk('#8a6aff', 1.2, 0.3);
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
    Bo.core.material.color.set(opt.pink ? '#ffd0e4' : '#e8e4ff').multiplyScalar(3);
    Bo.halo.material.color.set(opt.pink ? '#ff4a8a' : '#8a6aff').multiplyScalar(1.2);
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
  // the storm keeps striking below and around (each screen its own: it is only weather)
  let stormT = 2;
  let innerT = 1;
  const tickStorm = (dt, me) => {
    stormT -= dt;
    innerT -= dt;
    const cy = O.y - 32;
    if (innerT <= 0) {
      // a flash inside the clouds, no bolt
      innerT = 1.2 + Math.random() * 3;
      const a = Math.random() * TAU;
      const d = 60 + Math.random() * 300;
      SH.fp.value.set(me.x + Math.sin(a) * d, me.z + Math.cos(a) * d, 0.6 + Math.random() * 0.6);
    }
    if (stormT <= 0) {
      stormT = 5 + Math.random() * 7;
      const a = Math.random() * TAU;
      const d = 90 + Math.random() * 220;
      const x = me.x + Math.sin(a) * d;
      const z = me.z + Math.cos(a) * d;
      const up = Math.random() < 0.5;
      // up from the clouds into the rift, or down from the storm ceiling into the clouds
      const p0 = V3(x, cy - 4, z);
      const p1 = V3(x + (Math.random() - 0.5) * 60, O.y + 120 + Math.random() * 80, z + (Math.random() - 0.5) * 60);
      bolt(up ? p0 : p1, up ? p1 : p0, { w: 0.6, life: 0.6, flash: 0.5 + Math.random() * 0.5 });
      SH.fp.value.set(x, z, 1.4);
      AU.thunder(d);
    }
  };

  // ---------- the Joker: a giant glitching card and a porcelain mask ----------
  const JOKER = {};
  const makeJoker = () => {
    const g = new THREE.Group();
    root.add(g);
    const U = { map: { value: Tex.card('J', '') }, uTime: { value: 0 }, uGlitch: { value: 0.4 }, uAlpha: { value: 1 } };
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 9.8),
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform sampler2D map; uniform float uTime, uGlitch, uAlpha; varying vec2 vUv;
          float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec2 uv = vUv;
            float row = floor(uv.y * 36.0);
            float g = step(1.0 - uGlitch * 0.45, h(vec2(row, floor(uTime * 18.0))));
            uv.x += (h(vec2(row * 1.3, floor(uTime * 26.0))) - 0.5) * 0.18 * g;
            if (uv.x < 0.0 || uv.x > 1.0) discard;
            float ca = 0.004 + uGlitch * 0.025;
            vec4 c = texture2D(map, uv);
            c.r = texture2D(map, uv + vec2(ca, 0.0)).r;
            c.b = texture2D(map, uv - vec2(ca, 0.0)).b;
            vec3 col = c.rgb * (0.5 + 0.07 * sin(vUv.y * 640.0 + uTime * 9.0));
            float red = smoothstep(0.15, 0.5, c.r - c.g);
            col += vec3(1.0, 0.08, 0.18) * red * (0.7 + 0.3 * sin(uTime * 3.0));
            float flick = 1.0 - g * 0.35 - step(0.985, h(vec2(floor(uTime * 12.0), 7.0))) * uGlitch;
            gl_FragColor = vec4(col, c.a * uAlpha * flick);
          }`,
      }),
    );
    card.renderOrder = 4;
    g.add(card);
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.25), new THREE.MeshBasicMaterial({ map: T.mask, transparent: true, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }));
    mask.material.color.setScalar(0.85);
    mask.position.set(0, 0.6, 0.35);
    mask.renderOrder = 5;
    g.add(mask);
    // its eyes burn when it speaks
    const eyes = [-1, 1].map((s) => {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#ff2a5a').multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
      e.position.set(s * 0.45, 0.85, 0.4);
      e.renderOrder = 6;
      g.add(e);
      return e;
    });
    // a ring of small cards turning around him
    const ring = [];
    const back = new THREE.MeshBasicMaterial({ map: Cards.backTexture(), side: THREE.DoubleSide, toneMapped: false, fog: false });
    back.color.setScalar(0.7);
    const geo = new THREE.PlaneGeometry(1.0, 1.4);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(geo, back);
      g.add(m);
      ring.push(m);
    }
    Object.assign(JOKER, { g, U, card, mask, eyes, ring, at: V3(), talk: 0, k: 0 });
  };

  // ---------- small builders ----------
  const lp = (x0, z0, ry, lx, lz) => [x0 + lx * Math.cos(ry) + lz * Math.sin(ry), z0 - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const signs = [];
  const sign = (text, sub, x, y, z, ry, w = 2.6, red = false) => {
    const map = signTex(text, sub, red);
    // a little self-lit, so the gold reads in the storm light
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.32 }));
    m.position.copy(P(x, y, z));
    m.rotation.y = ry;
    root.add(m);
    signs.push(m);
    // a dark board behind it
    put('dark', G.box, x - Math.sin(ry) * 0.05, y, z - Math.cos(ry) * 0.05, [0, ry, 0], [w + 0.12, w / 4 + 0.12, 0.06]);
    return m;
  };
  const lamps = [];
  // a hanging lantern: iron cage + glowing glass; some carry a real light (pooled, see LIGHTS)
  const lantern = (x, y, z, light) => {
    box('iron', x, y + 0.42, z, 0.36, 0.06, 0.36);
    box('iron', x, y - 0.34, z, 0.32, 0.06, 0.32);
    put('lamp', G.lampGlass, x, y, z);
    box('iron', x, y + 0.9, z, 0.03, 0.9, 0.03);
    lamps.push(P(x, y, z));
    if (light) LIGHTS.push({ p: P(x, y - 0.3, z), c: new THREE.Color(light.c || '#ffb870'), i: light.i || 1.4, d: light.d || 18 });
  };
  const lampPost = (x, y, z, light) => {
    box('iron', x, y + 1.6, z, 0.12, 3.2, 0.12);
    box('stone', x, y + 0.15, z, 0.5, 0.3, 0.5);
    box('iron', x, y + 3.2, z, 0.7, 0.06, 0.06);
    lantern(x + 0.3, y + 2.6, z, light);
  };
  const column = (x, y, z, h = 6.2) => {
    box('stone', x, y + 0.25, z, 1.1, 0.5, 1.1);
    put('plaster', G.shaft, x, y + 0.5 + (h - 1) / 2, z, null, [1, h - 1, 1]);
    box('stone', x, y + h - 0.3, z, 1.0, 0.4, 1.0);
    box('stone', x, y + h - 0.05, z, 1.2, 0.14, 1.2);
    K.collider(x, y + h / 2, z, 0.8, h, 0.8);
  };
  // an invisible wall (keeps you on the causeway)
  const wall = (x, y, z, sx, sy, sz) => K.collider(x, y + sy / 2, z, sx, sy, sz);
  // a low balustrade with a stone rail (and a taller invisible wall)
  const balustrade = (x0, z0, x1, z1, y) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const sx = alongX ? len : 0.3;
    const sz = alongX ? 0.3 : len;
    box('stone', cx, y + 0.95, cz, sx + (alongX ? 0 : 0.1), 0.14, sz + (alongX ? 0.1 : 0));
    box('stone', cx, y + 0.06, cz, sx, 0.12, sz);
    const n = Math.max(2, Math.round(len / 0.42));
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      put('plaster', G.baluster, x0 + (x1 - x0) * k, y + 0.5, z0 + (z1 - z0) * k);
    }
    wall(cx, y, cz, alongX ? len : 0.4, 3.2, alongX ? 0.4 : len);
  };
  // a sloped canvas hung at (x, y, z), reaching d toward the front (local -z of ry), its
  // scalloped edge hanging toward the passers-by
  const awning = (k, x, y, z, ry, w, d, tilt = 0.38) => {
    const g = G.awn.clone().scale(w, 1, d).rotateX(-tilt).rotateY(ry);
    const [ax, az] = lp(x, z, ry, 0, (-d / 2) * Math.cos(tilt));
    bat(k).add(g, P(ax, y - (d / 2) * Math.sin(tilt), az));
    g.dispose();
  };
  // a market stall against a wall (front toward the aisle), its wares and its sign
  const stall = (x, y, z, ry, text, sub, red, seed) => {
    const r = rng(seed);
    // local +z is the back of the stall (the wall), local -z its front (the aisle)
    const L = (lx, lz) => lp(x, z, ry, lx, lz);
    const ax2 = Math.abs(Math.cos(ry)) > 0.5;
    let [px, pz] = L(0, 0.55);
    put('wood', G.box, px, y + 0.5, pz, [0, ry, 0], [3, 1, 1]);
    K.collider(px, y + 0.5, pz, ax2 ? 3 : 1, 1, ax2 ? 1 : 3);
    [px, pz] = L(0, 1.25);
    put(red ? 'wine' : 'plaster', G.box, px, y + 1.4, pz, [0, ry, 0], [3.2, 2.8, 0.15]);
    [-1.45, 1.45].forEach((s) => {
      const [qx, qz] = L(s, -0.05);
      box('iron', qx, y + 1.35, qz, 0.08, 2.7, 0.08);
    });
    const [ax, az] = L(0, 1.2);
    awning(red ? 'awnR' : 'awnB', ax, y + 2.95, az, ry, 3.4, 1.9);
    const [sx, sz] = L(0, 1.15);
    sign(text, sub, sx, y + 3.25, sz, ry + Math.PI, 2.4, red);
    // wares: decks, chips, dice
    for (let i = 0; i < 7; i++) {
      const [wx2, wz2] = L(-1.2 + r() * 2.4, 0.3 + r() * 0.5);
      const kind = r();
      if (kind < 0.4) box('cards', wx2, y + 1.04 + 0.04, wz2, 0.18, 0.08 + r() * 0.1, 0.26, [0, r() * 3, 0]);
      else if (kind < 0.75) put(r() < 0.5 ? 'chipR' : 'chipK', G.chip, wx2, y + 1.0 + 0.06, wz2, null, [1, 1 + Math.floor(r() * 4), 1]);
      else box('porcelain', wx2, y + 1.06, wz2, 0.14, 0.14, 0.14, [0, r() * 3, 0]);
    }
  };

  // ---------- interactive pieces (animated from ST in update) ----------
  const plates = {};
  let portal = null;
  const gates = {};
  const booth = [];
  const levers = {};
  const clocks = {};
  let freeCard = null;
  let wall3 = null;
  let door3 = null;
  let curtain4 = null;
  const lect = {};
  let key = null;
  const seals = [];
  const leaves = [];
  let card = null;
  let screen = null;
  const LIGHTS = [];
  const pool = [];
  let cards = null;
  let skiff = null;

  const makePlate = (who, x, y, z) => {
    box('stone', x, y + 0.08, z, 2.4, 0.16, 2.4);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40).rotateX(-Math.PI / 2).rotateY(Math.PI), M.non);
    top.position.copy(P(x, y + 0.17, z));
    root.add(top);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.2, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(1.4), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    ring.position.copy(P(x, y + 0.18, z));
    root.add(ring);
    plates[who] = { top, ring, k: 0 };
  };
  const portalMat = () =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: SH.time, uK: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime, uK; varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5; p.y *= 1.45;
          float r = length(p); float a = atan(p.y, p.x);
          float s = sin(a * 5.0 + r * 22.0 - uTime * 3.2) * 0.5 + 0.5;
          float s2 = sin(a * 3.0 - r * 14.0 + uTime * 2.1) * 0.5 + 0.5;
          vec3 c = mix(vec3(0.85, 0.06, 0.32), vec3(1.0, 0.78, 0.32), s * s2);
          c *= (1.25 - r * 1.7);
          c += vec3(1.0, 0.9, 0.95) * smoothstep(0.1, 0.0, r);
          float scan = 0.85 + 0.15 * sin(vUv.y * 300.0 + uTime * 20.0);
          float al = smoothstep(0.52, 0.3, r) * uK * scan;
          gl_FragColor = vec4(c * 1.3, al);
        }`,
    });
  const glitchWallMat = () =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: SH.time, map: { value: Tex.card('J', '') }, uK: { value: 1 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime, uK; uniform sampler2D map; varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 uv = vUv * vec2(4.6, 1.0);
          float row = floor(vUv.y * 48.0);
          float g = step(0.82, h(vec2(row, floor(uTime * 14.0))));
          uv.x += (h(vec2(row * 1.7, floor(uTime * 22.0))) - 0.5) * 0.6 * g + uTime * 0.05;
          vec4 c = texture2D(map, fract(uv));
          vec3 col = mix(vec3(0.03, 0.01, 0.055), c.rgb * 0.3, 0.38);
          float red = smoothstep(0.15, 0.5, c.r - c.g);
          col += vec3(0.95, 0.05, 0.22) * red * 0.55;
          col += vec3(0.5, 0.3, 0.8) * g * 0.25;
          float edge = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          gl_FragColor = vec4(col, (0.93 - g * 0.2) * edge * uK);
        }`,
    });
  // a booth of La Preuve: walls, roof, curtain, cord, number; a heart or a Joker box inside
  const makeBooth = (b) => {
    const ry = b.a;
    const L = (lx, lz) => lp(b.x, b.z, ry, lx, lz);
    const y = Y2;
    let [x, z] = L(0, 0);
    // walls and roof are batched (rotated boxes)
    put('stone', G.box, x, y + 0.1, z, [0, ry, 0], [3, 0.2, 2.8]);
    [x, z] = L(0, 1.25);
    put('plaster', G.box, x, y + 1.6, z, [0, ry, 0], [3, 3.2, 0.18]);
    [-1.45, 1.45].forEach((s) => {
      const [sx, sz] = L(s, 0.05);
      put('wine', G.box, sx, y + 1.6, sz, [0, ry, 0], [0.18, 3.2, 2.5]);
      const [cx, cz] = L(s, -1.2);
      put('iron', G.box, cx, y + 1.6, cz, [0, ry, 0], [0.16, 3.2, 0.16]);
    });
    [x, z] = L(0, 0.05);
    put('wood', G.box, x, y + 3.28, z, [0, ry, 0], [3.3, 0.16, 2.9]);
    const [ax, az] = L(0, -1.3);
    awning('awnR', ax, y + 3.36, az, ry, 3.3, 1.1, 0.5);
    // colliders: the back and the sides (approximate boxes around the rotated booth)
    [x, z] = L(0, 0.4);
    K.collider(x, y + 1.6, z, 2.2, 3.2, 2.2);
    // the curtain: hangs from the top, rises when pulled
    const cur = new THREE.Group();
    [x, z] = L(0, -1.22);
    cur.position.copy(P(x, y + 3.05, z));
    cur.rotation.y = ry;
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.95).translate(0, -1.475, 0), M.velvet);
    cm.rotation.y = Math.PI;
    cur.add(cm);
    root.add(cur);
    // the cord and its tassel
    const cord = new THREE.Group();
    [x, z] = L(1.25, -1.35);
    cord.position.copy(P(x, y + 2.9, z));
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6).translate(0, -0.75, 0), M.brass);
    const tas = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M.brass);
    tas.position.y = -1.55;
    cord.add(rope, tas);
    root.add(cord);
    // the number over the curtain
    const [nx, nz] = L(0, -1.32);
    const num = sign(ROMAN[b.i], null, nx, y + 3.55, nz, ry + Math.PI, 1.0);
    void num;
    // inside: a pedestal with the prize
    [x, z] = L(0, 0.35);
    put('stone', G.box, x, y + 0.55, z, [0, ry, 0], [0.7, 0.9, 0.7]);
    const heart = new THREE.Mesh(G.heart, M.rose);
    heart.position.copy(P(x, y + 1.35, z));
    heart.visible = false;
    root.add(heart);
    // the Joker in his box: a mask on a spring
    const jack = new THREE.Group();
    jack.position.copy(P(x, y + 1.0, z));
    jack.rotation.y = ry + Math.PI;
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 10, 1, true), M.iron);
    spring.position.y = 0.5;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshBasicMaterial({ map: T.mask, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    face.position.y = 1.1;
    jack.add(spring, face);
    jack.visible = false;
    root.add(jack);
    // per screen: the Joker's « proof » (a card behind the curtain), his face peeking, a heart glow
    const proof = LvKit.card('10', '♥', true);
    const [px2, pz2] = L(0, -0.5);
    proof.position.copy(P(px2, y + 1.05, pz2));
    proof.rotation.y = ry + Math.PI;
    root.add(proof);
    const [gx, gz] = L(0, -1.3);
    const peek = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshBasicMaterial({ map: T.mask, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color('#ff8aa0') }));
    peek.position.copy(P(gx, y + 1.9, gz));
    peek.rotation.y = ry + Math.PI;
    peek.visible = false;
    root.add(peek);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: T.heart, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color('#ff9ab8').multiplyScalar(1.4) }));
    glow.position.copy(P(gx, y + 1.7, gz));
    glow.rotation.y = ry + Math.PI;
    glow.visible = false;
    root.add(glow);
    booth[b.i] = { cur, cord, heart, jack, proof, peek, glow, open: 0, pull: 0, pop: 0 };
  };
  // a lever on a desk whose top is at y
  const makeLever = (id, x, y, z, take) => {
    box('iron', x, y + 0.12, z, 0.36, 0.24, 0.36);
    box('brass', x, y + 0.25, z, 0.42, 0.04, 0.42);
    const pv = new THREE.Group();
    pv.position.copy(P(x, y + 0.27, z));
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8).translate(0, 0.45, 0), M.iron);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), take ? M.brass : M.rose);
    knob.position.y = 0.92;
    pv.add(arm, knob);
    root.add(pv);
    levers[id] = { pv, k: 0 };
  };
  const makeClock = (who, x, y, z) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    g.rotation.y = Math.PI;
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ map: T.dialOff, toneMapped: false }));
    face.material.color.setScalar(0.85);
    face.position.z = 0.02;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.09, 8, 48), M.brass);
    const hand = new THREE.Group();
    hand.position.z = 0.06;
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.45, 0.03).translate(0, 0.62, 0), M.dark);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12).rotateX(Math.PI / 2), M.brass);
    hand.add(hm, hub);
    g.add(face, rim, hand);
    root.add(g);
    hand.visible = false;
    clocks[who] = { g, face, hand, mode: 'off' };
  };
  const makeKey = (x, y, z) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 24), M.brass);
    bow.position.y = 0.55;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), M.brass);
    shaft.position.y = -0.1;
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.05), M.brass);
    bit.position.set(0.12, -0.45, 0);
    const bit2 = bit.clone();
    bit2.position.set(0.1, -0.3, 0);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#ffd27a').multiplyScalar(1.1), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    g.add(bow, shaft, bit, bit2, halo);
    root.add(g);
    key = { g, halo, k: 1 };
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
    G.shaft = new THREE.CylinderGeometry(0.36, 0.42, 1, 18);
    G.baluster = new THREE.CylinderGeometry(0.07, 0.11, 0.8, 8);
    G.chip = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12);
    G.lampGlass = new THREE.BoxGeometry(0.26, 0.6, 0.26);
    G.awn = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2);
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.32);
    hs.bezierCurveTo(-0.95, 0.25, -0.45, 0.95, 0, 0.42);
    hs.bezierCurveTo(0.45, 0.95, 0.95, 0.25, 0, -0.32);
    G.heart = new THREE.ExtrudeGeometry(hs, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 }).translate(0, 0, -0.09).scale(0.5, 0.5, 0.5);
    for (let i = 0; i < 5; i++) rockGeos.push(rockGeo(101 + i * 17));
    makeSky();
    makeBolts();
    makeJoker();

    // ===== the quay: where the Capitaine's skiff dropped you =====
    slab(0, 0, 5, 18, 26, { depth: 26, seed: 3 });
    balustrade(-9, -8, 9, -8, 0);
    balustrade(-9, -8, -9, 18, 0);
    balustrade(9, -8, 9, 18, 0);
    // the skiff, moored at the gap of the quay's left side
    skiff = new THREE.Group();
    skiff.position.copy(P(-12.5, 0.1, 4.5));
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), M.porcelain);
    hull.scale.set(1.5, 1.1, 4.6);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 20), M.wood);
    deck.scale.set(1, 1, 3.05);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), M.wine);
    seat.position.set(0, 0.3, -1.2);
    const seat2 = seat.clone();
    seat2.position.z = 1.4;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 8), M.brass);
    mast.position.set(0, 1.6, 0.2);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 4), M.wine);
    fin.rotation.x = Math.PI / 2;
    fin.position.set(0, 0.2, -4.6);
    skiff.add(hull, deck, seat, seat2, mast, fin);
    root.add(skiff);
    lampPost(-7.5, 0, -6, { i: 1.3, d: 20 });
    lampPost(7.5, 0, -6);
    lampPost(-7.5, 0, 14);
    lampPost(7.5, 0, 14, { i: 1.2, d: 20 });
    // the gate of the market: two pylons, a banner, two giant cards leaning on them
    [-1, 1].forEach((s) => {
      box('stone', s * 8.6, 4.5, 18.5, 1.8, 9, 1.8);
      box('plaster', s * 8.6, 9.2, 18.5, 2.2, 0.4, 2.2);
      K.collider(s * 8.6, 4.5, 18.5, 1.8, 9, 1.8);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.8), new THREE.MeshStandardMaterial({ map: s < 0 ? Tex.card('A', '♥') : Tex.card('J', ''), roughness: 0.5, side: THREE.DoubleSide }));
      c.position.copy(P(s * 6.9, 2.3, 17.2));
      c.rotation.set(0, s * 0.25, s * 0.12);
      root.add(c);
    });
    box('iron', 0, 8.1, 18.5, 15.6, 0.3, 0.3);
    sign('Le Marché', 'Raccourcis · Faveurs · Réponses', 0, 7.1, 18.3, Math.PI, 7, true);
    screen = makeScreen(5.2, 2.0, 1024);
    screen.mesh.position.copy(P(0, 4.6, 18.2));
    screen.mesh.rotation.y = Math.PI;
    root.add(screen.mesh);

    // ===== station 1, Le Raccourci: the hall =====
    slab(0, 0, 40, 16, 44, { depth: 22, seed: 5 });
    for (let z = 21; z <= 58; z += 6) [-1, 1].forEach((s) => column(s * 7.4, 0, z));
    for (let z = 21; z < 57; z += 6) [-1, 1].forEach((s) => balustrade(s * 7.6, z + 0.6, s * 7.6, z + 5.4, 0));
    // iron arches and the torn glass roof
    for (let z = 21; z <= 57; z += 6) {
      put('iron', G.arch || (G.arch = new THREE.TorusGeometry(7.4, 0.14, 6, 32, Math.PI)), 0, 6.2, z, null, [1, 0.45, 1]);
      box('iron', 0, 9.5, z, 0.2, 0.2, 0.2);
    }
    box('iron', 0, 9.53, 39, 0.16, 0.16, 36);
    [-1, 1].forEach((s) => box('iron', s * 3.7, 7.88, 39, 0.1, 0.1, 36, [0, 0, -s * 0.42]));
    let bay = 0;
    for (let z = 24; z <= 54; z += 6, bay++)
      [-1, 1].forEach((s) => {
        // a few panes are gone: the storm shows through
        if ((bay === 2 && s < 0) || (bay === 4 && s > 0) || bay === 5) return;
        box('glass', s * 3.7, 7.88, z, 8.1, 0.04, 5.8, [0, 0, -s * 0.42]);
      });
    // lanterns under the arches
    for (let z = 24; z <= 54; z += 12) lantern(0, 6.6, z, z === 36 || z === 48 ? { i: 1.5, d: 20 } : null);
    // the stalls of shortcuts, both sides
    stall(-6.2, 0, 24, -Math.PI / 2, 'Passer devant', 'sans faire la queue', true, 11);
    stall(6.2, 0, 24, Math.PI / 2, 'Une carte gratuite', 'une seule par client', false, 12);
    stall(-6.2, 0, 30, -Math.PI / 2, 'Sans attendre', 'tout, tout de suite', false, 13);
    stall(6.2, 0, 30, Math.PI / 2, 'La réponse', 'avant la question', true, 14);
    stall(-6.2, 0, 54, -Math.PI / 2, 'Sauter la partie', 'pourquoi jouer', false, 15);
    stall(6.2, 0, 54, Math.PI / 2, 'Gagner sans jouer', 'garanti', true, 16);
    [-1, 1].forEach((s) => wall(s * 7.9, 0, 39.5, 0.3, 4, 43));
    // the Joker's door: a dais, a frame, the swirl « pour un seul »
    box('stone', 0, 0.15, 47.2, 6, 0.3, 3.6);
    K.collider(0, 0.15, 47.2, 6, 0.3, 3.6);
    [-1, 1].forEach((s) => {
      box('iron', s * 1.35, 2.15, 47.2, 0.24, 4.0, 0.3);
      K.collider(s * 1.35, 2.15, 47.2, 0.3, 4.0, 0.4);
    });
    box('iron', 0, 4.2, 47.2, 3.0, 0.3, 0.3);
    portal = new THREE.Mesh(new THREE.PlaneGeometry(2.46, 3.7), portalMat());
    portal.position.copy(P(0, 2.15, 47.2));
    portal.rotation.y = Math.PI;
    portal.renderOrder = 3;
    root.add(portal);
    sign('Une porte · un seul', 'tout droit à la Cour', 0, 5.0, 47.05, Math.PI, 3.2, true);
    makePlate('dame', PLATES1.dame[0], 0, PLATES1.dame[1]);
    makePlate('valet', PLATES1.valet[0], 0, PLATES1.valet[1]);
    LIGHTS.push({ p: P(0, 2.4, 45.8), c: new THREE.Color('#ff3a7a'), i: 1.6, d: 14, portal: true });
    // the gate at the end of the hall
    {
      const g = LvKit.batch();
      for (let x = -7; x <= 7.01; x += 0.5) g.add(G.box, V3(x, 2.6, 0), null, [0.07, 5.2, 0.07]);
      [0.4, 2.6, 4.8].forEach((y) => g.add(G.box, V3(0, y, 0), null, [14.4, 0.12, 0.1]));
      const m = g.mesh(M.iron);
      m.position.copy(P(0, 0, GATE1_Z));
      root.add(m);
      gates.g1 = { m, b: K.collider(0, 3, GATE1_Z, 15, 6, 0.6), y: 0, k: 0 };
    }

    // ===== the alley of stalls: islands, three stepping slabs, stairs up to the place =====
    slab(0, 0, 67.5, 8, 13, { depth: 16, seed: 21 });
    slab(0, 0.5, 79, 5.2, 5, { depth: 9, seed: 22 });
    slab(1.2, 1.0, 86.5, 5.2, 5, { depth: 10, seed: 23 });
    slab(0, 1.5, 97.75, 8, 12.5, { depth: 14, seed: 24 });
    [-1, 1].forEach((s) => {
      balustrade(s * 4, 61.3, s * 4, 74, 0);
      balustrade(s * 4, 91.5, s * 4, 104, 1.5);
    });
    for (let i = 0; i < 5; i++) {
      const y = 1.5 + (i + 1) * 0.3;
      const z = 104.6 + i * 1.1;
      box('stone', 0, (1.5 + y) / 2, z, 5.4, y - 1.5, 1.1);
      K.collider(0, (1.5 + y) / 2, z, 5.4, y - 1.5 + 0.01, 1.1);
    }
    slab(0, Y2, 112, 6, 5, { depth: 10, seed: 25 });
    [-1, 1].forEach((s) => wall(s * 3.1, 1.5, 107.5, 0.3, 4.5, 8));
    stall(-2.8, 1.5, 96, -Math.PI / 2, 'Un raccourci', 'par ici', true, 31);
    stall(2.8, 1.5, 100, Math.PI / 2, 'Une faveur', 'à rendre plus tard', false, 32);
    lampPost(-3.6, 0, 64, { i: 1.2, d: 18 });
    lampPost(3.6, 1.5, 93, { i: 1.2, d: 18 });

    // ===== station 2, La Preuve: the round place and its four booths =====
    {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(PLAZA.r, PLAZA.r, 0.5, 64), M.floor);
      disc.position.copy(P(0, Y2 - 0.25, PLAZA.z));
      root.add(disc);
      const kerb = new THREE.Mesh(new THREE.CylinderGeometry(PLAZA.r + 0.3, PLAZA.r + 0.3, 0.62, 64, 1, true), M.stone);
      kerb.position.copy(P(0, Y2 - 0.3, PLAZA.z));
      root.add(kerb);
      put('rock', rockGeos[2], 0, Y2 - 0.55, PLAZA.z, [0, 1.3, 0], [PLAZA.r * 2.1, 30, PLAZA.r * 2.1]);
      K.collider(0, Y2 - 0.25, PLAZA.z, 28, 0.5, 12);
      K.collider(0, Y2 - 0.25, PLAZA.z, 20, 0.5, 20);
      K.collider(0, Y2 - 0.25, PLAZA.z, 12, 0.5, 28);
      // the rim: a balustrade of short segments, open at the way in and the way out
      const n = 40;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU;
        const a1 = ((i + 1) / n) * TAU;
        const am = (a0 + a1) / 2;
        const out = Math.abs(Math.atan2(Math.sin(am), Math.cos(am))) < 0.23 || Math.abs(Math.atan2(Math.sin(am - Math.PI), Math.cos(am - Math.PI))) < 0.23;
        if (out) continue;
        const r = PLAZA.r - 0.2;
        const x0 = Math.sin(a0) * r;
        const z0 = PLAZA.z + Math.cos(a0) * r;
        const x1 = Math.sin(a1) * r;
        const z1 = PLAZA.z + Math.cos(a1) * r;
        const xm = Math.sin(am) * r;
        const zm = PLAZA.z + Math.cos(am) * r;
        const len = Math.hypot(x1 - x0, z1 - z0);
        put('stone', G.box, xm, Y2 + 0.95, zm, [0, am, 0], [len + 0.05, 0.14, 0.3]);
        put('stone', G.box, xm, Y2 + 0.06, zm, [0, am, 0], [len, 0.12, 0.3]);
        put('plaster', G.baluster, xm, Y2 + 0.5, zm);
        put('plaster', G.baluster, (x0 + xm) / 2, Y2 + 0.5, (z0 + zm) / 2);
        const wr = PLAZA.r + 0.2;
        K.collider(Math.sin(am) * wr, Y2 + 1.6, PLAZA.z + Math.cos(am) * wr, 2.6, 3.2, 2.6);
      }
      // the barker's podium in the middle, lanterns on four posts
      put('stone', new THREE.CylinderGeometry(1.6, 1.9, 0.6, 24), 0, Y2 + 0.3, PLAZA.z);
      K.collider(0, Y2 + 0.3, PLAZA.z, 2.6, 0.6, 2.6);
      [
        [-9, 119],
        [9, 119],
      ].forEach(([x, z]) => lampPost(x, Y2, z, { i: 1.3, d: 22 }));
      lantern(0, Y2 + 4.6, PLAZA.z - 0.4, { i: 1.2, d: 16, c: '#ffcf90' });
      put('iron', G.box, 0, Y2 + 5.5, PLAZA.z - 0.4, null, [0.05, 1.8, 0.05]);
      BOOTHS.forEach(makeBooth);
      sign('La Preuve', 'un cœur, trois mensonges', 0, Y2 + 2.2, PLAZA.z - 1.62, Math.PI, 2.6, true);
      // the gate out (north) and the walk to the loges
      const g = LvKit.batch();
      for (let x = -2.75; x <= 2.76; x += 0.5) g.add(G.box, V3(x, 2.2, 0), null, [0.07, 4.4, 0.07]);
      [0.4, 2.2, 4.0].forEach((y) => g.add(G.box, V3(0, y, 0), null, [5.8, 0.1, 0.1]));
      const m = g.mesh(M.iron);
      m.position.copy(P(0, Y2, GATE2_Z));
      root.add(m);
      gates.g2 = { m, b: K.collider(0, Y2 + 2.5, GATE2_Z, 6.2, 5, 0.5), y: 0, k: 0 };
      [-1, 1].forEach((s) => {
        box('stone', s * 3.5, Y2 + 2.6, GATE2_Z, 1.0, 5.2, 1.0);
        K.collider(s * 3.5, Y2 + 2.6, GATE2_Z, 1.0, 5.2, 1.0);
      });
      slab(0, Y2, 151, 6, 19, { depth: 12, seed: 41 });
      [-1, 1].forEach((s) => balustrade(s * 3, 142.4, s * 3, 160, Y2));
    }

    // ===== station 3, Les Loges: a long room cut in two =====
    {
      const z0 = 160;
      const z1 = 206;
      slab(0, Y2, (z0 + z1) / 2, 20, z1 - z0, { depth: 22, seed: 51 });
      // outer walls, open to the sky
      [-1, 1].forEach((s) => {
        box('plaster', s * 10.1, Y2 + 4.5, (z0 + z1) / 2, 0.4, 9, z1 - z0);
        box('stone', s * 10.1, Y2 + 9.1, (z0 + z1) / 2, 0.7, 0.3, z1 - z0 + 0.4);
        K.collider(s * 10.1, Y2 + 4.5, (z0 + z1) / 2, 0.4, 9, z1 - z0);
        // the front wall either side of the way in
        box('plaster', s * 6.6, Y2 + 4.5, z0, 6.8, 9, 0.4);
        K.collider(s * 6.6, Y2 + 4.5, z0, 6.8, 9, 0.4);
        // the far wall either side of the door
        box('plaster', s * 6.3, Y2 + 4.5, z1, 7.4, 9, 0.4);
        K.collider(s * 6.3, Y2 + 4.5, z1, 7.4, 9, 0.4);
        // pilasters
        for (let z = z0 + 6; z < z1; z += 8) box('stone', s * 9.75, Y2 + 4.5, z, 0.4, 9, 0.8);
      });
      box('plaster', 0, Y2 + 7.5, z0, 6.4, 3, 0.4);
      box('plaster', 0, Y2 + 7.5, z1, 5.2, 3, 0.4);
      box('stone', 0, Y2 + 6.1, z1 - 0.3, 5.6, 0.3, 0.4);
      sign('Les Loges', 'chacun la sienne', 0, Y2 + 7.6, z0 - 0.25, Math.PI, 3.4, true);
      // the wall between the two loges (it sinks when you have won)
      wall3 = { g: new THREE.Group(), b: null, k: 0 };
      const pw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 40), M.plaster);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 40.4), M.stone);
      cap.position.y = 4.6;
      wall3.g.add(pw, cap);
      // giant cards in relief on both faces
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 3; i++) {
          const c = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.5), new THREE.MeshStandardMaterial({ map: Cards.backTexture(), roughness: 0.6 }));
          c.material.color.setScalar(0.75);
          c.position.set(s * 0.27, 0.2, -12 + i * 12);
          c.rotation.y = s * Math.PI / 2;
          wall3.g.add(c);
        }
      });
      wall3.g.position.copy(P(0, Y2 + 4.5, 186));
      root.add(wall3.g);
      wall3.b = K.collider(0, Y2 + 4.5, 186, 0.5, 9, 40);
      // the loges' doors from the shared antechamber: an arch each, its owner's name above
      [
        ['dame', -1],
        ['valet', 1],
      ].forEach(([who, s]) => {
        box('stone', s * 2.0, Y2 + 2.6, 166.2, 0.6, 5.2, 0.6);
        box('stone', s * 8.2, Y2 + 2.6, 166.2, 0.6, 5.2, 0.6);
        box('stone', s * 5.1, Y2 + 5.35, 166.2, 6.8, 0.5, 0.7);
        sign('Loge de ' + Story.name(who), who === 'dame' ? '♥' : '♠', s * 5.1, Y2 + 6.15, 165.8, Math.PI, 3.0, who === 'dame');
        // the lectern and its two levers, the free card over « Prendre »
        const L = LEVERS3[who];
        const dz = L.non[1] + 1.2;
        box('wood', s * 5, Y2 + 0.45, dz, 4.2, 0.9, 0.9);
        K.collider(s * 5, Y2 + 0.45, dz, 4.2, 0.9, 0.9);
        makeLever(who + '_take', L.take[0], Y2 + 0.9, dz, true);
        makeLever(who + '_non', L.non[0], Y2 + 0.9, dz, false);
        sign('Prendre', null, L.take[0], Y2 + 0.55, dz - 0.47, Math.PI, 1.0, false);
        sign('Non', null, L.non[0], Y2 + 0.55, dz - 0.47, Math.PI, 1.0, true);
        makeClock(who, CLOCK3[who][0], Y2 + 5.4, CLOCK3[who][1]);
        lantern(s * 5, Y2 + 7.6, 186, { i: 1.4, d: 22 });
      });
      freeCard = { m: [] };
      ['dame', 'valet'].forEach((who) => {
        const L = LEVERS3[who];
        const c = LvKit.card('10', '♥', true);
        c.position.copy(P(L.take[0], Y2 + 2.7, L.take[1] + 1.2));
        c.visible = true;
        root.add(c);
        freeCard.m.push(c);
      });
      // the far door (slides open)
      door3 = { m: new THREE.Group(), b: K.collider(0, Y2 + 3, z1, 5.2, 6, 0.5), k: 0 };
      [-1, 1].forEach((s) => {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.2), M.iron);
        leaf.position.x = s * 1.25;
        leaf.userData.s = s;
        door3.m.add(leaf);
      });
      door3.m.position.copy(P(0, Y2 + 3, z1));
      root.add(door3.m);
    }

    // ===== the bridge, and the stairs up to the terrace of the door =====
    slab(0, Y2, 222, 4.4, 32, { depth: 10, seed: 61 });
    rockUnder(0, Y2 - 0.6, 214, 4, 8, 14, 62);
    rockUnder(0, Y2 - 0.6, 230, 4, 8, 12, 63);
    [-1, 1].forEach((s) => {
      for (let z = 207; z <= 238; z += 2) box('iron', s * 2.15, Y2 + 0.55, z, 0.06, 1.1, 0.06);
      box('iron', s * 2.15, Y2 + 1.1, 222, 0.08, 0.08, 32);
      wall(s * 2.4, Y2, 222, 0.3, 4, 32);
    });
    for (let z = 210; z <= 236; z += 9) lampPost(z % 2 ? -1.8 : 1.8, Y2, z, z === 228 ? { i: 1.2, d: 18 } : null);
    for (let i = 0; i < 10; i++) {
      const y = Y2 + (i + 1) * 0.3;
      const z = 238.3 + i * 0.6;
      box('stone', 0, (Y2 + y) / 2, z, 4.4, y - Y2, 0.6);
      K.collider(0, (Y2 + y) / 2, z, 4.4, y - Y2 + 0.01, 0.6);
    }
    [-1, 1].forEach((s) => wall(s * 2.4, Y2, 241, 0.3, 7, 6));

    // ===== station 4, La Porte: the terrace, the curtain, the door of the Cour =====
    {
      slab(0, Y4, 263, 32, 38, { depth: 34, seed: 71 });
      balustrade(-16, 244, -16, 282, Y4);
      balustrade(16, 244, 16, 282, Y4);
      balustrade(-16, 244, -2.3, 244, Y4);
      balustrade(2.3, 244, 16, 244, Y4);
      balustrade(-16, 282, -8.6, 282, Y4);
      balustrade(8.6, 282, 16, 282, Y4);
      // the door's frame: two pylons and a lintel; three seals down the seam
      [-1, 1].forEach((s) => {
        box('stone', s * 7.1, Y4 + 10, DOOR_Z, 3, 20, 3);
        K.collider(s * 7.1, Y4 + 10, DOOR_Z, 3, 20, 3);
        box('plaster', s * 7.1, Y4 + 20.3, DOOR_Z, 3.6, 0.6, 3.6);
        lantern(s * 5.0, Y4 + 6, DOOR_Z - 1.8, { i: 1.5, d: 22, c: '#ffc070' });
      });
      box('stone', 0, Y4 + 17.5, DOOR_Z, 11.2, 3, 2.6);
      box('iron', 0, Y4 + 16, DOOR_Z - 0.9, 11.2, 0.2, 0.2);
      [-1, 1].forEach((s) => {
        const pv = new THREE.Group();
        pv.position.copy(P(s * 5.6, Y4, DOOR_Z - 0.2));
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(5.6, 16, 0.5), M.iron);
        leaf.position.set(-s * 2.8, 8, 0);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 14), new THREE.MeshStandardMaterial({ map: Cards.backTexture(), roughness: 0.5, metalness: 0.2 }));
        face.material.color.setScalar(0.7);
        face.position.set(-s * 2.8, 8, -0.26);
        face.rotation.y = Math.PI;
        pv.add(leaf, face);
        root.add(pv);
        leaves.push({ pv, s });
      });
      gates.door = { b: K.collider(0, Y4 + 8, DOOR_Z, 11.2, 16, 0.8), k: 0 };
      for (let i = 0; i < 3; i++) {
        const sm = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ map: T.heart, transparent: true, toneMapped: false, color: new THREE.Color('#3a0a18') }));
        sm.position.copy(P(0, Y4 + 4 + i * 4, DOOR_Z - 0.5));
        sm.rotation.y = Math.PI;
        root.add(sm);
        seals.push({ m: sm, k: 0 });
      }
      // the glitching wall between the two lecterns
      curtain4 = { m: new THREE.Mesh(new THREE.PlaneGeometry(31.4, 9), glitchWallMat()), b: K.collider(0, Y4 + 4.5, 265.85, 0.4, 9, 31.7), k: 1 };
      curtain4.m.position.copy(P(0, Y4 + 4.5, 265.85));
      curtain4.m.rotation.y = Math.PI / 2;
      curtain4.m.renderOrder = 2;
      root.add(curtain4.m);
      box('iron', 0, Y4 + 0.1, 265.85, 0.5, 0.2, 31.8);
      // the lecterns
      ['dame', 'valet'].forEach((who) => {
        const [x, z] = LECT4[who];
        box('stone', x, Y4 + 0.5, z, 1.2, 1.0, 0.9);
        box('brass', x, Y4 + 1.05, z, 1.3, 0.1, 1.0, [-0.3, 0, 0]);
        K.collider(x, Y4 + 0.5, z, 1.2, 1.0, 0.9);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.14, 24), M.non);
        b.position.copy(P(x, Y4 + 1.16, z + 0.05));
        b.rotation.x = -0.3;
        root.add(b);
        lect[who] = { b, k: 0 };
      });
      put('stone', new THREE.CylinderGeometry(0.5, 0.6, 1.1, 16), KEY4[0], Y4 + 0.55, KEY4[1]);
      K.collider(KEY4[0], Y4 + 0.55, KEY4[1], 1.0, 1.1, 1.0);
      makeKey(KEY4[0], Y4 + 1.9, KEY4[1]);
      // the antechamber of the Cour, gold beyond the door
      slab(0, Y4, 293, 14, 22, { depth: 18, seed: 81, mat: 'floor' });
      [-1, 1].forEach((s) => {
        box('stone', s * 7.2, Y4 + 5, 293, 0.6, 10, 22);
        K.collider(s * 7.2, Y4 + 5, 293, 0.6, 10, 22);
      });
      box('stone', 0, Y4 + 5, 304.2, 15, 10, 0.6);
      K.collider(0, Y4 + 5, 304.2, 15, 10, 0.6);
      put('stone', new THREE.CylinderGeometry(1.4, 1.7, 0.5, 24), CARD[0], Y4 + 0.25, CARD[1]);
      LIGHTS.push({ p: P(0, Y4 + 4, 292), c: new THREE.Color('#ffc870'), i: 2.0, d: 24, gold: true });
      // the threshold: columns, a runner, and the gold of the Cour through the far arch
      [-1, 1].forEach((s) => [286, 293, 300].forEach((z) => column(s * 5.9, Y4, z, 7)));
      box('wine', 0, Y4 + 0.02, 293, 2.6, 0.04, 21.6);
      box('brass', -1.35, Y4 + 0.03, 293, 0.08, 0.04, 21.6);
      box('brass', 1.35, Y4 + 0.03, 293, 0.08, 0.04, 21.6);
      box('stone', 0, Y4 + 9.6, 303.6, 7.6, 1.2, 0.8);
      [-1, 1].forEach((s) => box('stone', s * 3.3, Y4 + 4.5, 303.6, 1.0, 9, 0.8));
      const glowArch = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 8.4),
        new THREE.MeshBasicMaterial({ map: T.arch, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color('#ffd9a0').multiplyScalar(1.15) }),
      );
      glowArch.position.copy(P(0, Y4 + 4.2, 303.85));
      glowArch.rotation.y = Math.PI;
      root.add(glowArch);
      box('wine', 0, Y4 + 0.02, 246, 2.6, 0.04, 4);
      // the terrace: lamp posts, four tall columns crowned with cards, two cards at the stairs
      [-1, 1].forEach((s) => {
        lampPost(s * 12, Y4, 255, { i: 1.3, d: 22 });
        lampPost(s * 12, Y4, 275, s < 0 ? { i: 1.2, d: 20 } : null);
        [246.5, 279].forEach((z, i) => {
          column(s * 14.4, Y4, z, 6.5);
          const cd = new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 2.8),
            new THREE.MeshStandardMaterial({ map: i ? Tex.card('K', s < 0 ? '♥' : '♠') : Tex.card('Q', s < 0 ? '♦' : '♣'), roughness: 0.5, side: THREE.DoubleSide }),
          );
          cd.position.copy(P(s * 14.4, Y4 + 8.0, z));
          cd.rotation.y = s * 0.6 + Math.PI;
          root.add(cd);
        });
        const lean = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), new THREE.MeshStandardMaterial({ map: Cards.backTexture(), roughness: 0.5, side: THREE.DoubleSide }));
        lean.material.color.setScalar(0.8);
        lean.position.copy(P(s * 6.4, Y4 + 1.75, 245.0));
        lean.rotation.set(0, s * 0.35 + Math.PI, s * 0.1);
        root.add(lean);
      });
      card = LvKit.trialCard('h10b', true);
      card.position.copy(P(CARD[0], Y4 + 1.9, CARD[1]));
      root.add(card);
    }

    // ===== the archipelago around: far islands, some with ruins =====
    {
      const r = rng(907);
      for (let i = 0; i < 18; i++) {
        const a = r() * TAU;
        const d = 110 + r() * 260;
        const x = Math.sin(a) * d;
        const z = 150 + Math.cos(a) * d * 1.4;
        if (Math.abs(x) < 40 && z > -30 && z < 320) continue;
        const y = -18 + r() * 50;
        const w = 8 + r() * 26;
        put('floor', G.box, x, y - 0.3, z, [0, r() * 3, 0], [w * 0.8, 0.6, w * 0.8]);
        rockUnder(x, y - 0.6, z, w * 0.8, w * 0.8, w * (1 + r()), (i * 37) | 0);
        const nc = Math.floor(r() * 4);
        for (let k = 0; k < nc; k++) {
          const cx = x + (r() - 0.5) * w * 0.5;
          const cz = z + (r() - 0.5) * w * 0.5;
          const h = 3 + r() * 8;
          put('plaster', G.shaft, cx, y + h / 2, cz, [r() * 0.2, 0, r() * 0.2], [1.4, h, 1.4]);
        }
      }
    }
    flushBatches();

    // floating cards drifting around the market (two instanced draws)
    {
      const n = 46;
      const geo = new THREE.PlaneGeometry(1.6, 2.24);
      const back = new THREE.MeshBasicMaterial({ map: Cards.backTexture(), side: THREE.DoubleSide, toneMapped: false });
      back.color.setScalar(0.55);
      const face = new THREE.MeshBasicMaterial({ map: Tex.card('J', ''), side: THREE.DoubleSide, toneMapped: false });
      face.color.setScalar(0.55);
      const A = new THREE.InstancedMesh(geo, back, n - 8);
      const Bm = new THREE.InstancedMesh(geo, face, 8);
      const r = rng(33);
      const list = [];
      for (let i = 0; i < n; i++)
        list.push({
          c: V3((r() - 0.5) * 60, 8 + r() * 30, -10 + r() * 310),
          rad: 6 + r() * 30,
          a: r() * TAU,
          sp: (0.04 + r() * 0.08) * (r() < 0.5 ? -1 : 1),
          spin: V3(r() * 1.5, r() * 1.5, r() * 1.5),
          bob: r() * TAU,
        });
      A.frustumCulled = Bm.frustumCulled = false;
      root.add(A, Bm);
      cards = { A, Bm, list, n };
    }
    // a pool of real lights for the nearest lamps
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffb870', 0, 18, 2);
      l.userData = { at: -1, k: 0 };
      root.add(l);
      pool.push(l);
    }
    flashLight = new THREE.PointLight('#c8ccff', 0, 120, 1.4);
    root.add(flashLight);
    amb.motes = LvKit.motes({ n: 320, size: 1.6, colors: ['#ffd8a8', '#ff8ac0'], rise: [-0.15, 0.3], sway: 1.3, box: [46, 18], alpha: 0.45, seed: 19 });
  };
  const amb = { haze: new THREE.Color('#241634') };
  let flashLight = null;

  // ---------- procedural sound: wind over the clouds, distant thunder ----------
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
      N.wind.gain.value = 0.16;
      src(WN).connect(N.windF).connect(N.wind).connect(out);
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowpass';
      lo.frequency.value = 110;
      N.rum = ctx.createGain();
      N.rum.gain.value = 0.5;
      src(BN).connect(lo).connect(N.rum).connect(out);
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
          // the audio context exists after the first click: start as soon as it does
          if (root.visible) this.set(true);
          if (!ctx) return;
        }
        N.windF.frequency.setTargetAtTime(300 + Math.sin(t * 0.21) * 110 + Math.sin(t * 0.67) * 50, ctx.currentTime, 0.4);
        N.wind.gain.setTargetAtTime(0.13 + 0.06 * Math.sin(t * 0.33), ctx.currentTime, 0.5);
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
        const k = clamp(1.4 - dist / 400, 0.25, 1.1);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(k, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(k * 0.5, t0 + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random() * 0.5);
        s.stop(t0 + 3.4);
      },
    };
  })();

  // ---------- per-frame (the level writes ST, the world follows it) ----------
  const ST = {
    joker: V3(0, 14, 52),
    jokerOn: 1,
    talk: 0,
    plates: { dame: 0, valet: 0 },
    portal: 1,
    gate1: 0,
    gate2: 0,
    booths: [0, 0, 0, 0],
    prize: [null, null, null, null],
    proof: -1,
    peek: -1,
    glow: -1,
    cords: [0, 0, 0, 0],
    lever: {},
    clock: { dame: { mode: 'off', a: 0 }, valet: { mode: 'off', a: 0 } },
    freeCard: 1,
    wall3: 0,
    door3: 0,
    seals: 0,
    curtain4: 1,
    key: 1,
    door: 0,
    card: false,
    lect: { dame: 0, valet: 0 },
  };
  const mats = {};
  let lightT = 0;
  let snapNext = false;
  const update = (dt, t, me) => {
    if (!built) return;
    // a fresh entry snaps every door, gate and curtain to where the state says
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
    flashLight.intensity = flashV * 2.4;
    tickBolts(dt);
    tickStorm(dt, me);
    AU.tick(t);
    LvKit.tick(t);
    if (screen) screen.update(dt, t);
    // the skiff bobs at its mooring
    if (skiff) {
      skiff.position.y = O.y + 0.15 + Math.sin(t * 0.9) * 0.12;
      skiff.rotation.z = Math.sin(t * 0.7) * 0.04;
    }
    // the Joker glides to his station, glitches when he speaks
    const J = JOKER;
    J.g.position.lerp(P(ST.joker.x, ST.joker.y, ST.joker.z), 1 - Math.exp(-dt * 1.6));
    J.g.position.y += Math.sin(t * 0.8) * 0.01;
    J.g.lookAt(R.camera.position.x, J.g.position.y, R.camera.position.z);
    J.k = damp(J.k, ST.jokerOn, 2.5, dd);
    J.talk = Math.max(0, J.talk - dt);
    J.g.visible = J.k > 0.02;
    J.U.uTime.value = t;
    J.U.uAlpha.value = J.k;
    J.U.uGlitch.value = 0.25 + Math.min(1, J.talk) * 0.6 + (1 - J.k) * 0.8;
    J.mask.material.opacity = J.k;
    J.eyes.forEach((e) => (e.material.opacity = J.k * (0.25 + Math.min(1, J.talk) * 0.75) * (0.8 + 0.2 * Math.sin(t * 20))));
    J.ring.forEach((m, i) => {
      const a = t * 0.4 + (i / J.ring.length) * TAU;
      m.position.set(Math.cos(a) * 5.4, Math.sin(a * 2 + i) * 0.8, Math.sin(a) * 1.6 - 0.5);
      m.rotation.set(t * 0.7 + i, a, 0);
    });
    // plates of station 1
    ['dame', 'valet'].forEach((w) => {
      const pl = plates[w];
      pl.k = damp(pl.k, ST.plates[w], 8, dd);
      pl.ring.material.opacity = 0.25 + pl.k * 0.75;
      pl.ring.scale.setScalar(1 + pl.k * 0.08 + Math.sin(t * 6) * 0.01 * pl.k);
    });
    portal.material.uniforms.uK.value = damp(portal.material.uniforms.uK.value, ST.portal, 3, dd);
    portal.visible = portal.material.uniforms.uK.value > 0.01;
    // gates
    [
      ['g1', ST.gate1, 5.6],
      ['g2', ST.gate2, 4.8],
    ].forEach(([k, open, h]) => {
      const g = gates[k];
      g.k = damp(g.k, open, 1.6, dd);
      g.m.position.y = (k === 'g1' ? O.y : O.y + Y2) + g.k * h;
      g.b.on = !open;
    });
    // booths
    booth.forEach((b, i) => {
      b.open = damp(b.open, ST.booths[i], 4, dd);
      b.cur.scale.y = 1 - b.open * 0.88;
      b.pull = damp(b.pull, ST.cords[i], 10, dd);
      b.cord.position.y = O.y + Y2 + 2.9 - b.pull * 0.35;
      const pr = ST.prize[i];
      b.heart.visible = pr === 'heart' && b.open > 0.3;
      if (b.heart.visible) {
        b.heart.rotation.y = t * 2;
        b.heart.position.y = O.y + Y2 + 1.35 + Math.sin(t * 3) * 0.08 + b.open * 0.3;
      }
      b.pop = damp(b.pop, pr === 'joker' ? 1 : 0, 9, dd);
      b.jack.visible = b.pop > 0.02;
      if (b.jack.visible) {
        const s = b.pop * (1 + Math.sin(t * 18) * 0.06 * b.pop);
        b.jack.scale.set(1, s, 1);
        b.jack.rotation.z = Math.sin(t * 9) * 0.15 * b.pop;
      }
      b.proof.visible = ST.proof === i && !pr;
      if (b.proof.visible) b.proof.rotation.y = b.cur.rotation.y + Math.PI + Math.sin(t * 1.4) * 0.3;
      b.peek.visible = ST.peek === i && !pr;
      if (b.peek.visible) b.peek.position.y = O.y + Y2 + 1.95 + Math.sin(t * 2.3) * 0.08;
      b.glow.visible = ST.glow === i && !pr;
      if (b.glow.visible) b.glow.material.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    });
    // levers, clocks, the free card, the sinking wall, the loges' door
    Object.entries(levers).forEach(([id, lv]) => {
      lv.k = damp(lv.k, ST.lever[id] || 0, 12, dd);
      lv.pv.rotation.x = -0.55 + lv.k * 1.25;
    });
    ['dame', 'valet'].forEach((w) => {
      const c = clocks[w];
      const s = ST.clock[w];
      if (c.mode !== s.mode) {
        c.mode = s.mode;
        c.face.material.map = s.mode === 'cap' ? T.dialCap : s.mode === 'joker' ? T.dialJoker : T.dialOff;
        c.face.material.needsUpdate = true;
        c.hand.visible = s.mode !== 'off';
      }
      c.hand.rotation.z = -s.a;
    });
    freeCard.m.forEach((m) => {
      m.visible = ST.freeCard > 0.5;
      m.rotation.y = t * 0.9;
      m.position.y = O.y + Y2 + 2.7 + Math.sin(t * 1.6) * 0.1;
    });
    wall3.k = damp(wall3.k, ST.wall3, 0.9, dd);
    wall3.g.position.y = O.y + Y2 + 4.5 - wall3.k * 9.4;
    wall3.b.on = ST.wall3 < 0.5;
    door3.k = damp(door3.k, ST.door3, 1.5, dd);
    door3.m.children.forEach((l) => (l.position.x = l.userData.s * (1.25 + door3.k * 2.4)));
    door3.b.on = ST.door3 < 0.5;
    // station 4: lecterns, key, seals, curtain, door, card
    ['dame', 'valet'].forEach((w) => {
      const l = lect[w];
      l.k = damp(l.k, ST.lect[w], 14, dd);
      l.b.position.y = O.y + Y4 + 1.16 - l.k * 0.06;
    });
    key.k = damp(key.k, ST.key, 4, dd);
    key.g.visible = key.k > 0.02;
    key.g.rotation.y = t * 1.2;
    key.g.position.y = O.y + Y4 + 1.9 + Math.sin(t * 2) * 0.12;
    key.g.scale.setScalar(Math.max(0.01, key.k));
    seals.forEach((s, i) => {
      s.m.visible = gates.door.k < 0.1;
      s.k = damp(s.k, ST.seals > i ? 1 : 0, 5, dd);
      s.m.material.color.set('#3a0a18').lerp(mats.sealOn || (mats.sealOn = new THREE.Color('#ff7aa6').multiplyScalar(2)), s.k);
    });
    curtain4.k = damp(curtain4.k, ST.curtain4, 1.5, dd);
    curtain4.m.material.uniforms.uK.value = curtain4.k;
    curtain4.m.visible = curtain4.k > 0.01;
    curtain4.b.on = ST.curtain4 > 0.5;
    gates.door.k = damp(gates.door.k, ST.door, 0.8, dd);
    leaves.forEach((l) => (l.pv.rotation.y = l.s * gates.door.k * 1.45));
    gates.door.b.on = ST.door < 0.5;
    card.visible = ST.card;
    if (card.visible) {
      card.rotation.y = t * 0.8;
      card.position.y = O.y + Y4 + 1.9 + Math.sin(t * 1.5) * 0.12;
    }
    // the drifting cards
    if (cards) {
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const one = V3(1, 1, 1);
      const p = V3();
      cards.list.forEach((c, i) => {
        const a = c.a + t * c.sp;
        p.set(O.x + c.c.x + Math.cos(a) * c.rad, O.y + c.c.y + Math.sin(t * 0.5 + c.bob) * 1.2, O.z + c.c.z + Math.sin(a) * c.rad);
        e.set(t * c.spin.x * 0.3, t * c.spin.y * 0.3 + a, t * c.spin.z * 0.2);
        q.setFromEuler(e);
        m4.compose(p, q, one);
        if (i < cards.n - 8) cards.A.setMatrixAt(i, m4);
        else cards.Bm.setMatrixAt(i - (cards.n - 8), m4);
      });
      cards.A.instanceMatrix.needsUpdate = true;
      cards.Bm.instanceMatrix.needsUpdate = true;
    }
    // the real lights follow the nearest lamps (4 at most, faded in and out)
    lightT -= dt;
    if (lightT <= 0) {
      lightT = 0.3;
      const c = R.camera.position;
      const want = LIGHTS.map((L, i) => [L.p.distanceToSquared(c) - (L.portal && ST.portal > 0.5 ? 400 : 0) - (L.gold && ST.door > 0.5 ? 2000 : 0), i])
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
      const on = !L ? 0 : L.portal ? ST.portal : L.gold ? 0.25 + ST.door * 0.75 : 1;
      l.intensity = L ? L.i * u.k * on * (L.portal ? 0.85 + Math.sin(t * 7) * 0.15 : 1) : 0;
    });
  };

  // ---------- queries ----------
  const at = (zone, q) => {
    switch (zone) {
      case 'HALL':
        return q.z > 18 && q.z < 61 && q.y > -1 && q.y < 5;
      case 'ALLEY':
        return q.z > 61.5 && q.z < 113 && q.y > -1;
      case 'PLAZA':
        return Math.hypot(q.x, q.z - PLAZA.z) < PLAZA.r + 0.5 && q.y > Y2 - 0.6;
      case 'WALK3':
        return q.z > 142 && q.z < 160.5 && q.y > Y2 - 0.6;
      case 'LOGES':
        return q.z > 160 && q.z < 206 && q.y > Y2 - 0.6 && q.y < Y2 + 6;
      case 'HALF_dame':
        return q.z > 167 && q.z < 206 && q.x < -0.3 && q.y > Y2 - 0.6 && q.y < Y2 + 6;
      case 'HALF_valet':
        return q.z > 167 && q.z < 206 && q.x > 0.3 && q.y > Y2 - 0.6 && q.y < Y2 + 6;
      case 'BRIDGE':
        return q.z > 206.5 && q.z < 244 && q.y > Y2 - 0.6;
      case 'TERRACE':
        return q.z > 244 && q.z < 282 && q.y > Y4 - 0.6;
      case 'COUR':
        return q.z > 282.5 && q.y > Y4 - 0.6;
      default:
        return false;
    }
  };
  // the quay is world 0 of the épreuve; each stage restarts at its own place
  const SPAWN = {
    1: [[-1.6, 0, 1], [1.6, 0, 1]],
    2: [[-1.4, 0, 64], [1.4, 0, 64]],
    plaza: [[-1.6, Y2, 116.5], [1.6, Y2, 116.5]],
    3: [[-1.6, Y2, 153], [1.6, Y2, 153]],
    4: [[-1, Y2, 209], [1, Y2, 209]],
    terrace: [[-5, Y4, 249], [5, Y4, 249]],
    5: [[-3, Y4, 286], [3, Y4, 286]],
  };
  const spawn = (key2, who) => {
    const s = SPAWN[key2] || SPAWN[1];
    const p = s[who === 'dame' ? 0 : 1];
    return P(p[0], p[1], p[2]);
  };

  return {
    O,
    P,
    rel,
    Y2,
    Y4,
    PLATES1,
    PORTAL,
    PLAZA,
    BOOTHS,
    ROMAN,
    LEVERS3,
    CLOCK3,
    LECT4,
    KEY4,
    DOOR_Z,
    CARD,
    ST,
    AU,
    amb,
    build,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
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
    at,
    spawn,
    talk(k = 1.4) {
      JOKER.talk = Math.max(JOKER.talk, k);
    },
    get joker() {
      return JOKER.g;
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
    get boothPos() {
      return BOOTHS.map((b) => P(b.x, Y2 + 1.5, b.z));
    },
    get mats() {
      return M;
    },
    get lights() {
      return pool;
    },
  };
})();
