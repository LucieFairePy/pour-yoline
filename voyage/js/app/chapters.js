const CHAP = {
  intro: { n: '00', name: 'Départ' },
  letter: { n: 'I', name: 'La lettre' },
  rose: { n: 'II', name: 'La rose' },
  stars: { n: 'III', name: 'Les étoiles' },
  ask: { n: 'IV', name: 'La question' },
  yes: { n: 'V', name: 'Oui' },
  end: { n: 'VI', name: 'Générique' },
};
const ORDER = Object.keys(CHAP);
const LEVEL = { intro: 0, letter: 0.5, rose: 1, stars: 1, ask: 1, yes: 2, end: 1 };
let current = null,
  busy = false;
const enter = {},
  leave = {};
function hud(id) {
  const c = CHAP[id];
  gsap.to('#chapNum', { duration: 0.8, scrambleText: { text: c.n, chars: 'IVX0', speed: 0.4 } });
  gsap.to('#chapName', {
    duration: 1,
    scrambleText: { text: c.name, chars: 'lowerCase', speed: 0.4 },
  });
  $$('#prog i').forEach((el, i) => el.classList.toggle('on', i < ORDER.indexOf(id)));
}
function showDom(id) {
  $$('.scene').forEach((s) => s.classList.toggle('on', s.id === 's-' + id));
}
function setWorld(id) {
  if (!WD) return;
  const key = id === 'end' ? 'yes' : id;
  Object.entries(WD.groups).forEach(([k, g]) => {
    if (k !== 'end') g.visible = k === key;
  });
}
function show(id) {
  if (current && leave[current]) leave[current]();
  showDom(id);
  setWorld(id);
  current = id;
  hud(id);
  setLevel(LEVEL[id]);
  enter[id] && enter[id]();
}
async function chapterCard(id) {
  const c = CHAP[id],
    card = $('#card');
  $('#cardNum').textContent = 'Chapitre ' + c.n;
  $('#cardTtl').textContent = c.name;
  gsap.set(card, { autoAlpha: 1 });
  const st = SplitText.create('#cardTtl', { type: 'chars', mask: 'chars' });
  await gsap
    .timeline()
    .from('#cardNum', { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power3.out' })
    .from(
      st.chars,
      { yPercent: 110, rotate: 8, duration: 0.9, ease: 'expo.out', stagger: 0.035 },
      '<.1',
    )
    .to(
      '#card .inner',
      { autoAlpha: 0, y: -20, filter: 'blur(6px)', duration: 0.55, ease: 'power2.in' },
      '+=.45',
    );
  st.revert();
  gsap.set(card, { autoAlpha: 0 });
  gsap.set('#card .inner', { clearProps: 'all' });
}
async function warpTo(id) {
  if (busy) return;
  busy = true;
  if (!WD || reduced) {
    await gsap.to('#stage', { autoAlpha: 0, duration: 0.4 });
    show(id);
    await gsap.to('#stage', { autoAlpha: 1, duration: 0.5 });
    busy = false;
    return;
  }
  const from = current,
    gFrom = WD.groups[from === 'end' ? 'yes' : from],
    gTo = WD.groups[id === 'end' ? 'yes' : id],
    S = WD.S,
    P = WD.P;
  if (leave[from]) leave[from]();
  gsap.to('#stage', { autoAlpha: 0, duration: 0.5 });
  warpSound();
  buzz([15, 80, 25]);
  const tl = gsap.timeline();
  tl.to(S, { warp: 1, look: 0, lookY: 0, duration: 1.4, ease: 'power3.in' }, 0)
    .to(P, { thrust: 1.7, lean: 0.55, face: 0, dx: 0, dy: 0, duration: 1.2, ease: 'power2.in' }, 0)
    .to(P, { yaw: WD.FIN.third > 0.5 ? Math.PI : -2.75, duration: 1.2, ease: 'power2.inOut' }, 0);
  if (gFrom && gFrom !== gTo)
    tl.to(gFrom.position, { z: gFrom.userData.rest.z + 140, duration: 1.4, ease: 'power3.in' }, 0);
  await tl;
  flash(0.28, 0.8, 0xfff0f6);
  kick(1.2);
  if (gFrom && gFrom !== gTo) {
    gFrom.visible = false;
    gFrom.position.copy(gFrom.userData.rest);
  }
  showDom(id);
  current = id;
  hud(id);
  setLevel(LEVEL[id]);
  if (id !== 'letter') WD.ENV.g.visible = false;
  if (gTo) {
    gTo.visible = true;
    gTo.position.copy(gTo.userData.rest);
    gTo.position.z -= 460;
  }
  if (id === 'intro') WD.buildName();
  const card = chapterCard(id);
  await wait(950);
  const tl2 = gsap.timeline();
  if (gTo) tl2.to(gTo.position, { z: gTo.userData.rest.z, duration: 2.4, ease: 'expo.out' }, 0);
  tl2
    .to(S, { warp: 0, duration: 1.9, ease: 'power3.out' }, 0)
    .to(P, { thrust: 0.55, lean: 0, duration: 2, ease: 'power2.out' }, 0);
  await card;
  enter[id] && enter[id]();
  gsap.to('#stage', { autoAlpha: 1, duration: 0.8 });
  await tl2;
  busy = false;
}
const pt = (e, el) => {
  if (e && e.clientX) return [e.clientX, e.clientY];
  const r = (el || e.currentTarget).getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};
const lines = (sel) =>
  SplitText.create(sel, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
const pose = (vals, dur = 2, ease = 'power3.inOut') =>
  WD && gsap.to(WD.P, { ...vals, duration: dur, ease, overwrite: 'auto' });
const view = (vals, dur = 2, ease = 'power2.inOut') =>
  WD && gsap.to(WD.S, { ...vals, duration: dur, ease, overwrite: 'auto' });
