(() => {
  const T = CONFIG;
  const A = T.soleil;
  const local = {
    stage: 0,
    n: -1,
    start: 0,
    warned: false,
    line: 0,
    cd: 0,
    touchT: 0,
    zoneSeen: -1,
  };
  const tm = { d: 0, win: 0 };
  const now = () => performance.now() / 1000;

  // doll timings per zone: [sing min, sing max, watch min, watch max, fake chance]
  const ZONES = [
    [3.2, 4.8, 2.4, 3.2, 0],
    [2.2, 4.0, 2.2, 3.0, 0.4],
    [2.0, 3.2, 2.8, 3.6, 0.25],
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);

  const zoneText = (c, z) => {
    const r = c.role;
    if (z === 0) return A.zone1;
    if (z === 1) return A.zone2[r];
    return A.zone3[r];
  };

  const shielded = (me, mate) => {
    const E = Soleil.eye();
    const dx = me.x - E.x;
    const dz = me.z - E.z;
    const L2 = dx * dx + dz * dz;
    const vx = mate.x - E.x;
    const vz = mate.z - E.z;
    const k = (vx * dx + vz * dz) / L2;
    if (k < 0.05 || k > 0.985) return false;
    const px = vx - k * dx;
    const pz = vz - k * dz;
    const ahead = Math.sqrt(L2) * (1 - k);
    return Math.hypot(px, pz) < 1.05 && ahead > 0.45 && ahead < 6 && Math.abs(me.y - mate.y) < 1.5;
  };

  const nextSing = (x, zone, short) => {
    const Z = ZONES[zone];
    return {
      ph: 'sing',
      dur: short ? rnd(1.2, 2) : rnd(Z[0], Z[1]),
      real: Math.random() >= Z[4],
      n: (x.d.n || 0) + 1,
    };
  };

  const enterPhase = (c, d) => {
    local.n = d.n;
    local.start = now();
    local.warned = false;
    const pos = Soleil.dollPos();
    if (d.ph === 'sing') {
      Sound.play('soleil', d.dur, pos);
      Soleil.screen.show(A.sing, A.title, '#ffd24a');
    }
    if (d.ph === 'turn') {
      Sound.play('dollTurn', pos);
      Soleil.screen.show(A.turn, A.doll, '#ff2a5a');
    }
    if (d.ph === 'fake') {
      Sound.play('dollTurn', pos);
      Soleil.screen.show(A.turn, A.doll, '#ff2a5a');
    }
    if (d.ph === 'sleep') Soleil.screen.show(A.card, A.win, '#ffcf8a');
  };

  const caught = (c) => {
    local.cd = 1.4;
    const b = Player.body;
    Sound.play('caught');
    Fx.burst(b.p.clone().add(V3(0, 1, 0)), '#ff2a5a', 60, 5, 0.6, 0);
    const sp = Soleil.spawn(local.line, c.role);
    sp.x = Soleil.O.x + clamp(b.p.x - Soleil.O.x, -14, 14);
    c.spawn(sp, 0);
    Cam.shake = 0.2;
    if (!HUD.talking) HUD.say(A.caught, A.doll, 1600);
    c.send('scaught');
  };

  Story.register('soleil', {
    init: () => ({ stage: 1, d: { ph: 'sing', dur: 4, real: true, n: 0 }, touch: {} }),
    voice: () => 1,
    net: {
      scaught: (c) => {
        if (!HUD.talking) HUD.say('{mate} a bougé. Retour à sa ligne.', A.doll, 1600);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Soleil.build();
      local.stage = 0;
      local.n = -1;
      local.line = 0;
      local.zoneSeen = -1;
      const st = c.S.x.stage;
      c.spawn(st >= 2 ? Soleil.P(c.role === 'dame' ? -3 : 3, 0, 88) : Soleil.spawn(0, c.role), 0);
      Player.killY = Soleil.O.y - 25;
      Player.checkpoint = () => Soleil.spawn(local.line, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.004);
      Sound.mood('tense');
      HUD.visa(A.card + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3400);
      HUD.say(A.rule, T.master, 3000);
      HUD.say(A.hint[c.role], T.master, 4600);
      this.apply(c);
    },
    exit() {
      HUD.danger(0);
    },
    apply(c) {
      if (!Soleil.built) return;
      const x = c.S.x;
      if (x.d.n !== local.n) enterPhase(c, x.d);
      if (x.stage !== local.stage) {
        local.stage = x.stage;
        if (x.stage === 2) {
          HUD.objective(A.finish);
          Sound.play('reveal');
        }
        if (x.stage === 3) {
          HUD.objective(T.portes.card.replace('♦ 9', A.card));
          HUD.say(A.win, T.master, 2600);
          Sound.play('card');
          HUD.danger(0);
        }
      }
    },
    host(c, dt) {
      if (!Soleil.built) return;
      const x = c.S.x;
      const qd = Soleil.rel(c.pos('dame'));
      const qv = Soleil.rel(c.pos('valet'));
      const zone = Math.max(Soleil.lineOf(qd), Soleil.lineOf(qv));
      if (x.stage === 1 && qd.z >= Soleil.LINES[3] && qv.z >= Soleil.LINES[3])
        c.set((s) => (s.x.stage = 2));
      if (x.stage === 3) {
        tm.win += dt;
        if (tm.win > 2 && Soleil.nearCard(qd) && Soleil.nearCard(qv))
          c.goto('reward', (s) => (s.x.card = 's3'));
        return;
      }
      tm.d += dt;
      const d = x.d;
      const set = (nd) => {
        tm.d = 0;
        c.set((s) => (s.x.d = { ...nd, n: (s.x.d.n || 0) + 1 }));
      };
      if (d.ph === 'sing' && tm.d > d.dur) {
        if (d.real) set({ ph: 'turn', dur: 0.45 });
        else set({ ph: 'fake', dur: 0.95 });
      } else if (d.ph === 'turn' && tm.d > d.dur)
        set({ ph: 'watch', dur: rnd(ZONES[zone][2], ZONES[zone][3]) });
      else if (d.ph === 'watch' && tm.d > d.dur) set({ ph: 'back', dur: 0.45 });
      else if (d.ph === 'back' && tm.d > d.dur) set(nextSing(x, zone));
      else if (d.ph === 'fake' && tm.d > d.dur) set(nextSing(x, zone, true));
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'touch' && x.stage === 2) {
        x.touch[who] = performance.now();
        const o = who === 'dame' ? 'valet' : 'dame';
        if (x.touch[o] && performance.now() - x.touch[o] < 3000)
          c.set((s) => {
            s.x.stage = 3;
            s.x.d = { ph: 'sleep', dur: 99, n: (s.x.d.n || 0) + 1 };
          });
      }
    },
    update(c, dt, t) {
      if (!Soleil.built) return null;
      const x = c.S.x;
      Soleil.update(dt, t, x);
      const d = x.d;
      const el = now() - local.start;
      const dame = c.role === 'dame';
      // doll pose
      let yawT = 0;
      if (d.ph === 'turn' || d.ph === 'watch') yawT = Math.PI;
      if (d.ph === 'fake') yawT = el < 0.45 ? Math.PI * 0.55 : 0;
      if (d.ph === 'sleep') yawT = Math.PI;
      const warn = d.ph === 'sing' && d.real && d.dur - el < 0.9;
      let eyes = 0.05;
      if (dame) {
        if (warn) eyes = 3 + Math.sin(t * 30) * 1.2;
        else if (d.ph === 'turn' || d.ph === 'watch') eyes = 2.4;
        else eyes = 0.15;
        if (warn && !local.warned) {
          local.warned = true;
          Sound.play('dollWarn');
        }
      }
      if (d.ph === 'sleep') eyes = 0;
      Soleil.setDoll(yawT, dt, eyes, d.ph === 'sleep');

      const p = Player.body.p;
      const q = Soleil.rel(p);
      local.line = Math.max(local.line, Soleil.lineOf(q));
      const zone = Soleil.lineOf(q);
      if (x.stage === 1 && zone !== local.zoneSeen) {
        local.zoneSeen = zone;
        HUD.objective(zoneText(c, zone));
        if (zone > 0) Sound.play('reveal');
      }
      local.cd -= dt;
      const inField = q.z > Soleil.LINES[0] && q.z < Soleil.LINES[3];
      let exposed = false;
      let shield = false;
      if (x.stage === 1 && inField && local.cd <= 0) {
        const watched = d.ph === 'watch' && el > 0.3;
        const always = dame && zone === 2;
        exposed = watched || always;
        if (dame && exposed) shield = Remote.has && shielded(p, Remote.pos);
        const b = Player.body;
        const moving = Math.hypot(b.v.x, b.v.z) > 0.9 || Math.abs(b.v.y) > 1.5;
        if (exposed && moving && !shield) caught(c);
      }
      if (dame && zone === 2 && x.stage === 1)
        HUD.danger(exposed && !shield ? 0.55 : shield ? 0.12 : 0);
      else HUD.danger(0);
      if (x.stage === 2 && Soleil.nearDoll(q)) {
        if (Input.pressed('interact')) {
          c.act({ a: 'touch' });
          Sound.play('chime');
        }
        return ['E', 'Toucher la Poupée'];
      }
      return null;
    },
  });
})();
