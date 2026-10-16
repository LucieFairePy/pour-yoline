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
    return SWAP.has(phase) || Trials.swap(phase) ? (k === 'dame' ? 'valet' : 'dame') : k;
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
  // v2 order was h10 s3 c4 s7 sK d9 h2 cR; v3 plays the numbers first: h10 s3 c4 s7 d9 h2 sK cR
  const V2_CHAPTER = [0, 1, 2, 3, 4, 4, 5, 6, 8];
  const PHASE_CHAPTER = {
    soleil: 1,
    donjon: 3,
    portes: 4,
    balade: 5,
    garde: 6,
    raid: 7,
    act3: 8,
    act5: 8,
    final: 8,
  };

  // a cinematic (phase cut) is a checkpoint too: reloading during it plays it again,
  // once it is over the save has moved on and it never replays
  // so is a reward screen: reloading during it shows it again, without a second card
  const checkpoint = (ph) =>
    CHECKPOINTS.includes(ph) || ph === 'cut' || ph === 'reward' || !!Trials.byPhase[ph];

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
      cards: [],
      done: [],
      x: {},
    };
    if (p && typeof p === 'object' && checkpoint(p.phase)) {
      s.phase = p.phase;
      if (p.v >= 4) s.done = (p.done || []).filter((id) => Trials.byId[id]);
      else {
        // older saves counted chapters in a fixed order
        let ch = p.chapter || 0;
        if (!(p.v >= 2)) ch = OLD_CHAPTER[ch] ?? 8;
        if (!(p.v >= 3)) ch = V2_CHAPTER[ch] ?? 8;
        if (PHASE_CHAPTER[s.phase] != null) ch = PHASE_CHAPTER[s.phase];
        s.done = Trials.fromChapter(ch);
      }
      s.chapter = s.done.length;
      s.clues = (p.clues || []).filter((id) => CONFIG.clues[id]);
      s.seen = p.seen || [];
      // one card per épreuve done, plus the story cards already won (before v5 the finale gave
      // ♦ R and ♥ D, now its aces; the old ids are épreuve cards and must not count as aces)
      const OLD_STORY = { dR: ['d1', 's1', 'c1'], hD: ['h1'], J: ['J'] };
      const story =
        p.v >= 5
          ? (p.cards || []).filter((id) => Trials.storyPhaseOf(id))
          : (p.cards || []).flatMap((id) => OLD_STORY[id] || []);
      s.cards = [...new Set([...Trials.cardsOf(s.done), ...story])];
    }
    s.x = PH[s.phase] && PH[s.phase].init ? PH[s.phase].init(s) : {};
    if (s.phase === 'cut') {
      if (p && p.cut && PH[p.after]) Object.assign(s.x, { cut: p.cut, after: p.after });
      else {
        s.phase = 'city';
        s.x = {};
      }
    }
    if (s.phase === 'reward') {
      if (p && Trials.byId[p.card]) s.x = { card: p.card };
      else {
        s.phase = 'city';
        s.x = {};
      }
    }
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
    // a cinematic keeps the kits of the épreuve before it: the next one announces its own
    if (ph === 'cut') return;
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

  // phases passed through between two épreuves of the same table (see enter)
  const PASS = new Set(['city', 'reward', 'cut']);
  const shared = (w) => Object.values(PH).filter((d) => d.world === w).length > 1;
  let held = null;
  const enter = (ph, first) => {
    const prev = local.phase;
    if (prev && PH[prev] && PH[prev].exit) PH[prev].exit(ctx, ph);
    // a level that names its world (def.world) unloads it once another phase is entered, unless
    // that phase plays in the same world; the city always stays. A world shared by several
    // phases (a table of the Cour) waits through the city, the reward and the films, and goes
    // once another épreuve is entered. The shared state S is not touched: entering again builds
    // the world anew (js/world/LIFECYCLE.md)
    const was = prev && PH[prev] && PH[prev].world;
    const now = PH[ph] && PH[ph].world;
    if (was && was !== now) {
      if (PASS.has(ph) && shared(was)) held = was;
      else Life.unload(was);
    }
    if (held && held !== now && !PASS.has(ph)) Life.unload(held);
    if (held && (held === now || !PASS.has(ph))) held = null;
    // the last lines of a level don't spill into the next one (the reward keeps its win line)
    if (prev && ph !== 'reward') HUD.hush();
    // a phase never inherits held hands or a seat from the one before
    Player.handPose = false;
    Remote.handPose = false;
    Avatar.hold.on = false;
    if (Player.mode === 'sit') Player.mode = 'walk';
    setKit(ph, !first || SWAP.has(ph));
    local.phase = ph;
    HUD.prompt(null);
    HUD.goal(null, null, false);
    HUD.danger(0);
    Cam.focus = null;
    // the world's title card and why we are here, before the épreuve's own intro
    Lore.enter(ph, prev);
    if (PH[ph] && PH[ph].enter) PH[ph].enter(ctx, first, prev);
    // level messages the partner sent from this phase before we got here
    flushHeld();
  };

  // ?netdebug: what the story dropped or refused, in window.__netdbg.story
  const nd = new URLSearchParams(location.search).has('netdebug')
    ? ((window.__netdbg = window.__netdbg || {}).story = {
        reset() {
          Object.keys(this).forEach((k) => k !== 'reset' && k !== 'shared' && delete this[k]);
        },
      })
    : null;
  const note = (k, why) => {
    if (!nd) return;
    nd[k] = (nd[k] || 0) + 1;
    if (why) {
      (nd.log = nd.log || []).push(why);
      if (nd.log.length > 40) nd.log.shift();
    }
  };

  const action = (who, d, from) => {
    if (!S || !d || typeof d !== 'object') return;
    if (d.a === 'clue' && !S.clues.includes(d.id)) set((s) => s.clues.push(d.id));
    if (d.a === 'seen' && !S.seen.includes(d.id)) set((s) => s.seen.push(d.id));
    if (d.a === 'card' && Cards.valid(d.id) && !Cards.has(d.id)) Cards.award(ctx, [d.id]);
    // the guest's actions: one sent from a phase the host has already left is not for this level
    // (older pages do not say their phase)
    if (from && from.ph && from.ph !== S.phase) return note('actOtherPhase', d.a + ' from ' + from.ph);
    const def = PH[S.phase];
    if (def && def.action) def.action(ctx, who, d);
  };

  // level messages (def.net). Each is handled once: the handler of the phase it was sent from,
  // else the one of the phase played here, else the first one registered (garde's 'en', 'tel'
  // and 'bossfx' serve every combat level). One sent from a phase that has its own handler is
  // for that phase only: it waits (up to 4 s) if it came before we entered it, and is dropped
  // once that phase is over (a late 'wipe' would respawn us in a level we left)
  const SNAP = new Set(['en']);
  const early = [];
  const netMsg = (k, list, d, ph) => {
    if (!S) return;
    let h = ph && list.find((o) => o.name === ph);
    if (h && local.phase !== ph) {
      if (SNAP.has(k)) return note('netOtherPhase');
      early.push({ k, h, d, ph, t: performance.now() });
      return note('netHeld');
    }
    if (!h) h = list.find((o) => o.name === local.phase) || list[0];
    if (h.live()) h.fn(ctx, d);
  };
  const flushHeld = () => {
    const now = performance.now();
    for (let i = 0; i < early.length; i++) {
      const m = early[i];
      if (m.ph === local.phase) {
        early.splice(i--, 1);
        if (S && m.h.live()) m.h.fn(ctx, m.d);
        note('netReplayed');
      } else if (now - m.t > 4000) {
        early.splice(i--, 1);
        note('netDropped', m.k + ' from ' + m.ph + ' in ' + local.phase);
      }
    }
  };

  const hostTick = (dt) => {
    if (S.phase !== lastPhase) {
      lastPhase = S.phase;
      timers.phase = 0;
    }
    timers.phase += dt;
    const def = PH[S.phase];
    if (def && def.host && local.phase === S.phase) def.host(ctx, dt);
    if (local.phase === S.phase) Cards.host(ctx);
    timers.sync += dt;
    if (dirty || timers.sync > 2) {
      dirty = false;
      timers.sync = 0;
      Net.send('S', S);
      if (checkpoint(S.phase) && S.phase !== 'prologue')
        save.set({
          progress: {
            v: 5,
            phase: S.phase,
            chapter: S.chapter,
            done: S.done,
            clues: S.clues,
            seen: S.seen,
            cards: S.cards,
            ...(S.phase === 'cut' ? { cut: S.x.cut, after: S.x.after } : {}),
            ...(S.phase === 'reward' ? { card: S.x.card } : {}),
          },
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
    if (!S.cards) S.cards = [];
    if (!S.done) S.done = [];
    if (S.phase !== local.phase) enter(S.phase, first);
    Cards.sync(S);
    const def = PH[S.phase];
    if (def && def.apply) def.apply(ctx);
  };

  return {
    register(name, def) {
      PH[name] = def;
    },
    has: (name) => !!PH[name],
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
      // what we send says which phase we play (Net.meta.ph on the other side)
      Net.stamp = () => local.phase;
      Net.on('S', (ns) => !Net.isHost && ns && ns.phase && apply(ns));
      Net.on('act', (d) => Net.isHost && action(other, d, Net.meta));
      Net.on('call', (p) => {
        const far = PH[S && S.phase] && PH[S.phase].farCall;
        Sound.play('call', far ? null : V3(p[0], p[1] + 1.5, p[2]));
        if (S && S.phase === 'prologue') return;
        beam.position.set(p[0], p[1], p[2]);
        beamT = 4;
      });
      Net.on('connect', () => Net.isHost && S && Net.send('S', S));
      // a late message for a level whose world is unloaded (the partner sent it just before the
      // phase changed) has nothing left to act on: dropped
      const owners = {};
      Object.entries(PH).forEach(([name, def]) => {
        const live = () => !def.world || def.world.built || local.phase === name;
        if (def.net)
          Object.entries(def.net).forEach(([k, fn]) => (owners[k] = owners[k] || []).push({ name, fn, live }));
      });
      // one listener per message, which picks the handler (netMsg)
      Object.entries(owners).forEach(([k, list]) => Net.on(k, (d) => netMsg(k, list, d, Net.meta.ph)));
      if (nd) nd.shared = Object.keys(owners).filter((k) => owners[k].length > 1).map((k) => k + ':' + owners[k].map((o) => o.name).join('/'));
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
      HUD.clues(S.clues.filter((id) => T.clues[id]).length, Object.keys(T.clues).length);
      City.update(t, dt);
      Lore.update(dt);
      BigScreen.update(dt, t);
      Clues.update(dt, t);
      Cards.update(dt, t);
      Fx.update(dt);
    },
  };
})();
