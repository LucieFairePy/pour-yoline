let rollTl = null;
enter.end = () => {
  floatHearts = true;
  heart(true, 0.7, 1.2);
  if (WD && WD.FIN.third < 0.5) {
    gsap.to(WD.FIN, { side: 1, third: 1, heart: 1, duration: 3, ease: 'power2.inOut' });
    gsap.to(WD.HGU.core.material, { opacity: 0.55, duration: 2 });
    view({ look: 0, lookY: 0 }, 2);
    pose({ yaw: Math.PI, face: 0 }, 2);
  }
  startFireworks();
  gsap.set('#endbox', { autoAlpha: 0 });
  gsap.set('#skipnote', { autoAlpha: 1 });
  const cr = $('#credits'),
    h = cr.offsetHeight;
  rollTl && rollTl.kill();
  rollTl = gsap
    .timeline()
    .fromTo(cr, { y: H }, { y: -h, duration: Math.max(22, h / 38), ease: 'none' })
    .to('#skipnote', { autoAlpha: 0, duration: 0.4 }, '-=1')
    .add(() => {
      fanfare();
      grandBouquet();
      pose({ face: -1.1 }, 2);
    })
    .to('#endbox', { autoAlpha: 1, duration: 0.1 })
    .from('#endbox > *', {
      autoAlpha: 0,
      y: 30,
      filter: 'blur(8px)',
      duration: 1.4,
      ease: 'expo.out',
      stagger: 0.18,
    });
};
leave.end = () => {
  rollTl && rollTl.kill();
};
const speedUp = (on) => {
  if (rollTl) gsap.to(rollTl, { timeScale: on ? 6 : 1, duration: 0.4 });
};
$('#s-end').addEventListener('pointerdown', (e) => {
  if (!e.target.closest('button')) speedUp(true);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
  $('#s-end').addEventListener(ev, () => speedUp(false)),
);
$('#backYes').addEventListener('click', () => warpTo('yes'));
$('#replay').addEventListener('click', () => {
  gsap.to('body', { autoAlpha: 0, duration: 0.8, onComplete: () => location.reload() });
});
