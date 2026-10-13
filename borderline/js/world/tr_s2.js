// ♠ 2 · Les Toits qui tombent: a night rooftop run in three sections and a final leap.
// 1 · the rhythm (crumbling tiles, the Dame's grapple drops a ladder, the Valet kicks a plank),
// 2 · the zip line, the swinging crane hook and the sliding billboard (one holds, one crosses),
// 3 · the Joker's drones and the roof collapsing behind you, then the catch over the last gap.
const TrS2 = (() => {
  const O = V3(2100, 0, 2800);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const { P } = K;
  let built = false;

  // ---------- layout (local coordinates, +z forward) ----------
  // roofs: [x0, x1, z0, z1, top y, parapet sides?]
  const ROOFS = {
    r1: [-8, 8, -8, 18, 0],
    r2a: [-7, 7, 22, 26, 0],
    r2b: [-7, 7, 42, 46, 0],
    r3: [-8, 8, 51, 72, 0],
    r3b: [0, 8, 60, 72, 4.5],
    r4: [-7, 7, 84, 98, 0],
    r5: [-9, 9, 113, 131, 0],
    r6: [-8, 8, 172, 196, -2],
    r7: [-8, 8, 222, 244, -1],
    r8: [-9, 9, 262, 282, -0.2],
    rf: [-8, 8, 400, 418, 2],
  };
  // section 3: roofs made of 4 m strips that collapse behind you
  const STRIP_ROOFS = [
    [-8, 8, 282, 318, 0],
    [-7, 7, 321.5, 345.5, 0],
    [-8, 8, 350, 386, 1.2],
  ];
  const TILE_BAND = { x0: -6, x1: 6, z0: 26, z1: 42, y: 0 };
  const STONES = [
    [-1.8, 100.6],
    [1.8, 104],
    [-1.6, 107.4],
    [1.6, 110.6],
  ];
  const LADDER_DOWN_FIX = Math.atan2(4.5, 7.4);
  const RING1 = V3(4, 7.6, 58.6);
  const LAND1 = V3(4, 4.5, 63.2);
  const RING2 = V3(0, 8.4, 396.5);
  const LAND2 = V3(-1.6, 2, 404.5);
  const WINCH = V3(2.2, 4.5, 61.3);
  const TOWER = V3(4.5, 7, 67.5);
  const PLANK_LEVER = V3(2.5, 7, 66.2);
  const ZIP_A = V3(0, 8.2, 128.6);
  const ZIP_B = V3(0, 0.25, 175.2);
  const CRANE = { pivot: V3(0, 38, 209), len: 40.5, amp: 10.6, period: 8 };
  const BB = { x0: 17, x1: 0, z0: 244, z1: 262, y: -0.6, w: 3.4 };
  const LEVER1 = V3(-5.5, -1, 241);
  const LEVER2 = V3(5.5, -0.2, 265);
  const PAD = V3(0, 1.2, 384.4);
  const CATCH = V3(0, 2, 401.3);
  const CARD = V3(0, 2, 412);
  // checkpoints: [min local z reached, position], per player (section 3 resets as a team)
  const CPS = [
    [-99, 0, 0],
    [84, 0, 87],
    [113, 0, 116],
    [172, -2, 176],
    [222, -1, 226],
    [262, -0.2, 266],
  ];

  // ---------- materials (1024²+ procedural PBR, triplanar in world space) ----------
  const roofM = Tex.mat('asphalt', { color: '#4e4658', scale: 3, bump: 1.2 });
  const gravelM = Tex.mat('asphalt', { color: '#3c3646', scale: 1.4, bump: 2 });
  const parapetM = Tex.mat('concrete', { color: '#7a6d86', scale: 2.4, bump: 1.1 });
  const tileM = Tex.mat('tiles', { color: '#a06e72', scale: 2, bump: 1.4 });
  const brickM = Tex.mat('brick', { color: '#8a5f62', scale: 2.4, bump: 1.2 });
  // low metalness: without an environment map, metal renders black
  const ironM = Tex.mat('metal', { color: '#6a6276', metal: 0.25, rough: 0.7, scale: 1.4 });
  const steelM = Tex.mat('metal', { color: '#a09cae', metal: 0.3, rough: 0.45, scale: 1.2 });
  const woodM = Tex.mat('wood', { color: '#9a6a4a', scale: 1.5, bump: 1.2 });
  const glassM = new THREE.MeshStandardMaterial({
    color: '#5a7a9a',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    emissive: '#1a1030',
  });
  const glow = LvKit.glow;

  // UV-mapped textures for things that move (triplanar would slide on them)
  const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
    const t = LvKit.tex(w, h, draw, rx, ry);
    try {
      t.anisotropy = Math.min(8, R.renderer.capabilities.getMaxAnisotropy());
    } catch (e) {}
    return t;
  };
  let gratingTex = null;
  let plankTex = null;
  let crackTex = null;
  let boardTex = null;
  let clayMat = null;
  const makeTextures = () => {
    // terracotta roof tiles: overlapping rows of curved clay, each tile a little different
    const clay = canvasTex(2048, 2048, (g, w, h) => {
      g.fillStyle = '#5a1e18';
      g.fillRect(0, 0, w, h);
      const rows = 4;
      const cols = 3;
      const th = h / rows;
      const tw = w / cols;
      for (let r = rows; r >= -1; r--) {
        for (let c = -1; c <= cols; c++) {
          const x = c * tw + (r % 2 ? tw / 2 : 0);
          const y = r * th;
          const k = 0.75 + Math.random() * 0.4;
          const grd = g.createLinearGradient(x, 0, x + tw, 0);
          grd.addColorStop(0, `rgb(${(110 * k) | 0},${(38 * k) | 0},${(28 * k) | 0})`);
          grd.addColorStop(0.45, `rgb(${(196 * k) | 0},${(84 * k) | 0},${(58 * k) | 0})`);
          grd.addColorStop(1, `rgb(${(96 * k) | 0},${(32 * k) | 0},${(24 * k) | 0})`);
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(x + 6, y);
          g.lineTo(x + tw - 6, y);
          g.lineTo(x + tw - 10, y + th * 1.18);
          g.quadraticCurveTo(x + tw / 2, y + th * 1.32, x + 10, y + th * 1.18);
          g.closePath();
          g.fill();
          // shadow of the row above + moss and grime
          g.fillStyle = 'rgba(20,6,6,0.75)';
          g.fillRect(x + 8, y, tw - 16, 40);
          g.fillStyle = 'rgba(255,200,170,0.18)';
          g.fillRect(x + tw * 0.38, y + 30, tw * 0.12, th * 0.9);
          for (let i = 0; i < 40; i++) {
            g.fillStyle = Math.random() < 0.15 ? 'rgba(70,90,40,0.25)' : 'rgba(0,0,0,0.12)';
            g.fillRect(x + 8 + Math.random() * (tw - 16), y + Math.random() * th, 2 + Math.random() * 6, 2 + Math.random() * 6);
          }
        }
      }
    });
    clayMat = new THREE.MeshStandardMaterial({ map: clay, roughness: 0.82, color: '#d8b0a8' });
    gratingTex = canvasTex(
      2048,
      2048,
      (g, w, h) => {
        LvKit.grain(g, w, h, '#3c3644', 0.14, 60000);
        g.strokeStyle = 'rgba(20,16,26,0.9)';
        g.lineWidth = 10;
        for (let i = 0; i <= 32; i++) {
          g.beginPath();
          g.moveTo((i * w) / 32, 0);
          g.lineTo((i * w) / 32, h);
          g.stroke();
        }
        g.strokeStyle = 'rgba(150,140,170,0.35)';
        g.lineWidth = 3;
        for (let i = 0; i <= 32; i++) {
          g.beginPath();
          g.moveTo((i * w) / 32 + 6, 0);
          g.lineTo((i * w) / 32 + 6, h);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,207,138,0.85)';
        for (let i = 0; i < 2; i++) g.fillRect(i ? w - 70 : 30, 0, 40, h);
      },
      1,
      4,
    );
    plankTex = canvasTex(
      1024,
      2048,
      (g, w, h) => {
        g.fillStyle = '#7a5236';
        g.fillRect(0, 0, w, h);
        for (let b = 0; b < 3; b++) {
          const x0 = (b * w) / 3;
          const grd = g.createLinearGradient(x0, 0, x0 + w / 3, 0);
          grd.addColorStop(0, '#5e3d27');
          grd.addColorStop(0.5, b === 1 ? '#9a6c48' : '#8a5e3e');
          grd.addColorStop(1, '#5a3a24');
          g.fillStyle = grd;
          g.fillRect(x0 + 4, 0, w / 3 - 8, h);
          for (let i = 0; i < 70; i++) {
            g.strokeStyle = `rgba(40,22,10,${0.15 + Math.random() * 0.25})`;
            g.lineWidth = 1 + Math.random() * 2;
            const x = x0 + 10 + Math.random() * (w / 3 - 20);
            g.beginPath();
            g.moveTo(x, 0);
            g.bezierCurveTo(x + 8, h * 0.3, x - 8, h * 0.6, x + 4, h);
            g.stroke();
          }
          for (let k = 0; k < 6; k++) {
            g.fillStyle = '#2a2a30';
            g.beginPath();
            g.arc(x0 + w / 6, 60 + k * ((h - 120) / 5), 9, 0, 6.28);
            g.fill();
          }
        }
      },
    );
    crackTex = canvasTex(1024, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.lineCap = 'round';
      const branch = (x, y, a, len, wdt) => {
        if (len < 18 || wdt < 1) return;
        const x2 = x + Math.cos(a) * len;
        const y2 = y + Math.sin(a) * len;
        g.strokeStyle = 'rgba(255,120,60,0.95)';
        g.lineWidth = wdt;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x2, y2);
        g.stroke();
        branch(x2, y2, a + (Math.random() - 0.5) * 0.9, len * 0.75, wdt * 0.72);
        if (Math.random() < 0.55)
          branch(x2, y2, a + (Math.random() < 0.5 ? 1 : -1) * 0.9, len * 0.55, wdt * 0.6);
      };
      for (let i = 0; i < 6; i++) branch(w / 2, h / 2, (i / 6) * 6.28 + Math.random() * 0.5, 170, 14);
    });
    boardTex = canvasTex(2048, 640, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, '#1a0820');
      grd.addColorStop(1, '#2a0c24');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff5f8a';
      g.lineWidth = 14;
      g.shadowColor = '#ff5f8a';
      g.shadowBlur = 40;
      g.strokeRect(30, 30, w - 60, h - 60);
      g.shadowBlur = 50;
      g.fillStyle = '#ffd6e2';
      g.font = 'italic 230px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Café des Deux', w * 0.42, h * 0.48);
      // the voyage heart, in neon
      g.save();
      g.translate(w * 0.86, h * 0.5);
      g.beginPath();
      for (let i = 0; i <= 80; i++) {
        const t = (i / 80) * Math.PI * 2;
        const s3 = Math.sin(t);
        const x = 16 * s3 * s3 * s3 * 9;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 9;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.strokeStyle = '#ff3d7f';
      g.lineWidth = 16;
      g.stroke();
      g.restore();
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,214,226,0.7)';
      g.font = '600 64px "IBM Plex Mono", monospace';
      g.fillText('OUVERT TOUTE LA NUIT', w * 0.42, h * 0.8);
    });
  };

  // ---------- building facades: instanced, procedural windows in world space ----------
  const fogU = THREE.UniformsLib.fog;
  const facadeMat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: { ...fogU, uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vW;
      varying vec3 vN;
      varying float vSeed;
      varying float vTop;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vTop = instanceMatrix[3].y + length(instanceMatrix[1].xyz) * 0.5;
        vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vW;
      varying vec3 vN;
      varying float vSeed;
      varying float vTop;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float side = 1.0 - abs(vN.y);
        vec2 f = abs(vN.x) > 0.5 ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y);
        // brick / concrete bands with grime running down
        float br = step(0.5, vSeed);
        vec2 bp = f * vec2(4.0, 8.0);
        bp.x += step(1.0, mod(floor(bp.y), 2.0)) * 0.5;
        float mortar = br * (step(fract(bp.x), 0.06) + step(fract(bp.y), 0.1));
        vec3 base = mix(vec3(0.11, 0.06, 0.09), vec3(0.16, 0.09, 0.15), vSeed);
        base *= 0.75 + 0.5 * noise(f * 1.3) - mortar * 0.25;
        base *= 1.0 - 0.35 * smoothstep(0.3, 1.0, noise(vec2(f.x * 2.0, f.y * 0.15)));
        vec2 g = f / vec2(2.9, 3.5);
        vec2 id = floor(g);
        vec2 fr = fract(g);
        float win = step(0.26, fr.x) * step(fr.x, 0.74) * step(0.28, fr.y) * step(fr.y, 0.74);
        float frame = step(0.22, fr.x) * step(fr.x, 0.78) * step(0.24, fr.y) * step(fr.y, 0.78) - win;
        float mull = win * step(abs(fr.x - 0.5), 0.015);
        vec3 rn = floor(vN + 0.5);
        float h = hash(id + floor(vSeed * 97.0) + rn.x * 7.0 + rn.z * 13.0);
        float lit = step(0.66, h);
        // a few windows flicker (a TV inside)
        lit *= 0.85 + 0.15 * step(0.97, h) * sin(uTime * (8.0 + h * 20.0));
        vec3 wc = mix(vec3(1.0, 0.68, 0.4), vec3(0.6, 0.72, 1.0), step(0.85, h));
        wc = mix(wc, vec3(1.0, 0.36, 0.6), step(0.94, h));
        float room = 0.55 + 0.45 * smoothstep(0.0, 0.7, 1.0 - abs(fr.x - (0.3 + 0.4 * hash(id + 3.1))) * 2.2);
        float curtain = step(0.45, hash(id + 9.7)) * smoothstep(0.6, 0.56, fr.x) * 0.5;
        wc *= room * (1.0 - curtain);
        float band = step(vW.y, vTop - 1.2);
        float diff = max(dot(vN, normalize(vec3(-0.4, 0.8, -0.3))), 0.0);
        vec3 col = base * (0.4 + 0.5 * diff);
        vec3 glass = vec3(0.02, 0.018, 0.04) + vec3(0.06, 0.04, 0.09) * fr.y;
        col = mix(col, col * 0.5, frame * side * band);
        col = mix(col, lit * wc * (0.5 + 0.35 * h) + (1.0 - lit) * glass, win * side * band);
        col *= 1.0 - mull * 0.8;
        // neon trim under the roof line on some buildings
        col += vec3(1.0, 0.3, 0.55) * smoothstep(0.35, 0.0, abs(vTop - 0.9 - vW.y)) * side * step(0.7, vSeed) * 1.4;
        col += vec3(0.35, 0.8, 1.0) * smoothstep(0.35, 0.0, abs(vTop - 0.9 - vW.y)) * side * step(vSeed, 0.12) * 1.2;
        // the street far below glows through the haze
        col += vec3(0.22, 0.07, 0.18) * smoothstep(25.0, 70.0, vTop - vW.y) * side;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const cols = [];
  // a building column under a roof: from deep below up to (top - 0.6)
  const column = (x0, x1, z0, z1, top, depth = 70) => {
    cols.push([(x0 + x1) / 2, top - 0.6 - depth / 2, (z0 + z1) / 2, x1 - x0, depth, z1 - z0]);
    // solid: a missed jump slides down the facade instead of into the building
    K.collider((x0 + x1) / 2, top - 0.6 - depth / 2, (z0 + z1) / 2, x1 - x0, depth, z1 - z0);
  };
  // the four walls of a hollow building (its roof can fall inside)
  const shell = (x0, x1, z0, z1, top, depth = 70) => {
    const y = top - 0.6 - depth / 2;
    const t = 0.6;
    cols.push([x0 + t / 2, y, (z0 + z1) / 2, t, depth, z1 - z0]);
    cols.push([x1 - t / 2, y, (z0 + z1) / 2, t, depth, z1 - z0]);
    cols.push([(x0 + x1) / 2, y, z0 + t / 2, x1 - x0 - 2 * t, depth, t]);
    cols.push([(x0 + x1) / 2, y, z1 - t / 2, x1 - x0 - 2 * t, depth, t]);
    // walls collide too: you hit the building side, you do not slide into it
    [
      [x0 + t / 2, (z0 + z1) / 2, t, z1 - z0],
      [x1 - t / 2, (z0 + z1) / 2, t, z1 - z0],
    ].forEach(([cx, cz, sx, sz]) => K.collider(cx, y, cz, sx, depth, sz));
  };

  // ---------- small builders ----------
  const slab = (x0, x1, z0, z1, y, mat = roofM) =>
    K.solid((x0 + x1) / 2, y - 0.3, (z0 + z1) / 2, x1 - x0, 0.6, z1 - z0, mat);
  const parapets = (x0, x1, z0, z1, y, sides = 'lr') => {
    const h = 0.95;
    if (sides.includes('l')) K.solid(x0 + 0.2, y + h / 2, (z0 + z1) / 2, 0.4, h, z1 - z0, parapetM);
    if (sides.includes('r')) K.solid(x1 - 0.2, y + h / 2, (z0 + z1) / 2, 0.4, h, z1 - z0, parapetM);
    // cap stones
    if (sides.includes('l'))
      K.deco(new THREE.BoxGeometry(0.55, 0.08, z1 - z0), steelM, x0 + 0.2, y + h + 0.04, (z0 + z1) / 2);
    if (sides.includes('r'))
      K.deco(new THREE.BoxGeometry(0.55, 0.08, z1 - z0), steelM, x1 - 0.2, y + h + 0.04, (z0 + z1) / 2);
  };
  const roof = (key, opt = {}) => {
    const [x0, x1, z0, z1, y] = ROOFS[key];
    slab(x0, x1, z0, z1, y, opt.mat || roofM);
    // a slightly raised gravel bed in the middle, the asphalt border around it
    K.deco(
      new THREE.BoxGeometry(x1 - x0 - 3, 0.04, z1 - z0 - 3),
      gravelM,
      (x0 + x1) / 2,
      y + 0.02,
      (z0 + z1) / 2,
    );
    if (opt.parapet !== false) parapets(x0, x1, z0, z1, y, opt.sides || 'lr');
    if (opt.column !== false) column(x0, x1, z0, z1, y);
  };

  const blinkers = [];
  const antenna = (x, y, z, h = 9) => {
    K.deco(new THREE.CylinderGeometry(0.06, 0.12, h, 8), steelM, x, y + h / 2, z);
    for (let i = 1; i < 4; i++)
      K.deco(new THREE.BoxGeometry(1.4 - i * 0.3, 0.05, 0.05), steelM, x, y + (h * i) / 4, z);
    const l = K.deco(new THREE.SphereGeometry(0.14, 10, 8), glow('#ff2a3a', 2.5), x, y + h + 0.1, z);
    blinkers.push(l);
    [0, 2.1, 4.2].forEach((a) => {
      const g = new THREE.CylinderGeometry(0.015, 0.015, h * 0.75, 4);
      const m = K.deco(g, steelM, x + Math.cos(a) * 0.9, y + h * 0.37, z + Math.sin(a) * 0.9);
      m.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    });
  };
  const ac = (x, y, z, rot = 0, solid = true) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.2), ironM);
    body.position.y = 0.55;
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20), steelM);
    fan.position.set(0, 1.12, 0);
    const grill = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), ironM);
    grill.rotation.x = Math.PI / 2;
    grill.position.set(0, 1.14, 0);
    g.add(body, fan, grill);
    g.position.copy(P(x, y, z));
    g.rotation.y = rot;
    group.add(g);
    fans.push(fan);
    if (solid) return K.collider(x, y + 0.55, z, 1.7, 1.1, 1.7);
    return null;
  };
  const fans = [];
  const waterTower = (x, y, z, legs = 3.2, solidTank = true) => {
    const r = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.78;
      K.deco(
        new THREE.CylinderGeometry(0.09, 0.11, legs, 8),
        ironM,
        x + Math.cos(a) * r * 0.8,
        y + legs / 2,
        z + Math.sin(a) * r * 0.8,
      );
    }
    const tank = K.deco(new THREE.CylinderGeometry(r, r, 3.6, 28, 1), woodM, x, y + legs + 1.8, z);
    for (let i = 0; i < 4; i++)
      K.deco(new THREE.TorusGeometry(r + 0.02, 0.04, 6, 32), ironM, x, y + legs + 0.4 + i * 0.95, z).rotation.x =
        Math.PI / 2;
    K.deco(new THREE.ConeGeometry(r + 0.15, 1.2, 28), ironM, x, y + legs + 4.2, z);
    if (solidTank) K.collider(x, y + legs + 1.8, z, r * 1.6, 3.6, r * 1.6);
    return tank;
  };
  const chimney = (x, y, z, h = 1.8) => {
    const b = K.solid(x, y + h / 2, z, 0.9, h, 0.9, brickM).b;
    K.deco(new THREE.BoxGeometry(1.05, 0.15, 1.05), parapetM, x, y + h + 0.07, z);
    smokes.push(P(x, y + h + 0.3, z));
    return b;
  };
  const smokes = [];
  const skylight = (x, y, z, w = 2.4, d = 1.6) => {
    const b0 = K.solid(x, y + 0.3, z, w + 0.2, 0.6, d + 0.2, parapetM).b;
    K.deco(new THREE.BoxGeometry(w, 0.5, d), glassM, x, y + 0.85, z);
    const light = K.deco(
      new THREE.PlaneGeometry(w * 0.9, d * 0.9).rotateX(-Math.PI / 2),
      glow('#ffb36a', 0.55),
      x,
      y + 0.62,
      z,
    );
    const b1 = K.collider(x, y + 0.85, z, w, 0.5, d);
    return [b0, b1];
  };
  // laundry lines between two posts, the cloth sways in the wind
  const laundry = [];
  const clothCols = ['#ff9ec4', '#e8e2f2', '#7ce0ff', '#ffcf8a', '#b9a6ff'];
  const line = (a, b, sag = 0.6) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      pts.push(
        V3(
          a.x + (b.x - a.x) * k,
          a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * sag,
          a.z + (b.z - a.z) * k,
        ),
      );
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => P(p.x, p.y, p.z))), 24, 0.012, 4);
    group.add(new THREE.Mesh(geo, steelM));
    for (let i = 1; i < 10; i += 2) {
      const k = i / 10;
      const p = pts[Math.round(k * 12)];
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55 + Math.random() * 0.4, 0.7 + Math.random() * 0.4).translate(0, -0.4, 0),
        new THREE.MeshStandardMaterial({
          color: clothCols[(i + laundry.length) % clothCols.length],
          roughness: 0.9,
          side: THREE.DoubleSide,
        }),
      );
      cloth.position.copy(P(p.x, p.y, p.z));
      cloth.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      group.add(cloth);
      laundry.push({ m: cloth, ph: Math.random() * 6 });
    }
  };
  // neon sign on a frame
  const neons = [];
  const neonSign = (text, sub, color, x, y, z, rotY, w = 6, h = 2) => {
    const t = canvasTex(2048, 680, (g, cw, ch) => {
      g.clearRect(0, 0, cw, ch);
      g.shadowColor = color;
      g.shadowBlur = 48;
      g.fillStyle = color;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 300px Georgia, serif';
      Icons.fillText(g, text, cw / 2, ch * 0.42);
      if (sub) {
        g.font = '600 92px "IBM Plex Mono", monospace';
        g.fillStyle = '#ffe6ee';
        Icons.fillText(g, sub, cw / 2, ch * 0.82);
      }
    });
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }),
    );
    m.material.color.setScalar(1.3);
    m.position.copy(P(x, y, z));
    m.rotation.y = rotY;
    group.add(m);
    [-w / 2 + 0.3, w / 2 - 0.3].forEach((ox) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, y - 0.2 + h / 2, 0.1), ironM);
      leg.position.copy(P(x + Math.cos(rotY) * ox, (y - 0.2 + h / 2) / 2 - h / 2 + 0.2, z - Math.sin(rotY) * ox));
      group.add(leg);
    });
    neons.push({ m, ph: Math.random() * 6 });
    return m;
  };

  // ---------- crumbling pieces (shared state string with the host) ----------
  // kind 't': a tile that cracks when stepped on and comes back later
  // kind 's': a roof strip (section 3) that falls when the collapse front reaches it
  const pieces = [];
  const crackMats = [];
  const piece = (kind, x, z, w, d, y, extra = {}) => {
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    group.add(g);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.6, d - 0.04), kind === 't' ? clayMat : roofM);
    mesh.position.y = -0.3;
    g.add(mesh);
    const cm = new THREE.MeshBasicMaterial({
      map: crackTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      color: new THREE.Color('#ff7a3a').multiplyScalar(1.4),
    });
    crackMats.push(cm);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, d * 0.95).rotateX(-Math.PI / 2), cm);
    crack.position.y = 0.012;
    g.add(crack);
    const b = Phys.box(O.x + x, O.y + y - 0.3, O.z + z, w, 0.6, d);
    const p = {
      id: pieces.length,
      kind,
      x,
      z,
      w,
      d,
      y,
      g,
      mesh,
      crack,
      cm,
      b,
      props: [],
      st: '0',
      k: 0,
      fallV: 0,
      spin: V3(),
      ...extra,
    };
    pieces.push(p);
    return p;
  };
  // a prop riding on a strip: its collider goes away with the strip
  const onStrip = (strip, build) => {
    const before = group.children.length;
    const cs = build();
    const moved = group.children.splice(before);
    moved.forEach((m) => {
      m.position.sub(strip.g.position);
      strip.g.add(m);
    });
    (Array.isArray(cs) ? cs : [cs]).filter(Boolean).forEach((c) => strip.props.push(c));
  };

  // ---------- moving parts ----------
  let ladder = null;
  let ladderB = [];
  let plank = null;
  let plankB = null;
  let winchArm = null;
  let leverArm = null;
  let rope = null;
  let heartTube = null;
  let zipCable = null;
  let crane = null;
  let craneB = null;
  let cranePrev = V3();
  let board = null;
  let boardB = [];
  let boardX = BB.x0;
  let lev = {};
  let ring1 = null;
  let ring2 = null;
  let card = null;
  let screen = null;
  let catchGlow = null;
  let padGlow = null;
  let flags = [];
  let sky = null;
  let joker = [];
  const trolleys = [];

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    makeTextures();

    // ===== section 1 =====
    roof('r1', { sides: 'lr' });
    K.solid(0, 0.45, -7.8, 16, 0.9, 0.4, parapetM);
    waterTower(-5, 0, -4, 3.4);
    antenna(5.5, 0, -5.5, 11);
    chimney(-6.2, 0, 8);
    ac(5.2, 0, 6, 0.2);
    screen = makeScreen(9, 3.6, 1024);
    screen.mesh.position.copy(P(0, 5.6, -7.4));
    group.add(screen.mesh);
    [-4.3, 4.3].forEach((x) =>
      K.deco(new THREE.BoxGeometry(0.2, 5.6, 0.2), ironM, x, 2.8, -7.5),
    );
    line(V3(-7.6, 2.2, 12), V3(-7.6, 2.0, 2), 0.35);
    K.deco(new THREE.BoxGeometry(0.1, 2.4, 0.1), ironM, -7.6, 1.2, 12);
    K.deco(new THREE.BoxGeometry(0.1, 2.4, 0.1), ironM, -7.6, 1.2, 2);

    // r2: a solid lip, the band of tiles over an empty building, a solid lip
    roof('r2a', { sides: 'lr', column: false });
    roof('r2b', { sides: 'lr', column: false });
    column(-7, 7, 22, 26, 0);
    column(-7, 7, 42, 46, 0);
    // the hollow under the tiles: side walls only (you fall into the building)
    [-7, 7].forEach((x) => {
      cols.push([x - Math.sign(x) * 0.3, -35.6, 34, 0.6, 70, 16]);
      // the band's own parapets sit right against the outer tiles: no gap to slip through
      K.solid(Math.sign(x) * 6.2, 0.47, 34, 0.4, 0.95, 16, parapetM);
      K.solid(Math.sign(x) * 6.7, -0.3, 34, 0.6, 0.6, 16, parapetM);
    });
    for (let z = TILE_BAND.z0 + 1; z < TILE_BAND.z1; z += 2)
      for (let x = TILE_BAND.x0 + 1; x < TILE_BAND.x1; x += 2) piece('t', x, z, 2, 2, 0, { back: 6.5, delay: 0.7 });
    // deep down, the dark inside of the building (below the beams, just above the fall)
    K.deco(new THREE.BoxGeometry(13.4, 0.2, 16), new THREE.MeshBasicMaterial({ color: '#07030a' }), 0, -10.5, 34);
    // a few beams visible below the tiles
    for (let z = 28; z < 42; z += 4)
      K.deco(new THREE.BoxGeometry(13.6, 0.35, 0.3), ironM, 0, -0.8, z);
    antenna(-5.6, 0, 44.4, 7);

    // r3 + the raised block r3b with the water tower (Valet only) and the winch (Dame)
    roof('r3', { sides: 'l' });
    K.solid(7.8, 0.47, 55.5, 0.4, 0.95, 9, parapetM);
    // r3b: raised block on the right of r3
    {
      const [x0, x1, z0, z1, y] = ROOFS.r3b;
      K.solid((x0 + x1) / 2, (y - 0.6) / 2, (z0 + z1) / 2, x1 - x0, y - 0.6, z1 - z0, brickM);
      slab(x0, x1, z0, z1, y);
      // no parapet up here: nothing the Dame could climb to reach the Valet's tower
      K.deco(new THREE.BoxGeometry(x1 - x0, 0.12, 0.4), steelM, (x0 + x1) / 2, y + 0.06, z0 + 0.2);
    }
    // the water tower catwalk, a double jump above r3b; only the Valet is strong enough to push
    // the plank from up there
    {
      const legs = 2.5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.78;
        K.deco(new THREE.CylinderGeometry(0.1, 0.12, legs, 8), ironM, TOWER.x + Math.cos(a) * 1.9, 4.5 + legs / 2, TOWER.z + Math.sin(a) * 1.9);
      }
      K.solid(TOWER.x, TOWER.y - 0.15, TOWER.z, 5, 0.3, 5, ironM);
      // railing on the back half only, the front stays open to land on
      K.deco(new THREE.BoxGeometry(5, 0.06, 0.06), steelM, TOWER.x, TOWER.y + 1, TOWER.z + 2.45);
      [-2.45, 2.45].forEach((ox) =>
        K.deco(new THREE.BoxGeometry(0.06, 0.06, 5), steelM, TOWER.x + ox, TOWER.y + 1, TOWER.z),
      );
      waterTower(TOWER.x, TOWER.y, TOWER.z + 0.8, 0.01);
    }
    // the winch on r3b: lowers the fire ladder
    {
      const base = K.deco(new THREE.BoxGeometry(0.8, 0.9, 0.8), ironM, WINCH.x, WINCH.y + 0.45, WINCH.z);
      winchArm = new THREE.Group();
      winchArm.position.copy(P(WINCH.x, WINCH.y + 0.95, WINCH.z));
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 16).rotateZ(Math.PI / 2), steelM);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), steelM);
      handle.position.set(0.4, 0, 0.3);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow('#ff5f8a', 1.8));
      knob.position.set(0.4, 0, 0.6);
      winchArm.add(drum, handle, knob);
      group.add(winchArm);
      // no collider: standing on it would put the tower within the Dame's jump
    }
    // fire ladder: folded up on r3b's front face, slides down to r3
    {
      // pivot at r3b's front top edge; folded flat on r3b, it swings over to rest on r3
      ladder = new THREE.Group();
      ladder.position.copy(P(4.9, 4.55, 60));
      const railG = new THREE.BoxGeometry(0.08, 0.1, 8.7);
      [-0.72, 0.72].forEach((ox) => {
        const r = new THREE.Mesh(railG, steelM);
        r.position.set(ox, 0, -4.35);
        ladder.add(r);
      });
      for (let i = 0; i < 12; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.42), gratingTexMat());
        st.position.set(0, 0, -0.4 - i * 0.72);
        st.rotation.x = LADDER_DOWN_FIX;
        ladder.add(st);
      }
      ladder.userData.down = 0;
      group.add(ladder);
      // stair colliders: 12 steps of 0.375 m from r3 (z 52.6) up to r3b (z 60)
      for (let i = 0; i < 12; i++) {
        const b = K.collider(4.9, 0.375 * (i + 1) - 0.19, 52.9 + i * 0.6, 1.5, 0.38, 0.62);
        b.on = false;
        ladderB.push(b);
      }
    }
    // plank leaning against the Valet's tower side, falls across the 11 m gap to r4
    {
      plank = new THREE.Group();
      plank.position.copy(P(-3.5, 0, 72));
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.22, 12.8),
        new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.85 }),
      );
      m.position.set(0, -0.11, 6.4);
      plank.add(m);
      [-0.6, 0.6].forEach((ox) => {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 12.8), ironM);
        strap.position.set(ox, 0.01, 6.4);
        plank.add(strap);
      });
      plank.rotation.x = -Math.PI / 2 + 0.12;
      plank.userData.k = 0;
      group.add(plank);
      plankB = K.collider(-3.5, -0.11, 78.1, 1.6, 0.22, 12.4);
      // the rope from the tower lever to the top of the plank
      rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#c8b48a', roughness: 0.9 }));
      group.add(rope);
      plankB.on = false;
      // the rope from the tower lever to the plank top
      const lever = K.deco(new THREE.BoxGeometry(0.5, 1, 0.5), ironM, PLANK_LEVER.x, PLANK_LEVER.y + 0.5, PLANK_LEVER.z);
      leverArm = new THREE.Group();
      leverArm.position.copy(P(PLANK_LEVER.x, PLANK_LEVER.y + 1, PLANK_LEVER.z));
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0), steelM);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow('#6cc8ff', 1.8));
      knob.position.y = 1;
      arm.add(knob);
      leverArm.add(arm);
      leverArm.rotation.x = 0.5;
      group.add(leverArm);
      K.collider(PLANK_LEVER.x, PLANK_LEVER.y + 0.5, PLANK_LEVER.z, 0.5, 1, 0.5);
    }
    ring1 = K.deco(new THREE.TorusGeometry(0.6, 0.08, 12, 40), glow('#ff5f8a', 2.2), RING1.x, RING1.y, RING1.z);
    ac(-5, 0, 58, 0.4);
    skylight(-4.5, 0, 66, 2.4, 1.6);
    antenna(-6.8, 0, 70.5, 8);
    line(V3(-7.5, 2.4, 53), V3(-0.5, 2.6, 53), 0.4);
    K.deco(new THREE.BoxGeometry(0.1, 2.6, 0.1), ironM, -7.5, 1.3, 53);
    K.deco(new THREE.BoxGeometry(0.1, 2.8, 0.1), ironM, -0.5, 1.4, 53);
    neonSign('♥', 'SAUTEZ ENSEMBLE', '#ff5f8a', 7.6, 7.6, 66, -Math.PI / 2, 4, 2.6);

    // r4, the stepping stones, r5 (checkpoint 1)
    roof('r4', { sides: 'lr' });
    chimney(5.2, 0, 92);
    ac(-4.8, 0, 89, -0.3);
    STONES.forEach(([x, z]) => {
      piece('t', x, z, 2.4, 2.4, 0, { back: 3.2, delay: 0.8 });
      cols.push([x, -36, z, 1.2, 70, 1.2]);
    });
    roof('r5', { sides: 'lr' });
    // stairs up to the zip platform (y 6)
    for (let i = 0; i < 16; i++) {
      K.solid(-3.4, 0.375 * (i + 1) - 0.19, 117.4 + i * 0.42, 1.6, 0.38, 0.44, ironM);
    }
    K.solid(-1.8, 5.85, 126.6, 6.4, 0.3, 5.4, gratingTexMat());
    K.solid(-1.8, 6.5, 129.2, 6.4, 1, 0.12, steelM);
    K.solid(-4.95, 6.5, 126.6, 0.12, 1, 5.4, steelM);
    [[-4.8, 124.2], [1.2, 124.2], [-4.8, 129], [1.2, 129]].forEach(([x, z]) =>
      K.deco(new THREE.BoxGeometry(0.22, 6, 0.22), ironM, x, 3, z),
    );
    antenna(1.6, 6, 127.6, 10);
    waterTower(6, 0, 118, 3.2);
    neonSign('1', 'POINT DE REPRISE', '#ffcf8a', -8.7, 3.4, 121, Math.PI / 2, 4, 1.6);
    flags.push(K.deco(new THREE.TorusGeometry(0.5, 0.05, 8, 32), glow('#ffcf8a', 1.6), 0, 1.4, 114.5));

    // ===== section 2 =====
    // zip cable from the platform down to r6
    {
      const a = P(ZIP_A.x, ZIP_A.y + 0.2, ZIP_A.z);
      const b = P(ZIP_B.x, ZIP_B.y + 0.2, ZIP_B.z);
      const geo = new THREE.CylinderGeometry(0.03, 0.03, a.distanceTo(b), 6).translate(0, a.distanceTo(b) / 2, 0);
      zipCable = new THREE.Mesh(geo, steelM);
      zipCable.position.copy(a);
      zipCable.lookAt(b);
      zipCable.rotateX(Math.PI / 2);
      group.add(zipCable);
      K.deco(new THREE.BoxGeometry(0.3, 2.4, 0.3), ironM, 0, -1 + 0.05, 176.4);
      const handle = K.deco(new THREE.TorusGeometry(0.22, 0.04, 8, 20), glow('#ffcf8a', 1.8), ZIP_A.x, ZIP_A.y - 0.15, ZIP_A.z - 0.4);
      handle.rotation.y = Math.PI / 2;
    }
    roof('r6', { sides: 'lr' });
    ac(-5.5, -2, 182, 0);
    chimney(-6, -2, 192.5, 1.6);
    // the crane: mast on r6, jib over the gap, hook platform swinging along z
    {
      const mastX = 7.2;
      for (let y = -2; y < 38; y += 2.5) {
        K.deco(new THREE.BoxGeometry(1.4, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: '#d6a43a', roughness: 0.6, metalness: 0.4 }), mastX, y, 186);
        K.deco(new THREE.BoxGeometry(0.08, 0.08, 1.4), new THREE.MeshStandardMaterial({ color: '#d6a43a', roughness: 0.6, metalness: 0.4 }), mastX, y + 1.25, 186);
      }
      const yel = new THREE.MeshStandardMaterial({ color: '#e0b040', roughness: 0.55, metalness: 0.35 });
      [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(([ox, oz]) =>
        K.deco(new THREE.BoxGeometry(0.14, 40, 0.14), yel, mastX + ox, 18, 186 + oz),
      );
      K.collider(mastX, 18 - 2, 186, 1.6, 36, 1.6);
      K.deco(new THREE.BoxGeometry(1.2, 1.2, 46), yel, mastX - 3.6, 38.6, 205);
      K.deco(new THREE.BoxGeometry(8.4, 0.8, 0.8), yel, mastX - 3.6, 38.6, 186);
      K.deco(new THREE.BoxGeometry(2.4, 2.4, 3.6), ironM, mastX - 3.6, 39.2, 184);
      K.deco(new THREE.BoxGeometry(2.2, 1.8, 2.4), glassM, mastX - 1.6, 37.2, 186);
      const lamp = K.deco(new THREE.SphereGeometry(0.2, 10, 8), glow('#ff2a3a', 2.5), mastX - 3.6, 39.6, 227.8);
      blinkers.push(lamp);
      crane = new THREE.Group();
      const platform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 3.6), gratingTexMat());
      platform.position.y = -0.175;
      crane.add(platform);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 8, 20, Math.PI * 1.4), steelM);
      hook.position.y = 3.4;
      crane.add(hook);
      [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]].forEach(([ox, oz]) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.6, 4), steelM);
        c.position.set(ox / 2, 1.6, oz / 2);
        c.rotation.set(oz * 0.25, 0, -ox * 0.25);
        crane.add(c);
      });
      const lamp2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glow('#ffcf8a', 2));
      lamp2.position.set(0, 0.25, 1.7);
      crane.add(lamp2);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0), steelM);
      crane.userData.cable = cable;
      group.add(cable);
      group.add(crane);
      craneB = Phys.add([0, 0, 0], [0, 0, 0], { dyn: true });
    }
    roof('r7', { sides: 'lr' });
    ac(5, -1, 230, 0.5);
    skylight(-4.5, -1, 234, 2.4, 1.8);
    line(V3(-7.5, 1.4, 226), V3(-7.5, 1.3, 238), 0.4);
    K.deco(new THREE.BoxGeometry(0.1, 2.4, 0.1), ironM, -7.5, 0.2, 226);
    K.deco(new THREE.BoxGeometry(0.1, 2.4, 0.1), ironM, -7.5, 0.2, 238);
    // sliding billboard: a walkway with the big neon panel on its outer side
    {
      board = new THREE.Group();
      const walk = new THREE.Mesh(
        new THREE.BoxGeometry(BB.w, 0.4, BB.z1 - BB.z0 + 0.6),
        new THREE.MeshStandardMaterial({ map: gratingTex, roughness: 0.6, metalness: 0.2 }),
      );
      walk.position.set(0, -0.2, 0);
      board.add(walk);
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(BB.z1 - BB.z0 - 1, 5.6),
        new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }),
      );
      panel.material.color.setScalar(0.95);
      panel.rotation.y = -Math.PI / 2;
      panel.position.set(BB.w / 2 + 0.25, 3.2, 0);
      board.add(panel);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, BB.z1 - BB.z0), ironM);
      back.position.set(BB.w / 2 + 0.5, 3, 0);
      board.add(back);
      for (let k = -2; k <= 2; k++) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow('#ffcf8a', 2.2));
        bulb.position.set(BB.w / 2 + 0.2, 6.15, k * 3.8);
        board.add(bulb);
      }
      board.position.copy(P(BB.x0, BB.y, (BB.z0 + BB.z1) / 2));
      group.add(board);
      boardB = [
        Phys.add([0, 0, 0], [0, 0, 0], { dyn: true }),
        Phys.add([0, 0, 0], [0, 0, 0], { dyn: true }),
      ];
      // the rails it slides on, at both ends
      [BB.z0 - 0.4, BB.z1 + 0.4].forEach((z) =>
        K.deco(new THREE.BoxGeometry(24, 0.3, 0.3), ironM, 9.5, BB.y - 0.55, z),
      );
      K.deco(new THREE.BoxGeometry(0.6, 30, 0.6), ironM, 21, BB.y - 15.5, BB.z0 - 0.4);
      K.deco(new THREE.BoxGeometry(0.6, 30, 0.6), ironM, 21, BB.y - 15.5, BB.z1 + 0.4);
    }
    // the two levers (one holds, the other crosses)
    [
      ['l1', LEVER1],
      ['l2', LEVER2],
    ].forEach(([id, p]) => {
      K.deco(new THREE.BoxGeometry(0.7, 1, 0.7), ironM, p.x, p.y + 0.5, p.z);
      K.collider(p.x, p.y + 0.5, p.z, 0.7, 1, 0.7);
      const arm = new THREE.Group();
      arm.position.copy(P(p.x, p.y + 1, p.z));
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0), steelM);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow('#ffcf8a', 1.8));
      k.position.y = 1;
      a.add(k);
      arm.add(a);
      arm.rotation.z = 0.6;
      group.add(arm);
      lev[id] = { arm, knob: k };
    });
    roof('r8', { sides: 'lr' });
    neonSign('2', 'POINT DE REPRISE', '#ffcf8a', 8.7, 3.2, 270, -Math.PI / 2, 4, 1.6);
    flags.push(K.deco(new THREE.TorusGeometry(0.5, 0.05, 8, 32), glow('#ffcf8a', 1.6), 0, 1.2, 263.5));
    antenna(-6.5, -0.2, 279, 9);
    ac(-5, -0.2, 274, 0.3);

    // ===== section 3: roofs made of strips that collapse behind you =====
    STRIP_ROOFS.forEach(([x0, x1, z0, z1, y], ri) => {
      shell(x0, x1, z0, z1, y);
      for (let z = z0; z < z1 - 0.01; z += 4) {
        const s = piece('s', (x0 + x1) / 2, z + 2, x1 - x0 - 1.2, 4, y, { roof: ri });
        // side parapets ride on the strip
        onStrip(s, () => {
          const a = K.solid(x0 + 0.8, y + 0.47, z + 2, 0.4, 0.95, 4, parapetM).b;
          const b = K.solid(x1 - 0.8, y + 0.47, z + 2, 0.4, 0.95, 4, parapetM).b;
          return [a, b];
        });
      }
    });
    const strip = (z) => pieces.find((p) => p.kind === 's' && Math.abs(p.z - z) < 2.01 && z >= p.z - 2 && z < p.z + 2);
    // cover against the searchlights: AC units, chimneys, skylights, vent stacks
    [
      [-3.5, 0, 287, 'ac'],
      [3.8, 0, 292, 'chim'],
      [-1, 0, 296.5, 'sky'],
      [4, 0, 306, 'ac'],
      [-4.2, 0, 309.5, 'chim'],
      [1.5, 0, 314, 'ac'],
      [-3, 0, 326, 'ac'],
      [3.2, 0, 331, 'sky'],
      [-3.6, 0, 337.5, 'chim'],
      [2.6, 0, 342, 'ac'],
      [-3.4, 1.2, 355, 'ac'],
      [3.6, 1.2, 360, 'chim'],
      [-1, 1.2, 365, 'sky'],
      [4, 1.2, 370, 'ac'],
    ].forEach(([x, y, z, k]) => {
      const s = strip(z);
      if (!s) return;
      onStrip(s, () =>
        k === 'ac' ? ac(x, y, z, 0.2) : k === 'chim' ? chimney(x, y, z, 2.2) : skylight(x, y, z),
      );
    });
    // the gap tiles over the R9 skylight hole
    // launch pad + final roof with the card sign
    padGlow = K.deco(new THREE.RingGeometry(1.1, 1.6, 48).rotateX(-Math.PI / 2), glow('#6cc8ff', 0.5), PAD.x, PAD.y + 0.03, PAD.z);
    roof('rf', { sides: 'lr' });
    catchGlow = K.deco(heartFlat(1.3), glow('#ff5f8a', 0.9), CATCH.x, CATCH.y + 0.03, CATCH.z);
    ring2 = K.deco(new THREE.TorusGeometry(0.7, 0.09, 12, 40), glow('#ff5f8a', 2.2), RING2.x, RING2.y, RING2.z);
    // the card sign: a heart of neon tubes on a scaffold, the card in front
    {
      const sign = new THREE.Group();
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const [x, y] = Heart.curve((i / 120) * Math.PI * 2);
        pts.push(P(CARD.x + x * 0.24, CARD.y + 4.2 + (y - 2.5) * 0.24, CARD.z + 2.2));
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.09, 8, true),
        glow('#ff3d7f', 1.3),
      );
      heartTube = tube;
      sign.add(tube);
      group.add(sign);
      for (let i = -2; i <= 2; i++)
        K.deco(new THREE.BoxGeometry(0.12, 7, 0.12), ironM, CARD.x + i * 1.8, CARD.y + 3.5, CARD.z + 2.6);
      K.deco(new THREE.BoxGeometry(8, 0.12, 0.12), ironM, CARD.x, CARD.y + 1, CARD.z + 2.6);
      card = LvKit.card('2', '♠', false);
      card.position.copy(P(CARD.x, CARD.y + 1.8, CARD.z));
      group.add(card);
    }
    antenna(-6, 2, 416, 12);
    waterTower(6, 2, 415, 3);

    // ===== the city around: far towers with lit windows, the street glow below =====
    const rng2 = rng(222);
    for (let i = 0; i < 70; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 10 + rng2() * 14;
      const d = 10 + rng2() * 14;
      // keep clear of the run (|x| < 10) and of the billboard rails (x up to 22)
      const x = side * (side > 0 ? 25 : 13) + side * (w / 2 + rng2() * 55);
      const z = -40 + rng2() * 500;
      const top = -6 + rng2() * 34;
      cols.push([x, top - 45, z, w, 90, d]);
      // antennas and water tanks stand on the towers' roofs
      if (rng2() < 0.45) antenna(x + (rng2() - 0.5) * w * 0.6, top, z + (rng2() - 0.5) * d * 0.6, 6 + rng2() * 9);
      else if (rng2() < 0.4) waterTower(x + (rng2() - 0.5) * w * 0.5, top, z, 2.6, false);
    }
    const fac = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMat, cols.length);
    const m4 = new THREE.Matrix4();
    cols.forEach(([x, y, z, sx, sy, sz], i) => {
      m4.makeScale(sx, sy, sz).setPosition(O.x + x, O.y + y, O.z + z);
      fac.setMatrixAt(i, m4);
    });
    fac.frustumCulled = false;
    group.add(fac);
    // street glow far below
    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 620).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a1030'), toneMapped: false }),
    );
    street.position.copy(P(0, -62, 200));
    group.add(street);
    // the Joker's searchlights sweeping the sky
    for (let i = 0; i < 3; i++) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(4, 160, 24, 1, true).translate(0, -80, 0),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#ff2a3a').multiplyScalar(0.6),
          transparent: true,
          opacity: 0.08,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      beam.position.copy(P((i - 1) * 70, -40, 330 + i * 30));
      group.add(beam);
      joker.push({ m: beam, ph: i * 2.1 });
    }
  };

  // a flat heart shape (floor marker)
  function heartFlat(k) {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 80; i++) {
      const [x, y] = Heart.curve((i / 80) * Math.PI * 2);
      if (i) sh.lineTo((x / 16) * k, ((y - 2.5) / 16) * k);
      else sh.moveTo((x / 16) * k, ((y - 2.5) / 16) * k);
    }
    return new THREE.ShapeGeometry(sh, 40).rotateX(-Math.PI / 2);
  }
  let gratingMat = null;
  function gratingTexMat() {
    if (!gratingMat)
      gratingMat = new THREE.MeshStandardMaterial({
        map: gratingTex,
        roughness: 0.55,
        metalness: 0.2,
        color: '#b0a8c0',
      });
    return gratingMat;
  }

  // ---------- crane: deterministic pendulum from a phase shared by the host ----------
  const craneAt = (phase, out) => {
    const a = Math.sin(phase) * (CRANE.amp / CRANE.len);
    out.set(CRANE.pivot.x, CRANE.pivot.y - Math.cos(a) * CRANE.len, CRANE.pivot.z + Math.sin(a) * CRANE.len);
    return out;
  };
  const cranePos = V3();

  // ---------- per frame ----------
  const tmp = V3();
  const tmp2 = V3();
  const update = (dt, t, x, st) => {
    if (!built) return;
    facadeMat.uniforms.uTime.value = t;
    screen.update(dt, t);
    blinkers.forEach((b, i) => (b.visible = Math.sin(t * 2.2 + i * 1.7) > 0.2));
    fans.forEach((f, i) => (f.rotation.y += dt * (6 + (i % 3))));
    laundry.forEach((l) => {
      l.m.rotation.x = Math.sin(t * 1.7 + l.ph) * 0.22 + 0.1;
      l.m.rotation.z = Math.sin(t * 1.1 + l.ph * 2) * 0.06;
    });
    neons.forEach((n) => {
      const f = Math.sin(t * 30 + n.ph) > 0.97 ? 0.5 : 1;
      n.m.material.color.setScalar(1.25 * f);
    });
    joker.forEach((j) => {
      j.m.rotation.z = Math.sin(t * 0.3 + j.ph) * 0.45;
      j.m.rotation.x = Math.cos(t * 0.23 + j.ph) * 0.3;
      j.m.material.opacity = st.sec >= 3 ? 0.12 : 0.05;
    });
    if (Math.random() < dt * 2.5 && smokes.length) {
      const s = smokes[(Math.random() * smokes.length) | 0];
      Fx.burst(s, '#6a5e76', 2, 0.6, 2.4, 1.2);
    }
    ring1.visible = !x.ladder || true;
    ring1.rotation.y = t;
    ring2.rotation.y = -t;
    ring2.visible = st.sec >= 3;
    card.visible = true;
    card.rotation.y = Math.sin(t * 0.8) * 0.35;
    card.position.y = O.y + CARD.y + 1.8 + Math.sin(t * 1.6) * 0.1;
    flags.forEach((f, i) => (f.rotation.y = t * 1.2 + i));
    padGlow.material.color.set('#6cc8ff').multiplyScalar(st.sec >= 4 ? 0.5 + Math.sin(t * 5) * 0.15 : 0.18);
    catchGlow.material.color
      .set('#ff5f8a')
      .multiplyScalar(x.reach ? 1.6 + Math.sin(t * 8) * 0.4 : st.sec >= 4 ? 0.8 : 0.3);

    // ladder slides down once the winch has turned
    const lk = damp(ladder.userData.down, x.ladder ? 1 : 0, 2.2, dt);
    ladder.userData.down = lk;
    // folded flat on r3b (pointing back), swings over the top to lie along the stairs
    ladder.rotation.set(lerp(Math.PI - 0.02, -LADDER_DOWN_FIX, lk * lk * (3 - 2 * lk)), 0, 0);
    ladderB.forEach((b) => (b.on = lk > 0.85));
    winchArm.rotation.x = x.ladder ? Math.min(winchArm.rotation.x + dt * 10, 31.4) : 0;
    // plank falls across the gap
    const pk = plank.userData.k;
    const want = x.plank ? 1 : 0;
    if (pk < want) {
      plank.userData.v = (plank.userData.v || 0) + dt * 2.4;
      plank.userData.k = Math.min(1, pk + plank.userData.v * dt);
      if (plank.userData.k >= 1 && !plank.userData.landed) {
        plank.userData.landed = true;
        Sound.play('thud', P(-3.5, 0, 84));
        Fx.burst(P(-3.5, 0.2, 84), '#8a7f8f', 30, 3, 1, -2);
        Cam.shake = Math.max(Cam.shake, 0.15);
      }
    } else if (!x.plank) {
      plank.userData.k = 0;
      plank.userData.v = 0;
      plank.userData.landed = false;
    }
    const e = plank.userData.k * plank.userData.k;
    plank.rotation.x = lerp(-Math.PI / 2 + 0.12, 0, e);
    plankB.on = plank.userData.k >= 1;
    leverArm.rotation.x = damp(leverArm.rotation.x, x.plank ? -0.7 : 0.5, 8, dt);
    // rope: from the lever knob to the plank's top end (slack once the plank has fallen)
    {
      const a = tmp.set(0, 1, 0).applyEuler(leverArm.rotation).add(leverArm.position);
      const b2 = tmp2.set(0, 0, 12.8).applyEuler(plank.rotation).add(plank.position);
      const len2 = a.distanceTo(b2);
      rope.visible = plank.userData.k < 0.98;
      rope.position.copy(a);
      rope.scale.set(1, len2, 1);
      rope.lookAt(b2);
      rope.rotateX(Math.PI / 2);
    }
    heartTube.material.color.set('#ff3d7f').multiplyScalar(1.1 + 0.25 * Math.sin(t * 2.4));

    // crane hook platform (the host's phase, extrapolated locally)
    st.cranePh += dt * ((Math.PI * 2) / CRANE.period);
    craneAt(st.cranePh, cranePos);
    cranePrev.copy(crane.position);
    crane.position.copy(cranePos).add(O);
    const cab = crane.userData.cable;
    tmp.copy(CRANE.pivot).add(O);
    cab.position.copy(crane.position).add(tmp2.set(0, 3.6, 0));
    const len = cab.position.distanceTo(tmp);
    cab.scale.set(1, len, 1);
    cab.lookAt(tmp);
    cab.rotateX(Math.PI / 2);
    crane.rotation.x = -Math.sin(st.cranePh) * (CRANE.amp / CRANE.len);
    const cp = crane.position;
    craneB.min = [cp.x - 1.8, cp.y - 0.35, cp.z - 1.8];
    craneB.max = [cp.x + 1.8, cp.y, cp.z + 1.8];

    // billboard: slides to the bridge while a lever is held, back when released
    const held = (x.hold || []).length > 0;
    const prevX = boardX;
    boardX = held ? Math.max(BB.x1, boardX - dt * 5) : Math.min(BB.x0, boardX + dt * 1.6);
    if ((boardX !== prevX) !== st.boardMoving) {
      st.boardMoving = boardX !== prevX;
      if (st.boardMoving) Sound.play('lift');
    }
    board.position.copy(P(boardX, BB.y, (BB.z0 + BB.z1) / 2));
    const bx = O.x + boardX;
    const bz0 = O.z + BB.z0 - 0.3;
    const bz1 = O.z + BB.z1 + 0.3;
    boardB[0].min = [bx - BB.w / 2, O.y + BB.y - 0.4, bz0];
    boardB[0].max = [bx + BB.w / 2, O.y + BB.y, bz1];
    boardB[1].min = [bx + BB.w / 2 + 0.3, O.y + BB.y, O.z + BB.z0];
    boardB[1].max = [bx + BB.w / 2 + 0.7, O.y + BB.y + 6, O.z + BB.z1];
    st.boardDX = boardX - prevX;
    ['l1', 'l2'].forEach((id) => {
      const on = (x.hold || []).includes(id);
      lev[id].arm.rotation.z = damp(lev[id].arm.rotation.z, on ? -0.6 : 0.6, 10, dt);
      lev[id].knob.material.color.set(on ? '#6cff9a' : '#ffcf8a').multiplyScalar(1.8);
    });

    // crumbling pieces follow the host's state string
    const s = x.tl || '';
    pieces.forEach((p) => {
      const c = s[p.id] || '0';
      if (c !== p.st) {
        const was = p.st;
        p.st = c;
        if (c === '1') {
          p.k = 0;
          Sound.play('creak');
        }
        if (c === '2') {
          p.fallV = 0;
          p.spin.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2);
          const big = p.kind === 's';
          Fx.burst(P(p.x, p.y + 0.2, p.z), '#9a8ea6', big ? 70 : 18, big ? 4 : 2.5, big ? 1.6 : 1.1, -3);
          Sound.play('rumble', big ? 1 : 0.5);
          if (big) {
            Sound.play('thud', P(p.x, p.y, p.z));
            const d = Player.body.p.distanceTo(P(p.x, p.y, p.z));
            Cam.shake = Math.max(Cam.shake, clamp(0.4 - d / 60, 0, 0.35));
          }
        }
        if (c === '0' && was === '2') {
          // back in place, rising from below
          p.g.position.copy(P(p.x, p.y - 3, p.z));
          p.g.rotation.set(0, 0, 0);
        }
      }
      p.b.on = c !== '2';
      p.props.forEach((b) => (b.on = c !== '2'));
      if (c === '1') {
        p.k += dt;
        p.cm.opacity = Math.min(1, p.k * 2.2) * (0.7 + 0.3 * Math.sin(t * 30));
        p.g.position.set(
          O.x + p.x + (Math.random() - 0.5) * 0.05 * p.k,
          O.y + p.y + (Math.random() - 0.5) * 0.03,
          O.z + p.z + (Math.random() - 0.5) * 0.05 * p.k,
        );
        if (Math.random() < dt * 8) Fx.burst(P(p.x + (Math.random() - 0.5) * p.w, p.y, p.z + (Math.random() - 0.5) * p.d), '#8a7f8f', 2, 1, 0.6, -2);
      } else if (c === '2') {
        p.cm.opacity = 0;
        if (p.g.position.y > O.y + p.y - 60) {
          p.fallV += 22 * dt;
          p.g.position.y -= p.fallV * dt;
          p.g.rotation.x += p.spin.x * dt;
          p.g.rotation.z += p.spin.z * dt;
          p.g.visible = true;
        } else p.g.visible = false;
      } else {
        p.cm.opacity = 0;
        p.g.visible = true;
        const ty = O.y + p.y;
        p.g.position.set(O.x + p.x, damp(p.g.position.y, ty, 6, dt), O.z + p.z);
      }
    });
  };

  // the hold point under the zip cable at progress k (0..1)
  const zipAt = (k, out) => out.copy(ZIP_A).lerp(ZIP_B, k).add(O);
  const zipLen = ZIP_A.distanceTo(ZIP_B);

  return {
    O,
    P,
    build,
    update,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    rel: K.rel,
    group,
    pieces,
    ROOFS,
    TILE_BAND,
    CPS,
    RING1,
    RING2,
    LAND1,
    LAND2,
    WINCH,
    PLANK_LEVER,
    TOWER,
    ZIP_A,
    ZIP_B,
    zipAt,
    zipLen,
    LEVER1,
    LEVER2,
    PAD,
    CATCH,
    CARD,
    CRANE,
    craneAt,
    get craneBox() {
      return craneB;
    },
    get craneDelta() {
      return tmp2.copy(crane.position).sub(cranePrev);
    },
    get boardBox() {
      return boardB[0];
    },
    trolleys,
    spawn(sec, who) {
      const s = who === 'dame' ? -2.5 : 2.5;
      if (sec >= 3) return P(s, -0.2, 266);
      if (sec === 2) return P(s, 0, 116);
      return P(s, 0, 0);
    },
    // last checkpoint behind the furthest point a player reached
    checkpoint(maxZ, who) {
      const s = who === 'dame' ? -2.5 : 2.5;
      let best = CPS[0];
      CPS.forEach((c) => {
        if (maxZ >= c[0]) best = c;
      });
      return P(s, best[1], best[2]);
    },
    heartFlat,
  };
})();
