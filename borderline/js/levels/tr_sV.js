// ♠ V · Le Valet de Pique (épreuve sV): the first figure of the table of spades, in the Galerie des
// râteliers (js/world/cour_s.js). Kits swapped in this trial (js/game/trials.js): Yoline carries
// the valet kit, William the dame kit. A gallery over a pit of spikes, split by a grille:
//  - the low lane (valet kit): pillars to jump, two portcullises, two target shields, swinging
//    maces, pistons
//  - the high lane (dame kit): iron walks, grapple rings, two drawbridges, the two winches
// Each opens the other's way: the winch (held, high) lifts the portcullis below while the other
// passes under it; the target (struck with the sword, low) lowers the drawbridge above for a
// few seconds. Nobody can reach the other lane, so nobody gets through alone. Then both meet on
// the end ledge and the Valet bows.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('sV');
  const T = CONFIG;
  const W = CourS;
  const TITLE = 'Le Valet de Pique';
  const WHO = 'Le Valet de Pique';
  const TXT = {
    intro: 'Épreuve d’action. La table de Pique : trois figures, trois épreuves. Voici la première.',
    rule: 'La Galerie des râteliers : deux voies, une grille entre elles. Chacun ouvre la route de l’autre.',
    fall: 'Les piques du fond. Retour au dernier palier.',
    fallMate: '{mate} est tombé{pe}. {Il} repart du dernier palier.',
    mace: 'Une masse ! Retour au dernier palier.',
    crushed: 'La herse est retombée sur toi. Retour avant la herse.',
    crushedMate: 'La herse est retombée sur {mate}. {Il} repart d’avant la herse.',
    low: {
      go: 'Voie basse. Saute de pilier en pilier jusqu’à la herse.',
      herse: 'La herse est baissée. {mate} la lève avec le treuil, là-haut : passe dessous tant qu’{il} tient.',
      target: 'Frappe le bouclier-cible (E) : il abaisse le pont-levis de {mate}, là-haut.',
      maces: 'Continue jusqu’à la seconde herse. Gare aux masses qui balancent.',
      target2: 'Frappe le second bouclier (E) : le dernier pont-levis de {mate}.',
      pistons: 'Les pistons montent et descendent. Saute au bon moment jusqu’au palier du fond.',
      end: 'Le palier du fond. Attends {mate}.',
    },
    high: {
      go: 'Voie haute. Monte l’escalier, puis grappin (F) sur l’anneau.',
      winch: 'Le treuil de la herse. Maintiens E : la herse de {mate} se lève. Ne lâche pas avant qu’{il} soit passé{pe}.',
      bridge: 'Le pont-levis est relevé. {mate} l’abaisse en frappant une cible, en bas. Tiens-toi prêt{e}.',
      cross: 'Le pont est baissé : traverse, il remonte vite.',
      ring: 'Grappin (F) sur l’anneau suivant.',
      winch2: 'Le second treuil. Maintiens E pendant que {mate} passe la herse.',
      bridge2: 'Le dernier pont-levis. {mate} doit frapper le second bouclier.',
      end: 'Saute sur le palier du fond, avec {mate}.',
    },
    hold: 'Maintenir : lever la herse',
    holding: 'La herse se lève…',
    strike: 'Frapper la cible',
    struck: 'Le pont-levis s’abaisse.',
    notMine: 'La cible ne répond qu’à l’épée. C’est le kit de {mate}.',
    timer: 'Pont-levis · {n} s',
    passed: 'Passé{e} ! Tu peux lâcher le treuil.',
    passedMate: '{mate} est passé{pe} : tu peux lâcher.',
    up: 'Le pont remonte.',
    hintHerse: 'Celui d’en haut tient le treuil, celui d’en bas passe dessous : dites-vous quand.',
    hintBridge: 'La cible est en bas, après la herse : un coup d’épée, et le pont descend.',
    hintMace: 'Regardez la masse passer, et partez juste derrière elle.',
    hintPiston: 'Sautez quand le piston d’en face monte vers vous.',
    both: 'Ensemble sur le palier du fond.',
    win: 'Le Valet de Pique s’incline. Une figure de moins.',
    card: 'La carte ' + CARD + ' vous attend devant la porte. Allez-y ensemble.',
    // the Valet's own lines (playful, never cruel)
    v: {
      hello: 'Bienvenue dans ma galerie ! Deux voies, une grille. Et pas de raccourci, désolé.',
      rules: 'En bas, on passe sous mes herses. En haut, on tient les treuils. Je compte les points.',
      herse: 'Ma herse ! Il paraît que quelqu’un, là-haut, a la main sur le treuil.',
      bridge: 'Et mes ponts-levis ? Un bon coup sur la cible, en bas. Pas sur moi, merci.',
      cheer: ['Joli saut !', 'Pas mal, pour des visiteurs.', 'Mes masses ne préviennent pas. Moi si.', 'Vous vous parlez beaucoup. C’est de la triche ? Non ? Bon.'],
      oops: ['Ouille. Je n’ai rien vu.', 'Le fond est loin, hein ? On recommence.', 'Elle est lourde, ma herse. Je sais.'],
      end: 'Bravo. Vous courez comme on se répond. Le Valet de Pique s’incline.',
    },
  };
  CONFIG.cards.sV = {
    title: TITLE,
    sub: 'Figure ♠ · battue',
    lines: [
      'Une galerie coupée en deux par une grille, au-dessus des piques.',
      'En haut, les treuils et les ponts-levis. En bas, les herses et les masses.',
      'Chacun a ouvert la route de l’autre. Le Valet s’est incliné.',
    ],
  };

  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const now = () => performance.now() / 1000;
  const BR_DUR = [9, 7.5]; // seconds a drawbridge stays down
  const local = {
    pend: [],
    sayCd: {},
    objT: 0,
    aim: null,
    aimSent: 0,
    aims: { dame: null, valet: null },
    brT0: [0, 0],
    brSeen: [0, 0],
    brLocal: [0, 0],
    knockCd: 0,
    strikeCd: 0,
    stuck: {},
    hints: {},
    near: 0,
    winT: 0,
    vT: 0,
    vI: 0,
    lastCp: '',
    under: [false, false],
    passedSaid: [false, false],
  };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- HUD of the épreuve ----------
  const ui = {};
  const makeUI = () => {
    if (ui.timer) return;
    const css = document.createElement('style');
    css.textContent = `
      #sVtimer{position:fixed;left:50%;top:82px;transform:translateX(-50%);z-index:6;pointer-events:none;font:600 14px/1 "IBM Plex Mono",monospace;color:#d8e4ff;text-shadow:0 1px 4px #000;letter-spacing:.08em;text-transform:uppercase}
      #sVbar{position:fixed;left:50%;top:104px;transform:translateX(-50%);width:180px;height:4px;background:rgba(216,228,255,.18);z-index:6;pointer-events:none}
      #sVbar i{display:block;height:100%;background:#d8e4ff;box-shadow:0 0 8px #9ab8ff;transform-origin:left}
    `;
    document.head.appendChild(css);
    ui.timer = document.createElement('div');
    ui.timer.id = 'sVtimer';
    ui.timer.hidden = true;
    document.body.appendChild(ui.timer);
    ui.bar = document.createElement('div');
    ui.bar.id = 'sVbar';
    ui.bar.innerHTML = '<i></i>';
    ui.bar.hidden = true;
    document.body.appendChild(ui.bar);
    ui.fill = ui.bar.querySelector('i');
  };
  const hideUI = () => {
    if (!ui.timer) return;
    ui.timer.hidden = true;
    ui.bar.hidden = true;
  };

  // ---------- words ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const vsay = (text, hold) => {
    HUD.say(text, WHO, hold || 2600);
    local.vT = Math.min(3, (hold || 2600) / 1000);
  };
  const sayOnce = (k, text, cd = 10) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const vsayBoth = (c, text) => {
    vsay(text);
    c.send('sVsay', [text, 1]);
  };
  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'strike') {
      W.hitTarget(a);
      Sound.play('punch', W.targetPos(a));
      W.AU.clang(1, 220);
      Fx.burst(W.targetPos(a), '#cfe0ff', 40, 4, 0.6, -3);
      after(0.3, () => Sound.play('door'));
    }
    if (k === 'herse') {
      W.AU.clang(0.8, 120);
      Sound.play('creak');
    }
    if (k === 'up') Sound.play('door');
    if (k === 'crush') {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.3);
    }
    if (k === 'win') {
      Sound.play('chime');
      Sound.play('reveal');
      after(0.8, () => Fx.firework(W.P(-5, 0, 106), 18));
      after(1.6, () => Fx.firework(W.P(5, 0, 106), 20));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('sVfx', d);
  };

  // ---------- small queries ----------
  const rel = (c, who) => W.rel(c.pos(who));
  const d2 = (q, x, z) => Math.hypot(q.x - x, q.z - z);
  const A = W.A;
  // which pad of the low lane (index) or -1
  const padOf = (q) => {
    for (let i = 0; i < A.pads.length; i++) {
      const [x, z, w, d, top] = A.pads[i];
      if (Math.abs(q.x - x) < w / 2 + 0.3 && Math.abs(q.z - z) < d / 2 + 0.3 && Math.abs(q.y - top) < 0.6) return i;
    }
    return -1;
  };
  const walkOf = (q) => {
    if (q.x < A.HX[0] - 0.3 || q.y < A.HY - 0.6) return -1;
    for (let i = 0; i < A.walks.length; i++) if (q.z > A.walks[i][0] - 0.3 && q.z < A.walks[i][1] + 0.3) return i;
    return -1;
  };
  const atWinch = (q, i) => q.y > A.HY - 0.6 && d2(q, A.winch[i][0], A.winch[i][1]) < 1.7;
  const atTarget = (q, i) => Math.abs(q.y - 1.2) < 0.8 && d2(q, A.target[i][0], A.target[i][1]) < 2.2;
  const setAim = (c, id) => {
    if (local.aim === id) return;
    local.aim = id;
    local.aimSent = 0;
    if (Net.isHost) local.aims[c.role] = id;
    c.send('sVa', [c.role, id]);
  };
  const cpKey = (x, r) => (r === 'valet' ? 'V' + x.cpV : 'D' + x.cpD);

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    if (x.stage === 2) return TXT.card;
    if (r === 'valet') {
      const cp = x.cpV;
      if (cp === 0) return TXT.low.go;
      if (cp === 1) return TXT.low.herse;
      if (cp === 2) return x.br[0] > 0 || x.cpD >= 2 ? TXT.low.maces : TXT.low.target;
      if (cp === 3) return TXT.low.herse;
      if (cp === 4) return x.br[1] > 0 || x.cpD >= 4 ? TXT.low.pistons : TXT.low.target2;
      return TXT.low.end;
    }
    const cp = x.cpD;
    if (cp === 0) return TXT.high.go;
    if (cp === 1) return x.cpV >= 2 ? (x.br[0] ? TXT.high.cross : TXT.high.bridge) : TXT.high.winch;
    if (cp === 2) return TXT.high.ring;
    if (cp === 3) return x.cpV >= 4 ? (x.br[1] ? TXT.high.cross : TXT.high.bridge2) : TXT.high.winch2;
    if (cp === 4) return TXT.high.end;
    return TXT.low.end;
  };

  // ---------- light and mood ----------
  const mood = (c, end) => {
    LvKit.mood({
      sky: '#8a9ab8',
      ground: '#14171d',
      hemi: end ? 0.62 : 0.55,
      sun: '#dfe8ff',
      sunI: end ? 0.85 : 0.7,
      sunPos: V3(-40, 90, 60),
      exposure: end ? 1.45 : 1.38,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set('#0d1118');
    c.fog(0.0062);
    Sound.mood(end ? 'calm' : 'tense');
  };

  Story.register('tr_sV', {
    world: CourS,
    init: () => ({
      stage: 1,
      cpV: 0,
      cpD: 0,
      herse: [0, 0],
      br: [0, 0],
      brN: [0, 0],
      strikes: 0,
      crush: 0,
      falls: 0,
    }),
    voice: () => 1,
    net: {
      sVa: (c, d) => {
        const [who, id] = d;
        if (who === c.role) return;
        local.aims[who] = id;
      },
      sVsay: (c, d) => (d[1] ? vsay(d[0]) : say(d[0], 2600)),
      sVfx: (c, d) => fx(c, d),
    },
    async enter(c, first) {
      local.ready = false;
      if (!first) await fadeTo(true);
      W.build();
      W.show('A');
      makeUI();
      hideUI();
      Object.assign(local, {
        pend: [],
        sayCd: {},
        objT: 0,
        aim: null,
        aims: { dame: null, valet: null },
        brT0: [0, 0],
        brSeen: [...c.S.x.brN],
        brLocal: [0, 0],
        knockCd: 0,
        strikeCd: 0,
        hints: {},
        near: 0,
        winT: 0,
        vT: 0,
        vI: 0,
        stageSeen: c.S.x.stage,
        lastCp: cpKey(c.S.x, c.role),
        under: [false, false],
        passedSaid: [false, false],
        waitT: 0,
      });
      c.spawn(W.spawn(cpKey(c.S.x, c.role), c.role), 0);
      Player.killY = W.O.y - 5;
      Player.checkpoint = () => {
        say(TXT.fall, 2400);
        c.send('sVsay', [TXT.fallMate, 0]);
        c.act({ a: 'fell' });
        setAim(c, null);
        return W.spawn(cpKey(Story.S.x, c.role), c.role);
      };
      // the grapple: the rings of the high lane, for the dame kit only
      Player.targets = () => (c.role === 'dame' && Story.S && Story.S.x.stage === 1 ? A.rings.map((r, i) => W.ringPos(i)) : []);
      Player.grappleLand = () => (Player.target >= 0 ? W.ringLand(Player.target) : null);
      mood(c, c.S.x.stage === 2);
      after(0.6, () => Story.S && Story.S.phase === 'tr_sV' && mood(c, Story.S.x.stage === 2));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · deux voies', '#d8e4ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1 && c.S.x.cpV === 0 && c.S.x.cpD === 0) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4200);
        after(7.8, () => Story.S && Story.S.phase === 'tr_sV' && vsay(TXT.v.hello, 3600));
        after(11.8, () => Story.S && Story.S.phase === 'tr_sV' && vsay(TXT.v.rules, 4200));
      }
      local.ready = true;
      this.apply(c);
      W.snap();
    },
    exit() {
      local.ready = false;
      Player.killY = -40;
      Player.targets = null;
      Player.grappleLand = null;
      hideUI();
      LvKit.mood(null);
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      W.hide();
      W.showCard(null);
      local.pend = [];
    },
    apply(c) {
      if (!W.built || !local.ready) return;
      const x = c.S.x;
      const r = c.role;
      if (x.stage !== local.stageSeen) {
        local.stageSeen = x.stage;
        if (x.stage === 2) {
          mood(c, true);
          say(TXT.both, 2400);
          after(1.6, () => vsay(TXT.v.end, 4200));
          after(6.2, () => say(TXT.win, 3600));
          after(10, () => say(TXT.card, 4200));
          fx(c, ['win']);
          local.winT = 0;
        }
      }
      // a drawbridge that just came down: its countdown starts on this screen
      x.brN.forEach((n, i) => {
        if (n !== local.brSeen[i]) {
          local.brSeen[i] = n;
          if (x.br[i]) {
            local.brLocal[i] = now();
            if (r === 'dame') say(TXT.high.cross, 2200);
            else say(TXT.struck, 1800);
          }
        }
      });
      // a checkpoint of mine changed (said once)
      const k = cpKey(x, r);
      if (k !== local.lastCp) {
        local.lastCp = k;
        if (Math.random() < 0.5 && x.stage === 1) after(0.5, () => vsay(TXT.v.cheer[local.vI++ % TXT.v.cheer.length], 2000));
      }
      // the world follows the shared state
      const S = W.ST;
      S.herse = x.herse.slice();
      S.bridge = x.br.slice();
      S.winch = [local.aims.dame === 'w0' ? 1 : 0, local.aims.dame === 'w1' ? 1 : 0];
      S.target = x.br.slice();
      S.doorA = x.stage === 2 ? 1 : 0;
      HUD.objective(objective(c));
      W.showCard('sV', x.stage === 2 ? V3(0, 1.7, 107) : null);
    },
    host(c, dt) {
      if (!W.built || !local.ready) return;
      const x = c.S.x;
      const qd = rel(c, 'dame');
      const qv = rel(c, 'valet');
      if (x.stage === 1) {
        // ---- checkpoints, each lane its own (never back) ----
        const pv = padOf(qv);
        let cv = x.cpV;
        if (pv === 3) cv = Math.max(cv, 1);
        // through a portcullis only once well past its bars
        if (pv === 4 && qv.z > A.herse[0] + 0.6) cv = Math.max(cv, 2);
        if (pv === 8) cv = Math.max(cv, 3);
        if (pv === 9 && qv.z > A.herse[1] + 0.6) cv = Math.max(cv, 4);
        if (W.at('END', qv)) cv = 5;
        const wd = walkOf(qd);
        let cd = x.cpD;
        if (wd >= 1) cd = Math.max(cd, wd);
        if (W.at('END', qd)) cd = 5;
        if (cv !== x.cpV || cd !== x.cpD)
          c.set((s) => {
            s.x.cpV = cv;
            s.x.cpD = cd;
          });
        // ---- the winches: a portcullis is up while the dame kit holds its winch ----
        const held = [0, 1].map((i) => (local.aims.dame === 'w' + i && atWinch(qd, i) ? 1 : 0));
        if (held[0] !== x.herse[0] || held[1] !== x.herse[1]) {
          c.set((s) => (s.x.herse = held));
          fxBoth(c, ['herse']);
        }
        // ---- the drawbridges go back up after their time ----
        [0, 1].forEach((i) => {
          if (x.br[i] && now() - local.brT0[i] > BR_DUR[i]) {
            c.set((s) => {
              s.x.br = s.x.br.map((v, k) => (k === i ? 0 : v));
              s.x.brN = s.x.brN.map((v, k) => (k === i ? v + 1 : v));
            });
            fxBoth(c, ['up', i]);
          }
        });
        if (x.cpV === 5 && x.cpD === 5) c.set((s) => (s.x.stage = 2));
      }
      if (x.stage === 2) {
        const near = (q) => d2(q, 0, 107) < 4.2 && q.y > -0.5;
        local.near = near(qd) && near(qv) ? local.near + dt : 0;
        if (local.near > 1.2) c.goto('reward', (s) => (s.x.card = 'sV'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      const q = rel(c, who);
      if (d.a === 'strike') {
        // the targets answer the sword only (the valet kit), from their own pillar
        if (x.stage !== 1 || who !== 'valet') return;
        const i = d.i;
        if (!(i === 0 || i === 1) || !atTarget(q, i)) return;
        if (i === 0 && x.cpV < 2) return;
        if (i === 1 && x.cpV < 4) return;
        local.brT0[i] = now();
        c.set((s) => {
          s.x.br = s.x.br.map((v, k) => (k === i ? 1 : v));
          s.x.brN = s.x.brN.map((v, k) => (k === i ? v + 1 : v));
          s.x.strikes = (s.x.strikes || 0) + 1;
        });
        fxBoth(c, ['strike', i]);
        if ((x.strikes || 0) === 0) setTimeout(() => Story.S && Story.S.phase === 'tr_sV' && vsayBoth(c, TXT.v.bridge), 900);
      }
      if (d.a === 'crushed') {
        if (x.stage !== 1) return;
        c.set((s) => (s.x.crush = (s.x.crush || 0) + 1));
        fxBoth(c, ['crush']);
        vsayBoth(c, TXT.v.oops[2]);
      }
      if (d.a === 'fell') {
        if (x.stage !== 1) return;
        c.set((s) => (s.x.falls = (s.x.falls || 0) + 1));
        if ((x.falls || 0) % 3 === 0) vsayBoth(c, TXT.v.oops[(x.falls / 3) % 2]);
      }
    },
    update(c, dt, t) {
      if (!W.built || !local.ready) return null;
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
      local.knockCd = Math.max(0, local.knockCd - dt);
      local.strikeCd = Math.max(0, local.strikeCd - dt);
      local.vT = Math.max(0, local.vT - dt);
      let prompt = null;
      let want = null;
      const pressed = Input.pressed('interact');
      let timerTxt = null;
      let barK = -1;

      if (x.stage === 1) {
        // ---------- the low lane ----------
        if (r === 'valet') {
          // the maces knock you off the pillars
          const kv = local.knockCd ? null : W.maceHit(q, t);
          if (kv) {
            local.knockCd = 1.2;
            Player.body.v.set(kv.x, kv.y, kv.z);
            Sound.play('slam');
            Cam.shake = Math.max(Cam.shake, 0.35);
            sayOnce('mace', TXT.mace, 4);
            local.hints.maceN = (local.hints.maceN || 0) + 1;
            if (local.hints.maceN === 3) after(2.5, () => say(TXT.hintMace, 4200));
          }
          // a portcullis coming down on you
          A.herse.forEach((hz, i) => {
            const under = Math.abs(q.z - hz) < 0.65 && q.x < -1 && q.y < 3;
            const k = W.herseK(i);
            if (under && x.herse[i] === 0 && k < 0.42 && local.knockCd === 0) {
              local.knockCd = 1.5;
              c.act({ a: 'crushed', i });
              say(TXT.crushed, 2600);
              c.send('sVsay', [TXT.crushedMate, 0]);
              c.spawn(W.spawn('V' + (i === 0 ? 1 : 3), r), 0);
            }
            // through: tell the one at the winch
            if (!local.passedSaid[i] && q.z > hz + 1 && padOf(q) === (i === 0 ? 4 : 9)) {
              local.passedSaid[i] = true;
              if (x.herse[i]) {
                say(TXT.passed, 2000);
                c.send('sVsay', [TXT.passedMate, 0]);
              }
            }
          });
          // the targets
          A.target.forEach((tg, i) => {
            if (atTarget(q, i) && d2(q, tg[0], tg[1]) < 2.0) {
              prompt = ['E', TXT.strike, false];
              if (pressed && !local.strikeCd) {
                local.strikeCd = 0.7;
                Player.punch = 0.25;
                Player.yaw = Math.atan2(tg[0] - q.x, tg[1] - q.z);
                c.act({ a: 'strike', i });
              }
            }
          });
          // the pistons: a hint after a few falls there
          if (x.cpV === 4 && !local.hints.piston && (x.falls || 0) >= 4) {
            local.hints.piston = true;
            say(TXT.hintPiston, 4200);
          }
        }
        // ---------- the high lane ----------
        if (r === 'dame') {
          A.winch.forEach((w, i) => {
            if (!atWinch(q, i)) return;
            prompt = ['E', x.herse[i] ? TXT.holding : TXT.hold, true];
            if (Input.held('interact')) want = 'w' + i;
          });
        }
        if (r !== 'valet')
          A.target.forEach((tg, i) => {
            if (!atTarget(q, i) || d2(q, tg[0], tg[1]) > 2.0) return;
            prompt = ['E', Story.fmt(TXT.notMine), false];
            if (pressed) sayOnce('notMine', TXT.notMine, 5);
          });
        // the drawbridges' countdown, on both screens
        [0, 1].forEach((i) => {
          if (!x.br[i]) return;
          const rem = Math.max(0, BR_DUR[i] - (now() - local.brLocal[i]));
          if ((r === 'dame' && x.cpD === (i === 0 ? 1 : 3)) || r === 'valet') {
            timerTxt = fill(TXT.timer, { n: Math.ceil(rem) });
            barK = rem / BR_DUR[i];
          }
        });
        // hints when a station drags on
        const waitingAt = r === 'valet' ? (x.cpV === 1 || x.cpV === 3 ? 'herse' : null) : x.cpD === 1 && x.cpV >= 2 && !x.br[0] ? 'bridge' : null;
        local.waitT = waitingAt ? local.waitT + dt : 0;
        if (waitingAt === 'herse' && local.waitT > 45 && !local.hints.herse) {
          local.hints.herse = true;
          say(TXT.hintHerse, 4600);
          c.send('sVsay', [TXT.hintHerse, 0]);
        }
        if (waitingAt === 'bridge' && local.waitT > 40 && !local.hints.bridge) {
          local.hints.bridge = true;
          say(TXT.hintBridge, 4600);
          c.send('sVsay', [TXT.hintBridge, 0]);
        }
        // the Valet keeps an eye on the herse the first time someone reaches it
        if (r === 'valet' && x.cpV === 1 && !local.hints.vHerse) {
          local.hints.vHerse = true;
          after(0.8, () => vsay(TXT.v.herse, 3200));
        }
      }
      if (ui.timer) {
        ui.timer.hidden = !timerTxt;
        ui.bar.hidden = !timerTxt;
        if (timerTxt) {
          ui.timer.textContent = timerTxt;
          ui.fill.style.transform = `scaleX(${clamp(barK, 0, 1).toFixed(3)})`;
        }
      }
      if (x.stage === 2) local.winT += dt;

      setAim(c, want);
      local.aimSent += dt;
      if (local.aimSent > 1) {
        local.aimSent = 0;
        c.send('sVa', [r, local.aim]);
      }
      W.ST.winch = [local.aims.dame === 'w0' || (r === 'dame' && want === 'w0') ? 1 : 0, local.aims.dame === 'w1' || (r === 'dame' && want === 'w1') ? 1 : 0];

      // ---------- the Valet de Pique: along the spine, then down to bow ----------
      const F = W.ST.fig.V;
      const mq = W.rel(c.pos(mateRole(r)));
      if (x.stage === 1) {
        const zc = clamp((q.z + mq.z) / 2 + 3, 14, 88);
        F.p.set(0, 9.65, zc);
        const look = W.P((q.x + mq.x) / 2, 2, (q.z + mq.z) / 2);
        F.ry = Math.atan2(look.x - W.P(0, 0, zc).x, look.z - W.P(0, 0, zc).z);
        F.s = { act: local.vT > 0 ? 'point' : 'juggle', talk: local.vT, look, bow: 0 };
      } else {
        F.p.set(0, 0, 103.5);
        F.ry = Math.PI;
        F.s = { act: null, talk: local.vT, bow: local.winT > 1.4 && local.winT < 7 ? 1 : 0, look: null };
      }
      W.ST.figOn = { V: true, D: false, R: false };

      // ---------- the world ----------
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      if (x.stage === 2) return null;
      return prompt;
    },
  });
})();
