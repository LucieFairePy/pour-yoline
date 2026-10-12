const Boss = (() => {
  const st = { summon: 3, volley: 4, cycle: 4, slamAt: -1, slamPos: null, plates: 0 };

  const phaseOf = (e) => (e.hp > e.max * 0.66 ? 1 : e.hp > e.max * 0.33 ? 2 : 3);

  return {
    plates: { dame: null, valet: null },
    reset() {
      Object.assign(st, { summon: 3, volley: 4, cycle: 4, slamAt: -1, slamPos: null, plates: 0 });
    },
    mult(e, weak) {
      if (e.phase === 1) return e.shieldDown > 0 ? (weak ? 2 : 1) : 0;
      if (e.phase === 2) return e.stun > 0 ? (weak ? 2 : 1) : 0.12;
      return e.crystalDown > 0 ? (weak ? 2.5 : 1) : 0;
    },
    switchPressed(e) {
      if (e && e.phase === 1 && !(e.shieldDown > 0)) {
        e.shieldDown = 12;
        Net.send('bossfx', 'shield');
        Sound.play('shieldDown');
        HUD.say(CONFIG.garde.shieldDown, CONFIG.garde.boss, 2200);
      }
    },
    simulate(e, dt, players, targets) {
      const ph = phaseOf(e);
      if (ph !== e.phase) {
        e.phase = ph;
        e.shieldDown = 0;
        e.crystalDown = 0;
        st.cycle = 3;
        Net.send('bossfx', 'phase' + ph);
        Sound.play('roar');
        HUD.say(CONFIG.garde['phase' + ph], CONFIG.garde.boss, 2600);
      }
      e.shieldDown = Math.max(0, (e.shieldDown || 0) - dt);
      e.crystalDown = Math.max(0, (e.crystalDown || 0) - dt);
      e.recover = Math.max(0, (e.recover || 0) - dt);
      e.shield = e.phase === 1 && e.shieldDown <= 0;
      e.crystal = e.phase === 3 && e.crystalDown <= 0;
      const tgt = targets.length ? targets[(Math.random() * targets.length) | 0] : null;
      if (tgt)
        e.yaw = angleDamp(e.yaw, Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z), 2, dt);
      if (e.phase === 3 && e.crystal) {
        const pd = players.find((p) => p.who === 'dame');
        const pv = players.find((p) => p.who === 'valet');
        const on = (p, plate) =>
          p && plate && !p.down && Math.hypot(p.pos.x - plate.x, p.pos.z - plate.z) < 1.8;
        if (on(pd, Boss.plates.dame) && on(pv, Boss.plates.valet)) {
          st.plates += dt;
          if (st.plates > 2.5) {
            st.plates = 0;
            e.crystalDown = 14;
            Net.send('bossfx', 'crystal');
            Sound.play('shatter');
            HUD.say(CONFIG.garde.crystal, CONFIG.garde.boss, 2200);
          }
        } else st.plates = Math.max(0, st.plates - dt * 2);
      }
      if (e.stun > 0) return;
      st.volley -= dt;
      if (st.volley <= 0 && tgt) {
        st.volley = e.phase === 3 ? 3 : 4.5;
        const from = e.pos.clone().add(V3(0, 4.2, 0));
        [-0.25, 0, 0.25].forEach((a) => {
          const to = tgt.pos.clone().add(V3(Math.sin(a) * 6, 1, Math.cos(a) * 0));
          to.x += a * 8;
          Enemies.fire(from, to, 12, 12);
        });
      }
      if (e.phase === 1) {
        st.summon -= dt;
        if (st.summon <= 0) {
          st.summon = 8;
          if (Enemies.alive('pion') < 5)
            [-1, 1].forEach((s) => Enemies.spawn('pion', e.pos.clone().add(V3(s * 6, 0, -4))));
        }
      }
      if (e.phase >= 2) {
        st.cycle -= dt;
        if (st.cycle <= 0 && tgt && st.slamAt < 0) {
          st.cycle = e.phase === 3 ? 9 : 7;
          st.slamPos = tgt.pos.clone();
          st.slamAt = 1.6;
          Enemies.telegraph(st.slamPos, 4.5, 1.6);
          Net.send('tel', [st.slamPos.x, st.slamPos.y, st.slamPos.z, 4.5, 1.6]);
        }
        if (st.slamAt >= 0) {
          st.slamAt -= dt;
          if (st.slamAt < 0) {
            players.forEach((p) => {
              if (!p.down && Math.hypot(p.pos.x - st.slamPos.x, p.pos.z - st.slamPos.z) < 4.5)
                Combat.hurt(p.who, 30, st.slamPos);
            });
            e.recover = 3.2;
            Net.send('bossfx', 'slam');
            Sound.play('slam');
            Cam.shake = 0.35;
            Fx.burst(st.slamPos.clone().add(V3(0, 0.3, 0)), '#ff3a5a', 160, 9, 1, -8);
          }
        }
      }
    },
    render(e, m, dt, t) {
      m.shield.visible = !!e.shield;
      m.shield.scale.setScalar(1 + Math.sin(t * 3) * 0.02);
      m.crystal.visible = !!e.crystal;
      m.crystal.rotation.y = t * 2;
      m.crystal.position.y = 8 + Math.sin(t * 2) * 0.3;
      const vuln =
        (e.phase === 1 && !e.shield) ||
        (e.phase === 2 && e.stun > 0) ||
        (e.phase === 3 && !e.crystal);
      m.heart.material.color
        .setRGB(1, 0.37, 0.54)
        .multiplyScalar(vuln ? 3 + Math.sin(t * 10) : 0.6);
      m.heart.scale.setScalar(vuln ? 1.3 : 0.8);
      const swing = e.recover > 0 ? -1.4 : Math.sin(t * 1.3) * 0.15;
      m.arms[1].rotation.x = damp(m.arms[1].rotation.x, swing, 6, dt);
      m.arms[0].rotation.x = Math.sin(t * 1.1) * 0.12;
      m.cape.rotation.x = Math.sin(t * 1.7) * 0.08;
    },
    get platesHeld() {
      return st.plates;
    },
  };
})();
