// One épreuve = one card. The whole deck is planned here, in play order: the numbers by rank
// (1 to 10, ♥ ♠ ♦ ♣ inside each rank, like the difficulty in Alice in Borderland: ♠ body,
// ♦ mind, ♣ teamwork, ♥ trust), then the faces, then the story finale and the Joker.
// An épreuve is playable once its phase is registered (Story.has); the others show as
// "à venir" in the deck and are skipped, so the game stays whole while new ones are built.
const Trials = (() => {
  // [trial id, card, phase, title, kits swapped?, existing city door]
  const PLAN = [
    ['h10', 'h1', 'act1', 'La Balance', false, 'h10'],
    ['s1', 's1', 'tr_s1', 'Premiers pas', true],
    ['d1', 'd1', 'tr_d1', 'Les Interrupteurs', false],
    ['c1', 'c1', 'tr_c1', 'Le Câble', true],
    ['h2', 'h2', 'balade', 'La Rivière', false, 'h2'],
    ['s2', 's2', 'tr_s2', 'Les Toits qui tombent', false],
    ['d2', 'd2', 'tr_d2', 'Les Miroirs', true],
    ['c2', 'c2', 'tr_c2', 'Le Téléphone', false],
    ['h3', 'h3', 'tr_h3', 'Les Yeux bandés', true],
    ['s3', 's3', 'soleil', 'Un, deux, trois, Soleil', true, 's3'],
    ['d3', 'd3', 'tr_d3', 'Les Poids', false],
    ['c3', 'c3', 'tr_c3', 'La Bascule', true],
    ['h4', 'h4', 'tr_h4', 'La Lanterne', false],
    ['s4', 's4', 'tr_s4', 'La Tour', true],
    ['d4', 'd4', 'tr_d4', 'Le Code', false],
    ['c4', 'c4', 'act2', 'Le Labyrinthe noir', false, 'c4'],
    ['h5', 'h5', 'tr_h5', 'La Chute', true],
    ['s5', 's5', 'tr_s5', 'Les Lames', false],
    ['d5', 'd5', 'tr_d5', 'La Gravité', true],
    ['c5', 'c5', 'tr_c5', 'La Bombe à cœurs II', false],
    ['h6', 'h6', 'tr_h6', 'Le Jardin', false],
    ['s6', 's6', 'tr_s6', 'Le Sol de lave', true],
    ['d6', 'd6', 'tr_d6', 'Les Ombres', false],
    ['c6', 'c6', 'tr_c6', 'Les Mondes miroirs', true],
    ['h7', 'h7', 'tr_h7', 'Le Bal', false],
    ['s7', 's7', 'donjon', 'La Crypte', true, 's7'],
    ['d7', 'd7', 'tr_d7', 'Le Temps', false],
    ['c7', 'c7', 'tr_c7', 'Le Pilote', true],
    ['h8', 'h8', 'tr_h8', 'L’Averse', true],
    ['s8', 's8', 'tr_s8', 'La Chasse', false],
    ['d8', 'd8', 'tr_d8', 'Le Lac gelé', true],
    ['c8', 'c8', 'tr_c8', 'Le Ballet', false],
    ['h9', 'h9', 'tr_h9', 'Le Sacrifice', false],
    ['s9', 's9', 'tr_s9', 'Le Train', true],
    ['d9', 'd9', 'portes', 'Les Portes', true, 'd9'],
    ['c9', 'c9', 'tr_c9', 'Les Ponts', false],
    ['h10b', 'h10', 'tr_h10', 'Le Fil', true],
    ['s10', 's10', 'tr_s10', 'Le Colisée', false],
    ['d10', 'd10', 'tr_d10', 'La Bibliothèque', true],
    ['c10', 'c10', 'tr_c10', 'La Tour de Babel', false],
    // the faces: one boss or set-piece each
    ['sV', 'sV', 'tr_sV', 'Le Valet de Pique', true],
    ['sD', 'sD', 'tr_sD', 'La Dame de Pique', false],
    ['sK', 'sR', 'garde', 'Le Roi de Pique', false, 'sK'],
    ['cV', 'cV', 'tr_cV', 'Le Valet de Trèfle', true],
    ['cD', 'cD', 'tr_cD', 'La Dame de Trèfle', false],
    ['cR', 'cR', 'raid', 'Le Caveau', false, 'cR'],
    ['dV', 'dV', 'tr_dV', 'Le Valet de Carreau', true],
    ['dD', 'dD', 'tr_dD', 'La Dame de Carreau', false],
    ['hV', 'hV', 'tr_hV', 'Le Valet de Cœur', true],
    ['hR', 'hR', 'tr_hR', 'Le Roi de Cœur', false],
  ];
  // the story finale: act3 (golden hour) → act4 (the Joker breaks it) → act5 → final → epilogue
  const STORY_CARDS = { act5: 'dR', final: 'hD', epilogue: 'J' };
  const STORY_TITLE = { act5: 'Deux mondes', final: 'Dame de Cœur', epilogue: 'Le vrai Joker' };

  const list = PLAN.map(([id, card, phase, title, swap, door]) => ({
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
    built,
    playable,
    next,
    numbersLeft,
    fromChapter,
    swap: (phase) => !!(byPhase[phase] && byPhase[phase].swap),
    title: (card) =>
      (byCard[card] && byCard[card].title) ||
      STORY_TITLE[Object.keys(STORY_CARDS).find((k) => STORY_CARDS[k] === card)] ||
      '',
    cardsOf: (done) => done.map((id) => byId[id] && byId[id].card).filter(Boolean),
  };
})();
