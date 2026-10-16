const HQ = (() => {
  const renderer = R.renderer;
  const SUN = new THREE.Vector3(6, 4, 3).normalize();
  const time = { value: 0 };
  const UPV = new THREE.Vector3(0, 1, 0);
  const rD = new THREE.Vector3();
  const NOISE3 = `
  float h3(vec3 p) {
    p = fract(p * .3183099 + .1);
    p *= 17.;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float n3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3. - 2. * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1., 0., 0.)), f.x), mix(h3(i + vec3(0., 1., 0.)), h3(i + vec3(1., 1., 0.)), f.x), f.y), mix(mix(h3(i + vec3(0., 0., 1.)), h3(i + vec3(1., 0., 1.)), f.x), mix(h3(i + vec3(0., 1., 1.)), h3(i + vec3(1., 1., 1.)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    float v = 0., a = .5;
    for (int i = 0; i < 4; i++) {
      v += a * n3(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= .5;
    }
    return v;
  }
`;
  const ENV_GLSL = `
  vec3 procEnv(vec3 d, float r) {
    d = normalize(d);
    vec3 c = mix(vec3(.02, .01, .035), vec3(.16, .06, .2), smoothstep(-.6, .9, d.y));
    c += vec3(.06, .12, .32) * pow(max(0., dot(d, normalize(vec3(-.8, -.2, -.5)))), 3.);
    c += vec3(.35, .1, .22) * pow(max(0., dot(d, normalize(vec3(.4, -.6, .7)))), 4.);
    c += vec3(.55, .42, .62) * exp(-pow(dot(d, normalize(vec3(.25, 1., .35))) * 3., 2.)) * .45;
    c += vec3(.95, .7, .45) * pow(max(0., d.y * .5 + .5), 3.) * .18;
    float sp = mix(400., 6., r * r);
    c += vec3(1.5, 1.38, 1.3) * pow(max(0., dot(d, uEnvSun)), sp) * mix(1., .12, r);
    return c;
  }
`;
  function envPatch(sh, k = 1) {
    sh.uniforms.uEnvSun = { value: SUN };
    sh.uniforms.uEnvK = { value: k };
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>' +
          String.fromCharCode(10) +
          'uniform vec3 uEnvSun; uniform float uEnvK;' +
          ENV_GLSL,
      )
      .replace(
        '#include <lights_fragment_end>',
        `
        #include <lights_fragment_end>
        {
          vec3 rv = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
          float fr = pow(1. - saturate(dot(normal, normalize(vViewPosition))), 5.);
          vec3 F = mix(material.specularColor, vec3(1.), fr * (1. - material.specularRoughness));
          reflectedLight.indirectSpecular += procEnv(rv, material.specularRoughness) * F * uEnvK;
          reflectedLight.indirectDiffuse += procEnv(inverseTransformDirection(normal, viewMatrix), 1.) * material.diffuseColor * .3 * uEnvK;
        }
      `,
      );
  }
  const pbr = (opts, k = 1) => {
    const m = new THREE.MeshStandardMaterial(opts);
    m.onBeforeCompile = (sh) => envPatch(sh, k);
    return m;
  };

  function sequinMat(color, { rough = 0.62, metal = 0.06, glint = 1, quilt = 1 } = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    m.onBeforeCompile = (sh) => {
      envPatch(sh, 0.8);
      sh.uniforms.uTime = time;
      sh.uniforms.uGlint = { value: glint };
      sh.uniforms.uQuilt = { value: quilt };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvObj = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));',
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float uTime, uGlint, uQuilt; varying vec3 vObj;\nfloat sq(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }' +
            NOISE3 +
            '\nfloat foldF(vec3 p){ vec3 q = p * vec3(7., 15., 7.) + vec3(0., p.x * 4., 0.); return n3(q) * .65 + n3(q * 2.1 + 3.7) * .35; }',
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        float fo = foldF(vObj);
        float cav = smoothstep(.62, .3, fo);
        diffuseColor.rgb *= mix(1., .7 + .3 * cav, .55) * (.94 + .1 * n3(vObj * 60.));`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          vec3 wq = vObj * 340.;
          float twill = .5 + .5 * sin(wq.x + wq.y + wq.z);
          vec3 gq = abs(fract(vObj * 34.) - .5);
          float rip = smoothstep(.43, .49, max(gq.x, max(gq.y, gq.z))) * uQuilt;
          roughnessFactor = clamp(roughnessFactor * (.88 + .22 * twill) + rip * .06, .05, 1.);
        `,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          {
            float e = .012, f0 = foldF(vObj);
            vec3 gr = vec3(foldF(vObj + vec3(e, 0., 0.)) - f0, foldF(vObj + vec3(0., e, 0.)) - f0, foldF(vObj + vec3(0., 0., e)) - f0) / e;
            vec3 gv = (viewMatrix * vec4(gr, 0.)).xyz;
            normal = normalize(normal - (gv - normal * dot(gv, normal)) * .028);
            normal = normalize(normal + vec3(sin(wq.x + wq.y), sin(wq.y - wq.z), 0.) * .018 + vec3(rip * .018));
          }
          vec3 cell = floor(vObj * 210.);
          float hs = sq(cell);
          vec3 sN = normalize(normal + (vec3(sq(cell + 1.), sq(cell + 2.), sq(cell + 3.)) - .5) * 1.1);
        `,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec3 Vd = normalize(vViewPosition);
          float sheen = pow(1. - saturate(dot(normal, Vd)), 3.2);
          totalEmissiveRadiance += diffuseColor.rgb * sheen * .3 + vec3(.1, .07, .14) * sheen * .18;
          float gl = pow(max(0., dot(reflect(-Vd, sN), normalize(vec3(.45, .6, .65)))), 90.) * step(.72, hs);
          float tw = .45 + .55 * sin(uTime * 2.6 + hs * 50.);
          totalEmissiveRadiance += mix(vec3(1., .93, .72), vec3(.75, 1., .88), hs) * gl * tw * 2.4 * uGlint;
        `,
        );
    };
    return m;
  }
  const suitMat = sequinMat(0x006a3a, { rough: 0.55, metal: 0.12 });
  const white = (() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xcfcbd6,
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
    });
    m.onBeforeCompile = (sh) => envPatch(sh, 0.75);
    return m;
  })();
  const cloth = sequinMat(0xd4cfd9, { rough: 0.74, metal: 0.04, glint: 0 });
  const gold = pbr({ color: 0xe6b456, roughness: 0.22, metalness: 1 }, 2.2);
  const chromeMat = pbr({ color: 0xd8d6e0, roughness: 0.16, metalness: 1 }, 2.2);
  const dark = pbr({ color: 0x24202c, roughness: 0.45, metalness: 0.55 }, 1.4);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a171e, roughness: 0.85, metalness: 0 });

  const sph = (r, ws = 64, hs = 48) => new THREE.SphereGeometry(r, ws, hs);

  // Resolution of a build. detail 1 = the film's astronauts (intro, cinematic close-ups), every
  // segment count as authored. A number < 1 scales every count; 'game' is the in-game avatar:
  // counts picked per part so the suit reads the same from the game cameras (third person,
  // aiming, a partner a few metres away) at a tenth of the triangles. Silhouettes (helmet,
  // torso, limbs) keep the most; small, round or hidden parts (fingers, studs, the balls inside
  // the elbows and knees) keep the least. The fine relief is left to the suit's shading.
  const GAME = {
    limb: 'fold',
    limbR: 16,
    torso: 0.3,
    torsoR: 0.4,
    shoulder: 0.38,
    helmet: 0.38,
    visor: 0.22,
    ring: 0.3,
    ringT: 0.32,
    small: 0.33,
    ball: 0.22,
    pillow: 0.3,
    finger: 0.25,
    fingerP: 0.34,
    tube: 0.4,
    bevel: 0.35,
  };
  const resOf = (detail = 1) => {
    // ('game', or an object overriding some of GAME's counts)
    const D =
      typeof detail === 'number'
        ? { k: detail }
        : Object.assign({ k: 0.3 }, GAME, typeof detail === 'object' ? detail : null);
    const n = (seg, part, min = 3) =>
      D.k === 1 && typeof detail === 'number'
        ? seg
        : Math.max(min, Math.round(seg * (typeof D[part] === 'number' ? D[part] : D.k)));
    n.D = D;
    return n;
  };

  // limb profile: a slight taper, the accordion bellows near both joints, the ends tucked in
  const limbR = (y) => {
    const a = Math.abs(y);
    let r = 1 + 0.07 * Math.cos(y * Math.PI) - 0.05 * (y + 0.5);
    if (a > 0.3)
      r +=
        0.09 *
        Math.pow(Math.max(0, Math.sin((a - 0.3) * Math.PI * 22)), 1.5) *
        Math.min(1, (a - 0.3) * 9);
    if (a > 0.47) r *= 1 - (a - 0.47) * 6;
    return r;
  };
  // heights where the light limb is sampled: each bellows fold gets its start, flanks, crest and
  // end (they are 1/22 of the limb long), the creased middle one ring per 1/27 of the limb
  const foldYs = () => {
    const ys = new Set();
    const add = (y) => ys.add(+y.toFixed(5));
    for (let i = 0; i <= 16; i++) add(-0.3 + (0.6 * i) / 16);
    [-1, 1].forEach((s) => {
      for (let b = 0; b < 3; b++)
        [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
          const a = 0.3 + (2 * b + f) / 22;
          if (a < 0.5) add(s * a);
        });
      [0.47, 0.485, 0.5].forEach((a) => add(s * a));
    });
    return [...ys].sort((p, q) => p - q);
  };
  // A lathe's first and last columns are the same points with their own normals: at the film's
  // density the two hardly differ, on a light mesh they would draw a hard seam down the limb.
  const weldSeam = (g, segs, npts) => {
    const nn = g.attributes.normal;
    const v = new THREE.Vector3();
    for (let j = 0; j < npts; j++) {
      const a = j;
      const b = segs * npts + j;
      v.set(nn.getX(a) + nn.getX(b), nn.getY(a) + nn.getY(b), nn.getZ(a) + nn.getZ(b)).normalize();
      nn.setXYZ(a, v.x, v.y, v.z);
      nn.setXYZ(b, v.x, v.y, v.z);
    }
  };
  const limbCache = {};
  const limbGeo = (res) => {
    const D = res.D;
    const fold = D.limb === 'fold';
    const hs = fold ? 0 : res(128, 'limb', 8);
    const rs = fold ? D.limbR : res(72, 'limb', 6);
    const key = hs + '/' + rs;
    if (limbCache[key]) return limbCache[key];
    const ys = fold ? foldYs() : Array.from({ length: hs + 1 }, (_, i) => -0.5 + i / hs);
    const pts = ys.map((y) => new THREE.Vector2(limbR(y), y));

    const g = new THREE.LatheGeometry(pts, rs),
      pp = g.attributes.position,
      v = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) {
      v.fromBufferAttribute(pp, i);
      const a = Math.atan2(v.z, v.x),
        y = v.y,
        m = Math.max(0, 1 - Math.abs(y) / 0.3);
      const k =
        1 +
        m *
          m *
          (0.028 * Math.sin(y * 34 + 2.4 * Math.sin(a * 2 + y * 7)) +
            0.018 * Math.sin(y * 61 - a * 3 + 1.3) +
            0.012 * Math.cos(a * 5 + y * 20));
      pp.setXYZ(i, v.x * k, y, v.z * k);
    }
    g.computeVertexNormals();
    if (rs < 72) weldSeam(g, rs, pts.length);
    return (limbCache[key] = Life.keep(g));
  };
  function limb(mesh, a, b, r) {
    const d = new THREE.Vector3().subVectors(b, a),
      L = d.length();
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh.scale.set(r, L, r);
  }
  const roundBox = (w, h, d, r, bevelSegments = 6, curveSegments = 10) => {
    const s = new THREE.Shape(),
      x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: d - r,
      bevelEnabled: true,
      bevelThickness: r / 2,
      bevelSize: r / 2,
      bevelSegments,
      curveSegments,
    });
    g.translate(0, 0, -(d - r) / 2);
    return g;
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const heartPath = (x, cx, cy, s) => {
    x.beginPath();
    x.moveTo(cx, cy + s * 0.35);
    x.bezierCurveTo(cx - s * 0.9, cy - s * 0.2, cx - s * 0.5, cy - s * 0.85, cx, cy - s * 0.35);
    x.bezierCurveTo(cx + s * 0.5, cy - s * 0.85, cx + s * 0.9, cy - s * 0.2, cx, cy + s * 0.35);
  };

  const gloveGrip = pbr({ color: 0x55515f, roughness: 0.8, metalness: 0.04 }, 0.6);
  const phCache = {};

  function pillow(w, h, d, e = 3, seg = 40) {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)),
      p = g.attributes.position,
      v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = Math.pow(
        Math.pow(Math.abs(v.x), e) + Math.pow(Math.abs(v.y), e) + Math.pow(Math.abs(v.z), e),
        -1 / e,
      );
      p.setXYZ(i, (v.x * k * w) / 2, (v.y * k * h) / 2, (v.z * k * d) / 2);
    }
    g.computeVertexNormals();
    return g;
  }

  function phalanx(L, r0, r1, n) {
    const cap = n(8, 'fingerP', 3),
      mid = n(10, 'fingerP', 2),
      rad = n(24, 'finger', 6);
    const key = [L, r0, r1].map((v) => v.toFixed(4)).join() + '/' + [cap, mid, rad];
    if (phCache[key]) return phCache[key];
    const pts = [];
    for (let i = 0; i <= cap; i++) {
      const a = -Math.PI / 2 + ((i / cap) * Math.PI) / 2;
      pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r0), Math.sin(a) * r0 * 0.9));
    }
    for (let i = 1; i < mid; i++) {
      const t = i / mid,
        r = r0 + (r1 - r0) * t;
      pts.push(new THREE.Vector2(r * (1 + 0.05 * Math.sin(t * Math.PI)), L * t));
    }
    for (let i = 0; i <= cap; i++) {
      const a = ((i / cap) * Math.PI) / 2;
      pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r1), L + Math.sin(a) * r1 * 0.95));
    }
    return (phCache[key] = Life.keep(new THREE.LatheGeometry(pts, rad)));
  }
  function glove(mat, curl = 0.9, flip = 1, opts = {}) {
    const n = opts.res || resOf(1);
    const pw = n(40, 'pillow', 8);
    const ball = (a, b) => sph(1, n(a, 'ball', 6), n(b, 'ball', 4));
    const g = new THREE.Group();
    const palm = new THREE.Mesh(pillow(0.074, 0.074, 0.029, 3.2, pw), mat);
    palm.position.y = 0.045;
    g.add(palm);
    const thenar = new THREE.Mesh(ball(32, 24), mat);
    thenar.position.set(-0.02 * flip, 0.028, 0.006);
    thenar.scale.set(0.016, 0.022, 0.009);
    g.add(thenar);
    const hypo = new THREE.Mesh(ball(32, 24), mat);
    hypo.position.set(0.023 * flip, 0.034, 0.005);
    hypo.scale.set(0.012, 0.022, 0.008);
    g.add(hypo);
    const pad = new THREE.Mesh(pillow(0.05, 0.028, 0.006, 3, pw), gloveGrip);
    pad.position.set(0.004 * flip, 0.06, 0.0125);
    g.add(pad);
    const back = new THREE.Mesh(pillow(0.06, 0.052, 0.009, 2.6, pw), mat);
    back.position.set(0, 0.048, -0.0115);
    g.add(back);
    const guard = new THREE.Mesh(pillow(0.07, 0.015, 0.014, 2.8, pw), mat);
    guard.position.set(0, 0.078, -0.008);
    g.add(guard);
    const fingers = [];
    const LEN = [
      [0.032, 0.022, 0.018],
      [0.036, 0.024, 0.019],
      [0.034, 0.023, 0.018],
      [0.026, 0.018, 0.015],
    ];
    const BASEY = [0.08, 0.082, 0.081, 0.077],
      RAD = [0.0086, 0.009, 0.0087, 0.0078];
    for (let k = 0; k < 4; k++) {
      const dome = new THREE.Mesh(sph(1, n(20, 'small', 6), n(14, 'small', 4)), mat);
      dome.position.set((k - 1.5) * 0.0182 * flip, BASEY[k] - 0.004, -0.014);
      dome.scale.set(0.0075, 0.006, 0.0055);
      g.add(dome);
      const base = new THREE.Group();
      base.position.set((k - 1.5) * 0.0182 * flip, BASEY[k], 0.002);
      base.rotation.z = -(k - 1.5) * 0.05 * flip;
      g.add(base);
      const chain = [];
      let parent = base;
      LEN[k].forEach((L, s) => {
        const j = new THREE.Group();
        if (s) j.position.y = LEN[k][s - 1];
        parent.add(j);
        const r0 = RAD[k] * (1 - s * 0.08),
          r1 = RAD[k] * (1 - (s + 1) * 0.08);
        const bone = new THREE.Mesh(phalanx(L, r0, r1, n), mat);
        bone.scale.z = 0.86;
        j.add(bone);
        if (s === 2) {
          const cap = new THREE.Mesh(phalanx(L * 0.42, r1 * 1.06, r1 * 1.04, n), gloveGrip);
          cap.position.y = L * 0.62;
          cap.scale.z = 0.88;
          j.add(cap);
        }
        chain.push(j);
        parent = j;
      });
      fingers.push(chain);
    }
    const th0 = new THREE.Group();
    th0.position.set(-0.029 * flip, 0.024, 0.009);
    th0.rotation.set(0.55, -0.45 * flip, 0.55 * flip);
    g.add(th0);
    const meta = new THREE.Mesh(phalanx(0.022, 0.0125, 0.0108, n), mat);
    meta.scale.z = 0.85;
    th0.add(meta);
    const th1 = new THREE.Group();
    th1.position.y = 0.022;
    th0.add(th1);
    th1.add(new THREE.Mesh(phalanx(0.022, 0.0106, 0.0098, n), mat));
    const th2 = new THREE.Group();
    th2.position.y = 0.022;
    th1.add(th2);
    th2.add(new THREE.Mesh(phalanx(0.018, 0.0097, 0.0088, n), mat));
    const tcap = new THREE.Mesh(phalanx(0.008, 0.0094, 0.009, n), gloveGrip);
    tcap.position.y = 0.011;
    th2.add(tcap);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0062, n(18, 'ringT'), n(64, 'ring', 12)), chromeMat);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 0.66, 1);
    ring.position.y = 0.002;
    g.add(ring);
    const lock = new THREE.Mesh(new THREE.TorusGeometry(0.0425, 0.0042, n(14, 'ringT'), n(64, 'ring', 12)), dark);
    lock.rotation.x = Math.PI / 2;
    lock.scale.set(1, 0.66, 1);
    lock.position.y = -0.009;
    g.add(lock);
    const gaunt = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.045, 0.05, n(48, 'ring', 12), 2, false), mat);
    gaunt.scale.z = 0.7;
    gaunt.position.y = -0.035;
    g.add(gaunt);
    if (opts.checklist) {
      const cl = new THREE.Mesh(
        roundBox(0.05, 0.036, 0.008, 0.003, n(6, 'bevel', 1), n(10, 'bevel', 2)),
        new THREE.MeshStandardMaterial({
          roughness: 0.7,
          map: canvasTex(256, 192, (x, w, h) => {
            x.fillStyle = '#ece7ee';
            x.fillRect(0, 0, w, h);
            x.fillStyle = '#3a1424';
            x.font = '700 22px IBM Plex Mono, monospace';
            x.fillText('CHECKLIST', 18, 34);
            x.font = '500 19px IBM Plex Mono, monospace';
            ['☑ décoller', '☑ lettre', '☑ rose', '☐ dire oui'].forEach((l, i) =>
              Icons.fillText(x, l, 18, 70 + i * 30),
            );
          }),
        }),
      );
      cl.material.map.repeat.set(1 / 0.05, 1 / 0.036);
      cl.material.map.offset.set(0.5, 0.5);
      cl.position.set(0, -0.04, -0.04);
      cl.rotation.y = Math.PI;
      g.add(cl);
    }
    g.userData = { fingers, thumb: [th0, th1, th2], flip, seed: Math.random() * 100 };
    setGrip(g, curl);
    return g;
  }

  function setGrip(g, c, spread = 0) {
    const { fingers, thumb, seed } = g.userData,
      t = time.value;
    fingers.forEach((ch, k) => {
      const cc =
        c * (0.92 + k * 0.05) +
        0.035 * Math.sin(t * (0.7 + k * 0.13) + seed + k * 1.9) +
        0.02 * Math.sin(t * 1.9 + k + seed);
      ch[0].rotation.x = cc * 0.62 + (k === 3 ? 0.05 : 0);
      ch[1].rotation.x = cc * 0.95 + 0.06;
      ch[2].rotation.x = cc * 0.72 + 0.04;
      ch[0].parent.rotation.z =
        -(k - 1.5) * (0.05 + spread + 0.015 * Math.sin(t * 0.5 + seed)) * g.userData.flip;
    });
    const tc = c + 0.03 * Math.sin(t * 0.8 + seed * 2);
    thumb[0].rotation.x = 0.35 + tc * 0.25;
    thumb[1].rotation.x = 0.1 + tc * 0.5;
    thumb[2].rotation.x = 0.08 + tc * 0.45;
  }

  function ringAt(m, a, b, f, r) {
    rD.subVectors(b, a);
    m.position.copy(a).addScaledVector(rD, f);
    m.quaternion.setFromUnitVectors(UPV, rD.normalize());
    m.scale.setScalar(r);
  }

  const visorU = { uGlow: { value: 0 } };

  function makeAstronaut({
    suit,
    feminine = false,
    name = '',
    accent = '#0c9455',
    accentDark = '#0b5e38',
    patchText = 'Y + MOI',
    detail = 1,
  }) {
    const F = feminine;
    const n = resOf(detail);
    const rb = (w, h, d, r) => roundBox(w, h, d, r, n(6, 'bevel', 1), n(10, 'bevel', 2));
    const small = (seg, min = 4) => n(seg, 'small', min);
    const ring = (r, t, ts, rs, arc) =>
      new THREE.TorusGeometry(r, t, n(ts, 'ringT', 4), n(rs, 'ring', 8), arc);
    const g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = body) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      parent.add(m);
      return m;
    };
    const T = F
      ? { ua: 0.047, la: 0.04, th: 0.083, sh: 0.063 }
      : { ua: 0.057, la: 0.049, th: 0.092, sh: 0.076 };

    const prof = (
      F
        ? [
            [0, -0.44],
            [0.14, -0.437],
            [0.205, -0.39],
            [0.234, -0.3],
            [0.226, -0.21],
            [0.192, -0.12],
            [0.162, -0.05],
            [0.166, 0.02],
            [0.194, 0.1],
            [0.213, 0.18],
            [0.221, 0.26],
            [0.211, 0.33],
            [0.188, 0.4],
            [0.15, 0.445],
            [0.1, 0.47],
            [0, 0.48],
          ]
        : [
            [0, -0.44],
            [0.15, -0.435],
            [0.21, -0.38],
            [0.225, -0.27],
            [0.205, -0.15],
            [0.198, -0.08],
            [0.215, 0.02],
            [0.25, 0.13],
            [0.272, 0.23],
            [0.278, 0.31],
            [0.255, 0.39],
            [0.2, 0.44],
            [0.13, 0.47],
            [0, 0.48],
          ]
    ).map(([r, y]) => new THREE.Vector2(r, y));

    const tR = n(144, 'torsoR', 24);
    const tGeo = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(n(200, 'torso', 40)), tR),
      tp = tGeo.attributes.position,
      tv = new THREE.Vector3();
    for (let i = 0; i < tp.count; i++) {
      tv.fromBufferAttribute(tp, i);
      const r = Math.hypot(tv.x, tv.z);
      if (r < 1e-4) continue;
      const a = Math.atan2(tv.x, tv.z),
        y = tv.y,
        ax = Math.abs(Math.sin(a));
      let k = 1;
      if (F) {
        const fx = Math.sin(a) * r,
          front = Math.max(0, Math.cos(a));
        k +=
          front *
          0.2 *
          Math.exp(-Math.pow(Math.abs(fx) - 0.072, 2) / 0.0035 - Math.pow(y - 0.15, 2) / 0.0045);
      } else k += Math.max(0, Math.cos(a)) * 0.05 * Math.exp(-Math.pow(y - 0.2, 2) / 0.01);
      const waist = Math.exp(-Math.pow((y - (F ? -0.04 : -0.12)) / 0.09, 2));
      // (a lighter shell has too few columns for the finest crease: it would alias, so it goes)
      k += waist * (0.014 * Math.sin(a * 9 + y * 40) + (tR >= 68 ? 0.008 * Math.sin(a * 17 - y * 25) : 0));
      k += ax * Math.exp(-Math.pow((y - 0.2) / 0.07, 2)) * 0.01 * Math.sin(y * 70 + a * 3);
      tp.setXYZ(i, tv.x * k, y, tv.z * k);
    }
    tGeo.computeVertexNormals();
    if (tR < 144) weldSeam(tGeo, tR, tp.count / (tR + 1));
    const torso = add(tGeo, suit, 0, 0, 0, 1, 1, 0.78);
    const wy = F ? -0.06 : -0.15,
      wr = F ? 0.166 : 0.205;
    add(ring(wr, 0.014, 24, 160), chromeMat, 0, wy, 0, 1, 1, 0.78).rotation.x =
      Math.PI / 2;
    add(
      ring(wr - 0.006, 0.006, 12, 160),
      dark,
      0,
      wy + 0.02,
      0,
      1,
      1,
      0.78,
    ).rotation.x = Math.PI / 2;
    const shX = F ? 0.232 : 0.27;
    [-1, 1].forEach((s) =>
      add(sph(1, n(64, 'shoulder', 12), n(48, 'shoulder', 8)), suit, s * shX, 0.3, 0, F ? 0.094 : 0.115, F ? 0.084 : 0.1, F ? 0.094 : 0.11),
    );
    const nr = F ? 0.185 : 0.205;
    add(ring(nr, 0.03, 28, 160), chromeMat, 0, 0.43, 0, 1, 1, 0.9).rotation.x =
      Math.PI / 2;
    add(ring(nr, 0.011, 16, 160), gold, 0, 0.455, 0, 1, 1, 0.9).rotation.x =
      Math.PI / 2;

    const dcm = new THREE.Group();
    dcm.position.set(0, F ? 0.0 : 0.11, F ? 0.175 : 0.205);
    dcm.rotation.x = -0.12;
    dcm.scale.setScalar(F ? 0.82 : 1);
    body.add(dcm);
    dcm.add(new THREE.Mesh(rb(0.2, 0.12, 0.05, 0.018), white));
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.04),
      new THREE.MeshBasicMaterial({
        map: canvasTex(512, 256, (x, w, h) => {
          x.fillStyle = '#071a14';
          x.fillRect(0, 0, w, h);
          x.fillStyle = '#6dffc0';
          x.font = '600 68px IBM Plex Mono, monospace';
          x.fillText('O₂ 98%', 28, 96);
          x.fillStyle = '#ff6b9a';
          x.font = '600 60px IBM Plex Mono, monospace';
          Icons.fillText(x, '♥ 120 bpm', 28, 200);
        }),
      }),
    );
    scr.position.set(-0.035, 0.012, 0.027);
    dcm.add(scr);
    [
      [0.045, 0.025, 0xff3d6e],
      [0.075, 0.025, 0xffd36b],
      [0.045, -0.012, 0x6dffc0],
      [0.075, -0.012, 0x7aa8ff],
    ].forEach(([x, y, c]) => {
      const b = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.008, small(24)),
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 0.6,
          roughness: 0.3,
        }),
      );
      b.rotation.x = Math.PI / 2;
      b.position.set(x, y, 0.03);
      dcm.add(b);
    });
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, small(32)), chromeMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(-0.035, -0.035, 0.03);
    dcm.add(knob);

    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.03),
      new THREE.MeshStandardMaterial({
        roughness: 0.8,
        map: canvasTex(1024, 256, (x, w, h) => {
          x.fillStyle = '#e9e4ea';
          x.fillRect(0, 0, w, h);
          x.strokeStyle = accent;
          x.lineWidth = 16;
          x.strokeRect(12, 12, w - 24, h - 24);
          x.fillStyle = accentDark;
          x.font = '700 150px IBM Plex Mono, monospace';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText(name.toUpperCase(), w / 2, h / 2 + 8);
        }),
      }),
    );
    tag.position.set(F ? 0.1 : 0.1, 0.27, F ? 0.19 : 0.218);
    tag.rotation.set(-0.32, 0.3, 0);
    body.add(tag);
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, small(64, 12)),
      new THREE.MeshStandardMaterial({
        roughness: 0.75,
        transparent: true,
        map: canvasTex(512, 512, (x) => {
          x.scale(2, 2);
          x.fillStyle = '#14060f';
          x.beginPath();
          x.arc(128, 128, 124, 0, 7);
          x.fill();
          x.strokeStyle = '#e6b456';
          x.lineWidth = 10;
          x.stroke();
          x.fillStyle = '#d8324f';
          heartPath(x, 128, 140, 110);
          x.fill();
          x.fillStyle = '#fbefe6';
          x.font = '700 26px IBM Plex Mono, monospace';
          x.textAlign = 'center';
          x.fillText('MISSION', 128, 60);
          x.fillText(patchText, 128, 222);
        }),
      }),
    );
    patch.position.set(F ? 0.3 : 0.335, 0.29, 0.03);
    patch.rotation.y = 1.35;
    body.add(patch);

    const pack = add(
      rb(F ? 0.34 : 0.38, F ? 0.46 : 0.5, F ? 0.16 : 0.17, 0.04),
      white,
      0,
      0.07,
      F ? -0.25 : -0.27,
    );
    add(rb(F ? 0.28 : 0.32, 0.1, 0.02, 0.01), dark, 0, 0.25, -0.18).position.z = F
      ? -0.33
      : -0.355;
    for (let i = 0; i < 6; i++)
      add(
        new THREE.BoxGeometry(F ? 0.2 : 0.22, 0.008, 0.01),
        dark,
        0,
        -0.07 + i * 0.022,
        F ? -0.334 : -0.36,
      );
    [-1, 1].forEach((s) => {
      const k = F ? 0.88 : 1;
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.19 * k, 0.02, -0.2 * k),
        new THREE.Vector3(s * 0.29 * k, 0.0, -0.02),
        new THREE.Vector3(s * 0.24 * k, F ? -0.02 : 0.05, 0.17 * k),
        new THREE.Vector3(s * 0.1 * k, F ? 0.01 : 0.1, F ? 0.19 : 0.23),
      ]);
      body.add(new THREE.Mesh(new THREE.TubeGeometry(c, n(72, 'tube', 12), 0.016, n(18, 'tube', 6)), cloth));
      for (let q = 1; q < 14; q++) {
        const p = c.getPoint(q / 14),
          tn = c.getTangent(q / 14);
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.004, small(10, 3), small(28, 8)), chromeMat);
        r.position.copy(p);
        r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tn);
        body.add(r);
      }
    });
    const nozL = add(
        new THREE.CylinderGeometry(0.04, 0.062, 0.1, small(40, 10)),
        chromeMat,
        -0.1,
        -0.22,
        -0.29,
      ),
      nozR = add(new THREE.CylinderGeometry(0.04, 0.062, 0.1, small(40, 10)), chromeMat, 0.1, -0.22, -0.29);
    const flameMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: time, uThrust: { value: 0.6 } },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
      fragmentShader: `
      uniform float uTime, uThrust;
      varying vec2 vUv;
      void main() {
        float y = vUv.y;
        float fl = .75 + .25 * sin(uTime * 40. + y * 20.) * sin(uTime * 23.);
        vec3 c = mix(vec3(1., .45, .15), vec3(.75, .9, 1.), pow(y, 2.));
        float a = pow(y, 1.4) * fl * uThrust;
        gl_FragColor = vec4(c * a * 1.6, a);
      }
    `,
    });
    const flames = [nozL, nozR].map((n) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, small(32), 1, true), flameMat);
      f.rotation.x = Math.PI;
      f.position.set(n.position.x, n.position.y - 0.3, n.position.z);
      body.add(f);
      return f;
    });

    const bootGeo = (() => {
      const s = new THREE.Shape();
      s.moveTo(-0.06, 0.07);
      s.lineTo(-0.065, -0.02);
      s.quadraticCurveTo(-0.07, -0.06, -0.03, -0.065);
      s.lineTo(0.12, -0.065);
      s.quadraticCurveTo(0.165, -0.06, 0.16, -0.02);
      s.quadraticCurveTo(0.15, 0.02, 0.06, 0.03);
      s.lineTo(0.055, 0.07);
      s.lineTo(-0.06, 0.07);
      const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.018,
        bevelSegments: n(10, 'bevel', 2),
        curveSegments: n(28, 'bevel', 6),
      });
      geo.translate(0, 0, -0.05);
      geo.rotateY(-Math.PI / 2);
      return geo;
    })();
    const legs = [-1, 1].map((s) => {
      const th = add(limbGeo(n), suit, 0, 0, 0),
        sh = add(limbGeo(n), suit, 0, 0, 0);
      const boot = new THREE.Group();
      boot.scale.setScalar(F ? 0.86 : 1);
      body.add(boot);
      boot.add(new THREE.Mesh(bootGeo, white));
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.245), rubber);
      sole.position.set(0, -0.082, 0.045);
      boot.add(sole);
      for (let q = 0; q < 7; q++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.012), rubber);
        l.position.set(0, -0.094, -0.06 + q * 0.034);
        boot.add(l);
      }
      const cuff = new THREE.Mesh(ring(0.062, 0.012, 16, 56), chromeMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = 0.075;
      boot.add(cuff);
      const knee = add(sph(1, n(64, 'ball', 8), n(48, 'ball', 6)), suit, 0, 0, 0, T.th * 1.12, T.th * 1.02, T.th * 1.12);
      const kneePad = add(rb(0.07, 0.06, 0.02, 0.008), cloth, 0, 0, 0);
      kneePad.scale.setScalar(F ? 0.85 : 1);
      return { s, th, sh, boot, knee, kneePad };
    });

    const armR = {
      up: add(limbGeo(n), suit, 0, 0, 0),
      lo: add(limbGeo(n), suit, 0, 0, 0),
      hand: glove(cloth, 0.5, -1, { res: n }),
      r1: T.ua,
      r2: T.la,
      hs: F ? 0.9 : 1,
    };
    const armL = {
      up: add(limbGeo(n), suit, 0, 0, 0),
      lo: add(limbGeo(n), suit, 0, 0, 0),
      hand: glove(cloth, F ? 1.2 : 0.5, 1, { checklist: true, res: n }),
      r1: T.ua,
      r2: T.la,
      hs: F ? 0.9 : 1,
    };
    body.add(armR.hand);
    body.add(armL.hand);
    [armR, armL].forEach((a) => {
      a.elbow = add(sph(1, n(64, 'ball', 8), n(48, 'ball', 6)), suit, 0, 0, 0, T.la * 1.08, T.la * 1.08, T.la * 1.08);
    });

    const brgGeo = ring(1, 0.13, 16, 72).rotateX(Math.PI / 2),
      lockGeo = ring(1, 0.09, 12, 72).rotateX(Math.PI / 2);
    [armR, armL].forEach((a) => {
      a.brg = add(brgGeo, chromeMat, 0, 0, 0);
      a.brg2 = add(lockGeo, dark, 0, 0, 0);
    });
    legs.forEach((l) => {
      l.brg = add(brgGeo, chromeMat, 0, 0, 0);
      l.brg2 = add(lockGeo, dark, 0, 0, 0);
    });

    const helmet = new THREE.Group();
    helmet.position.set(0, 0.66, 0);
    helmet.scale.setScalar(F ? 0.96 : 1);
    body.add(helmet);
    add(sph(0.27, n(128, 'helmet', 24), n(96, 'helmet', 16)), white, 0, 0, 0, 1, 1, 1, helmet);
    helmet.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.2745,
          n(128, 'visor', 12),
          n(96, 'visor', 8),
          Math.PI / 2 - 1.05,
          2.1,
          0.76,
          1.44,
        ),
        rubber,
      ),
    );
    const visorMat = pbr(
      {
        color: 0xc99a45,
        metalness: 1,
        roughness: 0.045,
        emissive: 0x6a3410,
        emissiveIntensity: 0.1,
      },
      2.1,
    );
    helmet.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.279,
          n(160, 'visor', 12),
          n(120, 'visor', 8),
          Math.PI / 2 - 1.0,
          2.0,
          0.8,
          1.36,
        ),
        visorMat,
      ),
    );
    const rimG = new THREE.Mesh(
      ring(0.282, 0.016, 24, 180, Math.PI * 1.22),
      chromeMat,
    );
    rimG.position.set(0, -0.015, 0.015);
    rimG.rotation.set(0, 0, -Math.PI * 0.11);
    helmet.add(rimG);
    add(
      ring(0.272, 0.012, 20, 180),
      gold,
      0,
      -0.17,
      0,
      1,
      1,
      1,
      helmet,
    ).rotation.x = Math.PI / 2;
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.1) });
    [-1, 1].forEach((s) => {
      const lamp = new THREE.Group();
      lamp.position.set(s * 0.245, 0.1, 0.07);
      lamp.rotation.z = s * -0.3;
      helmet.add(lamp);
      lamp.add(new THREE.Mesh(rb(0.05, 0.04, 0.06, 0.012), chromeMat));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.014, small(32, 8)), lampMat);
      lens.position.z = 0.037;
      lamp.add(lens);
    });
    const cam = add(
      new THREE.CylinderGeometry(0.016, 0.016, 0.04, small(32, 8)),
      dark,
      -0.2,
      0.19,
      0.04,
      1,
      1,
      1,
      helmet,
    );
    cam.rotation.x = Math.PI / 2;
    add(
      new THREE.CylinderGeometry(0.005, 0.005, 0.17, small(12)),
      chromeMat,
      0.14,
      0.27,
      -0.06,
      1,
      1,
      1,
      helmet,
    ).rotation.z = -0.4;
    add(
      sph(0.018, small(24, 6), small(18, 4)),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.5, 0.9) }),
      0.177,
      0.345,
      -0.06,
      1,
      1,
      1,
      helmet,
    );
    if (F) {
      const hs = new THREE.Shape();
      hs.moveTo(0, -0.03);
      hs.bezierCurveTo(-0.045, 0, -0.04, 0.04, 0, 0.02);
      hs.bezierCurveTo(0.04, 0.04, 0.045, 0, 0, -0.03);
      const sticker = new THREE.Mesh(
        new THREE.ShapeGeometry(hs, small(24, 6)),
        new THREE.MeshStandardMaterial({
          color: 0xff3d6e,
          emissive: 0x5a0018,
          roughness: 0.4,
          side: THREE.DoubleSide,
        }),
      );
      sticker.position.set(-0.262, 0.03, -0.06);
      sticker.rotation.y = -Math.PI / 2 - 0.2;
      helmet.add(sticker);
    }

    const webbing = pbr({ color: 0x2b2733, roughness: 0.82, metalness: 0.05 }, 0.7);
    [-1, 1].forEach((s) => {
      const sb = add(
        ring(F ? 0.06 : 0.07, 0.012, 18, 72),
        chromeMat,
        s * (shX + 0.035),
        0.29,
        0,
      );
      sb.rotation.y = Math.PI / 2;
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.13, 0.44, 0.02),
        new THREE.Vector3(s * 0.15, 0.32, F ? 0.17 : 0.19),
        new THREE.Vector3(s * 0.13, 0.14, F ? 0.2 : 0.215),
        new THREE.Vector3(s * 0.11, wy + 0.04, F ? 0.135 : 0.17),
      ]);
      body.add(new THREE.Mesh(new THREE.TubeGeometry(c, n(48, 'tube', 10), 0.007, n(10, 'tube', 4)), webbing));
      const cb = add(
        new THREE.TorusGeometry(0.014, 0.0035, small(10, 3), small(32, 8)),
        chromeMat,
        s * 0.155,
        wy - 0.035,
        F ? 0.125 : 0.16,
      );
      cb.rotation.set(0.3, 0.2 * s, 0);
      cb.scale.set(0.75, 1, 1);
    });
    const PW = F ? 0.34 : 0.38,
      PH = F ? 0.46 : 0.5,
      PZ = F ? -0.25 : -0.27,
      PD = F ? 0.16 : 0.17,
      back = PZ - PD / 2;
    [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ].forEach(([sx, sy]) =>
      add(
        sph(0.022, small(24, 6), small(18, 4)),
        webbing,
        sx * (PW / 2 - 0.01),
        0.07 + sy * (PH / 2 - 0.01),
        back + 0.02,
      ),
    );
    const handle = add(
      new THREE.TorusGeometry(0.045, 0.008, small(12, 4), small(40, 8), Math.PI),
      chromeMat,
      0,
      0.07 + PH / 2,
      PZ - 0.02,
    );
    handle.rotation.y = Math.PI / 2;
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.045),
      new THREE.MeshStandardMaterial({
        roughness: 0.7,
        map: canvasTex(1024, 232, (x, w, h) => {
          x.fillStyle = '#e9e4ea';
          x.fillRect(0, 0, w, h);
          x.fillStyle = accentDark;
          x.font = '700 72px IBM Plex Mono, monospace';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText('LIFE SUPPORT · ' + name.toUpperCase(), w / 2, h / 2 + 4);
          x.strokeStyle = accent;
          x.lineWidth = 10;
          x.strokeRect(8, 8, w - 16, h - 16);
        }),
      }),
    );
    lbl.position.set(0, 0.2, back - 0.002);
    lbl.rotation.y = Math.PI;
    body.add(lbl);
    const refl = new THREE.MeshStandardMaterial({
      color: 0xd8dde8,
      emissive: 0x6a7080,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.6,
    });
    [-1, 1].forEach(
      (s) =>
        (add(
          new THREE.BoxGeometry(0.012, PH * 0.7, 0.004),
          refl,
          s * (PW / 2 + 0.001),
          0.07,
          PZ,
        ).rotation.y = Math.PI / 2),
    );
    const housing = new THREE.Mesh(ring(0.287, 0.019, 20, 160, Math.PI), white);
    housing.rotation.x = 0.62;
    helmet.add(housing);
    [-1, 1].forEach((s) => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, small(40, 8)), white);
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(s * 0.289, 0, 0);
      helmet.add(hinge);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.022, small(32, 8)), chromeMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(s * 0.29, 0, 0);
      helmet.add(cap);
    });
    return { g, body, helmet, legs, armR, armL, flames, flameMat, pack, torso, visorMat, T, suit };
  }

  return {
    makeAstronaut,
    setGrip,
    limb,
    ringAt,
    time,
    SUN,
    sequinMat,
    chromeMat,
    white,
    cloth,
    gold,
    dark,
    rubber,
    pbr,
    roundBox,
    sph,
    resOf,
  };
})();
