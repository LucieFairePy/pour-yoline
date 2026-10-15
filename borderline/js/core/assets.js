// Central asset library (ASSET-FIRST): every external model, texture and sound of the game is
// listed once in the manifest below (with its credits in assets/CATALOG.md) and loaded once,
// lazily, the first time something asks for it. Everything is shared: a model is cloned (same
// geometry and materials), a texture or a sound buffer is the same object for every user.
// Nothing here blocks the game: callers get a promise and keep their procedural fallback until
// the asset arrives (progressive loading), and a failed download only logs a warning.
// Three r128, classic script, no bundler: the GLTF loader is fetched from the same CDN version
// on first use. `?noassets` turns every external asset off (A/B tests, the lab page).
const Assets = (() => {
  const BASE = 'assets/';
  const V = '0.128.0';
  // id -> { type, url, ...options } (urls relative to BASE)
  const LIST = {
    // swords
    'sword.estoc': { type: 'gltf', url: 'models/sword_estoc.glb' },
    // sword slash (Kenney Particle Pack, alpha from luminance)
    'fx.slash': { type: 'tex', url: 'fx/slash.png' },
    'fx.twirl': { type: 'tex', url: 'fx/twirl.png' },
    // grapple rope (ambientCG Rope001)
    'tex.rope': { type: 'tex', url: 'textures/rope_col.jpg', repeat: true },
    'tex.ropeN': { type: 'tex', url: 'textures/rope_nrm.jpg', repeat: true },
    // decor: Poly Haven scans packed for Tex.mat(kind) (js/world/look.js registers them, a level
    // downloads a set only when it uses that kind): albedo (AO baked, mean matched to the recipe)
    // + nrm (R,G = normal XY, B = roughness), see assets/CATALOG.md
    'tex.stone.alb': { type: 'tex', url: 'textures/stone_alb.webp', repeat: true },
    'tex.stone.nrm': { type: 'tex', url: 'textures/stone_nrm.jpg', repeat: true, data: true },
    'tex.asphalt.alb': { type: 'tex', url: 'textures/asphalt_alb.webp', repeat: true },
    'tex.asphalt.nrm': { type: 'tex', url: 'textures/asphalt_nrm.jpg', repeat: true, data: true },
    'tex.wood.alb': { type: 'tex', url: 'textures/wood_alb.webp', repeat: true },
    'tex.wood.nrm': { type: 'tex', url: 'textures/wood_nrm.jpg', repeat: true, data: true },
    // ♣10 La Tour de Babel (js/world/tr_c10.js binds them to its own materials only)
    'tex.c10stone.alb': { type: 'tex', url: 'textures/c10_towerstone_alb.webp', repeat: true },
    'tex.c10stone.nrm': { type: 'tex', url: 'textures/c10_towerstone_nrm.jpg', repeat: true, data: true },
    'tex.c10brick.alb': { type: 'tex', url: 'textures/c10_brick_alb.webp', repeat: true },
    'tex.c10brick.nrm': { type: 'tex', url: 'textures/c10_brick_nrm.jpg', repeat: true, data: true },
    'tex.c10metal.alb': { type: 'tex', url: 'textures/c10_rustmetal_alb.webp', repeat: true },
    'tex.c10metal.nrm': { type: 'tex', url: 'textures/c10_rustmetal_nrm.jpg', repeat: true, data: true },
    // street lamp light cone (Kenney Light Masks cone_d_blur, flipped, luminance)
    'fx.cone': { type: 'tex', url: 'fx/lamp_cone.png' },
    // ♦10 Le Lac gelé (js/world/tr_d10.js binds them to its own materials only): Poly Haven rock
    // face, and the coast sand turned into snow
    'tex.d10rock.alb': { type: 'tex', url: 'textures/d10_rock_alb.webp', repeat: true },
    'tex.d10rock.nrm': { type: 'tex', url: 'textures/d10_rock_nrm.jpg', repeat: true, data: true },
    'tex.d10snow.alb': { type: 'tex', url: 'textures/d10_snow_alb.webp', repeat: true },
    'tex.d10snow.nrm': { type: 'tex', url: 'textures/d10_snow_nrm.jpg', repeat: true, data: true },
    // ♠ La Cour, the table of spades (js/world/cour_s.js binds them to its own materials only):
    // Poly Haven floor tiles turned to cold slate, and painted metal turned to blackened iron
    'tex.s_slate.alb': { type: 'tex', url: 'textures/s_slate_alb.webp', repeat: true },
    'tex.s_slate.nrm': { type: 'tex', url: 'textures/s_slate_nrm.jpg', repeat: true, data: true },
    'tex.s_iron.alb': { type: 'tex', url: 'textures/s_iron_alb.webp', repeat: true },
    'tex.s_iron.nrm': { type: 'tex', url: 'textures/s_iron_nrm.jpg', repeat: true, data: true },
    // ♥10 Le Marché (js/world/tr_h10.js binds them to its own materials only): the harlequin
    // floor (Poly Haven floor tiles 08, recoloured as a checker) and ivory plaster
    'tex.h10.floor.alb': { type: 'tex', url: 'textures/h10_floor_alb.webp', repeat: true },
    'tex.h10.floor.nrm': { type: 'tex', url: 'textures/h10_floor_nrm.jpg', repeat: true, data: true },
    'tex.h10.plaster.alb': { type: 'tex', url: 'textures/h10_plaster_alb.webp', repeat: true },
    'tex.h10.plaster.nrm': { type: 'tex', url: 'textures/h10_plaster_nrm.jpg', repeat: true, data: true },
    // ♣ La table de Trèfle (js/world/cour_c.js binds them to its own materials only): green marble
    // mosaic, made from the Poly Haven marble tiles
    'tex.ccmarble.alb': { type: 'tex', url: 'textures/cc_marble_alb.webp', repeat: true },
    'tex.ccmarble.nrm': { type: 'tex', url: 'textures/cc_marble_nrm.jpg', repeat: true, data: true },
    // ♦ table of the Cour (js/world/cour_d.js binds it to its own materials only): Poly Haven
    // marble tiles, recoloured as a warm mosaic for the floors of the observatory
    'tex.dcour.mosaic.alb': { type: 'tex', url: 'textures/dcour_mosaic_alb.webp', repeat: true },
    'tex.dcour.mosaic.nrm': { type: 'tex', url: 'textures/dcour_mosaic_nrm.jpg', repeat: true, data: true },
    // sounds (Kenney RPG Audio / Impact Sounds / Sci-fi Sounds, CC0)
    'snd.swing1': { type: 'sound', url: 'sounds/swing1.mp3' },
    'snd.swing2': { type: 'sound', url: 'sounds/swing2.mp3' },
    'snd.swing3': { type: 'sound', url: 'sounds/swing3.mp3' },
    'snd.swordHit1': { type: 'sound', url: 'sounds/sword_hit1.mp3' },
    'snd.swordHit2': { type: 'sound', url: 'sounds/sword_hit2.mp3' },
    'snd.grappleFire': { type: 'sound', url: 'sounds/grapple_fire.mp3' },
    'snd.grappleHit': { type: 'sound', url: 'sounds/grapple_hit.mp3' },
    'snd.grappleOut': { type: 'sound', url: 'sounds/grapple_out.mp3' },
    'snd.cloak': { type: 'sound', url: 'sounds/cloak.mp3' },
  };
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const off = !!(q && q.has('noassets'));
  const cache = new Map(); // id or url -> promise
  const done = new Map(); // id -> loaded value (sync access)
  const stats = { requested: 0, loaded: 0, failed: 0, reused: 0, bytes: 0, ms: 0 };

  // ---------- lazy loader scripts (same CDN + version as three.min.js) ----------
  const scripts = new Map();
  const script = (path, test) => {
    if (test()) return Promise.resolve();
    if (scripts.has(path)) return scripts.get(path);
    const p = new Promise((res, rej) => {
      const urls = [
        `https://cdn.jsdelivr.net/npm/three@${V}/${path}`,
        `https://unpkg.com/three@${V}/${path}`,
      ];
      const tryAt = (i) => {
        if (i >= urls.length) return rej(new Error('cannot load ' + path));
        const s = document.createElement('script');
        s.src = urls[i];
        s.onload = () => (test() ? res() : tryAt(i + 1));
        s.onerror = () => tryAt(i + 1);
        document.head.appendChild(s);
      };
      tryAt(0);
    });
    scripts.set(path, p);
    return p;
  };
  const gltfLoader = () =>
    script('examples/js/loaders/GLTFLoader.js', () => !!THREE.GLTFLoader).then(
      () => new THREE.GLTFLoader(),
    );

  // ---------- fetch helpers ----------
  const fetchBuf = (url) => {
    const t0 = performance.now();
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.arrayBuffer().then((b) => {
        stats.bytes += b.byteLength;
        stats.ms += performance.now() - t0;
        return b;
      });
    });
  };

  // the game renders with LinearEncoding output and its procedural maps are plain (non-decoded)
  // colours, so external colour maps stay linear too: same look, same tint maths
  const linearize = (root) =>
    root.traverse((o) => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => {
        if (m.map) m.map.encoding = THREE.LinearEncoding;
        if (m.emissiveMap) m.emissiveMap.encoding = THREE.LinearEncoding;
      });
    });

  const loaders = {
    gltf: (e) =>
      Promise.all([gltfLoader(), fetchBuf(BASE + e.url)]).then(
        ([L, buf]) =>
          new Promise((res, rej) =>
            L.parse(buf, BASE, (g) => {
              linearize(g.scene);
              res(g);
            }, rej),
          ),
      ),
    tex: (e) =>
      fetchBuf(BASE + e.url)
        .then((b) => {
          const blob = new Blob([b]);
          // decoded off the main thread when the browser can (flipped there: WebGL ignores
          // flipY for ImageBitmaps), else a plain <img>
          // data maps (normals, roughness) must reach the GPU untouched: no colour management
          const o = e.data
            ? { imageOrientation: 'flipY', colorSpaceConversion: 'none', premultiplyAlpha: 'none' }
            : { imageOrientation: 'flipY' };
          return typeof createImageBitmap === 'function'
            ? createImageBitmap(blob, o).catch(() => blobImage(blob))
            : blobImage(blob);
        })
        .then((img) => {
          const t = new THREE.Texture(img);
          t.flipY = !(typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap);
          if (e.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = 8;
          t.needsUpdate = true;
          return t;
        }),
    // decoded through the game's own audio context (Sound engine), so it shares its master bus
    sound: (e) =>
      fetchBuf(BASE + e.url).then((b) => {
        const ctx = audio();
        if (!ctx) throw new Error('no audio');
        return new Promise((res, rej) => ctx.decodeAudioData(b, res, rej));
      }),
  };
  const blobImage = (blob) =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(blob);
    });

  /** promise of the asset `id` (loaded once, shared) */
  const get = (id) => {
    if (cache.has(id)) {
      stats.reused++;
      return cache.get(id);
    }
    const e = LIST[id];
    if (!e) return Promise.reject(new Error('unknown asset ' + id));
    if (off) return Promise.reject(new Error('assets off'));
    stats.requested++;
    // a dropped request (page still starting, flaky network) gets two more tries
    const attempt = (n) =>
      loaders[e.type](e).catch((err) =>
        n > 0 && !/^40\d/.test(err && err.message)
          ? new Promise((r) => setTimeout(r, 1200)).then(() => attempt(n - 1))
          : Promise.reject(err),
      );
    const p = attempt(2)
      .then((v) => {
        stats.loaded++;
        done.set(id, v);
        return v;
      })
      .catch((err) => {
        stats.failed++;
        // forgotten, so a later request tries again
        cache.delete(id);
        console.warn('asset', id, err && err.message);
        throw err;
      });
    cache.set(id, p);
    return p;
  };

  /** a ready-to-add copy of a model: shares geometry and materials with every other copy */
  const model = (id) => get(id).then((g) => g.scene.clone(true));

  // ---------- audio on the Sound engine's context ----------
  let ac = null;
  let bus = null;
  const audio = () => {
    if (ac) return ac;
    if (typeof Sound === 'undefined') return null;
    Sound.score((ctx, master) => {
      ac = ctx;
      bus = ctx.createGain();
      bus.gain.value = 0.9;
      bus.connect(master);
    });
    return ac;
  };
  /**
   * play a loaded sound (no-op until it is decoded, it is then ready for the next time).
   * opt: vol, rate, detune (random +-), pos (THREE.Vector3: positional, like the game's sounds)
   */
  const play = (id, opt = {}) => {
    const buf = done.get(id);
    if (!buf) {
      if (!cache.has(id)) get(id).catch(() => {});
      return false;
    }
    const ctx = audio();
    if (!ctx) return false;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = (opt.rate || 1) * (1 + (Math.random() - 0.5) * (opt.detune || 0));
    const g = ctx.createGain();
    g.gain.value = opt.vol != null ? opt.vol : 1;
    let node = s.connect(g);
    if (opt.pos) {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = 3;
      p.rolloffFactor = 1.2;
      if (p.positionX) {
        p.positionX.value = opt.pos.x;
        p.positionY.value = opt.pos.y;
        p.positionZ.value = opt.pos.z;
      } else p.setPosition(opt.pos.x, opt.pos.y, opt.pos.z);
      node = node.connect(p);
    }
    node.connect(bus);
    s.start();
    return true;
  };
  /** one of several variants, never the same twice in a row */
  const lastPick = {};
  const pick = (ids) => {
    const k = ids.join();
    let i = Math.floor(Math.random() * ids.length);
    if (ids.length > 1 && i === lastPick[k]) i = (i + 1) % ids.length;
    lastPick[k] = i;
    return ids[i];
  };

  // ---------- materials ----------
  // a cheap studio environment injected in the shader: the game has no env map (PMREM came out
  // black on some GPUs), and a metal PBR asset without one renders as a dark silhouette
  const ENV = `
    vec3 aEnv(vec3 d, float r) {
      vec3 c = mix(vec3(0.06, 0.055, 0.09), vec3(0.42, 0.40, 0.52), smoothstep(-0.4, 0.9, d.y));
      c += vec3(1.0, 0.82, 0.86) * pow(max(0.0, dot(d, normalize(vec3(-0.6, 0.55, 0.6)))), mix(24.0, 3.0, r)) * mix(2.6, 0.8, r);
      c += vec3(0.6, 0.85, 1.0) * pow(max(0.0, dot(d, normalize(vec3(0.7, 0.25, -0.5)))), mix(14.0, 2.5, r)) * mix(1.4, 0.5, r);
      return c;
    }`;
  const envify = (m, k = 1) => {
    if (m.userData.envified) return m;
    m.userData.envified = true;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uAEnv = { value: k };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uAEnv;' + ENV)
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
          {
            vec3 eN = normalize(normal);
            vec3 eV = normalize(vViewPosition);
            vec3 rw = inverseTransformDirection(reflect(-eV, eN), viewMatrix);
            float fres = pow(1.0 - saturate(dot(eN, eV)), 5.0);
            vec3 F0 = mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);
            vec3 spec = F0 + (1.0 - F0) * fres * (1.0 - roughnessFactor * 0.7);
            reflectedLight.indirectSpecular += aEnv(rw, roughnessFactor) * spec * uAEnv;
            reflectedLight.indirectDiffuse += aEnv(inverseTransformDirection(eN, viewMatrix), 1.0) * diffuseColor.rgb * (1.0 - metalnessFactor) * 0.3 * uAEnv;
          }`,
        );
    };
    const key = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
    m.customProgramCacheKey = () => key + '|aenv';
    m.needsUpdate = true;
    return m;
  };

  /** start loading a list of ids in the background, a few at a time (progressive) */
  const preload = (ids, onEach) => {
    const queue = ids.filter((id) => !cache.has(id));
    let running = 0;
    return new Promise((res) => {
      const next = () => {
        if (!queue.length && !running) return res();
        while (running < 3 && queue.length) {
          const id = queue.shift();
          running++;
          get(id)
            .catch(() => null)
            .then((v) => {
              running--;
              if (onEach) onEach(id, v);
              next();
            });
        }
      };
      next();
    });
  };

  return {
    LIST,
    get off() {
      return off;
    },
    get,
    model,
    /** the loaded value, or undefined while it is not there yet */
    ready: (id) => done.get(id),
    has: (id) => !!LIST[id] && !off,
    play,
    pick,
    envify,
    preload,
    stats,
  };
})();
