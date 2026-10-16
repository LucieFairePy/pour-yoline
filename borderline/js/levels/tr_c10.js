// ♣ 10 · La Tour de Babel (épreuve c10). Each of you reads a script only the other can
// translate: the reader sees the inscription (on the stone and in the HUD) and describes it, the
// other one holds the lexicon (glyph -> picture) and translates; the hands that act are split by
// role and checked by the host. The lexicons are dealt per run, a wrong answer brings the
// lightning and a new inscription. Floors: the gate (one glyph), the bells (an order), the
// rings (lines and the « en face » grammar), the terrace (both directions at once), the lift
// (against the clock, then both at once), the crown.
// The rain, wind and thunder bed is L'Averse's procedural one (H8.AU, same storm over Terre 39).
(() => {
  const CARD = Cards.tagOf('c10');
  const T = CONFIG;
  const W = C10;
  const TITLE = 'La Tour de Babel';
  const PICN = ['Lune', 'Soleil', 'Étoile', 'Cœur', 'Clé', 'Œil', 'Éclair', 'Couronne'];
  const TXT = {
    intro: 'Épreuve d’équipe. La tour de Babel : chacun de vous lit une écriture que seul l’autre comprend.',
    rule: 'Celui qui voit les signes les décrit, celui qui a le lexique les traduit. Une erreur, et la tour réécrit tout.',
    lexHelp: 'Ton lexique est à droite de l’écran. {mate} ne le voit pas, et toi tu ne vois pas ses signes.',
    wrong: 'Faux. La foudre tombe, et la tour réécrit ses signes.',
    ok: 'Juste.',
    lock: 'La tour tremble…',
    fall: 'Le vide. Retour au dernier palier.',
    hint: {
      describe: 'Décrivez d’abord le cadre (cercle, triangle, carré, losange, arche, U, deux traits, hexagone), puis ce qu’il y a dedans (rien, un point, deux points, un trait, une croix, un trait debout).',
      bells: {
        dame: 'Tes cordes ont le pompon rose, celles de {mate} le pompon doré. Une fausse cloche, et l’ordre change.',
        valet: 'Tes cordes ont le pompon doré, celles de {mate} le pompon rose. Une fausse cloche, et l’ordre change.',
      },
      face: '« En face » : l’image de l’autre côté de l’anneau, à l’opposé de celle qui est nommée.',
      plates: '« En face » : sur la couronne de dalles, celle d’en face de l’image nommée. Traversez par le milieu, sans vous arrêter sur les autres dalles.',
      lift: {
        dame: 'Celui qui lit décrit, l’autre traduit et dit à qui est le levier. Tes pommeaux sont roses, ceux de {mate} dorés.',
        valet: 'Celui qui lit décrit, l’autre traduit et dit à qui est le levier. Tes pommeaux sont dorés, ceux de {mate} roses.',
      },
    },
    s0: {
      reader: 'Au-dessus de la porte brille un signe que toi seul{e} peux lire. Décris-le à {mate} : le cadre, puis ce qu’il y a dedans.',
      trans: '{mate} voit un signe au-dessus de la porte. Ton lexique le traduit en image : tire le levier qui porte cette image.',
      objR: 'Décris le signe de la porte à {mate}. Deux bons leviers ouvrent la tour ({n} / 2).',
      objT: 'Écoute {mate}, trouve son signe dans ton lexique, tire le levier de la bonne image ({n} / 2).',
      next: 'Un autre signe s’allume au-dessus de la porte.',
      done: 'La porte s’ouvre. Au fond de la salle, l’escalier monte aux cloches.',
      up: 'Montez l’escalier, au fond de la salle, contre le mur nord.',
      notMine: 'Les leviers, c’est {mate} qui les tire : guide-{le}.',
    },
    s1: {
      intro: 'La salle des cloches. L’inscription d’or pend au milieu de la salle.',
      reader: 'Toi seul{e} lis l’inscription d’or : l’ordre des cloches. Décris chaque signe à {mate}, dans l’ordre. Tes cordes sont les dorées.',
      trans: '{mate} lit l’ordre des cloches. Traduis chaque signe avec ton lexique. Tes cordes sont les roses.',
      obj: 'Sonnez les cloches dans l’ordre : {n} / {m}. Puis une seconde inscription.',
      next: 'Une seconde inscription, plus longue.',
      done: 'Les cloches se taisent. La grille de l’escalier sud se lève.',
      up: 'Montez par l’escalier du mur sud.',
      notMine: 'Cette corde-là, c’est à {mate} de la tirer.',
    },
    s2: {
      intro: 'La salle des anneaux. Trois anneaux, huit images chacun : ce qui compte, c’est l’image face au repère doré.',
      reader: 'L’inscription est sur le mur ouest : une ligne par anneau, du haut vers le bas. Décris-la à {mate}. Tu tournes l’anneau du milieu, et tu valides au levier.',
      trans: 'Traduis les trois lignes de {mate}. Tu tournes l’anneau du haut et celui du bas : les manivelles dorées.',
      grammar: 'Nouveau signe dans le lexique : « en face ». Après une image, il désigne l’image opposée sur l’anneau.',
      obj: 'Les images de l’inscription face au repère, puis le levier de validation ({n} / 2).',
      next: 'Les anneaux se brouillent. Une nouvelle inscription, avec sa grammaire.',
      done: 'Les anneaux s’enclenchent. La grille de l’escalier est se lève.',
      up: 'Montez par l’escalier du mur est, jusqu’à la terrasse.',
      notMine: 'Cette manivelle-là, c’est à {mate} de la tourner.',
      checkNotMine: 'Le levier de validation est celui de {mate}.',
      check: 'Valider les anneaux',
    },
    s3: {
      intro: 'La terrasse, en plein vent. Deux ponts-levis, deux inscriptions : parlez en même temps.',
      both: 'Ton inscription est sur le parapet sud, devant tes dalles : décris-la à {mate}. {Il} traduit pour toi, tu traduis pour {lui}. Arrête-toi sur tes dalles, dans l’ordre.',
      obj: 'Vos dalles dans l’ordre (arrêtez-vous dessus) : toi {a} / 3, {mate} {b} / 3.',
      mine: 'Ton pont-levis tombe sur le vide.',
      mate: 'Le pont-levis de {mate} tombe sur le vide.',
      toLift: 'Les deux ponts sont tombés. Rejoignez-vous dans la cage, de l’autre côté.',
      wait: 'Ton pont est tombé. Aide {mate} : traduis-lui son inscription.',
      notMine: 'Ces dalles-là sont celles de {mate}.',
      gust: 'Une rafale !',
    },
    s4: {
      intro: 'La cage monte dans la tour fendue. L’orage la vise : à chaque palier, un signe, un levier, avant l’éclair.',
      readMe: 'Le signe est pour toi : décris-le à {mate}, vite.',
      readMate: '{mate} a le signe : traduis, vite.',
      readBoth: 'Deux signes à la fois : chacun le sien, chacun traduit l’autre.',
      obj: 'Palier {n} / 6. Le bon levier avant l’éclair. Tes leviers ont le pommeau {col}.',
      ok: 'L’éclair se perd dans la pierre. La cage monte.',
      fail: 'L’éclair frappe la cage ! Nouveau signe.',
      late: 'Trop tard : l’éclair frappe la cage. Nouveau signe.',
      notMine: 'Ce levier-là, c’est à {mate} de le tirer.',
    },
    s5: {
      win: 'La couronne s’ouvre. Au-dessus, la faille dans l’orage.',
      win2: 'Le chemin vers la Cour.',
    },
    card: 'La carte ' + CARD + ' descend au milieu de la couronne. Allez-y ensemble.',
  };
  CONFIG.cards.c10 = {
    title: TITLE,
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'Deux écritures, et chacun lisait celle que seul l’autre comprenait.',
      'Alors on s’est parlé : les cadres, les points, les traits, jusqu’à se comprendre.',
      'La tour montait, et nous avec.',
    ],
  };

  const ROLES = ['dame', 'valet'];
  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const STYLE = { dame: 'rose', valet: 'gold' };
  // which script each one reads: the reader's style; the lexicon of a script is in the other's hands
  const READERS = { 0: ['dame'], 1: ['valet'], 2: ['dame'], 3: ['dame', 'valet'] };
  const WAVES = [
    { r: ['dame'], dur: 17 },
    { r: ['valet'], dur: 17 },
    { r: ['dame'], face: true, dur: 17 },
    { r: ['valet'], face: true, dur: 17 },
    { r: ['dame', 'valet'], dur: 22 },
    { r: ['dame', 'valet'], face: true, dur: 22 },
  ];
  const LOCK = 3.6;
  const local = {
    stage: -1,
    key: '',
    lock: 0,
    lockT: 0,
    fails: 0,
    floorT: 0,
    hinted: {},
    waveT: 0,
    waveKey: '',
    waveWait: 0,
    winT: 0,
    sayCd: {},
    pend: [],
    plate: -1,
    plateT: 0,
    plateSent: -1,
    ambT: 6,
    gustT: 10,
    gust: null,
    wind: new THREE.Vector2(),
    crackled: false,
    objT: 0,
    crankCd: {},
    env: null,
  };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- the deal: lexicons and pictures, from the run's seed ----------
  const shuffle = (a, r) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  let dealt = null;
  const deal = (seed) => {
    if (dealt && dealt.seed === seed) return dealt;
    const lex = {};
    ['rose', 'gold'].forEach((st, k) => {
      const r = rng((seed ^ (k ? 0x5bd1e995 : 0x27d4eb2d)) >>> 0);
      // four frames only, so that many glyphs share a frame: the marks must be told apart
      const frames = shuffle(range(W.NF), r).slice(0, 4);
      const pool = shuffle(frames.flatMap((f) => range(W.NM).map((m) => f * W.NM + m)), r).slice(0, 9);
      lex[st] = { pics: pool.slice(0, 8), face: pool[8], order: shuffle(range(9), r) };
    });
    const r = rng((seed ^ 0x9e3779b9) >>> 0);
    dealt = {
      seed,
      lex,
      lev0: shuffle(range(8), r).slice(0, 6),
      bells: shuffle(range(8), r).slice(0, 6),
      rings: [0, 1, 2].map(() => shuffle(range(8), r)),
      plD: shuffle(range(8), r),
      plV: shuffle(range(8), r),
      lift: shuffle(range(8), r),
    };
    return dealt;
  };
  const glyphOf = (D, style, pic) => D.lex[style].pics[pic];
  const word = (D, style, pic, face) => [glyphOf(D, style, pic), face ? D.lex[style].face : null];
  const rr = (x, salt) => rng(((x.seed | 0) + salt * 7919 + (x.stage | 0) * 15485863 + (x.round | 0) * 104729) >>> 0);
  // the current puzzle (the same on both screens: only the seed and counters are shared)
  const puzzle = (x) => {
    const D = deal(x.seed);
    const st = x.stage;
    if (st === 0) {
      const r = rr(x, 11 + (x.roll | 0) * 3);
      const t = Math.floor(r() * 6);
      return { t, words: { dame: [word(D, 'rose', D.lev0[t])] } };
    }
    if (st === 1) {
      const r = rr(x, 23 + (x.roll | 0) * 3);
      const n = x.round ? 4 : 3;
      let seq;
      do {
        seq = [];
        for (let i = 0; i < n; i++) {
          let b;
          do b = Math.floor(r() * 6);
          while (seq.length && b === seq[seq.length - 1]);
          seq.push(b);
        }
      } while (!(seq.some((b) => b < 3) && seq.some((b) => b >= 3)));
      return { seq, words: { valet: seq.map((b) => word(D, 'gold', D.bells[b])) } };
    }
    if (st === 2) {
      const r = rr(x, 37 + (x.roll | 0) * 3);
      const faces = x.round ? shuffle([1, 1, 0], r) : [0, 0, 0];
      const want = [];
      const words = [0, 1, 2].map((i) => {
        const s = Math.floor(r() * 8);
        const f = faces[i];
        // the slot to bring to the marker: the named picture, or the one across from it
        want.push(f ? (s + 4) % 8 : s);
        return word(D, 'rose', D.rings[i][s], f);
      });
      return { want, words: { dame: words } };
    }
    if (st === 3) {
      const side = (own, roll, salt) => {
        const r = rng(((x.seed | 0) + salt + (roll | 0) * 104729) >>> 0);
        const perm = own === 'dame' ? D.plD : D.plV;
        const faces = shuffle([1, 0, r() < 0.5 ? 1 : 0], r);
        const seq = [];
        const words = [];
        for (let i = 0; i < 3; i++) {
          let p;
          do p = Math.floor(r() * 8);
          while (seq.includes(p));
          seq.push(p);
          words.push(word(D, STYLE[own], perm[faces[i] ? (p + 4) % 8 : p], faces[i]));
        }
        return { seq, words };
      };
      const d = side('dame', x.rollD, 71);
      const v = side('valet', x.rollV, 89);
      return { seq: { dame: d.seq, valet: v.seq }, words: { dame: d.words, valet: v.words } };
    }
    if (st === 4 && x.wave < WAVES.length) {
      const wv = WAVES[x.wave];
      const r = rng(((x.seed | 0) + 131 + x.wave * 977 + (x.roll | 0) * 104729) >>> 0);
      const levers = shuffle(range(8), r);
      const out = { wave: wv, t: {}, words: {} };
      wv.r.forEach((who, i) => {
        const L = levers[i];
        const f = wv.face && (i === 0 || r() < 0.5);
        out.t[who] = L;
        out.words[who] = [word(D, STYLE[who], D.lift[f ? (L + 4) % 8 : L], f)];
      });
      return out;
    }
    return null;
  };
  const owner = {
    bell: (i) => (i < 3 ? 'dame' : 'valet'),
    crank: (i) => (i === 1 ? 'dame' : 'valet'),
    lift: (i) => (i < 4 ? 'valet' : 'dame'),
  };
  const readersOf = (x) => (x.stage === 4 ? (x.wave < WAVES.length ? WAVES[x.wave].r : []) : READERS[x.stage] || []);
  // the inscription a reader must say right now (the terrace: only the steps still to do)
  const myWords = (x, who) => {
    const pz = puzzle(x);
    if (!pz || !pz.words[who]) return null;
    if (x.stage === 3 && (who === 'dame' ? x.bd : x.bv)) return null;
    if (x.stage === 4 && (!x.waveOn || (x.got & (1 << WAVES[x.wave].r.indexOf(who))))) return null;
    if (x.solved && x.stage < 3) return null;
    return pz.words[who];
  };

  // ---------- HUD: the lexicon (translator), the inscription (reader), the clock (lift) ----------
  const ui = {};
  const makeUI = () => {
    if (ui.root) return;
    const css = document.createElement('style');
    css.textContent = `
      #c10lex,#c10ins,#c10clk{position:fixed;z-index:6;pointer-events:none;font:600 12px/1.2 "IBM Plex Mono",monospace;color:#f1e6dc;letter-spacing:.04em;text-shadow:0 1px 3px #000}
      #c10lex{right:14px;top:150px;width:276px;padding:10px 12px;border-radius:10px;background:rgba(10,10,18,.62);box-shadow:0 0 0 1px rgba(255,255,255,.08),0 6px 22px rgba(0,0,0,.4)}
      #c10lex .h{display:flex;justify-content:space-between;opacity:.85;text-transform:uppercase;font-size:10px;margin-bottom:6px}
      #c10lex .g{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}
      #c10lex .e{display:flex;align-items:center;gap:4px;height:38px}
      #c10lex .e .a{opacity:.5}
      #c10lex .e .n{font-size:9.5px;text-transform:uppercase;line-height:1;white-space:nowrap}
      #c10lex .e.face{grid-column:1 / span 2;justify-content:center;border-top:1px solid rgba(255,255,255,.1);padding-top:4px}
      #c10ins{left:16px;top:150px;padding:8px 14px 10px;border-radius:12px;background:rgba(10,10,18,.55);box-shadow:0 0 0 1px rgba(255,255,255,.08);text-align:center}
      #c10ins .h{opacity:.7;text-transform:uppercase;font-size:10px;margin-bottom:4px}
      #c10ins .row{display:flex;align-items:center;justify-content:center;gap:10px}
      #c10ins .w{display:flex;align-items:center;gap:2px;position:relative;padding:2px 4px;border-radius:8px}
      #c10ins .w.done{opacity:.28}
      #c10ins .w.cur{box-shadow:0 0 0 1px rgba(255,255,255,.35)}
      #c10ins .w i{position:absolute;left:3px;top:0;font-style:normal;font-size:9px;opacity:.6}
      #c10ins .ln{display:flex;align-items:center;gap:8px;margin:2px 0}
      #c10ins .ln b{width:46px;font-size:9px;text-transform:uppercase;opacity:.7;text-align:right}
      #c10clk{left:50%;top:42px;transform:translateX(-50%);width:260px}
      #c10clk .bar{height:8px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
      #c10clk .bar i{display:block;height:100%;width:100%;transform-origin:0 50%;background:linear-gradient(90deg,#ff5f8a,#ffd27a,#bfe0ff)}
      #c10clk .t{display:flex;justify-content:space-between;margin-bottom:3px;font-size:10px;text-transform:uppercase}
    `;
    document.head.appendChild(css);
    ui.root = document.createElement('div');
    ui.root.id = 'c10lex';
    document.body.appendChild(ui.root);
    ui.ins = document.createElement('div');
    ui.ins.id = 'c10ins';
    document.body.appendChild(ui.ins);
    ui.clk = document.createElement('div');
    ui.clk.id = 'c10clk';
    ui.clk.innerHTML = '<div class="t"><span>Éclair</span><b></b></div><div class="bar"><i></i></div>';
    document.body.appendChild(ui.clk);
    ui.clkBar = ui.clk.querySelector('i');
    ui.clkT = ui.clk.querySelector('b');
    hideUI();
  };
  const hideUI = () => {
    if (!ui.root) return;
    ui.root.hidden = ui.ins.hidden = ui.clk.hidden = true;
    ui.lexKey = ui.insKey = '';
  };
  // the lexicon I hold: the other one's script (with « en face » once the grammar is taught)
  const drawLex = (x, me) => {
    const style = STYLE[mateRole(me)];
    const face = x.stage > 2 || (x.stage === 2 && x.round >= 1);
    const k = x.seed + '|' + style + '|' + face;
    if (ui.lexKey === k) return;
    ui.lexKey = k;
    const D = deal(x.seed);
    const L = D.lex[style];
    const col = W.STY[style].hud;
    const items = L.order
      .filter((i) => i < 8)
      .map((i) => `<div class="e">${W.gSvg(L.pics[i], style, 34)}<span class="a">›</span>${W.pSvg(i, 24)}<span class="n">${PICN[i]}</span></div>`);
    if (face) items.push(`<div class="e face">${W.gSvg(L.face, style, 34)}<span class="a">›</span>${W.faceSvg(24)}<span class="n">en face</span></div>`);
    ui.root.innerHTML = `<div class="h"><span>Lexique</span><span style="color:${col}">écriture ${style === 'rose' ? 'rose' : 'd’or'}</span></div><div class="g">${items.join('')}</div>`;
  };
  const LINE = ['haut', 'milieu', 'bas'];
  const drawIns = (x, me, words) => {
    const style = STYLE[me];
    const step = x.stage === 1 ? x.rung | 0 : x.stage === 3 ? (me === 'dame' ? x.pd : x.pv) | 0 : -1;
    const k = JSON.stringify([words, style, step, x.stage]);
    if (ui.insKey === k) return;
    ui.insKey = k;
    const g = (w, s) => W.gSvg(w[0], style, s) + (w[1] != null ? W.gSvg(w[1], style, Math.round(s * 0.7)) : '');
    let body;
    if (x.stage === 2) body = words.map((w, i) => `<div class="ln"><b>${LINE[i]}</b><span class="w">${g(w, 50)}</span></div>`).join('');
    else
      body = `<div class="row">${words
        .map((w, i) => `<span class="w${step > i ? ' done' : step === i ? ' cur' : ''}">${words.length > 1 ? `<i>${i + 1}</i>` : ''}${g(w, 54)}</span>`)
        .join('')}</div>`;
    ui.ins.innerHTML = `<div class="h">Inscription · toi seul${Story.fem(me) ? 'e' : ''} la lis</div>${body}`;
  };

  // ---------- small helpers ----------
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const sayBoth = (c, text, hold) => {
    say(text, hold);
    c.send('c10say', [text, hold || 2800]);
  };
  const sayOnce = (k, text, cd = 8) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const near = (p, q, d, dy = 1.6) => Math.hypot(p.x - q.x, p.z - q.z) < d && Math.abs(p.y - q.y) < dy;
  const stelePos = (x) => {
    const s = { 0: [0, 7.3, -11.4], 1: [0, 14.6, 0], 2: [-9.4, 23.4, 1.2], 3: [-0.7, 32, -9.8] }[x.stage];
    return s ? W.P(...s) : W.P(0, W.liftY + 3.2, W.LIFT.z);
  };
  const fx = (c, d) => {
    const [k, a] = d;
    const pos = Array.isArray(a) ? V3(a[0], a[1], a[2]) : null;
    if (k === 'ok') {
      Sound.play('rune', true);
      Sound.play('chime');
    }
    if (k === 'wrong' && pos) {
      Sound.play('rune', false);
      W.bolt(pos.clone().add(V3((Math.random() - 0.5) * 30, 90, 20 + Math.random() * 20)), pos, { w: 0.22, flash: 1.3, branches: 3 });
      H8.AU.thunder(pos, 1.3);
      Cam.shake = Math.max(Cam.shake, 0.55);
      Fx.burst(pos, '#c8c0ff', 70, 6, 0.8, -4);
      local.lockT = LOCK;
    }
    if (k === 'lever') Sound.play('switch');
    if (k === 'bell') {
      W.ring(a);
      Sound.play('chime');
      Sound.play('heart', 0.4);
    }
    if (k === 'crank') {
      W.crank(a);
      Sound.play('creak');
    }
    if (k === 'gate') {
      Sound.play('door');
      Sound.play('reveal');
      Sound.play('rumble', 0.5);
    }
    if (k === 'bridge') {
      Sound.play('creak');
      Sound.play('rumble', 0.7);
      after(1.4, () => Sound.play('thud'));
    }
    if (k === 'divert' && pos) {
      // the bolt meant for the cage is drawn into the tower's old script
      W.bolt(pos.clone().add(V3(10, 70, 12)), pos, { pink: true, w: 0.2, flash: 0.9 });
      H8.AU.thunder(pos, 0.9);
      Fx.burst(pos, '#ff8fb8', 60, 5, 1, -2, 'heart');
      Sound.play('lift');
    }
    if (k === 'cageHit' && pos) {
      W.bolt(pos.clone().add(V3(-6, 80, 8)), pos, { w: 0.3, flash: 1.5, branches: 4 });
      H8.AU.thunder(pos, 1.5);
      Cam.shake = Math.max(Cam.shake, 0.8);
      Fx.burst(pos, '#c8c0ff', 120, 7, 1, -3);
      Sound.play('shatter');
      local.lockT = LOCK;
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('chime');
      const C = W.CROWN;
      for (let i = 0; i < 5; i++) after(0.4 + i * 0.5, () => Fx.burst(W.P(C.x + (i - 2) * 2.5, C.y + 6, C.z), i % 2 ? '#ff8fb0' : '#ffd77a', 70, 6, 1.4, -1, 'heart'));
      after(2.4, () => Fx.firework(W.P(0, 92, 40), 34));
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('c10fx', d);
  };

  // ---------- host: answers ----------
  const now = () => performance.now() / 1000;
  const locked = () => local.lock > now();
  const fail = (c, patch, pos, late) => {
    local.lock = now() + LOCK;
    local.fails++;
    c.set((s) => {
      patch(s.x);
    });
    fxBoth(c, [c.S.x.stage === 4 ? 'cageHit' : 'wrong', pos.toArray()]);
    sayBoth(c, c.S.x.stage === 4 ? (late ? TXT.s4.late : TXT.s4.fail) : TXT.wrong, 2600);
    hint(c);
  };
  // hints: after two mistakes on a floor (then after four), or when a floor drags on; each screen
  // words it for its own player
  const HINT = { 0: 'describe', 1: 'bells', 2: 'face', 3: 'plates', 4: 'lift' };
  const hintText = (key) => {
    const h = TXT.hint[key] || TXT.hint.describe;
    return typeof h === 'string' ? h : h[Story.role];
  };
  const hint = (c, force) => {
    const x = c.S.x;
    if (!force && local.fails < 2) return;
    const lvl = force ? 't' : local.fails >= 4 ? 2 : 1;
    const k = x.stage + ':' + lvl;
    if (local.hinted[k]) return;
    local.hinted[k] = 1;
    // the floor's own advice first, the way to describe a glyph after that
    let key = lvl === 2 ? 'describe' : HINT[x.stage];
    if (x.stage === 2 && !x.round) key = 'describe';
    if (lvl === 2 && HINT[x.stage] === 'describe') return;
    after(2.8, () => {
      say(hintText(key), 6000);
      c.send('c10hint', key);
    });
  };
  const okFx = (c) => fxBoth(c, ['ok']);
  const answers = {
    lev0(c, who, d) {
      const x = c.S.x;
      if (x.stage !== 0 || x.solved || who !== 'valet') return;
      const i = d.i | 0;
      if (i < 0 || i > 5 || !near(c.pos(who), W.leverPos(i), 2.4, 2)) return;
      fxBoth(c, ['lever']);
      c.send('c10pull', ['lev0', i]);
      W.pull('lev0', i);
      const pz = puzzle(x);
      if (i !== pz.t) return fail(c, (s) => ((s.roll = (s.roll | 0) + 1), (s.round = 0)), W.leverPos(i));
      okFx(c);
      if (x.round >= 1) {
        c.set((s) => (s.x.solved = 1));
        fxBoth(c, ['gate']);
        sayBoth(c, TXT.s0.done, 3400);
      } else {
        c.set((s) => (s.x.round = 1));
        sayBoth(c, TXT.s0.next, 2400);
      }
    },
    bell(c, who, d) {
      const x = c.S.x;
      const i = d.i | 0;
      if (x.stage !== 1 || x.solved || i < 0 || i > 5 || owner.bell(i) !== who) return;
      if (!near(c.pos(who), W.bellPos(i), 2.2, 2)) return;
      fxBoth(c, ['bell', i]);
      const pz = puzzle(x);
      const n = x.rung | 0;
      if (pz.seq[n] !== i) return fail(c, (s) => ((s.roll = (s.roll | 0) + 1), (s.rung = 0)), W.bellTop(i));
      if (n + 1 < pz.seq.length) return c.set((s) => (s.x.rung = n + 1));
      okFx(c);
      if (x.round >= 1) {
        c.set((s) => ((s.x.solved = 1), (s.x.rung = n + 1)));
        fxBoth(c, ['gate']);
        sayBoth(c, TXT.s1.done, 3400);
      } else {
        c.set((s) => ((s.x.round = 1), (s.x.rung = 0), (s.x.roll = 0)));
        sayBoth(c, TXT.s1.next, 2400);
      }
    },
    crank(c, who, d) {
      const x = c.S.x;
      const i = d.i | 0;
      if (x.stage !== 2 || x.solved || i < 0 || i > 2 || owner.crank(i) !== who) return;
      if (!near(c.pos(who), W.crankPos(i), 2.0, 2)) return;
      if ((local.crankCd[i] || 0) > now()) return;
      local.crankCd[i] = now() + 0.3;
      c.set((s) => {
        s.x.rings = s.x.rings.slice();
        s.x.rings[i] = (s.x.rings[i] + 1) % 8;
      });
      fxBoth(c, ['crank', i]);
    },
    check(c, who) {
      const x = c.S.x;
      if (x.stage !== 2 || x.solved || who !== 'dame' || !near(c.pos(who), W.checkPos(), 2.2, 2)) return;
      fxBoth(c, ['lever']);
      c.send('c10pull', ['check', 0]);
      W.pull('check', 0);
      const pz = puzzle(x);
      if (pz.want.some((w, i) => x.rings[i] !== w)) return fail(c, (s) => ((s.roll = (s.roll | 0) + 1), (s.rings = scramble(s, s.roll))), W.P(0, 26, 1.2));
      okFx(c);
      if (x.round >= 1) {
        c.set((s) => (s.x.solved = 1));
        fxBoth(c, ['gate']);
        sayBoth(c, TXT.s2.done, 3400);
      } else {
        c.set((s) => {
          s.x.round = 1;
          s.x.roll = 0;
          s.x.rings = scramble(s.x, 0, 1);
        });
        sayBoth(c, TXT.s2.next, 3000);
        after(3.2, () => sayBoth(c, TXT.s2.grammar, 4600));
      }
    },
    plate(c, who, d) {
      const x = c.S.x;
      const i = d.i | 0;
      const D = who === 'dame';
      if (x.stage !== 3 || (D ? x.bd : x.bv) || i < 0 || i > 7) return;
      if (!near(c.pos(who), W.platePos(who, i), 1.4, 1.2)) return;
      const pz = puzzle(x);
      const seq = pz.seq[who];
      const n = (D ? x.pd : x.pv) | 0;
      if (n > 0 && seq[n - 1] === i) return;
      if (seq[n] !== i)
        return fail(
          c,
          (s) => {
            if (D) {
              s.rollD = (s.rollD | 0) + 1;
              s.pd = 0;
            } else {
              s.rollV = (s.rollV | 0) + 1;
              s.pv = 0;
            }
          },
          W.platePos(who, i),
        );
      Sound.play('tile');
      c.send('c10fx', ['press', [who, i]]);
      if (n + 1 < 3) return c.set((s) => (D ? (s.x.pd = n + 1) : (s.x.pv = n + 1)));
      okFx(c);
      c.set((s) => (D ? ((s.x.pd = 3), (s.x.bd = 1)) : ((s.x.pv = 3), (s.x.bv = 1))));
      fxBoth(c, ['bridge']);
      c.send('c10say', [who === Story.role ? TXT.s3.mate : TXT.s3.mine, 2600]);
      say(who === Story.role ? TXT.s3.mine : TXT.s3.mate, 2600);
      if (D ? x.bv : x.bd) after(2, () => sayBoth(c, TXT.s3.toLift, 3400));
    },
    lift(c, who, d) {
      const x = c.S.x;
      const i = d.i | 0;
      if (x.stage !== 4 || !x.waveOn || i < 0 || i > 7 || owner.lift(i) !== who) return;
      if (!near(c.pos(who), W.liftLeverPos(i), 1.9, 2)) return;
      fxBoth(c, ['lever']);
      c.send('c10pull', ['lift', i]);
      W.pull('lift', i);
      const pz = puzzle(x);
      const k = pz.wave.r.findIndex((r) => pz.t[r] === i);
      const top = W.P(0, W.liftY + 3.7, W.LIFT.z);
      if (k < 0) return fail(c, (s) => ((s.roll = (s.roll | 0) + 1), (s.got = 0), (s.waveOn = false)), top);
      if (x.got & (1 << k)) return;
      const got = x.got | (1 << k);
      if (got !== (1 << pz.wave.r.length) - 1) return c.set((s) => (s.x.got = got));
      okFx(c);
      fxBoth(c, ['divert', W.P(Math.random() < 0.5 ? -6 : 6, W.liftY + 6, 25).toArray()]);
      sayBoth(c, TXT.s4.ok, 2200);
      const nw = x.wave + 1;
      c.set((s) => {
        s.x.got = 0;
        s.x.waveOn = false;
        s.x.wave = nw;
        s.x.roll = 0;
        s.x.lift = nw;
      });
      local.waveWait = (W.LIFT.step / 1.45) + 1.4;
    },
  };
  // the rings start off their answer
  const scramble = (s, roll, round) => {
    const r = rng(((s.seed | 0) + 555 + (roll | 0) * 31 + (round | 0) * 7) >>> 0);
    return [0, 1, 2].map(() => Math.floor(r() * 8));
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    if (x.stage === 0) {
      if (x.solved) return TXT.s0.up;
      return (r === 'dame' ? TXT.s0.objR : TXT.s0.objT).replace('{n}', x.round | 0);
    }
    if (x.stage === 1) {
      if (x.solved) return TXT.s1.up;
      const pz = puzzle(x);
      return TXT.s1.obj.replace('{n}', x.rung | 0).replace('{m}', pz.seq.length);
    }
    if (x.stage === 2) return x.solved ? TXT.s2.up : TXT.s2.obj.replace('{n}', x.round | 0);
    if (x.stage === 3) {
      if (x.bd && x.bv) return TXT.s3.toLift;
      if ((r === 'dame' ? x.bd : x.bv) && !(r === 'dame' ? x.bv : x.bd)) return TXT.s3.wait;
      return TXT.s3.obj.replace('{a}', (r === 'dame' ? x.pd : x.pv) | 0).replace('{b}', (r === 'dame' ? x.pv : x.pd) | 0);
    }
    if (x.stage === 4) return TXT.s4.obj.replace('{n}', Math.min(6, (x.wave | 0) + 1)).replace('{col}', r === 'dame' ? 'rose' : 'doré');
    if (x.stage === 5) return TXT.card;
    return '';
  };

  // ---------- light and mood per stage ----------
  const ENV = {
    0: { hemi: 0.3, fog: 0.012, music: 'tense' },
    1: { hemi: 0.26, fog: 0.012, music: 'tense' },
    2: { hemi: 0.26, fog: 0.012, music: 'tense' },
    3: { hemi: 0.3, fog: 0.011, music: 'tense' },
    4: { hemi: 0.28, fog: 0.01, music: 'dark' },
    5: { hemi: 0.42, fog: 0.007, music: 'gold' },
  };
  const applyEnv = (c, st) => {
    const e = ENV[st] || ENV[0];
    W.ST.hemi = e.hemi;
    c.fog(e.fog);
    Sound.mood(e.music);
  };
  const killY = (x) => (x.stage === 3 ? 18 : x.stage === 4 ? W.liftY - 5 : x.stage === 5 ? 62 : -8);
  const respawn = (c) => W.spawn(c.S.x.stage, c.role);

  Story.register('tr_c10', {
    world: W,
    init: () => ({
      stage: 0,
      seed: (Math.random() * 1e9) | 0,
      round: 0,
      roll: 0,
      rung: 0,
      solved: 0,
      rings: [0, 0, 0],
      rollD: 0,
      rollV: 0,
      pd: 0,
      pv: 0,
      bd: 0,
      bv: 0,
      wave: 0,
      waveOn: false,
      got: 0,
      lift: 0,
    }),
    voice: () => 1,
    net: {
      c10fx: (c, d) => {
        if (d[0] === 'press') return W.press(d[1][0], d[1][1]);
        fx(c, d);
      },
      c10say: (c, d) => say(d[0], d[1]),
      c10pull: (c, d) => W.pull(d[0], d[1]),
      c10hint: (c, k) => say(hintText(k), 6000),
      c10g: (c, d) => !Net.isHost && startGust(d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.show();
      makeUI();
      H8.AU.resume();
      local.stage = -1;
      local.key = '';
      local.lock = 0;
      local.lockT = 0;
      local.fails = 0;
      local.floorT = 0;
      local.hinted = {};
      local.waveT = 0;
      local.waveKey = '';
      local.waveWait = 0;
      local.winT = 0;
      local.sayCd = {};
      local.pend = [];
      local.plate = -1;
      local.plateT = 0;
      local.plateSent = -1;
      local.gust = null;
      local.gustT = 10;
      local.crackled = false;
      local.crankCd = {};
      dealt = null;
      const x = c.S.x;
      W.liftY = W.liftYOf(x.stage >= 4 ? x.lift | 0 : 0);
      c.spawn(respawn(c), x.stage === 0 ? 0 : 0);
      Player.killY = W.O.y + killY(x);
      Player.checkpoint = () => {
        say(TXT.fall, 2200);
        c.send('c10say', ['{mate} est tombé{pe}. ' + '{Il} repart du dernier palier.', 2200]);
        return respawn(c);
      };
      local.env = { hemi: R.hemi.intensity, moon: R.moon.intensity };
      // a storm night: cold moonlight through the clouds, the braziers give the only warmth
      LvKit.mood({ sky: '#5a6488', ground: '#1a1216', hemi: 0.26, sun: '#9fb2ff', sunI: 0.42, sunPos: V3(-60, 90, -40), haze: new THREE.Color('#151720') });
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · deux écritures', '#a8d8ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (x.stage === 0 && !x.solved && !x.round) {
        say(TXT.intro, 3800);
        say(TXT.rule, 4600);
        say(c.role === 'dame' ? TXT.s0.reader : TXT.s0.trans, 6000);
        if (c.role === 'valet') say(TXT.lexHelp, 4200);
      }
      this.apply(c);
    },
    exit() {
      Player.killY = -40;
      LvKit.mood(null);
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.moon.intensity = local.env.moon;
      }
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      hideUI();
      W.hide();
      H8.AU.suspend();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      const D = deal(x.seed);
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        applyEnv(c, x.stage);
        local.floorT = 0;
        local.fails = 0;
        local.plate = -1;
        local.plateSent = -1;
        W.setPics({ lev0: D.lev0, bells: D.bells, rings: D.rings, plD: D.plD, plV: D.plV, lift: D.lift });
        if (prev >= 0 && x.stage > prev) Sound.play('chime');
        const me = c.role;
        if (prev >= 0 && x.stage === 1) {
          say(TXT.s1.intro, 3200);
          say(me === 'valet' ? TXT.s1.reader : TXT.s1.trans, 5600);
        }
        if (prev >= 0 && x.stage === 2) {
          say(TXT.s2.intro, 4000);
          say(me === 'dame' ? TXT.s2.reader : TXT.s2.trans, 6000);
        }
        if (prev >= 0 && x.stage === 3) {
          say(TXT.s3.intro, 3600);
          say(TXT.s3.both, 6400);
        }
        if (prev >= 0 && x.stage === 4) {
          say(TXT.s4.intro, 4200);
          if (W.screen) W.screen.show(TITLE, 'la cage', '#a8d8ff');
        }
        if (x.stage === 5) {
          local.winT = 0;
          say(TXT.s5.win, 3000);
          after(3.2, () => say(TXT.s5.win2, 2600));
          after(6, () => say(TXT.card, 4200));
          fx(c, ['win']);
        }
      }
      Player.killY = W.O.y + killY(x);
      // the world follows the shared state
      const ST = W.ST;
      ST.stage = x.stage;
      ST.gate0 = x.stage > 0 || x.solved ? 1 : 0;
      ST.gates[1] = ST.gate0;
      ST.gates[2] = x.stage > 1 || (x.stage === 1 && x.solved) ? 1 : 0;
      ST.gates[3] = x.stage > 2 || (x.stage === 2 && x.solved) ? 1 : 0;
      ST.rings = x.stage === 2 ? x.rings.slice() : x.stage > 2 ? puzzle(Object.assign({}, x, { stage: 2, round: 1, roll: 0 })).want.slice() : [0, 0, 0];
      ST.bridges.dame = x.bd || x.stage > 3 ? 1 : 0;
      ST.bridges.valet = x.bv || x.stage > 3 ? 1 : 0;
      ST.lift = x.stage >= 4 ? Math.min(6, x.lift | 0) : 0;
      ST.cage = x.stage < 4 ? 0 : x.stage === 4 ? 1 : 2;
      ST.crown = x.stage === 5 ? 1 : 0;
      ST.open = x.stage === 5 ? 1 : 0;
      // the steles: each screen draws only what its player reads
      const me = c.role;
      const st = x.stage;
      const steleKey = { 0: ['s0'], 1: ['s1'], 2: ['s2'], 3: ['s3d', 's3v'], 4: ['lift'] };
      ['s0', 's1', 's2', 's3d', 's3v', 'lift'].forEach((k) => {
        const active = (steleKey[st] || []).includes(k);
        let who = st === 3 ? (k === 's3d' ? 'dame' : 'valet') : readersOf(x)[0];
        if (st === 4) who = me;
        const words = active ? myWords(x, who) : null;
        const mine = active && who === me && readersOf(x).includes(me);
        W.setStele(k, words, STYLE[who] || 'rose', st === 2 ? 'lines' : 'row', mine && !!words);
      });
      // the lift's clock: shared start (the state change), each screen counts on its own
      const wk = x.stage === 4 && x.waveOn ? x.wave + '|' + x.roll : '';
      if (wk !== local.waveKey) {
        local.waveKey = wk;
        if (wk) {
          local.waveT = WAVES[x.wave].dur;
          local.crackled = false;
          // said the first time each kind of wave comes (then the clock and the panels say it)
          const rd = WAVES[x.wave].r;
          if ([0, 1, 4].includes(x.wave) && !x.roll) say(rd.length > 1 ? TXT.s4.readBoth : rd[0] === me ? TXT.s4.readMe : TXT.s4.readMate, 2400);
        }
      }
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      const both = (z) => W.at(z, qd) && W.at(z, qv);
      local.floorT += dt;
      // a hint when a floor drags on
      if (local.floorT > 150 && x.stage < 5 && !x.solved && !local.hinted['t' + x.stage]) {
        local.hinted['t' + x.stage] = 1;
        hint(c, true);
      }
      const next = (s) => {
        s.x.stage = x.stage + 1;
        s.x.round = 0;
        s.x.roll = 0;
        s.x.rung = 0;
        s.x.solved = 0;
      };
      if (x.stage === 0 && x.solved && both('F1')) c.set(next);
      if (x.stage === 1 && x.solved && both('F2'))
        c.set((s) => {
          next(s);
          s.x.rings = scramble(s.x, 0, 0);
        });
      if (x.stage === 2 && x.solved && both('F3')) c.set(next);
      if (x.stage === 3 && x.bd && x.bv && both('LIFT')) {
        c.set((s) => {
          next(s);
          s.x.wave = 0;
          s.x.lift = 0;
          s.x.waveOn = false;
          s.x.got = 0;
        });
        local.waveWait = 4.5;
      }
      if (x.stage === 4) {
        if (!x.waveOn) {
          local.waveWait -= dt;
          const arrived = Math.abs(W.liftY - W.liftYOf(Math.min(6, x.lift | 0))) < 0.05;
          if (local.waveWait <= 0 && arrived && !locked()) {
            if (x.wave >= WAVES.length) c.set((s) => (s.x.stage = 5));
            else c.set((s) => ((s.x.waveOn = true), (s.x.got = 0)));
          }
        } else if (!locked()) {
          local.waveT -= dt;
          if (local.waveT <= 0) {
            local.waveT = 99;
            fail(c, (s) => ((s.roll = (s.roll | 0) + 1), (s.got = 0), (s.waveOn = false)), W.P(0, W.liftY + 3.7, W.LIFT.z), true);
            local.waveWait = LOCK;
          }
        }
        if (local.lock > now()) local.waveWait = Math.max(local.waveWait, local.lock - now());
      }
      if (x.stage === 5 && local.winT > 4.5) {
        const C = W.rel(W.P(W.CROWN.x, W.CROWN.y, W.CROWN.z));
        const ok = (q) => Math.hypot(q.x - C.x, q.z - C.z) < 3.2 && q.y > 71.5;
        if (ok(qd) && ok(qv)) c.goto('reward', (s) => (s.x.card = 'c10'));
      }
      // gusts across the terrace and the crown
      if (x.stage === 3 || x.stage === 5) {
        local.gustT -= dt;
        if (local.gustT <= 0) {
          local.gustT = 11 + Math.random() * 7;
          const a = Math.random() * TAU;
          const d = [+Math.sin(a).toFixed(3), +Math.cos(a).toFixed(3), 1.2, 2.6];
          startGust(d);
          c.send('c10g', d);
        }
      }
    },
    action(c, who, d) {
      if (locked()) return;
      const f = answers[d.a];
      if (f) f(c, who, d);
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = W.rel(p);
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.lockT = Math.max(0, local.lockT - dt);
      if (x.stage === 4 && x.waveOn && local.lockT <= 0) local.waveT -= Net.isHost ? 0 : dt;
      if (x.stage === 5) local.winT += dt;
      W.ST.card = x.stage === 5 && local.winT > 4;

      // ---------- weather ----------
      if (local.gust) {
        local.gust.t -= dt;
        if (local.gust.t <= 0) local.gust = null;
      }
      const g = local.gust;
      const wk = g ? Math.min(1, g.t * 2) : 0;
      local.wind.x = damp(local.wind.x, g ? g.dx * 3.2 * wk : 0, 3, dt);
      local.wind.y = damp(local.wind.y, g ? g.dz * 3.2 * wk : 0, 3, dt);
      W.ST.wind.set(local.wind.x * 1.5 + 0.8, local.wind.y * 1.5 + 0.4);
      const exposed = (x.stage === 3 && q.y > 29.5 && Math.abs(q.z) < 11.5) || (x.stage === 5 && q.y > 71.5);
      if (g && exposed && Player.mode === 'walk') {
        p.x += local.wind.x * 0.32 * dt;
        p.z += local.wind.y * 0.32 * dt;
      }
      // far lightning, each screen its own
      local.ambT -= dt;
      if (local.ambT <= 0) {
        local.ambT = 6 + Math.random() * 9;
        const a = Math.random() * TAU;
        const d = 120 + Math.random() * 160;
        const to = W.P(Math.sin(a) * d, -60 - Math.random() * 60, Math.cos(a) * d);
        W.bolt(to.clone().add(V3((Math.random() - 0.5) * 40, 260, 0)), to, { w: 0.7, flash: 0.55 + Math.random() * 0.3, branches: 3, life: 0.6 });
        H8.AU.thunder(to, 0.8);
      }
      const indoor = Math.abs(q.x) < 11 && Math.abs(q.z) < 11 && q.y < 29;
      // the storm eases once the crown is open
      const rain = x.stage === 5 ? Math.max(0.25, 1 - local.winT / 4) : 1;
      W.ST.rain = rain;
      H8.AU.tick(dt, { rain, under: indoor ? 'roof' : null, wind: local.wind.length() + (q.y > 28 ? 2.4 : 1), falls: [] });

      // ---------- what I read, what I translate ----------
      const readers = readersOf(x);
      const iRead = readers.includes(r);
      const iTrans = readers.includes(mateRole(r)) && !(x.solved && x.stage < 3) && x.stage < 5;
      const words = iRead ? myWords(x, r) : null;
      const stele = stelePos(x);
      const close = x.stage === 0 ? Math.hypot(p.x - stele.x, p.z - stele.z) < 16 : x.stage === 1 ? W.at('F1', q) : x.stage === 2 ? W.at('F2', q) : x.stage === 3 ? q.y > 29.5 : x.stage === 4;
      if (ui.root) {
        const showLex = iTrans && (x.stage !== 4 || x.waveOn) && !(x.stage === 3 && (r === 'dame' ? x.bv : x.bd));
        ui.root.hidden = !showLex;
        if (showLex) drawLex(x, r);
        const showIns = !!words && close && local.lockT <= 0;
        ui.ins.hidden = !showIns;
        if (showIns) drawIns(x, r, words);
        const clk = x.stage === 4 && x.waveOn;
        ui.clk.hidden = !clk;
        if (clk) {
          const tot = WAVES[x.wave].dur;
          const k = clamp(local.waveT / tot, 0, 1);
          ui.clkBar.style.transform = `scaleX(${k})`;
          ui.clkT.textContent = Math.max(0, Math.ceil(local.waveT)) + ' s';
          // the cage hums louder as the bolt comes
          if (local.waveT < 3.2 && !local.crackled) {
            local.crackled = true;
            H8.AU.crackle(W.P(0, W.liftY + 3.6, W.LIFT.z), Math.max(0.3, local.waveT));
            H8.AU.growl(Math.max(0.3, local.waveT));
          }
        }
      }

      // ---------- E: my hands ----------
      let prompt = null;
      const press = Input.pressed('interact');
      const lockedNow = local.lockT > 0;
      const notMine = (k, text) => {
        prompt = ['E', Story.fmt(text), false];
        if (press) sayOnce(k, text, 4);
      };
      if (x.stage === 0 && !x.solved) {
        let best = -1;
        let bd = 1.7;
        for (let i = 0; i < 6; i++) {
          const lp = W.leverPos(i);
          const d = Math.hypot(lp.x - p.x, lp.z - p.z);
          if (d < bd && Math.abs(lp.y - 1 - p.y) < 1.5) {
            bd = d;
            best = i;
          }
        }
        if (best >= 0) {
          if (r !== 'valet') notMine('lev', TXT.s0.notMine);
          else if (lockedNow) prompt = ['E', TXT.lock, false];
          else {
            prompt = ['E', 'Tirer le levier', false];
            if (press) c.act({ a: 'lev0', i: best });
          }
        }
      }
      if (x.stage === 1 && !x.solved) {
        for (let i = 0; i < 6; i++) {
          if (!near(p, W.bellPos(i), 1.5, 1.5)) continue;
          if (owner.bell(i) !== r) notMine('bell', TXT.s1.notMine);
          else if (lockedNow) prompt = ['E', TXT.lock, false];
          else {
            prompt = ['E', 'Sonner la cloche', false];
            if (press) c.act({ a: 'bell', i });
          }
          break;
        }
      }
      if (x.stage === 2 && !x.solved) {
        for (let i = 0; i < 3; i++) {
          if (!near(p, W.crankPos(i), 1.4, 1.5)) continue;
          if (owner.crank(i) !== r) notMine('crank', TXT.s2.notMine);
          else if (lockedNow) prompt = ['E', TXT.lock, false];
          else {
            prompt = ['E', 'Tourner l’anneau du ' + LINE[i], false];
            if (press) c.act({ a: 'crank', i });
          }
        }
        if (near(p, W.checkPos(), 1.5, 1.5)) {
          if (r !== 'dame') notMine('check', TXT.s2.checkNotMine);
          else if (lockedNow) prompt = ['E', TXT.lock, false];
          else {
            prompt = ['E', TXT.s2.check, false];
            if (press) c.act({ a: 'check' });
          }
        }
      }
      if (x.stage === 3) {
        // standing on a plate a moment counts (walking over it does not)
        let on = -1;
        let side = null;
        // (not while a gust shoves you: only a step you chose counts)
        if (Player.body.grounded && q.y < 30.6 && q.y > 29.8 && !local.gust) {
          ROLES.forEach((own) => {
            for (let i = 0; i < 8; i++) {
              const pp = W.platePos(own, i);
              if (Math.hypot(pp.x - p.x, pp.z - p.z) < 0.55) {
                on = i;
                side = own;
              }
            }
          });
        }
        if (side && side !== r) {
          sayOnce('plate', TXT.s3.notMine, 5);
          on = -1;
        }
        if (on !== local.plate) {
          local.plate = on;
          local.plateT = 0;
        }
        local.plateT += dt;
        if (on >= 0 && local.plateT > 0.35 && local.plateSent !== on && !lockedNow && !(r === 'dame' ? x.bd : x.bv)) {
          local.plateSent = on;
          W.press(r, on);
          c.act({ a: 'plate', i: on });
        }
        if (on < 0) local.plateSent = -1;
      }
      if (x.stage === 4 && x.waveOn) {
        for (let i = 0; i < 8; i++) {
          const lp = W.liftLeverPos(i);
          if (!near(p, lp, 1.0, 1.5)) continue;
          if (owner.lift(i) !== r) notMine('lift', TXT.s4.notMine);
          else if (lockedNow) prompt = ['E', TXT.lock, false];
          else {
            prompt = ['E', 'Tirer le levier', false];
            if (press) c.act({ a: 'lift', i });
          }
          break;
        }
      }

      // ---------- the world ----------
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      if (x.stage === 5) return null;
      return prompt;
    },
  });

  // for the test driver: the puzzle on screen, the level's local state
  W.dbg = { puzzle: () => Story.S && puzzle(Story.S.x), local };

  const startGust = (d) => {
    const [dx, dz, delay, dur] = d;
    H8.AU.gust(delay + dur);
    after(delay, () => {
      local.gust = { t: dur, dx, dz };
      const S = Story.S;
      if (S && S.phase === 'tr_c10' && S.x.stage === 3) sayOnce('gust', TXT.s3.gust, 6);
    });
  };
})();
