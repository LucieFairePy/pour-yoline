let introSplit,
  introLook = null;
enter.intro = () => {
  if (WD) {
    WD.nameU.uOut.value = 0;
    gsap.fromTo(
      WD.nameU.uIn,
      { value: 0 },
      { value: 1, duration: 4.4, ease: 'power2.out', delay: 0.2 },
    );
    pose({ yaw: -2.55, face: 0 }, 0.1);
    gsap.to(WD.P, {
      dx: W / H < 0.8 ? 0.12 : 0.16,
      dy: W / H < 0.8 ? -0.36 : -0.16,
      duration: 2.5,
      ease: 'power2.out',
    });
    introLook = gsap
      .timeline({ delay: 3.2 })
      .add(() => pose({ yaw: -0.5, face: 0.3 }, 1.6))
      .add(() => view({ look: 0.7 }, 1.6))
      .add(() => {
        pose({ yaw: -2.4, face: 0 }, 1.8);
        view({ look: 0.12 }, 1.8);
      }, '+=2.6');
  }
  introSplit = introSplit || lines('#iSub');
  gsap
    .timeline({ delay: 0.9 })
    .from('#iEyebrow', {
      autoAlpha: 0,
      y: 20,
      filter: 'blur(8px)',
      duration: 1.4,
      ease: 'expo.out',
    })
    .from(introSplit.lines, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, '<.6')
    .from('#start', { autoAlpha: 0, scale: 0.85, duration: 1.2, ease: 'elastic.out(1,.6)' }, '<.4')
    .from('#iHint', { autoAlpha: 0, duration: 1 }, '<.5');
};
leave.intro = () => {
  introLook && introLook.kill();
  WD && gsap.to(WD.nameU.uOut, { value: 1, duration: 1.3, ease: 'power2.in' });
};
$('#start').addEventListener('click', () => {
  setSound(true);
  enableGyro();
  warpTo('letter');
});
const prevYes = store.get('yoline-yes');
if (prevYes)
  $('#iSub').textContent =
    `Tu as déjà dit oui, le ${fmtDay.format(new Date(+prevYes))}. On peut refaire le voyage.`;
