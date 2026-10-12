const visorU = { uGlow: { value: 0 } };

function makeAstronaut({
  suit,
  feminine = false,
  name = '',
  accent = '#0c9455',
  accentDark = '#0b5e38',
  patchText = 'Y + MOI',
}) {
  const F = feminine;
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  };
  const T = F
    ? { ua: 0.047, la: 0.04, th: 0.083, sh: 0.063 }
    : { ua: 0.057, la: 0.049, th: 0.092, sh: 0.076 };

  const prof = (
    F
      ? [
          [0, -0.44],
          [0.14, -0.437],
          [0.205, -0.39],
          [0.234, -0.3],
          [0.226, -0.21],
          [0.192, -0.12],
          [0.162, -0.05],
          [0.166, 0.02],
          [0.194, 0.1],
          [0.213, 0.18],
          [0.221, 0.26],
          [0.211, 0.33],
          [0.188, 0.4],
          [0.15, 0.445],
          [0.1, 0.47],
          [0, 0.48],
        ]
      : [
          [0, -0.44],
          [0.15, -0.435],
          [0.21, -0.38],
          [0.225, -0.27],
          [0.205, -0.15],
          [0.198, -0.08],
          [0.215, 0.02],
          [0.25, 0.13],
          [0.272, 0.23],
          [0.278, 0.31],
          [0.255, 0.39],
          [0.2, 0.44],
          [0.13, 0.47],
          [0, 0.48],
        ]
  ).map(([r, y]) => new THREE.Vector2(r, y));

  const tGeo = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(200), 144),
    tp = tGeo.attributes.position,
    tv = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) {
    tv.fromBufferAttribute(tp, i);
    const r = Math.hypot(tv.x, tv.z);
    if (r < 1e-4) continue;
    const a = Math.atan2(tv.x, tv.z),
      y = tv.y,
      ax = Math.abs(Math.sin(a));
    let k = 1;
    if (F) {
      const fx = Math.sin(a) * r,
        front = Math.max(0, Math.cos(a));
      k +=
        front *
        0.2 *
        Math.exp(-Math.pow(Math.abs(fx) - 0.072, 2) / 0.0035 - Math.pow(y - 0.15, 2) / 0.0045);
    } else k += Math.max(0, Math.cos(a)) * 0.05 * Math.exp(-Math.pow(y - 0.2, 2) / 0.01);
    const waist = Math.exp(-Math.pow((y - (F ? -0.04 : -0.12)) / 0.09, 2));
    k += waist * (0.014 * Math.sin(a * 9 + y * 40) + 0.008 * Math.sin(a * 17 - y * 25));
    k += ax * Math.exp(-Math.pow((y - 0.2) / 0.07, 2)) * 0.01 * Math.sin(y * 70 + a * 3);
    tp.setXYZ(i, tv.x * k, y, tv.z * k);
  }
  tGeo.computeVertexNormals();
  const torso = add(tGeo, suit, 0, 0, 0, 1, 1, 0.78);
  const wy = F ? -0.06 : -0.15,
    wr = F ? 0.166 : 0.205;
  add(new THREE.TorusGeometry(wr, 0.014, 24, 160), chromeMat, 0, wy, 0, 1, 1, 0.78).rotation.x =
    Math.PI / 2;
  add(
    new THREE.TorusGeometry(wr - 0.006, 0.006, 12, 160),
    dark,
    0,
    wy + 0.02,
    0,
    1,
    1,
    0.78,
  ).rotation.x = Math.PI / 2;
  const shX = F ? 0.232 : 0.27;
  [-1, 1].forEach((s) =>
    add(sph(1), suit, s * shX, 0.3, 0, F ? 0.094 : 0.115, F ? 0.084 : 0.1, F ? 0.094 : 0.11),
  );
  const nr = F ? 0.185 : 0.205;
  add(new THREE.TorusGeometry(nr, 0.03, 28, 160), chromeMat, 0, 0.43, 0, 1, 1, 0.9).rotation.x =
    Math.PI / 2;
  add(new THREE.TorusGeometry(nr, 0.011, 16, 160), gold, 0, 0.455, 0, 1, 1, 0.9).rotation.x =
    Math.PI / 2;

  const dcm = new THREE.Group();
  dcm.position.set(0, F ? 0.0 : 0.11, F ? 0.175 : 0.205);
  dcm.rotation.x = -0.12;
  dcm.scale.setScalar(F ? 0.82 : 1);
  body.add(dcm);
  dcm.add(new THREE.Mesh(roundBox(0.2, 0.12, 0.05, 0.018), white));
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.04),
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 256, (x, w, h) => {
        x.fillStyle = '#071a14';
        x.fillRect(0, 0, w, h);
        x.fillStyle = '#6dffc0';
        x.font = '600 68px IBM Plex Mono, monospace';
        x.fillText('O₂ 98%', 28, 96);
        x.fillStyle = '#ff6b9a';
        x.font = '600 60px IBM Plex Mono, monospace';
        Icons.fillText(x, '♥ 120 bpm', 28, 200);
      }),
    }),
  );
  scr.position.set(-0.035, 0.012, 0.027);
  dcm.add(scr);
  [
    [0.045, 0.025, 0xff3d6e],
    [0.075, 0.025, 0xffd36b],
    [0.045, -0.012, 0x6dffc0],
    [0.075, -0.012, 0x7aa8ff],
  ].forEach(([x, y, c]) => {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.008, 24),
      new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 0.6,
        roughness: 0.3,
      }),
    );
    b.rotation.x = Math.PI / 2;
    b.position.set(x, y, 0.03);
    dcm.add(b);
  });
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 32), chromeMat);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(-0.035, -0.035, 0.03);
  dcm.add(knob);

  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.03),
    new THREE.MeshStandardMaterial({
      roughness: 0.8,
      map: canvasTex(1024, 256, (x, w, h) => {
        x.fillStyle = '#e9e4ea';
        x.fillRect(0, 0, w, h);
        x.strokeStyle = accent;
        x.lineWidth = 16;
        x.strokeRect(12, 12, w - 24, h - 24);
        x.fillStyle = accentDark;
        x.font = '700 150px IBM Plex Mono, monospace';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(name.toUpperCase(), w / 2, h / 2 + 8);
      }),
    }),
  );
  tag.position.set(F ? 0.1 : 0.1, 0.27, F ? 0.19 : 0.218);
  tag.rotation.set(-0.32, 0.3, 0);
  body.add(tag);
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(0.045, 64),
    new THREE.MeshStandardMaterial({
      roughness: 0.75,
      transparent: true,
      map: canvasTex(512, 512, (x) => {
        x.scale(2, 2);
        x.fillStyle = '#14060f';
        x.beginPath();
        x.arc(128, 128, 124, 0, 7);
        x.fill();
        x.strokeStyle = '#e6b456';
        x.lineWidth = 10;
        x.stroke();
        x.fillStyle = '#d8324f';
        heartPath(x, 128, 140, 110);
        x.fill();
        x.fillStyle = '#fbefe6';
        x.font = '700 26px IBM Plex Mono, monospace';
        x.textAlign = 'center';
        x.fillText('MISSION', 128, 60);
        x.fillText(patchText, 128, 222);
      }),
    }),
  );
  patch.position.set(F ? 0.3 : 0.335, 0.29, 0.03);
  patch.rotation.y = 1.35;
  body.add(patch);

  const pack = add(
    roundBox(F ? 0.34 : 0.38, F ? 0.46 : 0.5, F ? 0.16 : 0.17, 0.04),
    white,
    0,
    0.07,
    F ? -0.25 : -0.27,
  );
  add(roundBox(F ? 0.28 : 0.32, 0.1, 0.02, 0.01), dark, 0, 0.25, -0.18).position.z = F
    ? -0.33
    : -0.355;
  for (let i = 0; i < 6; i++)
    add(
      new THREE.BoxGeometry(F ? 0.2 : 0.22, 0.008, 0.01),
      dark,
      0,
      -0.07 + i * 0.022,
      F ? -0.334 : -0.36,
    );
  [-1, 1].forEach((s) => {
    const k = F ? 0.88 : 1;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.19 * k, 0.02, -0.2 * k),
      new THREE.Vector3(s * 0.29 * k, 0.0, -0.02),
      new THREE.Vector3(s * 0.24 * k, F ? -0.02 : 0.05, 0.17 * k),
      new THREE.Vector3(s * 0.1 * k, F ? 0.01 : 0.1, F ? 0.19 : 0.23),
    ]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(c, 72, 0.016, 18), cloth));
    for (let q = 1; q < 14; q++) {
      const p = c.getPoint(q / 14),
        tn = c.getTangent(q / 14);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.004, 10, 28), chromeMat);
      r.position.copy(p);
      r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tn);
      body.add(r);
    }
  });
  const nozL = add(new THREE.CylinderGeometry(0.04, 0.062, 0.1, 40), chromeMat, -0.1, -0.22, -0.29),
    nozR = add(new THREE.CylinderGeometry(0.04, 0.062, 0.1, 40), chromeMat, 0.1, -0.22, -0.29);
  const flameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uThrust: { value: 0.6 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float uTime, uThrust;
      varying vec2 vUv;
      void main() {
        float y = vUv.y;
        float fl = .75 + .25 * sin(uTime * 40. + y * 20.) * sin(uTime * 23.);
        vec3 c = mix(vec3(1., .45, .15), vec3(.75, .9, 1.), pow(y, 2.));
        float a = pow(y, 1.4) * fl * uThrust;
        gl_FragColor = vec4(c * a * 1.6, a);
      }
    `,
  });
  const flames = [nozL, nozR].map((n) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 32, 1, true), flameMat);
    f.rotation.x = Math.PI;
    f.position.set(n.position.x, n.position.y - 0.3, n.position.z);
    body.add(f);
    return f;
  });

  const bootGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(-0.06, 0.07);
    s.lineTo(-0.065, -0.02);
    s.quadraticCurveTo(-0.07, -0.06, -0.03, -0.065);
    s.lineTo(0.12, -0.065);
    s.quadraticCurveTo(0.165, -0.06, 0.16, -0.02);
    s.quadraticCurveTo(0.15, 0.02, 0.06, 0.03);
    s.lineTo(0.055, 0.07);
    s.lineTo(-0.06, 0.07);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.018,
      bevelSegments: 10,
      curveSegments: 28,
    });
    geo.translate(0, 0, -0.05);
    geo.rotateY(-Math.PI / 2);
    return geo;
  })();
  const legs = [-1, 1].map((s) => {
    const th = add(limbGeo, suit, 0, 0, 0),
      sh = add(limbGeo, suit, 0, 0, 0);
    const boot = new THREE.Group();
    boot.scale.setScalar(F ? 0.86 : 1);
    body.add(boot);
    boot.add(new THREE.Mesh(bootGeo, white));
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.245), rubber);
    sole.position.set(0, -0.082, 0.045);
    boot.add(sole);
    for (let q = 0; q < 7; q++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.012), rubber);
      l.position.set(0, -0.094, -0.06 + q * 0.034);
      boot.add(l);
    }
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 16, 56), chromeMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = 0.075;
    boot.add(cuff);
    const knee = add(sph(1), suit, 0, 0, 0, T.th * 1.12, T.th * 1.02, T.th * 1.12);
    const kneePad = add(roundBox(0.07, 0.06, 0.02, 0.008), cloth, 0, 0, 0);
    kneePad.scale.setScalar(F ? 0.85 : 1);
    return { s, th, sh, boot, knee, kneePad };
  });

  const armR = {
    up: add(limbGeo, suit, 0, 0, 0),
    lo: add(limbGeo, suit, 0, 0, 0),
    hand: glove(cloth, 0.5, F ? -1 : 1),
    r1: T.ua,
    r2: T.la,
    hs: F ? 0.9 : 1,
  };
  const armL = {
    up: add(limbGeo, suit, 0, 0, 0),
    lo: add(limbGeo, suit, 0, 0, 0),
    hand: glove(cloth, F ? 1.2 : 0.5, F ? -1 : 1, { checklist: true }),
    r1: T.ua,
    r2: T.la,
    hs: F ? 0.9 : 1,
  };
  body.add(armR.hand);
  body.add(armL.hand);
  [armR, armL].forEach((a) => {
    a.elbow = add(sph(1), suit, 0, 0, 0, T.la * 1.08, T.la * 1.08, T.la * 1.08);
  });

  const brgGeo = new THREE.TorusGeometry(1, 0.13, 16, 72).rotateX(Math.PI / 2),
    lockGeo = new THREE.TorusGeometry(1, 0.09, 12, 72).rotateX(Math.PI / 2);
  [armR, armL].forEach((a) => {
    a.brg = add(brgGeo, chromeMat, 0, 0, 0);
    a.brg2 = add(lockGeo, dark, 0, 0, 0);
  });
  legs.forEach((l) => {
    l.brg = add(brgGeo, chromeMat, 0, 0, 0);
    l.brg2 = add(lockGeo, dark, 0, 0, 0);
  });

  const helmet = new THREE.Group();
  helmet.position.set(0, 0.66, 0);
  helmet.scale.setScalar(F ? 0.96 : 1);
  body.add(helmet);
  add(sph(0.27, 128, 96), white, 0, 0, 0, 1, 1, 1, helmet);
  helmet.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.2745, 128, 96, Math.PI / 2 - 1.05, 2.1, 0.76, 1.44),
      rubber,
    ),
  );
  const visorMat = pbr(
    { color: 0xc99a45, metalness: 1, roughness: 0.045, emissive: 0x6a3410, emissiveIntensity: 0.1 },
    2.1,
  );
  helmet.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.279, 160, 120, Math.PI / 2 - 1.0, 2.0, 0.8, 1.36),
      visorMat,
    ),
  );
  const rimG = new THREE.Mesh(
    new THREE.TorusGeometry(0.282, 0.016, 24, 180, Math.PI * 1.22),
    chromeMat,
  );
  rimG.position.set(0, -0.015, 0.015);
  rimG.rotation.set(0, 0, -Math.PI * 0.11);
  helmet.add(rimG);
  add(
    new THREE.TorusGeometry(0.272, 0.012, 20, 180),
    gold,
    0,
    -0.17,
    0,
    1,
    1,
    1,
    helmet,
  ).rotation.x = Math.PI / 2;
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.1) });
  [-1, 1].forEach((s) => {
    const lamp = new THREE.Group();
    lamp.position.set(s * 0.245, 0.1, 0.07);
    lamp.rotation.z = s * -0.3;
    helmet.add(lamp);
    lamp.add(new THREE.Mesh(roundBox(0.05, 0.04, 0.06, 0.012), chromeMat));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.014, 32), lampMat);
    lens.position.z = 0.037;
    lamp.add(lens);
  });
  const cam = add(
    new THREE.CylinderGeometry(0.016, 0.016, 0.04, 32),
    dark,
    -0.2,
    0.19,
    0.04,
    1,
    1,
    1,
    helmet,
  );
  cam.rotation.x = Math.PI / 2;
  add(
    new THREE.CylinderGeometry(0.005, 0.005, 0.17, 12),
    chromeMat,
    0.14,
    0.27,
    -0.06,
    1,
    1,
    1,
    helmet,
  ).rotation.z = -0.4;
  add(
    sph(0.018, 24, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.5, 0.9) }),
    0.177,
    0.345,
    -0.06,
    1,
    1,
    1,
    helmet,
  );
  if (F) {
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.03);
    hs.bezierCurveTo(-0.045, 0, -0.04, 0.04, 0, 0.02);
    hs.bezierCurveTo(0.04, 0.04, 0.045, 0, 0, -0.03);
    const sticker = new THREE.Mesh(
      new THREE.ShapeGeometry(hs, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff3d6e,
        emissive: 0x5a0018,
        roughness: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    sticker.position.set(-0.262, 0.03, -0.06);
    sticker.rotation.y = -Math.PI / 2 - 0.2;
    helmet.add(sticker);
  }

  const webbing = pbr({ color: 0x2b2733, roughness: 0.82, metalness: 0.05 }, 0.7);
  [-1, 1].forEach((s) => {
    const sb = add(
      new THREE.TorusGeometry(F ? 0.06 : 0.07, 0.012, 18, 72),
      chromeMat,
      s * (shX + 0.035),
      0.29,
      0,
    );
    sb.rotation.y = Math.PI / 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.13, 0.44, 0.02),
      new THREE.Vector3(s * 0.15, 0.32, F ? 0.17 : 0.19),
      new THREE.Vector3(s * 0.13, 0.14, F ? 0.2 : 0.215),
      new THREE.Vector3(s * 0.11, wy + 0.04, F ? 0.135 : 0.17),
    ]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.007, 10), webbing));
    const cb = add(
      new THREE.TorusGeometry(0.014, 0.0035, 10, 32),
      chromeMat,
      s * 0.155,
      wy - 0.035,
      F ? 0.125 : 0.16,
    );
    cb.rotation.set(0.3, 0.2 * s, 0);
    cb.scale.set(0.75, 1, 1);
  });
  const PW = F ? 0.34 : 0.38,
    PH = F ? 0.46 : 0.5,
    PZ = F ? -0.25 : -0.27,
    PD = F ? 0.16 : 0.17,
    back = PZ - PD / 2;
  [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ].forEach(([sx, sy]) =>
    add(
      sph(0.022, 24, 18),
      webbing,
      sx * (PW / 2 - 0.01),
      0.07 + sy * (PH / 2 - 0.01),
      back + 0.02,
    ),
  );
  const handle = add(
    new THREE.TorusGeometry(0.045, 0.008, 12, 40, Math.PI),
    chromeMat,
    0,
    0.07 + PH / 2,
    PZ - 0.02,
  );
  handle.rotation.y = Math.PI / 2;
  const lbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.045),
    new THREE.MeshStandardMaterial({
      roughness: 0.7,
      map: canvasTex(1024, 232, (x, w, h) => {
        x.fillStyle = '#e9e4ea';
        x.fillRect(0, 0, w, h);
        x.fillStyle = accentDark;
        x.font = '700 72px IBM Plex Mono, monospace';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('LIFE SUPPORT · ' + name.toUpperCase(), w / 2, h / 2 + 4);
        x.strokeStyle = accent;
        x.lineWidth = 10;
        x.strokeRect(8, 8, w - 16, h - 16);
      }),
    }),
  );
  lbl.position.set(0, 0.2, back - 0.002);
  lbl.rotation.y = Math.PI;
  body.add(lbl);
  const refl = new THREE.MeshStandardMaterial({
    color: 0xd8dde8,
    emissive: 0x6a7080,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.6,
  });
  [-1, 1].forEach(
    (s) =>
      (add(
        new THREE.BoxGeometry(0.012, PH * 0.7, 0.004),
        refl,
        s * (PW / 2 + 0.001),
        0.07,
        PZ,
      ).rotation.y = Math.PI / 2),
  );
  const housing = new THREE.Mesh(new THREE.TorusGeometry(0.287, 0.019, 20, 160, Math.PI), white);
  housing.rotation.x = 0.62;
  helmet.add(housing);
  [-1, 1].forEach((s) => {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 40), white);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(s * 0.289, 0, 0);
    helmet.add(hinge);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.022, 32), chromeMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(s * 0.29, 0, 0);
    helmet.add(cap);
  });
  return { g, body, helmet, legs, armR, armL, flames, flameMat, pack, torso, visorMat, T, suit };
}
const Y = makeAstronaut({ suit: suitMat, feminine: true, name: CONFIG.name });
rig.add(Y.g);
const MEB = makeAstronaut({
  suit: sequinMat(0x1d2d6e, { glint: 0.55 }),
  feminine: false,
  name: 'Moi',
  accent: '#2a3f9e',
  accentDark: '#1b2a6b',
});
MEB.g.visible = false;
MEB.g.position.set(0, -0.53, 0.02);
MEB.g.rotation.y = Math.PI;
MEB.g.scale.setScalar(0.8);
rig.add(MEB.g);

const ME = (() => {
  const g = new THREE.Group();
  rig.add(g);
  const sleeve = new THREE.Mesh(limbGeo, MEB.suit),
    cuff = new THREE.Mesh(cyl, chromeMat),
    hand = glove(cloth, 1.2, 1, { checklist: false });
  [sleeve, cuff, hand].forEach((m) => g.add(m));
  return { g, sleeve, cuff, hand };
})();
