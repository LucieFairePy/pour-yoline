// ♠ 10 · La Soucoupe (épreuve ufo): the boss at the end of world 2. Kits as usual: Yoline the dame
// kit (grapple, rifle), William the valet kit (carry, sword, veil). The saucer's shield cannot be
// broken alone, and the breaker changes every phase:
//  1. Les ancres: three anchors hold the shield. The Dame kit grapples onto one and tears its core
//     out (E held); a single hit starts it over, and the shielded Gardiens that shoot at her only
//     break under the sword: the Valet kit covers her.
//  2. Les noyaux: the shield drinks through the saucer's beam. The Valet kit breaks a porter's
//     guard, takes its energy core and carries it into the beam (three to overload); the drones
//     dive at whoever carries, a hit and the core falls: the Dame kit shoots them down.
//  3. Les deux: two anchors and two cores at once, while the petals of the island fall away.
// A broken shield brings the saucer down over the heart for a few seconds: its core hangs out of
// the hatch, the rifle hits it from anywhere, the sword from underneath. A wipe restarts the phase.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('ufo');
  const T = CONFIG;
  const W = TrUfo;
  const TX = {
    card: CARD,
    title: 'La Soucoupe',
    boss: 'La Soucoupe',
    intro: 'Épreuve ' + CARD + '. La soucoupe. Tant que son bouclier tient, rien ne la touche : il faudra être deux pour le briser.',
    obj: {
      1: {
        dame: 'Trois ancres tiennent le bouclier. Une chaîne rouge les verrouille : {mate} la tranche à l’épée. Alors grappin (F) sur l’anneau, et maintiens E pour arracher le noyau. Un seul tir, et c’est à refaire.',
        valet: 'Trois ancres tiennent le bouclier. Tranche à l’épée la chaîne rouge sous une ancre (le poteau) : {mate} a quelques secondes pour arracher son noyau. Les Gardiens {le} visent : brise leur garde.',
      },
      2: {
        dame: 'Le rayon de la soucoupe est fermé par son œil : tire dedans quand il descend pour l’ouvrir. {mate} y porte les noyaux ; les sondes plongent sur {lui} : abats-les.',
        valet: 'Brise la garde d’un porteur (épée), prends son noyau (E) et porte-le dans le rayon, une fois que {mate} l’a ouvert au fusil. Touché, tu le lâches.',
      },
      3: {
        dame: 'Tout à la fois : deux ancres pour toi (que {mate} déverrouille), deux noyaux pour {lui} (le rayon s’ouvre à ton fusil). Les pétales tombent : restez sur le cœur.',
        valet: 'Tout à la fois : deux noyaux pour toi (le rayon s’ouvre au fusil de {mate}), deux ancres pour {lui} (tranche leurs chaînes). Les pétales tombent : restez sur le cœur.',
      },
    },
    open: {
      dame: 'Le bouclier est brisé ! Vise le cœur rose sous la soucoupe : c’est là qu’elle a mal.',
      valet: 'Le bouclier est brisé ! Cours sous la soucoupe et frappe son cœur à l’épée.',
    },
    arrive: 'Restez ensemble sur l’île. Elle descend.',
    openSay: 'Le bouclier se brise ! La soucoupe tombe sur l’île : son cœur est à découvert.',
    reform: 'Le bouclier se reforme. Encore une fois.',
    ripP: 'Arracher le noyau (maintenir)',
    locked: 'Verrouillée : {mate} doit trancher sa chaîne, au pied de l’ancre.',
    relock: 'La chaîne s’est refermée.',
    cutP: 'Trancher la chaîne (épée)',
    cutNo: 'Seule l’épée de {mate} tranche cette chaîne.',
    cutSay: 'La chaîne est tranchée : l’ancre est libre quelques secondes.',
    eyeOpen: 'L’œil est crevé : le rayon aspire. Vite, le noyau !',
    eyeShut: 'Le rayon est fermé. Son œil, sous la soucoupe, ne s’ouvre qu’au fusil.',
    ripHurt: 'Touché{e} : le noyau se rescelle. Recommence.',
    ripDone: 'Une ancre tombe dans les nuages.',
    ancLeft: (n) => (n ? 'Encore ' + n + (n > 1 ? ' ancres.' : ' ancre.') : ''),
    grab: 'Prendre le noyau',
    grabNo: 'Seul{pe} {mate} peut porter un noyau.',
    carry: 'Le noyau pèse. Porte-le dans le rayon de la soucoupe (le cercle bleu).',
    dropped: 'Touché{e} : le noyau est tombé.',
    mateDropped: '{mate} a lâché le noyau !',
    fed: (n, k) => 'La soucoupe avale le noyau. ' + (n < k ? 'Encore ' + (k - n) + '.' : 'Elle surchauffe !'),
    beam: 'Le rayon descend : il aspire tout ce qui entre dedans.',
    shieldHit: 'Le bouclier arrête tout. Il faut le briser d’abord.',
    phase: {
      2: 'Plus d’ancres : la soucoupe boit maintenant par son rayon. Gavez-la de noyaux.',
      3: 'La soucoupe hurle. Les îles tombent : deux ancres et deux noyaux, en même temps.',
    },
    sweep: 'Le rayon rouge balaie l’île : sautez par-dessus.',
    strike: 'Les cercles rouges : la frappe tombe dessus.',
    fall: 'Un pétale se détache ! Revenez sur le cœur.',
    fell: 'Tombé{e} dans les nuages.',
    wipe: 'Vous êtes tombés tous les deux. La phase reprend.',
    won: 'La soucoupe chancelle, son bouclier en morceaux… et s’enfuit.',
    cardObj: 'La carte ' + CARD + ' attend au centre de l’île. Allez-y ensemble.',
  };
  CONFIG.cards.ufo = {
    title: 'La Soucoupe',
    sub: 'Épreuve ♠ · réussie',
    lines: [
      'Un bouclier que personne ne pouvait briser seul.',
      'L’un l’arrachait, l’autre le couvrait. Puis l’inverse.',
      'Et la soucoupe a fui, le ventre ouvert.',
    ],
  };

  const BOSS_HP = 2400;
  // life at the start of each phase (a broken shield cannot take the saucer past the next one)
  const PH_HP = [0, 2400, 1600, 800, 0];
  const OPEN_T = 8.5;
  const RIP_T = 2.2;
  // seconds an anchor stays unlocked once its chain is cut; rifle hits that open the beam's eye
  const CUT_T = 9;
  const EYE = 5;
  const NEED = { 1: [3, 0], 2: [0, 3], 3: [2, 2] };
  const FALLS = [0, 2, 4];

  // ======================= shared materials =======================
  const EM = {};
  const emats = () => {
    if (EM.hull) return;
    EM.hull = CineKit2.envify(new THREE.MeshStandardMaterial({ color: '#dcdbe8', metalness: 0.62, roughness: 0.34 }), 1.1);
    EM.dark = CineKit2.envify(new THREE.MeshStandardMaterial({ color: '#4c4f66', metalness: 0.8, roughness: 0.42 }), 1.1);
    EM.cloth = new THREE.MeshStandardMaterial({ color: '#7f86b0', roughness: 0.7, metalness: 0.15, emissive: '#1a1830', emissiveIntensity: 0.4 });
    EM.void = new THREE.MeshBasicMaterial({ color: '#07040c' });
    EM.cyan = LvKit.glow('#7ce0ff', 2.2);
    EM.pink = LvKit.glow('#ff6a96', 2.3);
    EM.core = LvKit.glow('#9ff4ff', 2.6);
    EM.shield = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7ce0ff').multiplyScalar(1.4),
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  };
  const eyeMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ce0ff').multiplyScalar(2.4), toneMapped: false });
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const dyn = (o) => {
    o.userData.dyn = true;
    return o;
  };
  // merge every static mesh under root into one mesh per material, geometry cached per model
  const BAKED = new Map();
  const bakeModel = (key, root) => {
    const found = [];
    const walk = (obj) =>
      obj.children.slice().forEach((c) => {
        if (c.userData.dyn) return;
        if (c.isMesh && !c.children.length) found.push(c);
        else if (c.children.length) walk(c);
      });
    walk(root);
    if (found.length < 2) return;
    const mats = [];
    found.forEach((c) => !mats.includes(c.material) && mats.push(c.material));
    let geos = BAKED.get(key);
    if (!geos) {
      root.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      geos = mats.map((mt) => {
        const parts = found
          .filter((c) => c.material === mt)
          .map((c) => {
            const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
            g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld));
            return g;
          });
        let n = 0;
        parts.forEach((g) => (n += g.attributes.position.count));
        const Pa = new Float32Array(n * 3);
        const Na = new Float32Array(n * 3);
        let o = 0;
        parts.forEach((g) => {
          Pa.set(g.attributes.position.array, o * 3);
          if (g.attributes.normal) Na.set(g.attributes.normal.array, o * 3);
          o += g.attributes.position.count;
          g.dispose();
        });
        const out = new THREE.BufferGeometry();
        out.setAttribute('position', new THREE.BufferAttribute(Pa, 3));
        out.setAttribute('normal', new THREE.BufferAttribute(Na, 3));
        out.computeBoundingSphere();
        return out;
      });
      BAKED.set(key, geos);
    }
    found.forEach((c) => c.parent.remove(c));
    mats.forEach((mt, i) => root.add(new THREE.Mesh(geos[i], mt)));
  };

  // the root, then every animated group inside it, each merged on its own
  const bakeTree = (key, root) => {
    bakeModel(key, root);
    const groups = [];
    root.traverse((o) => o !== root && o.userData.dyn && o.isGroup && groups.push(o));
    groups.forEach((o, i) => bakeModel(key + '/' + i, o));
  };

  // ======================= the saucer's crew: scout, guardian, probe =======================
  // A tall slender figure in a slate-blue suit, a long metal skull and one shining eye.
  const robeGeo = (() => {
    let g = null;
    return () =>
      g ||
      (g = new THREE.LatheGeometry(
        [
          [0.001, 0.0],
          [0.42, 0.02],
          [0.4, 0.3],
          [0.33, 0.7],
          [0.27, 1.0],
          [0.25, 1.22],
          [0.3, 1.36],
          [0.24, 1.48],
          [0.001, 1.5],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        20,
      ));
  })();
  const veilleur = (key, k, guardian) => () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const root = new THREE.Group();
    body.add(root);
    root.scale.setScalar(k);
    // legs under the robe: thin, bent backward
    const legs = [-0.14, 0.14].map((x) => {
      const leg = dyn(new THREE.Group());
      leg.position.set(x, 0.62, 0);
      root.add(leg);
      add(leg, new THREE.CylinderGeometry(0.05, 0.04, 0.38, 6), EM.dark, 0, -0.18, 0.04).rotation.x = 0.3;
      add(leg, new THREE.CylinderGeometry(0.04, 0.03, 0.32, 6), EM.dark, 0, -0.45, 0.02).rotation.x = -0.4;
      add(leg, new THREE.BoxGeometry(0.1, 0.04, 0.2), EM.hull, 0, -0.6, 0.06);
      return leg;
    });
    // the robe (open at the bottom), a cyan seam, armour plates for the guardian
    const robe = add(root, robeGeo(), guardian ? EM.dark : EM.cloth, 0, 0.42, 0);
    robe.scale.set(1, 0.95, 0.82);
    add(root, new THREE.TorusGeometry(0.31, 0.018, 6, 28).rotateX(Math.PI / 2), EM.cyan, 0, 1.0, 0).scale.z = 0.82;
    add(root, new THREE.TorusGeometry(0.4, 0.016, 6, 28).rotateX(Math.PI / 2), EM.cyan, 0, 0.48, 0).scale.z = 0.82;
    if (guardian) {
      add(root, new THREE.BoxGeometry(0.62, 0.36, 0.42), EM.hull, 0, 1.52, 0);
      add(root, new THREE.CylinderGeometry(0.16, 0.2, 0.14, 8), EM.hull, -0.36, 1.66, 0).rotation.z = 0.5;
      add(root, new THREE.CylinderGeometry(0.16, 0.2, 0.14, 8), EM.hull, 0.36, 1.66, 0).rotation.z = -0.5;
    }
    // the head: a long smooth skull of the saucer's metal, swept back, a dark visor band
    // across the face and one eye in it
    const head = dyn(new THREE.Group());
    head.position.y = 1.86;
    root.add(head);
    add(head, new THREE.CylinderGeometry(0.07, 0.1, 0.16, 8), EM.dark, 0, -0.1, 0);
    const skull = add(head, new THREE.SphereGeometry(0.2, 18, 12), EM.hull, 0, 0.14, -0.06);
    skull.scale.set(0.85, 1.05, 1.45);
    skull.rotation.x = 0.5;
    const visor = add(head, new THREE.SphereGeometry(0.17, 16, 8, -0.9, 1.8, 1.1, 0.75), EM.void, 0, 0.12, 0.02);
    visor.scale.set(0.98, 1, 1.12);
    add(head, new THREE.TorusGeometry(0.17, 0.012, 6, 24, Math.PI).rotateX(Math.PI / 2), EM.cyan, 0, 0.2, -0.02).rotation.z = Math.PI;
    const eye = add(head, new THREE.SphereGeometry(0.055, 12, 8), eyeMat(), 0, 0.12, 0.17);
    eye.userData.dyn = true;
    // arms: long, three-fingered, the right one holding a blade (scout) or a cannon (guardian)
    const arm = (sd) => {
      const sh = dyn(new THREE.Group());
      sh.position.set(sd * 0.27, 1.55, 0);
      root.add(sh);
      add(sh, new THREE.CylinderGeometry(0.045, 0.04, 0.5, 6), guardian ? EM.hull : EM.cloth, 0, -0.25, 0);
      const el = new THREE.Group();
      el.position.y = -0.5;
      sh.add(el);
      add(el, new THREE.CylinderGeometry(0.04, 0.03, 0.46, 6), EM.dark, 0, -0.23, 0);
      for (let f = -1; f <= 1; f++) add(el, new THREE.ConeGeometry(0.015, 0.14, 4), EM.dark, f * 0.03, -0.52, 0.02).rotation.x = Math.PI;
      return { sh, el };
    };
    const R_ = arm(1);
    const L_ = arm(-1);
    let shield = null;
    let back = null;
    if (guardian) {
      // a cannon on the right forearm
      add(R_.el, new THREE.CylinderGeometry(0.07, 0.09, 0.5, 8), EM.hull, 0, -0.42, 0.06).rotation.x = 0.2;
      add(R_.el, new THREE.TorusGeometry(0.075, 0.02, 6, 16).rotateX(Math.PI / 2), EM.pink, 0, -0.68, 0.1);
      // a hexagonal energy shield on the left arm
      shield = dyn(new THREE.Group());
      shield.position.set(-0.05, -0.35, 0.42);
      L_.el.add(shield);
      add(shield, new THREE.CircleGeometry(0.62, 6), EM.shield, 0, 0, 0).rotation.z = Math.PI / 6;
      add(shield, new THREE.TorusGeometry(0.62, 0.025, 4, 6), EM.cyan, 0, 0, 0).rotation.z = Math.PI / 6;
      // the energy core some of them carry on their back
      back = dyn(new THREE.Group());
      back.position.set(0, 1.48, -0.34);
      root.add(back);
      add(back, new THREE.IcosahedronGeometry(0.2, 1), EM.core, 0, 0, 0);
      add(back, new THREE.TorusGeometry(0.27, 0.02, 6, 20), EM.pink, 0, 0, 0);
    } else {
      // a short blade of light
      add(R_.el, new THREE.BoxGeometry(0.03, 0.62, 0.08), EM.pink, 0, -0.75, 0.05);
    }
    // the forearms keep their bend (they are merged into the upper arm)
    R_.el.rotation.x = -0.35;
    L_.el.rotation.x = guardian ? -0.9 : -0.3;
    bakeTree(key, root);
    return { g, body, eye, shield, parts: { legs, head, R: R_, L: L_, back } };
  };

  // the probe: a small saucer, one red eye underneath
  const probeModel = () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const spin = dyn(new THREE.Group());
    body.add(spin);
    const disc = new THREE.LatheGeometry(
      [
        [0.001, -0.18],
        [0.38, -0.16],
        [0.72, -0.04],
        [0.74, 0.02],
        [0.5, 0.12],
        [0.26, 0.2],
        [0.001, 0.22],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      24,
    );
    add(spin, disc, EM.hull);
    add(spin, new THREE.TorusGeometry(0.74, 0.025, 6, 32).rotateX(Math.PI / 2), EM.cyan, 0, 0, 0);
    add(spin, new THREE.SphereGeometry(0.2, 14, 8, 0, TAU, 0, Math.PI / 2), EM.shield, 0, 0.18, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      add(spin, new THREE.SphereGeometry(0.05, 6, 4), i % 2 ? EM.pink : EM.cyan, Math.cos(a) * 0.6, -0.02, Math.sin(a) * 0.6);
    }
    bakeTree('ufoProbe', spin);
    const eye = add(body, new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a5a').multiplyScalar(2.4), toneMapped: false }), 0, -0.2, 0);
    return { g, body, eye, parts: { spin } };
  };

  // ======================= net helpers =======================
  const live = () => Story.S && Story.S.phase === 'tr_ufo';
  const tel = (pos, r, t) => {
    Enemies.telegraph(pos, r, t);
    Net.send('ufoTel', [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), r, t]);
  };
  const telLine = (a, b, w, t) => {
    Enemies.telegraphLine(a, b, w, t);
    Net.send('ufoTl', [a.x, a.y, a.z, b.x, b.y, b.z, w, t].map((v) => +v.toFixed(2)));
  };
  const fx = (k, p) => {
    onFx(k, p);
    Net.send('ufoFx', [k, p ? [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)] : null]);
  };
  const knock = (who, v) => {
    if (who === Story.role) Player.body.v.set(v[0], v[1], v[2]);
    else Net.send('ufoKn', [who, ...v.map((x) => +x.toFixed(2))]);
  };
  const onFx = (k, p) => {
    if (!live()) return;
    const pos = p ? (p.isVector3 ? p : V3(p[0], p[1], p[2])) : null;
    if (k === 'land' && pos) {
      Fx.burst(pos.clone().add(V3(0, 0.3, 0)), '#9ff4ff', 26, 4, 0.5, -6);
      Sound.play('thud', pos);
    }
    if (k === 'lunge' && pos) Sound.play('punch', pos);
    if (k === 'aim' && pos) Sound.play('orb', pos);
    if (k === 'dive' && pos) Sound.play('grappleOut');
    if (k === 'break' && pos) {
      Sound.play('shieldDown');
      Fx.burst(pos.clone().add(V3(0, 1.4, 0)), '#7ce0ff', 34, 5, 0.5, -6);
    }
    if (k === 'strike' && pos) {
      W.lance(pos, W.O.y + 16);
      Sound.play('boom', pos);
      Fx.burst(pos.clone().add(V3(0, 0.2, 0)), '#ff8fb0', 40, 6, 0.5, -8);
    }
    if (k === 'rip' && pos) {
      Sound.play('shatter');
      Sound.play('boom', pos);
      Cam.shake = Math.max(Cam.shake, 0.3);
      Fx.burst(pos, '#ff6a96', 120, 9, 0.9, -6);
      Fx.burst(pos, '#7ce0ff', 60, 6, 0.7, -6);
    }
    if (k === 'feed' && pos) {
      Sound.play('launch');
      Sound.play('reveal');
      Fx.burst(pos, '#9ff4ff', 80, 6, 0.8, 6);
    }
    if (k === 'drop' && pos) {
      Sound.play('deflect');
      Fx.burst(pos.clone().add(V3(0, 0.6, 0)), '#9ff4ff', 24, 4, 0.4, -6);
    }
    if (k === 'open') {
      Sound.play('shieldDown');
      Sound.play('glitch');
      Sound.play('slam');
      Cam.shake = 0.6;
    }
    if (k === 'reform') Sound.play('dome');
    if (k === 'cut' && pos) {
      Sound.play('cut');
      Sound.play('shatter');
      Fx.burst(pos, '#ff3a4a', 50, 6, 0.6, -6);
    }
    if (k === 'eye' && pos) {
      Sound.play('glitch');
      Sound.play('reveal');
      Fx.burst(pos.clone().add(V3(0, -0.4, 0)), '#9ff4ff', 70, 7, 0.7, -4);
    }
    if (k === 'roar') {
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.35);
    }
    if (k === 'sweep') Sound.play('launch');
    if (k === 'beam') Sound.play('lift');
    if (k === 'fled') {
      Sound.play('boom');
      Sound.play('roar');
      Cam.shake = 0.7;
    }
  };
  Net.on('ufoTel', (d) => live() && Enemies.telegraph(V3(d[0], d[1], d[2]), d[3], d[4]));
  Net.on('ufoTl', (d) => live() && Enemies.telegraphLine(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5]), d[6], d[7]));
  Net.on('ufoFx', (d) => onFx(d[0], d[1]));
  Net.on('ufoKn', (d) => d[0] === Story.role && Player.body.v.set(d[1], d[2], d[3]));
  // the partner tearing an anchor out: its core swells on both screens
  Net.on('ufoRip', (d) => {
    if (!live()) return;
    const a = W.anchors[d[0]] && W.anchors[d[0]][d[1]];
    if (a) {
      a.rip = d[2];
      a.ripT = 0.5;
    }
  });

  // ======================= host-side state =======================
  const local = {
    T: 0,
    sync: 0,
    seen: {},
    stage: -1,
    ph: 0,
    mode: '',
    said: {},
    rip: 0,
    ripSend: 0,
    hp: 100,
    carry: null,
    swCd: 0,
    wipe: 0,
    bossOn: false,
    squadT: 0,
    strikeT: 0,
    sweepT: 0,
    probeT: 0,
    coreN: 1,
    porters: new Map(),
    done: 0,
    winT: 0,
    breaker: null,
    hold: 0,
    fleeT: 0,
    fedK: 0,
    ancK: '',
  };
  const lat = () => Math.min(0.25, (Net.rtt || 80) / 2000);
  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: me ? Combat.cloak > 0 : !!rs.cloak };
    });
  const nearest = (e, list) => {
    let best = null;
    let bd = 1e9;
    list.forEach((p) => {
      const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    });
    return [best, bd];
  };
  // can a walker stand here (absolute position)?
  const solid = (x, z) => W.ground(Story.S.x, V3(x - W.O.x, 0, z - W.O.z), local.T);
  const groundAt = (x, z) => W.O.y + W.groundY(x - W.O.x, z - W.O.z);
  // a walker that left the ground falls into the clouds and is gone
  const fallOff = (e, dt) => {
    if (solid(e.pos.x, e.pos.z) || e.drop) {
      e.vy = 0;
      return false;
    }
    e.vy = (e.vy || 0) - 20 * dt;
    e.pos.y += e.vy * dt;
    if (e.pos.y < W.O.y - 30) {
      if (e.view) R.scene.remove(e.view.g);
      Enemies.list.delete(e.id);
    }
    return true;
  };
  const step = (e, dx, dz, sp, dt) => {
    const l = Math.hypot(dx, dz) || 1;
    const nx = e.pos.x + (dx / l) * sp * dt;
    const nz = e.pos.z + (dz / l) * sp * dt;
    if (solid(nx, nz)) {
      e.pos.x = nx;
      e.pos.z = nz;
    }
    e.pos.y = damp(e.pos.y, groundAt(e.pos.x, e.pos.z), 10, dt);
  };
  // whoever is breaking the shield right now draws the fire
  const preferred = (targets) => {
    if (!local.breaker) return null;
    return targets.find((p) => p.who === local.breaker) || null;
  };
  // a beam of the saucer brings them down: they float to the ground first
  const descend = (e, dt) => {
    if (!e.drop) return false;
    const gy = groundAt(e.pos.x, e.pos.z);
    e.pos.y -= dt * 3.4;
    if (e.pos.y <= gy) {
      e.pos.y = gy;
      e.drop = false;
      fx('land', e.pos);
    }
    return true;
  };

  // ---------- l'Éclaireur: walks in, coils, lunges ----------
  Enemies.define('ufoScout', {
    stats: { hp: 40, speed: 3.6, radius: 0.6, hitR: 0.75, height: 1.9, reach: 3.0, stunP: 1.4, dieColor: '#9ff4ff' },
    model: veilleur('ufoScout', 1, false),
    // the sword is made for them
    mult: (e, weak, stun) => (stun ? 1.8 : 1),
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      if (descend(e, dt) || fallOff(e, dt)) return;
      if (e.stun > 0) {
        e.st = 0;
        return;
      }
      const [tg, d] = nearest(e, targets);
      if (!e.st) e.st = 0;
      if (e.st === 0) {
        if (!tg) return;
        e.yaw = angleDamp(e.yaw, Math.atan2(tg.pos.x - e.pos.x, tg.pos.z - e.pos.z), 6, dt);
        if (d > 2.4) step(e, tg.pos.x - e.pos.x, tg.pos.z - e.pos.z, 3.6, dt);
        e.walk = d > 2.4 ? 1 : 0;
        if (e.atk <= 0 && d < 3.2) {
          e.st = 1;
          e.t = 0.6;
          const l = d || 1;
          e.ax = (tg.pos.x - e.pos.x) / l;
          e.az = (tg.pos.z - e.pos.z) / l;
          e.yaw = Math.atan2(e.ax, e.az);
          telLine(e.pos, V3(e.pos.x + e.ax * 4, e.pos.y, e.pos.z + e.az * 4), 1.4, 0.6);
        }
      } else if (e.st === 1 && e.t <= 0) {
        e.st = 2;
        e.t = 0.24;
        e.hit = [];
        fx('lunge', e.pos);
      } else if (e.st === 2) {
        step(e, e.ax, e.az, 16, dt);
        players.forEach((p) => {
          if (p.down || e.hit.includes(p.who)) return;
          if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 1.2 && Math.abs(p.pos.y - e.pos.y) < 2) {
            e.hit.push(p.who);
            Combat.hurt(p.who, 12, e.pos);
            knock(p.who, [e.ax * 6, 4, e.az * 6]);
          }
        });
        if (e.t <= 0) {
          e.st = 3;
          e.t = 0.9;
        }
      } else if (e.st === 3 && e.t <= 0) {
        e.st = 0;
        e.atk = 1.4 + Math.random() * 1.2;
      }
    },
    render(e, m, dt, t) {
      walkerRender(e, m, dt, t, e.st === 1 ? -2.4 : e.st === 2 ? -1.4 : -0.3);
    },
  });

  const SIGHT_GEO = new THREE.CylinderGeometry(0.02, 0.02, 1, 5, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
  const SIGHT_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a5a').multiplyScalar(2), transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false });
  // ---------- le Gardien: a hexagonal shield (bullets glance off), a cannon, sometimes a core ----------
  Enemies.define('ufoGuard', {
    stats: { hp: 70, speed: 2.6, radius: 0.75, hitR: 0.95, height: 2.2, reach: 3.3, stunP: 2.8, dieColor: '#7ce0ff' },
    model: veilleur('ufoGuard', 1.15, true),
    // only the sword breaks the guard (the engine stuns it), then everything hurts
    mult(e, weak, stun) {
      if (stun) {
        if (!e.broke) fx('break', e.pos);
        e.broke = true;
        return 0.7;
      }
      if (e.stun > 0) return 1.3;
      e.broke = false;
      return 0;
    },
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      if (descend(e, dt) || fallOff(e, dt)) return;
      if (e.stun > 0) {
        e.st = 0;
        return;
      }
      if (!(e.stun > 0)) e.broke = false;
      if (!e.st) e.st = 0;
      // the one breaking the shield first, else the nearest
      const pref = preferred(targets);
      const [nr, nd] = nearest(e, targets);
      const tg = pref || nr;
      if (!tg) return;
      const dx = tg.pos.x - e.pos.x;
      const dz = tg.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      e.yaw = angleDamp(e.yaw, Math.atan2(dx, dz), e.st === 11 || e.st === 12 ? 3 : 5, dt);
      if (e.st === 0) {
        // keep at range, a little closer if someone is right on it
        const want = nd < 4 ? 0 : d > 13 ? 1 : d < 7 ? -1 : 0;
        if (want) step(e, dx * want, dz * want, 2.6, dt);
        e.walk = want ? 1 : 0;
        if (e.atk <= 0 && d < 24) {
          e.st = tg.who === 'dame' ? 11 : 12;
          e.t = 1.1;
          fx('aim', e.pos);
        }
      } else if ((e.st === 11 || e.st === 12) && e.t <= 0) {
        const who = e.st === 11 ? 'dame' : 'valet';
        const p = players.find((q) => q.who === who);
        if (p && !p.down) {
          const from = V3(e.pos.x + Math.sin(e.yaw) * 0.5, e.pos.y + 1.55, e.pos.z + Math.cos(e.yaw) * 0.5);
          Enemies.fire(from, p.pos.clone().add(V3(0, 1.1, 0)), 24, 14);
        }
        e.st = 0;
        e.atk = 3.0 + Math.random() * 1.2;
      }
    },
    render(e, m, dt, t) {
      walkerRender(e, m, dt, t, e.st === 11 || e.st === 12 ? -1.55 : -0.4);
      if (m.parts.back) {
        m.parts.back.visible = !!e.crystal;
        m.parts.back.rotation.y = t * 2;
      }
      // the laser sight while it aims: from the cannon to its target, on both screens
      const aim = e.st === 11 || e.st === 12;
      if (!m.sight) {
        m.sight = new THREE.Mesh(SIGHT_GEO, SIGHT_MAT);
        m.sight.frustumCulled = false;
        m.g.add(m.sight);
      }
      m.sight.visible = aim;
      if (aim) {
        const who = e.st === 11 ? 'dame' : 'valet';
        const tp = (who === Story.role ? Player.body.p : Remote.pos).clone().add(V3(0, 1.1, 0));
        const from = V3(e.pos.x + Math.sin(e.yaw) * 0.5, e.pos.y + 1.55, e.pos.z + Math.cos(e.yaw) * 0.5);
        m.g.updateMatrixWorld(true);
        m.sight.position.copy(m.g.worldToLocal(from.clone()));
        m.sight.lookAt(tp);
        m.sight.scale.set(1 + Math.sin(t * 40) * 0.4, 1, from.distanceTo(tp));
      }
      if (m.eye) m.eye.material.color.set(aim ? '#ff3a5a' : '#7ce0ff').multiplyScalar(e.stun > 0 ? 0.5 : aim ? 3 : 2.2);
    },
  });

  // ---------- la Sonde: a flying probe; fires, and dives at whoever carries a core ----------
  Enemies.define('ufoProbe', {
    stats: { hp: 30, speed: 0, radius: 0.8, hitR: 1.0, height: 0.4, reach: 3.2, stunP: 1.2, dieColor: '#ff6a96' },
    model: probeModel,
    // the sword only reaches it when it dives low
    mult(e, weak, stun) {
      if (!stun) return 1;
      return e.pos.y - groundAt(e.pos.x, e.pos.z) < 3 ? 2.5 : 0;
    },
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      if (e.oa == null) {
        e.oa = Math.random() * TAU;
        e.dir = Math.random() < 0.5 ? -1 : 1;
        e.fire = 1.5 + Math.random() * 2;
        e.dv = 3 + Math.random() * 3;
      }
      if (e.stun > 0) {
        e.st = 0;
        e.pos.y = damp(e.pos.y, groundAt(e.pos.x, e.pos.z) + 4.2, 3, dt);
        return;
      }
      const carrier = local.carrier ? targets.find((p) => p.who === local.carrier) : null;
      const pref = preferred(targets);
      const [nr] = nearest(e, targets);
      const tg = carrier || pref || nr;
      if (!e.st) e.st = 0;
      if (e.st === 0) {
        if (!tg) return;
        e.oa += dt * 0.7 * e.dir;
        const wx = tg.pos.x + Math.cos(e.oa) * 8;
        const wz = tg.pos.z + Math.sin(e.oa) * 8;
        e.pos.x = damp(e.pos.x, wx, 1.2, dt);
        e.pos.z = damp(e.pos.z, wz, 1.2, dt);
        e.pos.y = damp(e.pos.y, W.O.y + 6.8 + Math.sin(local.T * 1.3 + e.id) * 0.6, 2, dt);
        e.yaw = Math.atan2(tg.pos.x - e.pos.x, tg.pos.z - e.pos.z);
        e.fire -= dt;
        e.dv -= dt;
        if (carrier && e.dv <= 0) {
          // dive: a line on the ground through the carrier, then a pass at waist height
          e.st = 1;
          e.t = 0.95;
          const dx = carrier.pos.x - e.pos.x;
          const dz = carrier.pos.z - e.pos.z;
          const l = Math.hypot(dx, dz) || 1;
          e.ax = dx / l;
          e.az = dz / l;
          e.len = l + 6;
          e.from = e.pos.clone();
          const gy = carrier.pos.y;
          telLine(V3(e.pos.x, gy, e.pos.z), V3(e.pos.x + e.ax * e.len, gy, e.pos.z + e.az * e.len), 1.6, 0.95);
          e.gy = gy;
          fx('dive', e.pos);
        } else if (e.fire <= 0) {
          e.fire = 3 + Math.random() * 1.5;
          Enemies.fire(e.pos.clone().add(V3(0, -0.25, 0)), tg.pos.clone().add(V3(0, 1.1, 0)), 20, 8);
        }
      } else if (e.st === 1) {
        e.pos.y = damp(e.pos.y, e.gy + 3, 4, dt);
        if (e.t <= 0) {
          e.st = 2;
          e.t = e.len / 17;
          e.hit = [];
        }
      } else if (e.st === 2) {
        e.pos.x += e.ax * 17 * dt;
        e.pos.z += e.az * 17 * dt;
        e.pos.y = damp(e.pos.y, e.gy + 1.1, 9, dt);
        players.forEach((p) => {
          if (p.down || e.hit.includes(p.who)) return;
          if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 1.5 && Math.abs(p.pos.y + 1 - e.pos.y) < 1.6) {
            e.hit.push(p.who);
            Combat.hurt(p.who, 12, e.pos);
            knock(p.who, [e.ax * 7, 5, e.az * 7]);
          }
        });
        if (e.t <= 0) {
          e.st = 0;
          e.dv = 5 + Math.random() * 3;
        }
      }
    },
    render(e, m, dt, t) {
      m.parts.spin.rotation.y += dt * (e.st === 2 ? 14 : 4);
      m.body.rotation.x = e.st === 1 ? 0.5 : e.st === 2 ? 0.35 : Math.sin(t * 1.3 + e.id) * 0.08;
      m.body.rotation.z = Math.sin(t * 1.7 + e.id) * 0.08;
    },
  });

  const walkerRender = (e, m, dt, t, armR) => {
    const P_ = m.parts;
    const a = (e._a = e._a || { ph: 0 });
    const walking = e.st === 0 && (e.snaps ? true : e.walk);
    a.ph += dt * (walking ? 7 : 0);
    P_.legs[0].rotation.x = Math.sin(a.ph) * 0.45 * (walking ? 1 : 0);
    P_.legs[1].rotation.x = -Math.sin(a.ph) * 0.45 * (walking ? 1 : 0);
    const stun = e.stun > 0;
    P_.R.sh.rotation.x = damp(P_.R.sh.rotation.x, stun ? 0.5 : armR, e.st === 2 ? 30 : 8, dt);
    P_.L.sh.rotation.x = damp(P_.L.sh.rotation.x, stun ? 0.6 : m.shield ? -1.1 : -0.25, 8, dt);
    P_.head.rotation.x = stun ? 0.45 : Math.sin(t * 1.1 + e.id) * 0.06;
    P_.head.rotation.y = Math.sin(t * 0.9 + e.id) * 0.25;
    m.body.rotation.x = damp(m.body.rotation.x, e.st === 1 ? 0.2 : e.st === 2 ? 0.35 : stun ? -0.2 : 0, 8, dt);
    // floating down the beam: arms wide, slow spin
    if (e.drop) {
      m.body.rotation.y += dt * 1.5;
      P_.R.sh.rotation.z = -0.9;
      P_.L.sh.rotation.z = 0.9;
    } else {
      m.body.rotation.y = 0;
      P_.R.sh.rotation.z = 0;
      P_.L.sh.rotation.z = 0;
    }
  };

  // ---------- la Soucoupe ----------
  // a bullet in the closed eye of a drinking beam (host): five open it
  const eyeHit = () => {
    const x = Story.S.x;
    const bm = x.beam;
    if (!bm || !bm.intake || bm.open || local.T < bm.t0 - 0.3 || local.T > bm.t1) return;
    const n = (bm.hits || 0) + 1;
    Story.ctx.set((s) => (s.x.beam = { ...s.x.beam, hits: n, open: n >= EYE }));
    if (n >= EYE) fx('eye', Enemies.boss() && Enemies.boss().pos);
  };
  const FLOOR = (ph) => PH_HP[ph + 1] || 0;
  Enemies.define('ufoSaucer', {
    stats: { hp: BOSS_HP, speed: 0, radius: 8, hitR: 3.2, height: 2, boss: true, reach: 0.01, stunP: 0.01, weakR: 1.6, dieColor: '#ff6a96' },
    model: W.saucerModel,
    // shielded: nothing. Open: the core takes the rifle at 2.2x, the sword at 2.5x, the hull a
    // little; never past the end of the phase in one opening
    mult(e, weak, stun) {
      if (!e.vuln) {
        if (!stun) eyeHit();
        return 0;
      }
      const k = stun ? 2.5 : weak ? 2.2 : 0.25;
      const dmg = stun ? 12 : 9;
      const floor = FLOOR(e.ph || 1) + (e.ph === 3 ? 1 : 0);
      return Math.max(0, Math.min(k, (e.hp - floor) / dmg));
    },
    sim(e, dt) {
      // movement only: the fight itself is run by the level (host)
      e.stunImm = 99;
      e.stun = 0;
      const x = Story.S.x;
      const tg = local.saucerTo || V3(W.O.x, W.O.y + W.SAUCER.y - 1.1, W.O.z);
      const k = x.mode === 'open' ? 2.2 : e.st === 5 ? 0.8 : 1.4;
      e.pos.x = damp(e.pos.x, tg.x, k, dt);
      e.pos.z = damp(e.pos.z, tg.z, k, dt);
      e.pos.y = damp(e.pos.y, tg.y, x.mode === 'open' ? 2.6 : 1.2, dt);
      e.yaw += dt * (x.mode === 'open' ? 0.05 : 0.18);
    },
    render(e, m, dt, t) {
      const s = m.ship;
      const a = (m.a = m.a || { open: 0, beam: 0, hatch: 0, shield: 1, hit: 0 });
      const x = Story.S && Story.S.x;
      const T = local.T;
      const bm = x && x.beam;
      const beamOn = !!(bm && T >= bm.t0 && T <= bm.t1);
      a.open = damp(a.open, e.vuln ? 1 : 0, 3, dt);
      a.beam = damp(a.beam, beamOn ? 1 : 0, 4, dt);
      a.hatch = damp(a.hatch, Math.max(a.open, beamOn ? 1 : 0), 3, dt);
      a.shield = damp(a.shield, e.vuln || (x && x.stage === 2) ? 0 : 1, e.vuln ? 6 : 1.5, dt);
      a.hit = Math.max(a.hit - dt * 3, (e.hitT || 0) > 0 && !e.vuln ? 1 : 0);
      const rage = x && x.stage >= 1 ? 0.75 + 0.25 * Math.sin(t * 3) : 0.4;
      s.update(t, { hatch: a.hatch, charge: e.st === 3 ? 1 : x && x.ph === 3 ? 0.4 : 0.15, rage });
      s.ring.rotation.y = -t * (0.6 + (x ? x.ph : 1) * 0.25);
      s.lights.rotation.y = t * 0.4;
      s.BU.uOn.value = a.beam;
      // the eye of the beam: red while shut, blue once the rifle has opened it
      const eyeOpen = !!(bm && bm.open);
      s.hatchGlow.material.color.set(bm && bm.intake && !eyeOpen ? '#ff3a4a' : '#bff4ff').multiplyScalar(bm && bm.intake ? 2.4 + Math.sin(t * 8) * 0.4 : 0.8);
      // the shield
      m.shield.visible = a.shield > 0.02;
      W.shieldMat.uniforms.uOn.value = a.shield;
      W.shieldMat.uniforms.uHit.value = a.hit;
      m.shield.rotation.y = t * 0.1;
      // open: it sinks, tilted, its core hanging out of the hatch
      m.tilt.rotation.x = a.open * (0.14 + Math.sin(t * 1.7) * 0.03) + (e.st === 3 ? Math.sin(t * 9) * 0.05 : 0);
      m.tilt.rotation.z = a.open * Math.sin(t * 1.2) * 0.05 + (e.st === 5 ? Math.sin(t * 7) * 0.12 : 0);
      m.heart.visible = a.open > 0.04;
      m.heart.position.y = lerp(-0.7, -2.7, a.open);
      m.parts.hcore.scale.setScalar(1 + Math.sin(t * 7) * 0.08);
      m.parts.hcore.rotation.set(t * 0.8, t * 1.1, 0);
      m.parts.hring.rotation.y = t * 1.6;
      m.parts.hring2.rotation.x = t * 1.3;
      // where the sword and the rifle reach it (each screen hits on its own)
      const TY = Enemies.TYPES.ufoSaucer;
      TY.hitR = e.vuln ? 6.2 : 3.2;
      TY.reach = e.vuln ? 7.5 : 0.01;
      // smoke from a wounded hull
      const hurt = 1 - e.hp / e.max;
      if (hurt > 0.5 && Math.random() < dt * hurt * 6) Fx.burst(m.g.position.clone().add(V3((Math.random() - 0.5) * 10, 1.4, (Math.random() - 0.5) * 10)), '#3a3040', 6, 2, 1.2, 2);
    },
  });

  // ======================= the fight (host) =======================
  const ancLayout = (ph) => (NEED[ph][0] ? W.ANCHORS[ph].map(() => 1) : []);
  const needCores = (x) => NEED[x.ph][1];
  // is the dame kit on an anchor's platform? (relative position)
  const onAnchor = (q, ph) =>
    (W.anchors[ph] || []).findIndex(
      (a) =>
        a.alive &&
        Math.abs(q.x - (a.pos.x)) < W.ANC_PLAT / 2 + 0.4 &&
        Math.abs(q.z - a.pos.z) < W.ANC_PLAT / 2 + 0.4 &&
        q.y > a.pos.y - 0.35 &&
        q.y < a.pos.y + 1.2,
    );
  // drop points: the heart and the petals still standing, away from the edges
  const DROP = (() => {
    const out = [];
    for (let i = 0; i < 6; i++) out.push([Math.cos((i / 6) * TAU) * 7.5, Math.sin((i / 6) * TAU) * 6 + 2]);
    W.PETALS.forEach((p) => out.push([p.x * 0.96, p.z * 0.96, p.i]));
    return out;
  })();
  const dropPoint = (x, avoid) => {
    const ok = DROP.filter(([px, pz, pi]) => (pi == null || !x.fall || x.fall[pi] == null) && (!avoid || Math.hypot(px - avoid.x, pz - avoid.z) > 7));
    const list = ok.length ? ok : DROP.slice(0, 6);
    return list[Math.floor(Math.random() * list.length)];
  };
  const SQUAD = {
    1: ['ufoScout', 'ufoScout', 'ufoGuard'],
    2: ['ufoScout', 'ufoGuard:core', 'ufoGuard'],
    3: ['ufoScout', 'ufoScout', 'ufoGuard:core', 'ufoGuard'],
  };
  const SQUAD_T = { 1: 17, 2: 15, 3: 13.5 };
  const CAP = { 1: 7, 2: 8, 3: 10 };
  const STRIKE_T = { 1: 7.5, 2: 6.5, 3: 5.2 };
  const SWEEP_T = { 1: 0, 2: 12, 3: 9.5 };
  const PROBES = { 1: 1, 2: 2, 3: 3 };

  const minions = () => [...Enemies.list.values()].filter((e) => e.type !== 'ufoSaucer');
  const vanish = (e) => {
    if (e.view) {
      R.scene.remove(e.view.g);
      Fx.burst(e.pos.clone().add(V3(0, 1, 0)), '#9ff4ff', 30, 5, 0.7, -6);
    }
    Enemies.list.delete(e.id);
  };
  const clearAll = () => Enemies.clear();

  // a squad comes down the beam (and, when cores are still needed, the beam drinks for a while)
  const sendBeam = (c, opt) => {
    const x = c.S.x;
    const [px, pz] = opt.at || dropPoint(x, opt.avoid);
    const intake = x.ph >= 2 && x.fed < needCores(x) && x.mode === 'shield';
    const t0 = +(local.T + 2.2).toFixed(2);
    const t1 = +(t0 + (intake ? 9 : 4.4)).toFixed(2);
    c.set((s) => (s.x.beam = { x: +px.toFixed(2), z: +pz.toFixed(2), t0, t1, intake }));
    fx('beam');
    if (!opt.squad) return;
    const tok = local.tok;
    opt.squad.forEach((kind, k) => {
      const [type, flag] = kind.split(':');
      setTimeout(() => {
        if (!live() || tok !== local.tok || Story.S.x.mode !== 'shield' || Story.S.x.stage !== 1) return;
        const a = (k / opt.squad.length) * TAU;
        const e = Enemies.spawn(type, W.P(px + Math.cos(a) * 1.6, 9, pz + Math.sin(a) * 1.6), {
          drop: true,
          atk: 1.5 + Math.random() * 1.5,
          crystal: flag === 'core',
        });
        e.yaw = a;
      }, (2.6 + k * 0.45) * 1000);
    });
  };
  const sendProbes = (c, n) => {
    const b = Enemies.boss();
    if (!b) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const e = Enemies.spawn('ufoProbe', V3(b.pos.x + Math.cos(a) * 6, b.pos.y, b.pos.z + Math.sin(a) * 6), { atk: 2 });
      e.oa = a;
    }
  };

  // the start of a phase (also after a wipe)
  const phaseStart = (c, ph, wipe) => {
    local.tok = (local.tok || 0) + 1;
    local.squadT = wipe ? 4 : 6;
    local.strikeT = STRIKE_T[ph];
    local.sweepT = SWEEP_T[ph] ? 7 : 0;
    local.probeT = 9;
    local.hold = 0;
    c.set((s) => {
      s.x.ph = ph;
      s.x.mode = 'shield';
      s.x.anc = ancLayout(ph);
      s.x.cuts = [];
      s.x.fed = 0;
      s.x.beam = null;
      s.x.sw = null;
      if (wipe) s.x.cores = [];
      s.x.fall = ph === 3 ? Object.fromEntries(FALLS.map((i, k) => [i, +(local.T + 8 + k * 11).toFixed(2)])) : null;
    });
  };
  const spawnBoss = (c, hp, high) => {
    const e = Enemies.spawn('ufoSaucer', W.P(0, high ? 70 : W.SAUCER.y - 1.1, -2), { hp, ph: c.S.x.ph, phase: c.S.x.ph, st: 0, vuln: false, shield: true });
    e.max = BOSS_HP;
    local.bossOn = true;
    return e;
  };

  const hostFight = (c, dt, ps) => {
    const x = c.S.x;
    const T = local.T;
    const b = Enemies.boss();
    if (!b) return;
    b.ph = x.ph;
    b.phase = x.ph;
    b.vuln = x.mode === 'open';
    b.shield = !b.vuln;
    // who is breaking the shield (drawn fire): the dame on an anchor, the valet with a core
    const qd = W.rel(c.pos('dame'));
    const carrier = (x.cores || []).find((k) => k.by);
    local.carrier = carrier ? carrier.by : null;
    local.breaker = onAnchor(qd, x.ph) >= 0 ? 'dame' : local.carrier;
    // where the saucer goes
    const bm = x.beam;
    if (x.mode === 'open') local.saucerTo = W.P(0, W.SAUCER.open - 1.1, 0);
    else if (bm && T < bm.t1 + 0.4) local.saucerTo = W.P(bm.x, W.SAUCER.y - 1.6, bm.z);
    else if (x.sw && T < x.sw.t0 + W.SWEEP.tel + W.SWEEP.dur) local.saucerTo = W.P(x.sw.x, W.SAUCER.y - 1.1, x.sw.z);
    else {
      const a = T * 0.16;
      local.saucerTo = W.P(Math.cos(a) * 5, W.SAUCER.y - 1.1 + Math.sin(T * 0.7) * 0.4, Math.sin(a) * 5 - 1);
    }
    if (bm && T > bm.t1 + 0.5) c.set((s) => (s.x.beam = null));
    if (x.sw && T > x.sw.t0 + W.SWEEP.tel + W.SWEEP.dur + 0.3) c.set((s) => (s.x.sw = null));
    b.st = local.stagger > 0 ? 3 : bm && T >= bm.t0 && T <= bm.t1 ? 1 : x.mode === 'open' ? 2 : 0;
    local.stagger = Math.max(0, (local.stagger || 0) - dt);

    // porters that died leave their core where they fell
    for (const [id, p] of local.porters) {
      if (!Enemies.list.has(id)) {
        local.porters.delete(id);
        const q = W.rel(p);
        const on = W.ground(x, q, T);
        const gq = on ? q : V3(q.x * 0.5, 0, q.z * 0.5);
        const cid = local.coreN++;
        c.set((s) => (s.x.cores = [...(s.x.cores || []), { id: cid, x: +gq.x.toFixed(2), y: +W.groundY(gq.x, gq.z).toFixed(2), z: +gq.z.toFixed(2), by: null }]));
      }
    }
    Enemies.list.forEach((e) => e.type === 'ufoGuard' && e.crystal && local.porters.set(e.id, e.pos.clone()));

    if (x.mode === 'shield') {
      // the shield breaks once every anchor is down and the cores are in
      const ancDone = !(x.anc || []).some((v) => v);
      if (ancDone && x.fed >= needCores(x) && local.stagger <= 0) {
        c.set((s) => {
          s.x.mode = 'open';
          s.x.openT = +(T + OPEN_T).toFixed(2);
          s.x.beam = null;
          s.x.sw = null;
        });
        fx('open');
        return;
      }
      // squads
      local.squadT -= dt;
      const busy = x.beam || x.sw;
      if (local.squadT <= 0 && !busy) {
        local.squadT = SQUAD_T[x.ph];
        const n = minions().length;
        // phases 2 and 3 always bring a porter while cores are still missing
        const squad = SQUAD[x.ph].filter((k) => k !== 'ufoGuard:core' || (x.fed < needCores(x) && !(x.cores || []).length && ![...local.porters.keys()].length));
        if (n < CAP[x.ph]) sendBeam(c, { squad: squad.slice(0, Math.max(1, CAP[x.ph] - n)), avoid: c.pos(local.breaker || 'dame') });
      }
      // a carried core and no beam coming: the saucer lowers one, away from the carrier
      if (carrier && !x.beam && !x.sw && x.fed < needCores(x)) {
        const cp = W.rel(c.pos(carrier.by));
        sendBeam(c, { avoid: cp, at: dropPoint(x, cp) });
      }
      // probes
      local.probeT -= dt;
      if (local.probeT <= 0) {
        local.probeT = 14;
        const n = Enemies.alive('ufoProbe');
        if (n < PROBES[x.ph]) sendProbes(c, Math.min(2, PROBES[x.ph] - n));
      }
      // the strike: a ring under each player, then a lance of light
      local.strikeT -= dt;
      if (local.strikeT <= 0 && !x.sw) {
        local.strikeT = STRIKE_T[x.ph] + Math.random() * 1.5;
        const marks = ps.filter((p) => !p.down).map((p) => V3(p.pos.x, groundAt(p.pos.x, p.pos.z), p.pos.z));
        marks.forEach((m) => tel(m, 2.4, 1.5));
        const tok = local.tok;
        setTimeout(() => {
          if (!live() || tok !== local.tok) return;
          marks.forEach((m) => {
            fx('strike', m);
            players(c).forEach((p) => {
              if (!p.down && Math.hypot(p.pos.x - m.x, p.pos.z - m.z) < 2.4 && p.pos.y < m.y + 3) Combat.hurt(p.who, 16, m);
            });
          });
        }, 1500);
        if (!local.said.strike) {
          local.said.strike = true;
          c.send('ufoSay', TX.strike);
          HUD.say(TX.strike, T.master, 2200);
        }
      }
      // the sweep (phases 2 and 3)
      if (SWEEP_T[x.ph]) {
        local.sweepT -= dt;
        if (local.sweepT <= 0 && !x.beam) {
          local.sweepT = SWEEP_T[x.ph] + Math.random() * 2;
          const sp = W.rel(b.pos);
          const tg = ps.filter((p) => !p.down)[Math.floor(Math.random() * 2)] || ps[0];
          const tq = W.rel(tg.pos);
          const a0 = Math.atan2(tq.x - sp.x, tq.z - sp.z) - 0.9;
          c.set((s) => (s.x.sw = { t0: +(T + 0.3).toFixed(2), a0: +a0.toFixed(3), dir: Math.random() < 0.5 ? -1 : 1, n: x.ph === 3 ? 2 : 1, x: +sp.x.toFixed(2), z: +sp.z.toFixed(2) }));
          fx('sweep');
        }
      }
    } else if (x.mode === 'open') {
      const floor = FLOOR(x.ph) + (x.ph === 3 ? 1 : 0);
      if (b.hp <= floor + 0.01) {
        if (x.ph === 3) {
          // beaten: it flees, the card stays
          minions().forEach(vanish);
          c.set((s) => {
            s.x.stage = 2;
            s.x.mode = 'fled';
            s.x.cores = [];
            s.x.beam = null;
            s.x.sw = null;
          });
          local.fleeT = 0;
          fx('fled');
          return;
        }
        const next = x.ph + 1;
        local.stagger = 3;
        fx('roar');
        phaseStart(c, next, false);
        b.hp = Math.min(b.hp, PH_HP[next]);
        return;
      }
      if (T > x.openT) {
        c.set((s) => {
          s.x.mode = 'shield';
          s.x.anc = ancLayout(s.x.ph);
          s.x.cuts = [];
          s.x.fed = 0;
        });
        local.squadT = 3;
        fx('reform');
      }
    }
  };

  // ======================= the level =======================
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 0) return TX.arrive;
    if (x.stage === 2) return x.won ? '' : TX.cardObj;
    if (x.mode === 'open') return TX.open[c.role];
    return TX.obj[x.ph][c.role];
  };
  const bossTag = (x) => {
    if (x.mode === 'open') return 'Bouclier brisé · son cœur est à découvert';
    const [na, nc] = NEED[x.ph];
    const parts = [];
    if (na) parts.push('ancres ' + (na - (x.anc || []).filter((v) => v).length) + ' / ' + na);
    if (nc) parts.push('noyaux ' + (x.fed || 0) + ' / ' + nc);
    const bm = x.beam;
    if (nc && bm && bm.intake) parts.push(bm.open ? 'rayon ouvert' : 'œil ' + (bm.hits || 0) + ' / ' + EYE);
    return 'Bouclier · ' + parts.join(' · ');
  };

  Story.register('tr_ufo', {
    world: TrUfo,
    init: () => ({
      stage: 0,
      T: 0,
      ph: 1,
      mode: 'shield',
      anc: [1, 1, 1],
      fed: 0,
      cores: [],
      beam: null,
      sw: null,
      fall: null,
      cuts: [],
      openT: 0,
      won: false,
    }),
    voice: () => 1,
    net: {
      ufoWipe: (c) => {
        Combat.reset();
        c.spawn(W.spawn(c.role), Math.PI);
        HUD.say(TX.wipe, T.master, 2600);
      },
      ufoSay: (c, d) => HUD.say(d, T.master, 2200),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.wake();
      clearAll();
      local.T = c.S.x.T || 0;
      local.stage = -1;
      local.ph = 0;
      local.mode = '';
      local.said = {};
      local.bossOn = false;
      local.rip = 0;
      local.hp = 100;
      local.carry = null;
      local.porters.clear();
      local.done = 0;
      local.winT = 0;
      local.wipe = 0;
      local.stagger = 0;
      local.introT = 0;
      local.ancK = '';
      local.fedK = 0;
      local.seen = {};
      local.tok = (local.tok || 0) + 1;
      c.spawn(W.spawn(c.role), Math.PI);
      Player.killY = W.O.y - 26;
      // a fall into the clouds hurts and brings you back to the heart
      Player.checkpoint = () => {
        if (Combat.on && !Combat.down) {
          Combat.apply(25);
          HUD.say(TX.fell, T.master, 1600);
        }
        return W.spawn(c.role);
      };
      Player.targets = () => {
        const x = Story.S.x;
        if (x.stage !== 1 || x.mode !== 'shield' || !W.anchors[x.ph]) return [];
        return W.anchors[x.ph].map((a) => (a.alive && x.anc[a.i] ? a.g.position.clone().add(a.ringOff) : null));
      };
      Player.grappleLand = () => {
        const x = Story.S.x;
        const list = W.anchors[x.ph] || [];
        const a = list[Player.target];
        // only when the pull ends near this anchor (a jump off the grapple elsewhere stays free)
        return a && Player.body.p.distanceTo(a.g.position) < 5.5 ? a.g.position.clone().add(V3(0, 0.05, 0)) : null;
      };
      City.mood({});
      c.fog(0.0062);
      Combat.enable(true);
      HUD.visa(TX.card + ' · ' + TX.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 3800);
      this.apply(c);
    },
    exit() {
      Combat.enable(false);
      Combat.noCloak = false;
      clearAll();
      HUD.boss(null);
      Player.targets = null;
      Player.grappleLand = null;
      W.cores.forEach((m) => (m.visible = false));
      W.sleep();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      const r = c.role;
      if (x.stage !== local.stage || x.ph !== local.ph || x.mode !== local.mode) {
        const was = { stage: local.stage, ph: local.ph, mode: local.mode };
        local.stage = x.stage;
        local.ph = x.ph;
        local.mode = x.mode;
        HUD.objective(objective(c));
        if (was.stage === 0 && x.stage === 1) Sound.mood('tense');
        if (x.stage === 1 && was.ph && x.ph > was.ph) HUD.say(TX.phase[x.ph], TX.boss, 3400);
        if (x.mode === 'open' && was.mode === 'shield') HUD.say(TX.openSay, T.master, 2600);
        if (x.mode === 'shield' && was.mode === 'open' && x.ph === was.ph) HUD.say(TX.reform, T.master, 2200);
        if (x.stage === 2 && was.stage === 1) {
          HUD.boss(null);
          HUD.say(TX.won, T.master, 3400);
          Sound.mood('gold');
          Fx.hearts(W.P(0, 5, 0));
        }
        if (x.stage === 1 && x.ph === 1 && was.stage === 0) Sound.play('roar');
      }
      // anchors torn out, cores fed: one line for both screens
      const ak = (x.anc || []).join('');
      if (local.ancK && ak !== local.ancK && x.ph === local.ancPh && ak.length === local.ancK.length && (ak.match(/1/g) || []).length < (local.ancK.match(/1/g) || []).length) {
        const n = (ak.match(/1/g) || []).length;
        HUD.say(TX.ripDone + (n ? ' ' + TX.ancLeft(n) : ''), T.master, 1800);
      }
      local.ancK = ak;
      local.ancPh = x.ph;
      if (x.fed > local.fedK && x.ph === local.fedPh) HUD.say(TX.fed(x.fed, needCores(x)), T.master, 2000);
      local.fedK = x.fed;
      local.fedPh = x.ph;
      // a chain cut, the beam's eye opened or still shut
      const ck = (x.cuts || []).join(',');
      if (local.cutK != null && ck !== local.cutK && (x.cuts || []).some((v, i) => v && v !== (local.cutL || [])[i])) HUD.say(TX.cutSay, T.master, 1800);
      local.cutK = ck;
      local.cutL = (x.cuts || []).slice();
      const bm = x.beam;
      if (bm && bm.intake && bm.open && !local.eyeK) HUD.say(TX.eyeOpen, T.master, 1800);
      if (bm && bm.intake && !bm.open && !local.said['eye' + x.ph]) {
        local.said['eye' + x.ph] = true;
        HUD.say(TX.eyeShut, T.master, 2600);
      }
      local.eyeK = !!(bm && bm.open);
      // a petal starts to fall
      if (x.fall) Object.entries(x.fall).forEach(([i, t0]) => {
        const k = 'f' + i + ':' + t0;
        if (local.T > t0 - 0.2 && !local.seen[k]) {
          local.seen[k] = 1;
          HUD.say(TX.fall, T.master, 1800);
        }
      });
      void r;
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const ps = players(c);
      local.sync += dt;
      if (local.sync > 0.4) {
        local.sync = 0;
        c.set((s) => (s.x.T = +local.T.toFixed(2)));
      }
      // the arrival: the saucer comes down out of the clouds
      if (x.stage === 0) {
        if (!local.bossOn) spawnBoss(c, BOSS_HP, true);
        local.saucerTo = W.P(0, W.SAUCER.y - 1.1, -2);
        local.introT = (local.introT || 0) + dt;
        if (local.introT > 6.5) {
          c.set((s) => (s.x.stage = 1));
          phaseStart(c, 1, false);
          fx('roar');
        }
        Enemies.simulate(dt, ps);
      }
      if (x.stage === 1) {
        if (!local.bossOn) spawnBoss(c, PH_HP[x.ph], false);
        hostFight(c, dt, ps);
        Enemies.simulate(dt, ps);
        // a wipe: the phase starts over (the saucer back to the life it had when it began)
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2.2) {
            local.wipe = 0;
            clearAll();
            local.porters.clear();
            Combat.reset();
            local.bossOn = false;
            spawnBoss(c, PH_HP[x.ph], false);
            phaseStart(c, x.ph, true);
            c.send('ufoWipe', 1);
            c.spawn(W.spawn(c.role), Math.PI);
            HUD.say(TX.wipe, T.master, 2600);
          }
        } else local.wipe = 0;
      }
      if (x.stage === 2) {
        const b = Enemies.boss();
        local.fleeT += dt;
        if (b) {
          b.st = 5;
          b.vuln = false;
          local.saucerTo = W.P(30, 90, -160);
          if (local.fleeT > 7) clearAll();
        }
        Enemies.simulate(dt, ps);
        const qd = W.rel(ps[0].pos);
        const qv = W.rel(ps[1].pos);
        local.winT = local.fleeT > 3 && W.nearCard(qd) && W.nearCard(qv) ? local.winT + dt : 0;
        if (!x.won && local.winT > 1) c.set((s) => (s.x.won = true));
        if (x.won) {
          local.done += dt;
          if (local.done > 2.5) c.goto('reward', (s) => (s.x.card = 'ufo'));
        }
      }
      Enemies.netTick(dt);
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
      if (x.stage !== 1) return;
      if (d.a === 'cut' && who === 'valet' && x.mode === 'shield' && d.ph === x.ph && x.anc && x.anc[d.i]) {
        const a = W.anchors[x.ph][d.i];
        const q = W.rel(c.pos(who));
        if (Math.hypot(q.x - a.borne.pos.x, q.z - a.borne.pos.z) < 4) {
          const until = +(local.T + CUT_T).toFixed(2);
          c.set((s) => {
            const cuts = (s.x.cuts || []).slice();
            cuts[d.i] = until;
            s.x.cuts = cuts;
          });
          fx('cut', a.borne.g.position.clone().add(V3(0, 2.2, 0)));
        }
      }
      if (d.a === 'rip' && who === 'dame' && x.mode === 'shield' && d.ph === x.ph && x.anc && x.anc[d.i] && W.unlockLeft(x, W.anchors[x.ph][d.i], local.T) > -0.6) {
        const a = W.anchors[x.ph][d.i];
        c.set((s) => (s.x.anc = s.x.anc.map((v, k) => (k === d.i ? 0 : v))));
        fx('rip', a.g.position.clone().add(V3(0, 0.6, 0)));
      }
      if (d.a === 'grab' && who === 'valet') {
        const k = (x.cores || []).find((q) => q.id === d.id);
        if (k && !k.by && !(x.cores || []).some((q) => q.by === who)) c.set((s) => (s.x.cores = s.x.cores.map((q) => (q.id === d.id ? { ...q, by: who } : q))));
      }
      if (d.a === 'drop') {
        const k = (x.cores || []).find((q) => q.by === who);
        if (k) {
          const q = V3(d.x, 0, d.z);
          const on = W.ground(x, q, local.T);
          const gq = on ? q : V3(0, 0, 3);
          c.set((s) => (s.x.cores = s.x.cores.map((o) => (o.id === k.id ? { ...o, by: null, x: +gq.x.toFixed(2), y: +W.groundY(gq.x, gq.z).toFixed(2), z: +gq.z.toFixed(2) } : o))));
          fx('drop', W.P(gq.x, W.groundY(gq.x, gq.z), gq.z));
        }
      }
      if (d.a === 'feed') {
        const k = (x.cores || []).find((q) => q.by === who);
        const bm = x.beam;
        const q = W.rel(c.pos(who));
        const T0 = local.T;
        if (k && bm && bm.intake && bm.open && T0 >= bm.t0 - 0.4 && T0 <= bm.t1 + 0.4 && Math.hypot(q.x - bm.x, q.z - bm.z) < W.INTAKE_R + 1.2 && x.mode === 'shield') {
          c.set((s) => {
            s.x.cores = s.x.cores.filter((o) => o.id !== k.id);
            s.x.fed = Math.min(needCores(s.x), (s.x.fed || 0) + 1);
            if (s.x.fed >= needCores(s.x) && s.x.beam) s.x.beam = { ...s.x.beam, t1: +Math.min(s.x.beam.t1, T0 + 0.6).toFixed(2) };
          });
          fx('feed', c.pos(who).clone().add(V3(0, 2.2, 0)));
        }
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      local.T += dt;
      if (!Net.isHost) {
        const now = performance.now();
        const s = (local.seen.T = local.seen.T || { v: null, t: now });
        if (s.v !== x.T) {
          s.v = x.T;
          s.t = now;
        }
        const want = x.T + lat() + Math.min(1, (now - s.t) / 1000);
        local.T += (want - local.T) * Math.min(1, dt * 3);
        if (Math.abs(want - local.T) > 1.5) local.T = want;
      }
      const TT = local.T;
      W.T = TT;
      const boss = Enemies.boss();
      W.update(dt, t, x, TT, boss && boss.view);
      Enemies.render(dt, t);
      const body = Player.body;
      const q = W.rel(body.p);
      // ---- the end of a pull toward an anchor: a hop that clears the platform's edge and lands
      // on it (the player's own hop only climbs a metre)
      if (local.grap && Player.mode === 'walk' && r === 'dame') {
        const a = (W.anchors[x.ph] || []).find((k) => k.alive && body.p.distanceTo(k.g.position) < 5.5);
        if (a) {
          const top = a.g.position;
          const apex = Math.max(top.y, body.p.y) + 0.9;
          const vy = Math.sqrt(2 * 26 * Math.max(0.2, apex - body.p.y));
          const tt = vy / 26 + Math.sqrt((2 * (apex - top.y)) / 26);
          body.v.set((top.x - body.p.x) / tt, vy, (top.z - body.p.z) / tt);
        }
      }
      local.grap = Player.mode === 'grapple';
      // ---- was I hurt this frame? (a hit stops a tear and drops a core)
      const hurt = Combat.hp < local.hp - 0.5;
      local.hp = Combat.hp;
      // ---- the sweep: each player judges their own feet
      local.swCd = Math.max(0, local.swCd - dt);
      if (x.sw && !Combat.down && local.swCd <= 0) {
        const gy = W.groundY(q.x, q.z);
        if (W.sweepHit(x.sw, TT, q, x.sw.x, x.sw.z, gy)) {
          local.swCd = 1.0;
          Combat.apply(16);
          const dx = q.x - x.sw.x;
          const dz = q.z - x.sw.z;
          const l = Math.hypot(dx, dz) || 1;
          body.v.set((dx / l) * 5, 7, (dz / l) * 5);
          Sound.play('cut');
          Cam.shake = 0.3;
          if (!local.said.sweep) {
            local.said.sweep = true;
            HUD.say(TX.sweep, T.master, 2000);
          }
        }
      }
      // ---- the cores, as everyone sees them
      const list = x.cores || [];
      W.cores.forEach((m, i) => {
        const k = list[i];
        m.visible = !!k && x.stage === 1;
        if (!m.visible) return;
        if (k.by) {
          const p = k.by === r ? body.p : Remote.pos;
          m.position.set(p.x, p.y + 2.35 + Math.sin(t * 3) * 0.06, p.z);
        } else m.position.copy(W.P(k.x, k.y + 0.6 + Math.sin(t * 2 + k.id) * 0.12, k.z));
        m.rotation.set(t * 0.7, t * 1.3, 0);
        m.userData.cages[0].rotation.y = t * 2;
        m.userData.cages[1].rotation.z = t * 2.4;
      });
      const mine = list.find((k) => k.by === r);
      local.carry = mine ? mine.id : null;
      Combat.noCloak = !!mine;
      if (mine) {
        Combat.atkCd = Math.max(Combat.atkCd, 0.1);
        // hit, down or fallen: the core falls where I am
        if (hurt || Combat.down) {
          const gq = W.ground(x, q, TT) ? q : V3(0, 0, 3);
          c.act({ a: 'drop', x: +gq.x.toFixed(2), z: +gq.z.toFixed(2) });
          local.carry = null;
          HUD.say(TX.dropped, T.master, 1600);
        } else {
          // into the beam
          const bm = x.beam;
          if (bm && bm.intake && bm.open && TT >= bm.t0 && TT <= bm.t1 && Math.hypot(q.x - bm.x, q.z - bm.z) < W.INTAKE_R && !local.fedSent) {
            local.fedSent = true;
            setTimeout(() => (local.fedSent = false), 800);
            c.act({ a: 'feed', id: mine.id });
          }
        }
      }
      // the partner lost the core: say it once
      const theirs = list.find((k) => k.by && k.by !== r);
      if (local.theirs && !theirs && list.some((k) => k.id === local.theirs && !k.by)) HUD.say(TX.mateDropped, T.master, 1600);
      local.theirs = theirs ? theirs.id : null;
      // ---- boss bar
      if (x.stage === 1 && boss) HUD.boss(TX.boss, boss.hp / boss.max, 'Phase ' + x.ph + ' · ' + bossTag(x));
      else if (x.stage === 0 && boss) HUD.boss(TX.boss, 1, 'Elle descend');
      else HUD.boss(null);
      // ---- the anchors' cores swell while someone tears them
      [1, 3].forEach((ph) =>
        W.anchors[ph].forEach((a) => {
          a.ripT = Math.max(0, (a.ripT || 0) - dt);
          if (a.ripT <= 0 && !(a.ph === x.ph && local.ripId === a.i)) a.rip = damp(a.rip || 0, 0, 6, dt);
        }),
      );
      // ---- prompts
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage !== 1 || x.mode !== 'shield' || Combat.down) {
        local.rip = 0;
        local.ripId = -1;
        return null;
      }
      // tearing an anchor out (dame kit, standing on its platform)
      const ai = r === 'dame' ? onAnchor(q, x.ph) : -1;
      if (ai >= 0 && x.anc && x.anc[ai]) {
        const a = W.anchors[x.ph][ai];
        // still chained: nothing to tear
        if (W.unlockLeft(x, a, TT) <= 0) {
          if (local.rip > 0) HUD.say(TX.relock, T.master, 1600);
          local.rip = 0;
          a.rip = 0;
          return ['E', TX.locked, false];
        }
        if (hurt && local.rip > 0) {
          local.rip = 0;
          HUD.say(TX.ripHurt, T.master, 1600);
          Sound.play('deflect');
        }
        if (Input.held('interact')) {
          local.rip += dt;
          local.ripId = ai;
          a.rip = Math.min(1, local.rip / RIP_T);
          local.ripSend -= dt;
          if (local.ripSend <= 0) {
            local.ripSend = 0.12;
            Net.send('ufoRip', [x.ph, ai, +a.rip.toFixed(2)]);
          }
          if (local.rip >= RIP_T) {
            local.rip = 0;
            c.act({ a: 'rip', ph: x.ph, i: ai });
          }
        } else local.rip = Math.max(0, local.rip - dt * 2);
        return ['E', TX.ripP + ' · ' + Math.round((local.rip / RIP_T) * 100) + ' %', true];
      }
      local.rip = 0;
      local.ripId = -1;
      // the posts that chain the anchors: the sword cuts them
      const post = (W.anchors[x.ph] || []).find((a) => a.alive && x.anc && x.anc[a.i] && Math.hypot(q.x - a.borne.pos.x, q.z - a.borne.pos.z) < 2.6 && q.y < 3);
      if (post && !mine) {
        if (r !== 'valet') return ['Clic', TX.cutNo, false];
        const left = W.unlockLeft(x, post, TT);
        if (Input.pressed('attack')) c.act({ a: 'cut', ph: x.ph, i: post.i });
        return ['Clic', left > 0 ? 'Chaîne tranchée · encore ' + Math.ceil(left) + ' s' : TX.cutP, false];
      }
      // a core on the ground
      if (!mine) {
        const k = list.find((o) => !o.by && Math.hypot(o.x - q.x, o.z - q.z) < 1.9 && Math.abs(o.y - q.y) < 2);
        if (k) {
          if (r !== 'valet') return ['E', TX.grabNo, false];
          if (Input.pressed('interact')) {
            c.act({ a: 'grab', id: k.id });
            if (!local.said.carry) {
              local.said.carry = true;
              HUD.say(TX.carry, T.master, 2600);
            }
          }
          return ['E', TX.grab, false];
        }
      }
      return null;
    },
  });
})();
