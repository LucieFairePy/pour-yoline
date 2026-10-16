// act4 (the Joker breaks the golden hour): a staged sequence, the players are frozen and watch;
// the host moves on to act5 on its own clock. Nothing to press: wait, and check nobody can move.
window.CL = {
  timeout: 300,
  async run() {
    const frozen = Player.mode === 'frozen';
    B.note('attente', `séquence mise en scène (joueur ${frozen ? 'figé' : 'NON figé : ' + Player.mode}), rien à faire`);
    await B.until(() => Story.S.phase !== 'act4' || CL.abort, 280000, 500);
    return 'watched (' + (frozen ? 'frozen' : Player.mode) + ')';
  },
};
