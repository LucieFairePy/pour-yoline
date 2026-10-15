// Look: the semi-realistic pass (Terre 39 prototype, branch assets-lab).
// The scenery geometry, colliders and play logic are untouched; this only changes how surfaces
// and light read:
//  - tex    : Poly Haven scans (albedo + normal + roughness, AO baked) for Tex.mat kinds, loaded
//             lazily (a level downloads a set the first time it uses that kind), world 1 only
//  - ground : the city street shader lit by its real street lamps (pools, wet asphalt glints,
//             puddles along the kerbs, shopfront spill, contact darkening at the facades)
//  - lamps  : soft light cones under the street lamps (Kenney Light Masks)
//  - env    : a night environment reflected by metal and varnish (lamp posts, benches, doors
//             were flat black silhouettes)
//  - grade  : light balance per scene (moonlight vs sodium lamps, ambient, fog depth)
//  - sound  : recorded Kenney sounds layered on the synth ones (js/game/assetfx.js)
// ?noassets or ?look=0 = the game exactly as before; ?look=tex,ground = only those parts;
// &tex=all = the scans in every world (not only Terre 39), for a preview of the generalisation.
const Look = (() => {
  const q = new URLSearchParams(location.search);
  const ALL = ['tex', 'ground', 'lamps', 'env', 'grade', 'sound'];
  const lv = q.get('look');
  const extOff = q.get('ext') === '0' || q.get('ext') === 'none';
  const off = q.has('noassets') || lv === '0' || lv === 'none';
  const ON = new Set(off ? [] : !lv || lv === '1' || lv === 'all' ? ALL : lv.split(','));
  if (extOff) ON.delete('tex');
  const on = (k) => ON.has(k);
  const texAll = q.get('tex') === 'all';
  const lowQ = () => typeof SETTINGS !== 'undefined' && SETTINGS.quality === 'low';

  // ---------- which world a phase belongs to ----------
  const HUB = new Set(['prologue', 'welcome', 'city', 'reward']);
  const worldOf = (ph) => {
    if (!ph || HUB.has(ph)) return 1;
    if (typeof Trials !== 'undefined' && Trials.byPhase[ph]) return Trials.byPhase[ph].world;
    return 0;
  };
  const phase = () => (typeof Story !== 'undefined' && Story.S ? Story.S.phase : null);

  // ---------- scanned materials ----------
  // kind -> [asset id prefix, tiling multiplier, worlds]: the multiplier scales the recipe's
  // own `scale` (metres per tile) so the scan keeps a believable real-world size
  const SCANS = {
    asphalt: ['tex.asphalt', 1, [1]],
    stone: ['tex.stone', 0.5, [1]],
    wood: ['tex.wood', 0.75, [1]],
  };
  const allowed = (kind) => texAll || SCANS[kind][2].includes(worldOf(phase()));
  if (on('tex') && typeof Tex !== 'undefined' && Tex.register) {
    for (const kind in SCANS) {
      const [id, mul] = SCANS[kind];
      Tex.register(
        kind,
        () =>
          Promise.all([Assets.get(id + '.alb'), Assets.get(id + '.nrm')]).then(([albedo, data]) => ({
            albedo,
            data,
          })),
        mul,
        () => allowed(kind),
      );
    }
  }

  // ---------- night environment for the textured materials (Tex.mat) ----------
  // a sky / ground gradient and one warm key, reflected through the roughness: metal posts,
  // varnished wood and wet stone catch a little light instead of rendering black
  const ENV = {
    k: { value: 0 },
    sky: { value: new THREE.Color(0.16, 0.11, 0.26) },
    gnd: { value: new THREE.Color(0.035, 0.025, 0.04) },
    key: { value: new THREE.Color(1.0, 0.7, 0.45) },
    dir: { value: new THREE.Vector3(0.3, 0.55, 0.78).normalize() },
  };
  const ENV_GLSL = `
    uniform float uLookEnv;
    uniform vec3 uLookSky;
    uniform vec3 uLookGnd;
    uniform vec3 uLookKey;
    uniform vec3 uLookDir;`;
  const ENV_APPLY = `
    if (uLookEnv > 0.0) {
      // half the bump only: fine procedural relief (brushed metal) would sparkle in the reflection
      vec3 eN = normalize(mix(normal, geometryNormal, 0.6));
      vec3 eV = normalize(vViewPosition);
      vec3 rw = inverseTransformDirection(reflect(-eV, eN), viewMatrix);
      float fres = pow(1.0 - saturate(dot(eN, eV)), 5.0);
      vec3 F0 = mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);
      vec3 spec = F0 + (1.0 - F0) * fres * (1.0 - roughnessFactor);
      vec3 env = mix(uLookGnd, uLookSky, smoothstep(-0.35, 0.65, rw.y));
      env += uLookKey * pow(max(dot(rw, uLookDir), 0.0), mix(48.0, 3.0, roughnessFactor)) * mix(2.2, 0.35, roughnessFactor);
      reflectedLight.indirectSpecular += env * spec * uLookEnv;
      reflectedLight.indirectDiffuse += uLookGnd * diffuseColor.rgb * (1.0 - metalnessFactor) * 0.5 * uLookEnv;
    }`;

  // ---------- street lamps (shared by the city shaders) ----------
  // the city's lamp heads sit at the corners of every 30 m lot, 12.8 m from its centre, 6.15 m up
  // (js/world/city.js, `lamps`); folding a point into its lot finds the four nearest ones
  const LAMP = { k: { value: on('ground') ? 1 : 0 }, col: { value: new THREE.Color(1.0, 0.7, 0.44) } };
  const LAMP_GLSL = `
    uniform float uLampK;
    uniform vec3 uLampCol;
    // irradiance from the 4 nearest street lamps at P (normal N); spec: GGX highlight toward V
    vec3 lookLamps(vec3 P, vec3 N, vec3 V, float rough, out vec3 spec) {
      vec2 l = mod(P.xz + 15.0, 30.0) - 15.0;
      vec2 sg = vec2(l.x < 0.0 ? -1.0 : 1.0, l.y < 0.0 ? -1.0 : 1.0);
      vec2 cc = P.xz - l;
      float a2 = rough * rough;
      a2 *= a2;
      vec3 irr = vec3(0.0);
      spec = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        vec2 o = vec2(i == 1 || i == 3 ? 17.2 : 12.8, i >= 2 ? 17.2 : 12.8);
        vec2 lw = cc + sg * o;
        vec3 d = vec3(lw.x, 6.15, lw.y) - P;
        float r2 = dot(d, d);
        vec3 L = d * inversesqrt(r2);
        float ndl = max(dot(N, L), 0.0);
        // inverse square, softened near the bulb; the lantern throws its light downward
        // (intensity ~ cos^2 from the vertical) and its shade cuts it above the horizon
        float down = max(L.y, 0.0);
        float att = 26.0 / (r2 + 2.5) * (0.06 + 0.94 * down * down) * smoothstep(-0.25, 0.2, L.y);
        irr += ndl * att;
        vec3 H = normalize(L + V);
        float nh = max(dot(N, H), 0.0);
        float dd = nh * nh * (a2 - 1.0) + 1.0;
        float D = a2 / (3.14159 * dd * dd);
        float F = 0.04 + 0.96 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
        spec += vec3(min(D * F * ndl * att * 0.12, 12.0));
      }
      return irr * uLampCol * uLampK;
    }`;

  // ---------- light balance per scene ----------
  // only the prototype scenes; every other phase keeps the values its level sets itself
  const GRADE = {
    city: { hemi: [0.32, '#7464c8', '#1c0c16'], moon: [0.5, '#b8c4ff'], env: 1 },
    prologue: { hemi: [0.32, '#7464c8', '#1c0c16'], moon: [0.5, '#b8c4ff'], env: 1 },
    welcome: { hemi: [0.32, '#7464c8', '#1c0c16'], moon: [0.5, '#b8c4ff'], env: 1 },
    reward: { hemi: [0.32, '#7464c8', '#1c0c16'], moon: [0.5, '#b8c4ff'], env: 1 },
    // the floating stage in the void: one cool key from above-left, a warm rim, more contrast
    tr_s1: { hemi: [0.34, '#8a70d8', '#160a1c'], moon: [1.0, '#d8d0ff'], env: 1, moonPos: [-50, 110, -70] },
    // the rooftops at night: a low moon ahead of the run, its sheen on the tar, sodium bounce below
    tr_s2: { hemi: [0.26, '#6a5cc0', '#2a140c'], moon: [1.15, '#b4c0ff'], env: 1, moonPos: [-30, 25, 100] },
  };
  const base = {};
  let applied = null;
  const grade = (ph) => {
    if (typeof R === 'undefined') return;
    const g = on('grade') ? GRADE[ph] : null;
    if (!base.hemi) {
      base.hemi = [R.hemi.intensity, R.hemi.color.clone(), R.hemi.groundColor.clone()];
      base.moon = [R.moon.intensity, R.moon.color.clone(), R.moon.position.clone()];
    }
    if (applied && !g) {
      R.hemi.intensity = base.hemi[0];
      R.hemi.color.copy(base.hemi[1]);
      R.hemi.groundColor.copy(base.hemi[2]);
      R.moon.intensity = base.moon[0];
      R.moon.color.copy(base.moon[1]);
      R.moon.position.copy(base.moon[2]);
    }
    applied = g;
    ENV.k.value = on('env') && worldOf(ph) === 1 && !lowQ() ? (g ? g.env : 0.6) : 0;
    if (!g) return;
    R.hemi.intensity = g.hemi[0];
    R.hemi.color.set(g.hemi[1]);
    R.hemi.groundColor.set(g.hemi[2]);
    R.moon.intensity = g.moon[0];
    R.moon.color.set(g.moon[1]);
    if (g.moonPos) R.moon.position.set(...g.moonPos);
    else R.moon.position.copy(base.moon[2]);
  };

  // ---------- real lights near the camera ----------
  // the street shader lights the ground and the facades itself; the props and the avatars
  // (standard materials) get real point lights: the street lamps nearest to where the camera
  // looks, and the plaza fountain. They exist only in the city phases.
  const CITY = new Set(['prologue', 'welcome', 'city', 'reward']);
  const heads = [];
  for (let i = -6; i <= 6; i++)
    for (let j = -6; j <= 6; j++)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) heads.push([i * 30 + sx * 12.8, j * 30 + sz * 12.8]);
  const PL = [];
  let fount = null;
  const lightsOn = () => on('ground') && typeof R !== 'undefined' && !lowQ();
  const makeLights = () => {
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(LAMP.col.value, 0, 17, 2);
      l.userData = { at: -1, k: 0, want: -1 };
      l.position.set(0, -50, 0);
      PL.push(l);
      R.scene.add(l);
    }
    fount = new THREE.PointLight('#ff86c8', 0, 13, 2);
    fount.position.set(0, 2.2, 0);
    R.scene.add(fount);
  };
  const near = [];
  const fwd = new THREE.Vector3();
  const TMP = new THREE.Color();
  const updLights = (dt, active) => {
    if (!PL.length) return;
    PL.forEach((l) => (l.visible = active));
    fount.visible = active;
    if (!active) return;
    const c = R.camera.position;
    R.camera.getWorldDirection(fwd);
    const px = c.x + fwd.x * 7;
    const pz = c.z + fwd.z * 7;
    near.length = 0;
    for (let i = 0; i < heads.length; i++) {
      const dx = heads[i][0] - px;
      const dz = heads[i][1] - pz;
      const d = dx * dx + dz * dz;
      if (d < 900) near.push([d, i]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const want = near.slice(0, PL.length).map((n) => n[1]);
    // a light keeps its lamp while it is still wanted; freed lights fade out, then move
    PL.forEach((l) => {
      if (!want.includes(l.userData.at)) l.userData.want = -1;
      else l.userData.want = l.userData.at;
    });
    want.forEach((h) => {
      if (PL.some((l) => l.userData.at === h)) return;
      const free = PL.find((l) => l.userData.want === -1 && !want.includes(l.userData.at));
      if (free) free.userData.want = h;
    });
    PL.forEach((l) => {
      const u = l.userData;
      if (u.want !== u.at) {
        u.k = Math.max(0, u.k - dt * 5);
        if (u.k === 0) {
          u.at = u.want;
          if (u.at >= 0) l.position.set(heads[u.at][0], 5.9, heads[u.at][1]);
        }
      } else if (u.at >= 0) u.k = Math.min(1, u.k + dt * 4);
      l.intensity = 0.85 * u.k * LAMP.k.value;
    });
    fount.intensity = 1.1;
  };

  // ---------- phase watch (after the level's own enter has run) ----------
  let last;
  let lastT = 0;
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - lastT) / 1000 || 0.016);
    lastT = now;
    const ph = phase();
    // the city's moods (gold dusk, gray, red) reach the reflected environment too
    if (ENV.k.value > 0 && typeof Sky !== 'undefined') {
      const g = Sky.U.uGray.value;
      const r = Sky.U.uRed.value;
      const au = Sky.U.uGold.value / 0.8;
      ENV.sky.value.setRGB(0.16, 0.11, 0.26).lerp(TMP.setRGB(0.42, 0.25, 0.16), au * 0.8);
      ENV.sky.value.lerp(TMP.setRGB(0.24, 0.04, 0.05), r * 0.7).lerp(TMP.setRGB(0.12, 0.12, 0.13), g);
      ENV.key.value.setRGB(1.0, 0.7, 0.45).multiplyScalar(1 - g * 0.6);
    }
    if (lightsOn()) {
      if (!PL.length) makeLights();
      updLights(dt, CITY.has(ph) || (!ph && true));
    }
    if (ph === last) return;
    last = ph;
    grade(ph);
    if (typeof Tex !== 'undefined' && Tex.rescope) Tex.rescope();
  };
  if (ON.size) requestAnimationFrame(tick);
  // the hub is world 1 from the first frame (the city is built before any phase exists)
  ENV.k.value = on('env') && !lowQ() ? 1 : 0;

  return { on, ON, worldOf, ENV, ENV_GLSL, ENV_APPLY, LAMP, LAMP_GLSL, GRADE, SCANS };
})();
