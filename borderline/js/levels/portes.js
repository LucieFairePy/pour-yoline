(() => {
  const T = CONFIG;
  const A = T.portes;
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d9');
  const local = { stage: 0, cd: 0, held: 0, aimFx: 0 };
  const fwd = V3();

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(A.s1[r]);
      Portes.screen.show('Salle 1', 'Le bouton derrière la vitre', '#4fb4ff');
    }
    if (st === 2) {
      // room 1 was crossed through the portals
      if (prev) Lore.during('d9', 'portal', 1200);
      HUD.objective(A.s2[r]);
      Portes.screen.show('Salle 2', 'Chose rapide entre, chose rapide sort', '#ff9a3a');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(A.s3[r]);
      Portes.screen.show('Salle 3', 'Deux boutons, deux mains', '#4fb4ff');
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(A.card.replace('{card}', CARD));
      Portes.screen.show(CARD, A.title, '#ff9a3a');
      Sound.play('reveal');
    }
    const q = Portes.rel(Player.body.p);
    if (prev && st === 3 && r === 'dame' && q.z < 60) c.spawn(Portes.spawn(3, r), 0);
    else if (prev && Portes.inCage(q)) {
      c.spawn(st === 4 ? Portes.P(-6, 2, 80) : Portes.spawn(st, r), 0);
      Fx.burst(Player.body.p.clone().add(V3(0, 1, 0)), '#bfe6ff', 40, 4, 0.5, 0);
      Sound.play('portal');
    }
  };

  const teleport = (from, to) => {
    const b = Player.body;
    const up = Math.abs(from.normal.y) > 0.9;
    const pt = b.p.clone();
    pt.y += up ? 0.05 : clamp(from.pos.y - b.p.y, 0.2, 1.6);
    const d = pt.clone().sub(from.pos);
    const dn = d.dot(from.normal);
    if (dn < -0.3 || dn > 0.75) return false;
    const lat = d.clone().addScaledVector(from.normal, -dn);
    // floor and ceiling portals catch a falling player more generously
    const u = lat.dot(from.panel.right) / (up ? 1.6 : 0.75);
    const v = lat.dot(from.panel.up) / (up ? 1.6 : 1.0);
    if (u * u + v * v > 1.2) return false;
    if (b.v.dot(from.normal) > 1 && dn > 0.2) return false;
    const speed = Math.max(b.v.length(), Player.preSpeed || 0, 4);
    const n = to.normal;
    const vert = Math.abs(n.y) > 0.9;
    const out = vert
      ? V3(0, n.y * speed, 0)
      : n
          .clone()
          .multiplyScalar(speed * 0.93)
          .add(V3(0, speed * 0.55, 0));
    const pos = to.pos.clone().addScaledVector(n, vert ? 0.2 : 0.75);
    if (!vert) pos.y -= 0.9;
    else if (n.y < 0) pos.y -= 1.9;
    b.p.copy(pos);
    b.v.copy(out);
    if (!vert) {
      Player.yaw = Math.atan2(n.x, n.z);
      Cam.yaw = Player.yaw;
    }
    Sound.play('portal');
    Fx.burst(pos.clone().add(V3(0, 1, 0)), '#bfe6ff', 40, 4, 0.5, 0);
    return true;
  };

  Story.register('portes', {
    init: () => ({
      stage: 1,
      portals: { a: null, b: null },
      pressed: [],
      open: [],
      bridge: false,
      card: false,
    }),
    voice: () => 1,
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Portes.build();
      local.stage = 0;
      c.spawn(Portes.spawn(c.S.x.stage, c.role), 0);
      Player.killY = Portes.O.y - 25;
      Player.checkpoint = () => Portes.spawn(Story.S.x.stage, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.009);
      Portes.mood(true);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + A.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3200);
      HUD.say(A.hint[c.role], T.master, 4200);
      this.apply(c);
    },
    exit() {
      Portes.mood(false);
    },
    apply(c) {
      if (!Portes.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      Portes.setPortal('a', x.portals.a);
      Portes.setPortal('b', x.portals.b);
    },
    host(c, dt) {
      if (!Portes.built) return;
      const x = c.S.x;
      const qs = ['dame', 'valet'].map((w) => Portes.rel(c.pos(w)));
      const pressed = Object.keys(Portes.buttons).filter((id) =>
        qs.some((q) => Portes.near(q, id)),
      );
      if (pressed.join() !== x.pressed.join()) c.set((s) => (s.x.pressed = pressed));
      if (x.stage === 1 && pressed.includes('b1'))
        c.set((s) => {
          s.x.open = ['d1'];
          s.x.stage = 2;
        });
      if (x.stage === 2 && pressed.includes('b2'))
        c.set((s) => {
          s.x.bridge = true;
          s.x.stage = 3;
        });
      if (x.stage === 3) {
        if (pressed.includes('b3a') && pressed.includes('b3b')) {
          local.held += dt;
          if (local.held > 2)
            c.set((s) => {
              s.x.card = true;
              s.x.stage = 4;
            });
        } else local.held = 0;
      }
      if (x.stage === 4 && qs.every((q) => Portes.nearCard(q)))
        c.goto('reward', (s) => (s.x.card = 'd9'));
    },
    action(c, who, d) {
      if (d.a === 'portal' && who === 'dame')
        c.set((s) => (s.x.portals[d.which] = { panel: d.panel, pos: d.pos }));
    },
    update(c, dt, t) {
      if (!Portes.built) return null;
      const x = c.S.x;
      Portes.update(dt, t, x);
      local.cd -= dt;
      if (c.role === 'dame') {
        const which = Input.pressed('attack') ? 'a' : Input.pressed('ability') ? 'b' : null;
        if (which) {
          fwd.set(0, 0, -1).applyQuaternion(R.camera.quaternion);
          const hit = Portes.aim(R.camera.position, fwd);
          if (hit) {
            c.act({
              a: 'portal',
              which,
              panel: hit.panel.id,
              pos: hit.pos.toArray().map((v) => +v.toFixed(3)),
            });
            Sound.play('portalShoot');
          } else Sound.play('deflect');
        }
      }
      const pa = Portes.portalData('a', x.portals.a);
      const pb = Portes.portalData('b', x.portals.b);
      // the portals carry the other one only: the one who shoots them stays on this side
      if (pa && pb && local.cd <= 0 && Player.mode === 'walk' && c.role !== 'dame') {
        if (teleport(pa, pb) || teleport(pb, pa)) local.cd = 0.45;
      }
      return null;
    },
  });
})();
