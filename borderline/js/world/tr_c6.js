// ♣ 8 · Les Mondes miroirs. Two versions of one world, head to toe on either side of a liquid
// mirror: a glass garden by day above, a crystal garden by night below. Each of you walks one of
// them and sees the other through the floor, upside down, like a reflection. What is open on one
// side is closed on the other: levers, bridges, objects dropped through the mirror, inversions
// that swap the two of you, and the Reflet, a dark double you can only strike from the other side.
//
// Both worlds are real geometry, built twice: the "real" copy where its player walks (with
// colliders), and a mirrored copy (scale y -1, no colliders) hung under the other world's mirror.
const C6M = (() => {
  const O = V3(2100, 0, 8400);
  // U = the upper world (day, glass), L = the lower world (night, crystal), 260 m apart
  const AN = { U: V3(2100, 0, 8400), L: V3(2360, 0, 8400) };
  const MG = 0.6; // the mirror lies this far under the floors
  const MY = -2 * MG; // reflection: local y -> MY - y
  const other = (w) => (w === 'U' ? 'L' : 'U');
  const worldOf = (p) => (Math.abs(p.x - AN.L.x) < Math.abs(p.x - AN.U.x) ? 'L' : 'U');
  const rel = (p, out = V3()) => {
    const a = AN[worldOf(p)];
    return out.set(p.x - a.x, p.y - a.y, p.z - a.z);
  };
  const P = (w, x, y, z, out = V3()) => out.set(AN[w].x + x, AN[w].y + y, AN[w].z + z);
  // where a thing of world w at local (x, y, z) shows for someone standing in world me
  const view = (w, me, x, y, z, out = V3()) => (w === me ? P(me, x, y, z, out) : P(me, x, MY - y, z, out));

  const root = new THREE.Group();
  root.visible = false;
  R.scene.add(root);

  // ---------- layout (local coordinates, the same in both worlds) ----------
  const HW = 3.5;
  const HALL = { z: 116, R: 15, rail: 14.2 };
  const WELL = { x: 0, z: 116, r: 2.3, throwR: 3.4 };
  const ARENA = { z: 287, R: 18, rail: 17.2, fight: 15.5, move: 14.5 };
  const ZONES = { A: [-16, 92], B: [84, 162], C: [150, 252], D: [236, 312] };
  const ZK = Object.keys(ZONES);
  const zoneOfZ = (z) => (z < 88 ? 'A' : z < 158 ? 'B' : z < 244 ? 'C' : 'D');
  const FLOORS = [
    ['A', -HW, HW, -12, 12],
    ['A', -HW, HW, 20, 32],
    ['A', -HW, HW, 40, 50],
    ['A', -2.5, 2.5, 54, 58],
    ['A', -HW, HW, 62, 72],
    ['A', -HW, HW, 84, 92],
    ['B', -HW, HW, 92, 101.45],
    ['B', -HW, HW, 130.55, 158],
    ['C', -HW, HW, 158, 176],
    ['C', -HW, HW, 186, 215],
    ['C', -HW, HW, 218, 244],
    ['D', -HW, HW, 244, 269.8],
  ];
  // id: [world, zone, z0, z1, half width]
  const BRIDGES = {
    b1U: ['U', 'A', 12, 20, 1.3],
    b1L: ['L', 'A', 12, 20, 1.3],
    b2U: ['U', 'A', 32, 40, 1.3],
    b2L: ['L', 'A', 32, 40, 1.3],
    b3aU: ['U', 'A', 50, 54, 1.3],
    b3aL: ['L', 'A', 50, 54, 1.3],
    b3bU: ['U', 'A', 58, 62, 1.3],
    b3bL: ['L', 'A', 58, 62, 1.3],
    b4U: ['U', 'A', 72, 84, 1.5],
    b4L: ['L', 'A', 72, 84, 1.5],
    g1L: ['L', 'C', 176, 186, 1.3],
  };
  // id: [world, zone, x, z, kind]
  const LEVERS = {
    l1U: ['U', 'A', 2.6, 9, 'c1'],
    l1L: ['L', 'A', 2.6, 23, 'c1'],
    l2Un: ['U', 'A', -2.6, 29, 'c2'],
    l2Uf: ['U', 'A', -2.6, 43, 'c2'],
    l2Ln: ['L', 'A', -2.6, 29, 'c2'],
    l2Lf: ['L', 'A', -2.6, 43, 'c2'],
    l3Ua: ['U', 'A', 2.6, 47, 'c3'],
    l3Ui: ['U', 'A', 2.0, 56, 'c3'],
    l3Ub: ['U', 'A', 2.6, 65, 'c3'],
    l3La: ['L', 'A', 2.6, 47, 'c3'],
    l3Li: ['L', 'A', 2.0, 56, 'c3'],
    l3Lb: ['L', 'A', 2.6, 65, 'c3'],
  };
  const MARK4 = [0, 69.6]; // the two start marks of the bridge of reflections
  const S2 = {
    cube0: [-9, 0, 108],
    key0: [9, 1.0, 109],
    weight0: [0, 0, 137.5],
    slot: { l: [-3, 1.0, 127.2], r: [3, 1.0, 127.2] }, // U: the two locks of the door of day
    cagePlate: [6, 0, 105.2], // L: the cube opens the cage
    cage: [9, 109], // L
    bal: [-8.5, 0, 123], // U: the scales of day open the door of night
    doorZ: 132.6,
  };
  const INV = [168, 232]; // inversion circles, x 0, both worlds
  const INV_R = 1.8;
  const HOLD = [2.5, 172.5]; // U: hold plate, the bridge of night lives while someone stands on it
  const HOLD2 = [2.5, 190.2]; // U: its twin on the far side (whoever went first can still hold it)
  const RING = { pos: [0, 6.6, 181], land: [0, 0, 189.5] }; // U: grapple ring over the gap
  const TWIN = [
    { U: [-2.5, 0, 193], L: [2.5, 0, 193], win: 5, gate: 197.5 },
    { U: [2.5, 1.1, 205], L: [-2.5, 1.1, 205], win: 3, gate: 211 },
    { U: [-2.5, 0, 221], L: [2.5, 0, 221], win: 1.4, gate: 225 },
  ];
  const ARENA_GATE = 268.6;
  const LIDS = [];

  let built = false;
  const M = {};
  const T = {};
  const tmp = V3();
  const tmp2 = V3();
  const tmp3 = V3();
  const rng = (seed) => {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };

  // ---------- zone groups: G[world][zone] = { real, mir } ----------
  const G = { U: {}, L: {} };
  ZK.forEach((k) =>
    ['U', 'L'].forEach((w) => {
      const real = new THREE.Group();
      real.position.copy(AN[w]);
      const mir = new THREE.Group();
      mir.position.copy(AN[other(w)]);
      mir.position.y += MY;
      mir.scale.set(1, -1, 1);
      real.visible = mir.visible = false;
      root.add(real, mir);
      G[w][k] = { real, mir };
    }),
  );
  // what each client draws on its own (items, the Reflet, telegraphs, the partner's reflection…)
  const dynG = new THREE.Group();
  root.add(dynG);

  // ---------- geometry helpers ----------
  const mergeGeos = (list) => {
    const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
    const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
    const out = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach((nm) => {
      const size = nm === 'uv' ? 2 : 3;
      const arr = new Float32Array(n * size);
      let o = 0;
      parts.forEach((g) => {
        const a = g.attributes[nm];
        if (a) arr.set(a.array, o);
        o += g.attributes.position.count * size;
      });
      out.setAttribute(nm, new THREE.BufferAttribute(arr, size));
    });
    out.computeBoundingSphere();
    return out;
  };
  const planarUV = (g, k = 1 / 3) => {
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * k, p.getZ(i) * k);
    uv.needsUpdate = true;
    return g;
  };
  const heartPts = (k, n = 64, z = 0) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = Heart.curve((i / n) * Math.PI * 2);
      pts.push(V3((x / 16) * k, (y / 16) * k, z));
    }
    return pts;
  };
  const heartShape = (k) => {
    const s = new THREE.Shape();
    heartPts(k, 72).forEach((p, i) => (i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y)));
    s.closePath();
    return s;
  };
  const heartGeo = (k, depth) =>
    new THREE.ExtrudeGeometry(heartShape(k), { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: k * 0.06, bevelSegments: 2, curveSegments: 6 }).translate(0, -k * 0.55, -depth / 2);

  // static pieces merge per world, zone and material (one mesh in the real copy, one in the mirror)
  const buckets = new Map();
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const s4 = V3();
  const stat = (w, zone, mat, geo, x, y, z, ry = 0, rx = 0, rz = 0, sc = null, uvXZ = false) => {
    const g = geo.clone();
    e4.set(rx, ry, rz);
    q4.setFromEuler(e4);
    if (sc) s4.copy(sc);
    else s4.set(1, 1, 1);
    m4.compose(tmp.set(x, y, z), q4, s4);
    g.applyMatrix4(m4);
    if (uvXZ) planarUV(g);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = w + zone + mat.uuid;
    if (!buckets.has(key)) buckets.set(key, { w, zone, mat, geos: [] });
    buckets.get(key).geos.push(g);
  };
  const flush = () => {
    buckets.forEach(({ w, zone, mat, geos }) => {
      const geo = mergeGeos(geos);
      const a = new THREE.Mesh(geo, mat);
      const b = new THREE.Mesh(geo, mat);
      G[w][zone].real.add(a);
      G[w][zone].mir.add(b);
    });
    buckets.clear();
  };
  const both = (fn) => ['U', 'L'].forEach(fn);
  const col = (w, x, y, z, sx, sy, sz, opt) => Phys.box(AN[w].x + x, AN[w].y + y, AN[w].z + z, sx, sy, sz, opt);
  // a dynamic object present in world w: one copy where it is, one under the other world's mirror
  const dual = (w, zone, make) => {
    const a = make(false);
    const b = make(true);
    G[w][zone].real.add(a);
    G[w][zone].mir.add(b);
    return [a, b];
  };
  const boxG = new Map();
  const box = (sx, sy, sz) => {
    const k = sx + ',' + sy + ',' + sz;
    if (!boxG.has(k)) boxG.set(k, new THREE.BoxGeometry(sx, sy, sz));
    return boxG.get(k);
  };

  // ---------- textures (drawn at 1080 px or more) ----------
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
  const makeTextures = () => {
    // a frosted glass tile in a gilded joint, a heart etched in the middle
    T.tileU = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(214,240,236,0.16)';
      g.fillRect(0, 0, w, h);
      const r = rng(5);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `rgba(255,255,255,${0.05 * r()})`;
        g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      }
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.46, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.16)');
      gr.addColorStop(0.56, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.42)';
      g.lineWidth = 1.6;
      heartPath(g, 128, 120, 2.6);
      g.stroke();
      g.strokeStyle = 'rgba(255,214,228,0.30)';
      g.lineWidth = 1;
      heartPath(g, 128, 120, 3.4);
      g.stroke();
      // little etched leaves in the corners
      [[22, 22], [234, 22], [22, 234], [234, 234]].forEach(([x, y]) => {
        g.beginPath();
        g.ellipse(x + (x < 128 ? 10 : -10), y + (y < 128 ? 10 : -10), 9, 4, Math.PI / 4 * (x < 128 === y < 128 ? 1 : -1), 0, Math.PI * 2);
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.stroke();
      });
      g.strokeStyle = 'rgba(214,170,108,0.95)';
      g.lineWidth = 4;
      g.strokeRect(2, 2, w - 4, h - 4);
      g.strokeStyle = 'rgba(255,255,255,0.32)';
      g.lineWidth = 1;
      g.strokeRect(7, 7, w - 14, h - 14);
    });
    // a crystal tile: facets, a violet joint, a pink heart
    T.tileL = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(46,30,104,0.30)';
      g.fillRect(0, 0, w, h);
      const r = rng(11);
      const pts = [];
      for (let j = 0; j <= 4; j++)
        for (let i = 0; i <= 4; i++) {
          const ed = i === 0 || j === 0 || i === 4 || j === 4;
          pts.push([i * 64 + (ed ? 0 : (r() - 0.5) * 30), j * 64 + (ed ? 0 : (r() - 0.5) * 30)]);
        }
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          const a = pts[j * 5 + i];
          const b = pts[j * 5 + i + 1];
          const c = pts[(j + 1) * 5 + i + 1];
          const d = pts[(j + 1) * 5 + i];
          [[a, b, c], [a, c, d]].forEach((tri, k) => {
            g.beginPath();
            g.moveTo(...tri[0]);
            g.lineTo(...tri[1]);
            g.lineTo(...tri[2]);
            g.closePath();
            const v = r();
            g.fillStyle = v > 0.5 ? `rgba(150,120,255,${0.06 + v * 0.1})` : `rgba(10,4,30,${0.1 + v * 0.15})`;
            g.fill();
            g.strokeStyle = `rgba(178,160,255,${0.14 + r() * 0.16})`;
            g.lineWidth = 1;
            g.stroke();
            void k;
          });
        }
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(200,230,255,${0.3 + r() * 0.5})`;
        const x = r() * w;
        const y = r() * h;
        g.fillRect(x, y, 1.5, 1.5);
      }
      g.strokeStyle = 'rgba(255,140,200,0.55)';
      g.lineWidth = 1.8;
      heartPath(g, 128, 122, 2.4);
      g.stroke();
      g.strokeStyle = 'rgba(150,118,250,0.95)';
      g.lineWidth = 4;
      g.strokeRect(2, 2, w - 4, h - 4);
      g.strokeStyle = 'rgba(200,190,255,0.3)';
      g.lineWidth = 1;
      g.strokeRect(7, 7, w - 14, h - 14);
    });
    // glass pane with a lattice of hearts (gates, doors, cage)
    T.pane = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(235,250,255,0.16)';
      g.fillRect(0, 0, w, h);
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          g.strokeStyle = 'rgba(255,255,255,0.55)';
          g.lineWidth = 2;
          heartPath(g, 32 + i * 64, 30 + j * 64, 1.25);
          g.stroke();
        }
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 6;
      g.strokeRect(3, 3, w - 6, h - 6);
    });
    T.soft = LvKit.tex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.6)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.clearRect(0, 0, w, h);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    T.heart = LvKit.tex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(64, 60, 4, 64, 60, 60);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0.2)');
      g.fillStyle = gr;
      heartPath(g, 64, 58, 3.4);
      g.fill();
    });
    // the rune of an inversion circle: two hearts head to toe in a ring
    T.rune = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(128, 128, 118, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 2;
      g.beginPath();
      g.arc(128, 128, 104, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        g.beginPath();
        g.moveTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
        g.lineTo(128 + Math.cos(a) * (i % 2 ? 96 : 90), 128 + Math.sin(a) * (i % 2 ? 96 : 90));
        g.stroke();
      }
      g.lineWidth = 4;
      heartPath(g, 128, 92, 3.1);
      g.stroke();
      g.save();
      g.translate(128, 164);
      g.rotate(Math.PI);
      heartPath(g, 0, 0, 3.1);
      g.restore();
      g.stroke();
      g.beginPath();
      g.moveTo(40, 128);
      g.lineTo(216, 128);
      g.stroke();
    });
    // pressure plate: a ring, a heart
    T.plate = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.arc(128, 128, 120, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 8;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      heartPath(g, 128, 118, 3.2);
      g.fill();
    });
    T.crack = LvKit.tex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = rng(23);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 14; i++) {
        let x = 128;
        let y = 128;
        let a = (i / 14) * Math.PI * 2 + r() * 0.3;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          a += (r() - 0.5) * 0.7;
          x += Math.cos(a) * 18;
          y += Math.sin(a) * 18;
          g.lineTo(x, y);
          g.lineWidth = 3 - k * 0.4;
        }
        g.stroke();
      }
      g.lineWidth = 2;
      g.beginPath();
      g.arc(128, 128, 40, 0, Math.PI * 2);
      g.stroke();
    });
    // the icons only the one who sees can read (key / cube), drawn as shapes
    T.iconKey = LvKit.tex(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 7;
      g.beginPath();
      g.arc(40, 64, 18, 0, Math.PI * 2);
      g.moveTo(58, 64);
      g.lineTo(112, 64);
      g.moveTo(96, 64);
      g.lineTo(96, 84);
      g.moveTo(108, 64);
      g.lineTo(108, 80);
      g.stroke();
    });
    T.iconCube = LvKit.tex(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 6;
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(64, 18);
      g.lineTo(106, 40);
      g.lineTo(106, 88);
      g.lineTo(64, 110);
      g.lineTo(22, 88);
      g.lineTo(22, 40);
      g.closePath();
      g.moveTo(22, 40);
      g.lineTo(64, 62);
      g.lineTo(106, 40);
      g.moveTo(64, 62);
      g.lineTo(64, 110);
      g.stroke();
    });
    T.sign = (title, sub, col) =>
      LvKit.tex(512, 160, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(20,12,34,0.55)';
        g.fillRect(8, 8, w - 16, h - 16);
        g.strokeStyle = col;
        g.lineWidth = 4;
        g.strokeRect(10, 10, w - 20, h - 20);
        g.fillStyle = '#fff4f8';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = 'italic 54px Georgia';
        g.fillText(title, w / 2, 66);
        g.fillStyle = col;
        g.font = '26px Georgia';
        g.fillText(sub, w / 2, 118);
      });
  };

  // ---------- materials ----------
  const CU = { uCT: { value: 0 } };
  // caustic light, added to the emissive of a material (world xz, animated)
  const caustic = (mat, rgb, k) => {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uCT = CU.uCT;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vC6W;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvC6W = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vC6W;
          uniform float uCT;
          float c6cau(vec2 p, float t) {
            vec2 q = p * 0.42;
            float c = 0.0;
            for (int i = 0; i < 3; i++) {
              float fi = float(i);
              q += vec2(sin(q.y * 1.3 + t * 0.7 + fi * 1.7), cos(q.x * 1.1 - t * 0.6 + fi * 2.3)) * 0.55;
              c += abs(sin(q.x * 1.7 + q.y * 1.3));
            }
            return pow(clamp(1.0 - c / 3.0, 0.0, 1.0), 4.0);
          }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(${rgb.map((v) => v.toFixed(3)).join(',')}) * c6cau(vC6W.xz, uCT) * ${k.toFixed(3)};`,
        );
    };
    mat.customProgramCacheKey = () => 'c6cau' + rgb.join() + k;
    return mat;
  };
  const makeMats = () => {
    M.floor = {
      U: caustic(new THREE.MeshStandardMaterial({ map: T.tileU, transparent: true, roughness: 0.4, metalness: 0, color: '#ffffff' }), [0.55, 0.62, 0.6], 0.55),
      L: caustic(new THREE.MeshStandardMaterial({ map: T.tileL, transparent: true, roughness: 0.42, metalness: 0, color: '#ffffff', emissive: '#100828' }), [0.42, 0.28, 0.75], 0.6),
    };
    M.trim = {
      U: new THREE.MeshStandardMaterial({ color: '#d9b67e', roughness: 0.5, metalness: 0 }),
      L: new THREE.MeshStandardMaterial({ color: '#5a48a6', roughness: 0.45, metalness: 0, emissive: '#1c1048' }),
    };
    M.stone = {
      U: Tex.mat('marble', { color: '#e2c8d6', scale: 3, rough: 0.55 }),
      L: Tex.mat('marble', { color: '#3a3058', scale: 3, rough: 0.5 }),
    };
    M.glass = {
      U: new THREE.MeshStandardMaterial({ color: '#bfe6f2', roughness: 0.38, metalness: 0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
      L: new THREE.MeshStandardMaterial({ color: '#8f78ff', roughness: 0.38, metalness: 0, transparent: true, opacity: 0.3, emissive: '#1a0c44', side: THREE.DoubleSide, depthWrite: false }),
    };
    M.paneU = new THREE.MeshStandardMaterial({ map: T.pane, color: '#f2fdff', roughness: 0.38, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    M.paneL = new THREE.MeshStandardMaterial({ map: T.pane, color: '#b8a6ff', emissive: '#22104a', roughness: 0.38, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    M.petal = new THREE.MeshStandardMaterial({ color: '#ffb3cf', roughness: 0.38, transparent: true, opacity: 0.78, emissive: '#3a0c1e', side: THREE.DoubleSide, flatShading: true });
    M.petal2 = new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.38, transparent: true, opacity: 0.78, emissive: '#0e2236', side: THREE.DoubleSide, flatShading: true });
    M.stem = new THREE.MeshStandardMaterial({ color: '#8fd6b6', roughness: 0.4, transparent: true, opacity: 0.65 });
    M.leaf = new THREE.MeshStandardMaterial({ color: '#74c9a2', roughness: 0.4, transparent: true, opacity: 0.7, side: THREE.DoubleSide, flatShading: true });
    M.crystal = new THREE.MeshStandardMaterial({ color: '#8fd2ff', emissive: '#244c96', emissiveIntensity: 0.9, roughness: 0.38, transparent: true, opacity: 0.86, flatShading: true });
    M.crystalP = new THREE.MeshStandardMaterial({ color: '#ff9fd0', emissive: '#6a1c4a', emissiveIntensity: 0.9, roughness: 0.38, transparent: true, opacity: 0.86, flatShading: true });
    M.crystalV = new THREE.MeshStandardMaterial({ color: '#b49cff', emissive: '#3a1c86', emissiveIntensity: 0.9, roughness: 0.38, transparent: true, opacity: 0.86, flatShading: true });
    M.glowPink = LvKit.glow('#ff5f8a', 1.5);
    M.glowGold = LvKit.glow('#ffcf8a', 1.3);
    M.glowCyan = LvKit.glow('#6cc8ff', 1.4);
    M.glowViolet = LvKit.glow('#b07cff', 1.4);
    M.lampU = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0d8').multiplyScalar(0.85) });
    M.lampL = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe4ff').multiplyScalar(0.85) });
  };

  // ---------- the mirror, the sky ----------
  const LIQ = {
    uTime: { value: 0 },
    uDay: { value: 1 },
    uTrouble: { value: 0 },
    uCalm: { value: 0 },
    uRip: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, 0, -99, 0)) },
  };
  let ripN = 0;
  const liquids = {};
  const makeLiquid = (w) => {
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]);
    Object.assign(u, LIQ);
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      transparent: true,
      depthWrite: false,
      fog: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uDay;
        uniform float uTrouble;
        uniform float uCalm;
        uniform vec4 uRip[6];
        varying vec3 vW;
        #include <fog_pars_fragment>
        float cau(vec2 p, float t) {
          vec2 q = p * 0.5;
          float c = 0.0;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            q += vec2(sin(q.y * 1.3 + t * 0.8 + fi * 1.7), cos(q.x * 1.1 - t * 0.7 + fi * 2.3)) * 0.55;
            c += abs(sin(q.x * 1.7 + q.y * 1.3));
          }
          return pow(clamp(1.0 - c / 3.0, 0.0, 1.0), 4.0);
        }
        void main() {
          vec2 p = vW.xz;
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - abs(V.y), 4.0);
          float c = cau(p, uTime) * (1.0 - uCalm * 0.7);
          float r = 0.0;
          for (int i = 0; i < 6; i++) {
            vec4 R = uRip[i];
            float age = uTime - R.z;
            if (age > 0.0 && age < 3.0) {
              float d = length(p - R.xy);
              float front = age * 3.4;
              r += sin(d * 5.0 - age * 9.0) * exp(-abs(d - front) * 0.9) * exp(-age * 1.1) * R.w;
            }
          }
          vec3 tint = mix(vec3(0.20, 0.12, 0.42), vec3(0.50, 0.74, 0.80), uDay);
          vec3 sheen = mix(vec3(0.55, 0.40, 0.95), vec3(0.90, 0.96, 1.0), uDay);
          vec3 col = tint * 0.5 + sheen * (c * 0.32 + max(r, 0.0) * 0.35);
          float a = mix(0.3, 0.14, uDay) + c * 0.16 + abs(r) * 0.22 + fres * 0.25;
          // troubled: milky, swirling, the other world fades away
          float n = sin(p.x * 0.7 + uTime * 1.2 + sin(p.y * 0.5 + uTime * 0.8) * 2.0) * 0.5 + 0.5;
          vec3 milk = mix(vec3(0.42, 0.36, 0.52), vec3(0.70, 0.66, 0.78), n) * mix(0.6, 1.0, uDay);
          col = mix(col, milk, uTrouble);
          a = mix(a, 0.94, uTrouble);
          // reunited: a calm silver mirror
          col = mix(col, mix(vec3(0.46, 0.36, 0.52), vec3(0.64, 0.46, 0.52), uDay) * (0.7 + c * 0.4), uCalm);
          a = mix(a, 0.78, uCalm);
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(150, 380, 1, 1).rotateX(-Math.PI / 2), mat);
    m.position.copy(AN[w]).add(V3(0, -MG, 148));
    m.renderOrder = 2;
    m.frustumCulled = false;
    dynG.add(m);
    liquids[w] = m;
  };
  const ripple = (x, z, str = 1) => {
    const r = LIQ.uRip.value[ripN++ % 6];
    r.set(x, z, LIQ.uTime.value, str);
  };

  const SKY = { uDay: { value: 1 }, uTime: { value: 0 }, uCalm: { value: 0 } };
  let sky = null;
  const makeSky = () => {
    sky = new THREE.Mesh(
      new THREE.SphereGeometry(390, 40, 20),
      new THREE.ShaderMaterial({
        uniforms: SKY,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec3 vD;
          void main() {
            vD = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uDay;
          uniform float uTime;
          uniform float uCalm;
          varying vec3 vD;
          float h3(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          vec3 daySky(vec3 d, float h) {
            vec3 c = mix(vec3(0.60, 0.48, 0.62), vec3(0.20, 0.34, 0.66), smoothstep(0.0, 0.42, h));
            // the sun, low and soft
            vec3 sd = normalize(vec3(-0.4, 0.35, 0.85));
            float s = max(dot(d, vec3(sd.x, abs(sd.y) * sign(d.y), sd.z)), 0.0);
            c += vec3(0.10, 0.07, 0.04) * pow(s, 24.0) + vec3(0.08, 0.07, 0.05) * pow(s, 700.0);
            c = min(c, vec3(0.86));
            // thin streaks of cloud
            float cl = sin(d.x * 9.0 + uTime * 0.02) * sin(d.z * 7.0 - uTime * 0.015) * sin((d.x + d.z) * 13.0);
            c = mix(c, vec3(0.80, 0.72, 0.80), smoothstep(0.35, 0.9, cl) * smoothstep(0.05, 0.3, h) * 0.3);
            return c;
          }
          vec3 nightSky(vec3 d, float h) {
            vec3 c = mix(vec3(0.12, 0.07, 0.22), vec3(0.02, 0.015, 0.06), smoothstep(0.0, 0.6, h));
            vec3 cc = floor(d * 240.0);
            float s = h3(cc);
            float tw = 0.55 + 0.45 * sin(uTime * (1.0 + s * 3.0) + s * 40.0);
            c += vec3(0.9, 0.86, 1.0) * step(0.9955, s) * tw * smoothstep(0.04, 0.25, h) * 0.8;
            float band = exp(-pow((d.x * 0.7 + h - 0.5) * 3.2, 2.0));
            c += vec3(0.30, 0.12, 0.42) * band * 0.22 * smoothstep(0.0, 0.3, h);
            // a heart-shaped moon
            vec3 md = normalize(vec3(0.5, 0.42, 0.75));
            vec3 mdd = vec3(md.x, abs(md.y) * sign(d.y), md.z);
            vec3 ax = normalize(cross(mdd, vec3(0.0, 1.0, 0.0)));
            vec3 ay = cross(ax, mdd);
            vec2 q = vec2(dot(d, ax), dot(d, ay)) / 0.075;
            if (dot(d, mdd) > 0.0) {
              q.y = q.y * sign(d.y) - 0.1;
              float x = q.x;
              float y = q.y;
              float f = pow(x * x + y * y - 1.0, 3.0) - x * x * y * y * y;
              c = mix(c, vec3(0.86, 0.80, 0.92), smoothstep(0.02, -0.02, f));
              c += vec3(0.25, 0.14, 0.30) * exp(-max(length(q) - 1.0, 0.0) * 1.6) * 0.5;
            }
            return c;
          }
          void main() {
            vec3 d = normalize(vD);
            float h = abs(d.y);
            float up = step(0.0, d.y);
            // your own sky above, the other world's sky below the mirror
            float isDay = mix(1.0 - uDay, uDay, up);
            isDay = mix(isDay, uDay, uCalm);
            vec3 c = mix(nightSky(d, h), daySky(d, h), isDay);
            vec3 under = c * mix(vec3(0.42, 0.34, 0.62), vec3(0.62, 0.72, 0.80), uDay);
            c = mix(under, c, max(up, uCalm));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    sky.renderOrder = -9;
    sky.frustumCulled = false;
    dynG.add(sky);
  };

  // ---------- builders ----------
  const FT = 0.3; // floor thickness
  const floorRect = (w, zone, x0, x1, z0, z1) => {
    const sx = x1 - x0;
    const sz = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    stat(w, zone, M.floor[w], box(sx, FT, sz), cx, -FT / 2, cz, 0, 0, 0, null, true);
    // a gilded / violet frame around the slab
    stat(w, zone, M.trim[w], box(0.14, FT + 0.06, sz + 0.28), x0 - 0.07, -FT / 2 + 0.03, cz);
    stat(w, zone, M.trim[w], box(0.14, FT + 0.06, sz + 0.28), x1 + 0.07, -FT / 2 + 0.03, cz);
    stat(w, zone, M.trim[w], box(sx, FT + 0.06, 0.14), cx, -FT / 2 + 0.03, z0 - 0.07);
    stat(w, zone, M.trim[w], box(sx, FT + 0.06, 0.14), cx, -FT / 2 + 0.03, z1 + 0.07);
    col(w, cx, -FT / 2, cz, sx, FT, sz);
  };
  // a round floor; its collider is a union of boxes that covers the disc inside the rail
  const discFloor = (w, zone, cz, R, rail) => {
    stat(w, zone, M.floor[w], new THREE.CylinderGeometry(R, R, FT, 72), 0, -FT / 2, cz, 0, 0, 0, null, true);
    stat(w, zone, M.trim[w], new THREE.CylinderGeometry(R + 0.14, R + 0.14, FT + 0.06, 72, 1, true), 0, -FT / 2 + 0.03, cz);
    const k = rail / 13.5;
    [
      [10.6, 10.6],
      [7, 14],
      [14, 7],
      [9, 12.2],
      [12.2, 9],
    ].forEach(([hx, hz]) => col(w, 0, -FT / 2, cz, 2 * hx * k, FT, 2 * hz * k));
  };
  // a ring of glass-capped stone posts, axis-aligned colliders, gaps too narrow to pass
  const ringRail = (w, zone, cz, R, skip) => {
    const n = Math.round((Math.PI * 2 * R) / 1.02);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.sin(a) * R;
      const z = cz + Math.cos(a) * R;
      if (skip(x, z)) continue;
      stat(w, zone, M.stone[w], box(0.7, 1.05, 0.7), x, 0.525, z);
      stat(w, zone, M.trim[w], box(0.8, 0.08, 0.8), x, 1.09, z);
      if (i % 3 === 0) stat(w, zone, w === 'U' ? M.glowGold : M.glowViolet, new THREE.OctahedronGeometry(0.16, 0), x, 1.32, z);
      col(w, x, 0.55, z, 0.7, 1.1, 0.7);
    }
  };
  // a straight glass balustrade along x = const, from z0 to z1
  const sideRail = (w, zone, x, z0, z1) => {
    const len = z1 - z0;
    const cz = (z0 + z1) / 2;
    stat(w, zone, M.glass[w], box(0.06, 0.9, len), x, 0.5, cz);
    stat(w, zone, M.trim[w], box(0.14, 0.08, len), x, 1.0, cz);
    for (let z = z0; z <= z1 + 0.01; z += 2.5) stat(w, zone, M.trim[w], box(0.16, 1.0, 0.16), x, 0.5, Math.min(z, z1));
    col(w, x, 0.55, cz, 0.3, 1.1, len);
  };
  const plaque = (w, zone, title, sub, x, y, z, ry, col2) => {
    const m = () => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.125), new THREE.MeshBasicMaterial({ map: T.sign(title, sub, col2), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      p.material.color.setScalar(0.8);
      p.position.set(x, y, z);
      p.rotation.y = ry;
      return p;
    };
    dual(w, zone, m);
  };
  // a heart-shaped arch (a tube along the heart curve, standing on the walkway)
  const heartArch = (w, zone, z, k, mat, glow) => {
    // the sides cross the floor just outside the walkway (k >= 5); the legs stop at the mirror
    // (anything under it would show up in the other world, poking out of its floor)
    const off = k * 0.088;
    const yAt = (t) => (Heart.curve(t)[1] / 16) * k + off;
    let t1 = 0.5;
    while (t1 < Math.PI && yAt(t1) > -MG + 0.05) t1 += 0.01;
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const t = -t1 + (i / 80) * 2 * t1;
      const [hx] = Heart.curve(t);
      pts.push(V3((hx / 16) * k, yAt(t), 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false);
    const g = new THREE.TubeGeometry(curve, 160, 0.16, 8, false);
    stat(w, zone, mat, g, 0, 0, z);
    if (glow) {
      const g2 = new THREE.TubeGeometry(curve, 160, 0.05, 6, false);
      stat(w, zone, glow, g2, 0, 0, z - 0.17);
    }
  };

  // ---------- decor ----------
  const flowerGeo = () => {
    const petals = [];
    for (let k = 0; k < 6; k++) petals.push(new THREE.ConeGeometry(0.22, 0.7, 4, 1).translate(0, 0.35, 0).rotateX(0.9).rotateY((k / 6) * Math.PI * 2));
    return mergeGeos(petals);
  };
  // nothing grows through the round floors (the hall, the arena)
  const inDisc = (x, z, m = 1.2) => Math.hypot(x, z - HALL.z) < HALL.R + m || Math.hypot(x, z - ARENA.z) < ARENA.R + m;
  const decorU = (zone, z0, z1, seed) => {
    const r = rng(seed);
    const w = 'U';
    const fl = flowerGeo();
    const stemG = new THREE.CylinderGeometry(0.05, 0.08, 1, 6).translate(0, 0.5, 0);
    const leafG = new THREE.PlaneGeometry(0.5, 0.22).translate(0.25, 0, 0);
    for (let z = z0; z < z1; z += 2.2 + r() * 2.5) {
      [-1, 1].forEach((sd) => {
        if (r() < 0.25) return;
        const x = sd * (4.6 + r() * 5.5);
        const h = 1.4 + r() * 3.2;
        if (inDisc(x, z)) return;
        const y0 = -MG;
        stat(w, zone, M.stem, stemG, x, y0, z, 0, 0, 0, V3(1, h - y0, 1));
        stat(w, zone, r() < 0.6 ? M.petal : M.petal2, fl, x, h, z, r() * 6, 0, 0, V3(1 + r() * 0.5, 1 + r() * 0.5, 1 + r() * 0.5));
        stat(w, zone, M.glowGold, new THREE.SphereGeometry(0.09, 8, 6), x, h + 0.06, z);
        for (let k = 0; k < 2; k++) stat(w, zone, M.leaf, leafG, x, y0 + (h - y0) * (0.3 + k * 0.25), z, r() * 6, 0, -0.5);
      });
    }
    // glass hedges in the mirror, far away, and glass trees
    for (let i = 0; i < (z1 - z0) / 7; i++) {
      const sd = r() < 0.5 ? -1 : 1;
      const x = sd * (13 + r() * 22);
      const z = z0 + r() * (z1 - z0);
      const s = 1.5 + r() * 2.5;
      if (inDisc(x, z, 3 + s)) continue;
      stat(w, zone, M.leaf, new THREE.IcosahedronGeometry(1, 0), x, -MG + s, z, r() * 6, 0, 0, V3(s * 1.3, s, s * 1.3));
      if (r() < 0.4) {
        stat(w, zone, M.stem, new THREE.CylinderGeometry(0.18, 0.3, 1, 7).translate(0, 0.5, 0), x, -MG, z, 0, 0, 0, V3(1, s * 3, 1));
        stat(w, zone, M.petal, new THREE.IcosahedronGeometry(1, 1), x, -MG + s * 3 + s * 0.6, z, r() * 6, 0, 0, V3(s, s * 0.8, s));
      }
    }
  };
  const decorL = (zone, z0, z1, seed) => {
    const r = rng(seed);
    const w = 'L';
    const cr = new THREE.OctahedronGeometry(1, 0).scale(0.35, 1.6, 0.35).translate(0, 1.75, 0);
    for (let z = z0; z < z1; z += 2 + r() * 2.4) {
      [-1, 1].forEach((sd) => {
        if (r() < 0.25) return;
        const x = sd * (4.6 + r() * 6);
        const n = 2 + Math.floor(r() * 4);
        if (inDisc(x, z, 2)) return;
        const mat = r() < 0.5 ? M.crystal : r() < 0.5 ? M.crystalP : M.crystalV;
        for (let k = 0; k < n; k++) {
          const s = 0.6 + r() * 1.6;
          stat(w, zone, mat, cr, x + (r() - 0.5) * 1.2, -MG, z + (r() - 0.5) * 1.2, r() * 6, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5, V3(s, s, s));
        }
      });
    }
    // great spires far in the night
    for (let i = 0; i < (z1 - z0) / 8; i++) {
      const sd = r() < 0.5 ? -1 : 1;
      const x = sd * (13 + r() * 24);
      const z = z0 + r() * (z1 - z0);
      const s = 2 + r() * 4;
      if (inDisc(x, z, 3 + s)) continue;
      stat(w, zone, r() < 0.5 ? M.crystalV : M.crystal, cr, x, -MG, z, r() * 6, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3, V3(s * 0.8, s, s * 0.8));
    }
  };
  // lamps along the walkways (rising from the mirror, outside the path)
  const lamps = (zone, z0, z1, step) => {
    both((w) => {
      for (let z = z0; z <= z1; z += step)
        [-1, 1].forEach((sd) => {
          const x = sd * 4.05;
          stat(w, zone, M.trim[w], new THREE.CylinderGeometry(0.06, 0.09, 1, 8).translate(0, 0.5, 0), x, -MG, z, 0, 0, 0, V3(1, 2.4 + MG, 1));
          stat(w, zone, w === 'U' ? M.lampU : M.lampL, w === 'U' ? new THREE.SphereGeometry(0.17, 12, 8) : new THREE.OctahedronGeometry(0.2, 0), x, 2.55, z);
          stat(w, zone, M.glass[w], new THREE.SphereGeometry(0.3, 12, 8), x, 2.55, z);
        });
    });
  };

  // ---------- dynamic pieces ----------
  const bridges = {};
  const makeBridge = (id) => {
    const [w, zone, z0, z1, hw] = BRIDGES[id];
    const n = Math.max(2, Math.round(z1 - z0));
    const L = (z1 - z0) / n;
    const mat = M.floor[w].clone();
    mat.opacity = 1;
    mat.onBeforeCompile = M.floor[w].onBeforeCompile;
    mat.customProgramCacheKey = M.floor[w].customProgramCacheKey;
    const edge = (w === 'U' ? M.glowGold : M.glowViolet).clone();
    const geo = planarUV(new THREE.BoxGeometry(hw * 2, 0.22, L * 0.94).translate(0, -0.11, 0));
    const make = () => {
      const g = new THREE.Group();
      const tiles = [];
      for (let i = 0; i < n; i++) {
        const t = new THREE.Mesh(geo, mat);
        t.position.set(0, 0, z0 + L * (i + 0.5));
        const e1 = new THREE.Mesh(box(0.06, 0.06, L * 0.94), edge);
        e1.position.set(-hw, 0.0, 0);
        const e2 = e1.clone();
        e2.position.x = hw;
        t.add(e1, e2);
        g.add(t);
        tiles.push(t);
      }
      g.userData.tiles = tiles;
      return g;
    };
    const pair = dual(w, zone, make);
    const b = col(w, 0, -0.11, (z0 + z1) / 2, hw * 2, 0.22, z1 - z0);
    b.on = false;
    bridges[id] = { id, w, z0, z1, n, pair, b, mat, edge, k: 0, want: 0, warn: 0 };
    pair.forEach((g) => (g.visible = false));
  };
  const levers = {};
  const makeLever = (id) => {
    const [w, zone, x, z] = LEVERS[id];
    const make = () => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const base = new THREE.Mesh(box(0.5, 0.9, 0.5), M.stone[w]);
      base.position.y = 0.45;
      const cap = new THREE.Mesh(box(0.6, 0.08, 0.6), M.trim[w]);
      cap.position.y = 0.92;
      const piv = new THREE.Group();
      piv.position.y = 0.95;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 8).translate(0, 0.4, 0), M.glass[w]);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 6).translate(0, 0.4, 0), w === 'U' ? M.glowGold : M.glowViolet);
      const knob = new THREE.Mesh(heartGeo(0.22, 0.1), M.glowPink);
      knob.position.y = 0.86;
      piv.add(rod, core, knob);
      piv.rotation.x = -0.55;
      g.add(base, cap, piv);
      g.userData.piv = piv;
      return g;
    };
    const pair = dual(w, zone, make);
    col(w, x, 0.45, z, 0.5, 0.9, 0.5);
    levers[id] = { id, w, x, z, kind: LEVERS[id][4], pair, a: -0.55, n: -1, flash: 0 };
  };
  // a glass wall that sinks into the mirror when it opens
  const gates = {};
  const makeGate = (id, w, zone, z, hw = HW + 0.1, h = 3.4) => {
    const make = () => {
      const g = new THREE.Group();
      const pane = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, h, 0.16), w === 'U' ? M.paneU : M.paneL);
      pane.position.set(0, h / 2, 0);
      const top = new THREE.Mesh(box(hw * 2 + 0.3, 0.14, 0.3), M.trim[w]);
      top.position.y = h;
      const p1 = new THREE.Mesh(box(0.3, h + 0.1, 0.3), M.trim[w]);
      p1.position.set(-hw - 0.05, h / 2, 0);
      const p2 = p1.clone();
      p2.position.x = hw + 0.05;
      const hh = new THREE.Mesh(heartGeo(0.5, 0.12), w === 'U' ? M.glowPink : M.glowViolet);
      hh.position.set(0, h * 0.6, 0.1);
      g.add(pane, top, p1, p2, hh);
      g.position.z = z;
      return g;
    };
    const pair = dual(w, zone, make);
    const b = col(w, 0, h / 2, z, hw * 2, h, 0.5);
    gates[id] = { id, w, pair, b, k: 0, want: 0, h };
  };
  // pressure plates / slots / circles: a flat disc with a glyph
  const plates = {};
  const makePlate = (id, w, zone, x, y, z, r, color, tex = T.plate) => {
    const make = () => {
      const g = new THREE.Group();
      g.position.set(x, y + 0.03, z);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(0.7), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 40).rotateX(Math.PI / 2), M.trim[w]);
      // the countdown ring (theta follows the time left)
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(r + 0.12, r + 0.32, 64, 1, 0, Math.PI * 2).rotateX(-Math.PI / 2), ringMat);
      ring.position.y = 0.02;
      ring.visible = false;
      g.add(disc, rim, ring);
      g.userData = { disc, ring };
      return g;
    };
    const pair = dual(w, zone, make);
    plates[id] = { id, w, x, y, z, r, pair, color: new THREE.Color(color), on: 0, frac: -1, lastFrac: -2 };
    return plates[id];
  };
  const setRing = (pl, frac) => {
    if (Math.abs(frac - pl.lastFrac) < 0.004) return;
    pl.lastFrac = frac;
    pl.pair.forEach((g) => {
      const ring = g.userData.ring;
      ring.visible = frac > 0;
      if (frac > 0) {
        ring.geometry.dispose();
        ring.geometry = new THREE.RingGeometry(pl.r + 0.12, pl.r + 0.32, 64, 1, Math.PI / 2, Math.PI * 2 * frac).rotateX(-Math.PI / 2);
      }
    });
  };
  // big countdown numbers above a plate (one canvas, shared)
  let countTex = null;
  let countCtx = null;
  let countShown = null;
  const drawCount = (txt, col) => {
    if (txt === countShown) return;
    countShown = txt;
    const g = countCtx;
    g.clearRect(0, 0, 512, 512);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 300px Georgia';
    g.shadowColor = col;
    g.shadowBlur = 40;
    g.fillStyle = '#fff6fa';
    g.fillText(txt, 256, 270);
    countTex.needsUpdate = true;
  };
  const countSprites = [];
  const makeCount = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    countCtx = c.getContext('2d');
    countTex = new THREE.CanvasTexture(c);
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: countTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
      s.material.color.setScalar(0.85);
      s.scale.setScalar(1.6);
      s.visible = false;
      s.renderOrder = 20;
      dynG.add(s);
      countSprites.push(s);
    }
  };

  // ---------- section 2: the well, the doors, the cage, the items ----------
  const doors = {};
  const makeDoor = (id, w) => {
    const make = () => {
      const g = new THREE.Group();
      g.position.z = S2.doorZ;
      const fr = new THREE.Mesh(box(HW * 2 + 0.6, 0.3, 0.5), M.trim[w]);
      fr.position.y = 3.6;
      const l = new THREE.Mesh(box(0.35, 3.75, 0.5), M.stone[w]);
      l.position.set(-HW - 0.12, 1.85, 0);
      const r2 = l.clone();
      r2.position.x = HW + 0.12;
      const a = new THREE.Mesh(new THREE.BoxGeometry(HW, 3.4, 0.14), w === 'U' ? M.paneU : M.paneL);
      a.position.set(-HW / 2, 1.7, 0);
      const b = a.clone();
      b.position.x = HW / 2;
      const ha = new THREE.Mesh(heartGeo(0.55, 0.1), M.glowPink);
      ha.position.set(HW / 2 - 0.02, 2.0, 0.09);
      ha.scale.x = 0.5;
      const hb = ha.clone();
      hb.position.x = -HW / 2 + 0.02;
      a.add(ha);
      ha.position.set(HW / 2 - 0.27, 0.3, 0.09);
      b.add(hb);
      hb.position.set(-HW / 2 + 0.27, 0.3, 0.09);
      const arch = new THREE.Mesh(heartGeo(0.9, 0.18), w === 'U' ? M.glowGold : M.glowViolet);
      arch.position.set(0, 4.35, 0);
      g.add(fr, l, r2, a, b, arch);
      g.userData = { a, b };
      return g;
    };
    const pair = dual(w, 'B', make);
    const b = col(w, 0, 1.7, S2.doorZ, HW * 2, 3.4, 0.5);
    col(w, -HW - 0.12, 1.85, S2.doorZ, 0.35, 3.75, 0.5);
    col(w, HW + 0.12, 1.85, S2.doorZ, 0.35, 3.75, 0.5);
    doors[id] = { pair, b, k: 0, want: 0 };
  };
  let cage = null;
  const makeCage = () => {
    const [x, z] = S2.cage;
    const make = () => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.0, 16).translate(0, 0.5, 0), M.stone.L);
      const bars = new THREE.Group();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), M.crystalV);
        bar.position.set(Math.sin(a) * 0.66, 1.8, Math.cos(a) * 0.66);
        bars.add(bar);
      }
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 12).translate(0, 2.9, 0), M.crystalV);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 6, 24).rotateX(Math.PI / 2).translate(0, 1.0, 0), M.trim.L);
      bars.add(top);
      g.add(ped, bars, ring);
      g.userData = { bars };
      return g;
    };
    const pair = dual('L', 'B', make);
    col('L', x, 0.5, z, 1.1, 1.0, 1.1);
    const b = col('L', x, 1.8, z, 1.5, 1.6, 1.5);
    cage = { pair, b, k: 0, want: 0 };
  };
  const pedestal = (w, x, z, h = 1.0) => {
    stat(w, 'B', M.stone[w], new THREE.CylinderGeometry(0.42, 0.52, h, 16).translate(0, h / 2, 0), x, 0, z);
    stat(w, 'B', M.trim[w], new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), x, h, z);
    col(w, x, h / 2, z, 0.85, h, 0.85);
  };
  const makeWell = () => {
    both((w) => {
      stat(w, 'B', M.stone[w], new THREE.CylinderGeometry(WELL.r, WELL.r + 0.25, 0.9, 40, 1, true), WELL.x, 0.45, WELL.z);
      stat(w, 'B', M.stone[w], new THREE.CylinderGeometry(WELL.r - 0.3, WELL.r - 0.3, 0.9, 40, 1, true), WELL.x, 0.45, WELL.z);
      stat(w, 'B', M.trim[w], new THREE.TorusGeometry(WELL.r - 0.15, 0.17, 8, 40).rotateX(Math.PI / 2), WELL.x, 0.9, WELL.z);
      // four heart finials around the rim
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        stat(w, 'B', M.glowPink, heartGeo(0.3, 0.08), WELL.x + Math.sin(a) * (WELL.r - 0.15), 1.25, WELL.z + Math.cos(a) * (WELL.r - 0.15), a);
      }
      col(w, WELL.x, 0.45, WELL.z, 4.4, 0.9, 2.8);
      col(w, WELL.x, 0.45, WELL.z, 2.8, 0.9, 4.4);
    });
    // the pool: a disc of moving light (one per world, drawn by both copies)
    const poolMat = new THREE.ShaderMaterial({
      uniforms: { uTime: LIQ.uTime, uDay: LIQ.uDay, uK: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime; uniform float uDay; uniform float uK; varying vec2 vU;
        void main(){
          vec2 p = vU * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float sw = sin(a * 3.0 + r * 9.0 - uTime * 2.2) * 0.5 + 0.5;
          vec3 c = mix(vec3(0.45, 0.30, 0.85), vec3(0.62, 0.86, 0.92), sw);
          c = mix(c, vec3(1.0, 0.55, 0.75), uK * (1.0 - r));
          float al = (0.55 + sw * 0.3) * smoothstep(1.0, 0.85, r);
          gl_FragColor = vec4(c * (0.75 + uK * 0.25), al);
        }`,
    });
    T.poolMat = poolMat;
    both((w) =>
      dual(w, 'B', () => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(WELL.r - 0.3, 40).rotateX(-Math.PI / 2), poolMat);
        m.position.set(WELL.x, 0.7, WELL.z);
        return m;
      }),
    );
  };
  // the three objects; each client draws one mesh per item where it shows for it
  const items = {};
  const makeItems = () => {
    const cube = new THREE.Group();
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.38, transparent: true, opacity: 0.55 }));
    const cf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(0.9), wireframe: true, toneMapped: false }));
    const ch = new THREE.Mesh(heartGeo(0.18, 0.1), M.glowPink);
    cube.add(cb, cf, ch);
    cube.userData.h = 0.25;
    const key = new THREE.Group();
    const bow = new THREE.Mesh(heartGeo(0.22, 0.07), M.crystalP);
    bow.position.y = 0.36;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8).translate(0, 0.05, 0), M.crystal);
    const t1 = new THREE.Mesh(box(0.14, 0.05, 0.05), M.crystal);
    t1.position.set(0.07, -0.12, 0);
    const t2 = t1.clone();
    t2.position.set(0.05, -0.04, 0);
    key.add(bow, shaft, t1, t2);
    key.userData.h = 0.22;
    const wt = new THREE.Group();
    const wb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.42, 20), M.stone.U);
    const wtop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), M.trim.U);
    wtop.position.y = 0.28;
    const wh = new THREE.Mesh(heartGeo(0.16, 0.06), M.glowGold);
    wh.position.set(0, 0.02, 0.33);
    wt.add(wb, wtop, wh);
    wt.userData.h = 0.21;
    [
      ['cube', cube],
      ['key', key],
      ['weight', wt],
    ].forEach(([id, g]) => {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: new THREE.Color(id === 'weight' ? '#ffcf8a' : '#ff9fc6').multiplyScalar(0.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(1.3);
      g.add(halo);
      dynG.add(g);
      items[id] = { g, halo, pos: V3(), w: 'U', via: 0, tr: null, spin: 0 };
    });
  };

  // ---------- the partner's reflection, the Reflet ----------
  let ghost = null;
  const makeGhost = (look) => {
    if (ghost && ghost.look === look) return;
    if (ghost) dynG.remove(ghost.av.root);
    const av = Avatar.build(look);
    dynG.add(av.root);
    const col = new THREE.Color(Avatar.LOOK[look] ? Avatar.LOOK[look].glow : '#ff5f8a');
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: col.clone().multiplyScalar(0.55), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(1.6, 2.6, 1);
    halo.position.y = 0.95;
    halo.renderOrder = 4;
    const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.heart, color: col.clone().multiplyScalar(0.8), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    heart.scale.setScalar(0.42);
    heart.position.y = 1.15;
    heart.renderOrder = 4;
    av.root.add(halo, heart);
    ghost = { look, av, yaw: 0, last: V3(), has: false, halo, heart };
  };
  const BOSS_U = { uRim: { value: 0.6 }, uHot: { value: 0 }, uT: { value: 0 } };
  let boss = null;
  const darkMat = () => {
    const m = new THREE.MeshStandardMaterial({ color: '#160c22', roughness: 0.38, metalness: 0, emissive: '#000000', transparent: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = BOSS_U.uRim;
      sh.uniforms.uHot = BOSS_U.uHot;
      sh.uniforms.uT = BOSS_U.uT;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uRim; uniform float uHot; uniform float uT;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.2);
            vec3 rim = mix(vec3(0.55, 0.30, 0.95), vec3(1.0, 0.35, 0.6), uHot);
            float crack = smoothstep(0.92, 0.99, sin(vViewPosition.y * 9.0 + sin(vViewPosition.x * 7.0) * 2.0 + uT * 0.6));
            totalEmissiveRadiance += rim * fr * uRim + vec3(1.0, 0.4, 0.65) * crack * uHot * 0.9;
          }`,
        );
    };
    m.customProgramCacheKey = () => 'c6dark';
    return m;
  };
  const makeBoss = () => {
    const g = new THREE.Group();
    const dm = darkMat();
    const avs = ['dame', 'valet'].map((look) => {
      const av = Avatar.build(look);
      av.root.traverse((o) => {
        if (o.isMesh) {
          o.material = dm;
          o.frustumCulled = false;
        }
      });
      g.add(av.root);
      return av;
    });
    avs[1].root.position.x = 0.05;
    // a crown of mirror shards over its head
    const crown = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0).scale(0.5, 1.8, 0.5), M.crystalV);
      s.position.set(Math.sin(a) * 0.45, 2.35, Math.cos(a) * 0.45);
      s.rotation.z = Math.sin(a) * 0.4;
      crown.add(s);
    }
    g.add(crown);
    const heart = new THREE.Mesh(heartGeo(0.3, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(1.2), toneMapped: false, transparent: true }));
    heart.position.set(0, 1.25, 0.28);
    g.add(heart);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: new THREE.Color('#b07cff').multiplyScalar(0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(5);
    halo.position.y = 1.3;
    g.add(halo);
    g.scale.setScalar(1.55);
    g.visible = false;
    dynG.add(g);
    // telegraphs (pooled)
    const tele = [];
    const tMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.1), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const tg = new THREE.Group();
      const outline = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), tMat('#ff4f7a'));
      const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), tMat('#ff4f7a'));
      fill.material.opacity = 0.3;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), tMat('#ff4f7a'));
      const wave = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96).rotateX(-Math.PI / 2), tMat('#ff8fb0'));
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0).scale(0.6, 2.2, 0.6), M.crystalV);
      tg.add(outline, fill, line, wave, shard);
      tg.visible = false;
      dynG.add(tg);
      tele.push({ g: tg, outline, fill, line, wave, shard, t: -1 });
    }
    // where the striker must slam: a glowing target on the striker's floor
    const target = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.crack, color: new THREE.Color('#ff7aa8').multiplyScalar(0.9), transparent: true, depthWrite: false, toneMapped: false }));
    target.visible = false;
    target.renderOrder = 5;
    dynG.add(target);
    boss = { g, dm, avs, crown, heart, halo, tele, target, pos: V3(), yaw: 0, w: 'U', st: 0, hot: 0, flash: 0, speed: 0, vis: 0, prev: V3() };
  };
  let card = null;
  let cardHalo = null;
  let shards = null;

  // ---------- particles ----------
  const motes = {};
  const makeMotes = (w) => {
    const n = 700;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = AN[w].x + (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = AN[w].y + Math.random() * 9 - 0.4;
      pos[i * 3 + 2] = AN[w].z - 14 + Math.random() * 330;
      ph[i] = Math.random() * 10;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: T.soft, color: new THREE.Color(w === 'U' ? '#ffe6c8' : '#9fd8ff').multiplyScalar(0.8), size: w === 'U' ? 0.14 : 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false;
    dynG.add(m);
    motes[w] = { m, ph, n };
  };

  // ---------- the call beam, seen through the mirror ----------
  let callBeam = null;

  // ---------- build ----------
  const build = () => {
    if (built) {
      root.visible = true;
      return;
    }
    built = true;
    root.visible = true;
    makeTextures();
    makeMats();
    makeSky();
    both(makeLiquid);
    both(makeMotes);
    makeCount();

    // floors
    FLOORS.forEach(([zone, x0, x1, z0, z1]) => both((w) => floorRect(w, zone, x0, x1, z0, z1)));
    both((w) => {
      discFloor(w, 'B', HALL.z, HALL.R, HALL.rail - 0.7);
      discFloor(w, 'D', ARENA.z, ARENA.R, ARENA.rail - 0.7);
      ringRail(w, 'B', HALL.z, HALL.rail, (x) => Math.abs(x) < HW + 0.4);
      ringRail(w, 'D', ARENA.z, ARENA.rail, (x, z) => Math.abs(x) < HW + 0.4 && z < ARENA.z);
      // the back of the start, and rails along the corridors of sections 2, 3, 4
      stat(w, 'A', M.stone[w], box(HW * 2 + 0.6, 1.0, 0.6), 0, 0.5, -12.3);
      col(w, 0, 0.5, -12.3, HW * 2 + 0.6, 1.0, 0.6);
      [-1, 1].forEach((sd) => {
        const x = sd * (HW + 0.05);
        sideRail(w, 'B', x, 92, 101.6);
        sideRail(w, 'B', x, 130.4, 158);
        sideRail(w, 'C', x, 158, 176);
        sideRail(w, 'C', x, 186, 215);
        sideRail(w, 'C', x, 218, 244);
        sideRail(w, 'D', x, 244, 269.6);
      });
      // the corridors run into the round floors (their colliders meet under the seam)
      col(w, 0, -FT / 2, 102.2, HW * 2, FT, 2);
      col(w, 0, -FT / 2, 129.8, HW * 2, FT, 2);
      col(w, 0, -FT / 2, 270.4, HW * 2, FT, 2);
    });

    // ----- section 1 -----
    both((w) => {
      heartArch(w, 'A', -5, 5.2, M.trim[w], w === 'U' ? M.glowGold : M.glowViolet);
      heartArch(w, 'A', 89, 5.2, M.trim[w], w === 'U' ? M.glowGold : M.glowViolet);
    });
    plaque('U', 'A', 'Les Mondes miroirs', Cards.tagOf('c6') + ' · le jardin du jour', 0, 3.3, 11.6, Math.PI, '#ffcf8a');
    plaque('L', 'A', 'Les Mondes miroirs', Cards.tagOf('c6') + ' · le jardin de la nuit', 0, 3.3, 11.6, Math.PI, '#b07cff');
    Object.keys(BRIDGES).forEach(makeBridge);
    Object.keys(LEVERS).forEach(makeLever);
    both((w) => {
      makePlate('m4' + w, w, 'A', MARK4[0], 0, MARK4[1], 1.1, w === 'U' ? '#ffcf8a' : '#9fd8ff');
    });
    // buttresses at the gap edges (both worlds, so each sees where the other must cross)
    both((w) =>
      [12, 20, 32, 40, 50, 54, 58, 62, 72, 84].forEach((z) => {
        const zz = z + (z === 12 || z === 32 || z === 50 || z === 58 || z === 72 ? -0.25 : 0.25);
        [-1, 1].forEach((sd) => {
          stat(w, 'A', M.trim[w], new THREE.CylinderGeometry(0.12, 0.16, 1.4 + MG, 8).translate(0, (1.4 + MG) / 2, 0), sd * 1.75, -MG, zz);
          stat(w, 'A', w === 'U' ? M.glowGold : M.glowViolet, new THREE.OctahedronGeometry(0.13, 0), sd * 1.75, 1.55, zz);
          col(w, sd * 1.75, 0.6, zz, 0.32, 1.2, 0.32);
        });
      }),
    );
    decorU('A', -14, 92, 3);
    decorL('A', -14, 92, 4);
    lamps('A', -8, 88, 12);

    // ----- section 2 -----
    makeWell();
    makeDoor('U', 'U');
    makeDoor('L', 'L');
    makeCage();
    pedestal('U', S2.slot.l[0], S2.slot.l[2]);
    pedestal('U', S2.slot.r[0], S2.slot.r[2]);
    makePlate('slotl', 'U', 'B', S2.slot.l[0], 1.0, S2.slot.l[2], 0.42, '#ffcf8a');
    makePlate('slotr', 'U', 'B', S2.slot.r[0], 1.0, S2.slot.r[2], 0.42, '#ffcf8a');
    makePlate('cagep', 'L', 'B', S2.cagePlate[0], 0, S2.cagePlate[2], 0.9, '#9fd8ff');
    makePlate('bal', 'U', 'B', S2.bal[0], 0, S2.bal[2], 1.0, '#ffcf8a');
    // the scales: a pan on a column, linked by a gilded chain to the door of night (its reflection)
    stat('U', 'B', M.stone.U, new THREE.CylinderGeometry(0.12, 0.18, 2.6, 10).translate(0, 1.3, 0), S2.bal[0] - 1.6, 0, S2.bal[2]);
    stat('U', 'B', M.trim.U, new THREE.TorusGeometry(0.5, 0.05, 6, 20).rotateX(Math.PI / 2), S2.bal[0] - 1.6, 2.6, S2.bal[2]);
    col('U', S2.bal[0] - 1.6, 1.3, S2.bal[2], 0.36, 2.6, 0.36);
    plaque('U', 'B', 'Le Puits miroir', 'ce qu’on y jette passe de l’autre côté', 0, 3.1, 101.8, Math.PI, '#ffcf8a');
    plaque('L', 'B', 'Le Puits miroir', 'ce qu’on y jette passe de l’autre côté', 0, 3.1, 101.8, Math.PI, '#b07cff');
    // dame-only glyphs: which lock takes which object (set in update)
    T.glyphs = ['l', 'r'].map((k) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.iconKey, transparent: true, depthWrite: false, toneMapped: false }));
      s.material.color.set('#ffd7ea').multiplyScalar(0.85);
      s.scale.setScalar(0.8);
      s.visible = false;
      dynG.add(s);
      return { k, s };
    });
    decorU('B', 84, 160, 5);
    decorL('B', 84, 160, 6);
    // a garden around the hall: glass trees / crystal spires on the rim
    both((w) => {
      const r = rng(w === 'U' ? 41 : 42);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + r() * 0.1;
        const R2 = HALL.R + 3 + r() * 6;
        const x = Math.sin(a) * R2;
        const z = HALL.z + Math.cos(a) * R2;
        if (Math.abs(x) < 6) continue;
        if (w === 'U') {
          const s = 0.9 + r() * 0.8;
          stat(w, 'B', M.stem, new THREE.CylinderGeometry(0.12, 0.2, 1, 7).translate(0, 0.5, 0), x, -MG, z, 0, 0, 0, V3(1, 3.5 * s + MG, 1));
          stat(w, 'B', r() < 0.5 ? M.petal : M.leaf, new THREE.IcosahedronGeometry(1, 1), x, 3.5 * s + 0.8, z, r() * 6, 0, 0, V3(1.4 * s, 1.1 * s, 1.4 * s));
        } else {
          const s = 1.5 + r() * 2.2;
          stat(w, 'B', r() < 0.5 ? M.crystal : M.crystalP, new THREE.OctahedronGeometry(1, 0).scale(0.35, 1.6, 0.35).translate(0, 1.75, 0), x, -MG, z, r() * 6, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3, V3(s, s, s));
        }
      }
    });
    lamps('B', 94, 100, 6);
    lamps('B', 134, 158, 8);

    // ----- section 3 -----
    INV.forEach((z, i) => both((w) => makePlate('inv' + i + w, w, 'C', 0, 0, z, INV_R, w === 'U' ? '#ff9fc6' : '#c6a8ff', T.rune)));
    makePlate('hold', 'U', 'C', HOLD[0], 0, HOLD[1], 0.85, '#ffcf8a');
    makePlate('hold2', 'U', 'C', HOLD2[0], 0, HOLD2[1], 0.85, '#ffcf8a');
    TWIN.forEach((tw, k) =>
      both((w) => {
        const [x, y, z] = tw[w];
        if (y > 0) {
          stat(w, 'C', M.stone[w], box(1.6, y, 1.6), x, y / 2, z);
          stat(w, 'C', M.trim[w], box(1.7, 0.06, 1.7), x, y, z);
          col(w, x, y / 2, z, 1.6, y, 1.6);
        }
        makePlate('tw' + k + w, w, 'C', x, y, z, 0.7, w === 'U' ? '#ffcf8a' : '#9fd8ff');
        makeGate('gt' + k + w, w, 'C', tw.gate);
      }),
    );
    // the grapple ring of day
    dual('U', 'C', () => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 10, 40), M.glowGold);
      const h = new THREE.Mesh(heartGeo(0.4, 0.08), M.glowPink);
      g.add(t, h);
      g.position.set(RING.pos[0], RING.pos[1], RING.pos[2]);
      g.userData.spin = true;
      return g;
    });
    // every chasm is a long double jump at most: an unseen wall across the middle of each one
    // (ignored by the camera), open only over its bridge while the bridge is there. The day's
    // chasm of section 3 has no bridge: its wall lifts for the grapple (see the level).
    const wallOpt = { dyn: true, tag: 'nocam' };
    Object.values(bridges).forEach((br) => {
      const hw = BRIDGES[br.id][4];
      const z = (br.z0 + br.z1) / 2;
      LIDS.push(col(br.w, (-15 - hw) / 2, 1.4, z, 15 - hw, 6.2, 0.3, wallOpt), col(br.w, (15 + hw) / 2, 1.4, z, 15 - hw, 6.2, 0.3, wallOpt));
      br.plug = col(br.w, 0, 1.4, z, hw * 2, 6.2, 0.3, wallOpt);
    });
    LIDS.push(col('U', 0, 1.4, 181, 30, 6.2, 0.3, wallOpt));
    plaque('U', 'C', 'Les Inversions', 'là où le ciel se retourne', 0, 3.1, 160.5, Math.PI, '#ffcf8a');
    plaque('L', 'C', 'Les Inversions', 'là où le ciel se retourne', 0, 3.1, 160.5, Math.PI, '#b07cff');
    decorU('C', 158, 248, 7);
    decorL('C', 158, 248, 8);
    lamps('C', 162, 242, 10);

    // ----- section 4: the arena of the Reflet -----
    both((w) => {
      makeGate('arena' + w, w, 'D', ARENA_GATE, HW + 0.1, 3.6);
      // a giant heart-shaped mirror frame behind the arena, rising from the liquid
      heartArch(w, 'D', 310, 9, M.trim[w], w === 'U' ? M.glowGold : M.glowViolet);
      // a crown of tall glass shards / crystal spires around the arena
      const r = rng(w === 'U' ? 61 : 62);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        if (Math.cos(a) < -0.9) continue;
        const R2 = ARENA.R + 7 + r() * 4;
        const s = 2 + r() * 2.5;
        stat(w, 'D', w === 'U' ? M.glass.U : M.crystalV, new THREE.OctahedronGeometry(1, 0).scale(0.45, 2.6, 0.45), Math.sin(a) * R2, -MG + s * 2.65, ARENA.z + Math.cos(a) * R2, a, (r() - 0.5) * 0.15, 0, V3(s, s, s));
      }
    });
    plaque('U', 'D', 'Le Reflet', 'il imite, il attend', 0, 3.2, 246.5, Math.PI, '#ff8fb0');
    plaque('L', 'D', 'Le Reflet', 'il imite, il attend', 0, 3.2, 246.5, Math.PI, '#ff8fb0');
    lamps('D', 248, 266, 9);
    decorU('D', 244, 312, 9);
    decorL('D', 244, 312, 10);

    flush();

    makeItems();
    makeBoss();
    card = LvKit.trialCard('c6', false);
    dynG.add(card);
    cardHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: new THREE.Color('#ffb98a').multiplyScalar(0.42), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    cardHalo.scale.setScalar(3.6);
    cardHalo.visible = false;
    dynG.add(cardHalo);
    // mirror shards bursting out of the Reflet at the end
    const sg = new THREE.OctahedronGeometry(0.22, 0).scale(0.4, 1.6, 0.4);
    shards = [];
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(sg, i % 3 ? M.crystalV : M.glass.U);
      m.visible = false;
      dynG.add(m);
      shards.push({ m, p: V3(), v: V3(), r: V3(), t: -1 });
    }
    callBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 40, 10, 1, true).translate(0, -20, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    callBeam.visible = false;
    dynG.add(callBeam);

    // render order: mirrored copies first, then the liquid, then the real world
    ZK.forEach((k) =>
      both((w) => {
        G[w][k].mir.traverse((o) => (o.renderOrder = 1));
        G[w][k].real.traverse((o) => (o.renderOrder = 3));
      }),
    );
  };

  // ---------- per-frame ----------
  const pz = { me: 0, mate: 0 };
  const zoneVis = (me, z, zMate) => {
    ZK.forEach((k) => {
      const [z0, z1] = ZONES[k];
      const near = (z > z0 - 46 && z < z1 + 46) || (zMate > z0 - 30 && zMate < z1 + 30);
      G[me][k].real.visible = near;
      G[other(me)][k].mir.visible = near && !st0.reunited;
      G[other(me)][k].real.visible = false;
      G[me][k].mir.visible = false;
    });
  };
  const st0 = { reunited: false };

  const animBridge = (br, dt, t) => {
    br.k = damp(br.k, br.want, br.want > br.k ? 4.5 : 6, dt);
    const vis = br.k > 0.01;
    br.pair.forEach((g) => {
      g.visible = vis;
      if (!vis) return;
      g.userData.tiles.forEach((tile, i) => {
        const u = clamp(br.k * (br.n + 2) - i, 0, 1);
        tile.visible = u > 0.02;
        tile.scale.set(1, 1, Math.max(0.02, u));
        tile.position.y = (1 - u) * -0.3;
      });
    });
    const flick = br.warn > 0 ? 0.55 + 0.45 * Math.sin(t * 30) : 1;
    br.mat.opacity = flick;
    br.edge.color.setScalar(1).multiply(new THREE.Color(br.w === 'U' ? '#ffcf8a' : '#b07cff')).multiplyScalar((br.warn > 0 ? 2.2 : 1.3) * flick);
  };

  const ghostUpdate = (dt, t, st) => {
    if (!ghost) return;
    const av = ghost.av;
    const show = st.mateHas && !st.same;
    av.root.visible = show;
    if (!show) return;
    const rp = st.matePos;
    const mw = worldOf(rp);
    const q = rel(rp, tmp);
    // heading from movement
    const dx = rp.x - ghost.last.x;
    const dz = rp.z - ghost.last.z;
    if (ghost.has && dx * dx + dz * dz > 0.0004 && dx * dx + dz * dz < 4) ghost.yaw = angleDamp(ghost.yaw, Math.atan2(dx, dz), 12, dt);
    ghost.last.copy(rp);
    ghost.has = true;
    view(mw, st.me, q.x, q.y, q.z, av.root.position);
    av.root.rotation.y = ghost.yaw;
    av.root.scale.set(1, mw === st.me ? 1 : -1, 1);
    const pulse = 0.5 + Math.sin(t * 2.4) * 0.12;
    ghost.halo.material.opacity = pulse * (1 - (st.trouble || 0) * 0.8);
    ghost.heart.material.opacity = (0.75 + Math.sin(t * 4.8) * 0.2) * (1 - (st.trouble || 0) * 0.8);
    const s = st.mateState || {};
    av.update(dt, { speed: s.speed || 0, grounded: s.grounded !== false, mode: s.mode === 'grapple' ? 'walk' : s.mode || 'walk', groundY: -1e9, hand: false, flip: s.flip || 0, punch: s.punch || 0 }, t);
    if (av.shadow) av.shadow.visible = false;
  };

  const itemUpdate = (dt, t, st) => {
    const me = st.me;
    Object.entries(items).forEach(([id, it]) => {
      const d = st.items && st.items[id];
      if (!d) {
        it.g.visible = false;
        return;
      }
      it.g.visible = true;
      if ((d.via || 0) !== it.via) {
        it.via = d.via || 0;
        if (it.via) it.tr = { t: 0, from: other(d.w), to: d.w };
      }
      let w = d.w;
      const h = it.g.userData.h;
      if (d.s === 'held') {
        const mine = d.h === st.role;
        if (mine) {
          Player.avatar.hand(tmp);
          w = worldOf(Player.body.p);
          rel(tmp, tmp2);
        } else if (ghost && ghost.av.root.visible) {
          ghost.av.hand(tmp);
          // the ghost is drawn mirrored: bring its hand back to the partner's own world
          const mw = worldOf(st.matePos);
          w = mw;
          if (mw === me) rel(tmp, tmp2);
          else {
            tmp2.set(tmp.x - AN[me].x, MY - (tmp.y - AN[me].y), tmp.z - AN[me].z);
          }
        } else {
          w = worldOf(st.matePos);
          rel(st.matePos, tmp2).y += 1.1;
        }
        tmp2.y -= 0.05;
        it.pos.copy(tmp2);
      } else if (it.tr) {
        // through the mirror: sink in the well of one world, rise from the other
        it.tr.t += dt;
        const k = it.tr.t / 1.6;
        if (k >= 1) it.tr = null;
        else if (k < 0.45) {
          const u = k / 0.45;
          w = it.tr.from;
          it.pos.set(WELL.x, 1.6 - u * 2.4, WELL.z);
        } else {
          const u = (k - 0.45) / 0.55;
          w = it.tr.to;
          const [lx, ly, lz] = d.p;
          it.pos.set(lerp(WELL.x, lx, u), lerp(0.4, ly + h, u) + Math.sin(u * Math.PI) * 2.2, lerp(WELL.z, lz, u));
        }
      }
      if (!it.tr && d.s !== 'held') {
        const [lx, ly, lz] = d.p;
        it.pos.set(lx, ly + h + Math.sin(t * 2 + id.length) * 0.05, lz);
      }
      view(w, me, it.pos.x, it.pos.y, it.pos.z, it.g.position);
      it.g.scale.set(1, w === me ? 1 : -1, 1);
      it.g.rotation.y = d.s === 'held' ? (d.h === st.role ? Player.yaw : ghost ? ghost.yaw : 0) : t * 0.6;
      it.halo.material.opacity = d.s === 'held' ? 0.3 : 0.6 + Math.sin(t * 3) * 0.2;
    });
  };

  const tmpC = new THREE.Color();
  const update = (dt, t, st) => {
    if (!built) return;
    const me = st.me;
    const q = rel(Player.body.p, tmp3);
    pz.me = q.z;
    pz.mate = st.mateHas ? rel(st.matePos, tmp).z : q.z;
    st0.reunited = !!st.reunited;
    zoneVis(me, q.z, pz.mate);
    Object.entries(liquids).forEach(([w, m]) => (m.visible = w === me));
    Object.entries(motes).forEach(([w, mo]) => {
      mo.m.visible = w === me;
      if (w !== me) return;
      const a = mo.m.geometry.attributes.position.array;
      for (let i = 0; i < mo.n; i++) {
        a[i * 3 + 1] += Math.sin(t * 0.7 + mo.ph[i]) * 0.12 * dt + (w === 'U' ? 0.05 : 0.03) * dt;
        a[i * 3] += Math.cos(t * 0.5 + mo.ph[i] * 1.3) * 0.15 * dt;
        if (a[i * 3 + 1] > AN[w].y + 9) a[i * 3 + 1] = AN[w].y - 0.4;
      }
      mo.m.geometry.attributes.position.needsUpdate = true;
    });
    // sky and mirror follow my side
    const day = me === 'U' ? 1 : 0;
    SKY.uDay.value = damp(SKY.uDay.value, day, 6, dt);
    LIQ.uDay.value = SKY.uDay.value;
    SKY.uTime.value = t;
    LIQ.uTime.value = t;
    CU.uCT.value = t;
    BOSS_U.uT.value = t;
    LIQ.uTrouble.value = damp(LIQ.uTrouble.value, st.trouble || 0, 3, dt);
    LIQ.uCalm.value = damp(LIQ.uCalm.value, st.reunited ? 1 : 0, 1.2, dt);
    SKY.uCalm.value = LIQ.uCalm.value;
    sky.position.copy(R.camera.position);
    if (T.poolMat) T.poolMat.uniforms.uK.value = damp(T.poolMat.uniforms.uK.value, st.wellHot || 0, 4, dt);

    // bridges, levers, gates, doors, cage
    Object.values(bridges).forEach((br) => animBridge(br, dt, t));
    Object.values(levers).forEach((lv) => {
      const n = (st.lv && st.lv[lv.id]) || 0;
      if (lv.n < 0) lv.n = n;
      if (n !== lv.n) {
        lv.n = n;
        lv.flash = 1;
      }
      const want = n % 2 ? 0.55 : -0.55;
      lv.a = damp(lv.a, want, 10, dt);
      lv.flash = Math.max(0, lv.flash - dt * 1.5);
      lv.pair.forEach((g) => {
        g.userData.piv.rotation.x = lv.a;
        g.userData.piv.children[2].scale.setScalar(1 + lv.flash * 0.6);
      });
    });
    Object.values(gates).forEach((gt) => {
      gt.k = damp(gt.k, gt.want, 2.2, dt);
      gt.pair.forEach((g) => {
        g.scale.y = Math.max(0.001, 1 - gt.k);
        g.visible = gt.k < 0.99;
      });
    });
    Object.values(doors).forEach((d) => {
      d.k = damp(d.k, d.want, 2, dt);
      d.pair.forEach((g) => {
        g.userData.a.position.x = -HW / 2 - d.k * (HW - 0.2);
        g.userData.b.position.x = HW / 2 + d.k * (HW - 0.2);
      });
    });
    if (cage) {
      cage.k = damp(cage.k, cage.want, 2, dt);
      cage.pair.forEach((g) => {
        g.userData.bars.scale.y = Math.max(0.001, 1 - cage.k);
        g.userData.bars.visible = cage.k < 0.99;
      });
    }
    // plates: glow when pressed, countdown rings
    Object.values(plates).forEach((pl) => {
      const on = st.plates && st.plates[pl.id];
      pl.on = damp(pl.on, on ? 1 : 0, 10, dt);
      pl.pair.forEach((g) => {
        g.position.y = pl.y + 0.03 - pl.on * 0.05;
        tmpC.copy(pl.color).multiplyScalar(0.55 + pl.on * 0.45 + Math.sin(t * 3 + pl.x) * 0.06);
        g.userData.disc.material.color.copy(tmpC);
        if (pl.id.startsWith('inv')) g.userData.disc.rotation.y = t * 0.4;
      });
      const fr = st.rings && st.rings[pl.id] != null ? st.rings[pl.id] : -1;
      setRing(pl, fr);
    });
    // the countdown numbers
    countSprites.forEach((s) => (s.visible = false));
    if (st.count) {
      const [txt, col2, list] = st.count;
      drawCount(txt, col2);
      list.forEach(([w, x, y, z], i) => {
        const s = countSprites[i];
        if (!s) return;
        s.visible = true;
        view(w, me, x, y, z, s.position);
        s.scale.setScalar(1.5 + Math.sin(t * 8) * 0.05);
      });
    }
    // the grapple ring turns
    G.U.C.real.children.concat(G.U.C.mir.children).forEach((o) => {
      if (o.userData.spin) o.rotation.y = t * 0.8;
    });
    // the dame's glyphs on the locks of day
    if (T.glyphs) {
      T.glyphs.forEach(({ k, s }) => {
        const show = !!st.glyphs;
        s.visible = show;
        if (!show) return;
        const isKey = st.glyphs === k;
        s.material.map = isKey ? T.iconKey : T.iconCube;
        const [x, y, z] = S2.slot[k];
        view('U', me, x, y + 1.3 + Math.sin(t * 2) * 0.08, z, s.position);
      });
    }
    ghostUpdate(dt, t, st);
    itemUpdate(dt, t, st);
    bossDraw(dt, t, st);
    // the call through the mirror
    if (callBeam.visible) {
      callBeam.userData.t -= dt;
      callBeam.material.opacity = Math.max(0, Math.min(1, callBeam.userData.t)) * 0.5;
      if (callBeam.userData.t <= 0) callBeam.visible = false;
    }
    // the card at the end
    card.visible = !!st.cardOn;
    cardHalo.visible = card.visible;
    if (card.visible) {
      const k = Math.min(1, st.cardK || 0);
      P('U', 0, -1.5 + k * 3.3 + Math.sin(t * 1.5) * 0.1, ARENA.z, card.position);
      card.rotation.y = t * 0.8;
      cardHalo.position.copy(card.position);
      cardHalo.material.opacity = 0.4 + Math.sin(t * 2) * 0.1;
    }
    shards.forEach((s) => {
      if (s.t < 0) return;
      s.t += dt;
      s.v.y -= 6 * dt;
      s.p.addScaledVector(s.v, dt);
      s.m.position.copy(s.p);
      s.m.rotation.x += s.r.x * dt;
      s.m.rotation.y += s.r.y * dt;
      s.m.scale.setScalar(Math.max(0.01, 1 - s.t / 3));
      if (s.t > 3) {
        s.t = -1;
        s.m.visible = false;
      }
    });
  };

  // ---------- the Reflet, drawn on each screen ----------
  const bossDraw = (dt, t, st) => {
    const B = boss;
    if (!B) return;
    const b = st.boss;
    const show = !!(b && b.on);
    B.vis = damp(B.vis, show ? 1 : 0, 3, dt);
    B.g.visible = B.vis > 0.02;
    B.target.visible = false;
    if (B.g.visible && b) {
      B.w = b.w;
      B.pos.lerp(tmp.set(b.x, b.y, b.z), B.pos.lengthSq() ? 1 - Math.exp(-dt * 14) : 1);
      B.yaw = angleDamp(B.yaw, b.yaw, 10, dt);
      const sp = Math.hypot(B.pos.x - B.prev.x, B.pos.z - B.prev.z) / Math.max(dt, 1e-3);
      B.prev.copy(B.pos);
      B.speed = damp(B.speed, sp, 8, dt);
      view(B.w, st.me, B.pos.x, B.pos.y, B.pos.z, B.g.position);
      const sc = 1.55 * (0.4 + 0.6 * B.vis);
      B.g.scale.set(sc, (B.w === st.me ? 1 : -1) * sc * (b.st === 3 ? 0.7 + 0.3 * Math.cos(t * 12) : 1), sc);
      B.g.rotation.y = B.yaw;
      // it fades when it walks into the camera (it has no body to push it away)
      const cd = Math.hypot(R.camera.position.x - B.g.position.x, R.camera.position.z - B.g.position.z) + Math.max(0, Math.abs(R.camera.position.y - B.g.position.y) - 3);
      B.dm.opacity = clamp((cd - 1.6) / 2.6, 0.18, 1);
      B.heart.material.opacity = B.dm.opacity;
      B.halo.material.opacity = B.dm.opacity;
      const hot = b.st === 2 ? 1 : 0;
      B.hot = damp(B.hot, hot, 6, dt);
      B.flash = Math.max(0, B.flash - dt * 2.5);
      BOSS_U.uHot.value = Math.min(1, B.hot + B.flash);
      BOSS_U.uRim.value = 0.55 + Math.sin(t * 3) * 0.15 + B.flash * 1.5 + (b.st === 1 ? 0.5 : 0);
      B.crown.rotation.y = t * (b.st === 1 ? 4 : 1.2);
      B.heart.scale.setScalar(1 + B.hot * (0.25 + Math.sin(t * 10) * 0.1) + B.flash * 0.5);
      B.halo.material.color.set(B.hot > 0.5 ? '#ff5f8a' : '#b07cff').multiplyScalar(0.5 + B.hot * 0.3);
      const st2 = { speed: Math.min(8, B.speed), grounded: B.pos.y < 0.1, mode: 'walk', groundY: -1e9, hand: false, flip: 0, punch: b.st === 1 ? 0.2 : 0 };
      // the two silhouettes drift in and out of each other
      B.avs.forEach((av, i) => {
        av.root.position.x = i ? Math.sin(t * 1.7) * 0.12 : 0;
        av.root.position.z = i ? Math.cos(t * 1.3) * 0.08 : 0;
        av.update(dt, st2, t - i * 0.25);
        if (av.shadow) av.shadow.visible = false;
      });
      // the striker's target: on the striker's own floor, right above the reflection
      if (st.striker && b.st === 2 && B.w !== st.me) {
        B.target.visible = true;
        P(st.me, B.pos.x, 0.04, B.pos.z, B.target.position);
        B.target.rotation.y = t * 0.6;
        B.target.material.opacity = 0.55 + Math.sin(t * 9) * 0.25;
      }
    }
    // telegraphs
    B.tele.forEach((tl) => {
      if (tl.t < 0) {
        tl.g.visible = false;
        return;
      }
      tl.t += dt;
      const d = tl.d;
      const dur = d.dur;
      if (tl.t > dur + (d.k === 'r' ? 2.6 : 0.45)) {
        tl.t = -1;
        tl.g.visible = false;
        return;
      }
      tl.g.visible = true;
      const k = Math.min(1, tl.t / dur);
      const flip = d.w !== st.me;
      tl.g.scale.set(1, flip ? -1 : 1, 1);
      tl.outline.visible = tl.fill.visible = d.k === 'c';
      tl.line.visible = d.k === 'l';
      tl.wave.visible = d.k === 'r';
      tl.shard.visible = d.k === 'c' && tl.t > dur - 0.3 && tl.t < dur + 0.2;
      const pulse = 0.45 + 0.35 * Math.sin(tl.t * (8 + k * 14));
      if (d.k === 'c') {
        view(d.w, st.me, d.x, 0.05, d.z, tl.g.position);
        tl.outline.scale.setScalar(d.r);
        tl.fill.scale.setScalar(d.r * k);
        tl.outline.material.opacity = tl.t > dur ? 1 - (tl.t - dur) / 0.45 : pulse + 0.2;
        tl.fill.material.opacity = 0.25 + k * 0.25;
        const sy = 8 - Math.max(0, (tl.t - (dur - 0.3)) / 0.3) * 8;
        tl.shard.position.set(0, Math.max(0.5, sy), 0);
        tl.shard.rotation.y = tl.t * 6;
      } else if (d.k === 'l') {
        view(d.w, st.me, d.x, 0.05, d.z, tl.g.position);
        tl.g.rotation.y = d.a;
        tl.line.scale.set(d.wd * (tl.t > dur ? 1.4 : 1), 1, d.len);
        tl.line.material.opacity = tl.t > dur ? 0.9 * (1 - (tl.t - dur) / 0.45) : pulse * 0.8;
        tl.line.material.color.set(tl.t > dur ? '#ffd0e0' : '#ff4f7a').multiplyScalar(1.1);
      } else if (d.k === 'r') {
        view(d.w, st.me, d.x, 0.08, d.z, tl.g.position);
        const rr = ringR(tl.t, d);
        tl.wave.scale.setScalar(Math.max(0.1, rr));
        tl.wave.material.opacity = tl.t < d.dur ? pulse * 0.6 : 0.95 * (1 - Math.max(0, tl.t - d.dur - 2.2) / 0.45);
        tl.wave.material.color.set(tl.t < d.dur ? '#ff4f7a' : '#ff9fc6').multiplyScalar(1.1);
      }
    });
  };
  const RING_SPEED = 8;
  const ringR = (t, d) => (t < d.dur ? 1.2 + Math.sin(t * 10) * 0.2 : 1.2 + (t - d.dur) * RING_SPEED);
  const tele = (d) => {
    const tl = boss.tele.find((x) => x.t < 0) || boss.tele[0];
    tl.t = 0;
    tl.d = d;
    return tl;
  };
  const bossFlash = () => {
    if (boss) boss.flash = 1;
  };
  const burstShards = (w, me, x, y, z) => {
    shards.forEach((s, i) => {
      s.t = 0;
      s.m.visible = true;
      view(w, me, x, y + 1.6, z, s.p);
      const a = (i / shards.length) * Math.PI * 2 * 3.1;
      s.v.set(Math.cos(a) * (3 + Math.random() * 5), (w === me ? 1 : -1) * (2 + Math.random() * 6), Math.sin(a) * (3 + Math.random() * 5));
      s.r.set(Math.random() * 8, Math.random() * 8, 0);
    });
  };

  // ---------- crystal sounds (own procedural synth: bells, shimmer, swells) ----------
  const Syn = (() => {
    let ac = null;
    let out = null;
    let wet = null;
    let amb = null;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const ok = () => {
      try {
        if (!ac) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          ac = new AC();
          out = ac.createGain();
          out.connect(ac.destination);
          // a long glassy tail
          const len = ac.sampleRate * 2.6;
          const buf = ac.createBuffer(2, len, ac.sampleRate);
          for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
          }
          const conv = ac.createConvolver();
          conv.buffer = buf;
          wet = ac.createGain();
          wet.gain.value = 0.35;
          wet.connect(conv).connect(out);
        }
        if (ac.state === 'suspended') ac.resume();
        out.gain.value = (typeof SETTINGS !== 'undefined' && SETTINGS.vol != null ? SETTINGS.vol : 0.8) * 0.5;
        return true;
      } catch (e) {
        return false;
      }
    };
    const bell = (f, t, v, d = 1.8) => {
      [1, 2.76, 5.4, 8.93].forEach((r, i) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * r;
        const g = ac.createGain();
        const a = v / (1 + i * 1.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(a, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d / (1 + i * 0.8));
        o.connect(g);
        g.connect(out);
        g.connect(wet);
        o.start(t);
        o.stop(t + d + 0.1);
      });
    };
    const noise = (t, dur, f0, f1, v, q = 1.5) => {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource();
      s.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g);
      g.connect(out);
      g.connect(wet);
      s.start(t);
    };
    const sweep = (t, f0, f1, dur, v, type = 'sine') => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(out);
      g.connect(wet);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const DAY = [72, 74, 76, 79, 81, 84, 86, 88];
    const NIGHT = [69, 72, 74, 76, 79, 81, 84, 88].map((m) => m - 5);
    const play = (name, k = 1) => {
      if (!ok()) return;
      const t = ac.currentTime + 0.01;
      switch (name) {
        case 'lever':
          noise(t, 0.08, 3000, 2000, 0.08 * k, 4);
          bell(hz(84), t + 0.03, 0.09 * k, 1.2);
          break;
        case 'bridge':
          [72, 76, 79, 84, 88].forEach((m, i) => bell(hz(m), t + i * 0.07, 0.07 * k, 1.6));
          break;
        case 'unbridge':
          [88, 84, 79, 76].forEach((m, i) => bell(hz(m), t + i * 0.06, 0.05 * k, 1.0));
          noise(t, 0.6, 5000, 800, 0.05 * k, 2);
          break;
        case 'trouble':
          sweep(t, 220, 180, 1.2, 0.05 * k, 'triangle');
          sweep(t, 233, 190, 1.2, 0.05 * k, 'triangle');
          break;
        case 'well':
          sweep(t, 900, 140, 0.7, 0.12 * k);
          noise(t + 0.1, 1.0, 600, 4000, 0.06 * k, 1.2);
          [79, 84, 91].forEach((m, i) => bell(hz(m), t + 0.7 + i * 0.09, 0.06 * k, 1.8));
          break;
        case 'pick':
          bell(hz(91), t, 0.06 * k, 0.8);
          break;
        case 'place':
          bell(hz(79), t, 0.08 * k, 1.4);
          bell(hz(86), t + 0.08, 0.06 * k, 1.4);
          break;
        case 'deny':
          sweep(t, 330, 220, 0.3, 0.06 * k, 'triangle');
          sweep(t + 0.12, 300, 200, 0.3, 0.05 * k, 'triangle');
          break;
        case 'tick':
          bell(hz(k > 1 ? 96 : 93), t, 0.07, 0.5);
          break;
        case 'swap':
          noise(t, 1.6, 300, 7000, 0.12, 0.8);
          sweep(t, 110, 880, 1.6, 0.06, 'sawtooth');
          [60, 67, 72, 79, 84, 91].forEach((m, i) => bell(hz(m), t + 1.3 + i * 0.05, 0.06, 2.4));
          break;
        case 'gate':
          noise(t, 1.2, 2500, 400, 0.06 * k, 1);
          [76, 81, 88].forEach((m, i) => bell(hz(m), t + i * 0.1, 0.06 * k, 1.6));
          break;
        case 'shatter':
          noise(t, 0.5, 6000, 2500, 0.18 * k, 0.7);
          for (let i = 0; i < 14; i++) bell(hz(86 + Math.random() * 18), t + Math.random() * 0.35, 0.04 * k, 0.9);
          break;
        case 'slam':
          sweep(t, 160, 50, 0.4, 0.2 * k);
          noise(t, 0.3, 4000, 1500, 0.1 * k, 0.8);
          bell(hz(74), t, 0.08 * k, 1.6);
          break;
        case 'tele':
          sweep(t, 600, 1400, 0.9, 0.04 * k, 'triangle');
          bell(hz(98), t, 0.03 * k, 0.6);
          break;
        case 'heart':
          bell(hz(64), t, 0.1, 2.5);
          bell(hz(71), t + 0.25, 0.08, 2.5);
          break;
        case 'win':
          [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => bell(hz(m), t + i * 0.12, 0.08, 3));
          break;
        default:
          break;
      }
    };
    // a soft pad and wind chimes; day: major, night: lower and minor
    const ambient = (on) => {
      if (!on) {
        if (amb) {
          clearTimeout(amb.tm);
          try {
            amb.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.6);
            const oo = amb.o;
            setTimeout(() => {
              oo.forEach((o) => o.stop());
              // nothing left to play: the context sleeps until the next sound wakes it (ok() resumes)
              if (!amb && ac) ac.suspend().catch(() => {});
            }, 2500);
          } catch (e) {}
          amb = null;
        }
        return;
      }
      if (amb || !ok()) return;
      const g = ac.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.03, ac.currentTime, 2);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      lp.connect(g);
      g.connect(out);
      g.connect(wet);
      const o = [48, 55, 60, 64].map((m, i) => {
        const x = ac.createOscillator();
        x.type = i % 2 ? 'triangle' : 'sine';
        x.frequency.value = hz(m) * (1 + (i - 1.5) * 0.002);
        x.connect(lp);
        x.start();
        return x;
      });
      amb = { g, o, day: 1, tm: 0 };
      const chime = () => {
        if (!amb) return;
        if (ok()) {
          const sc = amb.day ? DAY : NIGHT;
          const n = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) bell(hz(sc[Math.floor(Math.random() * sc.length)]), ac.currentTime + 0.05 + i * (0.12 + Math.random() * 0.2), 0.02 + Math.random() * 0.02, 2.4);
        }
        amb.tm = setTimeout(chime, 900 + Math.random() * 2600);
      };
      amb.tm = setTimeout(chime, 1500);
    };
    const mood = (day) => {
      if (!amb) return;
      if (amb.day === day) return;
      amb.day = day;
      const base = day ? [48, 55, 60, 64] : [45, 52, 57, 60];
      amb.o.forEach((x, i) => x.frequency.setTargetAtTime(hz(base[i]) * (1 + (i - 1.5) * 0.002), ac.currentTime, 1.5));
    };
    return { play, ambient, mood };
  })();

  // ---------- queries ----------
  const SPAWN_Z = { a0: 2, a1: 24, a2: 44, a3: 66, a4: 88, b: 96, c0: 160, c1: 190, c2: 200, c3: 213, c4: 228, d: 273, e: 279 };
  const spawn = (w, key, kit) => {
    const z = SPAWN_Z[key] != null ? SPAWN_Z[key] : 2;
    return P(w, kit === 'dame' ? -1.6 : 1.6, 0.05, z);
  };
  const leverNear = (w, q, r = 2.0) => {
    let best = null;
    let bd = r;
    Object.values(levers).forEach((lv) => {
      if (lv.w !== w) return;
      const d = Math.hypot(q.x - lv.x, q.z - lv.z);
      if (d < bd && Math.abs(q.y) < 1.5) {
        bd = d;
        best = lv;
      }
    });
    return best;
  };

  return {
    O,
    AN,
    MG,
    MY,
    HW,
    HALL,
    WELL,
    ARENA,
    BRIDGES,
    LEVERS,
    MARK4,
    S2,
    INV,
    INV_R,
    HOLD,
    HOLD2,
    RING,
    TWIN,
    ARENA_GATE,
    LIDS,
    other,
    worldOf,
    rel,
    P,
    view,
    build,
    get built() {
      return built;
    },
    hide() {
      root.visible = false;
      Syn.ambient(false);
    },
    update,
    bridges,
    levers,
    gates,
    doors,
    get cage() {
      return cage;
    },
    plates,
    items,
    get boss() {
      return boss;
    },
    get ghost() {
      return ghost;
    },
    makeGhost,
    tele,
    ringR,
    RING_SPEED,
    bossFlash,
    burstShards,
    ripple,
    callAt(w, me, x, z) {
      if (!callBeam) return;
      view(w, me, x, 0, z, callBeam.position);
      callBeam.scale.y = w === me ? -1 : 1;
      callBeam.userData.t = 4;
      callBeam.visible = true;
    },
    spawn,
    leverNear,
    zoneOfZ,
    Syn,
  };
})();
