// The other player, drawn from their snapshots. Every snapshot carries the sender's clock
// (index 19) and a teleport counter (index 20), so motion is rebuilt on the sender's timeline:
// packets that arrive late or bunched (relay brokers batch them) still play back evenly.
const Remote = (() => {
  const buf = [];
  const MAX_EXTRA = 120; // ms of extrapolation when the buffer runs dry
  let off = null; // receiver clock - sender clock, lowest seen (= fastest path)
  let jit = 20; // how late packets come beyond the fastest path (95th percentile, ms)
  const lates = [];
  let iv = 33; // sender snapshot spacing, ms
  let delay = 100; // playback delay on top of the clock offset, ms
  let base = null; // off + delay, eased: playback speed never changes by more than ~3 %
  let lastSt = -1;
  let lastTp = null;
  let lastRx = 0;
  const pos = V3();
  const raw = V3();
  let yaw = 0;
  let snapNext = true;
  let state = { speed: 0, grounded: true, mode: 'walk', target: -1 };
  let avatar = null;
  let line = null;
  const tgt = V3();
  const handV = V3();
  const dbg = new URLSearchParams(location.search).has('netdebug')
    ? (window.__netdbg = { under: 0, snaps: 0, late: 0, delay: 0, jit: 0, iv: 0 })
    : null;

  const reset = () => {
    buf.length = 0;
    off = null;
    base = null;
    lates.length = 0;
    lastSt = -1;
    snapNext = true;
  };

  // cubic hermite on one axis, tangents in units per ms
  const herm = (p0, p1, m0, m1, h, k) => {
    const k2 = k * k;
    const k3 = k2 * k;
    return (
      (2 * k3 - 3 * k2 + 1) * p0 +
      (k3 - 2 * k2 + k) * h * m0 +
      (-2 * k3 + 3 * k2) * p1 +
      (k3 - k2) * h * m1
    );
  };
  const tangent = (i, ax) => {
    const a = buf[Math.max(0, i - 1)];
    const b = buf[Math.min(buf.length - 1, i + 1)];
    if (a === b || b.st === a.st || b.cut || buf[i].cut) return 0;
    return (b.s[ax] - a.s[ax]) / (b.st - a.st);
  };
  const angLerp = (a, b, k) => {
    let d = b - a;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return a + d * k;
  };

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
    get delay() {
      return delay;
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
      lastRx = now;
      // older clients send no clock: fall back to arrival time
      const st = s[19] != null ? s[19] : now;
      // the other page reloaded (its clock restarted): start over
      if (lastSt >= 0 && st < lastSt - 2000) reset();
      const o = now - st;
      if (off === null || o < off) off = o;
      else off += (o - off) * 0.002; // follows clock drift / a slower route, slowly
      lates.push(o - off);
      if (lates.length > 90) lates.shift();
      if (lates.length % 6 === 0) {
        const q = lates.slice().sort((x, y) => x - y);
        jit = q[Math.floor(q.length * 0.95)];
      }
      if (st <= lastSt) {
        // a late or duplicate packet: slot it in if it is still ahead of playback
        if (buf.some((x) => x.st === st)) return;
        if (dbg) dbg.late++;
        const i = buf.findIndex((x) => x.st > st);
        if (i > 0) buf.splice(i, 0, { st, s, cut: false });
        return;
      }
      if (lastSt >= 0) iv += (Math.min(250, st - lastSt) - iv) * 0.1;
      // teleports (respawn, portal) are flagged by the sender; anything faster than anyone
      // can move counts as one too
      let cut = false;
      const tp = s[20];
      if (lastTp !== null && tp != null && tp !== lastTp) cut = true;
      lastTp = tp;
      const l = buf[buf.length - 1];
      if (l) {
        const d = Math.hypot(s[0] - l.s[0], s[1] - l.s[1], s[2] - l.s[2]);
        if (d > 6 && d > ((st - l.st) / 1000) * 45) cut = true;
      }
      buf.push({ st, s, cut });
      lastSt = st;
      while (buf.length > 90) buf.shift();
    },
    update(dt, t, targets) {
      if (!avatar || !buf.length) return;
      // playback delay: one and a half snapshot gaps plus the jitter, eased so playback
      // speed never visibly changes
      const want = clamp(iv * 1.5 + jit + 10, 50, 400);
      const goal = off + want;
      if (base === null || Math.abs(goal - base) > 300) base = goal;
      else base += clamp(goal - base, -25 * dt, 25 * dt);
      delay = base - off;
      // the current frame's timestamp: playback advances exactly one frame per frame
      const frameNow = (document.timeline && document.timeline.currentTime) || performance.now();
      const rt = frameNow - base;
      let i = buf.length - 1;
      while (i > 0 && buf[i].st > rt) i--;
      const a = buf[i];
      const b = buf[i + 1];
      let cur = a;
      if (!b) {
        // ran out of data: carry on a little along the last velocity, then hold
        const p = buf[i - 1];
        const e = Math.min(Math.max(0, rt - a.st), MAX_EXTRA);
        if (dbg && rt - a.st > MAX_EXTRA) dbg.under++;
        if (p && !a.cut && a.st > p.st) {
          const h = a.st - p.st;
          raw.set(
            a.s[0] + ((a.s[0] - p.s[0]) / h) * e,
            a.s[1] + Math.max(-20, Math.min(20, (a.s[1] - p.s[1]) / h)) * e * (a.s[6] ? 0 : 1),
            a.s[2] + ((a.s[2] - p.s[2]) / h) * e,
          );
        } else raw.set(a.s[0], a.s[1], a.s[2]);
        yaw = angleDamp(yaw, a.s[3], 16, dt);
      } else if (rt < a.st) {
        raw.set(a.s[0], a.s[1], a.s[2]);
        yaw = angleDamp(yaw, a.s[3], 16, dt);
      } else if (b.cut) {
        // the next snapshot is a teleport: stay put until its time, then jump
        raw.set(a.s[0], a.s[1], a.s[2]);
        yaw = angleDamp(yaw, a.s[3], 16, dt);
      } else {
        const h = b.st - a.st;
        const k = clamp((rt - a.st) / h, 0, 1);
        for (let ax = 0; ax < 3; ax++)
          raw.setComponent(ax, herm(a.s[ax], b.s[ax], tangent(i, ax), tangent(i + 1, ax), h, k));
        yaw = angleDamp(yaw, angLerp(a.s[3], b.s[3], k), 20, dt);
        cur = k > 0.5 ? b : a;
      }
      // a fresh teleport behind us: jump straight there
      if (cur.cut && !cur.done) {
        cur.done = true;
        snapNext = true;
      }
      // light smoothing hides the small corrections when extrapolation was a bit off
      if (snapNext || raw.distanceToSquared(pos) > 25) {
        pos.copy(raw);
        if (dbg && !snapNext) dbg.snaps++;
        snapNext = false;
      } else pos.lerp(raw, 1 - Math.exp(-dt * 35));
      if (dbg) {
        dbg.delay = Math.round(delay);
        dbg.jit = Math.round(jit);
        dbg.iv = Math.round(iv);
      }
      // drop what playback has passed (keep two behind for tangents and extrapolation)
      while (buf.length > 3 && buf[2].st < rt) buf.shift();
      const s = cur.s;
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
