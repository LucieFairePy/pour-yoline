const ROCKS = mobile ? 2200 : 5200,
  DUST = mobile ? 9000 : 22000;
const RC = mobile ? new THREE.Vector3(-0.05, 1.35, -6.2) : new THREE.Vector3(-0.35, 1.65, -5.6);
const rockGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, mobile ? 2 : 3),
    p = g.attributes.position,
    v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k =
      1 +
      0.2 * Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 3.7 + 0.4) * Math.sin(v.z * 2.9 + 2.1) +
      0.09 * Math.sin(v.x * 9 + v.y * 7) +
      0.05 * Math.sin(v.z * 17 - v.x * 11);
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
})();
const rockMat = pbr({ color: 0xffffff, roughness: 0.7, metalness: 0.25, flatShading: true }, 1.3);
const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
rocks.frustumCulled = false;
ROSEG.add(rocks);
const rockP = [],
  dummy = new THREE.Object3D(),
  tmp = [0, 0, 0],
  colTmp = new THREE.Color(),
  TGT = new THREE.Color();
const ringTilt = new THREE.Euler(0.42, 0, 0.22);
for (let i = 0; i < ROCKS; i++) {
  const pr = ROSE.param(i, ROCKS);
  rockP.push({
    pr,
    rr: 9.5 + Math.pow(Math.random(), 1.3) * 8,
    a0: Math.random() * 6.283,
    y: (Math.random() - 0.5) * 0.5,
    s: 0.14 + Math.random() * 0.3,
    ax: new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize(),
    sp: Math.random() * 2,
    st: Math.random(),
    base: new THREE.Color().setHSL(0.62 + Math.random() * 0.06, 0.15, 0.3 + Math.random() * 0.25),
  });
  rocks.setColorAt(i, rockP[i].base);
}
const dustG = new THREE.BufferGeometry(),
  dustPos = new Float32Array(DUST * 3),
  dustCol = new Float32Array(DUST * 3),
  dustSz = new Float32Array(DUST),
  dustP = [];
for (let i = 0; i < DUST; i++) {
  const pr = ROSE.param(i, DUST);
  dustP.push({
    pr,
    rr: 9 + Math.pow(Math.random(), 1.1) * 9.5,
    a0: Math.random() * 6.283,
    y: (Math.random() - 0.5) * 0.35,
    st: Math.random(),
  });
  dustSz[i] = 0.7 + Math.pow(Math.random(), 3) * 1.9;
}
dustG.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
dustG.setAttribute('aCol', new THREE.BufferAttribute(dustCol, 3));
dustG.setAttribute('aSize', new THREE.BufferAttribute(dustSz, 1));
const dust = new THREE.Points(
  dustG,
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: time, uPx: pxU },
    vertexShader: `
      attribute vec3 aCol;
      attribute float aSize;
      uniform float uPx, uTime;
      varying vec3 vC;
      void main() {
        vC = aCol;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPx * (5. / -mv.z) * 1.6;
      }
    `,
    fragmentShader: `
      varying vec3 vC;
      void main() {
        vec2 c = gl_PointCoord - .5;
        float d = length(c);
        if (d > .5) discard;
        float a = pow(1. - d * 2., 1.8) + smoothstep(.15, 0., d) * .6;
        gl_FragColor = vec4(vC * a, a);
      }
    `,
  }),
);
dust.frustumCulled = false;
ROSEG.add(dust);

const roseGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d'),
        gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,200,215,.9)');
      gr.addColorStop(0.3, 'rgba(255,60,110,.35)');
      gr.addColorStop(1, 'rgba(120,10,40,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  }),
);
roseGlow.scale.setScalar(2.6);
ROSEG.add(roseGlow);
const sparkU = { uTime: time, uOn: { value: 0 }, uPx: pxU, uScale: { value: 1 } };
const sparkPts = (() => {
  const n = mobile ? 1400 : 3200,
    g = new THREE.BufferGeometry(),
    p = new Float32Array(n * 3),
    r = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    r.set(
      [
        Math.random() * 6.283,
        0.85 + Math.random() * 0.75,
        (Math.random() - 0.5) * 0.35,
        Math.random(),
      ],
      i * 4,
    );
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aS', new THREE.BufferAttribute(r, 4));
  const m = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: sparkU,
      vertexShader: `
        attribute vec4 aS;
        uniform float uTime, uOn, uPx, uScale;
        varying float vA;
        varying vec3 vC;
        void main() {
          float ang = aS.x + uTime * (.22 + aS.w * .25);
          vec3 p = vec3(cos(ang) * aS.y, aS.z + sin(uTime + aS.w * 20.) * .04, sin(ang) * aS.y) * uScale;
          p.yz = mat2(cos(.38), -sin(.38), sin(.38), cos(.38)) * p.yz;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (.9 + aS.w * 2.4) * uPx * (5. / -mv.z) * 1.5;
          vA = uOn * (.35 + .65 * pow(.5 + .5 * sin(uTime * 3. + aS.w * 60.), 3.));
          vC = mix(vec3(1.4, 1.05, .55), vec3(1.4, .6, .85), aS.w);
        }
      `,
      fragmentShader: `
        varying float vA;
        varying vec3 vC;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5) discard;
          float a = pow(1. - d * 2., 2.) + smoothstep(.12, 0., d);
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    }),
  );
  m.frustumCulled = false;
  ROSEG.add(m);
  return m;
})();
const RS = { form: 0, bloom: 0, flutter: 0, spin: 0, tilt: 0.35, scale: mobile ? 0.82 : 1.1 };
const qv = new THREE.Vector3(),
  qe = new THREE.Euler(),
  qq = new THREE.Quaternion(),
  ringC = new THREE.Vector3();
function roseLocal(pr, out) {
  ROSE.point(pr, RS.bloom, RS.flutter, time.value, tmp);
  qv.set(tmp[0] * RS.scale, tmp[1] * RS.scale, tmp[2] * RS.scale);
  qv.applyEuler(qe.set(0, RS.spin, 0));
  qv.applyEuler(qe.set(RS.tilt, 0, 0));
  out.copy(qv).add(RC).sub(ROSEG.position);
}
const ringOut = new THREE.Vector3(),
  roseOut = new THREE.Vector3();
function ringLocal(rr, a, y, out) {
  out
    .set(Math.cos(a) * rr, y, Math.sin(a) * rr)
    .applyEuler(ringTilt)
    .add(NEP.position);
}
function updateRose(t) {
  if (!ROSEG.visible) return;
  const F = RS.form;
  for (let i = 0; i < ROCKS; i++) {
    const r = rockP[i],
      a = r.a0 + t * (0.11 / Math.pow(r.rr / 9.5, 1.5));
    ringLocal(r.rr, a, r.y, ringOut);
    let f = Math.min(1, Math.max(0, F * 1.6 - r.st * 0.6));
    f = f * f * (3 - 2 * f);
    if (f > 0) {
      roseLocal(r.pr, roseOut);
      ringOut.lerp(roseOut, f);
      ringOut.y += Math.sin(f * Math.PI) * 2.2 * (1 - r.st * 0.5);
    }
    dummy.position.copy(ringOut);
    dummy.quaternion.setFromAxisAngle(r.ax, t * r.sp + i);
    const sc = r.s + (0.026 - r.s) * f;
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    if (F !== RS.lastF) {
      colTmp.copy(r.base).lerp(TGT.setRGB(r.pr.col[0], r.pr.col[1], r.pr.col[2]), f);
      rocks.setColorAt(i, colTmp);
    }
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor && F !== RS.lastF) rocks.instanceColor.needsUpdate = true;
  for (let i = 0; i < DUST; i++) {
    const d = dustP[i],
      a = d.a0 + t * (0.12 / Math.pow(d.rr / 9, 1.5));
    ringLocal(d.rr, a, d.y, ringOut);
    let f = Math.min(1, Math.max(0, F * 1.6 - d.st * 0.6));
    f = f * f * (3 - 2 * f);
    if (f > 0) {
      roseLocal(d.pr, roseOut);
      ringOut.lerp(roseOut, f);
      ringOut.y += Math.sin(f * Math.PI) * 1.6;
    }
    dustPos[i * 3] = ringOut.x;
    dustPos[i * 3 + 1] = ringOut.y;
    dustPos[i * 3 + 2] = ringOut.z;
    const c = d.pr.col,
      br = 0.6 + 0.4 * f;
    dustCol[i * 3] = (0.45 + (c[0] - 0.45) * f) * br;
    dustCol[i * 3 + 1] = (0.6 + (c[1] - 0.6) * f) * br;
    dustCol[i * 3 + 2] = (0.95 + (c[2] - 0.95) * f) * br;
  }
  dustG.attributes.position.needsUpdate = true;
  dustG.attributes.aCol.needsUpdate = true;
  roseGlow.position.set(RC.x, RC.y + 0.1 * RS.scale, RC.z).sub(ROSEG.position);
  roseGlow.material.opacity = RS.bloom * F * 0.5;
  roseGlow.scale.setScalar(2.6 * RS.scale);
  sparkPts.position.copy(roseGlow.position);
  sparkU.uOn.value = RS.bloom * F;
  sparkU.uScale.value = RS.scale;
  RS.lastF = F;
}
