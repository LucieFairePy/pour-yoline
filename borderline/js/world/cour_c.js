// ♣ · La table de Trèfle, in the Cour above the storm: the guild hall of the three club figures,
// green marble, oak, ivy, ropes and pulleys. One long hall on a floating rock, three wings:
//  V. la salle des cordes: the Valet's tug of war across a trench, his drum, the brass score track
//  D. la galerie des poulies: a pit crossed by a hanging carriage on a gantry, its console, beams
//  K. la rotonde du Roi: a great balance disc over the void, the throne, open to the storm
// The three figures are Veilleurs in tall court-card costumes and porcelain masks (figure()).
// Scanned materials (Poly Haven, lazily loaded for these levels only, procedural until they arrive).
// Geometry, visuals, sound and pure helpers only; the rules live in js/levels/tr_cV.js, tr_cD.js,
// tr_cK.js, the end-of-table film in js/cine/cour_c.js.
const CourC = (() => {
  const O = V3(2000, 0, 16000);
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

  // ---------- layout (relative to O; the hall runs along +z) ----------
  const HW = 14;
  const VA = {
    grip: { dame: [-2.4, 13], valet: [2.4, 13] },
    trench: [22, 28],
    fig: [0, 33],
    drum: [-3.5, 31.4],
  };
  const PIT = { x0: -9, x1: 9, z0: 56, z1: 90 };
  const RAIL_Y = 12;
  const CAR = { z0: 57.4, z1: 88.6, y0: -5, y1: 7, half: 1.2 };
  const CONSOLE = { x: -10.3, z: 73, op: [-11.3, 73] };
  // the crossing beams of the pit: [z, y] (centre of a 0.7 m square section)
  const BEAMS = [
    [65, 1.6],
    [71.5, -2.6],
    [78, 3.4],
    [84, -0.6],
  ];
  const DFIG = [0, 1.4, 95.2];
  const C = { x: 0, z: 128 };
  const DISC_R = 7;
  const RING_IN = 10;
  const RING_OUT = 17.3;
  const BRIDGE_X = 8.6;
  const THRONE = [0, 1.0, 145.6];

  // ---------- noise ----------
  const NOISE_GLSL = `
    float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }`;

  // ---------- scanned materials (Poly Haven, CC0; assets/CATALOG.md) ----------
  // Each scan feeds the Tex.mat of this level only: its triplanar shader reads our textures once
  // they are loaded, and the procedural maps of the kind until then (or with ?noassets / ?look=0).
  const SCAN = {
    marble: { ids: ['tex.ccmarble.alb', 'tex.ccmarble.nrm'], mul: 1 },
    // already in the game: the same files, shared
    wood: { ids: ['tex.wood.alb', 'tex.wood.nrm'], mul: 0.75 },
    stone: { ids: ['tex.stone.alb', 'tex.stone.nrm'], mul: 0.5 },
    metal: { ids: ['tex.c10metal.alb', 'tex.c10metal.nrm'], mul: 1 },
    rock: { ids: ['tex.d10rock.alb', 'tex.d10rock.nrm'], mul: 1 },
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
          // a scan that brings its own colour takes the tint meant for it
          (s.mats || []).forEach(([m, c]) => m.color.set(c));
        })
        .catch(() => {});
    });
  };
  // opt.scanColor: the tint once the scan is there (opt.color is the procedural one's)
  const scan = (kind, name, opt) => {
    const sc = opt.scanColor;
    delete opt.scanColor;
    const m = Tex.mat(kind, Object.assign({ cc: name }, opt));
    // a cached material bound by an earlier build (the world was unloaded since) is ready as is
    if (!m.userData.tri || m.userData.cScan) return m;
    m.userData.cScan = true;
    const T = Tex.build(kind);
    const s = SCAN[name];
    if (sc) {
      (s.mats = s.mats || []).push([m, sc]);
      if (s.alb) m.color.set(sc);
    }
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

  // ---------- canvas helpers ----------
  const clover = (g, cx, cy, s, stem = true) => {
    g.beginPath();
    [-90, 30, 150].forEach((d) => {
      const a = (d * Math.PI) / 180;
      g.moveTo(cx + Math.cos(a) * s * 0.52 + s * 0.42, cy + Math.sin(a) * s * 0.52);
      g.arc(cx + Math.cos(a) * s * 0.52, cy + Math.sin(a) * s * 0.52, s * 0.42, 0, TAU);
    });
    g.fill();
    if (stem) {
      g.beginPath();
      g.moveTo(cx - s * 0.1, cy + s * 0.2);
      g.lineTo(cx - s * 0.32, cy + s * 1.15);
      g.lineTo(cx - s * 0.08, cy + s * 1.15);
      g.lineTo(cx + s * 0.1, cy + s * 0.2);
      g.fill();
    }
  };
  const T = {};
  const makeTextures = () => {
    // green baize of the card tables and the board backs
    T.felt = LvKit.tex(256, 256, (g, w, h) => {
      LvKit.grain(g, w, h, '#1f5a3c', 0.08, 14000);
      g.globalAlpha = 0.05;
      for (let i = 0; i < 300; i++) {
        g.strokeStyle = Math.random() < 0.5 ? '#000' : '#9fd8b0';
        g.beginPath();
        const x = Math.random() * w;
        const y = Math.random() * h;
        g.moveTo(x, y);
        g.lineTo(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8);
        g.stroke();
      }
      g.globalAlpha = 1;
    }, 2, 2);
    // ivy leaves: a sheet of 4 leaves (three-lobed, veined), cut out by alpha
    T.ivy = LvKit.tex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      const leaf = (cx, cy, s, col, rot) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, s * 0.55);
        g.bezierCurveTo(-s * 0.2, s * 0.3, -s * 0.75, s * 0.25, -s * 0.62, -s * 0.05);
        g.bezierCurveTo(-s * 0.55, -s * 0.3, -s * 0.3, -s * 0.2, -s * 0.22, -s * 0.28);
        g.bezierCurveTo(-s * 0.2, -s * 0.6, 0, -s * 0.72, 0, -s * 0.72);
        g.bezierCurveTo(0, -s * 0.72, s * 0.2, -s * 0.6, s * 0.22, -s * 0.28);
        g.bezierCurveTo(s * 0.3, -s * 0.2, s * 0.55, -s * 0.3, s * 0.62, -s * 0.05);
        g.bezierCurveTo(s * 0.75, s * 0.25, s * 0.2, s * 0.3, 0, s * 0.55);
        g.fill();
        g.strokeStyle = 'rgba(200,230,170,0.45)';
        g.lineWidth = s * 0.03;
        g.beginPath();
        g.moveTo(0, s * 0.5);
        g.lineTo(0, -s * 0.6);
        g.moveTo(0, 0);
        g.lineTo(-s * 0.5, -s * 0.05);
        g.moveTo(0, 0);
        g.lineTo(s * 0.5, -s * 0.05);
        g.stroke();
        g.restore();
      };
      leaf(64, 70, 100, '#2f5a26', 0.1);
      leaf(192, 66, 96, '#3b6a2c', -0.2);
      leaf(66, 194, 92, '#24481e', 0.3);
      leaf(190, 192, 100, '#46782f', -0.05);
    });
    // a guild banner: green field, a gold clover, a scalloped hem
    T.banner = LvKit.tex(256, 512, (g, w, h) => {
      LvKit.grain(g, w, h, '#1d4f33', 0.07, 6000);
      g.fillStyle = '#d9a94a';
      g.fillRect(0, 0, w, 14);
      g.fillRect(14, 0, 6, h - 40);
      g.fillRect(w - 20, 0, 6, h - 40);
      g.fillStyle = '#e8c068';
      clover(g, w / 2, h * 0.38, 62);
      g.fillStyle = '#f2e6c4';
      g.font = 'italic 34px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('Trèfle', w / 2, h * 0.72);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc((i + 0.5) * (w / 4), h + 6, w / 8, 0, TAU);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    });
    // the clover that glows under a foot (balance targets) and on the tokens' faces
    T.glow = LvKit.tex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#ffffff';
      g.shadowColor = '#ffffff';
      g.shadowBlur = 18;
      clover(g, 128, 118, 54);
    });
    T.medal = LvKit.tex(256, 256, (g) => {
      const gr = g.createRadialGradient(110, 100, 10, 128, 128, 128);
      gr.addColorStop(0, '#fff1b8');
      gr.addColorStop(0.6, '#d9a24a');
      gr.addColorStop(1, '#7a5420');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#6a4418';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(128, 128, 112, 0, TAU);
      g.stroke();
      g.fillStyle = '#1f6b40';
      clover(g, 128, 112, 50);
    });
  };
  // the court-card costume: the skirt / tunic and the bodice, per figure
  const FIG = {
    V: { h: 2.72, a: '#1f5c3b', b: '#efe2bc', trim: '#d9a94a', skin: '#93b3a2', rank: 'V', sub: 'Le Valet' },
    D: { h: 2.86, a: '#2a6a48', b: '#f2e8d0', trim: '#e2bb5e', skin: '#aaa4c8', rank: 'D', sub: 'La Dame' },
    K: { h: 3.08, a: '#163d29', b: '#e2cfa2', trim: '#ecc462', skin: '#8fa2ba', rank: 'R', sub: 'Le Roi' },
  };
  const robeTex = (k, part) =>
    LvKit.tex(512, 512, (g, w, h) => {
      const F = FIG[k];
      LvKit.grain(g, w, h, F.a, 0.06, 7000);
      // damask: small gold clovers in a lattice
      g.fillStyle = F.trim;
      g.globalAlpha = 0.22;
      for (let y = 20; y < h; y += 46)
        for (let x = ((y / 46) % 2) * 23; x < w; x += 46) clover(g, x, y, 8, false);
      g.globalAlpha = 1;
      // the front panel (u = 0 is the front: split across both edges), ivory with a gold border
      const pw = part === 'skirt' ? w * 0.13 : w * 0.11;
      [
        [-pw, pw * 2],
        [w - pw, pw * 2],
      ].forEach(([x, ww]) => {
        g.fillStyle = F.trim;
        g.fillRect(x - 6, 0, ww + 12, h);
        g.fillStyle = F.b;
        g.fillRect(x, 0, ww, h);
      });
      g.fillStyle = k === 'D' ? '#2a6a48' : '#1a4a30';
      if (part === 'skirt') {
        for (let i = 0; i < 3; i++) {
          clover(g, 0, 140 + i * 120, 26);
          clover(g, w, 140 + i * 120, 26);
        }
      } else {
        clover(g, 0, h * 0.45, 46);
        clover(g, w, h * 0.45, 46);
      }
      // gold bands: the hem (bottom of the canvas = bottom of the cloth) and the top
      g.fillStyle = F.trim;
      g.fillRect(0, h - 34, w, 22);
      g.fillRect(0, part === 'skirt' ? 6 : h - 70, w, 8);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = 0; x < w; x += 16) g.fillRect(x, h - 30, 6, 14);
    });
  // the porcelain mask of a court card: painted brows, cheeks and lips, a clover on the brow,
  // the eye holes cut out (the Veilleur's own eyes shine through)
  const maskTex = (k) =>
    LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#fbf6ee');
      gr.addColorStop(1, '#e8ddd0');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(232,120,130,0.28)';
      [72, 184].forEach((x) => {
        g.beginPath();
        g.ellipse(x, 160, 26, 16, 0, 0, TAU);
        g.fill();
      });
      g.strokeStyle = '#3a2a22';
      g.lineWidth = 5;
      g.lineCap = 'round';
      [
        [86, -1],
        [170, 1],
      ].forEach(([x, s]) => {
        g.beginPath();
        g.moveTo(x - 30, 98 + (k === 'K' ? 4 : 0));
        g.quadraticCurveTo(x, 78 - (k === 'V' ? 6 : 0), x + 30, 96 - s * 3);
        g.stroke();
      });
      // the nose line and the lips
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(128, 112);
      g.lineTo(122, 160);
      g.lineTo(132, 164);
      g.stroke();
      g.fillStyle = '#b8323e';
      g.beginPath();
      g.ellipse(128, 198, 18, 7, 0, 0, TAU);
      g.fill();
      if (k === 'K') {
        // a painted royal beard and moustache
        g.fillStyle = '#c8a050';
        g.beginPath();
        g.moveTo(96, 186);
        g.bezierCurveTo(110, 176, 120, 184, 128, 186);
        g.bezierCurveTo(136, 184, 146, 176, 160, 186);
        g.bezierCurveTo(150, 192, 140, 190, 128, 190);
        g.bezierCurveTo(116, 190, 106, 192, 96, 186);
        g.fill();
        g.beginPath();
        g.moveTo(92, 206);
        g.quadraticCurveTo(128, 300, 164, 206);
        g.quadraticCurveTo(128, 232, 92, 206);
        g.fill();
      }
      if (k === 'D') {
        g.fillStyle = '#2a6a48';
        g.beginPath();
        g.arc(184, 132, 4, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#2f8a52';
      clover(g, 128, 40, 13, false);
      g.strokeStyle = '#d9a94a';
      g.lineWidth = 6;
      g.strokeRect(3, 3, w - 6, h - 6);
      // eye holes
      g.globalCompositeOperation = 'destination-out';
      [86, 170].forEach((x) => {
        g.beginPath();
        g.ellipse(x, 122, 24, 13, 0, 0, TAU);
        g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    });
  const ermineTex = () =>
    LvKit.tex(256, 64, (g, w, h) => {
      LvKit.grain(g, w, h, '#f4f0e6', 0.05, 3000);
      g.fillStyle = '#16120e';
      for (let x = 10; x < w; x += 28)
        for (let y = 12; y < h; y += 26) {
          g.beginPath();
          g.moveTo(x + ((y / 26) % 2) * 14, y - 6);
          g.lineTo(x + ((y / 26) % 2) * 14 - 4, y + 6);
          g.lineTo(x + ((y / 26) % 2) * 14 + 4, y + 6);
          g.fill();
        }
    });

  // ---------- a court figure (a Veilleur in costume), built fresh for each use ----------
  // kind: 'V' | 'D' | 'K'. Returns { g, upper, head, arms: [L, R], hands, card, prop, U } and is
  // posed by poseFig(f, t, dt, s). Feet at y = 0, facing +z. Its own materials (the film disposes them).
  const figTex = {};
  const figure = (kind) => {
    const F = FIG[kind];
    if (!figTex[kind]) figTex[kind] = { skirt: robeTex(kind, 'skirt'), bod: robeTex(kind, 'bod'), mask: maskTex(kind) };
    const TX = figTex[kind];
    const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
    const gold = std(F.trim, 0.3, 0.9);
    if (typeof Assets !== 'undefined' && Assets.envify) Assets.envify(gold, 0.7);
    const skin = std(F.skin, 0.45, 0.05);
    const glove = std('#f3eee4', 0.6);
    const lace = std('#f6f1e8', 0.75, 0, { side: THREE.DoubleSide });
    const dark = std('#0f2418', 0.6);
    const eyeM = std('#06070a', 0.06, 0.3);
    const add = (p, geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      p.add(m);
      return m;
    };
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const g = new THREE.Group();
    const s = F.h / 2.8;
    const body = new THREE.Group();
    body.scale.setScalar(s);
    g.add(body);
    const WAIST = 1.3;
    // below the waist: the Valet's hose and tunic, a long gown for the others
    if (kind === 'V') {
      [-1, 1].forEach((sd) => {
        add(body, new THREE.CylinderGeometry(0.085, 0.07, 0.95, 12).translate(0, 0.475, 0), std('#173a28', 0.65), sd * 0.14, 0, 0);
        add(body, new THREE.SphereGeometry(0.11, 14, 10).scale(1, 0.55, 1.6), std('#2a1a10', 0.35, 0.2), sd * 0.14, 0.05, 0.05);
      });
      add(
        body,
        new THREE.LatheGeometry([V2(0.02, 0.82), V2(0.56, 0.82), V2(0.5, 0.95), V2(0.42, 1.12), V2(0.36, 1.32)], 36),
        std('#ffffff', 0.7, 0, { map: TX.skirt, side: THREE.DoubleSide }),
      );
    } else {
      const hem = kind === 'K' ? 0.82 : 0.86;
      add(
        body,
        new THREE.LatheGeometry([V2(0.02, 0), V2(hem, 0.01), V2(hem - 0.05, 0.14), V2(0.62, 0.5), V2(0.46, 0.98), V2(0.36, 1.32)], 40),
        std('#ffffff', 0.72, 0, { map: TX.skirt, side: THREE.DoubleSide }),
      );
    }
    // the gold belt
    add(body, new THREE.TorusGeometry(0.36, 0.035, 8, 32).rotateX(Math.PI / 2), gold, 0, WAIST, 0);
    const upper = new THREE.Group();
    upper.position.y = WAIST;
    body.add(upper);
    add(upper, new THREE.LatheGeometry([V2(0.35, -0.02), V2(0.38, 0.22), V2(0.43, 0.48), V2(0.38, 0.66), V2(0.18, 0.76), V2(0.05, 0.8)], 36), std('#ffffff', 0.7, 0, { map: TX.bod }));
    // the ruff: a frilled collar
    const ruffG = new THREE.TorusGeometry(0.19, 0.075, 10, 64);
    {
      const p = ruffG.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const a = Math.atan2(y, x);
        const k = 1 + 0.12 * Math.sin(a * 22);
        p.setXYZ(i, x * k, y * k, p.getZ(i) * (1.2 + 0.25 * Math.sin(a * 22)));
      }
      ruffG.rotateX(Math.PI / 2);
      ruffG.computeVertexNormals();
    }
    add(upper, ruffG, lace, 0, 0.8, 0).scale.set(1, 0.9, 1);
    add(upper, new THREE.CylinderGeometry(0.06, 0.07, 0.16, 12), skin, 0, 0.86, 0);
    const head = new THREE.Group();
    head.position.y = 1.06;
    upper.add(head);
    add(head, new THREE.SphereGeometry(0.2, 28, 20).scale(1, 1.22, 1.02), skin);
    // the eyes behind the mask, and the mask itself
    [-1, 1].forEach((sd) => {
      const e = add(head, new THREE.SphereGeometry(0.052, 16, 10).scale(1.3, 0.75, 0.6), eyeM, sd * 0.07, 0.11, 0.165);
      e.rotation.z = sd * -0.3;
      add(e, new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), sd * -0.012, 0.016, 0.03);
    });
    const mask = add(
      head,
      new THREE.SphereGeometry(0.215, 28, 18, Math.PI / 2 - 1.0, 2.0, 0.42, 1.5),
      new THREE.MeshStandardMaterial({ map: TX.mask, roughness: 0.32, metalness: 0.05, alphaTest: 0.5, side: THREE.DoubleSide }),
    );
    mask.scale.set(1.04, 1.24, 1.08);
    // headgear
    if (kind === 'V') {
      const cap = new THREE.Group();
      cap.position.set(0.02, 0.2, -0.01);
      cap.rotation.z = -0.22;
      head.add(cap);
      add(cap, new THREE.CylinderGeometry(0.26, 0.24, 0.09, 28), std('#1a4a30', 0.8));
      add(cap, new THREE.CylinderGeometry(0.31, 0.31, 0.02, 28), std('#123622', 0.8), 0, -0.04, 0);
      add(cap, new THREE.TorusGeometry(0.245, 0.018, 6, 28).rotateX(Math.PI / 2), gold, 0, -0.01, 0);
      const pl = add(cap, new THREE.SphereGeometry(0.09, 14, 10).scale(0.6, 4.2, 0.5), std('#f2ead8', 0.9), -0.2, 0.2, -0.06);
      pl.rotation.z = 0.75;
      add(cap, new THREE.SphereGeometry(0.03, 10, 8), gold, -0.16, 0.03, 0.08);
    } else if (kind === 'D') {
      // a tall hennin wrapped in a veil, a gold circlet with a clover jewel
      add(head, new THREE.ConeGeometry(0.16, 0.7, 24).translate(0, 0.35, 0), std('#1f5a3c', 0.6), 0, 0.18, -0.06).rotation.x = -0.35;
      add(head, new THREE.TorusGeometry(0.205, 0.02, 8, 32).rotateX(Math.PI / 2 - 0.15), gold, 0, 0.17, 0);
      const veil = add(
        head,
        new THREE.ConeGeometry(0.42, 1.25, 24, 1, true).translate(0, -0.62, 0),
        new THREE.MeshStandardMaterial({ color: '#e6f2ea', roughness: 0.9, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }),
        0,
        0.6,
        -0.32,
      );
      veil.rotation.x = 0.35;
      add(head, new THREE.SphereGeometry(0.035, 10, 8), std('#3fae6a', 0.15, 0.2, { emissive: '#1d6a3a' }), 0, 0.2, 0.2);
    } else {
      // the crown: a gold band, five clover finials, a velvet cap
      const crown = new THREE.Group();
      crown.position.y = 0.2;
      head.add(crown);
      add(crown, new THREE.CylinderGeometry(0.235, 0.215, 0.16, 32, 1, true), new THREE.MeshStandardMaterial({ color: F.trim, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide }), 0, 0.06, 0);
      add(crown, new THREE.SphereGeometry(0.21, 20, 10, 0, TAU, 0, Math.PI / 2), std('#1f5a3c', 0.85), 0, 0.04, 0).scale.y = 0.9;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const fp = new THREE.Group();
        fp.position.set(Math.sin(a) * 0.225, 0.2, Math.cos(a) * 0.225);
        fp.rotation.y = a;
        crown.add(fp);
        [-1, 0, 1].forEach((k) => add(fp, new THREE.SphereGeometry(0.03, 10, 8), gold, k * 0.03, k ? 0 : 0.04, 0));
      }
      add(crown, new THREE.SphereGeometry(0.045, 12, 10), std('#3fae6a', 0.15, 0.2, { emissive: '#1d6a3a' }), 0, 0.06, 0.235);
      // the mantle: a half lathe from the shoulders to the floor, ermine on its edge
      const mant = add(
        body,
        new THREE.LatheGeometry([V2(0.05, 2.12), V2(0.5, 2.02), V2(0.62, 1.4), V2(0.78, 0.6), V2(0.95, 0.02)], 30, Math.PI * 0.62, Math.PI * 0.76),
        std('#1a4a2e', 0.85, 0, { side: THREE.DoubleSide }),
      );
      mant.userData.mantle = true;
      add(body, new THREE.TorusGeometry(0.42, 0.075, 10, 36).rotateX(Math.PI / 2), std('#ffffff', 0.9, 0, { map: ermineTex() }), 0, 2.03, -0.03);
    }
    // arms: a puffed sleeve, the upper arm, the elbow, the forearm, a lace cuff and a glove
    const arms = [];
    const hands = [];
    [-1, 1].forEach((sd) => {
      const sh = new THREE.Group();
      sh.position.set(sd * 0.42, 0.64, 0);
      upper.add(sh);
      add(sh, new THREE.SphereGeometry(0.15, 16, 12).scale(1, 1.1, 1), std('#ffffff', 0.7, 0, { map: TX.bod }));
      add(sh, new THREE.CylinderGeometry(0.075, 0.065, 0.44, 12).translate(0, -0.22, 0), std(F.a, 0.7));
      const el = new THREE.Group();
      el.position.y = -0.44;
      sh.add(el);
      add(el, new THREE.CylinderGeometry(0.062, 0.05, 0.38, 12).translate(0, -0.19, 0), std(F.a, 0.7));
      add(el, new THREE.CylinderGeometry(0.06, 0.09, 0.08, 14, 1, true).translate(0, -0.36, 0), lace);
      const hand = new THREE.Group();
      hand.position.y = -0.42;
      el.add(hand);
      add(hand, new THREE.SphereGeometry(0.065, 12, 10).scale(0.85, 1.15, 0.6), glove, 0, -0.03, 0);
      arms.push({ sh, el, sd });
      hands.push(hand);
    });
    // props: the Valet's drumstick, the Dame's shuttle, the Roi's sceptre (right hand)
    let prop = null;
    if (kind === 'V') {
      prop = new THREE.Group();
      add(prop, new THREE.CylinderGeometry(0.02, 0.025, 0.55, 8).translate(0, -0.2, 0), std('#7a5030', 0.6));
      add(prop, new THREE.SphereGeometry(0.06, 12, 10), std('#efe2bc', 0.8), 0, -0.48, 0);
      prop.rotation.x = 1.3;
    } else if (kind === 'D') {
      prop = new THREE.Group();
      add(prop, new THREE.CylinderGeometry(0.035, 0.035, 0.36, 10).rotateZ(Math.PI / 2), std('#a06a3c', 0.5));
      add(prop, new THREE.SphereGeometry(0.06, 12, 10).scale(2.2, 0.8, 0.8), std('#3a7a50', 0.7), 0, 0, 0);
    } else {
      prop = new THREE.Group();
      add(prop, new THREE.CylinderGeometry(0.025, 0.025, 1.3, 10).translate(0, 0.25, 0), gold);
      const top = new THREE.Group();
      top.position.y = 0.95;
      prop.add(top);
      [-90, 30, 150].forEach((d) => {
        const a = (d * Math.PI) / 180;
        add(top, new THREE.SphereGeometry(0.06, 12, 10), std('#2f8a52', 0.2, 0.3, { emissive: '#103a20' }), Math.cos(a) * 0.06, -Math.sin(a) * 0.06, 0);
      });
    }
    hands[1].add(prop);
    // the figure's own card, held face out in the left hand (shown by the film and the bow)
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.6),
      new THREE.MeshStandardMaterial({ map: Tex.card(F.rank, '♣'), roughness: 0.45, side: THREE.DoubleSide }),
    );
    card.position.set(0, -0.3, 0.05);
    card.visible = false;
    hands[0].add(card);
    g.traverse((m) => m.isMesh && (m.frustumCulled = false));
    return { g, body, upper, head, mask, arms, hands, prop, card, kind, k: { talk: 0, bow: 0, pull: 0, look: 0, hold: 0, strike: 0, lay: 0 } };
  };
  const tmpV = V3();
  // s: { talk, bow, pull (lean back on the rope), strike (0..1 the drum stroke), hold (card
  // shown), lay (card laid down, arm out), look (world point the head turns to), wave }
  const poseFig = (f, t, dt, s = {}) => {
    const k = f.k;
    k.talk = damp(k.talk, s.talk ? 1 : 0, 6, dt);
    k.bow = damp(k.bow, s.bow || 0, 3, dt);
    k.pull = damp(k.pull, s.pull || 0, 10, dt);
    k.hold = damp(k.hold, s.hold || 0, 4, dt);
    k.lay = damp(k.lay, s.lay || 0, 3, dt);
    const ph = f.kind === 'V' ? 0 : f.kind === 'D' ? 2 : 4;
    const breathe = Math.sin(t * 1.3 + ph);
    f.upper.scale.set(1 + breathe * 0.006, 1 + breathe * 0.01, 1 + breathe * 0.006);
    f.upper.rotation.x = k.bow * 0.78 - k.pull * 0.28 + Math.sin(t * 0.7 + ph) * 0.015;
    f.upper.rotation.z = Math.sin(t * 0.5 + ph) * 0.02;
    // the head: towards the point it looks at, a nod when it talks, down in the bow
    let yaw = 0;
    if (s.look) {
      f.g.updateMatrixWorld();
      tmpV.copy(s.look);
      f.g.worldToLocal(tmpV);
      yaw = clamp(Math.atan2(tmpV.x, tmpV.z), -0.9, 0.9);
    }
    k.look = damp(k.look, yaw, 3, dt);
    f.head.rotation.y = k.look * (1 - k.bow);
    f.head.rotation.x = k.bow * 0.4 + Math.sin(t * 8.5) * 0.06 * k.talk - k.pull * 0.1;
    f.head.rotation.z = Math.sin(t * 3.1 + ph) * 0.05 * k.talk;
    const [L, Rr] = f.arms;
    // rest: hands low, a little out; talk: the left hand gestures; bow: right hand to the heart,
    // left arm swept out; pull: both hands forward on the rope; hold: the card up to the chest
    const gest = Math.sin(t * 2.2) * 0.25 * k.talk;
    // the left arm: rest / talk, then the card held at the chest, then laid forward on the table
    const free = Math.max(0, 1 - k.hold - k.lay);
    const hl = Math.min(1, k.hold + k.lay);
    const lay = k.lay / Math.max(1e-3, k.hold + k.lay);
    const lsx = lerp(-0.15 - k.talk * 0.5 + gest, lerp(-0.7, -1.15, lay), hl) - k.pull * 1.0;
    const lsz = lerp(-0.12 - k.bow * 0.9 * free, lerp(0.25, 0.1, lay), hl);
    L.sh.rotation.set(lsx, 0, lsz);
    L.el.rotation.set(lerp(-0.35 - k.talk * 0.6, lerp(-1.45, -0.35, lay), hl), 0, 0);
    // the card faces outward from the palm
    f.card.rotation.set(-0.2 + lay * 0.6, hl * 0.4, 0);

    const strike = s.strike || 0;
    Rr.sh.rotation.set(-0.2 - k.bow * 0.9 - k.pull * 1.0 - strike * 1.2 + (s.raise ? -1.6 * s.raise : 0), 0, 0.12 + k.bow * 0.35);
    Rr.el.rotation.set(-0.4 - k.bow * 1.3 + strike * 0.5, 0, 0);
    f.card.visible = k.hold > 0.08 || k.lay > 0.08;
  };

  // ---------- materials ----------
  const M = {};
  const std = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
  const makeMats = () => {
    M.marble = scan('marble', 'marble', { color: '#6f9a80', scanColor: '#b4c4b8', scale: 3.2, rough: 0.42 });
    M.marbleDk = scan('marble', 'marble', { color: '#4a6a58', scanColor: '#8aa092', scale: 4, rough: 0.6 });
    M.wood = scan('wood', 'wood', { color: '#8a6244', scale: 2.4, rough: 0.85 });
    M.woodDk = scan('wood', 'wood', { color: '#5a3a24', scale: 2.4, rough: 0.8 });
    M.stone = scan('stone', 'stone', { color: '#c9c6b4', scale: 4, rough: 1 });
    M.rock = scan('rock', 'rock', { color: '#7f8a84', scale: 9, rough: 1, bump: 1.2 });
    M.brass = Tex.mat('metal', { color: '#d8a656', rough: 0.34, metal: 1, scale: 1.4, cc: 'brass' });
    // verdigris bronze (the green rusted metal scan of â™£10): pulleys, weights, the gantry
    M.verd = scan('metal', 'metal', { color: '#c8d8b0', rough: 0.55, metal: 0.6, scale: 1.6 });
    M.iron = Tex.mat('metal', { color: '#2a2e2c', rough: 0.5, metal: 0.75, scale: 2, cc: 'iron' });
    if (typeof Assets !== 'undefined' && Assets.envify) [M.brass, M.iron, M.verd].forEach((m) => Assets.envify(m, 0.6));
    M.felt = std('#ffffff', 0.95, { map: T.felt });
    M.rope = std('#b49a70', 0.92);
    M.ivy = std('#ffffff', 0.75, { map: T.ivy, alphaTest: 0.5, side: THREE.DoubleSide });
    M.banner = std('#ffffff', 0.85, { map: T.banner, alphaTest: 0.5, side: THREE.DoubleSide });
    M.lamp = LvKit.glow('#ffc47a', 2.2);
    M.green = LvKit.glow('#7dffb0', 1.6);
    M.dark = std('#0e1410', 0.85);
    M.skin = std('#d8c8a8', 0.6);
    M.glass = std('#9fd8b8', 0.05, { metalness: 0.4, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
    // the ropes use the game's scanned rope (ambientCG) once it is there
    if (typeof Assets !== 'undefined' && scansOn())
      Assets.get('tex.rope')
        .then((t) => {
          const r = t.clone();
          r.wrapS = r.wrapT = THREE.RepeatWrapping;
          r.repeat.set(1, 6);
          r.needsUpdate = true;
          M.rope.map = r;
          M.rope.color.set('#e0cfa8');
          M.rope.needsUpdate = true;
        })
        .catch(() => {});
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
      m.receiveShadow = true;
      root.add(m);
    });
  const floor = (x, z, w, d, mat = 'marble', top = 0) => {
    box(mat, x, top - 0.25, z, w, 0.5, d);
    K.collider(x, top - 0.25, z, w, 0.5, d);
  };
  const wall = (x, y, z, sx, sy, sz) => K.collider(x, y + sy / 2, z, sx, sy, sz);
  // a vertical rope between two points (batched)
  const ropeY = (x, y0, y1, z, r = 0.04) => put('rope', G.rope, x, (y0 + y1) / 2, z, null, [r / 0.04, y1 - y0, r / 0.04]);
  const pulley = (x, y, z, ry = 0, r = 0.45) => {
    put('verd', G.wheel, x, y, z, [0, ry, 0], [r / 0.45, r / 0.45, 1]);

    put('iron', G.box, x, y + r + 0.12, z, [0, ry, 0], [0.12, 0.3, 0.2]);
  };
  const lantern = (x, y, z, i = 1.2, d = 14, col = '#ffb870', post = false) => {
    if (post) {
      box('iron', x, (y - 0.6) / 2, z, 0.14, y - 0.6, 0.14);
      box('iron', x, 0.15, z, 0.6, 0.3, 0.6);
      K.collider(x, (y - 0.6) / 2, z, 0.3, y - 0.6, 0.3);
    } else put('iron', G.box, x, y + 0.42, z, null, [0.06, 0.84, 0.06]);
    put('brass', G.lampCap, x, y + 0.02, z);
    put('lamp', G.lampGlass, x, y - 0.3, z);
    put('brass', G.box, x, y - 0.62, z, null, [0.36, 0.05, 0.36]);
    LIGHTS.push({ p: P(x, y - 0.4, z), c: new THREE.Color(col), i, d });
  };
  const ivyOn = [];
  // ivy: a spray of leaves over a rectangle of wall (facing n) or around a column
  const ivy = (x0, y0, z0, w, h, nx, nz, n) => ivyOn.push({ x0, y0, z0, w, h, nx, nz, n });

  // ---------- the sky above the storm: a dark teal dome, churning clouds high up, the rift ----------
  const SH = { time: { value: 0 }, flash: { value: 0 }, bolt: { value: V3(0, 1, 0) }, fp: { value: V3(0, 0, 0) }, cam: { value: V3() } };
  const HOR = new THREE.Color('#1a2a28');
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
            vec3 zen = vec3(0.012, 0.024, 0.026);
            vec3 col = mix(uHor, zen, smoothstep(-0.02, 0.55, y));
            vec2 q = d.xz / (0.18 + max(y, 0.0)) * 0.8;
            float n = fbm(q * 1.2 + vec2(uTime * 0.012, uTime * 0.005));
            float n2 = fbm(q * 3.1 - vec2(uTime * 0.02, 0.0));
            float c = smoothstep(0.38, 0.86, n * 0.75 + n2 * 0.35) * smoothstep(0.04, 0.3, y);
            col = mix(col, vec3(0.06, 0.1, 0.095) * (0.7 + 0.6 * n2), c * 0.85);
            // the rift, far behind: a thin tear, its lips pale, the Joker's rose at its heart
            vec3 N = normalize(vec3(0.92, 0.18, 0.34));
            float along = atan(d.z, d.x);
            float wid = 0.02 + 0.04 * fbm(vec2(along * 3.0, uTime * 0.03));
            float k = abs(dot(d, N));
            float lip = exp(-k / (wid * 1.1)) * smoothstep(0.1, 0.4, y);
            float core = exp(-k / (wid * 0.22)) * smoothstep(0.14, 0.45, y);
            col += vec3(0.3, 0.42, 0.36) * lip * 0.35 + vec3(1.0, 0.86, 0.92) * core * 0.6;
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.15 + 0.9 * c) * vec3(0.74, 0.8, 1.0) * (0.35 + 1.3 * near);
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
            vec3 col = mix(vec3(0.03, 0.05, 0.05), vec3(0.2, 0.26, 0.27), smoothstep(0.3, 0.82, h));
            float dd = length(vW.xz - uFP.xy);
            col += vec3(0.62, 0.7, 1.0) * uFP.z * exp(-dd / 70.0) * (0.4 + h) * 1.4;
            col += uFlash * 0.22 * vec3(0.7, 0.75, 1.0) * h;
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
      const core = mk('#e8f4ff', 3, 1);
      const halo = mk('#6ab8a0', 1.2, 0.3);
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
    Bo.core.material.color.set(opt.gold ? '#fff0c8' : '#e8f4ff').multiplyScalar(3);
    Bo.halo.material.color.set(opt.gold ? '#e8a030' : '#6ab8a0').multiplyScalar(1.2);
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
    const cy = O.y - 40;
    if (innerT <= 0) {
      innerT = 1.4 + Math.random() * 3;
      const a = Math.random() * TAU;
      const d = 60 + Math.random() * 300;
      SH.fp.value.set(me.x + Math.sin(a) * d, me.z + Math.cos(a) * d, 0.6 + Math.random() * 0.6);
    }
    if (stormT <= 0) {
      stormT = 6 + Math.random() * 8;
      const a = Math.random() * TAU;
      const d = 110 + Math.random() * 220;
      const x = me.x + Math.sin(a) * d;
      const z = me.z + Math.cos(a) * d;
      const p0 = V3(x, cy - 4, z);
      const p1 = V3(x + (Math.random() - 0.5) * 60, O.y + 120 + Math.random() * 80, z + (Math.random() - 0.5) * 60);
      const up = Math.random() < 0.5;
      bolt(up ? p0 : p1, up ? p1 : p0, { w: 0.6, life: 0.6, flash: 0.45 + Math.random() * 0.4 });
      SH.fp.value.set(x, z, 1.4);
      AU.thunder(d);
    }
  };

  // ---------- procedural sound: wind round the hall, distant thunder, the ropes ----------
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
      N.windF.frequency.value = 300;
      N.windF.Q.value = 0.8;
      N.wind = ctx.createGain();
      N.wind.gain.value = 0.12;
      src(WN).connect(N.windF).connect(N.wind).connect(out);
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowpass';
      lo.frequency.value = 110;
      N.rum = ctx.createGain();
      N.rum.gain.value = 0.45;
      src(BN).connect(lo).connect(N.rum).connect(out);
      return true;
    };
    let on = false;
    const env = (g, t0, a, peak, d) => {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    };
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
        N.windF.frequency.setTargetAtTime(280 + Math.sin(t * 0.21) * 100 + Math.sin(t * 0.67) * 40, ctx.currentTime, 0.4);
        N.wind.gain.setTargetAtTime(0.1 + 0.05 * Math.sin(t * 0.33), ctx.currentTime, 0.5);
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
        const k = clamp(1.3 - dist / 400, 0.25, 1.0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(k, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(k * 0.5, t0 + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random() * 0.5);
        s.stop(t0 + 3.4);
      },
      // the Valet's drum: a deep skin and its wooden rim (a feint is only the click of the rim)
      drum(k = 1, feint = false) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime + 0.01;
        if (!feint) {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(120, t0);
          o.frequency.exponentialRampToValueAtTime(52, t0 + 0.35);
          const g = ctx.createGain();
          env(g, t0, 0.005, 0.7 * k, 0.5);
          o.connect(g).connect(out);
          o.start(t0);
          o.stop(t0 + 0.6);
        }
        const s = ctx.createBufferSource();
        s.buffer = WN;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = feint ? 2400 : 900;
        f.Q.value = feint ? 4 : 1.2;
        const g = ctx.createGain();
        env(g, t0, 0.002, (feint ? 0.35 : 0.25) * k, feint ? 0.06 : 0.12);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random());
        s.stop(t0 + 0.2);
      },
      // a rope pulled tight: a creak of fibre and wood
      creak(k = 1) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime + 0.01;
        const s = ctx.createBufferSource();
        s.buffer = WN;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 9;
        f.frequency.setValueAtTime(520, t0);
        f.frequency.linearRampToValueAtTime(380, t0 + 0.4);
        const g = ctx.createGain();
        env(g, t0, 0.04, 0.32 * k, 0.4);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random());
        s.stop(t0 + 0.5);
      },
    };
  })();

  // ---------- interactive pieces ----------
  const LIGHTS = [];
  const pool = [];
  let flashLight = null;
  const figs = {};
  const tug = {};
  const car = {};
  const disc = {};
  const doors = [];
  const screens = {};
  const cards = {};
  // a rope drawn between two moving points, sagging (a chain of cylinders, one draw each)
  const makeRope = (n = 12, r = 0.045) => {
    const segs = [];
    const geo = new THREE.CylinderGeometry(r, r, 1, 8, 1, true).rotateX(Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, M.rope);
      m.castShadow = true;
      root.add(m);
      segs.push(m);
    }
    const a = V3();
    const b = V3();
    return {
      segs,
      set(p0, p1, sag) {
        for (let i = 0; i < n; i++) {
          const t0 = i / n;
          const t1 = (i + 1) / n;
          a.lerpVectors(p0, p1, t0);
          b.lerpVectors(p0, p1, t1);
          a.y -= sag * 4 * t0 * (1 - t0);
          b.y -= sag * 4 * t1 * (1 - t1);
          const m = segs[i];
          m.position.copy(a).add(b).multiplyScalar(0.5);
          m.scale.set(1, 1, a.distanceTo(b) + 0.02);
          m.lookAt(b);
        }
      },
    };
  };
  const labelTex = (main, sub, col = '#f2e6c4') =>
    LvKit.tex(512, 128, (g, w, h) => {
      LvKit.grain(g, w, h, '#123a26', 0.06, 2500);
      g.strokeStyle = '#d9a94a';
      g.lineWidth = 5;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.font = 'italic 46px Georgia, serif';
      g.fillText(main, w / 2, sub ? 62 : 80);
      if (sub) {
        g.font = '20px "IBM Plex Mono", monospace';
        g.fillStyle = '#b8d8c0';
        g.fillText(sub.toUpperCase(), w / 2, 100);
      }
    });
  const sign = (main, sub, x, y, z, ry, w = 3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), std('#ffffff', 0.6, { map: labelTex(main, sub) }));
    m.position.copy(P(x, y, z));
    m.rotation.y = ry;
    root.add(m);
    return m;
  };
  // the track of the tug of war: 13 notches, the clover marker slides on it
  const makeBoard = () => {
    const g = new THREE.Group();
    g.position.copy(P(0, 5.6, 43.7));
    g.rotation.y = Math.PI;
    root.add(g);
    const back = new THREE.Mesh(new THREE.BoxGeometry(12.4, 2.2, 0.25), M.woodDk);
    g.add(back);
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 1.6), M.felt);
    felt.position.z = 0.13;
    g.add(felt);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.08), M.brass);
    bar.position.z = 0.2;
    g.add(bar);
    const notches = [];
    for (let i = -6; i <= 6; i++) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.06, i === 0 ? 0.9 : 0.5, 0.06), i ? M.brass : M.lamp);
      n.position.set(i * 0.85, 0, 0.22);
      g.add(n);
      notches.push(n);
    }
    // the two ends: the Valet's side (his toque) and yours (two hearts)
    const endTex = (txt) =>
      LvKit.tex(256, 128, (c, w, h) => {
        c.fillStyle = '#f2e6c4';
        c.textAlign = 'center';
        c.font = 'italic 44px Georgia, serif';
        c.fillText(txt, w / 2, 80);
      });
    [
      [-1, 'Vous'],
      [1, 'Le Valet'],
    ].forEach(([s, t]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: endTex(t), transparent: true, toneMapped: false }));
      m.position.set(s * 6.9, 0, 0.2);
      g.add(m);
    });
    const marker = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), new THREE.MeshBasicMaterial({ map: T.medal, toneMapped: false }));
    marker.position.z = 0.28;
    g.add(marker);
    tug.board = { g, marker, x: 0 };
  };
  const makeDrum = () => {
    const g = new THREE.Group();
    g.position.copy(P(VA.drum[0], 0, VA.drum[1]));
    g.rotation.y = Math.PI + 0.35;
    root.add(g);
    // the stand: three oak legs
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 8), M.woodDk);
      l.position.set(Math.sin(a) * 0.45, 0.6, Math.cos(a) * 0.45);
      l.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25);
      g.add(l);
    }
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.62, 32, 1, true), std('#ffffff', 0.7, { map: robeTex('V', 'bod'), side: THREE.DoubleSide }));
    shell.position.y = 1.35;
    shell.rotation.x = Math.PI / 2 - 0.5;
    g.add(shell);
    const skinU = { k: { value: 0 }, c: { value: new THREE.Color('#ffd27a') } };
    const skin = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 40),
      new THREE.MeshStandardMaterial({ color: '#efe2bc', roughness: 0.8, emissive: '#000000' }),
    );
    skin.position.set(0, 0.32, 0);
    skin.rotation.x = -Math.PI / 2;
    shell.add(skin);
    const skin2 = skin.clone();
    skin2.position.y = -0.32;
    skin2.rotation.x = Math.PI / 2;
    shell.add(skin2);
    [0.31, -0.31].forEach((y) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 8, 40).rotateX(Math.PI / 2), M.brass);
      r.position.y = y;
      shell.add(r);
    });
    // the cover hiding it from the one who must not see it (drawn on that screen only)
    const cover = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 14, 0, TAU, 0, Math.PI * 0.62),
      std('#ffffff', 0.95, { map: T.felt, side: THREE.DoubleSide }),
    );
    cover.scale.set(1.0, 1.25, 1.0);
    cover.position.y = 0.55;
    cover.visible = false;
    g.add(cover);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.15, 48),
      new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    halo.position.copy(shell.position);
    halo.rotation.x = -0.5 - Math.PI / 2 + Math.PI;
    g.add(halo);
    tug.drum = { g, skin, shell, cover, halo, k: 0, red: 0 };
  };
  const makeCar = () => {
    const g = new THREE.Group();
    root.add(g);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), M.wood);
    deck.position.y = -0.15;
    deck.castShadow = deck.receiveShadow = true;
    g.add(deck);
    // a brass rim and four corner posts with a rope rail
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), M.brass);
        p.position.set(sx * 1.12, 0.5, sz * 1.12);
        g.add(p);
      }),
    );
    // a brass frame round the deck
    [
      [0, 1.22, 2.5, 0.08],
      [0, -1.22, 2.5, 0.08],
      [1.22, 0, 0.08, 2.5],
      [-1.22, 0, 0.08, 2.5],
    ].forEach(([x, z, sx, sz]) => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.1, sz), M.brass);
      rim.position.set(x, 0.0, z);
      g.add(rim);
    });
    // the trolley on the rail and the four ropes up to it
    const trolley = new THREE.Group();
    root.add(trolley);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.2), M.iron);
    trolley.add(tb);
    [-0.8, 0.8].forEach((z) => {
      const w = new THREE.Mesh(G.wheel, M.brass);
      w.rotation.y = Math.PI / 2;
      w.scale.setScalar(0.6);
      w.position.set(0, 0.45, z);
      trolley.add(w);
    });
    const ropes = [];
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        const r = new THREE.Mesh(G.rope, M.rope);
        r.userData.o = [sx * 1.0, sz * 1.0];
        root.add(r);
        ropes.push(r);
      }),
    );
    const b = Phys.box(O.x, O.y - 0.15, O.z + CAR.z0, 2.4, 0.3, 2.4, { dyn: true, surf: 'wood' });
    b.on = false;
    Object.assign(car, { g, trolley, ropes, b, z: CAR.z0, y: 0, vz: 0, vy: 0, shake: 0 });
  };
  const makeTokens = () => {
    car.tokens = [];
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 32).rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const face = new THREE.Mesh(geo, [M.brass, new THREE.MeshBasicMaterial({ map: T.medal, toneMapped: false }), new THREE.MeshBasicMaterial({ map: T.medal, toneMapped: false })]);
      g.add(face);
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 1.8),
        new THREE.MeshBasicMaterial({ map: T.glow, color: new THREE.Color('#ffd27a').multiplyScalar(1.4), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      g.add(halo);
      const str = new THREE.Mesh(G.rope, M.rope);
      g.add(str);
      g.visible = false;
      root.add(g);
      car.tokens.push({ g, halo, str, face });
    }
  };
  // the balance: a disc of marble and oak on a pivot, its cells of floor follow the tilt
  const makeDisc = () => {
    const g = new THREE.Group();
    g.position.copy(P(C.x, 0, C.z));
    root.add(g);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R, DISC_R, 0.4, 72), M.marble);
    top.position.y = -0.2;
    top.receiveShadow = true;
    g.add(top);
    const rimW = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R + 0.25, DISC_R + 0.1, 0.7, 72, 1, true), M.woodDk);
    rimW.position.y = -0.35;
    g.add(rimW);
    const rimB = new THREE.Mesh(new THREE.TorusGeometry(DISC_R + 0.2, 0.08, 8, 96).rotateX(Math.PI / 2), M.brass);
    rimB.position.y = 0.0;
    g.add(rimB);
    // a gold clover inlaid at the centre, a ring of brass
    const inlay = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.medal, roughness: 0.35, metalness: 0.6 }));
    inlay.position.y = 0.012;
    g.add(inlay);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.52, 96).rotateX(-Math.PI / 2), M.brass);
    ring.position.y = 0.01;
    g.add(ring);
    // under it: the pivot, a cone of oak beams, counterweights on ropes
    const under = new THREE.Mesh(new THREE.ConeGeometry(DISC_R * 0.85, 6, 24, 1, true), M.woodDk);
    under.position.y = -3.6;
    under.rotation.x = Math.PI;
    g.add(under);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), M.iron);
      w.position.set(Math.sin(a) * 5.2, -4.6 - (i % 2) * 1.2, Math.cos(a) * 5.2);
      g.add(w);
      const r = new THREE.Mesh(G.rope, M.rope);
      r.position.set(Math.sin(a) * 5.2, -2.2 - (i % 2) * 0.6, Math.cos(a) * 5.2);
      r.scale.set(0.6, 4 + (i % 2) * 1.2, 0.6);
      g.add(r);
    }
    // the targets (clovers glowing on the marble), the weight mark of the Roi
    const targets = ['dame', 'valet'].map((who) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.7).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: T.glow, color: new THREE.Color(who === 'dame' ? '#ff8ab4' : '#ffd27a').multiplyScalar(1.5), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      m.position.y = 0.03;
      m.visible = false;
      g.add(m);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 6, 16, 1, true).translate(0, 3, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(who === 'dame' ? '#ff8ab4' : '#ffd27a').multiplyScalar(1.2), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      );
      m.add(beam);
      return m;
    });
    // the warning glow at the low edge
    const warn = new THREE.Mesh(
      new THREE.RingGeometry(DISC_R - 0.6, DISC_R + 0.3, 64, 1, 0, Math.PI * 0.7).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ff5040', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    warn.position.y = 0.04;
    g.add(warn);
    // the floor cells (dyn colliders), top at the plane's height
    const cells = [];
    const S = 1.4;
    for (let i = -5; i <= 5; i++)
      for (let j = -5; j <= 5; j++) {
        const cx = i * S;
        const cz = j * S;
        if (Math.hypot(cx, cz) > DISC_R - 0.45) continue;
        const b = Phys.box(O.x + C.x + cx, O.y - 0.25, O.z + C.z + cz, S, 0.5, S, { dyn: true, surf: 'concrete' });
        b.on = false;
        cells.push({ b, cx, cz });
      }
    // the bridges onto it (west, east), retracted while the balance is in play
    const bridges = [-1, 1].map((s) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.4), M.wood);
      root.add(m);
      const b = Phys.box(O.x + C.x + s * BRIDGE_X, O.y - 0.15, O.z + C.z, 3.4, 0.3, 1.4, { dyn: true, surf: 'wood' });
      b.on = false;
      return { m, b, s, k: 1 };
    });
    Object.assign(disc, { g, cells, bridges, targets, warn, tilt: V3(), T: new THREE.Vector2(), tz: V3() });
  };
  // the wall across the hall at z, with an opening for a door in its middle
  const endWall = (z, door) => {
    if (!door) box('stone', 0, 4.5, z, HW * 2 + 1.2, 9, 0.8);
    else {
      const w = HW + 0.6 - 3.6;
      [-1, 1].forEach((s) => box('stone', s * (3.6 + w / 2), 4.5, z, w, 9, 0.8));
      box('stone', 0, 7.5, z, 7.2, 3, 0.8);
    }
    wall(0, 0, z, HW * 2, 9, 0.8);
  };
  const makeDoor = (z, title, sub) => {
    // a double oak door in an arch, closed (the wings are played one at a time)
    [-1, 1].forEach((s) => box('woodDk', s * 1.25, 2.4, z, 2.4, 4.8, 0.25));
    box('brass', 0, 2.4, z, 0.08, 4.8, 0.3);
    box('stone', -3, 3, z, 1.2, 6, 1.2);
    box('stone', 3, 3, z, 1.2, 6, 1.2);
    box('stone', 0, 6.4, z, 7.2, 0.9, 1.3);
    box('woodDk', 0, 5.4, z, 5, 1.2, 0.3);
    sign(title, sub, 0, 7.4, z - 0.7, Math.PI, 3.2);
    sign(title, sub, 0, 7.4, z + 0.7, 0, 3.2);
  };
  const makeScreen_ = (key, x, y, z, ry) => {
    if (typeof makeScreen === 'undefined') return;
    const s = makeScreen(4.6, 1.8, 1024);
    s.mesh.position.copy(P(x, y, z));
    s.mesh.rotation.y = ry;
    root.add(s.mesh);
    screens[key] = s;
  };

  // ---------- build ----------
  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) {
      root.visible = true;
      wx.visible = true;
      return;
    }
    Phys.owner('cour_c');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    root.visible = true;
    wx.visible = true;
    loadScans();
    makeTextures();
    makeMats();
    G.box = new THREE.BoxGeometry(1, 1, 1);
    G.rope = new THREE.CylinderGeometry(0.04, 0.04, 1, 8, 1, true);
    G.col = new THREE.CylinderGeometry(0.55, 0.62, 1, 20);
    G.wheel = new THREE.TorusGeometry(0.45, 0.08, 8, 24);
    G.lampCap = new THREE.ConeGeometry(0.28, 0.24, 6);
    G.lampGlass = new THREE.CylinderGeometry(0.16, 0.12, 0.5, 6);
    G.arch = new THREE.TorusGeometry(2.6, 0.32, 8, 20, Math.PI);
    G.cap = new THREE.BoxGeometry(1.5, 0.4, 1.5);
    makeSky();
    makeBolts();

    // ===== the rock island under the hall =====
    {
      const rg = new THREE.CylinderGeometry(0.5, 0.05, 1, 16, 8);
      const p = rg.attributes.position;
      const r = rng(77);
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const t = 0.5 - p.getY(i);
        const n = 1 + 0.16 * Math.sin(a * 3 + t * 5) + 0.09 * Math.sin(a * 7 - t * 9) + 0.08 * (r() - 0.5);
        p.setXYZ(i, p.getX(i) * n, -t, p.getZ(i) * n);
      }
      rg.computeVertexNormals();
      // under the floors only: the trench, the pit and the ring of the balance stay open on the void
      const lump = (x, z, w, h, d, a) => put('rock', rg, x, -0.5, z, [0, a, 0], [w, h, d]);
      lump(0, 9, 34, 26, 25.6, 0);
      lump(0, 36, 32, 20, 15.6, 0);
      lump(0, 50, 34, 18, 11.6, 0);
      lump(0, 95, 34, 18, 9.6, 0);
      lump(-11.6, 73, 4.8, 24, 40, 0);
      lump(11.6, 73, 4.8, 24, 40, 0);
      lump(0, 105, 13, 14, 12, 1.4);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        lump(C.x + Math.sin(a) * 15.2, C.z + Math.cos(a) * 15.2, 7.5, 14 + (i % 3) * 4, 7.5, a);
      }

    }

    // ===== the walls of the long hall: piers, arches open on the storm, oak trusses =====
    const pier = (x, z, h = 9) => {
      box('stone', x, h / 2, z, 1.4, h, 1.4);
      box('stone', x, 0.25, z, 1.8, 0.5, 1.8);
      box('marbleDk', x, h + 0.25, z, 1.7, 0.5, 1.7);
    };
    const sideWall = (z0, z1) => {
      [-1, 1].forEach((s) => {
        const x = s * (HW + 0.3);
        for (let z = z0; z <= z1 + 0.01; z += 6) pier(x, z);
        for (let z = z0; z < z1 - 0.01; z += 6) {
          // a low marble parapet, the arch above it, a lintel course
          box('marbleDk', x, 0.55, z + 3, 0.7, 1.1, 4.6);
          put('stone', G.arch, x, 6.4, z + 3, [0, Math.PI / 2, 0]);
          box('stone', x, 9.6, z + 3, 0.9, 1.8, 4.6);
        }
        wall(x, 0, (z0 + z1) / 2, 0.8, 9, z1 - z0);
        // the roof: oak rafters over the hall
        for (let z = z0; z <= z1 + 0.01; z += 6) {
          box('woodDk', 0, 10.4, z, HW * 2 + 1, 0.5, 0.45);
          box('woodDk', s * HW * 0.5, 12.2, z, HW + 1.2, 0.4, 0.35, [0, 0, s * 0.28]);
        }
        box('woodDk', s * HW * 0.5, 12.6, (z0 + z1) / 2, 0.3, 0.3, z1 - z0);
      });
      box('woodDk', 0, 14.2, (z0 + z1) / 2, 0.5, 0.5, z1 - z0);
    };

    // ===== V. la salle des cordes =====
    floor(0, 9, HW * 2, 26);
    floor(0, 36, HW * 2, 16);
    box('stone', 0, -0.35, 22.15, HW * 2, 0.7, 0.3);
    box('stone', 0, -0.35, 27.85, HW * 2, 0.7, 0.3);
    // the trench: ivy falling into the void, a low oak rail on our side
    for (let x = -HW + 1; x <= HW - 1; x += 2.6) box('woodDk', x, 0.5, 21.6, 0.16, 1.0, 0.16);
    box('wood', 0, 0.98, 21.6, HW * 2 - 1, 0.12, 0.2);
    wall(0, 0, 21.6, HW * 2, 0.95, 0.25);
    ivy(-HW + 0.5, -3.5, 22.3, HW * 2 - 1, 3.6, 0, -1, 260);
    ivy(-HW + 0.5, -3.5, 27.7, HW * 2 - 1, 3.6, 0, 1, 260);
    // the back wall with its arch and the board, the entrance wall behind us
    endWall(44.2, true);
    endWall(-4.2, false);
    sideWall(-4, 44);
    // the Valet's dais
    box('wood', 0, 0.1, 36, 9, 0.2, 16);
    // the grips: a brass post and a ring on the floor, one for each of you (colour of the kit)
    ['dame', 'valet'].forEach((who) => {
      const [x, z] = VA.grip[who];
      box('brass', x, 0.55, z + 0.7, 0.14, 1.1, 0.14);
      box('brass', x, 1.1, z + 0.7, 0.3, 0.1, 0.3);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.78, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(who === 'dame' ? '#ff6a9e' : '#ffb84a'), transparent: true, opacity: 0.75, toneMapped: false }),
      );
      ring.position.copy(P(x, 0.02, z));
      root.add(ring);
      tug['ring_' + who] = ring;
    });
    makeBoard();
    makeDrum();
    tug.ropes = { dame: makeRope(14), valet: makeRope(14) };
    // banners, lanterns, pulleys and coils of rope along the walls
    for (let z = 2; z < 44; z += 12)
      [-1, 1].forEach((s) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), M.banner);
        b.position.copy(P(s * (HW - 0.25), 6.2, z + 3));
        b.rotation.y = -s * Math.PI / 2;
        root.add(b);
      });
    [
      [-7, 9.6, 6],
      [7, 9.6, 6],
      [-7, 9.6, 18],
      [7, 9.6, 18],
      [-6, 9.6, 33],
      [6, 9.6, 33],
    ].forEach(([x, y, z]) => lantern(x, y, z, 1.5, 18));
    for (let z = 3; z < 44; z += 8)
      [-1, 1].forEach((s) => {
        pulley(s * (HW - 1.2), 9.2, z, Math.PI / 2, 0.5);
        ropeY(s * (HW - 1.2) - 0.45, 1.6, 9.2, z);
        ropeY(s * (HW - 1.2) + 0.45, 3.4, 9.2, z);
        box('iron', s * (HW - 1.2) + 0.45, 3.0, z, 0.5, 0.8, 0.5);
        put('rope', new THREE.TorusGeometry(0.4, 0.09, 6, 20).rotateX(Math.PI / 2), s * (HW - 1.4), 0.1, z + 2.5, null, null);
        put('rope', new THREE.TorusGeometry(0.32, 0.09, 6, 20).rotateX(Math.PI / 2), s * (HW - 1.4), 0.26, z + 2.5, null, null);
      });
    ivy(-HW + 0.2, 0.5, -3.7, 9, 7, 0, 1, 160);
    ivy(HW - 9.2, 0.5, -3.7, 9, 7, 0, 1, 160);
    ivy(-HW + 0.2, 1, 43.7, 8, 7, 0, -1, 140);
    ivy(HW - 8.2, 1, 43.7, 8, 7, 0, -1, 140);
    makeDoor(44.2, 'La Dame de Trèfle', 'les poulies');
    makeScreen_('V', -9.6, 4.6, 43.7, Math.PI);
    // the Valet de Trèfle
    figs.V = figure('V');
    figs.V.g.position.copy(P(VA.fig[0], 0.2, VA.fig[1]));
    figs.V.g.rotation.y = Math.PI;
    root.add(figs.V.g);
    cards.V = LvKit.trialCard('cV', false);
    cards.V.position.copy(P(0, 1.8, 17));
    root.add(cards.V);

    // ===== D. la galerie des poulies =====
    floor(0, 50, HW * 2, 12);
    floor(0, 95, HW * 2, 10);
    floor(-11.5, 73, 5, 34);
    floor(11.5, 73, 5, 34);
    endWall(100.2, true);
    sideWall(44, 100);
    // the edges of the pit: a stone kerb, oak rails (a gap at the quay, in the middle of the south edge)
    const railX = (x0, x1, z) => {
      box('wood', (x0 + x1) / 2, 0.98, z, x1 - x0, 0.12, 0.2);
      for (let x = x0; x <= x1 + 0.01; x += 2) box('woodDk', x, 0.5, z, 0.16, 1.0, 0.16);
      wall((x0 + x1) / 2, 0, z, x1 - x0, 1.05, 0.25);
    };
    const railZ = (z0, z1, x) => {
      box('wood', x, 0.98, (z0 + z1) / 2, 0.2, 0.12, z1 - z0);
      for (let z = z0; z <= z1 + 0.01; z += 2) box('woodDk', x, 0.5, z, 0.16, 1.0, 0.16);
      wall(x, 0, (z0 + z1) / 2, 0.25, 1.05, z1 - z0);
    };
    railX(-9, -1.5, 55.8);
    railX(1.5, 9, 55.8);
    railX(-9, 9, 90.2);
    railZ(56, 90, -8.8);
    railZ(56, 90, 8.8);
    box('brass', 0, 0.05, 55.6, 3, 0.1, 0.5);
    ivy(-9, -4, 56.05, 18, 4, 0, 1, 180);
    ivy(-9, -4, 89.95, 18, 4, 0, -1, 180);
    // the beams across the pit (iron bound oak)
    BEAMS.forEach(([z, y]) => {
      box('woodDk', 0, y, z, 18.4, 0.7, 0.7);
      [-6, 0, 6].forEach((x) => box('iron', x, y, z, 0.22, 0.78, 0.78));
    });
    // the gantry: the rail along the pit, three trusses holding it
    box('iron', 0, RAIL_Y + 0.2, 73, 0.5, 0.3, 40);
    box('iron', 0, RAIL_Y + 0.55, 73, 0.18, 0.5, 40);
    [54, 73, 92].forEach((z) => {
      box('woodDk', 0, RAIL_Y + 0.9, z, HW * 2, 0.6, 0.6);
      [-1, 1].forEach((s) => box('woodDk', s * 9, RAIL_Y - 2.3, z, 0.5, 6, 0.5, [0, 0, s * 0.35]));
    });
    // the console: an oak lectern with two crank wheels and two dials, at the west rail
    {
      const cx = CONSOLE.x;
      const cz = CONSOLE.z;
      box('wood', cx, 0.55, cz, 0.9, 1.1, 1.8);
      box('woodDk', cx + 0.1, 1.16, cz, 0.9, 0.12, 1.9, [0, 0, -0.3]);
      [-0.5, 0.5].forEach((dz) => {
        put('brass', G.wheel, cx + 0.35, 1.25, cz + dz, [0, Math.PI / 2, 0], [0.6, 0.6, 1]);
        box('brass', cx + 0.3, 1.25, cz + dz, 0.2, 0.06, 0.06);
      });
      sign('Pupitre', 'avancer · monter', cx + 0.55, 2.1, cz, Math.PI / 2, 1.8);
    }
    // the carriage, its tokens
    makeCar();
    makeTokens();
    // pulleys, counterweights and hanging ropes everywhere in the gallery (the tokens hide among them)
    for (let z = 60; z <= 88; z += 4)
      [-1, 1].forEach((s) => {
        const x = s * (5 + ((z * 7) % 3));
        const y0 = -6 + ((z * 13) % 5);
        ropeY(x, y0, RAIL_Y + 0.6, z + s * 1.3, 0.03);
        box('iron', x, y0 - 0.3, z + s * 1.3, 0.4, 0.6, 0.4);
      });
    for (let z = 50; z <= 98; z += 8)
      [-1, 1].forEach((s) => {
        pulley(s * (HW - 1.2), 9.2, z, Math.PI / 2, 0.6);
        ropeY(s * (HW - 1.2) - 0.55, 2.2, 9.2, z);
        box('iron', s * (HW - 1.2) - 0.55, 1.9, z, 0.5, 0.7, 0.5);
      });
    [
      [-7, 9.6, 49],
      [7, 9.6, 49],
      [-11.5, 9.6, 66],
      [11.5, 9.6, 66],
      [-11.5, 9.6, 82],
      [11.5, 9.6, 82],
      [-6, 9.6, 96],
      [6, 9.6, 96],
    ].forEach(([x, y, z]) => lantern(x, y, z, 1.4, 18));
    // the Dame's balcony at the far end
    box('marbleDk', 0, 0.7, 95.5, 10, 1.4, 6);
    box('wood', 0, 1.45, 95.5, 9.6, 0.1, 5.6);
    for (let x = -4.6; x <= 4.6; x += 0.8) box('brass', x, 1.95, 92.6, 0.08, 1.0, 0.08);
    box('brass', 0, 2.45, 92.6, 9.4, 0.08, 0.1);
    K.collider(0, 0.7, 95.5, 10, 1.4, 6);
    figs.D = figure('D');
    figs.D.g.position.copy(P(DFIG[0], DFIG[1] + 0.1, DFIG[2]));
    figs.D.g.rotation.y = Math.PI;
    root.add(figs.D.g);
    makeScreen_('D', -9.2, 4.8, 99.7, Math.PI);
    cards.D = LvKit.trialCard('cD', false);
    cards.D.position.copy(P(0, 1.8, 50));
    root.add(cards.D);
    makeDoor(100.2, 'Le Roi de Trèfle', 'la balance');

    // ===== K. la rotonde du Roi =====
    // the antechamber, then a round floor with a hole in the middle: the disc floats in it
    floor(0, 105, 10, 10);
    box('stone', -5.6, 4.5, 105, 1.2, 9, 10);
    box('stone', 5.6, 4.5, 105, 1.2, 9, 10);
    wall(-5.6, 0, 105, 1.2, 9, 10);
    wall(5.6, 0, 105, 1.2, 9, 10);
    {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, RING_OUT + 0.4, 0, TAU, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, RING_IN, 0, TAU, true);
      sh.holes.push(hole);
      const rgeo = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false, curveSegments: 64 }).rotateX(Math.PI / 2);
      put('marble', rgeo, C.x, 0, C.z);
      const kerb = new THREE.TorusGeometry(RING_IN, 0.18, 8, 96).rotateX(Math.PI / 2);
      put('brass', kerb, C.x, 0.02, C.z);
      // the colliders: cells of the ring, and a wall of cells round its edge
      const S = 1;
      for (let i = -18; i <= 18; i++)
        for (let j = -18; j <= 18; j++) {
          const x = i * S + 0.5;
          const z = j * S + 0.5;
          const d = Math.hypot(x, z);
          if (d > RING_IN + 0.35 && d < RING_OUT + 0.3 && !(z < -RING_OUT + 2 && Math.abs(x) < 4.6)) K.collider(C.x + x, -0.25, C.z + z, S, 0.5, S);
          else if (d >= RING_OUT + 0.3 && d < RING_OUT + 1.6 && !(z < 0 && Math.abs(x) < 4.6)) K.collider(C.x + x, 2, C.z + z, S, 4, S);
        }
      // the entrance gap of the ring toward the antechamber
      floor(0, 111.5, 9, 3);
    }
    // columns round the rotunda, the balustrade between them, no roof: the storm overhead
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) < 0) continue;
      const x = C.x + Math.sin(a) * (RING_OUT + 0.2);
      const z = C.z + Math.cos(a) * (RING_OUT + 0.2);
      put('stone', G.col, x, 5, z, null, [1, 10, 1]);
      put('marbleDk', G.cap, x, 10.2, z);
      put('marbleDk', G.cap, x, 0.2, z);
      const b = ((i + 0.5) / 16) * TAU;
      if (!(Math.abs(Math.sin(b)) < 0.3 && Math.cos(b) < 0)) box('marbleDk', C.x + Math.sin(b) * (RING_OUT + 0.2), 0.55, C.z + Math.cos(b) * (RING_OUT + 0.2), 4.6, 1.1, 0.5, [0, b, 0]);
      if (i % 2) ivy(x - 0.7, 0.4, z, 1.4, 8, 0, 0, 90);
    }
    {
      const crown = new THREE.TorusGeometry(RING_OUT + 0.2, 0.5, 8, 96).rotateX(Math.PI / 2);
      put('stone', crown, C.x, 10.8, C.z);
    }
    // the throne on its dais, north
    {
      const [tx, ty, tz] = THRONE;
      box('marbleDk', tx, 0.5, tz, 7, 1, 4);
      box('marbleDk', tx, 0.25, tz - 2.4, 5, 0.5, 1);
      K.collider(tx, 0.5, tz, 7, 1, 4);
      K.collider(tx, 0.25, tz - 2.4, 5, 0.5, 1);
      box('woodDk', tx, ty + 0.6, tz + 0.6, 2.2, 1.2, 1.6);
      box('woodDk', tx, ty + 2.4, tz + 1.3, 2.2, 3.6, 0.3);
      box('felt', tx, ty + 1.24, tz + 0.5, 1.9, 0.08, 1.3);
      box('felt', tx, ty + 2.4, tz + 1.12, 1.8, 3.0, 0.05);
      [-1, 1].forEach((s) => {
        box('woodDk', tx + s * 1.15, ty + 1.5, tz + 0.5, 0.24, 1.2, 1.6);
        put('brass', new THREE.SphereGeometry(0.16, 12, 10), tx + s * 1.15, ty + 2.2, tz - 0.25);
      });
      const crest = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshStandardMaterial({ map: T.medal, roughness: 0.35, metalness: 0.6 }));
      crest.position.copy(P(tx, ty + 4.6, tz + 1.1));
      crest.rotation.y = Math.PI;
      root.add(crest);
      const ban = (s) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4.2), M.banner);
        b.position.copy(P(tx + s * 3.4, 4.6, tz + 1.4));
        b.rotation.y = Math.PI;
        root.add(b);
      };
      ban(-1);
      ban(1);
    }
    // the north walk of the Roi onto the disc: a narrow plank
    box('wood', 0, -0.15, C.z + 8.6, 1.2, 0.3, 3.4);
    makeDisc();
    figs.K = figure('K');
    figs.K.g.position.copy(P(THRONE[0], THRONE[1], THRONE[2] - 0.6));
    figs.K.g.rotation.y = Math.PI;
    root.add(figs.K.g);
    [
      [-11, 3.4, 117],
      [11, 3.4, 117],
      [-14.6, 3.4, 128],
      [14.6, 3.4, 128],
      [-11, 3.4, 139],
      [11, 3.4, 139],
      [-4.2, 3.4, 145],
      [4.2, 3.4, 145],
    ].forEach(([x, y, z]) => lantern(x, y, z, 1.5, 16, '#ffb870', true));
    // green clover lamps on brass stands around the ring
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * TAU;
      const x = C.x + Math.sin(a) * 15.4;
      const z = C.z + Math.cos(a) * 15.4;
      if (z < 113) continue;
      box('brass', x, 1.1, z, 0.12, 2.2, 0.12);
      put('green', new THREE.SphereGeometry(0.22, 14, 10), x, 2.35, z);
      LIGHTS.push({ p: P(x, 2.4, z), c: new THREE.Color('#7dffb0'), i: 0.9, d: 10 });
    }
    makeScreen_('K', 0, 7.8, 147.6, Math.PI);

    // the ivy, batched: leaves scattered on the listed walls (one instanced draw)
    {
      const N = ivyOn.reduce((n, v) => n + v.n, 0);
      const geo = new THREE.PlaneGeometry(0.42, 0.42);
      const im = new THREE.InstancedMesh(geo, M.ivy, N);
      const r = rng(5);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      let k = 0;
      ivyOn.forEach((v) => {
        for (let i = 0; i < v.n; i++) {
          // denser at the bottom of a hanging curtain, in trailing strands
          const sx = r();
          const strand = Math.floor(sx * 14) / 14 + r() * 0.03;
          const sy = Math.pow(r(), 0.7);
          const x = v.x0 + (v.nx ? 0 : strand * v.w);
          const z = v.z0 + (v.nx ? strand * v.w : 0);
          const y = v.y0 + sy * v.h;
          const off = 0.02 + r() * 0.12;
          e.set(r() * 0.8 - 0.4, (v.nx ? Math.PI / 2 * Math.sign(v.nx) : v.nz < 0 ? Math.PI : 0) + r() * 0.6 - 0.3, r() * TAU);
          q.setFromEuler(e);
          const s = 0.6 + r() * 0.7;
          m4.compose(P(x + v.nx * off, y, z + v.nz * off), q, V3(s, s, s));
          im.setMatrixAt(k++, m4);
        }
      });
      im.instanceMatrix.needsUpdate = true;
      root.add(im);
    }
    flushBatches();

    // a pool of real lights for the nearest lamps
    for (let i = 0; i < 5; i++) {
      const l = new THREE.PointLight('#ffb870', 0, 18, 2);
      l.userData = { at: -1, k: 0 };
      root.add(l);
      pool.push(l);
    }
    flashLight = new THREE.PointLight('#c8e4ff', 0, 120, 1.4);
    root.add(flashLight);
    amb.motes = LvKit.motes({ n: 300, size: 1.5, colors: ['#ffe2a8', '#9fe8b8'], rise: [-0.1, 0.25], sway: 1.1, box: [44, 16], alpha: 0.4, seed: 23 });
  };
  const amb = { haze: new THREE.Color('#16201f') };

  // ---------- per-frame (the levels write ST, the world follows it) ----------
  const ST0 = () => ({
    area: 'V',
    fig: { V: {}, D: {}, K: {} },
    figPos: { V: null, D: null, K: null },
    // V: the score (-6..6), the drum (hit / feint flash, covered on this screen), the heave
    tug: 0,
    drumHit: 0,
    drumRed: 0,
    cover: false,
    heave: 0,
    ropesDown: false,
    // D: the carriage (target from the host), rope tokens [{z, y}|null], the shake on a crash
    car: { z: CAR.z0, y: 0 },
    carOn: false,
    tokens: [null, null, null],
    // K: torque (the tilt), the two targets {x, z} (this screen draws only the mate's), bridges
    torque: new THREE.Vector2(),
    targets: { dame: null, valet: null },
    bridges: 1,
    discOn: false,
    warn: 0,
    card: null,
  });
  const ST = ST0();
  let lightT = 0;
  let snapNext = false;

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the table's own geometry, materials and canvas textures (and the motes LvKit put in
  // the scene), the GPU copies of its scans, takes its colliders out and puts every table back
  // as after a page load. The film of the table (js/cine/) builds its own figures.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    if (amb.motes) R.scene.remove(amb.motes);
    const scans = Object.values(SCAN).map((x) => [x.alb, x.dat]);
    const r = Life.free([root, wx], [M, T, G, amb.motes, scans]);
    r.world = 'cour_c';
    r.colliders = Phys.drop('cour_c');
    built = false;
    [M, T, G, SKY, BAT, figs, tug, car, disc, screens, cards, ST].forEach(clear);
    Object.assign(ST, ST0());
    [LIGHTS, pool, bolts, doors, ivyOn].forEach((a) => (a.length = 0));
    delete amb.motes;
    flashLight = null;
    flashV = 0;
    SH.flash.value = 0;
    stormT = 3;
    innerT = 1;
    lightT = 0;
    snapNext = false;
    return r;
  };

  const update = (dt, t, me) => {
    if (!built) return;
    const dd = snapNext ? 30 : dt;
    snapNext = false;
    SH.time.value = t;
    SH.cam.value.copy(R.camera.position);
    SKY.dome.position.copy(R.camera.position);
    SKY.sea.position.set(R.camera.position.x, O.y - 40, R.camera.position.z);
    flashV = Math.max(0, flashV - dt * 3.2);
    SH.flash.value = flashV;
    SH.fp.value.z = Math.max(0, SH.fp.value.z - dt * 2.2);
    flashLight.position.copy(R.camera.position).add(V3(30, 60, 20));
    flashLight.intensity = flashV * 2.0;
    tickBolts(dt);
    tickStorm(dt, me);
    AU.tick(t);
    LvKit.tick(t);
    Object.values(screens).forEach((s) => s.update(dt, t));

    // ----- figures -----
    ['V', 'D', 'K'].forEach((k) => {
      const f = figs[k];
      const s = ST.fig[k] || {};
      const to = ST.figPos[k];
      if (to) {
        f.g.position.x = damp(f.g.position.x, O.x + to[0], to[3] || 2.2, dd);
        f.g.position.y = damp(f.g.position.y, O.y + to[1], to[3] || 2.2, dd);
        f.g.position.z = damp(f.g.position.z, O.z + to[2], to[3] || 2.2, dd);
        if (to[4] != null) f.g.rotation.y = angleDamp(f.g.rotation.y, to[4], 3, dd);
      }
      poseFig(f, t, dt, s);
    });

    // ----- V: the board, the drum, the two ropes -----
    {
      const B = tug.board;
      B.x = damp(B.x, -ST.tug * 0.85, 6, dd);
      B.marker.position.x = B.x;
      const D = tug.drum;
      D.k = Math.max(0, D.k - dt * 3.5);
      D.red = Math.max(0, D.red - dt * 3);
      if (ST.drumHit) {
        D.k = 1;
        ST.drumHit = 0;
      }
      if (ST.drumRed) {
        D.red = 1;
        ST.drumRed = 0;
      }
      D.skin.material.emissive.setRGB(D.k * 0.9 + D.red * 0.9, D.k * 0.62 + D.red * 0.1, D.k * 0.2 + D.red * 0.06);
      D.halo.material.color.set(D.red > D.k ? '#ff4a3a' : '#ffd27a');
      D.halo.material.opacity = Math.max(D.k, D.red) * 0.8;
      D.halo.scale.setScalar(1 + (1 - Math.max(D.k, D.red)) * 0.3);
      D.shell.scale.setScalar(1 + D.k * 0.03);
      D.cover.visible = ST.cover;
      if (ST.area === 'V') {
        const f = figs.V;
        f.g.updateMatrixWorld(true);
        const hl = f.hands[0].getWorldPosition(V3());
        const heave = Math.max(0, ST.heave);
        ST.heave = Math.max(0, ST.heave - dt * 2.5);
        ['dame', 'valet'].forEach((who, i) => {
          const [gx, gz] = VA.grip[who];
          const p0 = P(gx, 1.1, gz + 0.7);
          // let go: the ropes lie on the floor up to the trench
          if (ST.ropesDown) return tug.ropes[who].set(p0, P(gx * 0.7 + (i ? 0.3 : -0.3), 0.06, 21.2), 0.9);
          const p1 = hl.clone().add(V3(i ? 0.08 : -0.08, -0.05, 0));
          const len = p0.distanceTo(p1);
          tug.ropes[who].set(p0, p1, Math.max(0.05, 0.5 - heave * 0.4) * (len / 20));
        });
      }
    }

    // ----- D: the carriage follows the host, the tokens hang where they are -----
    {
      car.b.on = ST.carOn && root.visible;
      const k = dd > 1 ? 1 : 1 - Math.exp(-12 * dt);
      car.z += (ST.car.z - car.z) * k;
      car.y += (ST.car.y - car.y) * k;
      car.shake = Math.max(0, car.shake - dt * 2);
      const sx = Math.sin(t * 38) * car.shake * 0.12;
      const oldTop = car.b.max[1];
      const oldZ = (car.b.min[2] + car.b.max[2]) / 2;
      car.b.min[0] = O.x - 1.2;
      car.b.max[0] = O.x + 1.2;
      car.b.min[1] = O.y + car.y - 0.3;
      car.b.max[1] = O.y + car.y;
      car.b.min[2] = O.z + car.z - 1.2;
      car.b.max[2] = O.z + car.z + 1.2;
      // the one riding moves with it (this screen's player only; the other comes by the network)
      const pb = Player.body;
      if (car.b.on && pb.ground === car.b) {
        pb.p.y += car.b.max[1] - oldTop;
        pb.p.z += (car.b.min[2] + car.b.max[2]) / 2 - oldZ;
      }
      car.g.position.set(O.x + sx, O.y + car.y, O.z + car.z);
      car.g.rotation.z = Math.sin(t * 1.3) * 0.01 + sx * 0.1;
      car.trolley.position.set(O.x, O.y + RAIL_Y - 0.15, O.z + car.z);
      car.ropes.forEach((r) => {
        const [ox, oz] = r.userData.o;
        const y0 = car.y + 0.9;
        const y1 = RAIL_Y - 0.3;
        r.position.set(O.x + ox * 0.9 + sx, O.y + (y0 + y1) / 2, O.z + car.z + oz * 0.9);
        r.scale.set(0.8, Math.max(0.1, y1 - y0), 0.8);
      });
      car.tokens.forEach((tk, i) => {
        const p = ST.tokens[i];
        tk.g.visible = !!p && ST.area === 'D';
        if (!tk.g.visible) return;
        tk.g.position.copy(P(0, p.y + Math.sin(t * 1.4 + i) * 0.06, p.z));
        tk.g.rotation.y = Math.sin(t * 0.8 + i) * 0.6 + Math.PI / 2;
        tk.halo.lookAt(R.camera.position);
        tk.halo.material.opacity = 0.45 + Math.sin(t * 3 + i) * 0.15;
        // its string up to the rail
        const top = RAIL_Y - p.y;
        tk.str.position.set(0, top / 2 + 0.45, 0);
        tk.str.scale.set(0.5, top - 0.45, 0.5);
      });
    }

    // ----- K: the balance tilts toward the heavier side; its cells follow -----
    {
      const T2 = ST.torque;
      const tilt = disc.tilt;
      // tilt (radians) around the axis across the torque, small: the floor must stay walkable
      const mag = Math.min(0.075, T2.length() * 0.012);
      const ax = T2.length() > 1e-4 ? V3(T2.y, 0, -T2.x).normalize() : V3(1, 0, 0);
      tilt.x = damp(tilt.x, ax.x * mag, 4, dd);
      tilt.z = damp(tilt.z, ax.z * mag, 4, dd);
      disc.g.rotation.set(tilt.x, 0, tilt.z);
      const on = ST.discOn && root.visible;
      // the plane's height at (x, z): the heavy side goes down
      const sx = Math.sin(tilt.x);
      const sz = Math.sin(tilt.z);
      disc.cells.forEach((c) => {
        c.b.on = on;
        const h = -c.cz * sx + c.cx * sz;
        c.b.min[1] = O.y + h - 0.5;
        c.b.max[1] = O.y + h;
      });
      disc.bridges.forEach((b) => {
        b.k = damp(b.k, ST.bridges, 3, dd);
        b.m.position.copy(P(C.x + b.s * (BRIDGE_X + (1 - b.k) * 3.6), -0.15, C.z));
        b.m.visible = b.k > 0.03;
        b.b.on = on && ST.bridges > 0.5;
      });
      disc.targets.forEach((m, i) => {
        const who = i ? 'valet' : 'dame';
        const p = ST.targets[who];
        m.visible = !!p;
        if (p) {
          m.position.set(p.x, 0.03, p.z);
          m.rotation.y = t * 0.6;
          m.material.opacity = 0.7 + Math.sin(t * 4) * 0.2;
        }
      });
      disc.warn.material.opacity = ST.warn * (0.5 + 0.4 * Math.sin(t * 14));
      if (T2.length() > 1e-3) disc.warn.rotation.y = Math.atan2(T2.x, T2.y) - WARN_YAW;
    }

    // ----- the cards -----
    ['V', 'D'].forEach((k) => {
      const c = cards[k];
      c.visible = ST.card === k;
      if (c.visible) {
        c.rotation.y = t * 0.8;
        c.position.y = O.y + 1.9 + Math.sin(t * 1.5) * 0.12;
      }
    });

    // ----- the real lights follow the nearest lamps -----
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
      l.intensity = L ? L.i * u.k * (0.94 + Math.sin(t * 9 + u.at) * 0.03) : 0;
    });
  };
  // the yaw of the middle of the warning arc as built (RingGeometry 0 → 0.7 pi, laid flat)
  const WARN_YAW = Math.atan2(Math.cos(Math.PI * 0.35), -Math.sin(Math.PI * 0.35));

  // ---------- queries ----------
  // the torque of a set of weights on the disc ([{x, z, w}] in world coordinates) → Vector2 (x, z)
  const torque = (list) => {
    const T2 = new THREE.Vector2();
    list.forEach((p) => {
      const x = p.x - (O.x + C.x);
      const z = p.z - (O.z + C.z);
      T2.x += x * (p.w || 1);
      T2.y += z * (p.w || 1);
    });
    return T2;
  };
  const onDisc = (p) => Math.hypot(p.x - (O.x + C.x), p.z - (O.z + C.z)) < DISC_R + 0.1 && p.y > O.y - 1.6 && p.y < O.y + 3;
  const atGrip = (who, p) => Math.hypot(p.x - (O.x + VA.grip[who][0]), p.z - (O.z + VA.grip[who][1])) < 1.3 && Math.abs(p.y - O.y) < 1;
  const onCar = (p) =>
    Math.abs(p.x - O.x) < 1.35 && Math.abs(p.z - (O.z + car.z)) < 1.35 && p.y > O.y + car.y - 0.3 && p.y < O.y + car.y + 0.8;
  const atConsole = (p) => Math.hypot(p.x - (O.x + CONSOLE.op[0]), p.z - (O.z + CONSOLE.op[1])) < 1.6 && Math.abs(p.y - O.y) < 1;
  // the carriage (with someone on it) against the beams: [z, y] of the carriage
  const carHits = (z, y) => BEAMS.some(([bz, by]) => Math.abs(z - bz) < CAR.half + 0.35 && y - 0.35 < by + 0.35 && y + 2.1 > by - 0.35);
  const SPAWN = {
    V: [[-2.4, 0, 4], [2.4, 0, 4]],
    D: [[-1.6, 0, 50.5], [1.6, 0, 50.5]],
    Dop: [[CONSOLE.op[0], 0, CONSOLE.op[1] - 1.2], [CONSOLE.op[0], 0, CONSOLE.op[1] + 1.2]],
    K: [[-2, 0, 112.5], [2, 0, 112.5]],
    Kdisc: [[-1.2, 0.1, C.z], [1.2, 0.1, C.z]],
  };
  const spawn = (key, who) => {
    const s = SPAWN[key] || SPAWN.V;
    const p = s[who === 'dame' ? 0 : 1];
    return P(p[0], p[1], key === 'Kdisc' ? p[2] : p[2]);
  };

  return {
    O,
    P,
    rel,
    VA,
    PIT,
    CAR,
    BEAMS,
    CONSOLE,
    C,
    DISC_R,
    RAIL_Y,
    THRONE,
    ST,
    AU,
    amb,
    build,
    unbuild,
    figure,
    poseFig,
    FIG,
    clover,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
      wx.visible = false;
      AU.set(false);
      flashV = 0;
      ST.carOn = false;
      ST.discOn = false;
      if (car.b) car.b.on = false;
      if (disc.cells) disc.cells.forEach((c) => (c.b.on = false));
      if (disc.bridges) disc.bridges.forEach((b) => (b.b.on = false));
    },
    update,
    snap() {
      snapNext = true;
    },
    bolt,
    flash,
    torque,
    onDisc,
    atGrip,
    onCar,
    atConsole,
    carHits,
    spawn,
    get screens() {
      return screens;
    },
    get figs() {
      return figs;
    },
    get car() {
      return car;
    },
    get disc() {
      return disc;
    },
    get root() {
      return root;
    },
    get mats() {
      return M;
    },
    get tex() {
      return T;
    },
    shakeCar() {
      car.shake = 1;
    },
    tokenPos: (i) => (ST.tokens[i] ? P(0, ST.tokens[i].y, ST.tokens[i].z) : null),
    cardPos: (k) => (cards[k] ? cards[k].position : null),
  };
})();
