const CONFIG = {
  her: 'Yoline',
  me: 'William',
  // who picks which astronaut in the lobby; the kit (dame / valet) changes per chapter
  players: {
    yoline: { name: 'Yoline', look: 'dame', fem: true },
    william: { name: 'William', look: 'valet', fem: false },
  },
  kits: {
    swap: {
      dame: 'Les rôles s’inversent. Ce chapitre, c’est toi qui vois ce que {mate} ne voit pas.',
      valet:
        'Les rôles s’inversent. Ce chapitre, c’est toi qui protèges {mate}, et qui portes ce qu’{il} ne peut pas porter.',
    },
  },
  master: 'Le Maître du jeu',
  joker: 'Le Joker',
  intro: {
    s1a: 'Tu as dit oui.',
    s1b: 'Et l’univers entier l’a entendu.',
    s2: '… même ceux qui n’auraient jamais dû l’entendre.',
    s4: 'Ailleurs. Très loin de chez nous.',
    s5: 'Reste avec moi.',
    s7a: 'Les Veilleurs collectionnent ce qui brille le plus dans l’univers.',
    s7b: 'Cette nuit, ils ont pris votre Oui.',
    planet: 'Terre 39',
    planetSub: 'De l’eau, de l’air, des arbres. Presque chez nous.',
    s9: 'Ils l’ont brisé en 52 cartes. Pour le reprendre, il faudra jouer à leur jeu.',
    tagline: 'On ne gagne jamais seul.',
  },
  roles: {
    dame: { name: 'La Dame', suit: '♥', pronoun: 'elle', other: 'lui' },
    valet: { name: 'Le Valet', suit: '♠', pronoun: 'lui', other: 'elle' },
  },
  prologue: {
    objective:
      'Retrouve l’autre joueur. Pas de carte, pas de flèche : écoute son signal. Appelle avec C.',
    // the Maître du jeu on the big screen, once you have found each other: [line, screen title,
    // screen subtitle]; 'sky' turns both cameras up to the empty heart while it is said
    welcome: [
      ['Bienvenue, Yoline. Bienvenue, William.', 'Bienvenue', 'Yoline · William'],
      ['Joueurs : 2. Visa : 3 jours.', 'Joueurs : 2', 'Visa : 3 jours'],
      [
        'Ce que vous voyez là-haut, c’est votre cœur. Enfin… sa forme. Ce qui le remplissait a été éparpillé. En cinquante-deux morceaux.',
        '52',
        'morceaux',
        'sky',
      ],
      ['Je les ai rangés dans mes jeux. Gagnez-les, et il se remplira.', 'Mes jeux', 'Gagnez-les'],
      ['Une seule règle : ici, on ne gagne jamais seul.', 'Une seule règle', 'On ne gagne jamais seul'],
    ],
    // the card box falls between the two of you (it is the deck menu, P)
    box: 'Pour ce que vous gagnerez. Elle est vide. Pour l’instant.',
    boxTitle: 'La boîte',
    boxSub: 'Vide · pour l’instant',
    // the line on each visor, and what he says about it
    reserve: 'Réserve de retour · 100 % · verrouillée',
    reserveLine: 'Ah. Votre réserve de retour. Gardez-la précieusement. On ne rentre pas à pied, d’ici.',
    abilities: {
      dame: 'Capacités de ce chapitre : le grappin, et tes yeux voient ce que les siens ne voient pas.',
      valet:
        'Capacités de ce chapitre : le double saut renforcé, et tu portes ce que {mate} ne peut pas porter.',
    },
  },
  city: {
    doors: {
      h10: 'Une porte s’est allumée : {card}. Allez-y ensemble.',
      s3: 'Une porte s’est allumée : {card}. Un jeu d’enfant… en apparence.',
      c4: 'Une nouvelle porte s’est allumée : {card}. Allez-y ensemble.',
      s7: 'Une porte de pierre s’est ouverte : {card}. Une crypte. Descendez armés.',
      d9: 'Une arche s’est allumée près du café : {card}.',
      h2: 'Une porte fleurie s’est ouverte : {card}. Pas d’épreuve, cette fois. Juste une balade.',
      sK: 'Sous l’écran géant, une porte noire : {card}, la garde du Roi de Pique. Préparez-vous à vous battre.',
      cR: 'Une porte de jade s’est allumée : {card}. Le Caveau des Veilleurs. Un vrai raid.',
    },
    doorNew: 'Une porte s’est allumée : {card} · {title}. Allez-y ensemble.',
    memory: 'Un nouveau souvenir s’est allumé. Suivez la colonne de lumière.',
    memoryLast: 'Le dernier souvenir s’est allumé, près de la place.',
    memoryLine: 'Chaque carte rallume un détail. Une table finie vous rend un souvenir entier.',
    hunt: 'Il manque {n} chiffre(s). Ils sont cachés dans la ville : suivez les colonnes dorées.',
    huntLine: 'Les Veilleurs ont caché le reste des chiffres dans la ville. Tant qu’ils manquent, les figures restent fermées.',
  },
  portes: {
    title: 'Les Portes',
    intro: 'Épreuve de logique.',
    hint: {
      dame: 'Clic gauche : portail bleu. Clic droit (ou F) : portail orange. Seulement sur les panneaux blancs. Tes portails ne laissent passer que {mate}.',
      valet:
        '{Il} pose les portails. Toi seul{e} peux les traverser. Et plus tu entres vite, plus tu ressors vite.',
    },
    s1: {
      dame: 'Un bouton derrière la vitre. Pose un portail sur le panneau près de vous, l’autre sur celui de la pièce, pour que {mate} passe.',
      valet: 'Le bouton est derrière la vitre. Passe par ses portails et appuie dessus.',
    },
    s2: {
      dame: 'Lance {mate} au-dessus du vide : un portail sur le panneau au sol sous la corniche, l’autre sur le mur face au vide.',
      valet:
        'Monte l’escalier jusqu’à la corniche et laisse-toi tomber dans le portail au sol. Plus tu tombes de haut, plus tu ressors vite.',
    },
    s3: {
      dame: 'Le bouton de {mate} est dans la cage de verre : ouvre-lui la route avec tes portails. Le tien est tout en haut.',
      valet: 'Ton bouton est dans la cage de verre : passe par ses portails. Tenez vos deux boutons ensemble.',
    },
    card: 'La carte {card} est apparue. Ensemble.',
  },
  garde: {
    title: 'La Garde royale',
    boss: 'Le Capitaine de la Garde',
    intro: 'Épreuve de combat. Les Veilleurs veulent voir si vous savez vous battre ensemble.',
    entrance: 'Entrez dans la salle. Ensemble.',
    hint: {
      dame: 'Ton fusil : clic gauche (ou RT), maintiens pour tirer en rafale. C’est toi qui fais les dégâts.',
      valet:
        'Ton épée : clic gauche (ou RT), elle étourdit. Clic droit (ou F) : le Voile, tu deviens invisible.',
    },
    wave1: 'Vague 1 : débarrassez-vous des Pions.',
    wave2: 'Vague 2 : les Tours ont un bouclier. L’épée l’étourdit, le fusil l’achève.',
    towers: 'Un bouclier ne tombe que sous l’épée. Ensuite, le fusil peut tirer.',
    gate: 'La porte s’ouvre. Le Capitaine de la Garde vous attend.',
    phase1: 'Personne ne touche au trône du Roi. Personne.',
    phase2: 'Assez joué. À genoux.',
    phase3: 'Je garde votre Oui dans ce cristal.',
    phase1Obj: {
      dame: 'Phase 1 : le Capitaine est sous bouclier. Garde les Pions loin pendant que {mate} passe la grille.',
      valet:
        'Phase 1 : deviens invisible (clic droit), traverse la grille laser derrière le trône, coupe le bouclier.',
    },
    phase2Obj: {
      dame: 'Phase 2 : esquive les cercles rouges. Quand le Capitaine est étourdi, vise le cœur lumineux.',
      valet:
        'Phase 2 : esquive les cercles rouges. Juste après sa frappe, frappe-le pour l’étourdir.',
    },
    phase3Obj:
      'Phase 3 : tenez vos plaques ♥ et ♠ en même temps pour briser le cristal, puis frappez.',
    shieldDown: 'Mon bouclier… qui a osé ?',
    crystal: 'Non… pas le cristal !',
    down: 'Tu es à terre. Ton partenaire peut te relever.',
    wipe: 'Vous êtes tombés tous les deux. On recommence.',
    laser: 'La grille brûle tout ce qu’elle voit.',
    victory: 'Le Capitaine est tombé. La carte est à vous.',
  },
  soleil: {
    title: 'Un, deux, trois, Soleil',
    doll: 'La Poupée',
    intro: 'Épreuve d’adresse.',
    rule: 'Quand elle chante, avancez. Quand elle se retourne, plus un geste.',
    hint: {
      dame: 'Tu vois ce que {mate} ne voit pas : quand les yeux de la Poupée s’allument en rose, elle va vraiment regarder. Préviens-{le}.',
      valet:
        'Toi, tu ne vois pas les yeux de la Poupée. {mate}, si. Écoute-{le} : quand {il} dit « stop », tu t’arrêtes.',
    },
    zone1: 'Zone 1 · Avancez quand elle chante.',
    zone2: {
      dame: 'Zone 2 · La Poupée fait semblant. Seuls ses yeux disent la vérité : dis à {mate} si c’est un vrai regard.',
      valet:
        'Zone 2 · Ici, elle te voit dès qu’elle se retourne : arrête-toi avant. {mate} voit ses yeux s’allumer, écoute-{le}.',
    },
    zone3: {
      dame: 'Zone 3 · La Poupée ne regarde plus que toi. Cache-toi derrière {mate} et avance dans son ombre.',
      valet:
        'Zone 3 · La Poupée ne quitte plus {mate} des yeux. Mets-toi entre la Poupée et {lui}, et avancez ensemble.',
    },
    finish: 'Touchez la Poupée. Ensemble.',
    caught: 'Bougé ! …Pardon, c’est la règle. Retour à la ligne.',
    shielded: '{Il} te cache. La Poupée ne te voit pas.',
    sing: 'Un, deux, trois…',
    turn: 'Soleil !',
    fake: '… ou pas.',
    win: 'La Poupée s’endort. La carte est à vous.',
  },
  donjon: {
    title: 'La Crypte',
    boss: 'Le Cavalier noir',
    intro:
      'Épreuve de combat. Sous la ville, les Veilleurs gardent leurs trésors… et leurs gardiens.',
    hint: {
      dame: 'Ton fusil : clic gauche. Et tes yeux voient les spectres que {mate} ne voit pas.',
      valet:
        'Ton épée : clic gauche. Le Voile : clic droit. Les spectres, seul{pe} {mate} les voit.',
    },
    room1: 'L’Antichambre : nettoyez la salle.',
    levers: 'Deux plaques, une chacun. Restez dessus en même temps.',
    room2: 'La Nef : les Cavaliers chargent en ligne droite. Esquivez sur le côté.',
    room3: {
      dame: 'L’Ossuaire : des spectres. Toi seul{e} les vois. Tire dessus pour les révéler, {mate} les achève.',
      valet:
        'L’Ossuaire : des spectres invisibles. Quand {mate} les touche, ils apparaissent. Frappe-les.',
    },
    bossIn: 'Le Cavalier noir garde la carte.',
    bossObj: {
      dame: 'Quand le Cavalier charge, écarte-toi. S’il percute un pilier, il est sonné : vise son cœur.',
      valet: 'Attire sa charge vers un pilier. Sonné, frappe-le. Puis {mate} vise le cœur.',
    },
    bossStun: 'Il s’est assommé contre le pilier !',
    chest: 'Le coffre. Ouvrez-le ensemble (E).',
    down: 'Tu es à terre. Ton partenaire peut te relever.',
    wipe: 'Vous êtes tombés tous les deux. On reprend cette salle.',
    victory: 'Le Cavalier est tombé. Le coffre s’ouvre.',
  },
  balade: {
    title: 'La Rivière',
    intro: 'Pas d’épreuve. Pas de chrono. Une rivière, des lanternes, et vous deux.',
    objective: 'Remontez la rivière jusqu’à la cascade. Prenez votre temps.',
    signs: [
      'Panneau · Racontez-vous le moment où vous avez su.',
      'Panneau · Une chose que l’autre fait et qui te fait sourire à chaque fois ?',
      'Panneau · Si on partait demain, on irait où ?',
      'Panneau · Une chanson qui te fait penser à l’autre ?',
      'Panneau · Ce que tu voudrais qu’on fasse dans dix ans.',
    ],
    signHint: 'Les panneaux posent des questions. Répondez-vous, à voix haute.',
    bridge:
      'Un pont de lumière… il n’apparaît que si vous traversez main dans la main (E près de l’autre).',
    lanterns: 'Des lanternes. Prenez-en une chacun (E).',
    release: 'Au ponton, lâchez vos lanternes ensemble (E).',
    released: 'Deux lanternes, côte à côte. Elles montent sans jamais se séparer.',
    sit: 'Au pied de la cascade, un banc. Asseyez-vous ensemble.',
    cardLine: 'Quelque chose brille dans l’eau…',
    gestures: 'E près de l’autre : se tenir la main. E près d’un banc : s’asseoir.',
  },
  raid: {
    title: 'Le Caveau',
    boss: 'L’Oracle',
    intro: 'Épreuve d’équipe. Un raid. Des rôles, des mécaniques, aucune place pour le hasard.',
    climb: {
      dame: 'L’ascension : vise les anneaux et lance ton grappin (F).',
      valet: 'L’ascension : les plaques bleues ne propulsent que toi. Marche dessus, puis avance.',
    },
    door: 'Les portes du Caveau. Entrez ensemble.',
    roles: {
      dame: 'Ton rôle : l’Œil. Toi seul{e} vois la séquence de symboles que montre l’Oracle.',
      valet:
        'Ton rôle : l’Égide. Toi seul{e} peux activer les piliers, et ton bouclier (F) protège quand l’Oracle regarde.',
    },
    ritual: {
      dame: 'Rituel : lis la séquence à {mate} (♥ ♣ ♦ ♠). Garde les sbires loin de {lui}.',
      valet: 'Rituel : {mate} voit la séquence. Active les piliers dans son ordre (E).',
    },
    ritualSwap: {
      dame: 'Dernier rituel : l’Œil est passé à {mate}. {Il} voit la séquence, toi tu actives les piliers (E).',
      valet: 'Dernier rituel : l’Œil est à toi. Lis-lui la séquence, {il} active les piliers.',
    },
    wrong: 'Dissonance. Mauvais symbole : la séquence recommence.',
    good: 'Symbole juste.',
    broken: 'L’Oracle est brisé ! Il descend : tout ce que vous avez.',
    gaze: 'Le Regard arrive : tous sous l’Égide !',
    gazeObj: {
      dame: 'Le Regard : rejoins {mate} sous son bouclier.',
      valet: 'Le Regard : lève l’Égide (F), que {mate} soit dessous.',
    },
    rise: 'L’Oracle remonte. Nouveau rituel.',
    enrage: 'Le Caveau se referme. On recommence la rencontre.',
    wipe: 'Vous êtes tombés tous les deux. On recommence la rencontre.',
    victory: 'L’Oracle s’éteint. Le Caveau vous appartient.',
    phase: ['Rituel', 'Brisé', 'Dernier rituel'],
  },
  cards: {
    s3: {
      title: 'Un, deux, trois, Soleil',
      sub: 'Épreuve d’adresse · réussie',
      lines: [
        'L’un voyait le danger.',
        'L’autre se mettait devant.',
        'Le Borderland commence à vous craindre un peu.',
      ],
    },
    s7: {
      title: 'La Crypte',
      sub: 'Épreuve de combat · réussie',
      lines: [
        'Dans le noir, l’un voyait.',
        'L’autre frappait là où il fallait.',
        'Même sous la terre, le Oui reprend des couleurs.',
      ],
    },
    h2: {
      title: 'La Rivière',
      sub: 'Balade · réussie',
      lines: [
        'Pas d’épreuve. Juste vous deux.',
        'C’était peut-être ça, la plus difficile à gagner.',
        'Les Veilleurs vous ont écoutés. Ils commencent à comprendre.',
      ],
    },
    cR: {
      title: 'Le Caveau',
      sub: 'Raid · réussi',
      lines: [
        'Un œil, un bouclier.',
        'Aucun monstre n’est assez grand pour vous deux.',
        'Et l’Oracle, enfin, a parlé.',
      ],
    },
    h10: {
      title: 'La Balance',
      sub: 'Épreuve de confiance · réussie',
      lines: [
        'Vous auriez pu sortir seuls.',
        'Vous êtes restés.',
        'Retenez ça. Vous en aurez besoin.',
      ],
    },
    d9: {
      title: 'Les Portes',
      sub: 'Épreuve de logique · réussie',
      lines: [
        'L’un ouvrait les chemins.',
        'L’autre les traversait sans hésiter.',
        'Le Oui se souvient de vous.',
      ],
    },
    sK: {
      title: 'La Garde royale',
      sub: 'Épreuve de combat · réussie',
      lines: [
        'Un fusil, une épée.',
        'Et chacun son tour. Personne n’a su dire qui portait l’autre.',
        'La garde est tombée. Le Roi de Pique, lui, attend encore.',
      ],
    },
    c4: {
      title: 'Le Labyrinthe noir',
      sub: 'Épreuve de communication · réussie',
      lines: [
        'Dans le noir, chacun a suivi la voix de l’autre.',
        'Et aucun ne s’est perdu.',
        'Le Borderland commence à vous reconnaître.',
      ],
    },
  },
  act1: {
    title: 'La Balance',
    intro: 'Épreuve de confiance.',
    bridge: {
      dame: 'Le pont de gauche est invisible pour {mate}. Toi, tu le vois. Guide-{le}.',
      valet: 'Le pont de gauche est invisible pour toi. {mate}, {lui}, le voit. Écoute-{le}.',
      dame2: 'Le pont de droite a des dalles fausses. {mate} seul{pe} sait lesquelles.',
      valet2: 'Le pont de droite a des dalles fausses pour {mate}. Toi seul{e} vois les vraies.',
    },
    winch: {
      dame: 'Tiens le treuil. Tant que tu tiens, {il} avance.',
      valet: 'Accroche-toi au harnais. {mate} seul{pe} peut te faire traverser.',
      grapple: 'À toi. Vise les anneaux et lance ton grappin.',
    },
    cabins: {
      enter: 'Chacun dans sa cabine.',
      rule: 'Un seul sortira. Appuyez pour vous sauver.',
      // after a press nobody is named and nothing is kept: the same line on both screens
      failOne: 'Intéressant. On recommence ?',
      failBoth: 'Deux boutons. Intéressant. On recommence ?',
      failTitle: 'Intéressant.',
      failCab: 'Encore ?',
      hints: [
        'Le plafond ralentit à la fin. Personne n’a dit qu’il vous écraserait.',
        'Qui a dit qu’il fallait choisir ?',
      ],
      countdown: 'Le plafond s’arrête dans',
      win: '…Personne. Les deux portes s’ouvrent.',
      note: 'Je note.',
      winCab: 'Les deux portes',
    },
  },
  act2: {
    title: 'Le Labyrinthe noir',
    intro: 'Épreuve de communication. Chacun sait ce que l’autre ignore.',
    maze: {
      dame: '{mate} est dans le noir. Toi, tu vois tout d’en haut : les murs, les pièges rouges. Guide-{le} jusqu’à la sortie.',
      valet:
        'Tu es dans le noir. {mate} voit tout d’en haut. Écoute-{le}, et évite les pièges que tu ne vois pas.',
      trap: 'Piège. Retour à l’entrée.',
    },
    bomb: {
      dame: '{mate} a une bombe à cœurs entre les mains. Toi, tu as le manuel. Ouvre-le au pupitre.',
      valet:
        'Une bombe à cœurs. Décris-lui l’écran : {mate} a le manuel. Coupe le bon fil. 3 modules.',
      ok: 'Module désamorcé.',
      boom: 'Boum. Des cœurs partout. La bombe repart du premier module.',
      done: 'Bombe désamorcée.',
    },
    swap: {
      dame: 'À toi le noir, maintenant. {mate} voit les pièges d’en haut. Écoute-{le}.',
      valet: 'À toi de guider. {mate} est dans le noir. Les pièges rouges, toi seul{e} les vois.',
    },
    cardLine: 'La carte vous attend. Ensemble.',
    manual: {
      title: 'Manuel de la bombe à cœurs',
      intro: 'Demande-lui le symbole et le nombre sur l’écran. Puis dis-lui quel fil couper.',
      rules: [
        ['♥', 'nombre pair → fil rose · impair → fil or'],
        ['♠', 'nombre < 5 → fil bleu · sinon → fil blanc'],
        ['♦', 'multiple de 3 → fil or · sinon → fil bleu'],
        ['♣', 'nombre pair → fil blanc · impair → fil rose'],
      ],
      outro: 'Les fils, de gauche à droite : rose, or, bleu, blanc.',
    },
  },
  act3: {
    title: 'L’Heure dorée',
    intro: 'Pas d’épreuve. Pas de chrono. Promenez-vous.',
    objective: 'Promenez-vous. Retrouvez nos endroits (lumières dorées).',
    found: 'Nos endroits',
    tower: 'Le toit le plus haut. Montez ensemble par l’ascenseur.',
    sit: 'Asseyez-vous ensemble, et regardez.',
    moment: ['Regarde.', 'C’est la plus belle vue de tout le Borderland.'],
    gestures:
      'E près de l’autre : se tenir la main. E près d’un banc : s’asseoir. E près d’une fusée : feu d’artifice.',
  },
  act4: {
    lines: ['Quelle jolie vue.', 'Ce monde était trop parfait.', 'Prouvez qu’il mérite d’exister.'],
    // a few more words from the Joker, in his voice (doubt, the game, never cruel)
    doubt: 'Un tout petit doute. Rien de plus.',
    rule: 'Nouvelle règle : chacun son monde. Pour un temps.',
    // the visa drops hard, but never to nothing
    after: 'Visa : 3 heures.',
    visa: 'Visa · 3 h',
    end: 'On verra bien.',
  },
  act5: {
    title: 'Deux mondes',
    intro: 'Vous êtes séparés. Ce que l’un fait ouvre le chemin de l’autre.',
    dame: [
      'Allume les 9 dalles. Chaque dalle change aussi ses voisines.',
      'Un pont est apparu dans son monde. Attends que {mate} trouve l’interrupteur.',
      'Ta porte s’est ouverte. Active les symboles dans le bon ordre : {lui} seul{pe} le connaît.',
      '',
      'Son second pont est là. Attends que {mate} actionne le dernier interrupteur.',
      'La dernière porte est ouverte. Va au bout.',
    ],
    valet: [
      'Cours. Le Joker te suit. Il te faut un pont : {mate} seul{pe} peut le créer.',
      'Le pont est apparu. Trouve l’interrupteur au bout.',
      'Lis les symboles sur le mur : {mate} en a besoin. Attends le second pont.',
      'Le second pont est là. Dernier interrupteur, au bout.',
    ],
    voice: 'Vos voix reviennent, à mesure que vos mondes se rapprochent.',
    converge: 'Sautez. Ensemble. Attrapez-vous.',
    caught: 'Vous vous êtes rattrapés.',
    wall: 'Le Joker t’a rattrapé{e}.',
  },
  final: {
    title: 'Le Oui',
    place: 'L’endroit de notre rencontre',
    joker: 'Vous croyez vraiment qu’il suffit d’être ensemble ?',
    approach: 'Entrez ensemble dans le cercle lumineux, au centre.',
    broken: 'Le Joker n’a aucune prise sur vous deux.',
    reveal: [
      'Le Maître du jeu, c’était moi.',
      'Chaque épreuve était une phrase de ma lettre.',
      'La voici, en entier.',
    ],
    letter: [
      ['♥ 3', 'Je te fais confiance, même quand je ne vois rien.'],
      ['♠ 3', 'Quand le monde nous regarde, je me mets devant toi.'],
      ['♣ 2', 'Dans le noir, c’est ta voix que je suis.'],
      ['♠ 5', 'Dans les couloirs les plus sombres, je ne lâche pas ta main.'],
      ['♦ 2', 'Avec toi, même les casse-têtes ont un sens.'],
      ['♥ 2', 'Mes endroits préférés, ce sont ceux où l’on marche à deux.'],
      ['♠ 7', 'Je me battrai à tes côtés. Et parfois, c’est toi qui me protégeras.'],
      ['♣ 7', 'Aucun monstre n’est assez grand pour nous deux.'],
      ['♠ A', 'Je courrai toujours, tant que c’est vers toi.'],
      ['♣ A', 'Et quand la peur arrive, je saute quand même.'],
      ['♥ A', 'Tu es ma Dame de Cœur, Yoline.'],
    ],
    signature: '— Moi',
    visa: 'Visa : illimité.',
    missing: 'Il manque des cassettes… Le Maître du jeu avait encore des choses à dire.',
    last: 'Cinquante-deux cartes. Il en reste une, qui n’a pas de couleur.',
  },
  epilogue: {
    intro: 'Le toit, intact. La balade qui avait été interrompue. Et une dernière carte.',
    sit: 'Asseyez-vous. Cette fois, rien ne s’effondre.',
    joker: [
      'Cinquante-deux cartes. Votre Oui est entier.',
      'Il ne reste que moi. La carte sans couleur.',
      'J’aurais pu le garder. J’aurais pu vous faire rejouer pour toujours.',
      'Mais on ne gagne jamais seul… et vous, vous n’avez jamais été seuls.',
      'Reprenez-le.',
    ],
    back: 'Le Oui vous appartient. Il rentre là d’où il venait.',
    teaser: [
      'Le Joker s’est retourné.',
      'Au dos de la carte, quelque chose est écrit :',
      '« À la prochaine partie. »',
    ],
    sequel: 'BORDERLINE 2',
  },
  deck: {
    hud: 'Cartes',
    toastJoker: 'La carte sans couleur',
    locked: 'fermé',
    lockedHint: 'Les figures s’ouvrent quand les 40 chiffres sont réunis.',
    jokerHint: 'Le Joker : la dernière carte, quand les 52 sont réunies.',
    numbersNote: 'Une épreuve, une carte. La couleur dit le jeu (♠ le corps, ♦ la tête, ♣ l’équipe, ♥ la confiance), le rang dit la difficulté : du 2 au 10, puis les figures. Les As viendront en dernier.',
    facesNote: 'Les figures : Valet, Dame et Roi de chaque couleur. Le Joker viendra en dernier.',
    figuresTitle: 'Les figures',
    figures: 'Les quarante chiffres sont à vous. Les figures se réveillent : Valets, Dames et Rois.',
    tuto: 'P : votre boîte à cartes. Une épreuve, une carte. Les cartes manquantes sont des points d’interrogation.',
    // the words of the heart kept in the box, in the order they came back
    words: 'Les mots retrouvés',
    wordsEmpty: 'Chaque carte rend quelques mots. Ils se rangent ici.',
    nextUp: 'Prochaine épreuve',
    later: 'Ensuite',
    soon: 'À venir',
    soonN: 'épreuves en construction',
    // the story cards (the épreuves' own cards say where they come from, js/game/trials.js)
    where: {
      act5: 'Les As · Deux mondes',
      final: 'L’As de cœur · Le Oui',
      epilogue: 'Le vrai Joker',
      city: 'Cachée dans la ville',
    },
  },
  // what each card gives back on its reward screen: a detail of your story (seen once, kept in
  // the box) and a few words of the heart, cut from the voyage letter (voyage/js/config.js), never
  // written for the game. A detail still to come stays null: the screen then shows `missing`.
  heart: {
    missing: 'Un détail vous revient…',
    details: {
      s1: null, // [À COMPLÉTER] heart.details.s1
      d9: { text: 'Valorant. Le jeu où vous vous êtes rencontrés.', icon: 'spike' },
      s3: { text: 'Le 17 juillet.', chalk: true },
      c4: null, // [À COMPLÉTER] heart.details.c4
      h10: null, // [À COMPLÉTER] heart.details.h10
      h2: { text: 'Le premier appel. « On ne s’est pas dit un mot. »' },
      s2: null, // [À COMPLÉTER] heart.details.s2
    },
    words: {
      s1: '…quelque chose qui ne tienne pas dans un message…',
      d9: '…juste pour toi…',
      s3: '…J’aime ton rire…',
      c4: '…le calme que je ressens quand tu es à côté…',
      h10: '…je cherche des raisons de te parler…',
      h2: '…Yoline,…',
      s2: '…je sais ce que je ressens.',
    },
  },
  clues: {
    c4: 'Cassette 1 · « Ce toit, c’est là que je voulais lui montrer la vue. »',
    c5: 'Cassette 2 · « Le Joker n’est pas de moi. Il est arrivé avec le doute. »',
    c6: 'Cassette 3 · Un graffiti : « Y. » — la même signature que dans le voyage.',
  },
  places: [
    {
      id: 'cafe',
      tag: 'Souvenir · Monde 4',
      name: 'Toi qui règles tout',
      text: 'Toutes les fois où tu règles les problèmes : tu me pousses à avancer, tu me donnes des outils pour progresser, tu remets la connexion internet, ton calme incarné, ta note d’humour qui enlève de l’importance à mes complexes.',
    },
    {
      id: 'message',
      tag: 'Souvenir · Monde 1',
      name: 'Le premier appel',
      text: 'On ne s’est pas dit un mot. On s’est regardés pendant des dizaines de minutes, passionnément, avec amour, les yeux pétillants.',
    },
    {
      id: 'banc',
      tag: 'Souvenir · Monde 3',
      name: 'Ton appel à l’aide',
      text: 'La première fois que tu m’as demandé de l’aide, alors que tu n’en demandes jamais.',
    },
    // placeholder: the memory of the world 6 is still to be written
    {
      id: 'pluie',
      tag: 'Souvenir · Monde 6',
      name: 'L’averse',
      text: 'L’averse qui nous a coincés sous un abribus. On aurait pu courir. On est restés.',
    },
    {
      id: 'kino',
      tag: 'Souvenir · Monde 2',
      name: 'Nos fous rires',
      text: 'Les fous rires sur les jeux.',
    },
    // placeholder: the memory of the world 5 is still to be written
    {
      id: 'etoiles',
      tag: 'Souvenir · Monde 5',
      name: 'La nuit des étoiles',
      text: 'Tu m’as montré une étoile. Je n’ai jamais su laquelle : je ne regardais que toi.',
    },
    {
      id: 'chanson',
      tag: 'Souvenir · 07',
      name: 'Notre chanson',
      text: 'La chanson écoutée en boucle, jusqu’à la connaître par cœur. Toi les paroles, moi la mélodie.',
    },
    {
      id: 'danse',
      tag: 'Souvenir · 08',
      name: 'Notre première danse',
      text: 'Pas de musique, juste toi qui riais de mes pas. On a dansé quand même.',
    },
    {
      id: 'p3',
      tag: 'Souvenir · 09',
      name: 'La première photo',
      text: 'La première photo de nous deux. Floue, mal cadrée. Ma préférée.',
    },
    {
      id: 'p4',
      tag: 'Souvenir · 10',
      name: 'Le fou rire',
      text: 'Ce fou rire impossible à arrêter, pour une raison que plus personne ne comprend.',
    },
    {
      id: 'p5',
      tag: 'Souvenir · 11',
      name: 'La promesse',
      text: 'Le soir où on s’est promis des choses à voix basse, comme si le monde écoutait.',
    },
  ],
  credits: [
    ['title', 'BORDERLINE'],
    ['role', 'Un jeu pour'],
    ['name', 'Yoline'],
    ['role', 'Écrit, imaginé et construit par'],
    ['name', 'Moi'],
    ['role', 'Joué par'],
    ['name', 'Yoline & William'],
    ['role', 'Inspiré par'],
    ['name', 'Alice in Borderland · Split Fiction · Big Walk · Valorant · Squid Game · Destiny'],
    ['role', 'Merci d’avoir joué'],
    ['name', 'Visa : illimité'],
    ['role', 'Le Joker reviendra'],
    ['name', 'BORDERLINE 2'],
  ],
};
