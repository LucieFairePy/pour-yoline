// One épreuve = one card. The whole deck is planned here, in play order: world by world (Split
// Fiction: one world = one theme), each world from its easiest épreuve to its hardest. The card
// says the kind of game (♠ body, ♦ mind, ♣ teamwork, ♥ trust) and, by its rank, the difficulty
// within its suit (2 the easiest, then 10, the faces, and the ace the hardest), so the cards are
// picked up out of order, like in Alice in Borderland. The four aces belong to the story finale.
// An épreuve is playable once its phase is registered (Story.has); the others show as
// "à venir" in the deck and are skipped, so the game stays whole while new ones are built.
const Trials = (() => {
  // [world, trial id, card, phase, title, kits swapped?, existing city door]
  // (trial ids are the old ones and never change: saves store them)
  const PLAN = [
    // Monde 1 · Terre 39
    [1, 's1', 's2', 'tr_s1', 'Premiers pas', true],
    [1, 'd9', 'd2', 'portes', 'Les Portes', true, 'd9'],
    [1, 's3', 's3', 'soleil', 'Un, deux, trois, Soleil', true, 's3'],
    [1, 'c4', 'c2', 'act2', 'Le Labyrinthe noir', false, 'c4'],
    [1, 'h10', 'h3', 'act1', 'La Balance', false, 'h10'],
    [1, 'h2', 'h2', 'balade', 'La Rivière', false, 'h2'],
    [1, 's2', 's4', 'tr_s2', 'Les Toits qui tombent', false],
    // Monde 2 · Le Ciel
    [2, 'c1', 'c3', 'tr_c1', 'Le Câble', true],
    [2, 'c3', 'c5', 'tr_c3', 'La Bascule', true],
    [2, 'h5', 'h6', 'tr_h5', 'La Chute', true],
    // the end of the world: the heart was a lure, the saucer comes down (boss)
    [2, 'ufo', 's10', 'tr_ufo', 'La Soucoupe', false],
    // Monde 3 · La Cité des Rouages
    [3, 'd1', 'd3', 'tr_d1', 'Les Interrupteurs', false],
    [3, 'c2', 'c4', 'tr_c2', 'Le Téléphone', false],
    [3, 'd3', 'd5', 'tr_d3', 'Les Poids', false],
    [3, 'd4', 'd6', 'tr_d4', 'Le Code', false],
    [3, 'd5', 'd7', 'tr_d5', 'La Gravité', true],
    [3, 's4', 's6', 'tr_s4', 'La Tour', true],
    [3, 'd7', 'd9', 'tr_d7', 'Le Temps', false],
    [3, 'c5', 'c6', 'tr_c5', 'La Bombe à cœurs II', false],
    // Monde 4 · Le Conte
    [4, 'h3', 'h4', 'tr_h3', 'Les Yeux bandés', true],
    [4, 'd2', 'd4', 'tr_d2', 'Les Miroirs', true],
    [4, 'h4', 'h5', 'tr_h4', 'La Lanterne', false],
    [4, 'h6', 'h7', 'tr_h6', 'Le Jardin', false],
    [4, 'h7', 'h8', 'tr_h7', 'Le Bal', false],
    [4, 'd6', 'd8', 'tr_d6', 'Les Ombres', false],
    [4, 'c6', 'c8', 'tr_c6', 'Les Mondes miroirs', true],
    // Monde 5 · Les Profondeurs
    [5, 's7', 's5', 'donjon', 'La Crypte', true, 's7'],
    [5, 'sK', 's7', 'garde', 'La Garde royale', false, 'sK'],
    [5, 's5', 's8', 'tr_s5', 'Les Lames', false],
    [5, 'cR', 'c7', 'raid', 'Le Caveau', false, 'cR'],
    [5, 's6', 's9', 'tr_s6', 'Le Sol de lave', true],
    // Monde 6 · La Tempête: the storm over Terre 39, three 10s at the doors of the Cour (♠ 10 is
    // the saucer, at the end of world 2), then the Cour itself (the twelve faces: the Veilleurs)
    [6, 'h8', 'h9', 'tr_h8', 'L’Averse', true],
    [6, 'c7', 'c9', 'tr_c7', 'Le Pilote', true],
    [6, 'h10b', 'h10', 'tr_h10', 'Le Marché', false],
    [6, 'd10', 'd10', 'tr_d10', 'Le Lac gelé', true],
    [6, 'c10', 'c10', 'tr_c10', 'La Tour de Babel', false],
    [6, 'sV', 'sV', 'tr_sV', 'Le Valet de Pique', true],
    [6, 'sD', 'sD', 'tr_sD', 'La Dame de Pique', false],
    [6, 'sR', 'sR', 'tr_sR', 'Le Roi de Pique', false],
    [6, 'cV', 'cV', 'tr_cV', 'Le Valet de Trèfle', true],
    [6, 'cD', 'cD', 'tr_cD', 'La Dame de Trèfle', false],
    [6, 'cK', 'cR', 'tr_cK', 'Le Roi de Trèfle', false],
    [6, 'dV', 'dV', 'tr_dV', 'Le Valet de Carreau', true],
    [6, 'dD', 'dD', 'tr_dD', 'La Dame de Carreau', false],
    [6, 'dK', 'dR', 'tr_dK', 'Le Roi de Carreau', false],
    [6, 'hV', 'hV', 'tr_hV', 'Le Valet de Cœur', true],
    [6, 'hD', 'hD', 'tr_hD', 'La Dame de Cœur', false],
    [6, 'hK', 'hR', 'tr_hK', 'Le Roi de Cœur', false],
  ];
  // the story finale: act3 (golden hour) → act4 (the Joker breaks it) → act5 (three aces) →
  // final (the ace of hearts: the Oui itself) → epilogue (the Joker)
  const STORY_CARDS = { act5: ['d1', 's1', 'c1'], final: ['h1'], epilogue: ['J'] };
  const STORY_TITLE = { act5: 'Deux mondes', final: 'Le Oui', epilogue: 'Le vrai Joker' };
  const storyPhaseOf = (card) => Object.keys(STORY_CARDS).find((k) => STORY_CARDS[k].includes(card));

  const list = PLAN.map(([world, id, card, phase, title, swap, door]) => ({
    world,
    id,
    card,
    phase,
    title,
    swap: !!swap,
    door: door || null,
    face: /[VDR]$/.test(card),
  }));
  const byId = Object.fromEntries(list.map((t) => [t.id, t]));
  const byPhase = Object.fromEntries(list.map((t) => [t.phase, t]));
  const byCard = Object.fromEntries(list.map((t) => [t.card, t]));

  const built = (t) => typeof Story !== 'undefined' && Story.has(t.phase);
  const playable = () => list.filter(built);
  const numbersLeft = (done) => playable().filter((t) => !t.face && !done.includes(t.id));
  /** The next épreuve to play, or null when every built one is done (→ the story finale). */
  const next = (done) => {
    const nums = numbersLeft(done);
    if (nums.length) return nums[0];
    return playable().find((t) => !done.includes(t.id)) || null;
  };
  // saves made before the registry: chapter index in the v3 order
  const V3_ORDER = ['h10', 's3', 'c4', 's7', 'd9', 'h2', 'sK', 'cR'];
  const fromChapter = (ch) => V3_ORDER.slice(0, Math.min(ch, V3_ORDER.length));

  return {
    list,
    byId,
    byPhase,
    byCard,
    STORY_CARDS,
    STORY_TITLE,
    storyPhaseOf,
    built,
    playable,
    next,
    numbersLeft,
    fromChapter,
    swap: (phase) => !!(byPhase[phase] && byPhase[phase].swap),
    title: (card) =>
      (byCard[card] && byCard[card].title) ||
      STORY_TITLE[storyPhaseOf(card)] ||
      '',
    cardsOf: (done) => done.map((id) => byId[id] && byId[id].card).filter(Boolean),
  };
})();
