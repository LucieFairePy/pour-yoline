let starsSplit;
const HOLD = { v: 0, on: false, done: false, step: -1, ready: false };
const HOLD_MSG = [
  'Pose ton doigt sur le cœur. Ne le lève pas.',
  'Tu le sens ?',
  'Il accélère.',
  'C’est ce que tu me fais.',
  'Encore un peu…',
];
enter.stars = () => {
  if (WD) {
    WD.nebU.uMorph.value = 0;
    pose({ yaw: -2.3, face: 0 }, 1.5);
    view({ look: 0.05, lookY: 0.06 }, 2);
  }
  starsSplit = starsSplit || [lines('#st1'), lines('#st2'), lines('#st3')];
  gsap.set('#holdbox', { autoAlpha: 0 });
  const fill = $('#holdFill'),
    L = 2 * Math.PI * 46;
  gsap.set(fill, { strokeDasharray: L, strokeDashoffset: L });
  const n1 = { v: 0 },
    n2 = { v: 0 };
  gsap
    .timeline({ delay: 0.5 })
    .from(starsSplit[0].lines, { yPercent: 110, duration: 1.3, ease: 'expo.out' })
    .to(
      n1,
      {
        v: 8100000000,
        duration: 2.2,
        ease: 'power3.out',
        onUpdate: () => ($('#n1').textContent = fmtNum.format(Math.round(n1.v / 1e6) * 1e6)),
      },
      '<.2',
    )
    .from(starsSplit[1].lines, { yPercent: 110, duration: 1.3, ease: 'expo.out' }, '+=.2')
    .to(
      n2,
      {
        v: 200000000000,
        duration: 2.4,
        ease: 'power3.out',
        onUpdate: () => ($('#n2').textContent = fmtNum.format(Math.round(n2.v / 1e9) * 1e9)),
      },
      '<.2',
    )
    .add(() => {
      if (WD) gsap.to(WD.nebU.uMorph, { value: 1, duration: 3.4, ease: 'none' });
      heart(true, 1, 1.2);
      pose({ yaw: -0.6, face: 0.3 }, 2.2);
      view({ look: 0.08, lookY: 0.07 }, 2.2);
    }, '+=.4')
    .from(starsSplit[2].lines, { yPercent: 110, duration: 1.6, ease: 'expo.out' }, '<.8')
    .to('#holdbox', { autoAlpha: 1, duration: 1 }, '+=1.2')
    .from('#hold', { scale: 0.5, duration: 1.3, ease: 'elastic.out(1,.5)' }, '<')
    .add(() => {
      HOLD.ready = true;
    });
};
function holdUpdate(dt) {
  if (current !== 'stars' || HOLD.done || !HOLD.ready) return;
  HOLD.v = clamp(HOLD.v + (HOLD.on ? dt / 3.4 : -dt / 1.1), 0, 1);
  gsap.set('#holdFill', { strokeDashoffset: 2 * Math.PI * 46 * (1 - HOLD.v) });
  gsap.set('#hold', { scale: 1 + HOLD.v * 0.18 });
  HB.period = 1.2 - 0.78 * HOLD.v;
  HB.vibe = HOLD.on;
  if (WD) {
    WD.nebU.uCharge.value = HOLD.v;
    WD.P.thrust = 0.55 + HOLD.v * 1.2;
    WD.visorU.uGlow.value = HOLD.v;
  }
  const step = HOLD.v <= 0.02 ? 0 : HOLD.v < 0.3 ? 1 : HOLD.v < 0.6 ? 2 : HOLD.v < 0.88 ? 3 : 4;
  if (step !== HOLD.step) {
    HOLD.step = step;
    gsap.to('#holdTxt', {
      duration: 0.6,
      scrambleText: { text: HOLD_MSG[step], chars: 'lowerCase', speed: 0.6 },
    });
  }
  if (HOLD.v >= 1) {
    HOLD.done = true;
    HOLD.on = false;
    HB.vibe = false;
    const [x, y] = pt(null, $('#hold'));
    heartBurst(x, y);
    burst(W / 2, H * 0.3, 80, 10);
    buzz([80, 40, 200]);
    fanfare();
    kick(1.2);
    flash(1, 1.4, 0xffd0e4);
    if (WD) {
      gsap.to(WD.nebU.uCharge, { value: 0, duration: 2 });
      gsap.to(WD.visorU.uGlow, { value: 0, duration: 2 });
    }
    gsap.to(HB, { period: 1.2, duration: 2 });
    setTimeout(() => warpTo('ask'), 900);
  }
}
(function holdLoop() {
  let l = performance.now();
  (function f(n) {
    holdUpdate(Math.min(0.05, (n - l) / 1000));
    l = n;
    requestAnimationFrame(f);
  })(l);
})();
const holdBtn = $('#hold');
holdBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  HOLD.on = true;
  try {
    holdBtn.setPointerCapture(e.pointerId);
  } catch (_) {}
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
  holdBtn.addEventListener(ev, () => {
    HOLD.on = false;
  }),
);
holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
holdBtn.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    HOLD.on = true;
  }
});
holdBtn.addEventListener('keyup', () => {
  HOLD.on = false;
});
