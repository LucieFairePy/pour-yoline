// ♦ 9 · Le Temps. Inside an immense clock tower, above a void of clouds, four parts along +z:
//  1. Le Cadran: a horizontal clock face over the abyss. Its giant hands are the walkways; the
//     crank (Valet) sets the time, the walker (Dame) rides the minute hand from niche to niche.
//  2. L'Écho: record ten seconds of yourself, a golden echo replays it (plates, gates).
//  3. Gel et accélération: frozen debris as steps while a gear is jammed, then a hall where time
//     runs too fast: jammed gears and the Dame's slowed time.
//  4. L'Horloger: the automaton strikes on the tick-tock of the great pendulum; three gears jammed
//     at the right beat stop everything.
// Geometry, visuals and audio only; rules and sync live in js/levels/tr_d7.js.
const TrD7 = (() => {
  const O = V3(-700, 0, 9800);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;
  const rel = (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z);
  const glow = LvKit.glow;

  // ---------- layout (relative to O) ----------
  const C1 = { x: 0, z: 40 };
  const NI = { r0: 16.6, r1: 21, w: 3.4, y: -1.2, roof: 3.6 };
  const MIN_LEN = 16.5;
  const HR_LEN = 11.2;
  // the crank stands on a pulpit above the hall floor, so whoever turns it can watch the dial
  const PUL = { x0: -6.0, x1: -2.4, z0: 3.4, z1: 7.4, y: 6.16, sx1: -4.2, n: 14 };
  const CRANK = V3(-4.6, PUL.y, 5.6);
  const CRANK_SPOT = V3(-3.4, PUL.y, 4.4);
  const CTRL = V3(-5.6, PUL.y + 1.55, 4.35);
  const CTRL_RY = 2.55;
  // part 2
  const PL_A = [V3(-6, 0, 77), V3(6, 0, 77)];
  const PL_F = V3(0, 0, 102.5);
  const BR = { z0: 84, z1: 97, hw: 1.6 };
  const LANE = { z0: 108, z1: 142, hw: 2 };
  const GATES2 = [115, 123, 131];
  const PL_B = [V3(-5.3, 0, 115), V3(-5.3, 0, 123), V3(-5.3, 0, 131)];
  // part 3
  const L3 = { z0: 142, z1: 152 };
  const J1 = V3(-4.6, 0, 147.5);
  const DEB = [
    [0, 0.9, 155, 2.6, 2.4],
    [-2.4, 2.1, 158.8, 2.2, 2.2],
    [0.2, 3.2, 162.4, 2.2, 2.0],
    [2.8, 4.2, 165.8, 2.4, 2.2],
    [0.6, 5.2, 169.4, 2.2, 2.0],
    [-1.6, 6.2, 173.0, 2.2, 2.2],
  ];
  const LEDGE = { z0: 177, z1: 188, y: 7 };
  const LOCK = V3(3.6, 7, 180);
  const J2 = V3(-4.6, 7, 185);
  const DISCS = [V3(0, 7, 193.5), V3(0, 7, 205.5)];
  const DISC_R = 5;
  const PEND = [217, 223.5];
  const PEND_L = 10.4;
  const PEND_Y = 18.4;
  const FAR = { z0: 228, z1: 238, y: 7 };
  const J3 = V3(4.6, 7, 231.5);
  // part 4
  const C4 = V3(0, 7, 264);
  const AR = 17;
  const BOSS = V3(0, 7, 285.5);
  const ST_ANG = [-100, 100, 0].map((d) => (d * Math.PI) / 180);
  const stPos = (i, r = 14.2, off = 0) => {
    const a = ST_ANG[i];
    const u = [Math.sin(a), Math.cos(a)];
    const w = [Math.cos(a), -Math.sin(a)];
    return V3(C4.x + u[0] * r + w[0] * off, C4.y, C4.z + u[1] * r + w[1] * off);
  };
  const PIV = V3(0, 7 + 44, 264);
  const PEND4_L = 36;

  // hour a (float, 0..12) → horizontal direction; XII is +z, III is to the right of someone
  // facing XII from VI (that is -x)
  const hourDir = (a) => {
    const t = (a * Math.PI) / 6;
    return [-Math.sin(t), Math.cos(t)];
  };
  const polar = (q) => {
    const dx = q.x - C1.x;
    const dz = q.z - C1.z;
    let a = (Math.atan2(-dx, dz) * 6) / Math.PI;
    if (a < 0) a += 12;
    return { r: Math.hypot(dx, dz), a };
  };
  const hourDist = (a, b) => {
    let d = (((a - b) % 12) + 12) % 12;
    return d > 6 ? 12 - d : d;
  };
  const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  // ---------- materials ----------
  // brass without black metal: a non-metal base with a warm fake environment in the shader
  const envify = (m, k, tag) => {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 vdE = normalize(vViewPosition);
          vec3 rvE = reflect(-vdE, normal);
          vec3 envE = mix(vec3(0.12, 0.05, 0.02), vec3(0.95, 0.66, 0.32), smoothstep(-0.4, 0.9, rvE.y));
          envE += vec3(0.55, 0.3, 0.1) * pow(max(0.0, 1.0 - abs(rvE.x - 0.35) * 1.6), 8.0);
          float frE = pow(1.0 - clamp(dot(normal, vdE), 0.0, 1.0), 2.4);
          totalEmissiveRadiance += envE * diffuseColor.rgb * (${k.toFixed(3)} * (0.3 + 0.7 * frE));
        }`,
      );
    };
    m.customProgramCacheKey = () => 'd7env-' + tag;
    return m;
  };
  let M = null;
  const mats = () => {
    if (M) return M;
    M = {
      brass: envify(Tex.mat('metal', { color: '#dcab57', scale: 2.2, metal: 0.12, rough: 0.46, emissive: '#1c0f04' }), 0.55, 'b'),
      brassL: envify(Tex.mat('metal', { color: '#e9c27a', scale: 1.4, metal: 0.1, rough: 0.42, emissive: '#22130a' }), 0.6, 'bl'),
      dark: envify(Tex.mat('metal', { color: '#7c5726', scale: 2.6, metal: 0.1, rough: 0.55, emissive: '#0e0703' }), 0.4, 'd'),
      copper: envify(Tex.mat('metal', { color: '#c4774c', scale: 2, metal: 0.1, rough: 0.5, emissive: '#170803' }), 0.45, 'c'),
      wood: Tex.mat('wood', { color: '#8a5a36', scale: 2.6, rough: 0.7 }),
      floor: Tex.mat('marble', { color: '#a88c6a', scale: 5, rough: 0.6 }),
      floorD: Tex.mat('marble', { color: '#6f4b3a', scale: 4, rough: 0.6 }),
      plaster: Tex.mat('plaster', { color: '#8f6e55', scale: 7, rough: 0.9 }),
      stone: Tex.mat('stone', { color: '#a28366', scale: 4, rough: 0.85 }),
      iron: Tex.mat('metal', { color: '#5a4a44', scale: 2, metal: 0.05, rough: 0.6 }),
    };
    return M;
  };

  // ---------- small geometry helpers ----------
  const heartPts = (s, n = 48) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push(new THREE.Vector2((x / 17) * s, (y / 17) * s + s * 0.1));
    }
    return pts;
  };
  const heartShape = (s) => new THREE.Shape(heartPts(s));
  const geoCache = new Map();
  const gearGeo = (R, n, th, thick, opt = {}) => {
    const key = [R, n, th, thick, opt.heart ? 1 : 0, opt.holes || 0].join(',');
    if (geoCache.has(key)) return geoCache.get(key);
    const s = new THREE.Shape();
    const r0 = R - th;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a = TAU / n;
      const pts = [
        [r0, a0],
        [R, a0 + a * 0.22],
        [R, a0 + a * 0.48],
        [r0, a0 + a * 0.7],
      ];
      pts.forEach(([r, aa], k) => {
        const x = Math.cos(aa) * r;
        const y = Math.sin(aa) * r;
        if (i === 0 && k === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
    }
    s.closePath();
    const hub = new THREE.Path();
    hub.absarc(0, 0, R * 0.14, 0, TAU, true);
    s.holes.push(hub);
    const nh = opt.holes || 0;
    for (let i = 0; i < nh; i++) {
      const a = (i / nh) * TAU + 0.3;
      const cx = Math.cos(a) * R * 0.52;
      const cy = Math.sin(a) * R * 0.52;
      const h = new THREE.Path();
      if (opt.heart) {
        const pts = heartPts(R * 0.2, 28).map((p) => {
          // the heart points outward along the spoke
          const c = Math.cos(a - Math.PI / 2);
          const sn = Math.sin(a - Math.PI / 2);
          return new THREE.Vector2(cx + p.x * c - p.y * sn, cy + p.x * sn + p.y * c);
        });
        h.setFromPoints(pts);
      } else h.absarc(cx, cy, R * 0.2, 0, TAU, true);
      s.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(s, {
      depth: thick,
      bevelEnabled: true,
      bevelThickness: Math.min(0.12, thick * 0.15),
      bevelSize: Math.min(0.08, thick * 0.1),
      bevelSegments: 1,
      curveSegments: 5,
    });
    g.translate(0, 0, -thick / 2);
    geoCache.set(key, g);
    return g;
  };
  // a flat hand (lies in XZ, length along +z, top at y = 0)
  const handGeo = (prof, thick) => {
    const s = new THREE.Shape();
    const L = prof.map(([y, hw]) => [hw, y]);
    const Rr = prof
      .slice()
      .reverse()
      .map(([y, hw]) => [-hw, y]);
    [...L, ...Rr].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
    g.rotateX(Math.PI / 2);
    g.translate(0, -0.05, 0);
    return g;
  };
  const setBox = (b, x, y, z, sx, sy, sz) => {
    b.min[0] = O.x + x - sx / 2;
    b.max[0] = O.x + x + sx / 2;
    b.min[1] = O.y + y - sy / 2;
    b.max[1] = O.y + y + sy / 2;
    b.min[2] = O.z + z - sz / 2;
    b.max[2] = O.z + z + sz / 2;
  };
  // a rotated rectangle filled with small boxes (u = long axis)
  const fillRect = (cx, cz, ux, uz, len, wid, y0, y1, cell = 0.5, opt) => {
    const out = [];
    const px = -uz;
    const pz = ux;
    const nl = Math.max(1, Math.round(len / cell));
    const nw = Math.max(1, Math.round(wid / cell));
    const sl = len / nl;
    const sw = wid / nw;
    const s = Math.max(sl, sw) * (Math.abs(ux) > 0.999 || Math.abs(uz) > 0.999 ? 1.0 : 1.42);
    for (let i = 0; i < nl; i++)
      for (let j = 0; j < nw; j++) {
        const l = -len / 2 + sl * (i + 0.5);
        const w = -wid / 2 + sw * (j + 0.5);
        out.push(K.collider(cx + ux * l + px * w, (y0 + y1) / 2, cz + uz * l + pz * w, s, y1 - y0, s, opt));
      }
    return out;
  };
  const lineWall = (x0, z0, x1, z1, th, y0, y1, opt) => {
    const out = [];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.ceil(len / (th * 0.7)));
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      out.push(K.collider(x0 + (x1 - x0) * k, (y0 + y1) / 2, z0 + (z1 - z0) * k, th, y1 - y0, th, opt));
    }
    return out;
  };
  // a disc of radius r (top at y) made of strips
  const discCol = (cx, y, cz, r, n = 9) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const z0 = -r + (2 * r * i) / n;
      const z1 = -r + (2 * r * (i + 1)) / n;
      const zm = Math.min(Math.abs(z0), Math.abs(z1));
      const hw = Math.sqrt(Math.max(0, r * r - zm * zm));
      out.push(K.collider(cx, y - 0.25, cz + (z0 + z1) / 2, hw * 2, 0.5, z1 - z0));
    }
    return out;
  };
  const deco = (geo, mat, x, y, z, ry = 0) => {
    const m = K.deco(geo, mat, x, y, z);
    m.rotation.y = ry;
    return m;
  };
  const slab = (x, y, z, sx, sy, sz, mat) => K.solid(x, y, z, sx, sy, sz, mat);
  const addMat = (c, k = 1, op = 1) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(c).multiplyScalar(k),
      transparent: true,
      opacity: op,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

  // warnings drawn over the bright dial floor: plain blending (additive vanishes on a light floor)
  const warnMat = (c, op) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  // a canvas clock face: numerals, minute ticks, a heart in the middle (amber translucent glass)
  const dialTex = (opt = {}) =>
    LvKit.tex(1024, 1024, (g, w, h) => {
      const c = w / 2;
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(c, c, 40, c, c, c);
      gr.addColorStop(0, opt.core || 'rgba(255,214,150,0.75)');
      gr.addColorStop(0.75, opt.mid || 'rgba(214,140,60,0.55)');
      gr.addColorStop(1, 'rgba(120,60,20,0.15)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(c, c, c - 6, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(60,30,10,0.85)';
      g.lineWidth = 16;
      g.beginPath();
      g.arc(c, c, c - 14, 0, TAU);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath();
      g.arc(c, c, c * 0.7, 0, TAU);
      g.stroke();
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU;
        const r0 = c - 30;
        const r1 = i % 5 ? c - 52 : c - 80;
        g.lineWidth = i % 5 ? 4 : 10;
        g.beginPath();
        g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
        g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
        g.stroke();
      }
      g.fillStyle = 'rgba(50,22,8,0.92)';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 84px Georgia';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const r = c * 0.79;
        g.save();
        g.translate(c + Math.sin(a) * r, c - Math.cos(a) * r);
        g.rotate(a);
        g.fillText(ROMAN[i], 0, 0);
        g.restore();
      }
      if (opt.heart !== false) {
        g.save();
        g.translate(c, c + 10);
        g.fillStyle = 'rgba(200,40,70,0.55)';
        g.beginPath();
        heartPts(70, 60).forEach((p, i) => (i ? g.lineTo(p.x, -p.y) : g.moveTo(p.x, -p.y)));
        g.closePath();
        g.fill();
        g.restore();
      }
    });

  // ---------- audio: the tower's own little synth (tick-tock, gears, sand, a single note) ----------
  const au = (() => {
    let ctx = null;
    let out = null;
    let verb = null;
    let nb = null;
    let hiss = null;
    let drone = null;
    let duck = 1;
    const init = () => {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
      } catch (e) {
        return false;
      }
      out = ctx.createGain();
      out.gain.value = (typeof SETTINGS !== 'undefined' ? SETTINGS.vol : 0.8) * 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      out.connect(comp).connect(ctx.destination);
      verb = ctx.createConvolver();
      const len = ctx.sampleRate * 2.6;
      const b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      }
      verb.buffer = b;
      const wet = ctx.createGain();
      wet.gain.value = 0.4;
      verb.connect(wet).connect(out);
      nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    };
    const pan = (pos, ref = 6) => {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'exponential';
      p.refDistance = ref;
      p.rolloffFactor = 1;
      p.maxDistance = 300;
      if (p.positionX) {
        p.positionX.value = pos.x;
        p.positionY.value = pos.y;
        p.positionZ.value = pos.z;
      } else p.setPosition(pos.x, pos.y, pos.z);
      p.connect(out);
      p.connect(verb);
      return p;
    };
    const dest = (pos, ref) => (pos ? pan(pos, ref) : out);
    const env = (g, t, a, v, dcy) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
    };
    const osc = (type, f, t, a, v, dcy, to, f1) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + dcy);
      const g = ctx.createGain();
      env(g, t, a, v, dcy);
      o.connect(g).connect(to);
      o.start(t);
      o.stop(t + a + dcy + 0.05);
    };
    const noise = (t, dur, f, q, v, to, type = 'bandpass', f1) => {
      const n = ctx.createBufferSource();
      n.buffer = nb;
      const fl = ctx.createBiquadFilter();
      fl.type = type;
      fl.frequency.setValueAtTime(f, t);
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      fl.Q.value = q;
      const g = ctx.createGain();
      env(g, t, Math.min(0.004, dur * 0.2), v, dur);
      n.connect(fl).connect(g).connect(to);
      n.start(t, Math.random() * 1.5);
      n.stop(t + dur + 0.05);
    };
    const now = () => ctx.currentTime + 0.01;
    const api = {
      init,
      get on() {
        return !!ctx;
      },
      listener(cam) {
        if (!ctx) return;
        const l = ctx.listener;
        const p = cam.position;
        const f = V3(0, 0, -1).applyQuaternion(cam.quaternion);
        if (l.positionX) {
          l.positionX.value = p.x;
          l.positionY.value = p.y;
          l.positionZ.value = p.z;
          l.forwardX.value = f.x;
          l.forwardY.value = f.y;
          l.forwardZ.value = f.z;
          l.upX.value = 0;
          l.upY.value = 1;
          l.upZ.value = 0;
        } else {
          l.setPosition(p.x, p.y, p.z);
          l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
        }
      },
      // the tower clock: a bright tick, a lower tock, a wooden body
      tick(pos, tock, v = 1, pitch = 1) {
        if (!ctx || duck < 0.05) return;
        const t = now();
        const to = dest(pos, 10);
        v *= duck;
        noise(t, 0.03, (tock ? 1500 : 3100) * pitch, 6, 0.5 * v, to);
        osc('sine', (tock ? 640 : 1220) * pitch, t, 0.002, 0.16 * v, 0.07, to);
        osc('triangle', (tock ? 180 : 240) * pitch, t, 0.003, 0.12 * v, 0.12, to);
      },
      ratchet(pos, v = 1) {
        if (!ctx) return;
        const t = now();
        const to = dest(pos, 5);
        noise(t, 0.025, 2400, 3, 0.35 * v, to);
        osc('square', 90, t, 0.002, 0.04 * v, 0.04, to);
      },
      clunk(pos, v = 1) {
        if (!ctx) return;
        const t = now();
        const to = dest(pos, 8);
        [220, 557, 1130, 2210].forEach((f, i) => osc('sine', f, t, 0.002, (0.22 / (i + 1)) * v, 0.5 - i * 0.08, to));
        noise(t, 0.12, 900, 1.2, 0.4 * v, to, 'lowpass');
        noise(t + 0.03, 0.5, 4000, 0.8, 0.12 * v, to, 'highpass');
      },
      boom(pos, v = 1) {
        if (!ctx) return;
        const t = now();
        const to = dest(pos, 14);
        osc('sine', 70, t, 0.005, 0.7 * v, 0.9, to, 34);
        noise(t, 0.4, 300, 0.8, 0.6 * v, to, 'lowpass', 60);
        [180, 460, 905].forEach((f, i) => osc('sine', f, t, 0.002, 0.12 / (i + 1), 1.2, to));
      },
      whoosh(pos, v = 1, up = false) {
        if (!ctx) return;
        const t = now();
        noise(t, 0.6, up ? 300 : 1800, 1.4, 0.4 * v, dest(pos, 8), 'bandpass', up ? 1800 : 260);
      },
      chime(pos, base = 0, v = 1) {
        if (!ctx) return;
        const t = now();
        const to = dest(pos, 8);
        [0, 4, 7, 12].forEach((s, i) => {
          const f = 523.25 * Math.pow(2, (base + s) / 12);
          osc('sine', f, t + i * 0.09, 0.005, 0.12 * v, 1.4, to);
          osc('sine', f * 2.76, t + i * 0.09, 0.003, 0.03 * v, 0.6, to);
        });
      },
      shimmer(pos, rev = false) {
        if (!ctx) return;
        const t = now();
        const to = dest(pos, 6);
        const sc = [0, 3, 5, 7, 10, 12, 15];
        sc.forEach((s, i) => {
          const k = rev ? sc.length - 1 - i : i;
          osc('sine', 392 * Math.pow(2, sc[k] / 12), t + i * 0.06, 0.01, 0.07, 0.9, to);
        });
      },
      // time slows: a falling sweep and a heavy sigh; and back
      slow(on) {
        if (!ctx) return;
        const t = now();
        if (on) {
          osc('sawtooth', 220, t, 0.02, 0.12, 1.1, out, 38);
          osc('sine', 110, t, 0.05, 0.3, 1.6, out, 28);
          noise(t, 1.2, 2400, 0.9, 0.3, out, 'lowpass', 120);
        } else {
          osc('sine', 40, t, 0.05, 0.25, 0.6, out, 160);
          noise(t, 0.5, 200, 0.9, 0.2, out, 'lowpass', 2400);
        }
      },
      grind(pos, v = 1) {
        if (!ctx) return;
        const t = now();
        const to = dest(pos, 8);
        for (let i = 0; i < 5; i++) noise(t + i * 0.05, 0.05, 1200 + Math.random() * 1500, 4, 0.2 * v, to);
        osc('sawtooth', 70, t, 0.01, 0.06 * v, 0.3, to, 50);
      },
      // the one note when everything stops
      note() {
        if (!ctx) return;
        const t = now();
        const f = 440;
        [
          [1, 0.32, 7],
          [2, 0.08, 4.5],
          [2.76, 0.05, 3.2],
          [5.4, 0.018, 1.8],
          [1.003, 0.16, 7],
        ].forEach(([k, v, d]) => osc('sine', f * k, t, 0.004, v, d, out));
        const g = ctx.createGain();
        g.gain.value = 0.5;
        osc('sine', f, t, 0.004, 0.2, 7, verb);
      },
      // sand curtains: a hiss that swells near them (only the walker hears it)
      hiss(v) {
        if (!ctx) return;
        if (!hiss) {
          const n = ctx.createBufferSource();
          n.buffer = nb;
          n.loop = true;
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 5200;
          f.Q.value = 0.6;
          const g = ctx.createGain();
          g.gain.value = 0;
          n.connect(f).connect(g).connect(out);
          n.start();
          hiss = g;
        }
        hiss.gain.setTargetAtTime(v * 0.16 * duck, ctx.currentTime, 0.15);
      },
      // the low machinery bed; k 0..1, pitch follows the speed of time
      drone(k, pitch = 1) {
        if (!ctx) return;
        if (!drone) {
          const o1 = ctx.createOscillator();
          const o2 = ctx.createOscillator();
          o1.type = 'sawtooth';
          o2.type = 'triangle';
          o1.frequency.value = 41;
          o2.frequency.value = 61.7;
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 160;
          const g = ctx.createGain();
          g.gain.value = 0;
          o1.connect(lp);
          o2.connect(lp);
          lp.connect(g).connect(out);
          o1.start();
          o2.start();
          drone = { g, o1, o2, lp };
        }
        const t = ctx.currentTime;
        drone.g.gain.setTargetAtTime(k * 0.07 * duck, t, 0.3);
        drone.o1.frequency.setTargetAtTime(41 * pitch, t, 0.2);
        drone.o2.frequency.setTargetAtTime(61.7 * pitch, t, 0.2);
        drone.lp.frequency.setTargetAtTime(120 + 120 * pitch, t, 0.2);
      },
      set duck(v) {
        duck = v;
      },
      get duck() {
        return duck;
      },
      stopAll() {
        if (!ctx) return;
        if (hiss) hiss.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        if (drone) drone.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      },
      volume(v) {
        if (out) out.gain.value = v * 0.9;
      },
    };
    return api;
  })();

  // ---------- environment: the tower, the clouds, the dust of hours ----------
  let cloudU = null;
  let motes = null;
  let streams = [];
  const wallGears = [];
  const shafts = [];
  const buildTower = () => {
    const m = mats();
    // the side walls of the tower (decor, far out) with giant translucent dials and gears
    [-1, 1].forEach((s) => {
      const w = deco(new THREE.BoxGeometry(3, 110, 340), m.plaster, s * 52, -25, 140);
      w.userData.wall = true;
      // pilasters and cornices
      for (let z = -10; z <= 300; z += 34) {
        deco(new THREE.BoxGeometry(3, 110, 4), m.stone, s * 50.2, -25, z);
        deco(new THREE.BoxGeometry(2.4, 1.6, 4.6), m.dark, s * 49.6, 22, z);
      }
      deco(new THREE.BoxGeometry(2, 2.4, 340), m.dark, s * 50, 22, 140);
      deco(new THREE.BoxGeometry(2, 1.4, 340), m.brass, s * 50, -6, 140);
    });
    deco(new THREE.BoxGeometry(110, 110, 3), m.plaster, 0, -25, -16);
    deco(new THREE.BoxGeometry(110, 110, 3), m.plaster, 0, -25, 304);
    // the ceiling: crossing beams far above
    for (let z = -10; z <= 300; z += 22) deco(new THREE.BoxGeometry(104, 2.2, 2.2), m.dark, 0, 34, z);
    for (let x = -40; x <= 40; x += 20) deco(new THREE.BoxGeometry(1.6, 1.6, 320), m.dark, x, 35.5, 140);
    // giant dials in the walls, lit from behind (the amber light of the place)
    const dt = dialTex({});
    const dialM = new THREE.MeshBasicMaterial({ map: dt, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
    dialM.color.setScalar(0.72);
    [
      [-1, 40, 6, 15],
      [1, 112, 4, 13],
      [-1, 200, 10, 14],
      [1, 262, 12, 16],
      [-1, 290, -2, 11],
      [1, 30, -10, 10],
    ].forEach(([s, z, y, r]) => {
      const d = deco(new THREE.CircleGeometry(r, 64), dialM, s * 50.4, y, z);
      d.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      const ring = deco(new THREE.TorusGeometry(r, 0.55, 10, 72), m.brass, s * 50.2, y, z);
      ring.rotation.y = Math.PI / 2;
      // hands on the wall dials (slowly running)
      const hg = new THREE.Group();
      hg.position.copy(P(s * 50.0, y, z));
      hg.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      const hm = new THREE.Mesh(new THREE.BoxGeometry(0.5, r * 0.8, 0.2).translate(0, r * 0.38, 0), m.dark);
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.7, r * 0.55, 0.2).translate(0, r * 0.25, 0.15), m.dark);
      hg.add(hm, hh);
      group.add(hg);
      wallGears.push({ g: hm, k: 0.05 * (r / 12), axis: 'z' }, { g: hh, k: 0.004, axis: 'z' });
      // a shaft of light falling from the dial into the tower
      const sh = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 1.3, r * 0.8, 60, 24, 1, true).rotateZ(Math.PI / 2).translate(-30, 0, 0),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          uniforms: { uK: { value: 0.11 }, uT: { value: 0 } },
          vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vW = -mv.xyz; gl_Position = projectionMatrix * mv; }',
          fragmentShader:
            'uniform float uK; uniform float uT; varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ float along = clamp(-vP.x / 60.0, 0.0, 1.0); float f = abs(dot(normalize(vW), vN)); float dust = 0.75 + 0.25 * sin(vP.y * 0.7 + vP.z * 0.5 + uT * 0.6); gl_FragColor = vec4(vec3(1.0, 0.68, 0.34) * uK * (1.0 - along) * f * dust, 1.0); }',
        }),
      );
      sh.position.copy(P(s * 50, y, z));
      sh.rotation.set(0, s > 0 ? 0 : Math.PI, 0.32);
      group.add(sh);
      shafts.push(sh);
    });
    // giant gears on the walls, turning slowly
    const gspec = [
      [-1, 70, 18, 9, 48],
      [-1, 88, -8, 6, 32],
      [1, 70, -2, 11, 56],
      [1, 150, 18, 8, 40],
      [-1, 150, 2, 12, 60],
      [1, 182, -12, 7, 36],
      [-1, 236, 20, 9, 44],
      [1, 230, 14, 6, 30],
      [-1, 120, -22, 14, 70],
      [1, 300, 20, 10, 50],
    ];
    gspec.forEach(([s, z, y, r, n], i) => {
      const g = deco(gearGeo(r, n, Math.max(0.6, r * 0.08), 1.2, { holes: 6, heart: i % 3 === 0 }), i % 2 ? m.brass : m.copper, s * 48.2, y, z);
      g.rotation.y = Math.PI / 2;
      wallGears.push({ g, k: ((i % 2 ? 1 : -1) * 0.6) / r, axis: 'z' });
    });
    // big vertical drive shafts rising from the void
    [
      [-34, 20],
      [34, 60],
      [-30, 130],
      [32, 176],
      [-34, 248],
      [34, 280],
    ].forEach(([x, z]) => {
      deco(new THREE.CylinderGeometry(1.1, 1.1, 110, 14), m.dark, x, -20, z);
      for (let y = -40; y < 30; y += 14) deco(new THREE.TorusGeometry(1.25, 0.18, 8, 24).rotateX(Math.PI / 2), m.brass, x, y, z);
      const g = deco(gearGeo(5.5, 30, 0.6, 0.8, { holes: 5, heart: true }), m.brass, x, 12 + (z % 7), z);
      g.rotation.x = -Math.PI / 2;
      wallGears.push({ g, k: 0.25, axis: 'z' });
    });
    // the sea of clouds far below
    cloudU = { uTime: { value: 0 }, uSlow: { value: 1 } };
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: cloudU,
        transparent: true,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime;
          varying vec2 vP;
          float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3. - 2. * f);
            return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y);
          }
          void main() {
            vec2 p = vP * 0.022;
            float v = 0.;
            float a = 0.5;
            for (int i = 0; i < 5; i++) { v += a * n(p + vec2(uTime * 0.01 * float(i + 1), uTime * 0.004)); p *= 2.07; a *= 0.5; }
            float edgeF = 1. - smoothstep(200., 340., length(vP));
            vec3 c = mix(vec3(0.16, 0.07, 0.06), vec3(0.85, 0.5, 0.28), smoothstep(0.38, 0.86, v));
            c += vec3(0.3, 0.12, 0.05) * smoothstep(0.7, 0.95, v);
            gl_FragColor = vec4(c * 0.8, smoothstep(0.25, 0.7, v) * 0.92 * edgeF);
          }`,
      }),
    );
    clouds.position.copy(P(0, -46, 140));
    group.add(clouds);
    const deep = new THREE.Mesh(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2a1208', fog: false }));
    deep.position.copy(P(0, -60, 140));
    group.add(deep);
    // dust of hours: golden motes floating everywhere around the camera
    const n = 2600;
    const pos = new Float32Array(n * 3);
    const sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 60 - 30;
      pos[i * 3 + 1] = Math.random() * 30 - 12;
      pos[i * 3 + 2] = Math.random() * 60 - 30;
      sd[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
    motes = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uCam: { value: V3() }, uPx: { value: 1 }, uK: { value: 1 } },
        vertexShader: `
          attribute float aS;
          uniform float uT; uniform vec3 uCam; uniform float uPx;
          varying float vA;
          void main() {
            vec3 p = position;
            p.y -= uT * (0.35 + aS * 0.5);
            p.x += sin(uT * 0.3 + aS * 40.0) * 1.2;
            p.z += cos(uT * 0.25 + aS * 31.0) * 1.2;
            vec3 w = mod(p - uCam + vec3(30.0, 12.0, 30.0), vec3(60.0, 30.0, 60.0)) + uCam - vec3(30.0, 12.0, 30.0);
            vec4 mv = modelViewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            float d = -mv.z;
            vA = smoothstep(32.0, 6.0, d) * (0.45 + 0.55 * aS);
            gl_PointSize = uPx * (1.6 + aS * 2.4) * 22.0 / max(2.0, d);
          }`,
        fragmentShader: `
          varying float vA;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float k = smoothstep(0.5, 0.0, length(c));
            gl_FragColor = vec4(vec3(1.0, 0.72, 0.34) * 0.75, k * vA);
          }`,
      }),
    );
    motes.frustumCulled = false;
    group.add(motes);
    // decorative falling sand streams (gold, always visible)
    const sandTex = LvKit.tex(64, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const x = w / 2 + (Math.random() - 0.5) * w * 0.7 * Math.random();
        const y = Math.random() * h;
        g.fillStyle = `rgba(255,${180 + Math.random() * 60},${90 + Math.random() * 60},${0.2 + Math.random() * 0.5})`;
        g.fillRect(x, y, 1.5, 3 + Math.random() * 8);
      }
    });
    sandTex.repeat.set(1, 3);
    [
      [-22, 20],
      [24, 46],
      [-14, 100],
      [16, 150],
      [-20, 210],
      [20, 250],
      [-26, 278],
    ].forEach(([x, z], i) => {
      const t = sandTex.clone();
      t.needsUpdate = true;
      t.repeat.set(1, 4);
      const mm = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
      mm.color.setScalar(0.7);
      const s = deco(new THREE.CylinderGeometry(0.35, 0.5, 80, 8, 1, true), mm, x, -5, z);
      streams.push({ t, k: 0.6 + (i % 3) * 0.2 });
    });
  };

  // ---------- part 0 + 1: the hall and the great dial ----------
  const S1 = {
    minG: null,
    hrG: null,
    minBox: [],
    hrBox: [],
    gates: [],
    niches: [],
    cone: null,
    coneBox: null,
    hubBox: null,
    curtains: [],
    beam: null,
    ctrl: null,
    ctrlKey: '',
    plaques: [],
    crankG: null,
    deep: [],
    exitDoor: null,
  };
  let screen = null;
  const MIN_PROF = [
    [-2.7, 0],
    [-2.4, 0.95],
    [-1.5, 1.25],
    [-0.6, 0.95],
    [0, 0.85],
    [2, 0.8],
    [9, 0.85],
    [10.2, 1.18],
    [11.4, 0.85],
    [15.1, 0.8],
    [15.9, 0.5],
    [16.5, 0.06],
  ];
  const HR_PROF = [
    [-2.1, 0],
    [-1.8, 1.1],
    [-0.9, 1.3],
    [0, 1.02],
    [6, 1.0],
    [7.2, 1.55],
    [8.4, 1.0],
    [10.4, 0.9],
    [11.2, 0.06],
  ];
  const buildHall = () => {
    const m = mats();
    // entrance floor with a parapet toward the dial
    slab(0, -0.25, 1, 12, 0.5, 14, m.floor);
    slab(0, -1.5, 1, 12.6, 2, 14.6, m.stone);
    slab(-6.25, 1.6, 1, 0.5, 3.2, 14, m.stone);
    slab(6.25, 1.6, 1, 0.5, 3.2, 14, m.stone);
    slab(0, 3, -6.2, 13, 6, 0.6, m.plaster);
    // parapet on the dial side, open at the walkway
    slab(-3.9, 0.6, 7.8, 4.2, 1.2, 0.5, m.stone);
    slab(3.9, 0.6, 7.8, 4.2, 1.2, 0.5, m.stone);
    deco(new THREE.BoxGeometry(4.3, 0.14, 0.6), m.brass, -3.9, 1.25, 7.8);
    deco(new THREE.BoxGeometry(4.3, 0.14, 0.6), m.brass, 3.9, 1.25, 7.8);
    // brass inlay: a big heart on the floor
    const hs = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(2.2)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c99a4a').multiplyScalar(0.55), toneMapped: false }));
    hs.position.copy(P(1.6, 0.02, -1.5));
    group.add(hs);
    // the screen
    screen = makeScreen(7, 3, 1024);
    screen.mesh.position.copy(P(0, 3.6, -5.85));
    group.add(screen.mesh);
    deco(new THREE.BoxGeometry(7.4, 3.4, 0.2), m.dark, 0, 3.6, -5.95);
    // walkway to the VI niche (down three steps to the niche floor)
    slab(0, -0.25, 12.5, 3.4, 0.5, 9, m.floorD);
    slab(0, -0.4 - 0.25, 17.5, 3.4, 0.5, 1, m.floorD);
    slab(0, -0.8 - 0.25, 18.5, 3.4, 0.5, 1, m.floorD);
    [-1, 1].forEach((s) => {
      slab(s * 1.95, 0.5, 13, 0.5, 1, 10, m.stone);
      deco(new THREE.BoxGeometry(0.6, 0.12, 10), m.brass, s * 1.95, 1.05, 13);
    });
    // the pulpit: a stone stair along the west wall up to a balcony that overlooks the dial
    {
      const cx = (PUL.x0 + PUL.x1) / 2;
      const cz = (PUL.z0 + PUL.z1) / 2;
      const H = PUL.y;
      slab(cx, H - 0.3, cz, PUL.x1 - PUL.x0, 0.6, PUL.z1 - PUL.z0, m.stone);
      deco(new THREE.BoxGeometry(PUL.x1 - PUL.x0 - 0.1, 0.06, PUL.z1 - PUL.z0 - 0.1), m.floorD, cx, H + 0.03, cz);
      // pillars and brackets under the balcony
      [
        [PUL.x1 - 0.35, PUL.z0 + 0.35],
        [PUL.x1 - 0.35, PUL.z1 - 0.35],
      ].forEach(([x, z]) => {
        slab(x, (H - 0.6) / 2, z, 0.6, H - 0.6, 0.6, m.stone);
        deco(new THREE.BoxGeometry(0.8, 0.3, 0.8), m.brass, x, H - 0.75, z);
      });
      const sxc = (PUL.x0 + PUL.sx1) / 2;
      const sw = PUL.sx1 - PUL.x0;
      for (let k = 0; k < PUL.n - 1; k++) {
        const top = 0.44 * (k + 1);
        const z1 = PUL.z0 - (PUL.n - 2 - k) * 0.62;
        slab(sxc, top / 2, z1 - 0.31, sw, top, 0.62, k % 2 ? m.floorD : m.stone);
        deco(new THREE.BoxGeometry(sw, 0.05, 0.08), m.brass, sxc, top + 0.02, z1 - 0.6);
      }
      // the hall's west wall rises with the stair; rails around the balcony (the stair stays open)
      slab(-6.25, (3.2 + H + 1.4) / 2, (PUL.z0 - (PUL.n - 1) * 0.62 + PUL.z1) / 2, 0.5, H + 1.4 - 3.2, PUL.z1 - PUL.z0 + (PUL.n - 1) * 0.62, m.plaster);
      slab(cx, H + 0.5, PUL.z1 - 0.1, PUL.x1 - PUL.x0, 1.0, 0.18, m.dark);
      slab(PUL.x1 - 0.1, H + 0.5, cz, 0.18, 1.0, PUL.z1 - PUL.z0, m.dark);
      slab((PUL.sx1 + PUL.x1) / 2, H + 0.5, PUL.z0 + 0.1, PUL.x1 - PUL.sx1, 1.0, 0.18, m.dark);
      // a rail along the open side of the stair
      for (let k = 3; k < PUL.n - 1; k += 1) {
        const top = 0.44 * (k + 1);
        const z1 = PUL.z0 - (PUL.n - 2 - k) * 0.62;
        slab(PUL.sx1 + 0.08, top + 0.5, z1 - 0.31, 0.16, 1.0, 0.64, m.dark);
      }
      deco(new THREE.BoxGeometry(PUL.x1 - PUL.x0 + 0.2, 0.1, 0.3), m.brass, cx, H + 1.04, PUL.z1 - 0.1);
      deco(new THREE.BoxGeometry(0.3, 0.1, PUL.z1 - PUL.z0), m.brass, PUL.x1 - 0.1, H + 1.04, cz);
      LvKit.light(group, P(cx + 1, H + 3, cz), '#ffc890', 0.9, 12);
    }
    // the crank (Valet) and its control dial
    const cg = new THREE.Group();
    cg.position.copy(P(CRANK.x, CRANK.y, CRANK.z));
    group.add(cg);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.0, 20), m.dark);
    ped.position.y = 0.5;
    cg.add(ped);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), m.brass);
    box.position.y = 1.3;
    cg.add(box);
    const wheel = new THREE.Group();
    wheel.position.set(0.62, 1.3, 0);
    const wg = new THREE.Mesh(gearGeo(0.55, 16, 0.08, 0.12, { holes: 4, heart: true }), m.brassL);
    wg.rotation.y = Math.PI / 2;
    wheel.add(wg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8).translate(0, 0, 0.35), m.dark);
    arm.position.x = 0.1;
    wheel.add(arm);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10).rotateZ(Math.PI / 2), m.wood);
    knob.position.set(0.3, 0, 0.72);
    wheel.add(knob);
    cg.add(wheel);
    S1.crankG = wheel;
    K.collider(CRANK.x, CRANK.y + 0.8, CRANK.z, 1.3, 1.6, 1.3);
    // control dial: a glass face drawn live (target only on the Valet's screen)
    const cc = document.createElement('canvas');
    cc.width = cc.height = 1080;
    const ct = new THREE.CanvasTexture(cc);
    ct.anisotropy = 8;
    const cm = new THREE.MeshBasicMaterial({ map: ct, transparent: true, toneMapped: false });
    cm.color.setScalar(0.78);
    const cmesh = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), cm);
    cmesh.position.copy(P(CTRL.x, CTRL.y, CTRL.z));
    cmesh.rotation.y = CTRL_RY;
    group.add(cmesh);
    const cr = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.08, 8, 64), m.brass);
    cr.position.copy(cmesh.position);
    cr.rotation.y = CTRL_RY;
    const cbk = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), m.dark);
    cbk.position.copy(cmesh.position).add(V3(-Math.sin(CTRL_RY) * 0.03, 0, -Math.cos(CTRL_RY) * 0.03));
    cbk.rotation.y = CTRL_RY + Math.PI;
    group.add(cbk);
    [cmesh, cr, cbk].forEach((o) => o.scale.setScalar(0.82));
    group.add(cr);
    deco(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), m.dark, CTRL.x, CTRL.y - 1.5, CTRL.z);
    S1.ctrl = { c: cc, g: cc.getContext('2d'), t: ct };
  };
  const drawCtrl = (m, target, curtains) => {
    const { g, c, t } = S1.ctrl;
    const W = c.width;
    const cx = W / 2;
    g.clearRect(0, 0, W, W);
    const gr = g.createRadialGradient(cx, cx, 30, cx, cx, cx);
    gr.addColorStop(0, 'rgba(255,220,160,0.95)');
    gr.addColorStop(1, 'rgba(190,120,50,0.9)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cx, cx - 4, 0, TAU);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // niches and the target
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const r = cx * 0.8;
      const x = cx + Math.sin(a) * r;
      const y = cx - Math.cos(a) * r;
      if (i === target) {
        g.fillStyle = 'rgba(200,30,60,0.9)';
        g.beginPath();
        g.arc(x, y, 78, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(255,240,200,1)';
        g.lineWidth = 8;
        g.stroke();
      }
      g.fillStyle = i === target ? '#fff4e0' : 'rgba(60,28,10,0.95)';
      g.font = `bold ${i === target ? 92 : 74}px Georgia`;
      g.fillText(ROMAN[i], x, y);
    }
    (curtains || []).forEach((h) => {
      const a = (h / 12) * TAU;
      g.strokeStyle = 'rgba(200,60,40,0.8)';
      g.lineWidth = 26;
      g.beginPath();
      g.moveTo(cx + Math.sin(a) * cx * 0.15, cx - Math.cos(a) * cx * 0.15);
      g.lineTo(cx + Math.sin(a) * cx * 0.66, cx - Math.cos(a) * cx * 0.66);
      g.stroke();
    });
    const hand = (a, len, w, col) => {
      g.save();
      g.translate(cx, cx);
      g.rotate(a);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(-w, 30);
      g.lineTo(-w * 0.7, -len * 0.85);
      g.lineTo(0, -len);
      g.lineTo(w * 0.7, -len * 0.85);
      g.lineTo(w, 30);
      g.closePath();
      g.fill();
      g.restore();
    };
    const mm = ((m % 720) + 720) % 720;
    hand(((mm % 60) / 60) * TAU, cx * 0.66, 22, 'rgba(40,20,8,0.95)');
    hand((mm / 720) * TAU, cx * 0.44, 30, 'rgba(110,40,20,0.95)');
    g.fillStyle = '#3a1c0a';
    g.beginPath();
    g.arc(cx, cx, 34, 0, TAU);
    g.fill();
    // digital-ish readout
    const hh = Math.floor(mm / 60) || 12;
    const mi = Math.round(mm % 60);
    g.fillStyle = 'rgba(60,24,8,0.9)';
    g.font = 'bold 70px "IBM Plex Mono", monospace';
    g.fillText(`${hh}:${String(mi % 60).padStart(2, '0')}`, cx, cx + 230);
    t.needsUpdate = true;
  };

  const buildDial = () => {
    const m = mats();
    const c = P(C1.x, 0, C1.z);
    // the abyss under the dial: the movement, lit amber from below
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(23, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: dialTex({ core: 'rgba(255,200,130,0.85)', mid: 'rgba(220,130,50,0.6)' }), transparent: true, depthWrite: false, toneMapped: false }),
    );
    glass.material.color.setScalar(0.6);
    glass.rotation.y = Math.PI;
    glass.position.copy(P(C1.x, -17, C1.z));
    group.add(glass);
    [
      [-24, 10, 72, 0.05],
      [-30, 16, 90, -0.03],
      [-36, 7, 40, 0.08],
    ].forEach(([y, r, n, k], i) => {
      const g = deco(gearGeo(r, n, 0.6, 1.0, { holes: 6, heart: i === 0 }), i === 1 ? m.copper : m.brass, C1.x + (i === 2 ? 12 : i === 1 ? -5 : 0), y, C1.z + (i === 2 ? -6 : 3));
      g.rotation.x = -Math.PI / 2;
      S1.deep.push({ g, k });
    });
    deco(new THREE.CylinderGeometry(1.25, 1.6, 40, 20), m.dark, C1.x, -20.6, C1.z);
    for (let y = -2; y > -36; y -= 5) deco(new THREE.TorusGeometry(1.4, 0.22, 8, 28).rotateX(Math.PI / 2), m.brass, C1.x, y, C1.z);
    LvKit.light(group, P(C1.x, -12, C1.z), '#ffb060', 2.2, 40);
    // the minute hand and the hour hand
    S1.minG = new THREE.Group();
    S1.minG.position.copy(c);
    S1.minG.add(new THREE.Mesh(handGeo(MIN_PROF, 0.34), m.brassL));
    const inl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 14.4).rotateX(-Math.PI / 2).translate(0, 0.012, 8), glow('#ffcf8a', 0.72));
    S1.minG.add(inl);
    const mh = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.85)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(0.7), toneMapped: false }));
    mh.rotation.y = Math.PI;
    mh.position.set(0, 0.015, -1.55);
    S1.minG.add(mh);
    group.add(S1.minG);
    S1.hrG = new THREE.Group();
    S1.hrG.position.copy(c);
    const hm = new THREE.Mesh(handGeo(HR_PROF, 0.4), m.copper);
    hm.position.y = -0.04;
    S1.hrG.add(hm);
    const hinl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 9.6).rotateX(-Math.PI / 2).translate(0, -0.028, 5.4), glow('#ff9a6a', 0.62));
    S1.hrG.add(hinl);
    group.add(S1.hrG);
    for (let r = -1.8; r <= 15.95; r += 0.9) S1.minBox.push({ r, b: Phys.box(0, 0, 0, 1, 1, 1, { dyn: true }) });
    for (let r = -1.4; r <= 10.65; r += 0.9) S1.hrBox.push({ r, b: Phys.box(0, 0, 0, 1, 1, 1, { dyn: true }) });
    // the spindle cap: a brass cone with a heart, that sinks when the clock is set right at the end
    const cone = new THREE.Group();
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.35, 2.6, 24), m.brass);
    cb.position.y = 1.3;
    cone.add(cb);
    const hb = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.7), { depth: 0.25, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: '#b8203c', roughness: 0.4, emissive: '#5a0716' }));
    hb.geometry.translate(0, 0, -0.12);
    hb.position.y = 3.0;
    cone.add(hb);
    cone.position.copy(c);
    group.add(cone);
    S1.cone = cone;
    S1.coneHeart = hb;
    S1.coneBox = K.collider(C1.x, 1.5, C1.z, 2.3, 3, 2.3);
    S1.hubBox = K.collider(C1.x, -0.25, C1.z, 3.0, 0.5, 3.0);
    S1.hubBox.on = false;
    deco(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32), m.dark, C1.x, -0.42, C1.z);
    // the VI pier, inside the gate, toward the center
    slab(C1.x, -0.25, C1.z - 13.5, 2.4, 0.5, 6.2, m.floorD);
    deco(new THREE.BoxGeometry(2.5, 0.06, 6.2), m.brass, C1.x, 0.02, C1.z - 13.5);
    // the twelve niches
    const pl = LvKit.tex(1536, 384, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const cx = (i % 6) * 256 + 128;
        const cy = Math.floor(i / 6) * 192 + 96;
        g.fillStyle = '#2a1206';
        g.fillRect(cx - 124, cy - 92, 248, 184);
        g.strokeStyle = '#e8c27a';
        g.lineWidth = 6;
        g.strokeRect(cx - 116, cy - 84, 232, 168);
        g.fillStyle = '#f2d39a';
        g.font = 'bold 96px Georgia';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(ROMAN[i], cx, cy + 4);
      }
    });
    pl.wrapS = pl.wrapT = THREE.ClampToEdgeWrapping;
    for (let i = 0; i < 12; i++) buildNiche(i, pl);
    // the target beam (Valet only) and the sand curtains (Dame only)
    S1.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 60, 20, 1, true).translate(0, 30, 0), addMat('#ffcf8a', 0.8, 0.0));
    S1.beam.visible = false;
    group.add(S1.beam);
    const curTex = LvKit.tex(256, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        g.fillStyle = `rgba(255,${120 + Math.random() * 90},${50 + Math.random() * 40},${0.15 + Math.random() * 0.55})`;
        g.fillRect(x, y, 1.6, 4 + Math.random() * 14);
      }
    });
    for (let k = 0; k < 3; k++) {
      const cg = new THREE.Group();
      cg.position.copy(c);
      const t = curTex.clone();
      t.needsUpdate = true;
      t.repeat.set(3, 2);
      const mm = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, opacity: 0 });
      mm.color.setRGB(0.8, 0.45, 0.25);
      // three radial sheets of falling sand (a thick wedge), from the spindle out to the niches
      const sheet = new THREE.PlaneGeometry(14.6, 46).rotateY(Math.PI / 2).translate(0, 8, 9.3);
      [-0.1, 0, 0.1].forEach((da) => {
        const pm = new THREE.Mesh(sheet, mm);
        pm.rotation.y = (-da * Math.PI) / 6;
        cg.add(pm);
      });
      // a heap of sand on the clouds below and a lip of light above
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 14.6).translate(0, 0, 9.3), glow('#ff9a4a', 0.6));
      lip.position.y = 31;
      cg.add(lip);
      cg.visible = false;
      group.add(cg);
      S1.curtains.push({ g: cg, m: mm, t, k: 0 });
    }
    // XII exit: corridor north, three steps up to the echo rooms
    slab(0, NI.y - 0.25, 63.5, 3.4, 0.5, 5, m.floorD);
    slab(0, -0.8 - 0.25, 66.5, 3.4, 0.5, 1, m.floorD);
    slab(0, -0.4 - 0.25, 67.5, 3.4, 0.5, 1, m.floorD);
    [-1, 1].forEach((s) => slab(s * 1.95, 0.8, 64.5, 0.5, 4, 7, m.stone));
    deco(new THREE.BoxGeometry(4.4, 0.6, 7), m.dark, 0, 3.1, 64.5);
  };
  const nicheFrame = (h) => {
    const t = (h * Math.PI) / 6;
    return { u: [-Math.sin(t), Math.cos(t)], w: [Math.cos(t), Math.sin(t)], t };
  };
  const buildNiche = (h, plTex) => {
    const m = mats();
    const { u, w, t } = nicheFrame(h);
    const g = new THREE.Group();
    g.position.copy(P(C1.x, 0, C1.z));
    g.rotation.y = -t;
    group.add(g);
    const add = (geo, mat, x, y, z) => {
      const mm = new THREE.Mesh(geo, mat);
      mm.position.set(x, y, z);
      g.add(mm);
      return mm;
    };
    const rc = (NI.r0 + NI.r1) / 2;
    const depth = NI.r1 - NI.r0;
    add(new THREE.BoxGeometry(NI.w, 0.6, depth + 0.4), m.floor, 0, NI.y - 0.3, rc);
    add(new THREE.BoxGeometry(NI.w + 1.4, 1.6, depth + 0.8), m.stone, 0, NI.y - 1.4, rc + 0.1);
    // side walls, roof, back
    [-1, 1].forEach((s) => {
      add(new THREE.BoxGeometry(0.45, NI.roof - NI.y, depth + 0.4), m.plaster, s * (NI.w / 2 + 0.22), (NI.roof + NI.y) / 2, rc);
      add(new THREE.BoxGeometry(0.55, NI.roof - NI.y + 0.2, 0.55), m.brass, s * (NI.w / 2 + 0.22), (NI.roof + NI.y) / 2, NI.r0 + 0.05);
    });
    add(new THREE.BoxGeometry(NI.w + 1.0, 0.5, depth + 0.6), m.dark, 0, NI.roof + 0.25, rc + 0.1);
    add(new THREE.BoxGeometry(NI.w + 1.2, 0.18, 0.7), m.brass, 0, NI.roof + 0.55, NI.r0 + 0.1);
    const open = h === 6 || h === 0;
    if (!open) add(new THREE.BoxGeometry(NI.w + 0.9, NI.roof - NI.y, 0.4), m.plaster, 0, (NI.roof + NI.y) / 2, NI.r1 + 0.2);
    else {
      // VI opens on the walkway, XII on a door to the corridor
      [-1, 1].forEach((s) => add(new THREE.BoxGeometry(0.4, NI.roof - NI.y, 0.4), m.brass, s * (NI.w / 2 - 0.1), (NI.roof + NI.y) / 2, NI.r1 + 0.2));
    }
    // a small amber dial window in the back wall
    if (!open) {
      const win = add(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb060').multiplyScalar(0.6), toneMapped: false }), 0, 1.4, NI.r1 - 0.01);
      win.rotation.y = Math.PI;
      const wr = add(new THREE.TorusGeometry(0.92, 0.08, 8, 40), m.brass, 0, 1.4, NI.r1 - 0.03);
    }
    // the numeral plaque above the gate, facing the center
    const uv = new THREE.PlaneGeometry(2.0, 0.75);
    const col = h % 6;
    const row = Math.floor(h / 6);
    const a = uv.attributes.uv;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i);
      const y = a.getY(i);
      a.setXY(i, (col + 0.04 + x * 0.92) / 6, 1 - (row + 1 - (0.04 + y * 0.92)) / 2);
    }
    const pm = new THREE.MeshBasicMaterial({ map: plTex, toneMapped: false });
    pm.color.setScalar(0.62);
    const plq = add(uv, pm, 0, NI.roof - 0.35, NI.r0 - 0.06);
    plq.rotation.y = Math.PI;
    S1.plaques[h] = plq;
    // colliders
    const cx = C1.x + u[0] * rc;
    const cz = C1.z + u[1] * rc;
    fillRect(cx, cz, u[0], u[1], depth, NI.w, NI.y - 0.6, NI.y, 0.5);
    [-1, 1].forEach((s) => {
      const ox = w[0] * s * (NI.w / 2 + 0.22);
      const oz = w[1] * s * (NI.w / 2 + 0.22);
      lineWall(C1.x + u[0] * NI.r0 + ox, C1.z + u[1] * NI.r0 + oz, C1.x + u[0] * (NI.r1 + 0.2) + ox, C1.z + u[1] * (NI.r1 + 0.2) + oz, 0.45, NI.y, NI.roof + 0.5);
    });
    fillRect(cx, cz, u[0], u[1], depth + 0.4, NI.w + 1.0, NI.roof, NI.roof + 0.5, 1.0);
    let back = null;
    const bx = C1.x + u[0] * (NI.r1 + 0.2);
    const bz = C1.z + u[1] * (NI.r1 + 0.2);
    if (!open) lineWall(bx - w[0] * 2.1, bz - w[1] * 2.1, bx + w[0] * 2.1, bz + w[1] * 2.1, 0.45, NI.y, NI.roof + 0.5);
    else if (h === 0) {
      // the exit door (opens at the end of part 1)
      back = new THREE.Group();
      const dm = new THREE.Mesh(new THREE.BoxGeometry(NI.w - 0.4, NI.roof - NI.y, 0.3), m.dark);
      back.add(dm);
      const dh = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.55), { depth: 0.1, bevelEnabled: false }), glow('#ff5f8a', 0.5));
      dh.position.set(0, 0.4, -0.2);
      back.add(dh);
      back.position.set(0, (NI.roof + NI.y) / 2, NI.r1 + 0.1);
      g.add(back);
      S1.exitDoor = { g: back, boxes: lineWall(bx - w[0] * 1.7, bz - w[1] * 1.7, bx + w[0] * 1.7, bz + w[1] * 1.7, 0.45, NI.y, NI.roof + 0.5), y0: back.position.y };
    }
    // the gate: a brass portcullis, raised when the minute hand points here
    const gg = new THREE.Group();
    const bars = [];
    for (let i = -3; i <= 3; i++) {
      const b = new THREE.BoxGeometry(0.1, NI.roof - NI.y - 0.1, 0.1);
      b.translate(i * 0.46, 0, 0);
      bars.push(b);
    }
    [-1.3, 0, 1.3].forEach((y) => {
      const b = new THREE.BoxGeometry(NI.w - 0.2, 0.12, 0.14);
      b.translate(0, y, 0);
      bars.push(b);
    });
    bars.forEach((b) => gg.add(new THREE.Mesh(b, m.dark)));
    const gh = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.35)), glow('#ff5f8a', 0.6));
    gh.position.set(0, 0.6, -0.1);
    gh.rotation.y = Math.PI;
    gg.add(gh);
    gg.position.set(0, (NI.roof + NI.y) / 2, NI.r0 + 0.15);
    g.add(gg);
    const gx = C1.x + u[0] * (NI.r0 + 0.15);
    const gz = C1.z + u[1] * (NI.r0 + 0.15);
    const gb = lineWall(gx - w[0] * 1.75, gz - w[1] * 1.75, gx + w[0] * 1.75, gz + w[1] * 1.75, 0.3, NI.y, NI.roof);
    S1.gates[h] = { g: gg, boxes: gb, y0: gg.position.y, k: 0, gh };
    S1.niches[h] = g;
  };

  const setHands = (aMin, aHr) => {
    if (!S1.minG) return;
    S1.minG.rotation.y = (-aMin * Math.PI) / 6;
    S1.hrG.rotation.y = (-aHr * Math.PI) / 6;
    const dm = hourDir(aMin);
    S1.minBox.forEach(({ r, b }) => setBox(b, C1.x + dm[0] * r, -0.22, C1.z + dm[1] * r, 1.3, 0.44, 1.3));
    const dh = hourDir(aHr);
    S1.hrBox.forEach(({ r, b }) => setBox(b, C1.x + dh[0] * r, -0.22, C1.z + dh[1] * r, 1.5, 0.44, 1.5));
  };
  const onMinute = (body) => S1.minBox.some((o) => o.b === body.ground);
  const onHour = (body) => S1.hrBox.some((o) => o.b === body.ground);
  const nicheAt = (q) => {
    const p = polar(q);
    if (p.r < NI.r0 + 0.45 || p.r > NI.r1 + 0.3 || q.y < NI.y - 1 || q.y > NI.roof) return -1;
    const h = Math.round(p.a) % 12;
    return hourDist(p.a, h) < 0.32 ? h : -1;
  };
  const nicheSpot = (h, r = 19.2) => {
    const d = hourDir(h);
    return P(C1.x + d[0] * r, NI.y + 0.05, C1.z + d[1] * r);
  };

  // ---------- part 2: the echo rooms ----------
  const S2 = { labs: [], plates: [], bridge: null, bridgeBox: null, gates: [], echo: {}, echoMat: null, recRing: null, glass: [] };
  const plate = (p, col) => {
    const m = mats();
    const g = new THREE.Group();
    g.position.copy(P(p.x, p.y, p.z));
    group.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.14, 40), m.dark);
    base.position.y = 0.04;
    g.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 40), m.brassL);
    top.position.y = 0.12;
    g.add(top);
    const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(0.25), toneMapped: false });
    const h = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.55)).rotateX(-Math.PI / 2), hm);
    h.position.y = 0.18;
    h.rotation.y = Math.PI;
    g.add(h);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 48).rotateX(-Math.PI / 2), addMat(col, 0.7, 0));
    ring.position.y = 0.2;
    g.add(ring);
    return { g, top, hm, ring, col: new THREE.Color(col), k: 0 };
  };
  const portcullis = (w, h) => {
    const m = mats();
    const gg = new THREE.Group();
    const n = Math.max(3, Math.round(w / 0.48));
    for (let i = 0; i <= n; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, h, 0.11), m.dark);
      b.position.x = -w / 2 + (w * i) / n;
      gg.add(b);
    }
    [-h * 0.3, 0, h * 0.3].forEach((y) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, 0.16), m.brass);
      b.position.y = y;
      gg.add(b);
    });
    const gh = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.3)), glow('#ff5f8a', 0.6));
    gh.position.set(0, h * 0.15, 0.1);
    gg.add(gh);
    return gg;
  };
  const numTex = (i) =>
    LvKit.tex(256, 256, (g, w) => {
      const c = w / 2;
      g.clearRect(0, 0, w, w);
      g.fillStyle = 'rgba(60,26,10,0.92)';
      g.beginPath();
      g.arc(c, c, c - 6, 0, TAU);
      g.fill();
      g.strokeStyle = '#e8c27a';
      g.lineWidth = 12;
      g.stroke();
      g.fillStyle = '#ffd9a0';
      g.font = 'bold 120px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(['I', 'II', 'III'][i], c, c + 8);
    });
  const glassPanel = (w, h) => {
    const t = dialTex({ core: 'rgba(255,214,150,0.35)', mid: 'rgba(214,140,60,0.25)' });
    const mm = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    mm.color.setScalar(0.55);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mm);
  };
  const buildEcho = () => {
    const m = mats();
    // room A
    slab(0, -0.25, 76, 18, 0.5, 16, m.floor);
    slab(0, -1.4, 76, 18.6, 1.8, 16.6, m.stone);
    deco(new THREE.BoxGeometry(18.2, 0.08, 0.3), m.brass, 0, 0.02, 83.8);
    [-1, 1].forEach((s) => {
      slab(s * 9.25, 1.6, 76, 0.5, 3.2, 16, m.plaster);
      deco(new THREE.BoxGeometry(0.6, 0.2, 16), m.brass, s * 9.25, 3.3, 76);
    });
    slab(-5.4, 1.6, 68.25, 7.2, 3.2, 0.5, m.plaster);
    slab(5.4, 1.6, 68.25, 7.2, 3.2, 0.5, m.plaster);
    PL_A.forEach((p) => S2.plates.push(plate(p, '#ffcf8a')));
    // the bridge (slides out of the A side)
    const bg = new THREE.Group();
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(BR.hw * 2, 0.4, (BR.z1 - BR.z0) / segs + 0.05), i % 2 ? m.brass : m.brassL);
      s.position.z = ((i + 0.5) * (BR.z1 - BR.z0)) / segs;
      s.position.y = -0.2;
      s.userData.i = i;
      bg.add(s);
    }
    bg.position.copy(P(0, 0, BR.z0));
    group.add(bg);
    S2.bridge = bg;
    S2.bridgeBox = Phys.box(0, 0, 0, 1, 1, 1, { dyn: true });
    // an invisible lid 2.2 m over the bridge's 13 m gap: a late double jump reaches 12-13 m, so
    // without it you could jump across and skip the two plates and the latch
    K.collider(0, 2.4, (BR.z0 + BR.z1) / 2, 18.5, 0.4, BR.z1 - BR.z0 - 0.8, { tag: 'nocam' });
    // gear housings at both ends
    [BR.z0, BR.z1].forEach((z) => {
      const g = deco(gearGeo(1.4, 18, 0.18, 0.3, { holes: 4, heart: true }), m.brass, 0, -0.9, z);
      g.rotation.y = Math.PI / 2;
      S2.glass.push(g);
    });
    // room B
    slab(0, -0.25, 102.5, 18, 0.5, 11, m.floor);
    slab(0, -1.4, 102.5, 18.6, 1.8, 11.6, m.stone);
    [-1, 1].forEach((s) => slab(s * 9.25, 1.6, 102.5, 0.5, 3.2, 11, m.plaster));
    slab(5.5, 1.6, 108.2, 7, 3.2, 0.5, m.plaster);
    S2.plates.push(plate(PL_F, '#ff8fb0'));
    // the lane and the balcony behind a wall of dial glass
    slab(0, -0.25, (LANE.z0 + LANE.z1) / 2, LANE.hw * 2, 0.5, LANE.z1 - LANE.z0, m.floorD);
    slab(-5.3, -0.25, 122, 5.4, 0.5, 28, m.floor);
    slab(-1.5, -1.3, 125, 15, 1.6, 34.4, m.stone);
    // walls: lane east (solid), lane/balcony (glass over a brass frame), balcony west and end
    slab(2.3, 2.5, 125, 0.6, 5, 34, m.plaster);
    K.collider(-2.3, 2.5, 122, 0.6, 5, 28);
    for (let z = LANE.z0 + 0.4; z < 136; z += 4) {
      const gp = glassPanel(3.6, 4.6);
      gp.position.copy(P(-2.3, 2.4, z + 1.8));
      gp.rotation.y = Math.PI / 2;
      group.add(gp);
      deco(new THREE.BoxGeometry(0.5, 5, 0.3), m.brass, -2.3, 2.5, z);
    }
    deco(new THREE.BoxGeometry(0.5, 0.4, 28), m.brass, -2.3, 5.0, 122);
    slab(-2.3, 2.5, 139, 0.6, 5, 6, m.plaster);
    slab(-8.2, 0.7, 122, 0.4, 1.4, 28, m.stone);
    deco(new THREE.BoxGeometry(0.5, 0.12, 28), m.brass, -8.2, 1.45, 122);
    slab(-5.3, 2.5, 136.2, 6, 5, 0.5, m.plaster);
    PL_B.forEach((p) => S2.plates.push(plate(p, '#ffcf8a')));
    GATES2.forEach((z, i) => {
      const gg = portcullis(LANE.hw * 2, 4.6);
      gg.position.copy(P(0, 2.3, z));
      group.add(gg);
      const box = K.collider(0, 2.3, z, LANE.hw * 2, 4.6, 0.4);
      S2.gates.push({ g: gg, box, y0: gg.position.y, k: 0 });
      // a numeral above each gate (I, II, III) and the same on its plate's wall: the pairs read at a glance
      const lab = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ map: numTex(i), transparent: true, toneMapped: false }));
      lab.material.color.setScalar(0.75);
      lab.position.copy(P(0, 4.15, z - 0.25));
      lab.rotation.y = Math.PI;
      group.add(lab);
      const lab2 = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), lab.material);
      lab2.position.copy(P(-8.0, 2.3, z));
      lab2.rotation.y = Math.PI / 2;
      group.add(lab2);
      deco(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 10), m.brass, -8.2, 1.05, z);
      S2.labs.push(lab, lab2);
    });
    // the echo's look: a golden ghost (avatar built on demand)
    S2.echoMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffc46a').multiplyScalar(0.75),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    S2.recRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 48).rotateX(-Math.PI / 2), addMat('#ff5f8a', 0.8, 0.8));
    S2.recRing.visible = false;
    group.add(S2.recRing);
    S2.recHour = new THREE.Group();
    const hgl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.22, 0.32, 12), glow('#ffcf8a', 0.7));
    hgl.position.y = 0.16;
    const hgl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.02, 0.32, 12), glow('#ffcf8a', 0.7));
    hgl2.position.y = -0.16;
    S2.recHour.add(hgl, hgl2);
    S2.recHour.visible = false;
    group.add(S2.recHour);
    S2.echoRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 40).rotateX(-Math.PI / 2), addMat('#ffcf8a', 0.8, 0.6));
    S2.echoRing.visible = false;
    group.add(S2.echoRing);
    LvKit.light(group, P(0, 6, 80), '#ffc88a', 1.4, 34);
    LvKit.light(group, P(-3, 6, 122), '#ffb070', 1.2, 30);
  };
  const echoAvatar = (look) => {
    if (S2.echo[look]) return S2.echo[look];
    const a = Avatar.build(look);
    a.addTo(group);
    a.root.traverse((o) => {
      if (o.isMesh) o.material = S2.echoMat;
    });
    if (a.shadow) a.shadow.visible = false;
    a.visible = false;
    S2.echo[look] = a;
    return a;
  };

  // ---------- part 3: frozen and accelerated time ----------
  const S3 = { debris: [], levers: {}, discs: [], pends: [], grains: null, lockG: null, slowDome: null };
  const lever = (p, ry, tag) => {
    const m = mats();
    const g = new THREE.Group();
    g.position.copy(P(p.x, p.y, p.z));
    g.rotation.y = ry;
    group.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.0), m.dark);
    base.position.y = 0.4;
    g.add(base);
    const gear = new THREE.Mesh(gearGeo(0.75, 14, 0.12, 0.2, { holes: 4, heart: true }), m.brass);
    gear.position.set(0, 1.35, 0);
    g.add(gear);
    const arm = new THREE.Group();
    arm.position.set(0.55, 0.85, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14).translate(0, 0.65, 0), m.brass);
    arm.add(bar);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), m.wood);
    knob.position.y = 1.3;
    arm.add(knob);
    arm.rotation.z = 0.5;
    g.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#552010', toneMapped: false }));
    lamp.position.set(-0.4, 0.85, 0.45);
    g.add(lamp);
    K.collider(p.x, p.y + 0.5, p.z, 1.3, 1.0, 1.1);
    S3.levers[tag] = { g, gear, arm, lamp, k: 0 };
  };
  const debrisMesh = (i, w, d) => {
    const m = mats();
    const g = new THREE.Group();
    const kind = i % 6;
    if (kind === 0) {
      const ge = new THREE.Mesh(gearGeo(Math.max(w, d) * 0.62, 14, 0.18, 0.5, { holes: 4, heart: true }), m.brass);
      ge.rotation.x = -Math.PI / 2;
      ge.position.y = -0.25;
      g.add(ge);
    } else if (kind === 1) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), m.wood);
      b.position.y = -0.25;
      g.add(b);
      const t = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.06, d * 0.7), m.copper);
      t.position.y = 0.02;
      g.add(t);
    } else if (kind === 2) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55, w * 0.5, 0.5, 28), m.brassL);
      c.position.y = -0.25;
      g.add(c);
      const f = new THREE.Mesh(new THREE.CircleGeometry(w * 0.48, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dialTex({}), toneMapped: false, transparent: true }));
      f.material.color.setScalar(0.6);
      f.position.y = 0.01;
      g.add(f);
    } else if (kind === 3) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), m.stone);
      b.position.y = -0.3;
      g.add(b);
      for (let k = 0; k < 3; k++) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), m.stone);
        sh.position.set((k - 1) * 0.9, -0.8 - k * 0.3, (k % 2) * 0.6 - 0.3);
        sh.rotation.set(k, k * 2, 0);
        g.add(sh);
      }
    } else if (kind === 4) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), m.dark);
      b.position.y = -0.2;
      g.add(b);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 0.9, 20, 1, true), m.brass);
      bell.position.set(0, -0.9, 0);
      g.add(bell);
    } else {
      const ge = new THREE.Mesh(gearGeo(Math.max(w, d) * 0.6, 18, 0.16, 0.45, { holes: 5 }), m.copper);
      ge.rotation.x = -Math.PI / 2;
      ge.position.y = -0.22;
      g.add(ge);
    }
    // frozen sand around each piece: a little halo of still grains
    const n = 60;
    const pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      pos[k * 3] = (Math.random() - 0.5) * w * 1.6;
      pos[k * 3 + 1] = -Math.random() * 2.4 + 0.3;
      pos[k * 3 + 2] = (Math.random() - 0.5) * d * 1.6;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(0.8), size: 0.07, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    g.add(pts);
    return g;
  };
  const buildFrozen = () => {
    const m = mats();
    // landing (part 3 starts) and the end of the lane
    slab(0, -0.25, (L3.z0 + L3.z1) / 2, 12, 0.5, L3.z1 - L3.z0, m.floor);
    slab(0, -1.4, (L3.z0 + L3.z1) / 2, 12.6, 1.8, L3.z1 - L3.z0 + 0.6, m.stone);
    slab(-6.2, 1.6, 147, 0.4, 3.2, 10, m.plaster);
    slab(6.2, 1.6, 147, 0.4, 3.2, 10, m.plaster);
    lever(J1, Math.PI / 2, 'J1');
    // the frozen debris (dynamic boxes; they fall when time starts again)
    DEB.forEach(([x, y, z, w, d], i) => {
      const g = debrisMesh(i, w, d);
      g.position.copy(P(x, y, z));
      group.add(g);
      const b = Phys.box(0, 0, 0, 1, 1, 1, { dyn: true });
      S3.debris.push({ g, b, x, y, z, w, d, rot: (i * 1.7) % TAU, sp: 0.5 + (i % 3) * 0.3 });
    });
    // still sand everywhere in the chasm (falls with the rest)
    const n = 1400;
    const pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      pos[k * 3] = O.x + (Math.random() - 0.5) * 16;
      pos[k * 3 + 1] = O.y - 2 + Math.random() * 14;
      pos[k * 3 + 2] = O.z + 152 + Math.random() * 25;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    S3.grains = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(0.7), size: 0.08, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    S3.grains.userData.base = pos.slice();
    group.add(S3.grains);
    // the ledge: the lock (stops time for good) and the second jam
    slab(0, LEDGE.y - 0.25, (LEDGE.z0 + LEDGE.z1) / 2, 12, 0.5, LEDGE.z1 - LEDGE.z0, m.floor);
    slab(0, LEDGE.y - 2, (LEDGE.z0 + LEDGE.z1) / 2, 12.6, 3, LEDGE.z1 - LEDGE.z0 + 0.6, m.stone);
    [-1, 1].forEach((s) => slab(s * 6.2, LEDGE.y + 1.6, (LEDGE.z0 + LEDGE.z1) / 2, 0.4, 3.2, LEDGE.z1 - LEDGE.z0, m.plaster));
    // the hourglass lock
    const lg = new THREE.Group();
    lg.position.copy(P(LOCK.x, LOCK.y, LOCK.z));
    group.add(lg);
    const fr = (y) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.16, 24), m.brass);
      d.position.y = y;
      lg.add(d);
    };
    fr(0.1);
    fr(2.3);
    [0, 1, 2].forEach((k) => {
      const a = (k / 3) * TAU;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), m.dark);
      p.position.set(Math.cos(a) * 0.62, 1.2, Math.sin(a) * 0.62);
      lg.add(p);
    });
    const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2b0').multiplyScalar(0.35), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.06, 1, 20), gm);
    up.position.y = 1.7;
    const dn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.5, 1, 20), gm);
    dn.position.y = 0.7;
    lg.add(up, dn);
    const sand = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 20), glow('#ffb050', 0.6));
    sand.position.y = 0.42;
    lg.add(sand);
    const sandT = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 20).rotateX(Math.PI), glow('#ffb050', 0.6));
    sandT.position.y = 1.95;
    lg.add(sandT);
    K.collider(LOCK.x, LOCK.y + 1.2, LOCK.z, 1.5, 2.4, 1.5);
    S3.lockG = { g: lg, sand, sandT, k: 0 };
    lever(J2, Math.PI / 2, 'J2');
    LvKit.light(group, P(0, 9, 160), '#ffc070', 1.4, 34);
  };
  const buildFast = () => {
    const m = mats();
    // two spinning gears to walk across (only when jammed)
    DISCS.forEach((c, i) => {
      const g = new THREE.Group();
      g.position.copy(P(c.x, c.y, c.z));
      group.add(g);
      const top = new THREE.Mesh(gearGeo(DISC_R + 0.35, 28, 0.4, 0.5, { holes: 0 }), i ? m.copper : m.brass);
      top.rotation.x = -Math.PI / 2;
      top.position.y = -0.25;
      g.add(top);
      const face = new THREE.Mesh(new THREE.CircleGeometry(DISC_R - 0.3, 48).rotateX(-Math.PI / 2), m.floorD);
      face.position.y = 0.01;
      g.add(face);
      // a heart rosace and radial spokes on the face
      const hh = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.8)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(0.55), toneMapped: false }));
      hh.position.y = 0.03;
      g.add(hh);
      for (let k = 0; k < 6; k++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, DISC_R - 1.2).translate(0, 0.03, (DISC_R - 1.2) / 2 + 0.9), m.brass);
        s.rotation.y = (k / 6) * TAU;
        g.add(s);
      }
      // the axle down into the void and a drive gear meshing with the jam
      const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 30, 14), m.dark);
      ax.position.y = -15.5;
      g.add(ax);
      discCol(c.x, c.y, c.z, DISC_R, 11);
      // a blur ring when it spins fast
      const blur = new THREE.Mesh(new THREE.RingGeometry(1.2, DISC_R + 0.4, 64).rotateX(-Math.PI / 2), addMat('#ffcf8a', 0.5, 0));
      blur.position.y = 0.06;
      g.add(blur);
      S3.discs.push({ g, top, blur, a: 0 });
    });
    // invisible lids 2.2 m over both gears: the 9-10 m spans are within a long double jump, which
    // would skip the brakes (J2 / J3) the two of you are meant to hold for each other
    DISCS.forEach((c) => K.collider(c.x, c.y + 2.4, c.z - (c === DISCS[0] ? 0.3 : 0), 20, 0.4, 2 * DISC_R - 0.6, { tag: 'nocam' }));
    // bridges between
    slab(0, LEDGE.y - 0.25, 199.5, 2.4, 0.5, 2.6, m.floorD);
    slab(0, LEDGE.y - 0.25, 211.6, 2.4, 0.5, 2.8, m.floorD);
    // the pendulum lane
    slab(0, LEDGE.y - 0.25, 220.55, 2.6, 0.5, 15.5, m.floorD);
    [-1, 1].forEach((s) => deco(new THREE.BoxGeometry(0.2, 0.12, 15.5), m.brass, s * 1.3, LEDGE.y + 0.02, 220.55));
    PEND.forEach((z, i) => {
      const piv = new THREE.Group();
      piv.position.copy(P(0, PEND_Y, z));
      group.add(piv);
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.22, PEND_L, 0.22).translate(0, -PEND_L / 2, 0), m.dark);
      piv.add(rod);
      const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 3.0, 28).rotateX(Math.PI / 2), i ? m.copper : m.brass);
      bob.position.y = -PEND_L;
      piv.add(bob);
      [-1.55, 1.55].forEach((dz) => {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 28).rotateX(Math.PI / 2), m.brassL);
        cap.position.set(0, -PEND_L, dz);
        piv.add(cap);
      });
      const hb = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.45)), glow('#ff5f8a', 0.5));
      hb.position.set(0, -PEND_L, 1.62);
      piv.add(hb);
      // the beam carrying it
      deco(new THREE.BoxGeometry(14, 0.8, 0.8), m.dark, 0, PEND_Y + 0.4, z);
      const trail = new THREE.Mesh(new THREE.RingGeometry(PEND_L - 1.0, PEND_L + 1.0, 48, 1, -Math.PI / 2 - 0.9, 1.8), addMat('#ffcf8a', 0.4, 0));
      trail.position.copy(P(0, PEND_Y, z));
      group.add(trail);
      S3.pends.push({ piv, trail, a: 0 });
    });
    // far landing with the third jam
    slab(0, FAR.y - 0.25, (FAR.z0 + FAR.z1) / 2, 12, 0.5, FAR.z1 - FAR.z0, m.floor);
    slab(0, FAR.y - 2, (FAR.z0 + FAR.z1) / 2, 12.6, 3, FAR.z1 - FAR.z0 + 0.6, m.stone);
    [-1, 1].forEach((s) => slab(s * 6.2, FAR.y + 1.6, (FAR.z0 + FAR.z1) / 2, 0.4, 3.2, FAR.z1 - FAR.z0, m.plaster));
    lever(J3, -Math.PI / 2, 'J3');
    // the slowed time: an amber dome over the hall while it lasts
    S3.slowDome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), addMat('#ffb060', 0.35, 0));
    S3.slowDome.material.side = THREE.BackSide;
    S3.slowDome.visible = false;
    group.add(S3.slowDome);
    LvKit.light(group, P(0, 12, 200), '#ffb878', 1.5, 36);
    LvKit.light(group, P(0, 12, 222), '#ff9a6a', 1.1, 30);
  };

  // ---------- part 4: the arena and the Horloger ----------
  const S4 = { st: [], boss: null, pend: null, weights: [], tele: [], sweep: null, rings: [], card: null, heart: null, face: null, faceHands: null, glowL: null };
  const buildArena = () => {
    const m = mats();
    // bridge from the far landing
    slab(0, FAR.y - 0.25, 242.5, 3.2, 0.5, 9, m.floorD);
    [-1, 1].forEach((s) => deco(new THREE.BoxGeometry(0.2, 0.1, 9), m.brass, s * 1.6, FAR.y + 0.02, 242.5));
    // the floor: a giant dial
    const ft = dialTex({ core: 'rgba(240,206,150,1)', mid: 'rgba(200,150,90,1)' });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(AR, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.62, metalness: 0, color: '#ad8f6c' }));
    floor.rotation.y = Math.PI;
    floor.position.copy(P(C4.x, C4.y + 0.005, C4.z));
    group.add(floor);
    deco(new THREE.CylinderGeometry(AR + 0.6, AR - 1, 2.4, 96), m.stone, C4.x, C4.y - 1.2, C4.z);
    deco(new THREE.TorusGeometry(AR + 0.3, 0.25, 10, 128).rotateX(Math.PI / 2), m.brass, C4.x, C4.y + 0.05, C4.z);
    discCol(C4.x, C4.y, C4.z, AR, 22);
    // the arena is a clock too: two great hands inlaid in the floor (they settle on the hour of the meeting)
    {
      const mk = (prof, len, col, k) => {
        const g = new THREE.Group();
        g.position.copy(P(C4.x, C4.y + 0.03 + k * 0.01, C4.z));
        const h = new THREE.Mesh(handGeo(prof, 0.02), warnMat(col, 0.55));
        h.material.polygonOffsetFactor = -1 - k;
        h.scale.set(1.15, 1, len);
        g.add(h);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.86).rotateX(-Math.PI / 2).translate(0, 0.02, 0.47), glow('#ffcf8a', 0.0));
        gl.scale.set(1, 1, len * 12);
        g.add(gl);
        group.add(g);
        return { g, h, gl };
      };
      S4.floorMin = mk(MIN_PROF, 0.82, '#5a2e14', 0);
      S4.floorHr = mk(HR_PROF, 0.72, '#7a2e1c', 1);
    }
    // the railing, open at the south (the way in)
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a1 = ((i + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      if (Math.abs(((am + Math.PI) % TAU) - Math.PI) > Math.PI - 0.16) continue;
      const r = AR + 0.2;
      const x0 = C4.x + Math.sin(a0) * r;
      const z0 = C4.z + Math.cos(a0) * r;
      const x1 = C4.x + Math.sin(a1) * r;
      const z1 = C4.z + Math.cos(a1) * r;
      lineWall(x0, z0, x1, z1, 0.4, C4.y, C4.y + 1.3);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const rl = deco(new THREE.BoxGeometry(0.16, 0.12, len), m.brass, (x0 + x1) / 2, C4.y + 1.25, (z0 + z1) / 2);
      rl.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      const post = deco(new THREE.CylinderGeometry(0.08, 0.1, 1.25, 8), m.dark, x0, C4.y + 0.62, z0);
    }
    // the three gear stations
    for (let i = 0; i < 3; i++) {
      const a = ST_ANG[i];
      const g = new THREE.Group();
      const gp = stPos(i, AR + 0.6);
      g.position.copy(P(gp.x, gp.y + 2.0, gp.z));
      g.rotation.y = a;
      group.add(g);
      const gear = new THREE.Mesh(gearGeo(2.6, 24, 0.32, 0.5, { holes: 5, heart: true }), m.brass);
      g.add(gear);
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.62), glow('#ff5f8a', 0.6));
      notch.position.set(0, 2.45, 0);
      const ng = new THREE.Group();
      ng.add(notch);
      gear.add(ng);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.2, 1.6), m.dark);
      housing.position.set(0, -2.0, 0.1);
      g.add(housing);
      // the wedge (cale), above the gear on the arena side
      const wedge = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 4).rotateX(Math.PI), m.copper);
      wedge.position.set(0, 3.8, -0.1);
      g.add(wedge);
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 24), glow('#ffcf8a', 0.4));
      mark.position.set(0, 3.0, -0.4);
      mark.rotation.y = Math.PI;
      g.add(mark);
      K.collider(gp.x, gp.y + 1.5, gp.z, 2.4, 3, 2.4);
      // the brake and the wedge levers on the arena floor
      const lv = (off, tag, col) => {
        const p = stPos(i, 14.4, off);
        const lg = new THREE.Group();
        lg.position.copy(P(p.x, p.y, p.z));
        lg.rotation.y = a;
        group.add(lg);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.7, 16), m.dark);
        base.position.y = 0.35;
        lg.add(base);
        const arm = new THREE.Group();
        arm.position.y = 0.7;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2, 0.14).translate(0, 0.6, 0), tag === 'brake' ? m.brass : m.copper);
        arm.add(bar);
        const kn = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), m.wood);
        kn.position.y = 1.2;
        arm.add(kn);
        arm.rotation.x = 0.45;
        lg.add(arm);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 36).rotateX(-Math.PI / 2), addMat(col, 0.6, 0.35));
        ring.position.y = 0.03;
        lg.add(ring);
        K.collider(p.x, p.y + 0.35, p.z, 0.9, 0.7, 0.9);
        return { g: lg, arm, ring, p };
      };
      const brake = lv(-1.9, 'brake', '#ffcf8a');
      const wl = lv(1.9, 'wedge', '#ff8fb0');
      const steam = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), addMat('#fff0d8', 0.4, 0));
      steam.position.copy(P(gp.x, gp.y + 2.5, gp.z));
      group.add(steam);
      S4.st.push({ g, gear, ng, notch, wedge, mark, brake, wl, steam, a: 0, jam: 0, steamK: 0 });
    }
    // the great pendulum
    const pg = new THREE.Group();
    pg.position.copy(P(PIV.x, PIV.y, PIV.z));
    group.add(pg);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.5, PEND4_L, 0.5).translate(0, -PEND4_L / 2, 0), m.dark);
    pg.add(rod);
    const bob = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(3.0), { depth: 1.0, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 3 }), m.brass);
    bob.geometry.translate(0, -1.4, -0.5);
    bob.position.y = -PEND4_L;
    pg.add(bob);
    const core = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(1.2)), glow('#ff5f8a', 0.55));
    core.position.set(0, -PEND4_L - 1.6, 0.8);
    pg.add(core);
    deco(new THREE.BoxGeometry(30, 2, 2), m.dark, PIV.x, PIV.y + 1, PIV.z);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
    group.add(shadow);
    S4.pend = { g: pg, shadow, bob, core };
    // the Horloger
    buildBoss();
    // the second hand (sweep attack), lying on the floor around the center
    const sw = new THREE.Group();
    sw.position.copy(P(C4.x, C4.y, C4.z));
    const swm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, AR - 0.6).translate(0, 0.38, (AR - 0.6) / 2 + 0.5), m.copper);
    sw.add(swm);
    const swg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, AR - 0.6).translate(0, 0.8, (AR - 0.6) / 2 + 0.5), glow('#ff5f8a', 0.6));
    sw.add(swg);
    const tele = new THREE.Mesh(new THREE.PlaneGeometry(1.4, AR - 0.6).rotateX(-Math.PI / 2).translate(0, 0.04, (AR - 0.6) / 2 + 0.5), warnMat('#b3201c', 0));
    sw.add(tele);
    sw.visible = false;
    group.add(sw);
    S4.sweep = { g: sw, m: swm, glow: swg, tele };
    // weights (hammer attack) and their warning circles
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2.2, 24), m.dark);
      w.add(body);
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.12, 8, 30).rotateX(Math.PI / 2), m.brass);
      band.position.y = -0.6;
      w.add(band);
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 40, 6).translate(0, 21, 0), m.iron);
      w.add(ch);
      w.visible = false;
      group.add(w);
      const tc = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.75, 3.15, 56).rotateX(-Math.PI / 2), warnMat('#b3201c', 0.85));
      const fill = new THREE.Mesh(new THREE.CircleGeometry(3.0, 56).rotateX(-Math.PI / 2), warnMat('#8a1a14', 0.3));
      tc.add(ring, fill);
      tc.visible = false;
      group.add(tc);
      S4.weights.push({ g: w, tc, ring, fill });
    }
    // shockwave rings
    for (let i = 0; i < 2; i++) {
      // a low wall of light that runs outward: jump it
      const r = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.75, 128, 1, true).translate(0, 0.375, 0), warnMat('#e0562a', 0.75));
      r.visible = false;
      group.add(r);
      S4.rings.push(r);
    }
    // the card and a heart galaxy for the end
    S4.card = LvKit.trialCard('d7', true);
    S4.card.position.copy(P(C4.x, C4.y + 2.2, C4.z));
    group.add(S4.card);
    S4.heart = Heart.galaxy(7000, 0.5, 77);
    S4.heart.group.position.copy(P(C4.x, C4.y + 22, C4.z));
    S4.heart.U.uForm.value = 0;
    S4.heart.group.visible = false;
    group.add(S4.heart.group);
    S4.glowL = LvKit.light(group, P(C4.x, C4.y + 9, C4.z), '#ffc080', 1.6, 40);
    // the instant time stops: a golden wave out of the pendulum's heart
    S4.wave = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), addMat('#ffcf8a', 0.7, 0));
    S4.wave.material.side = THREE.BackSide;
    S4.wave.visible = false;
    group.add(S4.wave);
    S4.wave2 = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 128).rotateX(-Math.PI / 2), addMat('#ffcf8a', 0.75, 0));
    S4.wave2.visible = false;
    group.add(S4.wave2);
    S4.redL = LvKit.light(group, P(BOSS.x, BOSS.y + 8, BOSS.z - 4), '#ff5a3a', 0.6, 30);
  };
  const buildBoss = () => {
    const m = mats();
    const b = new THREE.Group();
    b.position.copy(P(BOSS.x, BOSS.y, BOSS.z));
    b.rotation.y = Math.PI;
    group.add(b);
    // pedestal (can't be climbed)
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7, 4, 40), m.stone);
    ped.position.y = 2;
    b.add(ped);
    const pr = new THREE.Mesh(new THREE.TorusGeometry(6.3, 0.3, 10, 64).rotateX(Math.PI / 2), m.brass);
    pr.position.y = 4;
    b.add(pr);
    K.collider(BOSS.x, BOSS.y + 6, BOSS.z, 12, 12, 9);
    const body = new THREE.Group();
    body.position.y = 4;
    b.add(body);
    // legs
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 4.4, 16), m.dark);
      leg.position.set(s * 1.6, 2.2, 0);
      body.add(leg);
      const knee = new THREE.Mesh(gearGeo(1.1, 12, 0.18, 0.3, { holes: 3 }), m.brass);
      knee.position.set(s * 1.6, 2.4, 0.95);
      body.add(knee);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.6), m.dark);
      foot.position.set(s * 1.6, 0.3, 0.4);
      body.add(foot);
    });
    // the torso: a drum with the clock face on the chest
    const torso = new THREE.Group();
    torso.position.y = 7.4;
    body.add(torso);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.5, 5.2, 32), m.brass);
    torso.add(drum);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.2, 8, 40).rotateX(Math.PI / 2), m.dark);
    belt.position.y = -1.8;
    torso.add(belt);
    const faceM = new THREE.MeshBasicMaterial({ map: dialTex({ core: 'rgba(255,230,180,1)', mid: 'rgba(230,170,90,1)' }), transparent: true, toneMapped: false });
    faceM.color.setScalar(0.62);
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.1, 64), faceM);
    face.position.set(0, 0.2, 2.75);
    torso.add(face);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.16, 8, 48), m.dark);
    fr.position.copy(face.position);
    torso.add(fr);
    const fh = new THREE.Group();
    fh.position.set(0, 0.2, 2.82);
    const fMin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.75, 0.06).translate(0, 0.8, 0), m.dark);
    const fHr = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.06).translate(0, 0.52, 0.04), m.dark);
    fh.add(fMin, fHr);
    torso.add(fh);
    S4.faceHands = { min: fMin, hr: fHr };
    // gears turning in the back, a big key
    const back = new THREE.Mesh(gearGeo(2.4, 20, 0.3, 0.4, { holes: 5, heart: true }), m.copper);
    back.position.set(0, 0.6, -2.7);
    torso.add(back);
    const key = new THREE.Group();
    key.position.set(0, 0.6, -3.1);
    const ks = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2, 10).rotateX(Math.PI / 2), m.brass);
    ks.position.z = -0.8;
    key.add(ks);
    const kb = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.22, 8, 24), m.brass);
    kb.position.z = -1.9;
    key.add(kb);
    torso.add(key);
    // shoulders and arms (left: hammer raised to strike; right: the long hand)
    const arms = [];
    [-1, 1].forEach((s) => {
      const sh = new THREE.Group();
      sh.position.set(s * 3.3, 1.6, 0);
      torso.add(sh);
      const sg = new THREE.Mesh(gearGeo(1.0, 12, 0.16, 0.5, { holes: 3 }), m.brass);
      sg.rotation.y = Math.PI / 2;
      sh.add(sg);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 3.2, 12).translate(0, -1.6, 0), m.dark);
      sh.add(up);
      const el = new THREE.Group();
      el.position.y = -3.2;
      sh.add(el);
      const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 3, 12).translate(0, -1.5, 0), m.brass);
      el.add(fo);
      if (s < 0) {
        const hh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 16).rotateZ(Math.PI / 2), m.dark);
        hh.position.y = -3.3;
        el.add(hh);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.1, 6, 20).rotateY(Math.PI / 2), m.brass);
        band.position.y = -3.3;
        el.add(band);
      } else {
        const lh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.12).translate(0, -4.6, 0), m.copper);
        el.add(lh);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 4).rotateX(Math.PI), m.copper);
        tip.position.y = -7.2;
        el.add(tip);
      }
      arms.push({ sh, el });
    });
    // the head: a lantern with two lenses
    const head = new THREE.Group();
    head.position.y = 3.6;
    torso.add(head);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.8, 20), m.dark);
    head.add(hd);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 12, 0, TAU, 0, Math.PI / 2), m.brass);
    dome.position.y = 0.9;
    head.add(dome);
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a3a').multiplyScalar(0.8), toneMapped: false });
    [-0.5, 0.5].forEach((x) => {
      const e = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), eyeM);
      e.position.set(x, 0.1, 1.31);
      head.add(e);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 6, 20), m.brass);
      r.position.set(x, 0.1, 1.31);
      head.add(r);
    });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      const sg = new THREE.Mesh(gearGeo(0.35, 8, 0.08, 0.1), m.brass);
      sg.position.set(Math.sin(a) * 0.9, 1.6, Math.cos(a) * 0.9);
      sg.rotation.y = a;
      head.add(sg);
    }
    S4.boss = { g: b, body, torso, head, arms, eyeM, back, key, face, raise: 0, slam: 0, stagger: 0, freeze: 0 };
  };

  // ---------- build / sleep ----------
  let dynBoxes = [];
  const build = () => {
    if (built) return;
    built = true;
    mats();
    buildTower();
    buildHall();
    buildDial();
    buildEcho();
    buildFrozen();
    buildFast();
    buildArena();
    // global warm lights over the dial
    LvKit.light(group, P(-8, 12, 34), '#ffc888', 1.6, 46);
    LvKit.light(group, P(10, 10, 50), '#ffb070', 1.2, 40);
    LvKit.light(group, P(0, 6, 2), '#ffd6a0', 1.2, 22);
    dynBoxes = [...S1.minBox.map((o) => o.b), ...S1.hrBox.map((o) => o.b), S2.bridgeBox, ...S3.debris.map((d) => d.b)];
    setHands(0, 9);
    sleep();
  };
  const sleep = () => {
    dynBoxes.forEach((b) => (b.on = false));
    group.visible = false;
    au.stopAll();
  };
  const wake = () => {
    dynBoxes.forEach((b) => (b.on = true));
    group.visible = true;
  };

  // ---------- per frame ----------
  const tmp = V3();
  let ctrlT = 0;
  const update = (dt, t, v) => {
    if (!built) return;
    const m = mats();
    const slowK = v.slowK || 0;
    const tf = 1 - slowK * 0.85;
    // environment
    cloudU.uTime.value = t;
    motes.material.uniforms.uT.value = v.moteT;
    motes.material.uniforms.uCam.value.copy(R.camera.position);
    motes.material.uniforms.uPx.value = R.renderer.getPixelRatio() * (R.renderer.domElement.height / 720);
    wallGears.forEach((w) => (w.g.rotation.z += w.k * dt * tf * (v.stopped ? 0 : 1)));
    streams.forEach((s) => (s.t.offset.y = (s.t.offset.y + dt * s.k * tf * (v.stopped ? 0 : 1)) % 1));
    shafts.forEach((s) => (s.material.uniforms.uT.value = t));
    S1.deep.forEach((d) => (d.g.rotation.z += d.k * dt * (v.stopped ? 0 : 1)));
    // ----- part 1 -----
    setHands(v.aMin, v.aHr);
    S1.crankG.rotation.x = v.crankA || 0;
    for (let h = 0; h < 12; h++) {
      const G = S1.gates[h];
      const want = v.gates ? v.gates[h] : 0;
      if (G.want != null && want !== G.want && v.stage === 1) au.ratchet(P(C1.x + hourDir(h)[0] * NI.r0, 1.5, C1.z + hourDir(h)[1] * NI.r0), want ? 0.9 : 0.6);
      G.want = want;
      G.k = damp(G.k, want, 6, dt);
      G.g.position.y = G.y0 + G.k * (NI.roof - NI.y + 0.4);
      const on = G.k < 0.55;
      G.boxes.forEach((b) => (b.on = on));
      G.gh.material.color.set('#ff5f8a').multiplyScalar(0.25 + (want ? 0.5 : 0));
      S1.plaques[h].material.color.setScalar(h === v.target ? 0.62 + 0.18 * (0.5 + 0.5 * Math.sin(t * 5)) : 0.5);
    }
    if (S1.exitDoor) {
      const e = S1.exitDoor;
      e.k = damp(e.k || 0, v.exitOpen ? 1 : 0, 3, dt);
      e.g.position.y = e.y0 + e.k * 4.6;
      e.boxes.forEach((b) => (b.on = e.k < 0.5));
    }
    S1.coneK = damp(S1.coneK || 0, v.coneDown ? 1 : 0, 1.6, dt);
    S1.cone.position.y = O.y - S1.coneK * 3.6;
    S1.coneBox.on = S1.coneK < 0.4;
    S1.hubBox.on = S1.coneK > 0.6;
    S1.coneHeart.rotation.y = t * 1.2;
    // target beam: Valet only
    const tg = v.target;
    S1.beam.visible = tg >= 0;
    if (tg >= 0) {
      const d = hourDir(tg);
      S1.beam.position.copy(P(C1.x + d[0] * 19, NI.y, C1.z + d[1] * 19));
      S1.beam.material.opacity = 0.1 + 0.05 * Math.sin(t * 3);
    }
    // sand curtains: Dame only
    S1.curtains.forEach((c, i) => {
      const h = v.curtains && v.curtains[i] != null ? v.curtains[i] : null;
      c.k = damp(c.k, h != null ? 1 : 0, 3, dt);
      c.g.visible = c.k > 0.01;
      if (h != null) c.g.rotation.y = (-h * Math.PI) / 6;
      c.m.opacity = c.k * 0.75;
      c.t.offset.y = (c.t.offset.y + dt * 1.6) % 1;
    });
    // the control dial redraws when the time moves
    ctrlT -= dt;
    const key = Math.round(v.m * 2) + '|' + tg + '|' + (v.ctrlCurt || '');
    if (key !== S1.ctrlKey && ctrlT <= 0) {
      S1.ctrlKey = key;
      ctrlT = 0.05;
      drawCtrl(v.m, tg, null);
    }
    // ----- part 2 -----
    S2.plates.forEach((p, i) => {
      const on = v.plates ? v.plates[i] : 0;
      p.k = damp(p.k, on ? 1 : 0, 10, dt);
      p.top.position.y = 0.12 - p.k * 0.07;
      p.hm.color.copy(p.col).multiplyScalar(0.25 + p.k * 0.55);
      p.ring.material.opacity = p.k * (0.5 + 0.3 * Math.sin(t * 6));
    });
    const be = v.bridge || 0;
    if (S2.beWas != null && Math.floor(be * 6) !== Math.floor(S2.beWas * 6)) au.ratchet(P(0, 0, BR.z0 + (BR.z1 - BR.z0) * be), 0.8);
    S2.beWas = be;
    S2.bridge.children.forEach((s) => {
      const i = s.userData.i;
      const k = clamp(be * 6 - i, 0, 1);
      s.visible = k > 0.02;
      s.scale.z = Math.max(0.02, k);
      s.position.z = ((i + 0.5 * k) * (BR.z1 - BR.z0)) / 6;
    });
    const blen = (BR.z1 - BR.z0) * be;
    S2.bridgeBox.on = be > 0.02 && v.stage <= 3;
    setBox(S2.bridgeBox, 0, -0.2, BR.z0 + blen / 2, BR.hw * 2, 0.4, Math.max(0.05, blen));
    S2.glass.forEach((g, i) => (g.rotation.z = be * 6 * (i ? -1 : 1)));
    S2.gates.forEach((G, i) => {
      const want = v.gates2 ? v.gates2[i] : 0;
      if (G.want != null && want !== G.want) au.clunk(P(0, 3, GATES2[i]), want ? 0.55 : 0.35);
      G.want = want;
      G.k = damp(G.k, want ? 1 : 0, 7, dt);
      G.g.position.y = G.y0 + G.k * 4.4;
      G.box.on = G.k < 0.5;
    });
    // the echo
    const looks = ['dame', 'valet'];
    looks.forEach((lk) => {
      const a = S2.echo[lk];
      if (a && (!v.echo || v.echo.look !== lk)) a.visible = false;
    });
    if (v.echo) {
      const a = echoAvatar(v.echo.look);
      a.visible = true;
      const e = v.echo;
      a.root.position.copy(P(e.x, e.y, e.z));
      a.root.rotation.y = e.yaw;
      a.update(dt, { speed: e.speed, grounded: e.gr, mode: 'walk', groundY: O.y + e.y, hand: false, flip: 0, punch: 0, aim: false, pitch: 0 }, t);
      S2.echoMat.opacity = e.wait ? 0.22 + 0.12 * Math.sin(t * 4) : 0.42;
      S2.echoRing.visible = true;
      S2.echoRing.position.copy(P(e.x, e.y + 0.05, e.z));
      S2.echoRing.material.opacity = 0.35 + 0.25 * Math.sin(t * 5);
    } else S2.echoRing.visible = false;
    if (v.rec) {
      S2.recRing.visible = true;
      S2.recRing.position.set(v.rec.p.x, v.rec.p.y + 0.06, v.rec.p.z);
      S2.recRing.scale.setScalar(1 + 0.15 * Math.sin(t * 8));
      S2.recHour.visible = true;
      S2.recHour.position.set(v.rec.p.x, v.rec.p.y + 2.6, v.rec.p.z);
      S2.recHour.rotation.z = Math.min(1, v.rec.k) * Math.PI;
    } else {
      S2.recRing.visible = false;
      S2.recHour.visible = false;
    }
    // ----- part 3 -----
    const fall = v.fallT || 0;
    // time running backwards: the debris climb back up to where they hung
    if (S3.fallWas != null && fall < S3.fallWas - 1e-4 && !S3.rew && fall > 0.2) {
      S3.rew = true;
      au.whoosh(P(0, 3, 164), 1.1, true);
      au.shimmer(P(0, 3, 164), true);
    }
    if (fall >= (S3.fallWas || 0)) S3.rew = false;
    S3.fallWas = fall;
    S3.debris.forEach((d, i) => {
      const k = Math.max(0, fall - 0.6);
      const drop = 0.5 * 9 * k * k * d.sp;
      const shake = fall > 0 && fall < 0.6 ? Math.sin(t * 60 + i) * 0.05 : 0;
      d.g.position.copy(P(d.x + shake, d.y - drop, d.z));
      d.g.rotation.y = k * d.sp * 0.6;
      d.g.rotation.z = k * 0.3 * (i % 2 ? 1 : -1);
      const gone = drop > 40;
      d.g.visible = !gone;
      d.b.on = !gone && v.stage <= 3;
      setBox(d.b, d.x, d.y - drop - 0.25, d.z, d.w, 0.5, d.d);
    });
    {
      const pos = S3.grains.geometry.attributes.position;
      const base = S3.grains.userData.base;
      const k = Math.max(0, fall - 0.3);
      for (let i = 0; i < pos.count; i++) pos.setY(i, base[i * 3 + 1] - 0.5 * 9 * k * k * (0.6 + (i % 5) * 0.12));
      pos.needsUpdate = true;
      S3.grains.material.opacity = v.frozenK != null ? 0.45 + 0.4 * v.frozenK : 0.8;
    }
    Object.entries(S3.levers).forEach(([tag, L]) => {
      const held = v.levers && v.levers[tag];
      L.k = damp(L.k, held ? 1 : 0, 8, dt);
      L.arm.rotation.z = 0.5 - L.k * 1.0;
      L.gear.rotation.z += dt * (held ? 0 : 2.5);
      L.lamp.material.color.set(held ? '#ffcf8a' : '#552010');
    });
    {
      const lk = S3.lockG;
      lk.k = damp(lk.k, v.locked ? 1 : 0, 2, dt);
      lk.g.rotation.y = lk.k * Math.PI;
      lk.sandT.scale.setScalar(1 - lk.k * 0.6);
    }
    S3.discs.forEach((d, i) => {
      d.a = v.discA != null ? v.discA : d.a;
      d.g.rotation.y = d.a * (i ? -1 : 1);
      const w = v.discW || 0;
      d.blur.material.opacity = clamp((w - 1.2) / 8, 0, 0.45);
    });
    S3.pends.forEach((p, i) => {
      const a = v.pend ? v.pend[i] : 0;
      p.piv.rotation.z = a;
      p.trail.material.opacity = (v.pendBlur || 0) * 0.35;
    });
    if (v.slowK > 0.01 && v.stage === 3) {
      S3.slowDome.visible = true;
      S3.slowDome.position.copy(P(0, 7, 207));
      S3.slowDome.scale.setScalar(4 + 30 * Math.min(1, v.slowK * 1.5));
      S3.slowDome.material.opacity = 0.18 * v.slowK;
    } else S3.slowDome.visible = false;
    // ----- part 4 -----
    updateArena(dt, t, v);
  };

  const updateArena = (dt, t, v) => {
    const b4 = v.b4 || {};
    const beat = b4.beat || 0;
    const stopped = !!b4.stopped;
    // pendulum: one swing per beat, ticks at the extremes
    const amp = 0.36;
    const ang = stopped ? b4.frozenAng : amp * Math.cos(Math.PI * beat);
    S4.pend.g.rotation.z = ang;
    const bx = PIV.x + Math.sin(ang) * PEND4_L;
    S4.pend.shadow.position.copy(P(bx, C4.y + 0.03, PIV.z));
    S4.pend.shadow.scale.setScalar(1 + Math.abs(Math.sin(ang)) * 0.4);
    S4.pend.core.material.color.set('#ff5f8a').multiplyScalar(0.4 + 0.3 * Math.max(0, Math.cos(TAU * beat)));
    // stations
    S4.st.forEach((s, i) => {
      const jam = b4.jam ? b4.jam[i] : 0;
      const braked = b4.brake ? b4.brake[i] : 0;
      s.jam = damp(s.jam, jam ? 1 : 0, 6, dt);
      const bk = b4.brakeK ? b4.brakeK[i] : 0;
      const ready = braked && bk >= 0.95;
      if (!jam && !stopped) {
        // braked long enough: one turn every two beats with the notch up on the even beats; free: much faster
        if (ready) {
          const tg = -Math.PI * beat;
          const d = Math.atan2(Math.sin(tg - s.a), Math.cos(tg - s.a));
          s.a += d * Math.min(1, dt * 9);
        } else s.a -= dt * (9 - 7.5 * bk);
      }
      s.gear.rotation.z = s.a;
      s.notch.material.color.set(jam ? '#ffcf8a' : '#ff5f8a').multiplyScalar(jam ? 0.6 : ready ? 0.5 + 0.4 * Math.max(0, Math.cos(Math.PI * beat)) : 0.35);
      s.wedge.position.y = 3.8 - s.jam * 0.95;
      s.mark.material.color.set(jam ? '#ffcf8a' : '#ff8fb0').multiplyScalar(jam ? 0.7 : 0.3 + (braked ? 0.4 : 0));
      s.brake.arm.rotation.x = braked || jam ? -0.5 : 0.45;
      s.wl.arm.rotation.x = jam ? -0.5 : 0.45;
      s.brake.ring.material.opacity = jam ? 0.08 : 0.25 + (b4.hold && b4.hold[i * 2] ? 0.4 : 0);
      s.wl.ring.material.opacity = jam ? 0.08 : 0.25 + (b4.hold && b4.hold[i * 2 + 1] ? 0.4 : 0);
      s.steamK = Math.max(0, s.steamK - dt * 0.6);
      s.steam.visible = s.steamK > 0.01;
      s.steam.scale.setScalar(1 + (1 - s.steamK) * 4);
      s.steam.material.opacity = s.steamK * 0.4;
    });
    // the boss
    const B = S4.boss;
    B.raise = damp(B.raise, b4.raise || 0, 8, dt);
    B.slam = Math.max(0, B.slam - dt * 2.5);
    B.stagger = Math.max(0, B.stagger - dt * 1.2);
    const bob = stopped ? 0 : Math.abs(Math.sin(Math.PI * beat)) * 0.15;
    B.body.position.y = 4 + bob - B.stagger * 0.3;
    B.torso.rotation.x = -B.stagger * 0.2;
    if (!stopped) {
      B.back.rotation.z += dt * 0.8;
      B.key.rotation.z = Math.floor(beat) * 0.4;
      B.head.rotation.y = Math.sin(t * 0.7) * 0.25;
      const L = B.arms[0];
      L.sh.rotation.x = -B.raise * 2.2 + B.slam * 1.6;
      L.el.rotation.x = -B.raise * 0.8;
      const Rr = B.arms[1];
      Rr.sh.rotation.x = -0.3 - (b4.sweepRaise || 0) * 1.4;
      Rr.sh.rotation.z = (b4.sweepRaise || 0) * 0.4;
    }
    B.eyeM.color.set(stopped ? '#ffcf8a' : '#ff6a3a').multiplyScalar(stopped ? 0.5 : 0.55 + 0.25 * Math.max(0, Math.cos(TAU * beat)));
    // the face hands: running, then set to the hour of their meeting
    const fm = b4.faceMin != null ? b4.faceMin : (t * 3) % 720;
    S4.faceHands.min.rotation.z = -((fm % 60) / 60) * TAU;
    S4.faceHands.hr.rotation.z = -(fm / 720) * TAU;
    if (S4.floorMin) {
      S4.floorMin.g.rotation.y = -((fm % 60) / 60) * TAU;
      S4.floorHr.g.rotation.y = -(fm / 720) * TAU;
      const gk = stopped ? Math.min(1, (b4.won || 0) * 0.8) : 0;
      S4.floorMin.gl.material.color.set('#ffcf8a').multiplyScalar(0.15 + 0.6 * gk);
      S4.floorHr.gl.material.color.set('#ff9a6a').multiplyScalar(0.15 + 0.6 * gk);
    }
    // weights
    S4.weights.forEach((w, i) => {
      const a = b4.weights && b4.weights[i];
      if (!a) {
        w.g.visible = false;
        w.tc.visible = false;
        return;
      }
      const k = a.k; // 0..1 warning, >1 after the strike
      w.tc.visible = k < 1.4;
      w.tc.position.copy(P(a.x, C4.y + 0.04, a.z));
      w.ring.scale.setScalar(Math.max(0.05, 1 - Math.min(1, k)) * 0.8 + 0.2);
      w.ring.material.opacity = k < 1 ? 0.6 + 0.3 * Math.sin(t * 14) : Math.max(0, 1.4 - k);
      w.fill.material.opacity = k < 1 ? 0.15 + k * 0.3 : Math.max(0, 1.4 - k) * 0.5;
      w.g.visible = k > 0.55 && k < 2.2;
      const fallK = clamp((k - 0.55) / 0.45, 0, 1);
      const y = k < 1 ? 26 - 25 * fallK * fallK : 1.1 + Math.max(0, k - 1.5) * 30;
      w.g.position.copy(P(a.x, C4.y + y, a.z));
    });
    // sweep
    const sw = b4.sweep;
    if (sw) {
      S4.sweep.g.visible = true;
      S4.sweep.g.rotation.y = sw.a;
      const live = sw.k >= 0;
      S4.sweep.m.visible = live;
      S4.sweep.glow.visible = live;
      S4.sweep.tele.material.opacity = live ? 0 : 0.35 + 0.3 * Math.sin(t * 16);
      S4.sweep.m.position.y = live ? 0 : 3;
    } else S4.sweep.g.visible = false;
    // rings
    S4.rings.forEach((r, i) => {
      const a = b4.rings && b4.rings[i];
      r.visible = !!a && a.r > 0.3;
      if (!a) return;
      r.position.copy(P(BOSS.x, C4.y + 0.02, BOSS.z));
      r.scale.set(a.r, 1, a.r);
      r.material.opacity = 0.75 * clamp(1 - (a.r - 30) / 12, 0, 1);
    });
    // the stop wave
    const et = b4.endT != null ? b4.endT : -1;
    const wk = et >= 0 && et < 2.2 ? et / 2.2 : -1;
    S4.wave.visible = wk >= 0;
    S4.wave2.visible = wk >= 0;
    if (wk >= 0) {
      const pp = S4.pend.g.localToWorld(V3(0, -PEND4_L - 1.6, 0));
      S4.wave.position.copy(pp);
      S4.wave.scale.setScalar(1 + 70 * (1 - Math.pow(1 - wk, 3)));
      S4.wave.material.opacity = 0.45 * (1 - wk);
      S4.wave2.position.copy(P(C4.x, C4.y + 0.06, C4.z));
      S4.wave2.scale.setScalar(0.5 + 40 * (1 - Math.pow(1 - wk, 2)));
      S4.wave2.material.opacity = 0.8 * (1 - wk);
    }
    // lights / end
    S4.redL.intensity = stopped ? 0 : 0.5 + 0.6 * Math.max(0, Math.cos(TAU * beat));
    const won = b4.won || 0;
    S4.glowL.intensity = 1.0 + Math.min(1, won) * 0.9;
    S4.heart.group.visible = won > 0.2;
    if (S4.heart.group.visible) {
      S4.heart.U.uTime.value = t;
      S4.heart.U.uPx.value = R.renderer.getPixelRatio() * 0.3;
      S4.heart.U.uForm.value = Math.min(1, (won - 0.2) * 0.6);
      S4.heart.group.rotation.y = t * 0.12;
    }
    S4.card.visible = !!b4.cardOn;
    if (S4.card.visible) {
      S4.card.rotation.y = t * 1.2;
      S4.card.position.y = O.y + C4.y + Math.max(2.2, 16 - (b4.cardT || 0) * 4) + Math.sin(t * 2) * 0.1;
    }
  };

  // effects called by the level
  const fxArena = {
    slam(i) {
      S4.boss.slam = 1;
    },
    stagger() {
      S4.boss.stagger = 1;
    },
    steam(i) {
      S4.st[i].steamK = 1;
    },
  };

  return {
    O,
    P,
    rel,
    au,
    get built() {
      return built;
    },
    build,
    wake,
    sleep,
    update,
    fx: fxArena,
    get screen() {
      return screen;
    },
    // part 1
    C1,
    NI,
    MIN_LEN,
    HR_LEN,
    CRANK,
    hourDir,
    polar,
    hourDist,
    ROMAN,
    onMinute,
    onHour,
    nicheAt,
    nicheSpot,
    CRANK_SPOT,
    nearCrank: (q) => Math.hypot(q.x - CRANK.x, q.z - CRANK.z) < 2.0 && Math.abs(q.y - CRANK.y) < 1.2,
    // part 2
    PL_A,
    PL_F,
    PL_B,
    BR,
    LANE,
    GATES2,
    // part 3
    L3,
    J1,
    J2,
    J3,
    LOCK,
    DEB,
    LEDGE,
    DISCS,
    DISC_R,
    PEND,
    PEND_L,
    PEND_Y,
    FAR,
    nearLever: (q, p, r = 1.9) => Math.hypot(q.x - p.x, q.z - p.z) < r && Math.abs(q.y - p.y) < 1.3,
    onDisc: (q) => DISCS.findIndex((c) => Math.hypot(q.x - c.x, q.z - c.z) < DISC_R + 0.2 && Math.abs(q.y - c.y) < 0.35),
    // part 4
    C4,
    AR,
    BOSS,
    stPos,
    ST_ANG,
    inArena: (q) => Math.hypot(q.x - C4.x, q.z - C4.z) < AR + 0.5 && q.y > C4.y - 1 && q.y < C4.y + 5,
    nearCard: (q) => Math.hypot(q.x - C4.x, q.z - C4.z) < 3.4 && Math.abs(q.y - C4.y) < 2,
    pendPos: (beat, stopped, frozenAng) => {
      const a = stopped ? frozenAng : 0.36 * Math.cos(Math.PI * beat);
      return P(PIV.x + Math.sin(a) * PEND4_L, PIV.y - Math.cos(a) * PEND4_L, PIV.z);
    },
  };
})();
