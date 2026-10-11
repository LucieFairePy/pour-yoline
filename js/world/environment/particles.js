const warpU = { uTime: time, uWarp: { value: 0 } };
{
  const NW = mobile ? 900 : 1700,
    g = new THREE.BufferGeometry();
  const p = new Float32Array(NW * 6),
    seed = new Float32Array(NW * 6),
    end = new Float32Array(NW * 2);
  for (let i = 0; i < NW; i++) {
    const a = Math.random() * 6.283,
      r = 3 + Math.pow(Math.random(), 0.7) * 26,
      z = Math.random();
    for (let k = 0; k < 2; k++) {
      seed.set([a, r, z], (i * 2 + k) * 3);
      end[i * 2 + k] = k;
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const lines = new THREE.LineSegments(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: warpU,
      vertexShader: `
        attribute vec3 aSeed;
        attribute float aEnd;
        uniform float uTime, uWarp;
        varying float vA;
        varying float vE;
        void main() {
          float z = -170. + mod(aSeed.z * 170. + uTime * (30. + uWarp * 460.), 170.);
          vec3 p = vec3(cos(aSeed.x) * aSeed.y, sin(aSeed.x) * aSeed.y, z);
          p.z -= aEnd * (.2 + uWarp * 30.);
          vA = uWarp * smoothstep(-170., -120., z) * smoothstep(-1., -6., z);
          vE = aEnd;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        }
      `,
      fragmentShader: `
        varying float vA;
        varying float vE;
        void main() {
          vec3 c = mix(vec3(1., 1., 1.), vec3(.45, .6, 1.), vE);
          gl_FragColor = vec4(c * vA * .45 * (1. - vE * .8), vA * .45);
        }
      `,
    }),
  );
  lines.frustumCulled = false;
  lines.renderOrder = 5;
  camera.add(lines);
}

const moteU = { uTime: time, uPx: pxU, uWarp: warpU.uWarp, uDim: dimU };
{
  const n = mobile ? 380 : 760,
    g = new THREE.BufferGeometry(),
    p = new Float32Array(n * 3),
    r = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    p.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, Math.random()], i * 3);
    r.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(r, 4));
  const motes = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: moteU,
      vertexShader: `
        attribute vec4 aR;
        uniform float uTime, uPx, uWarp, uDim;
        varying float vA, vB;
        varying vec3 vC;
        void main() {
          float z = -14. + mod(position.z * 14. + uTime * (.22 + aR.x * .2), 14.);
          vec3 p = vec3(position.xy * (.35 + .65 * (-z / 14.)), z);
          p.x += sin(uTime * .3 + aR.y * 30.) * .12;
          p.y += cos(uTime * .25 + aR.z * 30.) * .1;
          float near = smoothstep(-2.2, -.5, z);
          vB = smoothstep(-3.5, -.6, z);
          vA = smoothstep(-14., -10., z) * (1. - smoothstep(-.9, -.35, z)) * (.25 + .5 * aR.w) * (1. - uDim * .8) * (1. - uWarp);
          vC = mix(vec3(1., .82, .9), vec3(.75, .85, 1.1), aR.y);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (.9 + aR.z * 1.6 + near * 7.) * uPx * (3.2 / -mv.z);
        }
      `,
      fragmentShader: `
        varying float vA, vB;
        varying vec3 vC;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5) discard;
          float dot_ = pow(1. - d * 2., 2.);
          float bok = smoothstep(.5, .42, d) * (.28 + .5 * smoothstep(.3, .46, d));
          float a = mix(dot_, bok * .55, vB) * vA;
          gl_FragColor = vec4(vC * a, a);
        }
      `,
    }),
  );
  motes.frustumCulled = false;
  motes.renderOrder = 6;
  camera.add(motes);
}

const SHOOT = (() => {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(-0.5, 0, 0);
  const u = { uA: { value: 0 }, uCol: { value: new THREE.Color(1, 0.9, 0.95) } };
  const m = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: u,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
      `,
      fragmentShader: `
        uniform float uA;
        uniform vec3 uCol;
        varying vec2 vUv;
        void main() {
          float w = 1. - abs(vUv.y - .5) * 2.;
          float a = pow(vUv.x, 2.6) * pow(w, 2.2) + exp(-pow((1. - vUv.x) * 26., 2.)) * pow(w, 6.) * 2.;
          gl_FragColor = vec4(uCol * a * uA * 1.6, a * uA);
        }
      `,
    }),
  );
  m.visible = false;
  m.frustumCulled = false;
  m.renderOrder = 4;
  camera.add(m);
  const st = { life: -1, next: 3, vx: 0, vy: 0 };
  function update(t, dt) {
    if (st.life < 0) {
      if (t > st.next && S.warp < 0.02 && dimU.value < 0.3) {
        const zz = 130,
          hw = zz * Math.tan((27.5 * Math.PI) / 180) * (W / H),
          hh = zz * Math.tan((27.5 * Math.PI) / 180);
        const a = -0.25 - Math.random() * 0.55,
          side = Math.random() < 0.5 ? -1 : 1,
          sp = 95 + Math.random() * 70;
        m.position.set(
          (Math.random() * 1.2 - 0.6) * hw - side * hw * 0.2,
          hh * (0.2 + Math.random() * 0.7),
          -zz,
        );
        st.vx = Math.cos(a) * sp * side;
        st.vy = Math.sin(a) * sp;
        m.rotation.z = Math.atan2(st.vy, st.vx);
        m.scale.set(10 + Math.random() * 14, 0.2 + Math.random() * 0.12, 1);
        u.uCol.value.setHSL(Math.random() < 0.5 ? 0.93 : 0.6, 0.5, 0.9);
        st.life = 0;
        st.dur = 0.7 + Math.random() * 0.5;
        m.visible = true;
      }
      return;
    }
    st.life += dt;
    const p = st.life / st.dur;
    m.position.x += st.vx * dt;
    m.position.y += st.vy * dt;
    u.uA.value = Math.sin(Math.PI * Math.min(1, p)) * (1 - dimU.value);
    if (p >= 1 || S.warp > 0.05) {
      st.life = -1;
      m.visible = false;
      st.next = t + 4 + Math.random() * 8;
    }
  }
  return { update };
})();
