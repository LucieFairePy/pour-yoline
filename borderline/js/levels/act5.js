(() => {
  const T = CONFIG;
  const A = T.act5;
  const local = { phase: null, line: -1, voice: 0, caughtT: 0, last: { dame: -99, valet: -99 } };

  const NEIGH = (i) => {
    const x = i % 3;
    const z = (i / 3) | 0;
    return [
      i,
      x > 0 ? i - 1 : -1,
      x < 2 ? i + 1 : -1,
      z > 0 ? i - 3 : -1,
      z < 2 ? i + 3 : -1,
    ].filter((k) => k >= 0);
  };
  const press = (lights, i) => NEIGH(i).forEach((k) => (lights[k] = !lights[k]));

  const lineIndex = (x) => (x.s2 ? 3 : x.p2 ? 3 : x.s1 ? 2 : x.p1 ? 1 : 0);
  const voiceLevel = (x) =>
    x.stage !== 'worlds' ? 1 : x.p2 && x.s2 ? 0.7 : x.p1 && x.s1 ? 0.35 : 0;

  const worldsEnter = (c) => {
    const x = c.S.x;
    if (c.role === 'dame') {
      c.spawn(Worlds.spawnDame(), 0);
      Player.checkpoint = () => Worlds.spawnDame();
      Player.targets = null;
    } else {
      c.spawn(Worlds.spawnValet(0), 0);
      Player.checkpoint = () => Worlds.spawnValet(Worlds.cp);
    }
    Player.killY = 50;
    City.mood({ gray: 0.65 });
    c.fog(0.012);
    Sound.mood('tense');
    Worlds.dscreen.show(A.title, 'Ce que l’un fait ouvre le chemin de l’autre', '#ffcf8a');
    if (c.role === 'valet') Worlds.showSeq(x.seq);
  };

  const convergeEnter = async (c) => {
    await fadeTo(true);
    c.spawn(Worlds.spawnConverge(c.role), c.role === 'dame' ? 0 : Math.PI);
    Player.checkpoint = () => Worlds.spawnConverge(c.role);
    Player.killY = Worlds.OC.y - 30;
    Player.targets = () => (c.role === 'dame' ? [Worlds.ring] : []);
    City.mood({ gray: 0.3 });
    c.fog(0.006);
    Sound.mood('gold');
    await sleep(300);
    fadeTo(false);
    HUD.objective(A.converge);
    HUD.say(A.converge, T.master, 2600);
  };

  const caughtEnter = (c) => {
    Player.mode = 'frozen';
    Sound.play('card');
    Sound.play('reveal');
    Fx.hearts(Worlds.C.center);
    Fx.burst(Worlds.C.center, '#ffffff', 300, 14, 1.6, -2);
    City.mood({});
    HUD.objective('');
    HUD.say(A.caught, T.master, 3000);
    HUD.visa('Visa · 3 jours');
  };

  Story.register('act5', {
    init: () => {
      const lights = Array(9).fill(true);
      let n = 0;
      while (lights.every(Boolean) || n < 4) {
        press(lights, (Math.random() * 9) | 0);
        n++;
      }
      const seq = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      return {
        stage: 'worlds',
        lights,
        p1: false,
        s1: false,
        seq,
        input: [],
        p2: false,
        s2: false,
      };
    },
    partner: (c) => c.S.x.stage !== 'worlds',
    hideRemote: (c) => c.S.x.stage === 'worlds',
    farCall: true,
    voice: (c, d) => voiceLevel(c.S.x),
    net: {
      pedfail: (c) => {
        Sound.play('trap');
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Worlds.build(c.role, c.S.seed);
      Clues.add('c5', V3(Worlds.OD.x + 6.6, Worlds.OD.y + 1.3, Worlds.OD.z + 24));
      Clues.add('c6', V3(Worlds.OV.x + 9, Worlds.OV.y + 2.1, Worlds.OV.z + 85));
      local.phase = null;
      local.line = -1;
      local.voice = 0;
      HUD.visa('♦ ♠ · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3000);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.mode = 'walk';
      Player.hangPos = null;
      Player.handPose = false;
      Remote.handPose = false;
    },
    apply(c) {
      if (!Worlds.built) return;
      const x = c.S.x;
      if (x.stage !== local.phase) {
        const prev = local.phase;
        local.phase = x.stage;
        if (x.stage === 'worlds') worldsEnter(c);
        if (x.stage === 'converge') convergeEnter(c);
        if (x.stage === 'caught') {
          if (!prev) convergeEnter(c);
          caughtEnter(c);
        }
      }
      if (x.stage === 'worlds') {
        const li = lineIndex(x);
        if (li !== local.line) {
          if (local.line >= 0) Sound.play('reveal');
          local.line = li;
          HUD.objective(A[c.role][li]);
        }
      }
      const v = voiceLevel(x);
      if (v > local.voice) {
        if (local.voice > 0 || v < 1) HUD.say(A.voice, T.master, 2400);
        local.voice = v;
      }
    },
    host(c, dt) {
      if (!Worlds.built) return;
      const x = c.S.x;
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      if (x.stage === 'worlds' && x.s2 && Worlds.dameEnd(pd) && Worlds.valetEnd(pv))
        c.set((s) => (s.x.stage = 'converge'));
      if (x.stage === 'converge') {
        const now = c.phaseT;
        if (Worlds.inZone(pd)) local.last.dame = now;
        if (Worlds.inZone(pv)) local.last.valet = now;
        if (Math.abs(local.last.dame - local.last.valet) < 2 && now - local.last.dame < 0.2) {
          c.set((s) => (s.x.stage = 'caught'));
          local.caughtT = 0;
        }
      }
      if (x.stage === 'caught') {
        local.caughtT += dt;
        if (local.caughtT > 7) c.goto('final');
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'tile' && who === 'dame' && !x.p1) {
        c.set((s) => {
          press(s.x.lights, d.i);
          if (s.x.lights.every(Boolean)) s.x.p1 = true;
        });
      }
      if (d.a === 'ped' && who === 'dame' && x.s1 && !x.p2) {
        c.set((s) => {
          s.x.input.push(d.k);
          const ok = s.x.input.every((k, i) => k === s.x.seq[i]);
          if (!ok) {
            s.x.input = [];
            c.send('pedfail');
            Sound.play('trap');
          } else if (s.x.input.length === 4) s.x.p2 = true;
        });
      }
      if (d.a === 'switch' && who === 'valet') {
        if (d.i === 0 && x.p1 && !x.s1) c.set((s) => (s.x.s1 = true));
        if (d.i === 1 && x.p2 && !x.s2) c.set((s) => (s.x.s2 = true));
      }
    },
    update(c, dt, t) {
      if (!Worlds.built) return null;
      const x = c.S.x;
      const p = Player.body.p;
      if (x.stage === 'caught') {
        const tgt = Worlds.C.center.clone().add(V3(c.role === 'dame' ? -0.5 : 0.5, -1, 0));
        Player.mode = 'hang';
        Player.hangPos = p.clone().lerp(tgt, 1 - Math.exp(-2 * dt));
        Player.handPose = true;
        Remote.handPose = true;
      }
      const res = Worlds.update(dt, t, x, c.role === 'valet' ? p : null);
      if (res === 'caught') {
        Sound.play('trap');
        HUD.say(A.wall, T.joker, 1600);
        Player.teleport(Player.checkpoint(), 0);
      }
      if (x.stage !== 'worlds') return null;
      if (c.role === 'dame') {
        const ti = Worlds.tileAt(p);
        if (!x.p1 && ti >= 0) {
          if (Input.pressed('interact')) {
            Sound.play('tile');
            c.act({ a: 'tile', i: ti });
          }
          return ['E', 'Activer la dalle'];
        }
        const pi = Worlds.pedAt(p);
        if (x.s1 && !x.p2 && pi >= 0) {
          if (Input.pressed('interact')) {
            Sound.play('tile');
            c.act({ a: 'ped', k: pi });
          }
          return ['E', 'Activer ' + Worlds.SYMS[pi]];
        }
      } else {
        const si = Worlds.switchAt(p);
        if (si >= 0 && ((si === 0 && x.p1 && !x.s1) || (si === 1 && x.p2 && !x.s2))) {
          if (Input.pressed('interact')) {
            Sound.play('switch');
            c.act({ a: 'switch', i: si });
          }
          return ['E', 'Actionner l’interrupteur'];
        }
      }
      return null;
    },
  });
})();
