// L'Oracle (♣ R · Le Caveau). Replaces the 'oracle' type from foes.js with a bigger model:
// a crystal heart holding a piece of the Oui (the voyage heart galaxy inside), an eye above it,
// a golden aureole, three gyroscopic rings, a silk veil, orbiting shards and an aura of motes.
// e.st: 0 ritual (shielded) · 1 broken (vulnerable) · 2 last ritual. e.phase: 1..3.
(() => {
  const heartXY = (t) => {
    const s = Math.sin(t);
    return [
      16 * s * s * s,
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    ];
  };
  const heartShape = (k) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const [x, y] = heartXY((i / 96) * TAU);
      if (i === 0) sh.moveTo(x * k, y * k);
      else sh.lineTo(x * k, y * k);
    }
    return sh;
  };

  const gold = Tex.mat('metal', {
    color: '#e8c070',
    metal: 1,
    rough: 0.55,
    scale: 1.2,
    emissive: '#3a2406',
  });
  // fully metallic surfaces render black without an environment map: keep some diffuse + glow
  const darkGold = Tex.mat('metal', { color: '#b08848', metal: 0.6, rough: 0.6, scale: 1, emissive: '#1e1204' });
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

  // 1024² iris: fibres from the pupil to a dark limbal ring, teal and gold
  const irisTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    const C = 512;
    const bg = g.createRadialGradient(C, C, 60, C, C, 512);
    bg.addColorStop(0, '#fff2c8');
    bg.addColorStop(0.25, '#ffcf8a');
    bg.addColorStop(0.55, '#3cf0c0');
    bg.addColorStop(0.85, '#0c6a5a');
    bg.addColorStop(1, '#021a16');
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 1024);
    const r = rng(77);
    for (let i = 0; i < 2600; i++) {
      const a = r() * TAU;
      const r0 = 110 + r() * 40;
      const r1 = 300 + r() * 200;
      g.strokeStyle = `rgba(${r() < 0.5 ? '255,230,170' : '20,60,50'},${0.08 + r() * 0.25})`;
      g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0);
      const w = (r() - 0.5) * 0.15;
      g.quadraticCurveTo(
        C + Math.cos(a + w) * (r0 + r1) * 0.5,
        C + Math.sin(a + w) * (r0 + r1) * 0.5,
        C + Math.cos(a) * r1,
        C + Math.sin(a) * r1,
      );
      g.stroke();
    }
    // collarette ring
    g.strokeStyle = 'rgba(255,240,200,0.7)';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(C, C, 200, 0, TAU);
    g.stroke();
    // limbal ring
    const lim = g.createRadialGradient(C, C, 420, C, C, 512);
    lim.addColorStop(0, 'rgba(0,0,0,0)');
    lim.addColorStop(1, 'rgba(0,10,8,0.95)');
    g.fillStyle = lim;
    g.fillRect(0, 0, 1024, 1024);
    // pupil: a heart
    g.fillStyle = '#05060a';
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const [x, y] = heartXY((i / 64) * TAU);
      g[i ? 'lineTo' : 'moveTo'](C + x * 6.5, C - y * 6.5 - 10);
    }
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.ellipse(C - 120, C - 140, 46, 30, -0.5, 0, TAU);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  })();

  // suit plaques for the aureole
  const suitTex = (s, col) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.shadowColor = col;
    g.shadowBlur = 30;
    g.fillStyle = '#ffffff';
    Icons.draw(g, Icons.of(s), 128, 128, 190);
    g.shadowBlur = 0;
    g.fillStyle = col;
    Icons.draw(g, Icons.of(s), 128, 128, 170);
    return new THREE.CanvasTexture(c);
  };

  // the voyage heart galaxy, small, inside the crystal
  const galaxy = (n, k) => {
    const r = rng(19);
    const P = new Float32Array(n * 3);
    const Rr = new Float32Array(n * 4);
    const Rad = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = r() * TAU;
      const rad = r() < 0.46 ? 1 + (r() - 0.5) * 0.05 : Math.pow(r(), 0.55);
      const [x, y0] = heartXY(t);
      const y = y0 + 2.5;
      const ang = (1 - Math.min(rad, 1)) * 2.4;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      P.set(
        [(x * c - y * sn) * rad * k, (x * sn + y * c) * rad * k, (r() - 0.5) * 0.5 * (1.15 - Math.min(rad, 1))],
        i * 3,
      );
      Rr.set([r(), r(), r(), r()], i * 4);
      Rad[i] = Math.min(rad, 1.05);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(Rr, 4));
    g.setAttribute('aRad', new THREE.BufferAttribute(Rad, 1));
    const U = { uTime: { value: 0 }, uBeat: { value: 0 }, uRed: { value: 0 } };
    const pts = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `
          attribute vec4 aR;
          attribute float aRad;
          uniform float uTime, uBeat, uRed;
          varying vec3 vC;
          varying float vA;
          void main() {
            vec3 p = position * (1. + uBeat * .06);
            float sw = (1. - aRad) * sin(uTime * .5 + aR.y * 6.) * .1;
            p.xy = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xy;
            p += vec3(sin(uTime * .7 + aR.y * 40.), cos(uTime * .6 + aR.z * 40.), sin(uTime * .5 + aR.w * 40.)) * .03;
            vec4 mv = modelViewMatrix * vec4(p, 1.);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.2 + aR.z * 2.6 + (1. - aRad) * 1.6) * (40. / -mv.z) * (1. + uBeat * .5);
            vec3 c = mix(vec3(1.45, 1.22, .95), vec3(1.35, .32, .62), smoothstep(.0, .62, aRad));
            c = mix(c, vec3(.75, .35, 1.35), smoothstep(.75, 1., aRad) * aR.y);
            c = mix(c, vec3(.55, .75, 1.45), step(.93, aR.z));
            c = mix(c, vec3(1.6, .25, .3), uRed * .6);
            vC = c;
            vA = .55 + .45 * sin(uTime * 2. + aR.x * 50.);
          }
        `,
        fragmentShader: `
          varying vec3 vC;
          varying float vA;
          void main() {
            vec2 c = gl_PointCoord - .5;
            float d = length(c);
            if (d > .5) discard;
            float a = pow(1. - d * 2., 2.) + smoothstep(.12, 0., d) * .6;
            gl_FragColor = vec4(vC * a * vA, a * vA);
          }
        `,
      }),
    );
    pts.frustumCulled = false;
    return { pts, U };
  };

  const glowSprite = (inner, mid, size) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, inner);
    gr.addColorStop(0.3, mid);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    s.scale.setScalar(size);
    return s;
  };

  // silk veil: ribbons hanging under the heart, waving; uOpen spreads them apart
  const veilMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uRed: { value: 0 } },
    vertexShader: `
      attribute float aPh;
      uniform float uTime, uOpen;
      varying float vD;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        float d = 1. - uv.y;
        vD = d;
        vec3 p = position;
        p.z += sin(d * 5. + uTime * 1.6 + aPh) * .45 * d + d * d * uOpen * 3.;
        p.x += sin(d * 3. + uTime * 1.1 + aPh * 2.) * .25 * d;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }
    `,
    fragmentShader: `
      uniform float uTime, uRed;
      varying float vD;
      varying vec2 vUv;
      void main() {
        float edge = smoothstep(.0, .08, vUv.x) * smoothstep(1., .92, vUv.x);
        float rim = 1. - edge;
        float silk = .75 + .25 * sin(vUv.x * 40. + vD * 6.);
        vec3 c = mix(vec3(.85, 1.15, 1.05), vec3(.25, .9, .75), vD) * silk;
        c = mix(c, vec3(1.3, .95, .45), rim * .9);
        c = mix(c, vec3(1.3, .25, .3), uRed * .5);
        float a = (1. - smoothstep(.55, 1., vD)) * (.38 + rim * .5) * (.85 + .15 * sin(uTime * 3. + vD * 9.));
        gl_FragColor = vec4(c, a);
      }
    `,
  });

  const shieldMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uHit: { value: 0 } },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main() {
        vP = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime, uHit;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main() {
        float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.5);
        vec3 q = vP * 1.4;
        float hex = abs(sin(q.x + uTime * .3) * sin(q.y * 1.15) * sin(q.z - uTime * .2));
        float line = smoothstep(.06, 0., hex);
        float scan = smoothstep(.0, .2, sin(vP.y * 2. - uTime * 3.)) * .15;
        vec3 c = vec3(.25, .95, .78) * (f * 1.2 + line * .35 + scan) + vec3(1., .5, .7) * uHit * f;
        gl_FragColor = vec4(c, f * .9 + line * .2);
      }
    `,
  });

  const model = () => {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    // ---- crystal heart (weak point) ----
    const heart = new THREE.Group();
    const hk = 0.085;
    const hgeo = new THREE.ExtrudeGeometry(heartShape(hk), {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.3,
      bevelSegments: 6,
      curveSegments: 48,
    }).center();
    const crystal = new THREE.Mesh(
      hgeo,
      new THREE.MeshPhysicalMaterial({
        color: '#ff7aa8',
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.42,
        emissive: '#ff2a6a',
        emissiveIntensity: 0.35,
        depthWrite: false,
      }),
    );
    const gal = galaxy(7000, 0.07);
    gal.pts.position.y = -0.12;
    const coreGlow = glowSprite('rgba(255,225,240,1)', 'rgba(255,90,150,.4)', 3.2);
    heart.add(gal.pts, crystal, coreGlow);
    // gold filigree frame around the heart
    const frameCurve = new THREE.CatmullRomCurve3(
      Array.from({ length: 64 }, (_, i) => {
        const [x, y] = heartXY((i / 64) * TAU);
        return V3(x * hk * 1.18, y * hk * 1.18 + 0.1, 0);
      }),
      true,
    );
    const frame = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 160, 0.06, 8, true), gold);
    heart.add(frame);
    body.add(heart);
    // ---- the eye, above the heart ----
    const eyeG = new THREE.Group();
    eyeG.position.set(0, 3.1, 0.2);
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 48, 32),
      new THREE.MeshPhysicalMaterial({ color: '#f4f0ea', roughness: 0.25, clearcoat: 1, emissive: '#2a3030', emissiveIntensity: 0.4 }),
    );
    const iris = new THREE.Mesh(
      new THREE.CircleGeometry(0.66, 64),
      new THREE.MeshStandardMaterial({ map: irisTex, emissive: '#ffffff', emissiveMap: irisTex, emissiveIntensity: 0.8, roughness: 0.4 }),
    );
    iris.position.z = 0.96;
    const cornea = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 32, 16, 0, TAU, 0, Math.PI * 0.32),
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0, clearcoat: 1, depthWrite: false }),
    );
    cornea.rotation.x = Math.PI / 2;
    cornea.position.z = 0.42;
    const lidT = new THREE.Mesh(new THREE.SphereGeometry(1.24, 48, 24, 0, TAU, 0, Math.PI * 0.5), gold);
    const lidB = new THREE.Mesh(new THREE.SphereGeometry(1.24, 48, 24, 0, TAU, Math.PI * 0.5, Math.PI * 0.5), gold);
    const lidRim = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.08, 10, 64), glow('#ffcf8a', 1.6));
    eyeG.add(sclera, iris, cornea, lidT, lidB, lidRim);
    body.add(eyeG);
    // ---- aureole behind ----
    const aureole = new THREE.Group();
    aureole.position.set(0, 1.6, -1.4);
    aureole.add(new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 12, 128), gold));
    aureole.add(new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.05, 8, 128), glow('#ffcf8a', 1.8)));
    aureole.add(new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.04, 8, 128), glow('#3cf0c0', 1.6)));
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU;
      const long = i % 2 === 0;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(long ? 0.12 : 0.08, long ? 2.2 : 1.2, 6), long ? gold : darkGold);
      const rr = 4.6 + (long ? 1.1 : 0.6);
      sp.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0);
      sp.rotation.z = a - Math.PI / 2;
      aureole.add(sp);
    }
    ['♥', '♣', '♦', '♠'].forEach((s, i) => {
      const red = s === '♥' || s === '♦';
      const pl = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 1.3),
        new THREE.MeshBasicMaterial({
          map: suitTex(s, red ? '#ff2a48' : '#101014'),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      const a = (i / 4) * TAU + Math.PI / 4;
      pl.position.set(Math.cos(a) * 3.9, Math.sin(a) * 3.9, 0.1);
      aureole.add(pl);
    });
    body.add(aureole);
    // ---- three gyroscopic rings with gold plates and teal inlay ----
    const rings = [3.0, 3.8, 4.6].map((r, i) => {
      const ring = new THREE.Group();
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 12, 160), i === 1 ? darkGold : gold));
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 160), glow(i === 1 ? '#ffcf8a' : '#3cf0c0', 2)));
      const n = 8 + i * 4;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), gold);
        pl.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        pl.rotation.z = a;
        ring.add(pl);
        if (k % 2 === 0) {
          const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), glow(k % 4 ? '#3cf0c0' : '#ff5f8a', 2.4));
          gem.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.2);
          ring.add(gem);
        }
      }
      body.add(ring);
      return ring;
    });
    // ---- veil ----
    const veil = new THREE.Group();
    veil.position.y = -1.6;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 10, 64).rotateX(Math.PI / 2), gold);
    veil.add(collar);
    const NV = 16;
    for (let i = 0; i < NV; i++) {
      const a = (i / NV) * TAU;
      const geo = new THREE.PlaneGeometry(0.75, 7, 1, 32).translate(0, -3.5, 0);
      const ph = new Float32Array(geo.attributes.position.count).fill(i * 1.7);
      geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
      const m = new THREE.Mesh(geo, veilMat);
      m.position.set(Math.sin(a) * 1.45, 0, Math.cos(a) * 1.45);
      m.rotation.y = a;
      veil.add(m);
    }
    body.add(veil);
    // ---- orbiting crystal shards ----
    const shardMat = new THREE.MeshPhysicalMaterial({
      color: '#9af8e0',
      roughness: 0.05,
      metalness: 0.2,
      clearcoat: 1,
      transparent: true,
      opacity: 0.75,
      emissive: '#1a8a6a',
      emissiveIntensity: 0.6,
    });
    const shards = [];
    for (let k = 0; k < 12; k++) {
      const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), shardMat);
      sh.scale.set(0.6, 2.2, 0.6);
      body.add(sh);
      shards.push(sh);
    }
    // ---- aura motes ----
    const NA = 1600;
    const ap = new Float32Array(NA * 3);
    const ar = new Float32Array(NA * 2);
    const r = rng(5);
    for (let i = 0; i < NA; i++) {
      ap.set([r() * TAU, 3 + r() * 6, (r() - 0.5) * 10], i * 3);
      ar.set([r(), r()], i * 2);
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    ag.setAttribute('aR', new THREE.BufferAttribute(ar, 2));
    const auraU = { uTime: { value: 0 }, uOpen: { value: 0 }, uRed: { value: 0 } };
    const aura = new THREE.Points(
      ag,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: auraU,
        vertexShader: `
          attribute vec2 aR;
          uniform float uTime, uOpen;
          varying vec3 vC;
          varying float vA;
          void main() {
            float a = position.x + uTime * (.15 + aR.x * .25);
            float rr = position.y * (1. + uOpen * .5);
            vec3 p = vec3(cos(a) * rr, position.z + sin(uTime * .6 + aR.y * 20.) * .6, sin(a) * rr);
            vec4 mv = modelViewMatrix * vec4(p, 1.);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (0.8 + aR.y * 1.6) * (70. / -mv.z);
            vC = mix(vec3(1.3, .9, .5), vec3(.3, 1.2, .95), aR.x);
            vC = mix(vC, vec3(1.4, .35, .65), step(.8, aR.y));
            vA = (.5 + .5 * sin(uTime * 2.5 + aR.x * 40.)) * .7;
          }
        `,
        fragmentShader: `
          uniform float uRed;
          varying vec3 vC;
          varying float vA;
          void main() {
            vec2 c = gl_PointCoord - .5;
            float d = length(c);
            if (d > .5) discard;
            float a = pow(1. - d * 2., 2.);
            gl_FragColor = vec4(mix(vC, vec3(1.5, .3, .3), uRed * .6) * a * vA, a * vA);
          }
        `,
      }),
    );
    aura.frustumCulled = false;
    body.add(aura);
    // ---- shield ----
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.8, 64, 40), shieldMat);
    body.add(dome);
    const halo = glowSprite('rgba(255,240,220,.3)', 'rgba(60,240,190,.1)', 16);
    halo.position.y = 1;
    body.add(halo);
    const light = new THREE.PointLight('#7cf0c8', 1.6, 28, 2);
    light.position.set(0, 1, 3);
    g.add(light);
    return {
      g,
      body,
      eye: null,
      heart,
      crystal,
      gal,
      coreGlow,
      eyeG,
      iris,
      lidT,
      lidB,
      aureole,
      rings,
      veil,
      shards,
      aura,
      auraU,
      dome,
      halo,
      light,
      bodyScale: 1,
      open: 0,
    };
  };

  Enemies.define('oracle', {
    stats: {
      hp: 2400,
      speed: 0,
      radius: 3,
      hitR: 3.8,
      height: 0,
      boss: true,
      reach: 6.5,
      stunP: 0,
      weakR: 1.3,
    },
    model,
    sim(e, dt, players, targets) {
      e.vuln = e.st === 1;
      const hy = e.home.y + (e.st === 1 ? 5.2 : 9);
      e.pos.y = damp(e.pos.y, hy, 1.6, dt);
      const tgt = targets.find((p) => p.who === 'dame') || targets[0];
      if (tgt)
        e.yaw = angleDamp(e.yaw, Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z), 1.5, dt);
      if (e.st === 1 || !targets.length || e.atk > 0) return;
      const ph = e.phase || 1;
      const p = targets[(Math.random() * targets.length) | 0];
      const from = e.pos.clone().add(V3(0, -0.3, 0));
      if (ph === 1) {
        e.atk = 3.2;
        [-0.18, 0, 0.18].forEach((a) => Enemies.fire(from, p.pos.clone().add(V3(a * 10, 1.1, 0)), 11, 10));
      } else if (ph === 2) {
        e.atk = 2.9;
        [-0.3, -0.15, 0, 0.15, 0.3].forEach((a) =>
          Enemies.fire(from, p.pos.clone().add(V3(a * 10, 1.1, a * 4)), 11, 9),
        );
      } else {
        // last phase: a ring of orbs falling outward, plus one aimed shot
        e.atk = 2.6;
        e.spin = (e.spin || 0) + 0.4;
        for (let k = 0; k < 10; k++) {
          const a = e.spin + (k / 10) * TAU;
          Enemies.fire(from, V3(e.home.x + Math.cos(a) * 20, e.home.y + 1.1, e.home.z + Math.sin(a) * 20), 9, 9);
        }
        Enemies.fire(from, p.pos.clone().add(V3(0, 1.1, 0)), 13, 10);
      }
    },
    mult: (e, weak) => (e.st === 1 ? (weak ? 2 : 1) : 0),
    render(e, m, dt, t) {
      const open = e.st === 1 ? 1 : 0;
      const ph = e.phase || 1;
      const red = ph === 3 || e.st === 2 ? 1 : 0;
      m.open = damp(m.open, open, 3, dt);
      const o = m.open;
      const beat = Math.pow(Math.max(0, Math.sin(t * (open ? 7 : 3.2))), 6);
      m.gal.U.uTime.value = t;
      m.gal.U.uBeat.value = beat * (0.4 + o * 0.6);
      m.gal.U.uRed.value = damp(m.gal.U.uRed.value, red, 2, dt);
      m.heart.scale.setScalar(1 + beat * 0.06 + o * 0.25);
      m.heart.rotation.y = Math.sin(t * 0.6) * 0.25;
      m.crystal.material.emissiveIntensity = 0.3 + o * 0.9 + beat * 0.5;
      m.coreGlow.material.opacity = 0.35 + o * 0.3 + beat * 0.2;
      m.veil.scale.y = 1 - o * 0.45;
      // lids open in the vulnerable phase; the eye looks around otherwise
      m.lidT.rotation.x = damp(m.lidT.rotation.x, open ? -1.0 : -0.25, 4, dt);
      m.lidB.rotation.x = damp(m.lidB.rotation.x, open ? 0.8 : 0.2, 4, dt);
      m.eyeG.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - o);
      m.eyeG.rotation.x = Math.sin(t * 0.5) * 0.12;
      m.iris.material.emissive.set(red ? '#ff6a6a' : '#ffffff');
      m.iris.material.emissiveIntensity = open ? 1.4 + Math.sin(t * 8) * 0.3 : 0.7;
      m.aureole.rotation.z = t * (0.08 + o * 0.15);
      m.aureole.scale.setScalar(1 + o * 0.12);
      m.rings.forEach((r, i) => {
        const sp = (0.3 + i * 0.17) * (1 - o * 0.7) * (ph >= 2 ? 1.6 : 1);
        r.rotation.x = t * sp * (i % 2 ? -1 : 1) + i;
        r.rotation.y = t * (0.21 + i * 0.11) * (1 - o * 0.6);
        r.scale.setScalar(1 + o * (0.08 + i * 0.04));
      });
      veilMat.uniforms.uTime.value = t;
      veilMat.uniforms.uOpen.value = o;
      veilMat.uniforms.uRed.value = red;
      m.shards.forEach((s, k) => {
        const a = (k / 12) * TAU + t * (0.5 + (ph - 1) * 0.25);
        const rr = 6.2 + o * 1.5 + Math.sin(t + k) * 0.3;
        s.position.set(Math.cos(a) * rr, Math.sin(t * 1.3 + k) * 1.2 - 0.5, Math.sin(a) * rr);
        s.rotation.set(t * 0.8 + k, t + k, 0);
      });
      m.auraU.uTime.value = t;
      m.auraU.uOpen.value = o;
      m.auraU.uRed.value = red;
      m.dome.visible = o < 0.5;
      m.dome.scale.setScalar(1 + Math.sin(t * 2) * 0.015);
      shieldMat.uniforms.uTime.value = t;
      shieldMat.uniforms.uHit.value = Math.max(0, (e.hitT || 0) * 6);
      m.light.color.set(red ? '#ff5a6a' : open ? '#ffcf8a' : '#7cf0c8');
      m.light.intensity = 1 + beat * 0.6 + o * 0.4;
    },
  });
})();
