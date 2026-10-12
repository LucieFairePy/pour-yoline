const Intro = (() => {
  const DUR = 92;
  const T = CONFIG.intro;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  const cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 4000);
  scene.add(new THREE.AmbientLight('#6a5a8a', 0.35));
  const key = new THREE.DirectionalLight('#ffe2d0', 1.05);
  key.position.set(-6, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ff6a96', 1.2);
  rim.position.set(4, 3, -12);
  scene.add(rim);

  const neb = CineKit.nebula();
  scene.add(neb.mesh);
  const heart = CineKit.heart(14000, 1.6);
  heart.position.set(0, 7, -70);
  scene.add(heart);
  const bh = CineKit.blackHole();
  scene.add(bh.group);
  const white = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fff6ee').multiplyScalar(6),
      toneMapped: false,
    }),
  );
  scene.add(white);
  const warp = CineKit.warp();
  scene.add(warp.mesh);
  const rocks = CineKit.asteroids();
  scene.add(rocks.mesh);
  const big = CineKit.bigRock();
  scene.add(big);
  const ship = CineKit.ship();
  scene.add(ship.group);
  const planet = CineKit.planet();
  scene.add(planet.group);
  const cards = CineKit.cards();
  scene.add(cards.group);
  const hearts = [CineKit.glowHeart(), CineKit.glowHeart(), CineKit.glowHeart()];
  hearts.forEach((h) => scene.add(h));
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,250,240,1)');
        gr.addColorStop(0.2, 'rgba(255,220,180,0.6)');
        gr.addColorStop(1, 'rgba(255,200,150,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      })(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  scene.add(sunGlow);

  const D = Avatar.build('dame');
  const Vv = Avatar.build('valet');
  [D, Vv].forEach((a) => {
    a.root.rotation.order = 'YXZ';
    a.shadow.visible = false;
    scene.add(a.root);
  });

  const composer = new THREE.EffectComposer(R.renderer);
  const pass = new THREE.RenderPass(scene, cam);
  composer.addPass(pass);
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.9, 0.5, 0.82);
  composer.addPass(bloom);
  const FU0 = {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFade: { value: 1 },
    uFlash: { value: 0 },
    uGlitch: { value: 0 },
    uCA: { value: 0.0015 },
    uWarm: { value: 0 },
    uAspect: { value: 1 },
  };
  const film = new THREE.ShaderPass({
    uniforms: FU0,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uFade;
      uniform float uFlash;
      uniform float uGlitch;
      uniform float uCA;
      uniform float uWarm;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = vUv;
        float row = floor(uv.y * 48.0);
        float g = step(0.72, h(vec2(row, floor(uTime * 24.0)))) * uGlitch;
        uv.x += (h(vec2(row * 1.7, floor(uTime * 30.0))) - 0.5) * 0.08 * g;
        vec2 c = uv - 0.5;
        float ca = uCA + uGlitch * 0.012;
        vec3 col;
        col.r = texture2D(tDiffuse, uv + c * ca).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c * ca).b;
        col = mix(col, col * vec3(1.6, 0.4, 0.5), g * 0.6);
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, col * vec3(0.92, 1.0, 1.06) + vec3(0.0, 0.006, 0.012), smoothstep(0.4, 0.0, l));
        col = mix(col, col * vec3(1.08, 1.0, 0.9), smoothstep(0.3, 1.0, l) * (0.5 + uWarm));
        col = col / (1.0 + col * 0.18);
        float v = smoothstep(0.95, 0.25, length(c * vec2(1.25, 1.0)));
        col *= mix(0.55, 1.0, v);
        col += (h(uv * 900.0 + uTime) - 0.5) * 0.045;
        col = mix(col, vec3(1.0, 0.98, 0.95), uFlash);
        col *= 1.0 - uFade;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  composer.addPass(film);
  const FU = film.uniforms;

  const el = document.createElement('div');
  el.id = 'cine';
  el.hidden = true;
  el.innerHTML = `
    <div class="bar top"></div><div class="bar bottom"></div>
    <p class="csub" id="cineSub"></p>
    <div class="ctitle" id="cineTitle"><span class="big" id="cineBig"></span><span class="small" id="cineSmall"></span></div>
    <div class="cskip" id="cineSkip"><kbd>Échap</kbd> maintenir pour passer<i id="cineSkipBar"></i></div>`;
  document.body.appendChild(el);
  const $sub = el.querySelector('#cineSub');
  const $big = el.querySelector('#cineBig');
  const $small = el.querySelector('#cineSmall');
  const $title = el.querySelector('#cineTitle');

  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const pulse = (t, a, b, f = 0.3) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));
  const lerpV = (a, b, k) => a.clone().lerp(b, k);

  const SUBS = [
    [1.2, 4.4, T.s1a],
    [4.8, 8.6, T.s1b],
    [10.6, 14.4, T.s2],
    [25, 28.8, T.s4],
    [33.2, 37.2, T.s5],
    [55.4, 59.6, T.s7a],
    [61.4, 65.6, T.s7b],
    [76.6, 80.6, T.s9],
  ];
  const TITLES = [
    [70.4, 73.9, T.planet, T.planetSub],
    [84.6, 90.4, 'BORDERLINE', T.tagline],
  ];

  const objs = [
    neb.mesh,
    heart,
    bh.group,
    white,
    warp.mesh,
    rocks.mesh,
    big,
    ship.group,
    planet.group,
    cards.group,
    sunGlow,
    ...hearts,
  ];
  let inCity = false;
  let last = 0;
  let canvasBlur = 0;

  const setCity = (on) => {
    if (on === inCity) return;
    inCity = on;
    pass.scene = on ? R.scene : scene;
    const target = on ? R.scene : scene;
    [D.root, Vv.root, ship.group].forEach((o) => target.add(o));
    if (on) {
      cam.far = 2000;
      R.scene.fog.density = 0.0045;
    } else R.scene.fog.density = 0.0085;
    cam.updateProjectionMatrix();
  };

  const place = (a, p, yaw = 0, pitch = 0, roll = 0) => {
    a.root.position.copy(p);
    a.root.rotation.set(pitch, yaw, roll);
  };

  const seek = (t) => {
    const dt = clamp(t - last, 0, 0.1);
    last = t;
    objs.forEach((o) => (o.visible = false));
    neb.U.uTime.value = t;
    neb.U.uMix.value = 0;
    neb.U.uDark.value = 0;
    neb.U.uRed.value = 0;
    FU.uTime.value = t;
    FU.uGlitch.value = 0;
    FU.uFlash.value = 0;
    FU.uCA.value = 0.0015;
    FU.uWarm.value = 0;
    FU.uFade.value = 0;
    heart.material.color.setRGB(1, 1, 1);
    let dMode = 'float';
    let vMode = 'float';
    let hand = false;
    let dFlip = 0;
    let vFlip = 0;
    let shake = 0;
    let blur = 0;
    D.root.visible = Vv.root.visible = true;
    setCity(t >= 74);
    const tgt = V3();

    if (t < 9) {
      neb.mesh.visible = heart.visible = true;
      heart.rotation.z = Math.sin(t * 0.2) * 0.04;
      heart.material.opacity = 0.85 + Math.sin(t * 1.3) * 0.1;
      const bob = Math.sin(t * 0.6) * 0.08;
      place(D, V3(-0.42, bob, 0), Math.PI);
      place(Vv, V3(0.42, -bob, 0), Math.PI);
      hand = true;
      const k = ease(seg(t, 0, 7.5));
      cam.position.copy(lerpV(V3(3.8, 1.9, 8.5), V3(1.6, 1.1, 4.6), k));
      tgt.copy(lerpV(V3(0, 1.4, -10), V3(0, 2.5, -40), k));
      if (t > 6.6) {
        const k2 = ease(seg(t, 6.6, 8.2));
        cam.position.lerp(V3(3.6, 1.2, -1.2), k2);
        tgt.lerp(V3(0, 1.3, 0), k2);
      }
      FU.uFade.value = 1 - seg(t, 0, 1.4);
    } else if (t < 17) {
      neb.mesh.visible = heart.visible = bh.group.visible = true;
      const gl =
        pulse(t, 9, 10.6, 0.1) * (0.6 + 0.4 * Math.sin(t * 40)) + pulse(t, 13.2, 13.7, 0.05);
      FU.uGlitch.value = gl;
      neb.U.uRed.value = 0.5 * seg(t, 9, 11);
      heart.material.color.setRGB(1, 1 - 0.7 * seg(t, 9, 11), 1 - 0.7 * seg(t, 9, 11));
      heart.material.opacity = 0.9 - seg(t, 12, 15) * 0.8;
      const bhP = V3(7, 2.5, -38);
      bh.group.position.copy(bhP);
      bh.group.scale.setScalar(0.01 + ease(seg(t, 9.6, 13)) * 7);
      bh.group.lookAt(cam.position);
      bh.U.uTime.value = t;
      const pull = ease(seg(t, 12, 17));
      [D, Vv].forEach((a, i) => {
        const s0 = V3(i ? 0.42 : -0.42, 0, 0);
        const ang = pull * 9 + i * Math.PI;
        const rad = (1 - pull) * 1.2 + 0.2;
        const p = lerpV(s0, bhP, Math.pow(pull, 1.6));
        p.x += Math.cos(ang) * rad * pull;
        p.y += Math.sin(ang) * rad * pull;
        place(a, p, Math.PI + pull * 4 * (i ? 1 : -1), pull * 2, pull * 3);
      });
      hand = t < 12.4;
      dFlip = vFlip = 0;
      const k = ease(seg(t, 9, 17));
      cam.position.copy(lerpV(V3(3.6, 1.2, -1.2), V3(2.5, 2.2, 7), ease(seg(t, 9, 12))));
      if (t > 12) cam.position.lerp(V3(5, 2.6, -20), ease(seg(t, 12, 17)));
      tgt.copy(lerpV(V3(0, 1.3, 0), bhP, k));
      shake = 0.03 + seg(t, 12, 17) * 0.25;
      FU.uCA.value = 0.0015 + seg(t, 12, 17) * 0.01;
      FU.uFlash.value = seg(t, 16.2, 17) * 0.9;
    } else if (t < 22) {
      warp.mesh.visible = neb.mesh.visible = true;
      neb.U.uDark.value = 0.85;
      warp.set(t, 150 + seg(t, 17, 22) * 120, 1 + seg(t, 17, 22) * 2);
      [D, Vv].forEach((a, i) => {
        place(
          a,
          V3(i ? 0.9 : -0.9, Math.sin(t * 3 + i) * 0.3, -7),
          t * (i ? 1.3 : -1.1),
          t * 2 + i,
          t * 0.7,
        );
      });
      cam.position.set(Math.sin(t * 7) * 0.05, Math.cos(t * 6) * 0.05, 0);
      tgt.set(0, 0, -20);
      FU.uCA.value = 0.008;
      FU.uFlash.value = Math.max(1 - seg(t, 17, 17.6), seg(t, 21.2, 21.9));
      shake = 0.05;
    } else if (t < 30) {
      neb.mesh.visible = true;
      neb.U.uMix.value = 1;
      const wh = V3(0, 0, -30);
      white.visible = t < 25;
      white.position.copy(wh);
      white.scale.setScalar(Math.max(0.01, 9 * (1 - ease(seg(t, 22, 24.8)))));
      bh.group.visible = t > 23.5 && t < 27;
      bh.group.position.copy(wh);
      bh.group.scale.setScalar(Math.max(0.001, 3.2 * (1 - ease(seg(t, 24.8, 26.4)))));
      bh.group.lookAt(cam.position);
      bh.U.uTime.value = t * 1.5;
      const out = ease(seg(t, 22, 29));
      [D, Vv].forEach((a, i) => {
        const s = i ? 1 : -1;
        const p = V3(s * (0.4 + out * 3.6), 0.4 - out * 0.6, -26 + out * 26);
        const tumble = (1 - out) * 6;
        place(a, p, Math.PI + s * tumble, tumble * 0.7, s * tumble * 0.5);
      });
      cam.position.copy(lerpV(V3(0, 0.8, 9), V3(0, 1.4, 11), out));
      tgt.copy(lerpV(wh, V3(0, 0.3, -6), ease(seg(t, 24, 28))));
      FU.uFlash.value = 1 - seg(t, 22, 23.2) + pulse(t, 26.2, 26.9, 0.2) * 0.5;
      shake = (1 - seg(t, 22, 25)) * 0.12;
    } else if (t < 40) {
      neb.mesh.visible = rocks.mesh.visible = true;
      neb.U.uMix.value = 1;
      rocks.set(t, -320);
      const k = ease(seg(t, 30, 39.4));
      const meet = ease(seg(t, 38.6, 40));
      const px = lerp(5.2, 0.42, k);
      place(D, V3(-px, Math.sin(t * 0.9) * 0.2, 0), Math.PI / 2, lerp(1.25, 0, meet));
      place(Vv, V3(px, Math.sin(t * 0.9 + 1) * 0.2, 0), -Math.PI / 2, lerp(1.25, 0, meet));
      dMode = vMode = meet > 0.5 ? 'float' : 'swim';
      hand = meet > 0.6;
      cam.position.copy(lerpV(V3(0, 1.4, 12), V3(0, 0.9, 5.5), k));
      tgt.set(0, 0.4, 0);
      FU.uWarm.value = 0.2;
    } else if (t < 50.6) {
      neb.mesh.visible = rocks.mesh.visible = big.visible = true;
      neb.U.uMix.value = 1;
      const travel = (t - 40) * 9;
      rocks.set(t, travel - 40);
      const dodge = Math.sin((t - 43) * 1.7) * 2.2 * seg(t, 43, 44);
      const lift = Math.cos((t - 43) * 1.3) * 1.2 * seg(t, 43, 44);
      place(D, V3(-0.45 + dodge, lift, 0), Math.PI, 0.6, -dodge * 0.15);
      place(Vv, V3(0.45 + dodge, lift, 0), Math.PI, 0.6, -dodge * 0.15);
      hand = t < 47;
      const reveal = ease(seg(t, 40, 43.5));
      cam.position.copy(lerpV(V3(-8, 6, 34), V3(dodge * 0.6 + 0.5, 1.6 + lift * 0.5, 5.2), reveal));
      tgt.copy(lerpV(V3(0, 0, -200), V3(dodge, lift + 0.6, -30), reveal));
      const hitK = seg(t, 47, 49.5);
      big.position.set(
        lerp(-90, dodge, Math.pow(hitK, 1.3)),
        lerp(10, lift + 0.8, hitK),
        lerp(-60, 0, Math.pow(hitK, 1.1)),
      );
      big.scale.setScalar(18);
      big.rotation.set(t * 0.3, t * 0.2, 0);
      shake = seg(t, 46, 49.5) * 0.06 + pulse(t, 49.4, 50.4, 0.05) * 0.6;
      FU.uFlash.value = pulse(t, 49.45, 49.9, 0.05);
      FU.uFade.value = seg(t, 49.8, 50.6);
      blur = seg(t, 49.6, 50.6) * 8;
    } else if (t < 66) {
      neb.mesh.visible = rocks.mesh.visible = ship.group.visible = true;
      neb.U.uMix.value = 1;
      rocks.set(t, -500);
      const shipP = V3(0, 22, -4);
      ship.group.position.copy(shipP);
      ship.group.rotation.set(0, t * 0.15, 0);
      ship.ring.rotation.y = -t * 0.6;
      ship.lights.rotation.y = t * 0.4;
      ship.BU.uTime.value = t;
      ship.BU.uOn.value = seg(t, 53, 54.5);
      ship.beam.scale.set(1, 1, 1);
      const rise = ease(seg(t, 54.5, 65));
      [D, Vv].forEach((a, i) => {
        const s = i ? 1 : -1;
        place(
          a,
          V3(s * 0.7, rise * 17, -4 + Math.sin(t + i) * 0.3),
          Math.PI * 0.5 * s,
          -Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.1,
          s * 0.2,
        );
      });
      dMode = vMode = 'lie';
      const hk = seg(t, 57.5, 60);
      const merge = ease(seg(t, 59.2, 60.6));
      hearts.forEach((h, i) => {
        h.visible = t > 57.5 && t < 61.4;
        const src = i === 2 ? null : i ? Vv.root.position : D.root.position;
        const top = V3(0, rise * 17 + 2.6, -4);
        let p;
        if (src)
          p = lerpV(src.clone().add(V3(0, 0.4, 0)), top, merge).add(
            V3(0, hk * 1.4 * (1 - merge), 0),
          );
        else p = top;
        h.position.copy(p);
        h.lookAt(cam.position);
        const sc = i === 2 ? merge * 1.1 : 0.35 * hk * (1 - merge * 0.7);
        h.scale.setScalar(Math.max(0.001, sc + Math.sin(t * 6) * 0.03 * hk));
        h.visible = h.visible && sc > 0.01;
      });
      const shatter = seg(t, 61.2, 65.6);
      cards.group.visible = t > 61.2;
      cards.list.forEach((c, i) => {
        const a = i * 2.4 + shatter * 9;
        const r = (1 - shatter) * (0.5 + (i % 7) * 0.25) + 0.3;
        const h0 = rise * 17 + 2.6;
        c.position.set(
          Math.cos(a) * r * 3,
          lerp(h0, shipP.y - 1.5, Math.pow(shatter, 1.4)) + Math.sin(i) * (1 - shatter),
          -4 + Math.sin(a) * r * 3,
        );
        c.rotation.set(t * 2 + i, t * 3 + i * 0.5, 0);
        c.scale.setScalar(1 - Math.pow(shatter, 6) * 0.9);
      });
      const wake = seg(t, 50.6, 55);
      blur = (1 - wake) * 7;
      FU.uFade.value = 1 - ease(seg(t, 51.8, 54.5));
      if (t < 59) {
        cam.position.copy(lerpV(V3(0.2, -6, 6), V3(9, 4, 16), ease(seg(t, 52, 59))));
        tgt.copy(lerpV(V3(0, 12, -4), V3(0, 8, -4), ease(seg(t, 52, 59))));
      } else if (t < 62) {
        const hp = V3(0, rise * 17 + 2.6, -4);
        cam.position.copy(hp.clone().add(V3(2.2, 0.4, 5)));
        tgt.copy(hp);
      } else {
        cam.position.copy(lerpV(V3(6, 10, 18), V3(-8, 4, 26), ease(seg(t, 62, 66))));
        tgt.copy(V3(0, 18, -4));
      }
      FU.uFlash.value = pulse(t, 61.1, 61.7, 0.1) * 0.6 + seg(t, 65.6, 66) * 0.5;
      D.root.visible = Vv.root.visible = rise < 0.995;
    } else if (t < 74) {
      neb.mesh.visible = true;
      ship.BU.uOn.value = 0;
      neb.U.uMix.value = 1;
      if (t < 69.5) {
        ship.group.visible = true;
        warp.mesh.visible = t > 67.4;
        warp.set(t, 220, 2 + seg(t, 67.4, 69.5) * 6);
        const st = ease(seg(t, 66.6, 68.6));
        ship.group.position.set(0, 0, -12 - st * 60);
        ship.group.rotation.set(Math.PI / 2, 0, 0);
        ship.group.scale.set(1, 1 + st * 6, 1);
        cam.position.set(6 - st * 6, 3 - st * 3, 8);
        tgt.copy(ship.group.position);
        FU.uCA.value = 0.002 + st * 0.012;
        FU.uFlash.value = Math.max(0.5 - seg(t, 66, 66.4), seg(t, 68.9, 69.5));
        shake = st * 0.1;
        neb.U.uDark.value = seg(t, 67.4, 69) * 0.8;
      } else {
        planet.group.visible = sunGlow.visible = true;
        ship.group.visible = true;
        ship.BU.uOn.value = 0;
        ship.group.scale.setScalar(1);
        ship.group.rotation.set(0.2, t * 0.2, 0);
        planet.group.position.set(0, -44, -112);
        planet.group.rotation.y = t * 0.02;
        planet.U.uTime.value = t;
        planet.U.uSun.value.set(-0.6, 0.35, -0.7).normalize();
        sunGlow.position.set(-260, 70, -400);
        sunGlow.scale.setScalar(160);
        const a = ease(seg(t, 69.5, 74));
        ship.group.position.copy(lerpV(V3(-8, 6, -20), V3(4, -8, -95), a));
        ship.group.scale.setScalar(lerp(0.4, 0.12, a));
        cam.position.copy(lerpV(V3(0, 4, 30), V3(4, -2, 12), a));
        tgt.copy(lerpV(V3(0, -10, -150), V3(2, -14, -120), a));
        FU.uFlash.value = 1 - seg(t, 69.5, 70.6);
        FU.uWarm.value = 0.3;
      }
    } else {
      ship.group.visible = t < 81;
      ship.group.scale.setScalar(1.3);
      ship.ring.rotation.y = -t * 0.6;
      ship.lights.rotation.y = t * 0.4;
      ship.BU.uTime.value = t;
      const spD = City.spawns.dame;
      const spV = City.spawns.valet;
      const toD = ease(seg(t, 74.5, 77.5));
      const shipP = lerpV(V3(0, 90, 0), V3(spD.x, 46, spD.z), toD);
      if (t > 79) shipP.lerp(V3(spV.x, 46, spV.z), ease(seg(t, 79, 80.6)));
      ship.group.position.copy(shipP);
      ship.group.rotation.set(0, t * 0.15, 0);
      ship.BU.uOn.value = pulse(t, 77.2, 79.2, 0.3) + pulse(t, 80.4, 82, 0.3);
      ship.beam.scale.set(1.2, 1.15, 1.2);
      const dDrop = ease(seg(t, 77.4, 79));
      const vDrop = ease(seg(t, 80.6, 81.9));
      const wakeD = seg(t, 82, 84.2);
      const wakeV = seg(t, 84, 86);
      const ly = (k) => lerp(0.28, 0.02, k);
      place(
        D,
        V3(spD.x, lerp(42, 0, dDrop) + (dDrop >= 1 ? ly(wakeD) : 0.28), spD.z),
        0.6,
        lerp(-Math.PI / 2, 0, ease(wakeD)),
      );
      place(
        Vv,
        V3(spV.x, lerp(42, 0, vDrop) + (vDrop >= 1 ? ly(wakeV) : 0.28), spV.z),
        -2.4,
        lerp(-Math.PI / 2, 0, ease(wakeV)),
      );
      dMode = wakeD < 0.35 ? 'lie' : wakeD < 0.8 ? 'sit' : 'walk';
      vMode = wakeV < 0.35 ? 'lie' : wakeV < 0.8 ? 'sit' : 'walk';
      D.root.visible = t > 77.3;
      Vv.root.visible = t > 80.5;
      if (t < 77.2) {
        const k = ease(seg(t, 74, 77.2));
        cam.position.copy(lerpV(V3(60, 150, 190), V3(spD.x + 30, 85, spD.z + 45), k));
        tgt.copy(lerpV(V3(0, 40, 0), V3(spD.x, 30, spD.z), k));
      } else if (t < 80.4) {
        cam.position.set(spD.x, 9, spD.z - 20);
        tgt.set(spD.x, lerp(30, 2, dDrop), spD.z);
      } else if (t < 82) {
        cam.position.set(spV.x, 12, spV.z + 22);
        tgt.set(spV.x, lerp(30, 2, vDrop), spV.z);
      } else if (t < 84.3) {
        const k = seg(t, 82, 84.3);
        cam.position.set(spD.x + 2.2 - k * 0.6, 0.6 + k * 0.7, spD.z + 2.6);
        tgt.set(spD.x, 0.4 + k * 0.8, spD.z);
      } else if (t < 86.2) {
        const k = seg(t, 84.3, 86.2);
        cam.position.set(spV.x - 2.4, 0.7 + k * 0.6, spV.z - 2.2);
        tgt.set(spV.x, 0.4 + k * 0.9, spV.z);
      } else {
        const k = ease(seg(t, 86.2, 92));
        cam.position.copy(lerpV(V3(0, 6, 40), V3(0, 18, 4), k));
        tgt.copy(City.screenPos);
        BigScreen.show('♥', 'Joueurs : 2', '#ff5f8a');
      }
      FU.uFade.value = 1 - seg(t, 74, 75) + seg(t, 90.6, 92);
      FU.uWarm.value = 0.1;
      City.update(t, dt);
      BigScreen.update(dt, t);
      Sky.update(t, cam);
    }

    if (shake) {
      cam.position.x += (Math.sin(t * 91) + Math.sin(t * 57)) * shake * 0.5;
      cam.position.y += (Math.cos(t * 83) + Math.sin(t * 41)) * shake * 0.5;
    }
    cam.lookAt(tgt);
    D.update(dt, { mode: dMode, grounded: true, hand, flip: dFlip }, t);
    Vv.update(dt, { mode: vMode, grounded: true, hand, flip: vFlip }, t);
    neb.mesh.position.copy(cam.position);

    let sub = '';
    let op = 0;
    SUBS.forEach(([a, b, s]) => {
      if (t >= a && t <= b) {
        sub = s;
        op = pulse(t, a, b, 0.5);
      }
    });
    if ($sub.textContent !== sub) $sub.textContent = sub;
    $sub.style.opacity = op;
    let tb = '';
    let ts = '';
    let to = 0;
    TITLES.forEach(([a, b, big2, small]) => {
      if (t >= a && t <= b) {
        tb = big2;
        ts = small;
        to = pulse(t, a, b, 0.8);
      }
    });
    if ($big.textContent !== tb) $big.textContent = tb;
    if ($small.textContent !== ts) $small.textContent = ts;
    $title.style.opacity = to;
    $title.style.transform = `translate(-50%, -50%) scale(${1 + (1 - to) * 0.04})`;
    if (Math.abs(blur - canvasBlur) > 0.05) {
      canvasBlur = blur;
      R.renderer.domElement.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : '';
    }
  };

  const resize = () => {
    composer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth * 0.5, innerHeight * 0.5);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  const render = (t) => {
    seek(t);
    composer.render();
  };

  const stop = () => {
    el.hidden = true;
    R.renderer.domElement.style.filter = '';
    setCity(false);
    R.scene.fog.density = 0.0085;
    [D.root, Vv.root, ship.group].forEach((o) => o.parent && o.parent.remove(o));
  };

  return {
    DUR,
    render,
    show() {
      el.hidden = false;
    },
    stop,
    play() {
      return new Promise((res) => {
        el.hidden = false;
        last = 0;
        const voice = Sound.cine ? Sound.cine(DUR) : null;
        const t0 = performance.now();
        let hold = 0;
        let done = false;
        const keys = new Set();
        const kd = (e) => keys.add(e.code);
        const ku = (e) => keys.delete(e.code);
        addEventListener('keydown', kd);
        addEventListener('keyup', ku);
        const bar = el.querySelector('#cineSkipBar');
        const finish = () => {
          if (done) return;
          done = true;
          removeEventListener('keydown', kd);
          removeEventListener('keyup', ku);
          if (voice) voice.stop();
          stop();
          res();
        };
        let prev = t0;
        const loop = (now) => {
          if (done) return;
          const t = (now - t0) / 1000;
          const dt = (now - prev) / 1000;
          prev = now;
          const skipping =
            keys.has('Escape') || keys.has('KeyE') || keys.has('Space') || Input.rawPad([0, 9]);
          hold = skipping ? hold + dt : Math.max(0, hold - dt * 2);
          bar.style.transform = `scaleX(${clamp(hold / 1.2, 0, 1)})`;
          if (hold > 1.2 || t >= DUR) return finish();
          render(t);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    },
  };
})();
