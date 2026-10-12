const Clues = (() => {
  const list = {};
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 80;
    const g = c.getContext('2d');
    g.fillStyle = '#1b0716';
    g.fillRect(0, 0, 128, 80);
    g.strokeStyle = '#e8bd84';
    g.lineWidth = 4;
    g.strokeRect(4, 4, 120, 72);
    g.fillStyle = '#e8bd84';
    g.beginPath();
    g.arc(40, 40, 13, 0, TAU);
    g.arc(88, 40, 13, 0, TAU);
    g.fill();
    g.fillStyle = '#d8324f';
    g.font = 'bold 22px monospace';
    g.textAlign = 'center';
    g.fillText('Y.', 64, 30);
    return new THREE.CanvasTexture(c);
  })();
  const geo = new THREE.BoxGeometry(0.5, 0.32, 0.1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  mat.color.setScalar(1.4);

  return {
    add(id, pos) {
      if (list[id]) return;
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 8),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#ffcf8a').multiplyScalar(1.2),
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      m.add(halo);
      R.scene.add(m);
      list[id] = { m, pos: pos.clone(), got: false, base: pos.y };
      if (Story.S) this.sync(Story.S.clues);
    },
    sync(got) {
      Object.entries(list).forEach(([id, c]) => {
        c.got = got.includes(id);
        c.m.visible = !c.got;
      });
    },
    prompt(p) {
      for (const [id, c] of Object.entries(list))
        if (
          !c.got &&
          Math.hypot(p.x - c.pos.x, p.z - c.pos.z) < 1.8 &&
          Math.abs(p.y + 0.8 - c.pos.y) < 2
        )
          return id;
      return null;
    },
    update(dt, t) {
      Object.values(list).forEach((c) => {
        if (c.got) return;
        c.m.rotation.y = t * 1.5;
        c.m.position.y = c.base + Math.sin(t * 2) * 0.12;
      });
    },
  };
})();
