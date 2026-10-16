const Garde = (() => {
  const O = V3(-700, 80, 700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  // dark green-black veined marble and gilded bronze trims (js/world/textures.js)
  const stone = Tex.mat('marble', { color: '#2a2a27', scale: 7, rough: 2.2, bump: 0.6 });
  const trim = Tex.mat('metal', {
    color: '#8a6a3a',
    metal: 0.8,
    rough: 1.0,
    scale: 2,
    emissive: '#140c04',
  });
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  let built = false;
  let gate = null;
  let gateY = 0;
  let lasers = null;
  let sw = null;
  let plates = {};
  let screen = null;
  const fires = [];

  const solid = (x, y, z, sx, sy, sz, mat = stone, opt) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.copy(P(x, y, z));
    group.add(m);
    const b = Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
    return { m, b };
  };

  const edges = (cx, cz, w, d, c = '#ffb45a') => {
    const mat = glow(c, 1.1);
    [
      [cx, cz - d / 2, w, 0.08],
      [cx, cz + d / 2, w, 0.08],
      [cx - w / 2, cz, 0.08, d],
      [cx + w / 2, cz, 0.08, d],
    ].forEach(([x, z, sx, sz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), mat);
      m.position.copy(P(x, 0.03, z));
      group.add(m);
    });
  };

  // the colliders made while building belong to the world (Phys.drop on unbuild); the phases
  // 'garde' and 'stand' (and the lab rooms) all build it
  const build = () => {
    if (built) return;
    Phys.owner('garde');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    group.visible = true;
    solid(0, -0.5, 0, 14, 1, 12);
    edges(0, 0, 14, 12);
    // walkway from the start platform to the hall (there was a 6 m drop into the void)
    solid(0, -0.5, 9, 6, 1, 6.2);
    edges(0, 9, 6, 6.2);
    solid(0, -0.5, 30, 36, 1, 36);
    edges(0, 30, 36, 36);
    [
      [-9, 22, 4, 0.6],
      [8, 26, 4, 0.6],
      [-4, 36, 0.6, 4],
      [10, 40, 3, 0.6],
      [-11, 41, 3, 0.6],
      [2, 18, 3, 0.6],
    ].forEach(([x, z, sx, sz]) => solid(x, 0.6, z, sx, 1.2, sz, trim));
    [
      [-15, 15],
      [15, 15],
      [-15, 45],
      [15, 45],
    ].forEach(([x, z]) => {
      solid(x, 3, z, 1.4, 6, 1.4, trim);
      const l = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 8), glow('#ff8a3a', 2));
      l.position.copy(P(x, 6.6, z));
      group.add(l);
      fires.push(l);
    });
    gate = solid(
      0,
      2.5,
      48,
      8,
      5,
      0.4,
      new THREE.MeshStandardMaterial({
        color: '#2a1020',
        emissive: '#ff2a3a',
        emissiveIntensity: 0.25,
        metalness: 0.6,
        roughness: 0.3,
      }),
      { dyn: true },
    );
    solid(-11, 2.5, 48, 14, 5, 0.6, trim);
    solid(11, 2.5, 48, 14, 5, 0.6, trim);
    // the gate wall runs on, unseen, past the hall's edges: a double jump around its end landed
    // in the arena (enemies ignore 'nocam' boxes)
    [-1, 1].forEach((s) => Phys.box(O.x + s * 25, O.y + 1, O.z + 48, 14, 22, 0.6, { tag: 'nocam' }));
    solid(0, -0.5, 51.5, 8, 1, 7);
    solid(0, -0.5, 80, 50, 1, 50);
    edges(0, 80, 50, 50, '#ffcf8a');
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const x = Math.cos(a) * 21;
      const z = 80 + Math.sin(a) * 21;
      if (z > 95 && Math.abs(x) < 9) continue;
      solid(x, 4, z, 1.6, 8, 1.6, trim);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), glow('#ffcf8a', 2));
      c.position.copy(P(x, 8.8, z));
      group.add(c);
    }
    solid(0, 0.4, 94, 12, 0.8, 4, trim);
    // a step up to the throne dais (0.8 m was a jump-only ledge right where the fight happens)
    solid(0, 0.2, 91.5, 12, 0.4, 1, trim);
    solid(0, 0.2, 96.5, 12, 0.4, 1, trim);
    // the switch's alcove and its laser grid are 5.5 m / 5 m tall: from the dais a double jump
    // cleared a 3.6 m grid without the Voile
    solid(-6.3, 2.75, 100.5, 0.6, 5.5, 8, trim);
    solid(6.3, 2.75, 100.5, 0.6, 5.5, 8, trim);
    solid(0, 2.75, 104.8, 13.2, 5.5, 0.6, trim);
    lasers = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 5, 0.04), glow('#ff1a3a', 3));
      l.position.copy(P(-5.5 + i, 2.5, 97));
      lasers.add(l);
    }
    for (let j = 0; j < 5; j++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(12, 0.04, 0.04), glow('#ff1a3a', 3));
      l.position.copy(P(0, 0.4 + j * 1.1, 97));
      lasers.add(l);
    }
    group.add(lasers);
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 1.1, 10).translate(0, 0.55, 0),
      trim,
    );
    ped.position.copy(P(0, 0, 102.5));
    sw = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16), glow('#6cc8ff', 2));
    sw.position.copy(P(0, 1.16, 102.5));
    group.add(ped, sw);
    Phys.box(O.x, O.y + 0.55, O.z + 102.5, 1, 1.1, 1);
    [
      ['dame', -12, '#ff5f8a', '♥'],
      ['valet', 12, '#6cc8ff', '♠'],
    ].forEach(([who, x, c]) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(c).multiplyScalar(0.4),
          toneMapped: false,
        }),
      );
      m.position.copy(P(x, 0.06, 72));
      group.add(m);
      plates[who] = { m, pos: P(x, 0, 72), c: new THREE.Color(c) };
    });
    screen = makeScreen(14, 7, 1024);
    screen.mesh.position.copy(P(0, 13, 107));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    dress();
  };

  // ---------- set dressing: no colliders; outside the floors, on them only flat ----------
  const amb = { haze: new THREE.Color('#1c1210'), sky: null, dust: null };
  const dress = () => {
    const box = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
    const marbleB = LvKit.batch();
    const goldB = LvKit.batch();
    const rock = Tex.mat('rock', { color: '#2e2a28', scale: 7 });
    const rockB = LvKit.batch();
    const cone = new THREE.ConeGeometry(1, 1, 6);
    const r = rng(717);
    // the floors float: rock and marble keels under each of them
    [
      [0, 0, 14, 12],
      [0, 30, 36, 36],
      [0, 80, 50, 50],
    ].forEach(([cx, cz, w, d]) => {
      rockB.add(cone, P(cx, -1 - w * 0.35, cz), [Math.PI, Math.PI / 6, 0], [w * 0.6, w * 0.7, d * 0.6]);
      for (let i = 0; i < 6; i++) {
        const k = 2 + r() * 3;
        rockB.add(cone, P(cx + (r() - 0.5) * w * 0.8, -1.5 - k, cz + (r() - 0.5) * d * 0.8), [Math.PI, r() * 3, 0], [k, k * 2.4, k]);
      }
    });
    group.add(rockB.mesh(rock));
    // a colonnade standing in the void along the hall, an entablature on top
    const col = new THREE.CylinderGeometry(0.55, 0.65, 13, 14);
    [-1, 1].forEach((s) => {
      for (let z = 14; z <= 46; z += 8) {
        marbleB.add(col, P(s * 19.6, 5.5, z));
        goldB.add(box(1.7, 0.5, 1.7), P(s * 19.6, 12.2, z));
        goldB.add(box(1.7, 0.6, 1.7), P(s * 19.6, -0.7, z));
        rockB.add(cone, P(s * 19.6, -4, z), [Math.PI, 0, 0], [1.2, 6, 1.2]);
      }
      marbleB.add(box(1.6, 1, 34), P(s * 19.6, 12.9, 30));
      goldB.add(box(1.7, 0.15, 34.1), P(s * 19.6, 12.35, 30));
    });
    // the arena: tall banner poles round it, outside the floor
    const bannerT = LvKit.tex(256, 768, (g, w, h) => {
      g.fillStyle = '#5a0e16';
      g.fillRect(0, 0, w, h);
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0.35)');
      grd.addColorStop(0.5, 'rgba(255,255,255,0.06)');
      grd.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a050';
      g.lineWidth = 10;
      g.strokeRect(14, 14, w - 28, h - 70);
      g.fillStyle = '#d8b060';
      Icons.draw(g, Icons.of('♠'), w / 2, h * 0.36, 120);
      // crown
      g.beginPath();
      g.moveTo(w / 2 - 60, h * 0.6);
      g.lineTo(w / 2 - 60, h * 0.52);
      g.lineTo(w / 2 - 30, h * 0.56);
      g.lineTo(w / 2, h * 0.5);
      g.lineTo(w / 2 + 30, h * 0.56);
      g.lineTo(w / 2 + 60, h * 0.52);
      g.lineTo(w / 2 + 60, h * 0.6);
      g.closePath();
      g.fill();
      // swallow-tail cut at the bottom
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(w / 2, h - 56);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    });
    const bannerB = LvKit.batch();
    // (on the square's outline, facing in; none in front of the gate)
    [
      ...[62, 74, 86, 98].flatMap((z) => [[-26.5, z, -Math.PI / 2], [26.5, z, Math.PI / 2]]),
      ...[-22, -12, 12, 22].map((x) => [x, 106.5, Math.PI]),
      ...[-22, -14, 14, 22].map((x) => [x, 53.5, 0]),
    ].forEach(([x, z, a]) => {
      goldB.add(box(0.22, 30, 0.22), P(x, 2, z));
      goldB.add(new THREE.SphereGeometry(0.35, 10, 8), P(x, 17.2, z));
      goldB.add(box(3.2, 0.12, 0.12), P(x, 14.6, z), [0, -a, 0]);
      bannerB.add(new THREE.PlaneGeometry(2.8, 8.4), P(x, 10.3, z), [0, -a, 0]);
      rockB.add(cone, P(x, -13.5, z), [Math.PI, 0, 0], [0.8, 3, 0.8]);
    });
    // guard statues: tall chess pawns and kings in dark marble, outside the floors
    const pawn = new THREE.LatheGeometry(
      [
        [0, 0], [1.1, 0], [1.1, 0.35], [0.85, 0.5], [0.8, 0.7], [0.5, 1.0], [0.38, 2.2], [0.75, 2.4],
        [0.75, 2.55], [0.42, 2.7], [0.62, 3.05], [0.6, 3.45], [0.38, 3.75], [0, 3.82],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      18,
    );
    [
      [-8.4, -5], [8.4, -5], [-8.4, 5], [8.4, 5],
      [-19.6, 50.5], [19.6, 50.5], [-27.4, 57], [27.4, 57],
    ].forEach(([x, z]) => {
      marbleB.add(pawn, P(x, 0, z), null, [1.2, 1.2, 1.2]);
      goldB.add(box(2.8, 0.5, 2.8), P(x, -0.25, z));
      rockB.add(cone, P(x, -2.5, z), [Math.PI, 0, 0], [1.6, 4, 1.6]);
    });
    // the empty throne, on its own floating dais behind the switch's alcove
    const velvet = new THREE.MeshStandardMaterial({ color: '#6a0c18', roughness: 0.85 });
    const velB = LvKit.batch();
    goldB.add(box(9, 1.4, 6), P(0, 0.2, 112));
    goldB.add(box(7, 0.6, 5), P(0, 1.2, 112));
    goldB.add(box(5.4, 1.4, 3.2), P(0, 2.2, 112.4));
    velB.add(box(3.6, 0.5, 2.6), P(0, 3.15, 112.2));
    velB.add(box(3.6, 6, 0.5), P(0, 5.9, 113.6));
    goldB.add(box(4.6, 7.4, 0.4), P(0, 5.5, 114));
    [-2.1, 2.1].forEach((x) => {
      goldB.add(box(0.6, 2.2, 3), P(x, 3.6, 112.4));
      goldB.add(new THREE.SphereGeometry(0.4, 12, 8), P(x, 9.5, 114));
    });
    goldB.add(new THREE.ConeGeometry(1, 1.2, 5), P(0, 9.6, 114));
    rockB.add(cone, P(0, -6, 112), [Math.PI, 0, 0], [5, 10, 3.6]);
    group.add(marbleB.mesh(stone), goldB.mesh(trim), velB.mesh(velvet), bannerB.mesh(
      new THREE.MeshStandardMaterial({ map: bannerT, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
    ));
    // a red carpet from the gate to the dais, and the royal seal in the hall
    const carpetT = LvKit.tex(256, 1024, (g, w, h) => {
      LvKit.grain(g, w, h, '#4a0a10', 0.08, 8000);
      g.strokeStyle = '#c9a050';
      g.lineWidth = 8;
      g.strokeRect(14, -10, w - 28, h + 20);
      g.lineWidth = 3;
      g.strokeRect(28, -10, w - 56, h + 20);
      g.fillStyle = 'rgba(201,160,80,0.5)';
      for (let y = 64; y < h; y += 128) Icons.draw(g, Icons.of('♠'), w / 2, y, 40);
    });
    carpetT.wrapT = THREE.RepeatWrapping;
    const decal = (map, opt = {}) =>
      new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        roughness: 0.95,
        ...opt,
      });
    const carpetB = LvKit.batch();
    const runner = (z0, z1) => {
      const g = new THREE.PlaneGeometry(4, z1 - z0).rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * ((z1 - z0) / 16));
      carpetB.add(g, P(0, 0.012, (z0 + z1) / 2));
    };
    runner(-5, 12);
    runner(54.5, 90.5);
    group.add(carpetB.mesh(decal(carpetT, { color: '#b8a8a0' })));
    const sealT = LvKit.tex(1024, 1024, (g, w) => {
      g.translate(w / 2, w / 2);
      g.strokeStyle = 'rgba(201,160,80,0.75)';
      [480, 455, 330].forEach((rad, i) => {
        g.lineWidth = i === 1 ? 5 : 12;
        g.beginPath();
        g.arc(0, 0, rad, 0, TAU);
        g.stroke();
      });
      g.fillStyle = 'rgba(201,160,80,0.6)';
      for (let k = 0; k < 16; k++) {
        g.save();
        g.rotate((k / 16) * TAU);
        g.beginPath();
        g.moveTo(0, -455);
        g.lineTo(18, -340);
        g.lineTo(-18, -340);
        g.closePath();
        g.fill();
        g.restore();
      }
      Icons.draw(g, Icons.of('♠'), 0, 0, 300);
    });
    const seal = new THREE.Mesh(new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2), decal(sealT));
    seal.position.copy(P(0, 0.014, 30));
    group.add(seal);
    // warm lights: the start, the hall, the arena and the throne
    [
      [0, 6, 0, 1.2, 18],
      [-9, 8, 24, 1.3, 26],
      [9, 8, 38, 1.3, 26],
      [-12, 9, 72, 1.4, 30],
      [12, 9, 88, 1.4, 30],
      [0, 8, 109, 1.6, 20],
    ].forEach(([x, y, z, i, d]) => LvKit.light(group, P(x, y + 4, z), '#ffc890', i * 0.8, d + 6));
    amb.sky = LvKit.sky({
      hor: '#4a2418',
      zen: '#05060e',
      cloud: '#3a1c18',
      cloudK: 0.55,
      stars: 0.6,
      glow: '#a0461c',
      glowDir: V3(0, 0, 1),
    });
    amb.dust = LvKit.motes({
      n: 360,
      size: 1.8,
      colors: ['#ffd27a', '#ff9a4a'],
      rise: [0.05, 0.35],
      sway: 1,
      box: [44, 16],
      alpha: 0.5,
      seed: 77,
    });
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the hall's own geometry, materials and canvas textures (and the sky and embers LvKit
  // put in the scene), takes its colliders out and forgets every reference build() made; plates
  // is emptied in place (the level reads it on entry). The stone, trim and rock materials are
  // Tex's (shared). The firing range's targets (js/levels/stand.js) are its own, not the world's.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    const out = [amb.sky, amb.dust].filter(Boolean);
    out.forEach((o) => R.scene.remove(o));
    const r = Life.free([group], [out]);
    r.world = 'garde';
    r.colliders = Phys.drop('garde');
    built = false;
    group.visible = false;
    clear(plates);
    fires.length = 0;
    gate = lasers = sw = screen = null;
    amb.sky = amb.dust = null;
    gateY = 0;
    return r;
  };

  return {
    O,
    P,
    group,
    build,
    unbuild,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get plates() {
      return plates;
    },
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(stage, who) {
      const s = who === 'dame' ? -2.5 : 2.5;
      return stage >= 4 ? P(s, 0, 58) : P(s, 0, 2);
    },
    inRoom: (q) => q.z > 13 && q.z < 47.5 && Math.abs(q.x) < 18 && q.y > -1,
    inArena: (q) => q.z > 57 && q.y > -1,
    bossPos: () => P(0, 0, 90),
    // a royal dusk: warm light, a sky of its own, drifting embers (restored on exit)
    mood(on) {
      if (!on || !built) return LvKit.mood(null);
      LvKit.mood({
        sky: '#d8a888',
        ground: '#24160e',
        hemi: 0.5,
        sun: '#ffc08a',
        // high and behind the usual view: a low sun ahead glared on the polished marble
        sunI: 0.6,
        sunPos: V3(-40, 120, -60),
        exposure: 1.3,
        haze: amb.haze,
        extras: [amb.sky, amb.dust],
      });
    },
    wave(n) {
      const pts =
        n === 1
          ? [
              [-10, 40],
              [10, 40],
              [0, 44],
              [-14, 30],
              [14, 30],
              [0, 34],
              [-6, 46],
              [6, 46],
            ]
          : [
              [-12, 42],
              [12, 42],
              [-6, 30],
              [6, 30],
              [-15, 36],
              [15, 36],
            ];
      return pts.map(([x, z]) => P(x, 0, z));
    },
    towers: () => [P(-14, 0, 44), P(14, 0, 44)],
    atSwitch: (q) => Math.hypot(q.x, q.z - 102.5) < 1.9 && q.y > -0.5,
    laserHit: (q) => Math.abs(q.z - 97) < 0.45 && Math.abs(q.x) < 6 && q.y < 5.2 && q.y > -0.5,
    update(dt, t, stage, phase3) {
      if (!built) return;
      screen.update(dt, t);
      const open = stage >= 4;
      gateY = damp(gateY, open ? 5.2 : 0, 3, dt);
      gate.m.position.y = O.y + 2.5 + gateY;
      gate.b.on = !open;
      lasers.children.forEach((l, i) => {
        l.material.color.setRGB(1, 0.1, 0.23).multiplyScalar(2.2 + Math.sin(t * 12 + i) * 0.8);
      });
      sw.scale.y = 1 + Math.sin(t * 5) * 0.2;
      LvKit.tick(t);
      fires.forEach((f, i) => f.scale.set(1, 0.85 + Math.sin(t * 11 + i * 1.7) * 0.15, 1));
      Object.values(plates).forEach((pl) => {
        pl.m.material.color.copy(pl.c).multiplyScalar(phase3 ? 1.4 + Math.sin(t * 4) * 0.5 : 0.25);
      });
    },
  };
})();
