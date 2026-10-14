// ♠ 5 · La Crypte: a stone dungeon of four rooms under the city.
const Donjon = (() => {
  const O = V3(1400, 80, 0);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const { P } = K;
  let built = false;
  let screen = null;
  let card = null;
  let chest = null;
  let chestB = null;
  let lid = null;
  const gates = {};
  const torches = [];
  const plates = {};
  let ring = null;

  // 1024² procedural stone, triplanar in world space (js/world/textures.js)
  const wallM = Tex.mat('stone', { color: '#9a8ea8', scale: 3.2, bump: 1.4 });
  const floorMat = Tex.mat('cobble', { color: '#8e8496', scale: 3, bump: 1.6 });
  const wallMat = () => wallM;
  const floorM = () => floorMat;
  const iron = Tex.mat('metal', { color: '#4a4452', metal: 0.75, rough: 0.9, scale: 1.5 });
  const wood = Tex.mat('wood', { color: '#8a6450', scale: 1.6 });
  const goldM = new THREE.MeshStandardMaterial({
    color: '#d6ad5e',
    metalness: 1,
    roughness: 0.25,
    emissive: '#3a2608',
  });

  // room: floor + walls (+ ceiling), openings at z0 and z1 of width door
  const room = (cx, z0, z1, w, h, door = 4.4, prevW = 0, ceil = true) => {
    const d = z1 - z0;
    const cz = (z0 + z1) / 2;
    K.solid(cx, -0.5, cz, w, 1, d, floorM(w, d));
    K.solid(cx - w / 2 - 0.5, h / 2, cz, 1, h, d, wallMat(d, h));
    K.solid(cx + w / 2 + 0.5, h / 2, cz, 1, h, d, wallMat(d, h));
    const side = (w - door) / 2;
    K.solid(cx - door / 2 - side / 2, h / 2, z1, side, h, 1, wallMat(side, h));
    K.solid(cx + door / 2 + side / 2, h / 2, z1, side, h, 1, wallMat(side, h));
    K.solid(cx, h - 1, z1, door, 2, 1, wallMat(door, 2));
    const inner = Math.max(door / 2, prevW / 2 + 1);
    if (inner < w / 2) {
      const sw = w / 2 - inner;
      [-1, 1].forEach((s) =>
        K.solid(cx + s * (inner + sw / 2), h / 2, z0, sw, h, 1, wallMat(sw, h)),
      );
    }
    if (!prevW) K.solid(cx, h - 1, z0, door, 2, 1, wallMat(door, 2));
    if (ceil) K.solid(cx, h + 0.5, cz, w + 2, 1, d + 1, wallMat(w, d));
    for (let z = z0 + 4; z < z1 - 2; z += 8)
      [-1, 1].forEach((s) => torch(cx + s * (w / 2 - 0.15), 3.2, z, s));
  };

  const torch = (x, y, z, s) => {
    K.deco(new THREE.BoxGeometry(0.3, 0.12, 0.12), iron, x - s * 0.15, y, z);
    const cup = K.deco(
      new THREE.CylinderGeometry(0.16, 0.08, 0.25, 8),
      iron,
      x - s * 0.3,
      y + 0.12,
      z,
    );
    const flame = K.deco(
      new THREE.ConeGeometry(0.13, 0.42, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffb060').multiplyScalar(2.6),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      x - s * 0.3,
      y + 0.45,
      z,
    );
    const halo = K.deco(
      new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff8a3a').multiplyScalar(0.5),
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      x - s * 0.3,
      y + 0.45,
      z,
    );
    torches.push({ flame, halo, ph: Math.random() * 10, cup });
  };

  const gate = (id, x, z, w, h = 6) => {
    const g = new THREE.Group();
    for (let i = 0; i <= Math.round(w / 0.5); i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), iron);
      bar.position.set(-w / 2 + i * 0.5, h / 2, 0);
      g.add(bar);
    }
    [0.8, h / 2, h - 0.5].forEach((y) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), iron);
      bar.position.y = y;
      g.add(bar);
    });
    const glowBar = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.06, 0.06),
      LvKit.glow('#ff4f6a', 1.6),
    );
    glowBar.position.y = 0.1;
    g.add(glowBar);
    g.position.copy(P(x, 0, z));
    group.add(g);
    const b = Phys.box(O.x + x, O.y + h / 2, O.z + z, w, h, 0.6, { dyn: true });
    gates[id] = { g, b, y: 0, open: false, glowBar };
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    // entrance hall
    room(0, -2, 11, 12, 7, 4.4, 999);
    K.solid(0, 3.5, -2, 14, 7, 1, wallMat(14, 7));
    // room 1 · antichambre
    room(0, 11, 40, 28, 9, 4.4, 12);
    // lever corridor
    room(0, 40, 58, 14, 11, 4.4, 28);
    // the grapple launch carries ~9 m forward: the Dame's ledge runs to the end wall so she
    // lands on it instead of flying past
    K.solid(-5, 3, 51.75, 4, 6, 11.5, wallMat(4, 6));
    K.solid(5, 1.475, 50, 4, 2.95, 4, wallMat(4, 3));
    // lever plates
    [
      ['dame', -5, 6, '#ff5f8a'],
      ['valet', 5, 2.95, '#6cc8ff'],
    ].forEach(([who, x, y, col]) => {
      const m = K.deco(
        new THREE.CylinderGeometry(1.1, 1.1, 0.1, 28),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(col).multiplyScalar(0.5),
          toneMapped: false,
        }),
        x,
        y + 0.05,
        50,
      );
      const lever = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), iron);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0),
        iron,
      );
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), LvKit.glow(col, 1.8));
      knob.position.y = 1;
      arm.add(knob);
      lever.add(base, arm);
      lever.position.copy(P(x, y + 0.15, 51.2));
      group.add(lever);
      plates[who] = { m, pos: P(x, y, 50), arm, col: new THREE.Color(col), y };
    });
    ring = K.deco(
      new THREE.TorusGeometry(0.6, 0.08, 10, 32),
      LvKit.glow('#ff5f8a', 2.2),
      -5,
      9.3,
      50,
    );
    // room 2 · la nef
    room(0, 58, 100, 30, 12, 4.4, 14);
    for (let z = 66; z < 96; z += 10)
      [-9, 9].forEach((x) => {
        K.solid(x, 6, z, 1.6, 12, 1.6, wallMat(2, 12));
        K.solid(x, 0.25, z, 2.2, 0.5, 2.2, iron);
      });
    // room 3 · l'ossuaire
    room(0, 100, 130, 24, 8, 4.4, 30);
    const bone = new THREE.MeshStandardMaterial({
      color: '#d8ccbc',
      roughness: 0.8,
      emissive: '#1a1410',
    });
    const r = rng(77);
    for (let k = 0; k < 5; k++)
      [-1, 1].forEach((side) => K.solid(side * 11.4, 0.5 + k * 1.3, 115, 1.2, 0.12, 27, wood));
    const skull = new THREE.SphereGeometry(0.22, 10, 8);
    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? 1 : -1;
      const sk = K.deco(
        skull,
        bone,
        side * (11.1 + r() * 0.5),
        0.78 + Math.floor(r() * 5) * 1.3,
        102.5 + r() * 25,
      );
      sk.scale.set(1, 0.9, 1.1);
      sk.rotation.y = (side * -Math.PI) / 2 + (r() - 0.5);
    }
    for (let i = 0; i < 10; i++) {
      const c = K.deco(
        new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: '#f4ead8', emissive: '#3a2a10' }),
        (r() - 0.5) * 18,
        0.25,
        104 + r() * 24,
      );
      K.deco(
        new THREE.ConeGeometry(0.05, 0.12, 6),
        LvKit.glow('#ffd28a', 2.4),
        c.position.x - O.x,
        0.56,
        c.position.z - O.z,
      );
    }
    // boss arena
    room(0, 130, 188, 46, 14, 4.4, 24);
    K.solid(0, 6, 188, 4.4, 12, 1, wallMat(4, 12));
    [
      [-11, 148],
      [11, 148],
      [-11, 170],
      [11, 170],
    ].forEach(([x, z]) => {
      K.solid(x, 7, z, 3, 14, 3, wallMat(3, 14), { tag: 'pillar' });
      K.deco(
        new THREE.TorusGeometry(2.3, 0.08, 8, 40).rotateX(Math.PI / 2),
        LvKit.glow('#ff4f6a', 1.2),
        x,
        0.1,
        z,
      );
    });
    // banners
    const banner = new THREE.MeshStandardMaterial({
      color: '#5a0a1e',
      roughness: 0.8,
      emissive: '#1a0208',
      side: THREE.DoubleSide,
    });
    for (let z = 140; z < 184; z += 11)
      [-1, 1].forEach((s) => {
        const b = K.deco(new THREE.PlaneGeometry(2.2, 6), banner, s * 22.4, 8, z);
        b.rotation.y = (s * -Math.PI) / 2;
        K.deco(new THREE.BoxGeometry(0.06, 0.9, 0.9), goldM, s * 22.3, 8.6, z).rotation.x =
          Math.PI / 4;
      });
    // chest
    chest = new THREE.Group();
    const cb = new THREE.Mesh(new THREE.BoxGeometry(2, 1.1, 1.3), wood);
    cb.position.y = 0.55;
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.14, 1.35), goldM);
    band.position.y = 0.9;
    lid = new THREE.Group();
    const lt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 2, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
      wood,
    );
    lt.position.set(0, 0, 0.65);
    lid.add(lt);
    lid.position.set(0, 1.1, -0.65);
    const glowIn = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 1.1), LvKit.glow('#ffcf8a', 2));
    glowIn.position.y = 1.08;
    chest.add(cb, band, lid, glowIn);
    chest.position.copy(P(0, 0, 182));
    chest.visible = false;
    group.add(chest);
    // the chest only blocks once it has appeared (after the boss)
    chestB = Phys.box(O.x, O.y + 0.6, O.z + 182, 2, 1.2, 1.3);
    chestB.on = false;
    card = LvKit.trialCard('s7', false);
    card.position.copy(P(0, 2.8, 182));
    group.add(card);
    gate('g1', 0, 11, 4.4);
    gate('g2', 0, 40, 4.4);
    gate('g3', 0, 58, 4.4);
    gate('g4', 0, 100, 4.4);
    gate('g5', 0, 130, 4.4);
    screen = makeScreen(16, 6, 1024);
    screen.mesh.position.copy(P(0, 8, 39.4));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
  };

  const SPAWN = [
    [1, 3],
    [3, 42],
    [4, 55],
    [7, 97],
    [10, 127],
    [12, 160],
  ];

  return {
    O,
    P,
    build,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get plates() {
      return plates;
    },
    rel: K.rel,
    ring: () => P(-5, 9.3, 50),
    spawn(stage, who) {
      let z = 3;
      SPAWN.forEach(([st, zz]) => {
        if (stage >= st) z = zz;
      });
      return P(who === 'dame' ? -2.5 : 2.5, 0, z);
    },
    roomStart(stage) {
      return stage >= 10 ? 10 : stage >= 7 ? 7 : stage >= 4 ? 4 : 1;
    },
    inRoom1: (q) => q.z > 13 && q.z < 40 && q.y > -1,
    inRoom2: (q) => q.z > 62 && q.z < 100 && q.y > -1,
    inRoom3: (q) => q.z > 103 && q.z < 130 && q.y > -1,
    inArena: (q) => q.z > 135 && q.y > -1,
    darkAt: (q) => q.z > 100 && q.z < 130,
    onPlate(who, q) {
      const p = plates[who];
      const lx = p.pos.x - O.x;
      return Math.hypot(q.x - lx, q.z - 50) < 1.6 && Math.abs(q.y - p.y) < 0.6;
    },
    nearChest: (q) => Math.hypot(q.x, q.z - 182) < 3 && q.y > -0.5,
    wave(n) {
      const pts = {
        1: [
          ['pion', -8, 32],
          ['pion', 8, 32],
          ['pion', 0, 36],
          ['pion', -10, 24],
          ['pion', 10, 24],
          ['cavalier', 0, 30],
        ],
        2: [
          ['cavalier', -8, 90],
          ['cavalier', 8, 90],
          ['pion', -4, 84],
          ['pion', 4, 84],
          ['pion', 0, 94],
          ['pion', -12, 76],
        ],
        3: [
          ['cavalier', 0, 92],
          ['tour', -12, 94],
          ['tour', 12, 94],
          ['pion', -6, 80],
          ['pion', 6, 80],
        ],
        4: [
          ['spectre', -6, 122],
          ['spectre', 6, 122],
          ['spectre', 0, 126],
        ],
        5: [
          ['spectre', -8, 124],
          ['spectre', 8, 124],
          ['spectre', 0, 118],
          ['pion', -4, 127],
          ['pion', 4, 127],
        ],
      }[n];
      return pts.map(([t, x, z]) => [t, P(x, 0, z)]);
    },
    bossPos: () => P(0, 0, 172),
    update(dt, t, x) {
      if (!built) return;
      screen.update(dt, t);
      const st = x.stage;
      const open = { g1: true, g2: st >= 3, g3: st >= 4, g4: st >= 7, g5: st >= 10 };
      Object.entries(gates).forEach(([id, gt]) => {
        const o = !!open[id];
        gt.y = damp(gt.y, o ? 6.2 : 0, 3, dt);
        gt.g.position.y = O.y + gt.y;
        gt.b.on = !o;
        gt.glowBar.visible = !o;
      });
      torches.forEach((tc) => {
        const f = 0.85 + Math.sin(t * 13 + tc.ph) * 0.1 + Math.sin(t * 7.3 + tc.ph * 2) * 0.08;
        tc.flame.scale.set(1, f, 1);
        tc.halo.material.opacity = 0.25 + f * 0.12;
      });
      Object.entries(plates).forEach(([who, p]) => {
        const on = (x.plates || []).includes(who);
        p.m.material.color.copy(p.col).multiplyScalar(on ? 1.8 : 0.4);
        p.arm.rotation.x = damp(p.arm.rotation.x, on || st >= 4 ? 0.8 : -0.8, 6, dt);
      });
      ring.visible = st === 3;
      ring.rotation.y = t;
      chest.visible = st >= 12;
      chestB.on = st >= 12;
      lid.rotation.x = damp(lid.rotation.x, st >= 13 ? -1.9 : 0, 3, dt);
      card.visible = st >= 13;
      card.rotation.y = t * 1.4;
      card.position.y = O.y + 2.8 + Math.sin(t * 2) * 0.15;
    },
  };
})();
