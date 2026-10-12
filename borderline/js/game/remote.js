const Remote = (() => {
  const buf = [];
  const DELAY = 110;
  const pos = V3();
  let yaw = 0;
  let state = { speed: 0, grounded: true, mode: 'walk', target: -1 };
  let avatar = null;
  let lastRx = 0;
  let line = null;
  const tgt = V3();
  const handV = V3();

  return {
    role: null,
    handPose: false,
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
      line = Rope.create(role === 'dame' ? '#ff5f8a' : '#6cc8ff');
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
      state = {
        speed: s[5],
        grounded: !!s[6],
        mode: MODES[s[4]] || 'walk',
        target: s[7],
        flip: s[8] || 0,
        hp: s[13] == null ? 100 : s[13],
        down: !!s[14],
        cloak: !!s[15],
      };
      if (s[9]) tgt.set(s[10], s[11], s[12]);
      avatar.ghost(state.cloak ? 1 : 0);
      avatar.visible = true;
      avatar.root.position.copy(pos);
      avatar.root.rotation.y = yaw;
      const gy = Phys.groundAt(pos.x, pos.y + 0.1, pos.z);
      avatar.update(dt, { ...state, groundY: gy, hand: this.handPose }, t);
      const on = state.mode === 'grapple' && !!s[9];
      line.update(dt, avatar.hand(handV), on, on ? tgt : null);
    },
    set visible(v) {
      if (avatar) avatar.visible = v && buf.length > 0;
    },
  };
})();
