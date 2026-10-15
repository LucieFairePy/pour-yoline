// Extra enemy types for La Crypte (♠ 5) and Le Caveau (♣ 7), registered into Enemies.
// Their visual models (except the Oracle's) are in enemy-models.js.
(() => {
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const metal = new THREE.MeshStandardMaterial({
    color: '#1a1424',
    metalness: 0.85,
    roughness: 0.28,
    emissive: '#0a0612',
  });
  const gold = new THREE.MeshStandardMaterial({
    color: '#d6ad5e',
    metalness: 1,
    roughness: 0.22,
    emissive: '#3a2608',
  });

  // ---------- generic chase helper ----------
  const nearest = (e, targets, max = 60) => {
    let best = null;
    let bd = max;
    targets.forEach((p) => {
      const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    });
    return [best, bd];
  };
  const follow = (e, dt) => {
    const gy = Phys.groundAt(e.pos.x, e.pos.y + 1.2, e.pos.z);
    if (gy > -1e3) e.pos.y = damp(e.pos.y, gy, 8, dt);
  };
  const blocked = (p, r, y0) => {
    for (const b of Phys.query(p.x - r, p.z - r, p.x + r, p.z + r)) {
      if (b.tag === 'nocam') continue;
      if (
        p.x + r > b.min[0] &&
        p.x - r < b.max[0] &&
        p.z + r > b.min[2] &&
        p.z - r < b.max[2] &&
        y0 + 0.6 < b.max[1] &&
        y0 + 1.6 > b.min[1]
      )
        return b;
    }
    return null;
  };
  const telLine = (from, to, w, t) => {
    Enemies.telegraphLine(from, to, w, t);
    Net.send('tl', [from.x, from.y, from.z, to.x, to.y, to.z, w, t]);
  };
  Net.on('tl', (d) =>
    Enemies.telegraphLine(V3(d[0], d[1], d[2]), V3(d[3], d[4], d[5]), d[6], d[7]),
  );
  const fx = (k, pos) => {
    Foes.onFx(k, pos);
    Net.send('foefx', [k, pos ? [pos.x, pos.y, pos.z] : null]);
  };
  Net.on('foefx', (d) => Foes.onFx(d[0], d[1] ? V3(...d[1]) : null));

  // charge logic shared by cavalier and gardien
  const charge = (e, dt, players, o) => {
    const sub = Math.max(1, Math.ceil((o.speed * dt) / 0.3));
    const h = (o.speed * dt) / sub;
    for (let i = 0; i < sub; i++) {
      const nx = e.pos.x + e.dir.x * h;
      const nz = e.pos.z + e.dir.z * h;
      const b = blocked(V3(nx, 0, nz), o.r, e.pos.y);
      if (b) return b;
      e.pos.x = nx;
      e.pos.z = nz;
      players.forEach((p) => {
        if (p.down || e.hit.has(p.who)) return;
        if (
          Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < o.r + 0.6 &&
          Math.abs(p.pos.y - e.pos.y) < 2.5
        ) {
          e.hit.add(p.who);
          Combat.hurt(p.who, o.dmg, e.pos);
        }
      });
    }
    follow(e, dt);
    return null;
  };

  // ---------- Cavalier: charges in a straight line ----------
  Enemies.define('cavalier', {
    stats: { hp: 80, speed: 2.2, radius: 0.85, hitR: 0.95, height: 2.2, dieColor: '#b9a6ff' },
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      e.vuln = e.st === 3;
      if (e.st === 1) {
        if (e.t <= 0) {
          e.st = 2;
          e.t = 1.25;
          e.hit = new Set();
        }
        return;
      }
      if (e.st === 2) {
        const b = charge(e, dt, players, { speed: 15, r: 0.8, dmg: 20 });
        if (b || e.t <= 0) {
          e.st = 3;
          e.t = b ? 2.2 : 1.4;
          if (b) fx('thud', e.pos);
        }
        return;
      }
      if (e.st === 3) {
        if (e.t <= 0) {
          e.st = 0;
          e.atk = 1.5 + Math.random() * 1.5;
        }
        return;
      }
      if (e.stun > 0) return;
      const [best, bd] = nearest(e, targets);
      if (!best) return;
      const dx = best.pos.x - e.pos.x;
      const dz = best.pos.z - e.pos.z;
      e.yaw = angleDamp(e.yaw, Math.atan2(dx, dz), 5, dt);
      if (bd > 7) {
        const sp = 2.2 * dt;
        const nx = e.pos.x + (dx / bd) * sp;
        const nz = e.pos.z + (dz / bd) * sp;
        if (!blocked(V3(nx, 0, nz), 0.8, e.pos.y)) {
          e.pos.x = nx;
          e.pos.z = nz;
        }
        follow(e, dt);
      }
      if (bd < 17 && e.atk <= 0) {
        e.st = 1;
        e.t = 0.95;
        e.dir = V3(dx / bd, 0, dz / bd);
        e.yaw = Math.atan2(dx, dz);
        const to = e.pos.clone().addScaledVector(e.dir, Math.min(19, bd + 6));
        telLine(e.pos, to, 1.8, 0.95);
        Sound.play('roar');
      }
    },
    mult: (e) => (e.st === 3 ? 1.6 : 1),
    render(e, m, dt, t) {
      const wind = e.st === 1;
      m.body.rotation.x = damp(m.body.rotation.x, wind ? -0.35 : e.st === 2 ? 0.3 : 0, 10, dt);
      m.body.position.y =
        e.st === 3 ? Math.abs(Math.sin(t * 6)) * 0.05 : Math.sin(t * 2 + e.id) * 0.05;
      m.eyes.forEach((ey) =>
        ey.material.color
          .setRGB(1, 0.2, 0.3)
          .multiplyScalar(e.st === 3 ? 0.5 : wind ? 4 + Math.sin(t * 30) : 2.4),
      );
    },
  });

  // ---------- Spectre: invisible to the Valet until the Dame reveals it ----------
  Enemies.define('spectre', {
    stats: { hp: 45, speed: 3.2, radius: 0.7, height: 1.6, dieColor: '#c8f4ff' },
    hidden: (e) => Story.role === 'valet' && !(e.reveal > 0),
    sim(e, dt, players, targets) {
      e.reveal = Math.max(0, (e.reveal || 0) - dt);
      // a blind sword swing does not freeze it either
      if (!(e.reveal > 0)) e.stunImm = Math.max(e.stunImm || 0, 0.1);
      if (e.stun > 0) return;
      const [best, bd] = nearest(e, targets);
      if (!best) return;
      const dx = best.pos.x - e.pos.x;
      const dz = best.pos.z - e.pos.z;
      e.yaw = Math.atan2(dx, dz);
      if (bd > 1.3) {
        const sp = 3.2 * dt;
        e.pos.x += (dx / bd) * sp;
        e.pos.z += (dz / bd) * sp;
        e.pos.y = damp(e.pos.y, best.pos.y, 3, dt);
      } else if (e.atk <= 0) {
        e.atk = 1.4;
        Combat.hurt(best.who, 10, e.pos);
      }
    },
    // the rifle only lights a spectre up; the sword cuts it, once it is lit
    mult(e, weak, stun) {
      if (stun > 0) return e.reveal > 0 ? 2.2 : 0;
      e.reveal = 4;
      return 0;
    },
    render(e, m, dt, t) {
      const show = Story.role === 'dame' || e.reveal > 0;
      m.g.visible = show;
      m.g.position.y += 0.35 + Math.sin(t * 2.6 + e.id) * 0.15;
      m.shell.material.opacity = e.reveal > 0 ? 0.62 : 0.32 + Math.sin(t * 3 + e.id) * 0.06;
      m.tails.forEach((tl, i) => (tl.rotation.z = Math.sin(t * 4 + i * 2) * 0.3));
    },
  });

  // ---------- Le Cavalier noir: crypt boss ----------
  Enemies.define('gardien', {
    stats: {
      hp: 950,
      speed: 0,
      radius: 2,
      hitR: 2.2,
      height: 4.6,
      boss: true,
      reach: 4.2,
      // the sword's blow is told apart by its (tiny) stun; the engine never stuns him (stunImm)
      stunP: 0.01,
      weakR: 0.8,
    },
    sim(e, dt, players, targets) {
      e.t = (e.t || 0) - dt;
      e.stunImm = 99;
      e.sweep = e.sweep || 0;
      const ph = e.hp > e.max * 0.5 ? 1 : 2;
      if (ph !== e.phase) {
        e.phase = ph;
        if (ph === 2) {
          fx('phase2', e.pos);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU;
            Enemies.spawn('spectre', e.pos.clone().add(V3(Math.cos(a) * 6, 0, Math.sin(a) * 6)));
          }
        }
      }
      e.vuln = e.stun > 0 && !!e.open;
      if (e.stun > 0) {
        e.st = 4;
        return;
      }
      if (e.st === 4) {
        e.st = 0;
        e.atk = 2;
        e.open = false;
      }
      if (e.st === 1) {
        if (e.t <= 0) {
          e.st = 2;
          e.t = 2.2;
          e.hit = new Set();
          fx('charge', e.pos);
        }
        return;
      }
      if (e.st === 2) {
        const b = charge(e, dt, players, { speed: ph === 2 ? 22 : 19, r: 1.7, dmg: 32 });
        if (b && b.tag === 'pillar') {
          e.stun = 5.5;
          e.open = false;
          e.st = 4;
          fx('stun', e.pos);
          return;
        }
        if (b || e.t <= 0) {
          e.st = 3;
          e.t = 1.3;
          if (b) fx('thud', e.pos);
        }
        return;
      }
      if (e.st === 3) {
        if (e.t <= 0) {
          e.st = 0;
          e.atk = ph === 2 ? 2.2 : 3.2;
        }
        return;
      }
      if (e.st === 5) {
        if (e.t <= 0) {
          players.forEach((p) => {
            if (!p.down && Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 6.5)
              Combat.hurt(p.who, 24, e.pos);
          });
          fx('slam', e.pos);
          e.st = 3;
          e.t = 1;
        }
        return;
      }
      const [best, bd] = nearest(e, targets, 80);
      if (!best) return;
      const dx = best.pos.x - e.pos.x;
      const dz = best.pos.z - e.pos.z;
      e.yaw = angleDamp(e.yaw, Math.atan2(dx, dz), 2.5, dt);
      const close = targets.some((p) => Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 5.5);
      e.sweep = close ? e.sweep + dt : Math.max(0, e.sweep - dt);
      if (e.sweep > 1.4) {
        e.sweep = 0;
        e.st = 5;
        e.t = 1.3;
        Enemies.telegraph(e.pos, 6.5, 1.3);
        Net.send('tel', [e.pos.x, e.pos.y, e.pos.z, 6.5, 1.3]);
        return;
      }
      if (bd > 12) {
        const sp = 1.6 * dt;
        const nx = e.pos.x + (dx / bd) * sp;
        const nz = e.pos.z + (dz / bd) * sp;
        if (!blocked(V3(nx, 0, nz), 1.7, e.pos.y)) {
          e.pos.x = nx;
          e.pos.z = nz;
        }
      }
      if (e.atk <= 0 && bd > 4) {
        e.st = 1;
        e.t = 1.25;
        e.dir = V3(dx / bd, 0, dz / bd);
        e.yaw = Math.atan2(dx, dz);
        telLine(e.pos, e.pos.clone().addScaledVector(e.dir, 40), 3.4, 1.25);
        fx('wind', e.pos);
      }
    },
    // stunned against a pillar, a sword blow knocks his breastplate up; then only the rifle
    // hurts him (the heart at 2.2x)
    mult(e, weak, stun) {
      if (stun) {
        if (e.stun > 0 && !e.open) {
          e.open = true;
          e.vuln = true;
          fx('open', e.pos);
        }
        return 0;
      }
      return e.stun > 0 && e.open ? (weak ? 2.2 : 1) : 0;
    },
    render(e, m, dt, t) {
      const stun = e.stun > 0 || e.st === 4;
      m.body.rotation.x = damp(
        m.body.rotation.x,
        e.st === 1 ? -0.3 : e.st === 2 ? 0.25 : stun ? 0.5 : 0,
        6,
        dt,
      );
      m.plate.position.y = damp(m.plate.position.y, e.vuln ? 3.8 : stun ? 2.95 : 2.7, 6, dt);
      m.heart.material.color
        .setRGB(1, 0.37, 0.54)
        .multiplyScalar(e.vuln ? 3 + Math.sin(t * 10) : stun ? 0.9 : 0.5);
      m.heart.rotation.y = t * 2;
      m.lance.rotation.x = damp(m.lance.rotation.x, e.st === 1 || e.st === 2 ? 0 : -0.5, 5, dt);
      m.crest.rotation.z = t;
      if (stun) m.crest.position.y = 4.6 + Math.sin(t * 6) * 0.2;
      m.eyes.forEach((ey) =>
        ey.material.color.setRGB(1, 0.16, 0.23).multiplyScalar(stun ? 0.3 : 2.6),
      );
    },
  });

  // ---------- L'Oracle: raid boss, a Veilleur eye in rotating rings ----------
  const irisTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#efe8f4';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(200,60,90,${0.08 + Math.random() * 0.12})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      const a = Math.random() * TAU;
      g.moveTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250);
      g.quadraticCurveTo(
        256 + Math.cos(a + 0.3) * 180,
        256 + Math.sin(a + 0.3) * 180,
        256 + Math.cos(a) * 120,
        256 + Math.sin(a) * 120,
      );
      g.stroke();
    }
    const gr = g.createRadialGradient(256, 256, 20, 256, 256, 120);
    gr.addColorStop(0, '#05030a');
    gr.addColorStop(0.32, '#05030a');
    gr.addColorStop(0.36, '#3cf0c0');
    gr.addColorStop(0.7, '#1a7a8a');
    gr.addColorStop(0.97, '#0a2a3a');
    gr.addColorStop(1, 'rgba(10,30,40,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(256, 256, 120, 0, TAU);
    g.fill();
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * TAU;
      g.strokeStyle = `rgba(160,255,230,${0.15 + Math.random() * 0.25})`;
      g.beginPath();
      g.moveTo(256 + Math.cos(a) * 45, 256 + Math.sin(a) * 45);
      g.lineTo(
        256 + Math.cos(a) * (95 + Math.random() * 20),
        256 + Math.sin(a) * (95 + Math.random() * 20),
      );
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  Enemies.define('oracle', {
    stats: {
      hp: 1600,
      speed: 0,
      radius: 3,
      hitR: 3.2,
      height: 0,
      boss: true,
      reach: 6,
      stunP: 0,
      weakR: 1.1,
    },
    model: () => {
      const g = new THREE.Group();
      const body = new THREE.Group();
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 48, 32),
        new THREE.MeshStandardMaterial({
          map: irisTex,
          roughness: 0.15,
          metalness: 0.1,
          emissive: '#2a2230',
          emissiveMap: irisTex,
          emissiveIntensity: 0.6,
        }),
      );
      eye.rotation.y = -Math.PI / 2;
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(2.32, 48, 32, 0, TAU, 0, Math.PI * 0.42),
        gold,
      );
      lid.rotation.x = -0.15;
      const lid2 = new THREE.Mesh(
        new THREE.SphereGeometry(2.32, 48, 32, 0, TAU, Math.PI * 0.6, Math.PI * 0.4),
        gold,
      );
      const heart = new THREE.Object3D();
      heart.position.set(0, 0, 2.15);
      const rings = [3.4, 4.2, 5.1].map((r, i) => {
        const ring = new THREE.Group();
        const tor = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.09, 10, 96),
          i === 1 ? glow('#3cf0c0', 1.6) : gold,
        );
        ring.add(tor);
        for (let k = 0; k < 4 + i * 2; k++) {
          const a = (k / (4 + i * 2)) * TAU;
          const rune = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.2 + i * 0.04),
            glow(i === 1 ? '#ffcf8a' : '#3cf0c0', 2),
          );
          rune.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
          ring.add(rune);
        }
        body.add(ring);
        return ring;
      });
      const shards = [];
      for (let k = 0; k < 8; k++) {
        const sh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 5), metal);
        body.add(sh);
        shards.push(sh);
      }
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(6, 40, 24),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#3cf0c0').multiplyScalar(0.8),
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      body.add(eye, lid, lid2, heart, dome);
      g.add(body);
      return { g, body, eye: null, lid, lid2, heart, rings, shards, dome, bodyScale: 1, eyeM: eye };
    },
    sim(e, dt, players, targets) {
      e.vuln = e.st === 1;
      const hy = e.home.y + (e.st === 1 ? 3.6 : 9);
      e.pos.y = damp(e.pos.y, hy, 1.6, dt);
      const tgt = targets.find((p) => p.who === 'dame') || targets[0];
      if (tgt)
        e.yaw = angleDamp(e.yaw, Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z), 1.5, dt);
      if (e.st !== 1 && targets.length) {
        if (e.atk <= 0) {
          e.atk = 3.2;
          const p = targets[(Math.random() * targets.length) | 0];
          const from = e.pos.clone().add(V3(0, 0, 0));
          [-0.18, 0, 0.18].forEach((a) =>
            Enemies.fire(from, p.pos.clone().add(V3(a * 10, 1.1, 0)), 11, 10),
          );
        }
      }
    },
    mult: (e, weak) => (e.st === 1 ? (weak ? 2 : 1) : 0),
    render(e, m, dt, t) {
      const open = e.st === 1 ? 1 : 0;
      m.lid.rotation.x = damp(m.lid.rotation.x, open ? -0.75 : -0.15, 4, dt);
      m.lid2.rotation.x = damp(m.lid2.rotation.x, open ? 0.55 : 0, 4, dt);
      m.rings.forEach((r, i) => {
        r.rotation.x = t * (0.3 + i * 0.17) * (i % 2 ? -1 : 1);
        r.rotation.y = t * (0.21 + i * 0.11);
      });
      m.shards.forEach((s, k) => {
        const a = (k / 8) * TAU + t * 0.6;
        const rr = open ? 9 : 6.4;
        s.position.set(Math.cos(a) * rr, Math.sin(t * 1.3 + k) * 0.6, Math.sin(a) * rr);
        s.rotation.set(Math.PI, 0, 0);
      });
      m.dome.visible = !open;
      m.dome.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
      m.eyeM.material.emissiveIntensity = open ? 1.4 + Math.sin(t * 8) * 0.4 : 0.5;
    },
  });
})();

const Foes = {
  onFx() {},
};
