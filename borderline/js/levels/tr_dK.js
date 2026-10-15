// ♦ R · Le Roi de Carreau (figure dK, card ♦ R), the last face of the ♦ table of the Cour. Kits as
// usual (Yoline: dame, William: valet). La Coupole: the Roi hides a code of four different gems
// out of five colours. Four slots: I and II are the dame's, III and IV the valet's (E cycles a
// slot's gem); each pulls their own lever, and the guess is weighed once both have. The Roi
// answers in two halves: gold (right gem, right place) on the dame's screen and board, silver
// (right gem, wrong place) on the valet's. Seven guesses; then he deals a new code and, a good
// sport, shows one of its gems. Won: the three figures lay down their cards (cinematic
// js/cine/cour_d.js), then the reward (through the short phase 'tr_dKw').
(() => {
  const CARD = Cards.tagOf('dK');
  const T = CONFIG;
  const W = CourD;
  const TITLE = 'Le Roi de Carreau';
  const ROI = 'Le Roi de Carreau';
  const TRIES = 7;
  const TXT = {
    intro: 'Dernière figure de Carreau. Sous la coupole, le Roi garde un code.',
    rule: 'Il répond à chacun de vous, et jamais la même chose.',
    go: 'Entrez sous la Coupole.',
    fall: 'Le vide. Retour à l’entrée de la coupole.',
    fallMate: '{mate} est tombé{pe}. {Il} repart de l’entrée de la coupole.',
    objD: 'Tes socles : I et II, à gauche (E change la gemme). Puis tire ton levier. Tu vois l’or, {mate} voit l’argent. Essais : {n} / 7.',
    objV: 'Tes socles : III et IV, à droite (E change la gemme). Puis tire ton levier. Tu vois l’argent, {mate} voit l’or. Essais : {n} / 7.',
    set: 'Changer la gemme {n} ({c})',
    setEmpty: 'Poser une gemme sur le socle {n}',
    shown: 'Gemme {n} : montrée par le Roi',
    notMine: 'Ce socle est à {mate}.',
    pull: 'Tirer ton levier : proposer',
    first: 'Pose d’abord tes deux gemmes.',
    waiting: 'Ta proposition est posée. {mate} doit tirer son levier.',
    waitMate: '{mate} a tiré son levier : à toi.',
    leverMine: 'Ce levier est à {mate}.',
    gold: 'Or : {n}',
    silver: 'Argent : {n}',
    goldSay: 'Le Roi te répond en or : {n}. Dis-le à {mate}.',
    silverSay: 'Le Roi te répond en argent : {n}. Dis-le à {mate}.',
    hint1: 'À chaque réponse, dites-vous vos marques : l’or de l’un, l’argent de l’autre.',
    hint2: 'Changez une ou deux gemmes à la fois : vous saurez lesquelles comptent.',
    done: 'Le code du Roi, en entier. Le Roi de Carreau s’incline.',
    // the Roi's own lines (playful, never cruel)
    k: {
      hello: 'Approchez. Je suis le Roi de Carreau, et j’ai un code.',
      rules: 'Quatre gemmes, toutes différentes, parmi cinq couleurs. Proposez : je réponds en or à l’un, en argent à l’autre.',
      gold: 'À toi l’or : une gemme juste, à sa juste place.',
      silver: 'À toi l’argent : une bonne gemme, mais pas à sa place.',
      muse: ['Hmm.', 'Intéressant.', 'Je compte. Comptez avec moi.', 'Vous chauffez… ou pas. Demandez-vous.'],
      lost: 'Sept essais. Je change mon code… et, beau joueur, je vous en montre une pierre.',
      won: 'Mon code, en entier. Ma table est à vous.',
    },
  };
  CONFIG.cards.dK = {
    title: TITLE,
    sub: 'Figure ♦ · réussie',
    lines: ['Quatre gemmes, cinq couleurs, et un Roi qui répondait en deux moitiés.', 'L’un de vous voyait l’or, l’autre l’argent.', 'Le code est tombé quand vous avez tout mis en commun.'],
  };

  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const local = { stage: 0, pend: [], sayCd: {}, objT: 0, hints: {}, resSeen: 0, cd: 0, winT: 0, cutGo: false };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- words ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const ksay = (text, hold) => {
    HUD.say(text, ROI, hold || 2800);
    W.talk('R', Math.min(3, (hold || 2800) / 1000));
    W.AU.ping(74, 0.03);
  };
  const ksayBoth = (c, text, hold) => {
    ksay(text, hold);
    c.send('dKsay', [text, 1, hold || 2800]);
  };
  const sayOnce = (k, text, cd = 8) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'set') {
      W.pulseSlot(a);
      W.AU.ping(72 + a * 3, 0.035);
      Sound.play('tile');
    }
    if (k === 'lever') {
      W.ST.lever[a] = 1;
      Sound.play('switch');
      after(0.8, () => (W.ST.lever[a] = 0));
    }
    if (k === 'weigh') {
      Sound.play('reveal');
      [0, 1, 2, 3].forEach((i) => {
        W.pulseSlot(i);
        after(0.15 * i, () => W.AU.ping(76 + i * 2, 0.04));
      });
      Fx.burst(W.P(0, 3.2, 104), '#ffd89a', 60, 3, 1, -2);
    }
    if (k === 'lost') {
      Sound.play('glitch');
      Sound.play('rumble', 0.4);
    }
    if (k === 'won') {
      Sound.play('reveal');
      Sound.play('chime');
      Fx.burst(W.P(0, 3.2, 104), '#ffcf6a', 260, 8, 2, -2);
      after(0.8, () => Fx.firework(W.P(-6, 0, 106), 20));
      after(1.5, () => Fx.firework(W.P(6, 0, 106), 22));
      W.bolt(W.P(0, 160, 160), W.P(0, 20, 106), { gold: true, w: 0.4, flash: 1.1, branches: 4 });
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('dKfx', d);
  };

  // ---------- the code (host) ----------
  const newCode = () => {
    const a = [0, 1, 2, 3, 4];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 4);
  };
  const score = (g, code) => {
    let b = 0;
    const cg = [0, 0, 0, 0, 0];
    const cc = [0, 0, 0, 0, 0];
    g.forEach((v, i) => {
      if (v === code[i]) b++;
      cg[v]++;
      cc[code[i]]++;
    });
    let both = 0;
    for (let k = 0; k < 5; k++) both += Math.min(cg[k], cc[k]);
    return { b, w: both - b };
  };
  const revealed = (x, i) => (x.reveal || []).find((r) => r[0] === i);

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 1) return TXT.go;
    if (x.stage === 3) return '';
    return fill(c.role === 'dame' ? TXT.objD : TXT.objV, { n: (x.hist || []).length });
  };

  // ---------- light and mood ----------
  const mood = (c, won) => {
    LvKit.mood({
      sky: '#d0a870',
      ground: '#2a1c14',
      hemi: won ? 0.5 : 0.36,
      sun: '#ffd8a0',
      sunI: won ? 0.7 : 0.45,
      sunPos: V3(30, 90, 40),
      exposure: won ? 1.25 : 1.15,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(won ? '#3a2a20' : '#2a1e1c');
    c.fog(won ? 0.0052 : 0.0064);
    Sound.mood(won ? 'gold' : 'tense');
  };

  const nearSlot = (q) => {
    let bi = -1;
    let bd = 1.9;
    W.SLOTS.forEach((s) => {
      const d = Math.hypot(q.x - s.x, q.z - s.z);
      if (d < bd && q.y < 1.5) {
        bd = d;
        bi = s.i;
      }
    });
    return bi;
  };
  const atLever = (q, who) => Math.hypot(q.x - W.LEVERS_C[who][0], q.z - W.LEVERS_C[who][1]) < 2 && q.y < 1.5;
  const mySet = (x, who) => W.SLOTS.filter((s) => s.who === who).every((s) => x.slots[s.i] >= 0);

  Story.register('tr_dK', {
    init: () => ({ stage: 1, cp: 'K', code: newCode(), cn: 1, hist: [], slots: [-1, -1, -1, -1], ready: { dame: 0, valet: 0 }, res: null, lost: 0, reveal: [], won: 0 }),
    voice: () => 1,
    net: {
      dKsay: (c, d) => (d[1] ? ksay(d[0], d[2]) : say(d[0], d[2])),
      dKfx: (c, d) => fx(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.setup('K');
      Object.assign(local, { stage: 0, pend: [], sayCd: {}, objT: 0, hints: {}, resSeen: c.S.x.res ? c.S.x.res.n : 0, cd: 0, winT: 0, cutGo: false, readySeen: { dame: 0, valet: 0 } });
      c.spawn(W.spawn(c.S.x.cp, c.role), 0);
      Player.killY = W.O.y - 22;
      Player.checkpoint = () => {
        say(TXT.fall, 2400);
        c.send('dKsay', [TXT.fallMate, 0, 2600]);
        return W.spawn(Story.S.x.cp, c.role);
      };
      mood(c, c.S.x.won);
      after(0.6, () => Story.S && Story.S.phase === 'tr_dK' && mood(c, Story.S.x.won));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · la Coupole', '#ffcf7a');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        say(TXT.intro, 3600);
        say(TXT.rule, 3800);
      }
      this.apply(c);
      W.snap();
    },
    exit() {
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
            ksay(TXT.k.hello, 3000);
            after(3.2, () => ksay(TXT.k.rules, 5200));
            after(8.8, () => ksay(r === 'dame' ? TXT.k.gold : TXT.k.silver, 4200));
          });
        }
        if (x.stage === 3) {
          mood(c, true);
          say(TXT.done, 3000);
          after(0.6, () => ksay(TXT.k.won, 3400));
        }
      }
      if (x.res && x.res.n !== local.resSeen) {
        local.resSeen = x.res.n;
        const k = x.res;
        if (!k.ok) {
          const n = r === 'dame' ? k.b : k.w;
          after(0.6, () => W.big(fill(r === 'dame' ? TXT.gold : TXT.silver, { n }), 2.4, r === 'dame' ? '#ffc040' : '#dfe8ff'));
          after(0.6, () => W.talk('R', 1.2));
          after(2.9, () => say(Story.fmt(fill(r === 'dame' ? TXT.goldSay : TXT.silverSay, { n })), 3200));
          if (k.lost) after(4.4, () => ksay(TXT.k.lost, 4200));
        }
      }
      const rd = x.ready || {};
      const m = mateRole(r);
      if (rd[m] && !local.readySeen[m] && !rd[r] && x.stage === 2) say(Story.fmt(TXT.waitMate), 2400);
      local.readySeen = { dame: rd.dame || 0, valet: rd.valet || 0 };
      // the world follows the shared state
      const S = W.ST;
      S.gateA = 1;
      S.gateB = 1;
      S.slots = x.stage >= 2 ? x.slots.slice() : [-1, -1, -1, -1];
      W.figs.R.st.bow = x.won ? 1 : 0;
      W.board(x.hist || [], r === 'dame' ? 'gold' : 'silver', x.reveal || [], TRIES - (x.hist || []).length);
      HUD.objective(Story.fmt(objective(c)));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      if (x.stage === 1 && W.at('C', qd) && W.at('C', qv)) c.set((s) => (s.x.stage = 2));
      // won: the Roi bows, then the three figures lay down their cards (the cinematic), then the
      // reward (the short phase below hands it the card)
      if (x.stage === 3) {
        local.winT += dt;
        if (local.winT > 7 && !local.cutGo) {
          local.cutGo = true;
          c.goto('cut', (s) => {
            s.x.cut = 'cour_d';
            s.x.after = 'tr_dKw';
          });
        }
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (x.stage !== 2) return;
      const q = W.rel(c.pos(who));
      if (d.a === 'set') {
        const s = W.SLOTS[d.i];
        if (!s || s.who !== who || revealed(x, d.i)) return;
        if (Math.hypot(q.x - s.x, q.z - s.z) > 2.4) return;
        c.set((st) => {
          st.x.slots = st.x.slots.map((v, i) => (i === d.i ? (v + 1) % 5 : v));
          st.x.ready = Object.assign({}, st.x.ready, { [who]: 0 });
        });
        fxBoth(c, ['set', d.i]);
      }
      if (d.a === 'ready') {
        if (!atLever(q, who) || !mySet(x, who) || (x.ready || {})[who]) return;
        fxBoth(c, ['lever', who]);
        const rd = Object.assign({}, x.ready, { [who]: 1 });
        if (!(rd.dame && rd.valet)) {
          c.set((s) => (s.x.ready = rd));
          return;
        }
        // both levers: the Roi weighs the guess
        const g = x.slots.slice();
        const sc = score(g, x.code);
        const ok = sc.b === 4;
        const hist = [...(x.hist || []), { g, b: sc.b, w: sc.w }];
        const lost = !ok && hist.length >= TRIES;
        c.set((s) => {
          s.x.ready = { dame: 0, valet: 0 };
          s.x.res = { n: (s.x.res ? s.x.res.n : 0) + 1, b: sc.b, w: sc.w, ok: ok ? 1 : 0, lost: lost ? 1 : 0 };
          s.x.hist = hist;
          if (ok) {
            s.x.stage = 3;
            s.x.won = 1;
          }
        });
        fxBoth(c, ['weigh']);
        if (ok) {
          after(0.8, () => fxBoth(c, ['won']));
          return;
        }
        if (hist.length === 1 || hist.length === 4)
          after(1.8, () => ksayBoth(c, TXT.k.muse[(hist.length + (x.lost || 0)) % TXT.k.muse.length], 1600));
        if (lost) {
          // a new code; the Roi shows one of its gems (two after a second lost hand)
          after(5, () => {
            if (!Story.S || Story.S.phase !== 'tr_dK' || Story.S.x.stage !== 2) return;
            const code = newCode();
            const n = Math.min(2, (Story.S.x.lost || 0) + 1);
            const pos = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, n);
            c.set((s) => {
              s.x.code = code;
              s.x.cn = (s.x.cn || 1) + 1;
              s.x.lost = (s.x.lost || 0) + 1;
              s.x.hist = [];
              s.x.reveal = pos.map((i) => [i, code[i]]);
              s.x.slots = [0, 1, 2, 3].map((i) => (pos.includes(i) ? code[i] : -1));
              s.x.ready = { dame: 0, valet: 0 };
            });
            fxBoth(c, ['lost']);
          });
        }
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
      let prompt = null;
      const pressed = Input.pressed('interact');
      if (x.stage === 2) {
        const si = nearSlot(q);
        if (si >= 0) {
          const s = W.SLOTS[si];
          const n = W.ROMAN[si];
          const v = x.slots[si];
          if (revealed(x, si)) prompt = ['E', fill(TXT.shown, { n }), false];
          else if (s.who === r) {
            prompt = ['E', v < 0 ? fill(TXT.setEmpty, { n }) : fill(TXT.set, { n, c: W.GEMS[(v + 1) % 5].name }), false];
            if (pressed && !local.cd) {
              local.cd = 0.25;
              c.act({ a: 'set', i: si });
            }
          } else {
            prompt = ['E', Story.fmt(TXT.notMine), false];
            if (pressed) sayOnce('notMine', Story.fmt(TXT.notMine), 5);
          }
        }
        ['dame', 'valet'].forEach((w) => {
          if (!atLever(q, w)) return;
          if (w !== r) {
            prompt = ['E', Story.fmt(TXT.leverMine), false];
            return;
          }
          if ((x.ready || {})[r]) prompt = ['E', Story.fmt(TXT.waiting), false];
          else if (!mySet(x, r)) {
            prompt = ['E', TXT.first, false];
            if (pressed) sayOnce('first', TXT.first, 4);
          } else {
            prompt = ['E', TXT.pull, false];
            if (pressed && !local.cd) {
              local.cd = 1.2;
              c.act({ a: 'ready' });
            }
          }
        });
        const nh = (x.hist || []).length + (x.lost || 0) * TRIES;
        if (nh >= 1 && !local.hints.h1) {
          local.hints.h1 = true;
          after(6.5, () => say(TXT.hint1, 4200));
        }
        if (nh >= 4 && !local.hints.h2) {
          local.hints.h2 = true;
          after(6.5, () => say(TXT.hint2, 4200));
        }
      }
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

  // after the cinematic: straight to the reward of the Roi (a cinematic phase only knows the next
  // phase, not a card; this one hands the card over)
  Story.register('tr_dKw', {
    init: () => ({}),
    partner: () => false,
    hideRemote: () => true,
    enter() {
      HUD.objective('');
      Player.mode = 'frozen';
    },
    exit() {
      Player.mode = 'walk';
    },
    host(c) {
      c.goto('reward', (s) => (s.x.card = 'dK'));
    },
    update() {
      return null;
    },
  });
})();
