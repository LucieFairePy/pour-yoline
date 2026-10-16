// ♠ 6 · La Tour. The inside of a colossal clock tower, 74 m of climb in four stages:
//  1. Les engrenages: three rings of cog discs orbit the hall and a great arm sweeps across it;
//     while a brake lever is held the cogs crawl and the arm stops, so one brakes, one climbs.
//  2. Le monte-charge: a lift rises up the shaft only while its crank is held; pawns climb over
//     the rim, the other player defends; halfway the crank changes hands.
//  3. Les courants: updraft columns between wall walkways. Only the grapple kit sees when the
//     wind blows; the double-jump kit rides them on call. Cards fall from the dark, telegraphed.
//  4. Le sommet: open sky, the Sentinelle de la Tour, then the card under the bell.
// Only geometry, visuals and pure helpers here; Enemies/Combat are used from the level file.
const TrS4 = (() => {
  const O = V3(700, 0, 5600);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- layout ----------
  const RW = 16; // inner wall radius
  const TOP = 74; // summit floor
  const RINGS = [
    { y: 2.4, r: 11, n: 4, dir: 1, off: 0 },
    { y: 4.8, r: 7, n: 3, dir: -1, off: 0.5 },
    { y: 7.2, r: 11, n: 4, dir: 1, off: 1.1 },
  ];
  const DISC_R = 2.1;
  const ARM = { y: 6.1, r0: 1.4, r1: 15.4 };
  const LEVERS = {
    f: V3(-13.4, 0, 0),
    m: V3(14.9, 9.6, 2.1),
  };
  const LIFT = { y0: 12, half: 27, y1: 42, r: 4.4 };
  // updraft columns: centre, bottom, cap
  const COLS = [
    { x: 0, z: 10.8, y0: 42, y1: 51.6, ph: 0 },
    { x: -10.8, z: 0, y0: 50, y1: 59.6, ph: 2.2 },
    { x: 0, z: -10.8, y0: 58, y1: 67.6, ph: 4.4 },
  ];
  const COL_R = 1.9;
  const CYCLE = 6.6;
  const ON = 3.0;
  const deg = (a) => (a * Math.PI) / 180;
  // dame grapple rings and where each one sets her down. The first two hang inside the walkways'
  // inner edge (never above a walkway, or the pull would slam her into its underside); the last
  // one hangs in the opening the third updraft rises through
  const RINGS_G = [
    { p: [10 * Math.cos(deg(112)), 54.2, 10 * Math.sin(deg(112))], land: [14.3 * Math.cos(deg(112)), 50, 14.3 * Math.sin(deg(112))] },
    { p: [10 * Math.cos(deg(204)), 62.2, 10 * Math.sin(deg(204))], land: [14.3 * Math.cos(deg(204)), 58, 14.3 * Math.sin(deg(204))] },
    { p: [0, 70.6, -10.8], land: [3.2, 66, -12.4] },
  ];

  // ---------- materials ----------
  const M = {};
  const mats = () => {
    M.wall = Tex.mat('stone', { color: '#5a4f68', scale: 3.2, rough: 0.9 });
    // a material of its own for the inside of the shell (BackSide); clone() would drop the
    // triplanar shader hook
    M.wallIn = Tex.mat('stone', { color: '#5a4f68', scale: 3.21, rough: 0.92 });
    M.wallIn.side = THREE.BackSide;
    M.wallOut = Tex.mat('brick', { color: '#6f5a66', scale: 3.5, rough: 0.9 });
    M.floor = Tex.mat('marble', { color: '#352e40', scale: 4, rough: 0.6 });
    M.walk = Tex.mat('wood', { color: '#5c3c28', scale: 2.2, rough: 0.8 });
    M.stone = Tex.mat('stone', { color: '#6a6078', scale: 2.4 });
    M.dark = Tex.mat('stone', { color: '#3d3448', scale: 2.4 });
    M.cobble = Tex.mat('cobble', { color: '#5e566e', scale: 2.6, rough: 0.85 });
    // thin parts (chains, rails, rods): a plain material, a triplanar texture only sparkles on them
    M.rod = new THREE.MeshStandardMaterial({ color: '#4d465c', metalness: 0.4, roughness: 0.5, emissive: '#120c18' });
    M.iron = Tex.mat('metal', { color: '#5f596c', scale: 1.4, metal: 0.55, rough: 0.55 });
    M.bronze = new THREE.MeshStandardMaterial({
      color: '#a7743c',
      metalness: 0.45,
      roughness: 0.38,
      emissive: '#3a2008',
      emissiveIntensity: 0.3,
    });
    // no env map here: full metal renders black, so gold stays half metal with a warm glow
    M.gold = new THREE.MeshStandardMaterial({
      color: '#c9a24a',
      metalness: 0.5,
      roughness: 0.32,
      emissive: '#5a3c12',
      emissiveIntensity: 0.25,
    });
    M.glass = new THREE.MeshStandardMaterial({
      color: '#d8c8ff',
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      emissive: '#3a2a66',
      emissiveIntensity: 0.4,
      depthWrite: false,
    });
    // cloud sea (wider than the sky dome, so its edge is never seen)
    M.cloud = new THREE.MeshBasicMaterial({
      color: '#a88cc0',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      fog: false,
    });
  };
  const glow = (c, k = 1.4) => LvKit.glow(c, k);

  // ---------- geometry helpers ----------
  // A flat slab filled by `inside(x, z)`: the visual is a Shape, the colliders are row strips
  // computed from the same predicate (0.5 m rows, 0.2 m steps), so what you see is what holds you.
  const rows = (ytop, th, x0, x1, z0, z1, inside, mat, opt = {}) => {
    const step = 0.2;
    const dz = 0.5;
    const boxes = [];
    for (let z = z0 + dz / 2; z < z1; z += dz) {
      let start = null;
      for (let x = x0; x <= x1 + 1e-6; x += step) {
        const ins = x <= x1 && inside(x, z);
        if (ins && start === null) start = x;
        if (!ins && start !== null) {
          const a = start - step / 2;
          const b = x - step / 2;
          boxes.push(K.collider((a + b) / 2, ytop - th / 2, z, b - a, th, dz, opt));
          start = null;
        }
      }
    }
    return boxes;
  };
  const sectorShape = (r0, r1, a0, a1, holes = []) => {
    const s = new THREE.Shape();
    const n = Math.max(8, Math.ceil(((a1 - a0) / Math.PI) * 48));
    const pt = (r, a) => [r * Math.cos(a), -r * Math.sin(a)];
    for (let i = 0; i <= n; i++) {
      const [x, y] = pt(r1, a0 + ((a1 - a0) * i) / n);
      if (i) s.lineTo(x, y);
      else s.moveTo(x, y);
    }
    for (let i = n; i >= 0; i--) {
      const [x, y] = pt(r0, a0 + ((a1 - a0) * i) / n);
      s.lineTo(x, y);
    }
    holes.forEach((h) => s.holes.push(h));
    return s;
  };
  const circlePath = (cx, cz, r) => {
    const p = new THREE.Path();
    p.absarc(cx, -cz, r, 0, Math.PI * 2, true);
    return p;
  };
  const slabFrom = (shape, ytop, th, mat) => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: th,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 1,
      curveSegments: 48,
    }).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(P(0, ytop - th, 0));
    group.add(m);
    return m;
  };
  const angOf = (x, z) => {
    let a = Math.atan2(z, x);
    if (a < 0) a += Math.PI * 2;
    return a;
  };
  const inSector = (x, z, r0, r1, a0, a1) => {
    const r = Math.hypot(x, z);
    if (r < r0 || r > r1) return false;
    let a = angOf(x, z);
    let lo = a0;
    let hi = a1;
    while (hi > Math.PI * 2 && a < lo) a += Math.PI * 2;
    return a >= lo && a <= hi;
  };
  // a cog wheel lying flat, top face at y = 0
  const cogGeo = (R, teeth, depth, th) => {
    const s = new THREE.Shape();
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = i % 4;
      const r = k === 1 || k === 2 ? R : R - depth;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      if (i) s.lineTo(x, y);
      else s.moveTo(x, y);
    }
    const hub = new THREE.Path();
    hub.absarc(0, 0, R * 0.18, 0, Math.PI * 2, true);
    s.holes.push(hub);
    return new THREE.ExtrudeGeometry(s, {
      depth: th,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 1,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, -th, 0);
  };
  // the voyage heart curve as a flat outline (for windows and decals)
  const heartShape = (k) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const [x, y] = Heart.curve((i / 96) * Math.PI * 2);
      if (i) s.lineTo(x * k, (y - 2.5) * k);
      else s.moveTo(x * k, (y - 2.5) * k);
    }
    return s;
  };

  // canvas textures (all >= 1080 px)
  const dialTex = () =>
    LvKit.tex(1024, 1024, (g, w) => {
      const c = w / 2;
      const gr = g.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, '#f4e7cf');
      gr.addColorStop(0.85, '#d9c39a');
      gr.addColorStop(1, '#8a6a3a');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(c, c, c - 4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#3a2a1a';
      g.lineWidth = 14;
      g.beginPath();
      g.arc(c, c, c - 30, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 4;
      g.beginPath();
      g.arc(c, c, c - 120, 0, Math.PI * 2);
      g.stroke();
      const suits = ['♠', '♥', '♦', '♣'];
      g.fillStyle = '#2a1c12';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r0 = c - 40;
        const r1 = c - (i % 5 ? 62 : 96);
        g.lineWidth = i % 5 ? 4 : 10;
        g.beginPath();
        g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
        g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
        g.stroke();
      }
      const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      g.font = 'bold 74px Georgia, serif';
      roman.forEach((t, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        g.fillText(t, c + Math.cos(a) * (c - 170), c + Math.sin(a) * (c - 170));
      });
      g.font = '120px Georgia, serif';
      suits.forEach((s, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
        g.fillStyle = i % 2 ? '#b31a33' : '#1a1210';
        Icons.fillText(g, s, c + Math.cos(a) * (c - 300), c + Math.sin(a) * (c - 300));
      });
      g.fillStyle = '#b31a33';
      g.font = 'italic 64px Georgia, serif';
      g.fillText('Borderline', c, c + 150);
    });
  const bannerTex = (suit, col) =>
    LvKit.tex(512, 1280, (g, w, h) => {
      LvKit.grain(g, w, h, '#2a1426', 0.08, 6000);
      g.fillStyle = col;
      g.globalAlpha = 0.85;
      g.fillRect(24, 0, w - 48, 30);
      g.globalAlpha = 1;
      g.strokeStyle = '#c9a24a';
      g.lineWidth = 10;
      g.strokeRect(36, 50, w - 72, h - 220);
      g.beginPath();
      g.moveTo(0, h - 160);
      g.lineTo(w / 2, h);
      g.lineTo(w, h - 160);
      g.stroke();
      g.fillStyle = col;
      Icons.draw(g, Icons.of(suit), w / 2, h * 0.42, 300);
      g.fillStyle = '#c9a24a';
      g.font = 'bold 96px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('4', w / 2, h * 0.7);
    });

  // ---------- state for the moving parts ----------
  const discs = []; // { ring, k, mesh, box, x, z }
  let arm = null;
  const levers = {};
  let lift = null;
  const liftBoxes = [];
  const rimBoxes = [];
  let crank = null;
  const rimPosts = [];
  let gate = null;
  let gateBox = null;
  const columns = [];
  const ringMeshes = [];
  const wallCogs = [];
  let pendulum = null;
  let screen = null;
  let screen2 = null;
  let screen3 = null;
  let card = null;
  let cardHeart = null;
  let bell = null;
  let rose = null;
  const lanterns = [];
  const falling = [];
  let cloudSea = null;
  const driftCards = [];
  let liftLight = null;

  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) return;
    Phys.owner('tr_s4');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    group.visible = true;
    mats();

    // ---- the tower shell ----
    const wallIn = new THREE.Mesh(
      new THREE.CylinderGeometry(RW, RW, TOP + 2, 72, 8, true),
      M.wallIn,
    );
    wallIn.material = M.wallIn;
    wallIn.position.copy(P(0, TOP / 2, 0));
    group.add(wallIn);
    const wallOut = new THREE.Mesh(
      new THREE.CylinderGeometry(17.4, 18.2, TOP + 40, 72, 1, true),
      M.wallOut,
    );
    wallOut.position.copy(P(0, TOP - (TOP + 40) / 2, 0));
    group.add(wallOut);
    // wall colliders: strips of the ring 16..17.6, full height
    rows(TOP + 1.3, TOP + 3, -17.8, 17.8, -17.8, 17.8, (x, z) => {
      const r = Math.hypot(x, z);
      return r >= RW && r <= 17.6;
    }, null);
    // stone courses and buttresses on the inside wall
    const course = new THREE.TorusGeometry(RW - 0.05, 0.16, 6, 96).rotateX(Math.PI / 2);
    for (let y = 3; y < TOP; y += 6) {
      const m = new THREE.Mesh(course, M.dark);
      m.position.copy(P(0, y, 0));
      group.add(m);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, TOP, 1.1), M.dark);
      m.position.copy(P(Math.cos(a) * (RW - 0.25), TOP / 2, Math.sin(a) * (RW - 0.25)));
      m.rotation.y = -a;
      group.add(m);
    }
    // narrow windows with moonlight
    const slitMat = glow('#9fb8ff', 0.7);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.3;
      const y = 8 + (i % 6) * 11;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.2), slitMat);
      m.position.copy(P(Math.cos(a) * (RW - 0.02), y, Math.sin(a) * (RW - 0.02)));
      m.lookAt(P(0, y, 0));
      group.add(m);
    }

    // ---- stage 1: the hall ----
    rows(0, 1, -16.4, 16.4, -16.4, 16.4, (x, z) => Math.hypot(x, z) < RW + 0.4, null);
    slabFrom(sectorShape(0, RW + 0.4, 0, Math.PI * 2), 0, 1, M.floor);
    // mosaic: the heart of the voyage in gold at the centre of the floor
    const inlay = new THREE.Mesh(
      new THREE.ShapeGeometry(heartShape(0.16), 48).rotateX(-Math.PI / 2),
      glow('#c9a24a', 0.55),
    );
    inlay.position.copy(P(0, 0.02, 0));
    group.add(inlay);
    const rimInlay = new THREE.Mesh(new THREE.RingGeometry(5.4, 5.6, 96).rotateX(-Math.PI / 2), glow('#c9a24a', 0.45));
    rimInlay.position.copy(P(0, 0.02, 0));
    group.add(rimInlay);
    // the great clock dial on the wall, facing the entrance
    const dial = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 96),
      new THREE.MeshStandardMaterial({ map: dialTex(), roughness: 0.6, emissive: '#2a1a08', emissiveIntensity: 0.25 }),
    );
    dial.position.copy(P(0, 15.5, -RW + 0.12));
    group.add(dial);
    const dialRim = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.28, 10, 96), M.gold);
    dialRim.position.copy(dial.position);
    group.add(dialRim);
    const handGeo = (len, w) => new THREE.BoxGeometry(w, len, 0.08).translate(0, len / 2 - 0.3, 0);
    const hourHand = new THREE.Mesh(handGeo(3.1, 0.28), M.iron);
    const minHand = new THREE.Mesh(handGeo(4.4, 0.16), M.iron);
    hourHand.position.copy(dial.position).add(V3(0, 0, 0.12));
    minHand.position.copy(dial.position).add(V3(0, 0, 0.18));
    group.add(hourHand, minHand);
    wallCogs.push({ m: hourHand, s: -0.02, axis: 'z' }, { m: minHand, s: -0.24, axis: 'z' });

    // entrance arch (decorative; the doorway is sealed behind you)
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.35, 10, 32, Math.PI), M.stone);
    arch.position.copy(P(0, 3.4, RW - 0.3));
    group.add(arch);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.4), M.walk);
    door.position.copy(P(0, 1.7, RW - 0.32));
    door.rotation.y = Math.PI;
    group.add(door);

    // cog discs
    const cogG = cogGeo(DISC_R, 14, 0.28, 0.5);
    const hubG = new THREE.CylinderGeometry(0.42, 0.42, 0.62, 18);
    const spokeG = new THREE.BoxGeometry(DISC_R * 1.6, 0.08, 0.22);
    RINGS.forEach((ring, ri) => {
      for (let k = 0; k < ring.n; k++) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(cogG, ri === 1 ? M.bronze : M.iron);
        const hub = new THREE.Mesh(hubG, M.gold);
        hub.position.y = -0.2;
        const sp1 = new THREE.Mesh(spokeG, M.gold);
        sp1.position.y = 0.02;
        const sp2 = sp1.clone();
        sp2.rotation.y = Math.PI / 2;
        g.add(m, hub, sp1, sp2);
        // the cogs float, held by the Veilleurs' magnetism: a soft glow under each one
        const under = new THREE.Mesh(
          new THREE.CircleGeometry(DISC_R * 0.9, 32).rotateX(Math.PI / 2),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(ri === 1 ? '#ffcf8a' : '#b9a6ff').multiplyScalar(0.35),
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        under.position.y = -0.56;
        g.add(under);
        group.add(g);
        // a square and a cross: their union follows the round cog within ~0.15 m
        const boxes = [
          [3.0, 3.0],
          [4.0, 2.0],
          [2.0, 4.0],
        ].map(([hx, hz]) => ({ b: Phys.box(0, -100, 0, hx, 0.5, hz, { dyn: true }), hx: hx / 2, hz: hz / 2 }));
        discs.push({ ring: ri, k, g, boxes, x: 0, z: 0, px: 0, pz: 0 });
      }
    });
    // the sweeping arm: a giant clock hand
    arm = new THREE.Group();
    const armBar = new THREE.Mesh(new THREE.BoxGeometry(ARM.r1 - ARM.r0, 0.5, 0.6), M.iron);
    armBar.position.x = (ARM.r0 + ARM.r1) / 2;
    const armTip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 4).rotateZ(-Math.PI / 2), M.gold);
    armTip.position.x = ARM.r1 + 0.6;
    const armHub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.2, 24), M.gold);
    const armGlow = new THREE.Mesh(new THREE.BoxGeometry(ARM.r1 - ARM.r0, 0.06, 0.64), glow('#ff5f8a', 1.1));
    armGlow.position.set((ARM.r0 + ARM.r1) / 2, 0.28, 0);
    arm.add(armBar, armTip, armHub, armGlow);
    arm.position.copy(P(0, ARM.y, 0));
    arm.userData.glow = armGlow;
    group.add(arm);
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, ARM.y, 12), M.rod);
    pivot.position.copy(P(0, ARM.y / 2, 0));
    group.add(pivot);
    K.collider(0, (ARM.y + 0.6) / 2, 0, 1.7, ARM.y + 0.6, 1.7);

    // the balcony at mid height, and the steps up to the lift
    K.solid(14.2, 9.3, 0, 3.6, 0.6, 7.2, M.walk);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 7.2), M.gold);
    rail.position.copy(P(12.45, 10.1, -3.6 + 3.6));
    group.add(rail);
    for (let i = 0; i < 6; i++) {
      const top = 9.6 + 0.4 * (i + 1);
      const x0 = 12.4 - i * 0.8;
      K.solid(x0 - 0.4, (top + 9.0) / 2, 0, 0.8, top - 9.0, 2.6, M.stone);
    }
    K.solid(6.1, 11.75, 0, 3.0, 0.5, 2.6, M.walk);
    [-1.3, 1.3].forEach((z) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.08, 0.08), M.gold);
      r.position.copy(P(8.6, 12.9, z));
      group.add(r);
    });

    // brake levers
    Object.entries(LEVERS).forEach(([id, p]) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.8), M.iron);
      base.position.y = 0.25;
      const pivotL = new THREE.Group();
      pivotL.position.y = 0.5;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8).translate(0, 0.7, 0), M.gold);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), glow('#ff5f8a', 1.4));
      knob.position.y = 1.4;
      pivotL.add(stick, knob);
      pivotL.rotation.z = 0.6;
      const plate = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 40).rotateX(-Math.PI / 2), glow('#ff5f8a', 0.8));
      plate.position.y = 0.03;
      g.add(base, pivotL, plate);
      g.position.copy(P(p.x, p.y, p.z));
      group.add(g);
      K.collider(p.x, p.y + 0.25, p.z, 1.0, 0.5, 0.8);
      levers[id] = { g, pivot: pivotL, knob, plate, k: 0, pos: p };
    });

    // ---- stage 2: the lift ----
    lift = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(LIFT.r, LIFT.r - 0.2, 0.6, 64), M.walk);
    deck.position.y = -0.3;
    const deckRim = new THREE.Mesh(new THREE.TorusGeometry(LIFT.r, 0.12, 8, 96).rotateX(Math.PI / 2), M.gold);
    const under = new THREE.Mesh(cogGeo(LIFT.r - 0.1, 28, 0.25, 0.4), M.iron);
    under.position.y = -0.6;
    lift.add(deck, deckRim, under);
    // rim wall: low bronze parapet with an opening toward the bridge (+x), closed by a gate
    const rimMat = M.bronze;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const da = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(da) < 0.3) continue;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.7), rimMat);
      post.position.set(Math.cos(a) * (LIFT.r - 0.15), 0.47, Math.sin(a) * (LIFT.r - 0.15));
      post.rotation.y = -a;
      lift.add(post);
      rimPosts.push({ m: post, y: 0.47 });
    }
    const capRing = new THREE.Mesh(new THREE.TorusGeometry(LIFT.r - 0.15, 0.09, 6, 96, Math.PI * 2 - 0.6).rotateX(Math.PI / 2), M.gold);
    capRing.rotation.y = 0.3;
    capRing.position.y = 0.95;
    lift.add(capRing);
    rimPosts.push({ m: capRing, y: 0.95 });
    gate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.95, 2.6), M.gold);
    gate.position.set(LIFT.r - 0.15, -0.5, 0);
    lift.add(gate);
    // the crank: a wheel on a post at the centre
    crank = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.1, 12), M.iron);
    post.position.y = 0.55;
    const wheel = new THREE.Group();
    wheel.position.y = 1.15;
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 32).rotateX(Math.PI / 2), M.gold);
    wheel.add(wheelRim);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.06), M.gold);
      s.rotation.y = (i / 6) * Math.PI;
      wheel.add(s);
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), glow('#ffcf8a', 1.2));
    handle.position.set(0.62, 0.2, 0);
    wheel.add(handle);
    crank.add(post, wheel);
    crank.userData.wheel = wheel;
    lift.add(crank);
    lift.position.copy(P(0, LIFT.y0, 0));
    group.add(lift);
    liftLight = new THREE.PointLight('#ffc890', 1.4, 22, 2);
    liftLight.position.set(0, 3.2, 0);
    lift.add(liftLight);
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glow('#ffcf8a', 0.75));
    lantern.position.set(0, 3.2, 0);
    lift.add(lantern);
    const chainG = new THREE.CylinderGeometry(0.05, 0.05, 80, 6).translate(0, 40, 0);
    [-1, 1].forEach((s) => {
      const ch = new THREE.Mesh(chainG, M.rod);
      ch.position.set(s * 0.9, 1.2, 0);
      lift.add(ch);
    });
    // lift colliders (dynamic): a cross + square approximating the disc, and the rim walls
    [
      [8.8, 4.4],
      [4.4, 8.8],
      [6.2, 6.2],
    ].forEach(([sx, sz]) => liftBoxes.push({ b: Phys.box(0, -100, 0, sx, 0.6, sz, { dyn: true }), sx, sz }));
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const da = Math.atan2(Math.sin(a), Math.cos(a));
      rimBoxes.push({
        b: Phys.box(0, -100, 0, 0.7, 1.0, 0.7, { dyn: true }),
        x: Math.cos(a) * (LIFT.r - 0.15),
        z: Math.sin(a) * (LIFT.r - 0.15),
        gate: Math.abs(da) < 0.32,
      });
    }
    // halfway landing lamps around the shaft
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow('#ffcf8a', 1));
      l.position.copy(P(Math.cos(a) * (RW - 0.5), LIFT.half + 1, Math.sin(a) * (RW - 0.5)));
      group.add(l);
      lanterns.push(l);
    }
    // guide rails up the shaft (visual)
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.25, LIFT.y1 - LIFT.y0 + 2, 0.25), M.rod);
      r.position.copy(P(Math.cos(a + 0.4) * (LIFT.r + 0.5), (LIFT.y0 + LIFT.y1) / 2, Math.sin(a + 0.4) * (LIFT.r + 0.5)));
      group.add(r);
    });

    // ---- stage 3: floors, walkways, updrafts ----
    // L3a: the floor at 42 around the shaft
    rows(42, 0.8, -16.4, 16.4, -16.4, 16.4, (x, z) => {
      const r = Math.hypot(x, z);
      return r >= LIFT.r + 0.35 && r <= RW + 0.4;
    }, null);
    slabFrom(sectorShape(LIFT.r + 0.35, RW + 0.4, 0, Math.PI * 2), 42, 0.8, M.cobble);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(LIFT.r + 0.35, 0.1, 6, 96).rotateX(Math.PI / 2), M.gold);
    lip.position.copy(P(0, 42, 0));
    group.add(lip);
    // walkway S1 (y 50, 70°..182°) and S2 (y 58, 160°..272°), along the wall
    [
      [50, 70, 182],
      [58, 160, 272],
    ].forEach(([y, a0, a1]) => {
      const A0 = deg(a0);
      const A1 = deg(a1);
      rows(y, 0.5, -16.4, 16.4, -16.4, 16.4, (x, z) => inSector(x, z, 12.4, RW + 0.4, A0, A1), null);
      slabFrom(sectorShape(12.4, RW + 0.4, A0, A1), y, 0.5, M.walk);
      // corbels under the walkway
      for (let a = a0 + 6; a < a1; a += 12) {
        const ar = deg(a);
        const c = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.5), M.dark);
        c.position.copy(P(Math.cos(ar) * 14.9, y - 1.2, Math.sin(ar) * 14.9));
        c.rotation.y = -ar;
        group.add(c);
      }
      const edge = new THREE.Mesh(
        new THREE.TorusGeometry(12.4, 0.07, 6, 64, A1 - A0).rotateX(Math.PI / 2),
        M.gold,
      );
      edge.rotation.y = -A0;
      edge.position.copy(P(0, y, 0));
      group.add(edge);
    });
    // L3d: the floor at 66, with the shaft hole and the hole where the last updraft rises
    const c3 = COLS[2];
    const insideL3d = (x, z) => {
      const r = Math.hypot(x, z);
      if (r < LIFT.r + 0.35 || r > RW + 0.4) return false;
      if (Math.hypot(x - c3.x, z - c3.z) < COL_R + 0.5) return false;
      return true;
    };
    rows(66, 0.8, -16.4, 16.4, -16.4, 16.4, insideL3d, null);
    slabFrom(sectorShape(LIFT.r + 0.35, RW + 0.4, 0, Math.PI * 2, [circlePath(c3.x, c3.z, COL_R + 0.5)]), 66, 0.8, M.cobble);
    // updraft columns: rings at the bottom and top, wind particles (only the grapple kit sees
    // when they blow; see update)
    const partN = 260;
    // soft round flecks (plain points are hard squares)
    const windDot = LvKit.tex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    windDot.wrapS = windDot.wrapT = THREE.ClampToEdgeWrapping;
    COLS.forEach((cl, i) => {
      const baseRing = new THREE.Mesh(new THREE.RingGeometry(COL_R - 0.2, COL_R, 48).rotateX(-Math.PI / 2), glow('#9fdcff', 0.5));
      baseRing.position.copy(P(cl.x, cl.y0 + 0.04, cl.z));
      group.add(baseRing);
      // a grate under the floating columns, so the start of each one is readable
      if (i > 0) {
        const grate = new THREE.Mesh(new THREE.CylinderGeometry(COL_R, COL_R, 0.12, 32, 1, true), M.iron);
        grate.position.copy(P(cl.x, cl.y0, cl.z));
        group.add(grate);
      }
      // only the floor column has a fan grille; the others start in mid-air, marked by their ring
      if (i === 0) {
        const vent = new THREE.Mesh(cogGeo(COL_R + 0.3, 18, 0.2, 0.3), M.iron);
        vent.position.copy(P(cl.x, cl.y0 + 0.01, cl.z));
        group.add(vent);
      }
      const pos = new Float32Array(partN * 3);
      const seed = new Float32Array(partN);
      for (let k = 0; k < partN; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * COL_R;
        pos[k * 3] = Math.cos(a) * r;
        pos[k * 3 + 1] = Math.random() * (cl.y1 - cl.y0);
        pos[k * 3 + 2] = Math.sin(a) * r;
        seed[k] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: new THREE.Color('#bfe8ff'),
        map: windDot,
        size: 0.22,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      pts.position.copy(P(cl.x, cl.y0, cl.z));
      pts.frustumCulled = false;
      group.add(pts);
      // a faint sleeve both players always see (where, not when)
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(COL_R, COL_R, cl.y1 - cl.y0, 32, 1, true),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#9fdcff'),
          transparent: true,
          opacity: 0.04,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        }),
      );
      sleeve.position.copy(P(cl.x, (cl.y0 + cl.y1) / 2, cl.z));
      group.add(sleeve);
      columns.push({ cl, pts, pos, seed, sleeve, baseRing, k: 0 });
    });
    // grapple rings
    RINGS_G.forEach((g) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 10, 32), glow('#ff5f8a', 1.6));
      m.position.copy(P(...g.p));
      group.add(m);
      // hung from a chain to the ceiling of the floor above
      const len = (g.p[1] > 66 ? TOP - 0.8 : 65.2) - g.p[1] - 0.6;
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), M.rod);
      mount.position.copy(P(g.p[0], g.p[1] + 0.6 + len / 2, g.p[2]));
      group.add(mount);
      ringMeshes.push(m);
    });
    // the heart rose window at the height of the currents
    rose = new THREE.Mesh(
      new THREE.ShapeGeometry(heartShape(0.17), 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7aa6').multiplyScalar(0.7), toneMapped: false, side: THREE.DoubleSide }),
    );
    rose.position.copy(P(RW - 0.06, 55, 0));
    rose.rotation.y = -Math.PI / 2;
    group.add(rose);
    const roseFrame = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.22, 8, 48), M.gold);
    roseFrame.position.copy(rose.position).add(V3(-0.1, 0, 0));
    roseFrame.rotation.y = Math.PI / 2;
    group.add(roseFrame);
    // stairs from 66 to the summit: cantilevered blocks along the wall, 300° → 380°
    for (let i = 0; i < 20; i++) {
      const a = deg(300 + i * 4.1);
      const top = 66 + 0.4 * (i + 1);
      K.solid(Math.cos(a) * 14.5, top - 0.25, Math.sin(a) * 14.5, 1.5, 0.5, 1.5, M.stone);
    }
    // pendulum swinging in the empty shaft above the lift (well above the players)
    pendulum = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 11, 8).translate(0, -5.5, 0), M.gold);
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 40).rotateX(Math.PI / 2), M.gold);
    bob.position.y = -11.3;
    const bobHeart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.05), 32), glow('#ff5f8a', 0.9));
    bobHeart.position.set(0, -11.3, 0.17);
    pendulum.add(rod, bob, bobHeart);
    pendulum.position.copy(P(0, 73, 0));
    group.add(pendulum);
    // big cogs turning on the walls
    [
      [deg(30), 20, 3.2, 0.25],
      [deg(150), 33, 2.4, -0.35],
      [deg(240), 46, 3.6, 0.2],
      [deg(330), 60, 2.8, -0.3],
      [deg(70), 64, 2.2, 0.4],
      [deg(200), 12, 2.6, -0.28],
    ].forEach(([a, y, R0, s]) => {
      const m = new THREE.Mesh(cogGeo(R0, 18, 0.3, 0.35).rotateX(Math.PI / 2), M.bronze);
      m.position.copy(P(Math.cos(a) * (RW - 0.4), y, Math.sin(a) * (RW - 0.4)));
      m.lookAt(P(0, y, 0));
      group.add(m);
      wallCogs.push({ m, s, axis: 'zl' });
    });
    // suit banners
    [
      ['♠', '#b9a6ff', deg(100), 20],
      ['♥', '#ff5f8a', deg(220), 30],
      ['♦', '#ff9a3a', deg(340), 38],
      ['♣', '#7ce0ff', deg(10), 52],
    ].forEach(([s, col, a, y]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 5.5),
        new THREE.MeshStandardMaterial({ map: bannerTex(s, col), roughness: 0.9, side: THREE.DoubleSide }),
      );
      m.position.copy(P(Math.cos(a) * (RW - 0.35), y, Math.sin(a) * (RW - 0.35)));
      m.lookAt(P(0, y, 0));
      group.add(m);
    });
    // wall lanterns (emissive, no light cost)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.17;
      const y = 4 + (i % 6) * 12;
      const l = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glow('#ffcf8a', 1.2));
      l.position.copy(P(Math.cos(a) * (RW - 0.5), y, Math.sin(a) * (RW - 0.5)));
      group.add(l);
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), M.iron);
      br.position.copy(P(Math.cos(a) * (RW - 0.25), y + 0.2, Math.sin(a) * (RW - 0.25)));
      br.lookAt(P(0, y + 0.2, 0));
      group.add(br);
    }
    LvKit.light(group, P(0, 9, 0), '#ffd2a0', 0.9, 30);
    LvKit.light(group, P(0, 48, 0), '#c8b0ff', 1.1, 34);
    LvKit.light(group, P(0, 62, 0), '#ffc8a8', 0.9, 30);

    // ---- stage 4: the summit ----
    const holeA0 = deg(338);
    const holeA1 = deg(380);
    const insideTop = (x, z) => {
      const r = Math.hypot(x, z);
      if (r > RW + 0.4) return false;
      if (inSector(x, z, 12.6, RW + 0.6, holeA0, holeA1)) return false;
      return true;
    };
    rows(TOP, 0.8, -16.4, 16.4, -16.4, 16.4, insideTop, null);
    // two exact pieces (a disc and the ring around the stairwell) instead of a shape with a hole
    slabFrom(sectorShape(0, 12.6, 0, Math.PI * 2), TOP, 0.8, M.cobble);
    slabFrom(sectorShape(12.6, RW + 0.4, holeA1, holeA0 + Math.PI * 2), TOP, 0.8, M.cobble);
    // a balustrade around the stairwell (a sweep must not throw anyone back down), open where
    // the stairs come up
    const railA0 = deg(338);
    const railA1 = deg(371);
    rows(TOP + 1.0, 1.0, -16.4, 16.4, -16.4, 16.4, (x, z) => {
      if (inSector(x, z, 12.3, 12.75, railA0, railA1)) return true;
      // the radial side at 338°
      const r = Math.hypot(x, z);
      const ax = Math.cos(railA0);
      const az = Math.sin(railA0);
      const along = x * ax + z * az;
      const side = x * az - z * ax;
      return r <= RW && along >= 12.3 && side >= 0 && side < 0.45;
    }, null);
    const railArc = new THREE.Mesh(
      new THREE.TorusGeometry(12.5, 0.07, 6, 48, railA1 - railA0).rotateX(Math.PI / 2),
      M.gold,
    );
    railArc.rotation.y = -railA0;
    railArc.position.copy(P(0, TOP + 1.0, 0));
    group.add(railArc);
    for (let a = 338; a <= 371; a += 3) {
      const ar = deg(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.0, 8), M.stone);
      b.position.copy(P(Math.cos(ar) * 12.5, TOP + 0.5, Math.sin(ar) * 12.5));
      group.add(b);
    }
    const radial = new THREE.Mesh(new THREE.BoxGeometry(RW - 12.3, 0.14, 0.14), M.gold);
    radial.position.copy(P(Math.cos(railA0) * (RW + 12.3) / 2, TOP + 1.0, Math.sin(railA0) * (RW + 12.3) / 2));
    radial.rotation.y = -railA0;
    group.add(radial);
    // crown of the tower: wall top ring and merlons, with colliders
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(18.2, 18.2, 1.2, 72, 1, true), M.wallOut);
    crown.position.copy(P(0, TOP + 0.6, 0));
    group.add(crown);
    const capTop = new THREE.Mesh(new THREE.RingGeometry(RW + 0.4, 18.2, 96).rotateX(-Math.PI / 2), M.stone);
    capTop.position.copy(P(0, TOP + 1.2, 0));
    group.add(capTop);
    rows(TOP + 1.2, 1.2, -18.4, 18.4, -18.4, 18.4, (x, z) => {
      const r = Math.hypot(x, z);
      return r >= RW + 0.4 && r <= 18.3;
    }, null);
    for (let i = 0; i < 36; i++) {
      if (i % 2) continue;
      const a = (i / 36) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.4), M.stone);
      m.position.copy(P(Math.cos(a) * 17.2, TOP + 1.7, Math.sin(a) * 17.2));
      m.rotation.y = -a;
      group.add(m);
    }
    // the belfry: four pillars, arches, and the bell (cover against the Sentinelle's gears)
    const pillarG = new THREE.CylinderGeometry(0.55, 0.65, 8, 16);
    [
      [6.2, 6.2],
      [-6.2, 6.2],
      [6.2, -6.2],
      [-6.2, -6.2],
    ].forEach(([x, z]) => {
      const m = new THREE.Mesh(pillarG, M.stone);
      m.position.copy(P(x, TOP + 4, z));
      group.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), M.gold);
      cap.position.copy(P(x, TOP + 8.1, z));
      group.add(cap);
      K.collider(x, TOP + 4, z, 1.2, 8, 1.2);
    });
    [
      [0, 6.2, 0],
      [0, -6.2, 0],
      [6.2, 0, Math.PI / 2],
      [-6.2, 0, Math.PI / 2],
    ].forEach(([x, z, ry]) => {
      const a = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.35, 8, 32, Math.PI), M.stone);
      a.position.copy(P(x, TOP + 8.2, z));
      a.rotation.y = ry;
      a.scale.set(1, 0.4, 1);
      group.add(a);
    });
    bell = new THREE.Group();
    const bellPts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      bellPts.push(new THREE.Vector2(0.4 + Math.pow(t, 2.2) * 2.4 + (t > 0.9 ? (t - 0.9) * 3 : 0), 3 - t * 3));
    }
    const bellM = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 48), M.bronze);
    bellM.position.y = -3;
    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.12, 8, 48).rotateX(Math.PI / 2), M.gold);
    bellRim.position.y = -3;
    bell.add(bellM, bellRim);
    bell.position.copy(P(0, TOP + 11.5, 0));
    group.add(bell);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13, 0.5, 0.5), M.walk);
    beam.position.copy(P(0, TOP + 11.6, 0));
    group.add(beam);
    // the card and a little heart-galaxy, revealed after the fight
    card = LvKit.trialCard('s4', false);
    card.position.copy(P(0, TOP + 2.2, 0));
    group.add(card);
    // a small heart-galaxy high under the bell, well above the card so it never washes it out
    cardHeart = Heart.galaxy(6000, 4, 33);
    cardHeart.group.scale.setScalar(0.035);
    cardHeart.group.position.copy(P(0, TOP + 6.4, 0));
    cardHeart.core.material.opacity = 0;
    // its colours run past 1: faded and with small points it stays a shimmer, not a white burn
    cardHeart.U.uFade.value = 0.7;
    cardHeart.group.visible = false;
    group.add(cardHeart.group);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.9, 32), M.stone);
    ped.position.copy(P(0, TOP + 0.45, 0));
    ped.visible = false;
    group.add(ped);
    card.userData.ped = ped;
    card.userData.pedBox = Phys.box(O.x, O.y + TOP + 0.45, O.z, 2.2, 0.9, 2.2, { dyn: true });
    card.userData.pedBox.on = false;
    // the sea of clouds and the outer clock faces
    const cloudTex = LvKit.tex(1024, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 30 + Math.random() * 120;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,240,255,0.32)');
        gr.addColorStop(1, 'rgba(255,240,255,0)');
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, 6, 6);
    cloudTex.repeat.set(10, 10);
    M.cloud.map = cloudTex;
    cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), M.cloud);
    cloudSea.position.copy(P(0, 30, 0));
    group.add(cloudSea);
    // a second, lower and fainter layer: depth under the first
    const cloud2 = new THREE.Mesh(cloudSea.geometry, M.cloud.clone());
    cloud2.material.map = cloudTex.clone();
    cloud2.material.map.needsUpdate = true;
    cloud2.material.opacity = 0.55;
    cloud2.material.color.set('#8a6aa8');
    cloud2.position.copy(P(40, 20, -30));
    cloud2.rotation.y = 0.7;
    group.add(cloud2);
    cloudSea.userData.second = cloud2;

    // ---- the view from the top: spires of the Borderland rising from the clouds, the moon,
    // giant cards drifting. Unfogged silhouettes (the tower's fog would swallow them at 200 m)
    const winTex = LvKit.tex(256, 1024, (g, w, h) => {
      g.fillStyle = '#1a1024';
      g.fillRect(0, 0, w, h);
      for (let y = 20; y < h; y += 34)
        for (let x = 14; x < w; x += 30) {
          if (Math.random() < 0.45) continue;
          const warm = Math.random() < 0.75;
          g.fillStyle = warm ? `rgba(255,${190 + Math.random() * 40},${120 + Math.random() * 60},${0.5 + Math.random() * 0.4})` : 'rgba(170,150,255,0.7)';
          g.fillRect(x, y, 10, 16);
        }
    });
    const spireMat = new THREE.MeshBasicMaterial({ map: winTex, fog: false });
    spireMat.color.setScalar(0.85);
    const capMat = new THREE.MeshBasicMaterial({ color: '#2a1838', fog: false });
    const tipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(0.8), fog: false, toneMapped: false });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.13;
      const r = 170 + ((i * 53) % 150);
      const h = 50 + ((i * 37) % 90);
      const w = 8 + (i % 4) * 3;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const body = new THREE.Mesh(i % 2 ? new THREE.BoxGeometry(w, h, w) : new THREE.CylinderGeometry(w * 0.5, w * 0.62, h, 12), spireMat);
      body.position.copy(P(x, 30 + h / 2 - 10, z));
      group.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, w * 1.8, i % 2 ? 4 : 12), capMat);
      roof.position.copy(P(x, 30 + h - 10 + w * 0.9, z));
      if (i % 2) roof.rotation.y = Math.PI / 4;
      group.add(roof);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), tipMat);
      tip.position.copy(P(x, 30 + h - 10 + w * 1.8 + 0.6, z));
      group.add(tip);
    }
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(38, 64),
      new THREE.MeshBasicMaterial({
        map: LvKit.tex(1024, 1024, (g, w) => {
          const gr = g.createRadialGradient(w * 0.45, w * 0.42, w * 0.05, w / 2, w / 2, w / 2);
          gr.addColorStop(0, '#fff2f6');
          gr.addColorStop(0.7, '#f1cfe0');
          gr.addColorStop(1, '#d6a8c8');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
          g.fill();
          for (let i = 0; i < 40; i++) {
            g.fillStyle = `rgba(150,100,140,${0.05 + Math.random() * 0.12})`;
            g.beginPath();
            g.arc(Math.random() * w, Math.random() * w, 10 + Math.random() * 70, 0, Math.PI * 2);
            g.fill();
          }
          g.globalCompositeOperation = 'destination-in';
          g.beginPath();
          g.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
          g.fill();
        }),
        transparent: true,
        fog: false,
        toneMapped: false,
      }),
    );
    // under the bloom threshold, so it reads as a moon and not a hole of light
    moon.material.color.setScalar(0.78);
    moon.position.copy(P(-330, 120, -380));
    moon.lookAt(P(0, TOP, 0));
    group.add(moon);
    const moonHalo = new THREE.Mesh(
      new THREE.RingGeometry(38, 90, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {},
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader:
          'varying vec2 vU; void main(){ float d = length(vU - .5) * 2.; float a = pow(max(0., 1. - (d - .42) / .58), 3.) * .35; gl_FragColor = vec4(vec3(1., .75, .9) * a, a); }',
      }),
    );
    moonHalo.position.copy(moon.position);
    moonHalo.quaternion.copy(moon.quaternion);
    group.add(moonHalo);
    // giant cards drifting above the clouds
    const ranks = ['A', 'R', 'D', 'V', '10', '7', '4', '2'];
    const suitsD = ['♠', '♥', '♦', '♣'];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 12.6),
        new THREE.MeshBasicMaterial({ map: Tex.card(ranks[i % ranks.length], suitsD[i % 4]), side: THREE.DoubleSide, fog: false, transparent: true }),
      );
      m.material.color.setScalar(0.62);
      const a = (i / 10) * Math.PI * 2 + 0.4;
      const r = 70 + (i % 3) * 30;
      m.userData.drift = { a, r, y: 40 + (i % 4) * 14, s: 0.02 + (i % 3) * 0.01, spin: (i % 2 ? 1 : -1) * (0.1 + (i % 4) * 0.05) };
      group.add(m);
      driftCards.push(m);
    }
    const outDial = new THREE.MeshStandardMaterial({ map: dialTex(), roughness: 0.6, emissive: '#4a3010', emissiveIntensity: 0.5 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.CircleGeometry(5.6, 96), outDial);
      m.position.copy(P(Math.cos(a) * 18.35, TOP - 7, Math.sin(a) * 18.35));
      m.lookAt(P(Math.cos(a) * 40, TOP - 7, Math.sin(a) * 40));
      group.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(5.7, 0.3, 8, 96), M.gold);
      rim.position.copy(m.position);
      rim.quaternion.copy(m.quaternion);
      group.add(rim);
    }
    LvKit.light(group, P(0, TOP + 5, 9), '#ffd8a8', 1.0, 34);

    // ---- screens ----
    screen = makeScreen(9, 3.6, 1024);
    screen.mesh.position.copy(P(0, 4.6, -RW + 0.3));
    group.add(screen.mesh);
    screen2 = makeScreen(7, 2.8, 1024);
    screen2.mesh.position.copy(P(RW - 0.3, 46, 0));
    screen2.mesh.rotation.y = -Math.PI / 2;
    group.add(screen2.mesh);
    screen3 = makeScreen(8, 3.2, 1024);
    screen3.mesh.position.copy(P(0, TOP + 9.5, 6.25));
    screen3.mesh.rotation.y = Math.PI;
    group.add(screen3.mesh);
  };

  // ---------- falling cards (stage 3 hazard), purely visual here ----------
  const cardGeo = new THREE.PlaneGeometry(1.8, 2.5);
  const dropCard = (x, y, z) => {
    // a late message from the partner may still drop one once the world is unloaded
    if (!built) return;
    const ranks = ['2', '3', '5', '6', '8', '9', '10', 'V', 'D'];
    const suits = ['♠', '♣', '♥', '♦'];
    const m = new THREE.Mesh(
      cardGeo,
      new THREE.MeshBasicMaterial({
        map: Tex.card(ranks[(Math.random() * ranks.length) | 0], suits[(Math.random() * 4) | 0]),
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
      }),
    );
    m.material.color.setScalar(0.8);
    m.position.copy(P(x, y + 16, z));
    group.add(m);
    falling.push({ m, x, y, z, t: 0, spin: (Math.random() - 0.5) * 6 });
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the tower's own geometry, materials and canvas textures (M's own materials and the
  // cloud map included), takes its colliders out (the cogs', the lift's and the pedestal's moving
  // boxes too) and empties every table in place (the level keeps TrS4.discs). M is refilled by
  // mats() at the next build; its Tex materials stay cached (wallIn's BackSide is set again, the
  // same value). The falling cards' geometry is made when the script loads and stays as an object.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    api.sleep();
    const r = Life.free([group], [M, cardGeo]);
    r.world = 'tr_s4';
    r.colliders = Phys.drop('tr_s4');
    built = false;
    [M, levers].forEach(clear);
    [discs, liftBoxes, rimBoxes, rimPosts, columns, ringMeshes, wallCogs, lanterns, falling, driftCards].forEach((a) => (a.length = 0));
    arm = lift = crank = gate = gateBox = pendulum = screen = screen2 = screen3 = null;
    card = cardHeart = bell = rose = cloudSea = liftLight = null;
    // the host-shared values the level hands to update()
    delete api.v;
    return r;
  };

  // ---------- per-frame ----------
  const tmp = V3();
  const discPos = (ri, k, ga) => {
    const ring = RINGS[ri];
    const a = ring.off + ring.dir * ga + (k / ring.n) * Math.PI * 2;
    return [Math.cos(a) * ring.r, Math.sin(a) * ring.r];
  };
  const colPhase = (i, wt) => (((wt + COLS[i].ph) % CYCLE) + CYCLE) % CYCLE;
  const colOn = (i, wt) => colPhase(i, wt) < ON;
  const colWarn = (i, wt) => colPhase(i, wt) > CYCLE - 1.0;

  const api = {
    O,
    P,
    RW,
    TOP,
    LIFT,
    COLS,
    COL_R,
    RINGS,
    ARM,
    LEVERS,
    RINGS_G,
    build,
    unbuild,
    group,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get screen2() {
      return screen2;
    },
    get screen3() {
      return screen3;
    },
    rel: K.rel,
    dropCard,
    discs,
    colOn,
    colWarn,
    ringPos: (i) => P(...RINGS_G[i].p),
    ringLand: (i) => P(...RINGS_G[i].land),
    show(v) {
      group.visible = v;
    },
    // where each stage starts (relative y for the lift stage comes from the lift)
    spawn(stage, who, ly) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) return P(s * 2.2, 0, 13);
      if (stage === 2) return P(s * 1.6, (ly != null ? ly : LIFT.y0) + 0.1, 1.4);
      if (stage === 3) return P(s * 2.2, 42, 8.6);
      return P(10.5 + s * 1.2, TOP, -5 + s);
    },
    onLift: (q, ly) => Math.hypot(q.x, q.z) < LIFT.r - 0.2 && Math.abs(q.y - ly) < 1.2,
    nearLever: (q, id) => {
      const p = LEVERS[id];
      return Math.hypot(q.x - p.x, q.z - p.z) < 2.1 && Math.abs(q.y - p.y) < 1.2;
    },
    nearCrank: (q, ly) => Math.hypot(q.x, q.z) < 1.5 && Math.abs(q.y - ly) < 1.2,
    inColumn: (q, i) => {
      const cl = COLS[i];
      return Math.hypot(q.x - cl.x, q.z - cl.z) < COL_R && q.y > cl.y0 - 0.3 && q.y < cl.y1 + 1.2;
    },
    onSummit: (q) => q.y > TOP - 0.4 && Math.hypot(q.x, q.z) < RW + 0.5,
    nearCard: (q) => Math.hypot(q.x, q.z) < 2.6 && q.y > TOP - 0.5,
    /** host-shared values: ga (cog angle), aa (arm angle), ly (lift), wt (wind clock) */
    update(dt, t, x, role, v) {
      if (!built) return;
      this.v = v;
      // cog discs: move meshes and colliders, remember the delta for riders
      discs.forEach((d) => {
        const ring = RINGS[d.ring];
        const [cx, cz] = discPos(d.ring, d.k, v.ga);
        d.px = d.x;
        d.pz = d.z;
        d.x = cx;
        d.z = cz;
        d.g.position.copy(P(cx, ring.y, cz));
        d.g.rotation.y = -v.ga * ring.dir * 3 + d.k;
        // the cogs stay solid whatever the stage: they are seen, so they hold
        const on = true;
        const wx = O.x + cx;
        const wz = O.z + cz;
        d.boxes.forEach(({ b, hx, hz }) => {
          b.on = on;
          b.min[0] = wx - hx;
          b.max[0] = wx + hx;
          b.min[2] = wz - hz;
          b.max[2] = wz + hz;
          b.min[1] = O.y + ring.y - 0.5;
          b.max[1] = O.y + ring.y;
        });
      });
      arm.rotation.y = -v.aa;
      arm.userData.glow.material.color.set(v.braked ? '#7ce0ff' : '#ff5f8a').multiplyScalar(v.braked ? 0.7 : 1.1);
      Object.entries(levers).forEach(([id, l]) => {
        const held = (x.brk || []).includes(id);
        l.k = damp(l.k, held ? 1 : 0, 10, dt);
        l.pivot.rotation.z = 0.6 - l.k * 1.2;
        l.plate.material.color.set(held ? '#7ce0ff' : '#ff5f8a').multiplyScalar(held ? 1.1 : 0.6 + Math.sin(t * 3) * 0.15);
      });
      // lift
      lift.position.copy(P(0, v.ly, 0));
      const wy = O.y + v.ly;
      liftBoxes.forEach(({ b, sx, sz }) => {
        b.min[0] = O.x - sx / 2;
        b.max[0] = O.x + sx / 2;
        b.min[2] = O.z - sz / 2;
        b.max[2] = O.z + sz / 2;
        b.min[1] = wy - 0.6;
        b.max[1] = wy;
      });
      // rim walls: up while riding, gate closed only while the lift moves away from the bridge,
      // everything down once it has arrived at the top
      const arrived = v.ly >= LIFT.y1 - 0.05;
      const away = v.ly > LIFT.y0 + 0.05;
      rimBoxes.forEach((r) => {
        const up = !arrived && (!r.gate || away);
        r.b.on = up && x.stage <= 2;
        r.b.min[0] = O.x + r.x - 0.35;
        r.b.max[0] = O.x + r.x + 0.35;
        r.b.min[2] = O.z + r.z - 0.35;
        r.b.max[2] = O.z + r.z + 0.35;
        r.b.min[1] = wy;
        r.b.max[1] = wy + 1.0;
      });
      gate.position.y = damp(gate.position.y, away && !arrived ? 0.47 : -0.5, 6, dt);
      rimPosts.forEach((p) => (p.m.position.y = damp(p.m.position.y, arrived ? p.y - 0.98 : p.y, 4, dt)));
      crank.userData.wheel.rotation.y += dt * (v.lv > 0 ? 4 : 0);
      liftLight.intensity = x.stage <= 3 ? 1.4 : 0;
      lanterns.forEach((l, i) => {
        const on = x.half;
        l.material.color.set(on ? '#7ce0ff' : '#ffcf8a').multiplyScalar(on ? 1.2 : 0.6 + 0.4 * Math.sin(t * 2 + i));
      });
      // updraft columns: the grapple kit sees the wind (bright when it blows, a warning pulse
      // just before); the double-jump kit only ever sees the faint sleeve
      columns.forEach((c, i) => {
        const on = colOn(i, v.wt);
        const warn = colWarn(i, v.wt);
        const sees = role === 'dame';
        const want = sees ? (on ? 0.85 : warn ? 0.35 + 0.3 * Math.sin(t * 18) : 0.05) : 0;
        c.k = damp(c.k, want, 8, dt);
        c.pts.material.opacity = c.k;
        c.pts.visible = c.k > 0.01;
        c.baseRing.material.color.set(sees && on ? '#bfe8ff' : '#6f8aa0').multiplyScalar(sees && on ? 1.1 : 0.45);
        if (c.pts.visible) {
          const h = c.cl.y1 - c.cl.y0;
          const sp = on ? 9 : 1.5;
          for (let k = 0; k < c.seed.length; k++) {
            let y = c.pos[k * 3 + 1] + dt * sp * (0.6 + c.seed[k]);
            if (y > h) y -= h;
            c.pos[k * 3 + 1] = y;
            const a = t * (1.5 + c.seed[k]) + c.seed[k] * 40;
            const r = (0.3 + c.seed[k] * 0.7) * COL_R;
            c.pos[k * 3] = Math.cos(a) * r;
            c.pos[k * 3 + 2] = Math.sin(a) * r;
          }
          c.pts.geometry.attributes.position.needsUpdate = true;
        }
      });
      ringMeshes.forEach((m, i) => {
        m.rotation.y = t * 1.2 + i;
        m.visible = x.stage === 3;
      });
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        f.t += dt;
        const k = Math.min(1, f.t / 0.55);
        f.m.position.y = O.y + f.y + 16 - 16 * k * k + 0.05;
        f.m.rotation.set(-Math.PI / 2 + (1 - k) * f.spin, f.spin * (1 - k), 0);
        if (f.t > 2.2) {
          group.remove(f.m);
          f.m.material.dispose();
          falling.splice(i, 1);
        } else if (f.t > 1.6) f.m.material.opacity = 1 - (f.t - 1.6) / 0.6;
      }
      wallCogs.forEach((c) => {
        if (c.axis === 'z') c.m.rotation.z = t * c.s;
        else c.m.rotateZ(dt * c.s);
      });
      pendulum.rotation.z = Math.sin(t * 0.9) * 0.32;
      rose.material.color.set('#ff7aa6').multiplyScalar(0.55 + 0.15 * Math.sin(t * 1.3));
      bell.rotation.z = Math.sin(t * 0.7) * (x.stage >= 5 ? 0.18 : 0.03);
      const won = x.stage >= 5;
      card.visible = won;
      card.userData.ped.visible = won;
      card.userData.pedBox.on = won;
      cardHeart.group.visible = won;
      if (won) {
        card.rotation.y = t * 0.8;
        card.position.y = O.y + TOP + 2.2 + Math.sin(t * 2) * 0.12;
        cardHeart.U.uTime.value = t;
        cardHeart.U.uPx.value = R.renderer.getPixelRatio() * 0.22;
        cardHeart.U.uForm.value = Math.min(1, cardHeart.U.uForm.value + dt * 0.4);
      } else cardHeart.U.uForm.value = 0;
      cloudSea.material.map.offset.x = t * 0.003;
      cloudSea.userData.second.material.map.offset.y = t * 0.002;
      driftCards.forEach((m) => {
        const d = m.userData.drift;
        const a = d.a + t * d.s;
        m.position.copy(P(Math.cos(a) * d.r, d.y + Math.sin(t * 0.3 + d.a) * 3, Math.sin(a) * d.r));
        m.rotation.set(Math.sin(t * 0.2 + d.a) * 0.3, t * d.spin, Math.cos(t * 0.17 + d.a) * 0.2);
      });
      screen.update(dt, t);
      screen2.update(dt, t);
      screen3.update(dt, t);
    },
    /** the arm's distance to a point (relative coords), for its sweep */
    armHit(q, aa) {
      // feet between 2.2 m under the bar and its top: anyone standing on the middle ring
      if (q.y < ARM.y - 2.2 || q.y > ARM.y + 0.25) return false;
      // rotation.y = -aa turns the arm's local +x into (cos aa, 0, sin aa)
      const ax = Math.cos(aa);
      const az = Math.sin(aa);
      const s = q.x * ax + q.z * az;
      if (s < ARM.r0 || s > ARM.r1 + 1) return false;
      const px = q.x - ax * s;
      const pz = q.z - az * s;
      return Math.hypot(px, pz) < 0.9;
    },
    armDir: (aa) => [Math.cos(aa), Math.sin(aa)],
    discUnder(body) {
      return discs.find((d) => d.boxes.some((x) => x.b === body.ground)) || null;
    },
    // leaving the épreuve: the moving colliders stop taking part in every physics query
    sleep() {
      discs.forEach((d) => d.boxes.forEach((x) => (x.b.on = false)));
      liftBoxes.forEach((x) => (x.b.on = false));
      rimBoxes.forEach((x) => (x.b.on = false));
      if (card) card.userData.pedBox.on = false;
      group.visible = false;
    },
    wake() {
      liftBoxes.forEach((x) => (x.b.on = true));
      group.visible = true;
    },
    tmp,
  };
  return api;
})();
