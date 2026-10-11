const ROSE = (() => {
  const TAU = Math.PI * 2,
    PI = Math.PI,
    C = Math.cos,
    Sn = Math.sin;
  const sm = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const mixc = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const DEEP = [0.75, 0.04, 0.14],
    CRIM = [1.25, 0.18, 0.36],
    LIGHT = [1.3, 0.78, 0.86];
  const THORNS = [0.12, 0.24, 0.37, 0.5, 0.66, 0.8, 0.9];
  function param(i, n) {
    const R_ = Math.random,
      q = i / n;
    if (q < 0.74) {
      const L = 18,
        k = Math.floor(Math.pow(R_(), 0.85) * L),
        f = k / (L - 1);
      const u = R_() < 0.18 ? (R_() < 0.5 ? R_() * 0.05 : 1 - R_() * 0.05) : R_();
      const v = R_() < 0.45 ? 1 - Math.pow(R_(), 3) * 0.06 : Math.pow(R_(), 0.8);
      let col = mixc(DEEP, CRIM, Math.min(1, v * 1.3));
      col = mixc(col, LIGHT, sm(0.82, 1, v) * (0.45 + 0.55 * f));
      col = col.map((x) => x * (0.72 + 0.28 * f));
      return { k: 0, f, u, v, a0: k * 2.39996 + (R_() - 0.5) * 0.1, side: 0, col };
    }
    if (q < 0.78) {
      const f = R_();
      return {
        k: 1,
        f,
        u: 0,
        v: R_(),
        a0: (Math.floor(R_() * 5) / 5) * TAU + 0.3,
        side: 0,
        col: mixc([0.2, 0.55, 0.2], [0.45, 0.85, 0.32], f),
      };
    }
    if (q < 0.8)
      return { k: 2, f: R_() * TAU, u: 0, v: R_() * PI, a0: 0, side: 0, col: [0.32, 0.66, 0.26] };
    if (q < 0.89)
      return {
        k: 3,
        f: R_(),
        u: R_() * TAU,
        v: 0,
        a0: 0,
        side: 0,
        col: mixc([0.2, 0.5, 0.18], [0.36, 0.72, 0.28], R_()),
      };
    if (q < 0.91) {
      const ti = Math.floor(R_() * THORNS.length);
      return { k: 4, f: THORNS[ti], u: R_(), v: 0, a0: ti * 2.4, side: 0, col: [0.7, 0.16, 0.14] };
    }
    const which = R_() < 0.5,
      r = R_();
    const v =
      r < 0.25
        ? (R_() - 0.5) * 0.08
        : r < 0.55
          ? (R_() < 0.5 ? -1 : 1) * (0.9 + R_() * 0.1)
          : R_() * 2 - 1;
    return {
      k: 5,
      f: which ? 0.45 : 0.62,
      u: R_(),
      v,
      a0: 0,
      side: which ? 1 : -1,
      col: Math.abs(v) < 0.06 ? [0.65, 0.95, 0.5] : mixc([0.24, 0.6, 0.22], [0.4, 0.78, 0.3], R_()),
    };
  }
  function point(p, Bm, flutter, t, out) {
    const { k, f, u, v, a0 } = p;
    let x, y, z;
    if (k === 0) {
      let bl = Math.min(1, Math.max(0, Bm * 1.7 - (1 - f) * 0.7));
      bl = bl * bl * (3 - 2 * bl);
      const tilt =
        0.06 +
        f * 0.2 +
        (0.14 + f * 0.82 - (0.06 + f * 0.2)) * bl +
        flutter * (0.1 + 0.1 * Sn(t * 14 + a0 * 3)) * f;
      const curl = bl * Math.pow(f, 2.2) * 1.5 * v * v * v;
      const r0 = 0.03 + f * 0.2,
        Lp = 0.36 + f * 0.24;
      const wv = Math.pow(Sn(PI * Math.min(1, v * 0.92 + 0.08)), 0.7) * (0.35 + 0.65 * v);
      const th = a0 + (u - 0.5) * (2.6 - 0.9 * f) * wv;
      const s = v * Lp * (1 - 0.07 * Math.exp(-Math.pow((u - 0.5) / 0.1, 2)) * sm(0.8, 1, v));
      const cu = 1 - Math.pow(2 * u - 1, 2);
      const R =
        r0 +
        s * Sn(tilt) +
        curl * 0.3 * s +
        0.05 * f * cu * Sn(PI * v) +
        0.012 * Sn(u * 17 + a0) * v * v * v * v;
      const Y = s * C(tilt) - curl * 0.22 * s;
      x = C(th) * R * 1.05;
      y = (Y - 0.3) * 1.05;
      z = Sn(th) * R * 1.05;
    } else if (k === 1) {
      const a = a0 + (v - 0.5) * 0.75 * (1 - f * 0.85),
        R = 0.1 + f * 0.26 * (0.6 + 0.4 * Bm),
        Y = -0.32 - f * 0.06 - f * f * 0.22 * (0.4 + 0.6 * Bm);
      x = C(a) * R * 1.25;
      y = Y * 1.25;
      z = Sn(a) * R * 1.25;
    } else if (k === 2) {
      x = Sn(v) * C(f) * 0.125;
      y = (-0.38 + C(v) * 0.08) * 1.25;
      z = Sn(v) * Sn(f) * 0.125;
    } else {
      const spx = 0.07 * Sn(f * 2.4),
        spy = -0.42 - f * 1.85;
      if (k === 3) {
        x = (spx + C(u) * 0.028) * 1.25;
        y = spy * 1.25;
        z = Sn(u) * 0.035;
      } else if (k === 4) {
        const l = Math.hypot(C(a0), 0.55, Sn(a0)),
          dx = C(a0) / l,
          dy = 0.55 / l,
          dz = Sn(a0) / l;
        x = (spx + C(a0) * 0.028 + dx * u * 0.09) * 1.25;
        y = (spy + dy * u * 0.09) * 1.25;
        z = (Sn(a0) * 0.028 + dz * u * 0.09) * 1.25;
      } else {
        const side = p.side,
          dl = Math.hypot(side, 0.5),
          dx = side / dl,
          dy = 0.5 / dl,
          px = -dy,
          py = dx;
        let hw = 0.2 * Math.pow(Sn(PI * u), 0.8);
        if (Math.abs(v) >= 0.85) hw *= 1 + 0.12 * Math.abs(Sn(u * 42));
        const along = 0.1 + u * 0.62;
        x = (spx + side * 0.03 + dx * along + px * v * hw * 0.5) * 1.25;
        y = (spy + dy * along + py * v * hw * 0.5) * 1.25;
        z = (Math.abs(v) * hw * 0.35 + Sn(u * PI) * 0.06) * 1.25;
      }
    }
    out[0] = x;
    out[1] = y;
    out[2] = z;
  }
  return { param, point };
})();
