// ♥ · La table de Cœur, in the Cour above the storm: the palace of the three heart figures, rose
// stone, velvet and gilt, warm candlelight. One long building on a floating rock, three rooms:
//  V. la serre: a glass conservatory; a rose garden on a turning music-box disc, the belvédère
//  D. la salle de bal: a parquet under three chandeliers, galleries on both sides, the buffet
//     (south) and the Dame's table (north); her dancers waltz on it, seen only from the galleries
//  K. le théâtre du Roi: velvet stalls, a great curtain, and behind it the stage with his carousel
// The three figures are Veilleurs in tall court-card costumes and porcelain masks (figure()).
// Scanned materials (Poly Haven, lazily loaded for these levels only, procedural until they arrive).
// Geometry, visuals, sound and pure helpers only; the rules live in js/levels/tr_hV.js, tr_hD.js,
// tr_hK.js, the end-of-table film in js/cine/cour_h.js.
const CourH = (() => {
  const O = V3(6000, 0, 16000);
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

  // ---------- layout (relative to O; the building runs along +z) ----------
  const HW = 14;
  // V: the turning rose garden, its twelve bushes (8 outside, 4 inside), the belvédère
  const GARDEN = { x: 0, z: 20, r: 8.6 };
  const SLOTS = [];
  for (let i = 0; i < 8; i++) SLOTS.push([Math.sin(((i + 0.5) / 8) * TAU) * 6.3, Math.cos(((i + 0.5) / 8) * TAU) * 6.3]);
  for (let i = 0; i < 4; i++) SLOTS.push([Math.sin((i / 4) * TAU) * 3.4, Math.cos((i / 4) * TAU) * 3.4]);
  const BELV = { x0: -7.6, x1: 7.6, z0: 36, z1: 41.6, y: 4.2 };
  const VFIG = [0, 0, 31.2];
  // D: the ballroom
  const DANCE = { x0: -9, x1: 9, z0: 60, z1: 88 };
  const BUFFET = { x: 0, z: 54.2 };
  const TABLE = { x: 0, z: 93.6 };
  const DFIG = [0, 0, 96.4];
  const GAL = { x: 10, y: 4.2, z0: 58, z1: 97 };
  // K: the theatre
  const RUG = { x: 0, z: 110 };
  const CURTAIN_Z = 124;
  const CURTAIN_H = 6.6;
  const STAGE_Y = 1.2;
  const CAROUSEL = { x: 0, z: 135.5, r: 4.4 };
  const THRONE = [0, STAGE_Y, 148.6];

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
    marble: { ids: ['tex.hcour.marble.alb', 'tex.hcour.marble.nrm'], mul: 1 },
    velvet: { ids: ['tex.hcour.velvet.alb', 'tex.hcour.velvet.nrm'], mul: 1 },
    // already in the game: the same files, shared
    wood: { ids: ['tex.wood.alb', 'tex.wood.nrm'], mul: 0.75 },
    stone: { ids: ['tex.stone.alb', 'tex.stone.nrm'], mul: 0.5 },
    plaster: { ids: ['tex.h10.plaster.alb', 'tex.h10.plaster.nrm'], mul: 1 },
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
    const m = Tex.mat(kind, Object.assign({ cc: 'h_' + name + (opt.cc || '') }, opt));
    if (!m.userData.tri) return m;
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

  // ---------- hearts: on a canvas, as a shape ----------
  // a heart centred on (cx, cy), s its width (the tip down, canvas y down)
  const heart = (g, cx, cy, s, stroke = false) => {
    g.beginPath();
    g.moveTo(cx, cy + s * 0.5);
    g.bezierCurveTo(cx - s * 0.62, cy + s * 0.05, cx - s * 0.56, cy - s * 0.52, cx, cy - s * 0.22);
    g.bezierCurveTo(cx + s * 0.56, cy - s * 0.52, cx + s * 0.62, cy + s * 0.05, cx, cy + s * 0.5);
    g.closePath();
    if (stroke) g.stroke();
    else g.fill();
  };
  const heartShape = (s = 1) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.5 * s);
    sh.bezierCurveTo(-0.62 * s, -0.05 * s, -0.56 * s, 0.52 * s, 0, 0.22 * s);
    sh.bezierCurveTo(0.56 * s, 0.52 * s, 0.62 * s, -0.05 * s, 0, -0.5 * s);
    return sh;
  };
  // a solid heart (centred, facing +z), depth d
  const heartGeo = (s = 1, d = 0.2, bevel = 0.04) => {
    const g = new THREE.ExtrudeGeometry(heartShape(s), { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
    g.translate(0, 0, -d / 2);
    g.computeVertexNormals();
    return g;
  };

  // ---------- a rose (one merged geometry: three rings of cupped petals and the sepals) ----------
  const merge = (list) => {
    let n = 0;
    const flat = list.map((g) => {
      const h = g.index ? g.toNonIndexed() : g;
      if (!h.attributes.normal) h.computeVertexNormals();
      n += h.attributes.position.count;
      return h;
    });
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    let o = 0;
    flat.forEach((h) => {
      pos.set(h.attributes.position.array, o * 3);
      nor.set(h.attributes.normal.array, o * 3);
      o += h.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere();
    return out;
  };
  let bloomG = null;
  // the bloom: base at y = 0, about 0.2 m across (petals double-sided: their material says so)
  const bloomGeo = () => {
    if (bloomG) return bloomG;
    const parts = [];
    const petal = (w, h, cup, curl, open, r0, y0, th) => {
      const g = new THREE.PlaneGeometry(w, h, 4, 4);
      g.translate(0, h / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i) / h;
        // cupped across, the top edge rolled outward, narrower at the base
        p.setX(i, x * (0.45 + 0.55 * Math.sin(Math.min(1, y * 1.3) * Math.PI * 0.5)));
        p.setZ(i, -cup * (x * x) / (w * w) * w + curl * y * y * h);
      }
      g.computeVertexNormals();
      g.rotateX(open);
      g.translate(0, y0, r0);
      g.rotateY(th);
      parts.push(g);
    };
    const rings = [
      { n: 3, w: 0.07, h: 0.075, cup: 1.1, curl: 0.05, open: -0.12, r: 0.012, y: 0.02 },
      { n: 5, w: 0.1, h: 0.085, cup: 1.0, curl: 0.18, open: 0.22, r: 0.03, y: 0.012 },
      { n: 6, w: 0.13, h: 0.09, cup: 0.9, curl: 0.35, open: 0.62, r: 0.05, y: 0.0 },
      { n: 7, w: 0.14, h: 0.08, cup: 0.7, curl: 0.45, open: 1.0, r: 0.07, y: -0.008 },
    ];
    rings.forEach((R0, k) => {
      for (let i = 0; i < R0.n; i++) petal(R0.w, R0.h, R0.cup, R0.curl, R0.open, R0.r, R0.y, (i / R0.n) * TAU + k * 0.7);
    });
    // a tight bud in the heart
    const bud = new THREE.SphereGeometry(0.03, 10, 8).scale(1, 1.4, 1);
    bud.translate(0, 0.05, 0);
    parts.push(bud);
    bloomG = merge(parts);
    return bloomG;
  };

  // ---------- canvas textures ----------
  const T = {};
  const makeTextures = () => {
    // rose leaves: a sheet of four sprays of three serrated leaflets, cut out by alpha
    T.leaf = LvKit.tex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      const leaf = (cx, cy, s, col, rot) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, s * 0.5);
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * Math.PI;
          const r = s * (0.5 + (k % 2 ? 0.03 : 0));
          g.lineTo(-Math.sin(a) * r * 0.55, Math.cos(a) * r);
        }
        for (let k = 10; k >= 0; k--) {
          const a = (k / 10) * Math.PI;
          const r = s * (0.5 + (k % 2 ? 0.03 : 0));
          g.lineTo(Math.sin(a) * r * 0.55, Math.cos(a) * r);
        }
        g.fill();
        g.strokeStyle = 'rgba(220,240,190,0.4)';
        g.lineWidth = s * 0.03;
        g.beginPath();
        g.moveTo(0, s * 0.48);
        g.lineTo(0, -s * 0.45);
        for (let k = -2; k <= 2; k++) {
          g.moveTo(0, k * s * 0.15);
          g.lineTo(-s * 0.2, k * s * 0.15 - s * 0.1);
          g.moveTo(0, k * s * 0.15);
          g.lineTo(s * 0.2, k * s * 0.15 - s * 0.1);
        }
        g.stroke();
        g.restore();
      };
      const spray = (cx, cy, col) => {
        leaf(cx, cy - 26, 52, col, 0);
        leaf(cx - 26, cy + 10, 44, col, -1.0);
        leaf(cx + 26, cy + 10, 44, col, 1.0);
      };
      spray(64, 70, '#2c5a26');
      spray(192, 66, '#386a2e');
      spray(66, 194, '#244a20');
      spray(190, 192, '#41762f');
    });
    // a velvet banner: rose field, a gold heart, a scalloped hem
    T.banner = LvKit.tex(256, 512, (g, w, h) => {
      LvKit.grain(g, w, h, '#8a1a34', 0.07, 6000);
      g.fillStyle = '#e0b45a';
      g.fillRect(0, 0, w, 14);
      g.fillRect(14, 0, 6, h - 40);
      g.fillRect(w - 20, 0, 6, h - 40);
      g.fillStyle = '#f0cc74';
      heart(g, w / 2, h * 0.36, 120);
      g.fillStyle = '#f6e8d0';
      g.font = 'italic 38px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('Cœur', w / 2, h * 0.72);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc((i + 0.5) * (w / 4), h + 6, w / 8, 0, TAU);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    });
    // the heart that glows (the guide's marks, the stage marks)
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
      heart(g, 128, 132, 120);
    });
    T.dot = LvKit.tex(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });
    T.medal = LvKit.tex(256, 256, (g) => {
      const gr = g.createRadialGradient(110, 100, 10, 128, 128, 128);
      gr.addColorStop(0, '#fff1c8');
      gr.addColorStop(0.6, '#d9a24a');
      gr.addColorStop(1, '#7a5420');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#6a4418';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(128, 128, 112, 0, TAU);
      g.stroke();
      g.fillStyle = '#a8183a';
      heart(g, 128, 134, 120);
    });
    // the parquet's inlay: a gold border and a rose of the winds of hearts at the centre
    T.inlay = LvKit.tex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(232,190,110,0.9)';
      g.lineWidth = 10;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.46, 0, TAU);
      g.stroke();
      g.lineWidth = 4;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.41, 0, TAU);
      g.stroke();
      g.fillStyle = 'rgba(150,30,60,0.85)';
      for (let i = 0; i < 8; i++) {
        g.save();
        g.translate(w / 2, h / 2);
        g.rotate((i / 8) * TAU);
        heart(g, 0, -w * 0.25, 70);
        g.restore();
      }
      g.fillStyle = 'rgba(232,190,110,0.95)';
      heart(g, w / 2, h / 2 + 6, 110);
    });
  };
  // the court-card costume, per figure
  const FIG = {
    V: { h: 2.72, a: '#9a1f3a', b: '#f6ece0', trim: '#e0b45a', skin: '#b9a8c4', rank: 'V', sub: 'Le Valet' },
    D: { h: 2.86, a: '#c04a68', b: '#fbefe6', trim: '#e8c068', skin: '#c4a6bc', rank: 'D', sub: 'La Dame' },
    K: { h: 3.08, a: '#6e1426', b: '#f0dcc0', trim: '#f0c860', skin: '#a69cc0', rank: 'R', sub: 'Le Roi' },
  };
  const robeTex = (k, part) =>
    LvKit.tex(512, 512, (g, w, h) => {
      const F = FIG[k];
      LvKit.grain(g, w, h, F.a, 0.06, 7000);
      // damask: small gold hearts in a lattice
      g.fillStyle = F.trim;
      g.globalAlpha = 0.22;
      for (let y = 20; y < h; y += 46) for (let x = ((y / 46) % 2) * 23; x < w; x += 46) heart(g, x, y, 16);
      g.globalAlpha = 1;
      // the front panel (u = 0 is the front: split across both edges), ivory with a gold border
      const pw = (part === 'skirt' ? w * 0.13 : w * 0.11) * (k === 'D' ? 0.6 : 1);
      [
        [-pw, pw * 2],
        [w - pw, pw * 2],
      ].forEach(([x, ww]) => {
        g.fillStyle = F.trim;
        g.fillRect(x - 6, 0, ww + 12, h);
        g.fillStyle = F.b;
        g.fillRect(x, 0, ww, h);
      });
      g.fillStyle = '#b01c3c';
      if (part === 'skirt') {
        for (let i = 0; i < 3; i++) {
          heart(g, 0, 150 + i * 120, 52);
          heart(g, w, 150 + i * 120, 52);
        }
      } else {
        heart(g, 0, h * 0.45, 88);
        heart(g, w, h * 0.45, 88);
      }
      // gold bands: the hem (bottom of the canvas = bottom of the cloth) and the top
      g.fillStyle = F.trim;
      g.fillRect(0, h - 34, w, 22);
      g.fillRect(0, part === 'skirt' ? 6 : h - 70, w, 8);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = 0; x < w; x += 16) g.fillRect(x, h - 30, 6, 14);
    });
  // the porcelain mask of a court card: painted brows, rouge, lips, a heart on the brow, the eye
  // holes cut out (the Veilleur's own eyes shine through)
  const maskTex = (k) =>
    LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#fdf7f2');
      gr.addColorStop(1, '#efdcd6');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(236,110,140,0.34)';
      [72, 184].forEach((x) => {
        g.beginPath();
        g.ellipse(x, 160, 28, 17, 0, 0, TAU);
        g.fill();
      });
      g.strokeStyle = '#3a2228';
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
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(128, 112);
      g.lineTo(122, 160);
      g.lineTo(132, 164);
      g.stroke();
      // the lips: a small red heart-bow
      g.fillStyle = '#c0203e';
      g.beginPath();
      g.moveTo(108, 198);
      g.quadraticCurveTo(118, 188, 128, 194);
      g.quadraticCurveTo(138, 188, 148, 198);
      g.quadraticCurveTo(128, 212, 108, 198);
      g.fill();
      if (k === 'K') {
        // a painted royal beard and moustache, auburn
        g.fillStyle = '#b4683c';
        g.beginPath();
        g.moveTo(96, 186);
        g.bezierCurveTo(110, 176, 120, 184, 128, 186);
        g.bezierCurveTo(136, 184, 146, 176, 160, 186);
        g.bezierCurveTo(150, 192, 140, 190, 128, 190);
        g.bezierCurveTo(116, 190, 106, 192, 96, 186);
        g.fill();
        g.beginPath();
        g.moveTo(92, 210);
        g.quadraticCurveTo(128, 300, 164, 210);
        g.quadraticCurveTo(128, 236, 92, 210);
        g.fill();
      }
      if (k === 'D') {
        // a beauty spot in the shape of a heart
        g.fillStyle = '#7a1028';
        heart(g, 186, 136, 12);
      }
      if (k === 'V') {
        // a little painted tear of a heart under the left eye: a court jester's mark
        g.fillStyle = '#c0203e';
        heart(g, 70, 150, 12);
      }
      g.fillStyle = '#c8203e';
      heart(g, 128, 40, 30);
      g.strokeStyle = '#e0b45a';
      g.lineWidth = 6;
      g.strokeRect(3, 3, w - 6, h - 6);
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
      LvKit.grain(g, w, h, '#f6f0e8', 0.05, 3000);
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
  const fanTex = () =>
    LvKit.tex(512, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      // a half disc of rose silk on ivory ribs, a painted heart and lace edge
      g.fillStyle = '#f4d8dc';
      g.beginPath();
      g.moveTo(w / 2, h);
      g.arc(w / 2, h, h * 0.96, Math.PI, 0);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(160,40,70,0.55)';
      g.lineWidth = 3;
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI + (i / 14) * Math.PI;
        g.beginPath();
        g.moveTo(w / 2, h);
        g.lineTo(w / 2 + Math.cos(a) * h * 0.96, h + Math.sin(a) * h * 0.96);
        g.stroke();
      }
      g.fillStyle = '#b0183a';
      heart(g, w / 2, h * 0.5, 80);
      g.strokeStyle = '#e0b45a';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(w / 2, h, h * 0.92, Math.PI, 0);
      g.stroke();
    });

  // ---------- a court figure (a Veilleur in costume), built fresh for each use ----------
  // kind: 'V' | 'D' | 'K'. Returns { g, upper, head, arms, hands, prop, card, fan } and is posed
  // by poseFig(f, t, dt, s). Feet at y = 0, facing +z. Its own materials (the film disposes them).
  const figTex = {};
  const figure = (kind) => {
    const F = FIG[kind];
    if (!figTex[kind]) figTex[kind] = { skirt: robeTex(kind, 'skirt'), bod: robeTex(kind, 'bod'), mask: maskTex(kind) };
    const TX = figTex[kind];
    const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
    const gold = std(F.trim, 0.3, 0.9);
    if (typeof Assets !== 'undefined' && Assets.envify) Assets.envify(gold, 0.7);
    const skin = std(F.skin, 0.45, 0.05);
    const glove = std('#f6f0ea', 0.6);
    const lace = std('#fbf4ee', 0.75, 0, { side: THREE.DoubleSide });
    const eyeM = std('#06070a', 0.06, 0.3);
    const ruby = std('#d0203e', 0.12, 0.3, { emissive: '#5a0414' });
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
    // below the waist: the Valet's hose and short tunic, a long gown for the others
    if (kind === 'V') {
      [-1, 1].forEach((sd) => {
        add(body, new THREE.CylinderGeometry(0.085, 0.07, 0.95, 12).translate(0, 0.475, 0), std(sd < 0 ? '#f2e6da' : '#7a1428', 0.65), sd * 0.14, 0, 0);
        add(body, new THREE.SphereGeometry(0.11, 14, 10).scale(1, 0.55, 1.6), std('#2a1418', 0.35, 0.2), sd * 0.14, 0.05, 0.05);
      });
      add(body, new THREE.LatheGeometry([V2(0.02, 0.82), V2(0.56, 0.82), V2(0.5, 0.95), V2(0.42, 1.12), V2(0.36, 1.32)], 36), std('#ffffff', 0.7, 0, { map: TX.skirt, side: THREE.DoubleSide }));
    } else {
      const hem = kind === 'K' ? 0.82 : 0.92;
      add(
        body,
        new THREE.LatheGeometry([V2(0.02, 0), V2(hem, 0.01), V2(hem - 0.05, 0.14), V2(0.64, 0.5), V2(0.46, 0.98), V2(0.36, 1.32)], 40),
        std('#ffffff', 0.72, 0, { map: TX.skirt, side: THREE.DoubleSide }),
      );
      if (kind === 'D') {
        // a lace flounce at the hem
        add(body, new THREE.CylinderGeometry(hem - 0.02, hem + 0.06, 0.12, 40, 1, true), lace, 0, 0.06, 0);
      }
    }
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
    // a ruby heart brooch on the breast
    add(upper, heartGeo(0.12, 0.03, 0.01), ruby, 0, 0.5, 0.42);
    const head = new THREE.Group();
    head.position.y = 1.06;
    upper.add(head);
    add(head, new THREE.SphereGeometry(0.2, 28, 20).scale(1, 1.22, 1.02), skin);
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
    if (kind === 'V') {
      // a velvet beret, tilted, a long white plume and a rose pinned on its band
      const cap = new THREE.Group();
      cap.position.set(0.03, 0.21, -0.01);
      cap.rotation.z = -0.25;
      head.add(cap);
      add(cap, new THREE.SphereGeometry(0.3, 24, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.32, 1), std('#7a1428', 0.85));
      add(cap, new THREE.TorusGeometry(0.235, 0.025, 6, 28).rotateX(Math.PI / 2), gold, 0, 0.0, 0);
      const pl = add(cap, new THREE.SphereGeometry(0.09, 14, 10).scale(0.6, 4.6, 0.5), std('#fbf6ee', 0.9), -0.22, 0.24, -0.08);
      pl.rotation.z = 0.8;
      const rose = add(cap, bloomGeo(), std('#c0203e', 0.55, 0, { side: THREE.DoubleSide }), 0.2, 0.04, 0.12);
      rose.rotation.set(-1.1, 0, -0.4);
      rose.scale.setScalar(0.75);
    } else if (kind === 'D') {
      // a high comb behind, a lace mantilla over it, a gold tiara with a ruby heart
      add(head, new THREE.CylinderGeometry(0.2, 0.12, 0.34, 20, 1, true, -Math.PI / 2, Math.PI), std('#3a1018', 0.4, 0.2, { side: THREE.DoubleSide }), 0, 0.3, -0.08).rotation.x = -0.25;
      const veil = add(
        head,
        new THREE.ConeGeometry(0.46, 1.4, 28, 1, true).translate(0, -0.7, 0),
        new THREE.MeshStandardMaterial({ color: '#fbe8ec', roughness: 0.9, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
        0,
        0.48,
        -0.12,
      );
      veil.rotation.x = 0.18;
      add(head, new THREE.TorusGeometry(0.205, 0.02, 8, 32, Math.PI).rotateZ(0).rotateX(-0.25), gold, 0, 0.18, 0.02);
      add(head, heartGeo(0.12, 0.03, 0.012), ruby, 0, 0.36, 0.13);
    } else {
      // the crown: a gold band, five heart finials, a velvet cap
      const crown = new THREE.Group();
      crown.position.y = 0.2;
      head.add(crown);
      add(crown, new THREE.CylinderGeometry(0.235, 0.215, 0.16, 32, 1, true), new THREE.MeshStandardMaterial({ color: F.trim, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide }), 0, 0.06, 0);
      add(crown, new THREE.SphereGeometry(0.21, 20, 10, 0, TAU, 0, Math.PI / 2), std('#7a1428', 0.85), 0, 0.04, 0).scale.y = 0.9;
      const fin = heartGeo(0.1, 0.03, 0.012);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const fp = add(crown, fin, gold, Math.sin(a) * 0.225, 0.2, Math.cos(a) * 0.225);
        fp.rotation.y = a;
      }
      add(crown, new THREE.SphereGeometry(0.045, 12, 10), ruby, 0, 0.06, 0.235);
      // the mantle: a half lathe from the shoulders to the floor, ermine on its edge
      const mant = add(
        body,
        new THREE.LatheGeometry([V2(0.05, 2.12), V2(0.5, 2.02), V2(0.62, 1.4), V2(0.78, 0.6), V2(0.95, 0.02)], 30, Math.PI * 0.62, Math.PI * 0.76),
        std('#7a1428', 0.85, 0, { side: THREE.DoubleSide }),
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
    // props: the Valet's long-stemmed rose, the Dame's fan, the Roi's sceptre (right hand)
    let prop = new THREE.Group();
    let fan = null;
    if (kind === 'V') {
      add(prop, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6).translate(0, -0.25, 0), std('#2e5a26', 0.6));
      const b = add(prop, bloomGeo(), std('#c0203e', 0.55, 0, { side: THREE.DoubleSide }), 0, -0.56, 0);
      b.rotation.x = Math.PI;
      b.scale.setScalar(1.3);
      [0.2, 0.32].forEach((y, i) => {
        const l = add(prop, new THREE.PlaneGeometry(0.07, 0.04), std('#2f6a2a', 0.7, 0, { side: THREE.DoubleSide }), i ? 0.03 : -0.03, -y, 0);
        l.rotation.z = i ? 0.6 : -0.6;
      });
      prop.rotation.x = 1.25;
    } else if (kind === 'D') {
      fan = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ map: fanTex(), roughness: 0.7, side: THREE.DoubleSide, transparent: true, alphaTest: 0.3 }));
      // the half disc spreads from the hand along the fingers, its painted face forward
      fan.rotation.set(0, 0, Math.PI);
      fan.position.set(0, -0.06, 0.03);
      prop.add(fan);
      add(prop, new THREE.CylinderGeometry(0.018, 0.018, 0.08, 8), gold, 0, -0.06, 0);
    } else {
      add(prop, new THREE.CylinderGeometry(0.025, 0.025, 1.3, 10).translate(0, 0.25, 0), gold);
      const top = add(prop, heartGeo(0.18, 0.06, 0.02), ruby, 0, 1.02, 0);
      top.rotation.y = Math.PI / 2;
      add(prop, new THREE.TorusGeometry(0.05, 0.015, 6, 16).rotateX(Math.PI / 2), gold, 0, 0.9, 0);
    }
    hands[1].add(prop);
    // the figure's own card, held face out in the left hand (shown by the film and the bow)
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6), new THREE.MeshStandardMaterial({ map: Tex.card(F.rank, '♥'), roughness: 0.45, side: THREE.DoubleSide }));
    card.position.set(0, -0.3, 0.05);
    card.visible = false;
    hands[0].add(card);
    g.traverse((m) => m.isMesh && (m.frustumCulled = false));
    return { g, body, upper, head, mask, arms, hands, prop, fan, card, kind, k: { talk: 0, bow: 0, hold: 0, lay: 0, look: 0, raise: 0, fan: 0 } };
  };
  const tmpV = V3();
  // s: { talk, bow, hold (card shown), lay (card laid down, arm out), look (world point the head
  // turns to), raise (the right hand up: the Valet's rose offered, the Roi's sceptre raised), fan }
  const poseFig = (f, t, dt, s = {}) => {
    const k = f.k;
    k.talk = damp(k.talk, s.talk ? 1 : 0, 6, dt);
    k.bow = damp(k.bow, s.bow || 0, 3, dt);
    k.hold = damp(k.hold, s.hold || 0, 4, dt);
    k.lay = damp(k.lay, s.lay || 0, 3, dt);
    k.raise = damp(k.raise, s.raise || 0, 4, dt);
    k.fan = damp(k.fan, s.fan || 0, 5, dt);
    const ph = f.kind === 'V' ? 0 : f.kind === 'D' ? 2 : 4;
    const breathe = Math.sin(t * 1.3 + ph);
    f.upper.scale.set(1 + breathe * 0.006, 1 + breathe * 0.01, 1 + breathe * 0.006);
    f.upper.rotation.x = k.bow * 0.78 + Math.sin(t * 0.7 + ph) * 0.015;
    f.upper.rotation.z = Math.sin(t * 0.5 + ph) * 0.02;
    let yaw = 0;
    if (s.look) {
      f.g.updateMatrixWorld();
      tmpV.copy(s.look);
      f.g.worldToLocal(tmpV);
      yaw = clamp(Math.atan2(tmpV.x, tmpV.z), -0.9, 0.9);
    }
    k.look = damp(k.look, yaw, 3, dt);
    f.head.rotation.y = k.look * (1 - k.bow);
    f.head.rotation.x = k.bow * 0.4 + Math.sin(t * 8.5) * 0.06 * k.talk;
    f.head.rotation.z = Math.sin(t * 3.1 + ph) * 0.05 * k.talk + (f.kind === 'D' ? 0.06 : 0);
    const [L, Rr] = f.arms;
    const gest = Math.sin(t * 2.2) * 0.25 * k.talk;
    const free = Math.max(0, 1 - k.hold - k.lay);
    const hl = Math.min(1, k.hold + k.lay);
    const lay = k.lay / Math.max(1e-3, k.hold + k.lay);
    L.sh.rotation.set(lerp(-0.15 - k.talk * 0.5 + gest, lerp(-0.7, -1.15, lay), hl), 0, lerp(-0.12 - k.bow * 0.9 * free, lerp(0.25, 0.1, lay), hl));
    L.el.rotation.set(lerp(-0.35 - k.talk * 0.6, lerp(-1.45, -0.35, lay), hl), 0, 0);
    f.card.rotation.set(-0.2 + lay * 0.6, hl * 0.4, 0);
    // the right arm: the fan fluttering near the chin, the hand raised, or to the heart in the bow
    const fanK = f.kind === 'D' ? Math.max(k.fan, 0.35 * (1 - k.bow)) : 0;
    Rr.sh.rotation.set(-0.2 - k.bow * 0.9 - k.raise * 1.5 - fanK * 0.9, 0, 0.12 + k.bow * 0.35 - fanK * 0.3);
    Rr.el.rotation.set(-0.4 - k.bow * 1.3 - fanK * 1.2 + k.raise * 0.3, 0, 0);
    if (f.fan) {
      f.fan.scale.set(0.25 + 0.75 * k.fan, 1, 1);
      f.prop.rotation.z = Math.sin(t * 9) * 0.25 * k.fan;
    }
    f.card.visible = k.hold > 0.08 || k.lay > 0.08;
  };

  // ---------- materials ----------
  const M = {};
  const std = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
  const makeMats = () => {
    M.marble = scan('marble', 'marble', { color: '#d9a8a8', scanColor: '#ecbcb6', scale: 3.2, rough: 0.4 });
    M.marbleDk = scan('marble', 'marble', { color: '#a86a70', scanColor: '#c89aa0', scale: 4, rough: 0.55, cc: 'dk' });
    M.wood = scan('wood', 'wood', { color: '#8a5a3c', scanColor: '#c09070', scale: 2.2, rough: 0.55 });
    M.woodDk = scan('wood', 'wood', { color: '#4a2a20', scanColor: '#7a4a3a', scale: 2.4, rough: 0.7, cc: 'dk' });
    // rose stone: the castle wall scan, warmed to a blush
    M.stone = scan('stone', 'stone', { color: '#d8aca4', scanColor: '#f0c4bc', scale: 4, rough: 0.95 });
    M.stoneDk = scan('stone', 'stone', { color: '#a87470', scanColor: '#c89088', scale: 4, rough: 0.95, cc: 'dk' });
    M.plaster = scan('plaster', 'plaster', { color: '#f2e2d8', scanColor: '#fbeee6', scale: 3, rough: 0.9 });
    M.velvet = scan('fabric', 'velvet', { color: '#8a1a34', scanColor: '#ffffff', scale: 1.6, rough: 0.92 });
    M.velvetDk = scan('fabric', 'velvet', { color: '#5a0e22', scanColor: '#7a4a56', scale: 1.6, rough: 0.95, cc: 'dk' });
    M.rock = scan('rock', 'rock', { color: '#8a7a78', scale: 9, rough: 1, bump: 1.2 });
    M.gold = Tex.mat('metal', { color: '#e8bc64', rough: 0.36, metal: 0.7, scale: 1.4, cc: 'hgold' });
    // white painted iron: smooth, a little sheen
    M.iron = std('#efe6da', 0.42, { metalness: 0.25 });
    if (typeof Assets !== 'undefined' && Assets.envify) [M.gold, M.iron].forEach((m) => Assets.envify(m, 0.6));
    M.leaf = std('#ffffff', 0.75, { map: T.leaf, alphaTest: 0.5, side: THREE.DoubleSide });
    M.banner = std('#ffffff', 0.85, { map: T.banner, alphaTest: 0.5, side: THREE.DoubleSide });
    M.lamp = LvKit.glow('#ffc890', 2.2);
    M.candle = LvKit.glow('#ffd8a0', 2.6);
    M.rose = LvKit.glow('#ff8aa8', 1.6);
    M.wax = std('#f6eee2', 0.6);
    M.soil = std('#3a261c', 1);
    M.hedge = std('#2c4a22', 0.9);
    M.orange = std('#f0901e', 0.45, { emissive: '#4a1c00' });
    M.dark = std('#140a0c', 0.85);
    M.glass = std('#e0f0f0', 0.05, { metalness: 0.3, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    M.crystal = std('#fff4f0', 0.05, { metalness: 0.4, emissive: '#ffc8a8', emissiveIntensity: 0.12, transparent: true, opacity: 0.7 });
    M.mirror = std('#d8c8c8', 0.08, { metalness: 0.95 });
    if (typeof Assets !== 'undefined' && Assets.envify) Assets.envify(M.mirror, 1);
    M.porcelain = std('#fbf6f0', 0.25, { metalness: 0.05 });
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
  // stairs along +z (dir 1) or -z from (x, z0), n steps of 0.35 m up to y0 + n * 0.35
  const stairs = (x, z0, w, n, depth, dir = 1, y0 = 0, mat = 'stone') => {
    for (let i = 0; i < n; i++) {
      const top = y0 + (i + 1) * 0.35;
      const z = z0 + dir * (i + 0.5) * depth;
      box(mat, x, top / 2, z, w, top, depth);
      K.collider(x, top / 2, z, w, top, depth);
    }
  };
  const LIGHTS = [];
  const lantern = (x, y, z, i = 1.2, d = 14, col = '#ffb880') => {
    put('gold', G.box, x, y + 0.42, z, null, [0.05, 0.84, 0.05]);
    put('gold', G.lampCap, x, y + 0.02, z);
    put('lamp', G.lampGlass, x, y - 0.3, z);
    put('gold', G.box, x, y - 0.62, z, null, [0.34, 0.05, 0.34]);
    LIGHTS.push({ p: P(x, y - 0.4, z), c: new THREE.Color(col), i, d });
  };
  // a candelabrum on a stand: a gilt column, five candles
  const candelabrum = (x, z, h = 2.2, light = true) => {
    box('gold', x, 0.08, z, 0.6, 0.16, 0.6);
    put('gold', G.col, x, h / 2, z, null, [0.12, h, 0.12]);
    for (let i = -2; i <= 2; i++) {
      const cx = x + i * 0.22;
      const cy = h + 0.2 - Math.abs(i) * 0.08;
      put('gold', G.box, cx, cy - 0.12, z, null, [0.12, 0.04, 0.12]);
      put('wax', G.candle, cx, cy, z);
      put('candle', G.flame, cx, cy + 0.17, z);
    }
    box('gold', x, h + 0.04, z, 1.0, 0.05, 0.08);
    K.collider(x, h / 2, z, 0.5, h, 0.5);
    if (light) LIGHTS.push({ p: P(x, h + 0.5, z), c: new THREE.Color('#ffc890'), i: 1.3, d: 12 });
  };

  // ---------- the sky above the storm: a dark wine dome, warm clouds, the rift ----------
  const SH = { time: { value: 0 }, flash: { value: 0 }, bolt: { value: V3(0, 1, 0) }, fp: { value: V3(0, 0, 0) }, cam: { value: V3() } };
  const HOR = new THREE.Color('#2e1a20');
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
            vec3 zen = vec3(0.026, 0.016, 0.024);
            vec3 col = mix(uHor, zen, smoothstep(-0.02, 0.55, y));
            vec2 q = d.xz / (0.18 + max(y, 0.0)) * 0.8;
            float n = fbm(q * 1.2 + vec2(uTime * 0.012, uTime * 0.005));
            float n2 = fbm(q * 3.1 - vec2(uTime * 0.02, 0.0));
            float c = smoothstep(0.38, 0.86, n * 0.75 + n2 * 0.35) * smoothstep(0.04, 0.3, y);
            col = mix(col, vec3(0.13, 0.08, 0.09) * (0.7 + 0.6 * n2), c * 0.85);
            // the rift, far behind: a thin tear, its lips pale, the Joker's rose at its heart
            vec3 N = normalize(vec3(-0.9, 0.2, 0.38));
            float along = atan(d.z, d.x);
            float wid = 0.02 + 0.04 * fbm(vec2(along * 3.0, uTime * 0.03));
            float k = abs(dot(d, N));
            float lip = exp(-k / (wid * 1.1)) * smoothstep(0.1, 0.4, y);
            float core = exp(-k / (wid * 0.22)) * smoothstep(0.14, 0.45, y);
            col += vec3(0.45, 0.26, 0.32) * lip * 0.35 + vec3(1.0, 0.82, 0.88) * core * 0.6;
            float near = pow(max(dot(d, normalize(uBolt)), 0.0), 6.0);
            col += uFlash * (0.15 + 0.9 * c) * vec3(0.84, 0.78, 1.0) * (0.35 + 1.3 * near);
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
            vec3 col = mix(vec3(0.05, 0.03, 0.04), vec3(0.3, 0.22, 0.24), smoothstep(0.3, 0.82, h));
            float dd = length(vW.xz - uFP.xy);
            col += vec3(0.8, 0.7, 1.0) * uFP.z * exp(-dd / 70.0) * (0.4 + h) * 1.4;
            col += uFlash * 0.22 * vec3(0.8, 0.74, 1.0) * h;
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
      const core = mk('#f4ecff', 3, 1);
      const halo = mk('#d880a0', 1.2, 0.3);
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
    Bo.core.material.color.set(opt.gold ? '#fff0c8' : '#f4ecff').multiplyScalar(3);
    Bo.halo.material.color.set(opt.gold ? '#e8a030' : '#d880a0').multiplyScalar(1.2);
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
      stormT = 7 + Math.random() * 9;
      const a = Math.random() * TAU;
      const d = 110 + Math.random() * 220;
      const x = me.x + Math.sin(a) * d;
      const z = me.z + Math.cos(a) * d;
      const p0 = V3(x, cy - 4, z);
      const p1 = V3(x + (Math.random() - 0.5) * 60, O.y + 120 + Math.random() * 80, z + (Math.random() - 0.5) * 60);
      const up = Math.random() < 0.5;
      bolt(up ? p0 : p1, up ? p1 : p0, { w: 0.6, life: 0.6, flash: 0.4 + Math.random() * 0.35 });
      SH.fp.value.set(x, z, 1.4);
      AU.thunder(d);
    }
  };

  // ---------- procedural sound: wind round the palace, distant thunder, a waltz, glass, shears ----------
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
      N.wind.gain.value = 0.08;
      src(WN).connect(N.windF).connect(N.wind).connect(out);
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowpass';
      lo.frequency.value = 110;
      N.rum = ctx.createGain();
      N.rum.gain.value = 0.35;
      src(BN).connect(lo).connect(N.rum).connect(out);
      N.mus = ctx.createGain();
      N.mus.gain.value = 0;
      N.mus.connect(out);
      return true;
    };
    let on = false;
    const env = (g, t0, a, peak, d) => {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    };
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // a note of the music box / the little orchestra: o 'box' (bright, bell-like) or 'pluck'
    const note = (m, t0, k, kind = 'box', dest = null) => {
      const o = ctx.createOscillator();
      o.type = kind === 'bass' ? 'sine' : 'triangle';
      o.frequency.value = hz(m);
      const g = ctx.createGain();
      env(g, t0, 0.005, k, kind === 'bass' ? 0.5 : kind === 'box' ? 1.1 : 0.32);
      o.connect(g).connect(dest || N.mus);
      o.start(t0);
      o.stop(t0 + 1.4);
      if (kind === 'box') {
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = hz(m) * 3.01;
        const g2 = ctx.createGain();
        env(g2, t0, 0.003, k * 0.25, 0.4);
        o2.connect(g2).connect(dest || N.mus);
        o2.start(t0);
        o2.stop(t0 + 0.6);
      }
    };
    // the waltz: a slow 3/4 (bass on one, chord on two and three), a music-box tune over it
    const TUNE = [76, 79, 84, 83, 79, 76, 74, 76, 77, 81, 79, 77, 76, 74, 72, 74];
    const CHORDS = [
      [48, [64, 67, 72]],
      [43, [62, 67, 71]],
      [45, [64, 69, 72]],
      [41, [65, 69, 72]],
    ];
    const W = { on: 0, next: 0, beat: 0, bpm: 132 };
    const tickWaltz = () => {
      if (!W.on) return;
      const now = ctx.currentTime;
      if (W.next < now) W.next = now + 0.05;
      const sp = 60 / W.bpm;
      while (W.next < now + 0.25) {
        const b = W.beat;
        const bar = Math.floor(b / 3);
        const inBar = b % 3;
        const [bass, ch] = CHORDS[Math.floor(bar / 2) % CHORDS.length];
        if (inBar === 0) note(bass, W.next, 0.18, 'bass');
        else ch.forEach((m) => note(m, W.next, 0.035, 'pluck'));
        if (inBar === 0 || (inBar === 2 && bar % 2 === 1)) note(TUNE[(bar * 2 + (inBar ? 1 : 0)) % TUNE.length], W.next, 0.06, 'box');
        W.beat++;
        W.next += sp;
      }
    };
    return {
      set(v) {
        if (!init()) return;
        on = v;
        out.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.6);
        if (!v) this.waltz(0);
      },
      tick(t) {
        if (!ctx) {
          if (root.visible) this.set(true);
          if (!ctx) return;
        }
        N.windF.frequency.setTargetAtTime(280 + Math.sin(t * 0.21) * 100 + Math.sin(t * 0.67) * 40, ctx.currentTime, 0.4);
        N.wind.gain.setTargetAtTime(0.07 + 0.04 * Math.sin(t * 0.33), ctx.currentTime, 0.5);
        tickWaltz();
      },
      // k: 0 off, else the loudness; bpm the tempo
      waltz(k, bpm) {
        if (!ctx) return;
        if (bpm) W.bpm = bpm;
        if (k && !W.on) {
          W.next = ctx.currentTime + 0.1;
          W.beat = 0;
        }
        W.on = k ? 1 : 0;
        N.mus.gain.setTargetAtTime(k || 0, ctx.currentTime, 0.5);
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
        const k = clamp(1.1 - dist / 400, 0.2, 0.85);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(k, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(k * 0.5, t0 + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random() * 0.5);
        s.stop(t0 + 3.4);
      },
      // the Valet's shears: two quick metal clicks
      snip() {
        if (!ctx || !on) return;
        [0, 0.07].forEach((d, i) => {
          const t0 = ctx.currentTime + 0.01 + d;
          const s = ctx.createBufferSource();
          s.buffer = WN;
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = i ? 5200 : 3800;
          f.Q.value = 6;
          const g = ctx.createGain();
          env(g, t0, 0.002, 0.4, 0.05);
          s.connect(f).connect(g).connect(out);
          s.start(t0, Math.random());
          s.stop(t0 + 0.1);
        });
      },
      // glass: the coupes on the tray (k: how hard)
      clink(k = 1) {
        if (!ctx || !on) return;
        const n = k > 0.7 ? 4 : 2;
        for (let i = 0; i < n; i++) {
          const t0 = ctx.currentTime + 0.01 + i * (0.03 + Math.random() * 0.05);
          [2630, 3950, 5210].forEach((f, j) => {
            const o = ctx.createOscillator();
            o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.04);
            const g = ctx.createGain();
            env(g, t0, 0.002, (0.09 / (j + 1)) * k, 0.5 - j * 0.12);
            o.connect(g).connect(out);
            o.start(t0);
            o.stop(t0 + 0.7);
          });
        }
      },
      // a rose landing on the boards, soft
      pof(k = 1) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime + 0.01;
        const s = ctx.createBufferSource();
        s.buffer = WN;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 700;
        const g = ctx.createGain();
        env(g, t0, 0.004, 0.3 * k, 0.12);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random());
        s.stop(t0 + 0.2);
      },
      // a little phrase of the music box (a cut rose, a vase filled)
      chime(up = 0) {
        if (!ctx || !on) return;
        const t0 = ctx.currentTime + 0.02;
        [79, 84, 88].forEach((m, i) => note(m + up, t0 + i * 0.11, 0.07, 'box', out));
      },
    };
  })();

  // ---------- interactive pieces ----------
  const pool = [];
  let flashLight = null;
  const figs = {};
  const garden = {};
  const ball = {};
  const thea = {};
  const screens = {};
  const cards = {};
  const labelTex = (main, sub, col = '#f6e8d0') =>
    LvKit.tex(512, 128, (g, w, h) => {
      LvKit.grain(g, w, h, '#5a1024', 0.06, 2500);
      g.strokeStyle = '#e0b45a';
      g.lineWidth = 5;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.font = 'italic 46px Georgia, serif';
      g.fillText(main, w / 2, sub ? 62 : 80);
      if (sub) {
        g.font = '20px "IBM Plex Mono", monospace';
        g.fillStyle = '#f0c4cc';
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
  const makeScreen_ = (key, x, y, z, ry) => {
    if (typeof makeScreen === 'undefined') return;
    const s = makeScreen(4.6, 1.8, 1024);
    s.mesh.position.copy(P(x, y, z));
    s.mesh.rotation.y = ry;
    root.add(s.mesh);
    screens[key] = s;
  };
  // the wall across the building at z, with an opening for a door in its middle
  const endWall = (z, door, h = 12) => {
    if (!door) box('stone', 0, h / 2, z, HW * 2 + 1.2, h, 0.8);
    else {
      const w = HW + 0.6 - 2.4;
      [-1, 1].forEach((s) => box('stone', s * (2.4 + w / 2), h / 2, z, w, h, 0.8));
      box('stone', 0, (h + 4.8) / 2, z, 4.8, h - 4.8, 0.8);
      [-1, 1].forEach((s) => wall(s * (2.4 + w / 2), 0, z, w, h, 0.8));
      wall(0, 4.8, z, 4.8, h - 4.8, 0.8);
    }
    if (!door) wall(0, 0, z, HW * 2, h, 0.8);
  };
  // an open double door (gilt frame, velvet curtains drawn), with a sign
  const makeDoor = (z, title, sub) => {
    [-1, 1].forEach((s) => {
      box('gold', s * 2.5, 2.6, z, 0.3, 5.2, 1.0);
      box('woodDk', s * 2.9, 2.4, z + 1.2, 0.12, 4.8, 2.2, [0, s * 0.5, 0]);
    });
    box('gold', 0, 5.3, z, 5.4, 0.4, 1.0);
    put('gold', heartGeo(1.0, 0.25, 0.06), 0, 6.3, z - 0.5);
    put('gold', heartGeo(1.0, 0.25, 0.06), 0, 6.3, z + 0.5);
    sign(title, sub, 0, 8.0, z - 0.45, Math.PI, 3.4);
    sign(title, sub, 0, 8.0, z + 0.45, 0, 3.4);
  };

  // --- V: the rose garden on its turning disc ---
  const makeGarden = () => {
    const g = new THREE.Group();
    g.position.copy(P(GARDEN.x, 0, GARDEN.z));
    root.add(g);
    // the disc: rose marble ring path, soil beds with brass edging, a music box at the centre
    const top = new THREE.Mesh(new THREE.CylinderGeometry(GARDEN.r, GARDEN.r, 0.1, 72), M.marble);
    top.position.y = 0.0;
    top.receiveShadow = true;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(GARDEN.r, 0.09, 8, 120).rotateX(Math.PI / 2), M.gold);
    rim.position.y = 0.06;
    g.add(rim);
    const bed = (r0, r1) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 72).rotateX(-Math.PI / 2), M.soil);
      m.position.y = 0.06;
      m.receiveShadow = true;
      g.add(m);
      [r0, r1].forEach((r) => {
        const e = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 96).rotateX(Math.PI / 2), M.gold);
        e.position.y = 0.08;
        g.add(e);
      });
    };
    bed(5.5, 7.1);
    bed(2.7, 4.1);
    // the music box: a gilt drum, its comb and pins, a little porcelain dancer turning on it
    const mb = new THREE.Group();
    g.add(mb);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.9, 40), M.velvet);
    drum.position.y = 0.45;
    mb.add(drum);
    [0.9, 0.02].forEach((y) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 48).rotateX(Math.PI / 2), M.gold);
      r.position.y = y;
      mb.add(r);
    });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 40), M.gold);
    plate.position.y = 0.93;
    mb.add(plate);
    const dancer = new THREE.Group();
    dancer.position.y = 0.96;
    mb.add(dancer);
    const V2 = (x, y) => new THREE.Vector2(x, y);
    dancer.add(new THREE.Mesh(new THREE.LatheGeometry([V2(0.02, 0.35), V2(0.32, 0.36), V2(0.26, 0.42), V2(0.1, 0.55), V2(0.08, 0.72), V2(0.02, 0.76)], 24), M.porcelain));
    const dh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), M.porcelain);
    dh.position.y = 0.84;
    dancer.add(dh);
    [-1, 1].forEach((s) => {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.3, 6), M.porcelain);
      a.position.set(s * 0.12, 0.85, 0);
      a.rotation.z = s * -2.4;
      dancer.add(a);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.36, 6), M.porcelain);
      l.position.set(s * 0.04, 0.18, 0);
      dancer.add(l);
    });
    garden.dancer = dancer;
    K.collider(GARDEN.x, 0.45, GARDEN.z, 2.0, 0.9, 2.0);

    // the bushes: leaf cards (one instanced draw), blooms (instanced, a colour each)
    const LEAVES = 96;
    const BLOOMS = 6;
    const leafGeo = new THREE.PlaneGeometry(0.44, 0.44);
    // a dark leafy core under the leaf cards, so the bush reads full from the belvédère
    const core = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), M.hedge, SLOTS.length);
    core.castShadow = true;
    g.add(core);
    const leaves = new THREE.InstancedMesh(leafGeo, M.leaf, SLOTS.length * LEAVES);
    leaves.castShadow = true;
    g.add(leaves);
    const bm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide });
    const blooms = new THREE.InstancedMesh(bloomGeo(), bm, SLOTS.length * BLOOMS);
    blooms.castShadow = true;
    blooms.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SLOTS.length * BLOOMS * 3), 3);
    g.add(blooms);
    const r = rng(41);
    const unit = SLOTS.map(() => {
      const L = [];
      for (let i = 0; i < LEAVES; i++) {
        const a = r() * TAU;
        const yy = Math.pow(r(), 0.8);
        const rr = (0.25 + 0.75 * Math.sin(Math.min(1, yy * 1.15) * Math.PI)) * (0.7 + r() * 0.3);
        L.push([Math.sin(a) * rr, yy, Math.cos(a) * rr, r() * TAU, r() - 0.5, 0.7 + r() * 0.6]);
      }
      const B = [];
      for (let i = 0; i < BLOOMS; i++) {
        const a = r() * TAU;
        B.push(i === 0 ? [0, 1.08, 0, 0, 2.3] : [Math.sin(a) * (0.36 + r() * 0.1), 0.55 + r() * 0.35, Math.cos(a) * (0.36 + r() * 0.1), a, 1.4 + r() * 0.3]);
      }
      return { L, B };
    });
    // the guide's marks: a heart of light above a marked bush, and a thin beam down to it
    const marks = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6),
        new THREE.MeshBasicMaterial({ map: T.glow, color: new THREE.Color('#ff3a74').multiplyScalar(1.5), transparent: true, opacity: 1, depthWrite: false, toneMapped: false, fog: false }),
      );
      m.visible = false;
      g.add(m);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1, 8, 1, true).translate(0, -0.5, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9ab4').multiplyScalar(1.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      beam.visible = false;
      g.add(beam);
      marks.push({ m, beam });
    }
    Object.assign(garden, { g, leaves, blooms, core, unit, marks, LEAVES, BLOOMS, key: '', ang: 0 });
  };
  const ROSE = ['#b8102c', '#f27a98', '#f6efe6', '#f2b84a'];
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const s4 = V3();
  const p4 = V3();
  const col4 = new THREE.Color();
  // dress the bushes for a deal: colours (indices into ROSE) and heights (true = tall)
  const dressGarden = (col, tall, cut) => {
    const Gd = garden;
    let k = 0;
    SLOTS.forEach(([sx, sz], b) => {
      const H = tall[b] ? 1.45 : 0.85;
      const W = tall[b] ? 1.0 : 1.15;
      Gd.unit[b].L.forEach(([x, y, z, rot, tilt, sc]) => {
        e4.set(tilt * 0.9, rot, tilt * 0.6);
        q4.setFromEuler(e4);
        s4.setScalar(sc);
        p4.set(sx + x * 0.62 * W, 0.12 + y * H, sz + z * 0.62 * W);
        m4.compose(p4, q4, s4);
        Gd.leaves.setMatrixAt(k++, m4);
      });
    });
    Gd.leaves.instanceMatrix.needsUpdate = true;
    SLOTS.forEach(([sx, sz], b) => {
      const H = tall[b] ? 1.45 : 0.85;
      const W = tall[b] ? 1.0 : 1.15;
      q4.identity();
      s4.set(0.9 * W, H * 0.62, 0.9 * W);
      p4.set(sx, 0.12 + H * 0.5, sz);
      m4.compose(p4, q4, s4);
      Gd.core.setMatrixAt(b, m4);
    });
    Gd.core.instanceMatrix.needsUpdate = true;
    k = 0;
    SLOTS.forEach(([sx, sz], b) => {
      const H = tall[b] ? 1.45 : 0.85;
      const W = tall[b] ? 1.0 : 1.15;
      col4.set(ROSE[col[b]]);
      Gd.unit[b].B.forEach(([x, y, z, a, sc], i) => {
        const gone = i === 0 && cut & (1 << b);
        e4.set(i ? 0.5 : 0, a, 0);
        q4.setFromEuler(e4);
        s4.setScalar(gone ? 0.0001 : sc);
        p4.set(sx + x * W, 0.12 + y * H, sz + z * W);
        m4.compose(p4, q4, s4);
        Gd.blooms.setMatrixAt(k, m4);
        Gd.blooms.setColorAt(k, col4);
        k++;
      });
    });
    Gd.blooms.instanceMatrix.needsUpdate = true;
    Gd.blooms.instanceColor.needsUpdate = true;
  };

  // --- D: the dancers (instanced: gowns, bodices, heads, masks, headdresses) ---
  const MAXC = 32;
  const makeDancers = () => {
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const n = MAXC * 2;
    const mk = (geo, mat, colored) => {
      const im = new THREE.InstancedMesh(geo, mat, n);
      im.castShadow = true;
      im.frustumCulled = false;
      if (colored) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      root.add(im);
      return im;
    };
    const white = (r = 0.7) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: r, side: THREE.DoubleSide });
    ball.parts = {
      gown: mk(new THREE.LatheGeometry([V2(0.02, 0), V2(0.62, 0.02), V2(0.56, 0.2), V2(0.36, 0.7), V2(0.22, 1.05)], 22), white(0.75), true),
      bod: mk(new THREE.LatheGeometry([V2(0.22, 1.0), V2(0.27, 1.25), V2(0.25, 1.45), V2(0.12, 1.55), V2(0.04, 1.58)], 16), white(0.7), true),
      head: mk(new THREE.SphereGeometry(0.15, 14, 10).scale(1, 1.2, 1).translate(0, 1.76, 0), new THREE.MeshStandardMaterial({ color: '#b6a8c4', roughness: 0.5 }), false),
      mask: mk(new THREE.SphereGeometry(0.16, 14, 10, Math.PI / 2 - 0.9, 1.8, 0.5, 1.2).scale(1.05, 1.25, 1.1).translate(0, 1.76, 0.0), new THREE.MeshStandardMaterial({ color: '#fbf4ee', roughness: 0.3, side: THREE.DoubleSide }), false),
      hat: mk(new THREE.ConeGeometry(0.12, 0.3, 12).translate(0, 2.02, -0.02), white(0.6), true),
      arm: mk(new THREE.CylinderGeometry(0.045, 0.04, 0.62, 8).rotateZ(Math.PI / 2).translate(0.3, 1.36, 0.1), white(0.7), true),
    };
    ball.n = 0;
  };
  const DCOL = ['#c8385a', '#f6e8dc', '#7a1428', '#f2a8b8', '#e0b45a', '#fbefe6', '#a01e3a', '#f4c8a8'];
  // a couple's centre and spin at time t: c = { cx, cz, rx, rz, w, ph, spin }
  const coupleAt = (c, t) => {
    const a = c.ph + c.w * t;
    return { x: c.cx + Math.cos(a) * c.rx, z: c.cz + Math.sin(a) * c.rz, spin: c.spin * t + c.ph * 3 };
  };

  // --- D: the tower of coupes (on the buffet, carried, on the Dame's table) ---
  const makeTower = () => {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32), M.gold);
    g.add(tray);
    const coupe = (() => {
      const V2 = (x, y) => new THREE.Vector2(x, y);
      return new THREE.LatheGeometry([V2(0.0, 0), V2(0.05, 0.0), V2(0.012, 0.02), V2(0.01, 0.08), V2(0.06, 0.1), V2(0.075, 0.13), V2(0.072, 0.135), V2(0.05, 0.11), V2(0.0, 0.1)], 14);
    })();
    const glassM = new THREE.MeshStandardMaterial({ color: '#fff4ec', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, emissive: '#3a2418' });
    const wine = new THREE.MeshStandardMaterial({ color: '#f0b0c0', roughness: 0.2, emissive: '#5a1428', emissiveIntensity: 0.6 });
    // four tiers: 9, 4, 1 + a rose on top
    const tiers = [
      [3, 0.17],
      [2, 0.17],
      [1, 0.17],
    ];
    let y = 0.02;
    const cups = [];
    tiers.forEach(([nn, sp]) => {
      for (let i = 0; i < nn; i++)
        for (let j = 0; j < nn; j++) {
          const c = new THREE.Mesh(coupe, glassM);
          c.position.set((i - (nn - 1) / 2) * sp, y, (j - (nn - 1) / 2) * sp);
          g.add(c);
          const w = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12).rotateX(-Math.PI / 2), wine);
          w.position.set(c.position.x, y + 0.125, c.position.z);
          g.add(w);
          cups.push(c);
        }
      y += 0.14;
    });
    const top = new THREE.Mesh(bloomGeo(), new THREE.MeshStandardMaterial({ color: '#c0203e', roughness: 0.55, side: THREE.DoubleSide }));
    top.position.y = y + 0.02;
    top.scale.setScalar(1.2);
    g.add(top);
    g.traverse((m) => m.isMesh && (m.castShadow = true));
    return g;
  };

  // --- K: the throw, the vases, the stage marks, the flying rose, the curtain ---
  // the launch: from the rug, at 1.6 m, 60 degrees up; ang in degrees (0 = straight at the stage,
  // + = to the right of the thrower, i.e. toward -x), pow 0..40
  const LAUNCH = { y: 1.6, el: (60 * Math.PI) / 180, g: 12 };
  const throwPath = (ang, pow) => {
    const v = 12 + clamp(pow, 0, 40) * 0.2;
    const a = (clamp(ang, -25, 25) * Math.PI) / 180;
    const vh = v * Math.cos(LAUNCH.el);
    const vy = v * Math.sin(LAUNCH.el);
    const dx = -Math.sin(a);
    const dz = Math.cos(a);
    const x0 = RUG.x;
    const z0 = RUG.z + 0.6;
    const at = (t) => ({ x: x0 + dx * vh * t, y: LAUNCH.y + vy * t - (LAUNCH.g / 2) * t * t, z: z0 + dz * vh * t });
    // the curtain plane
    const tc = (CURTAIN_Z - z0) / (dz * vh);
    const yc = at(tc).y;
    const floorY = (z) => (z > CURTAIN_Z ? STAGE_Y : 0);
    // landing: the first time it comes down to the floor under it
    const land = (fy) => (vy + Math.sqrt(vy * vy + 2 * LAUNCH.g * (LAUNCH.y - fy))) / LAUNCH.g;
    let t = land(0);
    if (at(t).z > CURTAIN_Z) t = land(STAGE_Y);
    let blocked = false;
    if (at(t).z > CURTAIN_Z && yc < CURTAIN_H + 0.2) {
      // it meets the curtain: it falls at its foot, on the stalls' side
      blocked = true;
      t = tc;
    }
    const p = at(t);
    if (blocked) p.y = 0;
    else p.y = floorY(p.z);
    return { at, t, land: p, blocked, v };
  };
  const makeTheatreProps = () => {
    // vases: a tall porcelain vase on a gilt pedestal, a heart on its belly
    thea.vases = [];
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const vg = new THREE.LatheGeometry([V2(0.0, 0), V2(0.2, 0), V2(0.22, 0.06), V2(0.34, 0.4), V2(0.36, 0.62), V2(0.24, 0.9), V2(0.2, 1.0), V2(0.3, 1.1), V2(0.32, 1.14), V2(0.28, 1.14), V2(0.17, 1.0)], 32);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 24), M.gold);
      ped.position.y = 0.25;
      g.add(ped);
      const v = new THREE.Mesh(vg, new THREE.MeshStandardMaterial({ color: '#fbf6f0', roughness: 0.22, side: THREE.DoubleSide }));
      v.position.y = 0.5;
      g.add(v);
      const h = new THREE.Mesh(heartGeo(0.3, 0.04, 0.01), new THREE.MeshStandardMaterial({ color: '#c0203e', roughness: 0.3, emissive: '#3a0010' }));
      h.position.set(0, 0.98, 0.35);
      g.add(h);
      const h2 = h.clone();
      h2.position.z = -0.35;
      h2.rotation.y = Math.PI;
      g.add(h2);
      // the roses in it once it is filled
      const fill = new THREE.Group();
      [
        [0, 0, 0],
        [0.1, -0.05, 0.6],
        [-0.1, -0.04, -0.6],
      ].forEach(([x, y, a]) => {
        const b = new THREE.Mesh(bloomGeo(), new THREE.MeshStandardMaterial({ color: '#c0203e', roughness: 0.55, side: THREE.DoubleSide }));
        b.position.set(x * 1.4, 1.66 + y, 0);
        b.rotation.z = a * 0.5;
        b.scale.setScalar(2.6);
        fill.add(b);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), M.hedge);
        st.position.set(x * 0.6, 1.38, 0);
        fill.add(st);
      });
      fill.visible = false;
      g.add(fill);
      // the light a vase gives when a rose lands in it
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.9, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#ffb0c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      ring.position.y = 0.04;
      g.add(ring);
      g.visible = false;
      g.traverse((m) => m.isMesh && (m.castShadow = true));
      root.add(g);
      thea.vases.push({ g, fill, ring, k: 0 });
    }
    // the stage marks: a rose lying where it fell (the guide's screen)
    thea.marks = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(bloomGeo(), new THREE.MeshStandardMaterial({ color: '#c0203e', roughness: 0.55, side: THREE.DoubleSide }));
      b.rotation.x = Math.PI / 2;
      b.scale.setScalar(2.8);
      b.position.y = 0.16;
      g.add(b);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5).rotateX(Math.PI / 2), M.hedge);
      st.position.set(0, 0.06, -0.45);
      g.add(st);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: T.glow, color: new THREE.Color('#ff6a90'), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }),
      );
      glow.position.y = 0.03;
      g.add(glow);
      g.visible = false;
      root.add(g);
      thea.marks.push({ g, glow });
    }
    // the rose in flight
    const fr = new THREE.Group();
    const b = new THREE.Mesh(bloomGeo(), new THREE.MeshStandardMaterial({ color: '#d02040', roughness: 0.5, side: THREE.DoubleSide, emissive: '#400010' }));
    b.scale.setScalar(2.6);
    fr.add(b);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5).translate(0, -0.35, 0), M.hedge);
    fr.add(st);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 8),
      new THREE.MeshBasicMaterial({ color: '#ff8aa8', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    fr.add(halo);
    fr.visible = false;
    root.add(fr);
    thea.flying = fr;
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
    G.col = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    G.pil = new THREE.CylinderGeometry(0.5, 0.56, 1, 20);
    G.lampCap = new THREE.ConeGeometry(0.28, 0.24, 6);
    G.lampGlass = new THREE.CylinderGeometry(0.16, 0.12, 0.5, 6);
    G.candle = new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8);
    G.flame = new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.8, 1);
    G.cap = new THREE.BoxGeometry(1.5, 0.4, 1.5);
    G.heart = heartGeo(1, 0.2, 0.05);
    G.ball = new THREE.SphereGeometry(0.5, 14, 10);
    makeSky();
    makeBolts();

    // ===== the rock island under the palace =====
    {
      const rg = new THREE.CylinderGeometry(0.5, 0.05, 1, 16, 8);
      const p = rg.attributes.position;
      const r = rng(91);
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const t = 0.5 - p.getY(i);
        const n = 1 + 0.16 * Math.sin(a * 3 + t * 5) + 0.09 * Math.sin(a * 7 - t * 9) + 0.08 * (r() - 0.5);
        p.setXYZ(i, p.getX(i) * n, -t, p.getZ(i) * n);
      }
      rg.computeVertexNormals();
      const lump = (x, z, w, h, d, a) => put('rock', rg, x, -0.5, z, [0, a, 0], [w, h, d]);
      lump(0, 21, 36, 26, 54, 0);
      lump(0, 73, 36, 24, 56, 0.05);
      lump(0, 126, 36, 26, 54, -0.04);
      lump(-14, 40, 14, 16, 18, 0.7);
      lump(15, 100, 14, 18, 18, -0.6);
      lump(-12, 140, 12, 14, 16, 1.1);
    }

    // ===== V. la serre: a glass conservatory on a rose stone base =====
    floor(0, 21, HW * 2 + 0.6, 50.4);
    endWall(-4.2, false, 9);
    {
      // the long walls: a stone parapet, then glass between white iron mullions, a cornice
      [-1, 1].forEach((s) => {
        const x = s * (HW + 0.3);
        box('stone', x, 0.6, 21, 0.8, 1.2, 50.4);
        box('marbleDk', x, 1.25, 21, 1.0, 0.1, 50.4);
        for (let z = -4; z <= 46.01; z += 2.5) box('iron', x, 4.6, z, 0.16, 7, 0.16);
        put('glass', G.box, x, 4.6, 21, null, [0.04, 7, 50.4]);
        box('iron', x, 8.15, 21, 0.4, 0.3, 50.4);
        box('stone', x, 8.6, 21, 0.9, 0.6, 50.4);
        wall(x, 0, 21, 0.8, 9, 50.4);
        // planters along the parapet: orange trees in pots
        for (let z = 2; z < 44; z += 8) {
          const px = s * (HW - 1.2);
          put('stoneDk', new THREE.CylinderGeometry(0.55, 0.42, 0.8, 16), px, 0.4, z);
          put('soil', new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16), px, 0.79, z);
          put('woodDk', new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), px, 1.5, z);
          put('hedge', new THREE.IcosahedronGeometry(0.75, 1), px, 2.6, z, null, [1, 0.9, 1]);
          for (let k = 0; k < 9; k++) put('orange', new THREE.SphereGeometry(0.08, 8, 6), px + Math.sin(k * 2.1) * 0.66, 2.5 + Math.cos(k * 1.7) * 0.45, z + Math.cos(k * 2.1) * 0.66);
          K.collider(px, 0.4, z, 1.1, 0.8, 1.1);
        }
      });
      // the glass vault: an elliptic half barrel, white iron ribs and purlins
      const vault = new THREE.CylinderGeometry(HW + 0.3, HW + 0.3, 50.4, 40, 1, true, Math.PI / 2, Math.PI);
      vault.rotateX(Math.PI / 2);
      vault.scale(1, 0.42, 1);
      put('glass', vault, 0, 8.9, 21);
      const rib = new THREE.TorusGeometry(HW + 0.3, 0.12, 6, 40, Math.PI);
      rib.scale(1, 0.42, 1);
      for (let z = -4; z <= 46.01; z += 5) put('iron', rib, 0, 8.9, z);
      for (let k = 1; k < 8; k++) {
        const a = (k / 8) * Math.PI;
        const px = Math.cos(a) * (HW + 0.3);
        const py = 8.9 + Math.sin(a) * (HW + 0.3) * 0.42;
        const tang = Math.atan2(Math.cos(a) * 0.42, -Math.sin(a));
        box('iron', px, py, 21, 0.14, 0.14, 50.4, [0, 0, tang]);
      }
      box('iron', 0, 8.9 + (HW + 0.3) * 0.42, 21, 0.3, 0.3, 50.4);
      // hanging lanterns along the vault
      [
        [-6, 9.4, 6],
        [6, 9.4, 6],
        [-7, 9.4, 30],
        [7, 9.4, 30],
        [-4.5, 11.4, 12],
        [4.5, 11.4, 12],
      ].forEach(([x, y, z]) => lantern(x, y, z, 1.4, 18));
      // palms in the four corners: a ringed trunk, fronds
      const palm = (x, z, h, seed) => {
        const r = rng(seed);
        for (let i = 0; i < 7; i++) put('woodDk', new THREE.CylinderGeometry(0.2 - i * 0.012, 0.22 - i * 0.012, h / 7, 10), x + i * 0.04, (i + 0.5) * (h / 7), z);
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * TAU + r() * 0.3;
          const fr = new THREE.PlaneGeometry(0.7, 2.6, 1, 4);
          const pp = fr.attributes.position;
          for (let i = 0; i < pp.count; i++) {
            const yy = pp.getY(i) + 1.3;
            pp.setZ(i, -0.12 * yy * yy);
          }
          fr.translate(0, 1.3, 0);
          fr.computeVertexNormals();
          put('leaf', fr, x + 0.3, h, z, [-0.9 - r() * 0.4, a, 0]);
        }
        K.collider(x, h / 2, z, 0.5, h, 0.5);
      };
      palm(-11, -1, 6.5, 3);
      palm(11, -1, 6, 4);
      palm(-11, 43, 6.2, 5);
      palm(11, 43, 6.8, 6);
      // gravel walks round the garden, low box hedges
      [-1, 1].forEach((s) => {
        box('hedge', s * 10.6, 0.35, 21, 0.7, 0.7, 20);
        K.collider(s * 10.6, 0.35, 21, 0.7, 0.7, 20);
      });
    }
    // the belvédère: a raised white-iron gallery at the north end, two stairs from the garden
    {
      const { x0, x1, z0, z1, y } = BELV;
      box('marbleDk', 0, y - 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0);
      K.collider(0, y - 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0);
      // columns under it
      for (let x = -6; x <= 6.01; x += 4) put('iron', G.col, x, (y - 0.3) / 2, z0 + 0.4, null, [0.3, y - 0.3, 0.3]);
      // the stairs come up from the south on both sides
      [-1, 1].forEach((s) => stairs(s * 6.6, z0 - 12 * 0.8, 2, 12, 0.8, 1, 0, 'marbleDk'));
      // the balustrade: gilt rail, little iron hearts
      const bal = (xa, xb, z) => {
        box('gold', (xa + xb) / 2, y + 1.0, z, xb - xa, 0.08, 0.1);
        for (let xx = xa; xx <= xb + 0.01; xx += 0.5) box('iron', xx, y + 0.5, z, 0.05, 1.0, 0.05);
        for (let xx = xa + 0.25; xx < xb; xx += 1) put('iron', G.heart, xx, y + 0.55, z, null, [0.3, 0.3, 0.3]);
        wall((xa + xb) / 2, y, z, xb - xa, 1.1, 0.2);
      };
      bal(-5.4, 5.4, z0 + 0.1);
      bal(x0, x1, z1 - 0.1);
      [-1, 1].forEach((s) => {
        box('gold', s * (x1 - 0.1), y + 1.0, (z0 + z1) / 2, 0.1, 0.08, z1 - z0);
        wall(s * (x1 - 0.1), y, (z0 + z1) / 2, 0.2, 1.1, z1 - z0);
      });
      // a little gilt dome of white iron over it
      const dome = new THREE.SphereGeometry(5.6, 24, 10, 0, TAU, 0, Math.PI / 2);
      dome.scale(1.3, 0.45, 0.5);
      put('glass', dome, 0, y + 4, (z0 + z1) / 2);
      // its posts: along the back and at the front corners only (the view on the garden stays open)
      [-7.2, 7.2].forEach((x) => [z0 + 0.3, z1 - 0.3].forEach((z) => put('iron', G.col, x, y + 2, z, null, [0.14, 4, 0.14])));
      [-6, 6].forEach((x) => lantern(x, y + 3.2, z1 - 0.9, 1.0, 12));
      sign('Le Belvédère', 'd’ici, on voit les cœurs', 0, y + 2.4, z0 - 0.1, Math.PI, 2.6);
    }
    makeGarden();
    // the walk from the door to the garden: a velvet runner, two round beds of roses
    box('velvet', 0, 0.012, 4.2, 2.4, 0.024, 14.4);
    [-1, 1].forEach((s) => box('gold', s * 1.25, 0.016, 4.2, 0.08, 0.03, 14.4));
    {
      const beds = [];
      [-1, 1].forEach((s) => {
        const cx = s * 6.4;
        const cz = 5;
        put('stoneDk', new THREE.CylinderGeometry(1.9, 2.0, 0.35, 32), cx, 0.17, cz);
        put('soil', new THREE.CylinderGeometry(1.75, 1.75, 0.04, 32), cx, 0.36, cz);
        put('gold', new THREE.TorusGeometry(1.95, 0.05, 6, 48).rotateX(Math.PI / 2), cx, 0.36, cz);
        K.collider(cx, 0.2, cz, 3.2, 0.4, 3.2);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + s;
          beds.push([cx + Math.sin(a) * 1.05, cz + Math.cos(a) * 1.05, 0.55 + (i % 2) * 0.2, (i + (s > 0 ? 1 : 0)) % 4]);
        }
        beds.push([cx, cz, 0.95, s > 0 ? 0 : 1]);
      });
      // leaves and blooms, instanced (static)
      const r = rng(77);
      const nl = beds.length * 40;
      const lv = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.4, 0.4), M.leaf, nl);
      const nb = beds.length * 4;
      const bl = new THREE.InstancedMesh(bloomGeo(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide }), nb);
      bl.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nb * 3), 3);
      let kl = 0;
      let kb = 0;
      beds.forEach(([x, z, h, c]) => {
        for (let i = 0; i < 40; i++) {
          const a = r() * TAU;
          const yy = r();
          const rr = 0.45 * Math.sin(Math.min(1, yy * 1.2) * Math.PI) + 0.1;
          e4.set(r() - 0.5, a, r() - 0.5);
          q4.setFromEuler(e4);
          s4.setScalar(0.7 + r() * 0.5);
          p4.copy(P(x + Math.sin(a) * rr, 0.38 + yy * h, z + Math.cos(a) * rr));
          m4.compose(p4, q4, s4);
          lv.setMatrixAt(kl++, m4);
        }
        col4.set(ROSE[c]);
        for (let i = 0; i < 4; i++) {
          const a = r() * TAU;
          e4.set(i ? 0.5 : 0, a, 0);
          q4.setFromEuler(e4);
          s4.setScalar(i ? 1.4 : 1.9);
          p4.copy(P(x + (i ? Math.sin(a) * 0.32 : 0), 0.38 + h * (i ? 0.75 : 1.02), z + (i ? Math.cos(a) * 0.32 : 0)));
          m4.compose(p4, q4, s4);
          bl.setMatrixAt(kb, m4);
          bl.setColorAt(kb++, col4);
        }
      });
      lv.castShadow = bl.castShadow = true;
      root.add(lv, bl);
    }
    // the Valet's little table: the bouquet he is making, in a crystal vase
    {
      box('gold', 3, 0.5, 31, 0.12, 1, 0.12);
      put('marbleDk', new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), 3, 1.02, 31);
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.36, 20, 1, true), M.glass);
      vase.position.copy(P(3, 1.24, 31));
      root.add(vase);
      garden.bouquet = [];
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(bloomGeo(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide }));
        const a = (i / 6) * TAU;
        b.position.copy(P(3 + Math.sin(a) * 0.12 * (i > 0 ? 1 : 0), 1.62 + (i ? 0 : 0.08), 31 + Math.cos(a) * 0.12 * (i > 0 ? 1 : 0)));
        b.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
        b.scale.setScalar(1.3);
        b.visible = false;
        root.add(b);
        garden.bouquet.push(b);
      }
      K.collider(3, 0.5, 31, 1.1, 1, 1.1);
    }
    figs.V = figure('V');
    figs.V.g.position.copy(P(VFIG[0], VFIG[1], VFIG[2]));
    figs.V.g.rotation.y = Math.PI;
    root.add(figs.V.g);
    cards.V = LvKit.trialCard('hV', true);
    cards.V.position.copy(P(0, 1.8, 8));
    root.add(cards.V);
    makeScreen_('V', -9.5, 5.2, 45.7, Math.PI);
    endWall(46.2, true, 12);
    makeDoor(46.2, 'La Dame de Cœur', 'la salle de bal');

    // ===== D. la salle de bal =====
    floor(0, 73, HW * 2 + 0.6, 54, 'wood');
    {
      // the inlay at the centre of the parquet
      const inl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.inlay, transparent: true, roughness: 0.35, metalness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      inl.position.copy(P(0, 0.012, 74));
      root.add(inl);
      // a gold fillet round the dance floor
      const { x0, x1, z0, z1 } = DANCE;
      box('gold', x0 - 0.3, 0.005, (z0 + z1) / 2, 0.12, 0.02, z1 - z0 + 0.6);
      box('gold', x1 + 0.3, 0.005, (z0 + z1) / 2, 0.12, 0.02, z1 - z0 + 0.6);
      box('gold', 0, 0.005, z0 - 0.3, x1 - x0 + 0.72, 0.02, 0.12);
      box('gold', 0, 0.005, z1 + 0.3, x1 - x0 + 0.72, 0.02, 0.12);
      // the walls: rose stone, pilasters, tall arched windows with velvet drapes, mirrors
      [-1, 1].forEach((s) => {
        const x = s * (HW + 0.3);
        box('stone', x, 0.6, 73, 0.8, 1.2, 54);
        box('stone', x, 11, 73, 0.8, 2, 54);
        wall(x, 0, 73, 0.8, 12, 54);
        for (let z = 48; z <= 98.01; z += 6.25) {
          box('stoneDk', x, 5, z, 1.2, 10, 1.2);
          box('gold', x - s * 0.6, 9.6, z, 0.1, 0.3, 1.3);
        }
        for (let z = 51.1; z < 98; z += 6.25) {
          // window (open on the storm, glazed) and its drapes, above the gallery
          put('glass', G.box, x, 8, z, null, [0.04, 4, 4.4]);
          box('iron', x, 8, z, 0.1, 4, 0.08);
          box('iron', x, 8, z, 0.1, 0.08, 4.4);
          box('stone', x, 3.2, z, 0.8, 4, 5);
          [-1, 1].forEach((t) => box('velvet', x - s * 0.5, 7.8, z + t * 2.0, 0.3, 4.6, 0.9));
          box('velvetDk', x - s * 0.5, 10.1, z, 0.35, 0.6, 5.0);
          // a gilt mirror below the gallery
          box('gold', x - s * 0.42, 2.0, z, 0.06, 2.8, 2.2);
          put('mirror', G.box, x - s * 0.46, 2.0, z, null, [0.04, 2.5, 1.9]);
        }
      });
      // the ceiling: ivory plaster coffers, gilt beams
      box('plaster', 0, 12.4, 73, HW * 2 + 1, 0.6, 54);
      for (let z = 48; z <= 98.01; z += 6.25) box('gold', 0, 12.0, z, HW * 2, 0.25, 0.3);
      for (let x = -12; x <= 12.01; x += 6) box('gold', x, 12.0, 73, 0.3, 0.25, 54);
      // the galleries: a floor at 4.2 m on both sides, a gilt balustrade, stairs from the south
      [-1, 1].forEach((s) => {
        const xm = s * (GAL.x + (HW - GAL.x) / 2);
        const w = HW - GAL.x;
        box('marbleDk', xm, GAL.y - 0.2, (GAL.z0 + GAL.z1) / 2, w, 0.4, GAL.z1 - GAL.z0);
        K.collider(xm, GAL.y - 0.2, (GAL.z0 + GAL.z1) / 2, w, 0.4, GAL.z1 - GAL.z0);
        box('gold', s * GAL.x, GAL.y + 1.0, (GAL.z0 + GAL.z1) / 2, 0.12, 0.1, GAL.z1 - GAL.z0);
        box('gold', s * GAL.x, GAL.y + 0.08, (GAL.z0 + GAL.z1) / 2, 0.14, 0.12, GAL.z1 - GAL.z0);
        for (let z = GAL.z0; z <= GAL.z1 + 0.01; z += 0.75) box('gold', s * GAL.x, GAL.y + 0.5, z, 0.05, 1.0, 0.05);
        // (taller than it looks: nobody jumps over it into the closed alcoves under the gallery)
        wall(s * GAL.x, GAL.y, (GAL.z0 + GAL.z1) / 2, 0.2, 2.6, GAL.z1 - GAL.z0);
        for (let z = GAL.z0 + 2; z < GAL.z1; z += 6.25) put('stone', G.pil, s * GAL.x, (GAL.y - 0.4) / 2, z, null, [0.6, GAL.y - 0.4, 0.6]);
        // under the gallery, velvet drawn between the pillars: the alcoves are closed, the only
        // way from the buffet to the table is across the dance floor
        const cz0 = GAL.z0;
        const cz1 = 99.6;
        for (let z = cz0; z < cz1 - 0.01; z += 1.2) box('velvetDk', s * (GAL.x + 0.35), 1.9, z + 0.6, 0.18 + 0.1 * Math.sin(z * 3), 3.8, 1.25);
        box('gold', s * (GAL.x + 0.3), 3.85, (cz0 + cz1) / 2, 0.12, 0.1, cz1 - cz0);
        wall(s * (GAL.x + 0.35), 0, (cz0 + cz1) / 2, 0.3, 3.9, cz1 - cz0);
        // the gallery's end at the north, a little balustrade
        box('gold', xm, GAL.y + 1.0, GAL.z1, w, 0.1, 0.12);
        wall(xm, GAL.y, GAL.z1, w, 2.6, 0.2);
        // the stairs, from the floor at the south up onto the gallery
        stairs(xm, GAL.z0 - 12 * 0.82, w - 0.4, 12, 0.82, 1, 0, 'marbleDk');
        sign('La Galerie', 'd’ici, on voit les danseurs', xm, GAL.y + 2.4, GAL.z0 + 0.6, Math.PI, 2.4);
        // candelabra along the gallery
        for (let z = GAL.z0 + 5; z < GAL.z1; z += 12.5) LIGHTS.push({ p: P(s * (HW - 1), GAL.y + 2.2, z), c: new THREE.Color('#ffc890'), i: 1.0, d: 10 });
      });
      // the chandeliers: a gilt hoop of candles, crystal drops, a crown on top
      const drop = new THREE.OctahedronGeometry(0.07, 0).scale(1, 1.8, 1);
      [64, 74, 84].forEach((z, ci) => {
        const y = 8.6;
        put('gold', G.col, 0, y + 1.8, z, null, [0.06, 3.6, 0.06]);
        [2.2, 1.4].forEach((r, ri) => {
          const yy = y - ri * 0.6;
          put('gold', new THREE.TorusGeometry(r, 0.05, 6, 40).rotateX(Math.PI / 2), 0, yy, z);
          const n = ri ? 8 : 14;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            put('wax', G.candle, Math.sin(a) * r, yy + 0.16, z + Math.cos(a) * r);
            put('candle', G.flame, Math.sin(a) * r, yy + 0.36, z + Math.cos(a) * r);
            for (let k = 0; k < 3; k++) put('crystal', drop, Math.sin(a + 0.2) * (r + 0.05), yy - 0.2 - k * 0.17, z + Math.cos(a + 0.2) * (r + 0.05));
          }
        });
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          put('gold', new THREE.CylinderGeometry(0.02, 0.02, 2.6, 4), Math.sin(a) * 1.1, y + 1.0, z + Math.cos(a) * 1.1, [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45]);
        }
        put('crystal', new THREE.OctahedronGeometry(0.22, 1).scale(1, 1.6, 1), 0, y - 1.2, z);
        LIGHTS.push({ p: P(0, y - 0.3, z), c: new THREE.Color('#ffd0a0'), i: 2.0, d: 22 });
        void ci;
      });
      // the buffet (south) and the Dame's table (north): velvet cloths, gilt legs
      const table = (z, w, label) => {
        box('velvet', 0, 0.85, z, w, 0.12, 1.4);
        box('velvetDk', 0, 0.5, z, w + 0.1, 0.7, 1.45);
        box('gold', 0, 0.78, z, w + 0.14, 0.06, 1.52);
        K.collider(0, 0.5, z, w, 1.0, 1.4);
        if (label) sign(label[0], label[1], 0, 1.7, z + (z > 70 ? 0.8 : -0.8), z > 70 ? Math.PI : 0, 1.8);
      };
      table(BUFFET.z, 3.2, null);
      table(TABLE.z, 4.4, null);
      candelabrum(-2.6, BUFFET.z, 1.6);
      candelabrum(2.6, BUFFET.z, 1.6);
      candelabrum(-3.4, TABLE.z, 1.8);
      candelabrum(3.4, TABLE.z, 1.8);
      // the Dame's dais and her chair behind the table
      box('marbleDk', 0, 0.15, 97, 8, 0.3, 4);
      K.collider(0, 0.15, 97, 8, 0.3, 4);
      box('velvet', 0, 1.6, 99.2, 1.6, 2.6, 0.3);
      put('gold', G.heart, 0, 3.2, 99.15, null, [1.2, 1.2, 1]);
      [-1, 1].forEach((s) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4.2), M.banner);
        b.position.copy(P(s * 4.6, 4.8, 99.7));
        b.rotation.y = Math.PI;
        root.add(b);
      });
    }
    makeDancers();
    ball.tower = makeTower();
    root.add(ball.tower);
    ball.done = [makeTower(), makeTower()];
    ball.done.forEach((t, i) => {
      t.position.copy(P(i ? 1.1 : -1.1, 0.93, TABLE.z));
      t.visible = false;
      root.add(t);
    });
    figs.D = figure('D');
    figs.D.g.position.copy(P(DFIG[0], DFIG[1] + 0.3, DFIG[2]));
    figs.D.g.rotation.y = Math.PI;
    root.add(figs.D.g);
    cards.D = LvKit.trialCard('hD', true);
    cards.D.position.copy(P(0, 1.8, 62));
    root.add(cards.D);
    makeScreen_('D', 0, 9.6, 99.7, Math.PI);
    endWall(100.2, true, 12);
    makeDoor(100.2, 'Le Roi de Cœur', 'le théâtre');

    // ===== K. le théâtre du Roi =====
    floor(0, 112, HW * 2 + 0.6, 23.6, 'marble');
    {
      // the walls: velvet panels between rose pilasters, two tiers of loges
      [-1, 1].forEach((s) => {
        const x = s * (HW + 0.3);
        box('stone', x, 6.5, 126, 0.8, 13, 52);
        wall(x, 0, 126, 0.8, 13, 52);
        for (let z = 103; z < 122; z += 4.5) {
          box('velvetDk', x - s * 0.45, 2.4, z + 2.25, 0.1, 3.6, 3.4);
          box('gold', x - s * 0.5, 4.3, z + 2.25, 0.1, 0.12, 3.6);
          // a loge: a velvet balustrade at 5.4 m, its little lamp
          box('velvet', x - s * 1.2, 5.6, z + 2.25, 1.4, 0.9, 3.4);
          box('gold', x - s * 1.9, 6.1, z + 2.25, 0.1, 0.1, 3.4);
          put('lamp', G.ball, x - s * 1.0, 7.0, z + 2.25, null, [0.25, 0.25, 0.25]);
        }
        for (let z = 102.5; z <= 122.6; z += 4.5) box('stoneDk', x - s * 0.4, 6.5, z, 1.0, 13, 0.9);
      });
      box('plaster', 0, 13.2, 126, HW * 2 + 1, 0.6, 52);
      // a ceiling rose and a chandelier over the stalls
      put('gold', new THREE.TorusGeometry(3, 0.15, 8, 48).rotateX(Math.PI / 2), 0, 12.8, 112);
      put('gold', G.col, 0, 11.4, 112, null, [0.06, 2.6, 0.06]);
      put('gold', new THREE.TorusGeometry(1.6, 0.05, 6, 32).rotateX(Math.PI / 2), 0, 10, 112);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        put('wax', G.candle, Math.sin(a) * 1.6, 10.16, 112 + Math.cos(a) * 1.6);
        put('candle', G.flame, Math.sin(a) * 1.6, 10.36, 112 + Math.cos(a) * 1.6);
      }
      LIGHTS.push({ p: P(0, 9.6, 112), c: new THREE.Color('#ffd0a0'), i: 1.8, d: 20 });
      // the stalls: rows of velvet armchairs on both sides of the aisle
      for (let z = 104.5; z <= 120.6; z += 2.0)
        [-1, 1].forEach((s) => {
          for (let x = 3.2; x <= 9.3; x += 1.0) {
            const xx = s * x;
            box('velvet', xx, 0.45, z, 0.8, 0.18, 0.7);
            box('velvet', xx, 0.95, z - 0.36, 0.8, 0.9, 0.14);
            box('gold', xx, 0.2, z, 0.7, 0.4, 0.06);
          }
          K.collider(s * 6.25, 0.6, z - 0.1, 6.6, 1.2, 0.9);
        });
      // the aisle: a long rose carpet, the thrower's rug at its end
      box('velvetDk', 0, 0.01, 112, 2.6, 0.02, 22);
      const rug = new THREE.Mesh(
        new THREE.CircleGeometry(1.3, 48).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ map: T.medal, roughness: 0.6, metalness: 0.2 }),
      );
      rug.position.copy(P(RUG.x, 0.03, RUG.z));
      root.add(rug);
      thea.rug = rug;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.35, 1.55, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#ff9ab4', transparent: true, opacity: 0.6, toneMapped: false }),
      );
      ring.position.copy(P(RUG.x, 0.035, RUG.z));
      root.add(ring);
      thea.ring = ring;
      // a basket of roses by the rug
      put('woodDk', new THREE.CylinderGeometry(0.4, 0.3, 0.4, 16, 1, true), 1.9, 0.2, RUG.z);
      for (let i = 0; i < 9; i++) put('rose', new THREE.SphereGeometry(0.07, 8, 6), 1.9 + Math.sin(i * 2.4) * 0.22, 0.42 + (i % 3) * 0.03, RUG.z + Math.cos(i * 2.4) * 0.22);
      K.collider(1.9, 0.2, RUG.z, 0.8, 0.4, 0.8);
    }
    // the proscenium: a rose stone wall with a gilt arch, the velvet curtain in it
    {
      const z = CURTAIN_Z;
      const openW = 20;
      const sideW = (HW * 2 + 0.6 - openW) / 2;
      [-1, 1].forEach((s) => {
        const xc = s * (openW / 2 + sideW / 2);
        // the coulisses: a passage at the foot of each side (3 m high) toward the stage stairs
        box('stone', xc, 8.3, z, sideW, 9.4, 1.4);
        wall(xc, 3.6, z, sideW, 9.4, 1.4);
        box('stone', s * (openW / 2 + 0.25), 1.8, z, 0.5, 3.6, 1.4);
        wall(s * (openW / 2 + 0.25), 0, z, 0.5, 3.6, 1.4);
        box('gold', s * (openW / 2 + 0.6), 5, z - 0.75, 0.5, 10, 0.2);
        // the steps up to the stage, in the stalls, then a landing through the wall
        const sx = s * (openW / 2 + sideW / 2 + 0.25);
        for (let i = 0; i < 4; i++) {
          const top = (i + 1) * 0.3;
          box('woodDk', sx, top / 2, z - 3.9 + i * 0.8, sideW - 0.5, top, 0.8);
          K.collider(sx, top / 2, z - 3.9 + i * 0.8, sideW - 0.5, top, 0.8);
        }
        box('woodDk', sx, STAGE_Y / 2, z - 0.1, sideW - 0.5, STAGE_Y, 2.2);
        K.collider(sx, STAGE_Y / 2, z - 0.1, sideW - 0.5, STAGE_Y, 2.2);
        sign('Coulisses', 'vers la scène', sx, 4.4, z - 0.75, 0, 2.0);
      });
      box('stone', 0, 11, z, openW, 4, 1.4);
      wall(0, 9, z, openW, 4, 1.4);
      box('gold', 0, 9.2, z - 0.75, openW + 1.4, 0.5, 0.2);
      put('gold', heartGeo(2.2, 0.3, 0.08), 0, 10.6, z - 0.8);
      // the apron in front of the curtain, its footlights
      box('woodDk', 0, STAGE_Y / 2, z - 0.9, openW, STAGE_Y, 1.4);
      K.collider(0, STAGE_Y / 2, z - 0.9, openW, STAGE_Y, 1.4);
      for (let x = -9; x <= 9.01; x += 1.5) {
        put('gold', new THREE.CylinderGeometry(0.12, 0.16, 0.14, 10), x, STAGE_Y + 0.07, z - 1.4);
        put('lamp', G.ball, x, STAGE_Y + 0.16, z - 1.4, null, [0.18, 0.12, 0.18]);
      }
      LIGHTS.push({ p: P(-5, STAGE_Y + 0.8, z - 2), c: new THREE.Color('#ffc890'), i: 1.0, d: 10 });
      LIGHTS.push({ p: P(5, STAGE_Y + 0.8, z - 2), c: new THREE.Color('#ffc890'), i: 1.0, d: 10 });
      // the curtain: velvet in deep folds, a gold fringe, a valance with swags; it rises at the end
      const cg = new THREE.PlaneGeometry(openW, 9.2, 120, 2);
      const cp = cg.attributes.position;
      for (let i = 0; i < cp.count; i++) {
        const x = cp.getX(i);
        cp.setZ(i, Math.sin(x * 2.4) * 0.22 + Math.sin(x * 5.3) * 0.06);
      }
      cg.computeVertexNormals();
      cg.translate(0, 4.6, 0);
      const cur = new THREE.Group();
      cur.position.copy(P(0, 0, z + 0.1));
      root.add(cur);
      const cm = new THREE.Mesh(cg, M.velvet);
      cm.castShadow = true;
      cm.material.side = THREE.DoubleSide;
      cur.add(cm);
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(openW, 0.25, 0.5), M.gold);
      fringe.position.y = 0.12;
      cur.add(fringe);
      thea.curtain = cur;
      for (let i = 0; i < 5; i++) {
        const sw = new THREE.TorusGeometry(2.0, 0.28, 8, 24, Math.PI);
        sw.rotateZ(Math.PI);
        put('velvetDk', sw, -8 + i * 4, 9.0, z - 0.4, null, [1, 0.5, 1]);
      }
      // the curtain is a wall while it is down (both sides: the rose must not pass it either)
      thea.curtainWall = K.collider(0, 4.6, z + 0.1, openW, 9.2, 0.5);
    }
    // the stage: boards, wings in velvet, the carousel, the throne
    {
      floor(0, 138.3, HW * 2 + 0.6, 27.4, 'wood', STAGE_Y);
      endWall(152.2, false, 13);
      // velvet wings (flats) on both sides
      [-1, 1].forEach((s) => {
        for (let z = 127; z < 150; z += 5) {
          box('velvetDk', s * 12.2, STAGE_Y + 3.6, z, 0.2, 7.2, 2.4);
          box('gold', s * 12.1, STAGE_Y + 7.3, z, 0.24, 0.2, 2.5);
        }
      });
      // the carousel: a gilt-rimmed turning floor, a canopy of velvet on a central pole
      const c = new THREE.Group();
      c.position.copy(P(CAROUSEL.x, STAGE_Y, CAROUSEL.z));
      root.add(c);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(CAROUSEL.r + 0.6, CAROUSEL.r + 0.6, 0.14, 64), M.marble);
      top.position.y = 0.07;
      top.receiveShadow = true;
      c.add(top);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(CAROUSEL.r + 0.6, 0.08, 8, 96).rotateX(Math.PI / 2), M.gold);
      rim.position.y = 0.14;
      c.add(rim);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const hm = new THREE.Mesh(G.heart, M.gold);
        hm.position.set(Math.sin(a) * (CAROUSEL.r + 0.6), 0.1, Math.cos(a) * (CAROUSEL.r + 0.6));
        hm.rotation.y = a;
        hm.scale.setScalar(0.25);
        c.add(hm);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 12), M.gold);
      pole.position.y = 3;
      c.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 24, 1, true), M.velvet);
      canopy.position.y = 6.4;
      canopy.material = M.velvet;
      c.add(canopy);
      const ch = new THREE.Mesh(G.heart, M.gold);
      ch.position.y = 7.4;
      ch.scale.setScalar(0.6);
      c.add(ch);
      thea.carousel = c;
      K.collider(CAROUSEL.x, STAGE_Y + 3, CAROUSEL.z, 0.4, 6, 0.4);
      // the throne on its dais
      const [tx, ty, tz] = THRONE;
      box('marbleDk', tx, ty + 0.25, tz, 6, 0.5, 4);
      K.collider(tx, ty + 0.25, tz, 6, 0.5, 4);
      box('velvet', tx, ty + 0.95, tz + 0.4, 1.8, 0.9, 1.4);
      box('gold', tx, ty + 0.55, tz + 0.4, 2.0, 0.12, 1.5);
      put('velvet', heartGeo(2.6, 0.4, 0.1), tx, ty + 2.6, tz + 1.2);
      put('gold', heartGeo(2.9, 0.2, 0.06), tx, ty + 2.6, tz + 1.42);
      [-1, 1].forEach((s) => box('gold', tx + s * 1.0, ty + 1.3, tz + 0.4, 0.2, 0.8, 1.4));
      [-1, 1].forEach((s) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4.6), M.banner);
        b.position.copy(P(tx + s * 3.6, ty + 3.8, 151.7));
        b.rotation.y = Math.PI;
        root.add(b);
        candelabrum(tx + s * 3.4, tz - 1.2, 2.0);
      });
      // overhead: battens of stage lamps
      for (let z = 128; z < 150; z += 6) box('iron', 0, 10.5, z, 22, 0.15, 0.15);
      [
        [-6, 9.4, 131],
        [6, 9.4, 131],
        [-6, 9.4, 142],
        [6, 9.4, 142],
      ].forEach(([x, y, z]) => lantern(x, y, z, 1.6, 18));
      box('plaster', 0, 13.2, 138, HW * 2 + 1, 0.6, 28);
    }
    makeTheatreProps();
    figs.K = figure('K');
    figs.K.g.position.copy(P(THRONE[0], THRONE[1] + 0.5, THRONE[2] - 1.0));
    figs.K.g.rotation.y = Math.PI;
    root.add(figs.K.g);
    makeScreen_('K', 0, 11.2, 123.2, Math.PI);

    flushBatches();

    // a pool of real lights for the nearest lamps
    for (let i = 0; i < 5; i++) {
      const l = new THREE.PointLight('#ffb880', 0, 18, 2);
      l.userData = { at: -1, k: 0 };
      root.add(l);
      pool.push(l);
    }
    flashLight = new THREE.PointLight('#e8dcff', 0, 120, 1.4);
    root.add(flashLight);
    amb.motes = LvKit.motes({ n: 320, size: 1.5, colors: ['#ffe2b8', '#ffb0c4'], rise: [-0.12, 0.2], sway: 1.1, box: [44, 16], alpha: 0.42, seed: 31 });
  };
  const amb = { haze: new THREE.Color('#241418') };

  // ---------- per-frame (the levels write ST, the world follows it) ----------
  const ST = {
    area: 'V',
    fig: { V: {}, D: {}, K: {} },
    figPos: { V: null, D: null, K: null },
    card: null,
    // V: the garden's angle, its dress (colours, heights), cut roses (bitmask), the marks
    discAng: 0,
    roses: null,
    cut: 0,
    marks: [],
    marksOn: false,
    bouquet: [],
    // D: the couples [{cx, cz, rx, rz, w, ph, spin, col}], their clock, seen on this screen;
    // the tower: carried at {x, y, z, yaw} (world) or on the buffet; delivered count
    couples: [],
    danceT: 0,
    dancersOn: false,
    towerAt: null,
    towerHome: true,
    wobble: 0,
    delivered: 0,
    // K: vases [{x, z, full}] (relative), seen on this screen; the carousel's angle; the stage
    // marks [{x, z}] (seen on this screen); the rose in flight {ang, pow, t, hide}; the curtain
    vases: [],
    vasesOn: false,
    carAng: 0,
    stageMarks: [],
    marksSeen: false,
    flight: null,
    curtain: 0,
  };
  let lightT = 0;
  let snapNext = false;
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
    flashLight.intensity = flashV * 1.6;
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

    // ----- V: the garden turns; its dress follows the deal; the marks on the guide's screen -----
    {
      const Gd = garden;
      Gd.g.rotation.y = ST.discAng;
      Gd.dancer.rotation.y = t * 1.6;
      const rs = ST.roses;
      const key = rs ? rs.col.join('') + rs.tall.map((x) => (x ? 1 : 0)).join('') + '|' + ST.cut : '';
      if (rs && key !== Gd.key) {
        Gd.key = key;
        dressGarden(rs.col, rs.tall, ST.cut);
      }
      Gd.marks.forEach((mk, i) => {
        const b = ST.marks[i];
        mk.m.visible = mk.beam.visible = ST.marksOn && b != null && !(ST.cut & (1 << b));
        if (!mk.m.visible) return;
        const [sx, sz] = SLOTS[b];
        const H = rs && rs.tall[b] ? 1.45 : 0.85;
        const y = H + 1.6 + Math.sin(t * 2 + i) * 0.12;
        mk.m.position.set(sx, y, sz);
        mk.m.quaternion.copy(R.camera.quaternion);
        mk.m.quaternion.premultiply(q4.copy(Gd.g.quaternion).invert());
        mk.beam.position.set(sx, y - 0.3, sz);
        mk.beam.scale.y = y - H - 0.5;
        mk.m.material.opacity = 0.75 + Math.sin(t * 4 + i) * 0.2;
      });
      Gd.bouquet.forEach((b, i) => {
        const c = ST.bouquet[i];
        b.visible = c != null;
        if (c != null) b.material.color.set(ROSE[c]);
      });
    }

    // ----- D: the dancers (on this screen only if seen), the tower -----
    {
      const pr = ball.parts;
      const cs = ST.dancersOn ? ST.couples : [];
      const n = Math.min(MAXC, cs.length);
      Object.values(pr).forEach((im) => {
        im.count = n * 2;
        im.visible = n > 0;
      });
      for (let i = 0; i < n; i++) {
        const c = cs[i];
        const at = coupleAt(c, ST.danceT);
        // the 3/4 sway: a lift on each first beat
        const bob = Math.abs(Math.sin(ST.danceT * Math.PI * 1.1 + i)) * 0.06;
        for (let j = 0; j < 2; j++) {
          const a = at.spin + j * Math.PI;
          const px = at.x + Math.sin(a) * 0.32;
          const pz = at.z + Math.cos(a) * 0.32;
          e4.set(0, a + Math.PI, 0);
          q4.setFromEuler(e4);
          p4.copy(P(px, bob, pz));
          // the lady wide-gowned, the cavalier narrow (a coat to the knee)
          s4.set(j ? 0.62 : 1, 1, j ? 0.62 : 1);
          m4.compose(p4, q4, s4);
          pr.gown.setMatrixAt(i * 2 + j, m4);
          s4.set(1, 1, 1);
          m4.compose(p4, q4, s4);
          ['bod', 'head', 'mask', 'hat', 'arm'].forEach((k) => pr[k].setMatrixAt(i * 2 + j, m4));
          col4.set(DCOL[(c.col + j * 3) % DCOL.length]);
          pr.gown.setColorAt(i * 2 + j, col4);
          pr.arm.setColorAt(i * 2 + j, col4);
          col4.set(DCOL[(c.col + j * 3 + 1) % DCOL.length]);
          pr.bod.setColorAt(i * 2 + j, col4);
          col4.set(j ? '#2a1418' : DCOL[(c.col + 4) % DCOL.length]);
          pr.hat.setColorAt(i * 2 + j, col4);
        }
      }
      if (n) {
        Object.values(pr).forEach((im) => {
          im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
        });
      }
      const tw = ball.tower;
      ST.wobble = Math.max(0, ST.wobble - dt * 1.6);
      if (ST.towerAt) {
        tw.visible = true;
        tw.position.set(ST.towerAt.x, ST.towerAt.y, ST.towerAt.z);
        tw.rotation.set(Math.sin(t * 22) * 0.12 * ST.wobble, ST.towerAt.yaw || 0, Math.cos(t * 19) * 0.12 * ST.wobble);
      } else if (ST.towerHome && ST.area === 'D') {
        tw.visible = true;
        tw.position.copy(P(BUFFET.x, 0.93, BUFFET.z));
        tw.rotation.set(0, 0, 0);
      } else tw.visible = false;
      ball.done.forEach((d, i) => (d.visible = ST.delivered > i));
    }

    // ----- K: the vases, the stage marks, the flying rose, the carousel, the curtain -----
    {
      thea.carousel.rotation.y = ST.carAng;
      thea.vases.forEach((v, i) => {
        const s = ST.vases[i];
        v.g.visible = ST.vasesOn && !!s;
        if (!v.g.visible) return;
        v.g.position.copy(P(s.x, STAGE_Y + (s.onCar ? 0.14 : 0), s.z));
        v.g.rotation.y = s.onCar ? ST.carAng : 0;
        v.fill.visible = !!s.full;
        v.k = Math.max(0, v.k - dt * 0.8);
        if (s.flash) {
          v.k = 1;
          s.flash = 0;
        }
        v.ring.material.opacity = (s.full ? 0.35 : 0) + v.k * 0.6;
        v.ring.scale.setScalar(1 + (1 - v.k) * 0.4);
      });
      thea.marks.forEach((m, i) => {
        const s = ST.stageMarks[i];
        m.g.visible = ST.marksSeen && !!s;
        if (!m.g.visible) return;
        m.g.position.copy(P(s.x, s.y + 0.02, s.z));
        m.g.rotation.y = s.a || 0;
        m.glow.material.opacity = 0.65 + 0.2 * Math.sin(t * 3 + i);
      });
      const F = ST.flight;
      if (F) {
        const path = F.path || (F.path = throwPath(F.ang, F.pow));
        const tt = Math.min(F.t, path.t);
        const q = path.at(tt);
        if (F.t >= path.t) {
          q.x = path.land.x;
          q.y = path.land.y + 0.1;
          q.z = path.land.z;
        }
        thea.flying.visible = F.t < path.t + 0.05 && !(F.hide && q.z > CURTAIN_Z - 0.2);
        thea.flying.position.copy(P(q.x, q.y, q.z));
        thea.flying.rotation.set(F.t * 9, F.ang * 0.02, F.t * 4);
      } else thea.flying.visible = false;
      const cur = thea.curtain;
      cur.position.y = O.y + ST.curtain * 8.4;
      cur.visible = ST.curtain < 0.99;
      if (thea.curtainWall) thea.curtainWall.on = ST.curtain < 0.5;
      thea.ring.material.opacity = ST.area === 'K' ? 0.45 + 0.25 * Math.sin(t * 3) : 0;
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
      l.intensity = L ? L.i * u.k * (0.92 + Math.sin(t * 9 + u.at) * 0.04) : 0;
    });
  };

  // ---------- queries ----------
  // a slot of the garden in world coordinates, the garden turned by ang
  const slotPos = (i, ang) => {
    const [x, z] = SLOTS[i];
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return P(GARDEN.x + x * c + z * s, 0, GARDEN.z - x * s + z * c);
  };
  const onGarden = (p) => Math.hypot(p.x - (O.x + GARDEN.x), p.z - (O.z + GARDEN.z)) < GARDEN.r && Math.abs(p.y - O.y) < 0.8;
  const onBelv = (p) => p.x > O.x + BELV.x0 && p.x < O.x + BELV.x1 && p.z > O.z + BELV.z0 - 0.2 && p.z < O.z + BELV.z1 && p.y > O.y + BELV.y - 0.6;
  const onGallery = (p) => Math.abs(p.x - O.x) > GAL.x - 0.3 && p.z > O.z + GAL.z0 - 0.4 && p.z < O.z + GAL.z1 && p.y > O.y + GAL.y - 0.6;
  const atBuffet = (p) => Math.abs(p.x - (O.x + BUFFET.x)) < 2.4 && Math.abs(p.z - (O.z + BUFFET.z)) < 1.9 && Math.abs(p.y - O.y) < 1;
  const atTable = (p) => Math.abs(p.x - (O.x + TABLE.x)) < 2.8 && p.z > O.z + TABLE.z - 2.2 && p.z < O.z + TABLE.z && Math.abs(p.y - O.y) < 1;
  const atRug = (p) => Math.hypot(p.x - (O.x + RUG.x), p.z - (O.z + RUG.z)) < 1.4 && Math.abs(p.y - O.y) < 1;
  const onStage = (p) => p.z > O.z + CURTAIN_Z + 0.4 && p.y > O.y + STAGE_Y - 0.5;
  const SPAWN = {
    V: [[-2, 0, 3], [2, 0, 3]],
    D: [[-1.6, 0, 49.5], [1.6, 0, 49.5]],
    K: [[-2, 0, 103.5], [2, 0, 103.5]],
    Kstage: [[-3, STAGE_Y, 128.5], [3, STAGE_Y, 128.5]],
  };
  const spawn = (key, who) => {
    const s = SPAWN[key] || SPAWN.V;
    const p = s[who === 'dame' ? 0 : 1];
    return P(p[0], p[1], p[2]);
  };

  return {
    O,
    P,
    rel,
    HW,
    GARDEN,
    SLOTS,
    BELV,
    VFIG,
    DANCE,
    BUFFET,
    TABLE,
    DFIG,
    GAL,
    RUG,
    CURTAIN_Z,
    CURTAIN_H,
    STAGE_Y,
    CAROUSEL,
    THRONE,
    ROSE,
    ST,
    AU,
    amb,
    build,
    figure,
    poseFig,
    FIG,
    heart,
    heartGeo,
    bloomGeo,
    coupleAt,
    throwPath,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
      wx.visible = false;
      AU.set(false);
      flashV = 0;
      ST.towerAt = null;
      ST.flight = null;
    },
    update,
    snap() {
      snapNext = true;
    },
    bolt,
    flash,
    slotPos,
    onGarden,
    onBelv,
    onGallery,
    atBuffet,
    atTable,
    atRug,
    onStage,
    spawn,
    get screens() {
      return screens;
    },
    get figs() {
      return figs;
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
    cardPos: (k) => (cards[k] ? cards[k].position : null),
  };
})();
