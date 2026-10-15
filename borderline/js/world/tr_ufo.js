// ♠ 10 · La Soucoupe (épreuve ufo): the boss at the end of world 2. A heart-shaped island at dusk
// over the sea of clouds, with five petal islands around it, and above it the saucer from the
// intro film, furious, under a shield. The shield is held by anchors (floating
// pylons the Dame kit grapples onto and tears out) and fed through the saucer's own beam (the
// Valet kit overloads it with the energy cores its porters carry). Every moving piece is a pure
// function of the shared clock T and of S.x, so both screens show the same sky.
// Geometry, visuals and pure helpers only; the fight lives in js/levels/tr_ufo.js.
const TrUfo = (() => {
  const O = V3(-2100, 0, 11200);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- layout (relative to O) ----------
  // the heart island: the voyage heart (Heart.curve), lobes toward -z, its point toward +z
  const HK = 0.9;
  const HC = 3.33; // centroid of the curve
  const heartAt = (t) => {
    const [x, y] = Heart.curve(t);
    return [x * HK, -(y - HC) * HK];
  };
  const HEART = Array.from({ length: 160 }, (_, i) => heartAt((i / 160) * TAU));
  const inPoly = (poly, x, z) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i];
      const [xj, zj] = poly[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  const inHeart = (x, z) => inPoly(HEART, x, z);
  // distance from the centre to the edge of the heart along a direction
  const edgeAlong = (dx, dz) => {
    let r = 0;
    while (r < 40 && inHeart(dx * r, dz * r)) r += 0.1;
    return r;
  };
  // the petals: round islands that overlap the edge of the heart (no gap to jump). The three
  // marked `falls` crumble into the clouds in phase 3.
  const PR = 5.2;
  const PETALS = [
    { id: 'W', d: [-1, 0.12], falls: true },
    { id: 'NW', d: [-0.55, -1], falls: false },
    { id: 'NE', d: [0.55, -1], falls: true },
    { id: 'E', d: [1, 0.12], falls: false },
    { id: 'S', d: [0, 1], falls: true },
  ].map((p, i) => {
    const l = Math.hypot(p.d[0], p.d[1]);
    const dx = p.d[0] / l;
    const dz = p.d[1] / l;
    const r = edgeAlong(dx, dz) + PR - 1.6;
    return { ...p, i, x: dx * r, z: dz * r, r: PR };
  });
  const onPetal = (p, x, z) => Math.hypot(x - p.x, z - p.z) < p.r;
  // the shield's anchors: platforms high over the petals (phase 1) or over the heart (phase 3)
  const ANC_Y = 8.2;
  const ANCHORS = {
    1: [0, 3, 4].map((i) => [PETALS[i].x * 0.94, ANC_Y, PETALS[i].z * 0.94]),
    3: [
      [-9, ANC_Y, -4],
      [9, ANC_Y, -4],
    ],
  };
  const ANC_PLAT = 2.6;
  const SAUCER = { y: 15.5, open: 4.6, scale: 0.7, shieldR: 10.6 };
  const INTAKE_R = 3.3;
  const SWEEP = { len: 27, w: 0.75, h: 1.0, speed: 1.15, dur: 2.9, tel: 1.3 };
  const FALL = { warn: 4, dur: 7 };
  const SPAWN = { dame: [-2.6, 0, 9], valet: [2.6, 0, 9] };

  // ---------- materials ----------
  const grass = Tex.mat('grass', { color: '#4f5a42', scale: 2.4, rough: 0.95, bump: 0.7 });
  const rock = Tex.mat('rock', { color: '#7a5e62', scale: 3, rough: 0.9, bump: 0.9 });
  const rockDark = Tex.mat('rock', { color: '#4a3a4c', scale: 4, rough: 0.92, bump: 0.8 });
  const stone = Tex.mat('stone', { color: '#c8b4ac', scale: 1.6, rough: 0.82, bump: 0.6 });
  // the saucer's fake environment reflections (js/cine/kit2.js loads after the worlds: patched in
  // on the first compile)
  const lateEnv = (m, k) => {
    m.onBeforeCompile = (sh) => {
      CineKit2.envify(m, k);
      m.onBeforeCompile(sh);
    };
    return m;
  };
  const hullMat = lateEnv(
    new THREE.MeshStandardMaterial({ color: '#d9d8e6', metalness: 0.7, roughness: 0.32 }),
    1.1,
  );
  const hullDark = lateEnv(
    new THREE.MeshStandardMaterial({ color: '#5c5f78', metalness: 0.85, roughness: 0.4 }),
    1.1,
  );
  const glowCyan = LvKit.glow('#7ce0ff', 2.2);
  const ringMat = LvKit.glow('#7ce0ff', 1.3);
  const glowPink = LvKit.glow('#ff6a96', 2.4);
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // merge the static meshes directly under `root` into one mesh per material (draw calls)
  const bake = (root) => {
    const list = root.children.filter((c) => c.isMesh && !c.children.length && !c.userData.dyn);
    if (list.length < 2) return;
    const mats = [];
    list.forEach((c) => !mats.includes(c.material) && mats.push(c.material));
    mats.forEach((mt) => {
      const parts = list
        .filter((c) => c.material === mt)
        .map((c) => {
          c.updateMatrix();
          const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
          g.applyMatrix4(c.matrix);
          return g;
        });
      let n = 0;
      parts.forEach((g) => (n += g.attributes.position.count));
      const Pa = new Float32Array(n * 3);
      const Na = new Float32Array(n * 3);
      const Ua = new Float32Array(n * 2);
      let o = 0;
      parts.forEach((g) => {
        const c = g.attributes.position.count;
        Pa.set(g.attributes.position.array, o * 3);
        if (g.attributes.normal) Na.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) Ua.set(g.attributes.uv.array.subarray(0, c * 2), o * 2);
        o += c;
        g.dispose();
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(Pa, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(Na, 3));
      out.setAttribute('uv', new THREE.BufferAttribute(Ua, 2));
      out.computeBoundingSphere();
      root.add(new THREE.Mesh(out, mt));
    });
    list.forEach((c) => root.remove(c));
  };

  // ---------- the sea of clouds at dusk (follows the camera, pattern fixed in the world) ----------
  const SUN_DIR = V3(0.35, 0.16, -1).normalize();
  const HAZE = new THREE.Color('#5a3a5e');
  const seaMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uFog: { value: HAZE },
      uDen: { value: 0.0058 },
      uSun: { value: SUN_DIR },
      uStorm: { value: 0 },
    },
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform float uTime, uDen, uStorm;
      uniform vec3 uFog, uSun;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
      }
      void main() {
        vec2 q = vW.xz * 0.011 + vec2(uTime * 0.007, uTime * 0.003);
        float big = fbm(q);
        float fine = fbm(q * 4.3 + big * 1.5);
        float h = big * 0.72 + fine * 0.28;
        vec3 shadow = mix(vec3(0.20, 0.11, 0.26), vec3(0.12, 0.07, 0.16), uStorm);
        vec3 lit = mix(vec3(0.78, 0.44, 0.46), vec3(0.52, 0.30, 0.42), uStorm);
        vec3 top = vec3(0.92, 0.66, 0.58);
        vec3 col = mix(shadow, lit, smoothstep(0.32, 0.64, h));
        col = mix(col, top, smoothstep(0.64, 0.82, h) * 0.55);
        vec3 V = normalize(vW - cameraPosition);
        float s = max(dot(normalize(vec2(V.x, V.z)), normalize(vec2(uSun.x, uSun.z))), 0.0);
        col += vec3(0.55, 0.3, 0.2) * pow(s, 8.0) * smoothstep(0.45, 0.75, h) * 0.55;
        float d = length(vW - cameraPosition);
        float f = 1.0 - exp(-pow(d * uDen, 2.0));
        col = mix(col, uFog, clamp(f, 0.0, 1.0));
        gl_FragColor = vec4(min(col, vec3(0.8)), 1.0);
      }
    `,
  });

  // a soft puff texture for the drifting clouds (drawn as one point cloud)
  const puffTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = rng(7);
    for (let i = 0; i < 14; i++) {
      const x = 64 + (r() - 0.5) * 50;
      const y = 64 + (r() - 0.5) * 30;
      const rad = 18 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.5)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  })();

  // ---------- islands ----------
  const shapeOf = (poly) => {
    const s = new THREE.Shape();
    poly.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    s.closePath();
    return s;
  };
  // the island's slab: grass on top, rock on the rim; its top at y = 0 of its group
  const slab = (poly, depth = 1.6) =>
    new THREE.ExtrudeGeometry(shapeOf(poly), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.25,
      bevelSize: 0.3,
      bevelSegments: 2,
      curveSegments: 4,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, -depth, 0);
  // axis-aligned slices that follow the outline, for the physics
  const slices = (test, x0, x1, z0, z1, band = 0.8) => {
    const out = [];
    for (let z = z0; z < z1; z += band) {
      const zc = z + band / 2;
      let run = null;
      for (let x = x0; x <= x1 + 0.25; x += 0.25) {
        const ins = x <= x1 && test(x, zc);
        if (ins && run == null) run = x;
        if (!ins && run != null) {
          out.push([run - 0.12, x - 0.13, z, z + band]);
          run = null;
        }
      }
    }
    return out;
  };
  const colliders = (list, tag) =>
    list.map(([xa, xb, za, zb]) =>
      K.collider((xa + xb) / 2, -0.8, (za + zb) / 2, xb - xa, 1.6, zb - za, { tag }),
    );

  const islands = { heart: null, petals: [] };
  const underRock = (g, r, depth, sx = 1, sz = 1, seed = 1) => {
    const cone = add(g, new THREE.ConeGeometry(r, depth, 11, 3), rock, 0, -1.6 - depth / 2, 0);
    cone.rotation.x = Math.PI;
    cone.scale.set(sx, 1, sz);
    const rr = rng(seed);
    for (let i = 0; i < 6; i++) {
      const a = rr() * TAU;
      const st = add(
        g,
        new THREE.DodecahedronGeometry(0.5 + rr() * 1.1, 0),
        rockDark,
        Math.cos(a) * r * sx * 0.55,
        -3 - rr() * depth * 0.5,
        Math.sin(a) * r * sz * 0.55,
      );
      st.rotation.set(rr() * 3, rr() * 3, 0);
    }
  };

  const buildIslands = () => {
    // the heart
    const hg = new THREE.Group();
    hg.position.copy(P(0, 0, 0));
    group.add(hg);
    add(hg, slab(HEART), [grass, rock]).userData.dyn = true;
    underRock(hg, 12.5, 24, 1.1, 0.9, 3);
    // two lobes under the top of the heart
    [-1, 1].forEach((s) => {
      const c = add(hg, new THREE.ConeGeometry(6.5, 14, 9, 2), rockDark, s * 7.5, -8.5, -5);
      c.rotation.x = Math.PI;
    });
    // a heart of white stones in the grass, and a ring where the saucer comes down
    const ring = add(hg, new THREE.RingGeometry(4.6, 5.2, 64).rotateX(-Math.PI / 2), stone, 0, 0.03, 0);
    ring.userData.dyn = true;
    bake(hg);
    hg.add(ring);
    islands.heart = { g: hg, b: colliders(slices(inHeart, -15, 15, -10.5, 16.5), 'ufoH') };
    // the petals
    PETALS.forEach((p) => {
      const g = new THREE.Group();
      g.position.copy(P(p.x, 0, p.z));
      group.add(g);
      const poly = Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * TAU;
        const wob = 1 + Math.sin(a * 3 + p.i) * 0.04;
        return [Math.cos(a) * p.r * wob, Math.sin(a) * p.r * wob];
      });
      add(g, slab(poly, 1.4), [grass, rock]).userData.dyn = true;
      underRock(g, p.r * 0.95, 13 + p.i * 2, 1, 1, 10 + p.i);
      bake(g);
      // the cracks that glow before it falls (phase 3)
      let cracks = null;
      if (p.falls) {
        const cm = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#ff5a3a').multiplyScalar(2),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        });
        const cg = new THREE.Group();
        const rr = rng(40 + p.i);
        for (let k = 0; k < 7; k++) {
          const a = rr() * TAU;
          const l = 1.5 + rr() * 3;
          const m = add(cg, new THREE.PlaneGeometry(0.12, l).rotateX(-Math.PI / 2), cm, Math.cos(a) * l * 0.5, 0.04, Math.sin(a) * l * 0.5);
          m.rotation.y = -a + Math.PI / 2;
        }
        g.add(cg);
        cracks = cm;
      }
      const b = colliders(
        slices((x, z) => Math.hypot(x - p.x, z - p.z) < p.r * 0.97, p.x - p.r, p.x + p.r, p.z - p.r, p.z + p.r),
        'ufoP' + p.i,
      );
      islands.petals.push({ g, b, cracks, base: g.position.clone(), p });
    });
    // rim stones all around, one instanced mesh
    const pts = [];
    for (let i = 0; i < HEART.length; i += 2) pts.push([HEART[i][0], HEART[i][1]]);
    PETALS.forEach((p) => {
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * TAU;
        const x = p.x + Math.cos(a) * p.r;
        const z = p.z + Math.sin(a) * p.r;
        if (!inHeart(x, z)) pts.push([x, z, p.i]);
      }
    });
    const rim = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stone, pts.length);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const E = new THREE.Euler();
    pts.forEach(([x, z, pi], i) => {
      E.set(i, i * 2.3, 0);
      Q.setFromEuler(E);
      const s = 0.28 + ((i * 37) % 7) * 0.045;
      M.compose(P(x, 0.05, z), Q, V3(s, s * 0.8, s));
      rim.setMatrixAt(i, M);
    });
    rim.userData.petalOf = pts.map((q) => q[2]);
    group.add(rim);
    islands.rim = rim;
    islands.rimPts = pts;
    // flowers in the grass of the heart
    const fl = [];
    const fr = rng(5);
    while (fl.length < 260) {
      const x = (fr() - 0.5) * 30;
      const z = -10 + fr() * 26;
      if (inHeart(x, z) && Math.hypot(x, z) > 5.6) fl.push([x, z]);
    }
    const flowers = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.08, 6, 4),
      new THREE.MeshStandardMaterial({ color: '#ff9ab8', emissive: '#5a1a2a', emissiveIntensity: 0.6, roughness: 0.8 }),
      fl.length,
    );
    fl.forEach(([x, z], i) => {
      M.makeTranslation(O.x + x, O.y + 0.08, O.z + z);
      flowers.setMatrixAt(i, M);
    });
    group.add(flowers);
    // tufts of tall grass, so the lawn is not a flat sheet (the petals carry their own: they fall)
    // a tuft: five thin blades leaning out from one root
    const tuftGeo = (() => {
      const g = new THREE.Group();
      const tm = new THREE.MeshBasicMaterial();
      for (let k = 0; k < 5; k++) {
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.42 - (k % 2) * 0.1, 3).translate(0, 0.2, 0), tm);
        b.rotation.set(0.35 * Math.cos(k * 2.4), k * 1.3, 0.35 * Math.sin(k * 2.4));
        g.add(b);
      }
      bake(g);
      return g.children[0].geometry;
    })();
    const tuftMat = new THREE.MeshStandardMaterial({ color: '#2f3b24', roughness: 1, emissive: '#0c1408', emissiveIntensity: 0.4 });
    const tuftsIn = (parent, list, origin) => {
      const m = new THREE.InstancedMesh(tuftGeo, tuftMat, list.length);
      list.forEach(([x, z, k], i) => {
        E.set((k - 0.5) * 0.3, k * 6, (k - 0.5) * 0.3);
        Q.setFromEuler(E);
        const sc = 0.6 + k * 0.9;
        M.compose(V3(origin.x + x, origin.y, origin.z + z), Q, V3(sc, sc * (0.8 + k * 0.6), sc));
        m.setMatrixAt(i, M);
      });
      parent.add(m);
    };
    const tu = [];
    while (tu.length < 520) {
      const x = (fr() - 0.5) * 30;
      const z = -10 + fr() * 26;
      if (inHeart(x, z) && Math.hypot(x, z) > 5.8) tu.push([x, z, fr()]);
    }
    tuftsIn(group, tu, O);
    islands.petals.forEach((pt) => {
      const l = [];
      for (let k = 0; k < 40; k++) {
        const a = fr() * TAU;
        const d = Math.sqrt(fr()) * (pt.p.r - 0.6);
        l.push([Math.cos(a) * d, Math.sin(a) * d, fr()]);
      }
      tuftsIn(pt.g, l, V3());
    });
  };

  // ---------- anchors ----------
  // a crystal pylon of the saucer's white metal with a small platform on top and an energy core
  // in it (what the Dame tears out); a tether of light runs from the core to the saucer
  const anchors = { 1: [], 3: [] };
  const tetherMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff6a96').multiplyScalar(1.8),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const tetherGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 8, 1, true)
    .translate(0, 0.5, 0)
    .rotateX(Math.PI / 2);
  const buildAnchor = (ph, i, [x, y, z]) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    group.add(g);
    const body = new THREE.Group();
    g.add(body);
    // the platform (hexagonal) and the pylon hanging under it
    add(body, new THREE.CylinderGeometry(ANC_PLAT * 0.62, ANC_PLAT * 0.55, 0.36, 6), hullMat, 0, -0.18, 0);
    add(body, new THREE.CylinderGeometry(ANC_PLAT * 0.64, ANC_PLAT * 0.64, 0.06, 6), hullDark, 0, -0.38, 0);
    add(body, new THREE.ConeGeometry(0.9, 4.2, 6), hullMat, 0, -2.5, 0).rotation.x = Math.PI;
    add(body, new THREE.TorusGeometry(0.95, 0.05, 6, 24).rotateX(Math.PI / 2), glowCyan, 0, -0.9, 0);
    add(body, new THREE.TorusGeometry(0.62, 0.04, 6, 24).rotateX(Math.PI / 2), glowCyan, 0, -2.0, 0);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU;
      const fin = add(body, new THREE.BoxGeometry(0.08, 2.6, 0.7), hullDark, Math.cos(a) * 0.62, -1.9, Math.sin(a) * 0.62);
      fin.rotation.y = -a;
    }
    bake(body);
    // the core: a pink crystal in a cyan cage, sticking out of the platform
    const core = new THREE.Group();
    core.position.y = 0.55;
    g.add(core);
    const crystal = add(core, new THREE.OctahedronGeometry(0.42, 0), glowPink);
    crystal.scale.set(1, 1.5, 1);
    const cage = add(core, new THREE.TorusGeometry(0.55, 0.03, 6, 28), glowCyan);
    const cage2 = add(core, new THREE.TorusGeometry(0.55, 0.03, 6, 28), glowCyan);
    cage2.rotation.y = Math.PI / 2;
    // where the grapple aims: a ring floating beside the platform, on the side of the heart (the
    // pull comes in from the side, then the hop lands on the platform; from below, the platform
    // would stop it)
    const l = Math.hypot(x, z) || 1;
    const ringOff = V3((-x / l) * 2.3, 2.2, (-z / l) * 2.3);
    const ring = add(g, new THREE.TorusGeometry(0.7, 0.05, 8, 32), ringMat, ringOff.x, ringOff.y, ringOff.z);
    ring.rotation.y = Math.atan2(-x, -z);
    const tether = new THREE.Mesh(tetherGeo, tetherMat);
    tether.frustumCulled = false;
    group.add(tether);
    const b = K.collider(x, y - 0.25, z, ANC_PLAT, 0.5, ANC_PLAT);
    // its lock: a chain of red light down to a post on the ground. Only a sword cuts it (the
    // other player), and while it holds the core cannot be torn out
    const bx = x * 0.8;
    const bz = z * 0.8;
    const bg = new THREE.Group();
    bg.position.copy(P(bx, 0, bz));
    group.add(bg);
    const post = new THREE.Group();
    bg.add(post);
    add(post, new THREE.CylinderGeometry(0.62, 0.72, 0.3, 8), hullDark, 0, 0.15, 0);
    add(post, new THREE.CylinderGeometry(0.2, 0.34, 1.7, 6), hullMat, 0, 1.15, 0);
    add(post, new THREE.TorusGeometry(0.36, 0.04, 6, 20).rotateX(Math.PI / 2), hullDark, 0, 1.9, 0);
    bake(post);
    const lockMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a4a').multiplyScalar(2.2), toneMapped: false });
    const gem = add(bg, new THREE.OctahedronGeometry(0.26, 0), lockMat, 0, 2.25, 0);
    gem.scale.y = 1.5;
    const chainMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff3a4a').multiplyScalar(1.8),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const chain = new THREE.Mesh(tetherGeo, chainMat);
    chain.frustumCulled = false;
    group.add(chain);
    const borne = { g: bg, gem, mat: lockMat, chain, chainMat, pos: V3(bx, 0, bz), b: K.collider(bx, 1, bz, 0.8, 2, 0.8) };
    const a = { ph, i, g, body, core, crystal, cage, cage2, ring, ringOff, tether, b, borne, pos: V3(x, y, z), dead: 0, rip: 0, alive: true };
    anchors[ph].push(a);
    return a;
  };

  // ---------- cores (carried by the porters, then by the Valet kit) ----------
  const coreGeo = new THREE.IcosahedronGeometry(0.34, 1);
  const coreCage = new THREE.TorusGeometry(0.46, 0.03, 6, 24);
  const coreMat = LvKit.glow('#9ff4ff', 2.6);
  const cores = [];
  const coreMesh = () => {
    const g = new THREE.Group();
    add(g, coreGeo, coreMat);
    const c1 = add(g, coreCage, glowPink);
    const c2 = add(g, coreCage, glowPink);
    c2.rotation.x = Math.PI / 2;
    g.userData.cages = [c1, c2];
    g.visible = false;
    group.add(g);
    return g;
  };

  // ---------- the sweeping laser ----------
  // a red sheet from the saucer's belly to the ground, and its line on the ground
  const sweepMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime, uA;
      varying vec2 vUv;
      void main() {
        float flick = 0.8 + 0.2 * sin(uTime * 60.0 + vUv.x * 30.0);
        float a = pow(1.0 - vUv.y, 4.0) * 0.55 + 0.04;
        gl_FragColor = vec4(vec3(1.0, 0.18, 0.24) * a * flick * uA * 1.6, a * uA);
      }
    `,
  });
  const sweepGeo = (() => {
    const g = new THREE.BufferGeometry();
    // apex at the origin (the saucer), base from r 1 to r len on the ground (y = -1, scaled)
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, -1, 1, 0, -1, SWEEP.len, 0, 0, 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  })();
  const sweepLineMat = LvKit.glow('#ff3a4a', 2.4);
  const sweeps = [0, 1].map(() => {
    const g = new THREE.Group();
    const sheet = new THREE.Mesh(sweepGeo, sweepMat);
    sheet.frustumCulled = false;
    const line = new THREE.Mesh(new THREE.BoxGeometry(SWEEP.w * 0.6, 0.12, SWEEP.len - 1).translate(0, 0, (SWEEP.len + 1) / 2), sweepLineMat);
    g.add(sheet, line);
    g.visible = false;
    group.add(g);
    return { g, sheet, line };
  });

  // ---------- the strike of light (the saucer's "frappe") ----------
  const lanceMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff8fb0').multiplyScalar(2.6),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lances = [];
  const lance = (pos, top) => {
    let l = lances.find((x) => x.t <= 0);
    if (!l) {
      l = { m: new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0), lanceMat.clone()), t: 0 };
      l.m.frustumCulled = false;
      group.add(l.m);
      lances.push(l);
    }
    l.m.position.copy(pos);
    l.h = Math.max(2, top - pos.y);
    l.t = 0.45;
    l.m.visible = true;
  };

  // ---------- the intake ring (where the beam drinks the cores) ----------
  const intake = new THREE.Mesh(
    new THREE.RingGeometry(INTAKE_R - 0.25, INTAKE_R, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#9ff4ff').multiplyScalar(2),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  intake.visible = false;
  group.add(intake);

  // ---------- the saucer (the boss model, built by Enemies on spawn) ----------
  // front faces only: from inside (on an anchor, under it) the bubble would whiten the screen
  const shieldMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 }, uHit: { value: 0 }, uCol: { value: new THREE.Color('#ff5f8a') } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vP = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime, uOn, uHit;
      uniform vec3 uCol;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float fr = pow(1.0 - abs(dot(normalize(vN), vV)), 2.2);
        vec2 q = vec2(atan(vP.z, vP.x) * 6.0, vP.y * 1.6);
        vec2 h = abs(fract(vec2(q.x + 0.5 * floor(q.y), q.y)) - 0.5);
        float hex = smoothstep(0.42, 0.48, max(h.x * 1.5 + h.y * 0.5, h.y));
        float scan = smoothstep(0.96, 1.0, sin(vP.y * 3.0 - uTime * 3.0));
        float a = (fr * 0.75 + hex * 0.22 + scan * 0.18 + uHit * 0.5) * uOn;
        gl_FragColor = vec4(uCol * a * 1.4, a);
      }
    `,
  });
  // one saucer at a time: the model is built once and reused (a wipe respawns the boss)
  let saucer = null;
  const saucerModel = () => saucer || (saucer = buildSaucer());
  const buildSaucer = () => {
    const ship = CineKit2.alienShip();
    // 96 bulbs and the 38 parts of the ring, merged per material
    bake(ship.lights);
    bake(ship.ring);
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const tilt = new THREE.Group();
    body.add(tilt);
    tilt.position.y = 1.1;
    ship.group.scale.setScalar(SAUCER.scale);
    tilt.add(ship.group);
    // the shield, a flattened bubble of hexagons
    const shield = new THREE.Mesh(new THREE.SphereGeometry(SAUCER.shieldR, 48, 24), shieldMat);
    shield.scale.y = 0.42;
    shield.renderOrder = 4;
    tilt.add(shield);
    // the true weak point: a heart-pink core that drops out of the hatch when the shield breaks
    const heart = new THREE.Group();
    tilt.add(heart);
    const hcore = add(heart, new THREE.IcosahedronGeometry(0.85, 2), LvKit.glow('#ff4f86', 1.25));
    const hring = add(heart, new THREE.TorusGeometry(1.25, 0.06, 8, 48).rotateX(Math.PI / 2), glowCyan);
    const hring2 = add(heart, new THREE.TorusGeometry(1.05, 0.05, 8, 48), glowCyan);
    // smoke puffs when it is hurt (phase 3), a few pooled sprites
    return {
      g,
      body,
      eye: null,
      heart,
      ship,
      tilt,
      shield,
      parts: { hcore, hring, hring2 },
    };
  };

  // ---------- drifting clouds, floating stones, the low sun ----------
  let sea = null;
  let puffs = null;
  let stones = null;
  let sun = null;
  let card = null;
  const buildSky = () => {
    sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), seaMat);
    sea.position.copy(P(0, -34, 0));
    sea.frustumCulled = false;
    sea.userData.noCull = true;
    group.add(sea);
    const N = 90;
    const pos = new Float32Array(N * 3);
    const r = rng(12);
    for (let i = 0; i < N; i++) {
      const a = r() * TAU;
      const d = 45 + r() * 160;
      pos.set([O.x + Math.cos(a) * d, O.y - 26 + r() * 22, O.z + Math.sin(a) * d], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    puffs = new THREE.Points(
      pg,
      new THREE.PointsMaterial({
        map: puffTex,
        size: 70,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
        color: new THREE.Color('#e7b2b4').multiplyScalar(0.75),
        opacity: 0.8,
      }),
    );
    puffs.frustumCulled = false;
    group.add(puffs);
    // small stones that float around the arena
    const NS = 46;
    stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockDark, NS);
    stones.userData.seeds = Array.from({ length: NS }, () => {
      const a = r() * TAU;
      const d = 32 + r() * 40;
      return [Math.cos(a) * d, -10 + r() * 30, Math.sin(a) * d, 0.4 + r() * 1.6, r() * 6];
    });
    group.add(stones);
    // the sun, low behind the lobes of the heart
    sun = new THREE.Mesh(
      new THREE.CircleGeometry(22, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffa070').multiplyScalar(0.85), fog: false, toneMapped: false }),
    );
    sun.position.copy(P(0, 0, 0)).addScaledVector(SUN_DIR, 700);
    sun.lookAt(P(0, 0, 0));
    group.add(sun);
    card = LvKit.trialCard('ufo');
    card.position.copy(P(0, 1.7, 0));
    group.add(card);
  };

  const build = () => {
    if (built) return;
    built = true;
    buildIslands();
    buildSky();
    ANCHORS[1].forEach((p, i) => buildAnchor(1, i, p));
    ANCHORS[3].forEach((p, i) => buildAnchor(3, i, p));
    for (let i = 0; i < 6; i++) cores.push(coreMesh());
  };

  // ---------- environment ----------
  let env = null;
  const wake = () => {
    group.visible = true;
    // dusk under the saucer: warm low sun, violet haze
    env = {
      hemi: R.hemi.intensity,
      hc: R.hemi.color.clone(),
      hg: R.hemi.groundColor.clone(),
      moon: R.moon.intensity,
      mc: R.moon.color.clone(),
      mp: R.moon.position.clone(),
      br: R.scene.onBeforeRender,
    };
    R.hemi.intensity = 0.6;
    R.hemi.color.set('#ffb8b0');
    R.hemi.groundColor.set('#3a2440');
    R.moon.intensity = 1.05;
    R.moon.color.set('#ffb07a');
    R.moon.position.set(SUN_DIR.x * 100, 22, SUN_DIR.z * 100);
    R.scene.onBeforeRender = () => {
      R.scene.fog.color.copy(HAZE);
      R.scene.background.copy(HAZE);
    };
  };
  const sleep = () => {
    group.visible = false;
    if (!env) return;
    R.hemi.intensity = env.hemi;
    R.hemi.color.copy(env.hc);
    R.hemi.groundColor.copy(env.hg);
    R.moon.intensity = env.moon;
    R.moon.color.copy(env.mc);
    R.moon.position.copy(env.mp);
    // (the city sets the fog and the background again every frame)
    R.scene.onBeforeRender = env.br;
    env = null;
  };

  // ---------- pure helpers ----------
  // seconds left before the chain of anchor a locks it again (0: locked)
  const unlockLeft = (x, a, T) => Math.max(0, ((x.cuts && x.cuts[a.i]) || 0) - T);
  const rel = (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z);
  const spawn = (who) => P(...SPAWN[who]);
  const petalFell = (x, i, T) => x.fall && x.fall[i] != null && T >= x.fall[i] + FALL.warn;
  // is this point (relative) on solid ground right now?
  const ground = (x, q, T) => {
    if (inHeart(q.x, q.z)) return true;
    return PETALS.some((p) => onPetal(p, q.x, q.z) && !petalFell(x, p.i, T));
  };
  // the angle of sweep beam k at time T (null when not sweeping)
  const sweepAng = (sw, T, k) => {
    if (!sw || T < sw.t0 || T > sw.t0 + SWEEP.tel + SWEEP.dur) return null;
    const run = Math.max(0, T - sw.t0 - SWEEP.tel);
    return sw.a0 + sw.dir * run * SWEEP.speed + (k * TAU) / (sw.n || 1);
  };
  // does sweep beam hit a player standing at q (relative, feet)? the saucer's x/z is the pivot
  const sweepHit = (sw, T, q, sx, sz, gy) => {
    if (!sw || T < sw.t0 + SWEEP.tel || T > sw.t0 + SWEEP.tel + SWEEP.dur) return false;
    if (q.y > gy + SWEEP.h) return false;
    for (let k = 0; k < (sw.n || 1); k++) {
      const a = sweepAng(sw, T, k);
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      const px = q.x - sx;
      const pz = q.z - sz;
      const along = px * dx + pz * dz;
      if (along < 0.5 || along > SWEEP.len) continue;
      if (Math.abs(px * dz - pz * dx) < SWEEP.w) return true;
    }
    return false;
  };

  // ---------- per frame ----------
  const tmp = V3();
  const tmp2 = V3();
  const M4 = new THREE.Matrix4();
  const Qt = new THREE.Quaternion();
  const Eu = new THREE.Euler();
  const lastFx = {};
  const update = (dt, t, x, T, view) => {
    if (!built) return;
    seaMat.uniforms.uTime.value = T;
    seaMat.uniforms.uStorm.value = damp(seaMat.uniforms.uStorm.value, x.ph >= 3 ? 1 : x.ph === 2 ? 0.5 : 0, 1, dt);
    sea.position.x = R.camera.position.x;
    sea.position.z = R.camera.position.z;
    shieldMat.uniforms.uTime.value = t;
    sweepMat.uniforms.uTime.value = t;
    // floating stones
    const sd = stones.userData.seeds;
    for (let i = 0; i < sd.length; i++) {
      const [sx, sy, sz, s, ph] = sd[i];
      Eu.set(t * 0.1 + ph, t * 0.13 + ph * 2, 0);
      Qt.setFromEuler(Eu);
      M4.compose(tmp.set(O.x + sx, O.y + sy + Math.sin(t * 0.4 + ph) * 0.8, O.z + sz), Qt, tmp2.setScalar(s));
      stones.setMatrixAt(i, M4);
    }
    stones.instanceMatrix.needsUpdate = true;
    // the saucer's position (from the boss entity), for tethers and sweeps
    const sp = view && view.g ? view.g.position : P(0, SAUCER.y - 1.1, 0);
    const belly = tmp.set(sp.x, sp.y + 1.1 - 1.3 * SAUCER.scale, sp.z);
    // anchors
    [1, 3].forEach((ph) =>
      anchors[ph].forEach((a) => {
        const live = x.ph === ph && x.anc && x.anc[a.i] && x.stage === 1;
        const gone = (x.ph > ph || (x.ph === ph && x.anc && !x.anc[a.i])) && x.stage >= 1;
        if (gone && a.alive) {
          a.alive = false;
          a.dead = 0.001;
          a.b.on = false;
        }
        if (!gone && !a.alive) {
          a.alive = true;
          a.dead = 0;
          a.g.position.copy(P(...ANCHORS[ph][a.i]));
          a.g.rotation.set(0, 0, 0);
          a.rise = 0;
        }
        // one-way platform (physics runs on each screen for its own player): from below the
        // pull of the grapple goes through it, from above it holds
        a.b.on = a.alive && x.ph === ph && Player.body.p.y > a.g.position.y - 0.45;
        // the anchors of phase 3 only come up with it
        a.g.visible = a.alive ? x.ph === ph || (ph === 1 && x.stage === 0) : a.dead < 4;
        // they rise out of the clouds when their phase begins
        if (a.g.visible && a.alive && !a.wasVis) a.rise = ph === 1 && x.stage === 0 ? 1 : 0;
        a.wasVis = a.g.visible && a.alive;
        a.rise = Math.min(1, (a.rise == null ? 1 : a.rise) + dt / 2.8);
        if (!a.alive && a.dead > 0) {
          // torn out: the pylon tumbles into the clouds
          a.dead += dt;
          a.g.position.y -= a.dead * 9 * dt;
          a.g.rotation.x += dt * 1.3;
          a.g.rotation.z += dt * 0.7;
        } else {
          const k = 1 - a.rise;
          a.g.position.y = O.y + ANCHORS[ph][a.i][1] + Math.sin(t * 1.1 + a.i * 2) * 0.06 - k * k * 30;
        }
        a.core.rotation.y = t * 1.6;
        a.cage.rotation.x = t * 2;
        a.cage2.rotation.z = t * 2.4;
        const rip = a.rip || 0;
        a.core.scale.setScalar(1 + rip * 0.35 + Math.sin(t * 30) * rip * 0.08);
        a.core.position.y = 0.55 + rip * 0.5;
        // (hidden once you stand next to it: up close it would fill the screen)
        a.ring.visible = live && Player.body.p.distanceTo(a.g.position) > 3.4;
        a.ring.scale.setScalar(1 + Math.sin(t * 3 + a.i) * 0.08);
        a.tether.visible = live || (a.alive && x.stage === 0);
        if (a.tether.visible) {
          a.core.getWorldPosition(tmp2);
          a.tether.position.copy(tmp2);
          const d = tmp2.distanceTo(belly);
          a.tether.lookAt(belly);
          a.tether.scale.set(1 + rip * 2 + Math.sin(t * 20 + a.i) * 0.2, 1 + rip * 2, d);
        }
      }),
    );
    // the locks: a post and its chain under every anchor still up
    [1, 3].forEach((ph) =>
      anchors[ph].forEach((a) => {
        const bo = a.borne;
        const on = a.alive && (x.ph === ph || (ph === 1 && x.stage === 0)) && x.stage <= 1;
        bo.g.visible = on;
        bo.b.on = on;
        const left = unlockLeft(x, a, T);
        const open = left > 0;
        bo.gem.rotation.y = t * (open ? 4 : 1);
        const blink = open && left < 2 ? 0.5 + 0.5 * Math.sin(t * 20) : 1;
        bo.mat.color.set(open ? '#7ce0ff' : '#ff3a4a').multiplyScalar(2.2 * blink);
        bo.chain.visible = on && !open && x.ph === ph;
        if (bo.chain.visible) {
          tmp2.copy(bo.g.position).y += 2.25;
          const top = a.g.position.clone();
          top.y -= 0.45;
          bo.chain.position.copy(tmp2);
          bo.chain.lookAt(top);
          bo.chain.scale.set(1.3 + Math.sin(t * 14 + a.i) * 0.3, 1.3, tmp2.distanceTo(top));
          bo.chainMat.opacity = 0.55 + Math.sin(t * 9 + a.i) * 0.15;
        }
      }),
    );
    tetherMat.opacity = 0.45 + Math.sin(t * 8) * 0.1;
    // petals of phase 3: shake, glow, fall
    islands.petals.forEach((pt) => {
      const t0 = x.fall && x.fall[pt.p.i];
      const k = t0 != null ? T - t0 : -1;
      if (k < 0) {
        pt.g.position.copy(pt.base);
        pt.g.rotation.set(0, 0, 0);
        pt.g.visible = true;
        pt.b.forEach((b) => (b.on = true));
        if (pt.cracks) pt.cracks.opacity = 0;
        return;
      }
      if (k < FALL.warn) {
        const s = (k / FALL.warn) * 0.08;
        pt.g.position.set(pt.base.x + Math.sin(t * 41) * s, pt.base.y + Math.sin(t * 37) * s, pt.base.z + Math.cos(t * 43) * s);
        if (pt.cracks) pt.cracks.opacity = Math.min(1, k / FALL.warn + 0.2) * (0.7 + 0.3 * Math.sin(t * 12));
        pt.b.forEach((b) => (b.on = true));
        const key = 'warn' + pt.p.i + ':' + t0;
        if (!lastFx[key]) {
          lastFx[key] = 1;
          Sound.play('rumble', 1);
        }
      } else {
        const f = k - FALL.warn;
        pt.b.forEach((b) => (b.on = false));
        pt.g.position.set(pt.base.x, pt.base.y - 4.9 * f * f, pt.base.z);
        pt.g.rotation.set(f * 0.12 * (pt.p.i % 2 ? 1 : -1), 0, f * 0.08);
        pt.g.visible = f < FALL.dur;
        if (pt.cracks) pt.cracks.opacity = Math.max(0, 1 - f);
        const key = 'fall' + pt.p.i + ':' + t0;
        if (!lastFx[key]) {
          lastFx[key] = 1;
          Sound.play('boom', pt.base.clone());
          Fx.burst(pt.base.clone().add(V3(0, 0.5, 0)), '#c8a49a', 80, 6, 1.2, -6);
          Cam.shake = Math.max(Cam.shake, 0.25);
        }
      }
    });
    // rim stones follow their petal
    if (x.fall) {
      islands.rimPts.forEach(([px, pz, pi], i) => {
        if (pi == null) return;
        const pt = islands.petals[pi];
        const e = pt.g.position.clone().sub(pt.base);
        const s = 0.28 + ((i * 37) % 7) * 0.045;
        Eu.set(i, i * 2.3, 0);
        Qt.setFromEuler(Eu);
        M4.compose(tmp2.set(O.x + px + e.x, O.y + 0.05 + e.y, O.z + pz + e.z), Qt, V3(s, s * 0.8, s));
        islands.rim.setMatrixAt(i, M4);
      });
      islands.rim.instanceMatrix.needsUpdate = true;
    }
    // sweeps: the beams turn around the saucer's own x/z
    const sw = x.sw;
    sweeps.forEach((s, k) => {
      const a = sweepAng(sw, T, k);
      s.g.visible = a != null && k < ((sw && sw.n) || 1);
      if (!s.g.visible) return;
      const tel = T < sw.t0 + SWEEP.tel;
      s.g.position.set(O.x + sw.x, belly.y, O.z + sw.z);
      s.g.rotation.y = a;
      s.sheet.scale.set(1, belly.y - O.y - 0.05, 1);
      s.line.position.y = -(belly.y - O.y) + 0.08;
      sweepMat.uniforms.uA.value = tel ? 0.25 + 0.25 * Math.sin(t * 25) : 1;
      s.sheet.visible = !tel;
      s.line.material = sweepLineMat;
      s.line.scale.y = tel ? 0.5 : 1;
    });
    // strikes
    lances.forEach((l) => {
      if (l.t <= 0) return;
      l.t -= dt;
      const k = Math.max(0, l.t / 0.45);
      l.m.scale.set(0.3 + (1 - k) * 2.2, l.h, 0.3 + (1 - k) * 2.2);
      l.m.material.opacity = k;
      if (l.t <= 0) l.m.visible = false;
    });
    // the intake: the beam's foot while it drinks
    const bm = x.beam;
    const open = bm && T >= bm.t0 && T <= bm.t1 && bm.intake;
    intake.visible = !!open;
    if (open) {
      intake.position.copy(P(bm.x, Math.max(0.05, groundY(bm.x, bm.z) + 0.06), bm.z));
      intake.material.opacity = 0.5 + 0.3 * Math.sin(t * 6);
      intake.material.color.set(bm.open ? '#9ff4ff' : '#ff3a4a').multiplyScalar(2);
      intake.rotation.y = t;
    }
    // the card at the end
    card.visible = x.stage === 2;
    if (card.visible) {
      card.rotation.y = t * 0.8;
      card.position.y = O.y + 1.7 + Math.sin(t * 1.6) * 0.15;
    }
  };
  const groundY = (x, z) => {
    const g = Phys.groundAt(O.x + x, O.y + 6, O.z + z);
    return g > -1e3 ? g - O.y : 0;
  };

  return {
    O,
    P,
    rel,
    group,
    build,
    get built() {
      return built;
    },
    wake,
    sleep,
    update,
    saucerModel,
    shieldMat,
    anchors,
    ANCHORS,
    unlockLeft,
    ANC_PLAT,
    cores,
    PETALS,
    SAUCER,
    INTAKE_R,
    SWEEP,
    FALL,
    inHeart,
    ground,
    groundY,
    petalFell,
    sweepAng,
    sweepHit,
    spawn,
    lance,
    nearCard: (q) => Math.hypot(q.x, q.z) < 2.6 && q.y < 4,
  };
})();
