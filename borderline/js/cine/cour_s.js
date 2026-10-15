// Cinematic « La table de Pique » (after Le Roi de Pique is won, before its reward; played by the
// level itself, js/levels/tr_sR.js). In the steel throne room, the storm flashing in the windows,
// the three figures of spades stand before the two of you: the Valet bows and lays his card down,
// then the Dame, then the Roi, on one knee. The three cards glow on the slate, rise, and turn
// slowly around you, hand in hand. Built on js/cine/cut.js (Cut.define); the figures come from
// js/world/cour_s.js (CourS.figure), each with its own materials.
(() => {
  const DUR = 31;
  const SUBS = [
    [5.4, 9.6, 'Vous couriez comme on se répond. Ma carte est à vous.', 'Le Valet de Pique'],
    [11.0, 15.2, 'Jamais pour soi, toujours pour l’autre. Voici la mienne.', 'La Dame de Pique'],
    [16.6, 21.4, 'Le Joker voulait une partie. Vous lui avez montré comment on la joue.', 'Le Roi de Pique'],
    [22.6, 26.0, 'La table de Pique est levée.', 'Le Roi de Pique'],
  ];
  const TITLES = [[27.0, 30.4, 'La table de Pique', '♠ · trois figures ont posé leurs cartes']];
  // when each figure lays its card: [start of the bow, card leaves the hand, card lands]
  const LAY = { V: [6.0, 7.6, 9.0], D: [11.6, 13.2, 14.6], R: [17.4, 19.6, 21.0] };

  const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  const glow = (color, k = 1.6, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, ...extra });
  const canvasTex = (w, h, paint, rep = 1) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.anisotropy = 8;
    return t;
  };
  // slate tiles for the floor of the set
  let slateTex = null;
  const slate = () =>
    slateTex ||
    (slateTex = canvasTex(
      512,
      512,
      (g, w, h) => {
        const r = rng(5);
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            const l = 48 + r() * 18;
            g.fillStyle = `rgb(${l},${l + 3},${l + 9})`;
            g.fillRect(x * 128, y * 128, 128, 128);
            for (let i = 0; i < 300; i++) {
              g.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
              g.fillRect(x * 128 + r() * 128, y * 128 + r() * 128, 2, 2);
            }
          }
        g.strokeStyle = '#14161b';
        g.lineWidth = 4;
        for (let i = 0; i <= 4; i++) {
          g.beginPath();
          g.moveTo(i * 128, 0);
          g.lineTo(i * 128, h);
          g.moveTo(0, i * 128);
          g.lineTo(w, i * 128);
          g.stroke();
        }
      },
      6,
    ));

  Cut.define('cour_s', {
    dur: DUR,
    subs: SUBS,
    titles: TITLES,
    score(A) {
      // a cold minor that opens to major when the cards rise
      A.pad([50, 57, 62, 65], 0, 8, 0.03);
      A.pad([46, 53, 58, 62], 7.5, 7, 0.03);
      A.pad([48, 55, 60, 63], 14, 8, 0.03);
      A.pad([50, 57, 62, 66], 21.5, 9.5, 0.035, { r: 0.5 });
      // a bell as each card lands
      [LAY.V[2], LAY.D[2], LAY.R[2]].forEach((t, i) => {
        A.bell(74 + i * 3, t, 0.035, 3.2);
        A.bell(86 + i * 3, t + 0.02, 0.012, 2);
      });
      [79, 81, 83, 86, 88].forEach((m, i) => A.pluck(m, 22.4 + i * 0.5, 0.03, 1.4));
      A.noise(0.2, 6, 300, 140, 0.02, 'bandpass', 0.7);
      A.noise(23, 5, 600, 1800, 0.012, 'bandpass', 1.2);
    },
    build(K) {
      const { scene, cam, group, ease, seg, FU, lights } = K;
      scene.background = new THREE.Color('#06080c');
      scene.fog = null;
      // the set: slate floor, the dais, the iron throne, pillars, tall windows with the storm
      const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), std('#9aa0aa', 0.7, 0.1, { map: slate() }));
      group.add(floor);
      const dais = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 4), std('#5d626c', 0.8));
      dais.position.set(0, 0.25, -6.2);
      group.add(dais);
      const iron = std('#2a2e36', 0.4, 0.85);
      const throne = new THREE.Group();
      throne.position.set(0, 0.5, -7.4);
      group.add(throne);
      const tb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6.2, 0.4), iron);
      tb.position.y = 3.1;
      throne.add(tb);
      const ts = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.4), iron);
      ts.position.set(0, 0.5, 0.7);
      throne.add(ts);
      const tsp = new THREE.Mesh(new THREE.ExtrudeGeometry(CourS.spadeShape(), { depth: 0.12, bevelEnabled: false }), std('#c9d1dc', 0.3, 0.9));
      tsp.scale.setScalar(2.2);
      tsp.position.set(0, 6.9, -0.05);
      throne.add(tsp);
      [-1, 1].forEach((s) =>
        [-3, 3.5].forEach((z) => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 16, 1.6), iron);
          p.position.set(s * 7, 8, z);
          group.add(p);
        }),
      );
      // windows far behind: tall cold panes that flash with the storm
      const panes = [];
      for (let i = -3; i <= 3; i++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9), glow('#28344a', 1, { transparent: true, opacity: 0.9 }));
        w.position.set(i * 4.2, 6.5, -12);
        group.add(w);
        panes.push(w);
        const shaft = new THREE.Mesh(
          new THREE.PlaneGeometry(2.6, 22),
          new THREE.MeshBasicMaterial({ color: new THREE.Color('#c8d8ff').multiplyScalar(0.25), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
        );
        shaft.position.set(i * 4.2, 6, -7);
        shaft.rotation.x = -0.75;
        group.add(shaft);
        panes.push(shaft);
      }
      // dust in the cold light
      const N = 500;
      const pos = new Float32Array(N * 3);
      const r = rng(23);
      for (let i = 0; i < N; i++) pos.set([(r() - 0.5) * 22, r() * 9, -9 + r() * 16], i * 3);
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.04, transparent: true, opacity: 0.6, depthWrite: false }));
      group.add(dust);
      // the three figures, in a row before the dais; the couple facing them
      const F = { V: CourS.figure('V'), D: CourS.figure('D'), R: CourS.figure('R') };
      const at = { V: [-3.2, -2.2], D: [3.2, -2.2], R: [0, -3.4] };
      Object.entries(F).forEach(([k, f]) => {
        f.g.position.set(at[k][0], 0, at[k][1]);
        group.add(f.g);
      });
      const Dm = K.rig('yoline');
      const Vm = K.rig('william');
      // the cards: one per figure, from its hand to the floor, then up around the couple
      const cards = {};
      ['V', 'D', 'R'].forEach((k) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.88), new THREE.MeshBasicMaterial({ map: Tex.card(k, '♠'), side: THREE.DoubleSide, toneMapped: false }));
        m.material.color.setScalar(0.92);
        const halo = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.9),
          new THREE.MeshBasicMaterial({ map: CourS.tex.soft, color: new THREE.Color('#cfe0ff').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
        );
        halo.position.z = -0.01;
        m.add(halo);
        group.add(m);
        cards[k] = { m, halo, land: V3(at[k][0] * 0.55, 0.02, at[k][1] + 1.6) };
      });
      const handOf = (f) => {
        f.g.updateMatrixWorld(true);
        return f.arms[1].hand.getWorldPosition(V3());
      };
      const P = HQRig.P;
      const tmp = V3();
      let last = 0;
      return {
        seek(t) {
          const dt = Math.max(0, Math.min(0.1, t - last));
          last = t;
          // the stage's lights, cold (set every frame: the stage is shared by every film)
          lights.amb.color.set('#7f8fb0');
          lights.amb.intensity = 0.45;
          lights.key.color.set('#e6eeff');
          lights.key.intensity = 1.0;
          lights.key.position.set(-4, 9, 6);
          lights.rim.color.set('#9ab8ff');
          lights.rim.intensity = 0.8;
          lights.rim.position.set(3, 6, -10);
          // the storm in the windows
          const fl = Math.max(0, Math.sin(t * 0.9) > 0.97 ? 1 : 0, t > 3 && t < 3.25 ? 1 : 0, t > 18.9 && t < 19.15 ? 0.8 : 0);
          panes.forEach((p, i) => p.material.color.set(i % 2 ? '#c8d8ff' : '#28344a').multiplyScalar(i % 2 ? 0.25 + fl * 0.4 : 1 + fl * 2.5));
          FU.uFlash.value = fl * 0.08;
          dust.rotation.y = t * 0.01;
          // the couple, hand in hand
          Dm.g.position.set(-0.45, 0, 4.2);
          Vm.g.position.set(0.45, 0, 4.2);
          Dm.g.rotation.set(0, Math.PI, 0);
          Vm.g.rotation.set(0, Math.PI, 0);
          const pd = P.stand();
          const pv = P.stand();
          const up = seg(t, 22.5, 25);
          pd.head.p = -0.25 * up + Math.sin(t * 1.3) * 0.02;
          pv.head.p = -0.22 * up + Math.sin(t * 1.1 + 1) * 0.02;
          pd.head.y = 0.2 * Math.sin(t * 0.4);
          pv.head.y = -0.2 * Math.sin(t * 0.4 + 1);
          Dm.apply(pd);
          Vm.apply(pv);
          K.holdHands(Dm, Vm, pd, pv);
          Dm.apply(pd);
          Vm.apply(pv);
          Dm.groundSnap(0);
          Vm.groundSnap(0);
          // the figures: each bows and lays its card down in turn
          const look = V3(0, 1.5, 4.2);
          Object.entries(F).forEach(([k, f]) => {
            const [b0, , b2] = LAY[k];
            const bow = k === 'R' ? seg(t, b0, b0 + 2) * (1 - seg(t, 25.5, 27.5)) : seg(t, b0, b0 + 1.4) * (1 - seg(t, b2 + 0.6, b2 + 2));
            const talk = SUBS.some(([a, b, , w]) => w.includes(k === 'V' ? 'Valet' : k === 'D' ? 'Dame' : 'Roi') && t >= a && t <= b) ? 1.5 : 0;
            f.g.rotation.y = Math.atan2(look.x - f.g.position.x, look.z - f.g.position.z);
            // the Roi goes down on one knee
            f.g.position.y = k === 'R' ? -0.45 * ease(seg(t, 18, 19.8)) * (1 - seg(t, 25.5, 27.5)) : 0;
            f.update(dt, t, { bow, talk, look: bow > 0.5 ? null : look, act: null });
          });
          // the cards
          ['V', 'D', 'R'].forEach((k, i) => {
            const c = cards[k];
            const [, c1, c2] = LAY[k];
            const hand = handOf(F[k]);
            if (t < c1) {
              c.m.visible = t > c1 - 2.5;
              c.m.position.copy(hand).add(tmp.set(0, -0.12, 0.08));
              c.m.rotation.set(-0.2, F[k].g.rotation.y, 0);
              c.halo.material.opacity = 0;
            } else if (t < c2) {
              // it flutters down to the slate, face up
              const u = ease(seg(t, c1, c2));
              c.m.visible = true;
              c.m.position.lerpVectors(hand, c.land, u);
              c.m.position.x += Math.sin(u * 7 + i) * 0.18 * (1 - u);
              c.m.position.y += Math.sin(u * Math.PI) * 0.25;
              c.m.rotation.set(-Math.PI / 2 * u + Math.sin(u * 9) * 0.3 * (1 - u), F[k].g.rotation.y * (1 - u), Math.sin(u * 5 + i) * 0.4 * (1 - u));
              c.halo.material.opacity = u * 0.3;
            } else if (t < 22.6) {
              c.m.position.copy(c.land);
              c.m.rotation.set(-Math.PI / 2, 0, 0);
              c.halo.material.opacity = 0.35 + Math.sin(t * 3 + i) * 0.1;
            } else {
              // they rise and turn slowly around the couple
              const u = ease(seg(t, 22.6, 26.5));
              const a = (i / 3) * TAU + (t - 22.6) * 0.55;
              const orbit = V3(Math.sin(a) * 1.6, 1.4 + Math.sin(t * 1.3 + i) * 0.12, 4.2 + Math.cos(a) * 1.6);
              c.m.position.lerpVectors(c.land, orbit, u);
              c.m.rotation.set(-Math.PI / 2 * (1 - u), a * u, 0);
              c.halo.material.opacity = 0.35 + u * 0.4;
            }
          });
          // the camera
          const S = (a, b) => ease(seg(t, a, b));
          if (t < 4.6) {
            const k = S(0, 4.6);
            cam.position.set(lerp(-2.6, -1.6, k), lerp(5.2, 4.4, k), lerp(11.5, 9.2, k));
            cam.lookAt(0, 1.4, -2.4);
          } else if (t < 10.2) {
            const k = S(4.6, 10.2);
            cam.position.set(lerp(-0.6, -1.4, k), lerp(2.0, 1.7, k), lerp(1.8, 1.2, k));
            cam.lookAt(-3.0, lerp(2.0, 1.2, k), -2.2);
          } else if (t < 15.8) {
            const k = S(10.2, 15.8);
            cam.position.set(lerp(0.6, 1.4, k), lerp(2.0, 1.7, k), lerp(1.8, 1.2, k));
            cam.lookAt(3.0, lerp(2.0, 1.2, k), -2.2);
          } else if (t < 22.4) {
            const k = S(15.8, 22.4);
            cam.position.set(lerp(-1.2, 1.0, k), lerp(2.6, 1.8, k), lerp(2.6, 1.6, k));
            cam.lookAt(0, lerp(2.4, 1.0, k), -3.2);
          } else if (t < 27) {
            const k = S(22.4, 27);
            const a = lerp(-0.4, 0.5, k);
            cam.position.set(Math.sin(a) * 5.2, lerp(0.6, 2.2, k), 4.2 + Math.cos(a) * 5.2);
            cam.lookAt(0, lerp(0.4, 1.4, k), 4.2);
          } else {
            const k = S(27, DUR);
            cam.position.set(0, lerp(2.2, 4.0, k), lerp(9.4, 11, k));
            cam.lookAt(0, 1.5, 3.6);
          }
          FU.uWarm.value = 0.05 + seg(t, 22.5, 27) * 0.2;
        },
      };
    },
  });
})();
