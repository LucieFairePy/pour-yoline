// ♣ R · Le Caveau: an ascent split by roles, then the Oracle's circular arena.
const Raid = (() => {
  const O = V3(-1400, 80, 0);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const { P } = K;
  const FLOOR = 6.6;
  const ARENA = V3(0, FLOOR, 96);
  const AR = 22;
  const SYMS = ['♥', '♣', '♦', '♠'];
  // real card colours: hearts and diamonds red, clubs and spades black (lit silver)
  const SCOL = ['#ff2a48', '#dfe6f2', '#ff5a2a', '#dfe6f2'];
  const INK = ['#e0102e', '#0c0c10', '#e8202a', '#0c0c10'];
  let built = false;
  let screen = null;
  let card = null;
  let door = null;
  let doorB = null;
  let dome = null;
  let glyphs = null;
  const pillars = [];
  const PADS = [P(7, 0, 4.2), P(7, 3.3, 9.4)];
  const PAD_TO = [P(7, 3.3, 7.9), P(7, 6.6, 12.6)];
  const padM = [];
  const rings = [];
  const motes = [];

  const runeTex = LvKit.tex(
    512,
    512,
    (g, w, h) => {
      LvKit.grain(g, w, h, '#1c2a2a', 0.1, 8000);
      g.strokeStyle = 'rgba(124,240,200,0.35)';
      g.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.arc(w / 2, h / 2, 40 + i * 28, 0, TAU);
        g.stroke();
      }
      g.font = '40px Georgia';
      g.fillStyle = 'rgba(124,240,200,0.5)';
      g.textAlign = 'center';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        Icons.fillText(g, SYMS[i % 4], w / 2 + Math.cos(a) * 230, h / 2 + Math.sin(a) * 230 + 14);
      }
    },
    1,
    1,
  );
  // 1024² procedural surfaces, triplanar in world space (js/world/textures.js)
  const stone = Tex.mat('stone', { color: '#a2aeb2', scale: 3.5, bump: 1.2 });
  const trim = Tex.mat('metal', {
    color: '#e0b868',
    metal: 1,
    rough: 0.8,
    scale: 1.5,
    emissive: '#2a1a04',
  });
  const dark = Tex.mat('rock', { color: '#3a4448', scale: 8, metal: 0.2, emissive: '#04100c' });

  const plat = (x, y, z, sx, sz, edge = '#7cf0c8') => {
    K.solid(x, y - 0.5, z, sx, 1, sz, stone);
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
    // door platform
    plat(0, FLOOR, 57, 26, 18);
    // signs: suits on each route start
    [
      [-7, '♥', '#e0102e'],
      [7, '♠', '#0c0c10'],
    ].forEach(([x, s, c]) => {
      const sp = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({
          map: LvKit.tex(256, 256, (g) => {
            g.shadowColor = '#ffffff';
            g.shadowBlur = 24;
            g.fillStyle = '#ffffff';
            Icons.draw(g, Icons.of(s), 128, 128, 190);
            g.shadowBlur = 0;
            g.fillStyle = c;
            Icons.draw(g, Icons.of(s), 128, 128, 170);
          }),
          transparent: true,
          toneMapped: false,
          depthWrite: false,
        }),
      );
      sp.position.copy(P(x, 2.4, 5));
      sp.rotation.y = Math.PI;
      group.add(sp);
    });
    // vault door
    door = new THREE.Group();
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
    door.add(disc, rim);
    door.position.copy(P(0, FLOOR + 5, 66.2));
    group.add(door);
    doorB = Phys.box(O.x, O.y + FLOOR + 5, O.z + 66.2, 10, 10, 1, { dyn: true });
    K.solid(-9, FLOOR + 6, 66.5, 8, 12, 1.4, stone);
    K.solid(9, FLOOR + 6, 66.5, 8, 12, 1.4, stone);
    K.solid(0, FLOOR + 11, 66.5, 10, 2, 1.4, stone);
    // bridge to the arena
    plat(0, FLOOR, 70.5, 6, 8);
    // arena: a round platform made of rings of boxes
    const floorG = new THREE.CylinderGeometry(AR, AR * 0.92, 1, 72);
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
      new THREE.TorusGeometry(AR, 0.12, 8, 128).rotateX(Math.PI / 2),
      LvKit.glow('#7cf0c8', 1.4),
      0,
      FLOOR + 0.02,
      ARENA.z,
    );
    K.deco(new THREE.ConeGeometry(AR * 0.9, 16, 36), dark, 0, FLOOR - 9, ARENA.z).rotation.x =
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
    const segLen = ((TAU * AR) / SEG) * 1.04;
    const wallG = new THREE.BoxGeometry(segLen, 1.1, 0.6);
    const curtG = new THREE.PlaneGeometry(segLen, 3);
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * TAU;
      const x = Math.sin(a) * (AR + 0.3);
      const z = -Math.cos(a) * (AR + 0.3);
      // bridge enters from -z (a = 0)
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.16) continue;
      const w = K.deco(wallG, stone, x, FLOOR + 0.55, ARENA.z + z);
      w.rotation.y = -a;
      const c = K.deco(curtG, curtain, x, FLOOR + 2.6, ARENA.z + z);
      c.rotation.y = -a;
      // collider boxes are axis aligned: a short column per segment
      K.collider(x, FLOOR + 2, ARENA.z + z, 2.6, 4, 2.6);
    }
    // symbol pillars at N/E/S/W
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const x = Math.sin(a) * 15;
      const z = ARENA.z - Math.cos(a) * 15;
      K.solid(x, FLOOR + 3, z, 2, 6, 2, stone);
      K.deco(new THREE.BoxGeometry(2.2, 0.3, 2.2), trim, x, FLOOR + 6.1, z);
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
      const plate = K.deco(
        new THREE.CylinderGeometry(1.2, 1.2, 0.1, 28),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(SCOL[i]).multiplyScalar(0.4),
          toneMapped: false,
        }),
        x * 0.82,
        FLOOR + 0.05,
        ARENA.z + (z - ARENA.z) * 0.82,
      );
      const beam = K.deco(
        new THREE.CylinderGeometry(0.5, 0.5, 30, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(SCOL[i]).multiplyScalar(1.5),
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
        pos: P(x * 0.82, FLOOR, ARENA.z + (z - ARENA.z) * 0.82),
        col: new THREE.Color(SCOL[i]),
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
    // floating motes
    const r = rng(52);
    for (let i = 0; i < 60; i++) {
      const m = K.deco(
        new THREE.OctahedronGeometry(0.08 + r() * 0.12),
        LvKit.glow(r() < 0.5 ? '#7cf0c8' : '#ffcf8a', 2),
        (r() - 0.5) * 60,
        r() * 30,
        r() * 130,
      );
      motes.push({ m, y0: m.position.y, ph: r() * 10 });
    }
    // distant monoliths
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      const rr = 60 + r() * 30;
      const h = 20 + r() * 40;
      K.deco(
        new THREE.BoxGeometry(4 + r() * 4, h, 4 + r() * 4),
        dark,
        Math.cos(a) * rr,
        h / 2 - 20,
        60 + Math.sin(a) * rr,
      );
    }
    card = LvKit.card('R', '♣', false);
    card.position.copy(P(0, FLOOR + 2.2, ARENA.z));
    group.add(card);
    screen = makeScreen(18, 7, 1024);
    screen.mesh.position.copy(P(0, FLOOR + 14, 66));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
  };

  const glyphCache = [];
  const showSeq = (seq, prog, visible, t) => {
    if (!glyphCache.length)
      for (let i = 0; i < 4; i++)
        glyphCache.push(
          new THREE.MeshBasicMaterial({
            map: symTex(i),
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
        P((k - (seq.length - 1) / 2) * 3, FLOOR + 15.5 + Math.sin(t * 2 + k) * 0.2, ARENA.z),
      );
      m.quaternion.copy(R.camera.quaternion);
      m.scale.setScalar(k === prog ? 1.25 + Math.sin(t * 6) * 0.08 : k < prog ? 0.7 : 1);
      m.material.opacity = k < prog ? 0.35 : 1;
    });
  };

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
      if (stage >= 2) return P(s, FLOOR, 72);
      return P(who === 'dame' ? -4 : 4, 0, 1);
    },
    onDoor: (q) => q.z > 48.5 && q.z < 66 && Math.abs(q.x) < 13 && q.y > FLOOR - 0.6,
    inArena: (q) => Math.hypot(q.x, q.z - ARENA.z) < AR - 1 && q.y > FLOOR - 0.6,
    arenaPos: (x, z) => P(x, FLOOR, ARENA.z + z),
    oraclePos: () => P(0, FLOOR, ARENA.z),
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
    update(dt, t, x, seer) {
      if (!built) return;
      screen.update(dt, t);
      const open = x.stage >= 2;
      door.position.y = damp(door.position.y, O.y + FLOOR + (open ? 15 : 5), 1.5, dt);
      door.rotation.z += dt * (open ? 0.6 : 0.05);
      doorB.on = !open;
      padM.forEach((pm, i) => {
        pm.ar.position.y = PADS[i].y + 1 + Math.sin(t * 3 + i) * 0.2;
        pm.ar.rotation.y = t * 2;
        pm.m.material.color.setRGB(0.42, 0.78, 1).multiplyScalar(1.3 + Math.sin(t * 4 + i) * 0.4);
      });
      rings.forEach((m, i) => {
        m.rotation.y = t * 1.2 + i;
        m.visible = x.stage < 2;
      });
      pillars.forEach((p) => {
        const lit = (x.lit || []).includes(p.i);
        p.plate.material.color
          .copy(p.col)
          .multiplyScalar(lit ? 2 : 0.45 + Math.sin(t * 2 + p.i) * 0.1);
        p.beam.material.opacity = damp(p.beam.material.opacity, lit ? 0.35 : 0, 5, dt);
        p.glyph.rotation.y = t * 0.8 + p.i;
      });
      showSeq(x.seq || [], x.prog || 0, !!seer && x.ritual && x.stage === 3, t);
      motes.forEach((mo) => (mo.m.position.y = mo.y0 + Math.sin(t * 0.6 + mo.ph) * 0.6));
      card.visible = x.stage >= 5;
      card.rotation.y = t * 1.3;
      if (card.visible) card.position.y = O.y + FLOOR + 2.2 + Math.sin(t * 2) * 0.15;
    },
  };
})();
