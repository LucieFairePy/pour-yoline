// ♦ 10 · Le Lac gelé (épreuve d10). Kits swapped in this trial (js/game/trials.js): Yoline carries
// the valet kit, William the dame kit. A frozen lake to cross on slabs of ice. The one who walks
// sees the cracks, only around their feet; the one kneeling at a fishing hole sees under the ice
// what bears (◆, a keel of clear ice) and, from the third crossing, what is hollow (○, bubbles),
// mirrored, turned or upside down depending on where the hole is. A cracked slab gives way unless a
// keel holds it; a hollow one always does. Neither view is enough: they must put the two together.
// Three crossings (roles swap each time), then three more in the storm (a timer, squalls, slabs
// that groan under whoever stands still). A fall is a cold bath and a new layout, never a wound.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d10');
  const T = CONFIG;
  const W = D10;
  const TITLE = 'Le Lac gelé';
  const TXT = {
    intro: 'Épreuve de logique. Un lac gelé au fond du bassin, sous la tempête des Veilleurs.',
    rule: 'La glace ne dit pas tout. L’un marche dessus et voit ses fissures, de tout près. L’autre, penché sur un trou, voit ce qu’il y a dessous.',
    rule2: 'Une dalle fissurée cède… sauf si une quille de glace ◆ la porte par en dessous.',
    walk: {
      1: 'Traverse jusqu’à l’îlot. Tu vois les fissures autour de tes pieds ; {mate} voit les ◆ sous la glace. Dis-lui où tu es : la rangée (les bouées sont numérotées), puis la dalle en partant de ta gauche.',
      2: 'À toi de traverser. La neige poudreuse cache les fissures : tu ne les vois que sous tes pieds et juste autour.',
      3: 'Attends que {mate} soit au trou du bout, puis traverse. Ici, une dalle sans fissure peut céder : sous elle, des bulles ○. Seul{pe} {mate} les voit.',
      F: 'Traverse avant le blizzard. Ne reste pas planté{e} sur une dalle : elle gémit, puis elle cède.',
    },
    read: {
      1: 'Penche-toi sur le trou (E). Sous la glace : ◆ = la dalle porte, même fissurée. Tu ne vois pas les fissures : {mate}, si. Vu d’en dessous, tout est en miroir.',
      2: 'Le trou est sur le côté du lac : dans l’eau, le chemin est de travers. Repère les bouées, et retourne l’image dans ta tête.',
      3: 'Grimpe sur la crête (F sur l’anneau) jusqu’au trou du bout. Nouveau : ○ = des bulles, la glace est creuse ; elle cède même sans fissure. D’ici, tu verras {mate} venir vers toi.',
      F: 'Penche-toi sur le trou, vite. Dans la tempête, l’image tremble : guide {mate} avant que le blizzard recouvre tout.',
    },
    legend: { keel: 'quille : la dalle porte', bub: 'bulles : la glace est creuse', mirror: 'Vu d’en dessous : l’image est inversée' },
    under: 'Sous la glace',
    lean: 'Se pencher sur le trou',
    unlean: 'Se relever',
    notHole: 'Ce trou, c’est pour {mate}. Toi, tu traverses.',
    one: 'La glace ne porte qu’une personne à la fois. Reste au trou : c’est {mate} qui traverse.',
    crossed: 'Passé{e} ! Attends {mate} sur l’îlot : {il} va suivre tes traces.',
    crossedMate: '{mate} est passé{pe}. Suis ses traces sur la glace : elles seules sont sûres.',
    waitMate: 'Attends {mate} : {il} suit tes traces sur la glace.',
    follow: 'Suis les traces de {mate} sur la glace, jusqu’à l’îlot.',
    fall: 'Plouf. L’eau est glacée : retour sur la berge, bien emmitouflé{e}.',
    fallMate: '{mate} est passé{pe} à travers la glace. {Il} remonte, emmitouflé{pe}.',
    reform: 'La glace se reforme : les fissures et les quilles ont changé de place.',
    jump: 'Un saut sur la glace : elle n’a pas aimé.',
    splash: 'Plouf ! L’eau libre ne porte personne. Retour au sec.',
    splashMate: '{mate} a pris un bain glacé. {Il} repart du bord.',
    s2: 'Deuxième traversée. Les rôles s’échangent, et le trou est sur le côté.',
    s3: 'Troisième traversée, la plus longue. Et la glace a des creux.',
    F: {
      intro: 'La tempête se lève sur le lac. Trois dernières traversées, avant qu’elle ne recouvre tout.',
      next: 'Encore une. Les rôles s’échangent.',
      last: 'La dernière. La rive est juste là.',
      storm: 'Le blizzard recouvre la glace. Elle se reforme : retour au bord de cette traversée.',
      squall: 'Une rafale ! Tiens bon.',
      groan: 'La glace gémit sous toi : avance !',
      groanBreak: 'Tu es resté{e} trop longtemps : la dalle a cédé.',
    },
    hint: {
      walker: 'Décris chaque fissure à {mate} : la rangée, puis la dalle en partant de ta gauche.',
      rule1: 'Rappel : fissurée et sans ◆ dessous, la dalle cède. Sans fissure, elle porte.',
      rule3: 'Rappel : ○ dessous, la dalle cède toujours. Fissurée avec ◆ dessous, elle porte.',
      flip: {
        0: 'Vu d’en dessous, tout est en miroir : la droite de {mate} est à ta gauche.',
        1: 'De ce trou, le lac est de travers : l’avant de {mate} est à ta droite, sa droite est en haut.',
        2: 'D’ici, {mate} vient vers toi : sa première rangée est en haut, et sa droite est aussi ta droite.',
        3: 'Vu d’en dessous, tout est en miroir : la droite de {mate} est à ta gauche.',
        4: 'De ce trou, le lac est de travers : l’avant de {mate} est à ta droite, sa droite est en haut.',
        5: 'De ce trou, le lac est de travers : l’avant de {mate} est à ta gauche, sa gauche est en haut.',
      },
      time: 'Prenez le temps : une rangée à la fois. Celui qui marche décrit, celui qui voit dessous répond.',
    },
    win: 'Le dernier pas sur la rive. Derrière vous, la tempête retombe en neige fine.',
    win2: 'Au-dessus du lac, l’aurore revient. Elle danse pour vous deux.',
    card: 'La carte ' + CARD + ' descend sur la rive. Allez-y ensemble.',
    stage: { 1: 'Traversée 1 / 3', 2: 'Traversée 2 / 3', 3: 'Traversée 3 / 3', 4: 'Tempête · 1 / 3', 5: 'Tempête · 2 / 3', 6: 'Tempête · 3 / 3', 7: 'La rive' },
    storm: 'Blizzard',
    groanCap: 'La glace gémit',
  };
  CONFIG.cards.d10 = {
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'L’un voyait les fissures, l’autre voyait dessous.',
      'Aucun des deux n’avait tout le chemin.',
      'On l’a retourné dans nos têtes, à deux, dalle après dalle.',
    ],
  };

  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  // who walks each crossing (the other reads under the ice); the field of each stage
  const WALKER = { 1: 'valet', 2: 'dame', 3: 'valet', 4: 'dame', 5: 'valet', 6: 'dame' };
  const FIELD = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
  const finale = (st) => st >= 4 && st <= 6;
  const hollow = (st) => st >= 3;
  // how far from your feet the cracks show through the powder
  const CRACK_R = { 1: 3.4, 2: 1.9, 3: 2.7, 4: 2.7, 5: 2.7, 6: 2.7 };
  const P_WEAK = { 1: 0.5, 2: 0.55, 3: 0.5, 4: 0.55, 5: 0.55, 6: 0.55 };
  const STORM_T = 150;
  const GROAN_WARN = 4.5;
  const GROAN_T = 8;
  const KEEL = 1;
  const BUB = 2;
  const newSeed = () => (Math.random() * 1e9) | 0;

  // ---------- the layout of a field, from the shared seed ----------
  // Every slab is weak or bears. Weak: cracked with nothing under it, or (from the third crossing)
  // hollow, full of bubbles. Bearing: no crack, or a crack held by a keel; some uncracked slabs have
  // a keel too. Re-drawn until neither of you could cross alone: not along the uncracked slabs only
  // (the walker's view), not along the keels only (the reader's view).
  const cache = new Map();
  const reach = (G, ok) => {
    const seen = new Array(G.n).fill(false);
    const q = [];
    for (let c = 0; c < G.cols; c++)
      if (ok(c)) {
        seen[c] = true;
        q.push(c);
      }
    while (q.length) {
      const i = q.shift();
      const col = i % G.cols;
      const row = Math.floor(i / G.cols);
      if (row === G.rows - 1) return true;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const r2 = row + dr;
          const c2 = col + dc;
          if (r2 < 0 || r2 >= G.rows || c2 < 0 || c2 >= G.cols) continue;
          const j = r2 * G.cols + c2;
          if (!seen[j] && ok(j)) {
            seen[j] = true;
            q.push(j);
          }
        }
    }
    return false;
  };
  const layout = (st, seed) => {
    const key = st + ':' + seed;
    if (cache.has(key)) return cache.get(key);
    const G = W.GRIDS[FIELD[st]];
    const r = rng(seed);
    let out = null;
    for (let tries = 0; tries < 600 && !out; tries++) {
      const path = new Array(G.n).fill(false);
      let col = Math.floor(r() * G.cols);
      for (let row = 0; row < G.rows; row++) {
        path[row * G.cols + col] = true;
        if (row === G.rows - 1) break;
        const side = r() < 0.7 ? (r() < 0.5 ? -1 : 1) * (r() < 0.35 ? 2 : 1) : 0;
        const to = clamp(col + side, 0, G.cols - 1);
        while (col !== to) {
          col += Math.sign(to - col);
          path[row * G.cols + col] = true;
        }
      }
      const cells = [];
      for (let i = 0; i < G.n; i++) {
        const weak = !path[i] && r() < P_WEAK[st];
        let crack = 0;
        let sym = 0;
        if (weak) {
          if (hollow(st) && r() < 0.4) sym = BUB;
          else crack = 1;
        } else {
          crack = r() < 0.5 ? 1 : 0;
          sym = crack || r() < 0.3 ? KEEL : 0;
        }
        cells.push({ weak, crack: crack ? 1 + Math.floor(r() * 4) : 0, sym, rot: r() });
      }
      // the walker alone (stepping only where no crack shows) must not get through, even by luck
      if (reach(G, (i) => !cells[i].crack && !cells[i].weak)) continue;
      // the reader alone (keels only) must not either
      if (reach(G, (i) => cells[i].sym === KEEL)) continue;
      if (hollow(st) && cells.filter((c) => c.sym === BUB).length < 2) continue;
      if (cells.filter((c) => c.weak).length < G.n * 0.3) continue;
      out = { st, seed, G, cells };
    }
    if (!out) {
      // (never seen: 600 draws always found one) a plain layout rather than nothing
      const cells = [];
      for (let i = 0; i < G.n; i++) cells.push({ weak: false, crack: 1 + (i % 4), sym: KEEL, rot: 0 });
      out = { st, seed, G, cells };
    }
    cache.set(key, out);
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    return out;
  };

  const local = {
    stage: 0,
    seed: null,
    trodN: -1,
    lean: false,
    plunge: null,
    pend: [],
    sayCd: {},
    said: {},
    stepSent: {},
    groan: { i: -1, t: 0, sent: 0, warned: false },
    squall: null,
    sqK: 0,
    stormLeft: STORM_T,
    stormShown: STORM_T,
    sqT: 20,
    hostStage: 0,
    stT: 0,
    airT: 0,
    brokeT: 0,
    layPending: false,
    lastFall: 0,
    winT: 0,
    objT: 0,
    breathT: 2,
    ducked: false,
    ridge: false,
    env: null,
    lastCell: -1,
    layStage: 0,
  };
  W.local = local;
  W.layout = layout;
  const after = (sec, fn) => local.pend.push({ t: sec, fn });
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const sayBoth = (c, mine, theirs, hold) => {
    say(mine, hold);
    c.send('d10say', [theirs || mine, hold || 2800]);
  };
  const sayOnce = (k, text, cd = 12, hold) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text, hold);
  };
  const sayFirst = (k, text, hold) => {
    if (local.said[k]) return;
    local.said[k] = true;
    say(text, hold);
  };

  // ---------- HUD of the épreuve ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #d10ui{position:fixed;left:22px;bottom:118px;z-index:6;pointer-events:none;font:600 12px/1.25 "IBM Plex Mono",monospace;color:#e6f0ff;letter-spacing:.05em;text-shadow:0 1px 3px #000}
      #d10ui .cap{opacity:.6;font-size:10px;text-transform:uppercase;margin-bottom:4px}
      #d10ui .st{font-size:13px;margin-bottom:6px}
      #d10ui .row{display:flex;align-items:center;gap:8px;margin:5px 0}
      #d10ui .nm{width:96px;text-transform:uppercase;opacity:.85;font-size:11px}
      #d10ui .bar{width:150px;height:7px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
      #d10ui .bar i{display:block;height:100%;width:100%;transform-origin:0 50%;background:linear-gradient(90deg,#9fd8ff,#e8f6ff)}
      #d10ui .row.groan .bar i{background:linear-gradient(90deg,#9fd8ff,#ff9aa8)}
      #d10ui .t{width:44px;text-align:right}
      #d10hole{position:fixed;inset:0;z-index:5;pointer-events:none;display:none;background:radial-gradient(circle at 50% 52%,rgba(0,0,0,0) 0,rgba(0,0,0,0) 40%,rgba(2,14,20,.55) 50%,rgba(1,6,10,.94) 62%,#000 75%)}
      #d10hole .top{position:absolute;left:50%;top:5%;transform:translateX(-50%);text-align:center;font:italic 600 22px/1.2 Georgia,serif;color:#dff4ff;text-shadow:0 0 12px rgba(120,200,255,.7),0 2px 4px #000}
      #d10hole .top small{display:block;margin-top:6px;font:600 11px/1.3 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;opacity:.75;font-style:normal}
      #d10hole .leg{position:absolute;right:4%;bottom:12%;display:flex;flex-direction:column;gap:8px;font:600 12px/1.2 "IBM Plex Mono",monospace;color:#e6f4ff;text-shadow:0 1px 3px #000}
      #d10hole .leg span{display:flex;align-items:center;gap:10px}
      #d10hole .leg b{width:26px;text-align:center;font:400 22px/1 Georgia,serif}
      #d10hole .leg .k b{color:#ffd88a;text-shadow:0 0 10px rgba(255,200,120,.9)}
      #d10hole .leg .h b{color:#bfe8ff;text-shadow:0 0 10px rgba(160,220,255,.9)}
      #d10frost{position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 45%,rgba(150,200,255,.3) 75%,rgba(230,245,255,.8) 100%)}
      #d10white{position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;background:radial-gradient(ellipse at 50% 40%,rgba(220,232,245,.35),rgba(200,215,232,.75))}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'd10ui';
    ui.root.innerHTML = `<div class="cap">${TITLE}</div><div class="st"></div>
      <div class="row storm"><span class="nm"></span><span class="bar"><i></i></span><span class="t"></span></div>
      <div class="row groan"><span class="nm"></span><span class="bar"><i></i></span></div>`;
    document.body.appendChild(ui.root);
    ui.st = ui.root.querySelector('.st');
    ui.storm = ui.root.querySelector('.row.storm');
    ui.storm.querySelector('.nm').textContent = TXT.storm;
    ui.stormBar = ui.storm.querySelector('i');
    ui.stormT = ui.storm.querySelector('.t');
    ui.groan = ui.root.querySelector('.row.groan');
    ui.groan.querySelector('.nm').textContent = TXT.groanCap;
    ui.groanBar = ui.groan.querySelector('i');
    ui.hole = document.createElement('div');
    ui.hole.id = 'd10hole';
    ui.hole.innerHTML = `<div class="top">${TXT.under}<small></small></div>
      <div class="leg"><span class="k"><b>◆</b>${TXT.legend.keel}</span><span class="h"><b>○</b>${TXT.legend.bub}</span></div>`;
    document.body.appendChild(ui.hole);
    ui.holeSub = ui.hole.querySelector('small');
    ui.legH = ui.hole.querySelector('.leg .h');
    ui.frost = document.createElement('div');
    ui.frost.id = 'd10frost';
    document.body.appendChild(ui.frost);
    ui.white = document.createElement('div');
    ui.white.id = 'd10white';
    document.body.appendChild(ui.white);
  };
  const showUI = (on) => {
    if (!ui.root) return;
    ui.root.style.display = on ? '' : 'none';
    if (!on) {
      ui.hole.style.display = 'none';
      ui.frost.style.opacity = 0;
      ui.white.style.opacity = 0;
    }
  };
  let frostK = 0;
  const frostFlash = () => (frostK = 1);

  // ---------- where everyone goes back to ----------
  const rel = (p) => W.rel(p);
  const gridIdx = (x) => FIELD[x.stage];
  const spawnFor = (c, role) => {
    const x = c.S.x;
    const st = x.stage;
    const k = role === 'dame' ? -1 : 1;
    if (st >= 7) return W.P(k * 1.2, 0.35, W.GRIDS[5].z1 + 3);
    const gi = FIELD[st];
    const G = W.GRIDS[gi];
    if (role === WALKER[st]) return x.crossed ? W.P(k * 1.2, 0.35, G.z1 + 2.6) : W.startOf(gi, k);
    if (x.crossed) return st === 3 ? W.holeSpot(gi) : W.startOf(gi, k);
    if (st === 3 && !local.ridge) return W.P(7.6, 0.35, 46.5);
    return W.holeSpot(gi);
  };
  const yawFor = (c, role) => {
    const x = c.S.x;
    if (x.stage <= 6 && role !== WALKER[x.stage] && !x.crossed && !(x.stage === 3 && !local.ridge)) return W.faceYaw(FIELD[x.stage]);
    return 0;
  };
  const respawn = (c) => {
    local.airT = 0;
    c.spawn(spawnFor(c, c.role), yawFor(c, c.role));
  };

  // ---------- leaning over the hole ----------
  const setLean = (c, on) => {
    if (local.lean === on) return;
    local.lean = on;
    const x = c.S.x;
    if (on) {
      const gi = gridIdx(x);
      c.spawn(W.holeSpot(gi), W.faceYaw(gi));
      Player.mode = 'frozen';
      Sound.play('tile');
      W.AU.splash(W.holes[gi].pos, 0.25);
      if (!local.ducked) Sound.duck(true);
      local.ducked = true;
      ui.hole.style.display = 'block';
      ui.legH.style.display = hollow(x.stage) ? '' : 'none';
      ui.holeSub.textContent = TXT.legend.mirror;
    } else {
      if (Player.mode === 'frozen') Player.mode = 'walk';
      if (local.ducked) Sound.duck(false);
      local.ducked = false;
      ui.hole.style.display = 'none';
      W.ST.lean = null;
      Cam.snap(Player.body.p, Cam.yaw);
    }
  };

  // ---------- falls ----------
  const plunge = (c, why) => {
    if (local.plunge) return;
    setLean(c, false);
    local.plunge = { t: 0, hp: Player.body.p.clone(), y0: Player.body.p.y, why };
    Player.hangPos = local.plunge.hp;
    Player.mode = 'hang';
    Player.body.v.set(0, 0, 0);
    Cam.shake = Math.max(Cam.shake, 0.35);
  };
  // the slab under me gives way (on my screen at once, on the other's by message)
  const breakUnder = (c, gi, i, why) => {
    W.breakSlab(gi, i);
    c.send('d10b', [gi, i]);
    local.brokeT = 1.3;
    plunge(c, why);
    const x = c.S.x;
    if (c.role === WALKER[x.stage] && !x.crossed && FIELD[x.stage] === gi) c.act({ a: 'fall', s: x.seed, i });
    c.send('d10say', [TXT.fallMate, 3000]);
  };
  const endPlunge = (c) => {
    const pl = local.plunge;
    local.plunge = null;
    Player.hangPos = null;
    Player.mode = 'walk';
    respawn(c);
    frostFlash();
    if (pl.why === 'jump') say(TXT.jump, 2200);
    else if (pl.why === 'groan') say(TXT.F.groanBreak, 2600);
    say(TXT.fall, 2800);
  };

  // ---------- applying the shared state to the fields ----------
  const applyLayout = (c) => {
    const x = c.S.x;
    if (x.stage > 6) return;
    const gi = gridIdx(x);
    const L = layout(x.stage, x.seed);
    const reroll = local.seed !== null && local.layStage === x.stage && local.seed !== x.seed;
    W.resetField(gi);
    W.setField(gi, L.cells, x.trod || []);
    local.seed = x.seed;
    local.layStage = x.stage;
    local.trodN = (x.trod || []).length;
    local.layPending = false;
    local.stepSent = {};
    local.groan = { i: -1, t: 0, sent: 0, warned: false };
    if (reroll) {
      W.reform(gi);
      sayOnce('reform', TXT.reform, 6, 2600);
    }
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const st = x.stage;
    if (st >= 7) return TXT.card;
    const walker = c.role === WALKER[st];
    if (x.crossed) return walker ? TXT.waitMate : TXT.follow;
    const k = finale(st) ? 'F' : st;
    return walker ? TXT.walk[k] : TXT.read[k];
  };

  // ---------- light per stretch ----------
  const ENV = {
    1: { hemi: 0.55, sun: 0.75, storm: 0, music: 'calm' },
    2: { hemi: 0.52, sun: 0.7, storm: 0.1, music: 'calm' },
    3: { hemi: 0.5, sun: 0.66, storm: 0.2, music: 'calm' },
    4: { hemi: 0.42, sun: 0.45, storm: 0.8, music: 'tense' },
    5: { hemi: 0.4, sun: 0.4, storm: 0.9, music: 'tense' },
    6: { hemi: 0.38, sun: 0.36, storm: 1, music: 'tense' },
    7: { hemi: 0.62, sun: 0.85, storm: 0, music: 'gold' },
  };
  const applyEnv = (st) => {
    const e = ENV[st] || ENV[1];
    W.base.hemi = e.hemi;
    R.moon.intensity = e.sun;
    W.ST.storm = e.storm;
    Sound.mood(e.music);
  };

  const stageEnter = (c, st, prev) => {
    local.stage = st;
    local.stT = 0;
    local.said = {};
    local.sayCd = {};
    local.ridge = false;
    local.squall = null;
    local.stormShown = STORM_T;
    setLean(c, false);
    applyEnv(st);
    if (prev && st > prev) Sound.play('chime');
    const walker = st <= 6 && c.role === WALKER[st];
    if (st === 2) say(TXT.s2, 3000);
    if (st === 3) say(TXT.s3, 3000);
    if (st === 4) {
      say(TXT.F.intro, 3600);
      if (W.screen) W.screen.show('La tempête', 'trois traversées avant le blizzard', '#bfe0ff');
    }
    if (st === 5) say(TXT.F.next, 2400);
    if (st === 6) say(TXT.F.last, 2400);
    // the role itself is in the objective (the subtitles would lag behind the play)
    if (st === 3 && prev && !walker) say(TXT.read[3], 6200);
    if (st === 7) {
      local.winT = 0;
      W.ST.card = true;
      say(TXT.win, 3000);
      after(3.2, () => say(TXT.win2, 4000));
      after(6.5, () => say(TXT.card, 3600));
      Sound.play('reveal');
      Sound.play('chime');
      const C = W.CARD;
      for (let i = 0; i < 5; i++) after(0.4 + i * 0.35, () => Fx.burst(W.P(C.x + (i - 2) * 3, 5 + (i % 2) * 2, C.z - 4), i % 2 ? '#9ff0d0' : '#ffd77a', 70, 6, 1.5, -1, 'heart'));
      [-10, 10].forEach((xx) => after(1.6 + Math.random(), () => Fx.firework(W.P(xx, 14, C.z + 6), 30)));
    }
  };

  // ---------- the storm (host) ----------
  const startSquall = (d) => {
    const [dur, dir] = d;
    local.squall = { t: dur, total: dur, dir };
    W.AU.groan(Player.body.p.clone().add(V3(dir * 20, 0, 10)), 0.5);
    if (c0 && c0.role === WALKER[c0.S.x.stage] && !c0.S.x.crossed) say(TXT.F.squall, 1800);
  };
  let c0 = null;
  const tickStorm = (c, dt) => {
    const x = c.S.x;
    if (x.stage !== local.hostStage) {
      local.hostStage = x.stage;
      local.stormLeft = STORM_T;
      local.sqT = 24 + Math.random() * 6;
    }
    if (!finale(x.stage) || x.crossed) return;
    local.stormLeft -= dt;
    local.sqT -= dt;
    if (local.sqT <= 0) {
      local.sqT = 22 + Math.random() * 10;
      const d = [4, Math.random() < 0.5 ? -1 : 1];
      startSquall(d);
      c.send('d10sq', d);
    }
    local.stSent = (local.stSent || 0) + dt;
    if (local.stSent > 0.5) {
      local.stSent = 0;
      c.send('d10st', Math.max(0, Math.round(local.stormLeft)));
      local.stormShown = local.stormLeft;
    }
    if (local.stormLeft <= 0) {
      local.stormLeft = STORM_T;
      c.set((s) => {
        s.x.seed = newSeed();
        s.x.trod = [];
        s.x.falls = (s.x.falls || 0) + 1;
      });
      stormBack(c);
      c.send('d10storm', 1);
    }
  };
  // the blizzard wins: the walker goes back to the edge of this crossing
  const stormBack = (c) => {
    say(TXT.F.storm, 3200);
    W.flash(1);
    W.AU.thunder(1);
    const x = c.S.x;
    if (c.role === WALKER[x.stage] && !x.crossed) {
      setLean(c, false);
      if (local.plunge) return;
      respawn(c);
      frostFlash();
    }
  };

  Story.register('tr_d10', {
    world: D10,
    init: () => ({ stage: 1, seed: newSeed(), trod: [], crossed: false, falls: 0, won: false }),
    // the voice carries over the ice: the one at the hole hears the one on it
    voice: () => 1,
    partner: () => !local.lean,
    net: {
      d10say: (c, d) => say(Story.fmt(d[0]), d[1] || 2600),
      d10b: (c, d) => {
        W.breakSlab(d[0], d[1]);
        local.brokeT = 1.3;
      },
      d10g: (c, d) => W.setGroan(d[0], d[1], d[2]),
      d10sq: (c, d) => !Net.isHost && startSquall(d),
      d10st: (c, d) => {
        if (!Net.isHost) local.stormShown = d;
      },
      d10storm: (c) => !Net.isHost && stormBack(c),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      c0 = c;
      W.build();
      W.show();
      makeUI();
      showUI(true);
      W.AU.resume();
      local.stage = 0;
      local.seed = null;
      local.layStage = 0;
      local.trodN = -1;
      local.lean = false;
      local.plunge = null;
      local.pend = [];
      local.sayCd = {};
      local.said = {};
      local.stepSent = {};
      local.groan = { i: -1, t: 0, sent: 0, warned: false };
      local.squall = null;
      local.sqK = 0;
      local.stormLeft = STORM_T;
      local.stormShown = STORM_T;
      local.hostStage = 0;
      local.stT = 0;
      local.airT = 0;
      local.brokeT = 0;
      local.layPending = false;
      local.lastFall = 0;
      local.winT = 0;
      local.ridge = false;
      local.lastCell = -1;
      W.GRIDS.forEach((G, i) => {
        W.resetField(i);
        W.setField(i, null, []);
      });
      W.ST.card = false;
      W.ST.win = 0;
      W.ST.lean = null;
      W.ST.squall = 0;
      respawn(c);
      Player.killY = W.O.y - 1.6;
      Player.checkpoint = () => {
        const p = Player.body.p.clone();
        say(TXT.splash, 2400);
        c.send('d10say', [TXT.splashMate, 2400]);
        W.AU.splash(p.setY(W.O.y), 1);
        Fx.burst(p.clone().add(V3(0, 0.3, 0)), '#bfe4ff', 40, 3, 0.8, -6);
        frostFlash();
        setLean(c, false);
        return spawnFor(c, c.role);
      };
      Player.targets = () => {
        const x = Story.S && Story.S.x;
        return x && x.stage === 3 && c.role === mateRole(WALKER[3]) && !x.crossed && !local.ridge && !local.lean ? [W.RING.wp] : [];
      };
      Player.grappleLand = () => (Player.body.p.distanceTo(W.RING.wp) < 6 ? W.P(...W.RING.land) : null);
      W.base.hemi = 0.55;
      LvKit.mood({
        sky: '#4a6a98',
        ground: '#0b1220',
        hemi: 0.55,
        sun: '#a8c8ff',
        sunI: 0.75,
        sunPos: V3(-60, 72, 176),
        exposure: 1.3,
        haze: W.hz,
        extras: [W.sky, W.motes],
      });
      local.fog0 = R.scene.fog.density;
      c.fog(0.016);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · la glace et son reflet', '#bfe6ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        say(TXT.intro, 3600);
        say(TXT.rule, 5200);
        say(TXT.rule2, 4200);
        say(c.role === WALKER[1] ? TXT.walk[1] : TXT.read[1], 7200);
      }
      this.apply(c);
    },
    exit() {
      if (local.lean) {
        local.lean = false;
        if (Player.mode === 'frozen') Player.mode = 'walk';
      }
      if (local.ducked) Sound.duck(false);
      local.ducked = false;
      if (local.plunge) {
        local.plunge = null;
        Player.hangPos = null;
        Player.mode = 'walk';
      }
      Player.targets = null;
      Player.grappleLand = null;
      Player.killY = -40;
      R.camera.up.set(0, 1, 0);
      W.ST.lean = null;
      W.ST.squall = 0;
      W.ST.storm = 0;
      showUI(false);
      LvKit.mood(null);
      if (local.fog0 != null) R.scene.fog.density = local.fog0;
      W.hide();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage, local.stage);
      if (x.stage <= 6) {
        // a new layout (a new stage, or the ice reforming): after the broken slab has sunk
        if (x.seed !== local.seed || x.stage !== local.layStage) {
          if (local.brokeT > 0 && x.stage === local.layStage) local.layPending = true;
          else applyLayout(c);
        } else if ((x.trod || []).length !== local.trodN) {
          local.trodN = (x.trod || []).length;
          W.setTrod(gridIdx(x), x.trod || []);
        }
        if (x.crossed && local.lean) setLean(c, false);
      }
      W.ST.hole = x.stage <= 6 && !x.crossed ? gridIdx(x) : -1;
      W.ST.card = x.stage >= 7;
      HUD.objective(Story.fmt(objective(c)));
      if (ui.st) ui.st.textContent = TXT.stage[Math.min(7, x.stage)];
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const st = x.stage;
      if (st <= 6) {
        const gi = FIELD[st];
        const G = W.GRIDS[gi];
        const walker = WALKER[st];
        const landAfter = W.LAND_AFTER[gi];
        const qw = rel(c.pos(walker));
        const qr = rel(c.pos(mateRole(walker)));
        if (!x.crossed && W.at(landAfter, qw) && qw.z > G.z1 + 0.4) {
          c.set((s) => (s.x.crossed = true));
          if (c.role === walker) sayBoth(c, TXT.crossed, TXT.crossedMate, 3400);
          else sayBoth(c, TXT.crossedMate, TXT.crossed, 3400);
          Sound.play('reveal');
        }
        if (x.crossed && W.at(landAfter, qw) && W.at(landAfter, qr) && qr.z > G.z1 + 0.2) {
          c.set((s) => {
            s.x.stage = st + 1;
            s.x.seed = newSeed();
            s.x.trod = [];
            s.x.crossed = false;
            s.x.falls = 0;
            if (st === 6) s.x.won = true;
          });
        }
        tickStorm(c, dt);
      }
      if (st === 7 && local.winT > 5) {
        const C = W.CARD;
        const near = (q) => Math.hypot(q.x - C.x, q.z - C.z) < 4.5;
        if (near(rel(c.pos('dame'))) && near(rel(c.pos('valet')))) c.goto('reward', (s) => (s.x.card = 'd10'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      const st = x.stage;
      if (st > 6) return;
      // only the one whose turn it is leaves footprints and re-draws the ice by falling
      if (who !== WALKER[st] || x.crossed || d.s !== x.seed) return;
      const L = layout(st, x.seed);
      if (d.a === 'step') {
        const i = d.i | 0;
        if (i < 0 || i >= L.G.n || L.cells[i].weak || (x.trod || []).includes(i)) return;
        const [cx, cz] = W.cellPos(L.G, i);
        const q = rel(c.pos(who));
        if (Math.hypot(q.x - cx, q.z - cz) > 3.2) return;
        c.set((s) => (s.x.trod = (s.x.trod || []).concat([i])));
      }
      if (d.a === 'fall') {
        if (performance.now() - local.lastFall < 1500) return;
        local.lastFall = performance.now();
        c.set((s) => {
          s.x.seed = newSeed();
          s.x.trod = [];
          s.x.falls = (s.x.falls || 0) + 1;
        });
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      c0 = c;
      const x = c.S.x;
      const st = x.stage;
      const r = c.role;
      const p = Player.body.p;
      const q = rel(p);
      const gi = st <= 6 ? FIELD[st] : -1;
      const G = gi >= 0 ? W.GRIDS[gi] : null;
      const walker = st <= 6 && r === WALKER[st];
      local.stT += dt;
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.brokeT = Math.max(0, local.brokeT - dt);
      if (local.layPending && local.brokeT <= 0) applyLayout(c);

      // ---------- the cold bath ----------
      if (local.plunge) {
        const pl = local.plunge;
        pl.t += dt;
        pl.hp.y = pl.y0 - Math.min(1.8, pl.t * pl.t * 2.4);
        Player.hangPos = pl.hp;
        Player.body.v.set(0, 0, 0);
        if (pl.t > 0.25 && !pl.sp) {
          pl.sp = true;
          Fx.burst(pl.hp.clone().setY(W.O.y), '#bfe4ff', 50, 3.5, 0.9, -7);
        }
        if (pl.t > 1.1) endPlunge(c);
      }

      // ---------- on the ice ----------
      const gq = W.gridOf(q);
      const grounded = Player.body.grounded && Player.mode === 'walk';
      if (!grounded && Player.mode === 'walk') local.airT += dt;
      // no run-up on smooth ice: a jump does not leave the ground (and a fall onto it breaks it)
      if (gq >= 0 && q.y < 0.7 && Player.body.v.y > 0 && Player.mode === 'walk') Player.body.v.y = 0;
      let cell = -1;
      if (grounded && gq >= 0 && q.y > -0.3 && q.y < 0.3 && !local.plunge) cell = W.cellAt(gq, q);
      if (cell >= 0) {
        const hard = local.airT > 0.38;
        local.airT = 0;
        const cur = gq === gi && st <= 6;
        const L = cur ? layout(st, x.seed) : null;
        // the one at the hole keeps off the ice until the other is across
        if (cur && !walker && !x.crossed) {
          sayOnce('one', TXT.one, 6, 3200);
          respawn(c);
        } else if (cur && local.layPending) {
          // the ice is reforming under a fresh fall: wait for it
        } else if (cur && (L.cells[cell].weak || hard)) {
          breakUnder(c, gi, cell, hard ? 'jump' : 'weak');
        } else if (cur && walker && !x.crossed) {
          if (cell !== local.lastCell) W.AU.creak(p);
          if (!(x.trod || []).includes(cell) && !local.stepSent[cell]) {
            local.stepSent[cell] = true;
            c.act({ a: 'step', s: x.seed, i: cell });
          }
        }
        // the storm: the slab you stand on groans, then breaks
        if (cur && walker && !x.crossed && finale(st) && !local.plunge) {
          const g = local.groan;
          if (g.i !== cell) {
            if (g.i >= 0) {
              W.setGroan(gi, g.i, 0);
              c.send('d10g', [gi, g.i, 0]);
            }
            local.groan = { i: cell, t: 0, sent: 0, warned: false };
          } else {
            g.t += dt;
            const k = clamp((g.t - 2) / (GROAN_T - 2), 0, 1);
            W.setGroan(gi, cell, k);
            g.sent -= dt;
            if (g.sent <= 0) {
              g.sent = 0.3;
              c.send('d10g', [gi, cell, +k.toFixed(2)]);
            }
            if (g.t > GROAN_WARN && !g.warned) {
              g.warned = true;
              say(TXT.F.groan, 1800);
              W.AU.groan(p, 1);
            }
            if (g.t > GROAN_T) {
              W.setGroan(gi, cell, 0);
              c.send('d10g', [gi, cell, 0]);
              breakUnder(c, gi, cell, 'groan');
            }
          }
        }
        local.lastCell = cell;
      } else {
        if (grounded) local.airT = 0;
        if (local.groan.i >= 0 && gi >= 0 && !local.plunge) {
          W.setGroan(gi, local.groan.i, 0);
          c.send('d10g', [gi, local.groan.i, 0]);
          local.groan = { i: -1, t: 0, sent: 0, warned: false };
        }
        local.lastCell = -1;
      }
      // the ridge of the third crossing, once reached, is the reader's checkpoint
      if (st === 3 && !walker && W.at('RIDGE', q)) local.ridge = true;

      // ---------- squalls: a push across the ice, and white for the walker ----------
      const sq = local.squall;
      if (sq) {
        sq.t -= dt;
        if (sq.t <= 0) local.squall = null;
      }
      const sqk = sq ? Math.min(1, (sq.total - sq.t) * 2, sq.t * 1.5) : 0;
      local.sqK = damp(local.sqK, sqk, 4, dt);
      W.ST.squall = local.sqK;
      W.ST.wind.set((sq ? sq.dir : 0.3) * (0.6 + local.sqK * 3), 0.4);
      if (sq && gq >= 0 && Player.mode === 'walk' && !local.lean) p.x += sq.dir * 0.8 * sqk * dt;

      // ---------- E: the hole ----------
      let prompt = null;
      if (st <= 6 && !local.plunge) {
        const h = W.holes[gi];
        const dh = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
        if (local.lean) {
          prompt = ['E', TXT.unlean, false];
          if (Input.pressed('interact') || Input.pressed('jump') || x.crossed) setLean(c, false);
        } else if (dh < 1.9 && Math.abs(h.pos.y - p.y) < 1.2 && !x.crossed) {
          if (walker) {
            prompt = ['E', Story.fmt(TXT.notHole), false];
            if (Input.pressed('interact')) sayOnce('notHole', TXT.notHole, 4);
          } else {
            prompt = ['E', TXT.lean, false];
            if (Input.pressed('interact')) setLean(c, true);
          }
        }
      }
      // the camera under the ice
      if (local.lean && st <= 6) {
        W.ST.lean = gi;
        const wp = c.pos(WALKER[st]);
        const wq = rel(wp);
        W.ST.walker = Math.abs(wq.z - G.zc) < G.z1 - G.zc + 3 && Math.abs(wq.x) < G.hw + 2 ? wp : null;
        W.underCam(gi, R.camera, t, 1 + local.sqK * 6);
        ui.hole.style.opacity = String(1 - local.sqK * 0.35);
      } else W.ST.lean = null;

      // ---------- what each screen shows ----------
      W.ST.me.copy(p);
      W.ST.crackK = st <= 6 && (walker || x.crossed) ? 1 : 0;
      W.ST.crackR = CRACK_R[st] || 2.7;

      // ---------- hints: after falls, after a long while ----------
      if (st <= 6 && !x.crossed) {
        const f = x.falls || 0;
        if (f >= 2) sayFirst('rule', hollow(st) ? TXT.hint.rule3 : TXT.hint.rule1, 4200);
        if (f >= 3) sayFirst('flip', walker ? TXT.hint.walker : TXT.hint.flip[gi], 5200);
        if (local.stT > 160) sayFirst('time', TXT.hint.time, 4200);
      }

      // ---------- the HUD of the épreuve ----------
      showUI(true);
      const showStorm = finale(st) && !x.crossed;
      ui.storm.style.display = showStorm ? '' : 'none';
      if (showStorm) {
        const left = Net.isHost ? local.stormLeft : local.stormShown;
        if (!Net.isHost) local.stormShown = Math.max(0, local.stormShown - dt);
        ui.stormBar.style.transform = `scaleX(${clamp(left / STORM_T, 0, 1)})`;
        const s = Math.max(0, Math.ceil(left));
        ui.stormT.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      }
      const gk = local.groan.i >= 0 && walker && finale(st) ? clamp(local.groan.t / GROAN_T, 0, 1) : 0;
      ui.groan.style.display = gk > 0.05 ? '' : 'none';
      ui.groanBar.style.transform = `scaleX(${gk})`;
      frostK = Math.max(0, frostK - dt / 2.2);
      ui.frost.style.opacity = String(frostK * 0.9);
      ui.white.style.opacity = String(local.lean ? 0 : local.sqK * (walker ? 0.75 : 0.45));

      // ---------- breath in the cold ----------
      local.breathT -= dt;
      if (local.breathT <= 0 && !local.lean) {
        local.breathT = 2.4 + Math.random() * 1.6;
        const hp = Player.avatar ? Player.avatar.hand(V3()) : p.clone().add(V3(0, 1.2, 0));
        Fx.burst(hp.add(V3(0, 0.5, 0)), '#55687a', 6, 0.5, 0.9, 0.4);
      }

      // ---------- the win ----------
      if (st >= 7) {
        local.winT += dt;
        W.ST.win = clamp(local.winT / 4, 0, 1);
        W.ST.storm = 0;
      }

      // ---------- sound, world ----------
      W.AU.tick(dt, { storm: W.ST.storm, squall: local.sqK, under: local.lean });
      W.update(dt, t);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.6;
        HUD.objective(Story.fmt(objective(c)));
      }
      if (st >= 7 || local.plunge) return null;
      return prompt;
    },
  });
})();
