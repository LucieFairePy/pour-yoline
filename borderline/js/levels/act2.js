(() => {
  const T = CONFIG;
  const A = T.act2;
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('c4');
  const SYMS = ['♥', '♠', '♦', '♣'];
  const local = { stage: 0, round: -1, boom: 0, manual: false, card: false, scr: '' };
  // reused every frame
  const qd = V3();
  const qv = V3();
  const q = V3();

  const answer = (sym, n) => {
    if (sym === '♥') return n % 2 === 0 ? 0 : 1;
    if (sym === '♠') return n < 5 ? 2 : 3;
    if (sym === '♦') return n % 3 === 0 ? 1 : 2;
    return n % 2 === 0 ? 3 : 0;
  };
  const combo = () => ({
    sym: SYMS[(Math.random() * 4) | 0],
    num: 1 + ((Math.random() * 9) | 0),
    t: 0,
  });
  const walker = (stage) => (stage === 1 ? 'valet' : stage === 3 ? 'dame' : null);
  const mazeKey = (stage) => (stage === 1 ? 'm1' : 'm2');

  // the guide stands on the deck above the maze: start looking down at it
  const lookDown = (c, st) => {
    if ((st === 1 || st === 2) && c.role === 'dame') Cam.pitch = 0.85;
    if (st === 3 && c.role === 'valet') Cam.pitch = 0.85;
  };

  const darkness = (c) => {
    const st = Story.S.x.stage;
    const dark = walker(st) === c.role;
    Maze.mood(false);
    City.mood(dark ? { dark: 1 } : {});
    c.fog(dark ? 0.09 : 0.012);
    R.hemi.intensity = dark ? 0.04 : 0.5;
    R.moon.intensity = dark ? 0 : 0.75;
    // the night sky, lanterns and fireflies are for the one who can see
    if (!dark) Maze.mood(true);
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (prev && (st === 3 || st === 4)) {
      c.spawn(Maze.spawn(st, r), Maze.yaw(st, r));
      lookDown(c, st);
    }
    darkness(c);
    if (st === 1) {
      HUD.objective(A.maze[r]);
      Maze.screen.show('Le labyrinthe noir', 'Guide-le jusqu’à la sortie bleue', '#7ce0ff');
    }
    if (st === 2) {
      HUD.objective(A.bomb[r]);
      Maze.screen.show('La bombe à cœurs', '3 modules · un seul fil par module', '#ff5f8a');
      Sound.play('reveal');
    }
    if (st === 3) {
      if (prev) Lore.during('c4', 'swap');
      HUD.objective(A.swap[r]);
      Maze.screen.show('L’inversion', 'À ' + Story.name('dame') + ' le noir', '#7ce0ff');
      Sound.play('reveal');
      HUD.manual(null);
    }
    if (st === 4) {
      HUD.objective(A.cardLine);
      Maze.screen.show(CARD, A.title, '#7ce0ff');
      Sound.play('reveal');
    }
  };

  const onBoom = (c) => {
    Sound.play('boom');
    Fx.hearts(Maze.P(Maze.BOMB.x, 1.5, Maze.BOMB.z));
    HUD.say(A.bomb.boom, T.master, 2000);
  };
  const onOk = () => {
    Sound.play('reveal');
    HUD.say(A.bomb.ok, T.master, 1600);
  };

  Story.register('act2', {
    init: () => ({ stage: 1, bomb: { round: 0, ...combo() }, booms: 0 }),
    voice: () => 1,
    net: {
      trap: (c) => Sound.play('trap'),
      boom: (c) => onBoom(c),
      bombok: (c) => onOk(c),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Maze.build(c.role, c.S.seed);
      local.stage = 0;
      local.round = -1;
      c.spawn(Maze.spawn(c.S.x.stage, c.role), Maze.yaw(c.S.x.stage, c.role));
      lookDown(c, c.S.x.stage);
      Player.killY = Maze.O.y - 25;
      Player.checkpoint = () => {
        const st = Story.S.x.stage;
        if (walker(st) === c.role) return Maze.P(...Maze.mazes[mazeKey(st)].entry.toArray());
        return Maze.spawn(st, c.role);
      };
      Sound.mood('tense');
      HUD.visa(CARD + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro);
      this.apply(c);
    },
    exit(c) {
      HUD.manual(null);
      Maze.mood(false);
      Maze.lampAt(null, false);
      City.mood({});
      R.hemi.intensity = 0.5;
      R.moon.intensity = 0.75;
    },
    apply(c) {
      if (!Maze.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      const key = x.bomb.round + '/' + x.booms;
      if (x.stage === 2 && key !== local.round) {
        local.round = key;
        Maze.cutWire(0, false);
        Maze.cutWire(1, false);
        Maze.cutWire(2, false);
        Maze.cutWire(3, false);
      }
    },
    host(c, dt) {
      if (!Maze.built) return;
      const x = c.S.x;
      Maze.rel(c.pos('dame'), qd);
      Maze.rel(c.pos('valet'), qv);
      if (x.stage === 1 && Maze.exited(qv, 'm1')) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2) {
        x.bomb.t += dt;
        local.boom += dt;
        if (local.boom > 0.5) {
          local.boom = 0;
          c.touch();
        }
        if (x.bomb.t > 45) {
          c.send('boom');
          onBoom(c);
          // a boom sends the bomb back to its first module: guessing wires blind never adds up
          c.set((s) => {
            s.x.bomb = { round: 0, ...combo() };
            s.x.booms++;
          });
        }
      }
      if (x.stage === 3 && Maze.exited(qd, 'm2')) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4 && Maze.nearCard(qd) && Maze.nearCard(qv))
        c.goto('reward', (s) => (s.x.card = 'c4'));
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'wire' && who === 'valet' && x.stage === 2) {
        const ok = answer(x.bomb.sym, x.bomb.num) === d.i;
        if (ok) {
          const round = x.bomb.round + 1;
          c.send('bombok');
          onOk(c);
          if (round >= 3)
            c.set((s) => {
              s.x.stage = 3;
            });
          else c.set((s) => (s.x.bomb = { round, ...combo() }));
        } else {
          c.send('boom');
          onBoom(c);
          // a boom sends the bomb back to its first module: guessing wires blind never adds up
          c.set((s) => {
            s.x.bomb = { round: 0, ...combo() };
            s.x.booms++;
          });
        }
      }
    },
    update(c, dt, t) {
      if (!Maze.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      Maze.rel(p, q);
      const w = walker(x.stage);
      if (w) Maze.lampAt(w === r ? p : Remote.pos, true);
      else Maze.lampAt(null, false);
      Maze.screen.update(dt, t);
      Maze.bombScreen.update(dt, t);
      Maze.tick(t);
      Maze.showCard(x.stage === 4, t);
      let prompt = null;
      // a guide who somehow left the deck goes back up to it
      if (w && w !== r && x.stage !== 2 && q.y < 3 && Player.mode === 'walk') {
        const sp = Maze.spawn(x.stage, r);
        if (sp.y - Maze.O.y > 5) c.spawn(sp, 0);
      }
      if (w === r && Maze.onTrap(q, mazeKey(x.stage))) {
        Sound.play('trap');
        c.send('trap');
        HUD.say(A.maze.trap, T.master, 1500);
        Player.teleport(Player.checkpoint(), 0);
      }
      if (x.stage === 2) {
        const left = Math.max(0, Math.ceil(45 - x.bomb.t));
        if (!Net.isHost) x.bomb.t += dt;
        const key = x.bomb.sym + x.bomb.num + x.bomb.round + '/' + left;
        if (key !== local.scr) {
          local.scr = key;
          Maze.bombScreen.show(
            x.bomb.sym + ' ' + x.bomb.num,
            'Module ' + (x.bomb.round + 1) + '/3 · ' + left + ' s',
            '#ff5f8a',
          );
        }
        if (r === 'valet') {
          const i = Maze.nearWire(q);
          if (i >= 0) {
            prompt = ['E', 'Couper le fil ' + ['rose', 'or', 'bleu', 'blanc'][i]];
            if (Input.pressed('interact')) {
              Sound.play('cut');
              Maze.cutWire(i, true);
              c.act({ a: 'wire', i });
            }
          }
        }
        if (r === 'dame' && Maze.nearLectern(q)) {
          prompt = ['E', local.manual ? 'Fermer le manuel' : 'Lire le manuel'];
          if (Input.pressed('interact')) {
            local.manual = !local.manual;
            HUD.manual(local.manual ? A.manual : null);
          }
        } else if (local.manual) {
          local.manual = false;
          HUD.manual(null);
        }
      }
      return prompt;
    },
  });
})();
