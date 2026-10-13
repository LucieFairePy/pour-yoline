// ♠ 5 · Les Lames (épreuve s5). Kits as usual: Yoline the dame kit (grapple, rifle), William the
// valet kit (sword, veil). Three parts: the hall of blades (one runs, one jams the traps from the
// gallery, then swap), the armoury (three waves of blade automatons), the Maître des Lames.
(() => {
  const T = CONFIG;
  const W = TrS5;
  const TX = {
    card: '♠ 5',
    title: 'Les Lames',
    boss: 'Le Maître des Lames',
    intro: 'Épreuve ♠ 5. La Forge des Lames : ici, tout coupe. Traversez le couloir, l’un en bas, l’autre en haut.',
    hall1: {
      dame: 'Le couloir des lames. Monte sur la passerelle (l’escalier à gauche). Chaque levier bloque un piège 4 secondes, un seul à la fois : dis à {mate} quand passer.',
      valet:
        'Le couloir des lames. Tu cours en bas, {mate} veille d’en haut : ses leviers bloquent un piège à la fois. Le tambour, lui, ne se lève que si {il} le bloque.',
    },
    hall2: {
      dame: 'À ton tour de courir. {mate} prend la passerelle de droite et bloque les pièges pour toi. Écoute-{le}.',
      valet: 'À ton tour de veiller : monte sur la passerelle de droite. Bloque les pièges pour {mate}, au bon moment.',
    },
    gateA: 'La grille s’ouvre quand {mate} est sur la passerelle.',
    gateB: 'La grille s’ouvre quand {mate} est sur la passerelle de droite.',
    gateAme: 'La grille s’ouvre dès que tu es sur la passerelle.',
    hit: 'Touché{e}. Retour au dernier repère.',
    drum: 'Le tambour ne se lève que si on le bloque d’en haut.',
    jamP: 'Bloquer {n} (4 s)',
    jamOn: 'Bloqué · encore {s} s',
    rearm: 'Le mécanisme se réarme…',
    busy: 'Un autre piège est déjà bloqué',
    jammed: '{N} bloqué{s} ! 4 secondes.',
    swap: 'Mi-chemin. On échange : l’autre passerelle, l’autre couloir.',
    armory: {
      dame: 'L’armurerie. Ton fusil abat les lames volantes et les duellistes. Les porte-boucliers, seul {mate} peut briser leur garde : achève-les ensuite.',
      valet: 'L’armurerie. Ton épée brise les boucliers (clic gauche) ; {mate} achève au fusil. Relevez-vous l’un l’autre (maintiens E).',
    },
    waves: ['Les Lames volantes', 'Les Duellistes', 'Les Porte-Boucliers'],
    waveSay: [
      'Les lames volantes. Elles visent, puis foncent : la ligne rouge, c’est leur trajet.',
      'Les duellistes. Ils se fendent en ligne droite, puis restent ouverts un instant.',
      'Les porte-boucliers. Les balles glissent dessus : l’épée d’abord.',
    ],
    cleared: 'L’armurerie se tait. La porte de la forge s’ouvre.',
    forgeGo: 'La forge, au fond. Le Maître vous attend.',
    bossObj: {
      dame: 'Le Maître des Lames. Ses plaques arrêtent tes balles. Quand {mate} brise sa garde à l’épée, son cœur s’ouvre : vise-le.',
      valet: 'Le Maître des Lames. Frappe-le à l’épée pour briser sa garde : son cœur s’ouvre, {mate} tire. Fuyez les zones rouges.',
    },
    phase2: 'Il lance ses lames. Elles reviennent vers lui : quittez leur ligne.',
    phase3: 'La forge se referme ! Le cercle de scies se resserre. Sautez par-dessus les rayons.',
    stunned: 'Garde brisée ! Le cœur est à découvert.',
    ring: 'Les scies. Restez au centre.',
    wipe: 'Vous êtes tombés tous les deux. On reprend.',
    won: 'Le Maître s’effondre. La forge s’éteint, et il pleut des étincelles.',
    cardObj: 'La carte ♠ 5 attend au cœur de la forge. Allez-y ensemble.',
  };
  CONFIG.cards.s5 = {
    corner: '5\n♠',
    big: '♠',
    title: 'Les Lames',
    sub: 'Épreuve ♠ · réussie',
    lines: [
      'Tout coupait, partout.',
      'L’un retenait les lames, l’autre passait. Puis l’inverse.',
      'Et au fond de la forge, un cœur de fer qu’on a brisé ensemble.',
    ],
  };

  // ======================= shared materials for the automatons =======================
  const EM = {};
  const emats = () => {
    if (EM.iron) return;
    EM.iron = Tex.mat('metal', { color: '#575166', scale: 1.2, metal: 0.5, rough: 0.5 });
    EM.dark = Tex.mat('metal', { color: '#2c2734', scale: 1.0, metal: 0.4, rough: 0.6 });
    EM.steel = new THREE.MeshStandardMaterial({ color: '#c4bfcf', metalness: 0.45, roughness: 0.3, emissive: '#221d2c', emissiveIntensity: 0.6 });
    EM.bronze = new THREE.MeshStandardMaterial({ color: '#a26f38', metalness: 0.45, roughness: 0.36, emissive: '#3a1e06', emissiveIntensity: 0.35 });
    EM.gold = new THREE.MeshStandardMaterial({ color: '#d0a94e', metalness: 0.5, roughness: 0.3, emissive: '#5a3c12', emissiveIntensity: 0.3 });
    EM.cloth = Tex.mat('fabric', { color: '#4a1226', scale: 3.5, rough: 0.95, bump: 0.4 });
    EM.edge = LvKit.glow('#ff9a4a', 0.85);
    EM.coal = LvKit.glow('#ff6a3a', 0.75);
  };
  const heartShape = (k, oy = 2.5) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const [x, y] = Heart.curve((i / 64) * Math.PI * 2);
      if (i) s.lineTo(x * k, (y - oy) * k);
      else s.moveTo(x * k, (y - oy) * k);
    }
    return s;
  };
  const eyeMat = () => new THREE.MeshBasicMaterial({ color: '#ff3a5a', toneMapped: false });
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // a long blade: steel body, hot edge, gold guard and grip (points along local -y from the hand)
  const sword = (len, w = 0.14) => {
    const g = new THREE.Group();
    add(g, new THREE.BoxGeometry(w, len, 0.05), EM.steel, 0, -len / 2 - 0.2, 0);
    add(g, new THREE.ConeGeometry(w * 0.72, 0.3, 4).rotateX(Math.PI).rotateY(Math.PI / 4), EM.steel, 0, -len - 0.35, 0).scale.z = 0.36;
    add(g, new THREE.BoxGeometry(0.03, len - 0.2, 0.06), EM.edge, w / 2, -len / 2 - 0.25, 0);
    add(g, new THREE.BoxGeometry(0.42, 0.07, 0.1), EM.gold, 0, -0.18, 0);
    add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), EM.dark, 0, 0, 0);
    return g;
  };

  // ======================= la Lame volante =======================
  const lameModel = () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    // a saw wheel standing on edge, along its dash direction (local +z), a heart eye in its hub
    const s = new THREE.Shape();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = i % 2 ? 0.68 : 0.52;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.22, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const wheel = new THREE.Group();
    body.add(wheel);
    add(wheel, new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }).translate(0, 0, -0.03).rotateY(Math.PI / 2), EM.steel, 0, 0, 0);
    add(wheel, new THREE.TorusGeometry(0.6, 0.025, 5, 40).rotateY(Math.PI / 2), EM.edge, 0, 0, 0);
    // the hub frame that holds it (does not spin)
    add(body, new THREE.TorusGeometry(0.24, 0.05, 6, 20).rotateY(Math.PI / 2), EM.gold, 0, 0, 0);
    const eye = add(body, new THREE.ExtrudeGeometry(heartShape(0.011), { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06).rotateY(Math.PI / 2), eyeMat(), 0, 0, 0);
    // two fins with little thrusters
    [-1, 1].forEach((sd) => {
      add(body, new THREE.BoxGeometry(0.06, 0.12, 0.5), EM.dark, sd * 0.2, 0.0, -0.1).rotation.z = sd * 0.3;
      add(body, new THREE.ConeGeometry(0.06, 0.18, 8).rotateX(Math.PI / 2), EM.coal, sd * 0.24, 0, -0.42);
    });
    return { g, body, eye, parts: { wheel } };
  };
  // host → guest: telegraphs, effects, knockbacks
  const tel = (pos, r, t) => {
    Enemies.telegraph(pos, r, t);
    Net.send('s5tel', [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), r, t]);
  };
  const telLine = (a, b, w, t) => {
    Enemies.telegraphLine(a, b, w, t);
    Net.send('s5tl', [a.x, a.y, a.z, b.x, b.y, b.z, w, t].map((v) => +v.toFixed(2)));
  };
  const telFan = (pos, yaw, h, r, t) => {
    W.fan(pos, yaw, h, r, t);
    Net.send('s5fan', [pos.x, pos.y, pos.z, yaw, h, r, t].map((v) => +v.toFixed(3)));
  };
  const bfx = (k, p) => {
    onBfx(k, p);
    Net.send('s5fx', [k, p ? [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)] : null]);
  };
  const knock = (who, v) => {
    if (who === Story.role) Player.body.v.set(v[0], v[1], v[2]);
    else Net.send('s5kn', [who, ...v.map((x) => +x.toFixed(2))]);
  };
  const onBfx = (k, p) => {
    if (Story.S && Story.S.phase !== 'tr_s5') return;
    const pos = p ? (p.isVector3 ? p : V3(p[0], p[1], p[2])) : null;
    if (k === 'spawn' && pos) {
      Fx.burst(pos.clone().add(V3(0, 1.2, 0)), '#ffb070', 40, 5, 0.6, -6);
      Sound.play('thud', pos);
    }
    if (k === 'dash') Sound.play('grappleOut');
    if (k === 'lunge' && pos) Sound.play('punch', pos);
    if (k === 'bash' && pos) {
      Sound.play('thud', pos);
      Cam.shake = Math.max(Cam.shake, 0.2);
    }
    if (k === 'break' && pos) {
      Sound.play('shieldDown');
      Fx.burst(pos.clone().add(V3(0, 1.3, 0)), '#ff5f8a', 40, 5, 0.6, -6);
    }
    if (k === 'sweep' && pos) {
      Sound.play('punch', pos);
      Sound.play('cut');
      Cam.shake = Math.max(Cam.shake, 0.3);
    }
    if (k === 'slam' && pos) {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.4);
      Fx.burst(pos.clone().add(V3(0, 0.3, 0)), '#ffcf8a', 80, 7, 0.8, -8);
    }
    if (k === 'spin' && pos) {
      Sound.play('grapple');
      Sound.play('punch', pos);
      Cam.shake = Math.max(Cam.shake, 0.3);
      Fx.burst(pos.clone().add(V3(0, 2, 0)), '#ffb070', 90, 9, 0.5, -4);
    }
    if (k === 'throw') Sound.play('grappleOut');
    if (k === 'roar') Sound.play('roar');
    if (k === 'stun') {
      Sound.play('shatter');
      Sound.play('thud', pos);
      Cam.shake = 0.3;
      HUD.say(TX.stunned, T.master, 1600);
    }
    if (k === 'crack' && pos) {
      Sound.play('deflect');
      Fx.burst(pos.clone().add(V3(0, 3, 0)), '#ffcf8a', 12, 3, 0.3, 0);
    }
    if (k === 'phase2') {
      Sound.play('roar');
      HUD.say(TX.phase2, TX.boss, 2600);
    }
    if (k === 'phase3') {
      Sound.play('roar');
      Sound.play('door');
      Cam.shake = 0.5;
      HUD.say(TX.phase3, TX.boss, 3000);
    }
  };
  Net.on('s5tel', (d) => Story.S && Story.S.phase === 'tr_s5' && Enemies.telegraph(V3(d[0], d[1], d[2]), d[3], d[4]));
  Net.on('s5tl', (d) => Story.S && Story.S.phase === 'tr_s5' && Enemies.telegraphLine(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5]), d[6], d[7]));
  Net.on('s5fan', (d) => Story.S && Story.S.phase === 'tr_s5' && W.fan(V3(d[0], d[1], d[2]), d[3], d[4], d[5], d[6]));
  Net.on('s5fx', (d) => onBfx(d[0], d[1]));
  Net.on('s5kn', (d) => d[0] === Story.role && Player.body.v.set(d[1], d[2], d[3]));
  Net.on('s5boom', (d) => Story.S && Story.S.phase === 'tr_s5' && W.boomerang({ x: d[0], y: d[1], z: d[2], dx: d[3], dz: d[4], t0: d[5] }));

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
  // keep an automaton inside the armoury
  const keepIn = (e, r = W.ARM_R - 1.4) => {
    const c = W.P(W.ARM_C.x, 0, W.ARM_C.z);
    const dx = e.pos.x - c.x;
    const dz = e.pos.z - c.z;
    const d = Math.hypot(dx, dz);
    if (d > r) {
      e.pos.x = c.x + (dx / d) * r;
      e.pos.z = c.z + (dz / d) * r;
      return true;
    }
    return false;
  };
  // the pillars of the armoury stop a dash (their centres at 9.5 m on the diagonals)
  const PILLARS = [0.79, 2.36, 3.93, 5.5].map((a) => [W.ARM_C.x + Math.cos(a) * 9.5, W.ARM_C.z + Math.sin(a) * 9.5]);
  const inPillar = (p) => PILLARS.some(([x, z]) => Math.abs(p.x - (W.O.x + x)) < 1.2 && Math.abs(p.z - (W.O.z + z)) < 1.2);
  const segHit = (p, a, b, w) => {
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const l2 = abx * abx + abz * abz || 1;
    const k = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2));
    return Math.hypot(p.x - (a.x + abx * k), p.z - (a.z + abz * k)) < w;
  };

  Enemies.define('lame', {
    stats: { hp: 36, speed: 5, radius: 0.6, hitR: 0.8, height: 1.4, reach: 3.0, stunP: 1.6, dieColor: '#ffb070' },
    model: lameModel,
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      if (!e.st) e.st = 0;
      if (e.oa == null) {
        e.oa = Math.random() * Math.PI * 2;
        e.dir = Math.random() < 0.5 ? -1 : 1;
      }
      if (e.stun > 0) {
        e.st = 0;
        return;
      }
      const [tg] = nearest(e, targets);
      if (!tg) return;
      if (e.st === 0) {
        // circle the nearest player at 6 m, then line up a dash
        e.oa += dt * 0.8 * e.dir;
        const want = V3(tg.pos.x + Math.cos(e.oa) * 6.5, 0, tg.pos.z + Math.sin(e.oa) * 6.5);
        const dx = want.x - e.pos.x;
        const dz = want.z - e.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.2) {
          const sp = Math.min(d, 5.5 * dt);
          e.pos.x += (dx / d) * sp;
          e.pos.z += (dz / d) * sp;
        }
        keepIn(e);
        e.yaw = angleDamp(e.yaw, Math.atan2(tg.pos.x - e.pos.x, tg.pos.z - e.pos.z), 6, dt);
        if (e.atk <= 0) {
          e.st = 1;
          e.t = 0.8;
          const ax = tg.pos.x - e.pos.x;
          const az = tg.pos.z - e.pos.z;
          const al = Math.hypot(ax, az) || 1;
          e.ax = ax / al;
          e.az = az / al;
          e.yaw = Math.atan2(e.ax, e.az);
          e.from = e.pos.clone();
          telLine(e.pos, V3(e.pos.x + e.ax * 12, e.pos.y, e.pos.z + e.az * 12), 1.4, 0.8);
        }
      } else if (e.st === 1) {
        if (e.t <= 0) {
          e.st = 2;
          e.t = 0.6;
          e.hit = [];
          bfx('dash', e.pos);
        }
      } else if (e.st === 2) {
        e.pos.x += e.ax * 20 * dt;
        e.pos.z += e.az * 20 * dt;
        players.forEach((p) => {
          if (p.down || e.hit.includes(p.who)) return;
          if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 1.1) {
            e.hit.push(p.who);
            Combat.hurt(p.who, 14, e.pos);
            knock(p.who, [e.ax * 7, 4, e.az * 7]);
          }
        });
        if (keepIn(e) || inPillar(e.pos) || e.t <= 0) {
          e.st = 3;
          e.t = 0.9;
        }
      } else if (e.st === 3 && e.t <= 0) {
        e.st = 0;
        e.atk = 2.6 + Math.random() * 1.8;
      }
    },
    render(e, m, dt, t) {
      m.g.position.y += 1.25 + Math.sin(t * 4 + e.id) * 0.1;
      const sp = e.st === 1 ? 30 : e.st === 2 ? 40 : 8;
      m.parts.wheel.rotation.x -= dt * sp;
      m.body.rotation.z = e.st === 1 ? Math.sin(t * 40) * 0.05 : 0;
    },
  });

  // ======================= le Duelliste et le Porte-Bouclier =======================
  const knightModel = (shielded) => () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const k = shielded ? 1.18 : 1;
    // legs
    const legs = [-0.22, 0.22].map((x) => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.95, 0);
      body.add(leg);
      add(leg, new THREE.CylinderGeometry(0.11, 0.09, 0.5, 8), EM.iron, 0, -0.25, 0);
      add(leg, new THREE.SphereGeometry(0.1, 8, 6), EM.gold, 0, -0.52, 0);
      add(leg, new THREE.CylinderGeometry(0.09, 0.12, 0.4, 8), EM.iron, 0, -0.75, 0);
      add(leg, new THREE.BoxGeometry(0.2, 0.08, 0.32), EM.dark, 0, -0.93, 0.05);
      return leg;
    });
    // hips, torso (a narrow barrel with a heart-shaped coal behind a grille), tabard
    add(body, new THREE.CylinderGeometry(0.28, 0.3, 0.2, 14), EM.dark, 0, 1.0, 0);
    const torso = new THREE.Group();
    torso.position.y = 1.42;
    body.add(torso);
    add(torso, new THREE.CylinderGeometry(0.36, 0.26, 0.7, 16), shielded ? EM.bronze : EM.iron, 0, 0, 0);
    add(torso, new THREE.ExtrudeGeometry(heartShape(0.006), { depth: 0.05, bevelEnabled: false }), EM.coal, 0, 0.05, 0.31);
    [-0.06, 0.06].forEach((x) => add(torso, new THREE.BoxGeometry(0.02, 0.2, 0.03), EM.dark, x, 0.05, 0.35));
    add(torso, new THREE.TorusGeometry(0.34, 0.03, 5, 24).rotateX(Math.PI / 2), EM.gold, 0, 0.3, 0);
    const tab = add(body, new THREE.PlaneGeometry(0.4, 0.6), EM.cloth, 0, 0.78, 0.29);
    tab.material = EM.cloth;
    // head: a visored helm with a red slit and a crest of little blades
    const head = new THREE.Group();
    head.position.y = 1.95;
    body.add(head);
    add(head, new THREE.CylinderGeometry(0.17, 0.2, 0.32, 12), EM.iron, 0, 0, 0);
    add(head, new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), EM.iron, 0, 0.16, 0);
    const eye = add(head, new THREE.BoxGeometry(0.22, 0.035, 0.03), eyeMat(), 0, 0.02, 0.19);
    for (let i = 0; i < 5; i++) add(head, new THREE.BoxGeometry(0.02, 0.18 - Math.abs(i - 2) * 0.03, 0.12), EM.steel, 0, 0.36, -0.08 + i * 0.05);
    // arms
    const arm = (sd) => {
      const sh = new THREE.Group();
      sh.position.set(sd * 0.44, 1.68, 0);
      body.add(sh);
      add(sh, new THREE.SphereGeometry(0.13, 10, 8), EM.gold, 0, 0, 0);
      add(sh, new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8), EM.iron, 0, -0.24, 0);
      const el = new THREE.Group();
      el.position.y = -0.48;
      sh.add(el);
      add(el, new THREE.SphereGeometry(0.08, 8, 6), EM.gold, 0, 0, 0);
      add(el, new THREE.CylinderGeometry(0.07, 0.08, 0.38, 8), EM.iron, 0, -0.2, 0);
      const hand = new THREE.Group();
      hand.position.y = -0.42;
      el.add(hand);
      return { sh, el, hand };
    };
    const R_ = arm(1);
    const L_ = arm(-1);
    const bladeR = sword(shielded ? 0.8 : 1.15);
    bladeR.rotation.x = -Math.PI / 2;
    R_.hand.add(bladeR);
    let shield = null;
    if (shielded) {
      // a tall heart-shaped tower shield, point down
      shield = new THREE.Group();
      shield.position.set(-0.1, 0.0, 0.4);
      L_.hand.add(shield);
      const hs = heartShape(0.05, 1.2);
      add(shield, new THREE.ExtrudeGeometry(hs, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), EM.dark, 0, 0.1, 0).rotation.z = Math.PI;
      const rim = add(shield, new THREE.ExtrudeGeometry(heartShape(0.054, 1.2), { depth: 0.04, bevelEnabled: false }), EM.gold, 0, 0.1, -0.03);
      rim.rotation.z = Math.PI;
      const sp = new THREE.Shape();
      sp.moveTo(0, 0.22);
      sp.lineTo(0.14, 0);
      sp.lineTo(0, -0.22);
      sp.lineTo(-0.14, 0);
      sp.closePath();
      add(shield, new THREE.ExtrudeGeometry(sp, { depth: 0.04, bevelEnabled: false }), EM.edge, 0, 0.0, 0.13);
    } else {
      const bladeL = sword(1.0);
      bladeL.rotation.x = -Math.PI / 2;
      L_.hand.add(bladeL);
    }
    body.scale.setScalar(k);
    return { g, body, bodyScale: k, eye, shield, parts: { legs, torso, head, R: R_, L: L_ } };
  };
  // shared brain for both knights: walk in, telegraph, lunge (or charge), stay open a moment
  const knightSim = (o) => (e, dt, players, targets) => {
    e.t = (e.t || 0) - dt;
    if (!e.st) e.st = 0;
    if (e.stun > 0) {
      e.st = 0;
      e.walk = 0;
      return;
    }
    const [tg, d] = nearest(e, targets);
    if (e.st === 0) {
      if (!tg) return;
      e.yaw = angleDamp(e.yaw, Math.atan2(tg.pos.x - e.pos.x, tg.pos.z - e.pos.z), 5, dt);
      if (d > o.range * 0.75) {
        const sp = o.speed * dt;
        e.pos.x += Math.sin(e.yaw) * sp;
        e.pos.z += Math.cos(e.yaw) * sp;
        if (inPillar(e.pos)) {
          e.pos.x -= Math.sin(e.yaw) * sp;
          e.pos.z -= Math.cos(e.yaw) * sp;
          e.pos.x += Math.cos(e.yaw) * sp;
          e.pos.z -= Math.sin(e.yaw) * sp;
        }
        keepIn(e);
        e.walk = 1;
      } else e.walk = 0;
      if (e.atk <= 0 && d < o.range) {
        e.st = 1;
        e.t = o.tel;
        e.ax = Math.sin(e.yaw);
        e.az = Math.cos(e.yaw);
        const ax = tg.pos.x - e.pos.x;
        const az = tg.pos.z - e.pos.z;
        const al = Math.hypot(ax, az) || 1;
        e.ax = ax / al;
        e.az = az / al;
        e.yaw = Math.atan2(e.ax, e.az);
        e.from = e.pos.clone();
        e.to = V3(e.pos.x + e.ax * o.len, e.pos.y, e.pos.z + e.az * o.len);
        telLine(e.from, e.to, o.w * 2, o.tel);
      }
    } else if (e.st === 1) {
      if (e.t <= 0) {
        e.st = 2;
        e.t = o.len / o.dash;
        e.hit = [];
        bfx(o.fx, e.pos);
      }
    } else if (e.st === 2) {
      e.pos.x += e.ax * o.dash * dt;
      e.pos.z += e.az * o.dash * dt;
      players.forEach((p) => {
        if (p.down || e.hit.includes(p.who)) return;
        if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < o.w + 0.4) {
          e.hit.push(p.who);
          Combat.hurt(p.who, o.dmg, e.pos);
          knock(p.who, [e.ax * o.kb, 4.5, e.az * o.kb]);
        }
      });
      if (keepIn(e) || inPillar(e.pos) || e.t <= 0) {
        if (inPillar(e.pos)) {
          e.pos.x -= e.ax * o.dash * dt;
          e.pos.z -= e.az * o.dash * dt;
        }
        e.st = 3;
        e.t = o.open;
      }
    } else if (e.st === 3 && e.t <= 0) {
      e.st = 0;
      e.atk = o.cd + Math.random() * 1.2;
    }
  };
  const knightRender = (e, m, dt, t) => {
    const P_ = m.parts;
    const a = (e._a = e._a || { ph: 0, wasStun: false });
    const walking = e.st === 0 && (e.snaps ? true : e.walk);
    a.ph += dt * (walking ? 8 : 0);
    P_.legs[0].rotation.x = Math.sin(a.ph) * 0.5 * (walking ? 1 : 0);
    P_.legs[1].rotation.x = -Math.sin(a.ph) * 0.5 * (walking ? 1 : 0);
    const st = e.st || 0;
    let rx = -0.4;
    let lx = -0.3;
    let lean = 0;
    if (st === 1) {
      // coiled: blade drawn back, leaning in
      rx = 0.9;
      lean = 0.25;
      lx = -0.9;
    } else if (st === 2) {
      rx = -1.6;
      lx = -1.2;
      lean = 0.45;
    } else if (st === 3) {
      rx = 0.3;
      lean = -0.1;
      lx = 0.2;
    }
    if (e.stun > 0) {
      rx = 0.4;
      lx = 0.5;
      lean = -0.25;
    }
    P_.R.sh.rotation.x = damp(P_.R.sh.rotation.x, rx, st === 2 ? 30 : 8, dt);
    P_.L.sh.rotation.x = damp(P_.L.sh.rotation.x, lx, 8, dt);
    P_.R.el.rotation.x = st === 1 ? -0.9 : -0.3;
    P_.L.el.rotation.x = -0.6;
    m.body.rotation.x = damp(m.body.rotation.x, lean, 8, dt);
    P_.head.rotation.y = Math.sin(t * 1.3 + e.id) * 0.2;
    if (e.stun > 0 && !a.wasStun && m.shield) Fx.burst(e.pos.clone().add(V3(0, 1.3, 0)), '#ff5f8a', 30, 5, 0.5, -6);
    a.wasStun = e.stun > 0;
  };
  Enemies.define('duelliste', {
    stats: { hp: 70, speed: 3.2, radius: 0.7, hitR: 0.9, height: 2.2, reach: 3.2, stunP: 2.2, dieColor: '#ffb070' },
    model: knightModel(false),
    sim: knightSim({ speed: 3.2, range: 6.5, tel: 0.75, len: 7.5, dash: 30, w: 0.9, dmg: 18, kb: 8, open: 1.2, cd: 2.4, fx: 'lunge' }),
    render: knightRender,
  });
  Enemies.define('bouclier', {
    stats: { hp: 90, speed: 2.4, radius: 0.85, hitR: 1.05, height: 2.5, reach: 3.4, stunP: 3.4, dieColor: '#ff5f8a' },
    model: knightModel(true),
    // the shield turns bullets; a sword blow breaks the guard (the engine stuns it), then all hurts
    mult(e, weak, stun) {
      if (stun) {
        if (!e.broke) bfx('break', e.pos);
        e.broke = true;
        return 0.5;
      }
      if (e.stun > 0) return 1.2;
      e.broke = false;
      return 0;
    },
    sim: knightSim({ speed: 2.4, range: 8, tel: 1.0, len: 9, dash: 20, w: 1.0, dmg: 20, kb: 11, open: 1.4, cd: 3.0, fx: 'bash' }),
    render(e, m, dt, t) {
      knightRender(e, m, dt, t);
      if (!(e.stun > 0)) e.broke = false;
    },
  });

  // ======================= le Maître des Lames (boss) =======================
  const bossModel = () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    // base: a turning forge ring on four clawed feet
    const base = new THREE.Group();
    body.add(base);
    add(base, new THREE.CylinderGeometry(2.0, 2.3, 0.6, 40), EM.dark, 0, 0.3, 0);
    add(base, new THREE.TorusGeometry(2.05, 0.1, 8, 48).rotateX(Math.PI / 2), EM.coal, 0, 0.62, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const claw = add(base, new THREE.ConeGeometry(0.28, 1.1, 5).rotateZ(-Math.PI / 2), EM.steel, Math.cos(a) * 2.35, 0.2, Math.sin(a) * 2.35);
      claw.rotation.y = -a;
    }
    // a skirt of hanging blades
    const skirt = new THREE.Group();
    skirt.position.y = 1.5;
    body.add(skirt);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const b = add(skirt, new THREE.BoxGeometry(0.34, 1.4, 0.05), EM.steel, Math.cos(a) * 1.35, -0.3, Math.sin(a) * 1.35);
      b.rotation.y = -a + Math.PI / 2;
      b.rotation.x = 0.18;
    }
    add(body, new THREE.CylinderGeometry(1.1, 1.5, 1.4, 24), EM.iron, 0, 1.4, 0);
    // torso: a forge barrel with gold bands; the heart in a cage at the front
    const torso = new THREE.Group();
    torso.position.y = 3.3;
    body.add(torso);
    add(torso, new THREE.CylinderGeometry(1.35, 1.05, 2.4, 32), EM.bronze, 0, 0, 0);
    [-0.85, 0, 0.85].forEach((y) => add(torso, new THREE.TorusGeometry(1.27 - y * 0.12, 0.07, 6, 40).rotateX(Math.PI / 2), EM.gold, 0, y, 0));
    // coal vents
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      if (Math.abs(Math.sin(a) - 1) < 0.3) continue;
      add(torso, new THREE.BoxGeometry(0.1, 0.5, 0.06), EM.coal, Math.cos(a) * 1.22, -0.45, Math.sin(a) * 1.22).rotation.y = -a + Math.PI / 2;
    }
    const core = new THREE.Group();
    core.position.set(0, 0.15, 1.18);
    torso.add(core);
    add(torso, new THREE.CylinderGeometry(0.72, 0.72, 0.25, 32).rotateX(Math.PI / 2), EM.dark, 0, 0.15, 1.12);
    const heartMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(1.2), toneMapped: false });
    const heart = new THREE.Mesh(
      new THREE.ExtrudeGeometry(heartShape(0.026), { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }),
      heartMat,
    );
    heart.position.z = -0.12;
    core.add(heart);
    const gal = Heart.galaxy(3000, 4, 59);
    gal.group.scale.setScalar(0.024);
    gal.core.material.opacity = 0;
    gal.U.uFade.value = 0.65;
    core.add(gal.group);
    // the cage: six blades over the heart that fan open when the guard breaks
    const cage = [];
    for (let i = 0; i < 6; i++) {
      const piv = new THREE.Group();
      const a = (i / 6) * Math.PI * 2;
      piv.position.set(0, 0.15, 1.32);
      piv.rotation.z = a;
      torso.add(piv);
      const b = add(piv, new THREE.BoxGeometry(0.12, 0.78, 0.06), EM.steel, 0, 0.36, 0);
      add(piv, new THREE.BoxGeometry(0.03, 0.7, 0.07), EM.edge, 0.06, 0.36, 0);
      cage.push({ piv, b });
    }
    // shoulders and four arms: two great blades above, two hooked blades below
    const mkArm = (sd, y, len, upper) => {
      const sh = new THREE.Group();
      sh.position.set(sd * (upper ? 1.55 : 1.3), y, 0);
      body.add(sh);
      add(sh, new THREE.SphereGeometry(upper ? 0.48 : 0.36, 14, 10), EM.iron, 0, 0, 0);
      if (upper) {
        const pd = add(sh, new THREE.ExtrudeGeometry(heartShape(0.02), { depth: 0.12, bevelEnabled: false }), EM.gold, 0, 0.42, 0);
        pd.rotation.set(-Math.PI / 2, 0, Math.PI + sd * 0.3);
      }
      add(sh, new THREE.CylinderGeometry(0.26, 0.2, 1.2, 10), EM.iron, 0, -0.65, 0);
      const el = new THREE.Group();
      el.position.y = -1.3;
      sh.add(el);
      add(el, new THREE.SphereGeometry(0.24, 10, 8), EM.gold, 0, 0, 0);
      add(el, new THREE.CylinderGeometry(0.2, 0.24, 1.0, 10), EM.iron, 0, -0.5, 0);
      const hand = new THREE.Group();
      hand.position.y = -1.05;
      el.add(hand);
      const bl = sword(len, upper ? 0.32 : 0.22);
      bl.rotation.x = -Math.PI / 2;
      hand.add(bl);
      return { sh, el, hand, bl };
    };
    const arms = [mkArm(-1, 4.3, 3.2, true), mkArm(1, 4.3, 3.2, true), mkArm(-1, 3.0, 2.2, false), mkArm(1, 3.0, 2.2, false)];
    // head: a crowned helm, a red visor, a halo of small blades turning behind it
    const head = new THREE.Group();
    head.position.y = 5.15;
    body.add(head);
    add(head, new THREE.CylinderGeometry(0.5, 0.58, 0.9, 18), EM.iron, 0, 0, 0);
    add(head, new THREE.SphereGeometry(0.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), EM.iron, 0, 0.45, 0);
    const eye = add(head, new THREE.BoxGeometry(0.66, 0.08, 0.06), eyeMat(), 0, 0.1, 0.53);
    const halo = new THREE.Group();
    halo.position.set(0, 0.5, -0.5);
    head.add(halo);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const b = add(halo, new THREE.BoxGeometry(0.08, 0.7, 0.03), EM.steel, Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0);
      b.rotation.z = a - Math.PI / 2;
    }
    add(halo, new THREE.TorusGeometry(0.62, 0.04, 6, 32), EM.gold, 0, 0, 0);
    // seams that run red in the last phase
    const veins = [-0.5, 0.5].map((y) => add(torso, new THREE.TorusGeometry(1.24 - y * 0.08, 0.03, 4, 48).rotateX(Math.PI / 2), LvKit.glow('#ffcf8a', 0.85), 0, y, 0));
    body.scale.setScalar(1.2);
    return { g, body, bodyScale: 1.2, heart: core, eye, parts: { base, skirt, torso, cage, arms, head, halo, veins, heartMat, gal } };
  };

  // shared clock (seconds). The host is the truth; the guest extrapolates and eases.
  const local = {
    T: 0,
    stage: 0,
    sync: 0,
    seen: {},
    said: {},
    pad: null,
    inv: 0,
    hitCd: 0,
    ringCd: 0,
    clearT: 0,
    pending: 0,
    waveTok: 0,
    retry: false,
    wipe: 0,
    bossT: 0,
    bossOn: false,
    bossHp: 0,
    winT: 0,
    done: 0,
    boomHit: new Set(),
  };
  const lat = () => Math.min(0.25, (Net.rtt || 80) / 2000);
  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: me ? Combat.cloak > 0 : !!rs.cloak };
    });

  const BOSS_HP = 3000;
  const PH_AT = [0, 1, 0.66, 0.33];
  const GUARD = { 1: 4, 2: 5, 3: 5 };
  const ATTACKS = {
    1: ['sweep', 'slam', 'spin', 'sweep', 'slam'],
    2: ['boom', 'sweep', 'slam', 'boom', 'spin', 'sweep'],
    3: ['sweep', 'boom', 'slam', 'spin', 'boom', 'slam'],
  };
  Enemies.define('maitre', {
    stats: { hp: BOSS_HP, speed: 0, radius: 2.4, hitR: 2.8, height: 7.0, boss: true, reach: 5.4, stunP: 3.4, weakR: 1.15, dieColor: '#ffcf8a' },
    model: bossModel,
    // His plates stop bullets. Sword blows crack his guard (4, then 5, within a few seconds); a
    // broken guard stuns him, the cage over his heart opens and the heart takes the rifle at 3x.
    // One opening is worth at most 12% of his life.
    mult(e, weak, stun) {
      if (stun) {
        if (e.stun > 0) return 1;
        if (e.cool > 0) return 0.3;
        e.guard = (e.guard || 0) + 1;
        e.guardT = 4;
        if (e.guard >= GUARD[e.ph || 1]) {
          e.guard = 0;
          e.stun = 3.8;
          e.win = 0;
          e.st = 6;
          bfx('stun', e.pos);
        } else bfx('crack', e.pos);
        return 0.3;
      }
      if (e.stun > 0) {
        e.win = (e.win || 0) + (weak ? 27 : 9);
        if (e.win >= e.max * 0.12) e.stun = Math.min(e.stun, 0.05);
        return weak ? 3 : 1;
      }
      return 0;
    },
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      e.stunImm = 99;
      if (!e.ph) e.ph = 1;
      e.guardT = (e.guardT || 0) - dt;
      if (e.guardT <= 0) e.guard = 0;
      e.cool = Math.max(0, (e.cool || 0) - dt);
      e.phase = e.ph + 10 * (e.guard || 0);
      if (e.stun > 0) {
        e.shield = false;
        e.st = 6;
        // staggered, he turns his open chest toward the farthest player: the rifle's shot
        let far = null;
        let fd = -1;
        players.forEach((p) => {
          const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          if (!p.down && d > fd) {
            fd = d;
            far = p;
          }
        });
        if (far) e.yaw = angleDamp(e.yaw, Math.atan2(far.pos.x - e.pos.x, far.pos.z - e.pos.z), 2.5, dt);
        return;
      }
      if (e.st === 6) {
        e.st = 4;
        e.t = 0.8;
        e.cool = 1.6;
      }
      e.shield = true;
      const next = e.ph < 3 && e.hp < e.max * PH_AT[e.ph + 1];
      if (next) {
        e.ph += 1;
        e.phase = e.ph;
        e.st = 5;
        e.t = 2.0;
        bfx(e.ph === 2 ? 'phase2' : 'phase3', e.pos);
        if (e.ph === 3) Story.ctx.set((s) => (s.x.p3 = +local.T.toFixed(2)));
        return;
      }
      const [best] = nearest(e, targets);
      const P2 = e.ph >= 2;
      const P3 = e.ph === 3;
      if (best && e.st !== 2) e.yaw = angleDamp(e.yaw, Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z), P3 ? 3.5 : 2.6, dt);
      if (e.st === 0 || e.st == null) {
        e.st = 0;
        if (e.atk > 0 || !best) return;
        const list = ATTACKS[e.ph];
        e.ai = ((e.ai || 0) + 1) % list.length;
        const k = list[e.ai];
        if (k === 'sweep') {
          e.st = 2;
          e.t = P3 ? 1.05 : P2 ? 1.2 : 1.35;
          e.yaw = Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z);
          telFan(e.pos, e.yaw, 1.15, 10, e.t);
        } else if (k === 'slam') {
          e.st = 1;
          e.t = P3 ? 1.15 : 1.4;
          e.marks = players.filter((p) => !p.down).map((p) => V3(p.pos.x, p.pos.y, p.pos.z));
          e.marks.forEach((m) => tel(m, 2.6, e.t));
        } else if (k === 'spin') {
          e.st = 3;
          e.t = P3 ? 0.95 : 1.15;
          tel(V3(e.pos.x, e.pos.y, e.pos.z), 6.4, e.t);
        } else if (k === 'boom') {
          e.st = 7;
          e.t = 0.85;
          const ts = players.filter((p) => !p.down);
          e.lines = ts.map((p) => {
            const dx = p.pos.x - e.pos.x;
            const dz = p.pos.z - e.pos.z;
            const l = Math.hypot(dx, dz) || 1;
            return [dx / l, dz / l];
          });
          if (P3 && e.lines.length) {
            const [dx, dz] = e.lines[0];
            const a = Math.atan2(dx, dz) + 0.7;
            e.lines.push([Math.sin(a), Math.cos(a)]);
          }
          e.lines.forEach(([dx, dz]) => telLine(e.pos, V3(e.pos.x + dx * W.BOOM.out, e.pos.y, e.pos.z + dz * W.BOOM.out), 2.0, 0.85));
        }
        return;
      }
      if (e.t > 0) return;
      const hurtAll = (test, dmg, kb) =>
        players.forEach((p) => {
          if (p.down || !test(p.pos)) return;
          Combat.hurt(p.who, dmg, e.pos);
          if (kb) {
            const dx = p.pos.x - e.pos.x;
            const dz = p.pos.z - e.pos.z;
            const l = Math.hypot(dx, dz) || 1;
            knock(p.who, [(dx / l) * kb, 5.5, (dz / l) * kb]);
          }
        });
      if (e.st === 2) {
        bfx('sweep', e.pos);
        const fx = Math.sin(e.yaw);
        const fz = Math.cos(e.yaw);
        hurtAll(
          (q) => {
            const dx = q.x - e.pos.x;
            const dz = q.z - e.pos.z;
            const d = Math.hypot(dx, dz);
            return d < 10.3 && d > 0.5 && (dx * fx + dz * fz) / d > Math.cos(1.15) && q.y < e.pos.y + 3;
          },
          22,
          9,
        );
        e.st = 4;
        e.t = 1.0;
      } else if (e.st === 1) {
        e.marks.forEach((m) => {
          bfx('slam', m);
          hurtAll((q) => Math.hypot(q.x - m.x, q.z - m.z) < 2.6 && Math.abs(q.y - m.y) < 2.2, 24, 0);
        });
        e.st = 4;
        e.t = 1.1;
      } else if (e.st === 3) {
        bfx('spin', e.pos);
        hurtAll((q) => Math.hypot(q.x - e.pos.x, q.z - e.pos.z) < 6.4 && q.y < e.pos.y + 3, 20, 10);
        e.st = 4;
        e.t = 1.0;
      } else if (e.st === 7) {
        bfx('throw', e.pos);
        const t0 = +local.T.toFixed(2);
        e.lines.forEach(([dx, dz]) => {
          const b = [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2), +dx.toFixed(3), +dz.toFixed(3), t0];
          W.boomerang({ x: b[0], y: b[1], z: b[2], dx: b[3], dz: b[4], t0 });
          Net.send('s5boom', b);
        });
        e.st = 4;
        e.t = 1.4;
      } else if (e.st === 4 || e.st === 5) {
        e.st = 0;
        e.atk = P3 ? 1.1 + Math.random() * 0.6 : P2 ? 1.0 + Math.random() * 0.6 : 1.5 + Math.random() * 0.8;
      }
    },
    render(e, m, dt, t) {
      const P_ = m.parts;
      const a = (e._a = e._a || { sweep: 0, slam: 0, spin: 0, throwT: 0, open: 0, prev: 0, sp: 0 });
      const st = e.st || 0;
      if (a.prev === 2 && st !== 2) a.sweep = 0.45;
      if (a.prev === 1 && st !== 1) a.slam = 0.35;
      if (a.prev === 3 && st !== 3) a.spin = 0.6;
      if (a.prev === 7 && st !== 7) a.throwT = 0.4;
      a.prev = st;
      a.sweep = Math.max(0, a.sweep - dt);
      a.slam = Math.max(0, a.slam - dt);
      a.spin = Math.max(0, a.spin - dt);
      a.throwT = Math.max(0, a.throwT - dt);
      const stunned = e.stun > 0;
      a.open = damp(a.open, stunned ? 1 : 0, 8, dt);
      // the torso winds up during a spin and whips round on release
      a.sp += dt * (st === 3 ? 2 : a.spin > 0 ? 22 : 0);
      P_.torso.rotation.y = st === 3 ? -Math.sin(t * 10) * 0.08 - 0.4 : a.spin > 0 ? a.sp : damp(P_.torso.rotation.y % (Math.PI * 2), 0, 4, dt);
      P_.base.rotation.y = t * 0.4;
      P_.skirt.rotation.y = -t * 0.25;
      P_.halo.rotation.z = t * (stunned ? 0.3 : 1.6);
      m.body.position.y = Math.sin(t * 1.4) * 0.08 - a.open * 0.4;
      P_.head.rotation.x = a.open * 0.4;
      // the cage fans open on the heart when stunned
      P_.cage.forEach((c, i) => {
        c.b.position.y = 0.36 + a.open * 0.55;
        c.piv.scale.setScalar(1 - a.open * 0.15);
        c.b.rotation.z = a.open * 0.5 * (i % 2 ? 1 : -1);
      });
      P_.heartMat.color.set('#ff5f8a').multiplyScalar(0.22 + a.open * 0.5 + Math.sin(t * 6) * 0.05 * (0.3 + a.open));
      P_.gal.group.visible = a.open > 0.2;
      P_.gal.U.uTime.value = t;
      P_.gal.U.uPx.value = R.renderer.getPixelRatio() * 0.18;
      P_.gal.U.uBeat.value = a.open * (0.5 + 0.5 * Math.sin(t * 8));
      // arm poses per attack
      const pose = (arm, x, z, k = 8) => {
        arm.sh.rotation.x = damp(arm.sh.rotation.x, x, k, dt);
        arm.sh.rotation.z = damp(arm.sh.rotation.z, z, k, dt);
      };
      const [UL, UR, LL, LR] = P_.arms;
      if (stunned) {
        pose(UL, 0.3, 0.5);
        pose(UR, 0.3, -0.5);
        pose(LL, 0.2, 0.3);
        pose(LR, 0.2, -0.3);
      } else if (st === 2) {
        // great blades drawn back to one side, about to sweep
        pose(UL, -1.4, 1.5);
        pose(UR, -1.4, 0.9);
        pose(LL, -0.4, 0.4);
        pose(LR, -0.4, -0.4);
      } else if (a.sweep > 0) {
        const k = 1 - a.sweep / 0.45;
        pose(UL, -1.4, 1.5 - k * 2.4, 30);
        pose(UR, -1.4, 0.9 - k * 2.4, 30);
      } else if (st === 1) {
        pose(UL, -2.9, 0.2);
        pose(UR, -2.9, -0.2);
        pose(LL, -2.4, 0.1);
        pose(LR, -2.4, -0.1);
      } else if (a.slam > 0) {
        const k = 1 - a.slam / 0.35;
        pose(UL, -2.9 + k * 2.2, 0.2, 30);
        pose(UR, -2.9 + k * 2.2, -0.2, 30);
        pose(LL, -2.4 + k * 1.8, 0.1, 30);
        pose(LR, -2.4 + k * 1.8, -0.1, 30);
      } else if (st === 3 || a.spin > 0) {
        pose(UL, -1.57, 1.5, 12);
        pose(UR, -1.57, -1.5, 12);
        pose(LL, -1.4, 1.3, 12);
        pose(LR, -1.4, -1.3, 12);
      } else if (st === 7) {
        pose(LL, 0.9, 0.6);
        pose(LR, 0.9, -0.6);
        pose(UL, -0.5, 0.4);
        pose(UR, -0.5, -0.4);
      } else if (a.throwT > 0) {
        pose(LL, -1.6, 0.2, 30);
        pose(LR, -1.6, -0.2, 30);
      } else {
        pose(UL, -0.5 + Math.sin(t * 1.2) * 0.06, 0.35);
        pose(UR, -0.5 - Math.sin(t * 1.2) * 0.06, -0.35);
        pose(LL, -0.3, 0.25);
        pose(LR, -0.3, -0.25);
      }
      P_.arms.forEach((arm) => (arm.el.rotation.x = stunned ? 0 : -0.5));
      // the lower blades leave the hands while thrown (they fly as the boomerangs)
      const thrown = st === 4 && e._thrown > 0;
      void thrown;
      const ph = (e.phase || 1) % 10;
      const guard = Math.floor((e.phase || 0) / 10);
      P_.veins.forEach((v) => v.material.color.set(ph === 3 ? '#ff3a5a' : '#ffcf8a').multiplyScalar(ph === 3 ? 0.85 + Math.sin(t * 8) * 0.1 : 0.7 + guard * 0.04));
      m.eye.material.color.set(ph === 3 ? '#ff2040' : '#ff3a5a').multiplyScalar(stunned ? 0.3 : 2.0);
      if (stunned && Math.random() < dt * 8) Fx.burst(e.pos.clone().add(V3((Math.random() - 0.5) * 2, 4.2, (Math.random() - 0.5) * 2)), '#ffcf8a', 4, 2, 0.4, 1);
    },
  });

  // ======================= the level =======================
  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TX.hall1[r]);
      W.screen.show(TX.card, TX.title, '#b9a6ff');
      Sound.mood('tense');
    }
    if (st === 2) {
      HUD.objective(TX.hall2[r]);
      HUD.say(TX.swap, T.master, 3200);
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(TX.armory[r]);
      W.screen2.show('L’armurerie', 'Trois vagues', '#ffcf8a');
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(TX.bossObj[r]);
      W.screen3.show('La forge', TX.boss, '#ff5f8a');
      Sound.mood('tense');
    }
    if (st === 5) {
      HUD.boss(null);
      HUD.objective(TX.cardObj);
      W.screen3.show(TX.card, 'Victoire', '#ffcf8a');
      HUD.say(TX.won, T.master, 3200);
      Sound.mood('gold');
      Sound.play('reveal');
      W.clearFx();
      Fx.hearts(W.P(W.BOSS_C.x, 6, W.BOSS_C.z));
      for (let i = 0; i < 8; i++)
        setTimeout(() => Fx.burst(W.P(W.BOSS_C.x + (Math.random() - 0.5) * 16, 13, W.BOSS_C.z + (Math.random() - 0.5) * 16), '#ffb070', 120, 4, 2.2, -6), i * 300);
    }
    // whoever a checkpoint left behind joins it
    if (prev && st > prev && st >= 3) {
      const q = W.rel(Player.body.p);
      const behind = (st === 3 && !W.inArmory(q)) || (st === 4 && !W.inForge(q));
      if (behind) c.spawn(W.spawn(st, r), Math.PI);
    }
  };
  // agreement of "bloqué" with each trap's name
  const AGREE = { 'les pendules': 's', 'les faucheuses': 'es', 'les guillotines': 'es', 'les mâchoires': 'es', 'le tambour': '' };
  const fmtN = (s, tr) =>
    s
      .replace('{n}', tr.name)
      .replace('{N}', tr.name.charAt(0).toUpperCase() + tr.name.slice(1))
      .replace('{s}', AGREE[tr.name] || '');

  Story.register('tr_s5', {
    init: () => ({
      stage: 1,
      T: 0,
      gA: false,
      gB: false,
      jam: null,
      jcd: 0,
      fz: {},
      wave: 0,
      lockC: false,
      lockE: false,
      p3: null,
      won: false,
    }),
    voice: () => 1,
    net: {
      s5wipe: (c, d) => {
        Combat.reset();
        W.clearFx();
        c.spawn(W.spawn(d, c.role), Math.PI);
        HUD.say(TX.wipe, T.master, 2600);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.wake();
      Enemies.clear();
      W.clearFx();
      local.stage = 0;
      local.T = c.S.x.T || 0;
      local.bossOn = false;
      local.pad = null;
      local.said = {};
      local.wave = c.S.x.wave;
      local.bossHp = 0;
      local.bossT = 0;
      local.done = 0;
      local.winT = 0;
      local.retry = false;
      local.clearT = 0;
      local.waveTok++;
      local.boomHit.clear();
      c.spawn(W.spawn(c.S.x.stage, c.role), Math.PI);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => W.spawn(Story.S.x.stage, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.011);
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
      Enemies.clear();
      HUD.boss(null);
      Player.targets = null;
      W.clearFx();
      W.sleep();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      // a jam that just started: everyone hears the catch, the runner hears which one
      const jk = x.jam ? x.jam.id + x.jam.s : '';
      if (jk && jk !== local.jamK) {
        const tr = W.TRAP[x.jam.id];
        Sound.play('switch');
        Sound.play('deflect');
        HUD.say(fmtN(TX.jammed, tr), T.master, 1600);
      }
      local.jamK = jk;
      if (local.wave != null && x.wave !== local.wave && x.wave >= 1 && x.wave <= 3) {
        W.screen2.show('Vague ' + x.wave, TX.waves[x.wave - 1], '#ff9a4a');
        HUD.say(TX.waveSay[x.wave - 1], T.master, 3000);
        Sound.play('roar');
      }
      if (local.wave != null && x.wave === 4 && local.wave !== 4) {
        W.screen2.show('L’armurerie', 'Silence', '#7ce0ff');
        HUD.say(TX.cleared, T.master, 3000);
        HUD.objective(TX.forgeGo);
        Sound.play('reveal');
      }
      local.wave = x.wave;
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = W.rel(ps[0].pos);
      const qv = W.rel(ps[1].pos);
      local.sync += dt;
      if (local.sync > 0.4) {
        local.sync = 0;
        c.set((s) => (s.x.T = +local.T.toFixed(2)));
      }
      // a jam runs out: its time is folded into that trap's frozen total, the levers rearm
      if (x.jam && local.T >= x.jam.e) {
        const j = x.jam;
        c.set((s) => {
          s.x.fz = { ...s.x.fz, [j.id]: +(((s.x.fz || {})[j.id] || 0) + (j.e - j.s)).toFixed(3) };
          s.x.jam = null;
          s.x.jcd = +(local.T + W.REARM).toFixed(2);
        });
      }
      if (x.stage === 1) {
        if (!x.gA && W.onGalleryA(qd)) c.set((s) => (s.x.gA = true));
        if (qd.z < -56.6 && qv.z < -56.6 && qd.y < 2 && qv.y < 2) c.set((s) => (s.x.stage = 2));
      }
      if (x.stage === 2) {
        if (!x.gB && W.onGalleryB(qv)) c.set((s) => (s.x.gB = true));
        if (W.inArmory(qd) && W.inArmory(qv))
          c.set((s) => {
            s.x.stage = 3;
            s.x.lockC = true;
          });
      }
      if (x.stage === 3) {
        // waves: the next one comes once the room is clear (a wipe retries the current one)
        const busy = Enemies.alive() > 0 || local.pending > 0;
        if (!busy && x.wave < 4) {
          local.clearT += dt;
          if (local.clearT > (x.wave === 0 ? 2.5 : 3.2)) {
            local.clearT = 0;
            const w = local.retry ? Math.max(1, x.wave) : x.wave + 1;
            local.retry = false;
            if (w > 3)
              c.set((s) => {
                s.x.wave = 4;
                s.x.lockC = false;
              });
            else {
              const comp = [null, ['lame', 'lame', 'lame', 'lame'], ['duelliste', 'duelliste', 'duelliste', 'lame', 'lame'], ['bouclier', 'bouclier', 'duelliste', 'duelliste', 'lame', 'lame']][w];
              const off = Math.floor(Math.random() * 8);
              const tok = ++local.waveTok;
              comp.forEach((type, k) => {
                const p = W.armDoor(off + k * 3);
                local.pending++;
                setTimeout(() => {
                  local.pending--;
                  if (tok !== local.waveTok || Story.S.phase !== 'tr_s5' || Story.S.x.stage !== 3) return;
                  const e = Enemies.spawn(type, p, { atk: 1.5 + Math.random() * 1.5 });
                  e.yaw = Math.atan2(W.O.x + W.ARM_C.x - p.x, W.O.z + W.ARM_C.z - p.z);
                  bfx('spawn', p);
                }, k * 380);
              });
              if (w !== x.wave) c.set((s) => (s.x.wave = w));
            }
          }
        } else local.clearT = 0;
        Enemies.simulate(dt, ps);
        if (x.wave >= 4 && W.inForge(qd) && W.inForge(qv))
          c.set((s) => {
            s.x.stage = 4;
            s.x.lockE = true;
          });
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2.2) {
            local.wipe = 0;
            Enemies.clear();
            Combat.reset();
            local.retry = x.wave >= 1 && x.wave <= 3;
            local.waveTok++;
            local.clearT = 0;
            c.send('s5wipe', 3);
            c.spawn(W.spawn(3, c.role), Math.PI);
            HUD.say(TX.wipe, T.master, 2600);
          }
        } else local.wipe = 0;
      }
      if (x.stage === 4) {
        local.bossT += dt;
        if (!local.bossOn && local.bossT > 3) {
          local.bossOn = true;
          const hp0 = local.bossHp || BOSS_HP;
          const ph = hp0 <= BOSS_HP * 0.33 + 1 ? 3 : hp0 <= BOSS_HP * 0.66 + 1 ? 2 : 1;
          Enemies.spawn('maitre', W.P(W.BOSS_C.x, 0, W.BOSS_C.z), { ph, phase: ph, st: 0, atk: 2.2, stunImm: 99, hp: hp0, yaw: Math.PI });
          if (ph === 3) c.set((s) => (s.x.p3 = +local.T.toFixed(2)));
          bfx('roar');
        }
        const b = Enemies.boss();
        if (b) {
          // where a wipe sends him back to: the start of his current phase
          local.bossHp = Math.round(BOSS_HP * PH_AT[b.ph || 1]);
        }
        Enemies.simulate(dt, ps);
        if (local.bossOn && !Enemies.boss()) {
          Enemies.clear();
          c.set((s) => (s.x.stage = 5));
        }
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2.2) {
            local.wipe = 0;
            Enemies.clear();
            Combat.reset();
            local.bossOn = false;
            local.bossT = 0.5;
            c.set((s) => (s.x.p3 = null));
            c.send('s5wipe', 4);
            W.clearFx();
            c.spawn(W.spawn(4, c.role), Math.PI);
            HUD.say(TX.wipe, T.master, 2600);
          }
        } else local.wipe = 0;
      }
      if (x.stage === 5) {
        local.winT = W.nearCard(qd) && W.nearCard(qv) ? local.winT + dt : 0;
        if (!x.won && local.winT > 1) c.set((s) => (s.x.won = true));
        if (x.won) {
          local.done += dt;
          if (local.done > 3.5) c.goto('reward', (s) => (s.x.card = 's5'));
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
      if (d.a === 'jam') {
        const tr = W.TRAP[d.id];
        if (!tr || tr.half !== x.stage) return;
        // a little slack: the guest's clock may run a hair ahead of the host's
        if (x.jam || local.T < (x.jcd || 0) - 0.3) return;
        const s0 = +local.T.toFixed(2);
        c.set((s) => (s.x.jam = { id: d.id, s: s0, e: +(s0 + W.JAM).toFixed(2) }));
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
      // the shared clock, readable by the world (and by the test bots)
      W.T = TT;
      W.update(dt, t, x, r, TT);
      Enemies.render(dt, t);
      const body = Player.body;
      const q = W.rel(body.p);
      local.inv = Math.max(0, local.inv - dt);
      // ---- the hall: the runner's own blades ----
      if ((x.stage === 1 || x.stage === 2) && local.inv <= 0 && W.inLane(q, x.stage)) {
        const hit = W.trapHit(q, TT, x, x.stage);
        if (hit) {
          local.inv = 0.8;
          const pad = W.padFor(x.stage, q);
          Fx.burst(body.p.clone().add(V3(0, 1, 0)), '#ff5f8a', 40, 5, 0.5, -6);
          Sound.play('cut');
          Sound.play('hurt');
          HUD.hurt();
          Cam.shake = 0.35;
          c.spawn(pad, Math.PI);
          local.hits = (local.hits || 0) + 1;
          W.hits = local.hits;
          if (!local.said['hit' + x.stage] || local.hits % 4 === 0) {
            local.said['hit' + x.stage] = true;
            HUD.say(W.TRAP[hit].kind === 'drum' ? TX.drum : TX.hit, T.master, 1800);
          }
          // the partner sees it happen
          c.send('s5hitfx', [+body.p.x.toFixed(2), +body.p.y.toFixed(2), +body.p.z.toFixed(2)]);
        }
      }
      // ---- the forge: saws and boomerangs, judged by each player for themselves ----
      local.ringCd = Math.max(0, local.ringCd - dt);
      if (x.stage === 4 && !Combat.down) {
        if (local.ringCd <= 0 && (W.ringHit(q, TT, x) || W.spokeHit(q, TT, x))) {
          local.ringCd = 1.0;
          Combat.apply(10);
          const dx = q.x - W.BOSS_C.x;
          const dz = q.z - W.BOSS_C.z;
          const l = Math.hypot(dx, dz) || 1;
          const out = W.ringHit(q, TT, x);
          body.v.set((out ? -dx / l : dx / l) * 7, 6, (out ? -dz / l : dz / l) * 7);
          Sound.play('cut');
          Cam.shake = 0.3;
          if (!local.said.ring) {
            local.said.ring = true;
            HUD.say(TX.ring, T.master, 1800);
          }
        }
        const tmp = V3();
        W.booms.forEach((b, i) => {
          const p = W.boomPos(b, TT, tmp);
          if (!p) return;
          const leg = TT - b.t0 < W.BOOM.dur / 2 ? 'o' : 'b';
          const key = b.t0 + ':' + b.dx + ':' + leg;
          if (local.boomHit.has(key)) return;
          if (Math.hypot(p.x - body.p.x, p.z - body.p.z) < W.BOOM.r + 0.35 && Math.abs(p.y - (body.p.y + 1)) < 1.1) {
            local.boomHit.add(key);
            Combat.apply(16);
            body.v.set(b.dz * 6, 5, -b.dx * 6);
            Sound.play('cut');
            Cam.shake = 0.3;
          }
          void i;
        });
      }
      // ---- boss bar ----
      const boss = Enemies.boss();
      if (x.stage === 4 && boss) {
        const ph = (boss.phase || 1) % 10;
        const guard = Math.floor((boss.phase || 0) / 10);
        const need = GUARD[ph] || 4;
        const tag = boss.stun > 0 ? 'Garde brisée · vise le cœur' : 'Garde · encore ' + (need - guard) + ' coup' + (need - guard > 1 ? 's' : '') + ' d’épée';
        HUD.boss(TX.boss, boss.hp / boss.max, 'Phase ' + ph + ' · ' + tag);
      } else if (x.stage !== 4) HUD.boss(null);
      // ---- prompts ----
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 1 || x.stage === 2) {
        const tr = W.TRAPS.find((tt) => tt.half === x.stage && W.nearLever(q, tt.id));
        if (tr) {
          const jam = x.jam && TT < x.jam.e;
          if (jam && x.jam.id === tr.id) return ['E', TX.jamOn.replace('{s}', Math.max(0, Math.ceil(x.jam.e - TT))), false];
          if (jam) return ['E', TX.busy, false];
          if (TT < (x.jcd || 0)) return ['E', TX.rearm, false];
          if (Input.pressed('interact')) {
            c.act({ a: 'jam', id: tr.id });
            Sound.play('switch');
          }
          return ['E', fmtN(TX.jamP, tr), false];
        }
        // the gate hints
        if (x.stage === 1 && !x.gA && q.z < 3 && q.z > -1 && Math.abs(q.x) < 3 && !local.said.gA) {
          local.said.gA = true;
          HUD.say(r === 'dame' ? TX.gateAme : TX.gateA, T.master, 2600);
        }
        if (x.stage === 2 && !x.gB && q.z < -62 && q.z > -66 && Math.abs(q.x) < 3 && !local.said.gB) {
          local.said.gB = true;
          HUD.say(TX.gateB, T.master, 2600);
        }
      }
      return null;
    },
  });
  // the partner's trap hit, seen from the gallery
  Net.on('s5hitfx', (d) => {
    if (!Story.S || Story.S.phase !== 'tr_s5') return;
    const p = V3(d[0], d[1] + 1, d[2]);
    Fx.burst(p, '#ff5f8a', 40, 5, 0.5, -6);
    Sound.play('cut');
  });
})();
