const CONFIG = {
  her: 'Yoline',
  me: 'Moi',
  master: 'Le Maître du jeu',
  roles: {
    dame: { name: 'La Dame', suit: '♥', pronoun: 'elle', other: 'lui' },
    valet: { name: 'Le Valet', suit: '♠', pronoun: 'lui', other: 'elle' },
  },
  prologue: {
    objective: 'Retrouve l’autre joueur. Écoute, appelle avec C.',
    welcome: [
      'Bienvenue, Yoline.',
      'Joueurs : 2. Visa : 3 jours.',
      'Réunissez les cartes pour rentrer.',
      'Une seule règle : ici, on ne gagne jamais seul.',
    ],
    abilities: {
      dame: 'Capacité reçue : le grappin. Et tes yeux voient ce que les siens ne voient pas.',
      valet: 'Capacité reçue : le double saut. Et tu portes ce qu’elle ne peut pas porter.',
    },
    door: 'Une porte s’est allumée. ♥ 10.',
  },
  act1: {
    card: '♥ 10',
    title: 'La Balance',
    sub: 'Épreuve de confiance',
    intro: 'Épreuve de confiance. Ce que l’un ne voit pas, l’autre le voit.',
    bridge: {
      dame: 'Le pont de gauche est invisible pour lui. Toi, tu le vois. Guide-le.',
      valet: 'Le pont de gauche est invisible pour toi. Elle, elle le voit. Écoute-la.',
      dame2: 'Le pont de droite a des dalles fausses. Lui seul sait lesquelles.',
      valet2: 'Le pont de droite a des dalles fausses pour elle. Toi seul vois les vraies.',
    },
    winch: {
      dame: 'Tiens le treuil. Tant que tu tiens, il avance.',
      valet: 'Accroche-toi au harnais. Elle seule peut te faire traverser.',
      grapple: 'À toi. Vise les anneaux et lance ton grappin.',
    },
    cabins: {
      enter: 'Chacun dans sa cabine.',
      rule: 'Un seul sortira. Appuie pour te sauver.',
      failDame: 'Raté. Réessaie, mais avec lui.',
      failValet: 'Raté. Réessaie, mais avec elle.',
      win: 'Personne n’a appuyé. Les deux portes s’ouvrent.',
    },
    reward: ['Tu aurais pu sortir seule.', 'Tu es restée.', 'Retiens ça. Tu en auras besoin.'],
  },
  places: [
    {
      id: 'cafe',
      tag: 'Souvenir · 01',
      name: 'Notre café',
      text: 'Ici, la première fois, on a parlé si longtemps qu’ils ont commencé à ranger les chaises autour de nous.',
    },
  ],
  end: {
    title: 'Fin du prologue',
    text: 'La suite du Borderland arrive bientôt. Les autres cartes attendent.',
  },
};
