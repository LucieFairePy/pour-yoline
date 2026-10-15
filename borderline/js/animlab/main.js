// Anim lab entry: loading, input (keyboard + mouse + scripted window.__lab), third-person camera
// copied from js/game/camera.js (over-the-shoulder offset, ADS zoom), HUD, main loop.
(() => {
  const U = LabU;
  const W = LabWorld;
  const hud = document.getElementById('hud');
  const help = document.getElementById('help');
  const status = document.getElementById('status');
  const ASSETS = {
    ual: 'assets/anim/ual_mannequin.glb',
    knight: 'assets/anim/kaykit_knight.glb',
    fem: 'assets/anim/ual_mannequin_f.glb',
    ak: 'assets/weapons/ak47.glb',
  };
  const loader = new THREE.GLTFLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

  // ---------- input ----------
  const keys = new Set();
  const pressed = new Set();
  const mouse = { rmb: false, lmb: false, lmbPressed: false };
  const virt = { fwd: 0, right: 0, sprint: false, walk: false, aim: false, shoot: false };
  let walkToggle = false;
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const canvas = W.renderer.domElement;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      // newer Chrome returns a promise that rejects without a real user gesture (synthetic QA events)
      const r = canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    }
    if (e.button === 2) mouse.rmb = true;
    if (e.button === 0) {
      mouse.lmb = true;
      mouse.lmbPressed = true;
    }
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 2) mouse.rmb = false;
    if (e.button === 0) mouse.lmb = false;
  });
  const cam = { yaw: 0, pitch: 0.18, dist: 5.4, sideK: 0.55, adsK: 0, mode: 'follow', fixed: null };
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    cam.yaw -= e.movementX * 0.0025;
    cam.pitch = U.clamp(cam.pitch + e.movementY * 0.0025, -0.95, 1.2);
  });
  const take = (code) => {
    const p = pressed.has(code);
    pressed.delete(code);
    return p;
  };

  // ---------- camera (js/game/camera.js, minus the physics ray) ----------
  const pivot = new THREE.Vector3();
  const place = (dt, p, ch) => {
    const S = ch.S;
    const camera = W.camera;
    if (cam.mode === 'orbit') {
      // QA view: follows the character from a fixed angle relative to its facing
      const a = (cam.orbitWorld ? 0 : S.yaw) + (cam.orbitA || 0);
      const d = cam.orbitD || 3.6;
      pivot.copy(p);
      camera.position.set(p.x + Math.sin(a) * d, p.y + (cam.orbitH || 1.3), p.z + Math.cos(a) * d);
      camera.lookAt(p.x, p.y + 0.9, p.z);
      if (camera.fov !== 50) {
        camera.fov = 50;
        camera.updateProjectionMatrix();
      }
      return;
    }
    if (cam.mode === 'fixed' && cam.fixed) {
      camera.position.copy(cam.fixed.pos);
      camera.lookAt(cam.fixed.look);
      if (camera.fov !== 50) {
        camera.fov = 50;
        camera.updateProjectionMatrix();
      }
      return;
    }
    const ads = S.aim;
    cam.adsK = U.damp(cam.adsK, ads ? 1 : 0, 10, dt);
    const sprinting = S.label.includes('sprint');
    cam.dist = U.damp(cam.dist, ads ? 2.7 : sprinting ? 6.1 : 5.4, ads ? 12 : 3, dt);
    cam.sideK = U.damp(cam.sideK, S.rifle || ads ? (ads ? 1.3 : 1.05) : 0.55, 4, dt);
    const fov = 62 - 20 * cam.adsK;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    pivot.x = U.damp(pivot.x, p.x, 18, dt);
    pivot.z = U.damp(pivot.z, p.z, 18, dt);
    pivot.y = U.damp(pivot.y, p.y + 1.55, 10, dt);
    const dir = new THREE.Vector3(
      -Math.sin(cam.yaw) * Math.cos(cam.pitch),
      Math.sin(cam.pitch),
      -Math.cos(cam.yaw) * Math.cos(cam.pitch),
    );
    const side = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)).multiplyScalar(-cam.sideK);
    const origin = pivot.clone().add(side);
    camera.position.copy(origin).addScaledVector(dir, cam.dist);
    camera.position.y = Math.max(0.2, camera.position.y);
    camera.lookAt(origin.x, origin.y + 0.1, origin.z);
  };

  // ---------- HUD ----------
  const fmt = (x, n = 2) => (typeof x === 'number' ? x.toFixed(n) : x);
  const bar = (w) => `<span class="bar"><i style="width:${Math.round(U.clamp(w, 0, 1) * 100)}%"></i></span>`;
  const stats = { fps: 0, frames: 0, acc: 0, calls: 0, tris: 0, ms: 0, msAcc: 0 };
  const opts = { skeleton: false, ik: true, twist: true, lean: true, shadows: true };

  let ch = null;
  let bench = null;
  let skel = null;
  let ready = false;
  const lastInp = {};

  const hudHtml = () => {
    const S = ch.S;
    const rows = ch
      .debug()
      .map(([n, lo, up]) => `<tr><td>${n}</td><td>${bar(lo)} ${fmt(lo)}</td><td>${bar(up)} ${fmt(up)}</td></tr>`)
      .join('');
    const b = bench ? bench.info : {};
    return `
      <div class="t">ANIM LAB <span class="dim">UAL mannequin / r128</span></div>
      <div class="kv"><b>state</b> ${S.label}</div>
      <div class="kv"><b>speed</b> ${fmt(Math.hypot(S.vel.x, S.vel.z))} m/s <span class="dim">anim ${fmt(S.speedAnim)}</span></div>
      <div class="kv"><b>layers</b> one-shot ${fmt(S.O || 0)} / weapon ${fmt(S.Ueff || 0)} / aim ${fmt(S.aimK)} / twist ${fmt((S.twist * 180) / Math.PI, 0)}&deg;</div>
      <div class="kv"><b>fps</b> ${stats.fps} <span class="dim">(${fmt(stats.ms, 1)} ms cpu)</span> <b>calls</b> ${stats.calls} <b>tris</b> ${stats.tris.toLocaleString('en')}</div>
      <div class="kv"><b>skeleton</b> ${ch.boneCount} bones, ${Object.keys(ch.clips).length} clips</div>
      <table><tr><th>action</th><th>lower</th><th>upper</th></tr>${rows}</table>
      <div class="kv dim">walk ${fmt(ch.cal.walk.speed)} / jog ${fmt(ch.cal.jog.speed)} / sprint ${fmt(ch.cal.sprint.speed)} m/s (measured)</div>
      ${b.clip ? `<div class="kv dim">retarget ${b.clip}: r128 ${b.skeletonUtilsMs} ms, delta ${b.deltaMs} ms, hip ratio ${b.hipRatio}</div>` : ''}
      <div class="toggles">
        ${Object.keys(opts)
          .map((k) => `<label><input type="checkbox" data-k="${k}" ${opts[k] ? 'checked' : ''}> ${k}</label>`)
          .join('')}
      </div>
      <div class="toggles">
        <button data-view="follow">player</button><button data-view="bench">retarget bench</button>
        ${['Walk_Loop', 'Jog_Fwd_Loop', 'Idle_Loop', 'Roll'].map((c) => `<button data-clip="${c}">${c}</button>`).join('')}
      </div>`;
  };
  hud.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.k;
    if (k) setOpt(k, e.target.checked);
  });
  hud.addEventListener('click', (e) => {
    const d = e.target.dataset || {};
    if (d.view) setView(d.view);
    if (d.clip && bench) bench.setClip(d.clip);
  });
  const setOpt = (k, v) => {
    opts[k] = v;
    if (k === 'skeleton' && skel) skel.visible = v;
    if (k === 'ik') ch.T.ik = v;
    if (k === 'twist') ch.T.twist = v;
    if (k === 'lean') ch.T.lean = v;
    if (k === 'shadows') {
      W.renderer.shadowMap.enabled = v;
      W.scene.traverse((o) => {
        if (o.material) o.material.needsUpdate = true;
      });
    }
  };
  const BENCH = new THREE.Vector3(-26, 0, -16);
  const setView = (v) => {
    cam.mode = v === 'bench' ? 'fixed' : 'follow';
    cam.fixed = { pos: BENCH.clone().add(new THREE.Vector3(4, 1.9, 8.2)), look: BENCH.clone().add(new THREE.Vector3(4, 0.8, 0)) };
  };

  // ---------- loop ----------
  let last = performance.now();
  let hudT = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!ready) return;
    const t0 = performance.now();
    // input -> world-space move (same mapping as js/game/player.js)
    const k = (c) => keys.has(c);
    const mz = U.clamp((k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + virt.fwd, -1, 1);
    const mx = U.clamp((k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + virt.right, -1, 1);
    const fx = Math.sin(cam.yaw);
    const fz = Math.cos(cam.yaw);
    let wx = fx * mz - fz * mx;
    let wz = fz * mz + fx * mx;
    const m = Math.hypot(wx, wz);
    if (m > 1) {
      wx /= m;
      wz /= m;
    }
    if (take('KeyF')) ch.S.rifle = !ch.S.rifle;
    if (take('KeyV')) walkToggle = !walkToggle;
    if (take('KeyH')) setOpt('skeleton', !opts.skeleton);
    if (take('KeyB')) setView(cam.mode === 'fixed' ? 'follow' : 'bench');
    const inp = {
      mx: wx,
      mz: wz,
      camYaw: cam.yaw,
      camPitch: cam.pitch,
      sprint: k('ShiftLeft') || k('ShiftRight') || virt.sprint,
      walk: walkToggle || virt.walk,
      jump: take('Space') || take('virtJump'),
      dodge: take('KeyQ') || take('virtDodge'),
      slide: take('KeyC') || take('virtSlide'),
      aim: mouse.rmb || virt.aim,
      shoot: mouse.lmbPressed || take('virtShoot'),
      back: mz < -0.3,
    };
    mouse.lmbPressed = false;
    Object.assign(lastInp, inp);
    ch.update(dt, inp);
    if (bench) bench.update(dt);
    place(dt, ch.S.pos, ch);
    W.sun.position.set(ch.S.pos.x + 8, 14, ch.S.pos.z + 6);
    W.sun.target.position.copy(ch.S.pos);
    stats.msAcc += performance.now() - t0;
    W.renderer.info.reset();
    W.renderer.render(W.scene, W.camera);
    stats.calls = W.renderer.info.render.calls;
    stats.tris = W.renderer.info.render.triangles;
    stats.frames++;
    stats.acc += dt;
    if (stats.acc >= 0.5) {
      stats.fps = Math.round(stats.frames / stats.acc);
      stats.ms = stats.msAcc / stats.frames;
      stats.frames = 0;
      stats.acc = 0;
      stats.msAcc = 0;
    }
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.1;
      if (!hud.matches(':hover')) hud.innerHTML = hudHtml();
    }
  };
  requestAnimationFrame(frame);

  // ---------- boot ----------
  (async () => {
    try {
      status.textContent = 'loading models...';
      const [ual, knight, fem, ak] = await Promise.all([
        load(ASSETS.ual),
        load(ASSETS.knight),
        load(ASSETS.fem),
        load(ASSETS.ak).catch(() => null),
      ]);
      ch = LabChar.create(ual, { tint: '#86c79a' });
      W.scene.add(ch.root);
      if (ak) {
        const g = ak.scene;
        g.traverse((o) => {
          if (o.isMesh) o.castShadow = true;
        });
        // support hand: in front of the trigger guard, on the left of the receiver. The UAL
        // Standard gun poses are pistol poses (both hands meet at the grip, arms extended): the
        // AK foregrip (0, -0.014, 0.37) is out of the left arm's reach from that pose
        ch.setGunModel(g, new THREE.Vector3(-0.045, -0.03, 0.11), new THREE.Vector3(0, -0.045, -0.015));
      }
      skel = new THREE.SkeletonHelper(ch.model);
      skel.visible = false;
      W.scene.add(skel);
      bench = LabRetarget.build(W.scene, BENCH, ual, knight, fem, ['Walk_Loop']);
      ch.teleport(0, 0, 0, 0);
      status.textContent = '';
      ready = true;
    } catch (e) {
      status.textContent = 'load error: ' + e.message;
      console.error(e);
    }
  })();

  // ---------- scripted control (QA) ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__lab = {
    get ready() {
      return ready;
    },
    get ch() {
      return ch;
    },
    get bench() {
      return bench;
    },
    cam,
    virt,
    opts,
    setOpt,
    setView,
    lastInp,
    press: (what) => pressed.add({ jump: 'virtJump', dodge: 'virtDodge', slide: 'virtSlide', shoot: 'virtShoot', rifle: 'KeyF' }[what] || what),
    hold: (o) => Object.assign(virt, o),
    release: () => Object.assign(virt, { fwd: 0, right: 0, sprint: false, walk: false, aim: false }),
    wait: sleep,
    stats: () => ({ fps: stats.fps, cpuMs: +stats.ms.toFixed(2), calls: stats.calls, tris: stats.tris, bones: ch.boneCount, geometries: W.renderer.info.memory.geometries, textures: W.renderer.info.memory.textures }),
    state: () => {
      const S = ch.S;
      return {
        label: S.label,
        state: S.state,
        pos: S.pos.toArray().map((x) => +x.toFixed(2)),
        speed: +Math.hypot(S.vel.x, S.vel.z).toFixed(2),
        grounded: S.grounded,
        weapon: +(S.Ueff || 0).toFixed(2),
        aim: +S.aimK.toFixed(2),
        twist: +S.twist.toFixed(2),
        O: +(S.O || 0).toFixed(2),
        blend: Object.fromEntries(Object.entries(S.blend).map(([k, v]) => [k, +v.toFixed(2)])),
        actions: ch.debug().map(([n, lo, up]) => n + ' ' + lo.toFixed(2) + '/' + up.toFixed(2)),
      };
    },
    teleport: (x, y, z, yaw) => ch.teleport(x, y, z, yaw),
    retarget: (clip) => bench.setClip(clip),
    hud: (on) => {
      hud.style.display = help.style.display = on ? '' : 'none';
    },
  };
})();
