// ♠ R · Le Roi de Pique (épreuve sR): the last figure of the table of spades, in the Salle du Trône
// d'acier (js/world/cour_s.js). Kits as usual (Yoline: dame, William: valet). The Roi never fights:
// his champion does, a great empty armour of black iron with a tall pavise in front and a white
// core in its back.
//  - it only ever faces one of you (its focus): from the front, the pavise stops everything
//  - only the other one can hurt it, from behind, on the core (sword blows, or bullets that hit
//    the core itself); the focus can never hurt it, wherever they stand
//  - after a salvo it turns round, toward whoever hit it: the roles swap, again and again
// Its blows at the focus: the pike's thrust (a line), the sweep (a fan); from 60 % on, a
// shockwave that both must jump and a charge that stuns it against a pillar; under 30 %, all of it
// faster. Downed players are raised by the other (hold E); if both fall, the phase starts again.
// When it kneels, the Roi bows, and the cinematic of the table plays (js/cine/cour_s.js) before
// the reward.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('sR');
  const T = CONFIG;
  const W = CourS;
  const TITLE = 'Le Roi de Pique';
  const WHO = 'Le Roi de Pique';
  const BOSS = 'Le Champion d’acier';
  const TXT = {
    intro: 'Épreuve d’action. La Salle du Trône : le Roi de Pique y garde son champion.',
    rule: 'L’armure ne fait face qu’à l’un de vous : l’autre frappe son dos. Puis elle se retourne.',
    obj: {
      focus: 'Le champion te fait face : son bouclier arrête tes coups. Esquive (saute, écarte-toi) et occupe-le pendant que {mate} frappe son dos.',
      back: 'Le champion fait face à {mate} : passe dans son dos et frappe le cœur blanc. Il se retournera vers toi.',
      down: '{mate} est à terre : relève-{le} (maintiens E près d’{lui}).',
      wait: 'Approchez du champion : le combat commence.',
    },
    tagFocus: 'Face à {name}',
    tagStun: 'Assommé · son dos est ouvert',
    tagKneel: 'À genoux',
    notBack: 'De face, le bouclier arrête tout. Passe dans son dos.',
    notYou: 'Il te regarde : tes coups ne passent pas. C’est à {mate} de frapper.',
    core: 'Vise le cœur blanc, au milieu de son dos.',
    turned: 'Il se retourne vers toi !',
    turnedMate: 'Il se retourne vers {mate}. À toi de frapper son dos.',
    ring: 'Une onde ! Sautez par-dessus.',
    charge: 'Il charge ! Écarte-toi, et attire-le contre un pilier.',
    stun: 'Assommé contre le pilier : frappez son dos !',
    wipe: 'Tombés tous les deux. La phase reprend.',
    hint: 'Celui qu’il regarde l’occupe, l’autre fait le tour. Changez de rôle à chaque fois qu’il se retourne.',
    hintRing: 'Quand il lève son bouclier, une onde suit : sautez au moment où elle arrive.',
    win: 'Le champion s’agenouille. Le Roi de Pique descend de son trône.',
    // the Roi's own lines (playful, never cruel)
    r: {
      hello: 'Bienvenue dans ma salle du trône. Mon champion n’a pas de visage : rien qu’une armure, et un cœur dans le dos.',
      rule: 'Il ne regarde qu’un de vous à la fois. Moi aussi, d’ailleurs : c’est l’âge.',
      turn: ['Il se retourne. Toujours vers celui qui frappe.', 'À l’autre, maintenant.', 'Vous vous relayez bien.', 'Un regarde, l’autre frappe. Très royal.'],
      p2: 'Mon champion s’échauffe. Gare à ses charges, et sautez par-dessus ses ondes.',
      p3: 'Dernier assaut. Je n’ai jamais vu personne aller si loin.',
      wipe: 'Tombés tous les deux ? Relevez-vous. Mon champion attend.',
      end: 'Il s’agenouille. Alors le Roi de Pique aussi. Bien joué, tous les deux.',
    },
  };
  CONFIG.cards.sR = {
    title: TITLE,
    sub: 'Figure ♠ · battue',
    lines: [
      'Le champion du Roi : une armure vide, un cœur blanc dans le dos.',
      'Il ne regardait qu’un de vous ; l’autre frappait, puis il se retournait.',
      'Il s’est agenouillé, et les trois figures ont posé leurs cartes.',
    ],
  };

  const C = W.C;
  const now = () => performance.now() / 1000;
  const HP = 900;
  const SALVO = 70; // damage from behind before it turns round
  const PH_AT = [1, 1, 0.6, 0.3];
  const local = {
    pend: [],
    sayCd: {},
    objT: 0,
    near: 0,
    winT: 0,
    rT: 0,
    hints: {},
    wipe: 0,
    turnI: 0,
    rings: [],
    tels: [],
    focusSeen: null,
    stageSeen: 0,
    phSeen: 1,
    salvo: 0,
    salvoT: 0,
    cineSent: false,
    hitSay: 0,
  };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- words ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const rsay = (text, hold) => {
    HUD.say(text, WHO, hold || 2600);
    local.rT = Math.min(3, (hold || 2600) / 1000);
  };
  const sayOnce = (k, text, cd = 10) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const rsayBoth = (c, text) => {
    rsay(text);
    c.send('sRsay', [text, 1]);
  };
  const sayBoth = (c, text) => {
    say(text);
    c.send('sRsay', [text, 0]);
  };

  // ---------- telegraphs and the shockwave (drawn on each screen from one event) ----------
  const telMat = () =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe8ff').multiplyScalar(1.4), transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending });
  const telFan = (pos, yaw, half, r, t) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32, -half, half * 2).rotateX(-Math.PI / 2), telMat());
    m.position.set(pos.x, W.O.y + 0.05, pos.z);
    // the circle's angle 0 is +x: turn it so the fan opens along yaw
    m.rotation.y = yaw - Math.PI / 2;
    R.scene.add(m);
    local.tels.push({ m, t, max: t });
  };
  const telLine = (pos, yaw, len, w, t) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len).rotateX(-Math.PI / 2).translate(0, 0, len / 2), telMat());
    m.position.set(pos.x, W.O.y + 0.05, pos.z);
    m.rotation.y = yaw;
    R.scene.add(m);
    local.tels.push({ m, t, max: t });
  };
  const ringFx = (pos, t0Delay = 0) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.12, 6, 64).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8f0ff').multiplyScalar(2.2), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
    );
    m.position.set(pos.x, W.O.y + 0.35, pos.z);
    m.visible = false;
    R.scene.add(m);
    local.rings.push({ m, t: -t0Delay });
  };
  const RING_V = 11; // m/s
  const RING_MAX = 22;
  const clearFx = () => {
    local.tels.forEach((x) => R.scene.remove(x.m));
    local.tels = [];
    local.rings.forEach((x) => R.scene.remove(x.m));
    local.rings = [];
  };
  const fx = (c, d) => {
    const [k] = d;
    const p = d[1] ? V3(d[1][0], d[1][1], d[1][2]) : null;
    if (k === 'fan' && p) telFan(p, d[2], d[3], d[4], d[5]);
    if (k === 'line' && p) telLine(p, d[2], d[3], d[4], d[5]);
    if (k === 'ring' && p) {
      ringFx(p);
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.35);
      W.AU.clang(1, 90);
    }
    if (k === 'thrust') {
      Sound.play('punch', p);
      W.AU.clang(0.8, 260);
    }
    if (k === 'sweep') Sound.play('punch', p);
    if (k === 'step') W.AU.clang(0.35, 70);
    if (k === 'crash' && p) {
      Sound.play('slam');
      Sound.play('shatter');
      W.AU.clang(1.2, 110);
      Cam.shake = Math.max(Cam.shake, 0.6);
      Fx.burst(p.clone().add(V3(0, 3, 0)), '#dfe8ff', 120, 7, 1.0, -6);
    }
    if (k === 'turn') {
      Sound.play('roar');
      W.AU.clang(0.7, 150);
    }
    if (k === 'deflect' && p) {
      Sound.play('deflect');
      Fx.burst(p, '#ffffff', 10, 3, 0.3, 0);
    }
    if (k === 'kneel') {
      Sound.play('rumble', 1);
      W.AU.clang(1.3, 80);
      Cam.shake = Math.max(Cam.shake, 0.5);
    }
    if (k === 'phase') {
      Sound.play('roar');
      Sound.play('reveal');
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('sRfx', d);
  };
  const v3a = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
  const knock = (who, v) => {
    if (who === Story.role) Player.body.v.set(v[0], v[1], v[2]);
    else Net.send('sRkn', [who, ...v.map((x) => +x.toFixed(2))]);
  };
  Net.on('sRkn', (d) => {
    if (!Story.S || Story.S.phase !== 'tr_sR' || d[0] !== Story.role) return;
    Player.body.v.set(d[1], d[2], d[3]);
  });

  // ---------- the champion (Enemies: host-simulated, synced by the enemy packs) ----------
  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return { who, pos: c.pos(who), down: me ? Combat.down : !!rs.down, cloak: false, grounded: me ? Player.body.grounded : rs.grounded !== false };
    });
  let hostC = null;
  const arenaClamp = (p, r = 1.8) => {
    p.x = clamp(p.x, W.O.x + C.x[0] + r, W.O.x + C.x[1] - r);
    p.z = clamp(p.z, W.O.z + C.z[0] + r, W.O.z + C.dais[0] - r);
  };
  const pillarHit = (p, r) => C.pillars.some(([x, z]) => Math.abs(p.x - (W.O.x + x)) < 1.2 + r && Math.abs(p.z - (W.O.z + z)) < 1.2 + r);
  const wallHit = (p, r) => p.x < W.O.x + C.x[0] + r || p.x > W.O.x + C.x[1] - r || p.z < W.O.z + C.z[0] + r || p.z > W.O.z + C.dais[0] - r;
  Enemies.define('srArmure', {
    stats: { hp: HP, speed: 0, radius: 2.0, hitR: 2.1, height: 5.2, boss: true, reach: 4.4, stunP: 0, weakR: 1.0, dieColor: '#dfeaff' },
    model: () => {
      const m = W.armourModel();
      m.g.scale.setScalar(1);
      return m;
    },
    mult: () => 1,
    sim(e, dt, players) {
      const c = hostC;
      if (!c || !Story.S || Story.S.phase !== 'tr_sR') return;
      const x = c.S.x;
      e.t = (e.t || 0) - dt;
      e.atk -= 0;
      e.stunImm = 99;
      if (e.st === 8) return;
      const ph = e.hp > HP * PH_AT[2] ? 1 : e.hp > HP * PH_AT[3] ? 2 : 3;
      if (ph !== (e.ph || 1)) {
        e.ph = ph;
        e.phase = ph;
        e.st = 9;
        e.t = 1.6;
        fxBoth(c, ['phase']);
        rsayBoth(c, ph === 2 ? TXT.r.p2 : TXT.r.p3);
        c.set((s) => (s.x.ph = ph));
        return;
      }
      e.phase = ph;
      const P2 = ph >= 2;
      const P3 = ph === 3;
      const fp = players.find((p) => p.who === x.focus);
      const other = players.find((p) => p.who !== x.focus);
      // the focus is down: it turns to the one still standing
      const tgt = fp && !fp.down ? fp : other && !other.down ? other : null;
      const fx2 = Math.sin(e.yaw);
      const fz2 = Math.cos(e.yaw);
      const hurt = (test, dmg, kb) =>
        players.forEach((p) => {
          if (p.down || !test(p)) return;
          Combat.hurt(p.who, dmg, e.pos);
          if (kb) {
            const dx = p.pos.x - e.pos.x;
            const dz = p.pos.z - e.pos.z;
            const l = Math.hypot(dx, dz) || 1;
            knock(p.who, [(dx / l) * kb, 6, (dz / l) * kb]);
          }
        });
      // stunned against a pillar: it does nothing, its back stays open
      if (e.st === 7) {
        if (e.t <= 0) {
          e.st = 4;
          e.t = 0.8;
        }
        return;
      }
      if (e.st === 9) {
        if (e.t <= 0) e.st = 0;
        return;
      }
      // charging: straight ahead until a pillar (stunned), a wall or the end of its run
      if (e.st === 6) {
        const sp = P3 ? 19 : 17;
        const nx = e.pos.x + fx2 * sp * dt;
        const nz = e.pos.z + fz2 * sp * dt;
        const np = V3(nx, e.pos.y, nz);
        hurt((p) => !e.hitSet.has(p.who) && Math.hypot(p.pos.x - nx, p.pos.z - nz) < 2.0 && p.pos.y < e.pos.y + 3 && (e.hitSet.add(p.who), true), 26, 13);
        if (pillarHit(np, 1.4)) {
          e.st = 7;
          e.t = P3 ? 2.8 : 3.4;
          fxBoth(c, ['crash', v3a(np)]);
          sayBoth(c, TXT.stun);
          return;
        }
        if (wallHit(np, 1.6) || e.t <= 0) {
          e.st = 4;
          e.t = 1.0;
          fxBoth(c, ['step']);
          return;
        }
        e.pos.x = nx;
        e.pos.z = nz;
        return;
      }
      // turning toward its target, a slow walk when far
      if (tgt && e.st !== 1 && e.st !== 2 && e.st !== 3 && e.st !== 5) {
        const want = Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
        e.yaw = angleDamp(e.yaw, want, P3 ? 4.2 : P2 ? 3.6 : 3.0, dt);
        const d = Math.hypot(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
        if (d > 6 && e.st === 0) {
          e.pos.x += Math.sin(e.yaw) * dt * (P3 ? 2.2 : 1.6);
          e.pos.z += Math.cos(e.yaw) * dt * (P3 ? 2.2 : 1.6);
          arenaClamp(e.pos);
          e.stepT = (e.stepT || 0) - dt;
          if (e.stepT <= 0) {
            e.stepT = 0.7;
            fxBoth(c, ['step']);
          }
        }
      }
      if (e.st === 0 || e.st == null) {
        e.st = 0;
        if (e.t > 0 || !tgt) return;
        const d = Math.hypot(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
        const list = P3 ? ['thrust', 'ring', 'sweep', 'charge', 'ring', 'thrust'] : P2 ? ['thrust', 'sweep', 'ring', 'charge', 'thrust', 'ring'] : ['thrust', 'sweep', 'thrust', 'sweep'];
        e.ai = ((e.ai || 0) + 1) % list.length;
        let k = list[e.ai];
        if (k === 'sweep' && d > 7.5) k = 'thrust';
        if (k === 'thrust' && d > 11 && P2) k = 'charge';
        const yaw = Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
        if (k === 'thrust') {
          e.st = 1;
          e.t = P3 ? 0.85 : P2 ? 0.95 : 1.1;
          e.yaw = yaw;
          fxBoth(c, ['line', v3a(e.pos), +yaw.toFixed(3), 10, 2.4, e.t]);
        } else if (k === 'sweep') {
          e.st = 2;
          e.t = P3 ? 0.95 : 1.15;
          e.yaw = yaw;
          fxBoth(c, ['fan', v3a(e.pos), +yaw.toFixed(3), 1.05, 6.8, e.t]);
        } else if (k === 'ring') {
          e.st = 3;
          e.t = P3 ? 0.8 : 1.0;
        } else if (k === 'charge') {
          e.st = 5;
          e.t = P3 ? 0.85 : 1.05;
          e.yaw = yaw;
          fxBoth(c, ['line', v3a(e.pos), +yaw.toFixed(3), 26, 3.6, e.t]);
          sayBoth(c, TXT.charge);
        }
        return;
      }
      if (e.t > 0) return;
      if (e.st === 1) {
        fxBoth(c, ['thrust', v3a(e.pos)]);
        hurt(
          (p) => {
            const dx = p.pos.x - e.pos.x;
            const dz = p.pos.z - e.pos.z;
            const along = dx * fx2 + dz * fz2;
            const side = Math.abs(dx * fz2 - dz * fx2);
            return along > 0 && along < 10.3 && side < 1.35 && p.pos.y < e.pos.y + 3;
          },
          26,
          9,
        );
        e.st = 4;
        e.t = 0.9;
      } else if (e.st === 2) {
        fxBoth(c, ['sweep', v3a(e.pos)]);
        hurt(
          (p) => {
            const dx = p.pos.x - e.pos.x;
            const dz = p.pos.z - e.pos.z;
            const d = Math.hypot(dx, dz);
            return d < 7.0 && d > 0.4 && (dx * fx2 + dz * fz2) / d > Math.cos(1.1) && p.pos.y < e.pos.y + 3;
          },
          22,
          10,
        );
        e.st = 4;
        e.t = 0.9;
      } else if (e.st === 3) {
        // the shockwave: everyone on the floor when its front passes is hit
        fxBoth(c, ['ring', v3a(e.pos)]);
        local.hostRings.push({ p: e.pos.clone(), t: 0, hit: new Set() });
        if (P3) {
          after(0.9, () => {
            const b = Enemies.boss();
            if (!b || b.st === 8) return;
            fxBoth(c, ['ring', v3a(b.pos)]);
            local.hostRings.push({ p: b.pos.clone(), t: 0, hit: new Set() });
          });
        }
        e.st = 4;
        e.t = P3 ? 1.6 : 1.2;
      } else if (e.st === 5) {
        e.st = 6;
        e.t = 1.6;
        e.hitSet = new Set();
        fxBoth(c, ['step']);
      } else if (e.st === 4) {
        e.st = 0;
        e.t = P3 ? 0.9 + Math.random() * 0.5 : P2 ? 1.2 + Math.random() * 0.6 : 1.6 + Math.random() * 0.8;
      }
    },
    render(e, m, dt, t) {
      const a = (e._a = e._a || { prev: 0, rel: 0, k: 0, kneel: 0, walk: 0, lp: e.pos.clone(), stun: 0 });
      const st = e.st || 0;
      if (a.prev !== st) {
        if (a.prev === 1 || a.prev === 2 || a.prev === 3) a.rel = 0.35;
        a.prev = st;
      }
      a.rel = Math.max(0, a.rel - dt);
      const mv = Math.hypot(e.pos.x - a.lp.x, e.pos.z - a.lp.z) / Math.max(dt, 1e-3);
      a.lp.copy(e.pos);
      a.walk += dt * Math.min(mv, 18) * 1.4;
      const moving = mv > 0.4 && st !== 8;
      a.kneel = damp(a.kneel, st === 8 ? 1 : 0, 1.6, dt);
      a.stun = damp(a.stun, st === 7 ? 1 : 0, 6, dt);
      const P_ = m;
      // legs: a heavy stride when it walks, one knee down when it kneels
      const sw = moving ? Math.sin(a.walk) * 0.45 : 0;
      P_.legs[0].hip.rotation.x = sw - a.kneel * 1.4;
      P_.legs[1].hip.rotation.x = -sw + a.kneel * 0.2;
      P_.legs[0].knee.rotation.x = Math.max(0, -sw) * 0.6 + a.kneel * 1.5;
      P_.legs[1].knee.rotation.x = Math.max(0, sw) * 0.6 + a.kneel * 1.9;
      m.body.position.y = -a.kneel * 1.25 + (moving ? Math.abs(Math.cos(a.walk)) * 0.08 : Math.sin(t * 1.3) * 0.04);
      P_.torso.rotation.x = a.kneel * 0.35 + a.stun * 0.3 + (st === 6 ? 0.35 : st === 5 ? 0.2 : 0);
      P_.head.rotation.x = a.kneel * 0.5 + a.stun * 0.4;
      P_.head.rotation.z = a.stun * Math.sin(t * 6) * 0.15;
      // arms
      const pose = (arm, x, z, k = 8) => {
        arm.sh.rotation.x = damp(arm.sh.rotation.x, x, k, dt);
        arm.sh.rotation.z = damp(arm.sh.rotation.z, z, k, dt);
      };
      const L = P_.armL;
      const Rr = P_.armR;
      if (st === 8) {
        pose(L, 0.2, 0.4, 3);
        pose(Rr, -0.6, -0.2, 3);
      } else if (st === 7) {
        pose(L, 0.4, 0.6);
        pose(Rr, 0.3, -0.5);
      } else if (st === 1) {
        // the pike drawn back, about to thrust
        pose(Rr, -0.3, -0.3);
        P_.pike.position.z = damp(P_.pike.position.z, -1.4, 6, dt);
        pose(L, -0.6, 0.3);
      } else if (st === 2) {
        pose(Rr, -1.4, -1.3);
        pose(L, -0.5, 0.3);
      } else if (st === 3) {
        // the pavise raised high, to slam the floor
        pose(L, -2.6, 0.1);
        pose(Rr, -0.4, -0.3);
      } else if (st === 5 || st === 6) {
        pose(L, -1.4, 0.0, 10);
        pose(Rr, -0.9, -0.2, 10);
      } else if (a.rel > 0) {
        pose(Rr, -1.5, 0.6, 30);
        pose(L, -1.2, 0.2, 30);
      } else {
        pose(L, -1.0 + Math.sin(t * 1.1) * 0.04, 0.1);
        pose(Rr, -0.8, -0.25);
      }
      P_.pike.position.z = damp(P_.pike.position.z, st === 1 ? -1.4 : a.rel > 0 && a.prev !== 2 ? 1.6 : 0, a.rel > 0 ? 18 : 5, dt);
      L.el.rotation.x = -0.5;
      Rr.el.rotation.x = -0.6;
      // the pavise: raised high before a slam, brought down hard; lowered when it kneels
      a.raise = damp(a.raise || 0, st === 3 ? 1 : 0, st === 3 ? 4 : 14, dt);
      P_.pavise.position.y = 0.25 + a.raise * 1.7 - a.kneel * 0.9;
      P_.pavise.rotation.x = -a.raise * 0.35 + a.kneel * 0.5;
      P_.pavise.position.z = 1.35 + a.raise * 0.3;
      // the core: bright, flickering when stunned, dim when it kneels
      const ck = st === 8 ? 0.25 : st === 7 ? 1.6 + Math.sin(t * 20) * 0.5 : 1.0 + Math.sin(t * 3) * 0.12;
      P_.coreMat.color.set('#dfeaff').multiplyScalar(2.2 * ck);
      P_.coreHalo.material.opacity = Math.min(1, 0.5 * ck);
      P_.eye.material.color.set('#d8e6ff').multiplyScalar(st === 8 ? 0.4 : e.hitT > 0 ? 3.4 : 2.4);
      if (st === 7 && Math.random() < dt * 8) Fx.burst(e.pos.clone().add(V3((Math.random() - 0.5) * 1.5, 5.4, (Math.random() - 0.5) * 1.5)), '#dfe8ff', 4, 2, 0.4, 1);
    },
  });

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage >= 2) return TXT.win;
    if (!x.fight) return TXT.obj.wait;
    const rs = c.remoteState();
    if (rs && rs.down) return TXT.obj.down;
    return x.focus === c.role ? TXT.obj.focus : TXT.obj.back;
  };

  // ---------- light and mood ----------
  const mood = (c, end) => {
    LvKit.mood({
      sky: '#8fa0c0',
      ground: '#15181e',
      hemi: end ? 0.62 : 0.55,
      sun: '#e2ebff',
      sunI: end ? 0.85 : 0.72,
      sunPos: V3(-30, 90, -50),
      exposure: end ? 1.45 : 1.38,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set('#0d1118');
    c.fog(0.0058);
    Sound.mood(end ? 'calm' : 'dark');
  };

  const spawnBoss = (c, ph) => {
    const hp = ph === 1 ? HP : HP * PH_AT[ph] - 1;
    Enemies.spawn('srArmure', W.P(C.armour[0], 0, C.armour[1]), { hp, ph, phase: ph, st: 0, t: 2.0, atk: 0, yaw: Math.PI, stunImm: 99 });
  };

  Story.register('tr_sR', {
    init: () => ({ stage: 1, fight: 0, focus: 'valet', ph: 1, turns: 0, wipes: 0, seen: [], hp: 1 }),
    voice: () => 1,
    net: {
      sRsay: (c, d) => (d[1] ? rsay(d[0]) : say(d[0], 2600)),
      sRfx: (c, d) => fx(c, d),
      sRwipe: (c) => {
        Combat.reset();
        clearFx();
        c.spawn(W.spawn('C', c.role), 0);
        say(TXT.wipe, 2600);
      },
    },
    async enter(c, first) {
      local.ready = false;
      if (!first) await fadeTo(true);
      W.build();
      W.show('C');
      Enemies.clear();
      clearFx();
      hostC = c;
      Object.assign(local, {
        pend: [],
        sayCd: {},
        objT: 0,
        near: 0,
        winT: 0,
        rT: 0,
        hints: {},
        wipe: 0,
        turnI: 0,
        hostRings: [],
        focusSeen: c.S.x.focus,
        stageSeen: c.S.x.stage,
        phSeen: c.S.x.ph,
        salvo: 0,
        salvoT: 0,
        cineSent: false,
        cineOn: false,
        hitSay: 0,
        bossOn: false,
      });
      c.spawn(W.spawn('C', c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => W.spawn('C', c.role);
      Player.targets = null;
      Combat.enable(true);
      Combat.noCloak = true;
      mood(c, c.S.x.stage >= 2);
      after(0.6, () => Story.S && Story.S.phase === 'tr_sR' && mood(c, Story.S.x.stage >= 2));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screens.C) W.screens.C.show(TITLE, CARD + ' · le champion', '#d8e4ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1 && !c.S.x.fight) {
        say(TXT.intro, 3600);
        say(TXT.rule, 4200);
        after(8, () => Story.S && Story.S.phase === 'tr_sR' && rsay(TXT.r.hello, 4400));
        after(12.6, () => Story.S && Story.S.phase === 'tr_sR' && rsay(TXT.r.rule, 3600));
      }
      // the fight restarts at its phase after a reload
      if (Net.isHost && c.S.x.stage === 1 && c.S.x.fight) {
        spawnBoss(c, c.S.x.ph || 1);
        local.bossOn = true;
      }
      local.ready = true;
      this.apply(c);
      W.snap();
    },
    exit() {
      local.ready = false;
      Player.killY = -40;
      Combat.enable(false);
      Combat.noCloak = false;
      Enemies.clear();
      HUD.boss(null);
      clearFx();
      hostC = null;
      const wasCine = local.cineOn;
      local.cineOn = false;
      if (wasCine && typeof Cut !== 'undefined') Cut.stop();
      if (Player.mode === 'frozen') Player.mode = 'walk';
      LvKit.mood(null);
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      W.hide();
      W.showCard(null);
      local.pend = [];
    },
    apply(c) {
      if (!W.built || !local.ready) return;
      const x = c.S.x;
      const r = c.role;
      if (x.focus !== local.focusSeen) {
        local.focusSeen = x.focus;
        if (x.stage === 1 && x.fight) say(x.focus === r ? TXT.turned : TXT.turnedMate, 2000);
      }
      if (x.stage !== local.stageSeen) {
        local.stageSeen = x.stage;
        if (x.stage === 2) {
          mood(c, true);
          HUD.boss(null);
          after(0.4, () => rsay(TXT.r.end, 4600));
          after(5.2, () => say(TXT.win, 3200));
        }
      }
      // the cinematic of the table, then the reward (each screen plays it, the host moves on)
      if (x.stage === 3 && !local.cineOn && typeof Cut !== 'undefined' && Cut.has('cour_s')) {
        local.cineOn = true;
        // the fight is over: no rifle counter or vitals over the film
        Combat.enable(false);
        HUD.objective('');
        HUD.boss(null);
        Player.mode = 'frozen';
        const tok = (local.cineTok = (local.cineTok || 0) + 1);
        Cut.play('cour_s').then(() => {
          if (tok !== local.cineTok || !local.cineOn) return;
          if (!Story.S || Story.S.phase !== 'tr_sR' || local.cineSent) return;
          local.cineSent = true;
          Cut.wait('{mate} regarde encore la cinématique…');
          c.act({ a: 'cineDone', who: Story.me });
        });
      }
      if (x.stage === 3 && local.cineSent && !(x.seen || []).includes(Story.me)) c.act({ a: 'cineDone', who: Story.me });
      if (x.stage !== 3) HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built || !local.ready) return;
      const x = c.S.x;
      const ps = players(c);
      const q = ps.map((p) => W.rel(p.pos));
      if (x.stage === 1) {
        // the fight starts once both are well inside the hall
        if (!x.fight && q.every((v) => v.z > C.z[0] + 6 && v.y > -0.5) && c.phaseT > 3) {
          spawnBoss(c, 1);
          local.bossOn = true;
          // it first faces the one nearest to it
          const b = W.P(C.armour[0], 0, C.armour[1]);
          const near = ps.slice().sort((a, b2) => a.pos.distanceTo(b) - b2.pos.distanceTo(b))[0].who;
          c.set((s) => {
            s.x.fight = 1;
            s.x.focus = near;
          });
        }
        if (x.fight) {
          const boss = Enemies.boss();
          if (!boss && local.bossOn) {
            spawnBoss(c, x.ph || 1);
          }
          Enemies.simulate(dt, ps);
          // the shockwaves: hit whoever is on the floor when the front passes
          for (let i = local.hostRings.length - 1; i >= 0; i--) {
            const rg = local.hostRings[i];
            rg.t += dt;
            const R0 = rg.t * RING_V;
            ps.forEach((p) => {
              if (p.down || rg.hit.has(p.who)) return;
              const d = Math.hypot(p.pos.x - rg.p.x, p.pos.z - rg.p.z);
              const onFloor = p.grounded && p.pos.y - W.O.y < 0.5;
              if (Math.abs(d - R0) < 0.7 && onFloor) {
                rg.hit.add(p.who);
                Combat.hurt(p.who, 16, rg.p);
                knock(p.who, [0, 6.5, 0]);
              }
            });
            if (R0 > RING_MAX) local.hostRings.splice(i, 1);
          }
          // a salvo that went unanswered for long fades (no turning on an old hit)
          local.salvoT = Math.max(0, local.salvoT - dt);
          if (local.salvoT === 0) local.salvo = 0;
          // a wipe: both down → the phase starts again
          if (ps[0].down && ps[1].down) {
            local.wipe += dt;
            if (local.wipe > 2.2) {
              local.wipe = 0;
              const ph = x.ph || 1;
              Enemies.clear();
              local.hostRings = [];
              Combat.reset();
              clearFx();
              c.spawn(W.spawn('C', c.role), 0);
              say(TXT.wipe, 2600);
              c.send('sRwipe');
              spawnBoss(c, ph);
              c.set((s) => (s.x.wipes = (s.x.wipes || 0) + 1));
              after(2.8, () => rsayBoth(c, TXT.r.wipe));
            }
          } else local.wipe = 0;
          if (boss) {
            const hp = +(boss.hp / HP).toFixed(2);
            if (hp !== x.hp) c.set((s) => (s.x.hp = hp));
          }
        }
        Enemies.netTick(dt);
      } else Enemies.netTick(dt);
      if (x.stage === 2) {
        local.winT += dt;
        if (local.winT > 9) c.set((s) => (s.x.stage = 3));
      }
      if (x.stage === 3) {
        const n = (x.seen || []).length;
        const alone = n >= 1 && !Remote.fresh && c.phaseT > 3;
        if (n >= 2 || alone || c.phaseT > 400) c.goto('reward', (s) => (s.x.card = 'sR'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hit') {
        const e = Enemies.list.get(d.id);
        if (!e || e.type !== 'srArmure' || x.stage !== 1 || e.st === 8) return;
        const p = c.pos(who);
        const dx = p.x - e.pos.x;
        const dz = p.z - e.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        const behind = (dx * Math.sin(e.yaw) + dz * Math.cos(e.yaw)) / l < -0.2 || e.st === 7;
        const sword = who === 'valet' && d.stun != null;
        const tell = (k) => {
          if (who === c.role) sayOnce(k, TXT[k] === TXT.notYou ? TXT.notYou : TXT[k], 6);
          else if (now() - (local['tell' + k] || 0) > 6) {
            local['tell' + k] = now();
            c.send('sRsay', [TXT[k], 0]);
          }
        };
        // the focus never hurts it; from the front the pavise stops all; bullets must find the core
        if (who === x.focus) {
          fxBoth(c, ['deflect', v3a(e.pos.clone().add(V3(0, 3, 0)))]);
          return tell('notYou');
        }
        if (!behind) {
          fxBoth(c, ['deflect', v3a(e.pos.clone().add(V3(0, 3, 0)))]);
          return tell('notBack');
        }
        if (!sword && !d.weak) {
          if (Math.random() < 0.3) tell('core');
          return;
        }
        const dmg = sword ? 15 : 4.2;
        if (e.hp - dmg <= 1) {
          // it kneels: the fight is won
          e.hp = 1;
          e.st = 8;
          local.hostRings = [];
          c.set((s) => {
            s.x.stage = 2;
            s.x.hp = 0;
          });
          fxBoth(c, ['kneel']);
          local.winT = 0;
          return;
        }
        Enemies.damage(d.id, dmg, 0, !!d.weak);
        local.salvo += dmg;
        local.salvoT = 6;
        // a salvo: it turns round toward the one who hit it
        if (local.salvo >= SALVO * (e.st === 7 ? 1.6 : 1)) {
          local.salvo = 0;
          if (e.st !== 7) {
            e.st = 9;
            e.t = 0.7;
          }
          c.set((s) => {
            s.x.focus = who;
            s.x.turns = (s.x.turns || 0) + 1;
          });
          fxBoth(c, ['turn']);
          if (x.turns % 3 === 1) rsayBoth(c, TXT.r.turn[local.turnI++ % TXT.r.turn.length]);
        }
      }
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
      if (d.a === 'cineDone') {
        const k = d.who || who;
        if (x.stage === 3 && !(x.seen || []).includes(k)) c.set((s) => (s.x.seen = [...(s.x.seen || []), k]));
      }
    },
    update(c, dt, t) {
      if (!W.built || !local.ready) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.rT = Math.max(0, local.rT - dt);
      Enemies.render(dt, t);
      // telegraphs fade in, rings expand
      for (let i = local.tels.length - 1; i >= 0; i--) {
        const tg = local.tels[i];
        tg.t -= dt;
        tg.m.material.opacity = 0.12 + (1 - tg.t / tg.max) * 0.4;
        if (tg.t <= 0) {
          R.scene.remove(tg.m);
          tg.m.geometry.dispose();
          tg.m.material.dispose();
          local.tels.splice(i, 1);
        }
      }
      for (let i = local.rings.length - 1; i >= 0; i--) {
        const rg = local.rings[i];
        rg.t += dt;
        const R0 = rg.t * RING_V;
        rg.m.visible = rg.t > 0;
        rg.m.scale.set(Math.max(0.01, R0), 1, Math.max(0.01, R0));
        rg.m.material.opacity = 0.9 * (1 - R0 / RING_MAX);
        if (R0 > RING_MAX) {
          R.scene.remove(rg.m);
          rg.m.geometry.dispose();
          rg.m.material.dispose();
          local.rings.splice(i, 1);
        }
      }
      // the boss bar: whom it faces
      const boss = Enemies.boss();
      if (x.stage === 1 && x.fight && boss) {
        const st = boss.st || 0;
        const tag = st === 7 ? TXT.tagStun : fill(TXT.tagFocus, { name: Story.name(x.focus) });
        HUD.boss(BOSS, boss.hp / HP, 'Phase ' + (x.ph || 1) + ' · ' + tag);
      } else if (x.stage === 2) HUD.boss(BOSS, 0, TXT.tagKneel);
      // hints
      if (x.stage === 1 && x.fight) {
        if ((x.wipes || 0) >= 1 && !local.hints.h1) {
          local.hints.h1 = true;
          after(4, () => say(TXT.hint, 4800));
        }
        if ((x.ph || 1) >= 2 && !local.hints.ring) {
          local.hints.ring = true;
          after(3, () => say(TXT.hintRing, 4200));
        }
      }
      // ---------- the Roi at his throne; the Valet and the Dame beside it ----------
      const F = W.ST.fig.R;
      const won = x.stage >= 2;
      local.winT2 = won ? (local.winT2 || 0) + dt : 0;
      F.p.set(0, won && local.winT2 > 2 ? 0 : C.daisY, won && local.winT2 > 2 ? 229.5 : C.throneZ);
      const mid = W.rel(p).add(W.rel(c.pos(r === 'dame' ? 'valet' : 'dame'))).multiplyScalar(0.5);
      F.ry = Math.atan2(mid.x - F.p.x, mid.z - F.p.z);
      F.s = { act: !won && local.rT > 0 ? 'raise' : null, talk: local.rT, bow: won && local.winT2 > 3.2 ? 1 : 0, look: W.P(mid.x, 1.6, mid.z) };
      W.ST.fig.V.p.set(-5.5, C.daisY, 234.5);
      W.ST.fig.V.ry = Math.PI + 0.25;
      W.ST.fig.V.s = { act: null, talk: 0, bow: won && local.winT2 > 3.6 ? 1 : 0 };
      W.ST.fig.D.p.set(5.5, C.daisY, 234.5);
      W.ST.fig.D.ry = Math.PI - 0.25;
      W.ST.fig.D.s = { act: null, talk: 0, bow: won && local.winT2 > 4 ? 1 : 0 };
      W.ST.figOn = { V: true, D: true, R: true };

      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0 && x.stage !== 3) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      if (x.stage === 3) return null;
      const prompt = Combat.update(dt);
      if (x.stage >= 2) return null;
      return prompt;
    },
  });
})();
