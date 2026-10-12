// Procedural texture library. Every surface kind is generated once, on first use, as two
// seamless 1024² maps: albedo, and data (R = height, G = roughness). Materials sample them
// triplanar in world space, so any box, cylinder or ramp gets real-scale texture without
// UVs, with height turned into bump through screen-space derivatives.
const Tex = (() => {
  const N = 1024;
  const cache = new Map();
  const matCache = new Map();

  // ---------- seamless noise ----------
  const rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  };
  const lattice = (period, seed) => {
    const r = rng(seed);
    const g = new Float32Array(period * period);
    for (let i = 0; i < g.length; i++) g[i] = r();
    return g;
  };
  const sm = (t) => t * t * (3 - 2 * t);
  // value noise that wraps at `period` cells across the texture
  const noiseLayer = (period, seed) => {
    const g = lattice(period, seed);
    return (u, v) => {
      const x = u * period;
      const y = v * period;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = sm(x - x0);
      const fy = sm(y - y0);
      const a = ((x0 % period) + period) % period;
      const b = ((y0 % period) + period) % period;
      const a1 = (a + 1) % period;
      const b1 = (b + 1) % period;
      const v00 = g[b * period + a];
      const v10 = g[b * period + a1];
      const v01 = g[b1 * period + a];
      const v11 = g[b1 * period + a1];
      return (v00 + (v10 - v00) * fx) * (1 - fy) + (v01 + (v11 - v01) * fx) * fy;
    };
  };
  const fbm = (base, oct, seed, gain = 0.5) => {
    const L = [];
    for (let i = 0; i < oct; i++) L.push(noiseLayer(base << i, seed + i * 977));
    return (u, v) => {
      let s = 0;
      let a = 1;
      let t = 0;
      for (let i = 0; i < oct; i++) {
        s += L[i](u, v) * a;
        t += a;
        a *= gain;
      }
      return s / t;
    };
  };
  // seamless cellular noise: distance to nearest and second nearest feature point, cell id
  const voronoi = (cells, seed, jitter = 0.9) => {
    const r = rng(seed);
    const pts = [];
    for (let j = 0; j < cells; j++)
      for (let i = 0; i < cells; i++)
        pts.push([
          (i + 0.5 + (r() - 0.5) * jitter) / cells,
          (j + 0.5 + (r() - 0.5) * jitter) / cells,
          r(),
        ]);
    return (u, v) => {
      const ci = Math.floor(u * cells);
      const cj = Math.floor(v * cells);
      let d1 = 9;
      let d2 = 9;
      let id = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = ci + di;
          const jj = cj + dj;
          const wi = ((ii % cells) + cells) % cells;
          const wj = ((jj % cells) + cells) % cells;
          const p = pts[wj * cells + wi];
          const px = p[0] + (ii - wi) / cells;
          const py = p[1] + (jj - wj) / cells;
          const d = Math.hypot(u - px, v - py);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            id = p[2];
          } else if (d < d2) d2 = d;
        }
      return [d1 * cells, d2 * cells, id];
    };
  };
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const mix = (a, b, t) => a + (b - a) * t;
  const hex = (h) => {
    const c = new THREE.Color(h);
    return [c.r * 255, c.g * 255, c.b * 255];
  };

  // ---------- surface recipes: (u, v) -> [r, g, b, height, roughness] ----------
  const RC = {
    concrete(s) {
      const n = fbm(4, 6, s);
      const sp = noiseLayer(256, s + 5);
      const st = fbm(2, 3, s + 9);
      return (u, v) => {
        const h = n(u, v);
        const k = sp(u, v);
        const stain = st(u, v);
        let l = 150 + (h - 0.5) * 50 - (stain > 0.62 ? (stain - 0.62) * 120 : 0);
        if (k > 0.93) l -= 35;
        if (k < 0.05) l += 25;
        return [l, l * 0.99, l * 0.97, h * 0.7 + k * 0.15, 0.82 + (h - 0.5) * 0.1];
      };
    },
    asphalt(s) {
      const n = fbm(8, 5, s);
      const ag = noiseLayer(384, s + 1);
      const ag2 = noiseLayer(170, s + 2);
      return (u, v) => {
        const h = n(u, v);
        const a = ag(u, v);
        const b = ag2(u, v);
        let l = 52 + (h - 0.5) * 22;
        if (a > 0.86) l += (a - 0.86) * 420;
        if (b < 0.12) l -= 14;
        return [l, l, l * 1.03, a * 0.6 + h * 0.4, 0.9 - (a > 0.9 ? 0.25 : 0)];
      };
    },
    pavement(s) {
      const n = fbm(8, 4, s);
      const T = 4;
      const tv = lattice(T * T, s + 3);
      return (u, v) => {
        const x = u * T;
        const y = v * T;
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const id = tv[(Math.floor(y) % T) * T + (Math.floor(x) % T)];
        const e = Math.min(fx, 1 - fx, fy, 1 - fy);
        const grout = e < 0.025 ? 0 : e < 0.045 ? (e - 0.025) / 0.02 : 1;
        const h = n(u, v);
        const l = mix(70, 168 + (id - 0.5) * 30 + (h - 0.5) * 30, grout);
        return [l, l * 0.98, l * 0.95, grout * 0.8 + h * 0.2, mix(0.95, 0.75, grout)];
      };
    },
    brick(s) {
      const n = fbm(8, 5, s);
      const rows = 16;
      const cols = 8;
      const tv = lattice(rows * cols, s + 4);
      return (u, v) => {
        const y = v * rows;
        const r = Math.floor(y);
        const x = u * cols + (r % 2 ? 0.5 : 0);
        const c = Math.floor(x);
        const fx = x - c;
        const fy = y - r;
        const e = Math.min(fx * 2.1, (1 - fx) * 2.1, fy, 1 - fy);
        const m = e < 0.07 ? 0 : e < 0.12 ? (e - 0.07) / 0.05 : 1;
        const id = tv[(r % rows) * cols + (((c % cols) + cols) % cols)];
        const h = n(u, v);
        const base = [150 + id * 50 + (h - 0.5) * 40, 70 + id * 22, 52 + id * 16];
        const mort = [170, 164, 152];
        return [
          mix(mort[0], base[0], m),
          mix(mort[1], base[1], m),
          mix(mort[2], base[2], m),
          m * 0.85 + h * 0.15,
          mix(0.95, 0.85, m),
        ];
      };
    },
    stone(s) {
      // castle ashlar: rows of blocks of varying length, chipped edges
      const n = fbm(6, 6, s);
      const ch = fbm(32, 3, s + 7);
      const rows = 6;
      const tv = lattice(64, s + 8);
      return (u, v) => {
        const y = v * rows;
        const r = Math.floor(y);
        const off = tv[r % 64] * 0.7;
        const x = u * 4 + off + (r % 2) * 0.5;
        const c = Math.floor(x);
        const fx = x - c;
        const fy = y - r;
        const id = tv[(r * 7 + ((c % 4) + 4) * 3) % 64];
        const chip = (ch(u, v) - 0.5) * 0.06;
        const e = Math.min(fx * 1.7, (1 - fx) * 1.7, fy, 1 - fy) + chip;
        const m = e < 0.04 ? 0 : e < 0.1 ? (e - 0.04) / 0.06 : 1;
        const h = n(u, v);
        const l = 112 + (id - 0.5) * 36 + (h - 0.5) * 46;
        return [
          mix(48, l, m),
          mix(46, l * 0.97, m),
          mix(44, l * 0.92, m),
          m * (0.75 + h * 0.25),
          0.88,
        ];
      };
    },
    cobble(s) {
      const vo = voronoi(10, s);
      const n = fbm(8, 4, s + 2);
      return (u, v) => {
        const [d1, d2, id] = vo(u, v);
        const e = d2 - d1;
        const m = clamp01((e - 0.05) / 0.12);
        const dome = clamp01(1 - d1 * 1.2);
        const h = n(u, v);
        const l = 95 + (id - 0.5) * 40 + (h - 0.5) * 30;
        return [
          mix(40, l, m),
          mix(38, l * 0.96, m),
          mix(36, l * 0.9, m),
          m * (0.5 + dome * 0.5),
          0.85,
        ];
      };
    },
    wood(s) {
      const n = fbm(4, 5, s);
      const grain = noiseLayer(64, s + 1);
      const planks = 6;
      const tv = lattice(planks * 4, s + 2);
      return (u, v) => {
        const p = Math.floor(v * planks);
        const fy = v * planks - p;
        const seg = Math.floor(u * 2 + tv[p] * 2);
        const id = tv[(p * 4 + seg) % (planks * 4)];
        const g = grain(u * 0.25 + id, v * 6 + n(u, v) * 0.6);
        const ring = Math.sin((v * planks * 9 + n(u, v) * 6 + id * 20) * Math.PI) * 0.5 + 0.5;
        const seam = fy < 0.03 || fy > 0.97 ? 0 : 1;
        const l = (0.75 + ring * 0.2 + (g - 0.5) * 0.25 + (id - 0.5) * 0.2) * seam;
        return [150 * l + 10, 92 * l + 6, 52 * l + 4, seam * (0.6 + ring * 0.3), 0.7 - ring * 0.1];
      };
    },
    metal(s) {
      const br = noiseLayer(512, s);
      const n = fbm(4, 4, s + 1);
      const sc = noiseLayer(64, s + 2);
      return (u, v) => {
        const b = br(u * 0.02, v);
        const h = n(u, v);
        const scr = sc(u * 6, v * 0.5) > 0.985 ? 1 : 0;
        const l = 150 + (b - 0.5) * 40 + (h - 0.5) * 30 + scr * 50;
        return [l, l * 1.01, l * 1.04, b * 0.3 + h * 0.2, 0.32 + (h - 0.5) * 0.2 - scr * 0.1];
      };
    },
    marble(s) {
      const n = fbm(3, 6, s);
      const n2 = fbm(6, 4, s + 3);
      return (u, v) => {
        const t = Math.sin((u + v) * Math.PI * 4 + n(u, v) * 9) * 0.5 + 0.5;
        const vein = Math.pow(1 - Math.abs(t * 2 - 1), 12);
        const l = 228 - vein * 120 - (n2(u, v) - 0.5) * 20;
        return [l, l * 0.98, l * 0.97, 0.5 - vein * 0.2, 0.18 + vein * 0.2];
      };
    },
    tiles(s) {
      const n = fbm(8, 4, s);
      const T = 8;
      return (u, v) => {
        const x = u * T;
        const y = v * T;
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const e = Math.min(fx, 1 - fx, fy, 1 - fy);
        const g = e < 0.02 ? 0 : 1;
        const chk = (Math.floor(x) + Math.floor(y)) % 2;
        const l = g ? (chk ? 232 : 30) + (n(u, v) - 0.5) * 12 : 120;
        return [l, l, l, g * 0.6, g ? 0.25 : 0.9];
      };
    },
    grass(s) {
      const n = fbm(8, 5, s);
      const bl = noiseLayer(512, s + 1);
      return (u, v) => {
        const h = n(u, v);
        const b = bl(u, v * 0.3);
        const l = 0.6 + h * 0.4 + (b - 0.5) * 0.35;
        return [60 * l, 120 * l, 48 * l, b * 0.6 + h * 0.4, 0.95];
      };
    },
    sand(s) {
      const n = fbm(6, 6, s);
      const g = noiseLayer(512, s + 1);
      return (u, v) => {
        const h = n(u, v);
        const ripple = Math.sin((v * 18 + h * 4) * Math.PI) * 0.5 + 0.5;
        const l = 0.85 + (g(u, v) - 0.5) * 0.2 + ripple * 0.06;
        return [214 * l, 186 * l, 140 * l, ripple * 0.5 + h * 0.5, 0.93];
      };
    },
    rock(s) {
      const n = fbm(4, 7, s, 0.55);
      return (u, v) => {
        const h = n(u, v);
        const ridge = 1 - Math.abs(h * 2 - 1);
        const l = 70 + ridge * 80;
        return [l, l * 0.96, l * 0.9, ridge, 0.9];
      };
    },
    plaster(s) {
      const n = fbm(8, 6, s);
      return (u, v) => {
        const h = n(u, v);
        const l = 200 + (h - 0.5) * 30;
        return [l, l * 0.98, l * 0.95, h, 0.9];
      };
    },
    fabric(s) {
      const n = fbm(8, 3, s);
      return (u, v) => {
        const wx = Math.sin(u * N * 0.5) * 0.5 + 0.5;
        const wy = Math.sin(v * N * 0.5) * 0.5 + 0.5;
        const w = (wx + wy) * 0.5;
        const l = 170 + (w - 0.5) * 40 + (n(u, v) - 0.5) * 30;
        return [l, l, l, w, 0.95];
      };
    },
  };

  // ---------- generation ----------
  const build = (kind) => {
    if (cache.has(kind)) return cache.get(kind);
    const f = RC[kind](kind.length * 7919 + 13);
    const a = document.createElement('canvas');
    const d = document.createElement('canvas');
    a.width = a.height = d.width = d.height = N;
    const ga = a.getContext('2d');
    const gd = d.getContext('2d');
    const ia = ga.createImageData(N, N);
    const id = gd.createImageData(N, N);
    const A = ia.data;
    const D = id.data;
    for (let y = 0; y < N; y++) {
      const v = y / N;
      for (let x = 0; x < N; x++) {
        const o = (y * N + x) * 4;
        const r = f(x / N, v);
        A[o] = r[0];
        A[o + 1] = r[1];
        A[o + 2] = r[2];
        A[o + 3] = 255;
        D[o] = clamp01(r[3]) * 255;
        D[o + 1] = clamp01(r[4]) * 255;
        D[o + 2] = 0;
        D[o + 3] = 255;
      }
    }
    ga.putImageData(ia, 0, 0);
    gd.putImageData(id, 0, 0);
    const mk = (c) => {
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = R_ANISO();
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      return t;
    };
    const out = { albedo: mk(a), data: mk(d) };
    cache.set(kind, out);
    return out;
  };
  const R_ANISO = () => {
    try {
      return Math.min(8, R.renderer.capabilities.getMaxAnisotropy());
    } catch (e) {
      return 4;
    }
  };

  // ---------- triplanar material ----------
  const hq = () => typeof SETTINGS === 'undefined' || SETTINGS.quality !== 'low';
  /**
   * kind: recipe name. opt: color (tint, multiplied), scale (meters per texture tile),
   * bump (height strength), rough (roughness multiplier), metal, emissive.
   */
  const mat = (kind, opt = {}) => {
    const key = kind + JSON.stringify(opt);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({
      color: opt.color || '#ffffff',
      roughness: opt.rough != null ? opt.rough : 1,
      metalness: opt.metal || 0,
      emissive: opt.emissive || '#000000',
      emissiveIntensity: opt.emissiveIntensity != null ? opt.emissiveIntensity : 1,
      transparent: !!opt.transparent,
      opacity: opt.opacity != null ? opt.opacity : 1,
    });
    if (!hq() || !RC[kind]) {
      matCache.set(key, m);
      return m;
    }
    const T = build(kind);
    const scale = 1 / (opt.scale || 4);
    const bump = opt.bump != null ? opt.bump : 1;
    m.userData.tri = { kind };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.tAlb = { value: T.albedo };
      sh.uniforms.tDat = { value: T.data };
      sh.uniforms.triScale = { value: scale };
      sh.uniforms.triBump = { value: bump * 0.05 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTriP;\nvarying vec3 vTriN;')
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
          {
            mat4 triM = modelMatrix;
            #ifdef USE_INSTANCING
              triM = modelMatrix * instanceMatrix;
            #endif
            vTriP = (triM * vec4(transformed, 1.0)).xyz;
            vTriN = normalize(mat3(triM) * objectNormal);
          }`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vTriP;
          varying vec3 vTriN;
          uniform sampler2D tAlb;
          uniform sampler2D tDat;
          uniform float triScale;
          uniform float triBump;
          vec3 triW() {
            vec3 w = pow(abs(normalize(vTriN)), vec3(4.0));
            return w / (w.x + w.y + w.z);
          }
          vec4 triSample(sampler2D t) {
            vec3 w = triW();
            vec3 p = vTriP * triScale;
            return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
          }`,
        )
        .replace(
          '#include <map_fragment>',
          'diffuseColor.rgb *= triSample(tAlb).rgb;\nvec4 triD = triSample(tDat);',
        )
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * triD.g;')
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            // bump from the height channel through screen-space derivatives
            float h = triD.r * triBump;
            vec3 dpx = dFdx(-vViewPosition);
            vec3 dpy = dFdy(-vViewPosition);
            float dhx = dFdx(h);
            float dhy = dFdy(h);
            vec3 r1 = cross(dpy, normal);
            vec3 r2 = cross(normal, dpx);
            float det = dot(dpx, r1);
            if (abs(det) > 1e-8) {
              vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
              normal = normalize(abs(det) * normal - grad);
            }
          }`,
        );
    };
    m.customProgramCacheKey = () => 'tri';
    matCache.set(key, m);
    return m;
  };

  // ---------- playing cards ----------
  const RED = '#c8102e';
  const BLACK = '#111111';
  const isRed = (suit) => suit === '♥' || suit === '♦';
  // pip layouts in a 3 x 7 grid (col, row), rows 0..6
  const PIPS = {
    A: [[1, 3]],
    2: [
      [1, 0],
      [1, 6],
    ],
    3: [
      [1, 0],
      [1, 3],
      [1, 6],
    ],
    4: [
      [0, 0],
      [2, 0],
      [0, 6],
      [2, 6],
    ],
    5: [
      [0, 0],
      [2, 0],
      [1, 3],
      [0, 6],
      [2, 6],
    ],
    6: [
      [0, 0],
      [2, 0],
      [0, 3],
      [2, 3],
      [0, 6],
      [2, 6],
    ],
    7: [
      [0, 0],
      [2, 0],
      [1, 1.5],
      [0, 3],
      [2, 3],
      [0, 6],
      [2, 6],
    ],
    8: [
      [0, 0],
      [2, 0],
      [1, 1.5],
      [0, 3],
      [2, 3],
      [1, 4.5],
      [0, 6],
      [2, 6],
    ],
    9: [
      [0, 0],
      [2, 0],
      [0, 2],
      [2, 2],
      [1, 3],
      [0, 4],
      [2, 4],
      [0, 6],
      [2, 6],
    ],
    10: [
      [0, 0],
      [2, 0],
      [1, 1],
      [0, 2],
      [2, 2],
      [0, 4],
      [2, 4],
      [1, 5],
      [0, 6],
      [2, 6],
    ],
  };
  const cardCache = new Map();
  /** rank: 'A', '2'..'10', 'V', 'D', 'R', 'J' (joker). suit: ♥ ♠ ♦ ♣ or '' for joker. */
  const card = (rank, suit) => {
    const key = rank + suit;
    if (cardCache.has(key)) return cardCache.get(key);
    const W = 768;
    const H = 1075;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const joker = rank === 'J';
    const col = joker ? RED : isRed(suit) ? RED : BLACK;
    // face with paper grain
    const rr = (x, y, w, h, r) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };
    g.fillStyle = '#f7f2e8';
    rr(0, 0, W, H, 48);
    g.fill();
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(200,180,150,0.18)');
    g.fillStyle = gr;
    rr(0, 0, W, H, 48);
    g.fill();
    const pr = rng(key.length * 31 + 7);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = pr() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)';
      g.fillRect(pr() * W, pr() * H, 2, 2);
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 3;
    rr(4, 4, W - 8, H - 8, 44);
    g.stroke();
    g.fillStyle = col;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const index = (flip) => {
      g.save();
      if (flip) {
        g.translate(W, H);
        g.rotate(Math.PI);
      }
      g.font = `bold ${rank.length > 1 ? 78 : 104}px Georgia, serif`;
      g.fillText(joker ? 'J' : rank, 78, 96);
      if (joker) {
        g.font = 'bold 30px Georgia, serif';
        ['O', 'K', 'E', 'R'].forEach((ch, i) => g.fillText(ch, 78, 160 + i * 36));
      } else Icons.draw(g, Icons.of(suit), 78, 180, 64);
      g.restore();
    };
    index(false);
    index(true);
    const box = { x: 205, y: 165, w: W - 410, h: H - 330 };
    if (joker) {
      g.strokeStyle = col;
      g.lineWidth = 6;
      rr(box.x, box.y, box.w, box.h, 24);
      g.stroke();
      Icons.draw(g, 'venetian-mask', W / 2, H / 2 - 40, 330);
      g.font = 'italic 64px Georgia, serif';
      g.fillText('Joker', W / 2, H / 2 + 230);
    } else if (PIPS[rank]) {
      const pips = PIPS[rank];
      const big = rank === 'A' ? 360 : rank === '10' || rank === '9' ? 112 : 124;
      pips.forEach(([cx, ry]) => {
        const x = box.x + (cx / 2) * box.w;
        const y = box.y + 40 + (ry / 6) * (box.h - 80);
        g.save();
        g.translate(x, y);
        if (ry > 3) g.rotate(Math.PI);
        Icons.draw(g, Icons.of(suit), 0, 0, big);
        g.restore();
      });
    } else {
      // court card: framed panel, big letter, crown or sword, suit
      g.strokeStyle = col;
      g.lineWidth = 6;
      rr(box.x, box.y, box.w, box.h, 24);
      g.stroke();
      g.lineWidth = 2;
      rr(box.x + 16, box.y + 16, box.w - 32, box.h - 32, 16);
      g.stroke();
      const sym = rank === 'D' ? 'crown' : rank === 'R' ? 'crown' : 'chevrons-up';
      g.globalAlpha = 0.9;
      Icons.draw(g, sym, W / 2, box.y + 150, 170);
      g.globalAlpha = 1;
      g.font = 'bold 300px Georgia, serif';
      g.fillText(rank, W / 2, H / 2 + 30);
      Icons.draw(g, Icons.of(suit), W / 2, box.y + box.h - 150, 170);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = R_ANISO();
    cardCache.set(key, t);
    return t;
  };

  return { mat, build, card, isRed, kinds: Object.keys(RC), RED, BLACK };
})();
