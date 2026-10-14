const HQRig = (() => {
  const UP = V3(0, 1, 0);
  const X = V3(1, 0, 0);
  const Z = V3(0, 0, 1);
  const qa = new THREE.Quaternion();
  const qp = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  const tmp = V3();
  const tmp2 = V3();
  const handM = new THREE.Matrix4();

  const LEG = { th: 0.36, sh: 0.34 };
  const ARM = 0.3;

  const zero = () => ({
    arms: [
      { p: 0, a: 0.12, e: 0.2, g: 0.6 },
      { p: 0, a: 0.12, e: 0.2, g: 0.6 },
    ],
    legs: [
      { p: 0, a: 0.04, k: 0.05, f: 0 },
      { p: 0, a: 0.04, k: 0.05, f: 0 },
    ],
    head: { p: 0, y: 0 },
  });

  const mixPose = (A, B, k) => {
    const o = zero();
    for (let i = 0; i < 2; i++) {
      for (const key of ['p', 'a', 'e', 'g'])
        o.arms[i][key] = lerp(A.arms[i][key], B.arms[i][key], k);
      for (const key of ['p', 'a', 'k', 'f'])
        o.legs[i][key] = lerp(A.legs[i][key], B.legs[i][key], k);
    }
    o.head.p = lerp(A.head.p, B.head.p, k);
    o.head.y = lerp(A.head.y, B.head.y, k);
    return o;
  };

  const limbDir = (s, pitch, abd, bend, sign) => {
    qa.setFromAxisAngle(Z, s * abd);
    qp.setFromAxisAngle(X, -pitch);
    q.multiplyQuaternions(qp, qa);
    const d1 = V3(0, -1, 0).applyQuaternion(q);
    const ax = X.clone().applyQuaternion(q);
    const d2 = d1.clone().applyAxisAngle(ax, sign * bend);
    return [d1, d2, q.clone(), ax];
  };

  const build = (opts) => {
    const A = HQ.makeAstronaut(opts);
    const F = !!opts.feminine;
    const shX = F ? 0.232 : 0.27;
    A.flames.forEach((f) => (f.visible = false));
    const arms = [
      { arm: A.armL, s: 1 },
      { arm: A.armR, s: -1 },
    ];
    const contacts = [
      V3(0, -0.44, 0),
      V3(0, 0.12, F ? 0.2 : 0.23),
      V3(0, 0.3, F ? 0.18 : 0.21),
      V3(0, 0.07, F ? -0.34 : -0.36),
      V3(0, 0.3, F ? -0.33 : -0.355),
      V3(0, -0.15, F ? -0.33 : -0.35),
      V3(0, 0.95, 0),
      V3(0, 0.66, 0.29),
      V3(0, 0.66, -0.29),
    ];
    const live = { hands: [V3(), V3()], knees: [V3(), V3()], feet: [V3(), V3()] };
    let pose = zero();

    const apply = (P) => {
      pose = P;
      arms.forEach(({ arm, s }, i) => {
        const a = P.arms[i];
        const S = V3(s * shX, 0.3, 0);
        const [d1, d2, qa1, ax1] = limbDir(s, a.p, a.a, a.e, -1);
        const E = S.clone().addScaledVector(d1, ARM);
        const H = E.clone().addScaledVector(d2, ARM);
        HQ.limb(arm.up, S, E, arm.r1);
        HQ.limb(arm.lo, E, H, arm.r2);
        if (arm.brg) {
          HQ.ringAt(arm.brg, S, E, 0.2, arm.r1 * 1.13);
          HQ.ringAt(arm.brg2, S, E, 0.25, arm.r1 * 1.09);
        }
        arm.elbow.position.copy(E);
        arm.hand.position.copy(H);
        const palm = V3(-s, 0, 0.18).normalize().applyQuaternion(qa1).applyAxisAngle(ax1, -a.e);
        palm.addScaledVector(d2, -palm.dot(d2)).normalize();
        const side = tmp.crossVectors(d2, palm);
        handM.makeBasis(side, d2, palm);
        arm.hand.quaternion.setFromRotationMatrix(handM);
        arm.hand.scale.setScalar(arm.hs || 1);
        HQ.setGrip(arm.hand, a.g);
        live.hands[i].copy(H);
      });
      A.legs.forEach((L, i) => {
        const l = P.legs[i];
        const s = L.s;
        const Hp = V3(s * 0.11, -0.32, 0);
        const [d1, d2] = limbDir(s, l.p, l.a, l.k, 1);
        // the body rolled sideways (leaning on someone): the legs turn back so the feet stay put
        if (P.legRoll) {
          d1.applyAxisAngle(Z, P.legRoll);
          d2.applyAxisAngle(Z, P.legRoll);
        }
        const K = Hp.clone().addScaledVector(d1, LEG.th);
        const An = K.clone().addScaledVector(d2, LEG.sh);
        HQ.limb(L.th, Hp, K, A.T.th);
        HQ.limb(L.sh, K, An, A.T.sh);
        if (L.brg) {
          HQ.ringAt(L.brg, Hp, K, 0.16, A.T.th * 1.1);
          HQ.ringAt(L.brg2, Hp, K, 0.2, A.T.th * 1.06);
        }
        L.knee.position.copy(K);
        const fwd = tmp.copy(d1).cross(X).normalize();
        L.kneePad.position
          .copy(K)
          .addScaledVector(V3(0, 0, 1).applyAxisAngle(X, -l.p + 0.0), A.T.th * 0.95);
        L.kneePad.rotation.set(-l.p - 0.15, 0, 0);
        L.boot.position.copy(An).addScaledVector(d2, 0.06);
        L.boot.quaternion.setFromUnitVectors(UP, d2.clone().negate());
        L.boot.rotateX(0.05 + l.f);
        live.knees[i].copy(K);
        live.feet[i].copy(An).addScaledVector(d2, 0.12);
      });
      A.helmet.rotation.set(P.head.p, P.head.y, 0);
    };

    const world = (local, out = V3()) => {
      A.body.updateWorldMatrix(true, false);
      return out.copy(local).applyMatrix4(A.body.matrixWorld);
    };

    return {
      A,
      g: A.g,
      apply,
      get pose() {
        return pose;
      },
      live,
      world,
      groundSnap(groundY, keepY = false) {
        A.g.updateWorldMatrix(true, true);
        let min = Infinity;
        const pts = [
          ...contacts,
          ...live.hands,
          ...live.knees,
          ...live.feet.map((f) => f.clone().add(V3(0, -0.05, 0))),
        ];
        pts.forEach((p) => {
          const w = world(p, tmp2);
          if (w.y < min) min = w.y;
        });
        if (!keepY) A.g.position.y += groundY - min;
        return min;
      },
      handWorld(i, out = V3()) {
        return world(live.hands[i], out);
      },
      // analytic 2-bone IK: arm angles (p, a, e) that put hand i on T (body-local)
      reach(i, T, out = {}) {
        const s = arms[i].s;
        const D = tmp.set(T.x - s * shX, T.y - 0.3, T.z);
        const len = D.length() || 1e-4;
        const d = clamp(len, 0.05, ARM * 2 * 0.995);
        D.multiplyScalar(1 / len);
        const e = Math.PI - Math.acos(clamp(1 - (d * d) / (2 * ARM * ARM), -1, 1));
        const c = Math.cos(e / 2);
        const th = Math.asin(clamp(D.x / c, -1, 1));
        let p = Math.atan2(Math.sin(e / 2), -c * Math.cos(th)) - Math.atan2(D.z, D.y);
        while (p > Math.PI) p -= TAU;
        while (p < -Math.PI) p += TAU;
        out.p = p;
        out.a = th / s;
        out.e = e;
        return out;
      },
    };
  };

  const P = {
    zero,
    mix: mixPose,
    float(t, sd = 0) {
      const o = zero();
      o.arms.forEach((a, i) => {
        a.p = 0.25 + Math.sin(t * 0.7 + sd + i * 2) * 0.18;
        a.a = 0.55 + Math.sin(t * 0.5 + sd * 1.3 + i) * 0.15;
        a.e = 0.5 + Math.sin(t * 0.9 + i + sd) * 0.15;
        a.g = 0.5;
      });
      o.legs.forEach((l, i) => {
        l.p = 0.15 + Math.sin(t * 0.6 + i * 1.7 + sd) * 0.15;
        l.a = 0.12;
        l.k = 0.45 + Math.sin(t * 0.8 + i + sd) * 0.15;
      });
      o.head.p = Math.sin(t * 0.4 + sd) * 0.1;
      return o;
    },
    struggle(t, sd = 0, k = 1) {
      const o = zero();
      const n = (a, b) =>
        Math.sin(t * a + sd * b) * 0.6 + Math.sin(t * a * 1.7 + sd * b * 2.1) * 0.4;
      o.arms.forEach((a, i) => {
        a.p = 0.6 + n(4.1 + i, 3.1 + i) * 1.1 * k;
        a.a = 0.7 + n(3.3 + i * 0.7, 1.7 + i) * 0.6 * k;
        a.e = 0.6 + Math.abs(n(5.2 + i, 2.2)) * 0.9 * k;
        a.g = 0.3 + Math.abs(n(6, i)) * 0.6;
      });
      o.legs.forEach((l, i) => {
        l.p = 0.3 + n(3.6 + i * 0.9, 4.4 + i) * 0.7 * k;
        l.a = 0.15 + Math.abs(n(2.5, i)) * 0.2;
        l.k = 0.4 + Math.abs(n(4.8 + i, 1.3)) * 1.0 * k;
      });
      o.head.p = n(2.2, 1) * 0.3 * k;
      o.head.y = n(1.9, 2) * 0.4 * k;
      return o;
    },
    swim(t, sd = 0) {
      const o = zero();
      const c = t * 2.3 + sd;
      o.arms.forEach((a) => {
        a.p = 2.3 - (Math.sin(c) * 0.5 + 0.5) * 1.6;
        a.a = 0.25 + (Math.cos(c) * 0.5 + 0.5) * 1.2;
        a.e = 0.15 + Math.max(0, Math.sin(c + 1)) * 1.3;
        a.g = 0.2;
      });
      o.legs.forEach((l, i) => {
        const kc = Math.sin(c * 2 + i * Math.PI);
        l.p = 0.2 + kc * 0.35;
        l.a = 0.25 + Math.max(0, kc) * 0.3;
        l.k = 0.3 + Math.max(0, -kc) * 1.1;
      });
      o.head.p = -0.35;
      return o;
    },
    limp(t, sd = 0) {
      const o = zero();
      o.arms.forEach((a, i) => {
        a.p = 0.4 + Math.sin(t * 0.3 + sd + i) * 0.1;
        a.a = 0.95 + Math.sin(t * 0.25 + i) * 0.1;
        a.e = 0.35;
        a.g = 0.2;
      });
      o.legs.forEach((l, i) => {
        l.p = 0.2 + i * 0.15;
        l.a = 0.18;
        l.k = 0.55 - i * 0.2;
      });
      o.head.p = 0.45;
      o.head.y = 0.2;
      return o;
    },
    reach(base, i, k) {
      const o = mixPose(base, base, 0);
      const a = o.arms[i];
      a.p = lerp(a.p, 1.35, k);
      a.a = lerp(a.a, 0.75, k);
      a.e = lerp(a.e, 0.15, k);
      a.g = lerp(a.g, 0.9, k);
      return o;
    },
    stand() {
      return zero();
    },
  };

  const KEY = (arms, legs, head = { p: 0, y: 0 }) => {
    const o = zero();
    arms.forEach((a, i) => Object.assign(o.arms[i], a));
    legs.forEach((l, i) => Object.assign(o.legs[i], l));
    o.head = { ...o.head, ...head };
    return o;
  };

  const WAKE = {
    back: [
      {
        t: 0,
        pitch: -Math.PI / 2,
        pose: KEY(
          [
            { p: 0.1, a: 0.7, e: 0.3, g: 0.2 },
            { p: 0.05, a: 0.55, e: 0.2, g: 0.2 },
          ],
          [
            { p: 0.05, a: 0.15, k: 0.1 },
            { p: 0.15, a: 0.1, k: 0.25 },
          ],
          { p: -0.2, y: 0.4 },
        ),
      },
      {
        t: 1.2,
        pitch: -Math.PI / 2,
        pose: KEY(
          [
            { p: 0.4, a: 0.6, e: 0.8, g: 0.4 },
            { p: 0.15, a: 0.5, e: 0.5, g: 0.3 },
          ],
          [
            { p: 0.3, a: 0.12, k: 0.6 },
            { p: 0.15, a: 0.1, k: 0.2 },
          ],
          { p: -0.4, y: 0.1 },
        ),
      },
      {
        t: 2.4,
        pitch: -1.3,
        pose: KEY(
          [
            { p: -0.7, a: 0.45, e: 0.9, g: 0.9 },
            { p: -0.7, a: 0.45, e: 0.9, g: 0.9 },
          ],
          [
            { p: 0.9, a: 0.1, k: 1.4 },
            { p: 0.9, a: 0.1, k: 1.4 },
          ],
          { p: -0.5 },
        ),
      },
      {
        t: 3.6,
        pitch: -0.35,
        pose: KEY(
          [
            { p: -0.9, a: 0.4, e: 0.25, g: 1 },
            { p: -0.9, a: 0.4, e: 0.25, g: 1 },
          ],
          [
            { p: 1.5, a: 0.12, k: 2.1 },
            { p: 1.4, a: 0.12, k: 2.0 },
          ],
          { p: 0.15 },
        ),
      },
      {
        t: 4.8,
        pitch: 0.45,
        pose: KEY(
          [
            { p: 0.9, a: 0.2, e: 1.0, g: 1 },
            { p: 0.2, a: 0.35, e: 0.5, g: 0.6 },
          ],
          [
            { p: 1.7, a: 0.08, k: 2.25 },
            { p: 0.1, a: 0.08, k: 1.65 },
          ],
          { p: 0.25 },
        ),
      },
      {
        t: 6.0,
        pitch: 0.2,
        pose: KEY(
          [
            { p: 0.5, a: 0.2, e: 1.3, g: 1 },
            { p: 0.1, a: 0.3, e: 0.4, g: 0.6 },
          ],
          [
            { p: 1.2, a: 0.08, k: 1.4 },
            { p: 0.5, a: 0.08, k: 1.1 },
          ],
          { p: 0.1 },
        ),
      },
      {
        t: 7.2,
        pitch: 0,
        pose: KEY(
          [
            { p: 0.05, a: 0.14, e: 0.25, g: 0.6 },
            { p: 0.05, a: 0.14, e: 0.25, g: 0.6 },
          ],
          [
            { p: 0, a: 0.05, k: 0.05 },
            { p: 0, a: 0.05, k: 0.05 },
          ],
          { p: -0.1, y: 0.3 },
        ),
      },
    ],
    front: [
      {
        t: 0,
        pitch: Math.PI / 2,
        pose: KEY(
          [
            { p: 2.6, a: 0.6, e: 0.4, g: 0.2 },
            { p: 0.3, a: 0.4, e: 0.3, g: 0.2 },
          ],
          [
            { p: -0.05, a: 0.12, k: 0.1 },
            { p: 0.1, a: 0.1, k: 0.3 },
          ],
          { p: -0.6, y: -0.5 },
        ),
      },
      {
        t: 1.2,
        pitch: Math.PI / 2,
        pose: KEY(
          [
            { p: 1.6, a: 0.75, e: 1.6, g: 0.9 },
            { p: 1.6, a: 0.75, e: 1.6, g: 0.9 },
          ],
          [
            { p: 0, a: 0.12, k: 0.1 },
            { p: 0, a: 0.12, k: 0.1 },
          ],
          { p: -0.7 },
        ),
      },
      {
        t: 2.4,
        pitch: 1.25,
        pose: KEY(
          [
            { p: 1.4, a: 0.55, e: 0.15, g: 1 },
            { p: 1.4, a: 0.55, e: 0.15, g: 1 },
          ],
          [
            { p: 0, a: 0.12, k: 0.05 },
            { p: 0, a: 0.12, k: 0.05 },
          ],
          { p: -0.6 },
        ),
      },
      {
        t: 3.6,
        pitch: 1.0,
        pose: KEY(
          [
            { p: 1.1, a: 0.4, e: 0.1, g: 1 },
            { p: 1.1, a: 0.4, e: 0.1, g: 1 },
          ],
          [
            { p: 1.5, a: 0.1, k: 2.2 },
            { p: 1.5, a: 0.1, k: 2.2 },
          ],
          { p: -0.5 },
        ),
      },
      {
        t: 4.8,
        pitch: 0.2,
        pose: KEY(
          [
            { p: 0.6, a: 0.25, e: 1.1, g: 1 },
            { p: 0.15, a: 0.3, e: 0.4, g: 0.6 },
          ],
          [
            { p: 1.6, a: 0.08, k: 1.7 },
            { p: 0.05, a: 0.08, k: 1.65 },
          ],
          { p: -0.1 },
        ),
      },
      {
        t: 6.0,
        pitch: 0.15,
        pose: KEY(
          [
            { p: 0.4, a: 0.2, e: 1.2, g: 1 },
            { p: 0.1, a: 0.3, e: 0.4, g: 0.6 },
          ],
          [
            { p: 1.1, a: 0.08, k: 1.2 },
            { p: 0.4, a: 0.08, k: 0.9 },
          ],
          { p: 0 },
        ),
      },
      {
        t: 7.2,
        pitch: 0,
        pose: KEY(
          [
            { p: 0.05, a: 0.14, e: 0.25, g: 0.6 },
            { p: 0.05, a: 0.14, e: 0.25, g: 0.6 },
          ],
          [
            { p: 0, a: 0.05, k: 0.05 },
            { p: 0, a: 0.05, k: 0.05 },
          ],
          { p: 0, y: -0.3 },
        ),
      },
    ],
  };

  const wake = (kind, t) => {
    const K = WAKE[kind];
    const last = K[K.length - 1];
    if (t <= 0) return { pitch: K[0].pitch, pose: K[0].pose };
    if (t >= last.t) return { pitch: last.pitch, pose: last.pose };
    let i = 0;
    while (K[i + 1].t < t) i++;
    const a = K[i];
    const b = K[i + 1];
    const k = smooth((t - a.t) / (b.t - a.t));
    return { pitch: lerp(a.pitch, b.pitch, k), pose: mixPose(a.pose, b.pose, k) };
  };

  return { build, P, wake, WAKE_DUR: 7.2 };
})();
