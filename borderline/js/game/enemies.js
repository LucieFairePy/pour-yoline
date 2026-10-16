const Enemies = (() => {
  const TYPES = {
    pion: { hp: 50, speed: 3.8, radius: 0.7, height: 1.1 },
    tour: { hp: 90, speed: 0, radius: 0.9, height: 2.6 },
    roi: { hp: 900, speed: 0, radius: 2.4, height: 5.5, boss: true, reach: 5, stunP: 6 },
  };
  const DEF = {};
  const glow = (c, k = 2) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  // visual models live in enemy-models.js and register themselves through Enemies.model()
  const MODELS = {};

  const lineTel = [];

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
  let sentEmpty = false;
  let lastPack = null;
  const tmpV = V3();
  const tmpV2 = V3();
  const m4 = new THREE.Matrix4();
  // interpolation delay for enemies on the guest (host sends ~15 packs/s)
  const LERP_DELAY = 120;

  // floating damage numbers, pooled sprites
  const nums = [];
  const numTex = new Map();
  const numMat = (txt, gold) => {
    const k = txt + (gold ? 'g' : '');
    if (!numTex.has(k)) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const g = c.getContext('2d');
      g.font = 'bold 44px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 7;
      g.strokeStyle = 'rgba(20,6,14,0.85)';
      g.strokeText(txt, 64, 34);
      g.fillStyle = gold ? '#ffd27a' : '#ffffff';
      g.fillText(txt, 64, 34);
      numTex.set(
        k,
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(c),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
    }
    return numTex.get(k);
  };
  const popNumber = (pos, amount, gold) => {
    const v = Math.round(amount);
    if (v <= 0) return;
    let n = nums.find((x) => x.t <= 0);
    if (!n) {
      if (nums.length >= 24) return;
      n = { s: new THREE.Sprite(numMat('0')), t: 0 };
      n.s.renderOrder = 10;
      R.scene.add(n.s);
      nums.push(n);
    }
    n.s.material = numMat(String(v), gold);
    n.s.visible = true;
    n.s.position.set(
      pos.x + (Math.random() - 0.5) * 0.8,
      pos.y,
      pos.z + (Math.random() - 0.5) * 0.8,
    );
    n.s.scale.set(1.1, 0.55, 1);
    n.t = 0.9;
  };
  const headPos = (e) =>
    tmpV2.set(
      e.pos.x,
      e.pos.y + (e.type === 'pion' ? 1.9 : (TYPES[e.type].height || 2) + 0.6),
      e.pos.z,
    );

  const view = (e) => {
    if (e.view) return e.view;
    const m = (MODELS[e.type] || DEF[e.type].model)(e);
    R.scene.add(m.g);
    e.view = m;
    return m;
  };

  const kill = (e) => {
    // host: send the death right away instead of waiting for the next pack
    netT = 1;
    if (e.view) {
      R.scene.remove(e.view.g);
      Fx.burst(
        e.pos.clone().add(V3(0, 1, 0)),
        TYPES[e.type].boss ? '#ffcf8a' : TYPES[e.type].dieColor || '#ff3a5a',
        TYPES[e.type].boss ? 260 : 45,
        TYPES[e.type].boss ? 8 : 5,
        TYPES[e.type].boss ? 1.4 : 0.9,
        -6,
      );
      Sound.play('enemyDie');
    }
    list.delete(e.id);
  };

  const api = {
    TYPES,
    model(type, fn) {
      MODELS[type] = fn;
    },
    define(type, def) {
      TYPES[type] = def.stats;
      DEF[type] = def;
    },
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
        shield: type === 'tour' || type === 'roi',
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
      nums.forEach((n) => {
        n.t = 0;
        n.s.visible = false;
      });
      orbs.length = 0;
      telegraphs.forEach((t) => R.scene.remove(t.m));
      telegraphs.length = 0;
      lineTel.forEach((t) => R.scene.remove(t.m));
      lineTel.length = 0;
    },
    alive(type) {
      return [...list.values()].filter((e) => !type || e.type === type).length;
    },
    boss() {
      return [...list.values()].find((e) => TYPES[e.type].boss) || null;
    },
    damage(id, dmg, stun, weak) {
      const e = list.get(id);
      if (!e) return;
      // a stunned enemy cannot be stunned again right after: no stun-lock
      if (stun && e.type === 'roi' && !Boss.canStun(e)) stun = 0;
      if (stun && !(e.stunImm > 0) && !(e.stun > 0)) {
        e.stun = stun;
        e.stunImm = stun + 1.5;
      }
      let k = 1;
      if (e.type === 'tour' && e.shield && e.stun <= 0) k = 0;
      // the sword only breaks a Tour's shield (it stuns); the rifle brings it down
      if (e.type === 'tour' && stun) k = 0;
      if (e.type === 'roi') k = Boss.mult(e, weak);
      if (DEF[e.type] && DEF[e.type].mult) k = DEF[e.type].mult(e, weak, stun);
      if (k <= 0) {
        Sound.play('deflect');
        return;
      }
      e.hp -= dmg * k;
      // the King cannot skip a phase in one vulnerability window
      if (e.type === 'roi') e.hp = Math.max(e.hp, Boss.floor(e));
      e.hitT = 0.15;
      popNumber(headPos(e), dmg * k, weak && k > 1);
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
    telegraphLine(from, to, w, t) {
      const len = Math.hypot(to.x - from.x, to.z - from.z);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, len).rotateX(-Math.PI / 2),
        telMat.clone(),
      );
      m.position.set((from.x + to.x) / 2, Math.max(from.y, to.y) + 0.06, (from.z + to.z) / 2);
      m.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      R.scene.add(m);
      lineTel.push({ m, t, max: t });
    },
    simulate(dt, players) {
      const targets = players.filter((p) => !p.down && !p.cloak);
      for (const e of list.values()) {
        e.stun = Math.max(0, e.stun - dt);
        e.stunImm = Math.max(0, (e.stunImm || 0) - dt);
        e.atk -= dt;
        if (e.type === 'roi') {
          Boss.simulate(e, dt, players, targets);
          continue;
        }
        if (DEF[e.type] && DEF[e.type].sim) {
          DEF[e.type].sim(e, dt, players, targets);
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
          if (!hit && !p.down && o.p.distanceTo(tmpV.set(p.pos.x, p.pos.y + 1.1, p.pos.z)) < 0.85) {
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
          e.st || 0,
          e.reveal > 0 ? 1 : 0,
          e.vuln ? 1 : 0,
        ]),
        o: orbs.map((o) => [
          +o.p.x.toFixed(2),
          +o.p.y.toFixed(2),
          +o.p.z.toFixed(2),
          +o.v.x.toFixed(2),
          +o.v.y.toFixed(2),
          +o.v.z.toFixed(2),
        ]),
      };
    },
    unpack(d) {
      // the same pack handed over twice (a second listener) is applied once; a malformed one
      // (another version of the game) is ignored
      if (!d || d === lastPack || !Array.isArray(d.e) || !Array.isArray(d.o)) return;
      lastPack = d;
      const seen = new Set();
      d.e.forEach(
        ([
          id,
          type,
          x,
          y,
          z,
          yaw,
          hp,
          max,
          stun,
          shield,
          phase,
          crystal,
          recover,
          st,
          reveal,
          vuln,
        ]) => {
          seen.add(id);
          let e = list.get(id);
          if (!e) {
            e = { id, type, pos: V3(x, y, z), yaw, hp, max, stun: 0, shield: !!shield };
            list.set(id, e);
          }
          // snapshot buffer for smooth interpolation
          const now = performance.now();
          if (!e.snaps) e.snaps = [];
          e.snaps.push({ t: now, x, y, z });
          if (e.snaps.length > 6) e.snaps.shift();
          e.yawT = yaw;
          if (hp < e.hp) {
            e.hitT = 0.15;
            popNumber(headPos(e), e.hp - hp, false);
          }
          e.hp = hp;
          e.max = max;
          e.stun = stun ? 1 : 0;
          e.shield = !!shield;
          e.phase = phase;
          e.crystal = !!crystal;
          e.recover = !!recover;
          e.st = st || 0;
          e.reveal = reveal ? 1 : 0;
          e.vuln = !!vuln;
        },
      );
      [...list.values()].forEach((e) => !seen.has(e.id) && kill(e));
      orbs.length = 0;
      d.o.forEach(([x, y, z, vx, vy, vz]) =>
        orbs.push({ p: V3(x, y, z), v: V3(vx || 0, vy || 0, vz || 0), guest: true }),
      );
    },
    // host: call every frame; an empty world is sent once so the guest drops the last enemy
    netTick(dt) {
      netT += dt;
      if (netT > 1 / 15) {
        netT = 0;
        const empty = !list.size && !orbs.length;
        if (empty && sentEmpty) return;
        sentEmpty = empty;
        Net.send('en', api.pack());
      }
    },
    render(dt, t) {
      const rt = performance.now() - LERP_DELAY;
      for (const e of list.values()) {
        const m = view(e);
        if (e.snaps && e.snaps.length) {
          // guest: render slightly in the past, between the two packs around that time
          const sn = e.snaps;
          let a = sn[0];
          let b = sn[sn.length - 1];
          for (let i = 0; i < sn.length - 1; i++)
            if (sn[i].t <= rt && sn[i + 1].t >= rt) {
              a = sn[i];
              b = sn[i + 1];
              break;
            }
          let k = b.t === a.t ? 1 : (rt - a.t) / (b.t - a.t);
          if (rt > b.t && sn.length > 1) {
            // short extrapolation when a pack is late
            const p = sn[sn.length - 2];
            a = p;
            k = 1 + Math.min(0.12, (rt - b.t) / 1000) / Math.max(0.03, (b.t - p.t) / 1000);
          }
          k = Math.max(0, k);
          e.pos.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
        }
        if (e.yawT != null) e.yaw = angleDamp(e.yaw, e.yawT, 10, dt);
        m.g.position.copy(e.pos);
        if (e.type === 'pion') m.g.position.y += 1 + Math.sin(t * 3 + e.id) * 0.12;
        m.g.rotation.y = e.yaw;
        if (m.shield) m.shield.visible = e.shield && !(e.stun > 0);
        if (m.eye)
          m.eye.material.color
            .setRGB(1, 0.16, 0.23)
            .multiplyScalar(e.hitT > 0 ? 4 : e.stun > 0 ? 0.4 : 2.4);
        e.hitT = Math.max(0, (e.hitT || 0) - dt);
        m.body.scale.setScalar(
          (m.bodyScale || 1) * (1 + (e.hitT || 0) * (TYPES[e.type].boss ? 0.15 : 1.2)),
        );
        if (m.anim) m.anim(e, dt, t);
        if (e.stun > 0) m.g.rotation.z = Math.sin(t * 20) * 0.05;
        else m.g.rotation.z = 0;
        if (e.type === 'roi') Boss.render(e, m, dt, t);
        if (DEF[e.type] && DEF[e.type].render) DEF[e.type].render(e, m, dt, t);
      }
      orbMesh.count = Math.min(64, orbs.length);
      for (let i = 0; i < orbMesh.count; i++) {
        if (orbs[i].guest) orbs[i].p.addScaledVector(orbs[i].v, dt);
        m4.makeTranslation(orbs[i].p.x, orbs[i].p.y, orbs[i].p.z);
        orbMesh.setMatrixAt(i, m4);
      }
      orbMesh.instanceMatrix.needsUpdate = true;
      for (const n of nums) {
        if (n.t <= 0) continue;
        n.t -= dt;
        n.s.position.y += dt * 1.6;
        n.s.material.opacity = Math.min(1, n.t * 2.5);
        if (n.t <= 0) n.s.visible = false;
      }
      for (let i = lineTel.length - 1; i >= 0; i--) {
        const tg = lineTel[i];
        tg.t -= dt;
        tg.m.material.opacity = 0.15 + (1 - tg.t / tg.max) * 0.45;
        if (tg.t <= 0) {
          R.scene.remove(tg.m);
          lineTel.splice(i, 1);
        }
      }
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
    // local feedback before the host confirms: flash the enemy that was just hit
    flash(id) {
      const e = list.get(id);
      if (e) e.hitT = 0.15;
    },
    raycast(origin, dir, max = 70) {
      let best = null;
      let bd = max;
      let weak = false;
      for (const e of list.values()) {
        const T = TYPES[e.type];
        if (DEF[e.type] && DEF[e.type].hidden && DEF[e.type].hidden(e)) continue;
        const oc = tmpV
          .set(e.pos.x, e.pos.y + (e.type === 'pion' ? 1 : T.height * 0.55), e.pos.z)
          .sub(origin);
        const tca = oc.dot(dir);
        if (tca < 0) continue;
        const d2 = oc.lengthSq() - tca * tca;
        const r = e.type === 'roi' ? 2.6 : T.hitR || T.radius;
        if (d2 > r * r || tca > bd) continue;
        bd = tca;
        best = e;
        weak = false;
        if (T.boss && e.view && e.view.heart) {
          const oh = e.view.heart.getWorldPosition(tmpV2).sub(origin);
          const th = oh.dot(dir);
          const wr = T.weakR || 0.7;
          if (oh.lengthSq() - th * th < wr * wr) weak = true;
        }
      }
      return best ? { e: best, d: bd, weak } : null;
    },
  };
  return api;
})();
