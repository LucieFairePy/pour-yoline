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

  const fabric = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#d8d8d8';
    g.fillRect(0, 0, 256, 256);
    const img = g.getImageData(0, 0, 256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 26 + ((i / 4) % 2 ? 6 : -6);
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(70,70,80,0.55)';
    g.lineWidth = 2;
    [64, 160, 224].forEach((y) => {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y);
      g.stroke();
    });
    [48, 128, 208].forEach((x) => {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 256);
      g.stroke();
    });
    g.fillStyle = 'rgba(60,60,70,0.5)';
    for (let x = 0; x < 256; x += 6) [60, 156, 220].forEach((y) => g.fillRect(x, y, 3, 1));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.anisotropy = 4;
    return t;
  })();
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

  const ghostMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#9fe6ff').multiplyScalar(0.6),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const animState = () => ({
    ph: 0,
    lean: 0,
    air: 0,
    hang: 0,
    grap: 0,
    sit: 0,
    land: 0,
    hand: 0,
    float: 0,
    swim: 0,
    lie: 0,
    wasGround: true,
  });

  // Shared procedural animation: returns joint angles in the original rig convention
  // (thigh/upper-arm rotation.x negative = forward, knee positive = bend, elbow negative = bend).
  const animate = (A, dt, s, t) => {
    const sp = s.speed || 0;
    const run = clamp(sp / 9, 0, 1);
    A.air = damp(A.air, s.grounded || s.mode === 'hang' ? 0 : 1, 10, dt);
    A.hang = damp(A.hang, s.mode === 'hang' ? 1 : 0, 8, dt);
    A.grap = damp(A.grap, s.mode === 'grapple' ? 1 : 0, 12, dt);
    A.sit = damp(A.sit, s.mode === 'sit' ? 1 : 0, 6, dt);
    A.hand = damp(A.hand, s.hand ? 1 : 0, 6, dt);
    A.aim = damp(A.aim || 0, s.aim ? 1 : 0, 14, dt);
    if (s.grounded && !A.wasGround) A.land = 1;
    A.wasGround = s.grounded;
    A.land = Math.max(0, A.land - dt * 4);
    if (s.grounded) A.ph += sp * dt * 1.55;
    const amp = clamp(sp / 5, 0, 1) * (0.55 + run * 0.35) * (1 - A.air);
    const sn = Math.sin(A.ph);
    const cs = Math.cos(A.ph);
    const idle = Math.sin(t * 1.6) * 0.015;
    A.lean = damp(A.lean, run * 0.22 * (1 - A.air), 6, dt);
    const o = {
      bodyY: -0.95 + Math.abs(sn) * 0.06 * amp + idle - A.land * 0.08 - A.sit * 0.42,
      torsoX: A.lean + A.land * 0.15 - A.hang * 0.05,
      torsoY: sn * 0.08 * amp,
      headX: -A.lean * 0.6,
      legs: [],
      arms: [],
      punch: 0,
      amp,
      sit: A.sit,
      hang: A.hang,
    };
    for (let i = 0; i < 2; i++) {
      const d = i ? -1 : 1;
      const w = sn * d;
      o.legs.push({
        thigh:
          -w * amp * 0.9 +
          A.air * (i ? -0.7 : -0.25) +
          A.hang * Math.sin(t * 1.3 + i) * 0.15 -
          A.sit * 1.5,
        knee:
          Math.max(0, w) * amp * 1.3 +
          0.2 * amp +
          A.air * (i ? 1.1 : 0.5) +
          A.sit * 1.55 +
          A.land * 0.4,
      });
    }
    for (let i = 0; i < 2; i++) {
      const d = i ? 1 : -1;
      const w = sn * d;
      let ux = -w * amp * 0.8 + A.air * -0.4;
      let uz = (i ? 1 : -1) * (0.12 + A.air * 0.9);
      ux = lerp(ux, -2.9, A.hang);
      uz = lerp(uz, (i ? 1 : -1) * 0.25, A.hang);
      if (i === 1) {
        ux = lerp(ux, -1.65, A.grap);
        uz = lerp(uz, 0.05, A.grap);
        ux = lerp(ux, -0.45, A.hand);
        uz = lerp(uz, 0.7, A.hand);
      }
      ux = lerp(ux, -0.3, A.sit);
      // rifle held to the shoulder: firing arm forward, the other one under the handguard
      A.pitch = damp(A.pitch || 0, s.pitch || 0, 14, dt);
      ux = lerp(ux, (i === 1 ? -1.45 : -1.25) + A.pitch, A.aim);
      uz = lerp(uz, i === 1 ? 0.12 : -0.5, A.aim);
      if (i === 1 && s.punch > 0) {
        const k = Math.sin((s.punch / 0.25) * Math.PI);
        ux = lerp(ux, -1.6, k);
        uz = lerp(uz, 0.1, k);
        o.punch = k;
      }
      o.arms.push({
        ux,
        uz,
        fore: -0.25 - amp * 0.5 * (cs * d * 0.5 + 0.5) - A.air * 0.3 + A.hang * 0.2 - A.sit * 0.9,
      });
    }
    A.float = damp(A.float, s.mode === 'float' ? 1 : 0, 4, dt);
    A.swim = damp(A.swim, s.mode === 'swim' ? 1 : 0, 4, dt);
    A.lie = damp(A.lie, s.mode === 'lie' ? 1 : 0, 4, dt);
    if (A.float + A.swim + A.lie > 0.001) {
      const sw = t * 2.4;
      const mix3 = (base, f, w, l) => lerp(lerp(lerp(base, f, A.float), w, A.swim), l, A.lie);
      o.legs.forEach((l, i) => {
        const kick = Math.sin(sw * 2 + i * Math.PI);
        l.thigh = mix3(
          l.thigh,
          Math.sin(t * 0.9 + i * 1.7) * 0.18 - 0.2,
          kick * 0.45 - 0.1,
          i ? 0.08 : -0.05,
        );
        l.knee = mix3(
          l.knee,
          0.35 + Math.sin(t * 1.1 + i) * 0.15,
          0.3 + Math.max(0, kick) * 0.6,
          0.12,
        );
      });
      o.arms.forEach((a, i) => {
        const sg = i ? 1 : -1;
        a.ux = mix3(a.ux, -0.3 + Math.sin(t * 0.8 + i) * 0.15, -1.9 + Math.cos(sw) * 0.7, -0.15);
        a.uz = mix3(
          a.uz,
          sg * (0.7 + Math.sin(t * 0.7 + i * 2) * 0.12),
          sg * (0.35 + (Math.sin(sw) * 0.5 + 0.5) * 1.1),
          sg * 0.55,
        );
        a.fore = mix3(a.fore, -0.5, -0.4 - Math.max(0, Math.sin(sw)) * 0.8, -0.15);
      });
      o.headX = lerp(o.headX, -0.25, A.swim);
      o.bodyY = lerp(o.bodyY, -0.95, Math.min(1, A.float + A.swim + A.lie));
    }
    return o;
  };

  const shadowMesh = () => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    m.renderOrder = 1;
    return m;
  };

  const placeShadow = (root, shadow, s) => {
    const gy = s.groundY == null ? root.position.y : s.groundY;
    shadow.position.set(root.position.x, gy + 0.02, root.position.z);
    const hgt = clamp((root.position.y - gy) / 6, 0, 1);
    shadow.scale.setScalar(1 - hgt * 0.5);
    shadow.material.opacity = 1 - hgt * 0.8;
    shadow.visible = root.visible && gy > -1e3;
  };

  const ghostable = (root) => (k) => {
    const on = k > 0;
    if (on === !!root.userData.ghost) return;
    root.userData.ghost = on;
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (on) {
        o.userData.mat = o.material;
        o.material = ghostMat;
      } else if (o.userData.mat) o.material = o.userData.mat;
    });
  };

  // High-detail avatar: the same astronauts as the intro film, driven by the shared animation.
  const HQ_LOOK = {
    dame: () => ({
      suit: HQ.sequinMat(0x006a3a, { rough: 0.55, metal: 0.12 }),
      feminine: true,
      name: CONFIG.her,
    }),
    valet: () => ({
      suit: HQ.sequinMat(0x1d2d6e, { glint: 0.55 }),
      feminine: false,
      name: CONFIG.me,
      accent: '#2a3f9e',
      accentDark: '#1b2a6b',
    }),
  };
  const SCALE = 0.9;

  // The HQ suit is ~200 small meshes. Merge static sibling meshes that share a material into one
  // draw call, leaving every part the rig moves (limbs, rings, knees, boots, helmet, fingers).
  const mergeStatic = (A) => {
    const keep = new Set();
    const mark = (o) => o && keep.add(o);
    [A.armL, A.armR].forEach((arm) => {
      ['up', 'lo', 'brg', 'brg2', 'elbow', 'hand'].forEach((k) => mark(arm[k]));
      const u = arm.hand && arm.hand.userData;
      if (u && u.fingers) u.fingers.forEach((ch) => ch.forEach((o) => (mark(o), mark(o.parent))));
      if (u && u.thumb) u.thumb.forEach(mark);
    });
    A.legs.forEach((L) =>
      ['th', 'sh', 'brg', 'brg2', 'knee', 'kneePad', 'boot'].forEach((k) => mark(L[k])),
    );
    mark(A.helmet);
    (A.flames || []).forEach(mark);
    const nodes = [];
    A.g.traverse((o) => nodes.push(o));
    for (const n of nodes) {
      const sets = new Map();
      for (const c of n.children) {
        if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || c.children.length || keep.has(c))
          continue;
        const g = c.geometry;
        if (!g.isBufferGeometry || g.groups.length > 1 || Array.isArray(c.material)) continue;
        if (Object.values(g.attributes).some((at) => at.isInterleavedBufferAttribute)) continue;
        if (g.morphAttributes && Object.keys(g.morphAttributes).length) continue;
        const key =
          c.material.uuid +
          '|' +
          Object.keys(g.attributes).sort().join(',') +
          '|' +
          !!g.index +
          c.visible;
        if (!sets.has(key)) sets.set(key, []);
        sets.get(key).push(c);
      }
      for (const list of sets.values()) {
        if (list.length < 2) continue;
        const geos = list.map((c) => {
          c.updateMatrix();
          return c.geometry.clone().applyMatrix4(c.matrix);
        });
        const names = Object.keys(geos[0].attributes);
        const merged = new THREE.BufferGeometry();
        names.forEach((nm) => {
          const size = geos[0].attributes[nm].itemSize;
          const total = geos.reduce((t, g) => t + g.attributes[nm].count, 0);
          const arr = new Float32Array(total * size);
          let o = 0;
          geos.forEach((g) => {
            const at = g.attributes[nm];
            for (let i = 0; i < at.count; i++)
              for (let k = 0; k < size; k++) arr[o++] = at.array[i * size + k];
          });
          merged.setAttribute(nm, new THREE.BufferAttribute(arr, size));
        });
        if (geos[0].index) {
          const total = geos.reduce((t, g) => t + g.index.count, 0);
          const idx = new Uint32Array(total);
          let o = 0;
          let base = 0;
          geos.forEach((g) => {
            for (let i = 0; i < g.index.count; i++) idx[o++] = g.index.array[i] + base;
            base += g.attributes.position.count;
          });
          merged.setIndex(new THREE.BufferAttribute(idx, 1));
        }
        const m = new THREE.Mesh(merged, list[0].material);
        m.castShadow = list[0].castShadow;
        m.receiveShadow = list[0].receiveShadow;
        m.renderOrder = list[0].renderOrder;
        m.frustumCulled = false;
        list.forEach((c) => n.remove(c));
        geos.forEach((g) => g.dispose());
        n.add(m);
      }
    }
  };

  const buildHQ = (role) => {
    const L = LOOK[role];
    const glow = new THREE.MeshBasicMaterial({
      color: new THREE.Color(L.glow).multiplyScalar(2),
      toneMapped: false,
    });
    const rig = HQRig.build(HQ_LOOK[role]());
    mergeStatic(rig.A);
    rig.g.scale.setScalar(SCALE);
    rig.apply(HQRig.P.stand());
    const base = -rig.groundSnap(0, true);
    rig.g.position.set(0, base, 0);
    rig.g.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });

    const root = new THREE.Group();
    const spin = new THREE.Group();
    spin.position.y = 0.95;
    const lean = new THREE.Group();
    lean.position.y = -0.95;
    root.add(spin);
    spin.add(lean);
    // lean pivots around the hips
    const hips = new THREE.Group();
    hips.position.y = base - 0.3 * SCALE;
    lean.add(hips);
    rig.g.position.y = 0.3 * SCALE;
    hips.add(rig.g);
    const shadow = shadowMesh();
    const A = animState();
    const pose = HQRig.P.zero();
    const legOf = rig.A.legs.map((Lg) => (Lg.s > 0 ? 1 : 0));

    return {
      role,
      root,
      spin,
      shadow,
      glow,
      hq: true,
      ghost: ghostable(root),
      hand(out = V3()) {
        return rig.handWorld(0, out);
      },
      addTo(scene) {
        scene.add(root, shadow);
      },
      set visible(v) {
        root.visible = v;
        shadow.visible = v;
      },
      update(dt, s, t) {
        HQ.time.value = t;
        const o = animate(A, dt, s, t);
        hips.position.y = base - 0.3 * SCALE + (o.bodyY + 0.95);
        hips.rotation.x = o.torsoX;
        hips.rotation.y = o.torsoY;
        // HQ arms: [0] = left (+x) = original arm 1, [1] = right (-x) = original arm 0
        [1, 0].forEach((src, k) => {
          const a = o.arms[src];
          const sd = src ? 1 : -1;
          const P = pose.arms[k];
          P.p = -a.ux;
          P.a = a.uz * sd;
          P.e = Math.max(0.05, -a.fore);
          P.g =
            src === 1 && o.punch > 0 ? lerp(0.6, 1, o.punch) : s.hand && src === 1 ? 0.75 : 0.55;
        });
        rig.A.legs.forEach((Lg, k) => {
          const l = o.legs[legOf[k]];
          const P = pose.legs[k];
          P.p = -l.thigh;
          P.a = 0.05;
          P.k = Math.max(0.03, l.knee);
          P.f = -0.15 * o.sit;
        });
        pose.head.p = o.headX;
        pose.head.y = 0;
        rig.apply(pose);
        spin.rotation.x = s.flip || 0;
        placeShadow(root, shadow, s);
      },
    };
  };

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
    const suit = new THREE.MeshStandardMaterial({
      color: L.suit,
      roughness: 0.82,
      metalness: 0,
      map: fabric,
      bumpMap: fabric,
      bumpScale: 0.015,
    });
    const glow = new THREE.MeshBasicMaterial({
      color: new THREE.Color(L.glow).multiplyScalar(2),
      toneMapped: false,
    });

    const root = new THREE.Group();
    const spin = new THREE.Group();
    spin.position.y = 0.95;
    const body = new THREE.Group();
    body.position.y = -0.95;
    root.add(spin);
    spin.add(body);

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
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), suit);
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
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 24), white);
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

    const A = animState();

    return {
      role,
      root,
      spin,
      shadow,
      glow,
      ghost(k) {
        const on = k > 0;
        if (on === !!root.userData.ghost) return;
        root.userData.ghost = on;
        root.traverse((o) => {
          if (!o.isMesh) return;
          if (on) {
            o.userData.mat = o.material;
            o.material = ghostMat;
          } else if (o.userData.mat) o.material = o.userData.mat;
        });
      },
      hand(out = V3()) {
        return arms[1].fore.userData.end.getWorldPosition(out);
      },
      addTo(scene) {
        scene.add(root, shadow);
      },
      set visible(v) {
        root.visible = v;
        shadow.visible = v;
      },
      update(dt, s, t) {
        const o = animate(A, dt, s, t);
        body.position.y = o.bodyY;
        torso.rotation.x = o.torsoX;
        torso.rotation.y = o.torsoY;
        head.rotation.x = o.headX;
        legs.forEach((l, i) => {
          l.thigh.rotation.x = o.legs[i].thigh;
          l.shin.rotation.x = o.legs[i].knee;
        });
        arms.forEach((a, i) => {
          a.upper.rotation.x = o.arms[i].ux;
          a.upper.rotation.z = o.arms[i].uz;
          a.fore.rotation.x = o.arms[i].fore;
        });
        spin.rotation.x = s.flip || 0;
        const gy = s.groundY == null ? root.position.y : s.groundY;
        shadow.position.set(root.position.x, gy + 0.02, root.position.z);
        const hgt = clamp((root.position.y - gy) / 6, 0, 1);
        shadow.scale.setScalar(1 - hgt * 0.5);
        shadow.material.opacity = 1 - hgt * 0.8;
        shadow.visible = root.visible && gy > -1e3;
      },
    };
  };

  const useHQ = () =>
    typeof HQRig !== 'undefined' &&
    SETTINGS.quality !== 'low' &&
    !/[?&]lowav\b/.test(location.search);

  return { build: (role) => (useHQ() ? buildHQ(role) : build(role)), LOOK };
})();
