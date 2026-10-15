// Cinematic « Pas encore » (end of world 1, after the reward of Les Toits qui tombent, before the
// first épreuve of world 2). On the last roof the two of you hold hands under the heart (seven
// stars lit); the saucer of the Veilleurs comes down, a little too decorated; inside, its Captain
// (small, very straight, monocle, a collector) admires you; his assistant brings a message; the
// beam lifts you, hands held, to another planet: a sea of pink clouds, a floating island, and
// further down, a whole heart shining. Then world 2's title card (in game, with its Visa).
// Built on js/cine/cut.js (Cut.define, the 'cut' phase, Cut.AFTER).
(() => {
  const DUR = 50;
  const SUBS = [
    [16.2, 18.2, 'Ah. Les voici.', 'Le Capitaine'],
    [18.9, 22.3, 'Remarquable. Ils se tiennent encore la main.', 'Le Capitaine'],
    [22.6, 24.8, 'Nous admirons.', 'Le Capitaine'],
    [25.4, 28.6, 'Capitaine… il a dit : pas encore.', 'L’Assistant'],
    [29.4, 32.9, 'Pas encore. Évidemment. Rayon, je vous prie.', 'Le Capitaine'],
    [38.9, 42.9, 'Délicatement. Ce sont des pièces de collection.', 'Le Capitaine'],
  ];
  // the shots: [start, name]
  const SHOTS = [
    [0, 'roof'],
    [6.5, 'hands'],
    [10.5, 'arrive'],
    [15.5, 'room'],
    [18.4, 'lens'],
    [22.4, 'admire'],
    [25, 'message'],
    [29, 'button'],
    [33, 'beamHands'],
    [35.2, 'rise'],
    [38, 'sea'],
    [43.4, 'reveal'],
  ];
  const shotOf = (t) => {
    let s = SHOTS[0];
    for (const sh of SHOTS) if (t >= sh[0]) s = sh;
    return s;
  };

  // ---------- small material helpers ----------
  const std = (color, rough = 0.6, metal = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  const glow = (color, k = 1.6, extra = {}) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, ...extra });
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const canvasTex = (w, h, paint) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  };
  // a soft cloud puff for sprites
  let puffTex = null;
  const puff = () =>
    puffTex ||
    (puffTex = canvasTex(256, 256, (g) => {
      const r = rng(17);
      for (let i = 0; i < 26; i++) {
        const x = 128 + (r() - 0.5) * 120;
        const y = 132 + (r() - 0.5) * 70;
        const rad = 30 + r() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(255,255,255,0.32)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
      }
    }));
  const heartShape = (k) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 48; i++) {
      const [x, y] = Heart.curve((i / 48) * TAU);
      if (i) sh.lineTo(x * k, y * k);
      else sh.moveTo(x * k, y * k);
    }
    return sh;
  };

  // ---------- the Veilleurs ----------
  // the Captain: small and very straight, a big egg head, a monocle on its chain, a tall stiff
  // collar, a bicorne with a pink plume, a long navy coat with gold epaulettes, white gloves
  const veilleur = (o) => {
    const g = new THREE.Group();
    const skin = std(o.skin, 0.45, 0.05);
    const coat = std(o.coat, 0.62, 0.05);
    const gold = std('#d2a35c', 0.3, 0.9);
    const white = std('#efe9e0', 0.55, 0);
    const eyeM = std('#07060c', 0.08, 0.2);
    const H = o.h;
    // legs and boots
    [-1, 1].forEach((s) => {
      add(g, new THREE.CylinderGeometry(0.045, 0.05, H * 0.2, 10), std('#1a1626', 0.5, 0.1), s * 0.07, H * 0.1, 0);
      add(g, new THREE.SphereGeometry(0.07, 12, 8).scale(1, 0.6, 1.5), std('#0c0a10', 0.18, 0.4), s * 0.07, 0.03, 0.03);
    });
    const body = new THREE.Group();
    body.position.y = H * 0.2;
    g.add(body);
    // the coat: a lathe that flares at the hem
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const coatPts = o.coatPts.map(([x, y]) => V2(x, y * H));
    add(body, new THREE.LatheGeometry(coatPts, 28), coat);
    // gold buttons in two rows, the epaulettes with their fringe
    for (let i = 0; i < 4; i++)
      [-1, 1].forEach((s) => add(body, new THREE.SphereGeometry(0.014, 8, 6), gold, s * 0.05, H * (0.2 + i * 0.07), o.chest + 0.005));
    const shoulderY = H * o.shoulder;
    const shoulders = [];
    [-1, 1].forEach((s) => {
      const sh = new THREE.Group();
      sh.position.set(s * o.shX, shoulderY, 0);
      body.add(sh);
      shoulders.push(sh);
      if (o.epaulettes) {
        add(sh, new THREE.CylinderGeometry(0.06, 0.06, 0.018, 16), gold, s * 0.012, 0.03, 0);
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * TAU;
          add(sh, new THREE.CylinderGeometry(0.004, 0.004, 0.045, 4), gold, s * 0.012 + Math.cos(a) * 0.058, 0.005, Math.sin(a) * 0.058);
        }
      }
      // upper arm, forearm (a group at the elbow), glove
      const up = add(sh, new THREE.CylinderGeometry(0.032, 0.03, o.arm, 8).translate(0, -o.arm / 2, 0), coat);
      const el = new THREE.Group();
      el.position.y = -o.arm;
      up.add(el);
      add(el, new THREE.CylinderGeometry(0.03, 0.026, o.arm * 0.95, 8).translate(0, -o.arm * 0.475, 0), coat);
      add(el, new THREE.CylinderGeometry(0.034, 0.03, 0.03, 10), white, 0, -o.arm * 0.92, 0);
      const hand = new THREE.Group();
      hand.position.y = -o.arm;
      el.add(hand);
      add(hand, new THREE.SphereGeometry(0.036, 12, 8).scale(1, 1.2, 0.8), white, 0, -0.025, 0);
      sh.userData = { up, el, hand };
    });
    // the white jabot and the high stiff collar (the silhouette)
    add(body, new THREE.ConeGeometry(0.05, 0.11, 10).rotateX(Math.PI), white, 0, shoulderY - 0.03, o.chest);
    const neck = new THREE.Group();
    neck.position.y = shoulderY + 0.03;
    body.add(neck);
    if (o.collar) {
      const col = add(
        neck,
        new THREE.LatheGeometry([V2(0.075, 0), V2(0.09, 0.05), V2(0.15, 0.17), V2(0.17, 0.2)], 24, Math.PI * 0.75, Math.PI * 1.5),
        new THREE.MeshStandardMaterial({ color: '#f1ebe0', roughness: 0.6, side: THREE.DoubleSide }),
      );
      col.position.y = 0.0;
    }
    add(neck, new THREE.CylinderGeometry(0.035, 0.04, o.neck, 10).translate(0, o.neck / 2, 0), skin);
    const head = new THREE.Group();
    head.position.y = o.neck + o.head * 0.9;
    neck.add(head);
    add(head, new THREE.SphereGeometry(o.head, 32, 24).scale(1, 1.22, 1.02), skin);
    // big glossy almond eyes, a small mouth
    const eyes = [];
    [-1, 1].forEach((s) => {
      const e = add(head, new THREE.SphereGeometry(o.head * 0.3, 18, 12).scale(1.25, 0.75, 0.5), eyeM, s * o.head * 0.38, o.head * 0.06, o.head * 0.86);
      e.rotation.z = s * -0.35;
      add(e, new THREE.SphereGeometry(o.head * 0.06, 8, 6), glow('#ffffff', 1.2), s * -0.05 * o.head, o.head * 0.08, o.head * 0.12);
      eyes.push(e);
    });
    const mouth = add(head, new THREE.TorusGeometry(o.head * 0.12, o.head * 0.018, 6, 16, Math.PI), std('#4a3550', 0.6), 0, -o.head * 0.42, o.head * 0.93);
    mouth.rotation.z = Math.PI;
    let monocle = null;
    if (o.monocle) {
      monocle = new THREE.Group();
      monocle.position.set(-o.head * 0.38, o.head * 0.06, o.head * 1.02);
      head.add(monocle);
      add(monocle, new THREE.TorusGeometry(o.head * 0.33, o.head * 0.035, 8, 28), gold);
      const glass = add(
        monocle,
        new THREE.CircleGeometry(o.head * 0.32, 24),
        new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.28 }),
      );
      glass.position.z = 0.002;
      // a glint that slides across the glass
      monocle.userData.glint = add(monocle, new THREE.PlaneGeometry(o.head * 0.08, o.head * 0.5), glow('#ffffff', 1.4, { transparent: true, opacity: 0.6 }), 0, 0, 0.004);
      monocle.userData.glint.rotation.z = 0.7;
      // the chain down to the coat
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        pts.push(V3(-o.head * 0.3 + k * 0.05, -o.head * 0.3 - k * 0.32 - Math.sin(k * Math.PI) * 0.04, -k * 0.06));
      }
      add(monocle, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.003, 4), gold);
    }
    if (o.bicorne) {
      const hat = new THREE.Group();
      hat.position.y = o.head * 1.08;
      hat.rotation.z = 0.12;
      head.add(hat);
      const half = new THREE.SphereGeometry(o.head * 1.2, 24, 10, 0, Math.PI, 0, Math.PI / 2).scale(1, 0.62, 0.32);
      const hm = std('#141a3a', 0.55, 0.05);
      add(hat, half, hm, 0, 0, 0.02).rotation.y = 0;
      add(hat, half, hm, 0, 0, -0.02).rotation.y = Math.PI;
      add(hat, new THREE.SphereGeometry(o.head * 0.14, 10, 8), gold, 0, o.head * 0.42, 0.06);
      // the plume
      const pl = add(hat, new THREE.SphereGeometry(o.head * 0.22, 12, 10).scale(0.6, 2.2, 0.6), std('#ff7aa6', 0.9), o.head * 0.35, o.head * 0.75, -0.02);
      pl.rotation.z = -0.5;
    }
    if (o.cap) {
      add(head, new THREE.CylinderGeometry(o.head * 0.7, o.head * 0.78, o.head * 0.4, 20), std(o.coat, 0.6), 0, o.head * 1.15, 0);
      add(head, new THREE.CylinderGeometry(o.head * 0.84, o.head * 0.84, o.head * 0.04, 20), std('#2a2a24', 0.4), 0, o.head * 0.96, o.head * 0.1);
    }
    g.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });
    return { g, body, neck, head, eyes, monocle, arms: shoulders, mouth };
  };
  const captain = () =>
    veilleur({
      h: 1.0,
      skin: '#9a8ccf',
      coat: '#1c2a6e',
      coatPts: [
        [0.0, 0],
        [0.2, 0],
        [0.17, 0.12],
        [0.14, 0.3],
        [0.13, 0.42],
        [0.15, 0.5],
        [0.09, 0.56],
        [0.0, 0.57],
      ],
      chest: 0.135,
      shoulder: 0.5,
      shX: 0.15,
      arm: 0.17,
      neck: 0.06,
      head: 0.15,
      epaulettes: true,
      collar: true,
      monocle: true,
      bicorne: true,
    });
  // the assistant: taller, thin, stooped, a round cap, no ornaments, always worried
  const assistant = () =>
    veilleur({
      h: 1.32,
      skin: '#8fb59f',
      coat: '#3f5a4c',
      coatPts: [
        [0.0, 0],
        [0.15, 0],
        [0.13, 0.15],
        [0.11, 0.35],
        [0.11, 0.42],
        [0.08, 0.47],
        [0.0, 0.48],
      ],
      chest: 0.11,
      shoulder: 0.43,
      shX: 0.12,
      arm: 0.21,
      neck: 0.16,
      head: 0.13,
      cap: true,
    });
  const armPose = (A, i, pitch, roll, elbow) => {
    const s = A.arms[i];
    s.rotation.set(-pitch, 0, (i ? 1 : -1) * roll);
    s.userData.el.rotation.set(-elbow, 0, 0);
  };

  // ---------- the sets ----------
  const buildRoof = (root) => {
    const g = new THREE.Group();
    root.add(g);
    const concrete = std('#2a2630', 0.95, 0.02);
    add(g, new THREE.BoxGeometry(16, 1, 16), concrete, 0, -0.5, 1.5);
    // the parapet in front (the edge they look over) and on the sides
    add(g, new THREE.BoxGeometry(16, 0.55, 0.3), std('#4a4350', 0.85), 0, 0.27, -6.3);
    add(g, new THREE.BoxGeometry(0.3, 0.55, 16), std('#4a4350', 0.85), -7.9, 0.27, 1.5);
    add(g, new THREE.BoxGeometry(0.3, 0.55, 16), std('#4a4350', 0.85), 7.9, 0.27, 1.5);
    // a water tower, vents, an antenna with its red light
    const tw = new THREE.Group();
    tw.position.set(-5.2, 0, 4.5);
    g.add(tw);
    add(tw, new THREE.CylinderGeometry(1.2, 1.2, 2.2, 20), std('#5a4136', 0.8), 0, 3.6, 0);
    add(tw, new THREE.ConeGeometry(1.3, 0.8, 20), std('#43312a', 0.8), 0, 5.1, 0);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => add(tw, new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), std('#2a2428', 0.6, 0.6), sx * 0.8, 1.25, sz * 0.8)));
    add(g, new THREE.BoxGeometry(1.4, 0.9, 1), std('#4d4852', 0.7, 0.3), 4.6, 0.45, 5.5);
    add(g, new THREE.BoxGeometry(0.9, 0.7, 0.9), std('#4d4852', 0.7, 0.3), 5.8, 0.35, 3.3);
    add(g, new THREE.CylinderGeometry(0.04, 0.06, 5, 6), std('#2a2428', 0.5, 0.7), 6.3, 2.5, -4.6);
    const red = add(g, new THREE.SphereGeometry(0.09, 8, 6), glow('#ff2a3a', 2), 6.3, 5.05, -4.6);
    // the city below: blocks with lit windows, streets of light
    const win = canvasTex(64, 128, (x, w, h) => {
      x.fillStyle = '#0b0a12';
      x.fillRect(0, 0, w, h);
      const r = rng(4);
      for (let yy = 4; yy < h; yy += 9)
        for (let xx = 4; xx < w; xx += 8)
          if (r() < 0.36) {
            x.fillStyle = r() < 0.75 ? '#ffcf8a' : '#9fd8ff';
            x.globalAlpha = 0.35 + r() * 0.65;
            x.fillRect(xx, yy, 4, 5);
          }
    });
    win.wrapS = win.wrapT = THREE.RepeatWrapping;
    const r = rng(11);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const N = 340;
    const mat = new THREE.MeshStandardMaterial({ color: '#1a1622', roughness: 0.9, emissive: '#ffffff', emissiveMap: win, emissiveIntensity: 0.55 });
    const inst = new THREE.InstancedMesh(geo, mat, N);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < 900 && n < N; i++) {
      const x = (r() - 0.5) * 420;
      const z = -20 - r() * 380;
      if (Math.abs(x) < 14 && z > -30) continue;
      const w = 10 + r() * 16;
      const d = 10 + r() * 16;
      const h = 30 + r() * 60 + (z < -200 ? 20 : 0);
      m4.compose(V3(x, -95 + h / 2, z), new THREE.Quaternion(), V3(w, h, d));
      inst.setMatrixAt(n++, m4);
    }
    inst.count = n;
    g.add(inst);
    // the streets far below
    for (let k = -6; k <= 6; k++) {
      add(g, new THREE.PlaneGeometry(1.2, 420).rotateX(-Math.PI / 2), glow('#ffb46a', 0.7, { transparent: true, opacity: 0.55 }), k * 32, -94.9, -210);
      add(g, new THREE.PlaneGeometry(420, 1.2).rotateX(-Math.PI / 2), glow('#ffb46a', 0.6, { transparent: true, opacity: 0.45 }), 0, -94.9, -40 - (k + 6) * 30);
    }
    // stars
    const sp = new Float32Array(2600 * 3);
    for (let i = 0; i < 2600; i++) {
      const v = V3(r() - 0.5, r() * 0.8 + 0.05, r() - 0.5).normalize().multiplyScalar(1400);
      sp.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#f6eaff', size: 1.4, sizeAttenuation: false, fog: false })));
    // the heart: its shape, seven cards' worth of stars lit
    const heart = Heart.galaxy(30000, 4, 9);
    heart.group.position.set(-10, 62, -250);
    heart.group.scale.setScalar(2.3);
    heart.U.uFill.value = 7 / 52 + 0.02;
    heart.U.uDim.value = 0.2;
    heart.core.material.opacity = 0.26;
    heart.points.material.fog = false;
    g.add(heart.group);
    // the clouds that part for the saucer
    const clouds = [];
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), color: '#9aa6c8', transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
      const side = i % 2 ? 1 : -1;
      const x = side * (4 + r() * 80);
      s.position.set(x, 88 + r() * 30, -95 - r() * 55);
      s.scale.set(50 + r() * 50, 26 + r() * 22, 1);
      s.userData = { x, side, k: 0.6 + r() * 0.8 };
      g.add(s);
      clouds.push(s);
    }
    return { g, heart, clouds, red };
  };

  const buildRoom = (root) => {
    const g = new THREE.Group();
    g.position.set(0, 0, 5000);
    root.add(g);
    const gold = std('#b8873f', 0.45, 0.55);
    // floor, rug, walls, dome
    add(g, new THREE.CircleGeometry(7.5, 48).rotateX(-Math.PI / 2), std('#3a2216', 0.38, 0.05));
    add(g, new THREE.RingGeometry(2.1, 3.3, 48).rotateX(-Math.PI / 2), std('#6d1430', 0.95), 0, 0.005, 0);
    add(g, new THREE.RingGeometry(3.3, 3.42, 48).rotateX(-Math.PI / 2), gold, 0, 0.006, 0);
    add(g, new THREE.RingGeometry(1.98, 2.1, 48).rotateX(-Math.PI / 2), gold, 0, 0.006, 0);
    const wall = add(g, new THREE.CylinderGeometry(7.5, 7.5, 4.2, 48, 1, true), std('#2b1028', 0.85, 0.05, { side: THREE.BackSide }), 0, 2.1, 0);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const rib = add(g, new THREE.BoxGeometry(0.08, 4.2, 0.08), std('#6e5026', 0.7, 0.2), Math.sin(a) * 7.42, 2.1, Math.cos(a) * 7.42);
      rib.rotation.y = a;
    }
    add(g, new THREE.TorusGeometry(7.42, 0.05, 6, 64).rotateX(Math.PI / 2), gold, 0, 1.0, 0);
    add(g, new THREE.TorusGeometry(7.42, 0.05, 6, 64).rotateX(Math.PI / 2), gold, 0, 4.15, 0);
    add(g, new THREE.SphereGeometry(7.5, 48, 16, 0, TAU, 0, Math.PI / 2), std('#1d0a1c', 0.9, 0, { side: THREE.BackSide }), 0, 4.2, 0).scale.y = 0.45;
    // the chandelier
    const ch = new THREE.Group();
    ch.position.set(0, 5.4, 0);
    g.add(ch);
    add(ch, new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), gold, 0, 0.7, 0);
    add(ch, new THREE.TorusGeometry(0.7, 0.025, 6, 32).rotateX(Math.PI / 2), gold);
    add(ch, new THREE.TorusGeometry(0.4, 0.02, 6, 24).rotateX(Math.PI / 2), gold, 0, -0.25, 0);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      add(ch, new THREE.OctahedronGeometry(0.05, 0).scale(1, 1.8, 1), glow('#ffe7c4', 1.5), Math.cos(a) * 0.7, -0.12, Math.sin(a) * 0.7);
    }
    const lamp = new THREE.PointLight('#ffd9a8', 1.5, 18, 1.6);
    lamp.position.set(0, 4.6, 0);
    g.add(lamp);
    // sconces on the wall
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.26;
      add(g, new THREE.SphereGeometry(0.09, 10, 8), glow('#ffcf8a', 1.6), Math.sin(a) * 7.2, 2.6, Math.cos(a) * 7.2);
    }
    // the floor porthole: below it, far down, a roof and two small figures holding hands
    const view = canvasTex(512, 512, (x, w, h) => {
      const gr = x.createRadialGradient(256, 256, 30, 256, 256, 256);
      gr.addColorStop(0, '#1b2346');
      gr.addColorStop(1, '#070812');
      x.fillStyle = gr;
      x.fillRect(0, 0, w, h);
      const r = rng(8);
      for (let i = 0; i < 60; i++) {
        x.fillStyle = `rgba(${40 + r() * 30},${40 + r() * 30},${60 + r() * 40},1)`;
        x.fillRect(r() * w, r() * h, 20 + r() * 60, 20 + r() * 60);
        x.fillStyle = 'rgba(255,207,138,0.6)';
        for (let k = 0; k < 6; k++) x.fillRect(r() * w, r() * h, 2, 2);
      }
      x.fillStyle = '#4a4350';
      x.fillRect(196, 196, 120, 120);
      const pg = x.createRadialGradient(256, 256, 0, 256, 256, 70);
      pg.addColorStop(0, 'rgba(255,110,160,0.55)');
      pg.addColorStop(1, 'rgba(255,110,160,0)');
      x.fillStyle = pg;
      x.fillRect(150, 150, 212, 212);
      x.fillStyle = '#e9eef6';
      x.beginPath();
      x.arc(246, 252, 6, 0, TAU);
      x.arc(266, 252, 6, 0, TAU);
      x.fill();
      x.fillRect(250, 250, 12, 3);
    });
    const port = new THREE.Group();
    port.position.set(0.6, 0.01, -0.4);
    g.add(port);
    add(port, new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), glow('#ffffff', 0.85, { map: view }));
    add(port, new THREE.TorusGeometry(0.92, 0.07, 10, 48).rotateX(Math.PI / 2), gold, 0, 0.03, 0);
    const portLight = new THREE.PointLight('#8fb4ff', 1.2, 5, 2);
    portLight.position.set(0.6, 0.3, -0.4);
    g.add(portLight);
    // the display cases
    const cases = [];
    const glass = new THREE.MeshStandardMaterial({ color: '#d8ecff', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.13, depthWrite: false });
    const mkCase = (a, r, h = 0.9) => {
      const c = new THREE.Group();
      c.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      c.rotation.y = a + Math.PI;
      g.add(c);
      add(c, new THREE.CylinderGeometry(0.32, 0.38, h, 20), std('#4a2a1a', 0.5, 0.1), 0, h / 2, 0);
      add(c, new THREE.CylinderGeometry(0.36, 0.36, 0.04, 20), gold, 0, h, 0);
      const box = add(c, new THREE.BoxGeometry(0.62, 0.7, 0.62), glass, 0, h + 0.37, 0);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: '#e9c58a' }));
      box.add(e);
      add(c, new THREE.BoxGeometry(0.2, 0.06, 0.01), gold, 0, h - 0.18, 0.37);
      cases.push(c);
      return c;
    };
    // 1 · an aurora in a jar
    const auroraU = { uTime: { value: 0 } };
    const c1 = mkCase(-0.55, 5.6);
    add(c1, new THREE.CylinderGeometry(0.16, 0.16, 0.42, 24, 1, true), glass, 0, 1.15, 0);
    add(c1, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), std('#8a6a3a', 0.4, 0.7), 0, 1.38, 0);
    const aur = add(
      c1,
      new THREE.CylinderGeometry(0.13, 0.13, 0.36, 32, 1, true),
      new THREE.ShaderMaterial({
        uniforms: auroraU,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float x = vUv.x * 6.2832;
            float w = 0.5 + 0.22 * sin(x * 2.0 + uTime * 1.3) + 0.12 * sin(x * 5.0 - uTime * 2.1);
            float band = exp(-pow((vUv.y - w) * 5.0, 2.0));
            float cur = 0.6 + 0.4 * sin(x * 9.0 + uTime * 3.0);
            vec3 c = mix(vec3(0.2, 1.4, 0.7), vec3(1.3, 0.3, 0.9), vUv.y);
            gl_FragColor = vec4(c * band * cur, band * cur);
          }`,
      }),
      0,
      1.15,
      0,
    );
    // 2 · a shooting star, pinned on velvet
    const c2 = mkCase(0.15, 5.9);
    add(c2, new THREE.PlaneGeometry(0.5, 0.5), std('#141a3a', 0.95), 0, 1.27, -0.2);
    const star = add(c2, new THREE.OctahedronGeometry(0.045, 0), glow('#fff3c4', 2), 0.08, 1.33, -0.17);
    const trail = add(
      c2,
      new THREE.PlaneGeometry(0.34, 0.03),
      new THREE.MeshBasicMaterial({
        map: canvasTex(128, 8, (x) => {
          const gr = x.createLinearGradient(0, 0, 128, 0);
          gr.addColorStop(0, 'rgba(255,240,200,0)');
          gr.addColorStop(1, 'rgba(255,240,200,1)');
          x.fillStyle = gr;
          x.fillRect(0, 0, 128, 8);
        }),
        transparent: true,
        toneMapped: false,
      }),
      -0.09,
      1.25,
      -0.18,
    );
    trail.rotation.z = 0.45;
    add(c2, new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4).rotateX(Math.PI / 2), gold, 0.08, 1.33, -0.14);
    add(c2, new THREE.SphereGeometry(0.014, 8, 6), std('#ff5f8a', 0.4), 0.08, 1.33, -0.1);
    // 3 · a little ringed moon under a bell jar
    const c3 = mkCase(0.85, 5.7);
    const moon = add(c3, new THREE.SphereGeometry(0.1, 24, 16), std('#d9d2c4', 0.9), 0, 1.18, 0);
    add(moon, new THREE.TorusGeometry(0.17, 0.008, 6, 40).rotateX(1.2), glow('#ffcf8a', 0.9));
    // 4 · a small cloud in a box
    const c4 = mkCase(-1.3, 5.5);
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false }));
    cl.position.set(0, 1.22, 0);
    cl.scale.setScalar(0.42);
    c4.add(cl);
    // the console with the heart button
    const con = new THREE.Group();
    con.position.set(-1.5, 0, -1.6);
    con.rotation.y = 0.65;
    g.add(con);
    // low enough for a small Captain
    add(con, new THREE.CylinderGeometry(0.14, 0.24, 0.62, 16), std('#4a2a1a', 0.5, 0.1), 0, 0.31, 0);
    const top = add(con, new THREE.BoxGeometry(0.5, 0.05, 0.34), gold, 0, 0.64, 0);
    top.rotation.x = -0.35;
    const btnMat = glow('#ff5f8a', 0.9);
    const btn = add(con, new THREE.ExtrudeGeometry(heartShape(0.0072), { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.008, bevelSegments: 2 }), btnMat, 0, 1.01, 0.02);
    btn.rotation.x = -Math.PI / 2 - 0.35;
    btn.position.y = 0.69;
    // a row of small dials
    for (let i = 0; i < 3; i++) add(con, new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), std('#e9e0cf', 0.4), -0.16 + i * 0.16, 0.67, -0.1).rotation.x = -0.35;
    return { g, cases, aur, auroraU, star, btn, btnMat, port, lamp, portLight, c1, con, moon };
  };

  const buildSea = (root) => {
    const g = new THREE.Group();
    g.position.set(5000, 0, 0);
    root.add(g);
    // the pink sky
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          varying vec3 vP;
          void main() {
            float y = normalize(vP).y;
            vec3 hi = vec3(0.12, 0.1, 0.32);
            vec3 mid = vec3(0.62, 0.3, 0.5);
            vec3 lo = vec3(0.95, 0.55, 0.55);
            vec3 c = mix(lo, mid, smoothstep(-0.05, 0.12, y));
            c = mix(c, hi, smoothstep(0.12, 0.7, y));
            float sun = pow(max(dot(normalize(vP), normalize(vec3(0.5, 0.12, -0.85))), 0.0), 220.0);
            c += vec3(1.0, 0.8, 0.6) * sun * 1.4;
            gl_FragColor = vec4(c * 0.75, 1.0);
          }`,
      }),
    );
    sky.renderOrder = -10;
    g.add(sky);
    // a big planet in the sky, far away
    const pl = CineKit.planet();
    pl.group.position.set(-420, 260, -900);
    pl.group.scale.setScalar(2.2);
    g.add(pl.group);
    // the sea of clouds
    const r = rng(23);
    for (let i = 0; i < 170; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), color: new THREE.Color('#c98aa6').lerp(new THREE.Color('#f0c4cf'), r() * 0.6), transparent: true, opacity: 0.85, depthWrite: false }));
      const a = r() * TAU;
      const d = 48 + Math.pow(r(), 0.7) * 520;
      s.position.set(Math.cos(a) * d, -26 - r() * 10, Math.sin(a) * d - 60);
      s.scale.set(70 + r() * 90, 30 + r() * 30, 1);
      g.add(s);
    }
    // the floating island where they are set down
    const island = new THREE.Group();
    g.add(island);
    const rock = new THREE.IcosahedronGeometry(1, 4);
    const p = rock.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = V3().fromBufferAttribute(p, i);
      const n = 1 + 0.18 * Math.sin(v.x * 5 + v.z * 3) + 0.12 * Math.sin(v.y * 7 + v.x * 2);
      v.multiplyScalar(n);
      if (v.y > 0) v.y *= 0.12;
      else v.y *= 1.9;
      p.setXYZ(i, v.x * 7.5, v.y * 7.5, v.z * 7.5);
    }
    rock.computeVertexNormals();
    add(island, rock, std('#6b5560', 0.95, 0, { flatShading: true }), 0, -0.6, 0);
    add(island, new THREE.CylinderGeometry(7.2, 7.4, 0.5, 40), std('#6fae7a', 0.9), 0, -0.25, 0);
    // little crystals and pink shrubs
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU;
      const d = 2.5 + r() * 4.2;
      if (i < 7)
        add(island, new THREE.OctahedronGeometry(0.2 + r() * 0.25, 0).scale(0.6, 2, 0.6), glow('#ffd2f0', 0.8), Math.cos(a) * d, 0.25, Math.sin(a) * d);
      else add(island, new THREE.SphereGeometry(0.3 + r() * 0.35, 10, 8), std('#e7a3c4', 0.9), Math.cos(a) * d, 0.1, Math.sin(a) * d);
    }
    // the other islands, and the one far below with the whole heart
    for (let i = 0; i < 5; i++) {
      const s = 0.25 + r() * 0.35;
      const o = new THREE.Mesh(rock, std('#6b5560', 0.95, 0, { flatShading: true }));
      o.scale.setScalar(s);
      o.position.set((r() - 0.5) * 140, -8 - r() * 14, -40 - r() * 120);
      g.add(o);
      add(o, new THREE.CylinderGeometry(7.2, 7.4, 0.5, 30), std('#6fae7a', 0.9), 0, 0.35, 0);
    }
    const low = new THREE.Mesh(rock, std('#6b5560', 0.95, 0, { flatShading: true }));
    low.scale.setScalar(0.9);
    low.position.set(12, -40, -120);
    g.add(low);
    add(low, new THREE.CylinderGeometry(7.2, 7.4, 0.5, 30), std('#6fae7a', 0.9), 0, 0.35, 0);
    const heart = Heart.galaxy(16000, 1.1, 9);
    heart.group.position.set(12, -20, -120);
    heart.U.uFill.value = 1;
    heart.U.uDim.value = 1;
    heart.core.material.opacity = 0.16;
    heart.core.scale.multiplyScalar(0.6);
    g.add(heart.group);
    const hl = new THREE.PointLight('#ff7aa6', 3, 60, 1.5);
    hl.position.set(12, -30, -115);
    g.add(hl);
    return { g, heart, island };
  };

  // ---------- the saucer's decorations: chandeliers and lit display windows ----------
  const buildDeco = (root) => {
    const g = new THREE.Group();
    root.add(g);
    const gold = std('#d2a35c', 0.3, 0.9);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      const ch = new THREE.Group();
      ch.position.set(Math.cos(a) * 7.4, -0.6, Math.sin(a) * 7.4);
      g.add(ch);
      add(ch, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), gold, 0, -0.8, 0);
      add(ch, new THREE.TorusGeometry(0.6, 0.06, 6, 20).rotateX(Math.PI / 2), gold, 0, -1.7, 0);
      for (let k = 0; k < 8; k++) {
        const b = (k / 8) * TAU;
        add(ch, new THREE.OctahedronGeometry(0.1, 0).scale(1, 2, 1), glow('#ffe7c4', 1.8), Math.cos(b) * 0.6, -1.95, Math.sin(b) * 0.6);
      }
      add(ch, new THREE.OctahedronGeometry(0.16, 0).scale(1, 2.2, 1), glow('#ffd0e4', 1.8), 0, -2.2, 0);
    }
    // lit windows on the dome, each with a small treasure in silhouette
    const wtex = canvasTex(128, 96, (x, w, h) => {
      x.fillStyle = '#ffcf8a';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#5a2a2a';
      x.fillRect(52, 40, 24, 46);
      x.beginPath();
      x.arc(64, 34, 12, 0, TAU);
      x.fill();
      x.strokeStyle = '#7a4a2a';
      x.lineWidth = 6;
      x.strokeRect(3, 3, w - 6, h - 6);
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const w = add(g, new THREE.PlaneGeometry(1.1, 0.7), glow('#ffffff', 1.1, { map: wtex, side: THREE.DoubleSide }), Math.cos(a) * 5.2, 1.18, Math.sin(a) * 5.2);
      w.lookAt(Math.cos(a) * 20, 3.5, Math.sin(a) * 20);
    }
    return g;
  };

  // ---------- the clip ----------
  Cut.define('pasencore', {
    dur: DUR,
    subs: SUBS,
    titles: [],
    score(A) {
      // 0 · the voyage theme, soft; it stops dead when the saucer shows
      A.pad([53, 60, 64, 69, 72], 0, 10.6, 0.05, { a: 0.25, r: 0.02 });
      [72, 76, 79, 84, 79, 76, 81, 88, 84].forEach((m, i) => A.bell(m, 0.8 + i * 1.05, 0.032, i === 8 ? 1.2 : 3));
      A.noise(10.6, 4.6, 260, 140, 0.05, 'lowpass', 0.6);
      // a doorbell
      A.bell(88, 12.2, 0.06, 2.2);
      A.bell(84, 12.75, 0.06, 2.8);
      A.noise(12.6, 3, 90, 60, 0.07, 'lowpass', 0.7);
      // the Captain's motif: a small pompous fanfare on a harpsichord
      [72, 76, 79, 84].forEach((m, i) => A.pluck(m, 15.7 + i * 0.09, 0.05));
      A.pluck(83, 16.15, 0.04, 0.4);
      A.pluck(84, 16.25, 0.04, 0.4);
      A.pluck(83, 16.35, 0.04, 0.4);
      A.pluck(84, 16.45, 0.05, 1.4);
      A.pad([48, 55, 64], 15.6, 9, 0.025);
      // the lens
      A.bell(91, 19.0, 0.02, 1.4);
      // the bow
      [79, 84].forEach((m, i) => A.pluck(m, 23.1 + i * 0.12, 0.04));
      // the assistant, nervous
      [61, 60, 61, 60].forEach((m, i) => A.pluck(m, 25.2 + i * 0.16, 0.03, 0.3));
      // the monocle drops
      A.bell(96, 28.2, 0.03, 0.6);
      // the sigh, and the motif deflated
      A.noise(29.1, 1.4, 900, 300, 0.05, 'bandpass', 0.7);
      [84, 79, 76, 72].forEach((m, i) => A.pluck(m, 29.4 + i * 0.32, 0.035, 0.9));
      // the button, the beam charging
      A.bell(81, 32.1, 0.05, 1.6);
      A.noise(32.2, 5.4, 300, 3200, 0.08, 'bandpass', 1.2);
      A.pad([57, 64, 69, 76], 33, 4.6, 0.03, { a: 0.4, r: 0.1 });
      // breath, then silence
      A.noise(34.6, 1.1, 1400, 900, 0.04);
      A.noise(35.9, 1.3, 1400, 900, 0.04);
      // the other planet: soft, under the Captain
      A.pad([57, 64, 69, 73, 76], 38.2, 6, 0.03);
      // the heart: the theme comes back, full
      A.pad([53, 60, 64, 69, 72, 76], 43.6, 6.6, 0.06, { a: 0.2, r: 0.4 });
      A.pad([41, 48], 43.6, 6.6, 0.05, { a: 0.2, r: 0.4 });
      [72, 76, 79, 84, 88, 84, 81, 79].forEach((m, i) => A.bell(m, 44 + i * 0.62, 0.045, 3));
      A.bell(84, 49, 0.05, 3);
    },
    build(K) {
      const { scene, cam, group, ease, seg, pulse, FU, lights } = K;
      const roof = buildRoof(group);
      const room = buildRoom(group);
      const sea = buildSea(group);
      const deco = buildDeco(group);
      const D = K.rig('yoline');
      const V = K.rig('william');
      const ship = K.ship();
      const CAP = captain();
      const AS = assistant();
      group.add(CAP.g, AS.g);
      const sun = new THREE.DirectionalLight('#ffd6c4', 0);
      const cold = new THREE.DirectionalLight('#9fc8ff', 0);
      const amb2 = new THREE.HemisphereLight('#ffd2dc', '#6a4a60', 0);
      scene.add(sun, cold, amb2, sun.target, cold.target);
      const heartLight = new THREE.PointLight('#ff6a96', 0, 12, 2);
      scene.add(heartLight);
      const fogRoof = new THREE.FogExp2('#0a0a18', 0.0028);
      const fogSea = new THREE.FogExp2('#8a4a6a', 0.0012);
      const P = HQRig.P;
      const tmp = V3();
      const look = V3();
      const at = (x, y, z) => look.set(x, y, z);
      const camAt = (p, l) => {
        cam.position.copy(p);
        cam.lookAt(l);
      };
      const fov = (f) => {
        if (cam.fov !== f) {
          cam.fov = f;
          cam.updateProjectionMatrix();
        }
      };
      // the two of them on the roof, backs to the camera, hand in hand
      const standPair = (t, cx = 0, cy = 0, cz = 0) => {
        D.g.position.set(cx - 0.4, cy, cz);
        V.g.position.set(cx + 0.4, cy, cz);
        D.g.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
        V.g.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
        const pd = P.stand();
        const pv = P.stand();
        pd.head.p = -0.32 + Math.sin(t * 1.2) * 0.02;
        pv.head.p = -0.3 + Math.sin(t * 1.0 + 1) * 0.02;
        pd.head.y = -0.12;
        pv.head.y = 0.12;
        D.apply(pd);
        V.apply(pv);
        D.groundSnap(cy);
        V.groundSnap(cy);
        const mid = K.holdHands(D, V, pd, pv).clone();
        D.apply(pd);
        V.apply(pv);
        return mid;
      };
      const show = (k) => {
        roof.g.visible = k === 'roof';
        room.g.visible = k === 'room';
        CAP.g.visible = AS.g.visible = k === 'room';
        sea.g.visible = k === 'sea';
        deco.visible = k === 'roof' || k === 'sea';
        ship.group.visible = k === 'roof' || k === 'sea';
        D.g.visible = V.g.visible = k !== 'room';
      };
      // the saucer above the roof
      const shipAt = (t, pos, beam = 0, hatch = 0) => {
        ship.group.position.copy(pos);
        ship.group.rotation.set(0, t * 0.08, 0);
        ship.ring.rotation.y = -t * 0.5;
        ship.lights.rotation.y = t * 0.3;
        ship.BU.uOn.value = beam;
        ship.beam.scale.set(0.9, 1.6, 0.9);
        ship.update(t, { hatch });
        deco.position.copy(pos);
        deco.rotation.y = t * 0.08;
      };
      group.updateMatrixWorld(true);
      // it comes down over the city in front of them, then (unseen, while we are inside) right
      // above the roof
      const SHIP_HI = V3(0, 104, -122);
      const SHIP_MID = V3(0, 15, -62);
      const SHIP_LO = V3(0, 24, -1.5);

      return {
        seek(t, dt) {
          const [t0, name] = shotOf(t);
          const u = t - t0;
          const outdoor = !['room', 'lens', 'admire', 'message', 'button'].includes(name);
          const sky = name === 'sea' || name === 'reveal';
          show(outdoor ? (sky ? 'sea' : 'roof') : 'room');
          scene.fog = outdoor ? (sky ? fogSea : fogRoof) : null;
          scene.background = new THREE.Color(outdoor ? (sky ? '#8a4a6a' : '#05040c') : '#0c0610');
          lights.amb.intensity = 0.3;
          sun.intensity = 0;
          cold.intensity = 0;
          amb2.intensity = 0;
          heartLight.intensity = 0;
          lights.key.intensity = 1.1;
          lights.rim.intensity = 0.9;
          lights.key.color.set('#ffe2d0');
          lights.rim.color.set('#ff6a96');
          FU.uWarm.value = 0.15;
          // a quick dip to black between some shots
          const dip = (a, b) => Math.max(0, 1 - Math.abs(t - a) / b);
          FU.uFade.value = Math.max(FU.uFade.value, dip(15.5, 0.35), dip(33, 0.3), dip(38, 0.7));
          roof.heart.U.uTime.value = t;
          sea.heart.U.uTime.value = t;
          room.auroraU.uTime.value = t;
          roof.red.visible = Math.sin(t * 3) > 0.2;
          const beat = Math.pow(Math.max(0, Math.sin(t * 2.2)), 12);
          roof.heart.U.uBeat.value = beat * 0.6;
          roof.heart.U.uPx.value = 3 * R.renderer.getPixelRatio();
          sea.heart.U.uPx.value = 0.9 * R.renderer.getPixelRatio();
          sea.heart.U.uFade.value = 0.42;
          sea.heart.U.uBeat.value = beat * 0.8;

          if (name === 'roof' || name === 'hands' || name === 'arrive') {
            // night roof, the heart above the city; the clouds part, the saucer comes down
            lights.key.position.set(-4, 6, 6);
            lights.rim.position.set(0, 8, -30);
            lights.rim.intensity = 1.1 + beat * 0.6;
            heartLight.position.set(0, 3, -4);
            heartLight.intensity = 1.2 + beat * 1.2;
            const part = ease(seg(t, 10.6, 14.5));
            roof.clouds.forEach((c) => {
              c.position.x = c.userData.x + c.userData.side * part * 90 * c.userData.k;
              c.material.opacity = 0.8 * (1 - part * 0.5);
              c.material.color.set('#8d97b8').lerp(new THREE.Color('#dce8ff'), part);
            });
            const down = ease(seg(t, 11.2, 15.5));
            cold.intensity = part * 1.4;
            cold.position.set(0, 60, -10);
            cold.target.position.set(0, 0, 0);
            lights.amb.intensity = 0.3 + part * 0.25;
            const sp = SHIP_HI.clone().lerp(SHIP_MID, down).add(V3(0, Math.sin(t * 1.3) * 0.15, 0));
            shipAt(t, sp, 0, 0);
            const mid = standPair(t);
            if (name === 'roof') {
              fov(40);
              const k = ease(seg(t, 0, 6.5));
              camAt(V3(lerp(1.2, 0.5, k), lerp(1.45, 1.2, k), lerp(6.4, 4.2, k)), at(0, lerp(1.5, 6.5, k), lerp(0, -40, k)));
            } else if (name === 'hands') {
              // from the front, low: the gloves lit by the heart, the city behind
              fov(30);
              const a = lerp(-0.35, 0.1, u / 4);
              camAt(mid.clone().add(V3(Math.sin(a) * 0.9, -0.12, -Math.cos(a) * 0.85)), mid.clone().add(V3(0, 0.05, 0)));
              lights.rim.position.set(0, 5, -10);
              lights.rim.intensity = 1.4 + beat * 1.4;
            } else {
              fov(50);
              const k = ease(seg(u, 0, 5));
              camAt(V3(lerp(1.8, 1.2, k), lerp(0.45, 0.35, k), lerp(4.6, 5.2, k)), sp.clone().lerp(V3(0, 4, -30), 0.5));
              FU.uWarm.value = 0;
            }
          } else if (name === 'beamHands' || name === 'rise') {
            // the beam: they do not let go
            cold.intensity = 1.0;
            cold.position.set(0, 60, -10);
            lights.amb.intensity = 0.45;
            const beamOn = ease(seg(t, 33, 34));
            shipAt(t, SHIP_LO, 0.6 * beamOn, beamOn);
            lights.key.intensity = 0.55;
            const lift = Math.pow(seg(t, 34.6, 38), 1.6) * 16;
            const tt = t - 33;
            D.g.position.set(-0.4, lift, 0);
            V.g.position.set(0.4, lift, 0);
            const sway = Math.sin(t * 1.4) * 0.05 * seg(t, 34.6, 36);
            D.g.quaternion.setFromEuler(new THREE.Euler(sway, Math.PI + 0.05, 0));
            V.g.quaternion.setFromEuler(new THREE.Euler(-sway, Math.PI - 0.05, 0));
            const fl = seg(t, 34.6, 35.6);
            const pd = P.mix(P.stand(), P.float(tt, 0), fl);
            const pv = P.mix(P.stand(), P.float(tt, 1.3), fl);
            pd.head.p = -0.5;
            pv.head.p = -0.5;
            D.apply(pd);
            V.apply(pv);
            // standing on the roof until the beam takes them: their feet on it
            D.g.position.y += lift - D.groundSnap(0, true);
            V.g.position.y += lift - V.groundSnap(0, true);
            const mid = K.holdHands(D, V, pd, pv, 0.3).clone();
            D.apply(pd);
            V.apply(pv);
            heartLight.position.copy(mid).add(V3(0, 1, 0));
            heartLight.color.set('#bfe8ff');
            heartLight.intensity = 0.9 * beamOn;
            FU.uWarm.value = 0;
            if (name === 'beamHands') {
              fov(28);
              const a = lerp(-0.3, 0.05, u / 2.2);
              camAt(mid.clone().add(V3(Math.sin(a) * 0.95, -0.1, -Math.cos(a) * 0.9)), mid.clone().add(V3(0, 0.05, 0)));
            } else {
              fov(42);
              const k = ease(seg(u, 0, 2.8));
              camAt(V3(lerp(5, 6.5, k), lerp(1.2, 2.5, k) + lift * 0.45, lerp(5, 7, k)), at(0, 1.1 + lift, 0));
            }
            if (t > 37.1) FU.uFade.value = Math.max(FU.uFade.value, seg(t, 37.1, 38));
            heartLight.color.set(name === 'beamHands' ? '#bfe8ff' : '#bfe8ff');
          } else if (name === 'sea' || name === 'reveal') {
            // another planet: a sea of pink clouds, a floating island, set down like fragile things
            const O = sea.g.position;
            sun.intensity = 1.0;
            sun.position.set(O.x + 40, 30, -60);
            sun.target.position.copy(O);
            amb2.intensity = 0.42;
            lights.amb.intensity = 0.2;
            lights.key.intensity = 0.4;
            lights.rim.color.set('#ffb0c8');
            lights.rim.position.set(O.x + 10, -10, -95);
            lights.rim.intensity = 0.9;
            FU.uWarm.value = 0.35;
            const land = ease(seg(t, 38.4, 41.6));
            shipAt(t, V3(O.x - 3, 40 - land * 6, 2), 0.7 * (1 - seg(t, 42, 43.2)), 1 - seg(t, 42.2, 43.4));
            const lieD = HQRig.wake('back', Math.max(0, (t - 43.9) * 1.7));
            const lieV = HQRig.wake('front', Math.max(0, (t - 43.4) * 1.7));
            const lyD = O.clone().add(V3(-0.55, 0, 0.2));
            const lyV = O.clone().add(V3(0.55, 0, -0.1));
            const h = lerp(14, 0, land);
            D.g.position.set(lyD.x, h + 0.9, lyD.z);
            V.g.position.set(lyV.x, h + 0.9, lyV.z);
            D.g.quaternion.setFromEuler(new THREE.Euler(lerp(-0.25, lieD.pitch, land), 0.35, 0, 'YXZ'));
            V.g.quaternion.setFromEuler(new THREE.Euler(lerp(0.25, lieV.pitch, land), -0.3, 0, 'YXZ'));
            const pd = land < 1 ? P.mix(P.float(t, 0), lieD.pose, land) : lieD.pose;
            const pv = land < 1 ? P.mix(P.float(t, 1.3), lieV.pose, land) : lieV.pose;
            if (name === 'reveal') {
              // up on their feet, they turn to the edge: the heart, whole, below
              const turn = ease(seg(t, 46.4, 48));
              D.g.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn * 2.4, 0)));
              V.g.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn * -2.6, 0)));
              pd.head.p = (pd.head.p || 0) * (1 - turn) + 0.25 * turn;
              pv.head.p = (pv.head.p || 0) * (1 - turn) + 0.25 * turn;
            }
            D.apply(pd);
            V.apply(pv);
            if (land >= 1) {
              D.groundSnap(0);
              V.groundSnap(0);
            }
            if (name === 'sea') {
              fov(46);
              const k = ease(seg(u, 0, 5.4));
              camAt(V3(O.x + lerp(6.5, 3.8, k), lerp(4.2, 2.0, k), lerp(9, 6, k)), at(O.x, lerp(9, 0.7, k), O.z - lerp(0, 1, k)));
            } else {
              fov(44);
              const k = ease(seg(u, 0.6, 6.4));
              camAt(V3(O.x + lerp(4.5, 0.6, k), lerp(1.4, 3.2, k), lerp(5.5, 5.2, k)), at(O.x + lerp(0, 11, k), lerp(0.9, -15, k), O.z + lerp(0, -110, k)));
            }
          } else {
            // ---------- inside the saucer ----------
            const O = room.g.position;
            lights.amb.intensity = 0.5;
            lights.key.position.set(O.x - 3, 4, O.z + 4);
            lights.key.intensity = 0.7;
            lights.rim.position.set(O.x + 4, 3, O.z - 4);
            lights.rim.color.set('#ffb070');
            lights.rim.intensity = 0.6;
            FU.uWarm.value = 0.3;
            // the blocking, in the room's own frame: the porthole in the floor, the aurora case,
            // the console with the heart button
            const L = (x, z, y = 0) => V3(O.x + x, y, O.z + z);
            const C = CAP;
            const A = AS;
            const face = (who, p) => (who.g.rotation.y = Math.atan2(p.x - who.g.position.x, p.z - who.g.position.z));
            // a camera around a point: yaw (from +z), distance, height, aimed at that point + lift
            const orbit = (c, yaw, dist, h, lift, f) => {
              fov(f);
              camAt(V3(c.x + Math.sin(yaw) * dist, h, c.z + Math.cos(yaw) * dist), at(c.x, lift, c.z));
            };
            const PORT = L(0.6, -0.4);
            const CASE = room.c1.getWorldPosition(V3());
            const CON = room.con.getWorldPosition(V3());
            const AT_PORT = L(0.6, 0.55);
            C.g.position.copy(AT_PORT);
            C.g.rotation.set(0, Math.PI, 0);
            C.body.rotation.set(0, 0, 0);
            C.head.rotation.set(0, 0, 0);
            C.neck.rotation.set(0, 0, 0);
            armPose(C, 0, 0.1, 0.08, 0.2);
            armPose(C, 1, 0.1, 0.08, 0.2);
            C.monocle.position.set(-0.057, 0.009, 0.153);
            C.monocle.rotation.set(0, 0, 0);
            C.monocle.userData.glint.position.x = Math.sin(t * 0.9) * 0.03;
            C.eyes.forEach((e) => e.scale.setScalar(1));
            if (C.duster) C.duster.visible = false;
            if (C.lens) C.lens.visible = false;
            // the assistant waits at the door, then comes in with the card, wringing his hands
            const enter = ease(seg(t, 24.6, 26.2));
            A.g.position.copy(L(lerp(4.2, 1.45, enter), lerp(2.4, 0.95, enter)));
            face(A, C.g.position);
            A.body.rotation.set(0.28, 0, 0);
            A.neck.rotation.set(0.25, 0, 0);
            A.head.rotation.set(-0.15 + Math.sin(t * 7) * 0.03, Math.sin(t * 2.3) * 0.1, 0);
            const wring = Math.sin(t * 9) * 0.12;
            armPose(A, 0, 0.9 + wring, -0.25, 1.1);
            armPose(A, 1, 0.9 - wring, -0.25, 1.1);
            if (!A.card) {
              A.card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.002), std('#f3f1ec', 0.5, 0, { emissive: '#333333' }));
              A.arms[0].userData.hand.add(A.card);
              A.card.position.set(-0.04, -0.07, 0.03);
            }
            A.card.visible = t > 25.2;
            room.btnMat.color.set('#ff5f8a').multiplyScalar(0.9);
            if (name === 'room') {
              // dusting the aurora jar with a pink feather duster, then nudging it a hair
              const to = V3(CASE.x - O.x, 0, CASE.z - O.z).normalize();
              C.g.position.set(CASE.x - to.x * 0.75 + to.z * 0.25, 0, CASE.z - to.z * 0.75 - to.x * 0.25);
              face(C, CASE);
              const dust = u < 2 ? Math.sin(u * 14) * 0.25 : 0;
              armPose(C, 1, 1.35, 0.15 + dust, 0.5);
              armPose(C, 0, 0.1, 0.1, 0.25);
              C.head.rotation.set(0.12, 0.25 * Math.sin(u * 2), 0);
              if (u > 2.1) armPose(C, 1, 1.15, -0.05, 0.75 + seg(u, 2.3, 2.5) * 0.05);
              if (!C.duster) {
                C.duster = new THREE.Group();
                add(C.duster, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), std('#d2a35c', 0.3, 0.9), 0, -0.08, 0);
                add(C.duster, new THREE.SphereGeometry(0.05, 10, 8).scale(1.4, 1, 1.4), std('#ff9ac0', 0.95), 0, -0.18, 0);
                C.arms[1].userData.hand.add(C.duster);
              }
              C.duster.visible = u < 2.1;
              const yaw = C.g.rotation.y + lerp(1.15, 0.95, ease(seg(u, 0, 2.9)));
              orbit(C.g.position.clone().lerp(CASE, 0.35), yaw, lerp(2.3, 1.9, ease(seg(u, 0, 2.9))), 1.05, 0.85, 36);
            } else if (name === 'lens') {
              // bent over the porthole, the lens up to the monocle: an enormous eye looks up at us
              face(C, PORT);
              const bend = ease(seg(u, 0, 0.8));
              C.body.rotation.x = 0.35 * bend;
              C.head.rotation.x = 0.35 * bend;
              armPose(C, 0, 1.75 * bend, -0.35, 1.45 * bend);
              armPose(C, 1, 0.35, 0.25, 0.5);
              if (!C.lens) {
                C.lens = new THREE.Group();
                add(C.lens, new THREE.TorusGeometry(0.075, 0.009, 8, 24), std('#d2a35c', 0.3, 0.9));
                add(C.lens, new THREE.CircleGeometry(0.073, 24), new THREE.MeshStandardMaterial({ color: '#d8ecff', roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.2 }));
                add(C.lens, new THREE.CylinderGeometry(0.009, 0.011, 0.12, 6).translate(0, -0.14, 0), std('#3a2216', 0.5));
                // the magnified eye behind the glass
                C.big = add(C.lens, new THREE.SphereGeometry(0.066, 20, 14).scale(1.3, 0.85, 0.25), std('#07060c', 0.06, 0.2), 0, 0, -0.014);
                add(C.big, new THREE.SphereGeometry(0.014, 8, 6), glow('#ffffff', 1.3), -0.02, 0.02, 0.02);
                C.head.add(C.lens);
              }
              C.lens.visible = true;
              C.lens.position.set(-0.057, 0.01, 0.24);
              C.big.scale.setScalar(lerp(0.4, 1.12, ease(seg(u, 0.5, 1.5))) * (1 + Math.sin(t * 6) * 0.03));
              // from the other side of the porthole, low: his face over the glass
              const head = C.head.getWorldPosition(V3());
              const fwd = V3(Math.sin(C.g.rotation.y), 0, Math.cos(C.g.rotation.y));
              const k = ease(seg(u, 0, 3.8));
              fov(30);
              camAt(head.clone().addScaledVector(fwd, lerp(1.25, 0.95, k)).add(V3(0.12, -0.42, 0)), head.clone().add(V3(0, -0.02, 0)));
            } else {
              face(C, PORT);
              // standing very straight; a hand on the heart; then a little bow to the porthole
              const bow = pulse(t, 23, 24.6, 0.5);
              C.body.rotation.x = -0.06 + bow * 0.5;
              C.head.rotation.x = bow * 0.2;
              armPose(C, 0, 1.0, -0.55, 1.75);
              armPose(C, 1, 0.1 + bow * 0.5, 0.35, 0.2 + bow * 0.4);
              if (name === 'admire') {
                const yaw = C.g.rotation.y + lerp(0.75, 0.55, ease(seg(u, 0, 2.6)));
                orbit(C.g.position, yaw, 2.4, 0.95, 0.66, 34);
              } else {
                // he turns to the assistant and freezes; the monocle drops on its chain
                const turnTo = ease(seg(t, 25.5, 26.3));
                C.g.rotation.y += turnTo * 0.85;
                armPose(C, 0, 0.12, 0.1, 0.3);
                armPose(C, 1, 0.12, 0.1, 0.3);
                C.body.rotation.x = -0.08;
                const drop = ease(seg(t, 28, 28.35)) * (1 - ease(seg(t, 29.9, 30.5)));
                C.monocle.position.set(lerp(-0.057, -0.035, drop), lerp(0.009, -0.21, drop), lerp(0.153, 0.17, drop));
                C.monocle.rotation.z = drop * 0.6 + Math.sin(t * 10) * 0.15 * drop * (1 - seg(t, 28.4, 29.4));
                C.eyes.forEach((e) => e.scale.setScalar(1 + drop * 0.25));
                if (name === 'message' || t < 31.1) {
                  // a sigh, the hand putting the monocle back
                  const sigh = pulse(t, 29.1, 30.4, 0.5);
                  C.body.rotation.x = -0.08 + sigh * 0.16;
                  C.head.rotation.x = sigh * 0.28;
                  const fix = pulse(t, 29.7, 30.7, 0.3);
                  if (fix) armPose(C, 0, 1.25 * fix, -0.45, 1.65 * fix);
                  const mid = C.g.position.clone().lerp(A.g.position, 0.5);
                  const base = Math.atan2(A.g.position.x - C.g.position.x, A.g.position.z - C.g.position.z);
                  orbit(mid, base + Math.PI / 2 + 0.35, 2.4, 0.95, 0.74, 36);
                } else {
                  // to the console: the heart button
                  const go = ease(seg(t, 31.1, 31.9));
                  const stand = CON.clone().add(V3(Math.sin(room.con.rotation.y) * 0.36, 0, Math.cos(room.con.rotation.y) * 0.36));
                  C.g.position.lerpVectors(AT_PORT, stand, go);
                  C.g.position.y = 0;
                  face(C, CON);
                  C.monocle.position.set(-0.057, 0.009, 0.153);
                  const press = pulse(t, 32.0, 32.7, 0.2);
                  // one gloved finger, pressed with ceremony
                  armPose(C, 1, lerp(0.15, 1.1, go) + press * 0.12, 0.3, lerp(0.35, 0.2, go));
                  C.body.rotation.x = 0.12 * go;
                  room.btnMat.color.set('#ff5f8a').multiplyScalar(0.9 + press * 1.8);
                  room.btn.position.y = 0.69 - press * 0.012;
                  heartLight.position.copy(CON).add(V3(0, 1.3, 0));
                  heartLight.color.set('#ff6a96');
                  heartLight.intensity = 0.6 + press * 3;
                  orbit(CON, room.con.rotation.y + Math.PI - 0.6, 1.6, 1.15, 0.8, 34);
                }
              }
            }
          }
        },
      };
    },
  });
  // after the last épreuve of Terre 39
  Cut.AFTER.s2 = 'pasencore';
})();
