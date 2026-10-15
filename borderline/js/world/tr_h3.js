// ♥ 4 · Les Yeux bandés: a night garden, a pond of stepping stones and a ballroom. One of you is
// blindfolded, the other sees and guides by voice; the blindfold changes hands at every section.
const H3 = (() => {
  const O = V3(700, 0, 4200);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  const glow = LvKit.glow;

  // maze: 9 x 9 cells of 4 m, entrance at the bottom middle, exit at the top middle
  const CELLS = 9;
  const C = 4;
  const MX = -18;
  const MZ = 10;
  const HEDGE_H = 3.4;
  const WALK_Y = 5;
  // ballroom dance floor: 7 x 7 tiles
  const TILE = 2.4;
  const GZ = 125;

  const mats = {};
  const mk = () => {
    if (mats.ok) return mats;
    mats.ok = true;
    mats.gravel = Tex.mat('sand', { color: '#4a4450', scale: 2.2, rough: 0.95, bump: 0.8 });
    mats.hedge = Tex.mat('grass', { color: '#24402a', scale: 3.2, rough: 0.92, bump: 0.7 });
    mats.leaf = Tex.mat('grass', { color: '#2c5232', scale: 2.6, rough: 0.9, bump: 0.6 });
    mats.stone = Tex.mat('stone', { color: '#8b8494', scale: 2.4, rough: 0.8, bump: 0.8 });
    mats.paver = Tex.mat('cobble', { color: '#57515e', scale: 2.6, rough: 0.85 });
    mats.turf = Tex.mat('grass', { color: '#1c2a20', scale: 3, rough: 0.95, bump: 0.6 });
    mats.wood = Tex.mat('wood', { color: '#3a3230', scale: 1.8, rough: 0.8, bump: 0.35 });
    mats.darkWood = Tex.mat('wood', { color: '#2e1d16', scale: 0.8, rough: 0.6 });
    mats.iron = new THREE.MeshStandardMaterial({
      color: '#2a2630',
      roughness: 0.5,
      metalness: 0.25,
      emissive: '#050307',
    });
    mats.gold = new THREE.MeshStandardMaterial({
      color: '#c99a48',
      roughness: 0.35,
      metalness: 0.3,
      emissive: '#3a2810',
    });
    mats.rock = Tex.mat('rock', { color: '#5d5866', scale: 1.6, rough: 0.85, bump: 1.2 });
    mats.cliff = Tex.mat('rock', { color: '#3c3844', scale: 4, rough: 0.9, bump: 1.4 });
    mats.marble = Tex.mat('marble', { color: '#7d716d', scale: 5, rough: 0.4, bump: 0.3 });
    mats.marbleDark = Tex.mat('marble', { color: '#4a3a48', scale: 4, rough: 0.4 });
    mats.plaster = Tex.mat('plaster', { color: '#4a3946', scale: 3.5, rough: 0.85 });
    mats.facade = Tex.mat('stone', { color: '#5d5462', scale: 3, rough: 0.85, bump: 0.9 });
    mats.fabric = Tex.mat('fabric', { color: '#7a1830', scale: 1.4, rough: 0.9, bump: 0.6 });
    mats.pad = new THREE.MeshStandardMaterial({ color: '#1d4a28', roughness: 0.55, side: THREE.DoubleSide });
    mats.lotus = new THREE.MeshStandardMaterial({ color: '#f2a4c0', roughness: 0.5, emissive: '#3a1020' });
    return mats;
  };

  let built = false;
  let seedUsed = null;
  let screen = null;
  let danceScreen = null;
  const maze = { walls: [], path: [], plates: [], mid: null, cells: null };
  const stones = [];
  const markers = [];
  const lanterns = [];
  const tileGlow = { mesh: null, cols: [] };
  let flies = null;
  let water = null;
  let waterNorm = null;
  let heart = null;
  let card = null;
  let chandeliers = [];
  let midStone = null;
  let hoverRing = null;
  const plateMeshes = [];

  // ---------- helpers ----------
  const solid = (x, y, z, sx, sy, sz, mat) => K.solid(x, y, z, sx, sy, sz, mat);
  const stairs = (x0, z0, dir, y0, y1, width, mat) => {
    // straight stair along z (dir ±1), 0.4 m risers, every tread is a collider
    const n = Math.ceil(Math.abs(y1 - y0) / 0.4);
    const rise = (y1 - y0) / n;
    const run = 0.55;
    for (let i = 0; i < n; i++) {
      const top = y0 + rise * (i + 1);
      const z = z0 + dir * (i * run + run / 2);
      const h = Math.max(0.2, top - Math.min(y0, y1) + 0.2);
      solid(x0, top - h / 2, z, width, h, run, mat);
    }
    return z0 + dir * n * run;
  };
  const rail = (x, y, z, sx, sz, h = 1.05) => {
    K.collider(x, y + h / 2, z, sx, h, sz);
    const top = K.deco(new THREE.BoxGeometry(sx || 0.08, 0.08, sz || 0.08), mats.iron, x, y + h, z);
    const len = Math.max(sx, sz);
    const n = Math.max(2, Math.round(len / 1.2));
    for (let i = 0; i <= n; i++) {
      const k = i / n - 0.5;
      K.deco(
        new THREE.CylinderGeometry(0.03, 0.03, h, 6),
        mats.iron,
        x + (sx > sz ? k * sx : 0),
        y + h / 2,
        z + (sz >= sx ? k * sz : 0),
      );
    }
    return top;
  };
  const lantern = (x, y, z, col = '#ffc27a', post = true) => {
    const g = new THREE.Group();
    if (post) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 8), mats.iron);
      pole.position.y = 1.1;
      g.add(pole);
    }
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 6, 1, true), mats.iron);
    cage.position.y = post ? 2.45 : 0.25;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), glow(col, 1.4));
    bulb.position.copy(cage.position);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.22, 6), mats.iron);
    cap.position.y = cage.position.y + 0.36;
    g.add(cage, bulb, cap);
    g.position.copy(P(x, y, z));
    group.add(g);
    if (post) K.collider(x, y + 1.3, z, 0.3, 2.6, 0.3);
    lanterns.push({ bulb, base: new THREE.Color(col).multiplyScalar(1.4), ph: Math.random() * 6 });
    return g;
  };
  const rngOf = (seed) => rng(seed);

  // ---------- the maze ----------
  const genMaze = (seed) => {
    const r = rngOf(seed);
    const N = CELLS;
    const id = (i, j) => j * N + i;
    // walls: h[j][i] = wall on the top side of cell (i,j) ; v[j][i] = wall on the right side
    const h = Array.from({ length: N }, () => Array(N).fill(true));
    const v = Array.from({ length: N }, () => Array(N).fill(true));
    const seen = new Set([id(4, 0)]);
    const stack = [[4, 0]];
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const nb = [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(id(a, b)));
      if (!nb.length) {
        stack.pop();
        continue;
      }
      const [a, b] = nb[Math.floor(r() * nb.length)];
      if (a === i + 1) v[j][i] = false;
      if (a === i - 1) v[j][a] = false;
      if (b === j + 1) h[j][i] = false;
      if (b === j - 1) h[b][i] = false;
      seen.add(id(a, b));
      stack.push([a, b]);
    }
    // a few extra openings so the garden has loops (more than one way, more talking)
    for (let k = 0; k < 7; k++) {
      const i = 1 + Math.floor(r() * (N - 2));
      const j = 1 + Math.floor(r() * (N - 2));
      if (r() < 0.5) v[j][i] = false;
      else h[j][i] = false;
    }
    const open = (i, j, a, b) => {
      if (a < 0 || b < 0 || a >= N || b >= N) return false;
      if (a === i + 1) return !v[j][i];
      if (a === i - 1) return !v[j][a];
      if (b === j + 1) return !h[j][i];
      if (b === j - 1) return !h[b][i];
      return false;
    };
    // shortest path entrance → exit (BFS)
    const prev = new Map([[id(4, 0), null]]);
    const q = [[4, 0]];
    while (q.length) {
      const [i, j] = q.shift();
      if (i === 4 && j === N - 1) break;
      [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ].forEach(([a, b]) => {
        if (open(i, j, a, b) && !prev.has(id(a, b))) {
          prev.set(id(a, b), [i, j]);
          q.push([a, b]);
        }
      });
    }
    const path = [];
    let cur = [4, N - 1];
    while (cur) {
      path.unshift(cur);
      cur = prev.get(id(cur[0], cur[1]));
    }
    return { h, v, open, path, N };
  };
  const cellPos = (i, j) => [MX + C / 2 + i * C, MZ + C / 2 + j * C];

  const buildMaze = (seed) => {
    const m = genMaze(seed);
    maze.cells = m;
    maze.path = m.path;
    const segs = [];
    const N = m.N;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const [cx, cz] = cellPos(i, j);
        if (j < N - 1 && m.h[j][i]) segs.push([cx, cz + C / 2, true]);
        if (i < N - 1 && m.v[j][i]) segs.push([cx + C / 2, cz, false]);
      }
    // the outer hedge, with the entrance and exit left open
    for (let i = 0; i < N; i++) {
      const [cx] = cellPos(i, 0);
      if (i !== 4) segs.push([cx, MZ, true]);
      if (i !== 4) segs.push([cx, MZ + N * C, true]);
    }
    for (let j = 0; j < N; j++) {
      const [, cz] = cellPos(0, j);
      segs.push([MX, cz, false]);
      segs.push([-MX, cz, false]);
    }
    // instanced hedge blocks + rounded leafy crowns; one collider per segment
    const L = C + 0.9;
    const geo = new THREE.BoxGeometry(L, HEDGE_H - 0.35, 0.95);
    const inst = new THREE.InstancedMesh(geo, mats.hedge, segs.length);
    const crownGeo = new THREE.SphereGeometry(0.62, 12, 8);
    const crown = new THREE.InstancedMesh(crownGeo, mats.leaf, segs.length * 4);
    const dm = new THREE.Object3D();
    const r = rng(seed + 7);
    segs.forEach(([x, z, horiz], k) => {
      dm.position.copy(P(x, (HEDGE_H - 0.35) / 2, z));
      dm.rotation.set(0, horiz ? 0 : Math.PI / 2, 0);
      dm.scale.set(1, 1, 1);
      dm.updateMatrix();
      inst.setMatrixAt(k, dm.matrix);
      for (let c = 0; c < 4; c++) {
        const along = (c / 3 - 0.5) * (L - 1);
        dm.position.copy(
          P(x + (horiz ? along : 0), HEDGE_H - 0.42 + r() * 0.12, z + (horiz ? 0 : along)),
        );
        dm.rotation.set(r() * 3, r() * 3, 0);
        const s = 0.9 + r() * 0.35;
        dm.scale.set(s * 1.25, s * 0.75, s);
        dm.updateMatrix();
        crown.setMatrixAt(k * 4 + c, dm.matrix);
      }
      if (horiz) K.collider(x, HEDGE_H / 2, z, L, HEDGE_H, 0.95);
      else K.collider(x, HEDGE_H / 2, z, 0.95, HEDGE_H, L);
      // nobody walks on the hedge tops (from a lantern or the walkway): an unseen wall above them
      if (horiz) K.collider(x, HEDGE_H + 3.3, z, L, 6.6, 0.95, { tag: 'nocam' });
      else K.collider(x, HEDGE_H + 3.3, z, 0.95, 6.6, L, { tag: 'nocam' });
    });
    // the strips between the outer hedge and the wood are not a way round the maze
    [-1, 1].forEach((s) => K.collider(s * 22, 1.9, MZ, 8, 5.9, 1, { tag: 'nocam' }));
    inst.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
    group.add(inst, crown);
    maze.walls = segs;

    // tiny night flowers along the hedges
    const fp = [];
    const fc = [];
    const pal = [new THREE.Color('#ffd7e6'), new THREE.Color('#fff4d6'), new THREE.Color('#d9c4ff')];
    segs.forEach(([x, z, horiz]) => {
      for (let k = 0; k < 14; k++) {
        const along = (r() - 0.5) * L;
        const side = (r() < 0.5 ? -1 : 1) * 0.5;
        const y = 0.4 + r() * (HEDGE_H - 0.8);
        fp.push(
          O.x + x + (horiz ? along : side),
          O.y + y,
          O.z + z + (horiz ? side : along),
        );
        const cc = pal[Math.floor(r() * 3)];
        fc.push(cc.r, cc.g, cc.b);
      }
    });
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
    group.add(
      new THREE.Points(
        fg,
        new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.8 }),
      ),
    );

    // traps: bell plates on dead ends off the path, and half plates on some path cells
    const onPath = new Set(m.path.map(([i, j]) => i + ',' + j));
    const plates = [];
    for (let j = 1; j < N; j++)
      for (let i = 0; i < N; i++) {
        if (onPath.has(i + ',' + j)) continue;
        const exits = [
          [i + 1, j],
          [i - 1, j],
          [i, j + 1],
          [i, j - 1],
        ].filter(([a, b]) => m.open(i, j, a, b)).length;
        if (exits === 1 && r() < 0.75) {
          const [x, z] = cellPos(i, j);
          plates.push({ x, z, w: 2.6, d: 2.6 });
        }
      }
    m.path.forEach(([i, j], k) => {
      if (k < 3 || k > m.path.length - 3 || k % 4 !== 2) return;
      const [pi, pj] = m.path[k - 1];
      const [ni, nj] = m.path[k + 1];
      const [x, z] = cellPos(i, j);
      const side = r() < 0.5 ? -1 : 1;
      // straight along z: the plate fills one side, the other side stays free
      if (pi === i && ni === i) plates.push({ x: x + side * 0.85, z, w: 1.3, d: 3.0, half: true });
      else if (pj === j && nj === j) plates.push({ x, z: z + side * 0.85, w: 3.0, d: 1.3, half: true });
    });
    maze.plates = plates;
    const plateTex = LvKit.tex(256, 256, (g) => {
      LvKit.grain(g, 256, 256, '#3a3440', 0.12, 2400);
      g.strokeStyle = 'rgba(232,189,132,.55)';
      g.lineWidth = 6;
      g.strokeRect(14, 14, 228, 228);
      g.fillStyle = 'rgba(232,189,132,.45)';
      g.font = '120px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      // a small bell, drawn as a dome + clapper
      g.beginPath();
      g.moveTo(84, 168);
      g.quadraticCurveTo(90, 70, 128, 68);
      g.quadraticCurveTo(166, 70, 172, 168);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(128, 184, 14, 0, 6.3);
      g.fill();
    });
    plates.forEach((p) => {
      const mat = new THREE.MeshStandardMaterial({
        map: plateTex,
        roughness: 0.7,
        emissive: new THREE.Color('#ff7a9a'),
        emissiveIntensity: 0.0,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.08, p.d), mat);
      mesh.position.copy(P(p.x, 0.04, p.z));
      group.add(mesh);
      plateMeshes.push({ mesh, p, flash: 0 });
      // the little bell on a post, rings when the plate is stepped on
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8, 0, 6.3, 0, 1.8), mats.gold);
      bell.position.copy(P(p.x, 1.2, p.z));
      group.add(bell);
      p.bell = bell;
    });
    // wrought-iron gates with a heart, at the entrance and the exit
    [MZ, MZ + CELLS * C].forEach((z) => {
      [-2.15, 2.15].forEach((x) => {
        K.deco(new THREE.BoxGeometry(0.22, 4.2, 0.22), mats.iron, x, 2.1, z);
        K.deco(new THREE.SphereGeometry(0.18, 10, 8), mats.gold, x, 4.35, z);
      });
      K.deco(new THREE.TorusGeometry(2.15, 0.07, 8, 40, Math.PI), mats.iron, 0, 4.1, z);
      const hs = new THREE.Shape();
      for (let k = 0; k <= 48; k++) {
        const [hx, hy] = Heart.curve((k / 48) * Math.PI * 2);
        if (k) hs.lineTo(hx * 0.028, (hy - 2.5) * 0.028);
        else hs.moveTo(hx * 0.028, (hy - 2.5) * 0.028);
      }
      K.deco(new THREE.ExtrudeGeometry(hs, { depth: 0.06, bevelEnabled: false }), glow('#ff5f8a', 0.7), 0, 5.6, z);
    });
    // the halfway lantern-stone: the blind one's checkpoint
    const midCell = m.path[Math.floor(m.path.length / 2)];
    const [mx, mz] = cellPos(midCell[0], midCell[1]);
    maze.mid = { x: mx, z: mz };
    midStone = K.deco(new THREE.CylinderGeometry(0.35, 0.45, 0.5, 10), mats.stone, mx + 1.1, 0.25, mz + 1.1);
    lantern(mx + 1.1, 0.5, mz + 1.1, '#9fe0ff', false);
  };

  // ---------- the pond ----------
  const STONES = [
    [-0.9, 63, 0.95, 's'],
    [0.7, 65.3, 0.9, 's'],
    [-0.5, 67.6, 0.9, 's'],
    [1.5, 69.8, 1.05, 'p'],
    [0, 72, 0.9, 's'],
    [-1.6, 86, 0.95, 's'],
    [-2.9, 88.2, 1.05, 'p'],
    [-1.1, 90.5, 0.9, 's'],
    [0.9, 92.6, 1.05, 'p'],
    [2.3, 94.8, 0.9, 's'],
    [1, 97, 0.9, 's'],
    [-0.4, 99.1, 0.95, 's'],
  ];
  const buildPond = () => {
    // basin: dark water between two cliff walls
    const wn = LvKit.tex(512, 512, (g) => {
      g.fillStyle = 'rgb(128,128,255)';
      g.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 900; k++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = 4 + Math.random() * 26;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const dx = Math.random() < 0.5 ? 110 : 150;
        gr.addColorStop(0, `rgba(${dx},${260 - dx},255,0.35)`);
        gr.addColorStop(1, 'rgba(128,128,255,0)');
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, 6, 10);
    waterNorm = wn;
    water = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 46).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#070d1c',
        roughness: 0.18,
        metalness: 0.15,
        normalMap: wn,
        normalScale: new THREE.Vector2(0.5, 0.5),
        transparent: true,
        opacity: 0.94,
      }),
    );
    water.position.copy(P(0, -0.45, 81.5));
    group.add(water);
    // deep bottom far below (never reached, just depth)
    K.deco(new THREE.PlaneGeometry(26, 46).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#03050c' }), 0, -4, 81.5);
    // cliffs on both sides
    [-13.5, 13.5].forEach((x) => {
      solid(x, 2.5, 81.5, 1.5, 9, 46, mats.cliff);
      for (let k = 0; k < 9; k++)
        K.deco(
          new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.1, 1),
          mats.cliff,
          x - Math.sign(x) * 0.9,
          -0.2 + Math.random() * 1.2,
          61 + k * 5 + Math.random() * 2,
        );
    });
    // stones and lily pads
    STONES.forEach(([x, z, r, kind]) => {
      if (kind === 's') {
        const g = new THREE.CylinderGeometry(r, r * 1.12, 1.4, 14, 2);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const yy = pos.getY(i);
          const k = 1 + (Math.sin(pos.getX(i) * 5 + z) * 0.05 + Math.cos(pos.getZ(i) * 4 + x) * 0.05);
          pos.setX(i, pos.getX(i) * k);
          pos.setZ(i, pos.getZ(i) * k);
          if (yy > 0) pos.setY(i, yy + Math.sin(pos.getX(i) * 3 + pos.getZ(i) * 2) * 0.04);
        }
        g.computeVertexNormals();
        const m = K.deco(g, mats.rock, x, -0.7, z);
        const b = K.collider(x, -0.7, z, r * 1.5, 1.4, r * 1.5);
        stones.push({ x, z, r, kind, m, b, top: 0 });
      } else {
        const g = new THREE.CylinderGeometry(r, r, 0.08, 28, 1, false, 0.25, Math.PI * 2 - 0.5);
        const m = K.deco(g, mats.pad, x, -0.04, z);
        const flower = new THREE.Group();
        for (let k = 0; k < 8; k++) {
          const pet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats.lotus);
          pet.scale.set(0.6, 0.35, 1.4);
          const a = (k / 8) * Math.PI * 2;
          pet.position.set(Math.cos(a) * 0.14, 0.1, Math.sin(a) * 0.14);
          pet.rotation.y = -a;
          pet.rotation.x = 0.6;
          flower.add(pet);
        }
        flower.position.set(r * 0.45, 0.04, 0);
        m.add(flower);
        const b = K.collider(x, -0.5, z, r * 1.4, 1.0, r * 1.4);
        stones.push({ x, z, r, kind, m, b, top: 0, sink: 0, t: 0 });
      }
    });
    // the narrow beam (a fallen tree trunk) and the island
    const beam = new THREE.CylinderGeometry(0.32, 0.36, 6.4, 12).rotateX(Math.PI / 2);
    K.deco(beam, mats.darkWood, 0, -0.3, 76.3);
    K.collider(0, -0.25, 76.3, 0.6, 0.5, 6.4);
    stones.push({ x: 0, z: 76.3, r: 0.3, kind: 'b', top: 0 });
    solid(0, -0.6, 82, 6.5, 1.2, 4.6, mats.stone);
    K.deco(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 24), mats.gravel, 0, -0.1, 82);
    lantern(-2.2, 0, 82.5, '#ffc27a');
    // floating paper lanterns
    for (let k = 0; k < 14; k++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.32, 8), glow('#ff9a5a', 1.1));
      m.position.copy(P((Math.random() - 0.5) * 20, -0.3, 62 + Math.random() * 38));
      m.userData.ph = Math.random() * 6;
      group.add(m);
      lanterns.push({ float: m, base: null, ph: m.userData.ph });
    }
    // willows on the far banks
    [
      [-9, 60],
      [9.5, 103],
      [-9.5, 104],
    ].forEach(([x, z]) => {
      K.deco(new THREE.CylinderGeometry(0.25, 0.4, 4, 8), mats.darkWood, x, 2, z);
      K.collider(x, 2, z, 0.7, 4, 0.7);
      for (let k = 0; k < 7; k++) {
        const s = K.deco(new THREE.SphereGeometry(1.5, 12, 10), mats.leaf, x + (Math.random() - 0.5) * 2.4, 4 + Math.random() * 1.2, z + (Math.random() - 0.5) * 2.4);
        s.scale.set(1, 1.7, 1);
      }
    });
  };

  // ---------- the ballroom ----------
  const buildBallroom = () => {
    const Z0 = 108;
    const Z1 = 142;
    solid(0, -0.5, (Z0 + Z1) / 2, 34, 1, Z1 - Z0 + 2, mats.marble);
    // walls with a door gap at the entrance
    solid(-17, 6, (Z0 + Z1) / 2, 1, 12, Z1 - Z0 + 2, mats.plaster);
    solid(17, 6, (Z0 + Z1) / 2, 1, 12, Z1 - Z0 + 2, mats.plaster);
    solid(0, 6, Z1 + 0.5, 34, 12, 1, mats.plaster);
    solid(-9.5, 6, Z0, 15, 12, 1, mats.plaster);
    solid(9.5, 6, Z0, 15, 12, 1, mats.plaster);
    solid(0, 8.5, Z0, 4, 7, 1, mats.plaster);
    K.deco(new THREE.BoxGeometry(34, 0.6, Z1 - Z0 + 2), mats.marbleDark, 0, 12.2, (Z0 + Z1) / 2);
    // dark wood wainscot and a gold cornice all around, arched mirrors on the back wall
    [-16.45, 16.45].forEach((x) => {
      K.deco(new THREE.BoxGeometry(0.1, 1.4, Z1 - Z0), mats.darkWood, x, 0.7, (Z0 + Z1) / 2);
      K.deco(new THREE.BoxGeometry(0.16, 0.25, Z1 - Z0), mats.gold, x, 10.4, (Z0 + Z1) / 2);
    });
    K.deco(new THREE.BoxGeometry(33, 1.4, 0.1), mats.darkWood, 0, 0.7, Z1 - 0.05);
    K.deco(new THREE.BoxGeometry(33, 0.25, 0.16), mats.gold, 0, 10.4, Z1 - 0.08);
    [-10, 10].forEach((x) => {
      const fr = K.deco(new THREE.BoxGeometry(4.2, 7.2, 0.18), mats.gold, x, 4.8, Z1 - 0.1);
      void fr;
      const mir = new THREE.Mesh(
        new THREE.PlaneGeometry(3.7, 6.7),
        new THREE.MeshStandardMaterial({ color: '#1c1c2a', roughness: 0.06, metalness: 0.35, emissive: '#0c0c18' }),
      );
      mir.position.copy(P(x, 4.8, Z1 - 0.2));
      mir.rotation.y = Math.PI;
      group.add(mir);
    });
    // outside: a stone facade with pilasters, seen across the pond
    K.deco(new THREE.BoxGeometry(35, 13, 0.4), mats.facade, 0, 6.5, Z0 - 0.7);
    for (let x = -16; x <= 16; x += 4)
      if (Math.abs(x) > 3) K.deco(new THREE.BoxGeometry(0.8, 12.6, 0.5), mats.marble, x, 6.3, Z0 - 1);
    K.deco(new THREE.BoxGeometry(36, 0.8, 1.2), mats.marble, 0, 12.8, Z0 - 1);
    [-8, 8].forEach((x) => {
      const w = K.deco(new THREE.PlaneGeometry(2.2, 4.4), glow('#ffcf9a', 0.5), x, 6.6, Z0 - 1.26);
      w.rotation.y = Math.PI;
    });
    // door frame in gold
    [-2.2, 2.2].forEach((x) => K.deco(new THREE.BoxGeometry(0.3, 5, 0.5), mats.gold, x, 2.5, Z0 - 0.3));
    K.deco(new THREE.BoxGeometry(4.7, 0.3, 0.5), mats.gold, 0, 5, Z0 - 0.3);
    // columns and tall moonlit windows
    for (let z = Z0 + 4; z < Z1 - 1; z += 6) {
      [-15.6, 15.6].forEach((x) => {
        K.deco(new THREE.CylinderGeometry(0.55, 0.65, 11.4, 18), mats.marble, x, 5.7, z);
        K.collider(x, 5.7, z, 1.3, 11.4, 1.3);
        K.deco(new THREE.BoxGeometry(1.6, 0.5, 1.6), mats.gold, x, 11.4, z);
        K.deco(new THREE.BoxGeometry(1.5, 0.4, 1.5), mats.marbleDark, x, 0.2, z);
        const win = K.deco(new THREE.PlaneGeometry(2.6, 7), glow('#6f86c8', 0.55), x + (x < 0 ? -0.95 : 0.95), 5.2, z + 3);
        win.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        // red curtains folded in sine waves on both sides of the window
        [-1.6, 1.6].forEach((dz) => {
          const cg = new THREE.PlaneGeometry(0.9, 8.6, 10, 1);
          const p = cg.attributes.position;
          for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.08);
          cg.computeVertexNormals();
          const cur = K.deco(cg, mats.fabric, x + (x < 0 ? -0.8 : 0.8), 5.3, z + 3 + dz);
          cur.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        });
      });
    }
    // the dance floor: 7 x 7 marble tiles with gold seams, and a glow layer per tile
    const n = 7;
    const half = (n * TILE) / 2;
    K.deco(new THREE.BoxGeometry(n * TILE + 0.6, 0.04, n * TILE + 0.6), mats.marbleDark, 0, 0.02, GZ);
    for (let i = 0; i <= n; i++) {
      K.deco(new THREE.BoxGeometry(0.06, 0.05, n * TILE), mats.gold, -half + i * TILE, 0.045, GZ);
      K.deco(new THREE.BoxGeometry(n * TILE, 0.05, 0.06), mats.gold, 0, 0.045, GZ - half + i * TILE);
    }
    const tg = new THREE.PlaneGeometry(TILE - 0.18, TILE - 0.18).rotateX(-Math.PI / 2);
    const tm = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const inst = new THREE.InstancedMesh(tg, tm, n * n);
    const dm = new THREE.Object3D();
    const col = new THREE.Color(0, 0, 0);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        dm.position.copy(P((i - 3) * TILE, 0.06, GZ + (j - 3) * TILE));
        dm.updateMatrix();
        inst.setMatrixAt(j * n + i, dm.matrix);
        inst.setColorAt(j * n + i, col);
        tileGlow.cols.push(new THREE.Color(0, 0, 0));
      }
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
    group.add(inst);
    tileGlow.mesh = inst;
    // a heart rose window inlaid at the centre tile
    const heartShape = new THREE.Shape();
    for (let k = 0; k <= 64; k++) {
      const [hx, hy] = Heart.curve((k / 64) * Math.PI * 2);
      if (k) heartShape.lineTo(hx * 0.045, (hy - 2.5) * 0.045);
      else heartShape.moveTo(hx * 0.045, (hy - 2.5) * 0.045);
    }
    const hm = K.deco(new THREE.ShapeGeometry(heartShape, 64).rotateX(-Math.PI / 2), glow('#ff5f8a', 0.6), 0, 0.07, GZ);
    hm.rotation.y = Math.PI;
    // three crystal chandeliers
    chandeliers = [];
    [
      [0, GZ],
      [0, GZ - 11],
      [0, GZ + 11],
    ].forEach(([x, z]) => {
      const g = new THREE.Group();
      const ringG = new THREE.TorusGeometry(1.4, 0.06, 8, 40);
      const r1 = new THREE.Mesh(ringG, mats.gold);
      r1.rotation.x = Math.PI / 2;
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 32), mats.gold);
      r2.rotation.x = Math.PI / 2;
      r2.position.y = -0.6;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 6), mats.gold);
      chain.position.y = 1.5;
      g.add(r1, r2, chain);
      const crys = new THREE.MeshStandardMaterial({
        color: '#e8f0ff',
        roughness: 0.05,
        metalness: 0.1,
        emissive: '#5a6a9a',
        transparent: true,
        opacity: 0.85,
      });
      const cg = new THREE.OctahedronGeometry(0.09, 0);
      const ci = new THREE.InstancedMesh(cg, crys, 60);
      const d = new THREE.Object3D();
      for (let k = 0; k < 60; k++) {
        const a = (k / 30) * Math.PI * 2;
        const rr = k < 30 ? 1.4 : 0.85;
        d.position.set(Math.cos(a) * rr, (k < 30 ? -0.25 : -0.85) - Math.random() * 0.25, Math.sin(a) * rr);
        d.scale.set(1, 2.2, 1);
        d.updateMatrix();
        ci.setMatrixAt(k, d.matrix);
      }
      g.add(ci);
      const candles = [];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glow('#ffd7a0', 1.3));
        b.position.set(Math.cos(a) * 1.4, 0.18, Math.sin(a) * 1.4);
        g.add(b);
        candles.push(b);
      }
      g.position.copy(P(x, 9.2, z));
      group.add(g);
      chandeliers.push({ g, candles });
    });
    LvKit.light(group, P(0, 8, GZ), '#ffd7a8', 1.0, 30);
    LvKit.light(group, P(0, 8, GZ + 12), '#b8c4ff', 0.5, 24);
    danceScreen = makeScreen(8, 3, 1024);
    danceScreen.mesh.position.copy(P(0, 8.2, Z1 - 0.05));
    danceScreen.mesh.rotation.y = Math.PI;
    group.add(danceScreen.mesh);
    // the heart-galaxy that forms over the floor at the end, and the card
    heart = Heart.galaxy(6000, 0.22, 33);
    heart.group.position.copy(P(0, 9.2, GZ + 6));
    heart.group.rotation.x = -0.35;
    heart.U.uForm.value = 0;
    heart.core.material.opacity = 0;
    group.add(heart.group);
    card = LvKit.trialCard('h3', true);
    card.position.copy(P(0, 8, GZ));
    group.add(card);
  };

  // ---------- build ----------
  const build = (seed) => {
    if (built) {
      group.visible = true;
      return;
    }
    built = true;
    seedUsed = seed;
    mk();
    group.visible = true;
    // arrival plaza
    solid(0, -0.5, 3, 48, 1, 12, mats.paver);
    screen = makeScreen(7, 2.6, 1024);
    screen.mesh.position.copy(P(0, 6.6, -2.4));
    group.add(screen.mesh);
    K.deco(new THREE.BoxGeometry(7.6, 3.2, 0.3), mats.darkWood, 0, 6.6, -2.6);
    [-3.6, 3.6].forEach((x) => solid(x, 3.4, -2.6, 0.4, 6.8, 0.4, mats.darkWood));
    lantern(-6, 0, 4);
    lantern(6, 0, 4);
    // the maze and its garden floor
    solid(0, -0.5, 28, 44, 1, 38, mats.gravel);
    buildMaze(seed);
    // the guide's walkway around the maze, 5 m up, railings on both sides
    const W = 2.4;
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#6f88a8',
      transparent: true,
      opacity: 0.05,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glassGuard = (x, z, sx, sz) => {
      K.deco(new THREE.BoxGeometry(Math.max(sx, 0.02), 1.5, Math.max(sz, 0.02)), glassMat, x, WALK_Y + 1.8, z);
      K.collider(x, WALK_Y + 1.6, z, Math.max(sx, 0.1), 3.2, Math.max(sz, 0.1));
    };
    const xo = -MX + 0.45 + W / 2;
    const zb = MZ - 0.45 - W / 2;
    const zt = MZ + CELLS * C + 0.45 + W / 2;
    const zc = (zb + zt) / 2;
    const len = zt - zb + W;
    [-xo, xo].forEach((x) => {
      solid(x, WALK_Y - 0.15, zc, W, 0.3, len, mats.wood);
      // inner railing only between the corners, so you can turn onto the next side
      rail(x - Math.sign(x) * (W / 2 - 0.05), WALK_Y, zc, 0.08, zt - zb - W);
      glassGuard(x - Math.sign(x) * (W / 2 - 0.05), zc, 0.06, zt - zb - W);
      rail(x + Math.sign(x) * (W / 2 - 0.05), WALK_Y, zc, 0.08, len);
    });
    [zb, zt].forEach((z, k) => {
      solid(0, WALK_Y - 0.15, z, xo * 2 + W, 0.3, W, mats.wood);
      rail(0, WALK_Y, z + (k ? -1 : 1) * (W / 2 - 0.05), xo * 2 - W, 0.08);
      glassGuard(0, z + (k ? -1 : 1) * (W / 2 - 0.05), xo * 2 - W, 0.06);
    });
    // the top railing keeps a gap where the stair goes down to the pond
    rail((-xo - W / 2 + xo - 1.3) / 2, WALK_Y, zt + W / 2 - 0.05, xo - 1.3 + xo + W / 2, 0.08);
    // the bottom railing keeps a gap where the stair arrives
    rail((-xo + 1.3 + xo + W / 2) / 2, WALK_Y, zb - W / 2 + 0.05, xo + W / 2 - (-xo + 1.3), 0.08);
    // supports under the walkway
    for (let z = zb; z <= zt; z += 6)
      [-xo, xo].forEach((x) => K.deco(new THREE.CylinderGeometry(0.12, 0.14, WALK_Y, 8), mats.iron, x, WALK_Y / 2, z));
    for (let x = -xo; x <= xo; x += 6)
      [zb, zt].forEach((z) => Math.abs(x) > 4 && K.deco(new THREE.CylinderGeometry(0.09, 0.11, WALK_Y, 8), mats.iron, x, WALK_Y / 2, z));
    // stair up from the plaza (left), stair down to the pond (right, beyond the exit)
    const sx = -xo + 0.2;
    const top1 = stairs(sx, -1.6, 1, 0, WALK_Y, 2, mats.stone);
    solid(sx, WALK_Y - 0.15, (top1 + zb) / 2, 2, 0.3, Math.max(0.5, zb - top1 + W / 2), mats.wood);
    const down = stairs(xo - 0.2, zt + W / 2, 1, WALK_Y, 0, 2, mats.stone);
    // after the maze: a gravel clearing with a heart flower bed, and the shore
    solid(0, -0.5, 54, 48, 1, 14, mats.gravel);
    const bed = new THREE.Shape();
    for (let k = 0; k <= 48; k++) {
      const [hx, hy] = Heart.curve((k / 48) * Math.PI * 2);
      if (k) bed.lineTo(hx * 0.12, (hy - 2.5) * 0.12);
      else bed.moveTo(hx * 0.12, (hy - 2.5) * 0.12);
    }
    const bm = K.deco(new THREE.ExtrudeGeometry(bed, { depth: 0.25, bevelEnabled: false }).rotateX(-Math.PI / 2), mats.leaf, -8, 0, 54);
    bm.rotation.y = Math.PI;
    K.collider(-8, 0.125, 54.1, 3.6, 0.25, 3.2);
    lantern(-4, 0, 50);
    lantern(4, 0, 58);
    lantern(9, 0, 52);
    // guide boardwalk along the pond, high enough that the blind one cannot hop on it
    const BW = 2.2;
    const bx = 8.5;
    const bz0 = 59;
    const bz1 = 104;
    const bzs = stairs(bx, 52.6, 1, 0, BW, 2.2, mats.wood);
    solid(bx, BW - 0.15, (bzs + bz0) / 2, 2.2, 0.3, bz0 - bzs + 0.02, mats.wood);
    rail(bx - 1.05, BW, (bzs + bz0) / 2, 0.08, bz0 - bzs, 1.15);
    rail(bx + 1.05, BW, (bzs + bz0) / 2, 0.08, bz0 - bzs, 1.15);
    solid(bx, BW - 0.15, (bz0 + bz1) / 2, 2.2, 0.3, bz1 - bz0, mats.wood);
    rail(bx - 1.05, BW, (bz0 + bz1) / 2, 0.08, bz1 - bz0, 1.15);
    rail(bx + 1.05, BW, (bz0 + bz1) / 2, 0.08, bz1 - bz0, 1.15);
    for (let z = bz0; z <= bz1; z += 4.5)
      K.deco(new THREE.CylinderGeometry(0.1, 0.12, BW + 3, 8), mats.darkWood, bx, BW / 2 - 1.5, z);
    stairs(bx, bz1, 1, BW, 0, 2.2, mats.wood);
    // small lanterns sitting on the outer railing, out of the camera's way
    for (let z = bz0 + 3; z < bz1; z += 9) lantern(bx + 1.05, BW + 1.2, z, '#ffd09a', false);
    buildPond();
    // far shore and the path to the ballroom
    solid(0, -0.5, 104.5, 30, 1, 8, mats.paver);
    lantern(-3, 0, 103);
    lantern(3, 0, 106);
    buildBallroom();
    // markers the guide drops on the stones (pooled)
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.62, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#8fd8ff').multiplyScalar(1.3),
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.position.y = 0.05;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.25, 2.6, 10, 1, true).translate(0, 1.3, 0),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#8fd8ff').multiplyScalar(1.1),
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      g.add(ring, col);
      g.visible = false;
      group.add(g);
      markers.push({ g, ring, col });
    }
    // the stone the guide is looking at (only on the guide's screen)
    hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.9, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffffff').multiplyScalar(0.7),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    hoverRing.visible = false;
    group.add(hoverRing);
    // fireflies over the garden and the pond
    const n = 420;
    const fp = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      fp[i * 3] = O.x + (Math.random() - 0.5) * 44;
      fp[i * 3 + 1] = O.y + 0.6 + Math.random() * 5;
      fp[i * 3 + 2] = O.z + 6 + Math.random() * 98;
      ph[i] = Math.random() * 100;
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    flies = new THREE.Points(
      fg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uPx: { value: 1 } },
        vertexShader: `
          attribute float aPh;
          uniform float uT, uPx;
          varying float vA;
          void main() {
            vec3 p = position + vec3(sin(uT * .4 + aPh) * 1.2, sin(uT * .7 + aPh * 1.3) * .5, cos(uT * .35 + aPh) * 1.2);
            vec4 mv = modelViewMatrix * vec4(p, 1.);
            gl_Position = projectionMatrix * mv;
            vA = .35 + .65 * pow(max(0., sin(uT * 1.7 + aPh * 3.)), 3.);
            gl_PointSize = uPx * (3. + 3. * vA) * (12. / -mv.z);
          }`,
        fragmentShader: `
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - .5);
            if (d > .5) discard;
            float a = pow(1. - d * 2., 2.) * vA;
            gl_FragColor = vec4(vec3(1., .85, .45) * a * .85, a);
          }`,
      }),
    );
    flies.frustumCulled = false;
    group.add(flies);
    // a dark wood all around the garden, and far hills
    const trunkG = new THREE.CylinderGeometry(0.22, 0.32, 5, 7);
    const crownG = new THREE.ConeGeometry(2.2, 6.5, 9);
    const ring = [];
    for (let z = -12; z < 150; z += 4.5)
      [-1, 1].forEach((sd) => ring.push([sd * (27 + Math.random() * 7), z + Math.random() * 3]));
    for (let x = -26; x <= 26; x += 4.5) ring.push([x + Math.random() * 2, -12 - Math.random() * 6]);
    const ti = new THREE.InstancedMesh(trunkG, mats.darkWood, ring.length);
    const ci = new THREE.InstancedMesh(crownG, mats.leaf, ring.length * 2);
    const dmm = new THREE.Object3D();
    ring.forEach(([x, z], k) => {
      const s = 0.8 + Math.random() * 0.7;
      dmm.position.copy(P(x, 2.5 * s, z));
      dmm.scale.set(s, s, s);
      dmm.rotation.set(0, 0, 0);
      dmm.updateMatrix();
      ti.setMatrixAt(k, dmm.matrix);
      for (let c = 0; c < 2; c++) {
        dmm.position.copy(P(x, (5.5 + c * 2.4) * s, z));
        dmm.scale.set(s * (1 - c * 0.3), s, s * (1 - c * 0.3));
        dmm.updateMatrix();
        ci.setMatrixAt(k * 2 + c, dmm.matrix);
      }
    });
    ti.instanceMatrix.needsUpdate = true;
    ci.instanceMatrix.needsUpdate = true;
    group.add(ti, ci);
    // ground under the wood (it is outside the play area, behind the hedges and cliffs)
    [-1, 1].forEach((sd) => K.deco(new THREE.BoxGeometry(24, 1, 170), mats.turf, sd * 34, -0.5, 68));
    K.deco(new THREE.BoxGeometry(92, 1, 20), mats.turf, 0, -0.5, -18.9);
    for (let k = 0; k < 7; k++) {
      const hill = K.deco(new THREE.SphereGeometry(60, 18, 10), new THREE.MeshBasicMaterial({ color: '#160b22' }), -150 + k * 50, -38, 230 + (k % 2) * 30);
      hill.scale.set(1.4, 0.6, 1);
    }
    // a big soft moon
    const moon = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: LvKit.tex(256, 256, (g) => {
          const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
          gr.addColorStop(0, 'rgba(255,246,236,1)');
          gr.addColorStop(0.32, 'rgba(250,232,220,.95)');
          gr.addColorStop(0.36, 'rgba(200,170,220,.25)');
          gr.addColorStop(1, 'rgba(120,80,160,0)');
          g.fillStyle = gr;
          g.fillRect(0, 0, 256, 256);
        }),
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    moon.scale.setScalar(60);
    moon.position.copy(P(-70, 90, 190));
    group.add(moon);
    LvKit.light(group, P(0, 9, 28), '#9fb4ff', 0.7, 60);
    LvKit.light(group, P(0, 6, 82), '#ffb98a', 0.9, 40);
    void down;
  };

  // ---------- per-frame visuals ----------
  const tmpC = new THREE.Color();
  const update = (dt, t, st) => {
    if (!built || !group.visible) return;
    screen.update(dt, t);
    danceScreen.update(dt, t);
    flies.material.uniforms.uT.value = t;
    flies.material.uniforms.uPx.value = R.renderer.getPixelRatio();
    if (waterNorm) {
      waterNorm.offset.x = t * 0.012;
      waterNorm.offset.y = t * 0.02;
    }
    lanterns.forEach((l) => {
      if (l.float) {
        l.float.position.y = O.y - 0.3 + Math.sin(t * 1.2 + l.ph) * 0.05;
        l.float.rotation.y = t * 0.2 + l.ph;
        return;
      }
      const f = 0.9 + Math.sin(t * 7 + l.ph) * 0.05 + Math.sin(t * 13 + l.ph * 2) * 0.04;
      l.bulb.material.color.copy(l.base).multiplyScalar(f);
    });
    plateMeshes.forEach((pm) => {
      pm.flash = Math.max(0, pm.flash - dt);
      pm.mesh.material.emissiveIntensity = pm.flash > 0 ? 0.8 * (pm.flash / 1.2) : st.guide ? 0.22 + Math.sin(t * 2 + pm.p.x) * 0.06 : 0;
      if (pm.p.bell) pm.p.bell.rotation.z = pm.flash > 0 ? Math.sin(t * 30) * 0.5 * pm.flash : 0;
    });
    // markers: pulse
    markers.forEach((mk) => {
      if (!mk.g.visible) return;
      const k = 1 + Math.sin(t * 5) * 0.12;
      mk.ring.scale.setScalar(k);
      mk.col.material.opacity = 0.18 + Math.sin(t * 5) * 0.07;
    });
    // lily pads sink while somebody stands on them, then float back
    stones.forEach((s) => {
      if (s.kind !== 'p') return;
      const on = st.onPad && st.onPad(s);
      s.t = on ? s.t + dt : Math.max(0, s.t - dt * 0.6);
      const want = s.t > 1.5 ? -0.9 : 0;
      s.sink = damp(s.sink || 0, want, want < 0 ? 2.2 : 1.2, dt);
      s.m.position.y = O.y - 0.04 + s.sink;
      s.b.min[1] = O.y - 1 + s.sink;
      s.b.max[1] = O.y + s.sink;
      s.top = s.sink;
    });
    // dance floor lights (only the guide sees the targets)
    if (tileGlow.mesh) {
      const tg = st.tiles || {};
      for (let k = 0; k < 49; k++) {
        const want = tg[k] || null;
        const c = tileGlow.cols[k];
        if (want) tmpC.set(want[0]).multiplyScalar(want[1]);
        else tmpC.setRGB(0, 0, 0);
        c.lerp(tmpC, Math.min(1, dt * 10));
        tileGlow.mesh.setColorAt(k, c);
      }
      tileGlow.mesh.instanceColor.needsUpdate = true;
    }
    chandeliers.forEach((ch, i) => {
      ch.g.rotation.y = t * 0.05 * (i % 2 ? -1 : 1);
      const beat = st.beat || 0;
      ch.candles.forEach((b) => b.material.color.setRGB(1, 0.84, 0.63).multiplyScalar(1.1 + beat * 0.35));
    });
    // the heart-galaxy forms at the end, the card comes down
    const U = heart.U;
    U.uTime.value = t;
    U.uPx.value = R.renderer.getPixelRatio() * 0.16;
    U.uForm.value = damp(U.uForm.value, st.finale ? 1 : 0, 0.7, dt);
    heart.core.material.opacity = U.uForm.value * 0.1;
    U.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.4)), 10) * 0.6;
    card.visible = !!st.card;
    if (card.visible) {
      const y = damp(card.position.y - O.y, 1.6 + Math.sin(t * 2) * 0.1, 1.2, dt);
      card.position.y = O.y + y;
      card.rotation.y = t * 0.8;
    }
  };

  const hover = (i, t) => {
    if (!hoverRing) return;
    const s = stones[i];
    hoverRing.visible = !!s;
    if (!s) return;
    hoverRing.position.set(O.x + s.x, O.y + s.top + 0.06, O.z + s.z);
    hoverRing.scale.setScalar((s.r / 0.9) * (1 + Math.sin(t * 6) * 0.05));
  };
  const markerAt = (k, pos) => {
    const mk = markers[k];
    if (!mk) return;
    if (!pos) {
      mk.g.visible = false;
      return;
    }
    mk.g.visible = true;
    mk.g.position.set(O.x + pos[0], O.y + pos[1] + 0.02, O.z + pos[2]);
  };

  return {
    O,
    P,
    TILE,
    GZ,
    WALK_Y,
    build,
    get built() {
      return built;
    },
    get seed() {
      return seedUsed;
    },
    get screen() {
      return screen;
    },
    get danceScreen() {
      return danceScreen;
    },
    maze,
    stones,
    plateMeshes,
    update,
    markerAt,
    hover,
    hide() {
      group.visible = false;
      if (card) card.position.y = O.y + 8;
    },
    rel: K.rel,
    cellPos,
    spawn(stage, who, x) {
      const s = who === 'dame' ? -1 : 1;
      const blind = x && x.blind === who;
      if (stage <= 1) {
        if (blind && x && x.mid) return P(maze.mid.x, 0, maze.mid.z);
        // the guide starts at the foot of the walkway stair, the blind one at the maze gate
        return blind ? P(0, 0, 6.5) : P(-15.5, 0, -1.5);
      }
      if (stage === 2) {
        if (blind) return x && x.isle ? P(0, 0, 82.5) : P(0, 0, 60.2);
        return P(8.5, 2.2, 60);
      }
      if (stage === 5) return P(s * 1.5, 0, GZ - 2);
      return P(s * 3 * TILE, 0, GZ);
    },
    // where you stand in the maze / pond / ballroom
    inMaze: (q) => q.z > MZ + 0.2 && q.z < MZ + CELLS * C - 0.2 && Math.abs(q.x) < -MX && q.y < 3,
    mazeExit: (q) => q.z > MZ + CELLS * C - 0.5 && q.z < MZ + CELLS * C + 3 && Math.abs(q.x) < 3 && q.y < 2,
    nearMid: (q) => maze.mid && Math.hypot(q.x - maze.mid.x, q.z - maze.mid.z) < 2.4 && q.y < 2,
    plateAt(q) {
      if (q.y > 0.6) return null;
      return maze.plates.find((p) => Math.abs(q.x - p.x) < p.w / 2 + 0.15 && Math.abs(q.z - p.z) < p.d / 2 + 0.15) || null;
    },
    onPondPath: (q) => q.z > 61.5 && q.z < 100.3 && Math.abs(q.x) < 7,
    onIsland: (q) => q.z > 80 && q.z < 84.2 && Math.abs(q.x) < 3.2 && q.y > -0.4,
    farShore: (q) => q.z > 100.6 && q.z < 108 && q.y > -0.5,
    padUnder(q) {
      return stones.find((s) => s.kind === 'p' && Math.hypot(q.x - s.x, q.z - s.z) < s.r && Math.abs(q.y - s.top) < 0.5);
    },
    // the guide aims at a stone from the boardwalk: the closest stone to the camera ray
    stoneFromRay(origin, dir) {
      // first: where the view ray meets the water level, inside a stone's top
      let best = -1;
      if (dir.y < -0.02) {
        const k = (O.y - origin.y) / dir.y;
        const hx = origin.x + dir.x * k - O.x;
        const hz = origin.z + dir.z * k - O.z;
        let bd = 1e9;
        stones.forEach((s, i) => {
          const d = Math.hypot(hx - s.x, hz - s.z);
          if (d < s.r + 0.45 && d < bd) {
            bd = d;
            best = i;
          }
        });
        if (best >= 0 && k < 30) return best;
      }
      // else the stone closest to the ray, in angle
      let bd = 0.09;
      best = -1;
      stones.forEach((s, i) => {
        const p = V3(O.x + s.x, O.y + s.top, O.z + s.z);
        const v = p.clone().sub(origin);
        const along = v.dot(dir);
        if (along < 1 || along > 28) return;
        const d = v.addScaledVector(dir, -along).length() / along;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    stonePos: (i) => {
      const s = stones[i];
      return s ? [s.x, s.top, s.z] : null;
    },
    inBallroom: (q) => q.z > 108.5 && q.z < 142 && Math.abs(q.x) < 16.5,
    tileOf(q) {
      const i = Math.round(q.x / TILE) + 3;
      const j = Math.round((q.z - GZ) / TILE) + 3;
      if (i < 0 || j < 0 || i > 6 || j > 6 || q.y > 1.2) return null;
      const cx = (i - 3) * TILE;
      const cz = GZ + (j - 3) * TILE;
      // a little margin so standing near a seam still counts
      if (Math.abs(q.x - cx) > TILE * 0.5 || Math.abs(q.z - cz) > TILE * 0.5) return null;
      return [i, j];
    },
    tileCenter: (i, j) => P((i - 3) * TILE, 0, GZ + (j - 3) * TILE),
    nearCard: (q) => Math.hypot(q.x, q.z - GZ) < 2.4 && q.y < 2.5,
  };
})();
