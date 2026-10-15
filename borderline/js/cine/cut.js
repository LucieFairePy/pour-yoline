// In-game cinematics. Cut.define(id, clip) registers a film, Cut.play(id) plays it over the game
// (its own scene and camera, rendered through the game renderer with bloom and the film grade of
// the intro), with letterbox bars, subtitles and title cards, skippable by holding Échap / E / A.
// In the game a cinematic is a story phase, 'cut' (S.x.cut = id, S.x.after = the next phase):
// each player watches on their own screen, says when they are done (end or skip), and the host
// moves both on only once both are done; the one who finished first waits on a black screen.
// A clip is { dur, build(K) → { seek(t, dt) }, subs: [[a, b, text, who?]], titles: [[a, b, big,
// small]], score?(A) }; K is the kit below (scene, camera, HQ astronauts, the saucer, easing).
const Cut = (() => {
  const CLIPS = {};
  // épreuve id → the cinematic that follows its reward (filled in when the story is written)
  const AFTER = {};
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const pulse = (t, a, b, f = 0.3) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));

  // ---------- the stage (built on first use) ----------
  let S = null;
  const stage = () => {
    if (S) return S;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000');
    const cam = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 6000);
    scene.add(cam);
    const composer = new THREE.EffectComposer(R.renderer);
    composer.addPass(new THREE.RenderPass(scene, cam));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.55, 0.85);
    composer.addPass(bloom);
    // the film grade of the intro: chromatic fringe, glitch rows, warm highlights, vignette,
    // grain, white flash and fade to black
    const film = new THREE.ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uFade: { value: 1 },
        uFlash: { value: 0 },
        uGlitch: { value: 0 },
        uCA: { value: 0.0012 },
        uWarm: { value: 0 },
      },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime, uFade, uFlash, uGlitch, uCA, uWarm;
        varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 uv = vUv;
          float row = floor(uv.y * 48.0);
          float g = step(0.72, h(vec2(row, floor(uTime * 24.0)))) * uGlitch;
          uv.x += (h(vec2(row * 1.7, floor(uTime * 30.0))) - 0.5) * 0.08 * g;
          vec2 c = uv - 0.5;
          float ca = uCA + uGlitch * 0.012;
          vec3 col;
          col.r = texture2D(tDiffuse, uv + c * ca).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - c * ca).b;
          float l = dot(col, vec3(0.3, 0.59, 0.11));
          col = mix(col, col * vec3(1.08, 1.0, 0.9), smoothstep(0.3, 1.0, l) * (0.5 + uWarm));
          col = col / (1.0 + col * 0.16);
          float r = length(c * vec2(1.25, 1.0));
          col *= mix(0.55, 1.0, smoothstep(0.95, 0.25, r));
          col += (h(uv * 900.0 + uTime) - 0.5) * 0.035;
          col = mix(col, vec3(1.0, 0.98, 0.95), uFlash);
          col *= 1.0 - uFade;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    composer.addPass(film);
    const amb = new THREE.AmbientLight('#6a5a8a', 0.3);
    const key = new THREE.DirectionalLight('#ffe2d0', 1.1);
    const rim = new THREE.DirectionalLight('#ff6a96', 0.9);
    scene.add(amb, key, rim, key.target, rim.target);

    const el = document.createElement('div');
    el.id = 'cut';
    el.hidden = true;
    el.innerHTML = `
      <div class="bar top"></div><div class="bar bottom"></div>
      <div class="csub"><span class="cwho"></span><p></p></div>
      <div class="ctitle"><span class="big"></span><span class="small"></span></div>
      <p class="cwait"></p>
      <div class="cskip"><kbd>Échap</kbd> maintenir pour passer<i></i></div>`;
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s);
    S = {
      scene,
      cam,
      composer,
      bloom,
      FU: film.uniforms,
      lights: { amb, key, rim },
      el,
      $sub: q('.csub'),
      $who: q('.cwho'),
      $text: q('.csub p'),
      $title: q('.ctitle'),
      $big: q('.ctitle .big'),
      $small: q('.ctitle .small'),
      $wait: q('.cwait'),
      $skip: q('.cskip'),
      $bar: q('.cskip i'),
      rigs: {},
      ship: null,
    };
    return S;
  };

  // ---------- the kit handed to a clip ----------
  const mkRig = (fem) =>
    HQRig.build(
      fem
        ? { suit: HQ.sequinMat(0x006a3a, { rough: 0.55, metal: 0.12 }), feminine: true, name: 'Yoline' }
        : {
            suit: HQ.sequinMat(0x1d2d6e, { glint: 0.55 }),
            feminine: false,
            name: 'Moi',
            accent: '#2a3f9e',
            accentDark: '#1b2a6b',
          },
    );
  const tmpA = V3();
  const tmpB = V3();
  const kit = () => {
    const s = stage();
    const group = new THREE.Group();
    s.scene.add(group);
    return {
      scene: s.scene,
      cam: s.cam,
      group,
      FU: s.FU,
      lights: s.lights,
      ease,
      seg,
      pulse,
      // the two HQ astronauts of the intro (built once, shared by every clip)
      rig(who) {
        if (!s.rigs[who]) {
          s.rigs[who] = mkRig(who === 'yoline');
          s.rigs[who].g.scale.setScalar(0.92);
        }
        const r = s.rigs[who];
        group.add(r.g);
        r.g.visible = true;
        return r;
      },
      // the saucer of the intro film (built once)
      ship() {
        if (!s.ship) s.ship = CineKit2.alienShip();
        group.add(s.ship.group);
        return s.ship;
      },
      // hand in hand: the inner hands of A and B meet halfway (2-bone IK on both arms)
      holdHands(A, B, pa, pb, drop = 0.42) {
        A.g.updateMatrixWorld(true);
        B.g.updateMatrixWorld(true);
        const sa = [A.world(V3(0.25, 0.3, 0)), A.world(V3(-0.25, 0.3, 0))];
        const sb = [B.world(V3(0.25, 0.3, 0)), B.world(V3(-0.25, 0.3, 0))];
        const ia = sa[0].distanceTo(B.g.position) < sa[1].distanceTo(B.g.position) ? 0 : 1;
        const ib = sb[0].distanceTo(A.g.position) < sb[1].distanceTo(A.g.position) ? 0 : 1;
        const mid = tmpA.copy(sa[ia]).add(sb[ib]).multiplyScalar(0.5);
        mid.y -= drop;
        [
          [A, pa, ia],
          [B, pb, ib],
        ].forEach(([rg, pose, i]) => {
          const loc = rg.A.body.worldToLocal(tmpB.copy(mid));
          const a = rg.reach(i, loc);
          Object.assign(pose.arms[i], { p: a.p, a: a.a, e: a.e, g: 0.85 });
        });
        return mid;
      },
    };
  };

  // ---------- a small score kit (Web Audio, on the game's master bus) ----------
  const scoreKit = (ctx, dest) => {
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(dest);
    const at = ctx.currentTime + 0.05;
    const nodes = [];
    const env = (g, t, a, peak, hold, rel) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + a + hold);
      g.gain.linearRampToValueAtTime(0, t + a + hold + rel);
    };
    return {
      pad(notes, t0, dur, vol = 0.04) {
        notes.forEach((m, i) =>
          [-7, 7].forEach((det) => {
            const o = ctx.createOscillator();
            o.type = 'triangle';
            o.frequency.value = hz(m);
            o.detune.value = det;
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = 1500;
            const g = ctx.createGain();
            env(g, at + t0 + i * 0.06, dur * 0.35, vol, dur * 0.3, dur * 0.35);
            o.connect(f).connect(g).connect(out);
            o.start(at + t0);
            o.stop(at + t0 + dur + 0.5);
            nodes.push(o);
          }),
        );
      },
      bell(m, t0, vol = 0.04, decay = 3) {
        const o = ctx.createOscillator();
        o.frequency.value = hz(m);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at + t0);
        g.gain.linearRampToValueAtTime(vol, at + t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + t0 + decay);
        o.connect(g).connect(out);
        o.start(at + t0);
        o.stop(at + t0 + decay + 0.1);
        nodes.push(o);
      },
      stop() {
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + 0.6);
        setTimeout(
          () =>
            nodes.forEach((n) => {
              try {
                n.stop();
              } catch (e) {}
            }),
          700,
        );
      },
    };
  };

  // ---------- playback ----------
  const P = { on: false, id: null, clip: null, inst: null, K: null, t: 0, last: 0, hold: 0, done: null, score: null, waiting: false };

  const resize = () => {
    if (!S) return;
    const pr = R.renderer.getPixelRatio();
    S.composer.setPixelRatio(pr);
    S.composer.setSize(innerWidth, innerHeight);
    S.bloom.resolution.set(innerWidth * 0.5, innerHeight * 0.5);
    S.cam.aspect = innerWidth / innerHeight;
    S.cam.updateProjectionMatrix();
  };
  addEventListener('resize', resize);

  const text = (el, s) => {
    const v = s ? Story.fmt(s) : '';
    if (el.textContent !== v) el.textContent = v;
  };
  // the clip's own objects go away with it; the astronauts and the saucer are kept for the next
  const dispose = () => {
    if (!P.K) return;
    const keep = new Set(Object.values(S.rigs).map((r) => r.g));
    if (S.ship) keep.add(S.ship.group);
    P.K.group.children.slice().forEach((o) => {
      if (keep.has(o)) {
        P.K.group.remove(o);
        return;
      }
      o.traverse((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) [].concat(m.material).forEach((mt) => mt.dispose());
      });
    });
    S.scene.remove(P.K.group);
    P.K = null;
  };

  const finish = () => {
    if (!P.on || P.waiting) return;
    if (P.score) P.score.stop();
    P.score = null;
    Sound.duck(false);
    P.waiting = true;
    S.FU.uFade.value = 1;
    S.$sub.style.opacity = 0;
    S.$title.style.opacity = 0;
    S.$skip.style.visibility = 'hidden';
    const done = P.done;
    P.done = null;
    if (done) done();
  };

  const frame = (dt) => {
    const c = P.clip;
    P.t += dt;
    const t = P.t;
    // hold to skip: Échap, E, A (or the pad's Start / A)
    const skipping = Input.held('interact') || Input.held('jump') || Input.held('pause') || Input.rawPad([0, 9]);
    P.hold = skipping ? P.hold + dt : Math.max(0, P.hold - dt * 2);
    S.$bar.style.transform = `scaleX(${clamp(P.hold / 1.2, 0, 1)})`;
    if (P.hold > 1.2 || t >= c.dur) return finish();
    S.FU.uTime.value = t;
    S.FU.uFlash.value = 0;
    S.FU.uGlitch.value = 0;
    S.FU.uCA.value = 0.0012;
    S.FU.uWarm.value = 0;
    // fade in from black, fade out at the end (a clip may add its own)
    S.FU.uFade.value = Math.max(1 - seg(t, 0, 1.2), seg(t, c.dur - 1.4, c.dur));
    HQ.time.value = t;
    P.inst.seek(t, dt);
    let sub = '';
    let who = '';
    let op = 0;
    (c.subs || []).forEach(([a, b, s, w]) => {
      if (t >= a && t <= b) {
        sub = s;
        who = w || '';
        op = pulse(t, a, b, 0.5);
      }
    });
    text(S.$text, sub);
    text(S.$who, who);
    S.$sub.style.opacity = op;
    let tb = '';
    let ts = '';
    let to = 0;
    (c.titles || []).forEach(([a, b, big, small]) => {
      if (t >= a && t <= b) {
        tb = big;
        ts = small || '';
        to = pulse(t, a, b, 0.9);
      }
    });
    text(S.$big, tb);
    text(S.$small, ts);
    S.$title.style.opacity = to;
    S.$title.style.transform = `translate(-50%, -50%) scale(${1 + (1 - to) * 0.04})`;
  };

  const api = {
    ease,
    seg,
    pulse,
    define(id, clip) {
      CLIPS[id] = clip;
    },
    has: (id) => !!CLIPS[id],
    // the cinematic that follows an épreuve's reward, if the story gives it one
    after: (trialId) => (AFTER[trialId] && CLIPS[AFTER[trialId]] ? AFTER[trialId] : null),
    AFTER,
    get on() {
      return P.on;
    },
    get t() {
      return P.t;
    },
    get waiting() {
      return P.waiting;
    },
    /** Plays a clip; resolves when it ends or is skipped. The black screen stays (wait()) until
     *  stop() is called (the story moves on once both players are done). */
    play(id) {
      if (P.on) api.stop();
      const clip = CLIPS[id];
      if (!clip) return Promise.resolve();
      stage();
      resize();
      P.on = true;
      P.id = id;
      P.clip = clip;
      P.t = 0;
      P.hold = 0;
      P.waiting = false;
      P.K = kit();
      P.inst = clip.build(P.K);
      S.el.hidden = false;
      S.$wait.textContent = '';
      S.$skip.style.visibility = '';
      HUD.show(false);
      Sound.duck(true);
      P.score = clip.score ? Sound.score((ctx, dest) => clip.score(scoreKit(ctx, dest))) : null;
      return new Promise((res) => (P.done = res));
    },
    /** After the local end: a line on the black screen while the other player still watches. */
    wait(s) {
      if (S) text(S.$wait, s);
    },
    stop() {
      if (!P.on) return;
      if (P.score) P.score.stop();
      P.score = null;
      Sound.duck(false);
      if (P.done) {
        const d = P.done;
        P.done = null;
        d();
      }
      dispose();
      P.on = false;
      P.waiting = false;
      P.inst = null;
      P.clip = null;
      S.el.hidden = true;
      HUD.show(true);
    },
    /** Called by the game loop instead of the game's own render while a cinematic is on. */
    render(dt) {
      if (!P.on) return false;
      if (!P.waiting) frame(dt);
      S.composer.render();
      return true;
    },
  };
  return api;
})();

