renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sunL.castShadow = true;
sunL.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sunL.shadow.camera, {
  left: -1.3,
  right: 1.3,
  top: 1.3,
  bottom: -1.3,
  near: 0.1,
  far: 14,
});
sunL.shadow.camera.updateProjectionMatrix();
sunL.shadow.bias = -0.0004;
sunL.shadow.normalBias = 0.01;
sunL.shadow.radius = 3;
scene.add(sunL.target);
[Y.g, MEB.g, ME.g, ENV.g].forEach((o) =>
  o.traverse((m) => {
    if (m.isMesh && !m.material.transparent && !m.material.isShaderMaterial) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  }),
);
const rimL = new THREE.DirectionalLight(0xaebcff, 1.15);
rimL.position.set(-3, 2.6, -7);
scene.add(rimL);
const shTgt = new THREE.Vector3(),
  shTmp = new THREE.Vector3();
function aimShadow() {
  Y.g.getWorldPosition(shTgt);
  if (MEB.g.visible) shTgt.lerp(MEB.g.getWorldPosition(shTmp), 0.5);
  sunL.target.position.copy(shTgt);
  sunL.target.updateMatrixWorld();
  sunL.position.copy(shTgt).addScaledVector(SUN, 6);
}
