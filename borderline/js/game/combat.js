const Combat = (() => {
  const C = {
    on: false,
    hp: 100,
    max: 100,
    down: false,
    cloak: 0,
    cloakCd: 0,
    atkCd: 0,
    regen: 0,
    revive: 0,
    punch: 0,
  };
  const tracerMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#ff8fb0').multiplyScalar(3),
    transparent: true,
    toneMapped: false,
  });
  const tracers = [];
  const handV = V3();
  const fwd = V3();

  const tracer = (a, b) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), tracerMat.clone());
    l.frustumCulled = false;
    R.scene.add(l);
    tracers.push({ l, t: 0.12 });
  };

  const act = (d) => Story.ctx.act(d);

  // sword arc in front of the player
  const slashMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#9fdcff').multiplyScalar(2.4),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const slashGeo = new THREE.RingGeometry(1.1, 1.9, 24, 1, -0.9, 1.8).rotateX(-Math.PI / 2);
  const slashes = [];
  const slash = (p, yaw) => {
    const m = new THREE.Mesh(slashGeo, slashMat.clone());
    m.position.set(p.x, p.y + 1.05, p.z);
    m.rotation.set(0.25, yaw - Math.PI / 2, 0);
    R.scene.add(m);
    slashes.push({ m, t: 0.18 });
  };

  const shoot = () => {
    const cam = R.camera;
    fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const hit = Enemies.raycast(cam.position, fwd, 80);
    const from = Player.avatar.hand(handV).clone();
    const to = hit
      ? cam.position.clone().addScaledVector(fwd, hit.d)
      : cam.position.clone().addScaledVector(fwd, 60);
    tracer(from, to);
    Player.weapon.fire();
    Sound.play('shoot');
    if (hit) {
      Fx.burst(to, hit.weak ? '#ffcf8a' : '#ff8fb0', hit.weak ? 30 : 12, 4, 0.4, 0);
      HUD.hitmark(hit.weak);
      act({ a: 'hit', id: hit.e.id, dmg: 9, weak: hit.weak });
    }
    Player.yaw = Math.atan2(fwd.x, fwd.z);
  };

  const punch = () => {
    const yaw = Cam.yaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    Player.yaw = yaw;
    C.punch = 0.25;
    const p = Player.body.p;
    Sound.play('punch');
    Fx.burst(p.clone().add(V3(fx * 1.4, 1.1, fz * 1.4)), '#6cc8ff', 40, 5, 0.35, 0);
    slash(p, yaw);
    for (const e of Enemies.list.values()) {
      const dx = e.pos.x - p.x;
      const dz = e.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      const T = Enemies.TYPES[e.type];
      const reach = T.reach || 3.2;
      if (d < reach && (dx * fx + dz * fz) / (d || 1) > 0.35)
        act({
          a: 'hit',
          id: e.id,
          dmg: 12,
          stun: T.stunP || (e.type === 'tour' ? 4.5 : 2.5),
        });
    }
  };

  Object.assign(C, {
    enable(on) {
      C.on = on;
      C.reset();
      HUD.combat(on);
    },
    reset() {
      C.hp = C.max;
      C.down = false;
      C.cloak = 0;
      C.cloakCd = 0;
      C.revive = 0;
      Player.locked = false;
      if (Player.mode === 'sit') Player.mode = 'walk';
    },
    hurt(who, dmg, from) {
      if (who === Story.role) C.apply(dmg, from);
      else Net.send('hurt', { dmg, from: from ? from.toArray() : null });
    },
    apply(dmg) {
      if (!C.on || C.down) return;
      C.hp -= dmg;
      C.regen = 4;
      Sound.play('hurt');
      HUD.hurt();
      Cam.shake = Math.max(Cam.shake, 0.12);
      if (C.hp <= 0) {
        C.hp = 0;
        C.down = true;
        C.cloak = 0;
        Player.mode = 'sit';
        Player.locked = true;
        HUD.say(CONFIG.garde.down, CONFIG.master, 2200);
      }
    },
    revived() {
      C.down = false;
      C.hp = 50;
      Player.locked = false;
      Player.mode = 'walk';
      Sound.play('reveal');
    },
    update(dt) {
      tracers.forEach((t) => {
        t.t -= dt;
        t.l.material.opacity = Math.max(0, t.t / 0.12);
      });
      for (let i = tracers.length - 1; i >= 0; i--)
        if (tracers[i].t <= 0) {
          R.scene.remove(tracers[i].l);
          tracers[i].l.geometry.dispose();
          tracers.splice(i, 1);
        }
      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.t -= dt;
        s.m.material.opacity = Math.max(0, s.t / 0.18);
        s.m.scale.setScalar(1 + (0.18 - s.t) * 1.5);
        if (s.t <= 0) {
          R.scene.remove(s.m);
          s.m.material.dispose();
          slashes.splice(i, 1);
        }
      }
      if (!C.on) return null;
      C.atkCd -= dt;
      C.cloakCd = Math.max(0, C.cloakCd - dt);
      C.cloak = Math.max(0, C.cloak - dt);
      C.punch = Math.max(0, C.punch - dt);
      if (!C.down) {
        C.regen -= dt;
        if (C.regen <= 0) C.hp = Math.min(C.max, C.hp + dt * 9);
        const role = Story.role;
        if (role === 'dame' && Input.held('attack') && C.atkCd <= 0 && Player.mode !== 'grapple') {
          C.atkCd = 0.2;
          shoot();
        }
        if (role === 'valet' && Input.pressed('attack') && C.atkCd <= 0) {
          C.atkCd = 0.55;
          punch();
        }
        if (role === 'valet' && !C.noCloak && Input.pressed('ability') && C.cloakCd <= 0) {
          C.cloak = 6;
          C.cloakCd = 15;
          Sound.play('cloak');
        }
      }
      Player.avatar.ghost(C.cloak > 0 ? 1 : 0);
      Player.punch = C.punch;
      const rs = Remote.state;
      const rp = Remote.pos;
      const p = Player.body.p;
      let prompt = null;
      if (!C.down && rs.down && Math.hypot(rp.x - p.x, rp.z - p.z) < 2.2) {
        if (Input.held('interact')) {
          C.revive += dt;
          if (C.revive > 2.2) {
            C.revive = 0;
            act({ a: 'revive' });
          }
        } else C.revive = 0;
        prompt = ['E', 'Relever ' + Story.name(Story.ctx.other) + ' (maintenir)', true];
      } else C.revive = 0;
      HUD.vitals(
        C.hp / C.max,
        rs.hp != null ? rs.hp / 100 : 1,
        C.down,
        rs.down,
        C.revive / 2.2,
        Story.role === 'valet' ? (C.abil != null ? C.abil : 1 - C.cloakCd / 15) : -1,
        C.cloak > 0,
      );
      return prompt;
    },
  });

  Net.on('hurt', (d) => C.apply(d.dmg));
  Net.on('revived', () => C.revived());
  return C;
})();
