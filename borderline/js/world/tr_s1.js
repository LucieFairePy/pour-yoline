// ♠ 2 · Premiers pas. A coop parkour course above a sea of clouds, in three parts:
//  1. Les dalles jumelles: two lanes; a ghost slab in one lane is solid only while the partner
//     stands on its paired plate in the other lane (relay, one step each).
//  2. Le pont-levis et la carte-bloc: the grapple kit crosses the chasm by a ring and lowers the
//     drawbridge for the other; then the double-jump kit carries a card-block under the only
//     notch in the wall's overhang, a notch only the grapple kit can see.
//  3. La vague: a wall of cards rolls in; crumbling slabs, a double gate, then the altar.
const TrS1 = (() => {
  const O = V3(-2100, 0, 2800);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- materials ----------
  const M = {};
  const mats = () => {
    M.slab = Tex.mat('marble', { color: '#8a7fa2', scale: 3, rough: 0.65 });
    M.plaza = Tex.mat('cobble', { color: '#8a809e', scale: 2.4, rough: 0.8 });
    M.under = Tex.mat('rock', { color: '#4a3d58', scale: 5 });
    M.stone = Tex.mat('stone', { color: '#8d82a0', scale: 3 });
    M.wall = Tex.mat('stone', { color: '#6f6584', scale: 2.5 });
    M.wood = Tex.mat('wood', { color: '#8a5a36', scale: 2 });
    // no env map here: a fully metallic gold renders as flat brown, so keep it half metal with a warm glow
    M.gold = new THREE.MeshStandardMaterial({
      color: '#c9a24a',
      metalness: 0.5,
      roughness: 0.34,
      emissive: '#5a3c12',
      emissiveIntensity: 0.22,
    });
    M.iron = Tex.mat('metal', { color: '#5d5868', scale: 1.5, metal: 0.7, rough: 0.6 });
    M.ghost = new THREE.MeshStandardMaterial({
      color: '#ffd0e0',
      emissive: '#ff5f8a',
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.16,
      roughness: 0.1,
      depthWrite: false,
    });
    M.ghostEdge = new THREE.LineBasicMaterial({
      color: new THREE.Color('#ff9ec4').multiplyScalar(1.1),
      transparent: true,
      opacity: 0.55,
      toneMapped: false,
    });
  };
  const glow = (c, k = 1.6) => LvKit.glow(c, k);
  const SUIT = { h: '♥', s: '♠', d: '♦', c: '♣' };
  const SUIT_COL = { h: '#ff5f8a', s: '#b9a6ff', d: '#ff9a3a', c: '#7ce0ff' };

  // a 1024 glyph decal (suit on a ring), readable from afar
  const decalCache = {};
  const decal = (suit, col) => {
    const k = suit + col;
    if (decalCache[k]) return decalCache[k];
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    g.strokeStyle = col;
    g.lineWidth = 34;
    g.beginPath();
    g.arc(512, 512, 440, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 10;
    g.beginPath();
    g.arc(512, 512, 380, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath();
      g.moveTo(512 + Math.cos(a) * 395, 512 + Math.sin(a) * 395);
      g.lineTo(512 + Math.cos(a) * 425, 512 + Math.sin(a) * 425);
      g.stroke();
    }
    g.fillStyle = col;
    Icons.draw(g, Icons.of(suit), 512, 512, 480);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    decalCache[k] = t;
    return t;
  };

  // ---------- building blocks ----------
  const trimGeo = new Map();
  const slab = (x, ytop, z, sx, sz, opt = {}) => {
    const th = opt.th || 0.7;
    const s = K.solid(x, ytop - th / 2, z, sx, th, sz, opt.mat || M.slab);
    // gold edging
    const key = sx + ',' + sz;
    if (!trimGeo.has(key)) {
      const gs = [];
      [
        [0, sz / 2, sx + 0.12, 0.12],
        [0, -sz / 2, sx + 0.12, 0.12],
        [sx / 2, 0, 0.12, sz + 0.12],
        [-sx / 2, 0, 0.12, sz + 0.12],
      ].forEach(([ox, oz, a, b]) => {
        const gg = new THREE.BoxGeometry(a, 0.1, b);
        gg.translate(ox, 0, oz);
        gs.push(gg);
      });
      trimGeo.set(key, mergeGeos(gs));
    }
    const trim = new THREE.Mesh(trimGeo.get(key), M.gold);
    trim.position.copy(P(x, ytop - 0.03, z));
    group.add(trim);
    // rocky keel under the slab
    if (!opt.noKeel) {
      const keel = new THREE.Mesh(keelGeo, M.under);
      keel.scale.set(sx * 0.42, Math.min(sx, sz) * 0.55 + 0.8, sz * 0.42);
      keel.position.copy(P(x, ytop - th, z));
      keel.rotation.y = (x * 7 + z * 3) % 6;
      group.add(keel);
      s.keel = keel;
    }
    s.trim = trim;
    return s;
  };
  let keelGeo = null;
  const mergeGeos = (list) => {
    // tiny merge for non-indexed copies (BufferGeometryUtils is not loaded)
    let n = 0;
    const parts = list.map((g) => {
      const ng = g.index ? g.toNonIndexed() : g;
      n += ng.attributes.position.count;
      return ng;
    });
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    let o = 0;
    parts.forEach((g) => {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      o += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return out;
  };

  // ---------- 1 · ghost slabs and their plates ----------
  // lane x: the grapple kit (dame) runs the left lane, the double-jump kit (valet) the right
  const LX = { dame: -4.6, valet: 4.6 };
  const ghosts = {};
  const pads = {};
  const links = [];
  // [ghost id, lane, z0, z1, activated by plate id]
  // 12.5 to 13.5 m: longer than any double jump (about 10-11 m), so the relay is the only way
  const GHOSTS = [
    ['gL1', 'dame', 11.5, 25, 'pR0'],
    ['gR1', 'valet', 11.5, 25, 'pL1'],
    ['gL2', 'dame', 28.5, 42, 'pR1'],
    ['gR2', 'valet', 28.5, 42, 'pL2'],
    ['gL3', 'dame', 45.5, 58, 'pR2'],
    ['gR3', 'valet', 45.5, 58, 'pL3'],
  ];
  // [plate id, lane, z, suit]
  const PADS = [
    ['pR0', 'valet', 9.7, 'h'],
    ['pL1', 'dame', 26.8, 's'],
    ['pR1', 'valet', 26.8, 'd'],
    ['pL2', 'dame', 43.8, 'c'],
    ['pR2', 'valet', 43.8, 'h'],
    ['pL3', 'dame', 60.5, 's'],
  ];
  const ghost = (id, lane, z0, z1, suitKey) => {
    const x = LX[lane];
    const sz = z1 - z0;
    const zc = (z0 + z1) / 2;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, sz), M.ghost);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), M.ghostEdge);
    const solidM = new THREE.Mesh(body.geometry, M.slab);
    solidM.visible = false;
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: decal(SUIT[suitKey], SUIT_COL[suitKey]),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.5,
      }),
    );
    top.position.y = 0.37;
    g.add(body, edges, solidM, top);
    g.position.copy(P(x, -0.35, zc));
    group.add(g);
    const b = K.collider(x, -0.35, zc, 3.2, 0.7, sz);
    b.on = false;
    ghosts[id] = { id, g, body, edges, solidM, top, b, k: 0, on: false, x, zc, sz, lane, col: SUIT_COL[suitKey] };
  };
  const pad = (id, lane, z, suitKey) => {
    const x = LX[lane];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.12, 40), M.gold);
    base.position.copy(P(x, 0.06, z));
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: decal(SUIT[suitKey], SUIT_COL[suitKey]),
        transparent: true,
        toneMapped: false,
      }),
    );
    face.position.copy(P(x, 0.125, z));
    face.material.color.setScalar(0.45);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.55, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(SUIT_COL[suitKey]).multiplyScalar(0.9),
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    halo.position.copy(P(x, 0.13, z));
    group.add(base, face, halo);
    pads[id] = { id, x, z, suitKey, face, halo, k: 0, pos: P(x, 0, z) };
  };
  // glowing arc from a plate to the slab it holds up, seen by both players
  const link = (padId, ghostId) => {
    const p = pads[padId];
    const gh = ghosts[ghostId];
    const a = P(p.x, 0.3, p.z);
    const b = P(gh.x, 0.4, gh.zc);
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 5 + a.distanceTo(b) * 0.25;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(gh.col).multiplyScalar(1.1),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.06, 6, false), mat);
    group.add(tube);
    links.push({ padId, ghostId, curve, tube, mat, k: 0, t: Math.random() });
  };

  // ---------- 2 · chasm, drawbridge, lever, card-block, overhang wall ----------
  let bridge = null;
  let lever = null;
  let winch = null;
  let veil = null;
  let block = null;
  let ringA = null;
  let ringB = null;
  const chalk = [];
  let illusion = null;
  let illusionCap = null;
  const NOTCH_X = 3.4;
  const WALL_Z = 100;
  const WALL_H = 4.0;

  // ---------- 3 · crumbling slabs, gate, altar, wave ----------
  const tiles = [];
  // [x, top, z, sx, sz] in order along the run (section 3 starts on the ledge at y 4)
  const TILES = [
    [0, 4, 116, 3, 3],
    [2.6, 4.2, 120.5, 2.6, 2.6],
    [-0.4, 4.6, 125, 2.6, 2.6],
    [-2.8, 5.0, 130, 2.6, 2.6],
    [0, 5.4, 135, 3, 2.6],
    // the wide gap: double jump, or the ring for the grapple kit
    [0.6, 5.4, 141.5, 3, 3],
    [3.2, 5.8, 146.5, 2.6, 2.6],
    [0.6, 6.2, 151.5, 2.6, 2.6],
    [-2.2, 6.2, 156.5, 2.6, 2.6],
    [0, 6.2, 161.5, 3.2, 3],
  ];
  let gate = null;
  const gatePads = {};
  let altarCard = null;
  let altarHeart = null;
  const altarPads = {};
  let wave = null;
  let screen = null;
  let screen2 = null;
  let rumbleT = 0;
  let burstDone = false;
  const drift = [];
  let sun = null;

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    mats();
    keelGeo = new THREE.ConeGeometry(1, 1, 7, 1).rotateX(Math.PI).translate(0, -0.5, 0);

    // start plaza
    slab(0, 0, 0, 18, 16, { th: 1.2, mat: M.plaza });
    // steps of the start: a tiny warm-up, two little ledges to hop on
    slab(-6, 0.9, -5, 3, 3, { noKeel: true });
    slab(6, 1.6, -5, 3, 3, { noKeel: true });
    // entrance arch over the start of the lanes, with the ♠ 2
    [-8.2, 8.2].forEach((x) => {
      K.solid(x, 3.2, 7, 1.1, 6.4, 1.1, M.stone);
      K.deco(new THREE.BoxGeometry(1.4, 0.3, 1.4), M.gold, x, 0.15, 7);
      K.deco(new THREE.BoxGeometry(1.4, 0.3, 1.4), M.gold, x, 6.45, 7);
    });
    K.deco(new THREE.BoxGeometry(17.5, 0.9, 1.1), M.stone, 0, 7, 7);
    K.deco(new THREE.BoxGeometry(17.7, 0.12, 1.3), M.gold, 0, 7.5, 7);
    const archCard = LvKit.trialCard('s1', false);
    archCard.visible = true;
    archCard.material.color.setScalar(0.72);
    archCard.children.forEach((h) => (h.visible = false));
    archCard.position.copy(P(0, 9.4, 7));
    archCard.scale.setScalar(1.6);
    group.add(archCard);
    drift.push({ m: archCard, base: archCard.position.clone(), ph: 0, arch: true });
    // the two lanes
    ['dame', 'valet'].forEach((lane) => {
      const x = LX[lane];
      [
        [8, 11.5],
        [25, 28.5],
        [42, 45.5],
      ].forEach(([z0, z1]) => slab(x, 0, (z0 + z1) / 2, 3.2, z1 - z0));
    });
    GHOSTS.forEach(([id, lane, z0, z1, pid]) => {
      const pk = PADS.find((p) => p[0] === pid)[3];
      ghost(id, lane, z0, z1, pk);
    });
    PADS.forEach(([id, lane, z, s]) => pad(id, lane, z, s));
    GHOSTS.forEach(([gid, , , , pid]) => link(pid, gid));
    // little lanterns along the lanes
    for (let z = 9; z < 56; z += 4)
      ['dame', 'valet'].forEach((lane) => {
        const x = LX[lane] + (lane === 'dame' ? -1.42 : 1.42);
        if (GHOSTS.some(([, l, z0, z1]) => l === lane && z > z0 - 0.5 && z < z1 + 0.5)) return;
        const post = K.deco(new THREE.CylinderGeometry(0.05, 0.07, 1.2, 8), M.gold, x, 0.6, z);
        const bulb = K.deco(new THREE.SphereGeometry(0.13, 12, 8), glow('#ffcf8a', 1.4), x, 1.25, z);
        post.userData.k = bulb;
        K.collider(x, 0.6, z, 0.16, 1.2, 0.16);
      });

    // the veil between the lanes: a shimmering curtain over the void, too tall to jump, so
    // nobody hops across to press the other lane's plates alone (a relay needs two)
    const veilTex = LvKit.tex(256, 64, (g) => {
      g.clearRect(0, 0, 256, 64);
      for (let i = 0; i < 256; i += 8) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.37));
        g.fillStyle = 'rgba(200,170,255,' + (0.18 * a).toFixed(3) + ')';
        g.fillRect(i, 0, 2, 64);
      }
      const gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, 'rgba(0,0,0,0.9)');
      gr.addColorStop(0.3, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 64);
    }, 6, 1);
    veil = K.deco(
      new THREE.PlaneGeometry(50.8, 9).rotateY(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: veilTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      0,
      2.5,
      33,
    );
    veil.material.color.set('#b9a6ff');
    K.collider(0, 2.5, 33, 0.3, 9, 50.8, { tag: 'nocam' });
    // plaza 2 (both lanes meet)
    slab(0, 0, 64, 18, 12, { th: 1.2, mat: M.plaza });
    // chasm far side
    slab(0, 0, 93, 18, 14, { th: 1.2, mat: M.plaza });
    // drawbridge, hinged at the far edge (z 86), raised at the start
    bridge = new THREE.Group();
    bridge.position.copy(P(0, 0, 86));
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4, 0.45, 16.2), M.wood);
    plank.position.set(0, -0.22, -8.1);
    bridge.add(plank);
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.12, 0.18), M.iron);
      s.position.set(0, 0.02, -0.9 - i * 1.8);
      bridge.add(s);
    }
    bridge.rotation.x = -Math.PI / 2;
    group.add(bridge);
    const bridgeCol = K.collider(0, -0.22, 78, 4, 0.45, 16.2);
    bridgeCol.on = false;
    bridge.userData = { col: bridgeCol, k: 0 };
    // towers + chains
    [-2.6, 2.6].forEach((x) => {
      K.solid(x, 2.2, 87, 0.9, 4.4, 0.9, M.stone);
      K.deco(new THREE.ConeGeometry(0.75, 1.2, 4), M.gold, x, 5, 87).rotation.y = Math.PI / 4;
    });
    const chainMat = M.iron;
    bridge.userData.chains = [-1.9, 1.9].map((x) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), chainMat);
      group.add(c);
      return { m: c, x };
    });
    // the grapple ring over the chasm
    ringA = K.deco(new THREE.TorusGeometry(0.7, 0.09, 12, 40), glow('#ff5f8a', 2.2), 0, 6.6, 77);
    // lever on the far side
    lever = new THREE.Group();
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), M.iron);
    lb.position.y = 0.25;
    const arm = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), M.gold);
    stick.position.y = 0.6;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), glow('#ff5f8a', 1.6));
    knob.position.y = 1.2;
    arm.add(stick, knob);
    arm.position.y = 0.5;
    arm.rotation.x = 0.6;
    lever.add(lb, arm);
    lever.position.copy(P(5.5, 0, 89.5));
    group.add(lever);
    K.collider(5.5, 0.25, 89.5, 0.9, 0.5, 0.7);
    lever.userData = { arm, knob, k: 0 };
    // the winch on the near side: the drawbridge comes down only while it is cranked AND the
    // lever on the far side is pulled (one player each side)
    winch = new THREE.Group();
    [-0.7, 0.7].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.3, 0.5), M.iron);
      post.position.set(x, 0.65, 0);
      winch.add(post);
    });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 20).rotateZ(Math.PI / 2), M.wood);
    drum.position.y = 1.0;
    const crank = new THREE.Group();
    const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), M.gold);
    crankArm.position.y = 0.3;
    const crankKnob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glow('#ff5f8a', 1.6));
    crankKnob.position.set(0.12, 0.62, 0);
    crank.add(crankArm, crankKnob);
    crank.position.set(0.86, 1.0, 0);
    drum.add(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.04, 6, 24).rotateY(Math.PI / 2), M.iron));
    winch.add(drum, crank);
    winch.position.copy(P(-5.5, 0, 68.4));
    group.add(winch);
    K.collider(-5.5, 0.65, 68.4, 1.6, 1.3, 0.6);
    winch.userData = { drum, crank, knob: crankKnob, k: 0 };

    // the wall: a 5.6 m parapet nobody can climb, with one notch down to 4 m. The double-jump
    // kit sees an illusion of wall over the notch; the grapple kit sees through it.
    const PH = 5.6;
    const nl = NOTCH_X - 1.7;
    const nr = NOTCH_X + 1.7;
    K.solid((-9 + nl) / 2, PH / 2, WALL_Z + 1.5, nl + 9, PH, 3, M.wall);
    K.solid((nr + 9) / 2, PH / 2, WALL_Z + 1.5, 9 - nr, PH, 3, M.wall);
    K.solid(NOTCH_X, WALL_H / 2, WALL_Z + 1.5, nr - nl, WALL_H, 3, M.wall);
    // plateau behind the parapet
    K.solid(0, WALL_H / 2, WALL_Z + 7.5, 18, WALL_H, 9, M.wall);
    // thin gold beading on both edges of the parapet
    [WALL_Z + 0.08, WALL_Z + 2.92].forEach((z) => {
      K.deco(new THREE.BoxGeometry(nl + 9, 0.1, 0.16), M.gold, (-9 + nl) / 2, PH + 0.05, z);
      K.deco(new THREE.BoxGeometry(9 - nr, 0.1, 0.16), M.gold, (nr + 9) / 2, PH + 0.05, z);
    });
    illusion = K.deco(new THREE.BoxGeometry(nr - nl, PH - WALL_H, 3), M.wall, NOTCH_X, (PH + WALL_H) / 2, WALL_Z + 1.5);
    illusionCap = K.deco(new THREE.BoxGeometry(nr - nl, 0.1, 0.16), M.gold, NOTCH_X, PH + 0.05, WALL_Z + 0.08);
    // chalk marks only the grapple kit can see: a heart and arrows under the notch
    const chalkTex = LvKit.tex(512, 512, (g) => {
      g.clearRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(255,240,250,0.95)';
      g.fillStyle = 'rgba(255,240,250,0.95)';
      g.lineWidth = 14;
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const [hx, hy] = Heart.curve((i / 64) * Math.PI * 2);
        const px = 256 + hx * 8;
        const py = 210 - (hy - 2.5) * 8;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
      [
        [110, 420],
        [256, 460],
        [402, 420],
      ].forEach(([x, y]) => {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(256, 340);
        g.stroke();
      });
      g.font = 'bold 54px Georgia';
      g.textAlign = 'center';
      g.fillText('ICI', 256, 210);
    });
    const ch = K.deco(
      new THREE.PlaneGeometry(2.6, 2.6).rotateY(Math.PI),
      new THREE.MeshBasicMaterial({ map: chalkTex, transparent: true, depthWrite: false, toneMapped: false }),
      NOTCH_X,
      2.0,
      WALL_Z - 0.02,
    );
    ch.material.color.setScalar(0.8);
    chalk.push(ch);
    const floorMark = K.deco(
      new THREE.RingGeometry(0.75, 0.9, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#c8a0b8', transparent: true, opacity: 0.45, depthWrite: false }),
      NOTCH_X,
      0.02,
      WALL_Z - 1.0,
    );
    chalk.push(floorMark);
    // the card-block (a big crate printed with the deck back)
    const bm = new THREE.MeshStandardMaterial({ map: Cards.backTexture(), roughness: 0.55, metalness: 0.05 });
    const side = new THREE.MeshStandardMaterial({ color: '#2b0c20', roughness: 0.6 });
    block = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), [side, side, bm, bm, bm, bm]);
    const bEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(block.geometry),
      new THREE.LineBasicMaterial({ color: '#d4ab55' }),
    );
    block.add(bEdge);
    group.add(block);
    block.userData = { col: Phys.box(0, -100, 0, 1.6, 1.6, 1.6, { dyn: true }), cur: V3(), want: V3(), held: null };
    // ledge on top of the wall (part of the wall solid, y = 4)
    // section 3: crumbling slabs
    TILES.forEach(([x, top, z, sx, sz], i) => {
      const s = slab(x, top, z, sx, sz, { th: 0.6 });
      tiles.push({ i, s, x, top, z, sx, sz, base: s.m.position.clone(), k: 0, fall: 0 });
    });
    ringB = K.deco(new THREE.TorusGeometry(0.7, 0.09, 12, 40), glow('#ff5f8a', 2.2), 0, 9.6, 138.6);
    // the double gate
    slab(0, 6.2, 169, 14, 10, { th: 1 });
    [-6.2, 6.2].forEach((x) => K.solid(x, 9.7, 172.5, 1.2, 7, 1.2, M.stone));
    // the pillars stand flush with the edges, and the gate's frame goes on over the void (no
    // walking round a pillar along the rim, nor hopping round it through the air)
    [-1, 1].forEach((sd) => {
      K.solid(sd * 7.05, 9.7, 172.5, 0.7, 7, 1.0, M.stone);
      K.collider(sd * 12.5, 9, 172.5, 11, 24, 1.2, { tag: 'nocam' });
    });
    K.solid(0, 13.4, 172.5, 13.6, 0.8, 1.2, M.stone);
    gate = new THREE.Group();
    for (let i = -5; i <= 5; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.6, 8), M.iron);
      bar.position.set(i * 0.5, 0, 0);
      gate.add(bar);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), M.gold);
      tip.position.set(i * 0.5, -3.4, 0);
      tip.rotation.x = Math.PI;
      gate.add(tip);
    }
    gate.position.copy(P(0, 9.5, 172.5));
    group.add(gate);
    gate.userData = { col: K.collider(0, 9.5, 172.5, 11.2, 6.6, 0.5), k: 0 };
    [
      ['gh', -4, 'h'],
      ['gs', 4, 's'],
    ].forEach(([id, x, s]) => {
      const pd = { x, z: 167.5, suitKey: s };
      const base = K.deco(new THREE.CylinderGeometry(1, 1.1, 0.12, 40), M.gold, x, 6.26, 167.5);
      const face = K.deco(
        new THREE.CircleGeometry(0.9, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: decal(SUIT[s], SUIT_COL[s]), transparent: true, toneMapped: false }),
        x,
        6.33,
        167.5,
      );
      face.material.color.setScalar(0.45);
      gatePads[id] = { ...pd, base, face, k: 0 };
    });
    // path to the altar
    slab(0, 6.2, 180, 4, 6, { th: 0.8 });
    slab(0, 6.2, 186, 3.2, 6, { th: 0.8 });
    // the altar: a round terrace (union of boxes) with two hand plates and the card
    const altarY = 6.2;
    const AZ = 196;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.2, 1.2, 56), M.slab);
    disc.position.copy(P(0, altarY - 0.6, AZ));
    group.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.08, 8, 80).rotateX(Math.PI / 2), M.gold);
    ring.position.copy(P(0, altarY + 0.01, AZ));
    group.add(ring);
    [
      [13.6, 5.2],
      [12.6, 8.4],
      [11, 10.4],
      [9.6, 11.6],
    ].forEach(([a, b]) => {
      K.collider(0, altarY - 0.6, AZ, a, 1.2, b);
      K.collider(0, altarY - 0.6, AZ, b, 1.2, a);
    });
    const keel = new THREE.Mesh(keelGeo, M.under);
    keel.scale.set(6, 9, 6);
    keel.position.copy(P(0, altarY - 1.2, AZ));
    group.add(keel);
    // central pedestal
    K.solid(0, altarY + 0.55, AZ + 2.5, 1.2, 1.1, 1.2, M.stone);
    K.deco(new THREE.BoxGeometry(1.4, 0.12, 1.4), M.gold, 0, altarY + 1.16, AZ + 2.5);
    altarCard = LvKit.trialCard('s1', false);
    altarCard.position.copy(P(0, altarY + 2.6, AZ + 2.5));
    group.add(altarCard);
    altarCard.visible = true;
    altarCard.scale.setScalar(0.85);
    // built at the voyage scale and shrunk: its depth spread is not scaled by k
    altarHeart = Heart.galaxy(9000, 4, 21);
    altarHeart.group.scale.setScalar(0.085);
    altarHeart.group.position.copy(P(0, altarY + 7, AZ + 4));
    altarHeart.core.material.opacity = 0.25;
    group.add(altarHeart.group);
    [
      ['ah', -2.4, 'h'],
      ['as', 2.4, 's'],
    ].forEach(([id, x, s]) => {
      const base = K.deco(new THREE.CylinderGeometry(1, 1.1, 0.12, 40), M.gold, x, altarY + 0.06, AZ - 1);
      const face = K.deco(
        new THREE.CircleGeometry(0.9, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: decal(SUIT[s], SUIT_COL[s]), transparent: true, toneMapped: false }),
        x,
        altarY + 0.13,
        AZ - 1,
      );
      face.material.color.setScalar(0.45);
      altarPads[id] = { x, z: AZ - 1, base, face, k: 0 };
    });

    // the wave of cards
    const N = 900;
    const wm = new THREE.MeshBasicMaterial({
      map: Cards.backTexture(),
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
    });
    wm.color.setScalar(0.62);
    const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.62, 0.87), wm, N);
    inst.frustumCulled = false;
    const seeds = [];
    const rr = rng(77);
    for (let i = 0; i < N; i++)
      seeds.push({
        x: (rr() - 0.5) * 30,
        y: -8 + rr() * 26,
        z: rr() * 7,
        a: rr() * 6.28,
        s: 0.6 + rr() * 1.6,
        w: 0.5 + rr() * 2,
      });
    // a soft magenta haze behind the cards (additive, so it never turns into a flat sheet)
    const fogTex = LvKit.tex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,90,160,0.55)');
      gr.addColorStop(0.6, 'rgba(160,40,120,0.22)');
      gr.addColorStop(1, 'rgba(60,10,50,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
    });
    fogTex.wrapS = fogTex.wrapT = THREE.ClampToEdgeWrapping;
    const fog = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 34),
      new THREE.MeshBasicMaterial({
        map: fogTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    fog.material.color.setScalar(0.22);
    wave = new THREE.Group();
    wave.add(inst, fog);
    fog.position.set(0, 4, -6);
    wave.position.copy(P(0, 0, 104));
    wave.visible = false;
    group.add(wave);
    wave.userData = { inst, seeds, dummy: new THREE.Object3D(), z: 104 };

    // screen floating over the far end of the lanes
    screen = makeScreen(14, 7, 1024);
    screen.mesh.position.copy(P(0, 9, 66));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    // a second screen over the gate, for the run
    screen2 = makeScreen(10, 5, 1024);
    screen2.mesh.position.copy(P(0, 17.5, 173.2));
    screen2.mesh.rotation.y = Math.PI;
    group.add(screen2.mesh);

    // set dressing: drifting giant spade cards and far floating rocks
    const ranks = ['A', '2', '3', '7', '10', 'V', 'D', 'R'];
    for (let i = 0; i < 14; i++) {
      const c = LvKit.card(ranks[i % ranks.length], '♠', false);
      c.visible = true;
      c.material.color.setScalar(0.55);
      c.children.forEach((h) => (h.visible = false));
      c.scale.setScalar(3 + (i % 3));
      const side2 = i % 2 ? 1 : -1;
      const base = P(side2 * (22 + (i * 7) % 18), 6 + (i * 5) % 16, -10 + i * 15);
      c.position.copy(base);
      group.add(c);
      drift.push({ m: c, base, ph: i * 1.7 });
    }
    for (let i = 0; i < 24; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), M.under);
      const s = 1.5 + (i % 5);
      r.scale.set(s, s * 0.7, s);
      const side2 = i % 2 ? 1 : -1;
      r.position.copy(P(side2 * (30 + (i * 11) % 40), -6 + (i * 7) % 14, -20 + i * 10));
      group.add(r);
      drift.push({ m: r, base: r.position.clone(), ph: i, rock: true });
    }
    // sea of clouds far below
    const cloudTex = LvKit.tex(1024, 1024, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 1024, 1024);
      const r = rng(5);
      for (let i = 0; i < 260; i++) {
        const x = r() * 1024;
        const y = r() * 1024;
        const rad = 40 + r() * 140;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(255,190,225,0.07)');
        gr.addColorStop(1, 'rgba(255,190,225,0)');
        g.fillStyle = gr;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }, 3, 3);
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0x9a6aa8,
      }),
    );
    clouds.position.copy(P(0, -30, 100));
    group.add(clouds);
    drift.push({ m: clouds, clouds: true });
    sun = LvKit.light(group, P(0, 30, 60), '#ffc8e0', 0.7, 160);
    LvKit.light(group, P(0, 16, 170), '#ff9ec4', 1.0, 90);
  };

  // ---------- queries ----------
  const rel = K.rel;
  const near2 = (q, x, z, r) => Math.hypot(q.x - x, q.z - z) < r;
  const onPad = (q, id) => {
    const p = pads[id];
    return near2(q, p.x, p.z, 1.3) && Math.abs(q.y) < 0.6;
  };
  const onGhost = (q, id) => {
    const g = ghosts[id];
    return Math.abs(q.x - g.x) < 1.8 && Math.abs(q.z - g.zc) < g.sz / 2 + 0.3 && Math.abs(q.y) < 0.8;
  };
  const tileUnder = (q) =>
    tiles.find(
      (t) => Math.abs(q.x - t.x) < t.sx / 2 + 0.2 && Math.abs(q.z - t.z) < t.sz / 2 + 0.2 && Math.abs(q.y - t.top) < 0.5,
    );

  // ---------- per frame ----------
  const update = (dt, t, x, role, cam) => {
    if (!built) return;
    screen.update(dt, t);
    screen2.update(dt, t);
    // ghosts
    Object.values(ghosts).forEach((g) => {
      const on = (x.on || []).includes(g.id);
      if (on !== g.on) {
        g.on = on;
        g.b.on = on;
        Sound.play(on ? 'tile' : 'creak', P(g.x, 0, g.zc));
        Fx.burst(P(g.x, 0.4, g.zc), g.col, on ? 40 : 18, 3, 0.6, 0);
      }
      // a slab about to vanish flickers (the host gives a grace delay)
      const warn = on && (x.warn || []).includes(g.id);
      g.k = damp(g.k, on ? 1 : 0, 10, dt);
      g.solidM.visible = g.k > 0.5 && !(warn && Math.sin(t * 30) > 0.3);
      g.body.visible = !g.solidM.visible;
      g.edges.visible = g.k < 0.5;
      g.edges.material.opacity = 0.25 + 0.5 * (1 - g.k) * (0.6 + 0.4 * Math.sin(t * 3 + g.zc));
      g.top.material.opacity = 0.25 + g.k * 0.55;
    });
    Object.values(pads).forEach((p) => {
      const on = (x.pressed || []).includes(p.id);
      p.k = damp(p.k, on ? 1 : 0, 10, dt);
      p.face.material.color.setScalar(0.45 + p.k * 0.35);
      p.halo.material.opacity = p.k * (0.32 + 0.12 * Math.sin(t * 6));
    });
    links.forEach((l) => {
      const on = (x.pressed || []).includes(l.padId);
      l.k = damp(l.k, on ? 1 : 0, 6, dt);
      l.mat.opacity = l.k * (0.45 + 0.2 * Math.sin(t * 5 + l.t * 9));
      l.tube.visible = l.k > 0.01;
      if (on && Math.random() < dt * 8) {
        l.t = (l.t + 0.07) % 1;
        Fx.burst(l.curve.getPoint(Math.random()), ghosts[l.ghostId].col, 2, 0.6, 0.5, 0);
      }
    });
    // drawbridge
    const bk = damp(bridge.userData.k, x.bridge ? 1 : 0, 1.6, dt);
    if (x.bridge && bridge.userData.k < 0.98 && bk >= 0.98) {
      Sound.play('thud', P(0, 0, 80));
      Fx.burst(P(0, 0.2, 72), '#ffcf8a', 60, 4, 0.8, -4);
    }
    bridge.userData.k = bk;
    bridge.rotation.x = -Math.PI / 2 * (1 - bk);
    bridge.userData.col.on = bk > 0.97;
    bridge.userData.chains.forEach((c) => {
      // from the tower top to the free end of the plank
      const a = P(c.x * 1.37, 4.6, 87);
      const end = V3(c.x, 0, -16).applyAxisAngle(V3(1, 0, 0), bridge.rotation.x).add(P(0, 0, 86));
      const mid = a.clone().lerp(end, 0.5);
      c.m.position.copy(mid);
      c.m.scale.y = a.distanceTo(end);
      c.m.lookAt(end);
      c.m.rotateX(Math.PI / 2);
    });
    const lk = damp(lever.userData.k, x.bridge ? 1 : x.leverHold || 0, 8, dt);
    lever.userData.k = lk;
    lever.userData.arm.rotation.x = 0.6 - lk * 1.2;
    lever.userData.knob.material.color.set(x.bridge ? '#7cf0c8' : '#ff5f8a').multiplyScalar(1.6);
    // rings
    const wk = damp(winch.userData.k, x.winch && !x.bridge ? 1 : 0, 8, dt);
    winch.userData.k = wk;
    winch.userData.drum.rotation.x -= wk * dt * 2.2;
    winch.userData.crank.rotation.x = winch.userData.drum.rotation.x;
    winch.userData.knob.material.color.set(x.bridge ? '#7cf0c8' : x.winch ? '#ffcf8a' : '#ff5f8a').multiplyScalar(1.6);
    veil.visible = x.stage === 1;
    veil.material.opacity = 0.7 + 0.3 * Math.sin(t * 1.3);
    veil.material.map.offset.x = t * 0.01;
    const showA = role === 'dame' && x.stage === 2 && !x.bridge;
    ringA.visible = showA || (x.stage === 2 && role !== 'dame' && !x.bridge);
    ringA.material.color.set(role === 'dame' ? '#ff5f8a' : '#7a4a5a').multiplyScalar(role === 'dame' ? 2.2 : 0.8);
    ringA.rotation.y = t * 1.5;
    ringB.visible = x.stage === 4;
    ringB.rotation.y = t * 1.5;
    ringB.material.color.set(role === 'dame' ? '#ff5f8a' : '#7a4a5a').multiplyScalar(role === 'dame' ? 2.2 : 0.8);
    // chalk: the grapple kit sees where the block must go
    chalk.forEach((c) => (c.visible = role === 'dame' && x.stage === 3));
    illusion.visible = illusionCap.visible = role !== 'dame' && x.stage <= 3;
    // block
    const bd = block.userData;
    const bx = x.block || { p: [-5, 0.8, 95], c: null };
    if (bx.c) {
      const holder = bx.c === role ? Player.body.p : Remote.pos;
      bd.want.set(holder.x, holder.y + 2.45, holder.z);
      bd.cur.lerp(bd.want, 1 - Math.exp(-18 * dt));
      bd.col.on = false;
      block.rotation.y += dt * 0.6;
    } else {
      bd.want.set(...bx.p).add(O);
      if (bd.cur.lengthSq() === 0 || bd.cur.distanceTo(bd.want) > 30) bd.cur.copy(bd.want);
      bd.cur.lerp(bd.want, 1 - Math.exp(-14 * dt));
      block.rotation.y = damp(block.rotation.y, Math.round(block.rotation.y / (Math.PI / 2)) * (Math.PI / 2), 8, dt);
      const w = bd.want;
      bd.col.min = [w.x - 0.8, w.y - 0.8, w.z - 0.8];
      bd.col.max = [w.x + 0.8, w.y + 0.8, w.z + 0.8];
      bd.col.on = true;
    }
    block.position.copy(bd.cur);
    // well placed: a soft sparkle under the notch, on both screens
    if (role === 'dame' && !bx.c && x.stage === 3 && Math.abs(bx.p[0] - NOTCH_X) < 0.9 && bx.p[2] > WALL_Z - 1.9 && Math.random() < dt * 6)
      Fx.burst(P(NOTCH_X + (Math.random() - 0.5) * 1.4, 1.7, WALL_Z - 0.9), '#ffcf8a', 3, 1, 0.6, 1);
    // tiles
    tiles.forEach((tl) => {
      const f = (x.fell || []).find((e) => e[0] === tl.i);
      const want = f ? 1 : 0;
      if (want && !tl.k) Sound.play('creak', tl.base);
      tl.k = want ? tl.k + dt : 0;
      const shake = tl.k > 0 && tl.k < 0.7 ? Math.sin(t * 60) * 0.06 : 0;
      const drop = tl.k > 0.7 ? Math.pow(tl.k - 0.7, 2) * 18 : 0;
      tl.s.m.position.set(tl.base.x + shake, tl.base.y - drop, tl.base.z);
      tl.s.trim.position.set(tl.base.x + shake, tl.base.y + 0.3 - 0.03 - drop, tl.base.z);
      if (tl.s.keel) tl.s.keel.position.set(tl.base.x + shake, tl.base.y - 0.3 - drop, tl.base.z);
      if (tl.k > 0.7 && tl.s.b.on) {
        tl.s.b.on = false;
        Fx.burst(tl.base.clone(), '#b9a6ff', 30, 3, 0.7, -6);
      }
      if (!want) tl.s.b.on = true;
      tl.s.m.visible = drop < 40;
    });
    // gate
    const gk = damp(gate.userData.k, x.gate ? 1 : 0, 2.2, dt);
    if (x.gate && gate.userData.k < 0.05 && gk >= 0.05) Sound.play('door', P(0, 7, 172));
    gate.userData.k = gk;
    gate.position.y = O.y + 9.5 + gk * 6.8;
    gate.userData.col.on = gk < 0.6;
    Object.entries(gatePads).forEach(([id, p]) => {
      p.k = damp(p.k, (x.gp || []).includes(id) ? 1 : 0, 10, dt);
      p.face.material.color.setScalar(0.45 + p.k * 0.35);
    });
    Object.entries(altarPads).forEach(([id, p]) => {
      p.k = damp(p.k, (x.ap || []).includes(id) ? 1 : 0, 10, dt);
      p.face.material.color.setScalar(0.45 + p.k * 0.35);
    });
    altarCard.rotation.y = t * 0.8;
    altarCard.position.y = O.y + 6.2 + 2.6 + Math.sin(t * 1.6) * 0.15 + (x.won ? Math.min(3, x.wonT || 0) : 0);
    const U = altarHeart.U;
    U.uTime.value = t;
    U.uPx.value = R.renderer.getPixelRatio() * 0.09;
    U.uForm.value = 1;
    U.uFade.value = damp(U.uFade.value, x.won ? 0 : x.stage >= 4 ? 0.35 : 0.7, 1.5, dt);
    U.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.4)), 10) * (x.won ? 1 : 0.4);
    // wave
    const wd = wave.userData;
    wave.visible = x.stage === 4 && !x.won;
    if (wave.visible) {
      // the host streams the wave position; clients run it forward between updates
      const target = x.wz != null ? x.wz : 104;
      wd.z = x.wrun ? Math.max(wd.z + (x.wspd || 0) * dt, target - 2) : target;
      if (Math.abs(wd.z - target) > 3) wd.z = target;
      wave.position.z = O.z + wd.z;
      wd.seeds.forEach((s, i) => {
        const a = s.a + t * s.w;
        wd.dummy.position.set(s.x + Math.sin(a) * 0.8, s.y + Math.cos(a * 0.7) * 1.2, s.z - Math.sin(t * 0.8 + i) * 1.5);
        wd.dummy.rotation.set(a, a * 0.6, t * s.w * 0.5);
        wd.dummy.scale.setScalar(s.s);
        wd.dummy.updateMatrix();
        wd.inst.setMatrixAt(i, wd.dummy.matrix);
      });
      wd.inst.instanceMatrix.needsUpdate = true;
      // a rumble that grows as it gets closer to you
      const me = Player.body.p.z - O.z;
      const d = me - wd.z;
      rumbleT -= dt;
      if (x.wrun && rumbleT <= 0 && d < 40) {
        rumbleT = 0.35 + clamp(d / 40, 0, 1) * 0.9;
        Sound.play('rumble', clamp(1 - d / 30, 0.15, 1));
        if (d < 8) Cam.shake = Math.max(Cam.shake, 0.12 * (1 - d / 8));
      }
    } else wd.z = x.wz != null ? x.wz : 104;
    // the win: the wave bursts into confetti
    if (x.won && !burstDone) {
      burstDone = true;
      for (let i = 0; i < 6; i++)
        Fx.burst(P((Math.random() - 0.5) * 20, 2 + Math.random() * 10, wd.z), i % 2 ? '#ff5f8a' : '#ffcf8a', 120, 9, 1.6, -4);
    }
    if (!x.won) burstDone = false;
    // set dressing
    drift.forEach((d) => {
      if (d.clouds) {
        d.m.material.map.offset.x = t * 0.004;
        d.m.material.map.offset.y = t * 0.002;
        return;
      }
      if (d.arch) {
        d.m.position.y = d.base.y + Math.sin(t * 1.2) * 0.15;
        d.m.rotation.y = Math.sin(t * 0.5) * 0.35;
        return;
      }
      d.m.position.y = d.base.y + Math.sin(t * 0.4 + d.ph) * (d.rock ? 0.6 : 1.4);
      d.m.rotation.y = d.rock ? t * 0.05 + d.ph : Math.sin(t * 0.2 + d.ph) * 0.6;
    });
  };

  return {
    O,
    P,
    build,
    update,
    rel,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get screen2() {
      return screen2;
    },
    PADS,
    GHOSTS,
    TILES,
    NOTCH_X,
    WALL_Z,
    WALL_H,
    pads,
    ghosts,
    gatePads,
    altarPads,
    onPad,
    onGhost,
    tileUnder,
    ringA: () => P(0, 6.6, 77),
    ringB: () => P(0, 9.6, 138.6),
    blockPos: () => block.position,
    nearLever: (q) => near2(q, 5.5, 89.5, 2) && Math.abs(q.y) < 1.5,
    nearWinch: (q) => near2(q, -5.5, 68.4, 2) && Math.abs(q.y) < 1.5,
    onGatePad: (q, id) => near2(q, gatePads[id].x, gatePads[id].z, 1.1) && Math.abs(q.y - 6.2) < 0.7,
    onAltarPad: (q, id) => near2(q, altarPads[id].x, altarPads[id].z, 1.1) && Math.abs(q.y - 6.2) < 0.7,
    endLanes: (q) => q.z > 58 && q.z < 70 && Math.abs(q.y) < 1.5,
    farSide: (q) => q.z > 86.5 && q.z < 100 && Math.abs(q.y) < 1.5,
    onLedge: (q) => q.z > WALL_Z + 3 && q.z < 112 && Math.abs(q.y - WALL_H) < 0.8,
    // block over the notch, against the wall: the climb works
    blockOk: (p) => Math.abs(p[0] - NOTCH_X) < 0.9 && p[2] > WALL_Z - 1.9 && p[2] < WALL_Z,
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) return P(LX[who], 0, 3);
      if (stage === 2) return P(s * 2.5, 0, 62);
      if (stage === 3) return P(s * 2.5, 0, 92);
      return P(s * 2.5, WALL_H, 106);
    },
  };
})();
