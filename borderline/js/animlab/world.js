// Anim lab world: renderer, lights, a gridded floor, a few boxes to run around / jump onto,
// and a tiny capsule-vs-AABB mover (ground height + horizontal push-out). Renderer close to the
// game's (no antialias, ACES); shadows are on here so the feet read against the floor.
const LabWorld = (() => {
  const W = {};
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // counters are summed over every render call of a frame, reset by hand once per frame
  renderer.info.autoReset = false;
  W.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1626');
  scene.fog = new THREE.Fog('#1b1626', 30, 90);
  W.scene = scene;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 300);
  W.camera = camera;

  scene.add(new THREE.HemisphereLight('#c9d4ff', '#3a2b2b', 0.75));
  const sun = new THREE.DirectionalLight('#fff1dc', 1.6);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -12;
  sc.right = sc.top = 12;
  sc.near = 1;
  sc.far = 40;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  W.sun = sun;

  // floor: canvas grid texture (1 m cells, 5 m accents)
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#3b3846';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#4d4a5c';
    g.lineWidth = 2;
    for (let i = 0; i <= 5; i++) {
      g.beginPath();
      g.moveTo(i * 51.2, 0);
      g.lineTo(i * 51.2, 256);
      g.moveTo(0, i * 51.2);
      g.lineTo(256, i * 51.2);
      g.stroke();
    }
    g.strokeStyle = '#6b6680';
    g.lineWidth = 4;
    g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(48, 48);
    t.anisotropy = 4;
    t.encoding = THREE.sRGBEncoding;
    return t;
  })();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // obstacles (AABB colliders): low step, crate, platform, long wall, pillars
  const boxes = [];
  const mats = ['#8a5a6b', '#5b7a8c', '#7d7a55', '#6a5b8c'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }),
  );
  const box = (x, z, w, h, d, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[m % mats.length]);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    boxes.push(new THREE.Box3().setFromObject(mesh));
  };
  box(4, 6, 2, 0.4, 2, 0); // step
  box(7, 6, 2, 0.9, 2, 1); // crate (jump)
  box(10.5, 6, 3, 1.4, 3, 2); // platform (jump from the crate)
  box(-6, 2, 0.6, 2.2, 10, 3); // wall
  box(-2, 12, 1, 3, 1, 1); // pillars
  box(2, 14, 1, 3, 1, 1);
  box(-4, -6, 3, 0.6, 3, 2);
  W.boxes = boxes;

  // character mover: feet position p (Vector3), radius r, step height
  const STEP = 0.45;
  W.groundAt = (p, r) => {
    let g = 0;
    for (const b of boxes) {
      if (p.x + r * 0.5 < b.min.x || p.x - r * 0.5 > b.max.x) continue;
      if (p.z + r * 0.5 < b.min.z || p.z - r * 0.5 > b.max.z) continue;
      if (b.max.y <= p.y + STEP && b.max.y > g) g = b.max.y;
    }
    return g;
  };
  W.pushOut = (p, r) => {
    for (const b of boxes) {
      if (b.max.y <= p.y + STEP || b.min.y >= p.y + 1.7) continue;
      const cx = THREE.MathUtils.clamp(p.x, b.min.x, b.max.x);
      const cz = THREE.MathUtils.clamp(p.z, b.min.z, b.max.z);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        // centre inside the box: leave by the nearest face
        const opts = [
          [b.min.x - r - p.x, 0],
          [b.max.x + r - p.x, 0],
          [0, b.min.z - r - p.z],
          [0, b.max.z + r - p.z],
        ].sort((u, v) => Math.abs(u[0] + u[1]) - Math.abs(v[0] + v[1]));
        p.x += opts[0][0];
        p.z += opts[0][1];
      }
    }
  };

  W.resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', W.resize);
  W.resize();
  return W;
})();
