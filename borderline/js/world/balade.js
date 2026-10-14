// ♥ 2 · La Rivière: a night walk up a lantern-lit river to a waterfall.
const Balade = (() => {
  const O = V3(0, 80, 1400);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const { P } = K;
  const fogU = THREE.UniformsLib.fog;
  const U = { uTime: { value: 0 } };
  const RW = 5;
  const LEN = 214;
  let built = false;
  let bridge = null;
  let bridgeB = null;
  let card = null;
  let skyLan = null;
  let flies = null;
  let fall = null;
  let bridgeRails = [];
  const signs = [];
  const benches = [];
  const stall = [];
  let released = 0;

  // materials are created on first build() so their textures are only generated when needed
  let M = null;
  const mats = () => {
    if (M) return M;
    M = {
      grass: Tex.mat('grass', { color: '#8a96b8', scale: 5, bump: 0.8 }),
      pole: Tex.mat('metal', { color: '#3a2e34', scale: 1.5, rough: 0.7, metal: 0.4 }),
      path: Tex.mat('cobble', { color: '#c9b4ac', scale: 2.4, bump: 1.2 }),
      stone: Tex.mat('rock', { color: '#8e86a6', scale: 3, bump: 1.6 }),
      bed: Tex.mat('rock', { color: '#4a4660', scale: 4 }),
      cliff: Tex.mat('rock', { color: '#a49cbc', scale: 6, bump: 2 }),
      masonry: Tex.mat('stone', { color: '#a49ab4', scale: 2.5, bump: 1.2 }),
      wood: Tex.mat('wood', { color: '#8a6450', scale: 4.5, bump: 0.8 }),
      bark: Tex.mat('rock', { color: '#6a4a50', scale: 1.2, bump: 1.8 }),
      roof: Tex.mat('fabric', { color: '#c8324f', scale: 0.8, rough: 0.9, emissive: '#3a0a14' }),
      pad: Tex.mat('grass', { color: '#4a8a6a', scale: 1, emissive: '#0a2a1a' }),
    };
    return M;
  };
  const blossom = new THREE.MeshStandardMaterial({
    color: '#ffb3d0',
    roughness: 0.8,
    emissive: '#6a2a4a',
    emissiveIntensity: 0.55,
    flatShading: true,
  });
  // soft round glow used for lamps
  const haloTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,200,140,0.9)');
    gr.addColorStop(0.25, 'rgba(255,160,90,0.35)');
    gr.addColorStop(1, 'rgba(255,140,80,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  // one InstancedMesh per (geometry, material) for all repeated props
  const obj = new THREE.Object3D();
  const inst = (geo, mat, list) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0], i) => {
      obj.position.set(O.x + x, O.y + y, O.z + z);
      obj.scale.set(sx, sy, sz);
      obj.rotation.set(rx, ry, rz);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    group.add(m);
    return m;
  };

  const waterMat = new THREE.ShaderMaterial({
    fog: true,
    transparent: true,
    uniforms: { ...fogU, ...U, uFlow: { value: 1 } },
    vertexShader: `
      varying vec3 vW;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFlow;
      varying vec3 vW;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 p = vW.xz * vec2(0.6, 0.25) + vec2(0.0, -uTime * 0.45 * uFlow);
        float n = noise(p) * 0.6 + noise(p * 2.7 + 3.1) * 0.3 + noise(p * 7.0 - uTime * 0.2) * 0.1;
        vec3 deep = vec3(0.04, 0.05, 0.14);
        vec3 lit = vec3(0.32, 0.22, 0.48);
        vec3 col = mix(deep, lit, smoothstep(0.35, 0.9, n));
        float sp = pow(noise(vW.xz * 3.0 + uTime * 0.6), 18.0) * 3.0;
        col += vec3(1.0, 0.75, 0.55) * sp;
        float lan = sin(vW.z * 0.21) * 0.5 + 0.5;
        col += vec3(1.0, 0.55, 0.3) * 0.06 * lan;
        gl_FragColor = vec4(col, 0.9);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `,
  });

  const fallMat = new THREE.ShaderMaterial({
    fog: true,
    transparent: true,
    depthWrite: false,
    uniforms: { ...fogU, ...U },
    vertexShader: `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float n = noise(vec2(vUv.x * 30.0, vUv.y * 4.0 + uTime * 3.0)) * 0.7 + noise(vec2(vUv.x * 80.0, vUv.y * 9.0 + uTime * 5.0)) * 0.3;
        vec3 col = mix(vec3(0.3, 0.32, 0.55), vec3(0.95, 0.92, 1.0), smoothstep(0.45, 0.85, n));
        float a = (0.55 + n * 0.4) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        gl_FragColor = vec4(col * 1.3, a);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `,
  });

  const signTex = (txt) =>
    LvKit.tex(512, 320, (g, w, h) => {
      g.fillStyle = '#4a3024';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2a1810';
      g.lineWidth = 10;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#ffe8c8';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 34px Georgia';
      const words = txt.replace('Panneau · ', '').split(' ');
      const lines = [];
      let l = '';
      words.forEach((wd) => {
        if (g.measureText(l + ' ' + wd).width > w - 70) {
          lines.push(l);
          l = wd;
        } else l = l ? l + ' ' + wd : wd;
      });
      lines.push(l);
      lines.forEach((ln, i) =>
        Icons.fillText(g, ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 44),
      );
    });

  // trees, rocks and lamps are collected during build and instanced at the end
  const T = { trunks: [], crowns: [], rocks: [], pads: [], flowersA: [], flowersB: [] };
  const tree = (x, z, s, r, solid = true) => {
    T.trunks.push([x, 1.7 * s, z, s, s, s, 0, r() * 6, (r() - 0.5) * 0.2]);
    for (let i = 0; i < 5; i++) {
      const k = (1.1 + r() * 0.8) * s;
      T.crowns.push([
        x + (r() - 0.5) * 2.6 * s,
        (3.6 + r() * 1.4) * s,
        z + (r() - 0.5) * 2.6 * s,
        k,
        k,
        k,
        r() * 3,
        r() * 3,
        0,
      ]);
    }
    if (solid) K.collider(x, 1.5 * s, z, 0.6 * s, 3 * s, 0.6 * s);
  };
  const rock = (x, y, z, rad, r, solid) => {
    const sy = rad * (0.7 + r() * 0.4);
    T.rocks.push([x, y, z, rad, sy, rad, r() * 3, r() * 3, r() * 3]);
    if (solid) K.collider(x, (y + sy) / 2, z, rad * 1.3, y + sy, rad * 1.3);
  };

  const lampPost = (x, z) => {
    K.deco(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8), mats().pole, x, 1.4, z);
    K.deco(new THREE.CylinderGeometry(0.16, 0.1, 0.12, 8), mats().pole, x, 2.78, z);
    const l = K.deco(new THREE.OctahedronGeometry(0.22), LvKit.glow('#ffc070', 2.4), x, 2.95, z);
    const h = new THREE.Sprite(haloMat);
    h.position.copy(P(x, 2.95, z));
    h.scale.setScalar(2.2);
    group.add(h);
    K.collider(x, 1.4, z, 0.25, 2.8, 0.25);
    return l;
  };

  const bench = (x, z, yaw) => {
    const g = new THREE.Group();
    const woodM = mats().wood;
    // seat top at 0.5 m like every bench (Benches seats the avatar at that height)
    // shallow seat (front edge at +0.17) so the knees clear it, like the city benches
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.5), woodM);
    seat.position.set(0, 0.44, -0.08);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.1), woodM);
    back.position.set(0, 0.82, -0.36);
    [-1.3, 1.3].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.44), woodM);
      leg.position.set(lx, 0.19, -0.1);
      g.add(leg);
    });
    g.add(seat, back);
    g.position.copy(P(x, 0, z));
    g.rotation.y = yaw;
    group.add(g);
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    K.collider(
      x - Math.sin(yaw) * 0.1,
      0.25,
      z - Math.cos(yaw) * 0.1,
      along ? 0.56 : 3,
      0.5,
      along ? 3 : 0.56,
      { tag: 'bench' },
    );
    const bx = x - Math.sin(yaw) * 0.36;
    const bz = z - Math.cos(yaw) * 0.36;
    K.collider(bx, 0.81, bz, along ? 0.12 : 3, 0.62, along ? 3 : 0.12, { tag: 'bench' });
    const b = { pos: P(x, 0, z), yaw, g };
    benches.push(b);
    return b;
  };

  // rock face behind the waterfall: a displaced, rock-textured sheet with a notch for the fall
  const cliffMesh = () => {
    const W = 96;
    const H = 30;
    const geo = new THREE.PlaneGeometry(W, H, 64, 22);
    const pos = geo.attributes.position;
    const r = rng(77);
    const ph = [...Array(8)].map(() => r() * 10);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // layered ridged noise: big ledges, then cracks and facets
      let n = 0;
      let a = 1;
      let fq = 0.12;
      for (let o = 0; o < 4; o++) {
        const v =
          Math.sin(x * fq + ph[o] + Math.sin(y * fq * 1.7 + ph[o + 1]) * 1.3) *
          Math.cos(y * fq * 1.3 + ph[o + 2]);
        n += (1 - Math.abs(v)) * a;
        a *= 0.5;
        fq *= 2.1;
      }
      n /= 1.875;
      // the fall cuts a notch into the rock
      const notch = Math.max(0, 1 - Math.abs(x) / 9);
      pos.setZ(i, n * 4 * (1 - notch) - notch * 2);
      // jagged skyline
      if (y > H / 2 - 0.1) pos.setY(i, y + Math.sin(x * 0.4 + ph[5]) * 1.6 + r() * 0.8);
    }
    // faceted shading reads as broken rock rather than a smooth curtain
    const g2 = geo.toNonIndexed();
    g2.computeVertexNormals();
    mats().cliff.flatShading = true;
    const m = new THREE.Mesh(g2, mats().cliff);
    m.rotation.y = Math.PI;
    m.position.copy(P(0, H / 2 - 3, LEN + 1.4));
    group.add(m);
    return m;
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    const r = rng(1402);
    const { grass: grassM, path: pathM, stone: stoneM, bed, wood: woodM, masonry } = mats();
    // banks
    K.solid(RW + 17.5, -0.5, LEN / 2, 35, 1, LEN + 8, grassM);
    K.solid(-RW - 17.5, -0.5, LEN / 2, 35, 1, LEN + 8, grassM);
    // gravel paths
    K.deco(new THREE.PlaneGeometry(2.6, 64).rotateX(-Math.PI / 2), pathM, RW + 3, 0.02, 30);
    K.deco(new THREE.PlaneGeometry(2.6, 140).rotateX(-Math.PI / 2), pathM, -RW - 3, 0.02, 132);
    // river bed + water; the bank faces are rock down to the bed
    K.solid(0, -6.5, LEN / 2, RW * 2, 1, LEN + 8, bed);
    [-1, 1].forEach((s) =>
      K.deco(new THREE.BoxGeometry(0.3, 6, LEN + 8), bed, s * (RW - 0.15), -3, LEN / 2),
    );
    const water = K.deco(
      new THREE.PlaneGeometry(RW * 2, LEN + 8, 1, 1).rotateX(-Math.PI / 2),
      waterMat,
      0,
      -0.6,
      LEN / 2,
    );
    water.renderOrder = 2;
    // bank edges: low stones + invisible walls (except the light-bridge gap and the pier)
    [-1, 1].forEach((s) => {
      for (let z = -2; z < LEN + 2; z += 1.6) {
        if (z > 57.6 && z < 62.4) continue;
        if (s < 0 && z > 122 && z < 128) continue;
        rock(s * (RW + 0.2), 0.05, z, 0.35 + r() * 0.25, r);
      }
    });
    // thick enough to cover the edge stones, tall enough that a double jump can't clear it
    const wallSeg = (x, z0, z1) =>
      K.collider(x, 2, (z0 + z1) / 2, 1.1, 4, z1 - z0, { tag: 'nocam' });
    wallSeg(RW + 0.5, -4, 56);
    wallSeg(RW + 0.5, 64, 163.4);
    wallSeg(RW + 0.5, 166.6, LEN + 4);
    wallSeg(-RW - 0.5, -4, 56);
    wallSeg(-RW - 0.5, 64, 122.4);
    wallSeg(-RW - 0.5, 127.6, 163.4);
    wallSeg(-RW - 0.5, 166.6, LEN + 4);
    // outer limits: a dense tree line and invisible walls, so nobody walks off the banks
    [-1, 1].forEach((s) => {
      K.collider(s * (RW + 33), 4, LEN / 2, 1, 8, LEN + 10, { tag: 'nocam' });
      for (let z = -4; z < LEN + 4; z += 3.2)
        tree(s * (RW + 31 + r() * 3), z + r() * 2, 1.1 + r() * 0.6, r, false);
    });
    // ends
    K.collider(0, 4, -4.5, 90, 10, 1);
    for (let i = 0; i < 26; i++) {
      const rad = 1.6 + r() * 2.2;
      rock(-44 + i * 3.6, rad * 0.45, -5.5 - r() * 2, rad, r);
    }
    // east bank closed after the light bridge: a rock slide resting on the grass
    for (let i = 0; i < 16; i++) {
      const rad = 1.3 + r() * 1.8;
      rock(RW + 1.6 + i * 2.1, rad * 0.5, 66 + r() * 3, rad, r);
    }
    K.collider(RW + 17.5, 2.5, 67, 35, 5, 5);
    // light bridge
    bridge = new THREE.Group();
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(RW * 2 + 1.6, 0.16, 2.6),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffcf8a').multiplyScalar(1.4),
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    bridge.add(deck);
    bridgeRails = [];
    [-1.3, 1.3].forEach((z) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(RW * 2 + 1.6, 0.05, 0.05),
        LvKit.glow('#ffcf8a', 2.2),
      );
      rail.position.set(0, 0.9, z);
      bridge.add(rail);
      bridgeRails.push(rail);
    });
    bridge.position.copy(P(0, -0.08, 60));
    group.add(bridge);
    bridgeB = Phys.box(O.x, O.y - 0.08, O.z + 60, RW * 2 + 1.6, 0.16, 2.6, { dyn: true });
    [-1, 1].forEach((s) =>
      [-1.3, 1.3].forEach((dz) =>
        K.deco(
          new THREE.CylinderGeometry(0.1, 0.12, 1.3, 10),
          LvKit.glow('#ffcf8a', 1.2),
          s * (RW + 0.6),
          0.65,
          60 + dz,
        ),
      ),
    );
    // lantern stall
    const stallG = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2), mats().roof);
    top.position.y = 2.6;
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 1.2), woodM);
    table.position.y = 0.45;
    [-1.8, 1.8].forEach((x) =>
      [-0.8, 0.8].forEach((z) => {
        const po = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), woodM);
        po.position.set(x, 1.3, z);
        stallG.add(po);
      }),
    );
    stallG.add(top, table);
    stallG.position.copy(P(-RW - 7, 0, 108));
    stallG.rotation.y = Math.PI / 2;
    group.add(stallG);
    K.collider(-RW - 7, 1.3, 108, 1.9, 2.6, 3.9);
    const stallLamp = new THREE.PointLight('#ffb070', 1.2, 9, 2);
    stallLamp.position.copy(P(-RW - 6.6, 2.2, 108));
    group.add(stallLamp);
    [-0.8, 0.8].forEach((dz) => {
      const l = lantern();
      l.position.copy(P(-RW - 6.6, 1.25, 108 + dz));
      group.add(l);
      stall.push(l);
    });
    // pier
    K.solid(-RW + 1.8, -0.15, 125, 4, 0.3, 5, woodM);
    [-1, 1].forEach((s) =>
      [-RW + 0.2, -RW + 3.6].forEach((x) =>
        K.deco(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), woodM, x, -0.9, 125 + s * 2.2),
      ),
    );
    // railing on the three water sides of the pier
    K.collider(-RW + 3.9, 1.5, 125, 0.3, 3, 5, { tag: 'nocam' });
    [-1, 1].forEach((s) =>
      K.collider(-RW + 2.1, 1.5, 125 + s * 2.55, 3.9, 3, 0.3, { tag: 'nocam' }),
    );
    K.deco(new THREE.BoxGeometry(0.1, 0.1, 5), woodM, -RW + 3.75, 0.9, 125);
    [-2.3, 0, 2.3].forEach((dz) =>
      K.deco(new THREE.BoxGeometry(0.1, 0.9, 0.1), woodM, -RW + 3.75, 0.45, 125 + dz),
    );
    [-1, 1].forEach((s) => {
      K.deco(new THREE.BoxGeometry(3.7, 0.1, 0.1), woodM, -RW + 1.9, 0.9, 125 + s * 2.4);
      [0.4, 1.9, 3.4].forEach((dx) =>
        K.deco(new THREE.BoxGeometry(0.1, 0.9, 0.1), woodM, -RW + dx, 0.45, 125 + s * 2.4),
      );
    });
    // stone bridge across the river near the end, leading to the quiet east bank
    K.solid(0, 0.1, 165, RW * 2 + 2, 0.4, 3, masonry);
    [-1, 1].forEach((s) => K.solid(0, 0.75, 165 + s * 1.4, RW * 2 + 2, 0.9, 0.2, masonry));
    [-1, 1].forEach((s) =>
      K.deco(new THREE.BoxGeometry(1.2, 6, 3.2), masonry, s * (RW - 0.3), -3.1, 165),
    );
    // waterfall cliff
    K.collider(0, 10, LEN + 2, 96, 22, 7.2);
    cliffMesh();
    for (let i = 0; i < 14; i++) {
      const x = (r() < 0.5 ? -1 : 1) * (7 + r() * 36);
      const rad = 1.4 + r() * 2.4;
      rock(x, rad * 0.4, LEN - 1 - r() * 3, rad, r, true);
    }
    // the sheet faces the players (a plane faces +z by default)
    fall = K.deco(new THREE.PlaneGeometry(9, 22, 1, 1), fallMat, 0, 10.4, LEN - 0.2);
    fall.rotation.y = Math.PI;
    // mist where the fall meets the river, and a cool light on the rock
    const mist = new THREE.Sprite(haloMat.clone());
    mist.material.color.set('#c8d8ff');
    mist.material.opacity = 0.55;
    mist.position.copy(P(0, 0.6, LEN - 1.2));
    mist.scale.set(14, 4, 1);
    group.add(mist);
    LvKit.light(group, P(0, 6, LEN - 6), '#b8c8ff', 2.2, 26);
    // facing the waterfall, square to the axes so its collider matches what you see
    bench(-RW - 4, LEN - 14, 0);
    card = LvKit.card('2', '♥', true);
    card.position.copy(P(-3, -0.6, LEN - 10));
    group.add(card);
    // trees along the banks
    for (let z = 4; z < LEN - 6; z += 7) {
      [-1, 1].forEach((s) => {
        if (r() < 0.75) tree(s * (RW + 9 + r() * 18), z + r() * 4, 0.9 + r() * 0.6, r);
      });
    }
    for (let z = 6; z < 60; z += 12) lampPost(RW + 4.6, z);
    for (let z = 66; z < LEN - 20; z += 12) lampPost(-RW - 4.6, z);
    // one lamp beside the waterfall bench, clear of where you sit
    lampPost(-RW - 7.6, LEN - 12.5);
    // question signs
    CONFIG.balade.signs.forEach((txt, i) => {
      const z = [18, 44, 88, 140, 182][i];
      const x = z < 58 ? RW + 5.5 : -RW - 5.5;
      K.deco(new THREE.BoxGeometry(0.14, 1.6, 0.14), woodM, x, 0.8, z);
      K.deco(new THREE.BoxGeometry(0.1, 1.12, 1.72), woodM, x + (x > 0 ? 0.06 : -0.06), 1.75, z);
      const tx = signTex(txt);
      const b = K.deco(
        new THREE.PlaneGeometry(1.6, 1),
        new THREE.MeshStandardMaterial({
          map: tx,
          roughness: 0.8,
          emissive: '#ffffff',
          emissiveMap: tx,
          emissiveIntensity: 0.25,
        }),
        x + (x > 0 ? -0.02 : 0.02),
        1.75,
        z,
      );
      b.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      K.collider(x, 0.9, z, 0.3, 1.8, 1.7);
      signs.push({ pos: P(x, 0, z), txt });
    });
    // lily pads with glowing flowers drifting on the river
    for (let i = 0; i < 40; i++) {
      const k = 0.35 + r() * 0.3;
      const x = (r() - 0.5) * RW * 1.8;
      const z = r() * LEN;
      T.pads.push([x, -0.58, z, k, 1, k, 0, r() * 6, 0]);
      if (r() < 0.5) (r() < 0.5 ? T.flowersA : T.flowersB).push([x, -0.45, z, 1, 1, 1]);
    }
    // instanced props
    inst(new THREE.CylinderGeometry(0.18, 0.32, 3.4, 8), mats().bark, T.trunks);
    inst(new THREE.IcosahedronGeometry(1, 0), blossom, T.crowns);
    inst(new THREE.DodecahedronGeometry(1, 0), stoneM, T.rocks);
    inst(new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2), mats().pad, T.pads);
    inst(new THREE.OctahedronGeometry(0.1), LvKit.glow('#ffb3d0', 2.2), T.flowersA);
    inst(new THREE.OctahedronGeometry(0.1), LvKit.glow('#fff2c8', 2.2), T.flowersB);
    // fireflies
    const N = 420;
    const pos = new Float32Array(N * 3);
    const ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = O.x + (r() - 0.5) * 50;
      pos[i * 3 + 1] = O.y + 0.4 + r() * 5;
      pos[i * 3 + 2] = O.z + r() * LEN;
      ph[i] = r() * 100;
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    fg.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    flies = new THREE.Points(
      fg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `
          uniform float uTime;
          attribute float ph;
          varying float vA;
          void main() {
            vec3 p = position + vec3(sin(uTime * 0.4 + ph) * 1.2, sin(uTime * 0.7 + ph * 1.3) * 0.5, cos(uTime * 0.3 + ph) * 1.2);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vA = 0.5 + 0.5 * sin(uTime * 2.0 + ph * 7.0);
            gl_PointSize = (90.0 / -mv.z) * (0.6 + vA);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vA;
            gl_FragColor = vec4(vec3(1.0, 0.85, 0.45) * 2.0, a);
          }
        `,
      }),
    );
    flies.frustumCulled = false;
    group.add(flies);
    // sky lanterns (shown after the release)
    const NL = 160;
    skyLan = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.17, 0.42, 8),
      LvKit.glow('#ffa860', 2.2),
      NL,
    );
    skyLan.userData.seed = [...Array(NL)].map(() => [
      (r() - 0.5) * 70,
      r() * LEN,
      r() * 40,
      0.5 + r(),
    ]);
    skyLan.frustumCulled = false;
    skyLan.visible = false;
    group.add(skyLan);
  };

  const lantern = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.5, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffb070').multiplyScalar(1.8),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), LvKit.glow('#fff2c8', 3));
    flame.position.y = -0.16;
    g.add(body, flame);
    return g;
  };

  const m4 = new THREE.Matrix4();
  return {
    O,
    P,
    build,
    lantern,
    get built() {
      return built;
    },
    benches,
    signs,
    stall,
    rel: K.rel,
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage >= 5) return P(-RW - 3 + s * 0.8, 0, LEN - 18);
      if (stage >= 3) return P(-RW - 3 + s * 0.8, 0, 113);
      if (stage >= 2) return P(-RW - 3 + s * 0.8, 0, 70);
      return P(RW + 3 + s * 0.8, 0, 3);
    },
    nearBridge: (q) => q.z > 55 && q.z < 65 && Math.abs(q.x) < RW + 4,
    nearStall: (q) => Math.hypot(q.x + RW + 6, q.z - 108) < 3.2,
    onPier: (q) => q.x > -RW - 0.6 && q.x < -RW + 4 && Math.abs(q.z - 125) < 2.7 && q.y > -0.5,
    nearBench: (q) => Math.hypot(q.x + RW + 4, q.z - (LEN - 14)) < 3,
    nearCard: (q) => Math.hypot(q.x + 3, q.z - (LEN - 10)) < 4.6,
    passed: (q) => q.z > 64 && q.x < 0,
    update(dt, t, x, bridgeOn) {
      if (!built) return;
      U.uTime.value = t;
      bridgeB.on = bridgeOn;
      bridge.children[0].material.opacity = damp(
        bridge.children[0].material.opacity,
        bridgeOn ? 0.6 : 0.04,
        6,
        dt,
      );
      for (const c of bridgeRails) c.visible = bridgeOn;
      stall.forEach((l, i) => {
        l.visible = !(x.lan || {})[i ? 'valet' : 'dame'];
        l.rotation.y = t + i;
      });
      if (x.released) released = Math.min(1, released + dt * 0.05);
      skyLan.visible = released > 0;
      if (skyLan.visible) {
        skyLan.userData.seed.forEach(([sx, sz, sy, sp], i) => {
          const y = ((sy + t * sp * 0.6) % 45) * released;
          m4.makeTranslation(O.x + sx + Math.sin(t * 0.3 + i) * 0.8, O.y + 1 + y, O.z + sz);
          skyLan.setMatrixAt(i, m4);
        });
        skyLan.instanceMatrix.needsUpdate = true;
      }
      card.visible = x.stage >= 5;
      if (card.visible) {
        card.position.y = damp(card.position.y, O.y + 1.6 + Math.sin(t * 2) * 0.15, 1.5, dt);
        card.position.x = O.x - 3;
        card.rotation.y = t * 1.2;
      }
    },
  };
})();
