// ♣ D · La Dame de Trèfle (épreuve cD), second figure of the table of clubs. The gallery of
// pulleys: a carriage hangs from a gantry over a pit crossed by beams. One of you rides it and is
// the only one to see the three medallions hanging in the pit; the other one, at the console, is
// the only one who can move it (along the pit, up and down). The host moves the carriage and
// checks the hands (only the operator steers, only the rider takes a medallion, and close to it).
// A beam struck sends the carriage back to its quay along the way it came, and the medallions
// still hanging move elsewhere. Three medallions, then you change places for three more.
// The world (gallery, carriage, beams, the figure) is js/world/cour_c.js.
(() => {
  const CARD = Cards.tagOf('cD');
  const T = CONFIG;
  const W = CourC;
  const TITLE = 'La Dame de Trèfle';
  const WHO = 'La Dame de Trèfle';
  const TXT = {
    intro: 'Figure ♣. La Dame de Trèfle garde la galerie des poulies : un chariot, un pupitre, trois médaillons.',
    rule: 'Qui monte dans le chariot voit les médaillons. Qui tient le pupitre, non. Parlez-vous.',
    rider: 'Monte dans le chariot, au quai du puits. Toi seul{e} vois les médaillons : guide {mate}, puis attrape-les (E).',
    op: 'Va au pupitre, sur la galerie de gauche. Tu pilotes le chariot ; {mate} voit ce que tu ne vois pas.',
    controls: 'Pupitre : gauche et droite pour longer le puits, avant et arrière pour monter et descendre. E pour lâcher.',
    objBoard: 'Monte dans le chariot, au quai du puits ({n} / 3).',
    objRider: 'Guide {mate} jusqu’aux médaillons, E pour les prendre ({n} / 3).',
    objOpGo: 'Va au pupitre, sur la galerie de gauche ({n} / 3).',
    objOp: 'Pilote le chariot à la voix de {mate} ({n} / 3).',
    take: 'Prendre les manivelles',
    grab: 'Attraper le médaillon',
    got: 'Un médaillon.',
    crash: 'Le chariot heurte une poutre ! Retour au quai, et les médaillons changent de place.',
    swap: 'Trois médaillons. Changez de place : à l’autre de monter.',
    notMine: 'Cette fois, c’est {mate} qui tient le pupitre.',
    home: 'Le chariot revient au quai…',
    fall: 'Le puits. Retour au quai.',
    fallMate: '{mate} est tombé{pe} du chariot. {Il} revient au quai.',
    hint: {
      crash: 'Celui qui voit annonce aussi les poutres : « plus haut… stop… avance ».',
      time: 'Le médaillon le plus proche d’abord. Arrêtez le chariot juste sous lui, puis E.',
    },
    win: 'Six médaillons. Les poulies se taisent.',
    card: 'La carte ' + CARD + ' descend au bord du quai. Allez-y ensemble.',
    hud: { title: 'Chariot', along: 'Le long', up: 'Hauteur', drive: 'Aux manivelles', medals: 'Médaillons' },
    d: {
      hello: 'Ah, de la visite. Mes poulies s’ennuyaient.',
      rule: 'Le chariot va où on le mène. Les médaillons ne se montrent qu’à qui voyage.',
      got: ['Joli.', 'Délicatement, oui.', 'Et d’un de plus.'],
      crash: ['Doucement : ce sont des poutres anciennes.', 'Ouille. Mes poutres.'],
      swap: 'Changez. Chacun son tour, c’est la règle de la maison.',
      win: 'Vous vous entendez mieux que mes cordes. Je m’incline.',
    },
  };
  CONFIG.cards.cD = {
    title: TITLE,
    sub: 'Figure ♣ · réussie',
    lines: ['L’un voyait les médaillons, l’autre tenait les manivelles.', 'Et le chariot allait exactement là où il fallait.', 'La Dame n’avait jamais vu ses poulies si sages.'],
  };

  const DOCK = { z: W.CAR.z0, y: 0 };
  const SPD = { z: 2.4, y: 1.7 };
  const local = {};
  const reset = () =>
    Object.assign(local, {
      stage: -1,
      ride: -1,
      car: { z: DOCK.z, y: DOCK.y },
      steer: { z: 0, y: 0, t: 0 },
      trail: [],
      home: false,
      sendT: 0,
      driving: false,
      sentSteer: '',
      steerT: 0,
      sayCd: {},
      pend: [],
      objT: 0,
      fails: 0,
      rideT: 0,
      hinted: {},
      winT: 0,
      talk: 0,
      lockT: 0,
    });
  reset();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });
  const riderOf = (x) => (x.ride ? 'dame' : 'valet');
  const opOf = (x) => (x.ride ? 'valet' : 'dame');

  // ---------- the medallions of a ride (from the seed and counters: the same on both screens) ----------
  const tokens = (x) => {
    const r = rng(((x.seed | 0) + (x.ride | 0) * 7919 + (x.roll | 0) * 104729) >>> 0);
    const reach = (z, y) => {
      // a place the carriage can stop at to take it, clear of the beams
      for (let dz = -1; dz <= 1; dz += 0.5)
        for (let dy = -2.2; dy <= -0.6; dy += 0.4) {
          const cz = z + dz;
          const cy = y + dy;
          if (cz < W.CAR.z0 || cz > W.CAR.z1 || cy < W.CAR.y0 || cy > W.CAR.y1) continue;
          if (!W.carHits(cz, cy)) return true;
        }
      return false;
    };
    const out = [];
    for (let guard = 0; out.length < 3 && guard < 400; guard++) {
      const z = 61 + r() * 26;
      const y = -3.6 + r() * 9.4;
      if (W.BEAMS.some(([bz, by]) => Math.abs(z - bz) < 1.3 && Math.abs(y - by) < 1.5)) continue;
      if (out.some((o) => Math.abs(o.z - z) < 5)) continue;
      if (!reach(z, y)) continue;
      out.push({ z: +z.toFixed(2), y: +y.toFixed(2) });
    }
    return out.sort((a, b) => a.z - b.z);
  };

  // ---------- HUD: the operator's gauges, the rider's count ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #ccD{position:fixed;right:16px;top:150px;z-index:6;pointer-events:none;width:210px;padding:10px 12px;border-radius:12px;background:rgba(8,16,12,.6);box-shadow:0 0 0 1px rgba(255,255,255,.08);font:600 11px/1.2 "IBM Plex Mono",monospace;color:#e8f2e6;letter-spacing:.05em;text-transform:uppercase;text-shadow:0 1px 3px #000}
      #ccD .h{display:flex;justify-content:space-between;opacity:.85;margin-bottom:8px}
      #ccD .row{display:flex;align-items:center;gap:8px;margin:5px 0}
      #ccD .row span{width:62px;opacity:.75}
      #ccD .bar{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.12);position:relative}
      #ccD .bar i{position:absolute;top:-3px;width:6px;height:14px;border-radius:2px;background:#ffd27a;box-shadow:0 0 8px #ffd27a}
      #ccD .m{display:flex;gap:6px;margin-top:6px}
      #ccD .m b{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 2px #d9a94a}
      #ccD .m b.on{background:#ffd27a}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'ccD';
    ui.root.innerHTML = `<div class="h"><span class="t"></span><span class="s"></span></div>
      <div class="row g"><span>${TXT.hud.along}</span><div class="bar"><i class="a"></i></div></div>
      <div class="row g"><span>${TXT.hud.up}</span><div class="bar"><i class="u"></i></div></div>
      <div class="m"><b></b><b></b><b></b></div>`;
    document.body.appendChild(ui.root);
    ui.t = ui.root.querySelector('.t');
    ui.s = ui.root.querySelector('.s');
    ui.a = ui.root.querySelector('.a');
    ui.u = ui.root.querySelector('.u');
    ui.g = [...ui.root.querySelectorAll('.g')];
    ui.m = [...ui.root.querySelectorAll('.m b')];
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
    c.send('ccDsay', [text, hold || 2800, 0]);
  };
  const dsayBoth = (c, text, hold) => {
    dsay(text, hold);
    c.send('ccDsay', [text, hold || 2400, 1]);
  };
  const sayOnce = (k, text, cd = 6) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const here = () => Story.S && Story.S.phase === 'tr_cD';
  const count = (m) => ((m & 1) ? 1 : 0) + ((m & 2) ? 1 : 0) + ((m & 4) ? 1 : 0);

  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'got' && a) {
      const p = V3(a[0], a[1], a[2]);
      Sound.play('chime');
      Sound.play('reveal');
      Fx.burst(p, '#ffd27a', 70, 5, 1, -2);
    }
    if (k === 'crash' && a) {
      const p = V3(a[0], a[1], a[2]);
      W.shakeCar();
      Sound.play('thud');
      Sound.play('creak');
      Sound.play('rumble', 0.5);
      Cam.shake = Math.max(Cam.shake, 0.5);
      Fx.burst(p, '#c8b090', 60, 5, 0.9, -6);
    }
    if (k === 'swap') {
      Sound.play('chime');
      Fx.burst(W.P(0, 2.5, 56), '#9fe8b8', 80, 5, 1.2, -2);
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      for (let i = 0; i < 4; i++) after(0.3 + i * 0.45, () => Fx.burst(W.P((i - 1.5) * 2.4, 4, 93), i % 2 ? '#9fe8b8' : '#ffd27a', 70, 6, 1.4, -1));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('ccDfx', d);
  };

  // ---------- host: the carriage ----------
  const crash = (c) => {
    const x = c.S.x;
    local.home = true;
    local.fails++;
    fxBoth(c, ['crash', W.P(0, local.car.y + 1, local.car.z).toArray()]);
    sayBoth(c, TXT.crash, 3200);
    after(1, () => dsayBoth(c, pick(TXT.d.crash), 2200));
    c.set((s) => (s.x.roll = (s.x.roll | 0) + 1));
    if (local.fails >= 2 && !local.hinted.crash) {
      local.hinted.crash = 1;
      after(4.4, () => {
        say(TXT.hint.crash, 6000);
        c.send('ccDhint', 'crash');
      });
    }
    void x;
  };
  const hostCar = (c, dt) => {
    const x = c.S.x;
    const cr = local.car;
    if (local.home || x.stage === 1) {
      // back to the quay along the way it came (it never crosses a beam backwards)
      const to = local.trail.length ? local.trail[local.trail.length - 1] : [DOCK.z, DOCK.y];
      const dz = to[0] - cr.z;
      const dy = to[1] - cr.y;
      const d = Math.hypot(dz, dy);
      const st = 4.2 * dt;
      if (d <= st) {
        cr.z = to[0];
        cr.y = to[1];
        if (local.trail.length) local.trail.pop();
        else local.home = false;
      } else {
        cr.z += (dz / d) * st;
        cr.y += (dy / d) * st;
      }
      return;
    }
    // the operator's hands (a stale order stops it)
    const op = opOf(x);
    local.steer.t += dt;
    const live = local.steer.t < 0.6 && W.atConsole(c.pos(op));
    const sz = live ? local.steer.z : 0;
    const sy = live ? local.steer.y : 0;
    if (!sz && !sy) return;
    const nz = clamp(cr.z + sz * SPD.z * dt, W.CAR.z0, W.CAR.z1);
    const ny = clamp(cr.y + sy * SPD.y * dt, W.CAR.y0, W.CAR.y1);
    if (W.carHits(nz, ny)) return crash(c);
    cr.z = nz;
    cr.y = ny;
    const last = local.trail[local.trail.length - 1] || [DOCK.z, DOCK.y];
    if (Math.hypot(cr.z - last[0], cr.y - last[1]) > 0.35) local.trail.push([cr.z, cr.y]);
  };
  const grab = (c, who, d) => {
    const x = c.S.x;
    const i = d.i | 0;
    if (x.stage !== 0 || who !== riderOf(x) || i < 0 || i > 2 || x.got & (1 << i) || local.home) return;
    const tk = tokens(x)[i];
    if (!tk) return;
    const p = c.pos(who);
    const tp = W.P(0, tk.y, tk.z);
    if (Math.hypot(p.x - tp.x, p.y + 1.2 - tp.y, p.z - tp.z) > 2.1) return;
    const got = x.got | (1 << i);
    fxBoth(c, ['got', tp.toArray()]);
    if (count(got) < 3) {
      c.set((s) => (s.x.got = got));
      sayBoth(c, TXT.got, 1600);
      if (Math.random() < 0.5) after(0.6, () => dsayBoth(c, pick(TXT.d.got), 1600));
      return;
    }
    if (x.ride === 0) {
      c.set((s) => {
        s.x.got = 0;
        s.x.ride = 1;
        s.x.roll = 0;
      });
      local.home = true;
      fxBoth(c, ['swap']);
      sayBoth(c, TXT.swap, 3400);
      after(1.2, () => dsayBoth(c, TXT.d.swap, 3000));
      return;
    }
    c.set((s) => {
      s.x.got = got;
      s.x.stage = 1;
    });
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 1) return TXT.card;
    const r = c.role;
    const n = count(x.got | 0);
    if (r === riderOf(x)) return (W.onCar(Player.body.p) ? TXT.objRider : TXT.objBoard).replace('{n}', n);
    return (local.driving ? TXT.objOp : TXT.objOpGo).replace('{n}', n);
  };

  const mood = (c, win) => {
    LvKit.mood({
      sky: win ? '#a8c0a0' : '#78988a',
      ground: '#24180f',
      hemi: win ? 0.6 : 0.48,
      sun: win ? '#ffe2b0' : '#cfe0ff',
      sunI: win ? 0.75 : 0.5,
      sunPos: V3(40, 90, 60),
      exposure: win ? 1.4 : 1.3,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(win ? '#22302a' : '#16201f');
    c.fog(win ? 0.0055 : 0.0068);
    Sound.mood(win ? 'gold' : 'tense');
  };
  const letGo = () => {
    if (!local.driving) return;
    local.driving = false;
    if (Player.mode === 'frozen') Player.mode = 'walk';
    Story.ctx.act({ a: 'steer', z: 0, y: 0 });
    local.sentSteer = '0,0';
  };

  Story.register('tr_cD', {
    world: CourC,
    init: () => ({ stage: 0, seed: (Math.random() * 1e9) | 0, ride: 0, roll: 0, got: 0 }),
    voice: () => 1,
    net: {
      ccDfx: (c, d) => fx(c, d),
      ccDsay: (c, d) => (d[2] ? dsay(d[0], d[1]) : say(d[0], d[1])),
      ccDhint: (c, k) => say(TXT.hint[k], 6000),
      ccDcar: (c, d) => {
        W.ST.car.z = d[0];
        W.ST.car.y = d[1];
        local.home = !!d[2];
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      reset();
      W.ST.area = 'D';
      W.ST.card = null;
      W.ST.discOn = false;
      W.ST.carOn = true;
      W.ST.car.z = DOCK.z;
      W.ST.car.y = DOCK.y;
      W.ST.tokens = [null, null, null];
      makeUI();
      Player.targets = null;
      c.spawn(W.spawn('D', c.role), 0);
      Player.killY = W.O.y - 14;
      Player.checkpoint = () => {
        say(TXT.fall, 2200);
        c.send('ccDsay', [TXT.fallMate, 2400, 0]);
        c.act({ a: 'fell' });
        return W.spawn('D', Story.role);
      };
      mood(c, c.S.x.stage === 1);
      after(0.6, () => here() && mood(c, Story.S.x.stage === 1));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.D) W.screens.D.show(TITLE, CARD + ' · un chariot, un pupitre', '#9fe8b8');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      const x = c.S.x;
      if (x.stage === 0 && x.ride === 0 && !x.got) {
        say(TXT.intro, 4000);
        say(TXT.rule, 4400);
        after(4.2, () => here() && dsay(TXT.d.hello, 2600));
        after(7.2, () => here() && dsay(TXT.d.rule, 3600));
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      letGo();
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
          letGo();
          mood(c, true);
          local.winT = 0;
          fx(c, ['win']);
          say(TXT.win, 2600);
          after(1, () => dsay(TXT.d.win, 3800));
          after(5.4, () => say(TXT.card, 4200));
        }
      }
      if (x.ride !== local.ride) {
        const prev = local.ride;
        local.ride = x.ride;
        local.rideT = 0;
        if (x.stage === 0) {
          if (me !== opOf(x)) letGo();
          const lines = () => {
            say(me === riderOf(x) ? TXT.rider : TXT.op, 6000);
            if (me === opOf(x)) say(TXT.controls, 6000);
          };
          if (prev < 0 && !x.got && x.ride === 0) after(11, () => here() && Story.S.x.ride === x.ride && lines());
          else after(prev < 0 ? 0.5 : 4.6, () => here() && Story.S.x.ride === x.ride && lines());
        }
      }
      // the medallions: only on the rider's screen
      const T3 = x.stage === 0 && me === riderOf(x) ? tokens(x) : [];
      W.ST.tokens = [0, 1, 2].map((i) => (T3[i] && !(x.got & (1 << i)) ? T3[i] : null));
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      hostCar(c, dt);
      W.ST.car.z = local.car.z;
      W.ST.car.y = local.car.y;
      local.sendT -= dt;
      if (local.sendT <= 0) {
        local.sendT = 1 / 15;
        c.send('ccDcar', [+local.car.z.toFixed(3), +local.car.y.toFixed(3), local.home ? 1 : 0]);
      }
      if (x.stage === 0) {
        local.rideT += dt;
        if (local.rideT > 110 && !local.hinted['t' + x.ride]) {
          local.hinted['t' + x.ride] = 1;
          say(TXT.hint.time, 6000);
          c.send('ccDhint', 'time');
        }
      }
      if (x.stage === 1 && local.winT > 5) {
        const cp = W.cardPos('D');
        const ok = (q) => Math.hypot(q.x - cp.x, q.z - cp.z) < 3 && Math.abs(q.y - W.O.y) < 2;
        if (ok(c.pos('dame')) && ok(c.pos('valet'))) c.goto('reward', (s) => (s.x.card = 'cD'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'steer') {
        if (who !== opOf(x)) return;
        local.steer.z = clamp(+d.z || 0, -1, 1);
        local.steer.y = clamp(+d.y || 0, -1, 1);
        local.steer.t = 0;
      }
      if (d.a === 'grab') grab(c, who, d);
      if (d.a === 'fell' && who === riderOf(x) && !W.onCar(c.pos(who))) local.home = true;
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
      if (x.stage === 1) local.winT += dt;
      const press = Input.pressed('interact');
      let prompt = null;
      const iOp = x.stage === 0 && r === opOf(x);
      const iRide = x.stage === 0 && r === riderOf(x);

      // ----- the console -----
      if (local.driving) {
        if (!iOp || press || Input.pressed('jump') || !W.atConsole(p)) letGo();
        else {
          Player.mode = 'frozen';
          const m = Input.move();
          // facing the pit from the console: left / right along it, forward / back up and down
          const sz = Math.abs(m.x) > 0.2 ? -Math.sign(m.x) : 0;
          const sy = Math.abs(m.z) > 0.2 ? Math.sign(m.z) : 0;
          const k = sz + ',' + sy;
          local.steerT -= dt;
          if (k !== local.sentSteer || (local.steerT <= 0 && (sz || sy))) {
            local.sentSteer = k;
            local.steerT = 0.2;
            c.act({ a: 'steer', z: sz, y: sy });
          }
          prompt = ['E', TXT.hud.drive, false];
        }
      } else if (x.stage === 0 && W.atConsole(p)) {
        if (!iOp) {
          prompt = ['E', Story.fmt(TXT.notMine), false];
          if (press) sayOnce('nm', TXT.notMine, 4);
        } else {
          prompt = ['E', TXT.take, false];
          if (press) {
            local.driving = true;
            local.sentSteer = '';
            Player.body.v.set(0, 0, 0);
            Player.yaw = Math.PI / 2;
          }
        }
      }
      // ----- the rider's hands -----
      if (iRide && W.onCar(p)) {
        const T3 = tokens(x);
        T3.forEach((tk, i) => {
          if (prompt || x.got & (1 << i)) return;
          const tp = W.P(0, tk.y, tk.z);
          if (Math.hypot(p.x - tp.x, p.y + 1.2 - tp.y, p.z - tp.z) > 1.9) return;
          prompt = ['E', TXT.grab, false];
          if (press) c.act({ a: 'grab', i });
        });
      }

      // ----- HUD -----
      if (ui.root) {
        const show = x.stage === 0 && (local.driving || (iRide && W.onCar(p)));
        ui.root.hidden = !show;
        if (show) {
          ui.t.textContent = TXT.hud.title;
          ui.s.textContent = local.home ? '…' : '';
          ui.g.forEach((g) => (g.style.display = local.driving ? '' : 'none'));
          const cz = (W.ST.car.z - W.CAR.z0) / (W.CAR.z1 - W.CAR.z0);
          const cy = (W.ST.car.y - W.CAR.y0) / (W.CAR.y1 - W.CAR.y0);
          ui.a.style.left = `calc(${(cz * 100).toFixed(1)}% - 3px)`;
          ui.u.style.left = `calc(${(cy * 100).toFixed(1)}% - 3px)`;
          ui.m.forEach((b, i) => b.classList.toggle('on', !!(x.got & (1 << i))));
        }
      }

      // ----- the Dame: she watches the carriage, talks, bows at the end -----
      W.ST.figPos.D = null;
      W.ST.fig.D = {
        talk: local.talk > 0,
        bow: x.stage === 1 && local.winT > 1.2 && local.winT < 6.5 ? 1 : 0,
        look: x.stage === 1 ? V3((p.x + Remote.pos.x) / 2, W.O.y + 1.6, (p.z + Remote.pos.z) / 2) : W.P(0, W.ST.car.y + 1, W.ST.car.z),
      };
      W.ST.card = x.stage === 1 && local.winT > 4.5 ? 'D' : null;
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return prompt;
    },
  });

  W.dbgD = { local, tokens: () => Story.S && tokens(Story.S.x), riderOf, opOf };
})();
