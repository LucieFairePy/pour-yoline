let last = performance.now();
const perf = { f: 0, acc: 0, checked: 0 };
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  time.value = t;
  beatTick();
  nebU.uBeat.value = beatEnv();
  S.mx += (S.tmx - S.mx) * 0.05;
  S.my += (S.tmy - S.my) * 0.05;
  const shake = S.shake * (Math.sin(t * 37) * 0.6 + Math.sin(t * 23) * 0.4) * 0.02;
  head.rotation.set(
    S.my * 0.12 + S.lookY + shake,
    -S.look * LAY.lookHer - S.mx * 0.2 + shake * 0.5,
    Math.sin(t * 0.4) * 0.01 - S.warp * 0.02,
  );
  if (FIN.third > 0.001) {
    const e = FIN.third;
    const asp = W / H,
      wide = asp > 1.05;
    const cz = Math.max(2.7, 1.0 / (0.5206 * asp)),
      cx = wide ? -1.05 : 0.3,
      amp = wide ? 0.8 : 0.35;
    camera.position.set(
      (cx + Math.sin(FIN.orbit) * amp) * e,
      (0.36 + (wide ? 0 : 0.15) + Math.sin(t * 0.2) * 0.04) * e,
      (cz + Math.cos(FIN.orbit) * 0.3) * e,
    );
    camTgt.set((cx + 0.12) * e, -0.15 + (wide ? 4.4 : 6.1) * e, -1 - 39 * e);
    rig.localToWorld(camTgt);
    camera.lookAt(camTgt);
  } else if (camera.position.lengthSq() > 0) {
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
  }
  camera.fov = S.fovBase + S.warp * 48;
  camera.updateProjectionMatrix();
  warpU.uWarp.value = S.warp;
  POST.uWarp.value = S.warp;
  Object.values(groups).forEach((g) => {
    if (g.visible && g.userData.spin) g.userData.spin.rotation.y += dt * 0.02;
  });
  if (BH.s > 0) {
    const sp = BH.pos.clone().project(camera);
    POST.uBHPos.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    POST.uBHR.value = BH.r * BH.s;
    POST.uBH.value = sp.z < 1 ? BH.s : 0;
  } else POST.uBH.value = 0;
  POST.uAspect.value = W / H;
  if (nameG) {
    nameG.visible = groups.intro.visible && nameU.uOut.value < 0.999;
    nameG.position.y = nameG.userData.y + Math.sin(t * 0.23) * 0.06 * NS;
    nameG.rotation.set(
      Math.sin(t * 0.19) * 0.02,
      nameG.userData.yaw + Math.sin(t * 0.17) * 0.06,
      Math.sin(t * 0.13) * 0.008,
    );
  }
  updateBodies(t, dt);
  updateRose(t);
  SHOOT.update(t, dt);
  FW.update(dt);
  HGU.uForm.value = FIN.heart;
  HGU.uBeat.value = nebU.uBeat.value;
  if (ENV.g.visible) ENV.g.rotation.y += Math.sin(t * 1.3) * 0.0008;
  aimShadow();
  composer ? composer.render() : renderer.render(scene, camera);
  if (perf.checked < 5) {
    perf.f++;
    perf.acc += dt;
    if (perf.f >= 90) {
      const fps = perf.f / perf.acc;
      perf.f = 0;
      perf.acc = 0;
      perf.checked++;
      if (fps < 32) {
        if (PR > 1.25) {
          PR = Math.max(1.25, PR * 0.75);
          renderer.setPixelRatio(PR);
          composer && composer.setPixelRatio && composer.setPixelRatio(PR);
          resize();
        } else if (PR > 1) {
          PR = 1;
          renderer.setPixelRatio(1);
          composer && composer.setPixelRatio && composer.setPixelRatio(1);
          resize();
        } else if (bloom) bloom.enabled = false;
      }
    }
  }
  requestAnimationFrame(loop);
}
function resize() {
  W = innerWidth;
  H = innerHeight;
  renderer.setSize(W, H, false);
  composer && composer.setSize(W, H);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  layout();
  pxU.value = PR;
  if (nameG && groups.intro.visible) buildName();
}
addEventListener('resize', resize);
requestAnimationFrame(loop);

const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2();
function hitEnvelope(x, y) {
  if (!ENV.g.visible) return false;
  ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(ENV.g, true).length > 0;
}
function screenOf(obj) {
  const v = obj.getWorldPosition(new THREE.Vector3()).project(camera);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
}

WD = {
  bloomPass: () => bloom,
  composer: () => composer,
  renderer,
  scene,
  camera,
  rig,
  head,
  S,
  P,
  Y,
  ME,
  MEB,
  FIN,
  FW,
  HGU,
  ENV,
  RS,
  BH,
  POST,
  nebU,
  nameU,
  novaU,
  visorU,
  groups,
  buildName,
  dimU,
  LAY,
  hitEnvelope,
  screenOf,
  SUN,
};
