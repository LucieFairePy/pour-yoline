// Asset lab (lab.html?lab=sword|grapple|veil|stone): the real game, one small test room per
// upgraded system, and a panel with the measures. ?ext=0 shows the current (hand-made) version,
// ?ext=1 (default) the external assets, so the same scene can be compared side by side.
// Solo by default (the Valet for sword/veil, the Dame for grapple); co-op with the usual
// ?local=X&role=yoline|william&host=1&auto=1 (two tabs or two headless pages).
const Lab = (() => {
  const q = new URLSearchParams(location.search);
  const kind = q.get('lab') || 'sword';
  const PH = 'lab_' + kind;
  const RING = (r) => new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.08, 10, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(r).multiplyScalar(1.6), toneMapped: false }),
  );
  const local = { t: 0, rings: [], gallery: null };

  // ---------- panel ----------
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:10px;top:10px;z-index:99;font:12px/1.45 monospace;color:#e8f0ff;' +
    'background:rgba(10,8,20,.72);padding:8px 10px;border-radius:6px;pointer-events:none;white-space:pre';
  const fps = { n: 0, t: 0, v: 0 };
  const res = () => {
    const out = { n: 0, kb: 0 };
    for (const e of performance.getEntriesByType('resource'))
      if (e.name.includes('/assets/') || e.name.includes('GLTFLoader')) {
        out.n++;
        out.kb += (e.encodedBodySize || e.transferSize || 0) / 1024;
      }
    return out;
  };
  const measure = () => {
    // one full frame counted (the composer's last pass alone would read 1 call)
    const i = R.renderer.info;
    i.autoReset = false;
    i.reset();
    R.render();
    const calls = i.render.calls;
    const tris = i.render.triangles;
    i.autoReset = true;
    const r = res();
    return {
      lab: kind,
      ext: [...AssetFx.ON].join(',') || 'none',
      fps: fps.v,
      calls,
      tris,
      geos: i.memory.geometries,
      texs: i.memory.textures,
      progs: (i.programs || []).length,
      assetFiles: r.n,
      assetKB: Math.round(r.kb),
      loaded: Assets.stats.loaded,
      failed: Assets.stats.failed,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    };
  };
  const tick = (now) => {
    requestAnimationFrame(tick);
    fps.n++;
    if (now - fps.t > 1000) {
      fps.v = Math.round((fps.n * 1000) / (now - fps.t));
      fps.n = 0;
      fps.t = now;
      if (typeof R !== 'undefined' && R.renderer) {
        const m = measure();
        panel.textContent = Object.entries(m)
          .map(([k, v]) => k.padEnd(10) + v)
          .join('\n');
      }
    }
  };

  // ---------- test rooms (in the Garde arena, like the firing range) ----------
  const stoneGallery = () => {
    const g = new THREE.Group();
    // the tints / scales the levels really use for 'stone'
    const uses = [
      ['arena', '#6e5e7c', 4.5, 1.2],
      ['balade', '#a49ab4', 2.5, 1.2],
      ['city', '#6a4a72', 3, 1],
      ['door', '#8a7f86', 1.4, 0.8],
      ['donjon', '#9a8ea8', 3.2, 1.4],
      ['finale', '#6a5a6e', 1.5, 1],
    ];
    uses.forEach(([n, color, scale, bump], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4, 1.2), Tex.mat('stone', { color, scale, bump }));
      m.position.set((i - 2.5) * 3.6, 2, 0);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    });
    // a pillar and a long wall, to judge tiling at distance
    const wall = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 1), Tex.mat('stone', { color: '#9a8ea8', scale: 3.2, bump: 1.4 }));
    wall.position.set(0, 3.5, -10);
    g.add(wall);
    return g;
  };

  Story.register(PH, {
    init: () => ({}),
    enter(c) {
      Garde.build();
      Enemies.clear();
      local.t = 1;
      const role = Story.role;
      const sp = Garde.spawn(4, role);
      c.spawn(sp, 0);
      Player.killY = Garde.O.y - 25;
      Player.checkpoint = () => Garde.spawn(4, Story.role);
      City.mood({});
      c.fog(0.006);
      Player.targets = null;
      if (kind === 'grapple') {
        const cols = ['#ff5f8a', '#ffcf8a', '#8fd8ff', '#ff5f8a'];
        local.rings = cols.map((col, i) => {
          const r = RING(col);
          r.position.set(sp.x + (i - 1.5) * 7, sp.y + 7 + (i % 2) * 2, sp.z + 14 + i * 3);
          R.scene.add(r);
          return r;
        });
        Player.targets = () => (Story.role === 'dame' ? local.rings.map((r) => r.position) : []);
      } else if (kind === 'stone') {
        local.gallery = stoneGallery();
        local.gallery.position.set(sp.x, sp.y, sp.z + 12);
        R.scene.add(local.gallery);
      } else Combat.enable(true);
      HUD.visa('Labo · ' + kind + (AssetFx.ON.size ? ' · assets' : ' · actuel'));
      HUD.objective(
        kind === 'grapple'
          ? 'Vise un anneau, F : grappin'
          : kind === 'stone'
            ? 'Mur de pierre : procédural (ext=0) ou scanné (ext=1)'
            : 'Clic : épée · F : voile',
      );
    },
    exit() {
      Combat.enable(false);
      Enemies.clear();
      local.rings.forEach((r) => R.scene.remove(r));
      local.rings = [];
      if (local.gallery) R.scene.remove(local.gallery);
      Player.targets = null;
    },
    host(c, dt) {
      if (kind !== 'sword' && kind !== 'veil') return;
      const me = { who: Story.role, pos: Player.body.p, down: Combat.down, cloak: Combat.cloak > 0 };
      if (Enemies.alive() === 0) {
        local.t -= dt;
        if (local.t <= 0) {
          local.t = 3;
          const o = Player.body.p;
          for (let i = 0; i < 3; i++) {
            const a = Player.yaw + (i - 1) * 0.5;
            Enemies.spawn('pion', V3(o.x + Math.sin(a) * 9, o.y, o.z + Math.cos(a) * 9));
          }
        }
      }
      Enemies.simulate(dt, [me, me]);
      for (const e of Enemies.list.values()) {
        const dx = e.pos.x - me.pos.x;
        const dz = e.pos.z - me.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 2.2 && d > 1e-3) {
          e.pos.x = me.pos.x + (dx / d) * 2.2;
          e.pos.z = me.pos.z + (dz / d) * 2.2;
        }
      }
      Combat.hp = Combat.max;
      if (Combat.down) Combat.revived();
    },
    action(c, who, d) {
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
    },
    update(c, dt, t) {
      local.rings.forEach((r, i) => (r.rotation.y = t * 0.6 + i));
      if (kind === 'sword' || kind === 'veil') {
        Enemies.render(dt, t);
        return Combat.update(dt);
      }
    },
  });

  // solo: no lobby, straight into the room (like ?stand); co-op: normal lobby, the host goes
  const solo = !q.has('local') && !q.has('r');
  const start = Lobby.start;
  Lobby.start = (cb) => {
    if (!solo) {
      start((role, progress) => {
        cb(role, progress);
        if (q.has('host')) setTimeout(() => Story.goto(PH), 900);
      });
      return;
    }
    Net.local('lab' + Math.random().toString(36).slice(2, 7), true);
    $('lobby').hidden = true;
    Sound.init();
    cb(q.get('role') || (kind === 'grapple' ? 'yoline' : 'william'), null);
    setTimeout(() => Story.goto(PH), 600);
  };
  addEventListener('load', () => {
    document.body.appendChild(panel);
    requestAnimationFrame(tick);
  });

  // test helpers for the headless driver
  const press = (a, ms = 120) => {
    Input.sim.held.add(a);
    setTimeout(() => Input.sim.held.delete(a), ms);
  };
  return { measure, press, kind, local };
})();
