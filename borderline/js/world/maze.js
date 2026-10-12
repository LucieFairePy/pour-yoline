const Maze = (() => {
  const O = V3(700, 80, 0);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const CELL = 3.2;
  const WALL_H = 5;
  const M1 = { n: 9, x0: -14.4, z0: 0 };
  const M2 = { n: 7, x0: -11.2, z0: 50 };
  const TOWER1 = V3(-23, 16, 14.4);
  const TOWER2 = V3(19, 14, 61.2);
  const BOMB = V3(0, 0, 38);
  const WIRE_X = [1.2, 0.4, -0.4, -1.2];
  const WIRES = ['#ff5f8a', '#ffcf8a', '#6c8cff', '#f4eef6'];
  const CARD = V3(0, 1.6, 81);

  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const stone = new THREE.MeshStandardMaterial({ color: '#1c1424', roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#2b2238',
    roughness: 0.8,
    emissive: '#0c0814',
  });
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  let built = false;
  let role = 'dame';
  const mazes = {};
  let lamp = null;
  let screen = null;
  let bombScreen = null;
  let card = null;

  const solid = (x, y, z, sx, sy, sz, mat = stone, opt) => {
    if (mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.position.copy(P(x, y, z));
      group.add(m);
    }
    return Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
  };

  const gen = (n, r) => {
    const cells = Array.from({ length: n * n }, () => ({
      n: true,
      e: true,
      s: true,
      w: true,
      v: false,
    }));
    const at = (x, z) => cells[z * n + x];
    const stack = [[(n / 2) | 0, 0]];
    at((n / 2) | 0, 0).v = true;
    while (stack.length) {
      const [x, z] = stack[stack.length - 1];
      const opts = [
        [x, z + 1, 'n', 's'],
        [x + 1, z, 'e', 'w'],
        [x, z - 1, 's', 'n'],
        [x - 1, z, 'w', 'e'],
      ].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !at(a, b).v);
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const [a, b, d1, d2] = opts[(r() * opts.length) | 0];
      at(x, z)[d1] = false;
      at(a, b)[d2] = false;
      at(a, b).v = true;
      stack.push([a, b]);
    }
    const mid = (n / 2) | 0;
    at(mid, 0).s = false;
    at(mid, n - 1).n = false;
    const prev = new Map();
    const q = [[mid, 0]];
    prev.set(mid + ',0', null);
    while (q.length) {
      const [x, z] = q.shift();
      if (x === mid && z === n - 1) break;
      const c = at(x, z);
      [
        [x, z + 1, 'n'],
        [x + 1, z, 'e'],
        [x, z - 1, 's'],
        [x - 1, z, 'w'],
      ].forEach(([a, b, d]) => {
        if (a < 0 || b < 0 || a >= n || b >= n || c[d] || prev.has(a + ',' + b)) return;
        prev.set(a + ',' + b, [x, z]);
        q.push([a, b]);
      });
    }
    const path = new Set();
    let k = [mid, n - 1];
    while (k) {
      path.add(k[0] + ',' + k[1]);
      k = prev.get(k[0] + ',' + k[1]);
    }
    const free = [];
    for (let z = 1; z < n - 1; z++)
      for (let x = 0; x < n; x++) if (!path.has(x + ',' + z)) free.push([x, z]);
    const traps = [];
    const deads = [];
    for (let i = 0; i < free.length; i++) {
      const [x, z] = free[i];
      const c = at(x, z);
      const open = ['n', 'e', 's', 'w'].filter((d) => !c[d]).length;
      if (open === 1) deads.push([x, z]);
    }
    const pool = free.slice();
    for (let i = 0; i < Math.min(n, pool.length); i++)
      traps.push(pool.splice((r() * pool.length) | 0, 1)[0]);
    return { cells, at, n, traps, deads };
  };

  const buildMaze = (spec, key, r, darkFor) => {
    const { n, x0, z0 } = spec;
    const m = gen(n, r);
    const size = n * CELL;
    const walls = [];
    const add = (x, z, sx, sz) => walls.push([x, z, sx, sz]);
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) {
        const c = m.at(x, z);
        const cx = x0 + x * CELL + CELL / 2;
        const cz = z0 + z * CELL + CELL / 2;
        if (c.n) add(cx, cz + CELL / 2, CELL + 0.4, 0.4);
        if (c.e) add(cx + CELL / 2, cz, 0.4, CELL + 0.4);
        if (z === 0 && c.s) add(cx, cz - CELL / 2, CELL + 0.4, 0.4);
        if (x === 0 && c.w) add(cx - CELL / 2, cz, 0.4, CELL + 0.4);
      }
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, walls.length);
    const m4 = new THREE.Matrix4();
    walls.forEach(([x, z, sx, sz], i) => {
      m4.makeScale(sx, WALL_H, sz).setPosition(O.x + x, O.y + WALL_H / 2, O.z + z);
      inst.setMatrixAt(i, m4);
      Phys.box(O.x + x, O.y + WALL_H / 2, O.z + z, sx, WALL_H, sz);
    });
    inst.frustumCulled = false;
    group.add(inst);
    solid(x0 + size / 2, -0.5, z0 + size / 2, size + 0.4, 1, size + 0.4);
    const trapMat = glow('#ff2a3a', 1.2);
    const trapCells = m.traps.map(([x, z]) => {
      const cx = x0 + x * CELL + CELL / 2;
      const cz = z0 + z * CELL + CELL / 2;
      if (role !== darkFor) {
        const t = new THREE.Mesh(
          new THREE.PlaneGeometry(CELL - 0.6, CELL - 0.6).rotateX(-Math.PI / 2),
          trapMat,
        );
        t.position.copy(P(cx, 0.03, cz));
        group.add(t);
      }
      return { x: cx, z: cz };
    });
    const exitMat = glow('#7ce0ff', 1.6);
    const ex = new THREE.Mesh(
      new THREE.PlaneGeometry(CELL - 0.4, CELL - 0.4).rotateX(-Math.PI / 2),
      exitMat,
    );
    ex.position.copy(P(x0 + ((n / 2) | 0) * CELL + CELL / 2, 0.04, z0 + (n - 1) * CELL + CELL / 2));
    group.add(ex);
    if (role === darkFor) {
      solid(
        x0 + size / 2,
        WALL_H + 0.15,
        z0 + size / 2,
        size + 0.4,
        0.3,
        size + 0.4,
        new THREE.MeshBasicMaterial({ color: '#05030a' }),
      );
    }
    const dead = m.deads.length ? m.deads[(r() * m.deads.length) | 0] : null;
    mazes[key] = {
      n,
      x0,
      z0,
      size,
      traps: trapCells,
      darkFor,
      dead: dead ? { x: x0 + dead[0] * CELL + CELL / 2, z: z0 + dead[1] * CELL + CELL / 2 } : null,
      entry: V3(x0 + size / 2, 0, z0 - 1.5),
      exitZ: z0 + size,
    };
  };

  const tower = (t, tag) => {
    solid(t.x, t.y - 0.5, t.z, 6, 1, 6);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, t.y - 1, 8), stone);
    col.position.copy(P(t.x, (t.y - 1) / 2, t.z));
    group.add(col);
    const rail = glow('#7ce0ff', 0.6);
    [
      [0, 3, 6, 0.06],
      [0, -3, 6, 0.06],
      [3, 0, 0.06, 6],
      [-3, 0, 0.06, 6],
    ].forEach(([dx, dz, sx, sz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), rail);
      m.position.copy(P(t.x + dx, t.y + 1, t.z + dz));
      group.add(m);
      Phys.box(
        O.x + t.x + dx,
        O.y + t.y + 0.6,
        O.z + t.z + dz,
        Math.max(sx, 0.2),
        1.2,
        Math.max(sz, 0.2),
      );
    });
    const s = makeSprite(tag, 1.4, '#7ce0ff');
    s.position.copy(P(t.x, t.y + 3, t.z));
    group.add(s);
  };

  const makeSprite = (txt, size, color) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 16;
    g.font = 'bold 80px Georgia';
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

  const build = (myRole, seed) => {
    if (built) return;
    built = true;
    role = myRole;
    group.visible = true;
    const r = rng(seed + 404);
    solid(0, -0.5, -6, 14, 1, 12);
    buildMaze(M1, 'm1', r, 'valet');
    solid(0, -0.5, 38, 14, 1, 12);
    solid(0, -0.5, 30.5, 4, 1, 3);
    buildMaze(M2, 'm2', r, 'dame');
    solid(0, -0.5, 46, 6, 1, 8);
    solid(0, -0.5, 81, 14, 1, 10);
    solid(0, -0.5, 74, 4, 1, 4);
    tower(TOWER1, '♥');
    tower(TOWER2, '♠');

    const lectern = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.1, 0.6).translate(0, 0.55, 0),
      stone,
    );
    lectern.position.copy(P(TOWER1.x + 1.5, TOWER1.y, TOWER1.z));
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.5), glow('#ffcf8a', 1.2));
    book.position.copy(P(TOWER1.x + 1.5, TOWER1.y + 1.15, TOWER1.z));
    group.add(lectern, book);

    const dev = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.1, 1),
      new THREE.MeshStandardMaterial({ color: '#2a1626', roughness: 0.5, metalness: 0.4 }),
    );
    box.position.y = 0.55;
    dev.add(box);
    WIRE_X.forEach((x, i) => {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6).rotateX(Math.PI / 2),
        glow(WIRES[i], 1.6),
      );
      w.position.set(x, 1.15, 0.1);
      w.name = 'wire' + i;
      dev.add(w);
    });
    dev.position.copy(P(BOMB.x, 0, BOMB.z));
    group.add(dev);
    bombScreen = makeScreen(1.6, 0.8, 512);
    bombScreen.mesh.position.copy(P(BOMB.x, 2.1, BOMB.z + 0.2));
    bombScreen.mesh.rotation.y = Math.PI;
    bombScreen.mesh.visible = role === 'valet';
    group.add(bombScreen.mesh);
    mazes.wires = dev;

    screen = makeScreen(16, 8, 1024);
    screen.mesh.position.copy(P(0, 14, 92));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);

    const tex = (() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 360;
      const g = c.getContext('2d');
      g.fillStyle = '#fff8f0';
      g.fillRect(0, 0, 256, 360);
      g.fillStyle = '#1b1a2e';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '160px Georgia';
      Icons.fillText(g, '♣', 128, 190);
      g.font = 'bold 44px Georgia';
      Icons.fillText(g, '4', 30, 40);
      return new THREE.CanvasTexture(c);
    })();
    card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }),
    );
    card.material.color.setScalar(1.4);
    card.position.copy(P(CARD.x, CARD.y, CARD.z));
    card.visible = false;
    group.add(card);

    lamp = new THREE.PointLight('#ffd9a8', 0, 11, 1.6);
    R.scene.add(lamp);
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
    get bombScreen() {
      return bombScreen;
    },
    mazes,
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(stage, who) {
      if (stage === 1) return who === 'dame' ? P(TOWER1.x, TOWER1.y, TOWER1.z) : P(0, 0, -5);
      if (stage === 2) return who === 'dame' ? P(TOWER1.x, TOWER1.y, TOWER1.z) : P(0, 0, 35);
      if (stage === 3) return who === 'dame' ? P(0, 0, 45) : P(TOWER2.x, TOWER2.y, TOWER2.z);
      return P(who === 'dame' ? -2.5 : 2.5, 0, 78);
    },
    yaw(stage, who) {
      if (who === 'dame' && stage <= 2) return Math.PI / 2;
      if (who === 'valet' && stage === 3) return -Math.PI / 2;
      return 0;
    },
    inside(q, key) {
      const m = mazes[key];
      return q.x > m.x0 && q.x < m.x0 + m.size && q.z > m.z0 && q.z < m.z0 + m.size && q.y < 3;
    },
    exited: (q, key) => q.z > mazes[key].exitZ + 0.3 && q.y > -1 && q.y < 3,
    onTrap(q, key) {
      const m = mazes[key];
      return (
        m.traps.some(
          (t) => Math.abs(q.x - t.x) < CELL / 2 - 0.3 && Math.abs(q.z - t.z) < CELL / 2 - 0.3,
        ) && q.y < 0.5
      );
    },
    nearLectern: (q) => Math.hypot(q.x - TOWER1.x - 1.5, q.z - TOWER1.z) < 2 && q.y > TOWER1.y - 1,
    nearWire(q) {
      if (Math.abs(q.z - (BOMB.z + 1.2)) > 1.4) return -1;
      let best = -1;
      let bd = 0.45;
      WIRE_X.forEach((x, i) => {
        const d = Math.abs(q.x - x);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    nearCard: (q) => Math.hypot(q.x - CARD.x, q.z - CARD.z) < 3,
    lampAt(p, on) {
      if (!lamp) return;
      lamp.intensity = on ? 2.2 : 0;
      if (p) lamp.position.set(p.x, p.y + 2.2, p.z);
    },
    cutWire(i, on) {
      const w = mazes.wires && mazes.wires.getObjectByName('wire' + i);
      if (w) w.scale.set(1, 1, on ? 0.35 : 1);
    },
    showCard(on, t) {
      if (!card) return;
      card.visible = on;
      card.rotation.y = t * 1.4;
      card.position.y = O.y + CARD.y + Math.sin(t * 2) * 0.15;
    },
    WIRE_X,
    BOMB,
  };
})();
