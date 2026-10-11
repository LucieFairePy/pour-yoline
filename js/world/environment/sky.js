const skyProc = new THREE.Mesh(
  new THREE.SphereGeometry(1800, 128, 96),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uDim: { value: 0 } },
    vertexShader: `
      varying vec3 vD;
      void main() {
        vD = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      ${NOISE3}
      uniform float uTime, uDim;
      varying vec3 vD;
      void main() {
        vec3 d = vD;
        float n = fbm3(d * 2.2 + vec3(0., 0., uTime * .004)), m = fbm3(d * 4.6 - 3.);
        float q = fbm3(d * 8. + n * 2.4), dust = smoothstep(.5, .78, fbm3(d * 5.5 + 7.) + q * .25);
        vec3 col = vec3(.008, .004, .018);
        vec3 neb = vec3(.52, .1, .44) * pow(smoothstep(.42, .88, n), 2.) * .7 + vec3(.1, .24, .62) * pow(smoothstep(.48, .9, m), 2.) * .62 + vec3(.95, .45, .28) * pow(smoothstep(.5, .95, q * n * 1.7), 3.) * .45 + vec3(.25, .9, .75) * pow(smoothstep(.6, .95, m * q * 1.6), 3.) * .18;
        col += neb * (1. - dust * .8);
        float band = exp(-pow(dot(d, normalize(vec3(.25, 1., .35))) * 3.4, 2.));
        col += vec3(.34, .26, .4) * band * (.2 + .6 * n) * .62 * (1. - dust * .85);
        col += vec3(.95, .9, 1.) * pow(h3(floor(d * 1400.)), 80.) * (.35 + band * .6);
        col *= 1. - uDim * .88;
        gl_FragColor = vec4(col, 1.);
      }
    `,
  }),
);

const skyScene = new THREE.Scene();
skyScene.add(skyProc);
const cubeRT = new THREE.WebGLCubeRenderTarget(mobile ? 1536 : 2048, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
});
new THREE.CubeCamera(1, 4000, cubeRT).update(renderer, skyScene);
skyProc.geometry.dispose();
skyProc.material.dispose();
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1800, 64, 48),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uCube: { value: cubeRT.texture }, uDim: dimU },
    vertexShader: `
      varying vec3 vD;
      void main() {
        vD = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform samplerCube uCube;
      uniform float uDim;
      varying vec3 vD;
      void main() {
        gl_FragColor = vec4(textureCube(uCube, vD).rgb * (1. - uDim * .88), 1.);
      }
    `,
  }),
);
sky.renderOrder = -3;
scene.add(sky);
[
  [-0.6, 0.35, -0.7, 120, 0xb8a0ff],
  [0.75, 0.5, 0.4, 90, 0xffb0d0],
  [-0.3, -0.4, 0.85, 80, 0x9ec8ff],
  [0.2, 0.8, -0.55, 60, 0xffd8a8],
].forEach(([x, y, z, s, c], i) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(s, s),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uC: { value: new THREE.Color(c) }, uDim: dimU, uSeed: { value: i * 3.1 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
      `,
      fragmentShader: `
        uniform vec3 uC;
        uniform float uDim, uSeed;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - .5) * 2.;
          float r = length(p), th = atan(p.y, p.x);
          float arms = pow(.5 + .5 * cos(2. * (th - log(r + .02) * 2.6) + uSeed), 3.);
          float a = (arms * exp(-r * 3.2) * .85 + exp(-r * 18.) * 1.7) * smoothstep(1., .55, r);
          gl_FragColor = vec4(mix(uC, vec3(1., .95, .85), exp(-r * 10.)) * a * .5 * (1. - uDim * .8), a);
        }
      `,
    }),
  );
  m.position.set(x, y, z).normalize().multiplyScalar(1150);
  m.lookAt(0, 0, 0);
  m.rotateZ(i * 1.3);
  m.rotateX(0.9 + i * 0.3);
  m.renderOrder = -2;
  scene.add(m);
});
{
  const nb = mobile ? 70 : 120,
    g = new THREE.BufferGeometry(),
    p = new Float32Array(nb * 3),
    sz = new Float32Array(nb),
    col = new Float32Array(nb * 3),
    v = new THREE.Vector3();
  for (let i = 0; i < nb; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      .normalize()
      .multiplyScalar(1000);
    p.set([v.x, v.y, v.z], i * 3);
    sz[i] = 12 + Math.pow(Math.random(), 2) * 26;
    const t = Math.random();
    col.set(t < 0.3 ? [0.75, 0.85, 1.3] : t < 0.5 ? [1.3, 0.85, 0.95] : [1.2, 1.12, 1.05], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const bright = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: time, uPx: pxU, uDim: dimU },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aCol;
        uniform float uTime, uPx, uDim;
        varying vec3 vC;
        varying float vA;
        void main() {
          vC = aCol;
          vA = (.75 + .25 * sin(uTime * 1.3 + position.x)) * (1. - uDim * .9);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          gl_PointSize = aSize * uPx;
        }
      `,
      fragmentShader: `
        varying vec3 vC;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          float spikes = exp(-abs(c.x) * 70.) * exp(-abs(c.y) * 6.) + exp(-abs(c.y) * 70.) * exp(-abs(c.x) * 6.);
          float a = exp(-d * d * 260.) * 1.4 + exp(-d * 14.) * .25 + spikes * .7;
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    }),
  );
  bright.frustumCulled = false;
  scene.add(bright);
}
const NSTAR = mobile ? 9000 : 20000;
{
  const g = new THREE.BufferGeometry(),
    p = new Float32Array(NSTAR * 3),
    sz = new Float32Array(NSTAR),
    col = new Float32Array(NSTAR * 3),
    ph = new Float32Array(NSTAR);
  const band = new THREE.Vector3(0.25, 1, 0.35).normalize(),
    v = new THREE.Vector3();
  for (let i = 0; i < NSTAR; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    if (Math.random() < 0.45) {
      const d = v.dot(band);
      v.addScaledVector(band, -d * 0.9).normalize();
    }
    v.multiplyScalar(700 + Math.random() * 600);
    p.set([v.x, v.y, v.z], i * 3);
    sz[i] = Math.random() < 0.03 ? 3 + Math.random() * 3 : 0.8 + Math.pow(Math.random(), 3) * 2.2;
    const t = Math.random();
    col.set(t < 0.2 ? [0.7, 0.8, 1.2] : t < 0.32 ? [1.2, 0.75, 0.9] : [1, 0.95, 0.92], i * 3);
    ph[i] = Math.random() * 6.28;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const stars = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: time, uPx: pxU, uDim: dimU },
      vertexShader: `
        attribute float aSize, aPh;
        attribute vec3 aCol;
        uniform float uTime, uPx, uDim;
        varying vec3 vC;
        varying float vA;
        void main() {
          vC = aCol;
          vA = (.55 + .45 * sin(uTime * (1. + aPh * .3) + aPh * 7.)) * (1. - uDim * .85);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          gl_PointSize = aSize * uPx * 1.6;
        }
      `,
      fragmentShader: `
        varying vec3 vC;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5) discard;
          float a = pow(1. - d * 2., 2.2) + smoothstep(.12, 0., d);
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    }),
  );
  stars.frustumCulled = false;
  scene.add(stars);
}
