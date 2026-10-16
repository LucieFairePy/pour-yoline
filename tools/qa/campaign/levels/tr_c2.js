// ♣ 4 · Le Téléphone (tr_c2). No swap: Yoline = dame (reader), William = valet (dialer / plugs).
// Round 1: dame walks into the glass booth (the drum is drawn only for her, only in the booth);
//   valet walks onto the dial plates and presses E (update() sends {a:'dial'}).
// Round 2: dame climbs the gallery stairs to the operator desk (the list is drawn only there);
//   valet walks along the switchboard: E on a « LIGNES » socket (grab), E on a « NUMÉROS » socket (plug).
// Round 3: four calls, the caller's console shows the sequence, the other presses its plates (E).
//   Final: both on their heart plate, E together on the shared count's « MAINTENANT » (beat 3).
// Round 4: both walk to the card at (0, 101.4).
// What the partner « says » (sequence, pairs) is read from Story.S.x only once it is on the
// partner's screen (dame in the booth / on the gallery; the caller's console in round 3).
window.CL = {
  timeout: 600,
  async run() {
    const W = TrC2;
    B.W = W;
    const me = Story.role;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const t0 = performance.now();
    const log = [];
    const rel = (p) => W.rel(p, V3());
    const mate = () => (Remote.has ? rel(Remote.pos) : null);
    const plate = (id) => W.plates.find((p) => p.id === id);
    // walk onto a plate (flat floor), settle
    const onPlate = async (id) => {
      const p = plate(id);
      await B.walk([p.rel.x, 0, p.rel.z], 0.3, 8000);
      await B.sl(180);
      return W.plateAt(rel(Player.body.p)) === p;
    };
    const SOCK_STAND = 11.9;
    const L_Z = [43.4, 45, 46.6, 48.2, 49.8, 51.4];
    const R_Z = [56.6, 58.2, 59.8, 61.4, 63, 64.6];

    // ---------------- round 1 · Le Cadran ----------------
    if (X().round === 1) {
      if (me === 'dame') {
        await B.go([-5.5, 0, 24], { near: 0.6, ms: 30000 });
        await B.walk([-8.5, 0, 24], 0.35, 6000);
        B.face([-9.8, 0, 24]);
        B.note('reelle', 'dame entre dans la cabine (inBooth=' + W.inBooth(rel(Player.body.p)) + '), lit le tambour');
        await B.until(() => X().round !== 1 || ab(), 240000, 200);
      } else {
        await B.go([4.5, 0, 24], { near: 0.6, ms: 30000 });
        B.note('reelle', 'valet au grand cadran, attend que la dame soit dans la cabine');
        await B.until(() => { const m = mate(); return (m && W.inBooth(m)) || X().round !== 1; }, 60000, 200);
        let n = 0;
        while (X().round === 1 && !ab() && n < 40) {
          const r1 = X().r1;
          const want = r1.seq[r1.prog];
          const dn = r1.dn;
          if (!(await onPlate('dial' + want))) {
            B.note('reelle', 'plaque dial' + want + ' pas atteinte, ' + B.rel());
            continue;
          }
          await B.tap('interact');
          await B.until(() => X().r1.dn !== dn || X().round !== 1, 3000, 50);
          n++;
          await B.sl(250);
        }
        B.note('reelle', 'valet compose les deux numéros lus par la dame (' + n + ' appuis E)');
      }
      log.push('r1 ' + (X().round >= 2 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');
    await B.until(() => X().round >= 2 || ab(), 60000, 200);
    await B.sl(1500); // the gate grille slides up

    // ---------------- round 2 · Le Standard ----------------
    if (X().round === 2) {
      if (me === 'dame') {
        await B.go([-11, 0, 39.4], { near: 0.5, ms: 40000 });
        await B.walk([-11, 0, 47.5], 0.4, 8000); // up the six steps
        await B.walk([-10.6, 0, 52.5], 0.4, 6000);
        B.face([-13, 0, 55]);
        B.note('reelle', 'dame monte à la galerie (onGallery=' + W.onGallery(rel(Player.body.p)) + '), lit le tableau');
        await B.until(() => X().round !== 2 || ab(), 240000, 200);
      } else {
        await B.go([SOCK_STAND, 0, 47], { near: 0.6, ms: 40000 });
        await B.until(() => { const m = mate(); return (m && W.onGallery(m)) || X().round !== 2; }, 60000, 200);
        B.note('reelle', 'valet au standard ; la dame lit les lignes depuis la galerie');
        let n = 0;
        while (X().round === 2 && !ab() && n < 20) {
          n++;
          const r2 = X().r2;
          const todo = r2.pairs.find(([l, r]) => r2.conn[l] !== r);
          if (!todo) break;
          const [l, r] = todo;
          if (!r2.hold) {
            await B.walk([SOCK_STAND, 0, L_Z[l]], 0.2, 8000);
            await B.sl(150);
            await B.tap('interact');
            await B.until(() => X().r2.hold, 2000, 50);
          }
          if (!X().r2.hold || X().r2.hold.l !== l) {
            // holding the wrong plug: put it back
            if (X().r2.hold) {
              await B.walk([SOCK_STAND, 0, L_Z[X().r2.hold.l]], 0.2, 8000);
              await B.tap('interact');
              await B.sl(300);
            }
            continue;
          }
          await B.walk([SOCK_STAND, 0, R_Z[r]], 0.2, 8000);
          await B.sl(150);
          await B.tap('interact');
          await B.until(() => !X().r2.hold || X().round !== 2, 2000, 50);
          await B.sl(250);
        }
        B.note('reelle', 'valet branche les trois fiches (E prendre / E brancher)');
      }
      log.push('r2 ' + (X().round >= 3 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');
    await B.until(() => X().round >= 3 || ab(), 60000, 200);
    await B.sl(1500);

    // ---------------- round 3 · L'Appel ----------------
    const s = me === 'dame' ? -1 : 1;
    if (X().round === 3) {
      await B.go([s * 4.5, 0, 82], { near: 0.6, ms: 40000 });
      let n = 0;
      let lastNote = -1;
      while (X().round === 3 && !X().r3.final && !ab() && n < 80) {
        const r3 = X().r3;
        if (r3.caller === me) {
          if (lastNote !== r3.sub) {
            lastNote = r3.sub;
            B.note('reelle', 'appel ' + (r3.sub + 1) + ' : ' + me + ' lit sa suite sur sa console');
          }
          await B.sl(200);
          continue;
        }
        if (lastNote !== r3.sub) {
          lastNote = r3.sub;
          B.note('reelle', 'appel ' + (r3.sub + 1) + ' : ' + me + ' décroche, appuie les plaques dans l’ordre lu');
        }
        const kn = X().kn || 0;
        if (!(await onPlate('c' + me[0] + r3.seq[r3.prog]))) continue;
        await B.tap('interact');
        await B.until(() => (X().kn || 0) !== kn || X().round !== 3, 2500, 50);
        n++;
        await B.sl(250);
      }
      // final: the heart plate, press on « MAINTENANT »
      await B.until(() => X().r3.final || X().round !== 3 || ab(), 120000, 200);
      await onPlate('go_' + me);
      B.note('reelle', me + ' sur son cœur, appuie E au « MAINTENANT » du compte commun');
      let tries = 0;
      while (X().round === 3 && !ab() && tries < 30) {
        await B.until(() => X().r3.beat === 3 || X().round !== 3, 5000, 10);
        if (X().round !== 3) break;
        if (!W.plateAt(rel(Player.body.p)) || W.plateAt(rel(Player.body.p)).id !== 'go_' + me) await onPlate('go_' + me);
        await B.tap('interact', 60);
        tries++;
        await B.until(() => X().r3.beat !== 3 || X().round !== 3, 2000, 20);
      }
      log.push('r3 ' + (X().round >= 4 ? 'ok' : 'ko') + ' (' + tries + ' essais ensemble)');
    }
    if (ab()) return log.join(', ');

    // ---------------- round 4 · the card ----------------
    await B.until(() => X().round >= 4 || ab(), 30000, 200);
    await B.walk([s * 2, 0, 99.8], 0.5, 10000);
    await B.walk([s * 0.9, 0, 101.4], 0.4, 6000);
    B.note('reelle', me + ' à la carte');
    await B.until(() => Story.S.phase !== 'tr_c2' || ab(), 15000, 200);
    log.push('carte, ' + Math.round((performance.now() - t0) / 1000) + ' s');
    return me + ': ' + log.join(', ');
  },
};
