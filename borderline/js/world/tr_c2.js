// ♣ 4 · Le Téléphone: an old telephone exchange (brass, walnut, glowing valves) in three rooms.
// Room A « Le Cadran »: a glass booth where one player reads a turning drum, and a giant rotary
// dial the other one turns. Room B « Le Standard »: a switchboard where one player carries jack
// plugs while the other reads the connections from the operator's gallery. Room C « L'Appel »:
// two consoles back to back, roles flipping every call, then one button pressed together.
const TrC2 = (() => {
  const O = V3(-700, 0, 4200);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  const SYMS = ['♥', '♠', '♦', '♣'];
  const RED = (s) => s === '♥' || s === '♦';
  const L_NAMES = ['Café', 'Banc', 'Cinéma', 'Pluie', 'Étoiles', 'Danse'];
  // switchboard sockets on the east wall: names on the left half, numbers on the right half
  const SOCK_X = 13.05;
  const SOCK_Y = 1.45;
  const L_Z = [43.4, 45, 46.6, 48.2, 49.8, 51.4];
  const R_Z = [56.6, 58.2, 59.8, 61.4, 63, 64.6];
  // room C: each player has a console on their own side of the partition
  const SIDE = { dame: -1, valet: 1 };
  const C_PLATES_Z = [84.5, 86.5, 88.5, 90.5];

  let built = false;
  const M = {};
  const anim = { dial: 0, dialSym: 0, dialT: 1, alarm: 0, ring: 0, gates: [0, 0], phone: 0 };
  const panels = {};
  const cables = [];
  const plugs = [];
  const sockLamps = { L: [], R: [] };
  const progLamps = [];
  const ringLamps = [];
  let dial = null;
  let tubes = null;
  let tubeMat = null;
  let gateB = null;
  let gateC = null;
  let phone = null;
  let receiver = null;
  let card = null;
  let bell = null;
  const chandeliers = [];
  const plates = [];

  // ---------- helpers ----------
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.userData = { c, g };
    return t;
  };
  // a flat panel that redraws its canvas only when its key changes
  const panel = (w, h, res, bright = 0.82) => {
    const tex = canvasTex(res, Math.round((res * h) / w), () => {});
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    mat.color.setScalar(bright);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    let key = null;
    return {
      mesh,
      mat,
      draw(k, fn) {
        if (k === key) return;
        key = k;
        const { c, g } = tex.userData;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, c.width, c.height);
        fn(g, c.width, c.height);
        tex.needsUpdate = true;
      },
    };
  };
  const suitCol = (s, onDark = true) => (RED(s) ? '#e8344f' : onDark ? '#f3e7d6' : '#151015');
  const bezel = (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#120a0e');
    gr.addColorStop(1, '#070306');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.07;
    g.fillStyle = '#ffb060';
    for (let y = 0; y < H; y += 5) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
    g.strokeStyle = '#c9a24a';
    g.lineWidth = Math.max(4, W / 160);
    g.strokeRect(W * 0.015, H * 0.03, W * 0.97, H * 0.94);
  };
  const text = (g, s, x, y, px, col, font = 'Georgia, serif', italic = false) => {
    g.fillStyle = col;
    g.font = `${italic ? 'italic ' : ''}${px}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    Icons.fillText(g, s, x, y);
  };
  const glyph = (g, s, x, y, size, col) => {
    g.fillStyle = col;
    Icons.draw(g, Icons.of(s), x, y, size);
  };
  const heartPath = (g, cx, cy, k) => {
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const s = Math.sin(t);
      const x = 16 * s * s * s;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      if (i) g.lineTo(cx + x * k, cy - y * k);
      else g.moveTo(cx + x * k, cy - y * k);
    }
    g.closePath();
  };
  const lathe = (pts, mat, seg = 40) =>
    new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  const glowMat = (c, k) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
    return m;
  };
  const bulb = (c = '#ffcf8a', k = 1.6, r = 0.09) =>
    new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), glowMat(c, k));

  // ---------- painted surfaces (2048 px tiles, UVs scaled to the real size of each face) ----------
  const tile = (draw, period, res = 2048) => {
    const t = canvasTex(res, res, draw);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.encoding = THREE.LinearEncoding;
    return { t, period };
  };
  const rnd = rng(22);
  // walnut grain: long wavy fibres, darker growth lines, a few knots
  const grain = (g, W, H, base, dark, light) => {
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
      const y0 = rnd() * H;
      const amp = 4 + rnd() * 14;
      const f = 0.002 + rnd() * 0.004;
      const ph = rnd() * 6;
      g.strokeStyle = rnd() < 0.5 ? dark : light;
      g.globalAlpha = 0.05 + rnd() * 0.16;
      g.lineWidth = 1 + rnd() * 3.5;
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 16) {
        const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.3;
        if (x < 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      // wrap vertically so the tile repeats
      g.save();
      g.translate(0, y0 > H / 2 ? -H : H);
      g.stroke();
      g.restore();
    }
    g.globalAlpha = 1;
  };
  const woodTile = (base, dark, light) =>
    tile((g, W, H) => grain(g, W, H, base, dark, light), 1.6);
  // a carved panel of boiserie: frame, bevel, inner field, brass pin
  const panelTile = () =>
    tile((g, W, H) => {
      grain(g, W, H, '#5a2e18', '#2a1208', '#8a5230');
      const m = W * 0.1;
      // bevel shading around the inner field
      g.strokeStyle = 'rgba(0,0,0,.45)';
      g.lineWidth = W * 0.018;
      g.strokeRect(m, m, W - 2 * m, H - 2 * m);
      g.strokeStyle = 'rgba(255,210,160,.18)';
      g.lineWidth = W * 0.008;
      g.strokeRect(m + W * 0.02, m + W * 0.02, W - 2 * m - W * 0.04, H - 2 * m - W * 0.04);
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = W * 0.006;
      g.strokeRect(m + W * 0.05, m + W * 0.05, W - 2 * m - W * 0.1, H - 2 * m - W * 0.1);
      const gr = g.createRadialGradient(W / 2, H / 2, W * 0.05, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(255,200,150,.08)');
      gr.addColorStop(1, 'rgba(0,0,0,.18)');
      g.fillStyle = gr;
      g.fillRect(m, m, W - 2 * m, H - 2 * m);
      // seams between panels
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(0, 0, W, W * 0.006);
      g.fillRect(0, 0, W * 0.006, H);
    }, 1.4);
  // damask wallpaper: burgundy with tone-on-tone clubs and hearts, thin gold stripes
  const damaskTile = () =>
    tile((g, W, H) => {
      g.fillStyle = '#3e1424';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 4000; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,200,200'},${rnd() * 0.04})`;
        g.fillRect(rnd() * W, rnd() * H, 3, 3);
      }
      g.globalAlpha = 0.22;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          const x = (col + (row % 2) * 0.5) * (W / 4);
          const y = row * (H / 4) + H / 8;
          const s = row % 2 ? '♥' : '♣';
          [0, -W, W].forEach((dx) => glyph(g, s, x + dx + W / 8, y, W * 0.11, '#a0485e'));
        }
      g.globalAlpha = 0.35;
      g.fillStyle = '#d4ab55';
      for (let k = 0; k < 4; k++) g.fillRect(k * (W / 4), 0, W * 0.004, H);
      g.globalAlpha = 1;
    }, 2.4);
  // the hall floor: big marble squares, cream and oxblood, veined, with brass joints
  const floorTile = () =>
    tile((g, W, H) => {
      const half = W / 2;
      [
        [0, 0, '#a8987f'],
        [half, half, '#a8987f'],
        [half, 0, '#2e1418'],
        [0, half, '#2e1418'],
      ].forEach(([x, y, c]) => {
        g.fillStyle = c;
        g.fillRect(x, y, half, half);
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = c === '#a8987f' ? 'rgba(90,70,60,.25)' : 'rgba(230,190,170,.18)';
          g.lineWidth = 1 + rnd() * 3;
          g.beginPath();
          let px = x + rnd() * half;
          let py = y;
          g.moveTo(px, py);
          while (py < y + half) {
            px += (rnd() - 0.5) * 60;
            py += 20 + rnd() * 40;
            g.lineTo(Math.max(x, Math.min(x + half, px)), Math.min(y + half, py));
          }
          g.stroke();
        }
      });
      g.fillStyle = '#b48a3c';
      g.fillRect(0, 0, W, W * 0.006);
      g.fillRect(0, half, W, W * 0.006);
      g.fillRect(0, 0, W * 0.006, H);
      g.fillRect(half, 0, W * 0.006, H);
    }, 3.2);
  // the carpet runner: red velvet, gold borders, small woven hearts (u across, v along)
  const carpetTile = () =>
    tile((g, W, H) => {
      g.fillStyle = '#5c0f1e';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,140,150'},${rnd() * 0.06})`;
        g.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
      g.fillStyle = '#c99a45';
      g.fillRect(W * 0.04, 0, W * 0.035, H);
      g.fillRect(W * 0.925, 0, W * 0.035, H);
      g.fillStyle = '#3a0812';
      g.fillRect(W * 0.1, 0, W * 0.012, H);
      g.fillRect(W * 0.888, 0, W * 0.012, H);
      g.globalAlpha = 0.5;
      for (let k = 0; k < 4; k++) {
        heartPath(g, W / 2, (k + 0.5) * (H / 4), W * 0.006);
        g.fillStyle = '#b8344c';
        g.fill();
      }
      g.globalAlpha = 1;
    }, 3.2);

  // BoxGeometry with UVs in metres / period, so a painted tile keeps its size on any box
  const uvBox = (sx, sy, sz, period) => {
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
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / period, (uv.getY(i) * dims[f][1]) / period);
      }
    return geo;
  };
  // after building: every box using a painted material gets real-size UVs
  const fixUV = () =>
    group.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.userData || !o.material.userData.period) return;
      const p = o.geometry.parameters;
      const per = o.material.userData.period;
      if (!p) return;
      if (o.geometry.type === 'BoxGeometry') o.geometry = uvBox(p.width, p.height, p.depth, per);
      if (o.geometry.type === 'PlaneGeometry' && !o.geometry.userData.uvFixed) {
        const uv = o.geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * p.width) / per, (uv.getY(i) * p.height) / per);
        o.geometry.userData.uvFixed = true;
      }
    });
  const paintedMat = (tl, opt = {}) => {
    const m = new THREE.MeshStandardMaterial({
      map: tl.t,
      color: opt.color || '#ffffff',
      roughness: opt.rough != null ? opt.rough : 0.55,
      metalness: 0.02,
    });
    m.userData.period = tl.period;
    return m;
  };

  // ---------- materials ----------
  const mats = () => {
    M.marble = paintedMat(floorTile(), { rough: 0.25, color: '#9a8e86' });
    M.marbleDark = Tex.mat('marble', { color: '#3a2a32', scale: 2.5, rough: 0.3 });
    const walnut = woodTile('#6a3a1e', '#2e1408', '#9a6038');
    const ebony = woodTile('#3a1c0e', '#140602', '#5e3420');
    M.wood = paintedMat(walnut, { rough: 0.45, color: '#8a7266' });
    M.woodDark = paintedMat(ebony, { rough: 0.5, color: '#8a7266' });
    M.panel = paintedMat(panelTile(), { rough: 0.45, color: '#8a7266' });
    M.plaster = paintedMat(damaskTile(), { rough: 0.85, color: '#6e5a62' });
    M.fabric = paintedMat(carpetTile(), { rough: 0.95, color: '#7a6466' });
    M.brass = Tex.mat('metal', {
      color: '#d4ab55',
      scale: 1,
      rough: 0.3,
      metal: 0.55,
      emissive: '#3a2708',
      emissiveIntensity: 0.55,
    });
    M.copper = Tex.mat('metal', {
      color: '#c46a3c',
      scale: 1,
      rough: 0.35,
      metal: 0.5,
      emissive: '#2a1006',
      emissiveIntensity: 0.5,
    });
    M.bakelite = new THREE.MeshStandardMaterial({ color: '#1a1114', roughness: 0.22, metalness: 0.1 });
    M.ivory = new THREE.MeshStandardMaterial({ color: '#efe3cf', roughness: 0.35 });
    M.glass = new THREE.MeshStandardMaterial({
      color: '#cfeaff',
      transparent: true,
      opacity: 0.14,
      roughness: 0.05,
      metalness: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    M.frost = new THREE.MeshStandardMaterial({
      color: '#d8e6f0',
      transparent: true,
      opacity: 0.55,
      roughness: 0.9,
      depthWrite: false,
    });
    M.cable = new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.6 });
    M.cableRed = new THREE.MeshStandardMaterial({ color: '#7a1424', roughness: 0.55 });
  };

  // ---------- architecture ----------
  const hall = () => {
    // floor: marble with a red carpet runner, bands of dark marble at each room
    K.solid(0, -0.5, 50, 28, 1, 109, M.marble);
    const runner = new THREE.PlaneGeometry(3.2, 104).rotateX(-Math.PI / 2);
    const ru = runner.attributes.uv;
    for (let i = 0; i < ru.count; i++) ru.setY(i, ru.getY(i) * (104 / 3.2));
    const rm = new THREE.Mesh(runner, M.fabric.clone());
    rm.material.userData = {};
    rm.position.copy(P(0, 0.011, 50));
    group.add(rm);
    [10, 38, 70].forEach((z) => K.deco(new THREE.BoxGeometry(28, 0.02, 1.2), M.marbleDark, 0, 0.012, z));
    // outer walls (colliders) + walnut wainscot and brass rail (decor)
    K.solid(-14.5, 5, 50, 1, 10, 109, M.plaster);
    K.solid(14.5, 5, 50, 1, 10, 109, M.plaster);
    K.solid(0, 5, -4.5, 30, 10, 1, M.plaster);
    K.solid(0, 5, 104.5, 30, 10, 1, M.plaster);
    [-1, 1].forEach((s) => {
      K.deco(new THREE.BoxGeometry(0.12, 2.8, 108), M.panel, s * 13.94, 1.4, 50);
      K.deco(new THREE.BoxGeometry(0.16, 0.12, 108), M.brass, s * 13.9, 2.86, 50);
      K.deco(new THREE.BoxGeometry(0.16, 0.22, 108), M.woodDark, s * 13.9, 0.11, 50);
      // pilasters every 6 m
      for (let z = -1; z < 104; z += 6) {
        K.deco(new THREE.BoxGeometry(0.4, 9.4, 0.9), M.woodDark, s * 13.8, 4.7, z);
        K.deco(new THREE.BoxGeometry(0.5, 0.3, 1.1), M.brass, s * 13.75, 9.25, z);
      }
    });
    [-4, 104].forEach((z) => K.deco(new THREE.BoxGeometry(28, 2.8, 0.12), M.panel, 0, 1.4, z + (z < 0 ? 0.56 : -0.56)));
    // partitions with a doorway (x -2..2) and a lintel
    [38, 70].forEach((z) => {
      K.solid(-8, 5, z, 12, 10, 0.8, M.plaster);
      K.solid(8, 5, z, 12, 10, 0.8, M.plaster);
      K.solid(0, 7.25, z, 4, 5.5, 0.8, M.plaster);
      [-1, 1].forEach((s) => {
        K.deco(new THREE.BoxGeometry(0.5, 4.6, 1.0), M.brass, s * 2.25, 2.3, z);
        K.deco(new THREE.BoxGeometry(12, 2.8, 0.1), M.panel, s * 8, 1.4, z - 0.45);
        K.deco(new THREE.BoxGeometry(12, 2.8, 0.1), M.panel, s * 8, 1.4, z + 0.45);
      });
      K.deco(new THREE.BoxGeometry(5, 0.5, 1.0), M.brass, 0, 4.55, z);
    });
    // foyer arch
    [-1, 1].forEach((s) => K.solid(s * 2.4, 2.4, 10, 0.6, 4.8, 0.6, M.brass));
    K.deco(new THREE.BoxGeometry(5.4, 0.5, 0.7), M.brass, 0, 5, 10);
    // coffered ceiling over A, B and the foyer; room C keeps an oculus
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(28, 74).rotateX(Math.PI / 2), M.woodDark);
    ceil.position.copy(P(0, 10, 33));
    group.add(ceil);
    for (let z = -2; z < 70; z += 4)
      K.deco(new THREE.BoxGeometry(28, 0.35, 0.3), M.wood, 0, 9.82, z);
    for (let x = -12; x <= 12; x += 4)
      K.deco(new THREE.BoxGeometry(0.3, 0.35, 72), M.wood, x, 9.82, 34);
    const ring = new THREE.Mesh(new THREE.RingGeometry(9, 22, 64, 1).rotateX(Math.PI / 2), M.woodDark);
    ring.position.copy(P(0, 10, 88));
    group.add(ring);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.25, 10, 80).rotateX(Math.PI / 2), M.brass);
    rim.position.copy(P(0, 10, 88));
    group.add(rim);
    // room C walls go up to the oculus ring
    K.deco(new THREE.BoxGeometry(28, 1, 0.8), M.plaster, 0, 10.5, 70);
  };

  // glowing valve racks along the walls (one instanced mesh)
  const valves = () => {
    const spots = [];
    [
      [-1, 14, 34],
      [1, 14, 22],
      [-1, 42, 44],
      [-1, 64, 68],
      [1, 74, 80],
      [-1, 74, 80],
      [1, 96, 102],
      [-1, 96, 102],
    ].forEach(([s, z0, z1]) => {
      for (let z = z0; z < z1; z += 0.55)
        for (let row = 0; row < 3; row++) spots.push([s * 13.55, 3.5 + row * 0.75, z]);
      // rack frame
      const len = z1 - z0;
      K.deco(new THREE.BoxGeometry(0.5, 2.4, len + 0.4), M.woodDark, s * 13.7, 4.25, (z0 + z1) / 2);
      for (let row = 0; row < 3; row++)
        K.deco(new THREE.BoxGeometry(0.55, 0.08, len + 0.4), M.brass, s * 13.55, 3.18 + row * 0.75, (z0 + z1) / 2);
    });
    const geo = new THREE.CylinderGeometry(0.11, 0.13, 0.46, 12);
    tubeMat = glowMat('#ffa04a', 0.95);
    tubes = new THREE.InstancedMesh(geo, tubeMat, spots.length);
    const m = new THREE.Matrix4();
    spots.forEach(([x, y, z], i) => {
      m.makeTranslation(O.x + x, O.y + y, O.z + z);
      tubes.setMatrixAt(i, m);
    });
    group.add(tubes);
    // glass shells over the filaments
    const shell = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.17, 12, 10).scale(1, 1.7, 1),
      M.glass,
      spots.length,
    );
    spots.forEach(([x, y, z], i) => {
      m.makeTranslation(O.x + x, O.y + y + 0.05, O.z + z);
      shell.setMatrixAt(i, m);
    });
    group.add(shell);
  };

  const chandelier = (x, z, y = 8.2) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.06, 10, 48).rotateX(Math.PI / 2), M.brass);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 10, 40).rotateX(Math.PI / 2), M.brass);
    ring2.position.y = 0.55;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), M.brass);
    stem.position.y = 1.2;
    g.add(ring1, ring2, stem);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const b = bulb('#ffd9a0', 1.5, 0.1);
      b.position.set(Math.cos(a) * 1.4, 0.14, Math.sin(a) * 1.4);
      g.add(b);
      if (i % 2 === 0) {
        const b2 = bulb('#ffd9a0', 1.5, 0.08);
        b2.position.set(Math.cos(a + 0.26) * 0.8, 0.66, Math.sin(a + 0.26) * 0.8);
        g.add(b2);
      }
    }
    group.add(g);
    const l = LvKit.light(group, P(x, y - 0.6, z), '#ffcf9a', 1.5, 24);
    chandeliers.push({ g, l, base: 1.5 });
  };

  // decorative cables slung between the pilasters, high up
  const swag = (a, b, sag, mat = M.cable, r = 0.035) => {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push(a.clone().lerp(b, t).add(V3(0, -sag * 4 * t * (1 - t), 0)));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 6), mat);
    group.add(m);
    return m;
  };

  const sign = (txt, sub, w, h, x, y, z, rotY = 0) => {
    const p = panel(w, h, 2048, 0.8);
    p.draw('s', (g, W, H) => {
      g.fillStyle = '#1a0c10';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#d4ab55';
      g.lineWidth = H * 0.04;
      g.strokeRect(H * 0.06, H * 0.06, W - H * 0.12, H - H * 0.12);
      g.lineWidth = H * 0.012;
      g.strokeRect(H * 0.12, H * 0.12, W - H * 0.24, H - H * 0.24);
      text(g, txt, W / 2, sub ? H * 0.42 : H / 2, H * 0.36, '#f0d79a', 'Georgia, serif', true);
      if (sub) text(g, sub, W / 2, H * 0.75, H * 0.13, '#c9a0a8', '"IBM Plex Mono", monospace');
    });
    p.mesh.position.copy(P(x, y, z));
    p.mesh.rotation.y = rotY;
    group.add(p.mesh);
    return p;
  };

  // floor plate with a suit (or any label): the player stands on it and presses E
  const plateTex = {};
  const plateTexOf = (lab) =>
    plateTex[lab] ||
    (plateTex[lab] = canvasTex(512, 512, (g, W) => {
      const gr = g.createRadialGradient(W / 2, W / 2, 10, W / 2, W / 2, W / 2);
      gr.addColorStop(0, '#3a2210');
      gr.addColorStop(1, '#1a0e08');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, W);
      g.strokeStyle = '#d4ab55';
      g.lineWidth = 18;
      g.beginPath();
      g.arc(W / 2, W / 2, W / 2 - 16, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath();
      g.arc(W / 2, W / 2, W / 2 - 44, 0, Math.PI * 2);
      g.stroke();
      if (SYMS.includes(lab)) glyph(g, lab, W / 2, W / 2, 250, suitCol(lab));
      else text(g, lab, W / 2, W / 2, 120, '#f0d79a', 'Georgia, serif', true);
    }));
  const plate = (id, lab, x, z, y = 0) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.08, 40), M.brass);
    base.position.y = 0.04;
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.66, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: plateTexOf(lab), roughness: 0.45, emissive: '#ffffff', emissiveMap: plateTexOf(lab), emissiveIntensity: 0.1 }),
    );
    face.position.y = 0.085;
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.86, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(1.2), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
    );
    halo.position.y = 0.09;
    g.add(base, face, halo);
    group.add(g);
    const p = { id, lab, pos: P(x, y, z), rel: V3(x, y, z), g, face, halo, press: 0 };
    plates.push(p);
    return p;
  };

  // ---------- room A · Le Cadran ----------
  const roomA = () => {
    // the booth (west side): walnut frame, glass, a small roof with a lantern
    const bx = -8.5;
    const bz = 24;
    const posts = [
      [-1.3, -1.3],
      [-1.3, 1.3],
      [1.3, -1.3],
      [1.3, 1.3],
    ];
    posts.forEach(([dx, dz]) => K.solid(bx + dx, 1.45, bz + dz, 0.16, 2.9, 0.16, M.woodDark));
    // glass back and sides (colliders), door side faces the room (+x)
    K.solid(bx - 1.3, 1.45, bz, 0.06, 2.9, 2.5, M.glass);
    K.solid(bx, 1.45, bz - 1.3, 2.5, 2.9, 0.06, M.glass);
    K.solid(bx, 1.45, bz + 1.3, 2.5, 2.9, 0.06, M.glass);
    [-1.3, 1.3].forEach((dz) => K.deco(new THREE.BoxGeometry(2.6, 0.9, 0.08), M.wood, bx, 0.45, bz + dz));
    K.deco(new THREE.BoxGeometry(0.08, 0.9, 2.6), M.wood, bx - 1.3, 0.45, bz);
    K.solid(bx, 3.0, bz, 2.9, 0.2, 2.9, M.woodDark);
    const crown = sign('CABINE', '', 2.2, 0.45, bx + 1.42, 2.62, bz, Math.PI / 2);
    crown.mesh.material.color.setScalar(0.75);
    const lamp = bulb('#ffd9a0', 1.4, 0.16);
    lamp.position.copy(P(bx, 3.3, bz));
    group.add(lamp);
    K.deco(new THREE.BoxGeometry(2.6, 0.04, 2.6), M.fabric, bx, 0.03, bz);
    // wall phone inside the booth
    K.deco(new THREE.BoxGeometry(0.35, 0.5, 0.2), M.bakelite, bx - 0.55, 1.4, bz - 1.16);
    const rcv = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), M.bakelite);
    rcv.position.copy(P(bx - 0.55, 1.45, bz - 1.02));
    group.add(rcv);
    // the reading drum: a panel on the back glass, drawn only for the reader
    panels.drum = panel(2.2, 1.3, 1536, 0.84);
    panels.drum.mesh.position.copy(P(bx - 1.24, 2.0, bz));
    panels.drum.mesh.rotation.y = Math.PI / 2;
    group.add(panels.drum.mesh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 2.35), M.brass);
    frame.position.copy(P(bx - 1.3, 2.0, bz));
    group.add(frame);

    // the giant rotary dial (east side), facing the booth
    const dx = 8.2;
    const dz = 24;
    K.solid(dx + 0.6, 0.6, dz, 1.6, 1.2, 3.4, M.woodDark);
    K.deco(new THREE.BoxGeometry(1.7, 0.1, 3.5), M.brass, dx + 0.6, 1.22, dz);
    K.solid(dx + 1.0, 3.0, dz, 0.6, 3.6, 3.6, M.wood);
    dial = new THREE.Group();
    dial.position.copy(P(dx + 0.62, 2.85, dz));
    dial.rotation.y = -Math.PI / 2;
    group.add(dial);
    // fixed face behind (with the four suits around) + rotating finger wheel in front
    const faceTex = canvasTex(1024, 1024, (g, W) => {
      g.fillStyle = '#f2e6d2';
      g.beginPath();
      g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#8a6a2a';
      g.lineWidth = 10;
      g.stroke();
      SYMS.forEach((s, i) => {
        const a = -Math.PI / 2 + ((i + 0.5) / 5) * Math.PI * 1.6 - Math.PI * 0.3;
        glyph(g, s, W / 2 + Math.cos(a) * W * 0.36, W / 2 + Math.sin(a) * W * 0.36, 120, suitCol(s, false));
      });
      heartPath(g, W / 2, W / 2 + 10, 7);
      g.fillStyle = '#e8344f';
      g.fill();
    });
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 64),
      new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.4, emissive: '#ffffff', emissiveMap: faceTex, emissiveIntensity: 0.18 }),
    );
    dial.add(face);
    const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.09, 12, 72), M.brass);
    dial.add(bezelRing);
    const wheel = new THREE.Group();
    wheel.position.z = 0.08;
    dial.add(wheel);
    // the finger wheel: black lacquer with real holes, the suits of the face show through
    const wheelTex = canvasTex(1024, 1024, (g, Wd) => {
      const gr = g.createRadialGradient(Wd / 2, Wd / 2, Wd * 0.2, Wd / 2, Wd / 2, Wd / 2);
      gr.addColorStop(0, '#2a1a20');
      gr.addColorStop(1, '#0e080a');
      g.fillStyle = gr;
      g.fillRect(0, 0, Wd, Wd);
      g.globalCompositeOperation = 'destination-out';
      SYMS.forEach((sy, i) => {
        const a = -Math.PI / 2 + ((i + 0.5) / 5) * Math.PI * 1.6 - Math.PI * 0.3;
        const x = Math.cos(a) * 1.04;
        const y = -Math.sin(a) * 1.04;
        g.beginPath();
        g.arc(((x / 1.42 + 1) / 2) * Wd, (1 - (y / 1.42 + 1) / 2) * Wd, (0.19 / 1.42 / 2) * Wd * 2, 0, Math.PI * 2);
        g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    });
    const disc = new THREE.Mesh(new THREE.RingGeometry(0.62, 1.42, 64), new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.18, metalness: 0.2, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    wheel.add(disc);
    SYMS.forEach((s, i) => {
      const a = -Math.PI / 2 + ((i + 0.5) / 5) * Math.PI * 1.6 - Math.PI * 0.3;
      const hole = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 28), M.brass);
      hole.position.set(Math.cos(a) * 1.04, -Math.sin(a) * 1.04, 0.02);
      wheel.add(hole);
    });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 40).rotateX(Math.PI / 2), M.brass);
    hub.position.z = 0.06;
    wheel.add(hub);
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.12), M.brass);
    stop.position.set(1.2, -0.75, 0.12);
    stop.rotation.z = 0.9;
    dial.add(stop);
    dial.userData.wheel = wheel;
    // progress lamps above the dial (both players see them)
    for (let i = 0; i < 5; i++) {
      const b = bulb('#3a2a20', 1, 0.13);
      b.position.copy(P(dx + 0.62, 4.75, dz - 1.2 + i * 0.6));
      group.add(b);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16), M.brass);
      cap.position.copy(P(dx + 0.62, 4.92, dz - 1.2 + i * 0.6));
      group.add(cap);
      progLamps.push(b);
    }
    panels.dialSign = panel(2.6, 0.55, 1536, 0.8);
    panels.dialSign.mesh.position.copy(P(dx + 0.68, 5.55, dz));
    panels.dialSign.mesh.rotation.y = -Math.PI / 2;
    group.add(panels.dialSign.mesh);
    // the four plates in front of the dial
    SYMS.forEach((s, i) => plate('dial' + i, s, dx - 2.4, dz - 2.4 + i * 1.6));
    // the brass bell over the gate: rings on success, clangs on mistakes
    bell = new THREE.Group();
    const cup = lathe(
      [
        [0.02, 0.6],
        [0.25, 0.58],
        [0.38, 0.4],
        [0.44, 0.1],
        [0.6, 0],
        [0.58, -0.04],
        [0.02, -0.04],
      ],
      M.brass,
    );
    bell.add(cup);
    bell.position.copy(P(0, 6.4, 37.2));
    group.add(bell);
    chandelier(0, 18);
    chandelier(0, 30);
    sign('LE CADRAN', 'Salle 1 · Composez ce que l’autre lit', 6, 1.4, 0, 7.4, 37.5, Math.PI);
  };

  // ---------- room B · Le Standard ----------
  const roomB = () => {
    // the switchboard cabinet along the east wall
    K.solid(13.55, 2.3, 54, 0.9, 4.6, 24.5, M.woodDark);
    K.deco(new THREE.BoxGeometry(0.06, 3.4, 24), M.wood, SOCK_X + 0.06, 2.2, 54);
    K.deco(new THREE.BoxGeometry(0.5, 0.12, 24.6), M.brass, 13.25, 4.62, 54);
    K.deco(new THREE.BoxGeometry(0.9, 0.9, 24.5), M.wood, 12.9, 0.45, 54);
    K.collider(12.9, 0.45, 54, 0.9, 0.9, 24.5);
    K.deco(new THREE.BoxGeometry(1.0, 0.06, 24.6), M.brass, 12.88, 0.92, 54);
    // label strip
    panels.board = panel(24, 0.9, 4096, 0.8);
    panels.board.mesh.position.copy(P(SOCK_X, 4.15, 54));
    panels.board.mesh.rotation.y = -Math.PI / 2;
    group.add(panels.board.mesh);
    panels.board.draw('b', (g, W, H) => {
      g.fillStyle = '#1a0c10';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#d4ab55';
      g.lineWidth = 8;
      g.strokeRect(8, 8, W - 16, H - 16);
      const zx = (z) => ((z - 42) / 24) * W;
      text(g, 'LIGNES', zx(47.4), H / 2, 80, '#f0d79a', '"IBM Plex Mono", monospace');
      text(g, 'Standard des Veilleurs  ♣  2', zx(54), H / 2, 96, '#f0d79a', 'Georgia, serif', true);
      text(g, 'NUMÉROS', zx(60.6), H / 2, 80, '#f0d79a', '"IBM Plex Mono", monospace');
    });
    const socket = (z, kind, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 10, 28).rotateY(Math.PI / 2), M.brass);
      ring.position.copy(P(SOCK_X - 0.02, SOCK_Y, z));
      group.add(ring);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20).rotateY(-Math.PI / 2), M.bakelite);
      hole.position.copy(P(SOCK_X - 0.03, SOCK_Y, z));
      group.add(hole);
      const lamp = bulb('#3a2a20', 1, 0.09);
      lamp.position.copy(P(SOCK_X - 0.06, 2.35, z));
      group.add(lamp);
      sockLamps[kind][i] = lamp;
    };
    // the field of little call lamps and brass jack rows above the sockets (decor, dimly lit)
    const field = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), glowMat('#ffb060', 0.55), 6 * 40);
    const fm = new THREE.Matrix4();
    let fi = 0;
    for (let row = 0; row < 6; row++)
      for (let k = 0; k < 40; k++) {
        fm.makeTranslation(O.x + SOCK_X - 0.04, O.y + 2.7 + row * 0.08 * 1.5, O.z + 42.6 + k * 0.6);
        field.setMatrixAt(fi++, fm);
      }
    group.add(field);
    [2.55, 3.65].forEach((y) => K.deco(new THREE.BoxGeometry(0.08, 0.06, 24), M.brass, SOCK_X - 0.02, y, 54));
    [42.1, 54, 65.9].forEach((z) => K.deco(new THREE.BoxGeometry(0.1, 3.5, 0.12), M.brass, SOCK_X - 0.03, 2.2, z));
    const labTex = (lab) =>
      canvasTex(512, 192, (g, W, H) => {
        g.fillStyle = '#efe3cf';
        g.fillRect(0, 0, W, H);
        g.strokeStyle = '#8a6a2a';
        g.lineWidth = 10;
        g.strokeRect(5, 5, W - 10, H - 10);
        text(g, lab, W / 2, H / 2 + 4, lab.length > 2 ? 92 : 130, '#2a1810', 'Georgia, serif', true);
      });
    const label = (z, lab) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34).rotateY(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: labTex(lab), roughness: 0.6, emissive: '#ffffff', emissiveMap: labTex(lab), emissiveIntensity: 0.25 }));
      m.position.copy(P(SOCK_X - 0.03, 1.95, z));
      group.add(m);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.98), M.brass);
      fr.position.copy(P(SOCK_X - 0.01, 1.95, z));
      group.add(fr);
    };
    L_Z.forEach((z, i) => label(z, L_NAMES[i]));
    R_Z.forEach((z, j) => label(z, String(j + 1)));
    L_Z.forEach((z, i) => socket(z, 'L', i));
    R_Z.forEach((z, j) => socket(z, 'R', j));
    // six cords: plug + instanced cable segments
    const segGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2);
    L_Z.forEach((z, i) => {
      const segs = new THREE.InstancedMesh(segGeo, i % 2 ? M.cableRed : M.cable, 24);
      segs.frustumCulled = false;
      group.add(segs);
      const plug = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.22, 12).rotateZ(Math.PI / 2), M.bakelite);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8).rotateZ(Math.PI / 2), M.brass);
      tip.position.x = 0.17;
      plug.add(body, tip);
      group.add(plug);
      cables.push({ segs, plug, a: V3(), b: V3(), tmp: V3() });
      plugs.push(plug);
    });
    // the operator's gallery (west), with stairs: the reader's post
    K.solid(-11, 1.2, 54, 6, 2.4, 16, M.woodDark);
    K.deco(new THREE.BoxGeometry(6.1, 0.08, 16.1), M.fabric, -11, 2.44, 54);
    for (let i = 0; i < 6; i++) K.solid(-11, 0.2 * (i + 1), 40.8 + i * 0.95, 2.8, 0.4 * (i + 1), 0.95, M.wood);
    // rails: front edge (x = -8) and back of the stairs side, gap at the stair landing
    K.solid(-7.95, 2.95, 54, 0.1, 1.1, 16, M.brass);
    K.solid(-11, 2.95, 62, 6, 1.1, 0.1, M.brass);
    K.solid(-8.8, 2.95, 46, 1.6, 1.1, 0.1, M.brass);
    K.solid(-13.2, 2.95, 46, 1.6, 1.1, 0.1, M.brass);
    // the desk with the hidden list
    K.solid(-12.4, 2.85, 55, 1.2, 0.9, 3.6, M.wood);
    K.deco(new THREE.BoxGeometry(1.3, 0.06, 3.7), M.brass, -12.4, 3.31, 55);
    panels.list = panel(2.6, 1.5, 2048, 0.84);
    panels.list.mesh.position.copy(P(-13.05, 4.3, 55));
    panels.list.mesh.rotation.y = Math.PI / 2;
    group.add(panels.list.mesh);
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 2.8), M.brass);
    lf.position.copy(P(-13.1, 4.3, 55));
    group.add(lf);
    // an old operator chair and lamp, for life
    const lampG = lathe(
      [
        [0.02, 0],
        [0.18, 0],
        [0.06, 0.05],
        [0.03, 0.55],
        [0.22, 0.62],
        [0.28, 0.82],
        [0.02, 0.84],
      ],
      M.brass,
    );
    lampG.position.copy(P(-12.4, 3.32, 53.6));
    group.add(lampG);
    const lb = bulb('#ffe0a8', 1.5, 0.08);
    lb.position.copy(P(-12.4, 4.05, 53.6));
    group.add(lb);
    LvKit.light(group, P(-11.5, 4.2, 54.5), '#ffcf9a', 1.2, 10);
    chandelier(0, 46);
    chandelier(0, 62);
    sign('LE STANDARD', 'Salle 2 · Branchez les bonnes lignes', 6, 1.4, 0, 7.4, 69.5, Math.PI);
    // overhead swags
    for (let z = 41; z < 68; z += 6) swag(P(-13.6, 8.6, z), P(13.6, 8.6, z + 3), 1.6);
  };

  // ---------- room C · L'Appel ----------
  const roomC = () => {
    // partition between the two consoles (opaque): from z 78 to 99
    K.solid(0, 2.6, 88.5, 0.8, 5.2, 21, M.woodDark);
    K.deco(new THREE.BoxGeometry(0.9, 0.2, 21.1), M.brass, 0, 5.25, 88.5);
    [-1, 1].forEach((s) => {
      K.deco(new THREE.BoxGeometry(0.06, 2.8, 21), M.wood, s * 0.43, 1.4, 88.5);
      for (let z = 79; z < 99; z += 3) K.deco(new THREE.BoxGeometry(0.1, 5.2, 0.25), M.brass, s * 0.44, 2.6, z);
    });
    // the giant candlestick telephone standing on the partition, seen by both
    phone = new THREE.Group();
    phone.position.copy(P(0, 5.3, 90));
    group.add(phone);
    const base = lathe(
      [
        [0.01, 0],
        [1.5, 0],
        [1.55, 0.12],
        [1.3, 0.35],
        [0.5, 0.55],
        [0.32, 0.8],
        [0.01, 0.8],
      ],
      M.bakelite,
      48,
    );
    phone.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 4.2, 24), M.brass);
    stem.position.y = 2.9;
    phone.add(stem);
    const mouth = lathe(
      [
        [0.01, 0],
        [0.45, 0],
        [0.7, 0.35],
        [0.75, 0.55],
        [0.01, 0.55],
      ],
      M.bakelite,
      36,
    );
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.set(0, 5.1, 0.25);
    phone.add(mouth);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), M.brass);
    head.position.y = 5.05;
    phone.add(head);
    // hook + receiver (lifts at the end)
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), M.brass);
    hook.position.set(0.4, 4.2, 0);
    phone.add(hook);
    receiver = new THREE.Group();
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 20), M.bakelite);
    const re1 = lathe(
      [
        [0.01, 0],
        [0.42, 0.02],
        [0.36, 0.3],
        [0.01, 0.3],
      ],
      M.bakelite,
    );
    re1.position.y = -0.95;
    re1.rotation.x = Math.PI;
    rb.add(re1);
    receiver.add(rb);
    receiver.position.set(0.75, 3.6, 0);
    phone.add(receiver);
    // the heart dial on the base, and a ring of lamps around the stem (progress, both sides)
    const hdTex = canvasTex(1024, 1024, (g, W) => {
      g.fillStyle = '#f2e6d2';
      g.beginPath();
      g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
      g.fill();
      heartPath(g, W / 2, W / 2 + 20, 18);
      g.fillStyle = '#e8344f';
      g.fill();
      SYMS.forEach((s, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
        glyph(g, s, W / 2 + Math.cos(a) * W * 0.38, W / 2 + Math.sin(a) * W * 0.38, 110, suitCol(s, false));
      });
    });
    [-1, 1].forEach((s) => {
      const hd = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshStandardMaterial({ map: hdTex, roughness: 0.4, emissive: '#ffffff', emissiveMap: hdTex, emissiveIntensity: 0.2 }));
      hd.position.set(s * 0.95, 0.42, 0);
      hd.rotation.y = (s * Math.PI) / 2;
      hd.rotation.x = 0;
      phone.add(hd);
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const b = bulb('#3a2a20', 1, 0.14);
      b.position.set(Math.cos(a) * 0.45, 1.6, Math.sin(a) * 0.45);
      phone.add(b);
      ringLamps.push(b);
    }
    // consoles on each side
    ['dame', 'valet'].forEach((who) => {
      const s = SIDE[who];
      const cx = s * 9.5;
      K.solid(cx, 0.65, 87.5, 1.4, 1.3, 7.6, M.woodDark);
      K.deco(new THREE.BoxGeometry(1.5, 0.08, 7.7), M.brass, cx, 1.32, 87.5);
      K.solid(cx + s * 0.45, 2.2, 87.5, 0.5, 1.8, 7.6, M.wood);
      const pn = panel(3.6, 1.6, 2048, 0.84);
      pn.mesh.position.copy(P(cx + s * 0.18, 2.35, 87.5));
      pn.mesh.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(pn.mesh);
      panels['c_' + who] = pn;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.75, 3.75), M.brass);
      fr.position.copy(P(cx + s * 0.27, 2.35, 87.5));
      group.add(fr);
      SYMS.forEach((sym, i) => plate('c' + who[0] + i, sym, s * 6.2, C_PLATES_Z[i]));
      plate('go_' + who, '♥', s * 4.2, 96.5);
      // the big red push lever beside the « ensemble » plate
      const lever = new THREE.Group();
      lever.position.copy(P(s * 4.2, 0, 98.2));
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.0, 20), M.brass);
      ped.position.y = 0.5;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshStandardMaterial({ color: '#d0203a', roughness: 0.3, emissive: '#5a0010', emissiveIntensity: 0.7 }));
      knob.position.y = 1.15;
      lever.add(ped, knob);
      lever.userData.knob = knob;
      group.add(lever);
      K.collider(s * 4.2, 0.5, 98.2, 0.7, 1.0, 0.7);
      anim['lever_' + who] = lever;
    });
    // columns around the room
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = Math.cos(a) * 12.2;
      const z = 88 + Math.sin(a) * 13;
      if (z < 72 || z > 103.5 || Math.abs(x) > 13.3) continue;
      K.solid(x, 5.5, z, 0.9, 11, 0.9, M.marbleDark);
      K.deco(new THREE.BoxGeometry(1.2, 0.4, 1.2), M.brass, x, 0.2, z);
      K.deco(new THREE.BoxGeometry(1.2, 0.4, 1.2), M.brass, x, 10.8, z);
    }
    LvKit.light(group, P(-7, 6, 88), '#ffcf9a', 1.6, 18);
    LvKit.light(group, P(7, 6, 88), '#ffcf9a', 1.6, 18);
    LvKit.light(group, P(0, 9, 100), '#ff9ac0', 1.4, 16);
    // the card, behind the end of the partition
    card = LvKit.trialCard('c2', false);
    card.position.copy(P(0, 2.2, 101.4));
    group.add(card);
    sign('L’APPEL', 'Salle 3 · Chacun son tour, puis ensemble', 6, 1.4, 0, 7.4, 70.5, 0);
  };

  const foyer = () => {
    panels.title = sign('Le Téléphone', 'Central téléphonique des Veilleurs · ' + Cards.tagOf('c2'), 9, 2.2, 0, 6.5, -3.9, 0);
    chandelier(0, 3, 7.8);
    // benches and potted palms for the foyer
    [-1, 1].forEach((s) => {
      K.solid(s * 10, 0.25, 3, 1.2, 0.5, 4, M.wood);
      K.deco(new THREE.BoxGeometry(0.15, 0.9, 4), M.woodDark, s * 10.6, 0.7, 3);
      const pot = lathe(
        [
          [0.01, 0],
          [0.4, 0],
          [0.5, 0.7],
          [0.55, 0.75],
          [0.01, 0.75],
        ],
        M.brass,
      );
      pot.position.copy(P(s * 11.5, 0, -2.4));
      group.add(pot);
      for (let k = 0; k < 7; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4, 6), new THREE.MeshStandardMaterial({ color: '#2f6a3a', roughness: 0.7 }));
        leaf.position.copy(P(s * 11.5 + Math.cos(k) * 0.3, 1.4, -2.4 + Math.sin(k) * 0.3));
        leaf.rotation.set(Math.cos(k * 2) * 0.6, 0, Math.sin(k * 2) * 0.6);
        group.add(leaf);
      }
      K.collider(s * 11.5, 0.6, -2.4, 1.1, 1.2, 1.1);
    });
  };

  // gates between the rooms: a brass grille that slides up into the lintel
  const gate = (z) => {
    const g = new THREE.Group();
    g.position.copy(P(0, 0, z));
    for (let i = 0; i < 9; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.4, 8), M.brass);
      bar.position.set(-1.8 + i * 0.45, 2.2, 0);
      g.add(bar);
    }
    [0.6, 2.2, 3.8].forEach((y) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 0.08), M.brass);
      rail.position.y = y;
      g.add(rail);
    });
    const hb = new THREE.Mesh(new THREE.ShapeGeometry((() => {
      const sh = new THREE.Shape();
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const s = Math.sin(t);
        const x = 16 * s * s * s * 0.025;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.025;
        if (i) sh.lineTo(x, y);
        else sh.moveTo(x, y);
      }
      return sh;
    })()), glowMat('#ff5f8a', 1.1));
    hb.position.set(0, 2.2, 0.06);
    g.add(hb);
    group.add(g);
    const col = K.collider(0, 2.2, z, 4, 4.4, 0.4);
    return { g, col, y: 0 };
  };

  // inlaid floor medallions: the voyage heart in room C, a club in the foyer
  const medallion = (x, z, r, heart) => {
    const t = canvasTex(2048, 2048, (g, W) => {
      const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      gr.addColorStop(0, '#2a1420');
      gr.addColorStop(1, '#120810');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#d4ab55';
      [0.49, 0.46, 0.33].forEach((k, i) => {
        g.lineWidth = i === 1 ? 6 : 18;
        g.beginPath();
        g.arc(W / 2, W / 2, W * k, 0, Math.PI * 2);
        g.stroke();
      });
      SYMS.forEach((sy, i) => {
        for (let k = 0; k < 3; k++) {
          const a = ((i * 3 + k) / 12) * Math.PI * 2 - Math.PI / 2;
          glyph(g, sy, W / 2 + Math.cos(a) * W * 0.395, W / 2 + Math.sin(a) * W * 0.395, 120, suitCol(sy));
        }
      });
      if (heart) Heart.paint(g, W / 2, W / 2, W * 0.5, { fill: 1, t: 2 });
      else glyph(g, '♣', W / 2, W / 2, W * 0.42, '#f0d79a');
    });
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 72).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.15, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.12 }),
    );
    m.position.copy(P(x, 0.016, z));
    group.add(m);
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    mats();
    hall();
    valves();
    foyer();
    roomA();
    roomB();
    roomC();
    medallion(0, 75.5, 2.6, true);
    medallion(0, 4.5, 2.2, false);
    fixUV();
    gateB = gate(38);
    gateC = gate(70);
  };

  // ---------- per-frame visuals ----------
  const lampOn = (b, on, col = '#ffcf8a', k = 1.8) => {
    const want = on ? 1 : 0;
    if (b.userData.on === want && b.userData.col === col) return;
    b.userData.on = want;
    b.userData.col = col;
    b.material.color.set(on ? col : '#3a2a20').multiplyScalar(on ? k : 1);
  };

  const curve = (cb, a, b, sag) => {
    const { segs, tmp } = cb;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = V3(0, 0, 1);
    const p0 = V3();
    const p1 = V3();
    const dir = V3();
    const n = 24;
    const at = (t, out) => out.copy(a).lerp(b, t).add(tmp.set(0, -sag * 4 * t * (1 - t), 0));
    for (let i = 0; i < n; i++) {
      at(i / n, p0);
      at((i + 1) / n, p1);
      dir.subVectors(p1, p0);
      const len = dir.length() || 0.001;
      q.setFromUnitVectors(up, dir.normalize());
      m4.compose(p0, q, V3(1, 1, len));
      segs.setMatrixAt(i, m4);
    }
    segs.instanceMatrix.needsUpdate = true;
  };

  // how far the finger wheel turns for a hole to reach the finger stop (clockwise)
  const HOLE_A = (i) => -(-Math.PI / 2 + ((i + 0.5) / 5) * Math.PI * 1.6 - Math.PI * 0.3);
  const STOP_A = Math.atan2(-0.75, 1.2);
  const SYM_ANGLE = (i) => {
    let a = HOLE_A(i) - STOP_A;
    while (a < 0.4) a += Math.PI * 2;
    return a;
  };

  return {
    O,
    P,
    SYMS,
    L_NAMES,
    SIDE,
    C_PLATES_Z,
    group,
    plates,
    panels,
    build,
    get built() {
      return built;
    },
    rel: (p, out = V3()) => out.set(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(round, who) {
      const s = who === 'dame' ? -1 : 1;
      if (round <= 1) return P(s * 2, 0, 3);
      if (round === 2) return P(s * 2, 0, 41.5);
      return P(s * 2, 0, 73.5);
    },
    // who stands where
    inBooth: (q) => Math.abs(q.x + 8.5) < 1.15 && Math.abs(q.z - 24) < 1.15 && q.y < 1,
    onGallery: (q) => q.x < -8.1 && q.x > -13.9 && q.z > 46 && q.z < 62 && q.y > 2.2,
    side: (q) => (q.x < 0 ? 'dame' : 'valet'),
    nearCard: (q) => Math.hypot(q.x, q.z - 101.4) < 2.6,
    plateAt(q) {
      for (const p of plates) {
        if (Math.hypot(q.x - p.rel.x, q.z - p.rel.z) < 0.85 && Math.abs(q.y - p.rel.y) < 0.6) return p;
      }
      return null;
    },
    // switchboard: nearest socket within reach
    socketAt(q) {
      if (q.x < SOCK_X - 2.1 || q.y > 1.2) return null;
      let best = null;
      let bd = 1.05;
      L_Z.forEach((z, i) => {
        const d = Math.abs(q.z - z);
        if (d < bd) {
          bd = d;
          best = { kind: 'L', i };
        }
      });
      R_Z.forEach((z, i) => {
        const d = Math.abs(q.z - z);
        if (d < bd) {
          bd = d;
          best = { kind: 'R', i };
        }
      });
      return best;
    },
    sockPos: (kind, i) => P(SOCK_X - 0.12, SOCK_Y, (kind === 'L' ? L_Z : R_Z)[i]),
    events: {
      dial(symIdx) {
        anim.dialSym = symIdx;
        anim.dialT = 0;
        Sound.play('tile');
      },
      alarm() {
        anim.alarm = 1.4;
        Sound.play('caught');
        Sound.play('trap');
        const zr = anim.room === 2 ? 54 : anim.room >= 3 ? 88 : 24;
        Fx.burst(P(0, 6.2, anim.room === 2 ? 69.4 : anim.room === 3 ? 103.6 : 37.2), '#ff3a4a', 70, 4, 0.9, -3);
        // the valves puff steam on both walls
        [-1, 1].forEach((sx) => Fx.burst(P(sx * 13.2, 4.6, zr), '#e8dcd6', 50, 2.2, 1.4, 1.2));
      },
      ring(where) {
        anim.ring = 1.6;
        Sound.play('chime');
        Sound.play('rune', true);
        if (where) Fx.hearts(where);
      },
    },
    update(dt, t, st) {
      if (!built) return;
      anim.room = st.round;
      // valves breathe; chandeliers sway a little
      tubeMat.color.setRGB(1, 0.55, 0.22).multiplyScalar(0.92 + Math.sin(t * 3.1) * 0.05 + Math.sin(t * 17) * 0.02);
      chandeliers.forEach((c, i) => {
        c.g.rotation.y = Math.sin(t * 0.3 + i) * 0.08;
        c.l.intensity = c.base * (anim.alarm > 0 ? 0.6 + Math.random() * 0.6 : 1);
      });
      // the dial: run to the finger stop and come back
      anim.dialT = Math.min(1, anim.dialT + dt * 0.9);
      const tgt = SYM_ANGLE(anim.dialSym);
      const k = anim.dialT < 0.45 ? Math.sin((anim.dialT / 0.45) * Math.PI * 0.5) : 1 - (anim.dialT - 0.45) / 0.55;
      dial.userData.wheel.rotation.z = -tgt * Math.max(0, k);
      // bell
      anim.alarm = Math.max(0, anim.alarm - dt);
      anim.ring = Math.max(0, anim.ring - dt);
      bell.rotation.z = Math.sin(t * 40) * 0.25 * (anim.alarm + anim.ring * 0.6);
      bell.position.z = O.z + (st.round === 2 ? 69.2 : st.round >= 3 ? 103.6 : 37.2);
      // gates
      [
        [gateB, st.round >= 2],
        [gateC, st.round >= 3],
      ].forEach(([g, open]) => {
        g.y = damp(g.y, open ? 4.6 : 0, 2.2, dt);
        g.g.position.y = O.y + g.y;
        g.col.on = g.y < 3;
      });
      // plates highlight under the local player is done by the level (halo opacity)
      plates.forEach((p) => {
        p.press = Math.max(0, p.press - dt * 2.5);
        p.g.position.y = O.y + p.rel.y - p.press * 0.05;
      });
      // receiver lifts and the card descends at the end
      anim.phone = damp(anim.phone, st.round >= 4 ? 1 : 0, 1.5, dt);
      receiver.position.y = 3.6 + anim.phone * 2.6;
      receiver.rotation.z = anim.phone * 0.8 + (st.round >= 4 ? Math.sin(t * 3) * 0.05 : 0);
      if (st.round >= 3 && st.round < 4) receiver.rotation.x = st.ringing ? Math.sin(t * 50) * 0.04 : 0;
      card.visible = st.round >= 4;
      card.rotation.y = t * 1.4;
      card.position.y = O.y + 2.2 + Math.sin(t * 2) * 0.15;
    },
    lamps(st, role) {
      // room A progress
      const r1 = st.r1 || {};
      for (let i = 0; i < 5; i++) {
        const len = (r1.seq || []).length;
        lampOn(progLamps[i], i < (r1.prog || 0), '#7cf0a8', 1.8);
        progLamps[i].visible = i < Math.max(len, 1);
      }
      // switchboard lamps: lit when something is plugged
      const conn = (st.r2 && st.r2.conn) || {};
      const used = new Set(Object.values(conn));
      for (let i = 0; i < 6; i++) {
        lampOn(sockLamps.L[i], conn[i] != null, '#ffcf8a', 1.8);
        lampOn(sockLamps.R[i], used.has(i), '#ffcf8a', 1.8);
      }
      // ring around the phone: sub-calls done in room C
      const r3 = st.r3 || {};
      for (let i = 0; i < 8; i++) {
        const lit = st.round >= 4 || i < (r3.sub || 0) * 2 + Math.min(2, Math.floor((r3.prog || 0) / Math.max(1, (r3.seq || [1]).length) * 2));
        lampOn(ringLamps[i], lit, st.round >= 4 ? '#ff5f8a' : '#7cf0a8', 1.8);
      }
      ['dame', 'valet'].forEach((w) => {
        const kb = anim['lever_' + w].userData.knob;
        const pressed = r3.pressT && r3.pressT[w] > 0;
        kb.position.y = pressed ? 1.02 : 1.15;
      });
    },
    // cables follow the state: resting, held by someone, or plugged
    cables(st, role, localHand, remoteHand) {
      const r2 = st.r2 || { conn: {} };
      const conn = r2.conn || {};
      const hold = r2.hold;
      cables.forEach((cb, i) => {
        const a = P(SOCK_X - 0.12, SOCK_Y - 0.35, L_Z[i]);
        let b;
        let sag;
        if (hold && hold.l === i) {
          b = hold.who === role ? localHand : remoteHand;
          sag = 0.3 + a.distanceTo(b) * 0.06;
        } else if (conn[i] != null) {
          b = P(SOCK_X - 0.12, SOCK_Y, R_Z[conn[i]]);
          sag = 0.35 + a.distanceTo(b) * 0.05;
        } else {
          b = P(SOCK_X - 0.12, SOCK_Y, L_Z[i]);
          sag = 0.18;
        }
        curve(cb, a, b, sag);
        cb.plug.position.copy(b);
        if (hold && hold.l === i) cb.plug.rotation.set(0, Math.PI / 2, 0.6);
        else cb.plug.rotation.set(0, 0, 0);
      });
    },
    cardPos: () => P(0, 2.2, 101.4),
    phonePos: () => P(0, 8, 90),
  };
})();
