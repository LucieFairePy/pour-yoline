// ♣ 3 · La Bascule — everything tilts under your weight. The host simulates every moving
// surface (seesaws, the maze table and its marbles, the hanging bridges, the final dais) from
// both players' positions and streams the angles; each client rides them with one dynamic box
// kept under its own player at the exact surface height (no falling through a tilted plank).
(() => {
  const T = CONFIG;
  const W = TrC3;
  const TITLE = 'La Bascule';
  const TX = {
    intro: 'Épreuve d’équipe. Ici, tout penche sous votre poids. Vous ne tiendrez debout qu’ensemble.',
    s1: {
      valet:
        'La bascule penche du côté où vous êtes. Toi seul{e} peux porter la caisse (E) : pose-la au bout côté départ, l’autre bout se lèvera vers l’île.',
      dame: 'La bascule penche du côté où vous êtes. {mate} peut porter la caisse : un bon contrepoids au bout côté départ fera lever l’autre bout.',
    },
    s1b: 'Sur l’île, un levier bloque la bascule (E). Bloquez-la bien levée, et l’autre pourra monter.',
    heavy: 'Trop lourde pour toi. C’est {mate} qui porte.',
    s2: 'La catapulte. L’un se met au bout de la bascule côté falaise. L’autre monte au perchoir et saute sur l’autre bout.',
    s2dame: ' (Ton grappin atteint l’anneau au-dessus du perchoir.)',
    s2up: 'Tu es sur la falaise. Maintiens E au treuil : le monte-charge hissera {mate} jusqu’à toi.',
    s2wait: '{mate} est sur la falaise. Monte sur le monte-charge, contre la paroi, à droite du bout de la bascule.',
    s2lift: 'Tu montes. Reste sur le plateau.',
    launch: 'Catapulté{e} !',
    s3: 'La table penche avec vous. Guidez les billes dans leurs trous, dans l’ordre ♥ ♦ ♣. Les trous rouges les renvoient au départ.',
    s3look: 'Le belvédère, à droite en haut des marches, permet de tout voir : l’un guide, l’autre penche.',
    hole: 'Dans le mille.',
    trap: 'Piège. La bille repart du départ.',
    wrong: 'Mauvais trou : la bille repart du départ.',
    s3done: 'Les trois billes sont rentrées. La porte s’ouvre.',
    s4: 'L’orage. Les ponts penchent du côté où vous êtes : restez chacun d’un côté. Quand une rafale s’annonce, rapprochez-vous tous les deux du côté d’où vient le vent… sans aller jusqu’au bord.',
    gustPink: 'Rafale côté rose ! Tous les deux vers le rose, pas jusqu’au bord.',
    gustTeal: 'Rafale côté turquoise ! Tous les deux vers le turquoise, pas jusqu’au bord.',
    s5: 'La dernière tour. Chacun sur une moitié du cœur, et tenez l’équilibre malgré le vent.',
    s5hold: 'Ne bougez plus… encore un peu…',
    s6: 'La carte. Touchez-la ensemble.',
    win: 'Vous n’avez jamais penché du même côté sans le vouloir. La carte est à vous.',
  };
  CONFIG.cards.c3 = {
    corner: '3\n♣',
    big: '♣',
    title: TITLE,
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'Quand l’un penchait, l’autre faisait contrepoids.',
      'Personne ne tient seul en équilibre.',
      'Trois trèfles. Le Oui retrouve son aplomb.',
    ],
  };

  const H = { winch: { dame: 0, valet: 0 }, send: 0, gustT: 7, gust: 0, gustDir: 1, slam: 0, launchT: 0 };
  const sim = {
    tA: 0,
    vA: 0,
    tB: 0,
    vB: 0,
    tx: 0,
    tz: 0,
    roll: [0, 0, 0],
    vr: [0, 0, 0],
    dx: 0,
    dz: 0,
    mb: { x: 0, z: 0, vx: 0, vz: 0, on: false, wait: 1.2 },
    bal: 0,
    lift: 1,
  };
  const net = { lift: 1, tA: 0, tB: 0, tx: 0, tz: 0, roll: [0, 0, 0], dx: 0, dz: 0, mb: null, bal: 0 };
  const local = {
    stage: 0,
    patch: null,
    lastVy: 0,
    lastG: true,
    launched: false,
    winchOn: false,
    best: 0,
    gustT: 0,
    gustPhase: 0,
    gustDir: 1,
    said: {},
    mi: 0,
    exitSaid: false,
    holdSay: 0,
  };
  const say = (k, txt, hold = 3600) => {
    if (local.said[k]) return;
    local.said[k] = true;
    HUD.say(txt, T.master, hold);
  };

  // which moving surface is a (relative) point standing on, if any
  const surfAt = (q, list) => {
    for (const s of list) {
      if (!s.in(q)) continue;
      const h = s.h(q);
      if (q.y > h - 1.25 && q.y < h + 0.6) return s;
    }
    return null;
  };

  const spring = (a, v, eq, max, k, d, dt) => {
    v += ((eq - a) * k - v * d) * dt;
    a += v * dt;
    if (a > max) {
      a = max;
      if (v > 0) v = 0;
    }
    if (a < -max) {
      a = -max;
      if (v < 0) v = 0;
    }
    return [a, v];
  };

  // ---------- marble (host) ----------
  const resetMarble = () => {
    sim.mb.x = W.CHUTE[0];
    sim.mb.z = W.CHUTE[1];
    sim.mb.vx = 0;
    sim.mb.vz = 0;
    sim.mb.on = false;
    sim.mb.wait = 1.4;
  };
  const marbleStep = (c, dt) => {
    const x = c.S.x;
    const mb = sim.mb;
    if (x.mi >= 3) {
      mb.on = false;
      return;
    }
    if (!mb.on) {
      mb.wait -= dt;
      if (mb.wait <= 0) {
        mb.on = true;
        c.send('c3fx', ['drop']);
        Sound.play('tile', W.P(W.CHUTE[0], W.TBL.y, W.TBL.z + W.CHUTE[1]));
      }
      return;
    }
    const g = 9.8 * 1.5;
    const n = 4;
    const sdt = dt / n;
    for (let k = 0; k < n; k++) {
      mb.vx += -g * Math.sin(sim.tz) * sdt;
      mb.vz += -g * Math.sin(sim.tx) * sdt;
      const fr = Math.exp(-0.32 * sdt);
      mb.vx *= fr;
      mb.vz *= fr;
      const sp = Math.hypot(mb.vx, mb.vz);
      if (sp > 9) {
        mb.vx *= 9 / sp;
        mb.vz *= 9 / sp;
      }
      mb.x += mb.vx * sdt;
      mb.z += mb.vz * sdt;
      const r = 0.35;
      const lim = W.TBL.half - 0.15 - r;
      if (mb.x > lim) {
        mb.x = lim;
        mb.vx = -Math.abs(mb.vx) * 0.45;
      }
      if (mb.x < -lim) {
        mb.x = -lim;
        mb.vx = Math.abs(mb.vx) * 0.45;
      }
      if (mb.z > lim) {
        mb.z = lim;
        mb.vz = -Math.abs(mb.vz) * 0.45;
      }
      if (mb.z < -lim) {
        mb.z = -lim;
        mb.vz = Math.abs(mb.vz) * 0.45;
      }
      // circle vs wall boxes
      for (const [x0, z0, x1, z1] of W.WALLS) {
        const ax = Math.min(x0, x1) - W.WALL_T / 2;
        const bx = Math.max(x0, x1) + W.WALL_T / 2;
        const az = Math.min(z0, z1) - W.WALL_T / 2;
        const bz = Math.max(z0, z1) + W.WALL_T / 2;
        const cx = clamp(mb.x, ax, bx);
        const cz = clamp(mb.z, az, bz);
        const dx = mb.x - cx;
        const dz = mb.z - cz;
        const d = Math.hypot(dx, dz);
        if (d < r && d > 1e-5) {
          const nx = dx / d;
          const nz = dz / d;
          mb.x = cx + nx * r;
          mb.z = cz + nz * r;
          const vn = mb.vx * nx + mb.vz * nz;
          if (vn < 0) {
            mb.vx -= 1.5 * vn * nx;
            mb.vz -= 1.5 * vn * nz;
          }
        } else if (d <= 1e-5) {
          mb.z += mb.vz > 0 ? -r : r;
          mb.vz *= -0.4;
        }
      }
    }
    const sp = Math.hypot(mb.vx, mb.vz);
    // holes: the right one swallows the marble, a wrong (still open) one sends it back
    for (let j = 0; j < 3; j++) {
      if (j < x.mi) continue;
      const h = W.HOLES[j];
      if (Math.hypot(mb.x - h.x, mb.z - h.z) < 0.48 && sp < 7.5) {
        if (j === x.mi) {
          c.set((s) => (s.x.mi = s.x.mi + 1));
          c.send('c3fx', ['hole', j]);
          fxHole(j);
          resetMarble();
        } else {
          c.send('c3fx', ['wrong']);
          fxWrong();
          resetMarble();
        }
        return;
      }
    }
    for (const [tx, tz] of W.TRAPS)
      if (Math.hypot(mb.x - tx, mb.z - tz) < 0.42) {
        c.send('c3fx', ['trap']);
        fxTrap();
        resetMarble();
        return;
      }
  };
  const tablePos = (lx, lz) => W.P(lx, W.tableH(V3(lx, 0, W.TBL.z + lz)) + 0.4, W.TBL.z + lz);
  const fxHole = (j) => {
    const h = W.HOLES[j];
    Sound.play('chime');
    Fx.burst(tablePos(h.x, h.z), h.col, 120, 5, 1, 0);
    HUD.say(TX.hole, T.master, 1600);
  };
  const fxTrap = () => {
    Sound.play('trap');
    HUD.say(TX.trap, T.master, 1800);
  };
  const fxWrong = () => {
    Sound.play('trap');
    HUD.say(TX.wrong, T.master, 1800);
  };

  // ---------- gusts ----------
  const gustStart = (dir) => {
    local.gustDir = dir;
    local.gustPhase = 1;
    local.gustT = 0;
    Sound.play('rumble', 0.6);
    // dir +1 pushes toward +x (teal side): the wind comes from the pink side
    HUD.say(dir > 0 ? TX.gustPink : TX.gustTeal, T.master, 2400);
  };

  Story.register('tr_c3', {
    init: () => ({
      stage: 1,
      lock: false,
      crate: { st: 'ground', x: 3, y: 0, z: 5 },
      mi: 0,
      card: false,
    }),
    voice: () => 1,
    net: {
      c3s: (c, d) => {
        if (Net.isHost) return;
        net.tA = d[0];
        net.tB = d[1];
        net.tx = d[2];
        net.tz = d[3];
        net.roll = [d[4], d[5], d[6]];
        net.dx = d[7];
        net.dz = d[8];
        net.mb = d[11] ? { x: d[9], z: d[10], on: true, vx: d[12], vz: d[13] } : null;
        net.bal = d[14];
        net.lift = d[15];
      },
      c3g: (c, d) => !Net.isHost && gustStart(d[0]),
      c3l: (c, who) => {
        if (who === c.role) launchMe();
      },
      c3fx: (c, d) => {
        if (Net.isHost) return;
        if (d[0] === 'hole') fxHole(d[1]);
        if (d[0] === 'trap') fxTrap();
        if (d[0] === 'wrong') fxWrong();
        if (d[0] === 'drop') Sound.play('tile');
        if (d[0] === 'slam') slamFx();
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      local.stage = 0;
      local.said = {};
      local.best = 0;
      local.launched = false;
      local.mi = c.S.x.mi;
      if (!local.patch) local.patch = Phys.add([0, -999, 0], [0.1, -998.9, 0.1], { dyn: true });
      local.patch.on = true;
      resetMarble();
      c.spawn(W.spawn(c.S.x.stage, c.role), 0);
      Player.killY = W.O.y - 14;
      Player.checkpoint = () =>
        Story.S.x.stage === 4 ? W.tower(local.best, c.role) : W.spawn(Story.S.x.stage, c.role);
      Player.targets = () => (c.role === 'dame' && Story.S.x.stage === 2 ? [W.RING] : []);
      Player.grappleLand = () => W.RING_LAND;
      City.mood({});
      c.fog(0.005);
      Sound.mood('calm');
      HUD.visa('♣ 3 · ' + TITLE);
      W.screen.show('♣ 3', TITLE, '#4fd1b5');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 4200);
      this.apply(c);
    },
    exit() {
      W.hide();
      if (local.patch) {
        local.patch.on = false;
        local.patch.min[1] = -999;
        local.patch.max[1] = -998.9;
      }
      Player.targets = null;
      Player.grappleLand = null;
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      W.st.lock = x.lock;
      W.st.crate = x.crate;
      W.st.mi = x.mi;
      W.st.card = x.card;
      W.exitOpen(x.mi >= 3);
      if (x.mi !== local.mi) {
        local.mi = x.mi;
        if (x.mi >= 3) {
          Sound.play('reveal');
          HUD.say(TX.s3done, T.master, 2600);
        }
      }
      if (x.stage !== local.stage) {
        local.stage = x.stage;
        const r = c.role;
        if (x.stage === 1) HUD.objective(TX.s1[r]);
        if (x.stage === 2) {
          HUD.objective(TX.s2 + (r === 'dame' ? TX.s2dame : ''));
          Sound.play('reveal');
          W.screen.show('Catapulte', 'L’un saute, l’autre s’envole', '#ffcf8a');
        }
        if (x.stage === 3) {
          HUD.objective(TX.s3);
          Sound.play('reveal');
          W.screen.show('♥ ♦ ♣', 'La table', '#ff5f8a');
          setTimeout(() => HUD.say(TX.s3look, T.master, 4200), 3500);
        }
        if (x.stage === 4) {
          HUD.objective(TX.s4);
          Sound.mood('tense');
          Sound.play('rumble', 0.8);
          City.mood({ dark: 0.6 });
          c.fog(0.011);
        }
        if (x.stage === 5) {
          HUD.objective(TX.s5);
          Sound.play('reveal');
        }
        if (x.stage === 6) {
          HUD.objective(TX.s6);
          Sound.mood('calm');
          Sound.play('card');
          c.fog(0.006);
        }
      }
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const list = W.surfaces();
      const ps = ['dame', 'valet'].map((who) => ({ who, q: W.rel(c.pos(who)) }));
      ps.forEach((p) => (p.s = surfAt(p.q, list)));
      const on = (id) => ps.filter((p) => p.s && p.s.id === id);
      const both = (f) => ps.every((p) => f(p.q));

      // seesaw A (+ the crate as a heavy weight)
      let tq = on('A').reduce((a, p) => a + (p.q.z - W.A.z), 0);
      if (x.crate.st === 'plank') tq += (x.crate.z - W.A.z) * 2;
      if (!x.lock) [sim.tA, sim.vA] = spring(sim.tA, sim.vA, clamp(-tq * 0.06, -W.TMAX, W.TMAX), W.TMAX, 14, 5, dt);
      else sim.vA = 0;
      // seesaw B, slammed by a jump from the perch
      const tqB = on('B').reduce((a, p) => a + (p.q.z - W.B.z), 0);
      [sim.tB, sim.vB] = spring(sim.tB, sim.vB, clamp(-tqB * 0.06, -W.TMAX, W.TMAX), W.TMAX, 14, 5, dt);
      H.slam = Math.max(0, H.slam - dt);
      // the table
      const tbl = on('T');
      const sz = tbl.reduce((a, p) => a + (p.q.z - W.TBL.z), 0);
      const sx = tbl.reduce((a, p) => a + p.q.x, 0);
      // one player at the very edge only gets half the tilt: steering a marble takes both
      const k = W.TBL.max / (W.TBL.half * 2 * 0.85);
      const rate = 0.2 * dt;
      // once the three marbles are home (or outside the puzzle) the table settles flat
      const free = x.stage === 3 && x.mi < 3;
      sim.tx += clamp((free ? clamp(-sz * k, -W.TBL.max, W.TBL.max) : 0) - sim.tx, -rate, rate);
      sim.tz += clamp((free ? clamp(-sx * k, -W.TBL.max, W.TBL.max) : 0) - sim.tz, -rate, rate);
      if (x.stage === 3) marbleStep(c, dt);
      // the lift: up while someone holds the winch, slowly back down otherwise
      const pull = (H.winch.dame || H.winch.valet) && x.stage === 2;
      const top = W.LIFT.hi;
      const prevLift = sim.lift;
      sim.lift = clamp(sim.lift + (pull ? 1.5 : -0.9) * dt, W.LIFT.lo, top);
      if (pull && sim.lift >= top && prevLift < top) Sound.play('lift');
      // gusts (storm only)
      const storm = x.stage >= 4 && x.stage <= 5;
      if (storm) {
        H.gustT -= dt;
        if (H.gustT <= 0) {
          H.gustT = 7 + Math.random() * 3;
          const dir = Math.random() < 0.5 ? -1 : 1;
          c.send('c3g', [dir]);
          gustStart(dir);
        }
      }
      const blow = local.gustPhase === 2 ? local.gustDir : 0;
      // bridges
      for (let i = 0; i < 3; i++) {
        // weight near the towers barely twists the deck
        const sxi = on('R' + i).reduce((a, p) => a + p.q.x * p.s.w(p.q), 0);
        const eq = clamp(-sxi * 0.075 - blow * 0.24, -W.BR.max, W.BR.max);
        [sim.roll[i], sim.vr[i]] = spring(sim.roll[i], sim.vr[i], eq, W.BR.max, 9, 4, dt);
      }
      // the dais
      const dd = on('D');
      const dz = dd.reduce((a, p) => a + (p.q.z - W.DAIS.z), 0);
      const dxs = dd.reduce((a, p) => a + p.q.x, 0);
      sim.dx = damp(sim.dx, clamp(-dz * 0.04, -W.DAIS.max, W.DAIS.max), 3, dt);
      sim.dz = damp(sim.dz, clamp(-dxs * 0.04 - blow * 0.1, -W.DAIS.max, W.DAIS.max), 3, dt);
      if (x.stage === 5) {
        const pl = ps.map((p) => W.onPlate(p.q));
        const level = Math.abs(sim.dx) < 0.05 && Math.abs(sim.dz) < 0.05;
        const ok = pl[0] && pl[1] && pl[0] !== pl[1] && level;
        sim.bal = clamp(sim.bal + (ok ? dt / 4 : -dt / 5), 0, 1);
        if (sim.bal >= 1) c.set((s) => ((s.x.card = true), (s.x.stage = 6)));
      }

      // stages
      if (x.stage === 1 && both((q) => q.z > 26.6 && q.y > W.ISLE - 0.4)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && both((q) => q.z > 55.3 && q.y > W.CLIFF - 0.5)) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3 && x.mi >= 3 && both((q) => q.z > 96 && q.y > W.CLIFF - 0.5)) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4 && both((q) => q.z > 158.5 && q.y > W.BR.y - 0.5)) c.set((s) => (s.x.stage = 5));
      if (x.stage === 6 && both((q) => W.nearCard(q))) {
        H.win = (H.win || 0) + dt;
        if (H.win > 0.4) c.goto('reward', (s) => (s.x.card = 'c3'));
      }
      // a crate dropped into the void comes back to the start
      if (x.crate.st === 'ground' && x.crate.y < -6) c.set((s) => (s.x.crate = { st: 'ground', x: 3, y: 0, z: 5 }));

      // stream the angles
      H.send -= dt;
      if (H.send <= 0) {
        H.send = 1 / 15;
        const m = sim.mb;
        c.send('c3s', [
          +sim.tA.toFixed(4),
          +sim.tB.toFixed(4),
          +sim.tx.toFixed(4),
          +sim.tz.toFixed(4),
          +sim.roll[0].toFixed(4),
          +sim.roll[1].toFixed(4),
          +sim.roll[2].toFixed(4),
          +sim.dx.toFixed(4),
          +sim.dz.toFixed(4),
          +m.x.toFixed(3),
          +m.z.toFixed(3),
          m.on ? 1 : 0,
          +m.vx.toFixed(2),
          +m.vz.toFixed(2),
          +sim.bal.toFixed(3),
          +sim.lift.toFixed(3),
        ]);
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      const q = W.rel(c.pos(who));
      if (d.a === 'lever' && W.nearLever(q)) c.set((s) => (s.x.lock = !s.x.lock));
      if (d.a === 'take' && who === 'valet' && x.crate.st !== 'carry') c.set((s) => (s.x.crate = { st: 'carry' }));
      if (d.a === 'drop' && x.crate.st === 'carry') {
        const p = V3(d.x, d.y, d.z);
        const onA = Math.abs(p.x) <= W.PLANK_W / 2 && Math.abs(p.z - W.A.z) <= W.PLANK_L / 2;
        if (onA)
          c.set((s) => (s.x.crate = { st: 'plank', x: clamp(p.x, -1.1, 1.1), z: clamp(p.z, W.A.z - 6.4, W.A.z + 6.4) }));
        else {
          const g = Phys.groundAt(W.O.x + p.x, W.O.y + p.y + 0.5, W.O.z + p.z) - W.O.y;
          c.set((s) => (s.x.crate = { st: 'ground', x: p.x, y: g > -50 ? g : -10, z: p.z }));
        }
        Sound.play('thud');
      }
      if (d.a === 'winch') H.winch[who] = d.on && W.nearWinch(q) ? 1 : 0;
      if (d.a === 'slam') slamHost(c);
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const host = Net.isHost;
      // the angles: the host's own simulation, or the stream blended in
      const st = W.st;
      if (host) {
        st.tA = sim.tA;
        st.tB = sim.tB;
        st.tx = sim.tx;
        st.tz = sim.tz;
        st.roll = sim.roll.slice();
        st.dx = sim.dx;
        st.dz = sim.dz;
        st.bal = sim.bal;
        st.marbles = W.HOLES.map((h, i) =>
          i < x.mi ? { x: h.x, z: h.z, done: true } : i === x.mi && x.mi < 3 ? { ...sim.mb } : null,
        );
      } else {
        const k = 1 - Math.exp(-14 * dt);
        st.tA += (net.tA - st.tA) * k;
        st.tB += (net.tB - st.tB) * k;
        st.tx += (net.tx - st.tx) * k;
        st.tz += (net.tz - st.tz) * k;
        st.roll = st.roll.map((r, i) => r + (net.roll[i] - r) * k);
        st.dx += (net.dx - st.dx) * k;
        st.dz += (net.dz - st.dz) * k;
        st.bal += (net.bal - st.bal) * k;
        const cur = st.marbles[x.mi];
        st.marbles = W.HOLES.map((h, i) => {
          if (i < x.mi) return { x: h.x, z: h.z, done: true };
          if (i !== x.mi || !net.mb) return null;
          // extrapolate a little toward the streamed position for smooth rolling
          const prev = cur && !cur.done ? cur : { x: net.mb.x, z: net.mb.z };
          return {
            x: prev.x + (net.mb.x + net.mb.vx * 0.03 - prev.x) * k,
            z: prev.z + (net.mb.z + net.mb.vz * 0.03 - prev.z) * k,
            vx: net.mb.vx,
            vz: net.mb.vz,
            on: true,
          };
        });
      }
      st.storm = damp(st.storm, x.stage >= 4 && x.stage <= 5 ? 1 : 0, 0.8, dt);
      st.valetPos = c.pos('valet');
      st.lift = host ? sim.lift : st.lift + (net.lift - st.lift) * (1 - Math.exp(-14 * dt));
      // gust timeline (telegraph 2.2 s, blow 2 s)
      if (local.gustPhase) {
        local.gustT += dt;
        if (local.gustPhase === 1 && local.gustT > 2.2) {
          local.gustPhase = 2;
          local.gustT = 0;
          Sound.play('rumble', 1);
          Cam.shake = Math.max(Cam.shake, 0.15);
        } else if (local.gustPhase === 2 && local.gustT > 2.0) local.gustPhase = 0;
      }
      st.gust = local.gustPhase === 1 ? -1 : local.gustPhase === 2 ? 1 : 0;
      st.gustDir = local.gustDir;
      W.update(dt, t, x.stage);
      // creaks when a plank or a bridge swings hard (heard on both screens)
      local.creakT = (local.creakT || 0) - dt;
      const sw = Math.max(
        Math.abs(st.tA - (local.pA ?? st.tA)),
        Math.abs(st.tB - (local.pB ?? st.tB)),
        ...st.roll.map((r, i) => Math.abs(r - ((local.pR || [])[i] ?? r))),
      ) / Math.max(dt, 1e-3);
      local.pA = st.tA;
      local.pB = st.tB;
      local.pR = st.roll.slice();
      if (sw > 0.18 && local.creakT <= 0) {
        local.creakT = 1.1;
        Sound.play('creak');
      }

      // ---------- my body on the moving surfaces ----------
      const b = Player.body;
      const q = W.rel(b.p);
      const list = W.surfaces();
      let s = null;
      for (const sf of list) {
        if (!sf.in(q)) continue;
        const h = sf.h(q);
        if (q.y > h - 1.25) {
          s = sf;
          break;
        }
      }
      const pb = local.patch;
      if (s) {
        const h = s.h(q) + W.O.y;
        pb.min[0] = b.p.x - 0.7;
        pb.max[0] = b.p.x + 0.7;
        pb.min[2] = b.p.z - 0.7;
        pb.max[2] = b.p.z + 0.7;
        pb.max[1] = h;
        pb.min[1] = h - 0.5;
        // slide on steep slopes
        const onIt = b.grounded && Math.abs(b.p.y - h) < 0.15;
        const a = s.slope(q);
        if (onIt && s.axis === 'z' && Math.abs(a) > 0.25) {
          // slide toward the low end, but the bumpers stop you at the very end
          const piv = s.id === 'A' ? W.A : W.B;
          const toEnd = W.PLANK_L / 2 - Math.abs(q.z - piv.z);
          const down = -Math.sign(a);
          const goingOut = Math.sign(q.z - piv.z) === down;
          if (!(goingOut && toEnd < 1.2)) b.v.z += down * 26 * Math.abs(Math.sin(a)) * 0.6 * dt;
        }
        // seesaw B ends against the cliff face: never step into the gap
        if (s.id === 'B' && !local.launched && q.y < W.B.y + 2.5 && q.z > W.B.z + W.PLANK_L / 2 - 0.45) {
          b.p.z = Math.min(b.p.z, W.O.z + W.B.z + W.PLANK_L / 2 - 0.45);
          if (b.v.z > 0) b.v.z = 0;
        }
        if (onIt && s.axis === 'x' && Math.abs(a) > 0.2) b.v.x -= 26 * Math.sin(a) * 1.1 * dt;
      } else {
        pb.min[1] = -999;
        pb.max[1] = -998.9;
      }
      // gusts push everyone outdoors in the storm
      if (local.gustPhase === 2 && x.stage >= 4 && q.z > 98) b.v.x += local.gustDir * 13 * dt;
      // catapult: my landing on the raised near end of seesaw B
      if (b.grounded && !local.lastG && local.lastVy < -7.5 && s && s.id === 'B' && q.z < W.B.z - 1) {
        if (host) slamHost(c);
        else c.act({ a: 'slam' });
      }
      local.lastG = b.grounded;
      local.lastVy = b.v.y;
      // after a launch: once above the cliff top, carry forward onto it
      if (local.launched && q.y > W.CLIFF + 0.3 && b.v.y < 8) {
        b.v.z = Math.max(b.v.z, 5.5);
        if (q.z > 56.5 || b.grounded) local.launched = false;
      }
      // furthest tower reached = checkpoint in the storm
      if (x.stage === 4) {
        const tz = [101, 121.2, 141.2, 160];
        for (let i = local.best + 1; i < 4; i++) if (q.z > tz[i] - 2.5 && q.y > W.BR.y - 0.4 && b.grounded) local.best = i;
      }

      // ---------- prompts ----------
      const r = c.role;
      if (x.stage === 1 && (Math.abs(q.z - 27) < 2 || q.z > 26.6) && q.y > W.ISLE - 0.4) say('s1b', TX.s1b, 3800);
      const cr = x.crate;
      if (cr.st === 'carry' && r === 'valet') {
        if (Input.pressed('interact')) {
          const f = V3(Math.sin(Player.yaw) * 1.1, 0, Math.cos(Player.yaw) * 1.1);
          c.act({ a: 'drop', x: q.x + f.x, y: q.y, z: q.z + f.z });
        }
        return ['E', 'Poser la caisse'];
      }
      if (cr.st !== 'carry') {
        const cq =
          cr.st === 'plank'
            ? V3(cr.x, W.A.y + (cr.z - W.A.z) * Math.sin(st.tA), cr.z)
            : V3(cr.x, cr.y, cr.z);
        if (Math.hypot(q.x - cq.x, q.z - cq.z) < 1.7 && Math.abs(q.y - cq.y) < 1.6) {
          if (r === 'valet') {
            if (Input.pressed('interact')) c.act({ a: 'take' });
            return ['E', 'Porter la caisse'];
          }
          if (Input.pressed('interact')) HUD.say(TX.heavy, T.master, 2200);
          return ['E', 'Trop lourde'];
        }
      }
      if (W.nearLever(q)) {
        if (Input.pressed('interact')) {
          c.act({ a: 'lever' });
          Sound.play('switch');
        }
        return ['E', x.lock ? 'Débloquer la bascule' : 'Bloquer la bascule'];
      }
      if (x.stage === 2) {
        const meUp = q.z > 55.3 && q.y > W.CLIFF - 0.5;
        const mq = W.rel(c.pos(c.other));
        const mateUp = mq.z > 55.3 && mq.y > W.CLIFF - 0.5;
        if (meUp && !mateUp) HUD.objective(TX.s2up);
        else if (mateUp && !meUp) HUD.objective(TX.s2wait);
        if (!meUp && W.onLift(q) && st.lift > W.LIFT.lo + 0.3) say('lift', TX.s2lift, 2000);
        const wOn = meUp && W.nearWinch(q) && Input.held('interact');
        if (wOn !== local.winchOn) {
          local.winchOn = wOn;
          c.act({ a: 'winch', on: wOn ? 1 : 0 });
          if (wOn) Sound.play('switch');
        }
        if (meUp && W.nearWinch(q)) return ['E', 'Tourner le treuil (maintenir)', true];
      }
      if (x.stage === 5 && W.onPlate(q)) {
        if (W.st.bal > 0.35) {
          local.holdSay -= dt;
          if (local.holdSay <= 0) {
            local.holdSay = 9;
            HUD.say(TX.s5hold, T.master, 1800);
          }
        }
      }
      return null;
    },
  });

  // ---------- catapult ----------
  function slamFx() {
    Sound.play('slam');
    Cam.shake = Math.max(Cam.shake, 0.3);
    Fx.burst(W.P(0, W.B.y - 1.6, W.B.z - 6), '#ffcf8a', 60, 5, 0.6, -4);
  }
  function slamHost(c) {
    if (H.slam > 0) return;
    H.slam = 1.2;
    sim.vB = 4.2;
    c.send('c3fx', ['slam']);
    slamFx();
    // whoever stands on the far half flies up
    ['dame', 'valet'].forEach((who) => {
      const q = W.rel(c.pos(who));
      const onB = Math.abs(q.x) <= W.PLANK_W / 2 + 0.3 && q.z > W.B.z + 2 && q.z < W.B.z + 7.2 && q.y < W.B.y + 1.5;
      if (!onB) return;
      if (who === c.role) launchMe();
      else c.send('c3l', who);
    });
  }
  function launchMe() {
    const b = Player.body;
    b.v.y = 23;
    b.v.z = 0.6;
    b.grounded = false;
    Player.jumps = 1;
    local.launched = true;
    Sound.play('launch');
    HUD.say(TX.launch, T.master, 1400);
  }
})();
