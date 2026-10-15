// ♥ 5 · La Lanterne: a dark enchanted forest floating over an abyss of mist, with ONE lantern.
// Stones of light only exist inside its glow, shadow wraiths freeze in it and hunt in the dark,
// and at the end the Great Shadow drinks the light while you kindle its four braziers.
const H4 = (() => {
  const O = V3(-700, 0, 5600);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;

  const rock = Tex.mat('rock', { color: '#3a3644', scale: 3, rough: 0.9, bump: 0.8 });
  const moss = Tex.mat('grass', { color: '#24332c', scale: 2.4, rough: 0.95 });
  const bark = Tex.mat('wood', { color: '#3b2a22', scale: 0.8, rough: 0.85, bump: 0.7 });
  const stoneDark = Tex.mat('stone', { color: '#4a4556', scale: 1.6, rough: 0.8, bump: 0.6 });
  const pave = Tex.mat('cobble', { color: '#5b5566', scale: 1.4, rough: 0.85 });
  // brass without an env map renders black: keep it dielectric and warm
  const brass = new THREE.MeshStandardMaterial({
    color: '#b8873a',
    roughness: 0.35,
    metalness: 0.15,
    emissive: '#3a2208',
    emissiveIntensity: 0.6,
  });
  const iron = new THREE.MeshStandardMaterial({ color: '#4e4a58', roughness: 0.55, metalness: 0.1 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#1f3a3c',
    roughness: 0.9,
    emissive: '#0d1a2a',
    emissiveIntensity: 0.6,
    flatShading: true,
  });
  const glow = LvKit.glow;

  // ---------- layout (relative to O, the forest runs along +z) ----------
  const ISLANDS = {
    start: [0, 3, 14, 12],
    l1: [-2, 44, 12, 8],
    a2: [-1, 62, 16, 8],
    s2: [0, 90.5, 14, 11],
    s2b: [0, 124.5, 12, 9],
    s2c: [0, 157.5, 12, 9],
  };
  const T1 = V3(0, 0, 108);
  const T2 = V3(0, 0, 141);
  const ARENA = V3(0, 0, 192);
  const ARENA_R = 20;
  // the Great Shadow's sweeps cover a slice of the clearing this wide
  const SWEEP = Math.PI / 4;
  const POSTS = {
    p0: { pos: [0, 1.15, 5], r: 7 },
    pA: { pos: [-2, 1.15, 59.4], r: 11 },
    pB: { pos: [1.5, 4.1, 67.6], r: 11 },
    t1: { pos: [1.9, 8.45, 106.4], r: 15.5 },
    t2: { pos: [1.9, 10.0, 139.4], r: 15.5 },
  };
  const RINGS = {
    a: { pos: [-2, 6.6, 53.5], land: [-2, 0, 61.2] },
    t1: { pos: [0, 11.2, 108], land: [-0.6, 7.3, 108.6] },
  };
  const LEVERS = { l1: [4, 0, 126.6], l2: [-4, 0, 159] };
  const BRAZIERS = [
    [14, 0, 192],
    [0, 0, 206],
    [-14, 0, 192],
    [0, 0, 178],
  ];

  let built = false;
  let screen = null;
  const slabs = [];
  const posts = {};
  const rings = {};
  const levers = {};
  const blind = { b1: [], b2: [] };
  const wraiths = [];
  const braziers = [];
  let lantern = null;
  let lanternLight = null;
  let fireflies = null;
  let mist = null;
  let boss = null;
  let card = null;
  let dawnHeart = null;
  let night = null;
  const flames = [];
  // small pools of flower light around the levers: a safe place to wait in the dark
  const glows = [];
  let gapWall = null;
  const runeTex = {};
  const tmp = V3();
  const tmp2 = V3();

  // ---------- small helpers ----------
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  };
  const heartPath = (g, cx, cy, k) => {
    g.beginPath();
    for (let i = 0; i <= 80; i++) {
      const [x, y] = Heart.curve((i / 80) * Math.PI * 2);
      const px = cx + x * k;
      const py = cy - (y - 2.5) * k;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
  };
  // soft heart-shaped flame (the lantern and the braziers burn with the voyage heart)
  const flameTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.56, 4, w / 2, h * 0.56, w * 0.48);
    gr.addColorStop(0, 'rgba(255,248,230,1)');
    gr.addColorStop(0.25, 'rgba(255,200,120,0.85)');
    gr.addColorStop(0.6, 'rgba(255,110,120,0.35)');
    gr.addColorStop(1, 'rgba(120,20,60,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    heartPath(g, w / 2, h * 0.5, 4.2);
    g.fillStyle = 'rgba(255,170,190,0.55)';
    g.fill();
  });
  const haloTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,214,160,0.9)');
    gr.addColorStop(0.35, 'rgba(255,170,120,0.28)');
    gr.addColorStop(1, 'rgba(255,120,100,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const sprite = (tex, color, size, opacity = 1) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    s.scale.setScalar(size);
    return s;
  };
  // carved rune on the stones of light (one texture per kind)
  const rune = (kind) => {
    if (runeTex[kind]) return runeTex[kind];
    runeTex[kind] = canvasTex(1080, 1080, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#fff';
      g.lineWidth = 22;
      g.globalAlpha = 0.9;
      g.strokeRect(70, 70, w - 140, h - 140);
      g.lineWidth = 10;
      g.strokeRect(130, 130, w - 260, h - 260);
      if (kind === 'post') {
        // stones that need a lantern resting on a post: a little flame
        heartPath(g, w / 2, h / 2, 13);
        g.lineWidth = 16;
        g.stroke();
      } else {
        g.beginPath();
        g.arc(w / 2, h / 2, 200, 0, Math.PI * 2);
        g.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.beginPath();
          g.moveTo(w / 2 + Math.cos(a) * 240, h / 2 + Math.sin(a) * 240);
          g.lineTo(w / 2 + Math.cos(a) * 320, h / 2 + Math.sin(a) * 320);
          g.stroke();
        }
      }
    });
    return runeTex[kind];
  };
  const island = (name, mat = moss) => {
    const [x, z, sx, sz] = ISLANDS[name];
    K.solid(x, -1, z, sx, 2, sz, mat);
    // rocky underside tapering into the mist
    const under = K.deco(new THREE.ConeGeometry(Math.max(sx, sz) * 0.62, 14, 7, 3), rock, x, -9, z);
    under.rotation.x = Math.PI;
    under.scale.set(sx / Math.max(sx, sz), 1, sz / Math.max(sx, sz));
    // a rim of stones so the edge reads in the dark
    const n = Math.round((sx + sz) * 0.9);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const per = 2 * (sx + sz);
      let d = u * per;
      let px;
      let pz;
      if (d < sx) [px, pz] = [x - sx / 2 + d, z - sz / 2];
      else if ((d -= sx) < sz) [px, pz] = [x + sx / 2, z - sz / 2 + d];
      else if ((d -= sz) < sx) [px, pz] = [x + sx / 2 - d, z + sz / 2];
      else [px, pz] = [x - sx / 2, z + sz / 2 - (d - sx)];
      const st = K.deco(new THREE.DodecahedronGeometry(0.28 + ((i * 37) % 7) * 0.04, 0), stoneDark, px, 0.05, pz);
      st.rotation.set(i, i * 2.1, 0);
    }
  };

  // stones of light: solid only while a lantern lights them
  // kind 'carry': lit by the lantern wherever it is; kind 'post': only by the lantern resting on `post`
  const slab = (x, y, z, sx, sz, kind, sec, post = null) => {
    const mat = Tex.mat('stone', {
      color: kind === 'post' ? '#a69ac4' : '#b9a8a0',
      scale: 1.2,
      rough: 0.6,
      emissive: kind === 'post' ? '#8d7bff' : '#ffb27a',
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
      k: slabs.length,
    });
    mat.depthWrite = false;
    const m = K.deco(new THREE.BoxGeometry(sx, 0.5, sz), mat, x, y - 0.25, z);
    const runeM = new THREE.Mesh(
      new THREE.PlaneGeometry(sx * 0.92, sz * 0.92).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: rune(kind),
        color: new THREE.Color(kind === 'post' ? '#9f8cff' : '#ffc28a'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    runeM.position.y = 0.26;
    m.add(runeM);
    const b = K.collider(x, y - 0.25, z, sx, 0.5, sz);
    b.on = false;
    const s = { pos: P(x, y, z), kind, sec, post, m, b, rune: runeM, k: 0, grace: 0 };
    slabs.push(s);
    return s;
  };

  const postMesh = (id) => {
    const p = POSTS[id].pos;
    const g = new THREE.Group();
    g.position.copy(P(p[0], p[1] - 1.15, p[2]));
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.05, 10), iron);
    col.position.y = 0.52;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20, Math.PI), brass);
    hook.position.y = 1.08;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.18, 12), stoneDark);
    base.position.y = 0.09;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.78, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffcf8a').multiplyScalar(1.2),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.position.y = 0.02;
    g.add(col, hook, base, ring);
    group.add(g);
    // a thin collider so nobody walks through the post, taller than any jump: standing on the
    // post's top was a step onto the cliff without the light stair
    K.collider(p[0], p[1] + 0.45, p[2], 0.4, 3.2, 0.4, { tag: 'nocam' });
    posts[id] = { g, ring, pos: P(...p), r: POSTS[id].r };
  };

  const ringMesh = (id) => {
    const p = RINGS[id].pos;
    const m = K.deco(new THREE.TorusGeometry(0.6, 0.08, 10, 32), glow('#ff9ec4', 0.75), ...p);
    rings[id] = { m, pos: P(...p), land: P(...RINGS[id].land) };
  };

  const stemMat = new THREE.MeshStandardMaterial({ color: '#2f5a4a', roughness: 0.8 });
  const lilyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fd0f0').multiplyScalar(0.42), side: THREE.DoubleSide });
  const leverMesh = (id) => {
    const p = LEVERS[id];
    const g = new THREE.Group();
    g.position.copy(P(...p));
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), stoneDark);
    base.position.y = 0.25;
    const arm = new THREE.Group();
    arm.position.y = 0.5;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8).translate(0, 0.55, 0), iron);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), glow('#ffcf8a', 0.75));
    knob.position.y = 1.1;
    stick.add(knob);
    arm.add(stick);
    arm.rotation.x = -0.6;
    g.add(base, arm);
    group.add(g);
    K.collider(p[0], 0.25, p[2], 0.9, 0.5, 0.6);
    levers[id] = { g, arm, knob, pos: P(...p), down: 0 };
    // pale glowing lilies around the lever
    const gl = { pos: P(p[0], 0.6, p[2]), r: 4.5, flowers: [] };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const rr = 1.3 + (i % 3) * 0.45;
      const f = new THREE.Group();
      f.position.copy(P(p[0] + Math.cos(a) * rr, 0, p[2] + Math.sin(a) * rr));
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 5).translate(0, 0.25, 0), stemMat);
      const bloom = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 6, 1, true).rotateX(Math.PI).translate(0, 0.5, 0), lilyMat);
      f.add(stem, bloom);
      group.add(f);
      gl.flowers.push(f);
    }
    const pool = K.deco(
      new THREE.CircleGeometry(gl.r, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: haloTex, color: new THREE.Color('#9fd8ff'), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
      p[0],
      0.04,
      p[2],
    );
    gl.pool = pool;
    glows.push(gl);
  };

  // the invisible stair the one left in the dark has to walk down, guided by voice
  const blindPath = (key, list) => {
    const chalk = new THREE.MeshBasicMaterial({
      map: canvasTex(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.95)';
        g.setLineDash([46, 30]);
        g.lineWidth = 18;
        g.strokeRect(30, 30, w - 60, h - 60);
        g.setLineDash([]);
        g.lineWidth = 10;
        g.beginPath();
        g.moveTo(w / 2, h * 0.7);
        g.lineTo(w / 2, h * 0.3);
        g.lineTo(w * 0.38, h * 0.42);
        g.moveTo(w / 2, h * 0.3);
        g.lineTo(w * 0.62, h * 0.42);
        g.stroke();
      }),
      color: new THREE.Color('#b8f0ff'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    // chalk outlines: readable from below too, so the guide can see the whole stair from the lever
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.8, 0.4, 1.8));
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#9fe6ff').multiplyScalar(0.8),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const stoneMat = Tex.mat('stone', {
      color: '#8c86a0',
      scale: 1.3,
      rough: 0.7,
      transparent: true,
      opacity: 0,
      k: 'blind' + key,
    });
    stoneMat.depthWrite = false;
    list.forEach(([x, y, z], i) => {
      const s = 1.8;
      K.collider(x, y - 0.2, z, s, 0.4, s);
      const m = K.deco(new THREE.BoxGeometry(s, 0.4, s), stoneMat, x, y - 0.2, z);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.95, s * 0.95).rotateX(-Math.PI / 2), chalk);
      c.position.y = 0.21;
      // the arrow points to the next stone
      const nx = list[Math.min(i + 1, list.length - 1)];
      c.rotation.y = i < list.length - 1 ? Math.atan2(-(nx[0] - x), -(nx[2] - z)) : 0;
      m.add(c);
      m.add(new THREE.LineSegments(edgeGeo, edgeMat));
      blind[key].push({ m, pos: P(x, y, z) });
    });
    blind[key].chalk = chalk;
    blind[key].edge = edgeMat;
    blind[key].stone = stoneMat;
  };

  // ---------- creatures ----------
  const robeProfile = (h, r) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const rr = (Math.sin(u * Math.PI * 0.9 + 0.2) * 0.65 + 0.35) * r * (1 - u * 0.55) + 0.02;
      pts.push(new THREE.Vector2(rr, u * h));
    }
    return pts;
  };
  const shadowMat = (rim) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uFrozen: { value: 0 },
        uRim: { value: new THREE.Color(rim) },
        uAlpha: { value: 1 },
      },
      vertexShader: `
        uniform float uTime, uFrozen;
        varying vec3 vN, vV, vP;
        varying float vY;
        void main() {
          vec3 p = position;
          float w = (1.0 - uFrozen) * (0.06 + p.y * 0.012);
          p.x += sin(uTime * 2.3 + p.y * 2.1 + p.z * 3.0) * w * 3.0;
          p.z += cos(uTime * 1.9 + p.y * 1.7 + p.x * 2.0) * w * 3.0;
          vY = position.y;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vP = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime, uFrozen, uAlpha;
        uniform vec3 uRim;
        varying vec3 vN, vV, vP;
        varying float vY;
        float h(vec3 p) { return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5); }
        float n3(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          float fr = pow(1.0 - abs(dot(normalize(vN), vV)), 2.2);
          float smoke = n3(vP * 1.6 + vec3(0.0, -uTime * 0.9, 0.0)) * 0.6 + n3(vP * 3.7 - uTime * 0.5) * 0.4;
          vec3 dark = vec3(0.02, 0.01, 0.035);
          vec3 col = dark + uRim * fr * (0.9 + smoke * 0.6);
          // frozen in the light: pale, crystalline, harmless
          vec3 ice = vec3(0.55, 0.62, 0.78) * (0.35 + fr * 0.8) + vec3(0.9, 0.95, 1.0) * pow(smoke, 6.0) * 0.6;
          col = mix(col, ice, uFrozen);
          float a = (0.82 + fr * 0.18) * smoothstep(0.0, 0.6, vY + smoke * 0.5);
          a *= mix(1.0, 0.9, uFrozen);
          gl_FragColor = vec4(col, a * uAlpha);
        }
      `,
    });
  const eyeTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const makeWraith = () => {
    const g = new THREE.Group();
    const mat = shadowMat('#7a4dff');
    const robe = new THREE.Mesh(new THREE.LatheGeometry(robeProfile(2.3, 0.75), 18), mat);
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mat,
    );
    hood.position.y = 2.15;
    hood.scale.set(1, 1.25, 1.1);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), new THREE.MeshBasicMaterial({ color: '#000' }));
    face.position.set(0, 2.08, 0.33);
    const eyes = [-0.11, 0.11].map((x) => {
      const e = sprite(eyeTex, '#ff7ab8', 0.22);
      e.position.set(x, 2.12, 0.4);
      g.add(e);
      return e;
    });
    // ragged tails of smoke trailing below
    const tails = [];
    for (let i = 0; i < 5; i++) {
      const tl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 6), mat);
      const a = (i / 5) * Math.PI * 2;
      tl.position.set(Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45);
      tl.rotation.x = Math.PI;
      g.add(tl);
      tails.push(tl);
    }
    g.add(robe, hood, face);
    group.add(g);
    return { g, mat, eyes, tails };
  };

  const makeBoss = () => {
    const g = new THREE.Group();
    const mat = shadowMat('#5e36b0');
    mat.uniforms.uAlpha.value = 0.96;
    const robe = new THREE.Mesh(new THREE.LatheGeometry(robeProfile(13, 4.6), 40, 0, Math.PI * 2), mat);
    robe.position.y = -2;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(2.3, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.64), mat);
    hood.position.y = 11.4;
    hood.scale.set(1, 1.35, 1.15);
    // opaque voids that fade with the Shadow when dawn breaks
    const voidMat = new THREE.MeshBasicMaterial({ color: '#04000a', transparent: true });
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), voidMat);
    face.position.set(0, 11.0, 1.95);
    const eyes = [-0.62, 0.62].map((x) => {
      const e = sprite(eyeTex, '#5a88a0', 1.1);
      e.position.set(x, 11.3, 2.15);
      g.add(e);
      return e;
    });
    // long arms ending in claws
    const arms = [-1, 1].map((sd) => {
      const sh = new THREE.Group();
      sh.position.set(sd * 3.0, 9.2, 0);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 6, 10).translate(0, -3, 0), mat);
      const fore = new THREE.Group();
      fore.position.y = -6;
      const low = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.22, 5, 10).translate(0, -2.5, 0), mat);
      fore.add(low);
      for (let k = 0; k < 4; k++) {
        const cl = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.6, 6).translate(0, -0.8, 0), mat);
        cl.position.set((k - 1.5) * 0.22, -5, 0.1);
        cl.rotation.z = (k - 1.5) * 0.25;
        fore.add(cl);
      }
      sh.add(up, fore);
      g.add(sh);
      return { sh, fore, sd };
    });
    // the void in its chest holds a piece of your Oui: the voyage heart, dim until the braziers burn
    const hs = new THREE.Shape();
    for (let i = 0; i <= 80; i++) {
      const [x, y] = Heart.curve((i / 80) * Math.PI * 2);
      if (i) hs.lineTo(x * 0.09, (y - 2.5) * 0.09);
      else hs.moveTo(x * 0.09, (y - 2.5) * 0.09);
    }
    const hole = new THREE.Mesh(new THREE.ShapeGeometry(hs, 60), voidMat);
    hole.position.set(0, 7.6, 3.2);
    const hg = Heart.galaxy(1400, 0.085, 21);
    hg.group.position.set(0, 7.6, 3.3);
    hg.core.material.opacity = 0.14;
    hg.U.uFill.value = 0.1;
    g.add(robe, hood, face, hole, hg.group);
    // smoke crown
    const crown = [];
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.3, 3.2, 6).translate(0, 1.6, 0), mat);
      const a = (i / 9) * Math.PI * 2;
      c.position.set(Math.cos(a) * 1.7, 13.2, Math.sin(a) * 1.4);
      c.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      g.add(c);
      crown.push(c);
    }
    g.position.copy(P(ARENA.x, 0, ARENA.z));
    group.add(g);
    return { g, mat, voidMat, eyes, arms, hg, crown, hole, alive: 1, hurt: 0, cast: 0, castK: '' };
  };

  // ---------- decals for the Great Shadow's attacks ----------
  const sectorMat = () =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uK: { value: 0 }, uWave: { value: -1 }, uTime: { value: 0 } },
      blending: THREE.NormalBlending,
      vertexShader: `varying float vR; void main(){ vR = (length(position.xz) - 2.5) / ${(20 - 2.5).toFixed(1)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uK, uWave, uTime;
        varying float vR;
        void main() {
          float r = clamp(vR, 0.0, 1.0);
          float edge = smoothstep(0.9, 1.0, r) + smoothstep(0.1, 0.0, r);
          // chevrons crawling outwards: the way the sweep will run
          float stripes = smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(r * 26.0 - uTime * 9.0));
          vec3 col = mix(vec3(0.32, 0.02, 0.14), vec3(0.85, 0.16, 0.32), edge + stripes * 0.35);
          float a = uK * (0.28 + edge * 0.5 + stripes * 0.2);
          // the sweep itself: a wall of black smoke with a hot pink leading edge
          float w = uWave >= 0.0 ? smoothstep(0.14, 0.0, abs(r - uWave)) : 0.0;
          float lead = uWave >= 0.0 ? smoothstep(0.05, 0.0, abs(r - uWave - 0.06)) : 0.0;
          col = mix(col, vec3(0.015, 0.0, 0.03), w);
          col += vec3(0.8, 0.15, 0.35) * lead;
          a = max(a, max(w * 0.95, lead * 0.9));
          gl_FragColor = vec4(col, a);
        }
      `,
    });

  // ---------- build ----------
  const build = () => {
    if (built) {
      group.visible = true;
      return;
    }
    built = true;
    group.visible = true;

    Object.keys(ISLANDS).forEach((k) => island(k, k === 's2b' || k === 's2c' ? pave : moss));

    // section 1a · the moon stones (follow the lantern)
    [
      [0, 12.5],
      [2.4, 16.6],
      [4, 20.8],
      [3, 25],
      [0.2, 29],
      [-2.8, 33],
      [-4, 37.2],
    ].forEach(([x, z]) => slab(x, 0, z, 2.4, 2.4, 'carry', 1));

    // section 1b · the gap: grapple across, then the lantern on its post builds the bridge back
    [50.4, 53, 55.6].forEach((z) => slab(-2, 0, z, 2.4, 2.4, 'post', 2, 'pA'));
    // a double jump can clear the gap: an unseen wall at the far edge holds until the bridge is
    // lit (it drops for the Dame's own grapple hop)
    gapWall = K.collider(-1, 0.5, 57.1, 17, 5, 0.4, { dyn: true, tag: 'nocam' });
    // section 1c · the cliff: the double jump climbs, the light stair appears for the other
    K.solid(-2, 1.475, 71, 12, 2.95, 10, rock);
    K.deco(new THREE.BoxGeometry(12.05, 0.1, 10.05), moss, -2, 2.97, 71);
    for (let i = 1; i <= 7; i++) slab(5.5, 0.42 * i, 59.4 + (i - 1) * 1.15, 2.4, 1.25, 'post', 3, 'pB');
    // the way down to the ravine of the two towers
    for (let i = 0; i < 7; i++) K.solid(-2, 2.53 - i * 0.42 - 0.3, 76.6 + i * 1.2, 4, 0.6, 1.2, stoneDark);

    // section 2 · tower one (grapple) and its ring of stones, then the blind stair
    K.solid(T1.x, 3.5, T1.z, 3.6, 7, 3.6, stoneDark);
    K.solid(T1.x, 7.15, T1.z, 5.5, 0.3, 5.5, pave);
    // a continuous ring of stones (13 of them): this part is about trust, not jumping
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      slab(T1.x + Math.cos(a) * 9, 0, T1.z + Math.sin(a) * 9, 2.4, 2.4, 'post', 4, 't1');
    }
    blindPath('b1', [
      [0, 6.9, 111.6],
      [1.6, 6.4, 112.6],
      [2.8, 5.8, 113.8],
      [2.8, 5.2, 115.4],
      [1.4, 4.6, 116.6],
      [0, 4.0, 117.6],
      [-1.4, 3.4, 118.6],
      [-2.2, 2.7, 119.9],
      [-1.6, 2.0, 121.2],
    ]);
    // a mossy step from the ring of stones onto the next island (only reachable through the ring)
    K.solid(0, -0.3, 119.1, 2, 0.6, 2, stoneDark);
    K.solid(0, -0.3, 152.1, 2, 0.6, 2, stoneDark);
    // tower two (double jump ledges) on its half causeway
    K.solid(-2.25, -1, 138.75, 6.5, 2, 6.5, pave);
    K.solid(-2.25, -1, 132.2, 2.2, 2, 6.6, pave);
    K.solid(T2.x, 4.35, T2.z, 3.6, 8.7, 3.6, stoneDark);
    K.solid(T2.x, 8.7, T2.z, 5.5, 0.3, 5.5, pave);
    K.solid(-3.9, 2.65, 140, 2.2, 0.6, 2.2, stoneDark);
    K.solid(-3.9, 5.6, 142.4, 2.2, 0.6, 2.2, stoneDark);
    // from the causeway a long double jump reached the mossy step past the ring of stones: an
    // unseen wall in between (the ring itself and the invisible stair pass beside and above it)
    K.collider(-3.25, 0.5, 146, 17.5, 7, 0.3, { tag: 'nocam' });
    // a continuous ring of stones (13 of them): this part is about trust, not jumping
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      slab(T2.x + Math.cos(a) * 9, 0, T2.z + Math.sin(a) * 9, 2.4, 2.4, 'post', 5, 't2');
    }
    blindPath('b2', [
      [0, 8.5, 144.6],
      [1.6, 7.8, 145.6],
      [2.6, 7.0, 146.9],
      [2.0, 6.2, 148.4],
      [0.6, 5.4, 149.4],
      [-0.8, 4.6, 150.4],
      [-2.2, 3.8, 151.4],
      [-2.6, 3.0, 152.8],
      [-1.4, 2.2, 153.8],
      [-0.6, 1.4, 154.8],
    ]);

    // section 3 · the clearing of the Great Shadow
    K.solid(0, -1, 167, 4, 2, 10, pave);
    [
      [40, 8.6],
      [37.4, 16],
      [33.6, 22],
      [28.2, 28.2],
    ].forEach(([a, b]) => {
      K.collider(ARENA.x, -1, ARENA.z, a, 2, b);
      K.collider(ARENA.x, -1, ARENA.z, b, 2, a);
    });
    const floor = K.deco(new THREE.CylinderGeometry(ARENA_R + 0.4, ARENA_R - 2, 2, 64), pave, ARENA.x, -1, ARENA.z);
    floor.receiveShadow = false;
    const under = K.deco(new THREE.ConeGeometry(ARENA_R, 22, 12), rock, ARENA.x, -13, ARENA.z);
    under.rotation.x = Math.PI;
    // a low ring wall of roots and stones (with an opening towards the bridge)
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      if (Math.abs(a - Math.PI * 1.5) < 0.2) continue;
      const x = ARENA.x + Math.cos(a) * (ARENA_R + 0.2);
      const z = ARENA.z + Math.sin(a) * (ARENA_R + 0.2);
      K.collider(x, 0.7, z, 2.4, 1.4, 2.4);
      const st = K.deco(new THREE.DodecahedronGeometry(1.15, 0), stoneDark, x, 0.4, z);
      st.rotation.set(i * 0.7, i, i * 0.3);
      st.scale.set(1.2, 0.7, 1.2);
    }
    // the heart engraved in the clearing
    const hs = new THREE.Shape();
    for (let i = 0; i <= 120; i++) {
      const [x, y] = Heart.curve((i / 120) * Math.PI * 2);
      if (i) hs.lineTo(x * 0.55, (y - 2.5) * 0.55);
      else hs.moveTo(x * 0.55, (y - 2.5) * 0.55);
    }
    const inner = new THREE.Shape();
    for (let i = 0; i <= 120; i++) {
      const [x, y] = Heart.curve((i / 120) * Math.PI * 2);
      if (i) inner.lineTo(x * 0.52, (y - 2.5) * 0.52);
      else inner.moveTo(x * 0.52, (y - 2.5) * 0.52);
    }
    hs.holes.push(new THREE.Path(inner.getPoints(120).reverse()));
    const engr = K.deco(
      new THREE.ShapeGeometry(hs, 120).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a9a').multiplyScalar(0.5), transparent: true, opacity: 0.5 }),
      ARENA.x,
      0.03,
      ARENA.z,
    );
    engr.userData.engr = true;
    braziers.length = 0;
    BRAZIERS.forEach((p, i) => {
      K.solid(p[0], 0.55, p[2], 1.2, 1.1, 1.2, stoneDark);
      const bowl = K.deco(new THREE.CylinderGeometry(0.8, 0.4, 0.5, 20, 1, true), iron, p[0], 1.33, p[2]);
      bowl.material.side = THREE.DoubleSide;
      K.deco(new THREE.TorusGeometry(0.8, 0.06, 8, 28).rotateX(Math.PI / 2), brass, p[0], 1.58, p[2]);
      const coals = K.deco(new THREE.CircleGeometry(0.74, 18).rotateX(-Math.PI / 2), glow('#3a1020', 1), p[0], 1.45, p[2]);
      const fl = sprite(flameTex, '#9a6a46', 2.4, 0);
      fl.position.copy(P(p[0], 2.6, p[2]));
      group.add(fl);
      const pool = K.deco(
        new THREE.CircleGeometry(6, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
        p[0],
        0.05,
        p[2],
      );
      // telegraph ring while being kindled
      const prog = K.deco(
        new THREE.RingGeometry(1.4, 1.65, 48, 1, 0, 0.001).rotateX(-Math.PI / 2),
        glow('#ffcf8a', 1.3),
        p[0],
        0.06,
        p[2],
      );
      braziers.push({ i, pos: P(p[0], 0, p[2]), fl, coals, pool, prog, lit: 0, k: 0 });
    });

    Object.keys(POSTS).forEach(postMesh);
    Object.keys(RINGS).forEach(ringMesh);
    Object.keys(LEVERS).forEach(leverMesh);

    // ---------- the forest: rock spires with trees, glowing mushrooms, roots ----------
    const spires = [];
    const r = rng(404);
    const path = [
      [0, 3],
      [0, 25],
      [-2, 44],
      [-1, 62],
      [-2, 75],
      [0, 90],
      [0, 108],
      [0, 125],
      [0, 141],
      [0, 158],
      [0, 192],
    ];
    const nearPath = (x, z, d) =>
      path.some(([px, pz]) => Math.hypot(px - x, pz - z) < d) ||
      Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA_R + 6;
    for (let i = 0; i < 140; i++) {
      const z = -10 + r() * 230;
      const side = r() < 0.5 ? -1 : 1;
      const x = side * (13 + r() * 30);
      if (nearPath(x, z, 12)) continue;
      spires.push([x, z, 0.8 + r() * 5, 1.4 + r() * 1.6]);
    }
    const spireGeo = new THREE.CylinderGeometry(1, 1.5, 1, 7, 4);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 1, 7, 3);
    const leafGeo = new THREE.IcosahedronGeometry(1, 1);
    const spireI = new THREE.InstancedMesh(spireGeo, rock, spires.length);
    const trunkI = new THREE.InstancedMesh(trunkGeo, bark, spires.length * 2);
    const leafI = new THREE.InstancedMesh(leafGeo, leafMat, spires.length * 6);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const S = V3();
    let ti = 0;
    let li = 0;
    spires.forEach(([x, z, top, w], i) => {
      const h = top + 40;
      M.compose(P(x, top - h / 2, z), Q.identity(), S.set(w, h, w));
      spireI.setMatrixAt(i, M);
      K.collider(x, top - 1, z, w * 1.6, 2, w * 1.6);
      for (let k = 0; k < 2; k++) {
        const ox = (r() - 0.5) * w;
        const oz = (r() - 0.5) * w;
        const th = 4 + r() * 6;
        Q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2));
        M.compose(P(x + ox, top + th / 2, z + oz), Q, S.set(1, th, 1));
        trunkI.setMatrixAt(ti++, M);
        for (let j = 0; j < 3; j++) {
          const s = 1.4 + r() * 1.8 - j * 0.3;
          Q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
          M.compose(P(x + ox + (r() - 0.5), top + th - 0.6 + j * 1.3, z + oz + (r() - 0.5)), Q, S.set(s, s * 0.8, s));
          leafI.setMatrixAt(li++, M);
        }
      }
    });
    trunkI.count = ti;
    leafI.count = li;
    group.add(spireI, trunkI, leafI);
    // bioluminescent mushrooms on the islands' edges: the forest is readable even in the dark
    const shroomCap = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const shroomStem = new THREE.CylinderGeometry(0.25, 0.32, 1, 8);
    const capMats = ['#ff7ab8', '#7ad8ff', '#b98cff'].map((c) =>
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.32) }),
    );
    const stemMat = new THREE.MeshStandardMaterial({ color: '#d8cfe0', roughness: 0.8, emissive: '#3a2a48', emissiveIntensity: 0.5 });
    const shrooms = [];
    Object.values(ISLANDS).forEach(([x, z, sx, sz]) => {
      for (let i = 0; i < 9; i++) {
        const e = r() < 0.5;
        const px = x + (e ? (r() < 0.5 ? -1 : 1) * (sx / 2 - 0.5) : (r() - 0.5) * (sx - 1));
        const pz = z + (!e ? (r() < 0.5 ? -1 : 1) * (sz / 2 - 0.5) : (r() - 0.5) * (sz - 1));
        shrooms.push([px, pz, 0.07 + r() * 0.13, (r() * 3) | 0]);
      }
    });
    shrooms.forEach(([x, z, s, c]) => {
      const st = K.deco(shroomStem, stemMat, x, s * 1.2, z);
      st.scale.set(s, s * 2.4, s);
      const cap = K.deco(shroomCap, capMats[c], x, s * 2.4, z);
      cap.scale.set(s * 2.2, s * 1.4, s * 2.2);
    });

    // ---------- the lantern ----------
    lantern = new THREE.Group();
    const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.06, 16), brass);
    const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 16), brass);
    lCap.position.y = 0.42;
    const lRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 18), brass);
    lRing.position.y = 0.55;
    const bars = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), brass);
      b.position.set(Math.cos(a) * 0.16, 0.2, Math.sin(a) * 0.16);
      bars.push(b);
    }
    const lGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.32, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a8').multiplyScalar(0.55), transparent: true, opacity: 0.35, depthWrite: false }),
    );
    lGlass.position.y = 0.2;
    const lFlame = sprite(flameTex, '#d8b080', 0.5, 1);
    lFlame.position.y = 0.2;
    const lHalo = sprite(haloTex, '#ffc48a', 3.2, 0.55);
    lHalo.position.y = 0.2;
    lantern.add(lBase, lCap, lRing, lGlass, lFlame, lHalo, ...bars);
    lantern.userData = { flame: lFlame, halo: lHalo };
    group.add(lantern);
    lanternLight = new THREE.PointLight('#ffc48a', 2.6, 16, 2);
    group.add(lanternLight);

    // ---------- fireflies (around the camera, brighter near the lantern) ----------
    const N = 700;
    const fp = new Float32Array(N * 3);
    const fr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      fp.set([(r() - 0.5) * 60, r() * 10 - 2, (r() - 0.5) * 60], i * 3);
      fr[i] = r();
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('aR', new THREE.BufferAttribute(fr, 1));
    fireflies = new THREE.Points(
      fg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uCam: { value: V3() }, uLamp: { value: V3() }, uR: { value: 7 }, uPx: { value: 1 } },
        vertexShader: `
          attribute float aR;
          uniform float uTime, uR, uPx;
          uniform vec3 uCam, uLamp;
          varying float vA;
          varying vec3 vC;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * (0.3 + aR * 0.5) + aR * 40.0) * 2.0;
            p.y += sin(uTime * (0.5 + aR) + aR * 20.0) * 0.8;
            p.z += cos(uTime * (0.25 + aR * 0.4) + aR * 30.0) * 2.0;
            // wrap the cloud around the camera
            vec3 c = uCam;
            p.xz = c.xz + mod(p.xz - c.xz + 30.0, 60.0) - 30.0;
            p.y += c.y - 3.0;
            float d = distance(p, uLamp);
            float lit = smoothstep(uR * 1.6, uR * 0.4, d);
            vA = (0.25 + 0.75 * lit) * (0.5 + 0.5 * sin(uTime * 3.0 + aR * 60.0));
            vC = mix(vec3(0.55, 0.95, 0.7), vec3(1.0, 0.8, 0.45), lit);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (2.0 + aR * 3.0) * uPx * (30.0 / -mv.z);
          }
        `,
        fragmentShader: `
          varying float vA;
          varying vec3 vC;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = pow(1.0 - d * 2.0, 2.0);
            gl_FragColor = vec4(vC * a * vA * 0.8, a * vA);
          }
        `,
      }),
    );
    fireflies.frustumCulled = false;
    group.add(fireflies);

    // ---------- a starless night over the forest (turns to dawn at the end) ----------
    night = new THREE.Mesh(
      new THREE.SphereGeometry(420, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uDawn: { value: 0 }, uTime: { value: 0 } },
        vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uDawn, uTime;
          varying vec3 vD;
          float h(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          void main() {
            float y = vD.y;
            vec3 low = mix(vec3(0.03, 0.02, 0.06), vec3(0.95, 0.52, 0.38), uDawn);
            vec3 top = mix(vec3(0.006, 0.004, 0.018), vec3(0.32, 0.36, 0.62), uDawn);
            vec3 col = mix(low, top, smoothstep(-0.05, 0.6, y));
            // a veiled moon low in the trees and a few stars through the canopy
            float moon = pow(max(0.0, dot(vD, normalize(vec3(0.4, 0.22, 0.88)))), 260.0);
            col += vec3(0.8, 0.75, 1.0) * moon * (1.0 - uDawn) + vec3(0.25, 0.2, 0.4) * pow(max(0.0, dot(vD, normalize(vec3(0.4, 0.22, 0.88)))), 12.0) * 0.25 * (1.0 - uDawn);
            float s = h(floor(vD * 220.0));
            col += vec3(0.9, 0.85, 1.0) * step(0.9975, s) * smoothstep(0.1, 0.5, y) * (0.6 + 0.4 * sin(uTime * 2.0 + s * 50.0)) * (1.0 - uDawn) * 0.6;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    night.renderOrder = -9;
    night.frustumCulled = false;
    group.add(night);

    // ---------- mist of the abyss ----------
    mist = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uLamp: { value: V3() } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uLamp;
          varying vec3 vW;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
          float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
          void main() {
            vec2 p = vW.xz * 0.05;
            float m = n(p + uTime * 0.03) * 0.5 + n(p * 2.3 - uTime * 0.05) * 0.3 + n(p * 5.0 + uTime * 0.08) * 0.2;
            float glow = smoothstep(18.0, 0.0, distance(vW.xz, uLamp.xz)) * 0.35;
            vec3 col = mix(vec3(0.07, 0.04, 0.12), vec3(0.22, 0.14, 0.3), m) + vec3(0.5, 0.3, 0.2) * glow;
            gl_FragColor = vec4(col, 0.55 + m * 0.35);
          }
        `,
      }),
    );
    mist.position.copy(P(0, -6, 100));
    group.add(mist);

    // ---------- wraiths ----------
    [
      [6.5, 1.2, 22],
      [-7, 1.2, 31],
      [13, 1.0, 104],
      [12.5, 1.0, 113],
      [-12, 1.0, 108],
      [-9, 1.0, 128.5],
      [13, 1.0, 137],
      [12.5, 1.0, 146],
      [-12, 1.0, 141],
      [9, 1.0, 162],
    ].forEach(([x, y, z], i) => {
      const w = makeWraith();
      const home = P(x, y, z);
      w.g.position.copy(home);
      wraiths.push({ ...w, i, home, pos: home.clone(), target: home.clone(), frozen: 0, wake: 0 });
    });

    boss = makeBoss();
    // attack decals: 4 sectors and a pool of grasp circles
    boss.sectors = [0, 1, 2, 3].map((k) => {
      // covers the angles atan2(z, x) in [-SWEEP - rotation.y, -rotation.y] around the arena centre
      const m = new THREE.Mesh(new THREE.RingGeometry(2.5, ARENA_R, 24, 4, 0, SWEEP).rotateX(-Math.PI / 2), sectorMat());
      m.position.copy(P(ARENA.x, 0.07, ARENA.z));
      m.visible = false;
      group.add(m);
      return { m, k: 0, wave: -1, a: 0 };
    });
    boss.grasps = [0, 1].map(() => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.8, 2.2, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a6a').multiplyScalar(0.85), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
      );
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(2.2, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#12001e', transparent: true, opacity: 0, depthWrite: false }),
      );
      const hands = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.6, 6).translate(0, 1.3, 0), boss.mat);
        const a = (i / 6) * Math.PI * 2;
        c.position.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1);
        c.rotation.set(-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35);
        hands.add(c);
      }
      hands.scale.y = 0.001;
      const g = new THREE.Group();
      g.add(ring, disc, hands);
      g.visible = false;
      group.add(g);
      return { g, ring, disc, hands, t: -1 };
    });

    // ---------- card, dawn heart, screen ----------
    card = LvKit.trialCard('h4', true);
    card.position.copy(P(ARENA.x, 12, ARENA.z));
    group.add(card);
    dawnHeart = Heart.galaxy(9000, 1.1, 33);
    dawnHeart.group.position.copy(P(ARENA.x, 30, ARENA.z + 40));
    dawnHeart.group.lookAt(P(ARENA.x, 4, ARENA.z - 20));
    dawnHeart.U.uForm.value = 0;
    dawnHeart.core.material.opacity = 0;
    dawnHeart.group.visible = false;
    group.add(dawnHeart.group);
    // a screen hung between two trunks at the start, facing the path
    screen = makeScreen(7, 3.2, 1024);
    screen.mesh.position.copy(P(-6.2, 3.4, 6));
    screen.mesh.rotation.y = Math.PI / 2;
    group.add(screen.mesh);
    [-1, 1].forEach((sd) => {
      const tr = K.deco(new THREE.CylinderGeometry(0.28, 0.4, 6, 8), bark, -6.4, 2.6, 6 + sd * 2.6);
      tr.rotation.z = sd * 0.04;
      K.collider(-6.4, 2.6, 6 + sd * 2.6, 0.7, 6, 0.7);
    });
  };

  // ---------- light ----------
  const light = { pos: V3(), r: 0, post: null, on: false };
  /** True when p (world) stands inside the lantern's glow (or a lit brazier's). */
  const inLight = (p, pad = 0) => {
    if (light.on) {
      // a lantern hung high on a tower lights the whole ravine below it
      if (light.post && light.pos.y - p.y > 3) {
        if (Math.hypot(p.x - light.pos.x, p.z - light.pos.z) < light.r + pad && light.pos.y - p.y < 14) return true;
      } else if (p.distanceTo(light.pos) < light.r + pad) return true;
    }
    for (const g of glows) if (p.distanceTo(g.pos) < g.r + pad) return true;
    for (const b of braziers)
      if (b.lit && Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 6 + pad && Math.abs(p.y - b.pos.y) < 4) return true;
    return false;
  };

  // ---------- per-frame visuals ----------
  const update = (dt, t, st) => {
    if (!built) return;
    // the lantern itself (st.lampPos is where it hangs this frame)
    lantern.position.copy(st.lampPos);
    lantern.visible = !st.hideLamp;
    const fl = lantern.userData.flame;
    const flick = 0.92 + Math.sin(t * 13) * 0.04 + Math.sin(t * 29) * 0.03;
    const power = st.power != null ? st.power : 1;
    fl.scale.setScalar(0.42 * flick * (0.5 + power * 0.5));
    lantern.userData.halo.scale.setScalar((2 + light.r * 0.25) * flick);
    lantern.userData.halo.material.opacity = 0.3 + power * 0.3;
    lanternLight.position.copy(st.lampPos).y += 0.25;
    lanternLight.distance = light.r * 1.9;
    lanternLight.intensity = (1.4 + light.r * 0.16) * flick * (0.35 + power * 0.65);
    // stones of light
    slabs.forEach((s) => {
      const d = light.on ? s.pos.distanceTo(light.pos) : 1e9;
      const ok = s.kind === 'post' ? light.post === s.post && d < light.r : d < light.r;
      s.grace = ok ? 0.45 : Math.max(0, s.grace - dt);
      s.b.on = ok || s.grace > 0;
      const want = ok ? 1 : s.grace > 0 ? 0.35 : 0;
      s.k = damp(s.k, want, ok ? 6 : 9, dt);
      s.m.visible = s.k > 0.01;
      s.m.material.opacity = s.k * 0.95;
      s.m.material.emissiveIntensity = 0.08 + s.k * 0.18 + (ok ? Math.sin(t * 3 + s.pos.z) * 0.03 : 0);
      s.rune.material.opacity = s.k * 0.55;
    });
    // invisible stairs: visible stone inside the lantern's glow, chalk only for whoever guides
    ['b1', 'b2'].forEach((k) => {
      const show = st.chalk === k;
      blind[k].chalk.opacity = damp(blind[k].chalk.opacity, show ? 0.55 : 0, 4, dt);
      blind[k].edge.opacity = blind[k].chalk.opacity * (1.2 + Math.sin(t * 3) * 0.25);
      let lit = 0;
      blind[k].forEach((b) => {
        if (light.on && b.pos.distanceTo(light.pos) < light.r) lit = Math.max(lit, 1);
      });
      blind[k].stone.opacity = damp(blind[k].stone.opacity, lit ? 0.8 : 0, 4, dt);
      blind[k].forEach((b) => (b.m.visible = blind[k].stone.opacity > 0.02 || blind[k].chalk.opacity > 0.02));
    });
    // posts glow when they can take the lantern
    Object.entries(posts).forEach(([id, p]) => {
      p.ring.material.opacity = light.post === id ? 0.5 + Math.sin(t * 2) * 0.1 : 0.18;
    });
    Object.values(rings).forEach((rg) => (rg.m.rotation.y = t));
    Object.values(levers).forEach((lv) => {
      lv.arm.rotation.x = lerp(-0.6, 0.7, lv.down);
    });
    // wraiths: positions come from the host, frozen state from the light on each screen
    wraiths.forEach((w) => {
      w.pos.lerp(w.target, 1 - Math.exp(-8 * dt));
      const fz = inLight(w.pos, 0.5) ? 1 : 0;
      w.frozen = damp(w.frozen, fz, fz ? 6 : 2, dt);
      w.mat.uniforms.uTime.value = t + w.i * 3.1;
      w.mat.uniforms.uFrozen.value = w.frozen;
      w.g.position.copy(w.pos);
      w.g.position.y += Math.sin(t * 1.7 + w.i) * 0.15 * (1 - w.frozen);
      if (w.face) w.g.rotation.y = angleDamp(w.g.rotation.y, w.face, 4, dt);
      w.eyes.forEach((e) => {
        e.material.color.set(w.frozen > 0.5 ? '#bfe6ff' : '#ff7ab8');
        e.material.opacity = 0.5 + (1 - w.frozen) * 0.5;
      });
      w.tails.forEach((tl, i) => (tl.scale.y = 1 + Math.sin(t * 4 + i) * 0.25 * (1 - w.frozen)));
    });
    // braziers
    braziers.forEach((b) => {
      b.k = damp(b.k, b.lit ? 1 : 0, 2, dt);
      b.fl.material.opacity = b.k * (0.62 + Math.sin(t * 11 + b.i) * 0.06) * (1 - Math.min(1, st.dawn || 0) * 0.45);
      b.fl.scale.set(2.2 + Math.sin(t * 7 + b.i) * 0.15, 2.8 + Math.sin(t * 9 + b.i) * 0.25, 1);
      b.pool.material.opacity = b.k * 0.5;
      b.coals.material.color.set('#ff7a3a').multiplyScalar(0.25 + b.k * 0.9);
    });
    // fireflies, mist
    const U = fireflies.material.uniforms;
    U.uTime.value = t;
    U.uCam.value.copy(R.camera.position);
    U.uLamp.value.copy(st.lampPos);
    U.uR.value = light.r;
    U.uPx.value = R.renderer.getPixelRatio();
    mist.material.uniforms.uTime.value = t;
    mist.material.uniforms.uLamp.value.copy(st.lampPos);
    mist.position.x = R.camera.position.x;
    mist.position.z = R.camera.position.z;
    // the Great Shadow
    if (boss) {
      const B = boss;
      const vis = st.stage >= 5 && B.alive > 0.03;
      B.g.visible = vis;
      B.mat.uniforms.uTime.value = t;
      B.mat.uniforms.uAlpha.value = 0.96 * B.alive;
      B.voidMat.opacity = B.alive;
      B.eyes.forEach((e) => (e.material.opacity = B.alive));
      B.hg.U.uFade.value = 1 - B.alive;
      B.hg.core.material.opacity = 0.14 * B.alive;
      B.hurt = Math.max(0, B.hurt - dt);
      B.cast = Math.max(0, B.cast - dt);
      if (vis) {
        B.g.position.y = O.y + Math.sin(t * 0.7) * 0.4 + (1 - B.alive) * -6;
        B.g.rotation.y = angleDamp(B.g.rotation.y, st.bossFace || 0, 1.5, dt);
        // every brazier lit makes it shrink and cower a little
        const sc = damp(B.g.scale.x, 1 - (st.lit || 0) * 0.07, 2, dt);
        B.g.scale.setScalar(sc);
        const lift = B.cast > 0 ? Math.sin((1 - B.cast / 1.6) * Math.PI) : 0;
        B.arms.forEach((a) => {
          a.sh.rotation.z = a.sd * (0.35 + lift * 0.9 + Math.sin(t * 0.9 + a.sd) * 0.06) - B.hurt * a.sd * 0.6;
          a.sh.rotation.x = -0.2 - lift * 0.8 + B.hurt * 0.5;
          a.fore.rotation.x = -0.4 - lift * 0.6;
        });
        B.eyes.forEach((e) => {
          e.material.color.set(B.hurt > 0 ? '#c8c8d8' : '#5a88a0');
          e.scale.setScalar(1.1 + B.hurt * 0.6 + Math.sin(t * 5) * 0.05);
        });
        B.crown.forEach((c, i) => (c.scale.y = 1 + Math.sin(t * 2.5 + i) * 0.2));
        B.hg.U.uTime.value = t;
        B.hg.U.uPx.value = R.renderer.getPixelRatio() * 0.16;
        B.hg.U.uFill.value = damp(B.hg.U.uFill.value, 0.1 + (st.lit || 0) * 0.22, 2, dt);
        B.hg.U.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.4)), 10) * (0.3 + (st.lit || 0) * 0.2);
      }
      B.sectors.forEach((s) => {
        s.m.visible = s.k > 0.01 || s.wave >= 0;
        s.m.material.uniforms.uK.value = s.k;
        s.m.material.uniforms.uWave.value = s.wave;
        s.m.material.uniforms.uTime.value = t;
        s.m.rotation.y = s.a;
      });
      B.grasps.forEach((gr) => {
        if (gr.t < 0) {
          gr.g.visible = false;
          return;
        }
        gr.t += dt;
        gr.g.visible = true;
        const tele = clamp(gr.t / 1.3, 0, 1);
        gr.ring.material.opacity = gr.t < 1.3 ? 0.4 + Math.sin(gr.t * 18) * 0.25 : Math.max(0, 1 - (gr.t - 1.3) * 2);
        gr.disc.material.opacity = tele * 0.55;
        const rise = gr.t > 1.3 ? Math.sin(clamp((gr.t - 1.3) / 0.8, 0, 1) * Math.PI) : 0;
        gr.hands.scale.y = Math.max(0.001, rise);
        if (gr.t > 2.3) gr.t = -1;
      });
    }
    night.position.copy(R.camera.position);
    night.material.uniforms.uTime.value = t;
    night.material.uniforms.uDawn.value = damp(night.material.uniforms.uDawn.value, Math.min(1, st.dawn || 0), 1.5, dt);
    // dawn
    if (st.dawn > 0) {
      dawnHeart.group.visible = true;
      dawnHeart.U.uTime.value = t;
      dawnHeart.U.uPx.value = R.renderer.getPixelRatio() * 0.45;
      dawnHeart.U.uForm.value = Math.min(1, st.dawn * 0.8);
      dawnHeart.core.material.opacity = Math.min(1, st.dawn) * 0.12;
      card.visible = true;
      card.position.y = O.y + Math.max(1.4, 12 - st.dawn * 7) + Math.sin(t * 1.6) * 0.1;
      card.rotation.y = t * 0.8;
    } else {
      card.visible = false;
      dawnHeart.group.visible = false;
    }
    if (screen && screen.update) screen.update(dt, t);
  };

  const at = (name, q, pad = 0) => {
    const [x, z, sx, sz] = ISLANDS[name];
    return Math.abs(q.x - x) < sx / 2 + pad && Math.abs(q.z - z) < sz / 2 + pad && q.y > -1 && q.y < 3;
  };

  return {
    O,
    P,
    build,
    get built() {
      return built;
    },
    hide() {
      group.visible = false;
    },
    rel: K.rel,
    update,
    light,
    inLight,
    get gapWall() {
      return gapWall;
    },
    slabs,
    posts,
    rings,
    levers,
    wraiths,
    braziers,
    get boss() {
      return boss;
    },
    get screen() {
      return screen;
    },
    blind,
    T1,
    T2,
    ARENA,
    ARENA_R,
    SWEEP,
    at,
    onB2: (q) => Math.abs(q.x + 2) < 6.2 && q.z > 65.8 && q.z < 76.2 && q.y > 2.5,
    inArena: (q) => Math.hypot(q.x - ARENA.x, q.z - ARENA.z) < ARENA_R && q.y > -1 && q.y < 4,
    onTop1: (q) => Math.abs(q.x - T1.x) < 2.9 && Math.abs(q.z - T1.z) < 2.9 && q.y > 6.8,
    onTop2: (q) => Math.abs(q.x - T2.x) < 2.9 && Math.abs(q.z - T2.z) < 2.9 && q.y > 8.4,
    spawn(stage, who, sub = {}) {
      const d = who === 'dame' ? -2 : 2;
      if (stage <= 1) return P(d, 0, 2);
      if (stage === 2) return P(-2 + d, 0, 44);
      if (stage === 3) return P(-1.5 + d * 1.2, 0, 63);
      if (stage === 4) {
        if (who === 'dame' && sub.top) return P(0, 7.3, 108.6);
        if (who === 'valet' && sub.blind) return P(1, 0, 125);
        return P(d, 0, 90);
      }
      if (stage === 5) {
        if (who === 'valet' && sub.top) return P(0, 8.85, 141.5);
        if (who === 'dame' && sub.blind) return P(-1, 0, 158);
        return P(d, 0, 125);
      }
      return P(d, 0, 175);
    },
    nearPost(q, r = 1.7) {
      return Object.keys(posts).find((id) => {
        const p = posts[id].pos;
        return Math.hypot(q.x - (p.x - O.x), q.z - (p.z - O.z)) < r && Math.abs(q.y - (p.y - O.y - 1.15)) < 1.2;
      });
    },
    nearLever(q) {
      return Object.keys(levers).find((id) => {
        const p = LEVERS[id];
        return Math.hypot(q.x - p[0], q.z - p[2]) < 2.3 && Math.abs(q.y) < 1.2;
      });
    },
    nearBrazier(q) {
      return braziers.find((b) => Math.hypot(q.x - (b.pos.x - O.x), q.z - (b.pos.z - O.z)) < 2.3 && q.y < 2);
    },
    nearCard: (q) => Math.hypot(q.x - ARENA.x, q.z - ARENA.z) < 2.8 && q.y < 2.5,
    // where a grapple from this ring lands
    grappleLand(q) {
      let best = null;
      let bd = 1e9;
      Object.values(rings).forEach((rg) => {
        const d = Math.hypot(q.x - (rg.pos.x - O.x), q.z - (rg.pos.z - O.z));
        if (d < bd) {
          bd = d;
          best = rg;
        }
      });
      return best && bd < 6 ? best.land : null;
    },
  };
})();
