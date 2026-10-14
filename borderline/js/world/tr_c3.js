// ♣ 5 · La Bascule. Floating stone islands above a sea of clouds, then a storm. Everything you
// stand on tilts with your weight. Course along +z (relative to O):
//   atrium (z -12..11.6) · seesaw A over the void (12..26) · island B with the perch (26.4..40.2)
//   · the catapult seesaw B (40.6..54.6) · cliff C (55..72, top 10) · the tilting maze table
//   (74.4..92.4) · platform D · three hanging bridges in the storm (104..158) · the final
//   tower F with the balance dais (158..178).
// Moving surfaces have no static collider: each client puts one small dynamic box under its
// own player at the exact surface height (see surfaces()), so riding a tilting plank is smooth
// and nobody falls through.
const TrC3 = (() => {
  const O = V3(-2100, 0, 5600);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const glow = LvKit.glow;

  // ---------- layout ----------
  const PLANK_W = 3.4;
  const PLANK_L = 14;
  const TMAX = 0.3;
  const A = { z: 19, y: 1.0 }; // seesaw A pivot
  const B = { z: 47.6, y: 2.8 }; // seesaw B pivot (the catapult)
  const ISLE = 2.9; // island B top
  const PERCH = 8.4;
  const CLIFF = 10.0;
  const TBL = { z: 83.4, y: 10.0, half: 9, max: 0.12 };
  const BR = { y: 10.0, half: 2.3, max: 0.35, spans: [111.2, 131.2, 151.2], len: 13.6 };
  const DAIS = { z: 168, y: 10.6, r: 4.8, max: 0.12 };
  const RING = P(2.4, 11.2, 38.6);
  const RING_LAND = P(2.4, PERCH, 38.8);
  // the lift against the cliff face: hoisted from the top by the winch
  const LIFT = { x: -3.2, z: 54.1, w: 2.8, d: 1.8, lo: 1.0, hi: CLIFF };
  // maze walls on the table, in table space: [x0, z0, x1, z1] (thin, 0.3 high)
  const WALLS = [
    [-9, -4.5, 4.6, -4.5],
    [-4.6, 0.6, 9, 0.6],
    [-9, 5.2, 3.2, 5.2],
    [1.2, -9, 1.2, -6.9],
    [-1.4, -4.5, -1.4, -2.4],
    [5.4, 0.6, 5.4, 2.6],
    [-3.6, 5.2, -3.6, 7.1],
  ];
  const WALL_T = 0.3;
  const WALL_H = 0.3;
  const CHUTE = [-7.4, -7.4];
  // holes in order: ♥ then ♦ then ♣ (a filled hole is flush), and the traps
  const HOLES = [
    { x: 7.5, z: -7.3, suit: '♥', col: '#ff5f8a' },
    { x: 7.4, z: 3.1, suit: '♦', col: '#ff9a3a' },
    { x: -7.4, z: 7.4, suit: '♣', col: '#4fd1b5' },
  ];
  const TRAPS = [
    [-2.6, -6.9],
    [2.4, -2.7],
    [-1.0, 3.0],
    [0.6, 7.4],
  ];

  let built = false;
  let mats = null;
  let screen = null;
  const st = {
    tA: 0,
    tB: 0,
    tx: 0,
    tz: 0,
    roll: [0, 0, 0],
    dx: 0,
    dz: 0,
    lock: false,
    lift: 1.0,
    winch: 0,
    marbles: [],
    mi: 0,
    crate: { st: 'ground', x: 3, y: 0, z: 5 },
    valetPos: null,
    gust: 0,
    gustDir: 1,
    storm: 0,
    bal: 0,
    card: false,
  };
  const M = {}; // moving meshes
  let rain = null;
  let flash = null;
  let flashT = 0;
  let cloudTex = null;
  let heart = null;
  let card = null;
  let windFx = null;
  const tmp = V3();

  const mk = () => ({
    // moderate metalness: without an environment map, full metal renders black
    steel: Tex.mat('metal', { color: '#9c97ab', scale: 1.5, metal: 0.4, rough: 0.42 }),
    dark: Tex.mat('metal', { color: '#3e3a4c', scale: 2, metal: 0.35, rough: 0.55 }),
    brass: Tex.mat('metal', { color: '#d4ad5a', scale: 1, metal: 0.45, rough: 0.35, emissive: '#3a2a10' }),
    stone: Tex.mat('stone', { color: '#6a6072', scale: 3.5 }),
    rock: Tex.mat('rock', { color: '#7a6d86', scale: 6 }),
    marble: Tex.mat('marble', { color: '#7d7389', scale: 6 }),
    cobble: Tex.mat('cobble', { color: '#6e6576', scale: 2.5 }),
    pink: glow('#ff5f8a', 1.5),
    teal: glow('#4fd1b5', 1.4),
    gold: glow('#ffcf8a', 0.85),
    amber: glow('#ff9a3a', 1.3),
  });

  // wood boards drawn at 1080+ px, UV mapped (they rotate: no world-space texture)
  const boardsTex = (rx, ry) =>
    LvKit.tex(
      512,
      512,
      (g, w, h) => {
        const n = 6;
        for (let i = 0; i < n; i++) {
          const y = (i * h) / n;
          const base = 92 + ((i * 37) % 23);
          g.fillStyle = `rgb(${base + 28},${base - 8},${base - 34})`;
          g.fillRect(0, y, w, h / n);
          for (let k = 0; k < 70; k++) {
            g.strokeStyle = `rgba(40,20,10,${0.08 + Math.random() * 0.12})`;
            g.lineWidth = 0.6 + Math.random() * 1.2;
            g.beginPath();
            const yy = y + Math.random() * (h / n);
            g.moveTo(0, yy);
            g.bezierCurveTo(w * 0.3, yy + 3, w * 0.6, yy - 3, w, yy + Math.random() * 4 - 2);
            g.stroke();
          }
          g.fillStyle = 'rgba(15,6,4,0.75)';
          g.fillRect(0, y, w, 2.5);
          // nails
          g.fillStyle = 'rgba(30,30,36,0.9)';
          [24, w - 24].forEach((x) => {
            g.beginPath();
            g.arc(x, y + h / n / 2, 3, 0, TAU);
            g.fill();
          });
        }
      },
      rx,
      ry,
    );

  const solid = (x, y, z, sx, sy, sz, mat, opt) => K.solid(x, y, z, sx, sy, sz, mat || mats.stone, opt);
  const slab = (x, top, z, sx, sz, depth, mat) => solid(x, top - depth / 2, z, sx, depth, sz, mat);
  const trim = (x, y, z, sx, sy, sz, mat) => K.deco(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z);

  // a floating island: walkable slab + rocky underside
  const island = (x, top, z, sx, sz, depth = 1.2) => {
    slab(x, top, z, sx, sz, depth, mats.cobble);
    const r = Math.max(sx, sz) * 0.55;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.6, 9, 3), mats.rock);
    cone.rotation.x = Math.PI;
    cone.scale.set(sx / (2 * r), 1, sz / (2 * r));
    cone.position.copy(P(x, top - depth - r * 0.8, z));
    group.add(cone);
    // brass edge trim
    trim(x, top - 0.05, z - sz / 2, sx, 0.12, 0.14, mats.brass);
    trim(x, top - 0.05, z + sz / 2, sx, 0.12, 0.14, mats.brass);
  };

  const lantern = (x, top, z) => {
    trim(x, top + 1.1, z, 0.12, 2.2, 0.12, mats.dark);
    const l = K.deco(new THREE.SphereGeometry(0.22, 14, 10), mats.gold, x, top + 2.3, z);
    K.collider(x, top + 1.1, z, 0.25, 2.2, 0.25);
    return l;
  };

  // ---------- seesaws ----------
  const seesaw = (piv, emblem) => {
    const g = new THREE.Group();
    g.position.copy(P(0, piv.y, piv.z));
    group.add(g);
    const deck = new THREE.Group();
    g.add(deck);
    const wood = new THREE.MeshStandardMaterial({
      map: boardsTex(1, 7),
      roughness: 0.75,
      metalness: 0.02,
      color: '#cfc2b8',
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(PLANK_W, 0.3, PLANK_L), wood);
    top.position.y = -0.15;
    deck.add(top);
    // steel frame under the boards + side rails
    [-1, 1].forEach((s) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, PLANK_L), mats.steel);
      beam.position.set(s * (PLANK_W / 2 - 0.08), -0.4, 0);
      deck.add(beam);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, PLANK_L - 1), mats.brass);
      rail.position.set(s * (PLANK_W / 2 - 0.05), 0.55, 0);
      deck.add(rail);
      for (let k = -6; k <= 6; k += 2) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), mats.steel);
        post.position.set(s * (PLANK_W / 2 - 0.05), 0.25, k);
        deck.add(post);
      }
    });
    // end bumpers with suit emblems
    [-1, 1].forEach((s, i) => {
      const bump = new THREE.Mesh(new THREE.BoxGeometry(PLANK_W, 0.42, 0.3), mats.dark);
      bump.position.set(0, -0.2, s * (PLANK_L / 2 - 0.15));
      deck.add(bump);
      const em = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshBasicMaterial({
          map: suitTex(emblem[i], i ? '#4fd1b5' : '#ff5f8a'),
          transparent: true,
          toneMapped: false,
          depthWrite: false,
        }),
      );
      em.position.set(0, -0.2, s * (PLANK_L / 2 + 0.01));
      if (s < 0) em.rotation.y = Math.PI;
      deck.add(em);
    });
    // fulcrum: brass gear on an A-frame that plunges into the clouds
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, PLANK_W + 0.6, 24), mats.brass);
    gear.rotation.z = Math.PI / 2;
    gear.position.y = -0.75;
    g.add(gear);
    for (let i = 0; i < 12; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(PLANK_W + 0.62, 0.18, 0.22), mats.brass);
      const a = (i / 12) * TAU;
      tooth.position.set(0, -0.75 + Math.cos(a) * 0.82, Math.sin(a) * 0.82);
      tooth.rotation.x = a;
      gear.parent.add(tooth);
      tooth.userData.a = a;
      (g.userData.teeth = g.userData.teeth || []).push(tooth);
    }
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 32, 0.35), mats.dark);
      leg.position.set(s * (PLANK_W / 2 + 0.4), -16.8, 0);
      g.add(leg);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5), mats.steel);
      brace.position.set(s * (PLANK_W / 2 + 0.4), -3.2, 0);
      brace.rotation.x = 0.6;
      g.add(brace);
      const brace2 = brace.clone();
      brace2.rotation.x = -0.6;
      g.add(brace2);
    });
    // glowing level gauge under the pivot
    const gauge = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 32), mats.teal);
    gauge.position.set(PLANK_W / 2 + 0.75, -0.75, 0);
    gauge.rotation.y = Math.PI / 2;
    g.add(gauge);
    return { g, deck, gauge };
  };

  const suitCache = {};
  const suitTex = (suit, col) => {
    const k = suit + col;
    if (suitCache[k]) return suitCache[k];
    suitCache[k] = LvKit.tex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '190px Georgia';
      Icons.fillText(g, suit, 128, 140);
    });
    return suitCache[k];
  };

  // ---------- the maze table ----------
  const buildTable = () => {
    const g = new THREE.Group();
    g.position.copy(P(0, TBL.y, TBL.z));
    group.add(g);
    const S = TBL.half * 2;
    const topTex = LvKit.tex(1024, 1024, (c, w, h) => {
      // inlaid marble with a brass compass rose and a faint heart in the middle
      const gr = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7);
      gr.addColorStop(0, '#5a4f63');
      gr.addColorStop(1, '#2e2635');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        c.strokeStyle = `rgba(255,240,250,${0.02 + Math.random() * 0.05})`;
        c.lineWidth = 0.5 + Math.random() * 2;
        c.beginPath();
        let x = Math.random() * w;
        let y = Math.random() * h;
        c.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (Math.random() - 0.5) * 120;
          y += (Math.random() - 0.5) * 120;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      c.strokeStyle = 'rgba(212,173,90,0.55)';
      c.lineWidth = 3;
      for (let i = 1; i < 6; i++) {
        c.strokeRect((i * w) / 6 - 1, 0, 2, h);
        c.strokeRect(0, (i * h) / 6 - 1, w, 2);
      }
      c.save();
      c.translate(w / 2, h / 2);
      c.fillStyle = 'rgba(255,95,138,0.16)';
      c.beginPath();
      for (let i = 0; i <= 80; i++) {
        const [x, y] = Heart.curve((i / 80) * TAU);
        if (i) c.lineTo(x * 6, -(y - 2.5) * 6);
        else c.moveTo(x * 6, -(y - 2.5) * 6);
      }
      c.fill();
      c.restore();
    });
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(S, 0.6, S),
      [
        mats.dark,
        mats.dark,
        new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.05 }),
        mats.dark,
        mats.dark,
        mats.dark,
      ],
    );
    top.position.y = -0.3;
    g.add(top);
    // brass rim (marbles bounce on it)
    [
      [0, -TBL.half, S + 0.3, 0.3],
      [0, TBL.half, S + 0.3, 0.3],
      [-TBL.half, 0, 0.3, S],
      [TBL.half, 0, 0.3, S],
    ].forEach(([x, z, sx, sz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.34, sz), mats.brass);
      m.position.set(x, 0.17, z);
      g.add(m);
    });
    // maze walls: dark stone with a teal glow line on top
    WALLS.forEach(([x0, z0, x1, z1]) => {
      const sx = Math.abs(x1 - x0) + WALL_T;
      const sz = Math.abs(z1 - z0) + WALL_T;
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, WALL_H, sz), mats.stone);
      m.position.set((x0 + x1) / 2, WALL_H / 2, (z0 + z1) / 2);
      g.add(m);
      const l = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.03, sz * 0.4 + 0.02), mats.teal);
      if (sx < sz) l.scale.set(0.4, 1, 2.5);
      l.position.set((x0 + x1) / 2, WALL_H + 0.015, (z0 + z1) / 2);
      g.add(l);
    });
    // holes (glow rings) and traps (dark swirl with a red rim)
    M.holes = HOLES.map((h) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 40).rotateX(-Math.PI / 2), glow(h.col, 1.2));
      ring.position.set(h.x, 0.02, h.z);
      const pit = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#05020a' }));
      pit.position.set(h.x, 0.015, h.z);
      const em = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: suitTex(h.suit, h.col), transparent: true, toneMapped: false, depthWrite: false }),
      );
      em.position.set(h.x - (h.x > 0 ? 1.3 : -1.3), 0.03, h.z);
      g.add(ring, pit, em);
      return { ring, pit };
    });
    TRAPS.forEach(([x, z]) => {
      const pit = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#030106' }));
      pit.position.set(x, 0.015, z);
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32).rotateX(-Math.PI / 2), glow('#ff2a3a', 0.9));
      rim.position.set(x, 0.02, z);
      g.add(pit, rim);
    });
    // the chute where marbles come in
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.6, 16, 1, true), mats.brass);
    chute.position.set(CHUTE[0], 1.6, CHUTE[1]);
    g.add(chute);
    // marbles
    M.marbles = HOLES.map((h) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 24, 18),
        new THREE.MeshStandardMaterial({
          color: h.col,
          emissive: h.col,
          emissiveIntensity: 0.9,
          roughness: 0.15,
          metalness: 0.1,
        }),
      );
      m.visible = false;
      g.add(m);
      return m;
    });
    // central pivot column under the table
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 30, 16), mats.dark);
    col.position.set(0, -15.6, 0);
    group.add(col);
    col.position.copy(P(0, TBL.y - 15.6, TBL.z));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), mats.brass);
    ball.position.copy(P(0, TBL.y - 1.3, TBL.z));
    group.add(ball);
    M.table = g;
  };

  // ---------- hanging bridges ----------
  // a hanging bridge is held at both ends: it twists, fully at mid-span and not at all at the
  // towers (no step between a rolled deck and a fixed tower)
  const twist = (dz) => Math.max(0, 1 - (dz / (BR.len / 2)) ** 2);
  const BSEG = 10;
  const buildBridge = (zc) => {
    const wood = new THREE.MeshStandardMaterial({ map: boardsTex(6, 1 / BSEG), roughness: 0.8, color: '#bfb2a8' });
    const L = BR.len / BSEG;
    const segs = [];
    for (let i = 0; i < BSEG; i++) {
      const dz = -BR.len / 2 + (i + 0.5) * L;
      const g = new THREE.Group();
      g.position.copy(P(0, BR.y, zc + dz));
      group.add(g);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(BR.half * 2, 0.28, L + 0.03), wood);
      deck.position.y = -0.14;
      g.add(deck);
      [-1, 1].forEach((sd) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, L + 0.03), mats.steel);
        beam.position.set(sd * (BR.half - 0.09), -0.36, 0);
        g.add(beam);
        const rope = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, L + 0.03), mats.brass);
        rope.position.set(sd * (BR.half - 0.05), 0.9, 0);
        g.add(rope);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), mats.steel);
        post.position.set(sd * (BR.half - 0.05), 0.45, 0);
        g.add(post);
        // pink side / teal side: the gusts are called by colour
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, L + 0.03), sd < 0 ? mats.pink : mats.teal);
        strip.position.set(sd * (BR.half - 0.3), 0.01, 0);
        g.add(strip);
      });
      // central keel light: shows how much the bridge is twisted
      const keel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, L * 0.8), mats.teal);
      keel.position.y = 0.01;
      g.add(keel);
      segs.push({ g, dz, keel });
    }
    // chains up to the gantries (attached near the ends, where the deck barely twists)
    const chains = [];
    [-1, 1].forEach((sd) =>
      [-1, 1].forEach((e) => {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), mats.steel);
        group.add(ch);
        chains.push({ m: ch, s: sd, e });
      }),
    );
    return { segs, chains, zc };
  };

  // low parapets across a platform's end, either side of the bridge mouth: a gust can push
  // you sideways on the platform, never off its end beside the deck
  const parapet = (z, halfW) => {
    [-1, 1].forEach((sd) => {
      const w = halfW - 2.4;
      solid(sd * (2.4 + w / 2), BR.y + 0.35, z, w, 0.7, 0.3, mats.stone);
      trim(sd * (2.4 + w / 2), BR.y + 0.72, z, w, 0.05, 0.32, sd < 0 ? mats.pink : mats.teal);
    });
  };
  const tower = (z0, z1, top) => {
    slab(0, top, (z0 + z1) / 2, 9, z1 - z0, 1.4, mats.stone);
    parapet(z0 + 0.15, 4.5);
    parapet(z1 - 0.15, 4.5);
    const pil = new THREE.Mesh(new THREE.BoxGeometry(6, 36, z1 - z0 - 1), mats.rock);
    pil.position.copy(P(0, top - 19.4, (z0 + z1) / 2));
    group.add(pil);
    [-1, 1].forEach((sd) => trim(sd * 4.2, top + 0.02, (z0 + z1) / 2, 0.12, 0.04, z1 - z0 - 0.4, sd < 0 ? mats.pink : mats.teal));
    // gantry arch that holds the chains
    [-1, 1].forEach((s) => solid(s * 4.0, top + 4.6, (z0 + z1) / 2, 0.6, 9.2, 0.6, mats.dark));
    trim(0, top + 9.0, (z0 + z1) / 2, 8.6, 0.5, 0.6, mats.dark);
    trim(0, top + 8.7, (z0 + z1) / 2, 8.6, 0.06, 0.62, mats.pink);
    lantern(-3.6, top, z0 + 1);
    lantern(3.6, top, z1 - 1);
    // wind sock: shows the gusts on both screens
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 10, 1, true), mats.amber);
    sock.rotation.z = Math.PI / 2;
    sock.position.copy(P(4.0, top + 7.4, (z0 + z1) / 2));
    group.add(sock);
    (M.socks = M.socks || []).push(sock);
  };

  // chain gantry over a platform (decor + posts with colliders)
  const gantry = (z) => {
    [-1, 1].forEach((s) => solid(s * 4.0, BR.y + 4.6, z, 0.6, 9.2, 0.6, mats.dark));
    trim(0, BR.y + 9.0, z, 8.6, 0.5, 0.6, mats.dark);
    trim(0, BR.y + 8.7, z, 8.6, 0.06, 0.62, mats.pink);
  };

  const buildDais = () => {
    const g = new THREE.Group();
    g.position.copy(P(0, DAIS.y, DAIS.z));
    group.add(g);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(DAIS.r, DAIS.r, 0.4, 48), mats.marble);
    disc.position.y = -0.2;
    g.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(DAIS.r, 0.08, 8, 64), mats.brass);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    // two heart halves: stand on both to balance
    const half = (sgn, col) => {
      const sh = new THREE.Shape();
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * (sgn > 0 ? 1 : -1);
        const [x, y] = Heart.curve(t);
        if (i) sh.lineTo(x * 0.11, (y - 2.5) * 0.11);
        else sh.moveTo(x * 0.11, (y - 2.5) * 0.11);
      }
      sh.lineTo(0, -0.3);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40).rotateX(-Math.PI / 2), glow(col, 1.1));
      m.position.set(sgn * 2.6, 0.02, 0);
      g.add(m);
      return m;
    };
    M.plates = [half(-1, '#ff5f8a'), half(1, '#4fd1b5')];
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 3, 12), mats.dark);
    spire.position.copy(P(0, DAIS.y - 1.8, DAIS.z));
    group.add(spire);
    M.dais = g;
  };

  const buildStorm = () => {
    const N = 2600;
    const pos = new Float32Array(N * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const seeds = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      seeds[i * 3] = (Math.random() - 0.5) * 60;
      seeds[i * 3 + 1] = Math.random() * 30;
      seeds[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    rain = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ color: '#b9b0d6', transparent: true, opacity: 0.35, depthWrite: false }),
    );
    rain.frustumCulled = false;
    rain.userData = { seeds, N };
    rain.visible = false;
    R.scene.add(rain);
    flash = new THREE.HemisphereLight('#d9d2ff', '#201030', 0);
    group.add(flash);
    // wind streaks for gusts (telegraph)
    const W = 90;
    const wp = new Float32Array(W * 6);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3).setUsage(THREE.DynamicDrawUsage));
    windFx = new THREE.LineSegments(
      wg,
      new THREE.LineBasicMaterial({ color: '#e8e2ff', transparent: true, opacity: 0, depthWrite: false }),
    );
    windFx.frustumCulled = false;
    windFx.userData = {
      seeds: Array.from({ length: W }, () => [Math.random(), Math.random() * 6, Math.random()]),
    };
    R.scene.add(windFx);
  };

  const build = () => {
    if (built) {
      group.visible = true;
      return;
    }
    built = true;
    group.visible = true;
    mats = mk();

    // sea of clouds far below
    cloudTex = LvKit.tex(512, 512, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 10 + Math.random() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(255,255,255,${0.05 + Math.random() * 0.08})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, 6, 6);
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: cloudTex,
        color: new THREE.Color('#8a6aa8').multiplyScalar(0.55),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    clouds.position.copy(P(0, -24, 90));
    group.add(clouds);

    // atrium
    island(0, 0, -0.2, 16, 23.6, 1.6);
    const arch = (z) => {
      [-1, 1].forEach((s) => solid(s * 5.2, 3.2, z, 0.9, 6.4, 0.9, mats.marble));
      trim(0, 6.6, z, 11.3, 0.6, 1.0, mats.marble);
      trim(0, 6.25, z, 10.5, 0.08, 1.02, mats.teal);
    };
    arch(8.6);
    lantern(-6.5, 0, -8);
    lantern(6.5, 0, -8);
    lantern(-6.5, 0, 6);
    lantern(6.5, 0, 6);
    screen = makeScreen(12, 5, 1024);
    screen.mesh.position.copy(P(0, 11.5, 30));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    const cd = LvKit.trialCard('c3');
    cd.visible = true;
    cd.position.copy(P(0, 3.3, -11.2));
    group.add(cd);
    // the crate (only the Valet kit can carry it)
    M.crate = new THREE.Group();
    const cb = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ map: boardsTex(1, 1), roughness: 0.8, color: '#c8b8a6' }),
    );
    cb.position.y = 0.55;
    M.crate.add(cb);
    [-1, 1].forEach((s) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.1, 1.14), mats.brass);
      band.position.y = 0.55 + s * 0.35;
      M.crate.add(band);
    });
    const ce = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.6),
      new THREE.MeshBasicMaterial({ map: suitTex('♣', '#4fd1b5'), transparent: true, toneMapped: false, depthWrite: false }),
    );
    ce.position.set(0, 0.55, 0.56);
    M.crate.add(ce);
    const ce2 = ce.clone();
    ce2.position.z = -0.56;
    ce2.rotation.y = Math.PI;
    M.crate.add(ce2);
    group.add(M.crate);

    // seesaw A and island B
    M.sA = seesaw(A, ['♥', '♣']);
    island(0, ISLE, 33.3, 14, 13.8, 1.4);
    // the lock lever on island B
    const lv = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), mats.dark);
    base.position.y = 0.25;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8).translate(0, 0.6, 0), mats.steel);
    arm.position.y = 0.45;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mats.pink);
    knob.position.y = 1.2;
    arm.add(knob);
    lv.add(base, arm);
    lv.position.copy(P(4.8, ISLE, 28.4));
    group.add(lv);
    K.collider(4.8, ISLE + 0.25, 28.4, 0.7, 0.5, 0.5);
    M.lever = arm;
    // a light bar that shows the lock on both screens
    M.lockBar = K.deco(new THREE.BoxGeometry(PLANK_W + 0.4, 0.06, 0.06), mats.gold, 0, ISLE + 0.04, 26.5);
    M.sB = seesaw(B, ['♠', '♣']);
    // perch: two steps and the high platform over seesaw B
    solid(5.25, (ISLE + 5.5) / 2, 32, 3.5, 5.5 - ISLE, 3, mats.stone);
    solid(5.25, (ISLE + 8.0) / 2, 35.4, 3.5, 8.0 - ISLE, 3.8, mats.stone);
    solid(3.8, (ISLE + PERCH) / 2, 38.75, 6.4, PERCH - ISLE, 2.9, mats.stone);
    trim(3.8, PERCH + 0.04, 40.2, 6.4, 0.08, 0.1, mats.pink);
    // the diving board over the near end of seesaw B: step off it to slam the plank
    solid(0.7, PERCH - 0.15, 41.3, 1.4, 0.3, 2.2, mats.dark);
    trim(0.7, PERCH + 0.02, 42.38, 1.4, 0.06, 0.08, mats.pink);
    [-1, 1].forEach((sd) => trim(0.7 + sd * 0.66, PERCH + 0.5, 41.3, 0.05, 1.0, 2.0, mats.brass));
    // a heart painted where the jumper lands
    {
      const sh = new THREE.Shape();
      for (let i = 0; i <= 60; i++) {
        const [x, y] = Heart.curve((i / 60) * TAU);
        if (i) sh.lineTo(x * 0.05, (y - 2.5) * 0.05);
        else sh.moveTo(x * 0.05, (y - 2.5) * 0.05);
      }
      const hm = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40).rotateX(-Math.PI / 2), glow('#ff5f8a', 0.9));
      hm.position.set(0.5, 0.01, 43.6 - B.z);
      M.sB.deck.add(hm);
      const hm2 = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40).rotateX(-Math.PI / 2), glow('#4fd1b5', 0.9));
      hm2.position.set(0, 0.01, 53.4 - B.z);
      M.sB.deck.add(hm2);
    }
    // grapple ring above the perch
    M.ring = K.deco(new THREE.TorusGeometry(0.6, 0.08, 10, 32), glow('#ff5f8a', 1.6), RING.x - O.x, RING.y - O.y, RING.z - O.z);
    lantern(-6.2, ISLE, 27.4);
    lantern(-6.2, ISLE, 39.4);

    // seesaw B (catapult) and cliff C
    island(0, CLIFF, 63.5, 16, 17, 2);
    const face = new THREE.Mesh(new THREE.BoxGeometry(16, CLIFF + 20, 1), mats.rock);
    face.position.copy(P(0, CLIFF / 2 - 10, 55.5));
    group.add(face);
    K.collider(0, CLIFF / 2 - 10, 55.5, 16, CLIFF + 20, 1);
    // the face: brass bands, wall lamps and a big clover over the catapult's landing
    [2.2, 6.2].forEach((y) => trim(0, y, 54.97, 16, 0.14, 0.06, mats.brass));
    [-6.4, 5.6].forEach((x) => {
      trim(x, 4.2, 54.85, 0.16, 0.5, 0.3, mats.dark);
      K.deco(new THREE.SphereGeometry(0.2, 14, 10), mats.gold, x, 4.55, 54.7);
    });
    const clover = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ map: suitTex('♣', '#4fd1b5'), transparent: true, toneMapped: false, depthWrite: false }),
    );
    clover.material.color.setScalar(0.75);
    clover.position.copy(P(1.6, 7.6, 54.96));
    clover.rotation.y = Math.PI;
    group.add(clover);
    // the lift: a brass-rimmed platform on four cables, hoisted by the winch up top
    M.lift = new THREE.Group();
    const lp = new THREE.Mesh(
      new THREE.BoxGeometry(LIFT.w, 0.3, LIFT.d),
      new THREE.MeshStandardMaterial({ map: boardsTex(2, 1), roughness: 0.8, color: '#c8b8a6' }),
    );
    lp.position.y = -0.15;
    M.lift.add(lp);
    [-1, 1].forEach((s) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(LIFT.w + 0.1, 0.12, 0.12), mats.brass);
      r.position.set(0, 0.02, s * (LIFT.d / 2));
      M.lift.add(r);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, LIFT.d), mats.brass);
      r2.position.set(s * (LIFT.w / 2), 0.02, 0);
      M.lift.add(r2);
    });
    const ll = new THREE.Mesh(new THREE.BoxGeometry(LIFT.w - 0.4, 0.03, 0.08), mats.teal);
    ll.position.set(0, 0.03, -LIFT.d / 2 + 0.2);
    M.lift.add(ll);
    group.add(M.lift);
    M.liftCables = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), mats.steel);
        group.add(ch);
        return { m: ch, sx, sz };
      }),
    );
    M.liftBox = Phys.add([0, -999, 0], [0.1, -998.9, 0.1], { dyn: true });
    // the davit that holds the cables, over the edge of the cliff
    [-1, 1].forEach((s) => solid(LIFT.x + s * (LIFT.w / 2 + 0.35), CLIFF + 2.2, 55.7, 0.3, 4.4, 0.3, mats.dark));
    trim(LIFT.x, CLIFF + 4.4, 55.7, LIFT.w + 1.0, 0.3, 0.3, mats.dark);
    [-1, 1].forEach((s) => trim(LIFT.x + s * (LIFT.w / 2 - 0.2), CLIFF + 4.4, 54.9, 0.2, 0.2, 1.9, mats.dark));
    const pul = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, LIFT.w - 0.2, 16), mats.brass);
    pul.rotation.z = Math.PI / 2;
    pul.position.copy(P(LIFT.x, CLIFF + 4.1, LIFT.z));
    group.add(pul);
    M.pulley = pul;
    // the winch on cliff C
    const winch = new THREE.Group();
    const wb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.9), mats.dark);
    wb.position.y = 0.45;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.5, 16), mats.brass);
    drum.rotation.z = Math.PI / 2;
    drum.position.y = 1.1;
    winch.add(wb, drum);
    winch.position.copy(P(-3, CLIFF, 57.6));
    group.add(winch);
    K.collider(-3, CLIFF + 0.45, 57.6, 1.4, 0.9, 0.9);
    M.drum = drum;
    lantern(6.5, CLIFF, 57);
    lantern(-6.5, CLIFF, 70);
    // the lookout over the table (stairs up from cliff C)
    for (let i = 0; i < 8; i++) solid(-6, CLIFF + (0.45 * (i + 1)) / 2, 57 + i, 4, 0.45 * (i + 1), 1, mats.stone);
    slab(-6, CLIFF + 3.6, 68, 4, 8, 0.6, mats.marble);
    trim(-3.95, CLIFF + 4.1, 68, 0.08, 1, 8, mats.brass);
    K.collider(-3.95, CLIFF + 4.1, 68, 0.1, 1, 8);
    // short bridges around the table, platform D
    slab(0, CLIFF, 73.3, 5, 2.2, 0.6, mats.cobble);
    buildTable();
    slab(0, CLIFF, 95.3, 5, 5.4, 0.6, mats.cobble);
    island(0, CLIFF, 101, 12, 6, 1.6);
    M.exitGate = solid(0, CLIFF + 1.5, 93, 5, 3, 0.3, glow('#4fd1b5', 0.6));
    M.exitGate.m.material = new THREE.MeshBasicMaterial({ color: '#4fd1b5', transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false });

    // the storm: three hanging bridges between towers, then the final tower
    M.bridges = BR.spans.map(buildBridge);
    tower(118, 124.4, BR.y);
    tower(138, 144.4, BR.y);
    gantry(101);
    gantry(159.5);
    parapet(103.85, 6);
    parapet(158.15, 8);
    slab(0, BR.y, 168, 16, 20, 1.6, mats.cobble);
    const fp = new THREE.Mesh(new THREE.BoxGeometry(12, 40, 16), mats.rock);
    fp.position.copy(P(0, BR.y - 21.6, 168));
    group.add(fp);
    buildDais();
    lantern(-7, BR.y, 159);
    lantern(7, BR.y, 159);
    lantern(-7, BR.y, 177);
    lantern(7, BR.y, 177);
    // the heart gathers above the last tower as you balance (kept small and dim: bloom)
    heart = Heart.galaxy(5000, 0.38, 13);
    heart.group.position.copy(P(0, 30, 198));
    heart.group.lookAt(P(0, 14, 160));
    heart.U.uForm.value = 0.25;
    heart.core.material.opacity = 0.05;
    group.add(heart.group);
    card = LvKit.trialCard('c3');
    card.position.copy(P(0, DAIS.y + 1.6, DAIS.z));
    group.add(card);

    buildStorm();
  };

  // ---------- surfaces (height under a point, relative coords) ----------
  const plankH = (piv, t, q) => piv.y + (q.z - piv.z) * Math.sin(t);
  const inPlank = (piv, q) => Math.abs(q.x) <= PLANK_W / 2 + 0.05 && Math.abs(q.z - piv.z) <= PLANK_L / 2;
  const tableH = (q) => {
    const lx = q.x;
    const lz = q.z - TBL.z;
    let h = TBL.y + lz * Math.sin(st.tx) + lx * Math.sin(st.tz);
    for (const [x0, z0, x1, z1] of WALLS)
      if (
        lx > Math.min(x0, x1) - WALL_T / 2 - 0.05 &&
        lx < Math.max(x0, x1) + WALL_T / 2 + 0.05 &&
        lz > Math.min(z0, z1) - WALL_T / 2 - 0.05 &&
        lz < Math.max(z0, z1) + WALL_T / 2 + 0.05
      ) {
        h += WALL_H;
        break;
      }
    return h;
  };
  const surfaces = () => [
    { id: 'A', in: (q) => inPlank(A, q), h: (q) => plankH(A, st.tA, q), slope: () => st.tA, axis: 'z' },
    { id: 'B', in: (q) => inPlank(B, q), h: (q) => plankH(B, st.tB, q), slope: () => st.tB, axis: 'z' },
    {
      id: 'T',
      in: (q) => Math.abs(q.x) <= TBL.half && Math.abs(q.z - TBL.z) <= TBL.half,
      h: tableH,
      slope: () => 0,
      axis: 'z',
    },
    ...BR.spans.map((zc, i) => ({
      id: 'R' + i,
      in: (q) => Math.abs(q.x) <= BR.half && Math.abs(q.z - zc) <= BR.len / 2,
      h: (q) => BR.y + q.x * Math.sin(st.roll[i] * twist(q.z - zc)),
      slope: (q) => st.roll[i] * twist(q.z - zc),
      w: (q) => twist(q.z - zc),
      axis: 'x',
      i,
    })),
    {
      id: 'D',
      in: (q) => Math.hypot(q.x, q.z - DAIS.z) <= DAIS.r,
      h: (q) => DAIS.y + (q.z - DAIS.z) * Math.sin(st.dx) + q.x * Math.sin(st.dz),
      slope: () => 0,
      axis: 'z',
    },
  ];

  // ---------- per-frame visuals ----------
  const chainTop = V3();
  const update = (dt, t, stage) => {
    if (!built) return;
    screen.update(dt, t);
    // seesaws
    [
      [M.sA, st.tA],
      [M.sB, st.tB],
    ].forEach(([s, a]) => {
      s.deck.rotation.x = -a;
      (s.g.userData.teeth || []).forEach((tt) => {
        const aa = tt.userData.a - a * 3;
        tt.position.set(0, -0.75 + Math.cos(aa) * 0.82, Math.sin(aa) * 0.82);
        tt.rotation.x = aa;
      });
      s.gauge.material = Math.abs(a) < 0.04 ? mats.teal : Math.abs(a) > TMAX - 0.02 ? mats.pink : mats.gold;
    });
    M.lever.rotation.z = damp(M.lever.rotation.z, st.lock ? -0.9 : 0.9, 8, dt);
    M.lockBar.visible = st.lock;
    M.ring.rotation.y = t;
    // the lift and its cables
    const ly = st.lift;
    M.lift.position.copy(P(LIFT.x, ly, LIFT.z));
    const lb = M.liftBox;
    lb.min[0] = O.x + LIFT.x - LIFT.w / 2;
    lb.max[0] = O.x + LIFT.x + LIFT.w / 2;
    lb.min[2] = O.z + LIFT.z - LIFT.d / 2;
    lb.max[2] = O.z + LIFT.z + LIFT.d / 2;
    lb.max[1] = O.y + ly;
    lb.min[1] = O.y + ly - 0.3;
    lb.on = group.visible;
    M.liftCables.forEach(({ m, sx, sz }) => {
      tmp.copy(P(LIFT.x + sx * (LIFT.w / 2 - 0.2), ly, LIFT.z + sz * (LIFT.d / 2 - 0.15)));
      chainTop.copy(P(LIFT.x + sx * (LIFT.w / 2 - 0.2), CLIFF + 4.1, LIFT.z));
      m.position.copy(tmp).add(chainTop).multiplyScalar(0.5);
      m.scale.set(1, Math.max(0.05, tmp.distanceTo(chainTop)), 1);
      m.lookAt(chainTop);
      m.rotateX(Math.PI / 2);
    });
    M.drum.rotation.x = ly * 2.2;
    M.pulley.rotation.x = -ly * 2.2;
    // crate
    const c = st.crate;
    if (c.st === 'carry' && st.valetPos) {
      M.crate.position.copy(st.valetPos).add(tmp.set(0, 2.05, 0));
      M.crate.rotation.set(0, t * 0.6, 0);
    } else if (c.st === 'plank') {
      const q = V3(c.x, 0, c.z);
      M.crate.position.copy(P(c.x, plankH(A, st.tA, q), c.z));
      M.crate.rotation.set(-st.tA, 0, 0);
    } else {
      M.crate.position.copy(P(c.x, c.y, c.z));
      M.crate.rotation.set(0, 0, 0);
    }
    // table + marbles
    M.table.rotation.set(-st.tx, 0, st.tz, 'XZY');
    M.marbles.forEach((m, i) => {
      const mb = st.marbles[i];
      m.visible = !!mb && (mb.on || mb.done);
      if (!mb) return;
      m.position.set(mb.x, mb.done ? -0.15 : 0.35, mb.z);
      m.rotation.x += (mb.vz || 0) * dt * 2.8;
      m.rotation.z -= (mb.vx || 0) * dt * 2.8;
    });
    M.holes.forEach((h, i) => {
      const done = st.marbles[i] && st.marbles[i].done;
      h.ring.scale.setScalar(done ? 1.25 : 1 + 0.08 * Math.sin(t * 3 + i));
      h.ring.material.color.set(HOLES[i].col).multiplyScalar(done ? 2 : i === st.mi ? 1.4 : 0.6);
    });
    M.exitGate.m.visible = M.exitGate.b.on;
    // bridges + chains
    M.bridges.forEach((b, i) => {
      const r = st.roll[i];
      const keelMat = Math.abs(r) < 0.08 ? mats.teal : Math.abs(r) > 0.22 ? mats.pink : mats.gold;
      b.segs.forEach((sg) => {
        sg.g.rotation.z = r * twist(sg.dz);
        sg.g.position.x = O.x + Math.sin(t * 0.7 + i) * 0.05 * st.storm * twist(sg.dz);
        sg.keel.material = keelMat;
      });
      b.chains.forEach(({ m, s, e }) => {
        const dz = e * (BR.len / 2 - 0.4);
        const a = r * twist(dz);
        const bx = s * (BR.half - 0.1);
        tmp.copy(P(bx * Math.cos(a), BR.y + bx * Math.sin(a), b.zc + dz));
        chainTop.copy(P(s * 4.0, BR.y + 9.0, b.zc + dz + e * 2.6));
        m.position.copy(tmp).add(chainTop).multiplyScalar(0.5);
        m.scale.set(1, tmp.distanceTo(chainTop), 1);
        m.lookAt(chainTop);
        m.rotateX(Math.PI / 2);
      });
    });
    M.dais.rotation.set(-st.dx, 0, st.dz, 'XZY');
    M.plates.forEach((p, i) => (p.material.color.set(i ? '#4fd1b5' : '#ff5f8a').multiplyScalar(0.8 + st.bal * 1.2)));
    // heart forms as you balance, card rises at the end
    heart.U.uTime.value = t;
    heart.U.uPx.value = R.renderer.getPixelRatio() * 0.6;
    heart.U.uForm.value = damp(heart.U.uForm.value, st.card ? 1 : 0.25 + st.bal * 0.6, 1.2, dt);
    heart.core.material.opacity = 0.02 + heart.U.uForm.value * 0.06;
    card.visible = st.card;
    if (st.card) {
      card.position.y = damp(card.position.y, O.y + DAIS.y + 2.2 + Math.sin(t * 2) * 0.15, 2, dt);
      card.rotation.y = t * 0.8;
    }
    // storm: rain around the camera, lightning, wind socks, gust streaks
    const storm = st.storm;
    rain.visible = storm > 0.05 && group.visible;
    if (rain.visible) {
      const cp = R.camera.position;
      const { seeds, N } = rain.userData;
      const a = rain.geometry.attributes.position.array;
      const wx = st.gust > 0 ? st.gustDir * 6 : 1.2;
      for (let i = 0; i < N; i++) {
        let y = (seeds[i * 3 + 1] - t * 24) % 30;
        if (y < 0) y += 30;
        const x = cp.x + seeds[i * 3];
        const z = cp.z + seeds[i * 3 + 2];
        const yy = cp.y - 10 + y;
        a[i * 6] = x;
        a[i * 6 + 1] = yy;
        a[i * 6 + 2] = z;
        a[i * 6 + 3] = x - wx * 0.06;
        a[i * 6 + 4] = yy + 0.7;
        a[i * 6 + 5] = z;
      }
      rain.geometry.attributes.position.needsUpdate = true;
      rain.material.opacity = 0.3 * storm;
      flashT -= dt;
      if (flashT < -6 - Math.random() * 6) {
        flashT = 0.25;
        Sound.play('boom');
      }
      flash.intensity = flashT > 0 ? 1.6 * storm * (0.5 + 0.5 * Math.sin(flashT * 60)) : 0;
    } else flash.intensity = 0;
    (M.socks || []).forEach((s, i) => {
      const k = st.gust > 0 ? 1 : 0.35;
      s.rotation.y = damp(s.rotation.y, st.gust > 0 ? (st.gustDir > 0 ? 0 : Math.PI) : Math.sin(t * 0.5 + i) * 0.6, 4, dt);
      s.scale.set(1, 0.6 + k * 0.5 + Math.sin(t * 9 + i) * 0.05 * k, 1);
    });
    const wa = windFx.geometry.attributes.position.array;
    const telegraph = st.gust < 0 ? 1 : st.gust > 0 ? 0.6 : 0;
    windFx.material.opacity = damp(windFx.material.opacity, telegraph * 0.5 * storm, 6, dt);
    if (windFx.material.opacity > 0.01) {
      const cp = R.camera.position;
      windFx.userData.seeds.forEach(([a0, h, d], i) => {
        const u = ((a0 + t * 0.9) % 1) * 2 - 1;
        const x = cp.x - st.gustDir * 18 + st.gustDir * (u + 1) * 18;
        const y = cp.y - 2 + h;
        const z = cp.z - 12 + d * 24;
        wa[i * 6] = x;
        wa[i * 6 + 1] = y;
        wa[i * 6 + 2] = z;
        wa[i * 6 + 3] = x - st.gustDir * 2.4;
        wa[i * 6 + 4] = y;
        wa[i * 6 + 5] = z;
      });
      windFx.geometry.attributes.position.needsUpdate = true;
    }
    windFx.visible = windFx.material.opacity > 0.01;
    cloudTex.offset.x = t * 0.004;
    cloudTex.offset.y = t * 0.002;
  };

  return {
    O,
    P,
    st,
    build,
    update,
    surfaces,
    tableH,
    WALLS,
    WALL_T,
    HOLES,
    TRAPS,
    CHUTE,
    A,
    B,
    TBL,
    BR,
    DAIS,
    TMAX,
    PLANK_L,
    PLANK_W,
    ISLE,
    PERCH,
    CLIFF,
    RING,
    RING_LAND,
    LIFT,
    twist,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    hide() {
      group.visible = false;
      if (rain) rain.visible = false;
      if (M.liftBox) M.liftBox.on = false;
      if (windFx) windFx.visible = false;
    },
    rel: K.rel,
    exitOpen(v) {
      if (M.exitGate) M.exitGate.b.on = !v;
    },
    spawn(stage, who) {
      const s = who === 'dame' ? -1.5 : 1.5;
      if (stage <= 1) return P(s, 0, -6);
      if (stage === 2) return P(s - 2, ISLE, 30);
      if (stage === 3) return P(s, CLIFF, 60);
      if (stage === 4) return P(s, BR.y, 101);
      return P(s, BR.y, 160);
    },
    tower: (i, who) => P(who === 'dame' ? -1.5 : 1.5, BR.y, [101, 121.2, 141.2, 160][i]),
    nearLever: (q) => Math.hypot(q.x - 4.8, q.z - 28.4) < 1.8 && Math.abs(q.y - ISLE) < 1.5,
    onLift: (q) => Math.abs(q.x - LIFT.x) < LIFT.w / 2 + 0.2 && Math.abs(q.z - LIFT.z) < LIFT.d / 2 + 0.2 && Math.abs(q.y - st.lift) < 0.6,
    nearWinch: (q) => Math.hypot(q.x + 3, q.z - 57.6) < 2 && Math.abs(q.y - CLIFF) < 1.5,
    onPlate: (q) => {
      const lx = q.x;
      const lz = q.z - DAIS.z;
      if (Math.abs(lz) > 1.3 || q.y < DAIS.y - 1.5) return 0;
      if (Math.abs(lx + 2.6) < 1.3) return -1;
      if (Math.abs(lx - 2.6) < 1.3) return 1;
      return 0;
    },
    onDais: (q) => Math.hypot(q.x, q.z - DAIS.z) <= DAIS.r && q.y > DAIS.y - 1.6,
    nearCard: (q) => Math.hypot(q.x, q.z - DAIS.z) < 2.4 && q.y > DAIS.y - 1.6,
  };
})();
