// Campaign solver — raid « Le Caveau » (♣7). Kits as planned: dame = grapple + rifle, valet = sword +
// Égide (F). Everything goes through keys (Input.sim): the level's update() turns them into its own
// actions (rune on E at a pillar, aegis on F, hits from Combat).
//   1 ascent: dame grapples the two rings (aim + F), valet rides the blue pads and double-jumps the
//     steps; both stand on their door seal.
//   2 Galerie des Sceaux: each holds the seal that raises the partner's lane, crosses their own.
//   3/4 the Oracle: the seer (dame, valet in the last ritual) fights the adds; the other walks to
//     the pillars in the order of the sequence and presses E. Broken windows: both close to each
//     other (valet raises the Égide before the Regard), rifle on the heart, sword on the Oracle,
//     side-step the ripples (phase 2+).
//   5 both to the card in the middle.
window.CL = {
  timeout: 900,
  async run() {
    const W = Raid;
    B.W = W;
    const S = Input.sim;
    const x = () => Story.S.x;
    const role = Story.role;
    const dame = role === 'dame';
    const mateRole = dame ? 'valet' : 'dame';
    const P = () => Player.body.p;
    const rel = () => W.rel(P());
    const hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const ab = () => !!CL.abort || !Story.S || Story.S.phase !== 'raid';
    const log = [];
    const t0 = performance.now();
    const T = () => Math.round((performance.now() - t0) / 1000) + 's';
    const la = (k) => (x().latch || []).includes(k);
    const held = (k) => (x().held || []).includes(k);
    const release = () => {
      S.x = 0;
      S.z = 0;
      ['attack', 'aim', 'interact', 'sprint', 'jump', 'ability'].forEach((a) => S.held.delete(a));
    };

    // ---------------------------------------------------------------- stage 1: the ascent
    const grab = async (ring) => {
      for (let i = 0; i < 60 && !ab(); i++) {
        B.aim(ring);
        await B.sl(100);
        if (Player.lockTarget >= 0) {
          await B.tap('ability');
          return true;
        }
      }
      return false;
    };
    const s1 = async () => {
      for (let attempt = 0; attempt < 4 && x().stage === 1 && !ab(); attempt++) {
        if (dame) {
          const q = rel();
          if (q.z < 20 && q.y < 2) {
            await B.walk([-5, 0, 4.5], 0.5, 8000);
            if (!(await grab(W.rings()[0]))) {
              B.note('reelle', 'anneau 1 pas verrouillé, nouvel essai');
              continue;
            }
            await B.until(() => Player.mode === 'walk' && Player.body.grounded, 6000);
          }
          if (rel().z < 48 && rel().y > 1.5 && rel().y < 4) {
            await B.walk([-7, 2.5, 30], 0.5, 8000);
            if (!(await grab(W.rings()[1]))) {
              B.note('reelle', 'anneau 2 pas verrouillé, nouvel essai');
              continue;
            }
            await B.until(() => Player.mode === 'walk' && Player.body.grounded, 6000);
          }
          if (!W.onDoor(rel())) {
            await B.until(() => Player.body.grounded, 3000);
            continue;
          }
          B.note('reelle', 'grappin sur les deux anneaux (visée + F), arrivée devant la porte du Caveau ' + JSON.stringify(B.rel()));
        } else {
          const q = rel();
          if (q.y < 3 && q.z < 15) {
            await B.walk([7, 0, 4.2], 0.3, 8000);
            await B.until(() => rel().y > 3 && Player.body.grounded && Player.mode === 'walk', 4000);
            await B.sl(300);
            await B.walk([7, 3.3, 9.4], 0.3, 5000);
            await B.until(() => rel().y > 6 && Player.body.grounded && Player.mode === 'walk', 4000);
            await B.sl(300);
            if (rel().y < 6) continue;
          }
          let fail = false;
          for (const z of [18.5, 25, 31.5, 38, 44.5]) {
            if (rel().z > z + 1) continue;
            const r = await B.leap([7, 6.6, z], { ms: 2400 });
            if (r[1] < 6) {
              fail = true;
              break;
            }
          }
          if (fail) {
            B.note('reelle', 'marche ratée, reprise au repère');
            await B.sl(1500);
            continue;
          }
          await B.leap([7, 6.6, 51], { ms: 2400 });
          if (!W.onDoor(rel())) {
            await B.sl(1500);
            continue;
          }
          B.note('reelle', 'plots bleus puis double saut de marche en marche, arrivé devant la porte ' + JSON.stringify(B.rel()));
        }
        break;
      }
      await B.walk([dame ? -4 : 4, W.FLOOR, 61], 0.4, 12000);
      B.note('reelle', 'debout sur le sceau ' + (dame ? '♥' : '♠') + ' de la porte');
      if (!(await B.until(() => x().stage >= 2 || ab(), 90000))) return 'no st2 ' + B.rel();
      return null;
    };

    // ---------------------------------------------------------------- stage 2: Galerie des Sceaux
    const lane = async (lx, zs, end) => {
      for (const z of zs) {
        const r = await B.leap([lx, W.FLOOR, z], { ms: 2400 });
        if (Math.abs(r[2] - z) > 2 || r[1] < 6) return 'lane fail ' + JSON.stringify(r);
      }
      const r = await B.leap(end, { ms: 2400 });
      return r[1] > 6 ? null : 'lane end fail ' + JSON.stringify(r);
    };
    // one crossing with retries (a fall puts us back on the last landing)
    const cross = async (lx, zs, end, from) => {
      for (let i = 0; i < 4 && !ab(); i++) {
        await B.until(() => Player.body.grounded, 3000);
        await B.walk([lx, W.FLOOR, from], 0.3, 6000);
        const e = await lane(lx, zs, end);
        if (!e) return null;
        B.note('reelle', 'traversée ratée (' + e + '), nouvel essai');
        await B.sl(1800);
        if (rel().z > end[2] - 3) return null;
      }
      return 'cross failed';
    };
    const s2 = async () => {
      await B.sl(1200);
      const lx = dame ? -4.5 : 4.5;
      if (rel().z < 66) {
        await B.walk([lx, W.FLOOR, 64.5], 0.5, 8000);
        await B.leap([lx, W.FLOOR, 70], { ms: 2400 });
      }
      if (dame) {
        await B.walk([-4.5, W.FLOOR, 73], 0.3, 6000);
        B.note('reelle', 'sur le sceau ♥ : le pont de William apparaît');
        if (!(await B.until(() => la('v1') || ab(), 90000))) return 'valet never crossed 1';
        if (!(await B.until(() => held('d1') || la('d1') || ab(), 60000))) return 'no d1';
        let e = await cross(-4.5, [79, 84, 89], [-4.5, W.FLOOR, 95], 75.5);
        if (e) return e;
        await B.walk([-4.5, W.FLOOR, 98], 0.3, 5000, true);
        B.note('reelle', 'îlot atteint, sur le sceau ♥ de l’îlot');
        if (!(await B.until(() => la('v2') || ab(), 60000))) return 'valet never crossed 2';
        if (!(await B.until(() => held('d2') || la('d2') || ab(), 60000))) return 'no d2';
        e = await cross(-4.5, [103, 108, 113], [-4.5, W.FLOOR, 119], 99.5);
        if (e) return e;
        B.note('reelle', 'bout de la galerie atteint');
      } else {
        if (!(await B.until(() => held('v1') || la('v1') || ab(), 90000))) return 'no v1';
        let e = await cross(4.5, [79, 84, 89], [4.5, W.FLOOR, 94], 75.5);
        if (e) return e;
        await B.walk([4.5, W.FLOOR, 94], 0.3, 4000);
        B.note('reelle', 'îlot atteint, sur le sceau ♠ de l’îlot');
        if (!(await B.until(() => la('d1') || ab(), 60000))) return 'dame never crossed 1';
        if (!(await B.until(() => held('v2') || la('v2') || ab(), 60000))) return 'no v2';
        await B.sl(250);
        e = await cross(4.5, [103, 108, 113], [4.5, W.FLOOR, 118], 99.5);
        if (e) return e;
        await B.walk([4.5, W.FLOOR, 118], 0.3, 4000);
        B.note('reelle', 'bout de la galerie, sur le sceau ♠ du bout');
      }
      if (!(await B.until(() => x().stage >= 3 || ab(), 60000))) return 'no st3 ' + B.rel() + ' ' + JSON.stringify(x().latch);
      return null;
    };

    // ---------------------------------------------------------------- the Oracle
    const C = W.oraclePos();
    const spot = (ang, r) => W.arenaPos(Math.sin(ang) * r, -Math.cos(ang) * r);
    const oracle = () => Enemies.boss();
    const heartPos = (e) => (e.view && e.view.heart ? e.view.heart.getWorldPosition(V3()) : e.pos.clone());
    let pressT = 0; // edge-press bookkeeping for the sword
    const swingAt = (p) => {
      Cam.yaw = Math.atan2(p.x - P().x, p.z - P().z);
      if (S.held.has('attack')) S.held.delete('attack');
      else if (Combat.atkCd <= 0 && performance.now() - pressT > 120) {
        S.held.add('attack');
        pressT = performance.now();
      }
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
    // who to hit, and how (the real weapons: the rifle reveals spectres, kills stunned tours; the
    // sword stuns tours, cuts revealed spectres)
    const pick = (e) => {
      const t = e.type;
      if (t === 'oracle') return null;
      if (dame) {
        if (t === 'pion') return { m: 'shoot' };
        if (t === 'spectre') return e.reveal > 0 ? null : { m: 'shoot', pri: 2 };
        if (t === 'tour') return e.stun > 0 ? { m: 'shoot', pri: -10 } : null;
      } else {
        if (t === 'pion') return { m: 'swing' };
        if (t === 'spectre') return e.reveal > 0 ? { m: 'swing', pri: -4 } : null;
        if (t === 'tour') return e.stun > 0 ? null : { m: 'swing', pri: 3 };
      }
      return null;
    };
    const aimPoint = (e) => {
      const Ty = Enemies.TYPES[e.type] || {};
      return e.pos.clone().add(V3(0, e.type === 'pion' ? 1 : (Ty.height || 2) * 0.55, 0));
    };
    // one tick of fighting the adds around `home` (true when something was attacked)
    const fightAdds = (home, maxR = 14) => {
      let best = null;
      let bd = 1e9;
      let how = null;
      for (const e of Enemies.list.values()) {
        const h = pick(e);
        if (!h) continue;
        const d = hd(e.pos, P()) + (h.pri || 0);
        if (hd(e.pos, P()) > (dame ? 30 : maxR)) continue;
        if (d < bd) {
          bd = d;
          best = e;
          how = h;
        }
      }
      if (!best) {
        S.held.delete('attack');
        S.held.delete('aim');
        moveTo(home, 0.8);
        return false;
      }
      if (how.m === 'swing') {
        S.held.delete('aim');
        const d = hd(best.pos, P());
        if (d > 2.2) {
          const dir = V3(P().x - best.pos.x, 0, P().z - best.pos.z).normalize();
          moveTo(V3(best.pos.x + dir.x * 1.6, P().y, best.pos.z + dir.z * 1.6), 0.4);
        } else moveTo(null);
        if (d < 3.0) swingAt(best.pos);
        else S.held.delete('attack');
      } else {
        const ap = aimPoint(best);
        const d = hd(best.pos, P());
        if (d > 22) {
          S.held.delete('aim');
          B.aim(ap);
          moveTo(best.pos, 18);
        } else {
          moveTo(home && hd(home, P()) > 4 ? home : null, 0.8, false);
          S.held.add('aim');
          B.aim(ap);
        }
        S.held.add('attack');
      }
      return true;
    };
    // partner down: walk to them and hold E (Combat's own revive)
    const reviveTick = () => {
      const rs = Remote.state || {};
      if (!rs.down || Combat.down) {
        S.held.delete('interact');
        return false;
      }
      S.held.delete('attack');
      S.held.delete('aim');
      const rp = Remote.pos;
      if (hd(rp, P()) > 1.4) {
        S.held.delete('interact');
        moveTo(rp, 1.2);
      } else {
        moveTo(null);
        S.held.add('interact');
      }
      return true;
    };

    let winStart = 0;
    let lastRitual = true;
    let ang = 0; // the pair's spot in a broken window: between the bridge and the Oracle
    let pressedFor = '';
    let aegisDone = 0;
    let ondeDone = 0;
    let notedRitual = '';
    const s4 = async () => {
      B.note('reelle', 'arène : ' + (dame ? 'fusil sur les ajouts, puis sur le cœur' : 'épée sur les ajouts et l’Oracle, Égide (F) avant le Regard'));
      let lastPress = 0;
      while (!ab() && x().stage === 4) {
        await B.sl(50);
        const xx = x();
        if (Combat.down) {
          release();
          continue;
        }
        const ritual = !!xx.ritual;
        if (!ritual && lastRitual) {
          winStart = performance.now();
          aegisDone = 0;
          ondeDone = 0;
          B.note('reelle', 'Oracle brisé (phase ' + (xx.ph || 1) + ') : on se regroupe, ' + (dame ? 'feu sur le cœur' : 'épée sur l’Oracle'));
        }
        lastRitual = ritual;
        // the activator's E must not double as a revive press near a pillar: revive first anyway
        if (reviveTick()) continue;
        if (ritual) {
          const activator = xx.seer !== role;
          if (activator) {
            S.held.delete('aim');
            S.held.delete('attack');
            // the suit to activate is the one the seer reads out from the glyphs above the Oracle
            const want = xx.seq[xx.prog];
            const slot = (xx.perm || [0, 1, 2, 3]).indexOf(want);
            if (slot < 0) continue;
            const key = xx.seq.join() + '|' + xx.prog + '|' + (xx.perm || []).join();
            if (notedRitual !== xx.seq.join() + xx.ph) {
              notedRitual = xx.seq.join() + xx.ph;
              B.note('reelle', 'rituel ' + (xx.ph || 1) + ' : séquence ' + xx.seq.map((s) => W.SYMS[s]).join(' ') + ' annoncée par ' + (dame ? 'William' : 'Yoline') + ' (son écran) — piliers à E');
            }
            const pp = W.pillars[slot].pos;
            if (W.nearPillar(rel()) === slot && Player.body.grounded) {
              moveTo(null);
              if ((pressedFor !== key && performance.now() - lastPress > 700) || performance.now() - lastPress > 2500) {
                pressedFor = key;
                lastPress = performance.now();
                await B.tap('interact');
              }
            } else {
              moveTo(pp, 0.6);
              // a Pion in the way gets the sword on the walk
              if (!dame)
                for (const e of Enemies.list.values())
                  if (e.type === 'pion' && hd(e.pos, P()) < 2.4) {
                    swingAt(e.pos);
                    break;
                  }
            }
          } else {
            // the seer holds the middle ground and clears what comes
            fightAdds(spot(ang, 9));
          }
          continue;
        }
        // ---- broken window
        const o = oracle();
        const wt = (performance.now() - winStart) / 1000;
        const ph = xx.ph || 1;
        // ripples (phase 2+, 8.5 s into the window): both side-step out of the red circles
        if (ph >= 2 && wt > 8.4 && !ondeDone) {
          ondeDone = 1;
          ang += 0.9;
          B.note('reelle', 'ondes : pas de côté hors des cercles rouges');
        }
        const myR = dame ? 8 : 5.5;
        const home = spot(ang, myR);
        if (dame) {
          if (o && o.st === 1) {
            const far = hd(home, P()) > 1.2;
            moveTo(home, 0.6, far);
            if (far) S.held.delete('aim');
            else S.held.add('aim');
            B.aim(heartPos(o));
            S.held.add('attack');
          } else fightAdds(home);
        } else {
          moveTo(home, 0.5);
          // Égide just before the Regard lands (5 s into the window, 4 s in the last phase)
          const gazeAt = ph === 3 ? 3.9 : 4.9;
          if (!aegisDone && wt > gazeAt && wt < gazeAt + 1.6) {
            aegisDone = 1;
            await B.tap('ability');
            B.note('reelle', 'Égide levée (F) à côté de Yoline avant le Regard');
          }
          if (o && o.st === 1 && hd(o.pos, P()) < 6.2) swingAt(o.pos);
          else {
            // a revealed spectre or a pion next to us
            let near = null;
            for (const e of Enemies.list.values()) {
              const h = pick(e);
              if (h && h.m === 'swing' && hd(e.pos, P()) < 2.6) near = e;
            }
            if (near) swingAt(near.pos);
            else S.held.delete('attack');
          }
        }
      }
      release();
      return x().stage >= 5 ? null : 'left stage 4 at stage ' + x().stage;
    };

    // ---------------------------------------------------------------- main
    try {
      while (!ab()) {
        const st = x().stage;
        let e = null;
        if (st === 1) {
          e = await s1();
          log.push('door@' + T());
        } else if (st === 2) {
          e = await s2();
          log.push('gal@' + T());
        } else if (st === 3) {
          lastRitual = true;
          await B.walk([dame ? -1.5 : 1.5, W.FLOOR, 130], 0.6, 10000, true);
          await B.walk([dame ? -2 : 2, W.FLOOR, 140], 0.6, 10000, true);
          B.note('reelle', 'entrée dans l’arène');
          await B.until(() => x().stage !== 3 || ab(), 20000);
        } else if (st === 4) {
          e = await s4();
          if (!e) log.push('oracle@' + T());
          else if (x().stage === 3) {
            B.note('reelle', 'reprise de la rencontre (les deux à terre ou rage) : ' + e);
            e = null;
          }
        } else if (st === 5) {
          await B.walk([dame ? -1 : 1, W.FLOOR, 155], 0.5, 20000, true);
          B.note('reelle', 'à la carte au centre de l’arène');
          await B.until(() => ab(), 20000);
        }
        if (e) {
          release();
          return role + ': ' + e + ' ' + JSON.stringify(log);
        }
      }
    } finally {
      release();
    }
    return role + ': done ' + (Story.S && Story.S.phase) + ' ' + T() + ' ' + JSON.stringify(log);
  },
};
