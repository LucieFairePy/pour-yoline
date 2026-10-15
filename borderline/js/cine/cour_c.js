// Cinematic « La table de Trèfle » (end of the table of clubs in the Cour, after the Roi de Trèfle
// is won and before his reward; played by js/levels/tr_cK.js). In the rotunda, around a round card
// table of green baize, the two of you hand in hand; across it the three club figures (Veilleurs in
// court costumes, js/world/cour_c.js) lay their cards down one by one, the Valet, the Dame, the
// Roi, each with a word; the three cards light up on the baize; the figures bow. A last line.
// Built on js/cine/cut.js (Cut.define); skippable like the others.
(() => {
  const DUR = 31;
  const V_ = 'Le Valet de Trèfle';
  const D_ = 'La Dame de Trèfle';
  const K_ = 'Le Roi de Trèfle';
  const SUBS = [
    [6.3, 10.4, 'Une corde chacun, et pas une seconde d’écart. Bien tiré.', V_],
    [11.8, 15.9, 'L’un voyait, l’autre menait. Mes poulies s’en souviendront.', D_],
    [17.4, 21.6, 'Et à deux, vous n’avez penché d’aucun côté.', K_],
    [23.2, 26.6, 'La table de Trèfle est à vous.', K_],
  ];
  // [figure, card up, laid, the spot of the card on the table]
  const LAY = [
    ['V', 6.0, 8.6, [-0.62, 0.2]],
    ['D', 11.5, 14.1, [0, 0.42]],
    ['K', 17.1, 19.8, [0.62, 0.2]],
  ];

  Cut.define('cour_c', {
    dur: DUR,
    subs: SUBS,
    titles: [[1.4, 5.2, '♣', 'La table de Trèfle']],
    score(A) {
      // a low green chord under the storm, the harpsichord of the court for each card, bells
      A.noise(0, 6, 180, 90, 0.05, 'lowpass', 0.6);
      A.pad([45, 52, 57, 60], 0.2, 11, 0.04);
      A.pad([43, 50, 55, 59], 10.8, 11, 0.04);
      A.pad([48, 55, 60, 64, 67], 21.4, 9.6, 0.045, { a: 0.3, r: 0.4 });
      LAY.forEach(([, , laid], i) => {
        [69, 72, 76].forEach((m, j) => A.pluck(m + i * 2, laid - 0.5 + j * 0.11, 0.045));
        A.bell(81 + i * 2, laid + 0.05, 0.035, 2.4);
      });
      [76, 79, 84, 88].forEach((m, i) => A.bell(m, 22.4 + i * 0.5, 0.035, 3));
      [72, 76, 79].forEach((m, i) => A.pluck(m, 27 + i * 0.16, 0.04, 1.4));
    },
    build(K) {
      const { scene, cam, group, ease, seg, FU, lights } = K;
      scene.background = new THREE.Color('#0b1414');
      scene.fog = null;
      const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
      const add = (geo, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        group.add(m);
        return m;
      };
      // ---------- the set: a storm sky, the marble floor, columns, the table ----------
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
              vec3 c = mix(vec3(0.09,0.15,0.14), vec3(0.01,0.025,0.03), smoothstep(-0.05, 0.6, y));
              vec2 q = vD.xz / (0.25 + max(y, 0.0)) * 1.4 + vec2(uT * 0.02, 0.0);
              float cl = n(q) * 0.6 + n(q * 2.3) * 0.4;
              c = mix(c, vec3(0.08,0.12,0.12), smoothstep(0.45, 0.8, cl) * smoothstep(0.05, 0.4, y));
              c += uF * vec3(0.5,0.6,0.7) * (0.3 + cl);
              gl_FragColor = vec4(c, 1.0);
            }`,
        }),
      );
      const marble = LvKit.tex(512, 512, (g, w, h) => {
        LvKit.grain(g, w, h, '#1e4a34', 0.06, 9000);
        g.strokeStyle = 'rgba(200,236,214,0.35)';
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
      }, 6, 6);
      const floor = add(new THREE.CircleGeometry(14, 64).rotateX(-Math.PI / 2), std('#ffffff', 0.35, 0.05, { map: marble }));
      floor.receiveShadow = true;
      const ring = add(new THREE.TorusGeometry(10, 0.12, 8, 96).rotateX(Math.PI / 2), std('#e0b060', 0.35, 0.85), 0, 0.01, 0);
      ring.scale.setScalar(0.7);
      const stone = std('#c9c6b4', 0.85);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        if (Math.cos(a) < -0.6) continue;
        add(new THREE.CylinderGeometry(0.5, 0.56, 9, 18), stone, Math.sin(a) * 9.5, 4.5, Math.cos(a) * 9.5);
        add(new THREE.BoxGeometry(1.3, 0.4, 1.3), std('#7d9486', 0.6), Math.sin(a) * 9.5, 9.1, Math.cos(a) * 9.5);
      }
      // the table: an oak drum, a baize top, a brass rim
      const felt = LvKit.tex(256, 256, (g, w, h) => LvKit.grain(g, w, h, '#1f5a3c', 0.08, 12000), 3, 3);
      add(new THREE.CylinderGeometry(1.25, 1.35, 0.9, 40), std('#5a3a24', 0.7), 0, 0.45, 0);
      add(new THREE.CylinderGeometry(1.75, 1.75, 0.08, 64), std('#ffffff', 0.95, 0, { map: felt }), 0, 0.94, 0);
      add(new THREE.TorusGeometry(1.75, 0.05, 8, 64).rotateX(Math.PI / 2), std('#e0b060', 0.35, 0.85), 0, 0.97, 0);
      const lamp = new THREE.PointLight('#ffd8a0', 0.75, 10, 2);
      const tmpC = V3();
      const tmpD = V3();
      lamp.position.set(0, 4.2, 0);
      group.add(lamp);
      add(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd8a0').multiplyScalar(2), toneMapped: false }), 0, 4.3, 0);
      const green = new THREE.PointLight('#7dffb0', 0, 6, 2);
      green.position.set(0, 1.6, 0.2);
      group.add(green);
      // motes of gold over the table at the end
      const N = 160;
      const mp = new Float32Array(N * 3);
      const r0 = rng(12);
      for (let i = 0; i < N; i++) mp.set([(r0() - 0.5) * 3, 1 + r0() * 2.5, (r0() - 0.5) * 3], i * 3);
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
      const dot = LvKit.tex(64, 64, (g) => {
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
      });
      const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#ffe2a0', map: dot, size: 0.06, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      group.add(motes);

      // ---------- the figures, their cards laid on the table ----------
      const F = {};
      const spots = { V: [-2.1, 2.3, -0.75], D: [0, 2.9, Math.PI], K: [2.1, 2.3, 0.75] };
      ['V', 'D', 'K'].forEach((k) => {
        const f = CourC.figure(k);
        f.g.position.set(spots[k][0], 0, spots[k][1]);
        f.g.rotation.y = Math.PI + (k === 'V' ? 0.65 : k === 'K' ? -0.65 : 0);
        group.add(f.g);
        F[k] = f;
      });
      const laid = {};
      LAY.forEach(([k, , , at]) => {
        const rank = CourC.FIG[k].rank;
        const m = add(
          new THREE.PlaneGeometry(0.42, 0.6).rotateX(-Math.PI / 2),
          new THREE.MeshStandardMaterial({ map: Tex.card(rank, '♣'), roughness: 0.55, emissive: '#ffe8b0', emissiveIntensity: 0, emissiveMap: Tex.card(rank, '♣') }),
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
        seek(t, dt) {
          const step = Math.max(0, Math.min(0.1, t - last >= 0 && t - last < 0.5 ? t - last : 0.016));
          last = t;
          sky.material.uniforms.uT.value = t;
          // lightning far away, twice
          const fl = Math.max(0, 1 - Math.abs(t - 2.2) * 8) + Math.max(0, 1 - Math.abs(t - 15.2) * 9) * 0.6;
          sky.material.uniforms.uF.value = fl;
          FU.uFlash.value = fl * 0.08;
          lights.amb.color.set('#5a7a72');
          lights.amb.intensity = 0.26;
          lights.key.color.set('#ffe2c8');
          lights.key.intensity = 0.55;
          lights.key.position.set(-4, 7, -5);
          lights.rim.color.set('#7dffb0');
          lights.rim.intensity = 0.45;
          lights.rim.position.set(3, 4, 7);
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
            CourC.poseFig(f, t, step, { hold, lay, bow, talk: talking, look: couple });
            f.card.visible = t > up && t < down;
            laid[k].visible = t >= down;
            if (laid[k].visible) {
              const e = seg(t, down, down + 0.5);
              laid[k].position.y = 0.99 + (1 - ease(e)) * 0.25;
              laid[k].material.emissiveIntensity = seg(t, 22.4, 24) * 0.05 * (0.85 + Math.sin(t * 3 + up) * 0.15);
            }
          });
          green.intensity = seg(t, 22.4, 24.5) * 0.9;
          motes.material.opacity = seg(t, 22.6, 24.5) * 0.8 * (1 - seg(t, 29.4, 31));
          const mp2 = motes.geometry.attributes.position;
          for (let i = 0; i < N; i++) mp2.setY(i, 1 + ((mp2.getY(i) - 1 + step * 0.25) % 2.5));
          mp2.needsUpdate = true;
          FU.uWarm.value = 0.15 + seg(t, 22, 25) * 0.25;
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
            // from the side of the table, low: the figure, its card, the baize
            const side = who === 'K' ? -1 : 1;
            cam.position.set(lerp(sx * 0.3 + side * 2.6, sx * 0.3 + side * 2.2, k), lerp(1.5, 1.7, k), lerp(-1.6, -1.2, k));
            cam.lookAt(lerp(sx * 0.8, sx * 0.7, k), lerp(2.0, 1.45, k), lerp(sz * 0.8, sz * 0.55, k));
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
