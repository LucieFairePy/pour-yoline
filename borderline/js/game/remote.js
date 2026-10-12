const Remote = (() => {
  const buf = [];
  const DELAY = 110;
  const pos = V3();
  let yaw = 0;
  let state = { speed: 0, grounded: true, mode: 'walk', target: -1 };
  let avatar = null;
  let lastRx = 0;
  let line = null;

  return {
    role: null,
    pos,
    get state() {
      return state;
    },
    get fresh() {
      return performance.now() - lastRx < 3000;
    },
    get has() {
      return buf.length > 0;
    },
    init(role) {
      this.role = role;
      avatar = Avatar.build(role);
      avatar.addTo(R.scene);
      avatar.visible = false;
      line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([V3(), V3()]),
        new THREE.LineBasicMaterial({
          color: new THREE.Color('#ff5f8a').multiplyScalar(2),
          toneMapped: false,
        }),
      );
      line.frustumCulled = false;
      line.visible = false;
      R.scene.add(line);
    },
    push(s) {
      const now = performance.now();
      lastRx = now;
      if (
        buf.length &&
        Math.hypot(
          s[0] - buf[buf.length - 1].s[0],
          s[1] - buf[buf.length - 1].s[1],
          s[2] - buf[buf.length - 1].s[2],
        ) > 15
      )
        buf.length = 0;
      buf.push({ t: now, s });
      while (buf.length > 30) buf.shift();
    },
    update(dt, t, targets) {
      if (!avatar || !buf.length) return;
      const rt = performance.now() - DELAY;
      let a = buf[0];
      let b = buf[buf.length - 1];
      for (let i = 0; i < buf.length - 1; i++)
        if (buf[i].t <= rt && buf[i + 1].t >= rt) {
          a = buf[i];
          b = buf[i + 1];
          break;
        }
      const k = b.t === a.t ? 1 : clamp((rt - a.t) / (b.t - a.t), 0, 1);
      if (rt > b.t) a = b;
      pos.set(lerp(a.s[0], b.s[0], k), lerp(a.s[1], b.s[1], k), lerp(a.s[2], b.s[2], k));
      yaw = angleDamp(yaw, b.s[3], 14, dt);
      const s = b.s;
      state = { speed: s[5], grounded: !!s[6], mode: MODES[s[4]] || 'walk', target: s[7] };
      avatar.visible = true;
      avatar.root.position.copy(pos);
      avatar.root.rotation.y = yaw;
      const gy = Phys.groundAt(pos.x, pos.y + 0.1, pos.z);
      avatar.update(dt, { ...state, groundY: gy }, t);
      const tp = state.mode === 'grapple' && targets && targets()[state.target];
      line.visible = !!tp;
      if (tp) {
        const arr = line.geometry.attributes.position.array;
        arr[0] = pos.x;
        arr[1] = pos.y + 1.5;
        arr[2] = pos.z;
        arr[3] = tp.x;
        arr[4] = tp.y;
        arr[5] = tp.z;
        line.geometry.attributes.position.needsUpdate = true;
      }
    },
    set visible(v) {
      if (avatar) avatar.visible = v && buf.length > 0;
    },
  };
})();
