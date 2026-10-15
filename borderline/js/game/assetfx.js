// External assets plugged into the existing systems, without rewriting them (ASSET-FIRST, step 7).
// Each upgrade wraps a working system from the outside and keeps it as the fallback: while an
// asset is not loaded (or with ?noassets), the game looks and sounds exactly as before.
//  - sounds: recorded samples replace the synthesised ones by name (Sound.play stays the API)
//  - sword: the Poly Haven estoc replaces the hand-built blade (same mount, same swing)
//  - slash: a textured crescent (Kenney Particle Pack) instead of the flat ring
//  - grapple: a braided rope (ambientCG Rope001) with the kit colour kept as a glow
//  - veil (Valet cloak): a fresnel shimmer instead of a flat transparent copy
//  - scanned stone / asphalt / wood: moved to js/world/look.js (lazy, per world)
// The play logic (damage, hit boxes, grapple physics, cloak timing, co-op messages) is untouched.
// On by default: only what the lab comparison found clearly better (slash, veil, stone, grapple).
// The estoc and the recorded sounds are ready but opt-in until they are judged in game (by eye
// for the sword's reading at distance, by ear for the sounds): ?ext=all, or a list like
// ?ext=sword,sounds,slash. ?ext=0 = the hand-made versions only (lab A/B).
const AssetFx = (() => {
  const q = new URLSearchParams(location.search);
  const all = ['sounds', 'sword', 'slash', 'grapple', 'veil', 'stone'];
  const DEFAULT = ['slash', 'grapple', 'veil', 'stone'];
  const pickExt = () => {
    if (Assets.off) return [];
    const e = q.get('ext');
    if (e == null || e === '1') return DEFAULT;
    if (e === 'all') return all;
    if (e === '0' || e === 'none') return [];
    return e.split(',');
  };
  const ON = new Set(pickExt());
  const on = (k) => ON.has(k);

  // capture what a builder adds to a parent while it runs (its meshes are private)
  const capture = (parent, fn) => {
    const added = [];
    const add = parent.add;
    parent.add = function (...o) {
      added.push(...o);
      return add.apply(this, o);
    };
    try {
      return { out: fn(), added };
    } finally {
      parent.add = add;
    }
  };

  // ---------- sounds: sample by game sound name, synthesised fallback ----------
  const SAMPLES = {
    punch: ['snd.swing1', 'snd.swing2', 'snd.swing3'],
    swordHit: ['snd.swordHit1', 'snd.swordHit2'],
    grapple: ['snd.grappleFire'],
    grappleHit: ['snd.grappleHit'],
    grappleOut: ['snd.grappleOut'],
    cloak: ['snd.cloak'],
  };
  const VOL = { punch: 0.7, swordHit: 0.55, grapple: 0.5, grappleHit: 0.6, grappleOut: 0.35, cloak: 0.6 };
  if (on('sounds') && typeof Sound !== 'undefined') {
    const play = Sound.play;
    Sound.play = function (name, ...a) {
      const ids = SAMPLES[name];
      if (ids && Sound.ready) {
        const pos = a[0] && a[0].isVector3 ? a[0] : null;
        if (Assets.play(Assets.pick(ids), { vol: VOL[name], detune: 0.12, pos })) return;
      }
      return play.call(this, name, ...a);
    };
    // a blade that lands rings on the enemy: the hit right after our own swing (combat.js
    // flashes every enemy it touches in the same call)
    let swingAt = -1;
    const sp = Sound.play;
    Sound.play = function (name, ...a) {
      if (name === 'punch' && !a.length) swingAt = performance.now();
      return sp.call(this, name, ...a);
    };
    if (typeof Enemies !== 'undefined') {
      const flash = Enemies.flash;
      Enemies.flash = (id, ...a) => {
        if (performance.now() - swingAt < 20) {
          const e = Enemies.list.get(id);
          Assets.play(Assets.pick(SAMPLES.swordHit), { vol: VOL.swordHit, detune: 0.1, pos: e && V3(e.pos.x, e.pos.y + 1.2, e.pos.z) });
          swingAt = -1;
        }
        return flash(id, ...a);
      };
    }
    // decoded once the audio context exists (first click), in the background
    const warm = () => {
      if (!Sound.ready) return setTimeout(warm, 1000);
      Assets.preload([].concat(...Object.values(SAMPLES)));
    };
    setTimeout(warm, 500);
  }

  // ---------- Kenney sounds (Look pass, js/world/look.js `sound`) ----------
  // Recorded sounds through the game's own sample player (Sound.load / Sound.sample: variants,
  // pitch and gain spread, room send). Each rule says whether the recording replaces the synth
  // sound (true) or is layered under it (false: the synth carries a musical cue, e.g. the card
  // chime or the lever's bell). Until a bank is decoded the synth plays alone.
  const kOn = typeof Look !== 'undefined' && Look.on('sound') && typeof Sound !== 'undefined' && !!Sound.sample;
  const kCards = { open: false };
  if (kOn) {
    const KB = 'assets/sounds/kenney/';
    const set = (name, ids) => ids.map((i) => KB + name + '_' + i + '.mp3');
    const BANK = {
      kCardSlide: set('card_slide', [1, 2, 3]),
      kCardPlace: set('card_place', [1, 2, 3]),
      kCardFan: set('card_fan', [1, 2]),
      kCardShove: set('card_shove', [1, 2, 3]),
      kUi: set('ui_click', [1, 2, 3]),
      kStepConcrete: set('step_concrete', [0, 1, 2, 3, 4]),
      kStepWood: set('step_wood', [0, 1, 2, 3, 4]),
      kLand: set('land', [0, 1, 2]),
      kLatch: [KB + 'switch_latch.mp3', KB + 'switch_click.mp3'],
      kCreak: set('creak', [1, 2, 3]),
      kGlass: set('glass', [0, 1, 2]),
    };
    let loaded = false;
    // fetched once the audio context exists (after the first click), never before
    const ensure = () => {
      if (loaded || !Sound.ready) return;
      loaded = true;
      Sound.load(BANK);
    };
    const down = V3(0, -1, 0);
    const from = V3();
    const surf = () => {
      if (typeof Player === 'undefined' || typeof Phys === 'undefined' || !Phys.rayHit) return 'concrete';
      const p = Player.body.p;
      const h = Phys.rayHit(from.set(p.x, p.y + 0.3, p.z), down, 1.2);
      return h && h.surf === 'wood' ? 'wood' : 'concrete';
    };
    const S = (k, o) => Sound.sample(k, null, o);
    const RULE = {
      // card won: a card slid out and laid down, under the chime
      card: () => {
        S('kCardSlide', { gain: 0.75, spread: 0.04 });
        S('kCardPlace', { gain: 0.85, spread: 0.04, delay: 0.17 });
        return false;
      },
      ui: () => S('kUi', { gain: 0.6, spread: 0.03 }),
      // footsteps: concrete by default, wood on wooden boxes (benches, decks); quiet, varied
      step: (v = 0.5) =>
        S(surf() === 'wood' ? 'kStepWood' : 'kStepConcrete', { gain: 0.3 + 0.35 * v, spread: 0.07, cap: 3 }),
      land: (v = 0.5) => S('kLand', { gain: 0.35 + 0.6 * v, spread: 0.06, cap: 2 }),
      switch: () => {
        S('kLatch', { gain: 0.7, spread: 0.05, wet: 0.15 });
        return false;
      },
      creak: () => S('kCreak', { gain: 0.55, spread: 0.08, cap: 2 }),
      shatter: () => {
        S('kGlass', { gain: 0.8, spread: 0.06, wet: 0.2 });
        return false;
      },
    };
    const prevPlay = Sound.play;
    Sound.play = function (name, ...a) {
      ensure();
      const r = RULE[name];
      if (r && Sound.ready && r(...a)) return;
      return prevPlay.call(this, name, ...a);
    };
    // the deck (P / Tab): fanned open, pushed back together
    kCards.tick = () => {
      if (typeof Cards === 'undefined' || !Sound.ready) return;
      ensure();
      const o = !!Cards.open;
      if (o === kCards.open) return;
      kCards.open = o;
      if (o) S('kCardFan', { gain: 0.7, spread: 0.04 });
      else S('kCardShove', { gain: 0.5, spread: 0.05 });
    };
  }

  // ---------- sword: the estoc on the same mount ----------
  // grip at the origin, blade along +y, about 1.05 m long like the old one
  const SWORD_LEN = 1.05;
  let swordProto = null;
  const swordModel = () =>
    Assets.get('sword.estoc').then((g) => {
      if (swordProto) return swordProto;
      const s = g.scene;
      s.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(s);
      const size = box.getSize(V3());
      const k = SWORD_LEN / size.y;
      // the estoc's grip is its last ~18 % (pommel at the bottom); the hand sits just below the guard
      const holder = new THREE.Group();
      s.scale.setScalar(k);
      // a real blade is a few millimetres thick: widened a little so it reads in third person
      const wide = +(q.get('swordW') || 1.4);
      s.scale.x *= wide;
      s.scale.z *= wide;
      s.position.set(0, -box.min.y * k - 0.2, 0);
      s.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        const m = o.material;
        // a little of the game's steel glow so it reads at night, and the shared studio env
        m.emissive = new THREE.Color(q.get('swordE') || '#000000');
        m.envMapIntensity = 1;
        Assets.envify(m, +(q.get('swordEnv') || 2));
      });
      holder.add(s);
      swordProto = holder;
      return holder;
    });
  if ((on('sword') || on('slash')) && typeof Weapons !== 'undefined') {
    const attach = Weapons.attach;
    Weapons.attach = (avatar) => {
      const { out, added } = capture(avatar.spin, () => attach(avatar));
      // the holder group: its children are the sword (and the rifle on the simple avatars)
      const holder = added[0];
      if (holder && on('sword')) {
        const old = holder.children.find((m) =>
          m.children.some((c) => c.geometry && c.geometry.type === 'ExtrudeGeometry'),
        );
        if (old)
          swordModel()
            .then((proto) => {
              old.children.forEach((c) => (c.visible = false));
              old.add(proto.clone(true));
            })
            .catch(() => {});
      }
      return out;
    };
  }

  // ---------- slash: a textured crescent, local and remote ----------
  const slashes = [];
  let slashMat = null;
  const slashGeo = new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2);
  const slashFx = (p, yaw) => {
    const tex = Assets.ready('fx.slash');
    if (!tex) return false;
    if (!slashMat)
      slashMat = new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color('#8fd4ff').multiplyScalar(1.35),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
    let sl = slashes.find((x) => x.t <= 0);
    if (!sl) {
      sl = { m: new THREE.Mesh(slashGeo, slashMat.clone()), t: 0 };
      sl.m.frustumCulled = false;
      R.scene.add(sl.m);
      slashes.push(sl);
    }
    sl.m.visible = true;
    sl.m.position.set(p.x + Math.sin(yaw) * 0.9, p.y + 1.15, p.z + Math.cos(yaw) * 0.9);
    // the crescent's open side faces the player, tilted like a diagonal cut
    sl.m.rotation.set(0, yaw, 0);
    sl.m.rotateZ(0.35);
    sl.yaw = yaw;
    sl.t = 0.22;
    return true;
  };
  // hide the old flat rings while the textured crescent is there
  const hideRings = () => {
    for (const o of R.scene.children)
      if (o.isMesh && o.geometry && o.geometry.type === 'RingGeometry' && o.geometry.parameters.thetaLength === 1.8)
        o.visible = false;
  };
  if (on('slash') && typeof Combat !== 'undefined') {
    Assets.get('fx.slash').catch(() => {});
    // the local blow is told by its sound (combat.js plays 'punch' without a position)
    const play = Sound.play;
    Sound.play = function (name, ...a) {
      if (name === 'punch' && !a.length && typeof Player !== 'undefined' && Player.body)
        if (slashFx(Player.body.p, Player.yaw)) setTimeout(hideRings, 0);
      return play.call(this, name, ...a);
    };
    Net.on('slash', (yaw) => {
      if (typeof Remote !== 'undefined' && Remote.has && slashFx(Remote.pos, yaw)) setTimeout(hideRings, 0);
    });
  }

  // ---------- grapple: braided rope ----------
  const ropeMats = new Map();
  const ropeMat = (glow) => {
    if (ropeMats.has(glow)) return ropeMats.get(glow);
    const col = Assets.ready('tex.rope');
    const nrm = Assets.ready('tex.ropeN');
    const m = new THREE.MeshStandardMaterial({
      map: col,
      normalMap: nrm,
      color: new THREE.Color(glow).lerp(new THREE.Color('#ffffff'), 0.25),
      // the kit colour stays as a glow: the partner must see the rope from far
      emissive: new THREE.Color(glow),
      emissiveIntensity: +(q.get('ropeE') || 0.5),
      emissiveMap: col,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughness: 0.75,
      metalness: 0,
    });
    // texture around the rope, braid pitch in metres along it (per instance length)
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_INSTANCING
          vUv.y *= length(instanceMatrix[2].xyz) / 0.07;
        #endif`,
      );
    };
    ropeMats.set(glow, m);
    return m;
  };
  if (on('grapple') && typeof Rope !== 'undefined') {
    Assets.preload(['tex.rope', 'tex.ropeN']);
    const create = Rope.create;
    Rope.create = (color) => {
      const { out, added } = capture(R.scene, () => create(color));
      const [line, hook] = added;
      const glow = color || '#ff5f8a';
      Promise.all([Assets.get('tex.rope'), Assets.get('tex.ropeN')])
        .then(() => {
          if (line && line.isInstancedMesh) {
            line.material = ropeMat(glow);
            // a slightly thicker rope (0.022 -> 0.03 m) for the braid to read
            line.geometry = line.geometry.clone().scale(1.35, 1.35, 1);
          }
          if (hook && hook.isMesh) {
            hook.material = Assets.envify(
              new THREE.MeshStandardMaterial({
                color: '#d9dde8',
                metalness: 0.9,
                roughness: 0.3,
                emissive: new THREE.Color(glow),
                emissiveIntensity: 0.35,
              }),
            );
          }
        })
        .catch(() => {});
      return out;
    };
  }

  // ---------- veil: fresnel shimmer for the cloak ----------
  let veilMat = null;
  const veil = () => {
    if (veilMat) return veilMat;
    const tw = Assets.ready('fx.twirl');
    veilMat = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 },
        uTw: { value: tw || null },
        uHas: { value: tw ? 1 : 0 },
        uCol: { value: new THREE.Color('#9fe6ff') },
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mv = viewMatrix * w;
          vN = normalize(normalMatrix * normal);
          vV = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uT; uniform sampler2D uTw; uniform float uHas; uniform vec3 uCol;
        varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          float s = 0.5;
          if (uHas > 0.5) s = texture2D(uTw, vW.xy * 0.9 + vec2(0.0, uT * 0.35)).r * 0.6 + texture2D(uTw, vW.zy * 0.7 - vec2(uT * 0.2, 0.0)).r * 0.6;
          float band = smoothstep(0.0, 0.08, abs(fract(vW.y * 1.6 - uT * 0.9) - 0.5) - 0.38);
          float a = clamp(f * 0.85 + s * 0.12 + band * 0.08, 0.0, 1.0);
          gl_FragColor = vec4(uCol * (0.35 + f * 1.6 + s * 0.4), a * 0.75);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return veilMat;
  };
  const tickVeil = (t) => {
    if (veilMat) veilMat.uniforms.uT.value = t;
  };
  if (on('veil') && typeof Avatar !== 'undefined') {
    Assets.get('fx.twirl').catch(() => {});
    const build = Avatar.build;
    Avatar.build = (role) => {
      const a = build(role);
      const root = a.root;
      a.ghost = (k) => {
        const onv = k > 0;
        if (onv === !!root.userData.ghost) return;
        root.userData.ghost = onv;
        const tw = Assets.ready('fx.twirl');
        const m = veil();
        if (tw && !m.uniforms.uTw.value) {
          m.uniforms.uTw.value = tw;
          m.uniforms.uHas.value = 1;
        }
        root.traverse((o) => {
          if (!o.isMesh) return;
          if (onv) {
            o.userData.mat = o.material;
            o.material = m;
          } else if (o.userData.mat) o.material = o.userData.mat;
        });
        // a burst of light where the body vanishes / comes back
        if (typeof Fx !== 'undefined') {
          root.updateMatrixWorld(true);
          const p = root.getWorldPosition(V3());
          p.y += 1;
          Fx.burst(p, '#9fe6ff', 26, 3.2, 0.5, 0);
        }
      };
      return a;
    };
  }

  // own small frame tick (no change to the game loop): veil shimmer, slash fade
  let t = 0;
  let last = 0;
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;
    tickVeil(t);
    if (kCards.tick) kCards.tick();
    for (const s of slashes) {
      if (s.t <= 0) continue;
      s.t -= dt;
      const k = 1 - s.t / 0.22;
      s.m.material.opacity = Math.min(1, s.t / 0.12);
      s.m.scale.setScalar(0.75 + k * 0.45);
      if (s.t <= 0) s.m.visible = false;
    }
  };
  if (ON.size || kOn) requestAnimationFrame(tick);

  return { on, ON, slashFx, slashes };
})();
