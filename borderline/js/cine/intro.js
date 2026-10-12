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
  const heartG = CineKit2.heartGalaxy();
  scene.add(heartG.group);
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
  const ship = CineKit2.alienShip();
  const shipRoot = new THREE.Group();
  shipRoot.add(ship.group);
  scene.add(shipRoot);
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
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRk;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRk = position * 3.0;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRk;
        float rh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float rn(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(rh(i), rh(i + vec3(1,0,0)), f.x), mix(rh(i + vec3(0,1,0)), rh(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(rh(i + vec3(0,0,1)), rh(i + vec3(1,0,1)), f.x), mix(rh(i + vec3(0,1,1)), rh(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float rfbm(vec3 p) { return rn(p) * 0.5 + rn(p * 2.1) * 0.25 + rn(p * 4.3) * 0.15 + rn(p * 9.1) * 0.1; }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float rH = rfbm(vRk);
        float crater = smoothstep(0.62, 0.7, rn(vRk * 0.8 + 3.0));
        diffuseColor.rgb *= 0.72 + rH * 0.5 - crater * 0.18;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.15, 0.95, 0.9), rn(vRk * 0.3));`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 dpx = dFdx(-vViewPosition);
          vec3 dpy = dFdy(-vViewPosition);
          float hx = dFdx(rH);
          float hy = dFdy(rH);
          vec3 r1 = cross(dpy, normal);
          vec3 r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (hx * r1 + hy * r2);
          normal = normalize(abs(det) * normal - grad * 1.6);
        }`,
      )
      .replace(
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
    const RB = 0.5;
    const UPV = V3(0, 1, 0);
    const startQ = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
    const bodies = [0, 1].map(() => ({ p: V3(), v: V3(), q: startQ(), w: V3() }));
    let rec = [[], []];
    const r = rng(42);
    const qtmp = new THREE.Quaternion();
    const tA = V3();
    const tB = V3();
    const tC = V3();
    const tD = V3();
    const tE = V3();
    let beamAxis = null;
    const rockPos = (rk, t, out = V3()) => {
      out.copy(rk.p0).addScaledVector(rk.v, t - rk.tc);
      if (beamAxis && t > 64.3) {
        const dx = out.x - beamAxis.x;
        const dz = out.z - beamAxis.z;
        const d = Math.hypot(dx, dz) || 1e-3;
        const Rc = 38 + rk.R;
        if (d < Rc && out.y < beamAxis.y + 4) {
          const k = ease(seg(t, 64.3, 68.5)) * (Rc - d);
          out.x += (dx / d) * k;
          out.z += (dz / d) * k;
        }
      }
      return out;
    };
    const integrate = (b, a, alpha) => {
      b.v.addScaledVector(a, dt);
      b.p.addScaledVector(b.v, dt);
      b.w.addScaledVector(alpha, dt);
      const wl = b.w.length();
      if (wl > 1e-6) {
        qtmp.setFromAxisAngle(tE.copy(b.w).divideScalar(wl), wl * dt);
        b.q.premultiply(qtmp).normalize();
      }
    };
    let colliders = [];
    let bigHit = 0;
    const run = () => {
      bodies[0].p.set(-0.48, 0, 0);
      bodies[1].p.set(0.48, 0, 0);
      bodies.forEach((b) => {
        b.v.set(0, 0, -0.35);
        b.q.copy(startQ());
        b.w.set(0, 0, 0);
      });
      colliders.forEach((c) => (c.hits = 0));
      rec = [[], []];
      bigHit = 0;
      let ejected = false;
      let thS = 0;
      for (let i = 0; i <= N; i++) {
        const t = i * dt;
        const [A, B] = bodies;
        const acc = [V3(), V3()];
        const ang = [V3(), V3()];
        let thrust = 0;
        const holding = t < 28.45 || (t > 48.6 && (!bigHit || t < bigHit + 0.12));
        if (holding && A.p.distanceTo(B.p) < 2.2) {
          const d = V3().subVectors(B.p, A.p);
          const L = d.length();
          const n = d.clone().divideScalar(L || 1);
          const f = (L - 0.95) * 7;
          const rel = V3().subVectors(B.v, A.v).dot(n) * 3;
          acc[0].addScaledVector(n, f + rel);
          acc[1].addScaledVector(n, -(f + rel));
          const rv = V3().subVectors(B.v, A.v).multiplyScalar(1.3);
          acc[0].add(rv);
          acc[1].sub(rv);
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
                .crossVectors(to, UPV)
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
          const side = V3().crossVectors(fwd, UPV).normalize();
          if (V3().subVectors(B.p, A.p).dot(side) < 0) side.negate();
          A.v
            .copy(fwd.clone().multiplyScalar(7))
            .addScaledVector(side, -0.5)
            .add(V3(0, 0.12, 0));
          B.v
            .copy(fwd.clone().multiplyScalar(7))
            .addScaledVector(side, 0.5)
            .add(V3(0, -0.08, 0));
          A.w.set(1.1, 0.6, 0.9);
          B.w.set(-0.8, 0.9, -1.2);
        }
        if (t > 30 && !bigHit) {
          A.w.multiplyScalar(Math.exp(-(t > 47 ? 1.2 : 0.06) * dt));
          if (t < 35) B.w.multiplyScalar(Math.exp(-0.05 * dt));
          if (t >= 35 && t < 48.6) {
            const to = tA.subVectors(A.p, B.p);
            const dist = to.length();
            to.divideScalar(dist);
            const vrel = tB.subVectors(B.v, A.v);
            const closing = Math.max(0, vrel.dot(to));
            const vdes = Math.min(
              1.3,
              Math.sqrt(2 * 0.5 * Math.max(0, dist - 1.1 - closing * 1.8)),
            );
            const dv = tC.copy(to).multiplyScalar(vdes).sub(vrel);
            const dvl = dv.length();
            const up = tD.copy(UPV).applyQuaternion(B.q);
            const dir = dvl > 0.04 ? dv.divideScalar(dvl) : to;
            const align = up.dot(dir);
            const axis = V3().crossVectors(up, dir);
            if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0).applyQuaternion(B.q);
            axis.normalize().multiplyScalar(Math.acos(clamp(align, -1, 1)) * 4.2);
            ang[1].add(axis).addScaledVector(B.w, -3.6);
            if (t > 37 && align > 0.8) thrust = Math.min(0.9, dvl * 1.4) * align;
            acc[1].addScaledVector(up, thrust);
          }
          if (t >= 48.6) B.w.multiplyScalar(Math.exp(-1.2 * dt));
        }
        for (const c of colliders) {
          if (t < c.t0 || t > c.t1) continue;
          const rp = rockPos(c, t, tA);
          bodies.forEach((b) => {
            const d = tB.subVectors(b.p, rp);
            const L = d.length();
            const minD = c.R + RB;
            if (L >= minD || L === 0) return;
            const n = d.divideScalar(L);
            b.p.copy(rp).addScaledVector(n, minD);
            const vr = tC.subVectors(b.v, c.v);
            const vn = vr.dot(n);
            if (vn < 0) {
              b.v.addScaledVector(n, -(1 + c.e) * vn);
              const vt = vr.addScaledVector(n, -vn);
              b.w.add(tD.crossVectors(n, vt).multiplyScalar(c.spin));
              c.hits++;
              if (c.big && !bigHit) bigHit = t;
            }
          });
        }
        if (bigHit) bodies.forEach((b) => b.w.multiplyScalar(Math.exp(-0.25 * dt)));
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
        thS += (thrust - thS) * Math.min(1, dt * 5);
        rec[0].push({ p: A.p.clone(), q: A.q.clone(), v: A.v.clone(), th: 0 });
        rec[1].push({ p: B.p.clone(), q: B.q.clone(), v: B.v.clone(), th: thS });
      }
    };
    const at = (j, t) => rec[j][clamp(Math.round(t * FPS_SIM), 0, rec[j].length - 1)];
    const com = (t) => at(0, t).p.clone().add(at(1, t).p).multiplyScalar(0.5);
    const frame = (t) => {
      const fwd = at(0, t).v.clone().normalize();
      const side = V3().crossVectors(fwd, UPV).normalize();
      const up = V3().crossVectors(side, fwd).normalize();
      return { fwd, side, up };
    };
    const randUnit = () => V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    const mkRock = (o) => {
      const sc = o.sc || V3(0.8 + r() * 0.35, 0.75 + r() * 0.3, 0.8 + r() * 0.35);
      return {
        rot: V3(r() * 6, r() * 6, r() * 6),
        spinV: randUnit().multiplyScalar(0.05 + r() * 0.35),
        e: 0.3,
        spin: 0.4,
        t0: 1e9,
        t1: -1,
        hits: 0,
        ...o,
        sc,
        R: o.s * Math.max(sc.x, sc.y, sc.z),
      };
    };

    run();
    const near = [];
    for (let i = 0; i < 40; i++) {
      const tc = 49.5 + r() * 12;
      const c = com(Math.min(tc, 61));
      const { fwd, side, up } = frame(Math.min(tc, 61));
      const off = 3.8 + r() * 13;
      const a = r() * TAU;
      const dir = randUnit();
      dir.addScaledVector(fwd, -dir.dot(fwd) * 0.6).normalize();
      near.push(
        mkRock({
          kind: 'near',
          p0: c
            .clone()
            .addScaledVector(side, Math.cos(a) * off)
            .addScaledVector(up, Math.sin(a) * off * 0.7),
          v: dir.multiplyScalar(0.7 + r() * 2.6),
          tc,
          s: 0.25 + Math.pow(r(), 2.2) * 1.9,
          t0: 40,
          t1: 64,
        }),
      );
    }
    const far = [];
    const pathPts = [];
    for (let t = 29; t <= 64; t += 0.5) pathPts.push(com(t));
    for (let i = 0, tries = 0; i < 520 && tries < 5000; tries++) {
      const tt = 44 + r() * 30;
      const c = com(Math.min(tt, 63));
      const off = 30 + Math.pow(r(), 0.8) * 170;
      const a = r() * TAU;
      const b2 = (r() - 0.5) * 2;
      const sz = 0.6 + Math.pow(r(), 2.6) * 10;
      const pp = c.clone().add(V3(Math.cos(a) * off, b2 * off * 0.5, Math.sin(a) * off));
      if (pathPts.some((q) => q.distanceTo(pp) < 22 + sz * 1.2)) continue;
      i++;
      far.push(
        mkRock({
          kind: 'far',
          p0: pp,
          v: randUnit().multiplyScalar(r() * 0.3),
          tc: tt,
          s: sz,
        }),
      );
    }
    colliders = near.slice();
    run();
    const pebbles = [];
    [
      [53.2, 1],
      [55.8, 0],
      [58.4, 1],
    ].forEach(([tt, j], k) => {
      const b = at(j, tt);
      const { fwd, side, up } = frame(tt);
      const u = side
        .clone()
        .multiplyScalar(k % 2 ? 1 : -1)
        .addScaledVector(up, 0.5 - k * 0.4)
        .addScaledVector(fwd, -0.3)
        .normalize();
      const s = 0.3 + k * 0.05;
      const pb = mkRock({
        kind: 'pebble',
        sc: V3(1, 0.9, 1),
        s,
        tc: tt,
        v: b.v.clone().addScaledVector(u, 1.1),
        p0: b.p.clone().addScaledVector(u, -(RB + s - 0.03)),
        t0: tt - 8,
        t1: tt + 8,
        e: 0.4,
        spin: 0.8,
      });
      pebbles.push(pb);
      colliders.push(pb);
      run();
    });
    const TH = 61.4;
    const f61 = frame(TH);
    const bA = at(0, TH);
    const bB = at(1, TH);
    const sideSign = Math.sign(tA.subVectors(bB.p, bA.p).dot(f61.side)) || 1;
    const from = f61.fwd
      .clone()
      .multiplyScalar(0.55)
      .addScaledVector(f61.side, sideSign * 0.8)
      .addScaledVector(f61.up, 0.12)
      .normalize();
    const big = mkRock({
      kind: 'big',
      big: true,
      sc: V3(1.05, 0.88, 1),
      s: 2.3,
      tc: TH,
      v: bB.v.clone().addScaledVector(from, -4.2),
      p0: bB.p.clone().addScaledVector(from, RB + 2.3 * 1.05 - 0.05),
      t0: 50,
      t1: 64,
      e: 0.3,
      spin: 0.5,
    });
    colliders.push(big);
    run();
    const all = () => [...near, ...pebbles, big, ...far];
    const solid = () => [...near, ...pebbles, big];
    return {
      at,
      com,
      frame,
      BH,
      big,
      sideSign,
      rockPos,
      rocks: all(),
      get bigHit() {
        return bigHit;
      },
      finalize(camFn) {
        for (let it = 0; it < 3; it++) {
          let changed = false;
          for (let i = near.length - 1; i >= 0; i--) {
            const rk = near[i];
            for (let t = 42; t <= 64; t += 0.1) {
              if (camFn(t).pos.distanceTo(rockPos(rk, t, tA)) < rk.R + 1.4) {
                near.splice(i, 1);
                if (rk.hits) changed = true;
                break;
              }
            }
          }
          if (!changed) break;
          colliders = solid();
          run();
        }
        const S64 = com(64).add(V3(0, 22, -2));
        beamAxis = S64;
        this.rocks = all();
      },
      avoid(pos, t) {
        for (const rk of solid()) {
          const rp = rockPos(rk, t, tA);
          const d = tB.subVectors(pos, rp);
          const L = d.length();
          const minD = rk.R + 0.9;
          if (L < minD) pos.copy(rp).addScaledVector(d.divideScalar(L || 1), minD);
        }
        if (t < 64)
          [0, 1].forEach((j) => {
            const bp = at(j, t).p;
            const d = tB.subVectors(pos, bp);
            const L = d.length();
            if (L < 0.85) pos.copy(bp).addScaledVector(d.divideScalar(L || 1), 0.85);
          });
        return pos;
      },
    };
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
    SIM.rocks.length + 4,
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
    [D.g, V.g, shipRoot, cam].forEach((o) => (on ? R.scene : scene).add(o));
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
        .lerp(c.clone().add(V3(-34, 9, -49)), (1 - k) * 0.6);
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
      const sepV = V3().subVectors(SIM.at(1, t).p, SIM.at(0, t).p);
      const sep = sepV.length();
      sepV.divideScalar(sep || 1);
      const upF = V3().crossVectors(side, fwd);
      const perp = fwd
        .clone()
        .multiplyScalar(-0.75)
        .addScaledVector(upF, 0.45)
        .addScaledVector(side, 0.35);
      perp.addScaledVector(sepV, -perp.dot(sepV)).normalize();
      const back = lerpV(
        fwd.clone().negate().multiplyScalar(3.6),
        perp.multiplyScalar(sep * 0.78 + 3.8),
        k,
      );
      pos
        .copy(c)
        .add(back)
        .add(V3(0, lerp(0.8, 1.6, k), 0));
      tgt.copy(c);
    } else {
      const fwd = SIM.at(0, Math.min(t, 61.3)).v.clone().normalize();
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
            .addScaledVector(side, 3.5 * SIM.sideSign)
            .add(V3(0, 2.4, 0)),
          ease(seg(t, 61.4, 64)),
        );
      tgt.copy(c).addScaledVector(fwd, lerp(0.3, 2.2, k) * (1 - ease(seg(t, 60, 64)) * 0.5));
    }
    return { pos, tgt };
  };

  SIM.finalize(camPath);
  const SHIP0 = SIM.com(64).add(V3(0, 22, -2));
  const F61 = SIM.frame(61.3);
  const SHIPFROM = SHIP0.clone()
    .addScaledVector(F61.fwd, -340)
    .add(V3(0, 170, 0));
  const shipPath = (t) => {
    if (t < 64.5) {
      const k = 1 - Math.pow(1 - seg(t, 57.5, 64.5), 3);
      return SHIPFROM.clone().lerp(SHIP0, k);
    }
    if (t < 80.5) return SHIP0.clone().add(V3(0, Math.sin(t * 0.8) * 0.08, 0));
    const k = ease(seg(t, 80.5, 86.4));
    return SHIP0.clone().add(V3(0, k * 8, -k * 30 - Math.pow(seg(t, 86.4, 86.9), 3) * 3000));
  };
  const ARRIVE = V3(0, 0, -5000);
  const camIn = ARRIVE.clone().add(V3(16, 6, 34));
  const ring81 = (() => {
    const orbit = 0.4 + 17 * 0.07;
    return V3(Math.sin(orbit) * 20, -4, Math.cos(orbit) * 20)
      .add(SHIP0)
      .sub(shipPath(81));
  })();

  const lookLocal = (rig, p) => {
    rig.g.updateMatrixWorld(true);
    const l = rig.g.worldToLocal(p.clone());
    const h = Math.hypot(l.x, l.z);
    return {
      l: l.normalize(),
      yaw: clamp(Math.atan2(l.x, l.z), -1.1, 1.1),
      pitch: clamp(-Math.atan2(l.y, h), -0.7, 0.8),
    };
  };
  const aimArm = (pose, i, dir, k) => {
    const s = i === 0 ? 1 : -1;
    const a = pose.arms[i];
    const p = clamp(Math.atan2(dir.z, -dir.y), -0.4, 3.0);
    const ab = clamp(Math.asin(clamp(dir.x * s, -1, 1)), 0.05, 1.3);
    a.p = lerp(a.p, p, k);
    a.a = lerp(a.a, ab, k);
    a.e = lerp(a.e, 0.12, k);
    a.g = lerp(a.g, 0.25, k);
    return pose;
  };

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
    heartG.group.visible = !city && t < 26;
    bh.group.visible = !city && t > 12.5 && t < 31;
    glare.visible = false;
    warp.mesh.visible = false;
    planet.group.visible = !city && t >= 89.4;
    cards.group.visible = false;
    hearts.forEach((h) => (h.visible = false));
    rockInst.visible = !city && t > 29.3 && t < 86.7;
    neb.mesh.visible = !city;
    cloud.material.opacity = 0;
    shipRoot.visible = t > 57.5 && t < 121 && !(t > 86.9 && t < 89.5);
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
      heartG.group.position.copy(SIM.com(0)).add(V3(-105, 24, -150));
      heartG.group.lookAt(SIM.com(0));
      heartG.group.updateMatrixWorld(true);
      const HU = heartG.U;
      HU.uTime.value = t;
      HU.uForm.value = ease(seg(t, 0.3, 8.8));
      const ph = t >= 1 ? (t - 1) % 1.05 : 9;
      HU.uBeat.value =
        (Math.exp(-ph * 10) + (ph >= 0.24 ? 0.6 * Math.exp(-(ph - 0.24) * 10) : 0)) *
        (1 - seg(t, 12, 14));
      HU.uRed.value = seg(t, 12, 14.5);
      HU.uSuck.value = ease(seg(t, 13.6, 23));
      HU.uFade.value = seg(t, 22.4, 25.5);
      HU.uSink.value.copy(heartG.group.worldToLocal(SIM.BH.clone()));
      heartG.core.material.opacity = 0.5 * HU.uForm.value * (1 - seg(t, 13, 17));
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
      if (t > 40 && t < 64) SIM.avoid(pos, t);
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
      const thr = t < 64 ? SIM.at(1, t).th : 0;
      if (thr > 0.03)
        V.A.flames.forEach((f) => {
          f.visible = true;
          f.scale.set(1, (0.5 + thr * 1.4) * (1 + Math.sin(t * 40) * 0.12), 1);
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
        const toV = lookLocal(D, V.g.position);
        const toD = lookLocal(V, D.g.position);
        dPose = P.mix(P.swim(t, 0.3), P.struggle(t, 0.3, 1), sk * 0.6);
        aimArm(dPose, 1, toV.l, seg(t, 41, 45) * 0.9);
        dPose.head.y = lerp(dPose.head.y, toV.yaw, seg(t, 33, 36));
        dPose.head.p = lerp(dPose.head.p, toV.pitch, seg(t, 33, 36));
        const wild = P.mix(P.swim(t, 1.1), P.struggle(t, 1.1, 1), sk * 0.6);
        const ctl = P.float(t * 0.6, 2.4);
        ctl.arms[1] = { p: 0.95 + Math.sin(t * 1.3) * 0.05, a: 0.22, e: 1.95, g: 0.9 };
        ctl.legs.forEach((l, i) => {
          l.p = 0.06 + Math.sin(t * 0.9 + i * 2) * 0.05;
          l.a = 0.05;
          l.k = 0.22 + Math.sin(t * 1.1 + i) * 0.08;
        });
        aimArm(ctl, 0, toD.l, 0.55 + 0.4 * clamp(thr * 2, 0, 1));
        ctl.head.y = toD.yaw;
        ctl.head.p = toD.pitch;
        if (thr < 0.05 && t > 36.5) {
          ctl.arms[0].a = lerp(ctl.arms[0].a, 1.0, 0.5);
          ctl.arms[0].p = lerp(ctl.arms[0].p, 0.9, 0.5);
        }
        vPose = P.mix(wild, ctl, ease(seg(t, 34.6, 36.4)));
      } else if (t < 61.4) {
        dPose = P.reach(P.float(t, 0), 1, 1);
        vPose = P.reach(P.float(t, 1.7), 0, 1);
      } else {
        dPose = P.limp(t, 0);
        vPose = P.limp(t, 1);
      }
      if (rockInst.visible) {
        rockInst.count = SIM.rocks.length;
        SIM.rocks.forEach((rk, i) => {
          eul.set(rk.rot.x + rk.spinV.x * t, rk.rot.y + rk.spinV.y * t, rk.rot.z + rk.spinV.z * t);
          qq.setFromEuler(eul);
          sc.copy(rk.sc).multiplyScalar(rk.s);
          m4.compose(SIM.rockPos(rk, t), qq, sc);
          rockInst.setMatrixAt(i, m4);
        });
        rockInst.instanceMatrix.needsUpdate = true;
      }
      const HT = SIM.bigHit || 61.4;
      if (t > HT - 0.1 && t < 64) {
        const s = pulse(t, HT, HT + 1, 0.05);
        pos.x += (Math.sin(t * 91) + Math.sin(t * 57)) * s * 0.25;
        pos.y += (Math.cos(t * 83) + Math.sin(t * 41)) * s * 0.25;
        FU.uFlash.value = pulse(t, HT - 0.02, HT + 0.3, 0.04) * 0.45;
      }
      if (t > 61.4) {
        FU.uDark.value = pulse(t, 61.6, 69, 1.4) * 0.85;
        blur = pulse(t, 61.6, 67, 1.4) * 4;
      }
      if (t > 57.5) {
        const charge = seg(t, 84, 86.4);
        shipRoot.position.copy(shipPath(t));
        shipRoot.rotation.set(-0.1 * seg(t, 81, 84), 0, 0);
        shipRoot.scale.set(1, 1, 1 + Math.pow(seg(t, 86.4, 86.9), 2) * 45);
        ship.group.rotation.y = t * 0.05;
        ship.ring.rotation.y = -t * (0.5 + charge * 3);
        ship.lights.rotation.y = t * 0.4;
        ship.BU.uOn.value = pulse(t, 64.5, 81, 1) * 0.55;
        ship.beam.scale.set(1, 0.85, 1);
        ship.update(t, { hatch: pulse(t, 63.8, 81.6, 1), charge });
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
          if (t > 75.5) pos.lerp(ring(20, -4, SHIP0), ease(seg(t, 75.5, 80.5)));
          tgt = lerpV(cp64.tgt, mid.clone().add(V3(0, 1.2, 0)), ease(seg(t, 64, 70)));
          if (t > 75.5) tgt.lerp(SHIP0.clone().add(V3(0, -2.5, 0)), ease(seg(t, 75.5, 80)));
          FU.uFlash.value = Math.max(
            FU.uFlash.value,
            pulse(t, 75.2, 76, 0.15) * 0.4,
            pulse(t, 79.6, 80.8, 0.4) * 0.3,
          );
        } else if (t < 86.4) {
          const sp = shipPath(t);
          pos = sp.clone().add(lerpV(ring81, V3(14, 4, 32), ease(seg(t, 81, 85.6))));
          tgt = sp.clone().add(V3(0, 0, -lerp(0, 8, seg(t, 81, 86))));
          FU.uCA.value = 0.0012 + seg(t, 85, 86.4) * 0.004;
        } else {
          const s86 = shipPath(86.4);
          const run = Math.pow(seg(t, 86.4, 89.4), 1.6) * 400;
          pos = s86.clone().add(V3(14, 4, 32 - run));
          tgt = pos.clone().add(V3(-6, -2, -40));
          const sw = seg(t, 86.3, 87);
          warp.mesh.visible = t < 89.6;
          warp.mesh.material.color.setRGB(lerp(1, 0.75, sw), lerp(1, 0.9, sw), 1);
          warp.set(t, 120 + sw * 380, 0.3 + sw * 9 - seg(t, 89.2, 89.5) * 9);
          FU.uCA.value = 0.004 + sw * 0.012;
          FU.uFlash.value = Math.max(pulse(t, 86.5, 87.1, 0.12) * 0.55, seg(t, 89, 89.4) * 0.9);
          neb.U.uDark.value = 0.9 * pulse(t, 86.6, 89.5, 0.4);
        }
        if (t > 84 && t < 86.4) {
          warp.mesh.visible = true;
          warp.mesh.material.color.setRGB(1, 1, 1);
          warp.set(t, 30 + seg(t, 84, 86.4) * 90, 0.05 + Math.pow(seg(t, 84.6, 86.4), 2) * 1.5);
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
      if (t >= 89.4) {
        warp.mesh.visible = t < 89.6;
        planet.group.position.copy(ARRIVE).add(V3(0, -70, -230));
        planet.group.scale.setScalar(1.6);
        planet.group.rotation.y = t * 0.015;
        planet.U.uTime.value = t;
        planet.U.uSun.value.set(-0.7, 0.35, 0.6).normalize();
        const kin = seg(t, 89.45, 90.2);
        const k = ease(seg(t, 90.2, 97));
        const sp = ARRIVE.clone().add(
          V3(-2 - k * 26, -k * 52, -k * 132 + Math.pow(1 - kin, 4) * 420),
        );
        shipRoot.position.copy(sp);
        shipRoot.rotation.set(0.12, 0, 0);
        shipRoot.scale.set(1, 1, 1 + Math.pow(1 - kin, 2) * 40);
        ship.group.rotation.y = t * 0.05;
        ship.update(t, { charge: 1 - kin });
        ship.BU.uOn.value = 0;
        pos = camIn.clone().add(V3(2 * k, -18 * k * k, -62 * k * k));
        tgt = sp.clone().lerp(planet.group.position, 0.72 * ease(seg(t, 89.8, 93.5)));
        cloud.material.opacity = ease(seg(t, 94.6, 96.6));
        FU.uFlash.value = 0.9 * (1 - seg(t, 89.4, 90.4));
        FU.uWarm.value = 0.25;
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
      shipRoot.position.copy(sp);
      shipRoot.rotation.set(0, 0, 0);
      shipRoot.scale.setScalar(1.1);
      ship.group.rotation.y = t * 0.05;
      ship.ring.rotation.y = -t * 0.6;
      ship.lights.rotation.y = t * 0.4;
      ship.BU.uOn.value = pulse(t, 101.4, 104.2, 0.4) + pulse(t, 108.8, 111.4, 0.4);
      ship.beam.scale.set(1.2, 1.12 * 1.33, 1.2);
      ship.update(t, { hatch: pulse(t, 100.6, 105, 0.8) + pulse(t, 108, 112.2, 0.8) });
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
    heartG.U.uPx.value = pr;
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
    [D.g, V.g, shipRoot].forEach((o) => o.parent && o.parent.remove(o));
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
