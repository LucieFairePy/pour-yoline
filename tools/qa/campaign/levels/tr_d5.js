// ♦ 7 · La Gravité (tr_d5). SWAP: Yoline carries 'valet', William 'dame' — everything below is by
// Story.role (the kit), never by who the page is.
// Stage 1 (turning room): the valet carries both crates (E pick / E drop) onto the floor spots right
//   under the two sealed pillars (the seals are drawn only for the dame: D5.plates), then both hold
//   their lever (E held, dame left / valet right) until the room rolls over; repeated if a crate missed.
// Stage 2 (void hall): the dame takes the gravity beam at the carriage (E) and walks the gallery,
//   the slab follows with the valet on it; in each bubble the valet jumps + double jumps to ring the
//   bell (opens the next gallery gate). At the end the dame lets go (E) and grapples the ring (F).
// Stage 3 (streams): dame on stone 0, valet rides stream 0 and stands on stone 1, dame rides streams
//   0 and 1 and stands on stone 2, valet rides stream 1; both walk into the corridor.
// Stage 4 (orrery): for each ring, the dame holds the crank (E held, F to pick the shorter way round),
//   the valet holds the clutch on another floor; the crank is let go on the target notch (targets
//   are shown on the screens: ♥ ♣ to the dame, ♦ to the valet). Floors by the gravity lifts (east /
//   west columns), down by stepping off the gallery at a railing gap. Both jump at each pulse.
// Stage 5: both walk to the card at the centre.
window.CL = {
  timeout: 1200,
  async run() {
    const W = D5;
    B.W = W;
    const me = Story.role;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const S = Input.sim;
    const log = [];
    const rel = () => W.rel(Player.body.p);
    const mateRel = () => (Remote.has ? W.rel(Remote.pos) : null);
    const grounded = () => Player.body.grounded;
    const settle = (ms = 4000) => B.until(() => grounded(), ms, 40);
    const DEG = Math.PI / 180;
    const OC = W.OC;
    const pol = (r, a, y = 0) => [r * Math.cos(a * DEG), y, OC + r * Math.sin(a * DEG)];
    const angOf = (q) => Math.atan2(q.z - OC, q.x) / DEG;

    const G = [0, W.G1, W.G2];
    let hops = 0;
    const lvOf = (y) => (y > W.G2 - 1 ? 2 : y > W.G1 - 1 ? 1 : 0);
    // walk an arc (r, from the current angle to `to`, in the given direction) on the current floor
    const arc = async (r, to, dir) => {
      const y = rel().y;
      let a = angOf(rel());
      const norm = (v) => ((v % 360) + 360) % 360;
      let left = norm360((to - a) * dir);
      if (left > 359) left = 0;
      let ok = true;
      while (left > 0.5 && !ab()) {
        const st = Math.min(6, left);
        a += st * dir;
        left -= st;
        if (await B.walk(pol(r, a, y), left > 0.5 ? 0.8 : 0.35, 6000, true)) continue;
        // blocked (a station's pedestal stands on the gallery lane): jump over it
        hops++;
        await B.leap(pol(r, a, y), { ms: 1500 });
        await settle();
        if (Math.hypot(rel().x - pol(r, a)[0], rel().z - pol(r, a)[2]) > 1.2) ok = false;
      }
      return ok;
    };
    function norm360(v) {
      return ((v % 360) + 360) % 360;
    }
    function shortDelta(a, b) {
      let d = norm360(b - a);
      if (d > 180) d -= 360;
      return d;
    }
    function shortDir(a, b) {
      return shortDelta(a, b) >= 0 ? 1 : -1;
    }
    // the way round a gallery that passes no other station on that floor (their pedestals stand
    // on the lane, r 18.4: the one you stand next to, 4° away, counts when it is ahead)
    function galleryDir(lv, a, b) {
      const others = Object.values(W.STATION)
        .filter((s) => s.lv === lv)
        .map((s) => s.a);
      const passes = (dir) => {
        const span = norm360((b - a) * dir);
        return others.some((o) => {
          const d = norm360((o - a) * dir);
          return d > 0.5 && d < span - 2;
        });
      };
      const d0 = shortDir(a, b);
      return passes(d0) && !passes(-d0) ? -d0 : d0;
    }

    // ================= stage 1: the turning room =================
    let tries1 = 0;
    while (X().stage === 1 && !ab() && tries1 < 4) {
      tries1++;
      // wait out a turn in progress
      await B.until(() => !X().r1.flip, 10000, 100);
      await B.sl(1200);
      if (X().r1.done) break;
      const s0 = X().r1.s;
      if (s0 === 0 && me === 'valet') {
        // crates onto the floor spots under the two seals (where they fall once the room rolls over)
        if (!W.inCube(rel())) await B.go([1.2, 0, 4], { near: 0.6, ms: 40000 });
        const plates = W.plates.map((p) => [p.x, p.z]);
        const crates = X().r1.crates;
        // pair crates and plates by distance
        const d = (c, p) => Math.hypot(c[0] - p[0], c[2] - p[1]);
        const pair = d(crates[0], plates[0]) + d(crates[1], plates[1]) <= d(crates[0], plates[1]) + d(crates[1], plates[0]) ? [0, 1] : [1, 0];
        for (let i = 0; i < 2 && !ab(); i++) {
          const [px, pz] = plates[pair[i]];
          const cr = X().r1.crates[i];
          if (Math.hypot(cr[0] - px, cr[2] - pz) < 0.5 && cr[1] < 0.3) continue;
          await B.go([cr[0], 0, cr[2] - 1.3], { near: 0.4, ms: 30000 });
          await B.tap('interact');
          await B.until(() => X().r1.crates[i][3] === 'valet', 1500, 50);
          if (X().r1.crates[i][3] !== 'valet') {
            B.note('reelle', 'caisse ' + i + ' pas prise (' + B.rel() + ')');
            continue;
          }
          await B.go([px, 0, pz - 3], { near: 0.4, ms: 30000 });
          await B.walk([px, 0, pz - 1.0], 0.12, 5000);
          await B.sl(400); // the body turns to face +z
          await B.tap('interact');
          await B.until(() => !X().r1.crates[i][3], 1500, 50);
          B.note('reelle', 'valet pose la caisse ' + i + ' sous le sceau (' + px + ',' + pz + ') lu par la dame → ' + JSON.stringify(X().r1.crates[i]));
        }
      } else if (s0 === 0) {
        // the dame reads the seals and waits for the crates
        await B.until(
          () => X().r1.crates.every((c) => !c[3] && W.plates.some((p) => Math.hypot(c[0] - p.x, c[2] - p.z) < 0.6)) || ab(),
          120000,
          200,
        );
      }
      // both levers held together
      const lx = me === 'dame' ? -7 : 7;
      await B.go([lx, 0, 4.6], { near: 0.4, ms: 40000 });
      await B.walk([lx, 0, 4.6], 0.25, 3000);
      B.note('reelle', me + ' tient son levier (E maintenu), sol ' + s0);
      S.held.add('interact');
      await B.until(() => X().r1.flip || ab(), 30000, 50);
      S.held.delete('interact');
      await B.until(() => !X().r1.flip || ab(), 10000, 100);
      await B.sl(1500);
      log.push('tour ' + tries1 + ' s' + X().r1.s + ' sceaux ' + X().r1.seal.join(''));
      B.note('reelle', 'la salle s’est retournée : sol ' + X().r1.s + ', sceaux ' + X().r1.seal.join('') + (X().r1.done ? ', herse ouverte' : ''));
    }
    if (X().stage === 1 && X().r1.done) {
      await B.go([0, 0, 30], { near: 0.6, ms: 30000 });
      await B.walk([0, 0, 36.5], 0.5, 8000);
      await B.until(() => X().stage !== 1 || ab(), 30000, 200);
    }
    if (ab()) return log.join(', ');

    // ================= stage 2: the beam, the slab, the bells =================
    if (X().stage === 2) {
      await B.sl(800);
      const slabZ = () => (W.r2.block ? W.r2.block.position.z - W.O.z : 44);
      if (me === 'dame') {
        await B.go([-12.4, 0, 44], { near: 0.4, ms: 30000 });
        for (let k = 0; k < 3 && !X().r2.grab; k++) {
          await B.tap('interact');
          await B.until(() => X().r2.grab, 1500, 50);
        }
        B.note('reelle', 'dame prend le rayon (E) : ' + X().r2.grab);
        await B.until(() => { const m = mateRel(); return (m && W.onSlab(m, slabZ())) || ab(); }, 60000, 100);
        await B.sl(500);
        const legs = [
          [49.7, 0],
          [59.6, 1],
          [69.5, -1],
        ];
        for (const [cz, gi] of legs) {
          if (ab()) break;
          await B.walk([-12.4, 0, cz], 0.2, 15000);
          if (gi >= 0) {
            await B.until(() => X().r2.gates[gi] || ab(), 120000, 100);
            B.note('reelle', 'cloche ' + (gi + 1) + ' sonnée, grille ouverte');
            await B.sl(1500);
          }
        }
        // the valet steps off the slab, then the beam is let go and the ring grappled
        await B.until(() => { const m = mateRel(); return (m && m.z > 81.5) || ab(); }, 60000, 100);
        if (X().r2.grab) {
          await B.tap('interact');
          await B.until(() => !X().r2.grab, 1500, 50);
        }
        await B.walk([-13, 0, 69.2], 0.3, 5000);
        let over = false;
        for (let k = 0; k < 4 && !over && !ab(); k++) {
          const rp = W.ringPos();
          B.aim(rp);
          await B.sl(250);
          B.aim(rp);
          await B.until(() => Player.lockTarget >= 0, 1500, 30);
          await B.tap('ability');
          if (await B.until(() => Player.mode === 'grapple', 1200, 30)) {
            await B.until(() => Player.mode !== 'grapple', 5000, 30);
            await settle();
            await B.sl(300);
          }
          over = rel().z > 81 && rel().y > -1;
          if (!over && rel().z < 72) await B.walk([-13, 0, 69.2], 0.3, 5000);
        }
        B.note('reelle', 'dame traverse au grappin (F sur l’anneau) : ' + (over ? 'ok' : 'raté'));
        if (!over) B.tp([-12, 0, 86], 'grappin vers l’anneau de la galerie raté 4 fois');
        await B.walk([-4, 0, 85], 0.5, 6000);
      } else {
        await B.walk([0, 0, 44], 0.3, 6000);
        B.note('reelle', 'valet monte sur la dalle');
        for (const [bz, gi] of [
          [52, 0],
          [66, 1],
        ]) {
          await B.until(() => Math.abs(slabZ() - bz) < 0.4 || ab(), 120000, 50);
          await B.sl(700);
          for (let k = 0; k < 5 && !X().r2.gates[gi] && !ab(); k++) {
            // stand in the middle of the slab, jump, double jump at the apex, ride the weak gravity
            await B.walk([0, 0, slabZ()], 0.3, 2000);
            S.held.add('jump');
            await B.sl(60);
            S.held.delete('jump');
            const t1 = performance.now();
            let did = false;
            while (performance.now() - t1 < 5000) {
              B.steer(W.P(0, 0, slabZ()));
              if (!did && Player.body.v.y < 0.5) {
                did = true;
                S.held.add('jump');
                await B.sl(60);
                S.held.delete('jump');
              }
              if (did && grounded()) break;
              await B.sl(16);
            }
            B.stop();
            await B.sl(300);
          }
          B.note('reelle', 'valet saute dans la bulle ' + (gi + 1) + ' (double saut) : cloche ' + (X().r2.gates[gi] ? 'sonnée' : 'ratée'));
        }
        await B.until(() => slabZ() > 79.4 || ab(), 120000, 100);
        await B.sl(400);
        await B.walk([0, 0, 85], 0.5, 6000);
      }
      await B.until(() => X().stage !== 2 || ab(), 60000, 200);
      log.push('salle2 ' + (X().stage >= 3 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ================= stage 3: the streams =================
    if (X().stage === 3) {
      const st = W.stones;
      const stand = async (i) => {
        await B.walk([st[i].x, st[i].y, st[i].z], 0.3, 10000);
        await B.sl(300);
        return W.onStone(rel()) === i;
      };
      // walk into a stream mouth and let it carry you, until grounded past z1 (above y1)
      const ride = async (i, z1, y1) => {
        const A = W.lanes[i].A;
        await B.walk([0, 0, A.z - 1.6], 0.4, 8000);
        const t1 = performance.now();
        while (performance.now() - t1 < 9000 && !ab()) {
          B.steer(W.P(0, 0, A.z + 30));
          Cam.yaw = 0;
          const q = rel();
          if (q.z > z1 && q.y > y1 - 0.3 && grounded()) break;
          await B.sl(30);
        }
        B.stop();
        await B.sl(300);
        const q = rel();
        B.note('reelle', me + ' se laisse porter par le courant ' + (i + 1) + ' → ' + B.rel());
        return q.z > z1 - 0.5 && q.y > y1 - 0.5;
      };
      if (me === 'dame') {
        await stand(0);
        B.note('reelle', 'dame sur la pierre 1');
        await B.until(() => X().r3.stones[1] || ab(), 120000, 100);
        await B.sl(600);
        await ride(0, 100.4, 0);
        await ride(1, 118.4, 4);
        await stand(2);
        B.note('reelle', 'dame sur la pierre 3');
        await B.until(() => { const m = mateRel(); return (m && m.y > 3.5 && m.z > 118) || ab(); }, 120000, 100);
        await B.sl(600);
        await B.walk([-1, 4, 126], 0.4, 6000);
        await B.walk([-1, 4, 131], 0.4, 6000);
      } else {
        await B.until(() => X().r3.stones[0] || ab(), 120000, 100);
        await B.sl(600);
        await ride(0, 100.4, 0);
        await stand(1);
        B.note('reelle', 'valet sur la pierre 2');
        await B.until(() => X().r3.stones[2] || ab(), 120000, 100);
        await B.sl(600);
        await ride(1, 118.4, 4);
        await B.walk([1, 4, 126], 0.4, 6000);
        await B.walk([1, 4, 131], 0.4, 6000);
      }
      await B.until(() => X().stage !== 3 || ab(), 60000, 200);
      log.push('salle3 ' + (X().stage >= 4 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ================= stage 4: the orrery =================
    if (X().stage === 4) {
      // the pulse warning (« Pulsation ! » and the closing blue ring) is read from the level's
      // test hook (window.__d5 = its local state, published when window.__test is set)
      window.__test = 1;
      let stop = false;
      let jumps = 0;
      const dodge = (async () => {
        while (!stop && !ab()) {
          const l = window.__d5;
          if (l && l.pulseT > 0 && l.pulseT < 0.22 && grounded() && !W.inLift(rel())) {
            S.held.add('jump');
            await B.sl(80);
            S.held.delete('jump');
            jumps++;
            await B.sl(400);
          }
          await B.sl(15);
        }
      })();
      // up: into a lift column (0° east or 180° west), ride, step out onto the gallery
      const liftUp = async (lv, a) => {
        await B.walk(pol(rel().y < 1 ? 11.9 : 18.4, a, rel().y), 0.5, 8000, true);
        await B.walk(pol(14.6, a, 0), 0.4, 8000);
        await B.until(() => rel().y > G[lv] + 0.4 || ab(), 15000, 30);
        await B.walk(pol(18.4, a, G[lv]), 0.4, 6000);
        await settle();
        B.note('reelle', me + ' monte par la colonne de gravité ' + (a ? 'ouest' : 'est') + ' à l’étage ' + lv + ' → ' + B.rel());
        return lvOf(rel().y) === lv;
      };
      // down: off the inner edge of a gallery at a railing gap (8° or 172°, clear of the lifts)
      const dropDown = async (a) => {
        await B.walk(pol(15.4, a, rel().y), 0.4, 6000);
        await B.until(() => grounded() && rel().y < 1, 6000, 40);
        await B.walk(pol(11.9, a, 0), 0.4, 6000);
      };
      // go from wherever you are to the station key
      const goStation = async (key) => {
        const s = W.STATION[key];
        const want = s.lv;
        for (let guard = 0; guard < 5 && !ab(); guard++) {
          const lv = lvOf(rel().y);
          const a = norm360(angOf(rel()));
          if (lv === want) {
            if (want === 0) {
              // ground: arc at r 11.9 inside the station ring (clear of the lift columns at 14.6)
              if (Math.hypot(rel().x, rel().z - OC) > 12.6) await B.walk(pol(11.9, a, 0), 0.4, 6000);
              await arc(11.9, s.a, shortDir(a, s.a));
              break;
            }
            // galleries: stop 4° before the station, coming the way that passes no other station
            const dir = galleryDir(want, a, s.a);
            await arc(18.4, s.a - 4 * dir, dir);
            break;
          }
          if (lv === 0) {
            // to the nearer lift
            const la = Math.abs(shortDelta(a, 0)) <= Math.abs(shortDelta(a, 180)) ? 0 : 180;
            await arc(11.9, la, shortDir(a, la));
            await liftUp(want, la);
          } else if (want > lv) {
            const la = Math.abs(shortDelta(a, 0)) <= Math.abs(shortDelta(a, 180)) ? 0 : 180;
            await arc(18.4, la, galleryDir(lv, a, la));
            await B.walk(pol(14.6, la, rel().y), 0.4, 6000);
            await B.until(() => rel().y > G[want] + 0.4 || ab(), 15000, 30);
            await B.walk(pol(18.4, la, G[want]), 0.4, 6000);
            await settle();
          } else {
            const da = Math.abs(shortDelta(a, 8)) < Math.abs(shortDelta(a, 172)) ? 8 : 172;
            await arc(18.4, da, galleryDir(lv, a, da));
            await dropDown(da);
            if (want > 0) continue;
          }
        }
        const ok = W.nearStation(rel()) === key;
        B.note('reelle', me + ' à la station ' + key + ' : ' + (ok ? 'ok' : 'pas atteinte ' + B.rel()));
        return ok;
      };
      const myKey = (k) => (me === 'dame' ? 'crank' : 'clutch') + (k + 1);
      for (let k = 0; k < 3 && !ab(); k++) {
        if (X().r4.locked[k]) continue;
        await goStation(myKey(k));
        const t1 = performance.now();
        while (!X().r4.locked[k] && X().stage === 4 && !ab() && performance.now() - t1 < 240000) {
          const key = myKey(k);
          if (W.nearStation(rel()) !== key && grounded()) {
            S.held.delete('interact');
            await goStation(key);
          }
          const r4 = X().r4;
          if (me === 'dame') {
            const d = (r4.targets[k] - r4.steps[k] + 12) % 12;
            if (d === 0) S.held.delete('interact');
            else {
              const want = d <= 6 ? 1 : -1;
              if (r4.dir[k] !== want) {
                S.held.delete('interact');
                await B.tap('ability');
                await B.until(() => X().r4.dir[k] === want, 1500, 40);
              }
              S.held.add('interact');
            }
          } else S.held.add('interact');
          await B.sl(30);
        }
        S.held.delete('interact');
        B.note('reelle', 'anneau ' + (k + 1) + ' : ' + (me === 'dame' ? 'manivelle lâchée sur la cible' : 'embrayage tenu') + ' → ' + (X().r4.locked[k] ? 'verrouillé' : 'non'));
      }
      await B.until(() => X().stage !== 4 || ab(), 120000, 200);
      stop = true;
      await dodge;
      log.push('orrery ' + (X().stage >= 5 ? 'ok' : 'ko') + ' (' + jumps + ' sauts de pulsation)');
    }
    if (ab()) return log.join(', ');

    // ================= stage 5: the card =================
    await B.until(() => X().stage >= 5 || ab(), 30000, 200);
    const trail = [];
    for (let tries = 0; tries < 3 && rel().y > 1 && !ab(); tries++) {
      const a = norm360(angOf(rel()));
      const da = Math.abs(shortDelta(a, 8)) < Math.abs(shortDelta(a, 172)) ? 8 : 172;
      const from = B.rel();
      const okArc = await arc(18.4, da, galleryDir(lvOf(rel().y), a, da));
      trail.push('arc ' + Math.round(a) + '°→' + da + '° depuis ' + from + (okArc ? '' : ' (marche bloquée)') + ' → ' + B.rel());
      await B.walk(pol(15.4, da, rel().y), 0.4, 6000);
      await B.until(() => grounded() && rel().y < 1, 8000, 40);
      trail.push('bord ' + B.rel());
    }
    const s = me === 'dame' ? -1 : 1;
    const w1 = rel().y < 1 && (await B.walk([s * 6, 0, OC - 6], 0.6, 10000));
    const w2 = w1 && (await B.walk([s * 2.2, 0, OC - 1.0], 0.4, 8000));
    if (w2 && W.nearCard(rel())) B.note('reelle', me + ' à la carte');
    else B.note('reelle', me + ' PAS à la carte ' + B.rel() + (trail.length ? ' (' + trail.join(' ; ') + ')' : ''));
    log.push('carte ' + (W.nearCard(rel()) ? 'ok' : 'ko') + (hops ? ' (' + hops + ' sauts par-dessus un socle)' : ''));
    await B.until(() => Story.S.phase !== 'tr_d5' || ab(), 20000, 200);
    return me + ': ' + log.join(', ');
  },
};
