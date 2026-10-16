// ♣ V · Le Valet de Trèfle (épreuve cV), first figure of the table of clubs in the Cour. A tug of
// war: the Valet holds two ropes, one for each of you, and beats a drum; a heave counts only when
// you both pull on the same stroke (the host compares the two pulls), alone or off the beat the rope
// slips back. Three rounds: the drum seen by both; then hidden from one of you (the other one calls
// the rhythm aloud) with feints; then the other way round, with a broken rhythm. A lost round is
// played again on a new rhythm. The world (hall, drum, ropes, the figure) is js/world/cour_c.js.
(() => {
  const CARD = Cards.tagOf('cV');
  const T = CONFIG;
  const W = CourC;
  const TITLE = 'Le Valet de Trèfle';
  const WHO = 'Le Valet de Trèfle';
  const TXT = {
    intro: 'Figure ♣. Le Valet de Trèfle tient deux cordes : une pour chacun de vous.',
    rule: 'Tirez ensemble, au coup de tambour. Seul, ou à contretemps, la corde file.',
    grip: 'Prends ta corde : le cercle {col}, au bout des cordes.',
    obj: 'Manche {r} / 3 · tirez ensemble au tambour · {k} / {g}',
    objWait: 'Manche {r} / 3 · tenez vos cordes…',
    see: 'Le tambour n’est visible que de ton côté. Donne le rythme à {mate}, à voix haute.',
    blind: 'Tu ne vois plus le tambour. {mate} te donne le rythme : tire sur sa voix.',
    feintRule: 'Tambour rouge : il fait semblant. On ne tire pas.',
    heave: 'Ensemble !',
    alone: 'Pas ensemble : la corde file.',
    feint: 'Feinte : il n’avait pas frappé.',
    early: 'Trop tôt : la corde file.',
    lost: 'Il a gagné la manche. On la rejoue, avec un autre rythme.',
    won: 'Manche gagnée.',
    pull: 'Tirer',
    hint: {
      beat: 'Tirez au coup de tambour, pas avant : trop tôt, la corde file.',
      call: 'Celui qui voit le tambour compte à voix haute : « un, deux… tire ! »',
      feint: 'Le tambour rouge ne compte pas : laissez-le passer, sans tirer.',
    },
    fall: 'La tranchée. Retour aux cordes.',
    fallMate: '{mate} est tombé{pe} dans la tranchée. {Il} revient aux cordes.',
    win: 'Le Valet lâche les cordes.',
    card: 'La carte ' + CARD + ' descend entre vos deux cordes. Allez-y ensemble.',
    hud: { see: 'Tambour', blind: 'Le rythme : {mate}', both: 'Tambour' },
    v: {
      hello: 'Bienvenue à la table de Trèfle ! Ici, rien ne se fait seul. Prenez chacun une corde.',
      r0: 'Au tambour ! Vous le voyez tous les deux. Pour commencer.',
      r1: 'Je cache mon tambour. Un seul de vous deux le voit, maintenant.',
      r2: 'À l’autre de le voir. Et je change de rythme.',
      heave: ['Oh !', 'Hé, doucement !', 'Pas mal…', 'Oups.'],
      alone: ['Un seul ? Je ne sens rien.', 'Ensemble, j’ai dit !'],
      feint: ['Ha ! Je n’ai pas frappé.', 'Feinte !'],
      lost: 'Manche pour moi ! On rejoue.',
      won: 'Manche pour vous. Je m’accroche, attention.',
      win: 'D’accord, d’accord, je lâche ! Vous tirez comme une seule personne.',
    },
  };
  CONFIG.cards.cV = {
    title: TITLE,
    sub: 'Figure ♣ · réussie',
    lines: ['Une corde chacun, un seul tambour.', 'Vous avez tiré au même moment, sans vous regarder.', 'Le Valet a ri, et il a lâché.'],
  };

  // the rounds: who sees the drum, how often it feints, the gaps between strokes
  const ROUNDS = [
    { goal: 4, see: ['dame', 'valet'], feint: 0, iv: [1.7] },
    { goal: 5, see: ['dame'], feint: 0.25, iv: [1.5] },
    { goal: 5, see: ['valet'], feint: 0.3, iv: [1.0, 1.3, 1.6] },
  ];
  const LEAD = 3.2;
  const LOSE = -3;
  const WIN_BEFORE = 0.4;
  const WIN_AFTER = 0.58;
  const local = {};
  const reset = () =>
    Object.assign(local, {
      stage: -1,
      key: '',
      rt: 0,
      seen: 0,
      next: 0,
      pulls: { dame: [], valet: [] },
      lastPull: { dame: -9, valet: -9 },
      earlyCd: 0,
      pause: 0,
      winT: 0,
      sayCd: {},
      pend: [],
      objT: 0,
      fails: 0,
      roundT: 0,
      hinted: {},
      strike: 0,
      yank: 0,
      lines: 0,
    });
  reset();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- the strokes of a round (the same on both screens: from the seed and counters) ----------
  let beatsKey = '';
  let beatsList = null;
  const beats = (x) => {
    const k = x.seed + '|' + x.round + '|' + x.roll;
    if (k === beatsKey) return beatsList;
    const R0 = ROUNDS[Math.min(x.round, 2)];
    const r = rng(((x.seed | 0) + x.round * 977 + (x.roll | 0) * 104729) >>> 0);
    const out = [];
    let t = LEAD;
    let lastFeint = false;
    for (let i = 0; i < 160; i++) {
      // never two feints in a row, never on the first two strokes
      const f = i > 1 && !lastFeint && r() < R0.feint;
      out.push({ t, f });
      lastFeint = f;
      t += R0.iv[Math.floor(r() * R0.iv.length)];
    }
    beatsKey = k;
    beatsList = out;
    return out;
  };
  const sees = (x, who) => x.round < ROUNDS.length && ROUNDS[x.round].see.includes(who);

  // ---------- HUD: the drum light (for the one who sees it), or who gives the rhythm ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #ccV{position:fixed;left:50%;top:40px;transform:translateX(-50%);z-index:6;pointer-events:none;display:flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:rgba(8,16,12,.6);box-shadow:0 0 0 1px rgba(255,255,255,.08);font:600 12px/1 "IBM Plex Mono",monospace;color:#e8f2e6;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #ccV i{display:block;width:22px;height:22px;border-radius:50%;background:#22382c;box-shadow:inset 0 0 0 2px #d9a94a;transition:background .08s}
      #ccV i.hit{background:#ffd27a;box-shadow:0 0 18px #ffd27a,inset 0 0 0 2px #fff3c8}
      #ccV i.red{background:#ff4a3a;box-shadow:0 0 18px #ff4a3a,inset 0 0 0 2px #ffc8c0}
      #ccV b{font-weight:600;min-width:64px;text-align:center}
      #ccV .sc{display:flex;gap:3px}
      #ccV .sc span{width:7px;height:14px;border-radius:2px;background:rgba(255,255,255,.14)}
      #ccV .sc span.on{background:#9fe8b8}
      #ccV .sc span.neg{background:#ff7a6a}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'ccV';
    ui.root.innerHTML = '<i></i><b></b><div class="sc"></div>';
    document.body.appendChild(ui.root);
    ui.dot = ui.root.querySelector('i');
    ui.label = ui.root.querySelector('b');
    ui.sc = ui.root.querySelector('.sc');
    ui.root.hidden = true;
  };
  const hideUI = () => ui.root && (ui.root.hidden = true);
  const drawScore = (x) => {
    const g = ROUNDS[Math.min(x.round, 2)].goal;
    const k = x.k | 0;
    const key = k + '/' + g;
    if (ui.scKey === key) return;
    ui.scKey = key;
    let h = '';
    for (let i = LOSE + 1; i <= g; i++) {
      if (i === 0) continue;
      const on = i > 0 ? k >= i : k <= i;
      h += `<span class="${on ? (i > 0 ? 'on' : 'neg') : ''}"></span>`;
    }
    ui.sc.innerHTML = h;
  };

  // ---------- small helpers ----------
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const vsay = (text, hold) => {
    HUD.say(text, WHO, hold || 2400);
    local.talk = 1.6;
  };
  const sayBoth = (c, text, hold) => {
    say(text, hold);
    c.send('ccVsay', [text, hold || 2800, 0]);
  };
  const vsayBoth = (c, text, hold) => {
    vsay(text, hold);
    c.send('ccVsay', [text, hold || 2400, 1]);
  };
  const sayOnce = (k, text, cd = 8) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const here = () => Story.S && Story.S.phase === 'tr_cV';

  // ---------- effects (both screens) ----------
  const fx = (c, d) => {
    const [k] = d;
    const mid = W.P(0, 1.6, 22);
    if (k === 'heave') {
      W.ST.heave = 1;
      W.AU.creak(1);
      Sound.play('thud');
      Fx.burst(mid, '#9fe8b8', 40, 4, 0.8, -3);
      local.yank = -1;
    }
    if (k === 'slip') {
      W.AU.creak(0.6);
      Sound.play('rune', false);
      local.yank = 1;
      Cam.shake = Math.max(Cam.shake, 0.25);
    }
    if (k === 'round') {
      Sound.play('chime');
      Sound.play('reveal');
      Fx.burst(W.P(0, 3, 30), '#ffd27a', 90, 6, 1.2, -2);
    }
    if (k === 'lost') {
      Sound.play('rumble', 0.4);
      local.yank = 1.5;
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      for (let i = 0; i < 4; i++) after(0.3 + i * 0.45, () => Fx.burst(W.P((i - 1.5) * 2, 3.2, 30), i % 2 ? '#9fe8b8' : '#ffd27a', 70, 6, 1.4, -1));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('ccVfx', d);
  };

  // ---------- host: the judge of the strokes ----------
  const score = (c, d, why, who) => {
    const x = c.S.x;
    const k = (x.k | 0) + d;
    if (d > 0) {
      fxBoth(c, ['heave']);
      if (Math.random() < 0.4) vsayBoth(c, pick(TXT.v.heave), 1400);
    } else {
      fxBoth(c, ['slip']);
      local.fails++;
      sayBoth(c, TXT[why], 1800);
      if (why === 'feint' && Math.random() < 0.6) vsayBoth(c, pick(TXT.v.feint), 1400);
      if (why === 'alone' && Math.random() < 0.4) vsayBoth(c, pick(TXT.v.alone), 1400);
      hint(c, why);
    }
    const R0 = ROUNDS[x.round];
    if (k >= R0.goal) {
      // the round is ours: a pause, then the next one (or the end)
      fxBoth(c, ['round']);
      const last = x.round + 1 >= ROUNDS.length;
      c.set((s) => {
        s.x.k = k;
        s.x.on = false;
        if (last) s.x.stage = 1;
      });
      local.pause = 5.5;
      if (!last) {
        sayBoth(c, TXT.won, 2000);
        after(1.2, () => vsayBoth(c, TXT.v.won, 2600));
        after(4.2, () => here() && c.set((s) => ((s.x.round = x.round + 1), (s.x.roll = 0), (s.x.k = 0))));
      }
      return;
    }
    if (k <= LOSE) {
      fxBoth(c, ['lost']);
      vsayBoth(c, TXT.v.lost, 2200);
      after(2.3, () => sayBoth(c, TXT.lost, 3000));
      c.set((s) => {
        s.x.k = 0;
        s.x.on = false;
        s.x.roll = (s.x.roll | 0) + 1;
      });
      local.pause = 5.5;
      local.fails += 2;
      hint(c, 'lost');
      return;
    }
    c.set((s) => (s.x.k = k));
  };
  // hints after mistakes (each kind once per visit), or when a round drags on
  const hint = (c, why) => {
    const x = c.S.x;
    let key = null;
    if (why === 'early' && local.fails >= 2) key = 'beat';
    if (why === 'feint' && local.fails >= 2) key = 'feint';
    if ((why === 'alone' || why === 'lost' || why === 'time') && x.round >= 1) key = 'call';
    if (why === 'time' && x.round === 0) key = 'beat';
    if (!key || local.hinted[key]) return;
    local.hinted[key] = 1;
    after(2.2, () => {
      say(TXT.hint[key], 6000);
      c.send('ccVhint', key);
    });
  };
  // a pull: in the window of a stroke it waits for the judgement; outside every window it slips
  const pull = (c, who) => {
    const x = c.S.x;
    if (x.stage !== 0 || !x.on || local.pause > 0) return;
    if (!W.atGrip(who, c.pos(who))) return;
    const t = local.rt;
    if (t - local.lastPull[who] < 0.42) return;
    local.lastPull[who] = t;
    const B = beats(x);
    let near = false;
    for (let i = Math.max(0, local.next - 1); i < Math.min(B.length, local.next + 3); i++) {
      if (t >= B[i].t - WIN_BEFORE && t <= B[i].t + WIN_AFTER) near = true;
    }
    if (near) local.pulls[who].push(t);
    else if (local.earlyCd <= 0) {
      local.earlyCd = 0.8;
      score(c, -1, 'early', who);
    }
  };
  const judge = (c) => {
    const x = c.S.x;
    const B = beats(x);
    while (local.next < B.length && local.rt > B[local.next].t + WIN_AFTER + 0.04) {
      const b = B[local.next];
      local.next++;
      const got = {};
      ['dame', 'valet'].forEach((w) => {
        const i = local.pulls[w].findIndex((t) => t >= b.t - WIN_BEFORE && t <= b.t + WIN_AFTER);
        got[w] = i >= 0;
        // a pull answers one stroke only
        local.pulls[w] = local.pulls[w].filter((t) => t > b.t + WIN_AFTER);
      });
      const n = (got.dame ? 1 : 0) + (got.valet ? 1 : 0);
      if (b.f) {
        if (n) return score(c, -1, 'feint');
      } else if (n === 2) return score(c, +1);
      else if (n === 1) return score(c, -1, 'alone');
    }
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    if (x.stage === 1) return TXT.card;
    const g = ROUNDS[x.round].goal;
    if (!W.atGrip(r, Player.body.p)) return TXT.grip.replace('{col}', r === 'dame' ? 'rose' : 'doré');
    if (!x.on) return TXT.objWait.replace('{r}', x.round + 1);
    return TXT.obj.replace('{r}', x.round + 1).replace('{k}', Math.max(0, x.k | 0)).replace('{g}', g);
  };

  const mood = (c, win) => {
    LvKit.mood({
      sky: win ? '#a8c0a0' : '#7a9a8c',
      ground: '#2a1e14',
      hemi: win ? 0.62 : 0.5,
      sun: win ? '#ffe2b0' : '#cfe0ff',
      sunI: win ? 0.75 : 0.5,
      sunPos: V3(-40, 90, 60),
      exposure: win ? 1.4 : 1.3,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(win ? '#22302a' : '#16201f');
    c.fog(win ? 0.0055 : 0.007);
    Sound.mood(win ? 'gold' : 'tense');
  };

  Story.register('tr_cV', {
    world: CourC,
    init: () => ({ stage: 0, seed: (Math.random() * 1e9) | 0, round: 0, roll: 0, k: 0, on: false }),
    voice: () => 1,
    net: {
      ccVfx: (c, d) => fx(c, d),
      ccVsay: (c, d) => (d[2] ? vsay(d[0], d[1]) : say(d[0], d[1])),
      ccVhint: (c, k) => say(TXT.hint[k], 6000),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.ST.area = 'V';
      W.ST.card = null;
      W.ST.tug = 0;
      W.ST.carOn = false;
      W.ST.discOn = false;
      makeUI();
      reset();
      beatsKey = '';
      Player.targets = null;
      c.spawn(W.spawn('V', c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => {
        say(TXT.fall, 2200);
        c.send('ccVsay', [TXT.fallMate, 2400, 0]);
        return W.spawn('V', Story.role);
      };
      mood(c, c.S.x.stage === 1);
      after(0.6, () => here() && mood(c, Story.S.x.stage === 1));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.V) W.screens.V.show(TITLE, CARD + ' · tirez ensemble', '#9fe8b8');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      const x = c.S.x;
      if (x.stage === 0 && x.round === 0 && !x.on) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4400);
        after(4, () => here() && vsay(TXT.v.hello, 3600));
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
      const me = c.role;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (x.stage === 1) {
          mood(c, true);
          local.winT = 0;
          fx(c, ['win']);
          say(TXT.win, 2600);
          after(0.8, () => vsay(TXT.v.win, 3800));
          after(5, () => say(TXT.card, 4200));
        } else if (prev === 1) mood(c, false);
      }
      // a new round (or the same one replayed): its clock starts now, on each screen
      const key = x.stage + '|' + x.round + '|' + x.roll + '|' + (x.on ? 1 : 0);
      if (key !== local.key) {
        local.key = key;
        local.rt = 0;
        local.seen = 0;
        local.next = 0;
        local.pulls = { dame: [], valet: [] };
        local.lastPull = { dame: -9, valet: -9 };
        local.roundT = 0;
        if (x.stage === 0 && x.on) {
          const R0 = ROUNDS[x.round];
          if (!x.roll) {
            if (x.round === 0) vsay(TXT.v.r0, 2600);
            if (x.round === 1) vsay(TXT.v.r1, 2800);
            if (x.round === 2) vsay(TXT.v.r2, 2600);
            if (R0.see.length < 2) after(0.4, () => say(sees(x, me) ? TXT.see : TXT.blind, 5200));
            if (x.round === 1) after(5.8, () => say(TXT.feintRule, 4200));
          }
        }
      }
      W.ST.tug = x.stage === 1 ? 6 : x.k | 0;
      W.ST.cover = x.stage === 0 && !sees(x, me);
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      local.earlyCd -= dt;
      if (x.stage === 0) {
        local.pause -= dt;
        // the round starts once both hold their ropes (and the pause after the last one is over)
        if (!x.on && local.pause <= 0 && W.atGrip('dame', c.pos('dame')) && W.atGrip('valet', c.pos('valet'))) c.set((s) => (s.x.on = true));
        if (x.on) {
          judge(c);
          local.roundT += dt;
          if (local.roundT > 80 && !local.hinted['t' + x.round]) {
            local.hinted['t' + x.round] = 1;
            hint(c, 'time');
          }
        }
      }
      if (x.stage === 1 && local.winT > 5) {
        const cp = W.cardPos('V');
        const ok = (q) => Math.hypot(q.x - cp.x, q.z - cp.z) < 3 && Math.abs(q.y - W.O.y) < 2;
        if (ok(c.pos('dame')) && ok(c.pos('valet'))) c.goto('reward', (s) => (s.x.card = 'cV'));
      }
    },
    action(c, who, d) {
      if (d.a === 'pull') pull(c, who);
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
      local.rt += dt;
      local.talk = Math.max(0, (local.talk || 0) - dt);
      local.strike = Math.max(0, local.strike - dt * 4);
      local.yank = damp(local.yank, 0, 3, dt);
      if (x.stage === 1) local.winT += dt;

      // ----- the drum: what this screen sees of it -----
      const iSee = x.stage === 0 && sees(x, r);
      let flash = '';
      if (x.stage === 0 && x.on) {
        const B = beats(x);
        while (local.seen < B.length && local.rt >= B[local.seen].t) {
          const b = B[local.seen];
          local.seen++;
          if (!iSee) continue;
          if (b.f) {
            W.ST.drumRed = 1;
            W.AU.drum(0.8, true);
            flash = 'red';
          } else {
            W.ST.drumHit = 1;
            W.AU.drum(1);
            local.strike = 1;
            flash = 'hit';
          }
        }
      }
      if (ui.root) {
        const show = x.stage === 0 && W.atGrip(r, p);
        ui.root.hidden = !show;
        if (show) {
          const both = ROUNDS[x.round].see.length > 1;
          const lab = iSee ? (both ? TXT.hud.both : TXT.hud.see) : Story.fmt(TXT.hud.blind);
          if (ui.label.textContent !== lab) ui.label.textContent = lab;
          ui.dot.style.visibility = iSee ? '' : 'hidden';
          if (flash) {
            ui.dot.className = flash;
            clearTimeout(ui.tm);
            ui.tm = setTimeout(() => (ui.dot.className = ''), 140);
          }
          drawScore(x);
        }
      }

      // ----- the Valet: leaning back on the ropes, striking the drum (only where it is seen) -----
      const k = x.stage === 1 ? 6 : x.k | 0;
      const fz = x.stage === 1 ? 31.5 : W.VA.fig[1] - k * 0.5;
      W.ST.figPos.V = [W.VA.fig[0], 0.2, fz, 2.5, Math.PI];
      const mid = V3((p.x + Remote.pos.x) / 2, W.O.y + 1.6, (p.z + Remote.pos.z) / 2);
      W.ST.fig.V = {
        talk: local.talk > 0,
        bow: x.stage === 1 && local.winT > 1.2 && local.winT < 6 ? 1 : 0,
        pull: x.stage === 1 ? 0 : clamp(0.7 + local.yank * 0.3, 0, 1.2),
        strike: iSee && !W.ST.cover ? local.strike : 0,
        look: mid,
      };

      // ----- E: pull my rope -----
      let prompt = null;
      if (x.stage === 0 && W.atGrip(r, p)) {
        prompt = ['E', TXT.pull, false];
        if (Input.pressed('interact')) {
          W.AU.creak(0.4);
          Cam.shake = Math.max(Cam.shake, 0.12);
          c.act({ a: 'pull' });
        }
      }
      W.ST.card = x.stage === 1 && local.winT > 4 ? 'V' : null;
      W.ST.ropesDown = x.stage === 1 && local.winT > 0.6;
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return prompt;
    },
  });

  // for the test driver
  W.dbgV = { local, beats: () => Story.S && beats(Story.S.x), ROUNDS };
})();
