const City = (() => {
  const LOT = 30;
  const HALF = 11;
  const N = 6;
  const r = rng(2026);
  const fogU = THREE.UniformsLib.fog;
  const MOOD = { uGold: { value: 0 }, uGray: { value: 0 }, uRed: { value: 0 } };

  const GL_TAIL = `
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  `;

  // HD surface maps (js/world/textures.js), sampled in world space by the city shaders
  const TX = {
    asphalt: Tex.build('asphalt'),
    pavement: Tex.build('pavement'),
    concrete: Tex.build('concrete'),
    brick: Tex.build('brick'),
    plaster: Tex.build('plaster'),
  };

  Phys.box(0, -1, 0, 800, 2, 800, { tag: 'ground' });
  const W = LOT * N + 19;
  [
    [W + 1, 0, 2, 800],
    [-W - 1, 0, 2, 800],
    [0, W + 1, 800, 2],
    [0, -W - 1, 800, 2],
  ].forEach(([x, z, sx, sz]) => Phys.box(x, 50, z, sx, 120, sz, { tag: 'nocam' }));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900, 1, 1).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        ...fogU,
        uTime: { value: 0 },
        ...MOOD,
        tAsph: { value: TX.asphalt.albedo },
        tAsphD: { value: TX.asphalt.data },
        tPave: { value: TX.pavement.albedo },
        tPaveD: { value: TX.pavement.data },
        tPlaza: { value: TX.pavement.albedo },
      },
      vertexShader: `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uGold;
        uniform float uGray;
        uniform float uRed;
        uniform sampler2D tAsph;
        uniform sampler2D tAsphD;
        uniform sampler2D tPave;
        uniform sampler2D tPaveD;
        uniform sampler2D tPlaza;
        varying vec3 vW;
        #include <fog_pars_fragment>
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec2 l = mod(vW.xz + 15.0, 30.0) - 15.0;
          vec2 a = abs(l);
          float lot = step(a.x, 11.0) * step(a.y, 11.0);
          float walk = step(a.x, 12.6) * step(a.y, 12.6) * (1.0 - lot);
          vec2 cellId = floor((vW.xz + 15.0) / 30.0);
          float plaza = step(abs(cellId.x), 0.5) * step(abs(cellId.y), 0.5);
          float n = noise(vW.xz * 0.6) * 0.5 + noise(vW.xz * 2.3) * 0.25;
          // light from above: height maps give the slabs and aggregate a little relief
          vec3 ta = texture2D(tAsph, vW.xz / 7.0).rgb;
          float ha = texture2D(tAsphD, vW.xz / 7.0).r;
          vec3 asphalt = vec3(0.05, 0.04, 0.062) * (0.55 + ta * 2.1) * (0.85 + n * 0.3);
          asphalt *= 0.9 + ha * 0.2;
          vec3 tp = texture2D(tPave, vW.xz / 6.0).rgb;
          float hp = texture2D(tPaveD, vW.xz / 6.0).r;
          vec3 side = vec3(0.1, 0.075, 0.105) * (0.35 + tp * 1.15) * (0.75 + hp * 0.3);
          vec3 col = mix(asphalt, side, walk + lot);
          vec3 tz = texture2D(tPlaza, vW.xz / 13.0).rgb;
          vec2 pt = abs(fract(vW.xz / 3.0) - 0.5);
          vec3 plz = vec3(0.16, 0.1, 0.15) * (0.45 + tz * 0.75) * (0.82 + 0.18 * step(0.485, max(pt.x, pt.y)));
          float ring = abs(length(vW.xz) - 9.0);
          plz += vec3(0.9, 0.25, 0.45) * smoothstep(0.12, 0.0, ring) * 0.6;
          col = mix(col, plz, lot * plaza);
          float lineX = step(abs(a.x - 15.0), 0.07) * step(0.5, fract(vW.z / 4.0)) * step(12.6, a.y);
          float lineZ = step(abs(a.y - 15.0), 0.07) * step(0.5, fract(vW.x / 4.0)) * step(12.6, a.x);
          col += vec3(0.5, 0.42, 0.25) * (lineX + lineZ) * 0.35;
          float cw = step(12.6, a.x) * step(a.x, 17.4) * step(11.2, a.y) * step(a.y, 12.6) * step(0.5, fract(vW.x));
          float cw2 = step(12.6, a.y) * step(a.y, 17.4) * step(11.2, a.x) * step(a.x, 12.6) * step(0.5, fract(vW.z));
          col += vec3(0.12) * (cw + cw2);
          float d = length(a - 11.6);
          col += vec3(1.0, 0.62, 0.42) * exp(-d * d * 0.05) * 0.16;
          float wet = smoothstep(0.55, 0.75, noise(vW.xz * 0.15 + 3.0)) * (1.0 - lot);
          col += vec3(0.5, 0.2, 0.55) * wet * 0.08 * (0.7 + 0.3 * sin(vW.x * 0.3 + uTime * 0.4));

          float lum = dot(col, vec3(0.3, 0.59, 0.11));
          col = mix(col, col * vec3(1.45, 1.05, 0.72) + vec3(0.05, 0.025, 0.0), uGold);
          col = mix(col, vec3(lum * 0.85), uGray);
          col = mix(col, vec3(lum * 1.8, lum * 0.18, lum * 0.22), uRed * 0.85);
          gl_FragColor = vec4(col, 1.0);
          ${GL_TAIL}
        }
      `,
    }),
  );
  R.scene.add(ground);

  const buildings = [];
  const addB = (x, z, sx, sz, h) => {
    buildings.push({ x, z, sx, sz, h });
    Phys.box(x, h / 2, z, sx, h, sz);
  };

  const SPECIAL = {
    '0,0': 'plaza',
    '1,0': 'door',
    '0,1': 'door2',
    '0,-1': 'screen',
    '-1,0': 'cafe',
    '2,-2': 'tower',
    '1,1': 'door',
    '-1,1': 'door',
    '1,-1': 'door',
    '-1,-1': 'door',
  };
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++) {
      const cx = i * LOT;
      const cz = j * LOT;
      const sp = SPECIAL[i + ',' + j];
      const edge = Math.abs(i) === N || Math.abs(j) === N;
      if (sp === 'plaza' || sp === 'cafe') continue;
      if (sp === 'door') {
        addB(cx, cz, 22, 22, 26);
        continue;
      }
      if (sp === 'door2') {
        addB(cx, cz, 22, 22, 30);
        continue;
      }
      if (sp === 'tower') {
        addB(cx, cz, 16, 16, 48);
        continue;
      }
      if (sp === 'screen') {
        addB(cx, cz, 22, 22, 44);
        continue;
      }
      const hgt = () => (edge ? 45 + r() * 40 : 8 + Math.pow(r(), 1.6) * 58);
      const k = r();
      if (k < 0.3) addB(cx, cz, 22, 22, hgt());
      else if (k < 0.6) {
        const s = 0.35 + r() * 0.3;
        const a = 22 * s - 0.5;
        const b = 22 * (1 - s) - 0.5;
        if (r() < 0.5) {
          addB(cx - 11 + a / 2, cz, a, 22, hgt());
          addB(cx + 11 - b / 2, cz, b, 22, hgt());
        } else {
          addB(cx, cz - 11 + a / 2, 22, a, hgt());
          addB(cx, cz + 11 - b / 2, 22, b, hgt());
        }
      } else {
        for (const [ox, oz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          const s = 9.5 + r() * 1.2;
          addB(cx + ox * 5.6, cz + oz * 5.6, s, s, hgt());
        }
      }
    }

  const bMat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...fogU,
      uLight: { value: 1 },
      ...MOOD,
      tConc: { value: TX.concrete.albedo },
      tBrick: { value: TX.brick.albedo },
      tPlas: { value: TX.plaster.albedo },
    },
    vertexShader: `
      varying vec3 vW;
      varying vec3 vN;
      varying float vSeed;
      varying float vTop;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vTop = length(instanceMatrix[1].xyz);
        vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uLight;
      uniform float uGold;
      uniform float uGray;
      uniform float uRed;
      uniform sampler2D tConc;
      uniform sampler2D tBrick;
      uniform sampler2D tPlas;
      varying vec3 vW;
      varying vec3 vN;
      varying float vSeed;
      varying float vTop;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 base = mix(vec3(0.05, 0.03, 0.07), vec3(0.12, 0.07, 0.13), vSeed);
        float side = 1.0 - abs(vN.y);
        vec2 f = abs(vN.x) > 0.5 ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y);
        if (side < 0.5) f = vW.xz;
        // facade material picked per building
        float kind = fract(vSeed * 7.31);
        vec3 tex = kind < 0.4 ? texture2D(tConc, f / 8.0).rgb
          : kind < 0.72 ? texture2D(tBrick, f / 4.5).rgb
          : texture2D(tPlas, f / 6.0).rgb;
        if (side < 0.5) tex = texture2D(tConc, f / 8.0).rgb;
        tex = mix(vec3(dot(tex, vec3(0.33))), tex, 0.6);
        base *= 0.4 + tex * 1.15;
        vec2 g = f / vec2(2.8, 3.4);
        vec2 id = floor(g);
        vec2 fr = fract(g);
        float win = step(0.28, fr.x) * step(fr.x, 0.72) * step(0.3, fr.y) * step(fr.y, 0.72);
        float frame = step(0.24, fr.x) * step(fr.x, 0.76) * step(0.25, fr.y) * step(fr.y, 0.76) - win;
        float sill = step(0.22, fr.x) * step(fr.x, 0.78) * step(0.2, fr.y) * step(fr.y, 0.25);
        vec3 rn = floor(vN + 0.5);
        float h = hash(id + floor(vSeed * 97.0) + rn.x * 7.0 + rn.z * 13.0);
        float lit = step(0.7, h) * uLight;
        vec3 wc = mix(vec3(1.0, 0.7, 0.42), vec3(0.62, 0.72, 1.0), step(0.86, h));
        wc = mix(wc, vec3(1.0, 0.38, 0.62), step(0.95, h));
        // rooms are not evenly lit: a lamp somewhere, a curtain half drawn
        float room = 0.6 + 0.4 * smoothstep(0.0, 0.7, 1.0 - abs(fr.x - (0.35 + 0.3 * hash(id + 3.1))) * 2.2);
        float curtain = step(0.5, hash(id + 9.7)) * smoothstep(0.62, 0.58, fr.x) * 0.45;
        wc *= room * (1.0 - curtain) * (1.0 - 0.45 * uGold);
        float band = step(2.0, vW.y) * step(vW.y, vTop - 1.4);
        float diff = max(dot(vN, normalize(vec3(-0.4, 0.8, -0.3))), 0.0);
        vec3 col = base * (0.35 + 0.5 * diff);
        // dark glass with a faint sky reflection when the room is unlit
        vec3 glass = vec3(0.025, 0.02, 0.045) + vec3(0.05, 0.03, 0.07) * fr.y;
        col = mix(col, col * 0.55, frame * side * band);
        col += vec3(0.05, 0.04, 0.05) * sill * side * band;
        col = mix(col, lit * wc * (0.55 + 0.35 * h) + (1.0 - lit) * glass, win * side * band);
        col += vec3(1.0, 0.3, 0.5) * smoothstep(0.25, 0.0, vTop - vW.y) * side * step(0.72, vSeed) * 1.6;
        col += vec3(0.12, 0.04, 0.1) * exp(-vW.y * 0.25) * side;

        float lum = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, col * vec3(1.45, 1.05, 0.72) + vec3(0.05, 0.025, 0.0), uGold);
        col = mix(col, vec3(lum * 0.85), uGray);
        col = mix(col, vec3(lum * 1.8, lum * 0.18, lum * 0.22), uRed * 0.85);
        gl_FragColor = vec4(col, 1.0);
        ${GL_TAIL}
      }
    `,
  });

  const unit = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bMesh = new THREE.InstancedMesh(unit, bMat, buildings.length);
  const m4 = new THREE.Matrix4();
  buildings.forEach((b, i) => {
    m4.makeScale(b.sx, b.h, b.sz).setPosition(b.x, 0, b.z);
    bMesh.setMatrixAt(i, m4);
  });
  bMesh.frustumCulled = false;
  R.scene.add(bMesh);

  const neons = [];
  const PAL = ['#ff3d7f', '#ff5fa2', '#3de1ff', '#b26bff', '#ffb347'].map(
    (c) => new THREE.Color(c),
  );
  buildings.forEach((b) => {
    if (r() < 0.45) return;
    const face = (r() * 4) | 0;
    const vert = r() < 0.6;
    const len = vert ? 4 + r() * Math.min(14, b.h - 6) : 3 + r() * 6;
    const y = vert
      ? 3 + r() * Math.max(0, b.h - len - 4) + len / 2
      : 4 + r() * Math.max(1, b.h - 8);
    const c = PAL[(r() * PAL.length) | 0];
    const off = (r() - 0.5) * 0.7;
    let x = b.x;
    let z = b.z;
    let sx = 0.18;
    let sz = 0.18;
    if (face < 2) {
      z += (face ? 1 : -1) * (b.sz / 2 + 0.1);
      x += off * b.sx;
      if (!vert) sx = len;
    } else {
      x += (face === 3 ? 1 : -1) * (b.sx / 2 + 0.1);
      z += off * b.sz;
      if (!vert) sz = len;
    }
    neons.push({ x, y, z, sx, sy: vert ? len : 0.18, sz, c });
  });
  const nMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ toneMapped: false }),
    neons.length,
  );
  const tc = new THREE.Color();
  neons.forEach((n, i) => {
    m4.makeScale(n.sx, n.sy, n.sz).setPosition(n.x, n.y, n.z);
    nMesh.setMatrixAt(i, m4);
    nMesh.setColorAt(i, tc.copy(n.c).multiplyScalar(2.2));
  });
  nMesh.frustumCulled = false;
  R.scene.add(nMesh);

  const lamps = [];
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++)
      for (const [ox, oz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        lamps.push([i * LOT + ox * 11.8, j * LOT + oz * 11.8]);
  // merge simple geometries into one (position/normal/uv), for instanced props
  const mergeGeos = (list) => {
    const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
    const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
    const out = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach((nm) => {
      const size = nm === 'uv' ? 2 : 3;
      const arr = new Float32Array(n * size);
      let o = 0;
      parts.forEach((g) => {
        const a = g.attributes[nm];
        if (a) arr.set(a.array, o);
        o += g.attributes.position.count * size;
      });
      out.setAttribute(nm, new THREE.BufferAttribute(arr, size));
    });
    out.computeBoundingSphere();
    return out;
  };
  // thin rods skip their end caps (never seen), anything wider keeps them
  const cyl = (r0, r1, h, seg = 8) =>
    new THREE.CylinderGeometry(r0, r1, h, seg, 1, Math.max(r0, r1) < 0.09);
  // arm points along +z: the lantern hangs over the street
  const lampGeo = mergeGeos([
    cyl(0.2, 0.26, 0.5).translate(0, 0.25, 0),
    cyl(0.15, 0.2, 0.18).translate(0, 0.59, 0),
    cyl(0.055, 0.085, 5.3).translate(0, 3.3, 0),
    cyl(0.1, 0.1, 0.12).translate(0, 1.6, 0),
    cyl(0.1, 0.07, 0.25).translate(0, 5.98, 0),
    cyl(0.035, 0.035, 0.9, 6).rotateX(-1.1).translate(0, 6.3, 0.4),
    cyl(0.035, 0.035, 0.7, 6).rotateX(Math.PI / 2).translate(0, 6.52, 1.1),
    cyl(0.05, 0.36, 0.26, 12).translate(0, 6.43, 1.42),
    cyl(0.03, 0.03, 0.14, 6).translate(0, 6.6, 1.42),
    new THREE.TorusGeometry(0.21, 0.025, 4, 12).rotateX(Math.PI / 2).translate(0, 5.98, 1.42),
  ]);
  const poleM = new THREE.InstancedMesh(
    lampGeo,
    Tex.mat('metal', { color: '#2e2634', metal: 0.75, rough: 0.55, scale: 3, bump: 0.25 }),
    lamps.length,
  );
  const bulbM = new THREE.InstancedMesh(
    cyl(0.17, 0.22, 0.42, 12).translate(0, 6.1, 1.42),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffb070').multiplyScalar(2.4),
      toneMapped: false,
    }),
    lamps.length,
  );
  const lampQ = new THREE.Quaternion();
  const lampS = V3(1, 1, 1);
  const lampY = V3(0, 1, 0);
  lamps.forEach(([x, z], i) => {
    // corner lamps lean out toward the crossing
    const ox = x - Math.round(x / LOT) * LOT;
    const oz = z - Math.round(z / LOT) * LOT;
    lampQ.setFromAxisAngle(lampY, Math.atan2(ox, oz));
    m4.compose(V3(x, 0, z), lampQ, lampS);
    poleM.setMatrixAt(i, m4);
    bulbM.setMatrixAt(i, m4);
    Phys.box(x, 3, z, 0.36, 6, 0.36);
  });
  poleM.frustumCulled = bulbM.frustumCulled = false;
  R.scene.add(poleM, bulbM);

  const stone = Tex.mat('stone', { color: '#6a4a72', scale: 3 });
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.6, 48), stone);
  fountain.position.y = 0.3;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(4.15, 0.16, 10, 64).rotateX(Math.PI / 2),
    Tex.mat('marble', { color: '#d8c8dc', scale: 2, rough: 0.6 }),
  );
  rim.position.y = 0.62;
  R.scene.add(rim);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: '#2a0f3a',
      roughness: 0.05,
      metalness: 0.9,
      emissive: '#3a0c2a',
    }),
  );
  water.position.y = 0.55;
  R.scene.add(fountain, water);
  // basin + rim (r 4.3, top 0.78): three boxes give a close octagon instead of a square
  Phys.box(0, 0.39, 0, 6.1, 0.78, 6.1);
  Phys.box(0, 0.39, 0, 8.6, 0.78, 3.6);
  Phys.box(0, 0.39, 0, 3.6, 0.78, 8.6);
  Phys.box(0, 0.39, 0, 7.9, 0.78, 5.2);
  Phys.box(0, 0.39, 0, 5.2, 0.78, 7.9);

  // park bench: wooden slats on two cast-iron frames
  const woodM = Tex.mat('wood', { color: '#6a4636', scale: 4, bump: 0.6 });
  const ironM = Tex.mat('metal', { color: '#2c2630', metal: 0.8, rough: 0.6, scale: 1 });
  const slatGeo = new THREE.BoxGeometry(3, 0.05, 0.16);
  const backSlatGeo = new THREE.BoxGeometry(3, 0.14, 0.04);
  const legGeo = new THREE.BoxGeometry(0.08, 0.5, 0.7);
  const legBackGeo = new THREE.BoxGeometry(0.08, 0.6, 0.06);
  const benches = [];
  const addBench = (x, y, z, yaw, group = R.scene) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const sl = new THREE.Mesh(slatGeo, woodM);
      sl.position.set(0, 0.48, -0.27 + i * 0.18);
      g.add(sl);
    }
    for (let i = 0; i < 3; i++) {
      const sl = new THREE.Mesh(backSlatGeo, woodM);
      sl.position.set(0, 0.68 + i * 0.17, -0.38);
      sl.rotation.x = -0.12;
      g.add(sl);
    }
    for (const sx of [-1.3, 1.3]) {
      const leg = new THREE.Mesh(legGeo, ironM);
      leg.position.set(sx, 0.22, -0.02);
      const lb = new THREE.Mesh(legBackGeo, ironM);
      lb.position.set(sx, 0.75, -0.38);
      g.add(leg, lb);
    }
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    group.add(g);
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    Phys.box(x, y + 0.25, z, along ? 0.8 : 3, 0.5, along ? 3 : 0.8, { tag: 'bench' });
    // backrest: you can lean on it, not walk through it
    const bx = x - Math.sin(yaw) * 0.38;
    const bz = z - Math.cos(yaw) * 0.38;
    Phys.box(bx, y + 0.81, bz, along ? 0.12 : 3, 0.62, along ? 3 : 0.12, { tag: 'bench' });
    const b = { pos: V3(x, y, z), yaw, g };
    benches.push(b);
    return b;
  };
  addBench(0, 0, 9.6, Math.PI);
  addBench(0, 0, -9.6, 0);
  addBench(9.6, 0, 0, -Math.PI / 2);
  addBench(-9.6, 0, 0, Math.PI / 2);

  // back of a playing card: burgundy, gold filigree, a question mark
  const cardTex = (() => {
    const W = 512;
    const H = 720;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#f4ece0';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#4a0c22';
    g.fillRect(22, 22, W - 44, H - 44);
    g.strokeStyle = 'rgba(232,189,132,0.28)';
    g.lineWidth = 2;
    for (let k = -H; k < W + H; k += 22) {
      g.beginPath();
      g.moveTo(k, 22);
      g.lineTo(k + H, H - 22);
      g.moveTo(k + H, 22);
      g.lineTo(k, H - 22);
      g.stroke();
    }
    g.strokeStyle = '#e8bd84';
    g.lineWidth = 8;
    g.strokeRect(40, 40, W - 80, H - 80);
    g.lineWidth = 3;
    g.strokeRect(56, 56, W - 112, H - 112);
    g.fillStyle = '#4a0c22';
    g.beginPath();
    g.arc(W / 2, H / 2, 150, 0, TAU);
    g.fill();
    g.strokeStyle = '#e8bd84';
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = '#ff5f8a';
    g.shadowColor = '#ff5f8a';
    g.shadowBlur = 30;
    g.font = 'italic 260px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', W / 2, H / 2 + 10);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  })();
  const bigCard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 4.5),
    new THREE.MeshBasicMaterial({ map: cardTex, side: THREE.DoubleSide, toneMapped: false }),
  );
  bigCard.position.set(0, 5.5, 0);
  R.scene.add(bigCard);

  const signTex = (txt, sub, col) => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 1024, 512);
    g.shadowColor = col;
    g.shadowBlur = 48;
    g.fillStyle = col;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'italic 220px Georgia';
    Icons.fillText(g, txt, 512, 220);
    if (sub) {
      g.font = '56px monospace';
      Icons.fillText(g, sub, 512, 410);
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  };

  const glowMat = (c, k = 1.6) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

  const makeDoor = (pos, rotY, txt, sub, color, entry) => {
    const g = new THREE.Group();
    const frame = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), toneMapped: false });
    [
      [0, 4.1, 0, 0.3, 0.3, 4.2],
      [0, 2, -2, 0.3, 4.2, 0.3],
      [0, 2, 2, 0.3, 4.2, 0.3],
    ].forEach(([x, y, z, sx, sy, sz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frame);
      m.position.set(x, y, z);
      g.add(m);
    });
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(3.7, 4).rotateY(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.9 }),
    );
    fill.position.set(-0.05, 2, 0);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 2.5).rotateY(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: signTex(txt, sub, color),
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    sign.position.set(-0.2, 6, 0);
    g.add(fill, sign);
    g.position.copy(pos);
    g.rotation.y = rotY;
    R.scene.add(g);
    [-2, 2].forEach((lz) =>
      Phys.box(pos.x + lz * Math.sin(rotY), 2.1, pos.z + lz * Math.cos(rotY), 0.34, 4.2, 0.34),
    );
    return { frame, fill, sign, color: new THREE.Color(color), on: 0, target: 0, entry };
  };

  const doors = {
    h10: makeDoor(
      V3(LOT - HALF - 0.1, 0, 0),
      0,
      '♥ A',
      'LA BALANCE',
      '#ff5f8a',
      V3(LOT - HALF - 1.5, 0, 0),
    ),
    c4: makeDoor(
      V3(0, 0, LOT - HALF - 0.1),
      -Math.PI / 2,
      '♣ 4',
      'LE LABYRINTHE',
      '#7ce0ff',
      V3(0, 0, LOT - HALF - 1.5),
    ),
  };

  doors.sK = makeDoor(
    V3(0, 0, -(LOT - HALF) + 0.1),
    Math.PI / 2,
    '♠ R',
    'LE ROI DE PIQUE',
    '#ffcf8a',
    V3(0, 0, -(LOT - HALF) + 1.5),
  );

  doors.d9 = makeDoor(
    V3(-LOT + HALF + 0.6, 0, -9),
    0,
    '♦ 9',
    'LES PORTES',
    '#ff9a3a',
    V3(-LOT + HALF + 2, 0, -9),
  );

  [
    ['s3', 1, 24, '♠ 3', 'UN, DEUX, TROIS, SOLEIL', '#ff9ec4'],
    ['s7', -1, 24, '♠ 7', 'LA CRYPTE', '#b9a6ff'],
    ['h2', 1, -24, '♥ 2', 'LA RIVIÈRE', '#ffb3c7'],
    ['cR', -1, -24, '♣ R', 'LE CAVEAU', '#7cf0c8'],
  ].forEach(([id, sx, z, txt, sub, col]) => {
    const x = sx * (LOT - HALF - 0.1);
    doors[id] = makeDoor(
      V3(x, 0, z),
      sx > 0 ? 0 : Math.PI,
      txt,
      sub,
      col,
      V3(sx * (LOT - HALF - 1.5), 0, z),
    );
  });

  // Free building faces along the streets, nearest to the plaza first: each new épreuve
  // (js/game/trials.js) gets its own door on one of them.
  let slots = null;
  const doorSlots = () => {
    if (slots) return slots;
    const stairs = roofs.map((r) => [r.b, r.face]);
    const out = [];
    buildings.forEach((b) => {
      const ci = Math.round(b.x / LOT);
      const cj = Math.round(b.z / LOT);
      if (Math.abs(ci) >= N || Math.abs(cj) >= N || SPECIAL[ci + ',' + cj]) return;
      [
        [1, 0, 'x+'],
        [-1, 0, 'x-'],
        [0, 1, 'z+'],
        [0, -1, 'z-'],
      ].forEach(([nx, nz, face]) => {
        const fx = nx ? b.x + (nx * b.sx) / 2 : b.x;
        const fz = nz ? b.z + (nz * b.sz) / 2 : b.z;
        // only faces on the street edge of the block, wide and tall enough for a door
        const edge = nx
          ? Math.abs(fx - (ci * LOT + nx * HALF)) < 0.6
          : Math.abs(fz - (cj * LOT + nz * HALF)) < 0.6;
        if (!edge || (nx ? b.sz : b.sx) < 7 || b.h < 7) return;
        if (stairs.some(([sb, sf]) => sb === b && sf === face)) return;
        out.push({
          pos: V3(fx + nx * 0.1, 0, fz + nz * 0.1),
          entry: V3(fx + nx * 1.5, 0, fz + nz * 1.5),
          rotY: nx === -1 ? 0 : nx === 1 ? Math.PI : nz === -1 ? -Math.PI / 2 : Math.PI / 2,
          d: Math.hypot(fx, fz),
        });
      });
    });
    out.sort((a, b) => a.d - b.d);
    slots = [];
    out.forEach((sl) => {
      if (slots.every((o) => o.pos.distanceTo(sl.pos) > 16)) slots.push(sl);
    });
    return slots;
  };
  const addDoor = (id, k, txt, sub, color) => {
    if (doors[id]) return doors[id];
    const sl = doorSlots()[k % doorSlots().length];
    doors[id] = makeDoor(sl.pos, sl.rotY, txt, sub, color, sl.entry);
    return doors[id];
  };

  const pillarGeo = new THREE.CylinderGeometry(0.7, 0.7, 60, 12, 1, true).translate(0, 30, 0);
  const pillars = [];
  const makePillar = (pos, color = '#ffcf8a') => {
    const m = new THREE.Mesh(
      pillarGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(1.4),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    m.position.copy(pos);
    m.visible = false;
    m.userData.on = false;
    R.scene.add(m);
    pillars.push(m);
    return m;
  };

  const places = {};
  const addPlace = (id, group, entry, onShow) => {
    group.visible = false;
    group.scale.set(1, 0.001, 1);
    R.scene.add(group);
    places[id] = { group, entry, onShow, t: -1, pillar: makePillar(entry), shown: false };
  };

  const cafe = new THREE.Group();
  const cafeBody = new THREE.Mesh(
    new THREE.BoxGeometry(14, 7, 12),
    Tex.mat('brick', { color: '#6a4452', scale: 4, emissive: '#1a0810' }),
  );
  cafeBody.position.y = 3.5;
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.25, 10),
    Tex.mat('fabric', { color: '#e0405a', scale: 0.8, emissive: '#3a0812' }),
  );
  awning.position.set(7.6, 3.2, 0);
  awning.rotation.z = -0.25;
  const cafeWin = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2.4).rotateY(Math.PI / 2),
    glowMat('#ffb070', 0.85),
  );
  cafeWin.position.set(7.02, 1.8, 0);
  const cafeSign = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3).rotateY(Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: signTex('Café', 'SOUVENIR 01', '#ffcf8a'),
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  cafeSign.position.set(7.1, 5.6, 0);
  cafe.add(cafeBody, awning, cafeWin, cafeSign);
  {
    const frameM = Tex.mat('wood', { color: '#3a1e24', scale: 1.2, rough: 0.6 });
    const brassM = Tex.mat('metal', { color: '#c9a24a', metal: 0.9, rough: 0.35, scale: 1 });
    const part = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      cafe.add(m);
      return m;
    };
    // window frame + mullions, a glass door in the middle
    part(new THREE.BoxGeometry(0.16, 0.18, 8.3), frameM, 7.06, 3.05, 0);
    part(new THREE.BoxGeometry(0.2, 0.5, 8.3), frameM, 7.08, 0.25, 0);
    [-4.07, -2.1, 2.1, 4.07].forEach((z) =>
      part(new THREE.BoxGeometry(0.14, 2.8, 0.14), frameM, 7.07, 1.65, z),
    );
    [-1.0, 1.0].forEach((z) =>
      part(new THREE.BoxGeometry(0.16, 3.0, 0.16), frameM, 7.08, 1.5, z),
    );
    part(new THREE.BoxGeometry(0.05, 2.5, 1.84), glowMat('#3a1a26', 1), 7.05, 1.3, 0);
    part(new THREE.BoxGeometry(0.06, 0.06, 0.5), brassM, 7.14, 1.25, 0.6);
    part(new THREE.BoxGeometry(0.12, 0.12, 8.6), frameM, 7.04, 6.95, 0);
    // A-frame menu board
    const board = new THREE.Group();
    const bm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.7), frameM);
    const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), glowMat('#1e2a24', 1));
    chalk.position.set(0.03, 0, 0);
    chalk.rotation.y = Math.PI / 2;
    bm.add(chalk);
    [-0.22, 0.22].forEach((tilt, k) => {
      const p = bm.clone();
      p.rotation.z = tilt;
      p.position.set(k ? 0.2 : -0.2, 0.55, 0);
      board.add(p);
    });
    board.position.set(8.3, 0, 2.6);
    board.rotation.y = 0.3;
    cafe.add(board);
    // terrace: two bistro tables with chairs on the sides of the shop
    const tableGeo = mergeGeos([
      cyl(0.36, 0.36, 0.04, 20).translate(0, 0.74, 0),
      cyl(0.03, 0.03, 0.72, 8).translate(0, 0.37, 0),
      cyl(0.22, 0.25, 0.03, 16).translate(0, 0.015, 0),
    ]);
    const chairGeo = mergeGeos([
      cyl(0.2, 0.2, 0.04, 16).translate(0, 0.46, 0),
      new THREE.BoxGeometry(0.36, 0.34, 0.03).translate(0, 0.72, -0.18),
      ...[
        [-0.13, -0.13],
        [0.13, -0.13],
        [-0.13, 0.13],
        [0.13, 0.13],
      ].map(([x, z]) => cyl(0.015, 0.015, 0.46, 6).translate(x, 0.23, z)),
    ]);
    [
      [4.5, 7.6],
      [4.5, -7.6],
    ].forEach(([x, z]) => {
      const t = new THREE.Mesh(tableGeo, brassM);
      t.position.set(x, 0, z);
      cafe.add(t);
      [-0.75, 0.75].forEach((dz) => {
        const ch = new THREE.Mesh(chairGeo, brassM);
        ch.position.set(x, 0, z + dz);
        ch.rotation.y = dz > 0 ? Math.PI : 0;
        cafe.add(ch);
      });
    });
  }
  cafe.position.set(-LOT + 3, 0, 0);
  addPlace('cafe', cafe, V3(-LOT + 11, 0, 0), () => {
    Phys.box(-LOT + 3, 3.5, 0, 14, 7, 12);
    // the awning can be landed on
    Phys.box(-LOT + 10.6, 3.3, 0, 1.6, 0.3, 10);
    // terrace tables (chairs are low enough to walk past)
    [7.6, -7.6].forEach((z) => Phys.box(-LOT + 7.5, 0.38, z, 0.75, 0.76, 0.75));
    Phys.box(-LOT + 11.3, 0.55, 2.6, 0.55, 1.1, 0.8);
  });

  const banc = new THREE.Group();
  const bulb = glowMat('#ffcf8a', 2);
  [-2.2, 2.2].forEach((x) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6).translate(0, 1.6, 0),
      stone,
    );
    pole.position.set(x, 0, -0.8);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bulb);
    b.position.set(x, 3.25, -0.8);
    banc.add(pole, b);
  });
  for (let i = 0; i < 14; i++) {
    const k = i / 13;
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 4),
      glowMat(i % 2 ? '#ff8fb0' : '#ffcf8a', 2.2),
    );
    b.position.set(-2.2 + k * 4.4, 3.1 - Math.sin(k * Math.PI) * 0.6, -0.8);
    banc.add(b);
  }
  const tree = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 3.4, 10).translate(0, 2.6, 0),
    Tex.mat('grass', { color: '#5a3a8a', scale: 1.5, emissive: '#1a0a2a' }),
  );
  tree.position.set(3.4, 0, -1.2);
  banc.add(tree);
  banc.position.set(-LOT / 2, 0, LOT / 2);
  banc.rotation.y = Math.PI;
  addPlace('banc', banc, V3(-LOT / 2, 0, LOT / 2 - 1.6), () => {
    addBench(-LOT / 2, 0, LOT / 2, Math.PI);
    Phys.box(-LOT / 2 - 3.4, 1.7, LOT / 2 + 1.2, 1.6, 3.4, 1.6);
  });

  const kino = new THREE.Group();
  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.8, 2),
    Tex.mat('marble', { color: '#6a2238', scale: 1.6, rough: 0.45, emissive: '#14040c' }),
  );
  booth.position.set(0, 1.4, -1.2);
  const marquee = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.3),
    new THREE.MeshBasicMaterial({
      map: signTex('Cinéma', 'SOUVENIR 05', '#ff8fb0'),
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  marquee.position.set(0, 3.9, -0.15);
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      glowMat(i % 2 ? '#ffcf8a' : '#ff8fb0', 2.2),
    );
    b.position.set(-2.3 + (i / 11) * 4.6, 2.85, -0.12);
    kino.add(b);
  }
  kino.add(booth, marquee);
  {
    const goldM = Tex.mat('metal', { color: '#c9a24a', metal: 0.9, rough: 0.35, scale: 1 });
    const darkM = Tex.mat('marble', { color: '#2a1420', scale: 1.5, rough: 0.5 });
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      kino.add(m);
      return m;
    };
    add(new THREE.BoxGeometry(3.6, 0.3, 2.2), darkM, 0, 0.15, -1.2);
    add(new THREE.BoxGeometry(3.7, 0.25, 2.3), darkM, 0, 2.92, -1.2);
    // ticket window: lit glass, brass frame, a little counter
    add(new THREE.PlaneGeometry(1.5, 1.0), glowMat('#ffcf8a', 1.1), 0, 1.6, -0.19);
    add(new THREE.BoxGeometry(1.7, 0.08, 0.06), goldM, 0, 2.12, -0.17);
    add(new THREE.BoxGeometry(1.7, 0.08, 0.06), goldM, 0, 1.08, -0.17);
    [-0.82, 0.82].forEach((x) => add(new THREE.BoxGeometry(0.08, 1.1, 0.06), goldM, x, 1.6, -0.17));
    add(new THREE.BoxGeometry(1.6, 0.06, 0.3), goldM, 0, 1.06, -0.05);
    // columns at the corners
    [-1.62, 1.62].forEach((x) =>
      add(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 14), goldM, x, 1.5, -0.2),
    );
    // film posters on the sides
    [
      [-1.71, '#ff5f8a'],
      [1.71, '#7ce0ff'],
    ].forEach(([x, c]) => {
      const p = add(new THREE.PlaneGeometry(1.1, 1.6), glowMat(c, 0.7), x, 1.55, -1.2);
      p.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      const fr = add(new THREE.BoxGeometry(0.04, 1.75, 1.25), goldM, x * 0.995, 1.55, -1.2);
      fr.scale.set(1, 1, 1);
    });
  }
  kino.position.set(LOT / 2, 0, LOT / 2);
  kino.rotation.y = Math.PI;
  addPlace('kino', kino, V3(LOT / 2, 0, LOT / 2 - 1.6), () =>
    Phys.box(LOT / 2, 1.52, LOT / 2 + 1.2, 3.7, 3.05, 2.3),
  );

  const danse = new THREE.Group();
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.3, 40),
    Tex.mat('wood', { color: '#7a4a5a', scale: 1.8, rough: 0.7 }),
  );
  stage.position.y = 0.15;
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.45, 1),
    new THREE.MeshStandardMaterial({
      color: '#dfe6ff',
      metalness: 1,
      roughness: 0.1,
      emissive: '#3a3a5a',
      flatShading: true,
    }),
  );
  ball.position.y = 4.2;
  ball.name = 'gem';
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2, 4), stone);
  string.position.y = 5.4;
  danse.add(stage, ball, string);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const l = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 4),
      glowMat(['#ff5f8a', '#7ce0ff', '#ffcf8a', '#b07cff'][i % 4], 2.4),
    );
    l.position.set(Math.cos(a) * 2.5, 0.35, Math.sin(a) * 2.5);
    danse.add(l);
  }
  danse.position.set(LOT / 2, 0, -LOT / 2);
  addPlace('danse', danse, V3(LOT / 2, 0, -LOT / 2 + 2.6), () =>
    Phys.box(LOT / 2, 0.15, -LOT / 2, 3.6, 0.3, 3.6),
  );

  const neonMat = (c, k = 2) => glowMat(c, k);
  const darkMetal = Tex.mat('metal', { color: '#4a3a52', metal: 0.6, rough: 0.9, scale: 1.5 });
  const placeSign = (txt, sub, col, w = 4.4) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 2),
      new THREE.MeshBasicMaterial({
        map: signTex(txt, sub, col),
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

  // Souvenir 02: a phone booth with a glowing screen and a floating message bubble
  const message = new THREE.Group();
  const boothM = Tex.mat('metal', {
    color: '#c02848',
    metal: 0.3,
    rough: 0.9,
    scale: 1.5,
    emissive: '#2a0410',
  });
  [
    [-0.75, 0, 0.12, 2.6, 1.5],
    [0.75, 0, 0.12, 2.6, 1.5],
    [0, -0.75, 1.5, 2.6, 0.12],
  ].forEach(([x, z, sx, sy, sz]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), boothM);
    m.position.set(x, 1.3, z);
    message.add(m);
  });
  const boothTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.7), boothM);
  boothTop.position.y = 2.72;
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.12), darkMetal);
  phone.position.set(0, 1.4, -0.62);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), neonMat('#9fe6ff', 1.8));
  scr.position.set(0, 1.55, -0.55);
  const bubble = new THREE.Group();
  const bub = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), neonMat('#ff8fb0', 1.3));
  bub.scale.set(1.5, 1, 0.4);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 8), neonMat('#ff8fb0', 1.3));
  tail.position.set(-0.35, -0.42, 0);
  tail.rotation.z = 0.6;
  [-0.3, 0, 0.3].forEach((x) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), neonMat('#fff4f8', 2));
    d.position.set(x, 0, 0.18);
    bubble.add(d);
  });
  bubble.add(bub, tail);
  bubble.position.set(0, 3.7, 0);
  bubble.name = 'float';
  const msgSign = placeSign('Message', 'SOUVENIR 02', '#ff8fb0', 3.2);
  msgSign.position.set(0, 2.2, 0.8);
  message.add(boothTop, phone, scr, bubble, msgSign);
  message.position.set(-LOT / 2, 0, -LOT / 2);
  addPlace('message', message, V3(-LOT / 2, 0, -LOT / 2 + 2), () => {
    Phys.box(-LOT / 2, 1.3, -LOT / 2 - 0.4, 1.6, 2.6, 0.9);
    Phys.box(-LOT / 2 - 0.75, 1.3, -LOT / 2, 0.12, 2.6, 1.5);
    Phys.box(-LOT / 2 + 0.75, 1.3, -LOT / 2, 0.12, 2.6, 1.5);
    Phys.box(-LOT / 2, 2.72, -LOT / 2, 1.7, 0.25, 1.7);
  });

  // Souvenir 04: a bus shelter under its own little rain cloud
  const pluie = new THREE.Group();
  const glassM = new THREE.MeshStandardMaterial({
    color: '#9fd8ff',
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    metalness: 0.2,
    depthWrite: false,
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 1.8), darkMetal);
  roof.position.set(0, 2.6, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.4, 0.06), glassM);
  back.position.set(0, 1.3, -0.8);
  [-2.2, 2.2].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), darkMetal);
    post.position.set(x, 1.3, -0.8);
    pluie.add(post);
  });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.45), darkMetal);
  seat.position.set(0, 0.5, -0.5);
  const cloud = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(0.7 + (i % 3) * 0.25, 14, 10),
      new THREE.MeshStandardMaterial({ color: '#c9b8e8', roughness: 1, emissive: '#3a2a5a' }),
    );
    c.position.set(-2 + i * 0.66, (i % 2) * 0.3, (i % 3) * 0.25 - 0.25);
    cloud.add(c);
  }
  cloud.position.y = 5.2;
  const drops = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.02, 0.35, 0.02),
    neonMat('#9fd8ff', 1.4),
    90,
  );
  drops.name = 'rain';
  drops.userData.seeds = [...Array(90)].map(() => [
    Math.random() * 5 - 2.5,
    Math.random(),
    Math.random() * 2 - 0.6,
  ]);
  const rainSign = placeSign('Averse', 'SOUVENIR 04', '#9fd8ff', 3.2);
  rainSign.position.set(0, 3.3, 0.2);
  pluie.add(roof, back, seat, cloud, drops, rainSign);
  pluie.position.set(-LOT / 2, 0, LOT + LOT / 2);
  pluie.rotation.y = Math.PI;
  addPlace('pluie', pluie, V3(-LOT / 2, 0, LOT + LOT / 2 - 1.6), () => {
    Phys.box(-LOT / 2, 1.3, LOT + LOT / 2 + 0.8, 4.6, 2.6, 0.3);
    Phys.box(-LOT / 2, 2.6, LOT + LOT / 2, 4.6, 0.15, 1.8);
    Phys.box(-LOT / 2, 0.275, LOT + LOT / 2 + 0.5, 3, 0.55, 0.45);
  });

  // Souvenir 06: a brass telescope on a little round stage, pointing at a bright star
  const etoiles = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.4, 32), darkMetal);
  plinth.position.y = 0.2;
  const brass = Tex.mat('metal', {
    color: '#f0c070',
    metal: 0.9,
    rough: 0.5,
    scale: 1,
    emissive: '#3a2408',
  });
  const tri = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 6), brass);
    const a = (i / 3) * TAU;
    leg.position.set(Math.cos(a) * 0.35, 0.75, Math.sin(a) * 0.35);
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    tri.add(leg);
  }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.5, 20), brass);
  tube.position.set(0, 1.75, 0.2);
  tube.rotation.x = -0.9;
  tri.position.y = 0.4;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), neonMat('#fff2c8', 3));
  star.position.set(0, 9, 6);
  star.name = 'gem';
  const starSign = placeSign('Étoiles', 'SOUVENIR 06', '#fff2c8', 3.4);
  starSign.position.set(0, 3.2, -1.2);
  etoiles.add(plinth, tri, tube, star, starSign);
  etoiles.position.set(LOT + LOT / 2, 0, LOT / 2);
  etoiles.rotation.y = -Math.PI / 2;
  addPlace('etoiles', etoiles, V3(LOT + LOT / 2 - 2.2, 0, LOT / 2), () =>
    Phys.box(LOT + LOT / 2, 0.2, LOT / 2, 3.2, 0.4, 3.2),
  );

  // Souvenir 07: a juke-box with floating notes
  const chanson = new THREE.Group();
  const jb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.9, 32, 1, false, 0, Math.PI),
    Tex.mat('wood', { color: '#a04070', scale: 1, rough: 0.5, emissive: '#1a0410' }),
  );
  jb.rotation.y = -Math.PI / 2;
  jb.position.y = 1.9;
  const jbBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 0.9), jb.material);
  jbBody.position.y = 0.75;
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.06, 10, 32, Math.PI),
    neonMat('#ffcf8a', 2),
  );
  arch.position.set(0, 1.55, 0.47);
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), neonMat('#ff5f8a', 1.1));
  grille.position.set(0, 0.7, 0.46);
  const notes = new THREE.Group();
  notes.name = 'notes';
  for (let i = 0; i < 5; i++) {
    const n = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      neonMat(i % 2 ? '#ffcf8a' : '#ff8fb0', 2.2),
    );
    head.scale.set(1.3, 1, 0.6);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), head.material);
    stem.position.set(0.13, 0.22, 0);
    n.add(head, stem);
    notes.add(n);
  }
  const songSign = placeSign('Chanson', 'SOUVENIR 07', '#ffcf8a', 3.2);
  songSign.position.set(0, 3.6, 0);
  chanson.add(jb, jbBody, arch, grille, notes, songSign);
  chanson.position.set(-LOT - LOT / 2, 0, -LOT / 2);
  chanson.rotation.y = Math.PI / 2;
  addPlace('chanson', chanson, V3(-LOT - LOT / 2 + 1.8, 0, -LOT / 2), () =>
    Phys.box(-LOT - LOT / 2 + 0.2, 1.18, -LOT / 2, 1.2, 2.36, 1.7),
  );

  const lantern = (c) => {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 1, 8).translate(0, 0.5, 0),
      stone,
    );
    const l = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glowMat(c, 2.2));
    l.position.y = 1.55;
    l.name = 'gem';
    g.add(ped, l);
    return g;
  };
  [
    ['p3', V3(LOT + 15, 0, LOT + 15), '#ffcf8a'],
    ['p4', V3(-LOT * 2 - 15, 0, -15), '#ff8fb0'],
    ['p5', V3(15, 0, -LOT * 2 - 15), '#b07cff'],
  ].forEach(([id, pos, c]) => {
    const g = lantern(c);
    g.position.copy(pos);
    addPlace(id, g, pos.clone(), () => Phys.box(pos.x, 0.5, pos.z, 1, 1, 1));
  });

  const TOWER = V3(2 * LOT, 48, -2 * LOT);
  const liftMat = Tex.mat('metal', {
    color: '#5a4a62',
    metal: 0.7,
    rough: 0.7,
    scale: 1.5,
    emissive: '#ff4f86',
    emissiveIntensity: 0.25,
  });
  const liftMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), liftMat);
  const LIFT = V3(TOWER.x, 0, TOWER.z + 8 + 2.2);
  const liftBox = Phys.add([0, 0, 0], [0, 0, 0], { dyn: true });
  R.scene.add(liftMesh);
  [-2.2, 2.2].forEach((dx) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 48, 0.12).translate(0, 24, 0),
      glowMat('#ff5f8a', 1.2),
    );
    rail.position.set(LIFT.x + dx, 0, LIFT.z - 1.9);
    R.scene.add(rail);
  });
  const setLift = (y) => {
    liftMesh.position.set(LIFT.x, y - 0.2, LIFT.z);
    liftBox.min = [LIFT.x - 2, y - 0.4, LIFT.z - 2];
    liftBox.max = [LIFT.x + 2, y, LIFT.z + 2];
  };
  setLift(0.05);
  const roofBench = addBench(TOWER.x, TOWER.y, TOWER.z - 4, Math.PI);
  {
    const railM = Tex.mat('metal', { color: '#3a3040', metal: 0.8, rough: 0.5, scale: 1 });
    const geos = [];
    const H8 = 8;
    const seg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const along = Math.abs(x1 - x0) > 0.01;
      geos.push(
        new THREE.BoxGeometry(along ? len : 0.08, 0.08, along ? 0.08 : len).translate(cx, TOWER.y + 1.05, cz),
        new THREE.BoxGeometry(along ? len : 0.05, 0.05, along ? 0.05 : len).translate(cx, TOWER.y + 0.55, cz),
      );
      for (let k = 0; k <= Math.round(len / 1.6); k++) {
        const f = k / Math.max(1, Math.round(len / 1.6));
        geos.push(cyl(0.035, 0.035, 1.1, 6).translate(x0 + (x1 - x0) * f, TOWER.y + 0.55, z0 + (z1 - z0) * f));
      }
      Phys.box(cx, TOWER.y + 0.6, cz, along ? len : 0.12, 1.2, along ? 0.12 : len);
    };
    const x0 = TOWER.x - H8 + 0.1;
    const x1 = TOWER.x + H8 - 0.1;
    const z0 = TOWER.z - H8 + 0.1;
    const z1 = TOWER.z + H8 - 0.1;
    seg(x0, z0, x1, z0);
    seg(x0, z0, x0, z1);
    seg(x1, z0, x1, z1);
    // lift side: leave a gap in front of the cabin
    seg(x0, z1, LIFT.x - 2.4, z1);
    seg(LIFT.x + 2.4, z1, x1, z1);
    R.scene.add(new THREE.Mesh(mergeGeos(geos), railM));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      glowMat(i % 2 ? '#ff8fb0' : '#ffcf8a', 2),
    );
    b.position.set(TOWER.x + Math.cos(a) * 7, TOWER.y + 0.3, TOWER.z + Math.sin(a) * 7);
    R.scene.add(b);
  }

  // ---- exploration: things to climb (and places where cards can hide) ----
  const concM = Tex.mat('concrete', { color: '#5a4a5e', scale: 2.5 });
  const steelM = Tex.mat('metal', { color: '#3a3444', metal: 0.7, rough: 0.55, scale: 1.2 });
  const solidBox = (x, y, z, sx, sy, sz, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    R.scene.add(m);
    Phys.box(x, y, z, sx, sy, sz);
    return m;
  };
  // concrete stairs running along a facade, from the street up to the roof
  const roofs = [];
  const stairUp = (b) => {
    const cx = Math.round(b.x / LOT) * LOT;
    const cz = Math.round(b.z / LOT) * LOT;
    const full = b.sx >= 21 && b.sz >= 21;
    // full lot: the side facing the city centre; half lot: its street side (not the alley)
    const face = full
      ? Math.abs(b.x) > Math.abs(b.z)
        ? b.x > 0
          ? 'x-'
          : 'x+'
        : b.z > 0
          ? 'z-'
          : 'z+'
      : b.sz >= 21
        ? b.x < cx
          ? 'x-'
          : 'x+'
        : b.z < cz
          ? 'z-'
          : 'z+';
    const n = Math.ceil(b.h / 0.4);
    const rise = b.h / n;
    const run = Math.min(0.55, 17 / n);
    // face: +x / -x / +z / -z side of the building; the stair hugs that facade
    const ax = face === 'x+' || face === 'x-';
    const sgn = face === 'x+' || face === 'z+' ? 1 : -1;
    const off = (ax ? b.sx : b.sz) / 2 + 0.7;
    const geos = [];
    const rails = [];
    for (let i = 0; i < n; i++) {
      const top = rise * (i + 1);
      const t = -8.5 + (i + 0.5) * run;
      const x = ax ? b.x + sgn * off : b.x + t;
      const z = ax ? b.z + t : b.z + sgn * off;
      const sx = ax ? 1.4 : run;
      const sz = ax ? run : 1.4;
      geos.push(new THREE.BoxGeometry(sx, top, sz).translate(x, top / 2, z));
      Phys.box(x, top / 2, z, sx, top, sz);
      // railing on the street side
      const rx = ax ? x + sgn * 0.68 : x;
      const rz = ax ? z : z + sgn * 0.68;
      Phys.box(rx, top + 0.5, rz, ax ? 0.08 : run, 1.0, ax ? run : 0.08);
      if (i % 3 === 0 || i === n - 1) rails.push([rx, top, rz]);
    }
    // top landing + rails on its far end: you step sideways onto the roof, never off the end
    const tE = -8.5 + n * run;
    const L = (t, o) => (ax ? [b.x + sgn * o, b.z + t] : [b.x + t, b.z + sgn * o]);
    const [gx, gz] = L(tE + 0.6, off);
    const lsx = ax ? 1.4 : 1.2;
    const lsz = ax ? 1.2 : 1.4;
    geos.push(new THREE.BoxGeometry(lsx, b.h, lsz).translate(gx, b.h / 2, gz));
    Phys.box(gx, b.h / 2, gz, lsx, b.h, lsz);
    const [ex, ez] = L(tE + 1.17, off);
    Phys.box(ex, b.h + 0.5, ez, ax ? 1.4 : 0.08, 1.0, ax ? 0.08 : 1.4);
    const [sx2, sz2] = L(tE + 0.6, off + 0.68);
    Phys.box(sx2, b.h + 0.5, sz2, ax ? 0.08 : 1.2, 1.0, ax ? 1.2 : 0.08);
    const [c1x, c1z] = L(tE + 1.17, off + 0.68);
    const [c2x, c2z] = L(tE + 1.17, off - 0.66);
    rails.push([c1x, b.h, c1z], [c2x, b.h, c2z]);
    const stairs = new THREE.Mesh(mergeGeos(geos), concM);
    R.scene.add(stairs);
    const rg = [];
    rails.forEach(([x, y, z]) => rg.push(cyl(0.03, 0.03, 1.0, 6).translate(x, y + 0.5, z)));
    for (let k = 1; k < rails.length; k++) {
      const a = V3(...rails[k - 1]).add(V3(0, 1, 0));
      const c = V3(...rails[k]).add(V3(0, 1, 0));
      const len = a.distanceTo(c);
      const g = cyl(0.035, 0.035, len, 6);
      const q = new THREE.Quaternion().setFromUnitVectors(lampY, c.clone().sub(a).normalize());
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      rg.push(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2));
    }
    R.scene.add(new THREE.Mesh(mergeGeos(rg), steelM));
    // roof furniture: AC units and a water tank (things to stand on)
    // along the long side of the roof, so narrow buildings get them too
    const lx = b.sx >= b.sz;
    const across = Math.max(0, Math.min(3, (lx ? b.sz : b.sx) / 2 - 1.3));
    const at = (l, a) => (lx ? [b.x + l, b.z + a] : [b.x + a, b.z + l]);
    const acs = [at(-4, across), at(1.5, -across)];
    acs.forEach(([x, z]) => solidBox(x, b.h + 0.55, z, 1.8, 1.1, 1.3, steelM));
    const [tx, tz] = at(6.5, 0);
    const tank = new THREE.Mesh(cyl(1.1, 1.1, 1.8, 18), Tex.mat('wood', { color: '#5a3a2a', scale: 1 }));
    tank.position.set(tx, b.h + 2.4, tz);
    R.scene.add(tank);
    [
      [-0.7, -0.7],
      [0.7, -0.7],
      [-0.7, 0.7],
      [0.7, 0.7],
    ].forEach(([dx, dz]) => solidBox(tx + dx, b.h + 0.75, tz + dz, 0.12, 1.5, 0.12, steelM));
    Phys.box(tx, b.h + 2.4, tz, 2.2, 1.8, 2.2);
    roofs.push({ b, face, ac: acs.map(([x, z]) => V3(x, b.h + 1.1, z)) });
  };
  {
    // six low buildings spread over the city (the layout is seeded, so these are stable)
    [
      [-120, 60],
      [-30, 90],
      [-60, -55.3],
      [124.8, 60],
      [150, -150],
      [-115.5, -150],
    ].forEach(([wx, wz]) => {
      const b = buildings.find((q) => Math.abs(q.x - wx) < 1 && Math.abs(q.z - wz) < 1 && q.h < 14);
      if (b) stairUp(b);
    });
  }
  // newspaper kiosks: roof at 2.45 m, a jump away
  const kiosks = [];
  const kioskTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#1e3a2a';
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 112);
    g.fillStyle = '#f4e2b8';
    g.font = 'bold 64px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('JOURNAUX', 256, 68);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  })();
  const kioskBody = Tex.mat('metal', { color: '#24503a', metal: 0.5, rough: 0.6, scale: 1.5 });
  const addKiosk = (x, z, yaw) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 1.6), kioskBody);
    body.position.y = 1.15;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.16, 2.1), steelM);
    roof.position.y = 2.38;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 8, 0, TAU, 0, Math.PI / 2),
      kioskBody,
    );
    dome.position.y = 2.46;
    dome.scale.set(1, 0.5, 1);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshBasicMaterial({ map: kioskTex, toneMapped: false }),
    );
    sign.position.set(0, 2.0, 0.81);
    // magazines on the front rack
    const mags = ['#ff5f8a', '#7ce0ff', '#ffcf8a', '#b07cff', '#f4ece0', '#ff9a3a'];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.4),
        glowMat(mags[i % mags.length], 0.55),
      );
      m.position.set(-0.85 + (i % 6) * 0.34, 0.75 + ((i / 6) | 0) * 0.5, 0.81);
      m.rotation.x = -0.12;
      g.add(m);
    }
    g.add(body, roof, dome, sign);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    R.scene.add(g);
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    Phys.box(x, 1.15, z, along ? 1.6 : 2.4, 2.3, along ? 2.4 : 1.6);
    Phys.box(x, 2.38, z, along ? 2.1 : 2.9, 0.16, along ? 2.9 : 2.1);
    Phys.box(x, 2.58, z, 0.7, 0.25, 0.7);
    // free spot on the roof, beside the little dome
    kiosks.push(along ? V3(x, 2.46, z + 0.95) : V3(x + 0.95, 2.46, z));
  };
  addKiosk(7.6, -7.6, 0);
  addKiosk(-36, 8.5, 0);
  addKiosk(-7.6, 7.6, Math.PI);
  // crate stacks: three steps up to 3.6 m
  const crateM = Tex.mat('wood', { color: '#7a5a3a', scale: 1.2, bump: 0.8 });
  const crates = [];
  const addCrates = (x, z, dx, dz) => {
    [
      [0, 0.6, 0, 1.2],
      [dx * 1.2, 0.6, dz * 1.2, 1.2],
      [dx * 1.2, 1.8, dz * 1.2, 1.2],
      [dx * 2.4, 0.6, dz * 2.4, 1.2],
      [dx * 2.4, 1.8, dz * 2.4, 1.2],
      [dx * 2.4, 3.0, dz * 2.4, 1.2],
    ].forEach(([ox, y, oz, sz]) => {
      const m = solidBox(x + ox, y, z + oz, sz, sz, sz, crateM);
      m.rotation.y = (r() - 0.5) * 0.1;
    });
    crates.push(V3(x + dx * 2.4, 3.6, z + dz * 2.4));
  };
  addCrates(-37.5, -8, 0, -1);
  addCrates(-21.5, 10, -1, 0);

  const rockets = [V3(-5, 0, 6), V3(5, 0, -6)].map((p) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8).translate(0, 0.45, 0),
      glowMat('#ff5f8a', 1.4),
    );
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 0.35, 8).translate(0, 1.07, 0),
      glowMat('#ffcf8a', 1.6),
    );
    g.add(body, tip);
    g.position.copy(p);
    g.visible = false;
    R.scene.add(g);
    return { g, pos: p };
  });

  const tmpM = new THREE.Matrix4();
  const mood = { gold: 0, gray: 0, red: 0, dark: 0 };
  const moodNow = { gold: 0, gray: 0, red: 0, dark: 0 };
  const FOGC = new THREE.Color(0.102, 0.043, 0.149);
  const FG = new THREE.Color(0.25, 0.12, 0.08);
  const FR = new THREE.Color(0.12, 0.02, 0.03);
  const FY = new THREE.Color(0.07, 0.07, 0.075);
  const FD = new THREE.Color(0.006, 0.003, 0.01);

  return {
    spawns: {
      dame: V3(-165, 0, 165),
      valet: V3(165, 0, -165),
    },
    plaza: V3(0, 0, 0),
    screenPos: V3(0, 22, -LOT + HALF + 0.15),
    hubSpawn: {
      dame: V3(-3, 0, 12),
      valet: V3(3, 0, 12),
    },
    doors,
    places,
    benches,
    roofBench,
    rockets,
    kiosks,
    crates,
    roofs,
    buildings,
    TOWER,
    LIFT,
    setLift,
    onLift: (p, y) =>
      Math.abs(p.x - LIFT.x) < 2.1 && Math.abs(p.z - LIFT.z) < 2.1 && Math.abs(p.y - y) < 0.8,
    door(id, on) {
      if (doors[id]) doors[id].target = on;
    },
    doorSlots,
    addDoor,
    showPlace(id, instant) {
      const pl = places[id];
      if (!pl || pl.shown) return;
      pl.shown = true;
      pl.group.visible = true;
      pl.t = instant ? 1 : 0;
      if (instant) pl.group.scale.setScalar(1);
      if (pl.onShow) pl.onShow();
    },
    pillar(id, on) {
      if (places[id]) places[id].pillar.userData.on = on;
    },
    rocketsOn(on) {
      rockets.forEach((r) => (r.g.visible = on));
    },
    mood(m) {
      Object.assign(mood, { gold: 0, gray: 0, red: 0, dark: 0 }, m);
    },
    update(t, dt) {
      ground.material.uniforms.uTime.value = t;
      bigCard.rotation.y = t * 0.6;
      bigCard.position.y = 5.5 + Math.sin(t * 0.9) * 0.3;
      Object.values(doors).forEach((d) => {
        d.on = damp(d.on, d.target, 3, dt);
        d.frame.color.copy(d.color).multiplyScalar(0.15 + d.on * (2 + Math.sin(t * 3) * 0.6));
        d.sign.material.opacity = d.on;
        d.fill.material.opacity = 0.9 - d.on * 0.3;
      });
      Object.values(places).forEach((pl) => {
        if (pl.t >= 0 && pl.t < 1) {
          pl.t = Math.min(1, pl.t + dt * 0.5);
          pl.group.scale.set(1, 1 - Math.pow(1 - pl.t, 3), 1);
        }
        if (!pl.shown) return;
        if (!pl.parts)
          pl.parts = ['gem', 'float', 'rain', 'notes'].map((n) => pl.group.getObjectByName(n));
        const [gem, fl, rain, notes] = pl.parts;
        if (gem) {
          if (gem.userData.y0 == null) gem.userData.y0 = gem.position.y;
          gem.rotation.y = t;
          gem.position.y = gem.userData.y0 + Math.sin(t * 2) * 0.1;
        }
        if (fl) fl.position.y = 3.7 + Math.sin(t * 1.6) * 0.15;
        if (rain) {
          const seeds = rain.userData.seeds;
          for (let i = 0; i < seeds.length; i++) {
            const [x, ph, z] = seeds[i];
            tmpM.makeTranslation(x, 5 - ((t * 1.4 + ph) % 1) * 5, z);
            rain.setMatrixAt(i, tmpM);
          }
          rain.instanceMatrix.needsUpdate = true;
        }
        if (notes)
          notes.children.forEach((n, i) => {
            const k = (t * 0.25 + i / 5) % 1;
            n.position.set(Math.sin(k * 6 + i) * 0.6, 2.3 + k * 2.6, 0.2);
            n.rotation.z = Math.sin(t * 2 + i) * 0.3;
            n.scale.setScalar(Math.sin(k * Math.PI));
          });
      });
      pillars.forEach((m) => {
        const near = clamp((R.camera.position.distanceTo(m.position) - 6) / 20, 0, 1);
        const po = m.userData.on ? (0.22 + Math.sin(t * 2) * 0.06) * near : 0;
        m.material.opacity = damp(m.material.opacity, po, 3, dt);
        m.visible = m.material.opacity > 0.01;
      });
      for (const k in mood) moodNow[k] = damp(moodNow[k], mood[k], 1.2, dt);
      MOOD.uGold.value = moodNow.gold;
      MOOD.uGray.value = moodNow.gray;
      MOOD.uRed.value = moodNow.red;
      Sky.U.uGold.value = moodNow.gold * 0.8;
      Sky.U.uRed.value = moodNow.red;
      Sky.U.uGray.value = moodNow.gray;
      const dim = 1 - moodNow.gray * 0.75;
      nMesh.material.color.setRGB(
        dim + moodNow.red * 0.5,
        dim * (1 - moodNow.red * 0.7),
        dim * (1 - moodNow.red * 0.6),
      );
      bulbM.material.color.setRGB(1, 0.69, 0.44).multiplyScalar(2.4 * dim);
      bMat.uniforms.uLight.value = 1 - moodNow.gray * 0.85;
      R.scene.fog.color
        .copy(FOGC)
        .lerp(FG, moodNow.gold * 0.6)
        .lerp(FR, moodNow.red * 0.7)
        .lerp(FY, moodNow.gray)
        .lerp(FD, moodNow.dark);
      R.scene.background.copy(R.scene.fog.color);
    },
  };
})();
