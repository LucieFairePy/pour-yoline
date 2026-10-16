// tr_dK · Le Roi de Carreau (La Coupole, js/world/cour_d.js area C). Kits as usual. A code of four
// different gems out of five colours; slots I-II belong to the dame kit, III-IV to the valet kit
// (E near a slot cycles its gem: {a:'set', i}); each pulls their own lever (E: {a:'ready'}); the
// Roi weighs the guess once both levers are pulled: gold count on the dame's screen, silver count
// on the valet's (the players tell each other). Seven tries, then a new code with one gem shown.
// Both pages compute the same next guess from the shared history (both halves of every answer,
// as said aloud) and the shown gems: a minimax pick among the codes still possible. Never reads
// x.code. Won (stage 3): after ~7 s the host goes to phase 'cut' (cinematic cour_d), skipped by
// holding E, then 'tr_dKw' hands the reward.
(() => {
  const W = CourD;
  B.W = W;
  const X = () => Story.S.x;
  const S = Input.sim;
  const inLv = () => !CL.abort && Story.S && Story.S.phase === 'tr_dK';
  const TRIES = 7;
  const score = (g, code) => {
    let b = 0;
    const cg = [0, 0, 0, 0, 0];
    const cc = [0, 0, 0, 0, 0];
    g.forEach((v, i) => {
      if (v === code[i]) b++;
      cg[v]++;
      cc[code[i]]++;
    });
    let both = 0;
    for (let k = 0; k < 5; k++) both += Math.min(cg[k], cc[k]);
    return { b, w: both - b };
  };
  const ALL = [];
  for (let a = 0; a < 5; a++)
    for (let b = 0; b < 5; b++)
      for (let c = 0; c < 5; c++)
        for (let d = 0; d < 5; d++) if (new Set([a, b, c, d]).size === 4) ALL.push([a, b, c, d]);
  // the next guess, the same on both pages (deterministic)
  const nextGuess = (x) => {
    const rev = x.reveal || [];
    const hist = x.hist || [];
    const cand = ALL.filter((code) => rev.every(([i, v]) => code[i] === v) && hist.every((h) => {
      const s = score(h.g, code);
      return s.b === h.b && s.w === h.w;
    }));
    if (!cand.length) return null;
    if (cand.length <= 2) return cand[0];
    let best = null;
    let bw = Infinity;
    for (const g of cand) {
      const parts = {};
      let worst = 0;
      for (const c of cand) {
        const s = score(g, c);
        const k = s.b * 10 + s.w;
        parts[k] = (parts[k] || 0) + 1;
        if (parts[k] > worst) worst = parts[k];
      }
      if (worst < bw) {
        bw = worst;
        best = g;
      }
    }
    return best;
  };
  const setSlot = async (i, v) => {
    const s = W.SLOTS[i];
    await B.go([s.x, 0, s.z - 1.3], { near: 0.35, ms: 20000 });
    B.face([s.x, 1.5, s.z]);
    await B.sl(200);
    for (let k = 0; k < 7 && inLv() && X().slots[i] !== v; k++) {
      const before = X().slots[i];
      await B.tap('interact');
      await B.until(() => !inLv() || X().slots[i] !== before, 2000, 40);
      await B.sl(120);
    }
    return X().slots[i] === v;
  };
  const pullLever = async () => {
    const L = W.LEVERS_C[Story.role];
    await B.go([L[0], 0, L[1] - 1.3], { near: 0.35, ms: 20000 });
    B.face([L[0], 1.2, L[1]]);
    await B.sl(200);
    await B.tap('interact');
    const k0 = (X().hist || []).length;
    await B.until(() => !inLv() || (X().ready || {})[Story.role] || (X().hist || []).length !== k0, 2500, 50);
  };

  window.CL = {
    timeout: 900,
    async run() {
      const me = Story.role;
      // ---- stage 1: into the dome ----
      await B.walk([me === 'dame' ? 1.2 : -1.2, 0, 96], 0.5, 15000);
      B.note('reelle', 'sous la Coupole');
      await B.until(() => !inLv() || X().stage >= 2, 60000);
      // ---- stage 2: guesses ----
      let tries = 0;
      while (inLv() && X().stage === 2) {
        const x = X();
        const hist = x.hist || [];
        // a lost hand: wait for the new code
        if (hist.length >= TRIES) {
          await B.sl(300);
          continue;
        }
        const g = nextGuess(x);
        if (!g) {
          B.note('reelle', 'aucun code possible ?! historique ' + JSON.stringify(hist));
          await B.sl(2000);
          continue;
        }
        const key = (x.cn || 1) + ':' + hist.length;
        const mine = W.SLOTS.filter((s) => s.who === me).map((s) => s.i);
        const shown = (x.reveal || []).map((r) => r[0]);
        for (const i of mine) if (!shown.includes(i)) await setSlot(i, g[i]);
        if (!inLv() || X().stage !== 2) break;
        // the history moved meanwhile (should not): recompute
        if ((X().cn || 1) + ':' + (X().hist || []).length !== key) continue;
        await pullLever();
        tries++;
        B.note('reelle', 'essai ' + (hist.length + 1) + ' (code ' + (x.cn || 1) + ') : ' + g.map((v) => W.GEMS[v].name).join(' ') + ' — mon levier tiré');
        // wait for the Roi to weigh it (the partner pulls theirs)
        await B.until(() => !inLv() || X().stage !== 2 || (X().cn || 1) + ':' + (X().hist || []).length !== key, 120000, 100);
        if (inLv() && X().res) B.note('reelle', 'réponse : or ' + X().res.b + ' / argent ' + X().res.w + (X().res.ok ? ' — trouvé' : ''));
      }
      if (CL.abort) return me + ': abandon';
      // ---- stage 3 → 'cut' (cinematic cour_d) → 'tr_dKw' → reward ----
      await B.until(() => CL.abort || (Story.S && Story.S.phase !== 'tr_dK'), 30000, 100);
      if (Story.S && Story.S.phase === 'cut') {
        await B.until(() => CL.abort || (typeof Cut !== 'undefined' && Cut.on) || Story.S.phase !== 'cut', 10000, 100);
        if (Cut.on && Story.S.phase === 'cut') {
          await B.sl(1500);
          await B.hold('interact', 1600);
          B.note('reelle', 'cinématique cour_d passée (E maintenu)');
        }
        await B.until(() => CL.abort || Story.S.phase !== 'cut', 60000, 200);
      }
      return me + ': ' + tries + ' leviers, phase ' + (Story.S && Story.S.phase);
    },
  };
})();
