const Benches = (() => {
  const near = (p, b) =>
    Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 2.2 && Math.abs(p.y - b.pos.y) < 1;

  const sit = (b) => {
    const p = Player.body.p;
    const fx = Math.sin(b.yaw);
    const fz = Math.cos(b.yaw);
    const ax = fz;
    const az = -fx;
    const side = (p.x - b.pos.x) * ax + (p.z - b.pos.z) * az > 0 ? 1 : -1;
    Player.teleport(
      V3(b.pos.x + fx * 0.12 + ax * side * 0.7, b.pos.y, b.pos.z + fz * 0.12 + az * side * 0.7),
      b.yaw,
    );
    Player.mode = 'sit';
  };

  return {
    at(p) {
      return City.benches.find((b) => near(p, b)) || null;
    },
    sitting(p, mode) {
      return mode === 'sit' ? this.at(p) : null;
    },
    update() {
      if (Player.mode === 'sit') return ['Espace', 'Se lever'];
      if (Player.mode !== 'walk') return null;
      const b = this.at(Player.body.p);
      if (!b) return null;
      if (Input.pressed('interact')) sit(b);
      return ['E', 'S’asseoir'];
    },
  };
})();
