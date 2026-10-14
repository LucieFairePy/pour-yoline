const Cam = (() => {
  const cam = R.camera;
  const pivot = V3();
  const want = V3();
  const dir = V3();
  const C = { yaw: 0, pitch: 0.18, dist: 5.4, cur: 5.4, focus: null, shake: 0 };

  C.snap = (p, yaw) => {
    C.yaw = yaw;
    C.pitch = 0.18;
    pivot.set(p.x, p.y + 1.55, p.z);
    C.cur = C.dist;
    place(0);
  };

  const place = (dt) => {
    dir.set(
      -Math.sin(C.yaw) * Math.cos(C.pitch),
      Math.sin(C.pitch),
      -Math.cos(C.yaw) * Math.cos(C.pitch),
    );
    C.sideK = damp(
      C.sideK || 0.55,
      typeof Combat !== 'undefined' && Combat.on ? (Combat.ads ? 1.3 : 1.05) : 0.55,
      4,
      dt || 1,
    );
    const side = V3(Math.cos(C.yaw), 0, -Math.sin(C.yaw)).multiplyScalar(-C.sideK);
    const origin = pivot.clone().add(side);
    const hit = Phys.ray(origin, dir, C.dist + 0.4);
    const target = Math.max(0.8, hit - 0.35);
    C.cur = dt ? (target < C.cur ? target : damp(C.cur, target, 5, dt)) : target;
    C.fp = C.cur < 1.5;
    if (C.fp) want.copy(pivot).addScaledVector(dir, -0.25);
    else want.copy(origin).addScaledVector(dir, C.cur);
    cam.position.copy(want);
    if (C.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * C.shake;
      cam.position.y += (Math.random() - 0.5) * C.shake;
    }
    if (C.fp) cam.lookAt(want.x - dir.x, want.y - dir.y, want.z - dir.z);
    else cam.lookAt(origin.x, origin.y + 0.1, origin.z);
  };

  C.update = (dt, p, sprinting) => {
    const l = Input.look(dt);
    if (C.focus) {
      const dx = C.focus.x - p.x;
      const dz = C.focus.z - p.z;
      const dy = C.focus.y - (p.y + 1.6);
      C.yaw = angleDamp(C.yaw, Math.atan2(dx, dz), 2.2, dt);
      C.pitch = damp(C.pitch, clamp(-Math.atan2(dy, Math.hypot(dx, dz)) * 0.9, -0.9, 0.5), 2.2, dt);
    } else {
      C.yaw -= l.x;
      C.pitch = clamp(C.pitch + l.y, -0.95, 1.2);
    }
    // aiming down the sights: closer over the shoulder, narrower field of view
    const ads = typeof Combat !== 'undefined' && Combat.ads;
    C.adsK = damp(C.adsK || 0, ads ? 1 : 0, 10, dt);
    C.dist = damp(C.dist, ads ? 2.7 : sprinting ? 6.1 : 5.4, ads ? 12 : 3, dt);
    const fov = 62 - 20 * C.adsK;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    pivot.x = damp(pivot.x, p.x, 18, dt);
    pivot.z = damp(pivot.z, p.z, 18, dt);
    pivot.y = damp(pivot.y, p.y + 1.55, 10, dt);
    C.shake = Math.max(0, C.shake - dt * 0.8);
    place(dt);
  };

  return C;
})();
