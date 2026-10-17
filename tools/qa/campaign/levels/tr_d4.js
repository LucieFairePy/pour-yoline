// ♦ 6 · Le Code (tr_d4). No swap: Yoline = dame (grapple), William = valet (strong double jump).
// Stage 1: four safes. Dame: ♥ (floor, west) then ♦ (balcony, grapple F at the ring).
//   Valet: ♣ (floor, east) then ♠ (ledge 2.95 m, double jump). Dial: tap E (+1), hold E (try).
//   The codes are read from Story.S.x.codes: each one is shown to a player in the room (♥ clock,
//   ♣ invisible ink for the dame, ♠ painting from the balcony, ♦ painting from the ledge).
// Stage 2: valet crosses the laser rows in the open lane (the dame's monitor shows them; D4.L.step),
//   types order×digits on the keypad (E per key); dame grapples to the catwalk and pulls the lever (E).
// Stage 3: both cranks of the same ring together (E on a shared 1.8 s beat of the wall clock, the
//   « 3, 2, 1, top » count), jumping over the alarm sweep.
// Stage 4: both walk to the card at (0, 144).
window.CL = {
  timeout: 900,
  async run() {
    const W = D4;
    B.W = W;
    const me = Story.role;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const S = Input.sim;
    const log = [];
    const rel = () => W.rel(Player.body.p);
    const grounded = () => Player.body.grounded;
    const settle = () => B.until(() => grounded() && Player.mode === 'walk', 4000, 50);

    // ---- dame: grapple at a ring, wait to land ----
    const grapple = async (ringKey, okFn) => {
      for (let k = 0; k < 3 && !ab(); k++) {
        const rp = W.ringPos(ringKey);
        B.aim(rp);
        await B.sl(200);
        B.aim(rp);
        await B.tap('ability');
        const hooked = await B.until(() => Player.mode === 'grapple', 1200, 30);
        if (hooked) {
          await B.until(() => Player.mode !== 'grapple', 4000, 30);
          await settle();
          await B.sl(300);
        }
        if (okFn()) {
          B.note('reelle', 'grappin (F) vers l’anneau ' + ringKey + ' : posée en ' + B.rel());
          return true;
        }
      }
      return false;
    };

    // ---- a safe: tap E to the code, hold E to try ----
    const openSafe = async (s) => {
      const f = W.safes[s].front;
      const fr = W.rel(f);
      await B.walk([fr.x, fr.y, fr.z], 0.5, 8000);
      await B.sl(200);
      for (let tries = 0; tries < 4 && !X().open[s] && !ab(); tries++) {
        if (W.nearSafe(rel()) !== s) {
          B.note('reelle', 'pas devant le coffre ' + s + ' (' + B.rel() + ')');
          await B.walk([fr.x, fr.y, fr.z], 0.4, 4000);
        }
        let n = 0;
        while (X().dial[s] !== X().codes[s] && n++ < 12 && !ab()) {
          const v = X().dial[s];
          await B.tap('interact', 90);
          await B.until(() => X().dial[s] !== v, 1500, 40);
          await B.sl(80);
        }
        await B.hold('interact', 1000);
        await B.until(() => X().open[s], 2500, 50);
        if (!X().open[s]) await B.sl(4300); // a wrong code shuts the safe for 4 s
      }
      B.note('reelle', 'coffre ' + W.SYM[s] + ' : molette E jusqu’au code lu, E maintenu → ' + (X().open[s] ? 'ouvert' : 'fermé'));
      log.push(s + (X().open[s] ? '' : '!'));
      return !!X().open[s];
    };

    // ================= stage 1 =================
    if (X().stage === 1) {
      if (me === 'dame') {
        await B.go([-11.5, 0, 18], { near: 0.8, ms: 30000 });
        await openSafe('h');
        // the balcony: grapple from the floor below
        await B.go([-6.5, 0, 33], { near: 0.6, ms: 20000 });
        let up = await grapple('balcony', () => W.onBalcony(rel()));
        if (!up) {
          B.tp([-12, 5, 33], 'le grappin vers le balcon n’a pas accroché (anneau visé, F) après 3 essais');
          await B.sl(400);
        }
        await openSafe('d');
        B.face([13.6, 7.4, 22]);
      } else {
        await B.go([11.5, 0, 18], { near: 0.8, ms: 30000 });
        await openSafe('c');
        // the ledge: run up and double jump
        let up = false;
        for (let k = 0; k < 4 && !up && !ab(); k++) {
          await B.go([8.3, 0, 33], { near: 0.4, ms: 15000 });
          B.face([12.4, 0, 33]);
          await B.sl(150);
          await B.leap([12.3, 2.95, 33], { ms: 2500, run: 120 });
          await settle();
          up = W.onLedge(rel());
        }
        B.note('reelle', 'double saut vers la corniche ♠ : ' + (up ? 'réussi' : 'raté'));
        if (!up) B.tp([12.3, 2.95, 33], 'double saut vers la corniche (2,95 m) raté 4 fois');
        await B.sl(300);
        await openSafe('s');
        B.face([-13.6, 7.4, 22]);
      }
      await B.until(() => X().stage !== 1 || ab(), 180000, 200);
    }
    if (ab()) return log.join(' ');
    await B.sl(1200);

    // ================= stage 2 =================
    if (X().stage === 2) {
      // the stage change respawns whoever was in room 1 at (±2, 0, 47)
      await B.until(() => rel().z > 44, 4000, 100);
      if (me === 'dame') {
        await B.walk([-3, 0, 47], 0.5, 4000);
        let up = await grapple('catwalk', () => rel().y > 4.5 && rel().x < -6.2);
        if (!up) {
          B.tp([-7.6, 5, 50], 'le grappin vers la passerelle n’a pas accroché après 3 essais');
          await B.sl(400);
        }
        await B.walk([-7.6, 5, 72.6], 0.4, 12000);
        B.note('reelle', 'dame sur la passerelle, lit l’ordre et les lasers, au levier');
        let pulls = 0;
        while (X().stage === 2 && !ab() && pulls < 8) {
          await B.until(() => (X().kp || '').length >= 4 || X().stage !== 2 || ab(), 240000, 150);
          if (X().stage !== 2) break;
          await B.sl(500);
          if (!W.nearLever(rel())) await B.walk([-7.6, 5, 72.6], 0.4, 5000);
          await B.tap('interact');
          pulls++;
          B.note('reelle', 'dame tire le levier (E) sur le code ' + X().kp);
          await B.until(() => X().stage !== 2 || (X().kp || '').length < 4, 4000, 100);
        }
      } else {
        const ROWS = W.ROWS;
        const LANES = W.LANES;
        const L = () => W.L || {};
        let zaps = 0;
        let row = 0;
        await B.walk([0, 0, 48.6], 0.4, 6000);
        B.note('reelle', 'valet traverse les lasers, couloir ouvert dicté par la dame (écran de la passerelle)');
        const t0 = performance.now();
        while (row < ROWS.length && !ab() && performance.now() - t0 < 180000) {
          const z = ROWS[row];
          const st = L().step;
          const left = (1 - (L().frac || 0)) * 2.0;
          let lane = W.openLane(row, st);
          const lat = Math.abs(LANES[lane] - rel().x);
          let waitNext = left < lat / 7 + 0.7;
          if (waitNext) lane = W.openLane(row, st + 1);
          await B.walk([LANES[lane], 0, z - 1.25], 0.3, 3000, true);
          if (waitNext) await B.until(() => L().step !== st, 2500, 10);
          const s2 = L().step;
          if (W.openLane(row, s2) !== lane || (1 - (L().frac || 0)) * 2.0 < 0.35) continue;
          const zap0 = L().zap;
          await B.walk([LANES[lane], 0, z + 1.3], 0.3, 1500, true);
          if (rel().z < 49 || (L().zap > 0.9 && L().zap !== zap0)) {
            zaps++;
            row = 0;
            await B.sl(600);
            await B.walk([0, 0, 48.6], 0.4, 6000);
            continue;
          }
          row++;
        }
        B.note('reelle', 'lasers traversés (' + zaps + ' alarmes), au clavier');
        log.push('lasers ' + zaps + 'z');
        await B.walk([3.5, 0, 75.4], 0.4, 6000, true);
        await B.walk([7.2, 0, 76.6], 0.3, 4000);
        let rounds = 0;
        while (X().stage === 2 && !ab() && rounds < 6) {
          rounds++;
          const want = X().order.map((s) => X().digits[s]);
          if ((X().kp || '').length >= 4) {
            await B.until(() => (X().kp || '').length < 4 || X().stage !== 2, 6000, 100);
            if (X().stage !== 2) break;
          }
          B.note('reelle', 'valet tape ' + want.join('') + ' (chiffres des rouages, ordre dicté par la dame)');
          for (const n of want) {
            const k = W.keys[n - 1];
            await B.walk([7.2, 0, k.z], 0.15, 4000);
            await B.sl(120);
            const kp = X().kp;
            await B.tap('interact');
            await B.until(() => X().kp !== kp, 1500, 40);
          }
          await B.until(() => X().stage !== 2 || (X().kp || '').length < 4, 15000, 150);
        }
      }
      await B.until(() => X().stage !== 2 || ab(), 120000, 200);
    }
    if (ab()) return log.join(' ');
    await B.sl(800);

    // ================= stage 3 =================
    if (X().stage === 3) {
      await B.until(() => rel().z > 88, 4000, 100);
      const side = me === 'dame' ? 'L' : 'R';
      const sx = me === 'dame' ? -9.0 : 9.0;
      let stop = false;
      // jump over the alarm sweep (it runs from z 128 down to 93)
      const sweep = (async () => {
        let lastJ = 0;
        while (!stop && !ab()) {
          const L = W.L || {};
          const q = rel();
          if (L.sweepZ != null && grounded() && performance.now() - lastJ > 600) {
            const d = L.sweepZ - q.z;
            if (d > 0.7 && d < 1.9) {
              lastJ = performance.now();
              S.held.add('jump');
              await B.sl(70);
              S.held.delete('jump');
            }
          }
          await B.sl(15);
        }
      })();
      let presses = 0;
      let lastRing = -1;
      while (X().stage === 3 && !ab() && presses < 120) {
        const x = X();
        const i = [0, 1, 2].find((k) => x.ring[k] !== x.target[k]);
        if (i == null) {
          await B.sl(300);
          continue;
        }
        const cr = W.cranks.find((c) => c.ring === i && c.side === side);
        const far = Math.hypot(rel().x - sx, rel().z - cr.z);
        if (far > 3) await B.go([sx, 0, cr.z], { near: 0.5, ms: 20000 });
        if (Math.hypot(rel().x - sx, rel().z - cr.z) > 0.6) await B.walk([sx, 0, cr.z], 0.35, 6000);
        if (i !== lastRing) {
          lastRing = i;
          B.note('reelle', 'manivelle ' + ['I', 'II', 'III'][i] + ' côté ' + side + ', tournée ensemble au compte');
        }
        // the shared count: both press on the same 1.8 s beat
        const slot = 1800;
        const next = Math.ceil((Date.now() + 150) / slot) * slot;
        await B.sl(next - Date.now());
        if (X().stage !== 3) break;
        await B.until(() => grounded(), 800, 10);
        if (!W.nearCrank(rel())) continue;
        await B.tap('interact', 80);
        presses++;
        await B.sl(300);
      }
      stop = true;
      await sweep;
      log.push('manivelles ' + presses);
      await B.until(() => X().stage !== 3 || ab(), 60000, 200);
    }
    if (ab()) return log.join(' ');

    // ================= stage 4: the card =================
    await B.until(() => X().stage >= 4 || ab(), 30000, 200);
    await B.until(() => W.doorCol && !W.doorCol.on, 15000, 100);
    const s = me === 'dame' ? -1 : 1;
    await B.go([s * 2, 0, 128], { near: 0.8, ms: 30000 });
    await B.walk([s * 1.5, 0, 133], 0.5, 6000);
    await B.walk([s * 1.5, 0, 142.4], 0.4, 6000);
    B.note('reelle', me + ' à la carte');
    await B.until(() => Story.S.phase !== 'tr_d4' || ab(), 15000, 200);
    return me + ': ' + log.join(' ');
  },
};
