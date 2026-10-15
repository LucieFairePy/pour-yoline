// Firing range, solo (index.html?stand): Yoline's rifle in the Garde arena, with no partner and no
// lobby. Pions keep coming in small groups so the hip fire, the aim (right mouse) and the reload
// rhythm can be tried. Loaded only by the lobby when the URL asks for it.
(() => {
  const local = { t: 0 };

  Story.register('stand', {
    init: () => ({}),
    enter(c) {
      Garde.build();
      Enemies.clear();
      local.t = 2;
      c.spawn(Garde.spawn(4, 'dame'), 0);
      Player.killY = Garde.O.y - 25;
      Player.checkpoint = () => Garde.spawn(4, 'dame');
      Player.targets = null;
      City.mood({});
      c.fog(0.006);
      Combat.enable(true);
      HUD.visa('Stand de tir');
      HUD.objective('Clic gauche : tirer · clic droit maintenu : viser · Échap : pause');
    },
    exit() {
      Combat.enable(false);
      Enemies.clear();
    },
    host(c, dt) {
      const me = { who: 'dame', pos: Player.body.p, down: Combat.down, cloak: false };
      // a new group when the last one is down
      if (Enemies.alive() === 0) {
        local.t -= dt;
        if (local.t <= 0) {
          local.t = 2;
          const o = Garde.spawn(4, 'dame');
          for (let i = 0; i < 4; i++) {
            const a = (i - 1.5) * 0.35;
            Enemies.spawn('pion', V3(o.x + Math.sin(a) * 22, o.y, o.z + Math.cos(a) * 22));
          }
        }
      }
      Enemies.simulate(dt, [me, me]);
      // they stop 7 m away: targets, not a crowd to get stuck in
      for (const e of Enemies.list.values()) {
        const dx = e.pos.x - me.pos.x;
        const dz = e.pos.z - me.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 7 && d > 1e-3) {
          e.pos.x = me.pos.x + (dx / d) * 7;
          e.pos.z = me.pos.z + (dz / d) * 7;
        }
      }
      // the range does not hurt: the pions only walk up to be shot
      Combat.hp = Combat.max;
      if (Combat.down) Combat.revived();
    },
    action(c, who, d) {
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
    },
    update(c, dt, t) {
      Enemies.render(dt, t);
      return Combat.update(dt);
    },
  });
})();
