(() => {
  const T = CONFIG;
  const seen = new Set();
  const ORDER = ['h10', 's3', 'c4', 's7', 'sK', 'd9', 'h2', 'cR'];
  const DOOR_BY_CHAPTER = Object.fromEntries(ORDER.map((id, i) => [i, id]));
  const PLACES = ['cafe', 'message', 'banc', 'pluie', 'kino', 'etoiles', 'chanson', 'danse'];
  const PLACE_BY_CHAPTER = Object.fromEntries(PLACES.map((id, i) => [i + 1, id]));
  const LAST = ORDER.length;
  const ACT_BY_DOOR = {
    h10: 'act1',
    s3: 'soleil',
    c4: 'act2',
    s7: 'donjon',
    sK: 'garde',
    d9: 'portes',
    h2: 'balade',
    cR: 'raid',
  };
  const LABEL = {
    h10: '♥ 10',
    s3: '♠ 3',
    c4: '♣ 4',
    s7: '♠ 7',
    sK: '♠ R',
    d9: '♦ 9',
    h2: '♥ 2',
    cR: '♣ R',
  };
  const COLOR = {
    h10: '#ff5f8a',
    s3: '#ff9ec4',
    c4: '#7ce0ff',
    s7: '#b9a6ff',
    sK: '#ffcf8a',
    d9: '#ff9a3a',
    h2: '#ffb3c7',
    cR: '#7cf0c8',
  };
  const cardsWon = (ch) =>
    ORDER.slice(0, ch)
      .map((id) => LABEL[id])
      .join(' · ');

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
    if (place && !seen.has(place)) return ch === LAST ? T.city.memoryLast : T.city.memory;
    if (DOOR_BY_CHAPTER[ch]) return T.city.doors[DOOR_BY_CHAPTER[ch]];
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
      const door = DOOR_BY_CHAPTER[ch];
      HUD.visa('Visa · 3 jours · ' + (ch ? ch + (ch > 1 ? ' cartes' : ' carte') : 'aucune carte'));
      BigScreen.show(
        door ? LABEL[door] : cardsWon(ch) || '?',
        door ? 'Une porte s’est allumée' : 'Toutes les cartes du jeu',
        door ? COLOR[door] : '#ff5f8a',
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
      Object.keys(City.doors).forEach((id) =>
        City.door(id, id === DOOR_BY_CHAPTER[c.S.chapter] ? 1 : 0.15),
      );
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
      if (ch === LAST && c.S.seen.includes(PLACE_BY_CHAPTER[LAST])) {
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
