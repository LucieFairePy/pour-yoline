// ♠ 9 · Le Sol de lave (épreuve s6). Kits swapped in this trial (js/game/trials.js): Yoline carries
// the valet kit, here the Frost (F freezes lava into crust discs, plugs geysers, cools the Titan's
// armour) and the sword; William the dame kit: grapple and rifle.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('s6');
  const T = CONFIG;
  const W = TrS6;
  const TX = {
    card: CARD,
    title: 'Le Sol de lave',
    boss: 'Le Titan de lave',
    intro: 'Épreuve ' + CARD + '. Le volcan. Ici, le sol brûle : ne restez jamais immobiles.',
    a1: {
      valet:
        'Tu portes le Givre (F) : vise la lave, elle se fige en un disque de pierre. Trois charges, elles reviennent. Fais un chemin pour {mate}.',
      dame: 'Trop large pour sauter. {mate} porte le Givre : {il} fige la lave en disques de pierre. Passe de l’un à l’autre.',
    },
    b1: {
      valet:
        'Les colonnes s’enfoncent quand on s’y attarde : avancez sans vous arrêter. Un geyser gronde avant de jaillir. Ton Givre le bouche, et le bouchon devient une pierre.',
      dame: 'Les colonnes s’enfoncent quand on s’y attarde : avancez sans vous arrêter. Un geyser gronde avant de jaillir : {mate} peut le boucher au Givre.',
    },
    c1: {
      dame: 'Deux leviers ouvrent la porte. Le tien est en haut du grand pilier, à droite : grappin (F) sur l’anneau.',
      valet:
        'Deux leviers ouvrent la porte. Le tien est sur l’îlot, à gauche. Les pierres basses se noient quand la lave monte : fige-toi un chemin.',
    },
    tide: 'La lave monte ! Les pierres basses vont être noyées.',
    leverA: 'Le pont de basalte sort de la lave. Il s’effrite sous les pieds : ne traînez pas dessus.',
    leverB: 'Le levier de l’îlot tient. Le Givre ne fond pas tout de suite : reviens par le pont.',
    gate: 'La porte s’ouvre. Descendez au quai.',
    leverP: 'Tirer le levier',
    // each lever answers one kit (the Dame could also reach the islet by the low stones)
    leverOwn: { a: 'dame', b: 'valet' },
    notMine: 'Ce levier-là, c’est celui de {mate}.',
    board: 'Le radeau d’obsidienne. Montez dessus tous les deux.',
    go: 'Penchez-vous ensemble pour gouverner : tous les deux à gauche, il vire à gauche. Évitez les rochers et les chutes de lave.',
    steer: 'Seul{e}, tu ne le fais tourner qu’à moitié. Il faut être deux du même côté.',
    rock: 'Le radeau a heurté un rocher.',
    fallHit: 'Une chute de lave ! Passez de l’autre côté quand elle coule.',
    salam: 'Des salamandres ! Elles sautent sur le radeau. Le cercle montre où elles vont tomber.',
    spit: 'Des cracheurs dans la lave. Ils ne sont vulnérables que hors de la lave.',
    half: 'Mi-parcours. Si vous tombez tous les deux, le radeau repartira d’ici.',
    arrive: 'La caldeira. Descendez du radeau.',
    bossObj: {
      dame: 'Le Titan. Ses plaques d’armure sont brûlantes : tes balles ricochent. Deux givres de {mate} et une plaque bleuit : tire vite, elle se réchauffe.',
      valet:
        'Le Titan. Deux givres (F) refroidissent une plaque : bleue, {mate} la brise au fusil. Celles des poings, frappe-les aussi à l’épée quand ils reposent au sol.',
    },
    heart: {
      dame: 'Le cœur de magma est à nu. Quand {mate} l’a givré, vise-le : il ne refroidit pas longtemps.',
      valet: 'Le cœur de magma est à nu, trop haut pour l’épée. Deux givres (F) le refroidissent : {mate} tire tant qu’il est bleu. Ensuite il brûle plus fort un moment.',
    },
    hot: 'Trop chaud : ça ricoche. Il faut d’abord le givre.',
    cooled: 'Refroidi ! Frappez maintenant.',
    plateGone: 'Une plaque tombe.',
    wipe: 'Vous êtes tombés tous les deux. On reprend.',
    wipeRaft: 'Vous êtes tombés tous les deux. Le radeau repart du dernier point.',
    won: 'Le Titan s’effondre. La caldeira refroidit enfin.',
    cardObj: 'La carte ' + CARD + ' monte sur sa colonne de basalte. Allez-y ensemble.',
    lava: 'La lave. Retour au dernier point sûr.',
    lavaMate: '{mate} est tombé{pe} dans la lave.',
    frostOut: 'Plus de charge de Givre. Elle revient.',
    shock: 'Sautez l’onde de choc !',
    sink: 'Le sol va s’enfoncer : quittez les dalles qui rougeoient.',
  };
  CONFIG.cards.s6 = {
    title: 'Le Sol de lave',
    sub: 'Épreuve ♠ · réussie',
    lines: [
      'Le sol brûlait. Alors on l’a gelé, un pas après l’autre.',
      'Un radeau, deux corps penchés du même côté.',
      'Et un géant de lave qui a fini par refroidir.',
    ],
  };

  const ICE_MAX = 8;
  const FROST_N = 3;

  // ======================= host → guest effects =======================
  const fxGroup = new THREE.Group();
  R.scene.add(fxGroup);
  const onFx = (k, p) => {
    if (!Story.S || Story.S.phase !== 'tr_s6') return;
    const pos = p ? V3(p[0], p[1], p[2]) : null;
    if (k === 'rock') {
      Sound.play('thud', pos);
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.45);
      if (pos) Fx.burst(pos, '#ff8a3a', 60, 6, 0.8, -10);
    }
    if (k === 'slam') {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.55);
      if (pos) Fx.burst(pos, '#ff7a2a', 140, 9, 1, -10);
    }
    if (k === 'roar') Sound.play('roar');
    if (k === 'rise') {
      Sound.play('rumble', 1);
      Cam.shake = 0.6;
    }
    if (k === 'plate') {
      Sound.play('shatter');
      Sound.play('thud', pos);
      if (pos) Fx.burst(pos, '#9fdcff', 70, 7, 1, -9);
      HUD.say(TX.plateGone, T.master, 1500);
    }
    if (k === 'cool') {
      Sound.play('shatter');
      if (pos) Fx.burst(pos, '#bfe8ff', 50, 5, 0.7, -2);
    }
    if (k === 'heart') {
      Sound.play('roar');
      HUD.objective(TX.heart[Story.role]);
      Cam.shake = 0.5;
    }
    if (k === 'splash' && pos) {
      Sound.play('boom', pos);
      Fx.burst(pos, '#ff7a2a', 40, 6, 0.8, -12);
    }
    if (k === 'leap' && pos) {
      Sound.play('orb', pos);
      Fx.burst(pos, '#ff8a3a', 30, 5, 0.6, -10);
    }
  };
  const bfx = (k, p) => {
    onFx(k, p);
    Net.send('s6fx', [k, p ? [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)] : null]);
  };
  Net.on('s6fx', (d) => onFx(d[0], d[1]));
  const tel = (pos, r, t) => {
    Enemies.telegraph(pos, r, t);
    Net.send('s6tel', [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), r, t]);
  };
  const telLine = (a, b, w, t) => {
    Enemies.telegraphLine(a, b, w, t);
    Net.send('s6tl', [a.x, a.y, a.z, b.x, b.y, b.z, w, t].map((v) => +v.toFixed(2)));
  };
  Net.on('s6tel', (d) => Story.S && Story.S.phase === 'tr_s6' && Enemies.telegraph(V3(d[0], d[1], d[2]), d[3], d[4]));
  Net.on('s6tl', (d) => Story.S && Story.S.phase === 'tr_s6' && Enemies.telegraphLine(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5]), d[6], d[7]));
  const knock = (who, v) => {
    if (who === Story.role) Player.body.v.set(v[0], v[1], v[2]);
    else Net.send('s6kn', [who, ...v.map((x) => +x.toFixed(2))]);
  };
  Net.on('s6kn', (d) => d[0] === Story.role && Player.body.v.set(d[1], d[2], d[3]));

  // ---------- frost bolts (seen on both screens) ----------
  const bolts = [];
  const boltGeo = new THREE.OctahedronGeometry(0.22, 1);
  const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe6ff').multiplyScalar(0.85), toneMapped: false });
  const bolt = (a, b) => {
    const m = new THREE.Mesh(boltGeo, boltMat);
    m.position.copy(a);
    fxGroup.add(m);
    bolts.push({ m, a: a.clone(), b: b.clone(), t: 0, d: Math.max(0.12, a.distanceTo(b) / 55) });
    Sound.play('cloak');
  };
  Net.on('s6bolt', (d) => Story.S && Story.S.phase === 'tr_s6' && bolt(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5])));
  const tickBolts = (dt) => {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const o = bolts[i];
      o.t += dt;
      const k = Math.min(1, o.t / o.d);
      o.m.position.lerpVectors(o.a, o.b, k);
      o.m.position.y += Math.sin(k * Math.PI) * 0.6;
      o.m.rotation.set(o.t * 9, o.t * 7, 0);
      if (Math.random() < 0.7) Fx.burst(o.m.position.clone(), '#9fdcff', 2, 0.6, 0.35, 0);
      if (k >= 1) {
        Fx.burst(o.b, '#bfe8ff', 34, 4, 0.6, -2);
        Sound.play('shatter');
        fxGroup.remove(o.m);
        bolts.splice(i, 1);
      }
    }
  };

  // ---------- caldera effects: shock rings and falling magma ----------
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff7a2a').multiplyScalar(0.85),
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    toneMapped: false,
    depthWrite: false,
  });
  const waves = [];
  const rain = [];
  const blobGeo = new THREE.IcosahedronGeometry(0.9, 1);
  const blobMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a1a').multiplyScalar(0.85), toneMapped: false });
  const addWave = (t0) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.9, 72, 1, true), ringMat.clone());
    m.position.copy(W.P(W.CAL.x, W.TILE_TOP + 0.45, W.CAL.z));
    fxGroup.add(m);
    waves.push({ m, t0, hit: false });
  };
  const addRain = (pts, t0) =>
    pts.forEach(([x, z]) => {
      const m = new THREE.Mesh(blobGeo, blobMat);
      m.visible = false;
      fxGroup.add(m);
      rain.push({ m, x, z, t0, hit: false });
      Enemies.telegraph(W.P(x, W.TILE_TOP, z), 2.3, Math.max(0.4, t0 + 1.5 - local.clk));
    });
  const WAVE_V = 9.5;
  const WAVE_W = 0.95;

  // ======================= enemies =======================
  const EM = {};
  const emats = () => {
    if (EM.skin) return;
    EM.skin = Tex.mat('rock', { color: '#3b2a2a', scale: 0.8, rough: 0.8, bump: 0.8 });
    EM.belly = new THREE.MeshStandardMaterial({ color: '#7a2a14', roughness: 0.6, emissive: '#4a1404', emissiveIntensity: 0.8 });
    EM.glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a').multiplyScalar(0.85), toneMapped: false });
    EM.eye = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(0.85), toneMapped: false });
    EM.rock = Tex.mat('rock', { color: '#3a2c2e', scale: 2.2, rough: 0.9, bump: 1 });
    EM.rockDark = Tex.mat('rock', { color: '#241a1c', scale: 2, rough: 0.9, bump: 0.9 });
    EM.plateHot = new THREE.MeshStandardMaterial({ color: '#2a1410', roughness: 0.6, metalness: 0.1, emissive: '#ff4a10', emissiveIntensity: 0.35 });
    EM.plateCold = new THREE.MeshStandardMaterial({ color: '#5a6f86', roughness: 0.35, metalness: 0.1, emissive: '#3aa0d0', emissiveIntensity: 0.5 });
    EM.magma = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a1a').multiplyScalar(0.8), toneMapped: false });
  };
  const jit = (geo, amt, seed) => {
    const r = rng(seed);
    const p = geo.attributes.position;
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = p.getX(i).toFixed(2) + ',' + p.getY(i).toFixed(2) + ',' + p.getZ(i).toFixed(2);
      if (!map.has(k)) map.set(k, [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]);
      const d = map.get(k);
      p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    geo.computeVertexNormals();
    return geo;
  };

  // a fire salamander: rocky back, glowing belly and crest, a tail that whips
  const salamModel = (spitter) => () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const add = (geo, mat, x, y, z, parent = body) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const s = spitter ? 1.2 : 0.85;
    const torso = add(jit(new THREE.SphereGeometry(0.42, 14, 10), 0.08, spitter ? 31 : 32), EM.skin, 0, 0.42, 0);
    torso.scale.set(1, 0.7, 1.8);
    const belly = add(new THREE.SphereGeometry(0.38, 14, 10), EM.belly, 0, 0.32, 0);
    belly.scale.set(0.9, 0.5, 1.7);
    const head = new THREE.Group();
    head.position.set(0, 0.5, 0.78);
    body.add(head);
    const skull = add(jit(new THREE.SphereGeometry(0.3, 12, 9), 0.05, 33), EM.skin, 0, 0, 0.1, head);
    skull.scale.set(1, 0.7, 1.4);
    const jaw = add(new THREE.BoxGeometry(0.34, 0.08, 0.42), EM.belly, 0, -0.12, 0.2, head);
    const eyes = [-1, 1].map((k) => add(new THREE.SphereGeometry(0.06, 8, 6), EM.eye, k * 0.15, 0.08, 0.3, head));
    // crest of glowing spines
    for (let i = 0; i < 7; i++) {
      const sp = add(new THREE.ConeGeometry(0.06, 0.28 - i * 0.02, 5), EM.glow, 0, 0.72 - i * 0.02, 0.55 - i * 0.22);
      sp.rotation.x = -0.4;
    }
    const tail = [];
    let parent = body;
    let z = -0.7;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i ? 0 : 0.38, i ? -0.32 : z);
      parent.add(seg);
      add(new THREE.SphereGeometry(0.22 - i * 0.035, 10, 8), i % 2 ? EM.belly : EM.skin, 0, 0, -0.16, seg).scale.set(1, 0.8, 1.6);
      tail.push(seg);
      parent = seg;
    }
    const legs = [];
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        const leg = new THREE.Group();
        leg.position.set(sx * 0.36, 0.32, sz * 0.4);
        body.add(leg);
        add(new THREE.CylinderGeometry(0.07, 0.05, 0.4, 6).rotateZ(sx * 0.9), EM.skin, sx * 0.14, -0.1, 0, leg);
        add(new THREE.SphereGeometry(0.08, 6, 5), EM.belly, sx * 0.28, -0.26, 0.05, leg);
        legs.push(leg);
      }),
    );
    // the bubbling ring it leaves on the lava when it swims
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.2, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb070').multiplyScalar(0.8), transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false }),
    );
    g.add(ripple);
    body.scale.setScalar(s);
    return { g, body, bodyScale: s, eye: eyes[0], parts: { head, jaw, tail, legs, ripple, eyes } };
  };
  const salamRender = (e, m, dt, t) => {
    const P_ = m.parts;
    const under = e.st === 1 || e.st === 0 || e.st === 5;
    m.body.visible = !under;
    P_.ripple.visible = under || e.st === 4;
    P_.ripple.position.y = (e.ly != null ? e.ly : 0) - e.pos.y + 0.06;
    P_.ripple.scale.setScalar(1 + Math.sin(t * 8 + e.id) * 0.15);
    P_.ripple.material.opacity = under ? 0.55 + 0.3 * Math.sin(t * 12) : 0.4;
    const walk = e.st === 3 ? t * 12 : t * 3;
    P_.legs.forEach((l, i) => (l.rotation.x = Math.sin(walk + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6));
    P_.tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 6 - i * 0.7) * 0.35));
    P_.jaw.rotation.x = e.st === 4 ? 0.5 + Math.sin(t * 20) * 0.1 : Math.max(0, Math.sin(t * 2)) * 0.1;
    if (e.st === 2) m.body.rotation.x = -0.5;
    else m.body.rotation.x = 0;
    const frozen = e.stun > 0;
    m.body.traverse((o) => {
      if (o.isMesh && o.material === EM.skin) o.scale.y = o.scale.y;
    });
    P_.eyes.forEach((eye) => eye.material.color.set(frozen ? '#9fe6ff' : '#ffd27a').multiplyScalar(0.85));
  };

  // the leaper: swims to the raft, leaps onto a telegraphed spot, then hunts on the deck
  Enemies.define('salamandre', {
    stats: { hp: 40, speed: 0, radius: 0.6, hitR: 0.75, height: 0.8, reach: 3.0, stunP: 0, dieColor: '#ff7a2a' },
    model: salamModel(false),
    hidden: (e) => e.st === 1 || e.st === 0,
    sim(e, dt, players, targets) {
      const L = local;
      e.t = (e.t || 0) - dt;
      if (e.stun > 0) {
        // frozen solid: it rides the raft but does nothing
        if (e.st === 3) rideRaft(e);
        return;
      }
      if (e.st == null || e.st === 0) {
        e.st = 1;
        e.t = 1.3;
      }
      if (e.st === 1) {
        // swim alongside, then leap
        const rx = W.cx(L.rz) + L.ru;
        e.pos.x = damp(e.pos.x, rx + e.side * (W.RAFT.hx + 2.4), 3, dt);
        e.pos.z += (L.rv || 0) * dt;
        e.pos.y = 0;
        e.ly = 0;
        if (e.t <= 0) {
          e.st = 2;
          e.t = 0.9;
          e.lu = (Math.random() - 0.5) * (W.RAFT.hx * 1.3);
          e.lz = (Math.random() - 0.5) * (W.RAFT.hz * 1.4);
          e.from = e.pos.clone();
          raftMark(e.lu, e.lz, 0.9);
          bfx('leap', e.pos);
        }
        return;
      }
      if (e.st === 2) {
        const k = 1 - Math.max(0, e.t) / 0.9;
        const to = W.P(W.cx(L.rz) + L.ru + e.lu, W.RAFT.top, L.rz + e.lz);
        e.pos.lerpVectors(e.from, to, k);
        e.pos.y += Math.sin(k * Math.PI) * 3.2;
        e.yaw = Math.atan2(to.x - e.from.x, to.z - e.from.z);
        if (e.t <= 0) {
          e.st = 3;
          e.pos.copy(to);
          e.atk = 0.8;
          players.forEach((p) => {
            if (!p.down && Math.hypot(p.pos.x - to.x, p.pos.z - to.z) < 1.3) Combat.hurt(p.who, 12, to);
          });
          bfx('splash', to);
        }
        return;
      }
      if (e.st === 3) {
        rideRaft(e);
        let best = null;
        let bd = 1e9;
        targets.forEach((p) => {
          const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          if (d < bd && W.onRaft(W.rel(p.pos), L.rz, L.ru)) {
            bd = d;
            best = p;
          }
        });
        if (!best) return;
        const dx = best.pos.x - e.pos.x;
        const dz = best.pos.z - e.pos.z;
        e.yaw = angleDamp(e.yaw, Math.atan2(dx, dz), 8, dt);
        if (bd > 1.1) {
          e.pos.x += (dx / bd) * 2.6 * dt;
          e.pos.z += (dz / bd) * 2.6 * dt;
          clampDeck(e);
        } else if (e.atk <= 0) {
          e.atk = 1.2;
          Combat.hurt(best.who, 9, e.pos);
        }
      }
    },
    render: salamRender,
  });
  // the spitter: surfaces beside the raft, spits three fireballs, dives again
  Enemies.define('cracheur', {
    stats: { hp: 45, speed: 0, radius: 0.8, hitR: 1.0, height: 1.0, reach: 3.0, stunP: 0, dieColor: '#ff7a2a' },
    model: salamModel(true),
    hidden: (e) => e.st === 5 || e.st === 0,
    sim(e, dt, players, targets) {
      const L = local;
      e.t = (e.t || 0) - dt;
      const rx = W.cx(L.rz) + L.ru;
      const want = clamp(rx + e.side * (W.RAFT.hx + 3.4), W.cx(L.rz) - W.RIVER.hw + 1, W.cx(L.rz) + W.RIVER.hw - 1);
      e.pos.x = damp(e.pos.x, want, 2, dt);
      e.pos.z = damp(e.pos.z, L.rz + e.dz, 2, dt);
      e.ly = 0;
      if (e.st == null || e.st === 0) {
        e.st = 5;
        e.t = 1.6;
      }
      if (e.stun > 0) {
        e.st = 4;
        e.pos.y = 0.1;
        return;
      }
      if (e.st === 5) {
        e.pos.y = -0.6;
        if (e.t <= 0) {
          e.st = 4;
          e.t = 3.8;
          e.shots = 0;
          e.atk = 0.9;
          bfx('splash', e.pos);
        }
        return;
      }
      if (e.st === 4) {
        e.pos.y = damp(e.pos.y, 0.1, 6, dt);
        let best = null;
        let bd = 1e9;
        targets.forEach((p) => {
          const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          if (d < bd) {
            bd = d;
            best = p;
          }
        });
        if (best) e.yaw = angleDamp(e.yaw, Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z), 6, dt);
        if (best && e.atk <= 0 && e.shots < 3) {
          e.atk = 1.05;
          e.shots++;
          // lead the raft a little: it is moving
          const to = best.pos.clone().add(V3(0, 1.0, (L.rv || 0) * 0.5));
          Enemies.fire(e.pos.clone().add(V3(0, 0.9, 0)), to, 13, 11);
        }
        if (e.t <= 0) {
          e.st = 5;
          e.t = 2.4;
        }
      }
    },
    render: salamRender,
  });

  // ---------- the Lava Titan ----------
  const heartShape = (k) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const [x, y] = Heart.curve((i / 64) * TAU);
      if (i) s.lineTo(x * k, (y - 2.5) * k);
      else s.moveTo(x * k, (y - 2.5) * k);
    }
    return s;
  };
  // arm targets (titan-local, before yaw): rest at the sides, raised for a slam, down on the
  // tiles after it, swept wide for the beam, low when it kneels
  const FIST = {
    idle: [6.2, 5.2, 2.2],
    raise: [3.4, 15.5, 1.5],
    slam: [3.4, W.TILE_TOP + 0.9, 10.6],
    beam: [7.5, 8, 4.5],
    kneel: [5.8, 2.0, 5.5],
    rise: [6.2, -3, 2.2],
  };
  const fistKey = (st) => (st === 1 ? 'raise' : st === 2 ? 'slam' : st === 5 || st === 6 ? 'beam' : st === 7 ? 'kneel' : st === 9 ? 'rise' : 'idle');
  const fistLocal = (st, side) => {
    const f = FIST[fistKey(st)];
    return [side * f[0], f[1], f[2]];
  };
  const toWorld = (e, lx, ly, lz, out = V3()) => {
    const c = Math.cos(e.yaw);
    const s = Math.sin(e.yaw);
    // yaw turns local +z toward (sin yaw, cos yaw)
    return out.set(e.pos.x + lx * c + lz * s, e.pos.y + ly, e.pos.z - lx * s + lz * c);
  };
  const SHOULDER = [3.4, 9.6, 0.4];

  const titanModel = () => {
    emats();
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const add = (geo, mat, x, y, z, parent = body) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    // the lower body melts into the pool: a skirt of rock and magma
    const skirt = add(jit(new THREE.CylinderGeometry(3.2, 4.6, 4, 14, 3, true), 0.5, 41), EM.rockDark, 0, 1, 0);
    void skirt;
    const hips = add(jit(new THREE.DodecahedronGeometry(3.0, 1), 0.5, 42), EM.rock, 0, 4.0, 0);
    hips.scale.set(1.1, 0.7, 0.9);
    const torso = new THREE.Group();
    torso.position.y = 7.2;
    body.add(torso);
    const chest = add(jit(new THREE.DodecahedronGeometry(3.4, 1), 0.6, 43), EM.rock, 0, 0, 0, torso);
    chest.scale.set(1.15, 0.95, 0.85);
    // magma seams across the body
    const seams = [];
    for (let i = 0; i < 6; i++) {
      const s = add(new THREE.TorusGeometry(2.6 + (i % 3) * 0.4, 0.07, 4, 28, Math.PI * (0.6 + (i % 2) * 0.4)), EM.magma, 0, -1 + i * 0.45, 0, torso);
      s.rotation.set(Math.PI / 2 + (i - 3) * 0.12, i * 1.1, 0);
      seams.push(s);
    }
    // chest doors of rock over the heart, they burst open in phase 2
    const doors = [-1, 1].map((sd) => {
      const pv = new THREE.Group();
      pv.position.set(sd * 1.2, 0.2, 2.6);
      torso.add(pv);
      const d = add(jit(new THREE.BoxGeometry(1.5, 2.6, 0.7, 2, 3, 1), 0.2, 44 + sd), EM.rockDark, -sd * 0.7, 0, 0, pv);
      void d;
      return pv;
    });
    // the heart: a heart-shaped magma core with a little heart-galaxy inside
    const heart = new THREE.Group();
    heart.position.set(0, 0.3, 2.35);
    torso.add(heart);
    const heartMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a1a').multiplyScalar(0.8), toneMapped: false });
    const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.07), { depth: 0.5, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08 }), heartMat);
    hm.position.z = -0.3;
    heart.add(hm);
    const frostShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 20, 14),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe6ff').multiplyScalar(0.7), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
    );
    heart.add(frostShell);
    const gal = Heart.galaxy(2500, 4, 66);
    gal.group.scale.setScalar(0.03);
    gal.core.material.opacity = 0;
    gal.U.uFade.value = 0.7;
    heart.add(gal.group);
    // head: a basalt crown and eyes of fire
    const head = new THREE.Group();
    head.position.y = 11.4;
    body.add(head);
    const skull = add(jit(new THREE.DodecahedronGeometry(1.5, 1), 0.3, 45), EM.rock, 0, 0, 0, head);
    skull.scale.set(1, 1.1, 1.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb040').multiplyScalar(0.85), toneMapped: false });
    const eyes = [-1, 1].map((sd) => add(new THREE.SphereGeometry(0.24, 10, 8), eyeMat, sd * 0.55, 0.15, 1.3, head));
    const mouth = add(new THREE.BoxGeometry(1.0, 0.16, 0.2), EM.magma, 0, -0.55, 1.35, head);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const sp = add(jit(new THREE.ConeGeometry(0.35, 1.6 + (i % 3) * 0.6, 6), 0.08, 50 + i), EM.rockDark, Math.cos(a) * 1.15, 1.3, Math.sin(a) * 1.15, head);
      sp.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
    }
    // arms: shoulder boulder, upper arm, forearm toward the fist (posed every frame)
    const arms = [-1, 1].map((sd) => {
      const sh = add(jit(new THREE.DodecahedronGeometry(1.6, 1), 0.3, 60 + sd), EM.rock, sd * SHOULDER[0], SHOULDER[1], SHOULDER[2]);
      const upper = add(jit(new THREE.CylinderGeometry(0.9, 1.1, 1, 8, 2), 0.18, 62 + sd), EM.rock, 0, 0, 0);
      const fore = add(jit(new THREE.CylinderGeometry(0.85, 1.0, 1, 8, 2), 0.18, 64 + sd), EM.rockDark, 0, 0, 0);
      const fist = add(jit(new THREE.DodecahedronGeometry(1.35, 1), 0.3, 66 + sd), EM.rock, 0, 0, 0);
      const elbow = add(new THREE.SphereGeometry(0.85, 10, 8), EM.magma, 0, 0, 0);
      return { sd, sh, upper, fore, fist, elbow, f: V3(sd * 6, 5, 2), e: V3() };
    });
    body.scale.setScalar(1);
    return { g, body, bodyScale: 1, heart, eye: eyes[0], parts: { torso, chest, doors, seams, heartMat, frostShell, gal, head, eyes, eyeMat, mouth, arms, hips } };
  };

  // world positions of the two shoulder plates and the two fist plates for a titan pose
  const platePos = (e, k, out = V3()) => {
    const side = k % 2 ? 1 : -1;
    if (k < 2) return toWorld(e, side * (SHOULDER[0] + 0.3), SHOULDER[1] + 1.1, SHOULDER[2] + 0.6, out);
    const f = e.fists ? e.fists[side > 0 ? 1 : 0] : fistLocal(e.st, side);
    return toWorld(e, f[0], f[1] + 1.05, f[2] - 0.2, out);
  };

  Enemies.define('plaque', {
    stats: { hp: 200, speed: 0, radius: 0.9, hitR: 1.25, height: 1.2, reach: 3.6, stunP: 0, dieColor: '#9fdcff' },
    model: () => {
      emats();
      const g = new THREE.Group();
      const body = new THREE.Group();
      g.add(body);
      const plate = new THREE.Mesh(jit(new THREE.CylinderGeometry(1.15, 1.25, 0.5, 6, 1), 0.08, 81), EM.plateHot.clone());
      plate.rotation.x = Math.PI / 2;
      plate.position.y = 0.6;
      body.add(plate);
      const rune = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.028), { depth: 0.12, bevelEnabled: false }), EM.magma.clone());
      rune.position.set(0, 0.6, 0.22);
      body.add(rune);
      const frost = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 1.55, 6),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe6ff').multiplyScalar(0.8), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }),
      );
      frost.position.y = 0.6;
      body.add(frost);
      return { g, body, eye: null, parts: { plate, rune, frost } };
    },
    mult(e) {
      if (!e.vuln) {
        e.hotT = 0.6;
        return 0;
      }
      return 1;
    },
    sim(e, dt) {
      e.coolT = Math.max(0, (e.coolT || 0) - dt);
      if (e.coolT <= 0) e.vuln = false;
      e.halfT = (e.halfT || 0) - dt;
      if (e.halfT <= 0) e.recover = false;
    },
    render(e, m, dt, t) {
      const P_ = m.parts;
      const c = e.vuln;
      P_.plate.material.color.set(c ? '#6f86a0' : '#2a1410');
      P_.plate.material.emissive.set(c ? '#3aa0d0' : '#ff4a10');
      P_.plate.material.emissiveIntensity = c ? 0.45 : 0.3 + Math.sin(t * 4 + e.id) * 0.12;
      P_.rune.material.color.set(c ? '#bfe8ff' : '#ff6a1a').multiplyScalar(c ? 0.7 : 0.8);
      P_.frost.material.opacity = c ? 0.8 : e.recover ? 0.35 + 0.2 * Math.sin(t * 10) : 0;
      P_.frost.rotation.z = t;
      m.g.rotation.x = 0;
    },
  });

  const TITAN_HP = 1200;
  Enemies.define('titan', {
    stats: { hp: TITAN_HP, speed: 0, radius: 4, hitR: 4.6, height: 12, boss: true, reach: 10.5, stunP: 0, weakR: 1.7, dieColor: '#ff7a2a' },
    model: titanModel,
    // while plates remain, shots pass through the body to them
    hidden: (e) => (e.phase || 1) === 1 || e.st === 9,
    mult(e, weak) {
      if ((e.phase || 1) === 1) return 0;
      if (!e.vuln) {
        hint('hot');
        return 0;
      }
      // one cooling is worth at most a third of its life
      e.win = (e.win || 0) + (weak ? 27 : 14);
      if (e.win >= e.max * 0.25) e.coolT = Math.min(e.coolT, 0.05);
      return weak ? 3 : 1.4;
    },
    sim(e, dt, players, targets) {
      titanSim(e, dt, players, targets);
    },
    render(e, m, dt, t) {
      titanRender(e, m, dt, t);
    },
  });

  // ======================= the level state =======================
  const local = {
    clk: 0,
    csync: 0,
    seen: {},
    said: {},
    stage: 0,
    cp: -1,
    rz: W.RAFT.z0,
    ru: 0,
    rv: 0,
    rw: 0,
    lean: 0,
    rsync: 0,
    frost: FROST_N,
    frostT: 0,
    lavaCd: 0,
    fallCd: 0,
    wipe: 0,
    bossT: 0,
    bossOn: false,
    done: 0,
    winT: 0,
    goT: 0,
    waves: [],
    hintT: {},
    raftPrev: null,
    marks: [],
  };
  const hint = (k) => {
    const now = performance.now();
    if (now - (local.hintT[k] || 0) < 6000) return;
    local.hintT[k] = now;
    if (k === 'hot') {
      HUD.say(TX.hot, T.master, 1600);
      Net.send('s6hint', k);
    }
  };
  Net.on('s6hint', (k) => Story.S && Story.S.phase === 'tr_s6' && k === 'hot' && HUD.say(TX.hot, T.master, 1600));

  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: false };
    });
  const lat = () => Math.min(0.25, (Net.rtt || 80) / 2000);

  // things on the raft ride with it
  const rideRaft = (e) => {
    const p = local.raftPrev;
    if (!p) return;
    e.pos.x += p.dx;
    e.pos.z += p.dz;
    e.pos.y = W.O.y + W.RAFT.top;
  };
  const clampDeck = (e) => {
    const cxr = W.O.x + W.cx(local.rz) + local.ru;
    const czr = W.O.z + local.rz;
    e.pos.x = clamp(e.pos.x, cxr - W.RAFT.hx + 0.5, cxr + W.RAFT.hx - 0.5);
    e.pos.z = clamp(e.pos.z, czr - W.RAFT.hz + 0.5, czr + W.RAFT.hz - 0.5);
  };
  // telegraph rings drawn on the deck (they move with the raft)
  const markGeo = new THREE.RingGeometry(0.25, 1.3, 32).rotateX(-Math.PI / 2);
  const raftMark = (u, z, t) => {
    addMark(u, z, t);
    Net.send('s6mk', [+u.toFixed(2), +z.toFixed(2), t]);
  };
  const addMark = (u, z, t) => {
    const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3a').multiplyScalar(0.85), transparent: true, opacity: 0.4, toneMapped: false, depthWrite: false }));
    fxGroup.add(m);
    local.marks.push({ m, u, z, t, max: t });
  };
  Net.on('s6mk', (d) => Story.S && Story.S.phase === 'tr_s6' && addMark(d[0], d[1], d[2]));

  // ---------- the titan's brain (host) ----------
  const ATTACKS = { 1: ['slam', 'rain', 'sink', 'slam', 'rain'], 2: ['slam', 'beam', 'sink', 'rain', 'beam', 'slam', 'sink2'] };
  const PATTERNS = ['half', 'checker', 'inner', 'outer', 'cross'];
  const plates = () => [...Enemies.list.values()].filter((e) => e.type === 'plaque');
  const titanSim = (e, dt, players, targets) => {
    const c = Story.ctx;
    e.t = (e.t || 0) - dt;
    e.coolT = Math.max(0, (e.coolT || 0) - dt);
    e.frostImm = Math.max(0, (e.frostImm || 0) - dt);
    e.halfT = (e.halfT || 0) - dt;
    if (e.halfT <= 0) e.recover = false;
    if (!e.phase) e.phase = 1;
    // plates follow the pose
    const pl = plates();
    pl.forEach((p) => {
      platePos(e, p.k, p.pos);
      p.yaw = e.yaw;
    });
    // fists ease toward the pose (the host keeps them for the plates and the slam hit)
    if (!e.fists) e.fists = [fistLocal(e.st, -1), fistLocal(e.st, 1)];
    [-1, 1].forEach((sd, i) => {
      const f = fistLocal(e.st, sd);
      const k = e.st === 2 ? 22 : 6;
      e.fists[i] = e.fists[i].map((v, j) => damp(v, f[j], k, dt));
    });
    if (e.st === 9) {
      // rising out of the pool
      e.pos.y = W.O.y - 12 + Math.min(1, 1 - e.t / 3.5) * 12;
      if (e.t <= 0) {
        e.pos.y = W.O.y;
        e.st = 0;
        e.atk = 1.2;
        bfx('roar');
      }
      return;
    }
    if (e.phase === 1 && pl.length === 0 && e.st !== 8) {
      e.phase = 2;
      e.st = 8;
      e.t = 2.2;
      e.vuln = false;
      bfx('heart', e.pos.clone().add(V3(0, 7, 0)));
      return;
    }
    if (e.vuln && e.coolT <= 0) {
      e.vuln = false;
      e.win = 0;
      // it burns hotter for a while: no freezing it straight away
      e.frostImm = 9;
      e.st = 8;
      e.t = 1.6;
      bfx('roar');
      return;
    }
    if (e.vuln) {
      e.st = 7;
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
    if (best && e.st !== 2 && e.st !== 6) e.yaw = angleDamp(e.yaw, Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z), e.st === 1 ? 1.2 : 2, dt);
    const P2 = e.phase === 2;
    const clk = local.clk;
    if (e.st === 0 || e.st == null || e.st === 7) {
      e.st = 0;
      if (e.atk > 0 || !best) return;
      const list = ATTACKS[e.phase];
      e.ai = ((e.ai || 0) + 1) % list.length;
      const k = list[e.ai];
      if (k === 'slam') {
        e.st = 1;
        e.t = P2 ? 1.3 : 1.6;
        // where the fists will land
        [-1, 1].forEach((sd) => {
          const f = FIST.slam;
          tel(toWorld(e, sd * f[0], 0, f[2]).setY(W.O.y + W.TILE_TOP), 3.0, e.t);
        });
      } else if (k === 'rain') {
        e.st = 3;
        e.t = 0.9;
        const pts = [];
        players.forEach((p) => {
          if (p.down) return;
          const q = W.rel(p.pos);
          pts.push([q.x, q.z]);
        });
        const n = P2 ? 9 : 6;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU;
          const r = 10 + Math.random() * 11;
          pts.push([W.CAL.x + Math.cos(a) * r, W.CAL.z + Math.sin(a) * r]);
        }
        const d = pts.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);
        c.set((s) => (s.x.rain = { t: +(clk + 0.9).toFixed(2), p: d, n: (s.x.rain ? s.x.rain.n : 0) + 1 }));
      } else if ((k === 'sink' || k === 'sink2') && !(Story.S.x.tsink && clk - Story.S.x.tsink.t < W.SINK_LIFE + 0.5)) {
        e.st = 4;
        e.t = 1.2;
        const p = PATTERNS[(Math.random() * PATTERNS.length) | 0];
        const a = best ? Math.atan2(best.pos.z - e.pos.z, best.pos.x - e.pos.x) : Math.random() * TAU;
        c.set((s) => (s.x.tsink = { p, a: +a.toFixed(2), t: +(clk + 0.3).toFixed(2) }));
      } else if (k === 'beam') {
        e.st = 5;
        e.t = 1.4;
        const base = e.yaw;
        e.lines = [base];
        const to = toWorld(e, 0, 0, 24).setY(W.O.y + W.TILE_TOP);
        telLine(V3(e.pos.x, W.O.y + W.TILE_TOP, e.pos.z), to, 3.6, e.t);
      }
      return;
    }
    if (e.t > 0) return;
    if (e.st === 1) {
      // the fists come down: the shock ring rolls out across the arena
      e.st = 2;
      e.t = P2 ? 2.4 : 3.6;
      const hitAt = [-1, 1].map((sd) => toWorld(e, sd * FIST.slam[0], 0, FIST.slam[2]).setY(W.O.y + W.TILE_TOP));
      bfx('slam', hitAt[0]);
      hitAt.forEach((h) =>
        players.forEach((p) => {
          if (!p.down && Math.hypot(p.pos.x - h.x, p.pos.z - h.z) < 3.0 && p.pos.y - h.y < 2.5) {
            Combat.hurt(p.who, 26, h);
            knock(p.who, [(p.pos.x - h.x) * 2, 7, (p.pos.z - h.z) * 2]);
          }
        }),
      );
      c.set((s) => (s.x.wave = { t: +clk.toFixed(2), n: (s.x.wave ? s.x.wave.n : 0) + 1 }));
    } else if (e.st === 2) {
      e.st = 0;
      e.atk = P2 ? 0.8 : 1.4;
    } else if (e.st === 3 || e.st === 4) {
      e.st = 0;
      e.atk = P2 ? 2.2 : 2.8;
    } else if (e.st === 5) {
      // the beam: a line of magma along the telegraph
      e.st = 6;
      e.t = 0.5;
      const dx = Math.sin(e.yaw);
      const dz = Math.cos(e.yaw);
      bfx('slam', toWorld(e, 0, W.TILE_TOP, 12));
      players.forEach((p) => {
        if (p.down) return;
        const rx = p.pos.x - e.pos.x;
        const rz = p.pos.z - e.pos.z;
        const along = rx * dx + rz * dz;
        const side = Math.abs(rx * dz - rz * dx);
        if (along > 0 && along < 25 && side < 1.9 && p.pos.y - W.O.y < W.TILE_TOP + 2.2) {
          Combat.hurt(p.who, 24, e.pos);
          knock(p.who, [dz * (rx * dz - rz * dx > 0 ? 1 : -1) * 9, 6, -dx * (rx * dz - rz * dx > 0 ? 1 : -1) * 9]);
        }
      });
    } else if (e.st === 6) {
      e.st = 0;
      e.atk = 1.2;
    } else if (e.st === 8) {
      e.st = 0;
      e.atk = 0.6;
    }
  };

  const titanRender = (e, m, dt, t) => {
    const P_ = m.parts;
    const st = e.st || 0;
    const p2 = (e.phase || 1) === 2;
    const a = (e._a = e._a || { open: 0, kneel: 0, rise: 0, slamT: 0, prev: 0 });
    if (a.prev === 1 && st === 2) a.slamT = 0.25;
    a.prev = st;
    a.slamT = Math.max(0, a.slamT - dt);
    a.open = damp(a.open, p2 ? 1 : 0, 3, dt);
    a.kneel = damp(a.kneel, st === 7 ? 1 : 0, 5, dt);
    // kneeling: the body sinks and leans forward, the chest comes within reach
    m.body.position.y = -a.kneel * 3.0 + Math.sin(t * 1.2) * 0.12;
    P_.torso.rotation.x = a.kneel * 0.35 + (st === 1 ? -0.15 : st === 2 ? 0.25 : 0);
    P_.head.rotation.x = a.kneel * 0.3 + (st === 8 ? -0.4 : 0);
    P_.doors[0].rotation.y = -a.open * 1.7;
    P_.doors[1].rotation.y = a.open * 1.7;
    const cool = e.vuln ? 1 : 0;
    P_.heartMat.color.set(cool ? '#7cc8f0' : '#ff5a1a').multiplyScalar(cool ? 0.75 : 0.45 + a.open * 0.35 + Math.sin(t * 5) * 0.06);
    P_.frostShell.material.opacity = damp(P_.frostShell.material.opacity, cool ? 0.45 : e.recover ? 0.2 : 0, 8, dt);
    P_.gal.group.visible = a.open > 0.3;
    P_.gal.U.uTime.value = t;
    P_.gal.U.uPx.value = R.renderer.getPixelRatio() * 0.2;
    P_.gal.U.uBeat.value = a.open * (0.5 + 0.5 * Math.sin(t * 6));
    P_.eyeMat.color.set(cool ? '#9fe6ff' : st === 1 || st === 5 ? '#ffd080' : '#ffb040').multiplyScalar(0.85);
    P_.seams.forEach((s, i) => s.material === EM.magma && (s.rotation.z = Math.sin(t * 0.5 + i) * 0.05));
    EM.magma.color.set(cool ? '#5aa0c8' : '#ff5a1a').multiplyScalar(0.55 + 0.25 * Math.sin(t * 3));
    // arms: each fist eases to its pose target; upper arm and forearm span shoulder → elbow → fist
    P_.arms.forEach((arm, i) => {
      const f = fistLocal(st, arm.sd);
      const k = st === 2 && a.slamT > 0 ? 26 : 6;
      arm.f.set(damp(arm.f.x, f[0], k, dt), damp(arm.f.y, f[1], k, dt), damp(arm.f.z, f[2], k, dt));
      const sh = V3(arm.sd * SHOULDER[0], SHOULDER[1], SHOULDER[2]);
      const fist = arm.f.clone();
      fist.y -= m.body.position.y;
      const mid = sh.clone().lerp(fist, 0.5);
      // elbows bow outward and back
      mid.x += arm.sd * 1.6;
      mid.z -= 0.6;
      arm.e.copy(mid);
      const seg = (mesh, from, to) => {
        const d = to.clone().sub(from);
        const len = d.length();
        mesh.position.copy(from).addScaledVector(d, 0.5);
        mesh.scale.set(1, len, 1);
        mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
      };
      seg(arm.upper, sh, mid);
      seg(arm.fore, mid, fist);
      arm.elbow.position.copy(mid);
      arm.fist.position.copy(fist);
      arm.fist.rotation.set(t * 0.2 + i, 0, 0);
    });
    if (st === 9 && Math.random() < dt * 20) Fx.burst(e.pos.clone().add(V3((Math.random() - 0.5) * 8, 0.5, (Math.random() - 0.5) * 8)), '#ff7a2a', 6, 5, 0.8, -10);
  };

  const lightMood = (won) => {
    R.hemi.color.set(won ? '#b08a7a' : '#7a4a44');
    R.hemi.groundColor.set(won ? '#3a1a10' : '#4a1206');
    R.hemi.intensity = won ? 0.5 : 0.42;
    R.moon.color.set(won ? '#ffd0a0' : '#ff9a70');
    R.moon.intensity = won ? 0.7 : 0.5;
  };

  // ---------- stage changes (on every client) ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    if (x.stage === 1) {
      if ((x.cp || 0) === 0) return TX.a1[r];
      if (x.cp === 1) return TX.b1[r];
      const lev = x.lev || {};
      const open = lev.a != null && lev.b != null;
      if (open) return TX.gate;
      if (r === 'dame' && lev.a != null) return TX.leverA;
      if (r === 'valet' && lev.b != null) return TX.leverB;
      return TX.c1[r];
    }
    if (x.stage === 2) return x.arrived ? TX.arrive : x.go ? TX.go : TX.board;
    if (x.stage === 3) return (local.bossPhase || 1) === 2 ? TX.heart[r] : TX.bossObj[r];
    return TX.cardObj;
  };
  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    if (st === 1) W.screen.show(TX.card, TX.title, '#ff7a2a');
    if (st === 2) {
      W.screen2.show('La rivière', 'de forge', '#ffb070');
      Sound.mood('tense');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.say(TX.arrive, T.master, 2200);
      Sound.mood('tense');
    }
    if (st === 4) {
      HUD.boss(null);
      HUD.say(TX.won, T.master, 3200);
      Sound.mood('gold');
      Sound.play('reveal');
      City.mood({ red: 0.35, gold: 0.6 });
      lightMood(true);
      Fx.hearts(W.P(W.CAL.x, 6, W.CAL.z));
      for (let i = 0; i < 6; i++) setTimeout(() => Fx.firework(W.P(W.CAL.x + (Math.random() - 0.5) * 40, 10, W.CAL.z + (Math.random() - 0.5) * 40), 30), i * 450);
    }
    // someone left behind by a stage change joins the other
    if (prev && st > prev) {
      const q = W.rel(Player.body.p);
      const behind = (st === 2 && !W.pastGate(q)) || (st === 3 && !W.inArena(q) && q.z < W.RIVER.z1 - 2);
      if (behind) c.spawn(W.spawn(c.S.x, c.role, local), 0);
    }
  };

  Story.register('tr_s6', {
    world: TrS6,
    init: () => ({
      stage: 1,
      cp: 0,
      clk: 0,
      sink: {},
      gfz: {},
      crumb: {},
      lev: {},
      ice: [],
      go: false,
      rz: W.RAFT.z0,
      ru: 0,
      rv: 0,
      rw: 0,
      lean: 0,
      rcp: W.RAFT.z0,
      wavesDone: [],
      arrived: false,
      tsink: null,
      wave: null,
      rain: null,
      won: false,
    }),
    voice: () => 1,
    net: {
      s6lava: (c, d) => {
        if (d !== c.role) HUD.say(TX.lavaMate, T.master, 2000);
      },
      s6wipe: (c, d) => {
        Combat.reset();
        if (d === 2) {
          local.rz = c.S.x.rcp || W.RAFT.z0;
          local.ru = 0;
        }
        c.spawn(W.spawn(c.S.x, c.role, local), 0);
        HUD.say(d === 2 ? TX.wipeRaft : TX.wipe, T.master, 2600);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.wake();
      Enemies.clear();
      const x = c.S.x;
      local.stage = 0;
      local.cp = -1;
      local.clk = x.clk || 0;
      local.rz = x.rz || W.RAFT.z0;
      local.ru = x.ru || 0;
      local.rv = 0;
      local.bossOn = false;
      local.bossT = 0;
      local.frost = FROST_N;
      local.said = {};
      local.raftPrev = null;
      local.lastWave = x.wave ? x.wave.n : 0;
      local.lastRain = x.rain ? x.rain.n : 0;
      c.spawn(W.spawn(x, c.role, local), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => W.spawn(Story.S.x, c.role, local);
      Player.targets = () => (c.role === 'dame' && Story.S.x.stage === 1 ? W.RINGS_G.map((g, i) => W.ringPos(i)) : []);
      Player.grappleLand = () => (Story.S.x.stage === 1 && Player.target >= 0 ? W.ringLand(Player.target) : null);
      City.mood({ red: 0.95, dark: 0.15 });
      c.fog(0.0085);
      // volcano light: ash-red sky light, warm sun through the smoke (restored on exit)
      if (!local.env)
        local.env = {
          hi: R.hemi.intensity,
          hs: R.hemi.color.getHex(),
          hg: R.hemi.groundColor.getHex(),
          mi: R.moon.intensity,
          mc: R.moon.color.getHex(),
        };
      lightMood(x.stage >= 4);
      Combat.enable(true);
      Combat.noCloak = true;
      // the valet's ability slot is the Frost here
      const ab = document.querySelector('#vAbil span');
      if (ab) ab.textContent = 'Givre';
      HUD.visa(TX.card + ' · ' + TX.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 3600);
      this.apply(c);
    },
    exit() {
      if (local.env) {
        R.hemi.intensity = local.env.hi;
        R.hemi.color.setHex(local.env.hs);
        R.hemi.groundColor.setHex(local.env.hg);
        R.moon.intensity = local.env.mi;
        R.moon.color.setHex(local.env.mc);
        local.env = null;
      }
      Combat.enable(false);
      Combat.noCloak = false;
      Combat.abil = null;
      W.aim(null);
      const ab = document.querySelector('#vAbil span');
      if (ab) ab.textContent = 'Voile';
      Enemies.clear();
      HUD.boss(null);
      Player.targets = null;
      Player.grappleLand = null;
      waves.forEach((w) => fxGroup.remove(w.m));
      waves.length = 0;
      rain.forEach((r) => fxGroup.remove(r.m));
      rain.length = 0;
      local.marks.forEach((mk) => fxGroup.remove(mk.m));
      local.marks.length = 0;
      W.sleep();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      HUD.objective(objective(c));
      // events carried by the state: shock waves and magma rain (late packets still play)
      if (x.wave && x.wave.n !== local.lastWave) {
        local.lastWave = x.wave.n;
        addWave(x.wave.t);
        if (!local.said.shock) {
          local.said.shock = true;
          HUD.say(TX.shock, T.master, 1800);
        }
      }
      if (x.rain && x.rain.n !== local.lastRain) {
        local.lastRain = x.rain.n;
        addRain(x.rain.p, x.rain.t);
      }
      if (x.tsink && x.tsink.t !== local.lastSink) {
        local.lastSink = x.tsink.t;
        Sound.play('rumble', 0.8);
        if (!local.said.sink) {
          local.said.sink = true;
          HUD.say(TX.sink, T.master, 2200);
        }
      }
      const lev = x.lev || {};
      if (local.levA === false && lev.a != null) {
        HUD.say(TX.leverA, T.master, 3000);
        Sound.play('rumble', 0.7);
      }
      if (local.levB === false && lev.b != null) HUD.say(TX.leverB, T.master, 2600);
      if (local.open === false && lev.a != null && lev.b != null) {
        HUD.say(TX.gate, T.master, 2600);
        Sound.play('door');
        W.screen2.show('La porte', 'est ouverte', '#7cffb0');
      }
      local.levA = lev.a != null;
      local.levB = lev.b != null;
      local.open = lev.a != null && lev.b != null;
      if (local.go === false && x.go) HUD.say(TX.go, T.master, 4200);
      local.go = !!x.go;
      if (local.half === false && x.rcp > W.RAFT.z0 + 1) HUD.say(TX.half, T.master, 2400);
      local.half = x.rcp > W.RAFT.z0 + 1;
      if (local.cp !== x.cp && local.cp >= 0 && x.stage === 1) Sound.play('chime');
      local.cp = x.cp;
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = W.rel(ps[0].pos);
      const qv = W.rel(ps[1].pos);
      local.clk += dt;
      local.csync += dt;
      if (local.csync > 0.5) {
        local.csync = 0;
        c.set((s) => (s.x.clk = +local.clk.toFixed(2)));
      }
      const clk = local.clk;
      if (x.stage === 1) {
        // checkpoints: the furthest platform anyone reached
        const cpOf = (q) => (q.y > 1.6 && q.z > 79 && q.z < 93 && Math.abs(q.x) < 11.5 ? 2 : q.y > 1.6 && q.z > 19.5 && q.z < 31 && Math.abs(q.x) < 7.5 ? 1 : 0);
        const cp = Math.max(x.cp || 0, cpOf(qd), cpOf(qv));
        if (cp !== x.cp) c.set((s) => (s.x.cp = cp));
        // columns start to sink under feet; finished ones are forgotten
        const sink = { ...(x.sink || {}) };
        let dirty = false;
        W.COLS.forEach((col, i) => {
          if (sink[i] != null && clk - sink[i] > W.COL_LIFE) {
            delete sink[i];
            dirty = true;
          }
          if (sink[i] != null) return;
          const on = [qd, qv].some((q) => Math.hypot(q.x - col.x, q.z - col.z) < col.r * 0.95 && Math.abs(q.y - col.top) < 0.3);
          if (on) {
            local.colOn = local.colOn || {};
            local.colOn[i] = (local.colOn[i] || 0) + dt;
            if (local.colOn[i] > 0.15) {
              sink[i] = +clk.toFixed(2);
              local.colOn[i] = 0;
              dirty = true;
            }
          }
        });
        if (dirty) c.set((s) => (s.x.sink = sink));
        // the bridge crumbles under feet
        const crumb = { ...(x.crumb || {}) };
        dirty = false;
        if (x.lev && x.lev.a != null) {
          const seg = (W.BRIDGE.z1 - W.BRIDGE.z0) / W.BRIDGE.n;
          for (let i = 0; i < W.BRIDGE.n; i++) {
            if (crumb[i] != null && clk - crumb[i] > W.CRUMB_LIFE) {
              delete crumb[i];
              dirty = true;
            }
            if (crumb[i] != null) continue;
            const z0 = W.BRIDGE.z0 + seg * i;
            const on = [qd, qv].some((q) => Math.abs(q.x) < W.BRIDGE.w / 2 + 0.2 && q.z > z0 && q.z < z0 + seg && Math.abs(q.y - W.TOP) < 0.3);
            if (on && clk - x.lev.a > 1.6) {
              crumb[i] = +clk.toFixed(2);
              dirty = true;
            }
          }
        }
        if (dirty) c.set((s) => (s.x.crumb = crumb));
        // through the gate, both on the dock
        const open = x.lev && x.lev.a != null && x.lev.b != null;
        if (open && W.onDock(qd) && W.onDock(qv)) c.set((s) => (s.x.stage = 2));
      }
      if (x.stage === 2) {
        raftHost(c, dt, ps, qd, qv);
        if (x.arrived && W.inArena(qd) && W.inArena(qv)) {
          Enemies.clear();
          c.set((s) => (s.x.stage = 3));
        }
      }
      if (x.stage === 3) {
        local.bossT += dt;
        if (!local.bossOn && local.bossT > 2.2) {
          local.bossOn = true;
          const keep = x.plates || [0, 1, 2, 3];
          const e = Enemies.spawn('titan', W.P(W.CAL.x, -12, W.CAL.z), { st: 9, t: 3.5, phase: keep.length ? 1 : 2, yaw: Math.PI, atk: 2 });
          keep.forEach((k) => Enemies.spawn('plaque', platePos(e, k), { k }));
          bfx('rise');
        }
        Enemies.simulate(dt, ps);
        const boss = Enemies.boss();
        if (boss) {
          const left = plates().map((p) => p.k);
          if ((x.plates || [0, 1, 2, 3]).length !== left.length) c.set((s) => (s.x.plates = left));
        }
        if (local.bossOn && !boss) {
          Enemies.clear();
          c.set((s) => (s.x.stage = 4));
        }
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2.2) {
            local.wipe = 0;
            Enemies.clear();
            Combat.reset();
            local.bossOn = false;
            local.bossT = 0.6;
            c.set((s) => {
              s.x.tsink = null;
            });
            c.send('s6wipe', 3);
            c.spawn(W.spawn(x, c.role, local), 0);
            HUD.say(TX.wipe, T.master, 2600);
          }
        } else local.wipe = 0;
      }
      if (x.stage === 4) {
        local.winT = W.nearCard(qd) && W.nearCard(qv) ? local.winT + dt : 0;
        if (!x.won && local.winT > 1) c.set((s) => (s.x.won = true));
        if (x.won) {
          local.done += dt;
          if (local.done > 3.5) c.goto('reward', (s) => (s.x.card = 's6'));
        }
      }
      Enemies.netTick(dt);
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hit') {
        // the Titan's heart and his shoulder plates are out of the sword's reach: the rifle's
        // (the sword still breaks the cooled fist plates when they rest on the ground)
        const e = Enemies.list.get(d.id);
        const high = e && (e.type === 'titan' || (e.type === 'plaque' && e.k < 2));
        if (!(who === 'valet' && high)) Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
      }
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
      if (d.a === 'lev' && x.stage === 1 && (d.id === 'a' || d.id === 'b') && TX.leverOwn[d.id] === who) {
        if (!x.lev || x.lev[d.id] == null) c.set((s) => (s.x.lev = { ...(s.x.lev || {}), [d.id]: +local.clk.toFixed(2) }));
      }
      if (d.a === 'frost') {
        const clk = +local.clk.toFixed(2);
        if (d.k === 'ice') {
          const list = (x.ice || []).slice();
          // reuse the oldest (or a melted) slot
          let slot = list.findIndex((o) => !o || clk - o.t > W.ICE_LIFE);
          if (slot < 0 && list.length < ICE_MAX) slot = list.length;
          if (slot < 0) {
            let old = 0;
            list.forEach((o, i) => o.t < list[old].t && (old = i));
            slot = old;
          }
          list[slot] = { x: +d.x.toFixed(2), z: +d.z.toFixed(2), t: clk };
          c.set((s) => (s.x.ice = list));
        }
        if (d.k === 'gey' && W.GEYSERS[d.i]) c.set((s) => (s.x.gfz = { ...(s.x.gfz || {}), [d.i]: clk }));
        if (d.k === 'en') {
          const e = Enemies.list.get(d.id);
          if (!e) return;
          // two bolts cool a plate (or the heart): the first one only half-freezes it, for a moment
          if (e.type === 'plaque' && !e.vuln) {
            if (e.recover) {
              e.recover = false;
              e.vuln = true;
              e.coolT = 4;
            } else {
              e.recover = true;
              e.halfT = 3.2;
            }
            bfx('cool', e.pos);
          }
          if (e.type === 'titan' && (e.phase || 1) === 2 && !e.vuln && e.st !== 8 && e.st !== 9 && !(e.frostImm > 0)) {
            if (e.recover) {
              e.recover = false;
              e.vuln = true;
              e.coolT = 6;
              e.win = 0;
              e.st = 7;
            } else {
              e.recover = true;
              e.halfT = 3.2;
            }
            bfx('cool', e.pos.clone().add(V3(0, 6, 2)));
          }
          if ((e.type === 'salamandre' && e.st === 3) || (e.type === 'cracheur' && e.st === 4)) {
            e.stun = 3.5;
            bfx('cool', e.pos);
          }
        }
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const host = Net.isHost;
      // shared clock and raft: the host is the truth, the guest extrapolates and eases in
      if (!host) {
        local.clk += dt;
        const now = performance.now();
        const age = (k, v) => {
          const s = (local.seen[k] = local.seen[k] || { v: null, t: now });
          if (s.v !== v) {
            s.v = v;
            s.t = now;
          }
          return lat() + Math.min(1, (now - s.t) / 1000);
        };
        const pc = (x.clk || 0) + age('clk', x.clk);
        local.clk += (pc - local.clk) * Math.min(1, dt * 3);
        if (Math.abs(pc - local.clk) > 1.5) local.clk = pc;
        const prz = (x.rz || W.RAFT.z0) + (x.rv || 0) * age('rz', x.rz);
        const pru = (x.ru || 0) + (x.rw || 0) * age('ru', x.ru);
        local.rz += (x.rv || 0) * dt;
        local.ru += (x.rw || 0) * dt;
        local.rz += (prz - local.rz) * Math.min(1, dt * 4);
        local.ru += (pru - local.ru) * Math.min(1, dt * 4);
        if (Math.abs(prz - local.rz) > 4) local.rz = prz;
        local.ru = clamp(local.ru, -W.RAFT.umax, W.RAFT.umax);
        local.rv = x.rv || 0;
        local.lean = x.lean || 0;
      }
      const body = Player.body;
      // the raft carries whoever stands on it (and its passengers)
      const rxNow = W.cx(local.rz) + local.ru;
      const prev = local.raftPrev;
      const dx = prev ? rxNow - prev.x : 0;
      const dz = prev ? local.rz - prev.z : 0;
      local.raftPrev = { x: rxNow, z: local.rz, dx, dz };
      if (body.ground === W.raftBox && Math.abs(dx) < 2 && Math.abs(dz) < 2) {
        body.p.x += dx;
        body.p.z += dz;
      }
      W.update(dt, t, x, r, { clk: local.clk, rz: local.rz, ru: local.ru, lean: local.lean });
      Enemies.render(dt, t);
      if (!host && x.stage === 2)
        for (const e of Enemies.list.values()) if (e.view && e.type === 'salamandre' && e.st === 3) e.view.g.position.z += local.rv * 0.12;
      tickBolts(dt);
      const q = W.rel(body.p);
      // deck telegraphs
      for (let i = local.marks.length - 1; i >= 0; i--) {
        const mk = local.marks[i];
        mk.t -= dt;
        mk.m.position.copy(W.P(rxNow + mk.u, W.RAFT.top + 0.04, local.rz + mk.z));
        mk.m.material.opacity = 0.25 + (1 - mk.t / mk.max) * 0.55;
        mk.m.scale.setScalar(0.4 + (1 - mk.t / mk.max) * 0.6);
        if (mk.t <= 0) {
          fxGroup.remove(mk.m);
          local.marks.splice(i, 1);
        }
      }
      // ---- hazards judged by each player for themselves ----
      local.lavaCd -= dt;
      const lavaY = W.lavaY(q, x, local.clk);
      const inGeyser =
        x.stage === 1 &&
        W.GEYSERS.some((g, i) => W.geyserState(i, local.clk, x.gfz && x.gfz[i]) === 'erupt' && W.eruptK(i, local.clk) > 0.2 && Math.hypot(q.x - g.x, q.z - g.z) < W.G_R && q.y < lavaY + W.G_H * W.eruptK(i, local.clk));
      if ((q.y < lavaY + 0.05 || inGeyser) && local.lavaCd <= 0 && x.stage <= 3) {
        local.lavaCd = 1.2;
        Sound.play('fall');
        Fx.burst(body.p.clone().add(V3(0, 0.4, 0)), '#ff7a2a', 70, 6, 0.9, -10);
        Net.send('s6lava', r);
        HUD.say(TX.lava, T.master, 1600);
        if (x.stage >= 2) Combat.apply(x.stage === 3 ? 20 : 15);
        c.spawn(W.spawn(x, r, local), 0);
      }
      // lava falls on the river
      local.fallCd -= dt;
      if (x.stage === 2 && local.fallCd <= 0)
        W.FALLS.forEach((f, i) => {
          if (W.fallOn(i, local.clk) !== 1) return;
          const fx = W.cx(f.z) + f.side * (W.RIVER.hw - f.len / 2 + 0.6);
          if (Math.abs(q.x - fx) < f.len / 2 && Math.abs(q.z - f.z) < 1.4 && q.y < 20) {
            local.fallCd = 1;
            Combat.apply(26);
            body.v.set(-f.side * 7, 5, 0);
            Sound.play('boom', body.p.clone());
            Fx.burst(body.p.clone().add(V3(0, 1, 0)), '#ff7a2a', 50, 5, 0.8, -10);
            if (!local.said.falls) {
              local.said.falls = true;
              HUD.say(TX.fallHit, T.master, 2400);
            }
          }
        });
      // the titan's shock rings and magma rain
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        const rr = W.POOL_R + (local.clk - w.t0) * WAVE_V;
        w.m.visible = rr > W.POOL_R;
        w.m.scale.set(Math.max(0.1, rr), 1, Math.max(0.1, rr));
        w.m.material.opacity = 0.85 * clamp(1 - (rr - W.WALL_R + 3) / 3, 0, 1);
        const d = Math.hypot(q.x - W.CAL.x, q.z - W.CAL.z);
        if (!w.hit && Math.abs(d - rr) < WAVE_W && q.y < W.TILE_TOP + 0.55 && x.stage === 3) {
          w.hit = true;
          Combat.apply(18);
          body.v.set(((q.x - W.CAL.x) / d) * 6, 7, ((q.z - W.CAL.z) / d) * 6);
          Cam.shake = 0.3;
        }
        if (rr > W.WALL_R + 1) {
          fxGroup.remove(w.m);
          waves.splice(i, 1);
        }
      }
      for (let i = rain.length - 1; i >= 0; i--) {
        const b = rain[i];
        const k = (local.clk - b.t0) / 1.5;
        b.m.visible = k > 0.35 && k < 1;
        b.m.position.copy(W.P(b.x, W.TILE_TOP + (1 - k) * 26, b.z));
        if (k >= 1) {
          const pos = W.P(b.x, W.TILE_TOP + 0.3, b.z);
          Fx.burst(pos, '#ff7a2a', 36, 6, 0.8, -12);
          Sound.play('thud', pos);
          if (!b.hit && Math.hypot(q.x - b.x, q.z - b.z) < 2.3 && q.y < W.TILE_TOP + 2.2) {
            b.hit = true;
            Combat.apply(20);
            body.v.set((q.x - b.x) * 2, 6, (q.z - b.z) * 2);
          }
          fxGroup.remove(b.m);
          rain.splice(i, 1);
        }
      }
      // tide warning, once
      if (x.stage === 1 && (x.cp || 0) >= 2 && W.tideWarn(local.clk) && !local.said.tide) {
        local.said.tide = true;
        HUD.say(TX.tide, T.master, 2400);
        Sound.play('rumble', 0.9);
      }
      if (x.stage === 1 && W.tideWarn(local.clk) && !local.tideRum && (x.cp || 0) >= 2) {
        local.tideRum = true;
        Sound.play('rumble', 0.6);
      }
      if (!W.tideWarn(local.clk)) local.tideRum = false;
      // boss bar
      const boss = Enemies.boss();
      if (x.stage === 3 && boss) {
        const ph = boss.phase || 1;
        if (ph !== local.bossPhase) {
          local.bossPhase = ph;
          HUD.objective(objective(c));
        }
        const left = Enemies.alive('plaque');
        const tag =
          ph === 1
            ? 'Armure · ' + left + ' plaque' + (left > 1 ? 's' : '') + ' · deux givres pour en refroidir une'
            : boss.vuln
              ? 'Cœur refroidi · frappez !'
              : boss.recover
                ? 'Cœur à demi gelé · encore un givre'
                : 'Cœur brûlant · deux givres';
        let frac = boss.hp / boss.max;
        if (ph === 1) {
          let hp = 0;
          for (const e of Enemies.list.values()) if (e.type === 'plaque') hp += Math.max(0, e.hp);
          frac = hp / (4 * Enemies.TYPES.plaque.hp);
        }
        HUD.boss(TX.boss, frac, tag);
      } else if (x.stage !== 3) HUD.boss(null);
      // ---- the frost (valet kit) ----
      local.frostT += dt;
      const regen = x.stage === 3 ? 2.8 : 3.2;
      if (local.frost < FROST_N && local.frostT > regen) {
        local.frost++;
        local.frostT = 0;
      }
      if (local.frost >= FROST_N) local.frostT = 0;
      if (r === 'valet') {
        Combat.abil = Math.min(1, (local.frost + Math.min(1, local.frostT / regen)) / FROST_N);
        if (Input.pressed('ability') && !Combat.down) frostShot(c, x, q);
        frostPreview(x, q, t);
      } else W.aim(null);
      // prompts
      const prompt = Combat.update(dt);
      if (prompt) return prompt;
      if (x.stage === 1) {
        const id = ['a', 'b'].find((k) => W.nearLever(q, k));
        if (id && !(x.lev && x.lev[id] != null) && TX.leverOwn[id] !== r) {
          if (Input.pressed('interact')) HUD.say(TX.notMine, T.master, 2000);
          return ['E', TX.leverP, false];
        }
        if (id && !(x.lev && x.lev[id] != null)) {
          if (Input.pressed('interact')) {
            c.act({ a: 'lev', id });
            Sound.play('switch');
          }
          return ['E', TX.leverP];
        }
      }
      return null;
    },
  });

  // the marker on the lava where a frost bolt would go (frost carrier only)
  const frostPreview = (x, q, t) => {
    if (x.stage === 2 || x.stage >= 4 || Combat.down) return W.aim(null);
    const cam = R.camera;
    const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (Enemies.raycast(cam.position, fwd, 45)) return W.aim(null);
    const ly = W.lavaY(q, x, local.clk);
    const lp = W.lavaHit(cam.position, fwd, ly);
    if (!lp) return W.aim(null);
    const far = Math.hypot(lp.x - q.x, lp.z - q.z);
    if (far > 30) return W.aim(null);
    const gi = x.stage === 1 ? W.geyserNear(lp, W.G_R * 1.25) : -1;
    if (gi >= 0) return W.aim(V3(W.GEYSERS[gi].x, ly, W.GEYSERS[gi].z), 'gey', t);
    const to = W.P(lp.x, ly, lp.z);
    const d = cam.position.distanceTo(to);
    const blocked = Phys.ray(cam.position, fwd, d) < d - 0.6;
    if (blocked) return W.aim(null);
    W.aim(lp, far > 22 || W.solidAt(lp) || local.frost <= 0 ? 'no' : 'ok', t);
  };

  // ---------- frost aim: enemies first, then a geyser, then the lava sheet ----------
  const frostShot = (c, x, q) => {
    if (local.frost <= 0) {
      if (!local.said.frostOut) {
        local.said.frostOut = true;
        HUD.say(TX.frostOut, T.master, 1400);
      }
      Sound.play('deflect');
      return;
    }
    const cam = R.camera;
    const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    const from = Player.body.p.clone().add(V3(0, 1.3, 0));
    let to = null;
    const hit = Enemies.raycast(cam.position, fwd, 45);
    if (hit) {
      to = cam.position.clone().addScaledVector(fwd, hit.d);
      c.act({ a: 'frost', k: 'en', id: hit.e.id });
    } else {
      const ly = W.lavaY(q, x, local.clk);
      const lp = W.lavaHit(cam.position, fwd, ly);
      if (lp && Math.hypot(lp.x - q.x, lp.z - q.z) < 22) {
        to = W.P(lp.x, ly, lp.z);
        const gi = x.stage === 1 ? W.geyserNear(lp, W.G_R * 1.25) : -1;
        // something solid in the way (a platform, the raft): the bolt hits it and does nothing
        const blocked = Phys.ray(cam.position, fwd, cam.position.distanceTo(to)) < cam.position.distanceTo(to) - 0.6;
        if (gi >= 0) c.act({ a: 'frost', k: 'gey', i: gi });
        else if (!blocked && !W.solidAt(lp) && x.stage !== 2) c.act({ a: 'frost', k: 'ice', x: lp.x, z: lp.z });
        else to = cam.position.clone().addScaledVector(fwd, Math.min(20, Phys.ray(cam.position, fwd, 40)));
      }
    }
    if (!to) to = cam.position.clone().addScaledVector(fwd, 18);
    local.frost--;
    local.frostT = 0;
    bolt(from, to);
    Net.send('s6bolt', [from.x, from.y, from.z, to.x, to.y, to.z].map((v) => +v.toFixed(2)));
    Player.yaw = Math.atan2(fwd.x, fwd.z);
  };

  // ---------- the raft (host) ----------
  const WAVES = [
    { z: 200, leap: 2 },
    { z: 268, spit: 2 },
    { z: 330, leap: 2, spit: 1 },
    { z: 395, leap: 3 },
    { z: 452, spit: 2, leap: 1 },
    { z: 500, leap: 3, spit: 1 },
    { z: 548, leap: 2, spit: 1 },
  ];
  const RAFT_V = 3.3;
  const raftHost = (c, dt, ps, qd, qv) => {
    const x = c.S.x;
    const onD = W.onRaft(qd, local.rz, local.ru);
    const onV = W.onRaft(qv, local.rz, local.ru);
    if (!x.go) {
      local.goT = onD && onV ? local.goT + dt : 0;
      if (local.goT > 2) c.set((s) => (s.x.go = true));
      return;
    }
    if (x.arrived) return;
    // steering: each passenger's lean (−1 left … 1 right); alone, half the turn
    const rx = W.cx(local.rz) + local.ru;
    const lean = ((onD ? clamp((qd.x - rx) / (W.RAFT.hx - 0.6), -1, 1) : 0) + (onV ? clamp((qv.x - rx) / (W.RAFT.hx - 0.6), -1, 1) : 0)) / 2;
    local.lean = damp(local.lean, lean, 6, dt);
    local.rw = local.lean * 2.4;
    local.ru = clamp(local.ru + local.rw * dt, -W.RAFT.umax, W.RAFT.umax);
    if (Math.abs(local.ru) >= W.RAFT.umax) local.rw = 0;
    // speed recovers after a knock
    local.rv = Math.min(RAFT_V, local.rv + 2.2 * dt);
    local.rz += local.rv * dt;
    // rocks: the raft's rectangle against each pillar's circle
    local.rockCd = local.rockCd || {};
    W.ROCKS.forEach(([z, u, rad], i) => {
      local.rockCd[i] = (local.rockCd[i] || 0) - dt;
      if (local.rockCd[i] > 0) return;
      const nu = clamp(u, local.ru - W.RAFT.hx, local.ru + W.RAFT.hx);
      const nz = clamp(z, local.rz - W.RAFT.hz, local.rz + W.RAFT.hz);
      const d = Math.hypot(u - nu, z - nz);
      if (d < rad * 0.75 && local.rv > 0) {
        // one knock per rock: the raft glances off and carries on
        local.rockCd[i] = 6;
        local.rv = -2.4;
        local.rz -= 0.4;
        local.ru = clamp(local.ru + (local.ru > u ? 0.9 : -0.9), -W.RAFT.umax, W.RAFT.umax);
        bfx('rock', W.P(W.cx(z) + u, 0.8, z - rad));
        ps.forEach((p) => {
          if (!p.down && W.onRaft(W.rel(p.pos), local.rz, local.ru)) Combat.hurt(p.who, 6, p.pos);
        });
        if (!local.said.rock) {
          local.said.rock = true;
          c.send('s6say', 'rock');
          HUD.say(TX.rock, T.master, 1800);
        }
      }
    });
    // checkpoint halfway
    if (local.rz > 380 && (x.rcp || 0) < 380) c.set((s) => (s.x.rcp = 380));
    // salamander waves
    WAVES.forEach((wv, i) => {
      if ((x.wavesDone || []).includes(i) || local.rz < wv.z) return;
      c.set((s) => (s.x.wavesDone = [...(s.x.wavesDone || []), i]));
      for (let k = 0; k < (wv.leap || 0); k++) {
        const side = k % 2 ? 1 : -1;
        Enemies.spawn('salamandre', W.P(rx + side * (W.RAFT.hx + 2.4), 0, local.rz + 2 + k * 1.5), { side, st: 0, t: 0.3 + k * 0.9 });
      }
      for (let k = 0; k < (wv.spit || 0); k++) {
        const side = k % 2 ? -1 : 1;
        Enemies.spawn('cracheur', W.P(rx + side * (W.RAFT.hx + 3.4), -0.6, local.rz + 4), { side, dz: 1 + k * 3, st: 0, t: 0.5 + k });
      }
      if (wv.leap && !local.said.salam) {
        local.said.salam = true;
        c.send('s6say', 'salam');
        HUD.say(TX.salam, T.master, 2600);
      }
      if (wv.spit && !local.said.spit) {
        local.said.spit = true;
        c.send('s6say', 'spit');
        HUD.say(TX.spit, T.master, 2600);
      }
    });
    Enemies.simulate(dt, ps);
    // left behind in the lava (or past the raft): gone
    for (const e of [...Enemies.list.values()])
      if (e.pos.z < W.O.z + local.rz - 14) {
        Enemies.list.delete(e.id);
        if (e.view) R.scene.remove(e.view.g);
      }
    if (local.rz >= W.RAFT.z1) {
      local.rz = W.RAFT.z1;
      local.rv = 0;
      local.rw = 0;
      Enemies.clear();
      c.set((s) => (s.x.arrived = true));
    }
    local.rsync += dt;
    if (local.rsync > 0.1) {
      local.rsync = 0;
      c.set((s) => {
        s.x.rz = +local.rz.toFixed(3);
        s.x.ru = +local.ru.toFixed(3);
        s.x.rv = +local.rv.toFixed(2);
        s.x.rw = +local.rw.toFixed(2);
        s.x.lean = +local.lean.toFixed(2);
      });
    }
    if (ps[0].down && ps[1].down) {
      local.wipe += dt;
      if (local.wipe > 2.2) {
        local.wipe = 0;
        Enemies.clear();
        Combat.reset();
        local.rz = x.rcp || W.RAFT.z0;
        local.ru = 0;
        local.rv = 0;
        c.set((s) => {
          s.x.rz = local.rz;
          s.x.ru = 0;
          s.x.rv = 0;
          // the waves after the checkpoint come again
          s.x.wavesDone = (s.x.wavesDone || []).filter((i) => WAVES[i].z < local.rz);
        });
        c.send('s6wipe', 2);
        c.spawn(W.spawn(x, c.role, local), 0);
        HUD.say(TX.wipeRaft, T.master, 2600);
      }
    } else local.wipe = 0;
  };
  Net.on('s6say', (k) => Story.S && Story.S.phase === 'tr_s6' && TX[k] && HUD.say(TX[k], T.master, 2400));
  // test handle (scratch tests move the raft and read the frost charges)
  TrS6.level = local;
})();
