const NEBN = mobile ? 16000 : 40000;
const nebU = {
  uTime: time,
  uMorph: { value: 0 },
  uBeat: { value: 0 },
  uCharge: { value: 0 },
  uPx: pxU,
  uCrack: { value: 0 },
  uDim: dimU,
};
{
  const g = new THREE.BufferGeometry(),
    A = new Float32Array(NEBN * 3),
    B = new Float32Array(NEBN * 3),
    rnd = new Float32Array(NEBN * 4),
    OUT = new Float32Array(NEBN);
  const gauss = () => {
    let u = 0,
      v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v);
  };

  const hf = (x, y, z) => {
    const q = x * x + 2.25 * y * y + z * z - 1;
    return q * q * q - x * x * z * z * z - 0.1125 * y * y * z * z * z;
  };
  const wideH = W / H > 1,
    fit = Math.min(1, (7.29 * (W / H) * 0.84) / 2.95, (wideH ? 4.3 : 7.29 * 0.5) / 5.4),
    K = 2.4 * fit,
    dir = new THREE.Vector3();
  NEB.userData.y = wideH ? 5.05 : 2.85;
  for (let i = 0; i < NEBN; i++) {
    const u = i / NEBN;
    if (u < 0.26) {
      OUT[i] = 1;
      const a = Math.random() * Math.PI * 2,
        dx = Math.cos(a),
        dz = Math.sin(a);
      let lo = 0,
        hi = 2.2;
      for (let k = 0; k < 26; k++) {
        const m = (lo + hi) / 2;
        hf(dx * m, 0, dz * m) <= 0 ? (lo = m) : (hi = m);
      }
      const r = lo * (1 + gauss() * 0.01);
      B.set([dx * r * K, (dz * r - 0.05) * K, gauss() * 0.02 * K], i * 3);
      continue;
    }
    dir.set(gauss(), gauss(), gauss()).normalize();
    let lo = 0,
      hi = 2.2;
    for (let k = 0; k < 26; k++) {
      const m = (lo + hi) / 2;
      hf(dir.x * m, dir.y * m, dir.z * m) <= 0 ? (lo = m) : (hi = m);
    }
    const r =
      u < 0.82 ? lo * (1 - Math.abs(gauss()) * 0.018) : lo * Math.cbrt(Math.random()) * 0.97;
    B.set([dir.x * r * K, (dir.z * r - 0.05) * K, dir.y * r * K], i * 3);
  }
  for (let j = 0; j < NEBN; j++) {
    if (j % 7 === 0) A.set([gauss() * 0.8, gauss() * 0.4, gauss() * 0.8], j * 3);
    else {
      const arm = j % 3,
        r = Math.pow(Math.random(), 1.4) * 7 + 0.2,
        ang = r * 0.9 + arm * 2.0944 + (gauss() * 0.35) / (r * 0.2 + 0.5);
      A.set([Math.cos(ang) * r, gauss() * 0.15, Math.sin(ang) * r], j * 3);
    }
    rnd.set([Math.random(), Math.random(), Math.random(), Math.random()], j * 4);
  }
  g.setAttribute('position', new THREE.BufferAttribute(A, 3));
  g.setAttribute('aB', new THREE.BufferAttribute(B, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(rnd, 4));
  g.setAttribute('aOut', new THREE.BufferAttribute(OUT, 1));
  const pts = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: nebU,
      vertexShader: `
        attribute vec3 aB;
        attribute vec4 aR;
        attribute float aOut;
        uniform float uTime, uMorph, uBeat, uCharge, uPx, uCrack, uDim;
        varying vec3 vC;
        varying float vA;
        mat2 rot(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }
        void main() {
          float k = clamp(uMorph * 1.6 - aR.x * .6, 0., 1.);
          k = k * k * (3. - 2. * k);
          vec3 A = position;
          A.xz = rot(uTime * .05) * A.xz;
          A.yz = rot(1.05) * A.yz;
          vec3 B = aB * (1. + uBeat * .08 + uCharge * .05);
          B.xz = rot(sin(uTime * .5) * .32 + uCharge * uTime * 2.) * B.xz;
          float side = B.x + sin(B.y * 5.) * .2 > 0. ? 1. : -1.;
          B.x += side * uCrack * .9;
          B.xy = rot(-side * uCrack * .25) * (B.xy - vec2(0., -2.6)) + vec2(0., -2.6);
          vec3 p = mix(A, B, k) + vec3(sin(uTime + aR.y * 30.), cos(uTime * .8 + aR.z * 30.), sin(uTime * .7 + aR.w * 30.)) * (.04 * (1. - k * .6) + sin(k * 3.14159) * .9 * aR.w);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.4 + aR.z * 2.6) * (1. + aOut * k * .55) * uPx * (1. + uBeat * .6 + uCharge * .8) * (16. / -mv.z);
          vec3 pink = vec3(1.2, .3, .6), violet = vec3(.6, .3, 1.2), blue = vec3(.35, .55, 1.3), white = vec3(1.3, 1.2, 1.25);
          float rr = length(position.xz) / 7.;
          vec3 Acol = mix(vec3(1.45, 1.18, .82), mix(blue, violet, aR.y), smoothstep(.0, .32, rr));
          Acol = mix(Acol, pink * 1.15, step(.9, aR.y) * smoothstep(.2, .45, rr));
          vC = mix(Acol, pink, k * (.4 + .6 * aR.z));
          vC = mix(vC, white, step(.93, aR.w) + uCharge * .3);
          vC = mix(vC, vec3(1.5, .55, .85), aOut * k * .75);
          vC *= 1. - uDim * .7;
          vA = (.55 + .45 * sin(uTime * 2. + aR.x * 50.)) * (1. + aOut * k * .5);
        }
      `,
      fragmentShader: `
        varying vec3 vC;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5) discard;
          float a = pow(1. - d * 2., 2.);
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    }),
  );
  pts.position.set(0, NEB.userData.y, -14);
  pts.frustumCulled = false;
  NEB.add(pts);
}

const novaU = { uTime: time, uT: { value: -1 }, uPx: pxU };
{
  const n = mobile ? 4500 : 9000,
    g = new THREE.BufferGeometry(),
    d = new Float32Array(n * 3),
    r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();
    d.set([v.x, v.y, v.z], i * 3);
    r[i] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(d, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(r, 1));
  const m = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: novaU,
      vertexShader: `
        attribute float aR;
        uniform float uT, uPx;
        varying float vA;
        varying vec3 vC;
        void main() {
          float t = max(uT, 0.);
          vec3 p = position * t * (6. + aR * 10.);
          vA = uT < 0. ? 0. : exp(-t * .6) * (.6 + .4 * aR);
          vC = mix(vec3(1.3, .4, .7), vec3(1.4, 1.1, .6), aR);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.5 + aR * 3.) * uPx * (12. / -mv.z);
        }
      `,
      fragmentShader: `
        varying float vA;
        varying vec3 vC;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5) discard;
          float a = pow(1. - d * 2., 1.6);
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    }),
  );
  m.position.set(-6, 4.5, -26);
  m.frustumCulled = false;
  scene.add(m);
}
