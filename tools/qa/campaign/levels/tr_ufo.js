// ♠ 10 · La Soucoupe (tr_ufo), the world-2 boss. No swap: Yoline = dame (grapple F, rifle),
// William = valet (sword). Everything goes through keys (Input.sim); the level's update() and
// Combat turn them into actions (cut on attack at a post, rip on E held on an anchor, grab on E at
// a core, feed by walking into the open beam, hits from the real weapons).
//   stage 0  arrival: wait.
//   anchors (phase 1: three, phase 3: two): both pick the first anchor still up. The valet walks to
//     its post and swings at it (cut, 9 s) once the dame waits under the ring; the dame grapples the
//     ring (aim + F) once the chain is cut or the valet is at the post, then holds E on the platform.
//   cores (phase 2: three, phase 3: two): the valet breaks a porter's guard and kills it (sword),
//     picks its core (E), and walks into the beam once the dame has shot its eye open (5 rifle hits
//     on the saucer while the beam drinks). The dame shoots probes / scouts / stunned guards.
//   open shield: the dame fires at the pink heart under the saucer (ADS + attack), the valet runs
//     under it and swings.
//   all along: jump over the red sweep, revive the partner (E held), stay on the heart in phase 3.
//   stage 2  both walk to the card in the middle.
window.CL = {
  timeout: 900,
  async run() {
    const W = TrUfo;
    B.W = W;
    const S = Input.sim;
    const X = () => Story.S.x;
    const role = Story.role;
    const dame = role === 'dame';
    const P = () => Player.body.p;
    const rel = () => W.rel(P());
    const T = () => W.T || 0;
    const hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const ab = () => !!window.CL.abort || !Story.S || Story.S.phase !== 'tr_ufo';
    const log = [];
    const t0 = performance.now();
    const secs = () => Math.round((performance.now() - t0) / 1000) + 's';
    const release = () => {
      S.x = 0;
      S.z = 0;
      ['attack', 'aim', 'interact', 'sprint', 'jump', 'ability'].forEach((a) => S.held.delete(a));
    };
    const moveTo = (dest, near = 0.5, sprint = true) => {
      if (!dest || hd(P(), dest) < near) {
        S.x = 0;
        S.z = 0;
        S.held.delete('sprint');
        return true;
      }
      B.steer(dest);
      if (sprint) S.held.add('sprint');
      else S.held.delete('sprint');
      return false;
    };
    // a relative point pulled toward the middle until it is solid ground for a while
    const safe = (qx, qz) => {
      let x = qx;
      let z = qz;
      for (let k = 0; k < 12; k++) {
        const ok = W.ground(X(), V3(x, 0, z), T() + 6) && (X().ph !== 3 || W.inHeart(x, z));
        if (ok) break;
        x *= 0.85;
        z = 1 + (z - 1) * 0.85;
      }
      return W.P(x, W.groundY(x, z), z);
    };
    let pressT = 0;
    const swingAt = (p) => {
      Cam.yaw = Math.atan2(p.x - P().x, p.z - P().z);
      if (S.held.has('attack')) S.held.delete('attack');
      else if (Combat.atkCd <= 0 && performance.now() - pressT > 120) {
        S.held.add('attack');
        pressT = performance.now();
      }
    };
    const alive = (e) => e && !e.dead && e.hp > 0;
    const aimPoint = (e) => {
      const Ty = Enemies.TYPES[e.type] || {};
      return e.pos.clone().add(V3(0, (Ty.height || 2) * 0.55, 0));
    };
    const heartPos = (e) => (e.view && e.view.heart && e.view.heart.visible ? e.view.heart.getWorldPosition(V3()) : aimPoint(e));
    // the sweep: jump when the red beam is about to cross my feet
    let lastJump = 0;
    const dodge = () => {
      const sw = X().sw;
      if (!sw || !Player.body.grounded || performance.now() - lastJump < 500) return;
      const q = rel();
      const gy = W.groundY(q.x, q.z);
      for (const dt of [0.08, 0.18, 0.28]) {
        if (W.sweepHit(sw, T() + dt, q, sw.x, sw.z, gy)) {
          lastJump = performance.now();
          S.held.add('jump');
          setTimeout(() => S.held.delete('jump'), 70);
          return;
        }
      }
    };
    // partner down: walk to them and hold E (Combat's own revive)
    const reviveTick = () => {
      const rs = Remote.state || {};
      if (!rs.down || Combat.down) {
        S.held.delete('interact');
        return false;
      }
      const rp = Remote.pos;
      if (Math.abs(rp.y - P().y) > 4) return false;
      S.held.delete('attack');
      S.held.delete('aim');
      if (hd(rp, P()) > 1.4) {
        S.held.delete('interact');
        moveTo(rp, 1.2);
      } else {
        moveTo(null);
        S.held.add('interact');
      }
      return true;
    };
    const anchorUp = () => {
      const x = X();
      const list = W.anchors[x.ph] || [];
      return list.find((a) => a.alive && x.anc && x.anc[a.i]) || null;
    };
    const onAnchor = (a) => {
      const q = rel();
      return a && Math.abs(q.x - a.pos.x) < W.ANC_PLAT / 2 + 0.4 && Math.abs(q.z - a.pos.z) < W.ANC_PLAT / 2 + 0.4 && q.y > a.pos.y - 0.35 && q.y < a.pos.y + 1.2;
    };
    const ringOf = (a) => a.g.position.clone().add(a.ringOff);
    const staging = (a) => {
      const l = Math.hypot(a.pos.x, a.pos.z) || 1;
      const k = Math.max(0.05, 1 - (2.3 + 7) / l);
      return safe(a.pos.x * k, a.pos.z * k);
    };
    const postStand = (a) => {
      const b = a.borne.pos;
      const l = Math.hypot(b.x, b.z) || 1;
      const k = 1 - 1.3 / l;
      return safe(b.x * k, b.z * k);
    };
    const notes = {};
    const once = (k, how, txt) => {
      if (notes[k]) return;
      notes[k] = 1;
      B.note(how, txt);
    };

    // ---------------- the dame ----------------
    const dameShoot = (home) => {
      // probes first (they dive at the carrier), then scouts, then guards whose guard is broken
      let best = null;
      let bd = 1e9;
      for (const e of Enemies.list.values()) {
        if (!alive(e) || e.type === 'ufoSaucer') continue;
        if (e.type === 'ufoGuard' && !(e.stun > 0)) continue;
        const d = hd(e.pos, P()) + (e.type === 'ufoProbe' ? -8 : 0);
        if (hd(e.pos, P()) > 40) continue;
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (!best) {
        S.held.delete('attack');
        S.held.delete('aim');
        moveTo(home, 1.0);
        return false;
      }
      moveTo(home && hd(home, P()) > 4 ? home : null, 0.8, false);
      S.held.add('aim');
      B.aim(aimPoint(best));
      S.held.add('attack');
      return true;
    };
    let grappleAt = 0;
    let landOn = null;
    const dameTick = () => {
      const x = X();
      const boss = Enemies.boss();
      if (x.mode === 'open') {
        S.held.delete('interact');
        const q = rel();
        const home = safe(q.x * 0.6 + 0.1, q.z * 0.6 + 1);
        if (!boss) return;
        once('open' + x.ph + ':' + Math.floor(T() / 20), 'reelle', 'bouclier brisé (phase ' + x.ph + ') : fusil sur le cœur rose sous la soucoupe');
        moveTo(hd(home, P()) > 9 ? home : null, 1, false);
        S.held.add('aim');
        B.aim(heartPos(boss));
        S.held.add('attack');
        return;
      }
      const a = anchorUp();
      if (a) {
        if (onAnchor(a)) {
          S.held.delete('aim');
          S.held.delete('attack');
          moveTo(null);
          if (W.unlockLeft(x, a, T()) > 0) {
            S.held.add('interact');
            once('rip' + x.ph + a.i + ':' + (x.cuts || [])[a.i], 'reelle', 'dame sur l’ancre ' + (a.i + 1) + ' (phase ' + x.ph + '), chaîne tranchée : E maintenu pour arracher le noyau');
          } else S.held.delete('interact');
          return;
        }
        S.held.delete('interact');
        // a dead anchor's platform, or still up there after a tear: step off toward the middle
        if (rel().y > 4 && Player.body.grounded) {
          moveTo(W.P(0, 0, 1), 0.5);
          return;
        }
        const st = staging(a);
        const valetThere = Remote.has && hd(Remote.pos, postStand(a)) < 3.5;
        const cut = W.unlockLeft(x, a, T()) > 1.5;
        if (hd(st, P()) > 1.2 || Player.mode !== 'walk') {
          if (Player.mode === 'walk') dameShoot(st) || moveTo(st, 1.0);
          return;
        }
        if ((cut || valetThere) && Player.body.grounded && performance.now() - grappleAt > 1500) {
          S.held.delete('attack');
          S.held.delete('aim');
          B.aim(ringOf(a));
          if (Player.lockTarget === a.i) {
            grappleAt = performance.now();
            landOn = a;
            S.held.add('ability');
            setTimeout(() => S.held.delete('ability'), 90);
            B.note('reelle', 'grappin (visée + F) sur l’anneau de l’ancre ' + (a.i + 1) + ' (phase ' + x.ph + ')' + (cut ? ', chaîne déjà tranchée' : ', William au poteau'));
          }
          return;
        }
        dameShoot(st);
        return;
      }
      // cores: open the beam's eye when it drinks, cover the carrier otherwise
      const bm = x.beam;
      if (boss && bm && bm.intake && !bm.open && T() >= bm.t0 - 0.3 && T() <= bm.t1) {
        once('eye' + x.ph + ':' + bm.t0, 'reelle', 'le rayon descend : rafale dans l’œil de la soucoupe pour l’ouvrir');
        moveTo(null);
        S.held.add('aim');
        B.aim(aimPoint(boss));
        S.held.add('attack');
        return;
      }
      const mate = Remote.has ? W.rel(Remote.pos) : V3(0, 0, 1);
      const home = safe(mate.x * 0.5, mate.z * 0.5 + 1.5);
      dameShoot(home);
    };

    // ---------------- the valet ----------------
    const nearFoe = (r) => {
      let best = null;
      let bd = r;
      for (const e of Enemies.list.values()) {
        if (!alive(e) || e.type === 'ufoSaucer') continue;
        if (e.type === 'ufoProbe' && e.pos.y - P().y > 3) continue;
        const d = hd(e.pos, P());
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      return best;
    };
    const hunt = (e) => {
      const d = hd(e.pos, P());
      if (d > 2.2) {
        const dir = V3(P().x - e.pos.x, 0, P().z - e.pos.z).normalize();
        moveTo(V3(e.pos.x + dir.x * 1.6, P().y, e.pos.z + dir.z * 1.6), 0.4);
      } else moveTo(null);
      if (d < 3.0) swingAt(e.pos);
      else S.held.delete('attack');
    };
    let grabT = 0;
    const valetTick = () => {
      const x = X();
      const boss = Enemies.boss();
      const mine = (x.cores || []).find((k) => k.by === 'valet');
      if (x.mode === 'open') {
        if (!boss) return;
        once('open' + x.ph + ':' + Math.floor(T() / 20), 'reelle', 'bouclier brisé (phase ' + x.ph + ') : sous la soucoupe, épée');
        const bp = W.rel(boss.pos);
        const under = safe(bp.x, bp.z);
        if (hd(under, P()) > 2.5) moveTo(under, 1.5);
        else moveTo(null);
        if (hd(boss.pos, P()) < 6.5) swingAt(boss.pos);
        return;
      }
      const a = anchorUp();
      if (a && !mine) {
        const ps = postStand(a);
        const foe = nearFoe(2.8);
        if (foe && hd(ps, P()) < 6) return hunt(foe);
        if (hd(ps, P()) > 0.8) {
          S.held.delete('attack');
          moveTo(ps, 0.6);
          return;
        }
        moveTo(null);
        // cut when the dame waits under the ring (or is already up) and the chain holds
        const dq = Remote.has ? W.rel(Remote.pos) : null;
        const ready = dq && (hd(dq, staging(a)) < 3 || dq.y > 4);
        if (ready && W.unlockLeft(x, a, T()) <= 0.3) {
          once('cut' + x.ph + a.i + ':' + Math.floor(T() / 10), 'reelle', 'William tranche la chaîne de l’ancre ' + (a.i + 1) + ' à l’épée (clic au poteau)');
          swingAt(a.borne.g.position);
        } else S.held.delete('attack');
        return;
      }
      if (mine) {
        const bm = x.beam;
        const q = rel();
        if (bm && bm.intake && T() <= bm.t1) {
          const c = W.P(bm.x, W.groundY(bm.x, bm.z), bm.z);
          if (bm.open && T() >= bm.t0) {
            once('feed' + x.ph + ':' + bm.t0, 'reelle', 'œil ouvert : William porte le noyau dans le rayon');
            moveTo(c, 0.5);
          } else {
            // wait at the edge of the beam
            const d = Math.hypot(q.x - bm.x, q.z - bm.z) || 1;
            const k = (W.INTAKE_R + 2.5) / d;
            const edge = safe(bm.x + (q.x - bm.x) * k, bm.z + (q.z - bm.z) * k);
            const foe = nearFoe(2.4);
            if (foe && foe.type !== 'ufoGuard') return hunt(foe);
            moveTo(edge, 0.8);
          }
          return;
        }
        // no beam yet: stay by the dame (she shoots the probes)
        const foe = nearFoe(2.4);
        if (foe && foe.type !== 'ufoGuard') return hunt(foe);
        const mq = Remote.has ? W.rel(Remote.pos) : V3(0, 0, 1);
        moveTo(safe(mq.x + 2, mq.z), 2);
        S.held.delete('attack');
        return;
      }
      // a core on the ground: pick it up (E)
      const list = (x.cores || []).filter((k) => !k.by);
      if (list.length && x.fed < ({ 1: 0, 2: 3, 3: 2 }[x.ph] || 0)) {
        let k = list[0];
        const q = rel();
        list.forEach((o) => {
          if (Math.hypot(o.x - q.x, o.z - q.z) < Math.hypot(k.x - q.x, k.z - q.z)) k = o;
        });
        const kp = W.P(k.x, k.y, k.z);
        const foe = nearFoe(2.0);
        if (foe) return hunt(foe);
        if (hd(kp, P()) > 1.2) {
          S.held.delete('attack');
          moveTo(kp, 1.0);
        } else if (performance.now() - grabT > 600) {
          moveTo(null);
          grabT = performance.now();
          S.held.add('interact');
          setTimeout(() => S.held.delete('interact'), 90);
          once('grab' + k.id, 'reelle', 'William ramasse le noyau ' + k.id + ' (E)');
        }
        return;
      }
      // the porters first (they hold the cores), then anything close
      let best = null;
      let bd = 1e9;
      for (const e of Enemies.list.values()) {
        if (!alive(e) || e.type === 'ufoSaucer') continue;
        if (e.type === 'ufoProbe' && e.pos.y - P().y > 3) continue;
        const q = W.rel(e.pos);
        if (!W.ground(x, q, T() + 2)) continue;
        const d = hd(e.pos, P()) + (e.crystal ? -15 : 0);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (best) return hunt(best);
      S.held.delete('attack');
      const mq = Remote.has ? W.rel(Remote.pos) : V3(0, 0, 1);
      moveTo(safe(mq.x * 0.5 + 2, mq.z * 0.5), 2);
    };

    // ---------------- main ----------------
    try {
      await B.until(() => X().stage >= 1 || ab(), 30000, 200);
      B.note('reelle', dame ? 'Yoline : grappin sur les ancres, fusil sur les sondes, l’œil du rayon et le cœur' : 'William : épée sur les chaînes, les Gardiens porteurs, le noyau dans le rayon');
      let lastPh = 0;
      let lastFed = 0;
      let lastAnc = '';
      while (!ab() && X().stage === 1) {
        await B.sl(40);
        const x = X();
        if (x.ph !== lastPh) {
          lastPh = x.ph;
          log.push('ph' + x.ph + '@' + secs());
          B.note('reelle', 'phase ' + x.ph + ' de la soucoupe');
        }
        const ak = (x.anc || []).join('');
        if (ak !== lastAnc) {
          if (lastAnc && ak.length === lastAnc.length) B.note('reelle', 'ancres restantes ' + ak);
          lastAnc = ak;
        }
        if ((x.fed || 0) !== lastFed) {
          lastFed = x.fed || 0;
          if (lastFed) B.note('reelle', 'noyau avalé : ' + lastFed);
        }
        if (Combat.down) {
          release();
          continue;
        }
        dodge();
        // after the grapple lets go, steer in the air onto the anchor's platform (a player's stick)
        if (dame && landOn) {
          if (Player.mode === 'grapple' || !Player.body.grounded) {
            if (Player.mode !== 'grapple') B.airStep(W.P(landOn.pos.x, landOn.pos.y, landOn.pos.z));
            continue;
          }
          if (performance.now() - grappleAt > 400) {
            landOn = null;
            B.stop();
          }
        }
        if (Player.mode === 'grapple') continue;
        if (reviveTick()) continue;
        if (dame) dameTick();
        else valetTick();
      }
      release();
      if (ab()) return role + ': interrompu ' + JSON.stringify(log);
      log.push('fuite@' + secs());
      // ---- stage 2: the card in the middle
      await B.sl(1500);
      for (let k = 0; k < 3 && !ab() && Story.S.phase === 'tr_ufo'; k++) {
        await B.walk([dame ? -1.0 : 1.0, 0, 0.6], 0.5, 15000, true);
        B.note('reelle', role + ' à la carte au centre de l’île');
        await B.until(() => ab(), 12000, 200);
      }
    } finally {
      release();
    }
    return role + ': ' + JSON.stringify(log) + ' ' + secs();
  },
};
