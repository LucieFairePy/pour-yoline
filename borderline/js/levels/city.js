(() => {
  const T = CONFIG;
  const seen = new Set();
  // one épreuve = one card, in the order of js/game/trials.js (world by world)
  const LAST_PLACE = 'danse';
  const SUIT_COL = { h: '#ff5f8a', s: '#b9a6ff', d: '#ff9a3a', c: '#7ce0ff' };
  const colorOf = (t) => (t.card.length && SUIT_COL[t.card[0]]) || '#ffcf8a';
  const labelOf = (t) => Cards.label(t.card);
  const done = (c) => c.S.done || [];
  const nextTrial = (c) => Trials.next(done(c));
  // one memory per world (js/game/lore.js), back once its last épreuve is done; the newest one
  // waits to be looked at, then the last memory comes once every épreuve is done
  const worldPlaces = (c) => Lore.completed(done(c)).map((w) => w.memory);
  const placeNow = (c) => {
    const newest = worldPlaces(c).pop();
    if (newest && !seen.has(newest)) return newest;
    return nextTrial(c) ? null : LAST_PLACE;
  };
  // every built épreuve gets a door: the old ones keep theirs, the new ones take a free facade
  const doorOf = (t) => {
    if (t.door) return t.door;
    const k = Trials.list.filter((x) => !x.door).indexOf(t);
    City.addDoor(t.id, k, labelOf(t), t.title.toUpperCase(), colorOf(t));
    return t.id;
  };
  // the old doors are built with the city: their signs follow the plan too
  Trials.list
    .filter((t) => t.door)
    .forEach((t) => City.relabel(t.door, Cards.tag(t.card), t.title.toUpperCase()));

  const cityBase = (c) => {
    c.fog(0.0085);
    Player.killY = -40;
    Player.targets = null;
    Player.checkpoint = () => City.hubSpawn[c.role];
    City.mood({});
    Sound.mood('calm');
    const now = placeNow(c);
    worldPlaces(c)
      .filter((id) => id !== now)
      .forEach((id) => City.showPlace(id, true));
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

  // ---------- the welcome: the big screen lights up, then the card box falls between you ----------
  // how long a line stays (typed, then held), so the screen and the subtitles never drift apart
  const lineMs = (s) => Array.from(s).length * 27 + 1300 + s.length * 22;
  const W_LINES = T.prologue.welcome;
  const BOX_AT = W_LINES.reduce((a, l) => a + lineMs(l[0]), 0) / 1000 + 0.6;
  const RESERVE_AT = BOX_AT + lineMs(T.prologue.box) / 1000 + 1.6;
  const WELCOME_END = RESERVE_AT + lineMs(T.prologue.reserveLine) / 1000 + 1.4;
  let box = null;
  // a small velvet box with a gold clasp; it lands on the cobbles and stays until the city
  const buildBox = () => {
    const g = new THREE.Group();
    const velvet = new THREE.MeshStandardMaterial({ color: 0x5a0f24, roughness: 0.92, metalness: 0 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.32, metalness: 0.85 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.24), velvet);
    base.position.y = 0.06;
    const lid = new THREE.Group();
    const lidM = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.25), velvet);
    lidM.position.set(0, 0.025, 0.125);
    lid.add(lidM);
    lid.position.set(0, 0.12, -0.125);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.352, 0.012, 0.252), gold);
    trim.position.y = 0.118;
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.012), gold);
    clasp.position.set(0, 0.12, 0.124);
    // a small heart stitched in gold on the lid
    const sh = new THREE.Shape();
    const k = 0.0042;
    for (let i = 0; i <= 40; i++) {
      const [x, y] = Heart.curve((i / 40) * TAU);
      if (i) sh.lineTo(x * k, y * k);
      else sh.moveTo(x * k, y * k);
    }
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(sh), gold);
    heart.rotation.x = -Math.PI / 2;
    lidM.add(heart);
    heart.position.set(0, 0.026, 0);
    g.add(base, lid, trim, clasp);
    g.traverse((m) => m.isMesh && (m.castShadow = true));
    g.userData.lid = lid;
    return g;
  };
  const dropBox = (c) => {
    if (!box) {
      box = buildBox();
      box.scale.setScalar(1.5);
      R.scene.add(box);
    }
    const a = c.pos(c.role);
    const b = Remote.has ? Remote.pos : a;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    // a step in front of the pair (toward the big screen), so neither of you hides it
    const side = V3(-(b.z - a.z), 0, b.x - a.x);
    if (side.lengthSq() < 0.01) side.set(0, 0, -1);
    side.normalize();
    if (side.dot(City.screenPos.clone().sub(mid)) < 0) side.negate();
    mid.addScaledVector(side, 3.2);
    mid.y = Phys.groundAt ? Phys.groundAt(mid.x, mid.y + 2, mid.z) : 0;
    box.userData.at = mid;
    box.userData.t = 0;
    box.userData.yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    box.userData.gone = 0;
    box.visible = true;
    // the camera aims a little beside it, so your own astronaut never hides it
    const me = Player.body.p;
    const to = V3(mid.x - me.x, 0, mid.z - me.z).normalize();
    Cam.focus = mid.clone().add(V3(-to.z, 0, to.x).multiplyScalar(2.4)).add(V3(0, 0.3, 0));
  };
  const boxTick = (dt) => {
    if (!box || !box.visible) return;
    const u = box.userData;
    u.t += dt;
    // falls softly, one small bounce, then the lid opens a little: empty
    const f = clamp(u.t / 1.1, 0, 1);
    const bounce = u.t > 1.1 ? Math.abs(Math.sin((u.t - 1.1) * 7)) * Math.exp(-(u.t - 1.1) * 6) * 0.12 : 0;
    box.position.set(u.at.x, u.at.y + (1 - f * f) * 6 + bounce, u.at.z);
    box.rotation.set(0, u.yaw + (1 - f) * 2.2, (1 - f) * 0.5);
    u.lid.rotation.x = -smooth(clamp((u.t - 2) / 1.2, 0, 1)) * 0.9;
    if (u.gone) {
      u.gone += dt;
      const k = clamp(u.gone / 0.7, 0, 1);
      box.scale.setScalar(1.5 * (1 - k));
      if (k >= 1) box.visible = false;
    }
  };
  // when the city opens, the box goes into your kit (the deck menu, P)
  const pocketBox = () => {
    if (!box || !box.visible || box.userData.gone) return;
    box.userData.gone = 0.001;
    Fx.burst(box.position.clone().add(V3(0, 0.3, 0)), '#ffcf8a', 30, 2.4, 0.5, 0);
    Sound.play('chime');
  };

  Story.register('welcome', {
    async enter(c) {
      HUD.objective('');
      Cam.focus = City.screenPos;
      Sound.play('screen');
      Sound.play('reveal');
      for (const [line, big, small, look] of W_LINES) {
        if (Story.S.phase !== 'welcome') return;
        BigScreen.show(big, small, look === 'sky' ? '#ff5f8a' : undefined);
        // the empty heart above the roofs, while he talks about it
        Cam.focus = look === 'sky' ? Player.body.p.clone().add(V3(-110, 390, -470)) : City.screenPos;
        HUD.say(line, T.master, lineMs(line) - Array.from(line).length * 27);
        await sleep(lineMs(line));
      }
      if (Story.S.phase !== 'welcome') return;
      Cam.focus = City.screenPos;
      await sleep(600);
      if (Story.S.phase !== 'welcome') return;
      dropBox(c);
      Sound.play('thud', box.userData.at);
      BigScreen.show(T.prologue.boxTitle, T.prologue.boxSub, '#ffcf8a');
      await sleep(1100);
      if (Story.S.phase !== 'welcome') return;
      HUD.say(T.prologue.box, T.master, lineMs(T.prologue.box) - Array.from(T.prologue.box).length * 27);
      await sleep(lineMs(T.prologue.box) + 500);
      if (Story.S.phase !== 'welcome') return;
      // the line on the visor lights up, then he notices it
      Cam.focus = null;
      HUD.reserve(T.prologue.reserve);
      Sound.play('chime');
      HUD.say(T.prologue.reserveLine, T.master, lineMs(T.prologue.reserveLine) - Array.from(T.prologue.reserveLine).length * 27);
      await sleep(lineMs(T.prologue.reserveLine));
      if (Story.S.phase !== 'welcome') return;
      HUD.say(T.prologue.abilities[c.role], T.master, 2600);
    },
    exit() {
      Cam.focus = null;
    },
    update(c, dt) {
      boxTick(dt);
      return null;
    },
    host(c) {
      if (c.phaseT > WELCOME_END) c.goto('city');
    },
  });

  const objective = (c) => {
    const place = placeNow(c);
    const t = nextTrial(c);
    if (place && !seen.has(place)) return t ? T.city.memory : T.city.memoryLast;
    if (t)
      return (T.city.doors[t.id] || T.city.doorNew.replace('{title}', t.title)).replace(
        '{card}',
        Cards.tag(t.card),
      );
    return '';
  };
  const lightDoors = (c) => {
    const t = nextTrial(c);
    const id = t && doorOf(t);
    Object.keys(City.doors).forEach((k) => City.door(k, k === id ? 1 : 0.15));
  };
  const visa = () => Lore.showVisa();

  Story.register('city', {
    async enter(c, first, prev) {
      HUD.hideCard();
      c.S.seen.forEach((id) => seen.add(id));
      c.local.banc = 0;
      const fromAct = prev && prev !== 'welcome' && prev !== 'prologue';
      if (fromAct && !first) await fadeTo(true);
      cityBase(c);
      if (prev === 'welcome') pocketBox();
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
        const both = (c.S.x.lastBy || []).length >= 2;
        if ((both && c.local.banc > 4) || c.local.banc > 30) c.goto('act3');
      }
    },
    action(c, who, d) {
      // only the last memory counts: the earlier ones looked at during this visit don't stand for it
      if (d.a === 'seen' && d.id === LAST_PLACE && !(c.S.x.lastBy || []).includes(who))
        c.set((s) => (s.x.lastBy = [...(s.x.lastBy || []), who]));
    },
    update(c, dt) {
      boxTick(dt);
      const p = Player.body.p;
      const place = placeNow(c);
      // a memory can come during the visit (the last one, once the one before is looked at)
      if (place && !City.places[place].shown) {
        City.showPlace(place, false);
        City.pillar(place, !seen.has(place));
      }
      // where to go: the memory to look at first, else the lit door. Always marked on screen;
      // G pings it (beam of light + ring + sound) for when you have lost your way.
      const t = nextTrial(c);
      let goal = null;
      let label = '';
      let col = '#ffcf8a';
      if (place && City.places[place].shown && !seen.has(place)) {
        goal = City.places[place].entry;
        label = 'SOUVENIR';
      } else if (t) {
        goal = City.doors[doorOf(t)].entry;
        label = 'PORTE ' + labelOf(t);
        col = colorOf(t);
      }
      const far = goal && Math.hypot(goal.x - p.x, goal.z - p.z);
      HUD.goal(goal, R.camera, !!goal && far > 6, goal ? label + ' · ' + Math.round(far) + ' m' : '');
      if (goal && Input.pressed('ping')) {
        City.ping(goal, col);
        HUD.pingGoal();
        Sound.play('beacon', goal.clone().add(V3(0, 1.6, 0)), c.role);
      }
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

  // ---------- the reward screen: the card, the detail that comes back, the words of the heart ----
  // (js/game/lore.js), then what the épreuve sets off. The last épreuve of a world also gives
  // the world's memory back, before its cinematic.
  const REWARD = { card: 0, detail: 2.8, words: 5.8, next: 8.8, memory: 10.4 };
  const rewardEnd = (id) => (Lore.reward(id) ? 14 : 11) + (Lore.finishes(id) && Lore.reward(id) ? 8.5 : 0);
  const memoryOf = (id) => {
    const w = Lore.finishes(id);
    return w && T.places.find((pl) => pl.id === w.memory);
  };
  Story.register('reward', {
    async enter(c) {
      HUD.objective('');
      Sound.mood('calm');
      Sound.play('card');
      Player.mode = 'frozen';
      const trial = c.S.x.card;
      const tr = Trials.byId[trial];
      const id = tr ? tr.card : 'J';
      // the old épreuves have their card text in config.js, the new ones register it at load;
      // the card itself always comes from the plan
      const k = T.cards[trial] || {
        title: tr ? tr.title : '',
        sub: (tr && tr.face ? 'Figure' : 'Épreuve') + ' · réussie',
        lines: [],
      };
      const [rank, suit] = Cards.label(id).split(' ');
      HUD.card(suit ? rank + '\n' + suit : rank, suit || '', k.title, k.sub, !!Lore.reward(trial));
      const still = () => Story.S && Story.S.phase === 'reward' && Story.S.x.card === trial;
      const at = async (sec) => {
        const wait = sec * 1000 - (performance.now() - t0);
        if (wait > 0) await sleep(wait);
        return still();
      };
      const t0 = performance.now();
      const R2 = Lore.reward(trial);
      if (!R2) {
        // an épreuve whose words are not written yet keeps its old lines
        await sleep(2600);
        for (const l of [...k.lines, Lore.next(trial)].filter(Boolean)) {
          if (!still()) return;
          HUD.say(l, T.master, 1400);
        }
        HUD.say(Cards.count(Cards.IDS) + ' cartes sur 52.', T.master, 1600);
        return;
      }
      if (!(await at(REWARD.detail))) return;
      HUD.cardDetail(R2.detail, T.heart.missing);
      Sound.play('chime');
      if (!(await at(REWARD.words))) return;
      HUD.cardWords(R2.words);
      Sound.play('reveal');
      if (!(await at(REWARD.next))) return;
      const mem = memoryOf(trial);
      const nx = Lore.next(trial);
      if (nx) HUD.say(nx, T.master);
      else if (!mem) HUD.say(Cards.count(Cards.IDS) + ' cartes sur 52.', T.master, 1600);
      if (!mem || !(await at(REWARD.memory))) return;
      // the world is finished: its memory comes back whole
      Sound.play('reveal');
      HUD.memoryFlash(mem);
    },
    exit() {
      HUD.hideCard();
      Player.mode = 'walk';
    },
    host(c) {
      const id = c.S.x.card;
      const tr = Trials.byId[id];
      // the card and the épreuve count at once (a reload during the screen never gives it twice)
      if (tr && (!(c.S.done || []).includes(id) || !Cards.has(tr.card)))
        c.set((s) => {
          s.done = [...new Set([...(s.done || []), id])];
          s.chapter = s.done.length;
          s.cards = [...new Set([...(s.cards || []), ...Cards.rewardOf(id)])];
          // a world finished: its memory is back, already looked at
          const w = Lore.finishes(id);
          if (w && Lore.reward(id) && !s.seen.includes(w.memory)) s.seen = [...s.seen, w.memory];
        });
      // an épreuve may be followed by a cinematic (js/cine/cut.js: Cut.after), then straight
      // into what comes next
      const cut = typeof Cut !== 'undefined' ? Cut.after(id) : null;
      if (c.phaseT > rewardEnd(id))
        c.goto(cut ? 'cut' : 'city', (s) => {
          if (!cut) return;
          const next = Trials.next(s.done);
          s.x.cut = cut;
          s.x.after = next ? next.phase : 'city';
        });
    },
  });
})();
