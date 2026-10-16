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
    // AKM: a 30-round magazine, 600 rounds a minute, a 2.4 s reload (reload = its progress, 0..1)
    mag: 30,
    reloadT: 0,
    reload: 0,
    // hip-fire spread that grows during a burst and settles back
    bloom: 0,
  };
  const MAG = 30;
  const RELOAD = 2.4;
  // the two weapons: damage, time between two attacks (the host checks the guest's hits on them)
  const RIFLE = { dmg: 9, every: 0.1, range: 80 };
  const SWORD = { dmg: 12, every: 0.55, reach: 3.2 };
  // how long the sword stuns an enemy
  const stunOf = (type) => {
    const T = Enemies.TYPES[type] || {};
    return T.stunP != null ? T.stunP : type === 'tour' ? 4.5 : 2.5;
  };
  // ammo counter, bottom right, only while a rifle is in hand
  let ammoEl = null;
  const ammo = (show) => {
    if (!ammoEl) {
      ammoEl = document.createElement('div');
      ammoEl.style.cssText =
        'position:absolute;right:2.2rem;bottom:2rem;font-family:var(--f-mono,monospace);' +
        'color:#fbefe6;text-shadow:0 1px 6px rgba(0,0,0,.9);letter-spacing:.12em;' +
        'text-align:right;pointer-events:none;transition:opacity .3s;opacity:0;z-index:5';
      document.body.appendChild(ammoEl);
    }
    ammoEl.style.opacity = show ? 1 : 0;
    if (!show) return;
    const low = C.mag <= 8;
    const html =
      (C.reloadT > 0
        ? '<span style="font-size:.7rem;opacity:.8">RECHARGEMENT</span>'
        : '<span style="font-size:2rem;' +
          (low ? 'color:#ff8fa0' : '') +
          '">' +
          C.mag +
          '</span>' +
          '<span style="font-size:.85rem;opacity:.6"> / 30</span>') +
      '<div style="font-size:.6rem;opacity:.55;margin-top:.15rem">R · RECHARGER</div>';
    if (ammoEl.innerHTML !== html) ammoEl.innerHTML = html;
  };
  const startReload = () => {
    if (C.reloadT > 0 || C.mag >= MAG) return;
    C.reloadT = RELOAD;
    // the sounds come from the rifle, on the hands' marks (js/game/weapons.js)
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
  const shotTo = V3();
  const remoteTo = V3();
  const remoteN = V3();
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
    const spread = (C.ads ? 0.004 : 0.03) + C.bloom * (C.ads ? 0.35 : 1);
    fwd.x += (Math.random() - 0.5) * spread;
    fwd.y += (Math.random() - 0.5) * spread;
    fwd.z += (Math.random() - 0.5) * spread;
    fwd.normalize();
    C.bloom = Math.min(0.05, C.bloom + 0.008);
    let hit = Enemies.raycast(cam.position, fwd, 80);
    // the world: the first wall, floor or prop past the player (the camera sits behind her)
    tmp.copy(Player.body.p).sub(cam.position);
    const wh = Phys.rayHit(cam.position, fwd, 80, Math.max(0, tmp.dot(fwd)) + 0.4);
    const wall = wh && (!hit || wh.t < hit.d);
    if (wall) hit = null;
    const d = hit ? hit.d : wall ? wh.t : 60;
    const to = shotTo.copy(cam.position).addScaledVector(fwd, d);
    Player.weapon.fire();
    Sound.play('shoot');
    C.aim = 0.7;
    if (wall) Weapons.impact(to, wh.n, wh.surf);
    if (hit) {
      Fx.burst(to, hit.weak ? '#ffcf8a' : '#ff8fb0', hit.weak ? 16 : 8, 3.5, 0.35, 0);
      HUD.hitmark(hit.weak);
      Enemies.flash(hit.e.id);
      act({ a: 'hit', id: hit.e.id, dmg: RIFLE.dmg, weak: hit.weak });
    }
    // the other player sees the shot, the muzzle flash and the impact (and the hole it leaves:
    // its surface and which face, 0..5 = -x +x -y +y -z +z)
    Net.send('shot', [
      +to.x.toFixed(2),
      +to.y.toFixed(2),
      +to.z.toFixed(2),
      hit ? (hit.weak ? 2 : 1) : 0,
      hit ? hit.e.id : 0,
      wall ? Weapons.SURFS.indexOf(wh.surf) : -1,
      wall ? (wh.n.x ? 0 : wh.n.y ? 2 : 4) + (wh.n.x + wh.n.y + wh.n.z > 0 ? 1 : 0) : -1,
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
      const reach = T.reach || SWORD.reach;
      if (d < reach && (dx * fx + dz * fz) / (d || 1) > 0.35) {
        Enemies.flash(e.id);
        Fx.burst(tmp.set(e.pos.x, p.y + 1.2, e.pos.z), '#bfe6ff', 10, 3, 0.3, 0);
        act({ a: 'hit', id: e.id, dmg: SWORD.dmg, stun: stunOf(e.type) });
      }
    }
  };

  Object.assign(C, {
    enable(on) {
      C.on = on;
      C.reset();
      HUD.combat(on);
      // update() is no longer called once a level turns combat off: the rifle's counter and the
      // gun hand go now, not with the next combat level
      if (!on) {
        C.ads = false;
        Input.gunHand = false;
        if (ammoEl) ammo(false);
      }
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
      // a second "revived" (a late copy, both players reviving at once) must not set the hp back
      if (!C.down) return;
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
      // magazine and reload (R, or automatically on an empty magazine)
      C.bloom = Math.max(0, C.bloom - dt * 0.09);
      if (gun && !C.down && Input.pressed('reload')) startReload();
      if (gun && C.mag <= 0) startReload();
      if (C.reloadT > 0) {
        C.reloadT -= dt;
        if (C.reloadT <= 0) {
          C.reloadT = 0;
          C.mag = MAG;
        }
      }
      C.reload = C.reloadT > 0 ? 1 - C.reloadT / RELOAD : 0;
      ammo(gun);
      C.ads = gun && !C.down && !C.reloadT && Input.held('aim') && Player.mode === 'walk';
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
          if (C.mag > 0 && C.reloadT <= 0) {
            C.atkCd = RIFLE.every;
            C.mag--;
            shoot();
          }
        }
        if (role === 'valet' && Input.pressed('attack') && C.atkCd <= 0) {
          C.atkCd = SWORD.every;
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

  // ---- the host checks what the guest says it did (a modified page could send anything): a
  // hit must name a live enemy, carry its weapon's damage and stun, come from where the guest
  // was (its last snapshots: the shot left before they arrived) with a clear line for a bullet,
  // at the weapon's pace; a revive needs the host down and the guest close. Returns why it is
  // refused, or null. Tolerances are wide: lag (up to ~400 ms) and jitter must never refuse a
  // real hit
  const LAG_M = 8;
  const buckets = new Map();
  // token bucket: `cap` actions at once (packets come bunched), refilled at `rate` per second
  const take = (key, cap, rate) => {
    const now = performance.now() / 1000;
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size > 300) buckets.clear();
      buckets.set(key, (b = { n: cap, t: now }));
    }
    b.n = Math.min(cap, b.n + (now - b.t) * rate);
    b.t = now;
    if (b.n < 1) return false;
    b.n -= 1;
    return true;
  };
  const losV = V3();
  const losD = V3();
  // a bullet could get from near one of these points (head, shoulder camera, high camera) to
  // the enemy (its middle, its sides, its top) without a wall in the way
  const clearShot = (pts, x, y, z, r) => {
    const step = Math.max(1, Math.floor(pts.length / 3));
    for (let i = pts.length - 1; i >= 0; i -= step) {
      const p = pts[i];
      losD.set(x - p[0], 0, z - p[2]).normalize();
      const sx = losD.z;
      const sz = -losD.x;
      const bx = losD.x;
      const bz = losD.z;
      // the camera sits up to ~5.5 m behind the player, over a shoulder: it sees round corners
      for (const back of [0, 3, 5.5])
        for (const up of [1.6, 3, 5])
          for (const side of [0, 1.3, -1.3])
            for (const [tu, ts] of [[0, 0], [0, r], [0, -r], [r, 0]]) {
              losV.set(p[0] + sx * side - bx * back, p[1] + up, p[2] + sz * side - bz * back);
              losD.set(x + sx * ts - losV.x, y + tu - losV.y, z + sz * ts - losV.z);
              const dist = losD.length();
              if (dist < r + 2) return true;
              losD.divideScalar(dist);
              // like the shooter's own ray (Combat.shoot), what lies before the player (+0.4 m)
              // does not count: a wall the player leans on is shot through
              const h = Phys.rayHit(losV, losD, dist, back + 1.2);
              if (!h || h.t >= dist - r - 1) return true;
            }
    }
    return false;
  };
  const checkHit = (who, d) => {
    const e = Enemies.list.get(d.id);
    if (!e || e.dead || !(e.hp > 0)) return 'no such enemy';
    const T = Enemies.TYPES[e.type] || {};
    const rifle = who === 'dame';
    if (rifle) {
      if (d.dmg !== RIFLE.dmg || d.stun) return 'rifle damage ' + d.dmg + '/' + d.stun;
      if (d.weak && !T.boss) return 'weak point';
    } else if (d.dmg !== SWORD.dmg || d.stun !== stunOf(e.type) || d.weak)
      return 'sword damage ' + d.dmg + '/' + d.stun;
    const pts = Remote.recent();
    if (pts.length) {
      const cy = e.pos.y + (e.type === 'pion' ? 1 : (T.height || 2) * 0.55);
      const r = e.type === 'roi' ? 2.6 : T.hitR || T.radius || 1;
      let best = Infinity;
      for (const p of pts) {
        const dy = Math.abs(p[1] - e.pos.y);
        const dd = rifle ? Math.hypot(p[0] - e.pos.x, p[1] + 1.5 - cy, p[2] - e.pos.z) : dy < 12 ? Math.hypot(p[0] - e.pos.x, p[2] - e.pos.z) : Infinity;
        best = Math.min(best, dd);
      }
      const max = rifle ? RIFLE.range + 6 + r + LAG_M : (T.reach || SWORD.reach) + 4.5;
      if (best > max) return 'too far ' + best.toFixed(1);
      if (rifle && typeof Phys !== 'undefined' && !clearShot(pts, e.pos.x, cy, e.pos.z, r)) {
        const q = pts[pts.length - 1];
        return 'wall from ' + q.slice(0, 3).map((v) => v.toFixed(1)) + ' to ' + e.pos.toArray().map((v) => v.toFixed(1));
      }
    }
    // pace: the rifle fires every 0.1 s, the sword swings every 0.55 s (one hit per enemy)
    if (rifle ? !take('rifle', 6, 1.3 / RIFLE.every) : !take('sword' + d.id, 2, 1.3 / SWORD.every))
      return 'too fast';
    return null;
  };
  const checkRevive = () => {
    if (!C.on || !C.down) return 'not down';
    const pts = Remote.recent();
    const p = Player.body.p;
    if (pts.length && !pts.some((q) => Math.hypot(q[0] - p.x, q[2] - p.z) < 2.2 + 2.5 && Math.abs(q[1] - p.y) < 4))
      return 'too far';
    if (!take('revive', 1, 1 / 1.5)) return 'too fast';
    return null;
  };
  C.check = (who, d) => {
    // a 'hit' of a fight (with a damage, or while the weapons are out); some puzzles use 'hit'
    // for their own events (tr_c7, tr_d5, tr_h8) and are left to their level
    if (d.a === 'hit' && (d.dmg !== undefined || C.on)) return checkHit(who, d);
    if (d.a === 'revive') return checkRevive();
    // the frost bolt of tr_s6: three charges, one back every 2.8 s at best
    if (d.a === 'frost') {
      if (d.k === 'ice' && !(Number.isFinite(d.x) && Number.isFinite(d.z))) return 'frost spot';
      if (!take('frost', 4, 1.3 / 2.8)) return 'too fast';
    }
    return null;
  };

  Net.on('shot', (d) => {
    if (!Remote.has) return;
    const to = remoteTo.set(d[0], d[1], d[2]);
    const from = Remote.weapon ? Remote.weapon.muzzle(handV) : Remote.hand(handV);
    Remote.weapon.fire();
    Sound.play('shoot', from);
    if (d[5] >= 0 && d[6] >= 0 && Weapons.SURFS[d[5]]) {
      remoteN.set(0, 0, 0).setComponent(d[6] >> 1, d[6] & 1 ? 1 : -1);
      Weapons.impact(to, remoteN, Weapons.SURFS[d[5]]);
    }
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
  // the host decides who gets hurt or back up: the guest never sends these to the host
  Net.on('hurt', (d) => !Net.isHost && d && C.apply(+d.dmg || 0));
  Net.on('revived', () => !Net.isHost && C.revived());
  return C;
})();
