// tr_c7 « Le Pilote » — campaign solver (both pages). Seats by kit: the dame flies (pilot), the
// valet navigates (turret / grapple / fire-fighting). Everything goes through Input.sim:
//  - on foot (stage 0): walk to one's mooring ring, E; walk to one's seat entry, E;
//  - pilot: the stick (sim.x / sim.z), Maj = boost, Espace = brake (the level's pilotStep reads them);
//  - navigator: the turret turns with the mouse, i.e. the delta of Cam.yaw / Cam.pitch the level
//    reads every frame (update(): local.mdy = Cam.yaw - 0 while flying) — we set that delta the way
//    a mouse move does; clic = attack (turret), F = ability (grapple, held to tear a core), E held
//    on a fire;
//  - stage 6: both walk to the card on the heart.
// The pilot flies "at the navigator's voice": the rockfall gaps, arches, spires, lightning and
// falling rocks it steers by are the ones the navigator's radar / arches show on her screen
// (allowed: shown to one of the players). Nothing writes Story.S or the level's state.
window.CL = {
  timeout: 1500,
  async run() {
    const W = TrC7;
    const L = W.local;
    const S = Input.sim;
    B.W = W;
    const sl = B.sl;
    const X = () => Story.S.x;
    const inLevel = () => Story.S && Story.S.phase === 'tr_c7' && !CL.abort;
    const role = Story.role;
    const mySeat = role === 'dame' ? 'pilot' : 'nav';
    const wrapA = (a) => {
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      return a;
    };
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const PARK_H = 1.27;
    const out = [];
    // ship-local point (x right, z forward of the parked skiff) -> world, on the shelf floor
    const shipP = (lx, lz) => {
      const p = W.shipPoint(V3(lx, -1.2, lz), V3());
      p.y = Player.body.p.y;
      return p;
    };

    // ---------------- stage 0: moorings and seats ----------------
    await B.until(() => W.built && X() && X().moor, 20000);
    if (X().stage === 0) {
      const mi = role === 'dame' ? 0 : 1;
      const castOff = async (i) => {
        if (X().moor[i]) return true;
        const m = W.pad.moor[i];
        await B.walk(V3(m.p.x, Player.body.p.y, m.p.z), 1.3, 20000);
        for (let k = 0; k < 4 && !X().moor[i]; k++) {
          await B.tap('interact');
          await B.until(() => X().moor[i], 1200);
        }
        B.note('reelle', 'amarre ' + i + ' : E près de l’anneau → ' + (X().moor[i] ? 'larguée' : 'PAS larguée'));
        return !!X().moor[i];
      };
      await castOff(mi);
      // the partner's ring too, if it is still tied after a while (both rings are on the shelf)
      if (!(await B.until(() => X().moor[1 - mi], 15000))) {
        B.note('reelle', 'l’autre amarre est encore attachée : j’y vais');
        await castOff(1 - mi);
      }
      // seat entries (level footStep): pilot = ship (2.6, 1.6), nav = ship (-2.6, -1.4); stand
      // beside them, outside the parked skiff's wing collider
      const route = mySeat === 'pilot' ? [shipP(6.5, 2.6), shipP(3.0, 2.0)] : [shipP(-6.6, -3.3), shipP(-3.6, -3.1)];
      for (const p of route) await B.walk(p, 0.45, 12000);
      for (let k = 0; k < 5 && X().seats[mySeat] !== role; k++) {
        await B.tap('interact');
        await B.until(() => X().seats[mySeat] === role, 1500);
        if (X().seats[mySeat] !== role) await B.go(route[1], { near: 0.5, ms: 8000 });
      }
      B.note('reelle', 'place ' + mySeat + ' : E à l’entrée → ' + (X().seats[mySeat] === role ? 'assis' : 'PAS assis ' + JSON.stringify(X().seats)));
      out.push('seat ' + (X().seats[mySeat] === role ? 'ok' : 'FAIL'));
    }
    if (!(await B.until(() => !inLevel() || X().stage >= 1, 120000))) return role + ': ' + out.join(', ') + ', no take-off (' + JSON.stringify(X()).slice(0, 160) + ')';
    if (!inLevel()) return role + ': left the level';
    out.push('take-off');

    // ---------------- flight ----------------
    let lastStage = -1;
    const noteStage = () => {
      const x = X();
      if (x.stage === lastStage) return;
      lastStage = x.stage;
      B.note('reelle', `${mySeat} : section ${x.stage} (coque ${Math.round(x.hull)}, point ${x.cp}, essais ${x.rs}, s=${Math.round(L.view.s)})`);
    };

    const pilotTick = () => {
      const x = X();
      if (x.seats.pilot !== role || x.stage < 1 || x.stage > 5) return;
      const P = L.sim;
      const s = P.s;
      const u = P.u;
      const y = P.p.y - W.O.y;
      let tu = 0;
      let ty = 40;
      let boost = false;
      let brake = false;
      let vyK = 0.12;
      let vyMin = -1;
      if (x.stage === 1) {
        // the gap of the next rockfall (on the navigator's radar), else the next arch (only she sees them)
        const rf = W.ROCKFALLS.find((r) => r.s > s - 4);
        const ar = W.ARCHES.find((a) => a.s > s + 2 && !(x.arch && x.arch[a.i !== undefined ? a.i : W.ARCHES.indexOf(a)]));
        if (rf && rf.s - s < 260) {
          tu = rf.u;
          ty = rf.y;
        } else if (ar && ar.s - s < 200) {
          tu = ar.u;
          ty = ar.y;
        }
      }
      if (x.stage === 2) {
        // the storm: around the spires and the lightning circles of her radar
        const f = W.at(s);
        tu = 0;
        W.SPIRES.forEach((sp) => {
          const ds = sp.s - s;
          if (ds < -6 || ds > 75) return;
          if (Math.abs(tu - sp.u) < sp.r + 8) tu = sp.u + (sp.u > 0 ? -1 : 1) * (sp.r + 10);
        });
        L.strikes.forEach((k) => {
          if (k.t < 2.2 && Math.abs(k.s - s) < 60 && Math.abs(k.u - tu) < 11) tu = k.u + (k.u > tu ? -12 : 12);
        });
        tu = cl(tu, -(f.w - 8), f.w - 8);
      }
      if (x.stage === 3) {
        const h = W.HEARTS.find((hh, i) => hh.s > s + 5 && hh.s - s < 160 && !(x.hearts && x.hearts[i]));
        if (h && x.hull < 90) {
          tu = h.u;
          ty = h.y;
        }
      }
      if (x.stage === 4) {
        // under the mothership, out of the laser walls, ahead of the closing rift
        tu = L.mom.on ? L.mom.u : 0;
        ty = 38;
        L.lasers.forEach((k) => {
          if (k.t > 5.8 || k.s < s - 2 || k.s - s > 160) return;
          const mid = (W.FLOOR + W.ceilAt(k.s)) / 2;
          if (k.mode === 'L') tu = 10;
          if (k.mode === 'R') tu = -10;
          if (k.mode === 'U') ty = mid - 9;
          if (k.mode === 'D') ty = mid + 9;
        });
        if (L.frontS != null && s - L.frontS < 45) boost = true;
      }
      if (x.stage === 5) {
        const toEnd = W.END_S - s;
        boost = toEnd > 260;
        L.strikes.forEach((k) => {
          if (k.k === 'r' && k.t < 2.2 && Math.abs(k.s - s) < 80 && Math.abs(k.u - tu) < 9) tu = k.u + (k.u > tu ? -10 : 10);
        });
        if (toEnd < 170) {
          // the landing: slow, over the middle of the heart, then down gently
          tu = 0;
          const over = W.onHeart(P.p.x, P.p.z, 4) || Math.abs(toEnd) < 6;
          const hs = Math.hypot(P.vh.x, P.vh.z);
          brake = over ? hs > 3 : P.speed > 8;
          ty = over ? W.PLAT_Y + PARK_H : W.PLAT_Y + 8;
          if (over) {
            vyK = 0.25;
            vyMin = -0.32;
          }
        }
        if (P.landed) {
          S.x = 0;
          S.z = 0;
          S.held.delete('jump');
          S.held.delete('sprint');
          return;
        }
      }
      // steer: the skiff's heading vs the track's, toward the wanted lateral offset
      const f = W.at(s);
      const ty0 = Math.atan2(f.tx, f.tz);
      const right = -wrapA(P.yaw - ty0);
      const want = cl((tu - u) * 0.035, -0.55, 0.55);
      S.x = cl((want - right) * 3.2, -1, 1);
      // never let go of the stick (4 s without input and the skiff loses its thrust)
      if (Math.abs(S.x) < 0.15) S.x = S.x < 0 ? -0.15 : 0.15;
      S.z = cl((ty - y) * vyK - P.vy * 0.06, vyMin, 1);
      if (boost) S.held.add('sprint');
      else S.held.delete('sprint');
      if (brake) S.held.add('jump');
      else S.held.delete('jump');
    };

    // the navigator's mouse: the turn this frame (the level reads Cam.yaw/Cam.pitch as a delta)
    const turnTo = (tp, gain = 0.5) => {
      const cam = R.camera;
      const fw = V3(0, 0, -1).applyQuaternion(cam.quaternion);
      const wv = tp.clone().sub(cam.position).normalize();
      const dy = wrapA(Math.atan2(wv.x, wv.z) - Math.atan2(fw.x, fw.z)) * gain;
      const dp = (Math.asin(cl(wv.y, -1, 1)) - Math.asin(cl(fw.y, -1, 1))) * gain;
      Cam.yaw = cl(dy, -0.5, 0.5);
      Cam.pitch = 0.18 - cl(dp, -0.5, 0.5);
    };
    const debrisAt = (k) => {
      const k2 = cl(k.t / 2.2, 0, 1);
      const top = W.at(k.s).rim + 30;
      return W.world(k.s, k.u, top - (top - W.FLOOR) * k2 * k2);
    };
    let grabT = 0;
    const counts = { shots: 0, ext: 0 };
    const navTick = () => {
      const x = X();
      if (x.seats.nav !== role || x.stage < 1 || x.stage > 5) return;
      const N = L.nav;
      const V = L.view;
      let tp = null;
      let mode = null;
      // fires on the hull first
      const fi = (x.fires || []).findIndex((f) => f);
      if (fi >= 0) {
        tp = W.shipPoint(W.SHIP_FIRES[fi], V3());
        mode = 'fire';
      }
      if (!tp && N.g && N.g.st === 2 && N.g.kind === 1) mode = 'pull';
      if (!tp && !mode) {
        let best = null;
        let bd = 1e9;
        const cand = [];
        if (x.stage >= 3 && x.stage <= 4) {
          L.drones.forEach((d) => cand.push(W.world(d.s, d.u, d.y)));
          L.bolts.forEach((b) => cand.push(b.p.clone()));
          L.mines.forEach((m) => cand.push(m.p.clone()));
        }
        if (x.stage === 5)
          L.strikes.forEach((k) => {
            if (k.k === 'r' && k.t < 2.0) cand.push(debrisAt(k));
          });
        cand.forEach((p) => {
          const d = p.distanceTo(V.p);
          if (d < bd && d < 230) {
            bd = d;
            best = p;
          }
        });
        if (x.stage === 4 && x.boss === 1 && L.mom.on && W.mom.g && W.mom.g.visible) {
          W.mom.g.updateMatrixWorld(true);
          const i = W.CORES.findIndex((c, k) => !x.cores[k]);
          if (i >= 0 && (!best || bd > 60)) {
            best = W.CORES[i].clone().applyMatrix4(W.mom.g.matrixWorld);
            mode = L.shield[i] > 0 ? 'shoot' : 'grab';
          }
        }
        if (x.stage === 3 && !best) {
          const hi = W.HEARTS.findIndex((h, i) => !(x.hearts && x.hearts[i]) && h.s > V.s && h.s - V.s < 90);
          if (hi >= 0) {
            best = W.world(W.HEARTS[hi].s, W.HEARTS[hi].u, W.HEARTS[hi].y);
            mode = 'grab';
          }
        }
        tp = best;
        if (tp && !mode) mode = 'shoot';
      }
      if (tp) turnTo(tp);
      if (mode === 'shoot') {
        S.held.add('attack');
        counts.shots++;
      } else S.held.delete('attack');
      if (mode === 'fire') S.held.add('interact');
      else S.held.delete('interact');
      if (mode === 'grab' && N.lock && !N.g) {
        S.held.add('ability');
        grabT = 0.1;
      }
      if (mode === 'pull') S.held.add('ability');
      else if (mode !== 'grab' || grabT <= 0) S.held.delete('ability');
      grabT -= 0.016;
    };

    const t0 = performance.now();
    let lastS = -1;
    let lastSt = performance.now();
    let hint = false;
    while (inLevel() && X().stage >= 1 && X().stage <= 5) {
      noteStage();
      if (!hint && mySeat === 'pilot') {
        hint = true;
        B.note('reelle', 'pilote : stick / Maj / Espace ; vole à la voix de la navigation (passages, arches, aiguilles, foudre, rochers lus là où son radar les montre)');
      }
      try {
        if (mySeat === 'pilot') pilotTick();
        else navTick();
      } catch (e) {
        B.note('reelle', 'erreur du solveur : ' + (e && e.message));
        await sl(500);
      }
      // progress watch (a note when the flight stalls for a long time)
      if (Math.abs(L.view.s - lastS) > 30) {
        lastS = L.view.s;
        lastSt = performance.now();
      } else if (performance.now() - lastSt > 90000) {
        lastSt = performance.now();
        B.note('reelle', `${mySeat} : pas de progrès depuis 90 s (section ${X().stage}, s=${Math.round(L.view.s)}, vagues ${JSON.stringify(X().waves)}, noyaux ${JSON.stringify(X().cores)})`);
      }
      await sl(16);
    }
    S.x = 0;
    S.z = 0;
    ['attack', 'ability', 'interact', 'jump', 'sprint'].forEach((a) => S.held.delete(a));
    noteStage();
    out.push('flight ' + Math.round((performance.now() - t0) / 1000) + ' s' + (mySeat === 'nav' ? ' (' + counts.shots + ' ticks de tir)' : ''));
    if (!inLevel()) return role + ': ' + out.join(', ');

    // ---------------- stage 6: to the card on the heart ----------------
    await B.until(() => X().stage >= 6 && X().cardP && !Player.locked, 15000);
    await sl(600);
    const cp = X().cardP;
    if (cp) {
      const side = role === 'dame' ? 1 : -1;
      const tgt = V3(cp[0], Player.body.p.y, cp[1] + side * 1.0);
      let ok = await B.walk(tgt, 0.6, 20000);
      if (!ok) ok = await B.go(tgt, { near: 0.8, ms: 20000 });
      B.note('reelle', 'à pied jusqu’à la carte sur le cœur → ' + (ok ? 'arrivé' : 'pas arrivé ' + B.where()));
      out.push('card ' + (ok ? 'ok' : 'FAIL'));
      await B.until(() => !inLevel(), 15000);
    } else out.push('no cardP');
    return role + ' (' + mySeat + '): ' + out.join(', ');
  },
};
