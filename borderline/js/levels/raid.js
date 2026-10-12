(() => {
  const T = CONFIG;
  const A = T.raid;
  const local = { stage: 0, cp: null, ritualKey: '', aegisCd: 0, win: 0, wipe: 0, abilLabel: null };
  const hs = { t: 0, add: 4, gazeAt: -1, gazeHit: -1, aegis: 0, cd: 0, dps: 0, final: false };

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

  const fx = (k) => {
    onFx(k);
    Net.send('rfx', k);
  };
  const onFx = (k) => {
    const c = Story.ctx;
    if (!Story.S || Story.S.phase !== 'raid') return;
    if (k === 'good') Sound.play('rune', true);
    if (k === 'wrong') {
      Sound.play('rune', false);
      Cam.shake = 0.25;
      HUD.say(A.wrong, A.boss, 2200);
    }
    if (k === 'broken') {
      Sound.play('shatter');
      Sound.play('roar');
      HUD.say(A.broken, T.master, 2600);
      Raid.screen.show(A.phase[1], A.boss, '#ffcf8a');
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
      Fx.burst(Raid.oraclePos().add(V3(0, 4, 0)), '#7cf0c8', 300, 14, 1, 0);
    }
    if (k === 'rise') {
      Sound.play('reveal');
      HUD.say(A.rise, T.master, 2200);
    }
    if (k === 'dome') Sound.play('dome');
  };
  Net.on('rfx', onFx);

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

  const newRitual = (c, final) => {
    const o = oracle();
    if (o) o.st = final ? 2 : 0;
    hs.t = 0;
    hs.add = 5;
    hs.gazeAt = hs.gazeHit = -1;
    c.set((s) => {
      s.x.ritual = true;
      s.x.seq = newSeq(final ? 4 : 3);
      s.x.prog = 0;
      s.x.lit = [];
      s.x.seer = final ? 'valet' : 'dame';
    });
  };

  const resetEncounter = (c, msg) => {
    Enemies.clear();
    Enemies.netTick(1);
    Combat.reset();
    Object.assign(hs, {
      t: 0,
      add: 4,
      gazeAt: -1,
      gazeHit: -1,
      aegis: 0,
      cd: 0,
      dps: 0,
      final: false,
    });
    c.set((s) => {
      s.x.stage = 2;
      s.x.ritual = false;
      s.x.aegis = false;
      s.x.seq = [];
      s.x.lit = [];
      s.x.prog = 0;
    });
    c.spawn(Raid.spawn(2, c.role), 0);
    HUD.say(msg, T.master, 2800);
    c.send('rwipe', msg);
  };

  const stageEnter = (c, st) => {
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(A.climb[r]);
      Raid.screen.show(A.card, A.title, '#7cf0c8');
    }
    if (st === 2) {
      HUD.objective('Entrez dans l’arène. Ensemble.');
      Sound.play('door');
      Raid.screen.show(A.boss, 'Le Caveau', '#7cf0c8');
    }
    if (st === 3) {
      Sound.mood('tense');
      HUD.say(A.roles[r], T.master, 4200);
    }
    if (st === 5) {
      HUD.boss(null);
      HUD.objective(T.portes.card.replace('♦ 9', A.card));
      HUD.say(A.victory, T.master, 2800);
      Sound.mood('calm');
      Sound.play('card');
      Raid.screen.show(A.card, 'Victoire', '#ffcf8a');
    }
  };

  Story.register('raid', {
    init: () => ({
      stage: 1,
      ritual: false,
      seq: [],
      prog: 0,
      lit: [],
      seer: 'dame',
      aegis: false,
    }),
    voice: () => 1,
    net: {
      rwipe: (c, msg) => {
        Combat.reset();
        c.spawn(Raid.spawn(2, c.role), 0);
        HUD.say(msg || A.wipe, T.master, 2800);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Raid.build();
      Enemies.clear();
      local.stage = 0;
      local.cp = null;
      c.spawn(Raid.spawn(c.S.x.stage, c.role), 0);
      Player.killY = Raid.O.y - 14;
      Player.checkpoint = () => local.cp || Raid.spawn(Story.S.x.stage, c.role);
      Player.targets = () => (c.role === 'dame' && Story.S.x.stage === 1 ? Raid.rings() : []);
      City.mood({ dark: 0.35 });
      c.fog(0.006);
      Combat.enable(true);
      Combat.noCloak = true;
      const lab = $('vAbil').querySelector('span');
      local.abilLabel = lab.textContent;
      lab.textContent = 'Égide';
      Sound.mood('calm');
      HUD.visa(A.card + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3800);
      this.apply(c);
    },
    exit() {
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
      const key = x.stage + '|' + x.ritual + '|' + x.seq.join() + '|' + x.prog + '|' + x.seer;
      if (key !== local.ritualKey) {
        local.ritualKey = key;
        if (x.stage === 3 && x.ritual) HUD.objective(ritualText(c));
        if (x.stage === 3 && !x.ritual) HUD.objective('L’Oracle est brisé : tirez, frappez !');
      }
    },
    host(c, dt) {
      if (!Raid.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = Raid.rel(ps[0].pos);
      const qv = Raid.rel(ps[1].pos);
      if (x.stage === 1 && Raid.onDoor(qd) && Raid.onDoor(qv)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && Raid.inArena(qd) && Raid.inArena(qv)) {
        const o = Enemies.spawn('oracle', Raid.oraclePos(), { st: 0, atk: 5 });
        o.pos.y += 9;
        c.set((s) => (s.x.stage = 3));
        newRitual(c, false);
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
      if (x.stage !== 3) {
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
      if (x.ritual) {
        hs.add -= dt;
        if (hs.add <= 0 && Enemies.alive('pion') + Enemies.alive('spectre') < 5) {
          hs.add = 8;
          const seerPos = x.seer === 'dame' ? ps[0].pos : ps[1].pos;
          const center = Raid.oraclePos();
          for (let k = 0; k < 2; k++) {
            const a = Math.random() * TAU;
            const p = seerPos.clone().add(V3(Math.cos(a) * 8, 0, Math.sin(a) * 8));
            const d = Math.hypot(p.x - center.x, p.z - center.z);
            if (d > 18) p.lerp(center, (d - 16) / d);
            p.y = center.y;
            Enemies.spawn(hs.dps >= 1 && k === 1 ? 'spectre' : 'pion', p);
          }
        }
      } else {
        const dur = hs.final ? 16 : 14;
        if (hs.gazeAt < 0 && hs.t > 5) {
          hs.gazeAt = hs.t;
          fx('gaze');
        }
        if (hs.gazeAt >= 0 && hs.gazeHit < 0 && hs.t - hs.gazeAt > 2.6) {
          hs.gazeHit = hs.t;
          fx('gazeHit');
          const vp = ps[1].pos;
          ps.forEach((p) => {
            if (p.down) return;
            const covered = x.aegis && !ps[1].down && Raid.domeCovers(p.pos, vp);
            if (!covered) Combat.hurt(p.who, 70, o.pos);
          });
        }
        if (hs.t > dur) {
          hs.dps++;
          fx('rise');
          if (hs.dps >= 6) return resetEncounter(c, A.enrage);
          hs.final = hs.final || o.hp / o.max < 0.3;
          newRitual(c, hs.final);
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
      if (d.a === 'aegis' && who === 'valet' && hs.cd <= 0 && x.stage === 3) {
        hs.cd = 10;
        hs.aegis = 4.5;
        c.set((s) => (s.x.aegis = true));
        fx('dome');
      }
      if (d.a === 'rune' && x.stage === 3 && x.ritual) {
        const activator = x.seer === 'dame' ? 'valet' : 'dame';
        if (who !== activator) return;
        if (d.i === x.seq[x.prog]) {
          fx('good');
          const done = x.prog + 1 >= x.seq.length;
          c.set((s) => {
            s.x.prog += 1;
            s.x.lit = [...s.x.lit, d.i];
          });
          if (done) {
            const o = oracle();
            if (o) o.st = 1;
            hs.t = 0;
            hs.gazeAt = hs.gazeHit = -1;
            Enemies.list.forEach((e) => {
              if (e.type === 'pion' || e.type === 'spectre') Enemies.damage(e.id, 999, 1, false);
            });
            c.set((s) => (s.x.ritual = false));
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
      // ascent checkpoints
      if (x.stage === 1 && Player.body.grounded) {
        if (c.role === 'dame' && q.z > 20 && q.z < 34 && q.x < -3) local.cp = Raid.P(-7, 2.5, 22);
        if (c.role === 'valet' && q.z > 10.6 && q.z < 46 && q.x > 4 && q.y > 6)
          local.cp = Raid.P(7, 6.6, 12.4);
      }
      if (x.stage >= 2) local.cp = null;
      const o = oracle();
      if (o && x.stage === 3) {
        const label = x.ritual
          ? (x.seer === 'valet' ? A.phase[2] : A.phase[0]) + ' · ' + x.prog + '/' + x.seq.length
          : A.phase[1] + ' · tirez !';
        HUD.boss(A.boss, o.hp / o.max, label);
      }
      local.aegisCd = Math.max(0, local.aegisCd - dt);
      if (c.role === 'valet') Combat.abil = 1 - local.aegisCd / 10;
      if (
        c.role === 'valet' &&
        x.stage === 3 &&
        Input.pressed('ability') &&
        local.aegisCd <= 0 &&
        !Combat.down
      ) {
        local.aegisCd = 10;
        c.act({ a: 'aegis' });
      }
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 3 && x.ritual && x.seer !== c.role && !Combat.down) {
        const i = Raid.nearPillar(q);
        if (i >= 0) {
          if (Input.pressed('interact')) c.act({ a: 'rune', i });
          return ['E', 'Activer ' + Raid.SYMS[i]];
        }
      }
      return null;
    },
  });
})();
