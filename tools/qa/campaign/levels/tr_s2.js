// ♠ Les Toits qui tombent (tr_s2) — solver. Base kits: 'dame' grapple + rifle, 'valet' sword +
// Voile (F, hides from the drones' beams).
//  sec 1: crumbling tiles; dame grapples ring 1 and drops the ladder (E at the winch), valet climbs
//         and pushes the plank (E); both over the cracking stones (the second waits for them)
//  sec 2: zip line (E), crane hook ride, the billboard: one holds a lever (E held) while the other
//         rides it across, then the other way round
//  sec 3: the run under the collapse front: the sword breaks the shield guards, the rifle downs
//         the drones and finishes the stunned guards (real aim + attack at the weapons' pace);
//         a downed partner is revived (E held)
//  sec 4: dame grapples ring 2 and holds out her hand (E held at the catch), valet jumps (Space)
//         from the pad; both to the card
window.CL = {
  timeout: 900,
  async run() {
    const PH = 'tr_s2';
    const W = TrS2;
    B.W = W;
    const S = Input.sim;
    const x = () => Story.S.x;
    const dame = Story.role === 'dame';
    const sx = dame ? -1 : 1;
    const live = () => !CL.abort && Story.S && Story.S.phase === PH;
    const wait = async (fn, ms = 20000, step = 100) => {
      await B.until(() => !live() || fn(), ms, step);
      try {
        return live() && !!fn();
      } catch (e) {
        return false;
      }
    };
    const log = [];
    const z = () => B.rel()[2];
    const grab = async (ring) => {
      for (let i = 0; i < 60 && live(); i++) {
        B.aim(ring);
        await B.sl(100);
        if (Player.lockTarget >= 0) {
          await B.tap('ability');
          return true;
        }
      }
      return false;
    };
    const boardAt = () => W.boardBox.min[0] + 1.7 - W.O.x;

    // ---------------- section 1 ----------------
    const sec1 = async () => {
      const L = [];
      if (z() < 55) {
        await B.walk([sx * 2, 0, 16.5], 0.5, 8000);
        L.push(await B.leap([sx * 2, 0, 24], { ms: 2000 }));
        await B.walk([sx * 2, 0, 44], 0.5, 8000, true);
        L.push(await B.leap([sx * 2, 0, 53.5], { ms: 2000 }));
        B.note('reelle', 'tuiles qui s’effritent passées ' + JSON.stringify(L));
      }
      if (z() < 66) {
        if (dame) {
          await B.walk([2, 0, 55], 0.5, 8000);
          if (!(await grab(W.P(W.RING1.x, W.RING1.y, W.RING1.z)))) return 'anneau 1 non verrouillé ' + B.rel();
          await wait(() => Player.mode === 'walk' && Player.body.grounded, 6000);
          B.note('reelle', 'grappin sur l’anneau 1 ' + JSON.stringify(B.rel()));
          await B.walk([2.2, 4.5, 62.4], 0.4, 5000);
          B.face([W.WINCH.x, 4.5, W.WINCH.z]);
          if (!x().ladder) await B.tap('interact');
          if (!(await wait(() => x().ladder, 4000))) return 'échelle pas descendue ' + B.rel();
          B.note('reelle', 'échelle descendue (E au treuil)');
          await wait(() => x().plank, 90000);
          await B.walk([-1, 4.5, 64], 0.4, 6000);
          await B.walk([-3, 0, 66], 0.5, 6000);
        } else {
          if (!(await wait(() => x().ladder, 90000))) return 'pas d’échelle';
          await B.sl(2500);
          await B.walk([4.9, 0, 51.8], 0.4, 8000);
          await B.walk([4.9, 4.5, 61], 0.4, 8000);
          await B.walk([4.5, 4.5, 62.6], 0.4, 5000);
          L.push(await B.leap([4.5, 7, 66], { ms: 2500 }));
          await B.walk([3.3, 7, 66.2], 0.3, 3000);
          B.face([W.PLANK_LEVER.x, 7, W.PLANK_LEVER.z]);
          await B.tap('interact');
          if (!(await wait(() => x().plank, 3000))) return 'planche pas poussée ' + B.rel();
          B.note('reelle', 'échelle montée, planche poussée (E)');
          await B.sl(2000);
          await B.walk([3.1, 7, 65.4], 0.3, 2000);
          await B.walk([1.2, 7, 65.4], 0.4, 3000);
          await B.walk([1, 4.5, 69], 0.4, 3000);
          await B.walk([-2.5, 0, 70], 0.5, 6000);
          await B.sl(1500);
        }
      }
      if (z() < 113) {
        await B.walk([-3.5, 0, 71], 0.4, 8000);
        await B.walk([-3.5, 0, 86], 0.4, 8000);
        await B.walk([-1.8, 0, 97.6], 0.4, 6000);
        // the stones crack under the first one: the second waits until they are back
        if (!dame) {
          await wait(() => W.rel(Remote.pos).z > 113, 30000);
          await B.sl(4500);
        }
        for (const [a, b] of [[-1.8, 100.6], [1.8, 104], [-1.6, 107.4], [1.6, 110.6], [0, 115]]) {
          const r = await B.leap([a, 0, b], { ms: 2000 });
          if (r[1] < -0.5) return 'tombé·e des pierres ' + r;
        }
        B.note('reelle', 'pierres qui craquent traversées');
      }
      await B.walk([sx * 2, 0, 117], 0.5, 6000);
      return (await wait(() => x().sec >= 2, 40000)) ? 'sec1 ok' : 'sec1 attente ' + B.rel();
    };

    // ---------------- section 2 ----------------
    const zipCrane = async () => {
      if (z() < 170) {
        await B.walk([-3.4, 0, 116.6], 0.3, 8000);
        await B.walk([-3.4, 6, 124.4], 0.3, 8000);
        await B.walk([0, 6, 128.4], 0.4, 5000);
        await B.tap('interact');
        await wait(() => Player.mode === 'hang', 2500);
        await wait(() => Player.mode === 'walk' && Player.body.grounded, 15000);
        B.note('reelle', 'tyrolienne (E) ' + JSON.stringify(B.rel()));
      }
      if (z() < 222) {
        await B.walk([sx * 1.2, -2, 194.6], 0.4, 10000);
        let ok = false;
        for (let i = 0; i < 8 && !ok && live(); i++) {
          await wait(() => {
            const c = W.craneBox;
            return c && (c.min[2] + c.max[2]) / 2 - W.O.z < 199.2;
          }, 14000, 20);
          const c = W.craneBox;
          const cz = (c.min[2] + c.max[2]) / 2 - W.O.z;
          const cy = c.max[1] - W.O.y;
          const r = await B.leap([sx * 0.6, cy, cz + 1.2], { ms: 2000 });
          if (Player.body.ground === W.craneBox) ok = true;
          else if (r[1] < -3) {
            await wait(() => Player.body.grounded && B.rel()[1] > -2.5, 8000);
            await B.walk([sx * 1.2, -2, 194.6], 0.4, 10000);
          }
        }
        if (!ok) return 'crochet de la grue raté';
        B.note('reelle', 'sauté sur le crochet de la grue');
        await wait(() => {
          const c = W.craneBox;
          return (c.min[2] + c.max[2]) / 2 - W.O.z > 218.6;
        }, 14000, 20);
        const r = await B.leap([sx * 1, -1, 225], { ms: 2500 });
        if (r[1] < -1.5) return 'tombé·e du crochet ' + r;
        B.note('reelle', 'descendu·e du crochet ' + JSON.stringify(r));
      }
      return 'ok';
    };
    const board = async () => {
      if (dame) {
        await B.walk([-6.8, -1, 231.5], 0.5, 15000);
        await B.walk([-6.8, -1, 239.7], 0.5, 8000);
        await B.walk([-5.5, -1, 239.7], 0.3, 5000);
        B.face([-5.5, -1, 241]);
        S.held.add('interact');
        await wait(() => W.rel(Remote.pos).z > 263, 60000);
        S.held.delete('interact');
        B.note('reelle', 'levier 1 tenu (E) pendant que le partenaire traverse sur le panneau');
        await wait(() => (x().hold || []).includes('l2'), 40000);
        await wait(() => Math.abs(boardAt()) < 0.3, 10000);
        await B.walk([0, -1, 243], 0.4, 6000);
        await B.walk([0, -0.6, 262.8], 0.4, 8000, true);
        await B.walk([-2, -0.2, 267], 0.5, 4000);
        B.note('reelle', 'traversé·e sur le panneau');
        return (await wait(() => x().sec >= 3, 15000)) ? 'panneau ok' : 'panneau attente ' + B.rel();
      }
      await B.walk([0, -1, 242.8], 0.4, 15000);
      await wait(() => Math.abs(boardAt()) < 0.3, 60000);
      await B.walk([0, -0.6, 262.8], 0.4, 8000, true);
      B.note('reelle', 'traversé sur le panneau tenu par la Dame');
      await B.walk([5.5, -0.2, 266.2], 0.3, 5000);
      B.face([5.5, -0.2, 265]);
      S.held.add('interact');
      await wait(() => x().sec >= 3, 60000);
      S.held.delete('interact');
      B.note('reelle', 'levier 2 tenu (E)');
      return x().sec >= 3 ? 'panneau ok' : 'panneau attente';
    };
    const sec2 = async () => {
      const r = await zipCrane();
      if (r !== 'ok') return r;
      return board();
    };

    // ---------------- section 3: the run ----------------
    const WP = [[0.8, 288], [1.2, 300], [0, 311], [0, 317.6], [0, 323.5], [0.3, 334], [0.3, 344.8], [1, 352.5], [0.8, 362], [0.8, 372], [0, 384.4]];
    const wpAfter = (zz, lim) => {
      const w = WP.find((p) => p[1] > zz + 0.8) || WP[WP.length - 1];
      return [w[0], 0, Math.min(w[1], lim)];
    };
    const sec3 = async () => {
      B.note('reelle', dame ? 'course : fusil sur les drones et les gardes étourdis' : 'course : épée sur les gardes à bouclier, Voile contre les projecteurs');
      const t0 = performance.now();
      let downs = 0;
      let wasDown = false;
      let revives = 0;
      while (live() && performance.now() - t0 < 300000 && x().sec === 3) {
        const b = Player.body.p;
        const q = W.rel(b);
        const rq = W.rel(Remote.pos);
        S.held.clear();
        S.x = 0;
        S.z = 0;
        if (Combat.down) {
          if (!wasDown) downs++;
          wasDown = true;
          await B.sl(100);
          continue;
        }
        wasDown = false;
        if (Remote.state && Remote.state.down) {
          if (Math.hypot(rq.x - q.x, rq.z - q.z) > 1.3) {
            Cam.yaw = Math.atan2(Remote.pos.x - b.x, Remote.pos.z - b.z);
            B.steer(Remote.pos);
          } else {
            S.held.add('interact');
            if (!revives++) B.note('reelle', 'partenaire à terre : relevé·e (E maintenu)');
          }
          await B.sl(50);
          continue;
        }
        const es = [...Enemies.list.values()];
        const guards = es.filter((e) => e.type === 'gardeToit' && !e.fall && W.rel(e.pos).z > q.z - 3 && W.rel(e.pos).z < q.z + 9);
        const drones = es.filter((e) => e.type === 'drone' && e.pos.distanceTo(b) < 26);
        let goal = wpAfter(q.z, 999);
        const jumps = async () => {
          if (Player.body.grounded && q.z > 316.6 && q.z < 318.2 && (!dame || rq.z > 321)) {
            S.held.clear();
            await B.leap([0, 0, 323.5], { ms: 2200 });
            return true;
          }
          if (Player.body.grounded && q.z > 343.6 && q.z < 345.4 && (!dame || rq.z > 349)) {
            S.held.clear();
            await B.leap([0.6, 1.2, 352], { ms: 2200 });
            return true;
          }
          return false;
        };
        if (!dame) {
          // the Voile when a searchlight is close
          if (drones.some((e) => !(e.stun > 0) && e.pos.distanceTo(b) < 14) && Combat.cloak <= 0 && Combat.cloakCd <= 0) S.held.add('ability');
          const g = guards.sort((a, c) => a.pos.distanceTo(b) - c.pos.distanceTo(b))[0];
          if (g) {
            const d = Math.hypot(g.pos.x - b.x, g.pos.z - b.z);
            if (d > 2) {
              Cam.yaw = Math.atan2(g.pos.x - b.x, g.pos.z - b.z);
              B.steer(g.pos);
            } else {
              B.face(g.pos);
              if (!(g.stun > 0) && Math.random() < 0.3) S.held.add('attack');
            }
            await B.sl(50);
            continue;
          }
          if (rq.z < q.z - 6) goal = [q.x, 0, q.z];
          const gp = B.abs([goal[0], q.y, goal[2]]);
          Cam.yaw = Math.atan2(gp.x - b.x, gp.z - b.z);
          if (Math.hypot(gp.x - b.x, gp.z - b.z) > 0.6) B.steer(gp);
          if (await jumps()) continue;
          await B.sl(50);
          continue;
        }
        const sg = es.find((e) => e.type === 'gardeToit' && e.stun > 0 && e.pos.distanceTo(b) < 20);
        const tg = sg || drones.sort((a, c) => a.pos.distanceTo(b) - c.pos.distanceTo(b))[0];
        goal = rq.z - 2.5 > q.z ? wpAfter(q.z, rq.z - 2.5) : [q.x, 0, q.z];
        if (guards.some((g) => !(g.stun > 0) && Math.hypot(g.pos.x - b.x, g.pos.z - b.z) < 4)) goal = [q.x, 0, q.z - 3];
        if (tg) {
          B.aim(sg ? tg.pos.clone().add(V3(0, 1.1, 0)) : tg.pos);
          S.held.add('attack');
        }
        const gp = B.abs([goal[0], q.y, goal[2]]);
        if (Math.hypot(gp.x - b.x, gp.z - b.z) > 0.6) B.steer(gp);
        if (await jumps()) continue;
        await B.sl(50);
      }
      S.held.clear();
      B.stop();
      const r = 'course : sec' + x().sec + ' à terre ' + downs + ' reprises ' + (x().reset || 0) + ' ' + JSON.stringify(B.rel());
      B.note('reelle', r);
      return r;
    };

    // ---------------- section 4 ----------------
    const sec4 = async () => {
      if (!x().catch) {
        if (dame) {
          await B.walk([0, 1.2, 383], 0.5, 8000);
          if (!(await grab(W.P(W.RING2.x, W.RING2.y, W.RING2.z)))) return 'anneau 2 non verrouillé';
          await wait(() => Player.mode === 'walk' && Player.body.grounded, 6000);
          B.note('reelle', 'grappin sur l’anneau 2 ' + JSON.stringify(B.rel()));
          await B.walk([0, 2, 400.2], 0.3, 5000);
          B.face([0, 2, 380]);
          S.held.add('interact');
          await wait(() => x().catch, 40000);
          S.held.delete('interact');
          B.note('reelle', 'main tendue (E maintenu) : rattrapé');
        } else {
          await B.walk([0, 1.2, 384.4], 0.3, 8000);
          await wait(() => x().reach, 40000);
          await B.sl(300);
          await B.tap('jump');
          await wait(() => x().catch && Player.mode === 'walk', 6000);
          B.note('reelle', 'saut vers la Dame (Espace) depuis le tremplin');
          await B.sl(500);
        }
      }
      await B.walk([sx * 1.2, 2, 411], 0.5, 8000);
      B.note('reelle', 'à la carte');
      await wait(() => false, 10000);
      return live() ? 'pas fini ' + B.rel() + ' catch ' + x().catch : 'won';
    };

    const ST = { 1: sec1, 2: sec2, 3: sec3, 4: sec4 };
    let last = null;
    let same = 0;
    while (live()) {
      const st = Math.min(4, x().sec || 1);
      if (st === last && ++same > 3) {
        log.push('bloqué à la section ' + st);
        break;
      }
      if (st !== last) same = 0;
      last = st;
      log.push(await ST[st]());
      B.stop();
      S.held.clear();
      if (live() && Math.min(4, x().sec || 1) === st) await wait(() => Math.min(4, x().sec || 1) !== st, 8000);
    }
    return Story.role + ': ' + log.join(' / ');
  },
};
