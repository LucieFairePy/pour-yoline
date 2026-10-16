// ♦ 4 · Les Miroirs. A hall of mirrors where light beams bounce, built at O = (-2100, 0, 4200).
// Room 1 (z 4..32): one glass wall, mirrors on both sides, turn them (E) to bring the beam
// to the crystal. Room 2 (z 38..76): the Dame aims a turret by shooting white plaques, the
// Valet carries a mirror block and a prism to sockets. Arena (centre z 100): the Mirror
// Guardian, its ring of mirrors turning around a heart; route the beams into the gap.
// Beams are traced in 2D (XZ) at y = 1.5 from the shared state, so both screens agree.
const TrD2 = (() => {
  const O = V3(-2100, 0, 4200);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const BY = 1.5;
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  let built = false;
  let K = null;

  // ---------- materials ----------
  // fake environment reflections (CineKit2.envify); kit2.js loads after the worlds, so the
  // patch is applied when the world is built
  const envList = [];
  const env = (m, k) => {
    envList.push([m, k]);
    return m;
  };
  const floorMat = Tex.mat('marble', { color: '#221a2c', scale: 6, rough: 0.55 });
  const inlayMat = Tex.mat('marble', { color: '#e9dfe6', scale: 3, rough: 0.3 });
  const wallMat = Tex.mat('plaster', { color: '#3a2c46', scale: 4 });
  const stoneMat = Tex.mat('stone', { color: '#6b5b78', scale: 3 });
  const gold = env(
    new THREE.MeshStandardMaterial({ color: '#d8b06a', metalness: 1, roughness: 0.28 }),
    1.1,
  );
  const brass = env(
    new THREE.MeshStandardMaterial({ color: '#b98b4a', metalness: 0.9, roughness: 0.38 }),
    1,
  );
  const darkMetal = env(
    new THREE.MeshStandardMaterial({ color: '#2c2433', metalness: 0.8, roughness: 0.4 }),
    0.8,
  );
  const mirrorMat = env(
    new THREE.MeshStandardMaterial({ color: '#e6e2f2', metalness: 1, roughness: 0.04 }),
    1.6,
  );
  const shardMat = env(
    new THREE.MeshStandardMaterial({
      color: '#a99ccc',
      metalness: 1,
      roughness: 0.12,
      emissive: '#1c0e28',
    }),
    1.25,
  );
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bfe6ff',
    transparent: true,
    opacity: 0.16,
    roughness: 0.05,
    metalness: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const add = (geo, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ---------- beam blockers (local XZ) ----------
  const rects = []; // { x0, x1, z0, z1, door? }
  const wall = (x, z, sx, sz, h = 9, mat = wallMat) => {
    K.solid(x, h / 2, z, sx, h, sz, mat);
    rects.push({ x0: x - sx / 2, x1: x + sx / 2, z0: z - sz / 2, z1: z + sz / 2 });
    // gold cornice on top
    const c = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.2, 0.35, sz + 0.2), gold);
    c.position.copy(P(x, h + 0.17, z));
    group.add(c);
  };
  const glassWall = (x, z, sx, sz, h = 7) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), glassMat);
    m.position.copy(P(x, h / 2, z));
    m.renderOrder = 2;
    group.add(m);
    K.collider(x, h / 2, z, sx, h, sz, { tag: 'glass' });
    // brass mullions every 4 m so the glass reads as a wall
    const along = sz > sx;
    const len = along ? sz : sx;
    for (let i = 0; i <= len / 4; i++) {
      const o = -len / 2 + i * (len / Math.max(1, Math.round(len / 4)));
      add(
        new THREE.BoxGeometry(0.16, h, 0.16),
        brass,
        O.x + x + (along ? 0 : o),
        O.y + h / 2,
        O.z + z + (along ? o : 0),
      );
    }
    add(new THREE.BoxGeometry(along ? 0.3 : sx, 0.3, along ? sz : 0.3), brass, O.x + x, O.y + h, O.z + z);
    add(new THREE.BoxGeometry(along ? 0.4 : sx, 0.2, along ? sz : 0.4), brass, O.x + x, O.y + 0.1, O.z + z);
  };

  const doors = {};
  const door = (id, x, z, w) => {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 7, 0.5), darkMetal);
    slab.position.y = 3.5;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.8, 6.2), mirrorMat);
    pane.position.set(0, 3.5, 0.26);
    const pane2 = pane.clone();
    pane2.position.z = -0.26;
    pane2.rotation.y = Math.PI;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 6.4, 0.6), glow('#ff9a3a', 1.2));
    seam.position.y = 3.5;
    g.add(slab, pane, pane2, seam);
    g.position.copy(P(x, 0, z));
    group.add(g);
    const b = K.collider(x, 3.5, z, w, 7, 0.6, { dyn: true });
    const r = { x0: x - w / 2, x1: x + w / 2, z0: z - 0.3, z1: z + 0.3, door: id };
    rects.push(r);
    doors[id] = { g, b, r, seam, off: 0, open: false };
  };

  // ---------- models ----------
  const gearShape = (r0, r1, n) => {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) {
      const a0 = (i / (n * 2)) * Math.PI * 2;
      const a1 = ((i + 1) / (n * 2)) * Math.PI * 2;
      const r = i % 2 ? r0 : r1;
      if (!i) s.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
      else s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      s.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, r0 * 0.35, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  };
  const gearGeo = new THREE.ExtrudeGeometry(gearShape(0.55, 0.68, 14), {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  }).rotateX(-Math.PI / 2);
  const heartShape = (k) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const [x, y] = Heart.curve((i / 64) * Math.PI * 2);
      if (i) s.lineTo(x * k, (y - 2.5) * k);
      else s.moveTo(x * k, (y - 2.5) * k);
    }
    return s;
  };
  const heartGeo = (k, depth) =>
    new THREE.ExtrudeGeometry(heartShape(k), {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.4,
      bevelSize: k * 1.2,
      bevelSegments: 3,
    }).translate(0, 0, -depth / 2);

  // a mirror on a turning stand: marble base, brass gears, gold frame
  const mirrors = [];
  const mirrorStand = (id, x, z, opt = {}) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 0, z));
    group.add(g);
    add(new THREE.CylinderGeometry(0.75, 0.9, 0.35, 24), inlayMat, 0, 0.17, 0, g);
    add(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 24), gold, 0, 0.38, 0, g);
    const gear = add(gearGeo, brass, 0, 0.42, 0, g);
    const gear2 = add(gearGeo, brass, 0.82, 0.3, 0.35, g);
    gear2.scale.setScalar(0.5);
    const head = new THREE.Group();
    head.position.y = 0;
    g.add(head);
    add(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10), gold, 0, 0.9, 0, head);
    const w = opt.w || 2.0;
    const h = opt.h || 1.6;
    const frame = new THREE.Group();
    frame.position.y = BY;
    head.add(frame);
    // frame (mirror plane faces local +x = normal at angle 0)
    add(new THREE.BoxGeometry(0.12, h + 0.16, 0.1), gold, 0, 0, -w / 2 - 0.02, frame);
    add(new THREE.BoxGeometry(0.12, h + 0.16, 0.1), gold, 0, 0, w / 2 + 0.02, frame);
    add(new THREE.BoxGeometry(0.12, 0.1, w + 0.16), gold, 0, h / 2 + 0.03, 0, frame);
    add(new THREE.BoxGeometry(0.12, 0.1, w + 0.16), gold, 0, -h / 2 - 0.03, 0, frame);
    add(new THREE.BoxGeometry(0.05, h, w), darkMetal, 0, 0, 0, frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mirrorMat);
    glass.rotation.y = Math.PI / 2;
    glass.position.x = 0.03;
    const glassB = glass.clone();
    glassB.rotation.y = -Math.PI / 2;
    glassB.position.x = -0.03;
    frame.add(glass, glassB);
    // a small heart crest on top
    const crest = new THREE.Mesh(heartGeo(0.012, 0.05), glow('#ff6f9a', 1.1));
    crest.rotation.y = Math.PI / 2;
    crest.position.set(0, h / 2 + 0.28, 0);
    frame.add(crest);
    // tick ring on the base: the 8 (or 24) positions
    const steps = opt.step ? Math.round(360 / opt.step) : 8;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      add(
        new THREE.BoxGeometry(0.05, 0.03, 0.14),
        glow('#ffcf8a', 0.7),
        Math.cos(a) * 0.82,
        0.36,
        -Math.sin(a) * 0.82,
        g,
      ).rotation.y = a;
    }
    const ring = add(
      new THREE.RingGeometry(1.05, 1.18, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(opt.color || '#ffcf8a').multiplyScalar(1.2),
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
        depthWrite: false,
      }),
      0,
      0.03,
      0,
      g,
    );
    K.collider(x, 0.9, z, 1.1, 1.8, 1.1);
    const m = {
      id,
      x,
      z,
      half: w / 2,
      head,
      gear,
      gear2,
      ring,
      cur: null,
      side: opt.side || null,
      step: opt.step || 45,
    };
    mirrors.push(m);
    return m;
  };

  // brass turret that shoots the beam
  const emitters = {};
  const emitter = (id, x, z, opt = {}) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 0, z));
    group.add(g);
    add(new THREE.CylinderGeometry(0.85, 1.05, 0.5, 28), stoneMat, 0, 0.25, 0, g);
    add(new THREE.CylinderGeometry(0.45, 0.55, 0.8, 20), brass, 0, 0.9, 0, g);
    const head = new THREE.Group();
    head.position.y = BY;
    g.add(head);
    add(new THREE.SphereGeometry(0.42, 24, 16), gold, 0, 0, 0, head);
    const barrel = add(
      new THREE.CylinderGeometry(0.16, 0.22, 1.1, 18).rotateZ(-Math.PI / 2),
      darkMetal,
      0.6,
      0,
      0,
      head,
    );
    add(new THREE.TorusGeometry(0.2, 0.04, 8, 20).rotateY(Math.PI / 2), gold, 0.95, 0, 0, head);
    const lens = add(new THREE.SphereGeometry(0.13, 16, 12), glow(opt.color || '#ffb0c8', 2.2), 1.15, 0, 0, head);
    [-1, 1].forEach((s) =>
      add(new THREE.BoxGeometry(0.5, 0.08, 0.06), gold, 0.2, 0.25 * s, 0, head),
    );
    K.collider(x, 0.9, z, 1.6, 1.8, 1.6);
    emitters[id] = { id, x, z, head, lens, cur: null, color: opt.color || '#ffb0c8' };
    return emitters[id];
  };

  // crystal target, lights up when the beam reaches it
  const crystals = {};
  const crystal = (id, x, z) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 0, z));
    group.add(g);
    add(new THREE.CylinderGeometry(0.55, 0.7, 0.9, 6), stoneMat, 0, 0.45, 0, g);
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 6), gold, 0, 0.92, 0, g);
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffd7e6',
      emissive: '#ff6f9a',
      emissiveIntensity: 0.15,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const c = add(new THREE.OctahedronGeometry(0.42, 0), mat, 0, BY, 0, g);
    c.scale.set(1, 1.6, 1);
    const small = [];
    for (let i = 0; i < 3; i++) {
      const s = add(new THREE.OctahedronGeometry(0.18, 0), mat, 0, BY, 0, g);
      s.scale.set(1, 1.7, 1);
      small.push(s);
    }
    const heart = add(heartGeo(0.011, 0.06), glow('#ff4f7a', 1), 0, BY - 0.02, 0, g);
    heart.scale.setScalar(0.9);
    const l = new THREE.PointLight('#ff7aa0', 0, 9, 2);
    l.position.y = BY;
    g.add(l);
    K.collider(x, 0.9, z, 1.2, 1.8, 1.2);
    crystals[id] = { id, x, z, r: 0.75, c, small, heart, mat, light: l, k: 0, lit: false };
  };

  // sockets (room 2) and the blocks the Valet carries
  const sockets = {};
  const socket = (id, x, z, rack) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 0, z));
    group.add(g);
    add(new THREE.CylinderGeometry(0.8, 0.9, 0.18, 6), rack ? stoneMat : inlayMat, 0, 0.09, 0, g);
    const ring = add(
      new THREE.RingGeometry(0.62, 0.74, 6).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(rack ? '#b9a6ff' : '#ff9a3a').multiplyScalar(1.3),
        transparent: true,
        opacity: 0.6,
        toneMapped: false,
        depthWrite: false,
      }),
      0,
      0.2,
      0,
      g,
    );
    sockets[id] = { id, x, z, ring, rack: !!rack };
  };
  const blocks = {};
  const prismMat = new THREE.MeshPhysicalMaterial({
    color: '#e8f4ff',
    metalness: 0,
    roughness: 0.04,
    transmission: 0.6,
    transparent: true,
    opacity: 0.55,
    emissive: '#6a4a9a',
    emissiveIntensity: 0.25,
    clearcoat: 1,
  });
  const block = (id, kind) => {
    const g = new THREE.Group();
    group.add(g);
    add(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 20), brass, 0, 0.35, 0, g);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), gold, 0, 0.85, 0, g);
    const head = new THREE.Group();
    head.position.y = BY;
    g.add(head);
    if (kind === 'prism') {
      const pr = add(new THREE.CylinderGeometry(0.62, 0.62, 1.1, 3), prismMat, 0, 0, 0, head);
      pr.rotation.y = Math.PI / 6;
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(pr.geometry),
        new THREE.LineBasicMaterial({ color: '#ffe6b0' }),
      );
      pr.add(edge);
      add(new THREE.OctahedronGeometry(0.16, 0), glow('#c7a6ff', 1.6), 0, 0, 0, head);
    } else {
      add(new THREE.BoxGeometry(0.08, 1.2, 1.3), darkMetal, 0, 0, 0, head);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), mirrorMat);
      gl.rotation.y = Math.PI / 2;
      gl.position.x = 0.05;
      const gl2 = gl.clone();
      gl2.rotation.y = -Math.PI / 2;
      gl2.position.x = -0.05;
      head.add(gl, gl2);
      add(new THREE.BoxGeometry(0.12, 0.08, 1.4), gold, 0, 0.62, 0, head);
      add(new THREE.BoxGeometry(0.12, 0.08, 1.4), gold, 0, -0.62, 0, head);
    }
    blocks[id] = { id, kind, g, head, pos: V3(), cur: null };
  };

  // ---------- the Mirror Guardian ----------
  const BOSS0 = () => ({ g: null, ring: null, heart: null, body: null, shards: [], crown: null, k: 0 });
  const boss = BOSS0();
  const GAP = 0.55; // half-width of the gap in the ring (radians)
  const RING_R = 2.6;
  const buildBoss = () => {
    const g = new THREE.Group();
    g.position.copy(P(0, 0, 100));
    group.add(g);
    boss.g = g;
    // dais
    add(new THREE.CylinderGeometry(3.6, 4.2, 0.35, 48), inlayMat, 0, 0.17, 0, g);
    add(new THREE.TorusGeometry(3.7, 0.06, 8, 64).rotateX(Math.PI / 2), gold, 0, 0.36, 0, g);
    // heart core at beam height, inside the ring
    const hm = new THREE.MeshStandardMaterial({
      color: '#ffb3c8',
      emissive: '#ff3d7f',
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.15,
    });
    const heart = new THREE.Mesh(heartGeo(0.05, 0.5), hm);
    heart.position.y = BY;
    g.add(heart);
    boss.heart = heart;
    const hl = new THREE.PointLight('#ff6f9a', 2, 12, 2);
    hl.position.y = BY;
    g.add(hl);
    boss.light = hl;
    // the turning ring of mirror panels, with one gap
    const ring = new THREE.Group();
    ring.position.y = 0;
    g.add(ring);
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < GAP) continue;
      const p = new THREE.Group();
      p.position.set(Math.cos(a) * RING_R, 0, -Math.sin(a) * RING_R);
      p.rotation.y = a;
      ring.add(p);
      const pane = add(new THREE.BoxGeometry(0.1, 2.4, 1.15), shardMat, 0, 1.5, 0, p);
      pane.rotation.z = 0.06 * (i % 2 ? 1 : -1);
      add(new THREE.BoxGeometry(0.14, 0.08, 1.2), gold, 0, 2.74, 0, p);
      add(new THREE.BoxGeometry(0.14, 0.08, 1.2), gold, 0, 0.28, 0, p);
    }
    // glowing frame around the gap
    [-GAP, GAP].forEach((a) => {
      add(new THREE.BoxGeometry(0.12, 2.6, 0.12), glow('#ff9a3a', 1.6), Math.cos(a) * RING_R, 1.5, -Math.sin(a) * RING_R, ring);
    });
    // a veil closes the gap for a moment after each crack
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.4),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff9ad0').multiplyScalar(1.2),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    veil.position.set(RING_R, 1.5, 0);
    veil.rotation.y = Math.PI / 2;
    ring.add(veil);
    boss.veil = veil;
    boss.ring = ring;
    // upper body: a slender figure of mirror plates (a dress in three tiers, a crystal bodice,
    // blade arms, peacock wings, a diamond head under a gold crown), always facing the gap
    const body = new THREE.Group();
    body.position.y = 3.2;
    g.add(body);
    boss.body = body;
    const plateGeo = new THREE.OctahedronGeometry(0.5, 0);
    const tiers = [];
    for (let j = 0; j < 3; j++) {
      const tier = new THREE.Group();
      tier.position.y = 0.15 + j * 0.85;
      body.add(tier);
      const n = 14 - j * 3;
      const r = 1.85 - j * 0.48;
      for (let i = 0; i < n; i++) {
        const piv = new THREE.Group();
        piv.rotation.y = (i / n) * Math.PI * 2 + j * 0.3;
        tier.add(piv);
        const lean = new THREE.Group();
        lean.position.x = r;
        lean.rotation.z = 0.28 + j * 0.06;
        piv.add(lean);
        const p = new THREE.Mesh(plateGeo, shardMat);
        p.scale.set(0.62 - j * 0.08, 1.35 - j * 0.15, 0.07);
        p.rotation.y = Math.PI / 2;
        lean.add(p);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.2 - j * 0.15, 0.02), gold);
        edge.position.x = 0.05;
        lean.add(edge);
        boss.shards.push({ m: lean, j, i, ph: i * 0.7 });
      }
      tiers.push(tier);
    }
    boss.tiers = tiers;
    // bodice + collar
    add(new THREE.OctahedronGeometry(0.6, 0), shardMat, 0, 3.0, 0, body).scale.set(1.15, 1.7, 0.8);
    add(new THREE.TorusGeometry(0.62, 0.06, 8, 32).rotateX(Math.PI / 2), gold, 0, 3.8, 0, body);
    add(new THREE.TorusGeometry(0.95, 0.04, 8, 40).rotateX(Math.PI / 2), gold, 0, 2.55, 0, body);
    // blade arms, hanging gracefully
    const arms = [];
    [-1, 1].forEach((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.85, 3.75, 0);
      body.add(arm);
      add(new THREE.OctahedronGeometry(0.3, 0), shardMat, 0, 0, 0, arm).scale.set(1.3, 0.8, 0.9);
      const up = add(plateGeo, shardMat, side * 0.35, -0.75, 0.05, arm);
      up.scale.set(0.22, 1.5, 0.1);
      up.rotation.z = side * 0.35;
      const low = add(plateGeo, shardMat, side * 0.75, -1.9, 0.25, arm);
      low.scale.set(0.18, 1.6, 0.08);
      low.rotation.set(-0.3, 0, side * 0.12);
      add(new THREE.OctahedronGeometry(0.12, 0), glow('#ffcf8a', 1.3), side * 0.85, -2.75, 0.32, arm);
      arms.push(arm);
    });
    boss.arms = arms;
    // peacock wings behind
    const wings = [];
    [-1, 1].forEach((side) => {
      const w = new THREE.Group();
      w.position.set(side * 0.4, 3.6, -0.45);
      body.add(w);
      for (let i = 0; i < 7; i++) {
        const piv = new THREE.Group();
        piv.rotation.z = -side * (0.25 + i * 0.2);
        w.add(piv);
        const bl = add(plateGeo, shardMat, 0, 1.6 + i * 0.12, 0, piv);
        bl.scale.set(0.26, 3.0 + i * 0.2, 0.05);
        add(new THREE.BoxGeometry(0.03, 2.6 + i * 0.2, 0.03), gold, 0, 1.6 + i * 0.12, 0.03, piv);
        add(new THREE.OctahedronGeometry(0.1, 0), glow(i % 2 ? '#ff9ad0' : '#ffcf8a', 1.4), 0, 3.15 + i * 0.22, 0.05, piv);
      }
      wings.push(w);
    });
    boss.wings = wings;
    // neck, diamond head, eye
    add(new THREE.CylinderGeometry(0.12, 0.18, 0.5, 8), gold, 0, 4.15, 0, body);
    add(new THREE.OctahedronGeometry(0.5, 0), shardMat, 0, 4.95, 0, body).scale.set(0.85, 1.45, 0.75);
    const eye = add(new THREE.SphereGeometry(0.11, 12, 10), glow('#ff9a3a', 2), 0, 5.0, 0.36, body);
    const crown = new THREE.Group();
    crown.position.y = 5.75;
    body.add(crown);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = add(new THREE.ConeGeometry(0.07, 0.55 + (i % 2) * 0.35, 4), gold, Math.cos(a) * 0.42, 0.25, Math.sin(a) * 0.42, crown);
      s.rotation.z = Math.cos(a) * -0.25;
      s.rotation.x = Math.sin(a) * 0.25;
    }
    add(new THREE.TorusGeometry(0.44, 0.045, 8, 32).rotateX(Math.PI / 2), gold, 0, 0, 0, crown);
    // halo of small shards around the head
    const halo = new THREE.Group();
    halo.position.y = 5.1;
    body.add(halo);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const sh = add(plateGeo, shardMat, Math.cos(a) * 1.25, Math.sin(i * 1.7) * 0.12, Math.sin(a) * 1.25, halo);
      sh.scale.set(0.08, 0.32, 0.05);
      sh.rotation.y = -a;
    }
    boss.halo = halo;
    boss.eye = eye;
    boss.crown = crown;
    // a floating heart above the crown: the piece of the Oui it guards
    const hg = Heart.galaxy(1800, 0.09, 31);
    hg.U.uFade.value = 0.45;
    hg.group.position.set(0, 7.4, 0);
    hg.core.material.opacity = 0.12;
    hg.core.scale.setScalar(1.4);
    body.add(hg.group);
    boss.galaxy = hg;
    // collider: you can't walk through the Guardian
    boss.col = K.collider(0, 2, 100, 5.4, 4, 5.4);
  };

  // shard projectiles and telegraphs
  const telegraphs = [];
  const projectiles = [];
  const teleMat = () =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff1f33').multiplyScalar(1.8),
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  const makeTele = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), teleMat());
    m.visible = false;
    group.add(m);
    return m;
  };
  const makeProj = () => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), shardMat);
    m.scale.set(0.5, 0.5, 2.2);
    m.visible = false;
    group.add(m);
    return m;
  };
  const ringWave = { m: null };

  // ---------- beams ----------
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const beamPool = [];
  let beamUsed = 0;
  const beamMesh = () => {
    const core = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#fff2f6').multiplyScalar(1.5),
        toneMapped: false,
      }),
    );
    const halo = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff6f9a').multiplyScalar(1.4),
        transparent: true,
        opacity: 0.22,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(core, halo);
    return { core, halo };
  };
  const drawSeg = (ax, az, bx, bz, col, t) => {
    if (beamUsed >= beamPool.length) beamPool.push(beamMesh());
    const b = beamPool[beamUsed++];
    const len = Math.hypot(bx - ax, bz - az);
    [b.core, b.halo].forEach((m, i) => {
      m.visible = true;
      m.position.copy(P(ax, BY, az));
      m.lookAt(P(bx, BY, bz));
      const w = i ? 0.17 + Math.sin(t * 14 + ax) * 0.02 : 0.045;
      m.scale.set(w, w, Math.max(0.01, len));
    });
    b.halo.material.color.set(col).multiplyScalar(1.4);
  };

  // 2D tracing helpers
  const rayRect = (ox, oz, dx, dz, r) => {
    let t0 = -Infinity;
    let t1 = Infinity;
    if (Math.abs(dx) < 1e-9) {
      if (ox < r.x0 || ox > r.x1) return Infinity;
    } else {
      let a = (r.x0 - ox) / dx;
      let b = (r.x1 - ox) / dx;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
    }
    if (Math.abs(dz) < 1e-9) {
      if (oz < r.z0 || oz > r.z1) return Infinity;
    } else {
      let a = (r.z0 - oz) / dz;
      let b = (r.z1 - oz) / dz;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
    }
    if (t1 < t0 || t1 < 1e-4) return Infinity;
    return t0 > 1e-4 ? t0 : Infinity;
  };
  const raySeg = (ox, oz, dx, dz, ax, az, bx, bz) => {
    const ex = bx - ax;
    const ez = bz - az;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((ax - ox) * ez - (az - oz) * ex) / den;
    const u = ((ax - ox) * dz - (az - oz) * dx) / den;
    if (t < 1e-3 || u < 0 || u > 1) return null;
    return t;
  };
  const rayCircle = (ox, oz, dx, dz, cx, cz, r) => {
    const fx = ox - cx;
    const fz = oz - cz;
    const b = fx * dx + fz * dz;
    const c = fx * fx + fz * fz - r * r;
    const h = b * b - c;
    if (h < 0) return Infinity;
    const s = Math.sqrt(h);
    const t = -b - s;
    if (t > 1e-3) return t;
    return Infinity;
  };
  const ARENA_R = 17.6;

  /**
   * Trace every active beam from the state. src: [{x, z, a}] origins with angle (rad).
   * Returns { segs: [[ax, az, bx, bz, col]], lit: Set(crystal ids), heart: bool, hits: [[x,z]] }.
   */
  const trace = (srcs, st) => {
    const segs = [];
    const lit = new Set();
    const hits = [];
    let heart = false;
    const mir = st.mirrors;
    const blk = st.blocks;
    const queue = srcs.map((s) => ({ ox: s.x, oz: s.z, dx: Math.cos(s.a), dz: -Math.sin(s.a), d: 0, col: s.col }));
    let guard = 0;
    while (queue.length && guard++ < 48) {
      const ray = queue.shift();
      let { ox, oz, dx, dz } = ray;
      let best = 120;
      let kind = null;
      let obj = null;
      for (const r of rects) {
        if (r.door && st.open && st.open.includes(r.door)) continue;
        const t = rayRect(ox, oz, dx, dz, r);
        if (t < best) {
          best = t;
          kind = 'wall';
        }
      }
      // inside the arena, its round wall stops the beam
      if (Math.hypot(ox, oz - 100) < ARENA_R + 0.1 && oz > 82) {
        const fx = ox;
        const fz = oz - 100;
        const b = fx * dx + fz * dz;
        const c = fx * fx + fz * fz - ARENA_R * ARENA_R;
        const t = -b + Math.sqrt(Math.max(0, b * b - c));
        if (t > 1e-3 && t < best) {
          best = t;
          kind = 'wall';
        }
      }
      for (const m of mirrors) {
        const a = mir[m.id];
        if (a == null) continue;
        const ang = (a * Math.PI) / 180;
        const tx = -Math.sin(ang);
        const tz = -Math.cos(ang);
        const t = raySeg(ox, oz, dx, dz, m.x - tx * m.half, m.z - tz * m.half, m.x + tx * m.half, m.z + tz * m.half);
        if (t != null && t < best) {
          best = t;
          kind = 'mirror';
          obj = { nx: Math.cos(ang), nz: -Math.sin(ang) };
        }
      }
      if (blk)
        for (const id in blk) {
          const b = blk[id];
          if (!b.at || !sockets[b.at] || sockets[b.at].rack) continue;
          const s = sockets[b.at];
          if (b.kind === 'prism') {
            const t = rayCircle(ox, oz, dx, dz, s.x, s.z, 0.6);
            if (t < best) {
              best = t;
              kind = 'prism';
              obj = s;
            }
          } else {
            const ang = (b.a * Math.PI) / 180;
            const tx = -Math.sin(ang);
            const tz = -Math.cos(ang);
            const t = raySeg(ox, oz, dx, dz, s.x - tx * 0.65, s.z - tz * 0.65, s.x + tx * 0.65, s.z + tz * 0.65);
            if (t != null && t < best) {
              best = t;
              kind = 'mirror';
              obj = { nx: Math.cos(ang), nz: -Math.sin(ang) };
            }
          }
        }
      for (const id in crystals) {
        const c = crystals[id];
        const t = rayCircle(ox, oz, dx, dz, c.x, c.z, c.r);
        if (t < best) {
          best = t;
          kind = 'crystal';
          obj = c;
        }
      }
      if (st.boss) {
        const t = rayCircle(ox, oz, dx, dz, 0, 100, RING_R);
        if (t < best) {
          best = t;
          kind = 'boss';
        }
      }
      const ex = ox + dx * best;
      const ez = oz + dz * best;
      segs.push([ox, oz, ex, ez, ray.col]);
      if (kind === 'mirror' && ray.d < 14) {
        const dot = dx * obj.nx + dz * obj.nz;
        queue.push({ ox: ex, oz: ez, dx: dx - 2 * dot * obj.nx, dz: dz - 2 * dot * obj.nz, d: ray.d + 1, col: ray.col });
      } else if (kind === 'prism' && ray.d < 14) {
        // the prism splits the light to both sides
        hits.push([ex, ez, '#c7a6ff']);
        queue.push({ ox: obj.x, oz: obj.z, dx: -dz, dz: dx, d: ray.d + 1, col: '#b48cff' });
        queue.push({ ox: obj.x, oz: obj.z, dx: dz, dz: -dx, d: ray.d + 1, col: '#6cc8ff' });
        segs[segs.length - 1][2] = obj.x;
        segs[segs.length - 1][3] = obj.z;
      } else if (kind === 'crystal') {
        lit.add(obj.id);
        hits.push([ex, ez, '#ffd0e0']);
      } else if (kind === 'boss') {
        const ang = Math.atan2(-(ez - 100), ex);
        const diff = Math.atan2(Math.sin(ang - st.boss.gap), Math.cos(ang - st.boss.gap));
        if (Math.abs(diff) < GAP * 0.92 && st.boss.open) {
          heart = true;
          segs[segs.length - 1][2] = ex - dx * -RING_R * 0.8;
          segs[segs.length - 1][3] = ez - dz * -RING_R * 0.8;
          hits.push([0, 100, '#ff3d7f']);
        } else if (ray.d < 14) {
          // the mirrors of its ring send the light back
          const nx = ex / RING_R;
          const nz = (ez - 100) / RING_R;
          const dot = dx * nx + dz * nz;
          hits.push([ex, ez, '#ffffff']);
          queue.push({ ox: ex, oz: ez, dx: dx - 2 * dot * nx, dz: dz - 2 * dot * nz, d: ray.d + 2, col: ray.col });
        }
      } else hits.push([ex, ez, ray.col]);
    }
    return { segs, lit, heart, hits };
  };

  // ---------- layout ----------
  const ROOM1 = {
    emitter: { x: -14, z: 10, a: 0 },
    mirrors: [
      ['m1', -8, 10, 'w'],
      ['m2', -8, 24, 'w'],
      ['m5', -12, 26, 'w'],
      ['m3', 8, 24, 'e'],
      ['m4', 8, 14, 'e'],
      ['m6', 12, 8, 'e'],
    ],
    start: { m1: 90, m2: 0, m5: 45, m3: 90, m4: 0, m6: 135 },
  };
  const ROOM2 = {
    emitter: { x: -12, z: 42 },
    targets: {
      ta: [15.6, 42, -1, 0],
      tb: [15.6, 52, -1, 0],
      tc: [15.6, 66, -1, 0],
      td: [-12, 75.6, 0, -1],
      te: [9, 75.6, 0, -1],
    },
    sockets: [
      ['s1', 6, 42],
      ['s2', 6, 62],
      ['s3', 12, 52],
      ['s4', 0, 52],
    ],
    racks: [
      ['r1', 10, 72.2],
      ['r2', 12.5, 72.2],
      ['r3', 15, 72.2],
    ],
  };
  const ARENA = {
    mirrors: [30, 90, 150, 210, 270, 330].map((deg, i) => [
      'a' + i,
      Math.cos((deg * Math.PI) / 180) * 9,
      100 - Math.sin((deg * Math.PI) / 180) * 9,
      deg,
    ]),
  };
  // one light well per mirror on the rim: its beam reaches mirror k from outside, and the
  // mirror turned to (θk + 105°) sends it straight to the centre (exact on the 15° steps)
  ARENA.wells = ARENA.mirrors.map(([id, mx, mz, deg], i) => {
    const a = ((deg + 13.7) * Math.PI) / 180;
    return ['w' + i, Math.cos(a) * 16, 100 - Math.sin(a) * 16, id];
  });
  // faint dotted path on the floor, shown as a last hint when room 1 lasts too long
  const ghost = new THREE.Group();
  ghost.visible = false;
  const GHOST = [
    [-14, 10, -8, 10],
    [-8, 10, -8, 24],
    [-8, 24, 8, 24],
    [8, 24, 8, 14],
    [8, 14, 14, 14],
  ];
  const targets = {};
  let screen = null;
  let card = null;
  const decor = [];

  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) return;
    Phys.owner('tr_d2');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    group.visible = true;
    // envify sets onBeforeCompile (it does not wrap the previous one): doing it again on a
    // rebuild changes nothing
    envList.forEach(([m, k]) => CineKit2.envify(m, k));
    K = LvKit.builder(O, group);
    // floor: dark marble with light inlay bands
    K.solid(0, -0.5, 52, 40, 1, 128, floorMat);
    K.solid(0, -0.5, 100, 40, 1, 40, floorMat);
    for (let z = -8; z < 80; z += 6) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(31.6, 0.02, 0.18), inlayMat);
      s.position.copy(P(0, 0.01, z));
      group.add(s);
    }
    // outer walls
    wall(-16.25, 36, 0.5, 92);
    wall(16.25, 36, 0.5, 92);
    wall(0, -10.25, 33, 0.5);
    // hall details: mirror panels along the walls ("galerie des glaces")
    for (let z = -6; z < 80; z += 8) {
      [-1, 1].forEach((s) => {
        if (z > 30 && z < 40) return;
        if (z > 74 && z < 84) return;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.2), mirrorMat);
        pane.position.copy(P(s * 15.97, 3.6, z));
        pane.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(pane);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.6, 3.6), gold);
        fr.position.copy(P(s * 15.95, 3.6, z));
        group.add(fr);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.4, 3.4), darkMetal);
        back.position.copy(P(s * 15.99, 3.6, z));
        group.add(back);
        // gold pilaster between panels
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.6), stoneMat);
        pil.position.copy(P(s * 15.8, 4.5, z + 4));
        group.add(pil);
        K.collider(s * 15.8, 4.5, z + 4, 0.5, 9, 0.6);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.8), gold);
        cap.position.copy(P(s * 15.8, 8.6, z + 4));
        group.add(cap);
      });
    }
    // chandeliers: rings of soft light
    [8, 30, 56, 92, 108].forEach((z) => {
      const ch = new THREE.Group();
      ch.position.copy(P(0, 11, z));
      group.add(ch);
      add(new THREE.TorusGeometry(1.6, 0.05, 8, 40).rotateX(Math.PI / 2), gold, 0, 0, 0, ch);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        add(new THREE.OctahedronGeometry(0.12, 0), glow('#ffe2c4', 1.4), Math.cos(a) * 1.6, -0.25, Math.sin(a) * 1.6, ch);
      }
      decor.push(ch);
      LvKit.light(group, P(0, 9, z), '#ffd9e6', 0.32, 22);
    });
    // ---- room 1 ----
    glassWall(0, 18, 0.25, 28);
    wall(-13.6, 32, 4.8, 0.5);
    wall(0, 32, 10, 0.5);
    wall(13.6, 32, 4.8, 0.5);
    door('d1w', -8, 32, 6);
    door('d1e', 8, 32, 6);
    emitter('e1', ROOM1.emitter.x, ROOM1.emitter.z);
    ROOM1.mirrors.forEach(([id, x, z, side]) =>
      mirrorStand(id, x, z, { side, color: side === 'w' ? '#ff9ec4' : '#9ec8ff' }),
    );
    crystal('c1', 14.8, 14);
    group.add(ghost);
    const dotM = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffcf8a').multiplyScalar(0.9),
      transparent: true,
      opacity: 0.5,
      toneMapped: false,
      depthWrite: false,
    });
    const dotG = new THREE.CircleGeometry(0.12, 10).rotateX(-Math.PI / 2);
    GHOST.forEach(([ax, az, bx, bz]) => {
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.8);
      for (let i = 0; i <= n; i++) {
        const d = new THREE.Mesh(dotG, dotM);
        d.position.copy(P(ax + ((bx - ax) * i) / n, 0.04, az + ((bz - az) * i) / n));
        ghost.add(d);
      }
    });
    // floor signs: ♥ west, ♠ east
    const sign = (txt, x, z, col) => {
      const t = LvKit.tex(512, 512, (g) => {
        g.fillStyle = col;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '360px Georgia';
        Icons.fillText(g, txt, 256, 270);
      });
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
      );
      m.position.copy(P(x, 0.03, z));
      group.add(m);
    };
    sign('♥', -8, 2, '#ff6f9a');
    sign('♠', 8, 2, '#c8d4ff');
    // ---- room 2 ----
    wall(-14, 38, 4, 0.5);
    wall(-6, 38, 4, 0.5);
    wall(2, 38, 4, 0.5);
    wall(13, 38, 6, 0.5);
    glassWall(-4, 57, 0.25, 38);
    wall(-14, 76, 4, 0.5);
    wall(-2, 76, 12, 0.5);
    wall(13, 76, 6, 0.5);
    door('d2w', -10, 76, 4);
    door('d2e', 7, 76, 6);
    emitter('e2', ROOM2.emitter.x, ROOM2.emitter.z, { color: '#ffcf8a' });
    Object.entries(ROOM2.targets).forEach(([id, [x, z, nx, nz]]) => {
      const g = new THREE.Group();
      g.position.copy(P(x, BY, z));
      g.lookAt(P(x + nx, BY, z + nz));
      group.add(g);
      const plate = add(new THREE.CircleGeometry(0.9, 40), Tex.mat('plaster', { color: '#ffffff', scale: 2, emissive: '#3a3644' }), 0, 0, 0.02, g);
      add(new THREE.TorusGeometry(0.92, 0.06, 8, 40), gold, 0, 0, 0.03, g);
      const dot = add(new THREE.CircleGeometry(0.18, 20), glow('#ffcf8a', 1), 0, 0, 0.05, g);
      targets[id] = { id, x, z, dot, plate };
    });
    ROOM2.sockets.forEach(([id, x, z]) => socket(id, x, z));
    ROOM2.racks.forEach(([id, x, z]) => socket(id, x, z, true));
    block('bm', 'mirror');
    block('bp', 'prism');
    block('bm2', 'mirror');
    crystal('c2a', 14.8, 62);
    crystal('c2b', -14.8, 62);
    // ---- corridor + arena ----
    wall(-9.75, 82, 12.5, 0.5);
    wall(9.75, 82, 12.5, 0.5);
    const arenaWall = new THREE.Mesh(
      new THREE.CylinderGeometry(18.2, 18.2, 9, 96, 1, true, Math.PI * 1.04, Math.PI * 1.92),
      Tex.mat('stone', { color: '#5e4e6b', scale: 3 }),
    );
    arenaWall.material = arenaWall.material.clone();
    arenaWall.material.side = THREE.BackSide;
    arenaWall.position.copy(P(0, 4.5, 100));
    group.add(arenaWall);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(18.1, 0.18, 8, 96).rotateX(Math.PI / 2), gold);
    rim.position.copy(P(0, 9, 100));
    group.add(rim);
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const x = Math.cos(a) * 19.2;
      const z = 100 - Math.sin(a) * 19.2;
      if (z < 84 && Math.abs(x) < 4) continue;
      K.collider(x, 4.5, z, 2.8, 9, 2.8);
    }
    // arena floor: a big inlaid rose of mirrors
    const rose = new THREE.Mesh(
      new THREE.CircleGeometry(17.4, 96).rotateX(-Math.PI / 2),
      Tex.mat('marble', { color: '#251c30', scale: 8, rough: 0.5 }),
    );
    rose.position.copy(P(0, 0.015, 100));
    group.add(rose);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.BoxGeometry(13, 0.02, 0.12), inlayMat);
      s.position.copy(P(Math.cos(a) * 9, 0.03, 100 - Math.sin(a) * 9));
      s.rotation.y = a;
      group.add(s);
    }
    [5, 12.5, 17].forEach((r) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 96).rotateX(Math.PI / 2), gold);
      t.position.copy(P(0, 0.03, 100));
      group.add(t);
    });
    ARENA.mirrors.forEach(([id, x, z]) => mirrorStand(id, x, z, { step: 15, color: '#ffcf8a' }));
    ARENA.wells.forEach(([id, x, z]) => emitter(id, x, z, { color: '#fff0f6' }));
    buildBoss();
    for (let i = 0; i < 4; i++) {
      telegraphs.push(makeTele());
      projectiles.push(makeProj());
    }
    ringWave.m = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.12, 6, 96).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff9ad0').multiplyScalar(1.6),
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    );
    ringWave.m.visible = false;
    group.add(ringWave.m);
    // title screen over the hall
    screen = makeScreen(12, 5, 1536);
    screen.mesh.position.copy(P(0, 6.5, -9.9));
    group.add(screen.mesh);
    // the card, revealed when the Guardian shatters
    card = LvKit.trialCard('d2', true);
    card.position.copy(P(0, 2.2, 100));
    group.add(card);
  };

  // ---------- per frame ----------
  const tmpV = V3();
  let traced = null;
  let sparkT = 0;

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the hall's own geometry, materials and canvas textures (the module's materials and
  // geometries made at script load lose their GPU copy only: three sends them again at the next
  // build), takes its colliders out (the doors' moving boxes included) and forgets every
  // reference build() made; the tables the level reads (mirrors, sockets, targets, crystals) are
  // emptied in place. The ghost path group is made at script load: emptied, and build() hangs it
  // back. Tex materials and the cards' textures are kept (shared).
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    const own = [gold, brass, darkMetal, mirrorMat, shardMat, glassMat, prismMat, gearGeo, beamGeo];
    const r = Life.free([group, ghost], own);
    r.world = 'tr_d2';
    r.colliders = Phys.drop('tr_d2');
    built = false;
    [doors, emitters, crystals, sockets, blocks, targets, boss].forEach(clear);
    Object.assign(boss, BOSS0());
    [rects, mirrors, telegraphs, projectiles, beamPool, decor].forEach((a) => (a.length = 0));
    beamUsed = 0;
    ringWave.m = null;
    ghost.visible = false;
    K = screen = card = traced = null;
    sparkT = 0;
    return r;
  };
  const angDamp = (cur, want, k, dt) => cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * (1 - Math.exp(-k * dt));

  const sources = (x) => {
    const out = [];
    if (x.stage <= 1) out.push({ x: ROOM1.emitter.x, z: ROOM1.emitter.z, a: 0, col: '#ff6f9a' });
    if (x.stage >= 1 && x.stage <= 3) {
      const tg = targets[x.aim] || targets.td;
      out.push({
        x: ROOM2.emitter.x,
        z: ROOM2.emitter.z,
        a: Math.atan2(-(tg.z - ROOM2.emitter.z), tg.x - ROOM2.emitter.x),
        col: '#ffcf8a',
      });
    }
    if (x.stage >= 4 && x.stage < 7) {
      [[x.aimA, '#6cc8ff'], [x.aimB, '#ff8fb8']].forEach(([wid, col]) => {
        const w = ARENA.wells.find((ww) => ww[0] === wid);
        if (!w) return;
        const m = mirrors.find((mm) => mm.id === w[3]);
        out.push({ x: w[1], z: w[2], a: Math.atan2(-(m.z - w[2]), m.x - w[1]), col });
      });
    }
    return out;
  };

  return {
    O,
    P,
    BY,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    build,
    unbuild,
    ROOM1,
    ROOM2,
    ARENA,
    mirrors,
    sockets,
    targets,
    crystals,
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(stage, who) {
      const d = who === 'dame' ? -1 : 1;
      if (stage >= 4) return P(d * 2, 0, 84.5);
      if (stage >= 2) return P(d === -1 ? -10 : 7, 0, 35);
      return P(d * 3, 0, -5);
    },
    // which side of a glass wall a local point is on
    side1: (q) => (q.x < 0 ? 'w' : 'e'),
    inRoom1: (q) => q.z > 4 && q.z < 32,
    inRoom2: (q) => q.z > 38 && q.z < 76,
    inArena: (q) => Math.hypot(q.x, q.z - 100) < 17.5 && q.z > 83,
    nearCard: (q) => Math.hypot(q.x, q.z - 100) < 3.2,
    // the mirror stand closest to q within reach
    nearMirror(q, set) {
      let best = null;
      let bd = 2.4;
      mirrors.forEach((m) => {
        if (set && !set.includes(m.id)) return;
        const d = Math.hypot(q.x - m.x, q.z - m.z);
        if (d < bd) {
          bd = d;
          best = m;
        }
      });
      return best;
    },
    nearSocket(q) {
      let best = null;
      let bd = 1.9;
      Object.values(sockets).forEach((s) => {
        const d = Math.hypot(q.x - s.x, q.z - s.z);
        if (d < bd) {
          bd = d;
          best = s;
        }
      });
      return best;
    },
    // Dame's aim: plaques in room 2, mirror stands in the arena (glass doesn't stop it)
    aim(origin, dir, kind) {
      const o = this.rel(origin);
      let best = null;
      let bd = 1e9;
      const test = (id, x, y, z, r) => {
        tmpV.set(x - o.x, y - o.y, z - o.z);
        const t = tmpV.dot(dir);
        if (t < 0.5) return;
        const px = o.x + dir.x * t - x;
        const py = o.y + dir.y * t - y;
        const pz = o.z + dir.z * t - z;
        if (px * px + py * py + pz * pz < r * r && t < bd) {
          bd = t;
          best = id;
        }
      };
      if (kind === 'plaque') Object.values(targets).forEach((tg) => test(tg.id, tg.x, BY, tg.z, 1.1));
      else ARENA.wells.forEach(([id, x, z]) => test(id, x, BY, z, 1.4));
      return best;
    },
    trace(x) {
      return trace(sources(x), x);
    },
    // world-space position of a local XZ point at beam height
    at: (x, z, y = BY) => P(x, y, z),
    update(dt, t, x, ctx) {
      if (!built) return null;
      screen.update(dt, t);
      // mirrors turn smoothly toward their angle; gears follow
      mirrors.forEach((m) => {
        const a = x.mirrors && x.mirrors[m.id];
        const want = a == null ? 0 : (a * Math.PI) / 180;
        if (m.cur == null) m.cur = want;
        const prev = m.cur;
        m.cur = angDamp(m.cur, want, 9, dt);
        m.head.rotation.y = m.cur;
        m.gear.rotation.y = m.cur * 2.5;
        m.gear2.rotation.y = -m.cur * 5;
        const moving = Math.abs(m.cur - prev) > 0.0005;
        m.ring.material.opacity = damp(m.ring.material.opacity, moving ? 0.9 : 0.32, 6, dt);
      });
      // emitters aim
      const ae = (id, tx, tz) => {
        const e = emitters[id];
        if (!e) return;
        const want = Math.atan2(-(tz - e.z), tx - e.x);
        if (e.cur == null) e.cur = want;
        e.cur = angDamp(e.cur, want, 7, dt);
        e.head.rotation.y = e.cur;
        e.lens.scale.setScalar(1 + Math.sin(t * 10) * 0.12);
      };
      ae('e1', 0, ROOM1.emitter.z);
      const tg = targets[x.aim] || targets.td;
      ae('e2', tg.x, tg.z);
      Object.values(targets).forEach((tt) => {
        const on = tt === tg;
        tt.dot.material.color.set(on ? '#ffcf8a' : '#7a6a80').multiplyScalar(on ? 1.6 : 0.6);
      });
      ARENA.wells.forEach(([id, , , mid]) => {
        const m = mirrors.find((mm) => mm.id === mid);
        ae(id, m.x, m.z);
        const on = x.aimA === id ? '#6cc8ff' : x.aimB === id ? '#ff8fb8' : null;
        emitters[id].lens.material.color.set(on || '#5a4a66').multiplyScalar(on ? 2.4 : 0.8);
      });
      // blocks: on a socket, or carried in front of whoever holds them
      Object.values(blocks).forEach((b) => {
        const st = x.blocks && x.blocks[b.id];
        if (!st) {
          b.g.visible = false;
          return;
        }
        b.g.visible = x.stage >= 1;
        let want;
        let ry = ((st.a || 0) * Math.PI) / 180;
        if (st.by) {
          // carried over the head, so the partner sees it too
          const p = ctx.pos(st.by);
          want = V3(p.x, p.y + 1.05 + Math.sin(t * 3) * 0.06, p.z);
          b.g.scale.setScalar(0.55);
        } else {
          const s = sockets[st.at];
          want = P(s.x, s.rack ? 0.1 : 0.18, s.z);
          b.g.scale.setScalar(1);
        }
        if (!b.cur || b.cur.distanceTo(want) > 6) b.cur = want.clone();
        b.cur.lerp(want, 1 - Math.exp(-14 * dt));
        b.g.position.copy(b.cur);
        if (b.ry == null) b.ry = ry;
        b.ry = angDamp(b.ry, ry, 9, dt);
        b.head.rotation.y = b.ry + (st.by ? t * 1.5 : 0);
      });
      Object.values(sockets).forEach((s) => {
        const full = x.blocks && Object.values(x.blocks).some((b) => b.at === s.id);
        s.ring.material.opacity = full ? 0.25 : 0.55 + Math.sin(t * 3) * 0.15;
      });
      // doors
      Object.entries(doors).forEach(([id, d]) => {
        const open = !!(x.open && x.open.includes(id));
        d.off = damp(d.off, open ? 7.4 : 0, 2.6, dt);
        d.g.position.y = O.y + d.off;
        d.b.on = !open && d.off < 4;
        d.seam.material.color.set(open ? '#4fd1b5' : '#ff9a3a').multiplyScalar(1.2);
      });
      // beams
      traced = trace(sources(x), x);
      beamUsed = 0;
      traced.segs.forEach(([ax, az, bx, bz, col]) => drawSeg(ax, az, bx, bz, col, t));
      for (let i = beamUsed; i < beamPool.length; i++) {
        beamPool[i].core.visible = false;
        beamPool[i].halo.visible = false;
      }
      sparkT -= dt;
      if (sparkT <= 0) {
        sparkT = 0.12;
        traced.hits.forEach(([hx, hz, col]) => Fx.burst(P(hx, BY, hz), col, 3, 2.2, 0.35, 1));
      }
      // crystals
      Object.values(crystals).forEach((c) => {
        const lit = traced.lit.has(c.id) || (x.solved && x.solved.includes(c.id));
        c.k = damp(c.k, lit ? 1 : 0, 4, dt);
        c.mat.emissiveIntensity = 0.15 + c.k * 1.6;
        c.light.intensity = c.k * 4;
        c.c.rotation.y += dt * (0.4 + c.k * 2.4);
        c.c.position.y = BY + Math.sin(t * 2 + c.x) * 0.06;
        c.small.forEach((s, i) => {
          const a = t * (0.8 + c.k * 2) + (i * Math.PI * 2) / 3;
          s.position.set(Math.cos(a) * 0.7, BY + Math.sin(t * 3 + i) * 0.15, Math.sin(a) * 0.7);
        });
        c.heart.material.color.set('#ff4f7a').multiplyScalar(0.6 + c.k * 1.4);
        c.heart.rotation.y = t;
      });
      // the Guardian
      const bs = x.boss;
      if (boss.g) {
        boss.g.visible = x.stage >= 4 && x.stage < 7;
        if (bs && boss.g.visible) {
          if (boss.gapCur == null) boss.gapCur = bs.gap;
          boss.gapCur = angDamp(boss.gapCur, bs.gap, 5, dt);
          boss.ring.rotation.y = boss.gapCur;
          // it faces the gap: it only looks at you when it is open
          boss.body.rotation.y = boss.gapCur + Math.PI / 2 + Math.sin(t * 0.4) * 0.12;
          boss.body.position.y = 3.2 + Math.sin(t * 1.2) * 0.2;
          if (boss.lastCr != null && x.cracks > boss.lastCr) boss.jolt = 1;
          boss.lastCr = x.cracks;
          boss.jolt = Math.max(0, (boss.jolt || 0) - dt * 1.2);
          const jo = Math.sin(boss.jolt * Math.PI) * (boss.jolt > 0 ? 1 : 0);
          boss.tiers.forEach((tr, j) => (tr.rotation.y = t * (j % 2 ? -0.25 : 0.2)));
          boss.shards.forEach((s) => {
            s.m.rotation.z = 0.28 + s.j * 0.06 + Math.sin(t * 1.6 + s.ph) * 0.05 + jo * 0.5;
            s.m.position.x = 1.85 - s.j * 0.48 + jo * 0.8;
          });
          boss.wings.forEach((w, i) => {
            w.rotation.z = Math.sin(t * 1.1) * 0.08 * (i ? -1 : 1) + jo * 0.3 * (i ? 1 : -1);
            w.rotation.x = -0.15 + Math.sin(t * 0.8) * 0.05;
          });
          boss.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 0.9 + i) * 0.12 - (bs.open ? 0.35 : 0)));
          boss.halo.rotation.y = t * 0.8;
          boss.veil.material.opacity = damp(boss.veil.material.opacity, bs.open ? 0 : 0.55 + Math.sin(t * 20) * 0.1, 6, dt);
          boss.crown.rotation.y = t * 0.6;
          const beat = traced.heart ? 1 : 0;
          boss.k = damp(boss.k, beat, 6, dt);
          boss.heart.material.emissiveIntensity = 0.6 + boss.k * 2.5 + Math.pow(Math.max(0, Math.sin(t * 3)), 8) * 0.6;
          boss.heart.rotation.y = boss.gapCur + Math.PI / 2;
          boss.heart.scale.setScalar(1 + boss.k * 0.15 + Math.sin(t * 6) * 0.03 * boss.k);
          boss.light.intensity = 2 + boss.k * 6;
          boss.eye.material.color.set(bs.phase >= 3 ? '#ff3a5a' : '#ff9a3a').multiplyScalar(2);
          boss.galaxy.U.uTime.value = t;
          boss.galaxy.U.uPx.value = R.renderer.getPixelRatio() * 0.32;
          boss.galaxy.U.uRed.value = bs.phase >= 3 ? 0.6 : 0;
          if (traced.heart && Math.random() < dt * 20)
            Fx.burst(P(0, BY, 100), '#ff6f9a', 6, 3, 0.4, 0);
        }
        // attacks: telegraph strip, then the shard flies
        const atk = (bs && bs.atk) || [];
        telegraphs.forEach((m, i) => {
          const a = atk[i];
          const p = projectiles[i];
          if (!a || !boss.g.visible) {
            m.visible = false;
            p.visible = false;
            return;
          }
          const age = ctx.age(a);
          const dx = Math.cos(a.ang);
          const dz = -Math.sin(a.ang);
          m.visible = age < a.wind + 0.15;
          if (m.visible) {
            m.position.copy(P(dx * 10.5, 0.05, 100 + dz * 10.5));
            m.rotation.y = a.ang;
            m.scale.set(16, 1, 2.2);
            const k = clamp(age / a.wind, 0, 1);
            m.material.opacity = 0.15 + k * 0.55 + (k > 0.7 ? Math.sin(t * 40) * 0.2 : 0);
          }
          const fl = age - a.wind;
          p.visible = fl > 0 && fl < 0.7;
          if (p.visible) {
            const d = 2.5 + fl * 32;
            p.position.copy(P(dx * d, BY, 100 + dz * d));
            p.lookAt(P(dx * (d + 1), BY, 100 + dz * (d + 1)));
          }
        });
        // ring wave
        const w = bs && bs.wave;
        const wage = w ? ctx.age(w) : 99;
        ringWave.m.visible = !!w && boss.g.visible && wage < 2.2;
        if (ringWave.m.visible) {
          const r = 3 + Math.max(0, wage - 0.6) * 10;
          ringWave.m.position.copy(P(0, 0.35, 100));
          ringWave.m.scale.set(r, wage < 0.6 ? 0.4 : 1, r);
          ringWave.m.material.opacity = wage < 0.6 ? 0.4 + Math.sin(t * 30) * 0.3 : 0.9;
        }
      }
      decor.forEach((ch, i) => (ch.rotation.y = t * 0.1 * (i % 2 ? 1 : -1)));
      ghost.visible = !!x.ghost && x.stage === 1;
      // a heartbeat while the light is on its heart
      if (traced.heart) {
        boss.beatT = (boss.beatT || 0) - dt;
        if (boss.beatT <= 0) {
          boss.beatT = 0.45;
          Sound.play('heart', 1);
        }
      }
      if (boss.col) boss.col.on = x.stage < 7;
      card.visible = x.stage === 7;
      if (card.visible) {
        card.rotation.y = t * 1.3;
        card.position.y = O.y + 2.2 + Math.sin(t * 2) * 0.15;
      }
      return traced;
    },
    // hit tests for the attacks, run by each player on themselves
    // swept test: did the shard's tip pass the player between the last frame and this one?
    shardHits(q, a, age, prev) {
      const f1 = age - a.wind;
      if (f1 < 0 || prev - a.wind > 0.8) return false;
      const d0 = 2.5 + Math.max(0, prev - a.wind) * 32 - 0.7;
      const d1 = 2.5 + Math.min(f1, 0.8) * 32 + 0.7;
      const dx = Math.cos(a.ang);
      const dz = -Math.sin(a.ang);
      const rx = q.x;
      const rz = q.z - 100;
      const along = rx * dx + rz * dz;
      const perp = Math.abs(rx * dz - rz * dx);
      return perp < 1.15 && along > d0 && along < d1 && q.y < 3;
    },
    // swept too: the ring passed under the player's feet since the last frame
    waveHits(q, w, age, prev, grounded) {
      if (age < 0.6 || prev > 2.2) return false;
      const r0 = 3 + Math.max(0, prev - 0.6) * 10 - 0.6;
      const r1 = 3 + Math.min(age - 0.6, 1.6) * 10 + 0.6;
      const d = Math.hypot(q.x, q.z - 100);
      return d > r0 && d < r1 && q.y < 0.9 && grounded;
    },
    shatter() {
      if (!boss.g) return;
      Fx.shatter(P(0, 5, 100));
      Fx.hearts(P(0, 3, 100));
      for (let i = 0; i < 6; i++) Fx.burst(P(0, 2 + i, 100), '#d9d4ff', 60, 9, 1.6, -6);
    },
  };
})();
