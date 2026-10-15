// Anim lab helpers: damping, clip masking (per-bone track filtering), post-mixer bone edits
// (world-space yaw on a bone, analytic two-bone IK). Standalone: nothing here touches the game.
const LabU = (() => {
  const U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
  U.wrap = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  U.angleDamp = (a, b, k, dt) => a + U.wrap(b - a) * (1 - Math.exp(-k * dt));
  U.smooth = (t) => t * t * (3 - 2 * t);

  // UAL skeleton split. Lower = pelvis + legs (the pelvis carries the hip sway and the bob, so it
  // stays with the legs); upper = spine_01 and every bone under it (spine, neck, head, arms, fingers).
  U.LOWER = ['root', 'pelvis', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r'];
  const boneOf = (trackName) => {
    // GLTFLoader names tracks "<node>.<prop>" (sanitised node name)
    const i = trackName.lastIndexOf('.');
    return trackName.slice(0, i);
  };
  // returns a new clip keeping only the tracks whose bone passes the test
  U.maskClip = (clip, keep, suffix) => {
    const tracks = clip.tracks.filter((t) => keep(boneOf(t.name)));
    return new THREE.AnimationClip(clip.name + suffix, clip.duration, tracks);
  };
  U.lowerMask = (name) => U.LOWER.includes(name);
  U.upperMask = (name) => !U.LOWER.includes(name);
  // drop every position track except the pelvis one (in-place clips: the root never moves;
  // bone lengths stay those of the mesh that plays the clip)
  U.inPlace = (clip, hip) => {
    clip.tracks = clip.tracks.filter((t) => {
      if (!t.name.endsWith('.position')) return true;
      return boneOf(t.name) === hip;
    });
    return clip;
  };

  const _q = new THREE.Quaternion();
  const _q2 = new THREE.Quaternion();
  const _pq = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  // rotate a bone by `q` expressed in world space, keeping its children attached
  U.rotateWorld = (bone, q) => {
    bone.parent.getWorldQuaternion(_pq);
    // local' = P^-1 * q * P * local
    _q2.copy(_pq).invert().multiply(q).multiply(_pq);
    bone.quaternion.premultiply(_q2);
    bone.updateMatrixWorld(true);
  };
  U.yawWorld = (bone, angle) => {
    if (Math.abs(angle) < 1e-4) return;
    U.rotateWorld(bone, _q.setFromAxisAngle(UP, angle));
  };
  U.axisWorld = (bone, axis, angle) => {
    if (Math.abs(angle) < 1e-4) return;
    U.rotateWorld(bone, _q.setFromAxisAngle(axis, angle));
  };

  // turn bone so that its world-space vector `from` points along `to` (weight 0..1)
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _id = new THREE.Quaternion();
  const aim = (bone, from, to, w) => {
    _a.copy(from).normalize();
    _b.copy(to).normalize();
    _q.setFromUnitVectors(_a, _b);
    if (w < 1) _q.slerp(_id, 1 - w);
    U.rotateWorld(bone, _q);
  };

  // analytic two-bone IK (upper arm, forearm, hand): the hand reaches `target`, the elbow keeps
  // bending on the side it already bends to (pole = current elbow), `pole` is a fallback
  const S = new THREE.Vector3();
  const E = new THREE.Vector3();
  const W = new THREE.Vector3();
  const T = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const side = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  U.ik2 = (up, lo, hand, target, pole, w) => {
    if (w <= 0.001) return;
    up.getWorldPosition(S);
    lo.getWorldPosition(E);
    hand.getWorldPosition(W);
    T.copy(target);
    const a = S.distanceTo(E);
    const b = E.distanceTo(W);
    dir.subVectors(T, S);
    const d = U.clamp(dir.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
    dir.normalize();
    side.subVectors(E, S);
    side.addScaledVector(dir, -side.dot(dir));
    if (side.lengthSq() < 1e-6) side.copy(pole);
    side.normalize();
    const cosA = U.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    elbow.copy(S).addScaledVector(dir, a * cosA).addScaledVector(side, a * Math.sqrt(1 - cosA * cosA));
    aim(up, _v.subVectors(E, S), elbow.clone().sub(S), w);
    lo.getWorldPosition(E);
    hand.getWorldPosition(W);
    T.copy(S).addScaledVector(dir, d); // reach point, clamped to the arm's length
    aim(lo, _v.subVectors(W, E), T.clone().sub(E), w);
  };

  return U;
})();
