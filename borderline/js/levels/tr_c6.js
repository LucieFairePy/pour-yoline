// ♣ 6 · Les Mondes miroirs. One of you walks the glass garden by day, the other the crystal garden
// by night, head to toe on either side of a liquid mirror. Levers raise bridges on the other side;
// objects dropped in the well come out of the other one; inversions swap your worlds; the Reflet
// can only be struck from the world where it is not.
(() => {
  const T = CONFIG;
  const W = C6M;
  const TITLE = 'Les Mondes miroirs';
  const TXT = {
    intro: 'Épreuve d’équipe. Deux jardins, un seul miroir : celui du jour, celui de la nuit.',
    rule: 'Chacun marche dans son monde et voit l’autre à travers le sol, à l’envers, comme un reflet. Ce qui est ouvert d’un côté est fermé de l’autre.',
    side: {
      U: 'Tu es en haut, dans le jardin de verre, au soleil. {mate} marche sous tes pieds, dans la nuit.',
      L: 'Tu es en bas, dans le jardin de cristal, la nuit. {mate} marche au-dessus de toi, au soleil.',
    },
    together: 'Restez à la hauteur l’un de l’autre : si vous vous éloignez, le miroir se trouble.',
    s1: {
      c1: {
        U: 'Le premier gouffre. Ton levier fait naître la passerelle de {mate}, pas la tienne. Actionne-le (E).',
        L: 'Le premier gouffre. Ta passerelle naîtra du levier de {mate}. De l’autre côté, ton levier fera la sienne.',
      },
      c2: 'Une seule passerelle pour deux : elle n’existe que d’un côté à la fois. Un levier l’envoie de l’autre côté du miroir.',
      c3: 'Deux demi-passerelles, chacune d’un côté. Chaque levier les échange toutes les deux.',
      c4: 'Le pont des reflets : montez ensemble sur les deux marques, puis traversez côte à côte. Si l’un prend de l’avance, il se brise.',
    },
    c1me: 'Une passerelle apparaît chez {mate}.',
    c1mate: '{mate} a fait naître ta passerelle.',
    c1done: 'Elle est déjà là.',
    c2me: 'La passerelle plonge dans le miroir et passe chez {mate}.',
    c2mate: 'La passerelle passe de ton côté.',
    c2not: 'La passerelle n’est pas de ce côté : seul{pe} {mate} peut te l’envoyer.',
    c3: 'Les deux demi-passerelles changent de monde.',
    trouble: 'Le miroir est trouble : vous êtes trop loin l’un de l’autre. Rapprochez-vous.',
    b4on: 'Le pont des reflets se forme. Avancez ensemble, à la même hauteur.',
    b4warn: 'Le pont tremble : restez à la même hauteur !',
    b4break: 'Le pont s’est brisé. Revenez tous les deux sur les marques.',
    s2: {
      start: {
        U: 'Le Puits miroir : ce qu’on y jette remonte chez {mate}. Prends le cube (E) : il ouvre la cage de la nuit.',
        L: 'Le Puits miroir. La clé est en cage : la cage s’ouvre quand le cube de {mate} est posé sur la dalle, devant elle.',
      },
      locks: {
        U: 'La porte du jour a deux serrures : la clé et le cube. {mate} voit laquelle prend quoi : écoute-{le}.',
        L: 'Renvoie la clé, puis le cube, par le puits. Toi seul{e} vois quelle serrure du jour prend quoi : guide {mate}.',
      },
      weight: {
        U: 'Derrière la porte, le poids : toi seul{e} peux le porter. Pose-le sur la balance du jour : elle ouvre la porte de la nuit.',
        L: 'La porte de {mate} est ouverte. Sa balance ouvrira la tienne.',
      },
      open: 'Les deux portes sont ouvertes. Avancez ensemble.',
    },
    names: { cube: 'le cube', key: 'la clé', weight: 'le poids' },
    sent: 'Plouf. Ça remonte chez {mate}.',
    got: '{mate} t’envoie quelque chose : ça remonte du puits.',
    heavy: 'Trop lourd pour toi. Seul{pe} {mate} peut porter ça.',
    wellHeavy: 'Le miroir refuse le poids : trop lourd pour passer de l’autre côté.',
    holding: 'Tu as déjà les mains prises.',
    cage: 'La cage de cristal s’ouvre. La clé est libre.',
    cageMate: 'Ton cube a ouvert la cage de {mate}.',
    slotWrong: 'La serrure refuse : ce n’est pas le bon socle.',
    slotOk: 'Une serrure s’allume.',
    plateWrong: 'Rien ne se passe : ce n’est pas ce que la dalle attend.',
    balLight: 'La balance ne bouge pas : trop léger.',
    doorU: 'La porte du jour s’ouvre.',
    doorL: 'La balance penche. La porte de la nuit s’ouvre.',
    s3: {
      inv: 'Une inversion : entrez ensemble dans les deux cercles. Vos mondes vont s’échanger.',
      g1: {
        U: 'Le jour est à toi maintenant. Reste sur une dalle d’or (il y en a une de chaque côté du gouffre) : la passerelle de {mate} n’existe que tant que tu y es. Toi, grappin sur l’anneau (F).',
        L: 'La nuit est à toi maintenant. Ta passerelle n’existe que tant que {mate} reste sur sa dalle. Traverse.',
      },
      twin: 'Les cadrans jumeaux : quand l’un presse sa dalle, l’autre n’a que {n} s pour presser la sienne. Comptez ensemble.',
      inv2: 'La seconde inversion : les deux cercles, ensemble.',
      end: 'Au bout du chemin, l’arène du Reflet.',
    },
    invGo: 'Inversion…',
    invStop: 'L’inversion s’arrête : restez tous les deux dans les cercles.',
    swap: 'Le ciel se retourne. Vous avez changé de monde.',
    holdOff: 'La dalle est libre : la passerelle de {mate} s’efface.',
    tpOpen: '{mate} a pressé sa dalle : vite, la tienne !',
    tpMine: 'Ta dalle est pressée. À {mate}, maintenant.',
    tpWin: 'Les cadrans s’accordent. La vitre s’enfonce dans le miroir.',
    tpLate: 'Trop tard : les cadrans se sont désaccordés.',
    s4: {
      enter: 'Entrez ensemble dans l’arène.',
      lure: 'Le Reflet est de ton côté : attire-le là où {mate} l’attend, et esquive ses attaques.',
      strike: 'Le Reflet est sous tes pieds, de l’autre côté. Quand il se fige et rougit, mets-toi au-dessus et frappe (clic ou E).',
    },
    bossIntro: 'Le Reflet : vous deux, en sombre, en retard d’un geste. On ne peut le frapper que depuis l’autre monde.',
    hit: 'Le Reflet t’a touché{e}.',
    hitMate: 'Le Reflet a touché {mate}.',
    struck: 'Touché ! Le Reflet se fêle.',
    early: 'Il n’est vulnérable que figé, quand il rougit.',
    far: 'Pas au-dessus de lui : place-toi sur la cible.',
    cross: 'Le Reflet traverse le miroir : les rôles s’inversent !',
    win: 'Le Reflet éclate en mille éclats de miroir.',
    reunite: 'Le miroir se calme. Les deux mondes n’en font plus qu’un.',
    card: 'La carte ♣ 6 vous attend au centre de l’arène. Allez-y ensemble.',
    fall: 'Le miroir te recrache au dernier passage.',
    fallMate: '{mate} est tombé{pe} dans le miroir.',
  };
  CONFIG.cards.c6 = {
    corner: '6\n♣',
    big: '♣',
    title: TITLE,
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'On a marché chacun de son côté du miroir.',
      'Ce que l’un ouvrait, l’autre le traversait.',
      'Au bout, il n’y avait plus qu’un seul monde : le nôtre.',
    ],
  };

  const BOSS_HP = 8;
  const local = {
    stage: 0,
    sub1: 'a0',
    sub3: 'c0',
    objT: 0,
    clear: true,
    trouble: 0,
    warn4: 0,
    warnSent: 0,
    invIn: 0,
    invCd: null,
    invSent: 0,
    holdT: 0,
    win: null,
    winSent: 0,
    onPrev: { dame: false, valet: false },
    hud: { inv: null, tp: null, warn4: 0 },
    trans: null,
    myWorld: null,
    env: null,
    light: null,
    hitT: 0,
    atks: [],
    B: null,
    bossNet: null,
    bossSent: 0,
    punch: 0,
    bloom: 0,
    lastSay: {},
    tickN: -1,
    winT: 0,
  };
  W.local = local;
  const mateKit = (r) => (r === 'dame' ? 'valet' : 'dame');
  // valet above at first; every inversion swaps; the end brings both above
  const sideOf = (x, kit) => (x.stage >= 5 ? 'U' : (kit === 'valet') === (x.sw % 2 === 0) ? 'U' : 'L');
  W.sideOf = sideOf;
  const tmp = V3();
  const near2 = (q, x, z, r) => Math.hypot(q.x - x, q.z - z) < r;

  // ---------- say / fx on both screens ----------
  const sayTo = (c, who, text, ms = 2600) => {
    if (who === c.role) HUD.say(text, T.master, ms);
    else c.send('c6say', [text, ms]);
  };
  const sayBoth = (c, mine, theirs, ms = 2600) => {
    HUD.say(mine, T.master, ms);
    c.send('c6say', [theirs || mine, ms]);
  };
  // a line for the one who did it and another for the partner
  const sayPair = (c, who, forWho, forMate) => {
    sayTo(c, who, forWho);
    sayTo(c, mateKit(who), forMate);
  };
  const myW = () => W.worldOf(Player.body.p);
  const fx = (c, d) => {
    const [k, w, x, y, z, e] = d;
    const me = myW();
    const pos = w ? W.view(w, me, x, y, z) : null;
    const g = w && w !== me ? 0 : -3;
    if (k === 'bridge') {
      W.Syn.play('bridge', w === me ? 1 : 0.7);
      if (pos) Fx.burst(pos, w === 'U' ? '#ffcf8a' : '#b07cff', 40, 3, 0.9, g);
    }
    if (k === 'unbridge') {
      W.Syn.play('unbridge', w === me ? 1 : 0.7);
      if (pos) Fx.burst(pos, '#cfe0ff', 30, 3, 0.7, g);
    }
    if (k === 'lever') {
      W.Syn.play('lever', w === me ? 1 : 0.6);
      if (pos) W.ripple(pos.x, pos.z, 0.6);
    }
    if (k === 'deny') W.Syn.play('deny');
    if (k === 'trouble') W.Syn.play('trouble');
    if (k === 'well') {
      W.Syn.play('well');
      const p0 = W.view(w, me, W.WELL.x, 0.8, W.WELL.z);
      Fx.burst(p0, '#ff9fc6', 50, 4, 1.0, w === me ? -4 : 0);
      W.ripple(W.AN[me].x + W.WELL.x, W.AN[me].z + W.WELL.z, 1.4);
    }
    if (k === 'pick') W.Syn.play('pick');
    if (k === 'place') {
      W.Syn.play('place');
      if (pos) Fx.burst(pos, '#ffcf8a', 30, 2.5, 0.8, g);
    }
    if (k === 'cage' || k === 'door') {
      W.Syn.play('gate');
      Sound.play('reveal');
      if (pos) Fx.burst(pos, w === 'U' ? '#ffcf8a' : '#9fd8ff', 60, 4, 1.1, g);
    }
    if (k === 'gate') {
      W.Syn.play('gate');
      if (pos) Fx.burst(pos, '#ffd7ea', 50, 4, 1.0, g);
    }
    if (k === 'swap') W.Syn.play('swap');
    if (k === 'tick') W.Syn.play('tick', x);
    if (k === 'bridge4') {
      W.Syn.play('bridge');
      Sound.play('reveal');
    }
    if (k === 'break4') {
      W.Syn.play('shatter', 0.8);
      Sound.play('fall');
      Cam.shake = Math.max(Cam.shake, 0.3);
    }
    if (k === 'fall') {
      Sound.play('fall');
      if (pos) {
        Fx.burst(pos, '#cfe6ff', 40, 4, 0.7, g);
        W.ripple(pos.x, pos.z, 1.2);
      }
    }
    if (k === 'tele') W.Syn.play('tele', w === me ? 1 : 0.6);
    if (k === 'impact') {
      if (pos) {
        Fx.burst(pos, '#ff7aa8', 40, 5, 0.6, g);
        W.ripple(pos.x, pos.z, 1.0);
      }
      W.Syn.play('shatter', w === me ? 0.6 : 0.35);
      if (w === me) Cam.shake = Math.max(Cam.shake, 0.2);
    }
    if (k === 'strike') {
      W.Syn.play('slam');
      W.Syn.play('shatter', 0.6);
      Sound.play('roar');
      W.bossFlash();
      Cam.shake = Math.max(Cam.shake, 0.45);
      if (pos) {
        Fx.burst(pos, '#ff5f8a', 80, 6, 1.0, g, 'heart');
        Fx.burst(pos, '#ffffff', 40, 4, 0.6, g);
        W.ripple(pos.x, pos.z, 2);
      }
    }
    if (k === 'miss') {
      W.Syn.play('slam', 0.5);
      if (pos) Fx.burst(pos, '#cfe0ff', 20, 3, 0.4, g);
    }
    if (k === 'rise') {
      W.Syn.play('swap');
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.35);
      if (pos) {
        W.ripple(pos.x, pos.z, 2.5);
        Fx.burst(pos, '#b07cff', 90, 6, 1.2, g);
      }
    }
    if (k === 'cross') {
      W.Syn.play('swap');
      Sound.play('roar');
      if (pos) W.ripple(pos.x, pos.z, 2);
    }
    if (k === 'hit') {
      Sound.play('hurt');
      if (pos) Fx.burst(pos, '#ff3a5a', 40, 5, 0.7, g);
    }
    if (k === 'win') {
      W.Syn.play('shatter', 1.4);
      W.Syn.play('win');
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.7);
      if (pos) {
        W.burstShards(w, me, x, y, z);
        Fx.burst(pos.clone().add(V3(0, 2, 0)), '#ff8fb0', 160, 8, 1.6, g, 'heart');
        Fx.burst(pos.clone().add(V3(0, 2, 0)), '#b07cff', 120, 7, 1.4, g);
      }
    }
    if (k === 'reunite') {
      W.Syn.play('heart');
      Sound.play('reveal');
    }
    void e;
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('c6fx', d);
  };

  // ---------- bridges & world state from S ----------
  const applyWorld = (c) => {
    const x = c.S.x;
    const B = W.bridges;
    const set = (id, on) => {
      const b = B[id];
      if (!b) return;
      b.want = on ? 1 : 0;
      b.b.on = !!on;
    };
    set('b1U', x.b1U);
    set('b1L', x.b1L);
    set('b2U', x.b2 === 'U');
    set('b2L', x.b2 === 'L');
    set('b3aU', x.b3 === 0);
    set('b3aL', x.b3 === 1);
    set('b3bU', x.b3 === 1);
    set('b3bL', x.b3 === 0);
    set('b4U', x.b4);
    set('b4L', x.b4);
    set('g1L', x.hold);
    const D = W.doors;
    D.U.want = x.doorU ? 1 : 0;
    D.U.b.on = !x.doorU;
    D.L.want = x.doorL ? 1 : 0;
    D.L.b.on = !x.doorL;
    W.cage.want = x.cage ? 1 : 0;
    W.cage.b.on = !x.cage;
    for (let k = 0; k < 3; k++)
      ['U', 'L'].forEach((w) => {
        const g = W.gates['gt' + k + w];
        g.want = x.gt > k ? 1 : 0;
        g.b.on = !(x.gt > k);
      });
    ['U', 'L'].forEach((w) => {
      const g = W.gates['arena' + w];
      const open = !x.fight || x.won;
      g.want = open ? 1 : 0;
      g.b.on = !open;
    });
  };

  // ---------- respawn ----------
  const respawnPos = (c) => {
    const x = c.S.x;
    const key = x.stage === 1 ? local.sub1 : x.stage === 2 ? 'b' : x.stage === 3 ? local.sub3 : x.stage === 4 ? 'd' : 'e';
    return W.spawn(sideOf(x, c.role), key, c.role);
  };
  const trackSub = (c, q) => {
    const x = c.S.x;
    if (!Player.body.grounded || q.y < -0.3) return;
    if (x.stage === 1) {
      const order = ['a0', 'a1', 'a2', 'a3', 'a4'];
      const k = q.z >= 84.6 ? 'a4' : q.z >= 62 ? 'a3' : q.z >= 40 ? 'a2' : q.z >= 20 ? 'a1' : 'a0';
      if (order.indexOf(k) > order.indexOf(local.sub1)) local.sub1 = k;
    }
    if (x.stage === 3) {
      const order = ['c0', 'c1', 'c2', 'c3', 'c4'];
      const k = q.z >= 225.5 ? 'c4' : q.z >= 211.5 ? 'c3' : q.z >= 198 ? 'c2' : q.z >= 186.5 ? 'c1' : 'c0';
      if (order.indexOf(k) > order.indexOf(local.sub3)) local.sub3 = k;
    }
  };
  const onFall = (c) => {
    const p = Player.body.p;
    const w = myW();
    const q = W.rel(p);
    HUD.say(TXT.fall, T.master, 2200);
    c.send('c6say', [TXT.fallMate, 2200]);
    fxBoth(c, ['fall', w, q.x, -0.6, q.z]);
    if (Player.mode === 'grapple') Player.mode = 'walk';
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    const side = sideOf(x, r);
    const q = W.rel(Player.body.p);
    if (x.stage === 1) {
      if (q.z < 20 && !(side === 'U' ? x.b1U : x.b1L)) return TXT.s1.c1[side];
      if (q.z < 40) return q.z < 20 ? TXT.s1.c1[side] : TXT.s1.c2;
      if (q.z < 62) return TXT.s1.c3;
      return TXT.s1.c4;
    }
    if (x.stage === 2) {
      if (x.doorU && x.doorL) return TXT.s2.open;
      if (x.doorU) return TXT.s2.weight[side];
      if (x.cage) return TXT.s2.locks[side];
      return TXT.s2.start[side];
    }
    if (x.stage === 3) {
      if (x.sw === 0) return TXT.s3.inv;
      if (x.sw === 1 && (q.z < 187 || (Remote.has && W.rel(Remote.pos).z < 187))) return TXT.s3.g1[side];
      if (x.sw === 1 && x.gt < 3) return TXT.s3.twin.replace('{n}', String(W.TWIN[x.gt].win).replace('.', ','));
      if (x.sw === 1) return TXT.s3.inv2;
      return TXT.s3.end;
    }
    if (x.stage === 4) {
      if (!x.fight) return TXT.s4.enter;
      return side === x.bw ? TXT.s4.lure : TXT.s4.strike;
    }
    if (x.stage === 5) return TXT.card;
    return '';
  };

  // ---------- light: day above, night below ----------
  const LIGHT = {
    U: { sky: new THREE.Color('#e4e8ff'), gnd: new THREE.Color('#b98aa6'), hi: 0.62, sun: new THREE.Color('#ffe4c4'), si: 0.82, fog: new THREE.Color('#9c86ae'), d: 0.0105 },
    L: { sky: new THREE.Color('#7a68d0'), gnd: new THREE.Color('#140a24'), hi: 0.6, sun: new THREE.Color('#a8b8ff'), si: 0.6, fog: new THREE.Color('#170e2c'), d: 0.0115 },
  };
  const lightTick = (dt, w, snap) => {
    const L = LIGHT[w];
    const k = snap ? 1 : 1 - Math.exp(-dt * 3);
    R.hemi.color.lerp(L.sky, k);
    R.hemi.groundColor.lerp(L.gnd, k);
    R.hemi.intensity += (L.hi - R.hemi.intensity) * k;
    R.moon.color.lerp(L.sun, k);
    R.moon.intensity += (L.si - R.moon.intensity) * k;
    R.FOG.lerp(L.fog, k);
    R.scene.fog.density += (L.d - R.scene.fog.density) * k;
  };

  // ---------- the flash of an inversion ----------
  let flashEl = null;
  const flash = (v) => {
    if (!flashEl) {
      flashEl = document.createElement('div');
      flashEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0;background:radial-gradient(circle at 50% 50%, rgba(255,246,250,0.96), rgba(255,170,214,0.75) 55%, rgba(176,124,255,0.6));';
      document.body.appendChild(flashEl);
    }
    flashEl.style.opacity = v;
  };
  // swap my world: float up, turn over, fall into the other garden
  const startTrans = (c, to) => {
    const q = W.rel(Player.body.p);
    local.trans = { t: 0, to, q: q.clone(), done: false };
    Player.mode = 'frozen';
    W.Syn.play('swap');
  };
  const tickTrans = (c, dt) => {
    const tr = local.trans;
    if (!tr) return;
    tr.t += dt;
    const b = Player.body;
    if (!tr.done) {
      const k = Math.min(1, tr.t / 0.95);
      b.v.set(0, 0, 0);
      W.P(W.worldOf(b.p), tr.q.x, tr.q.y + Math.sin(k * Math.PI * 0.5) * 1.6, tr.q.z, b.p);
      Player.flipT = 0.5 * k;
      Player.flipDir = 1;
      flash(k * k);
      Cam.shake = Math.max(Cam.shake, 0.15 * k);
      if (k >= 1) {
        tr.done = true;
        const p = W.P(tr.to, tr.q.x, 2.4, tr.q.z);
        Player.teleport(p, Player.yaw);
        Cam.snap(p, Cam.yaw);
        Player.mode = 'walk';
        lightTick(0, tr.to, true);
        W.ripple(p.x, p.z, 2);
      }
    } else {
      const k = Math.min(1, (tr.t - 0.95) / 0.9);
      flash((1 - k) * (1 - k));
      if (k >= 1) {
        flash(0);
        local.trans = null;
      }
    }
  };

  // ---------- section 2: items ----------
  const ITEM0 = () => ({
    cube: { w: 'U', s: 'floor', p: W.S2.cube0.slice(), via: 0 },
    key: { w: 'L', s: 'cage', p: W.S2.key0.slice(), via: 0 },
    weight: { w: 'U', s: 'floor', p: W.S2.weight0.slice(), via: 0 },
  });
  const SLOTS = {
    slotl: { w: 'U', p: () => W.S2.slot.l },
    slotr: { w: 'U', p: () => W.S2.slot.r },
    cagep: { w: 'L', p: () => W.S2.cagePlate },
    bal: { w: 'U', p: () => W.S2.bal },
  };
  const heldBy = (x, kit) => Object.keys(x.items || {}).find((id) => x.items[id].s === 'held' && x.items[id].h === kit);
  const itemPos = (it) => V3(it.p[0], it.p[1], it.p[2]);
  const nearItem = (x, w, q) => {
    let best = null;
    let bd = 2.2;
    Object.entries(x.items || {}).forEach(([id, it]) => {
      if (it.w !== w || it.s === 'held') return;
      if (it.s === 'cage' && !x.cage) return;
      const p = itemPos(it);
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd && Math.abs(q.y - p.y) < 2) {
        bd = d;
        best = id;
      }
    });
    return best;
  };
  const nearSlot = (w, q) => {
    let best = null;
    let bd = 2.0;
    Object.entries(SLOTS).forEach(([id, s]) => {
      if (s.w !== w) return;
      const p = s.p();
      const d = Math.hypot(q.x - p[0], q.z - p[2]);
      if (d < bd) {
        bd = d;
        best = id;
      }
    });
    return best;
  };
  const nearWell = (q) => Math.hypot(q.x - W.WELL.x, q.z - W.WELL.z) < W.WELL.throwR;
  const setItem = (s, id, v) => {
    s.x.items = { ...s.x.items, [id]: { ...s.x.items[id], ...v } };
  };
  const itemAction = (c, who, d) => {
    const x = c.S.x;
    if (x.stage !== 2) return;
    const p = c.pos(who);
    const w = W.worldOf(p);
    const q = W.rel(p);
    const it = x.items[d.id];
    if (!it) return;
    if (d.a === 'pick') {
      if (heldBy(x, who)) return sayTo(c, who, TXT.holding);
      if (it.w !== w || it.s === 'held' || (it.s === 'cage' && !x.cage)) return;
      const ip = itemPos(it);
      if (Math.hypot(q.x - ip.x, q.z - ip.z) > 2.8) return;
      if (d.id === 'weight' && who !== 'valet') {
        fxBoth(c, ['deny']);
        return sayTo(c, who, TXT.heavy);
      }
      c.set((s) => {
        if (it.s === 'slot' && s.x.slots[it.slot] === d.id) s.x.slots = { ...s.x.slots, [it.slot]: null };
        setItem(s, d.id, { s: 'held', h: who, slot: null });
      });
      fxBoth(c, ['pick', w, q.x, q.y, q.z]);
    }
    if (it.s !== 'held' || it.h !== who) return;
    if (d.a === 'drop') {
      const dp = d.p || [q.x, 0, q.z];
      c.set((s) => setItem(s, d.id, { s: 'floor', h: null, w, p: [+dp[0], Math.max(0, +dp[1]), +dp[2]] }));
    }
    if (d.a === 'well') {
      if (!nearWell(q)) return;
      if (d.id === 'weight') {
        fxBoth(c, ['deny']);
        return sayTo(c, who, TXT.wellHeavy);
      }
      const to = W.other(w);
      // it comes out on the side where the partner stands
      const mq = W.rel(c.pos(mateKit(who)));
      let ax = mq.x - W.WELL.x;
      let az = mq.z - W.WELL.z;
      const l = Math.hypot(ax, az);
      if (l < 0.5) {
        ax = 0;
        az = -1;
      } else {
        ax /= l;
        az /= l;
      }
      const lp = [+(W.WELL.x + ax * 3.2).toFixed(2), 0, +(W.WELL.z + az * 3.2).toFixed(2)];
      c.set((s) => setItem(s, d.id, { s: 'floor', h: null, w: to, p: lp, via: (it.via || 0) + 1 }));
      fxBoth(c, ['well', w]);
      sayPair(c, who, TXT.sent, TXT.got);
    }
    if (d.a === 'place') {
      const sl = SLOTS[d.slot];
      if (!sl || sl.w !== w) return;
      const sp = sl.p();
      if (Math.hypot(q.x - sp[0], q.z - sp[2]) > 2.6) return;
      if (x.slots[d.slot]) return sayTo(c, who, TXT.plateWrong);
      const place = (extra) => {
        c.set((s) => {
          setItem(s, d.id, { s: 'slot', h: null, w, slot: d.slot, p: [sp[0], sp[1] + 0.06, sp[2]] });
          s.x.slots = { ...s.x.slots, [d.slot]: d.id };
          if (extra) extra(s);
        });
        fxBoth(c, ['place', w, sp[0], sp[1] + 0.5, sp[2]]);
      };
      if (d.slot === 'slotl' || d.slot === 'slotr') {
        if (d.id === 'weight') return sayTo(c, who, TXT.slotWrong);
        const ok = (d.id === 'key') === (d.slot === x.keySlot);
        if (!ok) {
          fxBoth(c, ['deny']);
          return sayTo(c, who, TXT.slotWrong);
        }
        const otherSlot = d.slot === 'slotl' ? 'slotr' : 'slotl';
        const full = !!x.slots[otherSlot];
        place((s) => {
          if (full) s.x.doorU = 1;
        });
        if (full) {
          fxBoth(c, ['door', 'U', 0, 2, W.S2.doorZ]);
          sayBoth(c, TXT.doorU);
        } else sayBoth(c, TXT.slotOk);
      }
      if (d.slot === 'cagep') {
        if (d.id !== 'cube') {
          fxBoth(c, ['deny']);
          return sayTo(c, who, TXT.plateWrong);
        }
        const first = !x.cage;
        place((s) => (s.x.cage = 1));
        if (first) {
          fxBoth(c, ['cage', 'L', W.S2.cage[0], 1.5, W.S2.cage[1]]);
          sayPair(c, who, TXT.cage, TXT.cageMate);
        }
      }
      if (d.slot === 'bal') {
        if (d.id !== 'weight') {
          fxBoth(c, ['deny']);
          return sayTo(c, who, TXT.balLight);
        }
        place((s) => (s.x.doorL = 1));
        fxBoth(c, ['door', 'L', 0, 2, W.S2.doorZ]);
        sayBoth(c, TXT.doorL);
      }
    }
  };

  // ---------- section 4: the Reflet (simulated by the host) ----------
  // it rises out of the mirror in the middle of the arena (st 6), then starts to imitate
  const bossInit = () => ({ x: 0, y: -3.2, z: W.ARENA.z + 2, yaw: Math.PI, st: 6, t: 0, atkT: 2.6, hist: [], clock: 0 });
  const phaseOf = (hp) => (hp > 5 ? 1 : hp > 2 ? 2 : 3);
  const attack = (c, d) => {
    W.tele(d);
    local.atks.push({ d, t: 0, done: false });
    fx(c, ['tele', d.w]);
  };
  const attackBoth = (c, d) => {
    attack(c, d);
    c.send('c6a', d);
  };
  const bossHost = (c, dt) => {
    const x = c.S.x;
    if (!x.fight || x.won) return;
    const B = local.B || (local.B = bossInit());
    B.clock += dt;
    B.t += dt;
    const lure = ['dame', 'valet'].find((k) => W.worldOf(c.pos(k)) === x.bw);
    const striker = mateKit(lure || 'dame');
    const ph = phaseOf(x.hp);
    if (lure) {
      const lq = W.rel(c.pos(lure));
      B.hist.push([B.clock, lq.x, lq.y, lq.z]);
      while (B.hist.length > 2 && B.hist[1][0] < B.clock - 3) B.hist.shift();
    }
    const delay = ph === 3 ? 0.75 : 1.0;
    const tgt = B.hist.find((h) => h[0] >= B.clock - delay) || B.hist[B.hist.length - 1];
    const C = W.ARENA;
    if (B.st === 0 && tgt) {
      // it walks where the lure was a moment ago, and copies its jumps
      const dx = tgt[1] - B.x;
      const dz = tgt[3] - B.z;
      const d = Math.hypot(dx, dz);
      const sp = ph === 3 ? 7.4 : ph === 2 ? 6.4 : 5.6;
      if (d > 0.6) {
        const k = Math.min(d, sp * dt) / d;
        B.x += dx * k;
        B.z += dz * k;
        B.yaw = Math.atan2(dx, dz);
      }
      B.y = damp(B.y, clamp(tgt[2], 0, 4), 12, dt);
      const r = Math.hypot(B.x, B.z - C.z);
      if (r > C.move) {
        B.x *= C.move / r;
        B.z = C.z + (B.z - C.z) * (C.move / r);
      }
      B.atkT -= dt;
      if (B.atkT <= 0 && lure) {
        B.y = 0;
        const lq = W.rel(c.pos(lure));
        const sq = W.rel(c.pos(striker));
        const roll = Math.random();
        const ang = Math.atan2(lq.x - B.x, lq.z - B.z);
        const sl = ph === 3 ? 0.85 : 1;
        let main;
        if (ph >= 2 && roll < 0.3) main = 'r';
        else if (roll < (ph >= 2 ? 0.65 : 0.5)) main = 'l';
        else main = 'c';
        B.yaw = ang;
        if (main === 'c') {
          const dur = 1.35 * sl;
          attackBoth(c, { k: 'c', w: x.bw, x: +lq.x.toFixed(2), z: +lq.z.toFixed(2), r: 2.2, dur });
          for (let i = 0; i < (ph === 1 ? 2 : 3); i++) {
            const a = Math.random() * Math.PI * 2;
            const rr = 3 + Math.random() * 2.5;
            attackBoth(c, { k: 'c', w: x.bw, x: +(lq.x + Math.sin(a) * rr).toFixed(2), z: +(lq.z + Math.cos(a) * rr).toFixed(2), r: 1.9, dur: dur + 0.15 * (i + 1) });
          }
          B.dur = dur + 0.6;
        } else if (main === 'l') {
          const dur = 1.15 * sl;
          attackBoth(c, { k: 'l', w: x.bw, x: +B.x.toFixed(2), z: +B.z.toFixed(2), a: +ang.toFixed(3), len: 26, wd: 2.2, dur });
          if (ph >= 2) attackBoth(c, { k: 'l', w: x.bw, x: +B.x.toFixed(2), z: +B.z.toFixed(2), a: +(ang + (Math.random() < 0.5 ? 0.6 : -0.6)).toFixed(3), len: 26, wd: 2.2, dur: dur + 0.35 });
          B.dur = dur + 0.4;
        } else {
          const dur = 1.0 * sl;
          attackBoth(c, { k: 'r', w: x.bw, x: +B.x.toFixed(2), z: +B.z.toFixed(2), dur });
          B.dur = dur + 0.3;
        }
        // from the second phase on, shards climb out of the mirror under the striker too
        if (ph >= 2) attackBoth(c, { k: 'c', w: W.other(x.bw), x: +sq.x.toFixed(2), z: +sq.z.toFixed(2), r: ph === 3 ? 1.9 : 1.6, dur: ph === 3 ? 1.4 : 1.6 });
        B.st = 1;
        B.t = 0;
      }
    } else if (B.st === 1) {
      if (B.t >= B.dur) {
        B.st = 2;
        B.t = 0;
        B.exp = ph === 3 ? 2.4 : ph === 2 ? 2.7 : 3.0;
      }
    } else if (B.st === 2) {
      if (B.t >= B.exp) {
        B.st = 0;
        B.t = 0;
        B.atkT = ph === 3 ? 1.3 : ph === 2 ? 1.8 : 2.3;
      }
    } else if (B.st === 3) {
      // diving through the mirror
      B.y = (Math.min(1, B.t / 0.8)) * W.MY;
      if (B.t >= 0.8) {
        c.set((s) => (s.x.bw = W.other(s.x.bw)));
        B.y = 0;
        B.st = 5;
        B.t = 0;
        B.hist.length = 0;
      }
    } else if (B.st === 6) {
      const k = Math.min(1, B.t / 2.4);
      B.y = -3.2 * (1 - k) * (1 - k);
      B.yaw += dt * 2.5 * (1 - k);
      if (k >= 1) {
        B.y = 0;
        B.st = 0;
        B.t = 0;
      }
    } else if (B.st === 5) {
      if (B.t >= 0.7) {
        B.st = 0;
        B.t = 0;
        B.atkT = 2.2;
      }
    }
    local.bossSent += dt;
    if (local.bossSent > 0.066) {
      local.bossSent = 0;
      const d = [+B.x.toFixed(2), +B.y.toFixed(2), +B.z.toFixed(2), +B.yaw.toFixed(2), B.st, c.S.x.bw === 'U' ? 0 : 1];
      local.bossNet = d;
      c.send('c6b', d);
    }
  };
  const strikeHost = (c, who) => {
    const x = c.S.x;
    const B = local.B;
    if (!x.fight || x.won || !B) return;
    const p = c.pos(who);
    if (W.worldOf(p) === x.bw) return;
    const q = W.rel(p);
    const d = Math.hypot(q.x - B.x, q.z - B.z);
    if (B.st !== 2 || d > 2.9) return;
    const hp = x.hp - 1;
    fxBoth(c, ['strike', W.worldOf(p), q.x, 0.2, q.z]);
    if (hp <= 0) {
      B.st = 4;
      c.set((s) => {
        s.x.hp = 0;
        s.x.won = true;
      });
      fxBoth(c, ['win', x.bw, B.x, 0, B.z]);
      sayBoth(c, TXT.win);
      local.winT = 0;
      return;
    }
    c.set((s) => (s.x.hp = hp));
    if (hp === 6 || hp === 4 || hp === 2) {
      B.st = 3;
      B.t = 0;
      fxBoth(c, ['cross', x.bw, B.x, 0, B.z]);
      sayBoth(c, TXT.cross, TXT.cross, 3000);
    } else {
      sayBoth(c, TXT.struck);
      B.st = 0;
      B.t = 0;
      B.atkT = 1.4;
    }
  };
  // damage checks: each screen checks what aims at its own player
  const atkTick = (c, dt) => {
    const me = myW();
    const q = W.rel(Player.body.p, tmp);
    local.hitT = Math.max(0, local.hitT - dt);
    for (let i = local.atks.length - 1; i >= 0; i--) {
      const A = local.atks[i];
      A.t += dt;
      const d = A.d;
      if (A.t > d.dur + 2.6) {
        local.atks.splice(i, 1);
        continue;
      }
      if (A.t >= d.dur && !A.boom) {
        A.boom = true;
        if (d.k === 'c') fx(c, ['impact', d.w, d.x, 0, d.z]);
        if (d.k === 'l') fx(c, ['impact', d.w, d.x + Math.sin(d.a) * 6, 0, d.z + Math.cos(d.a) * 6]);
      }
      if (d.w !== me || A.done || local.trans) continue;
      let hit = false;
      if (d.k === 'c' && A.t >= d.dur && A.t < d.dur + 0.25) hit = Math.hypot(q.x - d.x, q.z - d.z) < d.r + 0.2 && q.y < 1.4;
      if (d.k === 'l' && A.t >= d.dur && A.t < d.dur + 0.2) {
        const dx = q.x - d.x;
        const dz = q.z - d.z;
        const along = dx * Math.sin(d.a) + dz * Math.cos(d.a);
        const perp = Math.abs(dx * Math.cos(d.a) - dz * Math.sin(d.a));
        hit = along > -0.5 && along < d.len && perp < d.wd / 2 + 0.25 && q.y < 1.6;
      }
      if (d.k === 'r' && A.t >= d.dur) {
        const rr = W.ringR(A.t, d);
        hit = Math.abs(Math.hypot(q.x - d.x, q.z - d.z) - rr) < 0.55 && q.y < 0.7;
      }
      if (hit) {
        A.done = true;
        hitMe(c, d);
      }
    }
  };
  const hitMe = (c, d) => {
    if (local.hitT > 0) return;
    local.hitT = 1.3;
    const q = W.rel(Player.body.p);
    let dx = q.x - d.x;
    let dz = q.z - d.z;
    if (d.k === 'l') {
      const s = Math.sign(dx * Math.cos(d.a) - dz * Math.sin(d.a)) || 1;
      dx = Math.cos(d.a) * s;
      dz = -Math.sin(d.a) * s;
    }
    const l = Math.hypot(dx, dz) || 1;
    Player.body.v.set((dx / l) * 8, 6.5, (dz / l) * 8);
    Cam.shake = Math.max(Cam.shake, 0.45);
    HUD.hurt();
    HUD.say(TXT.hit, T.master, 1800);
    c.send('c6say', [TXT.hitMate, 1800]);
    fxBoth(c, ['hit', myW(), q.x, 1, q.z]);
  };

  // ---------- host ----------
  const sendTimer = (c, data) => {
    local.hud.tp = null;
    c.send('c6w', data);
    onTimer(c, data);
  };
  const onTimer = (c, d) => {
    if (d[0] === 'inv') local.hud.inv = d[2] >= 0 ? { k: d[1], left: d[2] } : null;
    if (d[0] === 'tp') local.hud.tp = d[2] >= 0 ? { k: d[1], left: d[2], by: d[3] } : null;
    if (d[0] === 'w4') local.hud.warn4 = d[1];
  };
  const hostTick = (c, dt) => {
    const x = c.S.x;
    const pd = c.pos('dame');
    const pv = c.pos('valet');
    const Q = { dame: W.rel(pd), valet: W.rel(pv) };
    const Wk = { dame: W.worldOf(pd), valet: W.worldOf(pv) };
    const dz = Math.abs(Q.dame.z - Q.valet.z);
    const inA = (q) => Math.abs(q.x) < 70 && q.z > -40 && q.z < 340;
    local.clear = Wk.dame === Wk.valet || dz <= 16 || !inA(Q.dame) || !inA(Q.valet);
    const both = (f) => f(Q.dame, Wk.dame, 'dame') && f(Q.valet, Wk.valet, 'valet');

    // ----- stage 1 -----
    if (x.stage === 1) {
      const onMark = (q) => near2(q, W.MARK4[0], W.MARK4[1], 1.2) && q.y > -0.3 && q.y < 0.8;
      if (!x.b4) {
        local.warn4 = 0;
        if (onMark(Q.dame) && onMark(Q.valet)) {
          c.set((s) => (s.x.b4 = 1));
          sayBoth(c, TXT.b4on);
          fxBoth(c, ['bridge4']);
        }
      } else if (Q.dame.z < 84.6 || Q.valet.z < 84.6) {
        const onBr = (q) => q.z > 71.6 && q.z < 84.6 && q.y > -1;
        if ((onBr(Q.dame) || onBr(Q.valet)) && dz > 3.2) {
          if (local.warn4 === 0) sayBoth(c, TXT.b4warn, TXT.b4warn, 1200);
          local.warn4 += dt;
        } else local.warn4 = Math.max(0, local.warn4 - dt * 2);
        if (local.warn4 > 1.15) {
          local.warn4 = 0;
          c.set((s) => (s.x.b4 = 0));
          sayBoth(c, TXT.b4break);
          fxBoth(c, ['break4']);
          // whoever is already across comes back to the marks
          ['dame', 'valet'].forEach((k) => {
            if (Q[k].z >= 84.6) {
              if (k === c.role) back4(c);
              else c.send('c6back', 1);
            }
          });
        }
        local.warnSent += dt;
        if (local.warnSent > 0.1) {
          local.warnSent = 0;
          sendTimer(c, ['w4', +Math.min(1, local.warn4 / 1.15).toFixed(2)]);
        }
      }
      if (both((q) => q.z > 86.5 && q.y > -0.4)) c.set((s) => (s.x.stage = 2));
    }
    // ----- stage 2 -----
    if (x.stage === 2 && x.doorU && x.doorL && both((q) => q.z > 150 && q.y > -0.4)) c.set((s) => (s.x.stage = 3));
    // ----- stage 3 -----
    if (x.stage === 3) {
      // inversions
      if (x.sw < 2) {
        const z = W.INV[x.sw];
        const inC = (q) => near2(q, 0, z, W.INV_R) && q.y > -0.3 && q.y < 1.2;
        if (both(inC) && Wk.dame !== Wk.valet) {
          local.invIn += dt;
          if (local.invIn > 0.4 && local.invCd == null) {
            local.invCd = 3;
            sayBoth(c, TXT.invGo, TXT.invGo, 1400);
          }
        } else {
          local.invIn = 0;
          if (local.invCd != null) {
            local.invCd = null;
            sayBoth(c, TXT.invStop);
            sendTimer(c, ['inv', x.sw, -1]);
          }
        }
        if (local.invCd != null) {
          const before = Math.ceil(local.invCd);
          local.invCd -= dt;
          if (Math.ceil(local.invCd) !== before && local.invCd > 0) fxBoth(c, ['tick', null, 1]);
          local.invSent += dt;
          if (local.invSent > 0.1) {
            local.invSent = 0;
            sendTimer(c, ['inv', x.sw, +Math.max(0, local.invCd).toFixed(2)]);
          }
          if (local.invCd <= 0) {
            local.invCd = null;
            local.invIn = -2;
            sendTimer(c, ['inv', x.sw, -1]);
            c.set((s) => (s.x.sw += 1));
            sayBoth(c, TXT.swap, TXT.swap, 3000);
          }
        }
      }
      // the hold plate of day keeps the bridge of night
      if (x.sw === 1) {
        const onHold = ['dame', 'valet'].some((k) => Wk[k] === 'U' && (near2(Q[k], W.HOLD[0], W.HOLD[1], 0.95) || near2(Q[k], W.HOLD2[0], W.HOLD2[1], 0.95)) && Q[k].y < 0.6 && Q[k].y > -0.3);
        if (onHold) local.holdT = 0.7;
        else local.holdT -= dt;
        const want = local.holdT > 0 ? 1 : 0;
        if (want !== (x.hold ? 1 : 0)) {
          c.set((s) => (s.x.hold = want));
          fxBoth(c, [want ? 'bridge' : 'unbridge', 'L', 0, 0, 181]);
          if (!want) {
            const who = ['dame', 'valet'].find((k) => Wk[k] === 'L');
            if (who && Q[who].z < 190) sayTo(c, who, TXT.holdOff);
          }
        }
        // the twin dials
        if (x.gt < 3) {
          const tw = W.TWIN[x.gt];
          ['dame', 'valet'].forEach((k) => {
            const pp = tw[Wk[k]];
            const on = near2(Q[k], pp[0], pp[2], 0.75) && Math.abs(Q[k].y - pp[1]) < 0.4;
            if (on && !local.onPrev[k]) {
              if (!local.win) {
                local.win = { k: x.gt, left: tw.win, by: k };
                sayPair(c, k, TXT.tpMine, TXT.tpOpen);
                fxBoth(c, ['tick', null, 2]);
              } else if (local.win.by !== k) {
                local.win = null;
                c.set((s) => (s.x.gt += 1));
                sayBoth(c, TXT.tpWin);
                fxBoth(c, ['gate', 'U', 0, 1.5, tw.gate]);
                sendTimer(c, ['tp', x.gt, -1]);
              }
            }
            local.onPrev[k] = on;
          });
          if (local.win) {
            const before = Math.ceil(local.win.left);
            local.win.left -= dt;
            if (Math.ceil(local.win.left) !== before && local.win.left > 0) fxBoth(c, ['tick', null, 1]);
            local.winSent += dt;
            if (local.winSent > 0.1) {
              local.winSent = 0;
              sendTimer(c, ['tp', local.win.k, +Math.max(0, local.win.left).toFixed(2), local.win.by]);
            }
            if (local.win.left <= 0) {
              sendTimer(c, ['tp', local.win.k, -1]);
              local.win = null;
              sayBoth(c, TXT.tpLate);
              fxBoth(c, ['deny']);
            }
          }
        }
      }
      if (x.sw >= 2 && both((q) => q.z > 248 && q.y > -0.4)) c.set((s) => (s.x.stage = 4));
    }
    // ----- stage 4 -----
    if (x.stage === 4) {
      if (!x.fight && both((q, w) => Math.hypot(q.x, q.z - W.ARENA.z) < W.ARENA.fight && q.y > -0.4) && Wk.dame !== Wk.valet) {
        local.B = bossInit();
        local.atks.length = 0;
        c.set((s) => {
          s.x.fight = true;
          s.x.hp = BOSS_HP;
          s.x.bw = 'U';
        });
        sayBoth(c, TXT.bossIntro, TXT.bossIntro, 4200);
        fxBoth(c, ['rise', 'U', 0, 0, W.ARENA.z + 2]);
      }
      bossHost(c, dt);
      if (x.won) {
        local.winT += dt;
        if (local.winT > 2.2) {
          c.set((s) => (s.x.stage = 5));
          sayBoth(c, TXT.reunite, TXT.reunite, 3200);
          fxBoth(c, ['reunite']);
        }
      }
    }
    // ----- stage 5 -----
    if (x.stage === 5) {
      const atC = (q, w) => w === 'U' && Math.hypot(q.x, q.z - W.ARENA.z) < 3.4;
      if (local.bloom > 3.5 && both(atC)) c.goto('reward', (s) => (s.x.card = 'c6'));
    }
  };
  const back4 = (c) => {
    local.sub1 = 'a3';
    const p = W.spawn(sideOf(c.S.x, c.role), 'a3', c.role);
    c.spawn(p, 0);
  };

  // ---------- my hands: what E does here ----------
  const interact = (c, x, w, q) => {
    // levers
    if (x.stage === 1) {
      const lv = W.leverNear(w, q);
      if (lv) {
        let label = 'Actionner le levier';
        if (lv.kind === 'c1') label = 'Levier · la passerelle de {mate}';
        if (lv.kind === 'c2') label = x.b2 === w ? 'Levier · envoyer la passerelle à {mate}' : 'Levier (la passerelle est chez {mate})';
        if (lv.kind === 'c3') label = 'Levier · échanger les demi-passerelles';
        if (Input.pressed('interact')) c.act({ a: 'lever', id: lv.id });
        return ['E', label];
      }
    }
    if (x.stage === 2) {
      const mine = heldBy(x, c.role);
      if (mine) {
        const sl = nearSlot(w, q);
        if (sl) {
          if (Input.pressed('interact')) c.act({ a: 'place', id: mine, slot: sl });
          return ['E', sl === 'bal' ? 'Poser sur la balance' : sl === 'cagep' ? 'Poser sur la dalle' : 'Poser sur le socle'];
        }
        if (nearWell(q)) {
          if (Input.pressed('interact')) c.act({ a: 'well', id: mine });
          return ['E', 'Jeter ' + TXT.names[mine] + ' dans le miroir'];
        }
        if (Input.pressed('interact')) {
          const f = V3(Math.sin(Player.yaw), 0, Math.cos(Player.yaw));
          const dp = q.clone().addScaledVector(f, 0.9);
          const gy = Phys.groundAt(W.AN[w].x + dp.x, Player.body.p.y + 0.5, W.AN[w].z + dp.z);
          const y = gy > -50 ? gy - W.AN[w].y : 0;
          c.act({ a: 'drop', id: mine, p: [+dp.x.toFixed(2), +Math.max(0, y).toFixed(2), +dp.z.toFixed(2)] });
        }
        return ['E', 'Poser ' + TXT.names[mine]];
      }
      const it = nearItem(x, w, q);
      if (it) {
        if (Input.pressed('interact')) c.act({ a: 'pick', id: it });
        return ['E', 'Prendre ' + TXT.names[it]];
      }
    }
    if (x.stage === 4 && x.fight && !x.won) {
      const b = local.bossNet;
      if (b && (b[5] ? 'L' : 'U') !== w) {
        const d = Math.hypot(q.x - b[0], q.z - b[2]);
        const press = Input.pressed('interact') || Input.pressed('attack');
        if (press) {
          local.punch = 0.3;
          if (b[4] === 2 && d < 2.4) {
            c.act({ a: 'strike' });
          } else {
            fxBoth(c, ['miss', w, q.x, 0.1, q.z]);
            if (!(local.lastSay.miss > 0)) {
              local.lastSay.miss = 3;
              HUD.say(b[4] === 2 ? TXT.far : TXT.early, T.master, 1600);
            }
          }
        }
        if (b[4] === 2 && d < 2.4) return ['E', 'Frapper le miroir'];
      }
    }
    return null;
  };

  // ---------- register ----------
  Story.register('tr_c6', {
    init: (s) => ({
      stage: 1,
      sw: 0,
      b1U: 0,
      b1L: 0,
      b2: 'U',
      b3: 0,
      b4: 0,
      lv: {},
      items: ITEM0(),
      slots: { slotl: null, slotr: null, cagep: null, bal: null },
      keySlot: (s && s.seed ? s.seed : (Math.random() * 1e9) | 0) % 2 ? 'slotl' : 'slotr',
      cage: 0,
      doorU: 0,
      doorL: 0,
      hold: 0,
      gt: 0,
      fight: false,
      hp: BOSS_HP,
      bw: 'U',
      won: false,
    }),
    voice: () => 1,
    farCall: true,
    partner: () => !!(W.built && W.worldOf(Remote.pos) === W.worldOf(Player.body.p)),
    hideRemote: () => !!(W.built && W.worldOf(Remote.pos) !== W.worldOf(Player.body.p)),
    net: {
      c6say: (c, d) => HUD.say(d[0], T.master, d[1] || 2400),
      c6fx: (c, d) => fx(c, d),
      c6w: (c, d) => onTimer(c, d),
      c6a: (c, d) => attack(c, d),
      c6b: (c, d) => {
        if (!Net.isHost) local.bossNet = d;
      },
      c6back: (c) => back4(c),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.makeGhost(T.players[Story.mate].look);
      local.stage = 0;
      local.sub1 = 'a0';
      local.sub3 = 'c0';
      local.trans = null;
      local.atks.length = 0;
      local.B = null;
      local.bossNet = null;
      local.bloom = 0;
      local.hud = { inv: null, tp: null, warn4: 0 };
      local.myWorld = null;
      const x = c.S.x;
      if (x.stage >= 4 && x.fight && !x.won) local.B = bossInit();
      c.spawn(respawnPos(c), 0);
      Player.killY = W.O.y - 1.7;
      Player.checkpoint = () => {
        onFall(c);
        return respawnPos(c);
      };
      Player.targets = () => {
        const xx = Story.S && Story.S.x;
        if (!xx || xx.stage !== 3 || xx.sw !== 1 || c.role !== 'dame') return [];
        if (myW() !== 'U') return [];
        return [W.P('U', ...W.RING.pos)];
      };
      Player.grappleLand = () => W.P('U', ...W.RING.land);
      local.env = {
        hemi: R.hemi.intensity,
        hc: R.hemi.color.clone(),
        hg: R.hemi.groundColor.clone(),
        moon: R.moon.intensity,
        mc: R.moon.color.clone(),
        fog: R.FOG.clone(),
        dens: R.scene.fog.density,
      };
      lightTick(0, sideOf(x, c.role), true);
      City.mood({});
      Sound.mood(x.stage >= 5 ? 'gold' : x.stage === 4 ? 'tense' : 'calm');
      W.Syn.ambient(true);
      HUD.visa('♣ 6 · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (x.stage === 1 && local.sub1 === 'a0') {
        HUD.say(TXT.intro, T.master, 3600);
        HUD.say(TXT.rule, T.master, 5200);
        HUD.say(TXT.side[sideOf(x, c.role)], T.master, 4600);
        HUD.say(TXT.together, T.master, 3600);
      }
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      Player.punch = 0;
      if (Player.mode === 'frozen') Player.mode = 'walk';
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.hemi.color.copy(local.env.hc);
        R.hemi.groundColor.copy(local.env.hg);
        R.moon.intensity = local.env.moon;
        R.moon.color.copy(local.env.mc);
        R.FOG.copy(local.env.fog);
        R.scene.fog.density = local.env.dens;
      }
      flash(0);
      HUD.boss(null);
      W.hide();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      applyWorld(c);
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (prev && x.stage > prev && x.stage < 4) {
          Sound.play('chime');
          W.Syn.play('bridge');
        }
        if (x.stage === 4) Sound.mood('tense');
        if (x.stage === 5) {
          Sound.mood('gold');
          City.mood({ gold: 0.5 });
          HUD.boss(null);
        }
      }
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      hostTick(c, dt);
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'lever') {
        const lv = W.levers[d.id];
        if (!lv || x.stage !== 1) return;
        const p = c.pos(who);
        if (W.worldOf(p) !== lv.w) return;
        const q = W.rel(p);
        if (Math.hypot(q.x - lv.x, q.z - lv.z) > 2.8) return;
        if (!local.clear) {
          fxBoth(c, ['trouble']);
          return sayTo(c, who, TXT.trouble);
        }
        const bump = (s) => (s.x.lv = { ...s.x.lv, [lv.id]: (s.x.lv[lv.id] || 0) + 1 });
        if (lv.kind === 'c1') {
          const id = lv.w === 'U' ? 'b1L' : 'b1U';
          if (x[id]) return sayTo(c, who, TXT.c1done);
          c.set((s) => {
            s.x[id] = 1;
            bump(s);
          });
          fxBoth(c, ['lever', lv.w, lv.x, 1, lv.z]);
          fxBoth(c, ['bridge', W.other(lv.w), 0, 0, 16]);
          sayPair(c, who, TXT.c1me, TXT.c1mate);
        }
        if (lv.kind === 'c2') {
          if (x.b2 !== lv.w) {
            fxBoth(c, ['deny']);
            return sayTo(c, who, TXT.c2not);
          }
          c.set((s) => {
            s.x.b2 = W.other(lv.w);
            bump(s);
          });
          fxBoth(c, ['lever', lv.w, lv.x, 1, lv.z]);
          fxBoth(c, ['unbridge', lv.w, 0, 0, 36]);
          fxBoth(c, ['bridge', W.other(lv.w), 0, 0, 36]);
          sayPair(c, who, TXT.c2me, TXT.c2mate);
        }
        if (lv.kind === 'c3') {
          c.set((s) => {
            s.x.b3 = 1 - s.x.b3;
            bump(s);
          });
          fxBoth(c, ['lever', lv.w, lv.x, 1, lv.z]);
          fxBoth(c, ['bridge', 'U', 0, 0, 56]);
          fxBoth(c, ['bridge', 'L', 0, 0, 56]);
          sayBoth(c, TXT.c3);
        }
      }
      if (d.a === 'pick' || d.a === 'drop' || d.a === 'well' || d.a === 'place') itemAction(c, who, d);
      if (d.a === 'strike') strikeHost(c, who);
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const w = myW();
      const q = W.rel(p);
      // my world: light, sound
      if (local.myWorld !== w) {
        local.myWorld = w;
        W.Syn.mood(w === 'U' ? 1 : 0);
      }
      lightTick(dt, w, false);
      // an inversion (or the reunion) moves me to my new world
      const want = sideOf(x, r);
      if (!local.trans && want !== w && Player.mode !== 'frozen') startTrans(c, want);
      tickTrans(c, dt);
      if (!local.trans) trackSub(c, q);
      // decay
      local.punch = Math.max(0, local.punch - dt);
      Player.punch = local.punch;
      Object.keys(local.lastSay).forEach((k) => (local.lastSay[k] -= dt));
      atkTick(c, dt);
      // the mirror troubles when you drift apart
      const rp = Remote.pos;
      const mw = W.worldOf(rp);
      const mq = W.rel(rp);
      const inArea = Math.abs(mq.x) < 70 && mq.z > -40 && mq.z < 340;
      const apart = Remote.has && inArea && mw !== w;
      const dz = apart ? Math.abs(mq.z - q.z) : 0;
      local.trouble = x.stage <= 3 && apart ? clamp((dz - 13) / 3, 0, 1) : 0;
      if (local.trouble >= 1 && !(local.lastSay.trouble > 0) && x.stage <= 3) {
        local.lastSay.trouble = 14;
        HUD.say(TXT.trouble, T.master, 2600);
        W.Syn.play('trouble');
      }
      if (x.stage === 5) local.bloom += dt;

      // ---------- prompt ----------
      let prompt = local.trans ? null : interact(c, x, w, q);

      // ---------- what the world draws ----------
      const plates = {};
      const rings = {};
      const near = (pw, px, py, pz, rr) => (w === pw && near2(q, px, pz, rr) && Math.abs(q.y - py) < 0.6) || (Remote.has && mw === pw && near2(mq, px, pz, rr) && Math.abs(mq.y - py) < 0.6);
      ['U', 'L'].forEach((pw) => (plates['m4' + pw] = near(pw, W.MARK4[0], 0, W.MARK4[1], 1.2) || !!x.b4));
      W.INV.forEach((z, i) => ['U', 'L'].forEach((pw) => (plates['inv' + i + pw] = near(pw, 0, 0, z, W.INV_R))));
      plates.hold = near('U', W.HOLD[0], 0, W.HOLD[1], 0.95) || !!x.hold;
      plates.hold2 = near('U', W.HOLD2[0], 0, W.HOLD2[1], 0.95) || !!x.hold;
      W.TWIN.forEach((tw, k) =>
        ['U', 'L'].forEach((pw) => {
          const [px, py, pz] = tw[pw];
          plates['tw' + k + pw] = x.gt > k || near(pw, px, py, pz, 0.75);
        }),
      );
      plates.slotl = !!x.slots.slotl;
      plates.slotr = !!x.slots.slotr;
      plates.cagep = !!x.slots.cagep;
      plates.bal = !!x.slots.bal;
      let count = null;
      const H = local.hud;
      if (H.inv && x.stage === 3) {
        const z = W.INV[H.inv.k];
        const fr = H.inv.left / 3;
        rings['inv' + H.inv.k + 'U'] = fr;
        rings['inv' + H.inv.k + 'L'] = fr;
        count = [String(Math.max(1, Math.ceil(H.inv.left))), '#ff7ab0', [['U', 0, 2.8, z], ['L', 0, 2.8, z]]];
      }
      if (H.tp && x.stage === 3 && x.gt === H.tp.k) {
        const tw = W.TWIN[H.tp.k];
        const fr = H.tp.left / tw.win;
        rings['tw' + H.tp.k + 'U'] = fr;
        rings['tw' + H.tp.k + 'L'] = fr;
        const txt = H.tp.left < 2 ? H.tp.left.toFixed(1).replace('.', ',') : String(Math.ceil(H.tp.left));
        count = [txt, '#ffcf8a', [['U', tw.U[0], tw.U[1] + 2.6, tw.U[2]], ['L', tw.L[0], tw.L[1] + 2.6, tw.L[2]]]];
      }
      // bridge of reflections trembling
      ['b4U', 'b4L'].forEach((id) => (W.bridges[id].warn = x.stage === 1 && x.b4 ? H.warn4 : 0));
      // boss
      let boss = null;
      if (x.stage === 4 && x.fight) {
        const b = Net.isHost && local.B ? [local.B.x, local.B.y, local.B.z, local.B.yaw, local.B.st, x.bw === 'U' ? 0 : 1] : local.bossNet;
        if (Net.isHost) local.bossNet = b;
        if (b) boss = { on: !x.won || b[4] !== 4, x: b[0], y: b[1], z: b[2], yaw: b[3], st: b[4], w: b[5] ? 'L' : 'U' };
        if (x.won) boss = null;
        const striker = !x.won && sideOf(x, r) !== x.bw;
        HUD.boss('Le Reflet', x.hp / BOSS_HP, x.won ? '' : striker ? 'Frappe-le depuis l’autre monde' : 'Attire-le vers ' + Story.name(mateKit(r)));
      }
      W.update(dt, t, {
        me: w,
        role: r,
        stage: x.stage,
        items: x.stage === 2 ? x.items : null,
        lv: x.lv,
        matePos: rp,
        mateHas: Remote.has,
        mateState: Remote.state,
        same: mw === w,
        trouble: Math.max(local.trouble, local.trans ? 0.6 : 0),
        reunited: x.stage >= 5,
        plates,
        rings,
        count,
        glyphs: r === 'dame' && x.stage === 2 && !x.doorU && x.cage ? (x.keySlot === 'slotl' ? 'l' : 'r') : null,
        wellHot: x.stage === 2 && heldBy(x, r) && nearWell(q) ? 1 : 0,
        boss,
        striker: x.stage === 4 && x.fight && sideOf(x, r) !== x.bw,
        cardOn: x.stage >= 5,
        cardK: Math.min(1, local.bloom / 3),
      });
      // the objective, refreshed
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      if (x.stage === 5) return null;
      return prompt;
    },
  });

  // the partner's call: a beam through the mirror, under their feet
  Net.on('call', (p) => {
    if (!Story.S || Story.S.phase !== 'tr_c6' || !W.built) return;
    const rp = V3(p[0], p[1], p[2]);
    const w = W.worldOf(rp);
    const me = W.worldOf(Player.body.p);
    if (w === me) return;
    const q = W.rel(rp);
    W.callAt(w, me, q.x, q.z);
  });
})();