// ---------- the story phase ----------
(() => {
  const local = { sent: false };
  Story.register('cut', {
    init: () => ({ cut: null, after: 'city', seen: [] }),
    partner: () => false,
    hideRemote: () => true,
    voice: () => 1,
    enter(c) {
      HUD.objective('');
      HUD.boss(null);
      Player.mode = 'frozen';
      Player.targets = null;
      local.sent = false;
      const id = c.S.x.cut;
      Cut.play(id).then(() => {
        if (!Story.S || Story.S.phase !== 'cut' || local.sent) return;
        local.sent = true;
        Cut.wait('{mate} regarde encore la cinématique…');
        c.act({ a: 'cutDone' });
      });
    },
    exit() {
      Cut.stop();
      Player.mode = 'walk';
    },
    action(c, who, d) {
      if (d.a === 'cutDone' && !(c.S.x.seen || []).includes(who)) c.set((s) => (s.x.seen = [...(s.x.seen || []), who]));
    },
    host(c) {
      const x = c.S.x;
      const n = (x.seen || []).length;
      // both done; or alone (the other one left); or something went wrong: never stuck here
      const alone = n >= 1 && !Remote.fresh && c.phaseT > 3;
      const late = c.phaseT > 240;
      if (n >= 2 || alone || late || !Cut.has(x.cut)) c.goto(Story.has(x.after) ? x.after : 'city');
    },
    update() {
      return null;
    },
  });
})();

