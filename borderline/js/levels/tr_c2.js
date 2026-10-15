// ♣ 4 · Le Téléphone. Three rooms of asymmetric calls (see js/world/tr_c2.js for the places).
// Round 1 « Le Cadran »: the reader stands in the booth and reads the turning drum, the other
// one dials it. Round 2 « Le Standard »: the reader sees the connections from the gallery, the
// other carries the plugs. Round 3 « L'Appel »: back to back, the caller changes every call,
// and the last button must be pressed by both at the same moment. A mistake only resets the
// current call. Host-authoritative: every action goes through c.act, every effect through S.x.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('c2');
  const T = CONFIG;
  const W = TrC2;
  const SYMS = W.SYMS;
  const TX = {
    title: 'Le Téléphone',
    card: CARD,
    intro: 'Épreuve de communication. Les Veilleurs ont branché tous vos fils dans le même central.',
    r1: {
      dame: 'Le Cadran : entre dans la cabine vitrée. Le tambour fait défiler un numéro : lis-le à {mate}, symbole par symbole, à partir de l’étoile.',
      valet:
        'Le Cadran : {mate} va dans la cabine et lit un numéro. Toi, compose-le au grand cadran : monte sur le bon symbole et appuie (E).',
    },
    r2: {
      dame: 'Le Standard : monte à la galerie de l’opératrice. Ton tableau dit quelles lignes relier. Dis-le à {mate}.',
      valet:
        'Le Standard : prends une fiche sous un nom (E), porte-la jusqu’au bon numéro (E). C’est {mate} qui sait lesquels, depuis la galerie.',
    },
    r3: 'L’Appel : chacun sa console, dos à dos. Quand ton écran dit « Tu appelles », lis ta suite à {mate}. Quand il dit « Tu décroches », écoute et appuie dans l’ordre.',
    final: 'Dernier appel : montez chacun sur votre cœur, et appuyez (E) au même instant. Comptez ensemble.',
    cardObj: 'Le combiné se décroche. La carte ' + CARD + ' descend : allez-y ensemble.',
    calls: 'Appel',
    ring: ['Ça sonne ! Appel transmis.', 'Allô ? La ligne tient.', 'Connexion établie.'],
    alarm: [
      'Mauvais numéro ! Le standard s’étrangle. On reprend cet appel.',
      'Bip-bip-bip… Ce numéro n’est pas attribué. Encore une fois.',
      'Un opérateur fantôme vous raccroche au nez. On recommence cet appel.',
      'La sonnerie hurle. Les valves clignotent. Cet appel recommence.',
    ],
    wrongPlug: 'Mauvaise ligne : toutes les fiches sautent, et le tableau de l’opératrice change.',
    timeout: 'Trop lent : la ligne a coupé. Nouvel appel.',
    early: '{mate} n’a pas appuyé en même temps. Recomptez ensemble.',
    win2: 'Toutes les lignes sont branchées.',
    winAll: 'Les deux appels n’en font qu’un.',
  };
  CONFIG.cards.c2 = {
    title: 'Le Téléphone',
    sub: 'Épreuve ♣ · réussie',
    lines: [
      'Chacun avait la moitié du message.',
      'Aucun ne pouvait le dire seul.',
      'Vous vous êtes entendus sans vous voir.',
    ],
  };

  const R1_LEN = [3, 4];
  const R3 = [
    ['dame', 3, 32],
    ['valet', 3, 32],
    ['dame', 4, 38],
    ['valet', 4, 38],
  ];
  const GO_WINDOW = 0.7;
  const seq = (n) => Array.from({ length: n }, () => (Math.random() * 4) | 0);
  const pairs = () => {
    const l = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
    const r = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
    return l.map((v, i) => [v, r[i]]);
  };
  const local = { round: 0, alarm: 0, ring: 0, dn: 0, tm: 0, said: '', near: 0 };
  // r3 / r3ref / r3s: the host's clock for the current call, committed to the shared state twice a second
  const tm = { near: 0, beat: 0, r3: 0, r3ref: null, r3s: 0 };
  const q = V3();
  const qo = V3();
  const hl = V3();
  const hr = V3();

  const other = (w) => (w === 'dame' ? 'valet' : 'dame');
  const pressPlate = (id) => {
    const p = W.plates.find((pp) => pp.id === id);
    if (p) p.press = 1;
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- host helpers ----------
  const alarm = (c, line) =>
    c.set((s) => {
      s.x.alarm = (s.x.alarm || 0) + 1;
      s.x.alarmLine = line || pick(TX.alarm);
    });
  const ring = (c, where) =>
    c.set((s) => {
      s.x.ring = (s.x.ring || 0) + 1;
      s.x.ringAt = where;
    });

  const newR3 = (s, sub) => {
    const [caller, n] = R3[sub];
    s.x.r3 = { sub, caller, seq: seq(n), prog: 0, t: 0, final: false, pressT: { dame: 0, valet: 0 }, beat: 0 };
  };

  // ---------- displays (drawn only on the screen of whoever must read them) ----------
  const fmt = (s) => Story.fmt(s);
  const bez = (g, W2, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#140a10');
    gr.addColorStop(1, '#060205');
    g.fillStyle = gr;
    g.fillRect(0, 0, W2, H);
    g.globalAlpha = 0.07;
    g.fillStyle = '#ffb060';
    for (let y = 0; y < H; y += 5) g.fillRect(0, y, W2, 1);
    g.globalAlpha = 1;
    g.strokeStyle = '#d4ab55';
    g.lineWidth = Math.max(5, W2 / 180);
    g.strokeRect(W2 * 0.015, H * 0.03, W2 * 0.97, H * 0.94);
  };
  const txt = (g, s, x, y, px, col, mono) => {
    g.fillStyle = col;
    g.font = mono ? `${px}px "IBM Plex Mono", monospace` : `italic ${px}px "Bodoni Moda", Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    Icons.fillText(g, s, x, y);
  };
  const sym = (g, i, x, y, size, alpha = 1) => {
    const s = SYMS[i];
    g.globalAlpha = alpha;
    g.fillStyle = s === '♥' || s === '♦' ? '#ff4a62' : '#f3e7d6';
    Icons.draw(g, Icons.of(s), x, y, size);
    g.globalAlpha = 1;
  };
  const star = (g, cx, cy, r) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.42 : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  const frosted = (g, W2, H, line) => {
    const gr = g.createLinearGradient(0, 0, W2, H);
    gr.addColorStop(0, '#2a2030');
    gr.addColorStop(1, '#14101a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W2, H);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * W2, Math.random() * H, 3, 3);
    }
    txt(g, '· · ·', W2 / 2, H * 0.42, H * 0.22, '#c9a0a8');
    txt(g, line, W2 / 2, H * 0.72, H * 0.07, '#c9a0a8', true);
  };

  const drawDrum = (c, x, t) => {
    const p = W.panels.drum;
    const r1 = x.r1;
    if (c.role !== 'dame') {
      p.draw('frost', (g, W2, H) => frosted(g, W2, H, fmt('CABINE OCCUPÉE · ÉCOUTE {mate}').toUpperCase()));
      return;
    }
    const inB = W.inBooth(W.rel(Player.body.p, q));
    if (!inB || x.round !== 1) {
      p.draw('out' + x.round, (g, W2, H) => {
        bez(g, W2, H);
        txt(g, x.round === 1 ? 'Entre dans la cabine' : 'Ligne terminée', W2 / 2, H * 0.45, H * 0.13, '#f0d79a');
        txt(g, x.round === 1 ? 'POUR ÉCOUTER LE NUMÉRO' : '♣', W2 / 2, H * 0.68, H * 0.07, '#c9a0a8', true);
      });
      return;
    }
    // the drum turns: each symbol 1.3 s, then a 0.5 s gap; the cycle starts on a gold star
    const n = r1.seq.length;
    const per = 1.8;
    const cyc = (n + 1) * per;
    const ph = t % cyc;
    const slot = Math.floor(ph / per);
    const inGap = ph % per > 1.3;
    const k = `${r1.call}|${r1.seq.join('')}|${slot}|${inGap}|${r1.prog}`;
    p.draw(k, (g, W2, H) => {
      bez(g, W2, H);
      txt(g, `${TX.calls} ${r1.call + 1} / ${R1_LEN.length}`, W2 / 2, H * 0.1, H * 0.06, '#c9a0a8', true);
      // drum window
      const wx = W2 * 0.3;
      const wy = H * 0.18;
      const ww = W2 * 0.4;
      const wh = H * 0.52;
      const gr = g.createLinearGradient(0, wy, 0, wy + wh);
      gr.addColorStop(0, '#000');
      gr.addColorStop(0.5, '#2a1a10');
      gr.addColorStop(1, '#000');
      g.fillStyle = gr;
      g.fillRect(wx, wy, ww, wh);
      g.strokeStyle = '#d4ab55';
      g.lineWidth = 10;
      g.strokeRect(wx, wy, ww, wh);
      if (slot === 0) {
        if (!inGap) {
          g.fillStyle = '#f0d79a';
          star(g, W2 / 2, wy + wh / 2, wh * 0.26);
          txt(g, 'DÉBUT', W2 / 2, wy + wh * 0.9, H * 0.05, '#f0d79a', true);
        }
      } else if (!inGap) sym(g, r1.seq[slot - 1], W2 / 2, wy + wh / 2, wh * 0.66);
      // position dots: which symbol is showing, which are dialed
      for (let i = 0; i < n; i++) {
        const cx = W2 / 2 + (i - (n - 1) / 2) * W2 * 0.09;
        const cy = H * 0.84;
        g.beginPath();
        g.arc(cx, cy, H * 0.03, 0, Math.PI * 2);
        g.fillStyle = i < r1.prog ? '#7cf0a8' : i === slot - 1 ? '#f0d79a' : '#3a2a20';
        g.fill();
        g.strokeStyle = '#d4ab55';
        g.lineWidth = 4;
        g.stroke();
      }
    });
  };

  const drawList = (c, x) => {
    const p = W.panels.list;
    if (c.role !== 'dame') {
      p.draw('frost', (g, W2, H) => frosted(g, W2, H, 'RÉSERVÉ À L’OPÉRATRICE'));
      return;
    }
    const up = W.onGallery(W.rel(Player.body.p, q));
    const r2 = x.r2;
    const k = up + '|' + x.round + '|' + JSON.stringify(r2.conn) + JSON.stringify(r2.pairs);
    p.draw(k, (g, W2, H) => {
      bez(g, W2, H);
      if (x.round < 2) {
        txt(g, 'Le standard dort', W2 / 2, H / 2, H * 0.1, '#c9a0a8');
        return;
      }
      if (!up) {
        txt(g, 'Monte à la galerie', W2 / 2, H * 0.42, H * 0.12, '#f0d79a');
        txt(g, 'LE TABLEAU DE L’OPÉRATRICE', W2 / 2, H * 0.66, H * 0.06, '#c9a0a8', true);
        return;
      }
      txt(g, x.round > 2 ? 'Toutes les lignes tiennent' : 'Lignes à brancher', W2 / 2, H * 0.13, H * 0.08, '#f0d79a');
      r2.pairs.forEach(([l, r], i) => {
        const y = H * (0.34 + i * 0.2);
        const ok = r2.conn[l] === r;
        g.fillStyle = ok ? 'rgba(124,240,168,.12)' : 'rgba(255,255,255,.03)';
        g.fillRect(W2 * 0.08, y - H * 0.08, W2 * 0.84, H * 0.16);
        txt(g, W.L_NAMES[l], W2 * 0.32, y, H * 0.1, '#f3e7d6');
        txt(g, '→', W2 * 0.55, y, H * 0.09, '#d4ab55', true);
        txt(g, String(r + 1), W2 * 0.68, y, H * 0.12, '#f3e7d6');
        if (ok) {
          g.fillStyle = '#7cf0a8';
          Icons.draw(g, 'square-check', W2 * 0.85, y, H * 0.11);
        }
      });
    });
  };

  const drawConsole = (c, x, who, t) => {
    const p = W.panels['c_' + who];
    const r3 = x.r3;
    if (who !== c.role) {
      p.draw('idle', (g, W2, H) => {
        bez(g, W2, H);
        txt(g, '♣', W2 / 2, H / 2, H * 0.4, '#3a2a20');
      });
      return;
    }
    if (x.round < 3) {
      p.draw('wait', (g, W2, H) => {
        bez(g, W2, H);
        txt(g, 'En attente d’un appel', W2 / 2, H / 2, H * 0.1, '#c9a0a8');
      });
      return;
    }
    if (x.round >= 4) {
      p.draw('done', (g, W2, H) => {
        bez(g, W2, H);
        txt(g, 'Allô ?', W2 / 2, H * 0.45, H * 0.2, '#ff8fb0');
        txt(g, 'LA LIGNE EST À VOUS', W2 / 2, H * 0.72, H * 0.07, '#c9a0a8', true);
      });
      return;
    }
    if (r3.final) {
      const beat = r3.beat;
      const words = ['3', '2', '1', 'MAINTENANT'];
      const pressed = r3.pressT[who] > 0;
      p.draw('fin' + beat + pressed, (g, W2, H) => {
        bez(g, W2, H);
        txt(g, 'Ensemble', W2 / 2, H * 0.15, H * 0.09, '#f0d79a');
        txt(g, words[beat], W2 / 2, H * 0.48, beat === 3 ? H * 0.2 : H * 0.36, beat === 3 ? '#ff8fb0' : '#f3e7d6');
        txt(
          g,
          pressed ? fmt('TU AS APPUYÉ · ET {mate} ?') : fmt('MONTE SUR TON CŒUR · APPUIE AVEC {mate}'),
          W2 / 2,
          H * 0.84,
          H * 0.06,
          '#c9a0a8',
          true,
        );
      });
      return;
    }
    const caller = r3.caller === who;
    const lim = R3[r3.sub][2];
    // the timer runs locally from the shared clock (the host decides the timeout); a guest that
    // drifted (reconnect, missed reset) snaps back to it
    const ck = r3.sub + '|' + r3.seq.join('');
    const ref = Net.isHost ? tm.r3 : r3.t;
    if (local.ck !== ck || Math.abs(t - local.t0 - ref) > 1) {
      local.ck = ck;
      local.t0 = t - ref;
    }
    const left = Math.max(0, lim - (t - local.t0));
    const k = `${r3.sub}|${r3.seq.join('')}|${r3.prog}|${Math.ceil(left * 2)}|${caller}`;
    p.draw(k, (g, W2, H) => {
      bez(g, W2, H);
      txt(g, `${TX.calls} ${r3.sub + 1} / ${R3.length}`, W2 * 0.13, H * 0.1, H * 0.05, '#c9a0a8', true);
      txt(g, caller ? 'Tu appelles' : 'Tu décroches', W2 / 2, H * 0.17, H * 0.11, caller ? '#f0d79a' : '#ff8fb0');
      const n = r3.seq.length;
      for (let i = 0; i < n; i++) {
        const cx = W2 / 2 + (i - (n - 1) / 2) * W2 * 0.17;
        const cy = H * 0.5;
        g.fillStyle = i < r3.prog ? 'rgba(124,240,168,.14)' : 'rgba(255,255,255,.04)';
        g.fillRect(cx - W2 * 0.07, cy - H * 0.17, W2 * 0.14, H * 0.34);
        g.strokeStyle = i < r3.prog ? '#7cf0a8' : '#5a4030';
        g.lineWidth = 5;
        g.strokeRect(cx - W2 * 0.07, cy - H * 0.17, W2 * 0.14, H * 0.34);
        if (caller || i < r3.prog) sym(g, r3.seq[i], cx, cy, H * 0.24, caller && i < r3.prog ? 0.45 : 1);
        else txt(g, '?', cx, cy, H * 0.2, '#5a4030');
      }
      txt(
        g,
        caller ? fmt('LIS TA SUITE À {mate}, DANS L’ORDRE') : fmt('ÉCOUTE {mate} · APPUIE SUR TES PLAQUES'),
        W2 / 2,
        H * 0.78,
        H * 0.055,
        '#c9a0a8',
        true,
      );
      // soft timer: a bar of valves that go out one by one
      const fr = left / lim;
      g.fillStyle = '#2a1a10';
      g.fillRect(W2 * 0.1, H * 0.88, W2 * 0.8, H * 0.04);
      g.fillStyle = fr > 0.3 ? '#ffb060' : '#ff4a62';
      g.fillRect(W2 * 0.1, H * 0.88, W2 * 0.8 * fr, H * 0.04);
    });
  };

  const drawDialSign = (x) => {
    const p = W.panels.dialSign;
    const r1 = x.r1;
    p.draw(x.round + '|' + r1.call + '|' + r1.prog, (g, W2, H) => {
      bez(g, W2, H);
      txt(
        g,
        x.round > 1 ? 'Appels transmis' : `${TX.calls} ${r1.call + 1} / ${R1_LEN.length} · ${r1.prog} / ${r1.seq.length}`,
        W2 / 2,
        H / 2,
        H * 0.42,
        '#f0d79a',
      );
    });
  };

  // ---------- round changes ----------
  const roundEnter = (c, r, first) => {
    local.round = r;
    const role = c.role;
    if (r === 1) HUD.objective(TX.r1[role]);
    if (r === 2) {
      HUD.objective(TX.r2[role]);
      if (!first) {
        Sound.play('door');
        HUD.say(TX.r2[role], T.master, 4200);
      }
    }
    if (r === 3) {
      HUD.objective(TX.r3);
      if (!first) {
        Sound.play('door');
        HUD.say(TX.win2, T.master, 2200);
      }
    }
    if (r === 4) {
      HUD.objective(TX.cardObj);
      Sound.play('reveal');
      Sound.play('card');
      HUD.say(TX.winAll, T.master, 2600);
      Fx.hearts(W.phonePos());
    }
  };

  Story.register('tr_c2', {
    init: () => ({
      round: 1,
      r1: { call: 0, seq: seq(R1_LEN[0]), prog: 0, dn: 0, last: 0 },
      r2: { pairs: pairs(), conn: {}, hold: null },
      r3: { sub: 0, caller: 'dame', seq: seq(3), prog: 0, t: 0, final: false, pressT: { dame: 0, valet: 0 }, beat: 0 },
      alarm: 0,
      alarmLine: '',
      ring: 0,
      ringAt: null,
    }),
    voice: () => 1,
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      local.round = 0;
      local.alarm = c.S.x.alarm || 0;
      local.ring = c.S.x.ring || 0;
      local.dn = c.S.x.r1.dn || 0;
      local.kn = c.S.x.kn || 0;
      c.spawn(W.spawn(c.S.x.round, c.role), 0);
      Player.killY = W.O.y - 20;
      Player.checkpoint = () => W.spawn(Story.S.x.round, c.role);
      Player.targets = null;
      City.mood({});
      c.fog(0.006);
      Sound.mood('calm');
      HUD.visa(TX.card + ' · ' + TX.title);
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TX.intro, T.master, 3600);
      this.apply(c, true);
    },
    exit() {
      Player.targets = null;
      local.close = false;
      W.hide();
    },
    apply(c, first) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.round !== local.round) roundEnter(c, x.round, first === true || local.round === 0);
      if ((x.alarm || 0) !== local.alarm) {
        local.alarm = x.alarm || 0;
        W.events.alarm();
        HUD.say(x.alarmLine || pick(TX.alarm), T.master, 2400);
        Cam.shake = Math.max(Cam.shake || 0, 0.25);
      }
      if ((x.ring || 0) !== local.ring) {
        local.ring = x.ring || 0;
        W.events.ring(x.ringAt ? V3(...x.ringAt) : null);
      }
      if ((x.r1.dn || 0) !== local.dn) {
        local.dn = x.r1.dn || 0;
        W.events.dial(x.r1.last);
        pressPlate('dial' + x.r1.last);
      }
      // the partner's key presses in room C: the plate sinks and clicks on both screens
      if ((x.kn || 0) !== local.kn) {
        local.kn = x.kn || 0;
        if (x.kp) pressPlate(x.kp);
        Sound.play('tile');
      }
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.round === 3) {
        const r3 = x.r3;
        if (!r3.final) {
          if (tm.r3ref !== r3) {
            tm.r3ref = r3;
            tm.r3 = r3.t;
            tm.r3s = 0;
          }
          tm.r3 += dt;
          tm.r3s += dt;
          if (tm.r3s > 0.5) {
            tm.r3s = 0;
            const v = tm.r3;
            c.set((s) => (s.x.r3.t = v));
          }
          if (tm.r3 > R3[r3.sub][2]) {
            c.set((s) => newR3(s, s.x.r3.sub));
            alarm(c, TX.timeout);
          }
        } else {
          // a shared count: 3, 2, 1, now… on a loop, so both can press together
          tm.beat += dt;
          const b = Math.floor(tm.beat / 0.9) % 4;
          if (b !== r3.beat) c.set((s) => (s.x.r3.beat = b));
          const now = performance.now() / 1000;
          ['dame', 'valet'].forEach((w) => {
            const pt = r3.pressT[w];
            if (pt > 0 && now - pt > GO_WINDOW && !(r3.pressT[other(w)] > 0)) {
              c.set((s) => (s.x.r3.pressT[w] = 0));
              Sound.play('rune', false);
              c.send('c2early', w);
              if (w === c.role) HUD.say(TX.early, T.master, 1800);
            }
          });
        }
      }
      // a plug carried too far from the board springs back to its socket
      if (x.round === 2 && x.r2.hold) {
        const hp = W.rel(c.pos(x.r2.hold.who), q);
        if (hp.x < 4 || hp.z < 39 || hp.z > 69.5) {
          c.set((s) => (s.x.r2.hold = null));
          c.send('c2drop', 1);
          Sound.play('switch');
        }
      }
      if (x.round === 4) {
        const both = W.nearCard(W.rel(c.pos('dame'), q)) && W.nearCard(W.rel(c.pos('valet'), qo));
        tm.near = both ? tm.near + dt : 0;
        if (tm.near > 1) c.goto('reward', (s) => (s.x.card = 'c2'));
      }
    },
    net: {
      c2drop: () => Sound.play('switch'),
      c2early: (c, w) => {
        if (w === c.role) HUD.say(TX.early, T.master, 1800);
      },
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'dial' && x.round === 1 && who === 'valet') {
        const r1 = x.r1;
        const ok = r1.seq[r1.prog] === d.i;
        c.set((s) => {
          s.x.r1.dn += 1;
          s.x.r1.last = d.i;
        });
        if (!ok) {
          alarm(c);
          c.set((s) => {
            s.x.r1.prog = 0;
            s.x.r1.seq = seq(R1_LEN[s.x.r1.call]);
          });
          return;
        }
        c.set((s) => (s.x.r1.prog += 1));
        if (x.r1.prog >= x.r1.seq.length) {
          ring(c, W.P(8.8, 4.8, 24).toArray());
          if (x.r1.call + 1 >= R1_LEN.length) c.set((s) => (s.x.round = 2));
          else
            c.set((s) => {
              s.x.r1.call += 1;
              s.x.r1.prog = 0;
              s.x.r1.seq = seq(R1_LEN[s.x.r1.call]);
            });
        }
      }
      if (d.a === 'grab' && x.round === 2 && who === 'valet') {
        const r2 = x.r2;
        if (r2.hold && r2.hold.l === d.l) return c.set((s) => (s.x.r2.hold = null));
        if (r2.hold) return;
        c.set((s) => {
          delete s.x.r2.conn[d.l];
          s.x.r2.hold = { who, l: d.l };
        });
        Sound.play('switch');
      }
      if (d.a === 'plug' && x.round === 2 && x.r2.hold && x.r2.hold.who === who) {
        const r2 = x.r2;
        if (Object.values(r2.conn).includes(d.r)) return;
        const l = r2.hold.l;
        const good = r2.pairs.some(([a, b]) => a === l && b === d.r);
        if (!good) {
          // every plug springs back and the operator's list is drawn again: no plugging
          // your way through by trial and error without the one on the gallery
          c.set((s) => {
            s.x.r2.hold = null;
            s.x.r2.conn = {};
            s.x.r2.pairs = pairs();
          });
          alarm(c, TX.wrongPlug);
          return;
        }
        c.set((s) => {
          s.x.r2.conn[l] = d.r;
          s.x.r2.hold = null;
        });
        ring(c, W.sockPos('R', d.r).toArray());
        const all = r2.pairs.every(([a, b]) => (a === l ? d.r : r2.conn[a]) === b);
        if (all) c.set((s) => (s.x.round = 3));
      }
      if (d.a === 'key' && x.round === 3 && !x.r3.final && who !== x.r3.caller) {
        const r3 = x.r3;
        c.set((s) => {
          s.x.kn = (s.x.kn || 0) + 1;
          s.x.kp = 'c' + who[0] + d.i;
        });
        if (r3.seq[r3.prog] !== d.i) {
          c.set((s) => {
            s.x.r3.prog = 0;
            s.x.r3.seq = seq(R3[s.x.r3.sub][1]);
            s.x.r3.t = 0;
            tm.r3 = 0;
          });
          alarm(c);
          return;
        }
        c.set((s) => (s.x.r3.prog += 1));
        if (r3.prog >= r3.seq.length) {
          ring(c, W.phonePos().toArray());
          if (r3.sub + 1 >= R3.length) {
            tm.beat = 0;
            c.set((s) => {
              s.x.r3.final = true;
              s.x.r3.beat = 0;
              s.x.r3.pressT = { dame: 0, valet: 0 };
            });
          } else c.set((s) => newR3(s, s.x.r3.sub + 1));
        }
      }
      if (d.a === 'go' && x.round === 3 && x.r3.final) {
        const now = performance.now() / 1000;
        const ot = x.r3.pressT[other(who)];
        if (ot > 0 && now - ot <= GO_WINDOW) {
          c.set((s) => {
            s.x.r3.pressT[who] = now;
            s.x.round = 4;
          });
          ring(c, W.phonePos().toArray());
        } else c.set((s) => (s.x.r3.pressT[who] = now));
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      W.update(dt, t, { round: x.round, ringing: x.round === 3 && !x.r3.final ? x.r3.prog > 0 : x.round === 3 });
      W.lamps(x, c.role);
      Player.avatar.hand(hl);
      if (Remote.has) Remote.hand(hr);
      else hr.copy(hl);
      W.cables(x, c.role, hl, hr);
      drawDrum(c, x, t);
      drawList(c, x);
      drawConsole(c, x, 'dame', t);
      drawConsole(c, x, 'valet', t);
      drawDialSign(x);

      const me = W.rel(Player.body.p, q);
      const role = c.role;
      // in the booth the camera comes close, so the drum is readable over the shoulder
      const close = x.round === 1 && W.inBooth(me);
      local.close = close;
      if (close) Cam.dist = 2.3;
      const pl = W.plateAt(me);
      W.plates.forEach((p) => (p.halo.material.opacity = p === pl ? 0.85 : 0));
      let prompt = null;
      if (x.round === 1 && pl && pl.id.startsWith('dial')) {
        if (role === 'valet') {
          prompt = ['E', 'Composer ' + pl.lab];
          if (Input.pressed('interact')) c.act({ a: 'dial', i: SYMS.indexOf(pl.lab) });
        } else prompt = ['', ''];
      }
      if (x.round === 2 && role === 'valet') {
        const so = W.socketAt(me);
        const hold = x.r2.hold;
        if (so && so.kind === 'L') {
          if (hold && hold.l === so.i) prompt = ['E', 'Reposer la fiche'];
          else if (!hold) prompt = ['E', x.r2.conn[so.i] != null ? 'Débrancher « ' + W.L_NAMES[so.i] + ' »' : 'Prendre la fiche « ' + W.L_NAMES[so.i] + ' »'];
          if (prompt && Input.pressed('interact')) c.act({ a: 'grab', l: so.i });
        }
        if (so && so.kind === 'R' && hold && hold.who === role) {
          const used = Object.values(x.r2.conn).includes(so.i);
          if (!used) {
            prompt = ['E', 'Brancher sur le ' + (so.i + 1)];
            if (Input.pressed('interact')) c.act({ a: 'plug', r: so.i });
          }
        }
      }
      if (x.round === 3 && pl) {
        if (!x.r3.final && pl.id.startsWith('c' + role[0]) && x.r3.caller !== role) {
          prompt = ['E', 'Appuyer ' + pl.lab];
          if (Input.pressed('interact')) {
            c.act({ a: 'key', i: SYMS.indexOf(pl.lab) });
          }
        }
        if (x.r3.final && pl.id === 'go_' + role) {
          prompt = ['E', 'Appuyer ensemble'];
          if (Input.pressed('interact')) {
            pl.press = 1;
            Sound.play('switch');
            c.act({ a: 'go' });
          }
        }
      }
      return prompt;
    },
  });
})();
