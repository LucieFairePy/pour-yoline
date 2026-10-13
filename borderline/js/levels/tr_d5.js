(() => {
  const T = CONFIG;
  const TITLE = 'La Gravité';
  const FLIP_T = 4.4; // the whole turn: float up, the room rolls over, fall on the new floor
  const ROT0 = 0.7;
  const ROT1 = 3.5;
  const HOLD_FLIP = 1.0; // both levers held that long
  const TURN_STEP = 0.75; // seconds per notch on a ring
  const PULSE_EVERY = 13;
  const PULSE_WARN = 2.0;
  const TXT = {
    intro: 'Épreuve de logique. L’observatoire de la Gravité : ici, rien ne tombe forcément vers le bas.',
    hint: {
      dame: 'Tes yeux voient les sceaux et les étoiles cachées. {mate} porte ce qui est lourd.',
      valet: 'Tu portes ce qui est lourd, et ton double saut va plus haut. Ce qui est caché, seul{pe} {mate} le voit.',
    },
    r1: {
      dame: 'Salle 1 · Au plafond, deux piliers portent un sceau ♦ : toi seul{e} les vois. Les caisses doivent finir dessus.',
      valet: 'Salle 1 · Deux des piliers du plafond portent un sceau : seul{pe} {mate} les voit. Toi seul{e} portes les caisses (E).',
    },
    rule1: 'Les deux leviers ensemble (E maintenu) retournent la salle. Ce qui flotte retombe tout droit. Le plafond devient le sol… à l’envers.',
    flip: 'La salle se retourne.',
    landed: 'Nouveau sol.',
    seal: 'Un sceau s’allume. L’autre caisse est tombée à côté.',
    noSeal: 'Les caisses sont retombées à côté des sceaux. Retournez la salle et réessayez.',
    sealsDone: 'Les deux sceaux brillent. La herse se lève : sortez par le bas.',
    noFlip: 'La salle ne bougera plus : la sortie est ouverte.',
    tooHeavy: 'Trop lourde pour toi. {mate} peut la porter.',
    putFirst: 'Pose la caisse d’abord.',
    noStack: 'Pas ici : posez-la à plat, au sol.',
    bothIn: 'Il faut être tous les deux dans la salle.',
    r2: {
      dame: 'Salle 2 · Le rayon (E sur le chariot) fait avancer la dalle de {mate} quand tu marches. Les grilles s’ouvrent quand {il} sonne les cloches.',
      valet: 'Salle 2 · Monte sur la dalle : {mate} la fait avancer avec le rayon. Dans les bulles, la gravité est faible : saute (double saut) jusqu’aux cloches.',
    },
    rule2: 'Dans les bulles bleues, on pèse presque rien. Chaque cloche ouvre une grille sur la galerie.',
    beamOnly: 'Le rayon ne répond qu’au grappin de {mate}.',
    bell: 'Une cloche sonne. Une grille se lève sur la galerie.',
    gap: 'Au bout de la galerie, l’anneau (F) te fait traverser.',
    r3: {
      dame: 'Salle 3 · Les courants ne coulent que si quelqu’un se tient sur une pierre. L’un sur la pierre, l’autre dans le courant.',
      valet: 'Salle 3 · Les courants ne coulent que si quelqu’un se tient sur une pierre. L’un sur la pierre, l’autre dans le courant.',
    },
    rule3: 'Chaque pierre fait couler les courants de part et d’autre de son île. Arrivé de l’autre côté, monte sur la pierre pour l’autre.',
    streamOff: 'Le courant s’est arrêté.',
    r4: {
      dame: 'L’orrery · Alignez les trois planètes. Tu vois les cibles ♥ et ♣, {mate} voit la ♦. Une manivelle ne tourne que si l’autre tient son embrayage, à un autre étage.',
      valet: 'L’orrery · Alignez les trois planètes. Tu vois la cible ♦, {mate} voit ♥ et ♣. Une manivelle ne tourne que si l’autre tient son embrayage, à un autre étage.',
    },
    rule4: 'Les colonnes bleues font monter. Quand l’anneau bleu se referme sur le cœur : sautez, ou la pulsation vous projette.',
    pulseWarn: 'Pulsation !',
    pulseHit: 'La pulsation vous a projeté{e}. Les anneaux ont glissé.',
    pulseHitMate: 'La pulsation a projeté {mate}. Les anneaux ont glissé.',
    dodge: 'Esquivé.',
    needClutch: '{mate} doit tenir l’embrayage de cet anneau.',
    locked: 'Une planète se verrouille.',
    solved: 'Les trois planètes sont alignées. Le cœur de l’orrery s’ouvre.',
    card: 'La carte ♦ 5 descend au centre. Allez-y ensemble.',
  };
  CONFIG.cards.d5 = {
    corner: '5\n♦',
    big: '♦',
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'Le haut et le bas ont changé de place, vous non.',
      'L’un voyait les étoiles, l’autre portait le poids du monde.',
      'Même à l’envers, vous êtes retombés l’un à côté de l’autre.',
    ],
  };

  const local = {
    stage: 0,
    flipN: 0,
    flipT: -1,
    flipS0: 0,
    float: null,
    bz: 44,
    cz: 44,
    bzT: 44,
    czT: 44,
    lastBz: 44,
    hold: null,
    holds: { dame: null, valet: null },
    sendT: 0,
    pulseT: -1,
    lightT: 0,
    isl: 0,
    msgCd: 0,
    charge: 0,
    turnT: [0, 0, 0],
    lockT: [0, 0, 0],
    turning: -1,
    pulseClock: 0,
    pulseN: 0,
    solvedT: 0,
    cardT: 0,
    seenLanes: null,
  };
  const ringTargets = () => [D5.ringPos()];
  const ringLand = () => D5.P(-12, 0, 86);
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const kitWho = (c, kit) => c.pos(kit);

  const newRings = () => {
    const targets = [0, 1, 2].map(() => (Math.random() * 12) | 0);
    const steps = targets.map((t) => (t + 3 + ((Math.random() * 7) | 0)) % 12);
    return { steps, targets, locked: [false, false, false], dir: [1, 1, 1] };
  };

  const fx = (k, pos) => {
    const p = pos ? V3(...pos) : null;
    if (k === 'good') Sound.play('rune', true);
    if (k === 'bad') Sound.play('rune', false);
    if (k === 'bell') {
      Sound.play('chime');
      Sound.play('reveal');
    }
    if (k === 'thud') Sound.play('thud', p);
    if (k === 'lock') {
      Sound.play('chime');
      Sound.play('switch');
    }
    if (k === 'flip') {
      Sound.play('rumble', 1.4);
      Sound.play('dome');
      Cam.shake = Math.max(Cam.shake, 0.25);
    }
    if (p) Fx.burst(p, k === 'bad' ? '#ff3b55' : k === 'bell' ? '#7ce0ff' : '#ffcf8a', k === 'thud' ? 10 : 30, 3, 0.5, 0);
  };
  const both = (c, ev, pos, say) => {
    fx(ev, pos);
    c.send('d5fx', [ev, pos, say || null]);
    if (say) HUD.say(say, T.master, 2600);
  };

  // ---------- the turn ----------
  const startFlipLocal = (c, s0) => {
    local.flipT = 0;
    local.flipS0 = s0;
    D5.cubeOff();
    const q = D5.rel(Player.body.p);
    // everyone floats toward the axis: nothing turning can sweep through you there
    local.float = D5.inCube(q) ? { from: q.clone(), to: V3(q.x * 0.35, D5.PY - 1.0, q.z) } : null;
    fx('flip', null);
    HUD.say(TXT.flip, T.master, 1800);
    D5.crates.forEach((cr) => {
      cr.fall = false;
      cr.float0 = cr.g.position.y - D5.O.y - 0.5;
    });
  };
  const flipFrame = (c, dt) => {
    if (local.flipT < 0) return false;
    local.flipT += dt;
    const t = local.flipT;
    const s0 = local.flipS0;
    const k = ease(clamp((t - ROT0) / (ROT1 - ROT0), 0, 1));
    D5.setCubeAngle((s0 + k) * Math.PI);
    // crates rise to the axis height, then wait for the host to say where they land
    const lift = ease(clamp(t / 0.9, 0, 1));
    D5.crates.forEach((cr) => {
      if (!cr.g.visible || cr.held) return;
      cr.y = cr.float0 + (D5.PY - 0.5 - cr.float0) * lift;
      cr.g.position.y = D5.O.y + cr.y + 0.5;
      cr.g.rotation.z = Math.sin(t * 2) * 0.25 * (1 - k * 0);
      cr.g.rotation.x = Math.sin(t * 1.6 + 1) * 0.2;
    });
    if (t < ROT1) {
      if (local.float) {
        const b = Player.body;
        const f = local.float;
        const e = ease(clamp(t / 0.9, 0, 1));
        b.p.copy(D5.P(f.from.x + (f.to.x - f.from.x) * e, f.from.y + (f.to.y - f.from.y) * e + Math.sin(t * 2.2) * 0.15, f.from.z));
        b.v.set(0, 0, 0);
      }
      return true;
    }
    if (!local.landed) {
      local.landed = true;
      D5.setCubeState(1 - s0);
      D5.setCubeAngle((1 - s0) * Math.PI);
      D5.crates.forEach((cr) => {
        cr.g.rotation.set(0, 0, 0);
      });
      if (local.float) Player.body.v.set(0, -1, 0);
    }
    if (t > FLIP_T) {
      local.flipT = -1;
      local.landed = false;
      local.float = null;
    }
    return false;
  };

  // crate positions from the shared state, and the carried ones in front of their carrier
  const syncCrates = (c, x, first) => {
    x.r1.crates.forEach((cr, i) => {
      const o = D5.crates[i];
      o.held = !!cr[3];
      if (o.held) {
        o.b.on = false;
        return;
      }
      if (local.flipT >= 0 && x.r1.flip) return;
      const cur = o.g.position.y - D5.O.y - 0.5;
      if (!first && !o.fall && cur > cr[1] + 0.3 && !x.r1.flip) {
        // a crate let go after a turn: it falls from where it floated
        D5.setCrate(i, [cr[0], cur, cr[2]]);
        o.y = cur;
        o.vy = 0;
        o.ty = cr[1];
        o.fall = true;
        const b = o.b;
        b.min[1] = D5.O.y + cr[1];
        b.max[1] = D5.O.y + cr[1] + 1;
        b.on = true;
        return;
      }
      if (o.fall) return;
      D5.setCrate(i, [cr[0], cr[1], cr[2]]);
      o.y = cr[1];
    });
  };
  const carriedFrame = (c, x) => {
    x.r1.crates.forEach((cr, i) => {
      if (!cr[3]) return;
      const o = D5.crates[i];
      const who = cr[3];
      const p = who === c.role ? Player.body.p : Remote.pos;
      // the partner's heading, from how they move
      if (who !== c.role) {
        const lp = local.rLast || p.clone();
        const mv = Math.hypot(p.x - lp.x, p.z - lp.z);
        if (mv > 0.02) local.rYaw = Math.atan2(p.x - lp.x, p.z - lp.z);
        local.rLast = p.clone();
      }
      const yaw = who === c.role ? Player.yaw : local.rYaw || 0;
      o.g.visible = true;
      o.g.position.set(p.x + Math.sin(yaw) * 0.55, p.y + 1.3, p.z + Math.cos(yaw) * 0.55);
      o.g.rotation.set(0, yaw, 0);
      o.b.on = false;
    });
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TXT.r1[r]);
      D5.screen.show('♦ 5', TITLE, '#ff9a3a');
    }
    if (st === 2) {
      HUD.objective(TXT.r2[r]);
      HUD.say(TXT.rule2, T.master, 4200);
      D5.screen.show('Salle 2', 'Le rayon', '#7ce0ff');
      Sound.play('door');
    }
    if (st === 3) {
      HUD.objective(TXT.r3[r]);
      HUD.say(TXT.rule3, T.master, 4600);
      Sound.play('reveal');
    }
    if (st === 4) {
      HUD.objective(TXT.r4[r]);
      HUD.say(TXT.rule4, T.master, 4600);
      Sound.mood('tense');
      Sound.play('door');
    }
    if (st === 5) {
      HUD.objective(TXT.card);
      HUD.say(TXT.solved, T.master, 2800);
      HUD.visa('♦ 5 · ' + TITLE);
      Sound.mood('calm');
      Sound.play('reveal');
      Sound.play('heart');
    }
    if (prev && st > prev) {
      // whoever stayed behind joins at the new checkpoint
      const q = D5.rel(Player.body.p);
      const behind =
        (st === 2 && q.z < 33) || (st === 3 && q.z < 81) || (st === 4 && (q.z < 125 || q.y < 2)) || false;
      if (behind) c.spawn(D5.spawn(st, r), 0);
    }
  };

  const checkpoint = (c) => {
    const x = Story.S.x;
    const r = c.role;
    if (x.stage === 1) {
      // inside the room, on the current floor, by your lever
      return D5.P(r === 'dame' ? -5.5 : 5.5, 0.2, 7.5);
    }
    if (x.stage === 2) {
      if (r === 'dame' && x.r2.gates[1]) return D5.P(-13, 0, 68.5);
      if (r === 'dame' && x.r2.gates[0]) return D5.P(-13, 0, 58);
      // the rider comes back on the slab, wherever the beam left it
      if (r === 'valet' && local.bz > 45) return D5.P(0, 0.4, local.bz);
      return D5.spawn(2, r);
    }
    if (x.stage === 3) {
      const isl = [D5.P(0, 0, 85), D5.P(0, 0, 102.5), D5.P(0, 4, 120.5)];
      return isl[local.isl] || isl[0];
    }
    return D5.spawn(4, r);
  };

  Story.register('tr_d5', {
    init: () => ({
      stage: 1,
      r1: {
        s: 0,
        n: 0,
        flip: false,
        crates: [
          [-4, 0, 9.5, null],
          [3.5, 0, 12, null],
        ],
        seal: [0, 0],
        done: false,
      },
      r2: { grab: false, gates: [false, false] },
      r3: { stones: [0, 0, 0] },
      r4: newRings(),
    }),
    voice: () => 1,
    net: {
      d5fx: (c, d) => {
        fx(d[0], d[1]);
        if (d[2]) HUD.say(d[2], T.master, 2600);
      },
      d5a: (c, d) => {
        if (Net.isHost) return;
        local.bzT = d[0];
        local.czT = d[1];
        local.holds.dame = d[2];
        local.holds.valet = d[3];
        local.turning = d[4];
        local.charge = d[5];
      },
      d5p: (c, d) => {
        if (Net.isHost) return;
        local.pulseT = PULSE_WARN;
        local.warned = false;
      },
      d5bell: (c, d) => D5.built && D5.swingBell(d[0]),
      d5tick: () => D5.built && Sound.play('creak'),
      d5hit: (c, d) => {
        if (!D5.built || c.S.phase !== 'tr_d5') return;
        if (d[0] !== c.role) HUD.say(TXT.pulseHitMate, T.master, 2200);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      D5.build(c.role);
      const x = c.S.x;
      local.stage = 0;
      local.flipN = x.r1.n;
      local.flipT = -1;
      D5.setCubeState(x.r1.s);
      D5.setCubeAngle(x.r1.s * Math.PI);
      syncCrates(c, x, true);
      local.isl = 0;
      c.spawn(x.stage === 1 ? D5.spawn(1, c.role) : checkpoint(c), 0);
      Player.killY = D5.O.y - 16;
      Player.checkpoint = () => checkpoint(c);
      Player.targets = null;
      Player.grappleLand = null;
      City.mood({ dark: 0.5 });
      c.fog(0.006);
      Sound.mood('calm');
      HUD.visa('♦ 5 · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3600);
      HUD.say(TXT.hint[c.role], T.master, 4000);
      HUD.say(TXT.rule1, T.master, 5200);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      D5.hide();
    },
    apply(c) {
      if (!D5.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      // a new turn started on the host
      if (x.r1.n !== local.flipN) {
        local.flipN = x.r1.n;
        if (x.r1.flip) startFlipLocal(c, x.r1.s);
        else if (local.flipT < 0) {
          // missed the start of the turn: just take the new state
          D5.setCubeState(x.r1.s);
          D5.setCubeAngle(x.r1.s * Math.PI);
        }
      }
      syncCrates(c, x, false);
      if (local.grabWas != null && x.r2.grab !== local.grabWas) Sound.play(x.r2.grab ? 'grapple' : 'switch');
      local.grabWas = x.r2.grab;
      // a status line under the title: seals, then locked planets
      if (x.stage === 1) HUD.visa(`♦ 5 · Sceaux ${x.r1.seal.filter(Boolean).length} / 2`);
      else if (x.stage === 2) HUD.visa(`♦ 5 · Cloches ${x.r2.gates.filter(Boolean).length} / 2`);
      else if (x.stage === 4) HUD.visa(`♦ 5 · Planètes ${x.r4.locked.filter(Boolean).length} / 3`);
      else HUD.visa('♦ 5 · ' + TITLE);
      const seal = x.r1.seal.join('');
      if (local.sealWas != null && seal !== local.sealWas && x.r1.seal.some(Boolean)) Sound.play('chime');
      local.sealWas = seal;
      const lanes = [x.r3.stones[0] || x.r3.stones[1], x.r3.stones[1] || x.r3.stones[2]].map(Boolean).join('');
      if (local.seenLanes != null && lanes !== local.seenLanes) Sound.play(lanes.includes('true') ? 'portal' : 'switch');
      local.seenLanes = lanes;
    },
    host(c, dt) {
      if (!D5.built) return;
      const x = c.S.x;
      const qd = D5.rel(c.pos('dame'));
      const qv = D5.rel(c.pos('valet'));
      const H = local.holds;
      // ----- room 1 -----
      if (x.stage === 1) {
        const r1 = x.r1;
        const levers = [H.dame, H.valet].sort().join(',');
        const ready = !r1.flip && !r1.done && levers === 'lvL,lvR' && D5.inCube(qd) && D5.inCube(qv);
        local.charge = ready ? local.charge + dt : 0;
        if (local.charge >= HOLD_FLIP) {
          local.charge = 0;
          local.hostFlipT = 0;
          local.hostS0 = r1.s;
          c.set((s) => {
            s.x.r1.flip = true;
            s.x.r1.n += 1;
          });
          H.dame = H.valet = null;
        }
        if (r1.flip) {
          local.hostFlipT += dt;
          if (local.hostFlipT >= ROT1 + 0.05) {
            const ns = 1 - local.hostS0;
            D5.setCubeState(ns);
            D5.crates.forEach((o) => (o.b.on = false));
            const land = [];
            r1.crates.forEach((cr, i) => {
              let y = D5.groundIn(cr[0], cr[2], D5.PY - 0.5);
              // two crates in the same column stack
              if (i === 1 && Math.hypot(cr[0] - land[0][0], cr[2] - land[0][2]) < 1) y = Math.max(y, land[0][1] + 1);
              land.push([cr[0], Math.max(0, y), cr[2], null]);
            });
            const seal = D5.plates.map((p) =>
              ns === 1 && land.some((l) => Math.hypot(l[0] - p.x, l[2] - p.z) < 0.85 && Math.abs(l[1] - p.h) < 0.2) ? 1 : 0,
            );
            const done = seal[0] && seal[1];
            c.set((s) => {
              s.x.r1.s = ns;
              s.x.r1.flip = false;
              s.x.r1.crates = land;
              s.x.r1.seal = seal;
              if (done) s.x.r1.done = true;
            });
            if (done) both(c, 'good', D5.P(0, 1.5, 33).toArray(), TXT.sealsDone);
            else if (seal.some(Boolean)) both(c, 'good', null, TXT.seal);
            else if (ns === 1) both(c, 'bad', null, TXT.noSeal);
          }
        }
        if (r1.done && qd.z > 34.5 && qv.z > 34.5) c.set((s) => (s.x.stage = 2));
      }
      // ----- room 2 -----
      if (x.stage === 2) {
        const r2 = x.r2;
        if (r2.grab && !(qd.x < -10 && qd.z > 40 && qd.z < 71 && qd.y > -1 && qd.y < 3)) c.set((s) => (s.x.r2.grab = false));
        const lim = !r2.gates[0] ? 53 : !r2.gates[1] ? 63 : 69.5;
        const tgt = r2.grab ? clamp(qd.z, 44, lim) : local.cz;
        local.cz += clamp(tgt - local.cz, -5 * dt, 5 * dt);
        local.cz = Math.min(local.cz, lim);
        local.bz = 44 + ((local.cz - 44) * 36) / 25.5;
        [qd, qv].forEach((q) => {
          const i = D5.bellHit(q);
          if (i >= 0 && !r2.gates[i]) {
            c.set((s) => (s.x.r2.gates[i] = true));
            both(c, 'bell', D5.bells[i].c.clone().add(D5.O).toArray(), TXT.bell);
            c.send('d5bell', [i]);
            D5.swingBell(i);
          }
        });
        if (qd.z > 82 && qv.z > 82 && qd.y > -1 && qv.y > -1) c.set((s) => (s.x.stage = 3));
      }
      // ----- room 3 -----
      if (x.stage === 3) {
        const st = [0, 1, 2].map((i) => (D5.onStone(qd) === i || D5.onStone(qv) === i ? 1 : 0));
        if (st.join('') !== x.r3.stones.join('')) c.set((s) => (s.x.r3.stones = st));
        if (qd.z > 129.5 && qv.z > 129.5 && qd.y > 3 && qv.y > 3) c.set((s) => (s.x.stage = 4));
      }
      // ----- room 4 -----
      if (x.stage === 4) {
        const r4 = x.r4;
        local.turning = -1;
        for (let k = 0; k < 3; k++) {
          if (r4.locked[k]) continue;
          const crank = 'crank' + (k + 1);
          const clutch = 'clutch' + (k + 1);
          const ok = (H.dame === crank && H.valet === clutch) || (H.valet === crank && H.dame === clutch);
          if (ok) {
            local.turning = k;
            local.lockT[k] = 0;
            local.turnT[k] += dt;
            if (local.turnT[k] >= TURN_STEP) {
              local.turnT[k] = 0;
              c.set((s) => (s.x.r4.steps[k] = (s.x.r4.steps[k] + s.x.r4.dir[k] + 12) % 12));
              Sound.play('creak');
              c.send('d5tick', [k]);
            }
          } else {
            local.turnT[k] = Math.min(local.turnT[k], TURN_STEP * 0.6);
            if (r4.steps[k] === r4.targets[k]) {
              local.lockT[k] += dt;
              if (local.lockT[k] > 1.0) {
                local.lockT[k] = 0;
                c.set((s) => (s.x.r4.locked[k] = true));
                both(c, 'lock', null, TXT.locked);
              }
            } else local.lockT[k] = 0;
          }
        }
        if (r4.locked.every(Boolean)) {
          c.set((s) => (s.x.stage = 5));
        } else {
          local.pulseClock += dt;
          if (local.pulseClock > PULSE_EVERY) {
            local.pulseClock = 0;
            local.pulseT = PULSE_WARN;
            local.warned = false;
            c.send('d5p', [++local.pulseN]);
          }
        }
      }
      if (x.stage === 5) {
        if (D5.nearCard(qd) && D5.nearCard(qv) && local.cardT > 3.2) c.goto('reward', (s) => (s.x.card = 'd5'));
      }
      local.sendT += dt;
      if (local.sendT > 0.066) {
        local.sendT = 0;
        c.send('d5a', [+local.bz.toFixed(3), +local.cz.toFixed(3), H.dame, H.valet, local.turning, +local.charge.toFixed(2)]);
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'hold') {
        local.holds[who] = d.k || null;
        return;
      }
      if (x.stage === 1 && !x.r1.flip) {
        const cr = x.r1.crates;
        if (d.a === 'pick') {
          if (who !== 'valet' || cr.some((k) => k[3] === who) || cr[d.i][3]) return;
          c.set((s) => (s.x.r1.crates[d.i][3] = who));
          both(c, 'thud', [...cr[d.i]].slice(0, 3).map((v, k) => v + [D5.O.x, D5.O.y, D5.O.z][k]));
        }
        if (d.a === 'drop') {
          const i = cr.findIndex((k) => k[3] === who);
          if (i < 0) return;
          c.set((s) => (s.x.r1.crates[i] = [d.p[0], d.p[1], d.p[2], null]));
          both(c, 'thud', [d.p[0] + D5.O.x, d.p[1] + D5.O.y, d.p[2] + D5.O.z]);
        }
      }
      if (d.a === 'grab' && x.stage === 2 && who === 'dame') c.set((s) => (s.x.r2.grab = !s.x.r2.grab));
      if (d.a === 'dir' && x.stage === 4) c.set((s) => (s.x.r4.dir[d.k] = -s.x.r4.dir[d.k]));
      if (d.a === 'hit' && x.stage === 4) {
        c.set((s) => {
          for (let k = 0; k < 3; k++)
            if (!s.x.r4.locked[k]) s.x.r4.steps[k] = (s.x.r4.steps[k] + (Math.random() < 0.5 ? 1 : 11)) % 12;
        });
        c.send('d5hit', [who]);
      }
    },
    update(c, dt, t) {
      if (!D5.built) return null;
      const x = c.S.x;
      const r = c.role;
      const body = Player.body;
      if (window.__test) window.__d5 = local;
      if (Net.isHost) {
        local.bzT = local.bz;
        local.czT = local.cz;
      } else {
        local.bz = damp(local.bz, local.bzT, 12, dt);
        local.cz = damp(local.cz, local.czT, 12, dt);
      }
      // the grapple ring exists only in room 2
      Player.targets = x.stage === 2 ? ringTargets : null;
      Player.grappleLand = x.stage === 2 ? ringLand : null;
      const floating = flipFrame(c, dt);
      carriedFrame(c, x);
      // standing on the slab: ride it (it moved after this frame's physics)
      const dz = local.bz - local.lastBz;
      local.lastBz = local.bz;
      const q0 = D5.rel(body.p);
      if (x.stage === 2 && D5.onSlab(q0, local.bz - dz) && body.grounded) body.p.z += dz;

      const H = local.holds;
      const lvL = H.dame === 'lvL' || H.valet === 'lvL';
      const lvR = H.dame === 'lvR' || H.valet === 'lvR';
      if (x.stage >= 3 && local.cardOn == null) local.cardOn = false;
      if (x.stage === 5) {
        local.solvedT = Math.min(1, local.solvedT + dt / 3);
        local.cardT += dt;
      }
      D5.update(dt, t, x, {
        lvL,
        lvR,
        flipCharge: local.charge,
        seal: x.r1.seal,
        exitOpen: x.r1.done,
        blockZ: local.bz,
        carZ: local.cz,
        grab: x.r2.grab,
        lanes: [x.r3.stones[0] || x.r3.stones[1], x.r3.stones[1] || x.r3.stones[2]],
        stones: x.r3.stones,
        steps: x.r4.steps,
        targets: x.r4.targets,
        locked: x.r4.locked,
        holds: [H.dame, H.valet],
        turning: local.turning,
        pulse: local.pulseT >= 0 ? 1 - local.pulseT / PULSE_WARN : null,
        solved: x.stage === 5 ? local.solvedT : 0,
        cardOn: x.stage === 5 && local.cardT > 0.5,
        cardT: local.cardT,
      });

      const q = D5.rel(body.p);
      // my held station: sent to the host whenever it changes
      let want = null;
      const send = (k) => {
        if (k !== local.hold) {
          if (k) Sound.play('switch');
          local.hold = k;
          c.act({ a: 'hold', k });
          if (Net.isHost) local.holds[r] = k;
        }
      };
      if (floating) {
        send(null);
        return null;
      }

      // ----- room 1 -----
      if (x.stage === 1) {
        const cr = x.r1.crates;
        const mine = cr.findIndex((k) => k[3] === r);
        if (mine >= 0 && !body.grounded) Player.jumps = 2; // too heavy for a double jump
        const side = D5.nearLever(q);
        if (side && !x.r1.flip) {
          if (x.r1.done) {
            send(null);
            return ['E', 'La salle ne bougera plus'];
          }
          if (mine >= 0) {
            if (Input.pressed('interact')) HUD.say(TXT.putFirst, T.master, 1600);
            send(null);
            return ['E', 'Pose la caisse d’abord'];
          }
          const k = side < 0 ? 'lvL' : 'lvR';
          want = Input.held('interact') ? k : null;
          send(want);
          if (want) {
            const other = side < 0 ? lvR : lvL;
            return ['E', other ? 'Tenez… la salle va tourner' : 'Tiens le levier : il faut l’autre aussi', true];
          }
          return ['E', 'Tenir le levier (E maintenu)', true];
        }
        send(null);
        if (x.r1.flip) return null;
        if (mine >= 0) {
          // put it down in front of you, flat on the floor you stand on
          const fx_ = q.x + Math.sin(Player.yaw) * 1.0;
          const fz_ = q.z + Math.cos(Player.yaw) * 1.0;
          const px = clamp(fx_, -D5.CW + 0.6, D5.CW - 0.6);
          const pz = clamp(fz_, D5.CZ0 + 0.6, D5.CZ1 - 0.6);
          const gy = D5.groundIn(px, pz, q.y + 0.4);
          const flat = body.grounded && Math.abs(gy - q.y) < 0.3;
          if (Input.pressed('interact')) {
            if (flat) c.act({ a: 'drop', p: [+px.toFixed(2), +gy.toFixed(2), +pz.toFixed(2)] });
            else HUD.say(TXT.noStack, T.master, 1600);
          }
          return ['E', flat ? 'Poser la caisse' : 'Pas ici'];
        }
        const ci = [0, 1].find((i) => !cr[i][3] && D5.crateNear(q, i));
        if (ci != null) {
          if (r !== 'valet') {
            if (Input.pressed('interact')) HUD.say(TXT.tooHeavy, T.master, 1800);
            return ['E', 'Trop lourde'];
          }
          if (Input.pressed('interact')) c.act({ a: 'pick', i: ci });
          return ['E', 'Porter la caisse'];
        }
        // the Dame's readout of the seals
        local.msgCd -= dt;
        return null;
      }
      send(null);

      // ----- room 2 -----
      if (x.stage === 2) {
        if (D5.inBubble(q)) {
          // nearly weightless: gravity at a third, and a slow fall
          body.v.y += 26 * 0.7 * dt;
          if (body.v.y < -5) body.v.y = -5;
          local.bubbleT = (local.bubbleT || 0) + dt;
          if (local.bubbleT > 0.25 && !local.inBub) Sound.play('portal');
          local.inBub = true;
        } else {
          local.inBub = false;
          local.bubbleT = 0;
        }
        if (D5.nearCarriage(q, local.cz)) {
          if (r !== 'dame') {
            if (Input.pressed('interact')) HUD.say(TXT.beamOnly, T.master, 1800);
            return ['E', 'Rayon de gravité'];
          }
          if (Input.pressed('interact')) c.act({ a: 'grab' });
          return ['E', x.r2.grab ? 'Lâcher le rayon' : 'Prendre le rayon : la dalle te suit'];
        }
        if (r === 'dame' && q.x < -10 && q.z > 66 && x.r2.gates[1]) {
          local.msgCd -= dt;
          if (local.msgCd <= 0) {
            local.msgCd = 20;
            HUD.say(TXT.gap, T.master, 2600);
          }
        }
        return null;
      }

      // ----- room 3 -----
      if (x.stage === 3) {
        if (body.grounded) {
          const isl = D5.island(q);
          if (q.y > -0.5) local.isl = Math.max(local.isl, isl);
        }
        const L = D5.laneAt(q);
        const lanes = [x.r3.stones[0] || x.r3.stones[1], x.r3.stones[1] || x.r3.stones[2]];
        if (L && lanes[L.i]) {
          const l = D5.lanes[L.i];
          const sp = 9;
          body.v.set(l.d.x * sp - L.perp.x * 3, l.d.y * sp - L.perp.y * 3 + 26 * dt, l.d.z * sp - L.perp.z * 3);
          local.inLane = L.i;
        } else if (local.inLane != null && L && !lanes[L.i]) {
          HUD.say(TXT.streamOff, T.master, 1400);
          local.inLane = null;
        } else if (!L) local.inLane = null;
        const si = D5.onStone(q);
        if (si >= 0) return ['', 'Tu tiens la pierre : les courants coulent'];
        return null;
      }

      // ----- room 4 -----
      if (x.stage === 4 || x.stage === 5) {
        const heavy = false;
        if (D5.inLift(q) && !heavy) {
          // it slows down at each gallery, so stepping off there is easy; it hovers at the top
          const atG = (q.y > D5.G1 - 0.3 && q.y < D5.G1 + 1.7) || (q.y > D5.G2 - 0.3 && q.y < D5.G2 + 1.7);
          body.v.y = Math.min(body.v.y + 38 * dt, q.y > 11.5 ? 0.4 : atG ? 1.0 : 4.0);
          body.v.x *= 0.96;
          body.v.z *= 0.96;
        }
        if (local.lightT > 0) {
          local.lightT -= dt;
          body.v.y += 26 * 0.6 * dt;
        }
        // the pulse: a two-second warning, then whoever stands on the floor is thrown up
        if (local.pulseT >= 0) {
          const before = local.pulseT;
          local.pulseT -= dt;
          if (!local.warned) {
            local.warned = true;
            Sound.play('dome');
            HUD.say(TXT.pulseWarn, T.master, 1200);
          }
          if (local.pulseT < 0) {
            local.warned = false;
            local.pulseT = -1;
            Sound.play('launch');
            Cam.shake = Math.max(Cam.shake, 0.3);
            if (D5.inHall(q) && x.stage === 4) {
              if (body.grounded && !D5.inLift(q)) {
                body.v.y = 11;
                const dx = -q.x;
                const dzz = D5.OC - q.z;
                const dl = Math.hypot(dx, dzz) || 1;
                body.v.x += (dx / dl) * 2.5;
                body.v.z += (dzz / dl) * 2.5;
                local.lightT = 1.6;
                send(null);
                c.act({ a: 'hit' });
                HUD.say(TXT.pulseHit, T.master, 2400);
              } else HUD.say(TXT.dodge, T.master, 900);
            }
          }
        }
        if (x.stage === 5) return null;
        const st = D5.nearStation(q);
        if (st) {
          const k = +st.slice(-1) - 1;
          if (x.r4.locked[k]) {
            send(null);
            return ['', 'Planète verrouillée'];
          }
          want = Input.held('interact') ? st : null;
          send(want);
          const mate = c.other;
          const mateHold = H[mate];
          if (st.startsWith('crank')) {
            if (Input.pressed('ability')) c.act({ a: 'dir', k });
            const dir = x.r4.dir[k] > 0 ? '→' : '←';
            if (want && mateHold !== 'clutch' + (k + 1)) return ['E', Story.fmt(TXT.needClutch), true];
            return ['E', want ? `Ça tourne ${dir} · F : changer de sens` : `Tourner la manivelle ${dir} (E maintenu) · F : sens`, true];
          }
          return ['E', want ? 'Embrayage tenu' : 'Tenir l’embrayage (E maintenu)', true];
        }
        send(null);
        return null;
      }
      return null;
    },
  });
})();
