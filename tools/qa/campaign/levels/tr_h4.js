// tr_h4 « La Lanterne » — campaign solver (both pages). Not a swap level: dame = grapple, valet = sword.
// Stages (js/levels/tr_h4.js host()):
//  1 moon stones   the dame takes the lantern on p0, both hop the 7 'carry' stones together (the
//                  partner always one stone behind at most: the stones only exist in the lantern's glow)
//  2 the gap       dame grapples ring a (F), lands on a2, hangs the lantern on pA (E); the valet walks
//                  the bridge of light
//  3 the cliff     valet takes it from pA, double-jumps the cliff, hangs it on pB; the dame walks the
//                  light stair, takes it back; both walk down to the ravine (s2)
//  4 tower one     dame grapples ring t1, hangs it on t1; the valet walks the ring of stones to lever
//                  l1 (E); the lantern flies to him; the dame walks the blind stair b1 down to s2b
//  5 tower two     valet climbs the ledges (double jumps), hangs it on t2; the dame walks the ring to
//                  lever l2; the valet walks the blind stair b2 down to s2c
//  6 Great Shadow  dame (bearer) stands by each brazier, the valet holds E beside her until lit (x4)
//  7 card          both walk to the centre of the clearing
window.CL = (() => {
  const S = Input.sim;
  const W = H4;
  B.W = W;
  const me = () => Story.role;
  const X = () => Story.S.x || {};
  const st = () => X().stage;
  const L = () => X().lan || {};
  const alive = () => !window.CL.abort && Story.S.phase === 'tr_h4';
  const q = () => W.rel(Player.body.p);
  const qm = () => (Remote.has ? W.rel(Remote.pos) : V3(0, -99, 0));
  const A = (x, z, y = 0) => [x, y, z];
  const wait = (fn, ms = 20000) => B.until(() => !alive() || fn(), ms);
  const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  const fell = () => q().y < -1.5;

  // press E (the level's update() turns it into take / place / lever) until `ok` holds
  const pressUntil = async (ok, what, n = 6) => {
    for (let k = 0; k < n && alive() && !ok(); k++) {
      await B.tap('interact');
      await wait(ok, 900);
    }
    const r = ok();
    B.note('reelle', what + (r ? ' ok' : ' ÉCHEC'));
    return r;
  };

  // straight-up double jump onto a ledge `topY` high (level y), then step onto it toward `to`.
  // With something overhead (a floating ledge, the tower platform) the push only starts once the
  // feet are above the ledge's top.
  const climb = async (to, topY, pushEarly = false) => {
    const b = Player.body;
    const T = B.abs(to);
    B.face(T);
    B.stop();
    S.held.add('jump');
    await B.sl(60);
    S.held.delete('jump');
    const t0 = performance.now();
    await B.sl(80);
    await B.until(() => b.v.y <= 0.3, 700, 8);
    S.held.add('jump');
    await B.sl(50);
    S.held.delete('jump');
    const t1 = performance.now();
    while (performance.now() - t1 < 1500 && alive()) {
      const clear = b.p.y - W.O.y > topY + 0.02;
      Cam.yaw = Math.atan2(T.x - b.p.x, T.z - b.p.z);
      if (clear || pushEarly) B.steer(T);
      else B.stop();
      if (b.grounded && performance.now() - t1 > 150) break;
      await B.sl(8);
    }
    B.stop();
    await B.sl(250);
    return q().y > topY - 0.2;
  };

  // creep (slow stick) onto an exact spot: the take-off of a climb must not slide under a ledge
  const inch = async (to, ms = 3000) => {
    const T = B.abs(to);
    const t = performance.now();
    while (performance.now() - t < ms && alive()) {
      const b = Player.body.p;
      const d = Math.hypot(T.x - b.x, T.z - b.z);
      if (d < 0.08) break;
      Cam.yaw = Math.atan2(T.x - b.x, T.z - b.z);
      B.steer(T);
      const k = Math.min(1, 0.15 + d * 0.5);
      S.x *= k;
      S.z *= k;
      await B.sl(16);
    }
    B.stop();
    await B.sl(250);
  };

  // grapple (F) to a ring, then steer the landing hop toward its landing spot
  const grapple = async (ring) => {
    const t = performance.now();
    while (performance.now() - t < 2500 && Player.lockTarget < 0 && alive()) {
      B.aim(ring.pos);
      await B.sl(60);
    }
    if (Player.lockTarget < 0) {
      B.note('reelle', 'grappin : anneau non verrouillé');
      return false;
    }
    await B.tap('ability');
    await B.until(() => Player.mode === 'grapple', 600, 10);
    await B.until(() => Player.mode !== 'grapple', 4000, 10);
    const t1 = performance.now();
    while (performance.now() - t1 < 3000 && alive()) {
      if (Player.body.grounded && performance.now() - t1 > 120) break;
      B.steer(ring.land);
      await B.sl(16);
    }
    B.stop();
    Cam.pitch = 0.15;
    await B.sl(300);
    return true;
  };

  // walk a list of [x,z,(y)] points (level coordinates)
  const path = async (pts, near = 0.5, sprint = true) => {
    for (const p of pts) {
      if (!alive()) return false;
      if (!(await B.walk(A(p[0], p[1], p[2] || 0), near, 9000, sprint))) return false;
    }
    return true;
  };

  // ---------------- stage 1 · the moon stones ----------------
  const S1 = [
    [0, 8.0],
    [0, 12.5],
    [2.4, 16.6],
    [4, 20.8],
    [3, 25],
    [0.2, 29],
    [-2.8, 33],
    [-4, 37.2],
    [-3, 42.5],
  ];
  const idx1 = (p) => {
    if (p.y < -0.6) return -9;
    if (p.z < 9.2 && p.y > -0.5) return 0;
    if (W.at('l1', p)) return 8;
    for (let i = 1; i <= 7; i++) if (Math.abs(p.x - S1[i][0]) < 1.5 && Math.abs(p.z - S1[i][1]) < 1.5) return i;
    return -1;
  };
  const stage1 = async () => {
    const r = me();
    const off = r === 'dame' ? -0.45 : 0.45;
    if (r === 'dame') {
      if (L().who !== 'dame' && L().post === 'p0') {
        await B.walk(A(-0.6, 3.6), 0.3, 8000);
        await pressUntil(() => L().who === 'dame', 'E au socle p0 : prendre la lanterne');
      }
    } else {
      await B.walk(A(1.2, 3.0), 0.4, 6000);
      await wait(() => L().who === 'dame' || st() !== 1, 30000);
    }
    let lastNote = -2;
    while (alive() && st() === 1) {
      const mi = idx1(q());
      const pi = idx1(qm());
      if (mi !== lastNote && mi >= 0) {
        lastNote = mi;
        if (mi === 8) B.note('reelle', 'pierres de lune traversées (sauts)');
      }
      if (r === 'dame' && mi === 8 && pi >= 0 && pi < 7 && L().who === 'dame') {
        // the partner is back at the start: come back to the stones so theirs light up
        await B.leap(A(S1[7][0] + off, S1[7][1]), { run: 100 });
        continue;
      }
      if (mi === 8 || mi < 0) {
        if (mi === 8) await B.walk(A(-2 + off * 3, 43.5), 0.5, 3000);
        await B.sl(200);
        continue;
      }
      if (r === 'dame') {
        if (L().who !== 'dame') {
          await B.sl(300);
          continue;
        }
        if (pi >= 0 && pi < mi - 1) {
          // the partner fell behind: come back so their stone lights up again
          await B.leap(A(S1[mi - 1][0] + off, S1[mi - 1][1]), { run: 100 });
        } else if (pi >= mi) {
          if (mi === 0) await B.go(A(S1[0][0] + off, S1[0][1]), { near: 0.3, ms: 8000, pad: 6 }); // round the lantern post
          await B.leap(A(S1[mi + 1][0] + off, S1[mi + 1][1]), { run: 120 });
          await B.sl(250);
        } else await B.sl(150);
      } else {
        if (pi === mi + 1) {
          await B.sl(350); // let the stone light up under the lantern
          if (mi === 0) await B.go(A(S1[0][0] + off, S1[0][1]), { near: 0.3, ms: 8000, pad: 6 }); // round the lantern post
          await B.leap(A(S1[mi + 1][0] + off, S1[mi + 1][1]), { run: 120 });
          await B.sl(250);
        } else await B.sl(150);
      }
    }
  };

  // ---------------- stage 2 · the gap ----------------
  const stage2 = async () => {
    if (me() === 'dame') {
      for (let k = 0; k < 5 && alive() && st() === 2 && L().post !== 'pA'; k++) {
        if (!W.at('a2', q())) {
          await B.go(A(-2, 47.2), { near: 0.4, ms: 15000 });
          if (L().who !== 'dame') {
            B.note('reelle', 'la dame n’a pas la lanterne au gouffre');
            await B.sl(1000);
            continue;
          }
          B.note('reelle', 'grappin sur l’anneau du gouffre (F)');
          await grapple(W.rings.a);
          if (!W.at('a2', q())) {
            await B.sl(1500);
            continue;
          }
        }
        await B.walk(A(-2, 60.6), 0.3, 6000);
        await pressUntil(() => L().post === 'pA', 'E : lanterne posée sur le crochet pA');
      }
      await B.walk(A(-4, 62.5), 0.5, 5000);
      await wait(() => st() !== 2, 60000);
    } else {
      // close to the lantern while she aims, then far enough from the stone wraith
      await B.go(A(0.6, 47.3), { near: 0.4, ms: 15000 });
      await wait(() => L().post === 'pA' || st() !== 2, 90000);
      for (let k = 0; k < 5 && alive() && st() === 2; k++) {
        await B.sl(500);
        await B.go(A(-2, 47.4), { near: 0.3, ms: 15000 });
        // the bridge's slabs start 1.2 m past the island's edge and stop 1.2 m before the far
        // one: walking straight drops into the gaps (the step-up needs ground), so hop both
        await B.leap(A(-2, 50.6), { dj: false, ms: 1500 });
        await B.walk(A(-2, 56.2), 0.4, 5000);
        await B.leap(A(-2, 59.6), { dj: false, ms: 1500 });
        await B.walk(A(-1.3, 61.5), 0.5, 6000, true);
        await B.sl(600);
        if (W.at('a2', q())) {
          B.note('reelle', 'pont de lumière traversé');
          break;
        }
        await B.sl(1500); // fell: respawned on l1
      }
      await wait(() => st() !== 2, 30000);
    }
  };

  // ---------------- stage 3 · the cliff ----------------
  const onCliff = () => q().y > 2.5 && q().z > 65.8 && q().z < 76.2;
  const stage3 = async () => {
    if (me() === 'valet') {
      for (let k = 0; k < 6 && alive() && st() === 3 && L().post !== 'pB' && L().who !== 'dame'; k++) {
        if (L().who !== 'valet') {
          if (L().post === 'pA') {
            await B.go(A(-1, 60.4), { near: 0.3, ms: 10000 });
            await pressUntil(() => L().who === 'valet', 'E : lanterne reprise sur pA');
          } else {
            await B.sl(500);
            continue;
          }
        }
        if (!onCliff()) {
          if (q().y < 1) await B.go(A(-2, 64.5), { near: 0.3, ms: 10000 });
          await B.walk(A(-2, 67), 0.05, 900); // against the cliff face
          B.note('reelle', 'falaise : double saut');
          await climb(A(-2, 67.6, 2.95), 2.95, true);
          if (!onCliff()) continue;
        }
        await B.walk(A(0.4, 67.2), 0.25, 6000);
        await pressUntil(() => L().post === 'pB', 'E : lanterne posée sur le crochet pB');
      }
      await B.walk(A(-1, 70), 0.5, 5000);
      await wait(() => L().who === 'dame' || st() !== 3, 120000);
    } else {
      await B.go(A(5.5, 58.4), { near: 0.3, ms: 15000 });
      await wait(() => L().post === 'pB' || st() !== 3, 120000);
      for (let k = 0; k < 5 && alive() && st() === 3 && L().who !== 'dame'; k++) {
        await B.sl(600);
        if (!onCliff()) {
          if (q().y < 0.3) await B.go(A(5.5, 58.4), { near: 0.3, ms: 15000 });
          B.note('reelle', 'escalier de lumière');
          await path([[5.5, 60], [5.5, 63], [5.5, 66.2], [3.4, 66.8]], 0.3, false);
        }
        if (!onCliff()) continue;
        await B.walk(A(2.6, 67.2), 0.25, 4000);
        await wait(() => onCliffR(qm()), 15000);
        await pressUntil(() => L().who === 'dame', 'E : lanterne reprise sur pB');
      }
    }
    // down to the ravine together (the dame carries the light)
    await wait(() => L().who === 'dame' || st() !== 3, 30000);
    const dx = me() === 'dame' ? -2.8 : -1.2;
    await path([[dx, 75.4, 2.95], [dx, 77], [dx, 80], [dx, 83.6], [me() === 'dame' ? -2 : 2, 89]], 0.5, false);
    B.note('reelle', 'descente au ravin');
    await wait(() => st() !== 3, 30000);
  };
  const onCliffR = (p) => p.y > 2.5 && p.z > 65.8 && p.z < 76.2;

  // the invisible stair (positions: the chalk marks the guide sees)
  const blindDown = async (key, done) => {
    const steps = W.blind[key];
    for (let k = 0; k < 4 && alive() && !done(); k++) {
      for (const s of steps) {
        if (!alive()) return;
        await B.walk(s.pos, 0.35, 4000, false);
        await B.until(() => Player.body.grounded, 800, 16);
        await B.sl(120);
        if (q().y < 0.6 && !done()) break;
      }
      await B.sl(800);
      if (done()) break;
      // sent back to the top (fell or jumped off): try again from there
    }
  };

  // ---------------- stage 4 · tower one ----------------
  const stage4 = async () => {
    if (me() === 'dame') {
      for (let k = 0; k < 5 && alive() && st() === 4 && L().post !== 't1' && !X().blind1; k++) {
        if (!W.onTop1(q())) {
          if (L().who !== 'dame') {
            await B.sl(800);
            continue;
          }
          await B.go(A(0, 95.3), { near: 0.3, ms: 15000 });
          B.note('reelle', 'grappin sur l’anneau de la tour (F)');
          await grapple(W.rings.t1);
          if (!W.onTop1(q())) {
            await B.sl(1500);
            continue;
          }
        }
        await B.walk(A(1.0, 107.2, 7.3), 0.25, 4000);
        await pressUntil(() => L().post === 't1', 'E : lanterne posée en haut de la tour');
      }
      await B.walk(A(-0.5, 109.4, 7.3), 0.4, 3000);
      await wait(() => X().blind1 || st() !== 4, 180000);
      B.note('reelle', 'escalier invisible b1 (marches à la craie vues par le valet)');
      await blindDown('b1', () => X().down1 || st() !== 4);
      await B.walk(A(-1.5, 123), 0.5, 6000);
      await wait(() => st() !== 4, 30000);
    } else {
      await wait(() => L().post === 't1' || st() !== 4, 180000);
      await B.sl(800);
      const ring = W.slabs.filter((s) => s.sec === 4);
      for (let k = 0; k < 5 && alive() && st() === 4 && !X().blind1; k++) {
        if (q().z < 97) {
          await B.go(A(0, 95.4), { near: 0.3, ms: 15000 });
          await B.leap(A(0, 99.2), { run: 150 });
          await B.sl(300);
          if (fell() || q().z < 97) {
            await B.sl(1800);
            continue;
          }
        }
        B.note('reelle', 'tour des pierres de lumière');
        // from the nearest stone onward
        const cur = q();
        let i0 = 0;
        ring.forEach((s, i) => {
          if (dist2(W.rel(s.pos), cur.x, cur.z) < dist2(W.rel(ring[i0].pos), cur.x, cur.z)) i0 = i;
        });
        let ok = true;
        for (let i = i0; i < ring.length && ok; i++) ok = await B.walk(ring[i].pos, 0.6, 5000, false);
        if (!ok || fell()) {
          await B.sl(1800);
          continue;
        }
        await path([[0, 119.1], [2, 122], [4, 124.9]], 0.3, false);
        await pressUntil(() => X().blind1, 'E : levier l1');
      }
      // light the bottom of the stair for her
      await B.walk(A(-1.2, 122.6), 0.4, 5000);
      await wait(() => st() !== 4, 180000);
    }
  };

  // ---------------- stage 5 · tower two ----------------
  const onTop2 = () => W.onTop2(q());
  const stage5 = async () => {
    if (me() === 'valet') {
      for (let k = 0; k < 8 && alive() && st() === 5 && L().post !== 't2' && !X().blind2; k++) {
        if (L().who !== 'valet') {
          await B.sl(800);
          continue;
        }
        if (!onTop2()) {
          const y = q().y;
          if (y < 2.5) {
            await B.go(A(-2.25, 130), { near: 0.4, ms: 15000 });
            await path([[-2.25, 134.5], [-3.9, 137.4]], 0.3, false);
            await inch(A(-3.9, 138.5));
            B.note('reelle', 'tour 2 : corniche 1 (double saut)');
            if (!(await climb(A(-3.9, 140, 2.95), 2.95))) continue;
          }
          if (q().y > 2.5 && q().y < 5.5) {
            await inch(A(-3.9, 140.9, 2.95));
            B.note('reelle', 'tour 2 : corniche 2 (double saut)');
            if (!(await climb(A(-3.9, 142.4, 5.9), 5.9))) continue;
          }
          if (q().y > 5.5 && !onTop2()) {
            await inch(A(-3.15, 142.4, 5.9));
            B.note('reelle', 'tour 2 : plate-forme (double saut)');
            await climb(A(-1.4, 142.4, 8.85), 8.85);
          }
          if (!onTop2()) {
            await B.sl(1500);
            continue;
          }
        }
        await B.walk(A(1.0, 140.2, 8.85), 0.25, 4000, false);
        await pressUntil(() => L().post === 't2', 'E : lanterne posée en haut de la tour 2');
      }
      await B.walk(A(-0.5, 142.5, 8.85), 0.4, 3000, false);
      await wait(() => X().blind2 || st() !== 5, 180000);
      B.note('reelle', 'escalier invisible b2 (marches à la craie vues par la dame)');
      await blindDown('b2', () => X().down2 || st() !== 5);
      await B.walk(A(1.2, 157), 0.5, 6000);
      await wait(() => st() !== 5, 30000);
    } else {
      // wait in the lilies' glow by lever l1 (the wraith of the causeway hunts the dark)
      await B.go(A(3.0, 125.2), { near: 0.4, ms: 10000 });
      await wait(() => L().post === 't2' || st() !== 5, 180000);
      await B.sl(800);
      const ring = W.slabs.filter((s) => s.sec === 5);
      for (let k = 0; k < 5 && alive() && st() === 5 && !X().blind2; k++) {
        if (q().z < 152.5) {
          if (q().z < 131) await B.go(A(-2.25, 129.5), { near: 0.4, ms: 15000 });
          B.note('reelle', 'tour des pierres de lumière (tour 2)');
          const cur = q();
          let i0 = 0;
          ring.forEach((s, i) => {
            if (dist2(W.rel(s.pos), cur.x, cur.z) < dist2(W.rel(ring[i0].pos), cur.x, cur.z)) i0 = i;
          });
          if (i0 === 0) await B.walk(A(-2.25, 132), 0.3, 4000, false);
          let ok = true;
          for (let i = i0; i < ring.length && ok; i++) ok = await B.walk(ring[i].pos, 0.6, 5000, false);
          if (!ok || fell()) {
            await B.sl(1800);
            continue;
          }
          await B.walk(A(0, 152.1), 0.4, 3000, false);
        }
        await path([[-2, 155.5], [-4, 157.2]], 0.3, false);
        await pressUntil(() => X().blind2, 'E : levier l2');
      }
      await B.walk(A(-0.8, 156.2), 0.4, 5000);
      await wait(() => st() !== 5, 180000);
    }
  };

  // ---------------- stage 6 · the Great Shadow ----------------
  const stage6 = async () => {
    const r = me();
    const sd = r === 'dame' ? -1 : 1;
    await B.go(A(sd, 161), { near: 0.5, ms: 15000 });
    await path([[sd * 0.8, 170], [sd * 1.5, 178]], 0.5, true);
    await wait(() => X().fight || st() !== 6, 30000);
    B.note('reelle', 'combat : brasiers');
    let last = -1;
    while (alive() && st() === 6) {
      const x = X();
      const i = (x.lit || []).findIndex((v) => !v);
      if (i < 0) {
        await B.sl(200);
        continue;
      }
      if (i !== last) {
        last = i;
        S.held.delete('interact');
      }
      const bq = W.rel(W.braziers[i].pos);
      const ux = (bq.x - W.ARENA.x) / 14;
      const uz = (bq.z - W.ARENA.z) / 14;
      const bearer = L().who === r;
      // the bearer a little behind and to one side, the kindler beside her, both by the brazier
      const tx = bearer ? bq.x - ux * 2.0 - uz * 0.9 : bq.x - ux * 1.7 + uz * 0.9;
      const tz = bearer ? bq.z - uz * 2.0 + ux * 0.9 : bq.z - uz * 1.7 - ux * 0.9;
      const c = q();
      if (Math.hypot(c.x - tx, c.z - tz) > 0.7) {
        S.held.delete('interact');
        await B.walk(A(tx, tz), 0.35, 4000, true);
      }
      B.face(W.braziers[i].pos);
      if (!bearer && Remote.has && Remote.pos.distanceTo(Player.body.p) < 3.2) S.held.add('interact');
      else S.held.delete('interact');
      await B.sl(100);
    }
    S.held.delete('interact');
    B.note('reelle', 'brasiers allumés : ' + JSON.stringify(X().lit));
  };

  // ---------------- stage 7 · the card ----------------
  const stage7 = async () => {
    await B.go(A(me() === 'dame' ? -0.8 : 0.8, 192), { near: 0.4, ms: 30000 });
    B.note('reelle', 'au centre de la clairière (carte)');
    while (alive()) {
      const c = q();
      if (Math.hypot(c.x - W.ARENA.x, c.z - W.ARENA.z) > 2) await B.walk(A(me() === 'dame' ? -0.8 : 0.8, 192), 0.4, 5000);
      await B.sl(400);
    }
  };

  const STAGES = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7 };

  return {
    timeout: 900,
    abort: false,
    async run() {
      B.note('reelle', 'La Lanterne : ' + me() + ', étape ' + st());
      const t0 = performance.now();
      while (alive() && performance.now() - t0 < 880000) {
        const s = st();
        const f = STAGES[s];
        if (!f) {
          await B.sl(300);
          continue;
        }
        try {
          await f();
        } catch (e) {
          B.note('reelle', 'erreur étape ' + s + ' : ' + (e && e.message));
          await B.sl(500);
        }
        B.stop();
        S.held.delete('interact');
        // a stage handler returns when its stage is over (or gave up): wait for the host to move on
        if (st() === s && alive()) await wait(() => st() !== s, 4000);
      }
      B.stop();
      S.held.clear();
      return me() + ': ' + (Story.S.phase === 'tr_h4' ? 'arrêt à l’étape ' + st() : 'niveau fini (' + Story.S.phase + ')');
    },
  };
})();
