// Injected into the game page by the test suite (tools/qa/suite.mjs). Read-only: it measures, it
// never changes game state (the suite drives the game through Story.goto / reloads only).
window.__qa = (() => {
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const phase = () => (typeof Story !== 'undefined' && Story.S && Story.S.phase) || null;

  // wait until the GPU geometry + texture counts stop growing (world built, scans and procedural
  // maps uploaded): returns the time it took, a proxy for the level's build time
  const settle = async (quietMs = 1500, maxMs = 40000) => {
    const t0 = performance.now();
    let last = -1;
    let at = t0;
    while (performance.now() - t0 < maxMs) {
      await sleep(250);
      const m = R.renderer.info.memory;
      const n = m.geometries * 100000 + m.textures;
      if (n !== last) {
        last = n;
        at = performance.now();
      } else if (performance.now() - at > quietMs) break;
    }
    return Math.round(at - t0);
  };

  const metrics = async (frames = 120) => {
    const info = R.renderer.info;
    info.autoReset = false;
    info.reset();
    await raf();
    await raf();
    const r = { calls: info.render.calls, tris: info.render.triangles, points: info.render.points };
    info.autoReset = true;
    const dts = [];
    let p = performance.now();
    for (let i = 0; i < frames; i++) {
      await raf();
      const q = performance.now();
      dts.push(q - p);
      p = q;
    }
    dts.sort((a, b) => a - b);
    const avg = dts.reduce((a, b) => a + b, 0) / dts.length;
    let meshes = 0, visible = 0, instanced = 0, lights = 0;
    const mats = new Set();
    R.scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        if (o.visible) visible++;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && mats.add(m));
      }
      if (o.isInstancedMesh) instanced++;
      if (o.isLight) lights++;
    });
    return {
      phase: phase(),
      ...r,
      fps: Math.round(1000 / avg),
      p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1),
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : null,
      sceneChildren: R.scene.children.length,
      meshes,
      visible,
      instanced,
      lights,
      materials: mats.size,
      colliders: typeof Phys !== 'undefined' && Phys.count ? Phys.count() : null,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    };
  };

  // where this page thinks each player is: own body, and the partner as received over the network
  const where = () => ({
    me: typeof Player !== 'undefined' && Player.body ? Player.body.p.toArray() : null,
    mate: typeof Remote !== 'undefined' && Remote.pos ? Remote.pos.toArray() : null,
  });

  return { phase, settle, metrics, where, sleep };
})();
