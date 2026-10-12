const gloveGrip = pbr({ color: 0x55515f, roughness: 0.8, metalness: 0.04 }, 0.6);
const phCache = {};

function pillow(w, h, d, e = 3, seg = 40) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)),
    p = g.attributes.position,
    v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = Math.pow(
      Math.pow(Math.abs(v.x), e) + Math.pow(Math.abs(v.y), e) + Math.pow(Math.abs(v.z), e),
      -1 / e,
    );
    p.setXYZ(i, (v.x * k * w) / 2, (v.y * k * h) / 2, (v.z * k * d) / 2);
  }
  g.computeVertexNormals();
  return g;
}

function phalanx(L, r0, r1) {
  const key = [L, r0, r1].map((v) => v.toFixed(4)).join();
  if (phCache[key]) return phCache[key];
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + ((i / 8) * Math.PI) / 2;
    pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r0), Math.sin(a) * r0 * 0.9));
  }
  for (let i = 1; i < 10; i++) {
    const t = i / 10,
      r = r0 + (r1 - r0) * t;
    pts.push(new THREE.Vector2(r * (1 + 0.05 * Math.sin(t * Math.PI)), L * t));
  }
  for (let i = 0; i <= 8; i++) {
    const a = ((i / 8) * Math.PI) / 2;
    pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r1), L + Math.sin(a) * r1 * 0.95));
  }
  return (phCache[key] = new THREE.LatheGeometry(pts, 24));
}
function glove(mat, curl = 0.9, flip = 1, opts = {}) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(pillow(0.074, 0.074, 0.029, 3.2), mat);
  palm.position.y = 0.045;
  g.add(palm);
  const thenar = new THREE.Mesh(sph(1, 32, 24), mat);
  thenar.position.set(-0.02 * flip, 0.028, 0.006);
  thenar.scale.set(0.016, 0.022, 0.009);
  g.add(thenar);
  const hypo = new THREE.Mesh(sph(1, 32, 24), mat);
  hypo.position.set(0.023 * flip, 0.034, 0.005);
  hypo.scale.set(0.012, 0.022, 0.008);
  g.add(hypo);
  const pad = new THREE.Mesh(pillow(0.05, 0.028, 0.006, 3), gloveGrip);
  pad.position.set(0.004 * flip, 0.06, 0.0125);
  g.add(pad);
  const back = new THREE.Mesh(pillow(0.06, 0.052, 0.009, 2.6), mat);
  back.position.set(0, 0.048, -0.0115);
  g.add(back);
  const guard = new THREE.Mesh(pillow(0.07, 0.015, 0.014, 2.8), mat);
  guard.position.set(0, 0.078, -0.008);
  g.add(guard);
  const fingers = [];
  const LEN = [
    [0.032, 0.022, 0.018],
    [0.036, 0.024, 0.019],
    [0.034, 0.023, 0.018],
    [0.026, 0.018, 0.015],
  ];
  const BASEY = [0.08, 0.082, 0.081, 0.077],
    RAD = [0.0086, 0.009, 0.0087, 0.0078];
  for (let k = 0; k < 4; k++) {
    const dome = new THREE.Mesh(sph(1, 20, 14), mat);
    dome.position.set((k - 1.5) * 0.0182 * flip, BASEY[k] - 0.004, -0.014);
    dome.scale.set(0.0075, 0.006, 0.0055);
    g.add(dome);
    const base = new THREE.Group();
    base.position.set((k - 1.5) * 0.0182 * flip, BASEY[k], 0.002);
    base.rotation.z = -(k - 1.5) * 0.05 * flip;
    g.add(base);
    const chain = [];
    let parent = base;
    LEN[k].forEach((L, s) => {
      const j = new THREE.Group();
      if (s) j.position.y = LEN[k][s - 1];
      parent.add(j);
      const r0 = RAD[k] * (1 - s * 0.08),
        r1 = RAD[k] * (1 - (s + 1) * 0.08);
      const bone = new THREE.Mesh(phalanx(L, r0, r1), mat);
      bone.scale.z = 0.86;
      j.add(bone);
      if (s === 2) {
        const cap = new THREE.Mesh(phalanx(L * 0.42, r1 * 1.06, r1 * 1.04), gloveGrip);
        cap.position.y = L * 0.62;
        cap.scale.z = 0.88;
        j.add(cap);
      }
      chain.push(j);
      parent = j;
    });
    fingers.push(chain);
  }
  const th0 = new THREE.Group();
  th0.position.set(-0.029 * flip, 0.024, 0.009);
  th0.rotation.set(0.55, -0.45 * flip, 0.55 * flip);
  g.add(th0);
  const meta = new THREE.Mesh(phalanx(0.022, 0.0125, 0.0108), mat);
  meta.scale.z = 0.85;
  th0.add(meta);
  const th1 = new THREE.Group();
  th1.position.y = 0.022;
  th0.add(th1);
  th1.add(new THREE.Mesh(phalanx(0.022, 0.0106, 0.0098), mat));
  const th2 = new THREE.Group();
  th2.position.y = 0.022;
  th1.add(th2);
  th2.add(new THREE.Mesh(phalanx(0.018, 0.0097, 0.0088), mat));
  const tcap = new THREE.Mesh(phalanx(0.008, 0.0094, 0.009), gloveGrip);
  tcap.position.y = 0.011;
  th2.add(tcap);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0062, 18, 64), chromeMat);
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1, 0.66, 1);
  ring.position.y = 0.002;
  g.add(ring);
  const lock = new THREE.Mesh(new THREE.TorusGeometry(0.0425, 0.0042, 14, 64), dark);
  lock.rotation.x = Math.PI / 2;
  lock.scale.set(1, 0.66, 1);
  lock.position.y = -0.009;
  g.add(lock);
  const gaunt = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.045, 0.05, 48, 2, false), mat);
  gaunt.scale.z = 0.7;
  gaunt.position.y = -0.035;
  g.add(gaunt);
  if (opts.checklist) {
    const cl = new THREE.Mesh(
      roundBox(0.05, 0.036, 0.008, 0.003),
      new THREE.MeshStandardMaterial({
        roughness: 0.7,
        map: canvasTex(256, 192, (x, w, h) => {
          x.fillStyle = '#ece7ee';
          x.fillRect(0, 0, w, h);
          x.fillStyle = '#3a1424';
          x.font = '700 22px IBM Plex Mono, monospace';
          x.fillText('CHECKLIST', 18, 34);
          x.font = '500 19px IBM Plex Mono, monospace';
          ['☑ décoller', '☑ lettre', '☑ rose', '☐ dire oui'].forEach((l, i) =>
            Icons.fillText(x, l, 18, 70 + i * 30),
          );
        }),
      }),
    );
    cl.material.map.repeat.set(1 / 0.05, 1 / 0.036);
    cl.material.map.offset.set(0.5, 0.5);
    cl.position.set(0, -0.04, -0.04);
    cl.rotation.y = Math.PI;
    g.add(cl);
  }
  g.userData = { fingers, thumb: [th0, th1, th2], flip, seed: Math.random() * 100 };
  setGrip(g, curl);
  return g;
}

function setGrip(g, c, spread = 0) {
  const { fingers, thumb, seed } = g.userData,
    t = time.value;
  fingers.forEach((ch, k) => {
    const cc =
      c * (0.92 + k * 0.05) +
      0.035 * Math.sin(t * (0.7 + k * 0.13) + seed + k * 1.9) +
      0.02 * Math.sin(t * 1.9 + k + seed);
    ch[0].rotation.x = cc * 0.62 + (k === 3 ? 0.05 : 0);
    ch[1].rotation.x = cc * 0.95 + 0.06;
    ch[2].rotation.x = cc * 0.72 + 0.04;
    ch[0].parent.rotation.z =
      -(k - 1.5) * (0.05 + spread + 0.015 * Math.sin(t * 0.5 + seed)) * g.userData.flip;
  });
  const tc = c + 0.03 * Math.sin(t * 0.8 + seed * 2);
  thumb[0].rotation.x = 0.35 + tc * 0.25;
  thumb[1].rotation.x = 0.1 + tc * 0.5;
  thumb[2].rotation.x = 0.08 + tc * 0.45;
}
