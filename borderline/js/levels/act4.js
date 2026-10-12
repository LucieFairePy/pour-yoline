(() => {
  const T = CONFIG;
  const local = { step: -1, glitch: 0 };

  const steps = [
    () => {
      Sound.play('glitch');
      Sound.mood('dark');
      City.mood({ gold: 0.4, red: 1 });
      BigScreen.show('🃏', 'LE JOKER', '#ff2a3a');
      HUD.visa('🃏 · ' + T.joker);
      Cam.shake = 0.25;
    },
    () => {
      T.act4.lines.forEach((l) => HUD.say(l, T.joker, 1800));
    },
    async () => {
      Sound.play('rumble', 2);
      Sound.play('fall');
      Cam.shake = 0.6;
      await sleep(600);
      $('fade').style.background = '#fff';
      await fadeTo(true);
      const sp = Story.role === 'dame' ? V3(45, 0, -15) : V3(75, 0, -45);
      Player.teleport(sp, 0);
      Cam.snap(sp, Math.atan2(City.TOWER.x - sp.x, City.TOWER.z - sp.z));
      Cam.pitch = -0.35;
      City.mood({ gray: 1 });
      Object.keys(City.places).forEach((id) => City.pillar(id, false));
      City.rocketsOn(false);
      await sleep(400);
      fadeTo(false);
      await sleep(800);
      $('fade').style.background = '';
    },
    () => {
      HUD.visa(T.act4.after);
      HUD.say(T.act4.after, T.joker, 2200);
      BigScreen.show('Visa : 0', 'LE JOKER', '#ff2a3a');
    },
  ];

  Story.register('act4', {
    init: () => ({ step: 0 }),
    partner: () => false,
    voice: (c) => (c.S.x.step >= 2 ? 0 : 1),
    enter(c) {
      local.step = -1;
      Player.mode = 'frozen';
      HUD.objective('');
      this.apply(c);
    },
    exit() {
      Player.mode = 'walk';
    },
    apply(c) {
      while (local.step < c.S.x.step) {
        local.step++;
        steps[local.step]();
      }
    },
    host(c) {
      const t = c.phaseT;
      const want = t > 13 ? 3 : t > 10 ? 2 : t > 3.5 ? 1 : 0;
      if (want !== c.S.x.step) c.set((s) => (s.x.step = want));
      if (t > 17) c.goto('act5');
    },
    update(c, dt) {
      local.glitch -= dt;
      if (local.glitch <= 0 && c.S.x.step < 2) {
        local.glitch = 0.6 + Math.random() * 1.2;
        Sound.play('glitch');
        Cam.shake = Math.max(Cam.shake, 0.15);
      }
      return null;
    },
  });
})();
