const Game = (() => {
  let running = false;
  let paused = false;
  let last = 0;
  let sendT = 0;
  let fpsT = 0;
  let frames = 0;
  let fps = 60;
  let role = 'dame';
  const clock = { t: 0 };

  const showPause = (v) => {
    paused = v;
    $('pause').hidden = !v;
    Input.enabled = !v;
  };

  const status = () => {
    const net = Net.connected
      ? '<span style="color:#4fd1b5">●</span> connecté·e·s'
      : '<span style="color:#d8324f">●</span> en attente de l’autre';
    const mic = Sound.hasVoice ? ' · voix' : '';
    HUD.status(`${net}${mic}<br>${fps} fps`);
  };

  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    clock.t += dt;
    const t = clock.t;
    Input.poll();

    if (!paused && Input.pressed('pause') && $('memory').hidden) {
      Input.unlock();
      showPause(true);
    }

    Player.update(dt, Cam.yaw, Cam.pitch);
    Cam.update(dt, Player.body.p, Input.held('sprint'));
    Player.render(dt, t);
    Remote.update(dt, t, Player.targets);
    Story.update(dt, t);
    Sky.update(t, R.camera);
    Sound.listener(R.camera);
    HUD.crosshair(
      role === 'dame' && !!Player.targets && Player.targets().length > 0,
      Player.lockTarget >= 0,
    );

    sendT += dt;
    if (sendT > 0.05) {
      sendT = 0;
      Net.send('p', Player.snapshot());
    }
    frames++;
    fpsT += dt;
    if (fpsT > 1) {
      fps = Math.round(frames / fpsT);
      frames = 0;
      fpsT = 0;
      status();
    }
    R.render();
  };

  const start = (r, progress) => {
    if (running) return;
    running = true;
    role = r;
    Player.init(role);
    Remote.init(role === 'dame' ? 'valet' : 'dame');
    Net.on('p', (s) => Remote.push(s));
    Story.init(role, progress);
    HUD.role(role);
    HUD.show(true);
    Input.enabled = true;
    Input.lock();
    last = performance.now();
    requestAnimationFrame(loop);
  };

  $('gl').addEventListener('click', () => {
    if (running && !paused && $('memory').hidden) Input.lock();
  });
  document.addEventListener('pointerlockchange', () => {
    if (!running) return;
    if (!document.pointerLockElement && $('memory').hidden && !Input.pad && !window.__test)
      showPause(true);
  });
  $('btnResume').onclick = () => {
    showPause(false);
    Input.lock();
  };
  $('optSens').value = SETTINGS.sens;
  $('optInvert').checked = SETTINGS.invert;
  $('optQuality').value = SETTINGS.quality;
  $('optVol').value = SETTINGS.vol;
  $('optSens').oninput = (e) => {
    SETTINGS.sens = +e.target.value;
    saveSettings();
  };
  $('optInvert').onchange = (e) => {
    SETTINGS.invert = e.target.checked;
    saveSettings();
  };
  $('optQuality').onchange = (e) => {
    SETTINGS.quality = e.target.value;
    R.setQuality(SETTINGS.quality);
    saveSettings();
  };
  $('optVol').oninput = (e) => {
    SETTINGS.vol = +e.target.value;
    Sound.volume(SETTINGS.vol);
    saveSettings();
  };

  return { start, clock };
})();

(() => {
  const touch = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  if (!R || touch) {
    $('lobby').hidden = true;
    $('nogl').hidden = false;
    $('noglText').textContent = !R
      ? 'Ton navigateur ne peut pas afficher la 3D. Essaie avec Chrome, Edge ou Firefox à jour.'
      : 'BORDERLINE se joue sur ordinateur, au clavier et à la souris ou à la manette.';
    return;
  }
  R.render();
  Lobby.start(Game.start);
})();
