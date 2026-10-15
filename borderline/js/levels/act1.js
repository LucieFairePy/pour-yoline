(() => {
  const T = CONFIG;
  const A = T.act1;
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('h10');
  const local = { stage: 0, cab: null, held: false, left: 0, both: false, heart: 0, hp: V3(), fell: {}, crank: false };
  // reused every frame
  const qd = V3();
  const qv = V3();
  const q = V3();
  const tm = { release: 0, inside: 0, cab: 0, h: 0, sync: 0 };
  const showLeft = (n) => {
    const sub = A.cabins.countdown + ' ' + n + ' s';
    Arena.screen.show('Un seul sortira', sub, '#ff2a3a');
    Arena.cabShow(n + ' s', 'Un seul sortira', '#ff2a3a');
  };

  const stageEnter = (c, st) => {
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(
        r === 'dame'
          ? A.bridge.dame + ' ' + A.bridge.dame2
          : A.bridge.valet + ' ' + A.bridge.valet2,
      );
      Arena.screen.show('Les ponts', 'Ce que l’un ne voit pas, l’autre le voit', '#ff5f8a');
    }
    if (st === 2) {
      HUD.objective(r === 'dame' ? A.winch.dame : A.winch.valet);
      Arena.screen.show('Le treuil', 'Tiens-le. Ne lâche pas.', '#ff5f8a');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(
        r === 'dame'
          ? A.winch.grapple + ' Les anneaux ne tiennent que tant que {mate} tourne la manivelle.'
          : 'Tiens la manivelle (maintiens E) : elle allume les anneaux de {mate}. Ne lâche pas avant qu’{il} arrive.',
      );
      if (r === 'valet') c.spawn(Arena.spawn(3, 'valet'), 0);
      Arena.screen.show('Le grappin', 'Vise les anneaux · F', '#ff5f8a');
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(A.cabins.enter);
      Arena.screen.show('Les cabines', A.cabins.enter, '#ff5f8a');
      Arena.cabShow('Entre', 'Attends l’autre', '#ff5f8a');
      Sound.play('reveal');
    }
  };

  const cabEnter = (c, k) => {
    const C = A.cabins;
    if (k.phase === 'run') {
      Sound.play('door');
      Sound.mood('tense');
      HUD.say(C.rule, T.master, 2500);
      HUD.objective(C.rule);
      showLeft(20);
    }
    if (k.phase === 'fail') {
      Sound.play('door');
      Sound.mood('calm');
      HUD.danger(0);
      // the same light line on both screens: nobody is named, nothing is kept
      const msg = k.both ? C.failBoth : C.failOne;
      HUD.say(msg, T.master, 2600);
      Arena.screen.show(C.failTitle, msg, '#ff5f8a');
      Arena.cabShow(C.failCab, '', '#ff5f8a');
      const hint = (k.fails || 1) > 1 && C.hints[Math.min((k.fails || 1) - 2, C.hints.length - 1)];
      if (hint) HUD.say(hint, T.master, 3200);
    }
    if (k.phase === 'open' && local.cab && local.cab !== 'open') {
      HUD.objective(C.enter);
      Arena.screen.show('Les cabines', C.enter, '#ff5f8a');
      Arena.cabShow('Entre', 'Attends l’autre', '#ff5f8a');
    }
    if (k.phase === 'win') {
      Sound.play('door');
      Sound.mood('calm');
      HUD.danger(0);
      HUD.say(C.win, T.master, 2500);
      HUD.say(C.note, T.master, 2200);
      Arena.screen.show(CARD, C.win, '#ff5f8a');
      Arena.cabShow('♥', C.winCab, '#ff5f8a');
      HUD.objective('Allez chercher la carte, ensemble.');
      Sound.play('reveal');
    }
  };

  const cab0 = () => ({ phase: 'open', t: 0, who: null, y: 0, fails: 0 });

  Story.register('act1', {
    init: () => ({ stage: 1, hold: false, att: false, lit: false, gen: { valet: 0, dame: 0 }, h: { t: 0 }, cab: cab0() }),
    voice: () => 1,
    net: {
      left: (c, n) => !Net.isHost && Arena.built && showLeft(n),
      h: (c, h) => {
        if (!Net.isHost && c.S.x) c.S.x.h = h;
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Arena.build(c.role, c.S.seed);
      local.stage = 0;
      local.cab = null;
      const sp = Arena.spawn(c.S.x.stage, c.role);
      c.spawn(sp, 0);
      Player.killY = Arena.O.y - 25;
      Player.checkpoint = () => Arena.spawn(Story.S.x.stage, c.role);
      Player.targets = () =>
        c.role === 'dame' && Story.S.x.stage === 3 && Story.S.x.lit ? Arena.rings.map((r) => r.pos) : [];
      c.fog(0.006);
      Arena.screen.show(CARD, A.title, '#ff5f8a');
      HUD.visa(CARD + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro);
      this.apply(c);
    },
    exit() {
      HUD.danger(0);
      Player.targets = null;
    },
    apply(c) {
      if (!Arena.built) return;
      const x = c.S.x;
      const g = x.gen || {};
      const dealt = ['valet', 'dame'].filter((w) => Arena.setLane(w, g[w] || 0));
      if (dealt.length && local.stage === 1 && x.stage === 1) {
        Sound.play('creak');
        HUD.say(dealt[0] === c.role ? 'Tu es tombé{e} : ton pont de verre a changé. Écoute {mate}.' : 'Le pont de {mate} a changé. Guide-{le} à nouveau.', T.master, 2600);
      }
      if (x.stage !== local.stage && x.stage <= 4) stageEnter(c, x.stage);
      if (x.cab.phase !== local.cab) {
        local.both = !!x.cab.both;
        cabEnter(c, x.cab);
        local.cab = x.cab.phase;
      }
      if (x.cab.phase === 'fail' && x.cab.both && !local.both) {
        local.both = true;
        HUD.say(A.cabins.failBoth, T.master, 2600);
        Arena.screen.show('Raté', A.cabins.failBoth, '#ff2a3a');
      }
    },
    host(c, dt) {
      if (!Arena.built) return;
      const x = c.S.x;
      Arena.rel(c.pos('dame'), qd);
      Arena.rel(c.pos('valet'), qv);
      if (x.stage === 1 && Arena.onB(qd) && Arena.onB(qv)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 1)
        [['dame', qd], ['valet', qv]].forEach(([w, qq]) => {
          // a fall from the glass deals that bridge again (once per fall)
          if (qq.y < -4 && qq.z > 11 && qq.z < 43 && !local.fell[w]) {
            local.fell[w] = true;
            c.set((s) => {
              s.x.gen = s.x.gen || { valet: 0, dame: 0 };
              s.x.gen[w] = (s.x.gen[w] || 0) + 1;
            });
          }
          if (qq.y > -1) local.fell[w] = false;
        });
      if (x.stage === 2) {
        if (x.att) {
          if (x.hold && Arena.nearWinch(qd)) {
            x.h.t = Math.min(1, x.h.t + dt * 0.105);
            tm.release = 0;
          } else {
            tm.release += dt;
            if (tm.release > 2.5) x.h.t = Math.max(0, x.h.t - dt * 0.035);
          }
          if (x.h.t >= 1)
            c.set((s) => {
              s.x.att = false;
              s.x.hold = false;
              s.x.stage = 3;
            });
        }
        // stream the harness position only while it moves (15 Hz)
        tm.h += dt;
        if (tm.h > 1 / 15 && x.h.t !== local.sentH) {
          tm.h = 0;
          local.sentH = x.h.t;
          c.send('h', x.h);
        }
      }
      if (x.stage === 3 && Arena.onC(qd)) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4) {
        const k = x.cab;
        if (k.phase === 'open') {
          if (Arena.inCabin(qd, 'dame') && Arena.inCabin(qv, 'valet')) {
            tm.inside += dt;
            if (tm.inside > 2)
              c.set((s) => {
                s.x.cab = { phase: 'run', t: 0, who: null, y: 0, fails: k.fails || 0 };
                tm.cab = 0;
              });
          } else tm.inside = 0;
        } else if (k.phase === 'run') {
          k.t += dt;
          const left = Math.ceil(20 - k.t);
          if (left > 0 && left !== local.left) {
            local.left = left;
            c.send('left', left);
            showLeft(left);
          }
          tm.sync += dt;
          if (tm.sync > 0.5) {
            tm.sync = 0;
            c.touch();
          }
          if (k.t >= 22.5) c.set((s) => (s.x.cab = { phase: 'win', t: 0, who: null, y: 0 }));
        } else if (k.phase === 'fail') {
          tm.cab += dt;
          if (tm.cab > 4.5)
            c.set((s) => {
              s.x.cab = { phase: 'open', t: 0, who: null, y: 0, fails: k.fails };
              tm.inside = 0;
            });
        } else if (k.phase === 'win' && Arena.nearCard(qd) && Arena.nearCard(qv))
          c.goto('reward', (s) => (s.x.card = 'h10'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'winch' && who === 'dame' && x.stage === 2) c.set((s) => (s.x.hold = !!d.on));
      if (d.a === 'lit' && who === 'valet' && x.stage === 3 && !!d.on !== !!x.lit) c.set((s) => (s.x.lit = !!d.on));
      if (d.a === 'attach' && who === 'valet' && x.stage === 2 && !x.att)
        c.set((s) => (s.x.att = true));
      if (
        d.a === 'button' &&
        x.stage === 4 &&
        x.cab.phase === 'fail' &&
        x.cab.who !== who &&
        tm.cab < 1.5
      )
        c.set((s) => (s.x.cab.both = true));
      if (d.a === 'button' && x.stage === 4 && x.cab.phase === 'run')
        c.set((s) => {
          s.x.cab = {
            phase: 'fail',
            t: 0,
            who,
            both: false,
            fails: (s.x.cab.fails || 0) + 1,
            y: Arena.ceilingFor(who === 'dame' ? 'valet' : 'dame'),
          };
          tm.cab = 0;
        });
    },
    update(c, dt, t) {
      if (!Arena.built) return null;
      const x = c.S.x;
      Arena.update(dt, t, { a: x, h: x.h });
      Arena.rel(Player.body.p, q);
      const r = c.role;
      let prompt = null;
      if (x.stage === 2) {
        if (r === 'dame' && Arena.nearWinch(q)) {
          const held = Input.held('interact');
          prompt = ['E', held ? 'Tiens bon…' : 'Tenir le treuil (maintenir)', true];
          if (held !== local.held) {
            local.held = held;
            c.act({ a: 'winch', on: held });
          }
          if (held && x.att && Math.random() < dt * 2) Sound.play('creak');
        } else if (local.held) {
          local.held = false;
          c.act({ a: 'winch', on: false });
        }
        if (r === 'valet' && !x.att && Arena.nearHarness(q)) {
          prompt = ['E', 'S’accrocher au harnais'];
          if (Input.pressed('interact')) c.act({ a: 'attach' });
        }
        if (r === 'valet' && x.att) {
          const hp = Arena.harnessPos(x.h.t, local.hp);
          Player.mode = 'hang';
          if (!Player.hangPos) Player.hangPos = V3();
          Player.hangPos.set(hp.x + Math.sin(t * 1.3) * 0.15, hp.y - 2.45, hp.z);
        }
      }
      // the rings' crank (stage 3): held by the one already across
      const cranking = x.stage === 3 && r === 'valet' && Arena.nearCrank(q) && Input.held('interact');
      if (cranking !== local.crank) {
        local.crank = cranking;
        c.act({ a: 'lit', on: cranking });
      }
      if (x.stage === 3 && r === 'valet' && Arena.nearCrank(q))
        prompt = ['E', cranking ? 'Tiens bon…' : 'Tourner la manivelle des anneaux (maintenir)', true];
      if (x.stage === 4) {
        const k = x.cab;
        if (
          k.phase === 'fail' &&
          k.who !== r &&
          !k.both &&
          Arena.nearButton(q, r) &&
          Input.pressed('interact')
        )
          c.act({ a: 'button' });
        if (k.phase === 'run') {
          if (Arena.nearButton(q, r)) {
            prompt = ['E', 'Me sauver'];
            if (Input.pressed('interact')) c.act({ a: 'button' });
          }
          const kk = clamp(k.t / 20, 0, 1);
          HUD.danger(0.2 + kk * 0.6);
          Cam.shake = Math.max(Cam.shake, 0.02 + kk * 0.05);
          local.heart -= dt;
          if (local.heart <= 0) {
            local.heart = lerp(1.1, 0.42, kk);
            Sound.play('heart', 0.6 + kk * 0.6);
            if (Math.random() < 0.5) Sound.play('rumble', 0.5 + kk);
          }
          if (!Net.isHost) k.t += dt;
        }
      }
      return prompt;
    },
  });
})();
