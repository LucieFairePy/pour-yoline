// tr_c10 · La Tour de Babel (♣ 10). Kits as usual: Yoline = dame, William = valet.
// Real keys only (Input.sim stick + E); the level's update() sends every action (lev0, bell,
// crank, check, plate — by standing on it —, lift).
// The answer of each floor = the reader's glyph (on their screen) translated with the other's
// lexicon (on the other screen) into a picture, found on the levers/bells/rings/plates (in the
// world): both halves are on the players' screens, so the solver takes the combined answer from
// the level's own puzzle (C10.dbg.puzzle(), the same function that draws both screens).
// Paths come from the bot that played this level when it was built (scratchpad fc/play.js).
window.CL = {
  timeout: 900,
  async run() {
    const W = C10;
    B.W = W;
    const X = () => Story.S.x;
    const me = Story.role;
    const log = [];
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_c10';
    const rel = () => W.rel(Player.body.p);
    const locked = () => W.dbg.local.lockT > 0;
    const pz = () => W.dbg.puzzle();
    const wait = (fn, ms = 60000, step = 150) => B.until(() => !live() || fn(), ms, step);
    // walk in level coordinates with the stick (slows down near the point, hops when stuck)
    const walkTo = async (x, y, z, tol = 0.45, tmax = 14000) => {
      const t0 = performance.now();
      let last = null;
      let stuck = 0;
      while (live() && performance.now() - t0 < tmax) {
        const q = rel();
        const dx = x - q.x;
        const dz = z - q.z;
        const d = Math.hypot(dx, dz);
        if (d < tol) break;
        Cam.yaw = Math.atan2(dx, dz);
        Input.sim.x = 0;
        Input.sim.z = d < 1.2 ? 0.5 : 1;
        if (last && Math.hypot(q.x - last.x, q.z - last.z) < 0.02) stuck++;
        else stuck = 0;
        if (stuck > 6) {
          await B.tap('jump', 80);
          stuck = 0;
        }
        last = q;
        await B.sl(50);
      }
      Input.sim.z = 0;
      Input.sim.x = 0;
      await B.sl(120);
      const q = rel();
      return Math.hypot(x - q.x, z - q.z) < tol + 0.3;
    };
    const path = async (pts, tol) => {
      for (const p of pts) {
        if (!live()) return false;
        if (!(await walkTo(p[0], p[1], p[2], tol))) {
          log.push('STUCK ' + JSON.stringify(p) + ' at ' + B.rel().join(','));
          return false;
        }
      }
      return true;
    };
    const pressE = () => B.tap('interact', 110);
    const said = {};
    const once = (k, how, text) => {
      if (said[k]) return;
      said[k] = 1;
      B.note(how, text);
    };

    // ---------- 0 · the gate (dame reads, valet pulls) ----------
    if (X().stage === 0) {
      if (me === 'dame') {
        await path([[0, 0, -18]]);
        Cam.yaw = 0;
        once('s0', 'reelle', 'devant la porte : décrit le signe (sa traduction = le levier que tire le valet)');
        await wait(() => X().stage > 0 || X().solved, 240000);
      } else {
        await path([[3, 0, -20]]);
        while (live() && X().stage === 0 && !X().solved) {
          if (locked()) {
            await B.sl(300);
            continue;
          }
          const t = pz().t;
          const p = W.rel(W.leverPos(t));
          await walkTo(p.x, 0, p.z + 0.2, 0.35);
          Cam.yaw = 0;
          const before = JSON.stringify([X().round, X().roll]);
          await pressE();
          once('s0', 'reelle', 'tire le levier de l’image traduite (signe décrit par la dame, lexique du valet)');
          await wait(() => JSON.stringify([X().round, X().roll]) !== before || X().solved, 3000);
          await B.sl(500);
        }
      }
      log.push('s0');
    }
    // up to the bells
    if (live() && X().stage <= 1 && !(X().stage === 1 && X().solved) && rel().y < 9) {
      await wait(() => X().solved || X().stage > 0, 60000);
      await path([[me === 'dame' ? -1 : 1, 0, -12], [0, 0, -4], [-8.7, 0, 4.5], [-8.7, 0, 8.7], [-7.6, 0, 8.7], [5.8, 10, 8.7], [7.6, 10, 8.4], [me === 'dame' ? 5 : 7, 10, 5]]);
    }

    // ---------- 1 · the bells (valet reads; bells 0-2 dame, 3-5 valet) ----------
    await wait(() => X().stage >= 1, 60000);
    while (live() && X().stage === 1 && !X().solved) {
      const x = X();
      if (locked()) {
        await B.sl(300);
        continue;
      }
      const b = pz().seq[x.rung | 0];
      const own = b < 3 ? 'dame' : 'valet';
      if (own !== me) {
        await B.sl(200);
        continue;
      }
      const p = W.rel(W.bellPos(b));
      await walkTo(p.x, 10, p.z, 0.4);
      const before = JSON.stringify([x.rung, x.round, x.roll, x.solved]);
      await pressE();
      once('s1', 'reelle', 'sonne ses cloches dans l’ordre lu par le valet, traduit par la dame');
      await wait(() => {
        const y = X();
        return JSON.stringify([y.rung, y.round, y.roll, y.solved]) !== before;
      }, 3000);
    }
    if (live() && X().stage === 1) {
      log.push('s1');
      await path([[8.7, 10, -4.5], [8.7, 10, -8.7], [7.4, 10, -8.7], [-5.8, 20, -8.7], [-7.4, 20, -8.4], [me === 'dame' ? -7 : -5.6, 20, -5.6]]);
    }

    // ---------- 2 · the rings (dame reads, turns the middle ring, validates; valet turns top and bottom) ----------
    await wait(() => X().stage >= 2, 60000);
    const mine = me === 'dame' ? [1] : [0, 2];
    while (live() && X().stage === 2 && !X().solved) {
      if (locked()) {
        await B.sl(300);
        continue;
      }
      const x = X();
      const want = pz().want;
      const i = mine.find((j) => x.rings[j] !== want[j]);
      if (i != null) {
        const c = W.rel(W.crankPos(i));
        await walkTo(c.x, 20, c.z - 0.8, 0.35);
        const before = x.rings[i];
        await pressE();
        once('s2c', 'reelle', 'tourne sa manivelle jusqu’à l’image traduite face au repère');
        await wait(() => X().rings[i] !== before, 2000);
        continue;
      }
      if (me === 'dame' && [0, 1, 2].every((j) => x.rings[j] === want[j])) {
        const c = W.rel(W.checkPos());
        await walkTo(c.x + 0.8, 20, c.z, 0.35);
        const before = JSON.stringify([x.round, x.solved, x.roll]);
        await pressE();
        B.note('reelle', 'levier de validation des anneaux');
        await wait(() => {
          const y = X();
          return JSON.stringify([y.round, y.solved, y.roll]) !== before;
        }, 3000);
        continue;
      }
      await B.sl(250);
    }
    if (live() && X().stage === 2) {
      log.push('s2');
      await path([[6.6, 20, -6.1], [8.7, 20, -6.1], [8.7, 20, -4.8], [8.7, 30, 7.9], [6.6, 30, 7.9], [me === 'dame' ? -2 : 1.5, 30, 2]]);
    }

    // ---------- 3 · the terrace (each reads their own line, the other translates; stop on the plates in order) ----------
    await wait(() => X().stage >= 3, 60000);
    if (live() && X().stage === 3) {
      const C = W.PLATES[me];
      const doneMe = () => (me === 'dame' ? X().bd : X().bv);
      while (live() && X().stage === 3 && !doneMe()) {
        if (locked()) {
          await B.sl(300);
          continue;
        }
        const x = X();
        const n = (me === 'dame' ? x.pd : x.pv) | 0;
        const i = pz().seq[me][n];
        // by the middle of the ring (never over another plate), then a stop on the plate
        await walkTo(C.x, 30, C.z, 0.35);
        const p = W.rel(W.platePos(me, i));
        await walkTo(p.x, 30, p.z, 0.3);
        once('s3', 'reelle', 's’arrête sur ses dalles dans l’ordre (inscription décrite, traduite par l’autre)');
        await wait(() => {
          const y = X();
          return ((me === 'dame' ? y.pd : y.pv) | 0) !== n || y.rollD !== x.rollD || y.rollV !== x.rollV || doneMe();
        }, 4000);
      }
      await wait(() => X().bd && X().bv, 240000);
      await B.sl(2500);
      const bx = me === 'dame' ? -4 : 4;
      await path([[bx, 30, 8.5], [bx, 30, 18.5], [me === 'dame' ? -1 : 1, 30, 24]]);
      B.note('reelle', 'pont-levis traversé, dans la cage');
      log.push('s3');
    }

    // ---------- 4 · the lift (levers 0-3 valet, 4-7 dame) ----------
    await wait(() => X().stage >= 4, 60000);
    while (live() && X().stage === 4) {
      const x = X();
      if (!x.waveOn || locked()) {
        await B.sl(250);
        continue;
      }
      const p = pz();
      if (!p || !p.wave) {
        await B.sl(250);
        continue;
      }
      const k = p.wave.r.findIndex((rr, j) => !(x.got & (1 << j)) && (p.t[rr] < 4 ? 'valet' : 'dame') === me);
      if (k < 0) {
        await B.sl(250);
        continue;
      }
      const L = p.t[p.wave.r[k]];
      const lp = W.rel(W.liftLeverPos(L));
      const a = (L / 8) * Math.PI * 2;
      await walkTo(lp.x - Math.sin(a) * 0.55, lp.y, lp.z - Math.cos(a) * 0.55, 0.3);
      const before = JSON.stringify([x.got, x.wave, x.roll]);
      await pressE();
      once('s4', 'reelle', 'tire le levier traduit avant l’éclair, palier après palier');
      await wait(() => {
        const y = X();
        return JSON.stringify([y.got, y.wave, y.roll]) !== before;
      }, 2500);
    }
    if (live()) log.push('s4');

    // ---------- 5 · the crown ----------
    await wait(() => X().stage === 5, 30000);
    if (live()) {
      await B.sl(3000);
      await path([[me === 'dame' ? -0.6 : 0.6, 72, 24.5]]);
      B.note('reelle', 'sur la couronne, à la carte');
      await wait(() => false, 20000);
    }
    return me + ': ' + log.join(', ') + ' → ' + (Story.S && Story.S.phase);
  },
};
