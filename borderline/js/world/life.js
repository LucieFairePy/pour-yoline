// World lifecycle: what an épreuve's world gives back when it is unloaded (js/world/LIFECYCLE.md).
// Shared caches mark what they hand out (keep); a world frees its group (free) and its colliders
// (Phys.drop), resets its module state and can be built again (unbuild next to build). Story
// unloads the world of a level when another phase is entered (unload, from js/game/story.js).
const Life = (() => {
  // owned by a shared cache (Tex maps and materials, the cards): never freed by a world
  const kept = new WeakSet();
  const keep = (x) => {
    if (!x) return x;
    if (x.isObject3D)
      x.traverse((o) => {
        if (o.geometry) kept.add(o.geometry);
        [].concat(o.material || []).forEach((m) => kept.add(m));
      });
    else kept.add(x);
    return x;
  };

  // the textures a material samples: every map slot, the uniforms of a ShaderMaterial, and the
  // uniform sets a world binds itself through onBeforeCompile (kept in userData)
  const texOf = (m, out) => {
    for (const k in m) {
      const v = m[k];
      if (v && v.isTexture) out.add(v);
    }
    const uni = (u) => {
      if (!u || typeof u !== 'object') return;
      for (const k in u) {
        const v = u[k] && u[k].value;
        if (v && v.isTexture) out.add(v);
        else if (Array.isArray(v)) v.forEach((t) => t && t.isTexture && out.add(t));
      }
    };
    uni(m.uniforms);
    for (const k in m.userData) uni(m.userData[k]);
  };
  // sprites share one geometry for the whole engine: never theirs to free
  const use = (o, G, M) => {
    if (o.geometry && !o.isSprite) G.add(o.geometry);
    [].concat(o.material || []).forEach((m) => m && M.add(m));
  };

  /**
   * Free the GPU side of world groups: their geometries, materials and textures, plus `extra`
   * (resources the world made but may hold off the scene: swapped materials, spare textures).
   * Nothing kept by a shared cache is freed, nor anything the rest of the scene still uses (the
   * city, the other built worlds, avatars, weapons, effects): the scene is scanned at that
   * moment instead of counting references, so a resource shared by hand between two worlds
   * stays alive as long as one of them is built. The groups are emptied, not removed.
   */
  const free = (roots, extra = []) => {
    const t0 = performance.now();
    const G = new Set();
    const M = new Set();
    const X = new Set();
    const add = (x) => {
      if (!x) return;
      if (Array.isArray(x)) x.forEach(add);
      else if (x.isObject3D) x.traverse((o) => use(o, G, M));
      else if (x.isBufferGeometry) G.add(x);
      else if (x.isMaterial) M.add(x);
      else if (x.isTexture) X.add(x);
    };
    roots.forEach(add);
    extra.forEach(add);
    M.forEach((m) => texOf(m, X));
    // what the rest of the scene uses right now (hidden objects included)
    const uG = new Set();
    const uM = new Set();
    const uX = new Set();
    const skip = new Set(roots);
    const walk = (o) => {
      if (skip.has(o)) return;
      use(o, uG, uM);
      o.children.forEach(walk);
    };
    walk(R.scene);
    uM.forEach((m) => texOf(m, uX));
    // instanced meshes own their per-instance buffers
    roots.forEach((r) => r.traverse((o) => o.isInstancedMesh && o.dispose && o.dispose()));
    const n = { geometries: 0, materials: 0, textures: 0 };
    const rid = (set, used, k) =>
      set.forEach((x) => {
        if (kept.has(x) || used.has(x)) return;
        x.dispose();
        n[k]++;
      });
    rid(G, uG, 'geometries');
    rid(M, uM, 'materials');
    rid(X, uX, 'textures');
    roots.forEach((r) => {
      while (r.children.length) r.remove(r.children[0]);
    });
    n.ms = Math.round(performance.now() - t0);
    return n;
  };

  // the last unloads, for the tests and the console
  const log = [];
  /** unload a built world (one with unbuild); the next build() makes it again */
  const unload = (W) => {
    if (!W || !W.unbuild || !W.built) return null;
    const r = W.unbuild() || {};
    log.push(r);
    if (log.length > 20) log.shift();
    return r;
  };

  return { keep, kept: (x) => kept.has(x), free, unload, log };
})();
