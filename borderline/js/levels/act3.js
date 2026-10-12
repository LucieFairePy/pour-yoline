(() => {
  const T = CONFIG;
  const A = T.act3;
  const SPOTS = ['p3', 'p4', 'p5'];
  const LIFT_TOP = City.TOWER.y + 0.05;
  const local = {
    found: new Set(),
    lift: 0.05,
    liftTo: 0.05,
    moment: false,
    lantern: 0,
    line: null,
  };
  const tm = { lift: 0, empty: 0 };
  const ha = V3();
  const hb = V3();

  Clues.add('c4', V3(City.TOWER.x + 4, City.TOWER.y + 0.9, City.TOWER.z - 5));

  const handLine = () => {
    const l = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffcf8a').multiplyScalar(2),
        toneMapped: false,
      }),
    );
    l.visible = false;
    R.scene.add(l);
    return l;
  };

  const goldenBase = (c) => {
    City.mood({ gold: 1 });
    Sound.mood('gold');
    c.fog(0.006);
    Player.killY = -40;
    Player.targets = null;
    Player.checkpoint = () => City.hubSpawn[c.role];
    ['cafe', 'message', 'banc', 'pluie', 'kino', 'etoiles', 'chanson', 'danse'].forEach((id) =>
      City.showPlace(id, true),
    );
    SPOTS.forEach((id) => {
      City.showPlace(id, true);
      City.pillar(id, !(Story.S.x.found || []).includes(id));
    });
    City.rocketsOn(true);
    Object.keys(City.doors).forEach((id) => City.door(id, 0.15));
  };

  const objective = (c) => {
    const n = c.S.x.found.length;
    if (c.S.x.moment) return '';
    if (n < SPOTS.length) return A.objective + ' (' + n + '/' + SPOTS.length + ')';
    return A.tower + ' ' + A.sit;
  };

  Story.register('act3', {
    init: () => ({
      found: [],
      lift: { y: 0.05, used: false },
      hand: false,
      req: {},
      moment: false,
    }),
    net: {
      lift: (c, y) => {
        local.liftTo = y;
      },
      fw: (c, i) => Fx.firework(City.rockets[i].pos.clone().add(V3(0, 1, 0))),
    },
    enter(c, first) {
      goldenBase(c);
      if (first) c.spawn(City.hubSpawn[c.role], Math.PI);
      if (!local.line) local.line = handLine();
      HUD.visa(A.title);
      BigScreen.show(A.title, 'Pas d’épreuve. Pas de chrono.', '#ffcf8a');
      HUD.say(A.intro, T.master, 2600);
      HUD.say(A.gestures, T.master, 4200);
      HUD.objective(objective(c));
      local.lift = local.liftTo = c.S.x.lift.y;
      City.setLift(local.lift);
    },
    exit() {
      if (local.line) local.line.visible = false;
      Player.handPose = false;
      Remote.handPose = false;
    },
    apply(c) {
      HUD.objective(objective(c));
      SPOTS.forEach((id) => City.pillar(id, !c.S.x.found.includes(id)));
      if (c.S.x.found.length === SPOTS.length && !local.tower) {
        local.tower = true;
        BigScreen.show('Le toit le plus haut', 'Montez ensemble', '#ffcf8a');
        Sound.play('reveal');
        HUD.say(A.tower, T.master, 3000);
      }
      if (c.S.x.moment && !local.moment) {
        local.moment = true;
        Cam.focus = V3(City.TOWER.x - 120, City.TOWER.y + 200, City.TOWER.z - 520);
        Sound.play('reveal');
        A.moment.forEach((l) => HUD.say(l, T.master, 2200));
        for (let i = 0; i < 6; i++)
          setTimeout(
            () =>
              Fx.firework(
                V3(
                  City.TOWER.x + (Math.random() - 0.5) * 60,
                  0,
                  City.TOWER.z - 40 - Math.random() * 40,
                ),
                60,
              ),
            i * 900,
          );
      }
    },
    host(c, dt) {
      const x = c.S.x;
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      const ly = x.lift.y;
      const onD = City.onLift(pd, ly);
      const onV = City.onLift(pv, ly);
      // someone waiting at the top landing calls the cabin back up
      const waiting = (p) =>
        Math.abs(p.y - LIFT_TOP) < 1.5 &&
        Math.abs(p.x - City.LIFT.x) < 3 &&
        p.z > City.TOWER.z + 5 &&
        p.z < City.LIFT.z + 1;
      const atTop = waiting(pd) || waiting(pv);
      let target;
      if (ly >= LIFT_TOP - 0.01) {
        tm.empty = onD || onV || atTop ? 0 : tm.empty + dt;
        target = tm.empty > 5 ? 0.05 : LIFT_TOP;
      } else if (ly <= 0.06) {
        const ready = x.found.length === SPOTS.length && (x.lift.used ? onD || onV : onD && onV);
        target = ready || (x.lift.used && atTop) ? LIFT_TOP : 0.05;
      } else target = x.lift.going || LIFT_TOP;
      if (target !== ly) {
        if (!x.lift.used && target === LIFT_TOP) Sound.play('lift');
        x.lift.used = x.lift.used || target === LIFT_TOP;
        x.lift.going = target;
        x.lift.y = target > ly ? Math.min(target, ly + dt * 4) : Math.max(target, ly - dt * 4);
        local.liftTo = x.lift.y;
        tm.lift += dt;
        if (tm.lift > 1 / 15) {
          tm.lift = 0;
          c.send('lift', x.lift.y);
        }
      }
      if (x.hand && Math.hypot(pd.x - pv.x, pd.z - pv.z) > 4) c.set((s) => (s.x.hand = false));
      const b = City.roofBench;
      const sitD = c.role === 'dame' ? Player.mode === 'sit' : c.remoteState().mode === 'sit';
      const sitV = c.role === 'valet' ? Player.mode === 'sit' : c.remoteState().mode === 'sit';
      const nearB = (p) =>
        Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 2.2 && Math.abs(p.y - b.pos.y) < 1.2;
      if (!x.moment && sitD && sitV && nearB(pd) && nearB(pv)) {
        c.set((s) => (s.x.moment = true));
        local.momentT = 0;
      }
      if (x.moment) {
        local.momentT = (local.momentT || 0) + dt;
        if (local.momentT > 10) c.goto('act4');
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'found' && !x.found.includes(d.id)) c.set((s) => s.x.found.push(d.id));
      if (d.a === 'fw') {
        c.send('fw', d.i);
        Fx.firework(City.rockets[d.i].pos.clone().add(V3(0, 1, 0)));
      }
      if (d.a === 'hand') {
        const now = performance.now();
        if (x.hand) return c.set((s) => (s.x.hand = false));
        x.req[who] = now;
        const o = who === 'dame' ? 'valet' : 'dame';
        if (x.req[o] && now - x.req[o] < 2500) c.set((s) => (s.x.hand = true));
      }
    },
    update(c, dt, t) {
      const x = c.S.x;
      const p = Player.body.p;
      if (local.lift !== local.liftTo) {
        const d = local.liftTo - local.lift;
        local.lift += Math.sign(d) * Math.min(Math.abs(d), dt * 4.5);
        City.setLift(local.lift);
      }
      local.lantern += dt;
      if (local.lantern > 0.25) {
        local.lantern = 0;
        const cp = R.camera.position;
        Fx.burst(
          V3(cp.x + (Math.random() - 0.5) * 70, cp.y - 8, cp.z + (Math.random() - 0.5) * 70),
          '#ffb070',
          1,
          0.3,
          9,
          0.6,
        );
      }
      const rp = Remote.pos;
      const close = Math.hypot(p.x - rp.x, p.z - rp.z) < 1.8;
      Player.handPose = x.hand && close;
      Remote.handPose = x.hand && close;
      const l = local.line;
      if (l) {
        l.visible = x.hand;
        if (x.hand) {
          ha.set(p.x, p.y + 0.95, p.z);
          hb.set(rp.x, rp.y + 0.95, rp.z);
          l.position.copy(ha);
          l.lookAt(hb);
          l.scale.set(1, 1, Math.max(0.01, ha.distanceTo(hb)));
        }
      }
      if (x.moment) return null;
      const sit = Benches.update(c);
      if (Player.mode === 'sit') return sit;
      for (const id of SPOTS) {
        const pl = City.places[id];
        if (!local.found.has(id) && Math.hypot(p.x - pl.entry.x, p.z - pl.entry.z) < 3) {
          if (Input.pressed('interact')) {
            local.found.add(id);
            c.act({ a: 'found', id });
            const m = T.places.find((q) => q.id === id);
            HUD.memory(m.tag, m.name, m.text);
          }
          return ['E', 'Regarder'];
        }
      }
      for (let i = 0; i < City.rockets.length; i++)
        if (Math.hypot(p.x - City.rockets[i].pos.x, p.z - City.rockets[i].pos.z) < 2 && p.y < 2) {
          if (Input.pressed('interact')) c.act({ a: 'fw', i });
          return ['E', 'Lancer un feu d’artifice'];
        }
      if (sit) return sit;
      if (close || x.hand) {
        if (Input.pressed('interact')) c.act({ a: 'hand' });
        return ['E', x.hand ? 'Lâcher sa main' : 'Lui tendre la main'];
      }
      return null;
    },
  });
})();
