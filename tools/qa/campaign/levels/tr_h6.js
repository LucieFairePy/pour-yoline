// tr_h6 « Le Jardin » — campaign solver (both pages). Not a swap level: dame = little sun (light,
// grapple F), valet = watering can. The level has NO action(): everything is "hold E toward a bud"
// (the level's update() turns Input.held('interact') + Cam.yaw facing into the aim it sends), plus
// walking, jumping and the dame's grapple (F on a ring).
// Stages (js/levels/tr_h6.js host(), zones in js/world/tr_h6.js at()):
//  1 stream     both hold E on the vine (0,14.2), walk the vine bridge to A1 (z 29.3..40)
//  2 lily pond  grow lily k from the shore / pad k-1, jump onto it; last pad -> shore A2 (z > 62.3)
//  3 terrace    grow the bloom (-4,70), jump on it: the springboard throws you onto T1 (y 6)
//  4 sunflower  grow it (6,6,94.9); dame grapples ring 'sun' to the far terrace; the valet stands on
//               the head; the dame lights the head (hold E facing it) -> it swings to the far side;
//               both walk the stairs down to LOB
//  5 spring     grow the dandelion; at each gust ride a seed across the ravine to SPF
//  6 summer     the can empties (5 s of pouring): valet refills at the fountain (hold E); grow bean1
//               then bean2 (dame lights only while the water flows: light alone burns); climb the
//               leaf spiral, p1, the upper spiral, the leaf bridge to SUT (z > 205.5, y > 8.5)
//  7 autumn     the dame lights the ground ahead (hold E, camera ray), the valet steps only on cells
//               her light showed; both grow the mushrooms and hop the four caps up to AUL (y 5)
//  8 winter     valet freezes the floes (hold E, water only), walks them; the dame grapples rings
//               w1 / w2 (her light melts ice: she keeps away); dame alone melts the icebox (wice),
//               both grow the winter rose -> stage 9
//  9 the Queen  both enter the dome; three roses (both, 5 s each) while dodging lashes / patches
//               (sidestep) and the ring wave (jump)
// 10 card       wait for the bloom, both walk to the centre -> reward
window.CL = (() => {
  const S = Input.sim;
  const W = H6;
  B.W = W;
  const me = () => Story.role;
  const isD = () => Story.role === 'dame';
  const X = () => Story.S.x || {};
  const st = () => X().stage;
  const grown = (id) => !!(X().grown && X().grown[id]);
  const alive = () => !window.CL.abort && Story.S.phase === 'tr_h6';
  const q = () => W.rel(Player.body.p);
  const qm = () => (Remote.has ? W.rel(Remote.pos) : V3(0, -99, 0));
  const A = (x, y, z) => [x, y, z];
  const wait = (fn, ms = 20000) => B.until(() => !alive() || fn(), ms);
  const d2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  const L = () => W.local || {};
  const sd = () => (isD() ? -1 : 1);
  const faceW = (w) => {
    const p = Player.body.p;
    Cam.yaw = Math.atan2(w.x - p.x, w.z - p.z);
  };
  const on = (x, y, z, r = 1.2) => {
    const p = q();
    return Player.body.grounded && d2(p, x, z) < r && Math.abs(p.y - y) < 0.3;
  };
  // straight walk; if something is in the way (a door jamb), the path finder takes over
  const go = async (p, near = 0.5, ms = 15000, sprint = true) =>
    (await B.walk(p, near, Math.min(ms, 9000), sprint)) || (Math.abs(B.abs(p).y - Player.body.p.y) < 0.6 && B.go(p, { near, ms, pad: 10 }));
  const path = async (pts, near = 0.6, sprint = true) => {
    for (const p of pts) {
      if (!alive()) return false;
      if (!(await go(p, near, 15000, sprint))) return false;
    }
    return true;
  };
  const hop = (p, run = 150, dj = false) => B.leap(B.abs(p), { run, dj, ms: 2500 });

  // hold E toward a bud (the level's update() picks the bud you face, within its range) until
  // it is grown / `done()`; `when()` gates the key (summer: no light without water)
  const hold = async (id, o = {}) => {
    const b = W.buds[id];
    const stage = st();
    const t0 = performance.now();
    const done = o.done || (() => grown(id));
    while (alive() && !done() && st() === stage && performance.now() - t0 < (o.ms || 60000)) {
      if (o.stop && o.stop()) break;
      faceW(o.at ? o.at() : b.pos);
      if (!o.when || o.when()) S.held.add('interact');
      else S.held.delete('interact');
      await B.sl(100);
    }
    S.held.delete('interact');
    return done();
  };
  const grow = async (id, spot, o = {}) => {
    if (grown(id)) return true;
    await go(spot, 0.4);
    const ok = await hold(id, o);
    B.note('reelle', 'E maintenu vers ' + id + (ok ? ' : poussé' : ' : pas encore'));
    return ok;
  };
  // the summer gate: the dame lights only while the can pours on that bud (the beam / the stream
  // are on both screens); the valet pours once the dame stands in range
  const summerWhen = (id) => () => {
    if (st() !== 6) return true;
    const b = W.buds[id];
    if (isD()) return L().mateAim === id;
    return Remote.has && Math.hypot(Remote.pos.x - b.pos.x, Remote.pos.z - b.pos.z) < 9.4 && (L().can || 0) > 0.03;
  };
  const untilStage = async (s, ms = 120000) => wait(() => st() !== s, ms);

  // the grapple: camera on the ring (as Player.findTarget measures it, from the feet + 1.2 m), F
  const grapple = async (ring, ok, label) => {
    const r = W.P(...ring);
    for (let k = 0; k < 5 && alive(); k++) {
      if (ok()) break;
      for (let i = 0; i < 6; i++) {
        const p = Player.body.p;
        const dx = r.x - p.x;
        const dy = r.y - 1.2 - p.y;
        const dz = r.z - p.z;
        Cam.yaw = Math.atan2(dx, dz);
        Cam.pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.95, 1.2);
        await B.sl(40);
      }
      if (Player.lockTarget < 0) {
        await B.sl(300);
        continue;
      }
      await B.tap('ability');
      await wait(() => Player.mode === 'grapple', 800);
      await wait(() => Player.mode !== 'grapple', 4000);
      await wait(() => Player.body.grounded, 3000);
      await B.sl(200);
    }
    Cam.pitch = 0.18;
    const res = ok();
    B.note('reelle', 'grappin (F) ' + label + (res ? ' ok' : ' ÉCHEC'));
    return res;
  };

  // ---------------- 1 · the stream ----------------
  const st1 = async () => {
    await grow('vine', A(1.5 * sd(), 0, 11.5));
    if (!(await wait(() => grown('vine') || st() !== 1, 60000))) return;
    await wait(() => W.buds.vine.cols[0].on || st() !== 1, 4000);
    const x = 0.4 * sd();
    if (q().z < 29) await path([A(x, 0, 13.6), A(x, 0, 22), A(x, 0, 30.5), A(1.5 * sd(), 0, 34)], 0.5, false);
    else await go(A(1.5 * sd(), 0, 34));
    if (q().z > 29.3) B.note('reelle', 'pont de vigne traversé');
    await untilStage(1, q().z > 29.3 ? 60000 : 3000);
  };

  // ---------------- 2 · the lily pond ----------------
  const LILY = [
    [-1, 44.6],
    [1.5, 50.4],
    [-0.5, 56.2],
  ];
  const st2 = async () => {
    const off = 0.5 * sd();
    let guard = 0;
    while (alive() && st() === 2 && guard++ < 60) {
      const p = q();
      if (p.y < -0.6 || !Player.body.grounded) {
        await B.sl(300);
        continue;
      }
      if (p.z > 60.2) {
        await go(A(2 * sd(), 0, 65));
        await untilStage(2, 60000);
        return;
      }
      let k = p.z < 41 ? -1 : LILY.findIndex((l) => d2(p, l[0], l[1]) < 2.2);
      if (p.z >= 41 && k < 0) {
        await B.sl(300);
        continue;
      }
      if (k === 2) {
        await hop(A(-0.5 + 2 * off, 0, 62.6), 150, true);
        B.note('reelle', 'dernier nénuphar -> rive');
        continue;
      }
      const nx = k + 1;
      const id = 'lily' + (nx + 1);
      if (k === -1) await go(A(LILY[0][0] + off, 0, 38.8), 0.4);
      if (!grown(id)) {
        await hold(id, { ms: 30000 });
        B.note('reelle', 'E maintenu vers ' + id + (grown(id) ? ' : éclos' : ''));
        continue;
      }
      await wait(() => W.buds[id].cols[0].on, 3000);
      await hop(A(LILY[nx][0] + off, -0.1, LILY[nx][1]), 150, true);
      await B.sl(250);
      if (on(LILY[nx][0] + off, -0.1, LILY[nx][1], 1.6)) B.note('reelle', 'saut sur ' + id);
    }
  };

  // ---------------- 3 · the springboard flower ----------------
  const st3 = async () => {
    let tries = 0;
    while (alive() && st() === 3 && tries < 8) {
      const p = q();
      if (p.y > 5.5 && p.z > 74) {
        await go(A(3 * sd(), 6, 80));
        await untilStage(3, 60000);
        return;
      }
      if (!grown('bloom')) {
        await grow('bloom', A(-4 + 2.5 * sd(), 0, 66.5));
        continue;
      }
      await wait(() => W.buds.bloom.cols[0].on, 4000);
      tries++;
      await go(A(-4 + 0.4 * sd(), 0, 66), 0.3);
      const c = W.P(-4, 0, 70);
      const up = W.P(-4 + 0.4 * sd(), 6, 79);
      S.held.add('sprint');
      faceW(c);
      await B.until(() => {
        faceW(c);
        B.steer(c);
        return Math.hypot(c.x - Player.body.p.x, c.z - Player.body.p.z) < 2.6;
      }, 1500, 16);
      await B.tap('jump', 60);
      let launched = false;
      const t0 = performance.now();
      while (alive() && performance.now() - t0 < 4500) {
        if (Player.body.v.y > 12) launched = true;
        const tg = launched ? up : c;
        faceW(tg);
        B.steer(tg);
        if (launched && Player.body.grounded && performance.now() - t0 > 600) break;
        if (!launched && Player.body.grounded && performance.now() - t0 > 900) break;
        await B.sl(16);
      }
      B.stop();
      B.note('reelle', 'saut sur la grande fleur' + (q().y > 5.5 ? ' -> terrasse' : ' (raté, on recommence)'));
    }
  };

  // ---------------- 4 · the sunflower ----------------
  const headRel = () => W.rel(W.sunHead(V3()));
  const st4 = async () => {
    if (!grown('sun')) await grow('sun', A(isD() ? 2.5 : 8.5, 6, 93));
    if (!(await wait(() => grown('sun') || st() !== 4, 60000)) || st() !== 4) return;
    await wait(() => W.sunflower && W.sunflower.box.on, 5000);
    const far = () => q().z > 111.8 && q().y > 5.5;
    if (isD()) {
      if (!far()) {
        await go(A(-4, 6, 93), 0.4);
        await grapple(W.RINGS.sun.pos, far, 'anneau du tournesol');
      }
      if (!far()) {
        B.tp(A(-4, 6, 116), 'grappin du tournesol raté 5 fois');
        await B.sl(400);
      }
      await go(A(-4, 6, 116), 0.4);
      // the valet on the head, then light it until he is across
      const vOnHead = () => {
        const v = qm();
        const h = headRel();
        return d2(v, h.x, h.z) < 1.6 && v.y > 5.5;
      };
      const vFar = () => qm().z > 111.8 && qm().y > 5.5;
      await wait(() => vOnHead() || vFar() || st() !== 4, 90000);
      if (!vFar()) {
        B.note('reelle', 'Valet sur le tournesol : E maintenu vers sa tête');
        while (alive() && st() === 4 && !vFar()) {
          faceW(W.sunHead(V3()));
          S.held.add('interact');
          await B.sl(80);
        }
        S.held.delete('interact');
      }
    } else {
      if (!far()) {
        const h = headRel();
        if (h.z < 99) {
          await go(A(6, 6, 93.5), 0.4, 8000, false);
          await go(A(h.x, 6, h.z), 0.3, 6000, false);
          B.stop();
          const onHead = () => Player.body.grounded && Player.body.ground === W.sunflower.box;
          B.note('reelle', 'sur le cœur du tournesol' + (onHead() ? '' : ' (?)'));
          // ride (stick at rest) until it reaches the far side
          await wait(() => (W.sunflower.a < 0.05 && q().z > 108) || q().y < 3 || st() !== 4, 120000);
          if (q().y > 5.5 && q().z > 108) await go(A(6, 6, 115.5), 0.4, 6000, false);
        }
        if (!far()) {
          B.tp(A(4, 6, 116), 'tombé du tournesol ou tête déjà de l’autre côté (la ramener exige la Dame sur la rive de départ)');
          await B.sl(400);
        }
      }
      if (far()) B.note('reelle', 'le tournesol m’a porté de l’autre côté');
    }
    // both down the stairs to the lobby
    if (q().z > 111 && q().y > 5.5) await path([A(2 * sd(), 6, 120), A(2 * sd(), 0, 136)], 0.5);
    else await go(A(2 * sd(), 0, 136));
    await untilStage(4, 90000);
  };

  // ---------------- 5 · spring ----------------
  const st5 = async () => {
    await go(A(0.8 * sd(), 0, 144));
    if (!grown('dand')) await grow('dand', A(isD() ? -8.5 : -3.5, 0, 146));
    if (!(await wait(() => grown('dand') || st() !== 5, 60000)) || st() !== 5) return;
    const i = isD() ? 0 : 2;
    const lx = -6 + (i - 1) * 2.8;
    let rides = 0;
    while (alive() && st() === 5 && rides < 8) {
      const p = q();
      if (p.z > 166.2 && p.y > -0.4) {
        await go(A(lx + 2, 0, 171));
        await untilStage(5, 60000);
        return;
      }
      if (p.y < -0.6) {
        await B.sl(300);
        continue;
      }
      await go(A(lx, 0, 147.8), 0.4, 8000, false);
      // a gust: my seed rests on the edge (it glows) between 0.9 s and 4 s
      const ok = await wait(() => {
        const g = L().gust;
        const t = g - i * 0.25;
        return g >= 0 && t > 1.0 && t < 3.0;
      }, 20000);
      if (!ok || st() !== 5) continue;
      rides++;
      await go(A(lx, 0.25, 150.9), 0.35, 1800, false);
      B.stop();
      const mv = W.movers.find((m) => m.box === Player.body.ground);
      B.note('reelle', 'sur une aigrette' + (mv ? '' : ' (?)'));
      // ride until it lands on the far edge
      await wait(() => {
        const g = L().gust;
        const t = g - i * 0.25;
        return g < 0 || t > 9.4 || q().y < -0.6;
      }, 14000);
      if (q().z > 166) {
        await go(A(lx + 2, 0, 171));
        B.note('reelle', 'la rafale m’a porté de l’autre côté');
      }
    }
  };

  // ---------------- 6 · summer ----------------
  const TH0 = Math.PI / 2 + (2 * Math.PI) / 7;
  const leaf = (i) => {
    const th = TH0 + (i * 2 * Math.PI) / 7;
    return A(Math.cos(th) * 2.9, i < 7 ? 0.65 * (i + 1) : 4.5 + 0.6 * (i - 6), 194 + Math.sin(th) * 2.9);
  };
  const CLIMB = [...[0, 1, 2, 3, 4, 5, 6].map(leaf), A(0, 4.5, 199.4), ...[7, 8, 9, 10, 11, 12, 13].map(leaf), A(0, 9, 201.5), A(0, 9, 207.5)];
  // once the beanstalk stands, its leaves and stem are in the way: path finder (B.go)
  const goS = (p) => (grown('bean1') ? B.go(p, { near: 0.35, ms: 20000 }) : go(p, 0.3, 12000, false));
  const refill = async () => {
    await goS(A(-2.9, 0, 186.2));
    if (!W.nearFountain(q())) await go(A(-3.2, 0, 186.7), 0.2, 3000, false);
    await B.until(() => {
      S.held.add('interact');
      return (L().can || 0) >= 0.999 || !alive();
    }, 5000, 50);
    S.held.delete('interact');
    B.note('reelle', 'arrosoir rempli à la fontaine (E maintenu) : ' + Math.round((L().can || 0) * 100) + ' %');
  };
  const bean = async (id, vSpot, dSpot) => {
    let k = 0;
    while (alive() && st() === 6 && !grown(id) && k++ < 8) {
      if (!isD()) {
        if ((L().can || 0) < 0.97 && !((L().prog || {})[id] > 0.05)) await refill();
        else if ((L().can || 0) < 0.04) await refill();
        await goS(vSpot);
        await hold(id, { when: summerWhen(id), stop: () => (L().can || 0) <= 0.03, ms: 40000 });
      } else {
        await goS(dSpot);
        await hold(id, { when: summerWhen(id), ms: 60000 });
      }
    }
    B.note('reelle', id + (grown(id) ? ' a poussé (eau + lumière)' : ' ÉCHEC'));
  };
  const climbIdx = () => {
    const p = q();
    if (!Player.body.grounded) return -2;
    if (p.y < 0.3) return -1;
    if (Math.abs(p.x) < 1.4 && Math.abs(p.y - 9) < 0.3 && p.z > 196.4 && p.z < 206.8) return 15;
    let best = -2;
    CLIMB.forEach((c, i) => {
      const r = i === 7 || i >= 15 ? 1.9 : 1.15;
      if (d2(p, c[0], c[2]) < r && Math.abs(p.y - c[1]) < 0.3) best = i;
    });
    return best;
  };
  const st6 = async () => {
    if (q().z < 180) await path([A(0, 0, 174), A(0, 0, 182)], 0.6);
    if (!grown('bean1')) await bean('bean1', A(-1, 0, 189), A(4, 0, 189));
    if (!grown('bean2')) await bean('bean2', A(3.2, 0, 200.5), A(-2.6, 0, 200.5));
    await wait(() => (grown('bean2') && W.buds.bean2.cols[0].on) || st() !== 6, 60000);
    if (st() !== 6) return;
    // the climb, leaf after leaf
    let n = 0;
    while (alive() && st() === 6 && n++ < 80) {
      const p = q();
      if (p.z > 205.5 && p.y > 8.5) break;
      const i = climbIdx();
      if (i === -2) {
        await B.sl(200);
        continue;
      }
      if (i === -1) {
        await B.go(A(-4.6, 0, 196.5), { near: 0.35, ms: 20000 });
        await hop(CLIMB[0], 120);
        continue;
      }
      const nx = CLIMB[i + 1];
      if (i === 6 || i >= 14) await go(nx, 0.4, 5000, false);
      else await hop(nx, i === 7 ? 220 : 150);
      await B.sl(150);
    }
    if (q().y > 8.5) B.note('reelle', 'haricot escaladé (feuilles, sauts) jusqu’au toit');
    else B.note('reelle', 'escalade du haricot ÉCHEC à ' + B.rel().join(','));
    await go(A(1.2 * sd(), 9, 208), 0.5);
    await untilStage(6, 90000);
  };

  // ---------------- 7 · autumn ----------------
  const cellC = (r, c) => [-13.5 + c * 3, 243.5 + r * 3];
  const holePath = () => {
    const hole = new Set(W.holeCells.map((h) => h.r + ':' + h.c));
    const ok = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 10 && !hole.has(r + ':' + c);
    const prev = {};
    const qu = [];
    for (let c = 0; c < 10; c++) if (ok(0, c)) {
      qu.push([0, c]);
      prev['0:' + c] = null;
    }
    let end = null;
    while (qu.length) {
      const [r, c] = qu.shift();
      if (r === 6) {
        end = [r, c];
        break;
      }
      for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
        const k = r + dr + ':' + (c + dc);
        if (ok(r + dr, c + dc) && !(k in prev)) {
          prev[k] = [r, c];
          qu.push([r + dr, c + dc]);
        }
      }
    }
    const out = [];
    for (let e = end; e; e = prev[e[0] + ':' + e[1]]) out.unshift(e);
    return out.map(([r, c]) => cellC(r, c));
  };
  const st7 = async () => {
    const P7 = holePath();
    const lit = P7.map(() => false);
    const mush = W.buds.mush.pos;
    const atTop = () => q().y > 4.5 && q().z > 265.8;
    if (q().z > 225 && q().z < 242 && q().y < 1) {
      // the dame lights, the valet watches where her light shows the ground
    } else if (q().y > 7) await path([A(0, 9, 213), A(0, 9, 218), A(0, 0, 236.5)], 0.6);
    const remIdx = () => {
      const m = qm();
      let b = -1;
      P7.forEach((c, i) => d2(m, c[0], c[1]) < 1.6 && (b = i));
      if (m.z > 262.8) b = P7.length;
      return b;
    };
    const markLit = () => {
      const s = L().mateSpot;
      if (!s) return;
      const r = W.rel(s);
      P7.forEach((c, i) => {
        if (d2(r, c[0], c[1]) < 3.4) lit[i] = true;
      });
    };
    let n = 0;
    walk: while (alive() && st() === 7 && n++ < 6) {
      const p = q();
      if (atTop()) break;
      if (p.z < 263) {
        if (isD()) {
          // the dame stays on the near edge (beyond the mushrooms' reach: within 9.5 m of them
          // her light goes to the mushrooms, not the ground) and keeps her light on the cell just
          // ahead of the valet until he is across. She sees every hole of the path in her light.
          const stand = A(P7[0][0] + (P7[0][0] > 0 ? -2.2 : 2.2), 0, 240);
          await path([A(q().x > 2 ? 1.5 : q().x < -2 ? -1.5 : q().x, 0, 239.5), stand], 0.4, false);
          await wait(() => remIdx() >= 0 || (qm().z > 236 && qm().z < 242.2 && Math.abs(qm().x - P7[0][0]) < 3), 90000);
          let at = -1;
          const t0 = performance.now();
          while (alive() && st() === 7 && remIdx() < P7.length && performance.now() - t0 < 240000) {
            at = Math.max(at, remIdx());
            const tg = P7[Math.min(at + 1, P7.length - 1)];
            B.aimFine(A(tg[0], 0, tg[1]), 0.6);
            S.x = 0;
            S.z = 0;
            S.held.add('interact');
            await B.sl(40);
          }
          S.held.delete('interact');
          Cam.pitch = 0.18;
          B.note('reelle', 'la Dame, au bord du champ, éclaire la case devant le Valet' + (remIdx() >= P7.length ? ' : il est passé' : ' (?)'));
          await go(A(P7[0][0], 0, 240.6), 0.4, 8000, false);
        } else await path([A(q().x > 2 ? 1.5 : q().x < -2 ? -1.5 : q().x, 0, 240.2), A(P7[0][0], 0, 240.6)], 0.4, false);
        for (let k = 0; k < P7.length; k++) {
          if (!alive() || st() !== 7) return;
          if (!isD()) {
            // step only on a cell her light has shown (no hole there)
            const ok = await B.until(() => {
              markLit();
              return lit[k] || !alive() || st() !== 7;
            }, 120000, 40);
            if (!ok) {
              B.note('reelle', 'case ' + k + ' pas encore éclairée par la Dame : j’attends');
              continue walk;
            }
          }
          await go(A(P7[k][0], 0, P7[k][1]), 0.35, 8000, false);
          if (q().y < -0.5) {
            B.note('reelle', 'tombé dans un trou (case ' + k + ')');
            await wait(() => q().y > -0.1 && Player.body.grounded, 8000);
            continue walk;
          }
        }
        B.note('reelle', 'champ de feuilles traversé ' + (isD() ? 'en éclairant le sol' : 'sur les cases éclairées par la Dame'));
        await go(A(P7[P7.length - 1][0], 0, 263.8), 0.4, 5000, false);
      }
      const spot = A(isD() ? 6.8 : 9, 0, 264.2);
      await go(spot, 0.3, 8000, false);
      if (!grown('mush')) await hold('mush', { ms: 60000 });
      await wait(() => (grown('mush') && W.buds.mush.cols[3].on) || st() !== 7, 30000);
      B.note('reelle', 'champignons : ' + (grown('mush') ? 'poussés' : 'pas encore'));
      const CAPS = [A(4.4, 1, 264.3), A(1.8, 2, 264.5), A(-0.8, 3, 264.5), A(-3.4, 4, 264.6), A(-3.4, 5, 267.8)];
      for (let t = 0; t < 14 && alive() && !atTop(); t++) {
        const pp = q();
        let i = -1;
        CAPS.forEach((c, j) => d2(pp, c[0], c[2]) < 1.4 && Math.abs(pp.y - c[1]) < 0.3 && (i = j));
        if (pp.y < 0.3) {
          await go(spot, 0.3, 6000, false);
          await hop(CAPS[0], 100);
        } else if (i >= 0) await hop(CAPS[i + 1], 120);
        else await B.sl(200);
        await B.sl(150);
      }
      B.note('reelle', atTop() ? 'escalier de champignons -> corniche' : 'escalier de champignons ÉCHEC');
    }
    if (atTop()) await go(A(1.5 * sd(), 5, 269), 0.5);
    await untilStage(7, 90000);
  };

  // ---------------- 8 · winter ----------------
  const ICE = [
    [-4, 292],
    [-2, 296],
    [-4, 300],
    [3, 310],
    [5, 314],
    [3, 318],
  ];
  const freezeWalk = async (ids, start, end) => {
    await go(start, 0.3, 10000, false);
    for (const i of ids) {
      const [x, z] = ICE[i];
      const id = 'ice' + i;
      for (let t = 0; t < 3 && !(L().iceHp[i] > 0.25); t++) {
        await hold(id, { done: () => L().iceHp[i] > 0.25, ms: 6000 });
      }
      await go(A(x, 0, z), 0.5, 5000, false);
      if (q().y < -0.5) return false;
    }
    await go(end, 0.4, 5000, false);
    return q().y > -0.4;
  };
  const st8 = async () => {
    if (q().z < 284) await path([A(0, 5, 270), A(0, 5, 275), A(0, 0, 285)], 0.6);
    if (isD()) {
      const isl = () => q().z > 302 && q().z < 309 && q().y > -0.4 && Player.body.grounded;
      const across = () => q().z > 320 && q().y > -0.4 && Player.body.grounded;
      if (!across()) {
        if (!isl()) {
          await go(A(6, 0, 288), 0.4);
          await grapple(W.RINGS.w1.pos, () => isl() || across(), 'anneau w1');
        }
        if (isl()) {
          await go(A(8, 0, 305.5), 0.4);
          await grapple(W.RINGS.w2.pos, across, 'anneau w2');
        }
        if (!across()) {
          B.tp(A(-6, 0, 323), 'grappin d’hiver raté 5 fois');
          await B.sl(400);
        }
      }
      await go(A(-2.6, 0, 324), 0.4);
      if (!grown('wice')) {
        await hold('wice', { ms: 30000 });
        B.note('reelle', 'glace de la rose fondue (lumière seule, E maintenu)');
      }
      await hold('wrose', { done: () => st() !== 8, ms: 90000 });
    } else {
      let n = 0;
      const isl = () => q().z > 302 && q().z < 309 && q().y > -0.4;
      const across = () => q().z > 320 && q().y > -0.4;
      while (alive() && st() === 8 && !across() && n++ < 6) {
        if (q().y < -0.5) {
          await wait(() => q().y > -0.1 && Player.body.grounded, 8000);
          continue;
        }
        if (!isl() && q().z < 302) {
          const ok = await freezeWalk([0, 1, 2], A(-4, 0, 289.4), A(-2, 0, 305));
          B.note('reelle', 'canal 1 : plaques de glace (E maintenu) ' + (ok ? 'traversé' : 'chute'));
          continue;
        }
        if (isl()) {
          // the Dame's light melts the ice: wait till she is past the second channel
          await wait(() => qm().z > 320 || st() !== 8, 60000);
          const ok = await freezeWalk([3, 4, 5], A(3, 0, 307.4), A(3, 0, 321.6));
          B.note('reelle', 'canal 2 : plaques de glace ' + (ok ? 'traversé' : 'chute'));
        }
      }
      await go(A(2.6, 0, 324), 0.4);
      await wait(() => grown('wice') || st() !== 8, 60000);
      await hold('wrose', { done: () => st() !== 8, ms: 90000 });
    }
    B.note('reelle', 'rose d’hiver : ' + (st() >= 9 ? 'fleurie' : 'pas encore'));
    await untilStage(8, 60000);
  };

  // ---------------- 9 · the Thorn Queen ----------------
  const C = W.C;
  const st9 = async () => {
    const x0 = 2.5 * sd();
    await go(A(x0, 0, 326), 0.5);
    await wait(() => (L().wallK || 0) > 0.6, 4000);
    await path([A(x0, 0, 332), A(x0 * 0.8, 0, 338), A(x0, 0, 348)], 0.5);
    await wait(() => X().fight || st() !== 9, 60000);
    B.note('reelle', 'sous le dôme : combat');
    const bud = (id) => W.rel(W.buds[id].pos);
    const angOf = (x, z) => Math.atan2(x - C.x, z - C.z);
    const atR = (a, r) => [C.x + Math.sin(a) * r, C.z + Math.cos(a) * r];
    const danger = (x, z) => {
      const Bs = W.boss;
      if (!Bs) return false;
      for (const Lh of Bs.lashes) {
        if (!(Lh.t >= 0 && Lh.t < 1.5)) continue;
        const dx = x - C.x;
        const dz = z - C.z;
        const along = dx * Math.sin(Lh.a) + dz * Math.cos(Lh.a);
        const perp = Math.abs(dx * Math.cos(Lh.a) - dz * Math.sin(Lh.a));
        if (along > 1.5 && along < 27 && perp < 2.5) return true;
      }
      for (const Pt of Bs.patches) if (Pt.t >= 0 && Pt.t < 8.5 && Math.hypot(x - Pt.x, z - Pt.z) < 3.5) return true;
      return false;
    };
    const ringJump = async () => {
      const Rg = W.boss && W.boss.ring;
      if (!Rg || Rg.t < 1.2) return;
      const r = W.ringPos(Rg.t);
      const d = Math.hypot(q().x - C.x, q().z - C.z);
      if (d - r > 0.8 && d - r < 2.2 && Player.body.grounded) {
        S.held.add('jump');
        await B.sl(60);
        S.held.delete('jump');
      }
    };
    const moveTo = (x, z) => {
      const w = W.P(x, 0, z);
      const p = Player.body.p;
      if (Math.hypot(w.x - p.x, w.z - p.z) < 0.35) {
        S.x = 0;
        S.z = 0;
        return true;
      }
      S.held.add('sprint');
      B.steer(w);
      return false;
    };
    let guard = 0;
    while (alive() && st() === 9 && guard++ < 12000) {
      const id = ['r1', 'r2', 'r3'].find((i) => !grown(i));
      if (!id) {
        await B.sl(200);
        continue;
      }
      const b = bud(id);
      const a = angOf(b.x, b.z);
      const [tx, tz] = atR(a + sd() * 0.15, 14);
      // get there along the outer ring (around her bramble mass)
      const p = q();
      const pa = angOf(p.x, p.z);
      let da = Math.atan2(Math.sin(a - pa), Math.cos(a - pa));
      const far = Math.abs(da) > 0.5;
      let gx = tx;
      let gz = tz;
      if (far) [gx, gz] = atR(pa + Math.sign(da) * 0.5, 14);
      // the safe spot nearest to the goal
      const ux = Math.sin(a);
      const uz = Math.cos(a);
      const cands = [
        [gx, gz],
        [gx + uz * 3.5, gz - ux * 3.5],
        [gx - uz * 3.5, gz + ux * 3.5],
        [gx + ux * 3, gz + uz * 3],
        [gx + ux * 3 + uz * 3.5, gz + uz * 3 - ux * 3.5],
        [gx + ux * 3 - uz * 3.5, gz + uz * 3 + ux * 3.5],
        [gx - ux * 2.5, gz - uz * 2.5],
      ];
      const pick = cands.find(([x, z]) => !danger(x, z) && Math.hypot(x - C.x, z - C.z) < 20.5) || cands[0];
      if (danger(p.x, p.z) || pick !== cands[0]) S.held.add('sprint');
      // face the rose, hold E, move with the stick only (the yaw stays on the rose)
      faceW(W.buds[id].pos);
      moveTo(pick[0], pick[1]);
      S.held.add('interact');
      await ringJump();
      await B.sl(40);
    }
    S.held.delete('interact');
    B.stop();
    B.note('reelle', 'roses de cœur : ' + (X().roses || 0) + ' / 3');
  };

  // ---------------- 10 · the card ----------------
  const st10 = async () => {
    await wait(() => (L().bloom || 0) > 3.2 && (!W.boss || W.boss.withered > 0.6), 20000);
    await go(A(1.2 * sd(), 0, C.z), 0.4, 20000);
    B.note('reelle', 'au cœur de la grande rose');
    await wait(() => Story.S.phase !== 'tr_h6', 30000);
  };

  return {
    timeout: 1500,
    async run() {
      B.note('reelle', me() + ' : début du Jardin (stage ' + st() + ')');
      const F = { 1: st1, 2: st2, 3: st3, 4: st4, 5: st5, 6: st6, 7: st7, 8: st8, 9: st9, 10: st10 };
      let last = -1;
      let same = 0;
      while (alive()) {
        const s = st();
        same = s === last ? same + 1 : 0;
        last = s;
        if (same > 4) {
          // the stage routine returned without the stage moving on: give it time, then retry
          await untilStage(s, 20000);
          same = 0;
        }
        try {
          if (F[s]) await F[s]();
          else await B.sl(300);
        } catch (e) {
          B.note('reelle', 'erreur stage ' + s + ' : ' + (e && e.message));
          S.held.clear();
          B.stop();
          await B.sl(500);
        }
        if (s === 10) break;
      }
      S.held.clear();
      B.stop();
      return me() + ': stage ' + st() + ', phase ' + Story.S.phase + ', roses ' + (X().roses || 0);
    },
  };
})();
