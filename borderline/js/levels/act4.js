// Act IV, the break. The Joker deals himself into the golden hour: a giant glitching card rises
// over the city, deals a storm of cards around the tower, the colour drains out, the visa drops,
// and the deck splits in two around the players before the white flash sends each into a grey
// world. A staged scene over frozen players: the host moves S.x.step on a timeline (AT), and each
// screen plays a step's camera and cues from the moment it gets it, so both stay together.
(() => {
  const T = CONFIG;
  const A = T.act4;
  // when each step starts (s since the phase began), and when the act hands over to act5
  const AT = [0, 6, 16, 28, 36, 43];
  const END = 54;
  const local = { step: -1, glitch: 0, ts: 0, cue: 0, shake: 0, rig: null, bars: null, apart: false };
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp3 = (a, b, k) => a.clone().lerp(b, k);

  // ---------- the Joker: a giant card with a glitch shader, its halo, and the deck ----------
  const CARD_W = 60;
  const CARD_H = 84;
  const bench = () => City.roofBench.pos;
  // over the skyline, in front of the bench (the couple looks toward -z)
  const SKY = () => V3(City.TOWER.x, City.TOWER.y + 75, City.TOWER.z - 150);
  // after the break, each screen sees it hang high over its own street (away from the tower,
  // which would hide it)
  const OVER = () => {
    const p = Player.body.p;
    const d = V3(p.x - City.TOWER.x, 0, p.z - City.TOWER.z).normalize();
    return V3(p.x + d.x * 75, 62, p.z + d.z * 75);
  };

  const build = () => {
    const g = new THREE.Group();
    g.visible = false;
    R.scene.add(g);
    const U = {
      map: { value: Tex.card('J', '') },
      uTime: { value: 0 },
      uGlitch: { value: 1 },
      uAlpha: { value: 0 },
      uGray: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D map;
        uniform float uTime, uGlitch, uAlpha, uGray;
        varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 uv = vUv;
          float row = floor(uv.y * 36.0);
          float g = step(1.0 - uGlitch * 0.45, h(vec2(row, floor(uTime * 18.0))));
          uv.x += (h(vec2(row * 1.3, floor(uTime * 26.0))) - 0.5) * 0.18 * g;
          if (uv.x < 0.0 || uv.x > 1.0) discard;
          float ca = 0.004 + uGlitch * 0.025;
          vec4 c = texture2D(map, uv);
          c.r = texture2D(map, uv + vec2(ca, 0.0)).r;
          c.b = texture2D(map, uv - vec2(ca, 0.0)).b;
          vec3 col = c.rgb * (0.43 + 0.07 * sin(vUv.y * 640.0 + uTime * 9.0));
          float l = dot(col, vec3(0.3, 0.59, 0.11));
          col = mix(col, vec3(l * 0.8), uGray);
          // the red ink of the card burns
          float red = smoothstep(0.15, 0.5, c.r - c.g);
          col += vec3(1.0, 0.08, 0.18) * red * (0.7 + 0.3 * sin(uTime * 3.0));
          float flick = 1.0 - g * 0.35 - step(0.985, h(vec2(floor(uTime * 12.0), 7.0))) * uGlitch;
          gl_FragColor = vec4(col, c.a * uAlpha * flick);
        }
      `,
    });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
    card.renderOrder = 5;
    g.add(card);

    // the deck: card backs (and a few Jokers) on small planes, shared materials
    const geo = new THREE.PlaneGeometry(2.4, 3.36);
    const back = new THREE.MeshBasicMaterial({
      map: Cards.backTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
      fog: false,
    });
    const face = new THREE.MeshBasicMaterial({
      map: Tex.card('J', ''),
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
      fog: false,
    });
    const deck = [];
    const r = rng(41);
    for (let i = 0; i < 72; i++) {
      const m = new THREE.Mesh(geo, i % 6 === 0 ? face : back);
      m.visible = false;
      R.scene.add(m);
      deck.push({
        m,
        // where it comes from on the big card, its orbit around the tower, its tumble
        from: V3((r() - 0.5) * CARD_W * 0.8, (r() - 0.5) * CARD_H * 0.8, 0),
        a: r() * Math.PI * 2,
        rad: 10 + r() * 26,
        y: -10 + r() * 70,
        sp: (0.25 + r() * 0.35) * (r() < 0.15 ? -1 : 1),
        delay: r() * 3,
        spin: V3(r() * 3, r() * 3, r() * 3),
        // which player the deck splits toward, and its place in that spiral
        side: i % 2,
        k: r(),
      });
    }
    // a halo of cards turning around the big one
    const halo = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(geo, i % 4 === 0 ? face : back);
      m.scale.setScalar(3.2);
      g.add(m);
      halo.push(m);
    }
    return { g, card, U, deck, halo, back, face };
  };

  // the cinema bars, under the subtitles
  const bars = (on) => {
    if (!local.bars) {
      const el = document.createElement('div');
      el.id = 'act4Bars';
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0';
      const bar = (top) => {
        const b = document.createElement('i');
        b.style.cssText = `position:absolute;left:0;right:0;${top ? 'top' : 'bottom'}:0;height:11vh;background:#000;transition:transform 1.4s cubic-bezier(.6,0,.2,1)`;
        b.style.transform = `translateY(${top ? '-' : ''}100%)`;
        el.appendChild(b);
        return b;
      };
      local.bars = { el, b: [bar(true), bar(false)] };
      const hud = $('hud');
      hud.insertBefore(el, hud.firstChild);
    }
    if (!on) return barsOff();
    requestAnimationFrame(() => local.bars.b.forEach((b) => (b.style.transform = 'none')));
  };
  const barsOff = () => {
    if (!local.bars) return;
    local.bars.b[0].style.transform = 'translateY(-100%)';
    local.bars.b[1].style.transform = 'translateY(100%)';
  };

  // ---------- the camera: a shot per step, written over the game camera each frame ----------
  const cam = R.camera;
  const shoot = (pos, look, fov) => {
    cam.position.copy(pos);
    if (local.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * local.shake;
      cam.position.y += (Math.random() - 0.5) * local.shake;
    }
    cam.lookAt(look);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  };
  const SHOTS = [
    // the golden hour, from just behind the couple on the roof
    (t) => {
      const B = bench();
      const k = ease(seg(t, 0, 6));
      shoot(lerp3(V3(B.x + 0.8, B.y + 2.1, B.z + 7), V3(B.x + 0.4, B.y + 1.8, B.z + 4.6), k), V3(B.x, B.y + 1.2, B.z - 40), 52);
    },
    // the card rises over the skyline; the camera pulls back and tilts up to it
    (t) => {
      const B = bench();
      const k = ease(seg(t, 0.5, 6));
      const pos = lerp3(V3(B.x + 1.5, B.y + 2.2, B.z + 8), V3(B.x + 4, B.y + 3.4, B.z + 15), ease(seg(t, 0, 10)));
      shoot(pos, lerp3(V3(B.x, B.y + 1.4, B.z - 30), local.rig.g.position, k * 0.85), 56);
    },
    // the deal: a slow orbit around the tower, through the storm of cards
    (t) => {
      const B = bench();
      const a = -0.55 + t * 0.09;
      const R0 = 58 - t * 1.2;
      shoot(V3(B.x + Math.sin(a) * R0, B.y + 30 - t * 0.8, B.z + Math.cos(a) * R0), V3(B.x, B.y + 22, B.z - 40), 58);
    },
    // the big screen: the visa drops
    (t) => {
      const s = City.screenPos;
      const k = ease(seg(t, 0, 8));
      shoot(V3(s.x + 7 - k * 3, s.y - 3 + k, s.z + 30 - k * 8), V3(s.x, s.y, s.z), 48);
    },
    // back on the roof, close: the deck splits in two around them
    (t) => {
      const B = bench();
      const k = ease(seg(t, 0, 7));
      shoot(V3(B.x + 2.5 - k * 1.5, B.y + 2.8 + k * 1.2, B.z + 6.5 - k * 1.5), V3(B.x, B.y + 1.6 + k * 0.8, B.z), 50 - k * 6);
    },
    // alone in a grey street, looking up at the card over the rooftops
    (t) => {
      const p = Player.body.p;
      const o = local.rig.g.position;
      const d = V3(o.x - p.x, 0, o.z - p.z).normalize();
      const k = ease(seg(t, 1, 10));
      const pos = V3(p.x - d.x * (5 + k * 2), p.y + 2.2 + k * 1.5, p.z - d.z * (5 + k * 2));
      shoot(pos, lerp3(V3(p.x, p.y + 1.4, p.z), o, 0.2 + k * 0.3), 60);
    },
  ];

  // where the two seats are (the deck splits toward each player)
  const seats = () => {
    const me = Player.body.p.clone();
    const mate = V3(Remote.pos.x, Remote.pos.y, Remote.pos.z);
    return Story.role === 'dame' ? [me, mate] : [mate, me];
  };

  // ---------- the steps: an entry (always run, also when catching up) and timed cues ----------
  const say = (l, ms) => HUD.say(l, T.joker, ms);
  const STEPS = [
    {
      enter() {
        Sound.play('glitch');
        City.mood({ gold: 1 });
        local.shake = 0.08;
        bars(true);
      },
      cues: [
        [1.2, () => say(A.lines[0], 1800)],
        [2.0, () => City.mood({ gold: 0.8, red: 0.25 })],
        [2.2, () => Sound.play('glitch')],
        [4.2, () => (Sound.play('glitch'), (local.shake = 0.15))],
      ],
    },
    {
      enter() {
        Sound.mood('dark');
        City.mood({ gold: 0.45, red: 0.6 });
        BigScreen.show('Joker', T.joker, '#ff2a3a');
        HUD.visa(T.joker, true);
        local.rig.g.visible = true;
        Sound.play('rumble', 2);
        Sound.play('gaze');
        local.shake = 0.25;
      },
      cues: [
        [3.0, () => Sound.play('screen')],
        [5.5, () => say(A.lines[1], 2000)],
        [6.0, () => Sound.play('glitch')],
        [8.5, () => Sound.play('rumble', 1.5)],
      ],
    },
    {
      enter() {
        City.mood({ gold: 0.2, red: 0.4, gray: 0.35 });
        local.rig.deck.forEach((d) => (d.m.visible = true));
        Sound.play('flip');
        Sound.play('shatter');
      },
      cues: [
        [0.6, () => Sound.play('flip')],
        [1.2, () => say(A.lines[2], 2000)],
        [1.6, () => Sound.play('flip')],
        [3.0, () => Sound.play('rumble', 1.5)],
        [5.0, () => City.mood({ red: 0.25, gray: 0.6 })],
        [6.0, () => say(A.doubt, 2000)],
        [6.5, () => Sound.play('glitch')],
        [9.0, () => Sound.play('flip')],
      ],
    },
    {
      enter() {
        BigScreen.show('Visa · 3 jours', T.joker, '#ff2a3a');
        Sound.play('screen');
      },
      cues: [
        [2.4, () => Sound.play('glitch')],
        [
          2.6,
          () => {
            BigScreen.show(A.visa, T.joker, '#ff2a3a');
            HUD.visa(A.visa, true);
            Sound.play('trap');
            local.shake = 0.12;
          },
        ],
        [3.2, () => say(A.after, 2200)],
      ],
    },
    {
      enter() {
        City.mood({ red: 0.2, gray: 0.8 });
        local.split = seats();
        Sound.play('rumble', 2);
        local.shake = 0.1;
      },
      cues: [
        [1.0, () => say(A.rule, 2400)],
        [3.6, () => Sound.play('gaze')],
        [5.6, () => Sound.play('glitch')],
      ],
    },
    {
      async enter() {
        Sound.play('shatter');
        Sound.play('fall');
        local.shake = 0.5;
        $('fade').style.background = '#fff';
        await fadeTo(true);
        barsOff();
        const sp = Story.role === 'dame' ? V3(45, 0, -15) : V3(75, 0, -45);
        Player.teleport(sp, 0);
        local.apart = true;
        Cam.snap(sp, Math.atan2(City.TOWER.x - sp.x, City.TOWER.z - sp.z));
        Cam.pitch = -0.35;
        City.mood({ gray: 1 });
        Object.keys(City.places).forEach((id) => City.pillar(id, false));
        City.rocketsOn(false);
        const R1 = local.rig;
        R1.deck.forEach((d) => (d.m.visible = false));
        R1.g.position.copy(OVER());
        R1.U.uGray.value = 0.6;
        local.shake = 0;
        await sleep(400);
        fadeTo(false);
        await sleep(800);
        $('fade').style.background = '';
      },
      cues: [
        [1.8, () => HUD.visa(A.visa)],
        [2.6, () => say(A.end, 2400)],
        [8.0, () => Sound.play('glitch')],
      ],
    },
  ];

  // ---------- the Joker rig, frame by frame ----------
  const tick = (dt, t) => {
    const R1 = local.rig;
    if (!R1 || !R1.g.visible) return;
    const s = local.step;
    const ts = local.ts;
    R1.U.uTime.value = t;
    const B = bench();
    if (s <= 4) {
      // it rises from behind the skyline, glitching into being, and stays
      const rise = s === 1 ? ease(seg(ts, 0, 6)) : 1;
      const p = SKY();
      p.y -= (1 - rise) * 110;
      p.y += Math.sin(t * 0.7) * 1.5;
      R1.g.position.copy(p);
      R1.g.lookAt(B.x, p.y, B.z);
      R1.g.rotateZ(Math.sin(t * 0.5) * 0.04);
      R1.U.uAlpha.value = s === 1 ? seg(ts, 0, 2.5) : 1;
      const base = s === 1 ? 1 - seg(ts, 1, 7) * 0.8 : 0.2;
      R1.U.uGlitch.value = clamp(base + (Math.random() < 0.04 ? 0.8 : 0), 0, 1);
      R1.U.uGray.value = s >= 4 ? 0.3 : 0;
    } else {
      // over the grey city: it fades out on its last word
      const p = OVER();
      p.y += Math.sin(t * 0.7) * 1.5;
      R1.g.position.copy(p);
      const c = Player.body.p;
      R1.g.lookAt(c.x, p.y, c.z);
      R1.U.uAlpha.value = 0.9 * (1 - seg(ts, 8, 10));
      R1.U.uGlitch.value = clamp(0.25 + seg(ts, 7.5, 10) + (Math.random() < 0.05 ? 0.6 : 0), 0, 1);
    }
    R1.halo.forEach((m, i) => {
      const a = t * 0.35 + (i / R1.halo.length) * Math.PI * 2;
      m.position.set(Math.cos(a) * 46, Math.sin(a) * 58, -4);
      m.rotation.set(t * 0.8 + i, t * 0.5 + i * 0.7, 0);
    });
    // the deck: dealt from the big card into a storm around the tower, then split toward each
    // player and drawn tight around them
    if (s >= 2 && s <= 4) {
      const card = R1.g.position;
      const T0 = City.TOWER;
      R1.deck.forEach((d) => {
        const k = s === 2 ? ease(seg(ts, d.delay, d.delay + 3)) : 1;
        const a = d.a + t * d.sp;
        let pos = V3(T0.x + Math.sin(a) * d.rad, T0.y + d.y + Math.sin(t + d.a) * 2, T0.z + Math.cos(a) * d.rad);
        if (s === 4 && local.split) {
          const c = local.split[d.side];
          const j = ease(seg(ts, 0.5 + d.k * 1.5, 4 + d.k * 2));
          const aa = t * (2.2 + d.k) + d.a;
          const rr = 1.6 + d.k * 1.2;
          const near = V3(c.x + Math.sin(aa) * rr, c.y + 0.2 + d.k * 3.2 + Math.sin(t * 2 + d.a) * 0.3, c.z + Math.cos(aa) * rr);
          pos = pos.lerp(near, j);
          d.m.scale.setScalar(1 - j * 0.82);
        } else d.m.scale.setScalar(1);
        const from = d.from.clone().applyQuaternion(R1.g.quaternion).add(card);
        d.m.position.copy(from.lerp(pos, k));
        d.m.rotation.set(t * d.spin.x, t * d.spin.y, t * d.spin.z);
      });
    }
  };

  const runStep = (i, fast) => {
    local.step = i;
    local.ts = 0;
    local.cue = 0;
    const st = STEPS[i];
    st.enter();
    // catching up (a resume, a late screen): only the last step plays its cues
    if (fast) local.cue = st.cues.length;
  };

  Story.register('act4', {
    init: () => ({ step: 0 }),
    partner: () => false,
    // the other one disappears only under the white flash, when both are pulled away at once
    hideRemote: () => local.apart,
    voice: (c) => (c.S.x.step >= 5 ? 0 : 1),
    enter(c) {
      if (!local.rig) local.rig = build();
      local.step = -1;
      local.split = null;
      local.apart = false;
      Player.mode = 'frozen';
      // (in case the act before left a high floor behind: the grey streets are at 0)
      Player.killY = -40;
      Cam.focus = null;
      HUD.objective('');
      this.apply(c);
    },
    exit() {
      Player.mode = 'walk';
      Cam.focus = null;
      barsOff();
      if (local.rig) {
        local.rig.g.visible = false;
        local.rig.deck.forEach((d) => (d.m.visible = false));
      }
    },
    apply(c) {
      while (local.step < c.S.x.step) runStep(local.step + 1, local.step + 1 < c.S.x.step);
    },
    host(c) {
      const t = c.phaseT;
      let want = 0;
      AT.forEach((a, i) => t >= a && (want = i));
      if (want !== c.S.x.step) c.set((s) => (s.x.step = want));
      if (t > END) c.goto('act5');
    },
    update(c, dt, t) {
      local.ts += dt;
      const st = STEPS[local.step];
      while (st && local.cue < st.cues.length && local.ts >= st.cues[local.cue][0]) st.cues[local.cue++][1]();
      local.shake = Math.max(0, local.shake - dt * 0.12);
      tick(dt, t);
      if (local.step >= 0 && (local.step <= 4 || local.apart)) SHOTS[local.step](local.ts);
      // the city hiccups while the Joker deals himself in
      local.glitch -= dt;
      if (local.glitch <= 0 && local.step >= 0 && local.step < 5) {
        local.glitch = 1.2 + Math.random() * 2.2;
        if (local.step >= 1) Sound.play('glitch');
        local.shake = Math.max(local.shake, 0.12);
      }
      return null;
    },
  });
})();
