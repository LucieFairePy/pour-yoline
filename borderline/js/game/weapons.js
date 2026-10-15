// Held weapons. Whoever carries the Dame kit in a chapter gets the rifle, the Valet kit
// gets the sword, so both players use both weapons over the game.
const Weapons = (() => {
  const metal = new THREE.MeshStandardMaterial({
    color: '#3a3942',
    roughness: 0.4,
    metalness: 0.45,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: '#7a3f1d',
    roughness: 0.6,
    metalness: 0.05,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: '#e9eef8',
    roughness: 0.22,
    metalness: 0.35,
    emissive: '#5a7a9a',
    emissiveIntensity: 0.35,
  });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: '#2a1a1e', roughness: 0.8 });
  const neon = (c) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(c).multiplyScalar(2.2),
      toneMapped: false,
    });

  // muzzle flash: a four-point star seen from the side, a cone, a flash of light; smoke puffs drift
  // up from the muzzle afterwards
  const starTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,250,235,1)');
    gr.addColorStop(0.18, 'rgba(255,214,140,0.95)');
    gr.addColorStop(0.5, 'rgba(255,150,60,0.35)');
    gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 16 : 64;
      g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const smokeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(210,205,215,0.55)');
    gr.addColorStop(1, 'rgba(210,205,215,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const puffs = [];
  let puffClock = 0;
  const puff = (pos) => {
    let p = puffs.find((x) => x.t <= 0);
    if (!p) {
      if (puffs.length >= 18) p = puffs[0];
      else {
        const m = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }),
        );
        R.scene.add(m);
        p = { m, t: 0 };
        puffs.push(p);
      }
    }
    p.m.position.copy(pos);
    p.t = p.life = 0.55 + Math.random() * 0.2;
    p.m.visible = true;
  };
  const tickPuffs = (dt) => {
    const now = performance.now();
    if (now - puffClock < 5) return;
    puffClock = now;
    for (const p of puffs) {
      if (p.t <= 0) continue;
      p.t -= dt;
      const k = 1 - p.t / p.life;
      p.m.position.y += dt * 0.6;
      p.m.scale.setScalar(0.15 + k * 0.55);
      p.m.material.opacity = Math.max(0, (1 - k) * 0.28);
      if (p.t <= 0) p.m.visible = false;
    }
  };

  const box = (g, mat, sx, sy, sz, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  const cyl = (g, mat, r0, r1, len, x, y, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 12).rotateX(Math.PI / 2), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // AKM, to scale (metres), the top of the pistol grip at the origin, barrel along +z, up +y.
  // Laminated reddish wood and blued steel, painted on 2048 px canvases; the magazine is its own
  // group so the reload can take it out.
  const akTex = (() => {
    const W = 2048;
    const wood = document.createElement('canvas');
    wood.width = W;
    wood.height = 512;
    const g = wood.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7a2f16');
    grad.addColorStop(0.5, '#93401f');
    grad.addColorStop(1, '#6d2a14');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, 512);
    // grain: long wavy lines, darker and lighter, plus a few knots
    for (let i = 0; i < 260; i++) {
      const y0 = Math.random() * 512;
      const amp = 2 + Math.random() * 7;
      const f = 0.002 + Math.random() * 0.006;
      const ph = Math.random() * 6.3;
      g.strokeStyle =
        Math.random() < 0.6
          ? 'rgba(45,14,6,' + (0.08 + Math.random() * 0.2) + ')'
          : 'rgba(190,110,60,' + (0.05 + Math.random() * 0.12) + ')';
      g.lineWidth = 0.6 + Math.random() * 2.2;
      g.beginPath();
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * W;
      const y = Math.random() * 512;
      const r = 6 + Math.random() * 12;
      const kg = g.createRadialGradient(x, y, 0, x, y, r * 2);
      kg.addColorStop(0, 'rgba(40,12,4,0.55)');
      kg.addColorStop(1, 'rgba(40,12,4,0)');
      g.fillStyle = kg;
      g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    }
    const steel = document.createElement('canvas');
    steel.width = steel.height = 1024;
    const h = steel.getContext('2d');
    const img = h.createImageData(1024, 1024);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 138 + (Math.random() - 0.5) * 40;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    h.putImageData(img, 0, 0);
    // wear: lighter scuffs where hands go
    for (let i = 0; i < 90; i++) {
      h.strokeStyle = 'rgba(230,230,230,' + (0.05 + Math.random() * 0.1) + ')';
      h.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      h.beginPath();
      h.moveTo(x, y);
      h.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 12);
      h.stroke();
    }
    const tw = new THREE.CanvasTexture(wood);
    tw.wrapS = tw.wrapT = THREE.RepeatWrapping;
    tw.repeat.set(4, 4);
    tw.anisotropy = 8;
    const ts = new THREE.CanvasTexture(steel);
    ts.wrapS = ts.wrapT = THREE.RepeatWrapping;
    ts.repeat.set(6, 6);
    return { wood: tw, steel: ts };
  })();
  const akWood = new THREE.MeshStandardMaterial({
    map: akTex.wood,
    bumpMap: akTex.wood,
    bumpScale: 0.0015,
    roughness: 0.5,
    metalness: 0.02,
  });
  const akSteel = new THREE.MeshStandardMaterial({
    color: '#2a2c33',
    metalness: 0.85,
    roughness: 0.42,
    roughnessMap: akTex.steel,
    bumpMap: akTex.steel,
    bumpScale: 0.0006,
  });
  const akDark = new THREE.MeshStandardMaterial({ color: '#16171b', metalness: 0.6, roughness: 0.55 });

  // a flat 2D profile in the (z, y) plane, extruded across x and centred on it
  const profile = (pts, depth, mat, bevel = 0.003) => {
    const sh = new THREE.Shape();
    pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: depth - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 12,
    });
    // shape x → z, shape y → y, extrusion → x
    geo.rotateY(-Math.PI / 2);
    geo.translate((depth - bevel * 2) / 2, 0, 0);
    return new THREE.Mesh(geo, mat);
  };
  const cylZ = (g, mat, r0, r1, z0, z1, x, y, seg = 16) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, z1 - z0, seg).rotateX(Math.PI / 2),
      mat,
    );
    m.position.set(x, y, (z0 + z1) / 2);
    g.add(m);
    return m;
  };
  const halfTube = (r, len, mat) =>
    new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2),
      mat,
    );

  const rifle = () => {
    const g = new THREE.Group();
    // receiver and its top cover, ribbed
    g.add(
      profile(
        [
          [-0.075, 0.032],
          [0.176, 0.032],
          [0.176, -0.026],
          [0.07, -0.026],
          [0.06, -0.032],
          [-0.02, -0.032],
          [-0.075, -0.022],
        ],
        0.036,
        akSteel,
      ),
    );
    const cover = halfTube(0.0175, 0.24, akSteel);
    cover.position.set(0, 0.032, 0.05);
    g.add(cover);
    [0.0, 0.03, 0.06].forEach((z) => box(g, akDark, 0.037, 0.004, 0.006, 0, 0.049, z - 0.02));
    // rear sight block and leaf
    g.add(
      profile(
        [
          [0.176, 0.05],
          [0.215, 0.04],
          [0.215, -0.012],
          [0.176, -0.026],
        ],
        0.034,
        akSteel,
      ),
    );
    box(g, akDark, 0.026, 0.004, 0.07, 0, 0.056, 0.2, -0.08);
    // barrel, gas tube, gas block, front sight, slant muzzle brake, cleaning rod
    cylZ(g, akSteel, 0.0115, 0.0105, 0.215, 0.63, 0, 0.012);
    cylZ(g, akSteel, 0.011, 0.011, 0.215, 0.44, 0, 0.042);
    box(g, akSteel, 0.03, 0.05, 0.035, 0, 0.026, 0.455);
    box(g, akSteel, 0.024, 0.034, 0.02, 0, 0.006, 0.61);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16, Math.PI), akSteel);
    hood.position.set(0, 0.03, 0.61);
    g.add(hood);
    box(g, akDark, 0.003, 0.022, 0.003, 0, 0.034, 0.61);
    cylZ(g, akSteel, 0.0135, 0.0135, 0.63, 0.668, 0, 0.012, 14);
    box(g, akDark, 0.03, 0.012, 0.03, 0.004, 0.024, 0.66, 0.6);
    cylZ(g, akDark, 0.0035, 0.0035, 0.3, 0.62, 0, -0.012, 8);
    // handguards: upper around the gas tube, lower with finger grooves, steel retaining bands
    const upper = halfTube(0.019, 0.18, akWood);
    upper.position.set(0, 0.042, 0.335);
    g.add(upper);
    g.add(
      profile(
        [
          [0.222, 0.03],
          [0.432, 0.03],
          [0.432, -0.02],
          [0.4, -0.03],
          [0.25, -0.03],
          [0.222, -0.022],
        ],
        0.044,
        akWood,
        0.006,
      ),
    );
    [0.29, 0.315, 0.34, 0.365].forEach((z) => box(g, akDark, 0.046, 0.003, 0.004, 0, -0.012, z));
    box(g, akSteel, 0.048, 0.07, 0.008, 0, 0.012, 0.218);
    box(g, akSteel, 0.048, 0.07, 0.008, 0, 0.012, 0.436);
    // pistol grip (raked back), trigger guard, trigger, selector lever, charging handle
    g.add(
      profile(
        [
          [-0.028, -0.026],
          [0.012, -0.026],
          [-0.012, -0.13],
          [-0.058, -0.124],
        ],
        0.03,
        akWood,
        0.006,
      ),
    );
    box(g, akSteel, 0.012, 0.004, 0.075, 0, -0.058, 0.04);
    box(g, akSteel, 0.012, 0.03, 0.004, 0, -0.044, 0.077);
    box(g, akDark, 0.005, 0.022, 0.006, 0, -0.038, 0.035, 0.3);
    box(g, akSteel, 0.003, 0.012, 0.11, -0.0195, 0.012, 0.06, 0.08);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.022, 8), akSteel);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.03, 0.026, 0.13);
    g.add(handle);
    // stock: laminated wood dropping toward a steel butt plate, a sling swivel
    g.add(
      profile(
        [
          [-0.075, 0.03],
          [-0.43, 0.005],
          [-0.43, -0.122],
          [-0.33, -0.1],
          [-0.12, -0.05],
          [-0.075, -0.022],
        ],
        0.036,
        akWood,
        0.007,
      ),
    );
    box(g, akSteel, 0.038, 0.13, 0.006, 0, -0.058, -0.432);
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0018, 6, 12), akSteel);
    sw.position.set(0, -0.1, -0.33);
    sw.rotation.y = Math.PI / 2;
    g.add(sw);
    // the 30-round magazine, curved forward, with its floor plate and stamped ribs
    const mag = new THREE.Group();
    mag.add(
      profile(
        [
          [0.075, -0.02],
          [0.142, -0.02],
          [0.17, -0.11],
          [0.205, -0.205],
          [0.13, -0.23],
          [0.105, -0.13],
          [0.08, -0.06],
        ],
        0.028,
        akSteel,
        0.003,
      ),
    );
    box(mag, akDark, 0.032, 0.008, 0.08, 0, -0.218, 0.168, -0.33);
    [-0.07, -0.12, -0.17].forEach((y, i) =>
      box(mag, akDark, 0.03, 0.004, 0.05, 0, y, 0.115 + i * 0.025, -0.25 - i * 0.04),
    );
    mag.userData.home = mag.position.clone();
    g.add(mag);
    g.userData.mag = mag;

    // muzzle flash of a 7.62 round: a white-hot core, a forward plume, side petals from the brake
    const flash = new THREE.Group();
    const flashMat = (c, k) =>
      new THREE.MeshBasicMaterial({
        map: starTex,
        color: new THREE.Color(c).multiplyScalar(k),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
    const core = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMat('#fff1d0', 1.2));
    flash.add(core);
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.3, 10, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.15),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff9c3a').multiplyScalar(1.1),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    flash.add(plume);
    [0, Math.PI / 2].forEach((r) => {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), flashMat('#ffb050', 1));
      st.rotation.set(0, Math.PI / 2, r);
      st.position.z = 0.06;
      flash.add(st);
    });
    const petals = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flashMat('#ffc070', 0.9));
    petals.position.z = 0.01;
    flash.add(petals);
    flash.position.set(0, 0.012, 0.672);
    flash.visible = false;
    flash.userData = { core, plume, petals };
    const light = new THREE.PointLight('#ffa552', 0, 8, 2);
    light.position.set(0, 0.012, 0.7);
    g.add(light, flash);
    g.userData.flash = flash;
    g.userData.light = light;
    return g;
  };

  // longsword, grip at the origin, blade along +y
  const sword = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.2, 12), leather));
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), gold);
    pommel.position.y = -0.11;
    g.add(pommel);
    box(g, gold, 0.24, 0.026, 0.04, 0, 0.11, 0);
    const blade = new THREE.Shape();
    blade.moveTo(-0.04, 0);
    blade.lineTo(0.04, 0);
    blade.lineTo(0.032, 0.78);
    blade.lineTo(0, 0.9);
    blade.lineTo(-0.032, 0.78);
    blade.closePath();
    const bg = new THREE.ExtrudeGeometry(blade, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.006,
      bevelSegments: 1,
    }).translate(0, 0.12, -0.004);
    g.add(new THREE.Mesh(bg, steel));
    box(g, neon('#6cc8ff'), 0.012, 0.72, 0.02, 0, 0.5, 0);
    return g;
  };

  // a dropped magazine falls, bounces once and fades
  const drops = [];
  const dropMag = (mag) => {
    const m = mag.clone();
    mag.updateMatrixWorld(true);
    mag.matrixWorld.decompose(m.position, m.quaternion, m.scale);
    R.scene.add(m);
    drops.push({ m, v: V3((Math.random() - 0.5) * 0.6, -0.5, (Math.random() - 0.5) * 0.6), t: 1.6 });
  };
  const tickDrops = (dt) => {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t -= dt;
      d.v.y -= 9.8 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.m.rotation.x += dt * 2;
      if (d.t <= 0) {
        R.scene.remove(d.m);
        drops.splice(i, 1);
      }
    }
  };

  const attach = (avatar) => {
    const models = { rifle: rifle(), sword: sword() };
    const holder = new THREE.Group();
    Object.values(models).forEach((m) => {
      m.visible = false;
      holder.add(m);
    });
    avatar.spin.add(holder);
    // the detailed astronauts hold the rifle in both hands, on a mount the avatar poses itself
    const mount = avatar.gunMount || null;
    if (mount) mount.add(models.rifle);
    const hv = V3();
    const lh = V3();
    let kind = null;
    let flashT = 0;
    let aimK = 0;
    let pitchK = 0;
    let lastReload = 0;
    const FLASH = 0.045;
    const flashTick = (dt) => {
      flashT -= dt;
      const f = models.rifle.userData.flash;
      f.visible = flashT > 0;
      models.rifle.userData.light.intensity = flashT > 0 ? (flashT / FLASH) * 2.4 : 0;
    };
    // during a reload the magazine leaves the well with the left hand, is dropped, and a full one
    // comes back from the belt (progress points match the hand keyframes in js/world/avatar.js)
    const magTick = (reload) => {
      const mag = models.rifle.userData.mag;
      const out = reload > 0.12 && reload < 0.68;
      if (lastReload <= 0.3 && reload > 0.3) dropMag(mag);
      lastReload = reload;
      if (!out || !avatar.rig) {
        mag.position.copy(mag.userData.home);
        mag.visible = true;
        return;
      }
      // empty-handed between the drop and the belt
      mag.visible = !(reload > 0.3 && reload < 0.4);
      avatar.root.updateMatrixWorld(true);
      avatar.rig.handWorld(0, lh);
      models.rifle.worldToLocal(lh);
      // the hand holds the magazine by its middle (rifle space 0, -0.13, 0.1)
      mag.position.set(lh.x, lh.y + 0.13, lh.z - 0.1);
    };
    return {
      fire() {
        flashT = FLASH;
        if (kind !== 'rifle') return;
        const f = models.rifle.userData.flash;
        const u = f.userData;
        f.rotation.z = Math.random() * Math.PI;
        u.plume.scale.set(1, 1, 0.7 + Math.random() * 0.7);
        u.core.scale.setScalar(0.8 + Math.random() * 0.5);
        u.petals.scale.setScalar(0.7 + Math.random() * 0.6);
        avatar.root.updateMatrixWorld(true);
        const m = f.getWorldPosition(V3());
        if (Math.random() < 0.5) puff(m);
        if (typeof Fx !== 'undefined') Fx.burst(m, '#ffb050', 4, 2.6, 0.08, 0);
        if (avatar.kick) avatar.kick();
      },
      // world position of the rifle muzzle
      muzzle(out) {
        if (kind !== 'rifle') return avatar.hand(out);
        avatar.root.updateMatrixWorld(true);
        return models.rifle.userData.flash.getWorldPosition(out);
      },
      update(dt, k, swing, aim, pitch = 0, reload = 0) {
        if (k !== kind) {
          kind = k;
          models.rifle.visible = k === 'rifle';
          models.sword.visible = k === 'sword';
        }
        holder.visible = !!k && avatar.root.visible;
        tickDrops(dt);
        if (!k) return;
        tickPuffs(dt);
        if (k === 'rifle' && mount) {
          flashTick(dt);
          magTick(reload);
          return;
        }
        avatar.root.updateMatrixWorld(true);
        avatar.hand(hv);
        avatar.spin.worldToLocal(hv);
        holder.position.copy(hv);
        if (k === 'rifle') {
          aimK = damp(aimK, aim ? 1 : 0, 16, dt);
          pitchK = damp(pitchK, pitch, 14, dt);
          holder.rotation.set(lerp(0.5, pitchK, aimK), lerp(0.5, 0.05, aimK), lerp(-0.3, 0, aimK));
          flashTick(dt);
        } else {
          // rest: blade raised forward; swing: arc down and across
          const s = clamp(swing / 0.25, 0, 1);
          const e = Math.sin(s * Math.PI);
          holder.rotation.set(lerp(0.55, 1.9, e), lerp(0.2, -0.9, e), lerp(-0.25, 0.4, e));
        }
      },
    };
  };

  return { attach };
})();
