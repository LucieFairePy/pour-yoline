// tr_sV · Le Valet de Pique (Galerie des râteliers, js/world/cour_s.js). Kits swapped: the valet kit
// takes the low lane (pillars, portcullises, targets, maces, pistons), the dame kit the high lane
// (stairs, grapple rings, winches, drawbridges). Each page plays its own lane with real keys:
// valet: jumps (B.leap), E on the target shields; dame: grapple (aim + F), E held on the winches.
// Clocks: the maces and pistons run on the game clock (Game.clock.t), which is what the level's
// update() passes to W.update / W.maceHit.
(() => {
  const W = CourS;
  const A = W.A;
  B.W = W;
  const X = () => Story.S.x;
  const S = Input.sim;
  const gt = () => Game.clock.t;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_sV';
  const q = () => W.rel(Player.body.p);
  const padOf = (p) => {
    for (let i = 0; i < A.pads.length; i++) {
      const [x, z, w, d, top] = A.pads[i];
      if (Math.abs(p.x - x) < w / 2 + 0.3 && Math.abs(p.z - z) < d / 2 + 0.3 && Math.abs(p.y - top) < 0.6) return i;
    }
    return -1;
  };
  const padP = (i) => [A.pads[i][0], A.pads[i][4], A.pads[i][1]];
  // after a fall the level respawns us at the lane checkpoint: wait for it to settle
  const settle = async () => {
    await B.until(() => Player.body.grounded && W.rel(Player.body.p).y > -1, 9000, 50);
    await B.sl(500);
  };
  const fell = () => q().y < -1.5;

  // ---------------- valet kit: the low lane ----------------
  // hop from the pad we stand on to the pad `to`; false when we fell (back at the checkpoint)
  const hopTo = async (to, o = {}) => {
    const r = await B.leap(padP(to), { ms: 2600, ...o });
    await B.sl(250);
    if (padOf(q()) === to) return true;
    B.note('reelle', 'saut raté vers le pilier ' + to + ' (arrivé ' + r + ')');
    if (fell() || padOf(q()) < 0) await settle();
    return false;
  };
  // a mace gap is safe when no mace crosses the hop's line in the next 0.9 s (game clock)
  const maceSafe = (zm) => {
    const t = gt();
    for (let dt = 0; dt < 0.9; dt += 0.04)
      for (let y = 1.2; y < 3.5; y += 0.5)
        for (let z = zm - 1.2; z <= zm + 1.2; z += 0.6) if (W.maceHit(V3(-6.5, y, z), t + dt)) return false;
    return true;
  };
  const strike = async (i, cpNeeded) => {
    // stand on the pillar by the shield, face it, E (the level's update() sends {a:'strike', i})
    await B.walk([-9.4, 1.2, A.target[i][1]], 0.35, 8000);
    B.face([A.target[i][0], 2.5, A.target[i][1]]);
    await B.tap('interact');
    await B.until(() => X().br[i] === 1, 3000);
    B.note('reelle', 'bouclier ' + i + ' frappé (E) : pont-levis ' + (X().br[i] ? 'baissé' : 'pas baissé'));
    // stay by the shield until the partner is across (strike again if the bridge went back up)
    const t0 = performance.now();
    while (live() && X().cpD < cpNeeded && performance.now() - t0 < 240000) {
      if (!X().br[i]) {
        await B.sl(600);
        if (!X().br[i] && X().cpD < cpNeeded) {
          await B.walk([-9.4, 1.2, A.target[i][1]], 0.35, 4000);
          B.face([A.target[i][0], 2.5, A.target[i][1]]);
          await B.tap('interact');
          B.note('reelle', 'pont-levis ' + i + ' remonté avant le passage : nouvelle frappe');
        }
      }
      await B.sl(300);
    }
  };
  const throughHerse = async (i) => {
    const hz = A.herse[i];
    await B.walk([-6.5, 1.2, hz - 1.1], 0.35, 8000);
    B.note('reelle', 'devant la herse ' + i + ', on attend le treuil');
    await B.until(() => !live() || (X().herse[i] === 1 && W.herseK(i) > 0.9), 300000, 50);
    if (!live()) return;
    await B.walk([-6.5, 1.2, hz + 2.7], 0.5, 6000, true);
    B.note('reelle', 'passé sous la herse ' + i);
  };
  const pistons = async () => {
    // from pad 9 (z 66) across the four pistons to the end ledge; a fall respawns at V4 (pad 9)
    await B.walk([-6.5, 1.2, 68.2], 0.4, 6000);
    const P = A.pistons;
    for (let i = 0; i < P.length && live(); i++) {
      const myY = () => q().y;
      await B.until(() => {
        const top = W.pistonTop(i, gt() + 0.5);
        return top > myY() - 0.6 && top < myY() + 1.3;
      }, 12000, 20);
      await B.leap([P[i][0], W.pistonTop(i, gt() + 0.6), P[i][1]], { ms: 2600 });
      await B.sl(200);
      const p = q();
      if (!(Math.hypot(p.x - P[i][0], p.z - P[i][1]) < 1.6 && p.y > -1.2)) {
        B.note('reelle', 'piston ' + i + ' manqué, retour au palier');
        await settle();
        return false;
      }
    }
    await B.until(() => W.pistonTop(3, gt()) > 0.2, 10000, 20);
    await B.leap([-5, 0, 95], { ms: 2800 });
    await B.sl(300);
    if (!W.at('END', q())) {
      await settle();
      return false;
    }
    B.note('reelle', 'pistons passés : palier du fond');
    return true;
  };
  const valet = async () => {
    let guard = 0;
    while (live() && X().cpV < 5 && guard++ < 80) {
      const cp = X().cpV;
      const here = padOf(q());
      if (cp === 0) {
        // start ledge → pads 0,1,2,3
        if (here < 0) {
          await B.walk([-6.5, 0, 10], 0.4, 10000);
          if (!(await hopTo(0))) continue;
        }
        const from = padOf(q());
        if (from >= 0 && from < 3) await hopTo(from + 1);
        if (X().cpV >= 1) B.note('reelle', 'piliers 0-3 sautés');
      } else if (cp === 1) {
        await throughHerse(0);
      } else if (cp === 2) {
        if (X().cpD < 2) await strike(0, 2);
        // pad 4 → 5, then the mace gaps 5→6→7→8
        let from = padOf(q());
        if (from === 4) {
          await B.walk([-6.5, 1.2, 38], 0.4, 4000);
          if (!(await hopTo(5))) continue;
          from = 5;
        }
        if (from >= 5 && from < 8) {
          const zm = A.maces[from - 5][1];
          await B.walk([-6.5, 1.2, A.pads[from][1] + 0.7], 0.3, 4000);
          await B.until(() => maceSafe(zm), 9000, 20);
          if (await hopTo(from + 1)) B.note('reelle', 'masse ' + (from - 5) + ' évitée');
        }
      } else if (cp === 3) {
        await throughHerse(1);
      } else if (cp === 4) {
        if (X().cpD < 4) await strike(1, 4);
        await pistons();
      }
    }
    await B.go([-1.5, 0, 106], { near: 0.8, ms: 30000 });
    B.note('reelle', 'valet sur le palier du fond, près de la carte');
    return 'valet: lane cp=' + X().cpV;
  };

  // ---------------- dame kit: the high lane ----------------
  const grapple = async (i) => {
    for (let k = 0; k < 12; k++) {
      B.aim(W.ringPos(i));
      await B.sl(200);
      if (Player.lockTarget === i) {
        await B.tap('ability');
        break;
      }
      await B.sl(150);
    }
    await B.until(() => Player.mode === 'walk' && Player.body.grounded, 6000);
    await B.sl(300);
    B.note('reelle', 'grappin (F) sur l’anneau ' + i + ' → ' + B.rel());
  };
  const winch = async (i, cpVneeded) => {
    await B.walk([A.winch[i][0] + 0.9, A.HY, A.winch[i][1]], 0.3, 8000);
    B.note('reelle', 'treuil ' + i + ' : E maintenu');
    S.held.add('interact');
    await B.until(() => !live() || X().cpV >= cpVneeded, 400000, 100);
    S.held.delete('interact');
    B.note('reelle', 'treuil ' + i + ' lâché (valet passé)');
  };
  const cross = async (i, toZ) => {
    await B.until(() => !live() || (X().br[i] === 1 && W.bridgeK(i) > 0.95), 300000, 50);
    if (!live()) return;
    await B.walk([6.8, A.HY, toZ], 0.6, 12000, true);
    B.note('reelle', 'pont-levis ' + i + ' traversé');
  };
  const dame = async () => {
    let guard = 0;
    while (live() && X().cpD < 5 && guard++ < 40) {
      const cp = X().cpD;
      if (cp === 0) {
        await B.walk([6.8, 0, 3.5], 0.4, 8000);
        await B.walk([6.8, A.HY, 14.5], 0.4, 12000);
        await grapple(0);
      } else if (cp === 1) {
        if (X().cpV < 2) await winch(0, 2);
        await cross(0, 49);
        if (fell()) await settle();
      } else if (cp === 2) {
        await B.walk([6.8, A.HY, 50.5], 0.5, 6000);
        await grapple(1);
      } else if (cp === 3) {
        if (X().cpV < 4) await winch(1, 4);
        await cross(1, 86);
        if (fell()) await settle();
      } else if (cp === 4) {
        await B.walk([6.8, A.HY, 87], 0.4, 4000);
        await B.leap([5, 0, 95], { ms: 3000 });
        await B.sl(300);
        if (fell()) await settle();
      }
    }
    await B.go([1.5, 0, 106], { near: 0.8, ms: 30000 });
    B.note('reelle', 'dame sur le palier du fond, près de la carte');
    return 'dame: lane cp=' + X().cpD;
  };

  window.CL = {
    timeout: 900,
    async run() {
      const r = Story.role === 'valet' ? await valet() : await dame();
      // the level ends when both stand by the card (stage 2) for 1.2 s
      await B.until(() => !live(), 120000, 200);
      return r + ' stage=' + (Story.S && Story.S.x ? Story.S.x.stage : '?');
    },
  };
})();
