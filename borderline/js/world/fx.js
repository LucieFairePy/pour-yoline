const Fx = (() => {
  const N = 6000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const max = new Float32Array(N);
  const grav = new Float32Array(N);
  let head = 0;
  let active = 0;
  const rockets = [];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  pts.frustumCulled = false;
  R.scene.add(pts);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -9999;

  const tmp = new THREE.Color();
  const spawn = (p, v, c, l, g) => {
    const i = head;
    head = (head + 1) % N;
    pos.set([p.x, p.y, p.z], i * 3);
    vel.set([v.x, v.y, v.z], i * 3);
    col.set([c.r, c.g, c.b], i * 3);
    life[i] = l;
    max[i] = l;
    active = Math.max(active, 1.5 + l);
    grav[i] = g;
  };

  const burst = (p, color, n = 200, speed = 8, l = 1.6, g = -4, shape) => {
    const c = new THREE.Color(color).multiplyScalar(2.2);
    for (let k = 0; k < n; k++) {
      let v;
      if (shape === 'heart') {
        const t = Math.random() * TAU;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const s = (speed / 17) * (0.9 + Math.random() * 0.2);
        v = V3(hx * s, hy * s, (Math.random() - 0.5) * 1.2);
      } else {
        v = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(speed * (0.6 + Math.random() * 0.4));
      }
      tmp.copy(c).multiplyScalar(0.7 + Math.random() * 0.5);
      spawn(p, v, tmp, l * (0.7 + Math.random() * 0.5), g);
    }
  };

  const PAL = ['#ff5f8a', '#ffcf8a', '#b07cff', '#6cc8ff', '#ff3d7f'];

  return {
    burst,
    hearts(p) {
      burst(p, '#ff5f8a', 260, 7, 1.8, -6, 'heart');
      burst(p, '#ffcf8a', 80, 5, 1.2, -6);
    },
    shatter(p) {
      burst(p, '#ff2a3a', 500, 12, 2.2, -3);
      burst(p, '#ffffff', 150, 6, 1.4, -2);
    },
    firework(p, h = 28) {
      rockets.push({
        p: p.clone(),
        v: V3((Math.random() - 0.5) * 2, h / 1.4, (Math.random() - 0.5) * 2),
        t: 1.4,
      });
      Sound.play('launch');
    },
    update(dt) {
      for (let r = rockets.length - 1; r >= 0; r--) {
        const k = rockets[r];
        k.t -= dt;
        k.p.addScaledVector(k.v, dt);
        spawn(
          k.p,
          V3((Math.random() - 0.5) * 0.6, -1, (Math.random() - 0.5) * 0.6),
          tmp.set(2, 1.4, 0.8),
          0.5,
          0,
        );
        if (k.t <= 0) {
          const c = PAL[(Math.random() * PAL.length) | 0];
          burst(k.p, c, 320, 11, 2.2, -5, Math.random() < 0.5 ? 'heart' : null);
          Sound.play('boom', k.p);
          rockets.splice(r, 1);
        }
      }
      if (active <= 0 && !rockets.length) return;
      active -= dt;
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        const j = i * 3;
        if (life[i] <= 0) {
          pos[j + 1] = -9999;
          continue;
        }
        vel[j + 1] += grav[i] * dt;
        vel[j] *= 0.985;
        vel[j + 1] *= 0.985;
        vel[j + 2] *= 0.985;
        pos[j] += vel[j] * dt;
        pos[j + 1] += vel[j + 1] * dt;
        pos[j + 2] += vel[j + 2] * dt;
        const f = life[i] / max[i];
        if (f < 0.3) {
          col[j] *= 0.94;
          col[j + 1] *= 0.94;
          col[j + 2] *= 0.94;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
})();
