// ♠ · La Cour, the table of spades (épreuves sV, sD, sR): the Armurerie de Pique, one wing of the
// Joker's court floating above the storm. Black iron and smoked steel under a glass vault, cold
// white light, the storm flashing through tall windows and the cloud sea far below. Three rooms
// in a row, one per figure (each a tall Veilleur in a court-card costume and mask):
//  A. La Galerie des râteliers (Le Valet de Pique): a gallery over a pit of iron spikes, split in
//     two by a grille: a low lane of pillars (portcullises, swinging maces, pistons) and a high lane
//     of iron walks (grapple rings, drawbridges, the winches of the portcullises)
//  B. La Salle d'armes (La Dame de Pique): a round fencing hall, her dais in a fence of pikes
//  C. La Salle du Trône d'acier (Le Roi de Pique): his throne, four iron pillars, his great armour
// Scanned materials (Poly Haven, lazily loaded for these levels only, procedural until they
// arrive). Geometry, visuals, sound and pure helpers only; the rules live in js/levels/tr_s*.js.
const CourS = (() => {
  const O = V3(-6000, 0, 16000);
  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);
  // what follows the camera (sky, cloud sea, bolts) is never culled by distance
  const wx = new THREE.Group();
  wx.visible = false;
  wx.userData.noCull = true;
  R.scene.add(wx);
  const AREA = { A: new THREE.Group(), B: new THREE.Group(), C: new THREE.Group() };
  Object.values(AREA).forEach((g) => root.add(g));
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const rel = (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z);
  const col = (x, y, z, sx, sy, sz, opt) => Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
  let built = false;
  const ease = (x) => smooth(clamp(x, 0, 1));

  // ---------- layout (relative to O; the wing runs along +z) ----------
  // A · the gallery: start ledge, a pit, the end ledge before the door of the Salle d'armes
  const A = {
    pitY: -7,
    endZ: 92,
    spine: [-1, 1],
    // the low lane (the valet kit): [x, z, w, d, top]
    pads: [
      [-6.5, 14, 3, 3, 0],
      [-8.2, 19.2, 2.6, 2.6, 0.6],
      [-5, 24.2, 2.6, 2.6, 1.2],
      [-6.5, 30.5, 10, 5, 1.2],
      [-6.5, 36, 10, 5, 1.2],
      [-6.5, 43, 2.6, 3, 1.2],
      [-6.5, 48.5, 2.6, 3, 1.2],
      [-6.5, 54, 2.6, 3, 1.2],
      [-6.5, 60.5, 10, 5, 1.2],
      [-6.5, 66, 10, 5, 1.2],
    ],
    // pistons after the second portcullis: [x, z], top oscillating (local clock, each screen)
    pistons: [
      [-7.6, 72.6],
      [-5.4, 77.4],
      [-7.6, 82.2],
      [-5.4, 87],
    ],
    // maces swinging across the gaps between the narrow pillars (pivot x, z)
    maces: [
      [-6.5, 45.75],
      [-6.5, 51.25],
      [-6.5, 56.75],
    ],
    herse: [33.3, 63.3],
    target: [
      [-10.6, 37.2],
      [-10.6, 67.2],
    ],
    // the high lane (the dame kit), top at y 5: [z0, z1]
    HY: 5,
    HX: [3, 10.6],
    walks: [
      [10, 16],
      [28, 34],
      [46, 52],
      [64, 70],
      [82, 88],
    ],
    rings: [
      [6.8, 10.6, 22, 30],
      [6.8, 10.6, 58, 66],
    ],
    bridges: [
      [34, 46],
      [70, 82],
    ],
    winch: [
      [4.3, 31.2],
      [4.3, 67.2],
    ],
  };
  // B · the fencing hall
  const B = { c: [0, 150], r: 15, dais: 2.6, daisY: 1.0, fence: 3.7 };
  // C · the throne room
  const C = { x: [-17, 17], z: [190, 240], pillars: [[-8, 203], [8, 203], [-8, 220], [8, 220]], throneZ: 236.5, dais: [232, 240], daisY: 1.5, armour: [0, 222] };

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
  // Tex.mat gives the triplanar shader and the kind's procedural maps; each material then binds
  // its own maps, so the scans never leak into the other levels using the same kind
  const scans = [];
  const scansOn = () => typeof Look === 'undefined' || Look.on('tex');
  const scan = (kind, id, opt = {}) => {
    const m = Tex.mat(kind, Object.assign({ cs: id }, opt));
    if (!m.userData.tri || m.userData.cs) return m;
    const T = Tex.build(kind);
    const U = { tAlb: { value: T.albedo }, tDat: { value: T.data }, triMul: { value: 1 }, triNrm: { value: 0 } };
    m.userData.cs = U;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      Object.assign(sh.uniforms, U);
    };
    scans.push({ id, U });
    return m;
  };
  const loadScans = () => {
    if (!scansOn() || typeof Assets === 'undefined') return;
    [...new Set(scans.map((s) => s.id))].forEach((id) => {
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

  // ---------- canvas textures ----------
  const T = {};
  const spadePath = (g, cx, cy, k) => {
    g.beginPath();
    g.moveTo(cx, cy - k * 0.62);
    g.bezierCurveTo(cx + k * 0.12, cy - k * 0.38, cx + k * 0.62, cy - k * 0.12, cx + k * 0.56, cy + k * 0.2);
    g.bezierCurveTo(cx + k * 0.5, cy + k * 0.48, cx + k * 0.16, cy + k * 0.46, cx + k * 0.06, cy + k * 0.26);
    g.lineTo(cx + k * 0.16, cy + k * 0.62);
    g.lineTo(cx - k * 0.16, cy + k * 0.62);
    g.lineTo(cx - k * 0.06, cy + k * 0.26);
    g.bezierCurveTo(cx - k * 0.16, cy + k * 0.46, cx - k * 0.5, cy + k * 0.48, cx - k * 0.56, cy + k * 0.2);
    g.bezierCurveTo(cx - k * 0.62, cy - k * 0.12, cx - k * 0.12, cy - k * 0.38, cx, cy - k * 0.62);
    g.closePath();
  };
  // a flat spade shape for extrusions (1 m tall)
  const spadeShape = () => {
    const s = new THREE.Shape();
    const k = 1;
    s.moveTo(0, k * 0.62);
    s.bezierCurveTo(k * 0.12, k * 0.38, k * 0.62, k * 0.12, k * 0.56, -k * 0.2);
    s.bezierCurveTo(k * 0.5, -k * 0.48, k * 0.16, -k * 0.46, k * 0.06, -k * 0.26);
    s.lineTo(k * 0.16, -k * 0.62);
    s.lineTo(-k * 0.16, -k * 0.62);
    s.lineTo(-k * 0.06, -k * 0.26);
    s.bezierCurveTo(-k * 0.16, -k * 0.46, -k * 0.5, -k * 0.48, -k * 0.56, -k * 0.2);
    s.bezierCurveTo(-k * 0.62, k * 0.12, -k * 0.12, k * 0.38, 0, k * 0.62);
    return s;
  };
  const makeTextures = () => {
    // black banner with a silver spade, fringe and a hem
    T.banner = LvKit.tex(256, 640, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#0d0f14';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(w, h * 0.86);
      g.lineTo(w / 2, h);
      g.lineTo(0, h * 0.86);
      g.closePath();
      g.fill();
      for (let i = 0; i < 2400; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
        g.fillRect(Math.random() * w, Math.random() * h * 0.9, 1, 3 + Math.random() * 8);
      }
      g.strokeStyle = '#b9c2cf';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(16, 10);
      g.lineTo(16, h * 0.84);
      g.lineTo(w / 2, h * 0.96);
      g.lineTo(w - 16, h * 0.84);
      g.lineTo(w - 16, 10);
      g.stroke();
      const gr = g.createLinearGradient(0, 180, 0, 420);
      gr.addColorStop(0, '#f4f6fa');
      gr.addColorStop(1, '#8c95a4');
      g.fillStyle = gr;
      spadePath(g, w / 2, 300, 150);
      g.fill();
      g.fillStyle = '#b9c2cf';
      g.font = 'bold 34px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('✦', w / 2, 110);
      g.fillText('✦', w / 2, 500);
    });
    // a spade emblem (shields, targets, the throne)
    T.emblem = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#9aa4b4');
      g.fillStyle = gr;
      spadePath(g, w / 2, h / 2, 200);
      g.fill();
    });
    // the target shield: concentric iron rings on black, a silver spade
    T.target = LvKit.tex(256, 256, (g, w, h) => {
      g.fillStyle = '#121419';
      g.fillRect(0, 0, w, h);
      [118, 92, 66].forEach((r, i) => {
        g.strokeStyle = i % 2 ? '#c8d0dc' : '#5c6470';
        g.lineWidth = 10;
        g.beginPath();
        g.arc(w / 2, h / 2, r, 0, TAU);
        g.stroke();
      });
      g.fillStyle = '#eef2f8';
      spadePath(g, w / 2, h / 2, 90);
      g.fill();
    });
    // the costumes (court-card tabards): black velvet, silver bands, steel-blue panels
    const tabard = (rank) =>
      LvKit.tex(256, 512, (g, w, h) => {
        g.fillStyle = '#121318';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 3000; i++) {
          g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
          g.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 5);
        }
        // the card costume's panels and bands
        g.fillStyle = '#2c3a52';
        g.fillRect(w * 0.18, h * 0.06, w * 0.64, h * 0.88);
        g.fillStyle = '#d7dde6';
        [0.06, 0.34, 0.62, 0.94].forEach((y) => g.fillRect(0, h * y - 5, w, 10));
        g.fillStyle = '#9aa3b2';
        for (let y = 0.1; y < 0.92; y += 0.06) {
          g.beginPath();
          g.arc(w * 0.18, h * y, 5, 0, TAU);
          g.arc(w * 0.82, h * y, 5, 0, TAU);
          g.fill();
        }
        // a chevron pattern in the bands (like the printed faces)
        g.strokeStyle = '#7f8899';
        g.lineWidth = 3;
        for (let x = 0; x < w; x += 22) {
          [0.34, 0.62].forEach((y) => {
            g.beginPath();
            g.moveTo(x, h * y - 4);
            g.lineTo(x + 11, h * y + 4);
            g.lineTo(x + 22, h * y - 4);
            g.stroke();
          });
        }
        g.fillStyle = '#f2f4f8';
        spadePath(g, w / 2, h * 0.2, 70);
        g.fill();
        g.font = 'bold 58px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(rank, w / 2, h * 0.48);
        spadePath(g, w / 2, h * 0.78, 54);
        g.fill();
      });
    T.tabV = tabard('V');
    T.tabD = tabard('D');
    T.tabR = tabard('R');
    // the masks: white porcelain painted like the faces of the cards
    const mask = (rank) =>
      LvKit.tex(256, 320, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.save();
        g.translate(w / 2, h / 2);
        const fg = g.createRadialGradient(-24, -50, 10, 0, 0, 160);
        fg.addColorStop(0, '#ffffff');
        fg.addColorStop(1, '#b8bec8');
        g.fillStyle = fg;
        g.beginPath();
        g.ellipse(0, 0, 100, 140, 0, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(30,34,44,0.35)';
        g.lineWidth = 3;
        g.stroke();
        // brows and almond eyes
        g.fillStyle = '#0a0b10';
        [-1, 1].forEach((s) => {
          g.save();
          g.translate(s * 40, -28);
          g.rotate(s * 0.14);
          g.beginPath();
          g.ellipse(0, 0, 26, 12, 0, 0, TAU);
          g.fill();
          g.restore();
          g.strokeStyle = '#141820';
          g.lineWidth = rank === 'R' ? 9 : 6;
          g.beginPath();
          g.moveTo(s * 16, -54 - (rank === 'R' ? 4 : 0));
          g.quadraticCurveTo(s * 42, rank === 'R' ? -70 : -66, s * 70, -52);
          g.stroke();
        });
        // the nose ridge and the mouth
        g.strokeStyle = 'rgba(40,46,58,0.6)';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(0, -20);
        g.quadraticCurveTo(-8, 20, 0, 28);
        g.stroke();
        g.strokeStyle = '#3a404e';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(-22, 62);
        g.quadraticCurveTo(0, rank === 'D' ? 72 : 68, 22, 62);
        g.stroke();
        g.fillStyle = '#111318';
        spadePath(g, 0, -96, 30);
        g.fill();
        if (rank === 'V') {
          // a curled moustache, a beauty curl on the cheek
          g.strokeStyle = '#141820';
          g.lineWidth = 5;
          [-1, 1].forEach((s) => {
            g.beginPath();
            g.moveTo(0, 48);
            g.bezierCurveTo(s * 20, 40, s * 40, 50, s * 44, 36);
            g.stroke();
          });
        }
        if (rank === 'D') {
          // lashes, a little spade under the eye, lips
          g.strokeStyle = '#0a0b10';
          g.lineWidth = 3;
          [-1, 1].forEach((s) => {
            for (let i = 0; i < 5; i++) {
              g.beginPath();
              g.moveTo(s * (24 + i * 7), -38);
              g.lineTo(s * (22 + i * 9), -48);
              g.stroke();
            }
          });
          g.fillStyle = '#2a2f3a';
          spadePath(g, 52, 6, 18);
          g.fill();
          g.fillStyle = '#5a6272';
          g.beginPath();
          g.ellipse(0, 64, 18, 7, 0, 0, TAU);
          g.fill();
        }
        if (rank === 'R') {
          // a moustache and a pointed beard painted below the mouth, strands in grey
          g.fillStyle = '#16181f';
          g.beginPath();
          g.moveTo(-72, 20);
          g.bezierCurveTo(-70, 90, -40, 128, -14, 146);
          g.lineTo(0, 132);
          g.lineTo(14, 146);
          g.bezierCurveTo(40, 128, 70, 90, 72, 20);
          g.bezierCurveTo(60, 70, 34, 84, 0, 86);
          g.bezierCurveTo(-34, 84, -60, 70, -72, 20);
          g.fill();
          g.strokeStyle = '#4a5160';
          g.lineWidth = 2;
          for (let i = -4; i <= 4; i++) {
            g.beginPath();
            g.moveTo(i * 13, 92);
            g.quadraticCurveTo(i * 15 + 5, 112, i * 9, 134);
            g.stroke();
          }
          g.strokeStyle = '#16181f';
          g.lineWidth = 9;
          g.lineCap = 'round';
          [-1, 1].forEach((s) => {
            g.beginPath();
            g.moveTo(s * 4, 46);
            g.bezierCurveTo(s * 22, 40, s * 44, 52, s * 52, 66);
            g.stroke();
          });
        }
        g.restore();
      });
    T.maskV = mask('V');
    T.maskD = mask('D');
    T.maskR = mask('R');
    // a soft round glow (eyes behind the masks, lamp halos)
    T.soft = LvKit.tex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    // the fencing circle inlaid in the floor of the Salle d'armes (alpha)
    T.piste = LvKit.tex(1024, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(230,236,246,0.85)';
      g.lineWidth = 7;
      [0.98, 0.7].forEach((k) => {
        g.beginPath();
        g.arc(w / 2, h / 2, (w / 2) * k - 6, 0, TAU);
        g.stroke();
      });
      g.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + Math.PI / 8;
        g.beginPath();
        g.moveTo(w / 2 + Math.cos(a) * w * 0.35, h / 2 + Math.sin(a) * h * 0.35);
        g.lineTo(w / 2 + Math.cos(a) * w * 0.49, h / 2 + Math.sin(a) * h * 0.49);
        g.stroke();
      }
      g.fillStyle = 'rgba(230,236,246,0.8)';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        spadePath(g, w / 2 + Math.cos(a) * w * 0.42, h / 2 + Math.sin(a) * h * 0.42, 54);
        g.fill();
      }
    });
    // a light shaft: bright at the window, fading along its length and at its edges
    T.shaft = LvKit.tex(64, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const e = g.createLinearGradient(0, 0, w, 0);
      e.addColorStop(0, 'rgba(0,0,0,1)');
      e.addColorStop(0.3, 'rgba(0,0,0,0)');
      e.addColorStop(0.7, 'rgba(0,0,0,0)');
      e.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = e;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    });
    // the runner of the throne room: steel-blue velvet, silver borders, a spade every few metres
    T.runner = LvKit.tex(256, 1024, (g, w, h) => {
      g.fillStyle = '#1b2232';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1, 3);
      }
      g.fillStyle = '#b9c2cf';
      g.fillRect(14, 0, 10, h);
      g.fillRect(w - 24, 0, 10, h);
      g.fillStyle = '#7f8899';
      g.fillRect(32, 0, 3, h);
      g.fillRect(w - 35, 0, 3, h);
      g.fillStyle = 'rgba(200,210,225,0.55)';
      for (let y = 128; y < h; y += 256) {
        spadePath(g, w / 2, y, 70);
        g.fill();
      }
    }, 1, 1);
    // a winch's brass plate
    T.plate = LvKit.tex(256, 128, (g, w, h) => {
      g.fillStyle = '#2a2f38';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b9c2cf';
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#e8ecf2';
      g.font = 'italic bold 46px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Herse', w / 2, h / 2 + 2);
    });
  };

  // ---------- materials ----------
  const M = {};
  const std = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
  const makeMats = () => {
    M.slate = scan('pavement', 'tex.s_slate', { color: '#5f646e', scale: 3.0, rough: 1, bump: 1 });
    M.slateDark = scan('pavement', 'tex.s_slate', { color: '#3c4048', scale: 3.0, rough: 1, bump: 1 });
    M.stone = scan('stone', 'tex.c10stone', { color: '#5f636c', scale: 3.4, bump: 1.3 });
    M.stoneLit = scan('stone', 'tex.c10stone', { color: '#8a8e98', scale: 2.6, bump: 1.1 });
    M.iron = scan('metal', 'tex.s_iron', { color: '#4a505a', scale: 1.8, rough: 0.85, metal: 0.7, bump: 0.6 });
    M.ironDark = scan('metal', 'tex.s_iron', { color: '#2e323a', scale: 1.6, rough: 0.8, metal: 0.75, bump: 0.6 });
    M.steel = scan('metal', 'tex.s_iron', { color: '#9aa3b0', scale: 1.2, rough: 0.55, metal: 0.9, bump: 0.4 });
    M.wood = scan('wood', 'tex.wood', { color: '#4c3d33', scale: 2.0, bump: 0.8 });
    // no env map in the game: metals get a cheap studio reflection, else they render black
    if (typeof Assets !== 'undefined' && Assets.envify) [M.iron, M.ironDark, M.steel].forEach((m) => Assets.envify(m, 0.55));
    M.glass = std('#1c2636', 0.05, { metalness: 0.6, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    M.banner = std('#ffffff', 0.92, { map: T.banner, alphaTest: 0.5, side: THREE.DoubleSide });
    M.lamp = LvKit.glow('#e8f0ff', 2.2);
    M.lampWarm = LvKit.glow('#fff1dc', 1.6);
    M.emblem = std('#ffffff', 0.4, { map: T.emblem, transparent: true, metalness: 0.5 });
    M.cold = LvKit.glow('#cfe0ff', 1.6);
    M.chain = std('#30343c', 0.5, { metalness: 0.8 });
    // the cold light falling from the windows (additive, no depth write)
    M.shaft = new THREE.MeshBasicMaterial({ color: new THREE.Color('#b8c8ff').multiplyScalar(0.16), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, map: T.shaft });
    M.runner = std('#8a93a6', 0.9, { map: T.runner });
  };

  // ---------- batching of the static scenery (one draw call per material and room) ----------
  const BAT = {};
  const G = {};
  const bat = (a, k) => BAT[a + ':' + k] || (BAT[a + ':' + k] = { a, k, b: LvKit.batch() });
  const put = (a, k, geo, x, y, z, rot, scl) => bat(a, k).b.add(geo, P(x, y, z), rot, scl);
  const box = (a, k, x, y, z, sx, sy, sz, rot) => put(a, k, G.box, x, y, z, rot, [sx, sy, sz]);
  const flushBatches = () =>
    Object.values(BAT).forEach((e) => {
      if (!e.b.size) return;
      AREA[e.a].add(e.b.mesh(M[e.k]));
    });
  // a solid block: drawn (batched) and collided
  const solid = (a, k, x, y, z, sx, sy, sz, opt) => {
    box(a, k, x, y, z, sx, sy, sz);
    return col(x, y, z, sx, sy, sz, opt);
  };
  // a walkable slab whose top is at `top`
  const slab = (a, k, x, top, z, w, d, th = 0.5) => solid(a, k, x, top - th / 2, z, w, th, d, { surf: 'concrete' });

  const segQ = new THREE.Quaternion();
  const segE = new THREE.Euler();
  const seg = (a, k, x0, y0, z0, x1, y1, z1, w, d = w) => {
    const dir = V3(x1 - x0, y1 - y0, z1 - z0);
    const L = dir.length();
    segQ.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
    segE.setFromQuaternion(segQ);
    put(a, k, G.box, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, [segE.x, segE.y, segE.z], [w, L + 0.04, d]);
  };
  // ---------- light: chandeliers (pooled real lights), window glow ----------
  const LIGHTS = [];
  const pool = [];
  const chandelier = (a, x, y, z, r = 1.6, n = 8, light = {}) => {
    put(a, 'iron', G.torus, x, y, z, [Math.PI / 2, 0, 0], [r, r, 1]);
    put(a, 'iron', G.torus, x, y + 0.5, z, [Math.PI / 2, 0, 0], [r * 0.55, r * 0.55, 1]);
    for (let i = 0; i < n; i++) {
      const an = (i / n) * TAU;
      const cx = x + Math.cos(an) * r;
      const cz = z + Math.sin(an) * r;
      put(a, 'iron', G.cup, cx, y + 0.08, cz);
      put(a, 'lamp', G.flame, cx, y + 0.32, cz);
    }
    // chains up to the vault
    for (let i = 0; i < 3; i++) {
      const an = (i / 3) * TAU;
      const top = light.top || y + 5;
      const L = top - y;
      put(a, 'chain', G.rod, x + Math.cos(an) * r * 0.5, y + L / 2, z + Math.sin(an) * r * 0.5, [Math.cos(an) * 0.09, 0, -Math.sin(an) * 0.09], [1, L, 1]);
    }
    LIGHTS.push({ a, p: P(x, y - 0.3, z), c: new THREE.Color(light.c || '#dce8ff'), i: light.i || 1.5, d: light.d || 22 });
  };

  // ---------- braziers of cold fire (a pooled real light each, halos as one Points per room) ----------
  const HALOS = { A: [], B: [], C: [] };
  const brazier = (a, x, z, y = 0, light = {}) => {
    put(a, 'ironDark', G.cyl, x, y + 0.6, z, null, [0.16, 1.2, 0.16]);
    for (let k = 0; k < 3; k++) {
      const an = (k / 3) * TAU;
      put(a, 'ironDark', G.box, x + Math.sin(an) * 0.32, y + 0.25, z + Math.cos(an) * 0.32, [Math.cos(an) * 0.5, 0, -Math.sin(an) * 0.5], [0.08, 0.6, 0.08]);
    }
    put(a, 'iron', G.bowl, x, y + 1.2, z);
    put(a, 'lamp', G.fire, x, y + 1.42, z);
    HALOS[a].push(x, y + 1.5, z);
    LIGHTS.push({ a, p: P(x, y + 1.9, z), c: new THREE.Color(light.c || '#e4ecff'), i: light.i || 1.3, d: light.d || 13 });
  };
  const makeHalos = () =>
    Object.entries(HALOS).forEach(([a, list]) => {
      if (!list.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(list.map((v, i) => v + (i % 3 === 0 ? O.x : i % 3 === 1 ? O.y : O.z)), 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: T.soft, color: new THREE.Color('#d8e4ff').multiplyScalar(1.3), size: 2.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      AREA[a].add(pts);
    });
  // a shaft of cold light from a window at (wx, wz), falling inward; (ox, oz) points outside
  const shaft = (a, wx, wz, ox, oz, w = 3) => {
    const L = 15;
    const ang = 0.62;
    const ry = Math.atan2(ox, oz) - Math.PI / 2;
    put(a, 'shaft', G.shaftGeo, wx - ox * Math.sin(ang) * L * 0.5, 9.6 - Math.cos(ang) * L * 0.5, wz - oz * Math.sin(ang) * L * 0.5, [0, ry, -ang], [1, L, w]);
  };

  // ---------- small builders ----------
  // a hall's long wall along z (at x), bays of 8 m: lower wall, a tall window, upper wall
  const longWall = (a, x, z0, z1, h = 16, win = true, side = 1) => {
    const n = Math.round((z1 - z0) / 8);
    const bw = (z1 - z0) / n;
    for (let i = 0; i < n; i++) {
      const zc = z0 + (i + 0.5) * bw;
      if (win) {
        box(a, 'stone', x, 1.75, zc, 1.2, 3.5, bw);
        box(a, 'stone', x, (11.6 + h) / 2, zc, 1.2, h - 11.6, bw);
        box(a, 'stone', x, 7.5, zc - bw / 2 + 1.2, 1.2, 8.2, 2.4);
        box(a, 'stone', x, 7.5, zc + bw / 2 - 1.2, 1.2, 8.2, 2.4);
        // the window: an iron frame, mullions and dark glass, an arch on top
        put(a, 'glass', G.plane, x, 7.4, zc, [0, Math.PI / 2, 0], [bw - 4.8, 8.2, 1]);
        box(a, 'ironDark', x, 7.4, zc, 0.12, 8.2, 0.12);
        box(a, 'ironDark', x, 6.2, zc, 0.12, 0.1, bw - 4.8);
        box(a, 'ironDark', x, 9.4, zc, 0.12, 0.1, bw - 4.8);
        box(a, 'iron', x - side * 0.66, 3.45, zc, 0.3, 0.2, bw - 4.4);
        WINDOWS.push({ a, x, z: zc, w: bw - 4.8, side });
        if (side > 0 && i % 2 === 0) shaft(a, x, zc, side, 0, bw - 4.8);
      } else box(a, 'stone', x, h / 2, zc, 1.2, h, bw);
      // the pilaster between bays, iron-clad
      box(a, 'ironDark', x - side * 0.75, h / 2, z0 + i * bw, 0.7, h, 1.2);
    }
    box(a, 'ironDark', x - side * 0.75, h / 2, z1, 0.7, h, 1.2);
    // a cornice
    box(a, 'iron', x - side * 0.8, h - 0.3, (z0 + z1) / 2, 0.8, 0.4, z1 - z0);
    col(x, h / 2, (z0 + z1) / 2, 1.2, h, z1 - z0);
  };
  const WINDOWS = [];
  // a cross wall (along x) with a door opening [dx0, dx1] (or none)
  const crossWall = (a, z, x0, x1, h = 16, door = null, doorH = 6.5) => {
    if (!door) {
      solid(a, 'stone', (x0 + x1) / 2, h / 2, z, x1 - x0, h, 1.2);
      return;
    }
    const [d0, d1] = door;
    solid(a, 'stone', (x0 + d0) / 2, h / 2, z, d0 - x0, h, 1.2);
    solid(a, 'stone', (d1 + x1) / 2, h / 2, z, x1 - d1, h, 1.2);
    solid(a, 'stone', (d0 + d1) / 2, (doorH + h) / 2, z, d1 - d0, h - doorH, 1.2);
    // the iron door frame
    box(a, 'ironDark', d0 - 0.25, doorH / 2, z, 0.5, doorH, 1.4);
    box(a, 'ironDark', d1 + 0.25, doorH / 2, z, 0.5, doorH, 1.4);
    box(a, 'ironDark', (d0 + d1) / 2, doorH + 0.25, z, d1 - d0 + 1, 0.5, 1.4);
  };
  // iron ribs across a vault (along x at z), glass panes between
  const vault = (a, x0, x1, z0, z1, y, rise = 3) => {
    const w = x1 - x0;
    const n = Math.round((z1 - z0) / 8);
    const seg = 10;
    for (let i = 0; i <= n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      for (let s = 0; s < seg; s++) {
        const u0 = s / seg;
        const u1 = (s + 1) / seg;
        const xa = x0 + w * u0;
        const xb = x0 + w * u1;
        const ya = y + Math.sin(u0 * Math.PI) * rise;
        const yb = y + Math.sin(u1 * Math.PI) * rise;
        const L = Math.hypot(xb - xa, yb - ya);
        put(a, 'ironDark', G.box, (xa + xb) / 2, (ya + yb) / 2, z, [0, 0, Math.atan2(yb - ya, xb - xa)], [L + 0.05, 0.45, 0.35]);
      }
    }
    // the glass between the ribs, in long strips
    for (let s = 0; s < seg; s++) {
      const u0 = s / seg;
      const u1 = (s + 1) / seg;
      const xa = x0 + w * u0;
      const xb = x0 + w * u1;
      const ya = y + Math.sin(u0 * Math.PI) * rise;
      const yb = y + Math.sin(u1 * Math.PI) * rise;
      const L = Math.hypot(xb - xa, yb - ya);
      put(a, 'glass', G.planeH, (xa + xb) / 2, (ya + yb) / 2, (z0 + z1) / 2, [0, 0, Math.atan2(yb - ya, xb - xa)], [L, 1, z1 - z0]);
    }
    // the long purlins
    [0.25, 0.5, 0.75].forEach((u) => box(a, 'ironDark', x0 + w * u, y + Math.sin(u * Math.PI) * rise + 0.1, (z0 + z1) / 2, 0.25, 0.25, z1 - z0));
  };
  // a weapon rack against a wall (ry: facing), pikes with spade heads and a round shield
  const rack = (a, x, y, z, ry, n = 5) => {
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    const L = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const [bx, bz] = L(0, 0);
    put(a, 'wood', G.box, bx, y + 0.5, bz, [0, ry, 0], [n * 0.5 + 0.4, 0.12, 0.3]);
    put(a, 'wood', G.box, bx, y + 2.4, bz, [0, ry, 0], [n * 0.5 + 0.4, 0.12, 0.3]);
    for (let i = 0; i < n; i++) {
      const [px, pz] = L((i - (n - 1) / 2) * 0.5, -0.05);
      put(a, 'wood', G.rod, px, y + 1.9, pz, [0, 0, 0], [1.6, 3.4, 1.6]);
      put(a, 'steel', G.spadeHead, px, y + 3.85, pz, [0, ry, 0], [0.35, 0.35, 0.35]);
    }
    const [sx, sz] = L(0, 0.25);
    put(a, 'ironDark', G.disc, sx, y + 1.45, sz, [Math.PI / 2, 0, -ry], [0.7, 0.7, 0.7]);
    put(a, 'steel', G.boss, sx, y + 1.45, sz, [Math.PI / 2, 0, -ry], [1, 1, 1]);
    for (let s = -1; s <= 1; s += 2) {
      const [ex, ez] = L(s * (n * 0.25 + 0.2), 0);
      put(a, 'wood', G.box, ex, y + 1.4, ez, [0, ry, 0], [0.12, 2.8, 0.12]);
    }
  };
  // a decorative suit of armour on a plinth (smoked steel)
  const armourStand = (a, x, z, ry, y = 0) => {
    box(a, 'slateDark', x, y + 0.2, z, 1.2, 0.4, 1.2);
    // legs, tassets, breastplate, pauldrons, arms, helm with a spade crest
    put(a, 'steel', G.cyl, x - 0.17, y + 0.95, z, [0, ry, 0], [0.24, 1.1, 0.26]);
    put(a, 'steel', G.cyl, x + 0.17, y + 0.95, z, [0, ry, 0], [0.24, 1.1, 0.26]);
    put(a, 'ironDark', G.cyl, x, y + 1.55, z, [0, ry, 0], [0.62, 0.32, 0.5]);
    put(a, 'steel', G.sphere, x, y + 2.0, z, [0, ry, 0], [0.62, 0.78, 0.44]);
    put(a, 'steel', G.sphere, x - 0.38, y + 2.32, z, [0, ry, 0.3], [0.34, 0.24, 0.34]);
    put(a, 'steel', G.sphere, x + 0.38, y + 2.32, z, [0, ry, -0.3], [0.34, 0.24, 0.34]);
    put(a, 'steel', G.cyl, x - 0.45, y + 1.85, z, [0, ry, 0.1], [0.16, 0.85, 0.16]);
    put(a, 'steel', G.cyl, x + 0.45, y + 1.85, z, [0, ry, -0.1], [0.16, 0.85, 0.16]);
    put(a, 'steel', G.cyl, x, y + 2.68, z, [0, ry, 0], [0.34, 0.42, 0.36]);
    put(a, 'ironDark', G.sphere, x, y + 2.9, z, [0, ry, 0], [0.34, 0.2, 0.36]);
    put(a, 'steel', G.spadeHead, x, y + 3.15, z, [0, ry + Math.PI / 2, 0], [0.24, 0.24, 0.24]);
    put(a, 'cold', G.box, x + Math.sin(ry) * 0.17, y + 2.72, z + Math.cos(ry) * 0.17, [0, ry, 0], [0.22, 0.03, 0.03]);
  };
  const banner = (a, x, y, z, ry, w = 1.6, h = 4) => {
    put(a, 'banner', G.plane, x, y, z, [0, ry, 0], [w, h, 1]);
    put(a, 'iron', G.rod, x, y + h / 2 + 0.1, z, [0, ry, Math.PI / 2], [1, w + 0.4, 1]);
  };

  // ---------- the sky above the storm: a dark dome, cold churning clouds, the rift ----------
  const SH = { time: { value: 0 }, flash: { value: 0 }, bolt: { value: V3(0, 1, 0) }, fp: { value: V3(0, 0, 0) }, cam: { value: V3() } };
  const HOR = new THREE.Color('#141a24');
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
            vec3 zen = vec3(0.012, 0.016, 0.03);
            vec3 col = mix(uHor, zen, smoothstep(-0.02, 0.55, y));
            vec2 q = d.xz / (0.18 + max(y, 0.0)) * 0.8;
            float n = fbm(q * 1.2 + vec2(uTime * 0.014, uTime * 0.006));
            float n2 = fbm(q * 3.1 - vec2(uTime * 0.022, 0.0));
            float c = smoothstep(0.38, 0.86, n * 0.75 + n2 * 0.35) * smoothstep(0.04, 0.3, y);
            col = mix(col, vec3(0.07, 0.08, 0.1) * (0.7 + 0.6 * n2), c * 0.85);
            // the rift: a thin cold tear across the sky, silver at its lips, white in its heart
            vec3 N = normalize(vec3(0.3, 0.2, 0.93));
            float along = atan(d.z, d.x);
            float wid = 0.02 + 0.04 * fbm(vec2(along * 3.0, uTime * 0.03));
            float k = abs(dot(d, N));
            float lip = exp(-k / (wid * 1.1)) * smoothstep(0.08, 0.4, y);
            float core = exp(-k / (wid * 0.22)) * smoothstep(0.12, 0.45, y);
            col += vec3(0.32, 0.4, 0.55) * lip * 0.35 + vec3(0.9, 0.95, 1.0) * core * 0.6;
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.15 + 0.9 * c) * vec3(0.78, 0.84, 1.0) * (0.35 + 1.3 * near);
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
            vec3 col = mix(vec3(0.03, 0.035, 0.05), vec3(0.2, 0.22, 0.27), smoothstep(0.3, 0.82, h));
            float dd = length(vW.xz - uFP.xy);
            col += vec3(0.66, 0.72, 1.0) * uFP.z * exp(-dd / 70.0) * (0.4 + h) * 1.4;
            col += uFlash * 0.22 * vec3(0.72, 0.76, 1.0) * h;
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

  // ---------- lightning: jagged cross-ribbons, a white core in a cold halo ----------
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
      const core = mk('#eef2ff', 3, 1);
      const halo = mk('#8aa6ff', 1.2, 0.3);
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
  // the storm keeps striking outside (each screen its own: it is only weather)
  let stormT = 3;
  let innerT = 1;
  const tickStorm = (dt, me) => {
    stormT -= dt;
    innerT -= dt;
    if (innerT <= 0) {
      innerT = 1.4 + Math.random() * 3;
      const a = Math.random() * TAU;
      const d = 60 + Math.random() * 300;
      SH.fp.value.set(me.x + Math.sin(a) * d, me.z + Math.cos(a) * d, 0.6 + Math.random() * 0.6);
      flash(0.12);
    }
    if (stormT <= 0) {
      stormT = 6 + Math.random() * 8;
      // outside the walls, seen through the windows and the vault
      const a = Math.random() * TAU;
      const d = 110 + Math.random() * 220;
      const x = me.x + Math.sin(a) * d;
      const z = me.z + Math.cos(a) * d;
      const p0 = V3(x, O.y - 64, z);
      const p1 = V3(x + (Math.random() - 0.5) * 60, O.y + 140 + Math.random() * 60, z + (Math.random() - 0.5) * 60);
      const up = Math.random() < 0.4;
      bolt(up ? p0 : p1, up ? p1 : p0, { w: 0.7, life: 0.6, flash: 0.55 + Math.random() * 0.45 });
      SH.fp.value.set(x, z, 1.4);
      AU.thunder(d);
    }
  };

  // ---------- the figures: tall Veilleurs in court-card costumes and masks ----------
  // rank 'V' | 'D' | 'R'. Built facing +z. update(dt, t, s) with s = { talk, bow (0..1), act,
  // look (V3 or null), walk (0..1) }. Every instance has its own materials (the cinematic
  // disposes its copies).
  const FIG = {
    V: { h: 2.75, robe: '#14161c', skin: '#9aa4c4', trim: '#c9d1dc' },
    D: { h: 2.9, robe: '#101218', skin: '#a69ac6', trim: '#d9dee6' },
    R: { h: 3.2, robe: '#0c0d12', skin: '#8f9ab8', trim: '#e6eaf0' },
  };
  const figure = (rank) => {
    const F = FIG[rank];
    const H = F.h;
    const g = new THREE.Group();
    const mk = (c, r, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
    const robeM = mk(F.robe, 0.85);
    const velvet = mk('#1e2433', 0.9);
    const steel = mk('#6f7783', 0.42, { metalness: 0.85 });
    const silver = mk(F.trim, 0.4, { metalness: 0.6 });
    const skin = mk(F.skin, 0.5, { metalness: 0.05 });
    const glove = mk('#d8dce4', 0.6);
    const white = mk('#eef0f4', 0.7);
    if (typeof Assets !== 'undefined' && Assets.envify) [steel, silver].forEach((m) => Assets.envify(m, 0.6));
    if (!T.soft) makeTextures();
    const tab = new THREE.MeshStandardMaterial({ map: T['tab' + rank], roughness: 0.85, side: THREE.DoubleSide });
    const maskM = new THREE.MeshStandardMaterial({ map: T['mask' + rank], roughness: 0.35, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    const add = (par, geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      par.add(m);
      return m;
    };
    const V2 = (x, y) => new THREE.Vector2(x, y);
    // the robe: a lathe flaring to the floor, the body above it (sways, bows)
    const hem = rank === 'D' ? 0.85 : rank === 'R' ? 0.78 : 0.55;
    const robe = add(
      g,
      new THREE.LatheGeometry(
        [V2(0, 0), V2(hem, 0.02), V2(hem * 0.9, H * 0.12), V2(hem * 0.62, H * 0.3), V2(0.34, H * 0.46), V2(0.3, H * 0.5), V2(0, H * 0.5)].map((v) => V2(v.x, v.y)),
        32,
      ),
      robeM,
    );
    // the hem's silver band
    add(g, new THREE.TorusGeometry(hem * 0.98, 0.035, 8, 40).rotateX(Math.PI / 2), silver, 0, 0.05, 0);
    const body = new THREE.Group();
    body.position.y = H * 0.46;
    g.add(body);
    // torso: a tapered velvet doublet, the tabard over it (front and back)
    add(body, new THREE.CylinderGeometry(0.3, 0.34, H * 0.26, 20).translate(0, H * 0.13, 0), velvet);
    const tabF = add(body, new THREE.PlaneGeometry(0.46, H * 0.48), tab, 0, H * 0.02, 0.35);
    tabF.rotation.x = -0.06;
    const tabB = add(body, new THREE.PlaneGeometry(0.46, H * 0.48), tab, 0, H * 0.02, -0.35);
    tabB.rotation.set(0.06, Math.PI, 0);
    add(body, new THREE.TorusGeometry(0.33, 0.04, 8, 28).rotateX(Math.PI / 2), silver, 0, H * 0.02, 0);
    // the card itself, hung on the chest like an order
    const card = add(body, new THREE.PlaneGeometry(0.2, 0.28), new THREE.MeshBasicMaterial({ map: Tex.card(rank, '♠'), toneMapped: false }), 0, H * 0.18, 0.37);
    card.material.color.setScalar(0.85);
    // smoked-steel pauldrons, a white ruff
    [-1, 1].forEach((s) => {
      const pd = add(body, new THREE.SphereGeometry(0.2, 16, 10, 0, TAU, 0, Math.PI / 2), steel, s * 0.36, H * 0.26, 0);
      pd.scale.set(1.15, 0.8, 1.1);
      pd.rotation.z = -s * 0.35;
    });
    const ruff = add(body, new THREE.TorusGeometry(0.2, 0.07, 8, 24).rotateX(Math.PI / 2), white, 0, H * 0.27, 0);
    ruff.scale.set(1, 1, 1);
    // arms: shoulder group → upper arm → elbow group → forearm, gloved hand
    const arms = [-1, 1].map((s) => {
      const sh = new THREE.Group();
      sh.position.set(s * 0.4, H * 0.24, 0);
      body.add(sh);
      const ua = H * 0.14;
      add(sh, new THREE.CylinderGeometry(0.075, 0.065, ua, 10).translate(0, -ua / 2, 0), velvet);
      // the puffed sleeve
      add(sh, new THREE.SphereGeometry(0.11, 12, 8), robeM, 0, -0.06, 0).scale.set(1, 1.3, 1);
      const el = new THREE.Group();
      el.position.y = -ua;
      sh.add(el);
      add(el, new THREE.CylinderGeometry(0.065, 0.05, ua, 10).translate(0, -ua / 2, 0), velvet);
      add(el, new THREE.CylinderGeometry(0.075, 0.08, 0.08, 12), silver, 0, -ua * 0.92, 0);
      const hand = new THREE.Group();
      hand.position.y = -ua - 0.04;
      el.add(hand);
      add(hand, new THREE.SphereGeometry(0.065, 12, 8).scale(0.8, 1.2, 0.6), glove, 0, -0.05, 0);
      return { sh, el, hand, s };
    });
    // neck and head: a Veilleur's egg head behind the porcelain mask
    const neck = new THREE.Group();
    neck.position.y = H * 0.3;
    body.add(neck);
    add(neck, new THREE.CylinderGeometry(0.06, 0.07, 0.14, 10).translate(0, 0.07, 0), skin);
    const head = new THREE.Group();
    head.position.y = 0.3;
    neck.add(head);
    add(head, new THREE.SphereGeometry(0.2, 24, 18).scale(1, 1.25, 1.05), skin);
    // a slice of sphere centred on +z (phi = PI / 2): the texture spans the whole slice
    add(head, new THREE.SphereGeometry(0.215, 24, 16, Math.PI / 2 - Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.18, Math.PI * 0.62).scale(1, 1.28, 1.1), maskM, 0, 0, 0.02);
    // eyes glowing through the mask
    const eyes = [-1, 1].map((s) => {
      const e = add(head, new THREE.PlaneGeometry(0.09, 0.05), new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#cfe4ff').multiplyScalar(1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), s * 0.085, 0.056, 0.262);
      return e;
    });
    // headwear
    const hat = new THREE.Group();
    hat.position.y = 0.22;
    head.add(hat);
    if (rank === 'V') {
      // a flat velvet toque with a long white plume
      add(hat, new THREE.CylinderGeometry(0.27, 0.24, 0.1, 24), velvet, 0, 0.02, 0).rotation.z = 0.1;
      add(hat, new THREE.TorusGeometry(0.24, 0.025, 6, 24).rotateX(Math.PI / 2), silver, 0, -0.02, 0);
      const pl = add(hat, new THREE.SphereGeometry(0.08, 10, 8).scale(0.6, 3.2, 0.6), white, 0.18, 0.2, -0.05);
      pl.rotation.z = -0.7;
    } else if (rank === 'D') {
      // a tall headdress: a velvet hennin, an iron tiara of spades, a long dark veil
      add(hat, new THREE.ConeGeometry(0.16, 0.7, 20).translate(0, 0.35, 0), velvet, 0, 0.02, -0.04).rotation.x = -0.25;
      add(hat, new THREE.TorusGeometry(0.2, 0.02, 6, 28).rotateX(Math.PI / 2), silver, 0, -0.02, 0);
      for (let i = -2; i <= 2; i++) {
        const sp = add(hat, new THREE.ShapeGeometry(spadeShape()), silver, Math.sin(i * 0.35) * 0.2, 0.07, Math.cos(i * 0.35) * 0.2);
        sp.scale.setScalar(0.09);
        sp.rotation.y = i * 0.35;
      }
      const veil = add(hat, new THREE.ConeGeometry(0.34, 1.1, 24, 1, true).translate(0, -0.55, 0), new THREE.MeshStandardMaterial({ color: '#0d1018', roughness: 0.9, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }), 0, 0.4, -0.12);
      veil.rotation.x = 0.12;
    } else {
      // an iron crown with spade fleurons over a velvet cap
      add(hat, new THREE.SphereGeometry(0.21, 20, 10, 0, TAU, 0, Math.PI / 2), velvet, 0, -0.02, 0);
      add(hat, new THREE.CylinderGeometry(0.24, 0.23, 0.12, 24, 1, true), steel, 0, 0.03, 0).material = steel;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const sp = add(hat, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.2, bevelEnabled: false }).translate(0, 0, -0.1), steel, Math.sin(a) * 0.235, 0.16, Math.cos(a) * 0.235);
        sp.scale.setScalar(0.12);
        sp.rotation.y = a;
      }
      add(hat, new THREE.SphereGeometry(0.035, 10, 8), mk('#e8f0ff', 0.2, { emissive: '#9ab8ff', emissiveIntensity: 1.2 }), 0, 0.12, 0.24);
      // a long mantle
      const mantle = add(body, new THREE.CylinderGeometry(0.42, 0.9, H * 0.72, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76).translate(0, -H * 0.36 + H * 0.26, 0), new THREE.MeshStandardMaterial({ color: '#1a2132', roughness: 0.9, side: THREE.DoubleSide }), 0, 0, -0.02);
      void mantle;
    }
    // props in the right hand
    const prop = new THREE.Group();
    arms[1].hand.add(prop);
    if (rank === 'V') {
      // a pike: a long shaft with a spade blade
      add(prop, new THREE.CylinderGeometry(0.025, 0.025, 3.2, 8), mk('#3a2a20', 0.7), 0, 0.3, 0);
      const bl = add(prop, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }).translate(0, 0, -0.02), steel, 0, 2.05, 0);
      bl.scale.setScalar(0.42);
      add(prop, new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), silver, 0, 1.75, 0);
    } else if (rank === 'D') {
      // a folding fan of black lace on silver ribs
      const fan = new THREE.Group();
      fan.position.y = -0.08;
      prop.add(fan);
      const lace = new THREE.MeshStandardMaterial({ color: '#0e1016', roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
      const blade = add(fan, new THREE.CircleGeometry(0.42, 24, Math.PI * 0.15, Math.PI * 0.7), lace);
      blade.rotation.x = -Math.PI / 2;
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        const rib = add(fan, new THREE.BoxGeometry(0.008, 0.008, 0.42).translate(0, 0, 0.21), silver);
        rib.rotation.y = Math.PI / 2 - a;
      }
      prop.userData.fan = fan;
    } else {
      // the sword, point down, held before him
      add(prop, new THREE.BoxGeometry(0.06, 1.5, 0.015), steel, 0, -0.85, 0);
      add(prop, new THREE.BoxGeometry(0.42, 0.05, 0.06), silver, 0, -0.06, 0);
      add(prop, new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), mk('#2a2f3a', 0.6), 0, 0.08, 0);
      add(prop, new THREE.SphereGeometry(0.05, 10, 8), silver, 0, 0.22, 0);
    }
    // juggling spades (the Valet), hidden unless juggling
    const jug = [];
    if (rank === 'V')
      for (let i = 0; i < 3; i++) {
        const sp = add(g, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02), steel);
        sp.scale.setScalar(0.22);
        sp.visible = false;
        jug.push(sp);
      }
    g.traverse((m) => {
      if (m.isMesh) m.frustumCulled = false;
    });
    const st = { bow: 0, talk: 0, act: 0, actK: null, look: 0 };
    const tmp = V3();
    const update = (dt, t, s = {}) => {
      st.bow = damp(st.bow, s.bow || 0, 2.4, dt);
      st.talk = Math.max(0, (s.talk || 0) > st.talk ? s.talk : st.talk - dt);
      const act = s.act || null;
      st.act = damp(st.act, act ? 1 : 0, 6, dt);
      if (act) st.actK = act;
      const breathe = Math.sin(t * 1.6 + H) * 0.012;
      const sway = Math.sin(t * 0.7 + H * 3) * 0.035;
      body.scale.set(1, 1 + breathe, 1);
      // a court bow: the torso folds, the right arm sweeps across, the left behind the back
      const b = ease(st.bow);
      body.rotation.x = b * 0.75;
      body.rotation.z = sway * (1 - b);
      robe.rotation.y = sway * 0.3;
      head.rotation.x = b * 0.25 + Math.sin(t * 9) * 0.04 * Math.min(1, st.talk);
      head.rotation.y = Math.sin(t * 0.5 + H) * 0.15 * (1 - b);
      if (s.look) {
        g.updateMatrixWorld();
        head.getWorldPosition(tmp);
        const want = Math.atan2(s.look.x - tmp.x, s.look.z - tmp.z) - g.rotation.y;
        head.rotation.y = clamp(Math.atan2(Math.sin(want), Math.cos(want)), -0.9, 0.9) * (1 - b);
      }
      const [L, Rr] = arms;
      let lx = 0.1 + Math.sin(t * 1.1) * 0.04;
      let lz = 0.18;
      let rx = -0.35;
      let rz = -0.12;
      let le = -0.5;
      let re = -0.9;
      const k = st.act;
      const ak = st.actK;
      if (ak === 'juggle') {
        lx = lerp(lx, -0.9, k);
        rx = lerp(rx, -0.9, k);
        le = lerp(le, -1.0 + Math.sin(t * 7) * 0.3, k);
        re = lerp(re, -1.0 + Math.sin(t * 7 + Math.PI) * 0.3, k);
      } else if (ak === 'throw') {
        const ph = (t * 1.4) % 1;
        rx = lerp(rx, -2.4 + ph * 2.2, k);
        rz = lerp(rz, -0.6, k);
        re = lerp(re, -0.2, k);
      } else if (ak === 'raise') {
        rx = lerp(rx, -2.8, k);
        re = lerp(re, -0.1, k);
      } else if (ak === 'point') {
        rx = lerp(rx, -1.5, k);
        re = lerp(re, -0.1, k);
      } else if (ak === 'dance') {
        lx = lerp(lx, -1.2, k);
        lz = lerp(lz, 0.9, k);
        le = lerp(le, -0.6, k);
        rx = lerp(rx, -1.6 + Math.sin(t * 2) * 0.3, k);
        rz = lerp(rz, -0.9, k);
        re = lerp(re, -0.4, k);
      }
      // the bow overrides
      rx = lerp(rx, -1.3, b);
      rz = lerp(rz, 0.5, b);
      re = lerp(re, -0.6, b);
      lx = lerp(lx, 0.6, b);
      lz = lerp(lz, -0.4, b);
      L.sh.rotation.set(lx, 0, lz);
      Rr.sh.rotation.set(rx, 0, rz);
      L.el.rotation.x = le;
      Rr.el.rotation.x = re;
      // props
      if (rank === 'V') {
        prop.rotation.set(1.3 * (1 - k * (ak === 'juggle' ? 1 : 0)), 0, 0);
        prop.visible = !(ak === 'juggle' && k > 0.5);
        jug.forEach((sp, i) => {
          sp.visible = ak === 'juggle' && k > 0.5;
          if (!sp.visible) return;
          const ph = t * 2.6 + (i * TAU) / 3;
          sp.position.set(Math.cos(ph) * 0.42, H * 0.62 + Math.abs(Math.sin(ph)) * 1.0, 0.5);
          sp.rotation.set(0, 0, t * 9 + i);
        });
      }
      if (rank === 'D' && prop.userData.fan) {
        prop.rotation.set(-0.4, 0, 0);
        prop.userData.fan.scale.setScalar(0.6 + 0.4 * Math.max(k, Math.min(1, st.talk)));
      }
      if (rank === 'R') prop.rotation.set(0.6 * (1 - k), 0, 0);
      const eg = 1.2 + Math.min(1, st.talk) * 1.2 + Math.sin(t * 3) * 0.15;
      eyes.forEach((e) => e.material.color.set('#cfe4ff').multiplyScalar(eg * (1 - b * 0.6)));
    };
    return { g, body, head, arms, prop, update, H, st };
  };

  // ---------- the darts of the Dame (épreuve sD): iron (black) and glass (cold blue) spades ----------
  const dartGeo = () => G.dart || (G.dart = new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }).translate(0, 0, -0.03).rotateX(Math.PI / 2).scale(0.75, 0.75, 0.75));
  const dartModel = (kind) => {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const iron = kind === 'iron';
    const mat = iron
      ? new THREE.MeshStandardMaterial({ color: '#2a2e36', roughness: 0.35, metalness: 0.9, emissive: '#0a0c10' })
      : new THREE.MeshStandardMaterial({ color: '#bfe2ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: '#4a8cff', emissiveIntensity: 0.6 });
    if (iron && typeof Assets !== 'undefined' && Assets.envify) Assets.envify(mat, 0.8);
    const blade = new THREE.Mesh(dartGeo(), mat);
    // flat, point first along +z
    blade.rotation.set(0, 0, 0);
    body.add(blade);
    // a trail
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 1.8).rotateX(-Math.PI / 2).translate(0, 0, -1.1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(iron ? '#ffffff' : '#7ab8ff').multiplyScalar(iron ? 0.6 : 1.4), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    );
    body.add(trail);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color(iron ? '#ffd9a0' : '#8ac4ff').multiplyScalar(1.4), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    g.add(halo);
    g.traverse((m) => m.isMesh && (m.frustumCulled = false));
    return { g, body, blade, trail, halo };
  };

  // ---------- the great armour of the Roi (épreuve sR) ----------
  const armourModel = () => {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const mk = (c, r, mt, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt, ...o });
    const plate = mk('#353a44', 0.38, 0.9);
    const dark = mk('#16181d', 0.55, 0.85);
    const silverM = mk('#c9d1dc', 0.28, 0.95);
    const cloth = mk('#12141a', 0.9, 0.0, { side: THREE.DoubleSide });
    if (typeof Assets !== 'undefined' && Assets.envify) [plate, dark, silverM].forEach((m) => Assets.envify(m, 0.75));
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const add = (par, geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      par.add(m);
      return m;
    };
    const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg);
    const rivetGeo = new THREE.SphereGeometry(1, 8, 6);
    const rivets = (par, pts, r = 0.045) => pts.forEach(([x, y, z]) => add(par, rivetGeo, silverM, x, y, z).scale.setScalar(r));
    // legs: thigh (cuisse), knee (poleyn), greave, a pointed sabaton
    const legs = [-1, 1].map((s) => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.62, 2.35, 0);
      body.add(hip);
      add(hip, lathe([[0, 0], [0.36, -0.05], [0.38, -0.5], [0.31, -1.1], [0, -1.15]]), plate);
      add(hip, new THREE.TorusGeometry(0.33, 0.04, 6, 20).rotateX(Math.PI / 2), silverM, 0, -0.5, 0);
      const knee = new THREE.Group();
      knee.position.y = -1.18;
      hip.add(knee);
      add(knee, new THREE.SphereGeometry(0.34, 14, 10), dark).scale.set(1, 0.9, 1.1);
      add(knee, new THREE.SphereGeometry(0.4, 14, 8, -0.9, 1.8, 0.7, 1.1), plate, 0, 0, 0.05);
      add(knee, lathe([[0, 0], [0.33, -0.06], [0.36, -0.5], [0.3, -1.0], [0, -1.02]]), plate, 0, -0.1, 0);
      const sab = add(knee, new THREE.BoxGeometry(0.62, 0.24, 1.15), dark, 0, -1.12, 0.22);
      add(sab, new THREE.ConeGeometry(0.28, 0.5, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), dark, 0, -0.02, 0.75).scale.set(1, 0.5, 1);
      return { hip, knee };
    });
    // the faulds: two rows of curved lames, a silver belt
    for (let row = 0; row < 2; row++) {
      const r0 = 1.0 + row * 0.08;
      add(body, new THREE.CylinderGeometry(r0 - 0.05, r0 + 0.08, 0.42, 24, 1, true), row ? plate : dark, 0, 2.55 - row * 0.36, 0).scale.set(1, 1, 0.8);
    }
    add(body, new THREE.TorusGeometry(0.95, 0.07, 8, 32).rotateX(Math.PI / 2), silverM, 0, 2.78, 0).scale.set(1, 1, 0.8);
    const torso = new THREE.Group();
    torso.position.y = 2.75;
    body.add(torso);
    // the breastplate: a barrel lathe, flattened front to back, a central ridge
    add(torso, lathe([[0, 0], [0.92, 0.02], [1.02, 0.35], [1.12, 0.9], [1.08, 1.35], [0.8, 1.62], [0, 1.66]], 28), plate).scale.set(1, 1, 0.74);
    add(torso, new THREE.BoxGeometry(0.08, 1.4, 0.12), silverM, 0, 0.85, 0.8);
    const chestSpade = add(torso, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }), silverM, 0, 1.0, 0.8);
    chestSpade.scale.setScalar(0.5);
    rivets(torso, [[-0.7, 0.4, 0.62], [0.7, 0.4, 0.62], [-0.85, 0.95, 0.6], [0.85, 0.95, 0.6], [-0.55, 1.4, 0.5], [0.55, 1.4, 0.5]]);
    // the gorget
    [0, 1].forEach((i) => add(torso, new THREE.TorusGeometry(0.5 - i * 0.07, 0.09, 8, 24).rotateX(Math.PI / 2), i ? silverM : dark, 0, 1.62 + i * 0.14, 0));
    // the back plate: a frame of rivets around the core (its only weak point)
    const core = new THREE.Group();
    core.position.set(0, 0.95, -0.83);
    torso.add(core);
    const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfeaff').multiplyScalar(2.2), toneMapped: false });
    const coreSp = add(core, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }).translate(0, 0, -0.1), coreMat);
    coreSp.scale.setScalar(0.6);
    coreSp.rotation.y = Math.PI;
    const coreHalo = add(core, new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#9ec4ff').multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 0, 0, -0.14);
    coreHalo.rotation.y = Math.PI;
    add(core, new THREE.TorusGeometry(0.55, 0.06, 8, 28), dark, 0, 0, -0.04);
    for (let i = 0; i < 4; i++) add(core, new THREE.BoxGeometry(0.05, 1.0, 0.05), dark, -0.3 + i * 0.2, 0, -0.16);
    rivets(core, Array.from({ length: 10 }, (_, i) => [Math.cos((i / 10) * TAU) * 0.66, Math.sin((i / 10) * TAU) * 0.66, -0.04]), 0.04);
    // pauldrons: three lames each, a silver rim
    [-1, 1].forEach((s) => {
      for (let k = 0; k < 3; k++) {
        const p = add(torso, new THREE.SphereGeometry(0.66 - k * 0.07, 18, 10, 0, TAU, 0, Math.PI / 2), k ? dark : plate, s * (1.18 + k * 0.05), 1.45 - k * 0.2, 0);
        p.scale.set(1.12, 0.85, 1.0);
        p.rotation.z = -s * (0.3 + k * 0.12);
      }
      add(torso, new THREE.TorusGeometry(0.62, 0.035, 6, 24).rotateX(Math.PI / 2), silverM, s * 1.2, 1.42, 0).rotation.z = -s * 0.3;
    });
    // the great helm: a cylinder with a domed top, a cross of cold light, a crest of spades
    const head = new THREE.Group();
    head.position.y = 1.78;
    torso.add(head);
    add(head, lathe([[0, 0], [0.44, 0.02], [0.47, 0.5], [0.45, 0.85], [0.3, 1.08], [0, 1.14]], 24), plate);
    const slitM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8e6ff').multiplyScalar(2.4), toneMapped: false });
    const slit = add(head, new THREE.BoxGeometry(0.66, 0.07, 0.06), slitM, 0, 0.6, 0.44);
    add(head, new THREE.BoxGeometry(0.07, 0.48, 0.06), slitM, 0, 0.42, 0.45);
    rivets(head, [[-0.3, 0.2, 0.35], [0.3, 0.2, 0.35], [-0.3, 0.85, 0.32], [0.3, 0.85, 0.32]], 0.035);
    for (let i = -1; i <= 1; i++) {
      const sp = add(head, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025), silverM, 0, 1.36 + (i === 0 ? 0.12 : 0), i * 0.3);
      sp.scale.setScalar(0.32);
      sp.rotation.y = Math.PI / 2;
    }
    // arms: rerebrace, couter, vambrace, gauntlet
    const mkArm = (s) => {
      const sh = new THREE.Group();
      sh.position.set(s * 1.25, 1.3, 0);
      torso.add(sh);
      add(sh, lathe([[0, 0], [0.28, -0.04], [0.27, -0.6], [0.24, -1.15], [0, -1.18]], 14), plate);
      const el = new THREE.Group();
      el.position.y = -1.2;
      sh.add(el);
      add(el, new THREE.SphereGeometry(0.27, 12, 8), dark);
      add(el, new THREE.ConeGeometry(0.2, 0.36, 4).rotateZ((-s * Math.PI) / 2), plate, s * 0.25, 0, -0.05);
      add(el, lathe([[0, 0], [0.26, -0.04], [0.3, -0.6], [0.26, -1.05], [0, -1.08]], 14), plate, 0, -0.05, 0);
      const hand = new THREE.Group();
      hand.position.y = -1.15;
      el.add(hand);
      add(hand, new THREE.BoxGeometry(0.42, 0.42, 0.46), dark);
      add(hand, new THREE.BoxGeometry(0.38, 0.12, 0.42), plate, 0, 0.24, 0);
      return { sh, el, hand };
    };
    const armL = mkArm(1);
    const armR = mkArm(-1);
    // the pavise, carried before it (its front stops everything): a tall shield with a spade
    const shield = new THREE.Group();
    shield.position.set(0.75, 0.25, 1.35);
    shield.rotation.y = -0.18;
    torso.add(shield);
    const pav = add(shield, new THREE.BoxGeometry(2.4, 3.9, 0.22), dark);
    pav.position.y = 0.2;
    add(shield, new THREE.BoxGeometry(2.5, 0.16, 0.28), silverM, 0, 2.15, 0);
    add(shield, new THREE.BoxGeometry(2.5, 0.16, 0.28), silverM, 0, -1.75, 0);
    add(shield, new THREE.BoxGeometry(0.16, 3.9, 0.28), silverM, -1.2, 0.2, 0);
    add(shield, new THREE.BoxGeometry(0.16, 3.9, 0.28), silverM, 1.2, 0.2, 0);
    const em = add(shield, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), silverM, 0, 0.35, 0.12);
    em.scale.setScalar(1.45);
    rivets(shield, [[-0.95, 1.9, 0.13], [0.95, 1.9, 0.13], [-0.95, -1.5, 0.13], [0.95, -1.5, 0.13], [-0.95, 0.2, 0.13], [0.95, 0.2, 0.13]], 0.06);
    // the pike, in the right gauntlet
    const pike = new THREE.Group();
    armR.hand.add(pike);
    add(pike, new THREE.CylinderGeometry(0.07, 0.07, 6.6, 10), mk('#2a2018', 0.7, 0.1), 0, 0.6, 0);
    add(pike, new THREE.CylinderGeometry(0.11, 0.11, 0.3, 10), silverM, 0, 3.9, 0);
    const blade = add(pike, new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }).translate(0, 0, -0.04), silverM, 0, 4.6, 0);
    blade.scale.setScalar(1.1);
    pike.rotation.x = Math.PI / 2;
    // two black tabard panels at the hips (the back stays open on the core)
    [-1, 1].forEach((s) => {
      const tb = add(body, new THREE.PlaneGeometry(0.7, 1.5), cloth, s * 0.45, 1.85, 0.86);
      tb.rotation.x = -0.12;
    });
    const eye = slit;
    g.traverse((m) => m.isMesh && (m.frustumCulled = false));
    return { g, body, torso, head, legs, armL, armR, pavise: shield, pike, core, coreMat, coreHalo, eye, heart: core };
  };

  // ---------- interactive pieces of the gallery (animated from ST in update) ----------
  const herses = [];
  const bridges = [];
  const winches = [];
  const targets = [];
  const maces = [];
  const pistons = [];
  const rings = [];
  let spineGroup = null;
  const makeHerse = (i, z) => {
    const g = new THREE.Group();
    AREA.A.add(g);
    const bars = LvKit.batch();
    for (let k = 0; k < 12; k++) bars.add(G.box, V3(-11.6 + k * 0.9 + 0.45, 4.2, 0), null, [0.14, 8.4, 0.14]);
    for (let k = 0; k < 5; k++) bars.add(G.box, V3(-6.6, 0.6 + k * 1.9, 0), null, [10.6, 0.16, 0.16]);
    for (let k = 0; k < 12; k++) bars.add(G.cone, V3(-11.6 + k * 0.9 + 0.45, -0.25, 0), [Math.PI, 0, 0], [0.12, 0.5, 0.12]);
    const m = bars.mesh(M.ironDark);
    m.position.y = 0;
    g.add(m);
    g.position.copy(P(0, 1.2, z));
    const b = col(-6.6, 1.2 + 4.4, z, 11.2, 8.8, 0.5);
    herses.push({ i, g, b, z, k: 0 });
  };
  const makeBridge = (i, z0, z1) => {
    const pv = new THREE.Group();
    pv.position.copy(P((A.HX[0] + A.HX[1]) / 2, A.HY, z1));
    AREA.A.add(pv);
    const L = z1 - z0;
    const w = A.HX[1] - A.HX[0];
    const deck = new THREE.Mesh(G.box, M.wood);
    deck.scale.set(w - 0.4, 0.3, L);
    deck.position.set(0, -0.15, -L / 2);
    pv.add(deck);
    const edge = LvKit.batch();
    edge.add(G.box, V3(-(w - 0.4) / 2, -0.15, -L / 2), null, [0.25, 0.4, L]);
    edge.add(G.box, V3((w - 0.4) / 2, -0.15, -L / 2), null, [0.25, 0.4, L]);
    for (let k = 0; k < 6; k++) edge.add(G.box, V3(0, -0.02, -0.8 - (k * (L - 1.6)) / 5), null, [w - 0.4, 0.06, 0.12]);
    pv.add(edge.mesh(M.iron));
    // the chains up to the far gate
    const b = col((A.HX[0] + A.HX[1]) / 2, A.HY - 0.2, (z0 + z1) / 2, w - 0.4, 0.4, L);
    b.on = false;
    bridges.push({ i, pv, b, k: 0 });
  };
  const makeWinch = (i, x, z) => {
    const g = new THREE.Group();
    g.position.copy(P(x, A.HY, z));
    AREA.A.add(g);
    const post = new THREE.Mesh(G.box, M.iron);
    post.scale.set(0.5, 1.2, 0.5);
    post.position.y = 0.6;
    g.add(post);
    const wheel = new THREE.Group();
    wheel.position.set(0.4, 1.0, 0);
    g.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), M.steel);
    rim.rotation.y = Math.PI / 2;
    wheel.add(rim);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(G.box, M.steel);
      sp.scale.set(0.05, 0.84, 0.05);
      sp.rotation.x = (k * Math.PI) / 4;
      wheel.add(sp);
    }
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: T.plate, roughness: 0.5, metalness: 0.4 }));
    plate.position.set(0, 0.95, 0.26);
    g.add(plate);
    // a cold glow ring on the floor when someone holds it
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(1.6), transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
    ring.position.y = 0.03;
    g.add(ring);
    winches.push({ i, g, wheel, ring, k: 0, a: 0 });
  };
  const makeTarget = (i, x, z) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 1.2, z));
    AREA.A.add(g);
    const post = new THREE.Mesh(G.box, M.wood);
    post.scale.set(0.2, 1.6, 0.2);
    post.position.y = 0.8;
    g.add(post);
    const pv = new THREE.Group();
    pv.position.y = 1.7;
    g.add(pv);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 32).rotateZ(Math.PI / 2), [M.ironDark, new THREE.MeshStandardMaterial({ map: T.target, roughness: 0.5, metalness: 0.5 }), new THREE.MeshStandardMaterial({ map: T.target, roughness: 0.5, metalness: 0.5 })]);
    pv.add(sh);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color('#cfe0ff').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    glow.rotation.y = Math.PI / 2;
    glow.position.x = 0.1;
    pv.add(glow);
    targets.push({ i, g, pv, glow, k: 0, hit: 0 });
  };
  const makeMace = (x, z, i) => {
    const pv = new THREE.Group();
    pv.position.copy(P(x, 10.5, z));
    AREA.A.add(pv);
    const chain = new THREE.Mesh(G.rod, M.chain);
    chain.scale.set(1.2, 8.0, 1.2);
    chain.position.y = -4;
    pv.add(chain);
    const head = new THREE.Group();
    head.position.y = -8.4;
    pv.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), M.ironDark));
    const spikes = LvKit.batch();
    for (let k = 0; k < 14; k++) {
      const v = V3(Math.sin(k * 2.4) * Math.cos(k * 1.3), Math.cos(k * 2.4), Math.sin(k * 2.4) * Math.sin(k * 1.3)).normalize();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), v));
      spikes.add(G.cone, v.clone().multiplyScalar(0.72), [e.x, e.y, e.z], [0.14, 0.4, 0.14]);
    }
    head.add(spikes.mesh(M.steel));
    // the anchor in the vault
    const anchor = new THREE.Mesh(G.box, M.iron);
    anchor.scale.set(1.4, 0.4, 0.6);
    pv.add(anchor);
    maces.push({ pv, head, x, z, ph: i * 1.7, w: 2.25 + i * 0.25, amp: 0.6 });
  };
  const makePiston = (x, z, i) => {
    const g = new THREE.Group();
    AREA.A.add(g);
    const top = new THREE.Mesh(G.box, M.iron);
    top.scale.set(2.8, 0.5, 2.8);
    top.position.y = -0.25;
    g.add(top);
    const rim = new THREE.Mesh(G.box, M.steel);
    rim.scale.set(3.0, 0.12, 3.0);
    rim.position.y = -0.52;
    g.add(rim);
    const shaft = new THREE.Mesh(G.cyl, M.ironDark);
    shaft.scale.set(1.1, 9, 1.1);
    shaft.position.y = -5;
    g.add(shaft);
    const b = Phys.add([O.x + x - 1.4, O.y - 1, O.z + z - 1.4], [O.x + x + 1.4, O.y, O.z + z + 1.4], { dyn: true, surf: 'metal' });
    pistons.push({ g, b, x, z, ph: i * 1.6, top: 0 });
  };
  const makeRing = (x, y, z) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 10, 32), M.steel);
    m.position.copy(P(x, y, z));
    AREA.A.add(m);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.16, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(1.4), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    halo.position.copy(m.position);
    AREA.A.add(halo);
    // the chain to the vault
    const ch = new THREE.Mesh(G.rod, M.chain);
    ch.scale.set(1, 3.4, 1);
    ch.position.copy(P(x, y + 2.3, z));
    AREA.A.add(ch);
    rings.push({ m, halo });
  };

  // ---------- build ----------
  let card = null;
  const doors = {};
  const figs = {};
  let screen = null;
  const screens = {};
  const amb = { haze: new THREE.Color('#0d1118') };
  let flashLight = null;
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
    loadScans();
    G.box = new THREE.BoxGeometry(1, 1, 1);
    G.plane = new THREE.PlaneGeometry(1, 1);
    G.planeH = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    G.rod = new THREE.CylinderGeometry(0.04, 0.04, 1, 6);
    G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    G.cone = new THREE.ConeGeometry(0.5, 1, 8);
    G.sphere = new THREE.SphereGeometry(0.5, 14, 10);
    G.torus = new THREE.TorusGeometry(1, 0.05, 6, 32);
    G.cup = new THREE.CylinderGeometry(0.07, 0.05, 0.12, 8);
    G.flame = new THREE.SphereGeometry(0.06, 8, 6).scale(1, 1.8, 1);
    G.disc = new THREE.CylinderGeometry(1, 1, 0.08, 24);
    G.boss = new THREE.SphereGeometry(0.16, 12, 8);
    G.bowl = new THREE.CylinderGeometry(0.42, 0.22, 0.28, 16);
    G.shaftGeo = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2);
    G.fire = new THREE.SphereGeometry(0.2, 10, 8).scale(1, 1.7, 1);
    G.spadeHead = new THREE.ExtrudeGeometry(spadeShape(), { depth: 0.06, bevelEnabled: false }).translate(0, 0, -0.03);
    makeSky();
    makeBolts();

    // ===== A · La Galerie des râteliers =====
    {
      const a = 'A';
      // the start ledge, the end ledge
      slab(a, 'slate', 0, 0, 4.25, 25, 11.5, 0.8);
      slab(a, 'slate', 0, 0, (A.endZ + 113.5) / 2, 25, 113.5 - A.endZ, 0.8);
      // the pit: a floor of iron spikes far below, the pillars rising from it
      box(a, 'slateDark', 0, A.pitY - 0.5, 51, 25, 1, 82);
      {
        const r = rng(71);
        for (let i = 0; i < 260; i++) {
          const x = -12 + r() * 24;
          const z = 11 + r() * 80;
          if (Math.abs(x) < 1.2) continue;
          put(a, 'ironDark', G.cone, x, A.pitY + 0.6, z, [0, r() * 3, 0], [0.32, 1.2 + r() * 0.8, 0.32]);
        }
      }
      // ledge rims (iron), so the pit reads
      box(a, 'iron', 0, -0.4, 10.1, 25, 0.8, 0.3);
      box(a, 'iron', 0, -0.4, A.endZ - 0.1, 25, 0.8, 0.3);
      // the spine: a stone wall low, an iron grille above, a walk on top for the Valet de Pique
      {
        const z0 = 10;
        const z1 = A.endZ;
        box(a, 'stone', 0, (A.pitY + 2) / 2, (z0 + z1) / 2, 2, 2 - A.pitY, z1 - z0);
        col(0, 4, (z0 + z1) / 2, 2, 22, z1 - z0);
        for (let z = z0 + 0.4; z < z1; z += 0.55) put(a, 'ironDark', G.box, 0, 5.75, z, null, [0.1, 7.5, 0.1]);
        [2.2, 5.5, 9.3].forEach((y) => box(a, 'iron', 0, y, (z0 + z1) / 2, 0.3, 0.22, z1 - z0));
        box(a, 'iron', 0, 9.5, (z0 + z1) / 2, 2.2, 0.3, z1 - z0);
        for (let z = z0 + 4; z < z1; z += 8) {
          put(a, 'ironDark', G.box, 0, 5.75, z, null, [0.5, 7.6, 0.5]);
          put(a, 'steel', G.spadeHead, -0.3, 9.85, z, [0, Math.PI / 2, 0], [0.5, 0.5, 0.5]);
        }
      }
      // the low lane: stone pillars capped with iron
      A.pads.forEach(([x, z, w, d, top], i) => {
        slab(a, 'iron', x, top, z, w, d, 0.3);
        box(a, 'stone', x, (top - 0.3 + A.pitY) / 2, z, w * 0.86, top - 0.3 - A.pitY, d * 0.86);
        col(x, (top - 0.3 + A.pitY) / 2, z, w * 0.86, top - 0.3 - A.pitY, d * 0.86);
        if (w > 4) {
          box(a, 'steel', x, top + 0.02, z - d / 2 + 0.1, w, 0.04, 0.2);
          box(a, 'steel', x, top + 0.02, z + d / 2 - 0.1, w, 0.04, 0.2);
        }
        void i;
      });
      // the lane's own wall side: a stone plinth (no floor: the pit)
      // the high lane: iron walks on brackets, stairs from the start ledge
      const hx = (A.HX[0] + A.HX[1]) / 2;
      const hw = A.HX[1] - A.HX[0];
      A.walks.forEach(([z0, z1]) => {
        slab(a, 'iron', hx, A.HY, (z0 + z1) / 2, hw, z1 - z0, 0.35);
        // brackets to the wall
        for (let z = z0 + 1; z < z1; z += 2.5) put(a, 'ironDark', G.box, 11.4, A.HY - 1.4, z, [0, 0, -0.75], [0.25, 3.2, 0.25]);
        // a rail on the open (spine) side
        box(a, 'iron', A.HX[0] + 0.1, A.HY + 1.0, (z0 + z1) / 2, 0.08, 0.08, z1 - z0);
        col(A.HX[0] + 0.1, A.HY + 0.6, (z0 + z1) / 2, 0.2, 1.2, z1 - z0);
        for (let z = z0 + 0.3; z <= z1; z += 1.2) put(a, 'iron', G.box, A.HX[0] + 0.1, A.HY + 0.5, z, null, [0.07, 1.0, 0.07]);
      });
      {
        // stairs: 12 steps of 0.42 m from the start ledge up to the first walk
        const n = 12;
        for (let i = 0; i < n; i++) {
          const top = (A.HY * (i + 1)) / n;
          const z = 4 + i * 0.5 + 0.25;
          solid(a, 'slate', hx, top / 2, z, hw, top, 0.5);
        }
        box(a, 'iron', A.HX[0] + 0.1, 3, 7, 0.1, 0.1, 6.5);
      }
      // the outer walls, the vault, the end wall with its door
      longWall(a, -13, -2, 114, 16, true, -1);
      longWall(a, 13, -2, 114, 16, true, 1);
      crossWall(a, -2.6, -13, 13);
      crossWall(a, 114.6, -13, 13, 16, [-3, 3]);
      vault(a, -13, 13, -2, 114, 16, 4);
      // the door to the Salle d'armes (opens when the Valet is beaten)
      {
        const pv = new THREE.Group();
        pv.position.copy(P(0, 0, 114.6));
        AREA.A.add(pv);
        const leaves = [-1, 1].map((s) => {
          const lp = new THREE.Group();
          lp.position.x = s * 3;
          pv.add(lp);
          const leaf = new THREE.Mesh(G.box, M.ironDark);
          leaf.scale.set(3, 6.4, 0.3);
          leaf.position.set(-s * 1.5, 3.2, 0);
          lp.add(leaf);
          const em = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), M.emblem);
          em.position.set(-s * 1.5, 3.6, -0.17);
          em.rotation.y = Math.PI;
          lp.add(em);
          return lp;
        });
        doors.A = { leaves, k: 0, b: col(0, 3.2, 114.6, 6, 6.4, 0.6) };
      }
      // set dressing: racks and banners on the walls, armour stands on the ledges
      [-12.2, 12.2].forEach((x) => {
        const ry = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        rack(a, x, 0, 1.5, ry, 5);
        rack(a, x, 0, 104, ry, 6);
        banner(a, x * 0.995, 11.5, 34, ry, 1.8, 4.6);
        banner(a, x * 0.995, 11.5, 66, ry, 1.8, 4.6);
        banner(a, x * 0.995, 11.5, 98, ry, 1.8, 4.6);
      });
      armourStand(a, -10.5, 108, Math.PI / 2);
      armourStand(a, 10.5, 108, -Math.PI / 2);
      armourStand(a, -10.5, 98, Math.PI / 2);
      armourStand(a, 10.5, 98, -Math.PI / 2);
      banner(a, -6, 9, 113.9, Math.PI, 2.2, 5.5);
      banner(a, 6, 9, 113.9, Math.PI, 2.2, 5.5);
      // braziers of cold fire on the ledges, the big pillars and the walks
      [[-11, 1.5, 0], [-2.6, 8.6, 0], [-11, 28.6, 1.2], [-11, 59, 1.2], [10, 30, A.HY], [10, 49, A.HY], [10, 66, A.HY], [10, 86, A.HY], [-10.5, 94.5, 0], [10.5, 94.5, 0], [-10.5, 112, 0], [10.5, 112, 0]].forEach(([x, z, y]) => brazier(a, x, z, y));
      // chandeliers over each section
      [6, 30, 52, 74, 102].forEach((z, i) => chandelier(a, 0, 12.4, z, 2.2, 10, { top: 19.5, i: i === 4 ? 1.8 : 1.4, d: 26 }));
      // the moving pieces
      A.herse.forEach((z, i) => makeHerse(i, z));
      A.bridges.forEach(([z0, z1], i) => makeBridge(i, z0, z1));
      A.winch.forEach(([x, z], i) => makeWinch(i, x, z));
      A.target.forEach(([x, z], i) => makeTarget(i, x, z));
      A.maces.forEach(([x, z], i) => makeMace(x, z, i));
      A.pistons.forEach(([x, z], i) => makePiston(x, z, i));
      A.rings.forEach(([x, y, z]) => makeRing(x, y, z));
      // the far gates the bridges hang from: iron arches over the walks
      A.bridges.forEach(([z0, z1]) => {
        [z0, z1].forEach((z) => {
          box(a, 'ironDark', A.HX[0] + 0.15, A.HY + 2.4, z, 0.3, 4.8, 0.3);
          box(a, 'ironDark', A.HX[1] - 0.15, A.HY + 2.4, z, 0.3, 4.8, 0.3);
          box(a, 'iron', (A.HX[0] + A.HX[1]) / 2, A.HY + 4.8, z, A.HX[1] - A.HX[0], 0.35, 0.35);
        });
      });
      // the title screen over the start
      screen = makeScreen(5.2, 2.0, 1024);
      screen.mesh.position.copy(P(0, 12.8, 10.6));
      screen.mesh.rotation.y = Math.PI;
      AREA.A.add(screen.mesh);
      screens.A = screen;
      spineGroup = true;
    }

    // ===== B · La Salle d'armes (round) =====
    {
      const a = 'B';
      const [cx, cz] = B.c;
      // the corridor from the gallery's door
      slab(a, 'slate', 0, 0, (115.2 + 135) / 2, 7.2, 135 - 115.2, 0.6);
      solid(a, 'stone', -4.2, 4, 125, 1.2, 8, 20);
      solid(a, 'stone', 4.2, 4, 125, 1.2, 8, 20);
      box(a, 'ironDark', 0, 8.3, 125, 9.6, 0.6, 20);
      for (let z = 117; z < 135; z += 4) {
        put(a, 'ironDark', G.box, -3.5, 3.5, z, null, [0.3, 7, 0.4]);
        put(a, 'ironDark', G.box, 3.5, 3.5, z, null, [0.3, 7, 0.4]);
      }
      chandelier(a, 0, 6.8, 125, 0.9, 6, { top: 8, i: 1.0, d: 14 });
      // the round floor and the inlaid piste
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(B.r + 0.6, B.r + 0.6, 0.6, 64), M.slate);
      floor.position.copy(P(cx, -0.3, cz));
      AREA.B.add(floor);
      col(cx, -0.3, cz, (B.r + 0.6) * 2, 0.6, (B.r + 0.6) * 2);
      const piste = new THREE.Mesh(new THREE.PlaneGeometry(B.r * 2 - 1, B.r * 2 - 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.piste, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
      piste.position.copy(P(cx, 0.02, cz));
      AREA.B.add(piste);
      // the round wall: 16 segments, windows every other, iron pillars
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU;
        const am = a0 + Math.PI / n;
        const wx2 = cx + Math.sin(am) * (B.r + 1.2);
        const wz = cz + Math.cos(am) * (B.r + 1.2);
        const segW = 2 * (B.r + 1.2) * Math.tan(Math.PI / n) + 0.2;
        const doorS = i === 8 || i === 7;
        const doorN = i === 0 || i === 15;
        if (doorS || doorN) {
          put(a, 'stone', G.box, wx2, 11.25, wz, [0, am, 0], [segW, 9.5, 1.2]);
        } else if (i % 2) {
          put(a, 'stone', G.box, wx2, 1.75, wz, [0, am, 0], [segW, 3.5, 1.2]);
          put(a, 'stone', G.box, wx2, 13.5, wz, [0, am, 0], [segW, 5, 1.2]);
          put(a, 'glass', G.plane, wx2, 7.5, wz, [0, am, 0], [segW - 0.6, 7.6, 1]);
          WINDOWS.push({ a, x: wx2, z: wz, w: segW, side: 0 });
          shaft(a, wx2, wz, Math.sin(am), Math.cos(am), segW - 0.8);
        } else put(a, 'stone', G.box, wx2, 8, wz, [0, am, 0], [segW, 16, 1.2]);
        // iron pillars at the joints
        const px = cx + Math.sin(a0) * (B.r + 0.4);
        const pz = cz + Math.cos(a0) * (B.r + 0.4);
        put(a, 'ironDark', G.box, px, 8, pz, [0, a0, 0], [0.8, 16, 0.8]);
      }
      for (let i = 0; i < 72; i++) {
        const an = (i / 72) * TAU;
        const x = cx + Math.sin(an) * (B.r + 1.0);
        const z = cz + Math.cos(an) * (B.r + 1.0);
        if (Math.abs(x - cx) < 3.4) continue;
        col(x, 8, z, 1.4, 16, 1.4);
      }
      // the doors' side jambs (south to the corridor, north to the throne room)
      solid(a, 'stone', -4.4, 8, cz - B.r - 1.2, 2.4, 16, 1.4);
      solid(a, 'stone', 4.4, 8, cz - B.r - 1.2, 2.4, 16, 1.4);
      solid(a, 'stone', -4.4, 8, cz + B.r + 1.2, 2.4, 16, 1.4);
      solid(a, 'stone', 4.4, 8, cz + B.r + 1.2, 2.4, 16, 1.4);
      // the north door (opens when the Dame is beaten)
      {
        const pv = new THREE.Group();
        pv.position.copy(P(0, 0, cz + B.r + 1.2));
        AREA.B.add(pv);
        const leaves = [-1, 1].map((s) => {
          const lp = new THREE.Group();
          lp.position.x = s * 3;
          pv.add(lp);
          const leaf = new THREE.Mesh(G.box, M.ironDark);
          leaf.scale.set(3, 6.4, 0.3);
          leaf.position.set(-s * 1.5, 3.2, 0);
          lp.add(leaf);
          const em = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), M.emblem);
          em.position.set(-s * 1.5, 3.6, -0.17);
          em.rotation.y = Math.PI;
          lp.add(em);
          return lp;
        });
        doors.B = { leaves, k: 0, b: col(0, 3.2, cz + B.r + 1.2, 6, 6.4, 0.6) };
        box(a, 'ironDark', 0, 6.65, cz + B.r + 1.2, 7, 0.5, 1.4);
        solid(a, 'stone', 0, 11.6, cz + B.r + 1.2, 6.4, 8.8, 1.2);
      }
      // the cupola: iron ribs and glass
      {
        const ribs = 16;
        for (let i = 0; i < ribs; i++) {
          const an = (i / ribs) * TAU;
          for (let s = 0; s < 8; s++) {
            const u0 = s / 8;
            const u1 = (s + 1) / 8;
            const r0 = (B.r + 0.6) * Math.cos((u0 * Math.PI) / 2);
            const r1 = (B.r + 0.6) * Math.cos((u1 * Math.PI) / 2);
            const y0 = 16 + 7 * Math.sin((u0 * Math.PI) / 2);
            const y1 = 16 + 7 * Math.sin((u1 * Math.PI) / 2);
            seg(a, 'ironDark', cx + Math.sin(an) * r0, y0, cz + Math.cos(an) * r0, cx + Math.sin(an) * r1, y1, cz + Math.cos(an) * r1, 0.35);
          }
        }
        const dome = new THREE.Mesh(new THREE.SphereGeometry(B.r + 0.6, 32, 12, 0, TAU, 0, Math.PI / 2), M.glass);
        dome.scale.y = 7 / (B.r + 0.6);
        dome.position.copy(P(cx, 16, cz));
        AREA.B.add(dome);
        put(a, 'iron', G.torus, cx, 16, cz, [Math.PI / 2, 0, 0], [B.r + 0.6, B.r + 0.6, 6]);
      }
      // the dais and its fence of pikes (nobody climbs to the Dame)
      {
        const dais = new THREE.Mesh(new THREE.CylinderGeometry(B.dais, B.dais + 0.3, B.daisY, 40), M.stoneLit);
        dais.position.copy(P(cx, B.daisY / 2, cz));
        AREA.B.add(dais);
        put(a, 'steel', G.torus, cx, B.daisY, cz, [Math.PI / 2, 0, 0], [B.dais, B.dais, 1.6]);
        col(cx, B.daisY / 2, cz, B.dais * 1.6, B.daisY, B.dais * 1.6);
        const pk = 28;
        for (let i = 0; i < pk; i++) {
          const an = (i / pk) * TAU;
          const x = cx + Math.sin(an) * B.fence;
          const z = cz + Math.cos(an) * B.fence;
          put(a, 'ironDark', G.rod, x, 1.6, z, null, [1.5, 3.2, 1.5]);
          put(a, 'steel', G.spadeHead, x, 3.35, z, [0, an, 0], [0.3, 0.3, 0.3]);
          // bullets fly between the bars (no camera / bullet blocking), bodies do not
          col(x, 1.9, z, 0.9, 3.8, 0.9, { tag: 'nocam' });
        }
        [0.6, 2.4].forEach((y) => put(a, 'iron', G.torus, cx, y, cz, [Math.PI / 2, 0, 0], [B.fence, B.fence, 1.2]));
      }
      // racks and armour stands around the wall, banners
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * TAU + Math.PI / 8;
        if (Math.abs(Math.cos(an)) > 0.9) continue;
        const x = cx + Math.sin(an) * (B.r - 0.6);
        const z = cz + Math.cos(an) * (B.r - 0.6);
        if (i % 2) armourStand(a, x, z, an + Math.PI);
        else rack(a, x, 0, z, an + Math.PI, 4);
        banner(a, cx + Math.sin(an) * (B.r + 0.4), 12.5, cz + Math.cos(an) * (B.r + 0.4), an + Math.PI, 1.6, 4.2);
      }
      chandelier(a, cx, 13, cz, 3.2, 14, { top: 22, i: 1.8, d: 30 });
      [1, 2, 3, 5, 6, 7].forEach((k) => brazier(a, cx + Math.sin((k * Math.PI) / 4) * 12.6, cz + Math.cos((k * Math.PI) / 4) * 12.6));
      screens.B = makeScreen(5.2, 2.0, 1024);
      screens.B.mesh.position.copy(P(0, 10.4, cz + B.r + 0.45));
      screens.B.mesh.rotation.y = Math.PI;
      AREA.B.add(screens.B.mesh);
      chandelier(a, cx, 11.5, cz, 1.6, 8, { top: 13, i: 0.01, d: 1 });
    }

    // ===== C · La Salle du Trône d'acier =====
    {
      const a = 'C';
      const [x0, x1] = C.x;
      const [z0, z1] = C.z;
      const cz = (z0 + z1) / 2;
      // the corridor from the round hall
      slab(a, 'slate', 0, 0, (166.4 + z0) / 2, 7.2, z0 - 166.4, 0.6);
      solid(a, 'stone', -4.2, 4, (166.4 + z0) / 2, 1.2, 8, z0 - 166.4);
      solid(a, 'stone', 4.2, 4, (166.4 + z0) / 2, 1.2, 8, z0 - 166.4);
      box(a, 'ironDark', 0, 8.3, (166.4 + z0) / 2, 9.6, 0.6, z0 - 166.4);
      chandelier(a, 0, 6.8, 178, 0.9, 6, { top: 8, i: 1.0, d: 14 });
      // the hall
      slab(a, 'slate', 0, 0, cz, x1 - x0, z1 - z0, 0.8);
      longWall(a, x0 - 0.6, z0, z1, 18, true, -1);
      longWall(a, x1 + 0.6, z0, z1, 18, true, 1);
      crossWall(a, z0 - 0.6, x0 - 1.2, x1 + 1.2, 18, [-3, 3]);
      crossWall(a, z1 + 0.6, x0 - 1.2, x1 + 1.2, 18);
      vault(a, x0 - 1.2, x1 + 1.2, z0 - 0.6, z1 + 0.6, 18, 5);
      // four iron pillars (the armour crashes into them)
      C.pillars.forEach(([x, z]) => {
        solid(a, 'iron', x, 9, z, 2.4, 18, 2.4, { surf: 'metal' });
        box(a, 'steel', x, 0.3, z, 3, 0.6, 3);
        box(a, 'steel', x, 17.5, z, 3, 0.6, 3);
        [3.5, 9, 14].forEach((y) => box(a, 'steel', x, y, z, 2.6, 0.18, 2.6));
      });
      // the throne dais: steps, the iron throne with a great spade
      {
        const [d0, d1] = C.dais;
        for (let s = 0; s < 3; s++) slab(a, 'slateDark', 0, ((s + 1) * C.daisY) / 3, d0 + s * 0.8 + (d1 - d0 - s * 0.8) / 2, 16 - s * 1.5, d1 - d0 - s * 0.8, ((s + 1) * C.daisY) / 3);
        const ty = C.daisY;
        box(a, 'ironDark', 0, ty + 0.5, 238.6, 2.4, 1.0, 1.6);
        box(a, 'ironDark', 0, ty + 3.2, 239.3, 2.4, 6.4, 0.4);
        box(a, 'iron', -1.15, ty + 1.2, 238.6, 0.25, 1.4, 1.6);
        box(a, 'iron', 1.15, ty + 1.2, 238.6, 0.25, 1.4, 1.6);
        put(a, 'steel', G.spadeHead, 0, ty + 6.9, 239.1, [0, Math.PI, 0], [2.4, 2.4, 2.4]);
        const em = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), M.emblem);
        em.position.copy(P(0, ty + 4.2, 239.05));
        em.rotation.y = Math.PI;
        AREA.C.add(em);
        banner(a, -5, 10, z1 - 0.1, Math.PI, 2.4, 7);
        banner(a, 5, 10, z1 - 0.1, Math.PI, 2.4, 7);
        armourStand(a, -7.5, 236, Math.PI, C.daisY);
        armourStand(a, 7.5, 236, Math.PI, C.daisY);
      }
      [x0 + 0.4, x1 - 0.4].forEach((x) => {
        const ry = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        rack(a, x, 0, 196, ry, 5);
        rack(a, x, 0, 228, ry, 5);
        banner(a, x, 12.5, 212, ry, 2, 5);
      });
      chandelier(a, 0, 14, 206, 2.6, 12, { top: 22, i: 1.6, d: 30 });
      [198, 212, 226].forEach((z) => [-15.4, 15.4].forEach((x) => brazier(a, x, z)));
      [-5.6, 5.6].forEach((x) => brazier(a, x, 231.2));
      {
        const run = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 41).rotateX(-Math.PI / 2), M.runner);
        run.position.copy(P(0, 0.015, 211));
        T.runner.repeat.set(1, 41 / 8);
        AREA.C.add(run);
      }
      chandelier(a, 0, 14, 226, 2.6, 12, { top: 22, i: 1.6, d: 30 });
      chandelier(a, 0, 11, 236, 1.2, 8, { top: 22, i: 1.2, d: 16, c: '#fff1dc' });
      screens.C = makeScreen(5.2, 2.0, 1024);
      screens.C.mesh.position.copy(P(0, 12.6, z1 - 0.15));
      screens.C.mesh.rotation.y = Math.PI;
      AREA.C.add(screens.C.mesh);
    }

    flushBatches();
    makeHalos();
    // the figures
    ['V', 'D', 'R'].forEach((k) => {
      figs[k] = figure(k);
      root.add(figs[k].g);
    });
    // a pool of real lights for the nearest chandeliers
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight('#dce8ff', 0, 20, 2);
      l.userData = { at: -1, k: 0 };
      root.add(l);
      pool.push(l);
    }
    flashLight = new THREE.PointLight('#d8e4ff', 0, 140, 1.4);
    root.add(flashLight);
    amb.motes = LvKit.motes({ n: 360, size: 1.4, colors: ['#e8f0ff', '#a8c4ff'], rise: [-0.05, 0.12], sway: 0.9, box: [40, 16], alpha: 0.35, seed: 41 });
  };

  // a card of the épreuve, floating where the level puts it
  const showCard = (trialId, pos) => {
    if (!trialId) {
      if (card) card.visible = false;
      return;
    }
    if (!card || card.userData.id !== trialId) {
      if (card) root.remove(card);
      card = LvKit.trialCard(trialId, false);
      card.userData.id = trialId;
      root.add(card);
    }
    card.visible = !!pos;
    if (pos) card.userData.p = pos.clone();
  };

  // ---------- procedural sound: wind against the windows, distant thunder ----------
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
      // the wind outside, muffled by the walls, whistling in the window frames
      N.windF = ctx.createBiquadFilter();
      N.windF.type = 'bandpass';
      N.windF.frequency.value = 260;
      N.windF.Q.value = 0.9;
      N.wind = ctx.createGain();
      N.wind.gain.value = 0.12;
      src(WN).connect(N.windF).connect(N.wind).connect(out);
      N.whF = ctx.createBiquadFilter();
      N.whF.type = 'bandpass';
      N.whF.frequency.value = 1100;
      N.whF.Q.value = 14;
      N.wh = ctx.createGain();
      N.wh.gain.value = 0.02;
      src(WN).connect(N.whF).connect(N.wh).connect(out);
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowpass';
      lo.frequency.value = 90;
      N.rum = ctx.createGain();
      N.rum.gain.value = 0.42;
      src(BN).connect(lo).connect(N.rum).connect(out);
      return true;
    };
    let on = false;
    return {
      set(v) {
        if (!init()) return;
        on = v;
        out.gain.setTargetAtTime(v ? 0.85 : 0, ctx.currentTime, 0.6);
      },
      tick(t) {
        if (!ctx) {
          if (root.visible) this.set(true);
          if (!ctx) return;
        }
        N.windF.frequency.setTargetAtTime(240 + Math.sin(t * 0.21) * 80 + Math.sin(t * 0.67) * 40, ctx.currentTime, 0.4);
        N.wind.gain.setTargetAtTime(0.1 + 0.05 * Math.sin(t * 0.33), ctx.currentTime, 0.5);
        N.whF.frequency.setTargetAtTime(1000 + Math.sin(t * 0.13) * 300, ctx.currentTime, 0.6);
        N.wh.gain.setTargetAtTime(0.012 + 0.012 * Math.max(0, Math.sin(t * 0.29)), ctx.currentTime, 0.6);
      },
      thunder(dist = 150) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime + Math.min(2.2, dist / 340);
        const s = ctx.createBufferSource();
        s.buffer = BN;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(700, t0);
        f.frequency.exponentialRampToValueAtTime(100, t0 + 2.5);
        const g = ctx.createGain();
        const k = clamp(1.3 - dist / 400, 0.2, 1.0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(k, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(k * 0.5, t0 + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random() * 0.5);
        s.stop(t0 + 3.4);
      },
      // a metallic clang (herse, bridge, armour steps)
      clang(k = 1, f0 = 180) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime;
        [1, 2.76, 5.4].forEach((m, i) => {
          const o = ctx.createOscillator();
          o.frequency.value = f0 * m;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.06 * k / (i + 1), t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2 / (i + 1));
          o.connect(g).connect(out);
          o.start(t0);
          o.stop(t0 + 1.3);
        });
      },
    };
  })();

  // ---------- per-frame (the level writes ST, the world follows it) ----------
  const ST = {
    area: 'A',
    herse: [0, 0],
    bridge: [0, 0],
    winch: [0, 0],
    target: [0, 0],
    doorA: 0,
    doorB: 0,
    fig: {
      V: { p: V3(0, 9.65, 20), ry: 0, s: {} },
      D: { p: V3(B.c[0], B.daisY, B.c[1]), ry: Math.PI, s: {} },
      R: { p: V3(0, C.daisY, C.throneZ), ry: Math.PI, s: {} },
    },
    figOn: { V: true, D: true, R: true },
  };
  let lightT = 0;
  let snapNext = false;
  // the pistons' tops at time t (local clock): slow rises, short waits
  const pistonTop = (i, t) => {
    const p = pistons[i];
    const u = (t * 0.28 + p.ph / TAU) % 1;
    // up, hold, down, hold
    const e = u < 0.3 ? ease(u / 0.3) : u < 0.5 ? 1 : u < 0.8 ? 1 - ease((u - 0.5) / 0.3) : 0;
    return -0.8 + e * 2.6;
  };
  const maceAng = (m, t) => Math.sin(t * m.w + m.ph) * m.amp;
  const update = (dt, t, me) => {
    if (!built) return;
    const dd = snapNext ? 30 : dt;
    snapNext = false;
    SH.time.value = t;
    SH.cam.value.copy(R.camera.position);
    SKY.dome.position.copy(R.camera.position);
    SKY.sea.position.set(R.camera.position.x, O.y - 64, R.camera.position.z);
    flashV = Math.max(0, flashV - dt * 3.2);
    SH.flash.value = flashV;
    SH.fp.value.z = Math.max(0, SH.fp.value.z - dt * 2.2);
    flashLight.position.copy(R.camera.position).add(V3(20, 40, 30));
    flashLight.intensity = flashV * 2.0;
    tickBolts(dt);
    tickStorm(dt, me);
    AU.tick(t);
    LvKit.tick(t);
    Object.values(screens).forEach((sc) => sc.update(dt, t));
    // the windows' glass catches the flashes
    M.glass.opacity = 0.2 + flashV * 0.25;
    M.glass.emissive.setRGB(0.3, 0.36, 0.5).multiplyScalar(flashV * 1.2);
    // ---- A ----
    if (ST.area === 'A') {
      herses.forEach((h, i) => {
        // rises slowly (a winch), falls fast
        const want = ST.herse[i];
        h.k = want > h.k ? Math.min(1, h.k + dd / 1.1) : Math.max(0, h.k - dd / 0.35);
        h.g.position.y = O.y + 1.2 + h.k * 5.2;
        // the bars block once their points are lower than a head
        h.b.on = h.k < 0.36;
      });
      bridges.forEach((b, i) => {
        b.k = damp(b.k, ST.bridge[i], ST.bridge[i] ? 3.2 : 2.2, dd);
        b.pv.rotation.x = (1 - b.k) * (Math.PI / 2) * 0.98;
        b.b.on = b.k > 0.94;
      });
      winches.forEach((w, i) => {
        w.k = damp(w.k, ST.winch[i], 8, dd);
        w.a += dt * w.k * 3;
        w.wheel.rotation.x = w.a;
        w.ring.material.opacity = 0.18 + w.k * 0.6 + Math.sin(t * 6) * 0.05;
      });
      targets.forEach((tg, i) => {
        tg.k = damp(tg.k, ST.target[i], 6, dd);
        tg.hit = Math.max(0, tg.hit - dt);
        tg.pv.rotation.z = Math.sin(tg.hit * 30) * tg.hit * 0.5;
        tg.glow.material.opacity = (1 - tg.k) * (0.25 + Math.sin(t * 3 + i) * 0.15);
      });
      maces.forEach((m) => {
        m.pv.rotation.z = maceAng(m, t);
      });
      pistons.forEach((p, i) => {
        const top = pistonTop(i, t);
        p.top = top;
        p.g.position.set(O.x + p.x, O.y + top, O.z + p.z);
        p.b.min[1] = O.y + top - 1;
        p.b.max[1] = O.y + top;
      });
      rings.forEach((r, i) => {
        r.halo.material.opacity = 0.18 + Math.sin(t * 3 + i) * 0.1;
        r.m.rotation.y = t * 0.6;
        r.halo.rotation.y = t * 0.6;
      });
    }
    // doors
    [
      ['A', ST.doorA],
      ['B', ST.doorB],
    ].forEach(([k, open]) => {
      const d = doors[k];
      if (!d) return;
      d.k = damp(d.k, open, 0.9, dd);
      d.leaves.forEach((l, i) => (l.rotation.y = (i ? 1 : -1) * d.k * 1.5));
      d.b.on = open < 0.5;
    });
    // the figures glide to their marks, idle, talk, bow
    ['V', 'D', 'R'].forEach((k) => {
      const f = figs[k];
      const s = ST.fig[k];
      f.g.visible = ST.figOn[k] && AREA[k === 'V' ? 'A' : k === 'D' ? 'B' : 'C'].visible !== false;
      const to = P(s.p.x, s.p.y, s.p.z);
      if (dd > 1 || f.g.position.distanceTo(to) > 30) f.g.position.copy(to);
      else f.g.position.lerp(to, 1 - Math.exp(-dt * 2.2));
      f.g.rotation.y = angleDamp(f.g.rotation.y, s.ry, 3, dt);
      f.update(dt, t, s.s);
    });
    if (card && card.visible) {
      const p = card.userData.p;
      card.position.set(O.x + p.x, O.y + p.y + Math.sin(t * 1.5) * 0.12, O.z + p.z);
      card.rotation.y = t * 0.8;
    }
    // the real lights follow the nearest chandeliers of the room
    lightT -= dt;
    if (lightT <= 0) {
      lightT = 0.3;
      const c = R.camera.position;
      const want = LIGHTS.map((L, i) => [L.a === ST.area ? L.p.distanceToSquared(c) : 1e12, i])
        .sort((x, y) => x[0] - y[0])
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
      l.intensity = L ? L.i * u.k * (0.96 + Math.sin(t * 13 + u.at) * 0.04) : 0;
    });
  };

  // ---------- queries ----------
  // a mace hitting the body at q (relative): the knock velocity (world axes), or null
  const maceHit = (q, t) => {
    for (const m of maces) {
      if (Math.abs(q.z - m.z) > 1.6) continue;
      const a = maceAng(m, t);
      const hx = m.x + Math.sin(a) * 8.4;
      const hy = 10.5 - Math.cos(a) * 8.4;
      const d = Math.hypot(q.x - hx, q.y + 1.0 - hy, q.z - m.z);
      if (d < 1.15) {
        return V3(Math.cos(t * m.w + m.ph) >= 0 ? 10 : -10, 5, 0);
      }
    }
    return null;
  };
  const at = (zone, q) => {
    switch (zone) {
      case 'LOW':
        return q.x < -1 && q.z > 10 && q.z < A.endZ;
      case 'HIGH':
        return q.x > 1 && q.z > 9.5 && q.z < A.endZ && q.y > A.HY - 0.8;
      case 'END':
        return q.z > A.endZ + 0.2 && q.z < 114 && q.y > -0.5;
      case 'B':
        return Math.hypot(q.x - B.c[0], q.z - B.c[1]) < B.r + 0.5 && q.y > -0.6;
      case 'C':
        return q.z > C.z[0] && q.z < C.z[1] && q.y > -0.6;
      default:
        return false;
    }
  };
  // [dame, valet] per checkpoint key
  const SPAWN = {
    // A: per-role checkpoints (the lane index)
    V0: [-6.5, 0, 4],
    V1: [-6.5, 1.2, 29.6],
    V2: [-6.5, 1.2, 36.5],
    V3: [-6.5, 1.2, 59.6],
    V4: [-6.5, 1.2, 66.5],
    V5: [-4, 0, 97],
    D0: [7, 0, 1.5],
    D1: [6.8, A.HY, 30],
    D2: [6.8, A.HY, 49],
    D3: [6.8, A.HY, 66],
    D4: [6.8, A.HY, 85],
    D5: [4, 0, 97],
    // B, C: one each
    B: [[-2.5, 0, 140.5], [2.5, 0, 140.5]],
    C: [[-3, 0, 193.5], [3, 0, 193.5]],
  };
  const spawn = (key, who) => {
    const s = SPAWN[key] || SPAWN.V0;
    const p = Array.isArray(s[0]) ? s[who === 'dame' ? 0 : 1] : s;
    return P(p[0], p[1], p[2]);
  };
  const ringPos = (i) => P(A.rings[i][0], A.rings[i][1], A.rings[i][2]);
  const ringLand = (i) => P(A.rings[i][0], A.HY, A.rings[i][3]);

  return {
    O,
    P,
    rel,
    A,
    B,
    C,
    ST,
    AU,
    amb,
    build,
    get built() {
      return built;
    },
    // which room is shown (the others hidden: one room per figure)
    show(k) {
      ST.area = k;
      Object.entries(AREA).forEach(([n, g]) => (g.visible = n === k));
    },
    hide() {
      root.visible = false;
      wx.visible = false;
      AU.set(false);
      flashV = 0;
      if (card) card.visible = false;
    },
    update,
    snap() {
      snapNext = true;
    },
    bolt,
    flash,
    at,
    spawn,
    ringPos,
    ringLand,
    maceHit,
    pistonTop,
    showCard,
    figure,
    spadeShape,
    dartModel,
    armourModel,
    get tex() {
      return T;
    },
    get figs() {
      return figs;
    },
    get screen() {
      return screen;
    },
    screens,
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
    herseK: (i) => (herses[i] ? herses[i].k : 0),
    bridgeK: (i) => (bridges[i] ? bridges[i].k : 0),
    hitTarget(i) {
      if (targets[i]) targets[i].hit = 0.6;
    },
    targetPos: (i) => P(A.target[i][0], 2.9, A.target[i][1]),
    winchPos: (i) => P(A.winch[i][0], A.HY, A.winch[i][1]),
  };
})();
