(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d1');
  const T = CONFIG;
  const TITLE = 'Les Interrupteurs';
  const TXT = {
    intro: 'Épreuve de logique. L’atelier d’horlogerie des Veilleurs : rien ne bouge si vous ne vous parlez pas.',
    hint: {
      dame: 'Tes yeux voient ce que {mate} ne voit pas. Ton grappin (F) atteint ce qui est trop haut.',
      valet: 'Ton double saut atteint les corniches. Tu portes ce que {mate} ne peut pas porter.',
    },
    r1: {
      dame: 'Salle 1 · Prends la porte ♥. Tes dalles allument le tableau de {mate}, pas le tien. Dis-{lui} ce que tu vois sur ton tableau.',
      valet: 'Salle 1 · Prends la porte ♠. Tes dalles allument le tableau de {mate}, pas le tien. Dis-{lui} ce que tu vois sur ton tableau.',
    },
    r1rule: 'Une dalle change sa lampe et ses voisines, sur le tableau de l’autre. Allumez les neuf lampes des deux tableaux.',
    r1solved: { L: 'Le tableau ♥ est entièrement allumé.', R: 'Le tableau ♠ est entièrement allumé.' },
    r2: {
      dame: 'Salle 2 · Le code est gravé au sol, mais il ne se lit que d’en haut. Grappin sur l’anneau (F), puis guide {mate}.',
      valet: 'Salle 2 · Les cristaux sont sur les corniches : double saut, prends-en un (E), pose-le sur un socle. {mate} connaît l’ordre.',
    },
    r2wrong: 'Mauvaise couleur. Les cristaux retournent sur leurs corniches, et le code gravé change.',
    r2good: 'Le socle s’allume.',
    r3: {
      dame: 'Salle 3 · Monte sur une de tes plateformes (grappin). Tes leviers : ♥ et ♦. Seul{pe} {mate} voit l’ordre sur l’horloge.',
      valet: 'Salle 3 · Monte sur une de tes plateformes (double saut). Tes leviers : ♠ et ♣. Toi seul{e} lis l’ordre sur l’horloge : dicte-le.',
    },
    r3start: 'L’horloge démarre. Un symbole à la fois, avant que l’aiguille fasse le tour.',
    r3seen: 'Le Gardien t’a vu. Il remonte l’horloge.',
    r3seenMate: 'Le Gardien a vu {mate}. Il remonte l’horloge.',
    r3wrong: 'Mauvais levier. Le Gardien remonte l’horloge.',
    r3late: 'Trop tard. L’aiguille a fait le tour.',
    r3round: ['Premier tour : trois symboles.', 'Deuxième tour : encore trois symboles.', 'Dernier tour : quatre symboles.'],
    r3floor: 'Au sol, la lumière du Gardien vous voit. Sur les plateformes, vous êtes à l’abri.',
    r3win: 'L’horloge s’arrête. Le cœur s’ouvre.',
    card: 'La carte ' + CARD + ' est apparue au pied de l’horloge. Allez-y ensemble.',
  };
  CONFIG.cards.d1 = {
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'Chacun voyait le tableau de l’autre.',
      'Vous avez allumé ce que vous ne pouviez pas voir.',
      'Le Borderland aime quand vous vous parlez.',
    ],
  };
  const NAMES = { rouge: 'rouge', bleu: 'bleu', or: 'or', vert: 'vert', blanc: 'blanc' };
  const ROUNDS = [3, 3, 4];
  const STEP = [15, 13, 12];
  const SIDE_OF = { L: 'dame', R: 'valet' };
  // per-run state, rebuilt on every enter()
  const fresh = () => ({ stage: 0, gAng: 0, gTarget: 0, slam: 0, hand: 0, gT: 0, pulled: {}, msgCd: 0 });
  const local = fresh();

  const neighbors = (i) => {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const out = [i];
    if (r > 0) out.push(i - 3);
    if (r < 2) out.push(i + 3);
    if (c > 0) out.push(i - 1);
    if (c < 2) out.push(i + 1);
    return out;
  };
  // a scrambled board that is always solvable: press a few random tiles on a lit board
  const scramble = (n) => {
    let g;
    do {
      g = Array(9).fill(1);
      const used = new Set();
      while (used.size < n) used.add((Math.random() * 9) | 0);
      used.forEach((i) => neighbors(i).forEach((k) => (g[k] = g[k] ? 0 : 1)));
    } while (g.every(Boolean));
    return g;
  };
  const newSeq = (n) => {
    const out = [];
    while (out.length < n) {
      const k = ['h', 'd', 's', 'c'][(Math.random() * 4) | 0];
      if (k !== out[out.length - 1]) out.push(k);
    }
    return out;
  };
  const pickCode = () => {
    const cols = Object.keys(D1.COLORS).sort(() => Math.random() - 0.5);
    return { h: cols[0], c: cols[1], s: cols[2] };
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TXT.r1[r]);
      D1.screen.show(CARD, TITLE, '#ff9a3a');
    }
    if (st === 2) {
      HUD.objective(TXT.r2[r]);
      D1.screen.show('Salle 2', 'Les couleurs', '#ffc23a');
      Sound.play('reveal');
    }
    if (st === 3) {
      HUD.objective(TXT.r3[r]);
      Sound.play('reveal');
      Sound.mood('tense');
    }
    if (st === 4) {
      HUD.objective(TXT.card);
      HUD.say(TXT.r3win, T.master, 2600);
      Sound.mood('calm');
      Sound.play('reveal');
    }
    if (prev && st > prev) {
      // whoever is left behind a closed door joins at the checkpoint
      const q = D1.rel(Player.body.p);
      const behind = (st === 2 && q.z < 38) || (st === 3 && q.z < 78);
      if (behind) c.spawn(D1.spawn(st, r), 0);
    }
  };

  const fx = (k, pos) => {
    if (k === 'good') Sound.play('rune', true);
    if (k === 'bad') Sound.play('rune', false);
    if (k === 'slam') {
      Sound.play('slam');
      Cam.shake = Math.max(Cam.shake, 0.35);
    }
    if (pos) Fx.burst(V3(...pos), k === 'bad' || k === 'slam' ? '#ff3b55' : '#ffcf8a', 30, 4, 0.5, 0);
  };

  Story.register('tr_d1', {
    init: () => ({
      stage: 1,
      grid: { L: scramble(3), R: scramble(3) },
      open: {},
      code: pickCode(),
      crys: {},
      carrier: null,
      pulled: {},
      r3: 'idle',
      round: 0,
      seq: [],
      prog: 0,
    }),
    voice: () => 1,
    net: {
      d1g: (c, d) => {
        if (Net.isHost) return;
        local.gTarget = d[0];
        local.slam = d[1];
        local.hand = d[2];
      },
      d1fx: (c, d) => fx(d[0], d[1]),
      d1tile: (c, d) => {
        const tl = D1.tiles.find((t) => t.side === d[0] && t.i === d[1]);
        if (tl) {
          tl.press = 1;
          Sound.play('switch');
        }
      },
      d1say: (c, d) => HUD.say(d[0], T.master, 2400),
    },
    async enter(c, first) {
      for (const k in local) delete local[k];
      Object.assign(local, fresh());
      // levers already down when we arrive are not news
      local.pulled = { ...(c.S.x.pulled || {}) };
      if (!first) await fadeTo(true);
      D1.build();
      c.spawn(D1.spawn(c.S.x.stage, c.role), 0);
      Player.killY = D1.O.y - 20;
      Player.checkpoint = () => D1.spawn(Story.S.x.stage, c.role);
      Player.targets = () => {
        if (c.role !== 'dame') return [];
        const st = Story.S.x.stage;
        if (st === 2) return [D1.rings.r2.pos];
        if (st === 3) return [D1.rings.r3h.pos, D1.rings.r3d.pos];
        return [];
      };
      Player.grappleLand = () => D1.platformUnder(Player.body.p);
      City.mood({});
      c.fog(0.01);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3400);
      HUD.say(TXT.hint[c.role], T.master, 3800);
      HUD.say(TXT.r1rule, T.master, 4200);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      D1.hide();
    },
    apply(c) {
      if (!D1.built) return;
      const x = c.S.x;
      // every lamp that flips sparks and clicks, for whoever stands in front of that board
      ['L', 'R'].forEach((side) => {
        const now = (x.grid && x.grid[side]) || [];
        const was = local.grid && local.grid[side];
        if (was && x.stage === 1)
          now.forEach((v, i) => {
            if (v !== was[i]) {
              const p = D1.lampPos(side, i);
              Fx.burst(p, v ? '#ffcf8a' : '#6a5070', v ? 14 : 6, 2.2, 0.4, 0);
              Sound.play('tile');
            }
          });
      });
      local.grid = x.grid && { L: x.grid.L.slice(), R: x.grid.R.slice() };
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      Object.entries(x.pulled || {}).forEach(([k, v]) => {
        if (local.pulled[k] !== v) {
          local.pulled[k] = v;
          D1.switches[k].seenAt = Game.clock.t;
          Sound.play('switch');
        }
      });
    },
    host(c, dt) {
      if (!D1.built) return;
      const x = c.S.x;
      const qd = D1.rel(c.pos('dame'));
      const qv = D1.rel(c.pos('valet'));
      // room 1 → 2: both boards lit
      if (x.stage === 1 && x.grid.L.every(Boolean) && x.grid.R.every(Boolean)) {
        local.gT += dt;
        if (local.gT > 1.2)
          c.set((s) => {
            s.x.open = { g1L: true, g1R: true };
            s.x.stage = 2;
          });
      } else if (x.stage === 1) local.gT = 0;
      // room 2: after a wrong crystal, every crystal flies back to its ledge and the engraved code
      // is drawn again (no guessing your way through without the one who reads it)
      if (x.stage === 2 && local.back) {
        local.back.t -= dt;
        if (local.back.t <= 0) {
          local.back = null;
          c.set((s) => {
            s.x.crys = {};
            s.x.carrier = null;
            s.x.code = pickCode();
          });
        }
      }
      // room 3: the clock and its guardian
      if (x.stage === 3) {
        const onPlat = (q) => q.y > 2.2 && q.z > 80;
        const speed = x.r3 === 'run' ? 0.62 + x.round * 0.12 : 0.3;
        local.gAng = (local.gAng + dt * speed) % (Math.PI * 2);
        local.slam = Math.max(0, local.slam - dt);
        if (x.r3 === 'idle' && onPlat(qd) && onPlat(qv)) {
          local.pause = (local.pause || 0) + dt;
          if (local.pause > 1.5) {
            local.pause = 0;
            local.stepT = 0;
            c.set((s) => {
              s.x.r3 = 'run';
              s.x.seq = newSeq(ROUNDS[s.x.round]);
              s.x.prog = 0;
            });
            c.send('d1say', [TXT.r3round[x.round]]);
            HUD.say(TXT.r3round[x.round], T.master, 2400);
          }
        }
        if (x.r3 === 'run') {
          local.stepT = (local.stepT || 0) + dt;
          local.hand = Math.min(1, local.stepT / STEP[x.round]);
          const seenD = D1.inBeam(qd, local.gAng);
          const seenV = D1.inBeam(qv, local.gAng);
          if (seenD || seenV) this.fail(c, 'seen', seenD ? 'dame' : 'valet');
          else if (local.stepT > STEP[x.round]) this.fail(c, 'late');
        } else local.hand = damp(local.hand, 0, 3, dt);
        if (x.r3 === 'fail') {
          local.failT -= dt;
          if (local.failT <= 0) c.set((s) => (s.x.r3 = 'idle'));
        }
        if (x.r3 === 'pause') {
          local.failT -= dt;
          if (local.failT <= 0) c.set((s) => (s.x.r3 = 'idle'));
        }
        local.sendT = (local.sendT || 0) + dt;
        if (local.sendT > 0.066) {
          local.sendT = 0;
          c.send('d1g', [+local.gAng.toFixed(3), +local.slam.toFixed(2), +local.hand.toFixed(3)]);
        }
      }
      if (x.stage === 4 && D1.nearCard(qd) && D1.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'd1'));
    },
    fail(c, why, who) {
      local.slam = 1.6;
      local.failT = 2.6;
      local.stepT = 0;
      c.set((s) => {
        s.x.r3 = 'fail';
        s.x.prog = 0;
      });
      const pos = D1.P(0, 3, 99).toArray();
      c.send('d1fx', ['slam', pos]);
      fx('slam', pos);
      if (why === 'seen') {
        // each screen names who was seen
        const mine = who === c.role;
        HUD.say(mine ? TXT.r3seen : TXT.r3seenMate, T.master, 2400);
        // HUD.say fills {mate} with each player's own partner
        c.send('d1say', [mine ? TXT.r3seenMate : TXT.r3seen]);
      } else {
        const t = why === 'late' ? TXT.r3late : TXT.r3wrong;
        HUD.say(t, T.master, 2400);
        c.send('d1say', [t]);
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'tile' && x.stage === 1) {
        // each half's tiles answer only to the one who took its door (♥ Dame, ♠ Valet)
        if (who !== SIDE_OF[d.side]) return;
        // a tile in one half flips the OTHER half's board, unless that board is already lit
        const target = d.side === 'L' ? 'R' : 'L';
        if (x.grid[target].every(Boolean)) return;
        c.send('d1tile', [d.side, d.i]);
        const tl = D1.tiles.find((t) => t.side === d.side && t.i === d.i);
        if (tl && who !== c.role) {
          tl.press = 1;
          Sound.play('switch');
        }
        c.set((s) => {
          neighbors(d.i).forEach((k) => (s.x.grid[target][k] = s.x.grid[target][k] ? 0 : 1));
        });
        if (Story.S.x.grid[target].every(Boolean)) {
          const msg = TXT.r1solved[target];
          HUD.say(msg, T.master, 2200);
          c.send('d1say', [msg]);
          const pos = D1.P(target === 'L' ? -13 : 13, 5, 24).toArray();
          fx('good', pos);
          c.send('d1fx', ['good', pos]);
        }
      }
      // only the Valet carries the crystals: the Dame reads the code from the gallery
      if (d.a === 'pick' && x.stage === 2 && !x.carrier && who === 'valet') {
        const col = Object.keys(D1.COLORS).find((cc) => {
          const w = x.crys[cc] || 'l' + D1.crystals[cc].ledge;
          return w === d.where;
        });
        if (!col || local.back) return;
        c.set((s) => {
          s.x.crys[col] = 'carried';
          s.x.carrier = who;
        });
      }
      if (d.a === 'place' && x.stage === 2 && x.carrier === who) {
        const col = Object.keys(x.crys).find((cc) => x.crys[cc] === 'carried');
        if (!col) return;
        const occupied = Object.keys(x.crys).find((cc) => x.crys[cc] === 'p' + d.ped);
        c.set((s) => {
          if (occupied) delete s.x.crys[occupied];
          s.x.crys[col] = 'p' + d.ped;
          s.x.carrier = null;
        });
        const pos = D1.pedestals[d.ped].pos.clone().add(V3(0, 0.8, 0)).toArray();
        if (x.code[d.ped] === col) {
          fx('good', pos);
          c.send('d1fx', ['good', pos]);
          const all = ['h', 'c', 's'].every((k) => Story.S.x.crys[Story.S.x.code[k]] === 'p' + k);
          if (all)
            setTimeout(
              () =>
                Story.S.phase === 'tr_d1' &&
                c.set((s) => {
                  s.x.open = { ...s.x.open, g2: true };
                  s.x.stage = 3;
                }),
              1500,
            );
        } else {
          fx('bad', pos);
          c.send('d1fx', ['bad', pos]);
          HUD.say(TXT.r2wrong, T.master, 2000);
          c.send('d1say', [TXT.r2wrong]);
          local.back = { t: 1.3 };
        }
      }
      // each lever answers only to the one whose platform it stands on (♥ ♦ Dame, ♠ ♣ Valet)
      if (d.a === 'pull' && x.stage === 3 && D1.switches[d.k] && D1.switches[d.k].who === who) {
        const n = ((x.pulled && x.pulled[d.k]) || 0) + 1;
        c.set((s) => (s.x.pulled = { ...s.x.pulled, [d.k]: n }));
        if (x.r3 !== 'run') return;
        const pos = D1.switches[d.k].pos.clone().add(V3(0, 1.5, 0)).toArray();
        if (x.seq[x.prog] === d.k) {
          local.stepT = 0;
          fx('good', pos);
          c.send('d1fx', ['good', pos]);
          const prog = x.prog + 1;
          if (prog >= x.seq.length) {
            const round = x.round + 1;
            local.failT = 3;
            c.set((s) => {
              s.x.prog = prog;
              s.x.round = Math.min(round, 2);
              s.x.r3 = round >= 3 ? 'win' : 'pause';
              if (round >= 3) s.x.stage = 4;
            });
          } else c.set((s) => (s.x.prog = prog));
        } else this.fail(c, 'wrong');
      }
    },
    update(c, dt, t) {
      if (!D1.built) return null;
      const x = c.S.x;
      if (!Net.isHost) {
        // guests ease the automaton towards the host's angle
        let da = local.gTarget - local.gAng;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        local.gAng += da * Math.min(1, dt * 10);
        local.slam = Math.max(0, local.slam - dt);
      }
      D1.update(dt, t, x, c.role, local.gAng, local.slam);
      if (x.stage === 3)
        D1.clock.draw(x.seq || [], x.prog || 0, c.role, x.r3 === 'run' ? local.hand : 0, Math.sin(t * 8) > 0);
      if (x.stage >= 4) D1.clock.draw([], 0, 'done', 0, false);
      const p = Player.body.p;
      const q = D1.rel(p);
      const r = c.role;
      if (x.stage === 1) {
        const tl0 = D1.tileAt(q);
        const tl = tl0 && SIDE_OF[tl0.side] === r ? tl0 : null;
        const target = tl && (tl.side === 'L' ? 'R' : 'L');
        if (tl && !x.grid[target].every(Boolean)) {
          if (Input.pressed('interact')) {
            tl.press = 1;
            Sound.play('switch');
            Fx.burst(D1.P(tl.x, 0.4, tl.z), '#ffcf8a', 10, 2, 0.35, 0);
            c.act({ a: 'tile', side: tl.side, i: tl.i });
          }
          return ['E', 'Appuyer sur la dalle ' + (tl.i + 1)];
        }
        if (D1.inRoom1(q)) {
          const mine = q.x < 0 ? 'L' : 'R';
          const n = x.grid[mine].filter(Boolean).length;
          HUD.objective(
            (mine === 'L' ? 'Ton tableau ♥ : ' : 'Ton tableau ♠ : ') +
              n +
              ' / 9 lampes. ' +
              (n === 9 ? 'Allumé ! Aide {mate} à finir le sien.' : 'Dis à {mate} quelles lampes sont éteintes.'),
          );
        }
      }
      if (x.stage === 2) {
        if (x.carrier === r) {
          const ped = D1.nearPed(q);
          if (ped) {
            if (Input.pressed('interact')) c.act({ a: 'place', ped });
            return ['E', 'Poser le cristal sur ' + D1.SYM[ped]];
          }
        } else if (!x.carrier && r === 'valet') {
          const l = D1.nearLedge(q);
          const where = l && 'l' + l.i;
          const has =
            where &&
            Object.keys(D1.COLORS).find((cc) => (x.crys[cc] || 'l' + D1.crystals[cc].ledge) === where);
          if (has) {
            if (Input.pressed('interact')) c.act({ a: 'pick', where });
            return ['E', 'Prendre le cristal ' + NAMES[has]];
          }
          const ped = D1.nearPed(q);
          const on = ped && Object.keys(x.crys).find((cc) => x.crys[cc] === 'p' + ped);
          if (on && x.code[ped] !== on) {
            if (Input.pressed('interact')) c.act({ a: 'pick', where: 'p' + ped });
            return ['E', 'Reprendre le cristal ' + NAMES[on]];
          }
        }
      }
      if (x.stage === 3) {
        // the clock ticks while a symbol is waiting, faster near the end
        if (x.r3 === 'run') {
          local.tick = (local.tick || 0) - dt;
          if (local.tick <= 0) {
            local.tick = local.hand > 0.75 ? 0.25 : 0.6;
            Sound.play('tile');
          }
        }
        const sw0 = D1.nearSwitch(q);
        const sw = sw0 && sw0.who === r ? sw0 : null;
        if (sw) {
          if (Input.pressed('interact')) {
            c.act({ a: 'pull', k: sw.k });
            sw.seenAt = t;
          }
          return ['E', 'Abaisser le levier ' + D1.SYM[sw.k]];
        }
        local.msgCd -= dt;
        if (x.r3 === 'idle' && local.msgCd <= 0 && q.y < 1 && q.z > 82) {
          local.msgCd = 12;
          HUD.say(TXT.r3floor, T.master, 2600);
        }
      }
      return null;
    },
  });
})();
