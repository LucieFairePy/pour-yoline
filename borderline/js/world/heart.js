// The heart-galaxy from the end of the voyage ("oui"): the same particles, colours and shader.
// In BORDERLINE it is the Oui itself, broken into 52 cards: it hangs in the sky, it is printed
// on the back of every card, and it fills up again in the deck menu as cards come back.
const Heart = (() => {
  const curve = (t) => {
    const s = Math.sin(t);
    return [
      16 * s * s * s,
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5,
    ];
  };

  // one sample of the voyage distribution: [x, y, z, radius 0..1.05]
  const sample = (r, gauss, k) => {
    const t = r() * Math.PI * 2;
    const edge = r() < 0.46;
    const rad = edge ? 1 + gauss() * 0.022 : Math.pow(r(), 0.55);
    const [x, y] = curve(t);
    const ang = (1 - Math.min(rad, 1)) * 2.4;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    return [
      (x * c - y * sn) * rad * k,
      (x * sn + y * c) * rad * k,
      gauss() * 5 * (1.15 - Math.min(rad, 1)),
      Math.min(rad, 1.05),
    ];
  };
  const gaussOf = (r) => () => {
    let u = 0;
    let v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v);
  };

  let coreTex = null;
  const core = () => {
    if (coreTex) return coreTex;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,220,235,1)');
    gr.addColorStop(0.25, 'rgba(255,90,150,.45)');
    gr.addColorStop(1, 'rgba(120,20,80,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    // shared by every galaxy (the sky and several worlds): never freed by an unloaded world
    coreTex = Life.keep(new THREE.CanvasTexture(c));
    return coreTex;
  };

  /** The 3D heart-galaxy. U.uForm 0..1 gathers it, uSuck pulls it into uSink, uFill 0..1 lights
   *  only that share of the stars (the Oui coming back card by card). */
  const galaxy = (n = 56000, k = 4, seed = 9) => {
    const r = rng(seed);
    const gauss = gaussOf(r);
    const g = new THREE.BufferGeometry();
    const P = new Float32Array(n * 3);
    const Fr = new Float32Array(n * 3);
    const Rr = new Float32Array(n * 4);
    const Rad = new Float32Array(n);
    const v = V3();
    for (let i = 0; i < n; i++) {
      const s = sample(r, gauss, k);
      P.set([s[0], s[1], s[2]], i * 3);
      v.set(r() - 0.5, r() * 0.9 - 0.25, r() - 0.5)
        .normalize()
        .multiplyScalar(240 + r() * 300);
      Fr.set([v.x, v.y, v.z + 140], i * 3);
      Rr.set([r(), r(), r(), r()], i * 4);
      Rad[i] = s[3];
    }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('aFrom', new THREE.BufferAttribute(Fr, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(Rr, 4));
    g.setAttribute('aRad', new THREE.BufferAttribute(Rad, 1));
    const U = {
      uTime: { value: 0 },
      uForm: { value: 1 },
      uBeat: { value: 0 },
      uPx: { value: 1 },
      uFade: { value: 0 },
      uRed: { value: 0 },
      uGray: { value: 0 },
      uFill: { value: 1 },
      uDim: { value: 0.06 },
      uSuck: { value: 0 },
      uSink: { value: V3() },
    };
    const pts = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `
          attribute vec3 aFrom;
          attribute vec4 aR;
          attribute float aRad;
          uniform float uTime, uForm, uBeat, uPx, uFade, uRed, uGray, uFill, uDim, uSuck;
          uniform vec3 uSink;
          varying vec3 vC;
          varying float vA;
          void main() {
            float k = clamp(uForm * 1.5 - aR.x * .5, 0., 1.);
            k = k * k * (3. - 2. * k);
            vec3 tgt = position * (1. + uBeat * .035);
            float sw = (1. - aRad) * sin(uTime * .25 + aR.y * 6.) * .06;
            tgt.xy = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * tgt.xy;
            vec3 p = mix(aFrom, tgt, k) + vec3(sin(uTime * .7 + aR.y * 40.), cos(uTime * .6 + aR.z * 40.), sin(uTime * .5 + aR.w * 40.)) * (.25 + sin(k * 3.14159) * 9. * aR.w);
            float sk = clamp(uSuck * 1.7 - aR.y * .7, 0., 1.);
            sk = sk * sk * (3. - 2. * sk);
            vec3 rel = p - uSink;
            float an = sk * (5. + aR.z * 4.);
            rel.xy = mat2(cos(an), -sin(an), sin(an), cos(an)) * rel.xy;
            p = uSink + rel * (1. - sk * .985);
            vec4 mv = modelViewMatrix * vec4(p, 1.);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.1 + aR.z * 2.8 + (1. - aRad) * 1.5) * uPx * (230. / -mv.z) * (1. + uBeat * .45) * (1. - sk * .6);
            vec3 c = mix(vec3(1.45, 1.22, .95), vec3(1.35, .32, .62), smoothstep(.0, .62, aRad));
            c = mix(c, vec3(.75, .35, 1.35), smoothstep(.75, 1., aRad) * aR.y);
            c = mix(c, vec3(.55, .75, 1.45), step(.93, aR.z));
            c = mix(c, vec3(1.6, .22, .3), uRed * .75);
            c = mix(c, vec3(dot(c, vec3(.3, .59, .11))) * .7, uGray);
            float lit = step(aR.w, uFill);
            vC = c;
            vA = (.12 + .88 * k) * (.55 + .45 * sin(uTime * 2. + aR.x * 50.)) * (1. - uFade) * (1. - step(.995, sk)) * mix(uDim, 1., lit);
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
    const grp = new THREE.Group();
    grp.add(pts);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: core(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
      }),
    );
    glow.scale.setScalar(k * 26);
    grp.add(glow);
    return { group: grp, U, core: glow, points: pts };
  };

  // ---------- 2D version (cards, menus) ----------
  const STARS = (() => {
    const r = rng(9);
    const gauss = gaussOf(r);
    const out = [];
    for (let i = 0; i < 2600; i++) {
      const s = sample(r, gauss, 1);
      out.push({ x: s[0], y: s[1], rad: s[3], a: r(), b: r(), c: r(), w: r() });
    }
    return out;
  })();
  const col2d = (s) => {
    // same palette as the shader: warm white core, pink body, violet / blue sparks on the rim
    const m = Math.min(1, s.rad / 0.62);
    let r = 1.45 + (1.35 - 1.45) * m;
    let g = 1.22 + (0.32 - 1.22) * m;
    let b = 0.95 + (0.62 - 0.95) * m;
    const e = Math.max(0, Math.min(1, (s.rad - 0.75) / 0.25)) * s.b;
    r += (0.75 - r) * e;
    g += (0.35 - g) * e;
    b += (1.35 - b) * e;
    if (s.c > 0.93) [r, g, b] = [0.55, 0.75, 1.45];
    return [Math.min(255, r * 175), Math.min(255, g * 175), Math.min(255, b * 175)];
  };

  /** Paint the heart-galaxy on a 2D canvas. size = heart width in px. fill 0..1 lights that share
   *  of the stars, the rest stays as faint dust. */
  const paint = (g, cx, cy, size, { fill = 1, t = 0, alpha = 1, glow = true } = {}) => {
    const k = size / 34;
    g.save();
    g.globalCompositeOperation = 'lighter';
    if (glow) {
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, size * 0.62);
      gr.addColorStop(0, `rgba(255,170,205,${0.42 * alpha * (0.35 + 0.65 * fill)})`);
      gr.addColorStop(0.4, `rgba(255,80,140,${0.16 * alpha * (0.35 + 0.65 * fill)})`);
      gr.addColorStop(1, 'rgba(120,20,80,0)');
      g.fillStyle = gr;
      g.fillRect(cx - size, cy - size, size * 2, size * 2);
    }
    for (const s of STARS) {
      const lit = s.w <= fill;
      const tw = 0.55 + 0.45 * Math.sin(t * 2 + s.a * 50);
      const a = alpha * tw * (lit ? 0.9 : 0.07);
      if (a < 0.02) continue;
      const [r, gg, b] = col2d(s);
      const rr = Math.max(0.5, k * (0.18 + s.c * 0.32 + (1 - s.rad) * 0.2));
      g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a})`;
      g.beginPath();
      g.arc(cx + s.x * k, cy - (s.y - 2.5) * k - 2.5 * k * 0.4, rr, 0, 6.2832);
      g.fill();
    }
    g.restore();
  };

  return { curve, galaxy, paint };
})();
