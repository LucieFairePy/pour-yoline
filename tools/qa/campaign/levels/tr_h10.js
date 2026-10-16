// tr_h10 · Le Marché (♥ 10, épreuve h10b). Kits as usual: Yoline = dame, William = valet.
// Each page plays its own kit with real keys (Input.sim); the level's update() sends every action.
//  1 · Le Raccourci: each on its « Non » plate (dame west, valet east), E held together.
//  2 · La Preuve: the one without the monocle pulls the cord of the curtain the monocle shows
//      (the true heart, glowing on the seer's screen); two hearts, monocle passed (E near the
//      mate), two hearts again.
//  3 · Les Loges: each at their « Non » lever; pull at the true bell (the Capitaine's watch, on
//      one screen; the other one follows the count said aloud).
//  4 · La Porte: each at their lectern, E at the same instant (counted together: both pages use
//      the machine clock, a shared « 3, 2, 1 »).
//  5 · both to the card.
window.CL = {
  timeout: 900,
  async run() {
    const W = H10;
    B.W = W;
    const X = () => Story.S.x;
    const r = Story.role;
    const s = r === 'dame' ? -1 : 1;
    const log = [];
    const mark = (m) => log.push(m);
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_h10';
    const q = () => W.rel(Player.body.p);
    const wait = (fn, ms = 30000, step = 100) => B.until(() => !live() || fn(), ms, step);

    // ---- the alley of stalls: three stepping slabs (a fall respawns at the alley's start) ----
    const alley = async () => {
      for (let tries = 0; tries < 6 && live(); tries++) {
        await B.walk([s * 1.5, 0, 72.5], 0.5, 25000);
        await B.leap([s * 0.8, 0.5, 79]);
        if (q().z < 76 || q().y < 0.2) {
          await B.sl(1500);
          continue;
        }
        await B.leap([1.2 + s * 0.8, 1.0, 86.5]);
        if (q().z < 83.5 || q().y < 0.7) {
          await B.sl(1500);
          continue;
        }
        await B.leap([s * 1.0, 1.5, 94]);
        if (q().z < 90.5 || q().y < 1.2) {
          await B.sl(1500);
          continue;
        }
        return true;
      }
      return false;
    };

    // ---------- 1 · Le Raccourci ----------
    if (X().stage === 1 && !X().non1) {
      await B.walk([s * 4.5, 0, 40], 0.35, 40000);
      B.note('reelle', `${r} sur sa plaque « Non » (${s < 0 ? 'ouest' : 'est'}), E maintenu`);
      while (live() && !X().non1) {
        // keep on the plate (a push can move us), E held
        const p = q();
        if (Math.hypot(p.x - s * 4.5, p.z - 40) > 0.8) await B.walk([s * 4.5, 0, 40], 0.35, 6000);
        await B.hold('interact', 3000);
      }
      Input.sim.held.delete('interact');
      mark('non1');
    }
    if (!live()) return r + ': ' + log.join(', ');

    // ---------- the alley, up to the place ----------
    if (X().stage <= 2 && !X().done2 && q().z < 104) {
      if (!(await alley())) mark('alley FAIL');
      else B.note('reelle', 'allée des étals franchie (trois sauts)');
    }
    if (X().stage <= 2 && !X().done2) {
      await B.walk([s * 1.2, 3, 113], 0.5, 15000);
      await B.walk([s * 1.5, 3, 124], 0.5, 15000);
      await wait(() => X().cp === 'plaza' || X().stage > 2, 30000);
      mark('plaza');
    }

    // ---------- 2 · La Preuve ----------
    let noted2 = 0;
    while (live() && X().stage === 2 && !X().done2) {
      const x = X();
      const chooser = x.mono === 'valet' ? 'dame' : 'valet';
      if (x.r2 === 2 && x.mono === 'valet') {
        // between the rounds: the valet walks to the dame and gives the monocle (E near her)
        if (r === 'valet') {
          await B.walk(Remote.pos.clone(), 1.6, 8000);
          await B.tap('interact');
          B.note('reelle', 'monocle passé (E près de la partenaire)');
          await wait(() => X().mono !== 'valet', 2500);
        } else await B.sl(300);
        continue;
      }
      const dl = x.deal;
      const open = dl && dl.t >= 0 && !(x.open2 && x.open2.n === dl.n);
      if (r === chooser && open) {
        // the seer (monocle) sees the true curtain glow and says it aloud
        if (noted2 !== dl.n) {
          noted2 = dl.n;
          B.note('reelle', `rideau ${W.ROMAN[dl.t]} : celui que le monocle montre à ${Story.name(mateRole(r))} (le Joker « prouve » ${W.ROMAN[dl.l]})`);
        }
        const b = W.BOOTHS[dl.t];
        await B.go([b.fx, 3, b.fz], { near: 0.45, ms: 15000 });
        B.face([b.x, 3, b.z]);
        await B.sl(150);
        await B.tap('interact', 100);
        await wait(() => X().open2 && X().open2.n === dl.n, 4000);
        mark('pull ' + (X().open2 && X().open2.prize));
        await B.go([s * 3.6, 3, 125], { near: 0.6, ms: 8000 });
      } else await B.sl(250);
    }
    function mateRole(k) {
      return k === 'dame' ? 'valet' : 'dame';
    }
    if (!live()) return r + ': ' + log.join(', ');

    // ---------- 3 · Les Loges ----------
    if (X().stage <= 3 && !X().done3) {
      if (q().z < 140) await B.go([s * 1.2, 3, 139], { near: 0.6, ms: 20000 });
      await B.walk([s * 1.2, 3, 150], 0.5, 20000);
      await B.walk([s * 1.2, 3, 163], 0.5, 20000);
      await B.walk([s * 5, 3, 168], 0.5, 20000);
      await B.walk([s * 3.7, 3, 192.6], 0.3, 20000);
      B.face([s * 3.7, 3, 200]);
      mark('loge');
    }
    let bellSeen = 0;
    while (live() && X().stage === 3 && !X().done3) {
      await wait(() => X().bell || X().done3, 25000);
      const bl = X().bell;
      if (!bl || X().done3) continue;
      if (bl.n === bellSeen) {
        await B.sl(100);
        continue;
      }
      bellSeen = bl.n;
      const watch = (X().r3 === 2 ? 'valet' : 'dame') === r;
      // stay at « Non » (a push could have moved us)
      const p = q();
      if (Math.hypot(p.x - s * 3.7, p.z - 192.6) > 0.5) await B.walk([s * 3.7, 3, 192.6], 0.25, 4000);
      B.face([s * 3.7, 3, 200]);
      const t0 = W.local.bellT0;
      await wait(() => !X().bell || X().bell.n !== bl.n || performance.now() / 1000 - t0 >= bl.d - 0.05, 30000, 10);
      if (X().bell && X().bell.n === bl.n) {
        await B.tap('interact', 60);
        B.note('reelle', watch ? 'levier « Non » tiré au coup de la montre du Capitaine' : 'levier « Non » tiré sur le compte de la partenaire (pas sur l’horloge du Joker)');
      }
      await wait(() => !X().bell || X().bell.n !== bl.n, 6000);
      mark('bell ' + JSON.stringify(X().res3 && { ok: X().res3.ok, why: X().res3.why }));
    }
    if (!live()) return r + ': ' + log.join(', ');

    // ---------- 4 · La Porte ----------
    if (X().stage <= 4 && !X().done4) {
      await B.walk([s * 0.6, 3, 200], 0.5, 15000);
      await B.walk([s * 0.8, 3, 236], 0.5, 20000);
      await B.walk([s * 0.8, 6, 245.5], 0.5, 20000);
      await B.walk([s * 4, 6, 249], 0.5, 20000);
      await B.walk([s * 6, 6, 266.9], 0.3, 20000);
      B.face([s * 6, 6, 280]);
      mark('lectern');
    }
    let askSeen = 0;
    while (live() && X().stage === 4 && !X().done4) {
      await wait(() => X().ask4 || X().done4, 25000);
      const ak = X().ask4;
      if (!ak || X().done4) continue;
      if (ak.n === askSeen) {
        await B.sl(100);
        continue;
      }
      askSeen = ak.n;
      const p = q();
      if (Math.hypot(p.x - s * 6, p.z - 266.9) > 0.6) await B.walk([s * 6, 6, 266.9], 0.3, 4000);
      // « à trois » together: the next 3-second mark of the shared clock, at least 1.8 s away
      const T = Math.ceil((Date.now() + 1800) / 3000) * 3000;
      while (live() && Date.now() < T) await B.sl(2);
      if (X().ask4 && X().ask4.n === ak.n) {
        await B.tap('interact', 60);
        B.note('reelle', `« Non » (E) au pupitre, compté ensemble (sceau ${ak.k})`);
      }
      await wait(() => !X().ask4 || X().ask4.n !== ak.n, 4000);
      mark('non ' + (X().seals || 0));
    }
    if (!live()) return r + ': ' + log.join(', ');

    // ---------- 5 · the card ----------
    await B.walk([s * 3, 6, 278], 0.5, 15000);
    await B.walk([s * 1.4, 6, 292], 0.4, 15000);
    B.note('reelle', 'à la carte, derrière la porte de la Cour');
    await wait(() => false, 20000);
    return r + ': ' + log.join(', ') + ' → ' + (Story.S && Story.S.phase);
  },
};
