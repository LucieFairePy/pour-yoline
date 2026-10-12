(() => {
  const T = CONFIG;
  const G = T.garde;
  const local = { stage: 0, laser: 0, wipe: 0, bossSeen: false };

  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return {
        who,
        pos: c.pos(who),
        down: me ? Combat.down : !!rs.down,
        cloak: me ? Combat.cloak > 0 : !!rs.cloak,
      };
    });

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(G.entrance);
      Garde.screen.show(G.card, G.title, '#ff5f8a');
    }
    if (st === 2) {
      HUD.objective(G.wave1);
      Garde.screen.show('Vague 1', 'Les Pions', '#ff2a3a');
      Sound.mood('tense');
      HUD.say(G.hint[r], T.master, 3600);
    }
    if (st === 3) {
      HUD.objective(G.wave2);
      Garde.screen.show('Vague 2', 'Les Tours ont un bouclier', '#ff2a3a');
      HUD.say(G.towers, T.master, 3200);
    }
    if (st === 4) {
      HUD.objective(G.gate);
      Garde.screen.show('Le Roi de Pique', 'Entrez dans l’arène', '#ffcf8a');
      Sound.play('reveal');
    }
    if (st === 5) {
      HUD.objective(G.phase1Obj[r]);
      Garde.screen.show('♠ R', G.boss, '#ff2a3a');
    }
    if (st === 6) {
      HUD.objective(G.victory);
      HUD.boss(null);
      Garde.screen.show('♠ R', 'Victoire', '#ffcf8a');
      Sound.mood('calm');
      Sound.play('card');
    }
    if (prev && st === 4) c.spawn(Garde.spawn(4, r), 0);
  };

  Story.register('garde', {
    init: () => ({ stage: 1 }),
    voice: () => 1,
    net: {
      en: (c, d) => !Net.isHost && Enemies.unpack(d),
      tel: (c, d) => Enemies.telegraph(V3(d[0], d[1], d[2]), d[3], d[4]),
      bossfx: (c, k) => {
        if (k === 'slam') {
          Sound.play('slam');
          Cam.shake = 0.35;
        }
        if (k === 'shield') {
          Sound.play('shieldDown');
          HUD.say(G.shieldDown, G.boss, 2200);
        }
        if (k === 'crystal') {
          Sound.play('shatter');
          HUD.say(G.crystal, G.boss, 2200);
        }
        if (k.startsWith('phase')) {
          Sound.play('roar');
          HUD.say(G[k], G.boss, 2600);
        }
      },
      wipe: (c) => {
        Combat.reset();
        c.spawn(Garde.spawn(Story.S.x.stage, c.role), 0);
        HUD.say(G.wipe, T.master, 2600);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Garde.build();
      Boss.plates.dame = Garde.plates.dame.pos;
      Boss.plates.valet = Garde.plates.valet.pos;
      Enemies.clear();
      Boss.reset();
      local.stage = 0;
      c.spawn(Garde.spawn(c.S.x.stage, c.role), 0);
      Player.killY = Garde.O.y - 25;
      Player.checkpoint = () => Garde.spawn(Story.S.x.stage, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.009);
      Combat.enable(true);
      HUD.visa('♠ R · ' + G.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(G.intro, T.master, 3600);
      this.apply(c);
    },
    exit() {
      Combat.enable(false);
      Enemies.clear();
      HUD.boss(null);
      Player.avatar.ghost(0);
    },
    apply(c) {
      if (!Garde.built) return;
      if (c.S.x.stage !== local.stage) stageEnter(c, c.S.x.stage);
    },
    host(c, dt) {
      if (!Garde.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = Garde.rel(ps[0].pos);
      const qv = Garde.rel(ps[1].pos);
      if (x.stage === 1 && Garde.inRoom(qd) && Garde.inRoom(qv)) {
        Garde.wave(1).forEach((p) => Enemies.spawn('pion', p));
        c.set((s) => (s.x.stage = 2));
      }
      if (x.stage === 2 && Enemies.alive() === 0) {
        Garde.wave(2).forEach((p) => Enemies.spawn('pion', p));
        Garde.towers().forEach((p) => Enemies.spawn('tour', p));
        c.set((s) => (s.x.stage = 3));
      }
      if (x.stage === 3 && Enemies.alive() === 0) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4 && Garde.inArena(qd) && Garde.inArena(qv)) {
        Enemies.spawn('roi', Garde.bossPos(), { phase: 1 });
        Boss.reset();
        c.set((s) => (s.x.stage = 5));
      }
      if (x.stage === 5 && !Enemies.boss()) c.set((s) => (s.x.stage = 6));
      if (x.stage === 6) {
        local.win = (local.win || 0) + dt;
        if (local.win > 6) c.goto('reward', (s) => (s.x.card = 'sK'));
      }
      if (x.stage >= 2 && x.stage <= 5) {
        Enemies.simulate(dt, ps);
        Enemies.netTick(dt);
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2.2) {
            local.wipe = 0;
            const bossFight = x.stage === 5;
            Enemies.clear();
            Boss.reset();
            Combat.reset();
            c.spawn(Garde.spawn(x.stage, c.role), 0);
            HUD.say(G.wipe, T.master, 2600);
            c.send('wipe');
            if (bossFight) Enemies.spawn('roi', Garde.bossPos(), { phase: 1 });
            else {
              c.set((s) => (s.x.stage = 2));
              Garde.wave(1).forEach((p) => Enemies.spawn('pion', p));
            }
          }
        } else local.wipe = 0;
      } else Enemies.netTick(dt);
    },
    action(c, who, d) {
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
      if (d.a === 'switch') Boss.switchPressed(Enemies.boss());
    },
    update(c, dt, t) {
      if (!Garde.built) return null;
      const x = c.S.x;
      const boss = Enemies.boss();
      Garde.update(dt, t, x.stage, boss && boss.phase === 3);
      Enemies.render(dt, t);
      if (boss && (boss.phase || 1) !== local.phase) {
        local.phase = boss.phase || 1;
        const n = local.phase;
        HUD.objective(n === 1 ? G.phase1Obj[c.role] : n === 2 ? G.phase2Obj[c.role] : G.phase3Obj);
      }
      if (boss) {
        const ph = boss.phase || 1;
        const tag =
          ph === 1
            ? boss.shield
              ? 'Bouclier'
              : 'Vulnérable'
            : ph === 2
              ? boss.stun > 0
                ? 'Étourdi · vise le cœur'
                : 'Armure'
              : boss.crystal
                ? 'Cristal · tenez les plaques'
                : 'Vulnérable';
        HUD.boss(G.boss, boss.hp / boss.max, 'Phase ' + ph + ' · ' + tag);
      }
      const q = Garde.rel(Player.body.p);
      local.laser -= dt;
      if (Garde.laserHit(q) && Combat.cloak <= 0 && local.laser <= 0 && !Combat.down) {
        local.laser = 0.6;
        Combat.apply(25);
        Player.body.p.z -= 1.6;
        Player.body.v.set(0, 4, -6);
        Sound.play('trap');
        HUD.say(G.laser, T.master, 1800);
      }
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 5 && boss && boss.phase === 1 && Garde.atSwitch(q)) {
        if (Input.pressed('interact')) c.act({ a: 'switch' });
        return ['E', 'Désactiver le bouclier'];
      }
      return null;
    },
  });
})();
