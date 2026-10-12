// Sculpted enemy models: the Veilleurs' chess pieces, in obsidian marble, gold and glowing
// glass. Geometries and materials are built once (on the first spawn) and shared between
// instances; only the parts whose colour changes per enemy (eyes, hearts, ghost shells) are
// per-instance materials. Every model keeps the interface the game logic drives:
// { g, body, eye, ... } plus an optional anim(e, dt, t) called each frame by Enemies.render.
(() => {
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const lathe = (pts, seg = 48) =>
    new THREE.LatheGeometry(
      pts.map(([x, y]) => V2(x, y)),
      seg,
    );
  const once = (fn) => {
    let v = null;
    return () => v || (v = fn());
  };
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const hq = () => typeof SETTINGS === 'undefined' || SETTINGS.quality !== 'low';

  // ---------- materials ----------
  // object-space triplanar PBR (world-space triplanar would make the texture swim on moving
  // enemies) + a small procedural environment so metal and marble catch light in dark rooms
  const ENV = `
    vec3 eEnv(vec3 d, float r) {
      vec3 c = mix(vec3(0.02, 0.018, 0.025), vec3(0.16, 0.15, 0.19), smoothstep(-0.4, 0.9, d.y));
      c += vec3(1.0, 0.9, 0.82) * pow(max(0.0, dot(d, normalize(vec3(-0.6, 0.55, 0.6)))), mix(30.0, 3.0, r)) * mix(2.2, 0.35, r);
      c += vec3(0.6, 0.78, 1.0) * pow(max(0.0, dot(d, normalize(vec3(0.7, 0.25, -0.5)))), mix(18.0, 2.5, r)) * mix(1.1, 0.2, r);
      c += vec3(1.0, 0.9, 0.75) * smoothstep(0.9, 1.0, abs(sin(d.x * 2.6 + d.y * 1.7))) * smoothstep(0.1, 0.8, d.y) * 0.25 * (1.0 - r);
      return c;
    }
  `;
  const MAT = (kind, o = {}) => {
    const m = new THREE.MeshStandardMaterial({
      color: o.color || '#ffffff',
      roughness: o.rough != null ? o.rough : 0.5,
      metalness: o.metal || 0,
      emissive: o.emissive || '#000000',
      emissiveIntensity: o.ei != null ? o.ei : 1,
      side: o.side || THREE.FrontSide,
    });
    let T = null;
    if (kind && hq())
      try {
        T = Tex.build(kind);
      } catch (e) {
        T = null;
      }
    const scale = 1 / (o.scale || 1.5);
    const bump = (o.bump != null ? o.bump : 1) * 0.05;
    const env = o.env != null ? o.env : 1;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uEnvI = { value: env };
      let fs = sh.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nuniform float uEnvI;\n' + ENV,
      );
      if (T) {
        sh.uniforms.tAlb = { value: T.albedo };
        sh.uniforms.tDat = { value: T.data };
        sh.uniforms.triScale = { value: scale };
        sh.uniforms.triBump = { value: bump };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vTriP;\nvarying vec3 vTriN;')
          .replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvTriP = position;\nvTriN = normal;',
          );
        fs = fs
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vTriP;
            varying vec3 vTriN;
            uniform sampler2D tAlb;
            uniform sampler2D tDat;
            uniform float triScale;
            uniform float triBump;
            vec4 triSample(sampler2D t) {
              vec3 w = pow(abs(normalize(vTriN)), vec3(4.0));
              w /= (w.x + w.y + w.z);
              vec3 p = vTriP * triScale;
              return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
            }`,
          )
          .replace(
            '#include <map_fragment>',
            'diffuseColor.rgb *= triSample(tAlb).rgb;\nvec4 triD = triSample(tDat);',
          )
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * (0.55 + triD.g * 0.6);')
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>
            {
              float h = triD.r * triBump * clamp(1.6 - length(vViewPosition) / 30.0, 0.0, 1.0);
              vec3 dpx = dFdx(-vViewPosition);
              vec3 dpy = dFdy(-vViewPosition);
              vec3 r1 = cross(dpy, normal);
              vec3 r2 = cross(normal, dpx);
              float det = dot(dpx, r1);
              if (abs(det) > 1e-8) {
                vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
                normal = normalize(abs(det) * normal - grad);
              }
            }`,
          );
      }
      fs = fs.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 eN = normalize(normal);
          vec3 eV = normalize(vViewPosition);
          vec3 rw = inverseTransformDirection(reflect(-eV, eN), viewMatrix);
          float fres = pow(1.0 - saturate(dot(eN, eV)), 5.0);
          vec3 F0 = mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);
          vec3 spec = F0 + (1.0 - F0) * fres * (1.0 - roughnessFactor * 0.7);
          reflectedLight.indirectSpecular += eEnv(rw, roughnessFactor) * spec * uEnvI;
          reflectedLight.indirectDiffuse += eEnv(inverseTransformDirection(eN, viewMatrix), 1.0) * diffuseColor.rgb * (1.0 - metalnessFactor) * 0.3 * uEnvI;
        }`,
      );
      sh.fragmentShader = fs;
    };
    m.customProgramCacheKey = () => 'emod' + (T ? 't' : 'p');
    return m;
  };

  const M = once(() => ({
    obsidian: MAT('marble', { color: '#2a2333', rough: 0.3, metal: 0.1, scale: 1.2, bump: 0.5, env: 1.3 }),
    stone: MAT('stone', { color: '#4e4456', rough: 0.85, scale: 1.6, bump: 1.4, env: 0.6 }),
    gold: MAT(null, { color: '#e0a83e', rough: 0.28, metal: 1, env: 2.2 }),
    darkGold: MAT(null, { color: '#b07a2c', rough: 0.36, metal: 1, env: 2 }),
    steel: MAT(null, { color: '#b8b4c8', rough: 0.2, metal: 1, env: 1.8 }),
    blackSteel: MAT('concrete', {
      color: '#2a2630',
      rough: 0.3,
      metal: 0.85,
      scale: 3,
      bump: 0.25,
      env: 1.8,
    }),
    crimson: MAT('plaster', {
      color: '#4e0716',
      rough: 0.85,
      scale: 1.5,
      bump: 0.6,
      side: THREE.DoubleSide,
      env: 0.6,
    }),
    velvet: MAT('plaster', {
      color: '#2a0a24',
      rough: 0.9,
      scale: 1.5,
      bump: 0.5,
      side: THREE.DoubleSide,
      env: 0.5,
    }),
    void: new THREE.MeshBasicMaterial({ color: '#000000' }),
    rune: glow('#ff4f6a', 1.4),
    runeBlue: glow('#6cc8ff', 1.5),
    jewel: glow('#ff2a4a', 2.2),
    gem: new THREE.MeshStandardMaterial({
      color: '#ff7aa8',
      roughness: 0.08,
      metalness: 0.3,
      emissive: '#ff3a7a',
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  }));

  // ---------- shared shapes ----------
  const heartShape = (k) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * TAU;
      const sn = Math.sin(t);
      const x = 16 * sn * sn * sn * k;
      const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k;
      if (i) s.lineTo(x, y);
      else s.moveTo(x, y);
    }
    return s;
  };
  // the voyage heart (x = 16 sin³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t), ~0.9 wide
  const heartGeo = once(() =>
    new THREE.ExtrudeGeometry(heartShape(0.028), {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.07,
      bevelThickness: 0.11,
      bevelSegments: 5,
      curveSegments: 6,
    }).center(),
  );
  // faceted version for the crystal that holds the Oui
  const crystalGeo = once(() =>
    new THREE.ExtrudeGeometry(heartShape(0.06), {
      depth: 0.5,
      bevelEnabled: true,
      bevelSize: 0.22,
      bevelThickness: 0.35,
      bevelSegments: 1,
      curveSegments: 3,
      steps: 1,
    }).center(),
  );
  const spadeGeo = once(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1);
    s.bezierCurveTo(0.2, 0.6, 0.9, 0.3, 0.6, -0.2);
    s.bezierCurveTo(0.35, -0.55, 0.05, -0.3, 0.06, -0.15);
    s.lineTo(0.2, -0.7);
    s.lineTo(-0.2, -0.7);
    s.lineTo(-0.06, -0.15);
    s.bezierCurveTo(-0.05, -0.3, -0.35, -0.55, -0.6, -0.2);
    s.bezierCurveTo(-0.9, 0.3, -0.2, 0.6, 0, 1);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 3,
      curveSegments: 10,
    }).center();
  });
  const torus = (r, tube, arc = TAU, rs = 10, ts = 64) => new THREE.TorusGeometry(r, tube, rs, ts, arc);
  // horizontal ring at height y
  const ringGeo = (r, tube) => torus(r, tube).rotateX(Math.PI / 2);
  // a glowing visor slit wrapped around a head of radius r, centred on +z
  const visorGeo = (r, tube, arc) =>
    torus(r, tube, arc, 8, 24)
      .rotateX(Math.PI / 2)
      .rotateY(-Math.PI / 2 + arc / 2);

  // radial halo sprite used behind every glowing heart
  const haloMat = once(
    () =>
      new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const x = c.getContext('2d');
          const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
          gr.addColorStop(0, 'rgba(255,225,238,1)');
          gr.addColorStop(0.22, 'rgba(255,95,150,0.5)');
          gr.addColorStop(1, 'rgba(120,20,80,0)');
          x.fillStyle = gr;
          x.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        })(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.6,
        toneMapped: false,
      }),
  );

  // a tiny heart galaxy (same palette as the voyage finale) living inside the gems
  const GU = { uTime: { value: 0 } };
  const galaxyGeo = (n, k) => {
    const r = rng(5 + n);
    const P = new Float32Array(n * 3);
    const A = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const t = r() * TAU;
      const edge = r() < 0.45;
      const rad = edge ? 0.95 + r() * 0.08 : Math.pow(r(), 0.55);
      const sn = Math.sin(t);
      const x = 16 * sn * sn * sn;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5;
      const ang = (1 - Math.min(rad, 1)) * 2.4;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      P.set(
        [(x * c - y * s) * rad * k, (x * s + y * c) * rad * k, (r() - 0.5) * k * 6 * (1.1 - rad)],
        i * 3,
      );
      A.set([Math.min(rad, 1), r()], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(A, 2));
    return g;
  };
  const galaxyMat = once(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: GU,
        vertexShader: `
          attribute vec2 aR;
          uniform float uTime;
          varying vec3 vC;
          varying float vA;
          void main() {
            vec3 p = position;
            float sw = (1.0 - aR.x) * sin(uTime * 0.8 + aR.y * 6.0) * 0.25;
            p.xy = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xy;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.4 + aR.y * 2.4) * (60.0 / -mv.z);
            vec3 c = mix(vec3(1.45, 1.22, 0.95), vec3(1.35, 0.32, 0.62), smoothstep(0.0, 0.62, aR.x));
            c = mix(c, vec3(0.75, 0.35, 1.35), smoothstep(0.75, 1.0, aR.x) * aR.y);
            vC = c;
            vA = 0.55 + 0.45 * sin(uTime * 2.0 + aR.y * 50.0);
          }
        `,
        fragmentShader: `
          varying vec3 vC;
          varying float vA;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float a = pow(1.0 - d * 2.0, 2.0);
            gl_FragColor = vec4(vC * a * vA, a * vA);
          }
        `,
      }),
  );
  const galGeoS = once(() => galaxyGeo(500, 0.026));
  const galGeoL = once(() => galaxyGeo(1800, 0.058));

  // a glowing heart gem: per-instance colour (the game pulses it when vulnerable)
  const heartGem = (col = '#ff5f8a', k = 2.5, big = false) => {
    const heart = new THREE.Mesh(heartGeo(), glow(col, k));
    const gal = new THREE.Points(big ? galGeoL() : galGeoS(), galaxyMat());
    gal.position.z = 0.2;
    gal.frustumCulled = false;
    const halo = new THREE.Sprite(haloMat());
    halo.scale.setScalar(2.2);
    halo.position.z = -0.05;
    heart.add(gal, halo);
    return heart;
  };

  // energy shield: fresnel + scrolling hex cells, one material per colour
  const shieldMat = (col) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: GU.uTime, uCol: { value: new THREE.Color(col) } },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vV;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uCol;
        varying vec3 vN;
        varying vec3 vV;
        varying vec2 vUv;
        float hex(vec2 p) {
          p.x *= 1.1547;
          p.y += mod(floor(p.x), 2.0) * 0.5;
          p = abs(fract(p) - 0.5);
          return abs(max(p.x * 1.5 + p.y, p.y * 2.0) - 1.0);
        }
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          float h = smoothstep(0.08, 0.0, hex(vUv * vec2(28.0, 14.0)));
          float sweep = smoothstep(0.92, 1.0, sin(vUv.y * 12.0 - uTime * 3.0));
          float a = f * 0.75 + h * (0.12 + f * 0.5) + sweep * 0.08;
          gl_FragColor = vec4(uCol * 1.6 * a, a);
        }
      `,
    });
  const SH = once(() => ({ blue: shieldMat('#6cc8ff'), pink: shieldMat('#ff4f86') }));

  // ---------- baking: merge the static meshes of a model into one mesh per material ----------
  // A King is ~150 parts; drawn one by one that is 150 draw calls per enemy. Each model is
  // built as usual, then bake() merges every static mesh under `root` (skipping anything
  // flagged userData.dyn: animated parts, recoloured parts with their own transform...).
  // Merged geometries are cached per model, so every later instance reuses them.
  const BAKED = new Map();
  const m4 = new THREE.Matrix4();
  const dyn = (o) => {
    o.userData.dyn = true;
    return o;
  };
  const mergeGeos = (list) => {
    const parts = list.map(([geo, mat]) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.applyMatrix4(mat);
      return g;
    });
    let n = 0;
    parts.forEach((g) => (n += g.attributes.position.count));
    const P = new Float32Array(n * 3);
    const N = new Float32Array(n * 3);
    const U = new Float32Array(n * 2);
    let o = 0;
    parts.forEach((g) => {
      const c = g.attributes.position.count;
      P.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) N.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) U.set(g.attributes.uv.array.subarray(0, c * 2), o * 2);
      o += c;
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    out.computeBoundingSphere();
    return out;
  };
  const bake = (key, root) => {
    const found = [];
    const walk = (obj) => {
      obj.children.slice().forEach((c) => {
        if (c.userData.dyn) return;
        if (c.isMesh && !c.children.length) found.push(c);
        else if (c.children.length) walk(c);
      });
    };
    walk(root);
    if (found.length < 2) return;
    const mats = [];
    found.forEach((c) => !mats.includes(c.material) && mats.push(c.material));
    let geos = BAKED.get(key);
    if (!geos || geos.length !== mats.length) {
      root.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      geos = mats.map((mt) =>
        mergeGeos(
          found
            .filter((c) => c.material === mt)
            .map((c) => [c.geometry, new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld)]),
        ),
      );
      BAKED.set(key, geos);
    }
    found.forEach((c) => c.parent.remove(c));
    mats.forEach((mt, i) => root.add(new THREE.Mesh(geos[i], mt)));
  };

  // a little movement memory so floating pieces lean into their motion
  const lean = (m, e, dt, k) => {
    if (!m.lp) m.lp = e.pos.clone();
    const vx = (e.pos.x - m.lp.x) / Math.max(dt, 1e-3);
    const vz = (e.pos.z - m.lp.z) / Math.max(dt, 1e-3);
    m.lp.copy(e.pos);
    const c = Math.cos(e.yaw);
    const s = Math.sin(e.yaw);
    const fwd = vx * s + vz * c;
    m.body.rotation.x = damp(m.body.rotation.x, clamp(fwd * k, -0.35, 0.35), 6, dt);
  };

  // ======================= PION =======================
  const pawnGeo = once(() =>
    lathe(
      [
        [0.001, -0.78],
        [0.44, -0.78],
        [0.5, -0.74],
        [0.5, -0.66],
        [0.44, -0.62],
        [0.46, -0.56],
        [0.38, -0.5],
        [0.29, -0.4],
        [0.23, -0.22],
        [0.19, -0.02],
        [0.17, 0.06],
        [0.3, 0.1],
        [0.33, 0.15],
        [0.3, 0.2],
        [0.16, 0.23],
        [0.001, 0.25],
      ],
      48,
    ),
  );
  Enemies.model('pion', () => {
    const m = M();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    add(body, pawnGeo(), m.obsidian);
    const head = add(body, new THREE.SphereGeometry(0.29, 32, 20), m.obsidian, 0, 0.47, 0);
    head.scale.y = 1.05;
    add(body, ringGeo(0.3, 0.035), m.gold, 0, 0.17, 0);
    add(body, ringGeo(0.47, 0.03), m.gold, 0, -0.64, 0);
    add(body, ringGeo(0.2, 0.025), m.gold, 0, 0.27, 0);
    const eye = add(body, visorGeo(0.292, 0.032, 1.9), glow('#ff2a3a', 2.4), 0, 0.5, 0);
    // a small crest of three gold blades
    for (let i = -1; i <= 1; i++) {
      const b = add(body, new THREE.ConeGeometry(0.04, 0.26, 6), m.gold, i * 0.1, 0.78 - Math.abs(i) * 0.04, -0.04);
      b.rotation.z = -i * 0.35;
    }
    const emb = add(body, spadeGeo(), m.gold, 0, -0.26, 0.24);
    emb.scale.setScalar(0.17);
    emb.rotation.x = -0.12;
    add(body, new THREE.SphereGeometry(0.035, 10, 8), m.jewel, 0, -0.25, 0.27);
    // hover: glowing rune ring and a soft thruster cone under the piece
    const ring = add(g, ringGeo(0.55, 0.022), m.rune, 0, -0.9, 0);
    const ring2 = add(g, ringGeo(0.38, 0.015), m.rune, 0, -1.0, 0);
    const jet = add(
      g,
      new THREE.ConeGeometry(0.32, 0.5, 20, 1, true).rotateX(Math.PI),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff4f6a').multiplyScalar(0.8),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      0,
      -1.02,
      0,
    );
    bake('pion', body);
    return {
      g,
      body,
      eye,
      anim(e, dt, t) {
        ring.rotation.y = t * 1.6 + e.id;
        ring2.rotation.y = -t * 2.3;
        ring.scale.setScalar(1 + Math.sin(t * 4 + e.id) * 0.05);
        jet.scale.y = 0.85 + Math.sin(t * 17 + e.id) * 0.15;
        lean(this, e, dt, 0.07);
      },
    };
  });

  // ======================= TOUR =======================
  const rookGeo = once(() =>
    lathe(
      [
        [0.001, 0],
        [0.86, 0],
        [0.9, 0.06],
        [0.86, 0.16],
        [0.74, 0.22],
        [0.76, 0.3],
        [0.66, 0.36],
        [0.56, 0.5],
        [0.5, 0.8],
        [0.46, 1.3],
        [0.44, 1.8],
        [0.5, 1.95],
        [0.62, 2.05],
        [0.68, 2.18],
        [0.68, 2.3],
        [0.001, 2.3],
      ],
      56,
    ),
  );
  const crenelGeo = once(() => {
    const s = new THREE.Shape();
    const a0 = -0.26;
    const a1 = 0.26;
    s.absarc(0, 0, 0.7, a0, a1, false);
    s.absarc(0, 0, 0.5, a1, a0, true);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
      curveSegments: 8,
    }).rotateX(-Math.PI / 2);
  });
  Enemies.model('tour', () => {
    const m = M();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    add(body, rookGeo(), m.stone);
    for (let i = 0; i < 6; i++) {
      const c = add(body, crenelGeo(), m.stone, 0, 2.3, 0);
      c.rotation.y = (i / 6) * TAU;
    }
    add(body, ringGeo(0.78, 0.035), m.gold, 0, 0.27, 0);
    add(body, ringGeo(0.5, 0.03), m.gold, 0, 1.92, 0);
    add(body, ringGeo(0.69, 0.03), m.gold, 0, 2.24, 0);
    // arrow slits glowing from inside
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const sl = add(
        body,
        new THREE.BoxGeometry(0.07, 0.38, 0.06),
        m.rune,
        Math.sin(a) * 0.465,
        1.35,
        Math.cos(a) * 0.465,
      );
      sl.rotation.y = a;
    }
    // the floating eye in the battlements, with a gold iris ring around it
    const eye = dyn(add(body, new THREE.SphereGeometry(0.2, 20, 14), glow('#ff2a3a', 2.4), 0, 2.72, 0));
    const iris = dyn(add(body, torus(0.3, 0.035, TAU, 8, 40), m.gold, 0, 2.72, 0));
    const iris2 = dyn(add(body, torus(0.38, 0.015, TAU, 6, 40), m.rune, 0, 2.72, 0));
    const shield = add(g, new THREE.SphereGeometry(1.6, 40, 24), SH().blue, 0, 1.6, 0);
    bake('tour', body);
    return {
      g,
      body,
      eye,
      shield,
      anim(e, dt, t) {
        iris.rotation.x = Math.sin(t * 0.9 + e.id) * 0.6;
        iris.rotation.y = t * 1.2;
        iris2.rotation.y = -t * 0.8;
        iris2.rotation.x = Math.PI / 2 + Math.sin(t * 0.7) * 0.4;
        eye.position.y = 2.72 + Math.sin(t * 2 + e.id) * 0.05;
      },
    };
  });

  // ======================= CAVALIER (and the Cavalier noir) =======================
  const neckGeo = once(() => new THREE.CylinderGeometry(0.19, 0.3, 0.95, 28, 4));
  const sphere = once(() => new THREE.SphereGeometry(1, 32, 20));
  const pedestalGeo = once(() =>
    lathe(
      [
        [0.001, 0],
        [0.64, 0],
        [0.66, 0.05],
        [0.62, 0.12],
        [0.52, 0.17],
        [0.54, 0.24],
        [0.44, 0.3],
        [0.38, 0.42],
        [0.36, 0.58],
        [0.42, 0.64],
        [0.44, 0.7],
        [0.001, 0.72],
      ],
      48,
    ),
  );
  const bladeGeo = once(() => new THREE.ConeGeometry(0.06, 0.34, 4).scale(0.5, 1, 1.6));
  const knight = (scale, eyeCol, mat, trim) => {
    const m = M();
    const g = new THREE.Group();
    const body = new THREE.Group();
    add(body, pedestalGeo(), mat);
    add(body, ringGeo(0.6, 0.03), trim, 0, 0.08, 0);
    add(body, ringGeo(0.43, 0.035), trim, 0, 0.66, 0);
    const head = new THREE.Group();
    head.position.y = 1.18;
    head.scale.setScalar(1.25);
    body.add(head);
    // sculpted head: neck, chest, skull, muzzle and jowls, so it reads from every side
    const neck = add(head, neckGeo(), mat, 0, -0.08, -0.04);
    neck.rotation.x = 0.28;
    add(head, sphere(), mat, 0, -0.36, 0.04).scale.set(0.36, 0.3, 0.4);
    add(head, sphere(), mat, 0, 0.47, 0.1).scale.set(0.23, 0.25, 0.3);
    const muzzle = add(head, sphere(), mat, 0, 0.33, 0.4);
    muzzle.scale.set(0.15, 0.15, 0.3);
    muzzle.rotation.x = 0.55;
    [-1, 1].forEach((sx) => add(head, sphere(), mat, sx * 0.1, 0.36, 0.1).scale.set(0.11, 0.17, 0.2));
    // ears
    [-1, 1].forEach((sx) => {
      const ear = add(head, new THREE.ConeGeometry(0.055, 0.24, 10), mat, sx * 0.1, 0.76, 0.02);
      ear.rotation.set(-0.2, 0, -sx * 0.25);
    });
    // gold mane: blades along the crest of the neck
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      const b = add(head, bladeGeo(), trim, 0, 0.68 - k * 0.9, -0.1 - k * 0.32);
      b.rotation.x = -0.75 - k * 0.45;
      b.scale.setScalar(1.15 - k * 0.4);
    }
    // bridle around the muzzle, cheek straps, brow band
    const bridle = add(head, torus(0.16, 0.022, TAU, 8, 40), trim, 0, 0.3, 0.5);
    bridle.scale.set(0.95, 0.95, 1);
    bridle.rotation.x = 0.55;
    const brow = add(head, torus(0.22, 0.02, Math.PI, 8, 24), trim, 0, 0.55, 0.12);
    brow.rotation.set(-0.35, 0, 0);
    [-1, 1].forEach((sx) => {
      const strap = add(head, new THREE.BoxGeometry(0.02, 0.3, 0.03), trim, sx * 0.17, 0.42, 0.32);
      strap.rotation.x = 0.7;
    });
    // nostrils and eyes
    [-1, 1].forEach((sx) => add(head, new THREE.SphereGeometry(0.028, 8, 6), m.void, sx * 0.06, 0.2, 0.62));
    const eyes = [-1, 1].map((sx) => {
      const e = add(head, new THREE.SphereGeometry(0.05, 12, 8), glow(eyeCol, 2.6), sx * 0.19, 0.52, 0.2);
      e.scale.set(0.6, 0.8, 1.3);
      e.rotation.y = sx * 0.4;
      return e;
    });
    // spade medallion on the chest
    const med = add(head, spadeGeo(), trim, 0, -0.3, 0.42);
    med.scale.setScalar(0.16);
    add(head, new THREE.SphereGeometry(0.03, 10, 8), m.jewel, 0, -0.29, 0.46);
    body.scale.setScalar(scale);
    g.add(body);
    return { g, body, eye: eyes[0], eyes, head };
  };

  Enemies.model('cavalier', () => {
    const m = M();
    const k = knight(1.05, '#ff3a5a', m.obsidian, m.gold);
    k.bodyScale = 1.05;
    // a violet barding cloth over the pedestal
    const cloth = add(
      k.body,
      new THREE.CylinderGeometry(0.47, 0.6, 0.34, 32, 1, true),
      m.velvet,
      0,
      0.42,
      0,
    );
    cloth.scale.z = 1.02;
    add(k.body, ringGeo(0.6, 0.02), m.runeBlue, 0, 0.26, 0);
    bake('cavalier', k.body);
    return k;
  });

  Enemies.model('gardien', () => {
    const m = M();
    const k = knight(2.6, '#ff2a3a', m.blackSteel, m.darkGold);
    // horns
    [-1, 1].forEach((sx) => {
      const h = add(
        k.head,
        new THREE.ConeGeometry(0.05, 0.5, 10).translate(0, 0.25, 0),
        m.gold,
        sx * 0.12,
        0.72,
        0.02,
      );
      h.rotation.set(-0.7, 0, -sx * 0.55);
    });
    const rim = add(k.g, ringGeo(0.62 * 2.6, 0.05), glow('#ff4f6a', 1.8), 0, 0.3, 0);
    const rim2 = add(k.g, ringGeo(0.62 * 2.6 + 0.35, 0.025), glow('#ff4f6a', 1), 0, 0.05, 0);
    // breastplate hiding the heart until he is stunned
    const plateShape = new THREE.Shape();
    plateShape.moveTo(-0.7, 0.55);
    plateShape.lineTo(0.7, 0.55);
    plateShape.quadraticCurveTo(0.72, -0.2, 0, -0.68);
    plateShape.quadraticCurveTo(-0.72, -0.2, -0.7, 0.55);
    const plate = new THREE.Group();
    add(
      plate,
      new THREE.ExtrudeGeometry(plateShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.05,
        bevelSegments: 3,
      }).translate(0, 0, -0.04),
      m.blackSteel,
    );
    const pt = add(plate, spadeGeo(), m.gold, 0, 0.02, 0.1);
    pt.scale.setScalar(0.42);
    add(plate, new THREE.SphereGeometry(0.06, 12, 8), m.jewel, 0, 0.05, 0.16);
    plate.position.set(0, 2.7, 1.02);
    const heart = heartGem('#ff5f8a', 2.5);
    heart.position.set(0, 2.7, 0.94);
    // lance: fluted shaft, vamplate, glowing tip
    const lance = new THREE.Group();
    const shaft = add(
      lance,
      lathe(
        [
          [0.001, -0.6],
          [0.13, -0.6],
          [0.15, -0.3],
          [0.1, 0],
          [0.11, 2.5],
          [0.06, 4.8],
          [0.001, 4.9],
        ],
        24,
      ).rotateX(Math.PI / 2),
      m.darkGold,
      0,
      0,
      0.6,
    );
    shaft.castShadow = false;
    add(
      lance,
      new THREE.ConeGeometry(0.22, 1.2, 12).rotateX(Math.PI / 2),
      glow('#c9c2ff', 1.6),
      0,
      0,
      5.9,
    );
    add(lance, new THREE.ConeGeometry(0.55, 0.9, 24, 1, true).rotateX(-Math.PI / 2), m.blackSteel, 0, 0, 0.45);
    add(lance, ringGeo(0.55, 0.03).rotateX(Math.PI / 2), m.gold, 0, 0, 0.9);
    for (let i = 0; i < 4; i++)
      add(lance, ringGeo(0.115, 0.02).rotateX(Math.PI / 2), m.gold, 0, 0, 1.4 + i * 0.9);
    lance.position.set(1.3, 2.4, 0);
    // crest: a ring of floating gold spikes over his head
    const crest = new THREE.Group();
    add(crest, torus(0.9, 0.05, TAU, 8, 48), glow('#ff4f6a', 1.4));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const sp = add(crest, new THREE.ConeGeometry(0.07, 0.4, 6), m.gold, Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0);
      sp.rotation.z = a - Math.PI / 2;
    }
    crest.position.y = 4.6;
    crest.rotation.x = Math.PI / 2;
    // tattered banner hanging from the back of the neck
    const banner = add(k.g, new THREE.PlaneGeometry(1.2, 2.2, 4, 8), m.crimson, 0, 2.2, -1.25);
    k.g.add(heart, plate, lance, crest);
    bake('gardien', k.body);
    bake('gardien.plate', plate);
    bake('gardien.lance', lance);
    bake('gardien.crest', crest);
    return {
      ...k,
      heart,
      plate,
      lance,
      crest,
      bodyScale: 2.6,
      anim(e, dt, t) {
        rim2.rotation.y = t * 0.5;
        rim2.scale.setScalar(1 + Math.sin(t * 3) * 0.03);
        banner.rotation.x = 0.12 + Math.sin(t * 1.9 + e.id) * 0.07 + (e.st === 2 ? 0.5 : 0);
      },
    };
  });

  // ======================= SPECTRE =======================
  const robeGeo = once(() => {
    const g = lathe(
      [
        [0.001, 1.88],
        [0.16, 1.84],
        [0.3, 1.73],
        [0.38, 1.54],
        [0.36, 1.34],
        [0.47, 1.22],
        [0.5, 1.02],
        [0.54, 0.64],
        [0.62, 0.28],
        [0.72, 0.04],
      ],
      40,
    );
    // ragged hem and soft folds
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const low = clamp((0.6 - y) / 0.6, 0, 1);
      const f = 1 + Math.sin(a * 9) * 0.06 * low;
      p.setXYZ(i, x * f, y - low * (0.12 + 0.14 * Math.sin(a * 5 + 1.3) * Math.sin(a * 3)), z * f);
    }
    g.computeVertexNormals();
    return g;
  });
  // additive ghost material with a fresnel rim (per instance: its opacity is animated)
  const ghostMat = () => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c8f4ff').multiplyScalar(0.9),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFN;\nvarying vec3 vFV;\nvarying float vFY;')
        .replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvFN = normalize(normalMatrix * normal);\nvFV = -mvPosition.xyz;\nvFY = position.y;',
        );
      const out = `float fr = pow(1.0 - abs(dot(normalize(vFN), normalize(vFV))), 1.8);
        float fade = smoothstep(-0.1, 0.5, vFY);
        gl_FragColor = vec4(outgoingLight * (0.35 + fr * 1.8), diffuseColor.a * (0.18 + fr * 1.3) * fade);`;
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vFN;\nvarying vec3 vFV;\nvarying float vFY;',
      );
      sh.fragmentShader = sh.fragmentShader.includes('#include <output_fragment>')
        ? sh.fragmentShader.replace('#include <output_fragment>', out)
        : sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', out);
    };
    return m;
  };
  Enemies.model('spectre', () => {
    const m = M();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const mat = ghostMat();
    const shell = add(body, robeGeo(), mat);
    // the dark inside of the hood, the eyes floating in it
    const face = add(body, new THREE.SphereGeometry(0.25, 20, 14), m.void, 0, 1.5, 0.1);
    face.scale.set(1, 1.1, 0.8);
    const eyes = [-1, 1].map((sx) => {
      const ey = add(body, new THREE.SphereGeometry(0.045, 10, 8), glow('#ffffff', 3.2), sx * 0.1, 1.52, 0.3);
      ey.scale.set(1.4, 0.7, 1);
      return ey;
    });
    // wisp of a heart in the chest: what they took
    const core = dyn(add(body, new THREE.SphereGeometry(0.09, 16, 10), glow('#9fe6ff', 1.4), 0, 1.0, 0.1));
    const halo = new THREE.Sprite(haloMat());
    halo.scale.setScalar(0.6);
    halo.position.set(0, 1.0, 0.1);
    body.add(halo);
    // sleeves reaching forward
    const sleeves = [-1, 1].map((sx) => {
      const s = add(
        body,
        new THREE.ConeGeometry(0.14, 0.75, 12, 1, true).translate(0, -0.37, 0),
        mat,
        sx * 0.42,
        1.15,
        0.05,
      );
      s.rotation.set(-1.0, 0, sx * 0.2);
      return dyn(s);
    });
    const tails = [0, 1, 2].map((i) => {
      const tl = add(
        body,
        new THREE.ConeGeometry(0.16, 0.7, 8, 1, true).rotateX(Math.PI),
        mat,
        Math.cos(i * 2.1) * 0.35,
        -0.05,
        Math.sin(i * 2.1) * 0.35,
      );
      return dyn(tl);
    });
    // ghostly chain links orbiting slowly
    const chain = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const l = add(chain, torus(0.06, 0.015, TAU, 6, 12), mat, Math.cos(i * 0.32) * 0.7, Math.sin(i * 0.7) * 0.05, Math.sin(i * 0.32) * 0.7);
      l.rotation.set(i % 2 ? Math.PI / 2 : 0, i * 0.32, 0);
    }
    chain.position.y = 0.7;
    body.add(dyn(chain));
    bake('spectre.chain', chain);
    bake('spectre', body);
    return {
      g,
      body,
      eye: eyes[0],
      shell,
      tails,
      anim(e, dt, t) {
        sleeves.forEach((s, i) => (s.rotation.x = -1.0 + Math.sin(t * 2.4 + i * 1.7 + e.id) * 0.25));
        chain.rotation.y = t * 0.6 + e.id;
        core.scale.setScalar(1 + Math.sin(t * 5 + e.id) * 0.15);
        eyes[1].material.color.copy(eyes[0].material.color);
      },
    };
  });

  // ======================= LE ROI DE PIQUE =======================
  const robeKingGeo = once(() => {
    const g = lathe(
      [
        [0.001, 0],
        [2.2, 0],
        [2.15, 0.25],
        [1.95, 0.9],
        [1.7, 1.7],
        [1.45, 2.4],
        [1.3, 2.7],
        [0.001, 2.7],
      ],
      72,
    );
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const f = 1 + Math.sin(a * 14) * 0.035 * clamp(1 - y / 2.6, 0, 1);
      p.setXYZ(i, x * f, y, z * f);
    }
    g.computeVertexNormals();
    return g;
  });
  const torsoGeo = once(() =>
    lathe(
      [
        [0.001, 2.3],
        [1.32, 2.3],
        [1.18, 2.7],
        [1.08, 3.1],
        [1.22, 3.7],
        [1.3, 4.1],
        [1.1, 4.45],
        [0.55, 4.6],
        [0.001, 4.62],
      ],
      56,
    ),
  );
  const helmGeo = once(() =>
    lathe(
      [
        [0.001, 4.45],
        [0.5, 4.48],
        [0.62, 4.62],
        [0.74, 4.9],
        [0.76, 5.15],
        [0.7, 5.42],
        [0.52, 5.62],
        [0.001, 5.7],
      ],
      48,
    ),
  );
  const crownGeo = once(() => {
    // a band with eight points, cut from a cylinder profile
    const g = new THREE.CylinderGeometry(0.84, 0.8, 0.9, 64, 6, true);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const tip = Math.pow(Math.abs(Math.cos(a * 4)), 6);
      const top = (y + 0.45) / 0.9;
      const h = -0.45 + top * (0.38 + tip * 0.52);
      const flare = 1 + top * 0.12;
      p.setXYZ(i, x * flare, h, z * flare);
    }
    g.computeVertexNormals();
    return g;
  });
  const swordGeo = once(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.17, 0);
    s.lineTo(0.17, 0);
    s.lineTo(0.13, 3.9);
    s.lineTo(0, 4.4);
    s.lineTo(-0.13, 3.9);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.035,
      bevelSegments: 2,
    }).translate(0, 0, -0.015);
  });

  Enemies.model('roi', () => {
    const m = M();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    add(body, robeKingGeo(), m.crimson);
    add(body, ringGeo(2.17, 0.06), m.gold, 0, 0.12, 0);
    add(body, ringGeo(1.38, 0.08), m.gold, 0, 2.42, 0);
    // vertical gold embroidery down the robe
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const st = add(body, new THREE.BoxGeometry(0.06, 2.3, 0.04), m.darkGold, Math.sin(a) * 1.82, 1.2, Math.cos(a) * 1.82);
      st.lookAt(Math.sin(a) * 4, 1.2 + 0.7, Math.cos(a) * 4);
    }
    add(body, torsoGeo(), m.blackSteel);
    // chest plate with the spade, gold trim
    const breast = add(body, spadeGeo(), m.gold, 0, 3.95, 1.12);
    breast.scale.setScalar(0.42);
    breast.rotation.x = -0.25;
    add(body, ringGeo(1.12, 0.05), m.gold, 0, 3.1, 0);
    // gold straps from the shoulders framing the heart, and a tabard down the robe
    [-1, 1].forEach((sx) => {
      const st = add(body, new THREE.BoxGeometry(0.1, 1.25, 0.06), m.gold, sx * 0.55, 3.85, 1.12);
      st.rotation.set(-0.15, 0, sx * 0.55);
    });
    const tab = add(body, new THREE.PlaneGeometry(1.0, 2.1, 1, 6), m.velvet, 0, 1.25, 0);
    {
      const p = tab.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) + 1.25;
        p.setZ(i, 1.45 + (2.4 - y) * 0.33 + 0.09);
      }
      tab.geometry.computeVertexNormals();
    }
    tab.position.z = 0;
    const ts = add(body, spadeGeo(), m.gold, 0, 1.4, 1.93);
    ts.scale.setScalar(0.35);
    ts.rotation.x = -0.32;
    add(body, ringGeo(1.12, 0.04), m.gold, 0, 4.42, 0);
    // pauldrons with spikes
    [-1, 1].forEach((sx) => {
      const pd = add(body, new THREE.SphereGeometry(0.7, 28, 16, 0, TAU, 0, Math.PI * 0.55), m.blackSteel, sx * 1.35, 4.25, 0);
      pd.scale.set(1.15, 0.8, 1);
      pd.rotation.z = -sx * 0.35;
      add(body, ringGeo(0.62, 0.04), m.gold, sx * 1.42, 4.05, 0).rotation.z = -sx * 0.35;
      for (let i = 0; i < 3; i++) {
        const sp = add(body, new THREE.ConeGeometry(0.09, 0.55, 8), m.gold, sx * (1.25 + i * 0.22), 4.75 - i * 0.12, -0.15 + i * 0.12);
        sp.rotation.z = -sx * (0.5 + i * 0.25);
      }
    });
    add(body, ringGeo(0.62, 0.07), m.gold, 0, 4.5, 0);
    add(body, helmGeo(), m.blackSteel);
    const eye = add(body, visorGeo(0.765, 0.06, 1.7), glow('#ff2a3a', 2.4), 0, 5.05, 0);
    add(body, new THREE.BoxGeometry(0.07, 0.5, 0.08), m.gold, 0, 4.95, 0.74);
    // crown: pointed band, jewels, spade finial
    const crown = new THREE.Group();
    add(crown, crownGeo(), m.gold);
    add(crown, ringGeo(0.82, 0.05), m.gold, 0, -0.42, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      add(crown, new THREE.SphereGeometry(0.075, 12, 8), i % 2 ? m.jewel : m.runeBlue, Math.cos(a) * 0.9, -0.22, Math.sin(a) * 0.9);
      add(crown, new THREE.SphereGeometry(0.06, 10, 8), m.gold, Math.cos(a) * 0.92, 0.48, Math.sin(a) * 0.92);
    }
    add(crown, new THREE.SphereGeometry(0.62, 24, 12, 0, TAU, 0, Math.PI / 2), m.crimson, 0, -0.3, 0).scale.y = 0.7;
    const fin = add(crown, spadeGeo(), m.gold, 0, 0.62, 0);
    fin.scale.setScalar(0.38);
    const fin2 = fin.clone();
    fin2.rotation.y = Math.PI / 2;
    crown.add(fin2);
    crown.position.y = 5.82;
    body.add(crown);
    // halo of gold behind the head, with spade runes
    const halo = new THREE.Group();
    add(halo, torus(1.25, 0.04, TAU, 8, 72), m.gold);
    add(halo, torus(1.05, 0.015, TAU, 6, 72), m.rune);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const r = add(halo, spadeGeo(), m.gold, Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0);
      r.scale.setScalar(0.12);
      r.rotation.z = a - Math.PI / 2;
    }
    halo.position.set(0, 5.4, -0.85);
    body.add(dyn(halo));
    // the heart on his chest: the weak point, a gem of the voyage heart
    const heart = heartGem('#ff5f8a', 2.5);
    heart.position.set(0, 3.5, 1.2);
    // arms pivot at the shoulders
    const arms = [-1, 1].map((sd) => {
      const a = new THREE.Group();
      add(a, new THREE.CylinderGeometry(0.34, 0.42, 1.3, 20).translate(0, -0.65, 0), m.blackSteel);
      add(a, new THREE.SphereGeometry(0.38, 16, 12), m.blackSteel, 0, -1.3, 0);
      add(a, new THREE.CylinderGeometry(0.3, 0.36, 1.2, 20).translate(0, -1.95, 0), m.blackSteel);
      add(a, ringGeo(0.37, 0.04), m.gold, 0, -1.55, 0);
      add(a, new THREE.CylinderGeometry(0.42, 0.33, 0.45, 20), m.gold, 0, -2.35, 0);
      add(a, new THREE.SphereGeometry(0.34, 16, 12), m.blackSteel, 0, -2.7, 0);
      a.position.set(sd * 1.5, 4.2, 0);
      a.rotation.z = sd * 0.25;
      return a;
    });
    // the greatsword in his right hand
    const sword = new THREE.Group();
    add(sword, swordGeo(), m.steel).rotation.z = Math.PI;
    add(sword, new THREE.BoxGeometry(0.06, 3.8, 0.075), glow('#c9c2ff', 1.6), 0, -2.0, 0);
    add(sword, new THREE.BoxGeometry(1.3, 0.16, 0.2), m.gold, 0, 0.05, 0);
    [-1, 1].forEach((sx) => add(sword, new THREE.SphereGeometry(0.12, 12, 8), m.jewel, sx * 0.68, 0.05, 0));
    add(sword, new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), m.velvet, 0, 0.45, 0);
    add(sword, new THREE.SphereGeometry(0.13, 14, 10), m.gold, 0, 0.85, 0);
    sword.position.set(0, -2.75, 0.2);
    arms[1].add(sword);
    // shield in the left hand: a kite shield with the spade
    const kite = new THREE.Shape();
    kite.moveTo(0, 0.9);
    kite.quadraticCurveTo(0.75, 0.85, 0.7, 0.1);
    kite.quadraticCurveTo(0.5, -0.8, 0, -1.2);
    kite.quadraticCurveTo(-0.5, -0.8, -0.7, 0.1);
    kite.quadraticCurveTo(-0.75, 0.85, 0, 0.9);
    const buckler = new THREE.Group();
    add(
      buckler,
      new THREE.ExtrudeGeometry(kite, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.06,
        bevelSegments: 3,
      }),
      m.blackSteel,
    );
    const bs = add(buckler, spadeGeo(), m.gold, 0, -0.05, 0.2);
    bs.scale.setScalar(0.5);
    buckler.position.set(0.1, -2.5, 0.55);
    buckler.rotation.y = 0.3;
    arms[0].add(buckler);
    // cape: hangs from the shoulders, curved around the back
    const cape = new THREE.Group();
    // flares out over the robe; z(x, down) keeps the cloth outside the body everywhere
    const capeAt = (x, down, out) =>
      out.set(
        x * (1 + down * 0.5),
        -down * 4.6,
        -Math.cos((x / 1.8) * 1.15) * (0.7 + down * 1.75) -
          down * 0.15 +
          Math.sin(x * 3 + down * 4) * 0.07 * down -
          Math.abs(Math.sin(x * 4.5)) * 0.14 * (0.2 + down),
      );
    const capeGeo = new THREE.PlaneGeometry(3.6, 4.6, 16, 16).translate(0, -2.3, 0);
    {
      const p = capeGeo.attributes.position;
      const v = V3();
      for (let i = 0; i < p.count; i++) {
        capeAt(p.getX(i), -p.getY(i) / 4.6, v);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      capeGeo.computeVertexNormals();
    }
    add(cape, capeGeo, m.crimson);
    const hemPts = [];
    for (let i = 0; i <= 24; i++) hemPts.push(capeAt(-1.8 + (i / 24) * 3.6, 1, V3()));
    add(cape, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemPts), 48, 0.05, 6), m.gold);
    // standing collar behind the helm
    const collar = add(
      cape,
      new THREE.CylinderGeometry(1.0, 0.85, 0.5, 32, 1, true, Math.PI * 0.6, Math.PI * 0.8),
      m.crimson,
      0,
      0.05,
      0.6,
    );
    add(cape, torus(1.05, 0.04, Math.PI * 0.8, 6, 32).rotateX(Math.PI / 2).rotateY(Math.PI * 0.9), m.gold, 0, 0.3, 0.6);
    cape.position.set(0, 4.65, -0.55);
    // floating cards of his suit orbiting him
    const cards = new THREE.Group();
    const ranks = ['V', 'D', 'R', '10', '9', '7'];
    const cardMats = ranks.map((r) => {
      let tex = null;
      try {
        tex = Tex.card(r, '♠');
      } catch (e) {
        tex = null;
      }
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: '#ffffff',
        roughness: 0.4,
        emissive: '#ffffff',
        emissiveMap: tex,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      });
    });
    const cardGeo = new THREE.PlaneGeometry(0.62, 0.87);
    ranks.forEach((r, i) => {
      const c = add(cards, cardGeo, cardMats[i]);
      c.userData.a = (i / ranks.length) * TAU;
    });
    cards.position.y = 7.5;
    // floor sigil
    const sig = new THREE.Group();
    add(sig, ringGeo(2.7, 0.05), m.rune);
    add(sig, ringGeo(3.1, 0.025), m.rune);
    for (let i = 0; i < 4; i++) {
      const sp = add(sig, spadeGeo(), m.rune, Math.cos((i / 4) * TAU) * 2.9, 0, Math.sin((i / 4) * TAU) * 2.9);
      sp.scale.setScalar(0.22);
      sp.rotation.x = -Math.PI / 2;
    }
    sig.position.y = 0.06;
    const shield = add(g, new THREE.SphereGeometry(4.2, 48, 28), SH().pink, 0, 3, 0);
    // the crystal holding the Oui: faceted heart, gold cage, a heart galaxy inside
    const crystal = new THREE.Group();
    add(crystal, crystalGeo(), m.gem);
    const cg = new THREE.Points(galGeoL(), galaxyMat());
    cg.frustumCulled = false;
    crystal.add(cg);
    const ch = new THREE.Sprite(haloMat());
    ch.scale.setScalar(4.5);
    crystal.add(ch);
    for (let i = 0; i < 3; i++) {
      const cage = add(crystal, torus(1.35, 0.03, TAU, 6, 64), m.gold);
      cage.rotation.set((i * Math.PI) / 3, i * 0.8, 0);
    }
    crystal.position.y = 8;
    g.add(heart, ...arms, cape, cards, sig, shield, crystal);
    bake('roi', body);
    bake('roi.halo', halo);
    arms.forEach((a, i) => bake('roi.arm' + i, a));
    bake('roi.cape', cape);
    bake('roi.sig', sig);
    bake('roi.crystal', crystal);
    return {
      g,
      eye,
      shield,
      heart,
      crystal,
      arms,
      body,
      cape,
      anim(e, dt, t) {
        halo.rotation.z = t * 0.25;
        sig.rotation.y = -t * 0.2;
        cards.children.forEach((c, i) => {
          const a = c.userData.a + t * 0.35;
          c.position.set(Math.cos(a) * 1.9, Math.sin(t * 1.4 + i) * 0.15, Math.sin(a) * 1.9);
          c.rotation.set(0, -a + Math.PI / 2, Math.sin(t + i) * 0.1);
        });
        cards.visible = e.phase !== 3 || !e.crystal;
      },
    };
  });

  // keep the shared galaxy/shield clock running even when no King is on screen
  const tick = () => {
    GU.uTime.value = performance.now() / 1000;
    requestAnimationFrame(tick);
  };
  tick();
})();
