let WD = null;
const renderer = new THREE.WebGLRenderer({
  canvas: $('#gl'),
  antialias: false,
  powerPreference: 'high-performance',
});
let PR = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2.5);
const PR_MAX = PR;
const pxU = { value: PR };
renderer.setPixelRatio(PR);
renderer.setSize(W, H, false);
renderer.setClearColor(0x05020a, 1);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W / H, 0.03, 4000);
const rig = new THREE.Group();
scene.add(rig);
const head = new THREE.Group();
rig.add(head);
head.add(camera);
const SUN = new THREE.Vector3(6, 4, 3).normalize();
const sunL = new THREE.DirectionalLight(0xfff1f4, 2.3);
sunL.position.copy(SUN).multiplyScalar(20);
scene.add(sunL);
const fillL = new THREE.DirectionalLight(0x7aa8ff, 0.8);
fillL.position.set(-5, -2, -3);
scene.add(fillL);
scene.add(new THREE.AmbientLight(0x6b4a86, 0.7));
const time = { value: 0 },
  dimU = { value: 0 };
const S = { warp: 0, look: 0, lookY: 0, shake: 0, mx: 0, my: 0, tmx: 0, tmy: 0, fovBase: 55 };
