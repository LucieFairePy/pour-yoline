const ENV = (() => {
  const g = new THREE.Group();
  g.visible = false;
  rig.add(g);
  const EW = 0.3,
    EH = 0.2;
  const fibers = (x, w, h, base1, base2) => {
    const gr = x.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, base1);
    gr.addColorStop(1, base2);
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      x.strokeStyle = `rgba(${Math.random() < 0.5 ? '120,40,60' : '255,255,255'},${0.03 + Math.random() * 0.05})`;
      x.lineWidth = 0.6 + Math.random();
      const px = Math.random() * w,
        py = Math.random() * h,
        a = Math.random() * 6.28,
        l = 3 + Math.random() * 14;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      x.stroke();
    }
    const v = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(90,20,40,.18)');
    x.fillStyle = v;
    x.fillRect(0, 0, w, h);
  };
  const T = (w, h, draw) => {
    const t = canvasTex(w, h, draw);
    t.encoding = THREE.LinearEncoding;
    return t;
  };

  const backTex = T(1536, 1024, (x, w, h) => {
    fibers(x, w, h, '#f6cdd5', '#e9adba');
    const tri = (pts, c1, c2, sh) => {
      x.save();
      x.beginPath();
      pts.forEach(([px, py], i) => (i ? x.lineTo(px * w, py * h) : x.moveTo(px * w, py * h)));
      x.closePath();
      const gr = x.createLinearGradient(pts[0][0] * w, pts[0][1] * h, pts[1][0] * w, pts[1][1] * h);
      gr.addColorStop(0, c1);
      gr.addColorStop(1, c2);
      x.fillStyle = gr;
      x.fill();
      x.shadowColor = 'rgba(90,20,40,.45)';
      x.shadowBlur = 18;
      x.shadowOffsetY = sh;
      x.strokeStyle = 'rgba(150,60,80,.35)';
      x.lineWidth = 2.5;
      x.stroke();
      x.restore();
    };
    tri(
      [
        [0, 0],
        [0.52, 0.56],
        [0, 1],
      ],
      'rgba(255,235,240,.18)',
      'rgba(140,50,70,.12)',
      0,
    );
    tri(
      [
        [1, 0],
        [0.48, 0.56],
        [1, 1],
      ],
      'rgba(140,50,70,.14)',
      'rgba(255,235,240,.12)',
      0,
    );
    tri(
      [
        [0, 1],
        [0.5, 0.44],
        [1, 1],
      ],
      'rgba(255,240,244,.22)',
      'rgba(150,60,80,.1)',
      -6,
    );
    for (let i = 0; i < 1600; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });

  const drawFront = (x, w, h) => {
    fibers(x, w, h, '#f7d2d9', '#ecb3bf');
    x.save();
    x.translate(w * 0.14, h * 0.58);
    x.rotate(-0.04);
    x.fillStyle = '#3a1424';
    x.font = 'italic 64px "Kalam", "Segoe Print", cursive';
    x.fillText('Pour', 0, -120);
    x.font = '700 170px "Kalam", "Segoe Print", cursive';
    x.fillText(CONFIG.name, 40, 40);
    x.strokeStyle = '#3a1424';
    x.lineWidth = 6;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(30, 85);
    x.bezierCurveTo(300, 70, 600, 100, 860, 70);
    x.stroke();
    x.fillStyle = '#8e5a6b';
    x.font = '500 30px "IBM Plex Mono", monospace';
    x.fillText('EN MAIN PROPRE · NE PAS PLIER', 40, 170);
    x.restore();
    x.save();
    x.translate(w * 0.8, h * 0.23);
    x.rotate(0.05);
    x.fillStyle = '#fff8f2';
    for (let i = 0; i < 2; i++) {
      x.beginPath();
      x.rect(-125, -150, 250, 300);
      x.fill();
    }
    x.fillStyle = '#f6cdd5';
    for (let k = -125; k <= 125; k += 22) {
      [
        [-150, k],
        [150, k],
      ].forEach(([yy, xx]) => {
        x.beginPath();
        x.arc(xx, yy, 9, 0, 7);
        x.fill();
      });
    }
    for (let k = -150; k <= 150; k += 22) {
      [
        [-125, k],
        [125, k],
      ].forEach(([xx, yy]) => {
        x.beginPath();
        x.arc(xx, yy, 9, 0, 7);
        x.fill();
      });
    }
    const sg = x.createLinearGradient(0, -130, 0, 130);
    sg.addColorStop(0, '#c4173a');
    sg.addColorStop(1, '#6e0719');
    x.fillStyle = sg;
    x.fillRect(-105, -130, 210, 260);
    x.fillStyle = '#fbefe6';
    heartPath(x, 0, -10, 150);
    x.fill();
    x.font = 'italic 600 34px "Bodoni Moda", Georgia, serif';
    x.textAlign = 'center';
    x.fillText('∞', 0, 92);
    x.font = '500 16px "IBM Plex Mono", monospace';
    x.fillText('LETTRE D’AMOUR', 0, 118);
    x.restore();
    x.save();
    x.translate(w * 0.63, h * 0.3);
    x.rotate(-0.25);
    x.globalAlpha = 0.62;
    x.strokeStyle = '#3a1424';
    x.lineWidth = 6;
    x.beginPath();
    x.arc(0, 0, 120, 0, 7);
    x.stroke();
    x.lineWidth = 3;
    x.beginPath();
    x.arc(0, 0, 88, 0, 7);
    x.stroke();
    x.fillStyle = '#3a1424';
    x.font = '600 30px "IBM Plex Mono", monospace';
    x.textAlign = 'center';
    x.fillText(
      new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
        .format(new Date())
        .replace('.', '')
        .toUpperCase(),
      0,
      10,
    );
    x.font = '600 20px "IBM Plex Mono", monospace';
    x.fillText('BUREAU DU CŒUR', 0, -40);
    x.fillText('ORBITE BASSE', 0, 52);
    x.lineWidth = 6;
    for (let r = 0; r < 4; r++) {
      x.beginPath();
      for (let k = 0; k <= 40; k++) {
        const px = 140 + k * 9,
          py = -60 + r * 40 + Math.sin(k * 0.7) * 10;
        k ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
    x.restore();
  };
  const frontTex = T(1536, 1024, drawFront);
  const paperMat = (map, k = 0.9) => pbr({ map, roughness: 0.86, metalness: 0 }, k);
  const edge = pbr({ color: 0xeab0bd, roughness: 0.9 }, 0.7);
  const body = new THREE.Mesh(roundBox(EW, EH, 0.005, 0.0016), edge);
  g.add(body);
  const backFace = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), paperMat(backTex));
  backFace.position.z = 0.0029;
  g.add(backFace);
  const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), paperMat(frontTex));
  frontFace.position.z = -0.0029;
  frontFace.rotation.y = Math.PI;
  g.add(frontFace);

  const paper = new THREE.Group();
  paper.position.z = 0.0005;
  g.add(paper);
  const letterTex = T(1024, 1024, (x, w, h) => {
    fibers(x, w, h, '#fffaf4', '#f3e3d6');
    x.strokeStyle = 'rgba(168,16,44,.07)';
    x.lineWidth = 3;
    for (let y = 90; y < h; y += 58) {
      x.beginPath();
      x.moveTo(40, y);
      x.lineTo(w - 40, y);
      x.stroke();
    }
    x.fillStyle = 'rgba(58,20,36,.06)';
    for (let i = 0; i < 14; i++) {
      x.fillRect(80 + Math.random() * 120, 100 + i * 58 - 14, 420 + Math.random() * 380, 10);
    }
  });
  const lpMat = pbr({ map: letterTex, roughness: 0.9, side: THREE.DoubleSide }, 0.9);
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.272, 0.09), lpMat);
  p1.position.y = 0.045;
  paper.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.272, 0.09), lpMat);
  p2.position.set(0, -0.045, -0.004);
  p2.rotation.x = 0.09;
  paper.add(p2);
  const crease = new THREE.Mesh(
    new THREE.BoxGeometry(0.272, 0.0015, 0.0015),
    pbr({ color: 0xe9d8cc, roughness: 0.9 }, 0.8),
  );
  crease.position.set(0, 0, -0.001);
  paper.add(crease);
  paper.position.y = 0;

  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, EH / 2, 0.0035);
  g.add(flapPivot);
  const fs = new THREE.Shape();
  fs.moveTo(-EW / 2, 0);
  fs.lineTo(EW / 2, 0);
  fs.lineTo(0.03, -0.112);
  fs.quadraticCurveTo(0, -0.13, -0.03, -0.112);
  fs.lineTo(-EW / 2, 0);
  const flapGeo = new THREE.ShapeGeometry(fs, 24);
  const flapTex = T(1024, 512, (x, w, h) => {
    fibers(x, w, h, '#f9d7de', '#e8a9b6');
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,.18)');
    gr.addColorStop(1, 'rgba(120,30,55,.18)');
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
  });
  flapTex.repeat.set(1 / EW, 1 / 0.13);
  flapTex.offset.set(0.5, 1);
  const linerTex = T(1024, 512, (x, w, h) => {
    x.fillStyle = '#5e0a1f';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#e6b456';
    for (let yy = 20; yy < h; yy += 64)
      for (let xx = ((yy / 64) % 2) * 32 + 16; xx < w; xx += 64) {
        heartPath(x, xx, yy, 26);
        x.fill();
      }
  });
  linerTex.repeat.set(1 / EW, 1 / 0.13);
  linerTex.offset.set(0.5, 1);
  const flapOut = new THREE.Mesh(flapGeo, pbr({ map: flapTex, roughness: 0.85 }, 0.9));
  flapOut.position.z = 0.0006;
  flapPivot.add(flapOut);
  const flapIn = new THREE.Mesh(
    flapGeo,
    pbr({ map: linerTex, roughness: 0.35, metalness: 0.45, side: THREE.BackSide }, 1.6),
  );
  flapPivot.add(flapIn);
  const flapShadow = new THREE.Mesh(
    flapGeo,
    new THREE.MeshBasicMaterial({
      color: 0x5a1426,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  flapShadow.position.set(0, -0.004, 0.0002);
  flapShadow.scale.set(1.01, 1.04, 1);
  flapPivot.add(flapShadow);

  const satin = pbr({ color: 0x8e0b25, roughness: 0.28, metalness: 0.25 }, 1.4);
  const ribbon = new THREE.Group();
  ribbon.position.y = -0.012;
  g.add(ribbon);
  const rb = new THREE.Mesh(roundBox(EW + 0.004, 0.018, 0.0085, 0.0035), satin);
  ribbon.add(rb);
  const bowGeo = new THREE.TorusGeometry(0.016, 0.0045, 12, 40);
  [-1, 1].forEach((s) => {
    const lp = new THREE.Mesh(bowGeo, satin);
    lp.position.set(s * 0.019, 0.006, 0.008);
    lp.scale.set(1, 0.55, 0.6);
    lp.rotation.z = s * 0.4;
    ribbon.add(lp);
    const tail = new THREE.Mesh(roundBox(0.012, 0.045, 0.002, 0.001), satin);
    tail.position.set(s * 0.013, -0.026, 0.007);
    tail.rotation.z = s * 0.35;
    ribbon.add(tail);
  });

  const drawSeal = (x, w) => {
    x.fillStyle = '#808080';
    x.fillRect(0, 0, w, w);
    const ring = (r, lw, c) => {
      x.strokeStyle = c;
      x.lineWidth = lw;
      x.beginPath();
      x.arc(256, 256, r, 0, 7);
      x.stroke();
    };
    ring(196, 14, '#b0b0b0');
    ring(178, 6, '#5a5a5a');
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 6.283;
      x.fillStyle = '#c0c0c0';
      x.beginPath();
      x.arc(256 + Math.cos(a) * 160, 256 + Math.sin(a) * 160, 7, 0, 7);
      x.fill();
    }
    x.font = 'italic 700 250px "Bodoni Moda", Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#3a3a3a';
    x.fillText('Y', 262, 270);
    x.fillStyle = '#d8d8d8';
    x.fillText('Y', 250, 258);
    x.fillStyle = '#a8a8a8';
    x.fillText('Y', 256, 264);
  };
  const sealTex = T(512, 512, drawSeal);
  const waxMat = pbr(
    { color: 0xb3122e, roughness: 0.3, metalness: 0.08, bumpMap: sealTex, bumpScale: 0.0022 },
    1.1,
  );
  const waxSide = pbr({ color: 0x9e0e28, roughness: 0.38, metalness: 0.05 }, 1);
  const capMat = pbr({ color: 0x7a0a1f, roughness: 0.55, side: THREE.DoubleSide }, 0.8);
  const prof = [
    [0, 0.0105],
    [0.016, 0.0104],
    [0.024, 0.0098],
    [0.028, 0.0085],
    [0.031, 0.0062],
    [0.0335, 0.0032],
    [0.0345, 0.0008],
    [0.035, 0],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const ph = Math.random() * 6.28,
    drips = Array.from({ length: 5 }, () => ({
      a: Math.random() * 6.28,
      amp: 0.002 + Math.random() * 0.004,
      w: 0.18 + Math.random() * 0.2,
    }));
  const radialNoise = (a) =>
    1 +
    0.05 * Math.sin(3 * a + ph) +
    0.03 * Math.sin(7 * a + ph * 2) +
    drips.reduce(
      (s, d) =>
        s +
        (d.amp / 0.033) *
          Math.exp(-Math.pow(Math.atan2(Math.sin(a - d.a), Math.cos(a - d.a)) / d.w, 2)),
      0,
    );
  const seal = new THREE.Group();
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, -0.012, 0.009);
  g.add(seal);
  const halves = [0, Math.PI].map((phi0) => {
    const hg = new THREE.Group();
    seal.add(hg);
    const side = new THREE.LatheGeometry(prof, 40, phi0, Math.PI),
      pp = side.attributes.position,
      v = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) {
      v.fromBufferAttribute(pp, i);
      const a = Math.atan2(v.x, v.z),
        k = radialNoise(a) * (v.y < 0.002 ? 1.04 : 1);
      pp.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    side.computeVertexNormals();
    hg.add(new THREE.Mesh(side, waxSide));
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(0.0242, 48, phi0 - Math.PI / 2, Math.PI),
      waxMat,
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.0106;
    hg.add(top);
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.0104), capMat);
    cap.position.set(0, 0.0052, 0);
    cap.rotation.y = Math.PI / 2;
    hg.add(cap);
    return hg;
  });
  const glow = new THREE.PointLight(0xff8fb0, 0, 0.5, 2);
  g.add(glow);
  const refresh = () => {
    [
      [frontTex, drawFront],
      [sealTex, drawSeal],
    ].forEach(([t, d]) => {
      const c = t.image;
      d(c.getContext('2d'), c.width, c.height);
      t.needsUpdate = true;
    });
  };
  return { g, flapPivot, seal, halves, ribbon, paper, glow, refresh };
})();