// ---------- a neutral test clip (only for testing the player; not part of the story) ----------
// The two astronauts hand in hand on a disc of light under the stars, the saucer passing above.
// Story.goto('cut', (s) => ((s.x.cut = 'essai'), (s.x.after = 'city')))
Cut.define('essai', {
  dur: 14,
  subs: [
    [1.6, 5.6, 'Essai du lecteur de cinématiques.'],
    [6.4, 10.6, 'Maintiens Échap, E ou A pour passer.', 'Borderline'],
  ],
  titles: [[10.8, 13.6, 'BORDERLINE', 'Cinématique · essai']],
  score(A) {
    A.pad([53, 60, 64, 69], 0, 7, 0.035);
    A.pad([50, 57, 62, 65], 6.5, 7.5, 0.035);
    [72, 76, 79, 84, 79, 81].forEach((m, i) => A.bell(m, 0.8 + i * 1.6, 0.03));
  },
  build(K) {
    const { scene, cam, group, ease, seg, FU, lights } = K;
    scene.background = new THREE.Color('#05030a');
    // stars
    const N = 2400;
    const pos = new Float32Array(N * 3);
    const r = rng(3);
    for (let i = 0; i < N; i++) {
      const v = V3(r() - 0.5, r() * 0.9 - 0.1, r() - 0.5).normalize().multiplyScalar(400);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff2f6', size: 1.6, sizeAttenuation: false })));
    // the disc of light they stand on
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3.2, 0.3, 64),
      new THREE.MeshStandardMaterial({ color: '#0c0810', roughness: 0.95, metalness: 0 }),
    );
    disc.position.y = -0.15;
    group.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.04, 8, 96).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a96').multiplyScalar(2.2), toneMapped: false }),
    );
    group.add(ring);
    const D = K.rig('yoline');
    const V = K.rig('william');
    const ship = K.ship();
    ship.group.scale.setScalar(0.5);
    return {
      seek(t) {
        lights.key.position.set(-4, 6, 6);
        lights.rim.position.set(3, 3, -6);
        D.g.position.set(-0.42, 0, 0);
        V.g.position.set(0.42, 0, 0);
        D.g.rotation.set(0, Math.PI, 0);
        V.g.rotation.set(0, Math.PI, 0);
        const P = HQRig.P;
        const pd = P.stand();
        const pv = P.stand();
        // breathing, and a look up at the saucer when it passes
        const up = seg(t, 5, 7) * (1 - seg(t, 10.5, 12));
        pd.head.p = -0.55 * up + Math.sin(t * 1.3) * 0.03;
        pv.head.p = -0.5 * up + Math.sin(t * 1.1 + 1) * 0.03;
        pd.head.y = 0.25 * (1 - up);
        pv.head.y = -0.25 * (1 - up);
        D.apply(pd);
        V.apply(pv);
        K.holdHands(D, V, pd, pv);
        D.apply(pd);
        V.apply(pv);
        D.groundSnap(0);
        V.groundSnap(0);
        // the saucer crosses the sky
        const k = seg(t, 3.5, 12.5);
        ship.group.position.set(lerp(-34, 34, k), 8 + Math.sin(k * 3) * 0.6, lerp(16, 10, k));
        ship.group.rotation.y = t * 0.3;
        ship.update(t, { hatch: 0 });
        ship.BU.uOn.value = 0;
        // the camera: a slow orbit that rises behind them
        const a = lerp(-0.6, 0.5, ease(seg(t, 0, 14)));
        const rad = lerp(5.2, 6.4, seg(t, 0, 14));
        cam.position.set(Math.sin(a) * rad, lerp(1.2, 1.7, ease(seg(t, 0, 14))), -Math.cos(a) * rad);
        cam.lookAt(lerp(0, ship.group.position.x * 0.12, up), lerp(1.15, 2.4, up) - seg(t, 10.5, 12.5) * 0.9, 0);
        ring.material.color.set('#ff6a96').multiplyScalar(1.6 + Math.sin(t * 2) * 0.4);
        FU.uWarm.value = 0.2;
      },
    };
  },
});
