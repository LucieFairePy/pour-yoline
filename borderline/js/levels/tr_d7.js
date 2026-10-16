// ♦ 9 · Le Temps: rules, host-authoritative state and sync (world in js/world/tr_d7.js).
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d7');
  const T = CONFIG;
  const TITLE = 'Le Temps';
  // the hour the dial shows when everything stops: 17:07, for the 17th of July they met
  const MEET = { h: 17, m: 7 };
  const RATE = 5 / 0.9; // minutes per second at the crank (one hour mark every 0.9 s)
  const FAST = 4;
  const ECHO_LEN = 10;
  const ECHO_HZ = 15;
  const SLOW_T = 3;
  const SLOW_CD = 4;
  const SLOW_F = 0.12;
  const DISC_W = 9;
  const FLING_W = 1.0;
  const PEND_P = 0.7;
  const PEND_A = 0.87;
  const BEATS = [1.3, 1.15, 1.0];
  const JAM_WIN = 0.3;
  const BRAKE_T = 1.6; // seconds of brake before a gear turns at the pendulum's beat
  const GRACE3 = 4; // the debris hang still a moment before time starts again
  const TXT = {
    intro: 'Épreuve de logique. La tour de l’Horloge : ici, le temps est un mécanisme. Et un mécanisme, ça se règle à deux.',
    hint: {
      dame: 'Tu vois le sable du temps : les rideaux qui emportent tout. {mate} voit l’heure à atteindre.',
      valet: 'Tu tiens la manivelle et tu vois l’heure à atteindre. Le sable qui emporte tout, seul{pe} {mate} le voit.',
    },
    r1: {
      dame: 'Le Cadran · Monte sur la grande aiguille quand elle pointe le VI. {mate} la fait tourner. Ne la laisse pas te porter à travers un rideau de sable.',
      valet: 'Le Cadran · Manivelle : E maintenu, F change le sens. Amène la grande aiguille au VI pour {mate}, puis à l’heure qui brille. Demande-{lui} par où passer.',
    },
    rule1: 'Les grilles des niches ne s’ouvrent que devant la grande aiguille. Qui tourne connaît l’heure ; qui marche voit le sable.',
    crankOnly: 'La manivelle est trop dure pour toi : c’est le travail de {mate}.',
    reach: ['Une heure de trouvée.', 'Deux heures. Plus qu’une.', 'La dernière heure. Le XII.'],
    newTarget: 'Nouvelle heure.',
    wrongNiche: 'Ce n’est pas cette heure-là.',
    swept: 'Le sable t’a emporté{e}.',
    sweptMate: 'Le sable a emporté {mate}.',
    finalV: 'Dernier réglage : six heures pile. La petite aiguille rejoindra le ponton du VI, la grande la niche du XII. Maj + E : tourner vite.',
    finalD: 'Reste dans la niche du XII. {mate} doit mettre l’horloge à six heures pile, puis te rejoindre par les aiguilles.',
    six: 'Six heures. Les aiguilles s’alignent, le moyeu s’abaisse : un chemin traverse le cadran.',
    cross: {
      dame: 'Attends {mate} ici : la porte du XII s’ouvre.',
      valet: 'Descends au VI : ponton, petite aiguille, moyeu, grande aiguille, jusqu’au XII.',
    },
    r2: 'L’Écho · F enregistre dix secondes de toi. Puis F lance l’écho : un fantôme doré refait ton trajet, et reste là où tu t’es arrêté{e}.',
    rule2: 'Une dalle n’agit que tant qu’on s’y tient. Le pont veut ses deux dalles en même temps ; la dalle rose, en face, le fixe pour de bon.',
    latched: 'Le pont est fixé.',
    twoOfYou: 'Le pont veut vos deux présences : un écho compte pour celui ou celle qui l’a enregistré.',
    lane: 'La galerie : chaque grille ne s’ouvre que si la dalle de même rang, sur le balcon, est tenue. L’écho peut courir pour vous.',
    recStart: 'Enregistrement : dix secondes.',
    echoReady: 'Écho prêt. F pour le lancer.',
    echoGo: 'L’écho rejoue.',
    r3: {
      dame: 'Le Gel · Les débris figés sont des marches, tant que {mate} tient le frein. En haut, le sablier arrête le temps pour de bon.',
      valet: 'Le Gel · Tiens le frein (E maintenu) : les débris restent figés et {mate} peut monter. En haut, le sablier les fige pour de bon.',
    },
    heavy: 'Ce frein est trop dur pour toi. C’est celui de {mate}.',
    thaw: 'Le temps repart : tout retombe.',
    locked: 'Le sablier est retourné : ici, le temps s’est arrêté. Montez.',
    r3b: {
      dame: 'L’Accélération · Les engrenages ne s’arrêtent qu’au frein (E maintenu), à chaque bout. Les balanciers : F ralentit le temps trois secondes.',
      valet: 'L’Accélération · Les engrenages ne s’arrêtent qu’au frein (E maintenu), à chaque bout. Les balanciers : dis à {mate} quand ralentir le temps.',
    },
    flung: 'L’engrenage t’a projeté{e}.',
    flungMate: 'L’engrenage a projeté {mate}.',
    pendHit: 'Le balancier t’a fauché{e}.',
    pendMate: 'Le balancier a fauché {mate}.',
    slowOn: 'Le temps ralentit…',
    slowWait: 'Le temps ne se laisse pas ralentir si vite.',
    r4: 'L’Horloger · Il frappe au rythme du grand balancier. Coincez trois engrenages : l’un tient le frein, l’autre enfonce la cale quand l’encoche passe en haut, sur le tac.',
    hit: 'Touché{e} !',
    hitMate: 'L’Horloger a touché {mate}.',
    jam: ['Un engrenage coincé. Le balancier peine.', 'Deux engrenages. Plus qu’un.', ''],
    early: 'Trop tôt.',
    late: 'Trop tard.',
    needBrake: 'Il faut que {mate} tienne le frein de cet engrenage.',
    fastGear: 'Il tourne bien trop vite : il faut d’abord le frein.',
    spin: 'L’engrenage tourne encore trop vite : que {mate} tienne le frein un peu plus.',
    stop: 'Le temps s’arrête.',
    meet: 'Le cadran s’est arrêté sur 17 h 07. Le 17/07 : le jour où tout a commencé pour vous deux.',
    card: 'La carte ' + CARD + ' descend au centre. Allez-y ensemble.',
  };
  CONFIG.cards.d7 = {
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'Vous avez arrêté le temps, ensemble.',
      'L’un savait l’heure, l’autre voyait le danger.',
      'Et l’horloge s’est figée sur l’instant de votre rencontre.',
    ],
  };

  const W = () => TrD7;
  // per-run state, rebuilt on every enter()
  const fresh = () => ({
    stage: 0,
    clk: 0,
    m: 540,
    mv: 0,
    lastM: 540,
    holds: { dame: null, valet: null },
    hold: null,
    sendT: 0,
    plates: [0, 0, 0, 0, 0, 0],
    gates2: [0, 0, 0],
    g2T: [0, 0, 0],
    bridge: 0,
    fallT: 0,
    discA: 0,
    discW: DISC_W,
    pendPh: 0,
    slowT: 0,
    slowCd: 0,
    beat: 0,
    bp: BEATS[0],
    atk: [],
    atkN: 0,
    lastBeat: 0,
    lastTick: 0,
    moteT: 0,
    rec: null,
    recSend: 0,
    sweptCd: 0,
    hitCd: 0,
    frozenT: 0,
    cp2: 0,
    cp3: 0,
    msgCd: 0,
    inNiche: -1,
    endT: -1,
    cardT: 0,
    lastDisc: 0,
    brk: [0, 0, 0],
    t3: 0,
    env: null,
  });
  const local = fresh();

  // ---------- helpers ----------
  const rand = (n) => (Math.random() * n) | 0;
  const pickTargets = () => {
    const ok1 = [9, 10, 11, 1, 2, 3];
    const t1 = ok1[rand(ok1.length)];
    const ok2 = [3, 4, 5, 7, 8, 9].filter((h) => h !== t1 && TrD7.hourDist(h, t1) >= 3);
    const t2 = ok2.length ? ok2[rand(ok2.length)] : t1 <= 3 ? 8 : 4;
    return [t1, t2, 0];
  };
  // one way round is clear, the other has one or two sand curtains
  const curtainsFor = (f, t) => {
    const cw = [];
    const ccw = [];
    for (let h = (f + 1) % 12; h !== t; h = (h + 1) % 12) cw.push(h);
    for (let h = (f + 11) % 12; h !== t; h = (h + 11) % 12) ccw.push(h);
    const ok = (l) => l.filter((h) => h !== 6);
    let block = Math.random() < 0.5 ? cw : ccw;
    if (ok(block).length < 1) block = block === cw ? ccw : cw;
    const cand = ok(block);
    const out = [];
    if (cand.length) out.push(cand[rand(cand.length)]);
    if (cand.length > 3) {
      const c2 = cand.filter((h) => TrD7.hourDist(h, out[0]) >= 2);
      if (c2.length) out.push(c2[rand(c2.length)]);
    }
    return out;
  };
  const kitLook = (c, kit) => T.players[kit === c.role ? Story.me : Story.mate].look;
  const fx = (k, pos) => {
    const p = pos ? V3(...pos) : null;
    const A = TrD7.au;
    if (k === 'good') {
      Sound.play('rune', true);
      A.chime(p, 0);
    }
    if (k === 'bad') Sound.play('rune', false);
    if (k === 'swept') {
      A.whoosh(p, 1);
      Sound.play('fall');
    }
    if (k === 'six') {
      A.clunk(p, 1.2);
      A.chime(p, 5, 1.2);
      Sound.play('reveal');
      Cam.shake = Math.max(Cam.shake, 0.25);
    }
    if (k === 'latch') {
      A.clunk(p, 0.8);
      Sound.play('switch');
    }
    if (k === 'lock') {
      A.chime(p, 3);
      A.slow(true);
      Sound.play('reveal');
    }
    if (k === 'thaw') A.whoosh(p, 0.8);
    if (k === 'slow') A.slow(true);
    if (k === 'slowEnd') A.slow(false);
    if (k === 'fling') {
      A.grind(p, 1);
      A.whoosh(p, 1);
    }
    if (k === 'pend') A.boom(p, 0.6);
    if (k === 'hit') {
      A.boom(p, 0.8);
      Cam.shake = Math.max(Cam.shake, 0.3);
    }
    if (k === 'jam') {
      A.clunk(p, 1.4);
      A.grind(p, 1);
      Sound.play('switch');
      Cam.shake = Math.max(Cam.shake, 0.35);
    }
    if (k === 'miss') A.grind(p, 0.7);
    if (p && k !== 'swept' && k !== 'thaw' && k !== 'slow' && k !== 'slowEnd')
      Fx.burst(p, k === 'bad' || k === 'miss' || k === 'hit' ? '#ff5a4a' : '#ffcf8a', k === 'jam' || k === 'six' ? 60 : 24, 4, 0.7, -2);
  };
  const both = (c, ev, pos, say) => {
    fx(ev, pos);
    c.send('d7fx', [ev, pos, say || null]);
    if (say) HUD.say(say, T.master, 2600);
  };
  const absP = (q) => [q.x + TrD7.O.x, q.y + TrD7.O.y, q.z + TrD7.O.z];
  // host side: an event that happened to `who`, shown to the other player
  const tellMate = (c, who, ev, pos, say) => {
    if (who === c.role) c.send('d7fx', [ev, pos, say || null]);
    else {
      fx(ev, pos);
      if (say) HUD.say(say, T.master, 2200);
    }
  };
  // host side: a message for `who` only
  const tellWho = (c, who, ev, pos, say) => {
    if (who !== c.role) c.send('d7fx', [ev, pos, say || null]);
    else {
      fx(ev, pos);
      if (say) HUD.say(say, T.master, 2200);
    }
  };

  // ---------- checkpoints ----------
  const spawnOf = (st, r) => {
    const W7 = TrD7;
    if (st === 1) return r === 'dame' ? W7.P(1.4, 0, 2) : W7.P(W7.CRANK_SPOT.x, W7.CRANK_SPOT.y, W7.CRANK_SPOT.z);
    if (st === 2) return W7.P(r === 'dame' ? -1.5 : 1.5, 0, 72);
    if (st === 3) return W7.P(r === 'dame' ? -1.5 : 1.5, 0, 145);
    if (st === 4) return W7.P(r === 'dame' ? -1.5 : 1.5, 7, 251);
    return W7.P(r === 'dame' ? -2 : 2, 7, 258);
  };
  const checkpoint = (c) => {
    const x = Story.S.x;
    const r = c.role;
    const W7 = TrD7;
    if (x.stage === 1) {
      const s1 = x.s1;
      if (r === 'dame') return s1.done ? W7.nicheSpot(0) : W7.nicheSpot(s1.from);
      return s1.done && local.cpV1 ? W7.P(0, 0, 10) : W7.P(W7.CRANK_SPOT.x, W7.CRANK_SPOT.y, W7.CRANK_SPOT.z);
    }
    if (x.stage === 2) {
      if (local.cp2 >= 2) return W7.P(0, 0, 139);
      if (local.cp2 >= 1) return W7.P(r === 'dame' ? -1.5 : 1.5, 0, 100);
      return spawnOf(2, r);
    }
    if (x.stage === 3) {
      if (local.cp3 >= 2) return W7.P(r === 'dame' ? -1.5 : 1.5, 7, 232);
      if (local.cp3 >= 1) return W7.P(r === 'dame' ? -1.5 : 1.5, 7, 183);
      return spawnOf(3, r);
    }
    return spawnOf(4, r);
  };

  // ---------- echo ----------
  const echoAt = (e, et) => {
    const pts = e.pts;
    const n = Math.floor(pts.length / 6);
    if (!n) return null;
    const f = clamp(et * ECHO_HZ, 0, n - 1);
    const i = Math.floor(f);
    const j = Math.min(n - 1, i + 1);
    const k = f - i;
    const g = (a, o) => pts[a * 6 + o];
    let yaw = g(i, 3);
    let dy = g(j, 3) - yaw;
    while (dy > Math.PI) dy -= TAU;
    while (dy < -Math.PI) dy += TAU;
    return {
      x: lerp(g(i, 0), g(j, 0), k),
      y: lerp(g(i, 1), g(j, 1), k),
      z: lerp(g(i, 2), g(j, 2), k),
      yaw: yaw + dy * k,
      speed: f >= n - 1 ? 0 : g(i, 4),
      gr: !!g(i, 5),
    };
  };
  const echoNow = (x) => {
    const e = x.s2 && x.s2.echo;
    if (!e) return null;
    if (e.go == null) {
      const p = echoAt(e, 0);
      return p && { ...p, speed: 0, wait: true, who: e.who };
    }
    const p = echoAt(e, Math.max(0, local.clk - e.go));
    return p && { ...p, wait: false, who: e.who };
  };

  // ---------- part 4 attacks ----------
  const atkStart = (a) => {
    local.atk.push({ ...a, done: false, hitMe: false });
    if (local.atk.length > 8) local.atk.shift();
  };
  const sweepAng = (a, beat) => a.a0 + a.dir * TAU * clamp((beat - (a.b0 + 1)) / 3, 0, 1);
  const ringR = (a, beat) => (beat - (a.b0 + 2)) * local.bp * 11;

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    const W7 = TrD7;
    if (st === 1) {
      HUD.objective(TXT.r1[r]);
      W7.screen.show(CARD, TITLE, '#ffcf8a');
    }
    if (st === 2) {
      HUD.objective(TXT.r2);
      HUD.say(TXT.rule2, T.master, 5200);
      Sound.play('door');
      W7.screen.show('L’Écho', 'dix secondes de toi', '#ffcf8a');
    }
    if (st === 3) {
      local.t3 = 0;
      HUD.objective(TXT.r3[r]);
      Sound.play('door');
    }
    if (st === 4) {
      HUD.objective(TXT.r4);
      HUD.say(TXT.r4, T.master, 5600);
      Sound.mood('tense');
    }
    if (st === 5) {
      HUD.objective(null);
      Sound.mood('calm');
      local.endT = 0;
    }
    if (prev && st > prev) {
      const q = W7.rel(Player.body.p);
      const behind =
        (st === 2 && q.z < 61) || (st === 3 && q.z < 140) || (st === 4 && (q.z < 226 || q.y < 5)) || (st === 5 && !W7.inArena(q));
      if (behind) c.spawn(spawnOf(st, r), 0);
      local.cp2 = 0;
      local.cp3 = 0;
    }
  };

  // what the world draws this frame
  const view = (c, x) => {
    const r = c.role;
    const s1 = x.s1;
    const aMin = (((local.m % 60) + 60) % 60) / 5;
    const aHr = (((local.m % 720) + 720) % 720) / 60;
    const gates = [];
    for (let h = 0; h < 12; h++) {
      const al = TrD7.hourDist(aMin, h) < 0.16;
      gates.push(al || (s1.done && (h === 6 || h === 0)) ? 1 : 0);
    }
    const tg = r === 'valet' && x.stage === 1 && s1.round < 3 ? s1.tg[s1.round] : -1;
    const ep = x.stage >= 2 && x.stage <= 3 ? echoNow(x) : null;
    let rec = null;
    if (x.s2 && x.s2.rec && x.stage === 2) {
      const who = x.s2.rec.who;
      const p = who === r ? Player.body.p : Remote.pos;
      rec = { p, k: clamp((local.clk - x.s2.rec.t0) / ECHO_LEN, 0, 1) };
    }
    const slowF = local.slowT > 0 ? SLOW_F : 1;
    const stopped = x.stage === 5;
    const b4 = {
      beat: local.beat,
      stopped,
      frozenAng: x.s4.ang || 0,
      jam: x.s4.jam,
      brake: [0, 1, 2].map((i) => (local.holds.dame === 'b' + i || local.holds.valet === 'b' + i ? 1 : 0)),
      brakeK: local.brk.map((v) => v / BRAKE_T),
      hold: [0, 1, 2].flatMap((i) => [
        local.holds.dame === 'b' + i || local.holds.valet === 'b' + i ? 1 : 0,
        local.holds.dame === 'w' + i || local.holds.valet === 'w' + i ? 1 : 0,
      ]),
      won: stopped ? Math.max(0, local.endT - 5) * 0.4 : 0,
      endT: stopped ? local.endT : -1,
      cardOn: stopped && local.endT > 6,
      cardT: local.cardT,
      faceMin: stopped ? local.faceMin : null,
    };
    if (x.stage === 4) {
      // weights, sweep and rings from the attack list
      const wts = [];
      let sweep = null;
      const rings = [];
      let raise = 0;
      let sweepRaise = 0;
      local.atk.forEach((a) => {
        const k = (local.beat - a.b0) / 2;
        if (a.t === 'w' && k > -0.1 && k < 2.2 && wts.length < 3) {
          wts.push({ x: a.x, z: a.z, k });
          if (k < 1) raise = Math.max(raise, clamp(k * 1.5, 0, 1));
        }
        if (a.t === 's') {
          const db = local.beat - a.b0;
          if (db >= 0 && db < 4) {
            sweep = { a: db < 1 ? a.a0 : sweepAng(a, local.beat), k: db < 1 ? -1 : 1 };
            sweepRaise = db < 1 ? 1 : 0.3;
          }
        }
        if (a.t === 'r') {
          const rr = ringR(a, local.beat);
          if (rr > -local.bp * 11 && rr < 44 && rings.length < 2) rings.push({ r: Math.max(0, rr) });
        }
      });
      b4.weights = wts;
      b4.sweep = sweep;
      b4.rings = rings;
      b4.raise = raise;
      b4.sweepRaise = sweepRaise;
    }
    return {
      stage: x.stage,
      m: local.m,
      aMin,
      aHr,
      crankA: local.m * 0.35,
      gates,
      target: tg,
      curtains: r === 'dame' && x.stage === 1 && s1.round < 3 ? s1.cur : null,
      coneDown: s1.done,
      exitOpen: s1.done,
      plates: local.plates,
      bridge: local.bridge,
      gates2: local.gates2,
      echo: ep && { ...ep, look: kitLook(c, ep.who) },
      rec,
      fallT: local.fallT,
      frozenK: local.fallT > 0 ? 0 : 1,
      levers: {
        J1: local.holds.valet === 'J1' || local.holds.dame === 'J1',
        J2: local.holds.valet === 'J2' || local.holds.dame === 'J2',
        J3: local.holds.valet === 'J3' || local.holds.dame === 'J3',
      },
      locked: x.s3.lock,
      discA: local.discA,
      discW: local.discW * slowF,
      pend: [0, 1].map((i) => PEND_A * Math.sin(TAU * local.pendPh + i * 1.9)),
      pendBlur: slowF < 1 ? 0.2 : 1,
      slowK: x.stage === 3 ? clamp(local.slowT, 0, 0.4) / 0.4 : 0,
      moteT: local.moteT,
      stopped,
      b4,
    };
  };

  Story.register('tr_d7', {
    world: TrD7,
    init: () => {
      const tg = pickTargets();
      return {
        stage: 1,
        s1: { round: 0, from: 6, tg, cur: curtainsFor(6, tg[0]), dir: 1, done: false },
        s2: { latch: false, echo: null, rec: null, en: 0 },
        s3: { lock: false },
        s4: { jam: [0, 0, 0], ang: 0 },
      };
    },
    voice: () => 1,
    net: {
      d7fx: (c, d) => {
        if (!TrD7.built) return;
        fx(d[0], d[1]);
        if (d[2]) HUD.say(d[2], T.master, 2600);
      },
      d7a: (c, d) => {
        if (Net.isHost || !TrD7.built) return;
        const [clk, m, mv, hd, hv, br, plates, gates2, fallT, discA, discW, pendPh, slowT, beat, bp, slowCd] = d;
        local.slowCd = slowCd || 0;
        const dc = clk - local.clk;
        local.clk = Math.abs(dc) > 0.5 ? clk : local.clk + dc * 0.2;
        local.mv = mv;
        local.m += (m - local.m) * (Math.abs(m - local.m) > 8 ? 1 : 0.3);
        local.holds.dame = hd;
        local.holds.valet = hv;
        local.bridge = br;
        local.plates = plates;
        local.gates2 = gates2;
        local.fallT = fallT;
        local.discA += (discA - local.discA) * 0.3;
        local.discW = discW;
        local.pendPh += (pendPh - local.pendPh) * 0.3;
        local.slowT = slowT;
        local.beat += (beat - local.beat) * (Math.abs(beat - local.beat) > 1 ? 1 : 0.25);
        local.bp = bp;
      },
      d7jam: (c, d) => {
        if (!TrD7.built) return;
        TrD7.fx.steam(d[0]);
        TrD7.fx.stagger();
      },
      d7atk: (c, d) => {
        if (Net.isHost || !TrD7.built) return;
        atkStart(d);
      },
    },
    async enter(c, first) {
      // a replay or a resume starts clean (the held fast-forward, the clock, the attacks...)
      for (const k in local) delete local[k];
      Object.assign(local, fresh());
      if (!first) await fadeTo(true);
      TrD7.build();
      TrD7.wake();
      TrD7.au.init();
      const x = c.S.x;
      local.endPhase = null;
      local.cardT = 0;
      local.roundWas = null;
      local.doneWas = null;
      local.echoN = null;
      local.latchWas = null;
      local.lockWas = null;
      local.atkFrom = null;
      local.hostBeat = null;
      local.cpV1 = false;
      c.spawn(x.stage === 1 ? spawnOf(1, c.role) : checkpoint(c), 0);
      Player.killY = TrD7.O.y - 12;
      Player.checkpoint = () => checkpoint(c);
      Player.targets = null;
      Player.grappleLand = null;
      City.mood({ gold: 1 });
      c.fog(0.0105);
      local.env = {
        hemi: R.hemi.intensity,
        hc: R.hemi.color.clone(),
        hg: R.hemi.groundColor.clone(),
        moon: R.moon.intensity,
        mc: R.moon.color.clone(),
        mp: R.moon.position.clone(),
      };
      R.hemi.intensity = 0.58;
      R.hemi.color.set('#ffd2a0');
      R.hemi.groundColor.set('#3a1a10');
      R.moon.intensity = 0.7;
      R.moon.color.set('#ffc58a');
      R.moon.position.set(-40, 90, 60);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (x.stage === 1) {
        HUD.say(TXT.intro, T.master, 4000);
        HUD.say(TXT.hint[c.role], T.master, 4400);
        HUD.say(TXT.rule1, T.master, 5000);
      }
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      if (Player.mode === 'frozen') Player.mode = 'walk';
      TrD7.sleep();
      TrD7.au.duck = 1;
      Sound.volume(SETTINGS.vol);
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.hemi.color.copy(local.env.hc);
        R.hemi.groundColor.copy(local.env.hg);
        R.moon.intensity = local.env.moon;
        R.moon.color.copy(local.env.mc);
        R.moon.position.copy(local.env.mp);
        local.env = null;
      }
      City.mood({});
    },
    apply(c) {
      if (!TrD7.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      const s1 = x.s1;
      if (x.stage === 1) HUD.visa(s1.round < 3 ? `${CARD} · Heure ${s1.round + 1} / 3` : CARD + ' · Six heures');
      else if (x.stage === 2) HUD.visa(x.s2.latch ? CARD + ' · La galerie' : CARD + ' · L’Écho');
      else if (x.stage === 3) HUD.visa(x.s3.lock ? CARD + ' · L’Accélération' : CARD + ' · Le Gel');
      else if (x.stage === 4) HUD.visa(`${CARD} · Engrenages ${x.s4.jam.filter(Boolean).length} / 3`);
      else HUD.visa(CARD + ' · ' + TITLE);
      // round changes: the walker's niche is the new checkpoint; texts per role
      if (local.roundWas != null && s1.round !== local.roundWas && x.stage === 1) {
        if (s1.round === 3) {
          HUD.objective(c.role === 'valet' ? TXT.finalV : Story.fmt(TXT.finalD));
          HUD.say(TXT.reach[2], T.master, 2400);
        } else {
          HUD.say(TXT.reach[s1.round - 1] || TXT.newTarget, T.master, 2400);
          if (c.role === 'valet') HUD.say(`L’heure qui brille : ${TrD7.ROMAN[s1.tg[s1.round]]}.`, T.master, 2600);
        }
      }
      local.roundWas = s1.round;
      if (local.doneWas === false && s1.done) {
        HUD.objective(TXT.cross[c.role]);
      }
      local.doneWas = s1.done;
      if (local.echoN != null && x.s2.en !== local.echoN && x.s2.echo) {
        if (x.s2.echo.go == null) {
          HUD.say(TXT.echoReady, T.master, 2200);
          TrD7.au.shimmer(null, false);
        } else {
          HUD.say(TXT.echoGo, T.master, 1600);
          TrD7.au.shimmer(null, true);
        }
      }
      local.echoN = x.s2.en;
      if (local.latchWas === false && x.s2.latch) HUD.objective(TXT.lane);
      local.latchWas = x.s2.latch;
      if (local.lockWas === false && x.s3.lock) HUD.objective(TXT.r3b[c.role]);
      local.lockWas = x.s3.lock;
    },
    host(c, dt) {
      if (!TrD7.built) return;
      const W7 = TrD7;
      const x = c.S.x;
      const H = local.holds;
      const qd = W7.rel(c.pos('dame'));
      const qv = W7.rel(c.pos('valet'));
      local.clk += dt;
      // ----- part 1: the clock -----
      const s1 = x.s1;
      if (x.stage === 1) {
        const cranking = H.valet === 'crank';
        const fast = s1.round >= 3 && local.fastHold ? FAST : 1;
        if (cranking && !s1.done) local.mv = s1.dir * RATE * fast;
        else {
          let tgt = Math.round(local.m / 5) * 5;
          // last setting: a released crank close to six o'clock settles on it (the mechanism helps)
          if (s1.round >= 3 && !s1.done) {
            const off = ((((local.m - 360) % 720) + 1080) % 720) - 360;
            if (Math.abs(off) <= 12) tgt = local.m - off;
          }
          const d = tgt - local.m;
          const sp = RATE * 1.4;
          local.mv = Math.abs(d) < 0.02 ? 0 : clamp(d / Math.max(dt, 1e-3), -sp, sp);
          if (Math.abs(d) < 0.02) local.m = tgt;
        }
        local.m += local.mv * dt;
        if (s1.round < 3) {
          const tg = s1.tg[s1.round];
          if (W7.nicheAt(qd) === tg) {
            const nr = s1.round + 1;
            const pos = absP(W7.nicheSpot(tg).sub(W7.O));
            c.set((s) => {
              s.x.s1.round = nr;
              s.x.s1.from = tg;
              s.x.s1.cur = nr < 3 ? curtainsFor(tg, s.x.s1.tg[nr]) : [];
            });
            both(c, 'good', pos);
          }
        } else if (!s1.done && local.mv === 0) {
          const mm = ((local.m % 720) + 720) % 720;
          if (Math.abs(mm - 360) < 0.05) {
            c.set((s) => (s.x.s1.done = true));
            both(c, 'six', absP(V3(W7.C1.x, 2, W7.C1.z)), TXT.six);
          }
        }
        if (s1.done && qd.z > 62 && qv.z > 62 && qd.y > -2 && qv.y > -2) c.set((s) => (s.x.stage = 2));
      }
      // ----- part 2: plates, bridge, gates, echo -----
      if (x.stage === 2 || x.stage === 3) {
        const ep = echoNow(x);
        const bodies = [
          { p: qd, who: 'dame' },
          { p: qv, who: 'valet' },
        ];
        if (ep && !ep.wait) bodies.push({ p: ep, who: ep.who });
        const pl = [...W7.PL_A, W7.PL_F, ...W7.PL_B];
        const on = pl.map((p) => bodies.filter(({ p: b }) => Math.hypot(b.x - p.x, b.z - p.z) < 1.2 && Math.abs(b.y - p.y) < 1.0).map((b) => b.who));
        local.plates = on.map((w) => (w.length ? 1 : 0));
        // the two bridge plates want both of you: an echo counts as the one who recorded it, so
        // nobody holds both alone (the echo still helps: on one plate, or down the gallery)
        const pair = on[0].some((a) => on[1].some((b) => b !== a));
        if (local.plates[0] && local.plates[1] && !pair && !x.s2.latch) {
          if (!local.twoSaid) both(c, 'note', null, TXT.twoOfYou);
          local.twoSaid = 12;
        }
        local.twoSaid = Math.max(0, (local.twoSaid || 0) - dt);
        const want = x.s2.latch || pair ? 1 : 0;
        local.bridge = clamp(local.bridge + (want ? dt / 1.3 : -dt / 0.9), 0, 1);
        if (!x.s2.latch && local.plates[2] && local.bridge > 0.95) {
          c.set((s) => (s.x.s2.latch = true));
          both(c, 'latch', absP(V3(0, 0.5, 97)), TXT.latched);
        }
        for (let i = 0; i < 3; i++) {
          if (local.plates[3 + i]) local.g2T[i] = 0.45;
          else local.g2T[i] = Math.max(0, local.g2T[i] - dt);
          local.gates2[i] = local.g2T[i] > 0 ? 1 : 0;
        }
        if (x.stage === 2 && qd.z > 142.5 && qv.z > 142.5 && qd.y > -1 && qv.y > -1) c.set((s) => (s.x.stage = 3));
      }
      // ----- part 3: frozen debris, gears, pendulums, slowed time -----
      if (x.stage === 3) {
        local.t3 += dt;
        const frozen = x.s3.lock || H.valet === 'J1' || local.t3 < GRACE3;
        const before = local.fallT;
        local.fallT = frozen ? Math.max(0, local.fallT - dt * 2.5) : Math.min(5, local.fallT + dt);
        if (before === 0 && local.fallT > 0) both(c, 'thaw', null, TXT.thaw);
        const jam = H.dame === 'J2' || H.valet === 'J2' || H.dame === 'J3' || H.valet === 'J3';
        local.discW = jam ? Math.max(0, local.discW - 16 * dt) : Math.min(DISC_W, local.discW + 10 * dt);
        if (qd.z > 228.5 && qv.z > 228.5 && qd.y > 6 && qv.y > 6) c.set((s) => (s.x.stage = 4));
      }
      if (local.slowT > 0) {
        local.slowT -= dt;
        if (local.slowT <= 0) {
          local.slowT = 0;
          both(c, 'slowEnd', null);
        }
      }
      local.slowCd = Math.max(0, local.slowCd - dt);
      // ----- part 4: the beat, the attacks -----
      if (x.stage === 4) {
        const n = x.s4.jam.filter(Boolean).length;
        local.bp = BEATS[Math.min(2, n)];
        const b = Math.floor(local.beat);
        if (b !== local.hostBeat) {
          local.hostBeat = b;
          if (local.atkFrom == null) local.atkFrom = b + 4;
          if (b >= local.atkFrom && (b - local.atkFrom) % 3 === 0) {
            const kinds = n === 0 ? ['w'] : n === 1 ? ['w', 's', 'w'] : ['w', 's', 'r'];
            const t = kinds[local.atkN++ % kinds.length];
            const braker = ['dame', 'valet'].find((k) => /^b/.test(H[k] || ''));
            const tgtKit = braker && local.atkN % 3 !== 0 ? braker : local.atkN % 2 ? 'dame' : 'valet';
            const q = tgtKit === 'dame' ? qd : qv;
            let a = { t, b0: b + 1 };
            if (t === 'w') {
              const dx = q.x - W7.C4.x;
              const dz = q.z - W7.C4.z;
              const d = Math.hypot(dx, dz);
              const k = d > W7.AR - 2 ? (W7.AR - 2) / d : 1;
              a.x = +(W7.C4.x + dx * k).toFixed(2);
              a.z = +(W7.C4.z + dz * k).toFixed(2);
            }
            if (t === 's') {
              a.a0 = +(Math.atan2(q.x - W7.C4.x, q.z - W7.C4.z) + Math.PI).toFixed(3);
              a.dir = Math.random() < 0.5 ? 1 : -1;
            }
            atkStart(a);
            c.send('d7atk', a);
          }
        }
      }
      // fast state for the guest, ~15 Hz
      local.sendT += dt;
      if (local.sendT > 0.066) {
        local.sendT = 0;
        c.send('d7a', [
          +local.clk.toFixed(3),
          +local.m.toFixed(3),
          +local.mv.toFixed(3),
          H.dame,
          H.valet,
          +local.bridge.toFixed(3),
          local.plates,
          local.gates2,
          +local.fallT.toFixed(3),
          +local.discA.toFixed(3),
          +local.discW.toFixed(2),
          +local.pendPh.toFixed(4),
          +local.slowT.toFixed(2),
          +local.beat.toFixed(4),
          local.bp,
          +local.slowCd.toFixed(1),
        ]);
      }
      if (x.stage === 5 && local.cardT > 3 && W7.nearCard(qd) && W7.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'd7'));
    },
    action(c, who, d) {
      const x = c.S.x;
      const W7 = TrD7;
      if (d.a === 'hold') {
        if (d.k === 'crank' && who !== 'valet') return;
        if (d.k === 'J1' && who !== 'valet') return;
        local.holds[who] = d.k || null;
        if (d.f != null) local.fastHold = !!d.f;
        return;
      }
      if (d.a === 'dir' && x.stage === 1 && who === 'valet') c.set((s) => (s.x.s1.dir = -s.x.s1.dir));
      if (d.a === 'swept') tellMate(c, who, 'swept', d.p, TXT.sweptMate);
      if (d.a === 'recStart' && (x.stage === 2 || x.stage === 3)) c.set((s) => (s.x.s2.rec = { who, t0: +local.clk.toFixed(2) }));
      if (d.a === 'echo' && Array.isArray(d.pts) && d.pts.length >= 12) {
        c.set((s) => {
          s.x.s2.echo = { who, pts: d.pts, go: null };
          s.x.s2.rec = null;
          s.x.s2.en += 1;
        });
      }
      if (d.a === 'echoGo' && x.s2.echo && x.s2.echo.go == null)
        c.set((s) => {
          s.x.s2.echo.go = +local.clk.toFixed(2);
          s.x.s2.en += 1;
        });
      if (d.a === 'lock' && x.stage === 3 && !x.s3.lock) {
        c.set((s) => (s.x.s3.lock = true));
        both(c, 'lock', absP(W7.LOCK), TXT.locked);
      }
      if (d.a === 'slow' && x.stage === 3 && who === 'dame') {
        if (local.slowCd > 0 || local.slowT > 0) return;
        local.slowT = SLOW_T;
        local.slowCd = SLOW_T + SLOW_CD;
        both(c, 'slow', null, TXT.slowOn);
      }
      if (d.a === 'fling') tellMate(c, who, d.k === 'pend' ? 'pend' : 'fling', d.p, d.k === 'pend' ? TXT.pendMate : TXT.flungMate);
      if (d.a === 'hit4') tellMate(c, who, 'hit', d.p, TXT.hitMate);
      if (d.a === 'wedge' && x.stage === 4) {
        const i = d.i;
        if (x.s4.jam[i]) return;
        const other = who === 'dame' ? 'valet' : 'dame';
        const p = absP(W7.stPos(i, 16.5));
        p[1] += 2;
        if (local.holds[other] !== 'b' + i) {
          tellWho(c, who, 'miss', p, TXT.needBrake);
          return;
        }
        if (local.brk[i] < BRAKE_T - 0.08) {
          tellWho(c, who, 'miss', p, Story.fmt(TXT.spin));
          return;
        }
        if (Math.abs(d.e) <= JAM_WIN) {
          const n = x.s4.jam.filter(Boolean).length;
          c.set((s) => {
            s.x.s4.jam[i] = 1;
            if (n + 1 >= 3) {
              s.x.s4.ang = +(0.36 * Math.cos(Math.PI * local.beat)).toFixed(4);
              s.x.stage = 5;
            }
          });
          both(c, 'jam', p, n + 1 < 3 ? TXT.jam[n] : TXT.stop);
          c.send('d7jam', [i]);
          local.lastJam = i;
          TrD7.fx.steam(i);
          TrD7.fx.stagger();
        } else {
          both(c, 'miss', p, d.e < 0 ? TXT.early : TXT.late);
        }
      }
    },
    update(c, dt, t) {
      if (!TrD7.built) return null;
      const W7 = TrD7;
      const x = c.S.x;
      const r = c.role;
      const body = Player.body;
      if (window.__test) window.__d7 = local;
      W7.au.listener(R.camera);
      if (!Net.isHost) {
        // guests run the same clocks forward between packets
        local.clk += dt;
        if (x.stage === 1) local.m += local.mv * dt;
      }
      const slowF = local.slowT > 0 ? SLOW_F : 1;
      if (Net.isHost && x.stage === 3) {
        local.discA += local.discW * slowF * dt;
        local.pendPh += (dt / PEND_P) * slowF;
      } else if (!Net.isHost && x.stage === 3) {
        local.discA += local.discW * slowF * dt;
        local.pendPh += (dt / PEND_P) * slowF;
        if (local.slowT > 0) local.slowT = Math.max(0, local.slowT - dt * 0.5);
      }
      if (x.stage === 4) {
        local.beat += dt / local.bp;
        for (let i = 0; i < 3; i++) {
          const on = local.holds.dame === 'b' + i || local.holds.valet === 'b' + i;
          local.brk[i] = on ? Math.min(BRAKE_T, local.brk[i] + dt) : Math.max(0, local.brk[i] - dt * 0.6);
        }
      }
      local.moteT += dt * (x.stage === 5 ? 0 : x.stage === 3 ? (local.slowT > 0 ? 0.15 : local.fallT > 0 ? 1 : 0.08) : 1);
      const q0 = W7.rel(body.p);
      // ----- riding the minute hand (it moved after this frame's physics) -----
      const dm = local.m - local.lastM;
      local.lastM = local.m;
      if (x.stage === 1 && dm !== 0 && body.grounded && W7.onMinute(body)) {
        const da = (-(dm / 5) * Math.PI) / 6;
        const dx = q0.x - W7.C1.x;
        const dz = q0.z - W7.C1.z;
        const cs = Math.cos(da);
        const sn = Math.sin(da);
        body.p.x = W7.O.x + W7.C1.x + dx * cs + dz * sn;
        body.p.z = W7.O.z + W7.C1.z - dx * sn + dz * cs;
        Player.yaw += da;
      }
      // ----- riding / flung by the gear discs -----
      if (x.stage === 3 && body.grounded) {
        const di = W7.onDisc(q0);
        if (di >= 0) {
          const w = local.discW * slowF;
          const cdi = W7.DISCS[di];
          const dx = q0.x - cdi.x;
          const dz = q0.z - cdi.z;
          const rr = Math.hypot(dx, dz) || 0.01;
          if (w > FLING_W && local.hitCd <= 0) {
            local.hitCd = 1.2;
            const sgn = di ? -1 : 1;
            body.v.set((dx / rr) * 7 + (dz / rr) * 9 * sgn, 6, (dz / rr) * 7 - (dx / rr) * 9 * sgn);
            body.grounded = false;
            HUD.say(TXT.flung, T.master, 2000);
            fx('fling', absP(q0));
            c.act({ a: 'fling', p: absP(q0) });
          } else if (w > 0) {
            const da = local.discW * slowF * dt * (di ? -1 : 1);
            const cs = Math.cos(da);
            const sn = Math.sin(da);
            body.p.x = W7.O.x + cdi.x + dx * cs + dz * sn;
            body.p.z = W7.O.z + cdi.z - dx * sn + dz * cs;
            Player.yaw += da;
          }
        }
      }
      local.hitCd = Math.max(0, local.hitCd - dt);
      local.sweptCd = Math.max(0, local.sweptCd - dt);
      if (local.frozenT > 0) {
        local.frozenT -= dt;
        if (local.frozenT <= 0 && Player.mode === 'frozen') Player.mode = 'walk';
      }
      if (x.stage === 5) {
        local.endT += dt;
        endFrame(c, dt);
      }
      // ----- ticks: the tower keeps time (rate and pitch follow the time of each place) -----
      soundFrame(c, x, dt);
      W7.update(dt, t, view(c, x));
      const q = W7.rel(body.p);
      // my held station: sent whenever it changes
      const send = (k, f) => {
        if (k !== local.hold || (f != null && f !== local.fastWas)) {
          if (k && k !== local.hold) Sound.play('switch');
          local.hold = k;
          local.fastWas = f;
          c.act({ a: 'hold', k, f });
          if (Net.isHost) {
            local.holds[r] = k;
            if (f != null) local.fastHold = !!f;
          }
        }
      };
      if (Player.mode === 'frozen') {
        send(null);
        return null;
      }
      // ----- part 1 -----
      if (x.stage === 1) {
        const s1 = x.s1;
        if (W7.nearCrank(q)) {
          if (r !== 'valet') {
            send(null);
            if (Input.pressed('interact')) HUD.say(TXT.crankOnly, T.master, 2000);
            return ['E', 'La manivelle'];
          }
          if (s1.done) {
            send(null);
            return ['', 'L’horloge est réglée'];
          }
          const held = Input.held('interact');
          const fast = held && s1.round >= 3 && Input.held('sprint');
          send(held ? 'crank' : null, s1.round >= 3 ? fast : null);
          if (Input.pressed('ability')) c.act({ a: 'dir' });
          const dir = s1.dir > 0 ? 'sens horaire' : 'sens inverse';
          if (s1.round >= 3) return ['E', held ? `Ça tourne (${dir}) · F : sens · Maj : vite` : `Tourner : six heures pile (${dir}) · F : sens`, true];
          return ['E', held ? `Ça tourne (${dir}) · F : changer de sens` : `Tourner la manivelle (${dir}) · F : sens`, true];
        }
        send(null);
        // the walker on the hand: sand curtains sweep her away
        if (r === 'dame' && s1.round < 3 && local.sweptCd <= 0) {
          const p = W7.polar(q);
          const onHand = (W7.onMinute(body) || W7.onHour(body)) && q.y > -0.6 && q.y < 1.5;
          const hit = onHand && p.r > 2.2 && p.r < 17 && s1.cur.some((h) => W7.hourDist(p.a, h) < 0.3);
          if (hit) {
            local.sweptCd = 2.5;
            const d = W7.hourDir(p.a);
            body.v.set(d[0] * 6 + d[1] * 3, 4, d[1] * 6 - d[0] * 3);
            body.grounded = false;
            HUD.say(TXT.swept, T.master, 2200);
            fx('swept', absP(q));
            c.act({ a: 'swept', p: absP(q) });
          }
          // hiss near the curtains
          let near = 0;
          s1.cur.forEach((h) => {
            const dd = W7.hourDist(p.a, h);
            near = Math.max(near, clamp(1 - dd / 2.5, 0, 1) * clamp(1 - Math.abs(p.r - 9) / 14, 0, 1));
          });
          W7.au.hiss(near);
        } else W7.au.hiss(0);
        if (r === 'dame') {
          const ni = W7.nicheAt(q);
          if (ni >= 0 && ni !== local.inNiche && s1.round < 3 && ni !== s1.from && ni !== s1.tg[s1.round]) HUD.say(TXT.wrongNiche, T.master, 1600);
          local.inNiche = ni;
        }
        if (r === 'valet' && s1.done && q.z > 8) local.cpV1 = true;
        return null;
      }
      W7.au.hiss(0);
      // ----- part 2: the echo -----
      if (x.stage === 2 || x.stage === 3) {
        if (body.grounded) {
          if (q.z > 96.5 && q.z < 108.5 && q.y > -0.5) local.cp2 = Math.max(local.cp2, 1);
          if (q.z > 133 && q.x > -2 && q.x < 2) local.cp2 = Math.max(local.cp2, 2);
        }
        // recording: sample my body; F to start, F again to stop early, F to launch
        if (local.rec) {
          local.rec.t += dt;
          local.recSend -= dt;
          if (local.recSend <= 0) {
            local.recSend += 1 / ECHO_HZ;
            local.rec.pts.push(+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), +Player.yaw.toFixed(2), +Player.speed.toFixed(1), body.grounded ? 1 : 0);
          }
          const done = local.rec.t >= ECHO_LEN || (Input.pressed('ability') && local.rec.t > 1.5);
          if (done) {
            c.act({ a: 'echo', pts: local.rec.pts });
            local.rec = null;
          } else if (x.stage === 2) return ['F', `Enregistrement… ${Math.ceil(ECHO_LEN - local.rec.t)} s · F : arrêter`];
        } else if (x.stage === 2) {
          const e = x.s2.echo;
          if (e && e.go == null) {
            if (Input.pressed('ability')) c.act({ a: 'echoGo' });
            return ['F', 'Lancer l’écho'];
          }
          if (Input.pressed('ability')) {
            local.rec = { t: 0, pts: [] };
            local.recSend = 0;
            c.act({ a: 'recStart' });
            HUD.say(TXT.recStart, T.master, 1600);
            W7.au.shimmer(null, false);
            return null;
          }
          if (!x.s2.rec) return ['F', e ? 'Enregistrer un nouvel écho (10 s)' : 'Enregistrer un écho (10 s)'];
          return null;
        }
      }
      // ----- part 3 -----
      if (x.stage === 3) {
        if (body.grounded) {
          if (q.z > W7.LEDGE.z0 && q.z < W7.LEDGE.z1 && q.y > 6.5) local.cp3 = Math.max(local.cp3, 1);
          if (q.z > W7.FAR.z0 && q.y > 6.5) local.cp3 = Math.max(local.cp3, 2);
        }
        // pendulums: a hit throws you off the lane
        if (local.hitCd <= 0) {
          W7.PEND.forEach((zp, i) => {
            const a = PEND_A * Math.sin(TAU * local.pendPh + i * 1.9);
            const bx = Math.sin(a) * W7.PEND_L;
            const by = W7.PEND_Y - Math.cos(a) * W7.PEND_L;
            if (Math.abs(q.z - zp) < 1.85 && Math.abs(q.x - bx) < 1.3 && q.y < by + 0.95 && q.y + 1.75 > by - 0.95 && local.hitCd <= 0) {
              local.hitCd = 1.4;
              const sg = Math.cos(TAU * local.pendPh + i * 1.9) >= 0 ? 1 : -1;
              body.v.set(sg * 11, 5, 0);
              body.grounded = false;
              HUD.say(TXT.pendHit, T.master, 2000);
              fx('pend', absP(q));
              c.act({ a: 'fling', k: 'pend', p: absP(q) });
            }
          });
        }
        if (r === 'dame' && Input.pressed('ability')) {
          if (local.slowT > 0 || local.slowCd > 0) HUD.say(TXT.slowWait, T.master, 1400);
          else c.act({ a: 'slow' });
        }
        const lv = [
          ['J1', W7.J1],
          ['J2', W7.J2],
          ['J3', W7.J3],
        ].find(([k, p]) => W7.nearLever(q, p));
        if (lv) {
          const [k] = lv;
          if (k === 'J1' && x.s3.lock) {
            send(null);
            return ['', 'Le sablier tient le temps'];
          }
          if (k === 'J1' && r !== 'valet') {
            send(null);
            if (Input.pressed('interact')) HUD.say(TXT.heavy, T.master, 1800);
            return ['E', 'Le frein'];
          }
          const held = Input.held('interact');
          send(held ? k : null);
          return ['E', held ? (k === 'J1' ? 'Frein tenu : le temps reste figé' : 'Frein tenu : les engrenages s’arrêtent') : 'Tenir le frein (E maintenu)', true];
        }
        send(null);
        if (!x.s3.lock && W7.nearLever(q, W7.LOCK, 2.2)) {
          if (Input.pressed('interact')) c.act({ a: 'lock' });
          return ['E', 'Retourner le sablier'];
        }
        if (r === 'dame' && x.s3.lock && q.z > W7.LEDGE.z0 - 1) {
          const cd = local.slowCd;
          if (local.slowT > 0) return ['F', 'Le temps est ralenti'];
          return ['F', cd > 0 ? `Ralentir le temps (${Math.ceil(cd)} s)` : 'Ralentir le temps (3 s)'];
        }
        return null;
      }
      // ----- part 4: the Horloger -----
      if (x.stage === 4) {
        hitFrame(c, q, dt);
        if (Player.mode === 'frozen') return null;
        for (let i = 0; i < 3; i++) {
          if (x.s4.jam[i]) continue;
          const pb = W7.stPos(i, 14.4, -1.9);
          const pw = W7.stPos(i, 14.4, 1.9);
          if (Math.hypot(q.x - pb.x, q.z - pb.z) < 1.5) {
            const held = Input.held('interact');
            send(held ? 'b' + i : null);
            return ['E', held ? (local.brk[i] >= BRAKE_T - 0.08 ? 'Frein tenu · {mate} : la cale, sur le tac' : 'Ça freine… tiens bon') : 'Tenir le frein (E maintenu)', true];
          }
          if (Math.hypot(q.x - pw.x, q.z - pw.z) < 1.5) {
            send(null);
            const braked = local.holds[c.other] === 'b' + i;
            const ready = braked && local.brk[i] >= BRAKE_T - 0.08;
            if (Input.pressed('interact')) {
              if (!braked) HUD.say(TXT.fastGear, T.master, 1800);
              // distance to the nearest even beat, in seconds (notch up = even beat)
              const e = (local.beat - 2 * Math.round(local.beat / 2)) * local.bp;
              c.act({ a: 'wedge', i, e: +e.toFixed(3) });
            }
            return ['E', ready ? 'Enfoncer la cale quand l’encoche est en haut' : braked ? 'L’engrenage ralentit…' : 'La cale : il faut le frein d’abord'];
          }
        }
        send(null);
        return null;
      }
      send(null);
      return null;
    },
  });

  // part 4: my own hits (each client judges its own body on the shared beat)
  const hitFrame = (c, q, dt) => {
    const W7 = TrD7;
    const body = Player.body;
    const C4 = W7.C4;
    local.atk.forEach((a) => {
      if (a.hitMe) return;
      let hit = false;
      let from = null;
      if (a.t === 'w') {
        const strike = a.b0 + 2;
        if (local.beat >= strike && !a.done) {
          a.done = true;
          const p = [a.x + W7.O.x, C4.y + W7.O.y + 0.5, a.z + W7.O.z];
          W7.au.boom(V3(...p), 1);
          Fx.burst(V3(...p), '#ffcf8a', 40, 6, 0.8, -6);
          TrD7.fx.slam();
          const d = Math.hypot(q.x - a.x, q.z - a.z);
          if (d < 4 * 3) Cam.shake = Math.max(Cam.shake, 0.4 * (1 - d / 12));
          if (d < 3.0 && q.y < C4.y + 2.4) {
            hit = true;
            from = V3(a.x, 0, a.z);
          }
        }
      }
      if (a.t === 's') {
        const db = local.beat - a.b0;
        if (db >= 1 && db <= 4) {
          if (!a.wh) {
            a.wh = true;
            W7.au.whoosh(W7.P(C4.x, C4.y + 1, C4.z), 1.2);
          }
          const ang = sweepAng(a, local.beat);
          const dx = q.x - C4.x;
          const dz = q.z - C4.z;
          const rr = Math.hypot(dx, dz);
          let da = Math.atan2(dx, dz) - ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (rr > 0.8 && rr < W7.AR && Math.abs(da) < 0.5 / rr + 0.06 && q.y < C4.y + 0.85) {
            hit = true;
            from = V3(C4.x, 0, C4.z);
          }
        }
      }
      if (a.t === 'r') {
        const rr = ringR(a, local.beat);
        if (rr > 0 && !a.snd) {
          a.snd = true;
          W7.au.boom(W7.P(W7.BOSS.x, C4.y + 1, W7.BOSS.z - 4), 0.7);
        }
        const d = Math.hypot(q.x - W7.BOSS.x, q.z - W7.BOSS.z);
        if (rr > 0 && Math.abs(d - rr) < 0.6 && q.y < C4.y + 0.8) {
          hit = true;
          from = V3(W7.BOSS.x, 0, W7.BOSS.z);
        }
      }
      if (hit && local.hitCd <= 0) {
        a.hitMe = true;
        local.hitCd = 1.2;
        const dx = q.x - from.x;
        const dz = q.z - from.z;
        const d = Math.hypot(dx, dz) || 1;
        body.v.set((dx / d) * 6, 3.6, (dz / d) * 6); // stays under the railing
        body.grounded = false;
        Player.mode = 'frozen';
        local.frozenT = 0.8;
        HUD.say(TXT.hit, T.master, 1400);
        fx('hit', absP(q));
        c.act({ a: 'hit4', p: absP(q) });
      }
    });
  };

  // the tower's ticking, per place
  const soundFrame = (c, x, dt) => {
    const W7 = TrD7;
    const A = W7.au;
    local.tickAcc = local.tickAcc || 0;
    if (x.stage === 1) {
      A.drone(0.6, 1);
      local.tickAcc += dt;
      if (local.tickAcc >= 1) {
        local.tickAcc -= 1;
        local.tockN = (local.tockN || 0) + 1;
        A.tick(W7.P(W7.C1.x, 4, W7.C1.z), local.tockN % 2 === 0, 1.1);
      }
      const notch = Math.floor(local.m / 5);
      if (local.notch != null && notch !== local.notch) {
        A.ratchet(W7.P(W7.CRANK.x, W7.CRANK.y + 1.3, W7.CRANK.z), 1);
        A.ratchet(W7.P(W7.C1.x, 0.5, W7.C1.z), 0.6);
      }
      local.notch = notch;
    } else if (x.stage === 2) {
      A.drone(0.4, 1);
      local.tickAcc += dt;
      if (local.tickAcc >= 1) {
        local.tickAcc -= 1;
        local.tockN = (local.tockN || 0) + 1;
        A.tick(W7.P(-40, 6, 112), local.tockN % 2 === 0, 0.7, 0.9);
      }
    } else if (x.stage === 3) {
      const slow = local.slowT > 0;
      const q = W7.rel(Player.body.p);
      const fastZone = q.z > W7.LEDGE.z0 + 4;
      const frozen = !fastZone && local.fallT === 0;
      A.drone(fastZone ? 0.8 : 0.3, slow ? 0.35 : fastZone ? 1.6 : frozen ? 0.5 : 1);
      const rate = fastZone ? (slow ? 1.2 : 9) : frozen ? 0 : 2;
      local.tickAcc += dt * rate;
      if (local.tickAcc >= 1) {
        local.tickAcc = Math.min(1, local.tickAcc - 1);
        local.tockN = (local.tockN || 0) + 1;
        A.tick(fastZone ? W7.P(0, 10, 210) : W7.P(0, 6, 165), local.tockN % 2 === 0, fastZone ? 0.6 : 0.8, slow ? 0.55 : fastZone ? 1.25 : 1);
      }
      if (local.slowWas && !slow) fx('slowEnd', null);
      local.slowWas = slow;
    } else if (x.stage === 4) {
      A.drone(0.7, 0.9);
      const b = Math.floor(local.beat);
      if (b !== local.lastBeat) {
        local.lastBeat = b;
        const pp = W7.pendPos(local.beat, false, 0);
        A.tick(pp, b % 2 === 0, 1.6, b % 2 === 0 ? 0.8 : 1);
      }
    } else A.drone(0, 1);
  };

  // the end: silence, one note, the hour of their meeting, the card
  const endFrame = (c, dt) => {
    const W7 = TrD7;
    const A = W7.au;
    const e = local.endT;
    if (local.endPhase == null) local.endPhase = 0;
    if (local.endPhase === 0) {
      local.endPhase = 1;
      A.duck = 0;
      A.stopAll();
      Sound.volume(SETTINGS.vol * 0.12);
      Cam.shake = Math.max(Cam.shake, 0.4);
      local.faceMin = ((performance.now() / 1000) * 3) % 720;
      HUD.say(TXT.stop, T.master, 2000);
    }
    if (local.endPhase === 1 && e > 2.6) {
      local.endPhase = 2;
      A.duck = 1;
      A.note();
    }
    if (e > 3) {
      const goal = MEET.h * 60 + MEET.m + 720 * 2;
      local.faceMin = damp(local.faceMin, goal, 0.9, dt);
    }
    if (local.endPhase === 2 && e > 4.6) {
      local.endPhase = 3;
      HUD.say(TXT.meet, T.master, 4600);
    }
    if (e > 6 && e < 9) Sound.volume(SETTINGS.vol * (0.12 + 0.88 * clamp((e - 6) / 3, 0, 1)));
    if (local.endPhase === 3 && e > 6) {
      local.endPhase = 4;
      Sound.volume(SETTINGS.vol * 0.3);
      HUD.objective(TXT.card);
      HUD.say(TXT.card, T.master, 3000);
      Sound.play('reveal');
      Sound.play('heart');
      HUD.visa(CARD + ' · ' + TITLE);
    }
    if (e > 6) local.cardT += dt;
    if (e > 9 && local.endPhase === 4) {
      local.endPhase = 5;
      Sound.volume(SETTINGS.vol);
    }
  };
})();
