const Avatar = (() => {
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,.6)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const LOOK = {
    dame: { suit: '#2fae8f', glow: '#ff5f8a' },
    valet: { suit: '#3553c9', glow: '#6cc8ff' },
  };

  const white = new THREE.MeshStandardMaterial({
    color: '#ece6f0',
    roughness: 0.45,
    metalness: 0.05,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2230', roughness: 0.5, metalness: 0.6 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: '#3a2412',
    emissive: '#2a1206',
    roughness: 0.12,
    metalness: 0.85,
  });

  const seg = (len, r0, r1, mat) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r0, r1, len, 10).translate(0, -len / 2, 0),
      mat,
    );
    const j = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.05, 10, 8), mat);
    pivot.add(m, j);
    const end = new THREE.Group();
    end.position.y = -len;
    pivot.add(end);
    pivot.userData.end = end;
    return pivot;
  };

  const build = (role) => {
    const L = LOOK[role];
    const suit = new THREE.MeshStandardMaterial({ color: L.suit, roughness: 0.8, metalness: 0 });
    const glow = new THREE.MeshBasicMaterial({
      color: new THREE.Color(L.glow).multiplyScalar(2),
      toneMapped: false,
    });

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const hips = new THREE.Group();
    hips.position.y = 0.92;
    body.add(hips);
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), suit);
    pelvis.scale.set(1.25, 0.8, 1);
    hips.add(pelvis);

    const legs = [-1, 1].map((s) => {
      const thigh = seg(0.43, 0.11, 0.095, suit);
      thigh.position.set(s * 0.12, -0.04, 0);
      const shin = seg(0.42, 0.095, 0.085, suit);
      thigh.userData.end.add(shin);
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.12, 0.28).translate(0, -0.03, 0.05),
        white,
      );
      shin.userData.end.add(boot);
      hips.add(thigh);
      return { thigh, shin };
    });

    const torso = new THREE.Group();
    torso.position.y = 0.95;
    body.add(torso);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), suit);
    chest.scale.set(1.05, 1.15, 0.85);
    chest.position.y = 0.28;
    torso.add(chest);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), white);
    panel.position.set(0, 0.32, 0.25);
    torso.add(panel);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), glow);
    led.position.set(0.05, 0.33, 0.275);
    torso.add(led);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.2), white);
    pack.position.set(0, 0.32, -0.3);
    torso.add(pack);
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.02), glow);
    vent.position.set(0, 0.12, -0.41);
    torso.add(vent);

    const head = new THREE.Group();
    head.position.y = 0.6;
    torso.add(head);
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.035, 8, 24).rotateX(Math.PI / 2),
      white,
    );
    head.add(collar);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.012, 6, 32).rotateX(Math.PI / 2),
      glow,
    );
    ring.position.y = 0.03;
    head.add(ring);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), white);
    helmet.position.y = 0.22;
    head.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.235,
        20,
        14,
        -Math.PI * 0.42,
        Math.PI * 0.84,
        Math.PI * 0.22,
        Math.PI * 0.46,
      ),
      visorMat,
    );
    visor.position.set(0, 0.22, 0.05);
    head.add(visor);
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4).translate(0, 0.09, 0),
      dark,
    );
    ant.position.set(0.14, 0.4, -0.05);
    ant.rotation.z = -0.3;
    head.add(ant);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), glow);
    antTip.position.set(0.195, 0.565, -0.05);
    head.add(antTip);

    const arms = [-1, 1].map((s) => {
      const upper = seg(0.3, 0.085, 0.075, suit);
      upper.position.set(s * 0.33, 0.48, 0);
      upper.rotation.z = s * 0.12;
      const fore = seg(0.28, 0.075, 0.065, suit);
      upper.userData.end.add(fore);
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), white);
      glove.scale.set(0.9, 1.2, 0.8);
      glove.position.y = -0.05;
      fore.userData.end.add(glove);
      torso.add(upper);
      return { upper, fore };
    });

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    shadow.renderOrder = 1;

    const A = { ph: 0, bob: 0, lean: 0, air: 0, hang: 0, grap: 0, sit: 0, land: 0 };
    let wasGround = true;

    return {
      role,
      root,
      shadow,
      glow,
      addTo(scene) {
        scene.add(root, shadow);
      },
      set visible(v) {
        root.visible = v;
        shadow.visible = v;
      },
      update(dt, s, t) {
        const sp = s.speed || 0;
        const run = clamp(sp / 9, 0, 1);
        A.air = damp(A.air, s.grounded || s.mode === 'hang' ? 0 : 1, 10, dt);
        A.hang = damp(A.hang, s.mode === 'hang' ? 1 : 0, 8, dt);
        A.grap = damp(A.grap, s.mode === 'grapple' ? 1 : 0, 12, dt);
        A.sit = damp(A.sit, s.mode === 'sit' ? 1 : 0, 6, dt);
        if (s.grounded && !wasGround) A.land = 1;
        wasGround = s.grounded;
        A.land = Math.max(0, A.land - dt * 4);
        if (s.grounded) A.ph += sp * dt * 1.55;
        const amp = clamp(sp / 5, 0, 1) * (0.55 + run * 0.35) * (1 - A.air);
        const sn = Math.sin(A.ph);
        const cs = Math.cos(A.ph);
        const idle = Math.sin(t * 1.6) * 0.015;
        A.lean = damp(A.lean, run * 0.22 * (1 - A.air), 6, dt);

        body.position.y = Math.abs(sn) * 0.06 * amp + idle - A.land * 0.08 - A.sit * 0.42;
        torso.rotation.x = A.lean + A.land * 0.15 - A.hang * 0.05;
        torso.rotation.y = sn * 0.08 * amp;
        head.rotation.x = -A.lean * 0.6;

        legs.forEach((l, i) => {
          const d = i ? -1 : 1;
          const w = sn * d;
          const thigh =
            -w * amp * 0.9 +
            A.air * (i ? -0.7 : -0.25) +
            A.hang * Math.sin(t * 1.3 + i) * 0.15 -
            A.sit * 1.5;
          const knee =
            Math.max(0, w) * amp * 1.3 +
            0.2 * amp +
            A.air * (i ? 1.1 : 0.5) +
            A.sit * 1.55 +
            A.land * 0.4;
          l.thigh.rotation.x = thigh;
          l.shin.rotation.x = knee;
        });
        arms.forEach((a, i) => {
          const d = i ? 1 : -1;
          const w = sn * d;
          let ux = -w * amp * 0.8 + A.air * -0.4;
          let uz = (i ? 1 : -1) * (0.12 + A.air * 0.9);
          ux = lerp(ux, -2.9, A.hang);
          uz = lerp(uz, (i ? 1 : -1) * 0.25, A.hang);
          if (i === 1) {
            ux = lerp(ux, -1.65, A.grap);
            uz = lerp(uz, 0.05, A.grap);
          }
          ux = lerp(ux, -0.3, A.sit);
          a.upper.rotation.x = ux;
          a.upper.rotation.z = uz;
          a.fore.rotation.x =
            -0.25 - amp * 0.5 * (cs * d * 0.5 + 0.5) - A.air * 0.3 + A.hang * 0.2 - A.sit * 0.9;
        });
        const gy = s.groundY == null ? root.position.y : s.groundY;
        shadow.position.set(root.position.x, gy + 0.02, root.position.z);
        const hgt = clamp((root.position.y - gy) / 6, 0, 1);
        shadow.scale.setScalar(1 - hgt * 0.5);
        shadow.material.opacity = 1 - hgt * 0.8;
        shadow.visible = root.visible && gy > -1e3;
      },
    };
  };

  return { build, LOOK };
})();
