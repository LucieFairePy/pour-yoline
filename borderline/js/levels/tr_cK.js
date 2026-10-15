// ♣ R · Le Roi de Trèfle (épreuve cK, card ♣ R), the last figure of the table of clubs. His table
// is a balance: a great disc of marble on a pivot over the void. The two of you stand on it (the
// bridges draw back) and it tilts toward the heavier side; held too far for too long, it tips. Four
// pairs of clovers light up on it, one for each of you: each sees only the other's clover, never
// their own, so you guide each other there, moving as mirrors to keep it level, and a pair counts
// when you both stand on yours at the same time (checked by the host from your two positions).
// From the third pair the Roi himself steps on, heavy, on the north side; the last pair is against
// the clock. A tip or a late pair moves the clovers. Won, the three figures of the table lay down
// their cards (js/cine/cour_c.js), then the reward. The world is js/world/cour_c.js.
(() => {
  const CARD = Cards.tagOf('cK');
  const T = CONFIG;
  const W = CourC;
  const TITLE = 'Le Roi de Trèfle';
  const WHO = 'Le Roi de Trèfle';
  const TXT = {
    intro: 'Figure ♣. Le Roi de Trèfle ne se bat pas : il pèse. Sa table est une balance.',
    rule: 'Montez à deux sur la balance, par les passerelles. Chacun voit le trèfle de l’autre, jamais le sien.',
    board: 'Montez sur la balance, chacun par sa passerelle.',
    obj: 'Trèfles {n} / 4 · debout sur vos trèfles en même temps · gardez la balance droite',
    objRoi: 'Trèfles {n} / 4 · le Roi pèse au nord : portez-le, et trouvez vos trèfles',
    objClock: 'Trèfles {n} / 4 · {s} s · debout sur vos trèfles en même temps',
    guide: 'Tu vois le trèfle de {mate}, pas le tien. Guide-{le} jusqu’au sien ; {il} te guide jusqu’au tien.',
    warn: 'La balance penche !',
    tip: 'La balance bascule. Les trèfles changent de place.',
    pair: 'Les deux trèfles s’allument.',
    roiWarn: 'Le Roi monte sur la balance, au nord. Allez vers le sud, tous les deux, pour le porter.',
    clock: 'Dernière paire : trente-cinq secondes.',
    late: 'Trop tard : les trèfles changent de place.',
    fall: 'Le vide. Retour au centre de la balance.',
    fall0: 'Le vide. Retour à l’entrée de la rotonde.',
    fallMate: '{mate} est tombé{pe}. {Il} revient.',
    hint: {
      tip: 'Avancez en miroir : quand l’un s’éloigne du centre, l’autre aussi, de l’autre côté.',
      guide: 'Décrivez le trèfle de l’autre par rapport à lui : « deux pas à ta gauche, vers le bord ».',
    },
    win: 'La balance s’immobilise, parfaitement droite.',
    hud: { level: 'Équilibre', pairs: 'Trèfles' },
    k: {
      hello: 'Bienvenue à ma table. Le Valet tire, la Dame mène. Moi, je pèse.',
      rule: 'Ma balance n’aime pas qu’on la charge d’un seul côté. Tenez-la droite.',
      pair: ['Bien.', 'Juste.', 'Hm. Pas mal du tout.'],
      tip: ['Patatras.', 'Ma balance a horreur des excès.'],
      up: 'Je monte. Tenez-moi bien.',
      win: 'Ni trop d’un côté, ni trop de l’autre. Juste. Je m’incline.',
      down: 'Venez. La table de Trèfle a quelque chose à vous dire.',
    },
  };
  CONFIG.cards.cK = {
    title: TITLE,
    sub: 'Figure ♣ · réussie',
    lines: ['Une balance, et deux poids qui se répondent.', 'Chacun voyait le chemin de l’autre, jamais le sien.', 'Le Roi s’est incliné : la table de Trèfle est à vous.'],
  };

  const PAIRS = 4;
  const LIMIT = 4.0;
  const WARN = 2.8;
  const TIP_T = 1.5;
  const ROI_W = 1.2;
  const CLOCK = 35;
  const C = W.C;
  const local = {};
  const reset = () =>
    Object.assign(local, {
      stage: -1,
      pairKey: '',
      tip: -1,
      over: 0,
      both: 0,
      roiT: 0,
      roiOn: 0,
      pairT: 0,
      sayCd: {},
      pend: [],
      objT: 0,
      fails: 0,
      hinted: {},
      winT: 0,
      talk: 0,
      cineSent: false,
      cineStart: 0,
      warnSaid: 0,
      T: new THREE.Vector2(),
    });
  reset();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- the Roi: his spot (north), his walk from the throne onto the disc ----------
  const roiSpot = (x) => {
    const r = rng(((x.seed | 0) + 555 + (x.pair | 0) * 13) >>> 0);
    const a = (r() - 0.5) * 1.1;
    const d = 4 + r() * 1;
    return { x: Math.sin(a) * d, z: Math.cos(a) * d };
  };
  // k in 0..1 along the way: the throne's step, the plank's end, the spot (relative to C)
  const roiPath = (x, k) => {
    const s = roiSpot(x);
    const pts = [
      [0, 17.4 - 0.6, 1.0],
      [0, 12.4, 0],
      [0, 6.8, 0],
      [s.x, s.z, 0],
    ];
    const L = [];
    let tot = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      L.push(d);
      tot += d;
    }
    let u = clamp(k, 0, 1) * tot;
    for (let i = 0; i < L.length; i++) {
      if (u <= L[i] || i === L.length - 1) {
        const f = clamp(u / L[i], 0, 1);
        const a = pts[i];
        const b = pts[i + 1];
        return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), y: lerp(a[2], b[2], f), heading: Math.atan2(b[0] - a[0], b[1] - a[1]) };
      }
      u -= L[i];
    }
    return { x: s.x, z: s.z, y: 0, heading: Math.PI };
  };
  const ROI_WALK = 8.5;
  const roiK = () => clamp((local.roiT - 3) / ROI_WALK, 0, 1);
  // the Roi's weight on the disc right now (0 until his feet are on it)
  const roiWeight = (x) => {
    if (!x.roi || x.stage !== 1) return null;
    const p = roiPath(x, roiK());
    if (Math.hypot(p.x, p.z) > W.DISC_R) return null;
    return { x: W.O.x + C.x + p.x, z: W.O.z + C.z + p.z, w: ROI_W };
  };

  // ---------- the clovers of a pair (relative to the centre; the same on both screens) ----------
  const pairPos = (x) => {
    const r = rng(((x.seed | 0) + (x.pair | 0) * 7919 + (x.roll | 0) * 104729 + 31) >>> 0);
    const roi = x.pair >= 2 ? roiSpot(x) : null;
    const wx = roi ? roi.x * ROI_W : 0;
    const wz = roi ? roi.z * ROI_W : 0;
    let best = null;
    for (let guard = 0; guard < 300; guard++) {
      const a = r() * TAU;
      const ra = 2.6 + r() * 3.2;
      const A = { x: Math.sin(a) * ra, z: Math.cos(a) * ra };
      // the other clover answers it (with the Roi's weight), turned and stretched a little
      let bx = -(A.x + wx);
      let bz = -(A.z + wz);
      const rot = (r() - 0.5) * 0.7;
      const sc = 0.85 + r() * 0.25;
      const cx = (bx * Math.cos(rot) - bz * Math.sin(rot)) * sc;
      const cz = (bx * Math.sin(rot) + bz * Math.cos(rot)) * sc;
      bx = cx;
      bz = cz;
      const B = { x: bx, z: bz };
      const rb = Math.hypot(bx, bz);
      if (rb < 2.2 || rb > W.DISC_R - 1.1) continue;
      const tq = Math.hypot(A.x + B.x + wx, A.z + B.z + wz);
      if (tq > 2.2) continue;
      if (Math.hypot(A.x - B.x, A.z - B.z) < 3.2) continue;
      if (roi && (Math.hypot(A.x - roi.x, A.z - roi.z) < 1.8 || Math.hypot(B.x - roi.x, B.z - roi.z) < 1.8)) continue;
      best = r() < 0.5 ? { dame: A, valet: B } : { dame: B, valet: A };
      break;
    }
    return best || { dame: { x: -3, z: -1 }, valet: { x: 3, z: 1 } };
  };
  const onTarget = (who, p, x) => {
    const t = pairPos(x)[who];
    return W.onDisc(p) && Math.hypot(p.x - (W.O.x + C.x + t.x), p.z - (W.O.z + C.z + t.z)) < 0.85;
  };
  // the torque now: the two of us (if on the disc), and the Roi
  const torqueNow = (c, x) => {
    const L = [];
    ['dame', 'valet'].forEach((w) => {
      const p = c.pos(w);
      if (W.onDisc(p)) L.push({ x: p.x, z: p.z, w: 1 });
    });
    const rw = roiWeight(x);
    if (rw) L.push(rw);
    return W.torque(L);
  };

  // ---------- HUD: the level bubble, the pairs ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #ccK{position:fixed;right:18px;top:150px;z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 12px;border-radius:14px;background:rgba(8,16,12,.6);box-shadow:0 0 0 1px rgba(255,255,255,.08);font:600 11px/1 "IBM Plex Mono",monospace;color:#e8f2e6;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #ccK .lv{position:relative;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,rgba(159,232,184,.12),rgba(0,0,0,.25));box-shadow:inset 0 0 0 2px #d9a94a}
      #ccK .lv:before{content:"";position:absolute;left:50%;top:50%;width:${(WARN / LIMIT) * 96}px;height:${(WARN / LIMIT) * 96}px;transform:translate(-50%,-50%);border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,210,122,.45)}
      #ccK .lv i{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px;border-radius:50%;background:#9fe8b8;box-shadow:0 0 10px #9fe8b8}
      #ccK .lv i.w{background:#ff7a5a;box-shadow:0 0 12px #ff7a5a}
      #ccK .p{display:flex;gap:6px}
      #ccK .p b{width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 2px #d9a94a}
      #ccK .p b.on{background:#9fe8b8}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'ccK';
    ui.root.innerHTML = `<span>${TXT.hud.level}</span><div class="lv"><i></i></div><div class="p"><b></b><b></b><b></b><b></b></div>`;
    document.body.appendChild(ui.root);
    ui.dot = ui.root.querySelector('.lv i');
    ui.pairs = [...ui.root.querySelectorAll('.p b')];
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
    c.send('ccKsay', [text, hold || 2800, 0]);
  };
  const ksayBoth = (c, text, hold) => {
    ksay(text, hold);
    c.send('ccKsay', [text, hold || 2400, 1]);
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const here = () => Story.S && Story.S.phase === 'tr_cK';

  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'pair' && a) {
      Sound.play('chime');
      Sound.play('reveal');
      a.forEach((q) => Fx.burst(V3(q[0], q[1], q[2]), '#9fe8b8', 60, 5, 1.1, -2));
    }
    if (k === 'tip') {
      Sound.play('rumble', 0.8);
      Sound.play('creak');
      W.AU.creak(1);
      Cam.shake = Math.max(Cam.shake, 0.7);
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      for (let i = 0; i < 5; i++) after(0.3 + i * 0.4, () => Fx.burst(W.P(C.x + Math.sin(i * 1.3) * 4, 3, C.z + Math.cos(i * 1.3) * 4), i % 2 ? '#9fe8b8' : '#ffd27a', 70, 6, 1.4, -1));
      after(1.2, () => W.bolt(W.P(C.x - 30, 140, C.z + 90), W.P(C.x - 6, 40, C.z + 60), { gold: true, w: 0.4, flash: 0.6 }));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('ccKfx', d);
  };
  const hint = (c, key) => {
    if (local.hinted[key]) return;
    local.hinted[key] = 1;
    after(2.6, () => {
      say(TXT.hint[key], 6000);
      c.send('ccKhint', key);
    });
  };

  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 0) return TXT.board;
    if (x.stage >= 2) return '';
    const n = x.pair | 0;
    if (x.pair >= PAIRS - 1) return TXT.objClock.replace('{n}', n).replace('{s}', Math.max(0, Math.ceil(CLOCK - local.pairT)));
    return (x.roi ? TXT.objRoi : TXT.obj).replace('{n}', n);
  };
  const mood = (c, win) => {
    LvKit.mood({
      sky: win ? '#b0c8a8' : '#7a9a90',
      ground: '#20160e',
      hemi: win ? 0.62 : 0.46,
      sun: win ? '#ffe2b0' : '#c8dcff',
      sunI: win ? 0.8 : 0.55,
      sunPos: V3(-30, 90, -50),
      exposure: win ? 1.4 : 1.3,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(win ? '#22302a' : '#141e1d');
    c.fog(win ? 0.005 : 0.0062);
    Sound.mood(win ? 'gold' : 'tense');
  };
  const respawn = () => {
    const x = Story.S.x;
    return W.spawn(x.stage >= 1 ? 'Kdisc' : 'K', Story.role);
  };

  Story.register('tr_cK', {
    init: () => ({ stage: 0, seed: (Math.random() * 1e9) | 0, pair: 0, roll: 0, tip: 0, roi: 0, seen: [] }),
    voice: () => 1,
    partner: (c) => c.S.x.stage !== 3,
    hideRemote: (c) => c.S.x.stage === 3,
    net: {
      ccKfx: (c, d) => fx(c, d),
      ccKsay: (c, d) => (d[2] ? ksay(d[0], d[1]) : say(d[0], d[1])),
      ccKhint: (c, k) => say(TXT.hint[k], 6000),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      reset();
      W.ST.area = 'K';
      W.ST.card = null;
      W.ST.carOn = false;
      W.ST.discOn = true;
      W.ST.bridges = 1;
      W.ST.torque.set(0, 0);
      W.ST.targets = { dame: null, valet: null };
      makeUI();
      Player.targets = null;
      const x = c.S.x;
      c.spawn(W.spawn(x.stage >= 1 ? 'Kdisc' : 'K', c.role), 0);
      Player.killY = W.O.y - 10;
      Player.checkpoint = () => {
        say(Story.S.x.stage >= 1 ? TXT.fall : TXT.fall0, 2200);
        c.send('ccKsay', [TXT.fallMate, 2400, 0]);
        return respawn();
      };
      mood(c, x.stage >= 2);
      after(0.6, () => here() && mood(c, Story.S.x.stage >= 2));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.K) W.screens.K.show(TITLE, CARD + ' · la balance', '#9fe8b8');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (x.stage === 0) {
        say(TXT.intro, 3800);
        say(TXT.rule, 5200);
        after(4.4, () => here() && ksay(TXT.k.hello, 3400));
        after(8.4, () => here() && ksay(TXT.k.rule, 3600));
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      if (typeof Cut !== 'undefined' && Cut.on) Cut.stop();
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
        const prev = local.stage;
        local.stage = x.stage;
        if (x.stage === 1) {
          W.ST.bridges = 0;
          if (prev === 0) {
            Sound.play('creak');
            Sound.play('door');
            after(0.8, () => say(TXT.guide, 6000));
          }
        }
        if (x.stage === 2) {
          mood(c, true);
          local.winT = 0;
          fx(c, ['win']);
          say(TXT.win, 2800);
          after(1, () => ksay(TXT.k.win, 3800));
          after(6, () => ksay(TXT.k.down, 3200));
        }
        if (x.stage === 3) {
          // the film of the table: each screen plays it, then says it is done
          Player.mode = 'frozen';
          HUD.objective('');
          hideUI();
          local.cineSent = false;
          if (typeof Cut !== 'undefined' && Cut.has('cour_c'))
            Cut.play('cour_c').then(() => {
              if (!here() || Story.S.x.stage !== 3 || local.cineSent) return;
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
      if (x.stage === 3 && local.cineSent && !(x.seen || []).includes(Story.me)) c.act({ a: 'cineDone', who: Story.me });
      // a new pair (or the same one moved): its clock starts now on each screen
      const pk = x.stage + '|' + x.pair + '|' + x.roll;
      if (pk !== local.pairKey) {
        local.pairKey = pk;
        local.pairT = 0;
        local.both = 0;
        local.over = 0;
        if (x.stage === 1 && x.pair === PAIRS - 1 && !x.roll) say(TXT.clock, 3000);
      }
      if (x.roi !== local.roiOn) {
        local.roiOn = x.roi;
        local.roiT = 0;
        if (x.roi && x.stage === 1) {
          ksay(TXT.k.up, 2600);
          after(0.4, () => say(TXT.roiWarn, 5200));
        }
      }
      if (local.tip < 0) local.tip = x.tip;
      if (x.tip !== local.tip) {
        local.tip = x.tip;
        // the balance throws what is on it toward its low side
        const p = Player.body.p;
        if (W.onDisc(p)) {
          const T2 = W.ST.torque;
          const n = T2.length() > 1e-3 ? T2.clone().normalize() : new THREE.Vector2(1, 0);
          Player.body.v.set(n.x * 6.5, 4.5, n.y * 6.5);
        }
      }
      // the clovers: I see only my mate's
      const tg = x.stage === 1 ? pairPos(x) : null;
      W.ST.targets = { dame: tg && me !== 'dame' ? tg.dame : null, valet: tg && me !== 'valet' ? tg.valet : null };
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = c.pos('dame');
      const qv = c.pos('valet');
      if (x.stage === 0 && W.onDisc(qd) && W.onDisc(qv) && qd.y > W.O.y - 0.6 && qv.y > W.O.y - 0.6) c.set((s) => (s.x.stage = 1));
      if (x.stage === 1) {
        const T2 = torqueNow(c, x);
        // too heavy on one side for too long: it tips (the Roi's walk counts half)
        if (T2.length() > LIMIT) local.over += dt * (x.roi && roiK() < 1 ? 0.5 : 1);
        else local.over = Math.max(0, local.over - dt * 2);
        if (local.over > TIP_T) {
          local.over = 0;
          local.fails++;
          c.set((s) => {
            s.x.tip = (s.x.tip | 0) + 1;
            s.x.roll = (s.x.roll | 0) + 1;
          });
          fxBoth(c, ['tip']);
          sayBoth(c, TXT.tip, 3000);
          after(0.8, () => ksayBoth(c, pick(TXT.k.tip), 2000));
          if (local.fails >= 2) hint(c, 'tip');
          return;
        }
        // the pair: both on your clovers at the same time
        if (onTarget('dame', qd, x) && onTarget('valet', qv, x) && local.pairT > 1.2) local.both += dt;
        else local.both = 0;
        if (local.both > 0.6) {
          const tg = pairPos(x);
          fxBoth(c, ['pair', ['dame', 'valet'].map((w) => W.P(C.x + tg[w].x, 0.6, C.z + tg[w].z).toArray())]);
          const n = x.pair + 1;
          if (n >= PAIRS) {
            c.set((s) => {
              s.x.pair = n;
              s.x.stage = 2;
              s.x.roi = 0;
            });
            return;
          }
          sayBoth(c, TXT.pair, 1800);
          after(0.7, () => ksayBoth(c, pick(TXT.k.pair), 1600));
          c.set((s) => {
            s.x.pair = n;
            s.x.roll = 0;
            if (n >= 2) s.x.roi = 1;
          });
          return;
        }
        if (x.pair >= PAIRS - 1 && local.pairT > CLOCK) {
          local.fails++;
          c.set((s) => (s.x.roll = (s.x.roll | 0) + 1));
          sayBoth(c, TXT.late, 2600);
        }
        if (local.pairT > 70 && !local.hinted.guide) hint(c, 'guide');
      }
      if (x.stage === 2 && local.winT > 10) c.set((s) => ((s.x.stage = 3), (s.x.seen = [])));
      if (x.stage === 3) {
        const n = (x.seen || []).length;
        local.cineStart += dt;
        const alone = n >= 1 && !Remote.fresh && local.cineStart > 3;
        if (n >= 2 || alone || local.cineStart > 120) c.goto('reward', (s) => (s.x.card = 'cK'));
      }
    },
    action(c, who, d) {
      if (d.a === 'cineDone') {
        const k = d.who || who;
        if (c.S.x.stage === 3 && !(c.S.x.seen || []).includes(k)) c.set((s) => (s.x.seen = [...(s.x.seen || []), k]));
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
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
      local.pairT += dt;
      if (x.roi) local.roiT += dt;
      if (x.stage === 2) local.winT += dt;
      if (x.stage === 3) {
        Player.mode = 'frozen';
        return null;
      }

      // ----- the balance: tilt from what stands on it (this screen's own estimate) -----
      const T2 = x.stage === 1 ? torqueNow(c, x) : new THREE.Vector2();
      local.T.lerp(T2, 1 - Math.exp(-8 * dt));
      W.ST.torque.copy(local.T);
      const mag = local.T.length();
      W.ST.warn = x.stage === 1 ? clamp((mag - WARN) / (LIMIT - WARN), 0, 1) : 0;
      if (x.stage === 1 && mag > LIMIT && local.warnSaid <= 0) {
        local.warnSaid = 6;
        say(TXT.warn, 1400);
        W.AU.creak(0.8);
      }
      local.warnSaid -= dt;
      // standing on it, you slide a little toward the low side
      if (x.stage === 1 && W.onDisc(p) && Player.body.grounded && mag > 0.6) {
        const k = Math.min(mag, 6) * 0.09 * dt;
        p.x += (local.T.x / mag) * k;
        p.z += (local.T.y / mag) * k;
      }

      // ----- HUD -----
      if (ui.root) {
        const show = x.stage === 1 || (x.stage === 0 && W.onDisc(p));
        ui.root.hidden = !show;
        if (show) {
          // the bubble in the camera's frame: where the low side is, seen from behind me
          const yaw = Cam.yaw || 0;
          const right = -local.T.x * Math.cos(yaw) + local.T.y * Math.sin(yaw);
          const fwd = local.T.x * Math.sin(yaw) + local.T.y * Math.cos(yaw);
          const k = 41 / LIMIT;
          const rx = clamp(right * k, -41, 41);
          const ry = clamp(-fwd * k, -41, 41);
          ui.dot.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px)`;
          ui.dot.className = mag > WARN ? 'w' : '';
          ui.pairs.forEach((b, i) => b.classList.toggle('on', i < (x.pair | 0)));
        }
      }

      // ----- the Roi: by his throne, walking onto the disc, back to the edge to bow -----
      let fp;
      if (x.stage === 1 && x.roi) {
        const q = roiPath(x, roiK());
        // on the disc he rides its tilt
        const tl = W.disc.tilt;
        const h = Math.hypot(q.x, q.z) <= W.DISC_R ? -q.z * Math.sin(tl.x) + q.x * Math.sin(tl.z) : q.y;
        // walking: facing the way; arrived: facing the centre
        fp = [C.x + q.x, h, C.z + q.z, 9, roiK() >= 1 ? Math.atan2(-q.x, -q.z) : q.heading];

      } else if (x.stage >= 2) fp = [C.x, 0, C.z + 11.6, 3, Math.PI];
      else fp = [W.THRONE[0], W.THRONE[1], W.THRONE[2] - 1.1, 3, Math.PI];
      W.ST.figPos.K = fp;
      const mid = V3((p.x + Remote.pos.x) / 2, W.O.y + 1.6, (p.z + Remote.pos.z) / 2);
      W.ST.fig.K = { talk: local.talk > 0, bow: x.stage === 2 && local.winT > 1.4 && local.winT < 6 ? 1 : 0, look: mid };
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return null;
    },
  });

  W.dbgK = { local, pairPos: () => Story.S && pairPos(Story.S.x), roiSpot: () => Story.S && roiSpot(Story.S.x), roiWeight: () => Story.S && roiWeight(Story.S.x) };
})();
