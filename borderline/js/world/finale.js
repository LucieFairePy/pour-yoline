const Finale = (() => {
  const O = V3(700, 80, 700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const stone = Tex.mat('marble', { color: '#433848', scale: 7, rough: 0.9 });
  const poleMat = Tex.mat('stone', { color: '#6a5a6e', scale: 1.5 });
  const wood = Tex.mat('wood', { color: '#a87850', scale: 1.5 });
  // radius of the meeting circle at the centre, shared with the level logic
  const RING = 3.8;
  let built = false;
  let joker = null;
  let screen = null;
  let queen = null;
  let broken = false;
  let heart = null;
  let column = null;
  let sky = null;

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(17, 15, 2, 48), stone);
    floor.position.copy(P(0, -1, 0));
    group.add(floor);
    // the round floor (radius 17) as a union of boxes: walkable right up to its edge
    [
      [33.2, 7.2],
      [31.2, 13.6],
      [28, 19.2],
      [24, 24],
    ].forEach(([a, b]) => {
      Phys.box(O.x, O.y - 1, O.z, a, 2, b);
      Phys.box(O.x, O.y - 1, O.z, b, 2, a);
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16.8, 0.08, 6, 96).rotateX(Math.PI / 2),
      glow('#ff5f8a', 1.6),
    );
    ring.position.copy(P(0, 0.02, 0));
    group.add(ring);
    // the Oui itself, hanging over the place where you met: the voyage heart-galaxy
    sky = Heart.galaxy(36000, 4, 11);
    sky.group.position.copy(P(0, 34, 95));
    sky.group.lookAt(P(0, 6, -12));
    sky.U.uForm.value = 0.72;
    group.add(sky.group);
    // the meeting circle is drawn as the voyage heart, outline only
    const heartShape = (k) => {
      const sh = new THREE.Shape();
      for (let i = 0; i <= 120; i++) {
        const [x, y] = Heart.curve((i / 120) * Math.PI * 2);
        if (i) sh.lineTo(x * k, (y - 2.5) * k);
        else sh.moveTo(x * k, (y - 2.5) * k);
      }
      return sh;
    };
    const outer = heartShape(0.27);
    outer.holes.push(new THREE.Path(heartShape(0.255).getPoints(120).reverse()));
    heart = new THREE.Mesh(
      new THREE.ShapeGeometry(outer, 120).rotateX(-Math.PI / 2),
      glow('#ff5f8a', 1),
    );
    heart.position.copy(P(0, 0.03, 0));
    group.add(heart);
    // light column that rises while the two of you stand in the circle
    column = new THREE.Mesh(
      new THREE.CylinderGeometry(RING, RING, 8, 48, 1, true).translate(0, 4, 0),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff7aa0').multiplyScalar(1.4),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    column.position.copy(P(0, 0, 0));
    group.add(column);
    [
      [-8, 6],
      [-5, 9],
      [8, 6],
    ].forEach(([x, z]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16), wood);
      t.position.copy(P(x, 0.75, z));
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6).translate(0, 0.375, 0),
        wood,
      );
      leg.position.copy(P(x, 0, z));
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.1, 8),
        glow('#fbefe6', 0.9),
      );
      cup.position.copy(P(x + 0.2, 0.83, z));
      group.add(t, leg, cup);
      for (const s of [-1, 1]) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), wood);
        ch.position.copy(P(x + s * 0.9, 0.45, z));
        group.add(ch);
      }
      Phys.box(O.x + x, O.y + 0.4, O.z + z, 2.3, 0.8, 1.2);
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 4.5, 6).translate(0, 2.25, 0),
        poleMat,
      );
      pole.position.copy(P(Math.cos(a) * 15, 0, Math.sin(a) * 15));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glow('#ffb070', 2.2));
      b.position.copy(P(Math.cos(a) * 15, 4.6, Math.sin(a) * 15));
      group.add(pole, b);
      Phys.box(O.x + Math.cos(a) * 15, O.y + 2.25, O.z + Math.sin(a) * 15, 0.25, 4.5, 0.25);
    }
    queen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 5),
      new THREE.MeshBasicMaterial({
        map: Tex.card('D', '♥'),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    queen.material.color.setScalar(0.25);
    queen.position.copy(P(0, 4, 13));
    queen.rotation.y = Math.PI;
    group.add(queen);
    joker = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.5),
      new THREE.MeshBasicMaterial({
        map: Tex.card('J', ''),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
      }),
    );
    joker.material.color.setScalar(1.15);
    joker.position.copy(P(0, 3, 0));
    group.add(joker);
    screen = makeScreen(14, 7, 1024);
    screen.mesh.position.copy(P(0, 11, 16));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
  };

  return {
    O,
    P,
    build,
    get screen() {
      return screen;
    },
    get built() {
      return built;
    },
    center: () => P(0, 0, 0),
    RING,
    inRing: (p) => Math.hypot(p.x - O.x, p.z - O.z) < RING + 0.4 && Math.abs(p.y - O.y) < 3,
    spawn: (who) => P(who === 'dame' ? -3 : 3, 0, -11),
    breakJoker() {
      if (broken || !joker) return;
      broken = true;
      Fx.shatter(joker.position.clone());
      Sound.play('shatter');
      joker.visible = false;
    },
    update(dt, t, step, inside = 0) {
      if (!built) return;
      screen.update(dt, t);
      // the circle lights up with each player standing in it
      const want = step === 'joker' ? [0.8, 1.8, 3.2][inside] : 1.2;
      const pulse = inside === 2 ? Math.sin(t * 9) * 0.4 : 0;
      const k = damp(heart.userData.k || 0.8, want + pulse, 6, dt);
      heart.userData.k = k;
      heart.material.color.set('#ff5f8a').multiplyScalar(k);
      column.material.opacity = damp(
        column.material.opacity,
        step === 'joker' && inside === 2 ? 0.28 : 0,
        4,
        dt,
      );
      if (joker && joker.visible) {
        joker.rotation.y = t * 1.8;
        joker.position.y = O.y + 3 + Math.sin(t * 2.3) * 0.25;
        joker.material.opacity = 0.75 + Math.random() * 0.25;
        if (Math.random() < dt * 6) Fx.burst(joker.position.clone(), '#ff2a3a', 6, 3, 0.8, 0);
      }
      const U = sky.U;
      U.uTime.value = t;
      U.uPx.value = R.renderer.getPixelRatio() * 1.2;
      U.uForm.value = damp(U.uForm.value, step === 'joker' ? 0.72 + inside * 0.08 : 1, 0.6, dt);
      U.uRed.value = damp(U.uRed.value, step === 'joker' ? 0.5 : 0, 1, dt);
      U.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.4)), 10) * (step === 'joker' ? 0.2 : 0.8);
      const lit = step === 'joker' ? 0.25 : 1.5 + Math.sin(t * 2) * 0.2;
      queen.material.color.setScalar(damp(queen.material.color.r, lit, 2, dt));
    },
  };
})();
