// tr_hV · Le Valet de Cœur (la serre, js/world/cour_h.js area V). Kits swapped. Two rounds of three
// roses: round 0 the dame kit cuts and the valet kit guides, round 1 the other way round (and the
// garden turns). The guide walks round the disc (outside it, along the hedges) and up the stairs
// to the belvédère, where the three marked bushes are shown on its screen (W.ST.marksOn); the
// cutter waits until the guide is up there, then chases each marked bush on the turning disc and
// presses E within reach (the level's update() sends {a:'cut', i} for the nearest bush). Then both
// meet by the card at (0, 8).
(() => {
  const W = CourH;
  B.W = W;
  const X = () => Story.S.x;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_hV';
  const ROUND_CUTTER = ['dame', 'valet'];
  const cutterOf = (x) => ROUND_CUTTER[Math.min(x.round, 1)];
  const side = () => (Story.role === 'dame' ? -1 : 1);
  const p = () => Player.body.p;

  // up to the belvédère: outside the disc (x ±9.4, between it and the hedges), then the stairs
  const toBelv = async () => {
    if (W.onBelv(p())) return true;
    const s = side();
    const q = W.rel(p());
    if (q.z < 26) {
      await B.walk([s * 9.4, 0, Math.max(q.z, 10)], 0.5, 12000);
      await B.walk([s * 9.4, 0, 25.6], 0.5, 12000);
    }
    await B.walk([s * 6.6, 0, 25.9], 0.4, 8000);
    await B.walk([s * 6.6, 4.2, 37.5], 0.5, 15000);
    await B.walk([s * 3, 4.2, 39], 0.6, 8000);
    Cam.yaw = Math.PI;
    Cam.pitch = 0.42;
    const ok = W.onBelv(p());
    B.note('reelle', 'au belvédère : ' + (ok ? 'oui' : 'non ' + B.rel()));
    return ok;
  };
  // down from the belvédère by the stairs on my side, to the foot of the disc
  const downBelv = async () => {
    if (!W.onBelv(p()) && W.rel(p()).y < 2) return;
    const s = side();
    await B.walk([s * 6.6, 4.2, 37.5], 0.5, 10000);
    await B.walk([s * 6.6, 0, 25.9], 0.5, 15000);
    B.note('reelle', 'descendu du belvédère');
  };
  // chase slot i of the turning garden, 0.9 m outward of the bush, and press E there
  const cutSlot = async (i, ms = 25000) => {
    const t0 = performance.now();
    while (live() && performance.now() - t0 < ms) {
      const sp = W.slotPos(i, W.dbgV.angNow());
      const b = p();
      const cx = W.O.x + W.GARDEN.x;
      const cz = W.O.z + W.GARDEN.z;
      const ox = sp.x - cx;
      const oz = sp.z - cz;
      const ol = Math.hypot(ox, oz) || 1;
      const tgt = V3(sp.x + (ox / ol) * 0.9, 0, sp.z + (oz / ol) * 0.9);
      if (Math.hypot(tgt.x - b.x, tgt.z - b.z) < 0.35) {
        B.stop();
        await B.sl(120);
        await B.tap('interact');
        return true;
      }
      Cam.yaw = Math.atan2(tgt.x - b.x, tgt.z - b.z);
      B.steer(tgt);
      await B.sl(30);
    }
    B.stop();
    return false;
  };

  const cutter = async () => {
    // the guide must be on the belvédère to see the hearts
    if (!W.onBelv(Remote.pos)) B.note('reelle', 'on attend que le guide soit au belvédère');
    await B.until(() => !live() || W.onBelv(Remote.pos) || cutterOf(X()) !== Story.role, 90000, 200);
    let cuts = 0;
    while (live() && X().stage === 0 && cutterOf(X()) === Story.role && !X().pause) {
      const D = W.dbgV.deal();
      const left = D.marks.filter((i) => !(X().cut & (1 << i)));
      if (!left.length) {
        await B.sl(300);
        continue;
      }
      // the nearest marked bush first
      const b = p();
      left.sort((a, c) => {
        const pa = W.slotPos(a, W.dbgV.angNow());
        const pc = W.slotPos(c, W.dbgV.angNow());
        return Math.hypot(pa.x - b.x, pa.z - b.z) - Math.hypot(pc.x - b.x, pc.z - b.z);
      });
      const i = left[0];
      const key0 = X().cut + '|' + X().roll + '|' + X().round + '|' + X().pause;
      await cutSlot(i);
      const changed = await B.until(() => !live() || X().cut + '|' + X().roll + '|' + X().round + '|' + X().pause !== key0, 2500, 50);
      if (!changed) {
        B.note('reelle', 'E au rosier ' + i + ' sans effet, on recommence');
        continue;
      }
      cuts++;
      B.note('reelle', 'manche ' + X().round + ' : rosier ' + i + ' coupé (marqué, vu par le guide au belvédère) — roll ' + X().roll);
    }
    return cuts;
  };

  window.CL = {
    timeout: 900,
    async run() {
      const me = Story.role;
      let cuts = 0;
      while (live() && X().stage === 0) {
        if (X().pause) {
          await B.sl(300);
          continue;
        }
        if (cutterOf(X()) === me) {
          await downBelv();
          cuts += await cutter();
        } else {
          await toBelv();
          await B.until(() => !live() || X().stage !== 0 || cutterOf(X()) === me, 600000, 300);
        }
      }
      if (!live()) return me + ': ' + cuts + ' roses';
      // ---- stage 1: the card at (0, 8), south of the disc ----
      await downBelv();
      const s = side();
      if (W.rel(p()).z > 12) {
        await B.walk([s * 9.4, 0, 25.6], 0.5, 12000);
        await B.walk([s * 9.4, 0, 10], 0.5, 15000);
      }
      await B.walk([s * 1, 0, 8], 0.5, 15000);
      B.note('reelle', 'près de la carte');
      await B.until(() => !live(), 60000, 200);
      return me + ': ' + cuts + ' roses';
    },
  };
})();
