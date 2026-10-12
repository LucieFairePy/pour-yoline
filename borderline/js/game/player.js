const MODES = ['walk', 'hang', 'grapple', 'sit', 'frozen'];

const Player = (() => {
  const body = { p: V3(), v: V3(), r: 0.35, h: 1.75, grounded: false, ground: null, wall: false };
  const P = {
    role: 'dame',
    body,
    avatar: null,
    yaw: 0,
    mode: 'walk',
    speed: 0,
    target: -1,
    targets: null,
    hangPos: null,
    killY: -40,
    checkpoint: () => V3(),
    jumps: 0,
    coyote: 0,
    buffer: 0,
    stepDist: 0,
    airTime: 0,
    lockTarget: -1,
    handPose: false,
  };
  const tmp = V3();
  const dir = V3();

  P.init = (role) => {
    P.role = role;
    P.avatar = Avatar.build(role);
    P.avatar.addTo(R.scene);
    P.teleport(City.spawns[role], 0);
  };

  P.teleport = (pos, yaw) => {
    body.p.copy(pos);
    body.v.set(0, 0, 0);
    if (yaw != null) P.yaw = yaw;
    P.mode = P.mode === 'frozen' ? 'frozen' : 'walk';
    P.target = -1;
  };

  const findTarget = (camYaw, camPitch) => {
    if (!P.targets) return -1;
    const f = V3(
      Math.sin(camYaw) * Math.cos(camPitch),
      -Math.sin(camPitch),
      Math.cos(camYaw) * Math.cos(camPitch),
    );
    let best = -1;
    let bs = 0.86;
    P.targets().forEach((pos, i) => {
      if (!pos) return;
      tmp.copy(pos).sub(body.p);
      tmp.y -= 1.2;
      const d = tmp.length();
      if (d > 26 || d < 1.5) return;
      tmp.normalize();
      const s = tmp.dot(f) + (1 - d / 26) * 0.1;
      if (s > bs) {
        bs = s;
        best = i;
      }
    });
    return best;
  };

  P.update = (dt, camYaw, camPitch) => {
    const v = body.v;
    if (P.mode === 'hang' && P.hangPos) {
      body.p.copy(P.hangPos);
      v.set(0, 0, 0);
      body.grounded = false;
      P.speed = 0;
      return;
    }
    if (P.mode === 'sit') {
      v.set(0, 0, 0);
      P.speed = 0;
      if (Input.pressed('jump') || Input.move().z !== 0 || Input.move().x !== 0) P.mode = 'walk';
      return;
    }
    const frozen = P.mode === 'frozen';
    const m = frozen ? { x: 0, z: 0 } : Input.move();
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    dir.set(fx * m.z - fz * m.x, 0, fz * m.z + fx * m.x);
    const mag = Math.min(1, dir.length());
    const sprint = !frozen && Input.held('sprint');
    const top = (sprint ? 8.6 : 5.2) * mag;
    if (mag > 0.01) dir.normalize();

    if (P.mode === 'grapple') {
      const tp = P.targets && P.targets()[P.target];
      if (!tp) P.mode = 'walk';
      else {
        tmp.copy(tp).sub(body.p);
        tmp.y -= 1.3;
        const d = tmp.length();
        tmp.normalize();
        v.lerp(tmp.multiplyScalar(21), 1 - Math.exp(-10 * dt));
        if (d < 2.4 || Input.pressed('jump')) {
          const hz = V3(v.x, 0, v.z).normalize().multiplyScalar(15);
          v.set(hz.x, 7, hz.z);
          P.mode = 'walk';
          P.target = -1;
          P.jumps = 1;
        }
      }
    } else {
      if (body.grounded) {
        const a = 1 - Math.exp(-14 * dt);
        v.x += (dir.x * top - v.x) * a;
        v.z += (dir.z * top - v.z) * a;
      } else {
        const before = Math.hypot(v.x, v.z);
        v.x += dir.x * 18 * mag * dt;
        v.z += dir.z * 18 * mag * dt;
        const after = Math.hypot(v.x, v.z);
        const cap = Math.max(before, top);
        if (after > cap) {
          v.x *= cap / after;
          v.z *= cap / after;
        }
        const drag = Math.exp(-(mag > 0.01 ? 0.15 : 0.6) * dt);
        v.x *= drag;
        v.z *= drag;
      }
      v.y = Math.max(-42, v.y - 26 * dt);
    }

    if (body.grounded) {
      P.coyote = 0.12;
      P.jumps = 0;
    } else P.coyote -= dt;
    if (!frozen && Input.pressed('jump')) P.buffer = 0.13;
    else P.buffer -= dt;
    if (P.buffer > 0 && P.mode === 'walk') {
      if (P.coyote > 0) {
        v.y = 9.2;
        P.coyote = 0;
        P.buffer = 0;
        P.jumps = 1;
        Sound.play('jump');
      } else if (P.role === 'valet' && P.jumps < 2) {
        v.y = 8.6;
        P.buffer = 0;
        P.jumps = 2;
        Sound.play('djump');
      }
    }

    P.lockTarget = P.role === 'dame' && P.mode === 'walk' ? findTarget(camYaw, camPitch) : -1;
    if (!frozen && P.lockTarget >= 0 && Input.pressed('ability')) {
      P.mode = 'grapple';
      P.target = P.lockTarget;
      Sound.play('grapple');
    }

    const wasG = body.grounded;
    const vy = v.y;
    Phys.move(body, dt);
    if (body.grounded && !wasG && P.airTime > 0.25) Sound.play('land', clamp(-vy / 25, 0, 1));
    P.airTime = body.grounded ? 0 : P.airTime + dt;

    const hs = Math.hypot(v.x, v.z);
    P.speed = body.grounded ? hs : P.speed;
    if (hs > 0.5 && P.mode !== 'grapple') P.yaw = angleDamp(P.yaw, Math.atan2(v.x, v.z), 12, dt);
    if (P.mode === 'grapple') P.yaw = angleDamp(P.yaw, Math.atan2(v.x, v.z), 8, dt);

    if (body.grounded && hs > 1) {
      P.stepDist += hs * dt;
      const stride = sprint ? 1.6 : 1.25;
      if (P.stepDist > stride) {
        P.stepDist = 0;
        Sound.play('step', clamp(hs / 8, 0.3, 1));
      }
    }

    if (body.p.y < P.killY) {
      Sound.play('fall');
      P.teleport(P.checkpoint());
    }
  };

  P.render = (dt, t) => {
    const a = P.avatar;
    a.visible = Cam.cur > 1.1;
    a.root.position.copy(body.p);
    a.root.rotation.y = P.yaw;
    const gy = Phys.groundAt(body.p.x, body.p.y + 0.1, body.p.z);
    a.update(
      dt,
      { speed: P.speed, grounded: body.grounded, mode: P.mode, groundY: gy, hand: P.handPose },
      t,
    );
  };

  P.snapshot = () => [
    +body.p.x.toFixed(3),
    +body.p.y.toFixed(3),
    +body.p.z.toFixed(3),
    +P.yaw.toFixed(3),
    MODES.indexOf(P.mode),
    +P.speed.toFixed(2),
    body.grounded ? 1 : 0,
    P.target,
  ];

  return P;
})();
