if (!WD) {
  console.warn('WebGL indisponible');
  $('#gl').style.background = 'radial-gradient(120% 90% at 50% 40%, #2b0c20, #05020a)';
  (function noGl() {
    beatTick();
    requestAnimationFrame(noGl);
  })();
}

(async function boot() {
  const tasks = [
    'Pressurisation des combinaisons',
    'Plein des jetpacks',
    'Calcul de la trajectoire',
    'Alignement de 200 milliards d’étoiles',
    'Vérification du trou noir (éteint)',
    'Rassemblement du courage',
  ];
  const quotes = [
    'Certaines choses ne tiennent pas sur Terre.',
    'Alors je t’emmène là-haut pour les dire.',
  ];
  const counter = { v: 0 };
  let ti = 0;
  const taskTimer = setInterval(() => {
    ti = (ti + 1) % tasks.length;
    gsap.to('#lTask', {
      duration: 0.6,
      scrambleText: { text: tasks[ti], chars: 'lowerCase', speed: 0.6 },
    });
  }, 650);
  gsap.from('#lQuote', {
    autoAlpha: 0,
    y: 16,
    filter: 'blur(8px)',
    duration: 1.4,
    ease: 'expo.out',
  });
  setTimeout(
    () =>
      gsap
        .timeline()
        .to('#lQuote', { autoAlpha: 0, y: -10, filter: 'blur(8px)', duration: 0.5 })
        .add(() => {
          $('#lQuote').textContent = quotes[1];
        })
        .to('#lQuote', {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.9,
          ease: 'expo.out',
        }),
    1700,
  );
  const fontsReady = Promise.race([
    Promise.all([document.fonts.load('italic 500 200px "Bodoni Moda"'), document.fonts.ready]),
    wait(3500),
  ]);
  const prog = gsap.to(counter, {
    v: 100,
    duration: reduced ? 0.5 : 3.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      $('#countN').textContent = String(Math.round(counter.v)).padStart(3, '0');
      gsap.set('#lBar', { scaleX: counter.v / 100 });
    },
  });
  await Promise.all([fontsReady, prog]);
  clearInterval(taskTimer);
  if (WD) {
    WD.buildName();
    WD.ENV.refresh && WD.ENV.refresh();
  }
  show('intro');
  if (WD) {
    const g = WD.groups.intro;
    g.position.z = g.userData.rest.z - 60;
    gsap.to(g.position, { z: g.userData.rest.z, duration: 4, ease: 'expo.out' });
  }
  kick(0.6);
  await gsap
    .timeline()
    .to('#countN', { yPercent: -110, duration: 0.7, ease: 'expo.in' })
    .to('#loader .top, #loader .mid, #loader .task', { autoAlpha: 0, duration: 0.4 }, '<')
    .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.inOut' }, '-=.1');
  $('#loader').remove();
})();
