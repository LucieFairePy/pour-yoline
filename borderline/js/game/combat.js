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
    aim: 0,
    // rifle pitch while aiming (radians, positive = down), sent to the other player
    pitch: 0,
  };
  // bullet tracers: pooled glowing beams (a 1 px line was invisible from the other player)
  const TRACER_T = 0.14;
  const tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
    .translate(0, 0.5, 0)
    .rotateX(Math.PI / 2);
  const tracers = [];
  const handV = V3();
  const fwd = V3();
  const tmp = V3();
  const tracer = (a, b, col = '#ffb0c8') => {
    let tr = tracers.find((x) => x.t <= 0);
    if (!tr) {
      if (tracers.length >= 24) tr = tracers[0];
      else {
        const m = new THREE.Mesh(
          tracerGeo,
          new THREE.MeshBasicMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        m.frustumCulled = false;
        R.scene.add(m);
        tr = { m, t: 0 };
        tracers.push(tr);
      }
    }
    tr.m.material.color.set(col).multiplyScalar(2.2);
    tr.m.position.copy(a);
    tr.m.lookAt(b);
    tr.len = a.distanceTo(b);
    tr.m.scale.set(0.022, 0.022, tr.len);
    tr.m.visible = true;
    tr.t = TRACER_T;
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
    let sl = slashes.find((x) => x.t <= 0);
    if (!sl) {
      sl = { m: new THREE.Mesh(slashGeo, slashMat.clone()), t: 0 };
      R.scene.add(sl.m);
      slashes.push(sl);
    }
    sl.m.visible = true;
    sl.m.position.set(p.x, p.y + 1.05, p.z);
    sl.m.rotation.set(0.25, yaw - Math.PI / 2, 0);
    sl.t = 0.18;
  };

  const shoot = () => {
    const cam = R.camera;
    fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    // from the hip the shots scatter a little; down the sights they go where the dot is
    if (!C.ads) {
      fwd.x += (Math.random() - 0.5) * 0.045;
      fwd.y += (Math.random() - 0.5) * 0.045;
      fwd.z += (Math.random() - 0.5) * 0.045;
      fwd.normalize();
    }
    const hit = Enemies.raycast(cam.position, fwd, 80);
    const from = Player.weapon.muzzle(handV).clone();
    const to = hit
      ? cam.position.clone().addScaledVector(fwd, hit.d)
      : cam.position.clone().addScaledVector(fwd, 60);
    tracer(from, to);
    Player.weapon.fire();
    Sound.play('shoot');
    C.aim = 0.7;
    if (hit) {
      Fx.burst(to, hit.weak ? '#ffcf8a' : '#ff8fb0', hit.weak ? 16 : 8, 3.5, 0.35, 0);
      HUD.hitmark(hit.weak);
      Enemies.flash(hit.e.id);
      act({ a: 'hit', id: hit.e.id, dmg: 9, weak: hit.weak });
    }
    // the other player sees the shot, the muzzle flash and the impact
    Net.send('shot', [
      +to.x.toFixed(2),
      +to.y.toFixed(2),
      +to.z.toFixed(2),
      hit ? (hit.weak ? 2 : 1) : 0,
      hit ? hit.e.id : 0,
    ]);
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
    Fx.burst(p.clone().add(V3(fx * 1.4, 1.1, fz * 1.4)), '#6cc8ff', 16, 4, 0.3, 0);
    slash(p, yaw);
    Net.send('slash', +yaw.toFixed(3));
    for (const e of Enemies.list.values()) {
      const dx = e.pos.x - p.x;
      const dz = e.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      const T = Enemies.TYPES[e.type];
      const reach = T.reach || 3.2;
      if (d < reach && (dx * fx + dz * fz) / (d || 1) > 0.35) {
        Enemies.flash(e.id);
        Fx.burst(tmp.set(e.pos.x, p.y + 1.2, e.pos.z), '#bfe6ff', 10, 3, 0.3, 0);
        act({
          a: 'hit',
          id: e.id,
          dmg: 12,
          stun: T.stunP != null ? T.stunP : e.type === 'tour' ? 4.5 : 2.5,
        });
      }
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
      C.revR = 0;
      C.hp = 50;
      Player.locked = false;
      Player.mode = 'walk';
      Sound.play('reveal');
    },
    update(dt) {
      for (const t of tracers) {
        if (t.t <= 0) continue;
        t.t -= dt;
        t.m.material.opacity = Math.max(0, t.t / TRACER_T);
        if (t.t <= 0) t.m.visible = false;
      }
      for (const s of slashes) {
        if (s.t <= 0) continue;
        s.t -= dt;
        s.m.material.opacity = Math.max(0, s.t / 0.18);
        s.m.scale.setScalar(1 + (0.18 - s.t) * 1.5);
        if (s.t <= 0) s.m.visible = false;
      }
      C.revR = Math.max(0, (C.revR || 0) - dt * 0.6);
      // downed with nothing left to fight (wave over, stray orb): get up on your own
      if (C.on && C.down && Enemies.alive() === 0) {
        C.downT = (C.downT || 0) + dt;
        if (C.downT > 3) C.revived();
      } else C.downT = 0;
      const gun = C.on && Story.role === 'dame';
      Input.gunHand = gun;
      if (!C.on) {
        C.ads = false;
        return null;
      }
      C.atkCd -= dt;
      C.cloakCd = Math.max(0, C.cloakCd - dt);
      C.cloak = Math.max(0, C.cloak - dt);
      C.punch = Math.max(0, C.punch - dt);
      C.aim = Math.max(0, C.aim - dt);
      // right mouse held: rifle to the shoulder, camera over the shoulder, body turns with the view
      C.ads = gun && !C.down && Input.held('aim') && Player.mode === 'walk';
      if (C.ads) {
        C.aim = Math.max(C.aim, 0.12);
        Player.yaw = Cam.yaw;
      }
      if (C.aim > 0) {
        // barrel follows the crosshair: from the shoulder to the point the camera looks at
        const cam = R.camera;
        fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
        tmp.copy(cam.position).addScaledVector(fwd, 40);
        const sh = Player.body.p;
        const dy = sh.y + 1.45 - tmp.y;
        C.pitch = clamp(Math.atan2(dy, Math.hypot(tmp.x - sh.x, tmp.z - sh.z)), -1.1, 1.1);
      } else C.pitch = 0;
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
          // the downed player sees the revive filling up
          C.revSend = (C.revSend || 0) - dt;
          if (C.revSend <= 0) {
            C.revSend = 0.15;
            Net.send('rv', +(C.revive / 2.2).toFixed(2));
          }
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
        C.down ? C.revR || 0 : C.revive / 2.2,
        Story.role === 'valet' ? (C.abil != null ? C.abil : 1 - C.cloakCd / 15) : -1,
        C.cloak > 0,
      );
      return prompt;
    },
  });

  Net.on('shot', (d) => {
    if (!Remote.has) return;
    const to = V3(d[0], d[1], d[2]);
    const from = (Remote.weapon ? Remote.weapon.muzzle(handV) : Remote.hand(handV)).clone();
    tracer(from, to, '#ffd0a0');
    Remote.weapon.fire();
    Sound.play('shoot', from);
    if (d[3]) {
      Fx.burst(to, d[3] === 2 ? '#ffcf8a' : '#ff8fb0', d[3] === 2 ? 16 : 8, 3.5, 0.35, 0);
      if (d[4]) Enemies.flash(d[4]);
    }
  });
  Net.on('rv', (k) => {
    if (C.down) C.revR = k;
  });
  Net.on('slash', (yaw) => {
    if (!Remote.has) return;
    const p = Remote.pos;
    Sound.play('punch', p);
    Fx.burst(
      p.clone().add(V3(Math.sin(yaw) * 1.4, 1.1, Math.cos(yaw) * 1.4)),
      '#6cc8ff',
      16,
      4,
      0.3,
      0,
    );
    slash(p, yaw);
  });
  Net.on('hurt', (d) => C.apply(d.dmg));
  Net.on('revived', () => C.revived());
  return C;
})();
