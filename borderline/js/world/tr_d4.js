// ♦ 4 · Le Code: the Veilleurs' vault. A heist in three rooms where every code is split between
// the two of you: four safes hidden in the gallery's clues, a laser hall that only one of you can
// read, and a vault door whose three rings turn only when both hands turn together.
const D4 = (() => {
  const O = V3(2100, 0, 5600);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  const glow = LvKit.glow;

  // Big surfaces use the triplanar materials; trims, wood and metal use painted textures mapped
  // on the box faces (world-space triplanar this far from the origin turned thin trims into
  // stripes). Metals stay at low metalness: without an environment map they would render black.
  const marble = Tex.mat('marble', { color: '#6a5f5c', scale: 6, rough: 0.75, bump: 0.6 });
  const darkMarble = Tex.mat('marble', { color: '#2a2129', scale: 5, rough: 0.92 });
  const panel = Tex.mat('plaster', { color: '#3e2532', scale: 3, rough: 0.9, bump: 0.35 });
  const plaster = Tex.mat('plaster', { color: '#6b5c55', scale: 3.5, rough: 0.9 });
  const stone = Tex.mat('stone', { color: '#4f4852', scale: 2.2, rough: 0.85 });
  const painted = (draw, opt) => {
    const t = LvKit.tex(512, 512, draw);
    return new THREE.MeshStandardMaterial({ map: t, ...opt });
  };
  const noise = (g, w, h, n, a) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a * Math.random()})` : `rgba(0,0,0,${a * Math.random()})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  };
  const wood = painted(
    (g, w, h) => {
      g.fillStyle = '#4a2a1a';
      g.fillRect(0, 0, w, h);
      // planks with long grain
      for (let p = 0; p < 4; p++) {
        const y0 = (p * h) / 4;
        g.fillStyle = ['#4f2d1c', '#46271a', '#52301e', '#43251a'][p];
        g.fillRect(0, y0, w, h / 4);
        for (let k = 0; k < 26; k++) {
          g.strokeStyle = `rgba(${20 + Math.random() * 30},${8 + Math.random() * 12},4,${0.25 + Math.random() * 0.3})`;
          g.lineWidth = 0.6 + Math.random() * 1.6;
          g.beginPath();
          const y = y0 + Math.random() * (h / 4);
          g.moveTo(0, y);
          for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 2.5);
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(0, y0, w, 2);
      }
      noise(g, w, h, 4000, 0.06);
    },
    { roughness: 0.6, metalness: 0 },
  );
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
  const brass = painted(brushed('#b8862f', 'rgba(255,230,160,0.25)'), { roughness: 0.35, metalness: 0.35 });
  const steel = painted(brushed('#7c818c', 'rgba(255,255,255,0.2)'), { roughness: 0.4, metalness: 0.3 });
  const iron = painted(brushed('#3c3942', 'rgba(255,255,255,0.08)'), { roughness: 0.6, metalness: 0.25 });
  const velvet = painted(
    (g, w, h) => {
      g.fillStyle = '#5a0f1f';
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 12000, 0.08);
    },
    { roughness: 0.95, metalness: 0 },
  );
  // box faces get UVs in meters (1 texture per `tile` m) so painted maps never stretch
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
  // a solid with face-mapped UVs (for the painted materials)
  const solidUV = (x, y, z, sx, sy, sz, mat) => {
    K.deco(bx(sx, sy, sz), mat, x, y, z);
    return K.collider(x, y, z, sx, sy, sz);
  };
  const glass = new THREE.MeshStandardMaterial({
    color: '#bfe6ff',
    transparent: true,
    opacity: 0.14,
    roughness: 0.05,
    metalness: 0.1,
    depthWrite: false,
  });
  const SUITS = ['h', 'd', 's', 'c'];
  const SYM = { h: '♥', d: '♦', s: '♠', c: '♣' };
  const SCOL = { h: '#ff5f8a', d: '#ff9a3a', s: '#b9a6ff', c: '#7ce0ff' };

  // ---------- laser hall layout (shared with the level logic) ----------
  const ROWS = [52, 56, 60, 64, 68, 72];
  const LANES = [-4, 0, 4];
  const ROW_SEED = [0, 2, 1, 0, 2, 1];
  const ROW_DIR = [1, -1, 1, -1, 1, -1];
  const openLane = (row, step) => (((ROW_SEED[row] + step * ROW_DIR[row]) % 3) + 3) % 3;
  // ---------- vault door ----------
  const DOOR = { z: 131.4, y: 7, r: [2.3, 3.8, 5.3] };
  const SWEEP = { from: 128, to: 93 };

  let built = false;
  let screen = null;
  let timer = null;
  let monitor = null;
  let keyDisplay = null;
  const safes = {};
  const clues = {};
  const gates = {};
  const lasers = [];
  const emitters = [];
  const keys = [];
  const tokens = {};
  const cranks = [];
  const rings = [];
  const targets = [];
  const bolts = [];
  const steamVents = [];
  const gears = [];
  const chandeliers = [];
  let lever = null;
  let doorG = null;
  let sweep = null;
  let sweepWarn = null;
  let heart = null;
  let card = null;
  let catwalkRing = null;
  let balconyRing = null;

  // ---------- canvas helpers (1080 px minimum on the long side) ----------
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
  const frame = (g, w, h, col, bg = '#140a12') => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = col;
    g.lineWidth = Math.max(2, w / 90);
    g.strokeRect(w * 0.03, h * 0.04, w * 0.94, h * 0.92);
  };
  const suitPlate = (s, size, k = 0.8) =>
    canvasMat(
      256,
      256,
      (g) => {
        g.clearRect(0, 0, 256, 256);
        g.fillStyle = SCOL[s];
        Icons.draw(g, Icons.of(SYM[s]), 128, 128, 200);
      },
      { transparent: true, k },
    );
  const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

  // a little cloud of steam (vents, bolts, the vault door)
  const steam = (pos, n = 26) => Fx.burst(pos, '#d8d2e0', n, 2.4, 1.1, 1.6);

  // ---------- reusable props ----------
  const column = (x, z, h = 10.5) => {
    K.solid(x, h / 2, z, 1.1, h, 1.1, marble);
    K.deco(bx(1.5, 0.5, 1.5), brass, x, 0.25, z);
    K.deco(bx(1.5, 0.45, 1.5), brass, x, h - 0.22, z);
    K.deco(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24), brass, x, 1.2, z);
  };
  const chandelier = (x, y, z) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 40), brass);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), iron);
    chain.position.y = 1.2;
    g.add(chain);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), glow('#ffd9a8', 1.3));
      bulb.position.set(Math.cos(a) * 1.1, 0.16, Math.sin(a) * 1.1);
      g.add(bulb);
    }
    const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), glass);
    drop.position.y = -0.5;
    g.add(drop);
    g.position.copy(P(x, y, z));
    group.add(g);
    chandeliers.push(g);
  };
  const painting = (x, y, z, rotY, w, h, draw) => {
    const g = new THREE.Group();
    const fr = new THREE.Mesh(bx(w + 0.36, h + 0.36, 0.16), brass);
    g.add(fr);
    const pic = plane(w, h, canvasMat(Math.round(w * 200), Math.round(h * 200), draw));
    pic.position.z = 0.09;
    g.add(pic);
    g.position.copy(P(x, y, z));
    g.rotation.y = rotY;
    group.add(g);
    return { g, pic };
  };
  const vent = (x, z) => {
    K.deco(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 20), iron, x, 0.03, z);
    steamVents.push(P(x, 0.2, z));
  };
  const gearGeo = (r, teeth, depth) => {
    const sh = new THREE.Shape();
    const n = teeth * 2;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = i % 2 ? r : r * 0.86;
      const a2 = a + Math.PI / n;
      if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      sh.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    return new THREE.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.15,
      bevelSize: depth * 0.1,
      bevelSegments: 1,
      curveSegments: 6,
    });
  };
  const gear = (x, y, z, r, teeth, speed, rotY = 0, mat = brass) => {
    const m = K.deco(gearGeo(r, teeth, 0.28), mat, x, y, z);
    m.rotation.y = rotY;
    gears.push({ m, speed, base: speed });
    return m;
  };
  const annulus = (r0, r1, depth, segs = 64) => {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, r1, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, r0, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    return new THREE.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: segs,
    });
  };
  const gate = (z, w, h) => {
    // brass portcullis that rises into the lintel
    const g = new THREE.Group();
    const bars = [];
    for (let x = -w / 2 + 0.3; x <= w / 2 - 0.29; x += 0.42) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 8), brass);
      b.position.set(x, h / 2, 0);
      g.add(b);
      bars.push(b);
    }
    [0.6, h / 2, h - 0.4].forEach((y) => {
      const r = new THREE.Mesh(bx(w, 0.12, 0.14), brass);
      r.position.y = y;
      g.add(r);
    });
    const plate = plane(0.9, 0.9, suitPlate('d', 0.9));
    plate.position.set(0, h / 2, 0.1);
    g.add(plate);
    g.position.copy(P(0, 0, z));
    group.add(g);
    const col = K.collider(0, h / 2, z, w, h, 0.4);
    return { g, col, h, open: 0, target: 0 };
  };
  const roomShell = (z0, z1, hw, h, wallMat = panel) => {
    const zc = (z0 + z1) / 2;
    const len = z1 - z0;
    K.solid(0, -0.5, zc, hw * 2, 1, len, darkMarble);
    K.solid(-hw - 0.3, h / 2, zc, 0.6, h, len, wallMat);
    K.solid(hw + 0.3, h / 2, zc, 0.6, h, len, wallMat);
    K.solid(0, h + 0.2, zc, hw * 2 + 1.2, 0.4, len, darkMarble);
    // wainscoting + brass rail along both walls
    [-1, 1].forEach((sd) => {
      K.deco(bx(0.12, 1.4, len), wood, sd * (hw - 0.06), 0.7, zc);
      K.deco(bx(0.16, 0.1, len), brass, sd * (hw - 0.06), 1.44, zc);
      K.deco(bx(0.2, 0.36, len), wood, sd * (hw - 0.08), h - 0.2, zc);
    });
  };
  // end wall with a doorway of width dw (and the gate in it)
  const endWall = (z, hw, h, dw, dh) => {
    const side = (hw - dw / 2) / 2;
    K.solid(-(dw / 2 + side), h / 2, z, side * 2, h, 0.6, panel);
    K.solid(dw / 2 + side, h / 2, z, side * 2, h, 0.6, panel);
    K.solid(0, (h + dh) / 2, z, dw, h - dh, 0.6, panel);
    K.deco(bx(dw + 0.6, 0.3, 0.7), brass, 0, dh + 0.15, z);
    [-1, 1].forEach((sd) => K.deco(bx(0.3, dh, 0.7), brass, sd * (dw / 2 + 0.15), dh / 2, z));
  };

  // ---------- safes ----------
  const numCache = {};
  const numMat = (n, col = '#ffd9a0') => {
    const key = n + col;
    if (numCache[key]) return numCache[key];
    numCache[key] = canvasMat(
      256,
      256,
      (g) => {
        g.clearRect(0, 0, 256, 256);
        g.fillStyle = col;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = serif(190);
        g.fillText(String(n), 128, 140);
      },
      { transparent: true },
    );
    return numCache[key];
  };
  const anaCache = {};
  const anaMat = (n, s) => {
    const key = n + s;
    if (anaCache[key]) return anaCache[key];
    anaCache[key] = canvasMat(
      512,
      512,
      (g) => {
        g.clearRect(0, 0, 512, 512);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = 'bold 400px Georgia, serif';
        g.shadowColor = '#ffcf8a';
        g.shadowBlur = 40;
        g.lineWidth = 18;
        g.strokeStyle = '#2a1408';
        g.strokeText(String(n), 256, 290);
        g.fillStyle = '#ffe2b0';
        g.fillText(String(n), 256, 290);
        g.shadowBlur = 0;
        g.fillStyle = SCOL[s];
        Icons.draw(g, Icons.of(SYM[s]), 430, 90, 110);
      },
      { transparent: true },
    );
    return anaCache[key];
  };
  const dialFace = canvasMat(512, 512, (g) => {
    g.fillStyle = '#20141c';
    g.beginPath();
    g.arc(256, 256, 250, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#e0ad52';
    g.lineWidth = 10;
    g.stroke();
    g.fillStyle = '#f2d9a8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = serif(64);
    for (let i = 1; i <= 9; i++) {
      const a = ((i - 1) / 9) * Math.PI * 2;
      g.fillText(String(i), 256 + Math.sin(a) * 180, 256 - Math.cos(a) * 180);
      g.fillRect(256 + Math.sin(a + 0.35) * 215 - 3, 256 - Math.cos(a + 0.35) * 215 - 3, 6, 6);
    }
  });
  const doorFace = canvasMat(512, 560, (g, w, h) => {
    g.fillStyle = '#6f7480';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
      g.fillRect(0, y, w, 1);
    }
    // bevelled frame, inner panel, rivets
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 10;
    g.strokeRect(22, 22, w - 44, h - 44);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 3;
    g.strokeRect(30, 30, w - 60, h - 60);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 4;
    g.strokeRect(70, 70, w - 140, h - 140);
    for (let i = 0; i < 8; i++) {
      [
        [46 + i * 60, 46],
        [46 + i * 60, h - 46],
      ].forEach(([x, y]) => {
        g.fillStyle = '#3b3e46';
        g.beginPath();
        g.arc(x, y, 8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.beginPath();
        g.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
        g.fill();
      });
    }
    g.fillStyle = 'rgba(30,20,10,0.45)';
    g.font = mono(26);
    g.textAlign = 'center';
    g.fillText('VEILLEURS & CIE', w / 2, h - 100);
  });
  const safe = (s, x, y, z, rotY) => {
    // a heavy safe set into the wall: the door swings open on its hinge when the code is right
    const g = new THREE.Group();
    const body = new THREE.Mesh(bx(2.2, 2.4, 1.4), iron);
    body.position.set(0, 1.2, -0.5);
    g.add(body);
    const inside = new THREE.Mesh(bx(1.7, 1.9, 0.1), velvet);
    inside.position.set(0, 1.2, -0.95);
    g.add(inside);
    const hinge = new THREE.Group();
    hinge.position.set(-0.95, 0, 0.22);
    g.add(hinge);
    const door = new THREE.Mesh(bx(1.9, 2.1, 0.22), steel);
    door.position.set(0.95, 1.2, 0);
    hinge.add(door);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 2.06), doorFace);
    face.position.set(0.95, 1.2, 0.112);
    hinge.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 10, 40), brass);
    rim.position.set(0.95, 1.35, 0.13);
    hinge.add(rim);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), dialFace);
    dial.position.set(0.95, 1.35, 0.135);
    hinge.add(dial);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 16), brass);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.95, 1.35, 0.2);
    hinge.add(knob);
    const tick = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), glow('#ffcf8a', 1));
    tick.rotation.z = Math.PI;
    tick.position.set(0.95, 1.86, 0.15);
    hinge.add(tick);
    // the handle: three spokes
    const wheel = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), brass);
      sp.rotation.z = (i / 3) * Math.PI;
      wheel.add(sp);
    }
    wheel.position.set(0.95, 0.72, 0.16);
    hinge.add(wheel);
    // the current number shows in a small window above the dial
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), numMat(1));
    win.position.set(0.95, 1.98, 0.13);
    hinge.add(win);
    const plateS = plane(0.34, 0.34, suitPlate(s, 0.34));
    plateS.position.set(0.95, 0.3, 0.125);
    hinge.add(plateS);
    // inside: the cog with the keypad digit (revealed when open)
    const token = new THREE.Group();
    const cog = new THREE.Mesh(gearGeo(0.5, 12, 0.12), brass);
    token.add(cog);
    const dig = plane(0.6, 0.6, numMat(0, '#fff2d0'));
    dig.position.z = 0.2;
    token.add(dig);
    token.position.set(0, 1.25, -0.75);
    token.visible = false;
    g.add(token);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glow('#ff3b55', 1.2));
    lamp.position.set(0.85, 2.55, 0.25);
    g.add(lamp);
    g.position.copy(P(x, y, z));
    g.rotation.y = rotY;
    group.add(g);
    safes[s] = {
      g,
      hinge,
      dial,
      win,
      wheel,
      token,
      dig,
      lamp,
      open: 0,
      ang: 0,
      shake: 0,
      pos: P(x, y, z),
      // where you stand to work the dial (1.4 m in front of the door)
      front: P(x + Math.sin(rotY) * 1.5, y, z + Math.cos(rotY) * 1.5),
      value: 1,
    };
  };

  // ---------- build ----------
  const build = () => {
    group.visible = true;
    if (built) return;
    built = true;

    // ===== entrance hall =====
    roomShell(-6, 10, 9, 8);
    K.solid(0, 4, -6.3, 18, 8, 0.6, panel);
    screen = makeScreen(10, 4.6, 1024);
    screen.mesh.position.copy(P(0, 4.4, -5.95));
    group.add(screen.mesh);
    K.deco(bx(10.6, 5.2, 0.2), brass, 0, 4.4, -6.02);
    gear(-6.6, 4.8, -5.9, 1.4, 14, 0.25);
    gear(6.6, 4.8, -5.9, 1.4, 14, -0.25);
    [-6, 6].forEach((x) => column(x, 4, 8));
    chandelier(0, 6.6, 2);
    // the vault plaque: VEILLEURS · CAVEAU N°4
    const plaque = plane(
      5,
      1.1,
      canvasMat(1000, 220, (g, w, h) => {
        frame(g, w, h, '#e0ad52', '#1a0f14');
        g.fillStyle = '#f2d9a8';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = mono(64);
        g.fillText('BANQUE DES VEILLEURS · CAVEAU N°4', w / 2, h / 2);
      }),
    );
    plaque.position.copy(P(0, 7.2, -5.9));
    group.add(plaque);

    // ===== room 1 · la galerie des coffres =====
    roomShell(10, 44, 14, 11);
    // hall → gallery: a wide arch
    endWall(10, 14, 11, 8, 5.5);
    endWall(44, 14, 11, 5, 4.6);
    gates.g1 = gate(44, 5, 4.6);
    // the red carpet with a suit pattern, and the invisible ink only the Dame can read
    K.deco(
      new THREE.PlaneGeometry(8, 28).rotateX(-Math.PI / 2),
      canvasMat(400, 1400, (g, w, h) => {
        g.fillStyle = '#5a0f1f';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e0ad52';
        g.lineWidth = 10;
        g.strokeRect(16, 16, w - 32, h - 32);
        g.lineWidth = 3;
        g.strokeRect(34, 34, w - 68, h - 68);
        g.globalAlpha = 0.5;
        for (let r = 0; r < 14; r++)
          for (let cc = 0; cc < 4; cc++) {
            const s = SUITS[(r + cc) % 4];
            g.fillStyle = r % 2 ? '#e0ad52' : '#a8324a';
            Icons.draw(g, Icons.of(SYM[s]), 70 + cc * 87, 80 + r * 95, 44);
          }
        g.globalAlpha = 1;
      }),
      0,
      0.02,
      27,
    );
    clues.ink = plane(2.2, 2.2, numMat(0, '#c9a6ff'));
    clues.ink.geometry = new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2);
    clues.ink.position.copy(P(0, 0.04, 20));
    group.add(clues.ink);
    const inkSuit = plane(1.1, 1.1, suitPlate('c', 1.1, 0.6));
    inkSuit.geometry = new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2);
    inkSuit.position.copy(P(-1.7, 0.04, 20));
    group.add(inkSuit);
    clues.inkSuit = inkSuit;
    [-9, 9].forEach((x) => [16, 26, 38].forEach((z) => column(x, z, 11)));
    chandelier(0, 8.6, 18);
    chandelier(0, 8.6, 34);
    // the great clock over the far gate: its hour hand gives the ♥ code
    clues.clock = canvasMat(600, 600, () => {});
    const clockM = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), clues.clock);
    clockM.position.copy(P(0, 7.8, 43.65));
    clockM.rotation.y = Math.PI;
    group.add(clockM);
    const clockRim = K.deco(new THREE.TorusGeometry(2.25, 0.14, 12, 64), brass, 0, 7.8, 43.6);
    clockRim.rotation.y = Math.PI;
    gear(-4.2, 8.6, 43.6, 1.1, 12, 0.2, Math.PI);
    gear(4.2, 8.6, 43.6, 1.1, 12, -0.2, Math.PI);
    // the four safes: ♥ and ♣ on the floor, ♠ on the Valet's ledge, ♦ on the Dame's balcony
    safe('h', -13.95, 0, 18, Math.PI / 2);
    safe('c', 13.95, 0, 18, -Math.PI / 2);
    // ♠ ledge (2.95 m: only the strong double jump reaches it)
    K.solid(12.4, 1.475, 33, 3.2, 2.95, 7, stone);
    K.deco(bx(3.3, 0.12, 7.1), brass, 12.4, 2.98, 33);
    safe('s', 13.95, 2.95, 33, -Math.PI / 2);
    // ♦ balcony (5 m: only the grapple reaches it), with a railing
    K.solid(-12.2, 2.5, 33, 3.6, 5, 8, stone);
    K.deco(bx(3.7, 0.12, 8.1), brass, -12.2, 5.02, 33);
    K.collider(-10.35, 5.5, 33, 0.12, 1, 8);
    K.deco(new THREE.CylinderGeometry(0.05, 0.05, 8, 10).rotateX(Math.PI / 2), brass, -10.35, 6, 33);
    for (let z = 29.4; z <= 36.6; z += 0.6)
      K.deco(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), brass, -10.35, 5.5, z);
    safe('d', -13.95, 5, 33, Math.PI / 2);
    balconyRing = K.deco(new THREE.TorusGeometry(0.55, 0.08, 10, 32), glow('#ff9a3a', 1.6), -10.6, 8.8, 33);
    balconyRing.rotation.y = Math.PI / 2;
    // anamorphic paintings: the number only forms from the right spot
    // (the ♠ code reads from the Dame's balcony, the ♦ code from the Valet's ledge)
    clues.paintS = painting(13.6, 7.4, 22, -Math.PI / 2, 3.2, 2.4, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#2a1830');
      gr.addColorStop(1, '#3d2232');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = i % 2 ? '#7a4a5a' : '#4a2a3a';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(Math.random() * w, Math.random() * h);
        g.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
    clues.paintD = painting(-13.6, 7.4, 22, Math.PI / 2, 3.2, 2.4, (g, w, h) => {
      const gr = g.createLinearGradient(0, h, w, 0);
      gr.addColorStop(0, '#16202e');
      gr.addColorStop(1, '#2c1f36');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.45;
      for (let i = 0; i < 34; i++) {
        g.fillStyle = i % 2 ? '#3a4a6a' : '#5a3a6a';
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    });
    // the hidden numbers sit on top of the paintings, faded in by the level
    [
      ['S', clues.paintS, -Math.PI / 2, 13.42, 's'],
      ['D', clues.paintD, Math.PI / 2, -13.42, 'd'],
    ].forEach(([k, p, rotY, x, s]) => {
      const num = plane(2.1, 2.1, anaMat(0, s));
      num.material = num.material.clone();
      num.material.opacity = 0;
      num.position.copy(P(x, 7.4, 22));
      num.rotation.y = rotY;
      group.add(num);
      const sp = plane(0.7, 0.7, suitPlate(s, 0.7));
      sp.material = sp.material.clone();
      sp.material.opacity = 0;
      sp.position.copy(P(x, 9.0, 22));
      sp.rotation.y = rotY;
      group.add(sp);
      clues['num' + k] = { num, sp };
    });
    // decoration: small display cases with jewels
    [
      [-5, 13],
      [5, 13],
      [-5, 41],
      [5, 41],
    ].forEach(([x, z]) => {
      solidUV(x, 0.55, z, 1.2, 1.1, 1.2, wood);
      K.deco(bx(1.1, 0.8, 1.1), glass, x, 1.5, z);
      K.collider(x, 1.5, z, 1.1, 0.8, 1.1);
      const jewel = K.deco(new THREE.OctahedronGeometry(0.22, 0), glow(Object.values(SCOL)[(x + z) & 3], 1.2), x, 1.45, z);
      gears.push({ m: jewel, speed: 0.6, spin: true });
    });
    vent(-6, 30);
    vent(6, 24);

    // ===== room 2 · la salle des lasers =====
    roomShell(44, 88, 9, 11);
    endWall(88, 9, 11, 4.4, 4.6);
    gates.g2 = gate(88, 4.4, 4.6);
    // the laser corridor (12 m wide) between the catwalk block and the display wall
    K.solid(-7.6, 2.5, 63, 2.8, 5, 34, stone); // catwalk base, x -9..-6.2, z 46..80
    K.deco(bx(2.9, 0.12, 34.1), iron, -7.6, 5.02, 63);
    K.collider(-6.2, 5.55, 61, 0.12, 1.1, 30);
    K.deco(new THREE.CylinderGeometry(0.05, 0.05, 30, 10).rotateX(Math.PI / 2), brass, -6.2, 6.1, 61);
    for (let z = 46.4; z <= 75.6; z += 0.7)
      K.deco(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), brass, -6.2, 5.55, z);
    // stairs from the catwalk's far end down to the keypad floor
    for (let i = 0; i < 9; i++) {
      const y = 5 - (i + 1) * 0.55;
      K.solid(-7.6, y / 2, 76.6 + i * 1.05, 2.8, Math.max(0.1, y), 1.05, stone);
      K.deco(bx(2.8, 0.06, 0.12), brass, -7.6, y + 0.03, 76.1 + i * 1.05 + 0.5);
    }
    solidUV(7.6, 1.6, 62, 2.8, 3.2, 28, wood); // display wall, x 6.2..9, z 48..76
    K.deco(bx(2.6, 1.6, 27.6), glass, 7.6, 4, 62);
    K.collider(7.6, 4, 62, 2.6, 1.6, 27.6);
    for (let z = 51; z < 76; z += 4.5) {
      const ing = K.deco(bx(0.6, 0.3, 1.1), brass, 7.6, 3.36, z);
      ing.rotation.y = 0.3;
    }
    // laser emitters and beams: one sheet per lane and row
    const beamGeo = new THREE.PlaneGeometry(4, 2.3);
    ROWS.forEach((z, ri) => {
      [-1, 1].forEach((sd) => {
        const post = K.deco(bx(0.32, 2.6, 0.32), iron, sd * 6.05, 1.3, z);
        post.castShadow = false;
        const lens = K.deco(new THREE.SphereGeometry(0.11, 12, 8), glow('#ff2a3a', 1.4), sd * 5.86, 1.15, z);
        emitters.push(lens);
      });
      LANES.forEach((x, li) => {
        const m = new THREE.Mesh(
          beamGeo,
          new THREE.MeshBasicMaterial({
            color: new THREE.Color('#ff2a3a').multiplyScalar(1.5),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
        );
        m.position.copy(P(x, 1.2, z));
        group.add(m);
        // a few bright horizontal strands inside each sheet
        const strands = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const st = new THREE.Mesh(
            bx(4, 0.025, 0.025),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color('#ff5a5a').multiplyScalar(1.6),
              transparent: true,
              opacity: 0,
              toneMapped: false,
            }),
          );
          st.position.y = -0.9 + k * 0.48;
          strands.add(st);
        }
        m.add(strands);
        lasers.push({ m, strands, row: ri, lane: li, k: 0 });
      });
      // floor marking under each row
      K.deco(bx(12, 0.02, 0.12), glow('#5a1020', 1), 0, 0.012, z);
    });
    // floor numbering of the lanes (for guiding: G · M · D)
    ['G', 'M', 'D'].forEach((l, i) => {
      const m = plane(
        1.2,
        1.2,
        canvasMat(
          256,
          256,
          (g) => {
            g.clearRect(0, 0, 256, 256);
            g.fillStyle = '#e0ad52';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.font = serif(180);
            g.fillText(l, 128, 140);
          },
          { transparent: true, k: 0.6 },
        ),
      );
      m.geometry = new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2).rotateY(Math.PI);
      m.position.copy(P(LANES[i], 0.03, 50.4));
      group.add(m);
    });
    // the Dame's monitor on the catwalk (laser map + the order plate)
    monitor = canvasMat(960, 600, () => {});
    const mon = plane(3.6, 2.25, monitor);
    mon.position.copy(P(-8.95, 6.9, 60));
    mon.rotation.y = Math.PI / 2;
    group.add(mon);
    K.deco(bx(0.2, 2.6, 3.9), iron, -9.05, 6.9, 60);
    catwalkRing = K.deco(new THREE.TorusGeometry(0.55, 0.08, 10, 32), glow('#ff9a3a', 1.6), -6.4, 9, 49.5);
    catwalkRing.rotation.y = Math.PI / 2;
    // the Dame's validation lever at the end of the catwalk
    lever = (() => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(bx(0.9, 0.5, 0.7), iron);
      base.position.y = 0.25;
      const pivot = new THREE.Group();
      pivot.position.y = 0.5;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 10), brass);
      arm.position.y = 0.6;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), glow('#ff9a3a', 1.3));
      knob.position.y = 1.2;
      pivot.add(arm, knob);
      pivot.rotation.x = -0.6;
      g.add(base, pivot);
      g.position.copy(P(-8.3, 5, 74));
      group.add(g);
      K.collider(-8.3, 5.25, 74, 0.9, 0.5, 0.7);
      return { g, pivot, pulled: 0 };
    })();
    // the mechanical keypad on the right wall of the far end, and the rack with the four cogs
    K.deco(bx(0.3, 4.2, 10.8), brass, 8.85, 2.3, 81);
    K.deco(bx(0.2, 3.9, 10.5), darkMarble, 8.75, 2.3, 81);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const keyB = new THREE.Mesh(bx(0.3, 0.95, 0.95), brass);
      g.add(keyB);
      const face = plane(0.8, 0.8, numMat(i + 1, '#ffd9a0'));
      face.rotation.y = -Math.PI / 2;
      face.position.x = -0.16;
      g.add(face);
      const y = 1.45;
      const z = 76.6 + i * 1.1;
      g.position.copy(P(8.55, y, z));
      group.add(g);
      keys.push({ g, n: i + 1, y, z, press: 0 });
    }
    keyDisplay = canvasMat(800, 200, () => {});
    const kd = plane(4.4, 1.1, keyDisplay);
    kd.position.copy(P(8.62, 3.3, 81));
    kd.rotation.y = -Math.PI / 2;
    group.add(kd);
    // rack: the four cogs taken from the safes hang over the gate
    SUITS.forEach((s, i) => {
      const g = new THREE.Group();
      const cog = new THREE.Mesh(gearGeo(0.55, 12, 0.14), brass);
      g.add(cog);
      const ps = plane(0.5, 0.5, suitPlate(s, 0.5));
      ps.position.set(0, 0.95, 0.12);
      g.add(ps);
      const dig = plane(0.62, 0.62, numMat(0, '#fff2d0'));
      dig.position.z = 0.2;
      g.add(dig);
      g.position.copy(P(-3 + i * 2, 7.6, 87.6));
      g.rotation.y = Math.PI;
      g.visible = false;
      group.add(g);
      tokens[s] = { g, dig, cog };
    });
    chandelier(0, 8.6, 52);
    chandelier(0, 8.6, 70);
    vent(-3, 78);
    vent(3, 84);

    // ===== room 3 · la porte du caveau =====
    roomShell(88, 132, 13, 16, stone);
    // the far wall has the round vault opening
    K.solid(-9.5, 8, 132, 7, 16, 1.2, stone);
    K.solid(9.5, 8, 132, 7, 16, 1.2, stone);
    K.solid(0, 14.5, 132, 12, 3, 1.2, stone);
    K.solid(0, 0.15, 132, 12, 0.3, 1.2, stone);
    const surround = K.deco(annulus(6.1, 7.1, 0.6, 96), brass, 0, DOOR.y, 131.3);
    surround.rotation.y = Math.PI;
    doorG = new THREE.Group();
    doorG.position.copy(P(0, DOOR.y, DOOR.z));
    doorG.rotation.y = Math.PI;
    group.add(doorG);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1.1, 96).rotateX(Math.PI / 2), steel);
    disc.position.z = -0.4;
    doorG.add(disc);
    // the engraved face of the vault door: rays, rivets and the eye of the Veilleurs
    const engr = new THREE.Mesh(
      new THREE.CircleGeometry(6, 96),
      canvasMat(1080, 1080, (g, w) => {
        const c = w / 2;
        const gr = g.createRadialGradient(c, c, 0, c, c, c);
        gr.addColorStop(0, '#8a8f9a');
        gr.addColorStop(1, '#4e525c');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          g.lineWidth = i % 6 ? 1.5 : 4;
          g.beginPath();
          g.moveTo(c + Math.cos(a) * c * 0.2, c + Math.sin(a) * c * 0.2);
          g.lineTo(c + Math.cos(a) * c * 0.97, c + Math.sin(a) * c * 0.97);
          g.stroke();
        }
        [0.98, 0.9, 0.62, 0.36].forEach((k) => {
          g.lineWidth = 6;
          g.strokeStyle = 'rgba(0,0,0,0.4)';
          g.beginPath();
          g.arc(c, c, c * k, 0, Math.PI * 2);
          g.stroke();
          g.lineWidth = 2;
          g.strokeStyle = 'rgba(255,255,255,0.3)';
          g.beginPath();
          g.arc(c, c, c * k - 5, 0, Math.PI * 2);
          g.stroke();
        });
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const x = c + Math.cos(a) * c * 0.94;
          const y = c + Math.sin(a) * c * 0.94;
          g.fillStyle = '#2e3138';
          g.beginPath();
          g.arc(x, y, 10, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.45)';
          g.beginPath();
          g.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
          g.fill();
        }
      }, { k: 0.55 }),
    );
    engr.position.z = 0.16;
    doorG.add(engr);
    const doorCol = K.collider(0, DOOR.y, 131.6, 12.2, 12.2, 1.2);
    const discGeo = new THREE.CircleGeometry(0.6, 32);
    const enamel = new THREE.MeshBasicMaterial({ color: '#160c14' });
    // three concentric rings with the four suits around each
    const RCOL = ['#e0ad52', '#ff8fb0', '#8fb8ff'];
    DOOR.r.forEach((r, i) => {
      const ringG = new THREE.Group();
      const rr = new THREE.Mesh(annulus(r - 1.25, r, 0.4, 80), i === 1 ? steel : brass);
      ringG.add(rr);
      SUITS.forEach((s, k) => {
        const ps = plane(1.1, 1.1, suitPlate(s, 1.1));
        const a = (k / 4) * Math.PI * 2;
        ps.position.set(Math.sin(a) * (r - 0.62), Math.cos(a) * (r - 0.62), 0.47);
        ps.rotation.z = -a;
        ringG.add(ps);
        // a dark enamel disc behind each suit so it reads on the polished metal
        const back = new THREE.Mesh(discGeo, enamel);
        back.position.set(ps.position.x, ps.position.y, 0.455);
        ringG.add(back);
      });
      // ring number studs
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
        const st = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(RCOL[i], 0.9));
        st.position.set(Math.sin(a) * (r - 0.15), Math.cos(a) * (r - 0.15), 0.44);
        ringG.add(st);
      }
      ringG.position.z = 0.15;
      doorG.add(ringG);
      rings.push({ g: ringG, ang: 0, shake: 0 });
      // the Dame alone sees the target suit beside the marker of each ring
      const tg = plane(1.05, 1.05, suitPlate('h', 1.05));
      tg.material = tg.material.clone();
      tg.position.set(1.35, r - 0.62, 0.66);
      const tgRing = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.68, 40), glow('#ffcf8a', 1.1));
      tg.add(tgRing);
      tg.userData.halo = tgRing;
      const tgBack = new THREE.Mesh(discGeo, enamel);
      tgBack.position.z = -0.01;
      tg.add(tgBack);
      doorG.add(tg);
      targets.push(tg);
    });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.7, 48).rotateX(Math.PI / 2), brass);
    hub.position.z = 0.3;
    doorG.add(hub);
    const hubHeart = plane(1.4, 1.4, suitPlate('h', 1.4));
    hubHeart.position.z = 0.67;
    doorG.add(hubHeart);
    // the fixed marker at the top: a glowing arrow over all three rings
    const marker = new THREE.Mesh(bx(0.16, 5.4, 0.08), glow('#ffcf8a', 1.1));
    marker.position.set(0, 3.1, 0.66);
    doorG.add(marker);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.7, 4), glow('#ffcf8a', 1.2));
    arrow.rotation.z = Math.PI;
    arrow.position.set(0, 6.1, 0.66);
    doorG.add(arrow);
    // bolts around the rim (they retract when the vault opens)
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 16), steel);
      b.rotation.z = -a;
      b.position.set(Math.sin(a) * 6.3, Math.cos(a) * 6.3, 0);
      doorG.add(b);
      bolts.push({ m: b, a });
    }
    gear(-9, 12, 131.2, 2.4, 20, 0.12, Math.PI, iron);
    gear(9, 12, 131.2, 2.4, 20, -0.12, Math.PI, iron);
    gear(-10.6, 7, 131.2, 1.5, 14, -0.19, Math.PI);
    gear(10.6, 7, 131.2, 1.5, 14, 0.19, Math.PI);
    // the time-lock display over the door
    timer = makeScreen(9, 2.6, 1024);
    timer.mesh.position.copy(P(0, 14.75, 130.4));
    timer.mesh.rotation.y = Math.PI;
    group.add(timer.mesh);
    // cranks: rings I, II, III on each side
    [-1, 1].forEach((sd) => {
      [112, 117, 122].forEach((z, i) => {
        const g = new THREE.Group();
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.1, 20), iron);
        ped.position.y = 0.55;
        g.add(ped);
        const wheel = new THREE.Group();
        const wr = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 10, 36), brass);
        wheel.add(wr);
        for (let k = 0; k < 4; k++) {
          const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), brass);
          sp.rotation.z = (k / 4) * Math.PI;
          wheel.add(sp);
        }
        const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), wood);
        hdl.rotation.x = Math.PI / 2;
        hdl.position.set(0.5, 0, 0.2);
        wheel.add(hdl);
        wheel.position.y = 1.4;
        wheel.rotation.y = Math.PI / 2;
        g.add(wheel);
        const num = plane(
          0.7,
          0.7,
          canvasMat(
            256,
            256,
            (gg) => {
              gg.clearRect(0, 0, 256, 256);
              gg.fillStyle = RCOL[i];
              gg.textAlign = 'center';
              gg.textBaseline = 'middle';
              gg.font = serif(150);
              gg.fillText(['I', 'II', 'III'][i], 128, 140);
            },
            { transparent: true },
          ),
        );
        num.position.set(0, 2.3, 0);
        num.rotation.y = -sd * Math.PI / 2;
        g.add(num);
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.8, 1.05, 36).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(RCOL[i]).multiplyScalar(1.2),
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        halo.position.y = 0.03;
        g.add(halo);
        g.position.copy(P(sd * 10.2, 0, z));
        group.add(g);
        K.collider(sd * 10.2, 0.55, z, 1, 1.1, 1);
        cranks.push({ g, wheel, halo, ring: i, side: sd < 0 ? 'L' : 'R', x: sd * 10.2, z, spin: 0, pend: 0 });
      });
      // side plaques: ♥ side and ♠ side
      const pl = plane(1.4, 1.4, suitPlate(sd < 0 ? 'h' : 's', 1.4));
      pl.position.copy(P(sd * 12.9, 4, 117));
      pl.rotation.y = -sd * Math.PI / 2;
      group.add(pl);
    });
    [-8, 8].forEach((x) => [96, 106, 126].forEach((z) => column(x, z, 16)));
    vent(-4, 100);
    vent(4, 108);
    vent(-5, 124);
    vent(5, 124);
    // the security sweep: a red bar at shin height, with its warning line on the floor
    sweep = new THREE.Group();
    const bar = new THREE.Mesh(
      bx(26, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3a').multiplyScalar(1.6), toneMapped: false }),
    );
    sweep.add(bar);
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 0.9),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff2a3a').multiplyScalar(1.2),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    sheet.rotation.x = Math.PI / 2;
    sweep.add(sheet);
    sweep.position.copy(P(0, 0.45, SWEEP.from));
    sweep.visible = false;
    group.add(sweep);
    sweepWarn = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 1.2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff2a3a'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sweepWarn.position.copy(P(0, 0.03, SWEEP.from));
    group.add(sweepWarn);

    // ===== the vault =====
    K.solid(0, -0.5, 140, 12, 1, 16, darkMarble);
    K.solid(-6.3, 6, 140, 0.6, 12, 16, stone);
    K.solid(6.3, 6, 140, 0.6, 12, 16, stone);
    K.solid(0, 6, 148.3, 12, 12, 0.6, stone);
    K.solid(0, 12.2, 140, 13, 0.4, 16, darkMarble);
    // gold bars stacked on both sides
    const barGeo = bx(0.9, 0.3, 0.45);
    const gold = painted(brushed('#d8a640', 'rgba(255,240,180,0.35)'), { roughness: 0.3, metalness: 0.35 });
    [-1, 1].forEach((sd) => {
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 6 - r; k++) {
          const b = new THREE.Mesh(barGeo, gold);
          b.position.copy(P(sd * 4.6, 0.15 + r * 0.3, 136 + k * 0.95 + r * 0.47));
          b.rotation.y = Math.PI / 2;
          group.add(b);
        }
      K.collider(sd * 4.6, 0.6, 138.4, 1, 1.2, 6);
    });
    K.solid(0, 0.6, 144, 1.6, 1.2, 1.6, marble);
    K.deco(bx(1.8, 0.12, 1.8), brass, 0, 1.22, 144);
    card = LvKit.card('4', '♦', true);
    card.position.copy(P(0, 2.4, 144));
    group.add(card);
    heart = Heart.galaxy(4200, 0.26, 44);
    heart.group.position.copy(P(0, 7, 146));
    heart.group.rotation.y = Math.PI;
    heart.U.uForm.value = 0;
    heart.core.material.opacity = 0;
    group.add(heart.group);
    // a few soft lights low in each room (high lights burnt a spot into the ceilings)
    LvKit.light(group, P(0, 5, 2), '#ffd9a8', 1.2, 20);
    LvKit.light(group, P(0, 5.5, 27), '#ffd2a0', 1.3, 30);
    LvKit.light(group, P(0, 5.5, 66), '#ffb8c0', 1.1, 30);
    LvKit.light(group, P(0, 8, 112), '#ffd2a0', 1.4, 40);
    LvKit.light(group, P(0, 6, 141), '#ffcf8a', 1.1, 18);
    // wall sconces: little brass arms with a warm globe, all along the rooms
    const sconce = (x, y, z, rotY) => {
      const g = new THREE.Group();
      const plate = new THREE.Mesh(bx(0.08, 0.5, 0.3), brass);
      g.add(plate);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), brass);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(0.22, 0.05, 0);
      g.add(arm);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), glow('#ffd2a0', 1.15));
      globe.position.set(0.45, 0.16, 0);
      g.add(globe);
      g.position.copy(P(x, y, z));
      g.rotation.y = rotY;
      group.add(g);
    };
    [12, 21, 41].forEach((z) => sconce(-13.95, 4.2, z, 0));
    [12, 21, 41].forEach((z) => sconce(13.95, 4.2, z, Math.PI));
    [46.5, 86.5].forEach((z) => sconce(8.95, 4, z, Math.PI));
    sconce(-8.95, 4, 86.5, 0);
    [92, 102, 112, 122].forEach((z) => {
      sconce(-12.95, 5, z, 0);
      sconce(12.95, 5, z, Math.PI);
    });
    // decorative portraits of the Veilleurs in the gallery (no clue in them)
    const veil = (seed) => (g, w, h) => {
      const r = rng(seed);
      const gr = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w);
      gr.addColorStop(0, '#3a2a44');
      gr.addColorStop(1, '#100a14');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      // a hooded silhouette with one shining eye: the Veilleurs
      g.fillStyle = '#05030a';
      g.beginPath();
      g.moveTo(w * 0.5, h * 0.12);
      g.bezierCurveTo(w * 0.9, h * 0.2, w * 0.95, h * 0.95, w * 0.85, h);
      g.lineTo(w * 0.15, h);
      g.bezierCurveTo(w * 0.05, h * 0.95, w * 0.1, h * 0.2, w * 0.5, h * 0.12);
      g.fill();
      const ex = w * (0.42 + r() * 0.16);
      const eg = g.createRadialGradient(ex, h * 0.36, 1, ex, h * 0.36, w * 0.12);
      eg.addColorStop(0, '#ffe2b0');
      eg.addColorStop(0.3, '#ff9a3a');
      eg.addColorStop(1, 'rgba(255,90,40,0)');
      g.fillStyle = eg;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.2;
      for (let i = 0; i < 300; i++) {
        g.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
        g.fillRect(r() * w, r() * h, 2, 2);
      }
      g.globalAlpha = 1;
    };
    painting(-13.6, 6.6, 13.5, Math.PI / 2, 1.6, 2.2, veil(3));
    painting(13.6, 6.6, 13.5, -Math.PI / 2, 1.6, 2.2, veil(5));
    painting(-13.6, 6.6, 40.5, Math.PI / 2, 1.6, 2.2, veil(7));
    painting(13.6, 6.6, 40.5, -Math.PI / 2, 1.6, 2.2, veil(9));
    D4.doorCol = doorCol;
  };

  // ---------- dynamic canvases ----------
  const drawClock = (hour) =>
    redraw(clues.clock, (g, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      g.fillStyle = '#f1e4cc';
      g.beginPath();
      g.arc(cx, cy, w / 2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#2a1a14';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(cx, cy, w / 2 - 14, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#2a1a14';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = serif(56);
      const RN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillText(RN[i], cx + Math.sin(a) * (w * 0.37), cy - Math.cos(a) * (w * 0.37));
      }
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r0 = w * 0.45;
        const r1 = i % 5 ? w * 0.47 : w * 0.43;
        g.lineWidth = i % 5 ? 2 : 5;
        g.beginPath();
        g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
        g.lineTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
        g.stroke();
      }
      // hour hand on the code, minute hand on twelve: the clock stopped on the hour
      const hand = (a, len, wd, col) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(a);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(-wd, 20);
        g.lineTo(0, -len);
        g.lineTo(wd, 20);
        g.closePath();
        g.fill();
        g.restore();
      };
      hand(0, w * 0.4, 7, '#3a2a24');
      hand((hour / 12) * Math.PI * 2, w * 0.26, 14, '#a8324a');
      g.fillStyle = '#e0ad52';
      g.beginPath();
      g.arc(cx, cy, 16, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#a8324a';
      Icons.draw(g, Icons.of('♥'), cx, cy + w * 0.2, 46);
    });

  const drawMonitor = (role, step, frac, order, valetQ) =>
    redraw(monitor, (g, w, h) => {
      frame(g, w, h, '#ff9a3a', '#07040a');
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      if (role !== 'dame') {
        g.fillStyle = '#ff3b55';
        g.font = mono(54);
        g.textAlign = 'center';
        g.fillText('ACCÈS RESTREINT', w / 2, h * 0.45);
        g.fillStyle = '#c495a6';
        g.font = mono(26);
        g.fillText('Œil des Veilleurs requis', w / 2, h * 0.6);
        return;
      }
      g.fillStyle = '#e8d9c8';
      g.font = mono(26);
      g.fillText('LASERS · SALLE 2', 36, 44);
      // grid: rows top (near) to bottom (far), lanes G M D
      const gx = 60;
      const gy = 80;
      const cw = 120;
      const ch = 56;
      ['G', 'M', 'D'].forEach((l, i) => {
        g.fillStyle = '#e0ad52';
        g.font = serif(34);
        g.textAlign = 'center';
        g.fillText(l, gx + cw * i + cw / 2, gy - 8);
      });
      ROWS.forEach((z, r) => {
        const open = openLane(r, step);
        for (let li = 0; li < 3; li++) {
          const x = gx + cw * li;
          const y = gy + 12 + r * ch;
          g.fillStyle = li === open ? '#103a24' : '#4a0a14';
          g.fillRect(x + 4, y + 4, cw - 8, ch - 8);
          if (li !== open) {
            g.fillStyle = '#ff3b55';
            g.fillRect(x + 8, y + ch / 2 - 3, cw - 16, 6);
          } else {
            g.strokeStyle = '#3fe08a';
            g.lineWidth = 4;
            g.strokeRect(x + 8, y + 8, cw - 16, ch - 16);
          }
        }
        g.fillStyle = '#c495a6';
        g.font = mono(20);
        g.textAlign = 'right';
        g.fillText(String(r + 1), gx - 10, gy + 12 + r * ch + ch / 2);
      });
      // the Valet's position on the map
      if (valetQ && valetQ.z > 48 && valetQ.z < 76) {
        const lx = gx + ((valetQ.x + 6) / 12) * cw * 3;
        const ly = gy + 12 + ((valetQ.z - 50) / 24) * ch * 6;
        g.fillStyle = '#6cc8ff';
        g.beginPath();
        g.arc(lx, ly, 12, 0, Math.PI * 2);
        g.fill();
      }
      // next change bar
      g.fillStyle = '#2a1a20';
      g.fillRect(gx, h - 52, cw * 3, 14);
      g.fillStyle = '#ff9a3a';
      g.fillRect(gx, h - 52, cw * 3 * frac, 14);
      // the order plate
      g.textAlign = 'center';
      g.fillStyle = '#e8d9c8';
      g.font = mono(24);
      g.fillText('ORDRE DU CODE', 700, 120);
      (order || []).forEach((s, i) => {
        g.fillStyle = SCOL[s];
        Icons.draw(g, Icons.of(SYM[s]), 560 + i * 94, 200, 70);
        g.fillStyle = '#c495a6';
        g.font = mono(22);
        g.fillText(String(i + 1), 560 + i * 94, 262);
      });
      g.fillStyle = '#c495a6';
      g.font = mono(20);
      g.fillText('Les rouages des coffres', 700, 330);
      g.fillText('donnent les chiffres.', 700, 360);
      g.fillText('Levier : valider.', 700, 420);
    });

  const drawKeys = (txt, state) =>
    redraw(keyDisplay, (g, w, h) => {
      frame(g, w, h, state === 'bad' ? '#ff3b55' : state === 'ok' ? '#3fe08a' : '#e0ad52', '#07040a');
      g.fillStyle = state === 'bad' ? '#ff3b55' : state === 'ok' ? '#3fe08a' : '#ffd9a0';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = mono(110);
      const s = (txt + '____').slice(0, 4).split('').join(' ');
      g.fillText(s, w / 2, h / 2 + 6);
    });

  // ---------- per-frame ----------
  let lastMon = null;
  let lastKeys = null;
  const update = (dt, t, x, role, L) => {
    if (!built) return;
    screen.update(dt, t);
    timer.update(dt, t);
    gears.forEach((gg) => {
      if (gg.spin) gg.m.rotation.y += dt * gg.speed;
      else gg.m.rotation.z += dt * gg.speed;
    });
    chandeliers.forEach((c, i) => (c.rotation.y = Math.sin(t * 0.3 + i) * 0.05));
    // safes
    SUITS.forEach((s) => {
      const sf = safes[s];
      const opened = !!(x.open && x.open[s]);
      sf.open = damp(sf.open, opened ? 1 : 0, 2.5, dt);
      sf.hinge.rotation.y = -sf.open * 1.9;
      const v = (x.dial && x.dial[s]) || 1;
      if (v !== sf.value) {
        sf.value = v;
        sf.win.material = numMat(v);
      }
      sf.ang = damp(sf.ang, -((v - 1) / 9) * Math.PI * 2, 10, dt);
      sf.shake = Math.max(0, sf.shake - dt);
      sf.dial.rotation.z = sf.ang + (sf.shake > 0 ? Math.sin(t * 60) * 0.05 : 0);
      sf.wheel.rotation.z = opened ? -sf.open * 2.4 : sf.shake > 0 ? Math.sin(t * 50) * 0.2 : 0;
      sf.token.visible = sf.open > 0.3;
      if (sf.token.visible) {
        sf.token.rotation.z = t * 0.8;
        if (x.digits) sf.dig.material = numMat(x.digits[s], '#fff2d0');
      }
      sf.lamp.material.color.set(opened ? '#3fe08a' : sf.shake > 0 ? '#ff3b55' : '#a8324a').multiplyScalar(1.3);
    });
    // clues: the ink only for the Dame, the paintings only from their spot
    if (x.codes && clues.hour !== x.codes.h) {
      clues.hour = x.codes.h;
      drawClock(x.codes.h);
      clues.ink.material = numMat(x.codes.c, '#c9a6ff');
    }
    clues.ink.visible = role === 'dame' && x.stage === 1;
    clues.inkSuit.visible = clues.ink.visible;
    const shimmer = 0.6 + Math.sin(t * 2.2) * 0.12;
    if (clues.ink.visible) clues.ink.material.opacity = shimmer;
    ['S', 'D'].forEach((k) => {
      const c = clues['num' + k];
      const want = L && L['ana' + k] ? 1 : 0;
      c.num.material.opacity = damp(c.num.material.opacity, want, 4, dt);
      c.sp.material.opacity = c.num.material.opacity;
      if (x.codes && c.code !== x.codes[k.toLowerCase()]) {
        c.code = x.codes[k.toLowerCase()];
        const m = anaMat(c.code, k.toLowerCase()).clone();
        m.opacity = c.num.material.opacity;
        c.num.material = m;
      }
      c.num.visible = c.num.material.opacity > 0.01;
      c.sp.visible = c.num.visible;
    });
    // the rings disappear once the Dame stands on their platform (they glowed into the camera)
    const me = L && L.q;
    balconyRing.visible = role === 'dame' && x.stage === 1 && !(me && me.y > 4.5 && me.x < -9.5);
    balconyRing.rotation.x = t * 0.8;
    catwalkRing.visible = role === 'dame' && x.stage === 2 && !(me && me.y > 4.5);
    catwalkRing.rotation.x = t * 0.8;
    // gates
    Object.entries(gates).forEach(([k, gt]) => {
      const want = (k === 'g1' && x.stage >= 2) || (k === 'g2' && x.stage >= 3) ? 1 : 0;
      gt.open = damp(gt.open, want, 1.6, dt);
      gt.g.position.y = O.y + gt.open * (gt.h - 0.25);
      gt.col.on = gt.open < 0.6;
    });
    // lasers: the Dame sees them, the Valet only glimpses them on a pulse
    const step = L ? L.step : 0;
    const pulse = Math.max(0, Math.sin(t * Math.PI * 2 / 3.2)) ** 12;
    const zap = L ? L.zap : 0;
    lasers.forEach((ls) => {
      const on = x.stage === 2 && openLane(ls.row, step) !== ls.lane;
      const vis = role === 'dame' ? 1 : Math.max(0.05, pulse * 0.9, zap);
      ls.k = damp(ls.k, on ? vis : 0, 14, dt);
      ls.m.material.opacity = ls.k * 0.32 * (0.85 + Math.sin(t * 30 + ls.row) * 0.15);
      ls.strands.children.forEach((st) => (st.material.opacity = ls.k * 0.9));
      ls.m.visible = ls.k > 0.005;
    });
    emitters.forEach((e, i) => e.material.color.set('#ff2a3a').multiplyScalar(x.stage === 2 ? 1.2 + Math.sin(t * 6 + i) * 0.2 : 0.3));
    // monitor (10 times a second)
    if (x.stage === 2 && L) {
      const key = role + step + Math.round((L.frac || 0) * 10) + (L.vq ? Math.round(L.vq.x) + ',' + Math.round(L.vq.z) : '');
      if (key !== lastMon) {
        lastMon = key;
        drawMonitor(role, step, L.frac || 0, x.order, L.vq);
      }
    } else if (lastMon !== 'off' + role) {
      lastMon = 'off' + role;
      drawMonitor(role, 0, 0, role === 'dame' ? x.order : null, null);
    }
    // tokens on the rack
    SUITS.forEach((s) => {
      const tk = tokens[s];
      tk.g.visible = x.stage >= 2 && !!x.digits;
      if (tk.g.visible) {
        tk.dig.material = numMat(x.digits[s], '#fff2d0');
        tk.cog.rotation.z = t * 0.5 + SUITS.indexOf(s);
      }
    });
    // keypad
    keys.forEach((k) => {
      k.press = Math.max(0, k.press - dt * 3);
      k.g.position.x = O.x + 8.55 + k.press * 0.12;
    });
    const kstate = (L && L.kstate) || '';
    const kk = (x.kp || '') + kstate;
    if (kk !== lastKeys) {
      lastKeys = kk;
      drawKeys(x.kp || '', kstate);
    }
    lever.pulled = damp(lever.pulled, L && L.lever > 0 ? 1 : 0, 8, dt);
    lever.pivot.rotation.x = -0.6 + lever.pulled * 1.2;
    // vault door
    rings.forEach((rg, i) => {
      // suit k sits at angle k/4 turn: rotating by +ring quarters brings SUITS[ring] under the arrow
      const want = (((x.ring && x.ring[i]) || 0) * Math.PI) / 2;
      let da = want - rg.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      rg.ang += da * Math.min(1, dt * 5);
      rg.shake = Math.max(0, rg.shake - dt);
      rg.g.rotation.z = rg.ang + (rg.shake > 0 ? Math.sin(t * 70) * 0.02 : 0);
      const tg = targets[i];
      tg.visible = role === 'dame' && x.stage === 3 && !!x.target;
      if (tg.visible && tg.userData.s !== x.target[i]) {
        tg.userData.s = x.target[i];
        tg.material = suitPlate(SUITS[x.target[i]], 1.05).clone();
      }
      if (tg.visible) tg.material.opacity = 0.9 + Math.sin(t * 3 + i) * 0.1;
      if (tg.visible) {
        const okR = x.ring && x.ring[i] === x.target[i];
        if (tg.userData.ok !== okR) {
          tg.userData.ok = okR;
          tg.userData.halo.material.color.set(okR ? '#5dff9a' : '#ffcf8a').multiplyScalar(okR ? 1.4 : 1.1);
        }
      }
    });
    const opening = x.stage >= 4 ? 1 : 0;
    D4.openK = damp(D4.openK || 0, opening, 0.7, dt);
    const ok = D4.openK;
    bolts.forEach((b) => {
      const r = 6.3 - Math.min(1, ok * 3) * 1.1;
      b.m.position.set(Math.sin(b.a) * r, Math.cos(b.a) * r, 0);
    });
    const slide = Math.max(0, ok * 1.4 - 0.4);
    doorG.position.x = O.x - slide * 13;
    doorG.rotation.z = slide * 2.2;
    if (D4.doorCol) D4.doorCol.on = slide < 0.5;
    cranks.forEach((cr) => {
      cr.spin = Math.max(0, cr.spin - dt);
      cr.wheel.rotation.x += dt * (cr.spin > 0 ? 9 : 0);
      cr.pend = Math.max(0, cr.pend - dt);
      cr.halo.material.opacity = 0.2 + (cr.pend > 0 ? 0.6 : 0) + Math.sin(t * 4 + cr.z) * 0.05;
    });
    // sweep bar
    const sz = L ? L.sweepZ : null;
    sweep.visible = x.stage === 3 && sz != null;
    if (sweep.visible) sweep.position.z = O.z + sz;
    const warn = L ? L.warn : 0;
    sweepWarn.material.opacity = x.stage === 3 ? warn * (0.25 + 0.25 * Math.sin(t * 20)) : 0;
    // the vault heart and the card
    if (x.stage >= 4) {
      heart.U.uForm.value = damp(heart.U.uForm.value, 1, 0.6, dt);
      heart.core.material.opacity = heart.U.uForm.value * 0.08;
      heart.U.uTime.value = t;
      heart.U.uPx.value = R.renderer.getPixelRatio() * 0.32;
      card.visible = ok > 0.7;
      card.rotation.y = t * 0.9;
      card.position.y = O.y + 2.4 + Math.sin(t * 2) * 0.12;
    } else card.visible = false;
    heart.group.visible = x.stage >= 4;
  };

  return {
    O,
    P,
    SUITS,
    SYM,
    SCOL,
    ROWS,
    LANES,
    SWEEP,
    openLane,
    build,
    update,
    steam,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get timer() {
      return timer;
    },
    safes,
    keys,
    cranks,
    rings,
    clues,
    targets,
    hide() {
      group.visible = false;
    },
    rel: K.rel,
    ringPos: (k) => (k === 'balcony' ? P(-10.6, 8.8, 33) : P(-6.4, 9, 49.5)),
    vents: () => steamVents,
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) return P(s * 2, 0, 3);
      if (stage === 2) return P(s * 2, 0, 47);
      if (stage === 3) return P(s * 3, 0, 92);
      return P(s * 2, 0, 126);
    },
    // where a grapple release lands: the platform under the nearest ring
    grappleLand(q) {
      return q.z < 42 ? P(-12, 5, 33) : P(-7.6, 5, 50);
    },
    nearSafe(q) {
      return SUITS.find((s) => {
        const f = safes[s].front;
        return Math.hypot(q.x - (f.x - O.x), q.z - (f.z - O.z)) < 1.5 && Math.abs(q.y - (f.y - O.y)) < 0.7;
      });
    },
    onBalcony: (q) => q.x < -10.4 && q.z > 28.8 && q.z < 37.2 && q.y > 4.6,
    onLedge: (q) => q.x > 10.8 && q.z > 29.4 && q.z < 36.6 && q.y > 2.6,
    inRoom1: (q) => q.z > 10.3 && q.z < 43.7,
    inLasers: (q) => q.z > 49.6 && q.z < 74.4 && Math.abs(q.x) < 6.1 && q.y < 2.4,
    laserHit(q, step) {
      if (q.y > 2.25 || Math.abs(q.x) > 6.1) return -1;
      for (let r = 0; r < ROWS.length; r++) {
        if (Math.abs(q.z - ROWS[r]) > 0.38) continue;
        const lane = Math.max(0, Math.min(2, Math.round((q.x + 4) / 4)));
        if (lane !== openLane(r, step)) return r;
      }
      return -1;
    },
    nearKey(q) {
      if (q.x < 6.6 || q.y > 1 || q.z < 76 || q.z > 86) return null;
      let best = null;
      let bd = 0.56;
      keys.forEach((k) => {
        const d = Math.abs(q.z - k.z);
        if (d < bd) {
          bd = d;
          best = k;
        }
      });
      return best;
    },
    nearLever: (q) => Math.hypot(q.x + 8.3, q.z - 74) < 1.8 && Math.abs(q.y - 5) < 0.7,
    nearCrank(q) {
      return cranks.find((c) => Math.hypot(q.x - c.x, q.z - c.z) < 1.9 && q.y < 1.2) || null;
    },
    sweepHit: (q, z) => z != null && Math.abs(q.z - z) < 0.42 && q.y < 0.55 && Math.abs(q.x) < 13,
    inRoom3: (q) => q.z > 88.4 && q.z < 131,
    nearCard: (q) => Math.hypot(q.x, q.z - 144) < 2.6 && q.y < 2.5,
  };
})();
