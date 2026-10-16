// donjon « La Crypte » (♠, world 5, kits SWAPPED: Yoline = valet/sword, William = dame/rifle+grapple).
// Stages (levels/donjon.js host()): 1 walk into room 1 → 2 wave 1 → 3 levers (dame grapples the
// ring onto her 6 m plate, valet double-jumps onto his 2.95 m block) → 4 corridor → room 2 →
// 5/6 waves 2-3 (tours: sword stuns, rifle kills) → 7 ossuary → 8/9 spectres (rifle reveals, sword
// cuts) → 10 arena → 11 Le Cavalier noir (baited into a pillar → stunned → sword opens the plate →
// rifle on the heart) → 12 chest (both press E within 3 s) → 13 → reward after 3.5 s.
// Everything through Input.sim (stick, attack, aim, ability, interact): the hits are the game's own
// (Combat.shoot / Combat.punch), checked by Combat.check on the host.
window.CL = {
  timeout: 900,
  async run() {
    const W = Donjon;
    B.W = W;
    const S = Input.sim;
    const sl = B.sl;
    const me = () => Player.body.p;
    const x = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'donjon';
    const dame = Story.role === 'dame';
    const sx = dame ? -1 : 1;
    const L = [];
    const t0 = performance.now();
    const T = () => Math.round((performance.now() - t0) / 1000) + 's';

    // ------------------------------------------------------------ fight kit (shared shape with garde.js)
    const hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const TY = (e) => Enemies.TYPES[e.type] || {};
    const midY = (e) => e.pos.y + (e.type === 'pion' ? 1 : (TY(e).height || 2) * 0.55);
    const free = (from, to, slack = 1.2) => {
      const d = to.clone().sub(from);
      const len = d.length();
      if (len < 0.6) return true;
      d.divideScalar(len);
      const h = Phys.rayHit(from, d, len, 0.3);
      return !h || h.t >= len - slack;
    };
    let path = null;
    let pathFor = null;
    let pathT = 0;
    // one stick step toward p (straight when nothing is in the way, else along the path finder)
    const steerTo = (p, o = {}) => {
      const b = me();
      let tg = p;
      if (!free(V3(b.x, b.y + 1, b.z), V3(p.x, b.y + 1, p.z), 0.6)) {
        const now = performance.now();
        if (!path || !pathFor || hd(pathFor, p) > 1.5 || now - pathT > 1500) {
          path = B.path(p, { near: 1 });
          pathFor = p.clone();
          pathT = now;
        }
        while (path && path.length > 1 && hd(path[0], b) < 0.7) path.shift();
        if (path && path.length) tg = path[0];
      } else path = null;
      if (o.sprint !== false && !S.held.has('aim')) S.held.add('sprint');
      else S.held.delete('sprint');
      if (!o.keepCam) Cam.yaw = Math.atan2(tg.x - b.x, tg.z - b.z);
      B.steer(tg);
    };
    const halt = () => {
      S.x = 0;
      S.z = 0;
      S.held.delete('sprint');
    };
    const release = () => {
      halt();
      ['attack', 'aim', 'interact', 'sprint'].forEach((k) => S.held.delete(k));
    };
    const heartOf = (e) => (e.view && e.view.heart ? e.view.heart.getWorldPosition(V3()) : V3(e.pos.x, midY(e), e.pos.z));
    let swingUp = false;
    const swing = (e, o = {}) => {
      const reach = TY(e).reach || 3.2;
      const d = hd(e.pos, me());
      S.held.delete('aim');
      if (d > (o.want || Math.max(2, reach - 1))) steerTo(e.pos);
      else halt();
      Cam.yaw = Math.atan2(e.pos.x - me().x, e.pos.z - me().z);
      if (d < reach - 0.25 && Combat.atkCd <= 0 && !swingUp) {
        S.held.add('attack');
        swingUp = true;
      }
    };
    const shoot = (e, o = {}) => {
      const aimAt = o.heart ? heartOf(e) : V3(e.pos.x, midY(e), e.pos.z);
      const d = hd(e.pos, me());
      const cam = R.camera.position;
      const los = free(cam.clone(), aimAt, 1.5);
      S.held.add('aim');
      B.aim(aimAt);
      if (d > (o.dmax || 22) || !los) steerTo(e.pos, { keepCam: true, sprint: false });
      else if (o.at) {
        if (hd(o.at, me()) > 1) steerTo(o.at, { keepCam: true, sprint: false });
        else halt();
      } else halt();
      if (los) S.held.add('attack');
      else S.held.delete('attack');
    };
    const reviving = () => {
      const rs = Remote.state;
      if (!Remote.has || !rs || !rs.down) return false;
      const rp = Remote.pos;
      ['attack', 'aim'].forEach((k) => S.held.delete(k));
      if (hd(rp, me()) > 1.5) {
        S.held.delete('interact');
        steerTo(rp);
      } else {
        halt();
        S.held.add('interact');
      }
      return true;
    };
    // fight until done(): pick(e) → null | { m: 'swing'|'shoot', pri, heart, dmax, want, at }
    // idle() → a point to walk to when nothing is worth hitting (or null)
    const fight = async (done, pick, idle, ms = 400000) => {
      const t1 = performance.now();
      let downNoted = false;
      while (live() && !done() && performance.now() - t1 < ms) {
        await sl(50);
        if (swingUp) {
          S.held.delete('attack');
          swingUp = false;
          continue;
        }
        if (Combat.down) {
          if (!downNoted) B.note('reelle', 'à terre, attend d’être relevé(e)');
          downNoted = true;
          release();
          continue;
        }
        downNoted = false;
        if (reviving()) continue;
        S.held.delete('interact');
        let best = null;
        let how = null;
        let bd = Infinity;
        for (const e of Enemies.list.values()) {
          if (!(e.hp > 0)) continue;
          const h = pick(e);
          if (!h) continue;
          const d = hd(e.pos, me()) + (h.pri || 0);
          if (d < bd) {
            bd = d;
            best = e;
            how = h;
          }
        }
        if (best && how.m === 'swing') swing(best, how);
        else if (best && how.m === 'shoot') shoot(best, how);
        else {
          S.held.delete('attack');
          const p = idle && idle();
          if (p && hd(p, me()) > (p.near || 1.2)) {
            S.held.delete('aim');
            steerTo(p);
          } else halt();
        }
      }
      release();
      return done();
    };
    // ------------------------------------------------------------ level helpers
    const waitStage = (f, ms) => B.until(() => !live() || f(x().stage), ms, 150);
    const goto = async (p, ms = 30000) => {
      if (await B.go(p, { near: 0.9, ms })) return true;
      return B.walk(p, 0.9, 8000, true);
    };
    const partnerNear = () => {
      if (!Remote.has) return null;
      const rp = Remote.pos;
      const p = V3(rp.x - sx * 2, me().y, rp.z);
      p.near = 3.5;
      return p;
    };
    // waves: valet cuts Pions/Cavaliers, stuns Tours (no damage), cuts revealed Spectres;
    // dame shoots Pions/Cavaliers, stunned Tours, Spectres (reveals them)
    const pickWave = (e) => {
      const t = e.type;
      if (!dame) {
        if (t === 'pion' || t === 'cavalier') return { m: 'swing' };
        if (t === 'tour') return e.stun > 0 ? null : { m: 'swing' };
        if (t === 'spectre') return e.reveal > 0 ? { m: 'swing', pri: -5 } : null;
        return null;
      }
      if (t === 'pion' || t === 'cavalier') return { m: 'shoot' };
      if (t === 'tour') return e.stun > 0 ? { m: 'shoot', pri: -20 } : null;
      if (t === 'spectre') return { m: 'shoot', pri: e.reveal > 0 ? 6 : -4 };
      return null;
    };
    // boss: the valet waits behind a pillar (the Cavalier charges the nearest player and is
    // stunned by the pillar), runs round and strikes the stunned Cavalier (opens the plate), backs
    // off; the dame stays far (so the valet is the nearest) with a clear line, shoots the heart
    const PIL = [
      [-11, 148],
      [11, 148],
      [-11, 170],
      [11, 170],
    ];
    let baitP = null;
    const bait = () => {
      const g = Enemies.boss();
      if (!g) return null;
      const q = W.rel(g.pos);
      // hold still while he winds up or charges: the line was drawn at the wind-up
      if (baitP && (g.st === 1 || g.st === 2)) return baitP;
      const b = W.rel(me());
      let best = null;
      let bs = Infinity;
      for (const [px, pz] of PIL) {
        const dx = px - q.x;
        const dz = pz - q.z;
        const l = Math.hypot(dx, dz) || 1;
        if (l < 4.5) continue;
        const sp = [px + (dx / l) * 2.9, pz + (dz / l) * 2.9];
        if (Math.abs(sp[0]) > 21 || sp[1] < 133 || sp[1] > 186) continue;
        const s = Math.hypot(b.x - sp[0], b.z - sp[1]);
        if (s < bs) {
          bs = s;
          best = sp;
        }
      }
      if (!best) return null;
      baitP = W.P(best[0], 0, best[1]);
      baitP.near = 0.6;
      return baitP;
    };
    let standP = null;
    let standT = 0;
    const stand = () => {
      const g = Enemies.boss();
      if (!g) return partnerNear();
      if (standP && performance.now() - standT < 1500) return standP;
      standT = performance.now();
      const dv = Remote.has ? hd(Remote.pos, g.pos) : 10;
      const need = Math.max(16, dv + 6);
      const gc = V3(g.pos.x, g.pos.y + 2.5, g.pos.z);
      let best = null;
      let bs = Infinity;
      let far = null;
      let fd = -1;
      for (let xx = -18; xx <= 18; xx += 4.5)
        for (let zz = 137; zz <= 185; zz += 4) {
          const p = W.P(xx, 0, zz);
          const d = hd(p, g.pos);
          if (d > fd) {
            fd = d;
            far = p;
          }
          if (d < need) continue;
          if (!free(V3(p.x, p.y + 1.6, p.z), gc, 2.5)) continue;
          const s = hd(p, me());
          if (s < bs) {
            bs = s;
            best = p;
          }
        }
      standP = best || far;
      standP.near = 1.2;
      return standP;
    };
    const pickBoss = (e) => {
      const t = e.type;
      if (t === 'gardien') {
        if (!dame) return e.stun > 0 && !e.vuln ? { m: 'swing', pri: -60, want: 3.2 } : null;
        return e.vuln ? { m: 'shoot', heart: true, pri: -60, dmax: 30 } : null;
      }
      if (t === 'spectre') {
        if (!dame) return e.reveal > 0 && hd(e.pos, me()) < 9 ? { m: 'swing', pri: -5 } : null;
        return { m: 'shoot', pri: e.reveal > 0 ? 8 : 0, at: stand() };
      }
      return pickWave(e);
    };
    const idleBoss = () => (dame ? stand() : bait());

    // ------------------------------------------------------------ the stages
    const done = new Set();
    const once = (k, how, txt) => {
      if (done.has(k)) return;
      done.add(k);
      B.note(how, txt);
    };
    const lastStage = () => x().stage;
    while (live()) {
      const st = lastStage();
      if (st === 1) {
        await goto([sx * 1.5, 0, 8]);
        await goto([sx * 3, 0, 20]);
        once('r1', 'reelle', 'entrée dans la salle 1 (marche)');
        await waitStage((s) => s !== 1, 20000);
      } else if ([2, 5, 6, 8, 9].includes(st)) {
        once('f' + st, 'reelle', 'vague (stade ' + st + ') : ' + (dame ? 'fusil (viser + tirer)' : 'épée (frapper au contact)'));
        await fight(() => x().stage !== st, pickWave, partnerNear, 300000);
        L.push('st' + st + '@' + T());
      } else if (st === 3) {
        await levers();
        await waitStage((s) => s !== 3, 30000);
      } else if (st === 4) {
        // off the ledge / block, through gate g3 into room 2
        if (W.rel(me()).y > 1) {
          await B.walk([sx * 1.5, 0, 54], 0.6, 6000, false);
          await sl(700);
        }
        await goto([sx * 1.5, 0, 55]);
        await goto([sx * 3, 0, 68]);
        once('r2', 'reelle', 'descente et entrée dans la nef');
        await waitStage((s) => s !== 4, 20000);
      } else if (st === 7) {
        await goto([sx * 1, 0, 97]);
        await goto([sx * 3, 0, 108]);
        once('r3', 'reelle', 'entrée dans l’ossuaire');
        await waitStage((s) => s !== 7, 20000);
      } else if (st === 10) {
        await goto([sx * 1, 0, 127]);
        await goto([sx * 3, 0, 141]);
        once('r4', 'reelle', 'entrée dans l’arène');
        await waitStage((s) => s !== 10, 20000);
      } else if (st === 11) {
        once('boss', 'reelle', dame ? 'Cavalier noir : se tient loin, tire au cœur quand la cuirasse est levée' : 'Cavalier noir : attend derrière un pilier, frappe quand il est sonné');
        await fight(() => x().stage !== 11, pickBoss, idleBoss, 600000);
        L.push('boss@' + T());
      } else if (st === 12) {
        await goto([sx * 1.2, 0, 179.6]);
        await B.walk([sx * 1.2, 0, 179.6], 0.4, 4000);
        once('chest', 'reelle', 'coffre : touche E (les deux ensemble)');
        for (let i = 0; i < 30 && live() && x().stage === 12; i++) {
          if (!W.nearChest(W.rel(me()))) await B.walk([sx * 1.2, 0, 179.6], 0.4, 3000);
          await B.tap('interact');
          await sl(800);
        }
      } else if (st === 13) {
        await B.until(() => !live(), 10000, 200);
      } else await sl(300);
    }
    release();
    return (dame ? 'dame' : 'valet') + ': ' + (Story.S && Story.S.phase) + ' ' + T() + ' ' + L.join(' ');

    async function levers() {
      if (dame) {
        // the dame's lever is on the 6 m ledge: lock the ring, grapple (F), land on the plate
        for (let k = 0; k < 5 && live() && x().stage === 3; k++) {
          if (W.onPlate('dame', W.rel(me()))) break;
          await goto([-1.5, 0, 44]);
          let got = false;
          for (let i = 0; i < 50 && !got; i++) {
            B.aim(W.ring());
            await sl(100);
            if (Player.lockTarget >= 0) {
              await B.tap('ability');
              got = true;
            }
          }
          if (!got) {
            B.note('reelle', 'anneau non verrouillé depuis ' + B.rel());
            continue;
          }
          await B.until(() => Player.mode === 'walk' && Player.body.grounded, 5000, 50);
          await sl(300);
          if (!W.onPlate('dame', W.rel(me())) && W.rel(me()).y > 5) await B.walk([-5, 6, 50], 0.4, 3000);
        }
        once('lev', 'reelle', 'grappin (F) sur l’anneau → plaque du levier ' + B.rel());
      } else {
        // the valet's lever: a double jump onto the 2.95 m block
        for (let k = 0; k < 6 && live() && x().stage === 3; k++) {
          if (W.onPlate('valet', W.rel(me()))) break;
          if (W.rel(me()).y < 2) {
            await goto([5, 0, 45.4]);
            await B.walk([5, 0, 45.4], 0.4, 3000);
            Cam.yaw = Math.atan2(W.P(5, 0, 50).x - me().x, W.P(5, 0, 50).z - me().z);
            await B.leap([5, 2.95, 50], { ms: 2500, run: 120 });
          }
          if (W.rel(me()).y > 2.5) await B.walk([5, 2.95, 50], 0.4, 3000);
        }
        once('lev', 'reelle', 'double saut sur le bloc → plaque du levier ' + B.rel());
      }
      // stay on the plate until both are held 1.2 s
      halt();
    }
  },
};
