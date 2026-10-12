const Garde = (() => {
  const O = V3(-700, 80, 700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const stone = new THREE.MeshStandardMaterial({
    color: '#1e1626',
    roughness: 0.85,
    metalness: 0.15,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: '#2a1f36',
    roughness: 0.4,
    metalness: 0.7,
    emissive: '#120a1c',
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

  const solid = (x, y, z, sx, sy, sz, mat = stone, opt) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.copy(P(x, y, z));
    group.add(m);
    const b = Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
    return { m, b };
  };

  const edges = (cx, cz, w, d, c = '#ff4f6a') => {
    const mat = glow(c, 1.6);
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

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    solid(0, -0.5, 0, 14, 1, 12);
    edges(0, 0, 14, 12);
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
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), glow('#ff4f6a', 1.8));
      l.position.copy(P(x, 6.05, z));
      group.add(l);
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
    solid(-6.3, 2, 100.5, 0.6, 4, 8, trim);
    solid(6.3, 2, 100.5, 0.6, 4, 8, trim);
    solid(0, 2, 104.8, 13.2, 4, 0.6, trim);
    lasers = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.6, 0.04), glow('#ff1a3a', 3));
      l.position.copy(P(-5.5 + i, 1.8, 97));
      lasers.add(l);
    }
    for (let j = 0; j < 4; j++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(12, 0.04, 0.04), glow('#ff1a3a', 3));
      l.position.copy(P(0, 0.4 + j * 1, 97));
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
  };

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
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(stage, who) {
      const s = who === 'dame' ? -2.5 : 2.5;
      return stage >= 4 ? P(s, 0, 58) : P(s, 0, 2);
    },
    inRoom: (q) => q.z > 13 && q.z < 47.5 && Math.abs(q.x) < 18 && q.y > -1,
    inArena: (q) => q.z > 57 && q.y > -1,
    bossPos: () => P(0, 0, 90),
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
            ]
          : [
              [-12, 42],
              [12, 42],
              [-6, 30],
              [6, 30],
            ];
      return pts.map(([x, z]) => P(x, 0, z));
    },
    towers: () => [P(-14, 0, 44), P(14, 0, 44)],
    atSwitch: (q) => Math.hypot(q.x, q.z - 102.5) < 1.9 && q.y > -0.5,
    laserHit: (q) => Math.abs(q.z - 97) < 0.45 && Math.abs(q.x) < 6 && q.y < 3.8 && q.y > -0.5,
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
      Object.values(plates).forEach((pl) => {
        pl.m.material.color.copy(pl.c).multiplyScalar(phase3 ? 1.4 + Math.sin(t * 4) * 0.5 : 0.25);
      });
    },
  };
})();
