// ♥ 5 · La Chute. Trust falls: jump onto clouds only the partner can see, drop through a ring
// onto a raft you cannot see under the mist, then dive 300 m together, hand in hand.
(() => {
  const T = CONFIG;
  const TITLE = 'La Chute';
  const TXT = {
    intro: 'Épreuve de confiance. Des îles dans le ciel, une mer de nuages, et le vide entre les deux.',
    rule: 'Les nuages porteurs ne se montrent qu’à celui qui ne saute pas. Celui qui saute ne voit que le vide.',
    s1: {
      jump: 'Saut de la foi · Le vide devant toi cache des nuages que tu ne vois pas. {mate} les voit : écoute-{le}, et saute.',
      guide: 'Tu vois les nuages porteurs, {mate} ne voit que le vide. Monte sur le belvédère et guide-{le} : où, quand, saute.',
      jumpDone: 'Tu as traversé. Un pont de lumière s’ouvre pour {mate}.',
      guideDone: 'Le pont de lumière est là : rejoins {mate} sur l’île.',
    },
    s2: {
      jump: 'À ton tour de sauter dans le vide. Il y a un courant d’air chaud, et des nuages qui bougent. {mate} te guide.',
      guide: 'À toi de voir pour deux. Monte sur le belvédère et guide {mate}. Le courant d’air chaud le porte jusqu’aux nuages d’en haut.',
      jumpDone: 'Tu as traversé. Un pont de lumière s’ouvre pour {mate}.',
      guideDone: 'Le pont de lumière est là : rejoins {mate} sur l’île.',
    },
    reach: 'Arrivé{e} ! Un pont de lumière se déploie.',
    reachMate: '{mate} a traversé ! Un pont de lumière se déploie.',
    fall: 'Tu es tombé{e} dans les nuages. Retour au bord.',
    fallMate: '{mate} est tombé{pe} dans les nuages. Retour au bord.',
    lift: 'Un courant d’air chaud te soulève.',
    s3: {
      intro: 'Le Filet. L’un saute à travers les anneaux, l’autre le rattrape sur le radeau-nuage. Sous la brume, on ne voit rien.',
      board: 'Monte sur le radeau-nuage, amarré le long de la chaussée.',
      steer: 'Tu tiens la barre (déplacements). Place le radeau sous {mate} : le cercle rose montre où {il} tomberait. Dis-{lui} quand sauter.',
      up: 'Le radeau remonte jusqu’à la chaussée.',
      fallReady: 'Anneau {n} / 4 · Va au bout de la planche {n}. L’anneau dérive sous toi : quand {mate} est dessous, laisse-toi tomber dedans.',
      fallWait: 'Attends que {mate} soit sur le radeau. Ensuite, planche {n}.',
      fallOff: 'Descends du radeau sur la chaussée : c’est à toi de sauter. Planche {n}.',
      catchOff: 'Reste à bord : dès que {mate} est remonté{pe} sur la chaussée, le radeau redescend. Prochain saut : planche {n}.',
      upFaller: 'Le radeau te remonte. Descends sur la chaussée.',
      done: 'Le Filet est franchi. Rejoignez le plongeoir, au bout de la chaussée.',
    },
    pass: 'Dans l’anneau !',
    passMate: '{mate} est passé{pe} dans l’anneau. Le voilà !',
    caught: 'Rattrapé{e}. Le radeau remonte.',
    caughtMate: 'Tu as rattrapé {mate}. Le radeau remonte.',
    noRing: 'Rattrapé{e}… mais sans passer dans l’anneau. On recommence celui-là.',
    noRingMate: '{mate} n’est pas passé{pe} dans l’anneau. On recommence celui-là.',
    swap: 'Les rôles s’inversent : celui qui rattrapait saute, celui qui sautait prend la barre.',
    fallNet: 'Le radeau n’était pas dessous. Retour à la planche.',
    fallNetMate: '{mate} est tombé{pe} à côté du radeau. Retour à la planche.',
    s4: {
      intro: 'Le Puits. Trois cents mètres de chute jusqu’à l’île-cœur.',
      go: 'Montez ensemble sur le plongeoir : la trappe s’ouvrira sous vous deux.',
      count: 'La trappe s’ouvre dans {n}…',
      dive: 'Passez ensemble dans les anneaux-cœurs : {n} / 8, il en faut 5. Main dans la main (E), vous tombez plus lentement et un anneau compte pour deux. Gare à la foudre.',
      wait: 'Tu es sur l’île-cœur. Attends {mate}.',
      hand: 'Main dans la main : vous tombez plus lentement, et vous passez les anneaux ensemble.',
      zap: 'La foudre ! Tu tombes comme une pierre.',
      zapMate: 'La foudre a frappé {mate}.',
      fail: 'Seulement {n} anneaux ensemble : il en fallait 5. Le cœur reste fermé. On remonte.',
      miss: 'Tu as manqué l’île-cœur. On remonte, tous les deux.',
      missMate: '{mate} a manqué l’île-cœur. On remonte, tous les deux.',
      ring: 'Anneau ensemble : {n} / 8.',
    },
    win: 'Vous êtes tombés ensemble, et l’île-cœur s’est ouverte.',
    card: 'La carte ♥ 5 descend sur l’île-cœur. Allez-y ensemble.',
  };
  CONFIG.cards.h5 = {
    corner: '5\n♥',
    big: '♥',
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'Vous avez sauté dans un vide que seul l’autre voyait.',
      'Chacun a rattrapé l’autre sans le voir venir.',
      'Et vous êtes tombés ensemble, main dans la main.',
    ],
  };

  const local = {
    stage: 0,
    clock: 0,
    sendK: 0,
    sendR: 0,
    raft: V3(),
    raftY: 0,
    raftV: V3(),
    raftT: V3(),
    raftTY: 0,
    rlast: V3(),
    rlastY: 0,
    froze: false,
    prevY: 0,
    caughtSent: false,
    passSent: -1,
    lifted: 0,
    stun: 0,
    mine: [],
    landSent: false,
    missSent: false,
    diveN: 0,
    zapT: 3,
    countT: 0,
    won: 0,
    failT: 0,
    objT: 0,
    remPrev: V3(),
    haze: new THREE.Color('#9a5c6c'),
    remV: V3(),
    env: null,
    seen: {},
    lastRing: 0,
  };
  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const jumperOf = (stage) => (stage === 1 ? 'dame' : 'valet');
  const fallerOf = (ring) => (ring < 2 ? 'dame' : 'valet');
  const tmp = V3();
  const sayBoth = (c, mine, theirs, hold = 2600) => {
    HUD.say(mine, T.master, hold);
    c.send('h5say', [theirs, hold]);
  };
  const okRings = (x) =>
    (x.dr || []).filter((r) => r && r.dame != null && r.valet != null && Math.abs(r.dame - r.valet) < 4.5).length;

  const sub = (c, who) => {
    const x = c.S.x;
    if (x.stage !== 3) return {};
    return { ring: x.ring, catcher: who !== fallerOf(Math.min(x.ring, 3)) };
  };
  const respawn = (c) => c.spawn(H5.spawn(c.S.x.stage, c.role, sub(c, c.role)), 0);

  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    const q = H5.rel(Player.body.p);
    if (x.stage === 1 || x.stage === 2) {
      const S = x.stage === 1 ? TXT.s1 : TXT.s2;
      const done = x.stage === 1 ? x.bridgeA : x.bridgeB;
      const jumper = r === jumperOf(x.stage);
      if (done) return jumper ? S.jumpDone : S.guideDone;
      return jumper ? S.jump : S.guide;
    }
    if (x.stage === 3) {
      if (x.ring >= 4) return TXT.s3.done;
      const faller = fallerOf(x.ring);
      const n = x.ring + 1;
      const onRaft = Player.body.ground === H5.raft.b;
      if (r === faller) {
        if (onRaft) return (x.ring === 2 ? TXT.s3.fallOff : TXT.s3.upFaller).replace(/\{n\}/g, n);
        if (x.raft === 'dock') return TXT.s3.fallWait.replace(/\{n\}/g, n);
        return TXT.s3.fallReady.replace(/\{n\}/g, n);
      }
      if (x.raft === 'up') return TXT.s3.up;
      if (x.raft === 'dock') return onRaft ? TXT.s3.catchOff.replace(/\{n\}/g, n) : TXT.s3.board;
      return TXT.s3.steer;
    }
    if (x.stage === 4) {
      if (!x.open) return x.count > 0 ? TXT.s4.count.replace('{n}', 4 - x.count) : TXT.s4.go;
      if (local.landSent) return TXT.s4.wait;
      return TXT.s4.dive.replace('{n}', okRings(x));
    }
    if (x.stage === 5) return TXT.card;
    return '';
  };

  const fx = (c, d) => {
    const [k, p] = d;
    const pos = p ? H5.P(p[0], p[1], p[2]) : null;
    if (k === 'reach') {
      Sound.play('reveal');
      if (pos) Fx.burst(pos, '#ffb0c8', 70, 5, 1, -2, 'heart');
    }
    if (k === 'pass') {
      Sound.play('chime');
      if (pos) Fx.burst(pos, '#ffcf8a', 50, 4, 0.8, 0);
    }
    if (k === 'catch') {
      Sound.play('land', 1);
      Sound.play('reveal');
      Cam.shake = Math.max(Cam.shake, 0.3);
      if (pos) Fx.burst(pos, '#ffd6e6', 90, 6, 1, -3, 'heart');
    }
    if (k === 'splash') {
      Sound.play('fall');
      if (pos) Fx.burst(pos, '#ffe0e8', 60, 5, 1.2, -1);
    }
    if (k === 'zap') {
      Sound.play('boom', pos);
      if (pos) Fx.burst(pos, '#d8b0ff', 80, 8, 0.8, 0);
    }
    if (k === 'open') {
      Sound.play('door');
      Sound.play('launch');
    }
    if (k === 'ring') {
      Sound.play('chime');
      Sound.play('reveal');
      if (pos) Fx.burst(pos, '#ff8fb0', 120, 7, 1.2, 0, 'heart');
    }
  };
  const fxBoth = (c, k, q) => {
    const d = [k, q ? [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)] : null];
    fx(c, d);
    c.send('h5fx', d);
  };

  // a lightning strike: telegraphed column for 1.4 s, then the bolt (played on both screens)
  const strike = (d) => {
    const b = H5.bolts.find((o) => o.t < 0) || H5.bolts[0];
    b.t = 0;
    b.x = d[0];
    b.y = d[1];
    b.z = d[2];
    b.hit = false;
    b.checked = false;
    Sound.play('dollWarn');
  };

  const resetDive = (s) => {
    s.x.open = false;
    s.x.count = 0;
    s.x.dr = DR();
    s.x.landed = {};
    s.x.hand = false;
    s.x.fail = 0;
    s.x.diveN = (s.x.diveN || 0) + 1;
  };
  const DR = () => [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({}));

  Story.register('tr_h5', {
    init: () => ({
      stage: 1,
      bridgeA: false,
      bridgeB: false,
      ring: 0,
      raft: 'dock',
      dock: 0,
      passed: -1,
      open: false,
      count: 0,
      dr: DR(),
      landed: {},
      hand: false,
      req: {},
      diveN: 0,
      fail: 0,
      won: false,
    }),
    voice: () => 1,
    net: {
      h5k: (c, v) => {
        if (Net.isHost) return;
        if (Math.abs(v - local.clock) > 0.3) local.clock = v;
        else local.clock += (v - local.clock) * 0.3;
      },
      h5r: (c, d) => {
        local.raftT.set(d[0], 0, d[2]);
        local.raftTY = d[1];
        local.raftGot = true;
      },
      h5fx: (c, d) => fx(c, d),
      h5say: (c, d) => HUD.say(d[0], T.master, d[1] || 2600),
      h5z: (c, d) => strike(d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      H5.build();
      const x = c.S.x;
      local.stage = 0;
      local.won = 0;
      local.mine = [];
      local.landSent = false;
      local.missSent = false;
      local.diveN = x.diveN || 0;
      local.caughtSent = false;
      local.seen = {};
      const d = H5.DOCKS[Math.min(x.dock || 0, 4)];
      local.raft.set(d[0], 0, d[1]);
      local.raftT.copy(local.raft);
      local.raftY = x.raft === 'down' ? H5.RAFT_Y : 0;
      local.raftTY = local.raftY;
      local.rlast.copy(local.raft);
      local.rlastY = local.raftY;
      H5.raft.b.on = true;
      c.spawn(H5.spawn(x.stage, c.role, sub(c, c.role)), 0);
      local.prevY = 0;
      Player.killY = H5.O.y - 420;
      Player.checkpoint = () => H5.spawn(Story.S.x.stage, c.role, sub(c, c.role));
      Player.targets = null;
      // sunset: warm sky light from the low sun ahead
      local.env = {
        hemi: R.hemi.intensity,
        hc: R.hemi.color.clone(),
        hg: R.hemi.groundColor.clone(),
        moon: R.moon.intensity,
        mc: R.moon.color.clone(),
        mp: R.moon.position.clone(),
      };
      R.hemi.intensity = 0.62;
      R.hemi.color.set('#ffc6a8');
      R.hemi.groundColor.set('#4a2a4a');
      R.moon.intensity = 1.0;
      R.moon.color.set('#ffb880');
      R.moon.position.set(-32, 20, 100);
      City.mood({ gold: 1 });
      c.fog(0.0048);
      // the haze of a sunset: the city's mood sets a dark fog every frame, this one wins at render
      local.prevBR = R.scene.onBeforeRender;
      R.scene.onBeforeRender = () => {
        R.scene.fog.color.copy(local.haze);
        R.scene.background.copy(local.haze);
      };
      Sound.mood(x.stage >= 5 ? 'gold' : x.stage >= 4 ? 'tense' : 'calm');
      HUD.visa('♥ 5 · ' + TITLE);
      if (H5.screen) H5.screen.show(TITLE, '♥ 5 · fais-moi confiance', '#ffb0c8');
      // back from a checkpoint in the middle of the net: the raft comes back up
      if (Net.isHost && x.stage === 3 && x.raft === 'down') c.set((s) => (s.x.raft = 'up'));
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3600);
      HUD.say(TXT.rule, T.master, 4600);
      this.apply(c);
    },
    exit() {
      if (local.prevBR) R.scene.onBeforeRender = local.prevBR;
      local.prevBR = null;
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.hemi.color.copy(local.env.hc);
        R.hemi.groundColor.copy(local.env.hg);
        R.moon.intensity = local.env.moon;
        R.moon.color.copy(local.env.mc);
        R.moon.position.copy(local.env.mp);
      }
      if (Player.mode === 'frozen' && local.froze) Player.mode = 'walk';
      local.froze = false;
      Player.handPose = false;
      Remote.handPose = false;
      H5.hide();
    },
    apply(c) {
      if (!H5.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (prev && x.stage > 1) Sound.play('chime');
        if (x.stage === 2 && prev) Sound.play('reveal');
        if (x.stage === 3) {
          HUD.say(TXT.s3.intro, T.master, 4200);
          if (H5.screen) H5.screen.show('Le Filet', 'sauter · rattraper', '#ffc070');
        }
        if (x.stage === 4) {
          Sound.mood('tense');
          HUD.say(TXT.s4.intro, T.master, 3200);
        }
        if (x.stage === 5) {
          Sound.mood('gold');
          Sound.play('reveal');
          HUD.say(TXT.win, T.master, 3200);
          Fx.hearts(H5.P(H5.WELL.x, H5.HEART_Y + 6, H5.WELL.z));
        }
      }
      if (x.stage === 3 && x.ring === 2 && !local.seen.swapSaid) {
        local.seen.swapSaid = true;
        HUD.say(TXT.swap, T.master, 3600);
      }
      // the dive was reset (a miss, or not enough rings together): back on the board
      if ((x.diveN || 0) !== local.diveN) {
        local.diveN = x.diveN || 0;
        local.mine = [];
        local.landSent = false;
        local.missSent = false;
        local.stun = 0;
        if (x.stage === 4) respawn(c);
      }
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!H5.built) return;
      const x = c.S.x;
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      const qd = H5.rel(pd);
      const qv = H5.rel(pv);
      const Q = { dame: qd, valet: qv };
      local.sendK += dt;
      if (local.sendK > 0.5) {
        local.sendK = 0;
        c.send('h5k', +local.clock.toFixed(3));
      }
      // ---------- the leaps ----------
      if (x.stage === 1 || x.stage === 2) {
        const jumper = jumperOf(x.stage);
        const isl = x.stage === 1 ? 'i1' : 'i2';
        const key = x.stage === 1 ? 'bridgeA' : 'bridgeB';
        if (!x[key] && H5.at(isl, Q[jumper])) {
          c.set((s) => (s.x[key] = true));
          const msg = (who) => (who === jumper ? TXT.reach : TXT.reachMate);
          HUD.say(msg(c.role), T.master, 2600);
          c.send('h5say', [msg(c.other), 2600]);
          fxBoth(c, 'reach', Q[jumper].clone().add(V3(0, 1, 0)));
        }
        if (x[key] && H5.at(isl, qd) && H5.at(isl, qv)) c.set((s) => (s.x.stage += 1));
      }
      // ---------- the net ----------
      if (x.stage === 3) {
        const onRaft = (q) =>
          Math.abs(q.x - local.raft.x) < H5.RAFT_S / 2 + 0.1 && Math.abs(q.z - local.raft.z) < H5.RAFT_S / 2 + 0.1 && Math.abs(q.y - local.raftY) < 0.7;
        if (x.ring < 4) {
          const faller = fallerOf(x.ring);
          const catcher = mateRole(faller);
          // the faller is back up (on the causeway or already on a plank) and the catcher aboard
          if (x.raft === 'dock' && onRaft(Q[catcher]) && Q[faller].y > -0.6 && Q[faller].y < 2 && !onRaft(Q[faller])) c.set((s) => (s.x.raft = 'down'));
        } else if (x.raft === 'dock' && H5.at('p4', qd) && H5.at('p4', qv)) c.set((s) => (s.x.stage = 4));
        if (x.raft === 'up') {
          const d = H5.DOCKS[Math.min(x.dock, 4)];
          if (Math.hypot(local.raft.x - d[0], local.raft.z - d[1]) < 0.35 && local.raftY > -0.12) c.set((s) => (s.x.raft = 'dock'));
        }
      }
      // ---------- the dive ----------
      if (x.stage === 4) {
        if (!x.open) {
          if (H5.onBoard(qd) && H5.onBoard(qv)) {
            local.countT += dt;
            const n = Math.min(3, Math.floor(local.countT / 1.1) + 1);
            if (n !== x.count) c.set((s) => (s.x.count = n));
            if (local.countT > 3.4) {
              local.countT = 0;
              c.set((s) => {
                s.x.open = true;
                s.x.count = 0;
              });
              fxBoth(c, 'open', null);
            }
          } else if (local.countT > 0 || x.count) {
            local.countT = 0;
            c.set((s) => (s.x.count = 0));
          }
        } else {
          // remote velocity estimate, for aiming the lightning a little ahead
          local.remV.copy(Remote.pos).sub(local.remPrev).divideScalar(Math.max(dt, 1e-3));
          local.remPrev.copy(Remote.pos);
          const falling = ['dame', 'valet'].filter((w) => !x.landed[w] && Q[w].y < -10 && Q[w].y > H5.HEART_Y + 25);
          local.zapT -= dt;
          if (local.zapT <= 0 && falling.length) {
            // denser as you get deeper
            const deep = clamp(-Math.min(qd.y, qv.y) / 300, 0, 1);
            local.zapT = 2.4 - deep * 0.8 + Math.random() * 1.2;
            const who = falling[(Math.random() * falling.length) | 0];
            const v = who === c.role ? Player.body.v : local.remV;
            const q = Q[who];
            const d = [+(q.x + v.x * 1.2).toFixed(2), +(q.y + v.y * 1.4 - 4).toFixed(2), +(q.z + v.z * 1.2).toFixed(2)];
            strike(d);
            c.send('h5z', d);
          }
          // too far apart to hold hands
          if (x.hand && pd.distanceTo(pv) > 6) c.set((s) => (s.x.hand = false));
          if (x.fail && local.clock - x.fail > 4.2)
            c.set((s) => resetDive(s));
        }
      }
      if (x.stage === 5) {
        if (local.won > 2.6 && H5.nearCard(qd) && H5.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'h5'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'pass' && x.stage === 3 && who === fallerOf(x.ring) && d.i === x.ring && x.raft === 'down') {
        c.set((s) => (s.x.passed = d.i));
      }
      if (d.a === 'caught' && x.stage === 3 && x.raft === 'down' && who === fallerOf(x.ring)) {
        const ok = x.passed === x.ring;
        const p = H5.rel(c.pos(who)).add(V3(0, 0.6, 0));
        fxBoth(c, 'catch', p);
        if (ok) {
          const nr = x.ring + 1;
          c.set((s) => {
            s.x.ring = nr;
            s.x.passed = -1;
            s.x.raft = 'up';
            s.x.dock = Math.min(nr, 4);
          });
          const mine = who === c.role ? TXT.caught : TXT.caughtMate;
          const theirs = who === c.role ? TXT.caughtMate : TXT.caught;
          sayBoth(c, mine, theirs);
        } else {
          c.set((s) => {
            s.x.passed = -1;
            s.x.raft = 'up';
          });
          sayBoth(c, who === c.role ? TXT.noRing : TXT.noRingMate, who === c.role ? TXT.noRingMate : TXT.noRing, 3000);
        }
      }
      if (d.a === 'missNet' && x.stage === 3) c.set((s) => (s.x.passed = -1));
      if (d.a === 'dpass' && x.stage === 4 && x.open && x.dr[d.i] && x.dr[d.i][who] == null) {
        const before = okRings(x);
        c.set((s) => {
          s.x.dr = s.x.dr.slice();
          // hand in hand, the one who goes through brings the other along
          const both = s.x.hand ? { [mateRole(who)]: local.clock } : {};
          s.x.dr[d.i] = { ...both, ...s.x.dr[d.i], [who]: local.clock };
        });
        const after = okRings(c.S.x);
        if (after > before) {
          const msg = TXT.s4.ring.replace('{n}', after);
          sayBoth(c, msg, msg, 1800);
          fxBoth(c, 'ring', H5.rel(H5.diveRings[d.i].pos));
        }
      }
      if (d.a === 'land' && x.stage === 4 && x.open && !x.fail) {
        c.set((s) => (s.x.landed = { ...s.x.landed, [who]: true }));
        const L = c.S.x.landed;
        if (L.dame && L.valet) {
          const n = okRings(c.S.x);
          if (n >= 5)
            c.set((s) => {
              s.x.stage = 5;
              s.x.won = true;
              s.x.hand = false;
            });
          else {
            c.set((s) => (s.x.fail = local.clock || 0.01));
            const msg = TXT.s4.fail.replace('{n}', n);
            sayBoth(c, msg, msg, 4000);
          }
        }
      }
      if (d.a === 'miss4' && x.stage === 4 && x.open) {
        sayBoth(c, who === c.role ? TXT.s4.miss : TXT.s4.missMate, who === c.role ? TXT.s4.missMate : TXT.s4.miss, 3000);
        c.set((s) => resetDive(s));
      }
      if (d.a === 'hand' && x.stage === 4) {
        const now = performance.now();
        const o = mateRole(who);
        x.req = x.req || {};
        x.req[who] = now;
        if (x.req[o] && now - x.req[o] < 2500 && c.pos(who).distanceTo(c.pos(o)) < 3.6) {
          c.set((s) => (s.x.hand = true));
          sayBoth(c, TXT.s4.hand, TXT.s4.hand, 2200);
        }
      }
      if (d.a === 'unhand' && x.hand) c.set((s) => (s.x.hand = false));
    },
    update(c, dt, t) {
      if (!H5.built) return null;
      const x = c.S.x;
      const r = c.role;
      const b = Player.body;
      const p = b.p;
      const q = H5.rel(p);
      local.clock += dt;
      if (x.stage === 5) local.won += dt;
      local.stun = Math.max(0, local.stun - dt);
      local.lifted = Math.max(0, local.lifted - dt);

      // ---------- the raft ----------
      const R_ = H5.raft;
      const faller = fallerOf(Math.min(x.ring, 3));
      const owner = x.stage === 3 && (x.ring >= 4 ? r === 'dame' : r !== faller);
      const dock = H5.DOCKS[Math.min(x.dock || 0, 4)];
      const onRaftNow = b.ground === R_.b;
      let steering = false;
      if (x.stage === 3) {
        if (owner) {
          if (x.raft === 'down') {
            steering = onRaftNow || local.froze;
            const m = steering ? Input.move() : { x: 0, z: 0 };
            const fx_ = Math.sin(Cam.yaw);
            const fz = Math.cos(Cam.yaw);
            tmp.set(fx_ * m.z - fz * m.x, 0, fz * m.z + fx_ * m.x);
            if (tmp.length() > 1) tmp.normalize();
            local.raftV.x = damp(local.raftV.x, tmp.x * 6.5, 3.2, dt);
            local.raftV.z = damp(local.raftV.z, tmp.z * 6.5, 3.2, dt);
            local.raft.addScaledVector(local.raftV, dt);
            const B = H5.BASIN;
            const h = H5.RAFT_S / 2;
            local.raft.x = clamp(local.raft.x, B.x0 + h, B.x1 - h);
            local.raft.z = clamp(local.raft.z, B.z0 + h, B.z1 - h);
            local.raftY += clamp(H5.RAFT_Y - local.raftY, -6 * dt, 4 * dt);
          } else {
            // back to the dock: across under the causeway first, then up
            const dx = dock[0] - local.raft.x;
            const dz = dock[1] - local.raft.z;
            const d = Math.hypot(dx, dz);
            const step = Math.min(d, 7 * dt);
            if (d > 1e-3) local.raft.x += (dx / d) * step;
            if (d > 1e-3) local.raft.z += (dz / d) * step;
            local.raftV.set((dx / Math.max(d, 1e-3)) * (step / dt), 0, (dz / Math.max(d, 1e-3)) * (step / dt));
            const ty = d < 0.4 ? 0 : Math.min(local.raftY, -4);
            local.raftY += clamp(ty - local.raftY, -6 * dt, 4 * dt);
          }
          // the raft slides around the pillars under the causeway
          H5.PILLARS.forEach((pz) => {
            const ex = local.raft.x;
            const ez = local.raft.z - pz;
            const d = Math.hypot(ex, ez);
            const min = H5.RAFT_S / 2 + 1.1;
            if (d < min && local.raftY < -1) {
              const k = (min - d) / Math.max(d, 1e-3);
              local.raft.x += (ex || 0.01) * k;
              local.raft.z += ez * k;
              // slide along it instead of sticking
              const nx = ex / Math.max(d, 1e-3);
              const nz = ez / Math.max(d, 1e-3);
              const vn = local.raftV.x * nx + local.raftV.z * nz;
              if (vn < 0) {
                local.raftV.x -= nx * vn;
                local.raftV.z -= nz * vn;
                // and a nudge sideways so a push straight at it still goes round
                const side = local.raftV.x * -nz + local.raftV.z * nx >= 0 ? 1 : -1;
                local.raftV.x += -nz * side * 1.5 * dt * 10;
                local.raftV.z += nx * side * 1.5 * dt * 10;
              }
            }
          });
          local.sendR += dt;
          if (local.sendR > 0.05) {
            local.sendR = 0;
            c.send('h5r', [+local.raft.x.toFixed(3), +local.raftY.toFixed(3), +local.raft.z.toFixed(3)]);
          }
        } else if (local.raftGot) {
          local.raft.x = damp(local.raft.x, local.raftT.x, 12, dt);
          local.raft.z = damp(local.raft.z, local.raftT.z, 12, dt);
          local.raftY = damp(local.raftY, local.raftTY, 12, dt);
        }
      }
      R_.b.on = x.stage === 3;
      H5.setBox(R_.b, local.raft.x, local.raftY - 0.2, local.raft.z, H5.RAFT_S, 0.4, H5.RAFT_S);
      R_.g.position.copy(H5.P(local.raft.x, local.raftY, local.raft.z));
      R_.g.visible = x.stage === 3;
      R_.wheel.rotation.z += (local.raftV.x - local.raftV.z) * dt * 0.6;
      R_.g.rotation.z = clamp(-local.raftV.x * 0.012, -0.08, 0.08);
      R_.g.rotation.x = clamp(local.raftV.z * 0.012, -0.08, 0.08);
      // carry whoever stands on it
      if (onRaftNow) {
        p.x += local.raft.x - local.rlast.x;
        p.z += local.raft.z - local.rlast.z;
        p.y += local.raftY - local.rlastY;
      }
      local.rlast.copy(local.raft);
      local.rlastY = local.raftY;
      // the one at the helm does not walk: the input steers the raft
      if (steering && x.raft === 'down') {
        if (Player.mode === 'walk') {
          Player.mode = 'frozen';
          local.froze = true;
        }
      } else if (local.froze) {
        Player.mode = 'walk';
        local.froze = false;
      }
      // the clouds carry whoever stands on a drifting one
      if (b.grounded && b.ground) {
        const hc = H5.hidden.find((h) => h.b === b.ground && h.drift);
        if (hc) {
          p.x += hc.dx || 0;
          p.z += hc.dz || 0;
        }
      }

      // ---------- the world, this frame ----------
      const shadowOn = x.stage === 3 && x.raft === 'down' && r !== faller && x.ring < 4;
      H5.update(dt, t, {
        clock: local.clock,
        stage: x.stage,
        seer: { A: r === 'valet', B: r === 'dame' },
        solid: { A: r === 'dame', B: r === 'valet' },
        bridge: { A: !!x.bridgeA, B: !!x.bridgeB },
        ringOn: (i) => x.stage === 3 && i === x.ring,
        mist: x.stage === 3 && r === faller && x.ring < 4,
        diveRing: (i) => {
          const d = (x.dr || [])[i] || {};
          if (d.dame != null && d.valet != null && Math.abs(d.dame - d.valet) < 4.5) return 2;
          return local.mine[i] ? 1 : 0;
        },
        diving: x.stage === 4 && x.open,
        count: x.count || 0,
        won: x.stage === 5 ? Math.max(0.01, local.won) : 0,
        seaY: x.stage >= 4 ? -345 : -45,
      });
      // the haze: warm at the islands, deeper rose in the Well
      const depth = clamp(-q.y / 300, 0, 1);
      local.haze.setRGB(0.6 - depth * 0.12, 0.36 - depth * 0.08, 0.42 - depth * 0.02);
      // the trapdoor
      const B = H5.board;
      B.userData.col.on = !x.open;
      B.rotation.x = damp(B.rotation.x, x.open ? 1.45 : 0, x.open ? 5 : 3, dt);
      // where the faller would land, for the catcher
      const SM = H5.shadowMark;
      SM.visible = shadowOn && Remote.has;
      if (SM.visible) {
        const fq = H5.rel(Remote.pos);
        SM.position.copy(H5.P(fq.x, H5.RAFT_Y + 0.06, fq.z));
        const falling = fq.y < -0.5;
        SM.children[0].material.color.set(falling ? '#ff4f6f' : '#ff7fa0').multiplyScalar(falling ? 0.85 : 0.6);
        SM.scale.setScalar(falling ? 1 + Math.sin(t * 16) * 0.08 : 1);
      }

      const RM = H5.ringMark;
      RM.visible = shadowOn;
      if (shadowOn) {
        const rq = H5.ringAt(x.ring, local.clock, tmp);
        RM.position.copy(H5.P(rq.x, H5.RAFT_Y + 0.04, rq.z));
        RM.material.opacity = 0.28 + Math.sin(t * 3) * 0.06;
      }
      // the jumper feels the cloud under the feet (a soft puff on their own screen only)
      const hcl = b.grounded && H5.hidden.find((h) => h.b === b.ground);
      if (hcl && local.lastCloud !== hcl) {
        Sound.play('land', 0.4);
        Fx.burst(p.clone().add(V3(0, 0.1, 0)), '#ffd6e0', 26, 2.2, 0.7, 0.5);
      }
      local.lastCloud = hcl || null;

      // ---------- leaps: the updraft, falls ----------
      if (x.stage === 1 || x.stage === 2) {
        H5.updrafts.forEach((u) => {
          if ((u.leap === 'A' ? r === 'dame' : r === 'valet') === false) return;
          if (Math.hypot(q.x - u.x, q.z - u.z) < u.r && q.y > u.y0 && q.y < u.y1 + 0.5) {
            // lifts you, then holds you a little above the high clouds
            const target = q.y < u.y1 - 0.5 ? 7.5 : 0.4;
            b.v.y += (target - b.v.y) * Math.min(1, dt * 6);
            b.v.x *= Math.exp(-1.2 * dt);
            b.v.z *= Math.exp(-1.2 * dt);
            if (!local.lifted) {
              Sound.play('launch');
              Cam.shake = Math.max(Cam.shake, 0.2);
              if (!local.seen.lift) HUD.say(TXT.lift, T.master, 2200);
              local.seen.lift = true;
            }
            local.lifted = 0.6;
            if (Math.random() < dt * 25) Fx.burst(p.clone().add(V3((Math.random() - 0.5) * 2, -1, (Math.random() - 0.5) * 2)), '#ffe0c8', 3, 2, 0.6, 3);
          }
        });
        if (q.y < -14) {
          fxBoth(c, 'splash', q.clone().setY(-12));
          HUD.say(TXT.fall, T.master, 2400);
          c.send('h5say', [TXT.fallMate, 2400]);
          respawn(c);
        }
      }

      // ---------- the net: rings, the catch, falls ----------
      if (x.stage === 3 && x.ring < 4) {
        if (r === faller) {
          const rq = H5.ringAt(x.ring, local.clock, tmp);
          if (local.prevY > rq.y && q.y <= rq.y && local.passSent !== x.ring * 100 + (local.diveN || 0)) {
            if (H5.inRing(H5.RING_K, q.x - rq.x, q.z - rq.z)) {
              local.passSent = x.ring * 100 + (local.diveN || 0);
              c.act({ a: 'pass', i: x.ring });
              HUD.say(TXT.pass, T.master, 1400);
              c.send('h5say', [TXT.passMate, 1800]);
              fxBoth(c, 'pass', rq.clone());
            }
          }
          if (x.raft === 'down' && onRaftNow && b.grounded && !local.caughtSent) {
            local.caughtSent = true;
            c.act({ a: 'caught' });
          }
          if (q.y < -24) {
            fxBoth(c, 'splash', q.clone().setY(-22));
            HUD.say(TXT.fallNet, T.master, 2400);
            c.send('h5say', [TXT.fallNetMate, 2400]);
            c.act({ a: 'missNet' });
            local.passSent = -1;
            respawn(c);
          }
        } else if (q.y < -24) {
          // the catcher slipped off: back on the raft
          c.spawn(H5.P(local.raft.x, local.raftY + 0.2, local.raft.z), 0);
        }
      }
      if (x.raft !== 'down') {
        local.caughtSent = false;
        if (x.ring !== local.lastRing) local.passSent = -1;
      }
      local.lastRing = x.ring;
      if (x.stage === 3 && x.ring >= 4 && q.y < -24) respawn(c);

      // ---------- the dive ----------
      if (x.stage === 4) {
        const inWell = H5.inWell(q);
        if (x.open && inWell && !b.grounded) {
          const rp = Remote.pos;
          const near = Remote.has && p.distanceTo(rp) < 4;
          const term = local.stun > 0 ? 24 : x.hand && near ? 6 : 10;
          // gravity adds 26 m/s² each frame: ease big excesses (after a strike), then hold the cap
          if (b.v.y < -term - 3) b.v.y = -term + (b.v.y + term) * Math.exp(-6 * dt);
          else if (b.v.y < -term) b.v.y = -term;
          // soft walls of the Well
          const dx = q.x - H5.WELL.x;
          const dz = q.z - H5.WELL.z;
          const dd = Math.hypot(dx, dz);
          const lim = H5.WELL.r - 0.6;
          if (dd > lim) {
            b.v.x -= (dx / dd) * (dd - lim) * 14 * dt;
            b.v.z -= (dz / dd) * (dd - lim) * 14 * dt;
          }
          // hand in hand: the two keep together (each screen pulls its own diver)
          if (x.hand && near) {
            const hx = rp.x - p.x;
            const hz = rp.z - p.z;
            const hd = Math.hypot(hx, hz);
            if (hd > 1.1) {
              const mv = Math.min(hd - 1.05, 2.5 * dt);
              p.x += (hx / hd) * mv;
              p.z += (hz / hd) * mv;
            }
            b.v.y += clamp(rp.y - p.y, -3, 3) * 3 * dt;
          }
          // rings
          H5.diveRings.forEach((rg, i) => {
            const ry = rg.pos.y - H5.O.y;
            if (local.prevY > ry && q.y <= ry && !local.mine[i]) {
              const rq = H5.rel(rg.pos);
              if (H5.inRing(0.165, q.x - rq.x, q.z - rq.z)) {
                local.mine[i] = 1;
                Sound.play('chime');
                c.act({ a: 'dpass', i });
              }
            }
          });
        }
        // lightning: each screen checks its own diver
        H5.bolts.forEach((bo) => {
          if (bo.t >= 1.4 && !bo.checked) {
            bo.checked = true;
            if (Math.hypot(q.x - bo.x, q.z - bo.z) < 2.5 && Math.abs(q.y - bo.y) < 36 && x.open && !b.grounded) {
              local.stun = 1.3;
              Cam.shake = Math.max(Cam.shake, 0.6);
              b.v.x += (Math.random() - 0.5) * 6;
              b.v.z += (Math.random() - 0.5) * 6;
              HUD.say(TXT.s4.zap, T.master, 2000);
              c.send('h5say', [TXT.s4.zapMate, 2000]);
              fxBoth(c, 'zap', q.clone().add(V3(0, 1, 0)));
              if (x.hand) c.act({ a: 'unhand' });
            }
          }
        });
        if (x.open && b.grounded && Math.abs(q.y - H5.HEART_Y) < 0.6 && H5.inHeart(q) && !local.landSent) {
          local.landSent = true;
          c.act({ a: 'land' });
          Sound.play('land', 1);
        }
        if (q.y < H5.HEART_Y - 30 && !local.missSent) {
          local.missSent = true;
          c.act({ a: 'miss4' });
          respawn(c);
        }
        if (!x.open && q.y < -8) respawn(c);
        // hold hands on the board or in the air
        Avatar.together(dt, !!x.hand && b.grounded);
        if (x.hand && !b.grounded && Remote.has && p.distanceTo(Remote.pos) < 4) {
          Player.handPose = true;
          Remote.handPose = true;
        }
      } else if (x.stage !== 5) {
        Player.handPose = false;
        Remote.handPose = false;
      }
      if (x.stage === 5 && q.y < H5.HEART_Y - 20) respawn(c);
      local.prevY = q.y;

      // ---------- the objective follows what happens ----------
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.4;
        HUD.objective(objective(c));
      }

      // ---------- prompts ----------
      if (x.stage === 4) {
        const near = Remote.has && p.distanceTo(Remote.pos) < 3.2;
        if (near || x.hand) {
          if (Input.pressed('interact')) c.act({ a: x.hand ? 'unhand' : 'hand' });
          return ['E', x.hand ? 'Lâcher sa main' : 'Lui tendre la main'];
        }
      }
      if (steering && x.raft === 'down') return ['ZQSD', 'Diriger le radeau'];
      return null;
    },
  });
})();
