const Sky = (() => {
  const group = new THREE.Group();
  const U = {
    uTime: { value: 0 },
    uFog: { value: R.FOG },
    uRed: { value: 0 },
    uGold: { value: 0 },
    uGray: { value: 0 },
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
        uniform float uGray;
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
          col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))) * 0.8, uGray);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  dome.renderOrder = -10;
  group.add(dome);

  // the voyage heart-galaxy, frozen above the roofs: the Oui the Veilleurs took
  const heart = Heart.galaxy(42000, 4, 9);
  const galaxy = heart.group;
  const gal = new THREE.Group();
  gal.add(galaxy);
  // high enough to be seen above the roofs from the streets
  gal.position.set(-110, 390, -470);
  gal.scale.setScalar(2.6);
  gal.lookAt(0, 0, 0);
  heart.core.material.opacity = 0.32;
  group.add(gal);

  R.scene.add(group);

  return {
    U,
    galaxy,
    heart,
    update(t, cam) {
      U.uTime.value = t;
      group.position.copy(cam.position);
      galaxy.rotation.z = Math.sin(t * 0.05) * 0.05;
      const H = heart.U;
      H.uTime.value = t;
      // star size in px scales with the distance (the voyage saw it from ~190 m)
      H.uPx.value = 4.2 * R.renderer.getPixelRatio();
      H.uRed.value = U.uRed.value;
      H.uGray.value = U.uGray.value;
      // the Oui fills up again card by card
      if (typeof Cards !== 'undefined' && typeof Story !== 'undefined' && Story.S) {
        H.uFill.value += (Cards.count(Cards.IDS) / 53 + 0.04 - H.uFill.value) * 0.02;
        H.uDim.value = 0.22;
      }
      H.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.2)), 12) * 0.6;
    },
  };
})();
