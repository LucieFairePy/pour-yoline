// ♦ V · Le Valet de Carreau (figure dV), the first face of the ♦ table of the Cour. Kits swapped
// (Yoline: valet, William: dame). La Salle des Facettes: six gems on six numbered pedestals, and
// the Valet's secret cut in two. The dame kit sees the gems' colours (not their cut), the valet
// kit sees their cut (not their colour); the Valet whispers a colour clue to one, a cut clue to
// the other. Only one pedestal fits both, and each half alone fits three. One of you takes it
// (it alternates); a wrong gem re-deals. Three gems: the Valet bows.
(() => {
  const CARD = Cards.tagOf('dV');
  const T = CONFIG;
  const W = CourD;
  const TITLE = 'Le Valet de Carreau';
  const VALET = 'Le Valet de Carreau';
  const TXT = {
    intro: 'Épreuve d’esprit. Première figure de Carreau : le Valet.',
    rule: 'Le Valet cache une gemme parmi six. Chacun de vous n’en voit que la moitié.',
    go: 'Entrez dans la Salle des Facettes, au bout du pont.',
    fall: 'Le vide. Retour sur le quai.',
    fallMate: '{mate} est tombé{pe} dans les nuages. {Il} repart du quai.',
    seeCol: 'Tu vois la couleur des gemmes, pas leur taille. {mate} voit leur taille, pas leur couleur.',
    seeCut: 'Tu vois la taille des gemmes, pas leur couleur. {mate} voit leur couleur, pas leur taille.',
    clue: 'Le Valet te souffle : « {c} »',
    obj: '{c} · Gemme {r} / 3 · {who}',
    youPick: 'C’est toi qui prends la gemme (E devant son socle).',
    matePicks: 'C’est {mate} qui la prend : dis-lui laquelle.',
    pick: 'Prendre la gemme {n}',
    notMine: 'C’est {mate} qui prend, cette fois. Dis-lui laquelle.',
    bigOk: 'La bonne gemme · {n} / 3',
    bigNo: 'Pas celle-là',
    swapPick: 'Cette fois, c’est {mate} qui prend.',
    swapPickMe: 'Cette fois, c’est toi qui prends.',
    hint1: 'Comparez vos listes, socle par socle : « I, ambre », « I, en goutte »…',
    hint2: 'Trois socles vont avec ton indice, trois avec celui de {mate}. Un seul est dans les deux listes.',
    done: 'Trois gemmes trouvées. Le Valet de Carreau s’incline.',
    card: 'Sa carte vous attend au milieu de la salle. Allez-y ensemble.',
    clueCol: (v) => 'Elle est ' + v + '.',
    clueColNo: (a, b) => 'Elle n’est ni ' + a + ' ni ' + b + '.',
    clueCut: (v) => 'Elle est taillée ' + v + '.',
    clueCutNo: (a, b) => 'Elle n’est taillée ni ' + a + ' ni ' + b + '.',
    // the Valet's own lines (playful, never cruel)
    v: {
      hello: 'Bienvenue à la table de Carreau. Ici, on joue avec la tête.',
      rules: 'Six gemmes, un secret. Je vous en souffle la moitié chacun.',
      deal: 'Regardez bien. Ou plutôt : écoutez-vous bien.',
      ok: ['Bien vu. À deux, ça va plus vite.', 'Encore ! Vous trichez ? Non : vous parlez.'],
      no: ['Raté. Elle brillait pourtant.', 'Presque. Je rebats.', 'Pas celle-là. Je ne dirai rien… à part l’indice.'],
      won: 'Trois sur trois. La table de Carreau vous salue. Allez voir ma Dame.',
    },
  };
  CONFIG.cards.dV = {
    title: TITLE,
    sub: 'Figure ♦ · réussie',
    lines: ['Six gemmes, un seul secret, coupé en deux.', 'L’un voyait les couleurs, l’autre les tailles.', 'La bonne pierre était là où vos deux moitiés se touchaient.'],
  };

  const NCOL = 4;
  const NCUT = 4;
  // who takes the gem, round by round
  const PICKER = ['valet', 'dame', 'valet'];
  const local = { stage: 0, pend: [], sayCd: {}, objT: 0, hints: {}, resSeen: 0, dealSeen: 0, near: 0, pickCd: 0, roundT: 0 };
  const after = (sec, fn) => local.pend.push({ t: sec, fn });

  // ---------- words ----------
  const fill = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const say = (text, hold) => HUD.say(text, T.master, hold || 2800);
  const vsay = (text, hold) => {
    HUD.say(text, VALET, hold || 2800);
    W.talk('V', Math.min(3, (hold || 2800) / 1000));
    W.AU.ping(81, 0.03);
  };
  const vsayBoth = (c, text, hold) => {
    vsay(text, hold);
    c.send('dVsay', [text, 1, hold || 2800]);
  };
  const sayOnce = (k, text, cd = 8) => {
    if ((local.sayCd[k] || 0) > 0) return;
    local.sayCd[k] = cd;
    say(text);
  };
  const fx = (c, d) => {
    const [k, a] = d;
    if (k === 'ok') {
      Sound.play('chime');
      Sound.play('reveal');
      W.AU.ping(84, 0.06);
      after(0.3, () => W.AU.ping(88, 0.05));
      Fx.burst(W.P(W.PEDS[a].x, 1.7, W.PEDS[a].z), '#ffd27a', 120, 4, 1.3, -3);
    }
    if (k === 'no') {
      Sound.play('shatter');
      Sound.play('glitch');
      Fx.burst(W.P(W.PEDS[a].x, 1.6, W.PEDS[a].z), '#ffffff', 110, 5, 1.1, -6);
    }
    if (k === 'deal') {
      Sound.play('switch');
      W.AU.ping(76, 0.04);
      W.PEDS.forEach((p) => Fx.burst(W.P(p.x, 1.6, p.z), '#ffe2a8', 18, 2, 0.8, -1));
    }
    if (k === 'won') {
      Sound.play('reveal');
      Sound.play('chime');
      Fx.burst(W.P(0, 2.4, 30), '#ffcf6a', 200, 7, 1.8, -2);
      after(0.8, () => Fx.firework(W.P(-4, 0, 30), 18));
      after(1.5, () => Fx.firework(W.P(4, 0, 30), 20));
      W.bolt(W.P(-60, 140, 120), W.P(-20, 12, 60), { gold: true, w: 0.35, flash: 0.9 });
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('dVfx', d);
  };

  // ---------- the deal (host) ----------
  const pickN = (arr, n) => {
    const a = arr.slice();
    const out = [];
    while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
    return out;
  };
  // a clue: { t: 'c' | 'k', neg, v: [values] }; fits(gem)
  const fits = (cl, g) => {
    const v = cl.t === 'c' ? g.c : g.k;
    return cl.neg ? !cl.v.includes(v) : cl.v.includes(v);
  };
  const makeDeal = (round) => {
    for (let tries = 0; tries < 6000; tries++) {
      const gems = [];
      const seen = new Set();
      while (gems.length < 6) {
        const g = { c: Math.floor(Math.random() * NCOL), k: Math.floor(Math.random() * NCUT) };
        if (seen.has(g.c * 10 + g.k)) continue;
        seen.add(g.c * 10 + g.k);
        gems.push(g);
      }
      const negC = round === 3 || (round === 2 && Math.random() < 0.5);
      const negK = round === 3 || (round === 2 && !negC);
      const cc = negC ? { t: 'c', neg: true, v: pickN([0, 1, 2, 3], 2) } : { t: 'c', neg: false, v: [Math.floor(Math.random() * NCOL)] };
      const ck = negK ? { t: 'k', neg: true, v: pickN([0, 1, 2, 3], 2) } : { t: 'k', neg: false, v: [Math.floor(Math.random() * NCUT)] };
      const a = gems.map((g, i) => (fits(cc, g) ? i : -1)).filter((i) => i >= 0);
      const b = gems.map((g, i) => (fits(ck, g) ? i : -1)).filter((i) => i >= 0);
      const both = a.filter((i) => b.includes(i));
      if (both.length !== 1 || a.length < 3 || b.length < 3) continue;
      return { gems, t: both[0], cc, ck };
    }
    return null;
  };
  const deal = (c) => {
    const x = c.S.x;
    const d = makeDeal(x.round);
    if (!d) return;
    c.set((s) => {
      s.x.deal = { n: (s.x.deal ? s.x.deal.n : 0) + 1, gems: d.gems, t: d.t, cc: d.cc, ck: d.ck };
    });
    fxBoth(c, ['deal']);
  };
  const clueText = (cl) => {
    const name = (v) => (cl.t === 'c' ? W.GEMS[v].name : W.CUTS[v]);
    if (cl.t === 'c') return cl.neg ? TXT.clueColNo(name(cl.v[0]), name(cl.v[1])) : TXT.clueCol(name(cl.v[0]));
    return cl.neg ? TXT.clueCutNo(name(cl.v[0]), name(cl.v[1])) : TXT.clueCut(name(cl.v[0]));
  };
  const myClue = (c) => {
    const dl = c.S.x.deal;
    if (!dl) return '';
    return clueText(c.role === 'dame' ? dl.cc : dl.ck);
  };
  const pickerOf = (x) => PICKER[Math.min(2, (x.round || 1) - 1)];

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    if (x.stage === 1) return TXT.go;
    if (x.stage === 3) return TXT.card;
    if (!x.deal) return '';
    const who = pickerOf(x) === c.role ? TXT.youPick : Story.fmt(TXT.matePicks);
    return fill(TXT.obj, { c: fill(TXT.clue, { c: myClue(c) }), r: x.round, who });
  };

  // ---------- light and mood ----------
  const mood = (c, won) => {
    LvKit.mood({
      sky: '#c8a070',
      ground: '#2a1c14',
      hemi: won ? 0.5 : 0.36,
      sun: '#ffd8a0',
      sunI: won ? 0.7 : 0.45,
      sunPos: V3(40, 90, -30),
      exposure: won ? 1.25 : 1.15,
      haze: W.amb.haze,
      extras: [W.amb.motes],
    });
    W.amb.haze.set(won ? '#3a2a20' : '#2a1e1c');
    c.fog(won ? 0.0055 : 0.0068);
    Sound.mood(won ? 'gold' : 'tense');
  };

  const nearPed = (q) => {
    let bi = -1;
    let bd = 1.9;
    W.PEDS.forEach((p) => {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd && q.y < 1.5) {
        bd = d;
        bi = p.i;
      }
    });
    return bi;
  };

  Story.register('tr_dV', {
    world: CourD,
    init: () => ({ stage: 1, cp: 'V', round: 1, deal: null, res: null, miss: 0, won: 0 }),
    voice: () => 1,
    net: {
      dVsay: (c, d) => (d[1] ? vsay(d[0], d[2]) : say(d[0], d[2])),
      dVfx: (c, d) => fx(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.setup('V');
      Object.assign(local, { stage: 0, pend: [], sayCd: {}, objT: 0, hints: {}, resSeen: c.S.x.res ? c.S.x.res.n : 0, dealSeen: 0, near: 0, pickCd: 0, roundT: 0, seeSaid: false });
      c.spawn(W.spawn(c.S.x.cp, c.role), 0);
      Player.killY = W.O.y - 22;
      Player.checkpoint = () => {
        say(TXT.fall, 2400);
        c.send('dVsay', [TXT.fallMate, 0, 2600]);
        return W.spawn(Story.S.x.cp, c.role);
      };
      mood(c, c.S.x.won);
      // the Look pass re-grades the light once the phase has changed: ours goes back on top
      after(0.6, () => Story.S && Story.S.phase === 'tr_dV' && mood(c, Story.S.x.won));
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = false;
      W.AU.set(true);
      HUD.visa(CARD + ' · ' + TITLE);
      if (W.screen) W.screen.show(TITLE, CARD + ' · la Salle des Facettes', '#ffcf7a');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        say(TXT.intro, 3800);
        say(TXT.rule, 4200);
      }
      this.apply(c);
      W.snap();
    },
    exit() {
      Player.killY = -40;
      LvKit.mood(null);
      if (typeof Sky !== 'undefined' && Sky.galaxy) Sky.galaxy.visible = true;
      W.hide();
      local.pend = [];
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      const r = c.role;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (x.stage === 2) {
          if (prev) Sound.play('chime');
          after(prev ? 0.4 : 0, () => {
            vsay(TXT.v.hello, 3000);
            after(3.2, () => vsay(TXT.v.rules, 3200));
          });
        }
        if (x.stage === 3) {
          mood(c, true);
          say(TXT.done, 3000);
          after(0.6, () => vsay(TXT.v.won, 3600));
          after(4.6, () => say(TXT.card, 3600));
        }
      }
      const dl = x.deal;
      if (x.stage === 2 && dl && dl.n !== local.dealSeen) {
        const firstDeal = !local.dealSeen;
        local.dealSeen = dl.n;
        local.roundT = 0;
        if (firstDeal && !local.seeSaid) {
          local.seeSaid = true;
          after(6.6, () => say(r === 'dame' ? TXT.seeCol : TXT.seeCut, 4200));
          after(11, () => say(fill(TXT.clue, { c: myClue(c) }), 3600));
        } else after(0.5, () => say(fill(TXT.clue, { c: myClue(c) }), 3200));
      }
      if (x.res && x.res.n !== local.resSeen) {
        local.resSeen = x.res.n;
        if (x.res.ok) {
          W.big(fill(TXT.bigOk, { n: x.res.r }), 1.8);
          if (x.stage === 2) after(2.2, () => W.big(pickerOf(x) === r ? TXT.swapPickMe : TXT.swapPick, 2.2, '#ffffff'));
        } else W.big(TXT.bigNo, 1.6, '#ff6a7a');
      }
      // the world follows the shared state
      const S = W.ST;
      S.gemView = r === 'dame' ? 'col' : 'cut';
      const fresh = x.res && dl && x.res.dn === dl.n;
      S.gems = x.stage >= 2 && dl ? dl.gems.map((g, i) => (fresh && !x.res.ok && x.res.i === i ? null : g)) : null;
      S.take = x.stage >= 2 && fresh && x.res.ok ? x.res.i : -1;
      S.gateA = 0;
      W.figs.V.st.bow = x.won ? 1 : 0;
      S.card = x.stage === 3 ? [0, 1.9, 30] : null;
      HUD.objective(Story.fmt(objective(c)));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const qd = W.rel(c.pos('dame'));
      const qv = W.rel(c.pos('valet'));
      if (x.stage === 1 && W.at('A', qd) && W.at('A', qv))
        c.set((s) => {
          s.x.stage = 2;
          s.x.cp = 'A';
        });
      if (x.stage === 2 && !x.deal && !local.dealPend) {
        local.dealPend = true;
        after(6.5, () => {
          local.dealPend = false;
          if (Story.S && Story.S.phase === 'tr_dV' && Story.S.x.stage === 2 && !Story.S.x.deal) {
            deal(c);
            vsayBoth(c, TXT.v.deal, 2600);
          }
        });
      }
      if (x.stage === 3) {
        const near = (q) => Math.hypot(q.x, q.z - 30) < 4 && q.y > -0.5;
        local.near = near(qd) && near(qv) ? local.near + dt : 0;
        if (local.near > 1.2) c.goto('reward', (s) => (s.x.card = 'dV'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a !== 'take') return;
      const dl = x.deal;
      if (x.stage !== 2 || !dl || d.n !== dl.n || local.dealPend) return;
      if (x.res && x.res.dn === dl.n) return;
      if (who !== pickerOf(x)) return;
      const q = W.rel(c.pos(who));
      const p = W.PEDS[d.i];
      if (!p || Math.hypot(q.x - p.x, q.z - p.z) > 2.4) return;
      const ok = d.i === dl.t;
      const r = x.round;
      c.set((s) => {
        s.x.res = { n: (s.x.res ? s.x.res.n : 0) + 1, dn: dl.n, i: d.i, ok: ok ? 1 : 0, r };
        if (ok) s.x.round = r + 1;
        else s.x.miss = (s.x.miss || 0) + 1;
        if (ok && r >= 3) {
          s.x.stage = 3;
          s.x.won = 1;
        }
      });
      fxBoth(c, [ok ? 'ok' : 'no', d.i]);
      if (ok && r >= 3) {
        after(1.2, () => fxBoth(c, ['won']));
        return;
      }
      vsayBoth(c, ok ? TXT.v.ok[(r - 1) % TXT.v.ok.length] : TXT.v.no[(x.miss || 0) % TXT.v.no.length], 2400);
      local.dealPend = true;
      after(ok ? 3.2 : 2.6, () => {
        local.dealPend = false;
        if (!Story.S || Story.S.phase !== 'tr_dV' || Story.S.x.stage !== 2) return;
        deal(c);
      });
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = W.rel(p);
      Object.keys(local.sayCd).forEach((k) => (local.sayCd[k] -= dt));
      for (let i = local.pend.length - 1; i >= 0; i--) {
        const e = local.pend[i];
        e.t -= dt;
        if (e.t <= 0) {
          local.pend.splice(i, 1);
          e.fn();
        }
      }
      local.pickCd = Math.max(0, local.pickCd - dt);
      let prompt = null;
      const pressed = Input.pressed('interact');
      const dl = x.deal;
      if (x.stage === 2 && dl && !(x.res && x.res.dn === dl.n)) {
        local.roundT += dt;
        const bi = nearPed(q);
        if (bi >= 0) {
          if (pickerOf(x) === r) {
            prompt = ['E', fill(TXT.pick, { n: W.ROMAN[bi] }), false];
            if (pressed && !local.pickCd) {
              local.pickCd = 1;
              c.act({ a: 'take', i: bi, n: dl.n });
            }
          } else {
            prompt = ['E', Story.fmt(TXT.notMine), false];
            if (pressed) sayOnce('notMine', Story.fmt(TXT.notMine), 5);
          }
        }
        if (((x.miss || 0) >= 1 || local.roundT > 50) && !local.hints.h1) {
          local.hints.h1 = true;
          after(2.5, () => say(TXT.hint1, 4200));
        }
        if (((x.miss || 0) >= 3 || local.roundT > 100) && !local.hints.h2) {
          local.hints.h2 = true;
          after(2.5, () => say(Story.fmt(TXT.hint2), 4600));
        }
      }
      W.update(dt, t, p);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(Story.fmt(objective(c)));
      }
      if (x.stage === 3) return null;
      return prompt;
    },
  });
})();
