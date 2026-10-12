const Intro = (() => {
  const DUR = 140;
  const FPS_SIM = 120;
  const T = CONFIG.intro;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const pulse = (t, a, b, f = 0.3) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));
  const lerpV = (a, b, k) => a.clone().lerp(b, k);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  const cam = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 6000);
  const amb = new THREE.AmbientLight('#6a5a8a', 0.28);
  const key = new THREE.DirectionalLight('#ffe2d0', 1.15);
  const rim = new THREE.DirectionalLight('#ff6a96', 1.0);
  scene.add(amb, key, rim, key.target, rim.target);

  const neb = CineKit.nebula();
  scene.add(neb.mesh);
  const heart = CineKit.heart(16000, 2.2);
  scene.add(heart);
  const bh = CineKit.blackHole();
  scene.add(bh.group);
  const glare = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fff6ee').multiplyScalar(5),
      toneMapped: false,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  scene.add(glare);
  const warp = CineKit.warp(2400);
  cam.add(warp.mesh);
  scene.add(cam);
  const ship = CineKit.ship();
  scene.add(ship.group);
  const planet = CineKit.planet();
  scene.add(planet.group);
  const cards = CineKit.cards();
  scene.add(cards.group);
  cards.mat.color.setScalar(0.75);
  const hearts = [CineKit.glowHeart(), CineKit.glowHeart(), CineKit.glowHeart()];
  hearts.forEach((h) => {
    h.material.color.set('#ff6a96').multiplyScalar(1.7);
    scene.add(h);
  });
  const cloud = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12),
    new THREE.MeshBasicMaterial({
      color: '#cfc6e0',
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  );
  cloud.renderOrder = 50;
  cam.add(cloud);
  cloud.scale.setScalar(0.5);

  const rockMat = new THREE.MeshStandardMaterial({
    color: '#3a3034',
    roughness: 0.95,
    metalness: 0.04,
  });
  rockMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rimL = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
      totalEmissiveRadiance += vec3(0.3, 0.1, 0.26) * rimL * 0.22;`,
    );
  };

  const mkRig = (fem) =>
    HQRig.build(
      fem
        ? {
            suit: HQ.sequinMat(0x006a3a, { rough: 0.55, metal: 0.12 }),
            feminine: true,
            name: 'Yoline',
          }
        : {
            suit: HQ.sequinMat(0x1d2d6e, { glint: 0.55 }),
            feminine: false,
            name: 'Moi',
            accent: '#2a3f9e',
            accentDark: '#1b2a6b',
          },
    );
  const D = mkRig(true);
  const V = mkRig(false);
  [D, V].forEach((r) => {
    r.g.scale.setScalar(0.92);
    scene.add(r.g);
  });

  const SIM = (() => {
    const dt = 1 / FPS_SIM;
    const N = Math.ceil(64 * FPS_SIM);
    const BH = V3(9, 2.5, -62);
    const startQ = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
    const bodies = [
      { p: V3(), v: V3(), q: startQ(), w: V3() },
      { p: V3(), v: V3(), q: startQ(), w: V3() },
    ];
    const rec = [[], []];
    const rocks = [];
    const bumps = [];
    const r = rng(42);
    const qtmp = new THREE.Quaternion();
    const integrate = (b, a, alpha) => {
      b.v.addScaledVector(a, dt);
      b.p.addScaledVector(b.v, dt);
      b.w.addScaledVector(alpha, dt);
      const wl = b.w.length();
      if (wl > 1e-6) {
        qtmp.setFromAxisAngle(b.w.clone().divideScalar(wl), wl * dt);
        b.q.premultiply(qtmp).normalize();
      }
    };
    const run = (withRocks) => {
      bodies[0].p.set(-0.48, 0, 0);
      bodies[1].p.set(0.48, 0, 0);
      bodies.forEach((b) => {
        b.v.set(0, 0, -0.35);
        b.q.copy(startQ());
        b.w.set(0, 0, 0);
      });
      rec[0] = [];
      rec[1] = [];
      let ejected = false;
      let hit = false;
      for (let i = 0; i <= N; i++) {
        const t = i * dt;
        const [A, B] = bodies;
        const acc = [V3(), V3()];
        const ang = [V3(), V3()];
        const hold = (t < 28.6 || (t > 48.6 && t < 61.4)) && A.p.distanceTo(B.p) < 2.2;
        if (hold) {
          const d = V3().subVectors(B.p, A.p);
          const L = d.length();
          const n = d.clone().divideScalar(L || 1);
          const f = (L - 0.95) * 7;
          const rel = V3().subVectors(B.v, A.v).dot(n) * 3;
          acc[0].addScaledVector(n, f + rel);
          acc[1].addScaledVector(n, -(f + rel));
          const wd = V3().subVectors(B.w, A.w).multiplyScalar(1.5);
          ang[0].add(wd);
          ang[1].sub(wd);
        }
        if (t > 13.5 && t < 22.6) {
          const k = seg(t, 13.5, 22.4);
          bodies.forEach((b, j) => {
            const to = V3().subVectors(BH, b.p).normalize();
            const s = 0.4 + k * k * 34;
            acc[j].addScaledVector(to, s);
            acc[j].add(
              V3()
                .crossVectors(to, V3(0, 1, 0))
                .multiplyScalar(s * 0.25 * (1 - k)),
            );
            ang[j].add(V3(0.4 + j * 0.3, 0.2, 0.6 - j * 0.2).multiplyScalar(k * 1.4));
          });
        }
        if (t > 22.6 && t < 28.5) {
          bodies.forEach((b, j) => {
            const sp = b.v.length();
            const fwd = b.v.clone().normalize();
            acc[j].addScaledVector(fwd, (24 - sp) * 0.8);
            ang[j].add(V3(Math.sin(t * 2 + j), Math.cos(t * 1.7 + j), 0.3).multiplyScalar(0.6));
          });
        }
        if (!ejected && t >= 28.5) {
          ejected = true;
          const fwd = A.v.clone().normalize();
          const side = V3()
            .crossVectors(fwd, V3(0, 1, 0))
            .normalize();
          A.v
            .copy(fwd.clone().multiplyScalar(7))
            .addScaledVector(side, -0.45)
            .add(V3(0, 0.12, 0));
          B.v
            .copy(fwd.clone().multiplyScalar(7))
            .addScaledVector(side, 0.45)
            .add(V3(0, -0.08, 0));
          A.w.set(1.1, 0.6, 0.9);
          B.w.set(-0.8, 0.9, -1.2);
        }
        if (t > 30 && t < 61.4) {
          A.w.multiplyScalar(Math.exp(-(t > 47 ? 1.2 : 0.06) * dt));
          if (t > 37) B.w.multiplyScalar(Math.exp(-1.6 * dt));
          if (t > 38.5 && t < 48.6) {
            const to = V3().subVectors(A.p, B.p);
            const dist = to.length();
            to.normalize();
            const relV = V3().subVectors(B.v, A.v).dot(to);
            const want = clamp(dist * 0.35, 0, 1.4);
            acc[1].addScaledVector(to, (want - relV) * 1.8);
            const lateral = V3().subVectors(B.v, A.v).addScaledVector(to, -relV);
            acc[1].addScaledVector(lateral, -1.5);
          }
        }
        if (withRocks && t > 50 && t < 61.4) {
          bumps.forEach((bp) => {
            if (Math.abs(t - bp.t) < dt / 2) {
              bodies[bp.j].v.add(bp.dv);
              bodies[bp.j].w.add(bp.dw);
            }
          });
        }
        if (withRocks && !hit && t >= 61.4) {
          hit = true;
          A.v.add(V3(3.2, 1.4, 0.6));
          B.v.add(V3(4.1, 0.6, -0.4));
          A.w.add(V3(1.6, -2.2, 1.1));
          B.w.add(V3(-2.4, 1.3, 1.8));
        }
        if (t > 61.4) bodies.forEach((b) => b.w.multiplyScalar(Math.exp(-0.25 * dt)));
        const d = V3().subVectors(B.p, A.p);
        const L = d.length();
        if (L < 1.0 && L > 0) {
          const n = d.divideScalar(L);
          const push = (1.0 - L) * 30;
          acc[0].addScaledVector(n, -push);
          acc[1].addScaledVector(n, push);
          const rv = V3().subVectors(B.v, A.v).dot(n);
          if (rv < 0) {
            A.v.addScaledVector(n, rv * 0.5);
            B.v.addScaledVector(n, -rv * 0.5);
          }
        }
        integrate(A, acc[0], ang[0]);
        integrate(B, acc[1], ang[1]);
        bodies.forEach((b, j) => rec[j].push({ p: b.p.clone(), q: b.q.clone(), v: b.v.clone() }));
      }
    };
    run(false);
    const at = (j, t) => rec[j][clamp(Math.round(t * FPS_SIM), 0, rec[j].length - 1)];
    const com = (t) => at(0, t).p.clone().add(at(1, t).p).multiplyScalar(0.5);
    for (let i = 0; i < 46; i++) {
      const tt = 50 + r() * 11;
      const c = com(tt);
      const vel = at(0, tt).v.clone().normalize();
      const side = V3()
        .crossVectors(vel, V3(0, 1, 0))
        .normalize();
      const up = V3().crossVectors(side, vel).normalize();
      const off = 4 + r() * 13;
      const ang = r() * TAU;
      rocks.push({
        p: c
          .clone()
          .addScaledVector(side, Math.cos(ang) * off)
          .addScaledVector(up, Math.sin(ang) * off * 0.7),
        s: 0.25 + Math.pow(r(), 2.2) * 1.9,
        rot: V3(r() * 6, r() * 6, r() * 6),
        sp: V3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.3),
      });
    }
    for (let i = 0; i < 520; i++) {
      const tt = 44 + r() * 30;
      const c = com(Math.min(tt, 63));
      const off = 26 + Math.pow(r(), 0.8) * 170;
      const a = r() * TAU;
      const b2 = (r() - 0.5) * 2;
      rocks.push({
        p: c.clone().add(V3(Math.cos(a) * off, b2 * off * 0.5, Math.sin(a) * off)),
        s: 0.6 + Math.pow(r(), 2.6) * 10,
        rot: V3(r() * 6, r() * 6, r() * 6),
        sp: V3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.12),
      });
    }
    [
      [53.2, 1, V3(0.6, 0.4, 0), V3(0.8, 0, 0.4)],
      [55.8, 0, V3(-0.4, 0.5, 0.2), V3(0, 0.9, -0.5)],
      [58.4, 1, V3(0.2, -0.6, 0.1), V3(-0.6, 0.3, 0.7)],
    ].forEach(([tt, j, dv, dw]) => {
      bumps.push({ t: tt, j, dv, dw });
      const c = at(j, tt).p.clone();
      rocks.push({
        p: c.addScaledVector(dv.clone().normalize(), -1.2),
        s: 0.45,
        rot: V3(1, 2, 3),
        sp: V3(0.2, 0.1, 0.3),
      });
    });
    run(true);
    const S64 = com(64).add(V3(0, 22, -2));
    for (let i = rocks.length - 1; i >= 0; i--) {
      const p = rocks[i].p;
      const below = S64.y + 6 - p.y;
      if (
        below > -rocks[i].s &&
        Math.hypot(p.x - S64.x, p.z - S64.z) < 22 + Math.max(0, below) * 0.5 + rocks[i].s
      )
        rocks.splice(i, 1);
    }
    const hitP = at(0, 61.4)
      .p.clone()
      .add(V3(-6, -2.6, -0.6));
    return { at, com, rocks, BH, hitP };
  })();

  const rockInst = new THREE.InstancedMesh(
    (() => {
      const g = new THREE.IcosahedronGeometry(1, 4);
      const p = g.attributes.position;
      const v = V3();
      const rr = rng(5);
      const bmp = Array.from({ length: 18 }, () => [
        V3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize(),
        0.12 + rr() * 0.32,
        rr() * 0.24,
      ]);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = v.clone().normalize();
        let d = 1;
        bmp.forEach(([dir, w, a]) => {
          d -= Math.exp(-Math.pow((1 - n.dot(dir)) / w, 2) * 2) * a;
        });
        d +=
          Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3) * Math.sin(v.z * 5.7) * 0.05 +
          Math.sin(v.x * 19 + v.y * 13) * 0.015;
        v.multiplyScalar(d);
        p.setXYZ(i, v.x, v.y * 0.86, v.z);
      }
      g.computeVertexNormals();
      return g;
    })(),
    rockMat,
    SIM.rocks.length + 1,
  );
  rockInst.frustumCulled = false;
  scene.add(rockInst);
  const m4 = new THREE.Matrix4();
  const eul = new THREE.Euler();
  const qq = new THREE.Quaternion();
  const sc = V3();

  const composer = new THREE.EffectComposer(R.renderer);
  const pass = new THREE.RenderPass(scene, cam);
  composer.addPass(pass);
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.55, 0.85);
  composer.addPass(bloom);
  const film = new THREE.ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uFade: { value: 1 },
      uFlash: { value: 0 },
      uGlitch: { value: 0 },
      uCA: { value: 0.0012 },
      uWarm: { value: 0 },
      uDark: { value: 0 },
    },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime, uFade, uFlash, uGlitch, uCA, uWarm, uDark;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = vUv;
        float row = floor(uv.y * 48.0);
        float g = step(0.72, h(vec2(row, floor(uTime * 24.0)))) * uGlitch;
        uv.x += (h(vec2(row * 1.7, floor(uTime * 30.0))) - 0.5) * 0.08 * g;
        vec2 c = uv - 0.5;
        float ca = uCA + uGlitch * 0.012;
        vec3 col;
        col.r = texture2D(tDiffuse, uv + c * ca).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c * ca).b;
        col = mix(col, col * vec3(1.6, 0.4, 0.5), g * 0.6);
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, col * vec3(0.92, 1.0, 1.06) + vec3(0.0, 0.006, 0.012), smoothstep(0.4, 0.0, l));
        col = mix(col, col * vec3(1.08, 1.0, 0.9), smoothstep(0.3, 1.0, l) * (0.5 + uWarm));
        col = col / (1.0 + col * 0.16);
        float r = length(c * vec2(1.25, 1.0));
        float v = smoothstep(0.95, 0.25, r);
        col *= mix(0.55, 1.0, v);
        col *= 1.0 - uDark * smoothstep(0.15, 0.75, r) * 0.95 - uDark * 0.35;
        col += (h(uv * 900.0 + uTime) - 0.5) * 0.035;
        col = mix(col, vec3(1.0, 0.98, 0.95), uFlash);
        col *= 1.0 - uFade;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  composer.addPass(film);
  const FU = film.uniforms;

  const el = document.createElement('div');
  el.id = 'cine';
  el.hidden = true;
  el.innerHTML = `
    <div class="bar top"></div><div class="bar bottom"></div>
    <p class="csub" id="cineSub"></p>
    <div class="ctitle" id="cineTitle"><span class="big" id="cineBig"></span><span class="small" id="cineSmall"></span></div>
    <div class="cskip" id="cineSkip"><kbd>Échap</kbd> maintenir pour passer<i id="cineSkipBar"></i></div>`;
  document.body.appendChild(el);
  const $sub = el.querySelector('#cineSub');
  const $big = el.querySelector('#cineBig');
  const $small = el.querySelector('#cineSmall');
  const $title = el.querySelector('#cineTitle');

  const SUBS = [
    [2, 5.6, T.s1a],
    [6.2, 10.4, T.s1b],
    [14.6, 18.6, T.s2],
    [31, 35, T.s4],
    [41.5, 45.5, T.s5],
    [69, 73.4, T.s7a],
    [75.6, 79.8, T.s7b],
    [110.5, 115, T.s9],
  ];
  const TITLES = [
    [91.5, 96, T.planet, T.planetSub],
    [133.4, 139, 'BORDERLINE', T.tagline],
  ];

  let inCity = false;
  const setCity = (on) => {
    if (on === inCity) return;
    inCity = on;
    pass.scene = on ? R.scene : scene;
    [D.g, V.g, ship.group, cam].forEach((o) => (on ? R.scene : scene).add(o));
    R.scene.fog.density = on ? 0.004 : 0.0085;
  };

  const placeBody = (rig, j, t) => {
    const s = SIM.at(j, t);
    rig.g.position.copy(s.p);
    rig.g.quaternion.copy(s.q);
  };

  const camPath = (t) => {
    const c = SIM.com(Math.min(t, 64));
    const pos = V3();
    const tgt = V3();
    if (t < 12) {
      const k = ease(seg(t, 0, 12));
      const a = lerp(0.35, 1.25, k);
      const r = lerp(6.5, 3.6, k);
      pos.copy(c).add(V3(Math.sin(a) * r, lerp(1.6, 0.6, k), Math.cos(a) * r));
      tgt
        .copy(c)
        .add(V3(0, 0.3, 0))
        .lerp(c.clone().add(V3(0, 4, -60)), (1 - k) * 0.55);
    } else if (t < 22.6) {
      const k = ease(seg(t, 12, 22.6));
      const back = SIM.at(0, t).v.clone().normalize().negate();
      const ref = c.clone().add(V3(Math.sin(1.25) * 3.6, 0.6, Math.cos(1.25) * 3.6));
      const chase = c
        .clone()
        .addScaledVector(back, 4.2)
        .add(V3(0.6, 1.2, 0));
      pos.copy(ref).lerp(chase, ease(seg(t, 12, 17)));
      tgt.copy(c).lerp(SIM.BH, k * 0.7);
    } else if (t < 28.5) {
      const back = SIM.at(0, t).v.clone().normalize().negate();
      pos
        .copy(c)
        .addScaledVector(back, 3.6)
        .add(V3(0.4 + Math.sin(t * 2) * 0.2, 0.8, 0));
      tgt.copy(c).addScaledVector(back, -6);
    } else if (t < 50) {
      const k = ease(seg(t, 28.5, 40));
      const fwd = SIM.at(0, Math.min(t, 49)).v.clone().normalize();
      const side = V3()
        .crossVectors(fwd, V3(0, 1, 0))
        .normalize();
      const sep = SIM.at(0, t).p.distanceTo(SIM.at(1, t).p);
      const back = lerpV(
        fwd.clone().negate().multiplyScalar(3.6),
        side
          .clone()
          .multiplyScalar(sep * 1.15 + 3.5)
          .add(fwd.clone().multiplyScalar(1.5)),
        k,
      );
      pos
        .copy(c)
        .add(back)
        .add(V3(0, lerp(0.8, 1.6, k), 0));
      tgt.copy(c);
    } else {
      const fwd = SIM.at(0, Math.min(t, 61)).v.clone().normalize();
      const side = V3()
        .crossVectors(fwd, V3(0, 1, 0))
        .normalize();
      const k = ease(seg(t, 50, 53.5));
      const ref = c
        .clone()
        .add(side.clone().multiplyScalar(5.5))
        .addScaledVector(fwd, 1.5)
        .add(V3(0, 1.6, 0));
      const chase = c
        .clone()
        .addScaledVector(fwd, -4.6)
        .addScaledVector(side, 1.2)
        .add(V3(0, 1.4, 0));
      pos.copy(ref).lerp(chase, k);
      if (t > 61.4)
        pos.lerp(
          c
            .clone()
            .addScaledVector(fwd, -7)
            .addScaledVector(side, 3)
            .add(V3(0, 2.4, 0)),
          ease(seg(t, 61.4, 64)),
        );
      tgt.copy(c).addScaledVector(fwd, lerp(3, 1, ease(seg(t, 60, 64))));
    }
    return { pos, tgt };
  };

  const SHIP0 = SIM.com(64).add(V3(0, 22, -2));
  const shipPath = (t) => {
    if (t < 64)
      return SHIP0.clone().add(V3(-80 + (t - 56) * 10, 40 - (t - 56) * 5, -40 + (t - 56) * 5));
    if (t < 80) return SHIP0.clone();
    const k = ease(seg(t, 80, 86));
    return SHIP0.clone().add(V3(0, k * 6, -k * 40 - Math.pow(seg(t, 84, 90), 2) * 2400));
  };
  const ARRIVE = shipPath(89.4);
  const ring81 = (() => {
    const orbit = 0.4 + 17 * 0.07;
    return V3(Math.sin(orbit) * 13, -9, Math.cos(orbit) * 13)
      .add(SHIP0)
      .sub(shipPath(81));
  })();

  const seek = (t, dt) => {
    HQ.time.value = t;
    neb.U.uTime.value = t;
    FU.uTime.value = t;
    FU.uGlitch.value = 0;
    FU.uFlash.value = 0;
    FU.uCA.value = 0.0012;
    FU.uWarm.value = 0;
    FU.uFade.value = 0;
    FU.uDark.value = 0;
    let blur = 0;
    const city = t >= 97;
    setCity(city);
    heart.visible = !city && t < 30;
    bh.group.visible = !city && t > 12.5 && t < 31;
    glare.visible = false;
    warp.mesh.visible = false;
    planet.group.visible = !city && t > 84;
    cards.group.visible = false;
    hearts.forEach((h) => (h.visible = false));
    rockInst.visible = !city && t > 40 && t < 84;
    neb.mesh.visible = !city;
    cloud.material.opacity = 0;
    ship.group.visible = t > 56 && t < 121;
    D.g.visible = V.g.visible = true;
    [D, V].forEach((r) => r.A.flames.forEach((f) => (f.visible = false)));

    let pos;
    let tgt;
    let dPose = null;
    let vPose = null;
    let dSnap = false;
    let vSnap = false;

    if (!city) {
      neb.U.uMix.value = ease(seg(t, 28.5, 34));
      neb.U.uRed.value = 0.45 * pulse(t, 12, 22.6, 1.5);
      neb.U.uDark.value = 0.8 * pulse(t, 22.6, 28.6, 0.6);
      heart.position.copy(SIM.com(0)).add(V3(0, 8, -95));
      heart.lookAt(SIM.com(0));
      const red = seg(t, 12, 14);
      heart.material.color.setRGB(1, 1 - red * 0.7, 1 - red * 0.7);
      heart.material.opacity = (0.92 + Math.sin(t * 1.3) * 0.06) * (1 - seg(t, 16, 24));
      bh.group.position.copy(SIM.BH);
      bh.group.scale.setScalar(
        t < 22.6
          ? 0.01 + ease(seg(t, 12.6, 18)) * 8
          : Math.max(0.001, 8 * (1 - seg(t, 28.5, 30.5))),
      );
      bh.U.uTime.value = t;
      FU.uGlitch.value =
        pulse(t, 12, 13.6, 0.1) * (0.6 + 0.4 * Math.sin(t * 40)) + pulse(t, 16.4, 16.8, 0.05);
      FU.uCA.value = 0.0012 + seg(t, 17, 22.6) * 0.008 * (1 - seg(t, 28.5, 30));
      const cp = camPath(Math.min(t, 64));
      pos = cp.pos;
      tgt = cp.tgt;
      bh.group.lookAt(pos);
      if (t < 64) {
        placeBody(D, 0, t);
        placeBody(V, 1, t);
      }
      if (t > 22.6 && t < 28.8) {
        warp.mesh.visible = true;
        warp.set(t, 140 + seg(t, 22.6, 28) * 140, 1 + seg(t, 22.6, 28) * 2.5);
      }
      if (t > 27.4 && t < 31) {
        glare.visible = true;
        glare.position.copy(pos);
        glare.scale.setScalar(lerp(30, 2, pulse(t, 27.4, 31, 1)));
        glare.material.opacity = pulse(t, 27.4, 31, 1.1);
        FU.uFlash.value = pulse(t, 27.8, 30.2, 0.8) * 0.85;
      }
      if (t > 38.5 && t < 48.6)
        V.A.flames.forEach((f) => {
          f.visible = true;
          f.scale.set(1, 1.4 + Math.sin(t * 40) * 0.15, 1);
        });
      const pullK = seg(t, 13.5, 22.6);
      const holdK = t < 12 ? 1 : t < 28.6 ? 0.6 : 0;
      const P = HQRig.P;
      if (t < 12) {
        dPose = P.reach(P.float(t, 0), 1, 1);
        vPose = P.reach(P.float(t, 1.7), 0, 1);
      } else if (t < 28.6) {
        const k = Math.max(pullK, t > 22.6 ? 0.8 : 0);
        dPose = P.reach(P.mix(P.float(t, 0), P.struggle(t, 0, 1), k), 1, holdK);
        vPose = P.reach(P.mix(P.float(t, 1.7), P.struggle(t, 1.7, 1), k), 0, holdK);
      } else if (t < 48.6) {
        const sk = 1 - seg(t, 36, 41);
        dPose = P.mix(P.reach(P.swim(t, 0.3), 1, seg(t, 44, 48)), P.struggle(t, 0.3, 1), sk * 0.6);
        vPose =
          t > 38.5
            ? P.reach(P.float(t, 2), 0, seg(t, 40, 46))
            : P.mix(P.swim(t, 1.1), P.struggle(t, 1.1, 1), sk * 0.6);
      } else if (t < 61.4) {
        dPose = P.reach(P.float(t, 0), 1, 1);
        vPose = P.reach(P.float(t, 1.7), 0, 1);
      } else {
        dPose = P.limp(t, 0);
        vPose = P.limp(t, 1);
      }
      if (t > 40) {
        rockInst.count = SIM.rocks.length + 1;
        SIM.rocks.forEach((rk, i) => {
          eul.set(rk.rot.x + rk.sp.x * t, rk.rot.y + rk.sp.y * t, rk.rot.z + rk.sp.z * t);
          qq.setFromEuler(eul);
          sc.setScalar(rk.s);
          m4.compose(rk.p, qq, sc);
          rockInst.setMatrixAt(i, m4);
        });
        const hk = seg(t, 58.2, 61.4);
        const bp = SIM.hitP
          .clone()
          .add(V3(-60, -14, 22))
          .lerp(SIM.hitP, Math.pow(hk, 1.25));
        if (t > 61.4) bp.copy(SIM.hitP).add(V3(1.4, 0.4, 0).multiplyScalar(t - 61.4));
        eul.set(t * 0.25, t * 0.18, 0);
        qq.setFromEuler(eul);
        sc.setScalar(5.2);
        m4.compose(bp, qq, sc);
        rockInst.setMatrixAt(SIM.rocks.length, m4);
        rockInst.instanceMatrix.needsUpdate = true;
      }
      if (t > 61.3 && t < 64) {
        const s = pulse(t, 61.35, 62.4, 0.05);
        pos.x += (Math.sin(t * 91) + Math.sin(t * 57)) * s * 0.25;
        pos.y += (Math.cos(t * 83) + Math.sin(t * 41)) * s * 0.25;
        FU.uFlash.value = pulse(t, 61.38, 61.75, 0.04) * 0.9;
      }
      if (t > 61.4) {
        FU.uDark.value = pulse(t, 61.6, 69, 1.4) * 0.85;
        blur = pulse(t, 61.6, 67, 1.4) * 4;
      }
      if (t > 56) {
        ship.group.position.copy(shipPath(t));
        ship.group.rotation.set(-0.12 * seg(t, 81, 84), t * 0.12, 0);
        ship.group.scale.setScalar(1);
        ship.ring.rotation.y = -t * 0.6;
        ship.lights.rotation.y = t * 0.4;
        ship.BU.uTime.value = t;
        ship.BU.uOn.value = pulse(t, 64.5, 81, 1) * 0.7;
        ship.beam.scale.set(1, 0.85, 1);
      }
      if (t >= 64) {
        const rise = ease(seg(t, 66, 80));
        [D, V].forEach((r, j) => {
          const st = SIM.at(j, 64);
          const axis = SHIP0.clone().add(V3(j ? 0.6 : -0.6, -2 - (1 - rise) * 18, 0));
          r.g.position.copy(st.p.clone().lerp(axis, ease(seg(t, 64, 70))));
          r.g.quaternion.copy(st.q);
          r.g.rotateX((t - 64) * 0.25 * (j ? 1 : -1));
          r.g.rotateZ((t - 64) * 0.15);
          r.g.visible = rise < 0.97;
        });
        const mid = SHIP0.clone().add(V3(0, -2 - (1 - rise) * 18, 0));
        const hk = seg(t, 71, 74);
        const merge = ease(seg(t, 73.2, 75));
        const cp64 = camPath(64);
        if (t < 81) {
          const orbit = 0.4 + (t - 64) * 0.07;
          const ring = (r, y, c = mid) =>
            c.clone().add(V3(Math.sin(orbit) * r, y, Math.cos(orbit) * r));
          pos = lerpV(cp64.pos, ring(14, -4), ease(seg(t, 64, 70)));
          if (t > 70) pos.lerp(ring(7.5, 1.2), ease(seg(t, 70, 74)));
          if (t > 75.5) pos.lerp(ring(13, -9, SHIP0), ease(seg(t, 75.5, 80.5)));
          tgt = lerpV(cp64.tgt, mid.clone().add(V3(0, 1.2, 0)), ease(seg(t, 64, 70)));
          if (t > 75.5) tgt.lerp(SHIP0.clone().add(V3(0, -1, 0)), ease(seg(t, 75.5, 80)));
          FU.uFlash.value = Math.max(
            FU.uFlash.value,
            pulse(t, 75.2, 76, 0.15) * 0.4,
            pulse(t, 79.6, 80.8, 0.4) * 0.3,
          );
        } else {
          const sp = shipPath(t);
          const o81 = ring81.clone();
          pos = sp.clone().add(lerpV(o81, V3(16, 4, 30), ease(seg(t, 81, 85.5))));
          if (t > 85.5)
            pos = sp.clone().add(lerpV(V3(16, 4, 30), V3(6, 3, 20), ease(seg(t, 85.5, 89))));
          tgt = sp.clone().add(V3(0, 0, -lerp(0, 10, seg(t, 81, 86))));
          FU.uFlash.value = seg(t, 88.6, 89.4) * 0.95;
          if (t > 86 && t < 89.6) {
            warp.mesh.visible = true;
            warp.set(t, 260, 2 + seg(t, 86, 89) * 7);
            FU.uCA.value = 0.004 + seg(t, 86, 89) * 0.012;
          }
          neb.U.uDark.value = 0.6 * pulse(t, 86, 90.5, 0.8);
        }
        hearts.forEach((h, i) => {
          const src = i === 2 ? null : (i ? V : D).world(V3(0, 0.15, 0.25));
          const top = mid.clone().add(V3(0, 2.4, 0));
          const p = src ? lerpV(src, top, merge).add(V3(0, hk * 0.8 * (1 - merge), 0)) : top;
          h.position.copy(p);
          h.lookAt(pos);
          const scH = i === 2 ? merge * 0.9 : 0.25 * hk * (1 - merge * 0.6);
          h.scale.setScalar(Math.max(0.001, scH + Math.sin(t * 6) * 0.02 * hk));
          h.visible = t > 71 && t < 75.6 && scH > 0.01;
        });
        const shatter = seg(t, 75.4, 80.5);
        cards.group.visible = t > 75.4 && t < 81;
        cards.list.forEach((c, i) => {
          const a = i * 2.4 + shatter * 9;
          const rr = (1 - shatter) * (0.4 + (i % 7) * 0.2) + 0.25;
          c.position.set(
            mid.x + Math.cos(a) * rr * 2.4,
            lerp(mid.y + 2.4, SHIP0.y - 1.5, Math.pow(shatter, 1.3)) +
              Math.sin(i) * (1 - shatter) * 0.6,
            mid.z + Math.sin(a) * rr * 2.4,
          );
          c.rotation.set(t * 2 + i, t * 3 + i * 0.5, 0);
          c.scale.setScalar(1 - Math.pow(shatter, 6) * 0.9);
        });
      }
      if (t > 84) {
        planet.group.position.copy(ARRIVE).add(V3(0, -70, -230));
        planet.group.scale.setScalar(1.6);
        planet.group.rotation.y = t * 0.015;
        planet.U.uTime.value = t;
        planet.U.uSun.value.set(-0.7, 0.35, 0.6).normalize();
        if (t > 89.4) {
          const k = ease(seg(t, 89.4, 97));
          const sp = ARRIVE.clone().add(V3(0, -k * 40, -k * 132));
          ship.group.position.copy(sp);
          ship.group.rotation.set(0.15, t * 0.12, 0);
          ship.group.scale.setScalar(1);
          pos = ARRIVE.clone()
            .add(V3(6, 3, 20))
            .add(V3(4 * k, -26 * k * k, -96 * k * k));
          tgt = sp.clone().lerp(planet.group.position, 0.5 * ease(seg(t, 89.4, 92.5)));
          cloud.material.opacity = ease(seg(t, 94.6, 96.6));
          FU.uFlash.value = 0.95 * (1 - seg(t, 89.4, 91));
          FU.uWarm.value = 0.25;
        }
      }
      key.position.copy(pos).add(V3(-6, 8, 10));
      key.target.position.copy(tgt);
      rim.position.copy(pos).add(V3(5, 3, -14));
      rim.target.position.copy(tgt);
      neb.mesh.position.copy(pos);
      FU.uFade.value = 1 - seg(t, 0, 1.6);
    } else {
      const spD = City.spawns.dame;
      const spV = City.spawns.valet;
      const vz = Math.sign(-spV.z) || 1;
      const dz = Math.sign(-spD.z) || 1;
      const shipA = V3(spV.x, 44, spV.z);
      const shipB = V3(spD.x, 44, spD.z);
      const sp = lerpV(V3(spV.x + 60, 140, spV.z + 90), shipA, ease(seg(t, 97, 101.5)));
      if (t > 104.5) sp.lerp(shipB, ease(seg(t, 104.5, 109)));
      if (t > 111.6) sp.add(V3(0, Math.pow(seg(t, 111.6, 121), 2) * 260, 0));
      ship.group.position.copy(sp);
      ship.group.rotation.set(0, t * 0.12, 0);
      ship.group.scale.setScalar(1.3);
      ship.ring.rotation.y = -t * 0.6;
      ship.lights.rotation.y = t * 0.4;
      ship.BU.uTime.value = t;
      ship.BU.uOn.value = pulse(t, 101.4, 104.2, 0.4) + pulse(t, 108.8, 111.4, 0.4);
      ship.beam.scale.set(1.2, 1.12, 1.2);
      const vDrop = ease(seg(t, 101.6, 103.8));
      const dDrop = ease(seg(t, 109, 111.2));
      const lieV = HQRig.wake('front', Math.max(0, t - 115));
      const lieD = HQRig.wake('back', Math.max(0, t - 125.8));
      V.g.visible = t > 101.5;
      D.g.visible = t > 108.9;
      V.g.position.set(spV.x, lerp(40, 0, vDrop) + 1, spV.z);
      V.g.quaternion.setFromEuler(
        new THREE.Euler(
          vDrop < 1 ? lerp(0.4, lieV.pitch, vDrop) : lieV.pitch,
          Math.atan2(2.6, 3.4 * vz) + 0.55,
          0,
          'YXZ',
        ),
      );
      vPose = vDrop < 1 ? HQRig.P.limp(t, 1) : lieV.pose;
      D.g.position.set(spD.x, lerp(40, 0, dDrop) + 1, spD.z);
      D.g.quaternion.setFromEuler(
        new THREE.Euler(
          dDrop < 1 ? lerp(-0.4, lieD.pitch, dDrop) : lieD.pitch,
          Math.atan2(-2.6, 3.2 * dz) - 0.55,
          0,
          'YXZ',
        ),
      );
      dPose = dDrop < 1 ? HQRig.P.limp(t, 0) : lieD.pose;
      dSnap = dDrop >= 1;
      vSnap = vDrop >= 1;
      cloud.material.opacity = 1 - seg(t, 97, 99);
      const pts = [
        [97, V3(spV.x + 2, 170, spV.z + vz * 70), V3(spV.x, 30, spV.z)],
        [101.5, V3(spV.x + 2, 30, spV.z + vz * 30), V3(spV.x, 8, spV.z)],
        [104.5, V3(spV.x + 2.4, 3.2, spV.z + vz * 7.5), V3(spV.x, 0.4, spV.z)],
      ];
      const dPts = [
        [108.8, V3(spD.x - 2, 30, spD.z + dz * 30), V3(spD.x, 6, spD.z)],
        [111.4, V3(spD.x - 2.4, 6, spD.z + dz * 8), V3(spD.x, 0.5, spD.z)],
      ];
      const vClose = [V3(spV.x + 2.6, 1.3, spV.z + vz * 3.4), V3(spV.x, 0.45, spV.z)];
      const vUp = [V3(spV.x + 3.2, 2.1, spV.z + vz * 3.6), V3(spV.x, 1.15, spV.z)];
      const dClose = [V3(spD.x - 2.6, 1.2, spD.z + dz * 3.2), V3(spD.x, 0.4, spD.z)];
      const dUp = [V3(spD.x - 3.2, 1.9, spD.z + dz * 3.6), V3(spD.x, 1.15, spD.z)];
      const path = (k0, A, B, tt, a0, a1) => {
        const k = seg(tt, a0, a1);
        const up = ease(seg(k, 0, 0.3)) * (1 - ease(seg(k, 0.7, 1)));
        const h = ease(seg(k, 0.25, 0.75));
        const p = lerpV(A[0], B[0], h);
        p.y = lerp(lerp(A[0].y, B[0].y, h), 105, up);
        const tg = lerpV(A[1], B[1], ease(seg(k, 0.15, 0.85)));
        return [p, tg];
      };
      const lerp2 = (A, B, k) => [lerpV(A[0], B[0], k), lerpV(A[1], B[1], k)];
      const seq = (list, tt) => {
        let i = 0;
        while (i < list.length - 2 && list[i + 1][0] < tt) i++;
        const k = ease(seg(tt, list[i][0], list[i + 1][0]));
        return lerp2([list[i][1], list[i][2]], [list[i + 1][1], list[i + 1][2]], k);
      };
      const vEnd = [pts[2][1], pts[2][2]];
      const dStart = [dPts[0][1], dPts[0][2]];
      const dEnd = [dPts[1][1], dPts[1][2]];
      let cp;
      if (t < 104.5) cp = seq(pts, t);
      else if (t < 108.8) cp = path(0, vEnd, dStart, t, 104.8, 108.8);
      else if (t < 111.6) cp = seq(dPts, t);
      else if (t < 115.6) cp = path(0, dEnd, vClose, t, 111.6, 115.6);
      else if (t < 122.4) cp = lerp2(vClose, vUp, ease(seg(t, 117.5, 122.2)));
      else if (t < 126.4) cp = path(0, vUp, dClose, t, 122.4, 126.4);
      else if (t < 133.2) cp = lerp2(dClose, dUp, ease(seg(t, 128.5, 133)));
      else {
        const k = ease(seg(t, 133.2, 140));
        cp = lerp2(
          dUp,
          [
            V3(spD.x - 3, 4.5 + k * 8, spD.z + dz * (5 + k * 14)),
            V3(spD.x, 1.2 + k * 14, spD.z - dz * 30),
          ],
          k,
        );
      }
      [pos, tgt] = cp;
      FU.uFade.value = seg(t, 138.4, 140);
      FU.uWarm.value = 0.1;
      if (t > 132) BigScreen.show('?', 'BORDERLINE', '#ff5f8a');
      City.update(t, dt);
      BigScreen.update(dt, t);
      Sky.update(t, cam);
    }

    cam.position.copy(pos);
    cam.lookAt(tgt);
    D.apply(dPose || HQRig.P.float(t, 0));
    V.apply(vPose || HQRig.P.float(t, 1.7));
    if (dSnap) D.groundSnap(0);
    if (vSnap) V.groundSnap(0);

    let sub = '';
    let op = 0;
    SUBS.forEach(([a, b, s]) => {
      if (t >= a && t <= b) {
        sub = s;
        op = pulse(t, a, b, 0.6);
      }
    });
    if ($sub.textContent !== sub) $sub.textContent = sub;
    $sub.style.opacity = op;
    let tb = '';
    let ts = '';
    let to = 0;
    TITLES.forEach(([a, b, big2, small]) => {
      if (t >= a && t <= b) {
        tb = big2;
        ts = small;
        to = pulse(t, a, b, 0.9);
      }
    });
    if ($big.textContent !== tb) $big.textContent = tb;
    if ($small.textContent !== ts) $small.textContent = ts;
    $title.style.opacity = to;
    $title.style.transform = `translate(-50%, -50%) scale(${1 + (1 - to) * 0.04})`;
    R.renderer.domElement.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : '';
  };

  const resize = () => {
    const pr = window.__rec ? window.devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 1.5);
    composer.setPixelRatio(pr);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth * 0.5, innerHeight * 0.5);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  let last = 0;
  const render = (t) => {
    seek(t, clamp(t - last, 0, 0.1));
    last = t;
    composer.render();
  };

  const stop = () => {
    el.hidden = true;
    R.renderer.domElement.style.filter = '';
    setCity(false);
    R.scene.fog.density = 0.0085;
    [D.g, V.g, ship.group].forEach((o) => o.parent && o.parent.remove(o));
  };

  return {
    DUR,
    render,
    show() {
      el.hidden = false;
    },
    stop,
    play() {
      return new Promise((res) => {
        el.hidden = false;
        last = 0;
        const voice = Sound.cine ? Sound.cine(DUR) : null;
        const t0 = performance.now();
        let hold = 0;
        let done = false;
        const keys = new Set();
        const kd = (e) => keys.add(e.code);
        const ku = (e) => keys.delete(e.code);
        addEventListener('keydown', kd);
        addEventListener('keyup', ku);
        const bar = el.querySelector('#cineSkipBar');
        const finish = () => {
          if (done) return;
          done = true;
          removeEventListener('keydown', kd);
          removeEventListener('keyup', ku);
          if (voice) voice.stop();
          stop();
          res();
        };
        let prev = t0;
        const loop = (now) => {
          if (done) return;
          const t = (now - t0) / 1000;
          const dt = (now - prev) / 1000;
          prev = now;
          const skipping =
            keys.has('Escape') || keys.has('KeyE') || keys.has('Space') || Input.rawPad([0, 9]);
          hold = skipping ? hold + dt : Math.max(0, hold - dt * 2);
          bar.style.transform = `scaleX(${clamp(hold / 1.2, 0, 1)})`;
          if (hold > 1.2 || t >= DUR) return finish();
          render(t);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    },
  };
})();
