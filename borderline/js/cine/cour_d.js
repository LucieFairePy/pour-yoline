// Cinematic « Carreau » (end of the ♦ table of the Cour, after Le Roi de Carreau is won, before
// its reward). Under the coupole of the Observatoire de Carreau, the orrery turning, the storm
// flashing through the glass: the Valet, the Dame and the Roi de Carreau face the two of you,
// say a word each, bow, and lay their three cards at your feet. A last line from the Roi.
// Built on js/cine/cut.js (Cut.define, the 'cut' phase); played by js/levels/tr_dK.js.
(() => {
  const DUR = 30;
  const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  const glow = (color, k = 1.6, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, ...extra });
  const SPOTS = [
    [-0.95, 0.75],
    [0, 0.95],
    [0.95, 0.75],
  ];

  Cut.define('cour_d', {
    dur: DUR,
    subs: [
      [5.6, 8.8, 'Une table de la Cour, retournée.', 'Le Valet de Carreau'],
      [9.4, 13.0, 'Ce que nous gardions en morceaux, vous le voyez à deux.', 'La Dame de Carreau'],
      [19.4, 23.2, 'Nos cartes sont à vous. Les autres tables vous attendent.', 'Le Roi de Carreau'],
      [23.8, 27.4, 'Le doute ne tient jamais longtemps devant vous deux.', 'Le Roi de Carreau'],
    ],
    titles: [[26.8, 29.6, 'Carreau', 'La table est tombée']],
    score(A) {
      // a warm, slow D major, a harpsichord when the cards come down
      A.pad([50, 57, 62, 66], 0, 8, 0.03);
      A.pad([47, 54, 59, 62], 7.5, 7, 0.03);
      A.pad([43, 50, 55, 59, 62], 14, 8, 0.032);
      A.pad([45, 52, 57, 61, 64], 21.5, 8.5, 0.032);
      [74, 78, 81].forEach((m, i) => A.bell(m, 1.2 + i * 1.4, 0.022, 4));
      [0, 0.6, 1.2].forEach((d, i) => {
        [69, 74, 78, 81].forEach((m, j) => A.pluck(m + i * 2, 16.6 + d + j * 0.09, 0.03, 0.9));
        A.bell(86 + i * 2, 17.2 + d, 0.025, 3);
      });
      A.noise(23.5, 5, 400, 2400, 0.02);
      [86, 90, 93].forEach((m, i) => A.bell(m, 25 + i * 0.7, 0.02, 4));
    },
    build(K) {
      const { scene, cam, group, ease, seg, FU, lights } = K;
      scene.background = new THREE.Color('#0a0708');
      // the storm and the gold rift behind the glass
      const SH = { t: { value: 0 }, flash: { value: 0 } };
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(80, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: { uT: SH.t, uF: SH.flash },
          vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: `
            uniform float uT, uF; varying vec3 vD;
            float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
              return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
            void main(){
              vec3 d = normalize(vD);
              vec3 col = mix(vec3(0.2, 0.12, 0.08), vec3(0.02, 0.016, 0.024), smoothstep(-0.1, 0.6, d.y));
              float c = n(d.xz / (0.3 + max(d.y, 0.0)) * 2.0 + uT * 0.03) * 0.6 + n(d.xz * 6.0 - uT * 0.05) * 0.4;
              col = mix(col, vec3(0.12, 0.09, 0.09), smoothstep(0.45, 0.8, c) * smoothstep(0.0, 0.3, d.y));
              float k = abs(dot(d, normalize(vec3(0.8, 0.3, 0.5))));
              col += vec3(1.0, 0.75, 0.4) * exp(-k / 0.012) * smoothstep(0.1, 0.5, d.y) * 0.8;
              col += vec3(0.6, 0.6, 0.85) * uF * (0.2 + c);
              gl_FragColor = vec4(col, 1.0);
            }`,
        }),
      );
      group.add(sky);
      // the floor: the mosaic of the observatory, a garnet disc, brass rings
      const floorM = std('#e8d6b4', 0.35, 0.05);
      if (typeof Assets !== 'undefined' && !Assets.off)
        Assets.get('tex.dcour.mosaic.alb')
          .then((t) => {
            const m = t.clone();
            m.wrapS = m.wrapT = THREE.RepeatWrapping;
            m.repeat.set(5, 5);
            m.needsUpdate = true;
            floorM.map = m;
            floorM.color.set('#ffffff');
            floorM.needsUpdate = true;
          })
          .catch(() => {});
      const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64).rotateX(-Math.PI / 2), floorM);
      group.add(floor);
      const garnet = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64).rotateX(-Math.PI / 2), std('#6e1a22', 0.5));
      garnet.position.y = 0.004;
      group.add(garnet);
      const brass = std('#dcaa52', 0.3, 1);
      if (typeof Assets !== 'undefined' && Assets.envify) Assets.envify(brass, 0.8);
      [4.2, 7, 11.8].forEach((r) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 96).rotateX(Math.PI / 2), brass);
        ring.position.y = 0.01;
        group.add(ring);
      });
      // the dome's brass ribs and the orrery
      for (let i = 0; i < 14; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(12, 0.05, 6, 48, Math.PI), brass);
        rib.scale.set(1, 0.85, 1);
        rib.rotation.y = (i / 14) * Math.PI;
        group.add(rib);
      }
      const orrery = new THREE.Group();
      orrery.position.set(0, 8.6, 1.6);
      group.add(orrery);
      const GC = ['#ffae3a', '#ff5f93', '#4aa8ff'];
      const rings = [2.6, 3.6, 4.6].map((r, i) => {
        const g = new THREE.Group();
        g.rotation.set(0.35 + i * 0.25, i, 0.2 - i * 0.15);
        orrery.add(g);
        g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 96), brass));
        const pl = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 - i * 0.05, 1), std(GC[i], 0.2, 0.1, { emissive: new THREE.Color(GC[i]).multiplyScalar(0.5) }));
        pl.position.x = r;
        g.add(pl);
        return g;
      });
      const sun = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0).scale(1, 1.5, 1), glow('#ffc65a', 1.8));
      orrery.add(sun);
      // warm lights: under the orrery, and low around the room
      const L1 = new THREE.PointLight('#ffc47a', 1.6, 18, 2);
      L1.position.set(0, 6.5, 1.5);
      const L2 = new THREE.PointLight('#ffb060', 0.6, 14, 2);
      L2.position.set(-5.5, 3.2, -4.5);
      const L3 = new THREE.PointLight('#ffd8a0', 0.6, 14, 2);
      L3.position.set(4, 2.4, -1);
      group.add(L1, L2, L3);
      // the three figures, facing you
      const F = ['V', 'R', 'D'].map((k) => CourD.figure(k));
      const POS = [
        [-2.7, 2.5, Math.PI + 0.45],
        [0, 3.4, Math.PI],
        [2.7, 2.5, Math.PI - 0.45],
      ];
      F.forEach((f, i) => {
        f.g.position.set(POS[i][0], 0, POS[i][1]);
        f.g.rotation.y = POS[i][2];
        group.add(f.g);
      });
      // the cards they lay down (separate from the ones in their hands)
      const cards = F.map((f) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.72), new THREE.MeshStandardMaterial({ map: f.card.material.map, roughness: 0.45, side: THREE.DoubleSide, emissive: '#3a2410' }));
        m.visible = false;
        group.add(m);
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.42, 0.62, 48).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc65a').multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        );
        group.add(halo);
        return { m, halo, from: V3() };
      });
      // the two of you, hand in hand
      const D = K.rig('yoline');
      const V = K.rig('william');
      const P = HQRig.P;
      const tmp = V3();
      const look = V3();
      let flashT = 0;
      let flashN = 3.5;
      return {
        seek(t, dt = 1 / 60) {
          SH.t.value = t;
          // the storm through the glass
          flashN -= dt;
          if (flashN <= 0) {
            flashN = 4 + Math.random() * 5;
            flashT = 0.5;
          }
          flashT = Math.max(0, flashT - dt);
          SH.flash.value = flashT > 0 ? (flashT > 0.38 || (flashT > 0.18 && flashT < 0.26) ? 1 : 0.2) * 0.6 : 0;
          lights.key.color.set('#ffdcb0');
          lights.key.intensity = 0.6;
          lights.key.position.set(-3, 7, -5);
          lights.rim.color.set('#ffb060');
          lights.rim.intensity = 0.8 + SH.flash.value * 0.6;
          lights.rim.position.set(2, 4, 8);
          lights.amb.color.set('#6a5040');
          lights.amb.intensity = 0.26;
          orrery.rotation.y = t * 0.06;
          rings.forEach((g, i) => (g.rotation.z = t * (0.12 - i * 0.03)));
          L1.intensity = 1.3 + seg(t, 24, 28) * 0.5;
          // the couple
          D.g.position.set(-0.42, 0, -1.6);
          V.g.position.set(0.42, 0, -1.6);
          D.g.rotation.set(0, 0, 0);
          V.g.rotation.set(0, 0, 0);
          const pd = P.stand();
          const pv = P.stand();
          // they look up at the figures, then down at the cards, then at each other
          const up = 1 - seg(t, 16, 18) + seg(t, 19, 20.5) * (1 - seg(t, 24.5, 26));
          pd.head.p = -0.32 * up + 0.25 * seg(t, 16, 17.5) * (1 - seg(t, 19, 20.5)) + Math.sin(t * 1.3) * 0.02;
          pv.head.p = -0.36 * up + 0.25 * seg(t, 16, 17.5) * (1 - seg(t, 19, 20.5)) + Math.sin(t * 1.1 + 1) * 0.02;
          const each = seg(t, 25, 26.5);
          pd.head.y = 0.45 * each;
          pv.head.y = -0.45 * each;
          D.apply(pd);
          V.apply(pv);
          K.holdHands(D, V, pd, pv);
          D.apply(pd);
          V.apply(pv);
          D.groundSnap(0);
          V.groundSnap(0);
          // the figures: a word each, a bow, the cards laid down, straight again
          const talk = [seg(t, 5.6, 6) * (1 - seg(t, 8.6, 9)), seg(t, 19.4, 19.8) * (1 - seg(t, 27, 27.4)), seg(t, 9.4, 9.8) * (1 - seg(t, 12.8, 13.2))];
          F.forEach((f, i) => {
            const t0 = 15 + [0, 0.6, 1.2][i];
            const bow = ease(seg(t, 13.2 + i * 0.15, 14.6 + i * 0.15)) * (1 - 0.7 * ease(seg(t, 18.6, 20)));
            const lay = ease(seg(t, t0 - 0.6, t0 + 0.4)) * (1 - ease(seg(t, t0 + 1.6, t0 + 2.6)));
            const gone = t >= t0 + 0.3;
            f.pose({ t, talk: talk[i], bow, lay, noCard: gone, look: 0 });
            const c = cards[i];
            if (!gone) {
              f.cardWorld(c.from);
              group.worldToLocal(c.from);
            }
            const k = seg(t, t0 + 0.3, t0 + 1.9);
            c.m.visible = gone;
            if (gone) {
              const e = ease(k);
              const sp = SPOTS[i];
              c.m.position.set(lerp(c.from.x, sp[0], e), lerp(c.from.y, 0.012, e) + Math.sin(k * Math.PI) * 0.35, lerp(c.from.z, sp[1], e));
              c.m.rotation.set(-Math.PI / 2 * e, (1 - e) * (i - 1) * 0.6 + Math.PI, (1 - e) * 1.2 * (i - 1));
            }
            const land = seg(t, t0 + 1.8, t0 + 2.2);
            c.halo.position.set(SPOTS[i][0], 0.02, SPOTS[i][1]);
            c.halo.scale.setScalar(0.8 + land * 0.4 + seg(t, 24, 29) * 0.6);
            c.halo.material.opacity = land * (0.35 + 0.12 * Math.sin(t * 3 + i)) + seg(t, 24, 28) * 0.15;
            c.m.material.emissive.set('#3a2410').multiplyScalar(1 + seg(t, 24, 28) * 2);
          });
          // the camera
          if (t < 5) {
            const k = ease(seg(t, 0, 5));
            cam.position.set(lerp(-3.4, -1.6, k), lerp(3.4, 2.1, k), lerp(-7.5, -5.2, k));
            look.set(0, lerp(2.4, 1.9, k), 2);
          } else if (t < 13) {
            const k = ease(seg(t, 5, 13));
            cam.position.set(lerp(1.2, -1.2, k), 2.45, -4.8);
            look.set(lerp(-2.3, 2.3, k), 2.4, 2.8);
          } else if (t < 19) {
            const k = ease(seg(t, 13, 19));
            cam.position.set(lerp(9.4, 8.2, k), lerp(3.0, 2.2, k), lerp(-2.2, -2.8, k));
            look.set(0, lerp(1.6, 0.8, k), lerp(1.6, 1.0, k));
          } else if (t < 24) {
            const k = ease(seg(t, 19, 24));
            cam.position.set(lerp(0.5, 0.2, k), lerp(0.5, 0.7, k), lerp(-0.4, -0.7, k));
            look.set(0, lerp(1.2, 2.9, k), 3.4);
          } else {
            const k = ease(seg(t, 24, 30));
            cam.position.set(0, lerp(2.2, 6.2, k), lerp(-6, -9.5, k));
            look.set(0, lerp(1.6, 1.2, k), lerp(1.2, 1.6, k));
          }
          cam.lookAt(tmp.copy(look));
          FU.uWarm.value = 0.3 + seg(t, 24, 28) * 0.15;
          FU.uFlash.value = SH.flash.value * 0.04;
        },
      };
    },
  });
})();
