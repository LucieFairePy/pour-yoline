const Arena = (() => {
  const O = V3(0, 80, 700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const ROWS = 10;
  const COLS = { valet: [6, 4, 2], dame: [-2, -4, -6] };
  const rowZ = (r) => 13.5 + r * 3;
  const CAB = { dame: -4, valet: 4 };
  const CAB_Z0 = 94;
  const CAB_Z1 = 98;
  const CEIL_TOP = 3.8;
  const CEIL_LOW = 1.95;

  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);

  // textured surfaces (lazy: Tex generates on first use, at build time)
  let stone;
  let rock;
  let metal;
  let concrete;
  const mats = () => {
    stone = Tex.mat('stone', { color: '#6e5e7c', scale: 4.5, bump: 1.2 });
    rock = Tex.mat('rock', { color: '#55445f', scale: 7 });
    metal = Tex.mat('plaster', { color: '#5a4a6a', rough: 0.85, metal: 0.25, scale: 3 });
    concrete = Tex.mat('concrete', { color: '#7d6e88', scale: 2 });
  };
  const edge = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const rose = edge('#ff4f86');
  const gold = edge('#ffcf8a', 1.6);

  const solid = (x, y, z, sx, sy, sz, mat, opt) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat || stone);
    m.position.copy(P(x, y, z));
    group.add(m);
    const b = Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
    return { m, b };
  };

  const platform = (z0, z1, w) => {
    const d = z1 - z0;
    solid(0, -1, (z0 + z1) / 2, w, 2, d);
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, d), rose);
      l.position.copy(P((s * w) / 2, 0.02, (z0 + z1) / 2));
      group.add(l);
    }
    for (const z of [z0, z1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), rose);
      l.position.copy(P(0, 0.02, z));
      group.add(l);
    }
    const under = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, 9, 6), rock);
    under.rotation.x = Math.PI;
    under.position.copy(P(0, -6.5, (z0 + z1) / 2));
    under.scale.z = d / w;
    group.add(under);
  };

  const sprite = (txt, size, color) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 16;
    g.font = 'bold 72px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    Icons.fillText(g, txt, 64, 68);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: t, toneMapped: false, depthWrite: false }),
    );
    s.scale.setScalar(size);
    return s;
  };

  const cardMesh = () => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({
        map: Tex.card('10', '♥'),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    m.material.color.setScalar(1.15);
    return m;
  };

  let built = false;
  let role = 'dame';
  const tiles = { mine: [], theirs: [] };
  const rings = [];
  const cab = {};
  let harness;
  let crank;
  let curve;
  let screen;
  let card;
  let dust;
  let bridgeFx = null;
  const blind = [];
  const own = [];
  const pq = V3();
  let tileTex;
  let glassMat;
  let lit;

  const build = (myRole, seed) => {
    if (built) return;
    built = true;
    role = myRole;
    group.visible = true;
    mats();

    platform(0, 12, 18);
    platform(42, 52, 18);
    platform(82, 102, 22);

    const r = rng(seed);
    const path = {};
    for (const who of ['valet', 'dame']) {
      let c = (r() * 3) | 0;
      path[who] = [];
      for (let i = 0; i < ROWS; i++) {
        path[who].push(c);
        c = clamp(c + (((r() * 3) | 0) - 1), 0, 2);
      }
    }

    // ---- the two bridges ----
    // Glass tiles with a glowing frame and a painted "row + lane" label so the one who sees
    // can guide by voice ("rangée 4, à gauche"). The blind side gets a designed void:
    // girders, pylons, a cloud sea far below, and every tile lights up once stepped on.
    const LANE = ['G', 'M', 'D'];
    const KCOL = { seen: '#ff5f8a', plain: '#ffcf8a', real: '#6cc8ff', fake: '#ff3a4a' };
    const texCache = {};
    tileTex = (row, lane, kind) => {
      const key = row + lane + kind;
      if (texCache[key]) return texCache[key];
      const W = 192;
      const H = 280;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      const col = KCOL[kind];
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, 'rgba(255,255,255,0.22)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.03)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.10)');
      gr.addColorStop(1, 'rgba(255,255,255,0.04)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.shadowColor = col;
      g.shadowBlur = 18;
      g.strokeStyle = col;
      g.lineWidth = 9;
      g.strokeRect(10, 10, W - 20, H - 20);
      g.lineWidth = 2;
      g.globalAlpha = 0.6;
      g.strokeRect(26, 26, W - 52, H - 52);
      g.globalAlpha = 1;
      if (kind === 'fake') {
        g.lineWidth = 14;
        g.beginPath();
        g.moveTo(44, 64);
        g.lineTo(W - 44, H - 64);
        g.moveTo(W - 44, 64);
        g.lineTo(44, H - 64);
        g.stroke();
      } else {
        g.fillStyle = col;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = 'bold 96px Georgia, serif';
        g.fillText(String(row), W / 2, H / 2 - 30);
        g.font = 'bold 56px "IBM Plex Mono", monospace';
        g.fillText(lane, W / 2, H / 2 + 62);
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      texCache[key] = t;
      return t;
    };
    const tileGeo = new THREE.BoxGeometry(1.8, 0.3, 2.6);
    const edgeGeo = new THREE.EdgesGeometry(tileGeo);
    const topGeo = new THREE.PlaneGeometry(1.74, 2.54).rotateX(-Math.PI / 2).rotateY(Math.PI);
    const glass = {};
    glassMat = (kind) =>
      glass[kind] ||
      (glass[kind] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(KCOL[kind]).multiplyScalar(0.35),
        emissive: KCOL[kind],
        emissiveIntensity: kind === 'fake' ? 0.08 : 0.14,
        roughness: 0.08,
        metalness: 0.5,
        transparent: true,
        opacity: kind === 'fake' ? 0.3 : 0.5,
        depthWrite: false,
      }));
    const makeTile = (x, z, row, lane, kind) => {
      const t = new THREE.Group();
      t.position.copy(P(x, -0.15, z));
      const body = new THREE.Mesh(tileGeo, glassMat(kind));
      const top = new THREE.Mesh(
        topGeo,
        new THREE.MeshBasicMaterial({
          map: tileTex(row, lane, kind),
          transparent: true,
          depthWrite: false,
          color: new THREE.Color().setScalar(kind === 'plain' ? 0.55 : 0.75),
        }),
      );
      top.position.y = 0.156;
      const lines = new THREE.LineSegments(
        edgeGeo,
        new THREE.LineBasicMaterial({
          color: new THREE.Color(KCOL[kind]).multiplyScalar(kind === 'fake' ? 1 : 1.5),
          toneMapped: false,
          transparent: true,
        }),
      );
      t.add(body, top, lines);
      t.userData = { top, lines, body, k: 1, kind, x, z };
      group.add(t);
      return t;
    };
    lit = (t, k) => {
      t.visible = k > 0.01;
      t.userData.top.material.opacity = k;
      t.userData.lines.material.opacity = k;
      t.scale.setScalar(0.85 + 0.15 * Math.min(1, k));
    };

    for (let i = 0; i < ROWS; i++) {
      const z = rowZ(i);
      COLS.valet.forEach((x, c) => {
        const real = path.valet[i] === c;
        if (!real) return;
        if (role === 'valet') {
          Phys.box(O.x + x, O.y - 0.15, O.z + z, 1.8, 0.3, 2.6, { tag: 'tile' });
          // blind: invisible until the Valet stands on it, then it stays lit (a footprint)
          const t = makeTile(x, z, i + 1, LANE[c], 'real');
          t.userData.k = 0;
          lit(t, 0);
          blind.push(t);
        }
        if (role === 'dame') makeTile(x, z, i + 1, LANE[c], 'seen');
      });
      COLS.dame.forEach((x, c) => {
        const real = path.dame[i] === c;
        if (role === 'dame') {
          // all three look the same for her: she has to trust the other one's voice
          const t = makeTile(x, z, i + 1, LANE[c], 'plain');
          t.userData.real = real;
          own.push(t);
          if (real) Phys.box(O.x + x, O.y - 0.15, O.z + z, 1.8, 0.3, 2.6, { tag: 'tile' });
        } else makeTile(x, z, i + 1, LANE[c], real ? 'real' : 'fake');
      });
      const n = sprite(String(i + 1), 1.3, '#e8bd84');
      n.position.copy(P(0, 1.2, z));
      group.add(n);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), gold);
        post.position.copy(P(s * 8, -0.2, z));
        group.add(post);
      }
    }

    // structure of the void: girders under both bridges, a central spine of pylons
    const girder = edge('#ff4f86', 0.9);
    const gold2 = edge('#ffcf8a', 0.4);
    [-7.6, -0.6, 0.6, 7.6].forEach((x) => {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 30), girder);
      g.position.copy(P(x, -0.55, 27));
      group.add(g);
    });
    const pylonMat = Tex.mat('metal', { color: '#3a2c48', rough: 0.5, metal: 0.6, scale: 2 });
    for (let i = 0; i < ROWS; i += 2) {
      const z = rowZ(i) + 1.5;
      const py = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.5, 40, 8), pylonMat);
      py.position.copy(P(0, -20.6, z));
      group.add(py);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.12, 0.12), gold2);
      cross.position.copy(P(0, -0.62, z));
      group.add(cross);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), edge('#ffcf8a', 2.4));
      lamp.position.copy(P(0, -0.45, z));
      group.add(lamp);
    }
    // entrance and exit gates over each bridge (solid posts, on the platforms)
    for (const z of [11.7, 42.3]) {
      for (const x of [-7.4, -0.75, 0.75, 7.4]) solid(x, 1.75, z, 0.3, 3.5, 0.3, metal);
      for (const sx of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(6.95, 0.1, 0.1), sx < 0 ? rose : edge('#6cc8ff', 2));
        bar.position.copy(P(sx * 4.075, 3.5, z));
        group.add(bar);
      }
    }
    // cloud sea far below: makes the drop feel deep instead of a black hole
    const cloudU = { uTime: { value: 0 } };
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 220).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: cloudU,
        transparent: true,
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec2 vP;
          void main() {
            vP = position.xz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vP;
          float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3. - 2. * f);
            return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y);
          }
          void main() {
            vec2 p = vP * 0.035;
            float v = 0.;
            float a = 0.5;
            for (int i = 0; i < 5; i++) { v += a * n(p + uTime * 0.02 * float(i + 1)); p *= 2.03; a *= 0.5; }
            float edgeF = 1. - smoothstep(60., 110., length(vP));
            vec3 c = mix(vec3(0.16, 0.05, 0.22), vec3(0.85, 0.35, 0.6), smoothstep(0.45, 0.85, v));
            gl_FragColor = vec4(c, smoothstep(0.3, 0.75, v) * 0.75 * edgeF);
          }
        `,
      }),
    );
    clouds.position.copy(P(0, -32, 50));
    group.add(clouds);
    bridgeFx = { cloudU };

    ['G', 'M', 'D'].forEach((l, c) => {
      for (const who of ['valet', 'dame']) {
        const s = sprite(l, 0.9, '#c495a6');
        s.position.copy(P(COLS[who][c], 0.7, 11.2));
        group.add(s);
      }
    });
    const tagV = sprite('♠', 1.6, '#6cc8ff');
    tagV.position.copy(P(4, 4.6, 11.7));
    const tagD = sprite('♥', 1.6, '#ff5f8a');
    tagD.position.copy(P(-4, 4.6, 11.7));
    group.add(tagV, tagD);

    solid(-5, 0.6, 49.5, 0.5, 1.2, 0.5, metal);
    crank = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 20), gold);
    crank.position.copy(P(-5, 1.4, 49.5));
    group.add(crank);
    const wl = sprite('♥', 0.8, '#ff5f8a');
    wl.position.copy(P(-5, 2.4, 49.5));
    group.add(wl);

    const A = P(4, 4.6, 51.5);
    const B = P(4, 4.6, 83.5);
    const M = A.clone().lerp(B, 0.5);
    M.y -= 1.6;
    curve = new THREE.QuadraticBezierCurve3(A, M, B);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.022, 5), edge('#a07850', 0.7));
    group.add(cable);
    for (const p of [A, B]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.6, 10), metal);
      pole.position.set(p.x, O.y + 2.3, p.z);
      group.add(pole);
      Phys.box(p.x, O.y + 2.3, p.z, 0.3, 4.6, 0.3);
    }
    harness = new THREE.Group();
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6).rotateZ(Math.PI / 2),
      gold,
    );
    bar.position.y = -0.55;
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4).translate(0, -0.27, 0),
      gold,
    );
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), gold);
    harness.add(bar, rope, wheel);
    group.add(harness);
    const hl = sprite('♠', 0.8, '#6cc8ff');
    hl.position.copy(P(4, 1.6, 50.5));
    group.add(hl);

    [
      [0, 6.5, 61],
      [0, 7.5, 72.5],
    ].forEach(([x, y, z]) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 8, 24), edge('#ff4f86', 1));
      m.position.copy(P(x, y, z));
      group.add(m);
      rings.push({ pos: m.position.clone(), m });
    });

    for (const who of ['dame', 'valet']) {
      const x = CAB[who];
      const col = who === 'dame' ? '#ff5f8a' : '#6cc8ff';
      solid(x, 2, CAB_Z1 + 0.15, 3.6, 4, 0.3, metal);
      solid(x - 1.65, 2, (CAB_Z0 + CAB_Z1) / 2, 0.3, 4, CAB_Z1 - CAB_Z0 + 0.3, metal);
      solid(x + 1.65, 2, (CAB_Z0 + CAB_Z1) / 2, 0.3, 4, CAB_Z1 - CAB_Z0 + 0.3, metal);
      solid(x, 4.15, (CAB_Z0 + CAB_Z1) / 2, 3.6, 0.3, CAB_Z1 - CAB_Z0 + 0.3, metal);
      const doorMat = Tex.mat('plaster', {
        color: '#4a3858',
        rough: 0.6,
        metal: 0.4,
        scale: 3,
        emissive: col,
        emissiveIntensity: 0.06,
      });
      const door = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), doorMat);
      group.add(door);
      const doorB = Phys.add(
        [O.x + x - 1.5, O.y, O.z + CAB_Z0 - 0.1],
        [O.x + x + 1.5, O.y + 4, O.z + CAB_Z0 + 0.1],
        { dyn: true },
      );
      doorB.on = false;
      const ceil = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.3, CAB_Z1 - CAB_Z0),
        Tex.mat('metal', {
          color: '#5a3040',
          rough: 0.6,
          metal: 0.6,
          scale: 1.5,
          emissive: '#ff2040',
          emissiveIntensity: 0.12,
        }),
      );
      group.add(ceil);
      const ceilB = Phys.add([0, 0, 0], [0, 0, 0], { dyn: true });
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16).rotateX(Math.PI / 2),
        edge('#ff2a3a', 1.6),
      );
      btn.position.copy(P(x, 1.25, CAB_Z1 - 0.05));
      group.add(btn);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.06), edge(col, 2));
      lamp.position.copy(P(x, 4.4, CAB_Z0 - 0.2));
      group.add(lamp);
      const tag = sprite(who === 'dame' ? '♥' : '♠', 1.4, col);
      tag.position.copy(P(x, 5.4, CAB_Z0));
      group.add(tag);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.05, 0.05), edge('#ff2a3a', 3));
      strip.position.set(0, -0.17, -(CAB_Z1 - CAB_Z0) / 2 + 0.05);
      ceil.add(strip);
      const strip2 = strip.clone();
      strip2.position.z = (CAB_Z1 - CAB_Z0) / 2 - 0.05;
      ceil.add(strip2);
      const scr = makeScreen(1.3, 0.55, 512);
      scr.mesh.position.copy(P(x, 1.78, CAB_Z1 - 0.02));
      scr.mesh.rotation.y = Math.PI;
      group.add(scr.mesh);
      cab[who] = { x, door, doorB, ceil, ceilB, btn, scr, doorY: 0, ceilY: CEIL_TOP };
    }

    screen = makeScreen(16, 8, 1024);
    screen.mesh.position.copy(P(0, 13, 104));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);

    card = cardMesh();
    card.position.copy(P(0, 1.6, 90));
    card.visible = false;
    group.add(card);

    const N = 600;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = O.x + (r() - 0.5) * 120;
      pos[i * 3 + 1] = O.y + (r() - 0.6) * 60;
      pos[i * 3 + 2] = O.z + r() * 140 - 20;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(
      dg,
      new THREE.PointsMaterial({
        color: '#ffb0c8',
        size: 0.18,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(dust);
  };

  const harnessPos = (t, out = V3()) => curve.getPoint(clamp(t, 0, 1), out);

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
    rings,
    CAB,
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) return P(s * 3, 0, 5);
      if (stage <= 2) return P(s * 3, 0, 46);
      if (stage === 3) return who === 'dame' ? P(-3, 0, 47) : P(4, 0, 87);
      return P(s * 3, 0, 88);
    },
    rel(p, out = V3()) {
      return out.set(p.x - O.x, p.y - O.y, p.z - O.z);
    },
    onA: (q) => q.z < 12.2 && q.y > -1,
    onB: (q) => q.z > 41.8 && q.z < 52.3 && q.y > -1 && Math.abs(q.x) < 9.3,
    onC: (q) => q.z > 81.2 && q.y > -1 && Math.abs(q.x) < 11.3,
    inCabin: (q, who) =>
      Math.abs(q.x - CAB[who]) < 1.45 &&
      q.z > CAB_Z0 + 0.8 &&
      q.z < CAB_Z1 - 0.1 &&
      q.y > -0.5 &&
      q.y < 1,
    nearWinch: (q) => Math.hypot(q.x + 5, q.z - 49.5) < 2.4,
    nearHarness: (q) => Math.hypot(q.x - 4, q.z - 51.5) < 2.4 && q.y > -0.5,
    nearButton: (q, who) => Math.abs(q.x - CAB[who]) < 1.45 && q.z > CAB_Z1 - 1.6,
    nearCard: (q) => Math.hypot(q.x, q.z - 90) < 3.2,
    harnessPos,
    update(dt, t, S) {
      if (!built) return;
      screen.update(dt, t);
      dust.rotation.y = Math.sin(t * 0.02) * 0.02;
      if (bridgeFx) bridgeFx.cloudU.uTime.value = t;
      // footprints: a tile under my feet lights up and stays lit; a fake one I fell through turns red
      if ((S.a || {}).stage === 1 || blind.some((b) => b.userData.k > 0 && b.userData.k < 1)) {
        const p = Player.body.p;
        pq.set(p.x - O.x, p.y - O.y, p.z - O.z);
        const over = (u) => Math.abs(pq.x - u.x) < 0.95 && Math.abs(pq.z - u.z) < 1.35;
        blind.forEach((b) => {
          const u = b.userData;
          if (u.k === 0 && Player.body.grounded && pq.y > -0.3 && pq.y < 0.4 && over(u)) {
            u.k = 0.001;
            Sound.play('step');
            Fx.burst(b.position.clone().add(V3(0, 0.3, 0)), '#6cc8ff', 26, 2.5, 0.5, 0);
          }
          if (u.k > 0 && u.k < 1) {
            u.k = Math.min(1, u.k + dt * 2.5);
            lit(b, u.k);
          }
        });
        own.forEach((b) => {
          const u = b.userData;
          if (u.done || !over(u)) return;
          if (u.real && Player.body.grounded && pq.y > -0.3 && pq.y < 0.4) {
            u.done = true;
            u.lines.material.color.set('#7cf0c8').multiplyScalar(2.2);
            Fx.burst(b.position.clone().add(V3(0, 0.3, 0)), '#7cf0c8', 20, 2.2, 0.45, 0);
          } else if (!u.real && pq.y < -0.6 && pq.y > -3) {
            u.done = true;
            u.top.material.map = tileTex(0, '', 'fake');
            u.lines.material.color.set('#ff3a4a').multiplyScalar(1.6);
            u.body.material = glassMat('fake');
          }
        });
      }
      const a = S.a || {};
      const h = S.h || { t: 0 };
      harnessPos(h.t, harness.position);
      if (a.hold) crank.rotation.z -= dt * 6;
      rings.forEach((rg) => {
        const on = a.stage === 3;
        rg.m.material.color
          .setRGB(1, 0.31, 0.53)
          .multiplyScalar(on ? 2.2 + Math.sin(t * 4) * 0.5 : 0.25);
        rg.m.rotation.y = t * (on ? 1.5 : 0.3);
      });
      const c = a.cab || {};
      for (const who of ['dame', 'valet']) {
        const k = cab[who];
        const closed = c.phase === 'run' || (c.phase === 'fail' && c.who !== who);
        k.doorY = damp(k.doorY, closed ? 0 : 3.3, 6, dt);
        k.door.position.set(O.x + k.x + Math.sign(k.x) * k.doorY, O.y + 2, O.z + CAB_Z0);
        k.doorB.on = closed;
        let cy = CEIL_TOP;
        if (c.phase === 'run') cy = lerp(CEIL_TOP, CEIL_LOW, clamp(c.t / 20, 0, 1));
        if (c.phase === 'fail') cy = c.who === who ? CEIL_TOP : c.y || CEIL_TOP;
        k.ceilY = damp(k.ceilY, cy, 5, dt);
        k.ceil.position.set(O.x + k.x, O.y + k.ceilY + 0.15, O.z + (CAB_Z0 + CAB_Z1) / 2);
        const bx = O.x + k.x;
        const bz0 = O.z + CAB_Z0;
        const bz1 = O.z + CAB_Z1;
        k.ceilB.min[0] = bx - 1.5;
        k.ceilB.min[1] = O.y + k.ceilY;
        k.ceilB.min[2] = bz0;
        k.ceilB.max[0] = bx + 1.5;
        k.ceilB.max[1] = O.y + k.ceilY + 0.3;
        k.ceilB.max[2] = bz1;
        k.btn.scale.z = c.phase === 'run' ? 1 + Math.sin(t * 8) * 0.15 : 1;
        k.scr.update(dt, t);
      }
      card.visible = c.phase === 'win';
      card.rotation.y = t * 1.4;
      card.position.y = O.y + 1.6 + Math.sin(t * 2) * 0.15;
    },
    cabShow(main, sub, color) {
      Object.values(cab).forEach((k) => k.scr.show(main, sub, color));
    },
    ceilingFor(who) {
      return cab[who] ? cab[who].ceilY : CEIL_TOP;
    },
    CEIL_TOP,
    CEIL_LOW,
  };
})();
