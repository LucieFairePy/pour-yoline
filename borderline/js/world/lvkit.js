// Small shared toolkit for the chapter worlds (♠ 3, ♠ 7, ♥ 2, ♣ R).
const LvKit = (() => {
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

  // drawn in a w x h space, stored with the long side at 1080 px or more
  const tex = (w, h, draw, rx = 1, ry = 1) => {
    const k = Math.max(1, Math.min(8, Math.ceil(1080 / Math.max(w, h))));
    const c = document.createElement('canvas');
    c.width = w * k;
    c.height = h * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 16;
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
        map: Tex.card(rank, suit),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    // well under the bloom threshold (0.9): the face stays readable instead of a white glow
    m.material.color.setScalar(0.8);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.5, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(red ? '#ff5f8a' : '#ffcf8a').multiplyScalar(1.6),
        transparent: true,
        opacity: 0.35,
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
