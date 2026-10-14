// ♠ 6 · La Tour (épreuve s4). Kits swapped in this trial (js/game/trials.js): Yoline carries the
// valet kit (double jump, sword, veil), William the dame kit (grapple, rifle, sees the wind).
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('s4');
  const T = CONFIG;
  const W = TrS4;
  const TX = {
    card: CARD,
    title: 'La Tour',
    boss: 'La Sentinelle de la Tour',
    intro: 'Épreuve ' + CARD + '. La Tour de l’Horloge : soixante-quatorze mètres à grimper. Ensemble, et armés.',
    gears: {
      dame: 'Les engrenages. Sans frein, tout tourne trop vite et le grand bras balaie. Tiens un frein (maintiens E) pendant que {mate} grimpe, puis {il} tiendra le sien pour toi, sur le balcon.',
      valet:
        'Les engrenages. Sans frein, tout tourne trop vite et le grand bras balaie. Tiens un frein (maintiens E) pendant que {mate} grimpe, puis {il} tiendra le sien pour toi, sur le balcon.',
    },
    liftGo: 'Le monte-charge. Montez dessus tous les deux, au bout de la passerelle.',
    lift1: {
      valet: 'À toi la manivelle : maintiens E au centre du monte-charge. {mate} te couvre au fusil.',
      dame: '{mate} tourne la manivelle. Toi, abats les Pions qui escaladent la cage, avant qu’ils {le} touchent.',
    },
    lift2: {
      dame: 'Mi-hauteur : la manivelle change de main. À toi de tourner (maintiens E au centre). {mate} te protège à l’épée.',
      valet: 'Mi-hauteur : la manivelle change de main. {mate} tourne, toi tu {le} protèges à l’épée. Le Voile (clic droit) t’aide à passer.',
    },
    half: 'Mi-hauteur. La manivelle change de main.',
    jam: 'Le monte-charge est grippé ! Brisez les verrous rouges sur le bord, au fusil ou à l’épée.',
    jamFree: 'Les verrous ont sauté. La manivelle tourne à nouveau.',
    notYou: 'Pas ton tour : c’est {mate} qui tourne la manivelle.',
    crankP: 'Tourner la manivelle',
    brakeP: 'Tenir le frein',
    braked: 'Frein tenu : les engrenages ralentissent, le bras s’arrête.',
    armHit: 'Le grand bras t’a balayé{e}. Il ne s’arrête que si quelqu’un tient un frein.',
    winds: {
      dame: 'Les courants. Toi seul{e} vois quand le vent souffle dans les colonnes. Dis à {mate} quand sauter. Toi, prends les anneaux (F).',
      valet:
        'Les courants. Tu ne vois pas le vent, {mate} si : saute dans la colonne quand {il} te le dit, laisse-toi porter, puis pose-toi sur la passerelle. Attention aux cartes qui tombent.',
    },
    windTip: 'Le vent est retombé. Écoute {mate} : {il} voit quand il revient.',
    cardHit: 'Une carte est tombée sur toi.',
    summitGo: 'L’escalier, contre le mur : jusqu’au sommet.',
    summit: 'Le sommet. La Sentinelle garde la carte.',
    bossObj: {
      dame: 'La Sentinelle. Son bouclier arrête tes balles. Quand {mate} l’étourdit à l’épée, sa poitrine s’ouvre : vise le cœur.',
      valet: 'La Sentinelle. Ton épée brise sa garde et l’étourdit (clic gauche, au corps à corps). Alors {mate} peut viser son cœur.',
    },
    phase2: 'Elle s’emballe. Plus vite, et elle appelle des Pions.',
    stunned: 'Étourdie ! Le cœur est à découvert.',
    wipe: 'Vous êtes tombés tous les deux. On reprend.',
    wipeLift: 'Vous êtes tombés tous les deux. Le monte-charge redescend.',
    won: 'La Sentinelle s’arrête. La Tour sonne pour vous.',
    cardObj: 'La carte ' + CARD + ' est sous la cloche. Prenez-la ensemble.',
  };
  CONFIG.cards.s4 = {
    title: 'La Tour',
    sub: 'Épreuve ♠ · réussie',
    lines: [
      'Soixante-quatorze mètres.',
      'L’un tournait, l’autre veillait. Puis l’inverse.',
      'Et tout en haut, sous la cloche, le cadran du Visa.',
    ],
  };

  // ======================= the Sentinelle (boss) =======================
  const BM = {};
  const bossMats = () => {
    if (BM.iron) return;
    BM.iron = Tex.mat('metal', { color: '#5a5566', scale: 1.2, metal: 0.55, rough: 0.5 });
    BM.dark = Tex.mat('metal', { color: '#2a2532', scale: 1.0, metal: 0.4, rough: 0.6 });
    BM.bronze = new THREE.MeshStandardMaterial({ color: '#a26f38', metalness: 0.45, roughness: 0.36, emissive: '#3a1e06', emissiveIntensity: 0.35 });
    BM.gold = new THREE.MeshStandardMaterial({ color: '#d0a94e', metalness: 0.5, roughness: 0.3, emissive: '#5a3c12', emissiveIntensity: 0.3 });
    BM.cloth = Tex.mat('fabric', { color: '#3a1226', scale: 3.5, rough: 0.95, bump: 0.4 });
    BM.eye = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a5a').multiplyScalar(2), toneMapped: false });
    BM.vein = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(1.2), toneMapped: false });
  };
  const spadeShape = (k) => {
    // a spade: the heart curve upside down, with a stem
    const s = new THREE.Shape();
    for (let i = 0; i <= 80; i++) {
      const [x, y] = Heart.curve((i / 80) * Math.PI * 2);
      const px = x * k;
      const py = -(y - 2.5) * k;
      if (i) s.lineTo(px, py);
      else s.moveTo(px, py);
    }
    return s;
  };
  const bossModel = () => {
    bossMats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const add = (geo, mat, x, y, z, parent = body) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    // pedestal: a slowly turning cog it stands on
    const ped = new THREE.Group();
    body.add(ped);
    const cog = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const r = i % 4 === 1 || i % 4 === 2 ? 2.3 : 2.05;
      if (i) cog.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else cog.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    add(new THREE.ExtrudeGeometry(cog, { depth: 0.35, bevelEnabled: false }).rotateX(-Math.PI / 2), BM.bronze, 0, 0, 0, ped);
    // legs
    const legs = [-0.62, 0.62].map((x) => {
      const leg = new THREE.Group();
      leg.position.set(x, 2.2, 0);
      body.add(leg);
      add(new THREE.CylinderGeometry(0.34, 0.26, 1.1, 14), BM.iron, 0, -0.55, 0, leg);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 18).rotateZ(Math.PI / 2), BM.gold, 0, -1.12, 0, leg);
      add(new THREE.CylinderGeometry(0.26, 0.34, 0.9, 14), BM.iron, 0, -1.6, 0, leg);
      add(new THREE.BoxGeometry(0.62, 0.26, 0.9), BM.dark, 0, -2.0, 0.12, leg);
      return leg;
    });
    // hips and the cloth tabard
    add(new THREE.CylinderGeometry(0.9, 1.0, 0.5, 24), BM.dark, 0, 2.3, 0);
    const tabard = add(new THREE.PlaneGeometry(1.1, 1.9, 1, 6), BM.cloth, 0, 1.6, 0.98);
    tabard.material = BM.cloth;
    // torso: a barrel with gold bands and a clock-face chest whose doors open on the heart
    const torso = new THREE.Group();
    torso.position.y = 3.35;
    body.add(torso);
    add(new THREE.CylinderGeometry(1.15, 0.95, 1.9, 28), BM.bronze, 0, 0, 0, torso);
    [-0.7, 0, 0.7].forEach((y) => add(new THREE.TorusGeometry(1.08 - y * 0.08, 0.06, 6, 40).rotateX(Math.PI / 2), BM.gold, 0, y, 0, torso));
    // the heart core (the weak point): a small heart-galaxy in a cage
    const core = new THREE.Group();
    // set into a recess in front of the barrel, behind the two doors
    core.position.set(0, 0.1, 1.04);
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 32).rotateX(Math.PI / 2), BM.dark, 0, 0.1, 0.98, torso);
    torso.add(core);
    const hs = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const [x, y] = Heart.curve((i / 64) * Math.PI * 2);
      if (i) hs.lineTo(x * 0.024, (y - 2.5) * 0.024);
      else hs.moveTo(x * 0.024, (y - 2.5) * 0.024);
    }
    const heartMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(1.4), toneMapped: false });
    const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 }), heartMat);
    heart.position.z = -0.1;
    core.add(heart);
    const gal = Heart.galaxy(3000, 4, 47);
    gal.group.scale.setScalar(0.022);
    gal.core.material.opacity = 0;
    gal.U.uFade.value = 0.65;
    core.add(gal.group);
    // chest doors (closed = shielded core)
    const doors = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.62, 0.1, 1.24);
      torso.add(pivot);
      const d = add(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 24, 1, false, s > 0 ? Math.PI : 0, Math.PI).rotateX(Math.PI / 2), BM.gold, -s * 0.62, 0, 0, pivot);
      d.rotation.z = 0;
      return pivot;
    });
    const dialMat = new THREE.MeshStandardMaterial({
      map: LvKit.tex(512, 512, (gg, w) => {
        gg.fillStyle = '#efe0c0';
        gg.beginPath();
        gg.arc(w / 2, w / 2, w / 2 - 6, 0, Math.PI * 2);
        gg.fill();
        gg.strokeStyle = '#2a1a10';
        gg.lineWidth = 10;
        gg.stroke();
        gg.fillStyle = '#1a1210';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          gg.fillRect(w / 2 + Math.cos(a) * 200 - 6, w / 2 + Math.sin(a) * 200 - 14, 12, 28);
        }
        gg.font = '180px Georgia';
        gg.textAlign = 'center';
        gg.textBaseline = 'middle';
        Icons.fillText(gg, '♠', w / 2, w / 2);
      }),
      roughness: 0.5,
      transparent: true,
    });
    doors.forEach((p, i) => {
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32, i ? Math.PI / 2 : -Math.PI / 2, Math.PI), dialMat);
      face.position.set(i ? -0.62 : 0.62, 0, 0.05);
      p.add(face);
    });
    // shoulders with spade pauldrons
    const pauldron = new THREE.ExtrudeGeometry(spadeShape(0.045), { depth: 0.14, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 });
    const arms = [-1, 1].map((s) => {
      const sh = new THREE.Group();
      sh.position.set(s * 1.32, 4.05, 0);
      body.add(sh);
      add(new THREE.SphereGeometry(0.42, 16, 12), BM.iron, 0, 0, 0, sh);
      const p = add(pauldron, BM.gold, 0, 0.32, 0, sh);
      p.rotation.set(-Math.PI / 2, 0, s * 0.3);
      p.scale.setScalar(1.1);
      const upper = add(new THREE.CylinderGeometry(0.26, 0.22, 1.1, 12), BM.iron, 0, -0.6, 0, sh);
      void upper;
      const elbow = new THREE.Group();
      elbow.position.y = -1.18;
      sh.add(elbow);
      add(new THREE.SphereGeometry(0.24, 12, 10), BM.gold, 0, 0, 0, elbow);
      add(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 12), BM.iron, 0, -0.52, 0, elbow);
      return { sh, elbow };
    });
    // left: the spade shield
    const shield = new THREE.Group();
    shield.position.set(0.1, -1.0, 0.55);
    arms[0].elbow.add(shield);
    const shieldBody = add(new THREE.ExtrudeGeometry(spadeShape(0.105), { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }), BM.dark, 0, 0, 0, shield);
    // a spade (point up) with a stem, and a heart set in it
    shieldBody.position.y = -0.55;
    const shieldRim = add(new THREE.ExtrudeGeometry(spadeShape(0.112), { depth: 0.06, bevelEnabled: false }), BM.gold, 0, -0.55, -0.04, shield);
    const stem = new THREE.Shape();
    stem.moveTo(-0.08, -0.2);
    stem.lineTo(0.08, -0.2);
    stem.lineTo(0.32, -0.95);
    stem.lineTo(-0.32, -0.95);
    stem.closePath();
    add(new THREE.ExtrudeGeometry(stem, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 }), BM.gold, 0, -1.2, 0, shield);
    const emblem = add(new THREE.ExtrudeGeometry(spadeShape(0.04), { depth: 0.05, bevelEnabled: false }), BM.vein.clone(), 0, 0.25, 0.24, shield);
    emblem.rotation.set(0, 0, Math.PI);
    // right: the bell hammer
    const hammer = new THREE.Group();
    hammer.position.set(0, -1.05, 0);
    arms[1].elbow.add(hammer);
    add(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 10), BM.dark, 0, -0.6, 0, hammer).rotation.x = Math.PI / 2;
    const bellPts = [];
    for (let i = 0; i <= 12; i++) {
      const tt = i / 12;
      bellPts.push(new THREE.Vector2(0.25 + Math.pow(tt, 2) * 0.55, 0.9 - tt * 0.9));
    }
    const head = add(new THREE.LatheGeometry(bellPts, 24), BM.bronze, 0, -0.6, 1.7, hammer);
    head.rotation.x = Math.PI / 2;
    // head: a helm with an eye slit and a crown of clock hands
    const helm = new THREE.Group();
    helm.position.y = 4.75;
    body.add(helm);
    add(new THREE.CylinderGeometry(0.46, 0.52, 0.8, 18), BM.iron, 0, 0, 0, helm);
    add(new THREE.SphereGeometry(0.47, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), BM.iron, 0, 0.4, 0, helm);
    const eye = add(new THREE.BoxGeometry(0.62, 0.08, 0.06), BM.eye, 0, 0.05, 0.47, helm);
    const crown = new THREE.Group();
    crown.position.y = 0.75;
    helm.add(crown);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const b = add(new THREE.BoxGeometry(0.06, i % 3 ? 0.55 : 0.9, 0.03), BM.gold, Math.cos(a) * 0.42, 0.25, Math.sin(a) * 0.42, crown);
      b.rotation.y = -a;
      b.rotation.z = Math.cos(a) * 0.25;
      b.rotation.x = Math.sin(a) * 0.25;
    }
    add(new THREE.TorusGeometry(0.44, 0.05, 6, 32).rotateX(Math.PI / 2), BM.gold, 0, 0, 0, crown);
    // back: a pendulum and a cape
    const pend = new THREE.Group();
    pend.position.set(0, 3.9, -1.05);
    body.add(pend);
    add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), BM.gold, 0, -0.8, 0, pend);
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24).rotateX(Math.PI / 2), BM.gold, 0, -1.65, 0, pend);
    const cape = add(new THREE.PlaneGeometry(2.4, 3.2, 6, 8), BM.cloth, 0, 2.6, -1.1);
    cape.material = BM.cloth.clone();
    cape.material.side = THREE.DoubleSide;
    const capeBase = cape.geometry.attributes.position.array.slice();
    // glowing seams that turn red in phase 2
    const veins = [];
    [-0.6, 0.6].forEach((y) => {
      const v = add(new THREE.TorusGeometry(1.12 - y * 0.06, 0.025, 4, 48).rotateX(Math.PI / 2), BM.vein.clone(), 0, y * 0.5 + 0.35, 0, torso);
      veins.push(v);
    });
    body.scale.setScalar(1.25);
    return {
      g,
      body,
      bodyScale: 1.25,
      heart: core,
      eye,
      parts: { legs, torso, doors, arms, shield, emblem, hammer, helm, crown, pend, cape, capeBase, ped, gal, veins, heartMat },
    };
  };

  // host → guest: telegraphs, effects, knockbacks
  const tel = (pos, r, t) => {
    Enemies.telegraph(pos, r, t);
    Net.send('s4tel', [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), r, t]);
  };
  const telLine = (a, b, w, t) => {
    Enemies.telegraphLine(a, b, w, t);
    Net.send('s4tl', [a.x, a.y, a.z, b.x, b.y, b.z, w, t].map((v) => +v.toFixed(2)));
  };
  const bfx = (k, p) => {
    onBfx(k, p);
    Net.send('s4fx', [k, p ? [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)] : null]);
  };
  const knock = (who, v) => {
    if (who === Story.role) Player.body.v.set(v[0], v[1], v[2]);
    else Net.send('s4kn', [who, ...v.map((x) => +x.toFixed(2))]);
  };
  const onBfx = (k, p) => {
    if (Story.S && Story.S.phase !== 'tr_s4') return;
    const pos = p ? (p.isVector3 ? p : V3(p[0], p[1], p[2])) : null;
    if (k === 'slam') {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.4);
      if (pos) Fx.burst(pos.clone().add(V3(0, 0.3, 0)), '#ffcf8a', 120, 8, 0.9, -8);
    }
    if (k === 'sweep') {
      Sound.play('punch', pos);
      Cam.shake = Math.max(Cam.shake, 0.25);
    }
    if (k === 'gears') Sound.play('orb', pos);
    if (k === 'roar') Sound.play('roar');
    if (k === 'stun') {
      Sound.play('shatter');
      Sound.play('thud', pos);
      Cam.shake = 0.3;
      HUD.say(TX.stunned, T.master, 1600);
    }
    if (k === 'crack') {
      Sound.play('deflect', pos);
      if (pos) Fx.burst(pos.clone().add(V3(0, 3, 0)), '#bfe6ff', 10, 3, 0.3, 0);
    }
    if (k === 'phase2') {
      Sound.play('roar');
      HUD.say(TX.phase2, TX.boss, 2400);
    }
    if (k === 'climb' && pos) {
      Fx.burst(pos.clone().add(V3(0, 0.8, 0)), '#b9a6ff', 24, 3, 0.5, 0);
      Sound.play('grappleHit', pos);
    }
  };
  Net.on('s4tel', (d) => Story.S && Story.S.phase === 'tr_s4' && Enemies.telegraph(V3(d[0], d[1], d[2]), d[3], d[4]));
  Net.on('s4tl', (d) => Story.S && Story.S.phase === 'tr_s4' && Enemies.telegraphLine(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5]), d[6], d[7]));
  Net.on('s4fx', (d) => onBfx(d[0], d[1]));
  Net.on('s4kn', (d) => d[0] === Story.role && Player.body.v.set(d[1], d[2], d[3]));

  const hurtIn = (players, test, dmg, from) =>
    players.forEach((p) => {
      if (!p.down && test(p.pos)) Combat.hurt(p.who, dmg, from);
    });
  const ATTACKS = { 1: ['slam', 'sweep', 'gears', 'sweep'], 2: ['slam', 'sweep2', 'gears', 'slam', 'sweep2', 'gears2'] };

  Enemies.define('sentinelle', {
    stats: { hp: 2400, speed: 0, radius: 2.0, hitR: 2.4, height: 6.4, boss: true, reach: 5.2, stunP: 3.4, weakR: 1.1, dieColor: '#ffcf8a' },
    model: bossModel,
    // The shield stops bullets. Sword blows crack its guard (4 in phase 1, 5 in phase 2, within
    // a few seconds); a broken guard stuns the Sentinelle, its chest opens and the heart takes the
    // rifle at 3x. The engine's own stun is kept off (stunImm) so only a broken guard stuns.
    mult(e, weak, stun) {
      if (stun) {
        if (e.stun > 0) return 1;
        if (e.cool > 0) return 0.3;
        e.guard = (e.guard || 0) + 1;
        e.guardT = 4;
        if (e.guard >= (e.ph === 2 ? 5 : 4)) {
          e.guard = 0;
          e.stun = 3.8;
          e.win = 0;
          e.st = 6;
          bfx('stun', e.pos);
        } else bfx('crack', e.pos);
        return 0.3;
      }
      if (e.stun > 0) {
        // one opening is worth at most 15% of its life: past that it shakes off the stun
        e.win = (e.win || 0) + (weak ? 27 : 9);
        if (e.win >= e.max * 0.15) e.stun = Math.min(e.stun, 0.05);
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
      // phase and guard share the packed phase field: phase + 10 x guard (read back in render)
      e.phase = e.ph + 10 * (e.guard || 0);
      if (e.stun > 0) {
        e.shield = false;
        e.st = 6;
        // staggered, it turns its open chest toward the farthest player: the rifle's shot
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
      if (e.ph === 1 && e.hp < e.max * 0.5) {
        e.ph = 2;
        e.phase = 2;
        e.st = 5;
        e.t = 1.6;
        bfx('phase2', e.pos);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + 0.5;
          const p = V3(e.pos.x + Math.cos(a) * 6, e.pos.y, e.pos.z + Math.sin(a) * 6);
          Enemies.spawn('pion', p);
          bfx('climb', p);
        }
        return;
      }
      // face the nearest player
      let best = null;
      let bd = 1e9;
      targets.forEach((p) => {
        const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        if (d < bd) {
          bd = d;
          best = p;
        }
      });
      if (best && e.st !== 2) e.yaw = angleDamp(e.yaw, Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z), 3, dt);
      const P2 = e.ph === 2;
      if (e.st === 0 || e.st == null) {
        e.st = 0;
        if (e.atk > 0 || !best) return;
        const list = ATTACKS[e.ph];
        e.ai = ((e.ai || 0) + 1) % list.length;
        const k = list[e.ai];
        if (k === 'slam') {
          e.st = 1;
          e.t = P2 ? 1.25 : 1.5;
          e.marks = players.filter((p) => !p.down).map((p) => V3(p.pos.x, p.pos.y, p.pos.z));
          e.marks.forEach((m) => tel(m, 2.7, e.t));
        } else if (k === 'sweep' || k === 'sweep2') {
          e.st = 2;
          e.t = P2 ? 1.1 : 1.35;
          const base = Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z);
          e.lines = (k === 'sweep2' ? [base - 0.55, base + 0.55] : [base]).map((a) => a);
          e.yaw = base;
          e.lines.forEach((a) => {
            const to = V3(e.pos.x + Math.sin(a) * 17, e.pos.y, e.pos.z + Math.cos(a) * 17);
            telLine(V3(e.pos.x, e.pos.y, e.pos.z), to, 3.4, e.t);
          });
        } else {
          e.st = 3;
          e.t = 0.85;
          e.vol = k === 'gears2' ? 2 : 1;
          tel(V3(e.pos.x, e.pos.y, e.pos.z), 3.4, 0.85);
        }
        return;
      }
      if (e.t > 0) return;
      if (e.st === 1) {
        bfx('slam', e.marks[0] || e.pos);
        e.marks.forEach((m) => {
          hurtIn(players, (q) => Math.hypot(q.x - m.x, q.z - m.z) < 2.7 && Math.abs(q.y - m.y) < 2.2, 24, m);
          bfx('slam', m);
        });
        e.st = 4;
        e.t = 1.2;
      } else if (e.st === 2) {
        bfx('sweep', e.pos);
        e.lines.forEach((a) => {
          const dx = Math.sin(a);
          const dz = Math.cos(a);
          players.forEach((p) => {
            if (p.down) return;
            const rx = p.pos.x - e.pos.x;
            const rz = p.pos.z - e.pos.z;
            const along = rx * dx + rz * dz;
            const side = Math.abs(rx * dz - rz * dx);
            if (along > 0 && along < 17.5 && side < 1.8 && Math.abs(p.pos.y - e.pos.y) < 2.4) {
              Combat.hurt(p.who, 20, e.pos);
              knock(p.who, [dx * 9, 6, dz * 9]);
            }
          });
        });
        e.st = 4;
        e.t = 1.0;
      } else if (e.st === 3) {
        const n = P2 ? 12 : 9;
        const off = (e.vol === 1 ? 0 : 0.5) + Math.random();
        const from = e.pos.clone().add(V3(0, 1.4, 0));
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          Enemies.fire(from, from.clone().add(V3(Math.cos(a), 0, Math.sin(a))), 9.5, 12);
        }
        bfx('gears', e.pos);
        e.vol -= 1;
        if (e.vol > 0) e.t = 0.6;
        else {
          e.st = 4;
          e.t = 1.3;
        }
      } else if (e.st === 4 || e.st === 5) {
        e.st = 0;
        e.atk = P2 ? 0.9 + Math.random() * 0.6 : 1.5 + Math.random() * 0.8;
      }
    },
    render(e, m, dt, t) {
      const P_ = m.parts;
      const a = (e._a = e._a || { slam: 0, sweep: 0, open: 0, prev: 0, spin: 0 });
      const st = e.st || 0;
      if (a.prev === 1 && st !== 1) a.slam = 0.35;
      if (a.prev === 2 && st !== 2) a.sweep = 0.4;
      a.prev = st;
      a.slam = Math.max(0, a.slam - dt);
      a.sweep = Math.max(0, a.sweep - dt);
      const stunned = e.stun > 0;
      a.open = damp(a.open, stunned ? 1 : 0, 8, dt);
      a.spin += dt * (st === 3 ? 9 : 0.6);
      // body sway and stun sag
      P_.torso.rotation.y = st === 3 ? Math.sin(a.spin) * 0.25 : Math.sin(t * 0.8) * 0.05;
      m.body.position.y = Math.sin(t * 1.6) * 0.06 - a.open * 0.35;
      P_.helm.rotation.x = a.open * 0.45;
      P_.ped.rotation.y = t * 0.3;
      // chest doors open on the heart when stunned
      P_.doors[0].rotation.y = -a.open * 1.9;
      P_.doors[1].rotation.y = a.open * 1.9;
      // hidden and dim behind closed doors; exposed and bright (under the bloom burn) when open
      P_.heartMat.color.set('#ff5f8a').multiplyScalar(0.22 + a.open * 0.5 + Math.sin(t * 6) * 0.05 * (0.3 + a.open));
      P_.gal.group.visible = a.open > 0.2;
      P_.gal.U.uTime.value = t;
      P_.gal.U.uPx.value = R.renderer.getPixelRatio() * 0.18;
      P_.gal.U.uBeat.value = a.open * (0.5 + 0.5 * Math.sin(t * 8));
      // shield arm: raised in front, dropped when stunned
      const shL = P_.arms[0].sh;
      shL.rotation.x = -1.1 * (1 - a.open) + 0.3 * a.open;
      shL.rotation.z = 0.25 * (1 - a.open) - 0.5 * a.open;
      P_.arms[0].elbow.rotation.x = -0.5 * (1 - a.open);
      // the shield stays upright, facing forward, whatever the arm does
      P_.shield.rotation.x = -(shL.rotation.x + P_.arms[0].elbow.rotation.x);
      // hammer arm: raised during the slam wind-up, crashes down, swings for the sweep
      const shR = P_.arms[1].sh;
      let hx = -0.3;
      let hz = -0.15;
      if (st === 1) hx = -2.9;
      if (a.slam > 0) hx = -2.9 + (1 - a.slam / 0.35) * 3.4;
      if (st === 2) {
        hx = -1.4;
        hz = -1.3;
      }
      if (a.sweep > 0) {
        hx = -1.4;
        hz = -1.3 + (1 - a.sweep / 0.4) * 2.6;
      }
      if (stunned) {
        hx = 0.2;
        hz = -0.3;
      }
      shR.rotation.x = damp(shR.rotation.x, hx, a.slam > 0 || a.sweep > 0 ? 30 : 6, dt);
      shR.rotation.z = damp(shR.rotation.z, hz, a.sweep > 0 ? 30 : 6, dt);
      P_.arms[1].elbow.rotation.x = st === 1 ? -0.6 : -0.25;
      P_.crown.rotation.y = t * (st === 3 ? 4 : 0.4);
      P_.pend.rotation.x = Math.sin(t * 2.2) * 0.35;
      P_.legs[0].rotation.x = Math.sin(t * 1.6) * 0.04;
      P_.legs[1].rotation.x = -Math.sin(t * 1.6) * 0.04;
      // cape ripple
      const arr = P_.cape.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        const y = P_.capeBase[i + 1];
        const x = P_.capeBase[i];
        const k = (1.6 - y) / 3.2;
        arr[i + 2] = P_.capeBase[i + 2] - Math.sin(t * 2 + x * 1.5 + y) * 0.18 * k - k * 0.3;
      }
      P_.cape.geometry.attributes.position.needsUpdate = true;
      const red = e.phase % 10 === 2;
      const guard = Math.floor((e.phase || 0) / 10);
      P_.emblem.material.color.set(guard ? '#ffffff' : '#ffcf8a').multiplyScalar(0.6 + guard * 0.12);
      P_.shield.scale.setScalar(1 + (a.crackT = Math.max(0, (a.crackT || 0) - dt)) * 0.3);
      if (guard !== a.guard) {
        if (guard > (a.guard || 0)) a.crackT = 0.25;
        a.guard = guard;
      }
      P_.veins.forEach((v) => v.material.color.set(red ? '#ff3a5a' : '#ffcf8a').multiplyScalar(red ? 1.6 + Math.sin(t * 8) * 0.4 : 1.1));
      m.eye.material.color.set(red ? '#ff2040' : '#ff3a5a').multiplyScalar(stunned ? 0.3 : 2.2);
      if (stunned && Math.random() < dt * 8) Fx.burst(e.pos.clone().add(V3((Math.random() - 0.5) * 2, 3.8, (Math.random() - 0.5) * 2)), '#ffcf8a', 4, 2, 0.4, 1);
    },
  });

  // ---------- the lift's jam locks: static, they hold the lift until both are broken ----------
  const lockModel = () => {
    bossMats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const cog = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const r = i % 4 === 1 || i % 4 === 2 ? 0.62 : 0.5;
      if (i) cog.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else cog.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const c = new THREE.Mesh(new THREE.ExtrudeGeometry(cog, { depth: 0.18, bevelEnabled: false }), BM.bronze);
    c.position.set(0, 0.9, -0.09);
    body.add(c);
    const clamp1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), BM.dark);
    clamp1.position.y = 0.7;
    body.add(clamp1);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a5a').multiplyScalar(1.3), toneMapped: false }));
    crystal.position.set(0, 0.9, 0.16);
    body.add(crystal);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a5a').multiplyScalar(0.8), transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false }));
    ring.position.y = 0.03;
    body.add(ring);
    return { g, body, eye: crystal, parts: { c, crystal } };
  };
  Enemies.define('verrou', {
    stats: { hp: 70, speed: 0, radius: 0.6, hitR: 0.85, height: 1.6, reach: 3.4, stunP: 0, dieColor: '#ff3a5a' },
    model: lockModel,
    sim(e) {
      const gy = Phys.groundAt(e.pos.x, e.pos.y + 1.4, e.pos.z);
      if (gy > -1e3) e.pos.y = gy;
    },
    render(e, m, dt, t) {
      m.parts.c.rotation.z = Math.sin(t * 9) * 0.12;
      m.parts.crystal.rotation.y = t * 2;
    },
  });

  // ======================= the level =======================
  const local = {
    stage: 0,
    ga: 0,
    aa: 0,
    ly: W.LIFT.y0,
    lv: 0,
    wt: 0,
    sync: 0,
    lsync: 0,
    wsync: 0,
    fc: 2,
    spawnT: 2,
    wipe: 0,
    bossT: 0,
    bossOn: false,
    winT: 0,
    brk: null,
    crank: false,
    armCd: 0,
    strikes: [],
    half: null,
    said: {},
    seen: {},
    bossPh: 0,
  };

  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: me ? Combat.cloak > 0 : !!rs.cloak };
    });
  const lat = () => Math.min(0.25, (Net.rtt || 80) / 2000);
  const omega = (x) => ((x.brk || []).length ? 0.12 : 0.48);
  const omegaArm = (x) => ((x.brk || []).length ? 0 : 0.9);
  const needed = (x) => (x.half ? 'dame' : 'valet');

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TX.gears[r]);
      W.screen.show('Étage 1', 'Les engrenages', '#b9a6ff');
    }
    if (st === 2) {
      HUD.objective(TX.lift1[r]);
      W.screen.show('Étage 2', 'Le monte-charge', '#ffcf8a');
      Sound.mood('tense');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(TX.winds[r]);
      W.screen2.show('Étage 3', 'Les courants', '#7ce0ff');
      Sound.mood('calm');
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(TX.bossObj[r]);
      W.screen3.show('Le sommet', TX.boss, '#ff5f8a');
      Sound.mood('tense');
      HUD.say(TX.summit, T.master, 2600);
    }
    if (st === 5) {
      HUD.boss(null);
      HUD.objective(TX.cardObj);
      W.screen3.show(TX.card, 'Victoire', '#ffcf8a');
      HUD.say(TX.won, T.master, 3000);
      Sound.mood('gold');
      Sound.play('reveal');
      Fx.hearts(W.P(0, W.TOP + 6, 0));
      for (let i = 0; i < 6; i++)
        setTimeout(() => Fx.firework(W.P((Math.random() - 0.5) * 60, W.TOP - 30, (Math.random() - 0.5) * 60), 40), i * 450);
    }
    // someone left behind by a checkpoint joins it
    if (prev && st > prev && st >= 2) {
      const q = W.rel(Player.body.p);
      const behind = (st === 2 && !W.onLift(q, local.ly)) || (st === 3 && q.y < 41) || (st >= 4 && q.y < W.TOP - 1);
      if (behind) c.spawn(W.spawn(st, r, local.ly), 0);
    }
  };

  Story.register('tr_s4', {
    init: () => ({
      stage: 1,
      brk: [],
      ga: 0,
      aa: 0,
      crank: '',
      ly: W.LIFT.y0,
      lv: 0,
      half: false,
      jam: false,
      jams: [],
      wt: 0,
      won: false,
    }),
    voice: () => 1,
    net: {
      s4fc: (c, d) => {
        W.dropCard(d[0], d[1], d[2]);
        local.strikes.push({ x: d[0], y: d[1], z: d[2], t: 0 });
      },
      s4wipe: (c, d) => {
        Combat.reset();
        if (d === 2) local.ly = c.S.x.half ? W.LIFT.half : W.LIFT.y0;
        c.spawn(W.spawn(d, c.role, local.ly), 0);
        HUD.say(d === 2 ? TX.wipeLift : TX.wipe, T.master, 2600);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.wake();
      Enemies.clear();
      local.stage = 0;
      local.ly = c.S.x.ly || W.LIFT.y0;
      local.ga = c.S.x.ga || 0;
      local.aa = c.S.x.aa || 0;
      local.wt = c.S.x.wt || 0;
      local.bossOn = false;
      local.half = null;
      c.spawn(W.spawn(c.S.x.stage, c.role, local.ly), Math.PI);
      Player.killY = W.O.y - 30;
      Player.checkpoint = () => W.spawn(Story.S.x.stage, c.role, local.ly);
      Player.targets = () => (c.role === 'dame' && Story.S.x.stage === 3 ? W.RINGS_G.map((g, i) => W.ringPos(i)) : []);
      Player.grappleLand = () => (Story.S.x.stage === 3 && Player.target >= 0 ? W.ringLand(Player.target) : null);
      City.mood({});
      c.fog(0.011);
      Combat.enable(true);
      HUD.visa(TX.card + ' · ' + TX.title);
      W.screen.show(TX.card, TX.title, '#b9a6ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 3600);
      this.apply(c);
    },
    exit() {
      Combat.enable(false);
      Enemies.clear();
      HUD.boss(null);
      Player.targets = null;
      Player.grappleLand = null;
      Player.avatar.ghost(0);
      W.sleep();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      if (local.jam != null && x.jam !== local.jam) {
        HUD.say(x.jam ? TX.jam : TX.jamFree, T.master, x.jam ? 3000 : 2000);
        Sound.play(x.jam ? 'trap' : 'switch');
        if (x.jam) Cam.shake = 0.35;
      }
      local.jam = !!x.jam;
      if (local.half !== null && x.half && !local.half) {
        HUD.objective(TX.lift2[c.role]);
        HUD.say(TX.half, T.master, 2400);
        W.screen.show('Mi-hauteur', 'La manivelle change de main', '#7ce0ff');
        Sound.play('switch');
      }
      local.half = x.half;
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = W.rel(ps[0].pos);
      const qv = W.rel(ps[1].pos);
      local.sync += dt;
      if (x.stage <= 2 && local.sync > 0.25) {
        local.sync = 0;
        c.set((s) => {
          s.x.ga = +local.ga.toFixed(3);
          s.x.aa = +local.aa.toFixed(3);
        });
      }
      if (x.stage === 1 && W.onLift(qd, local.ly) && W.onLift(qv, local.ly)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2) {
        // jam points: the lift seizes and red locks clamp onto its rim
        const JAMS = [19.5, 23.5, 32.5, 37.5];
        const jamAt = JAMS.find((y, i) => !(x.jams || []).includes(i) && local.ly >= y);
        if (jamAt != null && !x.jam) {
          const i = JAMS.indexOf(jamAt);
          local.ly = jamAt;
          const n = i % 2 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const a = Math.random() * Math.PI * 2 + k * Math.PI;
            Enemies.spawn('verrou', W.P(Math.cos(a) * 3.55, local.ly, Math.sin(a) * 3.55), { yaw: -a + Math.PI / 2 });
          }
          c.set((s) => {
            s.x.jam = true;
            s.x.jams = [...(s.x.jams || []), i];
            s.x.ly = jamAt;
            s.x.lv = 0;
          });
        }
        if (x.jam && !Enemies.alive('verrou')) c.set((s) => (s.x.jam = false));
        const moving = x.crank === needed(x) && !x.jam && !(ps[0].down && ps[1].down);
        const sp = moving ? 0.95 : 0;
        local.ly = Math.min(W.LIFT.y1, local.ly + sp * dt);
        local.lv = local.ly >= W.LIFT.y1 ? 0 : sp;
        if (!x.half && local.ly >= W.LIFT.half) {
          local.ly = W.LIFT.half;
          local.lv = 0;
          c.set((s) => {
            s.x.half = true;
            s.x.crank = '';
            s.x.ly = W.LIFT.half;
            s.x.lv = 0;
          });
        }
        local.lsync += dt;
        if (local.lsync > 0.1 && (Math.abs(local.ly - x.ly) > 0.01 || local.lv !== x.lv)) {
          local.lsync = 0;
          c.set((s) => {
            s.x.ly = +local.ly.toFixed(3);
            s.x.lv = local.lv;
          });
        }
        // pawns climb over the rim while the lift is under way
        local.spawnT -= dt;
        // the rifle clears pawns fast, the sword one at a time: the second half sends them singly
        const cap = x.half ? 2 : 5;
        if (local.ly > W.LIFT.y0 + 0.8 && local.spawnT <= 0 && Enemies.alive('pion') < cap) {
          local.spawnT = x.half ? 6 : 4.6;
          for (let i = 0; i < (x.half ? 1 : 2); i++) {
            const a = Math.random() * Math.PI * 2;
            const p = W.P(Math.cos(a) * 3.3, local.ly, Math.sin(a) * 3.3);
            Enemies.spawn('pion', p);
            bfx('climb', p);
          }
        }
        if (local.ly >= W.LIFT.y1) {
          Enemies.clear();
          c.set((s) => {
            s.x.stage = 3;
            s.x.ly = W.LIFT.y1;
            s.x.lv = 0;
            s.x.crank = '';
          });
        }
        Enemies.simulate(dt, ps);
        // everything on the deck rides with it (groundAt would drop a pawn the deck outran);
        // a pawn pushed off the deck falls away
        for (const e of Enemies.list.values()) {
          const r = Math.hypot(e.pos.x - W.O.x, e.pos.z - W.O.z);
          if (r < W.LIFT.r - 0.3) {
            e.pos.y = W.O.y + local.ly;
            if (r > W.LIFT.r - 0.6 && e.type === 'pion') {
              const k = (W.LIFT.r - 0.6) / r;
              e.pos.x = W.O.x + (e.pos.x - W.O.x) * k;
              e.pos.z = W.O.z + (e.pos.z - W.O.z) * k;
            }
          } else if (e.type === 'pion') {
            const k = (W.LIFT.r - 0.6) / r;
            e.pos.x = W.O.x + (e.pos.x - W.O.x) * k;
            e.pos.z = W.O.z + (e.pos.z - W.O.z) * k;
            e.pos.y = W.O.y + local.ly;
          }
        }
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2.2) {
            local.wipe = 0;
            Enemies.clear();
            Combat.reset();
            // the halfway landing is a checkpoint: the lift slides back to it, not to the bottom
            const back = x.half ? W.LIFT.half : W.LIFT.y0;
            local.ly = back;
            local.lv = 0;
            local.spawnT = 3;
            c.set((s) => {
              s.x.ly = back;
              s.x.lv = 0;
              s.x.crank = '';
              s.x.jam = false;
              s.x.jams = s.x.jams.filter((i) => (back > W.LIFT.y0 ? i < 2 : false));
            });
            c.send('s4wipe', 2);
            c.spawn(W.spawn(2, c.role, back), 0);
            HUD.say(TX.wipeLift, T.master, 2600);
          }
        } else local.wipe = 0;
      }
      if (x.stage === 3) {
        local.wsync += dt;
        if (local.wsync > 0.5) {
          local.wsync = 0;
          c.set((s) => (s.x.wt = +local.wt.toFixed(2)));
        }
        // cards fall on whoever is up on the walkways
        local.fc -= dt;
        if (local.fc <= 0) {
          local.fc = 2.6 + Math.random() * 1.4;
          // only someone standing on a walkway (never a rider in mid-air: that would be a
          // throw back to the bottom with no chance to dodge)
          const up = ps.filter((p) => {
            const y = W.rel(p.pos).y;
            return Math.abs(y - 50) < 0.3 || Math.abs(y - 58) < 0.3;
          });
          const p = up.length ? up[(Math.random() * up.length) | 0] : null;
          if (p) {
            const q = W.rel(p.pos);
            const d = [+(q.x + (Math.random() - 0.5) * 2).toFixed(2), +q.y.toFixed(2), +(q.z + (Math.random() - 0.5) * 2).toFixed(2)];
            c.send('s4fc', d);
            W.dropCard(d[0], d[1], d[2]);
            local.strikes.push({ x: d[0], y: d[1], z: d[2], t: 0 });
          }
        }
        if (W.onSummit(qd) && W.onSummit(qv)) c.set((s) => (s.x.stage = 4));
      }
      if (x.stage === 4) {
        local.bossT += dt;
        if (!local.bossOn && local.bossT > 2.5) {
          local.bossOn = true;
          Enemies.spawn('sentinelle', W.P(0, W.TOP, 0), { phase: 1, ph: 1, st: 0, atk: 2, stunImm: 99 });
          bfx('roar');
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
            c.send('s4wipe', 4);
            c.spawn(W.spawn(4, c.role), 0);
            HUD.say(TX.wipe, T.master, 2600);
          }
        } else local.wipe = 0;
      }
      if (x.stage === 5) {
        local.winT = W.nearCard(qd) && W.nearCard(qv) ? local.winT + dt : Math.min(local.winT, 0);
        if (!x.won && local.winT > 1) c.set((s) => (s.x.won = true));
        if (x.won) {
          local.done = (local.done || 0) + dt;
          if (local.done > 3.5) c.goto('reward', (s) => (s.x.card = 's4'));
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
      if (d.a === 'brk' && x.stage === 1) {
        const set = new Set(x.brk);
        if (d.v) set.add(d.id);
        else set.delete(d.id);
        const next = [...set].sort();
        if (next.join() !== x.brk.join()) c.set((s) => (s.x.brk = next));
      }
      if (d.a === 'crank' && x.stage === 2) {
        const v = d.v && who === needed(x) ? who : x.crank === who ? '' : x.crank;
        if (v !== x.crank) c.set((s) => (s.x.crank = v));
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const host = Net.isHost;
      // shared clocks: the host is the truth, the guest follows with latency compensation
      const w = omega(x);
      const wa = omegaArm(x);
      local.ga += w * dt;
      local.aa += wa * dt;
      local.wt += dt;
      if (!host) {
        // each shared value is extrapolated from the moment it last changed (plus half the ping),
        // then the local clock eases toward it
        const now = performance.now();
        const age = (k, v) => {
          const s = (local.seen[k] = local.seen[k] || { v: null, t: now });
          if (s.v !== v) {
            s.v = v;
            s.t = now;
          }
          return lat() + Math.min(1, (now - s.t) / 1000);
        };
        const pg = x.ga + w * age('ga', x.ga);
        const pa = x.aa + wa * age('aa', x.aa);
        const pw = x.wt + age('wt', x.wt);
        const pl = Math.min(W.LIFT.y1, x.ly + (x.lv || 0) * age('ly', x.ly));
        local.ga += (pg - local.ga) * Math.min(1, dt * 3);
        local.aa += (pa - local.aa) * Math.min(1, dt * 3);
        local.wt += (pw - local.wt) * Math.min(1, dt * 3);
        if (Math.abs(pw - local.wt) > 2) local.wt = pw;
        local.ly += (x.lv || 0) * dt;
        local.ly += (pl - local.ly) * Math.min(1, dt * 4);
        if (Math.abs(pl - local.ly) > 3) local.ly = pl;
        local.lv = x.lv || 0;
      }
      if (x.stage >= 3) local.ly = W.LIFT.y1;
      W.update(dt, t, x, r, { ga: local.ga, aa: local.aa, ly: local.ly, lv: local.lv, wt: local.wt, braked: (x.brk || []).length > 0 });
      Enemies.render(dt, t);
      const body = Player.body;
      const q = W.rel(body.p);
      // riding a cog: carried with it
      const disc = W.discUnder(body);
      if (disc) {
        body.p.x += disc.x - disc.px;
        body.p.z += disc.z - disc.pz;
      }
      // the cogs moved after this frame's physics: one that slid into the player would make the
      // next physics step shove them under it. Settle that here: low enough, they climb onto it;
      // otherwise the cog pushes them aside.
      W.discs.forEach((d) =>
        d.boxes.forEach(({ b }) => {
          const p = body.p;
          const r = body.r;
          if (!b.on || p.x + r <= b.min[0] || p.x - r >= b.max[0] || p.z + r <= b.min[2] || p.z - r >= b.max[2]) return;
          if (p.y + body.h <= b.min[1] || p.y >= b.max[1]) return;
          if (b.max[1] - p.y <= 1.1) {
            p.y = b.max[1];
            if (body.v.y < 0) body.v.y = 0;
            return;
          }
          const px = Math.min(p.x + r - b.min[0], b.max[0] - (p.x - r));
          const pz = Math.min(p.z + r - b.min[2], b.max[2] - (p.z - r));
          if (px < pz) p.x = p.x < (b.min[0] + b.max[0]) / 2 ? b.min[0] - r - 1e-3 : b.max[0] + r + 1e-3;
          else p.z = p.z < (b.min[2] + b.max[2]) / 2 ? b.min[2] - r - 1e-3 : b.max[2] + r + 1e-3;
        }),
      );
      // the great arm sweeps anyone standing on the middle ring
      local.armCd -= dt;
      if (x.stage === 1 && wa > 0 && local.armCd <= 0 && W.armHit(q, local.aa)) {
        local.armCd = 1.2;
        const [ax, az] = W.armDir(local.aa);
        body.v.set(-az * 9, 5.5, ax * 9);
        Combat.apply(8);
        Sound.play('thud', body.p.clone());
        Cam.shake = 0.3;
        if (!local.said.arm) {
          local.said.arm = true;
          HUD.say(TX.armHit, T.master, 3000);
        }
      }
      // updrafts lift whoever stands in a blowing column
      if (x.stage >= 3) {
        W.COLS.forEach((cl, i) => {
          if (!W.inColumn(q, i)) return;
          if (W.colOn(i, local.wt)) {
            const top = q.y > cl.y1 - 0.5;
            // gravity (26) fights the pull: about 8 m/s up the column, a hover at its top
            const want = top ? 2.8 : 11;
            body.v.y += (want - body.v.y) * Math.min(1, dt * 10);
            if (body.v.y > 0) body.grounded = false;
            Player.jumps = 1;
            if (!(local.inWind > 0)) Sound.play('grappleOut');
            local.inWind = 0.4;
          }
        });
        if (local.inWind > 0) {
          local.inWind -= dt;
          if (local.inWind <= 0 && r === 'valet' && !local.said.wind && q.y < 55) {
            local.said.wind = true;
            HUD.say(TX.windTip, T.master, 2600);
          }
        }
      }
      // falling cards: struck where they land (each player judges their own hit)
      for (let i = local.strikes.length - 1; i >= 0; i--) {
        const s = local.strikes[i];
        if (!s.tel) {
          s.tel = true;
          Enemies.telegraph(W.P(s.x, s.y, s.z), 2.2, 0.55);
          Sound.play('flip', W.P(s.x, s.y + 6, s.z));
        }
        s.t += dt;
        if (s.t >= 0.55) {
          local.strikes.splice(i, 1);
          const pos = W.P(s.x, s.y + 0.2, s.z);
          Fx.burst(pos, '#fbefe6', 30, 4, 0.5, -4);
          Sound.play('thud', pos);
          if (Math.hypot(q.x - s.x, q.z - s.z) < 2.2 && Math.abs(q.y - s.y) < 2.2) {
            Combat.apply(14);
            // knocked toward the wall, never over the inner edge of the walkway
            const l = Math.hypot(q.x, q.z) || 1;
            body.v.set((q.x / l) * 3, 3.5, (q.z / l) * 3);
            Cam.shake = 0.35;
            if (!local.said.card) {
              local.said.card = true;
              HUD.say(TX.cardHit, T.master, 1800);
            }
          }
        }
      }
      // fell off the lift: back onto it
      if (x.stage === 2 && q.y < local.ly - 5) c.spawn(W.spawn(2, r, local.ly), 0);
      if (x.stage === 3 && q.y < 30) c.spawn(W.spawn(3, r), 0);
      // boss bar
      const boss = Enemies.boss();
      if (x.stage === 4 && boss) {
        const ph = (boss.phase || 1) % 10;
        const guard = Math.floor((boss.phase || 0) / 10);
        const need = ph === 2 ? 5 : 4;
        const tag = boss.stun > 0 ? 'Étourdie · vise le cœur' : 'Garde · encore ' + (need - guard) + ' coup' + (need - guard > 1 ? 's' : '') + ' d’épée';
        HUD.boss(TX.boss, boss.hp / boss.max, 'Phase ' + ph + ' · ' + tag);
        if (ph !== local.bossPh) local.bossPh = ph;
      } else if (x.stage !== 4) HUD.boss(null);
      // prompts
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 1) {
        const id = Object.keys(W.LEVERS).find((k) => W.nearLever(q, k));
        const hold = id && Input.held('interact') && !Combat.down;
        const want = hold ? id : null;
        if (want !== local.brk) {
          if (local.brk) c.act({ a: 'brk', id: local.brk, v: 0 });
          if (want) {
            c.act({ a: 'brk', id: want, v: 1 });
            Sound.play('switch');
            if (!local.said.brk) {
              local.said.brk = true;
              HUD.say(TX.braked, T.master, 2200);
            }
          }
          local.brk = want;
        }
        if (id) return ['E', TX.brakeP, true];
      }
      if (x.stage === 1 && local.brk) local.brk = null;
      if (x.stage === 2 && W.nearCrank(q, local.ly)) {
        if (r !== needed(x)) {
          if (local.crank) {
            local.crank = false;
            c.act({ a: 'crank', v: 0 });
          }
          if (!local.said['nt' + x.half]) {
            local.said['nt' + x.half] = true;
            HUD.say(TX.notYou, T.master, 2200);
          }
          return null;
        }
        const hold = Input.held('interact') && !Combat.down;
        if (hold !== local.crank) {
          local.crank = hold;
          c.act({ a: 'crank', v: hold ? 1 : 0 });
        }
        return ['E', TX.crankP, true];
      }
      if (local.crank) {
        local.crank = false;
        c.act({ a: 'crank', v: 0 });
      }
      if (x.stage === 3 && q.y > 64 && !local.said.stairs) {
        local.said.stairs = true;
        HUD.objective(TX.summitGo);
      }
      return null;
    },
  });
})();
