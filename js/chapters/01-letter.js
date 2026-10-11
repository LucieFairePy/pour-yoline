const chatLines = [...CONFIG.letter.filter((l) => l.trim()), CONFIG.signature];
let given = false,
  chatTl = null,
  chatDone = false,
  typingEl = null,
  lastTap = { el: null, t: 0 };
const chat = $('#chat');
let chatPinned = true;
chat.addEventListener(
  'scroll',
  () => {
    chatPinned = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 70;
  },
  { passive: true },
);
chat.addEventListener(
  'wheel',
  (e) => {
    e.stopPropagation();
  },
  { passive: true },
);
function stickChat(force) {
  if (chatPinned || force)
    gsap.to(chat, {
      scrollTop: chat.scrollHeight,
      duration: 0.45,
      ease: 'power2.out',
      overwrite: true,
    });
}
function addTyping() {
  typingEl = document.createElement('div');
  typingEl.className = 'typing';
  typingEl.innerHTML = '<i></i><i></i><i></i>';
  chat.appendChild(typingEl);
  stickChat();
  gsap.from(typingEl, { scale: 0.5, autoAlpha: 0, duration: 0.3, ease: 'back.out(2)' });
}
function addBubble(text, sign, quiet) {
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
  const b = document.createElement('div');
  b.className = 'bub' + (sign ? ' sign' : '');
  b.textContent = text;
  chat.appendChild(b);
  stickChat();
  if (!quiet) {
    gsap.from(b, { scale: 0.55, y: 14, autoAlpha: 0, duration: 0.5, ease: 'back.out(2.2)' });
    bubbleSound();
    buzz(6);
  }
  return b;
}
function chatEnd() {
  chatDone = true;
  if (!chat.querySelector('.readmark')) {
    const r = document.createElement('div');
    r.className = 'readmark';
    r.textContent =
      'Lu à ' +
      new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    chat.appendChild(r);
    gsap.from(r, { autoAlpha: 0, duration: 0.6 });
  }
  gsap.to('#skipChat', { autoAlpha: 0, duration: 0.3 });
  gsap.fromTo(
    ['#toRose', '#likeHint'],
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.2 },
  );
  pose({ yaw: -0.5, face: 0.2 }, 2);
  view({ look: W > 900 ? 0.62 : 1 }, 2);
}
function startChat() {
  gsap.fromTo('#skipChat', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 });
  chatTl = gsap.timeline({ onComplete: chatEnd });
  chatLines.forEach((line, i) => {
    const typing = clamp(0.55 + line.length * 0.024, 0.8, 2.3);
    chatTl.add(addTyping, i ? '+=.45' : '+=.2');
    chatTl.add(() => addBubble(line, i === chatLines.length - 1), '+=' + typing);
  });
}
function skipChat() {
  if (chatDone) return;
  chatTl && chatTl.kill();
  chat.innerHTML = '';
  typingEl = null;
  chatLines.forEach((l, i) => addBubble(l, i === chatLines.length - 1, true));
  chatEnd();
  stickChat(true);
}
function envToHer() {
  const ENV = WD.ENV,
    target = WD.Y.body.localToWorld(new THREE.Vector3(-0.08, 0.08, 0.34));
  WD.rig.worldToLocal(target);
  return target;
}
function giveLetter() {
  if (given || !WD) return;
  given = true;
  gsap.killTweensOf('#giveBtn');
  const ENV = WD.ENV;
  gsap.to('#giveBtn', { autoAlpha: 0, duration: 0.3 });
  paperSound(0.6, 0.06);
  const tgt = envToHer();
  const tl = gsap.timeline();
  tl.to(ENV.g.position, { x: tgt.x, y: tgt.y, z: tgt.z, duration: 1.5, ease: 'power2.inOut' })
    .to(ENV.g.rotation, { x: 0, y: 0.35, z: 0.05, duration: 1.5, ease: 'power2.inOut' }, '<')
    .to(WD.P, { reach: 1, duration: 1.1, ease: 'power2.inOut' }, '<.5')
    .add(() => {
      crackSound();
      buzz([15, 30, 20]);
      kick(0.6);
      const [x, y] = WD.screenOf(ENV.seal);
      crumbs(x, y, 22);
    }, '+=.3')
    .to(ENV.halves[0].position, { x: 0.022, y: 0.006, duration: 0.45, ease: 'power3.out' })
    .to(ENV.halves[1].position, { x: -0.022, y: 0.006, duration: 0.45, ease: 'power3.out' }, '<')
    .to(ENV.halves[0].rotation, { z: -0.9, x: 0.3, duration: 0.45, ease: 'power3.out' }, '<')
    .to(ENV.halves[1].rotation, { z: 0.9, x: -0.2, duration: 0.45, ease: 'power3.out' }, '<')
    .to(ENV.seal.position, { z: 0.06, y: -0.05, duration: 0.7, ease: 'power2.in' }, '<.2')
    .to(ENV.seal.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: 'power2.in' }, '<.2')
    .to(ENV.ribbon.position, { y: -0.2, z: 0.02, duration: 0.7, ease: 'power2.in' }, '<')
    .to(ENV.ribbon.scale, { x: 0.7, y: 0.01, z: 0.01, duration: 0.7, ease: 'power2.in' }, '<')
    .to(
      ENV.flapPivot.rotation,
      { x: -2.7, duration: 1, ease: 'power3.inOut', onStart: () => paperSound(0.8, 0.08) },
      '-=.1',
    )
    .to(
      ENV.paper.position,
      { y: 0.17, duration: 1, ease: 'expo.out', onStart: () => paperSound(0.9, 0.07) },
      '-=.3',
    )
    .to(ENV.g.rotation, { y: 2.5, x: -0.15, duration: 1.4, ease: 'power3.inOut' }, '+=.2')
    .add(() => {
      pose({ yaw: -0.95, face: -0.3 }, 1.6);
      view({ look: W > 900 ? 0.55 : 0.78, lookY: -0.02 }, 1.6);
    }, '<')
    .add(startChat, '+=.4');
}
enter.letter = () => {
  if (!WD) return;
  const { ENV, P } = WD;
  chat.innerHTML = chatDone ? chat.innerHTML : '';
  if (chatDone) {
    if (!chat.children.length) {
      chatLines.forEach((l, i) => addBubble(l, i === chatLines.length - 1, true));
    }
    chatEnd();
    return;
  }
  pose({ yaw: -0.5, face: 0.25 }, 2.2);
  view({ look: W > 900 ? 0.62 : 1, lookY: -0.03 }, 2.2);
  const L = WD.LAY;
  ENV.g.visible = true;
  ENV.paper.position.y = 0;
  ENV.flapPivot.rotation.x = 0;
  ENV.seal.scale.setScalar(1);
  ENV.seal.position.set(0, -0.012, 0.009);
  ENV.halves.forEach((h) => {
    h.position.set(0, 0, 0);
    h.rotation.set(0, 0, 0);
  });
  ENV.ribbon.position.set(0, -0.012, 0);
  ENV.ribbon.scale.set(1, 1, 1);
  ENV.g.position.set(L.her.x * 0.42, -0.16, -0.72);
  ENV.g.rotation.set(-0.1, -0.25, -0.06);
  ENV.g.scale.setScalar(mobile ? 0.85 : 1);
  gsap.from(ENV.g.position, { y: -0.6, duration: 1.6, ease: 'expo.out', delay: 0.4 });
  gsap.from(ENV.g.scale, { x: 0.2, y: 0.2, z: 0.2, duration: 1.6, ease: 'expo.out', delay: 0.4 });
  ENV.glow.intensity = 0;
  gsap.fromTo(
    '#giveBtn',
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.9, delay: 2, ease: 'expo.out' },
  );
  gsap.from('#chatHead', { autoAlpha: 0, y: -8, duration: 0.8, delay: 0.4 });
};
leave.letter = () => {
  if (WD) {
    gsap.to(WD.P, { reach: 0, duration: 0.8 });
    gsap.to(WD.ENV.glow, { intensity: 0, duration: 0.5 });
    setTimeout(() => {
      if (current !== 'letter') WD.ENV.g.visible = false;
    }, 1500);
  }
};
$('#giveBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  giveLetter();
});
$('#skipChat').addEventListener('click', (e) => {
  e.stopPropagation();
  skipChat();
});
$('#s-letter').addEventListener('pointerdown', (e) => {
  if (!WD || e.target.closest('button') || e.target.closest('.bub')) return;
  if (!given && WD.hitEnvelope(e.clientX, e.clientY)) giveLetter();
});
chat.addEventListener('pointerup', (e) => {
  const b = e.target.closest('.bub');
  if (!b) return;
  const now = performance.now();
  if (lastTap.el === b && now - lastTap.t < 380 && !b.querySelector('.tapback')) {
    const t = document.createElement('span');
    t.className = 'tapback';
    t.textContent = '♥';
    b.appendChild(t);
    gsap.from(t, { scale: 0, rotation: -40, duration: 0.6, ease: 'back.out(3)' });
    sparkle();
    buzz(10);
    const r = b.getBoundingClientRect();
    heartBurst(r.left, r.top);
    gsap.to('#likeHint', {
      duration: 0.6,
      scrambleText: { text: 'Elle a aimé ça', chars: 'lowerCase', speed: 0.5 },
    });
  }
  lastTap = { el: b, t: now };
});
let yesSeen = false;
$('#toRose').addEventListener('click', (e) => {
  e.stopPropagation();
  warpTo(yesSeen ? 'yes' : 'rose');
});
