(() => {
  const T = CONFIG;
  const A = T.raid;
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('cR');
  // stages: 1 ascent · 2 Galerie des Sceaux · 3 enter the arena · 4 the Oracle · 5 victory
  // x.ms (milestones read by the card system): 1 = vault crossed, 2 = Oracle broken once
  const L = {
    sealsKit: {
      dame: 'Les portes du Caveau : tiens-toi sur le sceau ♥ pendant que {mate} tient le sceau ♠.',
      valet: 'Les portes du Caveau : tiens-toi sur le sceau ♠ pendant que {mate} tient le sceau ♥.',
    },
    galerie: 'La Galerie des Sceaux. Chaque sceau fait apparaître le pont de l’autre.',
    gal: {
      dame: {
        a: 'Tiens le sceau ♥ : le pont de {mate} apparaît. Attends qu’{il} traverse.',
        wait1: '{mate} est sur l’îlot : son sceau ♠ va faire apparaître ton pont. Traverse.',
        island: 'Sur l’îlot : tiens le sceau ♥ pour {mate}, puis attends son sceau de l’autre côté.',
        wait2: 'Ton pont est là. Rejoins {mate} de l’autre côté.',
        far: 'Vous y êtes. La porte du Caveau s’ouvre.',
      },
      valet: {
        a: '{mate} tient son sceau : ton pont ♠ apparaît. Traverse jusqu’à l’îlot.',
        wait1: 'Sur l’îlot, tiens le sceau ♠ : le pont de {mate} apparaît.',
        island: '{mate} tient son sceau sur l’îlot : traverse jusqu’au bout.',
        wait2: 'Tiens le sceau ♠ du bout : le dernier pont de {mate} apparaît.',
        far: 'Vous y êtes. La porte du Caveau s’ouvre.',
      },
    },
    warn: 'La Sentinelle se charge : sous l’Égide, vite !',
    warnObj: {
      dame: 'La Sentinelle va balayer l’îlot : rejoins {mate} sous son bouclier.',
      valet: 'La Sentinelle va balayer l’îlot : lève l’Égide (F) près de {mate}.',
    },
    swept: 'Balayé·e par la Sentinelle. Retour au début de la galerie.',
    shuffle: 'Les symboles changent de pilier !',
    phase2: 'Vous m’avez blessé. Mes piliers ne tiendront plus en place.',
    phase3: 'Assez. Que l’Œil change de camp.',
    arena: 'Entrez dans l’arène. Ensemble.',
    onde: 'Ondes : sortez des cercles rouges !',
    broken: 'L’Oracle est brisé : visez le cœur !',
    phaseName: ['', 'Rituel I', 'Rituel II', 'Dernier rituel'],
  };
  const local = {
    stage: 0,
    cp: null,
    ritualKey: '',
    aegisCd: 0,
    win: 0,
    wipe: 0,
    abilLabel: null,
    doorT: 0,
    galKey: null,
    arc: null,
  };
  const hs = { t: 0, add: 4, gaze: [], ondeAt: -1, onde: null, aegis: 0, cd: 0, dps: 0, sw: 0, warned: false };
  const PHASE_FLOOR = [0, 0.66, 0.33, 0];

  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: false };
    });

  const oracle = () => Enemies.boss();

  const newSeq = (n) => {
    const s = [];
    while (s.length < n) {
      const v = (Math.random() * 4) | 0;
      if (v !== s[s.length - 1]) s.push(v);
    }
    return s;
  };
  const shuffled = (prev) => {
    let p;
    do p = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    while (prev && p.join() === prev.join());
    return p;
  };

  const fx = (k) => {
    onFx(k);
    Net.send('rfx', k);
  };
  const onFx = (k) => {
    const c = Story.ctx;
    if (!Story.S || Story.S.phase !== 'raid') return;
    const x = Story.S.x;
    if (k === 'good') Sound.play('rune', true);
    if (k === 'wrong') {
      Sound.play('rune', false);
      Cam.shake = 0.25;
      HUD.say(A.wrong, A.boss, 2200);
    }
    if (k === 'shuffle') {
      Sound.play('reveal');
      HUD.say(L.shuffle, A.boss, 1800);
    }
    if (k === 'broken') {
      Sound.play('shatter');
      Sound.play('roar');
      HUD.say(L.broken, T.master, 2600);
      Raid.screen.show(A.phase[1], A.boss, '#ffcf8a');
    }
    if (k === 'phase2') {
      Sound.play('roar');
      HUD.say(L.phase2, A.boss, 3000);
      Raid.screen.show(L.phaseName[2], A.boss, '#ff9a3a');
    }
    if (k === 'phase3') {
      Sound.play('roar');
      HUD.say(L.phase3, A.boss, 3000);
      Raid.screen.show(L.phaseName[3], A.boss, '#ff2a5a');
    }
    if (k === 'gaze') {
      Sound.play('gaze');
      HUD.say(A.gaze, A.boss, 2200);
      HUD.objective(A.gazeObj[c.role]);
      Raid.screen.show('Le Regard', 'Sous l’Égide !', '#ff2a5a');
    }
    if (k === 'gazeHit') {
      Sound.play('slam');
      Cam.shake = 0.5;
      Fx.burst(Raid.oraclePos().add(V3(0, 6, 0)), '#7cf0c8', 300, 14, 1, 0);
      local.ritualKey = '';
    }
    if (k === 'rise') {
      Sound.play('reveal');
      HUD.say(A.rise, T.master, 2200);
    }
    if (k === 'dome') Sound.play('dome');
    if (k === 'warn') {
      Raid.warn();
      Sound.play('gaze');
      HUD.say(L.warn, T.master, 2000);
      HUD.objective(L.warnObj[c.role]);
    }
    if (k === 'sweep') {
      Raid.sweep();
      Sound.play('slam');
      Cam.shake = 0.35;
      local.galKey = null;
      // each player checks itself: on the island and outside the Égide = back to the start
      const q = Raid.rel(Player.body.p);
      const covered = x.aegis && Raid.domeCovers(Player.body.p, c.pos('valet'));
      if (Raid.onIsland(q) && !covered) {
        local.cp = Raid.zoneSpawn('a', c.role);
        c.spawn(local.cp, 0);
        HUD.say(L.swept, T.master, 2400);
      }
    }
    if (k === 'door') Sound.play('door');
  };
  Net.on('rfx', onFx);
  // ripples: red circles under the players, damage when they close
  Net.on('ronde', (d) => {
    if (!Story.S || Story.S.phase !== 'raid') return;
    showOnde(d);
  });
  const showOnde = (d) => {
    for (let i = 0; i < d.length; i += 3) Enemies.telegraph(V3(d[i], d[i + 1], d[i + 2]), 3.2, 1.6);
    Sound.play('gaze');
    HUD.say(L.onde, A.boss, 1600);
  };

  const ritualText = (c) => {
    const x = c.S.x;
    const seer = x.seer === c.role;
    const final = x.seer === 'valet';
    if (seer) {
      const seq = x.seq.map((s, i) => (i < x.prog ? '·' : Raid.SYMS[s])).join('  ');
      return (final ? A.ritualSwap[c.role] : A.ritual[c.role]) + '  Séquence : ' + seq;
    }
    return (
      (final ? A.ritualSwap[c.role] : A.ritual[c.role]) + ' (' + x.prog + '/' + x.seq.length + ')'
    );
  };

  const phaseOf = (o) => (o.hp / o.max > PHASE_FLOOR[1] + 0.01 ? 1 : o.hp / o.max > PHASE_FLOOR[2] + 0.01 ? 2 : 3);

  const newRitual = (c) => {
    const o = oracle();
    const ph = o ? phaseOf(o) : 1;
    const prev = c.S.x.ph || 1;
    if (o) {
      o.st = ph === 3 ? 2 : 0;
      o.phase = ph;
    }
    hs.t = 0;
    hs.add = 4;
    hs.gaze = [];
    hs.ondeAt = -1;
    hs.onde = null;
    c.set((s) => {
      s.x.ritual = true;
      s.x.ph = ph;
      s.x.seq = newSeq(ph === 1 ? 3 : 4);
      s.x.prog = 0;
      s.x.lit = [];
      s.x.seer = ph === 3 ? 'valet' : 'dame';
      s.x.perm = ph === 1 ? [0, 1, 2, 3] : shuffled(s.x.perm);
    });
    if (ph > prev) fx(ph === 2 ? 'phase2' : 'phase3');
  };

  const resetEncounter = (c, msg) => {
    Enemies.clear();
    Enemies.netTick(1);
    Combat.reset();
    Object.assign(hs, { t: 0, add: 4, gaze: [], ondeAt: -1, onde: null, aegis: 0, cd: 0, dps: 0 });
    c.set((s) => {
      s.x.stage = 3;
      s.x.ritual = false;
      s.x.aegis = false;
      s.x.seq = [];
      s.x.lit = [];
      s.x.prog = 0;
      s.x.ph = 1;
      s.x.perm = [0, 1, 2, 3];
    });
    c.spawn(Raid.spawn(3, c.role), 0);
    HUD.say(msg, T.master, 2800);
    c.send('rwipe', msg);
  };

  // stage-2 objective: who holds what, who crosses next
  const galText = (c) => {
    const x = c.S.x;
    const la = x.latch || [];
    const g = L.gal[c.role];
    if (la.includes('d2')) return g.far;
    if (la.includes('v2')) return g.wait2;
    if (la.includes('d1')) return g.island;
    if (la.includes('v1')) return g.wait1;
    return g.a;
  };

  const stageEnter = (c, st) => {
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(A.climb[r]);
      Raid.screen.show(CARD, A.title, '#7cf0c8');
    }
    if (st === 2) {
      HUD.say(L.galerie, T.master, 3600);
      Sound.play('door');
      Raid.screen.show('Les Sceaux', 'Le Caveau', '#7cf0c8');
      local.galKey = null;
    }
    if (st === 3) {
      HUD.objective(L.arena);
      Sound.play('door');
      Raid.screen.show(A.boss, 'Le Caveau', '#7cf0c8');
    }
    if (st === 4) {
      Sound.mood('tense');
      HUD.say(A.roles[r], T.master, 4200);
    }
    if (st === 5) {
      HUD.boss(null);
      HUD.objective(T.portes.card.replace('{card}', CARD));
      HUD.say(A.victory, T.master, 2800);
      Sound.mood('calm');
      Sound.play('card');
      Raid.screen.show(CARD, 'Victoire', '#ffcf8a');
    }
  };

  const sameList = (a, b) => (a || []).join() === (b || []).join();

  Story.register('raid', {
    world: Raid,
    init: () => ({
      stage: 1,
      ms: 0,
      held: [],
      latch: [],
      ritual: false,
      seq: [],
      prog: 0,
      lit: [],
      seer: 'dame',
      aegis: false,
      perm: [0, 1, 2, 3],
      ph: 1,
    }),
    voice: () => 1,
    net: {
      rwipe: (c, msg) => {
        Combat.reset();
        c.spawn(Raid.spawn(3, c.role), 0);
        HUD.say(msg || A.wipe, T.master, 2800);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Raid.build();
      Enemies.clear();
      local.stage = 0;
      local.cp = null;
      local.arc = null;
      local.objSet = false;
      c.spawn(Raid.spawn(c.S.x.stage, c.role), 0);
      Player.killY = Raid.O.y - 14;
      Player.checkpoint = () => local.cp || Raid.spawn(Story.S.x.stage, c.role);
      Player.targets = () => (c.role === 'dame' && Story.S.x.stage === 1 ? Raid.rings() : []);
      City.mood({ dark: 0.35 });
      c.fog(0.009);
      Raid.mood(true);
      Combat.enable(true);
      Combat.noCloak = true;
      const lab = $('vAbil').querySelector('span');
      local.abilLabel = lab.textContent;
      lab.textContent = 'Égide';
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3800);
      this.apply(c);
    },
    exit() {
      Raid.mood(false);
      Combat.enable(false);
      Combat.noCloak = false;
      Combat.abil = null;
      if (local.abilLabel) $('vAbil').querySelector('span').textContent = local.abilLabel;
      Enemies.clear();
      HUD.boss(null);
      Player.targets = null;
      Raid.setDome(false);
    },
    apply(c) {
      if (!Raid.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      if (x.stage === 2) {
        const k = (x.latch || []).join();
        if (k !== local.galKey) {
          local.galKey = k;
          HUD.objective(galText(c));
        }
      }
      const key =
        x.stage + '|' + x.ritual + '|' + x.seq.join() + '|' + x.prog + '|' + x.seer + '|' + (x.perm || []).join();
      if (key !== local.ritualKey) {
        local.ritualKey = key;
        if (x.stage === 4 && x.ritual) HUD.objective(ritualText(c));
        if (x.stage === 4 && !x.ritual) HUD.objective(L.broken);
      }
    },
    host(c, dt) {
      if (!Raid.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = Raid.rel(ps[0].pos);
      const qv = Raid.rel(ps[1].pos);
      // ---- stage 1: both seals of the vault door at once
      if (x.stage === 1) {
        const d = Raid.onSeal('doorD', qd);
        const v = Raid.onSeal('doorV', qv);
        const held = [d && 'doorD', v && 'doorV'].filter(Boolean);
        if (!sameList(held, x.held)) c.set((s) => (s.x.held = held));
        local.doorT = d && v ? local.doorT + dt : 0;
        if (local.doorT > 0.8)
          c.set((s) => {
            s.x.stage = 2;
            s.x.held = [];
          });
      }
      // ---- stage 2: each seal raises the other player's lane; a crossed lane stays
      if (x.stage === 2) {
        const held = [];
        if (Raid.onSeal('v1', qd)) held.push('v1');
        if (Raid.onSeal('d1', qv)) held.push('d1');
        if (Raid.onSeal('v2', qd)) held.push('v2');
        if (Raid.onSeal('d2', qv)) held.push('d2');
        const latch = (x.latch || []).slice();
        const add = (k, ok) => ok && !latch.includes(k) && latch.push(k);
        add('v1', Raid.onIsland(qv) || Raid.onFar(qv));
        add('d1', Raid.onIsland(qd) || Raid.onFar(qd));
        add('v2', Raid.onFar(qv));
        add('d2', Raid.onFar(qd));
        if (!sameList(held, x.held) || !sameList(latch, x.latch))
          c.set((s) => {
            s.x.held = held;
            s.x.latch = latch;
          });
        // the sentinel sweeps the island only while you are both on it
        if (Raid.onIsland(qd) && Raid.onIsland(qv)) {
          hs.sw += dt;
          if (hs.sw > 7 && !hs.warned) {
            hs.warned = true;
            fx('warn');
          }
          if (hs.sw > 9.2) {
            hs.sw = 0;
            hs.warned = false;
            fx('sweep');
          }
        } else if (!hs.warned) hs.sw = 0;
        else {
          hs.sw += dt;
          if (hs.sw > 9.2) {
            hs.sw = 0;
            hs.warned = false;
            fx('sweep');
          }
        }
        if (Raid.onFar(qd) && Raid.onFar(qv))
          c.set((s) => {
            s.x.stage = 3;
            s.x.ms = Math.max(s.x.ms || 0, 1);
            s.x.held = [];
          });
      }
      if (x.stage === 3 && Raid.inArena(qd) && Raid.inArena(qv)) {
        Enemies.clear();
        const o = Enemies.spawn('oracle', Raid.oraclePos(), { st: 0, atk: 5, phase: 1 });
        o.pos.y += 9;
        c.set((s) => (s.x.stage = 4));
        newRitual(c);
      }
      if (x.stage === 5) {
        local.win += dt;
        if (local.win > 3 && Raid.nearCard(qd) && Raid.nearCard(qv))
          c.goto('reward', (s) => (s.x.card = 'cR'));
      }
      // Égide timer
      hs.cd = Math.max(0, hs.cd - dt);
      if (hs.aegis > 0) {
        hs.aegis -= dt;
        if (hs.aegis <= 0) c.set((s) => (s.x.aegis = false));
      }
      if (x.stage !== 4) {
        if (Enemies.alive()) Enemies.simulate(dt, ps);
        Enemies.netTick(dt);
        return;
      }
      const o = oracle();
      if (!o) {
        Enemies.clear();
        Enemies.netTick(1);
        c.set((s) => {
          s.x.stage = 5;
          s.x.ritual = false;
          s.x.aegis = false;
        });
        return;
      }
      hs.t += dt;
      const ph = x.ph || 1;
      // a damage window cannot skip a phase
      const floor = PHASE_FLOOR[ph] * o.max;
      if (o.hp < floor) o.hp = floor;
      if (x.ritual) {
        hs.add -= dt;
        const adds = Enemies.alive('pion') + Enemies.alive('spectre') + Enemies.alive('tour');
        if (hs.add <= 0 && adds < 5) {
          hs.add = ph === 1 ? 8 : 7;
          const seerPos = x.seer === 'dame' ? ps[0].pos : ps[1].pos;
          const center = Raid.oraclePos();
          // phase 1: Pions + a Spectre · phase 2: shielded Tours (sword, then rifle) · phase 3: Spectres
          const kinds = ph === 1 ? ['pion', hs.dps >= 1 ? 'spectre' : 'pion'] : ph === 2 ? ['pion', 'tour'] : ['spectre', 'pion'];
          kinds.forEach((kind) => {
            const a = Math.random() * TAU;
            const p = seerPos.clone().add(V3(Math.cos(a) * 8, 0, Math.sin(a) * 8));
            const d = Math.hypot(p.x - center.x, p.z - center.z);
            if (d > 18) p.lerp(center, (d - 16) / d);
            if (d < 8) p.add(V3(p.x - center.x, 0, p.z - center.z).normalize().multiplyScalar(8 - d));
            p.y = center.y;
            Enemies.spawn(kind, p);
          });
        }
      } else {
        const dur = ph === 3 ? 16 : 14;
        // the Regard: once per window (twice in the last phase)
        const gazes = ph === 3 ? [4, 10.5] : [5];
        gazes.forEach((at, gi) => {
          if (!hs.gaze[gi] && hs.t > at) {
            hs.gaze[gi] = 1;
            fx('gaze');
          }
          if (hs.gaze[gi] === 1 && hs.t > at + 2.6) {
            hs.gaze[gi] = 2;
            fx('gazeHit');
            const vp = ps[1].pos;
            ps.forEach((p) => {
              if (p.down) return;
              const covered = x.aegis && !ps[1].down && Raid.domeCovers(p.pos, vp);
              if (!covered) Combat.hurt(p.who, 70, o.pos);
            });
          }
        });
        // ripples from phase 2 on: red circles under each player
        if (ph >= 2 && hs.ondeAt < 0 && hs.t > 8.5) {
          hs.ondeAt = hs.t;
          hs.onde = ps.filter((p) => !p.down).map((p) => p.pos.clone());
          const d = [];
          hs.onde.forEach((p) => d.push(+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)));
          showOnde(d);
          c.send('ronde', d);
        }
        if (hs.onde && hs.t - hs.ondeAt > 1.6) {
          ps.forEach((p) => {
            if (p.down) return;
            if (hs.onde.some((q) => Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 3.2)) Combat.hurt(p.who, 35, o.pos);
          });
          hs.onde = null;
        }
        // reached the phase floor: close the window a little early
        if (ph < 3 && o.hp <= floor + 1 && hs.t < dur - 1.5) hs.t = dur - 1.5;
        if (hs.t > dur) {
          hs.dps++;
          fx('rise');
          if (hs.dps >= 8) return resetEncounter(c, A.enrage);
          newRitual(c);
        }
      }
      Enemies.simulate(dt, ps);
      Enemies.netTick(dt);
      if (ps[0].down && ps[1].down) {
        local.wipe += dt;
        if (local.wipe > 2.2) {
          local.wipe = 0;
          resetEncounter(c, A.wipe);
        }
      } else local.wipe = 0;
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
      if (d.a === 'aegis' && who === 'valet' && hs.cd <= 0 && (x.stage === 4 || x.stage === 2)) {
        hs.cd = 10;
        hs.aegis = 4.5;
        c.set((s) => (s.x.aegis = true));
        fx('dome');
      }
      if (d.a === 'rune' && x.stage === 4 && x.ritual) {
        const activator = x.seer === 'dame' ? 'valet' : 'dame';
        if (who !== activator) return;
        // the press names a slot; the suit on it is resolved here (suits can move)
        const sym = d.slot != null ? (x.perm || [0, 1, 2, 3])[d.slot] : d.i;
        if (sym === x.seq[x.prog]) {
          fx('good');
          const done = x.prog + 1 >= x.seq.length;
          const move = !done && (x.ph || 1) >= 2;
          c.set((s) => {
            s.x.prog += 1;
            s.x.lit = [...s.x.lit, sym];
            if (move) s.x.perm = shuffled(s.x.perm);
          });
          if (move) fx('shuffle');
          if (done) {
            const o = oracle();
            if (o) o.st = 1;
            hs.t = 0;
            hs.gaze = [];
            hs.ondeAt = -1;
            hs.onde = null;
            Enemies.list.forEach((e) => {
              if (e.type === 'pion' || e.type === 'spectre' || e.type === 'tour')
                Enemies.damage(e.id, 999, 1, false);
            });
            c.set((s) => {
              s.x.ritual = false;
              s.x.ms = Math.max(s.x.ms || 0, 2);
            });
            fx('broken');
          }
        } else {
          fx('wrong');
          ['dame', 'valet'].forEach((w) => Combat.hurt(w, 20));
          c.set((s) => {
            s.x.prog = 0;
            s.x.lit = [];
            s.x.seq = newSeq(s.x.seq.length);
          });
        }
      }
    },
    update(c, dt, t) {
      if (!Raid.built) return null;
      const x = c.S.x;
      const q = Raid.rel(Player.body.p);
      Raid.update(dt, t, x, x.seer === c.role);
      Enemies.render(dt, t);
      Raid.setDome(!!x.aegis, c.pos('valet'));
      // blue pads launch only the Valet along a fixed arc onto the next step
      if (local.arc) {
        const ar = local.arc;
        ar.t = Math.min(1, ar.t + dt / 0.75);
        const k = smooth(ar.t);
        const b = Player.body;
        b.p.lerpVectors(ar.from, ar.to, k);
        b.p.y += Math.sin(ar.t * Math.PI) * 2.2;
        b.v.set(0, 0, 0);
        if (ar.t >= 1) {
          local.arc = null;
          Player.mode = 'walk';
        }
      } else if (x.stage === 1 && c.role === 'valet' && Player.body.grounded) {
        const pi = Raid.onPad(Player.body.p);
        if (pi >= 0) {
          local.arc = { from: Player.body.p.clone(), to: Raid.padTo(pi), t: 0 };
          Player.mode = 'frozen';
          Sound.play('djump');
          Fx.burst(Player.body.p.clone(), '#6cc8ff', 40, 4, 0.5, 0);
        }
      }
      // checkpoints
      if (x.stage === 1 && Player.body.grounded) {
        if (c.role === 'dame' && q.z > 20 && q.z < 34 && q.x < -3) local.cp = Raid.P(-7, 2.5, 22);
        if (c.role === 'valet' && q.z > 10.6 && q.z < 46 && q.x > 4 && q.y > 6)
          local.cp = Raid.P(7, 6.6, 12.4);
        if (Raid.onDoor(q)) local.cp = Raid.P(c.role === 'dame' ? -4 : 4, Raid.FLOOR, 55);
        if (!local.objSet && Raid.onDoor(q)) {
          local.objSet = true;
          HUD.objective(L.sealsKit[c.role]);
        }
      }
      if (x.stage === 2 && Player.body.grounded) {
        const z = Raid.zoneOf(q);
        if (z) local.cp = Raid.zoneSpawn(z, c.role);
      }
      if (x.stage >= 3) local.cp = null;
      const o = oracle();
      if (o && x.stage === 4) {
        const ph = x.ph || 1;
        const label = x.ritual
          ? L.phaseName[ph] + ' · ' + x.prog + '/' + x.seq.length
          : A.phase[1] + ' · visez le cœur !';
        HUD.boss(A.boss, o.hp / o.max, label);
      }
      local.aegisCd = Math.max(0, local.aegisCd - dt);
      if (c.role === 'valet') Combat.abil = 1 - local.aegisCd / 10;
      if (
        c.role === 'valet' &&
        (x.stage === 4 || x.stage === 2) &&
        Input.pressed('ability') &&
        local.aegisCd <= 0 &&
        !Combat.down
      ) {
        local.aegisCd = 10;
        c.act({ a: 'aegis' });
      }
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 4 && x.ritual && x.seer !== c.role && !Combat.down) {
        const slot = Raid.nearPillar(q);
        if (slot >= 0) {
          const sym = (x.perm || [0, 1, 2, 3])[slot];
          if (Input.pressed('interact')) c.act({ a: 'rune', slot });
          return ['E', 'Activer ' + Raid.SYMS[sym]];
        }
      }
      return null;
    },
  });
})();
