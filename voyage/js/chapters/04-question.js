const yesBtn = $('#yes'),
  noBtn = $('#no'),
  msg = $('#msg'),
  choices = $('#choices');
let clicks = 0,
  dodging = false,
  dodges = 0,
  falling = false,
  conseq = 0,
  titleSplit;
const bh = (s, dur = 2, ease = 'power2.inOut') =>
  WD && gsap.to(WD.BH, { s, duration: dur, ease, overwrite: 'auto' });
enter.ask = () => {
  pose({ yaw: -0.75, face: 0.2 }, 2);
  view({ look: 0.3, lookY: 0 }, 2);
  titleSplit = titleSplit || SplitText.create('#askTitle', { type: 'words,chars', mask: 'words' });
  gsap
    .timeline({ delay: 0.3 })
    .from('#aLabel', { autoAlpha: 0, y: 10, duration: 0.8 })
    .from(
      titleSplit.chars,
      {
        yPercent: 120,
        rotationX: -90,
        transformOrigin: '50% 100%',
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.022,
      },
      '<.2',
    )
    .from('#yes', { autoAlpha: 0, scale: 0.6, duration: 1.2, ease: 'elastic.out(1,.55)' }, '-=.4')
    .from('#no', { autoAlpha: 0, scale: 0.6, duration: 1.2, ease: 'elastic.out(1,.55)' }, '<.12');
};
yesBtn.addEventListener('pointerenter', (e) => {
  if (e.pointerType !== 'mouse' || current !== 'ask') return;
  burst(e.clientX, e.clientY, 8, 3);
  WD && gsap.to(WD.visorU.uGlow, { value: 1, duration: 0.6 });
  pose({ yaw: -0.5, face: 0.35 }, 0.8);
});
yesBtn.addEventListener('pointerleave', (e) => {
  if (e.pointerType !== 'mouse' || current !== 'ask') return;
  WD && gsap.to(WD.visorU.uGlow, { value: 0, duration: 1 });
});
function say(text) {
  gsap
    .timeline()
    .to(msg, { autoAlpha: 0, y: -8, duration: 0.2, ease: 'power2.in' })
    .add(() => {
      msg.textContent = text;
    })
    .fromTo(
      msg,
      { autoAlpha: 0, y: 10, filter: 'blur(6px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out' },
    );
}
function grow(s) {
  gsap.to(yesBtn, { '--s': s, duration: 1, ease: 'elastic.out(1,.45)' });
}
function relabel(el, text) {
  gsap.to(el, { duration: 0.7, scrambleText: { text, chars: 'NONOUI?!', speed: 0.5 } });
}
function glitch() {
  const t = $('#askTitle');
  gsap
    .timeline()
    .to(t, { x: -6, skewX: 12, textShadow: '3px 0 #d8324f, -3px 0 #6fd3ff', duration: 0.06 })
    .to(t, { x: 5, skewX: -8, duration: 0.06 })
    .to(t, { x: -3, skewX: 4, textShadow: '-2px 0 #d8324f, 2px 0 #6fd3ff', duration: 0.06 })
    .to(t, { x: 0, skewX: 0, clearProps: 'textShadow', duration: 0.2 });
}
function consequence() {
  conseq++;
  gsap.to('#tracker', { autoAlpha: 1, duration: 0.5 });
  $$('#tracker b').forEach((b, i) => b.classList.toggle('on', i < conseq));
  gsap.fromTo('#ask', { x: -10 }, { x: 0, duration: 0.8, ease: 'elastic.out(1.2,.2)' });
  buzz([60, 40, 90]);
  glitch();
  kick(1.4);
}
function freeNo() {
  const r = noBtn.getBoundingClientRect();
  gsap.set(noBtn, { x: 0, y: 0 });
  noBtn.classList.add('runaway');
  noBtn.style.left = r.left + 'px';
  noBtn.style.top = r.top + 'px';
  document.body.appendChild(noBtn);
}
function homeNo() {
  noBtn.classList.remove('runaway');
  gsap.set(noBtn, { x: 0, y: 0, rotation: 0, scale: 1 });
  gsap.set(noBtn, { clearProps: 'left,top,opacity,visibility,transform' });
  choices.appendChild(noBtn);
}
const DODGE = ['Raté.', 'Presque !', 'Il est rapide, hein ?', 'Bon… il est essoufflé. Vas-y.'];
function dodge(e) {
  if (!dodging) return;
  if (e && e.cancelable) e.preventDefault();
  const b = noBtn.getBoundingClientRect(),
    yb = yesBtn.getBoundingClientRect();
  let nx,
    ny,
    tries = 0;
  do {
    nx = 16 + Math.random() * (W - b.width - 32);
    ny = 80 + Math.random() * (H - b.height - 170);
    tries++;
  } while (
    tries < 30 &&
    (Math.hypot(nx - b.left, ny - b.top) < 140 ||
      (nx < yb.right + 24 &&
        nx + b.width > yb.left - 24 &&
        ny < yb.bottom + 24 &&
        ny + b.height > yb.top - 24))
  );
  gsap.to(noBtn, {
    left: nx,
    top: ny,
    rotation: (Math.random() - 0.5) * 24,
    duration: 0.55,
    ease: 'back.out(2.2)',
  });
  burst(b.left + b.width / 2, b.top + b.height / 2, 10, 3);
  noise(0.18, 1400, 3400, 0.1);
  kick(0.3);
  say(DODGE[Math.min(dodges, DODGE.length - 1)]);
  if (++dodges >= 4) {
    dodging = false;
    setTimeout(() => {
      relabel(noBtn, 'Non (essoufflé)');
      homeNo();
      gsap.fromTo(
        noBtn,
        { scale: 0.5, rotation: 0 },
        { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1,.5)' },
      );
    }, 700);
  }
}
noBtn.addEventListener('pointerdown', dodge);
noBtn.addEventListener('pointerenter', (e) => {
  if (e.pointerType === 'mouse') dodge(e);
});
noBtn.addEventListener('focus', () => {
  if (dodging) dodge();
});
addEventListener('pointermove', (e) => {
  if (!dodging || e.pointerType !== 'mouse') return;
  const r = noBtn.getBoundingClientRect();
  if (
    Math.hypot(
      Math.max(r.left - e.clientX, 0, e.clientX - r.right),
      Math.max(r.top - e.clientY, 0, e.clientY - r.bottom),
    ) < 46
  )
    dodge();
});
noBtn.addEventListener('click', (e) => {
  if (dodging || falling || busy) return;
  if (noBtn.classList.contains('turned')) return sayYes(e);
  clicks++;
  if (clicks === 1) {
    say('Hmm. Ton doigt a sûrement glissé. Regarde, là-bas, quelque chose vient de s’allumer.');
    grow(1.22);
    relabel(noBtn, 'Non ?');
    buzz(20);
    bh(0.28, 2.4);
    rumble(0.15);
  } else if (clicks === 2) {
    say('Le bouton « Non » a entendu ça. Il préfère s’enfuir. Attrape-le.');
    grow(1.32);
    freeNo();
    dodging = true;
    dodges = 0;
    bh(0.42, 2);
  } else if (clicks === 3) {
    consequence();
    say('Conséquence n°1 : un trou noir s’est ouvert. Les étoiles s’éteignent une à une.');
    if (WD) {
      gsap.to(WD.dimU, { value: 0.85, duration: 3 });
      gsap.to(WD.POST.uGloom, { value: 0.55, duration: 3 });
      gsap.to(WD.S, { shake: 0.3, duration: 1 });
    }
    bh(0.72, 2.6);
    rumble(0.5);
    setMood('sad');
    heart(true, 0.5, 1.7);
    pose({ yaw: -0.55, face: 0.3, pull: 0.25, thrust: 1 }, 2);
    grow(1.48);
    relabel(noBtn, 'Toujours non ?');
  } else if (clicks === 4) {
    consequence();
    say('Conséquence n°2 : il nous aspire. Ne lâche pas ma main.');
    bh(1, 2.4, 'power3.inOut');
    rumble(0.95);
    buzz([200, 80, 300]);
    if (WD) gsap.to(WD.S, { shake: 1, duration: 1.2 });
    pose({ pull: 1, thrust: 2.2, yaw: -0.9 }, 2.4);
    grow(1.72);
    gsap.to(noBtn, { '--s': 0.78, duration: 0.8 });
    relabel(noBtn, 'non…');
  } else {
    say('Avant d’aller plus loin, merci de lire et signer ce document.');
    openContract();
  }
});
function openContract() {
  const m = $('#modal');
  m.hidden = false;
  gsap.fromTo(m, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
  gsap.fromTo(
    '#contract',
    { y: -60, rotation: -4, autoAlpha: 0 },
    { y: 0, rotation: 0.5, autoAlpha: 1, duration: 1, ease: 'expo.out' },
  );
  gsap.from('#contract li', {
    autoAlpha: 0,
    x: -14,
    duration: 0.6,
    stagger: 0.08,
    delay: 0.3,
    ease: 'power3.out',
  });
  const sp = $('#sigPath'),
    L = sp.getTotalLength();
  gsap.set(sp, { strokeDasharray: L, strokeDashoffset: L });
  setTimeout(() => $('#signYes').focus({ preventScroll: true }), 50);
}
function closeContract() {
  const m = $('#modal');
  if (m.hidden) return Promise.resolve();
  return gsap.to(m, {
    autoAlpha: 0,
    duration: 0.35,
    onComplete: () => {
      m.hidden = true;
    },
  });
}
$('#signYes').addEventListener('click', (e) => {
  closeContract();
  sayYes(e);
});
$('#sign').addEventListener('click', async () => {
  await gsap.to('#sigPath', {
    strokeDashoffset: 0,
    duration: 1.1,
    ease: 'power2.inOut',
    onStart: () => noise(1, 3000, 5000, 0.03),
  });
  await closeContract();
  consequence();
  say(
    'Conséquence n°3 : le bouton « Non » a été aspiré par le trou noir. Il ne reste que des oui.',
  );
  suckNo();
});
$('#modal').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContract();
});

