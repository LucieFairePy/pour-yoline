const nameU = {
  uTime: time,
  uPx: pxU,
  uIn: { value: 0 },
  uOut: { value: 0 },
  uGlow: { value: null },
};
const NAME_Z = 140,
  NS = NAME_Z / 12;
let nameG = null;
function nameSamples(str) {
  const CW = 2200,
    CH = 720,
    c = document.createElement('canvas'),
    x = c.getContext('2d');
  c.width = CW;
  c.height = CH;
  let fs = 520;
  const font = (s) => `italic 500 ${s}px "Bodoni Moda", Didot, Georgia, serif`;
  x.font = font(fs);
  const mw = x.measureText(str).width;
  if (mw > CW * 0.9) {
    fs *= (CW * 0.9) / mw;
    x.font = font(fs);
  }
  x.fillStyle = '#fff';
  x.strokeStyle = '#fff';
  x.lineWidth = fs * 0.03;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(str, CW / 2, CH / 2);
  x.strokeText(str, CW / 2, CH / 2);
  const d = x.getImageData(0, 0, CW, CH).data,
    al = (xx, yy) => d[(yy * CW + xx) * 4 + 3];
  const fill = [],
    edge = [];
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  for (let yy = 4; yy < CH - 4; yy++)
    for (let xx = 4; xx < CW - 4; xx++) {
      if (al(xx, yy) < 150) continue;
      x0 = Math.min(x0, xx);
      x1 = Math.max(x1, xx);
      y0 = Math.min(y0, yy);
      y1 = Math.max(y1, yy);
      (al(xx - 3, yy) < 150 || al(xx + 3, yy) < 150 || al(xx, yy - 3) < 150 || al(xx, yy + 3) < 150
        ? edge
        : fill
      ).push(xx, yy);
    }

  const g = document.createElement('canvas');
  g.width = CW / 2;
  g.height = CH / 2;
  const gx = g.getContext('2d');
  gx.scale(0.5, 0.5);
  gx.font = x.font;
  gx.textAlign = 'center';
  gx.textBaseline = 'middle';
  [
    [90, 'rgba(255,70,140,.85)', 2],
    [34, 'rgba(255,190,150,.9)', 1],
    [10, 'rgba(255,235,220,.6)', 1],
  ].forEach(([bl, col, rep]) => {
    gx.shadowColor = col;
    gx.shadowBlur = bl;
    gx.shadowOffsetX = 20000;
    gx.fillStyle = '#000';
    for (let r = 0; r < rep; r++) gx.fillText(str, CW / 2 - 20000, CH / 2);
  });
  return { CW, CH, fill, edge, x0, x1, y0, y1, glow: g };
}
function slotY() {
  const r = $('#iSlot').getBoundingClientRect(),
    ok = r.height > 20;
  return { cy: ok ? r.top + r.height / 2 : H * 0.3, room: ok ? r.height : H * 0.25 };
}
function buildName() {
  if (nameG) {
    nameG.parent && nameG.parent.remove(nameG);
    nameG.traverse((o) => {
      o.geometry && o.geometry.dispose();
      o.material && o.material.dispose();
    });
  }
  const Sm = nameSamples(CONFIG.name),
    asp = W / H,
    halfH = NAME_Z * Math.tan((27.5 * Math.PI) / 180),
    halfW = halfH * asp;
  const { cy, room } = slotY();
  const bw = Sm.x1 - Sm.x0,
    bh = Sm.y1 - Sm.y0;
  let wW = halfW * 2 * (asp < 0.8 ? 0.86 : asp < 1.2 ? 0.7 : 0.46);
  wW = Math.min(wW, ((room / H) * halfH * 2 * 1.05 * bw) / bh);
  const k = wW / bw,
    cxB = (Sm.x0 + Sm.x1) / 2,
    cyB = (Sm.y0 + Sm.y1) / 2;
  const n = mobile ? 13000 : 34000,
    P = new Float32Array(n * 3),
    R = new Float32Array(n * 4),
    E = new Float32Array(n),
    U = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const isEdge = Math.random() < 0.42 && Sm.edge.length > 0,
      arr = isEdge || !Sm.fill.length ? Sm.edge : Sm.fill;
    const j = Math.floor(Math.random() * (arr.length / 2)) * 2;
    const px = arr[j] + Math.random() - 0.5,
      py = arr[j + 1] + Math.random() - 0.5;
    P.set([(px - cxB) * k, -(py - cyB) * k, (Math.random() - 0.5) * 0.4 * NS], i * 3);
    R.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    E[i] = isEdge ? 1 : 0;
    U[i] = (px - Sm.x0) / bw;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(R, 4));
  g.setAttribute('aEdge', new THREE.BufferAttribute(E, 1));
  g.setAttribute('aU', new THREE.BufferAttribute(U, 1));
  const NV =
    `uniform float uTime, uPx, uIn, uOut; const float NS = ` +
    NS.toFixed(3) +
    `;
    float arrive(float u, float r){ float k = clamp((uIn * 1.85 - u * .6 - r * .3) / .95, 0., 1.); return 1. - pow(1. - k, 3.); }
    float sweep(float u){ float s = fract(uTime * .11) * 1.9 - .45; return exp(-pow((u - s) * 6.5, 2.)); }`;
  const pts = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: nameU,
      vertexShader: `
        attribute vec4 aR;
        attribute float aEdge, aU;
        varying vec3 vC;
        varying float vA;
        ${NV}
        void main() {
          float k = arrive(aU, aR.x);
          vec3 from = vec3(position.xy * 2.4 + (aR.yz - .5) * vec2(34., 20.) * NS, (-26. - aR.w * 50.) * NS);
          float sp = (1. - k) * (5. + aR.y * 6.);
          vec3 p = mix(from, position, k);
          p.xy += vec2(cos(sp + aR.z * 6.28), sin(sp + aR.z * 6.28)) * (1. - k) * (1.4 + aR.w * 2.) * NS;
          p += vec3(sin(uTime * .7 + aR.y * 40.), cos(uTime * .55 + aR.z * 40.), 0.) * .006 * NS * (1. + aEdge);
          float o = uOut * uOut;
          p.z += o * (14. + aR.w * 30.) * NS;
          p.xy *= 1. + o * (.5 + aR.y * .8);
          float b = sweep(aU);
          vec3 core = vec3(1.35, 1.1, .82), rim = vec3(1.45, .5, .78), ice = vec3(.9, .95, 1.4);
          vC = mix(core, rim, aEdge * .75 + (1. - aEdge) * aR.z * .25);
          vC = mix(vC, ice, step(.965, aR.w) * .7);
          vC += vec3(1., .95, .9) * b * 1.3;
          vA = k * (1. - o) * (.7 + .3 * sin(uTime * 2.2 + aR.y * 70.)) * (.85 + .3 * aEdge);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.6 + pow(aR.z, 5.) * 3.8 + aEdge * .5) * (1. + b * .7) * (1. + (1. - k) * 2.2) * uPx * (${NAME_Z.toFixed(1)} / -mv.z) * ${mobile ? '1.15' : '1.'};
        }
      `,
      fragmentShader: `
        varying vec3 vC;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          if (d > .5) discard;
          float a = pow(1. - d * 2., 2.) + smoothstep(.18, 0., d) * .9;
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    }),
  );
  pts.renderOrder = 32;
  pts.frustumCulled = false;

  const gt = new THREE.CanvasTexture(Sm.glow);
  gt.minFilter = THREE.LinearFilter;
  nameU.uGlow.value = gt;
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(Sm.CW * k, Sm.CH * k),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: nameU,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
      `,
      fragmentShader: `
        uniform sampler2D uGlow;
        uniform float uTime, uIn, uOut;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(uGlow, vUv);
          float on = smoothstep(.35, 1., uIn) * (1. - uOut);
          float br = .55 + .12 * sin(uTime * 1.3) + .08 * sin(uTime * 3.1 + vUv.x * 6.);
          gl_FragColor = vec4(t.rgb * t.a * on * br * 2.4, t.a * on);
        }
      `,
    }),
  );
  halo.position.set((Sm.CW / 2 - cxB) * k, -(Sm.CH / 2 - cyB) * k, -0.05 * NS);
  halo.renderOrder = 31;
  halo.frustumCulled = false;

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(wW * 1.7, bh * k * 3.2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: nameU,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
      `,
      fragmentShader: `
        uniform float uIn, uOut;
        varying vec2 vUv;
        void main() {
          vec2 q = (vUv - .5) * 2. * vec2(1.25, 1.6);
          float e = exp(-dot(q, q) * 1.6);
          gl_FragColor = vec4(vec3(.012, .004, .016), e * .72 * smoothstep(0., .6, uIn) * (1. - uOut));
        }
      `,
    }),
  );
  veil.position.z = -0.4 * NS;
  veil.renderOrder = 30;
  veil.frustumCulled = false;

  const NA = 16,
    AP = new Float32Array(NA * 3),
    AR = new Float32Array(NA * 2);
  for (let i = 0; i < NA; i++) {
    const j = Math.floor(((i + Math.random() * 0.8) / NA) * (Sm.edge.length / 2)) * 2;
    AP.set([(Sm.edge[j] - cxB) * k, -(Sm.edge[j + 1] - cyB) * k, 0.02 * NS], i * 3);
    AR.set([(Sm.edge[j] - Sm.x0) / bw, Math.random()], i * 2);
  }
  const ag = new THREE.BufferGeometry();
  ag.setAttribute('position', new THREE.BufferAttribute(AP, 3));
  ag.setAttribute('aR', new THREE.BufferAttribute(AR, 2));
  const anchors = new THREE.Points(
    ag,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: nameU,
      vertexShader: `
        attribute vec2 aR;
        varying float vA;
        ${NV}
        void main() {
          float k = arrive(aR.x, aR.y);
          vA = smoothstep(.85, 1., k) * (1. - uOut) * (.55 + .45 * pow(.5 + .5 * sin(uTime * (1.1 + aR.y) + aR.y * 30.), 3.)) * (1. + sweep(aR.x) * 1.5);
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (22. + aR.y * 22.) * uPx * ${mobile ? '.7' : '1.'};
        }
      `,
      fragmentShader: `
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - .5;
          float d = length(c);
          float sp = exp(-abs(c.x) * 90.) * exp(-abs(c.y) * 5.5) + exp(-abs(c.y) * 90.) * exp(-abs(c.x) * 5.5);
          float a = exp(-d * d * 300.) * 1.6 + exp(-d * 16.) * .3 + sp * .8;
          gl_FragColor = vec4(vec3(1.3, 1.1, 1.05) * a * vA, a * vA);
        }
      `,
    }),
  );
  anchors.renderOrder = 33;
  anchors.frustumCulled = false;
  nameG = new THREE.Group();
  nameG.add(veil, halo, pts, anchors);
  nameG.userData.y = (1 - (2 * cy) / H) * halfH;

  const yaw0 = -0.12 * LAY.lookHer;
  nameG.userData.yaw = yaw0;
  nameG.position.set(
    -Math.sin(yaw0) * NAME_Z,
    nameG.userData.y,
    -Math.cos(yaw0) * NAME_Z - groups.intro.userData.rest.z,
  );
  nameG.visible = false;
  groups.intro.add(nameG);
}
