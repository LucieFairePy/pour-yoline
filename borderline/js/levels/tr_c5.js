(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('c5');
  const T = CONFIG;
  const TITLE = 'La Bombe à cœurs II';
  const TXT = {
    intro: 'Épreuve d’équipe. Le train de nuit des Veilleurs. Dans le fourgon, une bombe à cœurs. Plus grosse que la première.',
    hint: {
      dame: 'Cette fois, c’est toi qui tiens la bombe. Le manuel reste avec {mate}, dans la voiture-salon.',
      valet: 'Cette fois, c’est toi qui lis. Le manuel est sur le lutrin. {mate} part vers la bombe.',
    },
    s1: {
      dame: 'Le fourgon · La bombe t’attend. Décris chaque module à {mate}, et ne coupe rien sans sa voix.',
      valet: 'La voiture-salon · Lis le manuel au lutrin (E). Demande d’abord le numéro de série à {mate}.',
    },
    s1go: {
      dame: 'Va jusqu’à la bombe, au fond du fourgon. La porte se fermera derrière toi.',
      valet: 'Reste ici avec le manuel. {mate} va jusqu’à la bombe.',
    },
    sealed: 'La porte du fourgon se verrouille. Vous n’avez plus que vos voix.',
    run: 'Le compte à rebours démarre.',
    transfer: 'Les trois modules sont désamorcés… et la bombe se remet en route. Elle roule vers la locomotive.',
    s2: {
      dame: 'La voiture des machines · À toi le manuel, au lutrin. Et surveille les trois vannes : si une aiguille touche le rouge, c’est une erreur.',
      valet: 'La locomotive · À toi la bombe. Les modules se sont retournés. {mate} a le manuel, dans la voiture des machines.',
    },
    s2go: {
      dame: 'Va dans la voiture des machines. La locomotive te restera fermée.',
      valet: 'Suis la bombe jusqu’à la locomotive, tout devant.',
    },
    sealed2: 'La porte de la locomotive se verrouille.',
    steam: 'Une vanne lâche ! La vapeur secoue la rame : un cœur se brise.',
    steamWarn: 'Une vanne approche du rouge.',
    s3: {
      dame: 'Le dernier module · Rejoins {mate} dans la locomotive. Deux clés, une de chaque côté de la bombe.',
      valet: 'Le dernier module · {mate} te rejoint. Deux clés, une de chaque côté de la bombe.',
    },
    s3rule: 'Chacun voit un chiffre que l’autre ne voit pas. Tournez vos deux clés ensemble, au battement égal à la somme de vos chiffres. Au-delà de 4, retirez 4.',
    tunnel: 'Le train entre dans le tunnel.',
    round: 'Un tiers du cœur s’allume.',
    apart: 'Pas ensemble. Les deux clés, au même battement.',
    wrongBeat: 'Mauvais battement.',
    strike: 'Erreur. Un cœur se brise.',
    boom: 'BOUM. Des cœurs partout. La bombe se remonte : tous ses modules recommencent.',
    solved: 'Module désamorcé.',
    allDone: 'La bombe se tait. Les cœurs retombent en pluie.',
    card: 'La carte ' + CARD + ' sort de la bombe. Prenez-la ensemble.',
    readHint: 'Flèches gauche et droite : tourner les pages. Espace : refermer.',
  };
  CONFIG.cards.c5 = {
    title: TITLE,
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'Une bombe, un manuel, et trois voitures entre vous deux.',
      'Vous avez échangé les rôles en pleine course, sans lâcher la voix de l’autre.',
      'Au bout du tunnel, deux clés tournées au même battement.',
    ],
  };
  const TIME = { 1: 300, 2: 300, 3: 100 };
  const MOVE = 9;
  const BEAT = 1.0;
  const RATES = [1 / 42, 1 / 50, 1 / 58];
  const MOD_TITLE = { wires: 'les fils-cœurs', keys: 'les symboles', simon: 'le battement', maze: 'le labyrinthe', memo: 'la mémoire', dial: 'le cadran' };

  const local = {
    stage: 0,
    focus: -1,
    sel: 0,
    read: false,
    spread: 0,
    camK: 0,
    closePos: V3(),
    closeLook: V3(),
    lastMove: { x: 0, z: 0 },
    skipE: false,
    time: TIME[1],
    run: false,
    press: [0, 0, 0],
    bombZ: 35,
    moving: false,
    moveT: 0,
    beat: 0,
    beatFrac: 0,
    beatT: 0,
    turned: {},
    turns: {},
    ventI: -1,
    ventT: 0,
    sendT: 0,
    clack: 0,
    rumble: 0,
    tickS: -1,
    msgCd: {},
    warned: {},
    shake: 0,
    flicker: 0,
    solvedAt: -1,
    cardUp: 0,
    lastBeat: -1,
  };
  const defuser = (st) => (st === 1 ? 'dame' : st === 2 ? 'valet' : null);
  const expertBook = (st, role) => (st === 1 && role === 'valet' ? 1 : st === 2 && role === 'dame' ? 2 : 0);
  const once = (k, txt, hold = 3200) => {
    if (local.msgCd[k]) return;
    local.msgCd[k] = true;
    HUD.say(txt, T.master, hold);
  };
  const bombPos = () => C5.P(0, 1.6, local.bombZ);

  // ---------- effects, on both screens ----------
  const fx = (k, d) => {
    const near = Math.abs(C5.rel(Player.body.p).z - local.bombZ) < 8;
    if (k === 'strike') {
      Sound.play('rune', false);
      Sound.play('trap');
      local.shake = 0.5;
      if (near) Cam.shake = Math.max(Cam.shake, 0.2);
    }
    if (k === 'ok') Sound.play('rune', true);
    if (k === 'solve') {
      Sound.play('reveal');
      Fx.burst(bombPos(), '#3fe08a', 18, 2, 0.6, 0);
    }
    if (k === 'cut') Sound.play('cut');
    if (k === 'press') {
      Sound.play('switch');
      if (d) C5.pressFx(d[0], d[1], d[2], d[3]);
    }
    if (k === 'boom') {
      Sound.play('boom', bombPos());
      Sound.play('shatter');
      C5.boom(bombPos(), near);
      local.shake = 1;
      local.flicker = 1.2;
      Cam.shake = Math.max(Cam.shake, near ? 0.7 : 0.3);
      // the blast knocks whoever stands at the bomb back a few steps
      if (near) {
        local.focus = -1;
        if (Player.mode === 'frozen') Player.mode = 'walk';
        Player.body.v.set(0, 4.5, -7);
      }
    }
    if (k === 'steam') {
      Sound.play('trap');
      Sound.play('rumble', 1);
      C5.steam(d);
      local.shake = 0.6;
      local.flicker = 0.6;
    }
    if (k === 'turn') local.turned[d] = 0.7;
    if (k === 'round') {
      Sound.play('reveal');
      C5.confetti(C5.P(0, 3.0, local.bombZ), 80);
    }
    if (k === 'win') {
      Sound.play('card');
      C5.confetti(C5.P(0, 2.8, local.bombZ), 700);
      C5.endTunnel();
    }
  };
  const both = (c, k, d) => {
    fx(k, d);
    c.send('c5fx', [k, d]);
  };
  const say = (c, txt, hold = 2400) => {
    HUD.say(txt, T.master, hold);
    c.send('c5say', [txt, hold]);
  };

  // ---------- host: rules ----------
  const genFace = (st) => (st === 1 ? [C5.RULES.wires(), C5.RULES.keys(), C5.RULES.simon()] : [C5.RULES.maze(), C5.RULES.memo(), C5.RULES.dial()]);
  const setMod = (c, f, i, m) =>
    c.set((s) => {
      const mods = s.x.mods.map((a) => a.slice());
      mods[f][i] = m;
      s.x.mods = mods;
    });
  const strike = (c, why) => {
    const n = (c.S.x.strikes || 0) + 1;
    both(c, 'strike');
    if (n >= 3) return boom(c);
    c.set((s) => (s.x.strikes = n));
    say(c, why || TXT.strike, 1800);
  };
  const boom = (c) => {
    const st = c.S.x.stage;
    both(c, 'boom');
    say(c, TXT.boom, 3000);
    local.time = TIME[st];
    local.turns = {};
    c.set((s) => {
      s.x.strikes = 0;
      if (st <= 2) {
        // the whole face starts over, solved modules too: with only three strikes per bomb, the one
        // holding it cannot guess the modules one by one across explosions without the manual
        const f = st - 1;
        const mods = s.x.mods.map((a) => a.slice());
        mods[f] = genFace(st);
        s.x.mods = mods;
      } else s.x.fin = { round: 0, dig: { dame: 1 + ((Math.random() * 4) | 0), valet: 1 + ((Math.random() * 4) | 0) } };
    });
  };
  const solve = (c, f, i, m) => {
    setMod(c, f, i, { ...m, solved: true });
    both(c, 'solve');
    const mods = c.S.x.mods[f].map((x, k) => (k === i ? { ...m, solved: true } : x));
    if (mods.every((x) => x.solved)) {
      if (c.S.x.stage === 1) {
        say(c, TXT.transfer, 3600);
        local.moveT = 0;
        local.moving = true;
        local.run = false;
        local.time = TIME[2];
        c.set((s) => {
          s.x.stage = 2;
          s.x.strikes = 0;
        });
      } else if (c.S.x.stage === 2) {
        local.run = false;
        local.time = TIME[3];
        local.beatT = 0;
        c.set((s) => {
          s.x.stage = 3;
          s.x.strikes = 0;
          s.x.fin = { round: 0, dig: { dame: 1 + ((Math.random() * 4) | 0), valet: 1 + ((Math.random() * 4) | 0) } };
        });
      }
    } else say(c, TXT.solved, 1400);
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    local.msgCd = {};
    const r = c.role;
    exitFocus();
    if (st === 1) {
      HUD.objective(TXT.s1go[r]);
      local.bombZ = C5.BOMB_Z[1];
    }
    if (st === 2) {
      HUD.objective(TXT.s2go[r]);
      Sound.mood('tense');
      if (prev === 1) {
        local.moving = true;
        local.moveT = 0;
        Sound.play('lift');
      } else local.bombZ = C5.BOMB_Z[2];
    }
    if (st === 3) {
      local.moving = false;
      local.bombZ = C5.BOMB_Z[2];
      HUD.objective(TXT.s3[r]);
      Sound.play('reveal');
      HUD.say(TXT.s3rule, T.master, 6000);
      C5.startTunnel(260);
      local.tunnelSaid = false;
    }
    if (st === 4) {
      local.bombZ = C5.BOMB_Z[2];
      HUD.objective(TXT.card);
      Sound.mood('calm');
      local.cardUp = 0;
      if (prev === 3) HUD.say(TXT.allDone, T.master, 3000);
      else C5.endTunnel();
    }
  };

  // ---------- focus (examining a module) and reading ----------
  const exitFocus = () => {
    if (local.focus >= 0 || local.read) {
      local.focus = -1;
      local.read = false;
      if (Player.mode === 'frozen') Player.mode = 'walk';
    }
  };
  // one step of the arrows: returns 'u' 'd' 'l' 'r' on the frame it is pushed
  const arrow = () => {
    const m = Input.move();
    const dir = m.z > 0.5 ? 'u' : m.z < -0.5 ? 'd' : m.x > 0.5 ? 'r' : m.x < -0.5 ? 'l' : '';
    const prev = local.lastMove.d || '';
    local.lastMove.d = dir;
    return dir && dir !== prev ? dir : '';
  };
  const moduleUI = (c, m, f, i) => {
    const a = arrow();
    const E = Input.pressed('interact') && !local.skipE;
    if (!Input.held('interact')) local.skipE = false;
    const els = C5.elements(m);
    if (m.solved) return ['Espace', 'Module désamorcé · reculer'];
    if (m.k === 'wires') {
      if (a === 'u') local.sel = Math.max(0, local.sel - 1);
      if (a === 'd') local.sel = Math.min(els.length - 1, local.sel + 1);
      if (E && !m.cut.includes(local.sel)) c.act({ a: 'cut', f, i, n: local.sel });
      return ['E', 'Couper le fil ' + (local.sel + 1) + ' (' + C5.WCOL[m.w[local.sel]][0] + ') · flèches : choisir · Espace : reculer'];
    }
    if (m.k === 'keys') {
      if (a === 'l' || a === 'r') local.sel ^= 1;
      if (a === 'u' || a === 'd') local.sel ^= 2;
      if (E) {
        C5.pressFx(f, i, 'keys', local.sel);
        c.act({ a: 'key', f, i, n: local.sel });
      }
      return ['E', 'Appuyer · flèches : choisir · Espace : reculer'];
    }
    if (m.k === 'simon') {
      local.sel = -1;
      const q = { u: 0, r: 1, d: 2, l: 3 }[a];
      if (q != null) {
        C5.pressFx(f, i, 'simon', q);
        c.act({ a: 'simon', f, i, n: q });
      }
      return ['Flèches', 'Appuyer sur une couleur (haut rose, droite bleu, bas or, gauche vert) · Espace : reculer'];
    }
    if (m.k === 'maze') {
      local.sel = -1;
      const d = { u: 0, r: 1, d: 2, l: 3 }[a];
      if (d != null) c.act({ a: 'move', f, i, n: d });
      return ['Flèches', 'Déplacer le point blanc · Espace : reculer'];
    }
    if (m.k === 'memo') {
      if (a === 'l') local.sel = Math.max(0, local.sel - 1);
      if (a === 'r') local.sel = Math.min(3, local.sel + 1);
      if (E) {
        C5.pressFx(f, i, 'memo', local.sel);
        c.act({ a: 'memo', f, i, n: local.sel });
      }
      return ['E', 'Appuyer sur le bouton ' + (local.sel + 1) + ' · flèches : choisir · Espace : reculer'];
    }
    if (m.k === 'dial') {
      local.sel = -1;
      if (a === 'l') c.act({ a: 'knob', f, i, n: -1 });
      if (a === 'r') c.act({ a: 'knob', f, i, n: 1 });
      if (E) c.act({ a: 'dialok', f, i });
      return ['E', 'Valider · flèches gauche / droite : tourner le bouton · Espace : reculer'];
    }
    return null;
  };

  Story.register('tr_c5', {
    init: () => ({
      stage: 1,
      serial: C5.RULES.serial(),
      mods: [genFace(1), genFace(2)],
      strikes: 0,
      seal1: false,
      seal2: false,
      fin: null,
    }),
    voice: () => 1,
    net: {
      c5fx: (c, d) => fx(d[0], d[1]),
      c5say: (c, d) => HUD.say(d[0], T.master, d[1] || 2400),
      c5t: (c, d) => {
        if (Net.isHost) return;
        local.time = d[0];
        local.run = !!d[1];
        local.press = [d[2], d[3], d[4]];
        local.beat = d[5];
        local.beatFrac = d[6];
        local.moving = !!d[7];
        local.bombZ = d[8];
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      C5.build();
      local.stage = 0;
      local.msgCd = {};
      local.focus = -1;
      local.read = false;
      local.time = TIME[c.S.x.stage] || 0;
      local.run = false;
      local.press = [0, 0, 0];
      local.moving = false;
      local.bombZ = c.S.x.stage >= 2 ? C5.BOMB_Z[2] : C5.BOMB_Z[1];
      c.spawn(C5.spawn(c.S.x.stage, c.role, c.S.x), 0);
      Player.killY = C5.O.y - 20;
      Player.checkpoint = () => C5.spawn(Story.S.x.stage, c.role, Story.S.x);
      Player.targets = null;
      City.mood({});
      c.fog(0.0045);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3600);
      if (c.S.x.stage === 1) HUD.say(TXT.hint[c.role], T.master, 3800);
      this.apply(c);
    },
    exit() {
      exitFocus();
      C5.hide();
      Sound.mood('calm');
    },
    apply(c) {
      if (!C5.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      if (x.seal1 && !local.said1) {
        local.said1 = true;
        HUD.say(TXT.sealed, T.master, 2600);
        if (x.stage === 1) HUD.objective(TXT.s1[c.role]);
      }
      if (x.seal2 && !local.said2) {
        local.said2 = true;
        HUD.say(TXT.sealed2, T.master, 2200);
        if (x.stage === 2) HUD.objective(TXT.s2[c.role]);
      }
    },
    host(c, dt) {
      if (!C5.built) return;
      const x = c.S.x;
      const qd = C5.rel(c.pos('dame'));
      const qv = C5.rel(c.pos('valet'));
      const rate = 1 + 0.25 * (x.strikes || 0);
      if (x.stage === 1) {
        if (!x.seal1 && qd.z > 24.6 && qd.z < 46 && qv.z < 22.6) c.set((s) => (s.x.seal1 = true));
        if (!local.run && x.seal1 && C5.nearBomb(qd, C5.BOMB_Z[1])) {
          local.run = true;
          say(c, TXT.run, 1600);
        }
      }
      if (x.stage === 2) {
        if (local.moving) {
          local.moveT += dt;
          local.bombZ = lerp(C5.BOMB_Z[1], C5.BOMB_Z[2], smooth(Math.min(1, local.moveT / MOVE)));
          if (local.moveT >= MOVE) local.moving = false;
        }
        if (!local.moving && !x.seal2 && qv.z > 68.6 && qd.z < 66.6) c.set((s) => (s.x.seal2 = true));
        if (!local.run && !local.moving && x.seal2 && C5.nearBomb(qv, C5.BOMB_Z[2])) {
          local.run = true;
          say(c, TXT.run, 1600);
        }
        // the valves fill while the clock runs
        if (local.run)
          local.press = local.press.map((p, i) => {
            let np = p + dt * RATES[i] * (1 + 0.15 * (x.strikes || 0));
            if (np > 0.8 && !local.warned[i]) {
              local.warned[i] = true;
              c.send('c5say', [TXT.steamWarn, 1600]);
              if (c.role === 'dame') HUD.say(TXT.steamWarn, T.master, 1600);
            }
            if (np >= 1) {
              np = 0.3;
              local.warned[i] = false;
              both(c, 'steam', i);
              strike(c, TXT.steam);
            }
            return np;
          });
      }
      if (x.stage === 3) {
        if (!local.run && qd.z > 68.6 && qv.z > 68.6) local.run = true;
        local.beatT += dt;
        const n = Math.floor(local.beatT / BEAT);
        local.beat = (n % 4) + 1;
        local.beatFrac = (local.beatT % BEAT) / BEAT;
        // a key turned alone waits for the other one; too long and it is a miss
        const now = local.beatT;
        ['dame', 'valet'].forEach((w) => {
          const tw = local.turns[w];
          const other = local.turns[w === 'dame' ? 'valet' : 'dame'];
          if (tw && !other && now - tw.t > 0.75) {
            local.turns = {};
            strike(c, TXT.apart);
          }
        });
      }
      if (local.run && x.stage <= 3) {
        local.time -= dt * rate;
        if (local.time <= 0) boom(c);
      }
      if (x.stage === 4 && local.cardUp > 0.95 && C5.nearCard(qd) && C5.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'c5'));
      local.sendT += dt;
      if (local.sendT > 0.1) {
        local.sendT = 0;
        c.send('c5t', [
          +local.time.toFixed(1),
          local.run ? 1 : 0,
          +local.press[0].toFixed(3),
          +local.press[1].toFixed(3),
          +local.press[2].toFixed(3),
          local.beat,
          +local.beatFrac.toFixed(2),
          local.moving ? 1 : 0,
          +local.bombZ.toFixed(2),
        ]);
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'vent' && x.stage === 2 && who === 'dame') {
        local.press = local.press.slice();
        local.press[d.i] = 0;
        local.warned[d.i] = false;
        return;
      }
      if (d.a === 'turn' && x.stage === 3 && x.fin) {
        both(c, 'turn', who);
        local.turns[who] = { t: local.beatT, beat: local.beat };
        const a = local.turns.dame;
        const b = local.turns.valet;
        if (a && b) {
          local.turns = {};
          const want = ((x.fin.dig.dame + x.fin.dig.valet - 1) % 4) + 1;
          if (Math.abs(a.t - b.t) > 0.75 || a.beat !== b.beat) return strike(c, TXT.apart);
          if (a.beat !== want) return strike(c, TXT.wrongBeat);
          const round = x.fin.round + 1;
          if (round >= 3) {
            both(c, 'win');
            local.run = false;
            c.set((s) => {
              s.x.fin = { ...s.x.fin, round };
              s.x.stage = 4;
            });
          } else {
            both(c, 'round');
            say(c, TXT.round, 1600);
            c.set((s) => (s.x.fin = { round, dig: { dame: 1 + ((Math.random() * 4) | 0), valet: 1 + ((Math.random() * 4) | 0) } }));
          }
        }
        return;
      }
      // module actions: only the one holding the bomb, only on the live face
      const f = d.f;
      if (x.stage > 2 || who !== defuser(x.stage) || f !== x.stage - 1 || local.moving) return;
      const m = x.mods[f][d.i];
      if (!m || m.solved) return;
      if (d.a === 'cut' && m.k === 'wires' && !m.cut.includes(d.n)) {
        const nm = { ...m, cut: [...m.cut, d.n] };
        both(c, 'cut');
        if (d.n === C5.RULES.wireAnswer(m.w, x.serial)) solve(c, f, d.i, nm);
        else {
          setMod(c, f, d.i, nm);
          strike(c);
        }
      }
      if (d.a === 'key' && m.k === 'keys' && !m.pressed.includes(d.n)) {
        both(c, 'press', [f, d.i, 'keys', d.n]);
        const order = C5.RULES.keyOrder(m);
        if (order[m.pressed.length] === d.n) {
          const nm = { ...m, pressed: [...m.pressed, d.n] };
          if (nm.pressed.length === 4) solve(c, f, d.i, nm);
          else setMod(c, f, d.i, nm);
        } else {
          setMod(c, f, d.i, { ...m, pressed: [] });
          strike(c);
        }
      }
      if (d.a === 'simon' && m.k === 'simon') {
        both(c, 'press', [f, d.i, 'simon', d.n]);
        const want = C5.RULES.simonWant(m, x.serial, x.strikes || 0);
        const input = [...m.input, d.n];
        if (want[input.length - 1] !== d.n) {
          setMod(c, f, d.i, { ...m, input: [] });
          strike(c);
        } else if (input.length === want.length) {
          if (m.stage >= 2) solve(c, f, d.i, { ...m, input: [] });
          else {
            setMod(c, f, d.i, { ...m, stage: m.stage + 1, input: [] });
            both(c, 'ok');
          }
        } else setMod(c, f, d.i, { ...m, input });
      }
      if (d.a === 'move' && m.k === 'maze') {
        const n = C5.RULES.mazeStep(m.m, m.pos, d.n);
        const edge = (d.n === 0 && m.pos < 6) || (d.n === 2 && m.pos >= 30) || (d.n === 1 && m.pos % 6 === 5) || (d.n === 3 && m.pos % 6 === 0);
        if (edge) return;
        if (n < 0) return strike(c);
        Sound.play('tile');
        c.send('c5fx', ['press']);
        if (n === m.goal) solve(c, f, d.i, { ...m, pos: n });
        else setMod(c, f, d.i, { ...m, pos: n });
      }
      if (d.a === 'memo' && m.k === 'memo') {
        both(c, 'press', [f, d.i, 'memo', d.n]);
        if (C5.RULES.memoWant(m) === d.n) {
          const hist = [...m.hist, [d.n, m.lab[d.n]]];
          if (m.st >= 2) solve(c, f, d.i, { ...m, hist });
          else {
            setMod(c, f, d.i, { ...m, st: m.st + 1, hist, d: 1 + ((Math.random() * 4) | 0), lab: m.lab.slice().sort(() => Math.random() - 0.5) });
            both(c, 'ok');
          }
        } else {
          setMod(c, f, d.i, C5.RULES.memo());
          strike(c);
        }
      }
      if (d.a === 'knob' && m.k === 'dial') {
        setMod(c, f, d.i, { ...m, knob: (m.knob + d.n + 8) % 8 });
        both(c, 'press');
      }
      if (d.a === 'dialok' && m.k === 'dial') {
        if (C5.RULES.dialOk(m)) solve(c, f, d.i, m);
        else strike(c);
      }
    },
    update(c, dt, t) {
      if (!C5.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = C5.rel(p);
      const st = x.stage;
      // the client side of the clocks
      if (!Net.isHost) {
        if (local.run && st <= 3) local.time -= dt * (1 + 0.25 * (x.strikes || 0));
        if (st === 3) local.beatFrac = Math.min(0.99, local.beatFrac + dt / BEAT);
      }
      if (st === 4) local.cardUp = Math.min(1, local.cardUp + dt * 0.5);
      Object.keys(local.turned).forEach((k) => (local.turned[k] = Math.max(0, local.turned[k] - dt)));
      local.shake = Math.max(0, local.shake - dt);
      local.flicker = Math.max(0, local.flicker - dt);
      // the train's rhythm: two clacks a second and a low rumble
      local.clack -= dt;
      const tun = C5.tunnelState();
      if (local.clack <= 0) {
        local.clack = 1.05;
        Sound.play('step', tun.inside ? 2 : 1.2);
        setTimeout(() => Sound.play('step', tun.inside ? 1.6 : 0.9), 130);
      }
      local.rumble -= dt;
      if (local.rumble <= 0) {
        local.rumble = 0.5;
        Sound.play('rumble', tun.inside ? 0.5 : 0.22);
      }
      if (st === 3 && tun.inside && !local.tunnelSaid) {
        local.tunnelSaid = true;
        HUD.say(TXT.tunnel, T.master, 1800);
      }
      // the heart beats out loud on the last module
      if (st === 3 && local.beat !== local.lastBeat) {
        local.lastBeat = local.beat;
        if (local.beat) Sound.play('heart', local.beat === 1 ? 0.9 : 0.55);
      }
      // the countdown ticks in the last minute
      if (local.run && st <= 3) {
        const s = Math.ceil(local.time);
        if (s !== local.tickS) {
          local.tickS = s;
          if (s <= 60 || s % 10 === 0) Sound.play(s <= 20 ? 'ui' : 'tile');
        }
      }
      // doors: who may pass, and which ones stand open
      const qd = C5.rel(c.pos('dame'));
      const qv = C5.rel(c.pos('valet'));
      const doorPass = [false, false, false];
      const doorOpen = [false, false, false];
      if (st === 1) {
        doorPass[0] = r === 'dame' && !x.seal1;
        doorOpen[0] = !x.seal1 && Math.abs(qd.z - 23) < 3.2;
      } else if (st === 2) {
        doorPass[0] = doorPass[1] = true;
        doorOpen[0] = doorOpen[1] = true;
        doorPass[2] = r === 'valet' && !x.seal2;
        doorOpen[2] = local.moving || (!x.seal2 && Math.abs(qv.z - 67) < 3.2);
      } else {
        doorPass[0] = doorPass[1] = doorPass[2] = true;
        doorOpen[0] = doorOpen[1] = doorOpen[2] = true;
      }
      const reader = local.read ? expertBook(st, r) : 0;
      const repeat = {};
      const tcol = local.time < 30 ? '#ff3b55' : local.time < 90 ? '#ffb040' : '#ff6f9a';
      const tstr = Math.floor(Math.max(0, Math.ceil(local.time)) / 60) + ':' + String(Math.max(0, Math.ceil(local.time)) % 60).padStart(2, '0');
      const broken = (x.strikes || 0) + (x.strikes > 1 ? ' cœurs brisés' : ' cœur brisé');
      if (st === 1) repeat[1] = local.run ? [tstr, 'Bombe · ' + broken, tcol] : ['En attente', 'La bombe n’est pas encore entre ses mains', '#ffcf8a'];
      if (st === 2) repeat[2] = local.run ? [tstr, 'Bombe · ' + broken, tcol] : ['En route', 'La bombe roule vers la locomotive', '#ffcf8a'];
      const L = {
        bombZ: Net.isHost ? local.bombZ : (local.bz = damp(local.bz || local.bombZ, local.bombZ, 8, dt)),
        moving: local.moving,
        face: st >= 2 ? 1 : 0,
        time: local.run || st >= 3 ? local.time : null,
        timeCol: st >= 4 ? '#3fe08a' : tcol,
        danger: local.run && local.time < 30,
        doorPass,
        doorOpen,
        focus: local.focus,
        sel: local.sel,
        reader,
        spread: local.spread,
        press: local.press,
        venting: local.ventI,
        beat: st === 3 ? local.beat : 0,
        beatFrac: local.beatFrac,
        turned: { dame: local.turned.dame > 0, valet: local.turned.valet > 0 },
        inTunnel: tun.inside,
        shake: local.shake,
        flicker: local.flicker > 0,
        repeat,
        cardUp: local.cardUp,
        simonFlash: -1,
      };
      if (st >= 4) L.time = 0;
      // the Simon module flashes its sequence over and over
      const sim = x.mods && x.mods[0] && x.mods[0][2];
      if (st === 1 && sim && !sim.solved && local.run) {
        const seq = sim.seq.slice(0, sim.stage + 2);
        const cyc = seq.length * 0.8 + 2.0;
        const tt = t % cyc;
        const k = Math.floor(tt / 0.8);
        if (k < seq.length && tt % 0.8 < 0.55) L.simonFlash = seq[k];
      }
      C5.L = L;
      C5.dbg = local;
      C5.update(dt, t, x, r, L);
      // the close-up camera (examining a module, reading the manual)
      let close = null;
      if (local.focus >= 0) {
        const sw = C5.slotWorld(local.focus, L.bombZ);
        close = { pos: sw.clone().add(V3(0, 0.05, -0.85)), look: sw };
      } else if (local.read) close = C5.bookView(expertBook(st, r));
      if (close) {
        local.closePos.copy(close.pos);
        local.closeLook.copy(close.look);
      }
      local.camK = damp(local.camK, close ? 1 : 0, 6, dt);
      if (local.camK > 0.002) {
        const cam = R.camera;
        const fw = V3(0, 0, -1).applyQuaternion(cam.quaternion);
        const look = cam.position.clone().addScaledVector(fw, 4);
        const k = smooth(Math.min(1, local.camK));
        cam.position.lerp(local.closePos, k);
        look.lerp(local.closeLook, k);
        cam.lookAt(look);
        // your own helmet would fill the close-up
        if (local.camK > 0.35 && Player.avatar) Player.avatar.visible = false;
      }

      // ---- examining a module ----
      if (local.focus >= 0) {
        if (Input.pressed('jump') || st > 2 || local.moving || r !== defuser(st)) {
          exitFocus();
          return null;
        }
        const f = st - 1;
        const m = x.mods[f][local.focus];
        if (m.solved) {
          if (local.solvedAt < 0) local.solvedAt = t;
          if (t - local.solvedAt > 1.2) {
            exitFocus();
            return null;
          }
        } else local.solvedAt = -1;
        return moduleUI(c, m, f, local.focus);
      }
      // ---- reading the manual ----
      if (local.read) {
        const k = expertBook(st, r);
        if (!k || Input.pressed('jump') || (Input.pressed('interact') && !local.skipE)) {
          exitFocus();
          return null;
        }
        if (!Input.held('interact')) local.skipE = false;
        const a = arrow();
        const n = C5.PAGES[k].length;
        if (a === 'r' && local.spread < n - 1) {
          local.spread++;
          C5.flip(k, 1);
          Sound.play('flip');
        }
        if (a === 'l' && local.spread > 0) {
          local.spread--;
          C5.flip(k, -1);
          Sound.play('flip');
        }
        return ['Flèches', 'Tourner les pages (' + (local.spread + 1) + ' / ' + n + ') · Espace : refermer'];
      }
      // ---- walking around ----
      if (st === 1 && r === 'dame' && x.seal1) HUD.objective(TXT.s1.dame);
      if (st <= 2 && r === defuser(st) && !local.moving && C5.nearBomb(q, L.bombZ)) {
        const i = C5.slotOf(q);
        const m = x.mods[st - 1][i];
        if (Input.pressed('interact')) {
          local.focus = i;
          local.sel = 0;
          local.skipE = true;
          local.lastMove.d = 'x';
          Player.mode = 'frozen';
          Player.body.v.set(0, 0, 0);
        }
        return ['E', 'Examiner ' + MOD_TITLE[m.k] + (m.solved ? ' (désamorcé)' : '')];
      }
      const bk = expertBook(st, r);
      if (bk && C5.nearLectern(q, bk)) {
        if (Input.pressed('interact')) {
          local.read = true;
          local.skipE = true;
          local.lastMove.d = 'x';
          Player.mode = 'frozen';
          Player.body.v.set(0, 0, 0);
          once('read', TXT.readHint, 3000);
        }
        return ['E', 'Lire le manuel'];
      }
      if (st === 2 && r === 'dame') {
        const v = C5.nearValve(q);
        if (v >= 0) {
          if (Input.held('interact')) {
            local.ventI = v;
            local.ventT += dt;
            if (local.ventT > 1.2) {
              local.ventT = 0;
              local.ventI = -1;
              local.press[v] = 0;
              Sound.play('trap');
              C5.steam(v);
              c.act({ a: 'vent', i: v });
            }
          } else {
            local.ventI = -1;
            local.ventT = 0;
          }
          return ['E', 'Purger la vanne ' + (v + 1) + ' (maintenir)', local.ventI === v];
        }
        local.ventI = -1;
        local.ventT = 0;
      }
      if (st === 3 && C5.nearKey(q, r)) {
        if (Input.pressed('interact')) {
          local.turned[r] = 0.7;
          c.act({ a: 'turn' });
        }
        return ['E', 'Tourner ta clé (ton chiffre : ' + (x.fin ? x.fin.dig[r] : '?') + ')'];
      }
      return null;
    },
  });
})();
