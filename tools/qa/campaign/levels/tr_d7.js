// ♦ 9 · Le Temps (tr_d7). No swap: Yoline = dame (walker, sees the sand curtains, slows time F),
// William = valet (crank, sees the target hour, heavy brakes).
// Part 1 « Le Cadran »: the valet holds E on the crank (F flips the direction) to bring the minute
//   hand to VI, the dame boards it from the VI pier, rides it to each target hour (the direction
//   is the one without sand curtains: the dame sees them) and steps into the niche. Last setting:
//   six o'clock exactly (Shift+E fast), then the valet walks VI pier → hour hand → hub → minute
//   hand → XII niche, and both take the north corridor.
// Part 2 « L'Écho »: the dame records an echo standing on the east A plate (F, F) and launches it
//   (F); with the valet on the west plate the bridge rises, the dame crosses to the pink plate
//   (latch). The valet records his walk along the balcony plates; the dame holds the balcony
//   plates while he walks the lane, then launches his echo (F) and follows it down the lane.
// Part 3 « Le Gel »: the valet holds J1 (E held), the dame climbs the debris and turns the
//   hourglass (E); the valet climbs; he holds J2 while she crosses the gears and the pendulums
//   (F slows time), then she holds J3 and slows time for him.
// Part 4 « L'Horloger »: for each station, the dame holds the brake (E held), the valet presses
//   the wedge (E) on the next even beat once the brake has held 1.6 s.
// Part 5: both walk to the card at the arena centre.
// Clock state (hand angle, gates, pendulums, beat, brake) is read from window.__d7, the level's
// own test hook (window.__test): all of it is what the screens show (hands, pendulums, the tac).
window.CL = {
  timeout: 1500,
  async run() {
    const W = TrD7;
    B.W = W;
    window.__test = 1;
    const me = Story.role;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const S = Input.sim;
    const D = () => window.__d7 || {};
    const log = [];
    const rel = () => W.rel(Player.body.p);
    const mate = () => (Remote.has ? W.rel(Remote.pos) : null);
    const settle = () => B.until(() => Player.body.grounded, 3000, 30);
    const aMinOf = (m) => (((m % 60) + 60) % 60) / 5;
    const aMin = () => aMinOf(D().m || 0);
    const still = () => Math.abs(D().mv || 0) < 0.01;
    const handPt = (h, r, y = 0) => {
      const d = W.hourDir(h);
      return [W.C1.x + d[0] * r, y, W.C1.z + d[1] * r];
    };
    await B.until(() => window.__d7, 5000, 50);
    B.note('reelle', 'état de l’horloge lu par window.__d7 (crochet de test du niveau) : ce que montrent les écrans');

    // ============================== part 1 ==============================
    if (X().stage === 1) {
      if (me === 'valet') await valet1();
      else await dame1();
      log.push('cadran ' + (X().s1.done ? 'ok' : 'ko'));
      // cross to the north corridor
      if (X().s1.done && !ab()) {
        if (me === 'valet') {
          await B.walk([-5.1, 6.16, 3.8], 0.4, 4000);
          await B.walk([-5.1, 0, -5.2], 0.4, 10000); // down the pulpit stair
          await B.walk([-3.2, 0, -5.2], 0.4, 4000);
          await B.walk([0, 0, 7.6], 0.4, 8000);
          await B.walk([0, 0, 17.2], 0.4, 6000);
          await B.walk([0, -1.2, 21.6], 0.4, 4000);
          for (let k = 0; k < 4 && rel().y < -0.5 && !ab(); k++) {
            await B.leap([0, 0, 25.5], { ms: 1500 });
            await settle();
          }
          B.note('reelle', 'valet sur le ponton du VI (' + B.rel() + '), traverse par les aiguilles');
          await B.walk([0, 0, 38.6], 0.3, 8000);
          await B.walk([0, 0, 55.8], 0.3, 8000);
          await B.walk([0, -1.2, 60.5], 0.4, 5000);
        } else await B.walk([0, -1.2, 60.5], 0.4, 5000);
        await B.walk([me === 'dame' ? -0.6 : 0.6, 0, 70], 0.4, 8000);
        await B.walk([me === 'dame' ? -1.5 : 1.5, 0, 72], 0.4, 4000);
      }
      await B.until(() => X().stage !== 1 || ab(), 30000, 200);
    }
    if (ab()) return log.join(', ');

    // ============================== part 2 ==============================
    if (X().stage === 2) {
      await B.sl(500);
      if (me === 'dame') await dame2();
      else await valet2();
      await B.until(() => X().stage !== 2 || ab(), 40000, 200);
      log.push('écho ' + (X().stage >= 3 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ============================== part 3 ==============================
    if (X().stage === 3) {
      await B.sl(300);
      if (me === 'dame') await dame3();
      else await valet3();
      await B.until(() => X().stage !== 3 || ab(), 60000, 200);
      log.push('gel ' + (X().stage >= 4 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ============================== part 4 ==============================
    if (X().stage === 4) {
      await B.go([me === 'dame' ? -0.8 : 0.8, 7, 241], { near: 0.6, ms: 20000 });
      await B.go([me === 'dame' ? -1.5 : 1.5, 7, 252], { near: 0.6, ms: 20000 });
      await part4();
      log.push('horloger ' + (X().stage >= 5 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ============================== the card ==============================
    await B.until(() => X().stage >= 5 || ab(), 30000, 200);
    await B.sl(9500); // the stop, the meeting hour, then the card comes down
    await B.go([me === 'dame' ? -2 : 2, 7, 262.5], { near: 0.5, ms: 30000 });
    B.note('reelle', me + ' à la carte');
    await B.until(() => Story.S.phase !== 'tr_d7' || ab(), 20000, 200);
    return me + ': ' + log.join(', ');

    // ------------------------------------------------------------------ part 1, valet
    async function holdCrank(on, fast) {
      if (on) S.held.add('interact');
      else S.held.delete('interact');
      if (fast) S.held.add('sprint');
      else S.held.delete('sprint');
    }
    async function setDir(dir) {
      for (let k = 0; k < 4 && X().s1.dir !== dir && !ab(); k++) {
        await holdCrank(false);
        await B.sl(80);
        await B.tap('ability');
        await B.until(() => X().s1.dir === dir, 1200, 30);
      }
    }
    // crank in `dir` until the minute hand is on hour h (released 2.4 min before: it settles)
    async function crankTo(h, dir, stopIf) {
      await setDir(dir);
      const want = h * 5;
      const t0 = performance.now();
      while (!ab() && performance.now() - t0 < 30000) {
        const cur = (((D().m % 60) + 60) % 60);
        const rem = dir > 0 ? (((want - cur) % 60) + 60) % 60 : (((cur - want) % 60) + 60) % 60;
        if (rem < 2.4 || rem > 57.6) break;
        if (stopIf && stopIf()) break;
        if (X().s1.dir !== dir) await setDir(dir);
        await holdCrank(true);
        await B.sl(25);
      }
      await holdCrank(false);
      await B.until(() => still(), 3000, 30);
    }
    function clearDir(from, to, cur) {
      const cw = [];
      for (let h = (from + 1) % 12; h !== to; h = (h + 1) % 12) cw.push(h);
      return cw.some((h) => cur.includes(h)) ? -1 : 1;
    }
    function shortDir(from, to) {
      const d = (((to - from) % 12) + 12) % 12;
      return d <= 6 ? 1 : -1;
    }
    async function valet1() {
      const cs = W.CRANK_SPOT;
      await B.walk([cs.x, cs.y, cs.z], 0.3, 3000);
      if (!W.nearCrank(rel())) B.note('reelle', 'valet pas à la manivelle : ' + B.rel());
      let lastNote = '';
      const seen = [];
      const t0 = performance.now();
      while (X().stage === 1 && !X().s1.done && !ab() && performance.now() - t0 < 600000) {
        const s1 = X().s1;
        if (s1.round >= 3) {
          // six o'clock exactly: fast, then let the mechanism settle
          const off = ((((D().m - 360) % 720) + 1080) % 720) - 360;
          if (Math.abs(off) <= 8) {
            await holdCrank(false);
            await B.until(() => X().s1.done || !still(), 4000, 50);
            await B.sl(500);
            if (!X().s1.done && still()) {
              const off2 = ((((D().m - 360) % 720) + 1080) % 720) - 360;
              if (Math.abs(off2) < 0.1) await B.sl(500);
            }
            continue;
          }
          const dir = off > 0 ? -1 : 1;
          if (lastNote !== 'six') {
            lastNote = 'six';
            B.note('reelle', 'valet règle six heures pile (E + Maj, sens ' + dir + ')');
          }
          await setDir(dir);
          await holdCrank(true, Math.abs(off) > 30);
          await B.sl(25);
          continue;
        }
        const tg = s1.tg[s1.round];
        const am = aMin();
        const q = mate();
        const p = q && W.polar(q);
        // on the hand = seen standing there for a moment (her leap from a niche passes over the
        // hand: turning it then would pull it from under her before she lands), and not on the VI
        // pier (it lies along the hand at VI, at the same height: she walks from it onto the hand)
        const pierQ = q && W.nicheAt(q) < 0 && q.y > -0.8 && Math.abs(q.x) < 2.6 && q.z < 30;
        const over = q && !pierQ && q.y > -0.45 && p.r > 1.5 && p.r < 17.2 && W.hourDist(p.a, am) < 0.45;
        const nowT = performance.now();
        if (!over) seen.length = 0;
        else {
          seen.push([nowT, q.y]);
          while (seen.length && nowT - seen[0][0] > 900) seen.shift();
        }
        const onHand = over && seen.length > 2 && nowT - seen[0][0] > 600 && Math.max(...seen.map((e) => e[1])) - Math.min(...seen.map((e) => e[1])) < 0.15;
        if (!onHand) {
          // bring the hand back in front of the niche the dame boards from (once she is in it)
          // whichever niche she stands in (she may have been set down on the VI pier and walked
          // back into the VI niche): bring the hand there
          // (or on the VI pier: the niche's gate is shut unless the hand stands in front of it)
          const onPier = q && W.nicheAt(q) < 0 && q.y > -0.8 && Math.abs(q.x) < 2.6 && q.z < 30;
          const nq = q ? (onPier ? 6 : W.nicheAt(q)) : -1;
          if (nq >= 0 && W.hourDist(am, nq) > 0.05 && still()) {
            if (lastNote !== 'from' + nq + s1.round) {
              lastNote = 'from' + nq + s1.round;
              B.note('reelle', 'valet amène la grande aiguille au ' + W.ROMAN[nq] + ' pour la dame');
            }
            await crankTo(nq, shortDir(Math.round(am) % 12, nq));
          } else await B.sl(150);
          continue;
        }
        if (W.hourDist(am, tg) < 0.05) {
          await B.sl(150);
          continue;
        }
        const dir = clearDir(Math.round(am) % 12, tg, s1.cur);
        if (lastNote !== 'tg' + s1.round) {
          lastNote = 'tg' + s1.round;
          B.note('reelle', 'heure ' + (s1.round + 1) + ' : valet tourne vers le ' + W.ROMAN[tg] + ' (sens ' + dir + ', le côté sans rideau que dit la dame)');
        }
        if (s1.round === 0 && W.hourDist(am, s1.from) < 0.05) {
          // still on the VI pier: wait until she stands on the hand past the pier's end
          if (p.r > 10.2) {
            await B.sl(150);
            continue;
          }
          // first hour mark only, so she can walk out past the hour hand
          await crankTo((s1.from + dir + 12) % 12, dir);
          await B.until(() => { const m2 = mate(); return !m2 || W.polar(m2).r > 12.5; }, 9000, 100);
          continue;
        }
        await crankTo(tg, dir, () => {
          const m2 = mate();
          return !m2 || m2.y < -0.6;
        });
      }
      await holdCrank(false);
      await B.until(() => X().s1.done || ab(), 20000, 100);
    }

    // ------------------------------------------------------------------ part 1, dame
    async function dame1() {
      await B.walk([0, 0, 7.6], 0.4, 8000);
      await B.walk([0, 0, 17.2], 0.4, 6000);
      await B.walk([0, -1.2, 21.4], 0.4, 4000);
      B.note('reelle', 'dame dans la niche du VI');
      let miss = 0;
      const t0 = performance.now();
      while (X().stage === 1 && X().s1.round < 3 && !ab() && performance.now() - t0 < 600000) {
        const s1 = X().s1;
        const tg = s1.tg[s1.round];
        const q = rel();
        const ground = Player.body.grounded;
        const onMin = ground && W.onMinute(Player.body);
        const am = aMin();
        if (q.y < -4) {
          await B.sl(300); // falling: the checkpoint brings her back to her niche
          continue;
        }
        if (onMin) {
          const p = W.polar(q);
          if (W.hourDist(am, tg) < 0.05 && still()) {
            // the gate is up: walk out into the niche
            await B.walk(handPt(tg, 19.4, -1.2), 0.4, 5000);
            await B.until(() => X().s1.round !== s1.round, 2500, 50);
            B.note('reelle', 'dame descend dans la niche du ' + W.ROMAN[tg] + ' → heure ' + X().s1.round);
            continue;
          }
          // out past the hour hand (the valet waits for it): steer along the hand's current
          // angle every frame, so a turning hand never carries her off its side
          if (p.r < 12.6 && W.hourDist(am, 6) > 0.8) {
            const t1 = performance.now();
            while (!ab() && performance.now() - t1 < 4000 && W.polar(rel()).r < 13.4 && Player.body.grounded) {
              const tp = B.abs(handPt(aMin(), 13.8));
              Cam.yaw = Math.atan2(tp.x - Player.body.p.x, tp.z - Player.body.p.z);
              B.steer(tp);
              Input.sim.x *= 0.6;
              Input.sim.z *= 0.6;
              await B.sl(16);
            }
            B.stop();
            continue;
          }
          await B.sl(100);
          continue;
        }
        const ni = W.nicheAt(q);
        if (ni >= 0 && W.hourDist(am, ni) < 0.05 && still()) {
          if (ni === 6) {
            // the VI pier, then the minute hand just past its end
            for (let k = 0; k < 3 && rel().y < -0.5 && !ab(); k++) {
              await B.leap([0, 0, 25.5], { ms: 1500 });
              await settle();
            }
            await B.walk(handPt(6, 9.6), 0.3, 4000);
            await settle();
            B.note('reelle', 'dame monte sur la grande aiguille au VI (onMinute=' + W.onMinute(Player.body) + ')');
          } else {
            // jump only while the hand stands still in front of the niche; if it leaves, wait in the
            // niche for the valet to bring it back (the outer loop)
            const there = () => W.hourDist(aMin(), ni) < 0.05 && still();
            let ok = false;
            let k = 0;
            for (; k < 3 && !ok && there() && !ab(); k++) {
              await B.walk(handPt(ni, 19.8, -1.2), 0.4, 2000);
              if (!there()) break;
              B.face(handPt(ni, 14));
              await B.leap(handPt(ni, 14.6), { ms: 1800 });
              await settle();
              ok = W.onMinute(Player.body);
            }
            if (ok || W.nicheAt(rel()) !== ni) {
              B.note('reelle', 'dame remonte sur la grande aiguille depuis le ' + W.ROMAN[ni] + ' : ' + ok);
            } else if (k >= 3 && there()) {
              miss++;
              B.note('reelle', 'dame remonte sur la grande aiguille depuis le ' + W.ROMAN[ni] + ' : raté 3 fois (aiguille en place)');
              if (miss >= 2) {
                B.tp(handPt(ni, 14.6, 0.1), 'saut de la niche (-1,2 m) sur la grande aiguille raté 6 fois, aiguille en place');
                await settle();
              }
            } else B.note('reelle', 'dame reste dans la niche du ' + W.ROMAN[ni] + ' : l’aiguille est repartie pendant le saut');
          }
          continue;
        }
        // off the hand on the VI pier (the turning hand sets a rider down on it): once the valet
        // has brought the hand back to VI, straight onto it; else into the VI niche when it opens
        if (ni < 0 && q.y > -0.8 && Math.abs(q.x) < 2.6 && q.z < 30 && Player.body.grounded && W.hourDist(am, 6) < 0.05 && still()) {
          await B.walk(handPt(6, 9.6), 0.3, 4000);
          await settle();
          B.note('reelle', 'dame reprend la grande aiguille depuis le ponton du VI (onMinute=' + W.onMinute(Player.body) + ')');
          continue;
        }
        if (ni < 0 && q.y > -0.8 && Math.abs(q.x) < 2.6 && q.z < 30 && Player.body.grounded && s1.round === 0) {
          await B.walk([0, -1.2, 21.4], 0.4, 6000);
          continue;
        }
        await B.sl(150);
      }
      // final: stay in the XII niche while the valet sets six o'clock
      B.note('reelle', 'dame attend dans la niche du XII');
      await B.until(() => X().s1.done || X().stage !== 1 || ab(), 240000, 200);
      // wait for the valet to come across before leaving (both must pass z 62)
      await B.until(() => { const m = mate(); return (m && m.z > 50) || X().stage !== 1; }, 120000, 200);
    }

    // ------------------------------------------------------------------ part 2
    function echoZ() {
      const e = X().s2.echo;
      if (!e || e.go == null) return null;
      const n = Math.floor(e.pts.length / 6);
      const i = Math.min(n - 1, Math.max(0, Math.floor((D().clk - e.go) * 15)));
      return e.pts[i * 6 + 2];
    }
    async function dame2() {
      await B.walk([4, 0, 75.5], 0.4, 6000);
      await B.walk([6, 0, 77], 0.25, 4000);
      await B.tap('ability'); // record
      await B.until(() => X().s2.rec, 1500, 30);
      await B.sl(2200);
      await B.tap('ability'); // stop: the echo stays on the plate
      await B.until(() => X().s2.echo && X().s2.echo.who === 'dame', 3000, 50);
      await B.sl(200);
      await B.tap('ability'); // launch
      await B.until(() => X().s2.echo && X().s2.echo.go != null, 2000, 50);
      B.note('reelle', 'dame enregistre un écho sur la dalle est (F, F) et le lance (F)');
      await B.until(() => (D().bridge || 0) > 0.97 || ab(), 40000, 100);
      await B.walk([0, 0, 83.4], 0.3, 6000);
      await B.walk([0, 0, 97.6], 0.3, 6000);
      await B.walk([0, 0, 102.5], 0.3, 4000);
      await B.until(() => X().s2.latch || ab(), 6000, 100);
      B.note('reelle', 'dame passe le pont, dalle rose : pont fixé = ' + X().s2.latch);
      // the valet records his balcony walk; then she holds the balcony plates for him
      await B.until(() => (X().s2.echo && X().s2.echo.who === 'valet' && X().s2.echo.go == null) || ab(), 90000, 150);
      await B.walk([-5.3, 0, 106], 0.4, 6000);
      for (let i = 0; i < 3 && !ab(); i++) {
        const p = W.PL_B[i];
        await B.walk([p.x, 0, p.z], 0.3, 8000);
        await B.until(() => { const m = mate(); return m && m.z > W.GATES2[i] + 1; }, 40000, 100);
      }
      B.note('reelle', 'dame tient les dalles du balcon pendant que le valet passe les grilles');
      await B.walk([-5.3, 0, 106], 0.4, 8000);
      await B.walk([0, 0, 106], 0.4, 4000);
      await B.walk([0, 0, 109.4], 0.3, 3000);
      B.face([0, 0, 120]);
      await B.tap('ability'); // launch the valet's echo
      await B.until(() => X().s2.echo && X().s2.echo.go != null, 2000, 50);
      B.note('reelle', 'dame lance l’écho du valet (F) et le suit dans la galerie');
      const t1 = performance.now();
      S.held.add('sprint');
      while (performance.now() - t1 < 16000 && !ab()) {
        const ez = echoZ();
        const q = rel();
        if (q.z > 140) break;
        Cam.yaw = 0;
        B.steer(B.abs([0, 0, ez == null ? q.z : Math.min(142, ez + 0.3)]));
        await B.sl(30);
      }
      B.stop();
      await B.walk([-1, 0, 144], 0.4, 5000);
    }
    async function valet2() {
      await B.walk([-4, 0, 75.5], 0.4, 6000);
      await B.walk([-6, 0, 77], 0.25, 4000);
      B.note('reelle', 'valet sur la dalle ouest');
      await B.until(() => X().s2.latch || ab(), 120000, 150);
      await B.walk([0, 0, 83.4], 0.3, 6000);
      await B.walk([0, 0, 97.6], 0.3, 6000);
      await B.walk([-5.3, 0, 106], 0.4, 6000);
      await B.walk([-5.3, 0, 110.5], 0.3, 4000);
      B.face([-5.3, 0, 130]);
      await B.tap('ability');
      await B.until(() => X().s2.rec, 1500, 30);
      await B.walk([-5.3, 0, 133.5], 0.25, 9000);
      await B.tap('ability');
      await B.until(() => X().s2.echo && X().s2.echo.who === 'valet', 4000, 50);
      B.note('reelle', 'valet enregistre son passage sur les trois dalles du balcon (F, F)');
      await B.walk([-5.3, 0, 106], 0.4, 8000);
      await B.walk([0, 0, 106], 0.4, 4000);
      await B.walk([0, 0, 110], 0.3, 3000);
      for (let i = 0; i < 3 && !ab(); i++) {
        const gz = W.GATES2[i];
        await B.walk([0, 0, gz - 1.4], 0.3, 6000);
        await B.until(() => (D().gates2 || [])[i] === 1 || ab(), 40000, 50);
        await B.sl(250);
        await B.walk([0, 0, gz + 1.6], 0.3, 4000);
      }
      B.note('reelle', 'valet passe les trois grilles tenues par la dame');
      await B.walk([1, 0, 144], 0.4, 6000);
    }

    // ------------------------------------------------------------------ part 3
    async function climb() {
      for (const [x, y, z] of W.DEB) {
        for (let k = 0; k < 2; k++) {
          await B.leap([x, y, z], { ms: 1600 });
          await settle();
          if (rel().y > y - 0.3) break;
          if (rel().y < -1) return false;
        }
        await B.walk([x, y, z], 0.35, 1500);
      }
      await B.leap([0, 7, 179.2], { ms: 1800 });
      await settle();
      await B.walk([0, 7, 180.5], 0.4, 3000);
      return rel().y > 6.5;
    }
    function pendX(i) {
      return Math.sin(0.87 * Math.sin(2 * Math.PI * (D().pendPh || 0) + i * 1.9)) * W.PEND_L;
    }
    async function crossPend(dame) {
      await B.walk([0, 7, 213], 0.4, 4000);
      await B.walk([0, 7, 214.6], 0.3, 3000);
      for (const [i, zp] of [
        [0, 217],
        [1, 223.5],
      ]) {
        for (let k = 0; k < 6 && !ab(); k++) {
          if (dame && !(D().slowT > 0) && !(D().slowCd > 0)) await B.tap('ability');
          await B.until(() => D().slowT > 0, dame ? 8000 : 20000, 30);
          const ok = await B.until(() => D().slowT > 0.6 && Math.abs(pendX(i)) > 4.2, 3000, 20);
          if (!ok) continue;
          await B.walk([0, 7, zp + 2.6], 0.3, 1500, true);
          break;
        }
        if (rel().z < zp + 1.8) return false;
      }
      await B.walk([0, 7, 230], 0.4, 3000);
      return rel().z > 228.5 && rel().y > 6;
    }
    async function dame3() {
      await B.until(() => (D().holds || {}).valet === 'J1' && D().fallT === 0, 30000, 50);
      await B.walk([0, 0, 151], 0.4, 6000);
      let up = await climb();
      for (let k = 0; k < 2 && !up && !ab(); k++) {
        await B.until(() => rel().y > -1 && rel().z < 153, 6000, 100);
        await B.walk([0, 0, 151], 0.4, 6000);
        up = await climb();
      }
      if (!up) B.tp([0, 7, 180], 'escalade des débris figés ratée 3 fois');
      B.note('reelle', 'dame monte les débris figés (sauts) jusqu’à la corniche');
      await B.walk([W.LOCK.x - 1.7, 7, W.LOCK.z], 0.4, 4000);
      await B.tap('interact');
      await B.until(() => X().s3.lock, 3000, 50);
      B.note('reelle', 'dame retourne le sablier (E) : ' + X().s3.lock);
      // the valet holds J2: cross the gears, then the pendulums
      await B.until(() => (D().discW || 9) < 0.4 || ab(), 90000, 100);
      await B.walk([0, 7, 187], 0.4, 4000);
      await B.walk([0, 7, 212.5], 0.35, 9000);
      let ok = await crossPend(true);
      for (let k = 0; k < 3 && !ok && !ab(); k++) {
        await B.until(() => Player.body.grounded && rel().y > 6, 8000, 100);
        if (rel().z > 228.5) break;
        await B.walk([0, 7, 212.5], 0.35, 9000);
        ok = await crossPend(true);
      }
      if (rel().z < 228.5) B.tp([0, 7, 230], 'traversée des balanciers ratée 4 fois');
      B.note('reelle', 'dame a traversé engrenages et balanciers (F : temps ralenti)');
      // hold J3 for the valet, and slow time when he reaches the pendulums
      await B.walk([W.J3.x - 1.2, 7, W.J3.z], 0.35, 4000);
      S.held.add('interact');
      const t1 = performance.now();
      while (!ab() && performance.now() - t1 < 120000) {
        const m = mate();
        if (m && m.z > 228.5) break;
        if (m && m.z > 211 && !(D().slowT > 0) && !(D().slowCd > 0)) {
          await B.tap('ability');
          S.held.add('interact');
        }
        await B.sl(100);
      }
      S.held.delete('interact');
    }
    async function valet3() {
      await B.walk([W.J1.x + 1.2, 0, W.J1.z], 0.35, 5000);
      S.held.add('interact');
      B.note('reelle', 'valet tient le frein J1 (E maintenu)');
      await B.until(() => X().s3.lock || ab(), 120000, 100);
      S.held.delete('interact');
      await B.until(() => D().fallT === 0, 8000, 50);
      await B.walk([0, 0, 151], 0.4, 6000);
      let up = await climb();
      for (let k = 0; k < 2 && !up && !ab(); k++) {
        await B.until(() => rel().y > -1 && rel().z < 153, 6000, 100);
        await B.walk([0, 0, 151], 0.4, 6000);
        up = await climb();
      }
      if (!up) B.tp([0, 7, 180], 'escalade des débris ratée 3 fois');
      await B.walk([W.J2.x + 1.2, 7, W.J2.z], 0.35, 5000);
      S.held.add('interact');
      B.note('reelle', 'valet tient le frein J2 : les engrenages s’arrêtent pour la dame');
      await B.until(() => { const m = mate(); return m && m.z > 228.5 && (D().holds || {}).dame === 'J3'; }, 180000, 100);
      S.held.delete('interact');
      await B.walk([0, 7, 187], 0.4, 4000);
      await B.walk([0, 7, 212.5], 0.35, 9000);
      let ok = await crossPend(false);
      for (let k = 0; k < 3 && !ok && !ab(); k++) {
        await B.until(() => Player.body.grounded && rel().y > 6, 8000, 100);
        if (rel().z > 228.5) break;
        await B.walk([0, 7, 212.5], 0.35, 9000);
        ok = await crossPend(false);
      }
      if (rel().z < 228.5) B.tp([0, 7, 230], 'traversée des balanciers ratée 4 fois');
      B.note('reelle', 'valet a traversé (temps ralenti par la dame)');
    }

    // ------------------------------------------------------------------ part 4
    async function part4() {
      let tries = 0;
      let hits = 0;
      for (let i = 0; i < 3 && !ab(); i++) {
        const off = me === 'dame' ? -1.9 : 1.9;
        const sp = () => {
          const v = W.stPos(i, 13.3, off);
          return [v.x, 7, v.z];
        };
        const lever = W.stPos(i, 14.4, off);
        const near = () => Math.hypot(rel().x - lever.x, rel().z - lever.z) < 1.4;
        B.note('reelle', 'engrenage ' + (i + 1) + ' : ' + (me === 'dame' ? 'dame tient le frein' : 'valet enfonce la cale sur le tac'));
        const t0 = performance.now();
        while (!X().s4.jam[i] && X().stage === 4 && !ab() && performance.now() - t0 < 240000) {
          if (Player.mode === 'frozen') {
            hits++;
            S.held.delete('interact');
            await B.until(() => Player.mode !== 'frozen', 3000, 30);
            await settle();
          }
          if (!near()) {
            S.held.delete('interact');
            await B.go(sp(), { near: 0.4, ms: 15000 });
          }
          if (me === 'dame') {
            S.held.add('interact');
            await B.sl(50);
            continue;
          }
          const d = D();
          if ((d.holds || {}).dame === 'b' + i && (d.brk || [])[i] >= 1.55) {
            const b = d.beat;
            const nb = 2 * Math.ceil(b / 2 + 0.05);
            const dtb = (nb - b) * d.bp;
            if (dtb > 0.05 && dtb < 2.8) {
              await B.sl(Math.max(0, dtb * 1000 - 25));
              if (near()) {
                await B.tap('interact', 60);
                tries++;
              }
              await B.sl(400);
            }
          }
          await B.sl(30);
        }
        S.held.delete('interact');
      }
      B.note('reelle', 'horloger : ' + X().s4.jam.filter(Boolean).length + ' / 3 engrenages, ' + tries + ' cales, ' + hits + ' coups reçus');
    }
  },
};
