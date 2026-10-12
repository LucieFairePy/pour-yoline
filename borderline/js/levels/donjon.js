(() => {
  const T = CONFIG;
  const A = T.donjon;
  const local = { stage: 0, phase: 0, dark: false, win: 0, wipe: 0, plates: 0 };

  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return {
        who,
        pos: c.pos(who),
        down: me ? Combat.down : !!rs.down,
        cloak: me ? Combat.cloak > 0 : !!rs.cloak,
      };
    });

  const spawnWave = (n) => Donjon.wave(n).forEach(([t, p]) => Enemies.spawn(t, p));

  Foes.onFx = (k, pos) => {
    if (Story.S && Story.S.phase !== 'donjon' && Story.S.phase !== 'raid') return;
    if (k === 'thud') {
      Sound.play('thud', pos);
      Cam.shake = Math.max(Cam.shake, 0.2);
    }
    if (k === 'wind') Sound.play('roar');
    if (k === 'charge') Sound.play('gallop');
    if (k === 'slam') {
      Sound.play('slam');
      Cam.shake = 0.35;
      if (pos) Fx.burst(pos.clone().add(V3(0, 0.3, 0)), '#ff3a5a', 160, 9, 1, -8);
    }
    if (k === 'stun') {
      Sound.play('thud', pos);
      Sound.play('shatter');
      Cam.shake = 0.5;
      HUD.say(A.bossStun, T.master, 2000);
    }
    if (k === 'phase2') {
      Sound.play('roar');
      HUD.say('Spectres ! Ne la laisse pas seule.', A.boss, 2200);
    }
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    const scr = (a, b, col) => Donjon.screen.show(a, b, col);
    if (st === 1) {
      HUD.objective(A.room1);
      scr(A.card, A.title, '#b9a6ff');
    }
    if (st === 2) {
      Sound.mood('tense');
      HUD.say(A.hint[r], T.master, 3800);
    }
    if (st === 3) {
      HUD.objective(A.levers);
      Sound.play('reveal');
      HUD.say(
        r === 'dame'
          ? 'Ton levier est tout en haut : vise l’anneau, grappin (F).'
          : 'Ton levier est sur la corniche : double saut.',
        T.master,
        3200,
      );
    }
    if (st === 4) {
      HUD.objective(A.room2);
      Sound.play('door');
    }
    if (st === 7) {
      HUD.objective(A.room3[r]);
      Sound.play('door');
    }
    if (st === 10) {
      HUD.objective(A.bossIn);
      Sound.play('door');
    }
    if (st === 11) {
      HUD.objective(A.bossObj[r]);
      Sound.mood('dark');
    }
    if (st === 12) {
      HUD.objective(A.chest);
      HUD.boss(null);
      HUD.say(A.victory, T.master, 2600);
      Sound.mood('calm');
      Sound.play('reveal');
    }
    if (st === 13) {
      HUD.objective(T.portes.card.replace('♦ 9', A.card));
      Sound.play('card');
    }
    if (prev && st < prev) c.spawn(Donjon.spawn(st, r), 0);
  };

  Story.register('donjon', {
    init: () => ({ stage: 1, plates: [], open: {} }),
    voice: () => 1,
    net: {
      dwipe: (c) => {
        Combat.reset();
        c.spawn(Donjon.spawn(Story.S.x.stage, c.role), 0);
        HUD.say(A.wipe, T.master, 2600);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Donjon.build();
      Enemies.clear();
      local.stage = 0;
      local.phase = 0;
      c.spawn(Donjon.spawn(c.S.x.stage, c.role), 0);
      Player.killY = Donjon.O.y - 25;
      Player.checkpoint = () => Donjon.spawn(Story.S.x.stage, c.role);
      Player.targets = () => (c.role === 'dame' && Story.S.x.stage === 3 ? [Donjon.ring()] : []);
      City.mood({ dark: 0.8 });
      c.fog(0.018);
      Combat.enable(true);
      HUD.visa(A.card + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3600);
      this.apply(c);
    },
    exit() {
      Combat.enable(false);
      Enemies.clear();
      HUD.boss(null);
      Player.targets = null;
      Player.avatar.ghost(0);
    },
    apply(c) {
      if (!Donjon.built) return;
      if (c.S.x.stage !== local.stage) stageEnter(c, c.S.x.stage);
    },
    host(c, dt) {
      if (!Donjon.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = Donjon.rel(ps[0].pos);
      const qv = Donjon.rel(ps[1].pos);
      const both = (f) => f(qd) && f(qv);
      const st = (n) => c.set((s) => (s.x.stage = n));
      if (x.stage === 1 && both(Donjon.inRoom1)) {
        spawnWave(1);
        st(2);
      }
      if (x.stage === 2 && Enemies.alive() === 0) st(3);
      if (x.stage === 3) {
        const pl = [];
        if (Donjon.onPlate('dame', qd)) pl.push('dame');
        if (Donjon.onPlate('valet', qv)) pl.push('valet');
        if (pl.join() !== x.plates.join()) c.set((s) => (s.x.plates = pl));
        local.plates = pl.length === 2 ? local.plates + dt : 0;
        if (local.plates > 1.2) {
          c.set((s) => {
            s.x.plates = [];
            s.x.stage = 4;
          });
        }
      }
      if (x.stage === 4 && both(Donjon.inRoom2)) {
        spawnWave(2);
        st(5);
      }
      if (x.stage === 5 && Enemies.alive() === 0) {
        spawnWave(3);
        st(6);
      }
      if (x.stage === 6 && Enemies.alive() === 0) st(7);
      if (x.stage === 7 && both(Donjon.inRoom3)) {
        spawnWave(4);
        st(8);
      }
      if (x.stage === 8 && Enemies.alive() === 0) {
        spawnWave(5);
        st(9);
      }
      if (x.stage === 9 && Enemies.alive() === 0) st(10);
      if (x.stage === 10 && both(Donjon.inArena)) {
        Enemies.spawn('gardien', Donjon.bossPos(), { phase: 1, st: 0, atk: 3 });
        st(11);
      }
      if (x.stage === 11 && !Enemies.boss()) st(12);
      if (x.stage === 13) {
        local.win += dt;
        if (local.win > 3.5) c.goto('reward', (s) => (s.x.card = 's7'));
      }
      const fight = [2, 5, 6, 8, 9, 11].includes(x.stage);
      if (fight || Enemies.alive()) Enemies.simulate(dt, ps);
      Enemies.netTick(dt);
      if (fight && ps[0].down && ps[1].down) {
        local.wipe += dt;
        if (local.wipe > 2.2) {
          local.wipe = 0;
          const back = Donjon.roomStart(x.stage);
          Enemies.clear();
          Enemies.netTick(1);
          Combat.reset();
          c.set((s) => (s.x.stage = back));
          c.spawn(Donjon.spawn(back, c.role), 0);
          HUD.say(A.wipe, T.master, 2600);
          c.send('dwipe');
        }
      } else local.wipe = 0;
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
      if (d.a === 'chest' && x.stage === 12) {
        x.open[who] = performance.now();
        const o = who === 'dame' ? 'valet' : 'dame';
        if (x.open[o] && performance.now() - x.open[o] < 3000) c.set((s) => (s.x.stage = 13));
      }
    },
    update(c, dt, t) {
      if (!Donjon.built) return null;
      const x = c.S.x;
      Donjon.update(dt, t, x);
      Enemies.render(dt, t);
      const q = Donjon.rel(Player.body.p);
      const dark = Donjon.darkAt(q);
      if (dark !== local.dark) {
        local.dark = dark;
        c.fog(dark ? 0.06 : 0.018);
        City.mood({ dark: dark ? 1 : 0.8 });
      }
      const boss = Enemies.boss();
      if (boss) {
        const stun = boss.stun > 0 || boss.st === 4;
        HUD.boss(
          A.boss,
          boss.hp / boss.max,
          (boss.phase === 2 ? 'Phase 2' : 'Phase 1') +
            ' · ' +
            (stun ? 'Sonné · vise le cœur' : 'Armure'),
        );
      }
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 12 && Donjon.nearChest(q)) {
        if (Input.pressed('interact')) {
          c.act({ a: 'chest' });
          Sound.play('chime');
        }
        return ['E', 'Ouvrir le coffre (ensemble)'];
      }
      return null;
    },
  });
})();
