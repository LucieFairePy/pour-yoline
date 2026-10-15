// The worlds (Split Fiction: one world = one theme, one outfit, one signature power) and the
// thread between the épreuves. Each world is a planet: after the oui, the Veilleurs' saucer took
// the two of you, tore your heart out (the heart-galaxy of the voyage) and dropped you on Terre 39;
// the goal is to find it again and take it home, every card being a piece of it. The Veilleurs
// are the ones who move you from planet to planet, and hide the real heart. For each épreuve: why
// we arrive here (said when it starts, before the level's own intro) and what it sets off (added
// to its reward lines). The play order and each épreuve's world live in js/game/trials.js.
// Spoken by the Maître du jeu.
const Lore = (() => {
  const WORLDS = [
    {
      n: 1,
      id: 'terre39',
      name: 'Terre 39',
      sub: 'La planète où la soucoupe vous a déposés',
      outfit: 'Les combinaisons d’astronaute du voyage.',
      power: 'Les kits de base. Dame : le grappin et la vision. Valet : le double saut, et porter.',
      memory: 'message',
    },
    {
      n: 2,
      id: 'ciel',
      name: 'Céleste',
      sub: 'La planète-ciel : des nuages et des îles flottantes',
      outfit: 'Aviateurs : blouson de cuir, écharpe, lunettes et harnais.',
      power: 'Le câble qui vous relie.',
      memory: 'kino',
    },
    {
      n: 3,
      id: 'rouages',
      name: 'La Cité des Rouages',
      sub: 'La planète des Veilleurs, toute de laiton et de vapeur',
      outfit: 'Mécanos : salopette, gants, lunettes de soudeur et ceinture d’outils.',
      power: 'Les mécanismes : leviers à deux, contrepoids, cadrans. Et le ralenti de la Dame.',
      memory: 'banc',
    },
    {
      n: 4,
      id: 'conte',
      name: 'Le Conte',
      sub: 'Une planète de forêts, de jardins et de palais, privée de lumière',
      outfit: 'Une robe de bal pour Yoline, un habit pour William.',
      power: 'La lumière et l’eau.',
      memory: 'cafe',
    },
    {
      n: 5,
      id: 'profondeurs',
      name: 'Les Profondeurs',
      sub: 'Sous la surface : crypte, forge, caveau de jade et volcan',
      outfit: 'Armures : Yoline en éclaireuse, William en chevalier.',
      power: 'Les armes, le fusil et l’épée. Et le gel du volcan.',
      memory: 'etoiles',
    },
    {
      n: 6,
      id: 'tempete',
      name: 'La Tempête',
      sub: 'Terre 39 sous l’orage, puis la Cour des Veilleurs',
      outfit: 'Des imperméables, puis les tenues de la Cour.',
      power: '',
      memory: 'pluie',
    },
  ];
  // the ordered épreuves of each world, from the plan
  WORLDS.forEach((w) => (w.trials = Trials.list.filter((t) => t.world === w.n).map((t) => t.id)));

  // [arrive lines, next line] for every built épreuve, in play order
  const TRIALS = {
    // Monde 1 · Terre 39
    s1: [
      ['Première table. Facile. On apprend à marcher. À deux, sinon ce n’est pas drôle.'],
      'Bien. L’autel s’ouvre sur un cadre de porte vide. Vous n’avez pas peur des portes, j’espère.',
    ],
    d9: [
      ['La salle d’essai des Veilleurs. Ils adorent les portes qui mènent ailleurs. Moi aussi.'],
      'Derrière le dernier portail, des rires d’enfants. Les Veilleurs ont fouillé dans vos souvenirs. Ils ne se gênent jamais.',
    ],
    s3: [
      ['Une cour de récréation. Les Veilleurs l’ont recopiée chez vous. Et ils y ont mis… une amie.'],
      'En s’endormant, la Poupée a montré du doigt une tour noire. Elle ne montre jamais rien au hasard. Moi non plus.',
    ],
    c4: [
      ['En haut, on voit tout. En bas, on ne voit rien. Je vous laisse choisir… non, en fait, je choisis.'],
      'La sortie ouvre une écluse. L’eau descend vers deux cabines de verre. Elles vous attendaient.',
    ],
    h10: [
      ['Ici, on pèse. Ce que l’un voit, l’autre ne le voit pas. Et à la fin… on verra.'],
      'Les cabines s’ouvrent sur une rivière. Pas de jeu, ce soir. Même moi, j’ai besoin d’une pause.',
    ],
    h2: [
      [
        'Remontez la rivière jusqu’à la cascade. Prenez votre temps. Les Veilleurs ont des questions ; ils ne comprennent pas ce qu’ils ont volé.',
      ],
      'Une lanterne est retombée sur les toits. C’est par là-haut qu’on se rapproche du cœur. Dommage : les toits ne sont pas très solides, ces temps-ci.',
    ],
    s2: [
      [
        'Le plus haut toit de la ville. Le plus près du cœur. Les Veilleurs ont posté leurs drones. Ne le prenez pas personnellement : ils gardent leur collection.',
      ],
      // no line: the cinematic follows
      '',
    ],
    // Monde 2 · La Planète-Ciel
    c1: [
      [
        'La soucoupe vous a lâchés sur une planète de nuages. Votre cœur brille juste au-dessus.',
        'Entre les îles, le vide : un câble vous relie, pour monter vers lui sans jamais vous perdre.',
      ],
      'Au bout du câble, une île qui penche. Et le cœur, toujours un peu plus haut.',
    ],
    c3: [
      ['Pour monter vers le cœur, il faut traverser les îles qui tanguent dans le vent de la planète.'],
      'Le dais s’est détaché. Il vous hisse tout en haut des nuages, si près du cœur qu’il éclaire vos visages.',
    ],
    h5: [
      [
        'Tout en haut, des nuages que seul l’autre voit. Le chemin vers l’île-cœur passe par le vide : sauter, puis plonger.',
      ],
      'Sur l’île-cœur, levez les yeux : votre cœur est là, juste au-dessus des nuages. On pourrait presque le toucher.',
    ],
    // the saucer (boss): its lines come with the new story
    ufo: [[], ''],
    // Monde 3 · La Cité des Rouages
    d1: [
      [
        'Le cœur au-dessus des nuages n’était qu’un leurre des Veilleurs. Leur planète-ciel s’est effondrée, et vous êtes tombés chez eux.',
        'Quelque part dans leur cité, ils gardent le vrai. Commencez par l’atelier de l’Horloger.',
      ],
      'Sur l’établi de l’Horloger, vos deux noms étaient déjà gravés. Et dans toute la cité, les téléphones sonnent.',
    ],
    c2: [
      ['Le central téléphonique des Veilleurs. Branchez leurs lignes, et vous entendrez ce qu’ils disent de votre cœur.'],
      'Sur la dernière ligne, une voix de Veilleur : « Le cœur ? À l’observatoire. On le pèse. »',
    ],
    d3: [
      ['L’observatoire des Poids, où les Veilleurs pèsent tout ce qu’ils prennent. Votre cœur est passé sur ces balances.'],
      'Sur le carnet des pesées : « Un cœur, deux noms. Trop lourd pour nous. Déposé à la banque. »',
    ],
    d4: [
      ['La banque des Veilleurs. Si votre cœur y est déposé, le registre du coffre le dira.'],
      'Dans le registre : « Dépôt n° 52 : un cœur. Conditions : écrites à la main. » Quelqu’un a négocié.',
    ],
    d5: [
      ['L’observatoire de la Gravité. Alignez ses planètes : elles montrent où les Veilleurs emportent ce qu’ils cachent.'],
      'Les trois planètes s’alignent sur un seul point de la cité : sa grande horloge.',
    ],
    s4: [
      ['La grande horloge des Veilleurs, celle que montraient les planètes. Il faut monter jusqu’à sa cloche.'],
      'Sous la cloche, le cadran tourne trop vite : c’est votre Visa. Il faudra entrer dans le mécanisme.',
    ],
    d7: [
      ['Dans le mécanisme de l’horloge. Arrêtez-la, ou le Visa finira avant que vous ayez retrouvé votre cœur.'],
      'L’horloge s’arrête sur l’heure de votre rencontre. Les Veilleurs ne le supportent pas : ils vous chassent par le train de nuit.',
    ],
    c5: [
      ['Les Veilleurs vous chassent de leur planète par le train de nuit. Dans le fourgon, ils ont laissé une bombe.'],
      'La bombe se tait, mais les Veilleurs détournent le train : il plonge vers une planète où il fait nuit en plein jour.',
    ],
    // Monde 4 · Le Conte
    h3: [
      [
        'Sur cette planète, les Veilleurs ont éteint le soleil, pour que vous ne voyiez pas ce qu’elle cache.',
        'Alors d’abord, apprenez à avancer sans voir.',
      ],
      'Au fond de la salle de bal, une galerie de glaces. Dans les reflets, une lueur rouge passe.',
    ],
    d2: [
      ['La galerie de glaces. Les Veilleurs y cachent ce qu’on ne regarde jamais en face.'],
      'Dans le dernier miroir du Gardien, la lueur rouge s’enfonce dans une forêt sans soleil.',
    ],
    h4: [
      ['Les Veilleurs ont pris le soleil de cette forêt. La Grande Ombre garde ce qu’il en reste.'],
      'À l’aube, la forêt s’ouvre sur une serre immense où plus rien ne pousse.',
    ],
    h6: [
      ['Les Veilleurs ont vidé cette serre pour en faire une cachette. Sa gardienne, la Reine des Épines, étouffe tout.'],
      'La serre refleurie s’ouvre sur un palais où l’on danse encore.',
    ],
    h7: [
      ['Un bal masqué qui n’a jamais fini. Les masques qui vous imitent sont là pour vous séparer.'],
      'Le Grand Lustre rallumé projette des ombres immenses sur un théâtre.',
    ],
    d6: [
      ['Le Montreur d’ombres tire les ficelles de ce théâtre pour les Veilleurs. Ses ombres cachent un passage.'],
      'Derrière l’écran, un miroir liquide : deux jardins, et de l’autre côté, vos doubles sombres.',
    ],
    c6: [
      ['Pour vous perdre de vue, les Veilleurs vous ont fabriqué des doubles, de l’autre côté du miroir.'],
      'Le miroir brisé s’ouvre sur un puits. Ses éclats descendent en marches vers la lueur rouge : votre cœur est en dessous.',
    ],
    // Monde 5 · Les Profondeurs
    s7: [
      [
        'Sous la surface, les Veilleurs cachent ce qu’ils ont de plus précieux.',
        'Leurs gardiens ne font pas la différence entre un voleur et un joueur.',
      ],
      'Au fond de la crypte, un escalier mène à une salle du trône. Le trône est vide.',
    ],
    sK: [
      ['Le trône du Roi de Pique est vide. Sa garde, elle, protège un cristal où brille un éclat de votre cœur.'],
      'Le cristal brisé éclaire le chemin d’une forge.',
    ],
    s5: [
      ['La forge des Veilleurs, où ils fabriquent leurs armes. Leur champion vous y attend : le Maître des Lames.'],
      'Dans les cendres de la forge, une porte de jade : le Caveau de l’Oracle, qui sait où est votre cœur.',
    ],
    cR: [
      ['Le Caveau de jade. L’Oracle des Veilleurs sait où est gardé votre vrai cœur. Il ne parlera qu’après le combat.'],
      'L’Oracle, en s’éteignant : « Votre cœur n’a jamais quitté Terre 39. Et ces épreuves, quelqu’un les a écrites. »',
    ],
    s6: [
      ['Pour vous garder sous terre, les Veilleurs ont réveillé le volcan. Le Titan de lave garde la sortie.'],
      'Le volcan vous recrache vers la surface : Terre 39, sous un ciel noir. Les Veilleurs y ont lâché une tempête.',
    ],
    // Monde 6 · La Tempête
    h8: [
      ['Retour sur Terre 39, sous l’orage des Veilleurs : leur dernière défense avant leur Cour.'],
      'Sur les toits, la foudre déchire le ciel : la soucoupe des Veilleurs s’enfuit dans une faille.',
    ],
    c7: [
      ['La soucoupe des Veilleurs s’enfuit vers leur Cour, par une faille qui se referme. Rattrapez-la.'],
      'Posés au milieu du cœur, devant les portes de la Cour des Veilleurs. C’est là qu’ils gardent le vrai.',
    ],
    d10: [
      ['Derrière la porte, encore la tempête : un lac a gelé dans son œil. Les Veilleurs ont caché le passage sous la glace.'],
      'Sur l’autre rive, la tempête s’enroule autour d’une tour. Elle monte plus haut que les nuages.',
    ],
    h10b: [
      ['Les portes de la Cour, enfin. Devant elles, le Joker tient marché : il vend des raccourcis.'],
      'La porte de la Cour s’ouvre. Mais derrière, la tempête tourne encore : la Cour se mérite.',
    ],
    c10: [
      ['Une tour plus haute que les nuages, au cœur de la tempête. Tout en haut, la Cour.'],
      'Au sommet, l’orage se tait. Douze figures vous attendent, autour de quatre tables : la Cour.',
    ],
    // the ♠ table of the Cour
    sV: [
      ['La table de Pique, dans l’Armurerie : fer noir, acier fumé, lumière froide. Ici, on agit.'],
      'Le Valet s’incline. Derrière sa galerie, une salle ronde où sifflent des lames : la Dame vous attend.',
    ],
    sD: [
      ['La Salle d’armes. La Dame de Pique ne se bat pas : elle donne des leçons.'],
      'La porte du nord s’ouvre sur la salle du trône. Le Roi de Pique y garde son champion.',
    ],
    sR: [
      ['La Salle du Trône d’acier. Le Roi de Pique ne se lève jamais : son champion se bat pour lui.'],
      'Les trois figures de Pique ont posé leurs cartes. Une table de la Cour est à vous.',
    ],
    // the ♦ table of the Cour
    dV: [
      ['La table de Carreau, dans un observatoire de verre et de laiton. Ici, on joue avec la tête.'],
      'Le Valet s’incline. Derrière lui, la galerie de sa Dame brille de miroirs.',
    ],
    dD: [
      ['La Galerie des Prismes. La Dame de Carreau aime la lumière, surtout quand elle se perd.'],
      'Le rayon touche le cristal. Au bout de la galerie, une coupole s’ouvre sur le Roi.',
    ],
    dK: [
      ['Sous la coupole, le Roi de Carreau garde un code. Il ne le dira qu’en morceaux.'],
      'Les trois figures de Carreau ont posé leurs cartes. Une table de la Cour est tombée.',
    ],
    // the ♣ table of the Cour (the Roi's trial id is cK: cR is Le Caveau)
    cV: [
      ['La table de Trèfle, dans une salle de cordes et de poulies. Ici, rien ne se fait seul.'],
      'Le Valet a lâché ses cordes. Derrière lui, la galerie des poulies : la Dame vous attend.',
    ],
    cD: [
      ['La galerie des poulies. La Dame de Trèfle y fait tout monter et descendre au bout d’une corde.'],
      'Au bout de la galerie, une rotonde ouverte sur l’orage : le trône du Roi de Trèfle.',
    ],
    cK: [
      ['La rotonde du Roi de Trèfle. Il ne se bat pas, il pèse.'],
      'Les trois figures de Trèfle ont posé leurs cartes. Une table de la Cour est à vous.',
    ],
  };

  // a few lines during the épreuves, each said once per visit (Lore.during(trial, key))
  const DURING = {
    s1: {
      relay: 'Vous voyez ? L’un avance, l’autre tient. Retenez la danse.',
      wave: 'Ne regardez pas derrière. Regardez à côté.',
    },
    d9: { portal: 'L’une ouvre, l’autre traverse. Vous commencez à comprendre la maison.' },
    s3: { zone3: 'Elle a choisi sa préférée. Vous allez faire quoi, maintenant ?' },
    c4: { swap: 'On rebat. Celui qui guidait marche, celui qui marchait guide.' },
    s2: { collapse: 'Ne regardez pas derrière. Je vous l’ai déjà dit, non ?' },
  };
  const said = new Set();
  const during = (trialId, key, delay = 0) => {
    const k = trialId + '.' + key;
    const line = DURING[trialId] && DURING[trialId][key];
    if (!line || said.has(k)) return;
    said.add(k);
    if (delay) setTimeout(() => HUD.say(line, CONFIG.master), delay);
    else HUD.say(line, CONFIG.master);
  };

  // ---------- the Visa (only the story moves it, never real time) ----------
  const VISA = ['3 jours', '2 jours 20 h'];
  const visaText = (S) => {
    const done = (S && S.done) || [];
    const n = completed(done).filter((w) => w.n <= 1).length;
    return 'Visa · ' + VISA[Math.min(n, VISA.length - 1)];
  };
  let lastVisa = null;
  const showVisa = () => {
    const v = visaText(Story.S);
    HUD.visa(v, lastVisa !== null && v !== lastVisa);
    lastVisa = v;
  };

  // ---------- the reward screen: a detail back, then a few words of the heart ----------
  const H = CONFIG.heart;
  const reward = (trialId) => {
    if (!H.words[trialId] && !(trialId in H.details)) return null;
    return { detail: H.details[trialId] || null, words: H.words[trialId] || '' };
  };
  // the words kept in the box: one per épreuve done, in the order they came back
  const words = (done) =>
    (done || [])
      .filter((id) => H.words[id])
      .map((id) => ({ id, words: H.words[id], card: Trials.byId[id] && Trials.byId[id].card }));
  // the world that this épreuve finishes (its memory comes back on the reward screen)
  const finishes = (trialId) => {
    const w = worldOf(trialId);
    if (!w) return null;
    const built = w.trials.filter((id) => Trials.built(Trials.byId[id]));
    return built[built.length - 1] === trialId ? w : null;
  };

  // ---------- a white card without a suit, hidden once in every level of the world ----------
  // [phase, () => world, x, z, yaw] in the level's own frame (world.P), lying on the ground a
  // few steps off the way in: something to notice, never explained
  const BLANKS = [
    ['tr_s1', () => TrS1, -6.2, 7.5, 0.5],
    ['portes', () => Portes, 5.6, 6.5, -0.3],
    ['soleil', () => Soleil, 10.5, 3.2, 0.8],
    ['act2', () => Maze, 3.2, -3.2, 2.2],
    ['act1', () => Arena, 6.6, 7.5, -0.6],
    ['balade', () => Balade, 11.2, 7.5, 1.1],
    ['tr_s2', () => TrS2, 5.4, 3.5, 0.2],
  ];
  const blanks = {};
  let blankGeo = null;
  let blankMat = null;
  const blankCard = () => {
    if (!blankGeo) {
      blankGeo = new THREE.BoxGeometry(0.3, 0.42, 0.004);
      const c = document.createElement('canvas');
      c.width = 150;
      c.height = 210;
      const g = c.getContext('2d');
      g.fillStyle = '#f3f1ec';
      g.fillRect(0, 0, 150, 210);
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      g.lineWidth = 3;
      g.strokeRect(9, 9, 132, 192);
      const tex = new THREE.CanvasTexture(c);
      blankMat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xd6d4cf,
        roughness: 0.55,
        metalness: 0,
        emissive: 0x2a2a2a,
        emissiveMap: tex,
      });
    }
    return new THREE.Mesh(blankGeo, blankMat);
  };
  const placeBlanks = (phase) => {
    BLANKS.filter((b) => b[0] === phase).forEach((b, i) => {
      const key = phase + i;
      const W = b[1]();
      if (blanks[key] || !W || !W.built || !W.P) return;
      const m = blankCard();
      const p = W.P(b[2], 0, b[3]);
      p.y = Phys.groundAt(p.x, p.y + 4, p.z) + 0.006;
      m.position.copy(p);
      m.rotation.set(-Math.PI / 2, b[4], 0, 'YXZ');
      m.name = 'blankCard';
      R.scene.add(m);
      blanks[key] = m;
    });
  };

  const worldOf = (trialId) => {
    const t = Trials.byId[trialId];
    return t ? WORLDS[t.world - 1] : null;
  };
  // the world opens on its first épreuve that is built
  const opens = (t) => worldOf(t.id).trials.find((id) => Trials.built(Trials.byId[id])) === t.id;
  /** The worlds whose built épreuves are all done, in order. */
  const completed = (done) =>
    WORLDS.filter((w) => {
      const built = w.trials.filter((id) => Trials.built(Trials.byId[id]));
      return built.length && built.every((id) => done.includes(id));
    });

  /** Called by Story when a phase starts, before the level's own enter (and its intro). */
  const enter = (phase, prev) => {
    if (prev === phase) return;
    said.clear();
    // every screen carries the Visa and, once the welcome is over, the return reserve
    HUD.title('');
    showVisa();
    // (the welcome lights it up itself, at its moment)
    HUD.reserve(phase === 'prologue' || phase === 'welcome' ? '' : CONFIG.prologue.reserve);
    const t = Trials.byPhase[phase];
    if (!t || !Trials.built(t)) return;
    const L = TRIALS[t.id];
    if (opens(t)) {
      HUD.chapter(worldOf(t.id), undefined, visaText(Story.S));
      HUD.pause(5600);
    }
    if (L) L[0].forEach((line) => HUD.say(line, CONFIG.master));
  };

  let tick = 0;
  const update = (dt) => {
    tick += dt;
    if (tick < 0.5 || !Story.S) return;
    tick = 0;
    placeBlanks(Story.S.phase);
  };

  return {
    WORLDS,
    TRIALS,
    worldOf,
    completed,
    enter,
    update,
    during,
    reward,
    words,
    finishes,
    visaText,
    showVisa,
    BLANKS,
    arrive: (trialId) => (TRIALS[trialId] ? TRIALS[trialId][0] : []),
    next: (trialId) => (TRIALS[trialId] ? TRIALS[trialId][1] : ''),
  };
})();
