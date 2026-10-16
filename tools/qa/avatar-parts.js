// Paste into the game page (or evaluate it over DevTools): triangles of an astronaut per part.
//   __parts.classify(__parts.rig(true, { detail: 'game' }))   rig of Yoline (false: William), unmerged
//   __parts.avatar('dame')                                     the in-game avatar, as built
window.__parts = (() => {
  const tris = (o) => {
    const g = o.geometry;
    if (!g) return 0;
    const n = g.index ? g.index.count : g.attributes.position.count;
    return Math.round(n / 3);
  };
  const rig = (fem, opts = {}) => {
    const L = fem
      ? { suit: HQ.sequinMat(0x006a3a, { rough: 0.55, metal: 0.12 }), feminine: true, name: 'Yoline' }
      : { suit: HQ.sequinMat(0x1d2d6e, { glint: 0.55 }), feminine: false, name: 'Moi', accent: '#2a3f9e', accentDark: '#1b2a6b' };
    return HQRig.build(Object.assign(L, opts));
  };
  const classify = (r) => {
    const A = r.A;
    const lab = new Map();
    const tag = (root, name) => root && root.traverse((o) => o.isMesh && !lab.has(o) && lab.set(o, name));
    [A.armL, A.armR].forEach((a) => {
      tag(a.up, 'limbs'); tag(a.lo, 'limbs'); tag(a.elbow, 'elbow/knee balls');
      tag(a.brg, 'bearing rings'); tag(a.brg2, 'bearing rings'); tag(a.hand, 'gloves');
    });
    A.legs.forEach((l) => {
      tag(l.th, 'limbs'); tag(l.sh, 'limbs'); tag(l.knee, 'elbow/knee balls');
      tag(l.brg, 'bearing rings'); tag(l.brg2, 'bearing rings'); tag(l.kneePad, 'knee pads'); tag(l.boot, 'boots');
    });
    A.helmet.traverse((o) => o.isMesh && !lab.has(o) && lab.set(o, o.material === A.visorMat ? 'visor' : 'helmet'));
    (A.flames || []).forEach((f) => tag(f, 'flames'));
    tag(A.torso, 'torso shell');
    tag(A.pack, 'backpack');
    const out = {};
    let total = 0, meshes = 0;
    A.g.traverse((o) => {
      if (!o.isMesh) return;
      let k = lab.get(o);
      if (!k) {
        const t = o.geometry.type;
        k = t === 'TorusGeometry' ? 'body rings (neck/waist/hose/shoulder)' : t === 'TubeGeometry' ? 'hoses/straps' : t === 'SphereGeometry' ? 'shoulders/studs' : t === 'ExtrudeGeometry' ? 'boxes (DCM/pack plate)' : 'body misc';
      }
      const n = tris(o);
      out[k] = (out[k] || 0) + n;
      total += n; meshes++;
    });
    out.TOTAL = total; out.meshes = meshes;
    return out;
  };
  const avatar = (role) => {
    const a = Avatar.build(role);
    let total = 0, meshes = 0;
    a.root.traverse((o) => { if (o.isMesh) { total += tris(o); meshes++; } });
    return { total, meshes };
  };
  return { rig, classify, avatar, tris };
})();
