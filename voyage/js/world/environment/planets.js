const PV = `
  varying vec3 vN, vP, vW, vC;
  varying mat3 vM;
  void main() {
    vM = mat3(modelMatrix);
    vP = position;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.);
    vW = w.xyz;
    vC = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
function planet({
  r,
  c1,
  c2,
  c3,
  atmo,
  bands = 6,
  seed = 1,
  rough = 0,
  clouds = false,
  cloudTint = 0xffffff,
  ocean = 0,
  lights = 0,
  ring = null,
}) {
  const g = new THREE.Group();
  const seg = mobile ? [128, 96] : [224, 160];
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(r, seg[0], seg[1]),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: time,
        uSun: { value: SUN },
        c1: { value: new THREE.Color(c1) },
        c2: { value: new THREE.Color(c2) },
        c3: { value: new THREE.Color(c3) },
        uAtmo: { value: new THREE.Color(atmo) },
        uBands: { value: bands },
        uSeed: { value: seed },
        uRough: { value: rough },
        uDim: dimU,
        uOcean: { value: ocean },
        uLights: { value: lights },
      },
      vertexShader: PV,
      fragmentShader: `
        ${NOISE3}
        uniform float uTime, uBands, uSeed, uRough, uDim, uOcean, uLights;
        uniform vec3 uSun, c1, c2, c3, uAtmo;
        varying vec3 vN, vP, vW, vC;
        varying mat3 vM;
        float hgt(vec3 p) {
          return fbm3(p * 6. + uSeed);
        }
        void main() {
          vec3 p = normalize(vP);
          float w = fbm3(p * 3. + uSeed);
          float swirl = fbm3(p * 2.2 + vec3(uTime * .012, 0., uSeed));
          float lat = p.y * uBands + (w * 1.7 + swirl * 1.3) * (1. - uRough) + sin(p.x * 3. + uSeed + uTime * .02) * .3;
          float b = .5 + .5 * sin(lat * 3.14159 + fbm3(p * 6. + uSeed * 2.) * 2.4);
          float h = hgt(p);
          float t = mix(b, h, uRough);
          vec3 col = mix(c1, c2, smoothstep(.22, .78, t));
          col = mix(col, c3, smoothstep(.6, .9, fbm3(p * 12. + uSeed)) * .65);
          col *= .88 + .24 * fbm3(p * vec3(3., 46., 3.) + uSeed);
          float storm = smoothstep(.12, .0, length(p - normalize(vec3(.6, -.25, .75))) - .0) * (1. - uRough);
          col = mix(col, c3 * 1.15, storm * .7);
          vec3 tx = normalize(cross(p, vec3(0., 1., .013))), ty = cross(p, tx);
          float e = .006;
          float hx = hgt(normalize(p + tx * e)), hy = hgt(normalize(p + ty * e));
          vec3 Nb = normalize(vN - vM * (tx * (hx - h) + ty * (hy - h)) / e * (.012 + uRough * .05));
          vec3 V = normalize(cameraPosition - vW);
          float ndl = dot(vN, uSun), lam = max(dot(Nb, uSun), 0.);
          float term = smoothstep(-.15, .3, ndl), fres = pow(1. - max(dot(vN, V), 0.), 2.6);
          vec3 lit = col * (.022 + 1.18 * lam);
          float sea = uOcean * smoothstep(.56, .4, h);
          lit = mix(lit, lit * vec3(.55, .8, 1.), sea * .5);
          lit += vec3(1., .92, .85) * pow(max(dot(reflect(-uSun, vN), V), 0.), 70.) * sea * 1.8;
          lit += vec3(1., .42, .22) * exp(-pow(ndl * 6., 2.)) * .2;
          float night = smoothstep(.05, -.25, ndl);
          vec3 cell = floor(p * 220.);
          float city = uLights < .01 ? 0. : step(.982, fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453)) * smoothstep(.5, .62, h) * smoothstep(.4, .7, fbm3(p * 9. + 4.));
          lit += vec3(1., .62, .35) * city * night * uLights * 2.2;
          lit += uAtmo * fres * (.08 + 1.25 * term);
          lit = mix(lit, .62 + .48 * (1. - exp(-(lit - .62) / .48)), step(.62, lit));
          gl_FragColor = vec4(lit * (1. - uDim * .55), 1.);
        }
      `,
    }),
  );
  g.add(body);
  if (clouds) {
    g.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.012, seg[0], seg[1]),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: {
            uTime: time,
            uSun: { value: SUN },
            uSeed: { value: seed },
            uDim: dimU,
            uTint: { value: new THREE.Color(cloudTint) },
          },
          vertexShader: PV,
          fragmentShader: `
            ${NOISE3}
            uniform float uTime, uSeed, uDim;
            uniform vec3 uSun, uTint;
            varying vec3 vN, vP, vW, vC;
            void main() {
              vec3 p = normalize(vP), q = p * 3.4 + vec3(uTime * .014, 0., uSeed * 1.7);
              float c = fbm3(q + fbm3(q * 1.9) * .9);
              c = smoothstep(.5, .78, c) * (.6 + .4 * fbm3(p * 16. + uSeed));
              float ndl = dot(vN, uSun), lam = max(ndl, 0.);
              vec3 col = uTint * (.03 + 1.2 * lam) + vec3(1., .5, .3) * exp(-pow(ndl * 6., 2.)) * .3;
              gl_FragColor = vec4(col * (1. - uDim * .55), c * .92);
            }
          `,
        }),
      ),
    );
  }
  if (ring) {
    const rg = new THREE.Mesh(
      new THREE.RingGeometry(r * ring.inner, r * ring.outer, 360, 6),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uSun: { value: SUN },
          uR: { value: r },
          uIn: { value: r * ring.inner },
          uOut: { value: r * ring.outer },
          uC1: { value: new THREE.Color(ring.c1) },
          uC2: { value: new THREE.Color(ring.c2) },
          uDim: dimU,
          uSeed: { value: seed },
        },
        vertexShader: PV,
        fragmentShader: `
          uniform vec3 uSun, uC1, uC2;
          uniform float uR, uIn, uOut, uDim, uSeed;
          varying vec3 vN, vP, vW, vC;
          float hh(float x) {
            return fract(sin(x * 127.1 + uSeed) * 43758.5453);
          }
          float n1(float x) {
            float i = floor(x), f = fract(x);
            return mix(hh(i), hh(i + 1.), f * f * (3. - 2. * f));
          }
          void main() {
            float rr = (length(vP.xy) - uIn) / (uOut - uIn);
            float b = n1(rr * 34.) * .5 + n1(rr * 150.) * .3 + n1(rr * 8.) * .45;
            float gap = 1. - smoothstep(.0, .012, abs(rr - .63) - .012);
            float a = smoothstep(0., .05, rr) * smoothstep(1., .9, rr) * (.2 + .8 * b) * (1. - gap * .92);
            vec3 rel = vW - vC;
            float along = dot(rel, uSun);
            float perp = length(rel - uSun * along);
            float sh = (along < 0. && perp < uR) ? .1 : 1.;
            vec3 col = mix(uC1, uC2, b) * (.18 + .92 * sh);
            col = mix(col, .6 + .4 * (1. - exp(-(col - .6) / .4)), step(.6, col));
            gl_FragColor = vec4(col * (1. - uDim * .55), a * .9);
          }
        `,
      }),
    );
    rg.rotation.set(Math.PI / 2 + ring.tilt, 0, ring.tilt * 0.7);
    g.add(rg);
  }
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.1, 128, 96),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uAtmo: { value: new THREE.Color(atmo) }, uSun: { value: SUN }, uDim: dimU },
      vertexShader: `
        varying vec3 vN, vW;
        void main() {
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 w = modelMatrix * vec4(position, 1.);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: `
        uniform vec3 uAtmo, uSun;
        uniform float uDim;
        varying vec3 vN, vW;
        void main() {
          vec3 V = normalize(cameraPosition - vW);
          float d = abs(dot(vN, V));
          float lit = smoothstep(-.5, .4, dot(-vN, uSun) * -1.);
          float g = pow(1. - d, 2.2) * smoothstep(0., .3, d) * (.25 + 1.1 * lit);
          gl_FragColor = vec4(mix(uAtmo, vec3(1., .55, .4), (1. - lit) * .35) * g * 1.7 * (1. - uDim * .5), g);
        }
      `,
    }),
  );
  g.add(atm);
  g.userData.body = body;
  return g;
}
