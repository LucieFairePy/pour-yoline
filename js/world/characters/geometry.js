const sph = (r, ws = 64, hs = 48) => new THREE.SphereGeometry(r, ws, hs);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 40, 1);

const limbGeo = (() => {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const y = -0.5 + i / 128,
      a = Math.abs(y);
    let r = 1 + 0.07 * Math.cos(y * Math.PI) - 0.05 * (y + 0.5);
    if (a > 0.3)
      r +=
        0.09 *
        Math.pow(Math.max(0, Math.sin((a - 0.3) * Math.PI * 22)), 1.5) *
        Math.min(1, (a - 0.3) * 9);
    if (a > 0.47) r *= 1 - (a - 0.47) * 6;
    pts.push(new THREE.Vector2(r, y));
  }

  const g = new THREE.LatheGeometry(pts, 72),
    pp = g.attributes.position,
    v = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) {
    v.fromBufferAttribute(pp, i);
    const a = Math.atan2(v.z, v.x),
      y = v.y,
      m = Math.max(0, 1 - Math.abs(y) / 0.3);
    const k =
      1 +
      m *
        m *
        (0.028 * Math.sin(y * 34 + 2.4 * Math.sin(a * 2 + y * 7)) +
          0.018 * Math.sin(y * 61 - a * 3 + 1.3) +
          0.012 * Math.cos(a * 5 + y * 20));
    pp.setXYZ(i, v.x * k, y, v.z * k);
  }
  g.computeVertexNormals();
  return g;
})();
function limb(mesh, a, b, r) {
  const d = new THREE.Vector3().subVectors(b, a),
    L = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  mesh.scale.set(r, L, r);
}
const roundBox = (w, h, d, r) => {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - r,
    bevelEnabled: true,
    bevelThickness: r / 2,
    bevelSize: r / 2,
    bevelSegments: 6,
    curveSegments: 10,
  });
  g.translate(0, 0, -(d - r) / 2);
  return g;
};
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
};
const heartPath = (x, cx, cy, s) => {
  x.beginPath();
  x.moveTo(cx, cy + s * 0.35);
  x.bezierCurveTo(cx - s * 0.9, cy - s * 0.2, cx - s * 0.5, cy - s * 0.85, cx, cy - s * 0.35);
  x.bezierCurveTo(cx + s * 0.5, cy - s * 0.85, cx + s * 0.9, cy - s * 0.2, cx, cy + s * 0.35);
};
