// ♣ 7 · Le Pilote. Teamwork: one of you flies and sees only ahead, into the haze; the other
// navigates (the light arches, the radar, the turret, the grapple). On foot first: cast off the
// moorings and choose the seats. Then four sections between checkpoints: the canyon, the storm,
// the drones, the mothership in a closing rift; and a landing on the heart.
// The flight is simulated on the pilot's screen (no input lag) and streamed to the other one,
// who plays it back smoothly; the host owns everything else (hull, drones, boss, progress).
(() => {
  const T = CONFIG;
  const W = TrC7;
  const TITLE = 'Le Pilote';
  const TXT = {
    intro: 'Épreuve d’équipe. Un petit vaisseau à deux places, au bord d’un canyon de Terre 39.',
    rule: 'L’un pilote et ne voit que devant lui, dans la brume. L’autre navigue : les arches, le radar, la tourelle. Parlez-vous.',
    foot: 'Larguez les deux amarres (E), puis choisissez vos places : le manche à l’avant, la tourelle de navigation à l’arrière.',
    moor: 'Amarres larguées : {n} / 2. Puis les places : le manche, ou la tourelle.',
    seats: 'Il faut quelqu’un au manche et quelqu’un à la tourelle.',
    taken: '{mate} a déjà pris cette place.',
    seat: {
      pilot: 'Tu prends le manche. ZQSD ou le stick : tourner, monter, descendre. Maj : pleine poussée. Espace : freiner.',
      nav: 'Tu prends la tourelle. La souris tourne la vue. Toi seul{e} verras les arches et le radar : guide {mate}.',
    },
    go: 'Les deux places sont prises. Décollage !',
    s1: {
      pilot: 'Le canyon. Des arches de lumière balisent la route, mais seul{pe} {mate} les voit. Écoute {lui} et passe dedans.',
      nav: 'Le canyon. Les arches ne sont visibles que de toi : annonce-les à {mate} (gauche, droite, haut, bas). Clic : une fusée éclairante, que {mate} verra.',
    },
    s1b: 'Des éboulis barrent le canyon. Un seul passage par mur : là où brille l’arche.',
    s2: {
      pilot: 'La tempête. Tu ne vois presque plus rien : {mate} a le radar. Suis sa voix, et ses fusées.',
      nav: 'La tempête. {mate} vole à l’aveugle. Sur ton radar : les aiguilles de roche et les cercles de foudre. Guide-{le}.',
    },
    s3: {
      pilot: 'Des drones des Veilleurs ! Esquive leurs tirs (les flèches rouges au bord de l’écran) et traverse les cœurs pour réparer.',
      nav: 'Des drones des Veilleurs ! Clic : la tourelle. F : le grappin (il attrape les cœurs). E maintenu, en visant un feu : l’éteindre.',
    },
    dam: 'Le barrage des Veilleurs ne tombera qu’avec le dernier drone.',
    damDown: 'Le barrage s’effondre. La voie est libre.',
    s4: {
      pilot: 'Le Vaisseau-mère ! La faille se referme derrière nous : ne traîne pas, et reste sous lui pendant que {mate} accroche ses noyaux.',
      nav: 'Le Vaisseau-mère ! Quatre noyaux sous sa coque, sous bouclier. Tire sur un bouclier pour le briser, puis F : le grappin, et F maintenu pour arracher le noyau. {mate} doit rester sous lui.',
    },
    crush: 'La faille se referme derrière nous ! Plus vite !',
    core: 'Un noyau arraché ! Encore {n}.',
    rise: 'Il remonte et lâche tout ce qu’il a : tenez bon !',
    open: 'Bouclier brisé : le grappin, vite !',
    snap: 'Le câble a cassé : trop loin du noyau.',
    tug: 'Il tire sur le câble : tiens la trajectoire !',
    bar: 'Il nous barre la route : arrachez ses derniers noyaux !',
    die: 'Le Vaisseau-mère s’effondre dans la faille !',
    s5: {
      pilot: 'La faille se referme encore : pleine poussée (Maj) jusqu’au bassin. Là-bas, la plateforme en cœur : freine (Espace), descends doucement (S), pose-toi au milieu.',
      nav: 'La faille se referme encore : pousse {mate} jusqu’au bassin. Les rochers qui tombent, la tourelle peut les briser. Puis guide son atterrissage sur le cœur.',
    },
    fast: 'Trop vite pour se poser : freine.',
    landed: 'Posés. Le cœur s’illumine.',
    card: 'La carte ♣ 7 est au milieu du cœur. Allez-y ensemble.',
    cp: 'Point de passage.',
    crash: 'Le vaisseau décroche… Retour au dernier point de passage.',
    fire: 'Feu à bord !',
    fireNav: 'Feu à bord : vise-le et maintiens E pour l’éteindre.',
    ext: 'Feu éteint.',
    heart: 'Coque réparée.',
    low: 'La coque ne tiendra plus longtemps !',
    lightning: 'La foudre ! Les cercles sur le radar.',
    debris: 'La faille s’effondre : des rochers tombent ! Les cercles orange sur le radar.',
  };
  CONFIG.cards.c7 = {
    corner: '7\n♣',
    big: '♣',
    title: TITLE,
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'L’un tenait le manche, l’autre voyait la route.',
      'Dans la tempête, il a suffi d’une voix pour ne pas s’écraser.',
      'On ne se pose jamais seul : on se pose ensemble, au milieu du cœur.',
    ],
  };

  // ---------- tuning ----------
  const CRUISE = 21;
  const BOOST = 31;
  const BOLT_V = 46;
  const SHIP_R = 3.0;
  const PARK_H = 1.27;
  const SHIELD = 20;
  const DELAY = 105; // ms of playback delay for the one who does not fly
  const WAVES = [
    { n: 3, from: 'back', at: () => W.passS[4] + 50 },
    { n: 4, from: 'mix', at: () => W.passS[4] + 620 },
    { n: 5, from: 'mix', at: () => W.passS[5] + 220 },
  ];
  const SLOTS = [
    [-26, -9, 4],
    [-26, 9, 4],
    [-36, 0, 10],
    [34, -11, 6],
    [34, 11, 6],
    [-20, -15, -2],
    [-20, 15, -2],
    [44, 0, 12],
    [-44, -6, 14],
    [-44, 6, 14],
    [28, -16, 0],
    [28, 16, 0],
    [-30, 0, -4],
    [38, 0, 2],
  ];

  // ---------- local state ----------
  const mkSim = () => ({
    p: V3(),
    vh: V3(),
    vy: 0,
    yaw: 0,
    yawRate: 0,
    speed: 0,
    roll: 0,
    pitch: 0,
    s: 0,
    u: 0,
    inv: 0,
    stun: 0,
    take: 0,
    gear: 1,
    landed: 0,
    landT: 0,
    ms: 0,
    mc: 0,
    boost: 0,
    brake: 0,
    crushT: 0,
    damT: 0,
  });
  const local = {
    stage: -1,
    rs: -1,
    sim: mkSim(),
    view: { p: V3(), yaw: 0, pitch: 0, roll: 0, speed: 0, s: 0, u: 0, vel: V3(), boost: 0, brake: 0, gear: 1, ok: false },
    prevView: V3(),
    buf: [],
    off: null,
    sendT: 0,
    cy: 0,
    cpch: 0.18,
    mdy: 0,
    mdp: 0,
    nav: { yaw: 0, pitch: 0.1, heat: 0, over: 0, cd: 0, flareCd: 0, g: null, ext: 0, sendT: 0, barrel: 0, lock: null, extI: -1 },
    mateNav: { yaw: 0, pitch: 0.1, g: null },
    drones: new Map(),
    bolts: new Map(),
    mines: new Map(),
    lasers: [],
    strikes: [],
    mom: { s: 0, u: 0, y: 0, yaw: 0, on: false, k: 0, dieT: -1, ts: 0, tu: 0, ty: 0, tyaw: 0 },
    shield: [SHIELD, SHIELD, SHIELD, SHIELD],
    frontS: null,
    frontV: 0,
    host: null,
    camP: V3(),
    camL: V3(),
    camOk: false,
    shake: 0,
    hurt: 0,
    said: {},
    objT: 0,
    av: {},
    env: null,
    hud: null,
    eng: null,
    landK: 0,
    cardK: 0,
    lastHull: 100,
    lowCd: 0,
    tugCd: 0,
    archPrev: 0,
    dynBox: null,
  };
  W.local = local;
  const newHost = () => ({
    goT: 0,
    id: 1,
    drones: [],
    sendD: 0,
    sendM: 0,
    sendF: 0,
    lightT: 3.5,
    atkT: 5,
    stagger: 0,
    fireT: 0,
    damSay: 0,
    mom: { s: 0, u: 0, y: 0, yaw: 0 },
    front: { s: 0, v: 17 },
    mines: [],
    lasers: [],
    spawnT: 0,
    lowSaid: false,
    rise: 0,
    shield: [SHIELD, SHIELD, SHIELD, SHIELD],
  });
  local.host = newHost();
  const HAZE = new THREE.Color('#c07a90');
  const HAZE_ST = new THREE.Color('#211c2b');
  const HEMI = new THREE.Color('#ffc0c8');
  const HEMI_ST = new THREE.Color('#7a7aa8');
  const tmp = V3();
  const tmp2 = V3();
  const tmp3 = V3();
  const LOC = { s: 0, u: 0 };
  const LOC2 = { s: 0, u: 0 };
  const wrapA = (a) => {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };
  const seatOf = (x, role) => (x.seats && x.seats.pilot === role ? 'pilot' : x.seats && x.seats.nav === role ? 'nav' : null);
  const flying = (x) => x.stage >= 1 && x.stage <= 5;
  const personOf = (kit) => (Story.kitOf(Story.me, 'tr_c7') === kit ? Story.me : Story.mate);
  const lookOf = (kit) => T.players[personOf(kit)].look;
  const dam0On = (x) => x.stage <= 3 && !(x.waves && x.waves.every((w) => w === 2));
  const dam1On = (x) => x.stage === 4 && x.boss !== 2;

  // ---------- sound: engines, wind, rain, the guns (own little graph) ----------
  const Eng = (() => {
    let ctx = null;
    let out = null;
    const n = {};
    const start = () => {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
      } catch (e) {
        ctx = null;
        return;
      }
      out = ctx.createGain();
      out.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      out.connect(comp).connect(ctx.destination);
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      n.noise = nb;
      // engine: two detuned saws and a sub, through a lowpass that opens with the speed
      n.lp = ctx.createBiquadFilter();
      n.lp.type = 'lowpass';
      n.lp.Q.value = 2;
      n.eg = ctx.createGain();
      n.eg.gain.value = 0;
      n.lp.connect(n.eg).connect(out);
      n.o = [0, 1, 2].map((i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'sine' : 'sawtooth';
        o.detune.value = i === 0 ? -9 : i === 1 ? 9 : 0;
        const g = ctx.createGain();
        g.gain.value = i === 2 ? 0.7 : 0.35;
        o.connect(g).connect(n.lp);
        o.start();
        return o;
      });
      // a whine on top (the turbines)
      n.wh = ctx.createOscillator();
      n.wh.type = 'triangle';
      n.whg = ctx.createGain();
      n.whg.gain.value = 0;
      n.wh.connect(n.whg).connect(out);
      n.wh.start();
      const loopNoise = (type, f, q) => {
        const s = ctx.createBufferSource();
        s.buffer = nb;
        s.loop = true;
        const fl = ctx.createBiquadFilter();
        fl.type = type;
        fl.frequency.value = f;
        fl.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        s.connect(fl).connect(g).connect(out);
        s.start(0, Math.random() * 1.5);
        return { fl, g };
      };
      n.jet = loopNoise('bandpass', 700, 0.8);
      n.wind = loopNoise('lowpass', 500, 0.6);
      n.rain = loopNoise('highpass', 2600, 0.5);
      // the mothership's hum (two low tones beating) and the grinding of the rift
      n.humG = ctx.createGain();
      n.humG.gain.value = 0;
      const hl = ctx.createBiquadFilter();
      hl.type = 'lowpass';
      hl.frequency.value = 220;
      hl.connect(n.humG).connect(out);
      [41, 41.7, 82.3].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'sawtooth' : 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i === 2 ? 0.25 : 0.6;
        o.connect(g).connect(hl);
        o.start();
      });
      n.grind = loopNoise('lowpass', 140, 1.2);
    };
    const hum = (mom, rift) => {
      if (!ctx) return;
      const t = ctx.currentTime;
      n.humG.gain.setTargetAtTime(mom * 0.22, t, 0.4);
      n.grind.g.gain.setTargetAtTime(rift * 0.35, t, 0.3);
    };
    const set = (on, sp, boost, storm, dt) => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const vol = (typeof SETTINGS !== 'undefined' ? SETTINGS.vol : 0.8) * 0.55;
      out.gain.setTargetAtTime(on ? vol : 0, t, 0.3);
      const k = clamp(sp / BOOST, 0, 1.2);
      const f0 = 46 + k * 38 + boost * 14;
      n.o[0].frequency.setTargetAtTime(f0, t, 0.15);
      n.o[1].frequency.setTargetAtTime(f0 * 1.005, t, 0.15);
      n.o[2].frequency.setTargetAtTime(f0 / 2, t, 0.15);
      n.lp.frequency.setTargetAtTime(260 + k * 900 + boost * 700, t, 0.2);
      n.eg.gain.setTargetAtTime(0.13 + k * 0.08, t, 0.2);
      n.wh.frequency.setTargetAtTime(520 + k * 520 + boost * 260, t, 0.25);
      n.whg.gain.setTargetAtTime(0.008 + k * 0.012 + boost * 0.01, t, 0.25);
      n.jet.fl.frequency.setTargetAtTime(500 + k * 900 + boost * 900, t, 0.2);
      n.jet.g.gain.setTargetAtTime(0.05 + k * 0.08 + boost * 0.07, t, 0.2);
      n.wind.fl.frequency.setTargetAtTime(300 + k * 900, t, 0.3);
      n.wind.g.gain.setTargetAtTime(0.04 + k * k * 0.16 + storm * 0.1, t, 0.3);
      n.rain.g.gain.setTargetAtTime(storm * 0.11, t, 0.5);
      void dt;
    };
    const blip = (f0, f1, dur, vol, type = 'square') => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const hiss = (f, dur, vol, type = 'bandpass', q = 1) => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const s = ctx.createBufferSource();
      s.buffer = n.noise;
      const fl = ctx.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl).connect(g).connect(out);
      s.start(t, Math.random());
      s.stop(t + dur + 0.05);
    };
    return {
      start,
      set,
      hum,
      gun() {
        blip(420, 90, 0.07, 0.07);
        hiss(2400, 0.06, 0.08, 'highpass');
      },
      charge() {
        blip(300, 1400, 0.9, 0.025, 'sawtooth');
      },
      tink() {
        blip(2200, 1300, 0.08, 0.035, 'triangle');
        hiss(5200, 0.05, 0.03, 'bandpass', 3);
      },
      zap() {
        blip(1800, 300, 0.25, 0.05, 'sawtooth');
        hiss(4000, 0.3, 0.06, 'highpass');
      },
      thunder(near) {
        hiss(120, 2.6, 0.5 * near + 0.15, 'lowpass', 0.6);
        hiss(900, 0.5, 0.25 * near, 'bandpass', 0.7);
      },
      crackle() {
        for (let i = 0; i < 4; i++) setTimeout(() => hiss(3000 + Math.random() * 3000, 0.05, 0.05, 'bandpass', 4), i * 90 + Math.random() * 60);
      },
      grind() {
        hiss(160, 0.6, 0.18, 'lowpass', 0.8);
      },
      scrape() {
        hiss(1500 + Math.random() * 800, 0.18, 0.06, 'bandpass', 3);
      },
      stop() {
        if (!ctx) return;
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      },
      close() {
        if (!ctx) return;
        const c = ctx;
        ctx = null;
        setTimeout(() => c.close().catch(() => {}), 600);
      },
    };
  })();

  // ---------- on-screen instruments (a canvas over the 3D view) ----------
  const hud = (() => {
    let cv = null;
    let g = null;
    let w = 0;
    let h = 0;
    const ensure = () => {
      if (cv) return;
      cv = document.createElement('canvas');
      cv.id = 'c7hud';
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none';
      document.body.appendChild(cv);
      g = cv.getContext('2d');
    };
    return {
      begin() {
        ensure();
        cv.style.display = 'block';
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const W2 = Math.round(innerWidth * dpr);
        const H2 = Math.round(innerHeight * dpr);
        if (cv.width !== W2 || cv.height !== H2) {
          cv.width = W2;
          cv.height = H2;
        }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        w = innerWidth;
        h = innerHeight;
        g.clearRect(0, 0, w, h);
        return g;
      },
      hide() {
        if (cv) cv.style.display = 'none';
      },
      remove() {
        if (cv) cv.remove();
        cv = null;
      },
      get w() {
        return w;
      },
      get h() {
        return h;
      },
    };
  })();
  const FONT = (px, wt = 500) => `${wt} ${px}px 'IBM Plex Mono', ui-monospace, monospace`;
  const heartPath = (g, x, y, s) => {
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 0.2, y + s * 0.65, x - s, y + s * 0.3, x - s, y - s * 0.25);
    g.bezierCurveTo(x - s, y - s * 0.75, x - s * 0.45, y - s * 0.95, x, y - s * 0.55);
    g.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s, y - s * 0.75, x + s, y - s * 0.25);
    g.bezierCurveTo(x + s, y + s * 0.3, x + s * 0.2, y + s * 0.65, x, y + s * 0.9);
    g.closePath();
  };
  const proj = V3();
  const toScreen = (p, out) => {
    proj.copy(p).project(R.camera);
    out.x = ((proj.x + 1) / 2) * hud.w;
    out.y = ((1 - proj.y) / 2) * hud.h;
    out.z = proj.z;
    return out;
  };

  // ---------- the pilot's flight ----------
  const spawnPose = (x, first) => {
    if (first) return { s: W.PAD_S, y: W.PAD_Y + PARK_H, speed: 0, take: 1 };
    const k = x.cp || 0;
    const s = k === 0 ? W.PAD_S + 80 : W.passS[k] + 18;
    return { s, y: 44, speed: CRUISE * 0.85, take: 0 };
  };
  const resetSim = (x, first) => {
    const sp = spawnPose(x, first);
    const S = local.sim;
    Object.assign(S, mkSim());
    W.world(sp.s, 0, sp.y, S.p);
    S.yaw = W.yawAt(sp.s);
    S.speed = sp.speed;
    S.vh.set(Math.sin(S.yaw), 0, Math.cos(S.yaw)).multiplyScalar(sp.speed);
    S.s = sp.s;
    S.take = sp.take;
    S.gear = sp.take ? 1 : 0;
    S.inv = 2.5;
    W.resetTrails();
  };
  const hitMe = (c, n, k, id) => {
    const S = local.sim;
    const free = S.inv > 0 || S.landed;
    if (!free) S.inv = 0.85;
    c.act({ a: 'hit', n: free ? 0 : n, k, id });
    if (free) return;
    local.shake = Math.max(local.shake, 0.35 + n * 0.02);
    local.hurt = 1;
  };
  const archHit = (c, prevS) => {
    const S = local.sim;
    const y = S.p.y - W.O.y;
    W.ARCHES.forEach((a, i) => {
      if (!(prevS < a.s && S.s >= a.s)) return;
      if (Math.abs(S.u - a.u) < a.r + 0.5 && Math.abs(y - a.y) < a.r + 0.5) c.act({ a: 'arch', i });
    });
  };
  const collide = (c, x, prevS, dt) => {
    const S = local.sim;
    const f = W.at(S.s);
    const nx = -f.tz;
    const nz = f.tx;
    let y = S.p.y - W.O.y;
    // the clouds hold you up, the crest winds push you down
    if (y < W.FLOOR) {
      S.p.y = W.O.y + W.FLOOR;
      S.vy = Math.max(S.vy, 3);
      y = W.FLOOR;
    }
    const ceil = W.ceilAt(S.s);
    if (y > ceil) {
      S.p.y = W.O.y + ceil;
      S.vy = Math.min(S.vy, 0);
      y = ceil;
    }
    // the shelf under the skiff at the start, the heart at the end
    if (S.s > W.PAD.s0 - 2 && S.s < W.PAD.s1 + 2 && Math.abs(S.u) < W.PAD.hw + 2 && y < W.PAD_Y + PARK_H) {
      S.p.y = W.O.y + W.PAD_Y + PARK_H;
      S.vy = Math.max(0, S.vy);
      y = W.PAD_Y + PARK_H;
    }
    // the walls
    const side = S.u >= 0 ? 1 : -1;
    const lim = W.face(S.s, y, side, local.frontS) - SHIP_R;
    if (Math.abs(S.u) > lim) {
      const over = Math.abs(S.u) - Math.max(0, lim);
      S.p.x -= nx * side * over;
      S.p.z -= nz * side * over;
      S.u = side * Math.max(0, lim);
      const vn = (S.vh.x * nx + S.vh.z * nz) * side;
      if (vn > 0) {
        S.vh.x -= nx * side * vn * 1.5;
        S.vh.z -= nz * side * vn * 1.5;
      }
      S.yawRate += side * 0.5 * dt * 10;
      if (vn > 4.5) {
        hitMe(c, Math.round(3 + vn * 0.9), 'wall');
        fxLocalSparks(S.p, side, nx, nz);
        Eng.grind();
      } else if (Math.random() < dt * 8) {
        fxLocalSparks(S.p, side, nx, nz);
        Eng.scrape();
      }
    }
    // the closed end of the canyon behind the shelf
    if (S.s < 24 && S.take <= 0) {
      const k = 24 - S.s;
      S.p.x += f.tx * k;
      S.p.z += f.tz * k;
      S.s = 24;
    }
    // rockfalls: one gap each
    W.ROCKFALLS.forEach((rf) => {
      const a = rf.s - 3.6 - 4.4;
      const b = rf.s + 3.6;
      if (S.s < a || S.s > b) return;
      const du = S.u - rf.u;
      const dy = y - rf.y;
      const gu = rf.g - SHIP_R + 0.4;
      const gy = rf.g - 1.4;
      if (Math.abs(du) < gu && Math.abs(dy) < gy) return;
      if (prevS <= a + 0.6) {
        // nose into the rock: back off
        const back = S.s - (a - 0.6);
        S.p.x -= f.tx * back;
        S.p.z -= f.tz * back;
        S.s = a - 0.6;
        S.vh.set(-f.tx * 5, 0, -f.tz * 5);
        S.speed = Math.min(S.speed, 4);
        hitMe(c, 10, 'rock');
        local.shake = Math.max(local.shake, 0.7);
        fxBoth(c, ['rock', S.p.x + f.tx * 5, S.p.y, S.p.z + f.tz * 5]);
      } else {
        // already in the gap: keep inside its edges
        if (Math.abs(du) >= gu) {
          const k = Math.abs(du) - gu + 0.01;
          const sd = Math.sign(du);
          S.p.x -= nx * sd * k;
          S.p.z -= nz * sd * k;
          S.u -= sd * k;
        }
        if (Math.abs(dy) >= gy) {
          S.p.y -= Math.sign(dy) * (Math.abs(dy) - gy + 0.01);
          S.vy *= -0.2;
        }
        if (Math.random() < dt * 6) Eng.scrape();
      }
    });
    // stone spires (the storm)
    W.SPIRES.forEach((sp) => {
      const ds = S.s - sp.s;
      if (Math.abs(ds) > 14) return;
      const du = S.u - sp.u;
      const d = Math.hypot(ds, du);
      const Rr = sp.r * 1.12 + SHIP_R;
      if (d >= Rr) return;
      const k = (Rr - d) / (d || 1);
      const ox = (f.tx * ds + nx * du) * k;
      const oz = (f.tz * ds + nz * du) * k;
      S.p.x += ox;
      S.p.z += oz;
      const l = Math.hypot(ox, oz) || 1;
      const vin = -(S.vh.x * ox + S.vh.z * oz) / l;
      if (vin > 0) {
        S.vh.x += (ox / l) * vin * 1.4;
        S.vh.z += (oz / l) * vin * 1.4;
      }
      if (vin > 4) {
        hitMe(c, Math.round(5 + vin * 0.7), 'spire');
        S.speed *= 0.6;
        fxBoth(c, ['rock', S.p.x - ox, S.p.y, S.p.z - oz]);
        Eng.grind();
      }
    });
    // the Veilleur dams
    const dam = (ds) => {
      if (S.s <= ds - 7) return;
      const k = S.s - (ds - 7);
      S.p.x -= f.tx * k;
      S.p.z -= f.tz * k;
      S.s = ds - 7;
      const vt = S.vh.x * f.tx + S.vh.z * f.tz;
      if (vt > 0) {
        S.vh.x -= f.tx * vt * 1.6;
        S.vh.z -= f.tz * vt * 1.6;
      }
      S.damT -= dt;
      if (S.damT <= 0) {
        S.damT = 1.4;
        Eng.zap();
        c.act({ a: 'dam' });
        local.shake = Math.max(local.shake, 0.25);
      }
    };
    if (dam0On(x)) dam(W.BAR_S);
    if (dam1On(x)) dam(W.BOSS_BAR_S);
    // the end of the basin
    if (S.s > W.LEN - 4) {
      const k = S.s - (W.LEN - 4);
      S.p.x -= f.tx * k;
      S.p.z -= f.tz * k;
      S.s = W.LEN - 4;
    }
  };
  let sparkCd = 0;
  const fxLocalSparks = (p, side, nx, nz) => {
    if (sparkCd > 0) return;
    sparkCd = 0.12;
    Fx.burst(V3(p.x + nx * side * 3, p.y, p.z + nz * side * 3), '#ffd2a8', 14, 6, 0.5, -6);
  };
  const pilotStep = (c, x, dt, t) => {
    const S = local.sim;
    S.inv = Math.max(0, S.inv - dt);
    S.stun = Math.max(0, S.stun - dt);
    const m = Input.move();
    S.ms = clamp(S.ms * Math.exp(-5 * dt) + local.mdy * 4, -1, 1);
    S.mc = clamp(S.mc * Math.exp(-5 * dt) - local.mdp * 4, -1, 1);
    let steer = clamp(-m.x + S.ms, -1, 1);
    let climb = clamp(m.z + S.mc, -1, 1);
    const boost = Input.held('sprint') && !S.landed;
    const brake = Input.held('jump');
    if (S.stun > 0) {
      steer += Math.sin(t * 31) * 0.6;
      climb += Math.cos(t * 27) * 0.5;
    }
    S.boost = boost ? 1 : 0;
    S.brake = brake ? 1 : 0;
    // landed: settle onto the heart and stay
    if (S.landed) {
      S.landT += dt;
      const ty = W.O.y + W.PLAT_Y + PARK_H;
      S.p.y = damp(S.p.y, ty, 3, dt);
      S.vh.multiplyScalar(Math.exp(-6 * dt));
      S.p.x += S.vh.x * dt;
      S.p.z += S.vh.z * dt;
      S.vy = 0;
      S.speed = 0;
      S.yawRate = damp(S.yawRate, 0, 4, dt);
      S.roll = damp(S.roll, 0, 4, dt);
      S.pitch = damp(S.pitch, 0, 4, dt);
      S.gear = damp(S.gear, 1, 3, dt);
      if (S.landT > 1.0 && !S.landSent) {
        S.landSent = true;
        c.act({ a: 'land', p: [+S.p.x.toFixed(2), +S.p.z.toFixed(2)], yaw: +S.yaw.toFixed(3) });
      }
      return;
    }
    if (S.take > 0) {
      S.take = Math.max(0, S.take - dt / 3.6);
      const k = 1 - S.take;
      S.vy = damp(S.vy, k < 0.5 ? 5.5 : 1.2, 3, dt);
      S.speed = damp(S.speed, k < 0.42 ? 0 : CRUISE * 0.85, 1.3, dt);
      steer *= 0.25;
      climb = 0;
    }
    const st = S.s;
    const storm = x.stage === 2;
    // assistance: follow the bend when the stick is free, keep off the walls
    const ahead = W.at(st + 24 + S.speed * 0.7);
    const want = Math.atan2(ahead.tx, ahead.tz);
    const dy = wrapA(want - S.yaw);
    const free = Math.abs(steer) < 0.12;
    let assist = free ? clamp(dy * 1.6, -0.9, 0.9) * (storm ? 0.6 : 0.9) : clamp(dy * 0.5, -0.3, 0.3);
    if (x.stage === 5) assist *= 0.3;
    const y0 = S.p.y - W.O.y;
    const side = S.u >= 0 ? 1 : -1;
    const lim = W.face(st, y0, side, local.frontS) - SHIP_R;
    const room = lim - Math.abs(S.u);
    if (room < 9 && x.stage < 5) assist += side * (1 - Math.max(0, room) / 9) * 0.9;
    S.yawRate = damp(S.yawRate, steer * 1.25 + assist, 3.2, dt);
    S.yaw = wrapA(S.yaw + S.yawRate * dt);
    if (S.take <= 0) {
      let spT = brake ? 0 : boost ? BOOST : CRUISE;
      // in the closing rift, never slower than the walls
      if ((x.stage === 4 || x.stage === 5) && local.frontS != null && S.s - local.frontS < 40) spT = Math.max(spT, 27);
      S.speed = damp(S.speed, spT, brake ? 1.6 : boost ? 0.8 : 0.6, dt);
      const ceil = W.ceilAt(st);
      let vyT = climb * 11;
      if (y0 < W.FLOOR + 5) vyT = Math.max(vyT, (W.FLOOR + 5 - y0) * 1.5);
      if (y0 > ceil - 3) vyT = Math.min(vyT, (ceil - 3 - y0) * 1.5);
      S.vy = damp(S.vy, vyT, 3, dt);
    }
    tmp.set(Math.sin(S.yaw), 0, Math.cos(S.yaw)).multiplyScalar(S.speed);
    S.vh.lerp(tmp, 1 - Math.exp(-2.4 * dt));
    const f = W.at(st);
    // storm gusts push sideways
    if (storm) {
      const gst = (Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.9 + 1.3) * 0.4) * 4.5 * W.skyU.uStorm.value;
      S.vh.x += -f.tz * gst * dt;
      S.vh.z += f.tx * gst * dt;
    }
    // the mothership tugs at the grapple cable
    const mg = local.mateNav.g;
    if (mg && mg.st === 2 && mg.kind === 1) {
      const cp = corePos(mg.i, tmp2);
      if (cp) {
        local.tugCd -= dt;
        if (local.tugCd <= 0) {
          local.tugCd = 12;
          HUD.say(TXT.tug, T.master, 1800);
        }
        tmp3.copy(cp).sub(S.p);
        tmp3.y = 0;
        const l = tmp3.length() || 1;
        const k = 5.5 * (0.6 + 0.4 * Math.sin(t * 2.3));
        S.vh.x += (tmp3.x / l) * k * dt;
        S.vh.z += (tmp3.z / l) * k * dt;
      }
    }
    const prevS = S.s;
    S.p.x += S.vh.x * dt;
    S.p.y += S.vy * dt;
    S.p.z += S.vh.z * dt;
    W.locate(S.p.x, S.p.z, S.s, LOC);
    S.s = LOC.s;
    S.u = LOC.u;
    collide(c, x, prevS, dt);
    if (x.stage <= 2) archHit(c, prevS);
    hazards(c, x, prevS, dt);
    // landing
    if (x.stage === 5) {
      const over = W.onHeart(S.p.x, S.p.z, 0);
      const hy = S.p.y - W.O.y - (W.PLAT_Y + PARK_H);
      const hs = Math.hypot(S.vh.x, S.vh.z);
      if (over && hy < 0) {
        S.p.y = W.O.y + W.PLAT_Y + PARK_H;
        if (S.vy < -5 || hs > 9) {
          hitMe(c, 8, 'land');
          S.vy = 4;
        } else S.vy = Math.max(0, S.vy);
      }
      if (W.onHeart(S.p.x, S.p.z, 2.2) && hy < 2.6 && hs < 6.5 && Math.abs(S.vy) < 4.5) {
        S.landed = 1;
        S.landT = 0;
        Sound.play('thud');
      } else if (over && hy < 6 && hs >= 6.5) {
        local.fastCd = (local.fastCd || 0) - dt;
        if (local.fastCd <= 0) {
          local.fastCd = 4;
          HUD.say(TXT.fast, T.master, 1800);
        }
      }
    }
    // attitude (visual): bank into the turns, nose with the climb
    S.roll = damp(S.roll, clamp(S.yawRate * 0.55, -0.85, 0.85), 4, dt);
    S.pitch = damp(S.pitch, clamp(S.vy * 0.035, -0.32, 0.32), 4, dt);
    const nearLand = x.stage === 5 && S.p.y - W.O.y - W.PLAT_Y < 14 && S.speed < 12;
    S.gear = damp(S.gear, S.take > 0.45 || nearLand ? 1 : 0, 2.2, dt);
  };
  const hazards = (c, x, prevS, dt) => {
    const S = local.sim;
    const sp = S.p;
    // bolts
    local.bolts.forEach((b, id) => {
      if (b.p.distanceTo(sp) < 3.4) {
        local.bolts.delete(id);
        W.boom(b.p, 5);
        hitMe(c, 9, 'b', id);
      }
    });
    // mines
    local.mines.forEach((m, id) => {
      if (m.p.distanceTo(sp) < 4.6) {
        local.mines.delete(id);
        hitMe(c, 13, 'm', id);
      }
    });
    // laser walls: crossing one while it burns
    const y = sp.y - W.O.y;
    local.lasers.forEach((L) => {
      if (L.hit || L.t < 2.2 || L.t > 5.8) return;
      if (!(prevS < L.s && S.s >= L.s)) return;
      if (inLaser(L, S.u, y)) {
        L.hit = true;
        hitMe(c, 14, 'z');
        local.shake = Math.max(local.shake, 0.6);
      }
    });
    // lightning, at the moment it strikes
    local.strikes.forEach((L) => {
      if (L.checked || L.t < 2.2) return;
      L.checked = true;
      const ds = S.s - L.s;
      const du = S.u - L.u;
      if (L.k === 'r') {
        if (Math.hypot(ds, du) < 7.5) {
          hitMe(c, 9, 'r');
          local.shake = Math.max(local.shake, 0.7);
        }
      } else if (Math.hypot(ds, du) < 8.5) {
        hitMe(c, 10, 'l');
        S.stun = 0.9;
      }
    });
    // the closing rift
    if ((x.stage === 4 || x.stage === 5) && local.frontS != null && S.s - local.frontS < 24) {
      S.crushT -= dt;
      if (S.crushT <= 0) {
        S.crushT = 0.7;
        hitMe(c, 5, 'crush');
        Eng.grind();
        local.shake = Math.max(local.shake, 0.5);
      }
    }
    // repair hearts
    if (x.stage >= 3 && x.stage <= 4)
      W.HEARTS.forEach((h, i) => {
        if (x.hearts && x.hearts[i]) return;
        if (local.heartSent && local.heartSent[i]) return;
        W.world(h.s, h.u, h.y, tmp);
        if (tmp.distanceTo(sp) < 6) {
          local.heartSent = local.heartSent || {};
          local.heartSent[i] = 1;
          c.act({ a: 'heart', i });
        }
      });
    void dt;
  };
  const inLaser = (L, u, y) => {
    if (L.mode === 'L') return u < 1.5;
    if (L.mode === 'R') return u > -1.5;
    const mid = laserMid(L.s);
    if (L.mode === 'U') return y > mid - 1.5;
    return y < mid + 1.5;
  };
  const laserMid = (s) => (W.FLOOR + W.ceilAt(s)) / 2;

  // ---------- the pose everyone draws ----------
  const pushPose = (d) => {
    const now = performance.now();
    const st = d[0];
    const o = now - st;
    if (local.off === null || o < local.off) local.off = o;
    else local.off += (o - local.off) * 0.002;
    const B = local.buf;
    if (B.length && d[8] !== B[B.length - 1][8]) B.length = 0;
    if (B.length && st <= B[B.length - 1][0]) return;
    B.push(d);
    if (B.length > 50) B.shift();
  };
  const angLerp = (a, b, k) => a + wrapA(b - a) * k;
  const interp = (V) => {
    const B = local.buf;
    if (!B.length || local.off === null) return false;
    const rt = performance.now() - local.off - DELAY;
    let i = B.length - 1;
    while (i > 0 && B[i][0] > rt) i--;
    const a = B[i];
    const b = B[i + 1];
    let k = 0;
    let A = a;
    let Bb = a;
    if (b) {
      k = clamp((rt - a[0]) / Math.max(1, b[0] - a[0]), 0, 1);
      Bb = b;
    } else if (i > 0) {
      // ran dry: carry on along the last motion for a little while
      A = B[i - 1];
      Bb = a;
      k = 1 + Math.min(150, Math.max(0, rt - a[0])) / Math.max(1, a[0] - A[0]);
    }
    V.p.set(lerp(A[1], Bb[1], k), lerp(A[2], Bb[2], k), lerp(A[3], Bb[3], k));
    V.yaw = angLerp(A[4], Bb[4], k);
    V.pitch = lerp(A[5], Bb[5], k);
    V.roll = lerp(A[6], Bb[6], k);
    V.speed = lerp(A[7], Bb[7], k);
    V.boost = Bb[9] & 1;
    V.brake = (Bb[9] >> 1) & 1;
    V.gear = lerp(A[10], Bb[10], Math.min(1, k));
    V.s = lerp(A[11], Bb[11], k);
    return true;
  };
  const computeView = (x, seat, dt) => {
    const V = local.view;
    local.prevView.copy(V.p);
    if (!flying(x)) {
      if (x.stage >= 6 && x.landP) {
        V.p.set(x.landP[0], W.O.y + W.PLAT_Y + PARK_H, x.landP[1]);
        V.yaw = x.landYaw || 0;
      } else {
        W.world(W.PAD_S, 0, W.PAD_Y + PARK_H, V.p);
        V.yaw = W.yawAt(W.PAD_S);
      }
      V.pitch = V.roll = V.speed = 0;
      V.gear = 1;
      V.boost = V.brake = 0;
      V.s = x.stage >= 6 ? W.END_S : W.PAD_S;
      V.u = 0;
      V.vel.set(0, 0, 0);
      V.ok = true;
      return;
    }
    if (seat === 'pilot') {
      const S = local.sim;
      V.p.copy(S.p);
      V.yaw = S.yaw;
      V.pitch = S.pitch;
      V.roll = S.roll;
      V.speed = S.speed;
      V.boost = S.boost;
      V.brake = S.brake;
      V.gear = S.gear;
      V.s = S.s;
      V.u = S.u;
      V.ok = true;
    } else {
      const was = V.ok;
      V.ok = interp(V);
      if (!V.ok) {
        W.world(W.PAD_S, 0, W.PAD_Y + PARK_H, V.p);
        V.yaw = W.yawAt(W.PAD_S);
        V.s = W.PAD_S;
      }
      W.locate(V.p.x, V.p.z, V.s, LOC2);
      V.u = LOC2.u;
      if (!was) local.prevView.copy(V.p);
    }
    if (dt > 0) V.vel.copy(V.p).sub(local.prevView).divideScalar(dt);
    if (V.vel.lengthSq() > 3600) V.vel.setLength(60);
  };

  // ---------- positions of things ----------
  const momPos = (out) => W.world(local.mom.s, local.mom.u, local.mom.y, out);
  const corePos = (i, out) => {
    if (!local.mom.on || !W.mom.g || !W.mom.g.visible) return null;
    W.mom.g.updateMatrixWorld(true);
    return out.copy(W.CORES[i]).applyMatrix4(W.mom.g.matrixWorld);
  };
  const heartPos = (i, out) => {
    const h = W.HEARTS[i];
    return W.world(h.s, h.u, h.y, out);
  };
  const dronePos = (d, out) => W.world(d.s, d.u, d.y, out);
  // a falling boulder: from above the rim to the clouds in 2.2 s
  const debrisPos = (L, out) => {
    const k2 = clamp(L.t / 2.2, 0, 1);
    const top = W.at(L.s).rim + 30;
    return W.world(L.s, L.u, top - (top - W.FLOOR) * k2 * k2, out);
  };

  // ---------- effects, said on both screens ----------
  const fx = (c, d) => {
    const k = d[0];
    const p = d.length >= 4 ? V3(d[1], d[2], d[3]) : null;
    if (k === 'moor') {
      Sound.play('switch');
      Sound.play('creak');
    }
    if (k === 'seat') Sound.play('door');
    if (k === 'go') {
      Sound.play('launch');
      Sound.play('reveal');
    }
    if (k === 'arch') {
      Sound.play('chime');
      const a = W.ARCHES[d[1]];
      if (a) Fx.burst(W.world(a.s, a.u, a.y), '#ff8fb0', 70, 9, 1.2, -2, 'heart');
    }
    if (k === 'cp') {
      Sound.play('reveal');
      HUD.say(TXT.cp, T.master, 1500);
    }
    if (k === 'hit') {
      Sound.play('hurt');
      if ((d[4] || 0) >= 9) Sound.play('slam');
      if (p) Fx.burst(p, '#ffb070', 30, 7, 0.7, -4);
      local.shake = Math.max(local.shake, 0.3);
      local.hurt = Math.max(local.hurt, 0.7);
    }
    if (k === 'rock') {
      Sound.play('thud', p);
      if (p) Fx.burst(p, '#c98c8e', 40, 8, 1.0, -10);
    }
    if (k === 'crash') {
      Sound.play('boom');
      Sound.play('fall');
      if (p) W.boom(p, 14);
    }
    if (k === 'dboom') {
      Sound.play('enemyDie');
      Sound.play('boom', p);
      if (p) {
        W.boom(p, 9);
        Fx.burst(p, '#ffd0dc', 60, 10, 1.0, -6);
      }
    }
    if (k === 'mboom') {
      Sound.play('boom', p);
      if (p) W.boom(p, 8);
    }
    if (k === 'heart') {
      Sound.play('heart', 1);
      Sound.play('chime');
      if (p) Fx.burst(p, '#ff6f9a', 80, 8, 1.2, -3, 'heart');
    }
    if (k === 'fire') {
      Sound.play('boom');
      if (c.S && seatOf(c.S.x, c.role) === 'nav') HUD.say(TXT.fireNav, T.master, 2400);
      else HUD.say(TXT.fire, T.master, 1600);
    }
    if (k === 'ext') {
      Sound.play('cloak');
      HUD.say(TXT.ext, T.master, 1300);
    }
    if (k === 'core') {
      Sound.play('shatter');
      Sound.play('roar');
      local.shake = Math.max(local.shake, 0.6);
      if (p) {
        W.boom(p, 16);
        Fx.burst(p, '#ffb0d0', 160, 14, 1.6, -4, 'heart');
      }
      W.mom.hurt = 1;
    }
    if (k === 'open') {
      Sound.play('shatter');
      Eng.zap();
      if (p) Fx.burst(p, '#ff8fb0', 90, 10, 1.0, -3);
    }
    if (k === 'mdie') {
      Sound.play('roar');
      Sound.play('slam');
      local.shake = Math.max(local.shake, 0.9);
    }
    if (k === 'land') {
      Sound.play('reveal');
      Sound.play('lantern');
      if (p) Fx.burst(p, '#ff8fb0', 160, 10, 1.6, -3, 'heart');
    }
    if (k === 'flash') {
      Eng.zap();
    }
    if (k === 'snap') {
      Sound.play('cut');
      HUD.say(TXT.snap, T.master, 1600);
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('c7fx', d);
  };
  const sayBoth = (c, mine, theirs) => {
    HUD.say(mine, T.master, 2600);
    c.send('c7say', [theirs || mine]);
  };
  const sayRole = (c, by) => {
    // each screen says its own seat's line
    const seat = seatOf(c.S.x, c.role);
    HUD.say(by[seat] || by.pilot, T.master, 4200);
  };

  // ---------- local hazards (spawned by the host, played on every screen) ----------
  const tickHazards = (c, x, dt, t) => {
    const V = local.view;
    // bolts fly straight
    local.bolts.forEach((b, id) => {
      b.t += dt;
      b.p.addScaledVector(b.v, dt);
      if (b.t > 3.5) local.bolts.delete(id);
    });
    let i = 0;
    local.bolts.forEach((b) => {
      const o = W.bolts[i++];
      if (!o) return;
      o.g.visible = true;
      o.g.position.copy(b.p);
      o.g.lookAt(tmp.copy(b.p).add(b.v));
    });
    for (; i < W.bolts.length; i++) W.bolts[i].g.visible = false;
    // drones (positions on the track, eased toward the host's)
    let j = 0;
    local.drones.forEach((d) => {
      if (!Net.isHost) {
        d.s = damp(d.s, d.ts, 8, dt);
        d.u = damp(d.u, d.tu, 8, dt);
        d.y = damp(d.y, d.ty, 8, dt);
      }
      const o = W.drones[j++];
      if (!o) return;
      o.g.visible = true;
      dronePos(d, o.g.position);
      o.g.position.y += Math.sin(t * 3 + d.id) * 0.3;
      o.g.lookAt(V.p);
      const ch = d.charge || 0;
      o.eye.scale.setScalar(1 + ch * 1.2 + Math.sin(t * 30) * ch * 0.2);
      o.eye.material.color.set('#ff3a5a').multiplyScalar(1 + ch * 1.5);
      o.halo.rotation.z = t * 2 + d.id;
      if (ch > 0.05 && !d.cs) {
        d.cs = true;
        if (o.g.position.distanceTo(V.p) < 120) Eng.charge();
      }
      if (ch <= 0.05) d.cs = false;
    });
    for (; j < W.drones.length; j++) W.drones[j].g.visible = false;
    // mines
    let k = 0;
    local.mines.forEach((m) => {
      m.t += dt;
      const o = W.mines[k++];
      if (!o) return;
      W.world(m.s, m.u, m.y + Math.sin(t * 1.6 + m.s) * 0.8, m.p);
      // they drop from the mothership's belly first
      const drop = clamp(m.t / 0.9, 0, 1);
      o.g.visible = true;
      o.g.position.copy(m.p);
      if (drop < 1 && m.from) o.g.position.lerpVectors(m.from, m.p, smooth(drop));
      o.g.rotation.set(t * 0.7, t * 1.1, 0);
      o.core.material.color.set('#ff3a5a').multiplyScalar(0.8 + (Math.sin(t * 9 + m.s) > 0 ? 0.9 : 0));
    });
    for (; k < W.mines.length; k++) W.mines[k].g.visible = false;
    // laser walls
    local.lasers = local.lasers.filter((L) => (L.t += dt) < 6);
    W.lasers.forEach((o, n) => {
      const L = local.lasers[n];
      o.m.visible = !!L;
      if (!L) return;
      const f = W.at(L.s);
      const ceil = W.ceilAt(L.s);
      const mid = laserMid(L.s);
      const wd = f.w + 8;
      let u0 = -wd;
      let u1 = wd;
      let y0 = W.FLOOR - 8;
      let y1 = ceil + 8;
      if (L.mode === 'L') u1 = 1.5;
      if (L.mode === 'R') u0 = -1.5;
      if (L.mode === 'U') y0 = mid - 1.5;
      if (L.mode === 'D') y1 = mid + 1.5;
      W.world(L.s, (u0 + u1) / 2, (y0 + y1) / 2, o.m.position);
      o.m.rotation.set(0, Math.atan2(f.tx, f.tz), 0);
      o.m.scale.set(u1 - u0, y1 - y0, 1);
      const on = L.t >= 2.2 && L.t < 5.8;
      o.m.material.uniforms.uOn.value = on ? Math.min(1, (L.t - 2.2) * 6) * Math.min(1, (5.8 - L.t) * 4) : 0;
      o.m.material.uniforms.uWarn.value = L.t < 2.2 ? Math.min(1, L.t * 3) : 0;
      if (on && !L.snd) {
        L.snd = true;
        Eng.zap();
      }
    });
    // lightning
    local.strikes = local.strikes.filter((L) => (L.t += dt) < 2.8);
    let dn = 0;
    local.strikes.forEach((L) => {
      if (L.k !== 'r') return;
      const o = W.debris[dn++];
      if (!o) return;
      const top = W.at(L.s).rim + 30;
      const k2 = clamp(L.t / 2.2, 0, 1);
      debrisPos(L, o.m.position);
      const yy = o.m.position.y - W.O.y;
      o.m.visible = L.t < 2.25;
      o.m.rotation.set(L.t * 2.1 + L.id, L.t * 1.3, L.t * 0.7);
      o.trail.visible = o.m.visible && k2 > 0.15;
      if (o.trail.visible) {
        o.trail.position.copy(o.m.position);
        o.trail.scale.set(1, Math.min(40, (top - yy) * 0.6), 1);
      }
    });
    for (; dn < W.debris.length; dn++) W.debris[dn].m.visible = W.debris[dn].trail.visible = false;
    W.bolt3.forEach((o, n) => {
      const L = local.strikes[n];
      o.col.visible = !!L && L.t < 2.2;
      o.ring.visible = o.col.visible;
      if (!L) return;
      const f = W.at(L.s);
      const base = W.world(L.s, L.u, W.FLOOR - 4);
      if (L.t < 2.2) {
        const k2 = L.t / 2.2;
        o.col.position.copy(base);
        o.col.scale.set(9.5, f.rim + 10, 9.5);
        o.col.material.opacity = 0.03 + k2 * 0.1 + (Math.sin(t * 18) > 0 ? 0.03 : 0) * k2;
        o.col.material.color.set(L.k === 'r' ? '#ffb08a' : '#c8b8ff');
        o.ring.material.color.set(L.k === 'r' ? '#ffc0a0' : '#d8c8ff');
        o.ring.position.copy(base).setY(W.O.y + W.FLOOR + 2);
        o.ring.scale.setScalar(9.5 * (0.2 + 0.8 * k2));
        if (!L.cr && L.t > 1.2) {
          L.cr = true;
          Eng.crackle();
        }
      }
      if (L.t >= 2.2 && !L.struck && L.k === 'r') {
        L.struck = true;
        const near = clamp(1 - base.distanceTo(V.p) / 200, 0, 1);
        W.boom(base.clone().setY(W.O.y + W.FLOOR + 4), 16);
        Fx.burst(base.clone().setY(W.O.y + W.FLOOR + 3), '#d9a0a0', 70, 12, 1.2, -6);
        Eng.thunder(near * 0.6);
        Sound.play('thud');
        local.shake = Math.max(local.shake, 0.15 + near * 0.35);
      }
      if (L.t >= 2.2 && !L.struck) {
        L.struck = true;
        const top = W.world(L.s, L.u, f.rim + 60);
        W.strikeMesh(o, base, top);
        o.t = 0.35;
        W.flashLight.position.copy(base).setY(W.O.y + 60);
        W.flashLight.intensity = 9;
        W.skyU.uFlash.value = 1;
        const near = clamp(1 - top.distanceTo(V.p) / 220, 0, 1);
        Eng.thunder(near);
        local.shake = Math.max(local.shake, 0.2 + near * 0.4);
        Fx.burst(base.clone().setY(W.O.y + W.FLOOR + 3), '#e8e0ff', 60, 12, 0.8, -4);
      }
    });
    void x;
    void c;
  };

  // ---------- the navigator: turret, flares, grapple, fire-fighting ----------
  const camFwd = (out) => out.set(0, 0, -1).applyQuaternion(R.camera.quaternion);
  const raySphere = (o, d, c2, r) => {
    tmp3.copy(c2).sub(o);
    const tt = tmp3.dot(d);
    if (tt < 0) return -1;
    const d2 = tmp3.lengthSq() - tt * tt;
    return d2 <= r * r ? tt - Math.sqrt(Math.max(0, r * r - d2)) : -1;
  };
  // where a ray from the camera meets rock (march), for flares and tracer ends
  const rayRock = (o, d, max) => {
    const p = tmp2.copy(o);
    let hint = local.view.s;
    for (let tt = 4; tt < max; tt += 4) {
      p.copy(o).addScaledVector(d, tt);
      W.locate(p.x, p.z, hint, LOC2);
      hint = LOC2.s;
      const y = p.y - W.O.y;
      if (y < W.FLOOR - 2) return tt;
      if (Math.abs(LOC2.u) > W.face(LOC2.s, y, LOC2.u >= 0 ? 1 : -1, local.frontS)) return tt;
      if (local.stage === 2 && W.SPIRES.some((sp) => Math.abs(sp.s - LOC2.s) < sp.r + 1 && Math.hypot(sp.s - LOC2.s, sp.u - LOC2.u) < sp.r)) return tt;
      if (local.stage <= 1 && W.ROCKFALLS.some((rf) => Math.abs(rf.s - LOC2.s) < 4 && !(Math.abs(LOC2.u - rf.u) < rf.g && Math.abs(y - rf.y) < rf.g))) return tt;
    }
    return max;
  };
  const aimTargets = (x) => {
    const out = [];
    if (x.stage >= 3 && x.stage <= 4) {
      local.drones.forEach((d) => out.push({ k: 'd', id: d.id, p: dronePos(d, V3()), r: 2.6 }));
      local.bolts.forEach((b, id) => out.push({ k: 'b', id, p: b.p, r: 1.7 }));
      local.mines.forEach((m, id) => out.push({ k: 'm', id, p: m.p, r: 2.8 }));
    }
    if (x.stage === 5)
      local.strikes.forEach((L) => {
        if (L.k !== 'r' || L.t > 2.05) return;
        out.push({ k: 'r', id: L.id, p: debrisPos(L, V3()), r: 4.6 });
      });
    if (x.stage === 4 && x.boss === 1)
      W.CORES.forEach((cc, i) => {
        if ((x.cores && x.cores[i]) || local.shield[i] <= 0) return;
        const p = corePos(i, V3());
        if (p) out.push({ k: 'c', id: i, p, r: 3.1 });
      });
    return out;
  };
  const navStep = (c, x, dt, t) => {
    const N = local.nav;
    N.yaw = wrapA(N.yaw + local.mdy);
    N.pitch = clamp(N.pitch - local.mdp, -0.62, 1.05);
    N.cd -= dt;
    N.flareCd -= dt;
    N.over = Math.max(0, N.over - dt);
    N.heat = Math.max(0, N.heat - dt * (N.over > 0 ? 0.55 : 0.4));
    const o = R.camera.position;
    const d = camFwd(tmp.clone());
    let prompt = null;
    const guns = x.stage >= 3 && x.stage <= 5;
    if (Input.held('attack') && x.stage >= 1 && x.stage <= 2 && N.flareCd <= 0) {
      N.flareCd = 0.7;
      const tt = rayRock(o, d, 260);
      const p = o.clone().addScaledVector(d, Math.max(8, tt - 1.5));
      W.flare(p);
      c.send('c7fl', p.toArray().map((v) => +v.toFixed(2)));
      Sound.play('portalShoot');
    }
    if (guns && Input.held('attack') && N.over <= 0 && N.cd <= 0) {
      N.cd = 1 / 8;
      N.heat += 0.07;
      if (N.heat >= 1) {
        N.over = 1.8;
        Sound.play('trap');
      }
      // find what the shot meets: targets (with a little help), else the rock
      let best = null;
      let bt = 1e9;
      const tg = aimTargets(x);
      tg.forEach((q) => {
        const hit = raySphere(o, d, q.p, q.r);
        if (hit >= 0 && hit < bt && hit < 320) {
          bt = hit;
          best = q;
        }
      });
      if (!best) {
        let ba = Math.cos(0.04);
        tg.forEach((q) => {
          tmp3.copy(q.p).sub(o);
          const l = tmp3.length();
          if (l > 240) return;
          const a = tmp3.dot(d) / l;
          if (a > ba) {
            ba = a;
            best = q;
            bt = l;
          }
        });
      }
      const rock = rayRock(o, d, best ? Math.min(bt, 320) : 320);
      const endT = best && bt <= rock + 1 ? bt : rock;
      if (best && bt > rock + 1) best = null;
      const end = best ? best.p.clone() : o.clone().addScaledVector(d, endT);
      N.barrel = 1 - N.barrel;
      const muzzle = W.ship.gun.localToWorld(V3(N.barrel ? 0.42 : -0.42, 0, 2.3));
      W.tracer(muzzle, end);
      c.send('c7t', [...muzzle.toArray(), ...end.toArray()].map((v) => +v.toFixed(2)));
      Eng.gun();
      if (best) {
        Fx.burst(end, best.k === 'c' ? '#ff8fb0' : '#ffd0dc', 8, 4, 0.3, 0);
        if (best.k === 'c') Eng.tink();
        c.act({ a: 'shot', k: best.k, id: best.id });
      } else if (endT < 319) Fx.burst(end, '#ffc0a0', 5, 3, 0.3, -6);
    }
    // grapple
    const G = N.g;
    const tur = W.ship.hook.getWorldPosition(V3());
    if (!G) {
      N.lock = null;
      let ba = 0;
      const cand = [];
      if (x.stage >= 3 && x.stage <= 4)
        W.HEARTS.forEach((h, i) => {
          if (x.hearts && x.hearts[i]) return;
          cand.push({ kind: 0, i, p: heartPos(i, V3()), max: 95, cone: 0.075 });
        });
      if (x.stage === 4 && x.boss === 1)
        W.CORES.forEach((cc, i) => {
          if (x.cores && x.cores[i]) return;
          const p = corePos(i, V3());
          if (!p) return;
          if (local.shield[i] > 0) {
            tmp3.copy(p).sub(o);
            if (tmp3.dot(d) / tmp3.length() > Math.cos(0.12) && !prompt) prompt = ['Clic', 'Briser le bouclier · ' + Math.round((1 - local.shield[i] / SHIELD) * 100) + ' %', true];
            return;
          }
          cand.push({ kind: 1, i, p, max: 120, cone: 0.1 });
        });
      cand.forEach((q) => {
        tmp3.copy(q.p).sub(o);
        const l = tmp3.length();
        if (l > q.max + 8) return;
        const a = tmp3.dot(d) / l;
        if (a > Math.cos(q.cone) && a > ba) {
          ba = a;
          N.lock = q;
        }
      });
      if (N.lock) prompt = ['F', N.lock.kind ? 'Grappin : le noyau' : 'Grappin : le cœur'];
      if (N.lock && Input.pressed('ability')) {
        N.g = { kind: N.lock.kind, i: N.lock.i, st: 1, t: 0, prog: 0, rel: 0 };
        Sound.play('grappleOut');
        N.sendT = 1;
      }
    } else {
      const tp = G.kind ? corePos(G.i, V3()) : heartPos(G.i, V3());
      const gone = !tp || (G.kind ? x.cores && x.cores[G.i] : x.hearts && x.hearts[G.i]);
      if (gone) N.g = null;
      else if (G.st === 1) {
        G.t += dt / 0.32;
        const hp = tur.clone().lerp(tp, Math.min(1, G.t));
        W.setCable(tur, hp);
        if (G.t >= 1) {
          if (G.kind === 0) {
            c.act({ a: 'heart', i: G.i, g: 1 });
            G.st = 3;
            G.t = 0;
          } else {
            G.st = 2;
            Sound.play('grappleHit');
          }
          N.sendT = 1;
        }
      } else if (G.st === 2) {
        W.setCable(tur, tp);
        const dist = tur.distanceTo(tp);
        if (dist > 132 || dist < 6) {
          N.g = null;
          fxBoth(c, ['snap']);
          N.sendT = 1;
        } else {
          if (Input.held('ability')) {
            G.prog += dt / 2.4;
            G.rel = 0;
          } else {
            G.prog = Math.max(0, G.prog - dt * 0.35);
            G.rel += dt;
          }
          prompt = ['F', 'Arracher le noyau (maintenir) · ' + Math.round(G.prog * 100) + ' %', true];
          if (Math.random() < dt * 10) Fx.burst(tp, '#ffb0d0', 4, 5, 0.4, 0);
          if (G.rel > 1.2) N.g = null;
          if (G.prog >= 1) {
            c.act({ a: 'core', i: G.i });
            N.g = null;
          }
          N.sendT += dt;
        }
      } else if (G.st === 3) {
        // reel the hook back in
        G.t += dt / 0.25;
        W.setCable(tur, tp.lerp(tur, Math.min(1, G.t)));
        if (G.t >= 1) N.g = null;
      }
    }
    if (!N.g) W.setCable(null);
    N.sendT += dt;
    if (N.sendT > 0.1) {
      N.sendT = 0;
      const g = N.g;
      c.send('c7g', g ? [g.st, g.kind, g.i, +g.prog.toFixed(2)] : [0]);
      c.send('c7a', [+N.yaw.toFixed(3), +N.pitch.toFixed(3)]);
    }
    // fires on the hull: aim and hold E
    if (x.fires && x.fires.some((f) => f)) {
      let bi = -1;
      let ba = Math.cos(0.16);
      x.fires.forEach((f, i) => {
        if (!f) return;
        const p = W.shipPoint(W.SHIP_FIRES[i], V3());
        tmp3.copy(p).sub(o);
        const a = tmp3.dot(d) / tmp3.length();
        if (a > ba) {
          ba = a;
          bi = i;
        }
      });
      if (bi !== N.extI) N.ext = 0;
      N.extI = bi;
      if (bi >= 0) {
        if (Input.held('interact')) {
          N.ext += dt / 1.3;
          if (Math.random() < dt * 20) Fx.burst(W.shipPoint(W.SHIP_FIRES[bi], V3()), '#dff4ff', 6, 3, 0.5, -2);
          if (N.ext >= 1) {
            c.act({ a: 'ext', i: bi });
            N.ext = 0;
          }
        } else N.ext = Math.max(0, N.ext - dt);
        prompt = ['E', 'Éteindre le feu (maintenir) · ' + Math.round(N.ext * 100) + ' %', true];
      }
    } else N.ext = 0;
    void t;
    return prompt;
  };

  // ---------- cameras ----------
  const placeCam = (pos, look, roll, dt, snap) => {
    const cam = R.camera;
    // keep the camera inside the canyon (the rock has no back faces)
    W.locate(pos.x, pos.z, local.view.s, LOC2);
    const y = pos.y - W.O.y;
    const side = LOC2.u >= 0 ? 1 : -1;
    const lim = W.face(LOC2.s, clamp(y, W.FLOOR, 200), side, local.frontS) - 1.4;
    if (Math.abs(LOC2.u) > lim && lim > 0) {
      const f = W.at(LOC2.s);
      const k = Math.abs(LOC2.u) - lim;
      pos.x -= -f.tz * side * k;
      pos.z -= f.tx * side * k;
    }
    const ceil = W.ceilAt(LOC2.s) + 10;
    if (y > ceil) pos.y = W.O.y + ceil;
    if (!local.camOk || snap) {
      local.camP.copy(pos);
      local.camL.copy(look);
      local.camOk = true;
    } else {
      local.camP.lerp(pos, 1 - Math.exp(-9 * dt));
      local.camL.lerp(look, 1 - Math.exp(-12 * dt));
    }
    cam.position.copy(local.camP);
    if (local.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * local.shake;
      cam.position.y += (Math.random() - 0.5) * local.shake;
    }
    tmp3.subVectors(local.camL, local.camP).normalize();
    cam.up.set(0, 1, 0).applyAxisAngle(tmp3, -roll);
    cam.lookAt(local.camL);
  };
  const pilotCam = (dt, snap) => {
    const V = local.view;
    const f = tmp.set(Math.sin(V.yaw), 0, Math.cos(V.yaw));
    const back = 13.5 + V.speed * 0.07;
    const pos = tmp2.copy(V.p).addScaledVector(f, -back);
    pos.y += 5.4 + Math.sin(V.pitch) * -2;
    const look = V3().copy(V.p).addScaledVector(f, 34);
    look.y += 3.4 + Math.sin(V.pitch) * 8;
    placeCam(pos, look, V.roll * 0.3, dt, snap);
    const fov = 62 + clamp((V.speed - CRUISE) * 0.7, -4, 9);
    if (Math.abs(R.camera.fov - fov) > 0.05) {
      R.camera.fov = damp(R.camera.fov, fov, 3, dt);
      R.camera.updateProjectionMatrix();
    }
  };
  const navCam = (dt, snap) => {
    const V = local.view;
    const N = local.nav;
    const tp = W.shipPoint(W.TURRET, V3());
    const ay = V.yaw + N.yaw;
    const d = tmp.set(Math.sin(ay) * Math.cos(N.pitch), Math.sin(N.pitch), Math.cos(ay) * Math.cos(N.pitch));
    const pos = tmp2.copy(tp).addScaledVector(d, -10);
    pos.y += 3.2;
    const look = V3().copy(tp).addScaledVector(d, 40);
    look.y += 2.0;
    placeCam(pos, look, V.roll * 0.12, dt, snap);
    if (Math.abs(R.camera.fov - 64) > 0.05) {
      R.camera.fov = damp(R.camera.fov, 64, 3, dt);
      R.camera.updateProjectionMatrix();
    }
  };

  // ---------- the skiff drawn on every screen ----------
  const qInv = new THREE.Quaternion();
  const drawShip = (x, seat, dt, t) => {
    const V = local.view;
    W.setShip(V.p, V.yaw, V.pitch, V.roll);
    const sh = W.ship;
    sh.gear.forEach((l) => {
      l.scale.y = Math.max(0.05, V.gear);
      l.visible = V.gear > 0.06;
    });
    const thrust = clamp(V.speed / BOOST, 0, 1) * 0.8 + V.boost * 0.5;
    sh.flames.forEach((f) => {
      f.material.uniforms.uK.value = thrust;
      f.scale.set(1, 1, 0.6 + thrust * 2.4 + Math.sin(t * 40) * 0.08);
    });
    sh.light.intensity = 0.9 + thrust * 1.2;
    sh.lights.forEach((l, i) => (l.visible = Math.sin(t * 4 + i * 2) > -0.3));
    // the turret follows whoever navigates (my own aim, or theirs)
    const aim = seat === 'nav' ? local.nav : local.mateNav;
    const ay = V.yaw + aim.yaw;
    tmp.set(Math.sin(ay) * Math.cos(aim.pitch), Math.sin(aim.pitch), Math.cos(ay) * Math.cos(aim.pitch));
    sh.g.getWorldQuaternion(qInv).invert();
    tmp.applyQuaternion(qInv);
    sh.turret.rotation.y = Math.atan2(tmp.x, tmp.z);
    sh.gun.rotation.x = -Math.asin(clamp(tmp.y, -1, 1));
    sh.g.updateMatrixWorld(true);
    // fires
    sh.fires.forEach((f, i) => {
      const on = !!(x.fires && x.fires[i]) && flying(x);
      f.g.visible = on;
      if (on) {
        f.core.scale.setScalar(1.4 + Math.sin(t * 23 + i) * 0.3);
        f.smoke.material.opacity = 0.5 + Math.sin(t * 7 + i) * 0.1;
        if (Math.random() < dt * 14) Fx.burst(W.shipPoint(W.SHIP_FIRES[i], V3()), '#ff8a3a', 3, 2, 0.6, 3);
      }
    });
    // trails
    if (flying(x) && V.speed > 4) {
      const up = W.shipUp(tmp2);
      W.pushTrail(W.trails[0], W.shipPoint(V3(5.2, 0.53, -1.6)), up, 0.18);
      W.pushTrail(W.trails[1], W.shipPoint(V3(-5.2, 0.53, -1.6)), up, 0.18);
      W.pushTrail(W.trails[2], W.shipPoint(V3(1.85, -0.18, -4.3)), up, 0.4 + thrust * 0.3);
      W.pushTrail(W.trails[3], W.shipPoint(V3(-1.85, -0.18, -4.3)), up, 0.4 + thrust * 0.3);
    } else W.resetTrails();
    W.trails.forEach((tr) => (tr.m.visible = flying(x)));
  };
  // the two of you in your seats (built from your own looks)
  const seatAv = (look) => {
    if (local.av[look]) return local.av[look];
    const a = Avatar.build(look);
    a.root.scale.setScalar(0.92);
    local.av[look] = a;
    return a;
  };
  const drawSeats = (x, dt, t, on) => {
    ['pilot', 'nav'].forEach((k) => {
      const kit = x.seats && x.seats[k];
      if (!kit) return;
      const a = seatAv(lookOf(kit));
      if (!on) {
        a.root.visible = false;
        return;
      }
      const parent = k === 'pilot' ? W.ship.body : W.ship.turret;
      if (a.root.parent !== parent) parent.add(a.root);
      a.root.visible = true;
      a.root.position.copy(W.SEAT[k]);
      a.root.rotation.set(0, 0, 0);
      a.update(dt, { speed: 0, grounded: true, mode: 'sit', groundY: -1e4, hand: false }, t);
    });
    // hide the other look if nobody holds it
    Object.entries(local.av).forEach(([look, a]) => {
      const used = on && ['pilot', 'nav'].some((k) => x.seats && x.seats[k] && lookOf(x.seats[k]) === look);
      if (!used) a.root.visible = false;
    });
  };

  // ---------- the HUD drawing ----------
  const scr = { x: 0, y: 0, z: 0 };
  const drawHud = (c, x, seat, t) => {
    if (!flying(x)) {
      hud.hide();
      return;
    }
    const g = hud.begin();
    const w = hud.w;
    const h = hud.h;
    const V = local.view;
    // the hull (shared)
    const hullK = clamp((x.hull || 0) / 100, 0, 1);
    const bx = 28;
    const by = h - 64;
    g.font = FONT(11, 500);
    g.fillStyle = 'rgba(251,239,230,0.75)';
    g.fillText('COQUE', bx, by - 8);
    g.fillStyle = 'rgba(13,6,18,0.55)';
    g.fillRect(bx, by, 220, 9);
    const low = hullK < 0.3;
    g.fillStyle = low && Math.sin(t * 10) > 0 ? '#ffd0d8' : '#ff6f9a';
    g.fillRect(bx, by, 220 * hullK, 9);
    g.strokeStyle = 'rgba(251,239,230,0.35)';
    g.strokeRect(bx - 0.5, by - 0.5, 221, 10);
    const nf = (x.fires || []).filter((f) => f).length;
    for (let i = 0; i < nf; i++) {
      g.fillStyle = Math.sin(t * 12 + i) > 0 ? '#ff8a3a' : '#ffcf7a';
      g.beginPath();
      g.moveTo(bx + 232 + i * 16, by + 10);
      g.quadraticCurveTo(bx + 226 + i * 16, by + 2, bx + 232 + i * 16, by - 6);
      g.quadraticCurveTo(bx + 238 + i * 16, by + 2, bx + 232 + i * 16, by + 10);
      g.fill();
    }
    g.fillStyle = 'rgba(251,239,230,0.6)';
    g.fillText(seat === 'pilot' ? 'PILOTE · ' + Story.name(c.role) : 'NAVIGATION · ' + Story.name(c.role), bx, by + 30);
    // hurt flash
    if (local.hurt > 0.01) {
      const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      grd.addColorStop(0, 'rgba(255,60,90,0)');
      grd.addColorStop(1, `rgba(255,60,90,${0.35 * local.hurt})`);
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    if (seat === 'pilot') drawPilotHud(g, x, w, h, t);
    else drawNavHud(g, x, w, h, t);
    // rift warning (both)
    if ((x.stage === 4 || x.stage === 5) && local.frontS != null && V.s - local.frontS < 60) {
      g.font = FONT(15, 600);
      g.textAlign = 'center';
      g.fillStyle = Math.sin(t * 9) > 0 ? '#ff6f8a' : '#ffd0d8';
      g.fillText('LA FAILLE SE REFERME · ' + Math.max(0, Math.round(V.s - local.frontS)) + ' m', w / 2, 92);
      g.textAlign = 'left';
    }
    // landing data (both), once the heart is close
    if (x.stage === 5 && Math.hypot(V.p.x - W.O.x - W.at(W.END_S).x, V.p.z - W.O.z - W.at(W.END_S).z) < 170) {
      const c0 = W.at(W.END_S);
      const dx = V.p.x - (W.O.x + c0.x);
      const dz = V.p.z - (W.O.z + c0.z);
      const dist = Math.hypot(dx, dz);
      const alt = V.p.y - W.O.y - (W.PLAT_Y + PARK_H);
      const hs = Math.hypot(V.vel.x, V.vel.z);
      g.font = FONT(13, 500);
      g.textAlign = 'center';
      const ok = (v, a) => (v < a ? '#9ff0c8' : '#ffd0d8');
      const cx = w / 2;
      const cy = h - 150;
      g.fillStyle = 'rgba(13,6,18,0.5)';
      g.fillRect(cx - 190, cy - 22, 380, 50);
      g.fillStyle = ok(dist, 9);
      g.fillText('CŒUR ' + Math.round(dist) + ' m', cx - 120, cy);
      g.fillStyle = ok(Math.abs(alt), 3);
      g.fillText('HAUTEUR ' + alt.toFixed(1) + ' m', cx, cy);
      g.fillStyle = ok(hs, 6.5);
      g.fillText('VITESSE ' + hs.toFixed(1), cx + 125, cy);
      g.font = FONT(10, 500);
      g.fillStyle = 'rgba(251,239,230,0.6)';
      g.fillText('se poser : moins de 6 de vitesse, au-dessus du cœur', cx, cy + 18);
      g.textAlign = 'left';
    }
  };
  const drawPilotHud = (g, x, w, h, t) => {
    const V = local.view;
    // speed and height, small, at the bottom right
    g.font = FONT(12, 500);
    g.fillStyle = 'rgba(251,239,230,0.75)';
    g.textAlign = 'right';
    g.fillText('VITESSE ' + Math.round(V.speed * 3.6) + ' km/h' + (V.boost ? '  POUSSÉE' : V.brake ? '  FREIN' : ''), w - 28, h - 56);
    const y = V.p.y - W.O.y;
    g.fillText('HAUTEUR ' + Math.round(y) + ' m', w - 28, h - 38);
    g.textAlign = 'left';
    // incoming fire: red chevrons at the edge, toward each bolt that will reach us
    const cam = R.camera;
    const fwd = camFwd(V3());
    local.bolts.forEach((b) => {
      tmp.copy(V.p).sub(b.p);
      const dist = tmp.length();
      if (dist > 110) return;
      if (tmp.dot(b.v) / (dist * b.v.length()) < 0.85) return;
      toScreen(b.p, scr);
      const behind = tmp3.copy(b.p).sub(cam.position).dot(fwd) < 0;
      let sx = scr.x - w / 2;
      let sy = scr.y - h / 2;
      if (behind) {
        sx = -sx;
        sy = -sy;
      }
      const on = !behind && scr.x > 40 && scr.x < w - 40 && scr.y > 40 && scr.y < h - 40;
      const a = Math.atan2(sy, sx);
      const k = clamp(1 - dist / 110, 0.2, 1);
      g.save();
      if (on) g.translate(scr.x, scr.y);
      else g.translate(w / 2 + Math.cos(a) * (Math.min(w, h) * 0.42), h / 2 + Math.sin(a) * (Math.min(w, h) * 0.42));
      g.rotate(a);
      g.fillStyle = `rgba(255,70,100,${0.45 + 0.5 * k})`;
      g.beginPath();
      g.moveTo(16, 0);
      g.lineTo(-6, -10);
      g.lineTo(-1, 0);
      g.lineTo(-6, 10);
      g.closePath();
      g.fill();
      g.restore();
    });
    // the storm: the pilot sees almost nothing; only the flares and a compass of the bend
    if (x.stage === 2) {
      const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.65);
      grd.addColorStop(0, 'rgba(20,16,30,0)');
      grd.addColorStop(1, `rgba(20,16,30,${0.55 * W.skyU.uStorm.value})`);
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    // lightning about to strike near us: a warning (where, the navigator knows)
    local.strikes.forEach((L) => {
      if (L.t >= 2.2) return;
      const d = Math.hypot(V.s - L.s, V.u - L.u);
      if (d > 60) return;
      g.font = FONT(14, 600);
      g.textAlign = 'center';
      g.fillStyle = L.k === 'r' ? (Math.sin(t * 14) > 0 ? '#ffb08a' : '#ffe6d8') : Math.sin(t * 14) > 0 ? '#d8c8ff' : '#ffffff';
      g.fillText(L.k === 'r' ? 'ÉBOULEMENT' : 'FOUDRE', w / 2, h * 0.3);
      g.textAlign = 'left';
    });
  };
  const radar = { x: 0, y: 0, w: 250, h: 300, sc: 0.95 };
  const drawNavHud = (g, x, w, h, t) => {
    const V = local.view;
    const N = local.nav;
    // reticle
    const cx = w / 2;
    const cy = h / 2;
    g.strokeStyle = 'rgba(255,230,238,0.85)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(cx, cy, 12, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 1.8, 0, TAU);
    g.fillStyle = '#ffe6ee';
    g.fill();
    [0, 1, 2, 3].forEach((k) => {
      const a = (k * Math.PI) / 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17);
      g.lineTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24);
      g.stroke();
    });
    // heat ring
    if (x.stage >= 3 && x.stage <= 5) {
      g.strokeStyle = N.over > 0 ? '#ff5a6a' : 'rgba(255,170,190,0.85)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, N.heat));
      g.stroke();
      if (N.over > 0) {
        g.font = FONT(11, 600);
        g.textAlign = 'center';
        g.fillStyle = '#ff7a8a';
        g.fillText('SURCHAUFFE', cx, cy + 50);
        g.textAlign = 'left';
      }
    }
    // grapple lock
    const lk = N.g ? null : N.lock;
    if (lk) {
      toScreen(lk.p, scr);
      if (scr.z < 1) {
        g.strokeStyle = lk.kind ? '#ffb0d0' : '#ff6f9a';
        g.lineWidth = 2;
        const r = 18 + Math.sin(t * 8) * 2;
        [0, 1, 2, 3].forEach((k) => {
          const a = (k * Math.PI) / 2 + Math.PI / 4;
          g.beginPath();
          g.arc(scr.x, scr.y, r, a - 0.4, a + 0.4);
          g.stroke();
        });
      }
    }
    if (N.g && N.g.st === 2) {
      g.strokeStyle = '#ffb0d0';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + TAU * N.g.prog);
      g.stroke();
    }
    // the radar: heading up, the skiff low in the frame
    const rw = Math.min(260, w * 0.24);
    const rh = rw * 1.2;
    const rx = w - rw - 26;
    const ry = h - rh - 26;
    const sc = rw / 300;
    const ox = rx + rw / 2;
    const oy = ry + rh * 0.74;
    g.save();
    g.beginPath();
    g.roundRect ? g.roundRect(rx, ry, rw, rh, 14) : g.rect(rx, ry, rw, rh);
    g.fillStyle = 'rgba(16,6,20,0.62)';
    g.fill();
    g.strokeStyle = 'rgba(255,175,200,0.35)';
    g.lineWidth = 1;
    g.stroke();
    g.clip();
    const cs = Math.cos(V.yaw);
    const sn = Math.sin(V.yaw);
    // world (x, z) -> radar (px, py): forward is up
    const R2 = (wx, wz, out) => {
      const dx = wx - V.p.x;
      const dz = wz - V.p.z;
      const fwd = dx * sn + dz * cs;
      const right = -(dx * cs - dz * sn);
      out.x = ox + right * sc;
      out.y = oy - fwd * sc;
      return out;
    };
    const pt = { x: 0, y: 0 };
    // canyon walls (at the skiff's height)
    const y0 = V.p.y - W.O.y;
    [-1, 1].forEach((side) => {
      g.beginPath();
      let first = true;
      for (let s = V.s - 110; s < V.s + 300; s += 4) {
        if (s < 0 || s > W.LEN) continue;
        const f = W.at(s);
        const lat = side * W.face(s, y0, side, local.frontS);
        R2(W.O.x + f.x - f.tz * lat, W.O.z + f.z + f.tx * lat, pt);
        if (first) g.moveTo(pt.x, pt.y);
        else g.lineTo(pt.x, pt.y);
        first = false;
      }
      g.strokeStyle = 'rgba(255,200,190,0.75)';
      g.lineWidth = 2;
      g.stroke();
    });
    const inRange = (s) => s > V.s - 110 && s < V.s + 300;
    // checkpoints
    W.GATES.forEach((s) => {
      if (!inRange(s)) return;
      const f = W.at(s);
      R2(W.O.x + f.x + f.tz * f.w, W.O.z + f.z - f.tx * f.w, pt);
      const a = { x: pt.x, y: pt.y };
      R2(W.O.x + f.x - f.tz * f.w, W.O.z + f.z + f.tx * f.w, pt);
      g.strokeStyle = 'rgba(255,210,168,0.6)';
      g.setLineDash([3, 4]);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(pt.x, pt.y);
      g.stroke();
      g.setLineDash([]);
    });
    // arches and rockfalls
    if (x.stage <= 1)
      W.ARCHES.forEach((a, i) => {
        if (!inRange(a.s)) return;
        const p = W.world(a.s, a.u, a.y, tmp);
        R2(p.x, p.z, pt);
        const got = x.arch && x.arch[i];
        g.strokeStyle = got ? 'rgba(255,210,122,0.55)' : '#ff8fb8';
        g.lineWidth = 2.5;
        g.beginPath();
        g.ellipse(pt.x, pt.y, a.r * sc + 2, 3, -(W.yawAt(a.s) - V.yaw), 0, TAU);
        g.stroke();
        // height mark: above or below the skiff
        const dyA = a.y - y0;
        if (!got && Math.abs(dyA) > 4) {
          g.fillStyle = '#ffc0d6';
          g.beginPath();
          const s2 = dyA > 0 ? -1 : 1;
          g.moveTo(pt.x + a.r * sc + 8, pt.y + s2 * 5);
          g.lineTo(pt.x + a.r * sc + 12, pt.y - s2 * 3);
          g.lineTo(pt.x + a.r * sc + 4, pt.y - s2 * 3);
          g.fill();
          g.font = FONT(9, 500);
          g.fillText((dyA > 0 ? '+' : '') + Math.round(dyA), pt.x + a.r * sc + 14, pt.y + 3);
        }
      });
    if (x.stage <= 1)
      W.ROCKFALLS.forEach((rf) => {
        if (!inRange(rf.s)) return;
        const f = W.at(rf.s);
        const seg = (u0, u1) => {
          R2(W.O.x + f.x - f.tz * u0, W.O.z + f.z + f.tx * u0, pt);
          g.moveTo(pt.x, pt.y);
          R2(W.O.x + f.x - f.tz * u1, W.O.z + f.z + f.tx * u1, pt);
          g.lineTo(pt.x, pt.y);
        };
        g.strokeStyle = 'rgba(220,150,150,0.9)';
        g.lineWidth = 4;
        g.beginPath();
        seg(-f.w - 6, rf.u - rf.g);
        seg(rf.u + rf.g, f.w + 6);
        g.stroke();
      });
    // spires
    if (x.stage === 2)
      W.SPIRES.forEach((sp) => {
        if (!inRange(sp.s)) return;
        const p = W.world(sp.s, sp.u, 0, tmp);
        R2(p.x, p.z, pt);
        g.fillStyle = 'rgba(232,170,170,0.9)';
        g.beginPath();
        g.arc(pt.x, pt.y, Math.max(3, sp.r * 1.1 * sc), 0, TAU);
        g.fill();
      });
    // lightning
    local.strikes.forEach((L) => {
      const p = W.world(L.s, L.u, 0, tmp);
      R2(p.x, p.z, pt);
      const k = clamp(L.t / 2.2, 0, 1);
      const rc = L.k === 'r' ? '255,176,138' : '216,200,255';
      g.strokeStyle = L.t < 2.2 ? `rgba(${rc},${0.5 + 0.5 * Math.sin(t * 16)})` : 'rgba(255,255,255,0.9)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(pt.x, pt.y, 9.5 * sc, 0, TAU);
      g.stroke();
      g.fillStyle = `rgba(${rc},0.25)`;
      g.beginPath();
      g.moveTo(pt.x, pt.y);
      g.arc(pt.x, pt.y, 9.5 * sc, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      g.fill();
    });
    // hearts, drones, bolts, mines
    if (x.stage >= 3 && x.stage <= 4)
      W.HEARTS.forEach((hh, i) => {
        if ((x.hearts && x.hearts[i]) || !inRange(hh.s)) return;
        const p = W.world(hh.s, hh.u, hh.y, tmp);
        R2(p.x, p.z, pt);
        g.fillStyle = '#ff6f9a';
        heartPath(g, pt.x, pt.y, 5);
        g.fill();
      });
    local.drones.forEach((d) => {
      const p = dronePos(d, tmp);
      R2(p.x, p.z, pt);
      g.fillStyle = d.charge > 0.05 && Math.sin(t * 20) > 0 ? '#ffffff' : '#ff4a6a';
      g.beginPath();
      g.moveTo(pt.x, pt.y - 6);
      g.lineTo(pt.x + 5, pt.y + 4);
      g.lineTo(pt.x - 5, pt.y + 4);
      g.closePath();
      g.fill();
    });
    local.bolts.forEach((b) => {
      R2(b.p.x, b.p.z, pt);
      g.fillStyle = '#ff7a90';
      g.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    });
    local.mines.forEach((m) => {
      R2(m.p.x, m.p.z, pt);
      g.strokeStyle = '#ff4a6a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(pt.x - 5, pt.y - 5);
      g.lineTo(pt.x + 5, pt.y + 5);
      g.moveTo(pt.x + 5, pt.y - 5);
      g.lineTo(pt.x - 5, pt.y + 5);
      g.stroke();
    });
    local.lasers.forEach((L) => {
      if (!inRange(L.s)) return;
      const f = W.at(L.s);
      let u0 = -f.w;
      let u1 = f.w;
      if (L.mode === 'L') u1 = 0;
      if (L.mode === 'R') u0 = 0;
      R2(W.O.x + f.x - f.tz * u0, W.O.z + f.z + f.tx * u0, pt);
      const a = { x: pt.x, y: pt.y };
      R2(W.O.x + f.x - f.tz * u1, W.O.z + f.z + f.tx * u1, pt);
      const on = L.t >= 2.2;
      g.strokeStyle = on ? '#ff3a5a' : `rgba(255,90,120,${0.4 + 0.4 * Math.sin(t * 14)})`;
      g.lineWidth = L.mode === 'U' || L.mode === 'D' ? 3 : 5;
      g.setLineDash(L.mode === 'U' || L.mode === 'D' ? [5, 3] : []);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(pt.x, pt.y);
      g.stroke();
      g.setLineDash([]);
      g.font = FONT(9, 600);
      g.fillStyle = '#ff9aac';
      if (L.mode === 'U') g.fillText('HAUT', (a.x + pt.x) / 2 - 12, a.y - 6);
      if (L.mode === 'D') g.fillText('BAS', (a.x + pt.x) / 2 - 10, a.y - 6);
    });
    // the mothership and its cores
    if (local.mom.on && local.mom.dieT < 0) {
      const p = momPos(tmp);
      R2(p.x, p.z, pt);
      g.save();
      g.translate(pt.x, pt.y);
      g.rotate(-(local.mom.yaw - V.yaw));
      g.fillStyle = 'rgba(230,220,226,0.35)';
      g.beginPath();
      g.ellipse(0, 0, 17 * sc, 34 * sc, 0, 0, TAU);
      g.fill();
      g.restore();
      W.CORES.forEach((cc, i) => {
        if (x.cores && x.cores[i]) return;
        const q = corePos(i, tmp2);
        if (!q) return;
        R2(q.x, q.z, pt);
        g.fillStyle = Math.sin(t * 6 + i) > 0 ? '#ffd0e4' : '#ff8fc0';
        g.beginPath();
        g.arc(pt.x, pt.y, 4, 0, TAU);
        g.fill();
      });
    }
    // the closing front
    if ((x.stage === 4 || x.stage === 5) && local.frontS != null && inRange(local.frontS)) {
      const f = W.at(local.frontS);
      R2(W.O.x + f.x + f.tz * (f.w + 10), W.O.z + f.z - f.tx * (f.w + 10), pt);
      const a = { x: pt.x, y: pt.y };
      R2(W.O.x + f.x - f.tz * (f.w + 10), W.O.z + f.z + f.tx * (f.w + 10), pt);
      g.strokeStyle = '#ff3a5a';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(pt.x, pt.y);
      g.stroke();
    }
    // dams
    [
      [W.BAR_S, dam0On(x)],
      [W.BOSS_BAR_S, dam1On(x)],
    ].forEach(([s, on]) => {
      if (!on || !inRange(s)) return;
      const f = W.at(s);
      R2(W.O.x + f.x + f.tz * f.w, W.O.z + f.z - f.tx * f.w, pt);
      const a = { x: pt.x, y: pt.y };
      R2(W.O.x + f.x - f.tz * f.w, W.O.z + f.z + f.tx * f.w, pt);
      g.strokeStyle = `rgba(255,90,130,${0.6 + 0.3 * Math.sin(t * 6)})`;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(pt.x, pt.y);
      g.stroke();
    });
    // the heart platform
    if (x.stage >= 4) {
      const f = W.at(W.END_S);
      R2(W.O.x + f.x, W.O.z + f.z, pt);
      g.fillStyle = 'rgba(255,111,154,0.75)';
      heartPath(g, pt.x, pt.y, Math.max(6, 14 * sc));
      g.fill();
    }
    // the skiff
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(ox, oy - 8);
    g.lineTo(ox + 6, oy + 6);
    g.lineTo(ox, oy + 3);
    g.lineTo(ox - 6, oy + 6);
    g.closePath();
    g.fill();
    // where the turret looks
    g.strokeStyle = 'rgba(255,230,238,0.35)';
    g.beginPath();
    g.moveTo(ox, oy);
    g.lineTo(ox + Math.sin(-N.yaw) * 40, oy - Math.cos(N.yaw) * 40);
    g.stroke();
    g.restore();
    g.font = FONT(10, 500);
    g.fillStyle = 'rgba(251,239,230,0.6)';
    g.fillText('RADAR · HAUTEUR ' + Math.round(y0) + ' m', rx + 10, ry - 8);
  };

  // ---------- the host: progress, drones, the mothership, the rift ----------
  const crash = (c) => {
    const x = c.S.x;
    const H = local.host;
    fxBoth(c, ['crash', ...local.view.p.toArray()]);
    clearHazards(c);
    c.set((s) => {
      s.x.rs = (s.x.rs || 0) + 1;
      s.x.hull = 100;
      s.x.fires = [0, 0, 0];
      s.x.waves = (s.x.waves || [0, 0, 0]).map((v) => (v === 1 ? 0 : v));
    });
    const cpS = x.cp ? W.passS[x.cp] : W.PAD_S;
    H.front.s = cpS - 170;
    H.mom.s = cpS + 200;
    H.atkT = 6;
    H.rise = 0;
    H.shield = [SHIELD, SHIELD, SHIELD, SHIELD];
    setShield(c, H.shield);
    sayBoth(c, TXT.crash);
  };
  const clearHazards = (c) => {
    const H = local.host;
    H.drones.length = 0;
    H.mines.length = 0;
    local.drones.clear();
    local.bolts.clear();
    local.mines.clear();
    local.lasers.length = 0;
    local.strikes.length = 0;
    c.send('c7x', ['all']);
  };
  const spawnDrone = (c, wave, from, slot) => {
    const H = local.host;
    const V = local.view;
    const back = from === 'back' || (from === 'mix' && slot % 2 === 0);
    const s = clamp(V.s + (back ? -95 : 150), 30, W.LEN - 20);
    const f = W.at(s);
    const d = { id: H.id++, s, u: (Math.random() * 2 - 1) * (f.w - 10), y: 30 + Math.random() * 40, hp: 6, slot: 0, cd: 2 + Math.random() * 2.5, charge: 0, wave };
    // slots: keep a few behind, some ahead
    const order = back ? [0, 1, 2, 5, 6, 8, 9, 12] : [3, 4, 7, 10, 11, 13];
    const used = new Set(H.drones.map((q) => q.slot));
    d.slot = order.find((k) => !used.has(k));
    if (d.slot == null) d.slot = Math.floor(Math.random() * SLOTS.length);
    H.drones.push(d);
    local.drones.set(d.id, { id: d.id, s: d.s, u: d.u, y: d.y, ts: d.s, tu: d.u, ty: d.y, charge: 0 });
  };
  const hostDrones = (c, x, dt, t) => {
    const H = local.host;
    const V = local.view;
    const chargers = H.drones.filter((d) => d.charge > 0).length;
    H.drones.forEach((d) => {
      const sl = SLOTS[d.slot];
      const ts = V.s + sl[0];
      const f = W.at(ts);
      const lim = Math.max(4, f.w - 9);
      const tu = clamp(V.u + sl[1] + Math.sin(t * 0.8 + d.id) * 5, -lim, lim);
      const ty = clamp(V.p.y - W.O.y + sl[2] + Math.sin(t * 1.1 + d.id * 2) * 3, W.FLOOR + 6, W.ceilAt(ts) - 4);
      // ease along the canyon (never through the rock)
      const ks = 1 - Math.exp(-1.6 * dt);
      d.s += (ts - d.s) * ks;
      d.u += (tu - d.u) * (1 - Math.exp(-1.2 * dt));
      d.y += (ty - d.y) * (1 - Math.exp(-1.2 * dt));
      const ld = local.drones.get(d.id);
      if (ld) {
        ld.s = d.s;
        ld.u = d.u;
        ld.y = d.y;
        ld.charge = d.charge;
      }
      // the attack: a long charge (the eye swells), then a bolt where we will be
      d.cd -= dt;
      const p = dronePos(d, tmp);
      const dist = p.distanceTo(V.p);
      if (d.charge > 0) {
        d.charge += dt / 1.1;
        if (d.charge >= 1) {
          d.charge = 0;
          d.cd = (x.stage === 4 ? 4.4 : 3.3) + Math.random() * 2.4;
          const tt = dist / BOLT_V;
          const aim = tmp2.copy(V.p).addScaledVector(V.vel, tt * 0.85);
          const v = aim.sub(p).normalize().multiplyScalar(BOLT_V);
          const id = H.id++;
          const msg = [id, ...p.toArray().map((q) => +q.toFixed(2)), ...v.toArray().map((q) => +q.toFixed(2))];
          addBolt(msg);
          c.send('c7b', msg);
          Sound.play('portalShoot');
        }
      } else if (d.cd <= 0 && dist < 95 && chargers < 2 && !local.sim.landed) {
        d.charge = 0.001;
      }
    });
    H.sendD += dt;
    if (H.sendD > 0.08) {
      H.sendD = 0;
      const arr = H.drones.map((d) => [d.id, +d.s.toFixed(1), +d.u.toFixed(1), +d.y.toFixed(1), +d.charge.toFixed(2)]);
      c.send('c7d', arr);
      setDrones(arr, true);
    }
  };
  const setDrones = (arr, host) => {
    const seen = new Set();
    arr.forEach(([id, s, u, y, ch]) => {
      seen.add(id);
      let d = local.drones.get(id);
      if (!d) {
        d = { id, s, u, y, ts: s, tu: u, ty: y, charge: ch };
        local.drones.set(id, d);
      }
      d.ts = s;
      d.tu = u;
      d.ty = y;
      d.charge = ch;
      if (host) {
        d.s = s;
        d.u = u;
        d.y = y;
      }
    });
    local.drones.forEach((d, id) => !seen.has(id) && local.drones.delete(id));
  };
  const addBolt = (m) => {
    local.bolts.set(m[0], { p: V3(m[1], m[2], m[3]), v: V3(m[4], m[5], m[6]), t: 0 });
  };
  const hostWaves = (c, x) => {
    const V = local.view;
    const waves = x.waves || [0, 0, 0];
    let changed = false;
    const nw = waves.slice();
    WAVES.forEach((wv, i) => {
      if (nw[i] === 0 && (V.s >= wv.at() || V.s >= W.BAR_S - 160) && (i === 0 || nw[i - 1] >= 1)) {
        nw[i] = 1;
        changed = true;
        for (let k = 0; k < wv.n; k++) spawnDrone(c, i, wv.from, k);
        if (i === 0) sayRoleBoth(c, TXT.s3);
      }
      if (nw[i] === 1 && !local.host.drones.some((d) => d.wave === i)) {
        nw[i] = 2;
        changed = true;
      }
    });
    if (changed) {
      const allDone = nw.every((v) => v === 2);
      c.set((s) => (s.x.waves = nw));
      if (allDone) sayBoth(c, TXT.damDown);
    }
  };
  const sayRoleBoth = (c, by) => {
    sayRole(c, by);
    c.send('c7sayr', by);
  };
  const hostMom = (c, x, dt, t) => {
    const H = local.host;
    const V = local.view;
    const M = H.mom;
    const left = (x.cores || [0, 0, 0, 0]).filter((v) => !v).length;
    // lead the chase, park at the basin if it still lives
    H.rise = Math.max(0, H.rise - dt);
    const rise = H.rise > 0;
    const lead = rise ? 150 : 66;
    let tsS = V.s + lead;
    if (dam1On(x)) tsS = Math.min(tsS, W.BOSS_BAR_S + 34);
    M.s += (tsS - M.s) * (1 - Math.exp(-0.9 * dt));
    M.s = clamp(M.s, W.RIFT_S - 100, W.LEN - 40);
    const f = W.at(M.s);
    const ul = Math.max(0, f.w - 17);
    M.u = clamp(Math.sin(t * 0.25) * 10, -ul, ul);
    // it flies low enough to be seen from the cockpit, and climbs away when hurt
    const wantY = clamp(V.p.y - W.O.y + (rise ? 44 : 25), W.FLOOR + 32, W.ceilAt(M.s) + 8.5);
    M.y += (wantY + Math.sin(t * 0.4) * 1.5 - M.y) * (1 - Math.exp(-(rise ? 0.8 : 0.5) * dt));
    M.yaw = Math.atan2(f.tx, f.tz) + Math.sin(t * 0.3) * 0.06;
    Object.assign(local.mom, { s: M.s, u: M.u, y: M.y, yaw: M.yaw, ts: M.s, tu: M.u, ty: M.y, tyaw: M.yaw });
    // attacks
    H.stagger = Math.max(0, H.stagger - dt);
    H.atkT -= dt;
    if (H.atkT <= 0 && H.stagger <= 0 && !local.sim.landed) {
      const phase = 4 - left;
      H.atkT = (Math.max(2.4, 4.4 - phase * 0.45) + Math.random() * 1.2) * (rise ? 0.75 : 1);
      const r = Math.random();
      const alive = H.drones.length;
      if (r < 0.5 || (r > 0.85 && alive >= 2)) {
        const modes = ['L', 'R', 'U', 'D'];
        const mode = modes[Math.floor(Math.random() * 4)];
        const s = V.s + V.speed * 4 + 8;
        const L = [H.id++, +s.toFixed(1), mode];
        addLaser(L);
        c.send('c7z', L);
      } else if (r < 0.85) {
        const from = momPos(V3()).toArray().map((q) => +q.toFixed(1));
        for (let k = 0; k < 2 + Math.min(2, phase); k++) {
          const s = V.s + 70 + k * 16 + Math.random() * 8;
          const fm = W.at(s);
          const m = [H.id++, +s.toFixed(1), +((Math.random() * 2 - 1) * (fm.w - 10)).toFixed(1), +(W.FLOOR + 10 + Math.random() * (W.ceilAt(s) - W.FLOOR - 20)).toFixed(1), ...from];
          H.mines.push({ id: m[0], s, hp: 2 });
          addMine(m);
          c.send('c7n', m);
        }
        Sound.play('rumble', 0.5);
      } else if (alive < 2) {
        spawnDrone(c, 9, 'mix', 0);
        spawnDrone(c, 9, 'mix', 1);
      }
    }
    // mines left far behind go away
    H.mines = H.mines.filter((m) => {
      if (m.s < V.s - 40) {
        local.mines.delete(m.id);
        c.send('c7x', ['m', m.id]);
        return false;
      }
      return true;
    });
    H.sendM += dt;
    if (H.sendM > 0.066) {
      H.sendM = 0;
      const msg = [+M.s.toFixed(2), +M.u.toFixed(2), +M.y.toFixed(2), +M.yaw.toFixed(3)];
      c.send('c7m', msg);
      setMom(msg, true);
    }
  };
  const setMom = (m, host) => {
    const L = local.mom;
    L.ts = m[0];
    L.tu = m[1];
    L.ty = m[2];
    L.tyaw = m[3];
    if (!L.on) L.k = 0;
    if (host || !L.on) {
      L.s = m[0];
      L.u = m[1];
      L.y = m[2];
      L.yaw = m[3];
    }
    L.on = true;
  };
  const setShield = (c, arr) => {
    local.shield = arr.slice();
    c.send('c7sh', local.shield);
  };
  const addLaser = (L) => local.lasers.push({ id: L[0], s: L[1], mode: L[2], t: 0 });
  const addMine = (m) => local.mines.set(m[0], { s: m[1], u: m[2], y: m[3], p: W.world(m[1], m[2], m[3]), from: m.length > 4 ? V3(m[4], m[5], m[6]) : null, t: 0 });
  const hostFront = (c, x, dt) => {
    const H = local.host;
    const V = local.view;
    const Fr = H.front;
    const left = (x.cores || [0, 0, 0, 0]).filter((v) => !v).length;
    const gap = V.s - Fr.s;
    // it hunts: fast while far behind, then a little slower than a cruising skiff (faster after the boss)
    Fr.v = gap > 230 ? 30 : gap > 95 ? 25 : x.stage === 5 ? 22.2 : 19 + (4 - left) * 0.5;
    // after the boss, the rift still closes, all the way to the basin
    const stop = x.stage === 5 ? W.END_S - 175 : W.BOSS_BAR_S - 240;
    Fr.s = Math.min(Fr.s + Fr.v * dt, stop);
    if (Fr.s >= stop) Fr.v = 0;
    H.sendF += dt;
    if (H.sendF > 0.25) {
      H.sendF = 0;
      c.send('c7f', [+Fr.s.toFixed(2), Fr.v]);
    }
    local.frontS = Fr.s;
    local.frontV = Fr.v;
  };
  const hostLightning = (c, x, dt) => {
    const H = local.host;
    const V = local.view;
    H.lightT -= dt;
    if (H.lightT > 0) return;
    H.lightT = 3.4 + Math.random() * 2.2;
    const s = V.s + Math.max(10, V.speed) * 2.3 + (Math.random() - 0.3) * 18;
    const f = W.at(s);
    const u = clamp(V.u + (Math.random() * 2 - 1) * 7, -(f.w - 4), f.w - 4);
    const L = [H.id++, +s.toFixed(1), +u.toFixed(1)];
    local.strikes.push({ id: L[0], s: L[1], u: L[2], t: 0 });
    c.send('c7l', L);
    if (!local.said.light) {
      local.said.light = true;
      sayBoth(c, TXT.lightning);
    }
  };

  const hostDebris = (c, x, dt) => {
    const H = local.host;
    const V = local.view;
    if (V.s > W.END_S - 260) return;
    H.debT = (H.debT == null ? 2 : H.debT) - dt;
    if (H.debT > 0) return;
    H.debT = 2.6 + Math.random() * 1.6;
    const s = V.s + Math.max(10, V.speed) * 2.6 + (Math.random() - 0.3) * 16;
    const f = W.at(s);
    const u = clamp(V.u + (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 9), -(f.w - 5), f.w - 5);
    const L = [H.id++, +s.toFixed(1), +u.toFixed(1), 'r'];
    local.strikes.push({ id: L[0], s: L[1], u: L[2], k: 'r', t: 0 });
    c.send('c7l', L);
    if (!local.said.debris) {
      local.said.debris = true;
      sayBoth(c, TXT.debris);
    }
  };

  // ---------- the register ----------
  Story.register('tr_c7', {
    init: () => ({
      stage: 0,
      moor: [0, 0],
      seats: { pilot: null, nav: null },
      cp: 0,
      rs: 0,
      hull: 100,
      fires: [0, 0, 0],
      arch: [],
      hearts: [],
      waves: [0, 0, 0],
      cores: [0, 0, 0, 0],
      boss: 0,
      go: 0,
      landP: null,
      landYaw: 0,
      cardP: null,
    }),
    voice: () => 1,
    partner: (c) => !flying(c.S.x),
    hideRemote: (c) => flying(c.S.x),
    net: {
      c7v: (c, d) => pushPose(d),
      c7a: (c, d) => {
        local.mateNav.yaw = d[0];
        local.mateNav.pitch = d[1];
      },
      c7g: (c, d) => {
        local.mateNav.g = d[0] ? { st: d[0], kind: d[1], i: d[2], prog: d[3] } : null;
      },
      c7t: (c, d) => {
        W.tracer(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5]));
        Eng.gun();
      },
      c7fl: (c, d) => {
        W.flare(V3(d[0], d[1], d[2]));
        Sound.play('portalShoot');
      },
      c7d: (c, d) => !Net.isHost && setDrones(d, false),
      c7b: (c, d) => !Net.isHost && addBolt(d),
      c7n: (c, d) => !Net.isHost && addMine(d),
      c7z: (c, d) => !Net.isHost && addLaser(d),
      c7l: (c, d) => !Net.isHost && local.strikes.push({ id: d[0], s: d[1], u: d[2], k: d[3] || 'l', t: 0 }),
      c7m: (c, d) => !Net.isHost && setMom(d, false),
      c7f: (c, d) => {
        if (Net.isHost) return;
        local.frontS = d[0];
        local.frontV = d[1];
      },
      c7x: (c, d) => {
        if (Net.isHost) return;
        if (d[0] === 'all') {
          local.drones.clear();
          local.bolts.clear();
          local.mines.clear();
          local.lasers.length = 0;
          local.strikes.length = 0;
        }
        if (d[0] === 'b') local.bolts.delete(d[1]);
        if (d[0] === 'm') local.mines.delete(d[1]);
        if (d[0] === 'r') local.strikes = local.strikes.filter((q) => q.id !== d[1]);
      },
      c7fx: (c, d) => fx(c, d),
      c7sh: (c, d) => {
        if (Net.isHost) return;
        d.forEach((v, i) => v < local.shield[i] && W.mom.cores[i] && (W.mom.cores[i].flash = 1));
        local.shield = d.slice();
      },
      c7say: (c, d) => HUD.say(d[0], T.master, 2400),
      c7sayr: (c, d) => sayRole(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.wake();
      const x = c.S.x;
      local.stage = -1;
      local.rs = x.rs;
      local.buf.length = 0;
      local.off = null;
      local.camOk = false;
      local.host = newHost();
      local.drones.clear();
      local.bolts.clear();
      local.mines.clear();
      local.lasers.length = 0;
      local.strikes.length = 0;
      local.mom.on = false;
      local.mom.dieT = -1;
      local.frontS = null;
      local.said = {};
      local.nav.g = null;
      local.heartSent = {};
      local.cardK = 0;
      local.shield = [SHIELD, SHIELD, SHIELD, SHIELD];
      // spawn on the shelf, behind the skiff
      const sp = (role) => W.world(W.PAD_S - 13, role === 'dame' ? -3.5 : 3.5, W.PAD_Y + 0.05);
      c.spawn(sp(c.role), W.yawAt(W.PAD_S));
      Cam.yaw = W.yawAt(W.PAD_S);
      Player.killY = W.O.y + W.PAD_Y - 16;
      Player.checkpoint = () => {
        const xx = Story.S.x;
        if (xx.stage >= 6 && xx.cardP) return V3(xx.cardP[0] + 2, W.O.y + W.PLAT_Y + 0.1, xx.cardP[1]);
        return sp(c.role);
      };
      // the sunset (restored on exit)
      if (!local.env)
        local.env = {
          hi: R.hemi.intensity,
          hs: R.hemi.color.getHex(),
          hg: R.hemi.groundColor.getHex(),
          mi: R.moon.intensity,
          mc: R.moon.color.getHex(),
          mp: R.moon.position.clone(),
          br: R.scene.onBeforeRender,
          fov: R.camera.fov,
        };
      local.haze = new THREE.Color('#c07a90');
      R.scene.onBeforeRender = () => {
        R.scene.fog.color.copy(local.haze);
        R.scene.background.copy(local.haze);
      };
      City.mood({ gold: 0.6 });
      lightMood(0);
      c.fog(0.006);
      HUD.visa('♣ 7 · ' + TITLE);
      if (W.pad.screen) W.pad.screen.show(TITLE, '♣ 7 · l’un pilote, l’autre voit', '#ffb0c8');
      // the parked skiff's colliders (walk around it, not through it)
      if (!local.parkBoxes) {
        const p = W.rel(W.world(W.PAD_S, 0, W.PAD_Y + PARK_H));
        local.parkBoxes = [Phys.box(W.O.x + p.x, W.O.y + W.PAD_Y + 1.3, W.O.z + p.z, 9.6, 2.6, 2.7), Phys.box(W.O.x + p.x - 0.6, W.O.y + W.PAD_Y + 1.45, W.O.z + p.z, 3.6, 0.45, 10.2)];
      }
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (x.stage === 0) {
        HUD.say(TXT.intro, T.master, 3600);
        HUD.say(TXT.rule, T.master, 4800);
        HUD.say(TXT.foot, T.master, 5200);
      }
      Eng.start();
      this.apply(c);
    },
    exit() {
      if (local.env) {
        R.hemi.intensity = local.env.hi;
        R.hemi.color.setHex(local.env.hs);
        R.hemi.groundColor.setHex(local.env.hg);
        R.moon.intensity = local.env.mi;
        R.moon.color.setHex(local.env.mc);
        R.moon.position.copy(local.env.mp);
        R.scene.onBeforeRender = local.env.br || (() => {});
        R.camera.fov = local.env.fov;
        R.camera.updateProjectionMatrix();
        local.env = null;
      }
      R.camera.up.set(0, 1, 0);
      Player.locked = false;
      if (Player.mode === 'sit') Player.mode = 'walk';
      if (local.parkBoxes) local.parkBoxes.forEach((b) => (b.on = false));
      if (local.dynBox) local.dynBox.on = false;
      Object.values(local.av).forEach((a) => (a.root.visible = false));
      HUD.boss(null);
      hud.hide();
      Eng.stop();
      W.sleep();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      const seat = seatOf(x, c.role);
      if (local.parkBoxes) local.parkBoxes.forEach((b) => (b.on = x.stage === 0));
      W.plat.boxes.forEach((b) => (b.on = x.stage >= 5));
      if (x.rs !== local.rs) {
        local.rs = x.rs;
        if (seat === 'pilot' && flying(x)) resetSim(x, false);
        local.camOk = false;
        local.buf.length = 0;
        local.nav.g = null;
        local.heartSent = {};
        if (x.stage === 4) {
          local.mom.on = false;
        }
      }
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (x.stage >= 1 && prev < 1) {
          // into the seats for good
          Player.mode = 'sit';
          Player.locked = true;
          Cam.yaw = local.cy = 0;
          Cam.pitch = local.cpch = 0.18;
          local.nav.yaw = 0;
          local.nav.pitch = 0.1;
          if (seat === 'pilot') resetSim(x, x.stage === 1 && prev === 0);
          local.camOk = false;
        }
        if (x.stage === 1 && prev === 0) {
          fx(c, ['go']);
          sayRole(c, TXT.s1);
        }
        if (x.stage === 2) {
          Sound.mood('dark');
          if (prev >= 0) sayRole(c, TXT.s2);
        }
        if (x.stage === 3) Sound.mood('tense');
        if (x.stage === 4) {
          Sound.mood('tense');
          local.mom.on = false;
          local.mom.dieT = -1;
          if (prev >= 0) {
            sayRole(c, TXT.s4);
            Sound.play('roar');
            local.shake = Math.max(local.shake, 0.6);
          }
        }
        if (x.stage === 5) {
          Sound.mood('gold');
          HUD.boss(null);
          if (prev >= 0) {
            HUD.say(TXT.die, T.master, 2400);
            sayRole(c, TXT.s5);
          }
        }
        if (x.stage === 6) {
          HUD.boss(null);
          Sound.mood('gold');
          City.mood({ gold: 0.85 });
          // out of the seats, onto the heart
          Player.locked = false;
          Player.mode = 'walk';
          const lp = x.landP;
          const yaw = x.landYaw || 0;
          const sideK = seat === 'nav' ? -1 : 1;
          // climbed down on the card's side of the skiff, side by side, facing it
          const cp = x.cardP || [W.O.x + W.at(W.END_S).x, W.O.z + W.at(W.END_S).z];
          const from = lp || cp;
          const dx = cp[0] - from[0];
          const dz = cp[1] - from[1];
          const dl = Math.hypot(dx, dz) || 1;
          const k = lp ? Math.max(5.6, Math.min(dl - 4.6, 8)) / dl : 0;
          const p = V3(from[0] + dx * k - (dz / dl) * 1.6 * sideK, W.O.y + W.PLAT_Y + 0.1, from[1] + dz * k + (dx / dl) * 1.6 * sideK);
          if (!W.onHeart(p.x, p.z, 0.8)) p.set(cp[0] + sideK * 2.5, W.O.y + W.PLAT_Y + 0.1, cp[1]);
          c.spawn(p, Math.atan2(dx, dz));
          Cam.yaw = Math.atan2(dx, dz);
          Object.values(local.av).forEach((a) => (a.root.visible = false));
          // the parked skiff on the heart
          if (lp) {
            if (!local.dynBox) local.dynBox = Phys.box(0, -1e4, 0, 1, 1, 1, { dyn: true });
            const cx2 = Math.abs(Math.sin(yaw)) * 9.6 + Math.abs(Math.cos(yaw)) * 2.6;
            const cz2 = Math.abs(Math.cos(yaw)) * 9.6 + Math.abs(Math.sin(yaw)) * 2.6;
            local.dynBox.min = [lp[0] - cx2 / 2, W.O.y + W.PLAT_Y, lp[1] - cz2 / 2];
            local.dynBox.max = [lp[0] + cx2 / 2, W.O.y + W.PLAT_Y + 2.6, lp[1] + cz2 / 2];
            local.dynBox.on = true;
          }
          if (prev >= 0) {
            HUD.say(TXT.landed, T.master, 2200);
            HUD.say(TXT.card, T.master, 3200);
          }
        }
      }
      if (x.stage === 4 && x.boss === 1) {
        const left = x.cores.filter((v) => !v).length;
        HUD.boss('Le Vaisseau-mère', left / 4, left + ' noyau' + (left > 1 ? 'x' : ''));
      }
      if (x.boss === 2 && local.mom.dieT < 0 && local.mom.on) local.mom.dieT = 0;
      // keep the stage text current
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const H = local.host;
      const t = Story.ctx.phaseT;
      if (x.stage === 0) {
        const ok = x.seats.pilot && x.seats.nav && x.moor[0] && x.moor[1];
        H.goT = ok ? H.goT + dt : 0;
        if (H.goT > 1.6) {
          c.set((s) => {
            s.x.stage = 1;
            s.x.go = 1;
          });
          c.send('c7say', [TXT.go]);
          HUD.say(TXT.go, T.master, 1800);
        }
        return;
      }
      if (x.stage >= 6) {
        // both at the card
        const cp = x.cardP;
        if (!cp) return;
        local.cardK += dt;
        const near = (p) => Math.hypot(p.x - cp[0], p.z - cp[1]) < 3.4 && Math.abs(p.y - (W.O.y + W.PLAT_Y)) < 3;
        if (local.cardK > 2.5 && near(c.pos('dame')) && near(c.pos('valet'))) c.goto('reward', (s) => (s.x.card = 'c7'));
        return;
      }
      const V = local.view;
      if (!V.ok) return;
      // checkpoints: the start of each pass
      let k = 0;
      for (let i = 0; i < W.passS.length; i++) if (V.s >= W.passS[i] + 4) k = i;
      if (k > (x.cp || 0)) {
        c.set((s) => (s.x.cp = k));
        fxBoth(c, ['cp']);
      }
      // sections
      if (x.stage === 1 && V.s >= W.SEC[1]) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && V.s >= W.SEC[2]) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3 && V.s >= W.SEC[3] && !dam0On(x)) {
        H.front.s = W.RIFT_S - 170;
        H.mom.s = V.s + 160;
        H.atkT = 6;
        H.rise = 0;
        H.shield = [SHIELD, SHIELD, SHIELD, SHIELD];
        setShield(c, H.shield);
        c.set((s) => {
          s.x.stage = 4;
          s.x.boss = 1;
        });
      }
      // the hull: fires burn it slowly
      H.fireT += dt;
      if (H.fireT >= 1) {
        H.fireT = 0;
        const n = (x.fires || []).filter((f) => f).length;
        if (n && !local.sim.landed) c.set((s) => (s.x.hull = Math.max(0, s.x.hull - n * 1.5)));
      }
      if (x.hull <= 0) {
        crash(c);
        return;
      }
      if (x.hull < 30 && !H.lowSaid) {
        H.lowSaid = true;
        sayBoth(c, TXT.low);
      }
      if (x.hull > 50) H.lowSaid = false;
      if (x.stage === 1 && !local.said.s1b && V.s > W.passS[1] - 20) {
        local.said.s1b = true;
        sayBoth(c, TXT.s1b);
      }
      if (x.stage === 2) hostLightning(c, x, dt);
      if (x.stage === 3) hostWaves(c, x);
      if (x.stage === 3 || x.stage === 4) hostDrones(c, x, dt, t);
      if (x.stage === 5) {
        hostFront(c, x, dt);
        hostDebris(c, x, dt);
      }
      if (x.stage === 4) {
        hostFront(c, x, dt);
        if (x.boss === 1) hostMom(c, x, dt, t);
        if (dam1On(x) && V.s > W.BOSS_BAR_S - 60 && !local.said.bar) {
          local.said.bar = true;
          sayBoth(c, TXT.bar);
        }
      }
      if ((x.stage === 4 || x.stage === 5) && local.frontS != null && V.s - local.frontS < 30) {
        H.crushSay = (H.crushSay || 0) - dt;
        if (H.crushSay <= 0) {
          H.crushSay = 7;
          sayBoth(c, TXT.crush);
        }
      }
      H.damSay = Math.max(0, H.damSay - dt);
    },
    action(c, who, d) {
      const x = c.S.x;
      const H = local.host;
      if (d.a === 'moor' && x.stage === 0 && !x.moor[d.i]) {
        c.set((s) => (s.x.moor = s.x.moor.map((v, i) => (i === d.i ? 1 : v))));
        fxBoth(c, ['moor', d.i]);
      }
      if (d.a === 'seat' && x.stage === 0) {
        if (x.seats[d.k] && x.seats[d.k] !== who) return;
        c.set((s) => {
          const o = d.k === 'pilot' ? 'nav' : 'pilot';
          if (s.x.seats[o] === who) s.x.seats[o] = null;
          s.x.seats[d.k] = who;
        });
        fxBoth(c, ['seat']);
      }
      if (d.a === 'unseat' && x.stage === 0) {
        c.set((s) => {
          ['pilot', 'nav'].forEach((k) => s.x.seats[k] === who && (s.x.seats[k] = null));
        });
      }
      if (d.a === 'arch' && x.stage <= 2 && !(x.arch && x.arch[d.i])) {
        c.set((s) => {
          const a = (s.x.arch || []).slice();
          a[d.i] = 1;
          s.x.arch = a;
        });
        fxBoth(c, ['arch', d.i]);
      }
      if (d.a === 'dam' && H.damSay <= 0) {
        H.damSay = 6;
        sayBoth(c, x.stage === 4 ? TXT.bar : TXT.dam);
      }
      if (d.a === 'hit' && flying(x)) {
        if (d.k === 'b') {
          local.bolts.delete(d.id);
          c.send('c7x', ['b', d.id]);
        }
        if (d.k === 'm') {
          const lm = local.mines.get(d.id);
          local.mines.delete(d.id);
          H.mines = H.mines.filter((m) => m.id !== d.id);
          c.send('c7x', ['m', d.id]);
          const m = lm ? lm.p : local.view.p;
          fxBoth(c, ['mboom', m.x, m.y, m.z]);
        }
        const n = clamp(d.n || 0, 0, 30);
        if (n > 0) {
          const ignite = n >= 9 && Math.random() < 0.45 && x.fires.some((f) => !f);
          let fi = -1;
          if (ignite) {
            const free = x.fires.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
            fi = free[Math.floor(Math.random() * free.length)];
          }
          c.set((s) => {
            s.x.hull = Math.max(0, s.x.hull - n);
            if (fi >= 0) s.x.fires = s.x.fires.map((f, i) => (i === fi ? 1 : f));
          });
          const p = local.view.p;
          fxBoth(c, ['hit', p.x, p.y, p.z, n]);
          if (fi >= 0) fxBoth(c, ['fire', fi]);
        }
      }
      if (d.a === 'shot') {
        if (d.k === 'd') {
          const dr = H.drones.find((q) => q.id === d.id);
          if (dr) {
            dr.hp -= 1;
            if (dr.hp <= 0) {
              H.drones = H.drones.filter((q) => q !== dr);
              local.drones.delete(dr.id);
              const p = dronePos(dr, V3());
              fxBoth(c, ['dboom', p.x, p.y, p.z]);
            }
          }
        }
        if (d.k === 'c' && x.stage === 4 && x.boss === 1 && !x.cores[d.id] && H.shield[d.id] > 0) {
          H.shield[d.id] -= 1;
          if (W.mom.cores[d.id]) W.mom.cores[d.id].flash = 1;
          setShield(c, H.shield);
          if (H.shield[d.id] <= 0) {
            const p = corePos(d.id, V3());
            if (p) fxBoth(c, ['open', p.x, p.y, p.z]);
            sayBoth(c, TXT.open);
          }
        }
        if (d.k === 'r') {
          const L = local.strikes.find((q) => q.id === d.id && q.k === 'r' && q.t < 2.15);
          if (L) {
            L.hp = (L.hp == null ? 3 : L.hp) - 1;
            if (L.hp <= 0) {
              const p = debrisPos(L, V3());
              local.strikes = local.strikes.filter((q) => q !== L);
              c.send('c7x', ['r', d.id]);
              fxBoth(c, ['rock', p.x, p.y, p.z]);
              fxBoth(c, ['mboom', p.x, p.y, p.z]);
            }
          }
        }
        if (d.k === 'b' && local.bolts.has(d.id)) {
          const b = local.bolts.get(d.id);
          local.bolts.delete(d.id);
          c.send('c7x', ['b', d.id]);
          fxBoth(c, ['mboom', b.p.x, b.p.y, b.p.z]);
        }
        if (d.k === 'm') {
          const m = H.mines.find((q) => q.id === d.id);
          if (m) {
            m.hp -= 1;
            if (m.hp <= 0) {
              H.mines = H.mines.filter((q) => q !== m);
              const lm = local.mines.get(d.id);
              local.mines.delete(d.id);
              c.send('c7x', ['m', d.id]);
              if (lm) fxBoth(c, ['mboom', lm.p.x, lm.p.y, lm.p.z]);
            }
          }
        }
      }
      if (d.a === 'heart' && !(x.hearts && x.hearts[d.i]) && x.stage >= 3 && x.stage <= 4) {
        c.set((s) => {
          const a = (s.x.hearts || []).slice();
          a[d.i] = 1;
          s.x.hearts = a;
          s.x.hull = Math.min(100, s.x.hull + 22);
        });
        const p = heartPos(d.i, V3());
        fxBoth(c, ['heart', p.x, p.y, p.z]);
        sayBoth(c, TXT.heart);
      }
      if (d.a === 'ext' && x.fires && x.fires[d.i]) {
        c.set((s) => (s.x.fires = s.x.fires.map((f, i) => (i === d.i ? 0 : f))));
        fxBoth(c, ['ext', d.i]);
      }
      if (d.a === 'core' && x.stage === 4 && x.boss === 1 && !x.cores[d.i]) {
        const cores = x.cores.map((v, i) => (i === d.i ? 1 : v));
        const left = cores.filter((v) => !v).length;
        const p = corePos(d.i, V3()) || momPos(V3());
        c.set((s) => {
          s.x.cores = cores;
          if (!left) {
            s.x.boss = 2;
            s.x.stage = 5;
          }
        });
        H.stagger = 1.5;
        H.atkT = 1.6;
        H.rise = left ? 10 : 0;
        fxBoth(c, ['core', p.x, p.y, p.z]);
        if (left) {
          sayBoth(c, TXT.core.replace('{n}', left));
          setTimeout(() => Story.S && Story.S.phase === 'tr_c7' && sayBoth(c, TXT.rise), 2600);
        }
        else {
          fxBoth(c, ['mdie']);
          H.drones.length = 0;
          local.drones.clear();
          local.lasers.length = 0;
          H.mines.length = 0;
          local.mines.clear();
          c.send('c7x', ['all']);
        }
      }
      if (d.a === 'land' && x.stage === 5) {
        // the card, on the heart but not under the skiff
        const c0 = W.at(W.END_S);
        const hc = V3(W.O.x + c0.x - 1.5, 0, W.O.z + c0.z);
        const lp = V3(d.p[0], 0, d.p[1]);
        let cp = hc.clone();
        if (lp.distanceTo(hc) < 10.5) {
          // far enough from the skiff to walk to it together
          const away = hc.clone().sub(lp).setY(0);
          if (away.lengthSq() < 0.01) away.set(-1, 0, 0);
          away.normalize();
          cp = null;
          for (let a = 0; a < TAU && !cp; a += 0.35)
            for (const sg of [1, -1]) {
              const q = away.clone().applyAxisAngle(V3(0, 1, 0), a * sg);
              const tp = lp.clone().addScaledVector(q, 10.5);
              if (W.onHeart(tp.x, tp.z, 1.5)) {
                cp = tp;
                break;
              }
            }
          if (!cp) cp = hc.clone();
        }
        c.set((s) => {
          s.x.stage = 6;
          s.x.landP = d.p;
          s.x.landYaw = d.yaw;
          s.x.cardP = [+cp.x.toFixed(2), +cp.z.toFixed(2)];
        });
        fxBoth(c, ['land', d.p[0], W.O.y + W.PLAT_Y + 1, d.p[1]]);
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const seat = seatOf(x, c.role);
      const fly = flying(x);
      local.shake = Math.max(0, local.shake - dt * 1.4);
      local.hurt = Math.max(0, local.hurt - dt * 2.2);
      sparkCd -= dt;
      // the mouse (and right stick) as deltas: the turret, or a nudge on the stick
      local.mdy = Cam.yaw - local.cy;
      local.mdp = Cam.pitch - local.cpch;
      if (fly) {
        Cam.yaw = local.cy = 0;
        Cam.pitch = local.cpch = 0.18;
      } else {
        local.cy = Cam.yaw;
        local.cpch = Cam.pitch;
      }
      // the flight
      if (fly && seat === 'pilot') pilotStep(c, x, dt, t);
      computeView(x, seat, dt);
      const V = local.view;
      if (fly && seat === 'pilot') {
        local.sendT += dt;
        if (local.sendT >= 1 / 30) {
          local.sendT = 0;
          const S = local.sim;
          c.send('c7v', [
            Math.round(performance.now() * 10) / 10,
            +S.p.x.toFixed(3),
            +S.p.y.toFixed(3),
            +S.p.z.toFixed(3),
            +S.yaw.toFixed(4),
            +S.pitch.toFixed(3),
            +S.roll.toFixed(3),
            +S.speed.toFixed(2),
            x.rs,
            S.boost | (S.brake << 1),
            +S.gear.toFixed(2),
            +S.s.toFixed(2),
          ]);
        }
      }
      // the mothership (eased toward the host's)
      const M = local.mom;
      if (M.on) {
        if (!Net.isHost) {
          M.s = damp(M.s, M.ts, 6, dt);
          M.u = damp(M.u, M.tu, 6, dt);
          M.y = damp(M.y, M.ty, 6, dt);
          M.yaw = angleDamp(M.yaw, M.tyaw, 6, dt);
        }
        const mg = W.mom.g;
        M.k = Math.min(1, M.k + dt * 0.35);
        mg.visible = true;
        momPos(mg.position);
        // it rises out of the rift ahead when it arrives
        mg.position.y += (1 - smooth(M.k)) * -40;
        // it flies backwards ahead of us, its eye on the skiff
        mg.rotation.set(Math.sin(t * 0.5) * 0.03, M.yaw + Math.PI, Math.sin(t * 0.37) * 0.05);
        if (M.dieT >= 0) {
          M.dieT += dt;
          mg.position.y -= M.dieT * M.dieT * 4;
          mg.rotation.x = M.dieT * 0.25;
          mg.rotation.z = M.dieT * 0.18;
          if (Math.random() < dt * 8) W.boom(tmp.copy(mg.position).add(V3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 50)), 10 + Math.random() * 10);
          if (M.dieT > 5) {
            M.on = false;
            mg.visible = false;
          }
        }
        W.mom.hurt = Math.max(0, (W.mom.hurt || 0) - dt * 1.5);
        W.mom.iris.material.color.set('#ff3a5a').multiplyScalar(1.1 + W.mom.hurt * 1.5 + Math.sin(t * 3) * 0.15);
        W.mom.cores.forEach((cc, i) => {
          const off = !!(x.cores && x.cores[i]);
          cc.core.visible = !off;
          cc.cage1.visible = cc.cage2.visible = !off;
          cc.halo.visible = !off;
          cc.stub.visible = off;
          cc.cage1.rotation.x = t * 1.4 + i;
          cc.cage2.rotation.z = t * 1.1 + i;
          // the shield: flashes when hit, shatters open at zero
          const sh = off ? 0 : clamp(local.shield[i] / SHIELD, 0, 1);
          cc.open = damp(cc.open, sh > 0 ? 0 : 1, 5, dt);
          cc.flash = Math.max(0, cc.flash - dt * 6);
          cc.shell.visible = cc.wire.visible = !off && cc.open < 0.98;
          const ss = 1 + cc.open * 0.9 + cc.flash * 0.08;
          cc.shell.scale.setScalar(ss);
          cc.wire.scale.setScalar(ss);
          cc.shell.material.opacity = (0.1 + 0.12 * sh + cc.flash * 0.35) * (1 - cc.open);
          cc.wire.material.opacity = (0.25 + 0.4 * sh + cc.flash * 0.4) * (1 - cc.open);
          cc.wire.rotation.y = t * 0.6 + i;
          cc.cage1.scale.setScalar(1 + cc.open * 0.5);
          cc.cage2.scale.setScalar(1 + cc.open * 0.5);
          cc.core.material.color.set('#ff9cc4').multiplyScalar(0.75 + cc.open * 0.35 + Math.sin(t * 6 + i) * 0.1 * cc.open);
          cc.halo.material.opacity = 0.5 + 0.25 * Math.sin(t * 5 + i);
          if (off && Math.random() < dt * 6) Fx.burst(cc.stub.getWorldPosition(tmp), '#ff8a3a', 4, 3, 0.6, 2);
        });
      } else if (W.mom.g) W.mom.g.visible = false;
      if (x.stage === 4 && x.boss === 1 && !M.on && Net.isHost) {
        // (re)arrival of the mothership
        const H = local.host;
        H.mom.s = V.s + 150;
        H.mom.y = W.ceilAt(H.mom.s) + 8.5;
        setMom([H.mom.s, 0, W.ceilAt(H.mom.s) + 8.5, W.yawAt(H.mom.s)], true);
        M.k = 0;
      }
      if (x.stage !== 4 && x.stage < 5) W.riftU.uFront.value = -1e4;
      else W.riftU.uFront.value = local.frontS != null ? local.frontS : -1e4;
      if (!Net.isHost && local.frontS != null && (x.stage === 4 || x.stage === 5)) local.frontS += local.frontV * dt;
      if (x.stage !== 4) local.frontS = x.stage >= 5 ? local.frontS : null;
      // the skiff
      drawShip(x, seat, dt, t);
      drawSeats(x, dt, t, fly);
      tickHazards(c, x, dt, t);
      // me in my seat, or on foot
      let prompt = null;
      if (fly) {
        const sp = W.shipPoint(seat === 'nav' ? W.TURRET.clone().add(W.SEAT.nav) : W.SEAT.pilot, V3());
        Player.body.p.copy(sp);
        Player.body.v.set(0, 0, 0);
        Player.yaw = V.yaw;
        if (Player.mode !== 'sit') Player.mode = 'sit';
        Player.locked = true;
        Player.avatar.visible = false;
        // the cameras
        if (seat === 'pilot') pilotCam(dt, !local.camOk);
        else navCam(dt, !local.camOk);
        if (seat === 'nav') prompt = navStep(c, x, dt, t);
        else {
          // the navigator's grapple cable, seen from the cockpit
          const g = local.mateNav.g;
          const tp = g && g.st && g.st < 3 ? (g.kind ? corePos(g.i, V3()) : heartPos(g.i, V3())) : null;
          W.setCable(tp ? W.ship.hook.getWorldPosition(V3()) : null, tp);
        }
        if (seat === 'pilot' && x.stage === 5 && local.sim.landed) prompt = null;
      } else if (x.stage === 0) {
        prompt = footStep(c, x, dt, t);
        R.camera.up.set(0, 1, 0);
      } else {
        R.camera.up.set(0, 1, 0);
        if (Math.abs(R.camera.fov - 62) > 0.01) {
          R.camera.fov = 62;
          R.camera.updateProjectionMatrix();
        }
      }
      // weather and light
      const stormT = x.stage === 2 ? 1 : 0;
      W.skyU.uStorm.value = damp(W.skyU.uStorm.value, stormT, x.stage === 2 ? 0.5 : 0.35, dt);
      const st = W.skyU.uStorm.value;
      const navv = seat === 'nav' && fly;
      const fogD = lerp(navv ? 0.0042 : 0.0062, navv ? 0.017 : 0.04, st);
      R.scene.fog.density = fogD;
      W.seaU.uFog.value = fogD;
      local.haze.copy(HAZE).lerp(HAZE_ST, st);
      W.seaU.uFogCol.value.copy(local.haze);
      lightMood(st);
      // the world
      W.update(dt, t, {
        stage: x.stage,
        navView: navv,
        archGot: x.arch,
        heartGot: x.hearts,
        cpNext: (x.cp || 0) + 1,
        dam0: dam0On(x) && x.stage >= 3,
        dam1: dam1On(x),
        vel: V.vel,
        cardK: x.stage >= 6 ? Math.min(1, local.cardK) : 0,
      });
      if (x.stage >= 6) {
        local.cardK += dt * 0.6;
        if (x.cardP) {
          // the card sits in the platform group (not rotated)
          const g = W.plat.g;
          W.plat.card.position.x = x.cardP[0] - g.position.x;
          W.plat.card.position.z = x.cardP[1] - g.position.z;
        }
      }
      // the sound of the skiff
      Eng.set(fly || x.stage === 0, fly ? V.speed : 0, V.boost, st, dt);
      {
        const md = M.on && W.mom.g.visible ? clamp(1 - W.mom.g.position.distanceTo(V.p) / 160, 0, 1) : 0;
        const rd = fly && local.frontS != null && x.stage >= 4 ? clamp(1 - (V.s - local.frontS) / 120, 0, 1) : 0;
        Eng.hum(md * (M.dieT >= 0 ? Math.max(0, 1 - M.dieT / 4) : 1), rd);
      }
      drawHud(c, x, seat, t);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return prompt;
    },
  });

  // ---------- on foot: the moorings and the seats ----------
  const footStep = (c, x, dt, t) => {
    const p = Player.body.p;
    const seat = seatOf(x, c.role);
    // the chains between the ship and the shelf rings
    W.pad.moor.forEach((m, i) => {
      const off = !!x.moor[i];
      m.chain.visible = !off;
      const a = W.shipPoint(V3(m.side * -2.2, -0.55, -0.6), V3());
      if (!off) {
        m.chain.position.copy(m.p).add(V3(0, 0.4, 0));
        m.chain.lookAt(a);
        m.chain.scale.set(1, 1, m.chain.position.distanceTo(a));
      }
      m.ring.rotation.z = off ? t * 2 : 0;
    });
    if (seat) {
      // sitting in my seat, waiting
      const sp = W.shipPoint(seat === 'nav' ? W.TURRET.clone().add(W.SEAT.nav) : W.SEAT.pilot, V3());
      p.copy(sp);
      Player.body.v.set(0, 0, 0);
      Player.yaw = local.view.yaw;
      Player.mode = 'sit';
      Player.locked = true;
      if (Input.pressed('jump')) {
        c.act({ a: 'unseat' });
        Player.locked = false;
        Player.mode = 'walk';
        const out = W.shipPoint(seat === 'nav' ? V3(-2.8, -1.2, -1.4) : V3(2.8, -1.2, 1.6), V3());
        out.y = W.O.y + W.PAD_Y + 0.1;
        c.spawn(out, Player.yaw);
        return null;
      }
      return ['Espace', 'Se lever'];
    }
    if (Player.mode === 'sit') {
      Player.mode = 'walk';
      Player.locked = false;
    }
    // moorings
    for (let i = 0; i < 2; i++) {
      const m = W.pad.moor[i];
      if (x.moor[i]) continue;
      if (Math.hypot(p.x - m.p.x, p.z - m.p.z) < 2.8 && Math.abs(p.y - m.p.y) < 2.5) {
        if (Input.pressed('interact')) c.act({ a: 'moor', i });
        return ['E', 'Larguer l’amarre'];
      }
    }
    // seats
    const entries = [
      ['pilot', W.shipPoint(V3(2.6, -1.2, 1.6), V3())],
      ['nav', W.shipPoint(V3(-2.6, -1.2, -1.4), V3())],
    ];
    for (const [k, e] of entries) {
      if (Math.hypot(p.x - e.x, p.z - e.z) > 2.6 || Math.abs(p.y - (W.O.y + W.PAD_Y)) > 2) continue;
      if (x.seats[k] && x.seats[k] !== c.role) {
        if (Input.pressed('interact')) HUD.say(TXT.taken, T.master, 1800);
        return null;
      }
      if (Input.pressed('interact')) {
        c.act({ a: 'seat', k });
        HUD.say(TXT.seat[k], T.master, 4200);
      }
      return ['E', k === 'pilot' ? 'Prendre le manche (pilote)' : 'Prendre la tourelle (navigation)'];
    }
    void dt;
    return null;
  };

  const objective = (c) => {
    const x = c.S.x;
    const seat = seatOf(x, c.role);
    if (x.stage === 0) {
      const n = (x.moor || []).filter((v) => v).length;
      if (n < 2) return TXT.moor.replace('{n}', n);
      if (!x.seats.pilot || !x.seats.nav) return TXT.seats;
      return TXT.go;
    }
    if (x.stage === 1) {
      const n = (x.arch || []).filter((v) => v).length;
      return (seat === 'nav' ? 'Annonce les arches à {mate}.' : 'Passe dans les arches que {mate} t’annonce.') + ' Arches : ' + n + ' / ' + W.ARCHES.length + '.';
    }
    if (x.stage === 2) return seat === 'nav' ? 'La tempête : guide {mate} au radar, entre les aiguilles et la foudre.' : 'La tempête : vole à la voix de {mate}.';
    if (x.stage === 3) {
      const n = local.drones.size;
      return dam0On(x) ? 'Les drones des Veilleurs' + (n ? ' : encore ' + n + '.' : '.') + ' Le barrage tombera avec le dernier.' : 'Le barrage est tombé : en avant.';
    }
    if (x.stage === 4) {
      const left = (x.cores || []).filter((v) => !v).length;
      return seat === 'nav' ? 'Les noyaux du Vaisseau-mère : F, puis F maintenu. Encore ' + left + '.' : 'Reste sous le Vaisseau-mère, devant la faille qui se referme. Noyaux : encore ' + left + '.';
    }
    if (x.stage === 5) {
      const near = local.view.s > W.END_S - 170;
      if (!near) return seat === 'nav' ? 'La faille se referme : pousse {mate} jusqu’au bassin.' : 'La faille se referme : pleine poussée jusqu’au bassin.';
      return seat === 'nav' ? 'Guide l’atterrissage de {mate} sur le cœur.' : 'Pose-toi au milieu du cœur : freine, descends doucement.';
    }
    if (x.stage >= 6) return TXT.card;
    return '';
  };

  const lightMood = (st) => {
    R.hemi.intensity = lerp(0.56, 0.34, st);
    R.hemi.color.copy(HEMI).lerp(HEMI_ST, st);
    R.hemi.groundColor.set('#5a2a4a');
    R.moon.intensity = lerp(1.05, 0.25, st);
    R.moon.color.set('#ffb48e');
    R.moon.position.set(480, 96, -348);
  };
})();
