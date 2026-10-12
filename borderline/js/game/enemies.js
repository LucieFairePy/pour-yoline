const Enemies = (() => {
  const TYPES = {
    pion: { hp: 40, speed: 3.8, radius: 0.7, height: 1.1 },
    tour: { hp: 90, speed: 0, radius: 0.9, height: 2.6 },
    roi: { hp: 900, speed: 0, radius: 2.4, height: 5.5 },
  };
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const metal = new THREE.MeshStandardMaterial({
    color: '#1c1624',
    metalness: 0.8,
    roughness: 0.3,
    emissive: '#0a0610',
  });
  const gold = new THREE.MeshStandardMaterial({
    color: '#c9a25a',
    metalness: 0.9,
    roughness: 0.25,
    emissive: '#3a2a0a',
  });
  const red = glow('#ff2a3a', 2.4);

  const spadeShape = (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1);
    s.bezierCurveTo(0.2, 0.6, 0.9, 0.3, 0.6, -0.2);
    s.bezierCurveTo(0.35, -0.55, 0.05, -0.3, 0.06, -0.15);
    s.lineTo(0.2, -0.7);
    s.lineTo(-0.2, -0.7);
    s.lineTo(-0.06, -0.15);
    s.bezierCurveTo(-0.05, -0.3, -0.35, -0.55, -0.6, -0.2);
    s.bezierCurveTo(-0.9, 0.3, -0.2, 0.6, 0, 1);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 2,
    }).center();
  })();

  const modelPion = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(spadeShape, metal);
    body.scale.setScalar(0.75);
    g.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), red);
    eye.position.set(0, 0.15, 0.12);
    g.add(eye);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.03, 6, 24).rotateX(Math.PI / 2),
      glow('#ff4f6a', 1.2),
    );
    ring.position.y = -0.4;
    g.add(ring);
    return { g, eye, body };
  };

  const modelTour = () => {
    const g = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 2.2, 6), metal);
    col.position.y = 1.1;
    const head = new THREE.Mesh(spadeShape, metal);
    head.scale.setScalar(0.9);
    head.position.y = 2.6;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), red);
    eye.position.set(0, 2.7, 0.18);
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 24, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#6cc8ff').multiplyScalar(1.2),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    shield.position.y = 1.6;
    g.add(col, head, eye, shield);
    return { g, eye, shield, body: head };
  };

  const modelRoi = () => {
    const g = new THREE.Group();
    const s = 1;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * s, 1.6 * s, 2.6 * s, 8), metal);
    torso.position.y = 3.2;
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 8, 1, true), metal);
    skirt.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), metal);
    head.position.y = 5.0;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), red);
    visor.position.set(0, 5.05, 0.65);
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.35, 16, 1, true), gold);
    crown.add(band);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 6), gold);
      const a = (i / 6) * TAU;
      sp.position.set(Math.cos(a) * 0.75, 0.4, Math.sin(a) * 0.75);
      crown.add(sp);
    }
    const big = new THREE.Mesh(spadeShape, gold);
    big.scale.setScalar(0.45);
    big.position.set(0, 0.55, 0.78);
    crown.add(big);
    crown.position.y = 5.75;
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), glow('#ff5f8a', 2.5));
    heart.position.set(0, 3.5, 1.2);
    const arms = [-1, 1].map((sd) => {
      const a = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 2.6, 8).translate(0, -1.3, 0),
        metal,
      );
      a.position.set(sd * 1.5, 4.2, 0);
      a.rotation.z = sd * 0.25;
      return a;
    });
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 4.5, 0.08).translate(0, -2.2, 0),
      glow('#c9c2ff', 1.4),
    );
    sword.position.set(0, -2.6, 0.2);
    arms[1].add(sword);
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 4.5, 6, 6),
      new THREE.MeshStandardMaterial({
        color: '#5a0a1e',
        side: THREE.DoubleSide,
        roughness: 0.8,
        emissive: '#1a0208',
      }),
    );
    cape.position.set(0, 2.6, -1.2);
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 32, 20),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff4f86').multiplyScalar(1.2),
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    shield.position.y = 3;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), glow('#ffcf8a', 2.4));
    crystal.position.y = 8;
    g.add(torso, skirt, head, visor, crown, heart, ...arms, cape, shield, crystal);
    return { g, eye: visor, shield, heart, crystal, arms, body: torso, cape };
  };

  const MODELS = { pion: modelPion, tour: modelTour, roi: modelRoi };

  const list = new Map();
  const orbs = [];
  const orbMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    glow('#ff3a5a', 3),
    64,
  );
  orbMesh.frustumCulled = false;
  orbMesh.count = 0;
  R.scene.add(orbMesh);
  const telegraphs = [];
  const telMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff2a3a').multiplyScalar(1.5),
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  let nextId = 1;
  let netT = 0;

  const view = (e) => {
    if (e.view) return e.view;
    const m = MODELS[e.type]();
    R.scene.add(m.g);
    e.view = m;
    return m;
  };

  const kill = (e) => {
    if (e.view) {
      R.scene.remove(e.view.g);
      Fx.burst(
        e.pos.clone().add(V3(0, 1, 0)),
        e.type === 'roi' ? '#ffcf8a' : '#ff3a5a',
        e.type === 'roi' ? 500 : 120,
        8,
        1.4,
        -6,
      );
      Sound.play('enemyDie');
    }
    list.delete(e.id);
  };

  const api = {
    TYPES,
    list,
    orbs,
    spawn(type, pos, extra = {}) {
      const id = nextId++;
      const t = TYPES[type];
      const e = {
        id,
        type,
        pos: pos.clone(),
        yaw: 0,
        hp: t.hp,
        max: t.hp,
        stun: 0,
        shield: type !== 'pion',
        atk: 1 + Math.random(),
        home: pos.clone(),
        ...extra,
      };
      list.set(id, e);
      return e;
    },
    clear() {
      [...list.values()].forEach((e) => {
        if (e.view) R.scene.remove(e.view.g);
      });
      list.clear();
      orbs.length = 0;
      telegraphs.forEach((t) => R.scene.remove(t.m));
      telegraphs.length = 0;
    },
    alive(type) {
      return [...list.values()].filter((e) => !type || e.type === type).length;
    },
    boss() {
      return [...list.values()].find((e) => e.type === 'roi') || null;
    },
    damage(id, dmg, stun, weak) {
      const e = list.get(id);
      if (!e) return;
      if (stun) e.stun = Math.max(e.stun, stun);
      let k = 1;
      if (e.type === 'tour' && e.shield && e.stun <= 0) k = 0;
      if (e.type === 'roi') k = Boss.mult(e, weak);
      if (k <= 0) {
        Sound.play('deflect');
        return;
      }
      e.hp -= dmg * k;
      e.hitT = 0.15;
      if (e.hp <= 0) kill(e);
    },
    telegraph(pos, r, t) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.15, r, 40).rotateX(-Math.PI / 2),
        telMat,
      );
      m.position.copy(pos);
      m.position.y += 0.05;
      R.scene.add(m);
      telegraphs.push({ m, t, max: t });
    },
    simulate(dt, players) {
      const targets = players.filter((p) => !p.down && !p.cloak);
      for (const e of list.values()) {
        e.stun = Math.max(0, e.stun - dt);
        e.atk -= dt;
        if (e.type === 'roi') {
          Boss.simulate(e, dt, players, targets);
          continue;
        }
        if (e.stun > 0) continue;
        let best = null;
        let bd = 40;
        targets.forEach((p) => {
          const d = p.pos.distanceTo(e.pos);
          if (d < bd) {
            bd = d;
            best = p;
          }
        });
        if (e.type === 'tour') e.shield = true;
        if (!best) continue;
        const dx = best.pos.x - e.pos.x;
        const dz = best.pos.z - e.pos.z;
        e.yaw = Math.atan2(dx, dz);
        if (e.type === 'pion') {
          if (bd > 1.4) {
            const sp = TYPES.pion.speed * dt;
            e.pos.x += (dx / bd) * sp;
            e.pos.z += (dz / bd) * sp;
            const gy = Phys.groundAt(e.pos.x, e.pos.y + 1, e.pos.z);
            if (gy > -1e3) e.pos.y = damp(e.pos.y, gy, 6, dt);
          } else if (e.atk <= 0) {
            e.atk = 1.3;
            Combat.hurt(best.who, 8, e.pos);
          }
        }
        if (e.type === 'tour' && e.atk <= 0) {
          e.atk = 2.8;
          api.fire(e.pos.clone().add(V3(0, 2.7, 0)), best.pos.clone().add(V3(0, 1.1, 0)), 12, 9);
        }
      }
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.life -= dt;
        o.p.addScaledVector(o.v, dt);
        let hit = false;
        players.forEach((p) => {
          if (!hit && !p.down && o.p.distanceTo(V3(p.pos.x, p.pos.y + 1.1, p.pos.z)) < 0.85) {
            hit = true;
            Combat.hurt(p.who, o.dmg, o.p);
          }
        });
        if (hit || o.life <= 0) orbs.splice(i, 1);
      }
    },
    fire(from, to, speed, dmg = 14) {
      const v = to.clone().sub(from).normalize().multiplyScalar(speed);
      orbs.push({ p: from.clone(), v, life: 4, dmg });
      Sound.play('orb', from);
    },
    pack() {
      return {
        e: [...list.values()].map((e) => [
          e.id,
          e.type,
          +e.pos.x.toFixed(2),
          +e.pos.y.toFixed(2),
          +e.pos.z.toFixed(2),
          +e.yaw.toFixed(2),
          Math.ceil(e.hp),
          e.max,
          e.stun > 0 ? 1 : 0,
          e.shield ? 1 : 0,
          e.phase || 0,
          e.crystal ? 1 : 0,
          e.recover ? 1 : 0,
        ]),
        o: orbs.map((o) => [+o.p.x.toFixed(2), +o.p.y.toFixed(2), +o.p.z.toFixed(2)]),
      };
    },
    unpack(d) {
      const seen = new Set();
      d.e.forEach(([id, type, x, y, z, yaw, hp, max, stun, shield, phase, crystal, recover]) => {
        seen.add(id);
        let e = list.get(id);
        if (!e) {
          e = { id, type, pos: V3(x, y, z), yaw, hp, max, stun: 0, shield: !!shield };
          list.set(id, e);
        }
        e.target = V3(x, y, z);
        e.yawT = yaw;
        if (hp < e.hp) e.hitT = 0.15;
        e.hp = hp;
        e.max = max;
        e.stun = stun ? 1 : 0;
        e.shield = !!shield;
        e.phase = phase;
        e.crystal = !!crystal;
        e.recover = !!recover;
      });
      [...list.values()].forEach((e) => !seen.has(e.id) && kill(e));
      orbs.length = 0;
      d.o.forEach(([x, y, z]) => orbs.push({ p: V3(x, y, z) }));
    },
    netTick(dt) {
      netT += dt;
      if (netT > 1 / 12) {
        netT = 0;
        Net.send('en', api.pack());
      }
    },
    render(dt, t) {
      for (const e of list.values()) {
        const m = view(e);
        if (e.target) e.pos.lerp(e.target, 1 - Math.exp(-12 * dt));
        if (e.yawT != null) e.yaw = angleDamp(e.yaw, e.yawT, 10, dt);
        m.g.position.copy(e.pos);
        if (e.type === 'pion') m.g.position.y += 1 + Math.sin(t * 3 + e.id) * 0.12;
        m.g.rotation.y = e.yaw;
        if (m.shield) m.shield.visible = e.shield && !(e.stun > 0);
        if (m.eye)
          m.eye.material.color.setRGB(1, 0.16, 0.23).multiplyScalar(e.stun > 0 ? 0.4 : 2.4);
        e.hitT = Math.max(0, (e.hitT || 0) - dt);
        m.body.scale.setScalar(
          (e.type === 'pion' ? 0.75 : e.type === 'tour' ? 0.9 : 1) * (1 + (e.hitT || 0) * 1.2),
        );
        if (e.stun > 0) m.g.rotation.z = Math.sin(t * 20) * 0.05;
        else m.g.rotation.z = 0;
        if (e.type === 'roi') Boss.render(e, m, dt, t);
      }
      orbMesh.count = Math.min(64, orbs.length);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < orbMesh.count; i++) {
        m4.makeTranslation(orbs[i].p.x, orbs[i].p.y, orbs[i].p.z);
        orbMesh.setMatrixAt(i, m4);
      }
      orbMesh.instanceMatrix.needsUpdate = true;
      for (let i = telegraphs.length - 1; i >= 0; i--) {
        const tg = telegraphs[i];
        tg.t -= dt;
        tg.m.material.opacity = 0.2 + (1 - tg.t / tg.max) * 0.5;
        tg.m.scale.setScalar(0.3 + (1 - tg.t / tg.max) * 0.7);
        if (tg.t <= 0) {
          R.scene.remove(tg.m);
          telegraphs.splice(i, 1);
        }
      }
    },
    raycast(origin, dir, max = 70) {
      let best = null;
      let bd = max;
      let weak = false;
      for (const e of list.values()) {
        const T = TYPES[e.type];
        const c = e.pos.clone().add(V3(0, e.type === 'pion' ? 1 : T.height * 0.55, 0));
        const oc = c.clone().sub(origin);
        const tca = oc.dot(dir);
        if (tca < 0) continue;
        const d2 = oc.lengthSq() - tca * tca;
        const r = e.type === 'roi' ? 2.6 : T.radius;
        if (d2 > r * r || tca > bd) continue;
        bd = tca;
        best = e;
        weak = false;
        if (e.type === 'roi' && e.view) {
          const hp = e.view.heart.getWorldPosition(V3());
          const oh = hp.sub(origin);
          const th = oh.dot(dir);
          if (oh.lengthSq() - th * th < 0.7 * 0.7) weak = true;
        }
      }
      return best ? { e: best, d: bd, weak } : null;
    },
  };
  return api;
})();
