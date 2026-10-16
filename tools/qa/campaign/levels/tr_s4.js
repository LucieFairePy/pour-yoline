// ♠ 6 · La Tour (tr_s4). Kits SWAPPED: Yoline carries 'valet' (double jump, sword), William 'dame'
// (grapple, rifle). Everything below is decided by Story.role (the kit), never by Story.me.
// Stage 1: the cog hall. Dame-kit holds the floor brake f (hold E) while the valet-kit climbs the
//   cogs (ring 0 → 1 → 2 → balcony, jump + double jump onto the slowed discs); then the valet-kit
//   holds the balcony brake m while the dame-kit climbs. Both cross the steps and the bridge onto
//   the lift. Fallback after 3 min of failed hops: labelled teleport onto the balcony.
// Stage 2: the lift. The crank (hold E at the centre) is the valet-kit's below half, the dame-kit's
//   above; the other one fights the pawns (rifle aimed down the sights / sword); on a jam both
//   break the red locks. A downed partner is revived (hold E beside them).
// Stage 3: the currents. Dame-kit grapples the three rings (aim + F); valet-kit rides the three
//   updraft columns when they blow (the wind clock W.v.wt: what the dame-kit sees and calls out),
//   then both climb the wall stairs to the summit.
// Stage 4: the Sentinelle. Valet-kit stays in sword reach and cracks the guard (4-5 blows), the
//   dame-kit keeps ~10 m away and fires at the open heart while it is stunned; both sidestep the
//   slam / sweep telegraphs, shoot / cut the phase-2 pawns.
// Stage 5: both stand at the card for the bell.
window.CL = {
  timeout: 1500,
  async run() {
    const W = TrS4;
    B.W = W;
    const me = Story.role;
    const dame = me === 'dame';
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const S = Input.sim;
    const log = [];
    const body = Player.body;
    const rel = () => W.rel(body.p);
    const deg = (a) => (a * Math.PI) / 180;
    const pol = (a, r, y) => [Math.cos(deg(a)) * r, y, Math.sin(deg(a)) * r];
    const settle = () => B.until(() => body.grounded && Player.mode === 'walk', 3000, 30);
    const release = () => {
      ['interact', 'attack', 'aim', 'sprint', 'jump'].forEach((k) => S.held.delete(k));
      B.stop();
    };

    // ---- a jump (+ double jump at the apex) toward a target that may move: tgt(tl) gives the
    // relative point where it will be in tl seconds (same steering as B.leap, re-aimed each frame)
    const hop = async (tgt, o = {}) => {
      S.held.add('sprint');
      const toW = (p) => W.P(p[0], p[1], p[2]);
      let p = toW(tgt(0.85));
      const t0 = performance.now();
      while (performance.now() - t0 < (o.run || 0)) {
        p = toW(tgt(0.85 + (o.run - (performance.now() - t0)) / 1000));
        Cam.yaw = Math.atan2(p.x - body.p.x, p.z - body.p.z);
        B.steer(p);
        await B.sl(16);
      }
      Cam.yaw = Math.atan2(p.x - body.p.x, p.z - body.p.z);
      B.steer(p);
      S.held.add('jump');
      await B.sl(50);
      S.held.delete('jump');
      let dj = false;
      const t1 = performance.now();
      await B.sl(80);
      while (performance.now() - t1 < 2500) {
        const disc = body.v.y * body.v.y + 52 * (body.p.y - p.y);
        const tl = Math.max(0.12, disc > 0 ? (body.v.y + Math.sqrt(disc)) / 26 : 0.12);
        p = toW(tgt(tl));
        const wx = (p.x - body.p.x) / tl - body.v.x;
        const wz = (p.z - body.p.z) / tl - body.v.z;
        const m = Math.hypot(wx, wz);
        if (m > 0.05) {
          B.steer(V3(body.p.x + wx, 0, body.p.z + wz));
          S.x *= Math.min(1, m / 1.5);
          S.z *= Math.min(1, m / 1.5);
        } else {
          S.x = 0;
          S.z = 0;
        }
        if (!dj && body.v.y <= 0.5) {
          dj = true;
          S.held.add('jump');
          await B.sl(50);
          S.held.delete('jump');
        }
        if (body.grounded && performance.now() - t1 > 200) break;
        await B.sl(16);
      }
      B.stop();
      await settle();
    };

    // ---- the cogs ----
    const omega = () => ((X().brk || []).length ? 0.12 : 0.48);
    const discAt = (d, dt) => {
      const ring = W.RINGS[d.ring];
      const a = Math.atan2(d.z, d.x) + ring.dir * omega() * dt;
      return [Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r];
    };
    const onRing = () => {
      const d = W.discUnder(body);
      return d ? d.ring : -1;
    };
    const climb = async () => {
      const t0 = performance.now();
      let hops = 0;
      while (!ab() && performance.now() - t0 < 180000) {
        const q = rel();
        if (q.y > 9.2 && q.x > 12) return hops;
        if (!(X().brk || []).length) {
          await B.sl(200);
          continue;
        }
        const r = onRing();
        if (r < 0 && q.y < 1) {
          // floor: stand outside ring 0 at 90°, hop onto a disc as it comes by
          await B.go([0, 0, 13.7], { near: 0.5, ms: 30000 });
          B.face([0, 0, 11]);
          const ok = await B.until(() => {
            return W.discs.some((d) => {
              if (d.ring !== 0) return false;
              const [x, , z] = discAt(d, 0.9);
              return Math.hypot(x, z - 11) < 0.6;
            });
          }, 20000, 30);
          if (!ok) continue;
          const d = W.discs.filter((dd) => dd.ring === 0).sort((a, b) => {
            const pa = discAt(a, 0.9);
            const pb = discAt(b, 0.9);
            return Math.hypot(pa[0], pa[2] - 11) - Math.hypot(pb[0], pb[2] - 11);
          })[0];
          await hop((tl) => discAt(d, tl), { run: 120 });
          hops++;
          continue;
        }
        if (r >= 0 && r < 2) {
          // next ring: wait for one of its discs to pass within reach
          const nr = r + 1;
          let best = null;
          await B.until(() => {
            if (onRing() !== r) return true;
            const mq = rel();
            best = W.discs.find((d) => {
              if (d.ring !== nr) return false;
              const [x, , z] = discAt(d, 0.9);
              return Math.hypot(x - mq.x, z - mq.z) < 4.6;
            });
            return !!best;
          }, 30000, 30);
          if (!best || onRing() !== r) continue;
          const d = best;
          await hop((tl) => discAt(d, tl), { run: 140 });
          hops++;
          continue;
        }
        if (r === 2) {
          // the balcony (x 12.4..16, z ±3.6, y 9.6): when the disc swings past 0°
          const ok = await B.until(() => {
            if (onRing() !== 2) return true;
            const mq = rel();
            return Math.abs(mq.z) < 2.2 && mq.x > 9;
          }, 60000, 30);
          if (!ok || onRing() !== 2) continue;
          await hop(() => [14, 9.6, clamp(rel().z, -2.4, 1.2)], { run: 100 });
          hops++;
          continue;
        }
        // in between (ledge, wall, mid-air): let it settle, drop to the floor
        await B.sl(300);
        if (onRing() < 0 && rel().y > 1 && !(rel().y > 9.2 && rel().x > 12)) await B.walk([0, 0, 0], 0.5, 1200);
      }
      return -1;
    };

    // ================= stage 1 =================
    if (X().stage === 1) {
      const holdLever = async (id, stand, until) => {
        await B.go(stand, { near: 0.4, ms: 40000 });
        B.face([W.LEVERS[id].x, 0, W.LEVERS[id].z]);
        S.held.add('interact');
        await B.until(() => (X().brk || []).includes(id), 3000, 50);
        B.note('reelle', me + ' tient le frein ' + id + ' (E maintenu) : ' + JSON.stringify(X().brk));
        await B.until(() => until() || ab() || X().stage !== 1, 400000, 150);
        S.held.delete('interact');
      };
      const mateRel = () => (Remote.has ? W.rel(Remote.pos) : V3(0, -9, 0));
      const onBalcony = (q) => q.y > 9.2 && q.x > 12;
      if (dame) {
        // floor brake while the valet-kit climbs, until the balcony brake is held
        await holdLever('f', [-12.1, 0, 0], () => onBalcony(mateRel()) && (X().brk || []).includes('m'));
      } else {
        await B.until(() => (X().brk || []).includes('f') || ab(), 60000, 100);
      }
      if (ab()) return log.join(' ');
      const hops = await climb();
      if (hops < 0) {
        B.tp([14, 9.7, -1.5], 'la grimpée sur les engrenages (sauts sur disques mobiles) a échoué en 3 min');
        await B.sl(500);
      }
      B.note('reelle', me + ' grimpe les engrenages jusqu’au balcon (' + hops + ' sauts)');
      log.push('engrenages ' + hops);
      if (!dame) {
        // the balcony brake for the dame-kit
        await holdLever('m', [14.0, 9.6, 0.5], () => onBalcony(mateRel()));
      }
      // the steps and the bridge, onto the lift
      await B.walk([12.6, 9.6, 0], 0.4, 5000);
      await B.walk([5.5, 12, 0], 0.4, 8000, true);
      await B.walk([dame ? -1.4 : 1.4, 12, dame ? -1 : 1], 0.4, 5000);
      B.note('reelle', me + ' sur le monte-charge');
      await B.until(() => X().stage !== 1 || ab(), 120000, 150);
    }
    if (ab()) return log.join(' ');

    // ---- fighting helpers ----
    const foes = (type) => [...Enemies.list.values()].filter((e) => !e.dead && e.hp > 0 && (!type || e.type === type));
    const centre = (e) => V3(e.pos.x, e.pos.y + (e.type === 'pion' ? 1 : ((Enemies.TYPES[e.type] || {}).height || 2) * 0.55), e.pos.z);
    let swingT = 0;
    const fight = async (e) => {
      if (dame) {
        S.held.add('aim');
        B.aim(centre(e));
        if (Combat.mag <= 0) S.held.delete('attack');
        else S.held.add('attack');
      } else {
        const d = Math.hypot(e.pos.x - body.p.x, e.pos.z - body.p.z);
        if (d > 2.4) {
          B.steer(e.pos);
          Cam.yaw = Math.atan2(e.pos.x - body.p.x, e.pos.z - body.p.z);
        } else {
          B.stop();
          Cam.yaw = Math.atan2(e.pos.x - body.p.x, e.pos.z - body.p.z);
          if (performance.now() - swingT > 620) {
            swingT = performance.now();
            await B.tap('attack', 60);
          }
        }
      }
    };
    const revive = async () => {
      // the partner is down: go to them, hold E beside them
      const rs = Remote.state || {};
      if (!rs.down || Combat.down) return false;
      release();
      await B.walk(Remote.pos, 1.2, 6000);
      S.held.add('interact');
      await B.until(() => !(Remote.state || {}).down || Combat.down || ab(), 4000, 100);
      S.held.delete('interact');
      B.note('reelle', me + ' relève son partenaire (E maintenu)');
      return true;
    };

    // ================= stage 2: the lift =================
    if (X().stage === 2) {
      let lastNeed = '';
      let jams = 0;
      while (X().stage === 2 && !ab()) {
        const x = X();
        const need = x.half ? 'dame' : 'valet';
        const ly = W.v ? W.v.ly : x.ly;
        if (need !== lastNeed) {
          lastNeed = need;
          B.note('reelle', 'monte-charge : ' + (need === me ? me + ' tourne la manivelle (E maintenu)' : me + ' couvre ' + need));
        }
        if (Combat.down) {
          release();
          await B.sl(300);
          continue;
        }
        if (await revive()) continue;
        const locks = foes('verrou');
        if (x.jam && locks.length) {
          if (S.held.has('interact')) {
            S.held.delete('interact');
            jams++;
          }
          const q = body.p;
          locks.sort((a, b) => a.pos.distanceTo(q) - b.pos.distanceTo(q));
          await fight(locks[0]);
          await B.sl(50);
          continue;
        }
        if (me === need) {
          S.held.delete('attack');
          S.held.delete('aim');
          const q = rel();
          if (Math.hypot(q.x, q.z - 0.3) > 0.6) {
            S.held.delete('interact');
            await B.walk([0, ly, 0.3], 0.4, 3000);
          }
          S.held.add('interact');
          await B.sl(100);
          continue;
        }
        S.held.delete('interact');
        const pions = foes('pion');
        if (pions.length) {
          const q = body.p;
          pions.sort((a, b) => a.pos.distanceTo(q) - b.pos.distanceTo(q));
          await fight(pions[0]);
        } else {
          S.held.delete('attack');
          S.held.delete('aim');
          if (dame && Combat.mag < 15) await B.tap('reload');
          const q = rel();
          if (Math.hypot(q.x, q.z) > 2.8 || Math.hypot(q.x, q.z) < 1.4) await B.walk([dame ? -2 : 2, ly, -0.5], 0.4, 2000);
        }
        await B.sl(50);
      }
      release();
      log.push('monte-charge (' + jams + ' blocages)');
    }
    if (ab()) return log.join(' ');

    // ================= stage 3: the currents =================
    const walkArc = async (a0, a1, r, y) => {
      const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 12));
      for (let i = 1; i <= n; i++) await B.walk(pol(a0 + ((a1 - a0) * i) / n, r, y), 0.5, 5000, true);
    };
    if (X().stage === 3) {
      await B.sl(600);
      const angNow = () => (Math.atan2(rel().z, rel().x) * 180) / Math.PI;
      if (dame) {
        const grapple = async (i, okFn) => {
          for (let k = 0; k < 4 && !ab(); k++) {
            const rp = W.ringPos(i);
            B.aim(rp);
            await B.sl(200);
            B.aim(rp);
            await B.tap('ability');
            if (await B.until(() => Player.mode === 'grapple', 1200, 30)) {
              await B.until(() => Player.mode !== 'grapple', 4000, 30);
              await settle();
              await B.sl(300);
            }
            if (okFn()) return true;
          }
          return false;
        };
        // ring 0 from the floor (~6 m aside: the camera pitch is clamped), ring 1 from the far end of S1, ring 2 from S2 at 250°
        await B.go(pol(75, 9.5, 42), { near: 0.5, ms: 30000 });
        if (!(await grapple(0, () => Math.abs(rel().y - 50) < 0.6))) B.tp(W.RINGS_G[0].land, 'grappin vers l’anneau 1 raté 4 fois');
        await walkArc(112, 172, 14, 50);
        if (!(await grapple(1, () => Math.abs(rel().y - 58) < 0.6))) B.tp(W.RINGS_G[1].land, 'grappin vers l’anneau 2 raté 4 fois');
        await walkArc(204, 250, 14, 58);
        if (!(await grapple(2, () => Math.abs(rel().y - 66) < 0.6))) B.tp(W.RINGS_G[2].land, 'grappin vers l’anneau 3 raté 4 fois');
        B.note('reelle', 'dame (kit) : trois anneaux au grappin (F), jusqu’au palier 66');
      } else {
        const phase = (i) => ((((W.v ? W.v.wt : 0) + W.COLS[i].ph) % 6.6) + 6.6) % 6.6;
        const ride = async (i, exit, wait) => {
          const cl = W.COLS[i];
          for (let k = 0; k < 4 && !ab(); k++) {
            await B.walk(wait, 0.4, 8000);
            // the dame-kit calls « maintenant » when the wind rises
            await B.until(() => phase(i) < 0.4, 9000, 20);
            const t0 = performance.now();
            while (performance.now() - t0 < 4500 && rel().y < cl.y1 - 0.6) {
              B.steer(W.P(cl.x, 0, cl.z));
              Cam.yaw = Math.atan2(W.P(cl.x, 0, cl.z).x - body.p.x, W.P(cl.x, 0, cl.z).z - body.p.z);
              await B.sl(16);
            }
            B.stop();
            if (rel().y < cl.y1 - 1.2) continue;
            await B.walk(exit, 0.4, 3000, true);
            await settle();
            if (Math.abs(rel().y - exit[1]) < 0.6) return true;
          }
          return false;
        };
        const c = W.COLS;
        let ok = await ride(0, [0, 50, 14], [0, 42, 13.4]);
        if (!ok) B.tp([0, 50, 14], 'courant 1 : montée ratée 4 fois');
        await walkArc(90, 176, 14, 50);
        ok = await ride(1, [-14, 58, 0], pol(176, 12.9, 50));
        if (!ok) B.tp([-14, 58, 0], 'courant 2 : montée ratée 4 fois');
        await walkArc(180, 266, 14, 58);
        ok = await ride(2, [0, 66, -14.2], pol(266, 13, 58));
        if (!ok) B.tp([0, 66, -14.2], 'courant 3 : montée ratée 4 fois');
        void c;
        B.note('reelle', 'valet (kit) : trois courants pris quand le vent souffle (annoncé par la dame-kit), jusqu’au palier 66');
      }
      // the stairs along the wall: 296° on the 66 floor, then 20 steps up to the summit
      let a = angNow();
      if (a < 0) a += 360;
      await walkArc(a, 296, 14.5, 66);
      for (let i = 0; i < 20 && !ab(); i++) await B.walk(pol(300 + i * 4.1, 14.5, 66 + 0.4 * (i + 1)), 0.4, 3000);
      await B.walk(pol(386, 14.5, 74), 0.4, 3000);
      await B.walk(pol(dame ? 30 : 20, 10, 74), 0.5, 4000);
      B.note('reelle', me + ' au sommet (onSummit=' + W.onSummit(rel()) + ')');
      if (!W.onSummit(rel())) B.tp(pol(25, 10, 74.1), 'escalier du mur : sommet pas atteint');
      await B.until(() => X().stage !== 3 || ab(), 120000, 150);
      log.push('courants');
    }
    if (ab()) return log.join(' ');

    // ================= stage 4: the Sentinelle =================
    if (X().stage === 4) {
      let lastSt = -1;
      let stuns = 0;
      let wasStun = false;
      let side = 1;
      while (X().stage === 4 && !ab()) {
        if (Combat.down) {
          release();
          await B.sl(300);
          continue;
        }
        if (await revive()) continue;
        const b = Enemies.boss();
        if (!b) {
          release();
          await B.sl(200);
          continue;
        }
        const bp = W.rel(b.pos);
        const q = rel();
        const ang = Math.atan2(q.z - bp.z, q.x - bp.x);
        const dist = Math.hypot(q.x - bp.x, q.z - bp.z);
        const stun = b.stun > 0;
        if (stun && !wasStun) stuns++;
        wasStun = stun;
        // a telegraphed slam (on where we stand) or sweep (toward the nearest): sidestep once
        const st = b.st || 0;
        if ((st === 1 || st === 2) && lastSt !== st) {
          lastSt = st;
          side = -side;
          const want = dame ? 10 : 3.6;
          const a2 = ang + (side * 3.6) / Math.max(2, dist);
          S.held.delete('attack');
          await B.walk([bp.x + Math.cos(a2) * want, 74, bp.z + Math.sin(a2) * want], 0.5, 1100, true);
          continue;
        }
        if (st !== 1 && st !== 2) lastSt = st;
        if (dame) {
          // keep ~10 m (inside the summit, clear of the stairwell)
          if (dist < 8.5 || dist > 11.5) {
            const a2 = Math.atan2(q.z, q.x);
            S.held.delete('attack');
            await B.walk([Math.cos(a2) * 10, 74, Math.sin(a2) * 10], 0.6, 1500);
          }
          const pions = foes('pion');
          if (stun && b.view && b.view.heart) {
            S.held.add('aim');
            B.aim(b.view.heart.getWorldPosition(V3()));
            if (Combat.mag > 0) S.held.add('attack');
          } else if (pions.length) {
            await fight(pions.sort((a, c) => a.pos.distanceTo(body.p) - c.pos.distanceTo(body.p))[0]);
          } else {
            S.held.delete('attack');
            S.held.delete('aim');
            if (Combat.mag < 20) await B.tap('reload');
          }
        } else {
          const pions = foes('pion').filter((e) => e.pos.distanceTo(body.p) < 4);
          if (pions.length) await fight(pions[0]);
          else if (dist > 4.2 || dist < 2.8) {
            await B.walk([bp.x + Math.cos(ang) * 3.5, 74, bp.z + Math.sin(ang) * 3.5], 0.4, 1200);
          } else if (!stun) {
            Cam.yaw = Math.atan2(b.pos.x - body.p.x, b.pos.z - body.p.z);
            if (performance.now() - swingT > 620) {
              swingT = performance.now();
              await B.tap('attack', 60);
            }
          }
        }
        await B.sl(40);
      }
      release();
      B.note('reelle', me + ' : Sentinelle vaincue (' + stuns + ' ouvertures vues)');
      log.push('sentinelle ' + stuns + ' étourdissements');
    }
    if (ab()) return log.join(' ');

    // ================= stage 5: the card =================
    await B.until(() => X().stage >= 5 || ab(), 30000, 200);
    await B.walk([dame ? -1.5 : 1.5, 74, 1.2], 0.35, 15000);
    B.note('reelle', me + ' à la carte');
    await B.until(() => Story.S.phase !== 'tr_s4' || ab(), 20000, 200);
    return me + ': ' + log.join(', ');
  },
};
