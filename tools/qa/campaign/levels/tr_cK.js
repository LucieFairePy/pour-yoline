// tr_cK · Le Roi de Trèfle: the balance disc. Stage 0: both walk round the ring floor to their
// bridge (dame west, valet east) and onto the disc. Stage 1: four pairs of clovers; each one stands
// on their own clover, moving at a speed matched to the partner's so the disc stays level. Each page
// sees only the PARTNER's clover; the player's own is shown on the partner's screen and called aloud:
// the bot reads it from the level's pairPos (shown on the other screen, allowed by the brief).
// While the Roi walks onto the disc (pair 2 on), both first stand south of the centre against his
// weight. Stage 2/3: the win and the film of the table (Cut.play('cour_c')), skipped by holding E.
window.CL = {
  timeout: 900,
  async run() {
    const W = CourC;
    B.W = W;
    const S = Input.sim;
    const L = W.dbgK.local;
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_cK';
    const me = Story.role;
    const mate = me === 'dame' ? 'valet' : 'dame';
    const C = W.C;
    const s = me === 'dame' ? -1 : 1;
    const Crel = (x, z) => [C.x + x, 0, C.z + z];
    // ---- stage 0: round the ring (radius ~13.6, the floor is 10.35..17.6) to my bridge ----
    if (X().stage === 0) {
      const q0 = W.rel(Player.body.p);
      const a0 = Math.atan2(q0.x - C.x, q0.z - C.z);
      const a1 = (s * Math.PI) / 2;
      // from the entrance gap (south) to the west / east bridge
      const a00 = Math.abs(a0) > 2.6 ? s * Math.PI : a0;
      for (let k = 1; k <= 5; k++) {
        const a = a00 + ((a1 - a00) * k) / 5;
        await B.walk(Crel(Math.sin(a) * 13.6, Math.cos(a) * 13.6), 0.6, 10000, true);
        if (!live()) return me + ': interrompu';
      }
      await B.walk(Crel(s * 11.5, 0), 0.4, 6000);
      await B.walk(Crel(s * 8.6, 0), 0.4, 6000);
      await B.walk(Crel(s * 2.5, 0), 0.4, 8000);
      B.stop();
      B.note('reelle', 'sur le disque par le pont ' + (s < 0 ? 'ouest' : 'est') + ' ' + JSON.stringify(B.rel()));
      await B.until(() => !live() || X().stage !== 0, 60000, 100);
    }
    // ---- stage 1: the pairs ----
    const walkTo = (tx, tz, k) => {
      const p = Player.body.p;
      const dx = tx - p.x;
      const dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) {
        S.x = 0;
        S.z = 0;
        return d;
      }
      Cam.yaw = Math.atan2(dx, dz);
      S.x = 0;
      S.z = Math.min(1, d * 1.2) * k;
      return d;
    };
    let lastKey = '';
    let roiNoted = false;
    let srcNoted = false;
    while (live() && X().stage === 1) {
      const x = X();
      const key = x.pair + '|' + x.roll;
      if (key !== lastKey) {
        lastKey = key;
        B.note('reelle', 'paire ' + (x.pair + 1) + ' / 4' + (x.roll ? ' (déplacée, roll ' + x.roll + ')' : '') + (x.tip ? ', bascules ' + x.tip : ''));
      }
      if (!srcNoted) {
        srcNoted = true;
        B.note('reelle', 'mon trèfle est celui que voit ' + mate + ' (W.ST.targets sur son écran) : lu dans pairPos, comme s’il me guidait à la voix');
      }
      // fell off (tip): the respawn puts me back on the disc; nothing special
      const rw = W.dbgK.roiWeight();
      const settling = x.roi && L.roiT < 3 + 8.5 + 0.3;
      let tx;
      let tz;
      let k = 1;
      if (settling) {
        if (!roiNoted) {
          roiNoted = true;
          B.note('reelle', 'le Roi monte : les deux au sud contre son poids');
        }
        const R = rw ? W.rel(V3(rw.x, 0, rw.z)) : null;
        const rz = R ? (R.z - C.z) * rw.w : 0;
        const rx = R ? (R.x - C.x) * rw.w : 0;
        const zz = clamp(-rz / 2, -5.5, 0);
        const xx = -rx / 2;
        const q = W.P(C.x + xx + (me === 'dame' ? -1.2 : 1.2), 0, C.z + (x.roi && L.roiT > 3 ? zz : -2.5));
        tx = q.x;
        tz = q.z;
      } else {
        const tg = W.dbgK.pairPos();
        const q = W.P(C.x + tg[me].x, 0, C.z + tg[me].z);
        const qm = W.P(C.x + tg[mate].x, 0, C.z + tg[mate].z);
        // mirror the partner: the one with less way to go walks slower
        const dm = Math.hypot(qm.x - Remote.pos.x, qm.z - Remote.pos.z);
        const dd = Math.hypot(q.x - Player.body.p.x, q.z - Player.body.p.z);
        k = dd > 0.3 ? clamp(dd / Math.max(dd, dm, 0.01), 0.3, 1) : 1;
        tx = q.x;
        tz = q.z;
      }
      walkTo(tx, tz, k);
      await B.sl(30);
    }
    S.x = 0;
    S.z = 0;
    if (!live()) return me + ': ' + (Story.S ? Story.S.phase : '?') + ' ' + JSON.stringify(X());
    B.note('reelle', 'quatre paires : le Roi s’incline');
    // ---- stage 2 → 3: the film of the table; skip it by holding E (> 1.2 s) ----
    let skipped = false;
    while (live()) {
      if (X().stage === 3 && typeof Cut !== 'undefined' && Cut.on) {
        await B.hold('interact', 1600);
        if (!skipped) B.note('reelle', 'cinématique de la table passée (E maintenu 1,6 s)');
        skipped = true;
        await B.sl(400);
        continue;
      }
      await B.sl(200);
    }
    return me + ': 4 paires, film ' + (skipped ? 'passé' : 'non vu') + ', phase ' + (Story.S && Story.S.phase);
  },
};
