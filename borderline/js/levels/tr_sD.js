// ♠ D · La Dame de Pique (épreuve sD): the second figure of the table of spades, in the Salle
// d'armes (js/world/cour_s.js). Kits as usual (Yoline: dame, William: valet). A fencing lesson
// in three measures: from her dais the Dame throws spades that home in on one of you.
//  - the iron spades fly at the rifle: bullets glance off them, only the sword turns them away
//  - the glass spades fly at the sword: the blade goes through them, only a bullet breaks them
// Nobody can defend themself: each guards the other. A measure is won when every spade of it is
// down and nobody was touched; a touch ends the measure, and the next try deals a new one.
// Three measures, faster each time, then the Dame bows.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('sD');
  const T = CONFIG;
  const W = CourS;
  const TITLE = 'La Dame de Pique';
  const WHO = 'La Dame de Pique';
  const TXT = {
    intro: 'Épreuve d’action. La Salle d’armes : la Dame de Pique donne une leçon d’escrime.',
    rule: 'Ses piques visent l’un de vous, et seule l’arme de l’autre peut les arrêter.',
    obj: {
      dame: 'Les piques de verre (bleues) visent {mate} : tire-les en vol. Celles de fer te visent : seule l’épée de {mate} les écarte. Reste près d’{lui}.',
      valet: 'Les piques de fer (noires) visent {mate} : écarte-les à l’épée (clic). Celles de verre te visent : seul le fusil de {mate} les brise. Reste près d’{lui}.',
    },
    ready: 'Entrez tous les deux sur la piste : la leçon commence.',
    measure: 'Mesure {n} / 3',
    left: '{k} pique{s}',
    touched: 'Touché{e}. La mesure est perdue : on la reprend.',
    touchedMate: '{mate} est touché{pe}. La mesure est perdue : on la reprend.',
    won: 'Mesure gagnée.',
    ricochet: 'Le fer ne craint pas les balles. Seule l’épée de {mate} l’écarte.',
    through: 'L’épée passe à travers le verre. Seul le fusil de {mate} le brise.',
    hint1: 'Restez proches : chacun surveille les piques qui visent l’autre, jamais les siennes.',
    hint2: 'L’épée écarte une pique de fer à portée de bras : frappe juste avant qu’elle atteigne {mate}.',
    hint3: 'Les piques de verre sont lentes au départ : tire-les dès qu’elles quittent sa main.',
    win: 'Trois mesures. La Dame de Pique s’incline.',
    card: 'La carte ' + CARD + ' vous attend devant la porte du nord. Allez-y ensemble.',
    // the Dame's own lines (playful, never cruel)
    d: {
      hello: 'Une leçon d’escrime ? Avec plaisir. Une seule règle : ici, on ne se défend jamais soi-même.',
      m: ['Première mesure. Doucement.', 'Deuxième mesure. Par deux, maintenant.', 'Dernière mesure : la valse.'],
      touch: ['Touché ! On reprend la mesure.', 'Presque. Encore une fois.', 'Vous regardez vos propres piques. Regardez celles de l’autre.'],
      good: ['Joli.', 'Belle parade.', 'Vous apprenez vite.'],
      end: 'La leçon est finie. Vous vous êtes gardés l’un l’autre, jamais vous-mêmes. La Dame de Pique s’incline.',
    },
  };
  CONFIG.cards.sD = {
    title: TITLE,
    sub: 'Figure ♠ · battue',
    lines: [
      'Une leçon d’escrime en trois mesures, dans la Salle d’armes.',
      'Les piques de fer visaient le fusil, celles de verre visaient l’épée.',
      'Personne ne s’est défendu soi-même : chacun a gardé l’autre.',
    ],
  };

  const B = W.B;
  const now = () => performance.now() / 1000;
  // the three measures: darts per throw, the gap between throws, speed, turn rate (rad/s)
  const MEASURES = [
    { throws: [['F'], ['V'], ['F'], ['V'], ['F'], ['V']], gap: 2.1, sp: 6.8, turn: 1.9 },
    { throws: [['F', 'V'], ['V'], ['F', 'V'], ['F'], ['V', 'F']], gap: 2.5, sp: 7.6, turn: 2.2 },
    { throws: [['F', 'V'], ['F'], ['V', 'V'], ['F', 'F'], ['V', 'F'], ['F', 'V']], gap: 2.3, sp: 8.4, turn: 2.5 },
  ];
  const TOUCH_R = 0.85; // how close a spade comes to the chest to touch
  const GRACE = 0.22; // a parry from the other screen may still arrive
  const local = {
    pend: [],
    sayCd: {},
    objT: 0,
    sched: [],
    mt: 0,
    wait: 2,
    near: 0,
    winT: 0,
    dT: 0,
    hints: {},
    resSeen: 0,
    face: Math.PI,
    throwT: 0,
    goodI: 0,
    sword: 0,
    shot: 0,
  };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- HUD of the épreuve ----------
  const ui = {};
  const makeUI = () => {
    if (ui.m) return;
    const css = document.createElement('style');
    css.textContent = `
      #sDm{position:fixed;left:50%;top:78px;transform:translateX(-50%);z-index:6;pointer-events:none;display:flex;gap:14px;align-items:center;font:600 14px/1 "IBM Plex Mono",monospace;color:#d8e4ff;text-shadow:0 1px 4px #000;letter-spacing:.08em;text-transform:uppercase}
      #sDm .dots{display:flex;gap:6px}
      #sDm .dots i{width:9px;height:9px;border:1.5px solid #d8e4ff;transform:rotate(45deg);opacity:.55}
      #sDm .dots i.on{background:#d8e4ff;opacity:1;box-shadow:0 0 8px #9ab8ff}
      #sDbig{position:fixed;left:50%;top:32%;transform:translate(-50%,-50%) scale(.9);z-index:6;pointer-events:none;opacity:0;font:italic 600 44px/1 Georgia,serif;color:#fff;text-shadow:0 0 18px rgba(140,180,255,.9),0 2px 6px #000;transition:opacity .2s,transform .2s;white-space:nowrap}
      #sDbig.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
    `;
    document.head.appendChild(css);
    ui.m = document.createElement('div');
    ui.m.id = 'sDm';
    ui.m.innerHTML = '<span class="t"></span><span class="dots"><i></i><i></i><i></i></span><span class="k"></span>';
    ui.m.hidden = true;
    document.body.appendChild(ui.m);
    ui.t = ui.m.querySelector('.t');
    ui.k = ui.m.querySelector('.k');
    ui.dots = [...ui.m.querySelectorAll('.dots i')];
    ui.big = document.createElement('div');
    ui.big.id = 'sDbig';
    document.body.appendChild(ui.big);
  };
  let bigT = 0;
  const big = (text, hold = 1.2) => {
    if (!ui.big) return;
    Icons.set(ui.big, Story.fmt(text));
    ui.big.classList.add('on');
    bigT = hold;
  };
  const hideUI = () => {
    if (!ui.m) return;
    ui.m.hidden = true;
    ui.big.classList.remove('on');
  };

  // ---------- words ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const dsay = (text, hold) => {
    HUD.say(text, WHO, hold || 2600);
    local.dT = Math.min(3, (hold || 2600) / 1000);
  };
  const sayOnce = (k, text, cd = 10) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const dsayBoth = (c, text) => {
    dsay(text);
    c.send('sDsay', [text, 1]);
  };
  const fx = (c, d) => {
    const [k, a] = d;
    const p = d[2] ? V3(d[2][0], d[2][1], d[2][3 - 1]) : null;
    if (k === 'throw') {
      local.throwT = 0.6;
      local.face = a;
      Sound.play('grappleOut');
    }
    if (k === 'parry' && p) {
      Sound.play('deflect');
      W.AU.clang(0.9, 300);
      Fx.burst(p, '#fff1dc', 30, 5, 0.5, -4);
    }
    if (k === 'shatter' && p) {
      Sound.play('shatter');
      Fx.burst(p, '#a8d0ff', 40, 5, 0.7, -5);
    }
    if (k === 'clink' && p) {
      Sound.play('deflect');
      Fx.burst(p, '#ffffff', 8, 3, 0.3, 0);
    }
    if (k === 'touch') {
      Sound.play('trap');
      Sound.play('glitch');
      if (a === c.role) {
        HUD.hurt();
        Cam.shake = Math.max(Cam.shake, 0.3);
      }
    }
    if (k === 'measure') {
      Sound.play('reveal');
      Sound.play('chime');
    }
    if (k === 'win') {
      Sound.play('chime');
      Sound.play('reveal');
      after(0.8, () => Fx.firework(W.P(-5, 0, 160), 18));
      after(1.6, () => Fx.firework(W.P(5, 0, 160), 20));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('sDfx', d);
  };
  const v3a = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];

  // ---------- the spades (Enemies: host-simulated, synced by the enemy packs) ----------
  const tmp = V3();
  const want = V3();
  const cur = V3();
  const center = () => W.P(B.c[0], 0, B.c[1]);
  let onTouch = null;
  const spade = (kind) => ({
    stats: { hp: 1, speed: 0, radius: 0.6, hitR: 0.85, height: 0, reach: 3.4, stunP: 0, dieColor: kind === 'iron' ? '#e8ecf2' : '#9ac8ff' },
    model: () => {
      const m = W.dartModel(kind);
      // a soft shadow on the floor under the spade, so its height reads
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
      );
      m.g.add(sh);
      m.shadow = sh;
      return m;
    },
    mult: () => 0,
    sim(e, dt, players) {
      e.age = (e.age || 0) + dt;
      const tp = players.find((p) => p.who === e.tgt);
      if (!tp) return;
      const aim = tmp.set(tp.pos.x, tp.pos.y + 1.15, tp.pos.z);
      if (!e.v) e.v = V3(0, 3, 0);
      if (e.age < 0.6) {
        // out of her hand: it rises, slows and turns its point toward its target
        e.pos.addScaledVector(e.v, dt);
        e.v.multiplyScalar(Math.exp(-dt * 4));
      } else {
        want.copy(aim).sub(e.pos).normalize();
        if (e.v.lengthSq() < 1e-4) cur.copy(want);
        else cur.copy(e.v).normalize();
        const ang = cur.angleTo(want);
        const max = e.turn * dt * (e.age < 1.4 ? 2.5 : 1);
        if (ang > 1e-4) cur.lerp(want, Math.min(1, max / ang)).normalize();
        e.spd = Math.min(e.sp, (e.spd || 1.5) + dt * 9);
        e.v.copy(cur).multiplyScalar(e.spd);
        e.pos.addScaledVector(e.v, dt);
      }
      // the hall: a spade never leaves the round room, never digs into the floor
      e.pos.y = Math.max(e.pos.y, W.O.y + 0.7);
      const c = center();
      const dx = e.pos.x - c.x;
      const dz = e.pos.z - c.z;
      const r = Math.hypot(dx, dz);
      if (r > B.r - 0.8) {
        e.pos.x = c.x + (dx / r) * (B.r - 0.8);
        e.pos.z = c.z + (dz / r) * (B.r - 0.8);
        const vr = (e.v.x * dx + e.v.z * dz) / r;
        if (vr > 0) {
          e.v.x -= (2 * vr * dx) / r;
          e.v.z -= (2 * vr * dz) / r;
        }
      }
      e.yaw = Math.atan2(e.v.x, e.v.z);
      // a touch, confirmed a moment later (a parry may still be on its way)
      if (e.touch == null && !tp.down && e.pos.distanceTo(aim) < TOUCH_R) e.touch = GRACE;
      if (e.touch != null) {
        e.touch -= dt;
        if (e.touch <= 0 && onTouch) onTouch(e);
      }
    },
    render(e, m, dt, t) {
      m.body.rotation.z = Math.sin(t * 6 + e.id) * 0.35;
      m.halo.material.opacity = 0.45 + Math.sin(t * 9 + e.id) * 0.15;
      m.halo.lookAt(R.camera.position);
      m.shadow.position.y = W.O.y + 0.03 - e.pos.y;
      m.shadow.material.opacity = clamp(0.5 - (e.pos.y - W.O.y) * 0.08, 0.1, 0.45);
    },
  });
  Enemies.define('sdFer', spade('iron'));
  Enemies.define('sdVerre', spade('glass'));
  const TYPE = { F: 'sdFer', V: 'sdVerre' };

  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: false };
    });
  const handPos = (yaw) => W.P(B.c[0] + Math.sin(yaw) * 0.7, B.daisY + 2.3, B.c[1] + Math.cos(yaw) * 0.7);

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 2) return TXT.card;
    if (!x.live && x.m === 1 && !x.att) return TXT.ready;
    return TXT.obj[c.role];
  };

  // ---------- light and mood ----------
  const mood = (c, end) => {
    LvKit.mood({
      sky: '#8fa0c0',
      ground: '#15181e',
      hemi: end ? 0.62 : 0.56,
      sun: '#e2ebff',
      sunI: end ? 0.85 : 0.72,
      sunPos: V3(30, 90, -40),
      exposure: end ? 1.45 : 1.38,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set('#0d1118');
    c.fog(0.006);
    Sound.mood(end ? 'calm' : 'tense');
  };

  const startMeasure = (c) => {
    const x = c.S.x;
    const M = MEASURES[x.m - 1];
    // a new deal each try: the throws shuffled (the first one stays a single spade)
    const th = M.throws.slice(1).sort(() => Math.random() - 0.5);
    th.unshift(M.throws[0]);
    local.sched = th.map((g, i) => ({ t: 1.6 + i * M.gap * (0.85 + Math.random() * 0.3), g }));
    local.mt = 0;
    const n = th.reduce((s, g) => s + g.length, 0);
    c.set((s) => {
      s.x.live = 1;
      s.x.att = (s.x.att || 0) + 1;
      s.x.left = n;
    });
    dsayBoth(c, TXT.d.m[x.m - 1]);
    fxBoth(c, ['measure']);
  };
  const endMeasure = (c, ok, who) => {
    Enemies.clear();
    local.sched = [];
    local.wait = ok ? 3.2 : 3.6;
    c.set((s) => {
      s.x.live = 0;
      s.x.left = 0;
      s.x.res = { n: (s.x.res ? s.x.res.n : 0) + 1, ok: ok ? 1 : 0, who: who || null, m: s.x.m };
      if (ok) {
        s.x.m += 1;
        if (s.x.m > 3) {
          s.x.stage = 2;
          s.x.m = 3;
        }
      } else s.x.fails = (s.x.fails || 0) + 1;
    });
    if (ok && c.S.x.stage === 2) fxBoth(c, ['win']);
  };

  Story.register('tr_sD', {
    world: CourS,
    init: () => ({ stage: 1, m: 1, live: 0, att: 0, left: 0, res: null, fails: 0 }),
    voice: () => 1,
    net: {
      sDsay: (c, d) => (d[1] ? dsay(d[0]) : say(d[0], 2600)),
      sDfx: (c, d) => fx(c, d),
    },
    async enter(c, first) {
      local.ready = false;
      if (!first) await fadeTo(true);
      W.build();
      W.show('B');
      makeUI();
      hideUI();
      Enemies.clear();
      Object.assign(local, {
        pend: [],
        sayCd: {},
        objT: 0,
        sched: [],
        mt: 0,
        wait: 2.5,
        near: 0,
        winT: 0,
        dT: 0,
        hints: {},
        resSeen: c.S.x.res ? c.S.x.res.n : 0,
        stageSeen: c.S.x.stage,
        face: Math.PI,
        throwT: 0,
        goodI: 0,
        sword: 0,
        shot: 0,
        pendTouch: false,
      });
      // a measure interrupted by a reload starts again
      if (Net.isHost && c.S.x.live) c.set((s) => ((s.x.live = 0), (s.x.left = 0)));
      onTouch = (e) => {
        if (!Story.S || Story.S.phase !== 'tr_sD' || !Story.S.x.live || !Net.isHost) return;
        const who = e.tgt;
        fxBoth(c, ['touch', who]);
        if (who === c.role) {
          say(TXT.touched, 2600);
          c.send('sDsay', [TXT.touchedMate, 0]);
        } else {
          say(TXT.touchedMate, 2600);
          c.send('sDsay', [TXT.touched, 0]);
        }
        endMeasure(c, false, who);
        after(0.6, () => dsayBoth(c, TXT.d.touch[(Story.S.x.fails - 1) % TXT.d.touch.length]));
      };
      c.spawn(W.spawn('B', c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => W.spawn('B', c.role);
      Player.targets = null;
      Combat.enable(true);
      Combat.noCloak = true;
      mood(c, c.S.x.stage === 2);
      after(0.6, () => Story.S && Story.S.phase === 'tr_sD' && mood(c, Story.S.x.stage === 2));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.B) W.screens.B.show(TITLE, CARD + ' · trois mesures', '#d8e4ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1 && c.S.x.m === 1 && !c.S.x.att) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4200);
        after(8, () => Story.S && Story.S.phase === 'tr_sD' && dsay(TXT.d.hello, 4400));
        local.wait = 13;
      }
      local.ready = true;
      this.apply(c);
      W.snap();
    },
    exit() {
      local.ready = false;
      Player.killY = -40;
      Combat.enable(false);
      Combat.noCloak = false;
      Enemies.clear();
      onTouch = null;
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
      if (x.stage !== local.stageSeen) {
        local.stageSeen = x.stage;
        if (x.stage === 2) {
          mood(c, true);
          after(0.6, () => dsay(TXT.d.end, 4800));
          after(6, () => say(TXT.win, 3400));
          after(9.6, () => say(TXT.card, 4200));
          local.winT = 0;
        }
      }
      if (x.res && x.res.n !== local.resSeen) {
        local.resSeen = x.res.n;
        if (x.res.ok) {
          big(TXT.won, 1.4);
          if (x.stage === 1) after(0.8, () => dsay(TXT.d.good[local.goodI++ % TXT.d.good.length], 1800));
        }
        // hints after a few lost measures
        if (!x.res.ok && x.fails === 2 && !local.hints.h1) {
          local.hints.h1 = true;
          after(4, () => say(TXT.hint1, 4600));
        }
        if (!x.res.ok && x.fails === 4 && !local.hints.h2) {
          local.hints.h2 = true;
          after(4, () => say(c.role === 'valet' ? TXT.hint2 : TXT.hint3, 4600));
        }
      }
      const S = W.ST;
      S.doorB = x.stage === 2 ? 1 : 0;
      HUD.objective(objective(c));
      W.showCard('sD', x.stage === 2 ? V3(0, 1.7, 162.5) : null);
    },
    host(c, dt) {
      if (!W.built || !local.ready) return;
      const x = c.S.x;
      const ps = players(c);
      local.wait = Math.max(0, local.wait - dt);
      if (x.stage === 1) {
        const inB = W.at('B', W.rel(ps[0].pos)) && W.at('B', W.rel(ps[1].pos));
        if (!x.live && local.wait <= 0 && inB) startMeasure(c);
        if (x.live) {
          local.mt += dt;
          const M = MEASURES[x.m - 1];
          while (local.sched.length && local.sched[0].t <= local.mt) {
            const it = local.sched.shift();
            it.g.forEach((k, j) => {
              const tgt = k === 'F' ? 'dame' : 'valet';
              const tp = ps.find((p) => p.who === tgt).pos;
              const yaw = Math.atan2(tp.x - (W.O.x + B.c[0]), tp.z - (W.O.z + B.c[1])) + (j ? 0.5 : 0);
              const hp = handPos(yaw);
              const out = V3(Math.sin(yaw), 1.4, Math.cos(yaw)).multiplyScalar(2.2);
              Enemies.spawn(TYPE[k], hp, { tgt, sp: M.sp, turn: M.turn, v: out, age: 0 });
              if (!j) fxBoth(c, ['throw', +yaw.toFixed(2)]);
            });
          }
          // all thrown, all down, nobody touched: the measure is won
          const pending = [...Enemies.list.values()].some((e) => e.touch != null);
          if (!local.sched.length && Enemies.alive() === 0 && !pending) endMeasure(c, true);
          // the count of spades still to beat (thrown or not)
          const left = local.sched.reduce((s, it) => s + it.g.length, 0) + Enemies.alive();
          if (left !== x.left && x.live) c.set((s) => (s.x.left = left));
        }
        Enemies.simulate(dt, ps);
      }
      Enemies.netTick(dt);
      if (x.stage === 2) {
        const near = (q) => Math.hypot(q.x, q.z - 162.5) < 4.2 && q.y > -0.5;
        local.near = near(W.rel(ps[0].pos)) && near(W.rel(ps[1].pos)) ? local.near + dt : 0;
        if (local.near > 1.2) c.goto('reward', (s) => (s.x.card = 'sD'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hit') {
        const e = Enemies.list.get(d.id);
        if (!e || !x.live || !TYPE.F || e.dead) return;
        const p = v3a(e.pos);
        // iron: only the sword (the valet kit); glass: only a bullet (the dame kit)
        const ok = (e.type === 'sdFer' && who === 'valet') || (e.type === 'sdVerre' && who === 'dame');
        if (!ok) {
          if (!e.clinkT || now() - e.clinkT > 0.5) {
            e.clinkT = now();
            fxBoth(c, ['clink', 0, p]);
            if (who === c.role) sayOnce('wrong' + who, who === 'dame' ? TXT.ricochet : TXT.through, 8);
            else c.send('sDsay', [who === 'dame' ? TXT.ricochet : TXT.through, 0]);
          }
          return;
        }
        e.dead = true;
        fxBoth(c, [e.type === 'sdFer' ? 'parry' : 'shatter', 0, p]);
        Enemies.damage(d.id, 999);
        // kill is skipped by mult 0: remove it by hand
        if (Enemies.list.has(d.id)) {
          e.hp = 0;
          Enemies.list.delete(d.id);
          if (e.view) R.scene.remove(e.view.g);
        }
      }
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
    },
    update(c, dt, t) {
      if (!W.built || !local.ready) return null;
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
      local.dT = Math.max(0, local.dT - dt);
      local.throwT = Math.max(0, local.throwT - dt);
      if (bigT > 0) {
        bigT -= dt;
        if (bigT <= 0) ui.big.classList.remove('on');
      }
      Enemies.render(dt, t);
      // the measure on screen
      if (ui.m) {
        const on = x.stage === 1 && (x.live || x.att > 0);
        ui.m.hidden = !on;
        if (on) {
          ui.t.textContent = fill(TXT.measure, { n: x.m });
          ui.dots.forEach((d, i) => d.classList.toggle('on', i < x.m - (x.live ? 1 : 0) || (x.stage === 2 && i < 3)));
          ui.k.textContent = x.live ? fill(TXT.left, { k: x.left, s: x.left > 1 ? 's' : '' }) : '';
        }
      }
      // ---------- the Dame on her dais: she dances, throws, bows ----------
      const F = W.ST.fig.D;
      F.p.set(B.c[0], B.daisY, B.c[1]);
      if (x.stage === 1) {
        if (local.throwT > 0) F.ry = local.face;
        else if (x.live) F.ry += dt * 0.6;
        else {
          const mid = W.rel(p).add(W.rel(c.pos(r === 'dame' ? 'valet' : 'dame'))).multiplyScalar(0.5);
          F.ry = Math.atan2(mid.x - B.c[0], mid.z - B.c[1]);
        }
        F.s = { act: local.throwT > 0 ? 'throw' : x.live ? 'dance' : local.dT > 0 ? 'point' : null, talk: local.dT, bow: 0 };
      } else {
        local.winT += dt;
        const mid = W.rel(p).add(W.rel(c.pos(r === 'dame' ? 'valet' : 'dame'))).multiplyScalar(0.5);
        F.ry = Math.atan2(mid.x - B.c[0], mid.z - B.c[1]);
        F.s = { act: null, talk: local.dT, bow: local.winT > 1 && local.winT < 7.5 ? 1 : 0 };
      }
      // the Valet, already beaten, watches from the side
      W.ST.fig.V.p.set(-10.5, 0, 158);
      W.ST.fig.V.ry = Math.atan2(B.c[0] + 10.5, B.c[1] - 158);
      W.ST.fig.V.s = { act: null, talk: 0, bow: 0 };
      W.ST.figOn = { V: true, D: true, R: false };

      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      const prompt = Combat.update(dt);
      if (x.stage === 2) return null;
      return prompt;
    },
  });
})();
