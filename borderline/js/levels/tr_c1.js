// ♣ 3 · Le Câble — tethered together. Each client constrains only its own body toward the
// partner's drawn position (tolerant slack, smooth, capped), so lag never yanks anyone.
// E held: on the ground = anchor (you can't be pulled, ledges hold under you), in the air =
// ballast (you are the weight: the pulley hoists your partner). Anchored + Shift = reel in.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('c1');
  const T = CONFIG;
  const TITLE = 'Le Câble';
  const TX = {
    intro: 'Épreuve d’équipe. Un câble vous relie. Il vous retient, il vous porte… et il ne vous laisse jamais vous éloigner.',
    rule: 'E maintenu au sol : t’ancrer. Ancré·e, maintiens Maj : remonter le câble. E en l’air : te lester.',
    s1: {
      valet: 'Le mur fait presque 3 m : toi seul{e} peux le franchir (double saut). Là-haut, ancre-toi (E) et remonte {mate} (Maj).',
      dame: 'Le mur est trop haut pour toi. {mate} va monter, s’ancrer et te hisser. Reste au pied du mur.',
    },
    s2: 'Le gouffre est trop large. Sous le bord, une alcôve : l’un s’ancre tout au bord (E), l’autre se laisse tomber. Le câble le ramènera dedans.',
    s2in: 'Tu es dans l’alcôve : tourne la manivelle (E).',
    s2up: 'Le pont est sorti. {mate} est dans l’alcôve : ancre-toi au bord et remonte-{le} (E + Maj).',
    s2wait: 'Le pont est sorti. Demande à {mate} de te remonter : il faut qu’{il} s’ancre et maintienne Maj.',
    s2stuck: 'Coincé{e} ? {mate} doit s’ancrer au bord et maintenir Maj. Sinon, saute dans le vide : tu reviendras en haut.',
    s4hang: 'Suspendu{e} au-dessus du puits ? Maintiens E : ton poids hissera {mate} vers la roue.',
    s3: 'Les corniches s’effondrent sous vos pas… sauf sous quelqu’un d’ancré (E). Avancez chacun votre tour.',
    s4: 'La poulie. Le câble passe par la roue. Pour hisser l’un, l’autre doit sauter dans le puits et se lester (E en l’air).',
    s4top: 'Tu es en haut. Ancre-toi (E) et remonte {mate} (Maj).',
    s4low: '{mate} est en haut. Attends qu’{il} te remonte.',
    s5: 'Le pont s’effondre derrière vous. Courez ! Si l’un tombe, le câble le retient.',
    s5gust: 'Rafale ! Ancrez-vous ou tenez bon.',
    s6: 'La carte. Touchez-la ensemble.',
    caught: 'Le câble t’a retenu{e}.',
    reset: 'Le pont vous a eus. On recommence depuis la terrasse.',
    win: 'Pas un pas sans l’autre. La carte est à vous.',
  };
  CONFIG.cards.c1 = {
    title: TITLE,
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'Un câble entre vous deux.',
      'Quand l’un tombait, l’autre tenait bon.',
      'Ce fil-là, rien ne le coupera.',
    ],
  };

  const L0 = 8.5;
  const local = {
    stage: 0,
    an: false,
    anPos: V3(),
    heavy: false,
    reel: false,
    L: L0,
    pulley: false,
    mate: { an: 0, heavy: 0, L: L0, saved: 0 },
    sendT: 0,
    sent: '',
    carry: 0,
    saved: 0,
    front: null,
    lastFront: null,
    rn: 0,
    said: {},
    wheelPrev: null,
    gustSaid: 0,
    gw: null,
    gw0: -99,
  };
  const hostL = { cr: [], held: 0, front: null, fT: 0, gT: 0 };
  const me = V3();
  const mate = V3();
  const n = V3();
  const wv = V3();
  const viaV = V3();
  // is a player-sized volume at (x, y, z) inside a block?
  const blocked = (x, y, z) => {
    const r = 0.36;
    for (const bx of Phys.query(x - r, z - r, x + r, z + r))
      if (
        bx.on &&
        x + r > bx.min[0] &&
        x - r < bx.max[0] &&
        z + r > bx.min[2] &&
        z - r < bx.max[2] &&
        y + 1.7 > bx.min[1] &&
        y + 0.1 < bx.max[1]
      )
        return true;
    return false;
  };

  const say = (k, txt, hold = 3600) => {
    if (local.said[k]) return;
    local.said[k] = true;
    HUD.say(txt, T.master, hold);
  };

  const stageEnter = (c, st) => {
    local.stage = st;
    const r = c.role;
    if (st === 1) HUD.objective(TX.s1[r]);
    if (st === 2) {
      HUD.objective(TX.s2);
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(TX.s3);
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(TX.s4);
      Sound.play('reveal');
      // the cable clips onto the pulley wheel
      local.pulley = true;
      local.L = 999;
      Fx.burst(TrC1.wheelPos(), '#ffcf8a', 60, 5, 0.8, 0);
      Sound.play('grappleHit');
    }
    if (st === 5) {
      local.pulley = false;
      local.L = L0;
      HUD.objective(TX.s5);
      Sound.play('reveal');
      Sound.mood('tense');
    }
    if (st === 6) {
      HUD.objective(TX.s6);
      Sound.mood('calm');
      Sound.play('card');
    }
  };

  Story.register('tr_c1', {
    init: () => ({ stage: 1, bridge: false, cr: [0, 0, 0, 0, 0, 0], front: null, fspd: 4, rn: 0 }),
    voice: () => 1,
    net: {
      c1t: (c, d) => {
        // hear the partner clamp down and get caught, too
        if (d[0] && !local.mate.an) Sound.play('switch');
        if (d[3] && !local.mate.saved) Sound.play('grappleHit');
        local.mate = { an: d[0], heavy: d[1], L: d[2], saved: d[3] };
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      TrC1.build();
      local.stage = 0;
      local.an = false;
      local.L = L0;
      local.pulley = false;
      local.said = {};
      local.rn = c.S.x.rn || 0;
      local.gw = null;
      hostL.gT = 0;
      hostL.cr = [0, 0, 0, 0, 0, 0].map(() => ({ t: 0, r: 0 }));
      c.spawn(TrC1.spawn(c.S.x.stage, c.role), 0);
      Player.killY = TrC1.O.y - 40;
      Player.checkpoint = () => TrC1.spawn(Story.S.x.stage, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.006);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 4200);
      HUD.say(TX.rule, T.master, 5200);
      this.apply(c);
    },
    exit() {
      TrC1.hideCable();
      local.an = false;
    },
    apply(c) {
      if (!TrC1.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      if ((x.rn || 0) !== local.rn) {
        local.rn = x.rn || 0;
        TrC1.resetBridge();
        local.front = null;
        c.spawn(TrC1.spawn(5, c.role), 0);
        HUD.say(TX.reset, T.master, 2600);
      }
    },
    host(c, dt) {
      if (!TrC1.built) return;
      const x = c.S.x;
      const qd = TrC1.rel(c.pos('dame'));
      const qv = TrC1.rel(c.pos('valet'));
      const both = (f) => f(qd) && f(qv);
      if (x.stage === 1 && both((q) => q.y > 2.5 && q.z > 22.3)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && both((q) => q.y > 2.5 && q.z > 48.2)) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3) {
        // crumbling ledges: anyone standing makes it shake, an anchored player steadies it
        const mineAn = local.an;
        const mateAn = !!local.mate.an;
        const anOf = (who) => (who === c.role ? mineAn : mateAn);
        const next = x.cr.slice();
        let changed = false;
        for (let i = 0; i < next.length; i++) {
          const h = hostL.cr[i];
          const on = ['dame', 'valet'].filter((w) => TrC1.onLedge(TrC1.rel(c.pos(w))) === i);
          const steady = on.some(anOf);
          if (next[i] === 0 && on.length && !steady) {
            next[i] = 1;
            h.t = 0;
            changed = true;
          } else if (next[i] === 1) {
            if (steady) {
              next[i] = 0;
              changed = true;
            } else {
              h.t += dt;
              if (h.t > 1.5) {
                next[i] = 2;
                h.r = 0;
                changed = true;
              }
            }
          } else if (next[i] === 2) {
            h.r += dt;
            if (h.r > 5.5) {
              next[i] = 0;
              changed = true;
            }
          }
        }
        if (changed) c.set((s) => (s.x.cr = next));
        if (both((q) => q.y > 2.5 && q.z > 91.9)) c.set((s) => (s.x.stage = 4));
      }
      if (x.stage === 4 && both((q) => q.y > TrC1.TOP - 0.6 && q.z > 116.4))
        c.set((s) => (s.x.stage = 5));
      if (x.stage === 5) {
        // the host calls each gust (every 5.5 s): both screens blow at the same time
        hostL.gT += dt;
        if (hostL.gT > 5.5) {
          hostL.gT = 0;
          c.set((s) => (s.x.gw = (s.x.gw || 0) + 1));
        }
        if (x.front == null) {
          if (qd.z > TrC1.BR0 + 1.5 || qv.z > TrC1.BR0 + 1.5) {
            hostL.front = TrC1.BR0 - 3;
            hostL.fT = 0;
            c.set((s) => (s.x.front = hostL.front));
          }
        } else {
          hostL.front += x.fspd * dt;
          hostL.fT += dt;
          if (hostL.fT > 0.5) {
            hostL.fT = 0;
            c.set((s) => (s.x.front = +hostL.front.toFixed(2)));
          }
          // a real fall (the cable did not catch it): back to the terrace, bridge rebuilt
          if (qd.y < 0 || qv.y < 0)
            c.set((s) => {
              s.x.front = null;
              s.x.rn = (s.x.rn || 0) + 1;
            });
        }
        if (both((q) => q.z > TrC1.BR1 + 0.6 && q.y > TrC1.TOP - 0.6))
          c.set((s) => {
            s.x.stage = 6;
            s.x.front = null;
          });
      }
      if (x.stage === 6 && both(TrC1.nearCard)) c.goto('reward', (s) => (s.x.card = 'c1'));
    },
    action(c, who, d) {
      if (d.a === 'lever' && c.S.x.stage === 2 && !c.S.x.bridge) {
        c.set((s) => (s.x.bridge = true));
        Sound.play('door');
      }
    },
    update(c, dt, t) {
      if (!TrC1.built) return null;
      const x = c.S.x;
      const b = Player.body;
      const q = TrC1.rel(b.p);
      const has = Remote.has && Remote.fresh;
      let prompt = null;

      // ---- the crank in the alcove ----
      const atLever = x.stage === 2 && !x.bridge && TrC1.nearLever(q);
      if (atLever) {
        prompt = ['E', 'Tourner la manivelle'];
        if (Input.pressed('interact')) {
          c.act({ a: 'lever' });
          Sound.play('creak');
        }
      }
      if (x.stage === 2 && TrC1.inAlcove(q)) {
        say('alcove', x.bridge ? TX.s2wait : TX.s2in);
        local.alcT = (local.alcT || 0) + dt;
        if (local.alcT > 15) say('alcStuck', TX.s2stuck, 4200);
      } else local.alcT = 0;
      if (x.stage === 2 && x.bridge && has && TrC1.inAlcove(TrC1.rel(Remote.pos))) say('alcoveUp', TX.s2up);

      // ---- anchor / ballast / reel ----
      const holdE = Input.held('interact') && !atLever && Player.mode === 'walk';
      const wasAn = local.an;
      local.an = holdE && (b.grounded || wasAn);
      if (local.an && !wasAn) {
        local.anPos.copy(b.p);
        Sound.play('switch');
        Fx.burst(b.p.clone().add(V3(0, 0.1, 0)), '#ffcf8a', 24, 2.5, 0.5, 0);
      }
      local.heavy = holdE && !b.grounded && !local.an;
      if (local.an) {
        b.p.x = local.anPos.x;
        b.p.z = local.anPos.z;
        b.v.x = 0;
        b.v.z = 0;
        if (b.v.y > 0) b.v.y = 0;
      }
      const W = TrC1.wheelPos();
      me.copy(b.p).y += 1.2;
      if (has) mate.copy(Remote.pos).y += 1.2;
      const pulley = local.pulley && x.stage === 4;
      const sum = pulley ? me.distanceTo(W) + (has ? W.distanceTo(mate) : 0) : 0;
      const mateG = !!Remote.state.grounded;
      const M = local.mate;
      // reeling: only an anchored player; on the pulley only from the terrace
      local.reel = local.an && Input.held('sprint') && (!pulley || q.y > TrC1.TOP - 1);
      if (pulley) {
        // free cable while you both stand: it slides through the wheel
        if (!local.reel && b.grounded && mateG && !local.heavy && !M.heavy) local.L = sum + 1.5;
        if (local.reel) {
          local.L = Math.max(me.distanceTo(W) + 1.4, Math.min(local.L, sum + 0.5) - 4.2 * dt);
          if (Math.random() < dt * 8) Sound.play('creak');
        }
      } else if (local.reel) {
        local.L = Math.max(2.0, local.L - 2.0 * dt);
        if (Math.random() < dt * 6) Sound.play('creak');
      } else if (!local.an) local.L = Math.min(L0, local.L + 4 * dt);
      let Leff = Math.min(local.L, M.L || local.L);

      // carried: hanging under a partner who stands on the bridge pulls you back up
      const hanging = !b.grounded && has && me.y < mate.y - 1 && mateG && !M.an && !pulley;
      local.carry = hanging && x.stage === 5 ? Math.min(local.carry + dt * 3.4, 5) : Math.max(0, local.carry - dt * 6);
      Leff = Math.max(1.8, Leff - local.carry);

      // ---- where the cable bends over an edge ----
      // If something solid is above the lower player (the alcove ceiling, a ledge, the bridge,
      // the arrival platform), the cable runs over that thing's nearest edge instead of through
      // it; re-evaluated every frame, so a hoisted player works out from under and climbs.
      let via = null;
      if (has && !pulley) {
        const meLow = b.p.y < Remote.pos.y;
        const lo = meLow ? b.p : Remote.pos;
        const hiY = meLow ? Remote.pos.y : b.p.y;
        if (hiY - lo.y > 1) {
          const r = 0.4;
          let box = null;
          for (const bx of Phys.query(lo.x - r, lo.z - r, lo.x + r, lo.z + r)) {
            if (!bx.on || bx.min[1] <= lo.y + 1.2 || bx.min[1] > hiY) continue;
            if (lo.x + r > bx.min[0] && lo.x - r < bx.max[0] && lo.z + r > bx.min[2] && lo.z - r < bx.max[2])
              if (!box || bx.min[1] < box.min[1]) box = bx;
          }
          if (box) {
            // nearest side whose way out is free (not straight into another block)
            const cand = [
              [lo.x - box.min[0], box.min[0] - 0.6, lo.z],
              [box.max[0] - lo.x, box.max[0] + 0.6, lo.z],
              [lo.z - box.min[2], lo.x, box.min[2] - 0.6],
              [box.max[2] - lo.z, lo.x, box.max[2] + 0.6],
            ].sort((p, q2) => p[0] - q2[0]);
            const free = cand.find(([, cx, cz]) => !blocked(cx, lo.y, cz)) || cand[0];
            via = viaV.set(free[1], box.max[1] + 1.3, free[2]);
          } else {
            // beside a wall below the partner's level: first straight up past its top edge
            const hi = meLow ? Remote.pos : b.p;
            const hx = hi.x - lo.x;
            const hz = hi.z - lo.z;
            const hl = Math.hypot(hx, hz) || 1;
            const g = Phys.groundAt(lo.x + (hx / hl) * 0.75, hiY + 0.2, lo.z + (hz / hl) * 0.75);
            if (g > lo.y + 0.3 && g < hiY + 0.3) via = viaV.set(lo.x, g + 1.3, lo.z);
          }
        }
      }

      // ---- the constraint, on my own body only ----
      let caughtNow = false;
      if (has && x.stage >= 1 && x.stage <= 6) {
        let excess;
        if (pulley) {
          excess = sum - Leff;
          n.subVectors(W, me);
        } else if (via) {
          // the cable bends over an edge: pull toward the edge, not through the rock
          excess = me.distanceTo(via) + via.distanceTo(mate) - Leff;
          n.subVectors(via, me);
        } else {
          n.subVectors(mate, me);
          excess = n.length() - Leff;
        }
        const len = n.length();
        if (len > 1e-4) n.multiplyScalar(1 / len);
        let share;
        if (local.an) share = 0;
        else if (local.heavy) share = M.heavy ? 0.5 : M.an ? 1 : 0;
        else if (M.an || M.heavy) share = 1;
        // feet planted (standing still, not jumping): a partner who merely walks away cannot
        // drag you along or up a wall; only an anchor (reeling) or a ballast moves you
        else if (b.grounded && Math.hypot(Input.move().x, Input.move().z) < 0.05 && !Input.held('jump')) share = 0;
        else if (!b.grounded && mateG) share = 1;
        else if (b.grounded && !mateG) share = 0.12;
        else share = 0.5;
        TrC1.dbg = { e: +excess.toFixed(2), s: share, L: +Leff.toFixed(2), g: b.grounded, mg: mateG };
        // beyond 12 m of excess it is a respawn or a teleport, not a rope
        if (excess > 0.15 && excess < (pulley ? 60 : 12) && share > 0) {
          // velocity only (never move the body by hand: physics keeps it out of the walls,
          // so a hoisted player slides up the wall face and over the edge)
          const corr = (excess - 0.15) * share;
          const want = Math.min(corr * 7, 14);
          const vr = b.v.dot(n);
          if (!b.grounded && b.v.y < -5 && corr > 0.3) caughtNow = true;
          if (vr < want) b.v.addScaledVector(n, (want - vr) * Math.min(1, share * 1.2));
        }
      }
      // mantle: hanging against a low edge and pushing toward it climbs onto it
      // (only while the cable holds you from above: it never replaces a jump)
      const held = has && TrC1.dbg && TrC1.dbg.e > -0.8 && Remote.pos.y > b.p.y + 0.3;
      if (held && !b.grounded && !local.an && Input.move().z > 0.3) {
        const fx = Math.sin(Cam.yaw);
        const fz = Math.cos(Cam.yaw);
        const g = Phys.groundAt(b.p.x + fx * 0.65, b.p.y + 0.85, b.p.z + fz * 0.65);
        if (g > b.p.y - 0.05 && g - b.p.y < 1.0 && b.v.y > -6) {
          b.p.set(b.p.x + fx * 0.45, g + 0.02, b.p.z + fz * 0.45);
          b.v.set(fx * 2, 0, fz * 2);
          Sound.play('land', 0.4);
        }
      }
      if (caughtNow && local.saved <= 0) {
        Sound.play('grappleHit');
        Fx.burst(me.clone(), '#ffcf8a', 40, 4, 0.6, 0);
        if (!b.grounded) say('caught' + x.stage, TX.caught, 1800);
      }
      if (caughtNow) local.saved = 1.2;
      local.saved -= dt;

      // ---- share my cable state ----
      local.sendT -= dt;
      const st = [local.an ? 1 : 0, local.heavy ? 1 : 0, +local.L.toFixed(1), local.saved > 0 ? 1 : 0];
      const key = st.join();
      if (key !== local.sent || local.sendT <= 0) {
        local.sent = key;
        local.sendT = 0.6;
        c.send('c1t', st);
      }

      // ---- visuals ----
      TrC1.drawCable(me, mate, Leff + local.carry, t, {
        show: has,
        pulley,
        via,
        saved: local.saved > 0 || M.saved,
      });
      TrC1.anchorAt(0, b.p, local.an, t);
      TrC1.anchorAt(1, Remote.pos, has && M.an, t);
      if (pulley && has) {
        const dd = me.distanceTo(W) - mate.distanceTo(W);
        if (local.wheelPrev != null) TrC1._wheelSpin = (TrC1._wheelSpin || 0) + (dd - local.wheelPrev) / 1.4;
        local.wheelPrev = dd;
      } else local.wheelPrev = null;
      // bridge front, extrapolated between host updates
      if (x.front != null) {
        if (local.front == null || Math.abs(local.front - x.front) > 3) local.front = x.front;
        else if (x.front !== local.lastFront) local.front = lerp(local.front, x.front, 0.5);
        local.lastFront = x.front;
        local.front += (x.fspd || 4) * dt;
      } else local.front = null;
      TrC1.front = local.front;
      // dust and splinters where the bridge gives way
      if (local.front != null && local.front < TrC1.BR1 && Math.random() < dt * 5)
        Fx.burst(TrC1.P((Math.random() - 0.5) * 3, TrC1.TOP - 0.3, local.front), '#5e4636', 5, 1.6, 0.7, -9);
      // gusts over the middle of the bridge (called by the host, each pushes its own body)
      if (x.gw !== local.gw) {
        // one already blowing when this screen arrived is not replayed
        local.gw0 = local.gw === null ? -99 : t;
        local.gw = x.gw;
      }
      let gust = 0;
      if (x.stage === 5) {
        const ph = 3.0 + (t - local.gw0);
        const dir = (x.gw || 0) % 2 ? 1 : -1;
        if (ph > 3.0 && ph < 3.4 && q.z > 140 && q.z < 180 && t - local.gustSaid > 5) {
          local.gustSaid = t;
          Sound.play('rumble', 1);
          if (!local.said.gust) say('gust', TX.s5gust, 1800);
        }
        if (ph > 3.4 && ph < 4.7) gust = dir;
        if (gust && q.z > 147 && q.z < 175 && !local.an && b.p.y > TrC1.O.y + TrC1.TOP - 0.5)
          b.p.x += gust * 1.7 * dt;
      }
      TrC1.gust = damp(TrC1.gust, gust, 6, dt);
      TrC1.update(dt, t, { ...x, wheelV: 0 });
      TrC1.spin(TrC1._wheelSpin || 0);
      if (x.stage === 4) {
        if (!b.grounded && q.z > 104 && q.y > -20 && !local.heavy && TrC1.dbg && TrC1.dbg.e > -0.3)
          say('hang4', TX.s4hang, 3600);
        if (q.y > TrC1.TOP - 1 && has && TrC1.rel(Remote.pos).y < TrC1.TOP - 2) say('top', TX.s4top);
        if (q.y < TrC1.UP - 1 && has && TrC1.rel(Remote.pos).y > TrC1.TOP - 1) say('low', TX.s4low);
      }

      // ---- prompts ----
      if (prompt) return prompt;
      if (local.an)
        return pulley && q.y < TrC1.TOP - 1
          ? ['E', 'Ancré·e']
          : ['Maj', 'Maintenir : remonter ' + Story.name(c.other), true];
      if (!b.grounded && x.stage === 4 && q.y < TrC1.UP) return ['E', 'Maintenir : te lester', true];
      // held by the cable under an edge: say how to climb onto it
      if (held && !b.grounded && x.stage !== 4) return ['Z', 'Pousser vers le bord : te hisser', true];
      // only when the cable matters: taut, or where anchoring is the puzzle
      const tight = TrC1.dbg && TrC1.dbg.e > -2.5;
      if (b.grounded && (tight || x.stage === 3 || (has && Remote.pos.y < b.p.y - 1.5)))
        return ['E', 'Maintenir : t’ancrer', true];
      return null;
    },
  });
})();
