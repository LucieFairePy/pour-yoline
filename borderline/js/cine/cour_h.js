// Cinematic « La table de Cœur » (end of the table of hearts in the Cour, after the Roi de Cœur is
// won and before his reward; played by js/levels/tr_hK.js). Under the glass dome of the
// conservatory, at night, around a round table of rose velvet, the two of you hand in hand; across
// it the three heart figures (Veilleurs in court costumes, js/world/cour_h.js) lay their cards
// down one by one, the Valet, the Dame, the Roi, each with a word; the three cards light up on the
// velvet, rose petals come down from the dome; the figures bow. A last line.
// Built on js/cine/cut.js (Cut.define); skippable like the others.
(() => {
  const DUR = 31;
  const V_ = 'Le Valet de Cœur';
  const D_ = 'La Dame de Cœur';
  const K_ = 'Le Roi de Cœur';
  const SUBS = [
    [6.3, 10.4, 'Vous avez cueilli exactement celles que je voulais. Sur parole.', V_],
    [11.8, 15.9, 'Pas une goutte versée. Vous vous écoutiez comme on danse.', D_],
    [17.4, 21.6, 'Lancer sans voir, et toucher juste. Il fallait se croire.', K_],
    [23.2, 26.6, 'La table de Cœur est à vous.', K_],
  ];
  // [figure, card up, laid, the spot of the card on the table]
  const LAY = [
    ['V', 6.0, 8.6, [-0.62, 0.2]],
    ['D', 11.5, 14.1, [0, 0.42]],
    ['K', 17.1, 19.8, [0.62, 0.2]],
  ];

  Cut.define('cour_h', {
    dur: DUR,
    subs: SUBS,
    titles: [[1.4, 5.2, '♥', 'La table de Cœur']],
    score(A) {
      // a warm chord under the storm, a little waltz of the music box for each card, bells
      A.noise(0, 6, 180, 90, 0.04, 'lowpass', 0.6);
      A.pad([48, 55, 60, 64], 0.2, 11, 0.04);
      A.pad([45, 52, 57, 60], 10.8, 11, 0.04);
      A.pad([53, 57, 60, 65, 69], 21.4, 9.6, 0.045, { a: 0.3, r: 0.4 });
      LAY.forEach(([, , laid], i) => {
        [72, 76, 79].forEach((m, j) => A.pluck(m + i * 2, laid - 0.5 + j * 0.16, 0.04));
        A.bell(84 + i * 2, laid + 0.05, 0.035, 2.4);
      });
      [79, 84, 88, 91].forEach((m, i) => A.bell(m, 22.4 + i * 0.45, 0.035, 3));
      [76, 79, 84].forEach((m, i) => A.pluck(m, 27 + i * 0.2, 0.04, 1.4));
    },
    build(K) {
      const { scene, cam, group, ease, seg, FU, lights } = K;
      scene.background = new THREE.Color('#140a0e');
      scene.fog = null;
      const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
      const add = (geo, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        group.add(m);
        return m;
      };
      // ---------- the set: a storm sky seen through glass, the rose marble floor, the dome ----------
      const sky = add(
        new THREE.SphereGeometry(120, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: { uF: { value: 0 }, uT: { value: 0 } },
          vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: `
            uniform float uF, uT; varying vec3 vD;
            float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
            float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
              return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
            void main(){
              float y = vD.y;
              vec3 c = mix(vec3(0.17,0.1,0.12), vec3(0.03,0.018,0.026), smoothstep(-0.05, 0.6, y));
              vec2 q = vD.xz / (0.25 + max(y, 0.0)) * 1.4 + vec2(uT * 0.02, 0.0);
              float cl = n(q) * 0.6 + n(q * 2.3) * 0.4;
              c = mix(c, vec3(0.16,0.1,0.11), smoothstep(0.45, 0.8, cl) * smoothstep(0.05, 0.4, y));
              c += uF * vec3(0.7,0.62,0.8) * (0.3 + cl);
              gl_FragColor = vec4(c, 1.0);
            }`,
        }),
      );
      const marble = LvKit.tex(512, 512, (g, w, h) => {
        LvKit.grain(g, w, h, '#d8aaa8', 0.05, 9000);
        g.strokeStyle = 'rgba(150,60,80,0.3)';
        for (let i = 0; i < 26; i++) {
          g.lineWidth = 0.6 + Math.random() * 2;
          g.beginPath();
          let x = Math.random() * w;
          let y = Math.random() * h;
          g.moveTo(x, y);
          for (let k = 0; k < 8; k++) {
            x += (Math.random() - 0.3) * 60;
            y += (Math.random() - 0.5) * 50;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.strokeStyle = 'rgba(120,70,70,0.4)';
        g.lineWidth = 2;
        for (let i = 0; i <= 8; i++) {
          g.beginPath();
          g.moveTo((i * w) / 8, 0);
          g.lineTo((i * w) / 8, h);
          g.moveTo(0, (i * h) / 8);
          g.lineTo(w, (i * h) / 8);
          g.stroke();
        }
      }, 6, 6);
      const floor = add(new THREE.CircleGeometry(14, 64).rotateX(-Math.PI / 2), std('#ffffff', 0.3, 0.05, { map: marble }));
      floor.receiveShadow = true;
      const gold = std('#e0b45a', 0.32, 0.9);
      const ring = add(new THREE.TorusGeometry(10, 0.12, 8, 96).rotateX(Math.PI / 2), gold, 0, 0.01, 0);
      ring.scale.setScalar(0.7);
      // white iron columns, a glass dome on ribs
      const iron = std('#efe6da', 0.45, 0.4);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        if (Math.cos(a) < -0.6) continue;
        add(new THREE.CylinderGeometry(0.22, 0.26, 7, 14), iron, Math.sin(a) * 9.5, 3.5, Math.cos(a) * 9.5);
        add(new THREE.BoxGeometry(0.7, 0.3, 0.7), gold, Math.sin(a) * 9.5, 7.1, Math.cos(a) * 9.5);
        const rib = add(new THREE.TorusGeometry(9.5, 0.08, 6, 40, Math.PI / 2), iron, 0, 7.2, 0);
        rib.rotation.set(0, -a + Math.PI / 2, 0);
        rib.scale.set(1, 0.55, 1);
      }
      add(
        new THREE.SphereGeometry(9.5, 40, 16, 0, TAU, 0, Math.PI / 2).scale(1, 0.55, 1),
        new THREE.MeshStandardMaterial({ color: '#e8f0f0', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
        0,
        7.2,
        0,
      );
      // roses in pots around the edge, the leaves dark, the blooms red and pink
      const bloom = CourH.bloomGeo();
      const bm = [std('#b8102c', 0.55, 0, { side: THREE.DoubleSide }), std('#f27a98', 0.55, 0, { side: THREE.DoubleSide }), std('#f6efe6', 0.55, 0, { side: THREE.DoubleSide })];
      const leafM = std('#2c4a22', 0.9);
      for (let i = 0; i < 10; i++) {
        const a = ((i + 0.5) / 10) * TAU;
        if (Math.cos(a) < -0.5) continue;
        const x = Math.sin(a) * 7.6;
        const z = Math.cos(a) * 7.6;
        add(new THREE.CylinderGeometry(0.45, 0.34, 0.6, 16), std('#c89088', 0.9), x, 0.3, z);
        add(new THREE.IcosahedronGeometry(0.55, 1), leafM, x, 1.0, z).scale.set(1, 0.85, 1);
        for (let k = 0; k < 5; k++) {
          const b = add(bloom, bm[(i + k) % 3], x + Math.sin(k * 2.3) * 0.38, 1.25 + (k % 2) * 0.18, z + Math.cos(k * 2.3) * 0.38);
          b.scale.setScalar(1.3);
        }
      }
      // the table: a round drum under rose velvet, a gold rim, a candelabrum
      const velvet = std('#8a1a34', 0.92);
      const velvetTex = LvKit.tex(256, 256, (g, w, h) => LvKit.grain(g, w, h, '#9a1f3a', 0.08, 12000), 3, 3);
      add(new THREE.CylinderGeometry(1.25, 1.55, 0.92, 48, 1, true), velvet, 0, 0.46, 0);
      add(new THREE.CylinderGeometry(1.78, 1.78, 0.08, 64), std('#ffffff', 0.9, 0, { map: velvetTex }), 0, 0.94, 0);
      add(new THREE.TorusGeometry(1.78, 0.05, 8, 64).rotateX(Math.PI / 2), gold, 0, 0.97, 0);
      // the fringe of the cloth
      add(new THREE.CylinderGeometry(1.8, 1.82, 0.16, 64, 1, true), std('#e0b45a', 0.6, 0.4, { side: THREE.DoubleSide }), 0, 0.84, 0);
      // a lantern of gilt and glass hanging over the table (its light warms the velvet)
      const lantern = new THREE.Group();
      lantern.position.set(0, 4.4, 0);
      group.add(lantern);
      const lm = (geo, mat, y) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y;
        lantern.add(m);
        return m;
      };
      lm(new THREE.CylinderGeometry(0.012, 0.012, 3, 6), gold, 1.6);
      lm(new THREE.ConeGeometry(0.3, 0.26, 8), gold, 0.15);
      lm(new THREE.CylinderGeometry(0.2, 0.15, 0.45, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd8a0').multiplyScalar(1.6), toneMapped: false }), -0.2);
      lm(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8), gold, -0.45);
      const lamp = new THREE.PointLight('#ffc890', 0.9, 11, 2);
      const tmpC = V3();
      const tmpD = V3();
      lamp.position.set(0, 3.9, 0);
      group.add(lamp);
      const rose = new THREE.PointLight('#ff8aa8', 0, 6, 2);
      rose.position.set(0, 1.6, 0.2);
      group.add(rose);
      // rose petals coming down from the dome at the end
      const N = 220;
      const mp = new Float32Array(N * 3);
      const r0 = rng(17);
      for (let i = 0; i < N; i++) mp.set([(r0() - 0.5) * 7, r0() * 6, (r0() - 0.5) * 7], i * 3);
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
      const petal = LvKit.tex(64, 64, (g) => {
        g.clearRect(0, 0, 64, 64);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(32, 32, 14, 24, 0.5, 0, TAU);
        g.fill();
      });
      const petals = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#ff8aa8', map: petal, size: 0.09, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.1 }));
      group.add(petals);

      // ---------- the figures, their cards laid on the table ----------
      const F = {};
      const spots = { V: [-2.1, 2.3], D: [0, 2.9], K: [2.1, 2.3] };
      ['V', 'D', 'K'].forEach((k) => {
        const f = CourH.figure(k);
        f.g.position.set(spots[k][0], 0, spots[k][1]);
        f.g.rotation.y = Math.PI + (k === 'V' ? 0.65 : k === 'K' ? -0.65 : 0);
        group.add(f.g);
        F[k] = f;
      });
      const laid = {};
      LAY.forEach(([k, , , at]) => {
        const rank = CourH.FIG[k].rank;
        const m = add(
          new THREE.PlaneGeometry(0.42, 0.6).rotateX(-Math.PI / 2),
          new THREE.MeshStandardMaterial({ map: Tex.card(rank, '♥'), roughness: 0.55, emissive: '#ffe0d0', emissiveIntensity: 0, emissiveMap: Tex.card(rank, '♥') }),
          at[0],
          0.99,
          at[1],
        );
        m.rotation.y = Math.PI + at[0] * 0.3;
        m.material.color.setScalar(0.62);
        m.visible = false;
        laid[k] = m;
      });
      // ---------- the two of you ----------
      const D = K.rig('yoline');
      const V = K.rig('william');
      const P = HQRig.P;
      const look = V3();
      const cardsAt = V3(0, 1, 0.3);
      const shot = (t) => {
        if (t < 5.6) return 'wide';
        if (t < 11.2) return 'V';
        if (t < 16.8) return 'D';
        if (t < 22.6) return 'K';
        if (t < 26.8) return 'cards';
        return 'bow';
      };
      const fov = (f) => {
        if (cam.fov !== f) {
          cam.fov = f;
          cam.updateProjectionMatrix();
        }
      };
      let last = -1;
      return {
        seek(t) {
          const step = Math.max(0, Math.min(0.1, t - last >= 0 && t - last < 0.5 ? t - last : 0.016));
          last = t;
          sky.material.uniforms.uT.value = t;
          // lightning far away, twice
          const fl = Math.max(0, 1 - Math.abs(t - 2.4) * 8) + Math.max(0, 1 - Math.abs(t - 15.4) * 9) * 0.5;
          sky.material.uniforms.uF.value = fl;
          FU.uFlash.value = fl * 0.06;
          lights.amb.color.set('#8a6a72');
          lights.amb.intensity = 0.28;
          lights.key.color.set('#ffe0c8');
          lights.key.intensity = 0.6;
          lights.key.position.set(-4, 7, -5);
          lights.rim.color.set('#ff9ab4');
          lights.rim.intensity = 0.45;
          lights.rim.position.set(3, 4, 7);
          lantern.rotation.z = Math.sin(t * 0.7) * 0.02;
          lamp.intensity = 0.8 + Math.sin(t * 9) * 0.04;
          // the couple, hand in hand, at the south of the table
          D.g.position.set(0.42, 0, -2.7);
          V.g.position.set(-0.42, 0, -2.7);
          D.g.rotation.set(0, 0, 0);
          V.g.rotation.set(0, 0, 0);
          const pd = P.stand();
          const pv = P.stand();
          const s = shot(t);
          const who = s === 'V' || s === 'D' || s === 'K' ? s : null;
          const lookUp = who ? -0.22 : s === 'cards' ? 0.25 : -0.1;
          const yawTo = who === 'V' ? 0.35 : who === 'K' ? -0.35 : 0;
          pd.head.p = lookUp + Math.sin(t * 1.2) * 0.02;
          pv.head.p = lookUp + Math.sin(t * 1.0 + 1) * 0.02;
          pd.head.y = yawTo + (s === 'bow' ? -0.25 : 0);
          pv.head.y = yawTo + (s === 'bow' ? 0.25 : 0);
          D.apply(pd);
          V.apply(pv);
          D.groundSnap(0);
          V.groundSnap(0);
          K.holdHands(D, V, pd, pv);
          D.apply(pd);
          V.apply(pv);
          // the figures: each raises its card, leans over the table, lays it, straightens up
          const couple = look.set(0, 1.4, -2.7);
          LAY.forEach(([k, up, down]) => {
            const f = F[k];
            const hold = t > up && t < down + 0.2 ? 1 : 0;
            const lay = t > down - 0.9 && t < down + 0.7 ? 1 : 0;
            const talking = SUBS.some(([a, b, , w]) => t > a && t < b && w === (k === 'V' ? V_ : k === 'D' ? D_ : K_));
            const bow = t > 27 ? 1 : lay ? 0.35 : 0;
            CourH.poseFig(f, t, step, { hold, lay, bow, talk: talking, look: couple, fan: k === 'D' && talking ? 1 : 0 });
            f.card.visible = t > up && t < down;
            laid[k].visible = t >= down;
            if (laid[k].visible) {
              const e = seg(t, down, down + 0.5);
              laid[k].position.y = 0.99 + (1 - ease(e)) * 0.25;
              laid[k].material.emissiveIntensity = seg(t, 22.4, 24) * 0.05 * (0.85 + Math.sin(t * 3 + up) * 0.15);
            }
          });
          rose.intensity = seg(t, 22.4, 24.5) * 0.9;
          petals.material.opacity = seg(t, 22.6, 24.5) * 0.9 * (1 - seg(t, 29.6, 31));
          const mp2 = petals.geometry.attributes.position;
          for (let i = 0; i < N; i++) {
            let y = mp2.getY(i) - step * (0.35 + (i % 5) * 0.05);
            if (y < 0.95) y += 5;
            mp2.setY(i, y);
            mp2.setX(i, mp2.getX(i) + Math.sin(t * 1.3 + i) * step * 0.12);
          }
          mp2.needsUpdate = true;
          FU.uWarm.value = 0.2 + seg(t, 22, 25) * 0.25;
          // ---------- the camera ----------
          if (s === 'wide') {
            const k = ease(seg(t, 0, 5.6));
            fov(38);
            cam.position.set(lerp(-3.5, -1.6, k), lerp(5.6, 3.4, k), lerp(-9.5, -6.4, k));
            cam.lookAt(0, lerp(1.8, 1.6, k), 0.6);
          } else if (who) {
            const f = F[who];
            const k = ease(seg(t, { V: 5.6, D: 11.2, K: 16.8 }[who], { V: 11.2, D: 16.8, K: 22.6 }[who]));
            fov(36);
            const sx = f.g.position.x;
            const sz = f.g.position.z;
            const side = who === 'K' ? -1 : who === 'D' ? 0.25 : 1;
            // from the side of the table, a little above the baize: the whole figure, its card
            cam.position.set(lerp(sx * 0.3 + side * 3.0, sx * 0.3 + side * 2.6, k), lerp(1.75, 1.95, k), lerp(-2.1, -1.6, k));
            cam.lookAt(lerp(sx * 0.85, sx * 0.75, k), lerp(2.25, 1.6, k), lerp(sz * 0.85, sz * 0.6, k));
          } else if (s === 'cards') {
            const k = ease(seg(t, 22.6, 26.8));
            fov(34);
            cam.position.set(lerp(0.5, -0.3, k), lerp(2.6, 2.25, k), lerp(-2.0, -1.75, k));
            cam.lookAt(cardsAt);
          } else {
            const k = ease(seg(t, 26.8, DUR));
            fov(40);
            cam.position.set(lerp(-1.4, 1.2, k), lerp(2.6, 3.4, k), lerp(-6.8, -7.8, k));
            cam.lookAt(0, 1.7, 0.8);
          }
          // the card in the hand shows its face to the camera, then lies face up as it goes down
          LAY.forEach(([k, , down]) => {
            const c = F[k].card;
            if (!c.visible) return;
            F[k].g.updateMatrixWorld(true);
            c.getWorldPosition(tmpC);
            const u = seg(t, down - 0.7, down);
            c.lookAt(tmpD.copy(cam.position).lerp(tmpC.clone().add(V3(0, 5, 0)), u));
          });
        },
      };
    },
  });
})();
