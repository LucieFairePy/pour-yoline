const LAY = {};
function layout() {
  const asp = W / H,
    tan = Math.tan((27.5 * Math.PI) / 180);
  const halfW = (z) => z * tan * asp,
    halfH = (z) => z * tan;
  LAY.hand = new THREE.Vector3(
    Math.min(0.26, halfW(0.8) * 0.6),
    -Math.min(0.4, halfH(0.8) * 0.8),
    -0.82,
  );
  LAY.her = new THREE.Vector3(Math.min(0.95, halfW(1.75) * 0.92), -0.42, -1.75);
  LAY.herScale = mobile ? 0.76 : 0.8;
  LAY.lookHer = Math.atan2(LAY.her.x, -LAY.her.z) * (asp < 0.8 ? 0.95 : 0.75);
}
layout();

const P = {
  yaw: -2.55,
  lean: 0,
  thrust: 0.55,
  reach: 0,
  holdPaper: 0,
  face: 0,
  twirl: 0,
  pull: 0,
  dx: 0,
  dy: 0,
};
const vA = new THREE.Vector3(),
  vB = new THREE.Vector3(),
  vC = new THREE.Vector3(),
  vD = new THREE.Vector3();
const aD = new THREE.Vector3(),
  aM = new THREE.Vector3(),
  UPV = new THREE.Vector3(0, 1, 0);
const BEND_L = new THREE.Vector3(0.4, -1, -0.3).normalize(),
  BEND_R = new THREE.Vector3(-0.6, -1, 0.2).normalize();
const HOLD_L = new THREE.Vector3(0.25, -1, -0.55).normalize(),
  HOLD_R = new THREE.Vector3(-0.25, -1, -0.55).normalize(),
  BH_L = new THREE.Vector3(),
  BH_R = new THREE.Vector3();
const rD = new THREE.Vector3();
function ringAt(m, a, b, f, r) {
  rD.subVectors(b, a);
  m.position.copy(a).addScaledVector(rD, f);
  m.quaternion.setFromUnitVectors(UPV, rD.normalize());
  m.scale.setScalar(r);
}
function solveArm(arm, sh, hand, bendHint, len = 0.3, q = null) {
  const d = aD.subVectors(hand, sh),
    L = d.length(),
    half = Math.min(L / 2, len);
  const off = Math.sqrt(Math.max(0, len * len - half * half));
  const mid = aM.copy(sh).addScaledVector(d, 0.5).addScaledVector(bendHint, off);
  limb(arm.up, sh, mid, arm.r1);
  limb(arm.lo, mid, hand, arm.r2);
  if (arm.brg) {
    ringAt(arm.brg, sh, mid, 0.2, arm.r1 * 1.13);
    ringAt(arm.brg2, sh, mid, 0.25, arm.r1 * 1.09);
  }
  arm.elbow.position.copy(mid);
  arm.hand.position.copy(hand);
  if (q) arm.hand.quaternion.copy(q);
  else arm.hand.quaternion.setFromUnitVectors(UPV, aD.subVectors(hand, mid).normalize());
  arm.hand.scale.setScalar(arm.hs || 1);
}
const herHandW = new THREE.Vector3(),
  tmpW = new THREE.Vector3(),
  herPos = new THREE.Vector3(),
  hp = new THREE.Vector3(),
  camTgt = new THREE.Vector3();
const SIDE_POS = new THREE.Vector3(0.6, -0.58, -0.05),
  HOLD_F = new THREE.Vector3(0.31, -0.8, -0.03);

const GF = new THREE.Vector3(),
  GF2 = new THREE.Vector3(),
  GP = new THREE.Vector3(),
  GPn = new THREE.Vector3(),
  GX = new THREE.Vector3(),
  GM = new THREE.Matrix4();
const qOurs = new THREE.Quaternion(),
  qHers = new THREE.Quaternion(),
  qLocal = new THREE.Quaternion(),
  BQ = new THREE.Quaternion();
const ourWrist = new THREE.Vector3(),
  herWrist = new THREE.Vector3(),
  gy = new THREE.Vector3(),
  gz = new THREE.Vector3(),
  gx = new THREE.Vector3();
