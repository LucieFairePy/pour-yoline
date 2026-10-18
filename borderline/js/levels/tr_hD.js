// ♥ D · La Dame de Cœur (épreuve hD), second figure of the table of hearts. Kits as usual
// (Yoline: dame, William: valet). La salle de bal: the Dame gives a ball and trusts you with her
// tower of coupes. One carries it from the buffet across the parquet to her table, slowly (no
// running, no jumping); the other guides from a gallery. Her dancers turn in five long rounds
// across the floor (a free lane between two rounds, where one can wait), and they are seen only
// from the galleries: the one who carries walks among couples they cannot see, on the other's
// word. A brush with a couple makes the coupes ring (the host checks both positions against the
// dancers' figures, from a synced clock); the second one and the Dame puts the tower back on the
// buffet, the dancers change their figures. Two crossings, roles changed in between, the music
// (and the dancers) faster for the second.
// The world (ballroom, galleries, dancers, tower, the figure) is js/world/cour_h.js.
(() => {
  const CARD = Cards.tagOf('hD');
  const T = CONFIG;
  const W = CourH;
  const TITLE = 'La Dame de Cœur';
  const WHO = 'La Dame de Cœur';
  const TXT = {
    intro: 'Figure ♥. La Dame de Cœur donne un bal, et vous confie sa pyramide de coupes.',
    rule: 'Ses danseurs ne se voient que des galeries. Qui porte les coupes traverse le bal à la voix de l’autre.',
    carrier: 'Prends la pyramide au buffet (E) et porte-la jusqu’à la table de la Dame. Tu ne vois pas les danseurs : {mate} te guide depuis la galerie.',
    guide: 'Monte sur une galerie, par les escaliers du sud : de là, tu vois les danseurs. Guide {mate} entre les couples.',
    objTake: 'Prends la pyramide au buffet ({n} / 2)',
    objCarry: 'Porte la pyramide à la table de la Dame, à la voix de {mate} ({n} / 2)',
    objGo: 'Monte sur une galerie, par les escaliers du sud ({n} / 2)',
    objGuide: 'Guide {mate} entre les danseurs ({n} / 2)',
    take: 'Prendre la pyramide',
    put: 'Poser la pyramide',
    notMine: 'Cette fois, c’est {mate} qui porte.',
    bump: 'Un couple vous frôle : les coupes tintent. Encore un, et elles tombent.',
    jump: 'On ne saute pas avec des coupes !',
    spill: 'La pyramide penche… La Dame la rattrape et la remet au buffet. Les danseurs changent de figure.',
    done: 'La pyramide est sur la table.',
    swap: 'Changez de place : à l’autre de porter. La musique accélère.',
    hint: {
      stop: 'Entre deux rondes, il y a toujours une allée libre : on peut s’y arrêter. Le guide dit « stop », puis « vas-y ».',
      call: 'Annoncez les couples par rapport à celui qui porte : « un couple arrive sur ta gauche, attends ».',
    },
    fall: 'Retour au buffet.',
    fallMate: '{mate} revient au buffet.',
    win: 'Deux pyramides, pas une goutte. La musique ralentit.',
    card: 'La carte ' + CARD + ' descend au milieu du bal. Allez-y ensemble.',
    hud: { title: 'Les coupes', carry: 'Porter', guide: 'Galerie' },
    d: {
      hello: 'Bienvenue à mon bal. Mes danseurs sont timides : ils ne se montrent qu’aux galeries.',
      rule: 'Portez-moi ces coupes sans en verser une goutte. On vous guidera, j’en suis sûre.',
      bump: ['Pardon, pardon !', 'Attention à mes coupes…', 'Oups, un pas de trop.'],
      spill: 'Ce n’est rien, je refais la pyramide.',
      done: 'Merveilleux. Et maintenant, un peu plus vite !',
      win: 'Vous avez traversé mon bal comme si vous l’aviez dansé ensemble. Je m’incline.',
    },
  };
  CONFIG.cards.hD = {
    title: TITLE,
    sub: 'Figure ♥ · réussie',
    lines: ['Une pyramide de coupes, et un bal qu’un seul voyait.', 'L’un portait, l’autre disait « attends », puis « maintenant ».', 'La Dame n’a pas perdu une goutte.'],
  };

  // the crossings: who carries, how many couples, how fast, the waltz's tempo
  const ROUNDS = [
    { carrier: 'dame', rows: 5, per: 6, sp: 1.0, bpm: 120 },
    { carrier: 'valet', rows: 5, per: 6, sp: 1.2, bpm: 144 },
  ];
  const BUMP_R = 1.0;
  const STRIKES = 2;
  const CARRY_V = 2.7;
  const local = {};
  const reset = () =>
    Object.assign(local, {
      stage: -1,
      key: '',
      rt: 0,
      bumpCd: 0,
      jumpCd: 0,
      jumpAsk: 0,
      sayCd: {},
      pend: [],
      objT: 0,
      fails: 0,
      roundT: 0,
      hinted: {},
      winT: 0,
      talk: 0,
      lines: -1,
      str: 0,
      sync: 0,
      seen: null,
      lastMs: 0,
    });
  reset();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- the dance's clock (local.rt, seconds of the figure), shared by both screens ----------
  // The host's runs on real time (not on frames, which count 50 ms at most: a slow page fell
  // behind) and judges the brushes; it is sent with the figure it belongs to (S.x.T, S.x.Tk). The
  // guest's follows it: the last value heard plus the time since, eased toward it, so the couples
  // are at the same place on both screens whatever their frame rates.
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
  const carrierOf = (x) => ROUNDS[Math.min(x.round, 1)].carrier;
  const guideOf = (x) => (carrierOf(x) === 'dame' ? 'valet' : 'dame');

  // ---------- the dancers' figures (from the seed and counters: the same on both screens) ----------
  let cKey = '';
  let cOut = null;
  const couples = (x) => {
    const k = x.seed + '|' + x.round + '|' + x.roll;
    if (k === cKey) return cOut;
    const R0 = ROUNDS[Math.min(x.round, 1)];
    const r = rng(((x.seed | 0) + x.round * 7919 + (x.roll | 0) * 104729 + 3) >>> 0);
    const { z0, z1 } = W.DANCE;
    const out = [];
    for (let i = 0; i < R0.rows; i++) {
      // a round: a long, flat loop across the whole floor (to the alcoves), the couples spaced
      // along it, every other round turning the other way; between two rounds, a free lane
      const zc = z0 + 2.5 + ((i + 0.5) / R0.rows) * (z1 - z0 - 5);
      const rx = 9.0 + r() * 0.2;
      const rz = 0.6 + r() * 0.3;
      const dir = i % 2 ? -1 : 1;
      const w = ((dir * R0.sp * 2.2) / rx) * (0.9 + r() * 0.2);
      const ph = r() * TAU;
      for (let j = 0; j < R0.per; j++)
        out.push({ cx: 0, cz: +zc.toFixed(3), rx: +rx.toFixed(3), rz: +rz.toFixed(3), w, ph: ph + (j / R0.per) * TAU + (r() - 0.5) * 0.5, spin: dir * (2.4 + r() * 0.8), col: Math.floor(r() * 8) });
    }
    cKey = k;
    cOut = out;
    return out;
  };

  // ---------- HUD: the coupes (strikes left), the role ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #chD{position:fixed;right:18px;top:150px;z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 14px;border-radius:14px;background:rgba(26,8,14,.6);box-shadow:0 0 0 1px rgba(255,255,255,.08);font:600 11px/1 "IBM Plex Mono",monospace;color:#f6e6ea;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #chD .p{display:flex;gap:8px}
      #chD .p b{width:12px;height:18px;border-radius:2px 2px 6px 6px;background:#ffd8a8;box-shadow:0 0 8px #ffd8a8;transition:all .2s}
      #chD .p b.off{background:rgba(255,255,255,.12);box-shadow:none}
      #chD .n{font:400 18px/1 Georgia,serif;color:#ff9ab4}
      #chD .r{opacity:.8}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'chD';
    ui.root.innerHTML = `<span>${TXT.hud.title}</span><div class="p"><b></b><b></b></div><span class="n"></span><span class="r"></span>`;
    document.body.appendChild(ui.root);
    ui.cups = [...ui.root.querySelectorAll('.p b')];
    ui.n = ui.root.querySelector('.n');
    ui.role = ui.root.querySelector('.r');
    ui.root.hidden = true;
  };
  const hideUI = () => ui.root && (ui.root.hidden = true);

  // ---------- small helpers ----------
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const dsay = (text, hold) => {
    HUD.say(text, WHO, hold || 2400);
    local.talk = 1.8;
  };
  const sayBoth = (c, text, hold) => {
    say(text, hold);
    c.send('chDsay', [text, hold || 2800, 0]);
  };
  const dsayBoth = (c, text, hold) => {
    dsay(text, hold);
    c.send('chDsay', [text, hold || 2400, 1]);
  };
  const sayOnce = (k, text, cd = 6) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const here = () => Story.S && Story.S.phase === 'tr_hD';
  const hint = (c, key, delay = 2.6) => {
    if (local.hinted[key]) return;
    local.hinted[key] = 1;
    after(delay, () => {
      say(TXT.hint[key], 6000);
      c.send('chDhint', key);
    });
  };

  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'bump') {
      W.AU.clink(a ? 1 : 0.6);
      W.ST.wobble = 1;
      Cam.shake = Math.max(Cam.shake, 0.18);
    }
    if (k === 'spill') {
      W.AU.clink(1);
      Sound.play('rune', false);
      W.ST.wobble = 1;
      Cam.shake = Math.max(Cam.shake, 0.35);
    }
    if (k === 'done') {
      Sound.play('chime');
      Sound.play('reveal');
      W.AU.chime(3);
      Fx.burst(W.P(W.TABLE.x, 1.6, W.TABLE.z), '#ffd8a8', 80, 5, 1.2, -2);
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      for (let i = 0; i < 5; i++) after(0.3 + i * 0.4, () => Fx.burst(W.P((i - 2) * 3, 4.5, 74 + (i % 2) * 6), i % 2 ? '#ff8aa8' : '#ffd27a', 70, 6, 1.4, -1));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('chDfx', d);
  };

  // ---------- host: the tower and the dancers ----------
  const spill = (c) => {
    local.fails++;
    fxBoth(c, ['spill']);
    sayBoth(c, TXT.spill, 3600);
    after(1.2, () => dsayBoth(c, TXT.d.spill, 2400));
    c.set((s) => {
      s.x.carry = 0;
      s.x.str = 0;
      s.x.roll = (s.x.roll | 0) + 1;
    });
    if (local.fails >= 1) hint(c, 'stop', 4.4);
    if (local.fails >= 2) hint(c, 'call', 11);
  };
  const strike = (c, why) => {
    const x = c.S.x;
    const n = (x.str | 0) + 1;
    if (n >= STRIKES) return spill(c);
    c.set((s) => (s.x.str = n));
    fxBoth(c, ['bump', n >= STRIKES - 1 ? 1 : 0]);
    sayBoth(c, why === 'jump' ? TXT.jump : TXT.bump, 2200);
    if (why !== 'jump' && Math.random() < 0.5) after(0.5, () => dsayBoth(c, pick(TXT.d.bump), 1500));
  };
  const hostDance = (c, dt) => {
    const x = c.S.x;
    local.bumpCd -= dt;
    if (x.stage !== 0 || x.carry !== 1 || local.bumpCd > 0) return;
    const who = carrierOf(x);
    const p = c.pos(who);
    const cs = couples(x);
    for (let i = 0; i < cs.length; i++) {
      const q = W.coupleAt(cs[i], local.rt);
      const dx = p.x - (W.O.x + q.x);
      const dz = p.z - (W.O.z + q.z);
      const d = Math.hypot(dx, dz);
      if (d < BUMP_R && Math.abs(p.y - W.O.y) < 1) {
        local.bumpCd = 1.6;
        // the couple sweeps the one who carries aside, gently
        const k = d > 1e-3 ? 1 / d : 1;
        const push = [dx * k * 4, dz * k * 4];
        if (who === c.role) pushMe(push);
        else c.send('chDpush', push);
        strike(c, 'bump');
        return;
      }
    }
  };
  const pushMe = (v) => {
    Player.body.v.x += v[0];
    Player.body.v.z += v[1];
    Player.body.v.y = Math.max(Player.body.v.y, 2);
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 1) return TXT.card;
    const n = x.round | 0;
    if (c.role === carrierOf(x)) return (x.carry === 1 ? TXT.objCarry : TXT.objTake).replace('{n}', n);
    return (W.onGallery(Player.body.p) ? TXT.objGuide : TXT.objGo).replace('{n}', n);
  };
  const mood = (c, win) => {
    LvKit.mood({
      sky: win ? '#e8c0b0' : '#c09890',
      ground: '#2a160e',
      hemi: win ? 0.6 : 0.5,
      sun: win ? '#ffe2c0' : '#ffd0b0',
      sunI: win ? 0.7 : 0.5,
      sunPos: V3(30, 90, 50),
      exposure: win ? 1.42 : 1.34,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(win ? '#3a2226' : '#2a161c');
    c.fog(win ? 0.0052 : 0.006);
    Sound.mood(win ? 'gold' : 'calm');
  };

  Story.register('tr_hD', {
    world: CourH,
    init: () => ({ stage: 0, seed: (Math.random() * 1e9) | 0, round: 0, roll: 0, carry: 0, str: 0, done: 0 }),
    voice: () => 1,
    net: {
      chDfx: (c, d) => fx(c, d),
      chDsay: (c, d) => (d[2] ? dsay(d[0], d[1]) : say(d[0], d[1])),
      chDhint: (c, k) => say(TXT.hint[k], 6000),
      chDpush: (c, d) => pushMe(d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      reset();
      cKey = '';
      W.ST.area = 'D';
      W.ST.card = null;
      W.ST.marksOn = false;
      W.ST.vasesOn = false;
      W.ST.curtain = 0;
      W.ST.towerAt = null;
      W.ST.towerHome = true;
      makeUI();
      Player.targets = null;
      c.spawn(W.spawn('D', c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => {
        say(TXT.fall, 2200);
        c.send('chDsay', [TXT.fallMate, 2400, 0]);
        return W.spawn('D', Story.role);
      };
      mood(c, c.S.x.stage === 1);
      after(0.6, () => here() && mood(c, Story.S.x.stage === 1));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      after(0.8, () => here() && W.AU.waltz(Story.S.x.stage === 1 ? 0.35 : 0.6, ROUNDS[Math.min(Story.S.x.round, 1)].bpm));
      Sound.duck(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.D) W.screens.D.show(TITLE, CARD + ' · traverser le bal', '#ff9ab4');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      const x = c.S.x;
      if (x.stage === 0 && x.round === 0 && !x.roll && !x.carry) {
        say(TXT.intro, 3800);
        say(TXT.rule, 5200);
        after(4.4, () => here() && dsay(TXT.d.hello, 3400));
        after(8.2, () => here() && dsay(TXT.d.rule, 3400));
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      Player.killY = -40;
      hideUI();
      LvKit.mood(null);
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      W.AU.waltz(0);
      Sound.duck(false);
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
          mood(c, true);
          local.winT = 0;
          fx(c, ['win']);
          say(TXT.win, 2600);
          W.AU.waltz(0.35, 104);
          after(1, () => dsay(TXT.d.win, 4000));
          after(5.6, () => say(TXT.card, 4200));
        }
      }
      // a new figure of the dance (a crossing, or the same one after a spill): its clock restarts
      const key = x.stage + '|' + x.round + '|' + x.roll;
      if (key !== local.key) {
        const prevRound = local.key ? +local.key.split('|')[1] : -1;
        local.key = key;
        clockStart(x, key);
        if (x.stage === 0 && x.round !== prevRound) {
          local.roundT = 0;
          const lines = () => say(me === carrierOf(x) ? TXT.carrier : TXT.guide, 6400);
          if (prevRound < 0 && x.round === 0 && !x.roll && !x.carry) after(12.2, () => here() && Story.S.x.round === 0 && lines());
          else after(prevRound < 0 ? 0.5 : 4.4, () => here() && Story.S.x.round === x.round && lines());
          if (prevRound >= 0) W.AU.waltz(0.6, ROUNDS[Math.min(x.round, 1)].bpm);
        }
      }
      clockHear(x);
      W.ST.couples = couples(x);
      W.ST.towerHome = x.stage === 0 && x.carry === 0;
      W.ST.delivered = x.done | 0;
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      local.sync += dt;
      if (local.sync > 1) {
        local.sync = 0;
        c.set((s) => {
          s.x.T = +local.rt.toFixed(3);
          s.x.Tk = local.key;
        });
      }
      hostDance(c, dt);
      if (x.stage === 0) {
        local.roundT += dt;
        if (local.roundT > 100) hint(c, 'stop', 0);
        if (local.roundT > 150) hint(c, 'call', 0);
      }
      if (x.stage === 1 && local.winT > 5.5) {
        const cp = W.cardPos('D');
        const ok = (q) => Math.hypot(q.x - cp.x, q.z - cp.z) < 3 && Math.abs(q.y - W.O.y) < 2;
        if (ok(c.pos('dame')) && ok(c.pos('valet'))) c.goto('reward', (s) => (s.x.card = 'hD'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (x.stage !== 0 || who !== carrierOf(x)) return;
      const p = c.pos(who);
      if (d.a === 'take' && x.carry === 0 && W.atBuffet(p)) {
        local.bumpCd = 1.2;
        c.set((s) => {
          s.x.carry = 1;
          s.x.str = 0;
        });
      }
      if (d.a === 'jump' && x.carry === 1 && local.jumpCd <= 0) {
        local.jumpCd = 1.5;
        strike(c, 'jump');
      }
      if (d.a === 'put' && x.carry === 1 && W.atTable(p)) {
        const n = (x.done | 0) + 1;
        fxBoth(c, ['done']);
        if (n >= 2) {
          c.set((s) => {
            s.x.done = n;
            s.x.carry = 2;
            s.x.stage = 1;
          });
          return;
        }
        sayBoth(c, TXT.done, 2000);
        after(0.8, () => dsayBoth(c, TXT.d.done, 2400));
        after(2.4, () => here() && sayBoth(c, TXT.swap, 3400));
        c.set((s) => {
          s.x.done = n;
          s.x.carry = 0;
          s.x.str = 0;
          s.x.round = 1;
          s.x.roll = 0;
        });
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
      local.jumpCd -= dt;
      local.jumpAsk -= dt;
      clockTick(x, dt);
      if (x.stage === 1) local.winT += dt;
      const iCarry = x.stage === 0 && r === carrierOf(x);
      const carrying = x.stage === 0 && x.carry === 1;

      // ----- the one who carries: slow steps, no jumping -----
      if (iCarry && carrying) {
        const v = Player.body.v;
        const hs = Math.hypot(v.x, v.z);
        if (hs > CARRY_V && Player.body.grounded) {
          v.x *= CARRY_V / hs;
          v.z *= CARRY_V / hs;
        }
        // its own cooldown: on the host, the strike's (jumpCd, in action) would see this one and
        // drop the host's own jump
        if (!Player.body.grounded && v.y > 4 && local.jumpAsk <= 0) {
          local.jumpAsk = 1.5;
          c.act({ a: 'jump' });
        }
      }

      // ----- the dancers: on the guide's screen, from a gallery (on both once won) -----
      W.ST.danceT = local.rt;
      W.ST.dancersOn = x.stage === 1 || (r === guideOf(x) && W.onGallery(p));

      // ----- the tower: on the buffet, in the carrier's hands, or on the table -----
      if (carrying) {
        const who = carrierOf(x);
        const q = who === r ? p : Remote.pos;
        const yaw = who === r ? Player.yaw : Remote.yaw || 0;
        // held on the right hand, a little forward (the camera behind still sees it)
        const rx = -Math.cos(yaw);
        const rz = Math.sin(yaw);
        W.ST.towerAt = { x: q.x + Math.sin(yaw) * 0.42 + rx * 0.42, y: q.y + 1.2, z: q.z + Math.cos(yaw) * 0.42 + rz * 0.42, yaw };
      } else W.ST.towerAt = null;

      // ----- E: take, set down -----
      let prompt = null;
      const press = Input.pressed('interact');
      if (x.stage === 0 && x.carry === 0 && W.atBuffet(p)) {
        if (!iCarry) {
          prompt = ['E', Story.fmt(TXT.notMine), false];
          if (press) sayOnce('nm', Story.fmt(TXT.notMine), 4);
        } else {
          prompt = ['E', TXT.take, false];
          if (press) c.act({ a: 'take' });
        }
      }
      if (iCarry && carrying && W.atTable(p)) {
        prompt = ['E', TXT.put, false];
        if (press) c.act({ a: 'put' });
      }

      // ----- HUD -----
      if (ui.root) {
        const show = x.stage === 0;
        ui.root.hidden = !show;
        if (show) {
          const left = STRIKES - (x.str | 0);
          ui.cups.forEach((b, i) => b.classList.toggle('off', i >= left || x.carry !== 1));
          const nn = (x.done | 0) + ' / 2';
          if (ui.n.textContent !== nn) ui.n.textContent = nn;
          const lab = iCarry ? TXT.hud.carry : TXT.hud.guide;
          if (ui.role.textContent !== lab) ui.role.textContent = lab;
        }
      }

      // ----- the Dame: watches the tower, fans herself, bows at the end -----
      const look = W.ST.towerAt ? V3(W.ST.towerAt.x, W.ST.towerAt.y, W.ST.towerAt.z) : V3((p.x + Remote.pos.x) / 2, W.O.y + 1.6, (p.z + Remote.pos.z) / 2);
      W.ST.figPos.D = null;
      W.ST.fig.D = {
        talk: local.talk > 0,
        fan: W.ST.wobble > 0.3 ? 1 : 0.4,
        bow: x.stage === 1 && local.winT > 1.2 && local.winT < 6.5 ? 1 : 0,
        look,
      };
      W.ST.card = x.stage === 1 && local.winT > 4.8 ? 'D' : null;
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return prompt;
    },
  });

  W.dbgD = { local, couples: () => Story.S && couples(Story.S.x), carrierOf, guideOf };
})();
