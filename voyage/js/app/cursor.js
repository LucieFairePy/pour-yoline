if (fine && !reduced) {
  document.documentElement.classList.add('has-cursor');
  const dot = $('#cursor .dot'),
    ring = $('#cursor .ring');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }),
    dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }),
    ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    $('#cursor').classList.add('live');
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor]');
    $('#cursor').classList.toggle('hover', !!t);
    if (t) $('#cursorTxt').textContent = t.dataset.cursor;
  });
  $$('.magnetic').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1,.4)' }),
      my = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1,.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.35);
      my((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener('pointerleave', () => {
      mx(0);
      my(0);
    });
  });
}
document.addEventListener('pointerover', (e) => {
  if (
    e.pointerType === 'mouse' &&
    e.target.closest('button') &&
    !e.target.closest('button').contains(e.relatedTarget)
  )
    sparkle();
});
