const Story = (() => {
  const T = CONFIG;
  let S = null;
  let dirty = false;
  let role = 'dame';
  let other = 'valet';
  const local = { phase: null, stage: 0, cab: null, memo: false, endShown: false, held: false };
  const timers = { phase: 0, h: 0, sync: 0, release: 0, inside: 0, cab: 0, heart: 0 };
  let beam = null;
  let beamT = 0;

  const fresh = (from) => ({
    phase: from === 'free' ? 'free' : from === 'hub' ? 'hub' : 'prologue',
    seed: (Math.random() * 1e9) | 0,
    a: { stage: 1, hold: false, att: false, cab: { phase: 'open', t: 0, who: null, y: 0 } },
    h: { t: 0 },
    cafe: from === 'free',
  });

  const set = (fn) => {
    fn(S);
    dirty = true;
  };

  const posOf = (who) => (who === role ? Player.body.p : Remote.pos);
  const near = (a, b, d) => Math.hypot(a.x - b.x, a.z - b.z) < d && Math.abs(a.y - b.y) < 4;

  const beamMesh = () => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 120, 10, 1, true).translate(0, 60, 0),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff5f8a').multiplyScalar(2),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    R.scene.add(m);
    return m;
  };

  const enter = async (ph, first) => {
    const prev = local.phase;
    local.phase = ph;
    if (ph === 'prologue') {
      Sound.mood('calm');
      if (first) {
        const sp = City.spawns[role];
        const yaw = Math.atan2(-sp.x, -sp.z);
        Player.teleport(sp, yaw);
        Cam.snap(sp, yaw);
      }
      Player.killY = -40;
      Player.checkpoint = () => City.spawns[role];
      HUD.objective(T.prologue.objective);
      HUD.visa('Visa · 3 jours');
      BigScreen.show('?', 'BORDERLINE');
    }
    if (ph === 'welcome') {
      HUD.objective('');
      Cam.focus = City.screenPos;
      Sound.play('screen');
      Sound.play('reveal');
      const lines = T.prologue.welcome;
      for (let i = 0; i < lines.length; i++) {
        if (local.phase !== 'welcome') return;
        BigScreen.show(
          lines[i],
          i === 1 ? 'Joueurs : 2' : 'BORDERLINE',
          i === 3 ? '#ff5f8a' : undefined,
        );
        HUD.say(lines[i]);
        await sleep(3200);
      }
      if (local.phase !== 'welcome') return;
      Cam.focus = null;
      HUD.say(T.prologue.abilities[role], T.master, 2600);
    }
    if (ph === 'hub') {
      Cam.focus = null;
      Sound.mood('calm');
      if (first || prev === 'act1') {
        const sp = City.hubSpawn[role];
        Player.teleport(sp, Math.PI / 2);
        Cam.snap(sp, Math.PI / 2);
      }
      Player.killY = -40;
      Player.checkpoint = () => City.hubSpawn[role];
      BigScreen.show('♥ 10', T.prologue.door, '#ff5f8a');
      HUD.objective(T.prologue.door + ' Allez-y ensemble.');
      HUD.visa('Visa · 3 jours');
      City.doorOn = 1;
    }
    if (ph === 'act1') {
      Cam.focus = null;
      if (!first) await fadeTo(true);
      Arena.build(role, S.seed);
      const sp = Arena.spawn(S.a.stage, role);
      Player.teleport(sp, 0);
      Cam.snap(sp, 0);
      Player.killY = Arena.O.y - 25;
      Player.checkpoint = () => Arena.spawn(S.a.stage, role);
      Player.targets = () =>
        role === 'dame' && S.a.stage === 3 ? Arena.rings.map((r) => r.pos) : [];
      R.scene.fog.density = 0.006;
      local.stage = 0;
      Arena.screen.show(T.act1.card, T.act1.title, '#ff5f8a');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.visa('♥ 10 · ' + T.act1.title);
      HUD.say(T.act1.intro);
    }
    if (ph === 'reward') {
      HUD.objective('');
      Sound.mood('calm');
      Sound.play('card');
      Player.mode = 'frozen';
      HUD.card('10\n♥', '♥', T.act1.title, T.act1.sub + ' · réussie');
      await sleep(2600);
      for (const l of T.act1.reward) {
        if (local.phase !== 'reward') return;
        HUD.say(l, T.master, 1400);
      }
    }
    if (ph === 'free') {
      HUD.hideCard();
      if (!first) await fadeTo(true);
      Player.mode = 'walk';
      Player.targets = null;
      R.scene.fog.density = 0.0085;
      const sp = City.hubSpawn[role];
      Player.teleport(sp, Math.PI / 2);
      Cam.snap(sp, -Math.PI / 2);
      Player.killY = -40;
      Player.checkpoint = () => City.hubSpawn[role];
      City.doorOn = 0.25;
      City.showCafe(first);
      City.pillar(true);
      BigScreen.show('♥ 10', 'Carte obtenue · 1 / 52', '#ff5f8a');
      HUD.visa('Visa · 3 jours · ♥ 10');
      if (!first) {
        await sleep(400);
        fadeTo(false);
        Sound.play('reveal');
      }
      HUD.objective('Quelque chose est apparu sur la place.');
      HUD.say('Chaque carte gagnée fait revenir un souvenir.', T.master);
    }
  };

  const stageEnter = (st) => {
    local.stage = st;
    const A = T.act1;
    if (st === 1) {
      HUD.objective(
        role === 'dame'
          ? A.bridge.dame + ' ' + A.bridge.dame2
          : A.bridge.valet + ' ' + A.bridge.valet2,
      );
      Arena.screen.show('Les ponts', 'Ce que l’un ne voit pas, l’autre le voit', '#ff5f8a');
    }
    if (st === 2) {
      HUD.objective(role === 'dame' ? A.winch.dame : A.winch.valet);
      Arena.screen.show('Le treuil', 'Tiens-le. Ne lâche pas.', '#ff5f8a');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(role === 'dame' ? A.winch.grapple : 'Elle arrive. Attends-la de l’autre côté.');
      if (role === 'valet') {
        Player.mode = 'walk';
        Player.hangPos = null;
        Player.teleport(Arena.spawn(3, 'valet'), 0);
      }
      Arena.screen.show('Le grappin', 'Vise les anneaux · F', '#ff5f8a');
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(A.cabins.enter);
      Arena.screen.show('Les cabines', A.cabins.enter, '#ff5f8a');
      Sound.play('reveal');
    }
  };

  const cabEnter = (c) => {
    const A = T.act1.cabins;
    if (c.phase === 'run') {
      Sound.play('door');
      Sound.mood('tense');
      HUD.say(A.rule, T.master, 2500);
      Arena.screen.show('Un seul sortira', 'Appuie pour te sauver', '#ff2a3a');
      HUD.objective(A.rule);
    }
    if (c.phase === 'fail') {
      Sound.play('door');
      Sound.mood('calm');
      HUD.danger(0);
      const msg = c.who === 'dame' ? A.failDame : A.failValet;
      HUD.say(msg, T.master, 2500);
      Arena.screen.show('Raté', msg, '#ff2a3a');
    }
    if (c.phase === 'open' && local.cab && local.cab !== 'open') {
      HUD.objective(A.enter);
      Arena.screen.show('Les cabines', A.enter, '#ff5f8a');
    }
    if (c.phase === 'win') {
      Sound.play('door');
      Sound.mood('calm');
      HUD.danger(0);
      HUD.say(A.win, T.master, 2500);
      Arena.screen.show('♥ 10', A.win, '#ff5f8a');
      HUD.objective('Allez chercher la carte, ensemble.');
      Sound.play('reveal');
    }
  };

  const hostTick = (dt) => {
    const pd = posOf('dame');
    const pv = posOf('valet');
    if (S.phase !== lastPhase) {
      lastPhase = S.phase;
      timers.phase = 0;
    }
    const ph = S.phase;
    timers.phase += dt;
    if (
      ph === 'prologue' &&
      local.phase === 'prologue' &&
      timers.phase > 2 &&
      Remote.fresh &&
      near(pd, pv, 5)
    )
      set((s) => (s.phase = 'welcome'));
    if (ph === 'welcome' && timers.phase > 15.5) set((s) => (s.phase = 'hub'));
    if (ph === 'hub' && near(pd, City.doorPos, 4.5) && near(pv, City.doorPos, 4.5))
      set((s) => {
        s.phase = 'act1';
        s.a.stage = 1;
      });
    if (ph === 'act1' && Arena.built) {
      const a = S.a;
      const qd = Arena.rel(pd);
      const qv = Arena.rel(pv);
      if (a.stage === 1 && Arena.onB(qd) && Arena.onB(qv)) set((s) => (s.a.stage = 2));
      if (a.stage === 2) {
        if (a.att) {
          const holding = a.hold && Arena.nearWinch(qd);
          if (holding) {
            S.h.t = Math.min(1, S.h.t + dt * 0.105);
            timers.release = 0;
          } else {
            timers.release += dt;
            if (timers.release > 2.5) S.h.t = Math.max(0, S.h.t - dt * 0.035);
          }
          if (S.h.t >= 1)
            set((s) => {
              s.a.att = false;
              s.a.hold = false;
              s.a.stage = 3;
            });
        }
        timers.h += dt;
        if (timers.h > 1 / 15) {
          timers.h = 0;
          Net.send('h', S.h);
        }
      }
      if (a.stage === 3 && Arena.onC(qd)) set((s) => (s.a.stage = 4));
      if (a.stage === 4) {
        const c = a.cab;
        if (c.phase === 'open') {
          if (Arena.inCabin(qd, 'dame') && Arena.inCabin(qv, 'valet')) {
            timers.inside += dt;
            if (timers.inside > 1)
              set((s) => {
                s.a.cab = { phase: 'run', t: 0, who: null, y: 0 };
                timers.cab = 0;
              });
          } else timers.inside = 0;
        } else if (c.phase === 'run') {
          c.t += dt;
          timers.sync += dt;
          if (timers.sync > 0.5) {
            timers.sync = 0;
            dirty = true;
          }
          if (c.t >= 22.5) set((s) => (s.a.cab = { phase: 'win', t: 0, who: null, y: 0 }));
        } else if (c.phase === 'fail') {
          timers.cab += dt;
          if (timers.cab > 4.5)
            set((s) => {
              s.a.cab = { phase: 'open', t: 0, who: null, y: 0 };
              timers.inside = 0;
            });
        } else if (c.phase === 'win' && Arena.nearCard(qd) && Arena.nearCard(qv))
          set((s) => {
            s.a.stage = 5;
            s.phase = 'reward';
          });
      }
    }
    if (ph === 'reward' && timers.phase > 9.5)
      set((s) => {
        s.phase = 'free';
        s.cafe = true;
      });
    timers.sync += dt;
    if (dirty || timers.sync > 2) {
      dirty = false;
      timers.sync = 0;
      Net.send('S', S);
      if (S.phase === 'hub' || S.phase === 'act1') save.set({ progress: 'hub' });
      if (S.phase === 'free') save.set({ progress: 'free' });
      apply(S);
    }
  };
  let lastPhase = null;

  const action = (who, d) => {
    if (!S || S.phase !== 'act1') return;
    const a = S.a;
    if (d.a === 'winch' && who === 'dame' && a.stage === 2) set((s) => (s.a.hold = !!d.on));
    if (d.a === 'attach' && who === 'valet' && a.stage === 2 && !a.att)
      set((s) => (s.a.att = true));
    if (d.a === 'button' && a.stage === 4 && a.cab.phase === 'run')
      set((s) => {
        s.a.cab = {
          phase: 'fail',
          t: 0,
          who,
          y: Arena.ceilingFor(who === 'dame' ? 'valet' : 'dame'),
        };
        timers.cab = 0;
      });
  };

  const apply = (ns) => {
    const first = local.phase === null;
    S = ns;
    if (S.phase !== local.phase) enter(S.phase, first);
    if (S.phase === 'act1' && Arena.built) {
      if (S.a.stage !== local.stage && S.a.stage <= 4) stageEnter(S.a.stage);
      if (S.a.cab.phase !== local.cab) {
        cabEnter(S.a.cab);
        local.cab = S.a.cab.phase;
      }
    }
    if (S.cafe && !City.cafeShown) City.showCafe(true);
  };

  const act = (d) => {
    if (Net.isHost) action(role, d);
    else Net.send('act', d);
  };

  return {
    get S() {
      return S;
    },
    patch(fn) {
      if (Net.isHost && S) set(fn);
    },
    init(myRole, from) {
      role = myRole;
      other = role === 'dame' ? 'valet' : 'dame';
      beam = beamMesh();
      Net.on('S', (ns) => !Net.isHost && apply(ns));
      Net.on('h', (h) => {
        if (!Net.isHost && S) S.h = h;
      });
      Net.on('act', (d) => Net.isHost && action(other, d));
      Net.on('call', (p) => {
        Sound.play('call', V3(p[0], p[1] + 1.5, p[2]));
        beam.position.set(p[0], p[1], p[2]);
        beamT = 4;
      });
      Net.on('connect', () => Net.isHost && S && Net.send('S', S));
      if (Net.isHost) {
        S = fresh(from);
        dirty = true;
      }
    },
    update(dt, t) {
      if (Net.isHost && S) hostTick(dt);
      if (!S) return;
      const p = Player.body.p;
      const rp = Remote.pos;

      if (Input.pressed('call')) {
        Net.send('call', [p.x, p.y, p.z]);
        Sound.play('call');
      }
      beamT = Math.max(0, beamT - dt);
      beam.material.opacity = Math.min(1, beamT) * 0.55;
      beam.visible = beamT > 0;

      let prompt = null;
      if (S.phase === 'act1' && Arena.built) {
        const a = S.a;
        const q = Arena.rel(p);
        if (a.stage === 2) {
          if (role === 'dame' && Arena.nearWinch(q)) {
            const held = Input.held('interact');
            prompt = ['E', held ? 'Tiens bon…' : 'Tenir le treuil (maintenir)', true];
            if (held !== local.held) {
              local.held = held;
              act({ a: 'winch', on: held });
            }
            if (held && a.att && Math.random() < dt * 2) Sound.play('creak');
          } else if (local.held) {
            local.held = false;
            act({ a: 'winch', on: false });
          }
          if (role === 'valet' && !a.att && Arena.nearHarness(q)) {
            prompt = ['E', 'S’accrocher au harnais'];
            if (Input.pressed('interact')) act({ a: 'attach' });
          }
          if (role === 'valet' && a.att) {
            const hp = Arena.harnessPos(S.h.t);
            Player.mode = 'hang';
            Player.hangPos = V3(hp.x + Math.sin(t * 1.3) * 0.15, hp.y - 2.45, hp.z);
          }
        }
        if (a.stage === 4) {
          const c = a.cab;
          if (c.phase === 'run') {
            if (Arena.nearButton(q, role)) {
              prompt = ['E', 'Me sauver'];
              if (Input.pressed('interact')) act({ a: 'button' });
            }
            const k = clamp(c.t / 20, 0, 1);
            HUD.danger(0.2 + k * 0.6);
            Cam.shake = Math.max(Cam.shake, 0.02 + k * 0.05);
            timers.heart -= dt;
            if (timers.heart <= 0) {
              timers.heart = lerp(1.1, 0.42, k);
              Sound.play('heart', 0.6 + k * 0.6);
              if (Math.random() < 0.5) Sound.play('rumble', 0.5 + k);
            }
            if (Net.isHost === false) c.t += dt;
          }
        }
      }
      if (S.phase === 'free' && City.cafeShown && !local.memo && near(p, City.cafePos, 4)) {
        prompt = ['E', 'Regarder'];
        if (Input.pressed('interact')) {
          local.memo = true;
          const pl = T.places[0];
          City.pillar(false);
          HUD.memory(pl.tag, pl.name, pl.text).then(() => {
            HUD.objective(T.end.title + ' · ' + T.end.text);
            HUD.say(T.end.text, T.master, 3500);
            BigScreen.show(T.end.title, 'À suivre', '#e8bd84');
          });
        }
      }
      if (prompt && prompt[0]) HUD.prompt(prompt[0], prompt[1], prompt[2]);
      else HUD.prompt(null);

      const met = S.phase !== 'prologue';
      const d = Math.hypot(p.x - rp.x, p.y - rp.y, p.z - rp.z);
      HUD.partner(rp, R.camera, met && Remote.has && d > 6, Math.round(d) + ' m');
      Remote.visible = true;
      if (Sound.hasVoice) {
        const g = S.phase === 'act1' ? 1 : clamp(1 - (d - 6) / 60, 0, 1);
        Sound.voicePos(V3(rp.x, rp.y + 1.6, rp.z), g);
      }
      City.update(t, dt);
      BigScreen.update(dt, t);
      Arena.update(dt, t, S);
    },
  };
})();
