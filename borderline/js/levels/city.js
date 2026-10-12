(() => {
  const T = CONFIG;
  const seen = new Set();
  // one épreuve = one card, in the order of js/game/trials.js (numbers first, then faces)
  const PLACES = ['cafe', 'message', 'banc', 'pluie', 'kino', 'etoiles', 'chanson'];
  const LAST_PLACE = 'danse';
  const SUIT_COL = { h: '#ff5f8a', s: '#b9a6ff', d: '#ff9a3a', c: '#7ce0ff' };
  const colorOf = (t) => (t.card.length && SUIT_COL[t.card[0]]) || '#ffcf8a';
  const labelOf = (t) => Cards.label(t.card);
  const done = (c) => c.S.done || [];
  const nextTrial = (c) => Trials.next(done(c));
  // the memory that the last épreuve brought back (one per épreuve for the first ones)
  const placeNow = (c) => (nextTrial(c) ? PLACES[done(c).length - 1] : LAST_PLACE);
  // every built épreuve gets a door: the old ones keep theirs, the new ones take a free facade
  const doorOf = (t) => {
    if (t.door) return t.door;
    const k = Trials.list.filter((x) => !x.door).indexOf(t);
    City.addDoor(t.id, k, labelOf(t), t.title.toUpperCase(), colorOf(t));
    return t.id;
  };

  Clues.add('c1', V3(-45, 1.1, 77));

  const cityBase = (c) => {
    c.fog(0.0085);
    Player.killY = -40;
    Player.targets = null;
    Player.checkpoint = () => City.hubSpawn[c.role];
    City.mood({});
    Sound.mood('calm');
    PLACES.slice(0, Math.max(0, done(c).length - 1)).forEach((id) => City.showPlace(id, true));
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
    const place = placeNow(c);
    const t = nextTrial(c);
    if (place && !seen.has(place)) return t ? T.city.memory : T.city.memoryLast;
    if (t)
      return (
        T.city.doors[t.id] ||
        T.city.doorNew.replace('{card}', labelOf(t)).replace('{title}', t.title)
      );
    return '';
  };
  const lightDoors = (c) => {
    const t = nextTrial(c);
    const id = t && doorOf(t);
    Object.keys(City.doors).forEach((k) => City.door(k, k === id ? 1 : 0.15));
  };
  const visa = () => {
    const n = Cards.count(Cards.IDS);
    HUD.visa('Visa · 3 jours · ' + (n ? n + (n > 1 ? ' cartes' : ' carte') : 'aucune carte'));
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
      lightDoors(c);
      const place = placeNow(c);
      if (place) {
        City.showPlace(place, first);
        City.pillar(place, !seen.has(place));
      }
      const t = nextTrial(c);
      visa();
      if (t) BigScreen.show(labelOf(t), t.title, colorOf(t));
      else BigScreen.show(Cards.count(Cards.IDS) + ' / 52', 'Le dernier souvenir', '#ff5f8a');
      HUD.objective(objective(c));
      if (fromAct && !first) {
        await sleep(400);
        fadeTo(false);
        Sound.play('reveal');
        if (place) HUD.say(T.city.memoryLine, T.master);
      }
      if (!c.local.tuto) {
        c.local.tuto = true;
        setTimeout(() => HUD.say(T.deck.tuto, T.master, 3800), fromAct ? 6000 : 2500);
      }
    },
    apply(c) {
      HUD.objective(objective(c));
      lightDoors(c);
      visa();
      const place = placeNow(c);
      if (place && seen.has(place)) City.pillar(place, false);
    },
    host(c, dt) {
      const t = nextTrial(c);
      if (t) {
        const e = City.doors[doorOf(t)].entry;
        if (c.near(c.pos('dame'), e, 4.5) && c.near(c.pos('valet'), e, 4.5)) c.goto(t.phase);
      } else if (c.S.seen.includes(LAST_PLACE)) {
        // every épreuve before the golden hour is done: the last memory, then the roof
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
      const place = placeNow(c);
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
      const tr = Trials.byId[c.S.x.card];
      const id = tr ? tr.card : 'J';
      // the old épreuves have their card text in config.js, the new ones register it at load
      const k = T.cards[c.S.x.card] || {
        corner: Cards.label(id).replace(' ', '\n'),
        big: Cards.label(id).split(' ')[1] || '',
        title: tr ? tr.title : '',
        sub: (tr && tr.face ? 'Figure' : 'Épreuve') + ' · réussie',
        lines: [],
      };
      HUD.card(k.corner, k.big, k.title, k.sub);
      await sleep(2600);
      for (const l of k.lines) {
        if (Story.S.phase !== 'reward') return;
        HUD.say(l, T.master, 1400);
      }
      HUD.say(Cards.count(Cards.IDS) + ' cartes sur 52.', T.master, 1600);
    },
    exit() {
      HUD.hideCard();
      Player.mode = 'walk';
    },
    host(c) {
      Cards.award(c, Cards.rewardOf(c.S.x.card));
      const id = c.S.x.card;
      if (c.phaseT > 9.5)
        c.goto('city', (s) => {
          s.done = [...new Set([...(s.done || []), id])];
          s.chapter = s.done.length;
        });
    },
  });
})();
