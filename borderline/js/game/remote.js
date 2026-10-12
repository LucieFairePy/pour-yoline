const Remote = (() => {
  const buf = [];
  // interpolation delay follows the measured packet spacing and jitter
  let delay = 110;
  let gapAvg = 50;
  let gapJit = 10;
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
    init(who) {
      const look = CONFIG.players[who].look;
      this.who = who;
      this.role = look;
      avatar = Avatar.build(look);
      avatar.addTo(R.scene);
      avatar.visible = false;
      this.weapon = Weapons.attach(avatar);
      line = Rope.create(Avatar.LOOK[look].glow);
    },
    hand(out) {
      return avatar ? avatar.hand(out) : out.copy(pos);
    },
    setKit(kit) {
      this.role = kit;
    },
    push(s) {
      const now = performance.now();
      if (lastRx) {
        const gap = Math.min(1000, now - lastRx);
        gapAvg += (gap - gapAvg) * 0.1;
        gapJit += (Math.abs(gap - gapAvg) - gapJit) * 0.1;
        delay = clamp(gapAvg * 1.6 + gapJit * 2.5, 80, 450);
      }
      lastRx = now;
      // a jump faster than anyone can move (respawn, teleport, portal) snaps instead of sliding
      if (buf.length) {
        const l = buf[buf.length - 1];
        const d = Math.hypot(s[0] - l.s[0], s[1] - l.s[1], s[2] - l.s[2]);
        if (d > 4 && d > ((now - l.t) / 1000) * 30) buf.length = 0;
      }
      buf.push({ t: now, s });
      while (buf.length > 30) buf.shift();
    },
    update(dt, t, targets) {
      if (!avatar || !buf.length) return;
      const rt = performance.now() - delay;
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
        punch: s[16] || 0,
        aim: !!s[17],
        pitch: s[18] || 0,
      };
      if (s[9]) tgt.set(s[10], s[11], s[12]);
      avatar.ghost(state.cloak ? 1 : 0);
      avatar.visible = true;
      avatar.root.position.copy(pos);
      avatar.root.rotation.y = yaw;
      const gy = Phys.groundAt(pos.x, pos.y + 0.1, pos.z);
      avatar.update(dt, { ...state, groundY: gy, hand: this.handPose }, t);
      this.weapon.update(
        dt,
        Combat.on ? (this.role === 'dame' ? 'rifle' : 'sword') : null,
        state.punch || 0,
        state.aim,
        state.pitch || 0,
      );
      const on = state.mode === 'grapple' && !!s[9];
      line.update(dt, avatar.hand(handV), on, on ? tgt : null);
    },
    set visible(v) {
      if (avatar) avatar.visible = v && buf.length > 0;
    },
  };
})();
