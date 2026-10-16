// tr_sR · Le Roi de Pique (Salle du Trône, js/world/cour_s.js area C). Kits as usual. The champion
// (one armour, boss) faces one player (x.focus); only the other one can hurt it, from behind:
// the sword (valet) anywhere on its back, bullets (dame) on the white core (view.core). After a
// salvo it turns to the hitter. The focus dodges (stays in front at ~7.5 m, steps aside on a
// thrust/charge wind-up, back on a sweep), everyone jumps over the shockwave rings, a downed
// partner is raised (E held near them). Real keys only. Then stage 2 → 3 plays the cinematic
// (Cut.play('cour_s')) which a player skips by holding E (> 1.2 s).
(() => {
  const W = CourS;
  B.W = W;
  const X = () => Story.S.x;
  const S = Input.sim;
  const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_sR';

  // a shockwave front drawn on this screen about to reach me (the torus meshes the level adds)
  const ringsNear = () => {
    const p = Player.body.p;
    for (const o of R.scene.children) {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'TorusGeometry' || !o.visible || o.position.y > W.O.y + 1) continue;
      const R0 = o.scale.x;
      const d = Math.hypot(p.x - o.position.x, p.z - o.position.z);
      if (d - R0 > 0.6 && d - R0 < 2.2) return true;
    }
    return false;
  };

  const fight = async () => {
    const me = Story.role;
    let jumps = 0;
    let atk = 0;
    let revives = 0;
    let lastPh = 0;
    let lastTurns = -1;
    while (live() && X().stage === 1) {
      const p = Player.body.p;
      const b = Enemies.boss();
      if (X().ph !== lastPh) {
        lastPh = X().ph;
        B.note('reelle', 'champion phase ' + lastPh + ' (pv ' + X().hp + ')');
      }
      if (X().turns !== lastTurns && X().turns % 4 === 0) {
        lastTurns = X().turns;
        B.note('reelle', 'retournements : ' + lastTurns + ' — focus ' + X().focus + ', pv ' + X().hp);
      }
      if (ringsNear() && Player.body.grounded) {
        S.held.add('jump');
        await B.sl(60);
        S.held.delete('jump');
        jumps++;
        continue;
      }
      if (Combat.down) {
        B.stop();
        S.held.delete('attack');
        await B.sl(100);
        continue;
      }
      if (Remote.state && Remote.state.down) {
        // raise the partner: E held beside them
        S.held.delete('attack');
        const rp = Remote.pos;
        if (Math.hypot(rp.x - p.x, rp.z - p.z) > 1.6) {
          Cam.yaw = Math.atan2(rp.x - p.x, rp.z - p.z);
          B.steer(rp);
          S.held.add('sprint');
          S.held.delete('interact');
        } else {
          B.stop();
          if (!S.held.has('interact')) revives++;
          S.held.add('interact');
        }
        await B.sl(40);
        continue;
      }
      S.held.delete('interact');
      if (!X().fight || !b) {
        // walk into the room: the fight starts once both are 6 m in
        await B.walk([me === 'dame' ? -3 : 3, 0, 212], 0.6, 2000);
        continue;
      }
      const fx = Math.sin(b.yaw);
      const fz = Math.cos(b.yaw);
      const focus = X().focus === me;
      let spot;
      if (focus) {
        const side = b.st === 1 || b.st === 5 || b.st === 6 ? 3.5 : 0;
        spot = V3(b.pos.x + fx * 7.5 + fz * side, 0, b.pos.z + fz * 7.5 - fx * side);
        if (b.st === 2) spot = V3(b.pos.x + fx * 9, 0, b.pos.z + fz * 9);
      } else {
        const back = me === 'valet' ? 2.6 : 8;
        spot = V3(b.pos.x - fx * back, 0, b.pos.z - fz * back);
      }
      spot.x = clamp(spot.x, W.O.x - 15, W.O.x + 15);
      spot.z = clamp(spot.z, W.O.z + 192, W.O.z + 230);
      const d = Math.hypot(spot.x - p.x, spot.z - p.z);
      if (d > 0.7) {
        Cam.yaw = Math.atan2(spot.x - p.x, spot.z - p.z);
        B.steer(spot);
        S.held.add('sprint');
      } else {
        S.x = 0;
        S.z = 0;
        S.held.delete('sprint');
      }
      if (!focus) {
        if (me === 'valet') {
          const db = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
          if (db < 4.0 && !(Combat.atkCd > 0)) {
            Cam.yaw = Math.atan2(b.pos.x - p.x, b.pos.z - p.z);
            S.held.add('attack');
            await B.sl(40);
            S.held.delete('attack');
            atk++;
          }
        } else if (b.view && b.view.core) {
          const cp = b.view.core.getWorldPosition(V3());
          if (d < 3) {
            B.aim(cp);
            if (Combat.reloadT <= 0) {
              S.held.add('attack');
              atk++;
            }
          } else S.held.delete('attack');
        }
      } else S.held.delete('attack');
      await B.sl(30);
    }
    B.stop();
    S.held.delete('attack');
    S.held.delete('interact');
    return 'sauts=' + jumps + ' coups=' + atk + ' relevés=' + revives;
  };

  window.CL = {
    timeout: 900,
    async run() {
      const r = await fight();
      if (!live()) return 'combat: ' + r;
      B.note('reelle', 'le champion s’agenouille (' + r + ', chutes à deux ' + (X().wipes || 0) + ')');
      // stage 2 lasts ~9 s, then stage 3 plays the cinematic: skip it by holding E
      const film = await B.until(() => !live() || (typeof Cut !== 'undefined' && Cut.on), 30000, 100);
      if (live() && film && Cut.on) {
        await B.sl(1500);
        await B.hold('interact', 1600);
        B.note('reelle', 'cinématique cour_s passée (E maintenu)');
      }
      await B.until(() => !live(), 60000, 200);
      return 'combat: ' + r;
    },
  };
})();
