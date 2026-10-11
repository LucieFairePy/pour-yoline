let touchFade = null,
  gyroOn = false;
function steer(nx, ny) {
  if (WD) {
    WD.S.tmx = nx;
    WD.S.tmy = ny;
  }
}
addEventListener(
  'pointermove',
  (e) => {
    if (!gyroOn) steer((e.clientX / W) * 2 - 1, -((e.clientY / H) * 2 - 1));
  },
  { passive: true },
);
function enableGyro() {
  const D = window.DeviceOrientationEvent;
  if (!D || fine) return;
  const add = () =>
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      gyroOn = true;
      steer(clamp(e.gamma / 30, -1, 1), clamp(-(e.beta - 55) / 30, -1, 1));
    });
  if (typeof D.requestPermission === 'function')
    D.requestPermission()
      .then((s) => {
        if (s === 'granted') add();
      })
      .catch(() => {});
  else add();
}
