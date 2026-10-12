const Benches = (() => {
  // every bench: seat top 0.5 m above its base, backrest behind (local -z), facing local +z
  const SEAT_Z = -0.04;
  const SIDE = 0.7;
  let cur = null;
  let curSide = 1;

  const near = (p, b) =>
    Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 2.2 && Math.abs(p.y - b.pos.y) < 1;

  const spot = (b, side, fwd) => {
    const fx = Math.sin(b.yaw);
    const fz = Math.cos(b.yaw);
    return V3(
      b.pos.x + fx * fwd + fz * side * SIDE,
      b.pos.y,
      b.pos.z + fz * fwd - fx * side * SIDE,
    );
  };
  const sideOf = (b, q) =>
    (q.x - b.pos.x) * Math.cos(b.yaw) - (q.z - b.pos.z) * Math.sin(b.yaw) > 0 ? 1 : -1;

  const sit = (b) => {
    let side = sideOf(b, Player.body.p);
    // the partner already sits on that half: take the other one
    const rs = typeof Remote !== 'undefined' && Remote.has ? Remote.state : null;
    if (rs && rs.mode === 'sit' && near(Remote.pos, b) && sideOf(b, Remote.pos) === side)
      side = -side;
    Player.teleport(spot(b, side, SEAT_Z), b.yaw);
    Player.mode = 'sit';
    cur = b;
    curSide = side;
  };

  // standing up: step out in front of the seat instead of being pushed out of the bench box
  const stood = () => {
    if (!cur || Player.mode === 'sit') return;
    // only if they got up right there (a phase change may have moved them elsewhere)
    const p = Player.body.p;
    const there =
      Math.hypot(p.x - cur.pos.x, p.z - cur.pos.z) < 2.5 && Math.abs(p.y - cur.pos.y) < 3;
    if (Player.mode === 'walk' && there) Player.teleport(spot(cur, curSide, 0.85), cur.yaw);
    cur = null;
  };

  return {
    SEAT_Y: 0.5,
    at(p) {
      return City.benches.find((b) => near(p, b)) || null;
    },
    sitting(p, mode) {
      return mode === 'sit' ? this.at(p) : null;
    },
    update() {
      stood();
      if (Player.mode === 'sit') return ['Espace', 'Se lever'];
      if (Player.mode !== 'walk') return null;
      const b = this.at(Player.body.p);
      if (!b) return null;
      if (Input.pressed('interact')) sit(b);
      return ['E', 'S’asseoir'];
    },
  };
})();
