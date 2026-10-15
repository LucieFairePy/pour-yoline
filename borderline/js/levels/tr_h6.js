// ♥ 7 · Le Jardin. Water and light: one of you waters, the other shines, and only where both meet
// does anything grow. A vine bridge, lily pads, a springboard flower, a sunflower that follows the
// light; then spring, summer, autumn, winter; then the Thorn Queen and her three roses.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('h6');
  const T = CONFIG;
  const TITLE = 'Le Jardin';
  const TXT = {
    intro: 'Épreuve de confiance. Une serre immense, envahie. Rien n’y pousse plus.',
    rule: 'Une pousse ne grandit que si l’eau et la lumière la touchent en même temps.',
    tool: {
      dame: 'Tu portes un petit soleil : maintiens E vers une pousse pour l’éclairer. {mate} a l’arrosoir.',
      valet: 'Tu portes l’arrosoir : maintiens E vers une pousse pour l’arroser. {mate} a le petit soleil.',
    },
    s1: 'Le ruisseau : faites pousser la vigne (l’eau et la lumière ensemble). Elle fera un pont.',
    s2: 'Les nénuphars : faites-les éclore un par un, et avancez dessus. De la rive, on n’atteint que le premier.',
    s3: 'La terrasse est trop haute. Faites éclore la grande fleur, puis sautez dessus.',
    s4: {
      grow: 'Le gouffre : faites pousser le tournesol, au bord.',
      dame: 'Grappin sur l’anneau (F) pour passer de l’autre côté, puis éclaire le tournesol (E maintenu) : il suivra ta lumière, et {mate} avec lui.',
      valet: 'Monte sur le cœur du tournesol. Quand {mate} l’éclairera depuis l’autre rive, il se tournera vers {lui}… et te portera.',
      after: 'Descendez l’escalier : l’aile des saisons.',
    },
    s5: {
      grow: 'Printemps. Faites pousser le pissenlit, au bord du ravin.',
      ride: 'Le vent souffle par rafales. Montez sur une aigrette posée au bord : la rafale vous portera de l’autre côté.',
    },
    s6: {
      dame: 'Été. Le haricot grimpe jusqu’à la sortie. Éclaire, mais pas seule : sans eau, la lumière brûle la pousse.',
      valet: 'Été. L’arrosoir se vide vite : remplis-le à la fontaine (E maintenu). Le haricot grimpe jusqu’à la sortie.',
      top: 'Le haricot touche le haut de la serre. Montez jusqu’à la porte.',
    },
    s7: {
      dame: 'Automne. Des trous se cachent sous les feuilles. Éclaire le sol (E maintenu) : ta lumière les montre. Guide {mate}.',
      valet: 'Automne. Des trous se cachent sous les feuilles. Ne marche que là où la lumière de {mate} montre le sol.',
      grow: 'Au fond, faites pousser les champignons : ils feront un escalier.',
    },
    s8: {
      dame: 'Hiver. Ta lumière fait fondre la glace : reste loin des plaques de {mate}. Toi, passe par les anneaux (F).',
      valet: 'Hiver. L’eau gèle aussitôt : arrose les cercles sur l’eau (E maintenu) pour faire des plaques de glace. Elles fondent vite.',
      melt: 'La rose est prise dans la glace. Seule la lumière de {mate} peut la libérer.',
      meltMe: 'La rose est prise dans la glace : fais-la fondre (E maintenu).',
      rose: 'Faites fleurir la rose d’hiver : elle fera fondre le mur.',
    },
    s9: {
      enter: 'Entrez ensemble sous le dôme.',
      intro: 'La Reine des Épines. Elle étouffe la serre. Faites pousser les trois roses à ses racines.',
      fight: 'Les roses de cœur, à ses racines : l’eau et la lumière ensemble. Esquivez ses fouets et ses ronces. Roses : {n} / 3.',
    },
    card: 'La carte ' + CARD + ' est au cœur de la grande rose. Allez-y ensemble.',
    grown: {
      vine: 'La vigne s’est tressée en pont.',
      lily: 'Un nénuphar s’ouvre.',
      bloom: 'La grande fleur s’ouvre. Sautez dessus.',
      sun: 'Le tournesol se lève. Il suit la lumière.',
      dand: 'Le pissenlit est mûr. Attendez le vent.',
      bean1: 'La tige grimpe.',
      bean2: 'Le haricot touche le toit de verre.',
      mush: 'Des champignons en escalier.',
      wice: 'La glace fond. La rose dort encore.',
      wrose: 'La rose d’hiver fleurit. Le mur de glace fond.',
      rose: 'Une rose de cœur fleurit à ses racines. La Reine recule.',
    },
    burn: 'La lumière seule brûle la pousse. Il faut l’eau en même temps.',
    alone: {
      dame: 'Ta lumière seule ne suffit pas : il faut l’eau de {mate}, en même temps.',
      valet: 'Ton eau seule ne suffit pas : il faut la lumière de {mate}, en même temps.',
    },
    empty: 'L’arrosoir est vide. Remplis-le à la fontaine.',
    full: 'L’arrosoir est plein.',
    wind: 'Le vent se lève…',
    melt: 'La lumière de {mate} fait fondre la glace !',
    meltMe: 'Ta lumière fait fondre la glace de {mate} : éloigne-toi !',
    crack: 'La glace craque.',
    fall: {
      water: 'Plouf. Retour à la rive.',
      void: 'Le vide. Retour au dernier passage.',
      hole: 'Les feuilles cachaient un trou. Retour à l’entrée.',
      ice: 'L’eau glacée. Retour à la rive.',
    },
    fallMate: '{mate} est tombé{pe}.',
    hit: 'Les épines t’ont piqué{e}.',
    hitMate: 'Les épines ont piqué {mate}.',
    win: 'La Reine se fane. La serre fleurit.',
  };
  CONFIG.cards.h6 = {
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'Rien ne pousse avec l’eau seule, ni avec la seule lumière.',
      'Il a fallu être là tous les deux, au même endroit, au même moment.',
      'C’est comme ça qu’un jardin devient le nôtre.',
    ],
  };

  const RANGE = { def: 9.5, ice: 7, rose: 11, wice: 9, sun: 9.5 };
  const local = {
    stage: 0,
    aim: null, // my target: a bud id, 'sunhead' or 'spot'
    mateAim: null,
    aimSent: 0,
    prog: {},
    aims: { dame: null, valet: null },
    sunA: Math.PI,
    gust: -1,
    gustT: 4,
    wind: 0,
    spot: null,
    mateSpot: null,
    spotSent: 0,
    can: 1,
    mateCan: 1,
    canSent: 0,
    canWarn: 0,
    burnCd: 0,
    meltCd: 0,
    iceHp: [0, 0, 0, 0, 0, 0],
    send: 0,
    sendS: 0,
    sendI: 0,
    sub: {},
    hitT: 0,
    atkT: 3,
    ringHit: false,
    patchCd: 0,
    bloom: 0,
    objT: 0,
    env: null,
    pourSnd: 0,
  };
  const tmp = V3();
  const tmp2 = V3();
  const hv = V3();
  // for the test harness
  H6.local = local;
  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const toolOf = (r) => (r === 'dame' ? 'light' : 'water');

  const grown = (x, id) => !!(x.grown && x.grown[id]);
  // the prerequisites of a bud, beyond its stage
  const okBud = (x, b) => {
    if (b.id === 'bean2') return grown(x, 'bean1');
    if (b.id === 'wrose') return grown(x, 'wice');
    if (b.kind === 'rose' && b.stage === 9) return !!x.fight && !x.won;
    return true;
  };
  const isIce = (b) => b.kind === 'ice';
  const iceUp = (i) => local.iceHp[i] > 0;
  const eligible = (x, b) => {
    if (b.stage !== x.stage) return false;
    if (isIce(b)) return !iceUp(+b.id.slice(3));
    return !grown(x, b.id) && okBud(x, b);
  };
  const reqOk = (b, tool) => b.req === 'both' || b.req === tool;

  // which bud (or sunflower head, or the ground) am I pointing at
  const camFwd = () => tmp2.set(Math.sin(Cam.yaw), 0, Math.cos(Cam.yaw));
  const findAim = (c) => {
    const x = c.S.x;
    const tool = toolOf(c.role);
    const p = Player.body.p;
    const f = camFwd();
    let best = null;
    let bs = -1e9;
    Object.values(H6.buds).forEach((b) => {
      if (!eligible(x, b) || !reqOk(b, tool)) return;
      const r = isIce(b) ? RANGE.ice : b.kind === 'rose' ? RANGE.rose : b.id === 'wice' ? RANGE.wice : RANGE.def;
      const dx = b.pos.x - p.x;
      const dz = b.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > r || Math.abs(b.pos.y - p.y) > 7) return;
      const facing = d < 0.01 ? 1 : (dx * f.x + dz * f.z) / d;
      if (facing < 0.2 && d > 2.6) return;
      const s = facing - d / 22;
      if (s > bs) {
        bs = s;
        best = b.id;
      }
    });
    if (best) return best;
    if (c.role === 'dame' && x.stage === 4 && grown(x, 'sun')) {
      const h = H6.sunHead(tmp);
      const d = h.distanceTo(p);
      const dir = tmp.sub(p).setY(0).normalize();
      if (d < 30 && dir.dot(f) > 0.55) return 'sunhead';
    }
    if (c.role === 'dame' && x.stage === 7) return 'spot';
    return null;
  };
  const aimPoint = (c, id, out) => {
    if (!id) return null;
    if (id === 'sunhead') return H6.sunHead(out);
    if (id === 'spot') {
      const s = id === local.aim && c.role === 'dame' ? local.spot : local.mateSpot;
      return s ? out.copy(s) : null;
    }
    const b = H6.buds[id];
    if (!b) return null;
    out.copy(b.pos);
    out.y += b.kind === 'rose' && b.stage === 9 ? 1.2 : b.id === 'wice' || b.id === 'wrose' ? 1.4 : 0.4;
    return out;
  };
  // where the little sun lights the ground (autumn): camera ray onto the floor
  const groundSpot = (out) => {
    const cam = R.camera;
    const d = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (d.y > -0.05) d.y = -0.05;
    const k = (H6.O.y - cam.position.y) / d.y;
    const dist = clamp(k, 0, 24);
    return out.copy(cam.position).addScaledVector(d, dist).setY(H6.O.y);
  };

  const sub = (c) => local.sub;
  const respawnPos = (c) => H6.spawn(c.S.x.stage, c.role, local.sub);

  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    if (x.stage === 1) return grown(x, 'vine') ? 'Traversez le pont de vigne.' : TXT.s1;
    if (x.stage === 2) return TXT.s2;
    if (x.stage === 3) return TXT.s3;
    if (x.stage === 4) return !grown(x, 'sun') ? TXT.s4.grow : TXT.s4[r];
    if (x.stage === 5) return !grown(x, 'dand') ? TXT.s5.grow : TXT.s5.ride;
    if (x.stage === 6) {
      if (grown(x, 'bean2')) return TXT.s6.top;
      const t = TXT.s6[r];
      return t + (r === 'valet' ? ' Eau : ' : ' Eau de {mate} : ') + Math.round((r === 'valet' ? local.can : local.mateCan) * 100) + ' %.';
    }
    if (x.stage === 7) return (H6.rel(Player.body.p).z > 262 ? TXT.s7.grow + ' ' : '') + TXT.s7[r];
    if (x.stage === 8) {
      if (grown(x, 'wice')) return TXT.s8.rose;
      if (H6.at('WIF', H6.rel(Player.body.p))) return r === 'dame' ? TXT.s8.meltMe : TXT.s8.melt;
      return TXT.s8[r];
    }
    if (x.stage === 9) return x.fight ? TXT.s9.fight.replace('{n}', x.roses || 0) : TXT.s9.enter;
    if (x.stage === 10) return TXT.card;
    return '';
  };

  const fx = (c, d) => {
    const [k, p, id] = d;
    const pos = p ? V3(p[0], p[1], p[2]) : null;
    if (k === 'grow') {
      Sound.play('reveal');
      Sound.play('chime');
      if (pos) {
        Fx.burst(pos, '#a8405a', 22, 4, 1.0, -3);
        Fx.burst(pos, '#3a7a34', 16, 3, 0.9, -2);
      }
    }
    if (k === 'bounce') {
      Sound.play('launch');
      if (H6.buds.bloom) H6.buds.bloom.squash = 1;
      if (pos) Fx.burst(pos, '#f2a4c0', 30, 4, 0.8, -6);
    }
    if (k === 'freeze') {
      Sound.play('shatter');
      if (pos) Fx.burst(pos, '#cfeaff', 50, 3, 0.8, -2);
    }
    if (k === 'melt') {
      Sound.play('creak');
      if (pos) Fx.burst(pos, '#9fd8ff', 30, 2, 0.6, -4);
    }
    if (k === 'fall') {
      Sound.play('fall');
      if (pos) Fx.burst(pos, '#9fd8ff', 40, 4, 0.7, -6);
    }
    if (k === 'hit') {
      Sound.play('hurt');
      if (pos) Fx.burst(pos, '#ff3a5a', 40, 5, 0.7, -2);
    }
    if (k === 'rose') {
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.5);
      if (H6.boss) H6.boss.hurt = 1;
      if (pos) Fx.burst(pos, '#c8406a', 90, 5, 1.3, -4, 'heart');
    }
    if (k === 'queen') {
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.6);
      if (H6.boss) H6.boss.cast = 2;
    }
    if (k === 'crack') Sound.play('creak');
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.6);
      for (let i = 0; i < 6; i++) Fx.burst(H6.P(H6.C.x, 2 + i * 1.6, H6.C.z), i % 2 ? '#ff8fb0' : '#ffd77a', 70, 7, 1.4, -1);
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('h6fx', d);
  };
  const sayBoth = (c, mine, theirs) => {
    HUD.say(mine, T.master, 2600);
    c.send('h6say', [theirs || mine]);
  };

  // ---------- growth (host) ----------
  const growDone = (c, b) => {
    const x = c.S.x;
    if (isIce(b)) {
      const i = +b.id.slice(3);
      local.iceHp[i] = 1;
      local.prog[b.id] = 0;
      fxBoth(c, ['freeze', b.pos.toArray()]);
      sendIce(c);
      return;
    }
    const roseN = b.kind === 'rose' && b.stage === 9 ? (x.roses || 0) + 1 : x.roses || 0;
    c.set((s) => {
      s.x.grown = { ...s.x.grown, [b.id]: 1 };
      if (b.id === 'wrose') s.x.stage = 9;
      if (b.kind === 'rose' && b.stage === 9) {
        s.x.roses = roseN;
        if (roseN >= 3) {
          s.x.won = true;
          s.x.stage = 10;
        }
      }
    });
    local.prog[b.id] = 0;
    const p = b.pos.clone().add(V3(0, 1, 0)).toArray();
    if (b.kind === 'rose' && b.stage === 9) {
      fxBoth(c, ['rose', p]);
      if (roseN >= 3) fxBoth(c, ['win']);
      else sayBoth(c, TXT.grown.rose);
    } else {
      fxBoth(c, ['grow', p]);
      const line = TXT.grown[b.id] || TXT.grown[b.kind];
      if (line) sayBoth(c, line);
    }
  };
  const sendIce = (c) => c.send('h6i', local.iceHp.map((v) => +v.toFixed(3)));
  const tickGrowth = (c, dt) => {
    const x = c.S.x;
    const A = local.aims;
    const summer = x.stage === 6;
    Object.values(H6.buds).forEach((b) => {
      if (!eligible(x, b)) {
        if (!isIce(b)) local.prog[b.id] = 0;
        return;
      }
      const w = A.valet === b.id;
      const l = A.dame === b.id;
      const ok = b.req === 'both' ? w && l : b.req === 'water' ? w : l;
      let p = local.prog[b.id] || 0;
      if (ok) p += dt / b.need;
      else if (summer && l && !w) {
        p -= dt * 0.35;
        local.burnCd -= dt;
        if (local.burnCd <= 0 && p > 0) {
          local.burnCd = 6;
          sayBoth(c, TXT.burn);
        }
      } else p -= dt * (b.stage === 9 ? 0.12 : 0.22);
      p = clamp(p, 0, 1);
      local.prog[b.id] = p;
      if (p >= 1) growDone(c, b);
    });
    local.send += dt;
    if (local.send > 0.1) {
      local.send = 0;
      const d = {};
      Object.entries(local.prog).forEach(([k, v]) => v > 0.001 && (d[k] = +v.toFixed(3)));
      c.send('h6p', d);
    }
  };

  // ---------- the boss (attacks scheduled by the host, played and checked on each screen) ----------
  const attack = (c, d) => {
    const B = H6.boss;
    if (!B) return;
    const [k, a, b] = d;
    B.cast = 1.2;
    if (k === 'l') {
      const L = B.lashes.find((l) => l.t < 0) || B.lashes[0];
      L.t = 0;
      L.a = a;
      L.hit = false;
      B.face = a;
      Sound.play('dollWarn');
      setTimeout(() => Sound.play('slam'), 1250);
    }
    if (k === 'p') {
      const Pt = B.patches.find((p) => p.t < 0) || B.patches[0];
      Pt.t = 0;
      Pt.x = a;
      Pt.z = b;
      Sound.play('rumble', 0.6);
      setTimeout(() => Sound.play('thud', H6.P(a, 0, b)), 1400);
    }
    if (k === 'r') {
      B.ring.t = 0;
      local.ringHit = false;
      Sound.play('gaze');
      setTimeout(() => Sound.play('slam'), 1200);
    }
  };
  const hitMe = (c, from) => {
    if (local.hitT > 0) return;
    local.hitT = 1.4;
    const p = Player.body.p;
    const q = H6.rel(p);
    const dx = q.x - (from ? from.x : H6.C.x);
    const dz = q.z - (from ? from.z : H6.C.z);
    const d = Math.hypot(dx, dz) || 1;
    Player.body.v.set((dx / d) * 9, 6, (dz / d) * 9);
    Cam.shake = Math.max(Cam.shake, 0.45);
    HUD.say(TXT.hit, T.master, 2000);
    c.send('h6say', [TXT.hitMate]);
    fxBoth(c, ['hit', p.clone().add(V3(0, 1, 0)).toArray()]);
    setAim(c, null);
  };
  const tickAttacks = (c, dt) => {
    const B = H6.boss;
    if (!B || c.S.x.stage !== 9) return;
    const q = H6.rel(Player.body.p);
    const C = H6.C;
    B.lashes.forEach((L) => {
      if (L.t >= 1.25 && L.t < 1.45 && !L.hit) {
        L.hit = true;
        Cam.shake = Math.max(Cam.shake, 0.25);
        const dx = q.x - C.x;
        const dz = q.z - C.z;
        const along = dx * Math.sin(L.a) + dz * Math.cos(L.a);
        const perp = Math.abs(dx * Math.cos(L.a) - dz * Math.sin(L.a));
        if (along > 2 && along < 26.5 && perp < 1.7 && q.y < 2.4) hitMe(c, { x: C.x + Math.sin(L.a) * along, z: C.z + Math.cos(L.a) * along });
      }
    });
    local.patchCd = Math.max(0, local.patchCd - dt);
    B.patches.forEach((Pt) => {
      if (Pt.t > 1.6 && Pt.t < 8.4 && !local.patchCd) {
        if (Math.hypot(q.x - Pt.x, q.z - Pt.z) < 2.75 && q.y < 0.9) {
          local.patchCd = 1.2;
          hitMe(c, { x: Pt.x, z: Pt.z });
        }
      }
    });
    if (B.ring.t >= 1.2 && !local.ringHit) {
      const r = H6.ringPos(B.ring.t);
      const d = Math.hypot(q.x - C.x, q.z - C.z);
      if (Math.abs(d - r) < 0.6 && q.y < 0.65) {
        local.ringHit = true;
        hitMe(c);
      }
    }
  };
  const scheduleAttacks = (c, dt) => {
    const x = c.S.x;
    if (!x.fight || x.won) return;
    local.atkT -= dt;
    if (local.atkT > 0) return;
    const n = x.roses || 0;
    local.atkT = Math.max(2.1, 3.6 - n * 0.55) + Math.random() * 0.9;
    const qd = H6.rel(c.pos('dame'));
    const qv = H6.rel(c.pos('valet'));
    const C = H6.C;
    // she wants the one who is helping a rose grow
    const grow = Object.values(H6.buds).some((b) => b.stage === 9 && (local.prog[b.id] || 0) > 0.05);
    const tgt = Math.random() < 0.5 ? qd : qv;
    const ang = Math.atan2(tgt.x - C.x, tgt.z - C.z);
    const roll = Math.random();
    let d;
    if (n >= 1 && roll < 0.22) d = ['r'];
    else if (roll < (grow ? 0.75 : 0.6)) d = ['l', +ang.toFixed(3)];
    else d = ['p', +tgt.x.toFixed(2), +tgt.z.toFixed(2)];
    attack(c, d);
    c.send('h6atk', d);
    // from the second rose on, a second lash at the other one
    if (n >= 2 && d[0] === 'l') {
      const o = tgt === qd ? qv : qd;
      const d2 = ['l', +Math.atan2(o.x - C.x, o.z - C.z).toFixed(3)];
      setTimeout(() => {
        attack(c, d2);
        c.send('h6atk', d2);
      }, 600);
    }
  };

  const setAim = (c, id) => {
    if (local.aim === id) return;
    local.aim = id;
    local.aimSent = 0;
    if (Net.isHost) local.aims[c.role] = id;
    c.send('h6a', [c.role, id]);
    if (id && id !== 'spot') Sound.play(c.role === 'dame' ? 'lantern' : 'tile');
  };

  Story.register('tr_h6', {
    init: () => ({ stage: 1, grown: {}, roses: 0, fight: false, won: false }),
    voice: () => 1,
    net: {
      h6a: (c, d) => {
        const [who, id] = d;
        if (who === c.role) return;
        local.mateAim = id;
        local.aims[who] = id;
      },
      h6p: (c, d) => {
        if (Net.isHost) return;
        local.prog = d;
      },
      h6s: (c, a) => {
        if (!Net.isHost) local.sunA = a;
      },
      h6g: (c) => {
        if (!Net.isHost) local.gust = 0;
      },
      h6i: (c, d) => {
        if (!Net.isHost) local.iceHp = d;
      },
      h6l: (c, d) => {
        local.mateSpot = d ? V3(d[0], d[1], d[2]) : null;
      },
      h6c: (c, v) => {
        local.mateCan = v;
      },
      h6atk: (c, d) => attack(c, d),
      h6fx: (c, d) => fx(c, d),
      h6say: (c, d) => HUD.say(d[0], T.master, 2400),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      H6.build();
      local.stage = 0;
      local.aim = null;
      local.mateAim = null;
      local.aims = { dame: null, valet: null };
      local.prog = {};
      local.gust = -1;
      local.bloom = 0;
      local.sub = {};
      local.can = 1;
      local.hitT = 0;
      c.spawn(respawnPos(c), 0);
      Player.killY = H6.O.y - 1.6;
      Player.checkpoint = () => {
        onFall(c);
        return respawnPos(c);
      };
      Player.targets = () => {
        if (c.role !== 'dame') return [];
        return H6.ringsFor(Story.S.x.stage).map((r) => r.wp);
      };
      Player.grappleLand = () => H6.grappleLand(H6.rel(Player.body.p));
      local.env = { hemi: R.hemi.intensity, moon: R.moon.intensity };
      R.hemi.intensity = 0.52;
      R.moon.intensity = 0.74;
      // a glasshouse at the golden hour (fully gold once the Queen withers)
      City.mood({ gold: c.S.x.stage >= 10 ? 0.75 : 0.45 });
      c.fog(0.008);
      Sound.mood(c.S.x.stage >= 10 ? 'gold' : c.S.x.stage === 9 ? 'tense' : 'calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (H6.screen) H6.screen.show(TITLE, CARD + ' · l’eau et la lumière', '#ff8fb0');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        HUD.say(TXT.intro, T.master, 3600);
        HUD.say(TXT.rule, T.master, 4200);
        HUD.say(TXT.tool[c.role], T.master, 5200);
      }
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.moon.intensity = local.env.moon;
      }
      H6.hide();
    },
    apply(c) {
      if (!H6.built) return;
      const x = c.S.x;
      Object.values(H6.buds).forEach((b) => {
        if (!isIce(b)) b.grown = grown(x, b.id);
        b.ok = () => okBud(Story.S.x, b);
      });
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        local.sub = {};
        if (prev && x.stage > 1 && x.stage < 9) Sound.play('chime');
        if (x.stage === 9) {
          Sound.mood('tense');
          if (H6.screen) H6.screen.show('La Reine des Épines', 'trois roses à ses racines', '#ff5f8a');
        }
        if (x.stage === 10) {
          Sound.mood('gold');
          HUD.say(TXT.win, T.master, 3200);
          City.mood({ gold: 0.75 });
          R.hemi.intensity = 0.66;
        }
        if (prev && x.stage === 5) HUD.say('L’aile des saisons. Quatre salles, quatre façons de faire pousser.', T.master, 3200);
      }
      const D = H6.doors;
      D.d0.want = 0;
      D.d1.want = x.stage >= 5 ? 1 : 0;
      D.d2.want = x.stage >= 6 ? 1 : 0;
      D.d3.want = x.stage >= 7 ? 1 : 0;
      D.d4.want = x.stage >= 7 ? 1 : 0;
      D.d5.want = x.stage >= 8 ? 1 : 0;
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!H6.built) return;
      const x = c.S.x;
      const qd = H6.rel(c.pos('dame'));
      const qv = H6.rel(c.pos('valet'));
      const both = (z) => H6.at(z, qd) && H6.at(z, qv);
      // ---------- progression ----------
      if (x.stage === 1 && both('A1')) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && both('A2')) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3 && both('T1')) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4 && both('LOB')) c.set((s) => (s.x.stage = 5));
      if (x.stage === 5 && both('SPF')) c.set((s) => (s.x.stage = 6));
      if (x.stage === 6 && both('SUT')) c.set((s) => (s.x.stage = 7));
      if (x.stage === 7 && both('AUL')) c.set((s) => (s.x.stage = 8));
      if (x.stage === 9 && !x.fight && both('DOME')) {
        local.atkT = 3;
        c.set((s) => (s.x.fight = true));
        sayBoth(c, TXT.s9.intro);
        fxBoth(c, ['queen']);
      }
      if (x.stage === 10 && local.bloom > 3 && H6.rel(c.pos('dame')).distanceTo(H6.C) < 4.5 && H6.rel(c.pos('valet')).distanceTo(H6.C) < 4.5)
        c.goto('reward', (s) => (s.x.card = 'h6'));
      tickGrowth(c, dt);
      // ---------- the sunflower follows the little sun ----------
      if (x.stage === 4 && grown(x, 'sun')) {
        if (local.aims.dame === 'sunhead') {
          const want = H6.sunAngleFor(c.pos('dame'));
          const d = want - local.sunA;
          local.sunA += clamp(d, -0.5 * dt, 0.5 * dt);
        }
        local.sendS += dt;
        if (local.sendS > 0.066) {
          local.sendS = 0;
          c.send('h6s', +local.sunA.toFixed(4));
        }
      }
      // ---------- spring gusts ----------
      if (x.stage === 5 && grown(x, 'dand')) {
        local.gustT -= dt;
        if (local.gustT <= 0) {
          local.gustT = 14;
          local.gust = 0;
          c.send('h6g', 1);
          sayBoth(c, TXT.wind);
        }
      }
      // ---------- winter: the ice melts by itself, and fast near the little sun ----------
      if (x.stage === 8) {
        const qdW = qd;
        let dirty = false;
        H6.buds && Object.values(H6.buds).forEach((b) => {
          if (!isIce(b)) return;
          const i = +b.id.slice(3);
          if (local.iceHp[i] <= 0) return;
          const near = Math.hypot(qdW.x - H6.rel(b.pos).x, qdW.z - H6.rel(b.pos).z) < 4.5;
          const was = local.iceHp[i];
          local.iceHp[i] = Math.max(0, local.iceHp[i] - dt * (near ? 1 / 1.3 : 1 / 18));
          if (was >= 0.3 && local.iceHp[i] < 0.3 && !near) {
            fxBoth(c, ['crack', b.pos.toArray()]);
            sayBoth(c, TXT.crack);
          }
          if (near) {
            local.meltCd -= dt;
            if (local.meltCd <= 0) {
              local.meltCd = 4;
              if (c.role === 'dame') sayBoth(c, TXT.meltMe, TXT.melt);
              else sayBoth(c, TXT.melt, TXT.meltMe);
              fxBoth(c, ['melt', b.pos.toArray()]);
            }
          }
          if (local.iceHp[i] <= 0) fxBoth(c, ['melt', b.pos.toArray()]);
          dirty = true;
        });
        local.sendI += dt;
        if (dirty && local.sendI > 0.2) {
          local.sendI = 0;
          sendIce(c);
        }
      }
      if (x.stage === 9) scheduleAttacks(c, dt);
    },
    action(c, who, d) {},
    update(c, dt, t) {
      if (!H6.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = H6.rel(p);
      local.hitT = Math.max(0, local.hitT - dt);
      // the furthest safe place of this stage (where a fall brings you back)
      if (x.stage === 4 && q.z > 111 && q.y > 5.5) local.sub.t2 = true;
      if (x.stage === 5 && H6.at('SPF', q)) local.sub.springFar = true;
      if (x.stage === 8 && q.z > 302 && q.y > -0.3) local.sub.island = true;
      if (x.stage >= 9 && H6.at('DOME', q)) local.sub.arena = true;
      if (!Net.isHost && local.gust >= 0) local.gust += dt;
      if (Net.isHost && local.gust >= 0) local.gust += dt;
      if (local.gust > H6.SEED_TOTAL + 0.5) local.gust = -1;
      const g = local.gust;
      local.wind = damp(local.wind, g >= 3.6 && g < 9.2 ? 1 : 0, 3, dt);
      if (x.stage === 10) local.bloom += dt;
      // ice: grown means "there is ice" (host's numbers)
      Object.values(H6.buds).forEach((b) => {
        if (!isIce(b)) return;
        const i = +b.id.slice(3);
        b.grown = local.iceHp[i] > 0;
        b.hp = local.iceHp[i];
        b.prog = b.grown ? 0 : local.prog[b.id] || 0;
      });
      Object.values(H6.buds).forEach((b) => {
        if (!isIce(b)) b.prog = local.prog[b.id] || 0;
      });

      // ---------- my tool ----------
      const holding = Input.held('interact') && local.hitT <= 0;
      let want = null;
      let prompt = null;
      const cand = findAim(c);
      // the watering can of summer runs dry
      const summer = x.stage === 6 && r === 'valet';
      if (summer && H6.nearFountain(q) && local.can < 1) {
        if (holding) {
          local.can = Math.min(1, local.can + dt * 0.8);
          if (Math.random() < dt * 8) Sound.play('tile');
          if (local.can >= 1) HUD.say(TXT.full, T.master, 1600);
        }
        prompt = ['E', 'Remplir l’arrosoir (maintenir) · ' + Math.round(local.can * 100) + ' %', true];
      } else if (cand) {
        const dry = summer && local.can <= 0;
        if (holding && !dry) want = cand;
        if (dry) {
          local.canWarn -= dt;
          if (holding && local.canWarn <= 0) {
            local.canWarn = 4;
            HUD.say(TXT.empty, T.master, 2200);
          }
        }
        const b = H6.buds[cand];
        const verb = r === 'dame' ? 'Éclairer' : 'Arroser';
        const what =
          cand === 'sunhead'
            ? 'le tournesol'
            : cand === 'spot'
              ? 'le sol'
              : b && isIce(b)
                ? 'l’eau (elle gèle)'
                : b && b.id === 'wice'
                  ? 'la glace'
                  : b && b.kind === 'rose'
                    ? 'la rose'
                    : 'la pousse';
        const pc = b ? Math.round((local.prog[b.id] || 0) * 100) : 0;
        prompt = ['E', verb + ' ' + what + (holding && b ? ' · ' + pc + ' %' : ' (maintenir)'), true];
        if (dry) prompt = ['E', 'Arrosoir vide : la fontaine', true];
      }
      if (summer && want) {
        local.can = Math.max(0, local.can - dt / 5);
      }
      setAim(c, want);
      // holding alone on a plant that needs both: say so, once in a while
      const wb = want && H6.buds[want];
      if (wb && wb.req === 'both' && local.mateAim !== want) {
        local.aloneT = (local.aloneT || 0) + dt;
        if (local.aloneT > 2.5 && !(local.aloneCd > 0)) {
          local.aloneCd = 12;
          HUD.say(TXT.alone[r], T.master, 2600);
        }
      } else local.aloneT = 0;
      local.aloneCd = (local.aloneCd || 0) - dt;
      local.aimSent += dt;
      if (local.aimSent > 1) {
        local.aimSent = 0;
        c.send('h6a', [r, local.aim]);
      }
      if (summer) {
        local.canSent += dt;
        if (local.canSent > 0.33) {
          local.canSent = 0;
          c.send('h6c', +local.can.toFixed(2));
        }
      }
      // autumn: the spot of light on the ground
      if (r === 'dame') {
        if (local.aim === 'spot') {
          groundSpot(hv);
          local.spot = local.spot || V3();
          local.spot.lerp(hv, local.spot.lengthSq() ? 0.35 : 1);
          local.spotSent += dt;
          if (local.spotSent > 0.08) {
            local.spotSent = 0;
            c.send('h6l', local.spot.toArray().map((v) => +v.toFixed(2)));
          }
        } else if (local.spot) {
          local.spot = null;
          c.send('h6l', null);
        }
      }

      // ---------- the tools in your hands, the water and the light ----------
      const handOf = (who, out) => {
        if (who === r) return Player.avatar.hand(out);
        if (Remote.has) return Remote.hand(out);
        return out.copy(c.pos(who)).add(V3(0, 1.1, 0));
      };
      const Tl = H6.tools;
      handOf('dame', hv);
      Tl.lamp.position.copy(hv).add(V3(0, 0.12, 0));
      Tl.lamp.rotation.y = t * 0.8;
      Tl.halo.material.opacity = 0.45 + Math.sin(t * 5) * 0.08;
      handOf('valet', tmp);
      Tl.can.position.copy(tmp);
      const lev = r === 'valet' ? local.can : local.mateCan;
      Tl.canLevel.visible = x.stage !== 6 || lev > 0.02;
      Tl.canLevel.position.y = -0.12 + 0.26 * (x.stage === 6 ? lev : 1);
      const aims = { dame: r === 'dame' ? local.aim : local.mateAim, valet: r === 'valet' ? local.aim : local.mateAim };
      const lt = aimPoint(c, aims.dame, tmp2.clone());
      Tl.beam.visible = !!lt;
      Tl.beamSpot.visible = !!lt && aims.dame !== 'spot';
      if (lt) {
        const from = Tl.lamp.position;
        const dir = lt.clone().sub(from);
        const len = dir.length();
        Tl.beam.position.copy(from);
        Tl.beam.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
        const wide = aims.dame === 'spot' ? 0.5 : 1 + len * 0.04;
        Tl.beam.scale.set(wide, len, wide);
        Tl.beam.material.opacity = 0.42 + Math.sin(t * 9) * 0.06;
        Tl.beamSpot.position.copy(lt);
      }
      const wt = aimPoint(c, aims.valet, V3());
      // the can turns to where it pours, else it follows its bearer
      if (wt) local.canYaw = Math.atan2(wt.x - tmp.x, wt.z - tmp.z);
      else if (r === 'valet') local.canYaw = Player.yaw;
      Tl.can.rotation.y = angleDamp(Tl.can.rotation.y, local.canYaw || 0, 10, dt);
      Tl.stream.visible = !!wt;
      if (wt) {
        const spout = Tl.can.localToWorld(V3(0, 0.26, 0.5));
        const tt = t;
        H6.tools.stream.visible = true;
        // the stream of drops
        const a = Tl.stream.geometry.attributes.position.array;
        const n = a.length / 3;
        const d = spout.distanceTo(wt);
        const h = 0.5 + d * 0.12;
        for (let i = 0; i < n; i++) {
          const u = ((i / n + tt * 1.6) % 1 + 1) % 1;
          const j = Math.sin(i * 12.9898) * 0.06;
          a[i * 3] = spout.x + (wt.x - spout.x) * u + j;
          a[i * 3 + 1] = spout.y + (wt.y - spout.y) * u + 4 * h * u * (1 - u) + j;
          a[i * 3 + 2] = spout.z + (wt.z - spout.z) * u + Math.cos(i * 7.1) * 0.06;
        }
        Tl.stream.geometry.attributes.position.needsUpdate = true;
        local.pourSnd -= dt;
        if (local.pourSnd <= 0) {
          local.pourSnd = 0.45;
          Sound.play('step', 0.15);
        }
      }
      if (H6.lampLight) H6.lampLight.intensity = x.stage === 7 ? 0.7 : 1.1;

      // ---------- riding: the sunflower head and the spring seeds carry whoever stands on them ----------
      H6.movers.forEach((m) => {
        if (m.on && Player.body.ground === m.box && Player.body.grounded) p.add(m.delta);
      });
      // winter: the channels hold except over a floating floe (and for the grapple's flight)
      local.hopT = Player.mode === 'grapple' ? 1.4 : Math.max(0, (local.hopT || 0) - dt);
      Object.values(H6.buds).forEach((b) => {
        if (!b.walls) return;
        const on = x.stage === 8 && !local.hopT;
        b.walls.side.forEach((w) => (w.on = on));
        b.walls.plug.on = on && !b.cols[0].on;
      });
      // the springboard flower
      const bl = H6.buds.bloom;
      if (bl.grown && Player.body.grounded && Player.body.ground === bl.bounce) {
        // straight up and towards the terrace (the only reason this flower is here)
        Player.body.v.y = 19.5;
        Player.body.v.z = Math.max(Player.body.v.z, 0) + 4.5;
        Player.body.v.x *= 0.5;
        Player.jumps = 1;
        fxBoth(c, ['bounce', bl.pos.clone().add(V3(0, 1, 0)).toArray()]);
      }
      // spring wind pushes a little while it blows
      if (x.stage === 5 && local.wind > 0.3 && q.z > 151 && q.z < 168 && Player.body.ground && !H6.movers.some((m) => m.box === Player.body.ground)) {
        p.x += local.wind * 0.8 * dt;
      }
      tickAttacks(c, dt);

      // ---------- the world ----------
      H6.update(dt, t, {
        me: p,
        stage: x.stage,
        water: aims.valet,
        light: aims.dame,
        sunA: local.sunA,
        gust: local.gust,
        wind: local.wind,
        spot: aims.dame === 'spot' ? (r === 'dame' ? local.spot : local.mateSpot) : null,
        wallMelt: x.stage >= 9 ? Math.min(1, (local.wallK = (local.wallK || 0) + dt * 0.5)) : (local.wallK = 0),
        rings: Player.targets ? H6.ringsFor(x.stage) : [],
        roses: x.roses || 0,
        bloom: local.bloom,
      });
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      if (x.stage === 10) return null;
      return prompt;
    },
  });

  // a fall: back to the stage's safe place, and a word on both screens
  const onFall = (c) => {
    const x = c.S.x;
    const q = H6.rel(Player.body.p);
    const k = x.stage <= 2 ? 'water' : x.stage === 7 ? 'hole' : x.stage === 8 ? 'ice' : 'void';
    HUD.say(TXT.fall[k], T.master, 2200);
    c.send('h6say', [TXT.fallMate]);
    const pos = Player.body.p.clone().toArray();
    fxBoth(c, ['fall', pos]);
    if (Player.mode === 'grapple') Player.mode = 'walk';
    setAim(c, null);
    void q;
  };
})();
