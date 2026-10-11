const FIN = { third: 0, side: 0, orbit: 0, heart: 0 };
const HGU = { uTime: time, uForm: { value: 0 }, uBeat: { value: 0 }, uPx: pxU };
const HG_POS = new THREE.Vector3(2, 20, -186);
let HG_K = 4;
{
  const n = mobile ? 24000 : 56000,
    asp = W / H;
  HG_K = Math.min(4, (105 * asp * 0.82) / 16, (105 * 0.55) / 14.5);
  const k = HG_K;
  const gauss = () => {
    let u = 0,
      v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v);
  };
  const g = new THREE.BufferGeometry(),
    P = new Float32Array(n * 3),
    Fr = new Float32Array(n * 3),
    R = new Float32Array(n * 4),
    Rad = new Float32Array(n),
    v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const t = Math.random() * Math.PI * 2,
      edge = Math.random() < 0.46;
    const r = edge ? 1 + gauss() * 0.022 : Math.pow(Math.random(), 0.55);
    const s = Math.sin(t),
      x = 16 * s * s * s,
      y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5;
    const ang = (1 - Math.min(r, 1)) * 2.4,
      c = Math.cos(ang),
      sn = Math.sin(ang);
    P.set(
      [(x * c - y * sn) * r * k, (x * sn + y * c) * r * k, gauss() * 5 * (1.15 - Math.min(r, 1))],
      i * 3,
    );
    v.set(Math.random() - 0.5, Math.random() * 0.9 - 0.25, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(240 + Math.random() * 300);
    Fr.set([v.x, v.y, v.z + 140], i * 3);
    R.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    Rad[i] = Math.min(r, 1.05);
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aFrom', new THREE.BufferAttribute(Fr, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(R, 4));
  g.setAttribute('aRad', new THREE.BufferAttribute(Rad, 1));
  const hg = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: HGU,
      vertexShader: `
        attribute vec3 aFrom;
        attribute vec4 aR;
        attribute float aRad;
        uniform float uTime, uForm, uBeat, uPx;
        varying vec3 vC;
        varying float vA;
        void main() {
          float k = clamp(uForm * 1.5 - aR.x * .5, 0., 1.);
          k = k * k * (3. - 2. * k);
          vec3 tgt = position * (1. + uBeat * .035);
          float sw = (1. - aRad) * sin(uTime * .25 + aR.y * 6.) * .06;
          tgt.xy = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * tgt.xy;
          vec3 p = mix(aFrom, tgt, k) + vec3(sin(uTime * .7 + aR.y * 40.), cos(uTime * .6 + aR.z * 40.), sin(uTime * .5 + aR.w * 40.)) * (.25 + sin(k * 3.14159) * 9. * aR.w);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.1 + aR.z * 2.8 + (1. - aRad) * 1.5) * uPx * (230. / -mv.z) * (1. + uBeat * .45);
          vec3 c = mix(vec3(1.45, 1.22, .95), vec3(1.35, .32, .62), smoothstep(.0, .62, aRad));
          c = mix(c, vec3(.75, .35, 1.35), smoothstep(.75, 1., aRad) * aR.y);
          c = mix(c, vec3(.55, .75, 1.45), step(.93, aR.z));
          vC = c;
          vA = (.12 + .88 * k) * (.55 + .45 * sin(uTime * 2. + aR.x * 50.));
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
  hg.position.copy(HG_POS);
  hg.frustumCulled = false;
  groups.yes.add(hg);
  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const x = c.getContext('2d'),
          gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,220,235,1)');
        gr.addColorStop(0.25, 'rgba(255,90,150,.45)');
        gr.addColorStop(1, 'rgba(120,20,80,0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    }),
  );
  core.position.copy(HG_POS);
  core.scale.setScalar(k * 26);
  groups.yes.add(core);
  HGU.core = core;
}
const FW = (() => {
  const n = mobile ? 16000 : 36000;
  const pos = new Float32Array(n * 3),
    vel = new Float32Array(n * 3),
    col = new Float32Array(n * 3),
    life = new Float32Array(n),
    max = new Float32Array(n),
    a = new Float32Array(n),
    size = new Float32Array(n),
    drag = new Float32Array(n),
    grav = new Float32Array(n);
  pos.fill(0);
  for (let i = 0; i < n; i++) pos[i * 3 + 1] = -9999;
  const g = new THREE.BufferGeometry();
  const at = (arr, k) => {
    const b = new THREE.BufferAttribute(arr, k);
    b.setUsage(THREE.DynamicDrawUsage);
    return b;
  };
  g.setAttribute('position', at(pos, 3));
  g.setAttribute('aCol', at(col, 3));
  g.setAttribute('aA', at(a, 1));
  g.setAttribute('aSize', at(size, 1));
  const pts = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPx: pxU, uTime: time },
      vertexShader: `
        attribute vec3 aCol;
        attribute float aA, aSize;
        uniform float uPx;
        varying vec3 vC;
        varying float vA;
        void main() {
          vC = aCol;
          vA = aA;
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aA > 0. ? aSize * uPx * (240. / -mv.z) * (.45 + .55 * aA) : 0.;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vC;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5 || vA <= 0.) discard;
          float fl = vA < .3 ? step(.45, fract(sin(dot(gl_FragCoord.xy, vec2(12.9, 78.2)) + uTime * 40.) * 43758.5)) : 1.;
          float a = pow(1. - d * 2., 1.6) + smoothstep(.15, 0., d) * .9;
          gl_FragColor = vec4(vC * a * pow(vA, 1.1) * fl * 1.7, a * vA * fl);
        }
      `,
    }),
  );
  pts.frustumCulled = false;
  scene.add(pts);
  const light = new THREE.PointLight(0xffffff, 0, 0, 0);
  scene.add(light);
  const PALS = [
    [0xff3d6e, 0xffc0d2],
    [0xffcf5c, 0xfff3c8],
    [0xb38cff, 0xffffff],
    [0x5cffc0, 0xd2fff0],
    [0xff6b9a, 0xffd36b],
    [0x7aa8ff, 0xffffff],
    [0xff2a55, 0xffffff],
  ];
  let head = 0,
    activeUntil = 0,
    dirty = false;
  const c1 = new THREE.Color(),
    c2 = new THREE.Color();
  function spawn(x, y, z, vx, vy, vz, r, gg, b, l, s, dr, gv) {
    const i = head;
    head = (head + 1) % n;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    vel[i * 3] = vx;
    vel[i * 3 + 1] = vy;
    vel[i * 3 + 2] = vz;
    col[i * 3] = r;
    col[i * 3 + 1] = gg;
    col[i * 3 + 2] = b;
    life[i] = l;
    max[i] = l;
    size[i] = s;
    drag[i] = dr;
    grav[i] = gv;
    a[i] = 1;
    activeUntil = Math.max(activeUntil, performance.now() / 1000 + l + 0.2);
    dirty = true;
  }
  function explode(x, y, z, shape, pal, scale) {
    const cnt = Math.round((mobile ? 520 : 1100) * (shape === 'willow' ? 1.25 : 1) * scale);
    c1.setHex(pal[0]);
    c2.setHex(pal[1]);
    const sp = (13 + Math.random() * 5) * scale,
      willow = shape === 'willow';
    const ra = Math.random() * 6.28,
      rb = Math.random() * 0.8;
    for (let k = 0; k < cnt; k++) {
      let dx, dy, dz;
      if (shape === 'heart') {
        const t = Math.random() * 6.283,
          s = Math.sin(t),
          j = 0.93 + Math.random() * 0.09;
        dx = ((16 * s * s * s) / 17) * j;
        dy =
          ((13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) /
            17) *
          j;
        dz = (Math.random() - 0.5) * 0.14;
      } else if (shape === 'ring') {
        const t = Math.random() * 6.283;
        dx = Math.cos(t);
        dy = Math.sin(t) * Math.cos(rb);
        dz = Math.sin(t) * Math.sin(rb);
        const cx = dx * Math.cos(ra) - dz * Math.sin(ra);
        dz = dx * Math.sin(ra) + dz * Math.cos(ra);
        dx = cx;
      } else {
        const u = Math.random() * 2 - 1,
          th = Math.random() * 6.283,
          rr = Math.sqrt(1 - u * u),
          j = shape === 'peony' ? 1 : 0.55 + Math.random() * 0.45;
        dx = rr * Math.cos(th) * j;
        dy = u * j;
        dz = rr * Math.sin(th) * j;
      }
      const m = Math.random(),
        mm = m * m;
      spawn(
        x,
        y,
        z,
        dx * sp,
        dy * sp,
        dz * sp,
        c1.r + (c2.r - c1.r) * mm,
        c1.g + (c2.g - c1.g) * mm,
        c1.b + (c2.b - c1.b) * mm,
        willow ? 3 + Math.random() * 1.2 : 1.7 + Math.random() * 1.1,
        (willow ? 0.85 : 1.15) + Math.random() * 0.9,
        willow ? 0.962 : 0.976,
        willow ? 4.2 : 2.3,
      );
    }
    for (let k = 0; k < (mobile ? 40 : 90); k++) {
      const u = Math.random() * 2 - 1,
        th = Math.random() * 6.283,
        rr = Math.sqrt(1 - u * u),
        s2 = Math.random() * 5 * scale;
      spawn(
        x,
        y,
        z,
        rr * Math.cos(th) * s2,
        u * s2,
        rr * Math.sin(th) * s2,
        1.6,
        1.5,
        1.4,
        0.45 + Math.random() * 0.3,
        2.4,
        0.9,
        0,
      );
    }
    light.position.set(x, y, z);
    light.color.setHex(pal[0]);
    gsap.fromTo(
      light,
      { intensity: 1.1 * scale },
      { intensity: 0, duration: 1.2, ease: 'power2.out', overwrite: true },
    );
    api.onBoom && api.onBoom(scale);
  }
  const rockets = [];
  function launch({ x, y, z, shape = 'sphere', scale = 1, pal } = {}) {
    pal = pal || PALS[Math.floor(Math.random() * PALS.length)];
    rockets.push({
      sx: x + (Math.random() - 0.5) * 12,
      sy: y - 60 - Math.random() * 20,
      sz: z + (Math.random() - 0.5) * 12,
      x,
      y,
      z,
      t: 0,
      dur: 1.1 + Math.random() * 0.5,
      shape,
      scale,
      pal,
    });
    api.onLaunch && api.onLaunch();
  }
  function update(dt) {
    for (let q = rockets.length - 1; q >= 0; q--) {
      const R = rockets[q];
      R.t += dt;
      const p = Math.min(1, R.t / R.dur),
        e = 1 - Math.pow(1 - p, 2.4);
      const cx = R.sx + (R.x - R.sx) * e,
        cy = R.sy + (R.y - R.sy) * e,
        cz = R.sz + (R.z - R.sz) * e;
      for (let s = 0; s < 2; s++)
        spawn(
          cx,
          cy,
          cz,
          (Math.random() - 0.5) * 1.4,
          -1.5 - Math.random() * 2,
          (Math.random() - 0.5) * 1.4,
          1.5,
          0.8,
          0.45,
          0.5 + Math.random() * 0.3,
          1.5,
          0.94,
          1,
        );
      if (p >= 1) {
        explode(R.x, R.y, R.z, R.shape, R.pal, R.scale);
        rockets.splice(q, 1);
      }
    }
    if (!dirty && performance.now() / 1000 > activeUntil) return;
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) {
        if (a[i] !== 0) a[i] = 0;
        continue;
      }
      life[i] -= dt;
      const d = Math.pow(drag[i], dt * 60),
        j = i * 3;
      vel[j] *= d;
      vel[j + 1] = vel[j + 1] * d - grav[i] * dt;
      vel[j + 2] *= d;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      a[i] = Math.max(0, life[i] / max[i]);
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.aA.needsUpdate = true;
    if (dirty) {
      g.attributes.aCol.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      dirty = false;
    }
  }
  function target() {
    const hw = Math.min(70, 105 * (W / H) * 0.75);
    return {
      x: 2 + (Math.random() - 0.5) * 2 * hw,
      y: 8 + Math.random() * 46,
      z: -150 - Math.random() * 60,
    };
  }
  const api = { launch, explode, update, target, PALS };
  return api;
})();
