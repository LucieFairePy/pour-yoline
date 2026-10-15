// ♣ 7 · Le Caveau: an ascent split by roles, the Galerie des Sceaux (each player raises the
// other's bridge), then the Oracle's circular arena.
const Raid = (() => {
  const O = V3(-1400, 80, 0);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const { P } = K;
  const FLOOR = 6.6;
  const ARENA = V3(0, FLOOR, 155);
  const AR = 22;
  const SYMS = ['♥', '♣', '♦', '♠'];
  // real card colours: hearts and diamonds red, clubs and spades black (lit silver)
  const SCOL = ['#ff2a48', '#dfe6f2', '#ff5a2a', '#dfe6f2'];
  const INK = ['#e0102e', '#0c0c10', '#e8202a', '#0c0c10'];
  // Galerie des Sceaux: landing A, island, far landing (z ranges)
  const GAL = { a: [68, 76], island: [92, 100], far: [116, 124] };
  const LANE_X = { d: -4.5, v: 4.5 };
  const TILE_Z = { 1: [79, 84, 89], 2: [103, 108, 113] };
  // seal plates: which lane each one raises, and the kit that can hold it
  const SEALS = {
    door: { d: [-4, 61], v: [4, 61] },
    v1: { who: 'dame', at: [-4.5, 73] },
    d1: { who: 'valet', at: [4.5, 94] },
    v2: { who: 'dame', at: [-4.5, 98] },
    d2: { who: 'valet', at: [4.5, 118] },
  };
  let built = false;
  let screen = null;
  let card = null;
  let door = null;
  let doorB = null;
  let door2 = null;
  let door2B = null;
  let dome = null;
  let glyphs = null;
  let sentinel = null;
  let sweepM = null;
  let sweepT = 0;
  let warnT = 0;
  const pillars = [];
  const PADS = [P(7, 0, 4.2), P(7, 3.3, 9.4)];
  const PAD_TO = [P(7, 3.3, 7.9), P(7, 6.6, 12.6)];
  const padM = [];
  const rings = [];
  let crystals = null;
  const tiles = {};
  const seals = {};
  const lights = [];

  const runeTex = LvKit.tex(
    1024,
    1024,
    (g, w, h) => {
      LvKit.grain(g, w, h, '#1c2a2a', 0.1, 30000);
      g.strokeStyle = 'rgba(124,240,200,0.35)';
      g.lineWidth = 5;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.arc(w / 2, h / 2, 80 + i * 50, 0, TAU);
        g.stroke();
      }
      g.lineWidth = 2;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * TAU;
        g.beginPath();
        g.moveTo(w / 2 + Math.cos(a) * 130, h / 2 + Math.sin(a) * 130);
        g.lineTo(w / 2 + Math.cos(a) * 480, h / 2 + Math.sin(a) * 480);
        g.stroke();
      }
      g.fillStyle = 'rgba(124,240,200,0.5)';
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * TAU;
        g.save();
        g.translate(w / 2 + Math.cos(a) * 455, h / 2 + Math.sin(a) * 455);
        Icons.draw(g, Icons.of(SYMS[i % 4]), 0, 0, 44);
        g.restore();
      }
    },
    1,
    1,
  );
  // 1024² procedural surfaces, triplanar in world space (js/world/textures.js)
  const stone = Tex.mat('stone', { color: '#a2aeb2', scale: 3.5, bump: 1.2 });
  const marble = Tex.mat('marble', { color: '#d8e2e0', scale: 3, rough: 0.5 });
  const trim = Tex.mat('metal', {
    color: '#e0b868',
    metal: 1,
    rough: 0.8,
    scale: 1.5,
    emissive: '#2a1a04',
  });
  // the other player's bridge: you see it, but it does not hold you
  const ghostMarble = new THREE.MeshStandardMaterial({
    color: '#bfe6ff',
    transparent: true,
    opacity: 0.22,
    roughness: 0.3,
    depthWrite: false,
  });
  const dark = Tex.mat('rock', { color: '#3a4448', scale: 8, metal: 0.2, emissive: '#04100c' });

  const plat = (x, y, z, sx, sz, edge = '#7cf0c8', mat = stone) => {
    K.solid(x, y - 0.5, z, sx, 1, sz, mat);
    K.deco(new THREE.BoxGeometry(sx + 0.1, 0.06, sz + 0.1), LvKit.glow(edge, 0.9), x, y - 0.97, z);
    const under = K.deco(new THREE.ConeGeometry(Math.min(sx, sz) * 0.5, 3, 6), dark, x, y - 2.5, z);
    under.rotation.x = Math.PI;
  };

  const ring = (x, y, z) => {
    const m = K.deco(
      new THREE.TorusGeometry(0.65, 0.09, 10, 36),
      LvKit.glow('#ff5f8a', 2.4),
      x,
      y,
      z,
    );
    rings.push(m);
    return P(x, y, z);
  };

  const symTex = (i) =>
    LvKit.tex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      // a white glowing halo keeps the black suits readable against the dark sky
      g.shadowColor = INK[i] === '#0c0c10' ? '#ffffff' : '#ff4a5a';
      g.shadowBlur = 34;
      g.fillStyle = '#ffffff';
      Icons.draw(g, Icons.of(SYMS[i]), 128, 128, 196);
      g.shadowBlur = 0;
      g.fillStyle = INK[i];
      Icons.draw(g, Icons.of(SYMS[i]), 128, 128, 176);
    });
  const symCache = [];
  const symTexC = (i) => symCache[i] || (symCache[i] = symTex(i));
  const suitSprite = (s, size) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: symTexC(SYMS.indexOf(s)),
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

  // a round seal plate on the floor, with its suit floating above
  const seal = (name, x, z, who) => {
    const col = who === 'dame' ? '#ff5f8a' : '#6cc8ff';
    const m = K.deco(
      new THREE.CylinderGeometry(1.15, 1.25, 0.12, 36),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(0.5), toneMapped: false }),
      x,
      FLOOR + 0.06,
      z,
    );
    K.deco(new THREE.TorusGeometry(1.3, 0.06, 8, 48).rotateX(Math.PI / 2), trim, x, FLOOR + 0.1, z);
    const s = suitSprite(who === 'dame' ? '♥' : '♠', 1.1);
    s.position.copy(P(x, FLOOR + 1.6, z));
    group.add(s);
    seals[name] = { m, s, col: new THREE.Color(col), pos: P(x, FLOOR, z), who };
  };

  // bridge tile raised by the other player's seal; a faint outline shows where it will appear
  const tile = (lane, n, z) => {
    const x = LANE_X[lane];
    const col = lane === 'd' ? '#ff5f8a' : '#6cc8ff';
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 3), marble);
    m.position.copy(P(x, FLOOR - 0.3, z));
    group.add(m);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(3.08, 0.05, 3.08), LvKit.glow(col, 1.4));
    edge.position.copy(P(x, FLOOR - 0.6, z));
    group.add(edge);
    const ghost = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3, 0.6, 3)),
      new THREE.LineBasicMaterial({
        color: new THREE.Color(col).multiplyScalar(1.4),
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
      }),
    );
    ghost.position.copy(m.position);
    group.add(ghost);
    const b = Phys.box(O.x + x, O.y + FLOOR - 0.3, O.z + z, 3, 0.6, 3, { dyn: true });
    b.on = false;
    (tiles[lane + n] = tiles[lane + n] || []).push({ m, edge, ghost, b, k: 0, who: lane === 'd' ? 'dame' : 'valet' });
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    // start platform
    plat(0, 0, 0, 14, 12);
    // Dame route (left): long platforms, grapple rings over the gaps
    plat(-7, 2.5, 27, 6, 14, '#ff5f8a');
    ring(-7, 6.6, 21);
    ring(-7, 10.4, 49.5);
    // Valet route (right): high steps, double jump
    plat(7, 3.3, 8.2, 4, 4, '#6cc8ff');
    plat(7, 6.6, 12.4, 4, 4, '#6cc8ff');
    [18.5, 25, 31.5, 38, 44.5].forEach((z) => plat(7, FLOOR, z, 4, 4, '#6cc8ff'));
    PADS.forEach((pd) => {
      const m = K.deco(
        new THREE.CylinderGeometry(0.9, 1, 0.12, 28),
        LvKit.glow('#6cc8ff', 1.6),
        pd.x - O.x,
        pd.y + 0.06,
        pd.z - O.z,
      );
      const ar = K.deco(
        new THREE.ConeGeometry(0.35, 0.6, 4),
        LvKit.glow('#bfe6ff', 2),
        pd.x - O.x,
        pd.y + 1,
        pd.z - O.z,
      );
      padM.push({ m, ar });
    });
    // door platform + the two seals that open the vault
    plat(0, FLOOR, 57, 26, 18);
    seal('doorD', SEALS.door.d[0], SEALS.door.d[1], 'dame');
    seal('doorV', SEALS.door.v[0], SEALS.door.v[1], 'valet');
    // signs: suits on each route start
    [
      [-7, '♥'],
      [7, '♠'],
    ].forEach(([x, s]) => {
      const sp = suitSprite(s, 1.6);
      sp.position.copy(P(x, 2.4, 5));
      sp.rotation.y = Math.PI;
      group.add(sp);
    });
    const vaultDoor = (z) => {
      const d = new THREE.Group();
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 5, 0.8, 64).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({
          map: runeTex,
          color: '#c8d8d8',
          metalness: 0.7,
          roughness: 0.35,
          emissive: '#0a3a2a',
          emissiveMap: runeTex,
          emissiveIntensity: 1.2,
        }),
      );
      const rim = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.35, 12, 64), trim);
      d.add(disc, rim);
      d.position.copy(P(0, FLOOR + 5, z));
      group.add(d);
      K.solid(-9, FLOOR + 6, z + 0.3, 8, 12, 1.4, stone);
      K.solid(9, FLOOR + 6, z + 0.3, 8, 12, 1.4, stone);
      K.solid(0, FLOOR + 11, z + 0.3, 10, 2, 1.4, stone);
      return { d, b: Phys.box(O.x, O.y + FLOOR + 5, O.z + z, 10, 10, 1, { dyn: true }) };
    };
    const d1 = vaultDoor(66.2);
    door = d1.d;
    doorB = d1.b;
    // the door's walls run on, unseen, past the platform's edges (a double jump round their end
    // reached the gallery with the door still shut)
    [-1, 1].forEach((sd) => K.collider(sd * 17.5, FLOOR + 6, 66.5, 9, 30, 1.4, { tag: 'nocam' }));
    // ---- Galerie des Sceaux ----
    plat(0, FLOOR, 72, 14, 8);
    plat(0, FLOOR, 96, 14, 8);
    plat(0, FLOOR, 120, 14, 8);
    // landing rails: low walls on the outer sides so nobody slips off the landings
    [72, 96, 120].forEach((z) =>
      [-7.3, 7.3].forEach((x) => K.solid(x, FLOOR + 0.6, z, 0.6, 1.2, 8, trim)),
    );
    seal('v1', SEALS.v1.at[0], SEALS.v1.at[1], 'dame');
    seal('d1', SEALS.d1.at[0], SEALS.d1.at[1], 'valet');
    seal('v2', SEALS.v2.at[0], SEALS.v2.at[1], 'dame');
    seal('d2', SEALS.d2.at[0], SEALS.d2.at[1], 'valet');
    [1, 2].forEach((n) =>
      ['d', 'v'].forEach((lane) => TILE_Z[n].forEach((z) => tile(lane, n, z))),
    );
    // lane markers at each landing edge
    [
      [-4.5, 76.6, '♥'],
      [4.5, 76.6, '♠'],
      [-4.5, 100.6, '♥'],
      [4.5, 100.6, '♠'],
    ].forEach(([x, z, s]) => {
      const sp = suitSprite(s, 0.9);
      sp.rotation.x = -Math.PI / 2;
      sp.position.copy(P(x, FLOOR + 0.03, z - 1));
      group.add(sp);
    });
    // colonnade along the galerie (merged: one mesh per material)
    const colB = LvKit.batch();
    const colT = LvKit.batch();
    const colG = new THREE.CylinderGeometry(0.8, 1, 18, 16);
    const capG = new THREE.BoxGeometry(2.4, 0.6, 2.4);
    for (let z = 70; z <= 124; z += 9)
      [-11, 11].forEach((x) => {
        colB.add(colG, P(x, FLOOR + 3, z));
        colT.add(capG, P(x, FLOOR + 12.2, z));
        colT.add(capG, P(x, FLOOR - 6, z));
      });
    [-11, 11].forEach((x) => colT.add(new THREE.BoxGeometry(1.2, 1, 58), P(x, FLOOR + 12.8, 97)));
    group.add(colB.mesh(marble), colT.mesh(trim));
    // the island's sentinel: an eye that sweeps the island when you both stand on it
    sentinel = new THREE.Group();
    const sEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 32, 20),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#7cf0c8', emissiveIntensity: 0.6, roughness: 0.2 }),
    );
    const sLid = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.16, 12, 48), trim);
    const sPupil = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), LvKit.glow('#0c1414', 1));
    sPupil.position.z = 0.65;
    sentinel.add(sEye, sLid, sPupil);
    sentinel.userData = { eye: sEye };
    sentinel.position.copy(P(0, FLOOR + 7.5, 96));
    group.add(sentinel);
    sweepM = new THREE.Mesh(
      new THREE.BoxGeometry(14, 3, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff2a5a').multiplyScalar(1.6),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sweepM.position.copy(P(0, FLOOR + 1.5, 96));
    group.add(sweepM);
    const d2 = vaultDoor(125.6);
    door2 = d2.d;
    door2B = d2.b;
    // bridge to the arena
    plat(0, FLOOR, 130, 6, 8);
    [-3.3, 3.3].forEach((x) => K.solid(x, FLOOR + 0.5, 130, 0.5, 1, 8, trim));
    // arena: a round platform made of rings of boxes
    const floorG = new THREE.CylinderGeometry(AR, AR * 0.92, 1, 96);
    const fl = K.deco(
      floorG,
      new THREE.MeshStandardMaterial({
        map: runeTex,
        color: '#8a9a9c',
        roughness: 0.6,
        metalness: 0.3,
        emissive: '#06221a',
        emissiveMap: runeTex,
        emissiveIntensity: 0.8,
      }),
      0,
      FLOOR - 0.5,
      ARENA.z,
    );
    fl.material.map.repeat.set(1, 1);
    for (let i = -AR; i < AR; i += 2)
      for (let j = -AR; j < AR; j += 2) {
        const cx = i + 1;
        const cz = j + 1;
        const r = Math.hypot(Math.abs(cx) + 1, Math.abs(cz) + 1);
        if (r < AR) K.collider(cx, FLOOR - 0.5, ARENA.z + cz, 2, 1, 2);
        else if (Math.hypot(cx, cz) < AR - 0.6) K.collider(cx, FLOOR - 0.5, ARENA.z + cz, 2, 1, 2);
      }
    K.deco(
      new THREE.TorusGeometry(AR, 0.12, 8, 160).rotateX(Math.PI / 2),
      LvKit.glow('#7cf0c8', 1.4),
      0,
      FLOOR + 0.02,
      ARENA.z,
    );
    // inner ring of the arena floor under the Oracle
    K.deco(
      new THREE.TorusGeometry(7.2, 0.1, 8, 96).rotateX(Math.PI / 2),
      LvKit.glow('#ffcf8a', 1.6),
      0,
      FLOOR + 0.04,
      ARENA.z,
    );
    K.deco(new THREE.ConeGeometry(AR * 0.9, 16, 48), dark, 0, FLOOR - 9, ARENA.z).rotation.x =
      Math.PI;
    // parapet + faint energy curtain around the arena (opening on the bridge side)
    const SEG = 56;
    const curtain = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7cf0c8').multiplyScalar(1.2),
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    // the parapet drawn as one curved wall, open on the bridge (-z) side
    const GAP = 0.166;
    const arc = (r, h) => new THREE.CylinderGeometry(r, r, h, 160, 1, true, Math.PI + GAP, TAU - GAP * 2);
    // the inner face looks inward: flip its triangles and normals
    const inward = (g) => {
      const ix = g.index.array;
      for (let k = 0; k < ix.length; k += 3) [ix[k + 1], ix[k + 2]] = [ix[k + 2], ix[k + 1]];
      const n = g.attributes.normal.array;
      for (let k = 0; k < n.length; k++) n[k] = -n[k];
      return g;
    };
    const para = LvKit.batch();
    para.add(inward(arc(AR, 1.1)), P(0, FLOOR + 0.55, ARENA.z));
    para.add(arc(AR + 0.6, 1.1), P(0, FLOOR + 0.55, ARENA.z));
    para.add(
      new THREE.RingGeometry(AR, AR + 0.6, 160, 1, Math.PI / 2 + GAP, TAU - GAP * 2).rotateX(-Math.PI / 2),
      P(0, FLOOR + 1.1, ARENA.z),
    );
    group.add(para.mesh(stone));
    K.deco(
      new THREE.TorusGeometry(AR + 0.3, 0.07, 6, 160, TAU - GAP * 2)
        .rotateX(Math.PI / 2)
        .rotateY(Math.PI / 2 - GAP),
      trim,
      0,
      FLOOR + 1.13,
      ARENA.z,
    );
    const curt = new THREE.Mesh(arc(AR + 0.3, 3), curtain);
    curt.position.copy(P(0, FLOOR + 2.6, ARENA.z));
    group.add(curt);
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * TAU;
      const x = Math.sin(a) * (AR + 0.3);
      const z = -Math.cos(a) * (AR + 0.3);
      // bridge enters from -z (a = 0)
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.16) continue;
      // collider boxes are axis aligned: a short column per segment
      K.collider(x, FLOOR + 2, ARENA.z + z, 2.6, 4, 2.6);
    }
    // four pillar slots at N/E/S/W; the suit on each slot can move (x.perm)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const x = Math.sin(a) * 15;
      const z = ARENA.z - Math.cos(a) * 15;
      K.solid(x, FLOOR + 3, z, 2, 6, 2, marble);
      K.deco(new THREE.BoxGeometry(2.4, 0.3, 2.4), trim, x, FLOOR + 6.1, z);
      K.deco(new THREE.BoxGeometry(2.4, 0.3, 2.4), trim, x, FLOOR + 0.15, z);
      const glyph = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshBasicMaterial({
          map: symTex(i),
          transparent: true,
          toneMapped: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      glyph.position.copy(P(x, FLOOR + 8, z));
      group.add(glyph);
      const px = x * 0.82;
      const pz = ARENA.z + (z - ARENA.z) * 0.82;
      const plate = K.deco(
        new THREE.CylinderGeometry(1.2, 1.2, 0.1, 28),
        new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
        px,
        FLOOR + 0.05,
        pz,
      );
      const beam = K.deco(
        new THREE.CylinderGeometry(0.5, 0.5, 30, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
        x,
        FLOOR + 21,
        z,
      );
      pillars.push({
        i,
        glyph,
        plate,
        beam,
        top: P(x, FLOOR + 8, z),
        pos: P(px, FLOOR, pz),
        sym: i,
        cur: P(x, FLOOR + 8, z),
      });
    }
    // sequence glyphs above the Oracle (seer only)
    glyphs = new THREE.Group();
    group.add(glyphs);
    // Égide dome
    dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 40, 24, 0, TAU, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#6cc8ff').multiplyScalar(1.3),
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    dome.visible = false;
    R.scene.add(dome);
    // distant rock spires rising from the abyss, stalactites hanging from the vault (merged)
    const r = rng(52);
    const spires = LvKit.batch();
    const spire = new THREE.ConeGeometry(1, 1, 7);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const rr = 70 + r() * 30;
      const h = 30 + r() * 50;
      const w = 4 + r() * 5;
      spires.add(spire, P(Math.cos(a) * rr, h / 2 - 40, 95 + Math.sin(a) * rr * 1.3), [0, r() * 3, 0], [w, h, w]);
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU;
      const rr = 40 + r() * 110;
      const h = 20 + r() * 50;
      const w = 3 + r() * 6;
      spires.add(spire, P(Math.cos(a) * rr, 95 - h / 2 + r() * 20, 95 + Math.sin(a) * rr), [Math.PI, r() * 3, 0], [w, h, w]);
    }
    group.add(spires.mesh(dark));
    dress();
    lights.push(LvKit.light(group, P(0, FLOOR + 6, 96), '#7cf0c8', 1.2, 30));
    lights.push(LvKit.light(group, P(0, FLOOR + 10, 140), '#ffcf8a', 1.2, 40));
    card = LvKit.trialCard('cR', false);
    card.position.copy(P(0, FLOOR + 2.2, ARENA.z));
    group.add(card);
    screen = makeScreen(18, 7, 1024);
    screen.mesh.position.copy(P(0, FLOOR + 14, 66));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
  };

  // ---------- set dressing: no colliders; under the floors, outside the arena, in the air ----------
  const amb = { haze: new THREE.Color('#071210'), sky: null, motes: null };
  const dress = () => {
    const r = rng(907);
    // glowing crystal clusters growing on the rock under the floors
    const cr = LvKit.batch();
    const shard = new THREE.OctahedronGeometry(1, 0);
    [
      [0, 0, 14, 12, 0], [-7, 27, 6, 14, 2.5], [7, 25, 4, 30, FLOOR], [0, 57, 26, 18, FLOOR],
      [0, 72, 14, 8, FLOOR], [0, 96, 14, 8, FLOOR], [0, 120, 14, 8, FLOOR], [0, ARENA.z, 40, 40, FLOOR],
    ].forEach(([cx, cz, w, d, y]) => {
      for (let i = 0; i < Math.ceil((w * d) / 40) + 3; i++) {
        const k = 0.3 + r() * 0.7;
        cr.add(
          shard,
          P(cx + (r() - 0.5) * w * 0.7, y - 1.6 - r() * 2.5, cz + (r() - 0.5) * d * 0.7),
          [r() * 0.8 - 0.4 + Math.PI, r() * 3, r() * 0.8 - 0.4],
          [k * 0.35, k * 1.6, k * 0.35],
        );
      }
    });
    crystals = cr.mesh(LvKit.glow('#7cf0c8', 1.5));
    group.add(crystals);
    // obelisks with gold runes round the arena, outside its parapet
    const ob = LvKit.batch();
    const runeB = LvKit.batch();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + TAU / 16;
      const x = Math.sin(a) * (AR + 5);
      const z = ARENA.z - Math.cos(a) * (AR + 5);
      ob.add(new THREE.CylinderGeometry(0.9, 1.6, 16, 4), P(x, FLOOR + 4, z), [0, -a + Math.PI / 4, 0]);
      ob.add(new THREE.ConeGeometry(1.1, 2.4, 4), P(x, FLOOR + 13.2, z), [0, -a + Math.PI / 4, 0]);
      ob.add(new THREE.ConeGeometry(2, 10, 6), P(x, FLOOR - 9, z), [Math.PI, 0, 0]);
      for (let k = 0; k < 5; k++)
        runeB.add(new THREE.BoxGeometry(0.5, 0.12, 0.06), P(x - Math.sin(a) * 0.95, FLOOR + 2 + k * 1.6, z + Math.cos(a) * 0.95), [0, -a, 0]);
    }
    group.add(ob.mesh(stone), runeB.mesh(LvKit.glow('#ffcf8a', 2)));
    // hanging chains of lanterns along the galerie's colonnade
    const lan = LvKit.batch();
    const lanG = LvKit.batch();
    for (let z = 74.5; z <= 120; z += 9)
      [-11, 11].forEach((x) => {
        lan.add(new THREE.BoxGeometry(0.04, 5, 0.04), P(x * 0.86, FLOOR + 10.2, z));
        lan.add(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 6), P(x * 0.86, FLOOR + 7.4, z));
        lanG.add(new THREE.SphereGeometry(0.18, 8, 6), P(x * 0.86, FLOOR + 7.35, z));
      });
    group.add(lan.mesh(trim), lanG.mesh(LvKit.glow('#ffd28a', 2.2)));
    LvKit.light(group, P(0, 4, 2), '#7cf0c8', 1.0, 22);
    LvKit.light(group, P(0, FLOOR + 6, 57), '#ffcf8a', 1.1, 24);
    LvKit.light(group, P(-12, FLOOR + 5, ARENA.z + 8), '#7cf0c8', 1.0, 26);
    LvKit.light(group, P(12, FLOOR + 5, ARENA.z - 8), '#7cf0c8', 1.0, 26);
    amb.sky = LvKit.sky({
      hor: '#041012',
      zen: '#010203',
      cloud: '#0a1e1c',
      cloudK: 0.5,
      stars: 0.25,
      glow: '#082a22',
      glowDir: V3(0, 0.1, 1),
    });
    amb.motes = LvKit.motes({
      n: 520,
      size: 2.2,
      colors: ['#7cf0c8', '#ffcf8a'],
      rise: [-0.1, 0.25],
      sway: 1.2,
      box: [50, 20],
      alpha: 0.65,
      below: 6,
      seed: 52,
    });
  };

  const glyphCache = [];
  const showSeq = (seq, prog, visible, t) => {
    if (!glyphCache.length)
      for (let i = 0; i < 4; i++)
        glyphCache.push(
          new THREE.MeshBasicMaterial({
            map: symTexC(i),
            transparent: true,
            toneMapped: false,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
    while (glyphs.children.length > seq.length)
      glyphs.remove(glyphs.children[glyphs.children.length - 1]);
    while (glyphs.children.length < seq.length)
      glyphs.add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glyphCache[0]));
    glyphs.visible = visible;
    seq.forEach((s, k) => {
      const m = glyphs.children[k];
      m.material = glyphCache[s];
      m.position.copy(
        P((k - (seq.length - 1) / 2) * 3, FLOOR + 18.5 + Math.sin(t * 2 + k) * 0.2, ARENA.z),
      );
      m.quaternion.copy(R.camera.quaternion);
      m.scale.setScalar(k === prog ? 1.25 + Math.sin(t * 6) * 0.08 : k < prog ? 0.7 : 1);
      m.material.opacity = k < prog ? 0.35 : 1;
    });
  };

  const onSeal = (name, q) => {
    const sl = seals[name];
    const lq = K.rel(sl.pos);
    return Math.hypot(q.x - lq.x, q.z - lq.z) < 1.4 && Math.abs(q.y - FLOOR) < 0.7;
  };
  const inZ = (q, r) => q.z > r[0] && q.z < r[1] && Math.abs(q.x) < 7.2 && q.y > FLOOR - 0.6;
  const tmpC = new THREE.Color();

  return {
    O,
    P,
    FLOOR,
    SYMS,
    build,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    pillars,
    rel: K.rel,
    rings: () => [P(-7, 6.6, 21), P(-7, 10.4, 49.5)],
    onPad(p) {
      return PADS.findIndex(
        (pd) => Math.hypot(p.x - pd.x, p.z - pd.z) < 0.85 && Math.abs(p.y - pd.y) < 0.3,
      );
    },
    padTo: (i) => PAD_TO[i].clone(),
    spawn(stage, who) {
      const s = who === 'dame' ? -1.5 : 1.5;
      if (stage >= 3) return P(s, FLOOR, 130);
      if (stage === 2) return P(who === 'dame' ? -4.5 : 4.5, FLOOR, 70);
      return P(who === 'dame' ? -4 : 4, 0, 1);
    },
    // stage-2 checkpoints: the last landing you stood on
    zoneOf(q) {
      if (inZ(q, GAL.far)) return 'far';
      if (inZ(q, GAL.island)) return 'island';
      if (inZ(q, GAL.a)) return 'a';
      return null;
    },
    zoneSpawn(z, who) {
      const zz = { a: 70.5, island: 95, far: 121 }[z];
      return P(who === 'dame' ? -2.5 : 2.5, FLOOR, zz);
    },
    onSeal,
    // the vault's own light: a teal cavern, a sky of its own, drifting sparks (restored on exit)
    mood(on) {
      if (!on || !built) return LvKit.mood(null);
      LvKit.mood({
        sky: '#c8dcd6',
        ground: '#141c1a',
        hemi: 0.45,
        sun: '#fff4e0',
        sunI: 0.55,
        exposure: 1.3,
        haze: amb.haze,
        extras: [amb.sky, amb.motes],
      });
    },
    sealOf: (lane) => SEALS[lane],
    onDoor: (q) => q.z > 48.5 && q.z < 66 && Math.abs(q.x) < 13 && q.y > FLOOR - 0.6,
    onFar: (q) => inZ(q, GAL.far),
    onIsland: (q) => inZ(q, GAL.island),
    inArena: (q) => Math.hypot(q.x, q.z - ARENA.z) < AR - 1 && q.y > FLOOR - 0.6,
    arenaPos: (x, z) => P(x, FLOOR, ARENA.z + z),
    oraclePos: () => P(0, FLOOR, ARENA.z),
    // returns the SLOT index; the suit on it is x.perm[slot]
    nearPillar(q) {
      for (const p of pillars) {
        const lq = K.rel(p.pos);
        if (Math.hypot(q.x - lq.x, q.z - lq.z) < 1.9 && Math.abs(q.y - FLOOR) < 1) return p.i;
      }
      return -1;
    },
    nearCard: (q) => Math.hypot(q.x, q.z - ARENA.z) < 3.5,
    setDome(on, pos) {
      dome.visible = on;
      if (on) dome.position.copy(pos);
    },
    domeCovers(pos, center) {
      return Math.hypot(pos.x - center.x, pos.z - center.z) < 3.4;
    },
    // island sentinel: warn (charge) then sweep
    warn() {
      warnT = 2.2;
    },
    sweep() {
      sweepT = 0.6;
      warnT = 0;
    },
    update(dt, t, x, seer) {
      if (!built) return;
      screen.update(dt, t);
      // the screen follows the players: above the vault door, then behind the Oracle
      if (x.stage >= 3) {
        screen.mesh.position.copy(P(0, FLOOR + 17, ARENA.z + 24));
        screen.mesh.rotation.y = Math.PI;
      } else screen.mesh.position.copy(P(0, FLOOR + 14, 66));
      const open = x.stage >= 2;
      door.position.y = damp(door.position.y, O.y + FLOOR + (open ? 15 : 5), 1.5, dt);
      door.rotation.z += dt * (open ? 0.6 : 0.05);
      doorB.on = !open;
      const open2 = x.stage >= 3;
      door2.position.y = damp(door2.position.y, O.y + FLOOR + (open2 ? 15 : 5), 1.5, dt);
      door2.rotation.z += dt * (open2 ? 0.6 : 0.05);
      door2B.on = !open2;
      padM.forEach((pm, i) => {
        pm.ar.position.y = PADS[i].y + 1 + Math.sin(t * 3 + i) * 0.2;
        pm.ar.rotation.y = t * 2;
        pm.m.material.color.setRGB(0.42, 0.78, 1).multiplyScalar(1.3 + Math.sin(t * 4 + i) * 0.4);
      });
      rings.forEach((m, i) => {
        m.rotation.y = t * 1.2 + i;
        m.visible = x.stage < 2;
      });
      // seals: lit while held (x.held) or done (x.latch)
      const held = x.held || [];
      const latch = x.latch || [];
      Object.entries(seals).forEach(([name, sl]) => {
        const on = held.includes(name) || latch.includes(name) || (name.startsWith('door') && x.stage >= 2);
        sl.m.material.color.copy(sl.col).multiplyScalar(on ? 1.3 : 0.35 + Math.sin(t * 3) * 0.1);
        sl.s.rotation.y = t * 1.5;
        sl.s.position.y = O.y + FLOOR + 1.6 + Math.sin(t * 2) * 0.12;
      });
      // tiles: solid while their seal is held, or once the lane has been crossed
      Object.entries(tiles).forEach(([lane, list]) => {
        const on = held.includes(lane) || latch.includes(lane) || x.stage >= 3;
        list.forEach((tl, k) => {
          // a short stagger so the bridge visibly builds itself toward the walker
          tl.k = damp(tl.k, on ? 1 : 0, on ? 9 - k * 2 : 14, dt);
          // each lane only carries its own walker (Phys is local to each player)
          const mine = tl.who === Story.role;
          tl.b.on = on && mine;
          tl.m.material = mine ? marble : ghostMarble;
          tl.m.visible = tl.k > 0.02;
          tl.m.scale.set(1, Math.max(0.05, tl.k), 1);
          tl.edge.visible = tl.k > 0.02;
          tl.ghost.material.opacity = (1 - tl.k) * (0.25 + Math.sin(t * 3 + k) * 0.1);
        });
      });
      // sentinel tracks the camera; charge glow and sweep flash
      if (sentinel) {
        sentinel.lookAt(R.camera.position);
        warnT = Math.max(0, warnT - dt);
        sweepT = Math.max(0, sweepT - dt);
        const e = sentinel.userData.eye.material;
        e.emissive.set(warnT > 0 ? '#ff2a5a' : '#7cf0c8');
        e.emissiveIntensity = warnT > 0 ? 1 + (2.2 - warnT) * 1.6 + Math.sin(t * 30) * 0.3 : 0.6;
        sweepM.material.opacity = warnT > 0 ? 0.06 + Math.sin(t * 12) * 0.04 : sweepT > 0 ? sweepT : 0;
        sweepM.scale.x = sweepT > 0 ? 1 : 1;
        sentinel.visible = x.stage === 2;
      }
      // pillars: each slot shows the suit x.perm[slot]; glyphs glide when the suits move
      const perm = x.perm || [0, 1, 2, 3];
      pillars.forEach((p) => {
        const sym = perm[p.i];
        if (p.sym !== sym) {
          p.sym = sym;
          p.glyph.material.map = symTexC(sym);
          p.glyph.material.needsUpdate = true;
          p.glyph.scale.setScalar(0.01);
        }
        p.glyph.scale.setScalar(damp(p.glyph.scale.x, 1, 5, dt));
        const lit = (x.lit || []).includes(sym);
        tmpC.set(SCOL[sym]);
        p.plate.material.color.copy(tmpC).multiplyScalar(lit ? 2 : 0.45 + Math.sin(t * 2 + p.i) * 0.1);
        p.beam.material.color.copy(tmpC).multiplyScalar(1.5);
        p.beam.material.opacity = damp(p.beam.material.opacity, lit ? 0.35 : 0, 5, dt);
        p.glyph.rotation.y = t * 0.8 + p.i;
      });
      showSeq(x.seq || [], x.prog || 0, !!seer && x.ritual && x.stage === 4, t);
      LvKit.tick(t);
      crystals.material.color.setRGB(0.49, 0.94, 0.78).multiplyScalar(1.5 + Math.sin(t * 1.3) * 0.25);
      card.visible = x.stage >= 5;
      card.rotation.y = t * 1.3;
      if (card.visible) card.position.y = O.y + FLOOR + 2.2 + Math.sin(t * 2) * 0.15;
    },
  };
})();
