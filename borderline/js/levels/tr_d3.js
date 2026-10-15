(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d3');
  const T = CONFIG;
  const TITLE = 'Les Poids';
  const ME = 2; // what one astronaut weighs on the Veilleurs' scales
  const LIFT_K = 1.5; // metres of lift per unit of difference
  const CEIL_TIME = 240; // seconds before the gear ceiling reaches the bottom
  const CEIL_DROP = 16.5; // from 19 m to 2.5 m over the floor of the great hall
  const TXT = {
    intro: 'Épreuve de logique. L’observatoire des Poids : ici, tout se mesure. Même vous.',
    hint: {
      dame: 'Tes yeux lisent les chiffres gravés sur les poids. Ton grappin (F) fait descendre les petits poids des étagères.',
      valet: 'Tu portes les poids lourds, et ton double saut atteint les étagères. Les chiffres, seul{pe} {mate} les lit.',
    },
    r1: {
      dame: 'Salle 1 · Équilibrez les deux balances en même temps. Tu lis les poids : dis à {mate} lesquels porter, et où.',
      valet: 'Salle 1 · Équilibrez les deux balances en même temps. Tu ne lis pas les chiffres : demande à {mate}.',
    },
    rule1: 'Chaque balance a un contrepoids sous cloche, à gauche. Chargez le plateau de droite. Un astronaute dessus pèse 2.',
    yank: 'Vise un petit poids sur une étagère et appuie sur F : ton grappin le ramène.',
    tooHeavy: 'Trop lourd pour toi. {mate} peut le porter.',
    balanced: 'Les deux balances sont à l’équilibre. La porte se lève.',
    r2: {
      dame: 'Salle 2 · La poulie. Ce qui est lourd descend, ce qui est léger monte. Montez tous les deux jusqu’à la corniche.',
      valet: 'Salle 2 · La poulie. Ce qui est lourd descend, ce qui est léger monte. Montez tous les deux jusqu’à la corniche.',
    },
    rule2: 'Le frein (E sur le levier) bloque la poulie et ramène les plateaux à niveau. Les poids de fer pèsent 3.',
    brakeOn: 'Frein serré. Les plateaux reviennent à niveau.',
    brakeOff: 'Frein desserré. La poulie choisit le plus lourd.',
    pit: 'Le fond du puits. On remonte.',
    up: 'Vous êtes en haut tous les deux. La grande balance vous attend.',
    r3: {
      dame: 'Salle 3 · Neuf orbes, une seule est plus lourde. Trois pesées. Tu lis les numéros et tu tires le levier « Peser » ; {mate} porte les orbes.',
      valet: 'Salle 3 · Neuf orbes, une seule est plus lourde. Trois pesées. Tu portes les orbes ; seul{pe} {mate} lit les numéros et tire le levier « Peser ».',
    },
    rule3: 'Posez des orbes sur les plateaux, puis tirez le levier « Peser ». Après deux pesées au moins, l’orbe la plus lourde se pose sur le cœur.',
    orbHeavy: 'Les orbes sont trop lourdes pour toi. {mate} les porte.',
    weighMate: 'Le levier « Peser » ne répond qu’à {mate}.',
    weighFirst: 'Le cœur reste fermé : pesez au moins deux fois.',
    ceilStart: 'Le plafond se met en marche. Prenez votre temps… mais pas trop.',
    ceilWarn: {
      60: 'Plus qu’une minute. Les engrenages descendent.',
      30: 'Trente secondes.',
      10: 'Dix secondes !',
    },
    offPan: 'Descendez des plateaux avant de peser.',
    noWeigh: 'Plus de pesée. Il faut choisir.',
    resL: 'Le plateau de gauche est le plus lourd.',
    resR: 'Le plateau de droite est le plus lourd.',
    resEq: 'Équilibre parfait.',
    wrong: 'Ce n’était pas elle. Le plafond remonte, les orbes se mélangent.',
    late: 'Le plafond est en bas. On recommence, les orbes se mélangent.',
    win: 'La plus lourde. Le cœur s’allume.',
    card: 'La carte ' + CARD + ' est sur l’autel. Allez-y ensemble.',
  };
  CONFIG.cards.d3 = {
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'L’un lisait les chiffres, l’autre portait le poids.',
      'Aucune balance n’a jamais menti sur vous deux.',
      'Le Borderland commence à peser ses mots.',
    ],
  };
  const local = {
    stage: 0,
    yB: 0,
    yBt: 0,
    ceil: 19,
    ceilT: 19,
    tilt3: 0,
    tiltT: 0,
    weighs: 0,
    balT: 0,
    msgCd: 0,
    fly: {},
    yank: null,
    pitT: 0,
  };
  const shuffle = (a) => a.sort(() => Math.random() - 0.5);

  // every balanced layout: each block on {rack, A right, B right}, each astronaut on
  // {floor, A right, B right} (the left pans are sealed under glass with their counterweight)
  const solutions = (vals, fA, fB) => {
    const out = [];
    const n = vals.length;
    const total = Math.pow(3, n);
    for (let m = 0; m < total; m++) {
      let a = 0;
      let b = 0;
      let k = m;
      const asg = [];
      for (let i = 0; i < n; i++) {
        const s = k % 3;
        k = (k / 3) | 0;
        asg.push(s);
        if (s === 1) a += vals[i];
        if (s === 2) b += vals[i];
      }
      for (let p = 0; p < 9; p++) {
        const p1 = p % 3;
        const p2 = (p / 3) | 0;
        const wa = a + (p1 === 1 ? ME : 0) + (p2 === 1 ? ME : 0);
        const wb = b + (p1 === 2 ? ME : 0) + (p2 === 2 ? ME : 0);
        if (wa === fA && wb === fB) out.push({ asg, players: (p1 ? 1 : 0) + (p2 ? 1 : 0) });
      }
    }
    return out;
  };
  // a layout that needs both of you whatever way you solve it: at least one light weight (the
  // Dame's grapple or the Valet's jump), at least one heavy one (the Valet) and both astronauts
  // standing on the pans (so the Valet cannot balance it alone by watching the needles)
  const newPuzzle = () => {
    for (let tries = 0; tries < 2000; tries++) {
      const h = shuffle([3, 4, 5, 6, 7]).slice(0, 3);
      const l = shuffle([1, 1, 2]);
      const vals = [...h, ...l];
      const fA = 5 + ((Math.random() * 9) | 0);
      const fB = 5 + ((Math.random() * 10) | 0);
      const sols = solutions(vals, fA, fB);
      if (!sols.length || sols.length > 24) continue;
      if (!sols.every((so) => so.asg.slice(3).some(Boolean))) continue;
      if (!sols.every((so) => so.players === 2)) continue;
      if (!sols.every((so) => so.asg.slice(0, 3).some(Boolean))) continue;
      return {
        blocks: [
          ...h.map((v, i) => ({ kind: 'heavy', v, at: 'H' + i })),
          ...l.map((v, i) => ({ kind: 'light', v, at: 'L' + i })),
          { kind: 'heavy', v: 3, at: 'W0', open: true },
          { kind: 'heavy', v: 3, at: 'W1', open: true },
        ],
        fA,
        fB,
      };
    }
    // fallback (checked with solutions()): A 12, B 13, both astronauts on the pans
    return {
      blocks: [
        { kind: 'heavy', v: 5, at: 'H0' },
        { kind: 'heavy', v: 6, at: 'H1' },
        { kind: 'heavy', v: 7, at: 'H2' },
        { kind: 'light', v: 1, at: 'L0' },
        { kind: 'light', v: 2, at: 'L1' },
        { kind: 'light', v: 1, at: 'L2' },
        { kind: 'heavy', v: 3, at: 'W0', open: true },
        { kind: 'heavy', v: 3, at: 'W1', open: true },
      ],
      fA: 12,
      fB: 13,
    };
  };
  // the orbs stand on shuffled pedestals: orb n is rarely on pedestal n
  const newOrbs = () => ({
    orbs: shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    heavy: (Math.random() * 9) | 0,
    weighs: 0,
    res: 0,
    state: 'idle',
    t: 0,
  });

  const held = (x, who) => {
    const i = (x.blocks || []).findIndex((b) => b.at === 'carry:' + who);
    if (i >= 0) return { type: 'block', i };
    const o = ((x.r3 && x.r3.orbs) || []).findIndex((a) => a === 'carry:' + who);
    if (o >= 0) return { type: 'orb', i: o };
    return null;
  };

  // weights on the two room-1 scales, from the shared state + where each player stands
  const scaleWeights = (c, x) => {
    const w = { A: { L: x.fA, R: 0 }, B: { L: x.fB, R: 0 } };
    x.blocks.forEach((b) => {
      if (b.at.startsWith('pan:')) {
        const [, id, side] = b.at.split(':');
        w[id][side] += b.v;
      }
    });
    ['dame', 'valet'].forEach((who) => {
      const q = D3.rel(c.pos(who));
      ['A', 'B'].forEach((id) => {
        if (!D3.onPan(q, id, 'R')) return;
        w[id].R += ME;
        const h = held(x, who);
        if (h && h.type === 'block') w[id].R += x.blocks[h.i].v;
      });
    });
    return w;
  };
  const liftWeights = (c, x) => {
    const w = { A: 0, B: 0 };
    x.blocks.forEach((b) => {
      if (b.at === 'pA') w.A += b.v;
      if (b.at === 'pB') w.B += b.v;
    });
    ['dame', 'valet'].forEach((who) => {
      const q = D3.rel(c.pos(who));
      ['A', 'B'].forEach((id) => {
        if (!D3.onLift(q, id)) return;
        w[id] += ME;
        const h = held(x, who);
        if (h && h.type === 'block') w[id] += x.blocks[h.i].v;
      });
    });
    return w;
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TXT.r1[r]);
      D3.screen.show(CARD, TITLE, '#ff9a3a');
    }
    if (st === 2) {
      HUD.objective(TXT.r2[r]);
      HUD.say(TXT.balanced, T.master, 2400);
      HUD.say(TXT.rule2, T.master, 4200);
      D3.screen.show('Salle 2', 'La poulie', '#ffc23a');
      Sound.play('reveal');
      Sound.play('door');
    }
    if (st === 3) {
      HUD.objective(TXT.r3[r]);
      HUD.say(TXT.up, T.master, 2400);
      HUD.say(TXT.rule3, T.master, 4600);
      Sound.play('door');
      Sound.mood('tense');
    }
    if (st === 4) {
      HUD.objective(TXT.card);
      HUD.visa(CARD + ' · ' + TITLE);
      HUD.say(TXT.win, T.master, 2600);
      Sound.mood('calm');
      Sound.play('reveal');
    }
    if (prev && st > prev) {
      // whoever stayed behind a closed door joins at the new checkpoint
      const q = D3.rel(Player.body.p);
      const behind = (st === 2 && q.z < 46) || (st === 3 && (q.z < 65 || q.y < 4));
      if (behind) c.spawn(D3.spawn(st, r), 0);
    }
  };

  const fx = (k, pos) => {
    if (k === 'good') Sound.play('rune', true);
    if (k === 'bad') Sound.play('rune', false);
    if (k === 'clank') Sound.play('thud', pos ? V3(...pos) : null);
    if (k === 'slam') {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.35);
    }
    if (pos)
      Fx.burst(V3(...pos), k === 'bad' || k === 'slam' ? '#ff3b55' : '#ffcf8a', k === 'clank' ? 10 : 26, 3, 0.45, 0);
  };
  const both = (c, ev, a, b) => {
    fx(ev, a);
    c.send('d3fx', [ev, a]);
    if (b) {
      HUD.say(b, T.master, 2400);
      c.send('d3say', [b]);
    }
  };

  Story.register('tr_d3', {
    init: () => {
      const p = newPuzzle();
      return {
        stage: 1,
        blocks: p.blocks,
        fA: p.fA,
        fB: p.fB,
        open: {},
        r2: { brake: true },
        r3: newOrbs(),
        yank: -1,
      };
    },
    voice: () => 1,
    net: {
      d3fx: (c, d) => fx(d[0], d[1]),
      d3say: (c, d) => HUD.say(d[0], T.master, 2400),
      d3a: (c, d) => {
        if (Net.isHost) return;
        local.yBt = d[0];
        local.ceilT = d[1];
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      D3.build(c.role);
      D3.setWeights(c.S.x.blocks.map((b) => ({ ...b, at: b.at.startsWith('carry') ? 'H0' : b.at })));
      D3.blocks.forEach((ob, i) => {
        if (c.S.x.blocks[i].open)
          ob.g.traverse((o) => o.userData && o.userData.n != null && (o.userData.secret = false));
      });
      D3.setFixed(c.S.x.fA, c.S.x.fB);
      local.stage = 0;
      local.weighs = c.S.x.r3.weighs;
      c.spawn(D3.spawn(c.S.x.stage, c.role), 0);
      Player.killY = D3.O.y - 14;
      Player.checkpoint = () => D3.spawn(Story.S.x.stage, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.008);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3400);
      HUD.say(TXT.hint[c.role], T.master, 4000);
      HUD.say(TXT.rule1, T.master, 4200);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      D3.hide();
    },
    apply(c) {
      if (!D3.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      // a new weighing on the great balance: the beam tilts for a few seconds
      if (x.r3.weighs > local.weighs) {
        local.tilt3 = x.r3.res;
        local.tiltT = 10;
        Sound.play('thud');
        HUD.say(x.r3.res > 0 ? TXT.resR : x.r3.res < 0 ? TXT.resL : TXT.resEq, T.master, 3000);
      }
      local.weighs = x.r3.weighs;
      if (x.r2.brake !== local.brake) {
        if (local.brake != null) {
          Sound.play('switch');
          HUD.say(x.r2.brake ? TXT.brakeOn : TXT.brakeOff, T.master, 2000);
        }
        local.brake = x.r2.brake;
      }
    },
    host(c, dt) {
      if (!D3.built) return;
      const x = c.S.x;
      const qd = D3.rel(c.pos('dame'));
      const qv = D3.rel(c.pos('valet'));
      // the grapple pull ends after a short flight
      if (x.yank >= 0) {
        local.yankT = (local.yankT || 0) + dt;
        if (local.yankT > 0.7) {
          local.yankT = 0;
          c.set((s) => (s.x.yank = -1));
        }
      }
      if (x.stage === 1) {
        const w = scaleWeights(c, x);
        const ok = w.A.L === w.A.R && w.B.L === w.B.R;
        local.balT = ok ? local.balT + dt : 0;
        if (local.balT > 2) {
          local.balT = 0;
          c.set((s) => {
            s.x.open = { ...s.x.open, g1: true };
            s.x.stage = 2;
          });
        }
      }
      if (x.stage === 2) {
        const w = liftWeights(c, x);
        const target = x.r2.brake ? 0 : clamp((w.A - w.B) * LIFT_K, -6, 6);
        const sp = x.r2.brake ? 1.4 : 1.7;
        local.yB += clamp(target - local.yB, -sp * dt, sp * dt);
        const top = (q) => q.y > 5.5 && q.z > 65.4;
        if (top(qd) && top(qv)) {
          c.set((s) => {
            s.x.open = { ...s.x.open, g2: true };
            s.x.stage = 3;
          });
        }
      }
      if (x.stage === 3) {
        const r3 = x.r3;
        const inside = (q) => q.z > 80 && q.y > 5;
        if (r3.state === 'idle' && inside(qd) && inside(qv)) {
          local.ceilRun = 0;
          c.set((s) => (s.x.r3.state = 'run'));
          both(c, 'clank', D3.P(0, 20, 99).toArray(), TXT.ceilStart);
        }
        if (r3.state === 'run') {
          local.ceilRun = (local.ceilRun || 0) + dt;
          local.ceil = 19 - (local.ceilRun / CEIL_TIME) * CEIL_DROP;
          if (local.ceilRun > CEIL_TIME) this.fail(c, 'late');
        } else if (r3.state === 'fail') {
          local.ceil = Math.min(19, local.ceil + dt * 6);
          local.failT -= dt;
          if (local.failT <= 0)
            c.set((s) => {
              s.x.r3 = { ...newOrbs(), state: 'run' };
              local.ceilRun = 0;
            });
        }
      }
      if (x.stage === 4) {
        local.ceil = Math.min(19, local.ceil + dt * 4);
        if (D3.nearCard(qd) && D3.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'd3'));
      }
      local.sendT = (local.sendT || 0) + dt;
      if (local.sendT > 0.066) {
        local.sendT = 0;
        c.send('d3a', [+local.yB.toFixed(3), +local.ceil.toFixed(2)]);
      }
    },
    // what each screen hears from the machinery (computed locally from the synced state)
    sounds(x, anim, dt) {
      if (anim.bal1) {
        ['A', 'B'].forEach((id) => {
          const was = local.balWas && local.balWas[id];
          if (anim.bal1[id] && was === false) Sound.play('chime');
          const tl = anim.tilt1[id];
          if (local.tiltWas && Math.abs(tl - local.tiltWas[id]) > 0.05) Sound.play('creak');
        });
        local.balWas = { ...anim.bal1 };
        local.tiltWas = { ...anim.tilt1 };
      }
      // the pulley groans while it turns
      const v = Math.abs(local.yB - (local.yBprev != null ? local.yBprev : local.yB)) / Math.max(dt, 1e-3);
      local.yBprev = local.yB;
      local.creakT = (local.creakT || 0) - dt;
      if (v > 0.3 && local.creakT <= 0) {
        local.creakT = 0.45;
        Sound.play('creak');
        if (Math.random() < 0.3) Sound.play('lift');
      }
      // the gear ceiling rumbles harder as it comes down
      if (x.stage === 3 && x.r3.state === 'run') {
        local.rumT = (local.rumT || 0) - dt;
        if (local.rumT <= 0) {
          const k = clamp((19 - local.ceil) / CEIL_DROP, 0, 1);
          local.rumT = 1.6 - k * 1.1;
          Sound.play('rumble', 0.4 + k * 1.2);
        }
      }
    },
    fail(c, why) {
      local.failT = 3;
      c.set((s) => {
        s.x.r3.state = 'fail';
        // whatever was carried goes back to the table
        // loose orbs drop back on the free pedestals; newOrbs() reshuffles all once the ceiling is up
        const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((k) => !s.x.r3.orbs.includes(k));
        s.x.r3.orbs = s.x.r3.orbs.map((a) => (typeof a === 'number' ? a : free.shift()));
      });
      both(c, 'slam', D3.P(0, 9, 100).toArray(), why === 'late' ? TXT.late : TXT.wrong);
    },
    action(c, who, d) {
      const x = c.S.x;
      const h = held(x, who);
      if (d.a === 'pick' && x.stage <= 2 && !h) {
        const i = x.blocks.findIndex((b) => b.at === d.at);
        if (i < 0) return;
        if (x.blocks[i].kind === 'heavy' && who === 'dame') return;
        c.set((s) => (s.x.blocks[i].at = 'carry:' + who));
        both(c, 'clank', D3.blockPos(i).toArray());
      }
      if (d.a === 'yank' && x.stage === 1 && who === 'dame' && !h) {
        const b = x.blocks[d.i];
        if (!b || b.kind !== 'light' || !b.at.startsWith('L')) return;
        local.yankT = 0;
        c.set((s) => {
          s.x.blocks[d.i].at = 'carry:dame';
          s.x.yank = d.i;
        });
        Sound.play('grapple');
      }
      if (d.a === 'put' && h && h.type === 'block') {
        // onto a pan, a lift platform, or back home
        const to = d.to;
        c.set((s) => (s.x.blocks[h.i].at = to || homeOf(s.x.blocks[h.i], h.i)));
        both(c, 'clank', D3.blockPos(h.i).toArray());
      }
      if (d.a === 'take' && !h) {
        // the last weight put on that pan / platform
        let i = -1;
        x.blocks.forEach((b, k) => b.at === d.from && (i = k));
        if (i < 0) return;
        if (x.blocks[i].kind === 'heavy' && who === 'dame') return;
        c.set((s) => (s.x.blocks[i].at = 'carry:' + who));
      }
      if (d.a === 'brake' && x.stage === 2) c.set((s) => (s.x.r2.brake = !s.x.r2.brake));
      // room 3
      const r3 = x.r3;
      if (x.stage === 3 && r3.state !== 'fail') {
        // the orbs are the Valet's to carry, the weighing lever the Dame's to pull
        if (d.a === 'otake' && !h && who === 'valet') {
          const at = r3.orbs[d.i];
          if (at == null || (typeof at !== 'number' && at !== 'L' && at !== 'R')) return;
          c.set((s) => (s.x.r3.orbs[d.i] = 'carry:' + who));
        }
        if (d.a === 'oput' && h && h.type === 'orb') {
          if (d.to === 'S' && r3.orbs.includes(d.k)) return;
          c.set((s) => (s.x.r3.orbs[h.i] = d.to === 'S' ? d.k : d.to));
          Sound.play('tile');
        }
        if (d.a === 'weigh' && who === 'dame') {
          if (r3.weighs >= 3) {
            HUD.say(TXT.noWeigh, T.master, 2000);
            return c.send('d3say', [TXT.noWeigh]);
          }
          const qd = D3.rel(c.pos('dame'));
          const qv = D3.rel(c.pos('valet'));
          if (D3.onGreatPan(qd) || D3.onGreatPan(qv)) {
            HUD.say(TXT.offPan, T.master, 2000);
            return c.send('d3say', [TXT.offPan]);
          }
          let wl = 0;
          let wr = 0;
          r3.orbs.forEach((a, i) => {
            const w = i === r3.heavy ? 1.5 : 1;
            if (a === 'L') wl += w;
            if (a === 'R') wr += w;
          });
          c.set((s) => {
            s.x.r3.res = Math.sign(wr - wl);
            s.x.r3.weighs += 1;
          });
          if (r3.state === 'idle') c.set((s) => (s.x.r3.state = 'run'));
        }
        if (d.a === 'altar' && h && h.type === 'orb') {
          if (r3.weighs < 2) {
            const say = (w) => (w === c.role ? HUD.say(TXT.weighFirst, T.master, 2200) : c.send('d3say', [TXT.weighFirst]));
            return say(who);
          }
          if (h.i === r3.heavy) {
            c.set((s) => {
              s.x.r3.orbs[h.i] = 'A';
              s.x.r3.state = 'win';
              s.x.stage = 4;
            });
            both(c, 'good', D3.P(0, 8, 112).toArray());
          } else {
            c.set((s) => (s.x.r3.orbs[h.i] = 'A'));
            this.fail(c, 'wrong');
          }
        }
      }
    },
    update(c, dt, t) {
      if (!D3.built) return null;
      const x = c.S.x;
      const r = c.role;
      if (Net.isHost) {
        local.yBt = local.yB;
        local.ceilT = local.ceil;
      } else {
        local.yB = damp(local.yB, local.yBt, 12, dt);
        local.ceil = damp(local.ceil, local.ceilT, 8, dt);
      }
      local.tiltT = Math.max(0, local.tiltT - dt);
      // room-1 scales, computed on each screen from the shared state
      const anim = { yB: local.yB, ceil: local.ceil, tilt3: local.tiltT > 0 ? local.tilt3 * 1.1 : 0 };
      anim.weighing = local.tiltT > 0;
      anim.focus = local.focus;
      local.focus = -1;
      if (x.stage === 1 || x.stage === 2) {
        const w = scaleWeights(c, x);
        anim.tilt1 = {};
        anim.bal1 = {};
        ['A', 'B'].forEach((id) => {
          anim.tilt1[id] = clamp((w[id].R - w[id].L) * 0.09, -0.4, 0.4);
          anim.bal1[id] = w[id].L === w[id].R;
        });
        local.w1 = w;
      } else anim.tilt1 = { A: 0, B: 0 };
      anim.yank = x.yank >= 0 ? { i: x.yank } : null;
      const body = Player.body;
      const g = body.grounded && body.ground;
      const tag = g && g.tag;
      D3.update(dt, t, x, anim);
      this.sounds(x, anim, dt);
      // standing on a moving pan / platform: ride it (it moved after this frame's physics)
      if (tag && (tag.startsWith('pan') || tag.startsWith('lift'))) {
        if (body.p.y > g.max[1] - 0.2 && body.p.y < g.max[1] + 0.25) body.p.y = g.max[1];
      }

      const p = body.p;
      const q = D3.rel(p);
      const h = held(x, r);
      // room 2: the bottom of the shaft sends you back up
      if (x.stage === 2 && q.y < -3 && q.z > 56 && q.z < 66) {
        local.pitT += dt;
        if (local.pitT > 0.6) {
          local.pitT = 0;
          c.spawn(D3.spawn(2, r), 0);
          HUD.say(TXT.pit, T.master, 1800);
        }
      } else local.pitT = 0;

      if (x.stage === 1 || x.stage === 2) {
        // live readout: the Dame reads the numbers, the Valet only sees the needles
        if (x.stage === 1 && local.w1 && D3.inRoom1(q)) {
          const w = local.w1;
          local.objT = (local.objT || 0) - dt;
          if (local.objT <= 0) {
            local.objT = 0.25;
            HUD.objective(
              r === 'dame'
                ? `Balance A : ${w.A.L} à gauche · ${w.A.R} à droite. Balance B : ${w.B.L} à gauche · ${w.B.R} à droite.`
                : `Balance A ${w.A.L === w.A.R ? 'équilibrée' : 'penche'} · Balance B ${w.B.L === w.B.R ? 'équilibrée' : 'penche'}. Les chiffres, seul{pe} {mate} les lit.`,
            );
          }
        }
        if (h && h.type === 'block') {
          const pan = x.stage === 1 && D3.panAt(q);
          if (pan && pan.side === 'R') {
            if (Input.pressed('interact')) c.act({ a: 'put', to: `pan:${pan.id}:R` });
            return ['E', `Poser sur la balance ${pan.id}`];
          }
          const lf = x.stage === 2 && ['A', 'B'].find((id) => D3.nearLift(q, id));
          if (lf) {
            if (Input.pressed('interact')) c.act({ a: 'put', to: 'p' + lf });
            return ['E', 'Poser sur le plateau ' + lf];
          }
          if (Input.pressed('interact')) c.act({ a: 'put' });
          return ['E', 'Reposer le poids'];
        }
        if (!h) {
          // pick a weight from its rack / shelf
          const home = x.blocks.findIndex(
            (b) => !b.at.startsWith('carry') && D3.homes[b.at] && D3.nearHome(q, b.at, b.at[0] === 'L' ? 1.6 : 1.5),
          );
          if (home >= 0) {
            const b = x.blocks[home];
            if (b.kind === 'heavy' && r === 'dame') {
              if (Input.pressed('interact')) HUD.say(TXT.tooHeavy, T.master, 1800);
              return ['E', 'Trop lourd'];
            }
            if (Input.pressed('interact')) c.act({ a: 'pick', at: b.at });
            return ['E', 'Prendre le poids'];
          }
          // take back the last weight from a pan / platform
          const pan = x.stage === 1 && D3.panAt(q);
          const from = pan ? `pan:${pan.id}:${pan.side}` : x.stage === 2 && ['A', 'B'].find((id) => D3.nearLift(q, id));
          const key = pan ? from : from ? 'p' + from : null;
          if (key && x.blocks.some((b) => b.at === key)) {
            let last = -1;
            x.blocks.forEach((b, k) => b.at === key && (last = k));
            const heavy = x.blocks[last].kind === 'heavy';
            if (!(heavy && r === 'dame')) {
              if (Input.pressed('interact')) c.act({ a: 'take', from: key });
              return ['E', 'Reprendre un poids'];
            }
          }
          // the Dame's grapple pulls a light weight down from a shelf
          if (x.stage === 1 && r === 'dame') {
            const lights = x.blocks.map((b, i) => (b.kind === 'light' && b.at[0] === 'L' ? i : -1)).filter((i) => i >= 0);
            const aim = D3.aimedLight(lights, R.camera);
            if (aim >= 0) {
              if (Input.pressed('ability')) c.act({ a: 'yank', i: aim });
              return ['F', 'Grappin : ramener le petit poids'];
            }
            local.msgCd -= dt;
            if (local.msgCd <= 0 && q.z > 15 && lights.length === 3) {
              local.msgCd = 25;
              HUD.say(TXT.yank, T.master, 3000);
            }
          }
        }
        if (x.stage === 2) {
          const lv = ['bot', 'top'].find((k) => D3.nearLever(q, k));
          if (lv) {
            if (Input.pressed('interact')) c.act({ a: 'brake' });
            return ['E', x.r2.brake ? 'Desserrer le frein' : 'Serrer le frein'];
          }
        }
      }
      if (x.stage === 3) {
        const r3 = x.r3;
        if (r3.state === 'run' || r3.state === 'idle') {
          local.objT = (local.objT || 0) - dt;
          if (local.objT <= 0) {
            local.objT = 0.5;
            // the countdown lives in the visa line (the objective box animates on every change)
            const left = Math.max(0, CEIL_TIME - ((19 - local.ceil) / CEIL_DROP) * CEIL_TIME);
            const mm = Math.floor(left / 60);
            const ss = String(Math.floor(left % 60)).padStart(2, '0');
            HUD.visa(`${CARD} · Pesées ${r3.weighs} / 3 · Plafond ${mm}:${ss}`);
            // spoken warnings, once each, on both screens (each one computes its own)
            [60, 30, 10].forEach((k) => {
              if (r3.state === 'run' && left <= k && left > k - 2 && local.warned !== k) {
                local.warned = k;
                HUD.say(TXT.ceilWarn[k], T.master, 2400);
                Sound.play('slam');
                Cam.shake = Math.max(Cam.shake, 0.15);
              }
            });
            if (left > 62) local.warned = 0;
          }
        }
        if (h && h.type === 'orb') {
          const side = D3.greatPanAt(q);
          if (side) {
            if (Input.pressed('interact')) c.act({ a: 'oput', to: side });
            return ['E', 'Poser l’orbe à ' + (side === 'L' ? 'gauche' : 'droite')];
          }
          const s = D3.socketAt(q);
          if (s >= 0 && !r3.orbs.includes(s)) {
            if (Input.pressed('interact')) c.act({ a: 'oput', to: 'S', k: s });
            return ['E', 'Reposer l’orbe'];
          }
          if (D3.nearAltar(q)) {
            if (Input.pressed('interact')) c.act({ a: 'altar' });
            return ['E', 'Poser sur le cœur : c’est la plus lourde', true];
          }
          return null;
        }
        if (!h) {
          const free = (i) => {
            const at = r3.orbs[i];
            return typeof at === 'number' || at === 'L' || at === 'R';
          };
          const oi = D3.nearOrb(q, free);
          local.focus = oi;
          if (oi >= 0 && !D3.nearLever(q, 'weigh')) {
            if (r === 'dame') {
              if (Input.pressed('interact')) HUD.say(TXT.orbHeavy, T.master, 1800);
              return ['E', 'Orbe ' + (oi + 1) + ' · trop lourde'];
            }
            if (Input.pressed('interact')) c.act({ a: 'otake', i: oi });
            return ['E', 'Prendre cette orbe'];
          }
          if (D3.nearLever(q, 'weigh')) {
            if (r !== 'dame') {
              if (Input.pressed('interact')) HUD.say(TXT.weighMate, T.master, 1800);
              return ['E', 'Peser · pas ton levier'];
            }
            if (Input.pressed('interact')) c.act({ a: 'weigh' });
            return ['E', r3.weighs >= 3 ? 'Plus de pesée' : `Peser (${3 - r3.weighs} restante${r3.weighs < 2 ? 's' : ''})`];
          }
        }
      }
      return null;
    },
  });

  const homeOf = (b, i) => {
    if (b.open) return i === 6 ? 'W0' : 'W1';
    return b.kind === 'heavy' ? 'H' + (i % 3) : 'L' + ((i - 3) % 3);
  };
})();
