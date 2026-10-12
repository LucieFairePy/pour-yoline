const Portes = (() => {
  const O = V3(700, 80, -700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const wall = new THREE.MeshStandardMaterial({ color: '#2a2433', roughness: 0.7, metalness: 0.2 });
  const floor = new THREE.MeshStandardMaterial({ color: '#3a3444', roughness: 0.8 });
  const panelMat = new THREE.MeshStandardMaterial({
    color: '#f2eef6',
    roughness: 0.35,
    emissive: '#3a3644',
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#7ce0ff',
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.1,
    depthWrite: false,
  });
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  let built = false;
  const panels = [];
  const glass = [];
  const buttons = {};
  const doors = {};
  let bridge = null;
  let card = null;
  let screen = null;
  const portals = {};

  const solid = (x, y, z, sx, sy, sz, mat = wall, opt) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.copy(P(x, y, z));
    group.add(m);
    const b = Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
    return { m, b };
  };

  const glassWall = (x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), glassMat);
    m.position.copy(P(x, y, z));
    group.add(m);
    glass.push(Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, { tag: 'glass' }));
  };

  const panel = (id, x, y, z, n, w, h) => {
    const normal = V3(...n).normalize();
    const geo = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(geo, panelMat);
    const pos = P(x, y, z);
    m.position.copy(pos).addScaledVector(normal, 0.02);
    m.lookAt(m.position.clone().add(normal));
    group.add(m);
    const right =
      Math.abs(normal.y) > 0.9
        ? V3(1, 0, 0)
        : V3()
            .crossVectors(V3(0, 1, 0), normal)
            .normalize();
    const up = V3().crossVectors(normal, right).normalize();
    panels.push({ id, pos, normal, right, up, w, h });
  };

  const button = (id, x, y, z) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.14, 24), wall);
    base.position.copy(P(x, y + 0.07, z));
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.1, 24),
      glow('#ff4f6a', 1.4),
    );
    top.position.copy(P(x, y + 0.18, z));
    group.add(base, top);
    buttons[id] = { pos: P(x, y, z), top };
  };

  const door = (id, x, y, z, sx, sy, sz) => {
    const d = solid(
      x,
      y,
      z,
      sx,
      sy,
      sz,
      new THREE.MeshStandardMaterial({
        color: '#2a1828',
        emissive: '#ff4f6a',
        emissiveIntensity: 0.25,
        metalness: 0.6,
        roughness: 0.3,
      }),
      { dyn: true },
    );
    d.y0 = O.y + y;
    d.off = 0;
    doors[id] = d;
  };

  const portalMesh = (color) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 48), glow(color, 2.6));
    ring.scale.set(1, 1.5, 1);
    const U = { uTime: { value: 0 }, uOpen: { value: 0 }, uCol: { value: new THREE.Color(color) } };
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 48),
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader:
          'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime;
          uniform float uOpen;
          uniform vec3 uCol;
          varying vec2 vUv;
          void main() {
            vec2 c = vUv - 0.5;
            float r = length(c) * 2.0;
            float a = atan(c.y, c.x);
            float sw = sin(a * 4.0 + r * 10.0 - uTime * 4.0) * 0.5 + 0.5;
            vec3 col = mix(uCol * 0.6, vec3(1.0), pow(1.0 - r, 3.0) * uOpen);
            col *= 0.8 + sw * 0.6;
            float alpha = mix(0.35, 0.95, uOpen) * smoothstep(1.0, 0.85, r);
            gl_FragColor = vec4(col * 1.6, alpha);
          }
        `,
      }),
    );
    disc.scale.set(1, 1.5, 1);
    g.add(ring, disc);
    g.visible = false;
    group.add(g);
    return { g, U };
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    solid(0, -0.5, 7, 20, 1, 14, floor);
    solid(-10.3, 3, 7, 0.6, 6, 14);
    solid(10.3, 3, 7, 0.6, 6, 14);
    solid(-5.5, 3, 14.3, 9, 6, 0.6);
    panel('p1', -5.5, 2.4, 14.0, [0, 0, -1], 3, 3.4);
    solid(0, -0.5, 20, 20, 1, 12, floor);
    glassWall(4, 2.5, 20, 0.3, 5, 8);
    solid(10.3, 3, 20, 0.6, 6, 8);
    solid(7, 3, 15.8, 6.6, 6, 0.4);
    solid(7, 3, 24.2, 6.6, 6, 0.4);
    panel('p2', 10.0, 2.4, 20, [-1, 0, 0], 3.2, 3.4);
    button('b1', 7, 0, 20);
    solid(-3, 3, 26.3, 14, 6, 0.6);
    door('d1', 6, 2.5, 26.3, 6, 5, 0.6);
    solid(9.9, 3, 26.3, 1.4, 6, 0.6);
    solid(0, -0.5, 34, 20, 1, 16, floor);
    for (let i = 0; i < 10; i++) solid(8, i * 1.15 + 0.6, 27.5 + i * 0.95, 3, 1.15, 1.1, wall);
    solid(2.5, 11.9, 33.5, 13, 0.6, 7, floor);
    panel('p4', 0, 0.02, 39.5, [0, 1, 0], 6, 5);
    solid(-6, 3, 38.5, 3.4, 6, 1.6);
    panel('p3', -6, 3.2, 39.32, [0, 0, 1], 3.2, 3.6);
    solid(6, 0.9, 41.6, 3, 0.6, 1.2, wall);
    bridge = solid(6, 1.7, 45.5, 3, 0.6, 7, glow('#ffcf8a', 0.9), { dyn: true });
    bridge.b.on = false;
    bridge.m.visible = false;
    solid(0, 1.5, 60, 16, 1, 22, floor);
    button('b2', -4, 2, 58);
    solid(0, 1.5, 88, 30, 1, 34, floor);
    glassWall(-9, 4.5, 88, 0.3, 5, 6);
    solid(-12, 4.5, 85, 6, 5, 0.4);
    solid(-12, 4.5, 91, 6, 5, 0.4);
    solid(-15, 4.5, 88, 0.4, 5, 6);
    panel('p5', -14.78, 4.4, 88, [1, 0, 0], 3, 3.2);
    button('b3a', -12, 2, 88);
    panel('p6', 9, 4.4, 72.0, [0, 0, 1], 3.2, 3.2);
    solid(9, 4.5, 71.7, 4, 5, 0.6);
    [
      [9, 3, 82, 2.4],
      [12, 4.4, 86, 2],
      [9, 6, 90, 2],
    ].forEach(([x, y, z, s]) => solid(x, y, z, s, 0.5, s, wall));
    solid(9, 6.9, 95, 4, 0.6, 4, floor);
    button('b3b', 9, 7.2, 95);
    const ct = (() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 360;
      const g = c.getContext('2d');
      g.fillStyle = '#fff8f0';
      g.fillRect(0, 0, 256, 360);
      g.fillStyle = '#d8324f';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '160px Georgia';
      g.fillText('♦', 128, 190);
      g.font = 'bold 44px Georgia';
      g.fillText('9', 30, 40);
      return new THREE.CanvasTexture(c);
    })();
    card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({ map: ct, side: THREE.DoubleSide, toneMapped: false }),
    );
    card.material.color.setScalar(1.4);
    card.position.copy(P(0, 3.6, 100));
    card.visible = false;
    group.add(card);
    screen = makeScreen(14, 7, 1024);
    screen.mesh.position.copy(P(0, 14, 108));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    portals.a = portalMesh('#4fb4ff');
    portals.b = portalMesh('#ff9a3a');
  };

  const placeOn = (pnl, hit) => {
    const d = V3().subVectors(hit, pnl.pos);
    let u = d.dot(pnl.right);
    let v = d.dot(pnl.up);
    u = clamp(u, -pnl.w / 2 + 0.65, pnl.w / 2 - 0.65);
    v =
      Math.abs(pnl.normal.y) > 0.9
        ? clamp(v, -pnl.h / 2 + 0.95, pnl.h / 2 - 0.95)
        : -pnl.h / 2 + 0.95;
    return pnl.pos.clone().addScaledVector(pnl.right, u).addScaledVector(pnl.up, v);
  };

  return {
    O,
    P,
    build,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    panels,
    buttons,
    rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    spawn(stage, who) {
      const s = who === 'dame' ? -2 : 2;
      if (stage <= 1) return P(s, 0, 3);
      if (stage === 2) return P(s, 0, 30);
      return who === 'dame' ? P(-2, 2, 64) : P(2, 2, 64);
    },
    aim(origin, dir) {
      glass.forEach((g) => (g.on = false));
      const block = Phys.ray(origin, dir, 60);
      glass.forEach((g) => (g.on = true));
      let best = null;
      let bd = Math.min(60, block + 0.2);
      panels.forEach((pn) => {
        const den = dir.dot(pn.normal);
        if (den > -0.05) return;
        const t = pn.pos.clone().sub(origin).dot(pn.normal) / den;
        if (t < 0 || t > bd) return;
        const hit = origin.clone().addScaledVector(dir, t);
        const d = hit.clone().sub(pn.pos);
        if (Math.abs(d.dot(pn.right)) > pn.w / 2 || Math.abs(d.dot(pn.up)) > pn.h / 2) return;
        bd = t;
        best = { panel: pn, pos: placeOn(pn, hit) };
      });
      return best;
    },
    setPortal(which, data) {
      const m = portals[which];
      if (!m) return;
      if (!data) {
        m.g.visible = false;
        return;
      }
      const pn = panels.find((p) => p.id === data.panel);
      m.g.visible = true;
      m.g.position.set(...data.pos).addScaledVector(pn.normal, 0.05);
      m.g.lookAt(m.g.position.clone().add(pn.normal));
    },
    portalData(which, data) {
      if (!data) return null;
      const pn = panels.find((p) => p.id === data.panel);
      return { pos: V3(...data.pos), normal: pn.normal, panel: pn };
    },
    near(q, id, r = 1.4) {
      const b = buttons[id];
      return (
        Math.hypot(q.x - (b.pos.x - O.x), q.z - (b.pos.z - O.z)) < r &&
        Math.abs(q.y - (b.pos.y - O.y)) < 1.2
      );
    },
    update(dt, t, x) {
      if (!built) return;
      screen.update(dt, t);
      Object.entries(buttons).forEach(([id, b]) => {
        const on = x.pressed && x.pressed.includes(id);
        b.top.material.color.set(on ? '#4fd1b5' : '#ff4f6a').multiplyScalar(on ? 2.2 : 1.4);
        b.top.position.y = b.pos.y + (on ? 0.1 : 0.18);
      });
      Object.entries(doors).forEach(([id, d]) => {
        const open = x.open && x.open.includes(id);
        d.off = damp(d.off, open ? 5.5 : 0, 3, dt);
        d.m.position.y = d.y0 + d.off;
        d.b.on = !open;
      });
      bridge.m.visible = bridge.b.on = !!x.bridge;
      ['a', 'b'].forEach((k) => {
        const m = portals[k];
        m.U.uTime.value = t;
        m.U.uOpen.value = damp(
          m.U.uOpen.value,
          x.portals && x.portals.a && x.portals.b ? 1 : 0,
          4,
          dt,
        );
      });
      card.visible = !!x.card;
      card.rotation.y = t * 1.4;
    },
    nearCard: (q) => Math.hypot(q.x, q.z - 100) < 3 && q.y > 1,
  };
})();
