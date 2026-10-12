const Finale = (() => {
  const O = V3(700, 80, 700);
  const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const stone = new THREE.MeshStandardMaterial({ color: '#2a1a2e', roughness: 0.8 });
  const wood = new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.7 });
  let built = false;
  let joker = null;
  let screen = null;
  let queen = null;
  let broken = false;

  const cardTex = (top, mid, fg, bg) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 360;
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 360);
    g.strokeStyle = fg;
    g.lineWidth = 6;
    g.strokeRect(12, 12, 232, 336);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 44px Georgia';
    g.fillText(top, 40, 44);
    g.font = '150px Georgia';
    g.fillText(mid, 128, 190);
    return new THREE.CanvasTexture(c);
  };

  const build = () => {
    if (built) return;
    built = true;
    group.visible = true;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(17, 15, 2, 48), stone);
    floor.position.copy(P(0, -1, 0));
    group.add(floor);
    Phys.box(O.x, O.y - 1, O.z, 24, 2, 24);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16.8, 0.08, 6, 96).rotateX(Math.PI / 2),
      glow('#ff5f8a', 1.6),
    );
    ring.position.copy(P(0, 0.02, 0));
    group.add(ring);
    const heart = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 2.8, 64).rotateX(-Math.PI / 2),
      glow('#ff5f8a', 1.4),
    );
    heart.position.copy(P(0, 0.03, 0));
    group.add(heart);
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
      Phys.box(O.x + x, O.y + 0.4, O.z + z, 1.2, 0.8, 1.2);
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 4.5, 6).translate(0, 2.25, 0),
        stone,
      );
      pole.position.copy(P(Math.cos(a) * 15, 0, Math.sin(a) * 15));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glow('#ffb070', 2.2));
      b.position.copy(P(Math.cos(a) * 15, 4.6, Math.sin(a) * 15));
      group.add(pole, b);
    }
    queen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 5),
      new THREE.MeshBasicMaterial({
        map: cardTex('D', '♥', '#d8324f', '#fff8f0'),
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
        map: cardTex('J', '🃏', '#ff2a3a', '#120208'),
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
      }),
    );
    joker.material.color.setScalar(1.6);
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
    spawn: (who) => P(who === 'dame' ? -3 : 3, 0, -11),
    breakJoker() {
      if (broken || !joker) return;
      broken = true;
      Fx.shatter(joker.position.clone());
      Sound.play('shatter');
      joker.visible = false;
    },
    update(dt, t, step) {
      if (!built) return;
      screen.update(dt, t);
      if (joker && joker.visible) {
        joker.rotation.y = t * 1.8;
        joker.position.y = O.y + 3 + Math.sin(t * 2.3) * 0.25;
        joker.material.opacity = 0.75 + Math.random() * 0.25;
        if (Math.random() < dt * 6) Fx.burst(joker.position.clone(), '#ff2a3a', 6, 3, 0.8, 0);
      }
      const lit = step === 'joker' ? 0.25 : 1.5 + Math.sin(t * 2) * 0.2;
      queen.material.color.setScalar(damp(queen.material.color.r, lit, 2, dt));
    },
  };
})();
