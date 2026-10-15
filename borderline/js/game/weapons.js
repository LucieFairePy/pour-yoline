// Held weapons. Whoever carries the Dame kit in a chapter gets the rifle, the Valet kit
// gets the sword, so both players use both weapons over the game.
const Weapons = (() => {
  const metal = new THREE.MeshStandardMaterial({
    color: '#3a3942',
    roughness: 0.4,
    metalness: 0.45,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: '#7a3f1d',
    roughness: 0.6,
    metalness: 0.05,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: '#e9eef8',
    roughness: 0.22,
    metalness: 0.35,
    emissive: '#5a7a9a',
    emissiveIntensity: 0.35,
  });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: '#2a1a1e', roughness: 0.8 });
  const neon = (c) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(c).multiplyScalar(2.2),
      toneMapped: false,
    });

  // ---------------------------------------------------------------------------------------------
  // Assets (borderline/assets/weapons, see assets/CREDITS.md): the AK-47 model with its PBR atlas,
  // sprite atlases for the flash, smoke, sparks and bullet holes, recorded sounds.
  // Everything is optional: until (or unless) it loads, the procedural rifle and synth sounds stay.
  const ASSET = 'assets/weapons/';
  const texLoader = new THREE.TextureLoader();
  const maxAniso = () =>
    R && R.renderer ? Math.min(8, R.renderer.capabilities.getMaxAnisotropy()) : 1;
  const atlas = (f) => {
    const t = texLoader.load(ASSET + 'vfx/' + f);
    t.generateMipmaps = true;
    return t;
  };
  const ATLAS = {
    front: atlas('vfx_muzzle_front.png'),
    side: atlas('vfx_muzzle_side.png'),
    smoke: atlas('vfx_smoke.png'),
    parts: atlas('vfx_particles.png'),
    decals: atlas('vfx_decals.png'),
  };
  const A = 'audio/';
  Sound.load(
    {
      shot: [1, 2, 3, 4, 5].map((i) => A + 'shot_' + i + '.mp3'),
      shotFar: A + 'shot_far.mp3',
      tail: A + 'tail.mp3',
      magOut: A + 'mag_out.mp3',
      magIn: A + 'mag_in.mp3',
      boltBack: A + 'bolt_back.mp3',
      boltFwd: A + 'bolt_fwd.mp3',
      handling: A + 'handling.mp3',
      casing: [1, 2, 3, 4].map((i) => A + 'casing_' + i + '.mp3'),
      magDrop: A + 'impact_wood.mp3',
      impact_concrete: [A + 'impact_concrete_1.mp3', A + 'impact_concrete_2.mp3'],
      impact_metal: [A + 'impact_metal_1.mp3', A + 'impact_metal_2.mp3'],
      impact_wood: A + 'impact_wood.mp3',
      impact_glass: A + 'impact_glass.mp3',
      impact_dirt: A + 'impact_dirt.mp3',
    },
    ASSET,
  );

  // a small studio for the metal to reflect: the world's violet sky, a dark floor, two soft boxes
  let envMap = null;
  const makeEnv = () => {
    if (envMap || !R || !R.renderer) return envMap;
    const sc = new THREE.Scene();
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#d9c6ff');
    gr.addColorStop(0.45, '#6a4a9a');
    gr.addColorStop(0.55, '#2a1830');
    gr.addColorStop(1, '#0c0710');
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 128);
    sc.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 12),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide }),
      ),
    );
    [
      [4, 6, 3, '#ffffff', 3],
      [-6, 3, -4, '#ffd2e4', 1.6],
    ].forEach(([x, y, z, col, k]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 3),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(col).multiplyScalar(k),
          side: THREE.DoubleSide,
        }),
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      sc.add(m);
    });
    const pm = new THREE.PMREMGenerator(R.renderer);
    envMap = pm.fromScene(sc, 0.03).texture;
    pm.dispose();
    return envMap;
  };

  // the model keeps its own PBR atlas (base colour, metal/roughness, normal); it only gets the
  // studio reflections, and its colour map is read as-is like every texture of this game
  // (the renderer outputs linear). Brass for the spent cases.
  let MATS = null;
  const makeMats = () => {
    if (MATS) return MATS;
    MATS = {
      brass: new THREE.MeshStandardMaterial({
        color: '#d4a24a',
        roughness: 0.3,
        metalness: 1,
        envMap: makeEnv(),
        envMapIntensity: 1.2,
      }),
    };
    return MATS;
  };
  const prepModel = (m) => {
    const env = makeEnv();
    if (m.map) m.map.encoding = THREE.LinearEncoding;
    [m.map, m.normalMap, m.roughnessMap].forEach((t) => t && (t.anisotropy = maxAniso()));
    m.envMap = env;
    m.envMapIntensity = 1;
    m.needsUpdate = true;
  };

  // rifle-space points of the model (metres x 1/0.8, origin on top of the pistol grip, barrel +z,
  // the rifle's right side -x), measured on the mesh: where the hands go, the muzzle, the
  // ejection port, how far the bolt travels. js/world/avatar.js reads GRIP..BOLTBACK and ads.
  const AK_PTS = {
    GRIP: V3(0, -0.045, -0.015),
    FORE: V3(0, -0.014, 0.37),
    MAG: V3(0, -0.1, 0.205),
    MAGOUT: V3(0.035, -0.29, 0.26),
    BOLT: V3(-0.05, 0.065, 0.24),
    BOLTBACK: V3(-0.055, 0.065, 0.14),
    MUZZLE: V3(0, 0.041, 0.76),
    EJECT: V3(-0.028, 0.055, 0.21),
    // the butt sits 8 cm closer to the grip than the procedural rifle's
    ads: 0.064,
  };
  // the same for the procedural rifle (fallback)
  const PROC_PTS = {
    MAG: V3(0, -0.13, 0.1),
    MUZZLE: V3(0, 0.012, 0.672),
    EJECT: V3(-0.02, 0.03, 0.12),
    BOLT: V3(-0.035, 0.025, 0.13),
    BOLTBACK: V3(-0.04, 0.025, 0.04),
  };

  const loadScript = (urls) =>
    new Promise((res, rej) => {
      let i = 0;
      const next = () => {
        if (i >= urls.length) return rej(new Error('script'));
        const s = document.createElement('script');
        s.src = urls[i++];
        s.onload = res;
        s.onerror = () => {
          s.remove();
          next();
        };
        document.head.appendChild(s);
      };
      next();
    });
  let akPromise = null;
  const loadAK = () =>
    akPromise ||
    (akPromise = (async () => {
      if (!THREE.GLTFLoader)
        await loadScript([
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
          'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js',
        ]);
      const gltf = await new Promise((res, rej) =>
        new THREE.GLTFLoader().load(ASSET + 'ak47.glb', res, undefined, rej),
      );
      makeMats();
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        prepModel(o.material);
        o.frustumCulled = false;
      });
      return gltf.scene;
    })().catch(() => null));

  // ---------------------------------------------------------------------------------------------
  // GPU particles: one draw call per system, a 4-cell sprite atlas, per particle size, alpha, cell,
  // spin, tint, gravity and drag; preallocated, recycled oldest first
  const PVERT = `
    attribute float size; attribute float alpha; attribute float cell; attribute float rot;
    attribute vec3 tint;
    uniform float uScale;
    varying float vAlpha; varying float vCell; varying float vRot; varying vec3 vTint;
    #include <fog_pars_vertex>
    void main() {
      vAlpha = alpha; vCell = cell; vRot = rot; vTint = tint;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * uScale / max(0.05, -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const PFRAG = `
    uniform sampler2D map;
    varying float vAlpha; varying float vCell; varying float vRot; varying vec3 vTint;
    #include <fog_pars_fragment>
    void main() {
      if (vAlpha <= 0.0) discard;
      vec2 c = gl_PointCoord - 0.5;
      float s = sin(vRot), k = cos(vRot);
      c = vec2(k * c.x - s * c.y, s * c.x + k * c.y) + 0.5;
      vec4 t = texture2D(map, vec2((vCell + clamp(c.x, 0.0, 1.0)) / 4.0, 1.0 - clamp(c.y, 0.0, 1.0)));
      gl_FragColor = vec4(t.rgb * vTint, t.a * vAlpha);
      #include <fog_fragment>
    }`;
  const systems = [];
  const sizeV = new THREE.Vector2();
  const Particles = (map, n, additive) => {
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const tint = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const alpha = new Float32Array(n);
    const cell = new Float32Array(n);
    const rot = new Float32Array(n);
    const P = {
      s0: new Float32Array(n),
      s1: new Float32Array(n),
      a0: new Float32Array(n),
      life: new Float32Array(n),
      max: new Float32Array(n),
      spin: new Float32Array(n),
      grav: new Float32Array(n),
      drag: new Float32Array(n),
      floor: new Float32Array(n),
    };
    const geo = new THREE.BufferGeometry();
    const attr = (k, a, s) => {
      const b = new THREE.BufferAttribute(a, s);
      b.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(k, b);
      return b;
    };
    const aPos = attr('position', pos, 3);
    const aSize = attr('size', size, 1);
    const aAlpha = attr('alpha', alpha, 1);
    const aCell = attr('cell', cell, 1);
    const aRot = attr('rot', rot, 1);
    const aTint = attr('tint', tint, 3);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { map: { value: null }, uScale: { value: 400 } },
      ]),
      vertexShader: PVERT,
      fragmentShader: PFRAG,
      transparent: true,
      depthWrite: false,
      fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mat.uniforms.map.value = map;
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = additive ? 3 : 2;
    R.scene.add(pts);
    let head = 0;
    let live = 0;
    const sys = {
      // p, v: vectors (copied); s0 -> s1 metres over life seconds; c = atlas cell
      spawn(p, vx, vy, vz, c, s0, s1, life, a0, r, g, b, grav = 0, drag = 0, floor = -1e9) {
        const i = head;
        head = (head + 1) % n;
        const j = i * 3;
        pos[j] = p.x;
        pos[j + 1] = p.y;
        pos[j + 2] = p.z;
        vel[j] = vx;
        vel[j + 1] = vy;
        vel[j + 2] = vz;
        tint[j] = r;
        tint[j + 1] = g;
        tint[j + 2] = b;
        cell[i] = c;
        rot[i] = Math.random() * TAU;
        P.spin[i] = (Math.random() - 0.5) * 2;
        P.s0[i] = s0;
        P.s1[i] = s1;
        P.a0[i] = a0;
        P.life[i] = P.max[i] = life;
        P.grav[i] = grav;
        P.drag[i] = drag;
        P.floor[i] = floor;
        size[i] = s0;
        alpha[i] = a0;
        live = Math.max(live, life + 0.1);
        aTint.needsUpdate = aCell.needsUpdate = true;
      },
      tick(dt) {
        if (live <= 0) return;
        live -= dt;
        for (let i = 0; i < n; i++) {
          if (P.life[i] <= 0) continue;
          P.life[i] -= dt;
          const j = i * 3;
          if (P.life[i] <= 0) {
            alpha[i] = 0;
            size[i] = 0;
            continue;
          }
          const k = 1 - P.life[i] / P.max[i];
          const dr = Math.max(0, 1 - P.drag[i] * dt);
          vel[j] *= dr;
          vel[j + 1] = vel[j + 1] * dr - P.grav[i] * dt;
          vel[j + 2] *= dr;
          pos[j] += vel[j] * dt;
          pos[j + 1] += vel[j + 1] * dt;
          pos[j + 2] += vel[j + 2] * dt;
          if (pos[j + 1] < P.floor[i]) {
            pos[j + 1] = P.floor[i];
            vel[j + 1] *= -0.3;
            vel[j] *= 0.5;
            vel[j + 2] *= 0.5;
          }
          rot[i] += P.spin[i] * dt;
          size[i] = P.s0[i] + (P.s1[i] - P.s0[i]) * Math.sqrt(k);
          // fade in fast, out slow
          alpha[i] = P.a0[i] * Math.min(1, k * 12) * (1 - k * k);
        }
        aPos.needsUpdate = aSize.needsUpdate = aAlpha.needsUpdate = aRot.needsUpdate = true;
      },
      mat,
      get live() {
        return live > 0;
      },
    };
    systems.push(sys);
    return sys;
  };
  let SMOKE = null;
  let SPARK = null;
  let DEBRIS = null;
  const fxInit = () => {
    if (SMOKE) return;
    SMOKE = Particles(ATLAS.smoke, 160, false);
    SPARK = Particles(ATLAS.parts, 192, true);
    DEBRIS = Particles(ATLAS.parts, 192, false);
  };

  // ---------------------------------------------------------------------------------------------
  // Bullet holes: oriented quads in one ring-buffered mesh (one draw call), atlas cells per
  // material, lit, a 30 s life with a 2 s fade, the oldest replaced first
  const DECALS = 120;
  const DECAL_LIFE = 30;
  const CELLS = { concrete: [0, 5], metal: [1, 6], wood: [2], glass: [3], dirt: [4] };
  const SIZE = { concrete: 0.13, metal: 0.07, wood: 0.12, glass: 0.22, dirt: 0.16 };
  let decal = null;
  const decalInit = () => {
    if (decal) return;
    const pos = new Float32Array(DECALS * 12);
    const nor = new Float32Array(DECALS * 12);
    const uv = new Float32Array(DECALS * 8);
    const fade = new Float32Array(DECALS * 4);
    const idx = [];
    for (let i = 0; i < DECALS; i++) {
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('fade', new THREE.BufferAttribute(fade, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    const mat = new THREE.MeshLambertMaterial({
      map: ATLAS.decals,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace(
          'void main() {',
          'attribute float fade;\nvarying float vFade;\nvoid main() {\n vFade = fade;',
        )
        .replace('#include <common>', '#include <common>');
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'varying float vFade;\nvoid main() {')
        .replace(
          '#include <alphamap_fragment>',
          '#include <alphamap_fragment>\n diffuseColor.a *= vFade;',
        );
    };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    R.scene.add(mesh);
    decal = { geo, pos, nor, uv, fade, t: new Float32Array(DECALS), head: 0, live: 0 };
  };
  const dU = V3();
  const dV = V3();
  const dC = V3();
  const addDecal = (p, n, surf) => {
    decalInit();
    const D = decal;
    const i = D.head;
    D.head = (D.head + 1) % DECALS;
    const cells = CELLS[surf] || CELLS.concrete;
    const c = cells[(Math.random() * cells.length) | 0];
    const s = (SIZE[surf] || 0.12) * (0.75 + Math.random() * 0.5) * 0.5;
    // a tangent frame on the face, turned at random
    dU.set(Math.abs(n.y) > 0.9 ? 1 : 0, Math.abs(n.y) > 0.9 ? 0 : 1, 0)
      .cross(n)
      .normalize();
    dV.crossVectors(n, dU);
    const a = Math.random() * TAU;
    const ca = Math.cos(a) * s;
    const sa = Math.sin(a) * s;
    dC.copy(p).addScaledVector(n, 0.004);
    const corner = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const u0 = (c % 4) / 4;
    const v0 = 1 - (Math.floor(c / 4) + 1) / 2;
    for (let k = 0; k < 4; k++) {
      const [x, y] = corner[k];
      const ux = x * ca - y * sa;
      const vy = x * sa + y * ca;
      const j = (i * 4 + k) * 3;
      D.pos[j] = dC.x + dU.x * ux + dV.x * vy;
      D.pos[j + 1] = dC.y + dU.y * ux + dV.y * vy;
      D.pos[j + 2] = dC.z + dU.z * ux + dV.z * vy;
      D.nor[j] = n.x;
      D.nor[j + 1] = n.y;
      D.nor[j + 2] = n.z;
      const q = (i * 4 + k) * 2;
      D.uv[q] = u0 + ((x + 1) / 2) * 0.25;
      D.uv[q + 1] = v0 + ((y + 1) / 2) * 0.5;
      D.fade[i * 4 + k] = 1;
    }
    D.t[i] = DECAL_LIFE;
    D.live = Math.max(D.live, DECAL_LIFE);
    const at = D.geo.attributes;
    at.position.needsUpdate =
      at.normal.needsUpdate =
      at.uv.needsUpdate =
      at.fade.needsUpdate =
        true;
  };
  const tickDecals = (dt) => {
    const D = decal;
    if (!D || D.live <= 0) return;
    D.live -= dt;
    let dirty = false;
    for (let i = 0; i < DECALS; i++) {
      if (D.t[i] <= 0) continue;
      D.t[i] -= dt;
      if (D.t[i] < 2) {
        const f = Math.max(0, D.t[i] / 2);
        for (let k = 0; k < 4; k++) D.fade[i * 4 + k] = f;
        dirty = true;
      }
    }
    if (dirty) D.geo.attributes.fade.needsUpdate = true;
  };

  // ---------------------------------------------------------------------------------------------
  // Spent cases: one instanced mesh for both rifles, thrown out to the right with spin, bounce
  // once or twice on the floor (with a tinkle), then go
  const SHELLS = 64;
  let shells = null;
  const shellObj = new THREE.Object3D();
  const shellInit = () => {
    if (shells) return;
    const geo = new THREE.CylinderGeometry(0.0057, 0.0062, 0.039, 8).rotateZ(Math.PI / 2);
    const mat = MATS
      ? MATS.brass
      : new THREE.MeshStandardMaterial({ color: '#d4a24a', metalness: 0.9, roughness: 0.35 });
    const m = new THREE.InstancedMesh(geo, mat, SHELLS);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    shellObj.scale.setScalar(0);
    shellObj.updateMatrix();
    for (let i = 0; i < SHELLS; i++) m.setMatrixAt(i, shellObj.matrix);
    R.scene.add(m);
    shells = {
      m,
      p: new Float32Array(SHELLS * 3),
      v: new Float32Array(SHELLS * 3),
      r: new Float32Array(SHELLS * 3),
      w: new Float32Array(SHELLS * 3),
      t: new Float32Array(SHELLS),
      floor: new Float32Array(SHELLS),
      hits: new Uint8Array(SHELLS),
      head: 0,
      live: 0,
    };
  };
  const ejectShell = (p, right, up, fwd) => {
    shellInit();
    const S = shells;
    if (MATS && S.m.material !== MATS.brass) S.m.material = MATS.brass;
    const i = S.head;
    S.head = (S.head + 1) % SHELLS;
    const j = i * 3;
    S.p[j] = p.x;
    S.p[j + 1] = p.y;
    S.p[j + 2] = p.z;
    const sr = 2.2 + Math.random() * 1;
    const su = 1.3 + Math.random() * 0.8;
    const sb = -0.4 + Math.random() * 0.5;
    S.v[j] = right.x * sr + up.x * su + fwd.x * sb;
    S.v[j + 1] = right.y * sr + up.y * su + fwd.y * sb;
    S.v[j + 2] = right.z * sr + up.z * su + fwd.z * sb;
    S.r[j] = Math.random() * TAU;
    S.r[j + 1] = Math.atan2(fwd.x, fwd.z);
    S.r[j + 2] = 0;
    S.w[j] = (Math.random() - 0.5) * 30;
    S.w[j + 1] = (Math.random() - 0.5) * 20;
    S.w[j + 2] = 18 + Math.random() * 14;
    S.t[i] = 2.2;
    S.hits[i] = 0;
    const gy = Phys.groundAt(p.x, p.y, p.z);
    S.floor[i] = gy > -1e8 ? gy + 0.006 : p.y - 40;
    S.live = 2.3;
  };
  const tickShells = (dt) => {
    const S = shells;
    if (!S || S.live <= 0) return;
    S.live -= dt;
    for (let i = 0; i < SHELLS; i++) {
      if (S.t[i] <= 0) continue;
      S.t[i] -= dt;
      const j = i * 3;
      if (S.t[i] > 0) {
        S.v[j + 1] -= 9.8 * dt;
        S.p[j] += S.v[j] * dt;
        S.p[j + 1] += S.v[j + 1] * dt;
        S.p[j + 2] += S.v[j + 2] * dt;
        S.r[j] += S.w[j] * dt;
        S.r[j + 1] += S.w[j + 1] * dt;
        S.r[j + 2] += S.w[j + 2] * dt;
        if (S.p[j + 1] < S.floor[i] && S.v[j + 1] < 0) {
          S.p[j + 1] = S.floor[i];
          S.v[j + 1] *= -0.32;
          S.v[j] *= 0.5;
          S.v[j + 2] *= 0.5;
          S.w[j] *= 0.5;
          S.w[j + 1] *= 0.5;
          S.w[j + 2] *= 0.3;
          if (!S.hits[i]++) {
            shellObj.position.set(S.p[j], S.p[j + 1], S.p[j + 2]);
            if (Sound.dist(shellObj.position) < 14) Sound.play('casing', shellObj.position);
          }
          // at rest: lying on its side
          if (S.hits[i] > 2) {
            S.r[j] = 0;
            S.r[j + 2] = 0;
            S.w[j] = S.w[j + 1] = S.w[j + 2] = 0;
          }
        }
      }
      shellObj.position.set(S.p[j], S.p[j + 1], S.p[j + 2]);
      shellObj.rotation.set(S.r[j], S.r[j + 1], S.r[j + 2]);
      shellObj.scale.setScalar(S.t[i] > 0 ? Math.min(1, S.t[i] / 0.25) : 0);
      shellObj.updateMatrix();
      S.m.setMatrixAt(i, shellObj.matrix);
    }
    S.m.instanceMatrix.needsUpdate = true;
  };

  // ---------------------------------------------------------------------------------------------
  // A bullet hitting the world: a hole, what flies off it, its sound
  const SURFS = ['concrete', 'metal', 'wood', 'glass', 'dirt'];
  const iv = V3();
  const rnd = (k) => (Math.random() - 0.5) * 2 * k;
  // dust and chip colours per surface
  const DUST = { concrete: [0.66, 0.63, 0.62], wood: [0.55, 0.38, 0.24], dirt: [0.45, 0.36, 0.26] };
  const CHIP = { concrete: [0.5, 0.49, 0.5], wood: [0.62, 0.42, 0.24], dirt: [0.3, 0.22, 0.15] };
  const impact = (p, n, surf = 'concrete') => {
    fxInit();
    addDecal(p, n, surf);
    const gy = Phys.groundAt(p.x, p.y + 0.05, p.z);
    const fl = gy > -1e8 ? gy + 0.01 : -1e9;
    iv.copy(p).addScaledVector(n, 0.02);
    const nx = n.x;
    const ny = n.y;
    const nz = n.z;
    if (surf === 'metal') {
      for (let i = 0; i < 12; i++)
        SPARK.spawn(
          iv,
          nx * 3 + rnd(2.5),
          ny * 3 + rnd(2) + 1,
          nz * 3 + rnd(2.5),
          Math.random() < 0.5 ? 1 : 0,
          0.05,
          0.02,
          0.18 + Math.random() * 0.25,
          1,
          2,
          0.85,
          0.3,
          9,
          1.5,
          fl,
        );
      SMOKE.spawn(
        iv,
        nx * 0.3,
        0.25,
        nz * 0.3,
        (Math.random() * 4) | 0,
        0.05,
        0.3,
        0.7,
        0.25,
        0.55,
        0.55,
        0.58,
        -0.1,
        1.5,
      );
    } else if (surf === 'glass') {
      for (let i = 0; i < 9; i++)
        SPARK.spawn(
          iv,
          nx * 2 + rnd(1.5),
          ny * 2 + rnd(1.5) + 0.5,
          nz * 2 + rnd(1.5),
          1,
          0.035,
          0.01,
          0.25 + Math.random() * 0.3,
          0.9,
          0.75,
          0.9,
          1.1,
          8,
          1,
          fl,
        );
      for (let i = 0; i < 6; i++)
        DEBRIS.spawn(
          iv,
          nx * 1.5 + rnd(1),
          ny * 1.5 + rnd(1) + 0.8,
          nz * 1.5 + rnd(1),
          3,
          0.03,
          0.03,
          0.6 + Math.random() * 0.4,
          0.8,
          0.8,
          0.9,
          1,
          9.8,
          0.5,
          fl,
        );
    } else {
      const wood = surf === 'wood';
      const dirt = surf === 'dirt';
      const dc = DUST[surf] || DUST.concrete;
      const cc = CHIP[surf] || CHIP.concrete;
      const puffs = dirt ? 3 : wood ? 1 : 2;
      for (let i = 0; i < puffs; i++)
        SMOKE.spawn(
          iv,
          nx * 0.7 + rnd(0.25),
          ny * 0.7 + 0.25 + rnd(0.15),
          nz * 0.7 + rnd(0.25),
          (Math.random() * 4) | 0,
          0.06,
          dirt ? 0.6 : 0.42,
          0.8 + Math.random() * 0.6,
          dirt ? 0.55 : 0.45,
          dc[0],
          dc[1],
          dc[2],
          -0.15,
          2.2,
        );
      const chips = dirt ? 10 : wood ? 9 : 7;
      for (let i = 0; i < chips; i++)
        DEBRIS.spawn(
          iv,
          nx * 2.4 + rnd(1.6),
          ny * 2.4 + rnd(1.4) + (dirt ? 2 : 1),
          nz * 2.4 + rnd(1.6),
          wood ? 0 : 3,
          wood ? 0.05 : 0.03,
          wood ? 0.04 : 0.025,
          0.5 + Math.random() * 0.5,
          1,
          cc[0],
          cc[1],
          cc[2],
          9.8,
          0.6,
          fl,
        );
      if (surf === 'concrete')
        SPARK.spawn(iv, nx * 1, ny * 1, nz * 1, 1, 0.06, 0.02, 0.06, 0.8, 1.4, 1.1, 0.8, 0, 0);
    }
    Sound.play('impact', p, surf);
  };

  const box = (g, mat, sx, sy, sz, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  const cyl = (g, mat, r0, r1, len, x, y, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 12).rotateX(Math.PI / 2), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // The procedural AKM, shown until the model is loaded (or if it cannot be): to scale (metres),
  // the top of the pistol grip at the origin, barrel along +z, up +y. Laminated reddish wood and
  // blued steel, painted on 2048 px canvases; the magazine is its own group for the reload.
  const akTex = (() => {
    const W = 2048;
    const wood = document.createElement('canvas');
    wood.width = W;
    wood.height = 512;
    const g = wood.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7a2f16');
    grad.addColorStop(0.5, '#93401f');
    grad.addColorStop(1, '#6d2a14');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, 512);
    // grain: long wavy lines, darker and lighter, plus a few knots
    for (let i = 0; i < 260; i++) {
      const y0 = Math.random() * 512;
      const amp = 2 + Math.random() * 7;
      const f = 0.002 + Math.random() * 0.006;
      const ph = Math.random() * 6.3;
      g.strokeStyle =
        Math.random() < 0.6
          ? 'rgba(45,14,6,' + (0.08 + Math.random() * 0.2) + ')'
          : 'rgba(190,110,60,' + (0.05 + Math.random() * 0.12) + ')';
      g.lineWidth = 0.6 + Math.random() * 2.2;
      g.beginPath();
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * W;
      const y = Math.random() * 512;
      const r = 6 + Math.random() * 12;
      const kg = g.createRadialGradient(x, y, 0, x, y, r * 2);
      kg.addColorStop(0, 'rgba(40,12,4,0.55)');
      kg.addColorStop(1, 'rgba(40,12,4,0)');
      g.fillStyle = kg;
      g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    }
    const steel = document.createElement('canvas');
    steel.width = steel.height = 1024;
    const h = steel.getContext('2d');
    const img = h.createImageData(1024, 1024);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 138 + (Math.random() - 0.5) * 40;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    h.putImageData(img, 0, 0);
    // wear: lighter scuffs where hands go
    for (let i = 0; i < 90; i++) {
      h.strokeStyle = 'rgba(230,230,230,' + (0.05 + Math.random() * 0.1) + ')';
      h.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      h.beginPath();
      h.moveTo(x, y);
      h.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 12);
      h.stroke();
    }
    const tw = new THREE.CanvasTexture(wood);
    tw.wrapS = tw.wrapT = THREE.RepeatWrapping;
    tw.repeat.set(4, 4);
    tw.anisotropy = 8;
    const ts = new THREE.CanvasTexture(steel);
    ts.wrapS = ts.wrapT = THREE.RepeatWrapping;
    ts.repeat.set(6, 6);
    return { wood: tw, steel: ts };
  })();
  const akWood = new THREE.MeshStandardMaterial({
    map: akTex.wood,
    bumpMap: akTex.wood,
    bumpScale: 0.0015,
    roughness: 0.5,
    metalness: 0.02,
  });
  const akSteel = new THREE.MeshStandardMaterial({
    color: '#2a2c33',
    metalness: 0.85,
    roughness: 0.42,
    roughnessMap: akTex.steel,
    bumpMap: akTex.steel,
    bumpScale: 0.0006,
  });
  const akDark = new THREE.MeshStandardMaterial({
    color: '#16171b',
    metalness: 0.6,
    roughness: 0.55,
  });

  // a flat 2D profile in the (z, y) plane, extruded across x and centred on it
  const profile = (pts, depth, mat, bevel = 0.003) => {
    const sh = new THREE.Shape();
    pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: depth - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 12,
    });
    // shape x → z, shape y → y, extrusion → x
    geo.rotateY(-Math.PI / 2);
    geo.translate((depth - bevel * 2) / 2, 0, 0);
    return new THREE.Mesh(geo, mat);
  };
  const cylZ = (g, mat, r0, r1, z0, z1, x, y, seg = 16) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, z1 - z0, seg).rotateX(Math.PI / 2),
      mat,
    );
    m.position.set(x, y, (z0 + z1) / 2);
    g.add(m);
    return m;
  };
  const halfTube = (r, len, mat) =>
    new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(
        Math.PI / 2,
      ),
      mat,
    );

  const rifle = () => {
    const g = new THREE.Group();
    // receiver and its top cover, ribbed
    g.add(
      profile(
        [
          [-0.075, 0.032],
          [0.176, 0.032],
          [0.176, -0.026],
          [0.07, -0.026],
          [0.06, -0.032],
          [-0.02, -0.032],
          [-0.075, -0.022],
        ],
        0.036,
        akSteel,
      ),
    );
    const cover = halfTube(0.0175, 0.24, akSteel);
    cover.position.set(0, 0.032, 0.05);
    g.add(cover);
    [0.0, 0.03, 0.06].forEach((z) => box(g, akDark, 0.037, 0.004, 0.006, 0, 0.049, z - 0.02));
    // rear sight block and leaf
    g.add(
      profile(
        [
          [0.176, 0.05],
          [0.215, 0.04],
          [0.215, -0.012],
          [0.176, -0.026],
        ],
        0.034,
        akSteel,
      ),
    );
    box(g, akDark, 0.026, 0.004, 0.07, 0, 0.056, 0.2, -0.08);
    // barrel, gas tube, gas block, front sight, slant muzzle brake, cleaning rod
    cylZ(g, akSteel, 0.0115, 0.0105, 0.215, 0.63, 0, 0.012);
    cylZ(g, akSteel, 0.011, 0.011, 0.215, 0.44, 0, 0.042);
    box(g, akSteel, 0.03, 0.05, 0.035, 0, 0.026, 0.455);
    box(g, akSteel, 0.024, 0.034, 0.02, 0, 0.006, 0.61);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16, Math.PI), akSteel);
    hood.position.set(0, 0.03, 0.61);
    g.add(hood);
    box(g, akDark, 0.003, 0.022, 0.003, 0, 0.034, 0.61);
    cylZ(g, akSteel, 0.0135, 0.0135, 0.63, 0.668, 0, 0.012, 14);
    box(g, akDark, 0.03, 0.012, 0.03, 0.004, 0.024, 0.66, 0.6);
    cylZ(g, akDark, 0.0035, 0.0035, 0.3, 0.62, 0, -0.012, 8);
    // handguards: upper around the gas tube, lower with finger grooves, steel retaining bands
    const upper = halfTube(0.019, 0.18, akWood);
    upper.position.set(0, 0.042, 0.335);
    g.add(upper);
    g.add(
      profile(
        [
          [0.222, 0.03],
          [0.432, 0.03],
          [0.432, -0.02],
          [0.4, -0.03],
          [0.25, -0.03],
          [0.222, -0.022],
        ],
        0.044,
        akWood,
        0.006,
      ),
    );
    [0.29, 0.315, 0.34, 0.365].forEach((z) => box(g, akDark, 0.046, 0.003, 0.004, 0, -0.012, z));
    box(g, akSteel, 0.048, 0.07, 0.008, 0, 0.012, 0.218);
    box(g, akSteel, 0.048, 0.07, 0.008, 0, 0.012, 0.436);
    // pistol grip (raked back), trigger guard, trigger, selector lever, charging handle
    g.add(
      profile(
        [
          [-0.028, -0.026],
          [0.012, -0.026],
          [-0.012, -0.13],
          [-0.058, -0.124],
        ],
        0.03,
        akWood,
        0.006,
      ),
    );
    box(g, akSteel, 0.012, 0.004, 0.075, 0, -0.058, 0.04);
    box(g, akSteel, 0.012, 0.03, 0.004, 0, -0.044, 0.077);
    box(g, akDark, 0.005, 0.022, 0.006, 0, -0.038, 0.035, 0.3);
    box(g, akSteel, 0.003, 0.012, 0.11, -0.0195, 0.012, 0.06, 0.08);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.022, 8), akSteel);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.03, 0.026, 0.13);
    g.add(handle);
    // stock: laminated wood dropping toward a steel butt plate, a sling swivel
    g.add(
      profile(
        [
          [-0.075, 0.03],
          [-0.43, 0.005],
          [-0.43, -0.122],
          [-0.33, -0.1],
          [-0.12, -0.05],
          [-0.075, -0.022],
        ],
        0.036,
        akWood,
        0.007,
      ),
    );
    box(g, akSteel, 0.038, 0.13, 0.006, 0, -0.058, -0.432);
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0018, 6, 12), akSteel);
    sw.position.set(0, -0.1, -0.33);
    sw.rotation.y = Math.PI / 2;
    g.add(sw);
    // the 30-round magazine, curved forward, with its floor plate and stamped ribs
    const mag = new THREE.Group();
    mag.add(
      profile(
        [
          [0.075, -0.02],
          [0.142, -0.02],
          [0.17, -0.11],
          [0.205, -0.205],
          [0.13, -0.23],
          [0.105, -0.13],
          [0.08, -0.06],
        ],
        0.028,
        akSteel,
        0.003,
      ),
    );
    box(mag, akDark, 0.032, 0.008, 0.08, 0, -0.218, 0.168, -0.33);
    [-0.07, -0.12, -0.17].forEach((y, i) =>
      box(mag, akDark, 0.03, 0.004, 0.05, 0, y, 0.115 + i * 0.025, -0.25 - i * 0.04),
    );
    mag.userData.home = mag.position.clone();
    g.add(mag);
    g.userData.mag = mag;

    const flash = makeFlash();
    flash.position.copy(PROC_PTS.MUZZLE);
    const light = new THREE.PointLight('#ffa552', 0, 8, 2);
    light.position.set(0, 0.012, 0.7);
    g.add(light, flash);
    g.userData.flash = flash;
    g.userData.light = light;
    return g;
  };

  // longsword, grip at the origin, blade along +y
  const sword = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.2, 12), leather));
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), gold);
    pommel.position.y = -0.11;
    g.add(pommel);
    box(g, gold, 0.24, 0.026, 0.04, 0, 0.11, 0);
    const blade = new THREE.Shape();
    blade.moveTo(-0.04, 0);
    blade.lineTo(0.04, 0);
    blade.lineTo(0.032, 0.78);
    blade.lineTo(0, 0.9);
    blade.lineTo(-0.032, 0.78);
    blade.closePath();
    const bg = new THREE.ExtrudeGeometry(blade, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.006,
      bevelSegments: 1,
    }).translate(0, 0.12, -0.004);
    g.add(new THREE.Mesh(bg, steel));
    box(g, neon('#6cc8ff'), 0.012, 0.72, 0.02, 0, 0.5, 0);
    return g;
  };

  // ---------------------------------------------------------------------------------------------
  // Muzzle flash of a 7.62 round, seen from anywhere: a star facing down the barrel (front view
  // sprites) and two crossed flames along it (side view sprites), a new cell, angle and length on
  // every round; it lasts about a frame and a half
  const flashMat = (map, k) =>
    new THREE.MeshBasicMaterial({
      map,
      color: new THREE.Color('#ffffff').multiplyScalar(k),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });
  const setCell = (geo, c) => {
    const uv = geo.attributes.uv;
    const u0 = c / 4;
    // PlaneGeometry corners: (0,1) (1,1) (0,0) (1,0)
    uv.setXY(0, u0, 1);
    uv.setXY(1, u0 + 0.25, 1);
    uv.setXY(2, u0, 0);
    uv.setXY(3, u0 + 0.25, 0);
    uv.needsUpdate = true;
  };
  const makeFlash = () => {
    const flash = new THREE.Group();
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), flashMat(ATLAS.front, 1.6));
    front.position.z = 0.012;
    flash.add(front);
    const sides = [0, Math.PI / 2].map((r) => {
      // base of the flame at the muzzle, along +z
      const geo = new THREE.PlaneGeometry(0.34, 0.17).translate(0.17, 0, 0).rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(geo, flashMat(ATLAS.side, 1.5));
      m.rotation.z = r;
      flash.add(m);
      return m;
    });
    flash.visible = false;
    flash.userData = { front, sides };
    return flash;
  };

  // a dropped magazine falls, bounces on the floor, lies there a while, and goes
  const drops = [];
  const dropMag = (mag) => {
    if (drops.length >= 4) {
      R.scene.remove(drops[0].m);
      drops.shift();
    }
    const m = mag.clone();
    mag.updateMatrixWorld(true);
    mag.matrixWorld.decompose(m.position, m.quaternion, m.scale);
    m.visible = true;
    m.userData.s0 = m.scale.x;
    R.scene.add(m);
    const gy = Phys.groundAt(m.position.x, m.position.y, m.position.z);
    drops.push({
      m,
      v: V3((Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4),
      w: V3(1.5 + Math.random() * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3),
      floor: gy > -1e8 ? gy + 0.02 : m.position.y - 30,
      t: 8,
      hit: 0,
    });
  };
  const tickDrops = (dt) => {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t -= dt;
      if (d.hit < 3) {
        d.v.y -= 9.8 * dt;
        d.m.position.addScaledVector(d.v, dt);
        d.m.rotation.x += d.w.x * dt;
        d.m.rotation.y += d.w.y * dt;
        d.m.rotation.z += d.w.z * dt;
        if (d.m.position.y < d.floor && d.v.y < 0) {
          d.m.position.y = d.floor;
          d.v.y *= -0.25;
          d.v.x *= 0.4;
          d.v.z *= 0.4;
          d.w.multiplyScalar(0.3);
          if (!d.hit++) Sound.play('magDrop', d.m.position);
          // lying on its side once it settles
          if (d.hit >= 3) d.m.rotation.set(0, d.m.rotation.y, Math.PI / 2);
        }
      }
      if (d.t < 0.5) d.m.scale.setScalar(Math.max(0.001, d.t / 0.5) * (d.m.userData.s0 || 0.8));
      if (d.t <= 0) {
        R.scene.remove(d.m);
        drops.splice(i, 1);
      }
    }
  };

  // ---------------------------------------------------------------------------------------------
  // credits of the assets that ask for them, one discreet line on the pause screen
  const credits = () => {
    const box = document.querySelector('#pause .lobby-in');
    if (!box || box.querySelector('.asset-credits')) return;
    const p = document.createElement('p');
    p.className = 'asset-credits';
    p.style.cssText =
      'font-size:.62rem;opacity:.55;line-height:1.5;margin:.6rem 0 0;max-width:28rem';
    p.append(
      'AK-47 : modèle de Beerus (CC-BY 4.0, Sketchfab) · fissure de verre : Keith333 (CC-BY 3.0) · sons, textures et effets CC0 : ',
    );
    const a = document.createElement('a');
    a.href = 'assets/CREDITS.md';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'crédits';
    a.style.color = 'inherit';
    p.append(a);
    box.appendChild(p);
  };

  // the reload's sounds, on the hands' marks in js/world/avatar.js (progress 0..1)
  const REL_SND = [
    [0.12, 'handling'],
    [0.2, 'magOut'],
    [0.45, 'handling'],
    [0.655, 'magIn'],
    [0.83, 'boltBack'],
    [0.885, 'boltFwd'],
  ];
  // shared temporaries (no allocation per shot)
  const T = { a: V3(), b: V3(), c: V3(), d: V3(), q: new THREE.Quaternion(), e: new THREE.Euler() };

  const attach = (avatar) => {
    fxInit();
    credits();
    const models = { rifle: rifle(), sword: sword() };
    const holder = new THREE.Group();
    Object.values(models).forEach((m) => {
      m.visible = false;
      holder.add(m);
    });
    avatar.spin.add(holder);
    // the detailed astronauts hold the rifle in both hands, on a mount the avatar poses itself
    const mount = avatar.gunMount || null;
    if (mount) mount.add(models.rifle);
    const R1 = models.rifle;
    const hv = V3();
    const lh = V3();
    let kind = null;
    let flashT = 0;
    let aimK = 0;
    let pitchK = 0;
    let lastReload = 0;
    let boltT = 0;
    let trigT = 0;
    let burst = 0;
    let sinceShot = 9;
    const FLASH = 0.03;
    const BOLT_T = 0.07;
    const magQ = new THREE.Quaternion();
    const magE = new THREE.Euler();
    const pts = () => R1.userData.pts || PROC_PTS;
    // the AK-47 model replaces the procedural one as soon as it is loaded
    loadAK().then((src) => {
      if (!src) return;
      const m = src.clone();
      [...R1.children].forEach((c) => {
        if (c !== R1.userData.flash && c !== R1.userData.light) R1.remove(c);
      });
      R1.add(m);
      const P = AK_PTS;
      R1.userData.pts = P;
      R1.userData.mag = m.getObjectByName('Magazine');
      R1.userData.mag.userData.home = R1.userData.mag.position.clone();
      R1.userData.bolt = m.getObjectByName('Bolt');
      R1.userData.trigger = m.getObjectByName('Trigger');
      R1.userData.flash.position.copy(P.MUZZLE);
      R1.userData.light.position.copy(P.MUZZLE).z += 0.05;
      R1.userData.model = 'ak47';
    });
    const flashTick = (dt) => {
      flashT -= dt;
      const f = R1.userData.flash;
      f.visible = flashT > 0;
      R1.userData.light.intensity = flashT > 0 ? (flashT / FLASH) * 2.6 : 0;
    };
    const fxPos = () =>
      avatar === (typeof Player !== 'undefined' && Player.avatar) ? null : avatar.root.position;
    // the magazine leaves the well with the left hand, rocks out, is dropped; a full one comes
    // from the belt and is rocked in; the hand racks the charging handle, which flies home
    const magTick = (reload) => {
      const mag = R1.userData.mag;
      const P = pts();
      for (const [t, s] of REL_SND)
        if (lastReload < t && reload >= t && reload - lastReload < 0.3) Sound.play(s, fxPos());
      if (lastReload <= 0.31 && reload > 0.31) dropMag(mag);
      lastReload = reload;
      const bolt = R1.userData.bolt;
      if (bolt) {
        const travel = P.BOLT.z - P.BOLTBACK.z;
        let z = 0;
        if (reload > 0.8 && reload < 0.885) {
          avatar.root.updateMatrixWorld(true);
          avatar.rig.handWorld(0, lh);
          R1.worldToLocal(lh);
          z = clamp(lh.z - P.BOLT.z, -travel, 0);
        } else if (boltT > 0) z = -travel * Math.sin(Math.PI * (1 - boltT / BOLT_T));
        bolt.position.z = z;
      }
      const out = reload > 0.16 && reload < 0.66;
      if (!out || !avatar.rig) {
        mag.position.copy(mag.userData.home);
        mag.quaternion.identity();
        mag.visible = true;
        return;
      }
      // empty-handed between the drop and the belt
      mag.visible = !(reload > 0.31 && reload < 0.42);
      avatar.root.updateMatrixWorld(true);
      avatar.rig.handWorld(0, lh);
      R1.worldToLocal(lh);
      // rocked forward out of the well, carried tilted, rocked back in
      const tilt =
        reload < 0.28
          ? clamp((reload - 0.16) / 0.12, 0, 1) * 0.45
          : reload < 0.58
            ? 0.45
            : clamp((0.66 - reload) / 0.08, 0, 1) * 0.45;
      magE.set(-tilt, 0, 0);
      magQ.setFromEuler(magE);
      mag.quaternion.copy(magQ);
      // the hand holds the magazine where the grab point is
      T.a.copy(P.MAG).applyQuaternion(magQ);
      mag.position.copy(lh).sub(T.a);
    };
    const muzzleSmoke = (m, k) => {
      SMOKE.spawn(
        m,
        rnd(0.08),
        0.18 + Math.random() * 0.1,
        rnd(0.08),
        (Math.random() * 4) | 0,
        0.04,
        0.28 + Math.random() * 0.15,
        0.9 + Math.random() * 0.6,
        0.16 * k,
        0.78,
        0.76,
        0.8,
        -0.12,
        1.6,
      );
    };
    return {
      fire() {
        flashT = FLASH;
        sinceShot = 0;
        burst++;
        if (kind !== 'rifle') return;
        boltT = BOLT_T;
        trigT = 0.06;
        const f = R1.userData.flash;
        const u = f.userData;
        f.rotation.z = Math.random() * TAU;
        setCell(u.front.geometry, (Math.random() * 4) | 0);
        u.front.scale.setScalar(0.7 + Math.random() * 0.5);
        u.sides.forEach((s) => {
          setCell(s.geometry, (Math.random() * 4) | 0);
          s.scale.set(0.8 + Math.random() * 0.5, 0.75 + Math.random() * 0.5, 1);
        });
        avatar.root.updateMatrixWorld(true);
        const m = f.getWorldPosition(T.a);
        muzzleSmoke(m, 1);
        // a spent case out of the port, to the right, up and a little back
        const P = pts();
        R1.getWorldQuaternion(T.q);
        T.b.set(-1, 0, 0).applyQuaternion(T.q);
        T.c.set(0, 1, 0).applyQuaternion(T.q);
        T.d.set(0, 0, 1).applyQuaternion(T.q);
        ejectShell(R1.localToWorld(T.a.copy(P.EJECT)), T.b, T.c, T.d);
        if (avatar.kick) avatar.kick();
      },
      // world position of the rifle muzzle
      muzzle(out) {
        if (kind !== 'rifle') return avatar.hand(out);
        avatar.root.updateMatrixWorld(true);
        return R1.userData.flash.getWorldPosition(out);
      },
      update(dt, k, swing, aim, pitch = 0, reload = 0) {
        // the shared effects (smoke, sparks, cases, holes) step with the local player's frame
        if (typeof Player !== 'undefined' && avatar === Player.avatar) tick(dt);
        if (k !== kind) {
          kind = k;
          R1.visible = k === 'rifle';
          models.sword.visible = k === 'sword';
        }
        holder.visible = !!k && avatar.root.visible;
        tickDrops(dt);
        if (!k) return;
        boltT = Math.max(0, boltT - dt);
        trigT = Math.max(0, trigT - dt);
        if (R1.userData.trigger) R1.userData.trigger.rotation.x = trigT > 0 ? 0.3 : 0;
        // the barrel smokes a little after a burst
        sinceShot += dt;
        if (burst > 4 && sinceShot > 0.18 && kind === 'rifle') {
          avatar.root.updateMatrixWorld(true);
          const m = R1.userData.flash.getWorldPosition(T.a);
          muzzleSmoke(m, 0.8);
          muzzleSmoke(m, 0.6);
          burst = 0;
        }
        if (sinceShot > 0.3) burst = 0;
        if (k === 'rifle' && mount) {
          flashTick(dt);
          magTick(reload);
          return;
        }
        avatar.root.updateMatrixWorld(true);
        avatar.hand(hv);
        avatar.spin.worldToLocal(hv);
        holder.position.copy(hv);
        if (k === 'rifle') {
          aimK = damp(aimK, aim ? 1 : 0, 16, dt);
          pitchK = damp(pitchK, pitch, 14, dt);
          holder.rotation.set(lerp(0.5, pitchK, aimK), lerp(0.5, 0.05, aimK), lerp(-0.3, 0, aimK));
          flashTick(dt);
        } else {
          // rest: blade raised forward; swing: arc down and across
          const s = clamp(swing / 0.25, 0, 1);
          const e = Math.sin(s * Math.PI);
          holder.rotation.set(lerp(0.55, 1.9, e), lerp(0.2, -0.9, e), lerp(-0.25, 0.4, e));
        }
      },
    };
  };

  // the world's effects run once a frame, whoever fires
  const tick = (dt) => {
    if (!SMOKE) return;
    const h = R.renderer.getDrawingBufferSize(sizeV).y;
    const sc = h * 0.5 * R.camera.projectionMatrix.elements[5];
    for (const s of systems) {
      s.mat.uniforms.uScale.value = sc;
      s.tick(dt);
    }
    tickShells(dt);
    tickDecals(dt);
  };

  return {
    attach,
    impact,
    tick,
    SURFS,
    // for tests: is the model in, how many effects are alive
    get model() {
      return akPromise;
    },
    stats: () => ({
      decals: decal ? Array.from(decal.t).filter((t) => t > 0).length : 0,
      shells: shells ? Array.from(shells.t).filter((t) => t > 0).length : 0,
      drops: drops.length,
      particles: systems.map((s) => s.live),
    }),
  };
})();
