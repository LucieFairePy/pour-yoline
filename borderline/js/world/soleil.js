// ♠ 3 · Un, deux, trois, Soleil: a walled playground with a giant doll at the far end.
const Soleil = (() => {
  const O = V3(-700, 80, -700);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const { P } = K;
  const LINES = [6, 36, 66, 86];
  const DOLL = 98;
  let built = false;
  let screen = null;
  let doll = null;
  let card = null;
  const eyesM = [];
  const lineM = [];
  let yaw = 0;
  let tilt = 0;

  // mural: pastel sky, clouds and the circle / triangle / square of the game, painted on plaster
  const muralTex = () =>
    LvKit.tex(
      2048,
      512,
      (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#6fb9ea');
        gr.addColorStop(0.62, '#b8def2');
        gr.addColorStop(0.8, '#f6d2de');
        gr.addColorStop(1, '#e8b4c4');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        const r = rng(303);
        for (let i = 0; i < 34; i++) {
          const x = r() * w;
          const y = 40 + r() * 230;
          const sz = 22 + r() * 40;
          g.fillStyle = 'rgba(255,255,255,0.94)';
          for (let k = 0; k < 6; k++) {
            g.beginPath();
            g.arc(
              x + k * sz * 0.65,
              y + Math.sin(k * 1.7) * sz * 0.3,
              sz * (0.65 + r() * 0.45),
              0,
              TAU,
            );
            g.fill();
          }
          g.fillStyle = 'rgba(160,190,220,0.25)';
          g.fillRect(x - sz * 0.4, y + sz * 0.45, sz * 4.2, sz * 0.25);
        }
        // hedge band and painted symbols along the bottom
        g.fillStyle = '#7fbf9a';
        for (let x = 0; x < w; x += 26) {
          g.beginPath();
          g.arc(x, h - 92 + Math.sin(x * 0.05) * 6, 30, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#e8b4c4';
        g.fillRect(0, h - 70, w, 70);
        g.lineWidth = 10;
        g.strokeStyle = '#d0648a';
        for (let i = 0; i < 12; i++) {
          const x = 90 + i * 170;
          const y = h - 36;
          g.beginPath();
          const k = i % 3;
          if (k === 0) g.arc(x, y, 22, 0, TAU);
          else if (k === 1) {
            g.moveTo(x, y - 24);
            g.lineTo(x + 25, y + 20);
            g.lineTo(x - 25, y + 20);
            g.closePath();
          } else g.rect(x - 21, y - 21, 42, 42);
          g.stroke();
        }
        // plaster grain and weathering
        for (let i = 0; i < 26000; i++) {
          g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(60,40,60,0.05)';
          g.fillRect(r() * w, r() * h, 2, 2);
        }
        const dirt = g.createLinearGradient(0, h - 30, 0, h);
        dirt.addColorStop(0, 'rgba(90,50,60,0)');
        dirt.addColorStop(1, 'rgba(90,50,60,0.35)');
        g.fillStyle = dirt;
        g.fillRect(0, h - 30, w, 30);
      },
      4,
      1,
    );
  let M = null;
  const mats = () => {
    if (M) return M;
    const mural = muralTex();
    M = {
      floor: Tex.mat('sand', { color: '#7e5650', scale: 6, bump: 0.7 }),
      wall: new THREE.MeshStandardMaterial({
        map: mural,
        emissive: '#ffffff',
        emissiveMap: mural,
        emissiveIntensity: 0.12,
        color: '#9a9ab0',
        roughness: 0.9,
      }),
      cap: Tex.mat('concrete', { color: '#8a6a86', scale: 3 }),
      pole: Tex.mat('metal', { color: '#3a3040', scale: 2, rough: 0.9, metal: 0.5 }),
      plinth: Tex.mat('marble', { color: '#e8c6d4', scale: 4, bump: 0.4 }),
      bark: Tex.mat('wood', { color: '#6a3a3a', scale: 1.5, bump: 1.4 }),
    };
    return M;
  };

  const buildDoll = () => {
    const g = new THREE.Group();
    const body = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({
      color: '#ffd9c0',
      roughness: 0.55,
      emissive: '#4a2a20',
      emissiveIntensity: 0.4,
    });
    const orange = Tex.mat('fabric', {
      color: '#f07a2a',
      scale: 3,
      rough: 0.85,
      emissive: '#4a1a04',
      emissiveIntensity: 0.5,
    });
    const yellow = Tex.mat('fabric', {
      color: '#ffd24a',
      scale: 3,
      rough: 0.85,
      emissive: '#4a3a04',
      emissiveIntensity: 0.45,
    });
    const black = new THREE.MeshStandardMaterial({
      color: '#141018',
      roughness: 0.45,
      metalness: 0.2,
    });
    const white = new THREE.MeshStandardMaterial({
      color: '#f4f0f4',
      roughness: 0.7,
      emissive: '#2a2a2a',
    });
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 1.25, 16), white);
      leg.position.set(s * 0.28, 0.72, 0);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.48), black);
      shoe.position.set(s * 0.28, 0.08, 0.08);
      body.add(leg, shoe);
    });
    const dress = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [1.08, 1.05],
          [1.0, 1.25],
          [0.82, 1.8],
          [0.6, 2.35],
          [0.5, 2.55],
          [0.001, 2.56],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        48,
      ),
      orange,
    );
    const hem = new THREE.Mesh(
      new THREE.TorusGeometry(1.06, 0.05, 8, 64).rotateX(Math.PI / 2),
      orange,
    );
    hem.position.y = 1.06;
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.85, 32), yellow);
    shirt.position.y = 2.9;
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.06, 8, 32).rotateX(Math.PI / 2),
      white,
    );
    collar.position.y = 3.33;
    const straps = [-1, 1].map((s) => {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.95), orange);
      st.position.set(s * 0.26, 2.85, 0);
      return st;
    });
    body.add(dress, hem, shirt, collar, ...straps);
    const arms = [-1, 1].map((s) => {
      const a = new THREE.Group();
      const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), yellow);
      sleeve.scale.set(1, 1.2, 1);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.08, 1.1, 12).translate(0, -0.6, 0),
        skin,
      );
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), skin);
      hand.position.y = -1.18;
      a.add(sleeve, arm, hand);
      a.position.set(s * 0.55, 3.2, 0);
      a.rotation.z = s * 0.12;
      body.add(a);
      return a;
    });
    const head = new THREE.Group();
    head.position.y = 3.95;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.56, 40, 30), skin);
    face.scale.set(1, 1.04, 0.96);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 40, 30, 0, TAU, 0, Math.PI * 0.55),
      black,
    );
    hair.rotation.x = -0.35;
    hair.position.set(0, 0.04, -0.04);
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.2), black);
    bangs.position.set(0, 0.36, 0.42);
    bangs.rotation.x = 0.4;
    const buns = [-1, 1].map((s) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), black);
      b.position.set(s * 0.44, 0.42, -0.08);
      return b;
    });
    head.add(face, hair, bangs, ...buns);
    [-1, 1].forEach((s) => {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), black);
      socket.scale.set(1, 1.15, 0.5);
      socket.position.set(s * 0.2, 0.06, 0.5);
      const m = new THREE.MeshBasicMaterial({ color: '#000', toneMapped: false });
      eyesM.push(m);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), m);
      iris.position.set(s * 0.2, 0.07, 0.55);
      const cheek = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 16),
        new THREE.MeshBasicMaterial({ color: '#ff8fa6', transparent: true, opacity: 0.6 }),
      );
      cheek.position.set(s * 0.3, -0.14, 0.5);
      cheek.lookAt(s * 0.6, -0.28, 1.5);
      head.add(socket, iris, cheek);
    });
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.015, 6, 16, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#b02a3a' }),
    );
    mouth.position.set(0, -0.22, 0.53);
    mouth.rotation.z = Math.PI;
    head.add(mouth);
    body.add(head);
    g.add(body);
    g.scale.setScalar(2.6);
    return { g, body, head, arms };
  };

  const buildTree = (x, z, s) => {
    const trunkM = mats().bark;
    const leafM = new THREE.MeshStandardMaterial({
      color: '#ff9ec4',
      roughness: 0.8,
      emissive: '#5a1a3a',
      emissiveIntensity: 0.6,
      flatShading: true,
    });
    const trunk = K.deco(
      new THREE.CylinderGeometry(0.5 * s, 0.9 * s, 9 * s, 10),
      trunkM,
      x,
      4.5 * s,
      z,
    );
    K.collider(x, 4.5 * s, z, 1.4 * s, 9 * s, 1.4 * s);
    const r = rng(7);
    for (let i = 0; i < 9; i++) {
      const b = K.deco(
        new THREE.IcosahedronGeometry((2.4 + r() * 1.6) * s, 1),
        leafM,
        x + (r() - 0.5) * 7 * s,
        (9 + r() * 4) * s,
        z + (r() - 0.5) * 5 * s,
      );
      b.rotation.set(r() * 3, r() * 3, 0);
    }
    return trunk;
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    const { floor: floorMat, wall: wallMat, cap: capMat, pole, plinth } = mats();
    K.solid(0, -0.5, 52, 34, 1, 114, floorMat);
    K.solid(-17.5, 7, 52, 1, 14, 114, wallMat);
    K.solid(17.5, 7, 52, 1, 14, 114, wallMat);
    K.solid(0, 7, -5.5, 36, 14, 1, wallMat);
    K.solid(0, 7, 109.5, 36, 14, 1, wallMat);
    [-17.5, 17.5].forEach((x) => K.deco(new THREE.BoxGeometry(1.4, 0.4, 114), capMat, x, 14.2, 52));
    [-5.5, 109.5].forEach((z) => K.deco(new THREE.BoxGeometry(36.4, 0.4, 1.4), capMat, 0, 14.2, z));
    // skirting along the foot of the walls
    [-16.95, 16.95].forEach((x) =>
      K.deco(new THREE.BoxGeometry(0.1, 0.5, 114), capMat, x, 0.25, 52),
    );
    LINES.forEach((z, i) => {
      const m = K.deco(
        new THREE.BoxGeometry(32, 0.05, 0.35),
        LvKit.glow(i === 3 ? '#ffcf8a' : i === 0 ? '#ffffff' : '#ff9ec4', 1.4),
        0,
        0.03,
        z,
      );
      m.userData.c = m.material.color.clone();
      lineM.push(m);
    });
    // lamps along the walls
    const bulb = LvKit.glow('#ffe2b0', 2.2);
    for (let z = 4; z < 104; z += 12)
      [-16.4, 16.4].forEach((x) => {
        K.deco(new THREE.CylinderGeometry(0.06, 0.09, 6, 8), pole, x, 3, z);
        K.collider(x, 3, z, 0.25, 6, 0.25);
        K.deco(new THREE.SphereGeometry(0.22, 10, 8), bulb, x, 6.1, z);
      });
    // pedestal and doll
    K.solid(0, 0.3, DOLL, 6, 0.6, 6, plinth);
    K.collider(0, 5, DOLL, 3.4, 10, 3.4);
    doll = buildDoll();
    doll.g.position.copy(P(0, 0.6, DOLL));
    group.add(doll.g);
    buildTree(0, 105, 1.1);
    buildTree(-11, 104, 0.8);
    buildTree(11, 104, 0.85);
    // painted symbols on the sand before the start line
    const paint = LvKit.glow('#ff9ec4', 0.9);
    const ring = K.deco(
      new THREE.RingGeometry(1.1, 1.35, 48).rotateX(-Math.PI / 2),
      paint,
      -8,
      0.025,
      2,
    );
    const tri = K.deco(
      new THREE.RingGeometry(1.0, 1.25, 3, 1).rotateX(-Math.PI / 2),
      paint,
      0,
      0.025,
      2.2,
    );
    tri.rotation.y = Math.PI / 2;
    const sq = K.deco(
      new THREE.RingGeometry(1.15, 1.42, 4, 1).rotateX(-Math.PI / 2),
      paint,
      8,
      0.025,
      2,
    );
    sq.rotation.y = Math.PI / 4;
    [ring, tri, sq].forEach((m) => (m.renderOrder = 1));
    // start gate
    K.deco(new THREE.BoxGeometry(12.6, 0.5, 0.6), LvKit.glow('#ff9ec4', 1.2), 0, 9, -4.8);
    card = LvKit.card('3', '♠', false);
    card.position.copy(P(0, 2.4, 90));
    group.add(card);
    screen = makeScreen(26, 9, 1024);
    screen.mesh.position.copy(P(0, 24, 109));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
  };

  return {
    O,
    P,
    LINES,
    build,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    rel: K.rel,
    eye: () => P(0, 10.8, DOLL),
    dollPos: () => P(0, 8, DOLL),
    spawn(line, who) {
      const s = who === 'dame' ? -3 : 3;
      return P(s, 0, line === 0 ? 1.5 : LINES[line] + 0.8);
    },
    lineOf(q) {
      let l = 0;
      for (let i = 1; i < 3; i++) if (q.z >= LINES[i]) l = i;
      return l;
    },
    nearDoll: (q) => Math.hypot(q.x, q.z - (DOLL - 3)) < 4.2 && q.y > -0.5,
    nearCard: (q) => Math.hypot(q.x, q.z - 90) < 2.8 && q.y > -0.5,
    // yaw 0: back turned (singing), PI: facing the players
    setDoll(target, dt, eyes, sleep) {
      yaw = damp(yaw, target, 9, dt);
      doll.g.rotation.y = yaw;
      tilt = damp(tilt, sleep ? 0.35 : 0, 2, dt);
      doll.head.rotation.x = tilt;
      doll.head.rotation.z = tilt * 0.6;
      eyesM.forEach((m) => m.color.setRGB(1, 0.25, 0.55).multiplyScalar(eyes));
    },
    get yaw() {
      return yaw;
    },
    update(dt, t, x) {
      if (!built) return;
      screen.update(dt, t);
      card.visible = x.stage >= 3;
      card.rotation.y = t * 1.4;
      card.position.y = O.y + 2.4 + Math.sin(t * 2) * 0.15;
      doll.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 1.2 + i) * 0.05));
      lineM.forEach((m, i) =>
        m.material.color.copy(m.userData.c).multiplyScalar(1 + Math.sin(t * 3 + i) * 0.25),
      );
    },
  };
})();
