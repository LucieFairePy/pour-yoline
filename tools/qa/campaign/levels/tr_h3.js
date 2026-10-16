// tr_h3 « Les Yeux bandés » — campaign solver (kits swapped: Yoline carries 'valet').
// Stage 1 maze: valet blind (walks the maze path, sidesteps the half bell plates), dame guides
//   from the walkway (stair up at the left, along the top, stair down at the right).
// Stage 2 pond: dame blind (hops stone to stone, beam, island), valet guides from the boardwalk
//   and drops sound markers (aim at a stone + E) ahead of her.
// Stages 3/4 dance: each beat both stand on their tile (the seer's tile, the blind one's mirror);
//   then the final pair [2,3]/[4,3], then both under the card (stage 5) → reward.
// Everything is real keys/stick; the blind one's targets come from what the guide sees on screen.
window.CL = {
  timeout: 900,
  async run() {
    const W = H3;
    B.W = W;
    const me = Story.role;
    const dame = me === 'dame';
    const X = () => Story.S.x || {};
    const live = () => !CL.abort && Story.S.phase === 'tr_h3';
    const st = () => X().stage;
    const q = () => W.rel(Player.body.p);
    const done = [];
    // walk toward p while cond() holds (stops at once when the stage changes or a respawn hits)
    const wk = async (p, near = 0.6, ms = 15000, cond = () => true, sprint = false) => {
      p = B.abs(p);
      const t = performance.now();
      if (sprint) Input.sim.held.add('sprint');
      let ok = false;
      while (performance.now() - t < ms && live() && cond()) {
        const b = Player.body.p;
        if (Math.hypot(p.x - b.x, p.z - b.z) < near) {
          ok = true;
          break;
        }
        Cam.yaw = Math.atan2(p.x - b.x, p.z - b.z);
        B.steer(p);
        await B.sl(30);
      }
      B.stop();
      return ok;
    };
    const seq = async (pts, cond, near = 0.6, sprint = false) => {
      for (const p of pts) {
        if (!live() || !cond()) return false;
        if (!(await wk(p, near, 20000, cond, sprint))) return false;
      }
      return true;
    };
    const inSt = (...s) => () => s.includes(st());

    // ---------------- stage 1 ----------------
    const mazeWps = () => {
      const plates = W.maze.plates;
      return W.maze.path.map(([i, j]) => {
        let [x, z] = W.cellPos(i, j);
        const p = plates.find((pp) => pp.half && Math.abs(pp.x - x) < 2 && Math.abs(pp.z - z) < 2);
        // a half plate fills one side of this cell: keep to the other side
        if (p) {
          x -= p.x - x;
          z -= p.z - z;
        }
        return [x, 0, z];
      });
    };
    const blindMaze = async () => {
      B.note('reelle', 'labyrinthe les yeux bandés : chemin que la Dame voit d’en haut (dalles à clochette visibles pour elle), demi-dalles évitées');
      const wps = mazeWps();
      const cond = inSt(1);
      let traps = X().traps || 0;
      let k = 0;
      // from the gate into the first cell
      await wk([0, 0, 9], 0.5, 8000, cond);
      while (live() && st() === 1) {
        if (k >= wps.length) {
          await wk([0, 0, 47.6], 0.5, 6000, cond);
          await B.sl(300);
          if (st() === 1) k = 0;
          continue;
        }
        const ok = await wk(wps[k], 0.35, 8000, () => cond() && (X().traps || 0) === traps);
        if ((X().traps || 0) !== traps) {
          // a bell rang: the level sends us back (gate or the blue lantern) — wait, then resume
          traps = X().traps || 0;
          B.note('reelle', 'clochette (' + traps + ') : retour au départ par le jeu');
          await B.sl(1400);
          const c = q();
          let bi = 0, bd = 1e9;
          wps.forEach((w, i) => {
            const d = Math.hypot(w[0] - c.x, w[2] - c.z);
            if (d < bd) {
              bd = d;
              bi = i;
            }
          });
          k = c.z < 10.5 ? 0 : bi;
          if (c.z < 10.5) await wk([0, 0, 9], 0.5, 8000, cond);
          continue;
        }
        if (ok) k++;
        else {
          // stuck at a hedge corner: re-align on the nearest cell
          const c = q();
          let bi = k, bd = 1e9;
          wps.forEach((w, i) => {
            const d = Math.hypot(w[0] - c.x, w[2] - c.z);
            if (d < bd) {
              bd = d;
              bi = i;
            }
          });
          k = bi;
        }
      }
      done.push('labyrinthe traversé (' + (X().traps || 0) + ' clochettes)');
    };
    const guideMaze = async () => {
      B.note('reelle', 'guide : escalier de gauche, passerelle à 5 m');
      const cond = inSt(1);
      const XO = 19.65;
      await seq([[-18.4, 0, -3], [-19.45, 0, -2.6], [-19.45, 5, 6.2], [-XO, 5, 9.5], [-XO, 5, 30]], cond, 0.5);
      // watch from the left side until the blind one is near the exit
      while (live() && st() === 1) {
        const r = Remote.has ? W.rel(Remote.pos) : null;
        if (r && r.z > 34) break;
        if (r) await wk([-XO, 5, Math.max(10, Math.min(46, r.z))], 0.8, 1500, cond);
        await B.sl(300);
      }
      if (st() === 1) {
        B.note('reelle', 'guide : le long du haut de la passerelle, escalier de droite vers l’étang');
        await seq([[-XO, 5, 47.6], [XO, 5, 47.6], [19.45, 5, 49.4], [19.45, 0, 56.6]], cond, 0.5, true);
      }
    };

    // ---------------- stage 2 ----------------
    const toPondStart = async () => {
      const cond = inSt(2);
      // on the walkway/stair when the stage turned: the level puts the blind one back at the shore
      if (q().y > 0.8) await B.until(() => q().y < 0.5 && Player.body.grounded, 4000);
      let c = q();
      if (c.x > 10 && c.z > 48) await seq([[c.x, 0, 56.6], [13, 0, 56.6], [13, 0, 50.8], [6, 0, 50.8]], cond, 0.6, true);
      c = q();
      if (c.z < 47) await wk([0, 0, 50], 0.8, 20000, cond, true);
      await wk([-0.6, 0, 60.8], 0.35, 20000, cond);
    };
    // the crossing, in order: ['w'|'j', [x, y, z]]
    const CROSS = [
      ['j', [-0.9, 0, 63]],
      ['j', [0.7, 0, 65.3]],
      ['j', [-0.5, 0, 67.6]],
      ['j', [1.5, 0, 69.8]],
      ['j', [0, 0, 72]],
      ['j', [0, 0, 74.1]],
      ['w', [0, 0, 79.4]],
      ['w', [0, 0, 82.4]], // ISLE: resume here after a splash once the island is reached
      ['w', [-1.2, 0, 83.9]],
      ['j', [-1.6, 0, 86]],
      ['j', [-2.9, 0, 88.2]],
      ['j', [-1.1, 0, 90.5]],
      ['j', [0.9, 0, 92.6]],
      ['j', [2.3, 0, 94.8]],
      ['j', [1, 0, 97]],
      ['j', [-0.4, 0, 99.1]],
      ['j', [-0.2, 0, 102]],
      ['w', [0, 0, 104]],
    ];
    const ISLE = 7;
    const blindPond = async () => {
      B.note('reelle', 'étang les yeux bandés : vers les repères sonores, de pierre en pierre (sauts)');
      const cond = inSt(2);
      await toPondStart();
      let k = 0;
      let falls = 0;
      while (live() && st() === 2 && k < CROSS.length) {
        const [how, p] = CROSS[k];
        if (how === 'w') await wk(p, 0.4, 6000, cond);
        else {
          // the pads sink after 1.5 s: never stand still on them
          await B.leap(p, { run: 100 });
        }
        const c = q();
        if (c.y < -0.6 || Math.hypot(c.x - p[0], c.z - p[2]) > 2.5) {
          // in the water (or sent back): wait for the respawn, resume from where we are
          falls++;
          await B.until(() => q().y > -0.3 && Player.body.grounded, 6000);
          await B.sl(600);
          const r = q();
          if (r.z > 80 && r.z < 84.5 && X().isle) k = ISLE;
          else {
            k = 0;
            await wk([-0.6, 0, 60.8], 0.35, 8000, cond);
          }
          if (falls > 12) B.note('reelle', 'étang : ' + falls + ' chutes');
          continue;
        }
        k++;
      }
      // past the last stone: the far shore turns the stage
      await B.until(() => st() !== 2 || !live(), 6000);
      done.push('étang traversé (' + falls + ' chutes)');
    };
    const guidePond = async () => {
      B.note('reelle', 'guide : vers le ponton, repères sonores devant la Dame (viser + E)');
      const cond = inSt(2);
      const c = q();
      if (c.x < 6.5 || c.y < 1.6) await seq([[0, 0, 48.5], [7.6, 0, 51], [8.3, 0, 52.3], [8.5, 2.2, 58]], cond, 0.5);
      while (live() && st() === 2) {
        const r = Remote.has ? W.rel(Remote.pos) : V3(0, 0, 60);
        await wk([8.5, 2.2, Math.max(57, Math.min(100, r.z + 1))], 1, 1500, cond);
        const marks = X().marks || [];
        // the next stone ahead of her (the trunk excepted), not yet marked
        let best = -1, bz = 1e9;
        W.stones.forEach((s, i) => {
          if (s.kind === 'b' || s.z < r.z + 0.6 || s.z > r.z + 8) return;
          if (marks.includes(i)) return;
          if (s.z < bz) {
            bz = s.z;
            best = i;
          }
        });
        if (best >= 0) {
          const s = W.stones[best];
          for (let n = 0; n < 6; n++) {
            B.aim([s.x, s.top, s.z]);
            await B.sl(40);
          }
          await B.tap('interact');
          await B.sl(250);
          if ((X().marks || []).includes(best)) B.note('reelle', 'repère sur la pierre ' + best + ' (z ' + s.z + ')');
        }
        await B.sl(500);
      }
      Cam.pitch = 0.2;
    };

    // ---------------- stages 3-5: the ballroom ----------------
    const toBallroom = async () => {
      const cond = () => st() >= 3;
      const c = q();
      if (c.x > 6.5 && c.y > 1.2) {
        B.note('reelle', 'guide : bout du ponton, escalier, porte du bal');
        await seq([[8.5, 2.2, 103.6], [8.5, 0, 107.0], [5, 0, 106.95], [1, 0, 107.0]], cond, 0.5, true);
      } else if (c.z < 104) await wk([0, 0, 104.5], 0.6, 15000, cond, true);
      await seq([[0, 0, 107.2], [0, 0, 110.5], [dame ? -3 : 3, 0, 116]], cond, 0.6, true);
    };
    const tileOf = (t) => W.tileCenter(t[0], t[1]);
    const dance = async () => {
      await toBallroom();
      B.note('reelle', 'bal : chacun sur sa dalle à chaque temps (la cible de l’aveugle est celle que la guide voit en bleu et lui annonce)');
      let lastSt = 0;
      while (live() && (st() === 3 || st() === 4)) {
        const x = X();
        const d = x.dance || {};
        if (x.stage !== lastSt) {
          lastSt = x.stage;
          B.note('reelle', 'danse ' + (x.stage - 2) + ' (aveugle : ' + (x.stage === 3 ? 'valet' : 'dame') + ')');
        }
        let tg;
        if (d.ph === 'run' && d.seer) {
          const seer = x.stage === 3 ? 'dame' : 'valet';
          tg = me === seer ? d.seer : [6 - d.seer[0], d.seer[1]];
        } else if (d.ph === 'final') tg = dame ? [2, 3] : [4, 3];
        else tg = dame ? [1, 3] : [5, 3];
        const beat = d.beat;
        await wk(tileOf(tg), 0.3, 2500, () => {
          const y = X().dance || {};
          return y.beat === beat && y.ph === d.ph && X().stage === x.stage;
        });
        await B.sl(80);
      }
      if (st() === 5) {
        done.push('deux danses, rejoints au milieu');
        B.note('reelle', 'carte : sous le cœur, ensemble');
        while (live()) {
          await wk([dame ? -0.8 : 0.8, 0, W.GZ], 0.4, 3000);
          await B.sl(500);
        }
      }
    };

    // ---------------- main ----------------
    while (live()) {
      const s = st();
      if (s === 1) await (dame ? guideMaze() : blindMaze());
      else if (s === 2) await (dame ? blindPond() : guidePond());
      else if (s >= 3) {
        await dance();
        await B.sl(300);
      } else await B.sl(300);
      if (s === st() && s < 3) await B.sl(200);
    }
    B.stop();
    return me + ': ' + (done.join(', ') || 'rien') + ' · phase ' + Story.S.phase;
  },
};
