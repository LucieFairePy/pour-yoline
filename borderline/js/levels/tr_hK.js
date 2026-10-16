// ♥ R · Le Roi de Cœur (épreuve hK, card ♥ R), the last figure of the table of hearts. Kits as usual
// (Yoline: dame, William: valet). Le théâtre: the Roi's two vases stand behind his great curtain,
// on his carousel. One of you, on the rug of the stalls, throws his roses over the curtain: aim
// (degrees) and strength are numbers on that screen only, and that one never sees the stage (the
// vases and where the roses fall are drawn on the other screen only). The other one goes on the
// stage by the coulisses and says where each rose fell. The host flies the rose (the same path on
// both screens), and judges where it lands against the vases at that moment. Out of roses: the Roi
// moves his vases and gives a new armful. Two vases still, then roles changed and the carousel
// turning. Won, the curtain rises, the Roi bows, the three figures lay down their cards
// (js/cine/cour_h.js), then the reward. The world is js/world/cour_h.js.
(() => {
  const CARD = Cards.tagOf('hK');
  const T = CONFIG;
  const W = CourH;
  const TITLE = 'Le Roi de Cœur';
  const WHO = 'Le Roi de Cœur';
  const TXT = {
    intro: 'Figure ♥. Le Roi de Cœur reçoit au théâtre. Son rideau ne se lève que pour qui vise juste.',
    rule: 'Lancez ses roses par-dessus le rideau, dans ses deux vases. Qui lance ne voit pas la scène ; l’autre, sur la scène, dit où elles tombent.',
    thrower: 'Va sur le tapis rose et appuie sur E pour viser : gauche et droite pour l’angle, avant et arrière pour la force, E pour lancer. {mate} te dit où tombent tes roses.',
    guide: 'Passe par les coulisses, sur la scène. Tu y vois les vases et les roses de {mate} : dis-lui comment corriger.',
    objRug: 'Va sur le tapis rose, au bout de l’allée · vases {n} / 4',
    objAim: 'Lance par-dessus le rideau, à la voix de {mate} · roses {r} · vases {n} / 4',
    objGo: 'Va sur la scène, par les coulisses · vases {n} / 4',
    objStage: 'Dis à {mate} où tombent ses roses · vases {n} / 4',
    aim: 'Viser',
    throwK: 'Lancer',
    leave: 'Saut : quitter le tapis',
    notMine: 'Cette fois, c’est {mate} qui lance.',
    curtain: 'Dans le rideau.',
    short: 'Trop court : la rose retombe dans l’allée.',
    over: 'Par-dessus le rideau.',
    hit: 'Dans le vase !',
    empty: 'Plus de roses. Le Roi déplace ses vases et vous en rend une brassée.',
    swap: 'Deux vases fleuris. Changez de place : à l’autre de lancer. Le Roi fait tourner son carrousel.',
    hint: {
      numbers: 'Qui lance lit sa visée et sa force : parlez en chiffres. « Deux de force en plus, un degré à droite. »',
      timing: 'Une rose met deux secondes et demie à tomber : le guide dit « lance » avant que le vase n’arrive.',
    },
    fall: 'Retour au fond du théâtre.',
    fallMate: '{mate} revient au fond du théâtre.',
    win: 'Quatre vases fleuris. Le rideau se lève.',
    hud: { aim: 'Visée', force: 'Force', roses: 'Roses', vases: 'Vases' },
    k: {
      hello: 'Bienvenue dans mon théâtre. Ce soir, c’est le public qui lance des fleurs.',
      rule: 'Mes vases sont derrière le rideau. Vous ne les verrez pas, mais quelqu’un les voit pour vous.',
      hit: ['Bravo !', 'Quelle précision.', 'Dans le mille. Enfin, dans le vase.'],
      miss: ['Hm, presque.', 'Mes planches vous remercient.', 'Le rideau a de beaux restes.'],
      move: 'Je change mes vases de place. Le théâtre, c’est le mouvement.',
      r1: 'Et maintenant, mon carrousel !',
      win: 'Lancer sans voir, et toucher juste. Je m’incline.',
      down: 'Venez. La table de Cœur a quelque chose à vous dire.',
    },
  };
  CONFIG.cards.hK = {
    title: TITLE,
    sub: 'Figure ♥ · réussie',
    lines: ['Un rideau, des roses, et deux vases que l’un ne voyait pas.', 'Vous avez lancé sur la parole de l’autre, et touché juste.', 'Le Roi s’est incliné : la table de Cœur est à vous.'],
  };

  const ROUNDS = [
    { thrower: 'valet', roses: 8, spin: 0 },
    { thrower: 'dame', roses: 10, spin: TAU / 30 },
  ];
  const HIT_R = 0.78;
  const local = {};
  const reset = () =>
    Object.assign(local, {
      stage: -1,
      key: '',
      rt: 0,
      ang: 0,
      pow: 20,
      aiming: false,
      rep: 0,
      flying: false,
      flyT: 0,
      sayCd: {},
      pend: [],
      objT: 0,
      fails: 0,
      roundT: 0,
      hinted: {},
      winT: 0,
      talk: 0,
      cineSent: false,
      cineStart: 0,
      curtain: 0,
      lastMarks: 0,
    });
  reset();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });
  const throwerOf = (x) => ROUNDS[Math.min(x.round, 1)].thrower;
  const guideOf = (x) => (throwerOf(x) === 'dame' ? 'valet' : 'dame');

  // ---------- the vases of a deal: on the carousel, radius and angle (the same on both screens) ----------
  let vKey = '';
  let vOut = null;
  const vaseDeal = (x) => {
    const k = x.seed + '|' + x.round + '|' + x.roll;
    if (k === vKey) return vOut;
    const r = rng(((x.seed | 0) + x.round * 7919 + (x.roll | 0) * 104729 + 61) >>> 0);
    const out = [];
    for (let guard = 0; out.length < 2 && guard < 200; guard++) {
      const rad = x.round ? 2.6 + r() * 1.6 : 1.7 + r() * 2.5;
      const a = r() * TAU;
      const v = { r: rad, a };
      const px = Math.sin(a) * rad;
      const pz = Math.cos(a) * rad;
      if (out.some((o) => Math.hypot(Math.sin(o.a) * o.r - px, Math.cos(o.a) * o.r - pz) < 3.2)) continue;
      out.push(v);
    }
    vKey = k;
    vOut = out;
    return out;
  };
  const carAng = (x) => (x.stage === 0 ? ROUNDS[Math.min(x.round, 1)].spin * local.rt : local.ang);
  // a vase's position now (relative to O), the carousel turned by ang
  const vasePos = (v, ang) => ({ x: W.CAROUSEL.x + Math.sin(v.a + ang) * v.r, z: W.CAROUSEL.z + Math.cos(v.a + ang) * v.r });

  // ---------- HUD: the aim (degrees, strength), the roses left, the vases ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #chK{position:fixed;right:18px;top:150px;z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:170px;padding:10px 14px;border-radius:14px;background:rgba(26,8,14,.6);box-shadow:0 0 0 1px rgba(255,255,255,.08);font:600 11px/1 "IBM Plex Mono",monospace;color:#f6e6ea;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #chK .row{display:flex;justify-content:space-between;align-items:center;gap:10px}
      #chK .row b{font:600 20px/1 "IBM Plex Mono",monospace;color:#ffd8a8;min-width:58px;text-align:right}
      #chK .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);position:relative}
      #chK .bar i{position:absolute;top:-3px;width:4px;height:12px;border-radius:2px;background:#ff9ab4;box-shadow:0 0 8px #ff9ab4}
      #chK .ro{display:flex;gap:3px;flex-wrap:wrap}
      #chK .ro span{font:400 14px/1 Georgia,serif;color:#ff7a9a}
      #chK .ro span.off{color:rgba(255,255,255,.15)}
      #chK .v{display:flex;gap:6px;font:400 18px/1 Georgia,serif}
      #chK .v span{color:rgba(255,255,255,.18)}
      #chK .v span.on{color:#ffd8a8;text-shadow:0 0 8px #ffd8a8}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'chK';
    ui.root.innerHTML = `<div class="aim"><div class="row"><span>${TXT.hud.aim}</span><b class="a"></b></div><div class="bar"><i class="ai"></i></div>
      <div class="row"><span>${TXT.hud.force}</span><b class="f"></b></div><div class="bar"><i class="fi"></i></div></div>
      <div class="row"><span>${TXT.hud.roses}</span><div class="ro"></div></div>
      <div class="row"><span>${TXT.hud.vases}</span><div class="v"><span>♥</span><span>♥</span><span>♥</span><span>♥</span></div></div>`;
    document.body.appendChild(ui.root);
    ui.aim = ui.root.querySelector('.aim');
    ui.a = ui.root.querySelector('.a');
    ui.f = ui.root.querySelector('.f');
    ui.ai = ui.root.querySelector('.ai');
    ui.fi = ui.root.querySelector('.fi');
    ui.ro = ui.root.querySelector('.ro');
    ui.v = [...ui.root.querySelectorAll('.v span')];
    ui.root.hidden = true;
  };
  const hideUI = () => ui.root && (ui.root.hidden = true);

  // ---------- small helpers ----------
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const ksay = (text, hold) => {
    HUD.say(text, WHO, hold || 2400);
    local.talk = 1.8;
  };
  const sayBoth = (c, text, hold) => {
    say(text, hold);
    c.send('chKsay', [text, hold || 2800, 0]);
  };
  const ksayBoth = (c, text, hold) => {
    ksay(text, hold);
    c.send('chKsay', [text, hold || 2400, 1]);
  };
  const sayOnce = (k, text, cd = 6) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const here = () => Story.S && Story.S.phase === 'tr_hK';
  const hint = (c, key, delay = 2.6) => {
    if (local.hinted[key]) return;
    local.hinted[key] = 1;
    after(delay, () => {
      say(TXT.hint[key], 6000);
      c.send('chKhint', key);
    });
  };
  const nfull = (m) => ((m & 1) ? 1 : 0) + ((m & 2) ? 1 : 0);

  // ---------- the rose in flight (both screens) and what happens where it lands ----------
  const fly = (c, d) => {
    const [ang, pow] = d;
    const me = c.role;
    const x = c.S.x;
    W.ST.flight = { ang, pow, t: 0, hide: me === throwerOf(x) };
    Sound.play('grapple');
  };
  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'land') {
      W.AU.pof(1);
    }
    if (k === 'hit') {
      W.AU.pof(0.6);
      W.AU.chime(a ? 4 : 0);
      Sound.play('reveal');
      const v = W.ST.vases[a | 0];
      if (v) {
        v.flash = 1;
        if (W.ST.vasesOn) Fx.burst(W.P(v.x, W.STAGE_Y + 1.8, v.z), '#ff8aa8', 60, 4, 1.1, -2);
      }
    }
    if (k === 'curtain') {
      W.AU.pof(0.5);
      Sound.play('cloak');
    }
    if (k === 'move') {
      Sound.play('creak');
      Sound.play('door');
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      for (let i = 0; i < 5; i++) after(0.6 + i * 0.4, () => Fx.burst(W.P((i - 2) * 3, 5, 128), i % 2 ? '#ff8aa8' : '#ffd27a', 70, 6, 1.4, -1));
      after(1.6, () => W.bolt(W.P(-40, 140, 160), W.P(-8, 40, 140), { gold: true, w: 0.4, flash: 0.5 }));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('chKfx', d);
  };
  // host: the rose has come down
  const land = (c, ang, pow) => {
    local.flying = false;
    if (!here()) return;
    const x = c.S.x;
    if (x.stage !== 0) return;
    const path = W.throwPath(ang, pow);
    const L = path.land;
    const used = x.used | 0;
    const R0 = ROUNDS[x.round];
    let full = x.full | 0;
    let hitI = -1;
    if (path.blocked) {
      fxBoth(c, ['curtain']);
      sayBoth(c, TXT.curtain, 1400);
    } else if (L.z < W.CURTAIN_Z) {
      fxBoth(c, ['land']);
      sayBoth(c, TXT.short, 1800);
    } else {
      const V = vaseDeal(x);
      const ang0 = carAng(x);
      V.forEach((v, i) => {
        if (hitI >= 0 || full & (1 << i)) return;
        const q = vasePos(v, ang0);
        if (Math.hypot(L.x - q.x, L.z - q.z) < HIT_R) hitI = i;
      });
      if (hitI >= 0) {
        full |= 1 << hitI;
        fxBoth(c, ['hit', hitI]);
        sayBoth(c, TXT.hit, 1600);
        after(0.6, () => ksayBoth(c, pick(TXT.k.hit), 1600));
      } else {
        fxBoth(c, ['land']);
        // only the one on the rug hears that it passed (the other sees where it fell)
        const th = throwerOf(x);
        if (th === c.role) say(TXT.over, 1200);
        else c.send('chKsay', [TXT.over, 1200, 0]);
        if (Math.random() < 0.25) after(0.8, () => ksayBoth(c, pick(TXT.k.miss), 1500));
      }
    }
    const marks = hitI >= 0 || path.blocked || L.z < W.CURTAIN_Z ? x.marks || [] : [...(x.marks || []), [+L.x.toFixed(2), +L.y.toFixed(2), +L.z.toFixed(2)]].slice(-8);
    if (nfull(full) >= 2) {
      // the round is won
      if (x.round === 0) {
        c.set((s) => {
          s.x.full = full;
          s.x.used = used;
          s.x.marks = [];
          s.x.pause = 1;
        });
        after(1.8, () => sayBoth(c, TXT.swap, 3800));
        after(5.6, () => {
          if (!here()) return;
          ksayBoth(c, TXT.k.r1, 2400);
          c.set((s) => {
            s.x.round = 1;
            s.x.roll = 0;
            s.x.full = 0;
            s.x.used = 0;
            s.x.marks = [];
            s.x.pause = 0;
          });
        });
        return;
      }
      c.set((s) => {
        s.x.full = full;
        s.x.stage = 1;
        s.x.marks = [];
      });
      return;
    }
    if (used >= R0.roses) {
      // out of roses: he moves his vases (the ones filled stay filled) and gives a new armful
      local.fails++;
      fxBoth(c, ['move']);
      sayBoth(c, TXT.empty, 3600);
      after(1.0, () => ksayBoth(c, TXT.k.move, 2600));
      c.set((s) => {
        s.x.full = full;
        s.x.used = 0;
        s.x.roll = (s.x.roll | 0) + 1;
        s.x.marks = [];
      });
      hint(c, x.round ? 'timing' : 'numbers', 4);
      return;
    }
    c.set((s) => {
      s.x.full = full;
      s.x.marks = marks;
    });
    if (used >= 4 && hitI < 0) hint(c, 'numbers', 2.4);
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage >= 1) return '';
    const n = nfull(x.full | 0) + (x.round ? 2 : 0);
    if (c.role === throwerOf(x)) {
      if (!W.atRug(Player.body.p)) return TXT.objRug.replace('{n}', n);
      return TXT.objAim.replace('{n}', n).replace('{r}', Math.max(0, ROUNDS[x.round].roses - (x.used | 0)));
    }
    return (W.onStage(Player.body.p) ? TXT.objStage : TXT.objGo).replace('{n}', n);
  };
  const mood = (c, win) => {
    LvKit.mood({
      sky: win ? '#e8c0b0' : '#b08888',
      ground: '#2a120e',
      hemi: win ? 0.6 : 0.48,
      sun: win ? '#ffe2c0' : '#ffd0b0',
      sunI: win ? 0.75 : 0.5,
      sunPos: V3(-20, 90, -40),
      exposure: win ? 1.42 : 1.32,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(win ? '#3a2226' : '#26141a');
    c.fog(win ? 0.005 : 0.006);
    Sound.mood(win ? 'gold' : 'tense');
  };
  const stopAim = () => {
    if (!local.aiming) return;
    local.aiming = false;
    if (Player.mode === 'frozen') Player.mode = 'walk';
  };
  const respawn = () => {
    const x = Story.S.x;
    return W.spawn(Story.role === guideOf(x) && x.stage === 0 ? 'Kstage' : 'K', Story.role);
  };

  Story.register('tr_hK', {
    world: CourH,
    init: () => ({ stage: 0, seed: (Math.random() * 1e9) | 0, round: 0, roll: 0, full: 0, used: 0, marks: [], pause: 0, seen: [] }),
    // won: a reload goes on with the film of the table, then the reward
    resume: (x) => (x.stage >= 1 ? { cut: 'cour_h', after: 'reward', card: 'hK' } : null),
    voice: () => 1,
    partner: (c) => c.S.x.stage !== 2,
    hideRemote: (c) => c.S.x.stage === 2,
    net: {
      chKfx: (c, d) => fx(c, d),
      chKsay: (c, d) => (d[2] ? ksay(d[0], d[1]) : say(d[0], d[1])),
      chKhint: (c, k) => say(TXT.hint[k], 6000),
      chKfly: (c, d) => fly(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      reset();
      vKey = '';
      W.ST.area = 'K';
      W.ST.card = null;
      W.ST.marksOn = false;
      W.ST.dancersOn = false;
      W.ST.towerAt = null;
      W.ST.flight = null;
      W.ST.curtain = c.S.x.stage >= 1 ? 1 : 0;
      local.curtain = W.ST.curtain;
      makeUI();
      Player.targets = null;
      c.spawn(W.spawn('K', c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => {
        say(TXT.fall, 2200);
        c.send('chKsay', [TXT.fallMate, 2400, 0]);
        return respawn();
      };
      mood(c, c.S.x.stage >= 1);
      after(0.6, () => here() && mood(c, Story.S.x.stage >= 1));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.K) W.screens.K.show(TITLE, CARD + ' · des roses par-dessus le rideau', '#ff9ab4');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      const x = c.S.x;
      if (x.stage === 0 && x.round === 0 && !x.used && !x.roll) {
        say(TXT.intro, 3800);
        say(TXT.rule, 5600);
        after(4.6, () => here() && ksay(TXT.k.hello, 3400));
        after(8.4, () => here() && ksay(TXT.k.rule, 3800));
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      if (typeof Cut !== 'undefined' && Cut.on) Cut.stop();
      stopAim();
      if (Player.mode === 'frozen') Player.mode = 'walk';
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
      const me = c.role;
      if (x.stage !== local.stage) {
        local.stage = x.stage;
        if (x.stage === 1) {
          stopAim();
          // the carousel stops where it is
          local.ang = ROUNDS[Math.min(x.round, 1)].spin * local.rt;
          mood(c, true);
          local.winT = 0;
          fx(c, ['win']);
          say(TXT.win, 2800);
          after(2.6, () => ksay(TXT.k.win, 3800));
          after(7.4, () => ksay(TXT.k.down, 3200));
        }
        if (x.stage === 2) {
          // the film of the table: each screen plays it, then says it is done
          Player.mode = 'frozen';
          HUD.objective('');
          hideUI();
          local.cineSent = false;
          if (typeof Cut !== 'undefined' && Cut.has('cour_h'))
            Cut.play('cour_h').then(() => {
              if (!here() || Story.S.x.stage !== 2 || local.cineSent) return;
              local.cineSent = true;
              Cut.wait('{mate} regarde encore la cinématique…');
              c.act({ a: 'cineDone', who: Story.me });
            });
          else {
            local.cineSent = true;
            c.act({ a: 'cineDone', who: Story.me });
          }
        }
      }
      // a reloaded host lost who was done: say it again
      if (x.stage === 2 && local.cineSent && !(x.seen || []).includes(Story.me)) c.act({ a: 'cineDone', who: Story.me });
      // a new deal (a round, or the vases moved): the carousel's clock restarts on each screen
      const key = x.stage + '|' + x.round + '|' + x.roll;
      if (key !== local.key) {
        const prevRound = local.key ? +local.key.split('|')[1] : -1;
        local.key = key;
        if (x.stage === 0) {
          local.rt = 0;
          local.roundT = 0;
          if (x.round !== prevRound) {
            if (me !== throwerOf(x)) stopAim();
            const lines = () => say(me === throwerOf(x) ? TXT.thrower : TXT.guide, 6800);
            if (prevRound < 0 && x.round === 0 && !x.used && !x.roll) after(13, () => here() && Story.S.x.round === 0 && lines());
            else after(prevRound < 0 ? 0.5 : 2.6, () => here() && Story.S.x.round === x.round && lines());
          }
        }
      }
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage === 0 && !x.pause) {
        local.roundT += dt;
        if (local.roundT > 110) hint(c, x.round ? 'timing' : 'numbers', 0);
      }
      if (x.stage === 1 && local.winT > 11) c.set((s) => ((s.x.stage = 2), (s.x.seen = [])));
      if (x.stage === 2) {
        const n = (x.seen || []).length;
        local.cineStart += dt;
        const alone = n >= 1 && !Remote.fresh && local.cineStart > 3;
        if (n >= 2 || alone || local.cineStart > 120) c.goto('reward', (s) => (s.x.card = 'hK'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'cineDone') {
        const k = d.who || who;
        if (x.stage === 2 && !(x.seen || []).includes(k)) c.set((s) => (s.x.seen = [...(s.x.seen || []), k]));
        return;
      }
      if (d.a === 'throw') {
        if (x.stage !== 0 || x.pause || who !== throwerOf(x) || local.flying) return;
        if (!W.atRug(c.pos(who))) return;
        if ((x.used | 0) >= ROUNDS[x.round].roses) return;
        const ang = clamp(Math.round(+d.ang || 0), -25, 25);
        const pow = clamp(Math.round(+d.pow || 0), 0, 40);
        local.flying = true;
        c.set((s) => (s.x.used = (s.x.used | 0) + 1));
        fly(c, [ang, pow]);
        c.send('chKfly', [ang, pow]);
        const path = W.throwPath(ang, pow);
        after(path.t, () => land(c, ang, pow));
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.talk = Math.max(0, local.talk - dt);
      local.rt += dt;
      if (x.stage === 1) local.winT += dt;
      if (x.stage === 2) {
        Player.mode = 'frozen';
        W.update(dt, t, p);
        return null;
      }
      const F = W.ST.flight;
      if (F) {
        F.t += dt;
        if (F.t > (F.path ? F.path.t : 3) + 1.5) W.ST.flight = null;
      }

      // ----- the stage: vases and marks on the guide's screen (and on both once won) -----
      const ca = carAng(x);
      W.ST.carAng = ca;
      const V = vaseDeal(x);
      W.ST.vases = V.map((v, i) => {
        const q = vasePos(v, ca);
        const prev = W.ST.vases[i];
        return { x: q.x, z: q.z, onCar: true, full: !!((x.full | 0) & (1 << i)) || x.stage >= 1, flash: prev ? prev.flash : 0 };
      });
      const seeStage = x.stage >= 1 || (r === guideOf(x) && W.onStage(p));
      W.ST.vasesOn = seeStage;
      W.ST.marksSeen = seeStage && x.stage === 0;
      W.ST.stageMarks = (x.marks || []).map((m, i) => ({ x: m[0], y: m[1], z: m[2], a: i * 1.7 }));
      local.curtain = x.stage >= 1 ? Math.min(1, local.curtain + dt / 4) : 0;
      W.ST.curtain = ease01(local.curtain);

      // ----- the rug: aim, throw -----
      let prompt = null;
      const press = Input.pressed('interact');
      const iThrow = x.stage === 0 && r === throwerOf(x);
      if (local.aiming) {
        if (!iThrow || x.pause || Input.pressed('jump') || !W.atRug(p)) stopAim();
        else {
          Player.mode = 'frozen';
          Player.yaw = 0;
          const m = Input.move();
          local.rep -= dt;
          const sx = Math.abs(m.x) > 0.3 ? Math.sign(m.x) : 0;
          const sz = Math.abs(m.z) > 0.3 ? Math.sign(m.z) : 0;
          if (!sx && !sz) local.rep = 0;
          else if (local.rep <= 0) {
            local.rep = local.held ? 0.09 : 0.32;
            local.held = true;
            local.ang = clamp(local.ang + sx, -25, 25);
            local.pow = clamp(local.pow + sz, 0, 40);
            Sound.play('ui');
          }
          if (!sx && !sz) local.held = false;
          const left = ROUNDS[x.round].roses - (x.used | 0);
          prompt = ['E', TXT.throwK, false];
          const busy = F && F.t < (F.path ? F.path.t : 3) + 0.2;
          if (press && !busy && left > 0) c.act({ a: 'throw', ang: local.ang, pow: local.pow });
        }
      } else if (x.stage === 0 && W.atRug(p)) {
        if (!iThrow) {
          prompt = ['E', Story.fmt(TXT.notMine), false];
          if (press) sayOnce('nm', Story.fmt(TXT.notMine), 4);
        } else if (!x.pause) {
          prompt = ['E', TXT.aim, false];
          if (press) {
            local.aiming = true;
            local.held = false;
            sayOnce('leave', TXT.leave, 60);
            Player.body.v.set(0, 0, 0);
            Player.yaw = 0;
            Cam.yaw = 0;
          }
        }
      }

      // ----- HUD -----
      if (ui.root) {
        const show = x.stage === 0;
        ui.root.hidden = !show;
        if (show) {
          ui.aim.style.display = iThrow ? '' : 'none';
          if (iThrow) {
            const a = (local.ang > 0 ? '+' : '') + local.ang + '°';
            if (ui.a.textContent !== a) ui.a.textContent = a;
            const f = String(local.pow);
            if (ui.f.textContent !== f) ui.f.textContent = f;
            ui.ai.style.left = `calc(${(((local.ang + 25) / 50) * 100).toFixed(1)}% - 2px)`;
            ui.fi.style.left = `calc(${((local.pow / 40) * 100).toFixed(1)}% - 2px)`;
          }
          const left = Math.max(0, ROUNDS[x.round].roses - (x.used | 0));
          const rk = left + '/' + ROUNDS[x.round].roses;
          if (ui.roKey !== rk) {
            ui.roKey = rk;
            let h = '';
            for (let i = 0; i < ROUNDS[x.round].roses; i++) h += `<span class="${i < left ? '' : 'off'}">♥</span>`;
            ui.ro.innerHTML = h;
          }
          const n = nfull(x.full | 0) + (x.round ? 2 : 0);
          ui.v.forEach((b, i) => b.classList.toggle('on', i < n));
        }
      }

      // ----- the Roi: by his throne, at the front of the stage to bow once the curtain is up -----
      // (round the carousel, by the west side of the stage)
      const fp = x.stage >= 1 && local.winT > 2 ? [-8.2, W.STAGE_Y, 128.4, 1.4, Math.PI] : [W.THRONE[0], W.THRONE[1] + 0.5, W.THRONE[2] - 1.0, 3, Math.PI];
      W.ST.figPos.K = fp;
      const mid = V3((p.x + Remote.pos.x) / 2, W.O.y + 1.6, (p.z + Remote.pos.z) / 2);
      const lookAt = F && F.path && x.stage === 0 ? W.P(F.path.land.x, W.STAGE_Y + 1, F.path.land.z) : mid;
      W.ST.fig.K = {
        talk: local.talk > 0,
        raise: x.stage === 0 && F ? 0.6 : 0,
        bow: x.stage === 1 && local.winT > 5 && local.winT < 9.5 ? 1 : 0,
        look: lookAt,
      };
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return prompt;
    },
  });
  const ease01 = (k) => k * k * (3 - 2 * k);

  W.dbgK = { local, vaseDeal: () => Story.S && vaseDeal(Story.S.x), vasePos, carAng: () => Story.S && carAng(Story.S.x), throwerOf, guideOf, ROUNDS };
})();
