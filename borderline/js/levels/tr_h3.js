(() => {
  const T = CONFIG;
  const TITLE = 'Les Yeux bandés';
  const TXT = {
    intro: 'Épreuve de confiance. L’un de vous aura les yeux bandés. L’autre sera ses yeux.',
    call: 'Astuce : appelle avec C, {mate} entend d’où vient ta voix.',
    blindOn: 'Le bandeau tombe sur tes yeux. Écoute {mate}.',
    blindOff: 'Le bandeau glisse. Tu vois de nouveau.',
    s1: {
      blind: 'Le jardin · Entre dans le labyrinthe : là, tes yeux se ferment. {mate} te voit d’en haut, écoute-{le}. Évite les clochettes.',
      guide: 'Le jardin · Monte sur la passerelle (escalier à gauche) et guide {mate} dans le labyrinthe. Les dalles à clochette {le} renvoient au départ.',
    },
    s1mid: 'La lanterne bleue : si une clochette sonne, c’est ici que {mate} reviendra.',
    s1midMe: 'La lanterne bleue : si une clochette sonne, c’est ici que tu reviendras.',
    plate: 'Une clochette ! Retour en arrière.',
    plateMate: 'Une clochette a sonné : {mate} repart en arrière.',
    s1done: 'Sorti{pe} du labyrinthe. Le bandeau change de mains.',
    s2: {
      blind: 'L’étang · Les yeux bandés, traverse sur les pierres. {mate} pose des repères qui sonnent : avance vers eux. Les nénuphars coulent si tu restes dessus.',
      guide: 'L’étang · Monte sur le ponton. Vise une pierre et appuie sur E : un repère sonne pour {mate}. Trois repères au plus.',
    },
    s2isle: 'L’îlot : si {mate} tombe à l’eau, {il} repartira d’ici.',
    s2isleMe: 'L’îlot : si tu tombes à l’eau, tu repartiras d’ici.',
    splash: 'Plouf. Retour à la dernière rive.',
    s2done: 'L’autre rive. Il reste le bal.',
    s3: {
      blind: 'Le bal · Les yeux bandés. Fais tout en miroir de {mate} : quand {il} avance, tu avances ; à sa gauche, ta droite.',
      guide: 'Le bal · Tu vois deux dalles s’allumer à chaque temps : la rose pour toi, la bleue pour {mate}. Elles sont en miroir. Guide-{le}, en rythme.',
      wait: 'Entrez tous les deux sur la piste pour lancer la musique.',
    },
    swap: 'Deuxième danse. Le bandeau change de mains.',
    hit: 'En rythme.',
    miss: 'Contretemps. On reprend ce pas.',
    final: 'Dernier pas : rejoignez-vous au milieu, sur le cœur.',
    win: 'Vous vous êtes retrouvés au milieu, sans vous voir.',
    card: 'La carte ♥ 3 descend au-dessus du cœur. Prenez-la ensemble.',
  };
  CONFIG.cards.h3 = {
    corner: '3\n♥',
    big: '♥',
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'L’un ne voyait rien.',
      'L’autre voyait pour deux.',
      'Vous avez dansé quand même.',
    ],
  };
  // who wears the blindfold in each stage (the kits are swapped in this trial)
  const BLIND = { 1: 'valet', 2: 'dame', 3: 'valet', 4: 'dame' };
  const BEAT = { 3: 3.0, 4: 2.7 };
  const NEED = 8;
  const sp = (st, role, x) => H3.spawn(st, role, { ...x, blind: BLIND[st] });
  const local = { stage: 0, beatN: -1, beatT: 0, chimeT: 0, plateCd: 0, blindK: 0, rustle: 0, waitT: 0 };

  // ---------- the blindfold overlay ----------
  let ov = null;
  let og = null;
  const overlay = () => {
    if (ov) return;
    ov = document.createElement('canvas');
    ov.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none';
    document.body.appendChild(ov);
    og = ov.getContext('2d');
  };
  const proj = V3();
  const drawOverlay = (k, t) => {
    if (!ov) overlay();
    ov.style.display = k > 0.01 ? 'block' : 'none';
    if (k <= 0.01) return;
    const W = (ov.width = Math.round(innerWidth * 0.5));
    const H = (ov.height = Math.round(innerHeight * 0.5));
    og.globalCompositeOperation = 'source-over';
    og.fillStyle = `rgba(4,2,7,${0.985 * k})`;
    og.fillRect(0, 0, W, H);
    // fabric weave, very faint
    og.fillStyle = `rgba(60,20,40,${0.05 * k})`;
    for (let y = (t * 3) % 6; y < H; y += 6) og.fillRect(0, y, W, 1);
    // a soft, dim window around your own feet and hands: you feel your own body, nothing else
    proj.copy(Player.body.p);
    proj.y += 0.6;
    proj.project(R.camera);
    if (proj.z < 1) {
      const x = ((proj.x + 1) / 2) * W;
      const y = ((1 - proj.y) / 2) * H;
      const r = H * 0.16;
      og.globalCompositeOperation = 'destination-out';
      const gr = og.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${0.55 * k})`);
      gr.addColorStop(0.6, `rgba(0,0,0,${0.3 * k})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      og.fillStyle = gr;
      og.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // heartbeat glow at the edges
    const hb = Math.pow(Math.max(0, Math.sin(t * 2.2)), 16) * 0.12 * k;
    if (hb > 0.002) {
      og.globalCompositeOperation = 'source-over';
      const e = og.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
      e.addColorStop(0, 'rgba(0,0,0,0)');
      e.addColorStop(1, `rgba(150,20,60,${hb})`);
      og.fillStyle = e;
      og.fillRect(0, 0, W, H);
    }
  };

  // the blindfold only covers your eyes once you are inside the section
  const blindNow = (c, q) => {
    const x = c.S.x;
    if (BLIND[x.stage] !== c.role) return false;
    if (x.stage === 1) return H3.inMaze(q);
    if (x.stage === 2) return H3.onPondPath(q) && !H3.farShore(q);
    if (x.stage === 3 || x.stage === 4) return x.dance && x.dance.ph !== 'idle' && H3.inBallroom(q);
    return false;
  };

  const say = (c, txt, hold = 2400) => HUD.say(txt, T.master, hold);
  const fx = (k, pos) => {
    const p = pos && V3(H3.O.x + pos[0], H3.O.y + pos[1], H3.O.z + pos[2]);
    if (k === 'plate') {
      Sound.play('lantern');
      Sound.play('beacon', p, 'dame');
      if (p) Fx.burst(p.clone().add(V3(0, 1.2, 0)), '#ffcf8a', 30, 3, 0.6, 0);
    }
    if (k === 'good') {
      Sound.play('rune', true);
      if (p) Fx.burst(p.clone().add(V3(0, 0.4, 0)), '#ff9ec4', 24, 3, 0.5, 0);
    }
    if (k === 'bad') Sound.play('rune', false);
    if (k === 'splash') {
      Sound.play('fall');
      if (p) Fx.burst(p.clone().add(V3(0, 0.1, 0)), '#8fc8ff', 40, 4, 0.6, -6);
    }
    if (k === 'mark') {
      Sound.play('chime');
      if (p) Fx.burst(p.clone().add(V3(0, 0.3, 0)), '#8fd8ff', 18, 2, 0.4, 0);
    }
  };

  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    const r = c.role;
    const who = BLIND[st] === r ? 'blind' : 'guide';
    if (st === 1) {
      HUD.objective(TXT.s1[who]);
      H3.screen.show('♥ 3', TITLE, '#ff5f8a');
    }
    if (st === 2) {
      HUD.objective(TXT.s2[who]);
      if (prev) say(c, TXT.s1done, 2600);
      Sound.play('reveal');
      H3.screen.show('L’étang', 'Le bandeau change de mains', '#8fd8ff');
    }
    if (st === 3) {
      HUD.objective(TXT.s3.wait);
      if (prev) say(c, TXT.s2done, 2600);
      Sound.mood('calm');
      H3.danceScreen.show('Le bal', 'Entrez sur la piste', '#ffcf8a');
    }
    if (st === 4) {
      HUD.objective(TXT.s3[who]);
      say(c, TXT.swap, 2800);
      Sound.play('reveal');
    }
    if (st === 5) {
      HUD.objective(TXT.card);
      say(c, TXT.win, 3000);
      Sound.mood('gold');
      Sound.play('reveal');
      H3.danceScreen.show('♥ 3', 'Sans vous voir', '#ff5f8a');
    }
  };

  // ---------- the dance ----------
  // dame dances on the left half (columns 0..2), valet on the right (4..6); targets are mirrors
  const half = (role) => (role === 'dame' ? [0, 2] : [4, 6]);
  const mirror = ([i, j]) => [6 - i, j];
  const startTile = (role) => (role === 'dame' ? [0, 3] : [6, 3]);
  const stepFrom = ([i, j], role, prev) => {
    const [a, b] = half(role);
    const opts = [
      [i + 1, j],
      [i - 1, j],
      [i, j + 1],
      [i, j - 1],
    ].filter(([x, y]) => x >= a && x <= b && y >= 0 && y <= 6 && !(prev && x === prev[0] && y === prev[1]));
    return opts[Math.floor(Math.random() * opts.length)] || [i, j];
  };
  const targetsFor = (d, stage) => {
    const seer = BLIND[stage] === 'dame' ? 'valet' : 'dame';
    const blind = BLIND[stage];
    const out = {};
    out[seer] = d.seer;
    out[blind] = mirror(d.seer);
    return out;
  };
  const tileIdx = ([i, j]) => j * 7 + i;
  const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

  Story.register('tr_h3', {
    init: () => ({
      stage: 1,
      // one garden for everybody, every time (both screens must build the same maze)
      seed: 3903,
      mid: false,
      isle: false,
      marks: [],
      traps: 0,
      dance: { ph: 'idle', beat: 0, prog: 0, seer: null, prev: null },
    }),
    voice: () => 1,
    partner: (c) => BLIND[c.S.x.stage] !== c.role,
    net: {
      h3fx: (c, d) => fx(d[0], d[1]),
      h3say: (c, d) => say(c, d[0], d[1] || 2400),
      h3plate: (c, k) => flash(k),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      H3.build(c.S.x.seed);
      local.stage = 0;
      local.beatN = -1;
      c.spawn(sp(c.S.x.stage, c.role, c.S.x), 0);
      Player.killY = H3.O.y - 4;
      Player.checkpoint = () => {
        const x = Story.S.x;
        if (x.stage === 2 && BLIND[2] === c.role) {
          // fell in the pond: the splash, for both
          const q = H3.rel(Player.body.p);
          c.act({ a: 'splash', pos: [q.x, -0.4, q.z] });
        }
        return sp(x.stage, c.role, x);
      };
      Player.targets = null;
      City.mood({});
      c.fog(0.011);
      Sound.mood('calm');
      HUD.visa('♥ 3 · ' + TITLE);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3600);
      HUD.say(TXT.call, T.master, 3400);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      drawOverlay(0, 0);
      H3.hide();
    },
    apply(c) {
      if (!H3.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      (x.marks || []).forEach((m, k) => H3.markerAt(k, H3.stonePos(m)));
      for (let k = (x.marks || []).length; k < 3; k++) H3.markerAt(k, null);
      const d = x.dance;
      if (d && d.beat !== local.beatN) {
        local.beatN = d.beat;
        local.beatT = 0;
        // each beat, the blind one hears where their tile is
        if ((x.stage === 3 || x.stage === 4) && d.ph === 'run' && BLIND[x.stage] === c.role) {
          const tg = targetsFor(d, x.stage)[c.role];
          if (tg) Sound.play('beacon', H3.tileCenter(tg[0], tg[1]).add(V3(0, 0.3, 0)), 'dame');
        }
        if (d.ph === 'run') Sound.play('tile');
      }
      if ((x.stage === 3 || x.stage === 4) && d && d.ph === 'run') {
        const who = BLIND[x.stage] === c.role ? 'blind' : 'guide';
        HUD.objective(TXT.s3[who] + '  ·  Pas ' + d.prog + ' / ' + NEED);
        H3.danceScreen.show(d.prog + ' / ' + NEED, x.stage === 3 ? 'Première danse' : 'Deuxième danse', '#ff9ec4');
      }
      if (d && d.ph === 'final' && local.final !== true) {
        local.final = true;
        HUD.objective(TXT.final);
        say(c, TXT.final, 2600);
      }
    },
    host(c, dt) {
      if (!H3.built) return;
      const x = c.S.x;
      const qd = H3.rel(c.pos('dame'));
      const qv = H3.rel(c.pos('valet'));
      const qb = BLIND[x.stage] === 'dame' ? qd : qv;
      if (x.stage === 1 && H3.mazeExit(qb)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && H3.farShore(qb)) {
        c.set((s) => {
          s.x.stage = 3;
          s.x.marks = [];
        });
      }
      if (x.stage === 3 || x.stage === 4) {
        const d = x.dance;
        const td = H3.tileOf(qd);
        const tv = H3.tileOf(qv);
        if (d.ph === 'idle') {
          local.waitT = td && tv ? local.waitT + dt : 0;
          if (local.waitT > 1.5) {
            local.waitT = 0;
            local.clock = 0;
            const seer = BLIND[x.stage] === 'dame' ? 'valet' : 'dame';
            c.set((s) => {
              s.x.dance = { ph: 'run', beat: s.x.dance.beat + 1, prog: 0, seer: startTile(seer), prev: null };
            });
          }
        } else if (d.ph === 'run') {
          local.clock = (local.clock || 0) + dt;
          if (local.clock > BEAT[x.stage]) {
            local.clock = 0;
            const tg = targetsFor(d, x.stage);
            const ok = same(td, tg.dame) && same(tv, tg.valet);
            const center = [0, 0.2, H3.GZ];
            if (ok) {
              const prog = d.prog + 1;
              c.send('h3fx', ['good', center]);
              fx('good', center);
              if (prog >= NEED) {
                if (x.stage === 3)
                  c.set((s) => {
                    s.x.stage = 4;
                    s.x.dance = { ph: 'idle', beat: s.x.dance.beat + 1, prog: 0, seer: null, prev: null };
                  });
                else
                  c.set((s) => {
                    s.x.dance = { ph: 'final', beat: s.x.dance.beat + 1, prog, seer: null, prev: null };
                  });
              } else {
                const seer = BLIND[x.stage] === 'dame' ? 'valet' : 'dame';
                c.set((s) => {
                  const nd = s.x.dance;
                  s.x.dance = {
                    ph: 'run',
                    beat: nd.beat + 1,
                    prog,
                    seer: stepFrom(nd.seer, seer, nd.prev),
                    prev: nd.seer,
                  };
                });
              }
            } else {
              c.send('h3fx', ['bad', null]);
              fx('bad', null);
              c.set((s) => {
                const nd = s.x.dance;
                s.x.dance = { ...nd, beat: nd.beat + 1, prog: Math.max(0, nd.prog - 1) };
              });
            }
          }
        } else if (d.ph === 'final') {
          const ok = same(td, [2, 3]) && same(tv, [4, 3]);
          local.waitT = ok ? local.waitT + dt : 0;
          if (local.waitT > 1.2) {
            local.waitT = 0;
            c.set((s) => {
              s.x.stage = 5;
              s.x.dance = { ...s.x.dance, ph: 'done' };
            });
          }
        }
      }
      if (x.stage === 5) {
        local.cardT = (local.cardT || 0) + dt;
        if (local.cardT > 3 && H3.nearCard(qd) && H3.nearCard(qv))
          c.goto('reward', (s) => (s.x.card = 'h3'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'plate' && x.stage === 1 && who === BLIND[1]) {
        c.set((s) => (s.x.traps = (s.x.traps || 0) + 1));
        c.send('h3fx', ['plate', d.pos]);
        fx('plate', d.pos);
        const mine = who === c.role;
        say(c, mine ? TXT.plate : TXT.plateMate);
        c.send('h3say', [mine ? TXT.plateMate : TXT.plate]);
        c.send('h3plate', d.k);
        flash(d.k);
      }
      if (d.a === 'mid' && x.stage === 1 && !x.mid) {
        c.set((s) => (s.x.mid = true));
        const mine = who === c.role;
        say(c, mine ? TXT.s1midMe : TXT.s1mid);
        c.send('h3say', [mine ? TXT.s1mid : TXT.s1midMe]);
        c.send('h3fx', ['good', d.pos]);
        fx('good', d.pos);
      }
      if (d.a === 'isle' && x.stage === 2 && !x.isle) {
        c.set((s) => (s.x.isle = true));
        const mine = who === c.role;
        say(c, mine ? TXT.s2isleMe : TXT.s2isle);
        c.send('h3say', [mine ? TXT.s2isle : TXT.s2isleMe]);
      }
      if (d.a === 'splash' && x.stage === 2) {
        c.send('h3fx', ['splash', d.pos]);
        fx('splash', d.pos);
        c.set((s) => (s.x.marks = s.x.marks || []));
      }
      if (d.a === 'mark' && x.stage === 2 && who !== BLIND[2]) {
        const marks = (x.marks || []).filter((m) => m !== d.i);
        marks.push(d.i);
        while (marks.length > 3) marks.shift();
        c.set((s) => (s.x.marks = marks));
        const p = H3.stonePos(d.i);
        c.send('h3fx', ['mark', p]);
        fx('mark', p);
      }
    },
    update(c, dt, t) {
      if (!H3.built) return null;
      const x = c.S.x;
      const p = Player.body.p;
      const q = H3.rel(p);
      const r = c.role;
      const blindRole = BLIND[x.stage];
      const iAmBlind = blindRole === r;
      const rq = Remote.has ? H3.rel(Remote.pos) : null;
      // what this screen shows on the dance floor: only the guide sees the targets
      const tiles = {};
      const d = x.dance || {};
      if ((x.stage === 3 || x.stage === 4) && d.ph === 'run' && !iAmBlind && d.seer) {
        const tg = targetsFor(d, x.stage);
        const pulse = 0.55 + 0.45 * Math.pow(1 - Math.min(1, local.beatT / BEAT[x.stage]), 0.5);
        tiles[tileIdx(tg[r])] = ['#ff5f8a', 0.42 * pulse];
        tiles[tileIdx(tg[blindRole])] = ['#6cc8ff', 0.4 * pulse];
      }
      if (d.ph === 'final' || x.stage === 5) {
        tiles[tileIdx([2, 3])] = ['#ffcf8a', 0.35];
        tiles[tileIdx([4, 3])] = ['#ffcf8a', 0.35];
        tiles[tileIdx([3, 3])] = ['#ff5f8a', x.stage === 5 ? 0.4 : 0.22];
      }
      local.beatT += dt;
      H3.update(dt, t, {
        guide: !iAmBlind,
        tiles,
        beat: d.ph === 'run' ? Math.max(0, 1 - local.beatT * 2) : 0,
        finale: x.stage === 5,
        card: x.stage === 5 && (local.cardShown = (local.cardShown || 0) + dt) > 1.2,
        onPad: (s) => {
          const on = (qq) => qq && Math.hypot(qq.x - s.x, qq.z - s.z) < s.r && qq.y > -0.6 && qq.y < 0.6;
          return on(q) || on(rq);
        },
      });
      // the blindfold
      const want = blindNow(c, q) ? 1 : 0;
      local.sayCd = (local.sayCd || 0) - dt;
      if (want !== local.wantWas && local.sayCd <= 0) {
        if (want) say(c, TXT.blindOn, 2200);
        else if (local.wantWas) say(c, TXT.blindOff, 1800);
        local.sayCd = 8;
      }
      local.wantWas = want;
      local.blindK = damp(local.blindK, want, want ? 2.5 : 3.5, dt);
      drawOverlay(local.blindK, t);
      // holding hands at the end, in the middle of the floor
      if (x.stage === 5 && rq && Math.hypot(q.x - rq.x, q.z - rq.z) < 3) Avatar.together(dt, true);
      // markers sing for whoever is blind (and softly for the guide)
      if (x.stage === 2 && (x.marks || []).length) {
        local.chimeT -= dt;
        if (local.chimeT <= 0) {
          local.chimeT = 1.5;
          (x.marks || []).forEach((m, k) => {
            const sp = H3.stonePos(m);
            if (sp) setTimeout(() => Sound.play('beacon', V3(H3.O.x + sp[0], H3.O.y + 0.3, H3.O.z + sp[2]), 'valet'), k * 380);
          });
        }
      }
      // blind in the maze: a soft rustle when you push into a hedge
      if (iAmBlind && x.stage === 1 && H3.inMaze(q)) {
        const m = Input.move();
        local.rustle -= dt;
        if ((m.x || m.z) && Player.speed < 0.6 && local.rustle <= 0) {
          local.rustle = 0.5;
          Sound.play('step', 0.9);
          Sound.play('creak');
        }
      }
      // ---- section 1: plates and the halfway lantern (checked by the blind one's own client)
      if (x.stage === 1 && iAmBlind) {
        local.plateCd -= dt;
        const pl = H3.plateAt(q);
        if (pl && local.plateCd <= 0) {
          local.plateCd = 2.5;
          const k = H3.maze.plates.indexOf(pl);
          flash(k);
          c.act({ a: 'plate', k, pos: [pl.x, 0, pl.z] });
          setTimeout(() => {
            if (Story.S.phase === 'tr_h3' && Story.S.x.stage === 1) c.spawn(sp(1, r, Story.S.x), 0);
          }, 900);
        }
        if (!x.mid && H3.nearMid(q)) c.act({ a: 'mid', pos: [H3.maze.mid.x, 0, H3.maze.mid.z] });
      }
      // ---- section 2: the island, and the guide's markers
      if (x.stage !== 2 || iAmBlind || !(q.x > 6.5 && q.y > 1.6)) H3.hover(-1, t);
      if (x.stage === 2) {
        if (iAmBlind && !x.isle && H3.onIsland(q)) c.act({ a: 'isle' });
        if (!iAmBlind && q.x > 6.5 && q.y > 1.6) {
          const dir = V3(0, 0, -1).applyQuaternion(R.camera.quaternion);
          const i = H3.stoneFromRay(R.camera.position, dir);
          H3.hover(i, t);
          if (i >= 0) {
            if (Input.pressed('interact')) c.act({ a: 'mark', i });
            return ['E', 'Poser un repère sonore sur cette pierre'];
          }
          return null;
        }
      }
      if ((x.stage === 3 || x.stage === 4) && d.ph === 'idle') HUD.objective(TXT.s3.wait);
      return null;
    },
  });

  // plates flash and their bell swings on both screens
  const flash = (k) => {
    const pm = H3.plateMeshes[k];
    if (pm) pm.flash = 1.2;
  };
})();
