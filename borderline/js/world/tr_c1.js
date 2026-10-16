// ♣ 3 · Le Câble. A floating cable works above a sea of clouds: the two astronauts are tied
// together by a glowing cable and cross it as one. Course along +z:
//   atrium (z -6..22) · the 2.95 m wall · the chasm with the alcove under its edge (z 34..48)
//   · crumbling ledges (z 54..91) · the pulley over a deep well (z 92..132)
//   · the collapsing bridge (z 132..196) · the card (z 196..214).
const TrC1 = (() => {
  const O = V3(700, 0, 2800);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const glow = LvKit.glow;
  const UP = 2.95;
  const TOP = 15;
  const W = { x: 0, y: 17.6, z: 116 }; // top of the pulley wheel (relative)
  const LEDGES = [58.3, 64.1, 69.9, 75.7, 81.5, 87.3].map((z, i) => ({
    x: i % 2 ? 1.5 : -1.5,
    z,
  }));
  const LEDGE = 3.0;
  const BR0 = 132;
  const BR1 = 196;
  const GAPS = new Set([141, 142, 151, 152, 153, 163, 171, 172, 183, 184]);
  let built = false;
  let mats = null;
  const ledges = [];
  const planks = [];
  let bridgeSegs = [];
  let lever = null;
  let wheel = null;
  let card = null;
  let cloudU = null;
  let cable = null;
  let anchorFx = null;
  let clips = null;
  let windFx = null;
  const tmp = V3();
  const tmp2 = V3();

  const mk = () => ({
    // moderate metalness: without an environment map, full metal renders black
    dark: Tex.mat('metal', { color: '#4a4558', scale: 2, metal: 0.35, rough: 0.5 }),
    steel: Tex.mat('metal', { color: '#a8a3b6', scale: 1.5, metal: 0.4, rough: 0.4 }),
    conc: Tex.mat('concrete', { color: '#6a6373', scale: 3 }),
    stone: Tex.mat('stone', { color: '#574e60', scale: 3.5 }),
    rock: Tex.mat('rock', { color: '#4a4152', scale: 5 }),
    wood: Tex.mat('wood', { color: '#6e4a34', scale: 1.1 }),
    tile: Tex.mat('marble', { color: '#7a6f86', scale: 6 }),
    brass: Tex.mat('metal', { color: '#d4ad5a', scale: 1, metal: 0.45, rough: 0.35, emissive: '#3a2a10' }),
    pink: glow('#ff5f8a', 1.6),
    teal: glow('#4fd1b5', 1.5),
    gold: glow('#ffcf8a', 0.85),
  });

  const solid = (x, y, z, sx, sy, sz, mat, opt) => K.solid(x, y, z, sx, sy, sz, mat || mats.conc, opt);
  // a slab whose top surface is at height top
  const slab = (x, top, z, sx, sz, depth, mat) =>
    solid(x, top - depth / 2, z, sx, depth, sz, mat);
  const trim = (x, y, z, sx, sy, sz, mat) => K.deco(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z);

  // glowing hexagonal anchor plate (decor): where the cable likes to be anchored
  const anchorPlate = (x, top, z) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.08, 6), mats.steel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 6), mats.teal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(base, ring);
    for (let i = 0; i < 6; i++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), mats.brass);
      bolt.position.set(Math.cos((i / 6) * TAU) * 0.78, 0.07, Math.sin((i / 6) * TAU) * 0.78);
      g.add(bolt);
    }
    g.position.copy(P(x, top + 0.04, z));
    group.add(g);
  };

  // safety rails along an edge (decor + a low collider at the sides only)
  const railRun = (x, top, z0, z1) => {
    const n = Math.max(2, Math.round((z1 - z0) / 2.5));
    for (let i = 0; i <= n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      trim(x, top + 0.55, z, 0.09, 1.1, 0.09, mats.steel);
    }
    trim(x, top + 1.08, (z0 + z1) / 2, 0.07, 0.07, z1 - z0, mats.brass);
    trim(x, top + 0.6, (z0 + z1) / 2, 0.05, 0.05, z1 - z0, mats.steel);
  };

  // side walls of the course: tall riveted panels with a pink light strip
  const sideWalls = (z0, z1, bottom, top) => {
    [-1, 1].forEach((s) => {
      solid(s * 7.6, (bottom + top) / 2, (z0 + z1) / 2, 1.2, top - bottom, z1 - z0, mats.dark);
      trim(s * 7.0, bottom + 1.0, (z0 + z1) / 2, 0.06, 0.1, z1 - z0, mats.pink);
      for (let z = z0 + 2; z < z1; z += 4) trim(s * 7.02, (bottom + top) / 2, z, 0.08, top - bottom, 0.18, mats.steel);
    });
  };

  // ---------- the cable (catenary tube, rebuilt in place every frame) ----------
  const SEG = 48;
  const RAD = 6;
  const makeCable = () => {
    const pos = new Float32Array((SEG + 1) * RAD * 3);
    const uv = new Float32Array((SEG + 1) * RAD * 2);
    const idx = [];
    for (let i = 0; i <= SEG; i++)
      for (let j = 0; j < RAD; j++) {
        uv[(i * RAD + j) * 2] = i / SEG;
        uv[(i * RAD + j) * 2 + 1] = j / RAD;
        if (i < SEG) {
          const a = i * RAD + j;
          const b = i * RAD + ((j + 1) % RAD);
          const c = (i + 1) * RAD + j;
          const d = (i + 1) * RAD + ((j + 1) % RAD);
          idx.push(a, c, b, b, c, d);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    const U = { uTime: { value: 0 }, uTense: { value: 0 }, uSaved: { value: 0 } };
    const m = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: U,
        toneMapped: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime, uTense, uSaved;
          varying vec2 vUv;
          void main() {
            // braided strands, pink at her pack, teal at his, pulses running along when taut
            float braid = 0.75 + 0.25 * sin((vUv.x * 160.0 + vUv.y * 6.2832) * 1.0);
            vec3 c = mix(vec3(1.0, 0.36, 0.55), vec3(0.3, 0.85, 0.75), vUv.x);
            float pulse = smoothstep(0.92, 1.0, sin(vUv.x * 40.0 - uTime * 9.0)) * uTense;
            vec3 col = c * (0.7 + 0.2 * uTense) * braid + vec3(1.0, 0.85, 0.9) * pulse * 0.8;
            col = mix(col, vec3(1.3, 0.95, 0.5), uSaved * 0.6);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    m.frustumCulled = false;
    m.visible = false;
    R.scene.add(m);
    return { m, pos, U, g };
  };
  const pts = Array.from({ length: SEG + 1 }, () => V3());
  const tn = V3();
  const nn = V3();
  const bn = V3();
  const upV = V3(0, 1, 0);
  // fill pts with a sagging curve from a to b (sag in metres at the middle)
  const curve = (a, b, sag, i0, i1) => {
    for (let i = i0; i <= i1; i++) {
      const t = (i - i0) / (i1 - i0);
      pts[i].lerpVectors(a, b, t);
      pts[i].y -= sag * 4 * t * (1 - t);
    }
  };
  const writeTube = (r) => {
    const pos = cable.pos;
    for (let i = 0; i <= SEG; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(SEG, i + 1)];
      tn.subVectors(b, a);
      if (tn.lengthSq() < 1e-8) tn.set(0, 0, 1);
      tn.normalize();
      nn.crossVectors(tn, upV);
      if (nn.lengthSq() < 1e-6) nn.set(1, 0, 0);
      nn.normalize();
      bn.crossVectors(tn, nn).normalize();
      for (let j = 0; j < RAD; j++) {
        const an = (j / RAD) * TAU;
        const ca = Math.cos(an) * r;
        const sa = Math.sin(an) * r;
        const k = (i * RAD + j) * 3;
        pos[k] = pts[i].x + nn.x * ca + bn.x * sa;
        pos[k + 1] = pts[i].y + nn.y * ca + bn.y * sa;
        pos[k + 2] = pts[i].z + nn.z * ca + bn.z * sa;
      }
    }
    cable.g.attributes.position.needsUpdate = true;
  };

  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) return;
    Phys.owner('tr_c1');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    group.visible = true;
    mats = mk();

    // ---- atrium + wall ----
    slab(0, 0, 8, 14, 28, 2, mats.tile);
    solid(0, 4, -6.6, 16, 8, 1.2, mats.dark);
    sideWalls(-6, 22, 0, 8);
    // the 2.95 m wall and the upper floor (slab down to -1.2, the alcove sits under it)
    slab(0, UP, 28, 14, 12, 4.15, mats.stone);
    trim(0, UP + 0.02, 22.15, 14, 0.04, 0.3, mats.pink);
    for (let x = -6; x <= 6; x += 3) trim(x, 1.4, 21.95, 0.25, 2.6, 0.12, mats.steel);
    anchorPlate(0, UP, 23.6);
    anchorPlate(-3, 0, 18);
    sideWalls(22, 34, -1.2, 9);
    // cliff under the upper floor, then the alcove: floor -3.6 from z 30, with a lip that
    // sticks out 1 m past the edge (z 35) so a drop from the edge lands on it
    solid(0, -15.6, 26, 14, 28.8, 8, mats.rock);
    solid(0, -16.8, 33.2, 14, 26.4, 6.4, mats.rock);
    trim(0, -3.62, 36.3, 14, 0.06, 0.2, mats.gold);
    [-1, 1].forEach((s) => solid(s * 7.6, -2.4, 32, 1.2, 2.4, 4, mats.rock));
    trim(0, -1.25, 32, 14, 0.1, 4, mats.dark);
    [-5.6, 5.6].forEach((x) => trim(x, -2.4, 33.85, 0.22, 2.4, 0.22, mats.steel));
    LvKit.light(group, P(0, -2.0, 32), '#ffcf8a', 2.2, 12);
    anchorPlate(0, UP, 33.4);
    railRun(-6.4, UP, 22, 33.6);
    railRun(6.4, UP, 22, 33.6);
    // the crank in the alcove
    lever = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24), mats.brass);
    hub.rotation.x = Math.PI / 2;
    const wheelM = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 10, 40), mats.steel);
    lever.add(hub, wheelM);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), mats.steel);
      sp.rotation.z = (i / 6) * Math.PI;
      lever.add(sp);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mats.pink);
    knob.position.set(0.95, 0, 0.1);
    lever.add(knob);
    lever.position.copy(P(0, -2.35, 30.2));
    group.add(lever);
    trim(0, -2.4, 30.08, 2.4, 2.3, 0.12, mats.dark);

    // ---- the chasm bridge (slides out of the far side once the crank turns) ----
    bridgeSegs = [0, 1, 2, 3].map((i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 3.5), mats.wood);
      group.add(m);
      const b = Phys.add([0, 0, 0], [0, 0, 0], { dyn: true });
      b.on = false;
      return { m, b, z: 34 + 1.75 + i * 3.5, k: 0 };
    });
    // far landing
    slab(0, UP, 51, 14, 6, 3, mats.stone);
    sideWalls(48, 54, -1, 9);
    anchorPlate(0, UP, 50.6);

    // ---- crumbling ledges ----
    LEDGES.forEach((L) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(LEDGE, 0.5, LEDGE), mats.stone);
      top.position.y = -0.25;
      const under = new THREE.Mesh(new THREE.ConeGeometry(LEDGE * 0.62, 2.4, 6), mats.rock);
      under.rotation.x = Math.PI;
      under.position.y = -1.7;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 6), mats.teal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      // a thin glowing frame on the rim: gold when sound, pink while it shakes
      const edge = new THREE.Group();
      [
        [0, LEDGE / 2, LEDGE + 0.08, 0.07],
        [0, -LEDGE / 2, LEDGE + 0.08, 0.07],
        [LEDGE / 2, 0, 0.07, LEDGE + 0.08],
        [-LEDGE / 2, 0, 0.07, LEDGE + 0.08],
      ].forEach(([ex, ez, sx, sz]) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), mats.gold);
        bar.position.set(ex, -0.03, ez);
        edge.add(bar);
      });
      g.add(top, under, ring, edge);
      g.position.copy(P(L.x, UP, L.z));
      group.add(g);
      const b = K.collider(L.x, UP - 0.25, L.z, LEDGE, 0.5, LEDGE);
      ledges.push({ ...L, g, b, edge, ring, home: g.position.clone(), fall: 0, state: 0 });
    });

    // ---- pulley platform, well, wall and terrace ----
    slab(0, UP, 98, 14, 12.4, 3, mats.stone);
    sideWalls(91.6, 104, -1, 10);
    anchorPlate(-3, UP, 102);
    anchorPlate(3, UP, 102);
    railRun(-6.4, UP, 92.5, 103);
    solid(0, -25, 110, 14, 2, 12, mats.rock);
    [-1, 1].forEach((s) => solid(s * 7.6, -4, 110, 1.2, 42, 12, mats.dark));
    solid(0, -5, 117, 14, 40, 2, mats.rock);
    slab(0, TOP, 124, 14, 16, 3, mats.stone);
    sideWalls(116, 132, 12, 22);
    anchorPlate(0, TOP, 119.5);
    // well lights going down
    for (let y = -20; y < 0; y += 5) {
      trim(-6.9, y, 110, 0.06, 0.12, 11, mats.pink);
      trim(6.9, y, 110, 0.06, 0.12, 11, mats.teal);
    }
    LvKit.light(group, P(0, -18, 110), '#ff7aa0', 3, 30);
    // the pulley: a big wheel with a heart hub on a gantry over the edge
    wheel = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 12, 48), mats.brass);
    wheel.add(rim);
    [-0.12, 0.12].forEach((z) => {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.035, 8, 64), mats.pink);
      groove.position.z = z;
      wheel.add(groove);
    });
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.1), mats.dark);
      sp.rotation.z = (i / 8) * Math.PI;
      wheel.add(sp);
    }
    const hs = new THREE.Shape();
    for (let i = 0; i <= 60; i++) {
      const [hx, hy] = Heart.curve((i / 60) * TAU);
      if (i) hs.lineTo(hx * 0.028, (hy - 2.5) * 0.028);
      else hs.moveTo(hx * 0.028, (hy - 2.5) * 0.028);
    }
    const heartHub = new THREE.Mesh(
      new THREE.ExtrudeGeometry(hs, { depth: 0.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }).translate(0, 0, -0.1),
      glow('#ff5f8a', 1.8),
    );
    wheel.add(heartHub);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.copy(P(W.x, W.y - 1.4, W.z));
    group.add(wheel);
    [-1, 1].forEach((s) => {
      trim(s * 1.2, (TOP + W.y) / 2 + 0.6, W.z + 0.6, 0.3, W.y - TOP + 3.2, 0.3, mats.dark);
      trim(0, W.y + 1.0, W.z + 0.6, 2.8, 0.3, 0.3, mats.dark);
    });

    // ---- the collapsing bridge ----
    for (let z = BR0; z < BR1; z++) {
      if (GAPS.has(z)) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(3, 0.22, 0.92), mats.wood);
      m.position.copy(P(0, TOP - 0.11, z + 0.5));
      m.rotation.z = (Math.random() - 0.5) * 0.02;
      group.add(m);
      const b = K.collider(0, TOP - 0.11, z + 0.5, 3, 0.22, 1.0);
      planks.push({ z, m, b, home: m.position.clone(), fall: 0, spin: (Math.random() - 0.5) * 3 });
    }
    // rope rails along the bridge (decor only: you can fall off, that is the point)
    for (let z = BR0; z <= BR1; z += 4) [-1.6, 1.6].forEach((x) => trim(x, TOP + 0.5, z, 0.08, 1.0, 0.08, mats.dark));
    [-1.6, 1.6].forEach((x) => trim(x, TOP + 0.95, (BR0 + BR1) / 2, 0.04, 0.04, BR1 - BR0, mats.gold));
    // end platform with the card
    slab(0, TOP, 205, 16, 18, 3, mats.tile);
    const heartFloor = new THREE.Shape();
    for (let i = 0; i <= 90; i++) {
      const [hx, hy] = Heart.curve((i / 90) * TAU);
      if (i) heartFloor.lineTo(hx * 0.2, (hy - 2.5) * 0.2);
      else heartFloor.moveTo(hx * 0.2, (hy - 2.5) * 0.2);
    }
    const hf = new THREE.Mesh(new THREE.ShapeGeometry(heartFloor, 90).rotateX(-Math.PI / 2), glow('#ff5f8a', 0.9));
    hf.position.copy(P(0, TOP + 0.02, 205));
    group.add(hf);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.1, 24), mats.brass);
    ped.position.copy(P(0, TOP + 0.55, 205));
    group.add(ped);
    K.collider(0, TOP + 0.55, 205, 1.2, 1.1, 1.2);
    card = LvKit.trialCard('c1', false);
    card.position.copy(P(0, TOP + 2.2, 205));
    group.add(card);
    LvKit.light(group, P(0, TOP + 4, 205), '#ff8fb0', 2.5, 18);

    // ---- distance: pylons carrying giant cables, a sea of clouds ----
    const pyl = Tex.mat('metal', { color: '#2c2836', scale: 4, metal: 0.6, rough: 0.6 });
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const z = -20 + i * 26;
      const x = side * (38 + (i % 3) * 9);
      const h = 60 + (i % 4) * 12;
      K.deco(new THREE.CylinderGeometry(1.4, 2.6, h, 8), pyl, x, -40 + h / 2, z);
      K.deco(new THREE.BoxGeometry(12, 1, 1), pyl, x, -40 + h - 2, z);
      K.deco(new THREE.SphereGeometry(0.5, 10, 8), glow('#ff5f8a', 2), x, -40 + h + 0.5, z);
    }
    cloudU = { uTime: { value: 0 } };
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2),
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
            vec2 p = vP * 0.03;
            float v = 0.;
            float a = 0.5;
            for (int i = 0; i < 5; i++) { v += a * n(p + uTime * 0.015 * float(i + 1)); p *= 2.03; a *= 0.5; }
            float edgeF = 1. - smoothstep(120., 205., length(vP));
            vec3 c = mix(vec3(0.14, 0.05, 0.2), vec3(0.9, 0.42, 0.62), smoothstep(0.42, 0.85, v));
            gl_FragColor = vec4(c, smoothstep(0.28, 0.72, v) * 0.85 * edgeF);
          }
        `,
      }),
    );
    clouds.position.copy(P(0, -34, 100));
    group.add(clouds);

    // holographic sign over the wall (2048 px wide, kept under the bloom threshold)
    const sign = LvKit.tex(2048, 640, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(20,8,28,0.82)');
      gr.addColorStop(1, 'rgba(40,10,36,0.82)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,207,138,0.9)';
      g.lineWidth = 8;
      g.strokeRect(24, 24, w - 48, h - 48);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#7ce0ff';
      g.font = 'italic 220px Georgia, serif';
      Icons.fillText(g, Cards.tagOf('c1'), w / 2, 230);
      g.fillStyle = '#fbefe6';
      g.font = '600 110px "IBM Plex Mono", monospace';
      g.fillText('LE CÂBLE', w / 2, 430);
      g.fillStyle = '#c495a6';
      g.font = '46px "IBM Plex Mono", monospace';
      g.fillText('E : S’ANCRER  ·  MAJ : REMONTER  ·  E EN L’AIR : SE LESTER', w / 2, 540);
    });
    sign.wrapS = sign.wrapT = THREE.ClampToEdgeWrapping;
    sign.repeat.set(1, 1);
    const signM = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 3),
      new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, color: 0xcccccc }),
    );
    signM.position.copy(P(0, 7.2, 21.9));
    signM.rotation.y = Math.PI;
    group.add(signM);

    cable = makeCable();
    // glowing clips where the cable meets each backpack
    clips = [0, 1].map(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), glow('#ffcf8a', 0.85));
      m.visible = false;
      R.scene.add(m);
      return m;
    });
    // ring that clamps under an anchored player (one per player)
    const ringMat = glow('#ffcf8a', 1.6);
    anchorFx = [0, 1].map(() => {
      const g = new THREE.Group();
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 32), ringMat);
      r1.rotation.x = Math.PI / 2;
      g.add(r1);
      for (let i = 0; i < 4; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), mats.steel);
        spike.position.set(Math.cos((i / 4) * TAU) * 0.55, 0.1, Math.sin((i / 4) * TAU) * 0.55);
        g.add(spike);
      }
      g.visible = false;
      R.scene.add(g);
      return g;
    });
    // wind streaks over the bridge gust zone
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(120 * 6);
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3).setUsage(THREE.DynamicDrawUsage));
    const streaks = new THREE.LineSegments(
      sg,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#d9e8ff').multiplyScalar(0.9), transparent: true, opacity: 0 }),
    );
    streaks.frustumCulled = false;
    group.add(streaks);
    windFx = { streaks, sp, seeds: Array.from({ length: 120 }, () => [Math.random(), Math.random(), Math.random()]) };
  };

  // ---------- per-frame visuals driven by the shared state ----------
  const setBridge = (k) => {
    bridgeSegs.forEach((s, i) => {
      // segments slide out one after the other from the far side
      const kk = clamp(k * 4 - (3 - i), 0, 1);
      s.k = kk;
      const z = lerp(48 + 1.75, s.z, kk);
      s.m.position.copy(P(0, UP - 0.175, z));
      s.m.visible = kk > 0.01;
      s.b.on = kk > 0.98;
      s.b.min = [O.x - 1.6, O.y + UP - 0.35, O.z + z - 1.75];
      s.b.max = [O.x + 1.6, O.y + UP, O.z + z + 1.75];
    });
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the cable work's own geometry, materials and canvas textures (and the cable, its clips
  // and the anchor rings, which live in the scene outside the group), takes its colliders out and
  // forgets every reference build() made. The Tex materials and the card stay cached; the
  // builder's box cache keeps its objects (three sends them to the GPU again at the next build).
  const unbuild = () => {
    if (!built) return null;
    const loose = [cable && cable.m, ...(clips || []), ...(anchorFx || [])].filter(Boolean);
    loose.forEach((o) => R.scene.remove(o));
    const r = Life.free([group], [mats, loose]);
    group.visible = false;
    r.world = 'tr_c1';
    r.colliders = Phys.drop('tr_c1');
    built = false;
    ledges.length = planks.length = 0;
    bridgeSegs = [];
    mats = lever = wheel = card = cloudU = cable = anchorFx = clips = windFx = null;
    // what the level writes on the module (crank damping, bridge front, gust, wheel, debug)
    api.front = null;
    api.gust = 0;
    delete api._bk;
    delete api._wheelSpin;
    delete api.dbg;
    return r;
  };

  const api = {
    O,
    P,
    UP,
    TOP,
    W: () => P(W.x, W.y, W.z),
    LEDGES,
    BR0,
    BR1,
    build,
    unbuild,
    group,
    get built() {
      return built;
    },
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(stage, who) {
      const s = who === 'dame' ? -1.5 : 1.5;
      const at = { 1: [0, 2], 2: [UP, 26], 3: [UP, 51], 4: [UP, 96], 5: [TOP, 121], 6: [TOP, 200] }[stage] || [0, 2];
      return P(s, at[0], at[1]);
    },
    nearLever: (q) => Math.abs(q.z - 31.0) < 1.5 && Math.abs(q.x) < 2.4 && q.y < -2.5 && q.y > -4.2,
    inAlcove: (q) => q.z < 36.6 && q.z > 29.8 && q.y < -2 && q.y > -4.4,
    onLedge(q) {
      for (let i = 0; i < ledges.length; i++) {
        const L = ledges[i];
        if (L.state === 2) continue;
        if (Math.abs(q.x - L.x) < LEDGE / 2 + 0.3 && Math.abs(q.z - L.z) < LEDGE / 2 + 0.3 && Math.abs(q.y - UP) < 0.35)
          return i;
      }
      return -1;
    },
    nearCard: (q) => Math.hypot(q.x, q.z - 205) < 2.6 && Math.abs(q.y - TOP) < 1.5,
    // pulley wheel position in world space
    wheelPos: () => P(W.x, W.y, W.z),
    cable: () => cable,
    // draw the cable: a sagging curve, or two runs over the pulley wheel
    drawCable(a, b, L, t, opt = {}) {
      if (!cable) return;
      cable.m.visible = !!opt.show;
      if (clips) clips.forEach((m) => (m.visible = !!opt.show));
      if (!opt.show) return;
      const d = a.distanceTo(b);
      if (opt.pulley || opt.via) {
        const w = opt.via || P(W.x, W.y + 0.05, W.z);
        const da = a.distanceTo(w);
        const db = w.distanceTo(b);
        const slack = Math.max(0, L - da - db);
        const ia = Math.max(2, Math.min(SEG - 2, Math.round((SEG * da) / (da + db))));
        curve(a, w, Math.min(2.5, Math.sqrt(slack * da) * 0.25), 0, ia);
        curve(w, b, Math.min(2.5, Math.sqrt(slack * db) * 0.25), ia, SEG);
        cable.U.uTense.value = damp(cable.U.uTense.value, slack < 0.6 ? 1 : 0, 6, 1 / 60);
      } else {
        const slack = Math.max(0, L - d);
        const floor = Math.min(a.y, b.y) - 1.2 + 0.05;
        const mid = (a.y + b.y) / 2;
        const sag = Math.max(0, Math.min(3.2, 0.5 * Math.sqrt(Math.max(0, L * L - d * d)) * 0.55, mid - floor));
        curve(a, b, sag, 0, SEG);
        cable.U.uTense.value = damp(cable.U.uTense.value, slack < 0.5 ? 1 : 0, 6, 1 / 60);
      }
      if (clips) {
        clips[0].position.copy(a);
        clips[1].position.copy(b);
        // a glowing clip right in front of the lens would bloom into a white blot
        clips.forEach((m) => (m.visible = m.position.distanceTo(R.camera.position) > 2.2));
      }
      cable.U.uTime.value = t;
      cable.U.uSaved.value = damp(cable.U.uSaved.value, opt.saved ? 1 : 0, 4, 1 / 60);
      writeTube(0.035 + cable.U.uTense.value * 0.012);
    },
    hideCable() {
      if (cable) cable.m.visible = false;
      if (clips) clips.forEach((m) => (m.visible = false));
      if (anchorFx) anchorFx.forEach((g) => (g.visible = false));
    },
    anchorAt(i, p, on, t) {
      if (!anchorFx) return;
      const g = anchorFx[i];
      g.visible = !!on;
      if (on) {
        g.position.set(p.x, p.y + 0.03, p.z);
        g.rotation.y = t * 0.8;
      }
    },
    update(dt, t, x) {
      if (!built) return;
      cloudU.uTime.value = t;
      // crank + chasm bridge
      const want = x.bridge ? 1 : 0;
      const bk = (this._bk = damp(this._bk || 0, want, 1.1, dt));
      setBridge(x.bridge ? (bk > 0.995 ? 1 : bk) : 0);
      lever.rotation.z = -bk * 9;
      // ledges: 0 solid, 1 shaking, 2 fallen
      ledges.forEach((L, i) => {
        const st = (x.cr && x.cr[i]) || 0;
        if (st !== L.state) {
          if (st === 2) {
            Sound.play('rumble', 0.8);
            Fx.burst(L.home.clone(), '#8a7a90', 60, 4, 1.2, -8);
          }
          if (st === 0 && L.state === 2) Fx.burst(L.home.clone(), '#4fd1b5', 30, 2, 0.8, 0);
          L.state = st;
        }
        L.b.on = st !== 2;
        if (st === 2) {
          L.fall = Math.min(1, L.fall + dt * 0.8);
          L.g.position.copy(L.home).add(V3(0, -L.fall * L.fall * 30, 0));
          L.g.rotation.z = L.fall * 0.8;
          L.g.visible = L.fall < 1;
        } else {
          L.fall = Math.max(0, L.fall - dt * 1.5);
          L.g.visible = true;
          L.g.position.copy(L.home);
          L.g.rotation.z = 0;
          if (st === 1) {
            L.g.position.x += (Math.random() - 0.5) * 0.06;
            L.g.position.z += (Math.random() - 0.5) * 0.06;
          }
          const em = st === 1 ? mats.pink : mats.gold;
          L.edge.children.forEach((bar) => (bar.material = em));
        }
      });
      // collapsing bridge
      const front = this.front;
      planks.forEach((pk) => {
        const gone = front != null && pk.z + 0.5 < front;
        pk.b.on = !gone;
        if (gone) {
          if (pk.fall === 0) {
            if (Math.random() < 0.25) Sound.play('creak');
          }
          pk.fall = Math.min(1, pk.fall + dt * 0.7);
          pk.m.position.copy(pk.home).add(V3(0, -pk.fall * pk.fall * 40, 0));
          pk.m.rotation.x = pk.fall * pk.spin;
          pk.m.visible = pk.fall < 1;
        } else {
          pk.fall = 0;
          pk.m.visible = true;
          pk.m.position.copy(pk.home);
          // planks just ahead of the front tremble
          if (front != null && pk.z < front + 3) pk.m.position.y += (Math.random() - 0.5) * 0.04;
          pk.m.rotation.x = 0;
        }
      });
      // card bobbing
      if (card) {
        card.visible = x.stage >= 6;
        card.position.y = O.y + TOP + 2.2 + Math.sin(t * 2) * 0.12;
        card.rotation.y = t * 0.9;
      }
      // wind streaks while a gust blows
      const g = this.gust || 0;
      windFx.streaks.material.opacity = Math.min(0.28, Math.abs(g) * 0.28);
      if (Math.abs(g) > 0.02) {
        const sp = windFx.sp;
        windFx.seeds.forEach((s, i) => {
          const zz = 148 + s[0] * 26;
          const yy = TOP + 0.3 + s[1] * 2.2;
          const xx = ((((s[2] + t * 0.9 * Math.sign(g)) % 1) + 1) % 1) * 8 - 4;
          const p0 = P(xx, yy, zz);
          sp.set([p0.x, p0.y, p0.z, p0.x - Math.sign(g) * 0.8, p0.y, p0.z], i * 6);
        });
        windFx.streaks.geometry.attributes.position.needsUpdate = true;
      }
    },
    // the pulley wheel turns with the cable running over it
    spin(a) {
      if (wheel) wheel.rotation.z = a;
    },
    front: null,
    gust: 0,
    resetBridge() {
      this.front = null;
      planks.forEach((pk) => (pk.fall = 0));
    },
  };
  return api;
})();
