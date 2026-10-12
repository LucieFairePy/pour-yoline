const Story = (() => {
  const PH = {};
  const T = CONFIG;
  let S = null;
  let dirty = false;
  let role = 'dame';
  let other = 'valet';
  // who you are (fixed) vs which kit you carry (changes with the chapter)
  let me = 'yoline';
  let mate = 'william';
  const BASE = { yoline: 'dame', william: 'valet' };
  // chapters where the kits are swapped, so each player gets every kind of role
  const SWAP = new Set(['soleil', 'donjon', 'portes', 'act5']);
  const kitOf = (who, phase) => {
    const k = BASE[who];
    return SWAP.has(phase) ? (k === 'dame' ? 'valet' : 'dame') : k;
  };
  const whoOf = (kit) => (kitOf(me, local.phase) === kit ? me : mate);
  const P_ = (who) => T.players[who];
  // {mate} {me} {il} {Il} {lui} {Lui} {le} {e} (my agreement) {pe} (partner agreement)
  const fmt = (s) => {
    if (typeof s !== 'string' || s.indexOf('{') < 0) return s;
    const m = P_(mate);
    const fem = m.fem;
    const map = {
      mate: m.name,
      me: P_(me).name,
      il: fem ? 'elle' : 'il',
      Il: fem ? 'Elle' : 'Il',
      lui: fem ? 'elle' : 'lui',
      Lui: fem ? 'Elle' : 'Lui',
      le: fem ? 'la' : 'le',
      e: P_(me).fem ? 'e' : '',
      pe: fem ? 'e' : '',
    };
    return s.replace(/\{(\w+)\}/g, (x, k) => (k in map ? map[k] : x));
  };
  let lastPhase = null;
  let beam = null;
  let beamT = 0;
  const timers = { phase: 0, sync: 0 };
  const local = { phase: null };
  const CHECKPOINTS = [
    'prologue',
    'city',
    'soleil',
    'donjon',
    'garde',
    'portes',
    'balade',
    'raid',
    'act3',
    'act5',
    'final',
  ];
  // saves made before the four new chapters used chapters 0..4 = h10, c4, sK, d9, act3
  const OLD_CHAPTER = [0, 1, 3, 5, 6];
  const PHASE_CHAPTER = {
    soleil: 1,
    donjon: 3,
    garde: 4,
    portes: 5,
    balade: 6,
    raid: 7,
    act3: 8,
    act5: 8,
    final: 8,
  };

  const set = (fn) => {
    fn(S);
    dirty = true;
  };

  const near = (a, b, d) => Math.hypot(a.x - b.x, a.z - b.z) < d && Math.abs(a.y - b.y) < 4;

  const fresh = (from) => {
    let p = from;
    if (p === 'hub') p = { phase: 'city', chapter: 0 };
    if (p === 'free') p = { phase: 'city', chapter: 1 };
    const s = {
      phase: 'prologue',
      seed: (Math.random() * 1e9) | 0,
      chapter: 0,
      clues: [],
      seen: [],
      x: {},
    };
    if (p && typeof p === 'object' && CHECKPOINTS.includes(p.phase)) {
      s.phase = p.phase;
      s.chapter = p.v >= 2 ? p.chapter || 0 : (OLD_CHAPTER[p.chapter || 0] ?? 8);
      if (PHASE_CHAPTER[s.phase] != null) s.chapter = PHASE_CHAPTER[s.phase];
      s.clues = p.clues || [];
      s.seen = p.seen || [];
    }
    s.x = PH[s.phase] && PH[s.phase].init ? PH[s.phase].init(s) : {};
    return s;
  };

  const ctx = {
    T,
    local: {},
    get S() {
      return S;
    },
    get role() {
      return role;
    },
    get other() {
      return other;
    },
    get phaseT() {
      return timers.phase;
    },
    set,
    near,
    touch() {
      dirty = true;
    },
    pos: (who) => (who === role ? Player.body.p : Remote.pos),
    remoteState: () => Remote.state,
    act(d) {
      if (Net.isHost) action(role, d);
      else Net.send('act', d);
    },
    goto(phase, patch) {
      set((s) => {
        s.phase = phase;
        s.x = PH[phase] && PH[phase].init ? PH[phase].init(s) : {};
        if (patch) patch(s);
      });
    },
    spawn(pos, yaw = 0) {
      Player.mode = 'walk';
      Player.hangPos = null;
      Player.teleport(pos, yaw);
      Cam.snap(pos, yaw);
    },
    fog(d) {
      R.scene.fog.density = d;
    },
    send(t, d) {
      Net.send(t, d);
    },
  };

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

  const setKit = (ph, announce) => {
    const was = role;
    role = kitOf(me, ph);
    other = role === 'dame' ? 'valet' : 'dame';
    if (role === was) return;
    Player.setKit(role);
    Remote.setKit(other);
    HUD.role(role);
    if (announce) {
      Sound.play('reveal');
      HUD.say(fmt(T.kits.swap[role]), T.master, 4200);
    }
  };

  const enter = (ph, first) => {
    const prev = local.phase;
    if (prev && PH[prev] && PH[prev].exit) PH[prev].exit(ctx, ph);
    setKit(ph, !first || SWAP.has(ph));
    local.phase = ph;
    HUD.prompt(null);
    HUD.danger(0);
    Cam.focus = null;
    if (PH[ph] && PH[ph].enter) PH[ph].enter(ctx, first, prev);
  };

  const action = (who, d) => {
    if (!S) return;
    if (d.a === 'clue' && !S.clues.includes(d.id)) set((s) => s.clues.push(d.id));
    if (d.a === 'seen' && !S.seen.includes(d.id)) set((s) => s.seen.push(d.id));
    const def = PH[S.phase];
    if (def && def.action) def.action(ctx, who, d);
  };

  const hostTick = (dt) => {
    if (S.phase !== lastPhase) {
      lastPhase = S.phase;
      timers.phase = 0;
    }
    timers.phase += dt;
    const def = PH[S.phase];
    if (def && def.host && local.phase === S.phase) def.host(ctx, dt);
    timers.sync += dt;
    if (dirty || timers.sync > 2) {
      dirty = false;
      timers.sync = 0;
      Net.send('S', S);
      if (CHECKPOINTS.includes(S.phase) && S.phase !== 'prologue')
        save.set({
          progress: { v: 2, phase: S.phase, chapter: S.chapter, clues: S.clues, seen: S.seen },
        });
      apply(S);
    }
  };

  let lastClues = null;
  const apply = (ns) => {
    const first = local.phase === null;
    S = ns;
    if (lastClues && S.clues.length > lastClues.length) {
      const id = S.clues.find((c) => !lastClues.includes(c));
      if (id) {
        Sound.play('reveal');
        HUD.say(T.clues[id], 'Cassette', 4200);
      }
    }
    lastClues = S.clues.slice();
    Clues.sync(S.clues);
    if (S.phase !== local.phase) enter(S.phase, first);
    const def = PH[S.phase];
    if (def && def.apply) def.apply(ctx);
  };

  return {
    register(name, def) {
      PH[name] = def;
    },
    get S() {
      return S;
    },
    get role() {
      return role;
    },
    get me() {
      return me;
    },
    get mate() {
      return mate;
    },
    name: (kit) => T.players[whoOf(kit)].name,
    fem: (kit) => T.players[whoOf(kit)].fem,
    fmt,
    kitOf,
    ctx,
    patch(fn) {
      if (Net.isHost && S) set(fn);
    },
    goto(phase, patch) {
      if (Net.isHost && S) ctx.goto(phase, patch);
    },
    init(who, from) {
      me = who;
      mate = who === 'yoline' ? 'william' : 'yoline';
      role = BASE[me];
      other = role === 'dame' ? 'valet' : 'dame';
      beam = beamMesh();
      Net.on('S', (ns) => !Net.isHost && apply(ns));
      Net.on('act', (d) => Net.isHost && action(other, d));
      Net.on('call', (p) => {
        const far = PH[S && S.phase] && PH[S.phase].farCall;
        Sound.play('call', far ? null : V3(p[0], p[1] + 1.5, p[2]));
        if (S && S.phase === 'prologue') return;
        beam.position.set(p[0], p[1], p[2]);
        beamT = 4;
      });
      Net.on('connect', () => Net.isHost && S && Net.send('S', S));
      Object.values(PH).forEach((def) => {
        if (def.net)
          Object.entries(def.net).forEach(([k, fn]) => Net.on(k, (d) => S && fn(ctx, d)));
      });
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
      const def = PH[S.phase] || {};

      if (Input.pressed('call')) {
        Net.send('call', [p.x, p.y, p.z]);
        Sound.play('call');
      }
      beamT = Math.max(0, beamT - dt);
      beam.material.opacity = Math.min(1, beamT) * 0.55;
      beam.visible = beamT > 0;

      let prompt = local.phase === S.phase && def.update ? def.update(ctx, dt, t) : null;
      if (!prompt) {
        const c = Clues.prompt(p);
        if (c) {
          prompt = ['E', 'Ramasser la cassette'];
          if (Input.pressed('interact')) ctx.act({ a: 'clue', id: c });
        }
      }
      if (prompt && prompt[0]) HUD.prompt(prompt[0], prompt[1], prompt[2]);
      else HUD.prompt(null);

      const d = Math.hypot(p.x - rp.x, p.y - rp.y, p.z - rp.z);
      const showPartner = def.partner ? def.partner(ctx) : true;
      HUD.partner(rp, R.camera, showPartner && Remote.has && d > 6, Math.round(d) + ' m');
      Remote.visible = def.hideRemote ? !def.hideRemote(ctx) : true;
      if (Sound.hasVoice) {
        const g = def.voice ? def.voice(ctx, d) : clamp(1 - (d - 6) / 60, 0, 1);
        Sound.voicePos(V3(rp.x, rp.y + 1.6, rp.z), g);
      }
      HUD.clues(S.clues.length, Object.keys(T.clues).length);
      City.update(t, dt);
      BigScreen.update(dt, t);
      Clues.update(dt, t);
      Fx.update(dt);
    },
  };
})();
