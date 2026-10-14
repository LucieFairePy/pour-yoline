(() => {
  const T = CONFIG;
  const F = T.final;
  const TOTAL = Object.keys(T.clues).length;
  const local = { step: null, letter: false, float: 0, credits: false, inside: -1 };
  const tm = { step: 0, ring: 0 };

  const allClues = () => Story.S.clues.length >= TOTAL;

  Story.register('final', {
    init: () => ({ step: 'joker', done: [] }),
    voice: () => 1,
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Finale.build();
      c.spawn(Finale.spawn(c.role), 0);
      Player.killY = Finale.O.y - 25;
      Player.checkpoint = () => Finale.spawn(c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.008);
      Sound.mood('tense');
      HUD.visa(Cards.tag('h1') + ' · ' + F.title);
      Finale.screen.show(F.place, F.title, '#ff5f8a');
      local.step = null;
      local.inside = -1;
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      this.apply(c);
    },
    async apply(c) {
      const x = c.S.x;
      if (x.step === local.step) return;
      if (local.step === 'letter') HUD.closeLetter();
      local.step = x.step;
      if (x.step === 'joker') {
        HUD.say(F.joker, T.joker, 2600);
        HUD.objective(F.approach);
      }
      if (x.step === 'broken') {
        Finale.breakJoker();
        HUD.objective('');
        HUD.say(F.broken, T.master, 2600);
        Sound.mood('gold');
      }
      if (x.step === 'reveal') {
        Cam.focus = Finale.P(0, 9, 16);
        for (const l of F.reveal) {
          if (Story.S.x.step !== 'reveal') break;
          Finale.screen.show(l, F.signature, '#ffcf8a');
          HUD.say(l, T.master, 2400);
          await sleep(3300);
        }
        Cam.focus = null;
      }
      if (x.step === 'letter' && !local.letter) {
        local.letter = true;
        Player.mode = 'frozen';
        await HUD.letter(F.letter, F.signature);
        if (Story.S.phase === 'final') Player.mode = 'walk';
        c.act({ a: 'letter' });
      }
      if (x.step === 'visa') {
        Sound.play('card');
        Finale.screen.show(F.visa, 'BORDERLINE', '#ff5f8a');
        HUD.visa(F.visa);
        HUD.say(F.visa, T.master, 3000);
        HUD.say(F.last, T.master, 3500);
        for (let i = 0; i < 5; i++)
          setTimeout(
            () => Fx.firework(Finale.P((Math.random() - 0.5) * 30, 0, 10 + Math.random() * 10), 30),
            i * 700,
          );
      }
    },
    host(c, dt) {
      const x = c.S.x;
      tm.step += dt;
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      if (x.step === 'joker') {
        // both inside the glowing circle for a moment
        tm.ring = Finale.inRing(pd) && Finale.inRing(pv) ? tm.ring + dt : 0;
        if (tm.ring > 0.6) {
          c.set((s) => (s.x.step = 'broken'));
          tm.step = 0;
          tm.ring = 0;
        }
      }
      if (x.step === 'broken' && tm.step > 4) {
        c.set((s) => (s.x.step = 'reveal'));
        tm.step = 0;
      }
      if (x.step === 'reveal' && tm.step > F.reveal.length * 3.3 + 1) {
        c.set((s) => (s.x.step = 'letter'));
        tm.step = 0;
      }
      if (x.step === 'letter' && (x.done.length >= 2 || tm.step > 150)) {
        c.set((s) => (s.x.step = 'visa'));
        tm.step = 0;
      }
      // the Joker is always the last card: 52 cards found, one left without a colour
      if (x.step === 'visa' && tm.step > 8) c.goto('epilogue');
    },
    action(c, who, d) {
      if (d.a === 'letter' && !c.S.x.done.includes(who)) c.set((s) => s.x.done.push(who));
    },
    update(c, dt, t) {
      const x = c.S.x;
      const meIn = Finale.inRing(Player.body.p);
      const mateIn = Remote.has && Finale.inRing(Remote.pos);
      const inside = (meIn ? 1 : 0) + (mateIn ? 1 : 0);
      Finale.update(dt, t, x.step, inside);
      if (x.step === 'joker' && inside !== local.inside) {
        local.inside = inside;
        HUD.objective(
          inside === 2
            ? F.approach
            : meIn
              ? 'Tu es dans le cercle. Attends {mate}.'
              : mateIn
                ? '{mate} t’attend dans le cercle, au centre.'
                : F.approach,
        );
        if (inside > 0) Sound.play('chime');
      }
      return null;
    },
  });

  Story.register('epilogue', {
    init: () => ({ step: 0 }),
    async enter(c, first) {
      if (!first) await fadeTo(true);
      const b = City.roofBench;
      c.spawn(V3(b.pos.x + (c.role === 'dame' ? -1.5 : 1.5), b.pos.y, b.pos.z + 2.5), Math.PI);
      Player.killY = -40;
      Player.checkpoint = () => V3(b.pos.x, b.pos.y, b.pos.z + 2.5);
      City.setLift(City.TOWER.y + 0.05);
      City.mood({ gold: 1 });
      c.fog(0.006);
      Sound.mood('gold');
      HUD.visa('\u{1F0CF} · Le vrai Joker');
      local.float = 0;
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(T.epilogue.intro, T.master, 3200);
      HUD.objective(T.epilogue.sit);
    },
    async apply(c) {
      if (c.S.x.step >= 1 && !local.joker) {
        // the Joker speaks, then gives the Oui back
        local.joker = true;
        HUD.objective('');
        Cam.focus = V3(City.TOWER.x - 110, City.TOWER.y + 390, City.TOWER.z - 470);
        Sound.mood('tense');
        Sound.play('glitch');
        HUD.card('J', '\u{1F0CF}', T.joker, T.deck.toastJoker);
        await sleep(2400);
        HUD.hideCard();
        for (const l of T.epilogue.joker) {
          if (Story.S.phase !== 'epilogue') return;
          HUD.say(l, T.joker, 1500);
        }
        while (HUD.talking) await sleep(200);
        if (Story.S.phase !== 'epilogue') return;
        Sound.mood('gold');
        Sound.play('reveal');
        Sky.heart.U.uFill.value = 1;
        HUD.say(T.epilogue.back, T.master, 3000);
      }
      if (c.S.x.step >= 2 && !local.fw) {
        local.fw = true;
        for (let i = 0; i < 14; i++)
          setTimeout(
            () =>
              Fx.firework(
                V3(
                  City.TOWER.x + (Math.random() - 0.5) * 80,
                  0,
                  City.TOWER.z - 30 - Math.random() * 50,
                ),
                70,
              ),
            i * 600,
          );
      }
    },
    host(c, dt) {
      const x = c.S.x;
      const b = City.roofBench;
      const nearB = (p) => Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 2.2;
      const sitD = c.role === 'dame' ? Player.mode === 'sit' : c.remoteState().mode === 'sit';
      const sitV = c.role === 'valet' ? Player.mode === 'sit' : c.remoteState().mode === 'sit';
      if (x.step === 0 && sitD && sitV && nearB(c.pos('dame')) && nearB(c.pos('valet'))) {
        c.set((s) => (s.x.step = 1));
        tm.step = 0;
      }
      tm.step += dt;
      if (x.step === 1 && tm.step > 30) {
        c.set((s) => (s.x.step = 2));
        tm.step = 0;
      }
      if (x.step === 2 && tm.step > 8) c.goto('credits');
    },
    update(c, dt, t) {
      const x = c.S.x;
      Sky.galaxy.rotation.z += dt * (x.step >= 1 ? 0.15 : 0.02);
      if (x.step >= 2) {
        local.float += dt;
        Player.mode = 'hang';
        Player.hangPos = Player.body.p.clone().add(V3(0, dt * (1 + local.float * 0.6), 0));
        Player.handPose = true;
        Remote.handPose = true;
        return null;
      }
      return Benches.update(c);
    },
    exit() {
      Player.mode = 'walk';
      Player.hangPos = null;
    },
  });

  Story.register('credits', {
    partner: () => false,
    async enter(c) {
      Player.mode = 'frozen';
      HUD.objective('');
      Sound.mood('gold');
      HUD.credits(
        T.credits,
        allClues() ? null : F.missing + ' (' + Story.S.clues.length + '/' + TOTAL + ')',
      );
      // after the roll: the Joker card turns over
      await sleep(26000);
      if (Story.S.phase !== 'credits') return;
      Sound.play('glitch');
      const box = document.createElement('div');
      box.className = 'teaser';
      box.innerHTML =
        `<i style="background-image:url(${Cards.dataUrl('J')})"></i>` +
        T.epilogue.teaser.map((l) => `<p>${Icons.rich(l)}</p>`).join('') +
        `<h3>${Icons.rich(T.epilogue.sequel)}</h3>`;
      $('credits').querySelector('.credits-in').prepend(box);
    },
    update() {
      return null;
    },
  });
})();
