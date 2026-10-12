const makeScreen = (w, h, res = 1024) => {
  const c = document.createElement('canvas');
  c.width = res;
  c.height = Math.round((res * h) / w);
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  mat.color.setScalar(0.25);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  let level = 0.25;
  let target = 0.25;
  let glitch = 0;
  let last = null;

  const draw = (main, sub, color = '#fbefe6') => {
    const W = c.width;
    const H = c.height;
    g.fillStyle = '#07030a';
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.06;
    g.fillStyle = '#ff3d7f';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(232,189,132,.5)';
    g.lineWidth = Math.max(2, W / 400);
    g.strokeRect(W * 0.02, H * 0.04, W * 0.96, H * 0.92);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = W / 50;
    let size = H * 0.2;
    g.font = `italic ${size}px "Bodoni Moda", Georgia, serif`;
    while (g.measureText(main).width > W * 0.88 && size > 10) {
      size *= 0.92;
      g.font = `italic ${size}px "Bodoni Moda", Georgia, serif`;
    }
    Icons.fillText(g, main, W / 2, sub ? H * 0.44 : H / 2);
    if (sub) {
      g.shadowBlur = 0;
      g.fillStyle = '#c495a6';
      let s2 = H * 0.075;
      g.font = `${s2}px "IBM Plex Mono", monospace`;
      while (g.measureText(sub).width > W * 0.9 && s2 > 8) {
        s2 *= 0.92;
        g.font = `${s2}px "IBM Plex Mono", monospace`;
      }
      Icons.fillText(g, sub.toUpperCase(), W / 2, H * 0.72);
    }
    g.shadowBlur = 0;
    tex.needsUpdate = true;
  };

  draw('?', '');

  return {
    mesh,
    show(main, sub, color) {
      const k = main + '|' + sub + '|' + color;
      if (k === last) return;
      const fresh = !last || last.split('|')[0] !== main;
      last = k;
      draw(main, sub, color);
      target = 1.6;
      if (fresh) glitch = 0.4;
    },
    dim() {
      target = 0.25;
    },
    update(dt, t) {
      level = damp(level, target, 4, dt);
      glitch = Math.max(0, glitch - dt);
      const fl = glitch > 0 ? 0.4 + Math.random() * 0.8 : 1 + Math.sin(t * 40) * 0.02;
      mat.color.setScalar(level * fl);
    },
  };
};

const BigScreen = (() => {
  const s = makeScreen(20, 10, 2048);
  s.mesh.position.copy(City.screenPos);
  R.scene.add(s.mesh);
  return s;
})();