function suckNo() {
  falling = true;
  freeNo();
  const r = noBtn.getBoundingClientRect(),
    x0 = r.left,
    y0 = r.top;
  const c = WD
    ? [WD.POST.uBHPos.value.x * W - r.width / 2, (1 - WD.POST.uBHPos.value.y) * H - r.height / 2]
    : [W * 0.7, H * 0.3];
  const a0 = Math.atan2(y0 - c[1], x0 - c[0]),
    R0 = Math.hypot(x0 - c[0], y0 - c[1]);
  const st = { p: 0 };
  noise(2.2, 200, 1800, 0.12);
  gsap.to(st, {
    p: 1,
    duration: 2.4,
    ease: 'power2.in',
    onUpdate: () => {
      const p = st.p,
        a = a0 + p * Math.PI * 5,
        R = R0 * (1 - p);
      gsap.set(noBtn, {
        left: c[0] + Math.cos(a) * R,
        top: c[1] + Math.sin(a) * R,
        scale: 1 - p * 0.95,
        rotation: p * 900,
        filter: `blur(${p * 3}px)`,
      });
    },
    onComplete: () => {
      kick(1);
      flash(0.4, 0.6, 0xffb36b);
      buzz(60);
      gsap
        .timeline({ delay: 0.5 })
        .add(() => {
          homeNo();
          gsap.set(noBtn, { '--s': 1, filter: 'none' });
          noBtn.classList.add('turned');
          noBtn.textContent = 'Oui aussi';
          noBtn.dataset.cursor = 'oui !';
        })
        .fromTo(
          noBtn,
          { autoAlpha: 0, scale: 0.4, rotation: 0 },
          {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 1,
            ease: 'elastic.out(1,.5)',
            onComplete: () => {
              falling = false;
            },
          },
        );
    },
  });
}
yesBtn.addEventListener('click', sayYes);
async function sayYes(e) {
  if (busy) return;
  const [x, y] = pt(e, yesBtn);
  dodging = false;
  if (noBtn.classList.contains('runaway')) homeNo();
  closeContract();
  setMood('happy');
  cadence();
  buzz([40, 60, 40, 60, 140]);
  heartBurst(x, y);
  burst(x, y, 50, 9);
  kick(1.5);
  rumble(0);
  if (WD) {
    const had = WD.BH.s > 0.05;
    gsap.to(WD.BH, {
      s: 0,
      duration: had ? 0.9 : 0.1,
      ease: 'power3.in',
      onComplete: () => {
        if (had) {
          flash(1.2, 1.6, 0xfff4e0);
          WD.novaU.uT.value = 0;
          gsap.to(WD.novaU.uT, {
            value: 7,
            duration: 7,
            ease: 'none',
            onComplete: () => {
              WD.novaU.uT.value = -1;
            },
          });
        }
      },
    });
    gsap.to(WD.dimU, { value: 0, duration: 2 });
    gsap.to(WD.POST.uGloom, { value: 0, duration: 2 });
    gsap.to(WD.S, { shake: 0, duration: 1 });
    pose({ pull: 0, thrust: 0.9, yaw: -0.5, face: 0.4 }, 1.6);
    gsap.to(WD.visorU.uGlow, { value: 1, duration: 0.5, yoyo: true, repeat: 1 });
  }
  heart(true, 1.3, 1.0);
  if (!store.get('yoline-yes')) store.set('yoline-yes', String(Date.now()));
  yesAt = +(store.get('yoline-yes') || Date.now());
  await wait(reduced ? 0 : 1400);
  warpTo('yes');
}
