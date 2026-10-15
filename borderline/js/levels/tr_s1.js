// ♠ 2 · Premiers pas (épreuve s1). Kits swapped in this trial (js/game/trials.js).
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('s1');
  const T = CONFIG;
  const W = TrS1;
  const TX = {
    card: CARD,
    title: 'Premiers pas',
    intro: 'Épreuve ♠ : le corps.',
    lanes: {
      dame: 'Les dalles jumelles. Ta dalle fantôme ne tient que si {mate} est sur la plaque du même symbole. Une dalle chacun, en relais.',
      valet:
        'Les dalles jumelles. Monte sur ta plaque : elle rend solide la dalle de {mate}. Puis attends qu’{il} tienne la tienne.',
    },
    chasm: {
      dame: 'Le gouffre. Vise l’anneau et lance ton grappin (F), puis tire le levier (maintiens E) pendant que {mate} tient le treuil.',
      valet: 'Le gouffre. {mate} passe par l’anneau. Toi, tiens le treuil (maintiens E) : le pont ne descend que si vous tirez ensemble.',
    },
    wall: {
      dame: 'Le mur. Tu vois l’encoche que {mate} ne voit pas : guide-{le} pour qu’{il} pose la carte-bloc juste dessous.',
      valet:
        'Le mur est trop haut. Porte la carte-bloc (E) et pose-la là où {mate} te le dit : {il} voit un passage que tu ne vois pas.',
    },
    run: 'La vague arrive. Courez. Les dalles s’effondrent derrière vous.',
    runObj: 'Fuyez la vague jusqu’à l’autel. Les dalles tombent quand on marche dessus.',
    gate: 'La grille : une plaque ♥, une plaque ♠. Montez dessus en même temps.',
    altar: 'L’autel. Posez-vous chacun sur une plaque, ensemble.',
    caught: 'La vague vous a rattrapés. On recommence la course.',
    countdown: 'Trois… deux… un…',
    won: 'Premiers pas réussis. Vous savez marcher ensemble.',
    hint1: 'Astuce : une dalle reste solide tant que quelqu’un est dessus.',
    leverP: 'Abaisser le pont-levis',
    leverWait: 'Le levier est bloqué : {mate} doit tenir le treuil',
    winchP: 'Tenir le treuil',
    take: 'Porter la carte-bloc',
    drop: 'Poser la carte-bloc',
    blockNo: 'Pas là : il faut la poser sous le passage, contre le mur.',
    blockOk: 'Là ! Juste sous l’encoche.',
    blockPut: 'Carte-bloc posée. {mate} te dira si c’est le bon endroit.',
  };
  CONFIG.cards.s1 = {
    title: 'Premiers pas',
    sub: 'Épreuve ♠ · réussie',
    lines: [
      'Un pas pour toi, un pas pour moi.',
      'Personne n’a avancé sans l’autre.',
      'C’est comme ça qu’on marche, ici.',
    ],
  };

  const local = { stage: 0, hold: 0, lhSent: 0, grace: {}, both: 0, wave: 0, wz: 104, spd: 0, gpT: 0, apT: 0, waitBlock: 0 };
  const tmp = V3();

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    const scr = (a, b, col) => W.screen.show(a, b, col);
    if (st === 1) {
      HUD.objective(TX.lanes[r]);
      scr('Section 1', 'Les dalles jumelles', '#b9a6ff');
    }
    if (st === 2) {
      HUD.objective(TX.chasm[r]);
      scr('Section 2', 'Le pont-levis', '#ff9ec4');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(TX.wall[r]);
      scr('Section 2', 'La carte-bloc', '#ff9ec4');
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(TX.runObj);
      scr('Section 3', 'La vague', '#ff5f8a');
      W.screen2.show('La vague', 'Courez !', '#ff5f8a');
      Sound.mood('tense');
      HUD.say(TX.run, T.master, 2600);
    }
    if (st === 2) Lore.during('s1', 'relay');
    // a player left behind by a checkpoint jumps to it
    if (prev && st > prev && st >= 2) {
      const q = W.rel(Player.body.p);
      const behind =
        (st === 2 && q.z < 56) || (st === 3 && q.z < 86) || (st === 4 && (q.z < 100 || q.y < 3));
      if (behind) c.spawn(W.spawn(st, r), 0);
    }
  };

  const both = (c, fn) => fn(W.rel(c.pos('dame')), 'dame') && fn(W.rel(c.pos('valet')), 'valet');
  const any = (c, fn) => fn(W.rel(c.pos('dame')), 'dame') || fn(W.rel(c.pos('valet')), 'valet');

  Story.register('tr_s1', {
    init: () => ({
      stage: 1,
      on: [],
      warn: [],
      pressed: [],
      bridge: false,
      leverHold: 0,
      winch: false,
      block: { p: [-5, 0.8, 95], c: null },
      fell: [],
      gate: false,
      gp: [],
      ap: [],
      wz: 104,
      wrun: false,
      wspd: 0,
      won: false,
      wonT: 0,
    }),
    voice: () => 1,
    net: {
      s1reset: (c) => {
        c.spawn(W.spawn(4, c.role), 0);
        HUD.say(TX.caught, T.master, 2400);
        Sound.play('caught');
        Cam.shake = 0.4;
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      local.stage = 0;
      local.lastBlk = null;
      local.winchOn = false;
      c.spawn(W.spawn(c.S.x.stage, c.role), 0);
      Player.killY = W.O.y - 22;
      Player.checkpoint = () => W.spawn(Story.S.x.stage, c.role);
      Player.targets = () => {
        if (c.role !== 'dame') return [];
        const x = Story.S.x;
        if (x.stage === 2 && !x.bridge) return [W.ringA()];
        if (x.stage === 4) return [W.ringB()];
        return [];
      };
      // the chasm ring sets her down by the lever (aimed long: air drag shortens the hop)
      Player.grappleLand = () => {
        const x = Story.S.x;
        if (x.stage === 2 && !x.bridge) return W.P(6.2, 0, 94.2);
        // the run's ring drops her on the slab after the wide gap
        if (x.stage === 4) return W.P(4.1, 5.8, 148.9);
        return null;
      };
      City.mood({});
      c.fog(0.006);
      Sound.mood('calm');
      HUD.visa(TX.card + ' · ' + TX.title);
      W.screen.show(TX.card, TX.title, '#b9a6ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 3400);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      if (x.won && !local.wonSeen) {
        local.wonSeen = true;
        HUD.objective('');
        HUD.say(TX.won, T.master, 3000);
        Sound.mood('gold');
        Sound.play('reveal');
        Fx.hearts(W.P(0, 9, 198));
        for (let i = 0; i < 4; i++)
          setTimeout(() => Fx.firework(W.P((Math.random() - 0.5) * 20, 0, 200 + Math.random() * 10), 22), i * 500);
      }
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      const qs = [qd, qv];
      if (x.stage === 1) {
        const pressed = W.PADS.map((p) => p[0]).filter((id) => qs.some((q) => W.onPad(q, id)));
        const on = [];
        const warn = [];
        W.GHOSTS.forEach(([gid, , , , pid]) => {
          const held = pressed.includes(pid);
          // standing on a slab keeps it, but only a plate lights it (flying over it does not)
          const occupied = (local.grace[gid] || 0) > 0 && qs.some((q) => W.onGhost(q, gid));
          // grace: a slab lingers 1.4 s after its plate is released, and while someone is on it
          if (held || occupied) local.grace[gid] = held ? 1.4 : Math.max(local.grace[gid] || 0, 0.6);
          else local.grace[gid] = (local.grace[gid] || 0) - dt;
          if (local.grace[gid] > 0) {
            on.push(gid);
            if (!held && !occupied && local.grace[gid] < 1.0) warn.push(gid);
          }
        });
        if (pressed.join() !== x.pressed.join() || on.join() !== x.on.join() || warn.join() !== x.warn.join())
          c.set((s) => {
            s.x.pressed = pressed;
            s.x.on = on;
            s.x.warn = warn;
          });
        if (W.endLanes(qd) && W.endLanes(qv))
          c.set((s) => {
            s.x.stage = 2;
            s.x.pressed = [];
            s.x.on = [];
            s.x.warn = [];
          });
      }
      if (x.stage === 2 && x.bridge && W.farSide(qd) && W.farSide(qv)) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3 && W.onLedge(qd) && W.onLedge(qv)) {
        local.wave = 0;
        local.wz = 101;
        c.set((s) => {
          s.x.stage = 4;
          s.x.wz = 101;
          s.x.wrun = false;
        });
      }
      if (x.stage === 4 && !x.won) {
        local.wave += dt;
        // 3 s head start, then the wave rolls in and speeds up a little
        if (local.wave > 3) {
          local.spd = Math.min(4.6, 3.4 + (local.wave - 3) * 0.04);
          local.wz = Math.min(188, local.wz + local.spd * dt);
        }
        const run = local.wave > 3;
        // crumbling slabs: a touched slab falls once both players are past it, or when the wave
        // reaches it (the wave is the clock; nobody is punished for waiting for the other)
        local.touch = local.touch || {};
        qs.forEach((q) => {
          const tl = W.tileUnder(q);
          if (tl && local.touch[tl.i] == null) local.touch[tl.i] = 0;
        });
        const behind = Math.min(qd.z, qv.z);
        Object.keys(local.touch).forEach((k) => {
          const i = +k;
          local.touch[i] += dt;
          const tl = W.TILES[i];
          const passed = behind > tl[2] + tl[4] / 2 + 0.5;
          const swallowed = local.wz > tl[2] - tl[4] / 2 - 1;
          if ((passed || swallowed) && !x.fell.some((f) => f[0] === i))
            c.set((s) => s.x.fell.push([i, +c.phaseT.toFixed(1)]));
        });
        // double gate: both plates at once
        const gp = ['gh', 'gs'].filter((id) => qs.some((q) => W.onGatePad(q, id)));
        if (gp.join() !== x.gp.join()) c.set((s) => (s.x.gp = gp));
        if (!x.gate && gp.length === 2) c.set((s) => (s.x.gate = true));
        // altar: both plates for a second
        const ap = ['ah', 'as'].filter((id) => qs.some((q) => W.onAltarPad(q, id)));
        if (ap.join() !== x.ap.join()) c.set((s) => (s.x.ap = ap));
        local.apT = ap.length === 2 ? local.apT + dt : 0;
        if (local.apT > 1) c.set((s) => (s.x.won = true));
        // caught by the wave (or fallen behind it): the run starts over
        const last = Math.min(qd.z, qv.z);
        const fallen = qs.some((q) => q.y < -6);
        if ((run && last < local.wz + 0.6) || fallen) {
          local.wave = 0;
          local.wz = 101;
          local.touch = {};
          c.set((s) => {
            s.x.fell = [];
            s.x.gp = [];
            s.x.wz = 101;
            s.x.wrun = false;
            s.x.wspd = 0;
          });
          c.send('s1reset', 1);
          c.spawn(W.spawn(4, c.role), 0);
          HUD.say(TX.caught, T.master, 2400);
          Sound.play('caught');
          Cam.shake = 0.4;
        } else {
          local.wsync = (local.wsync || 0) + dt;
          if (local.wsync > 0.25 || run !== x.wrun) {
            local.wsync = 0;
            c.set((s) => {
              s.x.wz = +local.wz.toFixed(2);
              s.x.wrun = run;
              s.x.wspd = run ? +local.spd.toFixed(2) : 0;
            });
          }
        }
      }
      if (x.won) {
        local.winT = (local.winT || 0) + dt;
        if (local.winT > 0.5 && (x.wonT || 0) < 3) c.set((s) => (s.x.wonT = +((s.x.wonT || 0) + 0.5).toFixed(1)));
        if (local.winT > 0.5) local.winT = 0;
        local.done = (local.done || 0) + dt;
        if (local.done > 5) c.goto('reward', (s) => (s.x.card = 's1'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'lever' && x.stage === 2 && who === 'dame' && x.winch) c.set((s) => (s.x.bridge = true));
      if (d.a === 'winch' && x.stage === 2 && who === 'valet' && !!d.v !== !!x.winch) c.set((s) => (s.x.winch = !!d.v));
      if (d.a === 'lh' && x.stage === 2 && !x.bridge) c.set((s) => (s.x.leverHold = d.v));
      if (d.a === 'take' && x.stage === 3 && !x.block.c) c.set((s) => (s.x.block = { p: s.x.block.p, c: who }));
      if (d.a === 'drop' && x.stage === 3 && x.block.c === who)
        c.set((s) => (s.x.block = { p: d.p, c: null }));
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      W.update(dt, t, x, r);
      const q = W.rel(Player.body.p);
      // the lever (grapple kit, far side of the chasm)
      // the winch (near side): held by the double-jump kit while the lever is pulled
      const winching = x.stage === 2 && !x.bridge && r === 'valet' && W.nearWinch(q) && Input.held('interact');
      if (winching !== !!local.winchOn) {
        local.winchOn = winching;
        c.act({ a: 'winch', v: winching ? 1 : 0 });
        if (winching) Sound.play('creak', W.P(-5.5, 0, 68.4));
      }
      if (x.stage === 2 && !x.bridge && r === 'valet' && W.nearWinch(q)) return ['E', TX.winchP, true];
      if (x.stage === 2 && !x.bridge && r === 'dame' && W.nearLever(q)) {
        if (Input.held('interact') && x.winch) local.hold += dt;
        else local.hold = Math.max(0, local.hold - dt * 2);
        const v = +clamp(local.hold / 1.1, 0, 1).toFixed(1);
        if (v !== local.lhSent) {
          local.lhSent = v;
          c.act({ a: 'lh', v });
          if (v > 0) Sound.play('creak', W.P(5.5, 0, 89.5));
        }
        if (local.hold >= 1.1) {
          local.hold = 0;
          c.act({ a: 'lever' });
          Sound.play('switch');
        }
        return ['E', x.winch ? TX.leverP : TX.leverWait, true];
      }
      if (x.stage === 2 && !x.bridge && r === 'valet' && !local.waitSaid && q.z > 66) {
        local.waitSaid = true;
        HUD.say('Va au treuil : {mate} passe par l’anneau, puis vous abaissez le pont ensemble.', T.master, 2600);
      }
      // section 1: a fall teaches the rule
      if (x.stage === 1 && Player.body.p.y < W.O.y - 3 && !local.tipSaid) {
        local.tipSaid = true;
        HUD.say(TX.hint1, T.master, 3000);
      }
      // the guide (grapple kit) is the one who sees whether the drop is under the notch
      if (x.stage === 3 && r === 'dame' && x.block && !x.block.c) {
        const key = x.block.p.join();
        if (local.lastBlk != null && key !== local.lastBlk)
          HUD.say(W.blockOk(x.block.p) ? TX.blockOk : TX.blockNo, T.master, 1800);
        local.lastBlk = key;
      }
      // the card-block (double-jump kit carries it)
      if (x.stage === 3 && r === 'valet') {
        const b = x.block;
        if (b.c === 'valet') {
          if (Input.pressed('interact')) {
            const yaw = Player.yaw;
            const fx = Math.sin(yaw);
            const fz = Math.cos(yaw);
            let px = q.x + fx * 1.4;
            let pz = q.z + fz * 1.4;
            // never inside the wall: slide it back against the face
            pz = clamp(pz, 87, W.WALL_Z - 0.82);
            px = clamp(px, -8.1, 8.1);
            const gy = Phys.groundAt(W.O.x + px, W.O.y + q.y + 0.4, W.O.z + pz) - W.O.y;
            const p = [+px.toFixed(2), +(Math.max(gy, -1) + 0.8).toFixed(2), +pz.toFixed(2)];
            c.act({ a: 'drop', p });
            Sound.play('thud', W.P(px, 0, pz));
            HUD.say(TX.blockPut, T.master, 1800);
          }
          return ['E', TX.drop];
        }
        if (!b.c) {
          const bp = W.blockPos();
          tmp.copy(Player.body.p);
          if (Math.hypot(tmp.x - bp.x, tmp.z - bp.z) < 1.9 && Math.abs(tmp.y - (bp.y - 0.8)) < 1.2) {
            if (Input.pressed('interact')) {
              c.act({ a: 'take' });
              Sound.play('grapple');
            }
            return ['E', TX.take];
          }
        }
      }
      if (x.stage === 4 && !x.won && !local.cdSaid && !x.wrun) {
        local.cdSaid = true;
        HUD.say(TX.countdown, T.master, 1600);
      }
      if (x.wrun) {
        local.cdSaid = false;
        Lore.during('s1', 'wave', 900);
      }
      // the first time one of you waits on a plate while the other crosses on the lit slab
      if (x.stage === 1 && x.on.length && x.pressed.length) {
        const qd = W.rel(c.pos('dame'));
        const qv = W.rel(c.pos('valet'));
        if (W.GHOSTS.some(([gid]) => x.on.includes(gid) && (W.onGhost(qd, gid) || W.onGhost(qv, gid))))
          Lore.during('s1', 'relay');
      }
      if (x.stage === 4 && x.gate && !local.gateSaid) {
        local.gateSaid = true;
        HUD.objective(TX.altar);
        W.screen2.show('L’autel', 'Ensemble', '#ffcf8a');
      }
      if (x.stage === 4 && !x.wrun && !x.won) W.screen2.show('Prêts ?', 'La vague arrive', '#ff5f8a');
      if (x.stage === 4 && x.wrun && !x.gate) W.screen2.show('La grille', '♥ + ♠ en même temps', '#ff5f8a');
      if (x.stage === 4 && !x.gate && q.z > 163 && !local.gateHint) {
        local.gateHint = true;
        HUD.objective(TX.gate);
      }
      if (!x.gate) local.gateSaid = false;
      return null;
    },
  });
})();
