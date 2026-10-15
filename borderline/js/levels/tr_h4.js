// ♥ 5 · La Lanterne. One lantern for two: share the light, hand it over, leave it on a post so the
// other can cross, walk back blind on the partner's voice, then kindle the Great Shadow's braziers.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('h4');
  const T = CONFIG;
  const TITLE = 'La Lanterne';
  const TXT = {
    intro: 'Épreuve de confiance. Une forêt sans soleil, et une seule lanterne pour deux.',
    rule: 'Les pierres de lumière n’existent que dans sa lueur. Les ombres se figent dans la lumière… et chassent dans le noir.',
    give: 'E près de l’autre : lui donner la lanterne. E près d’un crochet : la poser ou la reprendre.',
    take: 'Une seule lanterne, sur le socle. Prenez-la (E).',
    s1: {
      bearer: 'Avance avec la lanterne. {mate} ne voit les pierres que si tu restes près.',
      other: 'Reste dans la lumière de {mate}. Hors de sa lueur, les pierres disparaissent.',
    },
    s2: {
      dameLamp: 'Le gouffre : grappin sur l’anneau (F), puis pose la lanterne sur le crochet, de l’autre côté (E).',
      dameAsk: 'Demande la lanterne à {mate} : c’est toi qui traverses avec. Sans elle, l’anneau ne répond pas.',
      valetGive: 'Donne la lanterne à {mate} (E près d’{lui}) : seul{pe} {il} peut traverser le gouffre.',
      valetWait: 'Attends que {mate} pose la lanterne de l’autre côté : un pont de lumière apparaîtra.',
      bridgeValet: 'Le pont de lumière est là. Traverse, il ne vit que tant que la lanterne reste posée.',
      bridgeDame: 'Le pont existe tant que la lanterne reste sur son crochet. Guide {mate}.',
    },
    s3: {
      valetLamp: 'La falaise : double saut, puis pose la lanterne sur le crochet, en haut (E). Un escalier de lumière naîtra pour {mate}.',
      valetAsk: 'Reprends la lanterne (sur le crochet, ou demande-la à {mate}) : c’est toi qui grimpes.',
      dameGive: 'Donne la lanterne à {mate} (E) : seul{pe} {il} peut grimper la falaise.',
      dameWait: 'Attends la lanterne en haut de la falaise : l’escalier n’apparaît que dans sa lueur.',
      stairDame: 'L’escalier de lumière est là. Monte.',
      stairValet: 'Ta lanterne porte l’escalier. Attends {mate} en haut.',
      onward: 'Reprenez la lanterne et descendez au ravin des deux tours.',
    },
    s4: {
      dameLamp: 'La tour : grappin sur l’anneau tout en haut (F), puis pose la lanterne sur le crochet (E). Sa lumière fera naître le chemin de {mate}.',
      dameAsk: 'Demande la lanterne à {mate} : c’est toi qui montes sur la tour.',
      valetGive: 'Donne la lanterne à {mate} (E) : seul{pe} {il} peut monter sur la tour.',
      valetWait: 'Attends la lumière de la tour. Ensuite, fais le tour du ravin sur les pierres.',
      litValet: 'Fais le tour de la tour sur les pierres de lumière, jusqu’au levier (E). Les ombres sont figées : ne traîne pas.',
      litDame: 'Ta lanterne éclaire le chemin de {mate}. Quand {il} tirera le levier, elle s’envolera jusqu’à {lui}.',
      blindDame: 'Tu es dans le noir. Un escalier invisible descend de la tour : écoute {mate}, {il} voit les marques à la craie.',
      blindValet: 'Tu vois les marques à la craie de l’escalier invisible. Guide {mate} pas à pas. Les ombres se réveillent.',
    },
    s5: {
      valetLamp: 'La deuxième tour : grimpe par les corniches (double saut) et pose la lanterne en haut (E).',
      valetAsk: 'Demande la lanterne à {mate} : cette fois, c’est toi qui montes.',
      dameGive: 'Donne la lanterne à {mate} (E) : c’est {lui} qui grimpe cette tour.',
      dameWait: 'Attends la lumière de la tour. Ensuite, fais le tour du ravin jusqu’au levier.',
      litDame: 'À toi de faire le tour sur les pierres de lumière, jusqu’au levier (E).',
      litValet: 'Ta lumière porte {mate}. Quand {il} tirera le levier, elle s’envolera jusqu’à {lui}.',
      blindValet: 'À ton tour d’être dans le noir. Écoute {mate} : {il} voit l’escalier à la craie.',
      blindDame: 'Tu vois la craie. Guide {mate} marche après marche, et éclaire le bas de l’escalier.',
    },
    lever: 'La lanterne s’envole et rejoint {mate}. La tour s’éteint.',
    leverMine: 'La lanterne s’envole et te rejoint. La tour s’éteint.',
    s6: {
      intro: 'La Grande Ombre. Elle boit la lumière. Allumez ses quatre brasiers.',
      bearer: 'Garde {mate} dans ta lumière pendant qu’{il} allume un brasier. Toi, esquive les vagues : elles boivent la lanterne. Brasiers : {n} / 4.',
      other: 'Allume les brasiers (E maintenu) sans quitter la lumière de {mate} : elle te protège des ombres. Brasiers : {n} / 4.',
      enter: 'Entrez ensemble dans la clairière.',
      low: 'La lanterne faiblit : approchez d’un brasier allumé pour la raviver.',
      hit: 'L’ombre t’a emporté{e}. Retour au bord de la clairière.',
      drain: 'La vague a bu ta lanterne. Esquive les ombres : elles te visent, toi qui portes la lumière.',
      drainMate: 'La vague a bu la lanterne de {mate}.',
      hitMate: 'L’ombre a emporté {mate}.',
      kindle: 'Un brasier s’allume. La Grande Ombre recule.',
      dark: 'Il faut la lumière de la lanterne pour allumer un brasier.',
      win: 'La Grande Ombre se dissout. L’aube se lève sur la forêt.',
    },
    card: 'La carte ' + CARD + ' descend au centre de la clairière. Allez-y ensemble.',
    scared: 'Une ombre t’a touché{e}. Retour au dernier passage.',
    stair: 'Pas en sautant : descends par l’escalier invisible, en écoutant {mate}.',
    near: 'Une ombre approche. Rejoins la lumière.',
    scaredMate: 'Une ombre a touché {mate}.',
  };
  CONFIG.cards.h4 = {
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'Une seule lumière, et vous l’avez partagée.',
      'Chacun a marché dans le noir, sur la seule voix de l’autre.',
      'C’est peut-être ça, avoir confiance.',
    ],
  };

  const local = {
    stage: 0,
    fly: null,
    lamp: V3(),
    lastKey: '',
    charge: 1,
    atkT: 3,
    kindle: 0,
    kindleI: -1,
    scaredT: 0,
    sendW: 0,
    sendC: 0,
    msgCd: 0,
    dawn: 0,
    hitT: 0,
    lowCd: 0,
    objT: 0,
    lastLit: 0,
    env: null,
  };
  const KINDLE = 3.2;
  const hv = V3();
  const up = V3(0, 1.1, 0);
  const tmp = V3();

  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const lan = (x) => x.lan || { who: null, post: 'p0' };
  // where the lantern really is (host and guest compute the same thing)
  const lampTarget = (c, out) => {
    const L = lan(c.S.x);
    if (L.post && H4.posts[L.post]) return out.copy(H4.posts[L.post].pos);
    if (L.who) {
      if (L.who === c.role) Player.avatar.hand(out);
      else if (Remote.has) Remote.hand(out);
      else out.copy(c.pos(L.who)).add(up);
      return out;
    }
    return out.copy(H4.posts.p0.pos);
  };
  const radiusOf = (c) => {
    const L = lan(c.S.x);
    if (L.post) return H4.posts[L.post].r;
    if (c.S.x.stage >= 6 && !c.S.x.won) return 2.2 + 5 * local.charge;
    return 7;
  };
  const sub = (c, who) => {
    const x = c.S.x;
    const L = lan(x);
    return {
      top: (x.stage === 4 && who === 'dame' && (L.post === 't1' || x.blind1)) || (x.stage === 5 && who === 'valet' && (L.post === 't2' || x.blind2)),
      blind: (x.stage === 4 && x.blind1) || (x.stage === 5 && x.blind2),
    };
  };
  const respawn = (c) => c.spawn(H4.spawn(c.S.x.stage, c.role, sub(c, c.role)), 0);

  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    const L = lan(x);
    const mine = L.who === r;
    const mates = L.who === mateRole(r);
    if (x.stage === 1) return !L.who ? TXT.take : mine ? TXT.s1.bearer : TXT.s1.other;
    if (x.stage === 2) {
      if (L.post === 'pA') return r === 'valet' ? TXT.s2.bridgeValet : TXT.s2.bridgeDame;
      if (r === 'dame') return mine ? TXT.s2.dameLamp : TXT.s2.dameAsk;
      return mine ? TXT.s2.valetGive : TXT.s2.valetWait;
    }
    if (x.stage === 3) {
      const q = H4.rel(Player.body.p);
      if (L.post === 'pB') return H4.onB2(q) ? TXT.s3.onward : r === 'dame' ? TXT.s3.stairDame : TXT.s3.stairValet;
      if (r === 'valet') return mine ? TXT.s3.valetLamp : TXT.s3.valetAsk;
      return mine ? TXT.s3.dameGive : TXT.s3.dameWait;
    }
    if (x.stage === 4) {
      if (x.blind1) return r === 'dame' ? TXT.s4.blindDame : TXT.s4.blindValet;
      if (L.post === 't1') return r === 'valet' ? TXT.s4.litValet : TXT.s4.litDame;
      if (r === 'dame') return mine ? TXT.s4.dameLamp : TXT.s4.dameAsk;
      return mine ? TXT.s4.valetGive : TXT.s4.valetWait;
    }
    if (x.stage === 5) {
      if (x.blind2) return r === 'valet' ? TXT.s5.blindValet : TXT.s5.blindDame;
      if (L.post === 't2') return r === 'dame' ? TXT.s5.litDame : TXT.s5.litValet;
      if (r === 'valet') return mine ? TXT.s5.valetLamp : TXT.s5.valetAsk;
      return mine ? TXT.s5.dameGive : TXT.s5.dameWait;
    }
    if (x.stage === 6) {
      if (!x.fight) return TXT.s6.enter;
      const n = (x.lit || []).filter(Boolean).length;
      return (mine ? TXT.s6.bearer : TXT.s6.other).replace('{n}', n);
    }
    if (x.stage === 7) return TXT.card;
    return '';
  };

  const fx = (c, d) => {
    const [k, p] = d;
    const pos = p ? V3(p[0], p[1], p[2]) : null;
    if (k === 'scare') {
      Sound.play('caught');
      if (pos) Fx.burst(pos, '#7a4dff', 40, 4, 0.6, 0);
    }
    if (k === 'kindle') {
      Sound.play('reveal');
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.35);
      if (pos) Fx.burst(pos, '#ffcf8a', 80, 6, 0.9, -2);
      if (H4.boss) H4.boss.hurt = 1;
    }
    if (k === 'fly') Sound.play('lantern');
    if (k === 'hit') {
      Sound.play('hurt');
      if (pos) Fx.burst(pos, '#5a2a8a', 50, 5, 0.7, 0);
    }
  };

  // ---------- the Great Shadow's attacks (scheduled by the host, played on both screens) ----------
  const SECT = (cAng) => -cAng - H4.SWEEP / 2;
  const inSector = (q, a) => {
    // covered: atan2(z, x) in [-SWEEP - a, -a] around the arena centre
    const ang = Math.atan2(q.z - H4.ARENA.z, q.x - H4.ARENA.x);
    const lo = -H4.SWEEP - a;
    let d = ang - lo;
    d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const rr = Math.hypot(q.x - H4.ARENA.x, q.z - H4.ARENA.z);
    return d <= H4.SWEEP && rr > 2.3 && rr < H4.ARENA_R + 0.5;
  };
  const attack = (c, d) => {
    const B = H4.boss;
    if (!B || c.S.x.won) return;
    const [k, a, b] = d;
    B.cast = 1.6;
    if (k === 's') {
      const free = B.sectors.find((s) => s.k < 0.02 && s.wave < 0) || B.sectors[0];
      free.a = a;
      free.t = 0;
      free.run = true;
      Sound.play('gaze');
    }
    if (k === 'g') {
      const gr = B.grasps.find((g) => g.t < 0) || B.grasps[0];
      gr.t = 0;
      gr.g.position.copy(H4.P(a, 0.06, b));
      gr.hit = false;
      Sound.play('dollWarn');
    }
  };
  // the bearer is not protected by the lantern: the shadow drinks its light instead
  const drainMe = (c) => {
    if (local.hitT > 0) return;
    local.hitT = 1.2;
    const p = Player.body.p.clone();
    Cam.shake = Math.max(Cam.shake, 0.45);
    // knocked back towards the edge of the sweep
    const dx = p.x - (H4.O.x + H4.ARENA.x);
    const dz = p.z - (H4.O.z + H4.ARENA.z);
    const d = Math.hypot(dx, dz) || 1;
    Player.body.v.x += (dx / d) * 9;
    Player.body.v.z += (dz / d) * 9;
    Player.body.v.y = 5;
    HUD.say(TXT.s6.drain, T.master, 2200);
    c.send('h4say', [TXT.s6.drainMate]);
    fx(c, ['hit', p.toArray()]);
    c.send('h4fx', ['hit', p.toArray()]);
    c.act({ a: 'drain' });
  };
  const hitMe = (c) => {
    if (lan(c.S.x).who === c.role) return drainMe(c);
    if (local.hitT > 0) return;
    local.hitT = 2;
    local.kindle = 0;
    const p = Player.body.p.clone();
    Cam.shake = Math.max(Cam.shake, 0.5);
    HUD.say(TXT.s6.hit, T.master, 2200);
    c.send('h4say', [TXT.s6.hitMate]);
    fx(c, ['hit', p.toArray()]);
    c.send('h4fx', ['hit', p.toArray()]);
    c.spawn(H4.spawn(6, c.role), 0);
  };
  const tickAttacks = (c, dt) => {
    const B = H4.boss;
    if (!B) return;
    if (c.S.x.won) {
      // dawn: whatever was still crawling on the ground fades away harmlessly
      B.sectors.forEach((s) => {
        s.run = false;
        s.k = damp(s.k, 0, 4, dt);
        s.wave = -1;
      });
      return;
    }
    const me = H4.rel(Player.body.p);
    B.sectors.forEach((s) => {
      if (!s.run) return;
      s.t += dt;
      s.k = clamp(s.t / 0.4, 0, 1) * (s.t < 1.6 ? 1 : 0);
      s.wave = s.t >= 1.6 && s.t < 2.3 ? (s.t - 1.6) / 0.7 : -1;
      if (s.t >= 1.6 && !s.done) {
        s.done = true;
        Sound.play('slam');
        Cam.shake = Math.max(Cam.shake, 0.3);
      }
      // the wave passes over you: hit unless you stand in the light
      if (s.wave >= 0 && !s.hitChecked) {
        const rr = Math.hypot(me.x - H4.ARENA.x, me.z - H4.ARENA.z);
        const front = 2.5 + s.wave * (H4.ARENA_R - 2.5);
        if (Math.abs(rr - front) < 1.6 && inSector(me, s.a)) {
          s.hitChecked = true;
          const bearer = lan(c.S.x).who === c.role;
          if ((bearer || !H4.inLight(Player.body.p.clone().add(up))) && H4.inArena(me)) hitMe(c);
        }
      }
      if (s.t > 2.4) {
        s.run = false;
        s.done = false;
        s.hitChecked = false;
        s.k = 0;
        s.wave = -1;
      }
    });
    B.grasps.forEach((g) => {
      if (g.t >= 1.3 && g.t < 1.6 && !g.hit) {
        g.hit = true;
        Sound.play('thud', g.g.position);
        const q = H4.rel(g.g.position);
        const bearer = lan(c.S.x).who === c.role;
        if (Math.hypot(me.x - q.x, me.z - q.z) < 2.3 && (bearer || !H4.inLight(Player.body.p.clone().add(up)))) hitMe(c);
      }
    });
  };

  Story.register('tr_h4', {
    init: () => ({
      stage: 1,
      lan: { who: null, post: 'p0' },
      blind1: false,
      blind2: false,
      lit: [0, 0, 0, 0],
      fight: false,
      won: false,
      lev: {},
    }),
    voice: () => 1,
    net: {
      h4w: (c, d) => {
        if (Net.isHost) return;
        d.forEach((p, i) => {
          const w = H4.wraiths[i];
          if (w && p) w.target.copy(H4.P(p[0], p[1], p[2]));
          if (w && p) w.face = p[3];
        });
      },
      h4c: (c, v) => {
        if (!Net.isHost) local.charge = v;
      },
      h4atk: (c, d) => attack(c, d),
      h4fx: (c, d) => fx(c, d),
      h4say: (c, d) => HUD.say(d[0], T.master, 2400),
      h4scare: (c, who) => {
        if (who !== c.role) {
          HUD.say(TXT.scaredMate, T.master, 2200);
          return;
        }
        HUD.say(TXT.scared, T.master, 2400);
        Sound.play('caught');
        respawn(c);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      H4.build();
      local.stage = 0;
      local.charge = 1;
      local.dawn = 0;
      local.fly = null;
      local.lastKey = '';
      // the timers and cooldowns of an earlier visit do not carry over
      Object.assign(local, { atkT: 3, kindle: 0, kindleI: -1, scaredT: 0, sendW: 0, sendC: 0, msgCd: 0, hitT: 0, lowCd: 0, objT: 0 });
      Object.assign(local, { steps: null, downCd: 0, hopT: 0, nearCd: 0, warned: false });
      c.spawn(H4.spawn(c.S.x.stage, c.role, sub(c, c.role)), 0);
      Player.killY = H4.O.y - 18;
      Player.checkpoint = () => H4.spawn(Story.S.x.stage, c.role, sub(c, c.role));
      Player.targets = () => {
        if (c.role !== 'dame') return [];
        const x = Story.S.x;
        // the rings only answer the one carrying the lantern (it has to cross with her)
        if (lan(x).who !== 'dame') return [];
        if (x.stage === 2) return [H4.rings.a.pos];
        if (x.stage === 4 && !x.blind1) return [H4.rings.t1.pos];
        return [];
      };
      Player.grappleLand = () => H4.grappleLand(H4.rel(Player.body.p));
      // the forest is dark: only the lantern lights it
      local.env = { hemi: R.hemi.intensity, moon: R.moon.intensity };
      R.hemi.intensity = 0.16;
      R.moon.intensity = 0.1;
      City.mood({ dark: 1 });
      c.fog(c.S.x.won ? 0.012 : 0.03);
      Sound.mood(c.S.x.stage >= 7 ? 'gold' : c.S.x.stage >= 6 ? 'tense' : 'dark');
      HUD.visa(CARD + ' · ' + TITLE);
      if (H4.screen) H4.screen.show(TITLE, CARD + ' · une seule lumière pour deux', '#ffcf8a');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3400);
      HUD.say(TXT.rule, T.master, 4400);
      HUD.say(TXT.give, T.master, 4000);
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.grappleLand = null;
      if (local.env) {
        R.hemi.intensity = local.env.hemi;
        R.moon.intensity = local.env.moon;
      }
      H4.hide();
    },
    apply(c) {
      if (!H4.built) return;
      const x = c.S.x;
      const L = lan(x);
      const key = (L.who || '') + '|' + (L.post || '');
      if (local.lastKey && key !== local.lastKey) {
        // the lantern moves: a short flight from where it hung to where it goes
        local.fly = { from: local.lamp.clone(), t: 0, dur: L.post ? 0.45 : 0.9 };
        Sound.play('lantern');
      }
      local.lastKey = key;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (x.stage === 6) {
          Sound.mood('tense');
          HUD.say(TXT.s6.intro, T.master, 3200);
          if (H4.screen) H4.screen.show('La Grande Ombre', 'Allumez les quatre brasiers', '#9b5cff');
        }
        if (x.stage === 7) {
          Sound.mood('gold');
          Sound.play('reveal');
          HUD.say(TXT.s6.win, T.master, 3000);
          City.mood({ gold: 0.7 });
          // the Great Shadow comes apart in a storm of embers
          for (let k = 0; k < 5; k++)
            Fx.burst(H4.P(H4.ARENA.x, 3 + k * 2.4, H4.ARENA.z), k % 2 ? '#ffcf8a' : '#9b5cff', 60, 7, 1.4, -1);
          c.fog(0.012);
          R.hemi.intensity = 0.45;
          R.moon.intensity = 0.5;
        }
        if (x.stage > 1 && x.stage < 6 && prev) Sound.play('chime');
      }
      // lit braziers
      (x.lit || []).forEach((v, i) => (H4.braziers[i].lit = v));
      Object.entries(x.lev || {}).forEach(([k, v]) => (H4.levers[k].want = v ? 1 : 0));
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!H4.built) return;
      const x = c.S.x;
      const L = lan(x);
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      const qd = H4.rel(pd);
      const qv = H4.rel(pv);
      // ---------- progression ----------
      if (x.stage === 1 && H4.at('l1', qd) && H4.at('l1', qv)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && H4.at('a2', qd) && H4.at('a2', qv)) c.set((s) => (s.x.stage = 3));
      if (x.stage === 3 && H4.at('s2', qd) && H4.at('s2', qv)) c.set((s) => (s.x.stage = 4));
      if (x.stage === 4 && x.blind1 && x.down1 && H4.at('s2b', qd) && H4.at('s2b', qv)) c.set((s) => (s.x.stage = 5));
      if (x.stage === 5 && x.blind2 && x.down2 && H4.at('s2c', qd) && H4.at('s2c', qv)) c.set((s) => (s.x.stage = 6));
      if (x.stage === 6 && !x.fight && H4.inArena(qd) && H4.inArena(qv)) {
        local.atkT = 3.5;
        local.charge = 1;
        c.set((s) => (s.x.fight = true));
      }
      if (x.stage === 7 && local.dawn > 3 && H4.nearCard(qd) && H4.nearCard(qv))
        c.goto('reward', (s) => (s.x.card = 'h4'));

      // ---------- wraiths: frozen in the light, hunting whoever stands in the dark ----------
      const targets = [
        ['dame', pd],
        ['valet', pv],
      ].filter(([, p]) => x.stage < 6 && !H4.inLight(tmp.copy(p).add(up), 0.2));
      local.scaredT = Math.max(0, local.scaredT - dt);
      H4.wraiths.forEach((w) => {
        const frozen = H4.inLight(w.target, 0.5);
        let goal = w.home;
        // they wake when someone lingers in the dark, and drift slower than a walk
        let best = 16;
        targets.forEach(([who, p]) => {
          const dh = w.home.distanceTo(p);
          if (dh < best) {
            best = dh;
            goal = tmp.copy(p).add(V3(0, 0.6, 0));
            w.prey = who;
          }
        });
        if (goal === w.home) w.prey = null;
        if (!frozen) {
          const dir = goal.clone().sub(w.target);
          const d = dir.length();
          const sp = w.prey ? 1.35 : 1.0;
          if (d > 0.05) w.target.addScaledVector(dir.normalize(), Math.min(d, sp * dt));
          w.target.y = Math.max(w.target.y, H4.O.y + 0.3);
          if (w.prey) w.face = Math.atan2(dir.x, dir.z);
        }
        // touch
        if (!frozen && w.prey && !local.scaredT) {
          const p = w.prey === 'dame' ? pd : pv;
          if (w.target.distanceTo(tmp.copy(p).add(V3(0, 0.9, 0))) < 1.2) {
            local.scaredT = 1.5;
            const pos = p.clone().add(up).toArray();
            fx(c, ['scare', pos]);
            c.send('h4fx', ['scare', pos]);
            if (w.prey === c.role) {
              HUD.say(TXT.scared, T.master, 2400);
              respawn(c);
            } else HUD.say(TXT.scaredMate, T.master, 2200);
            c.send('h4scare', w.prey);
            // the wraith recoils home
            w.target.lerp(w.home, 0.7);
          }
        }
      });
      local.sendW += dt;
      if (local.sendW > 0.1) {
        local.sendW = 0;
        c.send(
          'h4w',
          H4.wraiths.map((w) => {
            const q = H4.rel(w.target);
            return [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), +(w.face || 0).toFixed(2)];
          }),
        );
      }

      // ---------- the fight ----------
      if (x.stage === 6 && x.fight && !x.won) {
        const n = (x.lit || []).filter(Boolean).length;
        // the Shadow drinks the lantern; lit braziers give it back
        const bearer = L.who ? (L.who === 'dame' ? pd : pv) : null;
        let gain = -0.03;
        if (bearer)
          H4.braziers.forEach((b) => {
            if (b.lit && Math.hypot(bearer.x - b.pos.x, bearer.z - b.pos.z) < 6) gain = 0.1;
          });
        local.charge = clamp(local.charge + gain * dt, 0, 1);
        local.sendC += dt;
        if (local.sendC > 0.25) {
          local.sendC = 0;
          c.send('h4c', +local.charge.toFixed(3));
        }
        local.atkT -= dt;
        if (local.atkT <= 0) {
          local.atkT = Math.max(2.4, 4.6 - n * 0.6) + Math.random() * 0.8;
          const players = [qd, qv];
          // the Shadow wants the light: it mostly aims at the bearer
          const bq = L.who === 'valet' ? qv : qd;
          const tgt = Math.random() < 0.7 ? bq : players[(Math.random() * 2) | 0];
          const ang = Math.atan2(tgt.z - H4.ARENA.z, tgt.x - H4.ARENA.x);
          if (Math.random() < 0.6 || n === 0) {
            const d = ['s', +SECT(ang).toFixed(3)];
            attack(c, d);
            c.send('h4atk', d);
            if (n >= 2) {
              const d2 = ['s', +SECT(ang + Math.PI).toFixed(3)];
              setTimeout(() => {
                attack(c, d2);
                c.send('h4atk', d2);
              }, 500);
            }
          } else {
            const list = n >= 2 ? players : [tgt];
            list.forEach((q) => {
              const d = ['g', +q.x.toFixed(2), +q.z.toFixed(2)];
              attack(c, d);
              c.send('h4atk', d);
            });
          }
        }
      }
      if (x.stage === 7) local.dawn += dt;
    },
    action(c, who, d) {
      const x = c.S.x;
      const L = lan(x);
      const pos = (w) => c.pos(w);
      if (d.a === 'take' && L.post === d.post) {
        const p = H4.posts[d.post].pos;
        if (pos(who).distanceTo(p) > 3.2) return;
        c.set((s) => (s.x.lan = { who, post: null }));
      }
      if (d.a === 'place' && L.who === who && H4.posts[d.post]) {
        // same reach as taking it: the host checks the bearer is at that post
        if (pos(who).distanceTo(H4.posts[d.post].pos) > 3.2) return;
        c.set((s) => (s.x.lan = { who: null, post: d.post }));
      }
      if (d.a === 'give' && L.who === who) {
        const o = mateRole(who);
        if (pos(who).distanceTo(pos(o)) > 3.4) return;
        c.set((s) => (s.x.lan = { who: o, post: null }));
      }
      if (d.a === 'lever') {
        const ok = (d.k === 'l1' && x.stage === 4 && L.post === 't1' && !x.blind1) || (d.k === 'l2' && x.stage === 5 && L.post === 't2' && !x.blind2);
        if (!ok) return;
        c.set((s) => {
          s.x.lev = { ...s.x.lev, [d.k]: true };
          s.x.lan = { who, post: null };
          if (d.k === 'l1') s.x.blind1 = true;
          else s.x.blind2 = true;
        });
        // each screen gets its own wording
        HUD.say(who === c.role ? TXT.leverMine : TXT.lever, T.master, 2600);
        c.send('h4say', [who === c.role ? TXT.lever : TXT.leverMine]);
      }
      // the one in the dark came down their invisible stair
      if (d.a === 'down' && ((d.k === 'b1' && x.stage === 4 && x.blind1) || (d.k === 'b2' && x.stage === 5 && x.blind2)))
        c.set((s) => (s.x[d.k === 'b1' ? 'down1' : 'down2'] = true));
      if (d.a === 'drain' && x.stage === 6 && x.fight && !x.won && L.who === who) {
        local.charge = Math.max(0, local.charge - 0.3);
        c.send('h4c', +local.charge.toFixed(3));
      }
      if (d.a === 'kindle' && x.stage === 6 && x.fight && !x.won) {
        const b = H4.braziers[d.i];
        if (!b || x.lit[d.i]) return;
        if (L.who === who) return;
        // the lantern has to shine on the brazier (the bearer stands by)
        if (!H4.light.on || H4.light.pos.distanceTo(tmp.copy(b.pos).add(V3(0, 1.4, 0))) > H4.light.r + 1.5) return;
        local.charge = Math.min(1, local.charge + 0.45);
        const lit = x.lit.slice();
        lit[d.i] = 1;
        const all = lit.every(Boolean);
        c.set((s) => {
          s.x.lit = lit;
          if (all) {
            s.x.won = true;
            s.x.stage = 7;
          }
        });
        const p = b.pos.clone().add(V3(0, 2, 0)).toArray();
        fx(c, ['kindle', p]);
        c.send('h4fx', ['kindle', p]);
        HUD.say(TXT.s6.kindle, T.master, 2200);
        c.send('h4say', [TXT.s6.kindle]);
      }
    },
    update(c, dt, t) {
      if (!H4.built) return null;
      const x = c.S.x;
      const L = lan(x);
      const r = c.role;
      const p = Player.body.p;
      const q = H4.rel(p);
      // ---------- the light, this frame ----------
      lampTarget(c, hv);
      if (local.fly) {
        local.fly.t += dt;
        const k = clamp(local.fly.t / local.fly.dur, 0, 1);
        const e = k * k * (3 - 2 * k);
        local.lamp.copy(local.fly.from).lerp(hv, e);
        local.lamp.y += Math.sin(k * Math.PI) * (local.fly.dur > 0.6 ? 2.5 : 0.6);
        if (k >= 1) local.fly = null;
      } else local.lamp.copy(hv);
      H4.light.on = true;
      H4.light.pos.copy(local.lamp);
      H4.light.r = radiusOf(c);
      H4.light.post = L.post;
      local.hitT = Math.max(0, local.hitT - dt);
      if (!Net.isHost && x.stage === 7) local.dawn += dt;
      if (Net.isHost && x.stage !== 7) local.dawn = 0;
      local.dawn = x.stage === 7 ? local.dawn : 0;
      // the boss faces the lantern
      const face = Math.atan2(local.lamp.x - (H4.O.x + H4.ARENA.x), local.lamp.z - (H4.O.z + H4.ARENA.z));
      if (H4.boss) {
        H4.boss.alive = damp(H4.boss.alive, x.won ? 0 : 1, x.won ? 0.9 : 3, dt);
      }
      H4.update(dt, t, {
        lampPos: local.lamp,
        power: x.stage >= 6 && !x.won ? 0.35 + local.charge * 0.65 : 1,
        chalk: x.stage === 4 && x.blind1 && r === 'valet' ? 'b1' : x.stage === 5 && x.blind2 && r === 'dame' ? 'b2' : null,
        stage: x.stage,
        lit: (x.lit || []).filter(Boolean).length,
        bossFace: face,
        dawn: x.stage === 7 ? Math.max(0.01, local.dawn / 3) : 0,
      });
      // the gap holds until the lantern hangs on its post across it (the grapple's hop goes through)
      local.hopT = Player.mode === 'grapple' ? 1.4 : Math.max(0, (local.hopT || 0) - dt);
      if (H4.gapWall) H4.gapWall.on = x.stage <= 2 && L.post !== 'pA' && !local.hopT;
      // the one left in the dark comes down the invisible stair, not off the side of the tower
      const bk = x.stage === 4 && x.blind1 && r === 'dame' ? 'b1' : x.stage === 5 && x.blind2 && r === 'valet' ? 'b2' : null;
      if (!bk) local.steps = null;
      else if (Player.body.grounded) {
        local.steps = local.steps || new Set();
        H4.blind[bk].forEach((s, i) => {
          if (Math.hypot(p.x - s.pos.x, p.z - s.pos.z) < 1.2 && Math.abs(p.y - s.pos.y) < 0.35) local.steps.add(i);
        });
        const done = bk === 'b1' ? x.down1 : x.down2;
        if (!done && local.steps.size >= H4.blind[bk].length / 2) {
          if (!local.downCd) c.act({ a: 'down', k: bk });
          local.downCd = (local.downCd || 0) + dt > 1 ? 0 : (local.downCd || 0) + dt;
        } else if (!done && q.y < 0.6) {
          local.steps = null;
          HUD.say(TXT.stair, T.master, 2600);
          respawn(c);
        }
      }
      // levers ease down
      Object.values(H4.levers).forEach((lv) => (lv.down = damp(lv.down, lv.want || 0, 6, dt)));
      if (x.stage === 6 || x.stage === 7) tickAttacks(c, dt);
      // the objective follows the lantern and where you stand
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.4;
        HUD.objective(objective(c));
      }
      if (x.stage === 6 && x.fight && !x.won && L.who === r && local.charge < 0.25) {
        local.lowCd -= dt;
        if (local.lowCd <= 0) {
          local.lowCd = 14;
          HUD.say(TXT.s6.low, T.master, 2600);
        }
      }

      // a wraith drifting close while I stand in the dark: a whisper and a warning
      local.nearCd = Math.max(0, (local.nearCd || 0) - dt);
      if (!local.nearCd && x.stage < 6 && !H4.inLight(tmp.copy(p).add(up), 0.2)) {
        const w = H4.wraiths.find((w) => w.frozen < 0.5 && w.pos.distanceTo(p) < 5.5);
        if (w) {
          local.nearCd = 6;
          Sound.play('gaze');
          if (!local.warned) HUD.say(TXT.near, T.master, 2200);
          local.warned = true;
        }
      }

      // ---------- prompts ----------
      if (x.stage === 7) return null;
      const lv = H4.nearLever(q);
      if (lv) {
        const ok = (lv === 'l1' && x.stage === 4 && L.post === 't1' && !x.blind1) || (lv === 'l2' && x.stage === 5 && L.post === 't2' && !x.blind2);
        if (ok) {
          if (Input.pressed('interact')) c.act({ a: 'lever', k: lv });
          return ['E', 'Tirer le levier'];
        }
      }
      const post = H4.nearPost(q);
      if (post) {
        if (L.post === post) {
          if (Input.pressed('interact')) c.act({ a: 'take', post });
          return ['E', 'Prendre la lanterne'];
        }
        if (L.who === r) {
          if (Input.pressed('interact')) c.act({ a: 'place', post });
          return ['E', 'Poser la lanterne sur le crochet'];
        }
      }
      if (x.stage === 6 && x.fight && !x.won && L.who !== r) {
        const b = H4.nearBrazier(q);
        if (b && !x.lit[b.i]) {
          const shielded = H4.light.pos.distanceTo(tmp.copy(b.pos).add(V3(0, 1.4, 0))) < H4.light.r + 1.5;
          if (Input.held('interact')) {
            if (!shielded) {
              local.msgCd -= dt;
              if (local.msgCd <= 0) {
                local.msgCd = 3;
                HUD.say(TXT.s6.dark, T.master, 2000);
              }
              // the flame does not die at once: the progress fades slowly while out of the light
              local.kindle = Math.max(0, local.kindle - dt * 0.6);
            } else {
              if (local.kindleI !== b.i) local.kindle = 0;
              if (local.kindle === 0) Sound.play('lantern');
              local.kindleI = b.i;
              local.kindle += dt;
              b.prog.material.color.set('#ffcf8a').multiplyScalar(0.6 + local.kindle);
              b.prog.scale.setScalar(1 + Math.sin(t * 12) * 0.03);
              if (Math.random() < dt * 20) Fx.burst(b.pos.clone().add(V3(0, 1.5, 0)), '#ffb070', 3, 1.5, 0.4, 1);
              if (local.kindle > KINDLE) {
                local.kindle = 0;
                c.act({ a: 'kindle', i: b.i });
              }
            }
          } else local.kindle = Math.max(0, local.kindle - dt * 2);
          return ['E', 'Allumer le brasier (maintenir) · ' + Math.round((local.kindle / KINDLE) * 100) + ' %', true];
        }
      }
      if (L.who === r && Remote.has && p.distanceTo(Remote.pos) < 2.6) {
        if (Input.pressed('interact')) c.act({ a: 'give' });
        return ['E', 'Donner la lanterne à {mate}'];
      }
      return null;
    },
  });
})();
