// tr_hK · Le Roi de Cœur (le théâtre, js/world/cour_h.js area K). Kits as usual. Round 0 the
// valet kit throws from the rug, round 1 the dame kit (and the carousel turns). The guide goes up
// to the stage by the coulisses on its side (steps at x ±12.4, z 120-125) and watches the vases
// (drawn on its screen only). The thrower walks onto the rug, E to aim (the level freezes it),
// sets aim and strength with single stick taps (x: aim ±1°, z: strength ±1, read back from the
// HUD numbers), and E throws (the level's update() sends {a:'throw', ang, pow}). The aim is
// worked out from the vases' places the guide sees on the stage (vaseDeal/vasePos/carAng, what
// the guide would describe), never written into the level. When the carousel turns, the throw is
// timed so the vase comes under the landing point. Won: the curtain rises, then the film
// (Cut.play('cour_h')) which each page skips by holding E.
(() => {
  const W = CourH;
  B.W = W;
  const X = () => Story.S.x;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_hK';
  const K = () => W.dbgK;
  const throwerOf = (x) => K().throwerOf(x);
  const side = () => (Story.role === 'dame' ? -1 : 1);
  const p = () => Player.body.p;
  const S = Input.sim;
  const TAU2 = Math.PI * 2;

  const toStage = async () => {
    if (W.onStage(p())) return true;
    const s = side();
    await B.go([s * 12.4, 0, 118.5], { near: 0.5, ms: 40000 });
    await B.walk([s * 12.4, 1.2, 124.5], 0.5, 15000);
    await B.walk([s * 12.0, 1.2, 127], 0.5, 15000);
    await B.walk([s * 5, 1.2, 127.5], 0.6, 15000);
    Cam.yaw = 0;
    Cam.pitch = 0.38;
    const ok = W.onStage(p());
    B.note('reelle', 'sur la scène (par les coulisses) : ' + (ok ? 'oui' : 'non ' + B.rel()));
    return ok;
  };
  const offStage = async () => {
    if (!W.onStage(p())) return;
    const s = side();
    await B.walk([s * 12.0, 1.2, 127], 0.5, 15000);
    await B.walk([s * 12.4, 1.2, 124.5], 0.5, 15000);
    await B.walk([s * 12.4, 0, 119], 0.5, 15000);
    B.note('reelle', 'descendu de la scène');
  };
  const toRug = async () => {
    await B.go([0, 0, 109.6], { near: 0.35, ms: 40000 });
    Cam.yaw = 0;
    await B.sl(200);
    if (!K().local.aiming) await B.tap('interact');
    await B.until(() => K().local.aiming, 2000);
    B.note('reelle', 'sur le tapis, visée ouverte (E) : ' + (K().local.aiming ? 'oui' : 'non'));
    return K().local.aiming;
  };
  // single stick taps until the HUD numbers read (a, pw)
  const dial = async (a, pw) => {
    for (let k = 0; k < 140 && live(); k++) {
      const L = K().local;
      if (!L.aiming) return false;
      const da = a - L.ang;
      const dp = pw - L.pow;
      if (!da && !dp) return true;
      if (da) S.x = Math.sign(da);
      else S.z = Math.sign(dp);
      await B.sl(50);
      S.x = 0;
      S.z = 0;
      await B.sl(60);
    }
    return false;
  };
  // all the (aim, strength) pairs that clear the curtain and land on the stage
  let grid = null;
  const paths = () => {
    if (grid) return grid;
    grid = [];
    for (let a = -25; a <= 25; a++)
      for (let pw = 0; pw <= 40; pw++) {
        const path = W.throwPath(a, pw);
        if (path.blocked || path.land.z < W.CURTAIN_Z) continue;
        grid.push({ a, p: pw, t: path.t, x: path.land.x, z: path.land.z });
      }
    return grid;
  };
  // a static vase: the pair whose landing point is nearest the vase
  const solveStill = (i) => {
    const v = K().vaseDeal()[i];
    const q = K().vasePos(v, K().carAng());
    let best = null;
    for (const g of paths()) {
      const d = Math.hypot(g.x - q.x, g.z - q.z);
      if (!best || d < best.d) best = { a: g.a, p: g.p, t: g.t, d };
    }
    return best;
  };
  // a turning vase: a pair landing on its circle; then the moment to throw (seconds from now)
  const solveSpin = (i) => {
    const x = X();
    const spin = K().ROUNDS[Math.min(x.round, 1)].spin;
    const v = K().vaseDeal()[i];
    const C = W.CAROUSEL;
    const L = K().local;
    const ang0 = K().carAng();
    let best = null;
    for (const g of paths()) {
      const rr = Math.hypot(g.x - C.x, g.z - C.z);
      const dr = Math.abs(rr - v.r);
      if (dr > 0.35) continue;
      const phi = Math.atan2(g.x - C.x, g.z - C.z);
      // the dial time, then the throw: the vase must be at phi when the rose lands
      const dialT = (Math.abs(g.a - L.ang) + Math.abs(g.p - L.pow)) * 0.12 + 0.8;
      let need = (((phi - (v.a + ang0)) % TAU2) + TAU2) % TAU2; // carousel turn still needed (rad)
      let wait = need / spin - g.t;
      while (wait < dialT) wait += TAU2 / spin;
      const score = wait + dr * 4;
      if (!best || score < best.score) best = { a: g.a, p: g.p, t: g.t, d: dr, wait, score, at: performance.now() + wait * 1000 };
    }
    return best;
  };

  const thrower = async () => {
    await offStage();
    let throws = 0;
    const round = X().round;
    while (live() && X().stage === 0 && X().round === round && throwerOf(X()) === Story.role) {
      if (X().pause) {
        await B.sl(300);
        continue;
      }
      if (!W.onStage(Remote.pos)) {
        B.note('reelle', 'on attend le guide sur la scène');
        await B.until(() => !live() || W.onStage(Remote.pos), 120000, 200);
      }
      if (!K().local.aiming && !(await toRug())) {
        await B.sl(500);
        continue;
      }
      const x = X();
      const V = K().vaseDeal();
      const i = [0, 1].find((k) => k < V.length && !((x.full | 0) & (1 << k)));
      if (i == null) {
        await B.sl(300);
        continue;
      }
      const spin = K().ROUNDS[Math.min(x.round, 1)].spin;
      let sol = spin ? solveSpin(i) : solveStill(i);
      if (!sol) {
        B.note('reelle', 'pas de lancer possible vers le vase ' + i);
        await B.sl(1000);
        continue;
      }
      await dial(sol.a, sol.p);
      if (spin) {
        // re-time with the clock now (dialling took a while); wait for the vase
        sol = solveSpin(i);
        if (sol.a !== K().local.ang || sol.p !== K().local.pow) {
          await dial(sol.a, sol.p);
          sol = solveSpin(i);
        }
        await B.until(() => !live() || performance.now() >= sol.at, 40000, 10);
      }
      const used0 = X().used | 0;
      const key0 = X().full + '|' + X().roll + '|' + X().round;
      await B.tap('interact');
      throws++;
      const sent = await B.until(() => !live() || (X().used | 0) !== used0 || X().round !== round, 2000, 30);
      B.note('reelle', 'manche ' + round + ' : rose vers le vase ' + i + ' (visée ' + sol.a + '°, force ' + sol.p + ', écart prévu ' + sol.d.toFixed(2) + ' m, vase vu par le guide sur scène)' + (sent ? '' : ' — lancer non parti'));
      // the flight, then the host's verdict
      await B.until(() => !live() || X().full + '|' + X().roll + '|' + X().round !== key0, (sol.t + 0.9) * 1000, 50);
      await B.sl(400);
      if (live() && X().full + '|' + X().roll + '|' + X().round === key0) B.note('reelle', 'rose à côté (marque sur scène, annoncée par le guide)');
    }
    return throws;
  };

  window.CL = {
    timeout: 900,
    async run() {
      const me = Story.role;
      let throws = 0;
      while (live() && X().stage === 0) {
        if (X().pause) {
          await B.sl(300);
          continue;
        }
        if (throwerOf(X()) === me) throws += await thrower();
        else {
          // a thrower still aiming is set free by the level when the roles change
          await toStage();
          await B.until(() => !live() || X().stage !== 0 || throwerOf(X()) === me, 600000, 300);
        }
      }
      if (!live()) return me + ': ' + throws + ' roses';
      B.note('reelle', 'quatre vases remplis (' + throws + ' roses lancées par moi)');
      // the curtain rises (~11 s), then the film: hold E to skip it
      const film = await B.until(() => !live() || (typeof Cut !== 'undefined' && Cut.on), 40000, 100);
      if (live() && film && Cut.on) {
        await B.sl(1500);
        await B.hold('interact', 1600);
        B.note('reelle', 'cinématique cour_h passée (E maintenu)');
      }
      await B.until(() => !live(), 60000, 200);
      return me + ': ' + throws + ' roses';
    },
  };
})();
