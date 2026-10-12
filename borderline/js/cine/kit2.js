const CineKit2 = (() => {
  const HASH = `
    float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  `;

  const ENV_GLSL = `
    uniform float uEnvI;
    vec3 fEnv(vec3 d, float r) {
      float y = d.y;
      vec3 c = mix(vec3(0.05, 0.045, 0.08), vec3(0.36, 0.32, 0.46), smoothstep(-0.4, 0.9, y));
      float e1 = mix(22.0, 3.0, r);
      float e2 = mix(12.0, 2.5, r);
      c += vec3(1.0, 0.58, 0.78) * pow(max(0.0, dot(d, normalize(vec3(-0.6, 0.5, 0.6)))), e1) * mix(3.2, 0.9, r);
      c += vec3(0.5, 0.85, 1.0) * pow(max(0.0, dot(d, normalize(vec3(0.7, 0.2, -0.5)))), e2) * mix(1.6, 0.6, r);
      c += vec3(0.95, 0.9, 1.0) * smoothstep(0.9, 1.0, abs(sin(d.x * 3.0 + d.y * 2.0))) * smoothstep(0.2, 0.8, y) * 0.25 * (1.0 - r);
      c += vec3(0.2, 0.11, 0.24) * smoothstep(0.0, -0.5, y);
      return c;
    }
  `;
  const ENV_APPLY = `
    #include <lights_fragment_end>
    {
      vec3 eN = normalize(normal);
      vec3 eV = normalize(vViewPosition);
      vec3 rw = inverseTransformDirection(reflect(-eV, eN), viewMatrix);
      float fres = pow(1.0 - saturate(dot(eN, eV)), 5.0);
      vec3 F0 = mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);
      vec3 spec = F0 + (1.0 - F0) * fres * (1.0 - roughnessFactor * 0.7);
      reflectedLight.indirectSpecular += fEnv(rw, roughnessFactor) * spec * uEnvI;
      reflectedLight.indirectDiffuse += fEnv(inverseTransformDirection(eN, viewMatrix), 1.0) * diffuseColor.rgb * (1.0 - metalnessFactor) * 0.35 * uEnvI;
    }
  `;
  const envPatch = (sh, k = 1) => {
    sh.uniforms.uEnvI = { value: k };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + ENV_GLSL)
      .replace('#include <lights_fragment_end>', ENV_APPLY);
  };
  const envify = (m, k = 1) => {
    m.onBeforeCompile = (sh) => envPatch(sh, k);
    return m;
  };

  const panelHull = (opts) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: opts.color || '#d8dae8',
      metalness: opts.metal ?? 0.82,
      roughness: opts.rough ?? 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
    });
    const U = { uTime: { value: 0 }, uGlyph: { value: opts.glyph ?? 0 } };
    m.userData.U = U;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vObj;
          uniform float uTime, uGlyph;
          ${HASH}`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          float rr = length(vObj.xz);
          float an = atan(vObj.z, vObj.x) / 6.28318 + 0.5;
          float ringId = floor(rr / 1.05);
          float segs = max(12.0, floor(rr * 5.0 / 3.0) * 3.0);
          float aa = an * segs + h1(ringId) * 3.0;
          float sid = floor(aa);
          float fa = fract(aa);
          float fr = fract(rr / 1.05);
          float lw = 0.035 / max(rr, 1.0) * segs * 0.16;
          float groove = smoothstep(0.0, lw, fa) * smoothstep(0.0, lw, 1.0 - fa);
          groove *= smoothstep(0.0, 0.035, fr) * smoothstep(0.0, 0.035, 1.0 - fr);
          float pid = h2(vec2(sid, ringId));
          diffuseColor.rgb *= mix(0.42, 1.0, groove) * (0.93 + pid * 0.12);
          float rivet = smoothstep(0.012, 0.0, abs(fr - 0.12)) * step(0.5, fract(aa * 4.0 + 0.25));
          diffuseColor.rgb *= 1.0 - rivet * 0.25;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + (pid - 0.5) * 0.16 + (1.0 - groove) * 0.35, 0.05, 1.0);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float gl = step(0.94, pid) * groove * uGlyph;
          float blink = 0.55 + 0.45 * sin(uTime * (1.5 + pid * 3.0) + pid * 40.0);
          float glyph = step(0.35, fract(fa * 3.0)) * step(0.4, fract(fr * 4.0)) * step(fa, 0.8) * step(0.2, fa) * step(0.3, fr) * step(fr, 0.7);
          totalEmissiveRadiance += mix(vec3(0.45, 0.9, 1.0), vec3(1.0, 0.4, 0.62), step(0.93, pid)) * gl * glyph * blink * 2.2;`,
        );
      envPatch(sh, opts.envI ?? 1.2);
    };
    return m;
  };

  const glowMat = (hex, k = 3) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex).multiplyScalar(k),
      toneMapped: false,
    });

  const windowBand = (r, y0, y1, n, U) => {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 256, 1, true).translate(
      0,
      (y0 + y1) / 2,
      0,
    );
    const m = new THREE.ShaderMaterial({
      uniforms: U,
      toneMapped: false,
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime, uCharge;
        varying vec2 vUv;
        ${HASH}
        void main() {
          float a = vUv.x * ${n.toFixed(1)};
          float id = floor(a);
          float f = fract(a);
          float win = step(0.18, f) * step(f, 0.82) * step(0.25, vUv.y) * step(vUv.y, 0.78);
          float lit = step(0.22, h1(id + 3.0));
          vec3 warm = vec3(1.0, 0.78, 0.55);
          vec3 cool = vec3(0.55, 0.9, 1.0);
          vec3 c = mix(cool, warm, step(0.7, h1(id)));
          float fl = 0.85 + 0.15 * sin(uTime * 3.0 + id);
          vec3 frame = vec3(0.06, 0.06, 0.09);
          vec3 col = mix(frame, c * (1.6 + uCharge * 2.0) * fl, win * lit);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    return new THREE.Mesh(g, m);
  };

  const alienShip = () => {
    const g = new THREE.Group();
    const U = { uTime: { value: 0 }, uCharge: { value: 0 } };
    const hull = panelHull({ glyph: 1, color: '#e6e4ee', metal: 0.72, rough: 0.3 });
    const hullDark = panelHull({ color: '#6c6f86', metal: 0.9, rough: 0.38, glyph: 1 });
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const top = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          V2(12.05, 0.02),
          V2(11.6, 0.16),
          V2(10.6, 0.34),
          V2(8.6, 0.66),
          V2(6.2, 0.98),
          V2(5.72, 1.04),
          V2(5.7, 1.26),
          V2(5.5, 1.3),
          V2(3.4, 1.56),
          V2(3.22, 1.58),
          V2(3.2, 1.74),
          V2(3.0, 1.78),
          V2(1.7, 1.9),
          V2(0.0, 1.92),
        ],
        256,
      ),
      hull,
    );
    const bot = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          V2(0.0, -1.88),
          V2(2.62, -1.88),
          V2(2.66, -1.78),
          V2(4.0, -1.74),
          V2(4.2, -1.56),
          V2(6.6, -1.32),
          V2(6.82, -1.12),
          V2(9.4, -0.76),
          V2(11.4, -0.32),
          V2(12.05, -0.04),
        ],
        256,
      ),
      hullDark,
    );
    g.add(top, bot);
    const TOP = [
      [12.05, 0.02],
      [11.6, 0.16],
      [10.6, 0.34],
      [8.6, 0.66],
      [6.2, 0.98],
      [5.72, 1.04],
    ];
    const BOT = [
      [12.05, -0.04],
      [11.4, -0.32],
      [9.4, -0.76],
      [6.82, -1.12],
    ];
    const prof = (P, rr) => {
      for (let i = 0; i < P.length - 1; i++) {
        const [r0, y0] = P[i];
        const [r1, y1] = P[i + 1];
        if (rr <= r0 && rr >= r1) {
          const k = (r0 - rr) / (r0 - r1);
          return [lerp(y0, y1, k), Math.atan2(y1 - y0, r0 - r1)];
        }
      }
      return [P[P.length - 1][1], 0];
    };
    const greebleMat = envify(
      new THREE.MeshStandardMaterial({ color: '#c4c3d6', metalness: 0.8, roughness: 0.32 }),
      1.1,
    );
    const gr = rng(31);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const NG = 300;
    const greebles = new THREE.InstancedMesh(box, greebleMat, NG);
    const gm = new THREE.Matrix4();
    const gq = new THREE.Quaternion();
    const ge = new THREE.Euler();
    for (let i = 0; i < NG; i++) {
      const top = i < NG * 0.7;
      const band = gr() < 0.5;
      const rr = top
        ? band
          ? 7.0 + gr() * 0.7
          : 9.6 + gr() * 0.8
        : band
          ? 7.4 + gr() * 0.6
          : 10.4 + gr() * 0.6;
      const [y, sl] = prof(top ? TOP : BOT, rr);
      const a = gr() * TAU;
      const sx = 0.08 + gr() * 0.28;
      const sz = 0.06 + gr() * 0.2;
      const sy = 0.025 + gr() * 0.06;
      ge.set(0, -a, top ? -sl : sl, 'YXZ');
      gq.setFromEuler(ge);
      gm.compose(
        V3(Math.cos(a) * rr, y + (top ? sy / 2 : -sy / 2), Math.sin(a) * rr),
        gq,
        V3(sx, sy, sz),
      );
      greebles.setMatrixAt(i, gm);
    }
    g.add(greebles);
    const accent = (rr, P, hex, k, up) => {
      const [y] = prof(P, rr);
      const t = new THREE.Mesh(
        new THREE.TorusGeometry(rr, 0.025, 8, 256).rotateX(Math.PI / 2),
        glowMat(hex, k),
      );
      t.position.y = y + (up ? 0.012 : -0.012);
      g.add(t);
    };
    accent(10.95, TOP, '#7ce0ff', 1.6, true);
    accent(8.0, TOP, '#ff8fb4', 1.2, true);
    accent(10.2, BOT, '#7ce0ff', 1.4, false);
    const rimBand = new THREE.Mesh(
      new THREE.CylinderGeometry(12.12, 12.12, 0.12, 256, 1, true),
      envify(new THREE.MeshStandardMaterial({ color: '#25263a', metalness: 1, roughness: 0.25 })),
    );
    g.add(rimBand);
    g.add(windowBand(3.245, 1.6, 1.72, 64, U));
    g.add(windowBand(5.75, 1.07, 1.23, 96, U));

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(1.62, 96, 48, 0, TAU, 0, Math.PI / 2),
      envify(
        new THREE.MeshPhysicalMaterial({
          color: '#a6ecff',
          metalness: 0,
          roughness: 0.04,
          clearcoat: 1,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        }),
        2.2,
      ),
    );
    glass.position.y = 1.9;
    glass.renderOrder = 3;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 3), glowMat('#ff8fb4', 3.2));
    core.position.y = 2.45;
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.035, 12, 96),
      glowMat('#7ce0ff', 2.6),
    );
    coreRing.position.y = 2.45;
    const coreRing2 = coreRing.clone();
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.08, 96),
      envify(new THREE.MeshStandardMaterial({ color: '#2a2a3c', metalness: 0.8, roughness: 0.35 })),
    );
    deck.position.y = 1.95;
    g.add(glass, core, coreRing, coreRing2, deck);
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.08, 1.6, 16).translate(0, 0.8, 0),
      envify(new THREE.MeshStandardMaterial({ color: '#c9cbe0', metalness: 1, roughness: 0.2 })),
    );
    spire.position.y = 3.5;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glowMat('#ff6a96', 4));
    tip.position.y = 5.12;
    g.add(spire, tip);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.05, 1.1, 10).translate(0, 0.55, 0),
        spire.material,
      );
      ant.position.set(Math.cos(a) * 4.4, 1.44, Math.sin(a) * 4.4);
      ant.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
      const at = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glowMat('#7ce0ff', 4));
      at.position.y = 1.12;
      ant.add(at);
      g.add(ant);
    }

    const lights = new THREE.Group();
    const lc = glowMat('#7ce0ff', 3.4);
    const lp = glowMat('#ff6a96', 3.4);
    const lw = glowMat('#fff2dc', 3.4);
    const bulb = new THREE.SphereGeometry(0.11, 12, 8);
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU;
      const b = new THREE.Mesh(bulb, i % 4 === 0 ? lp : i % 4 === 2 ? lw : lc);
      b.position.set(Math.cos(a) * 12.16, 0, Math.sin(a) * 12.16);
      lights.add(b);
    }
    g.add(lights);

    const ring = new THREE.Group();
    const ringMat = envify(
      new THREE.MeshStandardMaterial({
        color: '#8f95b8',
        metalness: 0.95,
        roughness: 0.22,
      }),
      1.2,
    );
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(13.6, 0.26, 24, 256).rotateX(Math.PI / 2),
      ringMat,
    );
    const runeU = { uTime: U.uTime, uCharge: U.uCharge };
    const runes = new THREE.Mesh(
      new THREE.TorusGeometry(13.6, 0.275, 8, 256, TAU).rotateX(Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: runeU,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader:
          'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime, uCharge;
          varying vec2 vUv;
          ${HASH}
          void main() {
            float a = vUv.x * 180.0 - uTime * (2.0 + uCharge * 18.0);
            float id = floor(a);
            float f = fract(a);
            float on = step(0.45, h1(id)) * step(0.2, f) * step(f, 0.7);
            float band = smoothstep(0.42, 0.5, vUv.y) * smoothstep(0.58, 0.5, vUv.y);
            vec3 c = mix(vec3(1.0, 0.42, 0.65), vec3(0.5, 0.9, 1.0), step(0.75, h1(id + 9.0)));
            float k = on * band * (0.8 + uCharge * 2.5);
            gl_FragColor = vec4(c * k * 2.0, k);
          }
        `,
      }),
    );
    ring.add(torus, runes);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const py = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.34), ringMat);
      py.position.set(Math.cos(a) * 12.85, 0, Math.sin(a) * 12.85);
      py.rotation.y = -a;
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), ringMat);
      pod.scale.set(1, 0.7, 1);
      pod.position.set(Math.cos(a) * 13.6, 0, Math.sin(a) * 13.6);
      const pl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), i % 2 ? lp : lc);
      pl.position.copy(pod.position).add(V3(0, 0.24, 0));
      ring.add(py, pod, pl);
    }
    ring.position.y = -0.05;
    g.add(ring);

    const engines = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.26;
      const e = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 24), hullDark);
      shell.scale.set(1, 0.55, 1);
      const er = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.07, 12, 64).rotateX(Math.PI / 2),
        glowMat('#7ce0ff', 3),
      );
      er.position.y = -0.42;
      const ed = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 48).rotateX(Math.PI / 2),
        glowMat('#bff4ff', 2.2),
      );
      ed.position.y = -0.47;
      e.add(shell, er, ed);
      e.position.set(Math.cos(a) * 8.3, -0.95, Math.sin(a) * 8.3);
      g.add(e);
      engines.push(ed);
    }

    const hatchGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 96).rotateX(Math.PI / 2),
      glowMat('#bff4ff', 0.8),
    );
    hatchGlow.position.y = -1.9;
    g.add(hatchGlow);
    const petals = [];
    const petalMat = panelHull({ color: '#55586e', metal: 0.9, rough: 0.35 });
    petalMat.side = THREE.DoubleSide;
    for (let i = 0; i < 8; i++) {
      const pg = new THREE.Group();
      const p = new THREE.Mesh(
        new THREE.CircleGeometry(2.66, 32, 0, TAU / 8 + 0.04).rotateX(Math.PI / 2),
        petalMat,
      );
      pg.add(p);
      pg.rotation.y = (i / 8) * TAU;
      pg.position.y = -1.93;
      g.add(pg);
      petals.push(pg);
    }

    const BU = { uTime: U.uTime, uOn: { value: 0 } };
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 9.5, 40, 128, 24, true).translate(0, -20, 0),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: BU,
        vertexShader: `
          varying vec2 vUv;
          varying float vFres;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            vFres = abs(dot(n, normalize(-mv.xyz)));
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform float uTime, uOn;
          varying vec2 vUv;
          varying float vFres;
          ${HASH}
          void main() {
            float y = vUv.y;
            float rings = smoothstep(0.7, 1.0, sin(y * 60.0 + uTime * 5.0)) * 0.6;
            float streak = pow(abs(sin(vUv.x * 3.14159 * 24.0 + uTime * 0.6 + sin(y * 9.0 + uTime) * 0.4)), 10.0);
            float edge = pow(1.0 - vFres, 2.0);
            float a = (0.12 + edge * 0.45 + rings * 0.25 + streak * 0.18) * smoothstep(0.0, 0.3, y) * (0.55 + 0.45 * y) * (1.0 - smoothstep(0.8, 1.0, y) * 0.65) * uOn;
            gl_FragColor = vec4(vec3(0.62, 0.95, 1.0) * a, a);
          }
        `,
      }),
    );
    beam.position.y = -1.9;
    g.add(beam);
    const beamLight = new THREE.PointLight('#9fefff', 0, 60, 1.6);
    beamLight.position.y = -8;
    g.add(beamLight);

    const all = [hull, hullDark, petalMat];
    return {
      group: g,
      lights,
      ring,
      beam,
      BU,
      U,
      update(t, { hatch = 0, charge = 0 } = {}) {
        U.uTime.value = t;
        U.uCharge.value = charge;
        all.forEach((m) => (m.userData.U.uTime.value = t));
        core.rotation.set(t * 0.4, t * 0.7, 0);
        coreRing.rotation.set(Math.PI / 2 + Math.sin(t * 0.8) * 0.4, t * 0.9, 0);
        coreRing2.rotation.set(Math.cos(t * 0.6) * 0.5, -t * 1.1, Math.PI / 3);
        core.scale.setScalar(1 + Math.sin(t * 3) * 0.06 + charge * 0.4);
        petals.forEach((p, i) => {
          const a = (i / 8) * TAU;
          p.position.x = Math.cos(a + 0.2) * hatch * 2.0;
          p.position.z = -Math.sin(a + 0.2) * hatch * 2.0;
          p.position.y = -1.93 + hatch * 0.06;
        });
        hatchGlow.visible = hatch > 0.02;
        engines.forEach((e) =>
          e.material.color.setRGB(0.75, 0.95, 1).multiplyScalar(2 + charge * 4),
        );
        beamLight.intensity = BU.uOn.value * 3.5;
        tip.visible = Math.sin(t * 4) > -0.2;
      },
    };
  };

  // the voyage heart-galaxy lives in js/world/heart.js (shared with the game)
  const heartGalaxy = (n = 56000, k = 4) => Heart.galaxy(n, k, 9);

  return { envify, alienShip, heartGalaxy, panelHull };
})();
