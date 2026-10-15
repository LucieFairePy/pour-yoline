// ♦ 3 · Les Interrupteurs: the Veilleurs' clockmaker workshop. Three rooms of switches that only
// work when the two of you talk: crossed light boards, coloured crystals read from above, and a
// clock guarded by an automaton.
const D1 = (() => {
  const O = V3(-700, 0, 2800);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;

  const marble = Tex.mat('marble', { color: '#8d837c', scale: 6, rough: 0.55, bump: 0.6 });
  const darkMarble = Tex.mat('marble', { color: '#3a2f3e', scale: 5, rough: 0.5 });
  const wood = Tex.mat('wood', { color: '#3f281c', scale: 0.7, rough: 0.7, bump: 0.5 });
  const plaster = Tex.mat('plaster', { color: '#a89a8c', scale: 3.5 });
  const panel = Tex.mat('plaster', { color: '#4a3040', scale: 3, rough: 0.85, bump: 0.35 });
  const brass = Tex.mat('metal', { color: '#c9993f', scale: 1.5, metal: 0.85, rough: 0.45 });
  const iron = Tex.mat('metal', { color: '#4a4652', scale: 1.5, metal: 0.7, rough: 0.6 });
  const tileMat = Tex.mat('stone', { color: '#7a7280', scale: 1.4, rough: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#bfe6ff',
    transparent: true,
    opacity: 0.16,
    roughness: 0.05,
    metalness: 0.2,
    depthWrite: false,
  });
  const glow = LvKit.glow;
  const COLORS = {
    rouge: '#ff3b55',
    bleu: '#3f8cff',
    or: '#ffc23a',
    vert: '#3fe08a',
    blanc: '#f4f0ff',
  };
  const SYM = { h: '♥', c: '♣', s: '♠', d: '♦' };

  let built = false;
  let screen = null;
  const tiles = [];
  const boards = { L: [], R: [] };
  const gates = {};
  const ledges = [];
  const crystals = {};
  const pedestals = {};
  const switches = {};
  const rings = {};
  let engraving = null;
  let clock = null;
  let guard = null;
  let card = null;
  let heart = null;
  const gears = [];
  const beams = [];
  // room 3: how far the automaton's light reaches along a heading, up to the inner face of the walls
  const beamReach = (a) => Math.min(18.7 / Math.max(1e-3, Math.abs(Math.sin(a))), 20.7 / Math.max(1e-3, Math.abs(Math.cos(a))));

  // ---------- helpers ----------
  const wall = (x, y, z, sx, sy, sz, mat = plaster) => K.solid(x, y, z, sx, sy, sz, mat);
  const rail = (x, y, z, sx, sz) => {
    K.solid(x, y + 0.5, z, sx, 1, sz, iron);
  };
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
    // spokes
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      const p = new THREE.Path();
      p.absarc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.17, 0, Math.PI * 2, true);
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
  const gear = (x, y, z, r, teeth, speed, rotY = 0, mat = brass) => {
    const m = K.deco(gearGeo(r, teeth, 0.25), mat, x, y, z);
    m.rotation.y = rotY;
    gears.push({ m, speed });
    return m;
  };
  const sign = (txt, sub, w, h, col = '#ffcf8a') => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round((1024 * h) / w);
    const g = c.getContext('2d');
    g.fillStyle = '#1a1018';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = col;
    g.lineWidth = 10;
    g.strokeRect(14, 14, c.width - 28, c.height - 28);
    g.fillStyle = col;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `italic ${c.height * 0.42}px "Bodoni Moda", Georgia, serif`;
    Icons.fillText(g, txt, c.width / 2, c.height * (sub ? 0.4 : 0.5));
    if (sub) {
      g.font = `${c.height * 0.16}px "IBM Plex Mono", monospace`;
      g.fillStyle = '#e8d9c8';
      Icons.fillText(g, sub, c.width / 2, c.height * 0.78);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    m.color.setScalar(0.8);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  };
  // painted numbers 1..9, shared by the tiles and the lamps (the same numbering on both boards)
  const numGeo = new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2);
  const lampGeo = new THREE.SphereGeometry(0.62, 28, 18);
  const bezelGeo = new THREE.TorusGeometry(0.66, 0.09, 10, 36);
  const numCache = {};
  const numMat = (n) => {
    if (numCache[n]) return numCache[n];
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#ffd9a0';
    g.shadowColor = 'rgba(0,0,0,.8)';
    g.shadowBlur = 12;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'italic 200px "Bodoni Moda", Georgia, serif';
    g.fillText(String(n), 128, 138);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
    m.color.setScalar(0.8);
    numCache[n] = m;
    return m;
  };
  const lever = (x, y, z, rotY, col) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), iron);
    base.position.y = 0.25;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.8), brass);
    plate.position.y = 0.53;
    const pivot = new THREE.Group();
    pivot.position.y = 0.55;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 10), brass);
    arm.position.y = 0.6;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow(col, 1.4));
    knob.position.y = 1.2;
    pivot.add(arm, knob);
    pivot.rotation.x = -0.6;
    g.add(base, plate, pivot);
    g.position.copy(P(x, y, z));
    K.collider(x, y + 0.3, z, 0.9, 0.6, 0.9);
    g.rotation.y = rotY;
    group.add(g);
    return { g, pivot, knob, col: new THREE.Color(col) };
  };
  const ringMesh = (x, y, z) => {
    const m = K.deco(new THREE.TorusGeometry(0.6, 0.08, 10, 32), glow('#ff5f8a', 2), x, y, z);
    return m;
  };

  const build = () => {
    group.visible = true;
    if (built) return;
    built = true;

    // ---------- entrance hall ----------
    wall(0, -0.5, 2, 18, 1, 16, marble);
    wall(-9, 4, 2, 0.6, 8, 16);
    wall(9, 4, 2, 0.6, 8, 16);
    wall(0, 4, -6, 18, 8, 0.6, panel);
    wall(0, 8.2, 2, 18, 0.4, 16, darkMarble);
    screen = makeScreen(10, 4.5, 1024);
    screen.mesh.position.copy(P(0, 4.6, -5.65));
    group.add(screen.mesh);
    gear(-6, 5, -5.6, 1.6, 14, 0.3);
    gear(-3.9, 3.4, -5.6, 1, 10, -0.48);
    gear(6, 5, -5.6, 1.6, 14, -0.3);
    gear(3.9, 3.4, -5.6, 1, 10, 0.48);
    LvKit.light(group, P(0, 6.5, 2), '#ffd9a8', 1.6, 22);

    // ---------- room 1 · les deux tableaux (crossed Lights-Out boards) ----------
    // the two halves are sealed by an opaque wall: each player only sees their own board
    wall(0, -0.5, 24, 30, 1, 28, marble);
    wall(-15, 5, 24, 0.6, 10, 28, plaster);
    wall(15, 5, 24, 0.6, 10, 28, plaster);
    [-1, 1].forEach((sd) => {
      K.deco(new THREE.BoxGeometry(0.1, 1.4, 28), wood, sd * 14.66, 0.7, 24);
      K.deco(new THREE.BoxGeometry(0.14, 0.12, 28), brass, sd * 14.64, 1.42, 24);
      K.deco(new THREE.BoxGeometry(0.14, 0.18, 28), brass, sd * 14.64, 9.7, 24);
    });
    wall(0, 5, 24, 0.8, 10, 28, darkMarble);
    wall(0, 10.2, 24, 30, 0.4, 28, darkMarble);
    // entrance wall with one doorway per half
    wall(-11.75, 4, 10, 6.5, 8, 0.6);
    wall(0, 4, 10, 11, 8, 0.6);
    wall(11.75, 4, 10, 6.5, 8, 0.6);
    wall(-7, 6.5, 10, 3, 3, 0.6);
    wall(7, 6.5, 10, 3, 3, 0.6);
    wall(0, 9.3, 10, 30, 2.4, 0.6);
    // doorway frames + plaques: ♥ on the left, ♠ on the right
    [-1, 1].forEach((sd) => {
      [-1.6, 1.6].forEach((dx) => K.solid(sd * 7 + dx, 2.5, 9.6, 0.25, 5, 0.25, brass));
      const s = sign(sd < 0 ? '♥' : '♠', sd < 0 ? 'TABLEAU A' : 'TABLEAU B', 2.6, 1.2, sd < 0 ? '#ff5f8a' : '#b9d4ff');
      s.position.copy(P(sd * 7, 6.4, 9.6));
      s.rotation.y = Math.PI;
      group.add(s);
    });
    ['L', 'R'].forEach((side) => {
      const sd = side === 'L' ? -1 : 1;
      // the board on the outer wall: 3 x 3 lamps in a brass frame
      const bx = sd * 14.62;
      K.solid(bx, 4.6, 24, 0.2, 7, 7, darkMarble);
      K.deco(new THREE.BoxGeometry(0.12, 7.4, 0.25), brass, bx - sd * 0.12, 4.6, 20.4);
      K.deco(new THREE.BoxGeometry(0.12, 7.4, 0.25), brass, bx - sd * 0.12, 4.6, 27.6);
      K.deco(new THREE.BoxGeometry(0.12, 0.25, 7.4), brass, bx - sd * 0.12, 8.2, 24);
      K.deco(new THREE.BoxGeometry(0.12, 0.25, 7.4), brass, bx - sd * 0.12, 1, 24);
      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3);
        const cI = i % 3;
        const y = 6.8 - r * 2.2;
        // columns read left to right for the player facing the board
        const z = 24 + sd * (cI - 1) * 2.2;
        const socket = K.deco(new THREE.CylinderGeometry(0.85, 0.95, 0.2, 24), iron, bx - sd * 0.2, y, z);
        socket.rotation.z = Math.PI / 2;
        const lamp = new THREE.Mesh(
          lampGeo,
          new THREE.MeshBasicMaterial({ color: '#2a2030', toneMapped: false }),
        );
        lamp.position.copy(P(bx - sd * 0.22, y, z));
        lamp.scale.set(0.45, 1, 1);
        group.add(lamp);
        const bezel = K.deco(bezelGeo, brass, bx - sd * 0.24, y, z);
        bezel.rotation.y = Math.PI / 2;
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), numMat(i + 1));
        plate.position.copy(P(bx - sd * 0.14, y - 1.1, z));
        plate.rotation.y = -sd * Math.PI / 2;
        group.add(plate);
        boards[side].push({ lamp, k: 0 });
      }
      const head = sign(
        side === 'L' ? '♥ · A' : '♠ · B',
        'ALLUMEZ TOUT',
        5,
        1.4,
        side === 'L' ? '#ff5f8a' : '#b9d4ff',
      );
      head.position.copy(P(bx - sd * 0.15, 9.2, 24));
      head.rotation.y = -sd * Math.PI / 2;
      group.add(head);
      // 3 x 3 pressure tiles in the middle of the half, numbered like the board
      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3);
        const cI = i % 3;
        // top row of the board = the row of tiles nearest the board
        const tx = sd * (7 + (1 - r) * 2.4);
        const tz = 24 + sd * (cI - 1) * 2.4;
        const base = K.deco(new THREE.BoxGeometry(2.1, 0.1, 2.1), tileMat, tx, 0.05, tz);
        const top = K.deco(
          new THREE.BoxGeometry(1.7, 0.08, 1.7),
          new THREE.MeshStandardMaterial({
            color: '#231b29',
            emissive: side === 'L' ? '#b9d4ff' : '#ff5f8a',
            emissiveIntensity: 0.08,
            metalness: 0.4,
            roughness: 0.4,
          }),
          tx,
          0.14,
          tz,
        );
        const num = new THREE.Mesh(numGeo, numMat(i + 1));
        num.position.copy(P(tx, 0.19, tz));
        num.rotation.y = -sd * Math.PI / 2;
        group.add(num);
        tiles.push({ side, i, x: tx, z: tz, top, num, press: 0 });
        void base;
      }
      // the door out of the half
      const gate = K.solid(sd * 7, 3, 37.8, 3, 6, 0.5, iron, { dyn: true });
      gate.y0 = O.y + 3;
      gate.off = 0;
      gates['g1' + side] = gate;
    });
    // full height and width of the bigger room 2, so no sky shows above room 1
    wall(-12.75, 7, 38, 8.5, 14, 0.6);
    wall(0, 7, 38, 11, 14, 0.6);
    wall(12.75, 7, 38, 8.5, 14, 0.6);
    wall(-7, 10, 38, 3, 8, 0.6);
    wall(7, 10, 38, 3, 8, 0.6);
    LvKit.light(group, P(-7, 8, 24), '#ffd9a8', 1.3, 18);
    LvKit.light(group, P(7, 8, 24), '#ffd9a8', 1.3, 18);

    // ---------- room 2 · les couleurs (crystals read from above) ----------
    wall(0, -0.5, 58, 34, 1, 40, marble);
    wall(-17, 7, 58, 0.6, 14, 40, plaster);
    wall(17, 7, 58, 0.6, 14, 40, plaster);
    wall(0, 14.2, 58, 34, 0.4, 40, darkMarble);
    // the gallery: only reachable with the grapple ring
    K.solid(0, 7, 74.5, 34, 0.5, 5, darkMarble);
    K.deco(new THREE.BoxGeometry(34, 0.14, 0.2), brass, 0, 6.8, 71.95);
    // railing with an opening where the grapple lands you
    rail(-10.5, 7.25, 72.1, 13, 0.15);
    rail(10.5, 7.25, 72.1, 13, 0.15);
    K.solid(-4, 7.85, 72.1, 0.25, 1.2, 0.25, brass);
    K.solid(4, 7.85, 72.1, 0.25, 1.2, 0.25, brass);
    rings.r2 = { pos: P(0, 10.6, 68), m: ringMesh(0, 10.6, 68), land: P(0, 7.25, 74.5) };
    // high ledges on the side walls: only the double jump reaches them (2.95 m)
    const LEDGES = [
      [-15.7, 46],
      [-15.7, 56],
      [-15.7, 66],
      [15.7, 50],
      [15.7, 62],
    ];
    LEDGES.forEach(([x, z], i) => {
      const lx = x + (x < 0 ? 0.6 : -0.6);
      K.solid(lx, 2.7, z, 2.2, 0.5, 2.6, wood);
      K.deco(new THREE.BoxGeometry(2.3, 0.12, 2.7), brass, lx, 2.98, z);
      ledges.push({ i, pos: P(lx, 2.95, z), x: lx, z });
    });
    // crystals start on the ledges
    Object.keys(COLORS).forEach((col, i) => {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: COLORS[col],
          emissive: COLORS[col],
          emissiveIntensity: 0.55,
          metalness: 0.1,
          roughness: 0.15,
          flatShading: true,
        }),
      );
      m.scale.y = 1.5;
      group.add(m);
      crystals[col] = { m, ledge: i, cur: V3() };
    });
    // three pedestals, each engraved with a suit
    [
      ['h', -7],
      ['c', 0],
      ['s', 7],
    ].forEach(([k, x]) => {
      K.solid(x, 0.6, 48, 1.4, 1.2, 1.4, darkMarble);
      K.deco(new THREE.CylinderGeometry(0.62, 0.7, 0.12, 24), brass, x, 1.26, 48);
      const s = sign(SYM[k], '', 1.1, 1.1, k === 'h' ? '#ff5f8a' : '#e8d9c8');
      s.position.copy(P(x, 0.62, 47.28));
      s.rotation.y = Math.PI;
      group.add(s);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1, 10).translate(0, 0.5, 0),
        new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      group.add(beam);
      pedestals[k] = { pos: P(x, 1.35, 48), x, beam };
    });
    // the floor engraving: legible only from steep above (the gallery), and only to the Dame
    engraving = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 9).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { map: { value: null }, uCam: { value: V3() } },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vW;
          void main() {
            vUv = uv;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: `
          uniform sampler2D map;
          uniform vec3 uCam;
          varying vec2 vUv;
          varying vec3 vW;
          void main() {
            vec3 v = normalize(uCam - vW);
            // grazing angles only show dust; looking down reveals the code
            float k = smoothstep(0.55, 0.85, v.y);
            vec4 t = texture2D(map, vUv);
            gl_FragColor = vec4(t.rgb * 0.8, t.a * k);
          }`,
      }),
    );
    engraving.position.copy(P(0, 0.04, 60));
    K.deco(new THREE.BoxGeometry(14.6, 0.04, 9.6), darkMarble, 0, 0.01, 60);
    K.deco(new THREE.BoxGeometry(15, 0.05, 0.18), brass, 0, 0.02, 64.85);
    K.deco(new THREE.BoxGeometry(15, 0.05, 0.18), brass, 0, 0.02, 55.15);
    K.deco(new THREE.BoxGeometry(0.18, 0.05, 9.9), brass, -7.4, 0.02, 60);
    K.deco(new THREE.BoxGeometry(0.18, 0.05, 9.9), brass, 7.4, 0.02, 60);
    engraving.renderOrder = 2;
    group.add(engraving);
    // the vault door
    const g2 = K.solid(0, 3.5, 77.8, 6, 7, 0.6, iron, { dyn: true });
    g2.y0 = O.y + 3.5;
    g2.off = 0;
    gates.g2 = g2;
    // as wide and tall as room 3 behind it
    wall(-11, 9, 78, 16, 18, 0.6);
    wall(11, 9, 78, 16, 18, 0.6);
    wall(0, 12.5, 78, 6, 11, 0.6);
    K.deco(new THREE.TorusGeometry(3.4, 0.25, 10, 48, Math.PI), brass, 0, 3.5, 77.4);
    LvKit.light(group, P(0, 12, 56), '#ffe2c0', 0.9, 30);
    gear(-12, 10, 77.4, 2.2, 18, 0.2);
    gear(12, 10, 77.4, 2.2, 18, -0.2);

    // ---------- room 3 · l'horloge (timed sequence + the automaton) ----------
    wall(0, -0.5, 99, 38, 1, 42, darkMarble);
    wall(-19, 9, 99, 0.6, 18, 42, plaster);
    wall(19, 9, 99, 0.6, 18, 42, plaster);
    wall(0, 9, 120, 38, 18, 0.6, panel);
    wall(0, 18.2, 99, 38, 0.4, 42, darkMarble);
    // the floor dial
    K.deco(new THREE.RingGeometry(15.5, 16, 96).rotateX(-Math.PI / 2), glow('#c9993f', 0.8), 0, 0.02, 99);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      K.deco(
        new THREE.BoxGeometry(0.3, 0.02, i % 3 ? 1.2 : 2.2).rotateY(-a),
        glow('#c9993f', 0.7),
        Math.sin(a) * 14.4,
        0.03,
        99 + Math.cos(a) * 14.4,
      );
    }
    // platforms with switches: Dame's (5 m, grapple ring above) on the left, Valet's (≈2.9 m) on the right
    const SW = [
      ['h', -14, 5, 87, 'dame'],
      ['d', -14, 5, 111, 'dame'],
      ['s', 14, 2.6, 87, 'valet'],
      ['c', 14, 2.9, 111, 'valet'],
    ];
    SW.forEach(([k, x, h, z, who]) => {
      K.solid(x, h / 2, z, 5, h, 5, who === 'dame' ? darkMarble : marble);
      K.deco(new THREE.BoxGeometry(5.2, 0.12, 5.2), brass, x, h + 0.02, z);
      const lv = lever(x + (x < 0 ? -1.4 : 1.4), h, z, x < 0 ? -Math.PI / 2 : Math.PI / 2, k === 'h' || k === 'd' ? '#ff5f8a' : '#b9d4ff');
      const s = sign(SYM[k], '', 1.4, 1.4, k === 'h' || k === 'd' ? '#ff5f8a' : '#e8d9c8');
      s.position.copy(P(x + (x < 0 ? -2.45 : 2.45), h + 2.2, z));
      s.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(s);
      switches[k] = { ...lv, k, pos: P(x, h, z), x, z, h, who, pull: 0 };
      if (who === 'dame') rings['r3' + k] = { pos: P(x + 2.5, h + 4.2, z), m: ringMesh(x + 2.5, h + 4.2, z), land: P(x, h, z) };
    });
    // the big clock face
    clock = makeClock();
    clock.mesh.position.copy(P(0, 10, 119.6));
    clock.mesh.rotation.y = Math.PI;
    group.add(clock.mesh);
    K.deco(new THREE.TorusGeometry(6.4, 0.35, 14, 72), brass, 0, 10, 119.5);
    gear(-10, 12, 119.4, 3, 22, 0.15, Math.PI);
    gear(-6.4, 15.5, 119.4, 1.8, 14, -0.25, Math.PI);
    gear(10, 12, 119.4, 3, 22, -0.15, Math.PI);
    gear(6.4, 15.5, 119.4, 1.8, 14, 0.25, Math.PI);
    gear(-13, 5, 119.4, 2, 16, -0.22, Math.PI, iron);
    gear(13, 5, 119.4, 2, 16, 0.22, Math.PI, iron);
    guard = makeGuard();
    guard.g.position.copy(P(0, 0, 99));
    group.add(guard.g);
    K.collider(0, 1.6, 99, 2.2, 3.2, 2.2);
    // the heart that opens when the clock is solved, with the card inside
    // the voyage heart-galaxy gathers over the clock once it is solved
    heart = Heart.galaxy(7000, 0.3, 21);
    heart.group.position.copy(P(0, 10.4, 118.6));
    heart.group.rotation.y = Math.PI;
    heart.U.uForm.value = 0;
    heart.core.material.opacity = 0;
    heart.group.visible = false;
    group.add(heart.group);
    card = LvKit.trialCard('d1', true);
    card.position.copy(P(0, 1.6, 104));
    group.add(card);
    LvKit.light(group, P(0, 14, 99), '#ffd2a0', 1.6, 40);
    LvKit.light(group, P(-14, 9, 99), '#ff9ec4', 0.8, 20);
    LvKit.light(group, P(14, 9, 99), '#b9d4ff', 0.8, 20);
  };

  // ---------- clock face (canvas): the Valet reads the sequence, the Dame only sees gears ----------
  const makeClock = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true });
    mat.color.setScalar(0.8);
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(6.1, 72), mat);
    let last = '';
    const draw = (seq, prog, role, hand, flash) => {
      const key = seq.join('') + prog + role + Math.round(hand * 60) + (flash ? 1 : 0);
      if (key === last) return;
      last = key;
      const W = 1024;
      g.clearRect(0, 0, W, W);
      const gr = g.createRadialGradient(512, 512, 40, 512, 512, 512);
      gr.addColorStop(0, '#2a1a24');
      gr.addColorStop(1, '#120a12');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(512, 512, 510, 0, 7);
      g.fill();
      g.strokeStyle = '#c9993f';
      g.lineWidth = 6;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r0 = i % 5 ? 470 : 440;
        g.beginPath();
        g.moveTo(512 + Math.sin(a) * r0, 512 - Math.cos(a) * r0);
        g.lineTo(512 + Math.sin(a) * 495, 512 - Math.cos(a) * 495);
        g.stroke();
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (role === 'done') {
        g.fillStyle = '#ffcf8a';
        g.font = 'italic 300px "Bodoni Moda", Georgia, serif';
        Icons.fillText(g, Cards.tagOf('d1'), 512, 520);
      } else if (role === 'valet' && seq.length) {
        // the sequence around the face, the current symbol pulsing
        seq.forEach((k, i) => {
          const a = (i / seq.length) * Math.PI * 2 - Math.PI / 2;
          const x = 512 + Math.cos(a) * 300;
          const y = 512 + Math.sin(a) * 300;
          const done = i < prog;
          const cur = i === prog;
          g.fillStyle = done ? '#3fe08a' : cur ? (flash ? '#ffffff' : '#ffcf8a') : '#e8d9c8';
          g.globalAlpha = done ? 0.55 : 1;
          g.font = `${cur ? 170 : 130}px Georgia, serif`;
          Icons.fillText(g, SYM[k], x, y);
          g.globalAlpha = 1;
          g.font = '40px "IBM Plex Mono", monospace';
          g.fillStyle = '#c495a6';
          g.fillText(String(i + 1), x, y + (cur ? 115 : 95));
        });
      } else {
        // the Dame sees only the mechanism
        g.fillStyle = '#c9993f';
        g.globalAlpha = 0.35;
        g.font = 'italic 64px Georgia, serif';
        g.fillText(role === 'dame' ? 'Demande-lui l’ordre' : '', 512, 760);
        g.globalAlpha = 1;
      }
      // the hand: the time left for the current symbol
      g.save();
      g.translate(512, 512);
      g.rotate(hand * Math.PI * 2);
      g.fillStyle = '#ffcf8a';
      g.beginPath();
      g.moveTo(-10, 40);
      g.lineTo(0, -420);
      g.lineTo(10, 40);
      g.fill();
      g.restore();
      g.fillStyle = '#c9993f';
      g.beginPath();
      g.arc(512, 512, 34, 0, 7);
      g.fill();
      tex.needsUpdate = true;
    };
    draw([], 0, '', 0, false);
    return { mesh, draw };
  };

  // ---------- the automaton: brass body, lens eye, an arm that sweeps a light over the floor ----------
  const makeGuard = () => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.6, 32), iron);
    base.position.y = 0.3;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 1.9, 24), brass);
    body.position.y = 1.55;
    const chest = new THREE.Mesh(gearGeo(0.55, 10, 0.12), iron);
    chest.position.set(0, 1.7, 0.92);
    const spin = new THREE.Group();
    spin.position.y = 2.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), brass);
    head.scale.set(1, 0.85, 1);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 20), glow('#ff3b55', 1.6));
    eye.rotation.x = Math.PI / 2;
    eye.position.z = 0.55;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 6), iron);
    arm.position.set(0, 0.9, 3);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.6, 16), brass);
    lantern.position.set(0, 0.9, 6.1);
    const lglass = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10), glow('#ff9a3a', 1.4));
    lglass.position.set(0, 0.6, 6.1);
    spin.add(head, eye, arm, lantern, lglass);
    // the sweeping light on the floor: a 16 m fan
    const fanShape = new THREE.Shape();
    const HALF = 0.2;
    fanShape.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) {
      const a = -HALF + (i / 16) * HALF * 2;
      fanShape.lineTo(Math.sin(a) * 16, Math.cos(a) * 16);
    }
    fanShape.lineTo(0, 0);
    const fan = new THREE.Mesh(
      new THREE.ShapeGeometry(fanShape).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: '#ff7a3a',
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    // (flat after rotateX, it already points along +z, the way the lantern arm and inBeam look)
    fan.position.y = -2.45;
    spin.add(fan);
    g.add(base, body, chest, spin);
    return { g, spin, eye, fan, chest, HALF };
  };

  const engraveTex = (code) => {
    const c = document.createElement('canvas');
    c.width = 1400;
    c.height = 900;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(232,189,132,0.9)';
    g.lineWidth = 8;
    g.strokeRect(20, 20, c.width - 40, c.height - 40);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(232,189,132,0.85)';
    g.font = 'italic 60px Georgia, serif';
    g.fillText('Le socle, puis la couleur', c.width / 2, 90);
    ['h', 'c', 's'].forEach((k, i) => {
      const x = 260 + i * 440;
      g.fillStyle = k === 'h' ? '#ff6a90' : '#ffd9a0';
      g.font = '280px Georgia, serif';
      Icons.fillText(g, SYM[k], x, 330);
      g.fillStyle = COLORS[code[k]];
      g.beginPath();
      g.moveTo(x, 520);
      g.lineTo(x + 90, 640);
      g.lineTo(x, 790);
      g.lineTo(x - 90, 640);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.6)';
      g.lineWidth = 6;
      g.stroke();
    });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  };

  // ---------- per-frame ----------
  const tmp = V3();
  // lit lamp colour (above the bloom threshold on purpose: the lamps glow)
  const LIT = new THREE.Color(1.25, 0.85, 0.4);
  const update = (dt, t, x, role, gAng, slam) => {
    if (!built) return;
    screen.update(dt, t);
    gears.forEach((gg) => (gg.m.rotation.z += gg.speed * dt * (x.stage >= 3 && slam > 0 ? -6 : 1)));
    // room 1 boards
    ['L', 'R'].forEach((side) => {
      const grid = (x.grid && x.grid[side]) || [];
      const solved = grid.length && grid.every(Boolean);
      boards[side].forEach((b, i) => {
        b.k = damp(b.k, grid[i] ? 1 : 0, 10, dt);
        const c = b.lamp.material.color;
        if (solved) c.set('#ffcf8a').multiplyScalar(0.55 + 0.25 * Math.sin(t * 4 + i));
        else c.set('#3a2c3a').lerp(LIT, b.k);
      });
    });
    tiles.forEach((tl) => {
      tl.press = Math.max(0, tl.press - dt * 3);
      tl.top.position.y = O.y + 0.14 - tl.press * 0.06;
      tl.top.material.emissiveIntensity = 0.08 + tl.press * 0.9;
    });
    const op = x.open || {};
    Object.entries(gates).forEach(([id, gt]) => {
      gt.off = damp(gt.off, op[id] ? 6.4 : 0, 2.5, dt);
      gt.m.position.y = gt.y0 + gt.off;
      gt.b.on = gt.off < 2.5;
    });
    // room 2
    // drawn again whenever the host re-draws the code (after a wrong crystal)
    const codeKey = x.code ? x.code.h + x.code.c + x.code.s : '';
    if (x.code && engraving.userData.key !== codeKey) {
      if (engraving.material.uniforms.map.value) engraving.material.uniforms.map.value.dispose();
      engraving.material.uniforms.map.value = engraveTex(x.code);
      engraving.userData.key = codeKey;
    }
    engraving.visible = role === 'dame' && x.stage === 2 && !!x.code;
    engraving.material.uniforms.uCam.value.copy(R.camera.position);
    rings.r2.m.visible = x.stage === 2;
    rings.r2.m.rotation.y = t;
    Object.entries(crystals).forEach(([col, cr], i) => {
      const where = (x.crys && x.crys[col]) || 'l' + cr.ledge;
      let target;
      if (where === 'carried') {
        const carrier = x.carrier === role ? Player.body.p : Remote.pos;
        target = tmp.copy(carrier).add(V3(0, 2.6 + Math.sin(t * 3) * 0.08, 0));
      } else if (where[0] === 'p') target = tmp.copy(pedestals[where.slice(1)].pos).add(V3(0, 0.6, 0));
      else target = tmp.copy(ledges[+where.slice(1)].pos).add(V3(0, 0.7 + Math.sin(t * 2 + i) * 0.08, 0));
      cr.cur.lerp(target, 1 - Math.exp(-14 * dt));
      cr.m.position.copy(cr.cur);
      cr.m.rotation.y += dt * 1.4;
      cr.m.visible = x.stage >= 2 && !(where === 'carried' && x.stage !== 2);
    });
    Object.entries(pedestals).forEach(([k, pd]) => {
      const col = x.crys && Object.keys(x.crys).find((cc) => x.crys[cc] === 'p' + k);
      const ok = col && x.code && x.code[k] === col;
      const want = x.stage >= 3 ? 1 : ok ? 1 : 0;
      pd.beam.material.opacity = damp(pd.beam.material.opacity, want * 0.5, 3, dt);
      if (col) pd.beam.material.color.set(COLORS[col]);
      pd.beam.position.copy(pd.pos).add(V3(0, 0.6, 0));
      pd.beam.scale.y = 12;
    });
    // room 3
    Object.values(rings).forEach((r) => {
      if (r !== rings.r2) r.m.visible = x.stage === 3;
      r.m.rotation.y = t;
    });
    Object.values(switches).forEach((sw) => {
      const last = x.pulled && x.pulled[sw.k];
      sw.pull = damp(sw.pull, last && t - (sw.seenAt || 0) < 0.9 ? 1 : 0, 10, dt);
      sw.pivot.rotation.x = -0.6 + sw.pull * 1.2;
      sw.knob.material.color.copy(sw.col).multiplyScalar(0.9 + sw.pull * 0.8);
    });
    if (guard) {
      guard.spin.rotation.y = gAng;
      // the 16 m fan stretched to the wall it points at
      guard.fan.scale.setScalar(beamReach(gAng) / 16);
      guard.fan.material.opacity = x.r3 === 'run' ? 0.22 + 0.06 * Math.sin(t * 6) : 0.06;
      guard.fan.material.color.set(slam > 0 ? '#ff2040' : '#ff7a3a');
      guard.eye.material.color.set(slam > 0 ? '#ff2040' : x.r3 === 'run' ? '#ff6a3a' : '#7a5040').multiplyScalar(1.6);
      guard.chest.rotation.z += dt * (slam > 0 ? -8 : 1.2);
      guard.g.position.y = O.y + (slam > 0 ? Math.abs(Math.sin(t * 30)) * 0.15 : 0);
    }
    heart.group.visible = x.stage >= 4;
    if (heart.group.visible) {
      const U = heart.U;
      U.uTime.value = t;
      U.uPx.value = R.renderer.getPixelRatio() * 0.45;
      U.uForm.value = Math.min(1, U.uForm.value + dt * 0.35);
      U.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.4)), 10);
      heart.core.material.opacity = 0.12 * U.uForm.value;
    }
    card.visible = x.stage >= 4;
    if (card.visible) {
      card.rotation.y = t * 1.2;
      card.position.y = O.y + 1.6 + Math.sin(t * 2) * 0.12;
    }
  };

  return {
    O,
    P,
    COLORS,
    SYM,
    build,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get clock() {
      return clock;
    },
    tiles,
    lampPos: (side, i) => boards[side][i].lamp.getWorldPosition(V3()),
    ledges,
    pedestals,
    switches,
    rings,
    crystals,
    update,
    hide() {
      group.visible = false;
    },
    rel: K.rel,
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 0) return P(s * 2, 0, 2);
      if (stage === 1) return P(s * 2, 0, 4);
      if (stage === 2) return P(s * 2, 0, 41);
      if (stage === 3) return P(s * 3, 0, 81);
      return P(s * 2, 0, 100);
    },
    tileAt(q) {
      if (q.y > 0.8 || q.y < -0.5) return null;
      return tiles.find((tl) => Math.abs(q.x - tl.x) < 1.05 && Math.abs(q.z - tl.z) < 1.05) || null;
    },
    nearLedge(q) {
      return ledges.find((l) => Math.hypot(q.x - l.x, q.z - l.z) < 1.9 && Math.abs(q.y - 2.95) < 0.7);
    },
    nearPed(q) {
      return Object.keys(pedestals).find(
        (k) => Math.hypot(q.x - pedestals[k].x, q.z - 48) < 2 && q.y < 1.5,
      );
    },
    nearSwitch(q) {
      return Object.values(switches).find(
        (sw) => Math.hypot(q.x - sw.x, q.z - sw.z) < 2.7 && Math.abs(q.y - sw.h) < 0.6,
      );
    },
    // the automaton's light: on the floor only, wall to wall; platforms are safe
    inBeam(q, ang) {
      if (q.y > 1.2) return false;
      const dx = q.x;
      const dz = q.z - 99;
      const d = Math.hypot(dx, dz);
      const a = Math.atan2(dx, dz);
      if (d > beamReach(a) + 0.5 || d < 1.2) return false;
      let da = Math.abs(a - ang) % (Math.PI * 2);
      if (da > Math.PI) da = Math.PI * 2 - da;
      return da < 0.2 + 0.6 / d;
    },
    nearCard: (q) => Math.hypot(q.x, q.z - 104) < 2.6 && q.y < 2,
    inRoom1: (q) => q.z > 10.5 && q.z < 37.5,
    platformUnder(q) {
      // where a grapple release should land (the platform the ring hangs over)
      let best = null;
      let bd = 1e9;
      Object.values(rings).forEach((r) => {
        const d = Math.hypot(q.x - r.pos.x, q.z - r.pos.z);
        if (d < bd) {
          bd = d;
          best = r.land;
        }
      });
      return best;
    },
  };
})();
