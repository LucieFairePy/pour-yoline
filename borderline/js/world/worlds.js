const Worlds = (() => {
  const OD = V3(-700, 80, 0);
  const OV = V3(0, 80, -700);
  const OC = V3(-350, 120, -350);
  const SYMS = ['♥', '♠', '♦', '♣'];
  const SYM_COL = ['#ff5f8a', '#c9c2ff', '#ffcf8a', '#7ce0ff'];
  const PED_X = [-4.5, -1.5, 1.5, 4.5];
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);

  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const wood = Tex.mat('wood', { color: '#2e1c12', scale: 2.5 });
  const floorMat = Tex.mat('wood', { color: '#3a2618', scale: 3.5, rough: 0.8 });
  const ceilMat = Tex.mat('plaster', { color: '#3a2a22', scale: 4 });
  const pedMat = Tex.mat('marble', { color: '#d8c8b8', scale: 1.5 });
  const plat = Tex.mat('stone', { color: '#3a3044', scale: 2.5, emissive: '#1a0a20' });
  // each crumbling slab shakes and fades on its own, so each gets its own material
  let crumbleN = 0;
  const crumbleMat = () =>
    Tex.mat('cobble', { color: '#5a2a38', scale: 2, emissive: '#3a0a18', id: crumbleN++ });
  let built = false;
  let role = 'dame';
  // the three worlds' state, as after a page load (factories: unbuild puts them back in place)
  const D0 = () => ({ tiles: [], peds: [], doors: [], screen: null });
  const V0 = () => ({
    moving: [],
    crumble: [],
    bridges: [],
    switches: [],
    wall: null,
    wallZ: -20,
    seg: -1,
    cp: 0,
    seqWall: null,
  });
  const C0 = () => ({ center: null });
  const D = D0();
  const V = V0();
  const C = C0();

  const sprite = (txt, size, color, font = 'bold 80px Georgia') => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.scale(4, 4);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 16;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    Icons.fillText(g, txt, 64, 68);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        toneMapped: false,
        depthWrite: false,
      }),
    );
    s.scale.setScalar(size);
    return s;
  };

  const box = (o, x, y, z, sx, sy, sz, mat, opt) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(o.x + x, o.y + y, o.z + z);
    group.add(m);
    const b = Phys.box(o.x + x, o.y + y, o.z + z, sx, sy, sz, opt);
    return { m, b };
  };

  const buildLibrary = (r) => {
    const o = OD;
    box(o, 0, -0.5, 20, 16, 1, 44, floorMat);
    box(o, -8.2, 4, 20, 0.4, 8, 44, wood);
    box(o, 8.2, 4, 20, 0.4, 8, 44, wood);
    box(o, 0, 4, -2.2, 16.8, 8, 0.4, wood);
    box(o, 0, 8.2, 20, 16.8, 0.4, 44, ceilMat);
    [14, 28].forEach((z, i) => {
      box(o, -5, 4, z, 6, 8, 0.4, wood);
      box(o, 5, 4, z, 6, 8, 0.4, wood);
      box(o, 0, 6, z, 4, 4, 0.4, wood);
      const door = box(
        o,
        0,
        2,
        z,
        4,
        4,
        0.3,
        new THREE.MeshStandardMaterial({
          color: '#4a2a18',
          emissive: '#ffcf8a',
          emissiveIntensity: 0.15,
        }),
        { dyn: true },
      );
      door.y = 0;
      D.doors.push(door);
    });
    const BK = ['#7a2a3a', '#2a4a7a', '#7a6a2a', '#3a6a4a', '#5a2a6a', '#8a4a2a'];
    const books = [];
    for (const side of [-1, 1])
      for (let z = 1; z < 41; z += 1.1)
        for (let shelf = 0; shelf < 5; shelf++) {
          if (r() < 0.12) continue;
          books.push([
            side * 7.7,
            0.6 + shelf * 1.4,
            z + r() * 0.3,
            BK[(r() * BK.length) | 0],
            0.3 + r() * 0.25,
          ]);
        }
    // bookshelves are solid: you bump into the books, not into the wall behind them
    for (const side of [-1, 1]) Phys.box(o.x + side * 7.7, o.y + 4, o.z + 20, 0.6, 8, 42);
    const inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 1, 0.22),
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      books.length,
    );
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    books.forEach(([x, y, z, c, h], i) => {
      m4.makeScale(1, h * 2.6, 1).setPosition(o.x + x, o.y + y, o.z + z);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, col.set(c));
    });
    inst.frustumCulled = false;
    group.add(inst);
    for (let i = 0; i < 9; i++) {
      const gx = (i % 3) - 1;
      const gz = ((i / 3) | 0) - 1;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.12, 2),
        new THREE.MeshStandardMaterial({
          color: '#2a1810',
          emissive: '#ffcf8a',
          emissiveIntensity: 0,
        }),
      );
      m.position.set(o.x + gx * 2.4, o.y + 0.06, o.z + 7 + gz * 2.4);
      group.add(m);
      D.tiles.push({ m, x: gx * 2.4, z: 7 + gz * 2.4 });
    }
    PED_X.forEach((x, k) => {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 1.1, 16).translate(0, 0.55, 0),
        pedMat,
      );
      p.position.set(o.x + x, o.y, o.z + 21);
      group.add(p);
      Phys.box(o.x + x, o.y + 0.55, o.z + 21, 1, 1.1, 1);
      const s = sprite(SYMS[k], 1, SYM_COL[k]);
      s.position.set(o.x + x, o.y + 1.8, o.z + 21);
      group.add(s);
      D.peds.push({ x, s, k });
    });
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.15, 8, 32, Math.PI),
      glow('#ffcf8a', 1.6),
    );
    arch.position.set(o.x, o.y, o.z + 41.5);
    group.add(arch);
    [-2.6, 2.6].forEach((x) => Phys.box(o.x + x, o.y + 0.9, o.z + 41.5, 0.3, 1.8, 0.3));
    const lampMat = glow('#ffcf8a', 1.5);
    for (let z = 3; z < 42; z += 7) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lampMat);
      l.position.set(o.x, o.y + 7.4, o.z + z);
      group.add(l);
    }
    D.light = new THREE.PointLight('#ffcf8a', 1.4, 30, 1.5);
    D.light.position.set(o.x, o.y + 6, o.z + 18);
    group.add(D.light);
    D.screen = makeScreen(6, 2.4, 512);
    D.screen.mesh.position.set(o.x, o.y + 5.5, o.z - 1.95);
    group.add(D.screen.mesh);
  };

  const P_A = [
    [0, 0, 7, 3, 3],
    [2, 0.8, 11.5, 3, 3],
    [-1, 1.4, 16, 3, 3],
    [-1, 1.4, 21.5, 2.6, 2.6, 'mx'],
    [2, 0.6, 27, 3, 3],
    [0, 0, 32, 3, 3, 'c'],
  ];
  const P_B = [
    [3, 0.9, 64.5, 3, 3],
    [-1, 1.6, 69, 2.6, 2.6],
    [-4, 1.6, 74, 2.6, 2.6, 'mz'],
    [-1, 0.7, 80, 3, 3, 'c'],
    [3, 0, 85, 3, 3],
    [9, 1.2, 85, 2.5, 2.5],
  ];
  // never a crumbling slab right before a moving one: you have to wait there for it
  const P_C = [
    [-3, 1, 118.5, 2.6, 2.6],
    [0, 2, 124, 2.6, 2.6, 'mx'],
    [4, 2.8, 129, 2.6, 2.6],
    [1, 1.8, 135, 3, 3, 'c'],
    [-2, 1, 140, 3, 3],
  ];
  const CPS = [
    { z: 0, sz: 6, at: V3(0, 0, 0) },
    { z: 39, sz: 6, at: V3(0, 0, 39) },
    { z: 57, sz: 6, at: V3(0, 0, 57) },
    { z: 92, sz: 8, at: V3(0, 0, 92) },
    { z: 111, sz: 6, at: V3(0, 0, 111) },
    { z: 149, sz: 8, at: V3(0, 0, 149) },
  ];
  const SEGS = [
    { from: 3, to: 36, start: -12, cp: 0 },
    { from: 60, to: 88, start: 48, cp: 2 },
    { from: 114, to: 145, start: 102, cp: 4 },
  ];

  const buildParkour = () => {
    const o = OV;
    CPS.forEach((c) => box(o, 0, -0.5, c.z, 8, 1, c.sz, plat));
    const addPlats = (list) =>
      list.forEach(([x, y, z, sx, sz, kind]) => {
        if (kind === 'mx' || kind === 'mz') {
          const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.6, sz), glow('#7ce0ff', 0.5));
          group.add(m);
          const b = Phys.add([0, 0, 0], [0, 0, 0], { dyn: true });
          V.moving.push({ m, b, x, y, z, sx, sz, axis: kind === 'mx' ? 'x' : 'z', ph: z });
        } else if (kind === 'c') {
          const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.6, sz), crumbleMat());
          m.position.set(o.x + x, o.y + y - 0.3, o.z + z);
          group.add(m);
          const b = Phys.box(o.x + x, o.y + y - 0.3, o.z + z, sx, 0.6, sz, { dyn: true });
          V.crumble.push({ m, b, x, y, z, sx, sz, t: 0, gone: 0 });
        } else box(o, x, y - 0.3, z, sx, 0.6, sz, plat);
      });
    addPlats(P_A);
    addPlats(P_B);
    addPlats(P_C);
    [
      [48, 12],
      [102, 12],
    ].forEach(([z, len]) => {
      // wide enough to step on from the switch side without lining up exactly
      const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, len), glow('#ffcf8a', 0.9));
      m.position.set(o.x, o.y - 0.2, o.z + z);
      m.visible = false;
      group.add(m);
      const b = Phys.box(o.x, o.y - 0.2, o.z + z, 6, 0.4, len, { dyn: true });
      b.on = false;
      V.bridges.push({ m, b });
    });
    [94, 151].forEach((z, i) => {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.2, 0.6).translate(0, 0.6, 0),
        glow('#ff5f8a', 0.6),
      );
      s.position.set(o.x + (i ? 0 : 3), o.y, o.z + z);
      group.add(s);
      // the switch post is solid (you used to walk through it)
      Phys.box(o.x + (i ? 0 : 3), o.y + 0.6, o.z + z, 0.6, 1.2, 0.6);
      V.switches.push({ m: s, x: i ? 0 : 3, z });
    });
    V.wall = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 30),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff1a3a').multiplyScalar(1.4),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    V.wall.visible = false;
    group.add(V.wall);
  };

  const buildConverge = () => {
    const o = OC;
    box(o, 0, -0.5, -11, 5, 1, 5, plat);
    box(o, 0, -0.5, 11, 5, 1, 5, plat);
    const heart = new THREE.Mesh(new THREE.TorusGeometry(3, 0.12, 8, 48), glow('#ff5f8a', 2));
    heart.position.set(o.x, o.y + 3, o.z);
    // faces both platforms (they sit on the z axis)
    group.add(heart);
    C.heart = heart;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 8, 24), glow('#ff4f86', 2.2));
    ring.position.set(o.x, o.y + 5, o.z - 1);
    group.add(ring);
    C.ring = ring.position.clone();
    C.center = V3(o.x, o.y + 3, o.z);
  };

  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = (myRole, seed) => {
    if (built) return;
    Phys.owner('worlds');
    try {
      make(myRole, seed);
    } finally {
      Phys.owner(null);
    }
  };
  const make = (myRole, seed) => {
    built = true;
    role = myRole;
    group.visible = true;
    const r = rng(seed + 505);
    buildLibrary(r);
    buildParkour();
    buildConverge();
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the three worlds' own geometry, materials and canvas textures (the library light and
  // the sequence wall live in the group), takes the colliders out (doors, moving and crumbling
  // slabs, bridges included) and puts D, V and C back as after a page load. The group is made at
  // script load: it stays in the scene, empty and hidden. The Tex materials (module-level ones
  // and the crumbling slabs', cached by id) are shared: crumbleN starts again at 0 so the next
  // build takes the same cached ones instead of adding new ones to the cache.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    const r = Life.free([group]);
    r.world = 'worlds';
    r.colliders = Phys.drop('worlds');
    built = false;
    group.visible = false;
    [[D, D0], [V, V0], [C, C0]].forEach(([o, f]) => {
      clear(o);
      Object.assign(o, f());
    });
    crumbleN = 0;
    role = 'dame';
    return r;
  };

  const vrel = (p) => V3(p.x - OV.x, p.y - OV.y, p.z - OV.z);
  const drel = (p) => V3(p.x - OD.x, p.y - OD.y, p.z - OD.z);

  return {
    OD,
    OV,
    OC,
    SYMS,
    SYM_COL,
    build,
    unbuild,
    get built() {
      return built;
    },
    get C() {
      return C;
    },
    get dscreen() {
      return D.screen;
    },
    vrel,
    drel,
    spawnDame: () => V3(OD.x, OD.y, OD.z + 1),
    spawnValet: (cp = 0) => V3(OV.x + CPS[cp].at.x, OV.y, OV.z + CPS[cp].at.z),
    spawnConverge: (who) => V3(OC.x, OC.y, OC.z + (who === 'dame' ? -11 : 11)),
    tileAt(p) {
      const q = drel(p);
      if (q.y > 1) return -1;
      return D.tiles.findIndex((t) => Math.abs(q.x - t.x) < 1.05 && Math.abs(q.z - t.z) < 1.05);
    },
    pedAt(p) {
      const q = drel(p);
      if (Math.abs(q.z - 20) > 1.6 || q.z > 21.5) return -1;
      return PED_X.findIndex((x) => Math.abs(q.x - x) < 0.9);
    },
    switchAt(p) {
      const q = vrel(p);
      return V.switches.findIndex(
        (s) => Math.hypot(q.x - s.x, q.z - s.z) < 1.6 && Math.abs(q.y) < 1.5,
      );
    },
    dameEnd: (p) => {
      const q = drel(p);
      return q.z > 37 && Math.abs(q.y) < 2;
    },
    valetEnd: (p) => {
      const q = vrel(p);
      return q.z > 145 && Math.abs(q.y) < 2;
    },
    inZone: (p) => C.center && p.distanceTo(C.center) < 4,
    get ring() {
      return C.ring;
    },
    showSeq(seq) {
      if (!built || V.seqWall || role !== 'valet') return;
      const g = new THREE.Group();
      seq.forEach((k, i) => {
        const s = sprite(SYMS[k], 1.4, SYM_COL[k]);
        s.position.set((i - (seq.length - 1) / 2) * 1.4, 0, 0);
        g.add(s);
        const n = sprite(String(i + 1), 0.6, '#e8bd84', 'bold 64px monospace');
        n.position.set((i - (seq.length - 1) / 2) * 1.4, -1, 0);
        g.add(n);
      });
      g.position.set(OV.x - 2, OV.y + 3, OV.z + 95.5);
      group.add(g);
      V.seqWall = g;
    },
    update(dt, t, x, me) {
      if (!built) return;
      D.tiles.forEach((tile, i) => {
        tile.m.material.emissiveIntensity = damp(
          tile.m.material.emissiveIntensity,
          x.lights[i] ? 1.4 : 0.02,
          8,
          dt,
        );
      });
      const inp = x.input || [];
      D.peds.forEach((pd, k) => pd.s.scale.setScalar(inp.includes(k) ? 1.35 : 1));
      [x.s1, x.s2].forEach((open, i) => {
        const d = D.doors[i];
        d.y = damp(d.y, open ? 4.2 : 0, 3, dt);
        d.m.position.y = OD.y + 2 + d.y;
        d.b.on = !open;
      });
      [x.p1, x.p2].forEach((on, i) => {
        V.bridges[i].m.visible = on;
        V.bridges[i].b.on = on;
      });
      [x.s1, x.s2].forEach((on, i) => {
        V.switches[i].m.material.color
          .set(on ? '#7ce0ff' : '#ff5f8a')
          .multiplyScalar(on ? 1.8 : 0.6);
      });
      V.moving.forEach((mv) => {
        const off = Math.sin(t * 0.9 + mv.ph) * (mv.axis === 'x' ? 3 : 2);
        const px = OV.x + mv.x + (mv.axis === 'x' ? off : 0);
        const pz = OV.z + mv.z + (mv.axis === 'z' ? off : 0);
        const py = OV.y + mv.y - 0.3;
        if (role === 'valet' && Player.body.ground === mv.b) {
          Player.body.p.x += px - mv.m.position.x;
          Player.body.p.z += pz - mv.m.position.z;
        }
        mv.m.position.set(px, py, pz);
        mv.b.min = [px - mv.sx / 2, py - 0.3, pz - mv.sz / 2];
        mv.b.max = [px + mv.sx / 2, py + 0.3, pz + mv.sz / 2];
      });
      V.crumble.forEach((cr) => {
        if (cr.gone > 0) {
          cr.gone -= dt;
          if (cr.gone <= 0) {
            cr.b.on = true;
            cr.m.visible = true;
            cr.t = 0;
            cr.m.position.y = OV.y + cr.y - 0.3;
          }
          return;
        }
        if (role === 'valet' && Player.body.ground === cr.b) cr.t += dt;
        else if (cr.t > 0) cr.t += dt;
        if (cr.t > 0) cr.m.position.x = OV.x + cr.x + Math.sin(t * 60) * 0.05 * cr.t;
        if (cr.t > 0.7) {
          cr.b.on = false;
          cr.m.position.y -= dt * 12;
        }
        if (cr.t > 1.6) {
          cr.m.visible = false;
          cr.gone = 3;
        }
      });
      if (C.heart) {
        C.heart.rotation.z = t * 0.5;
        C.heart.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      }
      D.screen.update(dt, t);
      if (role !== 'valet' || !me || x.stage !== 'worlds') {
        V.wall.visible = false;
        return null;
      }
      const q = vrel(me);
      CPS.forEach((c, i) => {
        if (Math.abs(q.z - c.at.z) < c.sz / 2 && Math.abs(q.x) < 4 && Math.abs(q.y) < 1 && i > V.cp)
          V.cp = i;
      });
      const seg = SEGS.findIndex((s) => q.z > s.from && q.z < s.to);
      if (seg !== V.seg) {
        if (seg >= 0) V.wallZ = SEGS[seg].start;
        V.seg = seg;
      }
      V.wall.visible = seg >= 0;
      if (seg >= 0) {
        V.wallZ += dt * 2;
        V.wall.position.set(OV.x, OV.y, OV.z + V.wallZ);
        if (V.wallZ > q.z - 0.4) {
          V.seg = -1;
          return 'caught';
        }
      }
      return null;
    },
    get cp() {
      return V.cp;
    },
    get moving() {
      return V.moving;
    },
  };
})();
