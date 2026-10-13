// ♦ 5 · La Gravité: the Veilleurs' observatory where gravity is the puzzle. A brass room that
// turns over when both levers are pulled (what was on the ceiling ends up on the floor, mirrored),
// a floating slab driven by a gravity beam over the void with low-gravity bubbles, gravity
// streams that only flow while someone stands on a stone, and the orrery whose three rings must
// be aligned on two heights while gravity pulses throw you up.
const D5 = (() => {
  const O = V3(700, 0, 7000);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  const glow = LvKit.glow;
  const uvTex = (w, h, draw) => LvKit.tex(w, h, draw);

  // ---------- room 1 dimensions: the turning room (axis along z at 7 m) ----------
  const CW = 9;
  const CH = 14;
  const PY = 7;
  const CZ0 = 2;
  const CZ1 = 32;
  // the orrery hall
  const OC = 150;
  const G1 = 4;
  const G2 = 8.5;
  const GR0 = 16.5;
  const GR1 = 20.5;

  // ---------- materials ----------
  // static surfaces: world-space PBR (triplanar). Everything that moves uses UV-mapped textures.
  // polished marble reflects every lamp: a rough multiplier over 1 keeps it satin (clamped to 1)
  const marble = Tex.mat('marble', { color: '#5a5470', scale: 6, rough: 2.6, bump: 0.5 });
  const darkMarble = Tex.mat('marble', { color: '#2e2a40', scale: 5, rough: 1.8 });
  const stone = Tex.mat('stone', { color: '#5e5872', scale: 2.4, rough: 0.85 });
  const plaster = Tex.mat('plaster', { color: '#2a2440', scale: 3.5, rough: 0.9, bump: 0.4 });
  const orreryFloor = Tex.mat('marble', { color: '#4a4560', scale: 7, rough: 2.6, bump: 0.5 });
  // its own cache entry (the extra key), so making it double-sided touches nothing else
  const galleryMat = Tex.mat('marble', { color: '#3a3450', scale: 5, rough: 2.2, d5: 1 });
  galleryMat.side = THREE.DoubleSide;
  const tiles = Tex.mat('marble', { color: '#46405c', scale: 3, rough: 2.6, bump: 0.4 });

  // brushed brass, lifted by its own glow (no env map: metals would render black)
  const brassTex = uvTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#c89a46');
    gr.addColorStop(0.5, '#e2b862');
    gr.addColorStop(1, '#a87a30');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,240,200' : '60,40,10'},${Math.random() * 0.08})`;
      g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 1.5);
    }
  });
  const mBrass = new THREE.MeshStandardMaterial({
    map: brassTex,
    metalness: 0.3,
    roughness: 0.45,
    emissive: '#3a2408',
    emissiveIntensity: 0.55,
  });
  const mDarkBrass = new THREE.MeshStandardMaterial({
    map: brassTex,
    color: '#8a6a44',
    metalness: 0.25,
    roughness: 0.55,
    emissive: '#1c1206',
    emissiveIntensity: 0.6,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: '#cfe6ff',
    transparent: true,
    opacity: 0.16,
    roughness: 0.1,
    metalness: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // the turning room's faces: indigo marble tiles with gold constellation inlays
  const tileTex = uvTex(1024, 1024, (g, w, h) => {
    LvKit.grain(g, w, h, '#26203e', 0.07, 14000);
    // marble veins
    g.strokeStyle = 'rgba(190,170,230,.10)';
    for (let i = 0; i < 26; i++) {
      g.lineWidth = 1 + Math.random() * 2.5;
      g.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (Math.random() - 0.5) * 220;
        y += (Math.random() - 0.3) * 160;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // tile joints (2 x 2 tiles per texture)
    g.fillStyle = 'rgba(10,6,18,.75)';
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h / 2 - 3, w, 6);
    g.fillRect(0, 0, 6, h);
    g.fillRect(w / 2 - 3, 0, 6, h);
    g.fillStyle = 'rgba(232,190,120,.35)';
    g.fillRect(0, 6, w, 2);
    g.fillRect(0, h / 2 + 3, w, 2);
    // gold stars and constellation lines
    const pts = [];
    for (let i = 0; i < 18; i++) pts.push([Math.random() * w, Math.random() * h]);
    g.strokeStyle = 'rgba(232,190,120,.28)';
    g.lineWidth = 2;
    for (let i = 0; i < pts.length - 1; i += 2) {
      g.beginPath();
      g.moveTo(...pts[i]);
      g.lineTo(...pts[i + 1]);
      g.stroke();
    }
    pts.forEach(([x, y]) => {
      g.fillStyle = 'rgba(255,214,150,.75)';
      g.beginPath();
      g.arc(x, y, 3 + Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    });
  });
  const panelTex = uvTex(1024, 1024, (g, w, h) => {
    LvKit.grain(g, w, h, '#2c2444', 0.08, 10000);
    // two tall panels framed in brass, with a rivet line
    [0, w / 2].forEach((x0) => {
      g.strokeStyle = 'rgba(220,170,90,.55)';
      g.lineWidth = 10;
      g.strokeRect(x0 + 22, 22, w / 2 - 44, h - 44);
      g.strokeStyle = 'rgba(10,6,18,.6)';
      g.lineWidth = 4;
      g.strokeRect(x0 + 36, 36, w / 2 - 72, h - 72);
      for (let y = 60; y < h - 40; y += 60) {
        g.fillStyle = 'rgba(240,200,130,.6)';
        g.beginPath();
        g.arc(x0 + 22, y, 5, 0, Math.PI * 2);
        g.arc(x0 + w / 2 - 22, y, 5, 0, Math.PI * 2);
        g.fill();
      }
      // a small engraved orbit in the middle of each panel
      g.strokeStyle = 'rgba(232,190,120,.22)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(x0 + w / 4, h / 2, w / 8, w / 20, 0.4, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(255,200,140,.35)';
      g.beginPath();
      g.arc(x0 + w / 4 + w / 8 * 0.92, h / 2 + 10, 8, 0, Math.PI * 2);
      g.fill();
    });
  });
  const mTile = new THREE.MeshStandardMaterial({ map: tileTex, color: '#9a90bc', roughness: 0.7, metalness: 0.05, emissive: '#0c0818' });
  const mPanel = new THREE.MeshStandardMaterial({ map: panelTex, color: '#8478a8', roughness: 0.75, emissive: '#0a0614' });
  const crateTex = uvTex(512, 512, (g, w, h) => {
    LvKit.grain(g, w, h, '#5a3a24', 0.12, 6000);
    g.strokeStyle = 'rgba(30,16,8,.6)';
    g.lineWidth = 6;
    for (let i = 1; i < 5; i++) {
      g.beginPath();
      g.moveTo(0, (i * h) / 5);
      g.lineTo(w, (i * h) / 5);
      g.stroke();
    }
    g.strokeStyle = '#d9a650';
    g.lineWidth = 26;
    g.strokeRect(13, 13, w - 26, h - 26);
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(26, 26);
    g.lineTo(w - 26, h - 26);
    g.stroke();
    g.fillStyle = '#20141e';
    g.beginPath();
    g.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8b262';
    g.font = 'bold 110px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    Icons.fillText(g, '♦', w / 2, h / 2 + 6);
  });
  const mCrate = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.75, emissive: '#1a0e06', emissiveIntensity: 0.6 });

  // box geometry whose UVs repeat every `tile` metres, so textures keep their size on any box
  const uvBox = (sx, sy, sz, tile = 3) => {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const uv = geo.attributes.uv;
    // faces: +x -x +y -y +z -z, 4 verts each
    const dims = [
      [sz, sy],
      [sz, sy],
      [sx, sz],
      [sx, sz],
      [sx, sy],
      [sx, sy],
    ];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
      }
    return geo;
  };

  const sign = (txt, sub, w, h, col = '#ffcf8a') => {
    const t = uvTex(w * 200, h * 200, (g, W, H) => {
      g.fillStyle = '#140e20';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = col;
      g.lineWidth = Math.max(4, H * 0.05);
      g.strokeRect(H * 0.07, H * 0.07, W - H * 0.14, H - H * 0.14);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let size = H * (sub ? 0.36 : 0.42);
      g.font = `italic ${size}px "Bodoni Moda", Georgia, serif`;
      while (g.measureText(txt).width > W * 0.86 && size > 8) {
        size *= 0.92;
        g.font = `italic ${size}px "Bodoni Moda", Georgia, serif`;
      }
      Icons.fillText(g, txt, W / 2, H * (sub ? 0.4 : 0.5));
      if (sub) {
        let s2 = H * 0.14;
        g.font = `${s2}px "IBM Plex Mono", monospace`;
        while (g.measureText(sub).width > W * 0.88 && s2 > 6) {
          s2 *= 0.92;
          g.font = `${s2}px "IBM Plex Mono", monospace`;
        }
        g.fillStyle = '#e8d9c8';
        Icons.fillText(g, sub, W / 2, H * 0.76);
      }
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    m.color.setScalar(0.8);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  };
  // a glowing sigil decal (suit or star), drawn once per colour
  const sigilCache = {};
  const sigilMat = (ch, col, op = 1) => {
    const k = ch + col + op;
    if (sigilCache[k]) return sigilCache[k];
    const t = uvTex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,.35)');
      gr.addColorStop(0.55, 'rgba(255,255,255,.08)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#fff';
      g.lineWidth = 14;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 260px Georgia';
      Icons.fillText(g, ch, w / 2, h / 2 + 14);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({
      map: t,
      color: new THREE.Color(col).multiplyScalar(0.8 * op),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    sigilCache[k] = m;
    return m;
  };

  // a soft round dot for every particle system (points are squares otherwise)
  const dotTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  // the seal only the Dame reads: dark enamel, an amber diamond, readable on the brass cap
  const sealMat = (() => {
    const t = uvTex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#140c22';
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.49, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffb04a';
      g.lineWidth = 16;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 4;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillStyle = '#ffcf8a';
        g.beginPath();
        g.arc(w / 2 + Math.cos(a) * w * 0.395, h / 2 + Math.sin(a) * w * 0.395, 6, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffb04a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 240px Georgia';
      Icons.fillText(g, '♦', w / 2, h / 2 + 12);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4, toneMapped: false, side: THREE.DoubleSide });
    m.color.setScalar(0.8);
    return m;
  })();

  // the underside of the galleries: brass coffers with small lamps (seen from below)
  const underMat = (() => {
    const t = uvTex(1024, 256, (g, w, h) => {
      LvKit.grain(g, w, h, '#3a2a1c', 0.1, 5000);
      for (let i = 0; i < 16; i++) {
        const x0 = (i * w) / 16;
        g.strokeStyle = 'rgba(232,180,100,.55)';
        g.lineWidth = 6;
        g.strokeRect(x0 + 8, 18, w / 16 - 16, h - 36);
        g.fillStyle = 'rgba(20,12,8,.5)';
        g.fillRect(x0 + 18, 30, w / 16 - 36, h - 60);
        const gr = g.createRadialGradient(x0 + w / 32, h / 2, 0, x0 + w / 32, h / 2, 26);
        gr.addColorStop(0, 'rgba(255,220,160,1)');
        gr.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = gr;
        g.fillRect(x0, 0, w / 16, h);
      }
    });
    t.repeat.set(6, 1);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.7, side: THREE.DoubleSide });
  })();

  const targetMat = (sym, col) => {
    const t = uvTex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(16,10,30,.92)';
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.49, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = 18;
      g.setLineDash([34, 18]);
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 230px Georgia';
      Icons.fillText(g, sym, w / 2, h / 2 + 12);
      g.font = '42px "IBM Plex Mono", monospace';
      g.fillStyle = '#ffe2b0';
      g.fillText('CIBLE', w / 2, h * 0.82);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, toneMapped: false, side: THREE.DoubleSide });
    m.color.setScalar(0.8);
    return m;
  };

  // ---------- state ----------
  let built = false;
  let role = 'dame';
  let screen = null;
  let cubePivot = null;
  const cubeCol = [[], []];
  const levers = []; // {arm, orb, side: -1|1, face}
  const crates = []; // {g, b}
  const plates = []; // {sig, lamp, x, z}
  const seals = [];
  const secretDame = []; // meshes only the Dame-kit sees
  const secretValet = [];
  let exitGate = null;
  let cubeAngle = 0;
  // room 2
  const r2 = { block: null, blockB: null, carriage: null, beam: null, gates: [], bubbles: [], bells: [], ring: null };
  // room 3
  const lanes = [];
  const stones = [];
  // room 4
  const rings = [];
  const stations = {};
  const lifts = [];
  let core = null;
  let coreB = null;
  let heart = null;
  let card = null;
  let dome = null;
  let pulseRings = [];
  let stars = null;
  const rocks = [];
  const lights = {};

  // ---------- the turning room ----------
  const BLOCK_Y = 0;
  // a collider for a feature defined in its face's own coordinates (that face as the floor)
  const featBox = (face, fx, fy, fz, sx, sy, sz) => {
    const s = face === 'A' ? 0 : 1;
    const a = K.collider(fx, fy, fz, sx, sy, sz);
    const b = K.collider(-fx, CH - fy, fz, sx, sy, sz);
    cubeCol[s].push(a);
    cubeCol[1 - s].push(b);
  };
  const faceG = {};
  const addFace = (face, mesh, fx, fy, fz) => {
    mesh.position.set(fx, fy - PY, fz);
    faceG[face].add(mesh);
    return mesh;
  };
  const feature = (face, fx, fy, fz, sx, sy, sz, mat = mPanel, tile = 3) => {
    const m = new THREE.Mesh(uvBox(sx, sy, sz, tile), mat);
    addFace(face, m, fx, fy, fz);
    featBox(face, fx, fy, fz, sx, sy, sz);
    return m;
  };
  // an end wall of the room with a door-sized notch at the bottom (top: false) or top
  const endWall = (z, notchTop) => {
    const sh = new THREE.Shape();
    const hw = 1.6;
    if (!notchTop) {
      sh.moveTo(-CW, -PY);
      sh.lineTo(-hw, -PY);
      sh.lineTo(-hw, -PY + 3.2);
      sh.lineTo(hw, -PY + 3.2);
      sh.lineTo(hw, -PY);
      sh.lineTo(CW, -PY);
      sh.lineTo(CW, PY);
      sh.lineTo(-CW, PY);
    } else {
      sh.moveTo(-CW, -PY);
      sh.lineTo(CW, -PY);
      sh.lineTo(CW, PY);
      sh.lineTo(hw, PY);
      sh.lineTo(hw, PY - 3.2);
      sh.lineTo(-hw, PY - 3.2);
      sh.lineTo(-hw, PY);
      sh.lineTo(-CW, PY);
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
    // shape units are metres: one panel texture every 4 m
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    const m = new THREE.Mesh(geo, mPanel);
    m.position.set(0, 0, z);
    cubePivot.add(m);
    // door frame in brass around the notch
    const fy = notchTop ? PY - 3.2 : -PY + 3.2;
    const fr = new THREE.Mesh(uvBox(3.6, 0.25, 0.6, 1), mBrass);
    fr.position.set(0, fy + (notchTop ? -0.12 : 0.12), z + 0.2);
    cubePivot.add(fr);
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(uvBox(0.25, 3.3, 0.6, 1), mBrass);
      p.position.set(s * 1.72, notchTop ? PY - 1.6 : -PY + 1.6, z + 0.2);
      cubePivot.add(p);
    });
  };
  // colliders of an end wall in one state: notch at the bottom or at the top
  const endWallCols = (z, s, notchBottom) => {
    const t = 0.4;
    const zc = z + t / 2;
    cubeCol[s].push(K.collider(-(CW + 1.6) / 2 - 0.2, PY, zc, CW - 1.6 + 0.4, CH, t));
    cubeCol[s].push(K.collider((CW + 1.6) / 2 + 0.2, PY, zc, CW - 1.6 + 0.4, CH, t));
    if (notchBottom) cubeCol[s].push(K.collider(0, (3.2 + CH) / 2, zc, 3.2, CH - 3.2, t));
    else cubeCol[s].push(K.collider(0, (CH - 3.2) / 2, zc, 3.2, CH - 3.2, t));
  };

  const makeLever = (face, side) => {
    const x = side * 7;
    const z = 6;
    const base = feature(face, x, 0.55, z, 0.7, 1.1, 0.7, mDarkBrass, 1);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.55, 0);
    base.add(pivot);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 10).translate(0, 0.65, 0), mBrass);
    pivot.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mBrass);
    knob.position.y = 1.32;
    pivot.add(knob);
    // the charge orb on top of the base: dim, then rose while held, gold when both are
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), glow('#ff5f8a', 0.25));
    orb.position.set(side * 0.0, 0.62, 0.38);
    base.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 40), glow('#ffcf8a', 0.5));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.53;
    base.add(ring);
    levers.push({ face, side, pivot, orb, ring });
  };

  const buildCube = () => {
    cubePivot = new THREE.Group();
    cubePivot.position.copy(P(0, PY, 0));
    group.add(cubePivot);
    faceG.A = new THREE.Group();
    faceG.B = new THREE.Group();
    faceG.B.rotation.z = Math.PI;
    cubePivot.add(faceG.A, faceG.B);
    const L = CZ1 - CZ0;
    const zc = (CZ0 + CZ1) / 2;
    // shell: floor, ceiling, side walls (the same in both states)
    const slab = (y, mat) => {
      const m = new THREE.Mesh(uvBox(CW * 2 + 0.8, 0.6, L + 0.8, 3), mat);
      m.position.set(0, y, zc);
      cubePivot.add(m);
    };
    slab(-PY - 0.3, mTile);
    slab(PY + 0.3, mTile);
    [-1, 1].forEach((s) => {
      const m = new THREE.Mesh(uvBox(0.4, CH, L + 0.8, 4), mPanel);
      m.position.set(s * (CW + 0.2), 0, zc);
      cubePivot.add(m);
      // brass bands along the walls at 1/3 and 2/3 height
      [-PY / 3, PY / 3].forEach((y) => {
        const b = new THREE.Mesh(uvBox(0.12, 0.18, L, 1), mBrass);
        b.position.set(s * (CW - 0.05), y, zc);
        cubePivot.add(b);
      });
    });
    // brass edges along the 4 long corners
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([sx, sy]) => {
      const e = new THREE.Mesh(uvBox(0.35, 0.35, L + 0.8, 1), mBrass);
      e.position.set(sx * CW, sy * PY, zc);
      cubePivot.add(e);
    });
    K.collider(0, -0.5, zc, CW * 2 + 0.8, 1, L + 0.8);
    K.collider(0, CH + 0.5, zc, CW * 2 + 0.8, 1, L + 0.8);
    K.collider(-CW - 0.2, PY, zc, 0.4, CH, L + 0.8);
    K.collider(CW + 0.2, PY, zc, 0.4, CH, L + 0.8);
    endWall(CZ0 - 0.4, false);
    endWall(CZ1, true);
    endWallCols(CZ0 - 0.4, 0, true);
    endWallCols(CZ0 - 0.4, 1, false);
    endWallCols(CZ1, 0, false);
    endWallCols(CZ1, 1, true);

    // face A (the floor when you come in): levers, two planters, the rose compass
    ['A', 'B'].forEach((face) => [-1, 1].forEach((s) => makeLever(face, s)));
    const planter = (x, z) => {
      feature('A', x, 0.6, z, 2.2, 1.2, 2.2, mDarkBrass, 1.2);
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 1.9), new THREE.MeshStandardMaterial({ color: '#1e1420', roughness: 1 }));
      addFace('A', soil, x, 1.21, z);
      // a little brass armillary on it
      const arm = new THREE.Group();
      [0, Math.PI / 2, Math.PI / 4].forEach((r) => {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 40), mBrass);
        t.rotation.set(r, r * 0.5, 0);
        arm.add(t);
      });
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow('#ffcf8a', 0.6));
      arm.add(s);
      addFace('A', arm, x, 2.0, z);
    };
    planter(-6, 21);
    planter(6, 27.5);
    const compass = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48).rotateX(-Math.PI / 2), sigilMat('♥', '#ff5f8a', 0.55));
    addFace('A', compass, 0, 0.02, 10);
    const compassB = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48).rotateX(-Math.PI / 2), sigilMat('♦', '#ff9a3a', 0.55));
    addFace('B', compassB, 0, 0.02, 10);

    // face B (the ceiling at first): four pillars, two of them carry a seal plate on top
    const pillar = (x, z, real) => {
      const h = 2.9;
      feature('B', x, h / 2, z, 1.6, h, 1.6, mPanel, 2);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.12, 32), mBrass);
      addFace('B', cap, x, h + 0.02, z);
      const foot = new THREE.Mesh(uvBox(1.9, 0.25, 1.9, 1), mBrass);
      addFace('B', foot, x, 0.12, z);
      // brass bands and an engraved star on each side, the same on all four
      [1.0, 2.0].forEach((y) => addFace('B', new THREE.Mesh(uvBox(1.68, 0.1, 1.68, 1), mBrass), x, y, z));
      for (let k = 0; k < 4; k++) {
        const st = new THREE.Mesh(new THREE.CircleGeometry(0.28, 5), glow('#ffcf8a', 0.35));
        const a = (k * Math.PI) / 2;
        st.position.set(Math.sin(a) * 0.81, 0, Math.cos(a) * 0.81);
        st.rotation.y = a;
        const holder = new THREE.Group();
        holder.add(st);
        addFace('B', holder, x, 1.5, z);
      }
      // what only the Dame's eyes read: the seal on the real plates
      const sig = new THREE.Mesh(new THREE.CircleGeometry(0.66, 40).rotateX(-Math.PI / 2), sealMat);
      addFace('B', sig, x, h + 0.1, z);
      sig.visible = false;
      if (real) {
        secretDame.push(sig);
        plates.push({ sig, x, z, h });
      }
      // the underside, seen from below while it hangs: same seal, facing down
      const sig2 = sig.clone();
      sig2.rotation.x = Math.PI;
      addFace('B', sig2, x, h + 0.09, z);
      sig2.visible = false;
      if (real) secretDame.push(sig2);
    };
    pillar(4.5, 18, true);
    pillar(-3, 26, true);
    pillar(-4.5, 14, false);
    pillar(3, 22.5, false);

    // the two seal lamps on the far wall, next to the axis (they turn with the room)
    [-2.4, 2.4].forEach((x) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 10, 40), mBrass);
      rim.position.set(x, 0, CZ1 - 0.05);
      cubePivot.add(rim);
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.68, 40), glow('#ff3b55', 0.35));
      lamp.position.set(x, 0, CZ1 - 0.08);
      lamp.rotation.y = Math.PI;
      cubePivot.add(lamp);
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), sigilMat('♦', '#ffcf8a', 0.6));
      d.position.set(x, 0, CZ1 - 0.1);
      d.rotation.y = Math.PI;
      cubePivot.add(d);
      seals.push(lamp);
    });
    // the rule, on the entry wall by the axis (upside down once the room has turned)
    const rule = sign('Ce qui est en haut à gauche', 'TOMBE EN BAS À DROITE', 6, 1.5, '#ffcf8a');
    rule.position.set(0, 0, CZ0 + 0.02);
    cubePivot.add(rule);
    const tl = sign('♦ 5 · La Gravité', 'LA SALLE QUI SE RETOURNE', 4.4, 1.3, '#ff9a3a');
    tl.position.set(0, 2.2, CZ0 + 0.02);
    cubePivot.add(tl);
    const tl2 = tl.clone();
    tl2.rotation.z = Math.PI;
    tl2.position.set(0, -2.2, CZ0 + 0.02);
    cubePivot.add(tl2);
    // two lamps ride with the room
    const l1 = new THREE.PointLight('#ffd9b0', 0.9, 26, 2);
    l1.position.set(0, 0, 10);
    const l2 = new THREE.PointLight('#cfa8ff', 0.8, 26, 2);
    l2.position.set(0, 0, 24);
    cubePivot.add(l1, l2);
    // lantern globes for the lamps
    [10, 24].forEach((z) => {
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), glow('#ffd9b0', 0.7));
      gl.position.set(0, 0, z);
      cubePivot.add(gl);
      const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: '#c89a46', wireframe: true }));
      cage.position.set(0, 0, z);
      cubePivot.add(cage);
    });

    // crates: they float through the turn and land straight down
    const cgeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Mesh(cgeo, mCrate);
      group.add(g);
      const b = K.collider(0, -50, 0, 1, 1, 1, { dyn: true, tag: 'd5crate' });
      crates.push({ g, b, y: 0, vy: 0, ty: 0 });
    }

    // the static drum around the room: brass ribs and a painted sky
    const drumTex = uvTex(2048, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0e0a22');
      gr.addColorStop(1, '#1c1036');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(255,${200 + Math.random() * 55},${180 + Math.random() * 60},${0.3 + Math.random() * 0.6})`;
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8, 0, Math.PI * 2);
        g.fill();
      }
    });
    drumTex.repeat.set(3, 1);
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(12.6, 12.6, L + 2, 64, 1, true),
      new THREE.MeshBasicMaterial({ map: drumTex, side: THREE.BackSide, color: '#b8b0d0' }),
    );
    drum.rotation.x = Math.PI / 2;
    drum.position.copy(P(0, PY, zc));
    group.add(drum);
    for (let z = CZ0 - 1; z <= CZ1 + 1; z += 5) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(12.5, 0.14, 8, 64), mDarkBrass);
      rib.position.copy(P(0, PY, z));
      group.add(rib);
    }
  };

  // ---------- room 2: the gravity beam, the slab and the bubbles ----------
  const buildRoom2 = () => {
    // exit corridor out of the drum
    wall(0, -0.5, 37, 4.4, 1, 7.2, tiles);
    wall(-2.4, 2.2, 37, 0.4, 4.4, 7.2, plaster);
    wall(2.4, 2.2, 37, 0.4, 4.4, 7.2, plaster);
    wall(0, 4.6, 37, 5.2, 0.4, 7.2, darkMarble);
    // the far end cap of the drum with its doorway
    wall(-7.6, PY, 33.6, 12, CH + 4, 0.5, stone);
    wall(7.6, PY, 33.6, 12, CH + 4, 0.5, stone);
    wall(0, 9.6, 33.6, 3.2, 12.8, 0.5, stone);
    wall(0, -0.5, 32.9, 3.4, 1, 1.0, tiles);
    // portcullis: closed until both seals are lit
    const gate = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.3, 8), mBrass);
      bar.position.set(-1.35 + i * 0.54, 1.65, 0);
      gate.add(bar);
    }
    [0.6, 2.4].forEach((y) => {
      const cross = new THREE.Mesh(uvBox(3.2, 0.12, 0.1, 1), mBrass);
      cross.position.y = y;
      gate.add(cross);
    });
    gate.position.copy(P(0, 0, 34.2));
    group.add(gate);
    exitGate = { g: gate, b: K.collider(0, 1.6, 34.2, 3.2, 3.2, 0.4), y: 0 };
    // the same at the entrance side: the hall wall around its door
    wall(-7.6, PY, 0.25, 12, CH + 4, 0.5, stone);
    wall(7.6, PY, 0.25, 12, CH + 4, 0.5, stone);
    wall(0, 9.6, 0.25, 3.2, 12.8, 0.5, stone);
    // landing between the hall door and the room
    wall(0, -0.5, 1.0, 3.4, 1, 1.4, tiles);

    // the void hall
    const z0 = 40;
    wall(-2, -0.5, 43, 26, 1, 6, marble); // start platform, x -15..11
    wall(-13, -0.5, 58, 4, 1, 24, marble); // the Dame's gallery, z 46..70
    wall(-2, -0.5, 86, 26, 1, 8, marble); // end platform (island 0), z 82..90
    // gallery parapet on the void side, outer wall, back wall of the start platform
    wall(-10.85, 0.5, 58, 0.3, 1, 24, darkMarble);
    wall(-15.3, 4, 64, 0.6, 9, 48, stone);
    wall(11.3, 4, 64, 0.6, 9, 48, stone);
    wall(-8.6, 4, z0 - 0.2, 13, 9, 0.4, stone);
    wall(6.7, 4, z0 - 0.2, 9.2, 9, 0.4, stone);
    // edge trims
    [
      [-2, 46, 26],
      [-2, 82, 26],
    ].forEach(([x, z, w]) => {
      const t = new THREE.Mesh(uvBox(w, 0.12, 0.2, 1), mBrass);
      t.position.copy(P(x, 0.02, z));
      group.add(t);
    });
    // columns along the walls with arches
    for (let z = 44; z <= 88; z += 8)
      [-15, 11].forEach((x) => {
        K.deco(new THREE.CylinderGeometry(0.45, 0.55, 9, 16), darkMarble, x + (x < 0 ? 0.5 : -0.5), 4, z);
        K.collider(x + (x < 0 ? 0.5 : -0.5), 4, z, 1.0, 9, 1.0);
        K.deco(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 16), mBrass, x + (x < 0 ? 0.5 : -0.5), 8.6, z);
      });

    // gates on the gallery (bars slide up when a bell is rung)
    [54, 64].forEach((z) => {
      const g = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), mBrass);
        bar.position.set(-1.6 + i * 0.53, 1.8, 0);
        g.add(bar);
      }
      const top = new THREE.Mesh(uvBox(3.9, 0.2, 0.2, 1), mBrass);
      top.position.y = 3.6;
      g.add(top);
      const sg = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), sigilMat('♦', '#ff9a3a', 0.8));
      sg.position.set(0, 2.6, 0.12);
      g.add(sg);
      g.position.copy(P(-13, 0, z));
      group.add(g);
      const b = K.collider(-13, 1.8, z, 4, 3.6, 0.4);
      // lintel above
      wall(-13, 6, z, 4.2, 4, 0.5, stone);
      r2.gates.push({ g, b, y: 0, z });
    });

    // the gravity beam rail and its carriage
    const rail = new THREE.Mesh(uvBox(0.2, 0.15, 24, 1), mBrass);
    rail.position.copy(P(-11.3, 1.1, 58));
    group.add(rail);
    const car = new THREE.Group();
    const cb = new THREE.Mesh(uvBox(0.7, 0.5, 0.9, 1), mDarkBrass);
    car.add(cb);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.5, 20), mBrass);
    lens.rotation.z = Math.PI / 2;
    lens.position.x = 0.5;
    car.add(lens);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glow('#7ce0ff', 0.85));
    eye.rotation.y = Math.PI / 2;
    eye.position.x = 0.76;
    car.add(eye);
    car.position.copy(P(-11.3, 1.45, 44));
    group.add(car);
    r2.carriage = car;
    r2.eye = eye;
    // the beam: a thin glowing tube from the lens to the slab
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8, 1, true).translate(0, 0.5, 0);
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#7ce0ff').multiplyScalar(0.8),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    group.add(beam);
    r2.beam = beam;
    // the slab: floating stone with a brass rim and a heart inlay
    const slab = new THREE.Group();
    const st = new THREE.Mesh(uvBox(3.2, 0.6, 3.2, 1.6), mTile);
    st.position.y = -0.3;
    slab.add(st);
    const rim = new THREE.Mesh(uvBox(3.36, 0.14, 3.36, 1), mBrass);
    rim.position.y = -0.06;
    slab.add(rim);
    const under = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 4), mDarkBrass);
    under.rotation.set(Math.PI, Math.PI / 4, 0);
    under.position.y = -1.4;
    slab.add(under);
    const ins = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40).rotateX(-Math.PI / 2), sigilMat('♥', '#ff5f8a', 0.3));
    ins.position.y = 0.01;
    slab.add(ins);
    const core2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), glow('#7ce0ff', 0.9));
    core2.position.y = -2.3;
    slab.add(core2);
    slab.position.copy(P(0, BLOCK_Y, 44));
    group.add(slab);
    r2.block = slab;
    r2.blockB = K.collider(0, BLOCK_Y - 0.3, 44, 3.2, 0.6, 3.2, { dyn: true, tag: 'd5slab' });

    // low-gravity bubbles over the slab's path, a bell above each
    [52, 66].forEach((z, i) => {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(4.5, 40, 24),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#7ce0ff').multiplyScalar(0.35),
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      s.position.copy(P(0, 4, z));
      group.add(s);
      const shell = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.05, 6, 64), glow('#7ce0ff', 0.6));
      shell.position.copy(P(0, 4, z));
      group.add(shell);
      const shell2 = shell.clone();
      shell2.rotation.y = Math.PI / 2;
      group.add(shell2);
      r2.bubbles.push({ s, shell, shell2, c: V3(0, 4, z), r: 4.5 });
      // the bell: a brass bell under a little star frame hung from chains
      const bell = new THREE.Group();
      const bg = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            [0, 0.62],
            [0.18, 0.6],
            [0.3, 0.42],
            [0.36, 0.12],
            [0.52, -0.05],
            [0.5, -0.1],
            [0, -0.1],
          ].map(([x, y]) => new THREE.Vector2(x, y)),
          28,
        ),
        mBrass,
      );
      bell.add(bg);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 8, 40), glow('#ffcf8a', 0.7));
      halo.rotation.x = Math.PI / 2;
      bell.add(halo);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 8, 6), mBrass);
      chain.position.y = 4.6;
      bell.add(chain);
      bell.position.copy(P(0, 9.6, z));
      group.add(bell);
      r2.bells.push({ g: bell, halo, c: V3(0, 9.6, z), rung: 0 });
    });
    // the grapple ring over the gallery gap
    const ring = new THREE.Group();
    const rt = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 10, 36), mBrass);
    ring.add(rt);
    const rg = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 8, 36), glow('#ff5f8a', 0.6));
    ring.add(rg);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4, 6), mBrass);
    ch.position.y = 2.6;
    ring.add(ch);
    ring.position.copy(P(-13, 5.5, 76));
    group.add(ring);
    r2.ring = ring;

    // ---------- room 3: the streams ----------
    // island 1 and island 2 (up at 4 m), corridor into the orrery gallery
    wall(0, -0.5, 103, 10, 1, 6, marble);
    wall(0, 3.5, 121, 10, 1, 6, marble);
    wall(0, 3.5, 127.5, 4.4, 1, 7.2, tiles);
    wall(-2.4, 6.2, 127.5, 0.4, 4.4, 7.2, plaster);
    wall(2.4, 6.2, 127.5, 0.4, 4.4, 7.2, plaster);
    wall(0, 8.6, 127.5, 5.2, 0.4, 7.2, darkMarble);
    // islands hang on brass cones over the void
    [
      [103, 0],
      [121, 4],
    ].forEach(([z, y]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 7, 6), stone);
      cone.rotation.x = Math.PI;
      cone.position.copy(P(0, y - 4.5, z));
      group.add(cone);
      const tr = new THREE.Mesh(uvBox(10.2, 0.14, 6.2, 1), mBrass);
      tr.position.copy(P(0, y + 0.01, z));
      tr.scale.set(1, 1, 1);
      group.add(tr);
      const top = new THREE.Mesh(uvBox(9.8, 0.1, 5.8, 3), mTile);
      top.position.copy(P(0, y + 0.04, z));
      group.add(top);
    });
    const lane = (a, b, i) => {
      const A = V3(...a);
      const B = V3(...b);
      const d = B.clone().sub(A);
      const len = d.length();
      // swirling motes along the stream
      const n = 420;
      const pos = new Float32Array(n * 3);
      const seed = new Float32Array(n * 2);
      for (let k = 0; k < n; k++) {
        seed[k * 2] = Math.random();
        seed[k * 2 + 1] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: new THREE.Color('#9fd8ff').multiplyScalar(0.85),
        size: 0.22,
        map: dotTex,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      group.add(pts);
      // brass rings at both ends
      const mk = (p) => {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.12, 10, 48), mBrass);
        r.position.copy(P(p.x, p.y, p.z));
        r.lookAt(P(p.x + d.x, p.y + d.y, p.z + d.z));
        group.add(r);
        const r2_ = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.05, 8, 48), glow('#7ce0ff', 0.4));
        r2_.position.copy(r.position);
        r2_.quaternion.copy(r.quaternion);
        group.add(r2_);
        return r2_;
      };
      const ea = mk(A);
      const eb = mk(B);
      lanes.push({ A, B, d: d.clone().normalize(), len, pts, seed, pos, ea, eb, on: 0 });
    };
    lane([0, 1.2, 90], [0, 1.2, 100]);
    lane([0, 1.2, 106], [0, 5.2, 118]);
    // the pressure stones: each powers the streams on both sides of its island
    [
      [7, 0, 86],
      [-3.2, 0, 104.2],
      [3.2, 4, 121.8],
    ].forEach(([x, y, z]) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.12, 36), mDarkBrass);
      base.position.y = 0.06;
      g.add(base);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.04, 36), mTile);
      top.position.y = 0.13;
      g.add(top);
      const sig = new THREE.Mesh(new THREE.CircleGeometry(0.75, 36).rotateX(-Math.PI / 2), sigilMat('✦', '#7ce0ff', 0.4));
      sig.position.y = 0.16;
      g.add(sig);
      g.position.copy(P(x, y, z));
      group.add(g);
      stones.push({ g, sig, x, y, z });
    });
  };

  const wall = (x, y, z, sx, sy, sz, mat = plaster) => K.solid(x, y, z, sx, sy, sz, mat);

  // ---------- room 4: the orrery ----------
  const RING = [
    { r: 11, y: 3.0, col: '#ff5f8a', sym: '♥' },
    { r: 8, y: 6.6, col: '#ffb04a', sym: '♦' },
    { r: 5, y: 10.6, col: '#7ce0ff', sym: '♣' },
  ];
  const polar = (r, a, y) => P(r * Math.cos(a), y, OC + r * Math.sin(a));
  const STATION = {
    crank1: { lv: 0, a: 200, r: 13.2 },
    clutch1: { lv: 2, a: 20, r: 18.4 },
    crank2: { lv: 1, a: 110, r: 18.4 },
    clutch2: { lv: 0, a: 300, r: 13.2 },
    crank3: { lv: 2, a: 235, r: 18.4 },
    clutch3: { lv: 1, a: 60, r: 18.4 },
  };
  const LV_Y = [0, G1, G2];
  const planetTex = (col, sym) =>
    uvTex(1024, 512, (g, w, h) => {
      const base = new THREE.Color(col);
      const c1 = '#' + base.clone().multiplyScalar(0.55).getHexString();
      const c2 = '#' + base.clone().multiplyScalar(0.85).getHexString();
      for (let y = 0; y < h; y += 4) {
        const k = 0.5 + 0.5 * Math.sin(y * 0.05 + Math.sin(y * 0.013) * 3);
        g.fillStyle = k > 0.5 ? c2 : c1;
        g.globalAlpha = 0.6 + k * 0.4;
        g.fillRect(0, y, w, 4);
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 4 + Math.random() * 10, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,240,220,.85)';
      g.font = 'bold 150px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      Icons.fillText(g, sym, w * 0.25, h / 2);
      Icons.fillText(g, sym, w * 0.75, h / 2);
    });
  const buildOrrery = () => {
    // floor, wall, dome
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(GR1 + 0.2, GR1 + 0.2, 1, 64), orreryFloor);
    floor.position.copy(P(0, -0.5, OC));
    group.add(floor);
    K.collider(0, -0.5, OC, 42, 1, 42);
    // the hall wall, open where the corridor comes in (south, three's theta = PI there)
    const wallTex = panelTex.clone();
    wallTex.needsUpdate = true;
    wallTex.repeat.set(16, 1.6);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: '#6e6290', side: THREE.BackSide, roughness: 0.8, emissive: '#0a0614' });
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(GR1 + 0.5, GR1 + 0.5, 14, 72, 1, true, Math.PI + 0.13, Math.PI * 2 - 0.26), wallMat);
    inner.position.copy(P(0, 7, OC));
    group.add(inner);
    [
      [2, 4],
      [11.3, 5.4],
    ].forEach(([y, h]) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(GR1 + 0.5, GR1 + 0.5, h, 8, 1, true, Math.PI - 0.13, 0.26), wallMat);
      m.position.copy(P(0, y, OC));
      group.add(m);
    });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = GR1 + 1.1;
      // leave the entrance corridor open (south, at gallery 1 height)
      const c = polar(r, a, 0);
      const rel = K.rel(c);
      if (Math.abs(rel.x) < 2.6 && rel.z < OC) {
        K.collider(rel.x, 2, rel.z, 3.4, 4, 3.4);
        K.collider(rel.x, 11, rel.z, 3.4, 6, 3.4);
      } else K.collider(rel.x, 7, rel.z, 3.4, 14, 3.4);
    }
    // ribs on the wall
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      const rib = new THREE.Mesh(uvBox(0.5, 14, 0.5, 1), mDarkBrass);
      rib.position.copy(polar(GR1 + 0.25, a, 7));
      rib.rotation.y = -a;
      group.add(rib);
    }
    dome = new THREE.Mesh(new THREE.SphereGeometry(GR1 + 0.6, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    dome.position.copy(P(0, 14, OC));
    group.add(dome);
    for (let i = 0; i < 12; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(GR1 + 0.6, 0.12, 8, 64, Math.PI), mDarkBrass);
      arc.position.copy(P(0, 14, OC));
      arc.rotation.y = (i / 12) * Math.PI;
      group.add(arc);
    }
    const crown = new THREE.Mesh(new THREE.TorusGeometry(GR1 + 0.6, 0.3, 10, 64), mBrass);
    crown.rotation.x = Math.PI / 2;
    crown.position.copy(P(0, 14, OC));
    group.add(crown);
    // galleries: an annulus of small boxes for the physics, a lathe ring for the eye
    const gallery = (y) => {
      const prof = [
        [GR0, -0.5],
        [GR1, -0.5],
        [GR1, 0],
        [GR0, 0],
        [GR0, -0.5],
      ].map(([x, yy]) => new THREE.Vector2(x, yy));
      const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), galleryMat);
      m.position.copy(P(0, y, OC));
      group.add(m);
      const under = new THREE.Mesh(new THREE.RingGeometry(GR0, GR1, 96, 1).rotateX(Math.PI / 2), underMat);
      under.position.copy(P(0, y - 0.52, OC));
      group.add(under);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(GR0, 0.1, 8, 96), mBrass);
      edge.rotation.x = Math.PI / 2;
      edge.position.copy(P(0, y, OC));
      group.add(edge);
      [17.4, 19.4].forEach((r) => {
        const n = 56;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const rel = K.rel(polar(r, a, 0));
          K.collider(rel.x, y - 0.25, rel.z, 2.3, 0.5, 2.3);
        }
      });
      // railing on the inner edge, open at the lifts (east, west) and to the north
      const gaps = [0, Math.PI, Math.PI / 2];
      const n = 100;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.2)) continue;
        const p = polar(GR0 + 0.15, a, y + 0.55);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), mBrass);
        post.position.copy(p);
        group.add(post);
        const rel = K.rel(p);
        K.collider(rel.x, y + 0.55, rel.z, 0.5, 1.1, 0.5);
      }
      const rail = new THREE.Mesh(new THREE.TorusGeometry(GR0 + 0.15, 0.05, 6, 96), mBrass);
      rail.rotation.x = Math.PI / 2;
      rail.position.copy(P(0, y + 1.1, OC));
      group.add(rail);
    };
    gallery(G1);
    gallery(G2);
    // the core: a brass column and the heart-sun on top
    core = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 12, 32), mDarkBrass);
    col.position.y = 6;
    core.add(col);
    for (let y = 1; y < 12; y += 2.2) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.08, 8, 40), mBrass);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      core.add(band);
    }
    const hs = new THREE.Shape();
    for (let i = 0; i <= 80; i++) {
      const [hx, hy] = Heart.curve((i / 80) * Math.PI * 2);
      if (i === 0) hs.moveTo(hx / 16, hy / 16);
      else hs.lineTo(hx / 16, hy / 16);
    }
    const sun = new THREE.Mesh(
      new THREE.ExtrudeGeometry(hs, { depth: 0.5, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 2 }),
      glow('#ff5f8a', 0.75),
    );
    sun.geometry.center();
    sun.scale.setScalar(1.6);
    sun.position.copy(P(0, 13.4, OC));
    group.add(sun);
    core.sun = sun;
    const sl = new THREE.PointLight('#ff8ab0', 1.0, 34, 2);
    sl.position.copy(P(0, 13, OC));
    group.add(sl);
    core.position.copy(P(0, 0, OC));
    group.add(core);
    coreB = K.collider(0, 6, OC, 3.2, 12, 3.2);
    // the three rings with their planets; each turns around the core
    RING.forEach((d, k) => {
      const piv = new THREE.Group();
      piv.position.copy(P(0, d.y, OC));
      group.add(piv);
      const track = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.09, 8, 128), mBrass);
      track.rotation.x = Math.PI / 2;
      track.position.copy(P(0, d.y, OC));
      group.add(track);
      // 12 notches on the track
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mBrass);
        n.position.copy(polar(d.r, a, d.y));
        group.add(n);
      }
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, d.r - 1.6, 8), mBrass);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = (d.r + 1.6) / 2;
      piv.add(arm);
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 40, 28),
        new THREE.MeshStandardMaterial({ map: planetTex(d.col, d.sym), roughness: 0.6, emissive: d.col, emissiveIntensity: 0.18 }),
      );
      planet.position.x = d.r;
      piv.add(planet);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 8, 48), glow(d.col, 0.45));
      halo.rotation.x = Math.PI / 2;
      halo.position.x = d.r;
      piv.add(halo);
      // the target: a constellation sigil at the right notch, seen by only one of you
      const tgt = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), targetMat(d.sym, d.col));
      disc.rotation.x = -Math.PI / 2;
      tgt.add(disc);
      const disc2 = disc.clone();
      disc2.rotation.x = Math.PI / 2;
      tgt.add(disc2);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 30, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(d.col).multiplyScalar(0.5), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      tgt.add(beam);
      group.add(tgt);
      tgt.visible = false;
      (k === 1 ? secretValet : secretDame).push(tgt);
      rings.push({ piv, planet, halo, tgt, d, a: 0, lockK: 0 });
    });
    // stations: crank wheels and clutch levers
    Object.entries(STATION).forEach(([key, s]) => {
      const a = (s.a * Math.PI) / 180;
      const y = LV_Y[s.lv];
      const p = polar(s.r, a, y);
      const rel = K.rel(p);
      const g = new THREE.Group();
      g.position.copy(p);
      g.rotation.y = -a + Math.PI / 2;
      group.add(g);
      const k = +key.slice(-1) - 1;
      const col = RING[k].col;
      const ped = new THREE.Mesh(uvBox(0.9, 1.0, 0.7, 1), mDarkBrass);
      ped.position.y = 0.5;
      g.add(ped);
      K.collider(rel.x, y + 0.5, rel.z, 0.9, 1, 0.9);
      let part;
      if (key.startsWith('crank')) {
        part = new THREE.Group();
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 32), mBrass);
        part.add(wheel);
        for (let i = 0; i < 6; i++) {
          const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), mBrass);
          sp.rotation.z = (i / 6) * Math.PI;
          part.add(sp);
        }
        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glow(col, 0.6));
        part.add(hub);
        part.position.set(0, 1.35, 0);
        g.add(part);
      } else {
        part = new THREE.Group();
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8).translate(0, 0.5, 0), mBrass);
        part.add(arm);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), glow(col, 0.6));
        knob.position.y = 1.0;
        part.add(knob);
        part.position.set(0, 1.0, 0);
        part.rotation.x = -0.6;
        g.add(part);
      }
      const plaque = sign(key.startsWith('crank') ? 'Manivelle ' + RING[k].sym : 'Embrayage ' + RING[k].sym, key.startsWith('crank') ? 'ANNEAU ' + (k + 1) : 'POUR L’ANNEAU ' + (k + 1), 1.1, 0.42, col);
      plaque.position.set(0, 0.62, 0.36);
      g.add(plaque);
      const ringG = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 40).rotateX(-Math.PI / 2), glow(col, 0.35));
      ringG.position.y = 0.02;
      g.add(ringG);
      stations[key] = { key, g, part, ringG, rel, y, k };
    });
    // the gravity lifts: a column of rising motes, east and west
    [0, Math.PI].forEach((a) => {
      const p = polar(14.6, a, 0);
      const rel = K.rel(p);
      const n = 260;
      const pos = new Float32Array(n * 3);
      const sd = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        sd[i * 3] = Math.random() * Math.PI * 2;
        sd[i * 3 + 1] = Math.random();
        sd[i * 3 + 2] = Math.random() * 1.2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: new THREE.Color('#9fd8ff').multiplyScalar(0.8), size: 0.22, map: dotTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      pts.frustumCulled = false;
      group.add(pts);
      const hoops = [];
      for (let y = 0.1; y < 13; y += 4.2) {
        const h = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 8, 40), glow('#7ce0ff', 0.45));
        h.rotation.x = Math.PI / 2;
        h.position.copy(P(rel.x, y, rel.z));
        group.add(h);
        hoops.push(h);
      }
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.1, 36), mDarkBrass);
      pad.position.copy(P(rel.x, 0.05, rel.z));
      group.add(pad);
      lifts.push({ x: rel.x, z: rel.z, pts, pos, sd, hoops });
    });
    // pulse rings, one per level
    pulseRings = [0, G1, G2].map((y) => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1, 96).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#2fa8ff').multiplyScalar(0.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
      );
      m.position.copy(P(0, y + 0.05, OC));
      m.visible = false;
      group.add(m);
      return m;
    });
    // the heart galaxy in the dome: dim, then whole when the card is won
    heart = Heart.galaxy(9000, 0.5, 57);
    heart.group.position.copy(P(0, 26, OC));
    heart.group.rotation.x = Math.PI / 2;
    heart.U.uForm.value = 0.2;
    group.add(heart.group);
    card = LvKit.card('5', '♦', true);
    card.position.copy(P(0, 2, OC));
    group.add(card);
    const l1 = new THREE.PointLight('#cfa8ff', 0.75, 40, 2);
    l1.position.copy(P(0, 9, OC + 12));
    const l2 = new THREE.PointLight('#ffd9b0', 0.75, 40, 2);
    l2.position.copy(P(0, 9, OC - 12));
    group.add(l1, l2);
  };

  // ---------- entrance hall ----------
  const buildHall = () => {
    wall(0, -0.5, -7, 16, 1, 14, marble);
    wall(-8, 4, -7, 0.6, 8, 14, plaster);
    wall(8, 4, -7, 0.6, 8, 14, plaster);
    wall(0, 4, -14, 16, 8, 0.6, plaster);
    wall(0, 8.2, -7, 16, 0.4, 14, darkMarble);
    // north wall with the door into the drum
    wall(-4.9, 4, -0.2, 6.2, 8, 0.4, plaster);
    wall(4.9, 4, -0.2, 6.2, 8, 0.4, plaster);
    wall(0, 5.6, -0.2, 3.6, 4.8, 0.4, plaster);
    [-1.8, 1.8].forEach((x) => K.solid(x, 1.7, -0.3, 0.3, 3.4, 0.5, mBrass));
    K.solid(0, 3.35, -0.3, 3.9, 0.3, 0.5, mBrass);
    screen = makeScreen(7, 3.2, 1024);
    screen.mesh.position.copy(P(0, 4.4, -13.65));
    group.add(screen.mesh);
    // a great brass telescope on its tripod, aimed at a round window
    const tel = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 4.2, 28), mBrass);
    tube.rotation.z = Math.PI / 2.6;
    tube.position.y = 2.6;
    tel.add(tube);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), glow('#7ce0ff', 0.4));
    lens.position.set(1.95, 3.45, 0);
    lens.rotation.y = Math.PI / 2;
    lens.rotation.x = 0.4;
    tel.add(lens);
    [0, 2.1, 4.2].forEach((a) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 8), mDarkBrass);
      leg.position.set(Math.cos(a) * 0.5, 1.25, Math.sin(a) * 0.5);
      leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      tel.add(leg);
    });
    tel.position.copy(P(-5, 0, -8));
    group.add(tel);
    K.collider(-5, 1.3, -8, 1.4, 2.6, 1.4);
    const win = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: '#2a1d4a', toneMapped: false }));
    win.position.copy(P(-7.68, 5.5, -8));
    win.rotation.y = Math.PI / 2;
    group.add(win);
    const wr = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 10, 48), mBrass);
    wr.position.copy(win.position);
    wr.rotation.y = Math.PI / 2;
    group.add(wr);
    // an armillary sphere on a plinth: the place's emblem
    K.solid(4.5, 0.5, -8, 1.4, 1, 1.4, darkMarble);
    const arm = new THREE.Group();
    [0, Math.PI / 2, Math.PI / 3, -Math.PI / 3].forEach((r) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 8, 48), mBrass);
      t.rotation.set(r, r * 0.4, 0);
      arm.add(t);
    });
    const hb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), glow('#ff5f8a', 0.7));
    arm.add(hb);
    arm.position.copy(P(4.5, 1.9, -8));
    group.add(arm);
    lights.hallArm = arm;
    const rule = sign('Ici, tout tombe', 'MAIS PAS FORCÉMENT VERS LE BAS', 4.2, 1.2, '#ffcf8a');
    rule.position.copy(P(7.68, 3.6, -6));
    rule.rotation.y = -Math.PI / 2;
    group.add(rule);
    LvKit.light(group, P(0, 6.5, -7), '#ffd9b0', 1.2, 20);
    // the void hall lights
    LvKit.light(group, P(-2, 7, 50), '#cfa8ff', 0.8, 34);
    LvKit.light(group, P(-2, 7, 78), '#ffd9b0', 0.8, 34);
    LvKit.light(group, P(0, 6, 110), '#9fd8ff', 0.8, 34);
  };

  // the sky: a starfield all around and a nebula far below the void
  const buildSky = () => {
    const n = 7000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(500);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.35, 0.5, 0.55 + Math.random() * 0.3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, fog: false }),
    );
    stars.position.copy(P(0, 0, 80));
    group.add(stars);
    const neb = uvTex(1024, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 60 + Math.random() * 220;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const c = ['120,60,200', '255,95,138', '80,140,255'][i % 3];
        gr.addColorStop(0, `rgba(${c},.16)`);
        gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
    });
    neb.wrapS = neb.wrapT = THREE.ClampToEdgeWrapping;
    const nm = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: neb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, color: '#9a8ab0' }),
    );
    nm.position.copy(P(0, -45, 80));
    group.add(nm);
    // rocks drifting in the void, far below the paths
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    for (let i = 0; i < 22; i++) {
      const r = new THREE.Mesh(rockGeo, stone);
      const sc = 0.8 + Math.random() * 2.6;
      r.scale.set(sc, sc * (0.6 + Math.random() * 0.5), sc);
      r.position.copy(P((Math.random() - 0.5) * 70, -8 - Math.random() * 26, 40 + Math.random() * 90));
      r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      r.userData.b = Math.random() * 6;
      r.userData.y = r.position.y;
      group.add(r);
      rocks.push(r);
    }
  };

  const build = (who) => {
    role = who || role;
    group.visible = true;
    if (!built) {
      built = true;
      buildHall();
      buildCube();
      buildRoom2();
      buildOrrery();
      buildSky();
    }
    secretDame.forEach((m) => (m.visible = role === 'dame'));
    secretValet.forEach((m) => (m.visible = role === 'valet'));
  };

  // ---------- room-1 controls ----------
  const setCubeState = (s) => {
    cubeCol[s].forEach((b) => (b.on = true));
    cubeCol[1 - s].forEach((b) => (b.on = false));
  };
  const cubeOff = () => cubeCol.forEach((l) => l.forEach((b) => (b.on = false)));
  const setCubeAngle = (a) => {
    cubeAngle = a;
    cubePivot.rotation.z = a;
  };
  const setCrate = (i, p, visible = true) => {
    const c = crates[i];
    c.g.visible = visible;
    if (!p) {
      c.b.on = false;
      return;
    }
    c.g.position.copy(P(p[0], p[1] + 0.5, p[2]));
    c.b.on = visible && !p.held;
    const b = c.b;
    b.min[0] = O.x + p[0] - 0.5;
    b.max[0] = O.x + p[0] + 0.5;
    b.min[1] = O.y + p[1];
    b.max[1] = O.y + p[1] + 1;
    b.min[2] = O.z + p[2] - 0.5;
    b.max[2] = O.z + p[2] + 0.5;
  };

  const _v = V3();
  const update = (dt, t, x, a) => {
    if (!built) return;
    // levers: charge (0..1) and pulled state
    levers.forEach((lv) => {
      const k = lv.side < 0 ? a.lvL : a.lvR;
      const tgt = k ? -0.9 : 0.5;
      lv.pivot.rotation.x = damp(lv.pivot.rotation.x, tgt, 8, dt);
      lv.orb.material.color.set(a.flipCharge > 0 && k ? '#ffcf8a' : k ? '#ff5f8a' : '#ff5f8a').multiplyScalar(k ? 0.85 : 0.22 + 0.06 * Math.sin(t * 3));
      lv.ring.material.color.set('#ffcf8a').multiplyScalar(0.25 + (k ? 0.55 : 0) + a.flipCharge * 0.3);
    });
    // seals
    seals.forEach((m, i) => {
      const on = a.seal && a.seal[i];
      m.material.color.set(on ? '#ffcf8a' : '#ff3b55').multiplyScalar(on ? 0.85 : 0.3 + 0.08 * Math.sin(t * 2 + i));
    });
    // exit portcullis
    exitGate.y = damp(exitGate.y, a.exitOpen ? 3.2 : 0, 2.5, dt);
    exitGate.g.position.y = O.y + exitGate.y;
    exitGate.b.on = exitGate.y < 2.6;
    // crates falling into place after a turn
    crates.forEach((c, i) => {
      if (!c.g.visible || c.held) return;
      if (c.fall) {
        c.vy -= 26 * dt;
        c.y += c.vy * dt;
        if (c.y <= c.ty) {
          c.y = c.ty;
          c.fall = false;
          Sound.play('thud', c.g.position);
        }
        c.g.position.y = O.y + c.y + 0.5;
      }
    });
    // room 2
    const bz = a.blockZ;
    const by = BLOCK_Y + Math.sin(t * 1.3) * 0.0;
    r2.block.position.set(O.x, O.y + by, O.z + bz);
    r2.block.rotation.y = Math.sin(t * 0.4) * 0.02;
    const bb = r2.blockB;
    bb.min[0] = O.x - 1.6;
    bb.max[0] = O.x + 1.6;
    bb.min[1] = O.y + by - 0.6;
    bb.max[1] = O.y + by;
    bb.min[2] = O.z + bz - 1.6;
    bb.max[2] = O.z + bz + 1.6;
    r2.carriage.position.z = O.z + a.carZ;
    r2.eye.material.color.set('#7ce0ff').multiplyScalar(a.grab ? 0.9 : 0.35);
    // beam from the carriage lens to the slab's core
    const from = _v.copy(r2.carriage.position).add(V3(0.76, 0, 0));
    const to = V3(O.x, O.y + by - 0.4, O.z + bz);
    const d = to.clone().sub(from);
    r2.beam.position.copy(from);
    r2.beam.scale.set(1, d.length(), 1);
    r2.beam.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
    r2.beam.material.opacity = a.grab ? 0.55 + 0.15 * Math.sin(t * 20) : 0.12;
    r2.gates.forEach((g, i) => {
      g.y = damp(g.y, x.r2 && x.r2.gates[i] ? 3.8 : 0, 2.2, dt);
      g.g.position.y = O.y + g.y;
      g.b.on = g.y < 3;
    });
    r2.bubbles.forEach((b, i) => {
      const s = 1 + Math.sin(t * 1.6 + i) * 0.015;
      b.s.scale.setScalar(s);
      b.shell.rotation.x = t * 0.5 + i;
      b.shell2.rotation.z = t * 0.4;
    });
    r2.bells.forEach((b, i) => {
      const rung = x.r2 && x.r2.gates[i];
      b.g.rotation.z = Math.sin(t * 6) * (b.swing || 0);
      b.swing = Math.max(0, (b.swing || 0) - dt * 0.15);
      b.halo.material.color.set(rung ? '#ffcf8a' : '#ff9a3a').multiplyScalar(rung ? 0.85 : 0.35 + 0.15 * Math.sin(t * 3));
    });
    r2.ring.rotation.y = t * 0.8;
    // room 3: streams
    lanes.forEach((l, i) => {
      const on = a.lanes ? a.lanes[i] : 0;
      l.on = damp(l.on, on ? 1 : 0, 4, dt);
      const n = l.seed.length / 2;
      for (let k = 0; k < n; k++) {
        const s = (l.seed[k * 2] + t * (0.08 + 0.12 * l.on)) % 1;
        const ang = l.seed[k * 2 + 1] * Math.PI * 2 + t * 1.5 + s * 6;
        const rr = 0.4 + l.seed[k * 2 + 1] * 1.3;
        const px = l.A.x + l.d.x * l.len * s;
        const py = l.A.y + l.d.y * l.len * s;
        const pz = l.A.z + l.d.z * l.len * s;
        l.pos[k * 3] = O.x + px + Math.cos(ang) * rr;
        l.pos[k * 3 + 1] = O.y + py + Math.sin(ang) * rr;
        l.pos[k * 3 + 2] = O.z + pz;
      }
      l.pts.geometry.attributes.position.needsUpdate = true;
      l.pts.material.opacity = 0.12 + l.on * 0.6;
      [l.ea, l.eb].forEach((e) => e.material.color.set('#7ce0ff').multiplyScalar(0.25 + l.on * 0.6));
    });
    stones.forEach((s, i) => {
      const on = a.stones ? a.stones[i] : 0;
      s.sig.material = sigilMat('✦', on ? '#7ce0ff' : '#6a6a9a', on ? 0.95 : 0.35);
    });
    // room 4: rings, stations, lifts, pulse
    rings.forEach((r, k) => {
      const tgtA = (a.steps ? a.steps[k] : 0) * (Math.PI / 6);
      let diff = Math.atan2(Math.sin(tgtA - r.a), Math.cos(tgtA - r.a));
      r.a += diff * Math.min(1, dt * 5);
      r.piv.rotation.y = -r.a;
      r.planet.rotation.y = t * 0.5;
      const lock = a.locked ? a.locked[k] : false;
      r.lockK = damp(r.lockK, lock ? 1 : 0, 3, dt);
      r.halo.material.color.set(lock ? '#ffcf8a' : r.d.col).multiplyScalar(0.35 + r.lockK * 0.5);
      const ta = (a.targets ? a.targets[k] : 0) * (Math.PI / 6);
      r.tgt.position.copy(polar(r.d.r, ta, r.d.y));
      r.tgt.children[0].rotation.z = t * 0.4;
      r.tgt.children[1].rotation.z = -t * 0.4;
      if (lock) r.tgt.visible = false;
    });
    Object.values(stations).forEach((s) => {
      const held = a.holds && a.holds.includes(s.key);
      if (s.part.children.length > 3 && held && a.turning === s.k) s.part.rotation.z -= dt * 3;
      s.ringG.material.color.set(held ? '#ffcf8a' : RING[s.k].col).multiplyScalar(held ? 0.85 : 0.3);
    });
    lifts.forEach((l) => {
      const n = l.sd.length / 3;
      for (let i = 0; i < n; i++) {
        const yy = ((l.sd[i * 3 + 1] + t * 0.12) % 1) * 13;
        const ang = l.sd[i * 3] + t * 0.8;
        const rr = l.sd[i * 3 + 2];
        l.pos[i * 3] = O.x + l.x + Math.cos(ang) * rr;
        l.pos[i * 3 + 1] = O.y + yy;
        l.pos[i * 3 + 2] = O.z + l.z + Math.sin(ang) * rr;
      }
      l.pts.geometry.attributes.position.needsUpdate = true;
      l.pts.material.opacity = a.heavy ? 0.1 : 0.5;
      l.hoops.forEach((h, i) => (h.position.y = O.y + ((i * 4.2 + t * 1.5) % 12.6)));
    });
    // pulse telegraph: a ring closes in from the wall to the core, then bursts
    pulseRings.forEach((m, i) => {
      const p = a.pulse;
      m.visible = p != null;
      if (p == null) return;
      const k = clamp(p, 0, 1);
      const r = 1 + (1 - k) * (GR1 - 1);
      m.scale.setScalar(r);
      m.material.opacity = 0.35 + k * 0.65;
    });
    dome.material.opacity = 0.16 + (a.pulse != null ? a.pulse * 0.12 : 0);
    // the core sinks when the orrery is solved, the card comes down
    const sink = a.solved || 0;
    core.position.y = O.y - sink * 12.5;
    core.sun.rotation.y = t * 0.6;
    // it beats once the orrery is solved
    const beat = sink ? Math.pow(Math.max(0, Math.sin(t * 3.2)), 8) : 0;
    core.sun.scale.setScalar(1.6 * (1 + beat * 0.12 + sink * 0.25));
    core.sun.material.color.set('#ff5f8a').multiplyScalar(0.55 + 0.2 * Math.sin(t * 2.2) + beat * 0.15);
    coreB.on = sink < 0.3;
    const U = heart.U;
    U.uTime.value = t;
    U.uPx.value = R.renderer.getPixelRatio() * 0.5;
    U.uForm.value = damp(U.uForm.value, a.solved ? 1 : 0.25, 0.8, dt);
    U.uFade.value = a.solved ? 0.35 : 0.65;
    card.visible = !!a.cardOn;
    if (card.visible) {
      card.rotation.y = t * 1.2;
      card.position.y = O.y + Math.max(2.1, 14 - a.cardT * 4) + Math.sin(t * 2) * 0.1;
    }
    if (lights.hallArm) lights.hallArm.rotation.y = t * 0.3;
    stars.rotation.y = t * 0.004;
    rocks.forEach((r) => {
      r.position.y = r.userData.y + Math.sin(t * 0.3 + r.userData.b) * 0.8;
      r.rotation.y += dt * 0.05;
    });
  };

  // which room-1 face is the floor in a state, and where things land
  const groundIn = (x, z, fromY = CH - 0.5) => Phys.groundAt(O.x + x, O.y + fromY, O.z + z) - O.y;

  return {
    O,
    P,
    CW,
    CH,
    PY,
    CZ0,
    CZ1,
    OC,
    G1,
    G2,
    build,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    hide() {
      group.visible = false;
    },
    rel: K.rel,
    update,
    setCubeState,
    cubeOff,
    setCubeAngle,
    setCrate,
    crates,
    plates,
    groundIn,
    stations,
    STATION,
    lanes,
    stones,
    r2,
    lifts,
    bells: r2.bells,
    ringPos: () => r2.ring.position,
    spawn(stage, kit) {
      const s = kit === 'dame' ? -1 : 1;
      if (stage <= 1) return P(s * 2, 0, -9);
      if (stage === 2) return kit === 'dame' ? P(-13, 0, 43) : P(0, 0, 42.5);
      if (stage === 3) return P(s * 2, 0, 85);
      return P(s * 1.2, G1, 131.5);
    },
    // room 1
    inCube: (q) => q.x > -CW && q.x < CW && q.z > CZ0 && q.z < CZ1 && q.y > -1 && q.y < CH,
    nearLever: (q) => {
      if (Math.abs(q.z - 6) > 1.7 || q.y > 1.5) return 0;
      if (Math.abs(q.x + 7) < 1.7) return -1;
      if (Math.abs(q.x - 7) < 1.7) return 1;
      return 0;
    },
    crateNear(q, i) {
      const c = crates[i].g.position;
      return Math.hypot(q.x - (c.x - O.x), q.z - (c.z - O.z)) < 1.6 && Math.abs(q.y - (c.y - O.y - 0.5)) < 1.2;
    },
    // room 2
    nearCarriage: (q, carZ) => q.x < -10 && q.x > -15 && Math.abs(q.z - carZ) < 2.2 && q.y > -0.5 && q.y < 2,
    inBubble(q) {
      return r2.bubbles.some((b) => Math.hypot(q.x - b.c.x, q.y + 0.9 - b.c.y, q.z - b.c.z) < b.r);
    },
    bellHit(q) {
      return r2.bells.findIndex((b) => Math.hypot(q.x - b.c.x, q.y + 1.2 - b.c.y, q.z - b.c.z) < 1.5);
    },
    swingBell(i) {
      r2.bells[i].swing = 0.5;
    },
    onSlab: (q, bz) => Math.abs(q.x) < 1.75 && Math.abs(q.z - bz) < 1.75 && Math.abs(q.y - BLOCK_Y) < 0.3,
    // room 3
    laneAt(q) {
      for (let i = 0; i < lanes.length; i++) {
        const l = lanes[i];
        const v = V3(q.x - l.A.x, q.y + 0.9 - l.A.y, q.z - l.A.z);
        const s = v.dot(l.d);
        if (s < -0.6 || s > l.len) continue;
        const perp = v.clone().sub(l.d.clone().multiplyScalar(s));
        if (perp.length() < 2.0) return { i, s, perp };
      }
      return null;
    },
    onStone: (q) =>
      stones.findIndex((s) => Math.hypot(q.x - s.x, q.z - s.z) < 1.05 && Math.abs(q.y - s.y) < 0.5),
    island(q) {
      if (q.z > 117 && q.y > 3) return 2;
      if (q.z > 99 && q.z < 107) return 1;
      return 0;
    },
    // room 4
    inHall: (q) => Math.hypot(q.x, q.z - OC) < GR1 && q.y > -1,
    nearStation(q) {
      let best = null;
      let bd = 1.9;
      Object.entries(stations).forEach(([key, s]) => {
        const d = Math.hypot(q.x - s.rel.x, q.z - s.rel.z);
        if (d < bd && Math.abs(q.y - s.y) < 1.2) {
          bd = d;
          best = key;
        }
      });
      return best;
    },
    inLift(q) {
      return lifts.some((l) => Math.hypot(q.x - l.x, q.z - l.z) < 1.45 && q.y > -0.5 && q.y < 13);
    },
    nearCard: (q) => Math.hypot(q.x, q.z - OC) < 3.4 && q.y < 3.5,
  };
})();
