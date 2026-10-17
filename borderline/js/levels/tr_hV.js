// ♥ V · Le Valet de Cœur (épreuve hV), first figure of the table of hearts in the Cour. Kits swapped
// (js/game/trials.js: Yoline carries the valet kit, William the dame kit). La serre: twelve rose
// bushes on a music-box disc. The Valet has marked three of them with a heart; the hearts are seen
// only from the belvédère, and only by the one who guides; only the other one holds the shears (the
// host checks the hands and the distance). A wrong rose and the Valet replants: new colours, new
// hearts, the round starts again. Three roses, then you change places for three more, while the
// music box turns the garden (and fewer colours to tell the roses apart).
// The world (conservatory, garden, belvédère, the figure) is js/world/cour_h.js.
(() => {
  const CARD = Cards.tagOf('hV');
  const T = CONFIG;
  const W = CourH;
  const TITLE = 'Le Valet de Cœur';
  const WHO = 'Le Valet de Cœur';
  const TXT = {
    intro: 'Figure ♥. Le Valet de Cœur tient la serre : douze rosiers sur une boîte à musique.',
    rule: 'Il a marqué trois roses d’un cœur. Les cœurs ne se voient que du belvédère ; on ne cueille qu’en bas.',
    cutter: 'Tu tiens le sécateur. {mate} voit les cœurs depuis le belvédère : cueille les roses qu’{il} te désigne (E).',
    guide: 'Monte au belvédère : de là, tu vois les cœurs. Décris à {mate} les roses à cueillir ; {il} seul{pe} peut les couper.',
    objCut: 'Cueille les roses que {mate} te désigne ({n} / 3)',
    objGo: 'Monte au belvédère, par les escaliers ({n} / 3)',
    objGuide: 'Guide {mate} jusqu’aux roses marquées d’un cœur ({n} / 3)',
    cut: 'Cueillir la rose',
    notMine: 'Cette fois, c’est {mate} qui tient le sécateur.',
    good: 'La bonne rose.',
    wrong: 'Pas celle-là. Le Valet replante ses rosiers : de nouvelles couleurs, de nouveaux cœurs.',
    swap: 'Trois roses. Changez de place : à l’autre de cueillir.',
    turn: 'La boîte à musique se remonte : le jardin tourne, et il n’a plus que deux couleurs.',
    hint: {
      describe: 'Décrivez la rose : sa couleur, grande ou petite, et où elle est par rapport à celui qui cueille.',
      turn: 'Le jardin tourne, les cœurs aussi. Suivez la rose : « attends… elle arrive… celle-là ».',
      time: 'Celui qui cueille peut se placer sous le belvédère et attendre : on lui dit où aller.',
    },
    fall: 'Retour à l’entrée de la serre.',
    fallMate: '{mate} revient à l’entrée de la serre.',
    win: 'Six roses. Le bouquet du Valet est fait.',
    card: 'La carte ' + CARD + ' descend devant le jardin. Allez-y ensemble.',
    hud: { title: 'Bouquet', cut: 'Sécateur', guide: 'Belvédère' },
    v: {
      hello: 'Bienvenue dans ma serre ! J’ai marqué mes plus belles roses. Enfin, mes préférées.',
      rule: 'D’en haut on voit les cœurs, d’en bas on tient le sécateur. Il va falloir vous croire sur parole.',
      good: ['Oh, celle-là, oui !', 'Délicatement… parfait.', 'Vous avez l’œil, tous les deux.'],
      wrong: ['Ah non, pas celle-là ! Je replante.', 'Celle-ci n’avait pas de cœur. Je replante tout.'],
      r1: 'Et maintenant… je remonte ma boîte à musique.',
      win: 'Mon bouquet est fait, et pas une épine. Je m’incline.',
    },
  };
  CONFIG.cards.hV = {
    title: TITLE,
    sub: 'Figure ♥ · réussie',
    lines: ['Un jardin qui tourne, et douze rosiers.', 'L’un voyait les cœurs, l’autre tenait le sécateur.', 'Le Valet a eu son bouquet, cueilli sur parole.'],
  };

  // the rounds: who cuts, the colours dealt (indices into W.ROSE), the garden's turn (rad/s)
  const ROUNDS = [
    { cutter: 'dame', cols: [0, 1, 2, 3], spin: 0 },
    { cutter: 'valet', cols: [0, 1], spin: TAU / 46 },
  ];
  const REACH = 1.55;
  const local = {};
  const reset = () =>
    Object.assign(local, {
      stage: -1,
      key: '',
      rt: 0,
      ang: 0,
      sayCd: {},
      pend: [],
      objT: 0,
      fails: 0,
      roundT: 0,
      hinted: {},
      winT: 0,
      talk: 0,
      raise: 0,
      lines: -1,
      sync: 0,
      seen: null,
      lastMs: 0,
    });
  reset();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });
  const cutterOf = (x) => ROUNDS[Math.min(x.round, 1)].cutter;
  const guideOf = (x) => (cutterOf(x) === 'dame' ? 'valet' : 'dame');

  // ---------- the deal: colours, heights, the three marked bushes (from the seed and counters) ----------
  let dealKey = '';
  let dealOut = null;
  const deal = (x) => {
    const k = x.seed + '|' + x.round + '|' + x.roll;
    if (k === dealKey) return dealOut;
    const R0 = ROUNDS[Math.min(x.round, 1)];
    const r = rng(((x.seed | 0) + x.round * 7919 + (x.roll | 0) * 104729 + 17) >>> 0);
    const n = W.SLOTS.length;
    const col = [];
    const tall = [];
    for (let i = 0; i < n; i++) {
      col.push(R0.cols[Math.floor(r() * R0.cols.length)]);
      tall.push(r() < 0.5);
    }
    const marks = [];
    while (marks.length < 3) {
      const i = Math.floor(r() * n);
      if (!marks.includes(i)) marks.push(i);
    }
    dealKey = k;
    dealOut = { col, tall, marks };
    return dealOut;
  };
  const angNow = (x) => (x.stage === 0 ? ROUNDS[Math.min(x.round, 1)].spin * local.rt : local.ang);

  // ---------- the garden's clock (local.rt, seconds of the deal), shared by both screens ----------
  // The host's runs on real time (not on frames, which count 50 ms at most: a slow page fell
  // behind) and judges the cuts; it is sent with the deal it belongs to (S.x.T, S.x.Tk). The
  // guest's follows it: the last value heard plus the time since, eased toward it, so the garden
  // is at the same angle on both screens whatever their frame rates. The guest's cut also says the
  // angle it saw, taken by the host when it is near its own.
  const lat = () => Math.min(0.25, (Net.rtt || 80) / 2000);
  const clockStart = (x, key) => {
    local.rt = x.Tk === key ? +x.T || 0 : 0;
    local.seen = null;
    local.sync = 1;
  };
  // the guest, as a value comes in (when it comes, not at the next frame)
  const clockHear = (x) => {
    if (Net.isHost || x.Tk !== local.key) return;
    const v = +x.T || 0;
    if (!local.seen || local.seen.v !== v) local.seen = { v, t: performance.now() };
  };
  const clockTick = (x, dt) => {
    // real time, not the frame's dt (capped at 50 ms: a slow page would fall behind)
    const ms = performance.now();
    const real = local.lastMs ? clamp((ms - local.lastMs) / 1000, 0, Net.isHost ? 0.25 : 1) : dt;
    local.lastMs = ms;
    local.rt += real;
    if (Net.isHost || x.Tk !== local.key || !local.seen) return;
    const s = local.seen;
    const want = s.v + lat() + Math.min(2, (ms - s.t) / 1000);
    const e = want - local.rt;
    if (Math.abs(e) > 0.5) local.rt = want;
    else local.rt += e * Math.min(1, real * 4);
  };
  const count = (m) => {
    let n = 0;
    for (let i = 0; i < 16; i++) if (m & (1 << i)) n++;
    return n;
  };

  // ---------- HUD: the bouquet (three hearts), the role ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #chV{position:fixed;right:18px;top:150px;z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 14px;border-radius:14px;background:rgba(26,8,14,.6);box-shadow:0 0 0 1px rgba(255,255,255,.08);font:600 11px/1 "IBM Plex Mono",monospace;color:#f6e6ea;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #chV .p{display:flex;gap:6px;font:400 20px/1 Georgia,serif}
      #chV .p b{color:rgba(255,255,255,.18);font-weight:400}
      #chV .p b.on{color:#ff7a9a;text-shadow:0 0 10px #ff7a9a}
      #chV .r{opacity:.8}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'chV';
    ui.root.innerHTML = `<span>${TXT.hud.title}</span><div class="p"><b>♥</b><b>♥</b><b>♥</b></div><span class="r"></span>`;
    document.body.appendChild(ui.root);
    ui.hearts = [...ui.root.querySelectorAll('.p b')];
    ui.role = ui.root.querySelector('.r');
    ui.root.hidden = true;
  };
  const hideUI = () => ui.root && (ui.root.hidden = true);

  // ---------- small helpers ----------
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const vsay = (text, hold) => {
    HUD.say(text, WHO, hold || 2400);
    local.talk = 1.8;
  };
  const sayBoth = (c, text, hold) => {
    say(text, hold);
    c.send('chVsay', [text, hold || 2800, 0]);
  };
  const vsayBoth = (c, text, hold) => {
    vsay(text, hold);
    c.send('chVsay', [text, hold || 2400, 1]);
  };
  const sayOnce = (k, text, cd = 6) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const here = () => Story.S && Story.S.phase === 'tr_hV';
  const hint = (c, key, delay = 2.4) => {
    if (local.hinted[key]) return;
    local.hinted[key] = 1;
    after(delay, () => {
      say(TXT.hint[key], 6000);
      c.send('chVhint', key);
    });
  };

  // ---------- effects (both screens) ----------
  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'good' && a) {
      W.AU.snip();
      W.AU.chime();
      Sound.play('reveal');
      Fx.burst(V3(a[0], a[1], a[2]), '#ff8aa8', 60, 4, 1.0, -2);
      local.raise = 1.6;
    }
    if (k === 'wrong' && a) {
      W.AU.snip();
      Sound.play('rune', false);
      Fx.burst(V3(a[0], a[1], a[2]), '#7a9a6a', 40, 3, 0.9, -4);
      after(0.6, () => {
        Sound.play('creak');
        Fx.burst(W.P(W.GARDEN.x, 1.0, W.GARDEN.z), '#c8a088', 120, 7, 1.4, -3);
      });
    }
    if (k === 'swap') {
      Sound.play('chime');
      W.AU.chime(5);
      Fx.burst(W.P(W.GARDEN.x, 2.2, W.GARDEN.z), '#ffd0a0', 90, 6, 1.4, -2);
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      for (let i = 0; i < 4; i++) after(0.3 + i * 0.45, () => Fx.burst(W.P((i - 1.5) * 2.4, 3, 30), i % 2 ? '#ff8aa8' : '#ffd27a', 70, 6, 1.4, -1));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('chVfx', d);
  };

  // ---------- host: the shears ----------
  const cut = (c, who, d) => {
    const x = c.S.x;
    const i = d.i | 0;
    if (x.stage !== 0 || who !== cutterOf(x) || i < 0 || i >= W.SLOTS.length || x.cut & (1 << i)) return;
    // the garden as the cutter saw it when pressing E (its own screen), if near enough the host's
    const ha = angNow(x);
    const ang = Number.isFinite(+d.ang) && Math.abs(+d.ang - ha) < 0.12 ? +d.ang : ha;
    const sp = W.slotPos(i, ang);
    const p = c.pos(who);
    // a little more slack than the prompt (the garden turns while the order travels)
    if (Math.hypot(p.x - sp.x, p.z - sp.z) > REACH + 0.6 || Math.abs(p.y - W.O.y) > 1.2) return;
    const D = deal(x);
    const top = sp.clone().setY(W.O.y + (D.tall[i] ? 1.7 : 1.1));
    if (!D.marks.includes(i)) {
      local.fails++;
      fxBoth(c, ['wrong', top.toArray()]);
      sayBoth(c, TXT.wrong, 3400);
      after(0.9, () => vsayBoth(c, pick(TXT.v.wrong), 2400));
      c.set((s) => {
        s.x.roll = (s.x.roll | 0) + 1;
        s.x.cut = 0;
      });
      if (local.fails >= 2) hint(c, x.round ? 'turn' : 'describe', 4.2);
      return;
    }
    const nc = x.cut | (1 << i);
    fxBoth(c, ['good', top.toArray()]);
    const bq = [...(x.bouquet || []), D.col[i]];
    if (count(nc) < 3) {
      c.set((s) => {
        s.x.cut = nc;
        s.x.bouquet = bq;
      });
      sayBoth(c, TXT.good, 1600);
      if (Math.random() < 0.6) after(0.6, () => vsayBoth(c, pick(TXT.v.good), 1800));
      return;
    }
    if (x.round === 0) {
      c.set((s) => {
        s.x.cut = nc;
        s.x.bouquet = bq;
        s.x.pause = 1;
      });
      fxBoth(c, ['swap']);
      sayBoth(c, TXT.swap, 3400);
      after(3.6, () => {
        if (!here()) return;
        vsayBoth(c, TXT.v.r1, 2600);
        c.set((s) => {
          s.x.round = 1;
          s.x.roll = 0;
          s.x.cut = 0;
          s.x.pause = 0;
        });
      });
      return;
    }
    c.set((s) => {
      s.x.cut = nc;
      s.x.bouquet = bq;
      s.x.stage = 1;
    });
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 1) return TXT.card;
    const n = count(x.cut | 0);
    if (c.role === cutterOf(x)) return TXT.objCut.replace('{n}', n);
    return (W.onBelv(Player.body.p) ? TXT.objGuide : TXT.objGo).replace('{n}', n);
  };
  const mood = (c, win) => {
    LvKit.mood({
      sky: win ? '#e0b8b0' : '#b89090',
      ground: '#2a1814',
      hemi: win ? 0.66 : 0.56,
      sun: win ? '#ffe2c0' : '#ffd8c8',
      sunI: win ? 0.8 : 0.6,
      sunPos: V3(-40, 90, 30),
      exposure: win ? 1.4 : 1.32,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(win ? '#3a2228' : '#2a1820');
    c.fog(win ? 0.0052 : 0.0062);
    Sound.mood(win ? 'gold' : 'calm');
  };

  Story.register('tr_hV', {
    world: CourH,
    init: () => ({ stage: 0, seed: (Math.random() * 1e9) | 0, round: 0, roll: 0, cut: 0, bouquet: [], pause: 0 }),
    voice: () => 1,
    net: {
      chVfx: (c, d) => fx(c, d),
      chVsay: (c, d) => (d[2] ? vsay(d[0], d[1]) : say(d[0], d[1])),
      chVhint: (c, k) => say(TXT.hint[k], 6000),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      reset();
      dealKey = '';
      W.ST.area = 'V';
      W.ST.card = null;
      W.ST.marks = [];
      W.ST.marksOn = false;
      W.ST.dancersOn = false;
      W.ST.vasesOn = false;
      W.ST.curtain = 0;
      makeUI();
      Player.targets = null;
      c.spawn(W.spawn('V', c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => {
        say(TXT.fall, 2200);
        c.send('chVsay', [TXT.fallMate, 2400, 0]);
        return W.spawn('V', Story.role);
      };
      mood(c, c.S.x.stage === 1);
      after(0.6, () => here() && mood(c, Story.S.x.stage === 1));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.V) W.screens.V.show(TITLE, CARD + ' · cueillir sur parole', '#ff9ab4');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      const x = c.S.x;
      if (x.stage === 0 && x.round === 0 && !x.roll && !x.cut) {
        say(TXT.intro, 3800);
        say(TXT.rule, 5200);
        after(4.4, () => here() && vsay(TXT.v.hello, 3400));
        after(8.2, () => here() && vsay(TXT.v.rule, 3800));
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
        local.stage = x.stage;
        if (x.stage === 1) {
          // the garden stops where it is
          local.ang = ROUNDS[Math.min(x.round, 1)].spin * local.rt;
          mood(c, true);
          local.winT = 0;
          fx(c, ['win']);
          say(TXT.win, 2600);
          after(0.9, () => vsay(TXT.v.win, 3800));
          after(5.2, () => say(TXT.card, 4200));
        }
      }
      // a new deal (a round, or the same one replanted): the garden's clock restarts on each screen
      const key = x.stage + '|' + x.round + '|' + x.roll;
      if (key !== local.key) {
        const prevRound = local.key ? +local.key.split('|')[1] : -1;
        local.key = key;
        if (x.stage === 0) {
          clockStart(x, key);
          local.roundT = 0;
          if (x.round !== prevRound) {
            const lines = () => say(me === cutterOf(x) ? TXT.cutter : TXT.guide, 6400);
            if (prevRound < 0 && x.round === 0 && !x.roll && !x.cut) after(12.4, () => here() && Story.S.x.round === 0 && lines());
            else {
              if (x.round === 1) after(0.4, () => say(TXT.turn, 3600));
              after(prevRound < 0 ? 0.5 : 4.2, () => here() && Story.S.x.round === x.round && lines());
            }
          }
        }
      }
      clockHear(x);
      const D = deal(x);
      W.ST.roses = { col: D.col, tall: D.tall };
      W.ST.cut = x.cut | 0;
      W.ST.marks = D.marks;
      W.ST.bouquet = x.bouquet || [];
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      local.sync += dt;
      if (local.sync > 1 && x.stage === 0) {
        local.sync = 0;
        c.set((s) => {
          s.x.T = +local.rt.toFixed(3);
          s.x.Tk = local.key;
        });
      }
      if (x.stage === 0 && !x.pause) {
        local.roundT += dt;
        if (local.roundT > 95 && !local.hinted['t' + x.round]) {
          local.hinted['t' + x.round] = 1;
          hint(c, x.round ? 'turn' : 'describe', 0);
        }
        if (local.roundT > 160) hint(c, 'time', 0);
      }
      if (x.stage === 1 && local.winT > 5) {
        const cp = W.cardPos('V');
        const ok = (q) => Math.hypot(q.x - cp.x, q.z - cp.z) < 3 && Math.abs(q.y - W.O.y) < 2;
        if (ok(c.pos('dame')) && ok(c.pos('valet'))) c.goto('reward', (s) => (s.x.card = 'hV'));
      }
    },
    action(c, who, d) {
      if (d.a === 'cut') cut(c, who, d);
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
      local.raise = Math.max(0, local.raise - dt);
      if (x.stage === 1) local.winT += dt;
      // the garden turns (round 2): it carries whoever stands on it
      const a0 = angNow(x);
      clockTick(x, dt);
      const a1 = angNow(x);
      const da = a1 - a0;
      if (da && W.onGarden(p) && Player.body.grounded) {
        const cx = W.O.x + W.GARDEN.x;
        const cz = W.O.z + W.GARDEN.z;
        const dx = p.x - cx;
        const dz = p.z - cz;
        p.x = cx + dx * Math.cos(da) + dz * Math.sin(da);
        p.z = cz - dx * Math.sin(da) + dz * Math.cos(da);
        Player.yaw += da;
      }
      W.ST.discAng = a1;

      // ----- the hearts: only on the guide's screen, only from the belvédère -----
      const iGuide = x.stage === 0 && r === guideOf(x);
      W.ST.marksOn = iGuide && W.onBelv(p) && !x.pause;

      // ----- the shears: the nearest uncut bush within reach -----
      let prompt = null;
      const press = Input.pressed('interact');
      if (x.stage === 0 && !x.pause && W.onGarden(p)) {
        let best = -1;
        let bd = REACH;
        for (let i = 0; i < W.SLOTS.length; i++) {
          if (x.cut & (1 << i)) continue;
          const sp = W.slotPos(i, a1);
          const d = Math.hypot(p.x - sp.x, p.z - sp.z);
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        if (best >= 0) {
          if (r !== cutterOf(x)) {
            prompt = ['E', Story.fmt(TXT.notMine), false];
            if (press) sayOnce('nm', Story.fmt(TXT.notMine), 4);
          } else {
            prompt = ['E', TXT.cut, false];
            if (press) {
              W.AU.snip();
              c.act({ a: 'cut', i: best, ang: +a1.toFixed(4) });
            }
          }
        }
      }

      // ----- HUD -----
      if (ui.root) {
        const show = x.stage === 0;
        ui.root.hidden = !show;
        if (show) {
          const n = count(x.cut | 0);
          ui.hearts.forEach((b, i) => b.classList.toggle('on', i < n));
          const lab = r === cutterOf(x) ? TXT.hud.cut : TXT.hud.guide;
          if (ui.role.textContent !== lab) ui.role.textContent = lab;
        }
      }

      // ----- the Valet: watches the one with the shears, offers his rose, bows at the end -----
      const cp = x.stage === 0 ? c.pos(cutterOf(x)) : V3((p.x + Remote.pos.x) / 2, W.O.y, (p.z + Remote.pos.z) / 2);
      W.ST.figPos.V = null;
      W.ST.fig.V = {
        talk: local.talk > 0,
        raise: local.raise > 0 ? 1 : 0,
        bow: x.stage === 1 && local.winT > 1.2 && local.winT < 6 ? 1 : 0,
        look: V3(cp.x, W.O.y + 1.6, cp.z),
      };
      W.ST.card = x.stage === 1 && local.winT > 4.5 ? 'V' : null;
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
  W.dbgV = { local, deal: () => Story.S && deal(Story.S.x), cutterOf, guideOf, angNow: () => Story.S && angNow(Story.S.x) };
})();
