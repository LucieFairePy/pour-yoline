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
      composer.render();
    },
  };
})();
