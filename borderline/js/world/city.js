const City = (() => {
  const LOT = 30;
  const HALF = 11;
  const N = 4;
  const r = rng(2026);
  const fogU = THREE.UniformsLib.fog;
  const MOOD = { uGold: { value: 0 }, uGray: { value: 0 }, uRed: { value: 0 } };

  const GL_TAIL = `
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  `;

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
      uniforms: { ...fogU, uTime: { value: 0 }, ...MOOD },
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
          vec3 asphalt = vec3(0.035, 0.028, 0.045) * (0.8 + n * 0.5);
          vec3 side = vec3(0.09, 0.07, 0.1) * (0.85 + n * 0.3);
          vec2 tile = abs(fract(vW.xz / 1.5) - 0.5);
          side *= 0.85 + 0.15 * step(0.46, max(tile.x, tile.y));
          vec3 col = mix(asphalt, side, walk + lot);
          vec2 pt = abs(fract(vW.xz / 3.0) - 0.5);
          vec3 plz = vec3(0.13, 0.08, 0.13) * (0.8 + 0.2 * step(0.47, max(pt.x, pt.y))) * (0.9 + n * 0.2);
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
    uniforms: { ...fogU, uLight: { value: 1 }, ...MOOD },
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
        vec2 g = f / vec2(2.8, 3.4);
        vec2 id = floor(g);
        vec2 fr = fract(g);
        float win = step(0.28, fr.x) * step(fr.x, 0.72) * step(0.3, fr.y) * step(fr.y, 0.72);
        vec3 rn = floor(vN + 0.5);
        float h = hash(id + floor(vSeed * 97.0) + rn.x * 7.0 + rn.z * 13.0);
        float lit = step(0.7, h) * uLight;
        vec3 wc = mix(vec3(1.0, 0.7, 0.42), vec3(0.62, 0.72, 1.0), step(0.86, h));
        wc = mix(wc, vec3(1.0, 0.38, 0.62), step(0.95, h));
        float band = step(2.0, vW.y) * step(vW.y, vTop - 1.4);
        float diff = max(dot(vN, normalize(vec3(-0.4, 0.8, -0.3))), 0.0);
        vec3 col = base * (0.35 + 0.5 * diff);
        col += win * side * band * (lit * wc * (0.55 + 0.35 * h) + (1.0 - lit) * vec3(0.02, 0.015, 0.03));
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
  const poleM = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.08, 0.12, 6, 6).translate(0, 3, 0),
    new THREE.MeshStandardMaterial({ color: '#1a1220', roughness: 0.6, metalness: 0.6 }),
    lamps.length,
  );
  const bulbM = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffb070').multiplyScalar(2.4),
      toneMapped: false,
    }),
    lamps.length,
  );
  lamps.forEach(([x, z], i) => {
    m4.makeTranslation(x, 0, z);
    poleM.setMatrixAt(i, m4);
    m4.makeTranslation(x, 6.1, z);
    bulbM.setMatrixAt(i, m4);
  });
  poleM.frustumCulled = bulbM.frustumCulled = false;
  R.scene.add(poleM, bulbM);

  const stone = new THREE.MeshStandardMaterial({ color: '#2a1a2e', roughness: 0.8 });
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.6, 32), stone);
  fountain.position.y = 0.3;
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
  Phys.box(0, 0.3, 0, 7.4, 0.6, 7.4);

  const benchGeo = new THREE.BoxGeometry(3, 0.5, 0.8);
  const backGeo = new THREE.BoxGeometry(3, 0.7, 0.12);
  const benches = [];
  const addBench = (x, y, z, yaw, group = R.scene) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(benchGeo, stone);
    seat.position.y = 0.25;
    const back = new THREE.Mesh(backGeo, stone);
    back.position.set(0, 0.75, -0.36);
    g.add(seat, back);
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    group.add(g);
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    Phys.box(x, y + 0.25, z, along ? 0.8 : 3, 0.5, along ? 3 : 0.8, { tag: 'bench' });
    const b = { pos: V3(x, y, z), yaw, g };
    benches.push(b);
    return b;
  };
  addBench(0, 0, 9.6, Math.PI);
  addBench(0, 0, -9.6, 0);
  addBench(9.6, 0, 0, -Math.PI / 2);
  addBench(-9.6, 0, 0, Math.PI / 2);

  const cardTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 360;
    const g = c.getContext('2d');
    g.fillStyle = '#1b0716';
    g.fillRect(0, 0, 256, 360);
    g.strokeStyle = '#e8bd84';
    g.lineWidth = 6;
    g.strokeRect(14, 14, 228, 332);
    g.lineWidth = 2;
    g.strokeRect(26, 26, 204, 308);
    g.fillStyle = '#d8324f';
    g.font = '150px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', 128, 185);
    const t = new THREE.CanvasTexture(c);
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
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, 512, 256);
    g.shadowColor = col;
    g.shadowBlur = 24;
    g.fillStyle = col;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'italic 110px Georgia';
    g.fillText(txt, 256, 110);
    if (sub) {
      g.font = '28px monospace';
      g.fillText(sub, 256, 205);
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
    return { frame, fill, sign, color: new THREE.Color(color), on: 0, target: 0, entry };
  };

  const doors = {
    h10: makeDoor(
      V3(LOT - HALF - 0.1, 0, 0),
      0,
      '♥ 10',
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
    new THREE.MeshStandardMaterial({ color: '#3a1f2c', roughness: 0.7, emissive: '#1a0810' }),
  );
  cafeBody.position.y = 3.5;
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.25, 10),
    new THREE.MeshStandardMaterial({ color: '#d8324f', emissive: '#5a0a1e' }),
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
  cafe.position.set(-LOT + 3, 0, 0);
  addPlace('cafe', cafe, V3(-LOT + 11, 0, 0), () => Phys.box(-LOT + 3, 3.5, 0, 14, 7, 12));

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
    new THREE.ConeGeometry(1.1, 3.4, 8).translate(0, 2.6, 0),
    new THREE.MeshStandardMaterial({ color: '#2b1340', emissive: '#1a0a2a' }),
  );
  tree.position.set(3.4, 0, -1.2);
  banc.add(tree);
  banc.position.set(-LOT / 2, 0, LOT / 2);
  banc.rotation.y = Math.PI;
  addPlace('banc', banc, V3(-LOT / 2, 0, LOT / 2 - 1.6), () => {
    addBench(-LOT / 2, 0, LOT / 2, Math.PI);
    Phys.box(-LOT / 2 - 3.4, 1.7, LOT / 2 + 1.2, 1.6, 3.4, 1.6);
  });

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
    addPlace(id, g, pos.clone());
  });

  const TOWER = V3(2 * LOT, 48, -2 * LOT);
  const liftMat = new THREE.MeshStandardMaterial({
    color: '#2a1a2e',
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
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      glowMat(i % 2 ? '#ff8fb0' : '#ffcf8a', 2),
    );
    b.position.set(TOWER.x + Math.cos(a) * 7, TOWER.y + 0.3, TOWER.z + Math.sin(a) * 7);
    R.scene.add(b);
  }

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

  const mood = { gold: 0, gray: 0, red: 0, dark: 0 };
  const moodNow = { gold: 0, gray: 0, red: 0, dark: 0 };
  const FOGC = new THREE.Color(0.102, 0.043, 0.149);
  const FG = new THREE.Color(0.25, 0.12, 0.08);
  const FR = new THREE.Color(0.12, 0.02, 0.03);
  const FY = new THREE.Color(0.07, 0.07, 0.075);
  const FD = new THREE.Color(0.006, 0.003, 0.01);

  return {
    spawns: {
      dame: V3(-75, 0, 75),
      valet: V3(75, 0, -75),
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
    TOWER,
    LIFT,
    setLift,
    onLift: (p, y) =>
      Math.abs(p.x - LIFT.x) < 2.1 && Math.abs(p.z - LIFT.z) < 2.1 && Math.abs(p.y - y) < 0.8,
    door(id, on) {
      doors[id].target = on;
    },
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
        const gem = pl.group.getObjectByName('gem');
        if (gem) {
          gem.rotation.y = t;
          gem.position.y = 1.55 + Math.sin(t * 2) * 0.1;
        }
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
