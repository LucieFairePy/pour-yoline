// Held weapons. Whoever carries the Dame kit in a chapter gets the rifle, the Valet kit
// gets the sword, so both players use both weapons over the game.
const Weapons = (() => {
  const metal = new THREE.MeshStandardMaterial({
    color: '#3a3942',
    roughness: 0.4,
    metalness: 0.45,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: '#7a3f1d',
    roughness: 0.6,
    metalness: 0.05,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: '#e9eef8',
    roughness: 0.22,
    metalness: 0.35,
    emissive: '#5a7a9a',
    emissiveIntensity: 0.35,
  });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: '#2a1a1e', roughness: 0.8 });
  const neon = (c) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(c).multiplyScalar(2.2),
      toneMapped: false,
    });

  const box = (g, mat, sx, sy, sz, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  const cyl = (g, mat, r0, r1, len, x, y, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 12).rotateX(Math.PI / 2), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // AK-style rifle, grip at the origin, barrel along +z
  const rifle = () => {
    const g = new THREE.Group();
    box(g, metal, 0.05, 0.075, 0.34, 0, 0.045, 0.1);
    box(g, metal, 0.044, 0.02, 0.3, 0, 0.09, 0.1);
    box(g, wood, 0.034, 0.1, 0.045, 0, -0.03, -0.01, 0.35);
    box(g, wood, 0.045, 0.06, 0.26, 0, 0.03, -0.18, -0.12);
    box(g, wood, 0.048, 0.09, 0.05, 0, 0.0, -0.31, -0.12);
    box(g, wood, 0.054, 0.055, 0.17, 0, 0.04, 0.33);
    cyl(g, metal, 0.011, 0.011, 0.32, 0, 0.06, 0.55);
    cyl(g, metal, 0.016, 0.016, 0.06, 0, 0.06, 0.72);
    box(g, metal, 0.01, 0.045, 0.012, 0, 0.09, 0.66);
    cyl(g, metal, 0.008, 0.008, 0.2, 0, 0.1, 0.4);
    // curved magazine
    for (let i = 0; i < 4; i++)
      box(g, metal, 0.036, 0.06, 0.05, 0, -0.01 - i * 0.048, 0.15 + i * 0.022, 0.32 + i * 0.12);
    box(g, neon('#ff5f8a'), 0.052, 0.006, 0.2, 0, 0.083, 0.1);
    const flash = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.22, 8).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffcf8a').multiplyScalar(3),
        toneMapped: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flash.position.set(0, 0.06, 0.86);
    flash.visible = false;
    g.add(flash);
    g.userData.flash = flash;
    return g;
  };

  // longsword, grip at the origin, blade along +y
  const sword = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.2, 12), leather));
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), gold);
    pommel.position.y = -0.11;
    g.add(pommel);
    box(g, gold, 0.24, 0.026, 0.04, 0, 0.11, 0);
    const blade = new THREE.Shape();
    blade.moveTo(-0.04, 0);
    blade.lineTo(0.04, 0);
    blade.lineTo(0.032, 0.78);
    blade.lineTo(0, 0.9);
    blade.lineTo(-0.032, 0.78);
    blade.closePath();
    const bg = new THREE.ExtrudeGeometry(blade, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.006,
      bevelSegments: 1,
    }).translate(0, 0.12, -0.004);
    g.add(new THREE.Mesh(bg, steel));
    box(g, neon('#6cc8ff'), 0.012, 0.72, 0.02, 0, 0.5, 0);
    return g;
  };

  const attach = (avatar) => {
    const models = { rifle: rifle(), sword: sword() };
    const holder = new THREE.Group();
    Object.values(models).forEach((m) => {
      m.visible = false;
      holder.add(m);
    });
    avatar.spin.add(holder);
    const hv = V3();
    let kind = null;
    let flashT = 0;
    let aimK = 0;
    return {
      fire() {
        flashT = 0.05;
      },
      // world position of the rifle muzzle (tracers start there)
      muzzle(out) {
        if (kind !== 'rifle') return avatar.hand(out);
        avatar.root.updateMatrixWorld(true);
        return models.rifle.userData.flash.getWorldPosition(out);
      },
      update(dt, k, swing, aim) {
        if (k !== kind) {
          kind = k;
          models.rifle.visible = k === 'rifle';
          models.sword.visible = k === 'sword';
        }
        holder.visible = !!k && avatar.root.visible;
        if (!k) return;
        avatar.root.updateMatrixWorld(true);
        avatar.hand(hv);
        avatar.spin.worldToLocal(hv);
        holder.position.copy(hv);
        if (k === 'rifle') {
          aimK = damp(aimK, aim ? 1 : 0, 16, dt);
          holder.rotation.set(lerp(0.5, 0, aimK), lerp(0.5, 0.05, aimK), lerp(-0.3, 0, aimK));
          flashT -= dt;
          const f = models.rifle.userData.flash;
          f.visible = flashT > 0;
          if (f.visible) f.rotation.z = Math.random() * 6;
        } else {
          // rest: blade raised forward; swing: arc down and across
          const s = clamp(swing / 0.25, 0, 1);
          const e = Math.sin(s * Math.PI);
          holder.rotation.set(lerp(0.55, 1.9, e), lerp(0.2, -0.9, e), lerp(-0.25, 0.4, e));
        }
      },
    };
  };

  return { attach };
})();
