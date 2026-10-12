(() => {
  const T = CONFIG;
  const seen = new Set();
  const DOOR_BY_CHAPTER = { 0: 'h10', 1: 'c4', 2: 'sK', 3: 'd9' };
  const PLACE_BY_CHAPTER = { 1: 'cafe', 2: 'banc', 3: 'kino', 4: 'danse' };
  const ACT_BY_DOOR = { h10: 'act1', c4: 'act2', sK: 'garde', d9: 'portes' };

  Clues.add('c1', V3(-45, 1.1, 77));

  const cityBase = (c) => {
    c.fog(0.0085);
    Player.killY = -40;
    Player.targets = null;
    Player.checkpoint = () => City.hubSpawn[c.role];
    City.mood({});
    Sound.mood('calm');
    for (let ch = 1; ch < c.S.chapter; ch++)
      if (PLACE_BY_CHAPTER[ch]) City.showPlace(PLACE_BY_CHAPTER[ch], true);
  };

  Story.register('prologue', {
    partner: () => false,
    enter(c, first) {
      cityBase(c);
      if (first) {
        const sp = City.spawns[c.role];
        c.spawn(sp, Math.atan2(-sp.x, -sp.z));
      }
      Player.checkpoint = () => City.spawns[c.role];
      HUD.objective(T.prologue.objective);
      HUD.visa('Visa · 3 jours');
      BigScreen.show('?', 'BORDERLINE');
    },
    host(c) {
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      if (c.phaseT > 2 && Remote.fresh && c.near(pd, pv, 5)) c.goto('welcome');
    },
    update(c, dt) {
      if (!Remote.has) return null;
      c.local.beacon = (c.local.beacon ?? 1.5) - dt;
      if (c.local.beacon <= 0) {
        c.local.beacon = 2.8;
        Sound.play('beacon', Remote.pos.clone().add(V3(0, 1.6, 0)), c.role);
      }
      return null;
    },
  });

  Story.register('welcome', {
    async enter(c) {
      HUD.objective('');
      Cam.focus = City.screenPos;
      Sound.play('screen');
      Sound.play('reveal');
      const lines = T.prologue.welcome;
      for (let i = 0; i < lines.length; i++) {
        if (Story.S.phase !== 'welcome') return;
        BigScreen.show(
          lines[i],
          i === 1 ? 'Joueurs : 2' : 'BORDERLINE',
          i === 3 ? '#ff5f8a' : undefined,
        );
        HUD.say(lines[i]);
        await sleep(3200);
      }
      if (Story.S.phase !== 'welcome') return;
      Cam.focus = null;
      HUD.say(T.prologue.abilities[c.role], T.master, 2600);
    },
    host(c) {
      if (c.phaseT > 15.5) c.goto('city');
    },
  });

  const objective = (c) => {
    const ch = c.S.chapter;
    const place = PLACE_BY_CHAPTER[ch];
    if (place && !seen.has(place))
      return [null, T.city.memory1, T.city.memory2, T.city.memory3, T.city.memory4][ch];
    if (DOOR_BY_CHAPTER[ch]) return [T.city.door1, T.city.door2, T.city.door3, T.city.door4][ch];
    return '';
  };

  Story.register('city', {
    async enter(c, first, prev) {
      HUD.hideCard();
      c.S.seen.forEach((id) => seen.add(id));
      c.local.banc = 0;
      const fromAct = prev && prev !== 'welcome' && prev !== 'prologue';
      if (fromAct && !first) await fadeTo(true);
      cityBase(c);
      if (first || fromAct) {
        const sp = City.hubSpawn[c.role];
        c.spawn(sp, Math.PI);
      }
      const ch = c.S.chapter;
      Object.keys(City.doors).forEach((id) => City.door(id, id === DOOR_BY_CHAPTER[ch] ? 1 : 0.15));
      const place = PLACE_BY_CHAPTER[ch];
      if (place) {
        City.showPlace(place, first);
        City.pillar(place, !seen.has(place));
      }
      const cards =
        ['', '♥ 10', '♥ 10 · ♣ 4', '♥ 10 · ♣ 4 · ♠ R', '♥ 10 · ♣ 4 · ♠ R · ♦ 9'][ch] ||
        '';
      HUD.visa('Visa · 3 jours' + (cards ? ' · ' + cards : ''));
      BigScreen.show(
        { h10: '♥ 10', c4: '♣ 4', sK: '♠ R' }[DOOR_BY_CHAPTER[ch]] || cards || '?',
        DOOR_BY_CHAPTER[ch] ? 'Une porte s’est allumée' : 'Carte obtenue',
        { c4: '#7ce0ff', sK: '#ffcf8a' }[DOOR_BY_CHAPTER[ch]] || '#ff5f8a',
      );
      HUD.objective(objective(c));
      if (fromAct && !first) {
        await sleep(400);
        fadeTo(false);
        Sound.play('reveal');
        if (place) HUD.say(T.city.memoryLine, T.master);
      }
    },
    apply(c) {
      HUD.objective(objective(c));
      const place = PLACE_BY_CHAPTER[c.S.chapter];
      if (place && seen.has(place)) City.pillar(place, false);
    },
    host(c, dt) {
      const ch = c.S.chapter;
      const id = DOOR_BY_CHAPTER[ch];
      if (id) {
        const e = City.doors[id].entry;
        if (c.near(c.pos('dame'), e, 4.5) && c.near(c.pos('valet'), e, 4.5))
          c.goto(ACT_BY_DOOR[id]);
      }
      if (ch === 4 && c.S.seen.includes('danse')) {
        c.local.banc = (c.local.banc || 0) + dt;
        const both = (c.S.x.seenBy || []).length >= 2;
        if ((both && c.local.banc > 4) || c.local.banc > 30) c.goto('act3');
      }
    },
    action(c, who, d) {
      if (d.a === 'seen' && !(c.S.x.seenBy || []).includes(who))
        c.set((s) => (s.x.seenBy = [...(s.x.seenBy || []), who]));
    },
    update(c) {
      const p = Player.body.p;
      const place = PLACE_BY_CHAPTER[c.S.chapter];
      if (
        place &&
        City.places[place].shown &&
        !seen.has(place) &&
        c.near(p, City.places[place].entry, 4)
      ) {
        if (Input.pressed('interact')) {
          seen.add(place);
          const pl = T.places.find((x) => x.id === place);
          c.act({ a: 'seen', id: place });
          City.pillar(place, false);
          HUD.objective(objective(c));
          HUD.memory(pl.tag, pl.name, pl.text);
        }
        return ['E', 'Regarder'];
      }
      return Benches.update(c);
    },
  });

  Story.register('reward', {
    async enter(c) {
      HUD.objective('');
      Sound.mood('calm');
      Sound.play('card');
      Player.mode = 'frozen';
      const k = T.cards[c.S.x.card];
      HUD.card(k.corner, k.big, k.title, k.sub);
      await sleep(2600);
      for (const l of k.lines) {
        if (Story.S.phase !== 'reward') return;
        HUD.say(l, T.master, 1400);
      }
    },
    exit() {
      HUD.hideCard();
      Player.mode = 'walk';
    },
    host(c) {
      if (c.phaseT > 9.5) c.goto('city', (s) => (s.chapter += 1));
    },
  });
})();
