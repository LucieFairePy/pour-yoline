const R = (() => {
  const canvas = $('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: !!window.__rec,
    });
  } catch (e) {
    $('lobby').hidden = true;
    $('nogl').hidden = false;
    $('noglText').textContent =
      'Ton navigateur ne peut pas afficher la 3D. Essaie avec Chrome, Edge ou Firefox à jour.';
    return null;
  }
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  const FOG = new THREE.Color('#1a0b26');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, 0.0085);
  scene.background = FOG;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

  const hemi = new THREE.HemisphereLight('#8f6bd6', '#1b0a18', 0.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight('#ffd9e6', 0.75);
  moon.position.set(-60, 120, -40);
  scene.add(moon);

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.4, 0.9);
  composer.addPass(bloom);

  const Q = {
    ultra: { pr: 2, bloom: true, scale: 0.6 },
    high: { pr: 1.5, bloom: true, scale: 0.5 },
    med: { pr: 1, bloom: true, scale: 0.4 },
    low: { pr: 0.75, bloom: false, scale: 0.4 },
  };
  let q = Q[SETTINGS.quality] || Q.high;
  let dyn = 1;

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    const pr = Math.min(devicePixelRatio || 1, q.pr) * dyn;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    bloom.resolution.set(w * q.scale, h * q.scale);
    bloom.enabled = q.bloom;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  // Whole worlds (city, chapter arenas hundreds of meters apart) stay in the scene once built.
  // Hide every big top-level group whose bounds are far beyond the fog, re-checked twice a second.
  const regions = new Map();
  let cullT = 0;
  const box = new THREE.Box3();
  const sph = new THREE.Sphere();
  const cullRegions = () => {
    const now = performance.now();
    if (now - cullT < 500) return;
    cullT = now;
    const cam = camera.position;
    for (const o of scene.children) {
      if (!(o.isGroup || o.isMesh) || o.userData.noCull) continue;
      let r = regions.get(o);
      // small things may move (avatars, lift, props): measure them every time
      const dyn = o.children.length <= 12;
      if (!r || dyn || r.n !== o.children.length) {
        const vis = o.visible;
        o.visible = true;
        box.setFromObject(o);
        o.visible = vis;
        if (box.isEmpty()) continue;
        box.getBoundingSphere(sph);
        r = r || { c: new THREE.Vector3() };
        r.c.copy(sph.center);
        r.rad = sph.radius;
        r.n = o.children.length;
        regions.set(o, r);
      }
      // objects hidden on purpose by their world (not built yet) stay hidden
      if (!o.userData.culled && !o.visible) continue;
      const far = cam.distanceTo(r.c) > r.rad + 520;
      if (far && o.visible) {
        o.visible = false;
        o.userData.culled = true;
      } else if (!far && o.userData.culled) {
        o.visible = true;
        o.userData.culled = false;
      }
    }
  };

  return {
    renderer,
    scene,
    camera,
    bloom,
    moon,
    hemi,
    FOG,
    adapt(fps) {
      const before = dyn;
      if (fps < 45) dyn = Math.max(0.6, dyn * 0.88);
      else if (fps > 58) dyn = Math.min(1, dyn * 1.06);
      if (Math.abs(before - dyn) > 0.01) resize();
    },
    setQuality(name) {
      q = Q[name] || Q.high;
      resize();
    },
    render() {
      cullRegions();
      composer.render();
    },
  };
})();
