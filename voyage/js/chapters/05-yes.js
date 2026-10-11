let yesAt = Date.now(),
  sinceTimer = null,
  yesSplit,
  fwTimer = null,
  finaleOn = false,
  finaleTl = null;
const pad = (n) => String(n).padStart(2, '0');
function tick() {
  const s = Math.max(0, Math.floor((Date.now() - yesAt) / 1000));
  $('#since').textContent =
    `${pad(Math.floor(s / 86400))} j ${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
function boomSound(scale = 1) {
  if (!A.ac || !A.on) return;
  const ac = A.ac,
    t = ac.currentTime + 0.02,
    v = Math.min(1.3, scale);
  const o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 0.7);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.45 * v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1);
  o.connect(g);
  g.connect(A.master);
  o.start(t);
  o.stop(t + 1.05);
  const src = ac.createBufferSource();
  src.buffer = A.noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 800;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.3 * v, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  src.connect(f);
  f.connect(ng);
  ng.connect(A.master);
  src.start(t, rr(0, 1.5));
  src.stop(t + 0.6);
  for (let k = 0; k < 16; k++) {
    const tt = t + 0.3 + Math.random() * 1.3,
      s2 = ac.createBufferSource();
    s2.buffer = A.noiseBuf;
    const hf = ac.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.value = 2800 + Math.random() * 3500;
    const cg = ac.createGain();
    cg.gain.setValueAtTime(0, tt);
    cg.gain.linearRampToValueAtTime(0.05 * v, tt + 0.002);
    cg.gain.exponentialRampToValueAtTime(0.001, tt + 0.03);
    s2.connect(hf);
    hf.connect(cg);
    cg.connect(A.master);
    s2.start(tt, rr(0, 1.5));
    s2.stop(tt + 0.05);
  }
}
function whistleSound() {
  if (!A.ac || !A.on) return;
  const ac = A.ac,
    t = ac.currentTime + 0.01,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.setValueAtTime(500 + Math.random() * 200, t);
  o.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 500, t + 1.1);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.018, t + 0.1);
  g.gain.linearRampToValueAtTime(0, t + 1.2);
  o.connect(g);
  g.connect(A.master);
  o.start(t);
  o.stop(t + 1.25);
}
function risingSwell() {
  if (!A.ac || !A.on) return;
  const t = A.ac.currentTime + 0.05;
  swell(t, 6, 0.07);
  [0, 7, 12, 16, 19, 24, 28, 31].forEach((iv, k) =>
    bell(48 + KEY + iv, t + k * 0.7, 0.55, 4, 0.05),
  );
}
if (WD) {
  WD.FW.onBoom = (s) => boomSound(s);
  WD.FW.onLaunch = () => {
    if (Math.random() < 0.6) whistleSound();
  };
}
const SHAPES = ['sphere', 'peony', 'ring', 'heart', 'willow', 'sphere', 'heart'];
function volley(n, { shape, scale = 1, spread = 650 } = {}) {
  if (!WD) return;
  for (let k = 0; k < n; k++)
    setTimeout(
      () => {
        if (current !== 'yes' && current !== 'end') return;
        const p = WD.FW.target();
        WD.FW.launch({
          ...p,
          shape: shape || SHAPES[Math.floor(Math.random() * SHAPES.length)],
          scale: scale * (0.85 + Math.random() * 0.35),
        });
      },
      k * spread * (0.6 + Math.random() * 0.8),
    );
}
function grandBouquet() {
  if (!WD) return;
  const hw = Math.min(60, 105 * (W / H) * 0.6);
  for (let k = 0; k < 7; k++)
    setTimeout(() => {
      const x = 2 + ((k - 3) / 3) * hw,
        y = 20 + Math.sin((k / 6) * Math.PI) * 18;
      WD.FW.launch({
        x,
        y,
        z: -170,
        shape: k === 3 ? 'heart' : k % 2 ? 'heart' : 'peony',
        scale: k === 3 ? 1.7 : 1.15,
        pal: k === 3 ? [0xff2a55, 0xffffff] : undefined,
      });
    }, k * 90);
  setTimeout(() => {
    flash(0.55, 1.6, 0xffd6e6);
    kick(1.6);
    buzz([100, 50, 220]);
    fanfare();
  }, 1500);
}
function startFireworks() {
  clearInterval(fwTimer);
  fwTimer = setInterval(() => {
    if (current === 'yes' || current === 'end') volley(1 + Math.floor(Math.random() * 2));
  }, 1700);
}
function resetFinale() {
  if (!WD) return;
  finaleTl && finaleTl.kill();
  clearInterval(fwTimer);
  gsap.killTweensOf(WD.FIN);
  gsap.to(WD.FIN, { third: 0, side: 0, duration: 1.2, ease: 'power2.inOut' });
  WD.FIN.heart = 0;
  finaleOn = false;
  gsap.to(WD.HGU.core.material, { opacity: 0, duration: 0.5 });
}
function revealYesText(delay) {
  yesSplit = yesSplit || SplitText.create('#yesTitle', { type: 'chars,words', mask: 'words' });
  gsap.set(['.yesTop', '.yesBottom'], { autoAlpha: 1 });
  gsap
    .timeline({ delay })
    .from('.yesTop .label', { autoAlpha: 0, y: 10, duration: 0.8 })
    .from(
      yesSplit.chars,
      { yPercent: 120, rotation: 10, duration: 1.5, ease: 'expo.out', stagger: 0.05 },
      '<.2',
    )
    .from(
      '#yesLine',
      { autoAlpha: 0, y: 16, filter: 'blur(6px)', duration: 1.2, ease: 'expo.out' },
      '<.8',
    )
    .from(
      '.yesBottom > *',
      { autoAlpha: 0, y: 24, filter: 'blur(6px)', duration: 1.2, ease: 'expo.out', stagger: 0.15 },
      '<.6',
    );
}
enter.yes = () => {
  yesSeen = true;
  heart(true, 1.3, 1.0);
  const d = new Date(yesAt);
  $('#when').textContent = `${fmtDay.format(d)}, ${fmtTime.format(d)}`;
  tick();
  clearInterval(sinceTimer);
  sinceTimer = setInterval(tick, 1000);
  gsap.set(['.yesTop', '.yesBottom'], { autoAlpha: 0 });
  if (!WD) {
    floatHearts = true;
    revealYesText(0.3);
    return;
  }
  const F = WD.FIN,
    first = !finaleOn;
  finaleOn = true;
  gsap.killTweensOf(WD.BH);
  WD.BH.s = 0;
  rumble(0);
  gsap.to(WD.dimU, { value: 0, duration: 1 });
  gsap.to(WD.POST, { duration: 0 });
  WD.POST.uGloom.value = 0;
  WD.S.shake = 0;
  view({ look: 0, lookY: 0 }, 2);
  gsap.to(WD.P, {
    yaw: Math.PI,
    face: 0,
    thrust: 0.7,
    duration: 3,
    ease: 'power2.inOut',
    overwrite: 'auto',
  });
  if (first) {
    finaleTl && finaleTl.kill();
    finaleTl = gsap
      .timeline()
      .to(F, { side: 1, duration: 3.4, ease: 'power2.inOut' }, 0.3)
      .add(() => volley(3, { spread: 500 }), 0.6)
      .to(F, { third: 1, duration: 6, ease: 'power2.inOut' }, 1.5)
      .add(risingSwell, 2)
      .to(F, { heart: 1, duration: 8.5, ease: 'power1.inOut' }, 2.2)
      .to(WD.HGU.core.material, { opacity: 0.55, duration: 6 }, 5)
      .add(() => volley(4, { spread: 520 }), 3.2)
      .add(() => volley(5, { spread: 480 }), 6)
      .add(grandBouquet, 9.2)
      .add(() => {
        floatHearts = true;
        revealYesText(0);
        startFireworks();
      }, 11.2)
      .add(() => {
        pose({ face: -1.1 }, 1.6);
        gsap.to(WD.visorU.uGlow, { value: 1, duration: 1, yoyo: true, repeat: 1 });
      }, 14)
      .add(() => pose({ face: 0 }, 2), 18);
    gsap.fromTo(
      F,
      { orbit: -0.32 },
      { orbit: 0.32, duration: 20, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 },
    );
  } else {
    gsap.to(F, { side: 1, third: 1, heart: 1, duration: 2.5, ease: 'power2.inOut' });
    gsap.to(WD.HGU.core.material, { opacity: 0.55, duration: 2 });
    volley(4, { spread: 400 });
    startFireworks();
    floatHearts = true;
    revealYesText(0.8);
  }
};
$('#more').addEventListener('click', (e) => {
  heartBurst(...pt(e));
  fanfare();
  kick(1);
  grandBouquet();
  if (WD)
    gsap.fromTo(WD.P, { twirl: 0 }, { twirl: Math.PI * 2, duration: 2.2, ease: 'power3.inOut' });
});
$('#reread').addEventListener('click', () => {
  resetFinale();
  floatHearts = false;
  warpTo('letter');
});
$('#toEnd').addEventListener('click', () => warpTo('end'));
$('#s-yes').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  heartBurst(e.clientX, e.clientY);
  sparkle();
  if (WD && WD.FIN.third > 0.9) {
    const p = WD.FW.target();
    p.x = 2 + (e.clientX / W - 0.5) * 2 * Math.min(70, 105 * (W / H) * 0.75);
    p.y = 8 + (1 - e.clientY / H) * 50;
    WD.FW.launch({ ...p, shape: 'heart', scale: 1.1 });
  }
});
