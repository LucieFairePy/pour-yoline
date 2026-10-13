// ♦ 2 · Les Miroirs. Kits swapped: Yoline carries the Valet kit, William the Dame kit.
(() => {
  const T = CONFIG;
  const W = TrD2;
  const TX = {
    title: 'Les Miroirs',
    card: '♦ 2',
    intro: 'Épreuve de logique. Une galerie de glaces : la lumière ne va que là où vous l’envoyez.',
    hint: {
      dame: 'Ce chapitre, tu vises : clic gauche et F orientent les tourelles de lumière.',
      valet: 'Ce chapitre, tu portes et tu tournes : E tourne un miroir, F dans l’autre sens.',
    },
    s1: {
      dame: 'La Galerie : passe côté ♥, à gauche de la vitre. Tourne tes miroirs (E) pour envoyer la lumière à travers la vitre, chez {mate}.',
      valet:
        'La Galerie : passe côté ♠, à droite de la vitre. La lumière arrive par la vitre : tourne tes miroirs (E, F) jusqu’au cristal.',
    },
    s2: {
      dame: 'L’Atelier : tire sur une plaque blanche (clic) pour orienter la tourelle. {mate} pose les blocs de l’autre côté de la vitre.',
      valet:
        'L’Atelier : F pour prendre ou poser un bloc sur un socle, E pour tourner un miroir posé. Les deux cristaux doivent briller ensemble.',
    },
    s3: 'Les portes s’ouvrent. Au bout du couloir, le Gardien des Miroirs. Entrez ensemble.',
    s4: {
      dame: 'Le Gardien : sa couronne de miroirs a une brèche. Allume les tourelles du bord (clic : bleue, F : rose). Chacune éclaire un miroir : avec {mate}, envoyez la lumière dans la brèche.',
      valet:
        'Le Gardien : tourne les miroirs de l’arène (E, F) pour renvoyer la lumière dans la brèche, jusqu’à son cœur. Bandes rouges : écarte-toi. Ondes : saute.',
    },
    phase: [
      '',
      'Le Gardien ouvre sa couronne. Trouvez la brèche.',
      'Il tourne sur lui-même. Suivez la brèche !',
      'Il brouille vos miroirs. Plus vite !',
    ],
    crack: 'Le cœur se fend !',
    boss: 'Le Gardien des Miroirs',
    bossLines: [
      'Je renvoie tout. Même la lumière.',
      'Vous voyez la même chose, mais pas du même côté.',
      'Personne ne m’a jamais regardé en face.',
    ],
    s7: 'Le Gardien s’est brisé. La carte ♦ 2 est au centre : approchez ensemble.',
    lit: 'Le cristal s’allume.',
    hints1: [
      'Un miroir en diagonale tourne la lumière d’un quart de tour.',
      'Côté ♥, la lumière doit monter, puis traverser la vitre. Côté ♠, la descendre jusqu’au cristal.',
    ],
    hints2: [
      'La tourelle va tout droit vers la plaque visée. Un miroir posé en travers la fait tourner.',
      'Le prisme coupe la lumière en deux : une moitié de chaque côté.',
    ],
    hit: 'Un éclat t’a touché{e}.',
    ghost: 'Regardez le sol : la lumière y a laissé son chemin.',
    wave: 'Saute !',
  };
  T.cards.d2 = {
    corner: '2\n♦',
    big: '♦',
    title: 'Les Miroirs',
    sub: 'Épreuve ♦ · réussie',
    lines: [
      'Chacun voyait la lumière, mais pas du même côté.',
      'Vous l’avez fait passer quand même.',
      'Le Oui aime qu’on le regarde en face.',
    ],
  };

  const DEG = [30, 90, 150, 210, 270, 330];
  const local = { stage: 0, phase: 0, rep: 0, last: {}, seen: {}, hit: 0, said: {}, prevAge: {} };
  const tm = { lit: 0, hint: 0, atk: 0, wave: 0, scr: 0, gapT: 0, acc: 0, rest: 0 };
  const fwd = V3();
  const hostNow = () => performance.now() / 1000;

  const init = () => {
    const mirrors = { ...W.ROOM1.start };
    // the arena mirrors start off their solution (θ + 105°)
    DEG.forEach((d, i) => (mirrors['a' + i] = (d + 105 + [45, 90, 135][i % 3]) % 360));
    return {
      stage: 1,
      mirrors,
      aim: 'td',
      blocks: {
        bm: { kind: 'mirror', at: 'r1', a: 0, by: null },
        bp: { kind: 'prism', at: 'r2', a: 0, by: null },
        bm2: { kind: 'mirror', at: 'r3', a: 90, by: null },
      },
      open: [],
      solved: [],
      aimA: null,
      aimB: null,
      boss: null,
      cracks: 0,
    };
  };

  // age of an attack on this screen (each client counts from when it first saw it)
  const age = (a) => {
    const now = performance.now() / 1000;
    if (local.seen[a.id] == null) local.seen[a.id] = now;
    return now - local.seen[a.id];
  };
  const ctxW = (c) => ({ pos: c.pos, role: c.role, age });

  const stageEnter = (c, st) => {
    local.stage = st;
    const r = c.role;
    if (st === 1) {
      HUD.objective(TX.s1[r]);
      W.screen.show('Salle 1', 'La Galerie des glaces', '#ff9a3a');
    }
    if (st === 2) {
      HUD.objective(TX.s2[r]);
      W.screen.show('Salle 2', 'L’Atelier', '#ffcf8a');
      Sound.play('reveal');
      Sound.play('door');
    }
    if (st === 3) {
      HUD.objective(TX.s3);
      W.screen.show('♦ 2', 'Le Gardien des Miroirs', '#ff9a3a');
      Sound.play('reveal');
      Sound.play('door');
    }
    if (st === 4) {
      HUD.objective(TX.s4[r]);
      // a short look at the Guardian when it wakes up
      Cam.focus = W.at(0, 100, 6);
      setTimeout(() => {
        if (local.stage === 4) Cam.focus = null;
      }, 2600);
      Sound.mood('tense');
      Sound.play('roar');
      HUD.boss(TX.boss, 1, TX.phase[1]);
      HUD.say(TX.bossLines[0], TX.boss, 2600);
    }
    if (st === 7) {
      HUD.boss(null);
      HUD.objective(TX.s7);
      Sound.mood('calm');
      Sound.play('shatter');
      Sound.play('reveal');
      W.shatter();
    }
  };

  const reach = (c, who, m) => {
    const q = W.rel(c.pos(who));
    return Math.hypot(q.x - m.x, q.z - m.z) < 3.8 && Math.abs(q.y) < 2.5;
  };

  Story.register('tr_d2', {
    init,
    voice: () => 1,
    net: {
      // hints said by the host reach the other screen too
      d2say: (c, s) => c.S.phase === 'tr_d2' && HUD.say(s, T.master, 4500),
      d2hit: (c, p) => {
        // the partner was hit: spark + sound where they stand
        const v = V3(p[0], p[1] + 1, p[2]);
        Fx.burst(v, '#ff3a5a', 30, 5, 0.5, -4);
        Fx.burst(v, '#d9d4ff', 14, 4, 0.4, -6);
        Sound.play('punch', v);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      local.stage = 0;
      local.phase = 0;
      c.spawn(W.spawn(c.S.x.stage, c.role), 0);
      Player.killY = W.O.y - 20;
      Player.checkpoint = () => W.spawn(Story.S.x.stage, c.role);
      // a far, unreachable target keeps the Dame's crosshair on without any grapple
      Player.targets = () =>
        c.role === 'dame' && Story.S.x.stage >= 2 && Story.S.x.stage <= 6
          ? [W.P(0, -400, 100)]
          : [];
      City.mood({});
      c.fog(0.006);
      Sound.mood('calm');
      HUD.visa(TX.card + ' · ' + TX.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 3600);
      HUD.say(TX.hint[c.role], T.master, 4000);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Cam.focus = null;
      HUD.boss(null);
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      // sounds for changes made by anyone, heard on both screens
      Object.entries(x.mirrors).forEach(([id, a]) => {
        if (local.last[id] != null && local.last[id] !== a) {
          const m = W.mirrors.find((mm) => mm.id === id);
          if (m) {
            Sound.play('switch');
            Fx.burst(W.at(m.x, m.z, 0.5), '#ffcf8a', 8, 2, 0.4, 2);
          }
        }
        local.last[id] = a;
      });
      Object.entries(x.blocks).forEach(([id, b]) => {
        const k = (b.at || '') + '|' + (b.by || '') + '|' + b.a;
        if (local.last[id] != null && local.last[id] !== k) Sound.play(b.by ? 'grapple' : 'tile');
        local.last[id] = k;
      });
      if (local.last.aim != null && local.last.aim !== x.aim + x.aimA + x.aimB) Sound.play('portalShoot');
      local.last.aim = x.aim + x.aimA + x.aimB;
      const bs = x.boss;
      if (bs && x.stage === 4) {
        if (bs.phase !== local.phase) {
          local.phase = bs.phase;
          if (bs.phase > 1) {
            Sound.play('roar');
            HUD.say(TX.phase[bs.phase], T.master, 2600);
            HUD.say(TX.bossLines[bs.phase - 1], TX.boss, 2600);
          }
        }
        HUD.boss(TX.boss, bs.hp / 6, TX.phase[bs.phase]);
        if (local.last.cracks != null && x.cracks > local.last.cracks) {
          Sound.play('shatter');
          Cam.shake = 0.4;
          HUD.say(TX.crack, T.master, 1600);
          Fx.burst(W.at(0, 100, 2), '#ff3d7f', 120, 7, 1, -4);
        }
        (bs.atk || []).forEach((a) => {
          if (!local.said[a.id]) {
            local.said[a.id] = 1;
            age(a);
            Sound.play('deflect');
          }
        });
        if (bs.wave && !local.said['w' + bs.wave.id]) {
          local.said['w' + bs.wave.id] = 1;
          age(bs.wave);
          Sound.play('slam');
          HUD.say(TX.wave, T.master, 900);
        }
      }
      local.last.cracks = x.cracks;
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const res = W.trace(x);
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      tm.hint += dt;
      if (x.stage === 1) {
        tm.lit = res.lit.has('c1') ? tm.lit + dt : 0;
        if (tm.lit > 1) {
          tm.hint = 0;
          c.set((s) => {
            s.x.stage = 2;
            s.x.open = ['d1w', 'd1e'];
            s.x.solved = ['c1'];
          });
        }
        if (tm.hint > 100 && !local.said.h10) {
          local.said.h10 = 1;
          c.send('d2say', TX.hints1[0]);
          HUD.say(TX.hints1[0], T.master, 4000);
        }
        if (tm.hint > 190 && !local.said.h11) {
          local.said.h11 = 1;
          c.send('d2say', TX.hints1[1]);
          HUD.say(TX.hints1[1], T.master, 5000);
        }
        if (tm.hint > 300 && !x.ghost) {
          c.set((s) => (s.x.ghost = true));
          c.send('d2say', TX.ghost);
          HUD.say(TX.ghost, T.master, 4000);
        }
      }
      if (x.stage === 2) {
        tm.lit = res.lit.has('c2a') && res.lit.has('c2b') ? tm.lit + dt : 0;
        if (tm.lit > 1.2) {
          c.set((s) => {
            s.x.stage = 3;
            s.x.open = ['d1w', 'd1e', 'd2w', 'd2e'];
            s.x.solved = ['c1', 'c2a', 'c2b'];
          });
        }
        if (tm.hint > 120 && !local.said.h20) {
          local.said.h20 = 1;
          c.send('d2say', TX.hints2[0]);
          HUD.say(TX.hints2[0], T.master, 4500);
        }
        if (tm.hint > 210 && !local.said.h21) {
          local.said.h21 = 1;
          c.send('d2say', TX.hints2[1]);
          HUD.say(TX.hints2[1], T.master, 4500);
        }
      }
      if (x.stage === 3 && W.inArena(qd) && W.inArena(qv)) {
        tm.atk = 3;
        tm.wave = 8;
        tm.scr = 9;
        tm.gapT = 0;
        tm.acc = 0;
        tm.rest = 0;
        c.set((s) => {
          s.x.stage = 4;
          // the doors of the Atelier close behind you: no way out until it breaks
          s.x.open = ['d1w', 'd1e'];
          s.x.cracks = 0;
          s.x.boss = { phase: 1, hp: 6, gi: 1, gap: (DEG[1] * Math.PI) / 180, open: true, atk: [], wave: null, n: 0 };
        });
      }
      if (x.stage === 4 && x.boss) bossHost(c, dt, x, res, qd, qv);
      if (x.stage === 7 && W.nearCard(qd) && W.nearCard(qv)) c.goto('reward', (s) => (s.x.card = 'd2'));
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'rot') {
        const m = W.mirrors.find((mm) => mm.id === d.id);
        if (!m || !reach(c, who, m)) return;
        const room1 = m.id[0] === 'm';
        if (room1 && x.stage !== 1) return;
        if (!room1 && x.stage !== 4) return;
        c.set((s) => (s.x.mirrors[d.id] = (((s.x.mirrors[d.id] + d.dir * m.step) % 360) + 360) % 360));
      }
      if (d.a === 'aim' && who === 'dame') {
        if (d.which === 'plaque' && x.stage === 2 && W.targets[d.id]) c.set((s) => (s.x.aim = d.id));
        if (d.which === 'A' && x.stage === 4) c.set((s) => (s.x.aimA = d.id));
        if (d.which === 'B' && x.stage === 4) c.set((s) => (s.x.aimB = d.id));
      }
      if (x.stage !== 2 || who !== 'valet') return;
      // the host sees the partner a little in the past: check against the socket they named,
      // with some slack, rather than the socket nearest to where it draws them
      const q = W.rel(c.pos(who));
      const sk = W.sockets[d.sock];
      if (!sk || Math.hypot(q.x - sk.x, q.z - sk.z) > 3.6) return;
      const here = Object.entries(x.blocks).find(([, b]) => b.at === sk.id);
      const carried = Object.entries(x.blocks).find(([, b]) => b.by === who);
      if (d.a === 'take' && here && !carried)
        c.set((s) => {
          s.x.blocks[here[0]].at = null;
          s.x.blocks[here[0]].by = who;
        });
      if (d.a === 'put' && carried && !here)
        c.set((s) => {
          s.x.blocks[carried[0]].at = sk.id;
          s.x.blocks[carried[0]].by = null;
        });
      if (d.a === 'brot' && here && here[1].kind === 'mirror')
        c.set((s) => (s.x.blocks[here[0]].a = (s.x.blocks[here[0]].a + 45 * (d.dir || 1) + 360) % 360));
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const res = W.update(dt, t, x, ctxW(c));
      const q = W.rel(Player.body.p);
      const r = c.role;
      let prompt = null;
      // Dame aiming
      if (r === 'dame' && (x.stage === 2 || x.stage === 4)) {
        const which = Input.pressed('attack') ? 'A' : Input.pressed('ability') ? 'B' : null;
        if (which) {
          fwd.set(0, 0, -1).applyQuaternion(R.camera.quaternion);
          const kind = x.stage === 2 ? 'plaque' : 'mirror';
          const id = W.aim(R.camera.position, fwd, kind);
          if (id) c.act({ a: 'aim', which: kind === 'plaque' ? 'plaque' : which, id });
          else Sound.play('deflect');
        }
      }
      // turning mirrors (both players), E forward, F backward for the Valet
      const set = x.stage === 1 ? ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] : x.stage === 4 ? DEG.map((d, i) => 'a' + i) : [];
      const m = set.length ? W.nearMirror(q, set) : null;
      if (m) {
        local.rep -= dt;
        const back = r === 'valet' && Input.held('ability');
        const fwdE = Input.held('interact');
        if (Input.pressed('interact') || (r === 'valet' && Input.pressed('ability'))) local.rep = 0;
        if ((fwdE || back) && local.rep <= 0) {
          c.act({ a: 'rot', id: m.id, dir: back ? -1 : 1 });
          local.rep = m.step === 15 ? 0.16 : 0.42;
        }
        prompt = ['E', r === 'valet' ? 'Tourner le miroir (F : l’autre sens)' : 'Tourner le miroir'];
      }
      // carrying blocks (room 2, Valet)
      if (x.stage === 2 && r === 'valet') {
        const sk = W.nearSocket(q);
        const carried = Object.values(x.blocks).find((b) => b.by === r);
        const here = sk && Object.values(x.blocks).find((b) => b.at === sk.id);
        if (sk) {
          if (carried && !here) {
            prompt = ['F', 'Poser le ' + (carried.kind === 'prism' ? 'prisme' : 'miroir')];
            if (Input.pressed('ability')) c.act({ a: 'put', sock: sk.id });
          } else if (!carried && here) {
            prompt =
              here.kind === 'mirror' && !sk.rack
                ? ['E', 'Tourner le miroir · F : le prendre']
                : ['F', 'Prendre le ' + (here.kind === 'prism' ? 'prisme' : 'miroir')];
            if (Input.pressed('ability')) c.act({ a: 'take', sock: sk.id });
            if (Input.pressed('interact') && here.kind === 'mirror') c.act({ a: 'brot', sock: sk.id });
          }
        }
      }
      if (r === 'dame' && x.stage === 2 && !prompt) prompt = ['Clic', 'Viser une plaque blanche'];
      if (r === 'dame' && x.stage === 4 && !prompt) prompt = ['Clic / F', 'Allumer une tourelle du bord'];
      // attacks hit whoever is in the way (each player tests themselves)
      local.hit -= dt;
      const bs = x.boss;
      if (bs && x.stage === 4 && local.hit <= 0) {
        let dir = null;
        (bs.atk || []).forEach((a) => {
          const ag = age(a);
          const prev = local.prevAge[a.id] != null ? local.prevAge[a.id] : ag;
          local.prevAge[a.id] = ag;
          if (!dir && W.shardHits(q, a, ag, prev)) dir = V3(Math.cos(a.ang), 0, -Math.sin(a.ang));
        });
        const wa = bs.wave ? age(bs.wave) : 0;
        const wp = bs.wave && local.prevAge['w' + bs.wave.id] != null ? local.prevAge['w' + bs.wave.id] : wa;
        if (bs.wave) local.prevAge['w' + bs.wave.id] = wa;
        if (!dir && bs.wave && W.waveHits(q, bs.wave, wa, wp, Player.body.grounded)) {
          dir = V3(q.x, 0, q.z - 100).normalize();
        }
        if (dir) {
          local.hit = 1.2;
          // a firm shove, not a launch: you stay in the arena
          Player.body.v.set(dir.x * 6.5, 4.2, dir.z * 6.5);
          HUD.hurt();
          Sound.play('hurt');
          Cam.shake = 0.3;
          const p = Player.body.p;
          Fx.burst(p.clone().add(V3(0, 1, 0)), '#ff3a5a', 30, 5, 0.5, -4);
          c.send('d2hit', [p.x, p.y, p.z]);
        }
      }
      if (x.stage === 7 && W.nearCard(q)) prompt = null;
      return prompt;
    },
  });

  // ---------- the Guardian, run by the host ----------
  const bossHost = (c, dt, x, res, qd, qv) => {
    const bs = x.boss;
    const now = hostNow();
    let dirty = false;
    const nb = { ...bs, atk: (bs.atk || []).filter((a) => now - a.h0 < a.wind + 0.9) };
    if (nb.atk.length !== (bs.atk || []).length) dirty = true;
    if (nb.wave && now - nb.wave.h0 > 2.4) {
      nb.wave = null;
      dirty = true;
    }
    // the gap moves: steps in phase 1, turns in phases 2 and 3
    tm.gapT += dt;
    if (tm.rest > 0) {
      tm.rest -= dt;
      if (tm.rest <= 0) {
        nb.open = true;
        dirty = true;
      }
    } else if (bs.phase === 1 && tm.gapT > 18) {
      tm.gapT = 0;
      nb.gi = ((bs.gi || 1) + 1 + ((Math.random() * 4) | 0)) % 6;
      nb.gap = (DEG[nb.gi] * Math.PI) / 180;
      dirty = true;
    } else if (bs.phase >= 2) {
      const sp = ((bs.phase === 2 ? 8 : 12) * Math.PI) / 180;
      nb.gap = bs.gap + sp * dt * (bs.n % 2 ? -1 : 1);
      tm.sendGap = (tm.sendGap || 0) + dt;
      if (tm.sendGap > 0.25) {
        tm.sendGap = 0;
        dirty = true;
      }
    }
    // light in the heart cracks it
    tm.acc = res.heart && nb.open ? tm.acc + dt : Math.max(0, tm.acc - dt * 0.4);
    if (tm.acc > 1.6) {
      tm.acc = 0;
      tm.rest = 2.4;
      nb.open = false;
      nb.hp = bs.hp - 1;
      nb.n = (bs.n || 0) + 1;
      nb.phase = nb.hp <= 2 ? 3 : nb.hp <= 4 ? 2 : 1;
      // the gap jumps to a new mirror after each crack
      nb.gi = ((bs.gi || 1) + 2 + ((Math.random() * 3) | 0)) % 6;
      nb.gap = (DEG[nb.gi] * Math.PI) / 180;
      tm.gapT = 0;
      dirty = true;
      c.set((s) => (s.x.cracks = (s.x.cracks || 0) + 1));
      if (nb.hp <= 0) {
        c.set((s) => {
          s.x.stage = 7;
          s.x.boss = null;
        });
        return;
      }
    }
    // shards: a red strip toward a player, then the shard flies along it
    tm.atk -= dt;
    if (tm.atk <= 0) {
      tm.atk = bs.phase === 1 ? 5.5 : bs.phase === 2 ? 4.6 : 3.6;
      const who = bs.phase === 1 ? [Math.random() < 0.5 ? qd : qv] : [qd, qv];
      who.forEach((q) => {
        if (nb.atk.length >= 4) return;
        const id = ((Math.random() * 1e6) | 0) + '';
        nb.atk.push({ id, h0: now, ang: Math.atan2(-(q.z - 100), q.x), wind: bs.phase === 3 ? 1.0 : 1.25 });
      });
      dirty = true;
    }
    if (bs.phase >= 2) {
      tm.wave -= dt;
      if (tm.wave <= 0 && !nb.wave) {
        tm.wave = bs.phase === 2 ? 11 : 8.5;
        nb.wave = { id: ((Math.random() * 1e6) | 0) + '', h0: now };
        dirty = true;
      }
    }
    // phase 3: it scrambles two mirrors now and then
    if (bs.phase === 3) {
      tm.scr -= dt;
      if (tm.scr <= 0) {
        tm.scr = 9;
        c.set((s) => {
          for (let k = 0; k < 2; k++) {
            const id = 'a' + ((Math.random() * 6) | 0);
            s.x.mirrors[id] = (s.x.mirrors[id] + 90) % 360;
          }
        });
        Sound.play('glitch');
      }
    }
    if (dirty) c.set((s) => (s.x.boss = nb));
    else Object.assign(bs, { gap: nb.gap });
  };
})();
