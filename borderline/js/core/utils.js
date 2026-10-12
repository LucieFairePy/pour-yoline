const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smooth = (t) => t * t * (3 - 2 * t);
const angleDamp = (a, b, k, dt) => {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-k * dt));
};

const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const save = {
  get() {
    try {
      return JSON.parse(localStorage.getItem('borderline') || '{}');
    } catch (e) {
      return {};
    }
  },
  set(patch) {
    try {
      localStorage.setItem('borderline', JSON.stringify({ ...save.get(), ...patch }));
    } catch (e) {}
  },
};

const fadeTo = (on) =>
  new Promise((r) => {
    $('fade').classList.toggle('on', on);
    setTimeout(r, 750);
  });