function gripBasis(F, Pn, out) {
  gy.copy(F).normalize();
  gz.copy(Pn).addScaledVector(gy, -Pn.dot(gy)).normalize();
  gx.crossVectors(gy, gz);
  GM.makeBasis(gx, gy, gz);
  return out.setFromRotationMatrix(GM);
}

const wob = (t, s) =>
  Math.sin(t * 0.37 + s) * 0.55 +
  Math.sin(t * 0.71 + s * 1.7) * 0.3 +
  Math.sin(t * 1.29 + s * 2.9) * 0.15;

function poseLegs(A, t, ph) {
  A.legs.forEach(({ s, th, sh, boot, knee: kn, kneePad, brg, brg2 }) => {
    const k = wob(t * 0.9, s * 2 + ph) * 0.045,
      l = wob(t * 0.7, s * 5 + ph + 1) * 0.025;
    const hip = vA.set(s * 0.11, -0.32, 0),
      knee = vB.set(s * 0.135 + l, -0.63, 0.19 + k),
      ank = vC.set(s * 0.15 + l * 1.4, -0.93, 0.05 - k * 0.7);
    limb(th, hip, knee, A.T.th);
    limb(sh, knee, ank, A.T.sh);
    boot.position.set(ank.x, ank.y - 0.06, ank.z);
    boot.rotation.set(0.32 + k * 1.5, s * 0.1, s * l * 2);
    if (brg) {
      ringAt(brg, hip, knee, 0.16, A.T.th * 1.1);
      ringAt(brg2, hip, knee, 0.2, A.T.th * 1.06);
    }
    kn.position.copy(knee);
    kneePad.position.set(knee.x, knee.y, knee.z + A.T.th * 0.95);
    kneePad.rotation.x = -0.15;
  });
}
const HL = { yaw: 0, vel: 0 };
function breathe(A, t, ph) {
  const b = 0.5 + 0.5 * Math.sin(t * 1.45 + ph);
  A.torso.scale.set(1 + b * 0.008, 1 + b * 0.003, 0.78 * (1 + b * 0.016));
}
function updateBodies(t, dt = 0.016) {
  const sd = FIN.side * FIN.side * (3 - 2 * FIN.side),
    calm = 1 - sd * 0.5;
  herPos.copy(LAY.her).lerp(SIDE_POS, sd);
  herPos.x += P.dx;
  herPos.y += P.dy;
  Y.g.position
    .copy(herPos)
    .add(
      vA.set(
        wob(t, 4) * 0.014 * calm,
        wob(t * 0.8, 0) * 0.032 * calm,
        wob(t * 0.6, 9) * 0.014 * calm,
      ),
    );
  Y.g.scale.setScalar(LAY.herScale + (0.79 - LAY.herScale) * sd);
  const yaw = P.yaw + P.twirl + wob(t * 0.5, 2) * 0.035;
  Y.g.rotation.set(
    P.lean * 0.5 + wob(t * 0.6, 6) * 0.035 + P.pull * 0.4,
    yaw,
    wob(t * 0.45, 3) * 0.028 - P.pull * 0.3,
  );

  const yv = dt > 0 ? (yaw - (HL.yaw || yaw)) / dt : 0;
  HL.yaw = yaw;
  HL.vel += (yv - HL.vel) * Math.min(1, dt * 4);
  const hr = Y.helmet.rotation,
    kH = 1 - Math.exp(-dt * 3);
  hr.x += (-0.08 + wob(t * 0.9, 7) * 0.035 - hr.x) * kH;
  hr.y += (P.face * 0.35 + wob(t * 0.7, 11) * 0.05 - clamp(HL.vel * 0.12, -0.25, 0.25) - hr.y) * kH;
  hr.z += (wob(t * 0.6, 13) * 0.03 - hr.z) * kH;
  breathe(Y, t, 0);
  Y.flameMat.uniforms.uThrust.value = P.thrust;
  Y.flames.forEach((f) => f.scale.set(1, 0.6 + P.thrust * 1.4 + Math.sin(t * 30) * 0.05, 1));
  Y.visorMat.emissiveIntensity = 0.1 + visorU.uGlow.value * 0.4;
  MEB.visorMat.emissiveIntensity = 0.1;
  poseLegs(Y, t, 0);
  hp.copy(LAY.hand).lerp(HOLD_F, sd);
  const third = FIN.third > 0.02;
  ME.g.visible = !third;
  MEB.g.visible = third;
  GF.set(0.12, -0.42, -1)
    .lerp(GF2.set(0.02, -1, -0.24), sd)
    .normalize();
  GP.set(1, 0.04, 0.1).normalize();
  GPn.copy(GP).negate();
  gripBasis(GF, GP, qOurs);
  gripBasis(GF, GPn, qHers);
  GX.set(1, 0, 0).applyQuaternion(qOurs);
  const squeeze = Math.pow(Math.max(0, Math.sin(t * 0.7)), 8),
    curl = 1.16 + squeeze * 0.16;
  ourWrist.copy(hp).addScaledVector(GP, -0.019).addScaledVector(GF, -0.046);
  herWrist
    .copy(hp)
    .addScaledVector(GP, 0.019)
    .addScaledVector(GF, -0.043)
    .addScaledVector(GX, 0.0092);
  if (!third) {
    const elbow = vB.copy(ourWrist).add(vC.set(0.22, -0.3, 0.48));
    limb(ME.sleeve, elbow, ourWrist, 0.05);
    limb(ME.cuff, vD.copy(ourWrist).lerp(elbow, 0.05), ourWrist, 0.056);
    ME.hand.position.copy(ourWrist);
    ME.hand.quaternion.copy(qOurs);
    ME.hand.scale.setScalar(1);
    setGrip(ME.hand, curl);
  }

  Y.g.updateMatrixWorld(true);
  herHandW.copy(herWrist);
  rig.localToWorld(herHandW);
  Y.body.getWorldQuaternion(BQ);
  BQ.invert();
  qLocal.copy(BQ).multiply(qHers);
  solveArm(
    Y.armL,
    vC.set(0.31, 0.26, 0),
    Y.body.worldToLocal(herHandW.clone()),
    BH_L.copy(BEND_L).lerp(HOLD_L, sd).normalize(),
    0.36 - 0.1 * sd,
    qLocal,
  );
  setGrip(Y.armL.hand, curl);
  setGrip(Y.armR.hand, 0.5 + P.reach * 0.25);
  const shR = vA.set(-0.31, 0.26, 0);
  let handR = vB.set(
    -0.36 + wob(t * 0.8, 21) * 0.02,
    -0.08 + wob(t * 0.7, 23) * 0.025,
    0.17 + wob(t * 0.9, 25) * 0.03,
  );
  if (P.reach > 0) {
    const target = Y.body.worldToLocal(ENV.g.getWorldPosition(tmpW));
    target.x -= 0.12;
    handR.lerp(target, P.reach);
  }
  solveArm(Y.armR, shR, handR, BEND_R, 0.3);
  if (third) {
    MEB.g.position.set(0, -0.53 + Math.sin(t * 0.8 + 1) * 0.02, 0.02);
    MEB.g.rotation.set(Math.sin(t * 0.55) * 0.02, Math.PI, Math.sin(t * 0.45) * 0.02);
    MEB.flameMat.uniforms.uThrust.value = P.thrust;
    MEB.flames.forEach((f) => f.scale.set(1, 0.6 + P.thrust * 1.4 + Math.sin(t * 29) * 0.05, 1));
    MEB.helmet.rotation.set(-0.06, Math.sin(t * 0.3) * 0.1 - 0.18 * sd, 0);
    poseLegs(MEB, t, 1.3);
    breathe(MEB, t, 1.1);
    MEB.g.updateMatrixWorld(true);
    tmpW.copy(ourWrist);
    rig.localToWorld(tmpW);
    MEB.body.getWorldQuaternion(BQ);
    BQ.invert();
    qLocal.copy(BQ).multiply(qOurs);
    solveArm(
      MEB.armR,
      vC.set(-0.31, 0.26, 0),
      MEB.body.worldToLocal(tmpW.clone()),
      HOLD_R,
      0.285,
      qLocal,
    );
    setGrip(MEB.armR.hand, curl);
    setGrip(MEB.armL.hand, 0.45);
    solveArm(
      MEB.armL,
      vC.set(0.31, 0.26, 0),
      vB.set(0.36, -0.14, 0.1 + Math.sin(t * 0.9) * 0.02),
      BEND_L,
      0.3,
    );
  }
}
