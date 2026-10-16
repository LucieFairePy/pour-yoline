// ♠ 8 · Les Lames. A forge-fortress where everything cuts, in three parts:
//  1. Le couloir des lames: a long hall of traps (pendulums, floor scythes, guillotines, wall
//     blades, a bladed drum). One runs below; the other walks the glass gallery above and jams
//     one trap at a time with its lever (4 s). Halfway they swap sides.
//  2. L'armurerie: a round armoury where blade automatons wake in three waves.
//  3. La forge: the Maître des Lames, four arms and a heart in a cage; then the card.
// Every moving trap is a pure function of the shared clock T and the jam state (x.jam, x.fz), so
// both screens show the same blades at the same place. Only geometry, visuals and pure helpers
// here; Enemies/Combat are used from the level file.
const TrS5 = (() => {
  const O = V3(-700, 0, 7000);
  const group = new THREE.Group();
  group.visible = false;
  R.scene.add(group);
  const K = LvKit.builder(O, group);
  const P = K.P;
  let built = false;

  // ---------- layout (relative to O; the hall runs toward -z) ----------
  const GY = 4.5; // gallery floor
  const HALL_H = 12;
  const JAM = 4; // seconds a lever holds a trap
  const REARM = 1.5; // seconds before the next lever answers
  const ARM_C = V3(0, 0, -150); // armoury centre
  const ARM_R = 18;
  const BOSS_C = V3(0, 0, -200); // forge centre
  const BOSS_R = 20;
  const MID = { z0: -56, z1: -66 };

  // traps. kind: pend (pendulums), scy (floor scythes), guil (guillotines), wall (wall blades),
  // drum (the bladed drum that only a jam lifts). lever: where the gallery lever stands.
  const TRAPS = [
    {
      id: 'pa',
      half: 1,
      kind: 'pend',
      name: 'les pendules',
      lever: [-4.1, GY, -9],
      items: [
        { z: -5, ph: 0 },
        { z: -7.5, ph: 6.03 },
        { z: -10, ph: 3.59 },
        { z: -12.5, ph: 1.11 },
      ],
      period: 2.3,
      amp: 0.5,
    },
    {
      id: 'pb',
      half: 1,
      kind: 'scy',
      name: 'les faucheuses',
      lever: [-4.1, GY, -24.5],
      items: [
        { z: -22, w: 2.2, a0: 0, low: true },
        { z: -27, w: -2.6, a0: 1.1, low: true },
      ],
    },
    {
      id: 'pc',
      half: 1,
      kind: 'guil',
      name: 'les guillotines',
      lever: [-4.1, GY, -39.5],
      items: [
        { z: -36, ph: 0 },
        { z: -39.5, ph: 0.34 },
        { z: -43, ph: 0.68 },
      ],
      period: 3.0,
    },
    { id: 'pd', half: 1, kind: 'drum', name: 'le tambour', lever: [-4.1, GY, -51], items: [{ z: -51 }] },
    {
      id: 'pe',
      half: 2,
      kind: 'pend',
      name: 'les pendules',
      lever: [4.1, GY, -75],
      items: [
        { z: -70, ph: 0 },
        { z: -72, ph: 1.06 },
        { z: -74, ph: 1.46 },
        { z: -76, ph: 5.15 },
        { z: -78, ph: 2.91 },
      ],
      period: 1.95,
      amp: 0.5,
    },
    {
      id: 'pf',
      half: 2,
      kind: 'scy',
      name: 'les faucheuses',
      lever: [4.1, GY, -87.5],
      items: [
        { z: -85, w: 2.6, a0: 0.4, low: true },
        { z: -90.5, w: -2.0, a0: 0, low: true, high: true },
      ],
    },
    {
      id: 'pg',
      half: 2,
      kind: 'wall',
      name: 'les mâchoires',
      lever: [4.1, GY, -101.5],
      items: [
        { z: -97, side: -1, ph: 0 },
        { z: -100, side: 1, ph: 0.25 },
        { z: -103, side: -1, ph: 0.5 },
        { z: -106, side: 1, ph: 0.75 },
      ],
      period: 2.4,
    },
    { id: 'ph', half: 2, kind: 'drum', name: 'le tambour', lever: [4.1, GY, -115], items: [{ z: -115 }] },
  ];
  const TRAP = Object.fromEntries(TRAPS.map((t) => [t.id, t]));
  // safe pads a hit sends the runner back to (one before each trap, per half)
  const PADS = { 1: [-2, -16, -32.5, -46.5], 2: [-68, -80.6, -95, -110] };
  const PEND = { pivot: 11.2, L: 9.2 };
  const SCY_R = 2.95;
  const GUIL = { up: 3.5, h: 1.4 };
  const DRUM = { down: 1.6, up: 4.7, r: 2.05 };

  // ---------- trap clocks: pure functions of T and the state ----------
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const tau = (id, T, x) => {
    let t = T - ((x.fz && x.fz[id]) || 0);
    const j = x.jam;
    if (j && j.id === id) t -= Math.max(0, Math.min(T, j.e) - j.s);
    return t;
  };
  // 0 free → 1 fully jammed, eased in and out
  const jw = (id, T, x) => {
    const j = x.jam;
    if (!j || j.id !== id) return 0;
    const k = Math.min((T - j.s) / 0.35, (j.e - T) / 0.4);
    const v = clamp01(k);
    return v * v * (3 - 2 * v);
  };
  const pendAngle = (tr, it, T, x) => {
    const tt = tau(tr.id, T, x);
    const free = tr.amp * Math.sin((tt / tr.period) * Math.PI * 2 + it.ph);
    // jammed: the swing dies and the rod is hauled up into the vault, blade over the heads
    return free * (1 - jw(tr.id, T, x));
  };
  const pendLift = (tr, T, x) => 3.3 * jw(tr.id, T, x);
  const scyAngle = (tr, it, T, x) => {
    const free = it.a0 + it.w * tau(tr.id, T, x);
    const w = jw(tr.id, T, x);
    if (!w) return free;
    // jammed: stopped along the lane (bar parallel to z) so one can walk beside it
    const park = Math.round((free - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
    return free + (park - free) * w;
  };
  const guilY = (tr, it, T, x) => {
    const p = ((((tau(tr.id, T, x) / tr.period + it.ph) % 1) + 1) % 1);
    let y;
    if (p < 0.5) y = GUIL.up;
    else if (p < 0.56) {
      const k = (p - 0.5) / 0.06;
      y = GUIL.up * (1 - k * k);
    } else if (p < 0.72) y = 0;
    else {
      const k = (p - 0.72) / 0.28;
      y = GUIL.up * k * k * (3 - 2 * k);
    }
    return y + (GUIL.up - y) * jw(tr.id, T, x);
  };
  // wall blade: the tip's x. Left blades come from -x, right ones from +x.
  const wallTip = (tr, it, T, x) => {
    const p = ((((tau(tr.id, T, x) / tr.period + it.ph) % 1) + 1) % 1);
    let k;
    if (p < 0.4) k = 0;
    else if (p < 0.48) k = (p - 0.4) / 0.08;
    else if (p < 0.78) k = 1;
    else k = 1 - (p - 0.78) / 0.22;
    k *= 1 - jw(tr.id, T, x);
    // retracted tip inside the wall (3.1), thrust 1.8 m past the middle: only a narrow strip along
    // the far wall stays clear, and the next blade comes from that wall
    return it.side * (3.1 - k * 4.9);
  };
  const drumY = (tr, T, x) => DRUM.down + (DRUM.up - DRUM.down) * jw(tr.id, T, x);
  // the cycle position used by the rhythm lamps (0..1)
  const cycleOf = (tr, T, x) => {
    const tt = tau(tr.id, T, x);
    if (tr.kind === 'pend' || tr.kind === 'guil' || tr.kind === 'wall') return (((tt / tr.period) % 1) + 1) % 1;
    if (tr.kind === 'scy') return ((((tt * Math.abs(tr.items[0].w)) / Math.PI) % 1) + 1) % 1;
    return (((tt * 0.9) % 1) + 1) % 1;
  };

  // ---------- hit tests (relative feet position q, body radius r 0.35, height 1.75) ----------
  const BR = 0.35;
  const BH = 1.75;
  const trapHit = (q, T, x, half) => {
    for (const tr of TRAPS) {
      if (tr.half !== half) continue;
      for (const it of tr.items) {
        if (tr.kind === 'pend') {
          if (Math.abs(q.z - it.z) > 0.07 + BR) continue;
          const a = pendAngle(tr, it, T, x);
          const c = Math.cos(a);
          const s = Math.sin(a);
          const py = PEND.pivot + pendLift(tr, T, x);
          // three samples up the body, in the pendulum's frame, against the crescent's outline
          for (const hy of [0.3, 0.9, 1.5]) {
            const rx = q.x;
            const ry = q.y + hy - py;
            const lx = rx * c + ry * s;
            const ly = -rx * s + ry * c + PEND.L;
            const ax = Math.abs(lx);
            if (ax > 1.48 + 0.22) continue;
            const outer = -Math.sqrt(Math.max(0, 2.25 - Math.min(ax, 1.5) ** 2));
            const inner = ax < 0.8 ? -Math.sqrt(0.64 - ax * ax) - 0.15 : -0.37;
            if (ly > outer - 0.22 && ly < inner + 0.22) return tr.id;
          }
        } else if (tr.kind === 'scy') {
          const dx = q.x;
          const dz = q.z - it.z;
          if (Math.hypot(dx, dz) > SCY_R + BR) continue;
          const a = scyAngle(tr, it, T, x);
          const check = (ang, y0, y1) => {
            const ux = Math.cos(ang);
            const uz = -Math.sin(ang);
            const along = dx * ux + dz * uz;
            const perp = Math.abs(dx * uz - dz * ux);
            return Math.abs(along) < SCY_R + 0.1 && perp < 0.2 + BR && q.y < y1 && q.y + BH > y0;
          };
          if (it.low && check(a, 0.15, 0.68)) return tr.id;
          if (it.high && check(a + Math.PI / 2, 1.98, 2.36)) return tr.id;
        } else if (tr.kind === 'guil') {
          if (Math.abs(q.z - it.z) > 0.08 + BR) continue;
          const y = guilY(tr, it, T, x);
          if (y < q.y + BH - 0.05 && y + GUIL.h > q.y) return tr.id;
        } else if (tr.kind === 'wall') {
          if (Math.abs(q.z - it.z) > 0.08 + BR) continue;
          const tip = wallTip(tr, it, T, x);
          if (q.y > 2.2) continue;
          if (it.side < 0 ? q.x - BR < tip : q.x + BR > tip) return tr.id;
        } else if (tr.kind === 'drum') {
          if (Math.abs(q.z - it.z) > DRUM.r + BR - 0.25) continue;
          const yc = drumY(tr, T, x);
          if (q.y + BH > yc - DRUM.r + 0.15 && q.y < yc + DRUM.r) return tr.id;
        }
      }
    }
    return null;
  };

  // ---------- materials ----------
  const M = {};
  const mats = () => {
    // fortress walls: big dark stone blocks (a brick texture read as a toy red under the forge light)
    M.brick = Tex.mat('stone', { color: '#4a3f4a', scale: 3.2, rough: 0.9, bump: 0.8 });
    M.brickIn = Tex.mat('stone', { color: '#463b46', scale: 3.21, rough: 0.92, bump: 0.8 });
    M.brickIn.side = THREE.BackSide;
    M.stone = Tex.mat('stone', { color: '#625866', scale: 2.4, rough: 0.85 });
    M.dark = Tex.mat('stone', { color: '#352d38', scale: 2.4, rough: 0.9 });
    M.floor = Tex.mat('cobble', { color: '#4a424f', scale: 2.2, rough: 0.88 });
    M.plate = Tex.mat('metal', { color: '#2e2a34', scale: 1.3, metal: 0.1, rough: 0.95, bump: 0.5 });
    M.iron = Tex.mat('metal', { color: '#48434f', scale: 1.4, metal: 0.45, rough: 0.58 });
    M.wood = Tex.mat('wood', { color: '#4a2f22', scale: 0.9, rough: 0.75, bump: 0.5 });
    M.fabric = Tex.mat('fabric', { color: '#4a1426', scale: 3, rough: 0.95, bump: 0.3 });
    // thin parts: plain materials (a triplanar texture only sparkles on them)
    M.rod = new THREE.MeshStandardMaterial({ color: '#4d465a', metalness: 0.4, roughness: 0.5, emissive: '#100a16' });
    // polished steel without an env map: half metal, a cool emissive lift so it never goes black
    M.steel = new THREE.MeshStandardMaterial({
      color: '#c4bfcf',
      metalness: 0.45,
      roughness: 0.3,
      emissive: '#221d2c',
      emissiveIntensity: 0.6,
    });
    M.gold = new THREE.MeshStandardMaterial({
      color: '#c9a24a',
      metalness: 0.5,
      roughness: 0.32,
      emissive: '#5a3c12',
      emissiveIntensity: 0.25,
    });
    // the gallery screens: an unlit tint (a glossy pane caught the hall lamps as a white blot)
    M.glass = new THREE.MeshBasicMaterial({
      color: '#6a4a5a',
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // the cutting edges glow hot: what will hurt reads at a glance (kept under the bloom burn)
    M.edge = LvKit.glow('#ff9a4a', 0.85);
    const bt = bladeTex();
    // wall blades: shape x -5.6..0 (tip), y 0..2.2
    M.wallBlade = new THREE.MeshStandardMaterial({ map: bt, metalness: 0.4, roughness: 0.38, emissive: '#1a1622', emissiveIntensity: 0.6 });
    bt.repeat.set(1 / 5.6, 1 / 2.2);
    bt.offset.set(1, 0);
    M.lava = new THREE.MeshBasicMaterial({ map: lavaTex(), toneMapped: false });
    M.lava.color.setScalar(0.82);
    M.forge = LvKit.glow('#ff7040', 0.7);
    M.lavaDoor = new THREE.MeshBasicMaterial({ map: M.lava.map, toneMapped: false });
    M.lavaDoor.color.setScalar(0.62);
    M.heartWin = LvKit.glow('#ff6a5a', 0.62);
  };

  // ---------- canvas textures (all >= 1080 px) ----------
  const lavaTex = () =>
    LvKit.tex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#3a0a06';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 20 + Math.random() * 90;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const hot = Math.random();
        gr.addColorStop(0, hot > 0.7 ? 'rgba(255,214,120,0.9)' : 'rgba(255,120,40,0.7)');
        gr.addColorStop(0.5, 'rgba(220,60,20,0.35)');
        gr.addColorStop(1, 'rgba(120,10,4,0)');
        g.fillStyle = gr;
        for (const ox of [-w, 0, w])
          for (const oy of [-h, 0, h]) {
            g.save();
            g.translate(ox, oy);
            g.fillRect(x - r, y - r, r * 2, r * 2);
            g.restore();
          }
      }
      // dark crust cracks
      g.strokeStyle = 'rgba(30,6,4,0.55)';
      for (let i = 0; i < 60; i++) {
        g.lineWidth = 2 + Math.random() * 5;
        g.beginPath();
        let x = Math.random() * w;
        let y = Math.random() * h;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (Math.random() - 0.5) * 120;
          y += (Math.random() - 0.5) * 120;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
  const bannerTex = (suit) =>
    LvKit.tex(540, 1080, (g, w, h) => {
      LvKit.grain(g, w, h, '#3c0f1e', 0.12, 12000);
      g.strokeStyle = '#c9a24a';
      g.lineWidth = 10;
      g.strokeRect(24, 24, w - 48, h - 120);
      g.fillStyle = '#c9a24a';
      g.beginPath();
      g.moveTo(0, h - 90);
      g.lineTo(w / 2, h);
      g.lineTo(w, h - 90);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.globalCompositeOperation = 'destination-out';
      g.fill();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#e9d2a0';
      g.font = '300px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      Icons.fillText(g, suit, w / 2, h * 0.36);
      g.font = 'italic 64px Georgia, serif';
      g.fillText('Les Lames', w / 2, h * 0.66);
      g.font = 'bold 120px Georgia, serif';
      g.fillText('5', w / 2, h * 0.8);
    });
  const forgeFloorTex = () =>
    LvKit.tex(2048, 2048, (g, w, h) => {
      LvKit.grain(g, w, h, '#2a2430', 0.1, 40000);
      const c = w / 2;
      // iron plates radiating from the centre
      g.strokeStyle = 'rgba(10,6,12,0.7)';
      g.lineWidth = 6;
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        g.beginPath();
        g.moveTo(c + Math.cos(a) * 180, c + Math.sin(a) * 180);
        g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
        g.stroke();
      }
      for (const r of [180, 420, 700, 980]) {
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.stroke();
      }
      // rivets
      g.fillStyle = 'rgba(150,140,160,0.35)';
      for (const r of [420, 700, 980])
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          g.beginPath();
          g.arc(c + Math.cos(a) * (r - 18), c + Math.sin(a) * (r - 18), 6, 0, Math.PI * 2);
          g.fill();
        }
      // a heart engraved in gold around the forge pit
      g.strokeStyle = 'rgba(201,162,74,0.75)';
      g.lineWidth = 16;
      g.beginPath();
      for (let i = 0; i <= 200; i++) {
        const [x, y] = Heart.curve((i / 200) * Math.PI * 2);
        const px = c + x * 30;
        const py = c - (y - 2.5) * 30;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
      g.lineWidth = 5;
      g.beginPath();
      for (let i = 0; i <= 200; i++) {
        const [x, y] = Heart.curve((i / 200) * Math.PI * 2);
        const px = c + x * 34;
        const py = c - (y - 2.5) * 34;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    });
  // a heavy blade plate: dark forged steel, a bright honed band along the cutting side,
  // engraved spades and hearts (UV mapped: the plate moves)
  const bladeTex = () =>
    LvKit.tex(1080, 432, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#3a3644');
      gr.addColorStop(0.78, '#4e4a5a');
      gr.addColorStop(0.9, '#9a96a8');
      gr.addColorStop(1, '#d8d4e2');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      // brushed streaks
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        g.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 160, 1);
      }
      g.strokeStyle = 'rgba(20,14,26,0.6)';
      g.lineWidth = 4;
      g.strokeRect(10, 10, w * 0.82, h - 20);
      // rivets along the spine
      g.fillStyle = '#c9a24a';
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.arc(40 + i * 92, 30, 9, 0, Math.PI * 2);
        g.arc(40 + i * 92, h - 30, 9, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(201,162,74,0.55)';
      g.font = '170px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      ['♠', '♥', '♠'].forEach((c, i) => Icons.fillText(g, c, 170 + i * 260, h / 2 + 8));
    });
  // iron tread plates for the lane and the galleries: UV mapped, matte (a triplanar metal kept
  // glossy texels that caught the hall lamps as white blots)
  const treadCanvas = (() => {
    let c = null;
    return () =>
      c ||
      (c = LvKit.tex(1080, 1080, (g, w, h) => {
        LvKit.grain(g, w, h, '#2c2832', 0.1, 30000);
        g.strokeStyle = 'rgba(8,6,10,0.85)';
        g.lineWidth = 8;
        g.strokeRect(4, 4, w - 8, h - 8);
        // diamond tread
        g.fillStyle = 'rgba(120,112,132,0.32)';
        for (let y = 30; y < h; y += 60)
          for (let x = 30 + ((y / 60) % 2) * 30; x < w; x += 60) {
            g.save();
            g.translate(x, y);
            g.rotate(((y / 60) % 2 ? 1 : -1) * 0.7);
            g.fillRect(-16, -4, 32, 8);
            g.restore();
          }
        g.fillStyle = 'rgba(160,150,170,0.4)';
        [
          [24, 24],
          [w - 24, 24],
          [24, h - 24],
          [w - 24, h - 24],
        ].forEach(([x, y]) => {
          g.beginPath();
          g.arc(x, y, 10, 0, Math.PI * 2);
          g.fill();
        });
      }));
  })();
  const treadMat = (rx, ry) => {
    const t = treadCanvas().clone();
    t.needsUpdate = true;
    t.repeat.set(rx, ry);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, metalness: 0.15, color: '#bdb6c6' });
  };
  const sawTex = () =>
    LvKit.tex(1080, 1080, (g, w) => {
      const c = w / 2;
      g.clearRect(0, 0, w, w);
      g.fillStyle = '#b8b2c4';
      g.beginPath();
      const n = 36;
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const r = i % 2 ? c - 4 : c - 70;
        const px = c + Math.cos(a) * r;
        const py = c + Math.sin(a) * r;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.fill();
      g.fillStyle = '#ff9a4a';
      g.globalAlpha = 0.85;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        g.beginPath();
        g.arc(c + Math.cos(a) * (c - 14), c + Math.sin(a) * (c - 14), 9, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#4a4456';
      g.beginPath();
      g.arc(c, c, c * 0.36, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#2a2430';
      g.lineWidth = 10;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.moveTo(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42);
        g.lineTo(c + Math.cos(a) * c * 0.7, c + Math.sin(a) * c * 0.7);
        g.stroke();
      }
      g.fillStyle = '#c9a24a';
      g.font = `${c * 0.5}px Georgia`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      Icons.fillText(g, '♠', c, c * 1.04);
    });

  // ---------- geometry helpers ----------
  const heartShape = (k) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const [x, y] = Heart.curve((i / 96) * Math.PI * 2);
      if (i) s.lineTo(x * k, (y - 2.5) * k);
      else s.moveTo(x * k, (y - 2.5) * k);
    }
    return s;
  };
  const heartPath = (k, ox = 0, oy = 0) => {
    const s = new THREE.Path();
    for (let i = 96; i >= 0; i--) {
      const [x, y] = Heart.curve((i / 96) * Math.PI * 2);
      if (i === 96) s.moveTo(ox + x * k, oy + (y - 2.5) * k);
      else s.lineTo(ox + x * k, oy + (y - 2.5) * k);
    }
    return s;
  };
  // A flat slab filled by `inside(x, z)` turned into row-strip colliders (0.5 m rows, 0.2 m steps)
  const rows = (ytop, th, x0, x1, z0, z1, inside, opt = {}) => {
    const step = 0.2;
    const dz = 0.5;
    for (let z = z0 + dz / 2; z < z1; z += dz) {
      let start = null;
      for (let x = x0; x <= x1 + 1e-6; x += step) {
        const ins = x <= x1 && inside(x, z);
        if (ins && start === null) start = x;
        if (!ins && start !== null) {
          const a = start - step / 2;
          const b = x - step / 2;
          K.collider((a + b) / 2, ytop - th / 2, z, b - a, th, dz, opt);
          start = null;
        }
      }
    }
  };
  const box = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
  const deco = (geo, mat, x, y, z, ry = 0) => {
    const m = K.deco(geo, mat, x, y, z);
    m.rotation.y = ry;
    return m;
  };

  // ---------- state for the moving parts ----------
  const trapViews = {}; // id -> { items: [...], lamps: [...] }
  const levers = {};
  const gates = {};
  // the watcher's stairs, closed to the runner (switched on per client by the level)
  const locks = {};
  let embers = [];
  let screen = null;
  let screen2 = null;
  let screen3 = null;
  let card = null;
  let cardHeart = null;
  let sawRing = null;
  const spokes = [];
  const fans = [];
  const booms = [];
  let bossPit = null;
  let lavaMats = [];
  let forgeLight = null;
  let sparkT = 0;

  // ---------- trap models ----------
  const pendulumModel = (it) => {
    const g = new THREE.Group();
    g.position.copy(P(0, PEND.pivot, it.z));
    group.add(g);
    // the housing in the vault, with a gear
    deco(box(1.4, 0.9, 1.3), M.iron, 0, PEND.pivot + 0.35, it.z);
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 18).rotateX(Math.PI / 2), M.gold);
    gear.position.copy(P(0, PEND.pivot + 0.35, it.z + 0.72));
    group.add(gear);
    const arm = new THREE.Group();
    g.add(arm);
    // the rod runs on up through the housing, so a haul upward reads as sliding
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, PEND.L + 3.6, 8), M.rod);
    rod.position.y = -PEND.L / 2 + 1.8;
    arm.add(rod);
    // crescent blade under the rod end, a heart cut through it
    const s = new THREE.Shape();
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (1.08 + (0.84 * i) / n);
      const px = Math.cos(a) * 1.5;
      const py = Math.sin(a) * 1.5;
      if (i) s.lineTo(px, py);
      else s.moveTo(px, py);
    }
    for (let i = n; i >= 0; i--) {
      const a = Math.PI * (1.08 + (0.84 * i) / n);
      s.lineTo(Math.cos(a) * 0.8, Math.sin(a) * 0.8 - 0.15);
    }
    s.holes.push(heartPath(0.02, 0, -0.98));
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.03, bevelSegments: 1 }).translate(0, 0, -0.035),
      M.steel,
    );
    blade.position.y = -PEND.L;
    arm.add(blade);
    // the hot cutting edge along the outer arc
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * (1.08 + (0.84 * i) / 24);
      pts.push(V3(Math.cos(a) * 1.51, Math.sin(a) * 1.51, 0));
    }
    const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.035, 5), M.edge);
    edge.position.y = -PEND.L;
    arm.add(edge);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), M.gold);
    hub.position.y = -PEND.L + 0.05;
    arm.add(hub);
    return { g, arm, gear, lastSide: 0 };
  };
  const scytheModel = (it) => {
    const g = new THREE.Group();
    g.position.copy(P(0, 0, it.z));
    group.add(g);
    // the slot ring in the floor and the hub
    const slot = new THREE.Mesh(new THREE.RingGeometry(SCY_R - 0.1, SCY_R + 0.06, 64).rotateX(-Math.PI / 2), LvKit.glow('#5a1a10', 0.6));
    slot.position.y = 0.012;
    g.add(slot);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.9, 20), M.iron);
    hub.position.y = 0.45;
    g.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.18, 20), M.gold);
    cap.position.y = 0.98;
    g.add(cap);
    K.collider(0, 0.5, it.z, 0.8, 1.0, 0.8);
    const bar = (y, h) => {
      const b = new THREE.Group();
      b.position.y = y;
      // a long double blade: spine plus two hot edges, saw teeth on the leading side
      const spine = new THREE.Mesh(box(SCY_R * 2, h, 0.09), M.steel);
      b.add(spine);
      [-1, 1].forEach((sd) => {
        const e = new THREE.Mesh(box(SCY_R * 2 - 0.9, 0.035, 0.035), M.edge);
        e.position.set(0, sd * (h / 2), 0.05);
        b.add(e);
      });
      const tooth = new THREE.ConeGeometry(0.09, 0.22, 4).rotateZ(Math.PI / 2);
      for (let i = -6; i <= 6; i++) {
        if (Math.abs(i) < 2) continue;
        const t = new THREE.Mesh(tooth, M.steel);
        t.position.set(i * 0.42, 0, 0.12 * Math.sign(i));
        t.rotation.y = Math.sign(i) > 0 ? Math.PI / 2 : -Math.PI / 2;
        b.add(t);
      }
      g.add(b);
      return b;
    };
    const low = it.low ? bar(0.42, 0.3) : null;
    const high = it.high ? bar(2.17, 0.3) : null;
    if (high) {
      // the high blade hangs from a column on the hub
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.3, 10), M.rod);
      col.position.y = 1.5;
      g.add(col);
    }
    return { g, low, high, lastQ: 0 };
  };
  const guillotineModel = (it) => {
    const g = new THREE.Group();
    group.add(g);
    // frame posts in the wall line, crossbeam, and the blade with its weight
    [-1, 1].forEach((s) => deco(box(0.35, 5.6, 0.5), M.iron, s * 3.12, 2.8, it.z));
    deco(box(6.6, 0.6, 0.6), M.iron, 0, 5.6, it.z);
    deco(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 14).rotateZ(Math.PI / 2), M.gold, 0, 5.6, it.z + 0.35);
    const blade = new THREE.Group();
    blade.position.copy(P(0, GUIL.up, it.z));
    group.add(blade);
    const s = new THREE.Shape();
    // a slanted cutting edge, the way guillotines are
    s.moveTo(-2.98, 0.0);
    s.lineTo(2.98, 0.42);
    s.lineTo(2.98, GUIL.h);
    s.lineTo(-2.98, GUIL.h);
    s.closePath();
    s.holes.push(heartPath(0.022, 0, 0.98));
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }).translate(0, 0, -0.05), M.steel);
    blade.add(plate);
    const edgeLen = Math.hypot(5.96, 0.42);
    const edge = new THREE.Mesh(box(edgeLen, 0.05, 0.05), M.edge);
    edge.position.set(0, 0.21, 0);
    edge.rotation.z = Math.atan2(0.42, 5.96);
    blade.add(edge);
    const weight = new THREE.Mesh(box(6.0, 0.34, 0.42), M.iron);
    weight.position.y = GUIL.h + 0.17;
    blade.add(weight);
    // the chain up to the beam
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), M.rod);
    chain.position.copy(P(0, 0, it.z));
    group.add(chain);
    return { g, blade, chain, wasDown: false };
  };
  const wallBladeModel = (it) => {
    const b = new THREE.Group();
    group.add(b);
    const s = new THREE.Shape();
    // the plate, its inner end jagged like teeth (local x: 0 = tip, toward the wall = -5.6)
    s.moveTo(-5.6, 0);
    s.lineTo(-0.3, 0);
    for (let i = 0; i < 5; i++) {
      s.lineTo(0, 0.22 + i * 0.44);
      s.lineTo(-0.3, 0.44 + i * 0.44);
    }
    s.lineTo(-5.6, 2.2);
    s.closePath();
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06), M.wallBlade);
    b.add(plate);
    const edge = new THREE.Mesh(box(0.05, 2.2, 0.16), M.edge);
    edge.position.set(-0.12, 1.1, 0);
    b.add(edge);
    // the slot in the wall it comes out of
    deco(box(0.08, 2.6, 0.5), M.dark, it.side * 2.97, 1.3, it.z);
    b.scale.x = it.side < 0 ? 1 : -1;
    return { b, lastK: 0 };
  };
  const drumModel = (it) => {
    const g = new THREE.Group();
    g.position.copy(P(0, DRUM.down, it.z));
    group.add(g);
    const spin = new THREE.Group();
    g.add(spin);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 6.0, 28).rotateZ(Math.PI / 2), M.iron);
    spin.add(core);
    [-2.9, -1, 1, 2.9].forEach((x) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.16, 28).rotateZ(Math.PI / 2), M.gold);
      ring.position.x = x;
      spin.add(ring);
    });
    const bladeGeo = box(0.08, 1.15, 0.55).translate(0, 1.42, 0);
    const edgeGeo = box(0.1, 0.06, 0.6).translate(0, 2.0, 0);
    const nRow = 7;
    const nAr = 8;
    const blades = new THREE.InstancedMesh(bladeGeo, M.steel, nRow * nAr);
    const edges = new THREE.InstancedMesh(edgeGeo, M.edge, nRow * nAr);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let k = 0;
    for (let i = 0; i < nRow; i++)
      for (let j = 0; j < nAr; j++) {
        q.setFromAxisAngle(V3(1, 0, 0), (j / nAr) * Math.PI * 2 + i * 0.4);
        m4.compose(V3(-2.6 + (i * 5.2) / (nRow - 1), 0, 0), q, V3(1, 1, 1));
        blades.setMatrixAt(k, m4);
        edges.setMatrixAt(k, m4);
        k++;
      }
    spin.add(blades, edges);
    // housings in the walls and the chains that lift it
    [-1, 1].forEach((s) => {
      deco(box(0.6, 7.0, 1.6), M.iron, s * 3.3, 3.6, it.z);
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), M.rod);
      group.add(ch);
      g.userData['ch' + s] = ch;
    });
    deco(box(7.2, 0.8, 2.0), M.iron, 0, HALL_H - 0.9, it.z);
    return { g, spin, chains: [g.userData['ch-1'], g.userData.ch1], lastY: DRUM.down };
  };
  // the rhythm lamp of a trap: pulses with its cycle, turns blue and drains while jammed
  const lampModel = (tr) => {
    const z = tr.items.reduce((a, it) => a + it.z, 0) / tr.items.length;
    const x = tr.half === 1 ? 2.96 : -2.96;
    const face = tr.half === 1 ? -Math.PI / 2 : Math.PI / 2;
    const g = new THREE.Group();
    g.position.copy(P(x, 5.6, z));
    g.rotation.y = face;
    group.add(g);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), M.iron);
    g.add(plate);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: '#ff3a3a', toneMapped: false }));
    lens.position.z = 0.02;
    g.add(lens);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 40), M.gold);
    g.add(rim);
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.18), new THREE.MeshBasicMaterial({ color: '#1a1020' }));
    barBg.position.set(0, -1.05, 0.01);
    g.add(barBg);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ce0ff').multiplyScalar(0.8), toneMapped: false }));
    bar.position.set(0, -1.05, 0.02);
    g.add(bar);
    // a plaque with the trap's name
    const name = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.62),
      new THREE.MeshBasicMaterial({
        map: LvKit.tex(1080, 258, (c, w, h) => {
          c.fillStyle = '#1a1014';
          c.fillRect(0, 0, w, h);
          c.strokeStyle = '#c9a24a';
          c.lineWidth = 8;
          c.strokeRect(10, 10, w - 20, h - 20);
          c.fillStyle = '#ecd9b0';
          c.font = 'italic 112px Georgia, serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(tr.name.charAt(0).toUpperCase() + tr.name.slice(1), w / 2, h / 2 + 6);
        }),
        toneMapped: false,
      }),
    );
    name.material.color.setScalar(0.85);
    name.position.set(0, 1.25, 0.01);
    g.add(name);
    return { g, lens, bar };
  };
  const leverModel = (tr) => {
    const [x, y, z] = tr.lever;
    const g = new THREE.Group();
    g.position.copy(P(x, y, z));
    // the handle swings toward the lane
    g.rotation.y = tr.half === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(g);
    const base = new THREE.Mesh(box(0.9, 0.9, 0.7), M.iron);
    base.position.y = 0.45;
    g.add(base);
    const plate = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.012)), new THREE.MeshBasicMaterial({ color: '#ff5f8a', toneMapped: false }));
    plate.position.set(0, 0.62, 0.36);
    g.add(plate);
    const pivot = new THREE.Group();
    pivot.position.y = 0.95;
    g.add(pivot);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), M.rod);
    handle.position.y = 0.55;
    pivot.add(handle);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), M.gold);
    knob.position.y = 1.1;
    pivot.add(knob);
    K.collider(x, y + 0.45, z, 0.9, 0.9, 0.9);
    return { g, pivot, plate, k: 0 };
  };
  const gateModel = (id, x, z, w, rotY = 0) => {
    const g = new THREE.Group();
    g.position.copy(P(x, 0, z));
    g.rotation.y = rotY;
    group.add(g);
    const bars = new THREE.Group();
    g.add(bars);
    const n = Math.round(w / 0.5);
    for (let i = 0; i <= n; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6), M.rod);
      b.position.set(-w / 2 + (i * w) / n, 2.3, 0);
      bars.add(b);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6).rotateX(Math.PI), M.steel);
      tip.position.set(-w / 2 + (i * w) / n, -0.1, 0);
      bars.add(tip);
    }
    [0.9, 2.4, 3.9].forEach((y) => {
      const r = new THREE.Mesh(box(w, 0.12, 0.12), M.iron);
      r.position.y = y;
      bars.add(r);
    });
    const ht = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.02)), M.edge);
    ht.position.set(0, 2.4, 0.08);
    bars.add(ht);
    const sx = rotY ? 0.4 : w;
    const sz = rotY ? w : 0.4;
    const b = Phys.box(O.x + x, O.y + 2.3, O.z + z, sx, 4.6, sz, { dyn: true });
    gates[id] = { g, bars, b, k: 0 };
  };

  // ---------- blade enemies' helpers ----------
  const fanGeo = (r, h) => new THREE.CircleGeometry(r, 40, -Math.PI / 2 - h, 2 * h).rotateX(-Math.PI / 2);
  const fanMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff2a3a').multiplyScalar(1.3),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const boomGeo = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      s.lineTo(Math.cos(a) * 1.0, Math.sin(a) * 1.0);
      s.quadraticCurveTo(Math.cos(a + 0.55) * 0.3, Math.sin(a + 0.55) * 0.3, Math.cos(a + 1.05) * 0.22, Math.sin(a + 1.05) * 0.22);
    }
    return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }).rotateX(-Math.PI / 2);
  })();
  const BOOM = { out: 15, dur: 2.6, y: 1.15, r: 1.05 };
  const boomPos = (b, T, out) => {
    const u = (T - b.t0) / BOOM.dur;
    if (u < 0 || u > 1) return null;
    const s = BOOM.out * Math.sin(Math.PI * u);
    return out.set(b.x + b.dx * s, b.y + BOOM.y, b.z + b.dz * s);
  };

  // ---------- the boss arena's closing saw ring (phase 3) ----------
  const RING = { r0: 19.4, r1: 12, speed: 0.4, spin: 0.55 };
  const ringR = (T, x) => (x.p3 != null ? Math.max(RING.r1, RING.r0 - Math.max(0, T - x.p3 - 2) * RING.speed) : RING.r0 + 3);
  const spokeAng = (T, x, k) => (x.p3 != null ? (T - x.p3) * RING.spin + k * Math.PI : 0);

  // ---------- build ----------
  // the colliders made while building belong to the world (Phys.drop on unbuild)
  const build = () => {
    if (built) return;
    Phys.owner('tr_s5');
    try {
      make();
    } finally {
      Phys.owner(null);
    }
  };
  const make = () => {
    built = true;
    group.visible = true;
    mats();

    // ===== the hall =====
    // floors: entrance hall, the lane (tread plates), the mid landing, the antechamber
    K.solid(0, -0.25, 6, 16, 0.5, 12, M.floor);
    K.solid(0, -0.25, -61, 16, 0.5, 10, M.floor);
    K.solid(0, -0.25, -127, 16, 0.5, 10, M.floor);
    const lane = (z0, z1) => K.solid(0, -0.25, (z0 + z1) / 2, 6, 0.5, Math.abs(z1 - z0), treadMat(3, Math.abs(z1 - z0) / 2));
    lane(0, -56);
    lane(-66, -122);
    // outer walls of the whole hall
    K.solid(-8.3, HALL_H / 2, -60, 0.6, HALL_H, 144, M.brick);
    K.solid(8.3, HALL_H / 2, -60, 0.6, HALL_H, 144, M.brick);
    K.solid(0, HALL_H / 2, 12.3, 17.2, HALL_H, 0.6, M.brick);
    // ceiling (visual) with arched ribs every 7 m
    deco(box(16.6, 0.6, 145), M.dark, 0, HALL_H + 0.3, -60);
    for (let z = 10; z > -130; z -= 7) {
      deco(box(16, 0.7, 0.8), M.iron, 0, HALL_H - 0.4, z);
      [-1, 1].forEach((s) => deco(box(0.7, HALL_H, 0.9), M.stone, s * 7.75, HALL_H / 2, z));
    }
    // gallery A (left, z 3..-56): one solid block, its front face is the lane wall
    K.solid(-5.5, GY / 2, -26.5, 5.0, GY, 59, M.stone);
    // stairs up to gallery A from the entrance hall (12 steps of 0.375)
    for (let i = 0; i < 12; i++) {
      const top = (i + 1) * 0.375;
      K.solid(-5.7, top / 2, 8.75 - i * 0.5, 4.6, top, 0.5, M.stone);
    }
    // stairs down from gallery A to the mid landing
    for (let i = 0; i < 11; i++) {
      const top = GY - (i + 1) * 0.375;
      K.solid(-5.8, top / 2, -56.25 - i * 0.5, 4.4, top, 0.5, M.stone);
    }
    // right wall of the lane, half A (full height), and the seal beside the entrance gate
    K.solid(3.3, HALL_H / 2, -28, 0.6, HALL_H, 56, M.brick);
    K.solid(5.8, HALL_H / 2, -55.7, 4.4, HALL_H, 0.6, M.brick);
    K.solid(5.65, HALL_H / 2, -0.3, 4.7, HALL_H, 0.6, M.brick);
    // stairs up to gallery B from the mid landing (a metre of landing before the first step)
    for (let i = 0; i < 11; i++) {
      const top = (i + 1) * 0.375;
      K.solid(5.8, top / 2, -57.25 - i * 0.5, 4.4, top, 0.5, M.stone);
    }
    // gallery B (right, z -62.5..-122)
    K.solid(5.5, GY / 2, -92.25, 5.0, GY, 59.5, M.stone);
    // left wall of the lane, half B, and the seal behind the mid landing
    K.solid(-3.3, HALL_H / 2, -94, 0.6, HALL_H, 56, M.brick);
    K.solid(-5.8, HALL_H / 2, -66.3, 4.4, HALL_H, 0.6, M.brick);
    // each gallery is the watcher's: both stair flights led a runner along the gallery, past the
    // whole lane (invisible, camera-ignored; switched on for the runner by the level)
    locks.A = K.collider(-5.65, 6, 6.1, 4.7, 12, 6.4, { dyn: true, tag: 'nocam' });
    locks.B = K.collider(5.7, 6, -59.75, 4.6, 12, 5.7, { dyn: true, tag: 'nocam' });
    locks.A.on = locks.B.on = false;
    // stairs down from gallery B into the antechamber
    for (let i = 0; i < 11; i++) {
      const top = GY - (i + 1) * 0.375;
      K.solid(5.8, top / 2, -122.25 - i * 0.5, 4.4, top, 0.5, M.stone);
    }
    // antechamber's far wall, with the armoury door in the middle
    K.solid(-5.25, HALL_H / 2, -132.3, 5.5, HALL_H, 0.6, M.brick);
    K.solid(5.25, HALL_H / 2, -132.3, 5.5, HALL_H, 0.6, M.brick);
    deco(box(5, HALL_H - 5, 0.6), M.brick, 0, 5 + (HALL_H - 5) / 2, -132.3);
    // the galleries' glass screens (3 m: no jumping over) and their iron mullions
    const glassRun = (x, z0, z1) => {
      const len = Math.abs(z1 - z0);
      const zc = (z0 + z1) / 2;
      const pane = new THREE.Mesh(box(0.06, 3.0, len), M.glass);
      pane.position.copy(P(x, GY + 1.5, zc));
      pane.renderOrder = 2;
      group.add(pane);
      K.collider(x, GY + 1.6, zc, 0.3, 3.2, len);
      for (let z = z0; z >= z1 - 1e-6; z -= 3.5) deco(box(0.14, 3.1, 0.14), M.rod, x, GY + 1.55, z);
      deco(box(0.16, 0.12, len), M.gold, x, GY + 3.02, zc);
      deco(box(0.2, 0.1, len), M.iron, x, GY + 1.05, zc);
    };
    glassRun(-3.2, 3, -56);
    glassRun(3.2, -62.5, -122);
    // gallery floors: iron grating on top of the stone
    deco(box(4.6, 0.06, 59), treadMat(2.3, 29.5), -5.6, GY + 0.03, -26.5);
    deco(box(4.6, 0.06, 59.5), treadMat(2.3, 29.75), 5.6, GY + 0.03, -92.25);
    // racks of swords and anvils along the gallery walls
    const swordGeo = box(0.06, 1.3, 0.12);
    const hiltGeo = box(0.3, 0.06, 0.06);
    const rack = (x, z, ry) => {
      deco(box(0.2, 1.6, 2.4), M.wood, x, GY + 0.8, z, ry);
      for (let i = 0; i < 5; i++) {
        const s = deco(swordGeo, M.steel, x + (ry ? 0 : 0.15), GY + 1.0, z - 0.9 + i * 0.45, ry);
        s.rotation.z = 0.08;
        deco(hiltGeo, M.gold, x + (ry ? 0 : 0.15), GY + 1.62, z - 0.9 + i * 0.45, ry);
      }
    };
    for (let z = -2; z > -54; z -= 13) rack(-7.8, z, 0);
    for (let z = -68; z > -120; z -= 13) rack(7.8, z, Math.PI);
    const anvil = (x, y, z, ry, k = 1) => {
      const a = new THREE.Group();
      a.position.copy(P(x, y, z));
      a.rotation.y = ry;
      a.scale.setScalar(k);
      group.add(a);
      const add = (geo, mat, px, py, pz) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(px, py, pz);
        a.add(m);
        return m;
      };
      add(box(0.7, 0.5, 0.5), M.iron, 0, 0.25, 0);
      add(box(0.45, 0.35, 0.35), M.iron, 0, 0.67, 0);
      add(box(1.2, 0.3, 0.5), M.iron, 0, 0.98, 0);
      add(new THREE.ConeGeometry(0.25, 0.6, 4).rotateZ(-Math.PI / 2), M.iron, 0.88, 0.98, 0);
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8).rotateZ(1.2), M.wood, -0.2, 1.3, 0.1);
      add(box(0.3, 0.2, 0.2), M.iron, 0.12, 1.47, 0.1);
      return a;
    };
    anvil(-6.6, GY, -20, 0.3);
    anvil(6.6, GY, -96, -0.4);
    anvil(5.4, 0, 8, 0.8);
    // molten channels at the foot of the tall walls (behind iron grates)
    const lavaStrip = (x, z0, z1, w = 0.5) => {
      const len = Math.abs(z1 - z0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len).rotateX(-Math.PI / 2), M.lava);
      m.position.copy(P(x, 0.03, (z0 + z1) / 2));
      group.add(m);
      for (let z = z0; z >= z1; z -= 0.5) deco(box(w + 0.1, 0.05, 0.06), M.rod, x, 0.06, z);
    };
    lavaStrip(2.7, -1, -55);
    lavaStrip(-2.7, -67, -121);
    // big heart windows glowing from the forge behind, above the doors
    const heartWin = (x, y, z, ry, k) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(k)), M.heartWin);
      m.position.copy(P(x, y, z));
      m.rotation.y = ry;
      group.add(m);
      const fr = new THREE.Mesh(
        new THREE.ExtrudeGeometry(
          (() => {
            const s = heartShape(k * 1.12);
            s.holes.push(heartPath(k));
            return s;
          })(),
          { depth: 0.2, bevelEnabled: false },
        ),
        M.iron,
      );
      fr.position.copy(m.position);
      fr.rotation.y = ry;
      group.add(fr);
      return m;
    };
    heartWin(0, 8.4, 0.05, 0, 0.11);
    heartWin(0, 8.4, -65.6, 0, 0.09);
    heartWin(0, 8.6, -131.95, 0, 0.1);
    // banners
    const banMat = new THREE.MeshStandardMaterial({ map: bannerTex('♠'), roughness: 0.9, side: THREE.DoubleSide, emissive: '#200810', emissiveIntensity: 0.4 });
    [
      [-7.95, 8, 6, Math.PI / 2],
      [7.95, 8, 6, -Math.PI / 2],
      [-7.95, 8.5, -30, Math.PI / 2],
      [7.95, 8.5, -95, -Math.PI / 2],
      [-7.95, 8, -127, Math.PI / 2],
      [7.95, 8, -127, -Math.PI / 2],
    ].forEach(([x, y, z, ry]) => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), banMat);
      b.position.copy(P(x, y, z));
      b.rotation.y = ry;
      group.add(b);
    });
    // hanging chains in the vault
    for (let i = 0; i < 26; i++) {
      const z = 8 - i * 5.2 + Math.random() * 2;
      const x = (Math.random() < 0.5 ? -1 : 1) * (4.2 + Math.random() * 3);
      const len = 1.5 + Math.random() * 3;
      deco(new THREE.CylinderGeometry(0.04, 0.04, len, 5), M.rod, x, HALL_H - len / 2, z);
      deco(new THREE.TorusGeometry(0.16, 0.04, 5, 10), M.iron, x, HALL_H - len, z);
    }

    // ===== traps, lamps, levers =====
    TRAPS.forEach((tr) => {
      const v = { items: [] };
      tr.items.forEach((it) => {
        if (tr.kind === 'pend') v.items.push(pendulumModel(it));
        if (tr.kind === 'scy') v.items.push(scytheModel(it));
        if (tr.kind === 'guil') v.items.push(guillotineModel(it));
        if (tr.kind === 'wall') v.items.push(wallBladeModel(it));
        if (tr.kind === 'drum') v.items.push(drumModel(it));
      });
      v.lamp = lampModel(tr);
      trapViews[tr.id] = v;
      levers[tr.id] = leverModel(tr);
    });
    // the gates: into the lane, into the second lane, the armoury, out of it, the forge
    gateModel('A', 0, 0, 6);
    gateModel('B', 0, -66, 6);
    gateModel('C', 0, -132.3, 5);
    gateModel('D', 0, -168.3, 5);
    gateModel('E', 0, -180.3, 5);

    // ===== l'armurerie =====
    const ac = ARM_C;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(ARM_R + 0.4, 96).rotateX(-Math.PI / 2), M.floor);
    disc.position.copy(P(ac.x, 0.001, ac.z));
    group.add(disc);
    K.collider(ac.x, -0.25, ac.z, ARM_R * 2 + 2, 0.5, ARM_R * 2 + 2);
    const awall = new THREE.Mesh(new THREE.CylinderGeometry(ARM_R + 0.1, ARM_R + 0.1, 11, 96, 1, true), M.brickIn);
    awall.position.copy(P(ac.x, 5.5, ac.z));
    group.add(awall);
    const domeIn = new THREE.Mesh(
      new THREE.SphereGeometry(ARM_R + 0.1, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      Tex.mat('stone', { color: '#352d38', scale: 2.41, rough: 0.9 }),
    );
    domeIn.material.side = THREE.BackSide;
    domeIn.position.copy(P(ac.x, 11, ac.z));
    domeIn.scale.y = 0.45;
    group.add(domeIn);
    // ring wall colliders with the two door gaps (north = entry, south = exit)
    rows(11, 11, ac.x - ARM_R - 1.2, ac.x + ARM_R + 1.2, ac.z - ARM_R - 1.2, ac.z + ARM_R + 1.2, (x, z) => {
      const r = Math.hypot(x - ac.x, z - ac.z);
      return r >= ARM_R && r <= ARM_R + 1.1 && Math.abs(x - ac.x) > 2.5;
    });
    // forge doors (where the blades come from): arches with molten light inside
    const DOORS = [0.5, 1.2, 1.94, 2.64, 3.64, 4.34, 5.08, 5.78];
    DOORS.forEach((a) => {
      const x = ac.x + Math.cos(a) * (ARM_R - 0.05);
      const z = ac.z + Math.sin(a) * (ARM_R - 0.05);
      const ry = -a - Math.PI / 2;
      // the furnace seen through the doorway: molten light, an iron grille in front
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), M.lavaDoor);
      glow.position.copy(P(x, 1.6, z));
      glow.rotation.y = ry;
      group.add(glow);
      for (let k = -2; k <= 2; k++) {
        const tx = Math.cos(a + Math.PI / 2) * k * 0.42;
        const tz = Math.sin(a + Math.PI / 2) * k * 0.42;
        deco(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6), M.rod, x - Math.cos(a) * 0.1 + tx, 1.6, z - Math.sin(a) * 0.1 + tz);
      }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.22, 8, 24, Math.PI), M.iron);
      arch.position.copy(P(x, 3.1, z));
      arch.rotation.y = ry;
      group.add(arch);
      [-1, 1].forEach((s) => {
        const px = x + Math.cos(a + Math.PI / 2) * s * 1.25;
        const pz = z + Math.sin(a + Math.PI / 2) * s * 1.25;
        deco(box(0.45, 3.2, 0.45), M.iron, px, 1.6, pz, ry);
      });
    });
    // pillars for cover
    [0.79, 2.36, 3.93, 5.5].forEach((a) => {
      const x = ac.x + Math.cos(a) * 9.5;
      const z = ac.z + Math.sin(a) * 9.5;
      K.solid(x, 3.0, z, 1.6, 6.0, 1.6, M.stone);
      deco(box(2.0, 0.5, 2.0), M.dark, x, 0.25, z);
      deco(box(2.0, 0.5, 2.0), M.dark, x, 5.9, z);
      const t = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.011)), M.heartWin);
      t.position.copy(P(x, 3.6, z + 0.82 * Math.sign(Math.sin(a) || 1)));
      group.add(t);
    });
    anvil(ac.x, 0, ac.z, 0.5, 1.6);
    K.collider(ac.x, 0.8, ac.z, 1.8, 1.6, 1.2);
    // weapon racks along the wall
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      if (DOORS.some((d) => Math.abs(d - a) < 0.3) || Math.abs(Math.sin(a)) > 0.97) continue;
      const x = ac.x + Math.cos(a) * (ARM_R - 0.6);
      const z = ac.z + Math.sin(a) * (ARM_R - 0.6);
      const r = deco(box(0.3, 2.2, 2.6), M.wood, x, 1.1, z, -a);
      void r;
    }
    lavaMats = [M.lava];
    forgeLight = LvKit.light(group, P(ac.x, 8, ac.z), '#ffb080', 1.0, 42);

    // ===== la forge (boss arena) =====
    const bc = BOSS_C;
    // corridor between the two rooms
    K.solid(0, -0.25, -174, 6, 0.5, 13, treadMat(3, 6.5));
    K.solid(-3.0, 4, -174, 0.6, 8, 12, M.brick);
    K.solid(3.0, 4, -174, 0.6, 8, 12, M.brick);
    deco(box(6.6, 0.5, 12), M.dark, 0, 8.25, -174);
    const fdisc = new THREE.Mesh(
      new THREE.CircleGeometry(BOSS_R + 0.4, 128).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: forgeFloorTex(), color: '#8a8090', roughness: 0.66, metalness: 0.2, emissive: '#0c060a' }),
    );
    fdisc.position.copy(P(bc.x, 0.001, bc.z));
    group.add(fdisc);
    K.collider(bc.x, -0.25, bc.z, BOSS_R * 2 + 2, 0.5, BOSS_R * 2 + 2);
    const bwall = new THREE.Mesh(new THREE.CylinderGeometry(BOSS_R + 0.1, BOSS_R + 0.1, 16, 128, 1, true), M.brickIn);
    bwall.position.copy(P(bc.x, 8, bc.z));
    group.add(bwall);
    const bout = new THREE.Mesh(new THREE.CylinderGeometry(BOSS_R + 1.6, BOSS_R + 2.4, 30, 96, 1, true), M.brick);
    bout.position.copy(P(bc.x, 1, bc.z));
    group.add(bout);
    rows(16, 16, bc.x - BOSS_R - 1.2, bc.x + BOSS_R + 1.2, bc.z - BOSS_R - 1.2, bc.z + BOSS_R + 1.2, (x, z) => {
      const r = Math.hypot(x - bc.x, z - bc.z);
      return r >= BOSS_R && r <= BOSS_R + 1.1 && !(Math.abs(x - bc.x) < 2.5 && z > bc.z);
    });
    // the chimney crown, open to the sky: buttresses with braziers
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = bc.x + Math.cos(a) * (BOSS_R + 0.4);
      const z = bc.z + Math.sin(a) * (BOSS_R + 0.4);
      deco(box(1.4, 16, 1.4), M.stone, x, 8, z, -a);
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), M.forge);
      fire.position.copy(P(x - Math.cos(a) * 0.9, 9.2, z - Math.sin(a) * 0.9));
      group.add(fire);
      deco(new THREE.CylinderGeometry(0.55, 0.35, 0.5, 10), M.iron, x - Math.cos(a) * 0.9, 8.5, z - Math.sin(a) * 0.9);
    }
    // the forge pit under the Maître: a molten ring
    bossPit = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 64).rotateX(-Math.PI / 2), M.lava);
    bossPit.position.copy(P(bc.x, 0.02, bc.z));
    group.add(bossPit);
    // the saw ring of phase 3 and its two spokes (hidden until then)
    const sawMat = new THREE.MeshBasicMaterial({ map: sawTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    sawMat.color.setScalar(0.78);
    sawRing = new THREE.Group();
    sawRing.position.copy(P(bc.x, 0, bc.z));
    group.add(sawRing);
    const sawGeo = new THREE.CircleGeometry(0.85, 32);
    for (let i = 0; i < 56; i++) {
      const s = new THREE.Mesh(sawGeo, sawMat);
      s.userData.a = (i / 56) * Math.PI * 2;
      sawRing.add(s);
    }
    const track = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 128).rotateX(-Math.PI / 2), M.edge);
    track.position.y = 0.03;
    sawRing.userData.track = track;
    sawRing.add(track);
    sawRing.visible = false;
    for (let k = 0; k < 2; k++) {
      const sp = new THREE.Group();
      sp.position.copy(P(bc.x, 0.42, bc.z));
      group.add(sp);
      const bar = new THREE.Mesh(box(1, 0.28, 0.1), M.steel);
      bar.position.x = 0.5;
      sp.add(bar);
      const e = new THREE.Mesh(box(1, 0.04, 0.04), M.edge);
      e.position.set(0.5, 0.15, 0.06);
      sp.add(e);
      const e2 = e.clone();
      e2.position.y = -0.15;
      sp.add(e2);
      sp.userData = { bar, e, e2 };
      sp.visible = false;
      spokes.push(sp);
    }
    LvKit.light(group, P(bc.x, 10, bc.z + 6), '#ffa070', 1.3, 46);
    // the card, revealed when the Maître falls
    card = LvKit.trialCard('s5', false);
    card.position.copy(P(bc.x, 2.2, bc.z));
    group.add(card);
    cardHeart = Heart.galaxy(6000, 4, 51);
    cardHeart.group.scale.setScalar(0.035);
    cardHeart.group.position.copy(P(bc.x, 6.6, bc.z));
    cardHeart.core.material.opacity = 0;
    cardHeart.U.uFade.value = 0.7;
    cardHeart.group.visible = false;
    group.add(cardHeart.group);

    // ===== embers rising everywhere (one Points cloud) =====
    const N = 1400;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const zones = [
      [0, -60, 7.5, 70, 12],
      [ac.x, ac.z, ARM_R, ARM_R, 11],
      [bc.x, bc.z, BOSS_R, BOSS_R, 26],
    ];
    const emb = [];
    for (let i = 0; i < N; i++) {
      const zn = zones[i % 3];
      emb.push(zn);
      pos[i * 3] = O.x + zn[0] + (Math.random() - 0.5) * 2 * zn[2];
      pos[i * 3 + 1] = O.y + Math.random() * zn[4];
      pos[i * 3 + 2] = O.z + zn[1] + (Math.random() - 0.5) * 2 * zn[3];
      seed[i] = Math.random();
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      eg,
      new THREE.PointsMaterial({
        map: (() => {
          const cv = document.createElement('canvas');
          cv.width = cv.height = 64;
          const g = cv.getContext('2d');
          const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          gr.addColorStop(0, 'rgba(255,255,255,1)');
          gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr;
          g.fillRect(0, 0, 64, 64);
          return new THREE.CanvasTexture(cv);
        })(),
        color: new THREE.Color('#ff9a50').multiplyScalar(0.85),
        size: 0.07,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    pts.frustumCulled = false;
    group.add(pts);
    embers = { pts, pos, seed, emb };

    // ===== lights, screens =====
    LvKit.light(group, P(0, 8, 4), '#ffc090', 1.2, 30);
    LvKit.light(group, P(0, 9, -28), '#ff9a60', 1.2, 40);
    LvKit.light(group, P(0, 9, -94), '#ff9a60', 1.2, 40);
    screen = makeScreen(7.5, 3, 1024);
    screen.mesh.position.copy(P(0, 10.2, 11.95));
    screen.mesh.rotation.y = Math.PI;
    group.add(screen.mesh);
    screen2 = makeScreen(7, 2.8, 1024);
    screen2.mesh.position.copy(P(ac.x, 8.2, ac.z - ARM_R + 0.3));
    group.add(screen2.mesh);
    screen3 = makeScreen(8, 3.2, 1024);
    screen3.mesh.position.copy(P(bc.x, 11, bc.z - BOSS_R + 0.4));
    group.add(screen3.mesh);
  };

  // ---------- per-frame ----------
  const tmp = V3();
  const lastSnd = {};

  const sleep = () => {
    Object.values(gates).forEach((g) => (g.b.on = false));
    Object.values(locks).forEach((b) => (b.on = false));
    group.visible = false;
  };

  // ---------- unload (js/world/LIFECYCLE.md) ----------
  // frees the fortress's own geometry, materials and canvas textures (the fan and boomerang
  // shapes made at script load included: three sends them again at the next build), takes its
  // colliders out (the gates and the stair locks with them) and puts every table back as after a
  // page load. The tread canvas cache keeps its texture: only its clones go to the meshes.
  const clear = (o) => Object.keys(o).forEach((k) => delete o[k]);
  const unbuild = () => {
    if (!built) return null;
    sleep();
    const r = Life.free([group], [M, fanMat, boomGeo, fans.map((f) => f.m), booms.map((b) => b.m)]);
    r.world = 'tr_s5';
    r.colliders = Phys.drop('tr_s5');
    built = false;
    [M, trapViews, levers, gates, locks, lastSnd].forEach(clear);
    spokes.length = fans.length = booms.length = 0;
    embers = [];
    lavaMats = [];
    screen = screen2 = screen3 = card = cardHeart = sawRing = bossPit = forgeLight = null;
    sparkT = 0;
    return r;
  };
  const nearMe = (p, d) => Player.body.p.distanceTo(p) < d;
  const update = (dt, t, x, role, T) => {
    if (!built) return;
    // traps
    TRAPS.forEach((tr) => {
      const v = trapViews[tr.id];
      const jam = x.jam && x.jam.id === tr.id && T < x.jam.e;
      const w = jw(tr.id, T, x);
      tr.items.forEach((it, i) => {
        const m = v.items[i];
        if (tr.kind === 'pend') {
          const a = pendAngle(tr, it, T, x);
          m.arm.rotation.z = a;
          m.arm.position.y = pendLift(tr, T, x);
          m.gear.rotation.z = a * 3;
          // a swish each time the blade crosses the middle, heard near it
          const side = Math.sign(a);
          if (side !== m.lastSide && m.lastSide !== 0 && !w) {
            const bp = tmp.copy(P(0, 1.3, it.z));
            if (nearMe(bp, 9)) Sound.play('punch', bp.clone());
          }
          m.lastSide = side;
        } else if (tr.kind === 'scy') {
          const a = scyAngle(tr, it, T, x);
          if (m.low) m.low.rotation.y = a;
          if (m.high) m.high.rotation.y = a + Math.PI / 2;
          const qn = Math.floor(a / Math.PI);
          if (qn !== m.lastQ && !w) {
            const bp = P(0, 0.5, it.z);
            if (nearMe(bp, 14)) Sound.play('grapple');
          }
          m.lastQ = qn;
        } else if (tr.kind === 'guil') {
          const y = guilY(tr, it, T, x);
          m.blade.position.y = O.y + y;
          const top = GUIL.h + 0.34 + y;
          m.chain.scale.y = Math.max(0.05, 5.3 - top);
          m.chain.position.y = O.y + top + (5.3 - top) / 2;
          const down = y < 0.05;
          if (down && !m.wasDown) {
            const bp = P(0, 0.2, it.z);
            if (nearMe(bp, 20)) {
              Sound.play('thud', bp.clone());
              Fx.burst(bp.clone(), '#ffb070', 14, 4, 0.35, -8);
            }
          }
          m.wasDown = down;
        } else if (tr.kind === 'wall') {
          const tip = wallTip(tr, it, T, x);
          m.b.position.copy(P(tip, 0, it.z));
          const k = Math.abs(it.side * 3.1 - tip) / 4.9;
          if (k > 0.95 && m.lastK <= 0.95) {
            const bp = P(tip, 1.1, it.z);
            if (nearMe(bp, 16)) {
              Sound.play('punch', bp.clone());
              Fx.burst(bp.clone(), '#ffb070', 10, 3, 0.3, -6);
            }
          }
          m.lastK = k;
        } else if (tr.kind === 'drum') {
          const y = drumY(tr, T, x);
          m.g.position.y = O.y + y;
          m.spin.rotation.x -= dt * (6 * (1 - w) + 0.4);
          m.chains.forEach((ch, s) => {
            const sx = s ? 2.4 : -2.4;
            const top = HALL_H - 1.3;
            const len = top - (y + 0.9);
            ch.position.copy(P(sx, y + 0.9 + len / 2, it.z));
            ch.scale.y = Math.max(0.1, len);
          });
          if (Math.abs(y - m.lastY) > 0.01 && nearMe(P(0, 1, it.z), 26) && Math.random() < dt * 8) Sound.play('creak');
          if (!w && nearMe(P(0, 1, it.z), 14) && Math.random() < dt * 3) Sound.play('rumble', 0.6);
          m.lastY = y;
        }
      });
      // rhythm lamp
      const cyc = cycleOf(tr, T, x);
      if (jam) {
        v.lamp.lens.material.color.set('#7ce0ff').multiplyScalar(0.75);
        v.lamp.bar.visible = true;
        v.lamp.bar.scale.x = Math.max(0.001, (x.jam.e - T) / JAM);
        v.lamp.bar.position.x = -0.9 * (1 - v.lamp.bar.scale.x);
      } else {
        const pulse = Math.pow(0.5 + 0.5 * Math.cos(cyc * Math.PI * 2), 3);
        v.lamp.lens.material.color.set('#ff3a3a').multiplyScalar(0.3 + 0.55 * pulse);
        v.lamp.bar.visible = false;
      }
      // lever
      const l = levers[tr.id];
      l.k = damp(l.k, jam ? 1 : 0, 10, dt);
      l.pivot.rotation.x = 0.7 - l.k * 1.4;
      const ready = !x.jam && !(x.jcd > T);
      l.plate.material.color.set(jam ? '#7ce0ff' : ready ? '#ff5f8a' : '#5a3a46').multiplyScalar(jam ? 0.8 : ready ? 0.55 + Math.sin(t * 3) * 0.2 : 0.5);
    });
    // gates
    const gOpen = {
      A: !!x.gA,
      B: !!x.gB,
      C: x.stage < 3 || (x.stage === 3 && !x.lockC) || x.stage >= 4,
      D: x.stage >= 4 || (x.stage === 3 && x.wave >= 4),
      E: x.stage < 4 || (x.stage === 4 && !x.lockE) || x.stage >= 5,
    };
    Object.entries(gates).forEach(([id, g]) => {
      const open = gOpen[id];
      const was = g.k;
      g.k = damp(g.k, open ? 1 : 0, open ? 2.2 : 6, dt);
      g.bars.position.y = g.k * 4.7;
      g.b.on = g.k < 0.5;
      if ((was < 0.05 && g.k >= 0.05) || (was > 0.95 && g.k <= 0.95)) {
        const gp = g.g.position.clone().add(V3(0, 1, 0));
        if (Player.body.p.distanceTo(gp) < 30) Sound.play('door');
      }
    });
    // armoury / forge lava breathing
    lavaMats.forEach((m) => {
      m.map.offset.x = t * 0.01;
      m.map.offset.y = t * 0.004;
    });
    forgeLight.intensity = 0.95 + Math.sin(t * 2.3) * 0.08 + Math.sin(t * 7.1) * 0.04;
    // phase 3 saw ring and spokes
    const rr = ringR(T, x);
    const p3 = x.p3 != null && x.stage === 4;
    sawRing.visible = p3;
    if (p3) {
      sawRing.children.forEach((s) => {
        if (s.userData.a == null) return;
        const a = s.userData.a + T * 0.05;
        s.position.set(Math.cos(a) * rr, 0.75, Math.sin(a) * rr);
        s.rotation.set(0, -a, 0);
        s.rotateX(T * 9);
      });
      sawRing.userData.track.scale.setScalar(rr);
    }
    spokes.forEach((sp, k) => {
      sp.visible = p3 && T > x.p3 + 2;
      if (!sp.visible) return;
      sp.rotation.y = spokeAng(T, x, k);
      const len = Math.max(0.5, rr - 1.6);
      sp.userData.bar.scale.x = len;
      sp.userData.bar.position.x = 1.6 + len / 2;
      sp.userData.e.scale.x = len;
      sp.userData.e.position.x = 1.6 + len / 2;
      sp.userData.e2.scale.x = len;
      sp.userData.e2.position.x = 1.6 + len / 2;
    });
    // fan telegraphs and boomerang blades
    for (let i = fans.length - 1; i >= 0; i--) {
      const f = fans[i];
      f.t -= dt;
      f.m.material.opacity = 0.14 + (1 - f.t / f.max) * 0.42;
      if (f.t <= 0) {
        group.remove(f.m);
        f.m.geometry.dispose();
        f.m.material.dispose();
        fans.splice(i, 1);
      }
    }
    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      const p = boomPos(b, T, tmp);
      if (!p) {
        if (T > b.t0 + BOOM.dur) {
          group.remove(b.m);
          booms.splice(i, 1);
        } else b.m.visible = false;
        continue;
      }
      b.m.visible = true;
      b.m.position.copy(p);
      b.m.rotation.y = T * 16;
      if (Math.random() < dt * 20) Fx.burst(p.clone(), '#ffb070', 2, 1.5, 0.25, 0);
      if (!b.snd || T - b.snd > 0.35) {
        b.snd = T;
        if (Player.body.p.distanceTo(p) < 18) Sound.play('punch', p.clone());
      }
    }
    // the card
    const won = x.stage >= 5;
    card.visible = won;
    cardHeart.group.visible = won;
    if (won) {
      card.rotation.y = t * 0.8;
      card.position.y = O.y + 2.2 + Math.sin(t * 2) * 0.12;
      cardHeart.U.uTime.value = t;
      cardHeart.U.uPx.value = R.renderer.getPixelRatio() * 0.22;
      cardHeart.U.uForm.value = Math.min(1, cardHeart.U.uForm.value + dt * 0.4);
      // sparks keep raining from the vault
      sparkT -= dt;
      if (sparkT <= 0) {
        sparkT = 0.12;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 12;
        Fx.burst(P(BOSS_C.x + Math.cos(a) * r, 14, BOSS_C.z + Math.sin(a) * r), '#ffb070', 6, 1.2, 2.2, -5);
      }
    } else cardHeart.U.uForm.value = 0;
    // embers
    const E = embers;
    for (let i = 0; i < E.seed.length; i++) {
      const zn = E.emb[i];
      let y = E.pos[i * 3 + 1] + dt * (0.5 + E.seed[i] * 1.2);
      if (y > O.y + zn[4]) y = O.y;
      E.pos[i * 3 + 1] = y;
      E.pos[i * 3] += Math.sin(t * 0.7 + E.seed[i] * 40) * dt * 0.3;
    }
    E.pts.geometry.attributes.position.needsUpdate = true;
    screen.update(dt, t);
    screen2.update(dt, t);
    screen3.update(dt, t);
  };

  return {
    O,
    P,
    GY,
    JAM,
    REARM,
    TRAPS,
    TRAP,
    PADS,
    MID,
    ARM_C,
    ARM_R,
    BOSS_C,
    BOSS_R,
    BOOM,
    RING,
    group,
    build,
    unbuild,
    update,
    get built() {
      return built;
    },
    get screen() {
      return screen;
    },
    get screen2() {
      return screen2;
    },
    get screen3() {
      return screen3;
    },
    rel: K.rel,
    trapHit,
    tau,
    jw,
    pendAngle,
    guilY,
    wallTip,
    scyAngle,
    drumY,
    ringR,
    spokeAng,
    boomPos,
    // where each stage starts
    spawn(stage, who) {
      const s = who === 'dame' ? -1 : 1;
      if (stage <= 1) return P(s * 1.8, 0, 7);
      if (stage === 2) return P(s * 1.6, 0, -61);
      if (stage === 3) return P(s * 1.6, 0, -136);
      if (stage === 4) return P(s * 1.8, 0, -184);
      return P(s * 2.4, 0, BOSS_C.z + 4);
    },
    // the pad a hit sends the runner back to: the last one behind them
    padFor(half, q) {
      const pads = PADS[half];
      // the closest pad with z >= q.z (behind, the hall runs toward -z)
      const behind = pads.filter((z) => z >= q.z - 0.01);
      return P(0, 0, behind.length ? Math.min(...behind) : pads[0]);
    },
    // gallery positions
    onGalleryA: (q) => q.y > GY - 0.3 && q.x < -3.25 && q.z < 3.2 && q.z > -56.2,
    onGalleryB: (q) => q.y > GY - 0.3 && q.x > 3.25 && q.z < -62.3 && q.z > -122.2,
    inLane: (q, half) => Math.abs(q.x) < 3.05 && q.y < 2.5 && (half === 1 ? q.z < 0 && q.z > -56 : q.z < -66 && q.z > -122),
    nearLever(q, id) {
      const [x, y, z] = TRAP[id].lever;
      return Math.hypot(q.x - x, q.z - z) < 1.9 && Math.abs(q.y - y) < 1.2;
    },
    inArmory: (q) => Math.hypot(q.x - ARM_C.x, q.z - ARM_C.z) < ARM_R - 1.5,
    inForge: (q) => Math.hypot(q.x - BOSS_C.x, q.z - BOSS_C.z) < BOSS_R - 1.5,
    nearCard: (q) => Math.hypot(q.x - BOSS_C.x, q.z - BOSS_C.z) < 2.8,
    armDoor: (i) => {
      const a = [0.5, 1.2, 1.94, 2.64, 3.64, 4.34, 5.08, 5.78][i % 8];
      return P(ARM_C.x + Math.cos(a) * (ARM_R - 1.6), 0, ARM_C.z + Math.sin(a) * (ARM_R - 1.6));
    },
    // telegraph a fan (sector) on the floor: pos (world), yaw (forward = sin/cos), half angle, radius
    fan(pos, yaw, h, r, t) {
      if (!built) return;
      const m = new THREE.Mesh(fanGeo(r, h), fanMat.clone());
      m.position.set(pos.x, pos.y + 0.06, pos.z);
      // the fan's axis is local +z: rotation.y = yaw turns it to (sin yaw, cos yaw)
      m.rotation.y = yaw;
      group.add(m);
      fans.push({ m, t, max: t });
    },
    boomerang(b) {
      if (!built) return;
      const m = new THREE.Mesh(boomGeo, M.steel);
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 5, 32).rotateX(Math.PI / 2), M.edge);
      m.add(e);
      m.visible = false;
      group.add(m);
      booms.push({ ...b, m });
    },
    get booms() {
      return booms;
    },
    clearFx() {
      fans.forEach((f) => group.remove(f.m));
      fans.length = 0;
      booms.forEach((b) => group.remove(b.m));
      booms.length = 0;
    },
    ringHit(q, T, x) {
      if (x.p3 == null) return false;
      const r = Math.hypot(q.x - BOSS_C.x, q.z - BOSS_C.z);
      return r > ringR(T, x) - 0.75 && q.y < 1.8;
    },
    spokeHit(q, T, x) {
      if (x.p3 == null || T < x.p3 + 2) return false;
      const rr = ringR(T, x);
      const dx = q.x - BOSS_C.x;
      const dz = q.z - BOSS_C.z;
      for (let k = 0; k < 2; k++) {
        const a = spokeAng(T, x, k);
        const ux = Math.cos(a);
        const uz = -Math.sin(a);
        const along = dx * ux + dz * uz;
        const perp = Math.abs(dx * uz - dz * ux);
        if (along > 1.5 && along < rr && perp < 0.22 + BR && q.y < 0.58) return true;
      }
      return false;
    },
    // the runner's side of the stairs: lock(aOn, bOn)
    lock(a, b) {
      if (locks.A) locks.A.on = !!a;
      if (locks.B) locks.B.on = !!b;
    },
    nearStairs: (q, k) => (k === 'A' ? q.x < -2.6 && q.z > 2.2 && q.z < 10 : q.x > 2.7 && q.z < -56.2 && q.z > -63.2) && q.y < 5,
    sleep,
    wake() {
      group.visible = true;
    },
    show(v) {
      group.visible = v;
    },
  };
})();
