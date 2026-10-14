// ♦ 5 · Les Poids: the Veilleurs' observatory of weights. Two brass scales that only balance
// when you share what you see, a counterweight lift over a shaft, and the great balance where
// one orb out of nine is heavier, found in three weighings while the gear ceiling comes down.
const D3 = (() => {
  const O = V3(2100, 0, 4200);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  const glow = LvKit.glow;

  // static surfaces: world-space PBR. Moving parts use UV-mapped textures so nothing slides.
  // rough enough that the lamps overhead don't leave a burning highlight on the floor
  const marble = Tex.mat('marble', { color: '#857a72', scale: 6, rough: 0.82, bump: 0.6 });
  const darkMarble = Tex.mat('marble', { color: '#2e2634', scale: 5, rough: 0.5 });
  const stone = Tex.mat('stone', { color: '#6f6672', scale: 2.2, rough: 0.8 });
  const plaster = Tex.mat('plaster', { color: '#5a4656', scale: 3.5, rough: 0.9, bump: 0.4 });
  const wood = Tex.mat('wood', { color: '#4a2f20', scale: 0.8, rough: 0.7, bump: 0.5 });
  // gold without an env map renders black: keep it rough and lift it with its own glow
  const iron = Tex.mat('metal', {
    color: '#55505e',
    scale: 1.4,
    metal: 0.2,
    rough: 0.65,
    emissive: '#120e18',
  });

  const uvTex = (w, h, draw) => LvKit.tex(w, h, draw);
  // brushed brass for moving parts (UV mapped)
  const brassTex = uvTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#c89a46');
    gr.addColorStop(0.5, '#e2b862');
    gr.addColorStop(1, '#a87a30');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,240,200' : '60,40,10'},${Math.random() * 0.08})`;
      g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 1.5);
    }
  });
  const ironTex = uvTex(512, 512, (g, w, h) => {
    LvKit.grain(g, w, h, '#4c4854', 0.12, 12000);
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(0, (i * h) / 4);
      g.lineTo(w, (i * h) / 4);
      g.stroke();
    }
  });
  // diamond tread plate for the lift decks
  const treadTex = uvTex(512, 512, (g, w, h) => {
    LvKit.grain(g, w, h, '#3a3442', 0.1, 8000);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const cx = (x + 0.5 + (y % 2) * 0.5) * (w / 16);
        const cy = (y + 0.5) * (h / 16);
        g.save();
        g.translate(cx, cy);
        g.rotate(y % 2 ? 0.6 : -0.6);
        g.fillStyle = 'rgba(255,255,255,.16)';
        g.fillRect(-9, -2.5, 18, 5);
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(-9, 2.5, 18, 1.5);
        g.restore();
      }
  });
  treadTex.repeat.set(2.5, 3.5);
  const mBrass = new THREE.MeshStandardMaterial({
    map: brassTex,
    color: '#ffffff',
    metalness: 0.3,
    roughness: 0.45,
    emissive: '#3a2408',
    emissiveIntensity: 0.55,
  });
  const mIron = new THREE.MeshStandardMaterial({
    map: ironTex,
    metalness: 0.2,
    roughness: 0.6,
    emissive: '#100c16',
  });
  const glass = new THREE.MeshStandardMaterial({
    color: '#cfe6ff',
    transparent: true,
    opacity: 0.2,
    roughness: 0.05,
    metalness: 0.1,
    depthWrite: false,
  });

  // static brass uses the same brushed UV texture (the triplanar metal streaks up close)
  const brass = mBrass;
  let built = false;
  let role = 'dame';
  let screen = null;
  const gears = [];
  const gates = {};
  const scales = {};
  const blocks = [];
  const homes = {};
  const shelves = [];
  const lift = { A: null, B: null, yB: 0, wheel: null, chains: [] };
  const levers = {};
  const orbs = [];
  const sockets = [];
  const socketXZ = [];
  const lamps3 = [];
  let great = null;
  let ceiling = null;
  let altar = null;
  let card = null;
  let heart = null;
  let dial3 = null;

  // ---------- helpers ----------
  const wall = (x, y, z, sx, sy, sz, mat = plaster) => K.solid(x, y, z, sx, sy, sz, mat);
  const gearGeo = (r, teeth, depth) => {
    const sh = new THREE.Shape();
    const n = teeth * 2;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = i % 2 ? r : r * 0.86;
      const a2 = a + Math.PI / n;
      if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      sh.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const p = new THREE.Path();
      p.absarc(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56, r * 0.16, 0, Math.PI * 2, true);
      sh.holes.push(p);
    }
    return new THREE.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.15,
      bevelSize: depth * 0.12,
      bevelSegments: 2,
      curveSegments: 6,
    });
  };
  const gear = (x, y, z, r, teeth, speed, rotY = 0, mat = mBrass, parent = group) => {
    const m = new THREE.Mesh(gearGeo(r, teeth, 0.25), mat);
    m.position.copy(P(x, y, z));
    m.rotation.y = rotY;
    parent.add(m);
    gears.push({ m, speed });
    return m;
  };
  const sign = (txt, sub, w, h, col = '#ffcf8a') => {
    const t = uvTex(w * 200, h * 200, (g, W, H) => {
      g.fillStyle = '#1a1018';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = col;
      g.lineWidth = Math.max(4, H * 0.05);
      g.strokeRect(H * 0.07, H * 0.07, W - H * 0.14, H - H * 0.14);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `italic ${H * 0.4}px "Bodoni Moda", Georgia, serif`;
      Icons.fillText(g, txt, W / 2, H * (sub ? 0.4 : 0.5));
      if (sub) {
        g.font = `${H * 0.15}px "IBM Plex Mono", monospace`;
        g.fillStyle = '#e8d9c8';
        Icons.fillText(g, sub, W / 2, H * 0.78);
      }
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    m.color.setScalar(0.8);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  };
  // engraved numbers: the Dame reads them, the Valet only sees a worn rune
  const numCache = {};
  const numMat = (n, hidden) => {
    const k = n + (hidden ? 'h' : '');
    if (numCache[k]) return numCache[k];
    const t = uvTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
      g.fillStyle = 'rgba(20,12,18,.85)';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = hidden ? '#6a5a62' : '#ffcf8a';
      g.stroke();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = hidden ? '#6a5a62' : '#ffe2b0';
      g.font = hidden ? 'bold 160px Georgia' : 'italic 170px "Bodoni Moda", Georgia, serif';
      g.fillText(hidden ? '?' : String(n), w / 2, h / 2 + 10);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    m.color.setScalar(0.8);
    numCache[k] = m;
    return m;
  };
  const decal = (n, size) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), numMat(n, false));
    m.userData.n = n;
    return m;
  };
  const refreshDecals = () => {
    group.traverse((o) => {
      if (o.userData && o.userData.n != null && o.userData.secret)
        o.material = numMat(o.userData.n, role !== 'dame');
    });
  };

  // a classic weight: lathe body, handle, engraved value
  const weightGeo = {
    heavy: new THREE.LatheGeometry(
      [
        [0, 0],
        [0.42, 0],
        [0.46, 0.06],
        [0.46, 0.5],
        [0.38, 0.62],
        [0.22, 0.66],
        [0.2, 0.74],
        [0, 0.74],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      28,
    ),
    light: new THREE.LatheGeometry(
      [
        [0, 0],
        [0.26, 0],
        [0.28, 0.04],
        [0.24, 0.3],
        [0.13, 0.38],
        [0.11, 0.46],
        [0, 0.46],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      24,
    ),
  };
  const handleGeo = new THREE.TorusGeometry(0.16, 0.045, 10, 24, Math.PI);
  const makeWeight = (kind, n, secret = true) => {
    const g = new THREE.Group();
    const heavy = kind === 'heavy';
    const body = new THREE.Mesh(weightGeo[kind], heavy ? mIron : mBrass);
    g.add(body);
    const h = new THREE.Mesh(handleGeo, mBrass);
    h.position.y = heavy ? 0.74 : 0.46;
    h.scale.setScalar(heavy ? 1 : 0.7);
    g.add(h);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(heavy ? 0.465 : 0.26, 0.02, 6, 32),
      glow(heavy ? '#ff9a3a' : '#ffcf8a', 1.2),
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = heavy ? 0.28 : 0.16;
    g.add(band);
    // the number on four sides, so it reads from anywhere
    for (let i = 0; i < 4; i++) {
      const d = decal(n, heavy ? 0.42 : 0.26);
      d.userData.secret = secret;
      const a = (i / 4) * Math.PI * 2;
      const r = (heavy ? 0.47 : 0.27) + 0.01;
      d.position.set(Math.sin(a) * r, heavy ? 0.3 : 0.18, Math.cos(a) * r);
      d.rotation.y = a;
      g.add(d);
    }
    group.add(g);
    return g;
  };

  // a scale pan hung under a beam: round brass dish + square collider that moves with it
  const makePan = (x, z, r, y0, tagSuffix) => {
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.28, 40), mBrass);
    g.add(dish);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 48), mBrass);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.14;
    g.add(rim);
    const inlay = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.78, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#2a1d24', roughness: 0.6, emissive: '#1a0c12' }),
    );
    inlay.position.y = 0.145;
    g.add(inlay);
    g.position.copy(P(x, y0 - 0.14, z));
    group.add(g);
    const s = r * 1.62;
    const b = K.collider(x, y0 - 0.15, z, s, 0.3, s, { dyn: true, tag: 'pan' + tagSuffix });
    return { g, b, x, z, r, y0, y: y0, s, rods: [] };
  };
  const setBox = (b, cx, cy, cz, sx, sy, sz) => {
    b.min[0] = O.x + cx - sx / 2;
    b.min[1] = O.y + cy - sy / 2;
    b.min[2] = O.z + cz - sz / 2;
    b.max[0] = O.x + cx + sx / 2;
    b.max[1] = O.y + cy + sy / 2;
    b.max[2] = O.z + cz + sz / 2;
  };
  const movePan = (pan, y) => {
    pan.y = y;
    pan.g.position.y = O.y + y - 0.14;
    setBox(pan.b, pan.x, y - 0.15, pan.z, pan.s, 0.3, pan.s);
  };

  // a hanging rod between two points (updated every frame)
  const rodGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0);
  const rod = (mat = mBrass) => {
    const m = new THREE.Mesh(rodGeo, mat);
    group.add(m);
    return m;
  };
  const _a = V3();
  const _b = V3();
  const _up = V3(0, 1, 0);
  const span = (m, a, b) => {
    _a.copy(b).sub(a);
    const len = _a.length();
    m.position.copy(a);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(_up, _a.normalize());
  };

  const leverMesh = (x, y, z, rotY, col) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.7), mIron);
    base.position.y = 0.3;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.9), mBrass);
    plate.position.y = 0.63;
    const pivot = new THREE.Group();
    pivot.position.y = 0.65;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 10), mBrass);
    arm.position.y = 0.65;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), glow(col, 1.3));
    knob.position.y = 1.3;
    pivot.add(arm, knob);
    pivot.rotation.x = -0.6;
    g.add(base, plate, pivot);
    g.position.copy(P(x, y, z));
    g.rotation.y = rotY;
    group.add(g);
    K.collider(x, y + 0.3, z, 1, 0.6, 0.8);
    return { g, pivot, knob, x, y, z, k: 0, col: new THREE.Color(col) };
  };

  // a dial with a needle: − = + marks (the needle shows which side is heavier)
  const dialTex = uvTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f2e6d0';
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 14;
    g.strokeStyle = '#7a5520';
    g.stroke();
    g.strokeStyle = '#2a1d24';
    g.lineWidth = 4;
    for (let i = -6; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * 1.1;
      const r0 = i === 0 ? w * 0.26 : w * 0.34;
      g.beginPath();
      g.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
      g.lineTo(w / 2 + Math.cos(a) * w * 0.42, h / 2 + Math.sin(a) * w * 0.42);
      g.stroke();
    }
    g.fillStyle = '#2a1d24';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'italic 64px Georgia';
    g.fillText('=', w / 2, h * 0.32);
    g.fillText('◂', w * 0.2, h * 0.36);
    g.fillText('▸', w * 0.8, h * 0.36);
    g.font = '30px "IBM Plex Mono", monospace';
    g.fillText('ÉQUILIBRE', w / 2, h * 0.66);
  });
  dialTex.wrapS = dialTex.wrapT = THREE.ClampToEdgeWrapping;
  const makeDial = (x, y, z, rotY, size = 2.2) => {
    const g = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(size / 2, 48),
      new THREE.MeshBasicMaterial({ map: dialTex, toneMapped: false }),
    );
    face.material.color.setScalar(0.75);
    const bez = new THREE.Mesh(new THREE.TorusGeometry(size / 2, 0.08, 10, 48), mBrass);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, size * 0.44, 0.04).translate(0, size * 0.2, 0),
      glow('#ff3b55', 1.1),
    );
    needle.position.z = 0.05;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16).rotateX(Math.PI / 2), mBrass);
    hub.position.z = 0.06;
    g.add(face, bez, needle, hub);
    g.position.copy(P(x, y, z));
    g.rotation.y = rotY;
    group.add(g);
    return { g, needle, a: 0 };
  };

  // a two-pan scale whose beam is along x
  const makeScale = (id, cx, cz, half, r, y0, beamY, postMat = darkMarble) => {
    K.solid(cx, beamY / 2, cz, 0.7, beamY, 0.7, postMat);
    K.deco(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 24), mBrass, cx, 0.25, cz);
    const pivot = new THREE.Group();
    pivot.position.copy(P(cx, beamY + 0.2, cz));
    group.add(pivot);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.6, 0.28, 0.32), mBrass);
    pivot.add(beam);
    [-1, 1].forEach((s) => {
      const end = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mBrass);
      end.position.x = s * (half + 0.3);
      pivot.add(end);
    });
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 4), mBrass);
    crown.position.y = 0.6;
    pivot.add(crown);
    // left / right as the players see them, facing +z: left is +x
    const pans = {
      L: makePan(cx + half, cz, r, y0, id + 'L'),
      R: makePan(cx - half, cz, r, y0, id + 'R'),
    };
    // three rods per pan from the beam tip
    Object.values(pans).forEach((p) => {
      for (let i = 0; i < 3; i++) p.rods.push(rod());
    });
    const sc = { id, cx, cz, half, r, y0, beamY, pivot, pans, tilt: 0 };
    scales[id] = sc;
    return sc;
  };
  const tipL = V3();
  const tipR = V3();
  const poseScale = (sc, d) => {
    // d > 0: right side heavier (right pan down)
    sc.tilt = d;
    const ang = Math.atan2(d, sc.half);
    sc.pivot.rotation.z = ang;
    movePan(sc.pans.L, sc.y0 + d);
    movePan(sc.pans.R, sc.y0 - d);
    tipL.copy(P(sc.cx + sc.half, sc.beamY + 0.2 + d, sc.cz));
    tipR.copy(P(sc.cx - sc.half, sc.beamY + 0.2 - d, sc.cz));
    [
      ['L', tipL],
      ['R', tipR],
    ].forEach(([k, tip]) => {
      const p = sc.pans[k];
      p.rods.forEach((m, i) => {
        const a = (i / 3) * Math.PI * 2;
        _b.set(p.x + Math.cos(a) * p.r * 0.92, p.y + 0.1, p.z + Math.sin(a) * p.r * 0.92).add(O);
        span(m, _b, tip);
      });
    });
  };

  const build = (who) => {
    role = who || role;
    group.visible = true;
    if (built) {
      refreshDecals();
      return;
    }
    built = true;

    // ---------- entrance hall · the observatory porch ----------
    wall(0, -0.5, 5, 18, 1, 18, marble);
    wall(-9, 5, 5, 0.6, 10, 18);
    wall(9, 5, 5, 0.6, 10, 18);
    wall(0, 5, -4, 18, 10, 0.6, plaster);
    wall(0, 10.2, 5, 18, 0.4, 18, darkMarble);
    screen = makeScreen(10, 4.5, 1024);
    screen.mesh.position.copy(P(0, 5, -3.65));
    group.add(screen.mesh);
    gear(-6.3, 6, -3.6, 1.7, 16, 0.25);
    gear(-4.1, 4.2, -3.6, 1.05, 10, -0.4);
    gear(6.3, 6, -3.6, 1.7, 16, -0.25);
    gear(4.1, 4.2, -3.6, 1.05, 10, 0.4);
    // a little scale on a plinth: the rule of the place
    K.solid(0, 0.5, 9, 2.2, 1, 1.2, darkMarble);
    const rule = sign('Un astronaute = 2', 'LES POIDS NE MENTENT PAS', 3.6, 1.1, '#ffcf8a');
    rule.position.copy(P(0, 2.2, 8.38));
    rule.rotation.y = Math.PI;
    group.add(rule);
    // wall between hall and room 1, open in the middle
    wall(-8.75, 6.2, 14, 12.5, 12.4, 0.6);
    wall(8.75, 6.2, 14, 12.5, 12.4, 0.6);
    wall(0, 9.2, 14, 5, 6.4, 0.6);
    [-2.5, 2.5].forEach((dx) => K.solid(dx, 3, 13.7, 0.3, 6, 0.3, brass));
    LvKit.light(group, P(0, 7, 4), '#ffd9a8', 1.4, 22);

    // ---------- room 1 · les plateaux ----------
    wall(0, -0.5, 30, 30, 1, 32, marble);
    wall(-15, 6, 30, 0.6, 12, 32);
    wall(15, 6, 30, 0.6, 12, 32);
    wall(0, 12.2, 30, 30, 0.4, 32, darkMarble);
    // wainscot and brass lines
    [-1, 1].forEach((sd) => {
      K.deco(new THREE.BoxGeometry(0.1, 1.4, 32), wood, sd * 14.66, 0.7, 30);
      K.deco(new THREE.BoxGeometry(0.14, 0.12, 32), brass, sd * 14.64, 1.42, 30);
      K.deco(new THREE.BoxGeometry(0.14, 0.18, 32), brass, sd * 14.64, 11.7, 30);
    });
    // floor inlay: a compass rose of weights
    const rose = K.deco(
      new THREE.RingGeometry(3.2, 3.5, 64).rotateX(-Math.PI / 2),
      glow('#ffcf8a', 0.45),
      0,
      0.02,
      30,
    );
    void rose;
    makeScale('A', 7, 30, 3.1, 1.8, 0.42, 5.4);
    makeScale('B', -7, 30, 3.1, 1.8, 0.42, 5.4);
    ['A', 'B'].forEach((id) => {
      const sc = scales[id];
      // dials face the players coming in from the hall (−z)
      sc.dial = makeDial(sc.cx, 8.6, 29.6, Math.PI);
      const plq = sign('♦ ' + id, 'BALANCE ' + id, 2.4, 0.9, '#ff9a3a');
      plq.position.copy(P(sc.cx, 7, 29.6));
      plq.rotation.y = Math.PI;
      group.add(plq);
      // the fixed counterweight on the left pan, sealed under a glass bell that rides with it
      sc.fixed = makeWeight('heavy', 0);
      sc.fixed.scale.setScalar(1.35);
      const pl = sc.pans.L;
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(pl.r * 0.98, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        glass,
      );
      bell.scale.y = 1.25;
      bell.position.y = 0.14;
      pl.g.add(bell);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mBrass);
      knob.position.y = 0.14 + pl.r * 1.22;
      pl.g.add(knob);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(pl.r * 0.98, 0.05, 8, 48), mBrass);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.16;
      pl.g.add(collar);
      K.collider(pl.x, 1.6, pl.z, pl.s, 3.2, pl.s);
      // lamp ring under the dial: lights when balanced
      sc.okRing = K.deco(new THREE.TorusGeometry(1.25, 0.06, 8, 48), glow('#3fe08a', 0.2), sc.cx, 8.6, 29.55);
    });
    // high shelves for the light weights (double jump, or the Dame's grapple pulls them down)
    [
      [-14.1, 2.9, 19],
      [14.1, 2.9, 21],
      [14.1, 2.9, 25],
    ].forEach(([x, y, z], i) => {
      K.solid(x + (x < 0 ? 0.3 : -0.3), y - 0.15, z, 1.8, 0.3, 2.4, wood);
      K.deco(new THREE.BoxGeometry(1.9, 0.08, 2.5), brass, x + (x < 0 ? 0.3 : -0.3), y + 0.02, z);
      [-1, 1].forEach((s) =>
        K.deco(new THREE.BoxGeometry(0.1, 0.9, 0.1), brass, x + (x < 0 ? -0.4 : 0.4), y - 0.6, z + s),
      );
      homes['L' + i] = P(x + (x < 0 ? 0.35 : -0.35), y, z);
      shelves.push({ x, y, z });
    });
    // floor rack for the heavy ones
    [
      [-12, 41],
      [-9.5, 42.5],
      [11, 41.5],
    ].forEach(([x, z], i) => {
      K.deco(new THREE.CylinderGeometry(0.8, 0.85, 0.1, 28), stone, x, 0.05, z);
      homes['H' + i] = P(x, 0.1, z);
    });
    // a riddle plate: what the Valet hears from the Dame
    const plate1 = sign('Équilibrez les deux balances', 'MÊME POIDS À GAUCHE ET À DROITE', 6, 1.2, '#ffcf8a');
    plate1.position.copy(P(0, 9.5, 14.35));
    group.add(plate1);
    // exit gate to room 2
    wall(-8.75, 6, 46, 12.5, 12, 0.6);
    wall(8.75, 6, 46, 12.5, 12, 0.6);
    wall(0, 9.5, 46, 5, 5, 0.6);
    // room 2 is taller than room 1: close the gap above
    wall(0, 15.5, 46, 15, 7, 0.6);
    const g1 = K.solid(0, 3.5, 46, 5, 7, 0.4, iron, { dyn: true });
    g1.y0 = O.y + 3.5;
    g1.off = 0;
    gates.g1 = g1;
    gear(-8, 8, 45.6, 2, 18, 0.18);
    gear(8, 8, 45.6, 2, 18, -0.18);
    LvKit.light(group, P(-7, 9, 26), '#ffd9a8', 1.3, 20);
    LvKit.light(group, P(7, 9, 26), '#ffd9a8', 1.3, 20);

    // ---------- room 2 · la poulie (counterweight lift over the shaft) ----------
    wall(0, -0.5, 51.5, 14, 1, 11, marble);
    wall(-7.3, 6, 62, 0.6, 26, 32);
    wall(7.3, 6, 62, 0.6, 26, 32);
    wall(0, 18.2, 62, 15, 0.4, 32, darkMarble);
    // the shaft floor far below, and a way back up
    wall(0, -7.5, 61, 14, 1, 8, stone);
    // the ledge at +6 (its block is the back wall of the shaft)
    wall(0, -0.5, 71.5, 14, 13, 13, stone);
    K.deco(new THREE.BoxGeometry(14, 0.12, 0.3), brass, 0, 6.02, 65.1);
    // central pillar with the pulley on top
    K.solid(0, 5.5, 61, 2, 25, 8, darkMarble);
    lift.wheel = new THREE.Group();
    lift.wheel.position.copy(P(0, 15.5, 61));
    group.add(lift.wheel);
    const wheelG = new THREE.Mesh(gearGeo(2.6, 24, 0.5), mBrass);
    wheelG.rotation.y = Math.PI / 2;
    wheelG.position.x = -0.25;
    lift.wheel.add(wheelG);
    K.deco(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 16).rotateZ(Math.PI / 2), mIron, 0, 15.5, 61);
    // the two platforms (5.4 x 7.6), carried by chains
    ['A', 'B'].forEach((id) => {
      const sx = id === 'A' ? 4.15 : -4.15;
      const g = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.4, 7.6), mIron);
      deck.position.y = -0.2;
      g.add(deck);
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(5.9, 0.04, 7.3),
        new THREE.MeshStandardMaterial({ map: treadTex, color: '#8a8094', roughness: 0.6, metalness: 0.15 }),
      );
      top.position.y = 0.02;
      g.add(top);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(6.22, 0.06, 7.62), glow(id === 'A' ? '#ff9a3a' : '#7ce0ff', 0.7));
      edge.position.y = -0.38;
      g.add(edge);
      // corner posts + a little sign
      [
        [-2.95, -3.65],
        [2.95, -3.65],
        [-2.95, 3.65],
        [2.95, 3.65],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), mBrass);
        post.position.set(px, 0.55, pz);
        g.add(post);
      });
      const lbl = sign(id === 'A' ? 'A' : 'B', id === 'A' ? 'CONTREPOIDS' : 'NACELLE', 1.6, 0.8, id === 'A' ? '#ff9a3a' : '#7ce0ff');
      // painted on the deck, by the edge you step on from
      lbl.position.set(0, 0.05, -2.9);
      lbl.rotation.set(-Math.PI / 2, 0, Math.PI);
      g.add(lbl);
      g.position.copy(P(sx, 0, 61));
      group.add(g);
      const b = K.collider(sx, -0.2, 61, 6.2, 0.4, 7.6, { dyn: true, tag: 'lift' + id });
      const chains = [rod(mIron), rod(mIron)];
      lift[id] = { g, b, x: sx, y: 0, chains };
    });
    // brake levers: at the bottom and at the top
    levers.bot = leverMesh(0, 0, 49, 0, '#ff9a3a');
    levers.top = leverMesh(0, 6, 68.5, Math.PI, '#ff9a3a');
    const brakeSign = sign('Frein', 'E · BLOQUER / LIBÉRER', 2.6, 0.9, '#ff9a3a');
    brakeSign.position.copy(P(0, 2.2, 56.9));
    brakeSign.rotation.y = Math.PI;
    group.add(brakeSign);
    // two iron counterweights to load on the lift
    homes.W0 = P(-4.5, 0, 50);
    homes.W1 = P(4.5, 0, 50);
    [homes.W0, homes.W1].forEach((p) => K.deco(new THREE.CylinderGeometry(0.8, 0.85, 0.1, 28), stone, p.x - O.x, 0.05, p.z - O.z));
    // a gauge on the pillar: where the nacelle is
    lift.gauge = makeDial(0, 4.5, 56.95, Math.PI, 1.6);
    // wall between room 2 ledge and room 3
    wall(-4.75, 12, 78, 4.5, 12, 0.6);
    wall(4.75, 12, 78, 4.5, 12, 0.6);
    wall(0, 16, 78, 5, 4, 0.6);
    const g2 = K.solid(0, 9.5, 78, 5, 7, 0.4, iron, { dyn: true });
    g2.y0 = O.y + 9.5;
    g2.off = 0;
    gates.g2 = g2;
    LvKit.light(group, P(0, 12, 52), '#ffd9a8', 1.2, 20);
    LvKit.light(group, P(0, 12, 70), '#ffd9a8', 1.2, 20);
    gear(-6.8, 13.5, 58, 1.6, 14, 0.3, Math.PI / 2);
    gear(6.8, 13.5, 64, 1.6, 14, -0.3, Math.PI / 2);

    // ---------- room 3 · la grande balance ----------
    const F = 6;
    wall(0, F - 0.5, 99, 32, 1, 42, marble);
    wall(-16, F + 11, 99, 0.6, 22, 42);
    wall(16, F + 11, 99, 0.6, 22, 42);
    wall(0, F + 11, 120, 32, 22, 0.6);
    wall(-10.25, F + 11, 78.2, 11.5, 22, 0.6);
    wall(10.25, F + 11, 78.2, 11.5, 22, 0.6);
    wall(0, F + 15, 78.2, 9, 14, 0.6);
    // the dome over everything, with the voyage heart-galaxy inside
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(22, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#140c1c', roughness: 0.9, side: THREE.BackSide, emissive: '#06030a' }),
    );
    dome.position.copy(P(0, F + 22, 99));
    group.add(dome);
    heart = Heart.galaxy(18000, 0.55, 33);
    heart.group.position.copy(P(0, F + 30, 99));
    heart.group.rotation.x = Math.PI / 2;
    heart.U.uForm.value = 1;
    group.add(heart.group);
    // the great scale (beam along x), pans 2.2 m at 1 m
    great = makeScale('G', 0, 100, 5.5, 2.2, F + 1, F + 6.2, darkMarble);
    great.pivot.scale.setScalar(1);
    dial3 = makeDial(0, F + 9.6, 99.55, Math.PI, 2.6);
    // nine pedestals on an arc in front of the scale, numbered I → IX from left to right as seen
    // from the entrance (the numbers on the orbs themselves only show for the Dame)
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
    const colGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.95, 20);
    const capGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24);
    const cupGeo = new THREE.TorusGeometry(0.28, 0.05, 8, 24).rotateX(Math.PI / 2);
    for (let i = 0; i < 9; i++) {
      const a = (-80 + i * 20) * (Math.PI / 180);
      const x = 7 * Math.sin(-a);
      const z = 95 - 7 * Math.cos(a);
      K.deco(colGeo, darkMarble, x, F + 0.475, z);
      K.deco(capGeo, mBrass, x, F + 0.99, z);
      K.deco(cupGeo, mBrass, x, F + 1.05, z);
      K.collider(x, F + 0.5, z, 0.8, 1, 0.8);
      sockets.push(P(x, F + 1.38, z));
      socketXZ.push([x, z]);
      const t = uvTex(256, 160, (g, w, h) => {
        g.fillStyle = '#1a1018';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#ffcf8a';
        g.lineWidth = 6;
        g.strokeRect(8, 8, w - 16, h - 16);
        g.fillStyle = '#ffe2b0';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        // no hairlines: the numerals must read from across the hall
        g.font = 'bold 96px Georgia, serif';
        g.fillText(ROMAN[i], w / 2, h / 2 + 6);
      });
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      const lm = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
      lm.color.setScalar(0.8);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.41), lm);
      // on the outer face of the column, turned towards the entrance side
      lbl.position.copy(P(x + Math.sin(-a) * 0.47, F + 0.6, z - Math.cos(a) * 0.47));
      lbl.rotation.y = Math.PI + a;
      group.add(lbl);
    }
    // nine orbs: identical brass spheres, the number only for the Dame
    const orbGeo = new THREE.SphereGeometry(0.32, 28, 20);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(orbGeo, mBrass);
      g.add(m);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.02, 6, 32), glow('#ffcf8a', 1));
      band.rotation.x = Math.PI / 2;
      g.add(band);
      for (let k = 0; k < 2; k++) {
        const d = decal(i + 1, 0.3);
        d.userData.secret = true;
        d.position.set(0, 0, (k ? -1 : 1) * 0.33);
        d.rotation.y = k ? Math.PI : 0;
        g.add(d);
      }
      g.position.copy(sockets[i]);
      group.add(g);
      orbs.push({ g, cur: g.position.clone(), band, f: 0 });
    }
    // three weighing lamps over the dial
    for (let i = 0; i < 3; i++) {
      const l = K.deco(
        new THREE.SphereGeometry(0.28, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#3a2c3a', toneMapped: false }),
        -1.2 + i * 1.2,
        F + 11.6,
        99.4,
      );
      lamps3.push(l);
    }
    levers.weigh = leverMesh(0, F, 94, 0, '#ffcf8a');
    const weighSign = sign('Peser', 'TROIS PESÉES · PAS UNE DE PLUS', 3, 1, '#ffcf8a');
    weighSign.position.copy(P(0, F + 2.6, 95.2));
    weighSign.rotation.y = Math.PI;
    group.add(weighSign);
    // the sign stands on two brass posts behind the lever
    [-1.3, 1.3].forEach((dx) => K.solid(dx, F + 1.05, 95.25, 0.12, 2.1, 0.12, mBrass));
    // the heart altar where the heavy orb is laid
    altar = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.25, 1.1, 32), darkMarble);
    ped.position.y = 0.55;
    altar.add(ped);
    const hs = new THREE.Shape();
    for (let i = 0; i <= 80; i++) {
      const [hx, hy] = Heart.curve((i / 80) * Math.PI * 2);
      if (i) hs.lineTo(hx * 0.05, (hy - 2.5) * 0.05);
      else hs.moveTo(hx * 0.05, (hy - 2.5) * 0.05);
    }
    const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.08, bevelEnabled: false }), glow('#ff5f8a', 0.85));
    // upright behind the cup, so it reads as a heart from the whole hall
    hm.position.set(0, 1.9, 0.7);
    const cup = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 24).rotateX(Math.PI / 2), mBrass);
    cup.position.y = 1.14;
    altar.add(cup);
    altar.add(hm);
    altar.heart = hm;
    altar.position.copy(P(0, F, 112));
    group.add(altar);
    K.collider(0, F + 0.55, 112, 2.2, 1.1, 2.2);
    const altarSign = sign('Le cœur', 'POSEZ ICI L’ORBE LA PLUS LOURDE', 3.4, 1, '#ff5f8a');
    altarSign.position.copy(P(0, F + 3, 115));
    altarSign.rotation.y = Math.PI;
    group.add(altarSign);
    // the gear ceiling that comes down while you think
    ceiling = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(13, 0.9, 10, 72);
    const cr = new THREE.Mesh(ringGeo, mIron);
    cr.rotation.x = Math.PI / 2;
    ceiling.add(cr);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const gm = new THREE.Mesh(gearGeo(2.4, 18, 0.5), i % 2 ? mBrass : mIron);
      gm.rotation.x = Math.PI / 2;
      gm.position.set(Math.cos(a) * 11.5, 0, Math.sin(a) * 11.5);
      gm.userData.spin = i % 2 ? 0.4 : -0.4;
      ceiling.add(gm);
      // teeth hanging below: spikes
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 6), mIron);
        sp.rotation.x = Math.PI;
        sp.position.set(Math.cos(a + k * 0.2) * (13 + (k - 1) * 0.6), -1, Math.sin(a + k * 0.2) * (13 + (k - 1) * 0.6));
        ceiling.add(sp);
      }
    }
    const warn = new THREE.Mesh(new THREE.TorusGeometry(13, 0.12, 6, 72), glow('#ff3b55', 0.9));
    warn.rotation.x = Math.PI / 2;
    warn.position.y = -1.1;
    ceiling.add(warn);
    ceiling.warn = warn;
    ceiling.position.copy(P(0, F + 19, 99));
    group.add(ceiling);
    // the card, once the great balance is solved
    card = LvKit.trialCard('d3', true);
    card.position.copy(P(0, F + 2.4, 112));
    group.add(card);
    LvKit.light(group, P(0, F + 12, 92), '#ffd9a8', 1.4, 30);
    LvKit.light(group, P(0, F + 12, 108), '#ffd9a8', 1.2, 30);

    refreshDecals();
  };

  // ---------- per-frame ----------
  const tmp = V3();
  const carrierPos = (who) => (who === Story.role ? Player.body.p : Remote.pos);
  const placeAt = (obj, target, dt, k = 14) => {
    obj.cur.lerp(target, 1 - Math.exp(-k * dt));
    obj.g.position.copy(obj.cur);
  };
  // where an item stands on a pan: a ring of spots
  const panSpot = (pan, i, h = 0) => {
    // rim spots start at the back (+z) and fan out to the sides, away from where you step on
    const a = Math.PI / 2 + (i ? [0, 0.9, -0.9, 1.8, -1.8, 2.7][(i - 1) % 6] : 0);
    const r = i === 0 ? 0 : pan.r * 0.66;
    return tmp.set(pan.x + Math.cos(a) * r, pan.y + 0.02 + h, pan.z + Math.sin(a) * r).add(O);
  };

  const update = (dt, t, x, anim) => {
    if (!built) return;
    screen.update(dt, t);
    gears.forEach((gg) => (gg.m.rotation.z += gg.speed * dt));
    const op = x.open || {};
    Object.entries(gates).forEach(([id, gt]) => {
      gt.off = damp(gt.off, op[id] ? 7.2 : 0, 2.2, dt);
      gt.m.position.y = gt.y0 + gt.off;
      gt.b.on = gt.off < 3;
    });

    // room 1: two scales
    ['A', 'B'].forEach((id) => {
      const sc = scales[id];
      const want = (anim.tilt1 && anim.tilt1[id]) || 0;
      const d = damp(sc.tilt, want, 3, dt);
      poseScale(sc, d);
      sc.dial.a = damp(sc.dial.a, clamp(want * 2.4, -1.1, 1.1), 4, dt);
      sc.dial.needle.rotation.z = sc.dial.a;
      const bal = anim.bal1 && anim.bal1[id];
      sc.okRing.material.color.set('#3fe08a').multiplyScalar(bal ? 0.9 + 0.2 * Math.sin(t * 6) : 0.12);
      sc.fixed.position.copy(panSpot(sc.pans.L, 0));
    });
    const lists = { AL: 0, AR: 0, BL: 0, BR: 0, pA: 0, pB: 0 };
    (x.blocks || []).forEach((bk, i) => {
      const obj = blocks[i];
      if (!obj) return;
      let target;
      if (bk.at.startsWith('carry:')) {
        const cp = carrierPos(bk.at.slice(6));
        target = tmp.copy(cp).add(V3(0, 2.35 + Math.sin(t * 3 + i) * 0.06, 0));
      } else if (bk.at.startsWith('pan:')) {
        const [, sid, side] = bk.at.split(':');
        const key = sid + side;
        const n = ++lists[key];
        // weights go round the rim: the middle of the pan is where an astronaut stands
        target = panSpot(scales[sid].pans[side], n);
      } else if (bk.at === 'pA' || bk.at === 'pB') {
        const L = lift[bk.at[1]];
        const n = lists[bk.at]++;
        target = tmp.set(L.x + (n - 0.5) * 1.6, L.y + 0.02, 61 + 1.6).add(O);
      } else target = tmp.copy(homes[bk.at] || homes.H0);
      // flying (yanked by the grapple): long, eased
      placeAt(obj, target, dt, bk.fly ? 6 : 14);
      obj.g.rotation.y += dt * (bk.at.startsWith('carry:') ? 1.5 : 0);
      obj.g.visible = true;
    });
    // the yank tether (visible to both)
    if (anim.yank) {
      yankLine.visible = true;
      const src = carrierPos('dame').clone().add(V3(0, 1.4, 0));
      span(yankLine, src, blocks[anim.yank.i].g.position);
    } else yankLine.visible = false;

    // room 2: lift
    const yB = anim.yB || 0;
    lift.yB = yB;
    ['A', 'B'].forEach((id) => {
      const L = lift[id];
      const y = id === 'B' ? yB : -yB;
      L.y = y;
      L.g.position.y = O.y + y;
      setBox(L.b, L.x, y - 0.2, 61, 6.2, 0.4, 7.6);
      L.chains.forEach((m, k) => {
        _b.set(L.x + (k ? 1.6 : -1.6), y + 1.1, 61).add(O);
        _a.set(id === 'A' ? 2.2 : -2.2, 15.5, 61).add(O);
        span(m, _b, _a);
      });
    });
    lift.wheel.rotation.x = yB * 0.4;
    lift.gauge.needle.rotation.z = -clamp(yB / 6, -1, 1) * 1.1;
    Object.entries(levers).forEach(([k, lv]) => {
      const on = k === 'weigh' ? anim.weighing : x.r2 && x.r2.brake;
      lv.k = damp(lv.k, on ? 1 : 0, 8, dt);
      lv.pivot.rotation.x = -0.6 + lv.k * 1.2;
      lv.knob.material.color.copy(lv.col).multiplyScalar(0.8 + lv.k * 0.6);
    });

    // room 3: the great balance
    const r3 = x.r3 || {};
    poseScale(great, damp(great.tilt, anim.tilt3 || 0, 2.2, dt));
    dial3.a = damp(dial3.a, clamp((anim.tilt3 || 0) * 1.6, -1.1, 1.1), 3, dt);
    dial3.needle.rotation.z = dial3.a;
    const counts = { L: 0, R: 0 };
    (r3.orbs || []).forEach((at, i) => {
      const ob = orbs[i];
      let target;
      if (typeof at === 'number') target = tmp.copy(sockets[at]).add(V3(0, Math.sin(t * 2 + i) * 0.03, 0));
      else if (at.startsWith('carry:')) {
        const cp = carrierPos(at.slice(6));
        target = tmp.copy(cp).add(V3(0, 2.3 + Math.sin(t * 3 + i) * 0.06, 0));
      } else if (at === 'L' || at === 'R') {
        // two rows along the front edge, where you stand to take them back
        const n = counts[at]++;
        const pan = great.pans[at];
        const col = [0, -1, 1, -2, 2][n % 5] * 0.95;
        target = tmp.set(pan.x + col, pan.y + 0.34, pan.z - (n < 5 ? 1.05 : 0.2)).add(O);
      } else target = tmp.copy(altar.position).add(V3(0, 1.55, 0));
      placeAt(ob, target, dt);
      // the orb your E would take glows and swells a little (on your screen only)
      ob.f = damp(ob.f, i === anim.focus ? 1 : 0, 12, dt);
      ob.g.scale.setScalar(1 + ob.f * 0.12);
      ob.band.material.color.set('#ffcf8a').multiplyScalar(1 + ob.f * 0.9);
    });
    lamps3.forEach((l, i) =>
      l.material.color.set(i < (r3.weighs || 0) ? '#ff9a3a' : '#3a2c3a').multiplyScalar(i < (r3.weighs || 0) ? 0.85 : 1),
    );
    const ceilY = anim.ceil != null ? anim.ceil : 19;
    ceiling.position.y = O.y + 6 + ceilY;
    ceiling.children.forEach((c) => c.userData.spin && (c.rotation.z += c.userData.spin * dt));
    ceiling.warn.material.color.set('#ff3b55').multiplyScalar(r3.state === 'run' ? 0.5 + 0.4 * Math.sin(t * (4 + (19 - ceilY))) : 0.2);
    altar.heart.material.color.set('#ff5f8a').multiplyScalar(0.6 + 0.25 * Math.sin(t * 2.4));
    const U = heart.U;
    U.uTime.value = t;
    U.uPx.value = R.renderer.getPixelRatio() * 0.5;
    U.uForm.value = 1;
    U.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.4)), 10) * (x.stage >= 4 ? 1 : 0.3);
    heart.core.material.opacity = x.stage >= 4 ? 0.14 : 0.05;
    card.visible = x.stage >= 4;
    if (card.visible) {
      card.rotation.y = t * 1.2;
      card.position.y = O.y + 6 + 3.7 + Math.sin(t * 2) * 0.12;
    }
  };

  let yankLine = null;
  // the room-1 weights are created once the level knows their values
  const setWeights = (list) => {
    if (blocks.length) return;
    list.forEach((bk) => {
      const g = makeWeight(bk.kind, bk.v);
      const home = homes[bk.at] || homes.H0;
      g.position.copy(home);
      blocks.push({ g, cur: home.clone() });
    });
    yankLine = rod(glow('#ff5f8a', 1.4));
    yankLine.scale.x = yankLine.scale.z = 0.6;
    refreshDecals();
  };
  const setFixed = (fA, fB) => {
    ['A', 'B'].forEach((id) => {
      const g = scales[id].fixed;
      g.children.forEach((c) => {
        if (c.userData && c.userData.n != null) {
          c.userData.n = id === 'A' ? fA : fB;
          c.userData.secret = true;
        }
      });
    });
    refreshDecals();
  };

  return {
    O,
    P,
    build,
    setWeights,
    setFixed,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    scales,
    lift,
    levers,
    homes,
    blocks,
    shelves,
    update,
    hide() {
      group.visible = false;
    },
    rel: K.rel,
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) return P(s * 2.5, 0, 3);
      if (stage === 2) return P(s * 2.5, 0, 48);
      return P(s * 2.5, 6, 83);
    },
    // which pan (scale + side) a point is over, room 1
    panAt(q, pad = 0.6) {
      for (const id of ['A', 'B'])
        for (const side of ['L', 'R']) {
          const p = scales[id].pans[side];
          if (Math.hypot(q.x - p.x, q.z - p.z) < p.r + pad && q.y > p.y - 1 && q.y < p.y + 1.6)
            return { id, side };
        }
      return null;
    },
    onPan(q, id, side) {
      const p = scales[id].pans[side];
      return Math.hypot(q.x - p.x, q.z - p.z) < p.r * 0.95 && Math.abs(q.y - p.y) < 0.35;
    },
    nearHome(q, key, d = 1.9) {
      const h = homes[key];
      return h && Math.hypot(q.x - (h.x - O.x), q.z - (h.z - O.z)) < d && Math.abs(q.y - (h.y - O.y)) < 1.2;
    },
    onLift(q, id) {
      const L = lift[id];
      return Math.abs(q.x - L.x) < 3.15 && Math.abs(q.z - 61) < 3.85 && Math.abs(q.y - L.y) < 0.6;
    },
    nearLift(q, id) {
      const L = lift[id];
      return Math.abs(q.x - L.x) < 3.4 && Math.abs(q.z - 61) < 5.4 && Math.abs(q.y - L.y) < 1.6;
    },
    nearLever(q, k) {
      const lv = levers[k];
      return Math.hypot(q.x - lv.x, q.z - lv.z) < 2.2 && Math.abs(q.y - lv.y) < 1;
    },
    socketAt(q) {
      if (Math.abs(q.y - 6) > 1.2) return -1;
      let best = -1;
      let bd = 1.55;
      socketXZ.forEach(([x, z], i) => {
        const d = Math.hypot(q.x - x, q.z - z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    socketXZ,
    // the orb closest to the player, among those that can be picked up
    nearOrb(q, ok, maxD = 2.4) {
      let best = -1;
      let bd = maxD;
      orbs.forEach((ob, i) => {
        if (!ok(i)) return;
        const p = ob.g.position;
        const d = Math.hypot(q.x - (p.x - O.x), q.z - (p.z - O.z));
        if (d < bd && Math.abs(p.y - O.y - q.y) < 2.4) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    greatPanAt(q) {
      for (const side of ['L', 'R']) {
        const p = great.pans[side];
        if (Math.hypot(q.x - p.x, q.z - p.z) < p.r + 1.1 && Math.abs(q.y - 6) < 1.6) return side;
      }
      return null;
    },
    onGreatPan(q) {
      return ['L', 'R'].some((side) => {
        const p = great.pans[side];
        return Math.hypot(q.x - p.x, q.z - p.z) < p.r && q.y > 6.5;
      });
    },
    nearAltar: (q) => Math.hypot(q.x, q.z - 112) < 2.9 && Math.abs(q.y - 6) < 1.4,
    nearCard: (q) => Math.hypot(q.x, q.z - 112) < 3.7 && Math.abs(q.y - 6) < 2,
    inRoom1: (q) => q.z > 14 && q.z < 46 && q.y < 4,
    // the light weight the Dame is aiming at, for the grapple pull
    aimedLight(lightIdx, cam, maxD = 18) {
      let best = -1;
      let bd = 0.12;
      const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion);
      lightIdx.forEach((i) => {
        const p = blocks[i].g.position;
        const d = p.clone().sub(cam.position);
        const dist = d.length();
        if (dist > maxD) return;
        d.normalize();
        const ang = Math.acos(clamp(d.dot(fwd), -1, 1));
        if (ang < bd) {
          bd = ang;
          best = i;
        }
      });
      return best;
    },
    blockPos: (i) => blocks[i].g.position,
    orbPos: (i) => K.rel(orbs[i].g.position),
  };
})();
