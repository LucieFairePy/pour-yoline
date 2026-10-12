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

  const stone = new THREE.MeshStandardMaterial({
    color: '#241628',
    roughness: 0.85,
    metalness: 0.1,
  });
  const edge = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const rose = edge('#ff4f86');
  const gold = edge('#ffcf8a', 1.6);

  const solid = (x, y, z, sx, sy, sz, mat = stone, opt) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
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
    const under = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, 9, 6), stone);
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
    g.fillText(txt, 64, 68);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: t, toneMapped: false, depthWrite: false }),
    );
    s.scale.setScalar(size);
    return s;
  };

  const cardMesh = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 360;
    const g = c.getContext('2d');
    g.fillStyle = '#fff8f0';
    g.fillRect(0, 0, 256, 360);
    g.fillStyle = '#d8324f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '160px Georgia';
    g.fillText('♥', 128, 190);
    g.font = 'bold 44px Georgia';
    g.fillText('10', 36, 40);
    g.save();
    g.translate(220, 320);
    g.rotate(Math.PI);
    g.fillText('10', 0, 0);
    g.restore();
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false }),
    );
    m.material.color.setScalar(1.4);
    return m;
  })();

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

  const build = (myRole, seed) => {
    if (built) return;
    built = true;
    role = myRole;
    group.visible = true;

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

    const tileGeo = new THREE.BoxGeometry(1.8, 0.3, 2.6);
    const tMat = {
      seen: new THREE.MeshStandardMaterial({
        color: '#3a2440',
        roughness: 0.6,
        emissive: '#ff4f86',
        emissiveIntensity: 0.55,
      }),
      plain: new THREE.MeshStandardMaterial({ color: '#2e2236', roughness: 0.7 }),
      real: new THREE.MeshStandardMaterial({
        color: '#203050',
        roughness: 0.6,
        emissive: '#6cc8ff',
        emissiveIntensity: 0.7,
      }),
      ghost: new THREE.MeshBasicMaterial({
        color: '#6cc8ff',
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      }),
    };

    for (let i = 0; i < ROWS; i++) {
      const z = rowZ(i);
      COLS.valet.forEach((x, c) => {
        const real = path.valet[i] === c;
        if (!real) return;
        if (role === 'valet')
          Phys.box(O.x + x, O.y - 0.15, O.z + z, 1.8, 0.3, 2.6, { tag: 'tile' });
        if (role === 'dame') {
          const m = new THREE.Mesh(tileGeo, tMat.seen);
          m.position.copy(P(x, -0.15, z));
          group.add(m);
        }
      });
      COLS.dame.forEach((x, c) => {
        const real = path.dame[i] === c;
        if (role === 'dame') {
          const m = new THREE.Mesh(tileGeo, tMat.plain);
          m.position.copy(P(x, -0.15, z));
          group.add(m);
          if (real) Phys.box(O.x + x, O.y - 0.15, O.z + z, 1.8, 0.3, 2.6, { tag: 'tile' });
        } else {
          const m = new THREE.Mesh(tileGeo, real ? tMat.real : tMat.ghost);
          m.position.copy(P(x, -0.15, z));
          group.add(m);
        }
      });
      const n = sprite(String(i + 1), 1.3, '#e8bd84');
      n.position.copy(P(0, 0.9, z));
      group.add(n);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), gold);
        post.position.copy(P(s * 8, -0.2, z));
        group.add(post);
      }
    }
    ['G', 'M', 'D'].forEach((l, c) => {
      for (const who of ['valet', 'dame']) {
        const s = sprite(l, 0.9, '#c495a6');
        s.position.copy(P(COLS[who][c], 0.7, 11.2));
        group.add(s);
      }
    });
    const tagV = sprite('♠', 1.6, '#6cc8ff');
    tagV.position.copy(P(4, 2.2, 10));
    const tagD = sprite('♥', 1.6, '#ff5f8a');
    tagD.position.copy(P(-4, 2.2, 10));
    group.add(tagV, tagD);

    solid(-5, 0.6, 49.5, 0.5, 1.2, 0.5, stone);
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
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.6, 8), stone);
      pole.position.set(p.x, O.y + 2.3, p.z);
      group.add(pole);
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
      solid(x, 2, CAB_Z1 + 0.15, 3.6, 4, 0.3);
      solid(x - 1.65, 2, (CAB_Z0 + CAB_Z1) / 2, 0.3, 4, CAB_Z1 - CAB_Z0 + 0.3);
      solid(x + 1.65, 2, (CAB_Z0 + CAB_Z1) / 2, 0.3, 4, CAB_Z1 - CAB_Z0 + 0.3);
      solid(x, 4.15, (CAB_Z0 + CAB_Z1) / 2, 3.6, 0.3, CAB_Z1 - CAB_Z0 + 0.3);
      const doorMat = new THREE.MeshStandardMaterial({
        color: '#1c1022',
        roughness: 0.4,
        metalness: 0.6,
        emissive: col,
        emissiveIntensity: 0.08,
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
        new THREE.MeshStandardMaterial({
          color: '#2a1420',
          roughness: 0.5,
          metalness: 0.5,
          emissive: '#ff2040',
          emissiveIntensity: 0.15,
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
      cab[who] = { x, door, doorB, ceil, ceilB, btn, doorY: 0, ceilY: CEIL_TOP };
    }

    screen = makeScreen(16, 8, 1024);
    screen.mesh.position.copy(P(0, 13, 104));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);

    card = cardMesh;
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
    rel(p) {
      return V3(p.x - O.x, p.y - O.y, p.z - O.z);
    },
    onA: (q) => q.z < 12.2 && q.y > -1,
    onB: (q) => q.z > 41.8 && q.z < 52.3 && q.y > -1 && Math.abs(q.x) < 9.3,
    onC: (q) => q.z > 81.8 && q.y > -1 && Math.abs(q.x) < 11.3,
    inCabin: (q, who) =>
      Math.abs(q.x - CAB[who]) < 1.45 && q.z > CAB_Z0 + 0.3 && q.z < CAB_Z1 - 0.1 && q.y > -0.5,
    nearWinch: (q) => Math.hypot(q.x + 5, q.z - 49.5) < 2.4,
    nearHarness: (q) => Math.hypot(q.x - 4, q.z - 51.5) < 2.4 && q.y > -0.5,
    nearButton: (q, who) => Math.abs(q.x - CAB[who]) < 1.45 && q.z > CAB_Z1 - 1.6,
    nearCard: (q) => Math.hypot(q.x, q.z - 90) < 3.2,
    harnessPos,
    update(dt, t, S) {
      if (!built) return;
      screen.update(dt, t);
      dust.rotation.y = Math.sin(t * 0.02) * 0.02;
      const a = S.a || {};
      const h = S.h || { t: 0 };
      const hp = harnessPos(h.t);
      harness.position.copy(hp);
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
        k.doorY = damp(k.doorY, closed ? 0 : 3.9, 6, dt);
        k.door.position.copy(P(k.x, 2 + k.doorY, CAB_Z0));
        k.doorB.on = closed;
        let cy = CEIL_TOP;
        if (c.phase === 'run') cy = lerp(CEIL_TOP, CEIL_LOW, clamp(c.t / 20, 0, 1));
        if (c.phase === 'fail') cy = c.who === who ? CEIL_TOP : c.y || CEIL_TOP;
        k.ceilY = damp(k.ceilY, cy, 5, dt);
        k.ceil.position.copy(P(k.x, k.ceilY + 0.15, (CAB_Z0 + CAB_Z1) / 2));
        const bx = O.x + k.x;
        const bz0 = O.z + CAB_Z0;
        const bz1 = O.z + CAB_Z1;
        k.ceilB.min = [bx - 1.5, O.y + k.ceilY, bz0];
        k.ceilB.max = [bx + 1.5, O.y + k.ceilY + 0.3, bz1];
        k.btn.scale.z = c.phase === 'run' ? 1 + Math.sin(t * 8) * 0.15 : 1;
      }
      card.visible = c.phase === 'win';
      card.rotation.y = t * 1.4;
      card.position.y = O.y + 1.6 + Math.sin(t * 2) * 0.15;
    },
    ceilingFor(who) {
      return cab[who] ? cab[who].ceilY : CEIL_TOP;
    },
    CEIL_TOP,
    CEIL_LOW,
  };
})();
