// garde « La Garde royale » (♠, world 5, base kits: Yoline = dame/rifle, William = valet/sword).
// Stages (levels/garde.js host()): 1 walk into the hall → 2 wave 1 (Pions) → 3 wave 2 (Pions +
// 2 Tours: sword stuns, rifle kills) → 4 gate opens, walk into the arena → 5 the Captain ('roi',
// game/boss.js): phase 1 shield — the valet crosses the laser grid under the Voile (ability) and
// presses the switch (E), the rifle hurts him while it is down; phase 2 armour — after his slam
// (recover) the sword stuns him, then the rifle; phase 3 crystal — both stand on their plates
// 2.5 s, then rifle + sword → 6 → reward after 6 s.
// Everything through Input.sim; hits are the game's own (Combat.shoot / Combat.punch).
window.CL = {
  timeout: 900,
  async run() {
    const W = Garde;
    B.W = W;
    const S = Input.sim;
    const sl = B.sl;
    const me = () => Player.body.p;
    const x = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'garde';
    const dame = Story.role === 'dame';
    const sx = dame ? -1 : 1;
    const L = [];
    const t0 = performance.now();
    const T = () => Math.round((performance.now() - t0) / 1000) + 's';

    // ------------------------------------------------------------ fight kit (same as donjon.js)
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
    const pickWave = (e) => {
      const t = e.type;
      if (!dame) {
        if (t === 'pion') return { m: 'swing' };
        if (t === 'tour') return e.stun > 0 ? null : { m: 'swing' };
        return null;
      }
      if (t === 'pion') return { m: 'shoot' };
      if (t === 'tour') return e.stun > 0 ? { m: 'shoot', pri: -20 } : null;
      return null;
    };
    // the Captain stands at (0, 90) and does not move: both keep walking between two points (his
    // slam lands where a player stood 1.6 s before), the dame ~19 m out, the valet ~8 m out
    const OSC = dame
      ? [W.P(-8, 0, 71), W.P(6, 0, 71)]
      : [W.P(-6.5, 0, 83), W.P(6.5, 0, 83)];
    let oi = 0;
    const osc = () => {
      if (hd(OSC[oi], me()) < 1.2) oi = 1 - oi;
      const p = OSC[oi];
      p.near = 0.5;
      return p;
    };
    const plate = () => {
      const p = W.plates[Story.role].pos.clone();
      p.near = 0.5;
      return p;
    };
    const boss = () => Enemies.boss();
    const crystalUp = () => {
      const b = boss();
      return !!(b && (b.phase || 1) === 3 && b.crystal);
    };
    const pickBoss = (e) => {
      if (e.type === 'roi') {
        const ph = e.phase || 1;
        if (ph === 3 && e.crystal) return null;
        if (dame) {
          const open = (ph === 1 && !e.shield) || (ph === 2 && e.stun > 0) || (ph === 3 && !e.crystal);
          return open ? { m: 'shoot', heart: true, pri: -60, dmax: 40, at: ph === 3 ? plate() : osc() } : null;
        }
        if (ph === 2 && e.recover && !(e.stun > 0)) return { m: 'swing', pri: -60, want: 3.6 };
        if (ph === 3) return { m: 'swing', pri: -60, want: 3.6 };
        return null;
      }
      if (e.type === 'pion') {
        if (crystalUp()) return null;
        if (dame) return { m: 'shoot', pri: 5, at: osc() };
        return hd(e.pos, me()) < 6 ? { m: 'swing' } : null;
      }
      return pickWave(e);
    };
    const idleBoss = () => (crystalUp() ? plate() : osc());
    // the switch: under the Voile through the grid, E on the pedestal, back out (one cloak, 6 s)
    const needSwitch = () => {
      const b = boss();
      return !dame && b && (b.phase || 1) === 1 && b.shield && !Combat.down && Combat.cloakCd <= 0;
    };
    const switchRun = async () => {
      await goto([-4.5, 0, 88], 15000);
      await B.walk([-3, 0.8, 94.4], 0.5, 4000, true);
      if (!needSwitch()) return false;
      await B.tap('ability');
      if (!(Combat.cloak > 0)) {
        B.note('reelle', 'Voile (F) non activé, nouvel essai plus tard');
        return false;
      }
      await B.walk([0, 0, 101.2], 0.4, 3500, true);
      await B.tap('interact');
      await sl(250);
      const ok = boss() && !boss().shield;
      await B.walk([-3, 0.8, 94.4], 0.5, 3500, true);
      await B.walk([-5, 0, 86], 0.8, 4000, true);
      B.note('reelle', 'interrupteur : Voile (F), traversée de la grille, touche E → ' + (ok ? 'bouclier tombé' : 'bouclier toujours là'));
      return ok;
    };

    // ------------------------------------------------------------ the stages
    const seen = new Set();
    const once = (k, how, txt) => {
      if (seen.has(k)) return;
      seen.add(k);
      B.note(how, txt);
    };
    while (live()) {
      const st = x().stage;
      if (st === 1) {
        await goto([sx * 2, 0, 8]);
        await goto([sx * 3, 0, 22]);
        once('hall', 'reelle', 'entrée dans la salle (marche)');
        await waitStage((s) => s !== 1, 20000);
      } else if (st === 2 || st === 3) {
        once('w' + st, 'reelle', 'vague ' + (st - 1) + ' : ' + (dame ? 'fusil (viser + tirer), Tours une fois sonnées' : 'épée au contact, sonne les Tours'));
        await fight(() => x().stage !== st, pickWave, partnerNear, 300000);
        L.push('st' + st + '@' + T());
      } else if (st === 4) {
        await goto([sx * 1.5, 0, 46]);
        await goto([sx * 1.5, 0, 60]);
        once('arena', 'reelle', 'porte ouverte, entrée dans l’arène');
        await waitStage((s) => s !== 4, 20000);
      } else if (st === 5) {
        once('boss', 'reelle', dame ? 'Capitaine : tir au cœur quand il est ouvert, plaque ♥ au cristal' : 'Capitaine : interrupteur sous le Voile, épée après sa frappe, plaque ♠ au cristal');
        await fight(() => x().stage !== 5 || needSwitch(), pickBoss, idleBoss, 600000);
        if (live() && x().stage === 5 && needSwitch()) await switchRun();
        L.push('b' + ((boss() && boss().phase) || '-') + '@' + T());
      } else await B.until(() => !live() || x().stage !== st, 10000, 200);
    }
    release();
    return (dame ? 'dame' : 'valet') + ': ' + (Story.S && Story.S.phase) + ' ' + T() + ' ' + L.slice(-12).join(' ');
  },
};
