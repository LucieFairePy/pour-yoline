// ♥ 10 · Le Marché (épreuve h10b). The door of the Cour, in the rift above the storm: the Joker
// keeps a market of shortcuts in front of it, a foretaste of his last bargain. Every station offers
// one (a door for one, a « proof », a free card, the key), and the only way through is to refuse
// it, together. Kits as usual (Yoline: dame, William: valet).
//  1. Le Raccourci: both stand on a « Non » plate and hold E together; his door sends whoever
//     walks in back to the quay.
//  2. La Preuve: four curtains, one heart. The Joker only deals with the one without the
//     Capitaine's monocle and shows them a « proof » (a card behind the wrong curtain); the one
//     with the monocle sees the true curtain. Two hearts in a row, then the monocle changes eye.
//  3. Les Loges: a wall between you, a lever « Non » each, a clock each. One clock is the
//     Capitaine's watch, the other the Joker's (it lies, and so does its bell): both pull « Non »
//     at the true bell. Then the watch changes loge. « Prendre » takes his offer: the bell restarts.
//  4. La Porte: a glitching wall between your two lecterns. He asks three times; say « Non » (E)
//     at the same instant, counting together, while his own count and his tricks try to split you.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('h10b');
  const T = CONFIG;
  const W = H10;
  const TITLE = 'Le Marché';
  const TXT = {
    intro: 'Épreuve de confiance. Aux portes de la Cour, le Joker tient marché.',
    rule: 'Il vend des raccourcis. Une seule façon de gagner : refuser. Ensemble.',
    fall: 'Les nuages. Retour au dernier palier.',
    fallMate: '{mate} est tombé{pe} dans les nuages. {Il} repart du dernier palier.',
    left: 'à gauche',
    right: 'à droite',
    s1: {
      obj: 'Le Raccourci. Montez chacun sur une plaque « Non » et maintenez E, ensemble. N’entrez pas dans sa porte.',
      plate: 'Maintenir : « Non »',
      alone: 'Tu dis non. Il faut que {mate} le dise aussi, sur l’autre plaque.',
      took: 'Sa porte te ramène au quai. Tout droit… au début.',
      tookMate: '{mate} a pris le raccourci : {il} est revenu{pe} au quai.',
      done: 'Sa porte se brise. La grille s’ouvre sur l’Allée des étals.',
      hint: 'Ne prenez rien. Chacun sur une plaque « Non », et E maintenu en même temps.',
      alley: 'L’Allée des étals. Rejoignez la place, plus loin, de pierre en pierre.',
    },
    s2: {
      intro: 'La Preuve. Derrière un seul de ces quatre rideaux, un cœur. Derrière les autres, le Joker.',
      monoMe: 'Le Capitaine t’a laissé son monocle : il voit à travers les tours du Joker.',
      monoMate: 'Le Capitaine a laissé son monocle à {mate} : il voit à travers les tours du Joker.',
      go: 'Avancez ensemble jusqu’au milieu de la place.',
      chooser: 'Le Joker ne traite qu’avec toi : tire le cordon d’un rideau (E). Il va te « prouver » où est le cœur. Il ment. Écoute {mate}.',
      seer: 'Avec le monocle, tu vois le vrai rideau (le cœur rose) et le mensonge du Joker. Guide {mate} : {il} seul{pe} peut tirer.',
      pull: 'Tirer le cordon du rideau {n}',
      bigHeart: 'Un cœur',
      bigJoker: 'Le Joker !',
      wrong: 'Le Joker jaillit de sa boîte. On rebat les rideaux.',
      half: 'Deux cœurs de suite. Passez-vous le monocle : E près de {mate}.',
      give: 'Passer le monocle à {mate}',
      takeMono: 'Prendre le monocle de {mate}',
      passed: 'Le monocle change d’œil. Deuxième manche.',
      late: 'Trop lent. Le Joker rebat les rideaux.',
      notMine: 'C’est à {mate} de tirer : le Joker ne traite qu’avec {lui}.',
      hint: 'Le monocle ne ment pas. Crois ce que {mate} voit, pas ce que le Joker te montre.',
      done: 'Deux manches sans le croire. La grille du nord s’ouvre.',
      walk: 'Prenez le chemin des Loges, au nord de la place.',
      timer: 'L’offre expire · {n} s',
    },
    s3: {
      intro: 'Les Loges. Une chacun, un mur entre vous. Au coup de cloche, tirez « Non » en même temps.',
      go: 'Entre dans ta loge ({side}) et place-toi devant tes leviers.',
      watch: 'Tu as la montre du Capitaine : elle seule dit l’heure juste. Compte à voix haute pour {mate}, et tirez « Non » au coup de cloche.',
      liar: 'Ton horloge est celle du Joker : elle ment, et sa cloche aussi. Écoute le compte de {mate}, et tire « Non » avec {lui}.',
      wait: 'Restez devant vos leviers : le Joker remonte la cloche.',
      bigOk: 'Ensemble',
      bigMiss: 'Pas ensemble',
      bigTook: 'Pris…',
      ok: 'Ensemble, au coup de cloche. La cloche du Joker se fêle.',
      early: 'Pas au bon moment. Le Joker remonte son horloge.',
      late: 'Trop tard. Le Joker remonte son horloge.',
      leftLever: 'Restez à vos leviers pendant que la cloche tourne.',
      took: 'Une main a pris. La carte du Joker s’efface : on recommence.',
      swap: 'La montre change de loge.',
      done: 'Le mur entre vous s’enfonce dans le sol. La porte du fond s’ouvre.',
      hint: 'Celui qui a la montre compte : « trois, deux, un, maintenant ». L’autre n’écoute que lui.',
      bellIn: 'Cloche dans {n} s',
      now: 'La cloche !',
      pullNon: 'Tirer « Non »',
      pullTake: 'Tirer « Prendre »',
      noBell: 'Attends que la cloche tourne',
      capLabel: 'La montre du Capitaine',
      jokerLabel: 'L’horloge du Joker',
      bridge: 'Le pont, puis l’escalier : la Porte de la Cour est en haut.',
    },
    s4: {
      intro: 'La Porte de la Cour. Sa dernière offre. Refusez trois fois, au même instant, sans vous voir.',
      obj: 'Chacun à son pupitre « Non » ({side}). Comptez ensemble à voix haute, et appuyez sur E au même instant. Sceaux : {n} / 3.',
      say: 'Dire « Non »',
      waitAsk: 'Attends sa question',
      ok: 'Ensemble. Un sceau se brise : {n} / 3.',
      bigOk: 'Un sceau · {n} / 3',
      bigMiss: 'Pas ensemble',
      miss: 'Pas ensemble. Les sceaux se referment.',
      key: 'La clé fond entre tes doigts. Les sceaux se referment.',
      keyMate: '{mate} a pris la clé. Elle a fondu, et les sceaux se referment.',
      take: 'Prendre la clé',
      hint: 'Mettez-vous d’accord : « à trois », et dites-le ensemble. Ne suivez pas son compte à lui.',
      door: 'Trois « Non ». La porte de la Cour s’ouvre.',
      climb: 'Montez jusqu’à la Porte de la Cour.',
    },
    win: 'Le Joker ne dit jamais oui. Vous, vous avez dit non. Ensemble.',
    card: 'La carte ' + CARD + ' vous attend derrière la porte. Allez-y ensemble.',
    // the Joker's own lines (doubt, playful, never cruel; he never says yes)
    j: {
      hello: 'Bienvenue au Marché. Ici, tout se vend. Le temps, surtout.',
      s1: 'Un raccourci : une seule porte, pour un seul. Elle mène tout droit à la Cour.',
      s1b: ['L’offre ne durera pas.', 'Un seul pas, et la partie est finie.', 'Pourquoi jouer, quand on peut gagner ?', 'C’est gratuit. Enfin… presque.'],
      took1: 'Tout droit… au début. Je n’ai jamais dit où.',
      no1: 'Non ? Comme vous voudrez. Le marché continue.',
      s2: 'Je vous le prouve : la carte est là, derrière le rideau {n}. Je ne mens jamais.',
      s2b: 'Le rideau {n}. Regarde, elle brille. Et vite : l’offre expire.',
      seer: 'Toi, avec ce monocle… tu me gâches la fête.',
      jack: ['Coucou.', 'Perdu. Il fallait me croire… ou pas.', 'Raté ! On rebat ?'],
      heart: 'Tiens. Vous ne m’avez pas cru.',
      s3: ['Une carte gratuite. Tout de suite. Il suffit qu’un de vous tire « Prendre ».', 'Passer devant : je vous pose devant la dernière porte. Tirez « Prendre ».'],
      liar: 'Mon horloge est juste. Les montres de capitaine, ça retarde.',
      took3: 'Prise ! … Ah. Elle s’efface. Je ne donne jamais rien.',
      s4: 'Ma dernière offre : la clé de la Cour. Une seule main suffit.',
      ask: ['Une carte gratuite ?', 'Passer devant ?', 'Et si je vous disais la réponse ?'],
      fakeMate: '{mate} a déjà dit non. Vite.',
      hurry: 'Vite.',
      miss4: 'Vous voyez ? Pas tout à fait d’accord.',
      end: 'Non, non, et non. … Entrez donc. On se reverra à la Cour.',
    },
  };
  CONFIG.cards.h10b = {
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'Le Joker vendait des raccourcis : une porte pour un seul, une carte gratuite, la réponse.',
      'Il prouvait, il pressait, il mentait sur l’heure.',
      'On a dit non. Ensemble, et au même instant.',
    ],
  };

  const ROLES = ['dame', 'valet'];
  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const sideOf = (r) => (r === 'dame' ? TXT.left : TXT.right);
  const now = () => performance.now() / 1000;
  const HOLD1 = 3.2; // seconds of « Non » held together on the plates
  const DEAL2 = 25; // seconds to pick in the second round of La Preuve
  const TOL3 = 0.9; // how far from the true bell a pull still counts
  const SYNC4 = 0.6; // how close the two « Non » of the door must be
  const local = {
    stage: 0,
    pend: [],
    sayCd: {},
    objT: 0,
    aim: null,
    aimSent: 0,
    aims: { dame: null, valet: null },
    hold1: 0,
    holdSent: 0,
    jT: 10,
    jI: 0,
    tookCd: 0,
    t1: 0,
    deal: 0,
    dealT0: 0,
    dealSeen: 0,
    openSeen: 0,
    pull2Cd: 0,
    bellN: 0,
    bellT0: 0,
    rang: false,
    fakeRang: false,
    tick: 0,
    pulls: {},
    hostBellT0: 0,
    wait3: 0,
    resSeen: 0,
    pullCd: 0,
    press4: { dame: null, valet: null },
    wait4: 0,
    askSeen: 0,
    trick: null,
    keyOff: 0,
    pressCd: 0,
    winT: 0,
    near: 0,
    hints: {},
    env: null,
  };
  W.local = local;
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- HUD of the épreuve (DOM, drawn icons) ----------
  const ui = {};
  const ICON = {
    mono: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 21"/><path d="M7 9a3 3 0 0 1 3-3"/>',
  };
  const svg = (k, s = 18) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #h10mono{position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .6s;
        background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 56%,rgba(255,214,140,.10) 72%,rgba(120,80,20,.42) 100%)}
      #h10mono .tag{position:absolute;left:22px;bottom:118px;display:flex;align-items:center;gap:8px;font:600 12px/1 "IBM Plex Mono",monospace;color:#ffd890;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #h10clock{position:fixed;right:22px;top:150px;z-index:6;pointer-events:none;display:flex;align-items:center;gap:12px;font:600 13px/1.2 "IBM Plex Mono",monospace;color:#f1e4ea;text-shadow:0 1px 4px #000;letter-spacing:.05em}
      #h10clock svg{width:64px;height:64px}
      #h10clock .t{display:flex;flex-direction:column;gap:5px}
      #h10clock .t b{font-size:16px;color:#fff}
      #h10clock.joker .t span{color:#ff7a9a}
      #h10clock.cap .t span{color:#ffd890}
      #h10big{position:fixed;left:50%;top:32%;transform:translate(-50%,-50%) scale(.9);z-index:6;pointer-events:none;opacity:0;font:italic 600 46px/1 Georgia,serif;color:#fff;text-shadow:0 0 18px rgba(255,60,110,.9),0 2px 6px #000;transition:opacity .2s,transform .2s;white-space:nowrap}
      #h10big.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
      #h10dark{position:fixed;inset:0;pointer-events:none;z-index:5;background:#05020a;opacity:0}
      #h10timer{position:fixed;left:50%;top:82px;transform:translateX(-50%);z-index:6;pointer-events:none;font:600 14px/1 "IBM Plex Mono",monospace;color:#ff8aa8;text-shadow:0 1px 4px #000;letter-spacing:.08em;text-transform:uppercase}
    `;
    document.head.appendChild(css);
    ui.mono = document.createElement('div');
    ui.mono.id = 'h10mono';
    ui.mono.innerHTML = `<div class="tag">${svg('mono', 20)}<span>Monocle du Capitaine</span></div>`;
    document.body.appendChild(ui.mono);
    ui.clock = document.createElement('div');
    ui.clock.id = 'h10clock';
    ui.clock.innerHTML = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="rgba(10,6,14,.7)" stroke="currentColor" stroke-opacity=".5" stroke-width="3"/>${Array.from({ length: 12 }, (_, i) => `<line x1="32" y1="6" x2="32" y2="${i % 3 ? 10 : 13}" stroke="currentColor" stroke-width="${i % 3 ? 1.5 : 3}" transform="rotate(${i * 30} 32 32)"/>`).join('')}<line class="hand" x1="32" y1="32" x2="32" y2="9" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="32" r="3" fill="#fff"/></svg><span class="t"><span></span><b></b></span>`;
    ui.clock.hidden = true;
    document.body.appendChild(ui.clock);
    ui.hand = ui.clock.querySelector('.hand');
    ui.clockL = ui.clock.querySelector('.t span');
    ui.clockT = ui.clock.querySelector('.t b');
    ui.big = document.createElement('div');
    ui.big.id = 'h10big';
    document.body.appendChild(ui.big);
    ui.dark = document.createElement('div');
    ui.dark.id = 'h10dark';
    document.body.appendChild(ui.dark);
    ui.timer = document.createElement('div');
    ui.timer.id = 'h10timer';
    ui.timer.hidden = true;
    document.body.appendChild(ui.timer);
  };
  let bigT = 0;
  const big = (text, hold = 1.0) => {
    if (!ui.big) return;
    Icons.set(ui.big, Story.fmt(text));
    ui.big.classList.add('on');
    bigT = hold;
  };
  const hideUI = () => {
    if (!ui.mono) return;
    ui.mono.style.opacity = 0;
    ui.clock.hidden = true;
    ui.timer.hidden = true;
    ui.big.classList.remove('on');
    ui.dark.style.opacity = 0;
  };

  // ---------- words: the Maître du jeu, the Joker ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const jsay = (text, hold) => {
    HUD.say(text, T.joker, hold || 2600);
    W.talk(Math.min(3, (hold || 2600) / 1000));
    Sound.play('glitch');
  };
  const sayBoth = (c, mine, theirs) => {
    say(mine);
    c.send('h10say', [theirs || mine, 0]);
  };
  const jsayBoth = (c, text) => {
    jsay(text);
    c.send('h10say', [text, 1]);
  };
  const sayOnce = (k, text, cd = 10) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const ksample = (k, g = 0.7) => {
    try {
      if (Sound.sample) Sound.sample(k, null, { gain: g, spread: 0.05 });
    } catch (e) {}
  };
  const fx = (c, d) => {
    const [k, a, b] = d;
    if (k === 'took') {
      Sound.play('portal');
      Sound.play('glitch');
      Fx.burst(W.P(0, 2, W.PORTAL.z), '#ff3a8a', 90, 6, 1.0, -2);
    }
    if (k === 'refuse1') {
      Sound.play('shatter');
      Sound.play('reveal');
      Fx.burst(W.P(0, 2.2, W.PORTAL.z), '#ff6aa0', 160, 8, 1.4, -3);
      Fx.burst(W.P(0, 2.2, W.PORTAL.z), '#ffd27a', 80, 5, 1.2, -3);
      after(0.8, () => Sound.play('door'));
      W.bolt(W.P(0, 120, 80), W.P(0, 10, 66), { pink: true, w: 0.25, flash: 0.8 });
    }
    if (k === 'cord') {
      W.ST.cords[a] = 1;
      Sound.play('switch');
      ksample('kCardSlide', 0.5);
      after(0.35, () => (W.ST.cords[a] = 0));
    }
    if (k === 'heart') {
      Sound.play('chime');
      Sound.play('reveal');
      Fx.burst(W.boothPos[a], '#ff5f8a', 120, 4, 1.4, -3, 'heart');
    }
    if (k === 'jack') {
      Sound.play('trap');
      Sound.play('glitch');
      ksample('kCardFan', 0.8);
      Fx.burst(W.boothPos[a].clone().add(V3(0, 0.6, 0)), '#f0e8f0', 90, 6, 1.2, -5);
    }
    if (k === 'mono') Sound.play('switch');
    if (k === 'gate') {
      Sound.play('door');
      Sound.play('reveal');
    }
    if (k === 'lever') {
      W.ST.lever[a] = 1;
      Sound.play('switch');
      after(0.7, () => (W.ST.lever[a] = 0));
    }
    if (k === 'ok3') {
      Sound.play('reveal');
      Sound.play('chime');
      ['dame', 'valet'].forEach((w) => Fx.burst(W.P(W.CLOCK3[w][0], W.Y2 + 5.4, W.CLOCK3[w][1] - 0.4), '#ffd890', 70, 4, 1.2, -4));
    }
    if (k === 'fail3') {
      Sound.play('glitch');
      ksample('kCardShove', 0.6);
    }
    if (k === 'wall') Sound.play('rumble', 0.9);
    if (k === 'seal') {
      Sound.play('reveal');
      Sound.play('heart');
      Fx.burst(W.P(0, W.Y4 + 4 + (a - 1) * 4, W.DOOR_Z - 0.8), '#ff7aa6', 120, 5, 1.4, -2, 'heart');
      Cam.shake = Math.max(Cam.shake, 0.25);
    }
    if (k === 'miss4') {
      Sound.play('glitch');
      ksample('kCardShove', 0.7);
    }
    if (k === 'key') {
      Sound.play('glitch');
      Sound.play('shatter');
      Fx.burst(W.P(W.KEY4[0], W.Y4 + 1.9, W.KEY4[1]), '#ffd27a', 100, 5, 1.2, -4);
      local.keyOff = 3.5;
    }
    if (k === 'door') {
      Sound.play('rumble', 1);
      Sound.play('reveal');
      Cam.shake = Math.max(Cam.shake, 0.6);
      W.bolt(W.P(-30, 140, 330), W.P(0, W.Y4 + 25, W.DOOR_Z + 2), { pink: true, w: 0.35, flash: 1.2, branches: 4 });
      Fx.burst(W.joker.position.clone(), '#ffffff', 220, 12, 1.8, -2);
      Fx.burst(W.joker.position.clone(), '#ff2a5a', 160, 9, 1.6, -2);
    }
    if (k === 'win') {
      Sound.play('chime');
      const p = W.P(0, W.Y4 + 2, W.CARD[1]);
      Fx.burst(p, '#ff8fb0', 160, 6, 1.6, -1, 'heart');
      after(0.8, () => Fx.firework(W.P(-5, W.Y4, 298), 22));
      after(1.6, () => Fx.firework(W.P(5, W.Y4, 298), 24));
    }
    void b;
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('h10fx', d);
  };

  // ---------- small queries ----------
  const rel = (c, who) => W.rel(c.pos(who));
  const d2 = (q, x, z) => Math.hypot(q.x - x, q.z - z);
  const onPlate = (q) => {
    if (q.y > 1 || q.y < -0.6) return null;
    for (const k of ROLES) if (d2(q, W.PLATES1[k][0], W.PLATES1[k][1]) < 1.2) return k;
    return null;
  };
  const chooserOf = (x) => mateRole(x.mono || 'valet');
  const watchOf = (x) => (x.r3 === 2 ? 'valet' : 'dame');
  const atLevers = (q, who) => W.at('HALF_' + who, q) && d2(q, who === 'dame' ? -5 : 5, 193) < 2.4;
  const atLectern = (q, who) => q.y > W.Y4 - 0.5 && d2(q, W.LECT4[who][0], W.LECT4[who][1]) < 2.2;
  const setAim = (c, id) => {
    if (local.aim === id) return;
    local.aim = id;
    local.aimSent = 0;
    if (Net.isHost) local.aims[c.role] = id;
    c.send('h10a', [c.role, id]);
  };

  // ---------- the host's rules per station ----------
  const deal = (c, why) => {
    const t = Math.floor(Math.random() * 4);
    let l = Math.floor(Math.random() * 3);
    if (l >= t) l++;
    local.dealT0 = now();
    c.set((s) => {
      s.x.deal = { n: (s.x.deal ? s.x.deal.n : 0) + 1, t, l };
      if (why === 'late') s.x.streak = 0;
    });
  };
  const ring = (c) => {
    const d = 11 + Math.random() * 4;
    const sg = Math.random() < 0.5 ? -1 : 1;
    const lie = sg * (2.2 + Math.random() * 1.3);
    // the Joker's clock runs slow when it rings late, fast when it rings early: never near the truth
    const rate = sg > 0 ? 0.85 + Math.random() * 0.12 : 1.03 + Math.random() * 0.12;
    local.pulls = {};
    local.hostBellT0 = now();
    c.set((s) => {
      s.x.bellN = (s.x.bellN || 0) + 1;
      s.x.bell = { n: s.x.bellN, d: +d.toFixed(2), lie: +lie.toFixed(2), rate: +rate.toFixed(3) };
    });
    jsayBoth(c, TXT.j.s3[(c.S.x.r3 || 1) - 1] || TXT.j.s3[0]);
  };
  const result3 = (c, ok, why, who) => {
    local.wait3 = ok ? 3.5 : 3;
    c.set((s) => {
      s.x.bell = null;
      s.x.res3 = { n: (s.x.res3 ? s.x.res3.n : 0) + 1, ok: ok ? 1 : 0, why, who: who || null };
      if (ok) {
        s.x.r3 = (s.x.r3 || 1) + 1;
        if (s.x.r3 > 2) s.x.done3 = 1;
      } else s.x.miss3 = (s.x.miss3 || 0) + 1;
      if (why === 'take') s.x.took3 = (s.x.took3 || 0) + 1;
    });
    fxBoth(c, [ok ? 'ok3' : 'fail3']);
    if (ok && c.S.x.done3) after(1.2, () => fxBoth(c, ['wall']));
  };
  const result4 = (c, ok) => {
    local.press4 = { dame: null, valet: null };
    local.wait4 = ok ? 3.2 : 3.6;
    const n = ok ? (c.S.x.seals || 0) + 1 : 0;
    c.set((s) => {
      s.x.ask4 = null;
      s.x.seals = n;
      if (!ok) s.x.miss4 = (s.x.miss4 || 0) + 1;
      s.x.res4 = { n: (s.x.res4 ? s.x.res4.n : 0) + 1, ok: ok ? 1 : 0, seals: n };
      if (ok && n >= 3) {
        s.x.done4 = 1;
        s.x.stage = 5;
        s.x.cp = '5';
      }
    });
    if (ok) fxBoth(c, ['seal', n]);
    else fxBoth(c, ['miss4']);
    if (ok && n >= 3) fxBoth(c, ['door']);
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    const q = W.rel(Player.body.p);
    if (x.stage === 1) return x.non1 ? TXT.s1.alley : TXT.s1.obj;
    if (x.stage === 2) {
      if (x.done2) return TXT.s2.walk;
      if (!W.at('PLAZA', q) && x.cp !== 'plaza') return TXT.s1.alley;
      if (x.cp !== 'plaza') return TXT.s2.go;
      if (x.r2 === 2 && x.mono === 'valet') return TXT.s2.half;
      return r === chooserOf(x) ? TXT.s2.chooser : TXT.s2.seer;
    }
    if (x.stage === 3) {
      if (x.done3) return TXT.s3.bridge;
      if (!atLevers(q, r)) return fill(TXT.s3.go, { side: sideOf(r) });
      return r === watchOf(x) ? TXT.s3.watch : TXT.s3.liar;
    }
    if (x.stage === 4) {
      if (x.cp !== 'terrace' && !W.at('TERRACE', q)) return TXT.s4.climb;
      return fill(TXT.s4.obj, { side: sideOf(r), n: x.seals || 0 });
    }
    if (x.stage === 5) return TXT.card;
    return '';
  };

  // ---------- light and mood ----------
  const mood = (c, st) => {
    const gold = st === 5;
    LvKit.mood({
      sky: gold ? '#a888b8' : '#6a5aa8',
      ground: gold ? '#3a2418' : '#26142c',
      hemi: gold ? 0.6 : 0.46,
      sun: gold ? '#ffd8a8' : '#b9c2ff',
      sunI: gold ? 0.8 : 0.55,
      sunPos: V3(-40, 90, 60),
      exposure: gold ? 1.4 : 1.32,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    if (gold) W.amb.haze.set('#3a2440');
    else W.amb.haze.set('#241634');
    c.fog(gold ? 0.0055 : 0.0072);
    Sound.mood(gold ? 'gold' : st === 4 ? 'dark' : 'tense');
  };
  const JOKER_AT = {
    1: V3(0, 9, 70),
    2: V3(0, W.Y2 + 9.5, 149),
    3: V3(0, W.Y2 + 15, 197),
    4: V3(0, W.Y4 + 26, W.DOOR_Z + 1),
    5: V3(0, W.Y4 + 30, W.DOOR_Z + 6),
  };

  Story.register('tr_h10', {
    init: () => ({
      stage: 1,
      cp: '1',
      non1: 0,
      took1: 0,
      r2: 1,
      streak: 0,
      deal: null,
      mono: 'valet',
      open2: null,
      miss2: 0,
      done2: 0,
      r3: 1,
      bellN: 0,
      bell: null,
      res3: null,
      miss3: 0,
      took3: 0,
      done3: 0,
      seals: 0,
      ask4: null,
      askN: 0,
      res4: null,
      miss4: 0,
      key4: 0,
      done4: 0,
    }),
    voice: () => 1,
    net: {
      h10a: (c, d) => {
        const [who, id] = d;
        if (who === c.role) return;
        local.aims[who] = id;
      },
      h10p: (c, v) => {
        if (!Net.isHost) local.hold1 = v;
      },
      h10say: (c, d) => (d[1] ? jsay(d[0]) : say(d[0], 2600)),
      h10fx: (c, d) => fx(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      makeUI();
      hideUI();
      Object.assign(local, {
        stage: 0,
        pend: [],
        sayCd: {},
        objT: 0,
        aim: null,
        aims: { dame: null, valet: null },
        hold1: 0,
        jT: 12,
        tookCd: 0,
        t1: 0,
        dealSeen: 0,
        dealPend: false,
        openSeen: c.S.x.open2 ? c.S.x.open2.k : 0,
        monoSeen: c.S.x.mono,
        plazaSaid: false,
        terrSaid: false,
        seerSaid: false,
        bellN: 0,
        resSeen: c.S.x.res3 ? c.S.x.res3.n : 0,
        res4Seen: c.S.x.res4 ? c.S.x.res4.n : 0,
        askSeen: 0,
        trick: null,
        pulls: {},
        press4: { dame: null, valet: null },
        wait3: 2,
        wait4: 2,
        keyOff: 0,
        winT: 0,
        near: 0,
        hints: {},
      });
      W.ST.lever = {};
      c.spawn(W.spawn(c.S.x.cp, c.role), 0);
      Player.killY = W.O.y - 22;
      Player.checkpoint = () => {
        say(TXT.fall, 2400);
        c.send('h10say', [TXT.fallMate, 0]);
        setAim(c, null);
        return W.spawn(Story.S.x.cp, c.role);
      };
      local.env = true;
      mood(c, c.S.x.stage);
      // the Look pass re-grades the light once the phase has changed: ours goes back on top
      after(0.6, () => Story.S && Story.S.phase === 'tr_h10' && mood(c, Story.S.x.stage));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · ne prenez rien', '#ff8fb0');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1 && !c.S.x.non1) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4200);
        after(7.5, () => {
          if (Story.S && Story.S.phase === 'tr_h10' && Story.S.x.stage === 1) {
            jsay(TXT.j.hello, 3200);
            after(3.4, () => Story.S && Story.S.phase === 'tr_h10' && !Story.S.x.non1 && jsay(TXT.j.s1, 4200));
          }
        });
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      Player.killY = -40;
      hideUI();
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
        local.aim = null;
        mood(c, x.stage);
        if (prev && x.stage > prev) Sound.play('chime');
        if (prev && x.stage === 2) say(TXT.s1.alley, 3200);
        if (prev && x.stage === 3) say(TXT.s3.intro, 4200);
        if (prev && x.stage === 4) say(TXT.s3.bridge, 3200);
        if (x.stage === 5) {
          local.winT = 0;
          say(TXT.s4.door, 3000);
          after(1.2, () => jsay(TXT.j.end, 4000));
          after(5.6, () => say(TXT.win, 4200));
          after(10, () => say(TXT.card, 4200));
          fx(c, ['win']);
        }
        local.sayCd = {};
      }
      // the station's own reactions to the shared state
      if (x.stage === 2 && x.cp === 'plaza' && !local.plazaSaid) {
        local.plazaSaid = true;
        say(TXT.s2.intro, 4200);
        say(r === 'valet' && x.mono === 'valet' ? TXT.s2.monoMe : TXT.s2.monoMate, 4600);
      }
      if (x.stage === 4 && x.cp === 'terrace' && !local.terrSaid) {
        local.terrSaid = true;
        say(TXT.s4.intro, 4600);
        after(4.8, () => jsay(TXT.j.s4, 3600));
      }
      if (x.open2 && x.open2.k !== local.openSeen) {
        local.openSeen = x.open2.k;
        const ok = x.open2.prize === 'heart';
        if (ok) {
          after(0.4, () => big(TXT.s2.bigHeart, 1.4));
          if (x.done2) say(TXT.s2.done, 2600);
          else if (x.r2 === 2 && x.mono === 'valet') say(TXT.s2.half, 3000);
          else after(0.8, () => jsay(TXT.j.heart, 1600));
        } else {
          after(0.4, () => big(TXT.s2.bigJoker, 1.4));
          after(0.5, () => jsay(TXT.j.jack[x.open2.k % TXT.j.jack.length], 1500));
          if (!x.streak && x.miss2 === 1) say(TXT.s2.wrong, 2000);
        }
      }
      if (local.monoSeen && local.monoSeen !== x.mono) say(TXT.s2.passed, 2800);
      local.monoSeen = x.mono;
      if (x.res3 && x.res3.n !== local.resSeen) {
        local.resSeen = x.res3.n;
        const k = x.res3;
        if (k.ok) {
          big(TXT.s3.bigOk, 1.6);
          say(x.done3 ? TXT.s3.done : TXT.s3.ok + ' ' + TXT.s3.swap, 3000);
        } else if (k.why === 'take') {
          big(TXT.s3.bigTook, 1.4);
          say(TXT.s3.took, 2400);
          after(0.4, () => jsay(TXT.j.took3, 2000));
        } else if (k.why === 'left') say(TXT.s3.leftLever, 2200);
        else {
          big(TXT.s3.bigMiss, 1.4);
          say(k.why === 'late' ? TXT.s3.late : TXT.s3.early, 2000);
        }
      }
      if (x.res4 && x.res4.n !== local.res4Seen) {
        local.res4Seen = x.res4.n;
        if (x.res4.ok && x.res4.seals < 3) {
          big(fill(TXT.s4.bigOk, { n: x.res4.seals }), 1.6);
          say(fill(TXT.s4.ok, { n: x.res4.seals }), 2000);
        } else if (!x.res4.ok) {
          big(TXT.s4.bigMiss, 1.4);
          say(TXT.s4.miss, 1800);
          after(0.4, () => jsay(TXT.j.miss4, 1600));
        }
      }
      // the world follows the shared state
      const S = W.ST;
      S.portal = x.non1 ? 0 : 1;
      S.gate1 = x.non1 ? 1 : 0;
      S.gate2 = x.done2 ? 1 : 0;
      S.wall3 = x.done3 ? 1 : 0;
      S.door3 = x.done3 ? 1 : 0;
      S.seals = x.seals || 0;
      S.curtain4 = x.done4 ? 0 : 1;
      S.door = x.done4 ? 1 : 0;
      S.card = x.stage === 5;
      S.joker.copy(JOKER_AT[x.stage] || JOKER_AT[1]);
      S.jokerOn = x.stage === 5 ? 0 : 1;
      S.freeCard = x.done3 ? 0 : 1;
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = rel(c, 'dame');
      const qv = rel(c, 'valet');
      const both = (z) => W.at(z, qd) && W.at(z, qv);
      // both past a line of the way (whoever ran ahead waits there)
      const past = (z, y = -1) => qd.z > z && qv.z > z && qd.y > y && qv.y > y;
      local.wait3 = Math.max(0, local.wait3 - dt);
      local.wait4 = Math.max(0, local.wait4 - dt);
      // ---- 1 · Le Raccourci ----
      if (x.stage === 1) {
        if (!x.non1) {
          const pd = onPlate(qd);
          const pv = onPlate(qv);
          const held = local.aims.dame === 'non' && local.aims.valet === 'non';
          if (pd && pv && pd !== pv && held) local.hold1 = Math.min(1, local.hold1 + dt / HOLD1);
          else local.hold1 = Math.max(0, local.hold1 - dt * 0.6);
          local.holdSent += dt;
          if (local.holdSent > 0.1) {
            local.holdSent = 0;
            c.send('h10p', +local.hold1.toFixed(3));
          }
          if (local.hold1 >= 1) {
            c.set((s) => (s.x.non1 = 1));
            fxBoth(c, ['refuse1']);
            sayBoth(c, TXT.s1.done);
            after(1.5, () => jsayBoth(c, TXT.j.no1));
          }
          // the barker keeps on selling
          local.jT -= dt;
          if (local.jT <= 0 && (W.at('HALL', qd) || W.at('HALL', qv))) {
            local.jT = 15 + Math.random() * 6;
            jsayBoth(c, TXT.j.s1b[local.jI++ % TXT.j.s1b.length]);
          }
        } else if (past(61.5))
          c.set((s) => {
            s.x.stage = 2;
            s.x.cp = '2';
          });
      }
      // ---- 2 · La Preuve ----
      if (x.stage === 2) {
        if (x.cp !== 'plaza' && both('PLAZA')) c.set((s) => (s.x.cp = 'plaza'));
        if (x.cp === 'plaza' && !x.done2) {
          const dl = x.deal;
          const ready = x.r2 === 1 || x.mono === 'dame';
          if (ready && (!dl || dl.t < 0) && !local.dealPend) deal(c);
          // the second round is against the clock
          if (x.r2 === 2 && ready && dl && dl.t >= 0 && !local.dealPend && !(x.open2 && x.open2.n === dl.n) && now() - local.dealT0 > DEAL2) {
            sayBoth(c, TXT.s2.late);
            deal(c, 'late');
          }
        }
        if (x.done2 && past(142.2, W.Y2 - 0.6))
          c.set((s) => {
            s.x.stage = 3;
            s.x.cp = '3';
          });
      }
      // ---- 3 · Les Loges ----
      if (x.stage === 3 && !x.done3) {
        const ok = atLevers(qd, 'dame') && atLevers(qv, 'valet');
        if (!x.bell && ok && local.wait3 <= 0) ring(c);
        else if (x.bell) {
          const e = now() - local.hostBellT0;
          if (!ok && e > 0.5) result3(c, false, 'left');
          else if (e > x.bell.d + 2.0) result3(c, false, 'late');
        }
      }
      if (x.stage === 3 && x.done3 && past(206.6, W.Y2 - 0.6))
        c.set((s) => {
          s.x.stage = 4;
          s.x.cp = '4';
        });
      // ---- 4 · La Porte ----
      if (x.stage === 4) {
        if (x.cp !== 'terrace' && both('TERRACE')) c.set((s) => (s.x.cp = 'terrace'));
        if (x.cp === 'terrace' && !x.done4) {
          const ok = atLectern(qd, 'dame') && atLectern(qv, 'valet');
          if (!x.ask4 && ok && local.wait4 <= 0) {
            const k = (x.seals || 0) + 1;
            c.set((s) => {
              s.x.askN = (s.x.askN || 0) + 1;
              s.x.ask4 = { n: s.x.askN, k };
            });
            jsayBoth(c, TXT.j.ask[k - 1]);
          }
          // one « Non » alone, and the other never came
          const P4 = local.press4;
          const t0 = P4.dame != null ? P4.dame : P4.valet;
          if (x.ask4 && (P4.dame == null) !== (P4.valet == null) && now() - t0 > SYNC4 + 0.05) result4(c, false);
        }
      }
      // ---- 5 · the card ----
      if (x.stage === 5) {
        const C = W.CARD;
        const near = (q) => d2(q, C[0], C[1]) < 4.2 && q.y > W.Y4 - 0.5;
        local.near = near(qd) && near(qv) ? local.near + dt : 0;
        if (local.near > 1.2) c.goto('reward', (s) => (s.x.card = 'h10b'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      const q = rel(c, who);
      if (d.a === 'took1') {
        if (x.stage !== 1 || x.non1) return;
        local.hold1 = 0;
        c.set((s) => (s.x.took1 = (s.x.took1 || 0) + 1));
        fxBoth(c, ['took']);
        jsayBoth(c, TXT.j.took1);
        if (who !== c.role) say(TXT.s1.tookMate, 2600);
        else c.send('h10say', [TXT.s1.tookMate, 0]);
      }
      if (d.a === 'pull') {
        const dl = x.deal;
        if (x.stage !== 2 || x.done2 || !dl || dl.t < 0 || local.dealPend) return;
        if (who !== chooserOf(x)) return;
        if (x.open2 && x.open2.n === dl.n) return;
        const b = W.BOOTHS[d.i];
        if (!b || d2(q, b.fx, b.fz) > 2.4) return;
        const heart = d.i === dl.t;
        const streak = heart ? (x.streak || 0) + 1 : 0;
        const roundDone = heart && streak >= 2;
        c.set((s) => {
          s.x.open2 = { k: (s.x.open2 ? s.x.open2.k : 0) + 1, n: dl.n, i: d.i, prize: heart ? 'heart' : 'joker' };
          s.x.streak = roundDone ? 0 : streak;
          if (!heart) s.x.miss2 = (s.x.miss2 || 0) + 1;
          if (roundDone && s.x.r2 === 1) s.x.r2 = 2;
          else if (roundDone) s.x.done2 = 1;
        });
        fxBoth(c, ['cord', d.i]);
        after(0.35, () => fxBoth(c, [heart ? 'heart' : 'jack', d.i]));
        if (roundDone && c.S.x.done2) after(1.6, () => fxBoth(c, ['gate']));
        // the curtains fall back and the Joker deals again
        if (!(roundDone && c.S.x.done2)) {
          local.dealPend = true;
          after(heart ? 2.4 : 2.8, () => {
            local.dealPend = false;
            const X = Story.S && Story.S.x;
            if (!X || Story.S.phase !== 'tr_h10' || X.stage !== 2) return;
            if (X.r2 === 2 && X.mono === 'valet') c.set((s) => (s.x.deal = { n: s.x.deal.n + 1, t: -1, l: -1 }));
            else deal(c);
          });
        }
      }
      if (d.a === 'mono') {
        if (x.stage !== 2 || x.r2 !== 2 || x.mono !== 'valet') return;
        const a = c.pos('dame');
        const b = c.pos('valet');
        if (Math.hypot(a.x - b.x, a.z - b.z) > 2.9 || Math.abs(a.y - b.y) > 1.8) return;
        c.set((s) => (s.x.mono = 'dame'));
        fxBoth(c, ['mono']);
      }
      if (d.a === 'lv3') {
        const bl = x.bell;
        if (x.stage !== 3 || !bl || d.n !== bl.n || !atLevers(q, who)) return;
        if (d.k === 'take') return result3(c, false, 'take', who);
        if (local.pulls[who] != null) return;
        local.pulls[who] = d.off;
        if (Math.abs(d.off) > TOL3) return result3(c, false, d.off < 0 ? 'early' : 'late');
        if (local.pulls[mateRole(who)] != null) result3(c, true, 'ok');
      }
      if (d.a === 'non4') {
        const ak = x.ask4;
        if (x.stage !== 4 || !ak || d.n !== ak.n || !atLectern(q, who)) return;
        const P4 = local.press4;
        if (P4[who] != null) return;
        P4[who] = now();
        const o = P4[mateRole(who)];
        if (o != null) result4(c, Math.abs(P4[who] - o) <= SYNC4);
      }
      if (d.a === 'key') {
        if (x.stage !== 4 || x.done4 || d2(q, W.KEY4[0], W.KEY4[1]) > 2.4) return;
        local.press4 = { dame: null, valet: null };
        local.wait4 = 4;
        c.set((s) => {
          s.x.key4 = (s.x.key4 || 0) + 1;
          s.x.seals = 0;
          s.x.ask4 = null;
        });
        fxBoth(c, ['key']);
        if (who === c.role) {
          say(TXT.s4.key, 2600);
          c.send('h10say', [TXT.s4.keyMate, 0]);
        } else {
          say(TXT.s4.keyMate, 2600);
          c.send('h10say', [TXT.s4.key, 0]);
        }
        after(0.5, () => jsayBoth(c, TXT.j.took3));
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = W.rel(p);
      const S = W.ST;
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.tookCd = Math.max(0, local.tookCd - dt);
      local.pressCd = Math.max(0, local.pressCd - dt);
      local.pullCd = Math.max(0, local.pullCd - dt);
      local.keyOff = Math.max(0, local.keyOff - dt);
      if (bigT > 0) {
        bigT -= dt;
        if (bigT <= 0) ui.big.classList.remove('on');
      }
      let prompt = null;
      let want = null;
      const pressed = Input.pressed('interact');
      const mateQ = W.rel(c.pos(mateRole(r)));
      const nearMate = Remote.has && Math.hypot(q.x - mateQ.x, q.z - mateQ.z) < 2.6 && Math.abs(q.y - mateQ.y) < 1.7;

      // ---------- 1 · Le Raccourci ----------
      if (x.stage === 1) {
        S.plates.dame = 0;
        S.plates.valet = 0;
        if (!x.non1) {
          const mine = onPlate(q);
          const theirs = onPlate(mateQ);
          if (mine) S.plates[mine] = 0.35 + local.hold1 * 0.65;
          if (theirs) S.plates[theirs] = 0.35 + local.hold1 * 0.65;
          if (mine) {
            prompt = ['E', TXT.s1.plate, true];
            if (Input.held('interact')) {
              want = 'non';
              if (!theirs || local.aims[mateRole(r)] !== 'non') sayOnce('alone', TXT.s1.alone, 9);
            }
          }
          // walking into the Joker's door: back to the quay
          if (!local.tookCd && Math.abs(q.x - W.PORTAL.x) < 1.15 && Math.abs(q.z - W.PORTAL.z) < 0.45 && q.y < 2.5) {
            local.tookCd = 2;
            c.act({ a: 'took1' });
            say(TXT.s1.took, 3000);
            setAim(c, null);
            c.spawn(W.spawn('1', r), 0);
          }
          if (W.at('HALL', q)) local.t1 += dt;
          if (local.t1 > 55 && !local.hints.s1) {
            local.hints.s1 = true;
            say(TXT.s1.hint, 4200);
          }
        }
      }

      // ---------- 2 · La Preuve ----------
      const dl = x.deal;
      const revealed = x.open2 && dl && x.open2.n === dl.n;
      S.proof = S.peek = S.glow = -1;
      const monoOn = x.stage === 2 && x.cp === 'plaza' && x.mono === r && !x.done2;
      if (ui.mono) ui.mono.style.opacity = monoOn ? 1 : 0;
      let timerTxt = null;
      for (let i = 0; i < 4; i++) {
        const mine = revealed && x.open2.i === i;
        S.booths[i] = mine ? 1 : 0;
        S.prize[i] = mine ? x.open2.prize : null;
      }
      if (x.stage === 2 && x.cp === 'plaza' && !x.done2) {
        const chooser = chooserOf(x);
        const active = dl && dl.t >= 0 && !revealed;
        if (active) {
          if (r === chooser) {
            S.proof = dl.l;
            S.booths[dl.l] = 0.62;
          } else {
            S.peek = dl.l;
            S.glow = dl.t;
          }
          if (dl.n !== local.dealSeen) {
            local.dealSeen = dl.n;
            local.dealT0 = now();
            if (r === chooser) after(0.6, () => jsay(fill(x.r2 === 2 ? TXT.j.s2b : TXT.j.s2, { n: W.ROMAN[dl.l] }), 2400));
            else if (!local.seerSaid) {
              local.seerSaid = true;
              after(1.2, () => jsay(TXT.j.seer, 2000));
            }
          }
          if (x.r2 === 2) timerTxt = fill(TXT.s2.timer, { n: Math.max(0, Math.ceil(DEAL2 - (now() - local.dealT0))) });
        }
        // the cords, for the one the Joker deals with
        let bi = -1;
        let bd = 1.7;
        W.BOOTHS.forEach((b) => {
          const dd = d2(q, b.fx, b.fz);
          if (dd < bd && q.y > W.Y2 - 0.5) {
            bd = dd;
            bi = b.i;
          }
        });
        if (bi >= 0 && active) {
          if (r === chooser) {
            prompt = ['E', fill(TXT.s2.pull, { n: W.ROMAN[bi] }), false];
            if (pressed && !local.pull2Cd) {
              local.pull2Cd = 1;
              c.act({ a: 'pull', i: bi });
            }
          } else {
            prompt = ['E', Story.fmt(TXT.s2.notMine), false];
            if (pressed) sayOnce('notMine', TXT.s2.notMine, 5);
          }
        }
        // between the rounds: the monocle changes hands
        if (x.r2 === 2 && x.mono === 'valet' && nearMate) {
          prompt = ['E', Story.fmt(r === 'valet' ? TXT.s2.give : TXT.s2.takeMono), false];
          if (pressed) c.act({ a: 'mono' });
        }
        if ((x.miss2 || 0) >= 2 && !local.hints.s2) {
          local.hints.s2 = true;
          after(3, () => say(TXT.s2.hint, 4200));
        }
      }
      local.pull2Cd = Math.max(0, (local.pull2Cd || 0) - dt);
      if (ui.timer) {
        ui.timer.hidden = !timerTxt;
        if (timerTxt) ui.timer.textContent = timerTxt;
      }

      // ---------- 3 · Les Loges ----------
      let clockOn = false;
      S.clock.dame.mode = S.clock.valet.mode = 'off';
      if (x.stage === 3 && !x.done3) {
        const watch = watchOf(x) === r;
        const bl = x.bell;
        if (bl && bl.n !== local.bellN) {
          local.bellN = bl.n;
          local.bellT0 = now();
          local.rang = local.fakeRang = local.pulled = false;
          local.tick = 0;
          if (!watch) after(4.5, () => Story.S && Story.S.x.bell && Story.S.x.bell.n === bl.n && jsay(TXT.j.liar, 3000));
        }
        // my clock (the other loge's is covered)
        const e = bl ? now() - local.bellT0 : 0;
        const rem = bl ? (watch ? bl.d - e : bl.d + bl.lie - e * bl.rate) : 15;
        const a = -rem * (TAU / 60);
        S.clock[r].mode = watch ? 'cap' : 'joker';
        S.clock[r].a = a;
        if (bl) {
          // the soft ticking of the last seconds, and the bell (true or not, each hears his own)
          if (rem < 5.2 && rem > 0 && Math.floor(rem) !== local.tick) {
            local.tick = Math.floor(rem);
            Sound.play('tile');
          }
          if (rem <= 0 && !local.rang) {
            local.rang = true;
            Sound.play('chime');
            Sound.play('rumble', 0.3);
            big(TXT.s3.now, 0.9);
          }
        }
        if (W.at('HALF_' + r, q) && q.z > 180) {
          clockOn = true;
          ui.clock.className = watch ? 'cap' : 'joker';
          ui.hand.setAttribute('transform', `rotate(${((a * 180) / Math.PI).toFixed(1)} 32 32)`);
          ui.clockL.textContent = watch ? TXT.s3.capLabel : TXT.s3.jokerLabel;
          ui.clockT.textContent = bl ? (rem > 0 ? fill(TXT.s3.bellIn, { n: Math.ceil(rem) }) : TXT.s3.now) : TXT.s3.wait;
        }
        // my two levers
        const L = W.LEVERS3[r];
        if (atLevers(q, r)) {
          const k = Math.abs(q.x - L.take[0]) < Math.abs(q.x - L.non[0]) ? 'take' : 'non';
          if (!bl) prompt = ['E', TXT.s3.noBell, false];
          else {
            prompt = ['E', k === 'non' ? TXT.s3.pullNon : TXT.s3.pullTake, false];
            if (pressed && !local.pullCd && !local.pulled) {
              local.pullCd = 0.6;
              if (k === 'non') local.pulled = true;
              c.act({ a: 'lv3', k, n: bl.n, off: +(e - bl.d).toFixed(3) });
              fxBoth(c, ['lever', r + '_' + k]);
            }
          }
        }
        if ((x.miss3 || 0) >= 2 && !local.hints.s3) {
          local.hints.s3 = true;
          after(2.5, () => say(TXT.s3.hint, 4600));
        }
      }
      if (ui.clock) ui.clock.hidden = !clockOn;

      // ---------- 4 · La Porte ----------
      S.key = x.stage === 4 && !x.done4 && local.keyOff <= 0 ? 1 : 0;
      S.lect.dame = S.lect.valet = 0;
      let dark = 0;
      if (x.stage === 4 && x.cp === 'terrace' && !x.done4) {
        const ak = x.ask4;
        if (ak && ak.n !== local.askSeen) {
          local.askSeen = ak.n;
          // the Joker's tricks, different on each screen
          const tr = { k: ak.k, t: 0, n: ak.n };
          if (ak.k === 1) {
            // a count of his own, at his own pace
            const steps = [];
            let tt = 1.2 + Math.random() * 1.2;
            ['3', '2', '1'].forEach((s) => {
              steps.push([tt, s]);
              tt += 0.6 + Math.random() * 1.1;
            });
            steps.push([tt, 'Maintenant !']);
            tr.steps = steps;
          }
          if (ak.k === 2) tr.fake = 1.5 + Math.random() * 3;
          if (ak.k === 3) tr.dark = [0.8 + Math.random() * 1.5, 3 + Math.random() * 2];
          local.trick = tr;
        }
        const tr = local.trick;
        if (ak && tr && tr.n === ak.n) {
          tr.t += dt;
          if (tr.steps)
            while (tr.steps.length && tr.t >= tr.steps[0][0]) {
              big(tr.steps.shift()[1], 0.6);
              Sound.play('tile');
            }
          if (tr.fake && tr.t >= tr.fake) {
            tr.fake = 0;
            jsay(TXT.j.fakeMate, 2200);
            Sound.play('switch');
          }
          if (tr.dark)
            tr.dark.forEach((t0) => {
              if (tr.t > t0 && tr.t < t0 + 1.3) dark = Math.max(dark, Math.min(1, (tr.t - t0) * 8, (t0 + 1.3 - tr.t) * 8) * 0.92);
            });
          if (tr.dark && !tr.hurry && tr.t > tr.dark[0]) {
            tr.hurry = true;
            jsay(TXT.j.hurry, 1200);
          }
        }
        if (atLectern(q, r) && d2(q, W.LECT4[r][0], W.LECT4[r][1]) < 1.7) {
          if (!ak) prompt = ['E', TXT.s4.waitAsk, false];
          else {
            prompt = ['E', TXT.s4.say, false];
            if (pressed && !local.pressCd) {
              local.pressCd = 1.2;
              S.lect[r] = 1;
              Sound.play('switch');
              c.act({ a: 'non4', n: ak.n });
            }
          }
          if (local.pressCd > 0.9) S.lect[r] = 1;
        }
        if (S.key && d2(q, W.KEY4[0], W.KEY4[1]) < 1.9 && q.y > W.Y4 - 0.5) {
          prompt = ['E', TXT.s4.take, false];
          if (pressed) c.act({ a: 'key' });
        }
        if ((x.miss4 || 0) >= 2 && !local.hints.s4) {
          local.hints.s4 = true;
          after(3, () => say(TXT.s4.hint, 4600));
        }
      }
      if (ui.dark) ui.dark.style.opacity = dark.toFixed(3);

      // ---------- 5 · the card ----------
      if (x.stage === 5) local.winT += dt;

      setAim(c, want);
      local.aimSent += dt;
      if (local.aimSent > 1) {
        local.aimSent = 0;
        c.send('h10a', [r, local.aim]);
      }

      // ---------- the world ----------
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      if (x.stage === 5) return null;
      return prompt;
    },
  });
})();
