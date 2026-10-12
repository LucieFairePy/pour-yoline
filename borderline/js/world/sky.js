const Sky = (() => {
  const group = new THREE.Group();
  const U = {
    uTime: { value: 0 },
    uFog: { value: R.FOG },
    uRed: { value: 0 },
    uGold: { value: 0 },
  };

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: U,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uFog;
        uniform float uRed;
        uniform float uGold;
        varying vec3 vDir;
        float h(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        void main() {
          vec3 d = normalize(vDir);
          float y = d.y;
          vec3 top = mix(vec3(0.05, 0.02, 0.11), vec3(0.16, 0.03, 0.06), uRed);
          vec3 mid = mix(vec3(0.24, 0.08, 0.30), vec3(0.95, 0.45, 0.30), uGold);
          vec3 col = mix(uFog, mid, smoothstep(0.0, 0.18, y));
          col = mix(col, top, smoothstep(0.15, 0.75, y));
          vec3 c = floor(d * 260.0);
          float s = h(c);
          float tw = 0.6 + 0.4 * sin(uTime * (1.0 + s * 3.0) + s * 40.0);
          col += vec3(1.0, 0.92, 0.95) * step(0.996, s) * tw * smoothstep(0.05, 0.3, y) * (1.0 - uGold * 0.7);
          float band = exp(-pow((d.x * 0.6 + d.y - 0.45) * 3.0, 2.0));
          col += vec3(0.35, 0.12, 0.4) * band * 0.25 * smoothstep(0.0, 0.3, y);
          col = mix(col, col * vec3(1.6, 0.35, 0.4), uRed * 0.6);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  dome.renderOrder = -10;
  group.add(dome);

  const N = 7000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const r = rng(7);
  const c1 = new THREE.Color('#ff7a9a');
  const c2 = new THREE.Color('#ffe2c4');
  const c3 = new THREE.Color('#b07cff');
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const t = r() * TAU;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const k = Math.pow(r(), 0.6);
    const spread = (1 - k) * 4 + 0.6;
    pos[i * 3] = hx * k + (r() - 0.5) * spread;
    pos[i * 3 + 1] = hy * k + (r() - 0.5) * spread;
    pos[i * 3 + 2] = (r() - 0.5) * 4;
    tmp
      .copy(c1)
      .lerp(c2, Math.pow(1 - k, 2))
      .lerp(c3, r() * 0.35);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const galaxy = new THREE.Points(
    gg,
    new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  const gal = new THREE.Group();
  gal.add(galaxy);
  gal.position.set(-120, 260, -520);
  gal.scale.setScalar(9);
  gal.lookAt(0, 0, 0);
  group.add(gal);

  R.scene.add(group);

  return {
    U,
    galaxy,
    update(t, cam) {
      U.uTime.value = t;
      group.position.copy(cam.position);
      galaxy.rotation.z = Math.sin(t * 0.05) * 0.05;
      galaxy.material.opacity = 0.75 + 0.1 * Math.sin(t * 0.7);
    },
  };
})();
