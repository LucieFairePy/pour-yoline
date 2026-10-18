// tr_hD · La Dame de Cœur (la salle de bal, js/world/cour_h.js area D). Kits as usual. Two
// crossings: round 0 the dame kit carries the tower of coupes, round 1 the valet kit. The guide
// climbs the stairs at the south end of its side gallery (x ±12) and watches from (±12, 4.2, 74):
// the dancers are drawn only there. The carrier waits until the guide is on the gallery, takes the
// tower at the buffet (E: {a:'take'}), crosses the parquet at walking pace choosing each step by
// how far the couples will be over the next second, and puts it on the table (E: {a:'put'}).
// A spill (2nd brush) sends the tower back to the buffet: the carrier starts again.
// The couples' figures come from W.dbgD.couples() and the level's own dance clock
// (W.dbgD.local.rt) — what the guide sees from the gallery and calls out.
(() => {
  const W = CourH;
  B.W = W;
  const X = () => Story.S.x;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_hD';
  const carrierOf = (x) => W.dbgD.carrierOf(x);
  const side = () => (Story.role === 'dame' ? -1 : 1);
  const p = () => Player.body.p;
  const S = Input.sim;

  const toGallery = async () => {
    if (W.onGallery(p())) return true;
    const s = side();
    await B.go([s * 12, 0, 47.4], { near: 0.5, ms: 40000 });
    await B.walk([s * 12, 4.2, 60], 0.5, 15000);
    await B.walk([s * 12, 4.2, 74], 0.6, 15000);
    Cam.yaw = (-s * Math.PI) / 2;
    Cam.pitch = 0.5;
    const ok = W.onGallery(p());
    B.note('reelle', 'sur la galerie : ' + (ok ? 'oui' : 'non ' + B.rel()));
    return ok;
  };
  const downGallery = async () => {
    if (!W.onGallery(p()) && W.rel(p()).y < 2) return;
    const s = side();
    await B.walk([s * 12, 4.2, 59], 0.5, 15000);
    await B.walk([s * 12, 0, 47.4], 0.5, 15000);
    B.note('reelle', 'descendu de la galerie');
  };

  const danger = (x, z, dt) => {
    const cs = W.dbgD.couples();
    const t = W.dbgD.local.rt + dt;
    let m = 99;
    cs.forEach((c) => {
      const q = W.coupleAt(c, t);
      m = Math.min(m, Math.hypot(W.O.x + q.x - x, W.O.z + q.z - z));
    });
    return m;
  };
  // never a hop on the way: a take refused (the host still sees us short of the buffet) can be
  // accepted late, and a hop with the tower in hand is a strike
  const take = async () => {
    await B.go([0, 0, 52.4], { near: 0.35, ms: 40000, hop: false });
    Cam.yaw = 0;
    await B.sl(200);
    // the host judges the buffet from our position as it last received it: stand still, ask
    // again from the same spot rather than walking off
    for (let i = 0; i < 3 && live() && X().carry !== 1; i++) {
      await B.tap('interact');
      await B.until(() => !live() || X().carry === 1, 2500);
    }
    B.note('reelle', 'tour de coupes prise au buffet : ' + (X().carry === 1 ? 'oui' : 'non'));
    return X().carry === 1;
  };
  // the crossing, step by step (≈ the old botD.cross, careful mode)
  const cross = async (ms = 240000) => {
    if (p().z < W.O.z + 56.5) {
      await B.walk([3.6, 0, 52.6], 0.5, 8000);
      await B.walk([3.6, 0, 57], 0.5, 8000);
    }
    const t0 = performance.now();
    const goal = W.P(0, 0, 92.3);
    let lastStr = X().str | 0;
    while (live() && performance.now() - t0 < ms) {
      const x = X();
      if (x.carry !== 1) {
        B.stop();
        return false;
      }
      if ((x.str | 0) !== lastStr) {
        lastStr = x.str | 0;
        B.note('reelle', 'frôlé un couple (' + lastStr + ')');
      }
      const b = p();
      if (Math.hypot(goal.x - b.x, goal.z - b.z) < 0.5) {
        B.stop();
        await B.sl(200);
        Cam.yaw = 0;
        await B.tap('interact');
        await B.until(() => !live() || X().carry !== 1, 2500);
        return true;
      }
      let best = null;
      const opts = [[0, 1], [0.7, 0.7], [-0.7, 0.7], [1, 0], [-1, 0], [0, -1], [0, 0]];
      for (const [dx, dz] of opts) {
        const nx = b.x + dx * 1.2;
        const nz = b.z + dz * 1.2;
        if (Math.abs(nx - W.O.x) > 9.3) continue;
        let safe = 99;
        for (const dt of [0, 0.3, 0.6, 0.9, 1.2]) safe = Math.min(safe, danger(b.x + dx * 2.7 * Math.min(dt, 0.45), b.z + dz * 2.7 * Math.min(dt, 0.45), dt));
        const prog = -Math.hypot(goal.x - nx, goal.z - nz);
        const score = safe > 1.9 ? 100 + prog : safe;
        if (!best || score > best.score) best = { dx, dz, score };
      }
      if (!best || (best.dx === 0 && best.dz === 0)) B.stop();
      else {
        const tg = V3(b.x + best.dx * 3, 0, b.z + best.dz * 3);
        Cam.yaw = Math.atan2(tg.x - b.x, tg.z - b.z);
        B.steer(tg);
      }
      await B.sl(60);
    }
    B.stop();
    return false;
  };

  const carrier = async () => {
    await downGallery();
    let tries = 0;
    const round = X().round;
    while (live() && X().stage === 0 && X().round === round && carrierOf(X()) === Story.role && tries++ < 8) {
      if (!W.onGallery(Remote.pos)) B.note('reelle', 'on attend le guide sur la galerie');
      await B.until(() => !live() || W.onGallery(Remote.pos), 120000, 200);
      if (X().carry !== 1 && !(await take())) continue;
      B.note('reelle', 'traversée ' + round + ' (les couples vus depuis la galerie, annoncés par le guide)');
      const ok = await cross();
      if (!live()) break;
      if (ok && (X().round !== round || X().stage !== 0)) {
        B.note('reelle', 'tour posée sur la table (traversée ' + round + ')');
        break;
      }
      if (X().carry !== 1) B.note('reelle', 'tour renversée : retour au buffet (roll ' + X().roll + ')');
    }
  };

  window.CL = {
    timeout: 900,
    async run() {
      const me = Story.role;
      while (live() && X().stage === 0) {
        if (carrierOf(X()) === me) await carrier();
        else {
          await toGallery();
          await B.until(() => !live() || X().stage !== 0 || carrierOf(X()) === me, 600000, 300);
        }
      }
      if (!live()) return me + ': fin';
      // ---- stage 1: the card at (0, 62), south end of the parquet ----
      await downGallery();
      await B.go([side(), 0, 61], { near: 0.6, ms: 40000 });
      B.note('reelle', 'près de la carte');
      await B.until(() => !live(), 60000, 200);
      return me + ': deux traversées (rolls ' + (X() ? X().roll : '?') + ')';
    },
  };
  void S;
})();
