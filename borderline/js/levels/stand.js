// Firing range, solo (index.html?stand): Yoline's rifle in the Garde arena, with no partner and no
// lobby. Pions keep coming in small groups so the hip fire, the aim (right mouse) and the reload
// rhythm can be tried. Loaded only by the lobby when the URL asks for it.
(() => {
  const local = { t: 0 };
  // targets of different stuff behind the pions' line, to see and hear what a bullet does to
  // each (holes, chips, sparks, sounds): a steel plate, a wooden board, a glass pane, a sandbag
  // mound; the floor and the pillars are concrete
  let props = null;
  const TARGETS = [
    [-4.6, 1.1, 12, 1.1, 1.4, 0.06, 'metal', '#6a707a', 0.35, 0.4, 1],
    [-1.6, 0.9, 13.5, 1.3, 1.8, 0.1, 'wood', '#7a5434', 0, 0.8, 1],
    [1.6, 1.1, 13.5, 1.3, 1.6, 0.04, 'glass', '#9fd0ff', 0.2, 0.05, 0.28],
    [4.6, 0.4, 12, 1.8, 0.8, 0.9, 'dirt', '#6b5a43', 0, 1, 1],
  ];
  const buildProps = () => {
    const o = Garde.spawn(4, 'dame');
    if (!props) {
      props = { g: new THREE.Group(), boxes: [] };
      TARGETS.forEach(([x, y, z, sx, sy, sz, surf, col, met, rough, op]) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz),
          new THREE.MeshStandardMaterial({
            color: col,
            metalness: met,
            roughness: rough,
            transparent: op < 1,
            opacity: op,
          }),
        );
        m.position.set(o.x + x, o.y + y, o.z + z);
        props.g.add(m);
        props.boxes.push(Phys.box(o.x + x, o.y + y, o.z + z, sx, sy, sz, { surf }));
      });
      R.scene.add(props.g);
    }
    props.g.visible = true;
    props.boxes.forEach((b) => (b.on = true));
  };

  Story.register('stand', {
    init: () => ({}),
    enter(c) {
      Garde.build();
      Enemies.clear();
      local.t = 2;
      c.spawn(Garde.spawn(4, 'dame'), 0);
      buildProps();
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
      if (props) {
        props.g.visible = false;
        props.boxes.forEach((b) => (b.on = false));
      }
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
