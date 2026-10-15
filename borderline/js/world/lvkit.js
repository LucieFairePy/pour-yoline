// Small shared toolkit for the épreuve worlds.
const LvKit = (() => {
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

  // drawn in a w x h space, stored with the long side at 1080 px or more
  const tex = (w, h, draw, rx = 1, ry = 1) => {
    const k = Math.max(1, Math.min(8, Math.ceil(1080 / Math.max(w, h))));
    const c = document.createElement('canvas');
    c.width = w * k;
    c.height = h * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 16;
    return t;
  };

  const grain = (g, w, h, base, amt, n = 9000) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const v = Math.random();
      g.fillStyle =
        v > 0.5 ? `rgba(255,255,255,${amt * Math.random()})` : `rgba(0,0,0,${amt * Math.random()})`;
      const s = 1 + Math.random() * 2.5;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  };

  const cardTex = (rank, suit, red) =>
    tex(256, 360, (g) => {
      g.fillStyle = '#fff8f0';
      g.fillRect(0, 0, 256, 360);
      g.strokeStyle = red ? '#d8324f' : '#1a1424';
      g.lineWidth = 6;
      g.strokeRect(10, 10, 236, 340);
      g.fillStyle = red ? '#d8324f' : '#1a1424';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '160px Georgia';
      Icons.fillText(g, suit, 128, 190);
      g.font = 'bold 44px Georgia';
      Icons.fillText(g, rank, 36, 44);
      g.save();
      g.translate(220, 316);
      g.rotate(Math.PI);
      Icons.fillText(g, rank, 0, 0);
      g.restore();
    });

  const card = (rank, suit, red) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({
        map: Tex.card(rank, suit),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    // well under the bloom threshold (0.9): the face stays readable instead of a white glow
    m.material.color.setScalar(0.8);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.5, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(red ? '#ff5f8a' : '#ffcf8a').multiplyScalar(1.6),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    m.add(halo);
    m.visible = false;
    return m;
  };

  // A world builder anchored at origin O, adding meshes to group and colliders to Phys.
  const builder = (O, group) => {
    const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
    const geoCache = new Map();
    const box = (sx, sy, sz) => {
      const k = sx + ',' + sy + ',' + sz;
      if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(sx, sy, sz));
      return geoCache.get(k);
    };
    return {
      P,
      solid(x, y, z, sx, sy, sz, mat, opt) {
        const m = new THREE.Mesh(box(sx, sy, sz), mat);
        m.position.copy(P(x, y, z));
        group.add(m);
        const b = Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
        return { m, b };
      },
      collider(x, y, z, sx, sy, sz, opt) {
        return Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
      },
      deco(geo, mat, x, y, z) {
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(P(x, y, z));
        group.add(m);
        return m;
      },
      rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    };
  };

  // an épreuve's own card, from the plan (js/game/trials.js; read when the world is built)
  const trialCard = (trialId, red) => {
    const [rank, suit] = Cards.label(Cards.cardOf(trialId)).split(' ');
    return card(rank, suit, red);
  };

  const light = (group, pos, color, intensity, distance) => {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.copy(pos);
    group.add(l);
    return l;
  };

  // ---------- set dressing ----------
  // Static props merged into one mesh per material: add(geo, position, rotation, scale), then
  // mesh(mat). Positions are world coordinates (pass them through the builder's P()).
  const batch = () => {
    const parts = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    return {
      add(geo, pos, rot, scl) {
        e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
        q.setFromEuler(e);
        m4.compose(pos, q, scl ? (scl.isVector3 ? scl : V3(scl[0], scl[1], scl[2])) : one);
        const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m4);
        parts.push(g);
        return this;
      },
      get size() {
        return parts.length;
      },
      mesh(mat) {
        let n = 0;
        parts.forEach((g) => (n += g.attributes.position.count));
        const pos = new Float32Array(n * 3);
        const nor = new Float32Array(n * 3);
        const uv = new Float32Array(n * 2);
        let o = 0;
        parts.forEach((g) => {
          pos.set(g.attributes.position.array, o * 3);
          if (!g.attributes.normal) g.computeVertexNormals();
          nor.set(g.attributes.normal.array, o * 3);
          if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
          o += g.attributes.position.count;
          g.dispose();
        });
        parts.length = 0;
        const out = new THREE.BufferGeometry();
        out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        out.computeBoundingSphere();
        return new THREE.Mesh(out, mat);
      },
    };
  };

  // A sky of the level's own, inside the global one (which still shows its heart through the
  // top): horizon and zenith colours, slow fbm clouds, optional stars. o: { hor, zen, cloud,
  // cloudK, stars, glow (a warm/cold patch low on the horizon), glowDir }.
  const sky = (o) => {
    const U = {
      uTime: { value: 0 },
      uHor: { value: new THREE.Color(o.hor) },
      uZen: { value: new THREE.Color(o.zen) },
      uCloud: { value: new THREE.Color(o.cloud || o.hor) },
      uCK: { value: o.cloudK != null ? o.cloudK : 0.5 },
      uStars: { value: o.stars || 0 },
      uGlow: { value: new THREE.Color(o.glow || '#000000') },
      uGDir: { value: (o.glowDir || V3(0, 0, 1)).clone().normalize() },
    };
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(760, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: U,
        vertexShader: `
          varying vec3 vD;
          void main() {
            vD = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uTime, uCK, uStars;
          uniform vec3 uHor, uZen, uCloud, uGlow, uGDir;
          varying vec3 vD;
          float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
          }
          float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.07; a *= 0.5; } return s; }
          void main() {
            vec3 d = normalize(vD);
            float y = d.y;
            vec3 col = mix(uHor, uZen, smoothstep(-0.02, 0.6, y));
            vec2 uv = d.xz / (abs(y) + 0.22) * 1.6 + vec2(uTime * 0.006, uTime * 0.003);
            float cl = fbm(uv) * 0.65 + fbm(uv * 2.6 + 7.0) * 0.35;
            float ck = smoothstep(0.42, 0.78, cl) * smoothstep(0.85, 0.08, y) * uCK;
            col = mix(col, uCloud * (0.7 + 0.5 * cl), ck);
            float g = max(dot(d, uGDir), 0.0);
            col += uGlow * pow(g, 6.0) * smoothstep(0.5, -0.05, y);
            vec3 c = floor(d * 300.0);
            float s = fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            col += vec3(1.0, 0.95, 0.9) * step(0.9965, s) * uStars * smoothstep(0.08, 0.4, y) * (1.0 - ck)
              * (0.6 + 0.4 * sin(uTime * (1.0 + s * 3.0) + s * 50.0));
            // thinner toward the zenith, where the global sky's heart shows through
            gl_FragColor = vec4(col, mix(1.0, 0.82, smoothstep(0.55, 0.95, y)));
          }`,
      }),
    );
    m.renderOrder = -2;
    m.frustumCulled = false;
    m.visible = false;
    m.userData.noCull = true;
    m.userData.tick = (t) => {
      U.uTime.value = t;
      m.position.copy(R.camera.position);
    };
    R.scene.add(m);
    return m;
  };

  // Drifting particles in a box that follows the camera (dust, embers, ash, snow): one draw
  // call. o: { n, size, colors: [a, b], rise: [min, max] m/s (negative falls), sway, box: [w, h],
  // alpha, below (how far the box starts under the camera) }.
  const motes = (o) => {
    const N = o.n || 600;
    const W = (o.box && o.box[0]) || 50;
    const H = (o.box && o.box[1]) || 18;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    const a = new Float32Array(N * 2);
    const r = rng(o.seed || 9);
    for (let i = 0; i < N; i++) {
      p.set([r() * W - W / 2, r() * H, r() * W - W / 2], i * 3);
      a.set([r(), r()], i * 2);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(a, 2));
    const rise = o.rise || [-0.1, 0.1];
    const U = {
      uTime: { value: 0 },
      uCam: { value: V3() },
      uPx: { value: 1 },
      uK: { value: 1 },
      uA: { value: new THREE.Color(o.colors ? o.colors[0] : '#ffffff') },
      uB: { value: new THREE.Color(o.colors ? o.colors[1] || o.colors[0] : '#ffffff') },
    };
    const f = (v) => (Number.isInteger(v) ? v + '.0' : String(v));
    const pts = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `
          uniform float uTime, uPx; uniform vec3 uCam;
          attribute vec2 aR; varying float vA; varying float vC;
          void main() {
            vec3 p = position;
            float sp = mix(${f(rise[0])}, ${f(rise[1])}, aR.x);
            p.y = mod(p.y + uTime * sp, ${f(H)});
            float sw = ${f(o.sway != null ? o.sway : 0.8)};
            p.x += sin(uTime * (0.3 + aR.y * 0.6) + aR.x * 40.0) * sw;
            p.z += cos(uTime * (0.25 + aR.x * 0.5) + aR.y * 30.0) * sw;
            vec3 w = vec3(uCam.x + mod(p.x - uCam.x + ${f(W / 2)}, ${f(W)}) - ${f(W / 2)},
              uCam.y - ${f(o.below != null ? o.below : 4)} + p.y,
              uCam.z + mod(p.z - uCam.z + ${f(W / 2)}, ${f(W)}) - ${f(W / 2)});
            vec4 mv = viewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = ${f(o.size || 2)} * (0.6 + aR.y * 0.8) * uPx * (12.0 / max(-mv.z, 0.5));
            float edge = smoothstep(0.0, 2.0, p.y) * smoothstep(${f(H)}, ${f(H - 2)}, p.y);
            vA = ${f(o.alpha || 0.5)} * edge * (0.55 + 0.45 * sin(uTime * (1.0 + aR.y * 3.0) + aR.x * 70.0));
            vC = aR.y;
          }`,
        fragmentShader: `
          uniform float uK; uniform vec3 uA, uB; varying float vA; varying float vC;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * vA * uK;
            gl_FragColor = vec4(mix(uA, uB, step(0.5, vC)) * a, a);
          }`,
      }),
    );
    pts.frustumCulled = false;
    pts.visible = false;
    pts.userData.noCull = true;
    pts.userData.U = U;
    pts.userData.tick = (t) => {
      U.uTime.value = t;
      U.uCam.value.copy(R.camera.position);
      U.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    };
    R.scene.add(pts);
    return pts;
  };

  // A level's own light while it is played: sky/ground light, sun, a haze colour that wins over
  // the city's fog at render time (keep the Color to change it later), exposure, and extras
  // (sky, motes) shown only meanwhile. mood(null) puts everything back.
  let saved = null;
  let extras = [];
  const mood = (o) => {
    if (saved) {
      R.hemi.intensity = saved.hi;
      R.hemi.color.setHex(saved.hc);
      R.hemi.groundColor.setHex(saved.hg);
      R.moon.intensity = saved.mi;
      R.moon.color.setHex(saved.mc);
      R.moon.position.copy(saved.mp);
      R.renderer.toneMappingExposure = saved.ex;
      R.scene.onBeforeRender = saved.br;
      extras.forEach((e) => (e.visible = false));
      saved = null;
      extras = [];
    }
    if (!o) return;
    saved = {
      hi: R.hemi.intensity,
      hc: R.hemi.color.getHex(),
      hg: R.hemi.groundColor.getHex(),
      mi: R.moon.intensity,
      mc: R.moon.color.getHex(),
      mp: R.moon.position.clone(),
      ex: R.renderer.toneMappingExposure,
      br: R.scene.onBeforeRender,
    };
    if (o.sky) R.hemi.color.set(o.sky);
    if (o.ground) R.hemi.groundColor.set(o.ground);
    if (o.hemi != null) R.hemi.intensity = o.hemi;
    if (o.sun) R.moon.color.set(o.sun);
    if (o.sunI != null) R.moon.intensity = o.sunI;
    if (o.sunPos) R.moon.position.copy(o.sunPos);
    if (o.exposure) R.renderer.toneMappingExposure = o.exposure;
    if (o.haze) {
      const hz = o.haze;
      R.scene.onBeforeRender = () => {
        R.scene.fog.color.copy(hz);
        R.scene.background.copy(hz);
      };
    }
    extras = (o.extras || []).filter(Boolean);
    extras.forEach((e) => (e.visible = true));
  };
  // advance the extras' clocks (call from the world's update)
  const tick = (t) => extras.forEach((e) => e.userData.tick && e.userData.tick(t));

  return { glow, tex, grain, card, trialCard, builder, light, batch, sky, motes, mood, tick };
})();
