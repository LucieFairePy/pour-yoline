// ♦ D · La Dame de Carreau (figure dD), the second face of the ♦ table of the Cour. Kits as
// usual (Yoline: dame, William: valet). La Galerie des Prismes: a heliostat throws a beam of gold
// across a 5 x 4 grid of mirror pits; mirrors stand in some of them; crystals wait on the edges,
// one of them the Dame's. Only the guide sees the beam and which crystal is the right one (from
// the balcony, the whole grid at a glance); only the other one can turn the mirrors (E: turn,
// lower, raise) and pull the lever that checks the beam. The Dame turns a mirror herself now and
// then. A wrong crystal re-deals the gallery. Two rounds, the roles change between them.
(() => {
  const CARD = Cards.tagOf('dD');
  const T = CONFIG;
  const W = CourD;
  const TITLE = 'La Dame de Carreau';
  const DAME = 'La Dame de Carreau';
  const TXT = {
    intro: 'Deuxième figure de Carreau. Une galerie de miroirs, un rayon, un cristal.',
    rule: 'L’un de vous voit la lumière. L’autre a les mains. Aucun des deux ne peut le faire seul.',
    go: 'Entrez dans la Galerie des Prismes.',
    fall: 'Le vide. Retour à l’entrée de la galerie.',
    fallMate: '{mate} est tombé{pe}. {Il} repart de l’entrée de la galerie.',
    guide: 'Tu vois le rayon d’or et le cristal visé (le doré). Au balcon, regarde par la grande lentille (E) et dis à {mate} quel miroir tourner. Manche {r} / 2.',
    hands: 'Tu ne vois pas le rayon. Tourne les miroirs (E) comme {mate} te le dit, puis tire le levier pour valider. Manche {r} / 2.',
    guideSay: 'Tu vois la lumière : le rayon, et le seul cristal qui compte. Monte au balcon, regarde par la grande lentille, et guide {mate}.',
    handsSay: 'Tu ne vois pas la lumière. {mate}, si. Écoute-{le}, tourne les miroirs, et tire le levier quand {il} te le dit.',
    turn: 'Tourner le miroir {n}',
    lower: 'Abaisser le miroir {n}',
    raise: 'Relever le miroir {n}',
    pull: 'Tirer le levier : envoyer la lumière',
    lensOn: 'Regarder par la grande lentille',
    lensOff: 'Quitter la lentille',
    lensSay: 'Par la grande lentille, toute la galerie d’un coup d’œil. E pour la quitter.',
    notMine: 'Les miroirs, c’est {mate} : toi, tu vois.',
    notMineLever: 'Le levier, c’est {mate} qui le tire.',
    bigOk: 'Le bon cristal · {n} / 2',
    bigNo: 'Pas ce cristal',
    noWall: 'La lumière se perd dans le mur. La Dame rebat ses miroirs.',
    noCry: 'Un autre cristal. La Dame rebat ses miroirs.',
    swap: 'À l’envers, maintenant : celui qui voyait tourne les miroirs, l’autre voit la lumière.',
    trick: 'La Dame a tourné le miroir {n}.',
    hint1: 'Suivez le rayon depuis l’héliostat, miroir par miroir. Un miroir tourne le rayon d’un quart de tour ; abaissé, il le laisse passer.',
    hint2: 'Toi qui vois : donne les numéros, un par un, et vérifie après chaque miroir.',
    done: 'Deux cristaux allumés. La Dame de Carreau s’incline.',
    card: 'Sa carte flotte au-dessus des miroirs. Allez-y ensemble.',
    // the Dame's own lines (playful, never cruel)
    d: {
      hello: 'Bienvenue dans ma galerie. Ici, la lumière obéit… à qui sait la regarder.',
      rules: 'Un rayon, des miroirs, un seul cristal qui compte. L’un voit, l’autre touche.',
      trick: ['Oh, celui-là était de travers. Je l’ai arrangé.', 'Un petit tour. Pour voir si vous suivez.', 'Je ne touche à rien. Presque.'],
      ok: 'Le cristal chante. Joli.',
      no: ['Perdu dans les murs. Je rebats mes miroirs.', 'Mauvais cristal. On recommence, autrement.'],
      won: 'La lumière vous connaît. Allez voir le Roi : lui, il compte.',
    },
  };
  CONFIG.cards.dD = {
    title: TITLE,
    sub: 'Figure ♦ · réussie',
    lines: ['Un rayon d’or, des miroirs, un seul bon cristal.', 'L’un voyait la lumière, l’autre tournait les miroirs.', 'Et la Dame qui en tournait un de temps en temps.'],
  };

  const guideOf = (x) => ((x.round || 1) === 1 ? 'dame' : 'valet');
  const local = { stage: 0, pend: [], sayCd: {}, objT: 0, hints: {}, resSeen: 0, puzSeen: 0, near: 0, cd: 0, reveal: 0, tr: null, trickT: 30, puzT: 0, roundT: 0 };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- words ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const dsay = (text, hold) => {
    HUD.say(text, DAME, hold || 2800);
    W.talk('D', Math.min(3, (hold || 2800) / 1000));
    W.AU.ping(79, 0.03);
  };
  const dsayBoth = (c, text, hold) => {
    dsay(text, hold);
    c.send('dDsay', [text, 1, hold || 2800]);
  };
  const sayBoth = (c, text, hold) => {
    say(text, hold);
    c.send('dDsay', [text, 0, hold || 2800]);
  };
  const sayOnce = (k, text, cd = 8) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const fx = (c, d) => {
    const [k, a] = d;
    const x = c.S.x;
    const m = x.puz && x.puz.mir[a];
    if (k === 'turn' && m) {
      Sound.play('switch');
      W.AU.ping(72 + (a % 5) * 2, 0.035);
      Fx.burst(W.P(W.cellX(m.c), 1.3, W.cellZ(m.r)), '#ffe2a8', 24, 2.5, 0.7, -2);
    }
    if (k === 'lever') {
      W.ST.lever.B = 1;
      Sound.play('switch');
      Sound.play('lift');
      after(0.8, () => (W.ST.lever.B = 0));
    }
    if (k === 'ok') {
      Sound.play('chime');
      Sound.play('reveal');
      W.AU.ping(86, 0.06);
      after(0.25, () => W.AU.ping(91, 0.05));
      const cr = x.puz && x.puz.cry[a];
      if (cr) Fx.burst(W.P(W.slotX(cr.slot), 1.6, W.slotZ(cr.slot)), '#ffcf5a', 150, 5, 1.4, -2);
    }
    if (k === 'no') {
      Sound.play('glitch');
      Sound.play('trap');
    }
    if (k === 'won') {
      Sound.play('reveal');
      Fx.burst(W.P(0, 3, 68), '#ffcf6a', 220, 8, 1.8, -2);
      after(0.8, () => Fx.firework(W.P(-6, 0, 68), 18));
      after(1.5, () => Fx.firework(W.P(6, 0, 68), 20));
      W.bolt(W.P(80, 140, 120), W.P(18, 12, 76), { gold: true, w: 0.35, flash: 0.9 });
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('dDfx', d);
  };

  // ---------- the gallery (host) ----------
  const rnd = (n) => Math.floor(Math.random() * n);
  const pickN = (arr, n) => {
    const a = arr.slice();
    const out = [];
    while (out.length < n && a.length) out.push(a.splice(rnd(a.length), 1)[0]);
    return out;
  };
  const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
  const CELLS = [];
  for (let c = 0; c < W.COLS; c++) for (let r = 0; r < W.ROWS; r++) CELLS.push([c, r]);
  const gen = (round) => {
    const nm = round === 1 ? 6 : 7;
    const minHits = round === 1 ? 3 : 4;
    for (let tries = 0; tries < 5000; tries++) {
      const src = rnd(W.ROWS);
      const mir = pickN(CELLS, nm).map(([c, r]) => ({ c, r, a: rnd(2), low: 0 }));
      const tr = W.trace(src, mir);
      if (!tr.exit || same(tr.exit, [-1, src])) continue;
      if (new Set(tr.hits).size !== tr.hits.length || tr.hits.length < minHits) continue;
      const target = tr.exit;
      // scramble: the beam must not already reach the target
      let mix = null;
      for (let k = 0; k < 300 && !mix; k++) {
        const m2 = mir.map((m) => ({ c: m.c, r: m.r, a: rnd(2), low: Math.random() < 0.15 ? 1 : 0 }));
        const t2 = W.trace(src, m2);
        const changed = tr.hits.filter((i) => m2[i].a !== mir[i].a || m2[i].low).length;
        if (!same(t2.exit, target) && changed >= 2) mix = m2;
      }
      if (!mix) continue;
      // numbered in reading order from the balcony (south row first, left to right: +x is left)
      const order = mix.map((m, i) => i).sort((i, j) => mix[i].r - mix[j].r || mix[j].c - mix[i].c);
      order.forEach((i, n) => (mix[i].n = n));
      const decoys = pickN(W.EDGES.filter((e) => !same(e, [-1, src]) && !same(e, target)), 4);
      const cry = pickN([target, ...decoys], 5).map((slot) => ({ slot, target: same(slot, target) ? 1 : 0 }));
      return { src, mir: mix, cry };
    }
    return null;
  };
  const deal = (c) => {
    const p = gen(c.S.x.round || 1);
    if (!p) return;
    local.puzT = 0;
    local.trickT = 28 + Math.random() * 8;
    c.set((s) => (s.x.puz = Object.assign({ n: (s.x.puz ? s.x.puz.n : 0) + 1 }, p)));
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 1) return TXT.go;
    if (x.stage === 3) return TXT.card;
    return fill(guideOf(x) === c.role ? TXT.guide : TXT.hands, { r: x.round || 1 });
  };

  // ---------- light and mood ----------
  const mood = (c, won) => {
    LvKit.mood({
      sky: '#c8a070',
      ground: '#2a1c14',
      hemi: won ? 0.5 : 0.36,
      sun: '#ffd8a0',
      sunI: won ? 0.7 : 0.45,
      sunPos: V3(40, 90, -30),
      exposure: won ? 1.25 : 1.15,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(won ? '#3a2a20' : '#2a1e1c');
    c.fog(won ? 0.0055 : 0.0066);
    Sound.mood(won ? 'gold' : 'tense');
  };

  const onFloor = (q) => W.at('FLOOR_B', q);
  const nearMirror = (x, q) => {
    if (!x.puz || !onFloor(q)) return -1;
    let bi = -1;
    let bd = 1.9;
    x.puz.mir.forEach((m, i) => {
      const d = Math.hypot(q.x - W.cellX(m.c), q.z - W.cellZ(m.r));
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    return bi;
  };
  const atLever = (q) => Math.hypot(q.x - W.LEVER_B[0], q.z - W.LEVER_B[1]) < 2 && q.y < 1.5;
  const atLens = (q) => W.at('BAL', q) && Math.hypot(q.x - W.LENS[0], q.z - W.LENS[1]) < 2.2;
  // the view through the great lens: the whole grid from above (the guide stands still)
  const setLens = (v) => {
    if (local.lens === v) return;
    local.lens = v;
    Player.mode = v ? 'frozen' : 'walk';
    if (v && !local.lensSaid) {
      local.lensSaid = true;
      say(TXT.lensSay, 3200);
    }
  };
  const lensEye = V3();
  const lensAt = V3();
  const lensCam = (dt) => {
    local.lensK = damp(local.lensK || 0, local.lens ? 1 : 0, 3.5, dt);
    if (local.lensK < 0.002) return;
    const k = ease01(local.lensK);
    lensEye.copy(W.P(W.LENS_EYE[0], W.LENS_EYE[1], W.LENS_EYE[2]));
    lensAt.copy(Player.body.p).add(V3(0, 1.5, 4)).lerp(W.P(W.LENS_AT[0], W.LENS_AT[1], W.LENS_AT[2]), k);
    R.camera.position.lerp(lensEye, k);
    R.camera.lookAt(lensAt);
  };
  const ease01 = (v) => v * v * (3 - 2 * v);

  Story.register('tr_dD', {
    world: CourD,
    init: () => ({ stage: 1, cp: 'D', round: 1, puz: null, res: null, miss: 0, trickN: 0, won: 0 }),
    voice: () => 1,
    net: {
      dDsay: (c, d) => (d[1] ? dsay(d[0], d[2]) : say(d[0], d[2])),
      dDfx: (c, d) => fx(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.setup('D');
      Object.assign(local, { stage: 0, pend: [], sayCd: {}, objT: 0, hints: {}, resSeen: c.S.x.res ? c.S.x.res.n : 0, puzSeen: 0, near: 0, cd: 0, reveal: 0, tr: null, trickT: 30, puzT: 0, roundT: 0, roleSaid: 0, dealPend: false, lens: false, lensK: 0, lensSaid: false });
      c.spawn(W.spawn(c.S.x.cp, c.role), 0);
      Player.killY = W.O.y - 22;
      Player.checkpoint = () => {
        say(TXT.fall, 2400);
        c.send('dDsay', [TXT.fallMate, 0, 2600]);
        return W.spawn(Story.S.x.cp, c.role);
      };
      mood(c, c.S.x.won);
      after(0.6, () => Story.S && Story.S.phase === 'tr_dD' && mood(c, Story.S.x.won));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · la Galerie des Prismes', '#ffcf7a');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4200);
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      if (local.lens) Player.mode = 'walk';
      local.lens = false;
      local.lensK = 0;
      Player.killY = -40;
      LvKit.mood(null);
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      W.hide();
      local.pend = [];
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      const r = c.role;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (x.stage === 2) {
          if (prev) Sound.play('chime');
          after(prev ? 0.4 : 0, () => {
            dsay(TXT.d.hello, 3200);
            after(3.4, () => dsay(TXT.d.rules, 3200));
          });
        }
        if (x.stage === 3) {
          mood(c, true);
          say(TXT.done, 3000);
          after(0.6, () => dsay(TXT.d.won, 3600));
          after(4.6, () => say(TXT.card, 3600));
        }
      }
      const pz = x.puz;
      if (pz && pz.n !== local.puzSeen) {
        local.puzSeen = pz.n;
        local.roundT = local.roleSaid === x.round ? local.roundT : 0;
        if (local.roleSaid !== x.round && x.stage === 2) {
          const swap = local.roleSaid > 0;
          local.roleSaid = x.round;
          if (swap) say(TXT.swap, 3200);
          after(swap ? 3.4 : 7, () => say(Story.fmt(guideOf(Story.S.x) === r ? TXT.guideSay : TXT.handsSay), 4400));
        }
      }
      if (x.res && x.res.n !== local.resSeen) {
        local.resSeen = x.res.n;
        local.reveal = 3.4;
        if (x.res.ok) after(0.5, () => W.big(fill(TXT.bigOk, { n: x.res.r }), 2));
        else {
          after(0.5, () => W.big(TXT.bigNo, 1.6, '#ff6a7a'));
          say(x.res.end < 0 ? TXT.noWall : TXT.noCry, 2600);
        }
      }
      // the beam, as this screen sees it (traced here, from the shared mirrors)
      const S = W.ST;
      local.tr = pz ? W.trace(pz.src, pz.mir) : null;
      S.src = pz ? [W.slotX([-1, pz.src]), W.cellZ(pz.src)] : [-12, W.cellZ(0)];
      S.mir = pz && x.stage >= 2 ? pz.mir : [];
      S.cry = pz && x.stage >= 2 ? pz.cry : [];
      S.beamPath = local.tr ? local.tr.path : null;
      S.beamEnd = local.tr && pz ? pz.cry.findIndex((cr) => same(cr.slot, local.tr.exit)) : -1;
      S.gateA = 1;
      S.gateB = 0;
      W.figs.D.st.bow = x.won ? 1 : 0;
      S.card = x.stage === 3 ? [0, 3.4, 68] : null;
      HUD.objective(Story.fmt(objective(c)));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      if (x.stage === 1 && W.at('B', qd) && W.at('B', qv)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && !x.puz && !local.dealPend) {
        local.dealPend = true;
        after(6.8, () => {
          local.dealPend = false;
          if (Story.S && Story.S.phase === 'tr_dD' && Story.S.x.stage === 2 && !Story.S.x.puz) deal(c);
        });
      }
      // the Dame's own hand: now and then she turns a mirror
      if (x.stage === 2 && x.puz && !local.dealPend) {
        local.puzT += dt;
        local.trickT -= dt;
        if (local.trickT <= 0 && local.puzT > 25) {
          local.trickT = (x.round === 2 ? 20 : 30) + Math.random() * 8;
          const up = x.puz.mir.map((m, i) => (m.low ? -1 : i)).filter((i) => i >= 0);
          const i = up[rnd(up.length)];
          if (i != null) {
            c.set((s) => {
              s.x.puz.mir = s.x.puz.mir.map((m, j) => (j === i ? Object.assign({}, m, { a: 1 - m.a }) : m));
              s.x.trickN = (s.x.trickN || 0) + 1;
            });
            fxBoth(c, ['turn', i]);
            dsayBoth(c, TXT.d.trick[(x.trickN || 0) % TXT.d.trick.length], 2400);
            after(2.6, () => sayBoth(c, fill(TXT.trick, { n: W.ROMAN[x.puz.mir[i].n] }), 2400));
          }
        }
      }
      if (x.stage === 3) {
        const near = (q) => Math.hypot(q.x, q.z - 68) < 4.5 && q.y > -0.5;
        local.near = near(qd) && near(qv) ? local.near + dt : 0;
        if (local.near > 1.2) c.goto('reward', (s) => (s.x.card = 'dD'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      const pz = x.puz;
      if (x.stage !== 2 || !pz || d.pn !== pz.n || local.dealPend) return;
      if (who === guideOf(x)) return;
      const q = W.rel(c.pos(who));
      if (d.a === 'turn') {
        const m = pz.mir[d.i];
        if (!m || !onFloor(q) || Math.hypot(q.x - W.cellX(m.c), q.z - W.cellZ(m.r)) > 2.4) return;
        const nx = m.low ? { a: 0, low: 0 } : m.a === 0 ? { a: 1, low: 0 } : { a: m.a, low: 1 };
        c.set((s) => (s.x.puz.mir = s.x.puz.mir.map((mm, j) => (j === d.i ? Object.assign({}, mm, nx) : mm))));
        fxBoth(c, ['turn', d.i]);
      }
      if (d.a === 'valid') {
        if (!atLever(q)) return;
        const tr = W.trace(pz.src, pz.mir);
        const end = pz.cry.findIndex((cr) => same(cr.slot, tr.exit));
        const ok = end >= 0 && pz.cry[end].target === 1;
        const r = x.round || 1;
        fxBoth(c, ['lever']);
        c.set((s) => {
          s.x.res = { n: (s.x.res ? s.x.res.n : 0) + 1, pn: pz.n, ok: ok ? 1 : 0, end, r };
          if (ok) s.x.round = r + 1;
          else s.x.miss = (s.x.miss || 0) + 1;
          if (ok && r >= 2) {
            s.x.stage = 3;
            s.x.won = 1;
          }
        });
        after(0.5, () => fxBoth(c, [ok ? 'ok' : 'no', end]));
        if (ok && r >= 2) {
          after(1.4, () => fxBoth(c, ['won']));
          return;
        }
        after(0.9, () => dsayBoth(c, ok ? TXT.d.ok : TXT.d.no[(x.miss || 0) % TXT.d.no.length], 2400));
        local.dealPend = true;
        after(3.6, () => {
          local.dealPend = false;
          if (Story.S && Story.S.phase === 'tr_dD' && Story.S.x.stage === 2) deal(c);
        });
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = W.rel(p);
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.cd = Math.max(0, local.cd - dt);
      local.reveal = Math.max(0, local.reveal - dt);
      let prompt = null;
      const pressed = Input.pressed('interact');
      const pz = x.puz;
      const guide = guideOf(x) === r;
      // only the guide sees the light (both, for a moment, when the lever is pulled)
      const S = W.ST;
      S.beamOn = x.stage === 2 && !!pz && (guide || local.reveal > 0);
      S.showTarget = x.stage === 2 && !!pz && (guide || local.reveal > 0);
      if (x.stage === 2 && pz) {
        local.roundT += dt;
        const mi = nearMirror(x, q);
        if (mi >= 0) {
          const m = pz.mir[mi];
          const n = W.ROMAN[m.n];
          if (!guide) {
            prompt = ['E', fill(m.low ? TXT.raise : m.a === 0 ? TXT.turn : TXT.lower, { n }), false];
            if (pressed && !local.cd) {
              local.cd = 0.35;
              c.act({ a: 'turn', i: mi, pn: pz.n });
            }
          } else {
            prompt = ['E', Story.fmt(TXT.notMine), false];
            if (pressed) sayOnce('notMine', Story.fmt(TXT.notMine), 5);
          }
        }
        if (guide && atLens(q)) {
          prompt = ['E', local.lens ? TXT.lensOff : TXT.lensOn, false];
          if (pressed && !local.cd) {
            local.cd = 0.4;
            setLens(!local.lens);
          }
        }
        if (atLever(q)) {
          if (!guide) {
            prompt = ['E', TXT.pull, false];
            if (pressed && !local.cd) {
              local.cd = 2;
              c.act({ a: 'valid', pn: pz.n });
            }
          } else {
            prompt = ['E', Story.fmt(TXT.notMineLever), false];
            if (pressed) sayOnce('notMineL', Story.fmt(TXT.notMineLever), 5);
          }
        }
        if (((x.miss || 0) >= 1 || local.roundT > 70) && !local.hints.h1) {
          local.hints.h1 = true;
          after(3, () => say(TXT.hint1, 5200));
        }
        if (((x.miss || 0) >= 3 || local.roundT > 140) && !local.hints.h2) {
          local.hints.h2 = true;
          after(3, () => say(TXT.hint2, 4200));
        }
      }
      if (local.lens && (x.stage !== 2 || !guide)) setLens(false);
      lensCam(dt);
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(Story.fmt(objective(c)));
      }
      if (x.stage === 3) return null;
      return prompt;
    },
  });
})();
