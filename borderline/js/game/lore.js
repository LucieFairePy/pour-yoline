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
      name: 'La Planète-Ciel',
      sub: 'Une planète de nuages et d’îles flottantes',
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
      [
        'Après votre oui, la soucoupe des Veilleurs vous a arraché votre cœur, la galaxie du voyage, et vous a posés ici.',
        'Retrouvez-le, et rentrez avec lui. Chaque carte en est un morceau, et le fait briller un peu plus près.',
      ],
      'L’autel s’ouvre sur un cadre de porte vide. Dans le ciel, votre cœur brille un peu plus fort.',
    ],
    d9: [
      ['Le cadre de l’autel menait ici : la salle d’essai des Veilleurs. Ils veulent voir comment vous pensez.'],
      'Derrière le dernier portail, des rires d’enfants : les Veilleurs ont fouillé vos souvenirs.',
    ],
    s3: [
      ['Pour vous étudier, les Veilleurs ont recréé une cour de récréation de votre enfance, et sa Poupée.'],
      'En s’endormant, la Poupée a montré du doigt une tour noire.',
    ],
    c4: [
      [
        'La tour noire que montrait la Poupée. En bas, un labyrinthe sans lumière. En haut, de quoi le voir en entier.',
      ],
      'La sortie du labyrinthe ouvre une écluse. L’eau noire descend vers deux cabines de verre.',
    ],
    h10: [
      [
        'Les Veilleurs ont pris votre cœur sans comprendre ce qu’il est. Leur question : tient-il quand l’un peut se sauver seul ?',
      ],
      'Les cabines s’ouvrent sur une rivière. Pour une fois, ce ne sera pas une épreuve.',
    ],
    h2: [
      ['Les Veilleurs veulent savoir ce qu’est un oui. Ce soir, ils ne jouent pas : ils écoutent.'],
      'Vos lanternes montent vers votre cœur, qui n’a jamais brillé aussi près. L’une d’elles retombe sur les toits.',
    ],
    s2: [
      [
        'La lanterne est retombée sur les toits : c’est par là-haut que l’on se rapproche du cœur.',
        'Mais les toits ne tiennent plus, et des drones gardent le chemin.',
      ],
      'Au bord du dernier toit, le cœur est si grand dans le ciel qu’on croirait le toucher… et la soucoupe revient. Son rayon vous emporte vers une autre planète.',
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
    const t = Trials.byPhase[phase];
    if (!t || prev === phase || !Trials.built(t)) return;
    const L = TRIALS[t.id];
    if (opens(t)) {
      HUD.chapter(worldOf(t.id));
      HUD.pause(5600);
    }
    if (L) L[0].forEach((line) => HUD.say(line, CONFIG.master));
  };

  return {
    WORLDS,
    TRIALS,
    worldOf,
    completed,
    enter,
    arrive: (trialId) => (TRIALS[trialId] ? TRIALS[trialId][0] : []),
    next: (trialId) => (TRIALS[trialId] ? TRIALS[trialId][1] : ''),
  };
})();
