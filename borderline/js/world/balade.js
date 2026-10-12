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
  const signs = [];
  const benches = [];
  const stall = [];
  let released = 0;

  const grassTex = LvKit.tex(
    512,
    512,
    (g, w, h) => {
      LvKit.grain(g, w, h, '#2a3a34', 0.14, 14000);
      for (let i = 0; i < 3000; i++) {
        g.strokeStyle = `rgba(${90 + Math.random() * 60},${140 + Math.random() * 60},${110 + Math.random() * 40},${0.25 + Math.random() * 0.3})`;
        g.beginPath();
        const x = Math.random() * w;
        const y = Math.random() * h;
        g.moveTo(x, y);
        g.lineTo(x + (Math.random() - 0.5) * 4, y - 3 - Math.random() * 6);
        g.stroke();
      }
    },
    18,
    40,
  );
  const pathTex = LvKit.tex(
    256,
    256,
    (g, w, h) => LvKit.grain(g, w, h, '#6a5a58', 0.16, 6000),
    1,
    40,
  );
  const grassM = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.95,
    color: '#9ab0a8',
  });
  const pathM = new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9, color: '#b8a8a0' });
  const stoneM = new THREE.MeshStandardMaterial({
    color: '#3a3446',
    roughness: 0.85,
    flatShading: true,
  });
  const woodM = new THREE.MeshStandardMaterial({ color: '#6a4632', roughness: 0.8 });
  const barkM = new THREE.MeshStandardMaterial({ color: '#3a2630', roughness: 0.9 });
  const blossom = new THREE.MeshStandardMaterial({
    color: '#ffb3d0',
    roughness: 0.8,
    emissive: '#6a2a4a',
    emissiveIntensity: 0.55,
    flatShading: true,
  });

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

  const tree = (x, z, s, r) => {
    const t = K.deco(
      new THREE.CylinderGeometry(0.18 * s, 0.32 * s, 3.4 * s, 7),
      barkM,
      x,
      1.7 * s,
      z,
    );
    t.rotation.z = (r() - 0.5) * 0.2;
    for (let i = 0; i < 5; i++) {
      const b = K.deco(
        new THREE.IcosahedronGeometry((1.1 + r() * 0.8) * s, 0),
        blossom,
        x + (r() - 0.5) * 2.6 * s,
        (3.6 + r() * 1.4) * s,
        z + (r() - 0.5) * 2.6 * s,
      );
      b.rotation.set(r() * 3, r() * 3, 0);
    }
    K.collider(x, 1.5 * s, z, 0.6 * s, 3 * s, 0.6 * s);
  };

  const lampPost = (x, z) => {
    K.deco(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 6), woodM, x, 1.4, z);
    const l = K.deco(new THREE.OctahedronGeometry(0.22), LvKit.glow('#ffc070', 2.4), x, 2.95, z);
    K.deco(
      new THREE.SphereGeometry(0.7, 10, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff9a50').multiplyScalar(0.45),
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      x,
      2.95,
      z,
    );
    return l;
  };

  const bench = (x, z, yaw) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.7), woodM);
    seat.position.y = 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.1), woodM);
    back.position.set(0, 0.85, -0.32);
    [-1.3, 1.3].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.6), woodM);
      leg.position.set(lx, 0.24, 0);
      g.add(leg);
    });
    g.add(seat, back);
    g.position.copy(P(x, 0, z));
    g.rotation.y = yaw;
    group.add(g);
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    K.collider(x, 0.25, z, along ? 0.8 : 3, 0.5, along ? 3 : 0.8, { tag: 'bench' });
    const b = { pos: P(x, 0, z), yaw, g };
    benches.push(b);
    return b;
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    const r = rng(1402);
    // banks
    K.solid(RW + 17.5, -0.5, LEN / 2, 35, 1, LEN + 8, grassM);
    K.solid(-RW - 17.5, -0.5, LEN / 2, 35, 1, LEN + 8, grassM);
    // paths (visual strip)
    K.deco(new THREE.PlaneGeometry(2.6, 64).rotateX(-Math.PI / 2), pathM, RW + 3, 0.02, 30);
    K.deco(new THREE.PlaneGeometry(2.6, 140).rotateX(-Math.PI / 2), pathM, -RW - 3, 0.02, 132);
    // river bed + water
    K.solid(0, -6.5, LEN / 2, RW * 2, 1, LEN + 8, stoneM);
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
        const st = K.deco(
          new THREE.DodecahedronGeometry(0.35 + r() * 0.25, 0),
          stoneM,
          s * (RW + 0.2),
          0.05,
          z,
        );
        st.rotation.set(r() * 3, r() * 3, r() * 3);
      }
    });
    const wallSeg = (x, z0, z1) =>
      K.collider(x, 1.5, (z0 + z1) / 2, 0.4, 3, z1 - z0, { tag: 'nocam' });
    wallSeg(RW + 0.2, -4, 56);
    wallSeg(RW + 0.2, 64, LEN + 4);
    wallSeg(-RW - 0.2, -4, 56);
    wallSeg(-RW - 0.2, 64, 121);
    wallSeg(-RW - 0.2, 129, LEN + 4);
    // ends
    K.collider(0, 4, -4.5, 90, 10, 1);
    for (let i = 0; i < 22; i++) {
      const rk = K.deco(
        new THREE.DodecahedronGeometry(1.6 + r() * 2.2, 0),
        stoneM,
        -40 + i * 3.8,
        0.6 + r() * 1.5,
        -5 - r() * 2,
      );
      rk.rotation.set(r() * 3, r() * 3, 0);
    }
    // east bank closed after the light bridge: a rock slide
    for (let i = 0; i < 14; i++) {
      const rk = K.deco(
        new THREE.DodecahedronGeometry(1.4 + r() * 1.8, 0),
        stoneM,
        RW + 2 + i * 2.4,
        1 + r(),
        66 + r() * 3,
      );
      rk.rotation.set(r() * 3, r() * 3, 0);
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
    [-1.3, 1.3].forEach((z) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(RW * 2 + 1.6, 0.05, 0.05),
        LvKit.glow('#ffcf8a', 2.2),
      );
      rail.position.set(0, 0.9, z);
      bridge.add(rail);
    });
    bridge.position.copy(P(0, -0.08, 60));
    group.add(bridge);
    bridgeB = Phys.box(O.x, O.y - 0.08, O.z + 60, RW * 2 + 1.6, 0.16, 2.6, { dyn: true });
    [-1, 1].forEach((s) =>
      K.deco(
        new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8),
        LvKit.glow('#ffcf8a', 1.2),
        s * (RW + 0.6),
        0.65,
        58.4,
      ),
    );
    // lantern stall
    const stallG = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.2, 2),
      new THREE.MeshStandardMaterial({ color: '#c8324f', roughness: 0.7, emissive: '#3a0a14' }),
    );
    top.position.y = 2.6;
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 1.2), woodM);
    table.position.y = 0.45;
    [-1.8, 1.8].forEach((x) => {
      const po = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), woodM);
      po.position.set(x, 1.3, 0.8);
      stallG.add(po);
    });
    stallG.add(top, table);
    stallG.position.copy(P(-RW - 7, 0, 108));
    stallG.rotation.y = Math.PI / 2;
    group.add(stallG);
    K.collider(-RW - 7, 0.45, 108, 1.2, 0.9, 3.4);
    [-0.8, 0.8].forEach((dz) => {
      const l = lantern();
      l.position.copy(P(-RW - 6.6, 1.25, 108 + dz));
      group.add(l);
      stall.push(l);
    });
    // pier
    K.solid(-RW + 1.8, -0.15, 125, 4, 0.3, 5, woodM);
    [-1, 1].forEach((s) =>
      K.deco(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), woodM, -RW + 3.6, -0.6, 125 + s * 2.2),
    );
    K.collider(-RW + 3.9, 1.5, 125, 0.3, 3, 5, { tag: 'nocam' });
    // stone bridge (decorative, back across the river near the end)
    K.solid(0, 0.1, 165, RW * 2 + 2, 0.4, 3, stoneM);
    [-1, 1].forEach((s) => K.solid(0, 0.75, 165 + s * 1.4, RW * 2 + 2, 0.9, 0.2, stoneM));
    // waterfall cliff
    K.solid(0, 10, LEN + 3, 90, 22, 6, stoneM);
    for (let i = 0; i < 16; i++) {
      const rk = K.deco(
        new THREE.DodecahedronGeometry(2 + r() * 3, 0),
        stoneM,
        (r() - 0.5) * 70,
        2 + r() * 16,
        LEN - 0.5 + r() * 2,
      );
      rk.rotation.set(r() * 3, r() * 3, 0);
    }
    fall = K.deco(new THREE.PlaneGeometry(9, 20, 1, 1), fallMat, 0, 9.4, LEN - 0.2);
    // pool at the end
    bench(-RW - 4, LEN - 14, Math.PI * 0.85);
    card = LvKit.card('2', '♥', true);
    card.position.copy(P(0, -0.6, LEN - 10));
    group.add(card);
    // trees, lamps, grass tufts
    for (let z = 4; z < LEN - 6; z += 7) {
      [-1, 1].forEach((s) => {
        if (r() < 0.75) tree(s * (RW + 9 + r() * 18), z + r() * 4, 0.9 + r() * 0.6, r);
      });
    }
    for (let z = 6; z < 60; z += 12) lampPost(RW + 4.6, z);
    for (let z = 66; z < LEN - 10; z += 12) lampPost(-RW - 4.6, z);
    // question signs
    CONFIG.balade.signs.forEach((txt, i) => {
      const z = [18, 44, 88, 140, 182][i];
      const x = z < 58 ? RW + 5.5 : -RW - 5.5;
      K.deco(new THREE.BoxGeometry(0.14, 1.6, 0.14), woodM, x, 0.8, z);
      const b = K.deco(
        new THREE.PlaneGeometry(1.6, 1),
        new THREE.MeshStandardMaterial({
          map: signTex(txt),
          roughness: 0.8,
          emissive: '#ffffff',
          emissiveMap: signTex(txt),
          emissiveIntensity: 0.25,
        }),
        x,
        1.75,
        z,
      );
      b.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      signs.push({ pos: P(x, 0, z), txt });
    });
    // lily pads with glowing flowers drifting on the river
    const pad = new THREE.MeshStandardMaterial({
      color: '#2a6a4a',
      roughness: 0.7,
      emissive: '#0a2a1a',
    });
    for (let i = 0; i < 40; i++) {
      const p = K.deco(
        new THREE.CircleGeometry(0.35 + r() * 0.3, 10).rotateX(-Math.PI / 2),
        pad,
        (r() - 0.5) * RW * 1.8,
        -0.58,
        r() * LEN,
      );
      if (r() < 0.5)
        K.deco(
          new THREE.OctahedronGeometry(0.1),
          LvKit.glow(r() < 0.5 ? '#ffb3d0' : '#fff2c8', 2.2),
          p.position.x - O.x,
          -0.45,
          p.position.z - O.z,
        );
    }
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
    nearCard: (q) => Math.hypot(q.x + RW + 1, q.z - (LEN - 10)) < 4.5,
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
      bridge.children.slice(1).forEach((c) => (c.visible = bridgeOn));
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
        card.position.x = O.x - RW - 1;
        card.rotation.y = t * 1.2;
      }
    },
  };
})();
