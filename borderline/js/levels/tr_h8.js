// ♥ 9 · L’Averse (épreuve h8). Kits swapped in this trial (js/game/trials.js): Yoline carries the
// valet kit, William the dame kit. One umbrella for two in a city under a downpour: the rain chills
// whoever is out from under it. Then the flood (one wades blind, the other sees the currents from a
// balcony, then the other way round), the dark roofs only a flash shows (one sees the storm coming
// and warns the other), and the Storm Spirit: open its four lightning-rod umbrellas.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('h8');
  const T = CONFIG;
  const W = H8;
  const TITLE = 'L’Averse';
  const TXT = {
    intro: 'Épreuve de confiance. La ville sous l’averse, et un seul parapluie pour deux.',
    rule: 'La pluie glace celui qui reste dessous. Serrez-vous sous le parapluie ; sous les auvents, on se réchauffe.',
    holder: 'Tu tiens le parapluie : {mate} doit rester tout contre toi. Les mains prises, tu ne peux ni grimper ni tourner une manivelle. E près de {lui} pour le passer.',
    other: '{mate} tient le parapluie : reste tout contre {lui}, sinon la pluie te glace. E près de {lui} pour le prendre.',
    s1: {
      street: 'La rue des Auvents. Avancez ensemble sous le parapluie, d’auvent en auvent.',
      barrier: 'La barrière est trop haute pour grimper le parapluie à la main. L’un passe, l’autre lui tend le parapluie par-dessus (E).',
      shutter: 'Le rideau de fer de la galerie : une manivelle dehors, une dedans. Il retombe dès qu’on lâche. Le parapluie passe à travers la grille.',
      alley: 'La ruelle des gouttières : trois rideaux d’eau glacée. Passez-les ensemble, serrés sous le parapluie.',
      porch: 'Le porche, au bout de la ruelle. Rejoignez-vous dessous.',
    },
    handsFull: 'Les mains prises par le parapluie : passe-le d’abord à {mate}.',
    curtain: 'Le rideau d’eau te glace jusqu’aux os !',
    frozen: 'Tu es gelé{e}. Retour au dernier abri.',
    frozenMate: '{mate} est gelé{pe}. {Il} repart du dernier abri.',
    cold: 'Tu grelottes : vite, le parapluie ou un abri.',
    gust: 'Une bourrasque ! La pluie tombe de travers : serrez-vous.',
    holderShort: 'Tu tiens le parapluie : garde {mate} tout contre toi.',
    otherShort: 'Reste sous le parapluie de {mate}.',
    give: 'Tu passes le parapluie à {mate}.',
    take: '{mate} te passe le parapluie.',
    s2: {
      intro: 'La place inondée. L’eau monte, les bouches d’égout aspirent, et dans l’eau trouble on ne voit rien.',
      walkerA: 'Traverse l’eau jusqu’à la vanne, au fond. Tu ne vois ni les courants ni les bouches d’égout : écoute les gargouillis et suis la lampe de {mate}.',
      guideA: 'Monte sur le balcon, à droite : de là-haut tu vois les courants et les bouches d’égout. Maintiens E pour pointer ta lampe et guider {mate} jusqu’à la vanne.',
      walkerB: 'À toi d’entrer dans l’eau. Va jusqu’à la vanne, au fond, en suivant la lampe de {mate}. Écoute les gargouillis : l’égout n’est jamais loin.',
      guideB: 'À toi de guider : monte sur le balcon, à gauche. Maintiens E pour pointer ta lampe sur le chemin de {mate}.',
      swap: 'Deuxième bassin. Les rôles s’inversent.',
      valve: 'La vanne tourne. L’eau se retire, l’escalier du balcon se déplie.',
      regroup: 'Rejoignez-vous de l’autre côté de la vanne.',
      regroupB: 'Rejoignez-vous de l’autre côté. La rue suivante est sans lumière.',
      sucked: 'L’égout t’aspire ! Retour au bord.',
      suckedMate: 'L’égout a aspiré {mate}. {Il} repart du bord.',
      swept: 'La crue emporte tout. L’eau redescend : on recommence.',
      rising: 'L’eau monte vite…',
    },
    s4: {
      intro: 'La rue noire. Plus de courant : seule la lumière des éclairs montre le chemin.',
      climber: 'Monte par l’escalier de secours, à gauche, jusqu’au toit. On ne le voit qu’à la lueur des éclairs : {mate} voit l’orage venir. Quand {il} te prévient, regarde, et retiens le chemin.',
      watcher: 'Prends l’escalier éclairé, à droite. Toi seul{e} vois venir l’orage (en haut de l’écran) : préviens {mate} (E) juste avant l’éclair, pour qu’{il} regarde le chemin.',
      lever: 'Sur le toit, le levier sort la passerelle vers {mate}.',
      wait: 'Attends que {mate} sorte la passerelle, sur le toit d’en face.',
      cross: 'La passerelle est sortie. Rejoignez-vous sur le toit de gauche.',
    },
    s5: {
      climber: 'Les toits noirs. À toi de traverser dans le noir, de toit en toit, jusqu’au levier de la grille, tout au bout. Grappin (F) sur l’anneau, au-dessus du grand vide. Attends que {mate} te prévienne.',
      watcher: 'Prends la passerelle vitrée, éclairée (la porte au bout du toit). Toi seul{e} vois venir l’orage : préviens {mate} (E) avant chaque éclair.',
      gate: 'La grille du grand toit s’ouvre.',
      enter: 'Entrez sur le grand toit.',
      fall: 'Le vide. Retour au début des toits.',
    },
    notMine: {
      valve: 'La vanne, c’est à {mate} de la tourner : guide-{le} jusqu’ici.',
      lever: 'Ce levier-là, c’est à {mate} de le tirer.',
    },
    noCover: 'Sans le parapluie au-dessus de toi, la grêle t’empêche de tourner : {mate} doit te couvrir.',
    warnMe: 'Tu préviens {mate}.',
    warnMate: '{mate} : « Regarde ! »',
    s6: {
      intro: 'L’Esprit de l’orage. Ouvrez ses quatre parapluies-paratonnerres : l’orage frappera son propre maître.',
      obj: 'Les paratonnerres : {n} / 4. Tourne une manivelle (E maintenu) ; celui qui tourne est exposé : l’autre le protège de la grêle avec le parapluie. Fuyez les cercles de foudre.',
      hitBolt: 'La foudre ! Tu es sonné{e}.',
      hitBoltMate: 'La foudre a frappé {mate}.',
      hitHail: 'La grêle ! Il te faut le parapluie au-dessus de la tête.',
      hitHailMate: 'La grêle s’abat sur {mate}.',
      rod: 'Un paratonnerre s’ouvre. La foudre remonte vers l’orage !',
      boss: 'L’Esprit de l’orage',
    },
    win: 'La pluie s’arrête. D’un coup.',
    win2: 'Un arc-en-ciel au-dessus de la ville. Dans les flaques, le cœur du ciel.',
    card: 'La carte ' + CARD + ' descend sur le toit. Allez-y ensemble.',
    fallVoid: 'Le vide. Retour au dernier point sûr.',
  };
  CONFIG.cards.h8 = {
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'Un seul parapluie, et la pluie glaçait celui qui restait dehors.',
      'Alors on s’est serrés. On se l’est passé, encore et encore.',
      'On aurait pu courir. On est restés.',
    ],
  };

  const ROLES = ['dame', 'valet'];
  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const COLD_STAGES = [1, 6];
  const NEED = { valveA: 2.6, valveB: 2.6, lever4: 1.2, lever5: 1.2, rod0: 4, rod1: 4, rod2: 4, rod3: 4 };
  const RANGE = { crank: 1.7, valve: 1.8, lever: 1.7 };
  // who works what: the walker turns the valve (the guide only sees), the climber pulls the lever
  const ROLE_OF = { valveA: 'valet', valveB: 'dame', lever4: 'valet', lever5: 'dame' };
  const mine = (id, role) => !ROLE_OF[id] || ROLE_OF[id] === role;
  const COVER_R = 1.3;
  const local = {
    stage: 0,
    warm: 1,
    mateWarm: 1,
    warmSent: 0,
    sub: {},
    aim: null,
    aimSent: 0,
    aims: { dame: null, valet: null },
    prog: {},
    shut: 0,
    shutHold: 0,
    lv: { A: 0.25, B: 0.25 },
    run: { A: false, B: false },
    lvSent: 0,
    pass: -1,
    passAnim: null,
    gust: null,
    gustT: 9,
    wind: new THREE.Vector2(),
    lamp: null,
    mateLamp: null,
    lampSent: 0,
    strike: null,
    strikeT: 3,
    ambT: 6,
    growl: false,
    afterA: 0,
    afterB: 0,
    warnCd: 0,
    hitT: 0,
    curtainCd: {},
    suck: null,
    pend: [],
    atkT: 3,
    gustBT: 9,
    hailT: 4,
    rz: [],
    winT: 0,
    bossLook: null,
    charge: 0,
    breathT: 0,
    mateBreathT: 0,
    splashT: 0,
    gurgleT: 0,
    objT: 0,
    coldSay: 0,
    env: null,
    umb: null,
    disc: null,
    sayCd: {},
    intro6: 0,
    wasHolder: null,
  };
  W.local = local;
  const tmp = V3();
  const tmp2 = V3();
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- HUD of the épreuve (DOM, drawn icons) ----------
  const ui = {};
  const ICON = {
    umb: '<path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>',
    therm: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  };
  const svg = (k, s = 18) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #h8ui{position:fixed;left:22px;bottom:118px;z-index:6;pointer-events:none;font:600 12px/1.2 "IBM Plex Mono",monospace;color:#f3e4ea;letter-spacing:.04em;text-shadow:0 1px 3px #000}
      #h8ui .row{display:flex;align-items:center;gap:8px;margin:6px 0;transition:opacity .4s}
      #h8ui .ic{width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:#9fd2ff}
      #h8ui .ic.umb{color:#ff7aa6}
      #h8ui .nm{width:70px;text-transform:uppercase;opacity:.85}
      #h8ui .bar{width:150px;height:7px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
      #h8ui .bar i{display:block;height:100%;width:100%;transform-origin:0 50%;background:linear-gradient(90deg,#6cc8ff,#ff7aa6);transition:background .4s}
      #h8ui .bar.cold i{background:linear-gradient(90deg,#bfe6ff,#6cc8ff)}
      #h8ui .cap{opacity:.6;font-size:10px;text-transform:uppercase;margin-bottom:2px}
      #h8frost{position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 48%,rgba(140,190,255,.28) 78%,rgba(220,240,255,.75) 100%);transition:opacity .25s}
      #h8storm{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:6;pointer-events:none;display:flex;align-items:center;gap:10px;font:600 13px/1 "IBM Plex Mono",monospace;color:#dfe6ff;text-shadow:0 1px 4px #000;letter-spacing:.06em}
      #h8storm svg.g{width:46px;height:46px}
      #h8storm .t{display:flex;flex-direction:column;gap:4px}
      #h8storm .t b{font-size:15px;color:#fff}
      #h8look{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.9);z-index:6;pointer-events:none;opacity:0;display:flex;align-items:center;gap:12px;font:italic 600 34px/1 Georgia,serif;color:#fff;text-shadow:0 0 18px rgba(160,180,255,.9),0 2px 6px #000;transition:opacity .25s,transform .25s}
      #h8look.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'h8ui';
    ui.root.innerHTML = `<div class="cap">Chaleur</div>
      <div class="row me"><span class="ic"></span><span class="nm"></span><span class="bar"><i></i></span></div>
      <div class="row mate"><span class="ic"></span><span class="nm"></span><span class="bar"><i></i></span></div>`;
    document.body.appendChild(ui.root);
    ui.rows = {
      me: ui.root.querySelector('.row.me'),
      mate: ui.root.querySelector('.row.mate'),
    };
    ui.frost = document.createElement('div');
    ui.frost.id = 'h8frost';
    document.body.appendChild(ui.frost);
    ui.storm = document.createElement('div');
    ui.storm.id = 'h8storm';
    ui.storm.innerHTML = `<svg class="g" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="rgba(10,10,30,.55)" stroke="rgba(255,255,255,.18)" stroke-width="3"/><circle class="arc" cx="24" cy="24" r="20" fill="none" stroke="#bfc8ff" stroke-width="3" stroke-linecap="round" transform="rotate(-90 24 24)" stroke-dasharray="125.7" stroke-dashoffset="0"/><g transform="translate(12 12)" stroke="#fff" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.zap}</g></svg><span class="t"><span>L’orage arrive</span><b></b></span>`;
    ui.storm.hidden = true;
    document.body.appendChild(ui.storm);
    ui.arc = ui.storm.querySelector('.arc');
    ui.stormT = ui.storm.querySelector('b');
    ui.look = document.createElement('div');
    ui.look.id = 'h8look';
    ui.look.innerHTML = `${svg('eye', 34)}<span></span>`;
    document.body.appendChild(ui.look);
    ui.lookT = ui.look.querySelector('span');
  };
  const showUI = (on) => {
    if (!ui.root) return;
    ui.root.style.display = on ? '' : 'none';
    if (!on) ui.frost.style.opacity = 0;
  };
  const uiState = { me: null, mate: null };
  const setRow = (k, name, val, holder) => {
    const r = ui.rows[k];
    const key = name + '|' + holder;
    if (uiState[k] !== key) {
      uiState[k] = key;
      r.querySelector('.ic').innerHTML = svg(holder ? 'umb' : 'therm');
      r.querySelector('.ic').classList.toggle('umb', !!holder);
      r.querySelector('.nm').textContent = name;
    }
    r.querySelector('i').style.transform = `scaleX(${clamp(val, 0, 1)})`;
    r.querySelector('.bar').classList.toggle('cold', val < 0.35);
  };
  let lookT = 0;
  const lookCue = (text) => {
    ui.lookT.textContent = Story.fmt(text);
    ui.look.classList.add('on');
    lookT = 1.6;
  };

  // ---------- small helpers ----------
  const handOf = (c, who, out) => {
    if (who === c.role) return Player.avatar.hand(out);
    if (Remote.has) return Remote.hand(out);
    return out.copy(c.pos(who)).add(V3(0, 1.1, 0));
  };
  const say = (text, hold) => HUD.say(text, T.master, hold || 2600);
  const sayBoth = (c, mine, theirs) => {
    say(mine);
    c.send('h8say', [theirs || mine]);
  };
  const sayOnce = (k, text, cd = 12) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const fx = (c, d) => {
    const [k, a, b] = d;
    const pos = Array.isArray(a) ? V3(a[0], a[1], a[2]) : null;
    if (k === 'pass') Sound.play('switch');
    if (k === 'valve') {
      Sound.play('reveal');
      Sound.play('rumble', 0.6);
      if (pos) Fx.burst(pos, '#9fd8ff', 50, 4, 1.2, -4);
    }
    if (k === 'lever') {
      Sound.play('switch');
      Sound.play('lift');
    }
    if (k === 'gate') {
      Sound.play('door');
      Sound.play('reveal');
    }
    if (k === 'swept') {
      Sound.play('rumble', 0.9);
      W.AU.drench();
    }
    if (k === 'suck' && pos) {
      Sound.play('fall');
      W.AU.drench(pos);
      Fx.burst(pos, '#5a7a8a', 40, 3, 0.8, -6);
    }
    if (k === 'curtain' && pos) {
      W.AU.drench(pos);
      Fx.burst(pos, '#7a90b0', 30, 3, 0.6, -8);
    }
    if (k === 'frozen' && pos) {
      Sound.play('shatter');
      Fx.burst(pos, '#9fd8ff', 60, 3, 1.0, -3);
    }
    if (k === 'rod') {
      Sound.play('reveal');
      Sound.play('creak');
    }
    if (k === 'zap') {
      // the storm strikes the rod, the rod sends it back up into the Spirit
      const i = a;
      const m = W.rods[i];
      const top = m.rod.top;
      const from = W.boss.g.position.clone().add(V3((Math.random() - 0.5) * 8, -4, (Math.random() - 0.5) * 6));
      W.bolt(from, top, { w: 0.16 });
      W.AU.thunder(top, 1.2);
      Cam.shake = Math.max(Cam.shake, 0.4);
      after(0.38, () => {
        W.bolt(top, W.boss.g.position.clone().add(V3(0, -2, 0)), { pink: true, w: 0.22, life: 0.8, branches: 3 });
        W.AU.thunder(W.boss.g.position, 1.4);
        Sound.play('roar');
        W.boss.hurt = 1.2;
        Cam.shake = Math.max(Cam.shake, 0.7);
        Fx.burst(top, '#ff5f8a', 120, 8, 1.4, -2, 'heart');
      });
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      const C = W.C;
      for (let i = 0; i < 6; i++) Fx.burst(W.P(C.x + (i - 2.5) * 5, 16 + (i % 2) * 3, C.z), i % 2 ? '#ff8fb0' : '#ffd77a', 80, 7, 1.6, -1, 'heart');
      [-14, 14].forEach((x) => after(1.2 + Math.random(), () => Fx.firework(W.P(x, 15, 400), 30)));
      after(2.6, () => Fx.firework(W.P(0, 15, 402), 34));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('h8fx', d);
  };

  // the umbrella: where it is, who it covers
  const holderOf = (x) => x.umb || 'valet';
  const coverOf = (c, out) => {
    const x = c.S.x;
    const h = holderOf(x);
    // the shelter is centred between the holder and the one it leans toward (the canopy tilts to cover both)
    const hp = c.pos(h);
    const um = local.umb;
    const lean = um ? um.lean : tmp2.set(0, 0, 0);
    out.x = hp.x + lean.x * 0.5 + local.wind.x * 0.12;
    out.z = hp.z + lean.z * 0.5 + local.wind.y * 0.12;
    out.y = hp.y + 2.1;
    out.r = local.gust ? 0.95 : COVER_R;
    out.base = hp.y;
    return out;
  };
  const cov = { x: 0, z: 0, y: 0, r: 0, base: 0 };
  const covered = (c, who, cv) => {
    const x = c.S.x;
    if (!COLD_STAGES.includes(x.stage) && x.stage !== 7) return false;
    if (holderOf(x) === who) return true;
    const p = c.pos(who);
    return Math.hypot(p.x - cv.x, p.z - cv.z) < cv.r && Math.abs(p.y - cv.base) < 1.6;
  };
  // under a roof (awnings, the gallery, the tower, the opened rods)
  const sheltered = (c, q) => {
    const s = W.inShelter(q);
    if (s) return s;
    if (c.S.x.stage === 6 || c.S.x.stage === 7) {
      for (let i = 0; i < 4; i++) {
        if (!(c.S.x.rods || [])[i]) continue;
        const [rx, rz] = W.RODS[i];
        if (Math.hypot(q.x - rx, q.z - rz) < 3.8 && q.y > 13 && q.y < 18) return { id: 'rod' + i };
      }
    }
    return null;
  };
  const inTunnel = (q) => q.x > W.TUNNEL.x0 && q.x < W.TUNNEL.x1 && q.z > W.TUNNEL.z0 && q.z < W.TUNNEL.z1 && q.y > 13;

  // ---------- respawns ----------
  const respawnPos = (c) => W.spawn(c.S.x.stage, c.role, local.sub);
  const basinOf = (x) => (x.stage === 2 ? 'A' : x.stage === 3 ? 'B' : null);
  const basinEntry = (k, who) => (k === 'A' ? W.P(who === 'dame' ? 1 : -1, 0, 125.5) : W.P(who === 'dame' ? 1 : -1, 0, 181.8));
  const onFall = (c) => {
    const x = c.S.x;
    say(x.stage === 5 ? TXT.s5.fall : TXT.fallVoid, 2200);
    c.send('h8say', ['{mate} est tombé{pe}.']);
    Player.mode = 'walk';
    setAim(c, null);
  };
  const freeze = (c) => {
    const p = Player.body.p.clone().add(V3(0, 1, 0)).toArray();
    fxBoth(c, ['frozen', p]);
    say(TXT.frozen, 2600);
    c.send('h8say', [TXT.frozenMate]);
    local.warm = 1;
    setAim(c, null);
    const x = c.S.x;
    if (x.stage === 6) local.sub = { shelter: 'tower' };
    c.spawn(respawnPos(c), 0);
  };

  // ---------- mechanisms (host ticks them from what each player holds) ----------
  const mechActive = (x, id) => {
    if (id === 'crankO' || id === 'crankI') return x.stage === 1;
    if (id === 'valveA') return x.stage === 2 && !x.valveA;
    if (id === 'valveB') return x.stage === 3 && !x.valveB;
    if (id === 'lever4') return x.stage === 4 && !x.bridge;
    if (id === 'lever5') return x.stage === 5 && !x.gate;
    if (id.startsWith('rod')) return x.stage === 6 && x.fight && !x.won && !(x.rods || [])[+id[3]];
    return false;
  };
  const handsFull = (x, id, role) => (id.startsWith('crank') || id.startsWith('rod')) && holderOf(x) === role && COLD_STAGES.includes(x.stage);
  const nearMech = (c) => {
    const x = c.S.x;
    const p = Player.body.p;
    let best = null;
    let bd = 1e9;
    Object.values(W.mech).forEach((m) => {
      if (!mechActive(x, m.id)) return;
      const r = RANGE[m.kind] || 1.8;
      const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
      if (d < r && Math.abs(m.pos.y - p.y) < 1.5 && d < bd) {
        bd = d;
        best = m;
      }
    });
    return best;
  };
  const setAim = (c, id) => {
    if (local.aim === id) return;
    local.aim = id;
    local.aimSent = 0;
    if (Net.isHost) local.aims[c.role] = id;
    c.send('h8a', [c.role, id]);
  };
  const mechDone = (c, id) => {
    const x = c.S.x;
    const m = W.mech[id];
    local.prog[id] = 1;
    if (id === 'valveA' || id === 'valveB') {
      c.set((s) => (s.x[id] = 1));
      fxBoth(c, ['valve', m.pos.clone().add(V3(0, 1.2, 0)).toArray()]);
      sayBoth(c, TXT.s2.valve);
    }
    if (id === 'lever4') {
      c.set((s) => (s.x.bridge = 1));
      fxBoth(c, ['lever']);
      sayBoth(c, TXT.s4.cross);
    }
    if (id === 'lever5') {
      c.set((s) => (s.x.gate = 1));
      fxBoth(c, ['gate']);
      sayBoth(c, TXT.s5.gate);
    }
    if (id.startsWith('rod')) {
      const i = +id[3];
      const n = (x.opened || 0) + 1;
      c.set((s) => {
        s.x.rods = s.x.rods.slice();
        s.x.rods[i] = 1;
        s.x.opened = n;
      });
      fxBoth(c, ['rod', i]);
      sayBoth(c, TXT.s6.rod);
      local.rz.push({ i, t: 1.5, last: n >= 4 });
    }
  };
  const doorBusy = (c) =>
    ROLES.some((r) => {
      const q = W.rel(c.pos(r));
      return Math.abs(q.x) < 2 && Math.abs(q.z - W.SHUT.z) < 0.75;
    });
  const tickMech = (c, dt) => {
    const x = c.S.x;
    const A = local.aims;
    // a lightning rod only turns under the umbrella (the hail beats the bare-headed one back)
    if (x.stage === 6) coverOf(c, cov);
    const shielded = (id, r) => !id.startsWith('rod') || covered(c, r, cov);
    const held = (id) => ROLES.some((r) => A[r] === id && !handsFull(x, id, r) && mine(id, r) && shielded(id, r));
    if (x.stage === 1) {
      if (held('crankO') || held('crankI')) {
        local.shut = Math.min(1, local.shut + dt * 0.6);
        local.shutHold = 0.8;
      } else {
        local.shutHold -= dt;
        if (local.shutHold <= 0 && !doorBusy(c)) local.shut = Math.max(0, local.shut - dt * 0.3);
      }
      local.prog.crankO = held('crankO') ? local.shut : 0;
      local.prog.crankI = held('crankI') ? local.shut : 0;
    }
    Object.keys(NEED).forEach((id) => {
      if (!mechActive(x, id)) return;
      let p = local.prog[id] || 0;
      if (held(id)) p += dt / NEED[id];
      // a rod keeps what was cranked (you will have to run from the bolts); the valves and levers slip back
      else if (!id.startsWith('rod')) p -= dt * 0.35;
      p = clamp(p, 0, 1);
      local.prog[id] = p;
      if (p >= 1) mechDone(c, id);
    });
    local.mechSent = (local.mechSent || 0) + dt;
    if (local.mechSent > 0.1) {
      local.mechSent = 0;
      const d = {};
      Object.entries(local.prog).forEach(([k, v]) => v > 0.001 && (d[k] = +v.toFixed(3)));
      c.send('h8m', [+local.shut.toFixed(3), d]);
    }
  };

  // ---------- the flood (host) ----------
  const tickFlood = (c, dt) => {
    const x = c.S.x;
    const k = basinOf(x);
    ['A', 'B'].forEach((b) => {
      if (x['valve' + b]) local.lv[b] = Math.max(0, local.lv[b] - dt * 0.45);
      else if (b !== k) local.lv[b] = damp(local.lv[b], 0.25, 1, dt);
    });
    if (k && !x['valve' + k]) {
      const inW = ROLES.some((r) => W.at('WATER_' + k, W.rel(c.pos(r))));
      if (!local.run[k] && inW) local.run[k] = true;
      if (local.run[k]) {
        const was = local.lv[k];
        local.lv[k] = Math.min(1.45, local.lv[k] + (dt * 1.2) / 78);
        if (was < 0.95 && local.lv[k] >= 0.95) sayBoth(c, TXT.s2.rising);
      } else local.lv[k] = damp(local.lv[k], 0.25, 0.8, dt);
      if (local.lv[k] >= 1.4) {
        local.run[k] = false;
        local.lv[k] = 0.3;
        fxBoth(c, ['swept']);
        c.send('h8sw', k);
        swept(c, k);
      }
    }
    local.lvSent += dt;
    if (local.lvSent > 0.1) {
      local.lvSent = 0;
      c.send('h8f', [+local.lv.A.toFixed(3), +local.lv.B.toFixed(3)]);
    }
  };
  const swept = (c, k) => {
    say(TXT.s2.swept, 2800);
    const q = W.rel(Player.body.p);
    if (W.at('WATER_' + k, q)) c.spawn(basinEntry(k, c.role), 0);
  };

  // ---------- the lightning of the dark streets (host schedules, both play) ----------
  const scheduleStrike = (c, delay, amb) => {
    const q = W.rel(Player.body.p);
    const sx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 60);
    const sz = q.z + 30 + Math.random() * 70;
    const a = W.P(sx + (Math.random() - 0.5) * 30, 150, sz + 20);
    const b = W.P(sx, 24 + Math.random() * 14, sz);
    const d = [+delay.toFixed(2), ...a.toArray().map((v) => +v.toFixed(1)), ...b.toArray().map((v) => +v.toFixed(1)), amb ? 1 : 0];
    onStrike(c, d);
    c.send('h8s', d);
  };
  const onStrike = (c, d) => {
    local.strike = { t: d[0], a: V3(d[1], d[2], d[3]), b: V3(d[4], d[5], d[6]), amb: !!d[7], total: d[0] };
    local.growl = false;
  };
  const dark = (x) => x.stage === 4 || x.stage === 5;
  const climberOf = (x) => (x.stage === 4 ? 'valet' : 'dame');
  const tickStrike = (c, dt) => {
    const s = local.strike;
    const x = c.S.x;
    if (!s) return;
    s.t -= dt;
    if (dark(x) && c.role !== climberOf(x) && !local.growl && s.t < 2.6 && !s.amb) {
      local.growl = true;
      W.AU.growl(Math.max(0.3, s.t));
    }
    if (s.t <= 0) {
      local.strike = null;
      // the climber only reads the way in a flash if warned to look (else a glare, and nothing stays)
      const blind = !s.amb && dark(x) && c.role === climberOf(x) && !(local.warned > 0);
      W.bolt(s.a, s.b, { w: 0.5, life: 0.6, flash: s.amb ? 0.55 : blind ? 0.4 : 1.15, branches: 3 });
      W.AU.thunder(s.b, s.amb ? 0.7 : 1.1);
      if (!s.amb && !blind) {
        if (x.stage === 4) local.afterA = 1;
        if (x.stage === 5) local.afterB = 1;
      }
    }
  };

  // ---------- the Storm Spirit (host schedules attacks, each screen checks its player) ----------
  const ARENA_CLAMP = (x, z) => [clamp(x, -20, 20), clamp(z, 339, 401)];
  const attack = (c, d) => {
    const x = c.S.x;
    const [k] = d;
    const B = W.boss;
    if (k === 'b') {
      const [, px, pz, delay] = d;
      W.tele('bolt', px, pz, 2.0, delay);
      W.AU.crackle(W.P(px, 14.5, pz), delay);
      local.bossLook = W.P(px, 14, pz);
      local.charge = 1;
      after(delay, () => {
        if (c.S.x.stage !== 6) return;
        const to = W.P(px, 14, pz);
        const from = B.g.position.clone().add(V3((Math.random() - 0.5) * 10, -5, (Math.random() - 0.5) * 6));
        W.bolt(from, to, { w: 0.2 });
        B.cast = 1;
        W.AU.thunder(to, 1.1);
        Fx.burst(to.clone().add(V3(0, 0.3, 0)), '#c8c0ff', 60, 6, 0.6, -6);
        const me = Player.body.p;
        const dd = Math.hypot(me.x - to.x, me.z - to.z);
        Cam.shake = Math.max(Cam.shake, clamp(0.6 - dd * 0.03, 0.1, 0.6));
        if (dd < 2.0 && me.y < to.y + 2.6) hitMe(c, 'bolt', to);
      });
    }
    if (k === 'g') {
      const [, dx, dz, delay, dur] = d;
      W.ST.boss = W.ST.boss || {};
      W.ST.boss.inhale = true;
      W.AU.gust(delay + dur);
      after(delay, () => {
        if (W.ST.boss) W.ST.boss.inhale = false;
        local.gust = { t: dur, dx, dz, k: 4.2 };
        say(TXT.gust, 1800);
      });
    }
    if (k === 'h') {
      const [, px, pz, r, delay] = d;
      W.tele('hail', px, pz, r, delay);
      after(delay, () => {
        if (c.S.x.stage !== 6) return;
        coverOf(c, cov);
        const under = Math.hypot(cov.x - (W.O.x + px), cov.z - (W.O.z + pz)) < r + 1;
        W.hailBurst(px, pz, r, under ? { x: cov.x, z: cov.z, r: cov.r, y: cov.y } : null);
        W.AU.hail(W.P(px, 15, pz), under);
        const me = Player.body.p;
        const dd = Math.hypot(me.x - (W.O.x + px), me.z - (W.O.z + pz));
        if (dd < r && !covered(c, c.role, cov)) hitMe(c, 'hail');
      });
    }
    void x;
  };
  const attackBoth = (c, d) => {
    attack(c, d);
    c.send('h8atk', d);
  };
  const hitMe = (c, kind, from) => {
    if (local.hitT > 0) return;
    local.hitT = 1.1;
    const p = Player.body.p;
    if (kind === 'bolt' && from) {
      const dx = p.x - from.x;
      const dz = p.z - from.z;
      const d = Math.hypot(dx, dz) || 1;
      Player.body.v.set((dx / d) * 5.5, 5, (dz / d) * 5.5);
    }
    local.warm = Math.max(0.05, local.warm - (kind === 'bolt' ? 0.3 : 0.22));
    HUD.hurt();
    Sound.play('hurt');
    Cam.shake = Math.max(Cam.shake, 0.5);
    say(kind === 'bolt' ? TXT.s6.hitBolt : TXT.s6.hitHail, 2000);
    c.send('h8say', [kind === 'bolt' ? TXT.s6.hitBoltMate : TXT.s6.hitHailMate]);
    c.act({ a: 'hit', k: kind });
    setAim(c, null);
  };
  const crankerOf = (x) => ROLES.find((r) => (local.aims[r] || '').startsWith('rod') && !handsFull(x, local.aims[r], r));
  const tickBoss = (c, dt) => {
    const x = c.S.x;
    if (x.stage !== 6) return;
    if (!x.fight) {
      local.intro6 += dt;
      if (local.intro6 > 2.5) {
        c.set((s) => (s.x.fight = true));
        local.atkT = 2.5;
        local.gustBT = 9;
        local.hailT = 3;
      }
      return;
    }
    if (x.won) return;
    const n = x.opened || 0;
    local.atkT -= dt;
    local.gustBT -= dt;
    local.hailT -= dt;
    if (local.atkT <= 0) {
      local.atkT = Math.max(2.4, 3.8 - n * 0.35) + Math.random() * 1.0;
      const r1 = Math.random() < 0.5 ? 'dame' : 'valet';
      const q1 = W.rel(c.pos(r1));
      const list = [ARENA_CLAMP(q1.x + (Math.random() - 0.5) * 2, q1.z + (Math.random() - 0.5) * 2)];
      if (n >= 2) {
        const q2 = W.rel(c.pos(mateRole(r1)));
        list.push(ARENA_CLAMP(q2.x + (Math.random() - 0.5) * 3, q2.z + (Math.random() - 0.5) * 3));
      }
      if (n >= 3) list.push(ARENA_CLAMP(-18 + Math.random() * 36, 342 + Math.random() * 58));
      list.forEach(([px, pz], i) => attackBoth(c, ['b', +px.toFixed(2), +pz.toFixed(2), +(1.8 + i * 0.3).toFixed(2)]));
    }
    if (local.gustBT <= 0) {
      local.gustBT = 11 + Math.random() * 5;
      const a = Math.random() * TAU;
      attackBoth(c, ['g', +Math.sin(a).toFixed(3), +Math.cos(a).toFixed(3), 1.3, 2.6]);
    }
    if (local.hailT <= 0) {
      const cr = crankerOf(x);
      if (cr) {
        local.hailT = Math.max(2.4, 3.4 - n * 0.25) + Math.random() * 0.6;
        const q = W.rel(c.pos(cr));
        attackBoth(c, ['h', +q.x.toFixed(2), +q.z.toFixed(2), 2.7, 1.4]);
      } else local.hailT = 0.6;
    }
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    const q = W.rel(Player.body.p);
    const umbLine = holderOf(x) === r ? TXT.holderShort : TXT.otherShort;
    if (x.stage === 1) {
      let s = TXT.s1.street;
      if (q.z > 40 && q.z < 66) s = TXT.s1.barrier;
      else if (q.z >= 66 && q.z < 90) s = TXT.s1.shutter;
      else if (q.z >= 90 && q.z < 117) s = TXT.s1.alley;
      else if (q.z >= 117) s = TXT.s1.porch;
      return s + ' ' + umbLine;
    }
    if (x.stage === 2) {
      if (x.valveA) return TXT.s2.regroup;
      return r === W.BASINS.A.walker ? TXT.s2.walkerA : TXT.s2.guideA;
    }
    if (x.stage === 3) {
      if (x.valveB) return TXT.s2.regroupB;
      return r === W.BASINS.B.walker ? TXT.s2.walkerB : TXT.s2.guideB;
    }
    if (x.stage === 4) {
      if (x.bridge) return TXT.s4.cross;
      if (r === 'valet') return W.at('LROOF', q) ? TXT.s4.lever : TXT.s4.climber;
      return q.y > 13 ? TXT.s4.wait : TXT.s4.watcher;
    }
    if (x.stage === 5) {
      if (x.gate) return TXT.s5.enter;
      return r === 'dame' ? TXT.s5.climber : TXT.s5.watcher;
    }
    if (x.stage === 6) return x.fight ? TXT.s6.obj.replace('{n}', x.opened || 0) : TXT.s6.intro;
    if (x.stage === 7) return TXT.card;
    return '';
  };

  // ---------- light and mood per stretch ----------
  const ENV = {
    1: { hemi: 0.3, moon: 0.2, fog: 0.016, mood: { dark: 0.5 }, music: 'calm' },
    2: { hemi: 0.3, moon: 0.2, fog: 0.017, mood: { dark: 0.5 }, music: 'calm' },
    3: { hemi: 0.3, moon: 0.2, fog: 0.017, mood: { dark: 0.5 }, music: 'calm' },
    4: { hemi: 0.03, moon: 0.015, fog: 0.03, mood: { dark: 1 }, music: 'dark', dark: 1 },
    5: { hemi: 0.03, moon: 0.015, fog: 0.026, mood: { dark: 1 }, music: 'dark', dark: 1 },
    6: { hemi: 0.34, moon: 0.16, fog: 0.012, mood: { dark: 0.6 }, music: 'tense' },
    7: { hemi: 0.46, moon: 0.5, fog: 0.006, mood: { gold: 0.22 }, music: 'gold' },
  };
  const applyEnv = (c, st) => {
    const e = ENV[st] || ENV[1];
    W.ST.hemi = e.hemi;
    R.moon.intensity = e.moon;
    c.fog(e.fog);
    City.mood(e.mood);
    Sound.mood(e.music);
    W.ST.dark = e.dark || 0;
    W.ST.lit = e.dark ? 0.55 : 1;
    W.ST.flashK = e.dark ? 1.5 : 1;
  };

  Story.register('tr_h8', {
    world: W,
    init: () => ({ stage: 1, umb: 'valet', pass: 0, rods: [0, 0, 0, 0], opened: 0, fight: false, won: false }),
    voice: () => 1,
    net: {
      h8a: (c, d) => {
        const [who, id] = d;
        if (who === c.role) return;
        local.aims[who] = id;
      },
      h8m: (c, d) => {
        if (Net.isHost) return;
        local.shut = d[0];
        local.prog = d[1];
      },
      h8f: (c, d) => {
        if (Net.isHost) return;
        local.lv.A = d[0];
        local.lv.B = d[1];
      },
      h8sw: (c, k) => !Net.isHost && swept(c, k),
      h8w: (c, v) => (local.mateWarm = v),
      h8l: (c, d) => (local.mateLamp = d ? V3(d[0], d[1], d[2]) : null),
      h8s: (c, d) => !Net.isHost && onStrike(c, d),
      h8warn: () => {
        local.warned = 3.5;
        lookCue(TXT.warnMate);
        Sound.play('chime');
      },
      h8G: (c, d) => !Net.isHost && startGust(d),
      h8atk: (c, d) => !Net.isHost && attack(c, d),
      h8fx: (c, d) => fx(c, d),
      h8say: (c, d) => say(d[0], 2400),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      makeUI();
      showUI(true);
      W.AU.resume();
      local.stage = 0;
      local.aim = null;
      local.aims = { dame: null, valet: null };
      local.prog = {};
      local.warm = 1;
      local.mateWarm = 1;
      local.sub = {};
      local.pend = [];
      local.strike = null;
      local.gust = null;
      local.hitT = 0;
      local.winT = 0;
      local.pass = c.S.x.pass || 0;
      local.passAnim = null;
      if (!local.umb) {
        local.umb = W.makeUmbrella(0.95, 1.15);
        local.umb.lean = V3();
        local.umb.k = 1;
        R.scene.add(local.umb.g);
        // the dry patch under the umbrella
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: W.T.soft, color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
        );
        const rim = new THREE.Mesh(
          new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(0.9), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        disc.add(rim);
        disc.renderOrder = 3;
        R.scene.add(disc);
        local.disc = disc;
      }
      local.umb.g.visible = true;
      local.disc.visible = true;
      c.spawn(respawnPos(c), 0);
      Player.killY = W.O.y - 4;
      Player.checkpoint = () => {
        onFall(c);
        return respawnPos(c);
      };
      Player.targets = () => (c.role === 'dame' && Story.S && Story.S.x.stage === 5 ? [W.RING_B.wp] : []);
      Player.grappleLand = () => {
        const p = Player.body.p;
        return p.distanceTo(W.RING_B.wp) < 6 ? W.P(...W.RING_B.land) : null;
      };
      local.env = { hemi: R.hemi.intensity, moon: R.moon.intensity };
      applyEnv(c, c.S.x.stage);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · un seul parapluie', '#ff8fb0');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4400);
        say(holderOf(c.S.x) === c.role ? TXT.holder : TXT.other, 5600);
      }
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      Player.killY = -40;
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.moon.intensity = local.env.moon;
      }
      showUI(false);
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      if (ui.storm) ui.storm.hidden = true;
      if (local.umb) local.umb.g.visible = false;
      if (local.disc) local.disc.visible = false;
      City.mood({});
      W.hide();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        local.sub = {};
        local.aim = null;
        local.strike = null;
        applyEnv(c, x.stage);
        Player.killY = x.stage === 5 ? W.O.y + 12 : x.stage >= 6 ? W.O.y + 10 : W.O.y - 4;
        if (prev && x.stage > prev) Sound.play('chime');
        if (prev && x.stage === 2) say(TXT.s2.intro, 3600);
        if (prev && x.stage === 3) say(TXT.s2.swap, 2600);
        if (prev && x.stage === 4) say(TXT.s4.intro, 3600);
        if (x.stage === 5) say(c.role === 'dame' ? TXT.s5.climber : TXT.s5.watcher, 5000);
        if (x.stage === 6) {
          say(TXT.s6.intro, 4200);
          if (W.screen) W.screen.show(TXT.s6.boss, 'quatre parapluies-paratonnerres', '#ff5f8a');
          Cam.focus = W.boss.g.position;
          after(2.2, () => (Cam.focus = null));
        }
        if (x.stage === 7) {
          local.winT = 0;
          W.AU.stopRain();
          W.ST.rain = 0;
          HUD.boss(null);
          say(TXT.win, 2400);
          after(2.6, () => say(TXT.win2, 4200));
          fx(c, ['win']);
          W.ST.boss = Object.assign(W.ST.boss || {}, { dead: true });
        }
        if (x.stage < 7) {
          W.ST.rain = 1;
          W.AU.startRain();
        }
        local.sayCd = {};
      }
      // the umbrella changed hands
      if ((x.pass || 0) !== local.pass) {
        local.passAnim = { t: 0, to: holderOf(x), from: mateRole(holderOf(x)) };
        local.pass = x.pass || 0;
        fx(c, ['pass']);
        if (COLD_STAGES.includes(x.stage)) say(holderOf(x) === c.role ? TXT.take : TXT.give, 1800);
      }
      W.ST.gates.A = x.valveA ? 1 : 0;
      W.ST.gates.B = x.valveB ? 1 : 0;
      W.ST.stairs.A = x.valveA ? 1 : 0;
      W.ST.stairs.B = x.valveB ? 1 : 0;
      W.ST.bridge = x.bridge ? 1 : 0;
      W.ST.gate5 = x.gate ? 1 : 0;
      W.ST.rods = (x.rods || [0, 0, 0, 0]).slice();
      W.ST.card = x.stage === 7;
      if (x.stage === 6 && x.fight) HUD.boss(TXT.s6.boss, 1 - (x.opened || 0) / 4, 'Paratonnerres · ' + (x.opened || 0) + ' / 4');
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      const both = (z) => W.at(z, qd) && W.at(z, qv);
      if (x.stage === 1 && both('PORCH')) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && x.valveA && both('MID')) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3 && x.valveB && both('C0')) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4 && x.bridge && both('LROOF')) c.set((s) => (s.x.stage = 5));
      if (x.stage === 5 && x.gate && both('ARENA')) c.set((s) => (s.x.stage = 6));
      if (x.stage === 7 && local.winT > 4) {
        const C = W.C;
        const near = (q) => Math.hypot(q.x - C.x, q.z - C.z) < 4.5 && q.y > 13;
        if (near(qd) && near(qv)) c.goto('reward', (s) => (s.x.card = 'h8'));
      }
      tickMech(c, dt);
      tickFlood(c, dt);
      tickBoss(c, dt);
      // the returning bolts of the rods, and the end of the storm
      for (let i = local.rz.length - 1; i >= 0; i--) {
        const z = local.rz[i];
        z.t -= dt;
        if (z.t <= 0) {
          local.rz.splice(i, 1);
          fxBoth(c, ['zap', z.i]);
          if (z.last) {
            setTimeout(() => {
              if (Story.S && Story.S.phase === 'tr_h8' && Story.S.x.stage === 6)
                c.set((s) => {
                  s.x.won = true;
                  s.x.stage = 7;
                });
            }, 700);
          }
        }
      }
      // gusts in the open street (stage 1)
      if (x.stage === 1) {
        local.gustT -= dt;
        if (local.gustT <= 0 && (W.at('GUSTS', qd) || W.at('GUSTS', qv))) {
          local.gustT = 13 + Math.random() * 5;
          const d = [Math.random() < 0.5 ? -1 : 1, -0.4, 1.2, 3.2];
          startGust(d);
          c.send('h8G', d);
        }
      }
      // lightning: in the dark streets it shows the way; elsewhere only far flashes
      if (!local.strike) {
        if (dark(x)) scheduleStrike(c, 6.5 + Math.random() * 3, false);
        else if (x.stage <= 3) {
          local.ambT -= dt;
          if (local.ambT <= 0) {
            local.ambT = 14 + Math.random() * 12;
            scheduleStrike(c, 0.2, true);
          }
        }
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'pass') {
        if (!COLD_STAGES.includes(x.stage)) return;
        if ((local.passCd || 0) > performance.now()) return;
        const a = c.pos('dame');
        const b = c.pos('valet');
        if (Math.hypot(a.x - b.x, a.z - b.z) > 2.9 || Math.abs(a.y - b.y) > 1.8) return;
        local.passCd = performance.now() + 700;
        c.set((s) => {
          s.x.umb = mateRole(holderOf(s.x));
          s.x.pass = (s.x.pass || 0) + 1;
        });
      }
      if (d.a === 'hit') {
        const id = local.aims[who];
        if (id && id.startsWith('rod')) local.prog[id] = Math.max(0, (local.prog[id] || 0) - 0.15);
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = W.rel(p);
      local.hitT = Math.max(0, local.hitT - dt);
      local.warnCd = Math.max(0, local.warnCd - dt);
      local.warned = Math.max(0, (local.warned || 0) - dt);
      // the wide gap of the dark roofs opens only to the grapple (and the hop that follows it)
      if (Player.mode === 'grapple') local.grT = 1.6;
      local.grT = Math.max(0, (local.grT || 0) - dt);
      if (W.chasm) W.chasm.on = !(local.grT > 0);
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      // ---------- checkpoints of the stage ----------
      const sh = sheltered(c, q);
      if (x.stage === 1 && sh && sh.spawn) {
        const order = W.SHELTERS.findIndex((s) => s.id === sh.id);
        const cur = W.SHELTERS.findIndex((s) => s.id === local.sub.shelter);
        if (order > cur) local.sub.shelter = sh.id;
      }
      if (x.stage === 5 && q.z > 329 && q.y > 14.5 && q.x < -12) local.sub.p = [-17, 15, 332];
      if (x.stage >= 6) local.sub.shelter = 'tower';

      // ---------- wind ----------
      if (local.gust) {
        local.gust.t -= dt;
        if (local.gust.t <= 0) local.gust = null;
      }
      const g = local.gust;
      const wk = g ? Math.min(1, g.t * 2) : 0;
      local.wind.x = damp(local.wind.x, g ? g.dx * g.k * wk : 0, 3, dt);
      local.wind.y = damp(local.wind.y, g ? g.dz * g.k * wk : 0, 3, dt);
      W.ST.wind.set(local.wind.x * 1.4, local.wind.y * 1.4);

      // ---------- the umbrella ----------
      const holder = holderOf(x);
      const iHold = holder === r;
      coverOf(c, cov);
      const coldStage = COLD_STAGES.includes(x.stage);
      const meCovered = coldStage && covered(c, r, cov);
      if (iHold && coldStage) {
        // both hands on the umbrella: no double jump, no running
        if (!Player.body.grounded && Player.jumps === 1) Player.jumps = 2;
        const v = Player.body.v;
        const hs = Math.hypot(v.x, v.z);
        if (Player.body.grounded && hs > 4.6) {
          v.x *= 4.6 / hs;
          v.z *= 4.6 / hs;
        }
      }
      if (local.wasHolder !== null && local.wasHolder !== iHold && coldStage) say(iHold ? TXT.holder : TXT.other, 4200);
      local.wasHolder = iHold;
      // the wind pushes (more whoever holds the umbrella: it's a sail)
      if (g && !sh && (x.stage === 1 || x.stage === 6) && Player.mode === 'walk') {
        const k = (iHold ? 1.5 : 1) * (x.stage === 6 ? 1 : 0.42);
        p.x += local.wind.x * k * dt;
        p.z += local.wind.y * k * dt;
      }

      // ---------- warmth ----------
      if (coldStage && x.stage !== 7) {
        let dw = 0;
        if (sh) dw = dt / 2.4;
        // two under one umbrella keep each other warm (slowly)
        else if (meCovered) dw = dt / (x.stage === 6 ? 12 : 18);
        else dw = (-dt / (x.stage === 6 ? 12 : 10)) * (g ? 1.4 : 1);
        // the water curtains of the alley
        if (x.stage === 1 && W.at('ALLEY', q)) {
          W.CURTAINS.forEach((z, i) => {
            local.curtainCd[i] = Math.max(0, (local.curtainCd[i] || 0) - dt);
            if (Math.abs(q.z - (z + 0.15)) < 0.45 && Math.abs(q.x) < 1.6 && !local.curtainCd[i]) {
              local.curtainCd[i] = 1.5;
              if (!meCovered) {
                local.warm -= 0.3;
                say(TXT.curtain, 1600);
                fxBoth(c, ['curtain', p.clone().add(V3(0, 1.4, 0)).toArray()]);
              } else Sound.play('tile');
            }
          });
        }
        local.warm = clamp(local.warm + dw, 0, 1);
        if (local.warm < 0.3 && dw < 0) sayOnce('cold', TXT.cold, 10);
        if (local.warm <= 0) freeze(c);
        local.warmSent += dt;
        if (local.warmSent > 0.2) {
          local.warmSent = 0;
          c.send('h8w', +local.warm.toFixed(3));
        }
      } else if (x.stage !== 6) local.warm = 1;
      // breath in the cold, on both of you
      local.breathT -= dt;
      if (coldStage && local.warm < 0.45 && local.breathT <= 0) {
        local.breathT = 0.9 + local.warm * 2;
        Fx.burst(handOf(c, r, tmp).add(V3(0, 0.55, 0)), '#3a4a5a', 8, 0.6, 0.9, 0.4);
      }
      local.mateBreathT -= dt;
      if (coldStage && local.mateWarm < 0.45 && local.mateBreathT <= 0 && Remote.has) {
        local.mateBreathT = 0.9 + local.mateWarm * 2;
        Fx.burst(Remote.hand(tmp).add(V3(0, 0.55, 0)), '#3a4a5a', 8, 0.6, 0.9, 0.4);
      }
      // HUD
      const showWarm = coldStage && x.stage !== 7;
      showUI(showWarm);
      if (showWarm) {
        setRow('me', T.players[Story.me].name, local.warm, iHold);
        setRow('mate', T.players[Story.mate].name, local.mateWarm, !iHold);
        ui.frost.style.opacity = clamp((0.6 - local.warm) / 0.6, 0, 1) * 0.9;
      }

      // ---------- the flood ----------
      const bk = basinOf(x);
      const B = bk && W.BASINS[bk];
      let inWater = false;
      if (B && !x['valve' + bk] && W.at('WATER_' + bk, q) && q.y < local.lv[bk] + 0.2) {
        inWater = true;
        const v = Player.body.v;
        const hs = Math.hypot(v.x, v.z);
        const cap = 3.0 - local.lv[bk] * 0.6;
        if (Player.body.grounded && hs > cap) {
          v.x *= cap / hs;
          v.z *= cap / hs;
        }
        if (!local.suck)
          W.CURRENTS[bk].forEach(([x0, z0, x1, z1, fx2, fz]) => {
            if (q.x > x0 && q.x < x1 && q.z > z0 && q.z < z1) {
              p.x += fx2 * dt;
              p.z += fz * dt;
            }
          });
        // a drain sucks you down
        if (!local.suck) {
          const pl = W.PLATES[bk].find(([px, pz]) => Math.hypot(q.x - px, q.z - pz) < W.SUCK_R);
          if (pl) {
            // pulled down the drain: no physics while it happens (the floor would push the body out sideways)
            local.suck = { t: 0, x: pl[0], z: pl[1], hp: p.clone() };
            Player.hangPos = local.suck.hp;
            Player.mode = 'hang';
            say(TXT.s2.sucked, 2200);
            c.send('h8say', [TXT.s2.suckedMate]);
            fxBoth(c, ['suck', W.P(pl[0], local.lv[bk], pl[1]).toArray()]);
            setAim(c, null);
          }
        }
        // sloshing steps
        local.splashT -= dt;
        if (hs > 1 && local.splashT <= 0) {
          local.splashT = 0.42;
          W.AU.splash(0.7);
        }
      }
      if (local.suck) {
        const s = local.suck;
        s.t += dt;
        const tp = W.P(s.x, 0, s.z);
        s.hp.x = damp(s.hp.x, tp.x, 6, dt);
        s.hp.z = damp(s.hp.z, tp.z, 6, dt);
        s.hp.y = W.O.y - s.t * s.t * 2.6;
        Player.hangPos = s.hp;
        Player.body.v.set(0, 0, 0);
        Cam.shake = Math.max(Cam.shake, 0.25);
        if (s.t > 0.85) {
          local.suck = null;
          Player.hangPos = null;
          Player.mode = 'walk';
          c.spawn(basinEntry(bk || 'A', r), 0);
        }
      }
      // the drains gurgle (that's all the one in the water gets)
      local.gurgleT -= dt;
      if (B && !x['valve' + bk] && local.gurgleT <= 0) {
        local.gurgleT = 0.12;
        W.PLATES[bk].forEach(([px, pz]) => {
          const d = Math.hypot(q.x - px, q.z - pz);
          if (d < 9 && Math.random() < 0.12 * (1 - d / 9) + 0.02) W.AU.gurgle(W.P(px, local.lv[bk], pz));
        });
      }
      W.ST.level.A = local.lv.A;
      W.ST.level.B = local.lv.B;
      W.ST.waterY = inWater ? W.O.y + local.lv[bk] : null;
      // the guide's lamp
      const guiding = B && !x['valve' + bk] && r === B.guide && W.at('BAL_' + bk, q);
      W.ST.guide = guiding ? bk : null;

      // ---------- E: what my hands do ----------
      let prompt = null;
      let want = null;
      const holding = Input.held('interact') && local.hitT <= 0.4 && !local.suck;
      const m = nearMech(c);
      let lampOn = false;
      if (m) {
        if (handsFull(x, m.id, r)) {
          prompt = ['E', Story.fmt(TXT.handsFull), false];
          if (Input.pressed('interact')) sayOnce('hands', TXT.handsFull, 4);
        } else if (!mine(m.id, r)) {
          const t2 = TXT.notMine[m.kind];
          prompt = ['E', Story.fmt(t2), false];
          if (Input.pressed('interact')) sayOnce('notMine', t2, 4);
        } else {
          const verb = m.kind === 'crank' ? (m.id.startsWith('rod') ? 'Ouvrir le paratonnerre' : 'Tourner la manivelle') : m.kind === 'valve' ? 'Tourner la vanne' : 'Tirer le levier';
          const pc = Math.round((local.prog[m.id] || 0) * 100);
          prompt = ['E', verb + (holding ? ' · ' + pc + ' %' : ' (maintenir)'), true];
          if (holding) want = m.id;
          if (holding && m.id.startsWith('rod') && !meCovered) {
            prompt = ['E', Story.fmt(TXT.noCover), true];
            sayOnce('noCover', TXT.noCover, 6);
          }
        }
      } else if (guiding) {
        prompt = ['E', 'Pointer ta lampe vers le chemin de ' + Story.name(mateRole(r)) + ' (maintenir)', true];
        if (Input.held('interact')) lampOn = true;
      } else if (dark(x) && r !== climberOf(x) && !(x.stage === 4 ? x.bridge : x.gate)) {
        prompt = ['E', Story.fmt('Prévenir {mate} : « Regarde ! »'), false];
        if (Input.pressed('interact') && !local.warnCd) {
          local.warnCd = 1.2;
          c.send('h8warn', 1);
          say(TXT.warnMe, 1200);
          Sound.play('chime');
        }
      } else if (coldStage && x.stage !== 7 && Remote.has) {
        const rp = c.pos(mateRole(r));
        const d = Math.hypot(rp.x - p.x, rp.z - p.z);
        if (d < 2.6 && Math.abs(rp.y - p.y) < 1.7 && !local.passAnim) {
          prompt = ['E', iHold ? 'Passer le parapluie à ' + Story.name(mateRole(r)) : 'Prendre le parapluie', false];
          if (Input.pressed('interact')) c.act({ a: 'pass' });
        }
      }
      setAim(c, want);
      local.aimSent += dt;
      if (local.aimSent > 1) {
        local.aimSent = 0;
        c.send('h8a', [r, local.aim]);
      }
      // the lamp spot: camera ray onto the water
      if (lampOn) {
        const cam = R.camera;
        const d = V3(0, 0, -1).applyQuaternion(cam.quaternion);
        const wy = W.O.y + local.lv[bk];
        if (d.y > -0.03) d.y = -0.03;
        const k = clamp((wy - cam.position.y) / d.y, 0, 40);
        const spot = cam.position.clone().addScaledVector(d, k);
        spot.y = wy;
        local.lamp = local.lamp ? local.lamp.lerp(spot, 0.4) : spot;
        local.lampSent += dt;
        if (local.lampSent > 0.08) {
          local.lampSent = 0;
          c.send('h8l', local.lamp.toArray().map((v) => +v.toFixed(2)));
        }
      } else if (local.lamp) {
        local.lamp = null;
        c.send('h8l', null);
      }
      const lampAt = local.lamp || local.mateLamp;
      if (lampAt && B) {
        const from = handOf(c, B.guide, V3()).add(V3(0, 0.2, 0));
        W.ST.lamp = [from, lampAt];
      } else W.ST.lamp = null;

      // ---------- lightning ----------
      tickStrike(c, dt);
      local.afterA = Math.max(0, local.afterA - dt / 2.4);
      local.afterB = Math.max(0, local.afterB - dt / 2.4);
      W.ST.afterA = x.stage === 4 ? local.afterA * 0.9 : 0;
      W.ST.afterB = x.stage === 5 ? local.afterB * 0.9 : 0;
      W.ST.ringHint = x.stage === 5 ? 0.3 : 0;
      const watcher = dark(x) && r !== climberOf(x) && !(x.stage === 4 ? x.bridge : x.gate);
      if (ui.storm) {
        const s = local.strike;
        ui.storm.hidden = !(watcher && s && !s.amb);
        if (!ui.storm.hidden) {
          const k = clamp(s.t / s.total, 0, 1);
          ui.arc.setAttribute('stroke-dashoffset', (125.7 * (1 - k)).toFixed(1));
          ui.arc.setAttribute('stroke', s.t < 2 ? '#ffffff' : '#bfc8ff');
          ui.stormT.textContent = s.t < 0.5 ? 'Maintenant !' : 'Éclair dans ' + Math.ceil(s.t) + ' s';
        }
      }
      if (lookT > 0) {
        lookT -= dt;
        if (lookT <= 0) ui.look.classList.remove('on');
      }
      // a little light on each of you in the dark (you see your own feet, never the way ahead)
      if (dark(x)) {
        W.ST.plights[0] = p.clone().add(V3(0, 1.3, 0));
        W.ST.plights[1] = Remote.has ? Remote.pos.clone().add(V3(0, 1.3, 0)) : null;
      } else W.ST.plights[0] = W.ST.plights[1] = null;

      // ---------- the boss ----------
      if (x.stage === 6) {
        local.charge = Math.max(0, local.charge - dt * 0.8);
        W.ST.boss = Object.assign(W.ST.boss || {}, { look: local.bossLook || p, charge: local.charge, lost: x.opened || 0 });
      }
      // the clouds hide the heart of the sky until the storm is beaten
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = x.stage === 7 && local.winT > 1.2;
      if (x.stage === 7) {
        local.winT += dt;
        W.ST.win = local.winT;
        W.ST.storm = clamp(1 - local.winT / 3, 0, 1);
        W.ST.clear = clamp(local.winT / 4, 0, 1);
        W.ST.hemi = 0.46;
      } else {
        W.ST.win = 0;
        W.ST.storm = 1;
        W.ST.clear = 0;
      }

      // ---------- the umbrella in a hand (and passing it) ----------
      const U = local.umb;
      const pa = local.passAnim;
      const open = coldStage && x.stage !== 7 ? 1 : 0.04;
      U.k = damp(U.k, open, 5, dt);
      U.setOpen(U.k);
      const hTo = handOf(c, holder, V3());
      if (pa) {
        pa.t += dt / 0.55;
        const hFrom = handOf(c, pa.from, V3());
        const k = smooth(clamp(pa.t, 0, 1));
        U.g.position.copy(hFrom).lerp(hTo, k);
        U.g.position.y += Math.sin(k * Math.PI) * 0.7 - 0.05;
        U.g.rotation.set(0, k * Math.PI * 2, Math.sin(k * Math.PI) * 0.4);
        if (pa.t >= 1) local.passAnim = null;
      } else {
        U.g.position.copy(hTo);
        U.g.position.y -= 0.05;
        // lean a little towards the other one, against the wind
        const mp = c.pos(mateRole(holder));
        const hp = c.pos(holder);
        const dd = Math.hypot(mp.x - hp.x, mp.z - hp.z);
        const lx = dd < 2.2 && dd > 0.01 ? (mp.x - hp.x) / dd : 0;
        const lz = dd < 2.2 && dd > 0.01 ? (mp.z - hp.z) / dd : 0;
        U.lean.x = damp(U.lean.x, lx, 4, dt);
        U.lean.z = damp(U.lean.z, lz, 4, dt);
        const ax = U.lean.z * 0.18 - local.wind.y * 0.03;
        const az = -U.lean.x * 0.18 + local.wind.x * 0.03;
        if (U.k > 0.5) U.g.rotation.set(ax + Math.sin(t * 3) * 0.02, U.g.rotation.y, az);
        else U.g.rotation.set(0, U.g.rotation.y, Math.PI * 0.92);
      }
      // the dry patch on the ground, and no rain falls under it
      const showCover = coldStage && x.stage !== 7 && U.k > 0.6 && !pa;
      local.disc.visible = showCover;
      if (showCover) {
        let gy2 = Phys.groundAt(cov.x, cov.base + 0.5, cov.z);
        if (!isFinite(gy2)) gy2 = cov.base;
        local.disc.position.set(cov.x, gy2 + 0.03, cov.z);
        local.disc.scale.setScalar(cov.r);
        W.ST.umbCover = { x: cov.x, z: cov.z, r: cov.r * 1.05, y: cov.y };
      } else W.ST.umbCover = null;

      // ---------- sound of the rain where I am ----------
      const under = sh || inTunnel(q) ? 'roof' : meCovered && U.k > 0.6 ? 'umb' : null;
      const falls = [];
      W.AU.tick(dt, { rain: W.ST.rain, under, wind: local.wind.length() + (x.stage >= 4 ? 1.5 : 0.8), falls: W.nearFalls(p, falls) });

      // ---------- the world ----------
      W.update(dt, t, p);
      W.ST.shutter = local.shut;
      W.ST.prog = local.prog;
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
        if (x.stage === 6 && x.fight) HUD.boss(TXT.s6.boss, 1 - (x.opened || 0) / 4, 'Paratonnerres · ' + (x.opened || 0) + ' / 4');
      }
      if (x.stage === 7) return null;
      return prompt;
    },
  });

  const startGust = (d) => {
    const [dx, dz, delay, dur] = d;
    W.AU.gust(delay + dur);
    after(delay, () => {
      local.gust = { t: dur, dx, dz, k: 3.6 };
      if (Story.S && Story.S.x.stage === 1) say(TXT.gust, 1800);
    });
  };
})();
