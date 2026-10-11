let roseSplit,
  roseRain = null,
  roseTouched = false,
  roseSpin = null;
enter.rose = () => {
  if (WD) {
    const RS = WD.RS;
    pose({ yaw: -2.2, face: 0 }, 1.5);
    view({ look: 0.1, lookY: 0.02 }, 2);
    gsap.killTweensOf(RS);
    RS.form = 0;
    RS.bloom = 0;
    RS.flutter = 0;
    gsap.to(RS, { form: 1, duration: 4.8, delay: 2.4, ease: 'power1.inOut' });
    gsap.to(RS, { bloom: 1, duration: 7.5, delay: 4.8, ease: 'power2.inOut' });
    roseSpin && roseSpin.kill();
    roseSpin = gsap.to(RS, { spin: '+=6.2832', duration: 46, repeat: -1, ease: 'none' });
    setTimeout(() => {
      if (current === 'rose') bloomChime();
    }, 4800);
    setTimeout(() => {
      if (current === 'rose') pose({ yaw: -0.6, face: 0.3 }, 1.8);
    }, 9000);
    setTimeout(() => {
      if (current === 'rose') pose({ yaw: -2.2, face: 0 }, 1.8);
    }, 12500);
  }
  clearInterval(roseRain);
  roseRain = setInterval(() => {
    if (current !== 'rose' || reduced) return;
    sparks.push({
      x: Math.random() * W,
      y: -20,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.4 + Math.random() * 0.5,
      life: 1,
      decay: 0.0022,
      s: 8 + Math.random() * 9,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.03,
      c: ['#c21a3a', '#e0405b', '#f07d92'][Math.floor(Math.random() * 3)],
      petal: true,
      flip: Math.random() * 6,
    });
  }, 1300);
  roseSplit = roseSplit || [lines('#r1'), lines('#r2'), lines('#r3')];
  gsap.set(['#toStars', '#roseHint'], { autoAlpha: 0 });
  gsap
    .timeline({ delay: 1.2 })
    .from(roseSplit[0].lines, { yPercent: 110, duration: 1.3, ease: 'expo.out' })
    .from(roseSplit[1].lines, { yPercent: 110, duration: 1.3, ease: 'expo.out' }, '+=2.4')
    .from(roseSplit[2].lines, { yPercent: 110, duration: 1.5, ease: 'expo.out' }, '+=3.4')
    .to('#roseHint', { autoAlpha: 1, duration: 0.8 }, '+=.4')
    .to('#toStars', { autoAlpha: 1, duration: 0.8 }, '+=1')
    .from('#toStars', { y: 20, scale: 0.9, duration: 1.2, ease: 'elastic.out(1,.6)' }, '<');
};
leave.rose = () => {
  clearInterval(roseRain);
  if (WD) {
    gsap.killTweensOf(WD.RS, 'form,bloom');
    gsap.to(WD.RS, { form: 0, duration: 1.6, ease: 'power2.in' });
  }
};
$('#s-rose').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || !WD) return;
  gsap.fromTo(WD.RS, { flutter: 1 }, { flutter: 0, duration: 1.8, ease: 'power2.out' });
  petalBurst(e.clientX, e.clientY, 12);
  sparkle();
  buzz(12);
  if (!roseTouched) {
    roseTouched = true;
    gsap.to('#roseHint', {
      duration: 0.8,
      scrambleText: { text: 'Elle t’aime bien aussi', chars: 'lowerCase', speed: 0.5 },
    });
  }
});
$('#toStars').addEventListener('click', () => warpTo('stars'));
