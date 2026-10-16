// tr_sD · La Dame de Pique (Salle d'armes, js/world/cour_s.js area B). Kits as usual. Three
// measures of homing spades: iron ones fly at the dame kit and only the sword (valet) turns them;
// glass ones fly at the valet kit and only a bullet (dame) breaks them. Real weapon hits through
// Combat (left mouse = 'attack'): the sword at its own pace (Combat.atkCd), the rifle aimed with
// the camera (B.aim) and held. The level starts a measure by itself when both stand in the hall.
(() => {
  const W = CourS;
  B.W = W;
  const X = () => Story.S.x;
  const S = Input.sim;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_sD';
  const C0 = () => W.P(W.B.c[0], 0, W.B.c[1]);

  // the sword: keep beside the partner (a step toward the dais), strike the nearest iron spade in reach
  const guard = async () => {
    let hits = 0;
    let lastM = 0;
    while (live() && X().stage === 1) {
      if (X().m !== lastM) {
        lastM = X().m;
        B.note('reelle', 'mesure ' + lastM + ' (épée) — essais ' + (X().att || 0));
      }
      const p = Player.body.p;
      let best = null;
      let bd = 9;
      for (const e of Enemies.list.values()) {
        if (e.type !== 'sdFer' || e.dead) continue;
        const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      const m = Remote.pos;
      const c = C0();
      const k = 1.3 / Math.max(1, Math.hypot(c.x - m.x, c.z - m.z));
      const spot = V3(m.x + (c.x - m.x) * k + 0.9, 0, m.z + (c.z - m.z) * k);
      if (best && bd < 3.0) {
        S.x = 0;
        S.z = 0;
        Cam.yaw = Math.atan2(best.pos.x - p.x, best.pos.z - p.z);
        if (!(Combat.atkCd > 0)) {
          S.held.add('attack');
          await B.sl(40);
          S.held.delete('attack');
          hits++;
        }
        await B.sl(40);
      } else {
        if (Math.hypot(spot.x - p.x, spot.z - p.z) > 0.8) {
          Cam.yaw = Math.atan2(spot.x - p.x, spot.z - p.z);
          B.steer(spot);
        } else {
          S.x = 0;
          S.z = 0;
        }
        await B.sl(30);
      }
    }
    B.stop();
    return hits;
  };
  // the rifle: aim at the nearest glass spade once it has left the dais, fire (held attack)
  const shoot = async () => {
    let n = 0;
    let lastM = 0;
    while (live() && X().stage === 1) {
      if (X().m !== lastM) {
        lastM = X().m;
        B.note('reelle', 'mesure ' + lastM + ' (fusil) — essais ' + (X().att || 0));
      }
      const p = Player.body.p;
      let best = null;
      let bd = 30;
      for (const e of Enemies.list.values()) {
        if (e.type !== 'sdVerre' || e.dead) continue;
        const d = e.pos.distanceTo(p);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      const c = C0();
      if (best && Math.hypot(best.pos.x - c.x, best.pos.z - c.z) > 3.2 && Combat.reloadT <= 0) {
        B.aim(best.pos);
        S.held.add('attack');
        n++;
      } else {
        S.held.delete('attack');
        if (!best && Combat.mag < 12 && Combat.reloadT <= 0) await B.tap('reload', 60);
      }
      await B.sl(30);
    }
    S.held.delete('attack');
    return n;
  };

  window.CL = {
    timeout: 900,
    async run() {
      // both start inside the hall (spawn B); the measures start by themselves after the intro
      const hall = await B.until(() => W.at('B', W.rel(Player.body.p)), 10000);
      B.note('reelle', 'dans la Salle d’armes : ' + (hall ? 'oui' : 'non'));
      let r;
      if (Story.role === 'valet') r = 'épée: ' + (await guard()) + ' coups';
      else r = 'fusil: ' + (await shoot()) + ' tirs';
      if (!live()) return r + ' (fin)';
      B.note('reelle', 'trois mesures gagnées (essais ' + X().att + ', ratées ' + X().fails + ')');
      await B.go([Story.role === 'dame' ? -1.5 : 1.5, 0, 161.5], { near: 0.8, ms: 40000 });
      B.note('reelle', 'près de la carte');
      await B.until(() => !live(), 60000, 200);
      return r;
    },
  };
})();
