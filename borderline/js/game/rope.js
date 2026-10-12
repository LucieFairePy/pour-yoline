const Rope = (() => {
  const SEG = 18;
  const geo = new THREE.CylinderGeometry(0.022, 0.022, 1, 5, 1, true)
    .translate(0, 0.5, 0)
    .rotateX(Math.PI / 2);
  const up = V3(0, 1, 0);

  const create = (color = '#ff5f8a') => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(1.8),
      toneMapped: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, SEG);
    mesh.frustumCulled = false;
    mesh.visible = false;
    R.scene.add(mesh);
    const hook = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), mat);
    hook.visible = false;
    R.scene.add(hook);
    const pts = Array.from({ length: SEG + 1 }, () => V3());
    const prev = Array.from({ length: SEG + 1 }, () => V3());
    const tip = V3();
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const d = V3();
    const sc = V3(1, 1, 1);
    let state = 'idle';
    let k = 0;
    let target = null;

    const layout = (a, b, sag) => {
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        pts[i].copy(a).lerp(b, t);
        pts[i].y -= Math.sin(t * Math.PI) * sag;
        prev[i].copy(pts[i]);
      }
    };

    const draw = () => {
      for (let i = 0; i < SEG; i++) {
        d.subVectors(pts[i + 1], pts[i]);
        const len = d.length() || 0.0001;
        q.setFromUnitVectors(V3(0, 0, 1), d.divideScalar(len));
        sc.set(1, 1, len);
        m4.compose(pts[i], q, sc);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
      hook.position.copy(pts[SEG]);
    };

    return {
      get state() {
        return state;
      },
      fire(t) {
        target = t.clone();
        state = 'shoot';
        k = 0;
        Sound.play('grapple');
      },
      release() {
        if (state === 'idle' || state === 'retract') return;
        state = 'retract';
        k = 0;
        Sound.play('grappleOut');
      },
      update(dt, hand, active, tgt) {
        if (active && tgt && (state === 'idle' || state === 'retract')) this.fire(tgt);
        if (!active && (state === 'shoot' || state === 'taut')) this.release();
        if (tgt) target = tgt;
        if (state === 'idle') {
          mesh.visible = hook.visible = false;
          return;
        }
        mesh.visible = hook.visible = true;
        if (state === 'shoot') {
          k = Math.min(1, k + dt * 7);
          tip.copy(hand).lerp(target, 1 - Math.pow(1 - k, 3));
          layout(hand, tip, 0.15 * (1 - k));
          if (k >= 1) {
            state = 'taut';
            Sound.play('grappleHit');
          }
        } else if (state === 'taut') {
          pts[0].copy(hand);
          pts[SEG].copy(target);
          const len = hand.distanceTo(target);
          for (let i = 1; i < SEG; i++) {
            const p = pts[i];
            const v = V3().subVectors(p, prev[i]).multiplyScalar(0.9);
            prev[i].copy(p);
            p.add(v);
            p.y -= 9 * dt * dt;
          }
          const rest = (len / SEG) * 0.98;
          for (let it = 0; it < 6; it++)
            for (let i = 0; i < SEG; i++) {
              const a = pts[i];
              const b = pts[i + 1];
              d.subVectors(b, a);
              const l = d.length() || 0.0001;
              const diff = (l - rest) / l;
              if (i > 0) a.addScaledVector(d, diff * 0.5);
              if (i + 1 < SEG) b.addScaledVector(d, -diff * 0.5);
            }
        } else if (state === 'retract') {
          k = Math.min(1, k + dt * 5);
          const end = pts[SEG].clone().lerp(hand, k * k);
          layout(hand, end, 0.35 * (1 - k));
          if (k >= 1) state = 'idle';
        }
        draw();
      },
    };
  };

  return { create };
})();
