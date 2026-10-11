const kick = (a) =>
  WD &&
  gsap.fromTo(
    WD.POST.uAberr,
    { value: a },
    { value: 0, duration: 1.4, ease: 'expo.out', overwrite: 'auto' },
  );
const flash = (amt = 0.6, dur = 1, c) => {
  if (!WD) return;
  if (c) WD.POST.uFlashC.value.set(c);
  gsap.fromTo(WD.POST.uFlash, { value: amt }, { value: 0, duration: dur, overwrite: 'auto' });
};
