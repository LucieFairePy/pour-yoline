const Portes = (() => {
  const O = V3(700, 80, -700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  // test-chamber look: cool concrete walls, tiled floors, metal steps, white portal panels
  const wall = Tex.mat('concrete', { color: '#5c6068', scale: 3 });
  const floor = Tex.mat('pavement', { color: '#50545c', scale: 4 });
  const steel = Tex.mat('metal', { color: '#7a808a', scale: 2, metal: 0.5, rough: 0.9 });
  const panelMat = Tex.mat('plaster', {
    color: '#ffffff',
    scale: 2,
    rough: 0.6,
    emissive: '#4a4654',
    bump: 0.3,
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
  let bridgeStep = null;
  let card = null;
  let screen = null;
  const portals = {};
  const pdCache = {};
  let ledgeTop = 0;

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
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.14, 24), steel);
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
    // room 3 side walls, so nobody walks off into the void
    solid(-10.3, 3, 34.3, 0.6, 6, 15.4);
    solid(10.3, 3, 34.3, 0.6, 6, 15.4);
    // switchback staircase up to the ledge (0.42 m steps: walkable without jumping)
    const RISE = 0.42;
    const TREAD = 0.8;
    for (let i = 0; i < 11; i++) {
      const top = RISE * (i + 1);
      solid(-8.5, top / 2, 28.4 + i * TREAD + TREAD / 2, 2.8, top, TREAD, steel);
    }
    const land = RISE * 11;
    solid(-7.1, land / 2, 38.7, 5.6, land, 3, steel);
    for (let j = 0; j < 11; j++) {
      const top = land + RISE * (j + 1);
      solid(-5.7, top / 2, 37.2 - j * TREAD - TREAD / 2, 2.8, top, TREAD, steel);
    }
    // glass guard round the landing: nobody leaps from halfway up the stairs over the void
    glassWall(-7.1, land + 2, 40.25, 5.6, 4, 0.1);
    glassWall(-4.25, land + 2, 38.7, 0.1, 4, 3);
    const ledge = land + RISE * 11;
    solid(-1.15, ledge - 0.3, 29.3, 6.3, 0.6, 3.4, floor);
    ledgeTop = ledge;
    // railings at the back and on the far side; the front edge is where you drop
    solid(-1.15, ledge + 0.5, 27.7, 6.3, 1, 0.2, steel);
    solid(2.1, ledge + 0.5, 29.3, 0.2, 1, 3.4, steel);
    // floor panel right below the ledge edge: fall into it
    panel('p4', -0.5, 0.02, 34, [0, 1, 0], 6, 5);
    solid(2, 3, 38.5, 3.4, 6, 1.6);
    panel('p3', 2, 3.2, 39.32, [0, 0, 1], 3.2, 3.6);
    // the void is 10 m wide: too far to jump, only the portal flight crosses it. The bridge (and
    // its first step) light up once the button on the far side is pressed.
    bridge = solid(6, 1.7, 47.1, 3, 0.6, 9.8, glow('#ffcf8a', 0.9), { dyn: true });
    bridge.b.on = false;
    bridge.m.visible = false;
    bridgeStep = solid(6, 0.9, 41.6, 3, 0.6, 1.2, glow('#ffcf8a', 0.7), { dyn: true });
    bridgeStep.b.on = false;
    bridgeStep.m.visible = false;
    solid(0, 1.5, 61.5, 16, 1, 19, floor);
    solid(-8.15, 2.6, 61.5, 0.3, 1.2, 19, steel);
    solid(8.15, 2.6, 61.5, 0.3, 1.2, 19, steel);
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
    card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({
        map: Cards.texOf(Cards.cardOf('d9')),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    card.material.color.setScalar(0.8);
    card.position.copy(P(0, 3.6, 100));
    card.visible = false;
    group.add(card);
    screen = makeScreen(14, 7, 1024);
    screen.mesh.position.copy(P(0, 14, 108));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    portals.a = portalMesh('#4fb4ff');
    portals.b = portalMesh('#ff9a3a');
    dress();
  };

  // ---------- set dressing: no colliders, off the walk lanes, away from the portal panels ----------
  const amb = { haze: new THREE.Color('#1e262f'), sky: null, dust: null };
  const lamps = [];
  const dress = () => {
    const B = LvKit.batch;
    const box = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
    const cool = B();
    const warm = B();
    const iron = B();
    const under = B();
    // light strips: cool along the wall tops, the portal orange along the wall feet
    const strip = (x, z, len, alongZ, side) => {
      const ix = alongZ ? x - side * 0.31 : x;
      const iz = alongZ ? z : z - side * 0.31;
      cool.add(alongZ ? box(0.05, 0.1, len) : box(len, 0.1, 0.05), P(ix, 5.6, iz));
      warm.add(alongZ ? box(0.05, 0.05, len) : box(len, 0.05, 0.05), P(ix, 0.05, iz));
    };
    strip(-10.3, 7, 13.6, true, -1);
    strip(10.3, 7, 13.6, true, 1);
    strip(-10.3, 34.3, 15, true, -1);
    strip(10.3, 34.3, 15, true, 1);
    strip(-5.5, 14.3, 8.6, false, 1);
    strip(-3, 26.3, 13.6, false, 1);
    // overhead gantries with light tubes over rooms 1 and 2 (room 3 stays open above its ledge)
    [3.5, 10.5, 18, 23].forEach((z) => {
      iron.add(box(21.2, 0.34, 0.5), P(0, 6.75, z));
      iron.add(box(0.5, 0.9, 0.5), P(-10.3, 6.35, z));
      iron.add(box(0.5, 0.9, 0.5), P(10.3, 6.35, z));
      cool.add(box(16, 0.06, 0.16), P(0, 6.55, z));
    });
    // floodlight heads on room 3's wall tops, tilted inward
    [29, 35, 41].forEach((z) =>
      [-1, 1].forEach((s) => {
        iron.add(box(0.9, 0.5, 0.7), P(s * 10.1, 6.35, z), [0, 0, s * 0.5]);
        cool.add(box(0.06, 0.36, 0.5), P(s * 9.66, 6.2, z), [0, 0, s * 0.5]);
      }),
    );
    // the slabs stand on columns going down into the void, tied by cross beams
    const col = box(1.3, 44, 1.3);
    [
      [-9, 1], [9, 1], [-9, 13], [9, 13], [-9, 25], [9, 25], [-9, 33], [9, 33], [-9, 41], [9, 41],
    ].forEach(([x, z]) => under.add(col, P(x, -23, z)));
    [
      [-7, 54], [7, 54], [-7, 68], [7, 68], [-14, 73], [14, 73], [-14, 88], [14, 88], [-14, 103],
      [14, 103], [0, 103],
    ].forEach(([x, z]) => under.add(col, P(x, -21, z)));
    // light masts rising from below, just outside the open floors of rooms 4 and 5
    [
      [-9.6, 56, 1], [9.6, 66, 1], [-16.6, 78, 1], [16.6, 78, 1], [-16.6, 98, 1], [16.6, 98, 1],
    ].forEach(([x, z]) => {
      const s = Math.sign(x);
      iron.add(box(0.36, 32, 0.36), P(x, -6, z));
      iron.add(box(1.6, 0.22, 0.3), P(x - s * 0.7, 10, z));
      iron.add(box(0.7, 0.3, 0.9), P(x - s * 1.4, 9.85, z));
      cool.add(box(0.5, 0.05, 0.7), P(x - s * 1.4, 9.68, z));
    });
    // inset floor light lines along room 5's open sides, and the goal's ring
    [-14.3, 14.3].forEach((x) => cool.add(box(0.12, 0.02, 32), P(x, 2.005, 88)));
    cool.add(box(28, 0.02, 0.12), P(0, 2.005, 104.3));
    [7, 20, 34].forEach((z) => under.add(box(19, 0.8, 0.8), P(0, -1.6, z)));
    [61, 80, 96].forEach((z) => under.add(box(z > 70 ? 29 : 15, 0.8, 0.8), P(0, 0.4, z)));
    group.add(
      cool.mesh(LvKit.glow('#cfe8ff', 1.5)),
      warm.mesh(LvKit.glow('#ff8a2a', 1.15)),
      iron.mesh(steel),
      under.mesh(wall),
    );

    // the facility around: far towers with panel seams and a few lit windows
    const towerTex = LvKit.tex(256, 1024, (g, w, h) => {
      LvKit.grain(g, w, h, '#3a3f48', 0.08, 6000);
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.lineWidth = 2;
      for (let y = 0; y < h; y += 32) g.strokeRect(-4, y, w + 8, 32);
      for (let x = 0; x < w; x += 64) g.strokeRect(x, -4, 64, h + 8);
    });
    const towerLit = LvKit.tex(256, 1024, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      const r = rng(31);
      for (let y = 8; y < h; y += 32)
        for (let x = 8; x < w; x += 64)
          if (r() < 0.16) {
            g.fillStyle = r() < 0.75 ? '#bfdcff' : '#ffb070';
            g.fillRect(x, y + 10, 48, 6);
          }
    });
    const towers = B();
    const r = rng(907);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + r() * 0.15;
      const rad = 140 + r() * 90;
      const h = 90 + r() * 120;
      const w = 10 + r() * 12;
      towers.add(
        box(w, h, w * (0.6 + r() * 0.8)),
        P(Math.cos(a) * rad, h / 2 - 110 + r() * 30, 50 + Math.sin(a) * rad),
        [0, r() * TAU, 0],
      );
    }
    group.add(
      towers.mesh(
        new THREE.MeshStandardMaterial({
          map: towerTex,
          emissiveMap: towerLit,
          emissive: '#ffffff',
          emissiveIntensity: 1.3,
          roughness: 0.9,
          metalness: 0.2,
        }),
      ),
    );

    // painted floor marks: hazard stripes along the edges over the void, room numbers
    const hazTex = LvKit.tex(512, 64, (g, w, h) => {
      g.fillStyle = '#e8b830';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#16161a';
      for (let x = -h; x < w + h; x += 48) {
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 24, h);
        g.lineTo(x + 24 + h, 0);
        g.lineTo(x + h, 0);
        g.closePath();
        g.fill();
      }
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(90,90,96,${Math.random() * 0.5})`;
        g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3);
      }
    });
    const decal = (map, opt = {}) =>
      new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        roughness: 0.8,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        ...opt,
      });
    const haz = B();
    const hz = (x, y, z, len, alongZ) => {
      const g = new THREE.PlaneGeometry(len, 0.5).rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (len / 4));
      haz.add(g, P(x, y + 0.012, z), [0, alongZ ? Math.PI / 2 : 0, 0]);
    };
    hz(0, 0, 0.35, 20, false);
    hz(0, 0, 41.65, 20, false);
    hz(0, 2, 52.35, 16, false);
    hz(-11.5, 2, 71.35, 7, false);
    hz(11.5, 2, 71.35, 7, false);
    hz(0, 2, 104.65, 30, false);
    hz(-14.65, 2, 88, 34, true);
    hz(14.65, 2, 88, 34, true);
    hz(-1.15, ledgeTop, 30.75, 6.3, false);
    group.add(haz.mesh(decal(hazTex)));
    const num = (n, x, y, z) => {
      const t = LvKit.tex(256, 256, (g) => {
        g.fillStyle = 'rgba(236,240,246,0.85)';
        g.font = 'bold 150px "Courier New", monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(n, 128, 140);
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 1400; i++)
          g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2);
      });
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2).rotateY(Math.PI),
        decal(t, { opacity: 0.8 }),
      );
      m.position.copy(P(x, y + 0.014, z));
      group.add(m);
    };
    num('01', -6.5, 0, 3.2);
    num('02', -6, 0, 17);
    num('03', 4, 0, 29.5);
    num('04', -4, 2, 55);
    num('05', 5, 2, 75);
    // the goal: a painted target, half blue half orange, round the card's spot
    const tgt = LvKit.tex(512, 512, (g) => {
      [
        ['rgba(60,150,255,0.75)', Math.PI / 2, (Math.PI * 3) / 2],
        ['rgba(255,140,50,0.75)', -Math.PI / 2, Math.PI / 2],
      ].forEach(([c, a0, a1]) => {
        g.strokeStyle = c;
        g.lineWidth = 22;
        g.beginPath();
        g.arc(256, 256, 220, a0, a1);
        g.stroke();
        g.lineWidth = 8;
        g.beginPath();
        g.arc(256, 256, 160, a0, a1);
        g.stroke();
      });
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 2500; i++) g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    });
    const goal = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), decal(tgt));
    goal.position.copy(P(0, 2.016, 100));
    group.add(goal);
    // chamber signs on the walls: number, a figure, the two portal colours
    const sign = (n, x, z, ry) => {
      const t = LvKit.tex(512, 320, (g, w) => {
        g.fillStyle = '#e9ecef';
        g.fillRect(0, 0, w, 320);
        g.fillStyle = '#1c2026';
        g.font = 'bold 120px "Courier New", monospace';
        g.textBaseline = 'top';
        g.fillText(n, 28, 24);
        g.fillRect(28, 160, w - 56, 6);
        g.font = 'bold 30px "Courier New", monospace';
        g.fillText('CHAMBRE D’ESSAI', 28, 184);
        [
          ['#2f8fff', 60],
          ['#ff8a2a', 140],
        ].forEach(([c, cx]) => {
          g.strokeStyle = c;
          g.lineWidth = 12;
          g.beginPath();
          g.ellipse(cx, 270, 22, 30, 0, 0, TAU);
          g.stroke();
        });
        g.beginPath();
        g.arc(300, 222, 16, 0, TAU);
        g.fill();
        g.fillRect(288, 242, 24, 52);
      });
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.375),
        new THREE.MeshStandardMaterial({
          map: t,
          roughness: 0.6,
          emissive: '#ffffff',
          emissiveMap: t,
          emissiveIntensity: 0.12,
        }),
      );
      m.position.copy(P(x, 3.6, z));
      m.rotation.y = ry;
      group.add(m);
    };
    sign('01', -9.98, 5, Math.PI / 2);
    sign('03', 9.98, 31, -Math.PI / 2);
    // real lights, cool white, one per room (no shadows); a warm one over the void
    [
      [0, 5.2, 7, 22],
      [-3, 5.2, 20, 18],
      [0, 7, 34, 24],
      [0, 7, 61, 22],
      [0, 8, 88, 30],
    ].forEach(([x, y, z, d]) => lamps.push(LvKit.light(group, P(x, y, z), '#e4f0ff', 1.0, d)));
    lamps.push(LvKit.light(group, P(6, 3, 47), '#ffb070', 0, 14));
    amb.sky = LvKit.sky({
      hor: '#26303b',
      zen: '#06080c',
      cloud: '#3c4654',
      cloudK: 0.45,
      stars: 0.35,
      glow: '#3a200c',
      glowDir: V3(0.6, 0, 1),
    });
    amb.dust = LvKit.motes({
      n: 500,
      size: 1.6,
      colors: ['#dfeaff', '#ffd2a8'],
      rise: [-0.05, 0.12],
      box: [40, 14],
      alpha: 0.35,
      seed: 41,
    });
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
      // cached per placement: this runs every frame
      const c = pdCache[which];
      if (c && c.src === data) return c;
      const pn = panels.find((p) => p.id === data.panel);
      return (pdCache[which] = { src: data, pos: V3(...data.pos), normal: pn.normal, panel: pn });
    },
    near(q, id, r = 1.4) {
      const b = buttons[id];
      return (
        Math.hypot(q.x - (b.pos.x - O.x), q.z - (b.pos.z - O.z)) < r &&
        Math.abs(q.y - (b.pos.y - O.y)) < 1.2
      );
    },
    // the chamber's own light and sky while it is played (restored by mood(false))
    mood(on) {
      if (!on || !built) return LvKit.mood(null);
      LvKit.mood({
        sky: '#cfdcec',
        ground: '#2c2f36',
        hemi: 0.42,
        sun: '#fff1e0',
        sunI: 0.7,
        exposure: 1.2,
        haze: amb.haze,
        extras: [amb.sky, amb.dust],
      });
    },
    update(dt, t, x) {
      if (!built) return;
      screen.update(dt, t);
      LvKit.tick(t);
      // the light over the void warms up with the bridge
      lamps[5].intensity = damp(lamps[5].intensity, x.bridge ? 1.6 : 0, 2, dt);
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
      bridgeStep.m.visible = bridgeStep.b.on = !!x.bridge;
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
    // the glass cages are only reachable through portals: whoever is inside when the
    // portals move on is brought back out
    inCage: (q) =>
      (q.x > 4 && q.x < 10.3 && q.z > 15.8 && q.z < 24.2 && q.y < 4) ||
      (q.x < -9 && q.x > -15 && q.z > 85 && q.z < 91 && q.y < 6),
    nearCard: (q) => Math.hypot(q.x, q.z - 100) < 3 && q.y > 1,
  };
})();
