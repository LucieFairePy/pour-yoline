// Small shared toolkit for the chapter worlds (♠ 3, ♠ 7, ♥ 2, ♣ R).
const LvKit = (() => {
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

  const tex = (w, h, draw, rx = 1, ry = 1) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    return t;
  };

  const grain = (g, w, h, base, amt, n = 9000) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const v = Math.random();
      g.fillStyle =
        v > 0.5 ? `rgba(255,255,255,${amt * Math.random()})` : `rgba(0,0,0,${amt * Math.random()})`;
      const s = 1 + Math.random() * 2.5;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  };

  const cardTex = (rank, suit, red) =>
    tex(256, 360, (g) => {
      g.fillStyle = '#fff8f0';
      g.fillRect(0, 0, 256, 360);
      g.strokeStyle = red ? '#d8324f' : '#1a1424';
      g.lineWidth = 6;
      g.strokeRect(10, 10, 236, 340);
      g.fillStyle = red ? '#d8324f' : '#1a1424';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '160px Georgia';
      Icons.fillText(g, suit, 128, 190);
      g.font = 'bold 44px Georgia';
      Icons.fillText(g, rank, 36, 44);
      g.save();
      g.translate(220, 316);
      g.rotate(Math.PI);
      Icons.fillText(g, rank, 0, 0);
      g.restore();
    });

  const card = (rank, suit, red) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.7),
      new THREE.MeshBasicMaterial({
        map: cardTex(rank, suit, red),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    m.material.color.setScalar(1.4);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.5, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(red ? '#ff5f8a' : '#ffcf8a').multiplyScalar(1.6),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    m.add(halo);
    m.visible = false;
    return m;
  };

  // A world builder anchored at origin O, adding meshes to group and colliders to Phys.
  const builder = (O, group) => {
    const P = (x, y, z) => V3(O.x + x, O.y + y, O.z + z);
    const geoCache = new Map();
    const box = (sx, sy, sz) => {
      const k = sx + ',' + sy + ',' + sz;
      if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(sx, sy, sz));
      return geoCache.get(k);
    };
    return {
      P,
      solid(x, y, z, sx, sy, sz, mat, opt) {
        const m = new THREE.Mesh(box(sx, sy, sz), mat);
        m.position.copy(P(x, y, z));
        group.add(m);
        const b = Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
        return { m, b };
      },
      collider(x, y, z, sx, sy, sz, opt) {
        return Phys.box(O.x + x, O.y + y, O.z + z, sx, sy, sz, opt);
      },
      deco(geo, mat, x, y, z) {
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(P(x, y, z));
        group.add(m);
        return m;
      },
      rel: (p) => V3(p.x - O.x, p.y - O.y, p.z - O.z),
    };
  };

  const light = (group, pos, color, intensity, distance) => {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.copy(pos);
    group.add(l);
    return l;
  };

  return { glow, tex, grain, card, builder, light };
})();
