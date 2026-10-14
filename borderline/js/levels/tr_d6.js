// ♦ 8 · Les Ombres. A shadow theatre: in front of the screens, the shadows are solid ground.
// Two rooms to learn (one pilots the light and the cut-outs, the other walks the shadows), two
// silhouette doors (only one of you sees the shape to make), a room of two coloured lights where
// only black is solid, then the Montreur d'ombres: a giant puppet you corner with the lights while
// the other climbs the shadows to cut its four strings.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('d6');
  const W = D6W;
  const T = CONFIG;
  const TITLE = 'Les Ombres';
  const TX = {
    intro: 'Épreuve de logique. Un théâtre d’ombres, ouvert sur le soir.',
    rule: 'Devant l’écran, dans la bande sombre, les ombres sont solides : on marche dessus.',
    s1: {
      pilot: 'La régie est à toi : prends le pupitre (E). Projecteur et découpes : fais à {mate} un chemin d’ombres jusqu’à la coulisse d’en face, en haut.',
      walker: 'Prends la passerelle à gauche, jusqu’à la coulisse. Puis marche sur les ombres que {mate} projette, jusqu’à la coulisse d’en face, en haut.',
    },
    s2: {
      pilot: 'À ton tour à la régie. L’arbre ne fait que tourner (Espace), le cœur se déplace et tourne, la lune suit le projecteur.',
      walker: 'À ton tour de marcher dans les ombres. Guide {mate} : où tu veux la prochaine marche, à quelle hauteur.',
    },
    s3: {
      seer: 'Vous voici dans la lumière. Toi seul{e} vois la silhouette à reproduire (en haut à droite). Placez vos deux corps pour que votre ombre la dessine.',
      blind: 'La porte est sur l’écran. {mate} voit la silhouette à reproduire, pas toi. Laisse-toi placer.',
    },
    s4: {
      seer: 'Une clé. Toi seul{e} vois sa forme (en haut à droite) ; ton corps en sera la tige. {mate} tient l’anneau et le panneton depuis la régie.',
      pilot: 'Une clé. {mate} voit sa forme, toi tu vois le mur. Prends la régie : l’anneau et le panneton sont à toi. Son corps sera la tige.',
    },
    s5: {
      pilot: 'Deux projecteurs, rouge et bleu, sur deux rails. Seul le noir, là où les deux ombres se croisent, est solide. F : changer de lumière · Q/D : un cran · Espace : allumer, éteindre.',
      walker: 'Ici, seul le noir porte : une ombre rouge ou bleue, c’est du vide. Attends sur les piliers de pierre que {mate} trouve les bons crans.',
      gates: 'Une seule lumière, et les grilles se referment : il faut les deux.',
    },
    s6: {
      enter: 'La grande salle. Rejoignez la scène.',
      pilot: 'Les trois projecteurs ont chacun un levier (E). Une ombre ne vit que dans la lumière : éteins autour d’elle pour la coincer. Ne plonge pas {mate} dans le noir.',
      walker: 'Coincée, la marionnette ne peut plus fuir : ses fils brillent. Grimpe sur les loges d’ombre et coupe-les (E). Ses mains frappent où elles brillent.',
      corner: 'Elle est coincée ! Ses fils brillent : coupez-les.',
      free: 'Elle s’est libérée.',
      gone: 'Dans le noir, elle se défait… et renaît dans la lumière.',
      snuff: 'Elle tire sur un fil : un projecteur va se rallumer !',
      flee: 'Elle fuit dans une autre lumière : coincez-la de nouveau.',
      cut: ['Un fil tranché. La jambe pend.', 'Le deuxième fil cède.', 'Un bras retombe. Plus qu’un fil.', ''],
    },
    won: 'La marionnette s’effondre. L’écran s’embrase d’or.',
    card: 'La carte ' + CARD + ' descend sur la scène. Allez-y ensemble.',
    fall: 'La fosse. Retour à la coulisse.',
    fallPilot: 'La fosse. Retour à la régie.',
    fallMate: '{mate} est tombé{pe} dans la fosse.',
    hit: 'Sa main t’a frappé{e}.',
    carried: 'L’ombre te porte.',
    hitMate: 'Sa main a frappé {mate}.',
    ko: 'Sonné{e}. Retour au bout de la scène.',
    koMate: '{mate} est sonné{pe}.',
    match: 'Ressemblance',
    hold: 'tenez la pose',
    open: 'L’ombre est juste. La porte s’ouvre.',
    exit: 'La coulisse. La porte s’ouvre.',
  };
  CONFIG.cards.d6 = {
    title: TITLE,
    sub: 'Épreuve ♦ · réussie',
    lines: ['Une ombre ne tient debout que si quelqu’un tient la lumière.', 'L’un voyait la forme, l’autre voyait le mur.', 'À deux, on a dessiné une clé, puis un cœur.'],
  };

  // who drives the light in each stage (the other walks the shadows); stage 3 both pose
  const PILOT = { 1: 'dame', 2: 'valet', 4: 'valet', 5: 'dame', 6: 'valet' };
  const SEER = { 3: 'valet', 4: 'dame' };
  const ROOM = { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4', 5: 'r5', 6: 'boss', 7: 'boss' };
  const RIG = {
    r1: [{ k: 'light', i: 0, name: 'Le projecteur' }, { k: 'cut', i: 0 }, { k: 'cut', i: 1 }],
    r2: [{ k: 'light', i: 0, name: 'Le projecteur' }, { k: 'cut', i: 0 }, { k: 'cut', i: 1 }],
    r4: [{ k: 'cut', i: 0 }, { k: 'cut', i: 1 }],
    r5: [{ k: 'notch', i: 0, name: 'La lumière rouge' }, { k: 'notch', i: 1, name: 'La lumière bleue' }],
  };
  // the silhouettes to make: where the bodies (and the props) stand in the answer
  const SOL = {
    r3: { bodies: [{ x: 0.62, y: 0, z: 84.2 }, { x: -0.62, y: 0, z: 84.2 }], cuts: null },
    r4: { bodies: [{ x: 0, y: 0, z: 109 }], cuts: [[0, 2.134, 0], [-0.471, 0.97, 0]] },
  };
  const AREA = { x0: -3.4, x1: 3.4, y0: 0, y1: 4.4, nx: 68, ny: 44 };
  const THR = 0.72;
  const HP = 3;

  const local = {
    stage: 0,
    ctl: false,
    sel: 0,
    sent: 0,
    persist: 0,
    dirty: false,
    tgt: {},
    rx: {},
    creak: 0,
    match: 0,
    hold: 0,
    matchT: 0,
    target: {},
    pup: null,
    pv: { x: 0, mode: 0, vis: 1 },
    atks: [],
    hp: HP,
    hitT: 0,
    introT: 9,
    snuff: null,
    said: {},
    objT: 0,
    cardT: 0,
    env: null,
    lastPup: 0,
    cutHold: 0,
    won: 0,
  };
  D6W.local = local;
  const mateOf = (r) => (r === 'dame' ? 'valet' : 'dame');
  const rel = (p) => W.rel(p);
  const amPilot = (c) => PILOT[c.S.x.stage] === c.role;
  const walkerRole = (st) => (PILOT[st] ? mateOf(PILOT[st]) : null);

  // ---------- the music box: a little waltz of tines, its own audio graph ----------
  const Box = (() => {
    let ac = null;
    let out = null;
    let timer = null;
    let mode = 'calm';
    let next = 0;
    let beat = 0;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // 3/4, one entry per beat (0 = rest); [melody, bass]
    const SONG = {
      calm: {
        beat: 0.44,
        mel: [76, 0, 72, 74, 0, 71, 72, 69, 64, 69, 0, 0, 77, 0, 74, 76, 0, 72, 71, 67, 71, 72, 0, 0, 76, 79, 76, 74, 77, 74, 72, 76, 72, 71, 0, 0, 69, 72, 76, 74, 71, 67, 69, 71, 72, 69, 0, 0],
        bass: [45, 43, 45, 45, 50, 48, 43, 48, 48, 50, 45, 52, 45, 43, 45, 45],
      },
      tense: {
        beat: 0.36,
        mel: [76, 75, 76, 72, 0, 69, 71, 68, 71, 64, 0, 0, 76, 75, 76, 77, 76, 74, 72, 71, 69, 68, 0, 64, 69, 72, 76, 81, 80, 76, 77, 74, 71, 72, 69, 0],
        bass: [45, 44, 45, 52, 50, 52, 45, 52, 50, 52, 45, 40],
      },
      gold: {
        beat: 0.42,
        mel: [72, 76, 79, 84, 79, 76, 77, 81, 84, 81, 77, 74, 76, 79, 84, 88, 84, 79, 79, 77, 76, 74, 72, 0],
        bass: [48, 48, 53, 53, 48, 48, 43, 48],
      },
    };
    const tine = (f, t, v, det = 0) => {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      g.connect(out);
      [
        [1, 1],
        [3.0, 0.16],
        [5.4, 0.05],
      ].forEach(([k, a]) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * k;
        o.detune.value = det;
        const og = ac.createGain();
        og.gain.value = a;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + (k > 1 ? 0.6 : 2.3));
      });
    };
    const tick = () => {
      if (!ac) return;
      const S = SONG[mode];
      while (next < ac.currentTime + 0.25) {
        const m = S.mel[beat % S.mel.length];
        // the box goes out of tune when the puppet plays
        const det = mode === 'tense' ? (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 6;
        if (m && !(mode === 'tense' && Math.random() < 0.06)) tine(hz(m), next, 0.11, det);
        if (beat % 3 === 0) tine(hz(S.bass[Math.floor(beat / 3) % S.bass.length]), next, 0.07, det);
        else if (mode !== 'tense' && beat % 3 === 1) tine(hz(S.bass[Math.floor(beat / 3) % S.bass.length] + 7), next, 0.035, det);
        next += S.beat * (1 + (beat % 3 === 0 ? 0.04 : 0));
        beat++;
      }
    };
    return {
      start() {
        if (ac) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
          ac = new AC();
        } catch (e) {
          ac = null;
          return;
        }
        out = ac.createGain();
        out.gain.value = 0.55 * (typeof SETTINGS !== 'undefined' ? SETTINGS.vol : 0.8);
        const verb = ac.createConvolver();
        const len = ac.sampleRate * 2.4;
        const b = ac.createBuffer(2, len, ac.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = b.getChannelData(ch);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
        verb.buffer = b;
        const wet = ac.createGain();
        wet.gain.value = 0.5;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 5200;
        out.connect(lp).connect(ac.destination);
        out.connect(verb).connect(wet).connect(ac.destination);
        next = ac.currentTime + 0.2;
        beat = 0;
        timer = setInterval(tick, 60);
      },
      mode(m) {
        if (m === mode) return;
        mode = m;
        beat = 0;
      },
      stop() {
        if (timer) clearInterval(timer);
        timer = null;
        if (ac) ac.close().catch(() => {});
        ac = null;
      },
      get on() {
        return !!ac;
      },
    };
  })();

  // ---------- the target silhouette (HUD, only for the one who sees it) ----------
  let panel = null;
  const targetGrid = (id, hi) => {
    const k = id + (hi ? 'h' : '');
    if (local.target[k]) return local.target[k];
    const w = W.WALLS[id];
    const sol = SOL[id];
    const keep = w.cuts.map((c) => [c.x, c.y, c.o]);
    if (sol.cuts)
      sol.cuts.forEach(([x, y, o], i) => {
        w.cuts[i].x = x;
        w.cuts[i].y = y;
        w.cuts[i].o = o;
      });
    const nx = hi ? AREA.nx * 3 : AREA.nx;
    const ny = hi ? AREA.ny * 3 : AREA.ny;
    const g = W.shadowGrid(w, sol.bodies, AREA.x0, AREA.x1, AREA.y0, AREA.y1, nx, ny);
    keep.forEach(([x, y, o], i) => {
      w.cuts[i].x = x;
      w.cuts[i].y = y;
      w.cuts[i].o = o;
    });
    local.target[k] = g;
    return g;
  };
  const showPanel = (id) => {
    if (!id) {
      if (panel) panel.style.display = 'none';
      return;
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.style.cssText =
        'position:fixed;right:22px;top:86px;z-index:5;pointer-events:none;padding:10px 12px 12px;background:rgba(18,10,14,.82);border:1px solid rgba(201,154,72,.75);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);font:italic 14px Georgia,serif;color:#f1dfb8;text-align:center';
      const cap = document.createElement('div');
      cap.textContent = 'La silhouette à reproduire';
      cap.style.cssText = 'margin-bottom:8px;letter-spacing:.04em';
      panel.appendChild(cap);
      const cv = document.createElement('canvas');
      cv.style.cssText = 'display:block;width:250px;height:162px;border-radius:4px';
      panel.appendChild(cv);
      const m = document.createElement('div');
      m.style.cssText = 'margin-top:7px;font:12px "IBM Plex Mono",monospace;font-style:normal;color:#c9a46a';
      panel.appendChild(m);
      panel.userData = { cv, m, id: null };
      document.body.appendChild(panel);
    }
    panel.style.display = 'block';
    if (panel.userData.id === id) return;
    panel.userData.id = id;
    const g = targetGrid(id, true);
    const nx = AREA.nx * 3;
    const ny = AREA.ny * 3;
    const cv = panel.userData.cv;
    cv.width = 500;
    cv.height = 324;
    const x = cv.getContext('2d');
    // the canvas of the screen, warm, and the shape in soft black
    const gr = x.createRadialGradient(250, 150, 30, 250, 170, 300);
    gr.addColorStop(0, '#f3e4c4');
    gr.addColorStop(1, '#b89a6c');
    x.fillStyle = gr;
    x.fillRect(0, 0, 500, 324);
    const tmp = document.createElement('canvas');
    tmp.width = nx;
    tmp.height = ny;
    const tx = tmp.getContext('2d');
    const im = tx.createImageData(nx, ny);
    for (let i = 0; i < nx * ny; i++) {
      im.data[i * 4 + 0] = 16;
      im.data[i * 4 + 1] = 10;
      im.data[i * 4 + 2] = 14;
      im.data[i * 4 + 3] = g[i] ? 245 : 0;
    }
    tx.putImageData(im, 0, 0);
    x.filter = 'blur(1px)';
    x.drawImage(tmp, 0, 0, 500, 324);
    x.filter = 'none';
    x.strokeStyle = 'rgba(201,154,72,.9)';
    x.lineWidth = 3;
    x.strokeRect(4, 4, 492, 316);
  };

  // ---------- the rig (projectors and cut-outs) ----------
  const packRig = (id) => {
    const w = W.WALLS[id];
    if (id === 'r5') return { n: local.notch.slice(), on: w.lights.map((l) => (l.on ? 1 : 0)) };
    return {
      L: w.lights.map((l) => [+l.x.toFixed(3), +l.z.toFixed(3), l.on ? 1 : 0]),
      C: w.cuts.map((c) => [+c.x.toFixed(3), +c.y.toFixed(3), c.o]),
    };
  };
  const applyRig = (id, r, snap) => {
    if (!r) return;
    const w = W.WALLS[id];
    if (id === 'r5') {
      if (r.n) local.notch = r.n.slice();
      if (r.on) r.on.forEach((v, i) => (w.lights[i].on = !!v));
      if (snap) w.lights.forEach((l, i) => (l.x = W.NOTCH[i ? 'blue' : 'red'][local.notch[i]]));
      return;
    }
    local.tgt[id] = r;
    if (snap) {
      r.L.forEach(([x, z, on], i) => Object.assign(w.lights[i], { x, z, on: !!on }));
      r.C.forEach(([x, y, o], i) => Object.assign(w.cuts[i], { x, y, o }));
    }
  };
  // a remote pilot's rig glides to the last values it sent
  const glideRig = (id, dt) => {
    const r = local.tgt[id];
    if (!r) return;
    const w = W.WALLS[id];
    r.L.forEach(([x, z, on], i) => {
      const L = w.lights[i];
      L.x = damp(L.x, x, 14, dt);
      L.z = damp(L.z, z, 14, dt);
      L.on = !!on;
    });
    r.C.forEach(([x, y, o], i) => {
      const C = w.cuts[i];
      C.x = damp(C.x, x, 14, dt);
      C.y = damp(C.y, y, 14, dt);
      C.o = o;
    });
  };
  const glideNotch = (dt) => {
    const w = W.WALLS.r5;
    w.lights.forEach((l, i) => {
      const want = W.NOTCH[i ? 'blue' : 'red'][local.notch[i]];
      const d = want - l.x;
      l.x = Math.abs(d) < 0.01 ? want : l.x + clamp(d, -dt * 5, dt * 5);
    });
  };
  local.notch = [1, 1];

  // the pilot at the console: move the selected thing, F for the next one, Space to turn / switch
  const pilotTick = (c, dt) => {
    const id = ROOM[c.S.x.stage];
    const list = RIG[id];
    const w = W.WALLS[id];
    if (!list) return null;
    local.sel = local.sel % list.length;
    const it = list[local.sel];
    if (Input.pressed('ability')) {
      local.sel = (local.sel + 1) % list.length;
      Sound.play('tile');
    }
    const m = Input.move();
    // camera-relative: screen right is (-cos yaw, sin yaw) on the floor
    const rx = -Math.cos(Cam.yaw);
    const rz = Math.sin(Cam.yaw);
    const fx = Math.sin(Cam.yaw);
    const fz = Math.cos(Cam.yaw);
    const side = m.x * rx * 1 + 0;
    const sideX = m.x * rx + m.z * fx;
    const fwdZ = m.x * rz + m.z * fz;
    void side;
    let moved = false;
    if (it.k === 'light') {
      const L = w.lights[it.i];
      const lim = w.rig.light;
      const nx = clamp(L.x + sideX * 3.2 * dt, lim.x[0], lim.x[1]);
      const nz = clamp(L.z + fwdZ * 3.2 * dt, lim.z[0], lim.z[1]);
      moved = nx !== L.x || nz !== L.z;
      L.x = nx;
      L.z = nz;
    } else if (it.k === 'cut') {
      const C = w.cuts[it.i];
      const lim = C.lim || { x: [C.x, C.x], y: [C.y, C.y] };
      const nx = clamp(C.x + sideX * 2.6 * dt, lim.x[0], lim.x[1]);
      const ny = clamp(C.y + m.z * 2.2 * dt, lim.y[0], lim.y[1]);
      moved = nx !== C.x || ny !== C.y;
      C.x = nx;
      C.y = ny;
      if (C.turn && Input.pressed('jump')) {
        C.o = (C.o & 4) | ((C.o + 1) & 3);
        moved = true;
        Sound.play('switch');
      }
    } else if (it.k === 'notch') {
      const L = w.lights[it.i];
      const ax = m.x > 0.5 ? 1 : m.x < -0.5 ? -1 : 0;
      if (ax && ax !== local.notchAx) {
        const n = clamp(local.notch[it.i] + ax, 0, 3);
        if (n !== local.notch[it.i]) {
          local.notch[it.i] = n;
          moved = true;
          Sound.play('creak');
        }
      }
      local.notchAx = ax;
      if (Input.pressed('jump')) {
        L.on = !L.on;
        moved = true;
        Sound.play('switch');
      }
    }
    if (moved) {
      local.dirty = true;
      local.creak -= dt;
      if (local.creak <= 0 && it.k !== 'notch') {
        local.creak = 0.5;
        Sound.play('creak');
      }
    }
    W.select(id, it.k, it.i);
    const nm = it.name || (w.cuts[it.i] && w.cuts[it.i].name) || '';
    const turn = it.k === 'cut' && w.cuts[it.i].turn ? ' · Espace tourner' : '';
    const sw = it.k === 'notch' ? ' · Q/D un cran · Espace ' + (w.lights[it.i].on ? 'éteindre' : 'allumer') : ' · ZQSD déplacer';
    return ['E', 'Quitter · ' + nm + sw + turn + ' · F suivant', false];
  };
  const sendRig = (c, dt, force) => {
    const id = ROOM[c.S.x.stage];
    if (!RIG[id]) return;
    local.sent += dt;
    local.persist += dt;
    if ((local.dirty && local.sent > 0.066) || force) {
      local.sent = 0;
      c.send('d6r', [id, packRig(id)]);
    }
    if ((local.dirty && local.persist > 1) || force) {
      local.persist = 0;
      local.dirty = false;
      c.act({ a: 'rig', id, r: packRig(id) });
    }
  };

  // ---------- carrying the walker with the shadow under the feet ----------
  const anchors = (w) => {
    const b = Player.body;
    if (!b.grounded || W.groundOn(w, b) < 0) return null;
    const q = rel(b.p);
    const out = [];
    // the feet are wider than a point: on an edge, the shadow under the toes still carries you
    const FEET = [0, -0.18, 0.18, -0.3, 0.3];
    w.lights.forEach((L) => {
      if (!L.on) return;
      let a = null;
      for (let k = 0; k < FEET.length && !a; k++) a = W.anchorAt(w, L, q.x + FEET[k], q.y - 0.04) || W.anchorAt(w, L, q.x + FEET[k], q.y - 0.14);
      out.push(a ? { L, a, p: W.anchorPos(w, L, a) } : null);
    });
    return out;
  };
  const carry = (w, an) => {
    if (!an) return;
    let best = null;
    an.forEach((o) => {
      if (!o) return;
      const n = W.anchorPos(w, o.L, o.a);
      const dx = n[0] - o.p[0];
      const dy = n[1] - o.p[1];
      if (!best || Math.abs(dx) + Math.abs(dy) > Math.abs(best[0]) + Math.abs(best[1])) best = [dx, dy];
    });
    if (!best || Math.abs(best[0]) + Math.abs(best[1]) < 1e-5 || Math.abs(best[0]) + Math.abs(best[1]) > 2) return;
    Player.body.p.x += best[0];
    Player.body.p.y += best[1];
  };

  // ---------- spawns ----------
  const spawnFor = (st, role, first) => {
    const P = W.P;
    if (st === 1 && first) return P(role === 'dame' ? 1.6 : -1.6, 0, -7);
    const pilot = PILOT[st] === role;
    if (st === 1) return pilot ? P(W.CONSOLE.r1[0], 0, W.CONSOLE.r1[1] - 1.1) : P(19.2, 1.5, W.ROOMS.r1.zw - 1.2);
    if (st === 2) return pilot ? P(W.CONSOLE.r2[0], 0, W.CONSOLE.r2[1] - 1.1) : P(19.2, 1.5, W.ROOMS.r2.zw - 1.2);
    if (st === 3) return P(role === 'dame' ? 2.6 : -2.6, 0, 71);
    if (st === 4) return pilot ? P(W.CONSOLE.r4[0], 0, W.CONSOLE.r4[1] - 1.1) : P(0, 0, 100);
    if (st === 5) return pilot ? P(W.CONSOLE.r5[0], 0, W.CONSOLE.r5[1] - 1.1) : P(19.2, 1.5, W.ROOMS.r5.zw - 1.2);
    if (st === 6) return pilot ? P(-3.2, 0, W.BOSS.lightZ + 0.6) : P(30.6, 0, W.ROOMS.boss.zw - 1.6);
    return P(role === 'dame' ? 2 : -2, 0, W.ROOMS.boss.zw - 2.6);
  };

  // ---------- fx, both screens ----------
  const fx = (c, d) => {
    const [k, p] = d;
    const pos = p ? V3(p[0], p[1], p[2]) : null;
    if (k === 'open') {
      Sound.play('reveal');
      Sound.play('chime');
      if (pos) Fx.burst(pos, '#ffcf7a', 60, 5, 1.2, -3);
    }
    if (k === 'stage') {
      Sound.play('chime');
      if (pos) Fx.burst(pos, '#ffcf7a', 40, 4, 1.0, -3);
    }
    if (k === 'fall') {
      Sound.play('fall');
      if (pos) Fx.burst(pos, '#3a2a40', 40, 4, 0.8, -4);
    }
    if (k === 'hit') {
      Sound.play('hurt');
      Sound.play('slam');
      if (pos) Fx.burst(pos, '#ff5a3a', 40, 6, 0.8, -3);
    }
    if (k === 'cut') {
      Sound.play('cut');
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.5);
      if (pos) {
        Fx.burst(pos, '#ffcf7a', 80, 7, 1.2, -6);
        Fx.burst(pos, '#ffffff', 20, 4, 0.6, -2);
      }
    }
    if (k === 'corner') {
      Sound.play('gaze');
      Sound.play('rumble', 0.6);
    }
    if (k === 'gone') Sound.play('glitch');
    if (k === 'reform') Sound.play('dome');
    if (k === 'lever') {
      Sound.play('switch');
      Sound.play('lantern');
    }
    if (k === 'snuff') {
      Sound.play('switch');
      Sound.play('roar');
      if (pos) Fx.burst(pos, '#ff6a3a', 50, 5, 0.9, -4);
    }
    if (k === 'win') {
      Sound.play('reveal');
      Sound.play('roar');
      Cam.shake = Math.max(Cam.shake, 0.7);
      const b = W.ROOMS.boss;
      Fx.hearts(W.P(0, 8, b.zw - 3));
      for (let i = 0; i < 7; i++) setTimeout(() => Fx.firework(W.P((Math.random() - 0.5) * 44, 16 + Math.random() * 6, b.zw - 8 - Math.random() * 10), 26), i * 420);
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('d6fx', d);
  };
  // soft lines (the boss's running commentary) are dropped while something else is being said
  const sayBoth = (c, mine, theirs, hold = 2600, soft = false) => {
    if (!(soft && HUD.talking)) HUD.say(mine, T.master, hold);
    c.send('d6say', [theirs || mine, hold, soft ? 1 : 0]);
  };

  // ---------- the boss: host side ----------
  const secs = W.BOSS.secs;
  const secC = (s) => (secs[s][0] + secs[s][1]) / 2;
  const cutsN = (x) => (x.cut || []).filter(Boolean).length;
  const newPup = () => ({ x: secC(1), tx: secC(1), mode: 'roam', vis: 1, wait: 1.5, cornerT: 0, goneT: 0, atkT: 3.5, snuffT: 0, send: 0 });
  const MODES = ['roam', 'corner', 'gone', 'dead'];
  const runAround = (lit, k) => {
    let a = k;
    let b = k;
    while (a > 0 && lit[a - 1]) a--;
    while (b < 2 && lit[b + 1]) b++;
    return [a, b];
  };
  const hostBoss = (c, dt) => {
    const x = c.S.x;
    const P = local.pup || (local.pup = newPup());
    const lit = x.lit;
    const n = cutsN(x);
    if (x.stage >= 7) {
      P.mode = 'dead';
    } else {
      let k = W.secOf(P.x);
      if (k < 0) k = P.x > 0 ? 0 : 2;
      if (P.mode !== 'gone' && !lit[k]) {
        P.mode = 'gone';
        P.goneT = 0;
        P.cornerT = 0;
        fxBoth(c, ['gone']);
        if (!local.said.gone) {
          local.said.gone = 1;
          sayBoth(c, TX.s6.gone, null, 2600, true);
        }
      }
      if (P.mode === 'gone') {
        P.vis = Math.max(0, P.vis - dt * 1.4);
        P.goneT += dt;
        const cand = [0, 1, 2].filter((s) => lit[s]);
        if (P.goneT > 1.4 && cand.length) {
          cand.sort((a, b) => Math.abs(secC(a) - P.x) - Math.abs(secC(b) - P.x));
          // after a cut it flees into the light it chose
          const to = P.flee != null && lit[P.flee] ? P.flee : cand[0];
          P.flee = null;
          P.x = P.tx = secC(to);
          P.mode = 'roam';
          P.wait = 1;
          fxBoth(c, ['reform']);
        }
      } else {
        P.vis = Math.min(1, P.vis + dt * 1.2);
        const nb = [k - 1, k + 1].filter((i) => i >= 0 && i < 3);
        const iso = nb.every((i) => !lit[i]);
        if (iso) {
          P.cornerT += dt;
          if (P.mode !== 'corner' && P.cornerT > 0.8) {
            P.mode = 'corner';
            P.snuffT = 0;
            fxBoth(c, ['corner']);
            sayBoth(c, TX.s6.corner, null, 2600, true);
            P.atkT = Math.min(P.atkT, 1.6);
          }
        } else {
          P.cornerT = 0;
          if (P.mode === 'corner') {
            P.mode = 'roam';
            P.wait = 0;
            sayBoth(c, TX.s6.free, null, 2000, true);
          }
        }
        const [ra, rb] = runAround(lit, k);
        const lo = secs[rb][0] + 3.4;
        const hi = secs[ra][1] - 3.4;
        const sp = 3.0 + n * 0.55;
        if (P.mode === 'roam') {
          P.wait -= dt;
          if (P.wait <= 0 && Math.abs(P.tx - P.x) < 0.2) {
            // somewhere else in the light, often another third
            const s = ra + Math.floor(Math.random() * (rb - ra + 1));
            P.tx = clamp(secC(s) + (Math.random() - 0.5) * 9, lo, hi);
            P.wait = 0.8 + Math.random() * 1.6;
          }
          P.tx = clamp(P.tx, lo, hi);
          P.x += clamp(P.tx - P.x, -sp * dt, sp * dt);
        } else {
          // cornered: it strains against the dark, but stays in its third
          P.x = damp(P.x, secC(k), 1.5, dt);
          // from the second string on, it tries to switch a light back on itself
          if (n >= 1 && !local.snuff) {
            P.snuffT += dt;
            const wait = Math.max(5.5, 10.5 - n * 1.5);
            if (P.snuffT > wait) {
              P.snuffT = 0;
              const dark = nb.filter((i) => !lit[i]);
              if (dark.length) {
                const s = dark[Math.floor(Math.random() * dark.length)];
                local.snuff = { s, t: 0 };
                c.send('d6s', [s]);
                snuffShow(s);
                sayBoth(c, TX.s6.snuff, null, 2000, true);
              }
            }
          }
        }
      }
      // the snuff: after its telegraph, the lever flips by itself
      if (local.snuff) {
        local.snuff.t += dt;
        if (local.snuff.t > 2.3) {
          const s = local.snuff.s;
          local.snuff = null;
          if (!c.S.x.lit[s]) {
            c.set((S) => (S.x.lit = S.x.lit.map((v, i) => (i === s ? 1 : v))));
            const cs = W.consoles['lev' + s];
            fxBoth(c, ['snuff', W.P(cs.x, 1.4, cs.z).toArray()]);
          }
        }
      }
      // attacks on the runner, only where the light lets the puppet see
      const run = rel(c.pos(walkerRole(6)));
      const rs = W.secOf(run.x);
      const onStage = run.z > W.BOSS.apron - 0.6 && run.z < W.ROOMS.boss.zw + 0.5;
      P.atkT -= dt;
      if (P.atkT <= 0 && P.vis > 0.9 && (P.mode === 'roam' || P.mode === 'corner')) {
        if (onStage && rs >= 0 && lit[rs] && Math.abs(run.x - P.x) < 24) {
          const corner = P.mode === 'corner';
          P.atkT = (corner ? 3.4 : 3.8) - n * 0.2 + Math.random() * 1.0;
          const sweep = Math.random() < (run.y > 1.5 ? 0.55 : 0.3);
          let d;
          if (sweep) {
            const sec = secs[rs];
            const dir = Math.random() < 0.5 ? 1 : -1;
            d = ['w', +(run.y + 0.9).toFixed(2), +sec[0].toFixed(2), +sec[1].toFixed(2), dir];
          } else {
            const lead = clamp(run.x + (Math.random() - 0.5) * 1.4, secs[rs][0] + 1.7, secs[rs][1] - 1.7);
            d = ['s', +lead.toFixed(2)];
          }
          attack(c, d);
          c.send('d6a', d);
        } else P.atkT = 0.8;
      }
    }
    P.send -= dt;
    if (P.send <= 0) {
      P.send = 0.08;
      c.send('d6p', [+P.x.toFixed(2), MODES.indexOf(P.mode), +P.vis.toFixed(2)]);
      local.pv.tx = P.x;
      local.pv.mode = MODES.indexOf(P.mode);
      local.pv.vis = P.vis;
    }
  };
  const snuffShow = (s) => {
    local.snuffFx = { s, t: 0 };
    Sound.play('dollWarn');
  };
  // an attack is played on every screen; the runner checks it against themselves
  const attack = (c, d) => {
    local.atks.push({ d, t: 0, hit: false });
    if (d[0] === 's') {
      Sound.play('dollWarn');
      setTimeout(() => Sound.play('slam'), 1300);
    } else {
      Sound.play('gaze');
      setTimeout(() => Sound.play('slam'), 1450);
    }
  };
  const ATK = { s: { warn: 1.3, act: 0.4, end: 2.2 }, w: { warn: 1.4, act: 0.7, end: 2.6 } };
  const sweepX = (d, u) => (d[4] > 0 ? lerp(d[2], d[3], u) : lerp(d[3], d[2], u));
  const tickAttacks = (c, dt) => {
    const me = rel(Player.body.p);
    const runner = c.role === walkerRole(6);
    local.atks.forEach((a) => {
      a.t += dt;
      const A = ATK[a.d[0]];
      if (!runner || a.hit || local.hitT > 0 || c.S.x.stage !== 6) return;
      if (a.t < A.warn || a.t > A.warn + A.act) return;
      if (me.z < W.BOSS.apron - 0.5) return;
      if (a.d[0] === 's') {
        if (Math.abs(me.x - a.d[1]) < 1.5) {
          a.hit = true;
          hitMe(c, a.d[1]);
        }
      } else {
        const u = (a.t - A.warn) / A.act;
        const hx = sweepX(a.d, u);
        const y = a.d[1];
        if (Math.abs(me.x - hx) < 1.3 && me.y < y + 0.6 && me.y + 1.75 > y - 0.6) {
          a.hit = true;
          hitMe(c, hx);
        }
      }
    });
    local.atks = local.atks.filter((a) => a.t < ATK[a.d[0]].end);
  };
  const hitMe = (c, fromX) => {
    local.hitT = 1.2;
    local.hp -= 1;
    const p = Player.body.p;
    const q = rel(p);
    const s = q.x >= fromX ? 1 : -1;
    Player.body.v.set(s * 4.5, 4.5, -1.5);
    Cam.shake = Math.max(Cam.shake, 0.5);
    fxBoth(c, ['hit', p.clone().add(V3(0, 1.2, 0)).toArray()]);
    if (local.hp <= 0) {
      local.hp = HP;
      HUD.say(TX.ko, T.master, 2200);
      c.send('d6say', [TX.koMate, 2000]);
      setTimeout(() => c.spawn(spawnFor(6, c.role), 0), 450);
    } else {
      HUD.say(TX.hit, T.master, 1600);
      c.send('d6say', [TX.hitMate, 1600]);
    }
  };

  // ---------- the puppet's pose, on every screen ----------
  const pose = {
    x: 0,
    vis: 1,
    lift: 0,
    walk: 0,
    lean: 0,
    head: 0,
    armL: [0, 0],
    armR: [0, 0],
    reachL: 1,
    reachR: 1,
    legL: [0, 0],
    legR: [0, 0],
    knots: [],
    hot: false,
    warn: null,
    warnK: 0,
    gold: 0,
  };
  local.pose = pose;
  let walkPh = 0;
  const SH = 6.7 + 5.0; // shoulder height above the puppet's root
  // aim an arm (local frame: +x to the viewer's right) at a point given in screen coords
  const aimArm = (side, tx, ty) => {
    const sx = pose.x - side * 1.7; // shoulder, relative world x (local +x is world -x)
    const dx = -(tx - sx);
    const dy = ty - (pose.lift + SH);
    const th = Math.atan2(dx, -dy);
    const len = Math.hypot(dx, dy);
    return [th, clamp(len / 9.1, 0.6, 2.4)];
  };
  const animPuppet = (c, dt, t) => {
    const pv = local.pv;
    const x = c.S.x;
    const dead = x.stage >= 7;
    const prevX = pose.x;
    pose.x = dead ? pose.x : damp(pose.x, pv.tx != null ? pv.tx : pv.x, 8, dt);
    const sp = Math.abs(pose.x - prevX) / Math.max(dt, 1e-3);
    pose.walk = damp(pose.walk, clamp(sp / 3, 0, 1), 6, dt);
    walkPh += dt * (2 + sp * 1.1);
    const mode = MODES[pv.mode] || 'roam';
    const corner = mode === 'corner';
    pose.vis = damp(pose.vis, dead ? 0 : pv.vis, 3, dt);
    pose.lean = corner ? Math.sin(t * 7) * 0.08 + Math.sin(t * 2.3) * 0.05 : Math.sin(t * 0.9) * 0.04 - (pose.walk * 0.06 * Math.sign(pose.x - prevX) || 0);
    pose.head = corner ? Math.sin(t * 9) * 0.18 : Math.sin(t * 1.3) * 0.1;
    // the strings pull the limbs: a marionette's dangle
    const sw = Math.sin(walkPh);
    pose.legL = [sw * 0.38 * pose.walk + (corner ? Math.sin(t * 6) * 0.15 : 0), Math.max(0, -sw) * 0.6 * pose.walk];
    pose.legR = [-sw * 0.38 * pose.walk + (corner ? Math.sin(t * 6 + 2) * 0.15 : 0), Math.max(0, sw) * 0.6 * pose.walk];
    pose.armL = [0.25 + Math.sin(t * 1.7) * 0.12 + (corner ? 0.6 + Math.sin(t * 8) * 0.3 : 0), -0.35 + Math.sin(t * 2.1) * 0.2];
    pose.armR = [-0.25 - Math.sin(t * 1.5) * 0.12 - (corner ? 0.6 + Math.sin(t * 7) * 0.3 : 0), 0.35 - Math.sin(t * 1.9) * 0.2];
    pose.reachL = pose.reachR = 1;
    pose.lift = corner ? Math.abs(Math.sin(t * 3)) * 0.4 : 0;
    // its entrance: lowered on its strings from the flies, legs dangling, then a bow
    if (local.introT < 3.2) {
      local.introT += dt;
      const k = smooth(clamp(local.introT / 2.6, 0, 1));
      pose.lift += (1 - k) * 16;
      pose.legL = [Math.sin(t * 5) * 0.3 * (1 - k), 0.4 * (1 - k)];
      pose.legR = [-Math.sin(t * 5 + 1) * 0.3 * (1 - k), 0.4 * (1 - k)];
      if (local.introT > 2.6 && !local.bowed) {
        local.bowed = 1;
        Sound.play('slam');
        Cam.shake = Math.max(Cam.shake, 0.35);
      }
      pose.lean += local.introT > 2.6 ? Math.sin(((local.introT - 2.6) / 0.6) * Math.PI) * 0.35 : 0;
    }
    // cut strings: that limb goes limp
    const cut = x.cut || [];
    if (cut[0]) pose.legL = [0.05, 0.1];
    if (cut[1]) pose.legR = [-0.05, 0.1];
    if (cut[2]) pose.armL = [0.05, -0.05];
    if (cut[3]) pose.armR = [-0.05, 0.05];
    // attacks override an arm
    pose.warn = null;
    pose.warnK = 0;
    local.atks.forEach((a) => {
      const A = ATK[a.d[0]];
      const k = clamp(a.t / A.warn, 0, 1);
      const struck = a.t >= A.warn;
      let tx;
      let ty;
      if (a.d[0] === 's') {
        tx = a.d[1];
        ty = struck ? lerp(14, 0.4, clamp((a.t - A.warn) / 0.18, 0, 1)) : lerp(10, 15.5, smooth(k));
        if (!struck) pose.warn = [a.d[1] - 1.5, a.d[1] + 1.5, 0, 22];
      } else {
        const u = clamp((a.t - A.warn) / A.act, 0, 1);
        tx = struck ? sweepX(a.d, u) : sweepX(a.d, 0);
        ty = a.d[1];
        if (!struck) pose.warn = [a.d[2], a.d[3], a.d[1] - 0.6, a.d[1] + 0.6];
      }
      if (!struck) pose.warnK = 0.35 + 0.4 * Math.abs(Math.sin(a.t * 9));
      // the arm on the side of the target strikes (a cut arm still can: it is a shadow)
      const side = tx > pose.x ? -1 : 1;
      const [th, reach] = aimArm(side, tx, ty);
      const blend = struck ? 1 : smooth(k);
      if (side < 0) {
        pose.armL = [lerp(pose.armL[0], th, blend), lerp(pose.armL[1], 0, blend)];
        pose.reachL = lerp(1, reach, blend);
      } else {
        pose.armR = [lerp(pose.armR[0], th, blend), lerp(pose.armR[1], 0, blend)];
        pose.reachR = lerp(1, reach, blend);
      }
    });
    // the knots: on its strings, where the runner can reach them from the shadow boxes
    const sec = W.secOf(pose.x);
    const cx = corner && sec >= 0 ? secC(sec) : pose.x;
    pose.knots = W.KNOTS.map(([u, y]) => [cx - u, y]);
    pose.hot = corner && !dead;
    // the fall
    if (dead) {
      local.won += dt;
      const k = clamp(local.won / 2.6, 0, 1);
      pose.lift = -k * k * 8;
      pose.lean = k * 0.6;
      pose.armL = [0.1 + k * 1.2, 0];
      pose.armR = [-0.1 - k * 1.4, 0];
      pose.gold = clamp((local.won - 1) / 2, 0, 1);
      cut.forEach((v, i) => (W.puppet.strings[i].cut = true));
    } else pose.gold = 0;
    W.puppet.strings.forEach((s, i) => {
      if (!dead) s.cut = !!cut[i];
    });
    W.posePuppet(pose, t);
  };

  // ---------- objectives ----------
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    const st = x.stage;
    if (st === 1) return TX.s1[PILOT[1] === r ? 'pilot' : 'walker'];
    if (st === 2) return TX.s2[PILOT[2] === r ? 'pilot' : 'walker'];
    const pc = ' ' + TX.match + ' : ' + Math.round(local.match * 100) + ' %' + (local.hold > 0 ? ', ' + TX.hold : '') + '.';
    if (st === 3) return (SEER[3] === r ? TX.s3.seer : TX.s3.blind) + pc;
    if (st === 4) return (SEER[4] === r ? TX.s4.seer : TX.s4.pilot) + pc;
    if (st === 5) return TX.s5[PILOT[5] === r ? 'pilot' : 'walker'];
    if (st === 6) {
      const q = rel(Player.body.p);
      if (q.z < W.BOSS.lightZ - 6 && !local.said.inHall) return TX.s6.enter;
      return TX.s6[PILOT[6] === r ? 'pilot' : 'walker'];
    }
    return TX.card;
  };
  const stageEnter = (c, st) => {
    const prev = local.stage;
    local.stage = st;
    local.ctl = false;
    local.sel = 0;
    local.match = 0;
    local.hold = 0;
    if (Player.mode === 'frozen') Player.mode = 'walk';
    const scr = W.screen;
    if (st === 1 && scr) scr.show(TITLE, CARD + ' · le théâtre d’ombres', '#ffcf7a');
    if (prev && st > prev) {
      if (st <= 6) HUD.say(st === 6 ? 'Le Montreur d’ombres.' : TX.exit, T.master, 2200);
      if (st === 3 || st === 4 || st === 5) HUD.say(TX.open, T.master, 2000);
    }
    if (st === 5 && !local.said.gates) {
      local.said.gates = 1;
      setTimeout(() => HUD.say(TX.s5.gates, T.master, 3200), 3500);
    }
    if (st === 6) {
      Sound.mood('tense');
      local.introT = 0;
      local.bowed = 0;
      Sound.play('roar');
      Box.mode('tense');
    } else if (st === 7) {
      Sound.mood('gold');
      Box.mode('gold');
      HUD.boss(null);
      HUD.say(TX.won, T.master, 3000);
      HUD.say(TX.card, T.master, 3000);
      City.mood({ gold: 0.8 });
      local.won = 0;
      local.cardT = 0;
    } else {
      Sound.mood('calm');
      Box.mode('calm');
    }
    if (st !== 6) HUD.status('');
    // the roles of this room, said once
    if (prev && st > prev && st <= 6) setTimeout(() => HUD.say(objective(c), T.master, 4200), 2400);
  };

  Story.register('tr_d6', {
    init: () => ({ stage: 1, rig: {}, lit: [1, 1, 1], cut: [0, 0, 0, 0], won: false }),
    voice: () => 1,
    net: {
      d6r: (c, d) => {
        const [id, r] = d;
        if (PILOT[c.S.x.stage] === c.role && ROOM[c.S.x.stage] === id && local.ctl) return;
        local.rx[id] = performance.now();
        applyRig(id, r, false);
      },
      d6m: (c, d) => {
        if (Net.isHost) return;
        local.match = d[0];
        local.hold = d[1] || 0;
      },
      d6p: (c, d) => {
        if (Net.isHost) return;
        local.pv.tx = d[0];
        local.pv.mode = d[1];
        local.pv.vis = d[2];
      },
      d6a: (c, d) => {
        if (!Net.isHost) attack(c, d);
      },
      d6s: (c, d) => {
        if (!Net.isHost) snuffShow(d[0]);
      },
      d6fx: (c, d) => fx(c, d),
      d6say: (c, d) => {
        if (!(d[2] && HUD.talking)) HUD.say(d[0], T.master, d[1] || 2400);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      W.wake();
      const x = c.S.x;
      local.stage = 0;
      local.ctl = false;
      local.atks = [];
      local.pup = null;
      local.hp = HP;
      local.said = {};
      local.target = {};
      local.tgt = {};
      local.rx = {};
      local.notch = [1, 1];
      local.cutHold = 0;
      local.snuff = null;
      local.snuffFx = null;
      W.resetRig();
      // a saved rig comes back as it was
      Object.entries(x.rig || {}).forEach(([id, r]) => applyRig(id, r, true));
      c.spawn(spawnFor(x.stage, c.role, x.stage === 1), 0);
      Cam.yaw = 0;
      Player.killY = W.O.y - 7;
      Player.checkpoint = () => {
        const S = Story.S.x;
        const q = rel(Player.body.p);
        const pilot = PILOT[S.stage] === c.role;
        HUD.say(pilot ? TX.fallPilot : TX.fall, T.master, 2000);
        c.send('d6say', [TX.fallMate, 2000]);
        fxBoth(c, ['fall', Player.body.p.toArray()]);
        local.ctl = false;
        void q;
        return spawnFor(S.stage, c.role);
      };
      Player.targets = () => (c.role === walkerRole(6) && Story.S.x.stage === 6 ? W.RINGS.map((r, i) => W.ringPos(i)) : []);
      Player.grappleLand = () => {
        const i = Player.target;
        if (Story.S.x.stage !== 6 || i < 0 || !Story.S.x.lit[i]) return null;
        const b = W.BAL[3];
        return W.P(secC(i) - b[0], b[1], W.ROOMS.boss.zw - 1.75);
      };
      if (!local.env)
        local.env = {
          hi: R.hemi.intensity,
          hs: R.hemi.color.getHex(),
          hg: R.hemi.groundColor.getHex(),
          mi: R.moon.intensity,
          mc: R.moon.color.getHex(),
        };
      R.hemi.color.set('#6a5a90');
      R.hemi.groundColor.set('#1c1018');
      R.hemi.intensity = 0.5;
      R.moon.color.set('#ffb088');
      R.moon.intensity = 0.55;
      City.mood({ gold: x.stage >= 7 ? 0.8 : 0.3, dark: 0.25 });
      c.fog(0.006);
      HUD.visa(CARD + ' · ' + TITLE);
      Box.start();
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (x.stage === 1) {
        HUD.say(TX.intro, T.master, 3400);
        HUD.say(TX.rule, T.master, 4200);
      }
      this.apply(c);
    },
    exit() {
      if (local.env) {
        R.hemi.intensity = local.env.hi;
        R.hemi.color.setHex(local.env.hs);
        R.hemi.groundColor.setHex(local.env.hg);
        R.moon.intensity = local.env.mi;
        R.moon.color.setHex(local.env.mc);
        local.env = null;
      }
      if (Player.mode === 'frozen') Player.mode = 'walk';
      Player.targets = null;
      Player.grappleLand = null;
      HUD.boss(null);
      HUD.status('');
      showPanel(null);
      Box.stop();
      W.sleep();
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
      // the boss lights follow the shared state
      W.WALLS.boss.lights.forEach((L, i) => (L.on = !!(x.lit && x.lit[i])));
      // a rig with no live pilot data: take the saved one
      Object.entries(x.rig || {}).forEach(([id, r]) => {
        const live = local.rx[id] && performance.now() - local.rx[id] < 3000;
        const mine = PILOT[x.stage] === c.role && ROOM[x.stage] === id;
        if (!live && !mine && !local.tgt[id]) applyRig(id, r, false);
      });
      HUD.objective(objective(c));
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const st = x.stage;
      const pos = (r) => rel(c.pos(r));
      // ---------- progression ----------
      if (st === 1 || st === 2 || st === 5) {
        const id = ROOM[st];
        if (W.onExit(id, pos(walkerRole(st)))) {
          c.set((s) => (s.x.stage = st + 1));
          fxBoth(c, ['stage', W.P(-19, W.ROOMS[id].ew + 1, W.ROOMS[id].zw - 1).toArray()]);
        }
      }
      if (st === 3 || st === 4) {
        local.matchT -= dt;
        if (local.matchT <= 0) {
          local.matchT = 0.2;
          const id = ROOM[st];
          const w = W.WALLS[id];
          const bodies = ['dame', 'valet'].map((r) => pos(r)).filter((q) => W.inRoom(id, q) && q.z > w.lights[0].z + 0.5);
          const g = W.shadowGrid(w, bodies, AREA.x0, AREA.x1, AREA.y0, AREA.y1, AREA.nx, AREA.ny);
          const tg = targetGrid(id);
          let I = 0;
          let U = 0;
          for (let i = 0; i < g.length; i++) {
            if (g[i] && tg[i]) I++;
            if (g[i] || tg[i]) U++;
          }
          local.match = U ? I / U : 0;
          // the props alone can come close: the shape is only right with the bodies in it
          if (bodies.length < (st === 3 ? 2 : 1)) local.match = Math.min(local.match, 0.5);
          local.hold = local.match >= THR ? local.hold + 0.2 : 0;
          c.send('d6m', [+local.match.toFixed(3), +local.hold.toFixed(2)]);
          if (local.hold >= 1.2) {
            c.set((s) => (s.x.stage = st + 1));
            fxBoth(c, ['open', W.P(0, 2.2, w.zw - 0.5).toArray()]);
          }
        }
      }
      if (st === 6 || st === 7) hostBoss(c, dt);
      if (st === 7) {
        local.cardT += dt;
        const C = W.P(0, 0, W.ROOMS.boss.zw - 1.6);
        const near = (r) => {
          const p = c.pos(r);
          return Math.hypot(p.x - C.x, p.z - C.z) < 3.4;
        };
        if (local.cardT > 4 && near('dame') && near('valet')) c.goto('reward', (s) => (s.x.card = 'd6'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'rig' && RIG[d.id]) c.set((s) => (s.x.rig = { ...s.x.rig, [d.id]: d.r }));
      if (d.a === 'lit' && x.stage === 6 && PILOT[6] === who) {
        c.set((s) => (s.x.lit = s.x.lit.map((v, i) => (i === d.s ? (v ? 0 : 1) : v))));
        if (local.snuff && local.snuff.s === d.s) local.snuff = null;
        const cs = W.consoles['lev' + d.s];
        fxBoth(c, ['lever', W.P(cs.x, 1.4, cs.z).toArray()]);
      }
      if (d.a === 'cut' && x.stage === 6 && local.pup && local.pup.mode === 'corner' && !x.cut[d.i]) {
        const n = cutsN(x) + 1;
        c.set((s) => {
          s.x.cut = s.x.cut.map((v, i) => (i === d.i ? 1 : v));
          if (n >= 4) {
            s.x.stage = 7;
            s.x.won = true;
            // every projector up for the gold
            s.x.lit = [1, 1, 1];
          }
        });
        const k = W.KNOTS[d.i];
        const sec = W.secOf(local.pup.x);
        const kx = (sec >= 0 ? secC(sec) : local.pup.x) - k[0];
        fxBoth(c, ['cut', W.P(kx, k[1], W.ROOMS.boss.zw - 1.3).toArray()]);
        if (n >= 4) {
          local.snuff = null;
          fxBoth(c, ['win']);
        }
        else {
          sayBoth(c, TX.s6.cut[n - 1] + ' ' + TX.s6.flee, null, 3400);
          // it tears itself free: it pulls a dark projector back on and melts into that light
          const P = local.pup;
          const k = sec >= 0 ? sec : 1;
          const dark = [0, 1, 2].filter((i) => i !== k && !c.S.x.lit[i]);
          const far = dark.sort((a, b) => Math.abs(b - k) - Math.abs(a - k))[0];
          const to = far != null ? far : [0, 1, 2].filter((i) => i !== k)[Math.floor(Math.random() * 2)];
          if (!c.S.x.lit[to]) {
            c.set((s) => (s.x.lit = s.x.lit.map((v, i) => (i === to ? 1 : v))));
            const cs = W.consoles['lev' + to];
            fxBoth(c, ['snuff', W.P(cs.x, 1.4, cs.z).toArray()]);
          }
          P.flee = to;
          P.mode = 'gone';
          P.goneT = 0;
          P.cornerT = -1.5;
          P.wait = 0;
          P.atkT = 3.2;
          local.snuff = null;
        }
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      const st = x.stage;
      const r = c.role;
      const p = Player.body.p;
      const q = rel(p);
      const room = ROOM[st];
      const w = W.WALLS[room];
      local.hitT = Math.max(0, local.hitT - dt);
      let prompt = null;

      // ---------- the rig: anchors first, then this frame's changes, then carry ----------
      const pitWall = st === 1 || st === 2 || st === 5 ? w : st >= 6 ? W.WALLS.boss : null;
      const an = pitWall ? anchors(pitWall) : null;
      const pilot = amPilot(c) && !!RIG[room];
      if (pilot) {
        const nearC = W.nearConsole(room, q);
        if (local.ctl) {
          prompt = pilotTick(c, dt);
          if (Input.pressed('interact') || !nearC) {
            local.ctl = false;
            Player.mode = 'walk';
            sendRig(c, 0, true);
          }
        } else if (nearC) {
          prompt = ['E', st === 5 ? 'Prendre les deux lumières' : 'Prendre la régie'];
          if (Input.pressed('interact')) {
            local.ctl = true;
            Player.mode = 'frozen';
            Player.body.v.set(0, 0, 0);
            Sound.play('ui');
          }
        }
        if (local.ctl) Player.mode = 'frozen';
        sendRig(c, dt);
      } else if (RIG[room]) {
        if (room === 'r5') glideNotch(dt);
        else glideRig(room, dt);
      }
      if (room === 'r5' && pilot) glideNotch(dt);
      if (pitWall) carry(pitWall, an);
      // the first time a shadow takes your weight
      if (pitWall && !local.said.carried && Player.body.grounded && W.groundOn(pitWall, Player.body) >= 0) {
        local.said.carried = 1;
        HUD.say(TX.carried, T.master, 2200);
        Sound.play('chime');
        Fx.burst(Player.body.p.clone(), '#ffcf7a', 24, 2.5, 0.7, -2);
      }

      if (!local.ctl) W.select(null);
      // ---------- the boss levers and the strings ----------
      if (st === 6) {
        if (r === PILOT[6]) {
          for (let s = 0; s < 3; s++) {
            if (!W.nearConsole('lev' + s, q, 2.4)) continue;
            prompt = ['E', (x.lit[s] ? 'Éteindre' : 'Allumer') + ' le projecteur ' + ['de gauche', 'du centre', 'de droite'][s]];
            if (Input.pressed('interact')) c.act({ a: 'lit', s });
          }
        } else {
          // a hot knot in reach: hold E to cut
          if (pose.hot) {
            const chest = V3(q.x, q.y + 1.2, q.z);
            const i = pose.knots.findIndex((k, j) => !x.cut[j] && Math.hypot(k[0] - chest.x, k[1] - chest.y, W.ROOMS.boss.zw - 1.3 - chest.z) < 1.9);
            if (i >= 0) {
              prompt = ['E', 'Couper le fil (maintenir)', true];
              if (Input.held('interact')) {
                local.cutHold += dt;
                if (local.cutHold > 0.45) {
                  local.cutHold = -1;
                  c.act({ a: 'cut', i });
                }
              } else local.cutHold = 0;
            } else local.cutHold = 0;
          }
          HUD.status(local.hp > 0 ? '♥ '.repeat(local.hp).trim() : '');
        }
        const n = cutsN(x);
        const m = MODES[local.pv.mode];
        HUD.boss('Le Montreur d’ombres', (4 - n) / 4, m === 'corner' ? 'Coincé · coupez les fils' : m === 'gone' ? 'Dans le noir' : 'Libre · coincez-le dans une seule lumière');
        if (q.z > W.BOSS.lightZ - 6) local.said.inHall = 1;
      }
      if (st === 6 || st === 7) {
        tickAttacks(c, dt);
        animPuppet(c, dt, t);
        // the lever a puppet's string is about to flip
        if (local.snuffFx) {
          local.snuffFx.t += dt;
          const cs = W.consoles['lev' + local.snuffFx.s];
          if (cs && Math.random() < dt * 20) Fx.burst(W.P(cs.x + (Math.random() - 0.5), 1.3, cs.z), '#ff5a3a', 4, 2, 0.5, -2);
          if (local.snuffFx.t > 2.3) local.snuffFx = null;
        }
      }
      if (st === 7) {
        local.cardT = Net.isHost ? local.cardT : local.cardT + dt;
      }

      // ---------- the silhouette panel, and the screen warming up as the shadow comes right ----------
      showPanel(SEER[st] === r ? ROOM[st] : null);
      if (panel && panel.style.display !== 'none') panel.userData.m.textContent = TX.match + ' · ' + Math.round(local.match * 100) + ' %' + (local.hold > 0 ? ' · ' + TX.hold : '');
      if (st === 3 || st === 4) {
        const U = W.WALLS[ROOM[st]].U;
        const want = local.hold > 0 ? 0.25 + 0.45 * clamp(local.hold / 1.2, 0, 1) : clamp((local.match - 0.4) / (THR - 0.4), 0, 1) * 0.12;
        U.uGold.value = damp(U.uGold.value, want, 4, dt);
        const band = local.match >= THR ? 3 : local.match >= 0.6 ? 2 : local.match >= 0.45 ? 1 : 0;
        if (band > (local.band || 0)) Sound.play(band === 3 ? 'lantern' : 'tile');
        local.band = band;
      }

      // ---------- the world ----------
      const bodies = [p];
      if (Remote.has) bodies.push(Remote.pos);
      const walls = { r1: st === 1, r2: st === 2, r5: st === 5, boss: st >= 6 && st < 7, r3: false, r4: false };
      const near = { r1: st <= 2, r2: st >= 1 && st <= 3, r3: st >= 2 && st <= 4, r4: st >= 3 && st <= 5, r5: st >= 4 && st <= 6, boss: st >= 5 };
      const doors = {};
      doors.r1out = doors.r1exit = st > 1;
      doors.r2in = st >= 2;
      doors.r2out = doors.r2exit = st > 2;
      doors.r3in = st >= 3;
      doors.r3scr = st >= 4;
      doors.r4scr = st >= 5;
      doors.r5out = doors.r5exit = st >= 6;
      W.update(dt, t, {
        room,
        bodies,
        walls,
        near,
        doors,
        rings: st === 6,
        won: st >= 7,
        card: st >= 7 && local.won > 2.2,
        cardK: st >= 7 ? clamp((local.won - 2.2) / 2.5, 0, 1) : 0,
      });
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(objective(c));
      }
      return prompt;
    },
  });
})();
