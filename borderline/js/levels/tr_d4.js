(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d4');
  const T = CONFIG;
  const TITLE = 'Le Code';
  const TXT = {
    intro: 'Épreuve de logique. La banque des Veilleurs : chaque code est coupé en deux. Une moitié pour chacun.',
    hint: {
      dame: 'Tes yeux voient l’encre invisible et les cibles cachées. Ton grappin (F) atteint ce qui est trop haut.',
      valet: 'Ton double saut atteint les corniches. Mais pour lire les codes, il te faudra la voix de {mate}.',
    },
    r1: {
      dame: 'La galerie des coffres · Quatre coffres, quatre codes cachés dans la salle. Ton coffre ♦ est sur le balcon : grappin (F).',
      valet: 'La galerie des coffres · Quatre coffres, quatre codes cachés dans la salle. Le coffre ♠ est sur la corniche : double saut.',
    },
    r1rule: 'Molette : E pour tourner. Maintiens E pour ouvrir. Un mauvais code change la combinaison du coffre.',
    r1clues: [
      'L’horloge s’est arrêtée sur l’heure du coffre ♥.',
      'Les tableaux ne montrent leur chiffre que vus du bon endroit.',
    ],
    inkHint: 'Sur le tapis, de l’encre invisible : un chiffre et un ♣. Toi seul{e} le vois.',
    anaS: 'Depuis ici, le tableau d’en face montre un chiffre ♠. C’est le code du coffre de {mate}.',
    anaD: 'Depuis ici, le tableau d’en face montre un chiffre ♦. C’est le code du coffre de {mate}.',
    wrong: 'Mauvais code. Le coffre change de combinaison : relisez son indice.',
    opened: { h: 'Le coffre ♥ s’ouvre.', d: 'Le coffre ♦ s’ouvre.', s: 'Le coffre ♠ s’ouvre.', c: 'Le coffre ♣ s’ouvre.' },
    r1done: 'Les quatre coffres sont ouverts. Chaque rouage porte un chiffre. La grille s’ouvre.',
    r2: {
      dame: 'La salle des lasers · Grappin vers la passerelle (F). Ton écran montre les lasers et l’ordre du code. Guide {mate}, puis valide au levier.',
      valet: 'La salle des lasers · Tu ne vois les lasers qu’un instant. {mate} les voit tous d’en haut : écoute-{le}. Au bout, le clavier.',
    },
    r2rule: 'Les couloirs s’appellent G, M, D. Un seul est ouvert par rangée, et il change toutes les deux secondes.',
    zapMe: 'Alarme ! Retour au début de la salle.',
    zapMate: 'Alarme : {mate} a touché un laser.',
    keypad: 'Le code : les chiffres des rouages, dans l’ordre que voit {mate}. Puis {mate} valide au levier.',
    keypadDame: 'Les chiffres sont sur les rouages, au-dessus de la grille. L’ordre est sur ton écran. Quand {mate} a tapé le code, tire le levier (E).',
    kpBad: 'Code refusé. Le clavier s’efface.',
    kpOk: 'Code accepté. La porte du caveau se réveille.',
    r3: {
      dame: 'La porte du caveau · Côté ♥, tes trois manivelles. Toi seul{e} vois les symboles à aligner sous la flèche. Dis à {mate} quelle couronne tourner.',
      valet: 'La porte du caveau · Côté ♠, tes trois manivelles. Une couronne ne tourne que si vous tournez la même manivelle en même temps.',
    },
    r3rule: 'Une couronne tourne d’un quart quand les deux manivelles du même numéro sont tournées ensemble. Comptez : trois, deux, un, top.',
    alarm: 'Alarme du verrou horaire ! Le rayon balaie le sol : sautez par-dessus.',
    swept: 'Le rayon t’a renversé{e}.',
    sweptMate: 'Le rayon a renversé {mate}.',
    timeout: 'Le verrou horaire se referme. Les couronnes se brouillent.',
    aligned: 'Les trois couronnes sont alignées. Les verrous sautent.',
    ringOk: ['Couronne I en place.', 'Couronne II en place.', 'Couronne III en place.'],
    card: 'Le caveau est ouvert. La carte ' + CARD + ' vous attend au fond. Ensemble.',
    pending: { L: 'Manivelle ♥ prête…', R: 'Manivelle ♠ prête…' },
  };
  CONFIG.cards.d4 = {
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'Chacun avait la moitié de chaque code.',
      'Le caveau ne s’ouvre qu’à deux mains, et deux voix.',
      'Les Veilleurs ne savent plus où cacher leurs secrets.',
    ],
  };
  const STEP_T = 2.0;
  const TL = 120;
  const ALARM_AT = 90;
  const SWEEP_EVERY = 7.5;
  const SWEEP_WARN = 1.6;
  const SWEEP_DUR = 3.6;
  const SYNC = 0.9;
  const LOCK_T = 4; // a safe stays shut that long after a wrong code
  // the safe on the balcony is the Dame's, the one on the ledge the Valet's; the floor ones are anyone's
  const SAFE_OF = { d: 'dame', s: 'valet' };
  // each side's cranks belong to whoever stands there (♥ Dame, ♠ Valet)
  const CRANK_OF = { L: 'dame', R: 'valet' };
  // per-run state, rebuilt on every enter()
  const fresh = () => ({
    stage: 0,
    hold: 0,
    holdS: null,
    L: { step: 0, frac: 0, zap: 0, lever: 0, kstate: '', sweepZ: null, warn: 0, anaS: false, anaD: false },
    stepT: 0,
    lockT: {},
    pend: {},
    tl: TL,
    sweepT: 0,
    sendT: 0,
    grace: 0,
    msgCd: {},
    tlShown: '',
  });
  const local = fresh();

  const rnd9 = () => 1 + ((Math.random() * 9) | 0);
  const scrambleRings = (target) => target.map((t) => (t + 1 + ((Math.random() * 3) | 0)) % 4);
  const once = (k, txt, hold = 3200) => {
    if (local.msgCd[k]) return;
    local.msgCd[k] = true;
    HUD.say(txt, T.master, hold);
  };

  const fx = (k, pos) => {
    if (k === 'good') Sound.play('rune', true);
    if (k === 'bad') Sound.play('rune', false);
    if (k === 'zap') {
      Sound.play('trap');
      Cam.shake = Math.max(Cam.shake, 0.25);
    }
    if (k === 'bolt') {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.4);
    }
    if (k === 'ring') Sound.play('lift');
    if (!pos) return;
    const p = V3(...pos);
    if (k === 'steam') D4.steam(p, 40);
    else Fx.burst(p, k === 'bad' || k === 'zap' ? '#ff3b55' : '#ffcf8a', k === 'zap' ? 40 : 26, 4, 0.5, 0);
  };
  const both = (c, k, pos) => {
    fx(k, pos);
    c.send('d4fx', [k, pos]);
  };
  const say = (c, txt, hold = 2400) => {
    HUD.say(txt, T.master, hold);
    c.send('d4say', [txt, hold]);
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TXT.r1[r]);
      D4.screen.show(CARD, TITLE, '#ff9a3a');
    }
    if (st === 2) {
      HUD.objective(TXT.r2[r]);
      D4.screen.show('Salle 2', 'Les lasers', '#ff3b55');
      Sound.play('reveal');
      HUD.say(TXT.r2rule, T.master, 4200);
      local.grace = 2;
    }
    if (st === 3) {
      HUD.objective(TXT.r3[r]);
      Sound.play('reveal');
      Sound.mood('tense');
      HUD.say(TXT.r3rule, T.master, 4600);
      local.tl = TL;
      local.sweepT = 0;
    }
    if (st === 4) {
      HUD.objective(TXT.card);
      Sound.mood('calm');
      Sound.play('reveal');
      D4.timer.show('OUVERT', 'Caveau n°4', '#3fe08a');
    }
    if (prev && st > prev) {
      // whoever is left behind a closed gate joins at the checkpoint
      const q = D4.rel(Player.body.p);
      const behind = (st === 2 && q.z < 44) || (st === 3 && q.z < 88);
      if (behind) c.spawn(D4.spawn(st, r), 0);
    }
  };

  Story.register('tr_d4', {
    init: () => {
      const SU = ['h', 'd', 's', 'c'];
      const target = [0, 1, 2].map(() => (Math.random() * 4) | 0);
      return {
        stage: 1,
        codes: { h: rnd9(), d: rnd9(), s: rnd9(), c: rnd9() },
        digits: { h: rnd9(), d: rnd9(), s: rnd9(), c: rnd9() },
        order: SU.slice().sort(() => Math.random() - 0.5),
        dial: { h: 1, d: 1, s: 1, c: 1 },
        open: {},
        kp: '',
        target,
        ring: scrambleRings(target),
      };
    },
    voice: () => 1,
    net: {
      d4fx: (c, d) => fx(d[0], d[1]),
      d4say: (c, d) => HUD.say(d[0], T.master, d[1] || 2400),
      d4l: (c, d) => {
        if (Net.isHost) return;
        if (d[0] !== local.L.step) local.L.step = d[0];
        local.L.frac = d[1];
      },
      d4s: (c, d) => {
        if (Net.isHost) return;
        local.tl = d[0];
        local.L.sweepZ = d[1] < 0 ? null : d[1];
        local.L.warn = d[2];
      },
      d4key: (c, n) => {
        const k = D4.keys[n - 1];
        if (k) k.press = 1;
        Sound.play('switch');
      },
      d4ks: (c, st) => (local.L.kstate = st),
      d4lever: () => {
        local.L.lever = 1.2;
        Sound.play('switch');
      },
      d4shake: (c, s) => {
        D4.safes[s].shake = 0.6;
      },
      d4pend: (c, d) => {
        const cr = D4.cranks.find((k) => k.ring === d[0] && k.side === d[1]);
        if (cr) {
          cr.pend = SYNC;
          cr.spin = 0.4;
        }
        Sound.play('switch');
      },
      d4turn: (c, i) => {
        D4.cranks.filter((k) => k.ring === i).forEach((k) => (k.spin = 1));
        D4.rings[i].shake = 0.4;
      },
    },
    async enter(c, first) {
      for (const k in local) delete local[k];
      Object.assign(local, fresh());
      if (!first) await fadeTo(true);
      D4.build();
      c.spawn(D4.spawn(c.S.x.stage, c.role), 0);
      Player.killY = D4.O.y - 20;
      Player.checkpoint = () => D4.spawn(Story.S.x.stage, c.role);
      Player.targets = () => {
        if (c.role !== 'dame') return [];
        const st = Story.S.x.stage;
        if (st === 1) return [D4.ringPos('balcony')];
        if (st === 2) return [D4.ringPos('catwalk')];
        return [];
      };
      Player.grappleLand = () => D4.grappleLand(D4.rel(Player.body.p));
      City.mood({});
      c.fog(0.009);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3600);
      HUD.say(TXT.hint[c.role], T.master, 3800);
      if (c.S.x.stage === 1) {
        HUD.say(TXT.r1rule, T.master, 4200);
        TXT.r1clues.forEach((l) => HUD.say(l, T.master, 3200));
      }
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      D4.hide();
      Sound.mood('calm');
    },
    apply(c) {
      if (!D4.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
    },
    host(c, dt) {
      if (!D4.built) return;
      const x = c.S.x;
      const qd = D4.rel(c.pos('dame'));
      const qv = D4.rel(c.pos('valet'));
      Object.keys(local.lockT).forEach((k) => (local.lockT[k] -= dt));
      // room 1 → 2
      if (x.stage === 1 && ['h', 'd', 's', 'c'].every((s) => x.open[s])) {
        local.r1T = (local.r1T || 0) + dt;
        if (local.r1T > 2) {
          local.r1T = 0;
          say(c, TXT.r1done, 3200);
          both(c, 'steam', D4.P(0, 1, 43).toArray());
          c.set((s) => (s.x.stage = 2));
        }
      }
      // room 2: the laser clock
      if (x.stage === 2) {
        local.stepT += dt;
        if (local.stepT > STEP_T) {
          local.stepT -= STEP_T;
          local.L.step++;
        }
        local.L.frac = local.stepT / STEP_T;
        local.sendT += dt;
        if (local.sendT > 0.1) {
          local.sendT = 0;
          c.send('d4l', [local.L.step, +local.L.frac.toFixed(2)]);
        }
      }
      // room 3: time lock, alarm sweeps
      if (x.stage === 3) {
        const inside = D4.inRoom3(qd) || D4.inRoom3(qv);
        if (inside) local.tl -= dt;
        if (local.tl < ALARM_AT) {
          if (!local.alarmed) {
            local.alarmed = true;
            say(c, TXT.alarm, 3600);
            Sound.play('glitch');
          }
          local.sweepT += dt;
          const ph = local.sweepT % SWEEP_EVERY;
          local.L.warn = ph < SWEEP_WARN ? 1 : 0;
          local.L.sweepZ =
            ph >= SWEEP_WARN && ph < SWEEP_WARN + SWEEP_DUR
              ? D4.SWEEP.from + ((ph - SWEEP_WARN) / SWEEP_DUR) * (D4.SWEEP.to - D4.SWEEP.from)
              : null;
        } else {
          local.L.warn = 0;
          local.L.sweepZ = null;
        }
        if (local.tl <= 0) {
          local.tl = TL;
          local.sweepT = 0;
          local.alarmed = false;
          local.pend = {};
          say(c, TXT.timeout, 3200);
          both(c, 'bolt', D4.P(0, 7, 130).toArray());
          c.set((s) => (s.x.ring = scrambleRings(s.x.target)));
        }
        local.sendT += dt;
        if (local.sendT > 0.08) {
          local.sendT = 0;
          c.send('d4s', [+local.tl.toFixed(1), local.L.sweepZ == null ? -1 : +local.L.sweepZ.toFixed(2), local.L.warn]);
        }
      }
      if (x.stage === 4 && D4.nearCard(qd) && D4.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'd4'));
    },
    action(c, who, d) {
      const x = c.S.x;
      if ((d.a === 'dial' || d.a === 'try') && SAFE_OF[d.s] && SAFE_OF[d.s] !== who) return;
      if (d.a === 'dial' && x.stage === 1 && !x.open[d.s] && !(local.lockT[d.s] > 0)) {
        c.set((s) => (s.x.dial = { ...s.x.dial, [d.s]: (s.x.dial[d.s] % 9) + 1 }));
        Sound.play('tile');
      }
      if (d.a === 'try' && x.stage === 1 && !x.open[d.s] && !(local.lockT[d.s] > 0)) {
        const pos = D4.safes[d.s].pos.clone().add(V3(0, 1.4, 0)).toArray();
        if (x.dial[d.s] === x.codes[d.s]) {
          c.set((s) => (s.x.open = { ...s.x.open, [d.s]: true }));
          both(c, 'good', pos);
          both(c, 'steam', pos);
          Sound.play('door');
          c.send('d4say', [TXT.opened[d.s], 2000]);
          HUD.say(TXT.opened[d.s], T.master, 2000);
        } else {
          local.lockT[d.s] = LOCK_T;
          D4.safes[d.s].shake = 0.6;
          c.send('d4shake', d.s);
          both(c, 'bad', pos);
          say(c, TXT.wrong, 2600);
          // no trying the nine values alone: a wrong code draws a new one (its clue redraws with it)
          let code = rnd9();
          while (code === x.dial[d.s] || code === x.codes[d.s]) code = rnd9();
          let dial = rnd9();
          while (dial === code) dial = rnd9();
          c.set((s) => {
            s.x.codes = { ...s.x.codes, [d.s]: code };
            s.x.dial = { ...s.x.dial, [d.s]: dial };
          });
        }
      }
      if (d.a === 'zap' && x.stage === 2) {
        // the one who touched already saw it: show it to the other screen
        if (who !== c.role) {
          fx('zap', d.pos);
          HUD.say(TXT.zapMate, T.master, 2200);
        } else {
          c.send('d4fx', ['zap', d.pos]);
          c.send('d4say', [TXT.zapMate, 2200]);
        }
      }
      // the Valet types the code, the Dame validates it from the catwalk
      if (d.a === 'key' && x.stage === 2 && local.L.kstate !== 'ok' && who === 'valet') {
        const kp = x.kp.length >= 4 ? String(d.n) : x.kp + d.n;
        c.set((s) => (s.x.kp = kp));
        c.send('d4key', d.n);
        if (who !== c.role) {
          D4.keys[d.n - 1].press = 1;
          Sound.play('switch');
        }
        if (local.L.kstate) {
          local.L.kstate = '';
          c.send('d4ks', '');
        }
      }
      if (d.a === 'validate' && x.stage === 2 && local.L.kstate !== 'ok' && who === 'dame') {
        local.L.lever = 1.2;
        c.send('d4lever', 1);
        const want = x.order.map((s) => x.digits[s]).join('');
        if (x.kp === want) {
          local.L.kstate = 'ok';
          c.send('d4ks', 'ok');
          say(c, TXT.kpOk, 2600);
          both(c, 'good', D4.P(8.4, 3, 81).toArray());
          both(c, 'steam', D4.P(0, 1, 87).toArray());
          setTimeout(() => Story.S.phase === 'tr_d4' && c.set((s) => (s.x.stage = 3)), 1800);
        } else {
          local.L.kstate = 'bad';
          c.send('d4ks', 'bad');
          say(c, TXT.kpBad, 2200);
          both(c, 'bad', D4.P(8.4, 3, 81).toArray());
          setTimeout(() => {
            if (Story.S.phase !== 'tr_d4' || local.L.kstate !== 'bad') return;
            local.L.kstate = '';
            c.send('d4ks', '');
            c.set((s) => (s.x.kp = ''));
          }, 1400);
        }
      }
      if (d.a === 'crank' && x.stage === 3 && CRANK_OF[d.side] === who) {
        const now = Game.clock.t;
        const other = d.side === 'L' ? 'R' : 'L';
        const key = d.ring + other;
        c.send('d4pend', [d.ring, d.side]);
        const cr = D4.cranks.find((k) => k.ring === d.ring && k.side === d.side);
        if (cr) {
          cr.pend = SYNC;
          cr.spin = 0.4;
        }
        if (local.pend[key] != null && now - local.pend[key] < SYNC) {
          delete local.pend[key];
          const ring = x.ring.slice();
          ring[d.ring] = (ring[d.ring] + 1) % 4;
          c.set((s) => (s.x.ring = ring));
          c.send('d4turn', d.ring);
          D4.cranks.filter((k) => k.ring === d.ring).forEach((k) => (k.spin = 1));
          D4.rings[d.ring].shake = 0.4;
          both(c, 'ring', D4.P(0, 7, 130).toArray());
          const vents = D4.vents();
          both(c, 'steam', vents[(Math.random() * vents.length) | 0].toArray());
          const okNow = ring[d.ring] === x.target[d.ring];
          if (okNow && !ring.every((v, i) => v === x.target[i])) {
            say(c, TXT.ringOk[d.ring], 1800);
            both(c, 'good', D4.P(0, 7, 130).toArray());
          }
          if (ring.every((v, i) => v === x.target[i])) {
            say(c, TXT.aligned, 3000);
            both(c, 'bolt', D4.P(0, 7, 130).toArray());
            setTimeout(() => {
              if (Story.S.phase !== 'tr_d4') return;
              c.set((s) => (s.x.stage = 4));
              both(c, 'steam', D4.P(-5, 2, 130).toArray());
              both(c, 'steam', D4.P(5, 2, 130).toArray());
            }, 1600);
          }
        } else local.pend[d.ring + d.side] = now;
      }
      if (d.a === 'swept' && x.stage === 3) {
        // a knocked-down player lets go of the crank
        const side = d.side;
        [0, 1, 2].forEach((i) => delete local.pend[i + side]);
        if (who !== c.role) {
          fx('zap', d.pos);
          HUD.say(TXT.sweptMate, T.master, 2000);
        } else {
          c.send('d4fx', ['zap', d.pos]);
          c.send('d4say', [TXT.sweptMate, 2000]);
        }
      }
    },
    update(c, dt, t) {
      if (!D4.built) return null;
      const x = c.S.x;
      const L = local.L;
      const p = Player.body.p;
      const q = D4.rel(p);
      const r = c.role;
      L.zap = Math.max(0, L.zap - dt * 1.5);
      L.lever = Math.max(0, L.lever - dt);
      local.grace = Math.max(0, local.grace - dt);
      if (!Net.isHost && x.stage === 2) L.frac = Math.min(1, L.frac + dt / STEP_T);
      L.vq = x.stage === 2 ? D4.rel(c.pos('valet')) : null;
      L.q = q;
      L.anaS = D4.onBalcony(q);
      L.anaD = D4.onLedge(q);
      L.tl = local.tl;
      D4.L = L; // read by the test bots
      D4.dbg = local;
      D4.update(dt, t, x, r, L);
      // the time-lock screen
      if (x.stage === 3) {
        const s = Math.max(0, Math.ceil(local.tl));
        const txt = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        if (txt !== local.tlShown) {
          local.tlShown = txt;
          D4.timer.show(txt, local.tl < ALARM_AT ? 'Alarme' : 'Verrou horaire', local.tl < ALARM_AT ? '#ff3b55' : '#ffcf8a');
        }
      } else if (x.stage < 3 && local.tlShown !== 'idle') {
        local.tlShown = 'idle';
        D4.timer.show('VERROUILLÉ', 'Caveau n°4', '#ffcf8a');
      }
      // ---- room 1: safes ----
      if (x.stage === 1) {
        if (r === 'dame' && D4.inRoom1(q) && Math.abs(q.z - 20) < 6) once('ink', TXT.inkHint, 3600);
        if (L.anaS) once('anaS', TXT.anaS, 3400);
        if (L.anaD) once('anaD', TXT.anaD, 3400);
        const s = D4.nearSafe(q);
        if (s && !x.open[s]) {
          if (Input.pressed('interact')) {
            local.hold = 0;
            local.holdS = s;
          }
          if (local.holdS === s && Input.held('interact')) {
            local.hold += dt;
            if (local.hold > 0.7 && local.holdS) {
              c.act({ a: 'try', s });
              local.holdS = null;
            }
          }
          if (local.holdS === s && Input.released('interact')) {
            if (local.hold < 0.35) c.act({ a: 'dial', s });
            local.holdS = null;
          }
          return ['E', 'Molette ' + D4.SYM[s] + ' : ' + x.dial[s] + ' · maintenir pour ouvrir', local.holdS === s];
        }
        local.holdS = null;
      }
      // ---- room 2: lasers, keypad, lever ----
      if (x.stage === 2) {
        if (local.grace <= 0 && D4.inLasers(q)) {
          const row = D4.laserHit(q, L.step);
          if (row >= 0) {
            L.zap = 1;
            local.grace = 1.5;
            const pos = p.clone().add(V3(0, 1, 0)).toArray();
            fx('zap', pos);
            HUD.say(TXT.zapMe, T.master, 2000);
            c.act({ a: 'zap', pos });
            c.spawn(D4.P(r === 'dame' ? -2 : 2, 0, 47), 0);
          }
        }
        if (q.z > 75 && q.x > 3 && q.y < 1) once('kp', r === 'dame' ? TXT.keypadDame : TXT.keypad, 4200);
        if (r === 'dame' && q.y > 4.5 && q.z > 46) once('kpd', TXT.keypadDame, 4200);
        const k = D4.nearKey(q);
        if (k && r !== 'valet') return ['E', 'Le clavier est pour l’autre · code : ' + ((x.kp || '') + '____').slice(0, 4)];
        if (D4.nearLever(q) && r !== 'dame') return ['E', 'Le levier est pour l’autre (' + ((x.kp || '') + '____').slice(0, 4) + ')'];
        if (k) {
          if (Input.pressed('interact')) {
            k.press = 1;
            Sound.play('switch');
            c.act({ a: 'key', n: k.n });
          }
          return ['E', 'Touche ' + k.n + ' · code : ' + ((x.kp || '') + '____').slice(0, 4)];
        }
        if (D4.nearLever(q)) {
          if (Input.pressed('interact')) {
            L.lever = 1.2;
            c.act({ a: 'validate' });
          }
          return ['E', 'Valider le code (' + ((x.kp || '') + '____').slice(0, 4) + ')'];
        }
      }
      // ---- room 3: cranks, sweep ----
      if (x.stage === 3) {
        if (L.sweepZ != null && local.grace <= 0 && D4.sweepHit(q, L.sweepZ)) {
          local.grace = 1.2;
          Player.body.v.set(0, 4.5, -6);
          Cam.shake = Math.max(Cam.shake, 0.35);
          const pos = p.clone().add(V3(0, 0.6, 0)).toArray();
          fx('zap', pos);
          HUD.say(TXT.swept, T.master, 1800);
          c.act({ a: 'swept', side: q.x < 0 ? 'L' : 'R', pos });
        }
        const cr = D4.nearCrank(q);
        if (cr && CRANK_OF[cr.side] !== r) return ['E', 'Cette manivelle est pour {mate}'];
        if (cr) {
          if (Input.pressed('interact')) {
            cr.pend = SYNC;
            cr.spin = 0.4;
            c.act({ a: 'crank', ring: cr.ring, side: cr.side });
          }
          return ['E', 'Tourner la manivelle ' + ['I', 'II', 'III'][cr.ring] + ' (en même temps que {mate})'];
        }
      }
      return null;
    },
  });
})();
