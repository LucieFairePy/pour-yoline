// ♥ 8 · Le Bal. Trust: one of you sees, the other follows. The waltz (one leads and sees the
// steps of light, the other only sees the one who leads), the masked ball (find each other among
// the masks by an agreed sign), the gallery of mirrors (each sees the other's way, never their
// own), then the Grand Lustre: one last waltz hand in hand, on the beat, to relight the hall.
(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('h7');
  const T = CONFIG;
  const TITLE = 'Le Bal';
  const TXT = {
    intro: 'Épreuve de confiance. Un palais oublié, et son bal qui n’a jamais fini.',
    rule: 'Ici, l’un de vous voit, l’autre suit. Puis l’inverse.',
    s1: 'Le palais dort depuis cent ans. Entrez dans le salon de valse.',
    s2: {
      wait: {
        lead: 'La valse. Tu mènes : place-toi dans le cercle d’or. {mate} se place dans le cercle rose, face à toi.',
        follow: 'La valse. {mate} mène : place-toi dans le cercle rose, face à {lui}. {Il} voit les pas, pas toi.',
      },
      run: {
        lead: 'Tu mènes. Pose le pied sur chaque pas lumineux pile sur le « un ». Pas trop vite : {mate} doit suivre.',
        follow: 'Tu suis. Tu ne vois pas les pas : reste face à {mate}, à deux pas de {lui}, sans {le} lâcher.',
      },
      fig: ['Première figure : le cercle.', 'Deuxième figure : le huit. Les rôles s’inversent.', 'Dernière figure : le cœur. Vous menez chacun votre tour, deux pas chacun.'],
      swap: 'Changez : c’est à {mate} de mener.',
      swapMe: 'Changez : c’est à toi de mener.',
      count: 'Un, deux, trois…',
      done: 'La figure est parfaite. Le parquet brille.',
      lateLead: 'Le pas est manqué. Le parquet se fend.',
      far: 'Vous vous êtes lâchés. Le parquet se fend.',
      broke: 'Le parquet cède sous la valse brisée. Il se répare : reprenez la figure du début.',
      end: 'La dernière note s’éteint. Une porte s’ouvre au fond du salon.',
    },
    s3: {
      pick: 'Le bal masqué. Choisissez chacun un signe (E) : ce sera votre signal. Retenez celui de l’autre, et sa couleur.',
      curtain: 'Passez chacun votre rideau : le vôtre est de votre couleur.',
      search: 'Retrouve {mate} parmi les masques. F : lever ton signe. E près d’un masque : l’inviter.',
      enter: 'Les masques se referment sur vous. Tout le monde se ressemble.',
      sign: 'Le signe de {mate} : ',
      mimic: 'Des masques se mettent à imiter vos signes… Regardez bien la couleur.',
      wrong: 'Ce masque n’est pas {le} bon{pe}. Il se détourne.',
      found: 'Vous vous êtes retrouvés. Les masques tombent, le bal salue.',
      foundObj: 'Vous vous êtes retrouvés. La galerie des miroirs est ouverte, au fond.',
    },
    s4: {
      mirror: 'Les miroirs te montrent le chemin de {mate}, pas le tien. Guide-{le} : E pour lui montrer un carreau. Toi, suis ce que {mate} te montre.',
      floor: 'Tu vois le chemin de {mate} sur le sol, pas le tien. Guide-{le} : E pour lui montrer un carreau. Ton chemin, {mate} le voit dans les miroirs.',
      half2: 'Le palier. Les rôles s’inversent : celui qui regardait le sol regarde les miroirs.',
      wrongLane: 'Ce n’est pas ton allée. Le carreau se dérobe.',
      fall: 'Le carreau se dérobe. Retour au palier.',
      fallMate: '{mate} est tombé{pe}. {Il} recommence au palier.',
      shown: '{mate} te montre un carreau.',
      done: 'La galerie est franchie. La grande salle vous attend.',
    },
    s5: {
      enter: 'La grande salle de bal. Avancez ensemble sous le Grand Lustre.',
      intro: 'Le bal s’emballe ! Le Grand Lustre se décroche.',
      fight: 'Rallumez les quatre candélabres : près d’un candélabre éteint, main dans la main, appuyez ensemble sur E pile sur le « un ». Candélabres : {n} / 4.',
      measure: 'Une mesure. Le candélabre se ranime.',
      lit: 'Un candélabre se rallume !',
      apart: 'Main dans la main : rapprochez-vous.',
      noCandle: 'Dansez près d’un candélabre éteint.',
      offbeat: 'À contretemps.',
      onbeat: 'Dans le temps.',
      hit: 'Une pampille t’a frappé{e}.',
      hitMate: 'Une pampille a frappé {mate}.',
      lose: 'La flamme vacille : une mesure perdue.',
      fall: 'Le parquet s’est dérobé. Retour au bord.',
      fallMate: '{mate} est tombé{pe} du parquet.',
      last: 'Dernier candélabre. La dernière valse !',
      half: 'Deux candélabres ! Le Grand Lustre s’emballe, le parquet aussi.',
      lone: '{mate} a frappé le « un » sans toi : appuie en même temps que {lui}.',
    },
    win: 'À la dernière mesure, le Grand Lustre remonte doucement à sa place, tout illuminé. Les danseurs saluent.',
    card: 'La carte ' + CARD + ' brille au-dessus du lustre. Allez-y ensemble.',
  };
  CONFIG.cards.h7 = {
    title: TITLE,
    sub: 'Épreuve ♥ · réussie',
    lines: [
      'L’un voyait les pas, l’autre a suivi sans les voir.',
      'Parmi cent masques, il a suffi d’un signe pour se reconnaître.',
      'La confiance, c’est une valse : on ne regarde pas ses pieds, on se regarde.',
    ],
  };
  const SIGN_NAME = { coeur: 'le cœur', etoile: 'l’étoile', lune: 'la lune', rose: 'la rose', eventail: 'l’éventail' };
  const GLOW = { dame: '#ff7fa8', valet: '#7cc8ff' };
  const FAKE = ['#ffd27a', '#e8e8ff', '#9affc8', '#c49aff', '#ffb070'];

  const local = {
    stage: 0,
    beat: 0,
    bpm: 84,
    beatSent: 0,
    style: null,
    // waltz (host)
    hold: 0,
    okLead: false,
    folIn: 0,
    folAll: 0,
    breakT: 0,
    lastLeader: null,
    // mask
    sigCd: 0,
    invCd: 0,
    mimic: 0,
    decoyT: 0,
    searchT: 0,
    mySign: null,
    // gallery
    marks: { L: null, R: null },
    standT: 0,
    standId: null,
    halfSeen: 0,
    aim: null,
    // ball
    presses: { dame: -9, valet: -9 },
    lastBar: -1,
    hitT: 0,
    hitCd: 0,
    fbCd: 0,
    pressFx: 0,
    endT: 0,
    said: {},
    objT: 0,
    env: null,
    beamObj: null,
  };
  H7.local = local;
  const tmp = V3();
  const tmp2 = V3();
  const hv = V3();
  const hv2 = V3();
  const mateRole = (r) => (r === 'dame' ? 'valet' : 'dame');
  const laneOf = (r) => (r === 'dame' ? 'L' : 'R');
  const fmtS = (s) => Story.fmt(s);

  // ===================== the music: a waltz in three, procedural =====================
  const Bal = (() => {
    let ac = null;
    let out = null;
    let verb = null;
    let noise = null;
    let lastH = -1;
    let gain = 0;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const init = () => {
      if (ac || !Sound.ready) return !!ac;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ac = new AC();
      } catch (e) {
        return false;
      }
      out = ac.createGain();
      out.gain.value = 0;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      out.connect(comp).connect(ac.destination);
      verb = ac.createConvolver();
      const len = ac.sampleRate * 2.6;
      const b = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      verb.buffer = b;
      const wet = ac.createGain();
      wet.gain.value = 0.32;
      verb.connect(wet).connect(out);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const nd = noise.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      return true;
    };
    const env = (g, t, a, peak, d, sus = 0.0001) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
    };
    const route = (node, dry = 1, wet = 1) => {
      const g1 = ac.createGain();
      g1.gain.value = dry;
      node.connect(g1).connect(out);
      if (wet) {
        const g2 = ac.createGain();
        g2.gain.value = wet;
        node.connect(g2).connect(verb);
      }
    };
    const bass = (m, t, v = 1) => {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(m);
      const o2 = ac.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = hz(m) / 2;
      const g = ac.createGain();
      env(g, t, 0.01, 0.16 * v, 0.55);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      o.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      route(g, 1, 0.3);
      o.start(t);
      o2.start(t);
      o.stop(t + 0.7);
      o2.stop(t + 0.7);
    };
    const pah = (ms, t, v = 1, bright = 1500) => {
      ms.forEach((m) => {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(m);
        o.detune.value = (Math.random() - 0.5) * 8;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = bright;
        const g = ac.createGain();
        env(g, t, 0.012, 0.03 * v, 0.24);
        o.connect(lp).connect(g);
        route(g, 0.8, 0.6);
        o.start(t);
        o.stop(t + 0.32);
      });
    };
    const celesta = (m, t, dur, v = 1) => {
      [1, 2, 4].forEach((k, i) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = hz(m) * k;
        const g = ac.createGain();
        env(g, t, 0.005, [0.07, 0.022, 0.008][i] * v, 0.4 + dur * 0.9);
        o.connect(g);
        route(g, 0.8, 1);
        o.start(t);
        o.stop(t + 0.5 + dur * 1.1);
      });
    };
    const violin = (m, t, dur, v = 1) => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      const vib = ac.createOscillator();
      vib.frequency.value = 5.6;
      const vg = ac.createGain();
      vg.gain.value = hz(m) * 0.006;
      vib.connect(vg).connect(o.frequency);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      lp.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045 * v, t + 0.07);
      g.gain.setValueAtTime(0.045 * v, t + Math.max(0.08, dur - 0.08));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      o.connect(lp).connect(g);
      route(g, 0.8, 1);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 0.3);
      vib.stop(t + dur + 0.3);
    };
    const tick = (t, v = 1) => {
      const n = ac.createBufferSource();
      n.buffer = noise;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      bp.Q.value = 3;
      const g = ac.createGain();
      env(g, t, 0.002, 0.05 * v, 0.05);
      n.connect(bp).connect(g);
      route(g, 1, 0.2);
      n.start(t);
      n.stop(t + 0.1);
    };
    // [chord notes, bass root] per bar, melody [beat, midi, beats] per bar
    const C = {
      F: [[57, 60, 65], 41],
      Dm: [[57, 62, 65], 38],
      Bb: [[58, 62, 65], 46],
      C: [[55, 60, 64], 36],
      C7: [[55, 58, 64], 36],
      A7: [[55, 61, 64], 45],
      Gm: [[55, 58, 62], 43],
      Dm2: [[53, 57, 62], 50],
    };
    const SONGS = {
      salon: {
        bars: ['F', 'F', 'Dm', 'Dm', 'Bb', 'C', 'F', 'C7'],
        mel: [
          [[0, 72, 2], [2, 69, 1]],
          [[0, 77, 2], [2, 76, 0.5], [2.5, 74, 0.5]],
          [[0, 69, 1.5], [1.5, 72, 0.5], [2, 74, 1]],
          [[0, 77, 2], [2, 76, 1]],
          [[0, 74, 1], [1, 72, 1], [2, 70, 1]],
          [[0, 72, 1.5], [1.5, 70, 0.5], [2, 67, 1]],
          [[0, 69, 1], [1, 72, 1], [2, 77, 1]],
          [[0, 76, 2], [2, 79, 1]],
        ],
        lead: 'celesta',
        tick: true,
      },
      masque: {
        bars: ['Dm', 'A7', 'Dm', 'Gm', 'Dm', 'Bb', 'A7', 'Dm'],
        mel: [
          [[0, 74, 1], [1, 77, 1], [2, 81, 1]],
          [[0, 79, 2], [2, 76, 1]],
          [[0, 77, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 73, 1]],
          [[0, 74, 2], [2, 70, 1]],
          [[0, 69, 1], [1, 74, 1], [2, 77, 1]],
          [[0, 82, 2], [2, 81, 1]],
          [[0, 79, 1], [1, 77, 1], [2, 76, 1]],
          [[0, 74, 3]],
        ],
        lead: 'celesta',
        soft: 0.8,
      },
      miroir: {
        bars: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C7'],
        arp: true,
        lead: 'celesta',
        soft: 0.6,
      },
      lustre: {
        bars: ['Dm2', 'Dm2', 'Bb', 'A7', 'Dm2', 'Gm', 'A7', 'A7'],
        mel: [
          [[0, 74, 1], [1, 77, 1], [2, 81, 1]],
          [[0, 86, 2], [2, 84, 0.5], [2.5, 82, 0.5]],
          [[0, 82, 1], [1, 81, 1], [2, 77, 1]],
          [[0, 76, 2], [2, 73, 1]],
          [[0, 74, 1], [1, 77, 1], [2, 81, 1]],
          [[0, 82, 2], [2, 79, 1]],
          [[0, 81, 1], [1, 79, 0.5], [1.5, 77, 0.5], [2, 76, 1]],
          [[0, 73, 2], [2, 76, 1]],
        ],
        lead: 'violin',
        tick: true,
        loud: 1.15,
      },
      fin: {
        bars: ['F', 'Dm', 'Bb', 'C', 'F', 'Bb', 'C7', 'F'],
        mel: [
          [[0, 81, 2], [2, 77, 1]],
          [[0, 81, 1], [1, 84, 1], [2, 86, 1]],
          [[0, 82, 2], [2, 81, 1]],
          [[0, 79, 3]],
          [[0, 81, 1], [1, 84, 1], [2, 89, 1]],
          [[0, 86, 2], [2, 82, 1]],
          [[0, 84, 1], [1, 82, 1], [2, 79, 1]],
          [[0, 77, 3]],
        ],
        lead: 'violin',
        celesta: true,
      },
    };
    // schedule the half-beats coming in the next 0.25 s
    const tick16 = (beat, bpm, style, vol) => {
      if (!init()) return;
      if (ac.state === 'suspended') ac.resume();
      gain = damp(gain, style ? vol : 0, 1.6, 1 / 60);
      out.gain.value = gain * (typeof SETTINGS !== 'undefined' ? SETTINGS.vol : 0.8) * 0.7;
      if (!style || !SONGS[style]) {
        lastH = Math.floor(beat * 2);
        return;
      }
      const S = SONGS[style];
      const spb = 60 / bpm;
      const now = ac.currentTime;
      const hEnd = Math.floor((beat + 0.25 / spb) * 2);
      if (lastH < Math.floor(beat * 2) - 1) lastH = Math.floor(beat * 2) - 1;
      for (let h = lastH + 1; h <= hEnd; h++) {
        lastH = h;
        const when0 = now + (h / 2 - beat) * spb;
        if (when0 < now - 0.01) continue;
        const when = Math.max(when0, now + 0.003);
        const b = h / 2;
        const bar = Math.floor(b / 3);
        const inBar = b - bar * 3;
        const ch = C[S.bars[((bar % 8) + 8) % 8]];
        const soft = S.soft || 1;
        const loud = S.loud || 1;
        if (inBar === 0) {
          bass(ch[1], when, loud);
          if (S.tick) tick(when, 1);
        } else if (inBar === 1 || inBar === 2) pah(ch[0], when, soft * loud, S.lead === 'violin' ? 2200 : 1500);
        if (S.arp) {
          // music box: rising and falling arpeggio in eighths
          const notes = [...ch[0], ch[0][0] + 12, ch[0][1] + 12, ch[0][2] + 12];
          const i = Math.round(inBar * 2);
          const up = bar % 2 === 0;
          const m = notes[up ? i : 5 - i] + 12;
          celesta(m, when, 0.5, 0.75);
          continue;
        }
        const ml = S.mel[((bar % 8) + 8) % 8];
        ml.forEach(([at, m, dur]) => {
          if (Math.abs(at - inBar) > 0.01) return;
          // every other phrase an octave up, an eighth-note ornament on the long notes
          const oct = Math.floor(bar / 8) % 2 && S.lead === 'celesta' ? 12 : 0;
          if (S.lead === 'violin') violin(m, when, dur * spb * 0.95, loud);
          else celesta(m + oct, when, dur * spb, soft);
          if (S.celesta) celesta(m + 12, when, dur * spb, 0.5);
        });
      }
    };
    // the murmur of a masked crowd: two breathing bands of noise
    let mur = null;
    const murmur = (v) => {
      if (!ac) return;
      if (!mur) {
        if (!v) return;
        const g = ac.createGain();
        g.gain.value = 0;
        g.connect(ac.destination);
        [[420, 0.23], [980, 0.37], [1900, 0.51]].forEach(([f, lf], i) => {
          const n = ac.createBufferSource();
          n.buffer = noise;
          n.loop = true;
          n.playbackRate.value = 0.9 + i * 0.07;
          const bp = ac.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = f;
          bp.Q.value = 1.4;
          const ag = ac.createGain();
          ag.gain.value = [0.5, 0.32, 0.12][i];
          const lfo = ac.createOscillator();
          lfo.frequency.value = lf;
          const lg = ac.createGain();
          lg.gain.value = [0.3, 0.2, 0.08][i];
          lfo.connect(lg).connect(ag.gain);
          n.connect(bp).connect(ag).connect(g);
          n.start();
          lfo.start();
        });
        mur = g;
      }
      const vol = (typeof SETTINGS !== 'undefined' ? SETTINGS.vol : 0.8) * 0.09 * v;
      mur.gain.setTargetAtTime(vol, ac.currentTime, 0.6);
    };
    return {
      tick: tick16,
      murmur,
      chord(t0) {
        // the final chord of the ball
        if (!init()) return;
        const t = ac.currentTime + (t0 || 0);
        [53, 57, 60, 65, 69, 72].forEach((m, i) => violin(m, t + i * 0.03, 3.2, 0.7));
        bass(41, t, 1.2);
        celesta(77, t, 3, 1);
      },
      get ready() {
        return !!ac;
      },
    };
  })();

  // ===================== the beat widget (1 · 2 · 3) =====================
  let beatEl = null;
  const beatUI = (on, beat, hint, warn) => {
    if (!on) {
      if (beatEl) beatEl.style.opacity = '0';
      return;
    }
    if (!beatEl) {
      beatEl = document.createElement('div');
      beatEl.id = 'h7beat';
      beatEl.style.cssText =
        'position:fixed;left:50%;bottom:31%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;z-index:6;transition:opacity .4s;opacity:0;font-family:Georgia,serif;';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:14px;align-items:center;';
      beatEl.dots = [0, 1, 2].map((i) => {
        const d = document.createElement('div');
        const s = i === 0 ? 22 : 14;
        d.style.cssText = `width:${s}px;height:${s}px;border-radius:50%;border:2px solid rgba(232,189,132,.85);background:rgba(232,189,132,.0);box-shadow:0 0 0 rgba(255,207,138,0);transition:background .08s,box-shadow .08s;`;
        row.appendChild(d);
        return d;
      });
      beatEl.appendChild(row);
      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(251,239,230,.85);text-shadow:0 1px 6px rgba(0,0,0,.9);font-family:monospace;';
      beatEl.lab = lab;
      beatEl.appendChild(lab);
      document.body.appendChild(beatEl);
    }
    beatEl.style.opacity = '1';
    const ph = ((beat % 3) + 3) % 3;
    const cur = Math.floor(ph);
    const k = 1 - (ph - cur);
    beatEl.dots.forEach((d, i) => {
      const on2 = i === cur;
      d.style.background = on2 ? `rgba(255,${i ? 190 : 140},${i ? 140 : 160},${0.3 + k * 0.6})` : 'rgba(232,189,132,0)';
      d.style.boxShadow = on2 ? `0 0 ${8 + k * 14}px rgba(255,160,170,${k})` : 'none';
    });
    if (beatEl.lab.textContent !== (hint || '')) beatEl.lab.textContent = hint || '';
    if (beatEl.warn !== !!warn) {
      beatEl.warn = !!warn;
      beatEl.lab.style.color = warn ? 'rgba(255,170,150,1)' : 'rgba(251,239,230,.85)';
    }
  };

  // ===================== helpers =====================
  const fx = (c, d) => {
    const [k, p, a] = d;
    const pos = p ? V3(p[0], p[1], p[2]) : null;
    if (k === 'step') {
      Sound.play('tile');
      if (pos) Fx.burst(pos, '#ffd27a', 18, 2.2, 0.7, -2);
    }
    if (k === 'crack') {
      Sound.play('creak');
      Sound.play('thud', pos || undefined);
      Cam.shake = Math.max(Cam.shake, 0.3);
      if (pos) Fx.burst(pos, '#ff9a4a', 40, 3, 0.8, -6);
    }
    if (k === 'break') {
      Sound.play('shatter');
      Sound.play('rumble', 1);
      Cam.shake = Math.max(Cam.shake, 0.6);
    }
    if (k === 'heal' || k === 'figure') {
      Sound.play('reveal');
      Sound.play('chime');
      if (pos) Fx.burst(pos, '#ffd9a0', 70, 5, 1.2, -1, k === 'figure' ? 'heart' : undefined);
    }
    if (k === 'pick') Sound.play('ui');
    if (k === 'curtain') {
      Sound.play('door');
      Sound.play('reveal');
    }
    if (k === 'found') {
      Sound.play('reveal');
      Sound.play('heart', 1);
      Sound.play('chime');
      if (pos) Fx.burst(pos, '#ff8fb0', 90, 4, 1.3, -1, 'heart');
    }
    if (k === 'drop') {
      Sound.play('creak');
      setTimeout(() => Sound.play('fall'), 250);
      const tl = H7.gallery.tiles[a];
      if (tl && tl.dropT < 0) tl.dropT = 0;
    }
    if (k === 'loose') {
      Sound.play('slam');
      Sound.play('roar');
      Sound.play('shatter');
      Cam.shake = Math.max(Cam.shake, 0.8);
    }
    if (k === 'tap') {
      Sound.play('ui');
      if (pos) Fx.burst(pos, '#ffd27a', 14, 1.6, 0.45, -1);
    }
    if (k === 'mesure') {
      Sound.play('chime');
      if (pos) Fx.burst(pos, '#ffcf8a', 30, 2.5, 0.9, -2);
    }
    if (k === 'lit') {
      Sound.play('reveal');
      Sound.play('lantern');
      if (pos) Fx.burst(pos, '#ffd27a', 90, 5, 1.3, -1, 'heart');
    }
    if (k === 'lose') {
      Sound.play('creak');
      if (pos) Fx.burst(pos, '#7a6a8a', 20, 2, 0.8, -3);
    }
    if (k === 'hit') {
      Sound.play('shatter');
      Sound.play('hurt');
      if (pos) Fx.burst(pos, '#e8e0ff', 50, 5, 0.7, -8);
    }
    if (k === 'win') {
      Sound.play('reveal');
      Cam.shake = Math.max(Cam.shake, 0.3);
      for (let i = 0; i < 6; i++) Fx.burst(H7.P(0, 2 + i * 1.6, H7.R4C.z), i % 2 ? '#ff8fb0' : '#ffd77a', 70, 7, 1.4, -1);
      setTimeout(() => Bal.chord(0), 50);
    }
  };
  const fxBoth = (c, d) => {
    fx(c, d);
    c.send('h7fx', d);
  };
  const sayBoth = (c, mine, theirs, hold) => {
    HUD.say(mine, T.master, hold || 2600);
    c.send('h7say', [theirs || mine, hold || 2600]);
  };
  const say = (t, hold) => HUD.say(t, T.master, hold || 2400);
  // a quick word under the beat dots (not queued like the master's lines)
  const flash = (t) => {
    local.flashMsg = fmtS(t);
    local.flashT = 1.6;
  };
  const flashBoth = (c, t) => {
    flash(t);
    c.send('h7flash', [t]);
  };
  const myHand = (out) => (Player.avatar ? Player.avatar.hand(out) : out.copy(Player.body.p).add(V3(0, 1.1, 0)));
  const mateHand = (out) => (Remote.has ? Remote.hand(out) : out.copy(Remote.pos).add(V3(0, 1.1, 0)));
  const facePartner = () => {
    const p = Player.body.p;
    const rp = Remote.pos;
    const yaw = Math.atan2(rp.x - p.x, rp.z - p.z);
    Player.yaw = angleDamp(Player.yaw, yaw, 14, 1 / 60);
    if (Player.avatar) Player.avatar.root.rotation.y = Player.yaw;
  };
  // the call beam would give your place away in the masked ball
  const callBeam = () => {
    if (local.beamObj) return local.beamObj;
    local.beamObj = R.scene.children.find(
      (o) => o.geometry && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.height === 120 && o.geometry.parameters.radiusTop === 0.4,
    );
    return local.beamObj;
  };

  // ===================== the gallery paths (the same on both screens) =====================
  // each lane: rows of three tiles; the way is 4-connected (sideways within a row, then ahead)
  const pathOf = (seed, half, lane) => {
    const r = rng((seed >>> 0) + half * 101 + (lane === 'L' ? 7 : 13));
    let c = Math.floor(r() * 3);
    const safe = new Set();
    let straight = 0;
    for (let row = 0; row < H7.ROWS; row++) {
      safe.add(row + ':' + c);
      // sideways, often enough to need guidance
      const moveP = straight >= 1 ? 0.85 : 0.5;
      if (row < H7.ROWS - 1 && r() < moveP) {
        // one column aside (never a whole row: the way must be shown, not guessed)
        const to = c === 0 ? 1 : c === 2 ? 1 : r() < 0.5 ? 0 : 2;
        safe.add(row + ':' + to);
        c = to;
        straight = 0;
      } else straight++;
    }
    return safe;
  };
  const paths = (x) => {
    if (local.pathSeed !== x.gseed) {
      local.pathSeed = x.gseed;
      local.paths = {};
      [1, 2].forEach((h) => ['L', 'R'].forEach((ln) => (local.paths[h + ln] = pathOf(x.gseed, h, ln))));
    }
    return local.paths;
  };
  const tileSafe = (x, tl) => {
    const s = paths(x)[tl.half + tl.lane];
    return !!(s && s.has(tl.row + ':' + tl.col));
  };
  const galSeer = (half) => (half === 1 ? 'dame' : 'valet');
  const setGalleryView = (c) => {
    const x = c.S.x;
    const r = c.role;
    const half = x.half || 1;
    const mateLane = laneOf(mateRole(r));
    const mirror = galSeer(half) === r;
    Object.values(H7.gallery.tiles).forEach((tl) => {
      const onPath = tl.half === half && tl.lane === mateLane && tileSafe(x, tl);
      tl.want = onPath && !mirror ? 1 : 0;
      tl.mirrorWant = onPath && mirror ? laneOf(r) : null;
    });
    local.halfSeen = half;
  };

  // ===================== objectives =====================
  const objective = (c) => {
    const x = c.S.x;
    const r = c.role;
    if (x.stage === 1) return TXT.s1;
    if (x.stage === 2) {
      if (x.fig >= 3) return TXT.s2.end;
      const k = x.run ? Math.max(1, x.step) : 1;
      const lead = H7.leaderOf(x.fig, k) === r;
      const head = TXT.s2.fig[x.fig] + ' ';
      return head + (x.run ? TXT.s2.run : TXT.s2.wait)[lead ? 'lead' : 'follow'] + (x.run ? ' Pas ' + Math.min(8, x.step) + ' / 8.' : '');
    }
    if (x.stage === 3) {
      if (x.mask === 0) {
        const mine = x.sig && x.sig[r];
        return mine ? TXT.s3.curtain : TXT.s3.pick;
      }
      if (x.mask === 1) {
        const ms = x.sig && x.sig[mateRole(r)];
        return TXT.s3.search + ' ' + TXT.s3.sign + (SIGN_NAME[ms] || '') + (r === 'dame' ? ', en bleu.' : ', en rose.');
      }
      return TXT.s3.foundObj;
    }
    if (x.stage === 4) return galSeer(x.half || 1) === r ? TXT.s4.mirror : TXT.s4.floor;
    if (x.stage === 5) return x.fight ? TXT.s5.fight.replace('{n}', (x.lit || []).filter((v) => v >= 4).length) : TXT.s5.enter;
    if (x.stage === 6) return TXT.card;
    return '';
  };

  // ===================== the waltz (host) =====================
  const hostWaltz = (c, dt) => {
    const x = c.S.x;
    if (x.stage !== 2 || x.fig >= 3) return;
    const F = H7.FIGS[x.fig];
    const C = H7.R1C;
    if (local.breakT > 0) {
      local.breakT -= dt;
      if (local.breakT <= 0) {
        c.set((s) => {
          s.x.cracks = 0;
          s.x.crackAt = [];
        });
        fxBoth(c, ['heal', H7.P(C.x, 0.5, C.z).toArray()]);
      }
      return;
    }
    if (!x.run) {
      const lead = H7.leaderOf(x.fig, 1);
      const fol = mateRole(lead);
      const ql = H7.rel(c.pos(lead));
      const qf = H7.rel(c.pos(fol));
      const fs = H7.followStart(x.fig);
      const inL = Math.hypot(ql.x - (C.x + F[0][0]), ql.z - (C.z + F[0][1])) < 1.15;
      const inF = Math.hypot(qf.x - (C.x + fs[0]), qf.z - (C.z + fs[1])) < 1.3;
      local.hold = inL && inF ? local.hold + dt : 0;
      if (local.hold > 0.5) {
        local.hold = 0;
        const bar0 = Math.floor(local.beat / 3) + 2;
        c.set((s) => {
          s.x.run = true;
          s.x.bar0 = bar0;
          s.x.step = 1;
          s.x.cracks = 0;
          s.x.crackAt = [];
        });
        local.okLead = false;
        local.folIn = local.folAll = 0;
        flashBoth(c, TXT.s2.count);
      }
      return;
    }
    const k = x.step;
    const due = (x.bar0 + k) * 3;
    const lead = H7.leaderOf(x.fig, k);
    const ql = H7.rel(c.pos(lead));
    const qf = H7.rel(c.pos(mateRole(lead)));
    if (local.beat > due - 1.3) {
      const mk = F[k];
      if (Math.hypot(ql.x - (C.x + mk[0]), ql.z - (C.z + mk[1])) < 1.2) local.okLead = true;
      const d = Math.hypot(ql.x - qf.x, ql.z - qf.z);
      local.folAll += dt;
      if (d > 0.5 && d < 3.2) local.folIn += dt;
    }
    if (local.beat > due + 0.65) {
      const okF = local.folAll <= 0 || local.folIn / local.folAll >= 0.5;
      const okL = local.okLead;
      local.okLead = false;
      local.folIn = local.folAll = 0;
      let n = x.cracks || 0;
      if (okL && okF) fxBoth(c, ['step', H7.P(C.x + F[k][0], 0.2, C.z + F[k][1]).toArray()]);
      else {
        n++;
        const at = [ql.x, ql.z];
        c.set((s) => {
          s.x.cracks = n;
          s.x.crackAt = [...(s.x.crackAt || []), at];
        });
        fxBoth(c, ['crack', H7.P(at[0], 0.2, at[1]).toArray()]);
        if (n < 3) flashBoth(c, okL ? TXT.s2.far : TXT.s2.lateLead);
      }
      if (n >= 3) {
        c.set((s) => {
          s.x.run = false;
          s.x.step = 0;
        });
        local.breakT = 2.2;
        fxBoth(c, ['break']);
        sayBoth(c, TXT.s2.broke, null, 3600);
      } else if (k >= 8) {
        const nf = x.fig + 1;
        c.set((s) => {
          s.x.run = false;
          s.x.fig = nf;
          s.x.step = 0;
          s.x.cracks = 0;
          s.x.crackAt = [];
        });
        fxBoth(c, ['figure', H7.P(C.x, 0.5, C.z).toArray()]);
        if (nf >= 3) {
          sayBoth(c, TXT.s2.end, null, 3200);
          c.set((s) => (s.x.stage = 3));
        } else sayBoth(c, TXT.s2.done + ' ' + TXT.s2.fig[nf], null, 3600);
      } else {
        c.set((s) => (s.x.step = k + 1));
        // in the heart, the lead changes hands every two steps
        const nl = H7.leaderOf(x.fig, k + 1);
        if (nl !== lead) {
          const mine = nl === c.role ? TXT.s2.swapMe : TXT.s2.swap;
          const theirs = nl === c.role ? TXT.s2.swap : TXT.s2.swapMe;
          flash(mine);
          c.send('h7flash', [theirs]);
        }
      }
    }
  };
  // what each screen draws for the waltz
  const waltzView = (c) => {
    const x = c.S.x;
    const r = c.role;
    const W = { cracks: x.cracks || 0, crackAt: x.crackAt || [] };
    if (x.stage !== 2 || x.fig >= 3) return W;
    const F = H7.FIGS[x.fig];
    const C = H7.R1C;
    if (!x.run) {
      if (local.breakT > 0 && Net.isHost) return W;
      const lead = H7.leaderOf(x.fig, 1);
      const fs = H7.followStart(x.fig);
      const q = H7.rel(Player.body.p);
      const meIn = r === lead ? Math.hypot(q.x - F[0][0], q.z - (C.z + F[0][1])) < 1.15 : Math.hypot(q.x - fs[0], q.z - (C.z + fs[1])) < 1.3;
      W.startL = [F[0][0], F[0][1], r === lead && meIn];
      W.startF = [fs[0], fs[1], r !== lead && meIn];
      return W;
    }
    const k = x.step;
    if (k < 1 || k > 8) return W;
    const lead = H7.leaderOf(x.fig, k);
    if (lead === r) {
      const due = (x.bar0 + k) * 3;
      const kk = clamp(1 - (due - local.beat) / 3, 0, 1);
      W.marks = [[F[k][0], F[k][1], kk]];
      if (k < 8 && H7.leaderOf(x.fig, k + 1) === r) W.marks.push([F[k + 1][0], F[k + 1][1], 0]);
    } else {
      // the follower: a band round the one who leads, red when too far
      const rp = Remote.pos;
      const p = Player.body.p;
      const d = Math.hypot(rp.x - p.x, rp.z - p.z);
      W.band = [rp.x, rp.z, 0.5, d > 3.2 || d < 0.5];
      // in the heart, the next one to lead sees their first step coming (dimmed)
      if (k < 8 && H7.leaderOf(x.fig, k + 1) === r) W.marks = [null, [F[k + 1][0], F[k + 1][1], 0]];
    }
    return W;
  };

  // ===================== the masked ball =====================
  const myProxyFem = (c) => Story.fem(mateRole(c.role));
  const decoySignals = (c, dt) => {
    const x = c.S.x;
    local.decoyT -= dt;
    if (local.decoyT > 0) return;
    local.decoyT = 0.35 + Math.random() * 0.5;
    const all = H7.allDancers();
    const d = all[Math.floor(Math.random() * all.length)];
    if (!d || d.sigT > 0) return;
    const used = [x.sig.dame, x.sig.valet];
    const mateSign = x.sig[mateRole(c.role)];
    let kind;
    let col;
    if (local.mimic > 0 && Math.random() < 0.35) {
      // a mimic: the right shape, never the right colour
      kind = mateSign;
      col = FAKE[Math.floor(Math.random() * FAKE.length)];
    } else {
      const free = H7.SIGNS.filter((s) => !used.includes(s));
      kind = free[Math.floor(Math.random() * free.length)] || 'lune';
      col = Math.random() < 0.5 ? GLOW[mateRole(c.role)] : FAKE[Math.floor(Math.random() * FAKE.length)];
    }
    H7.showSign(d, kind, col);
  };
  // the mannequin in front of me that an invitation would go to
  const inviteTarget = () => {
    const p = Player.body.p;
    const f = tmp2.set(Math.sin(Cam.yaw), 0, Math.cos(Cam.yaw));
    let best = null;
    let bs = 1e9;
    const consider = (pos, who) => {
      const dx = pos.x - p.x;
      const dz = pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.6 || d < 0.05) return;
      const facing = (dx * f.x + dz * f.z) / d;
      if (facing < 0.2 && d > 1.2) return;
      const s = d - facing;
      if (s < bs) {
        bs = s;
        best = who;
      }
    };
    H7.allDancers().forEach((d) => consider(d.g.position, d));
    if (Remote.has) consider(Remote.pos, 'mate');
    return best;
  };
  // the mannequins push you aside, they do not stop for you
  const crowdPush = () => {
    const p = Player.body.p;
    H7.allDancers().forEach((d) => {
      const dx = p.x - d.g.position.x;
      const dz = p.z - d.g.position.z;
      const dd = Math.hypot(dx, dz);
      if (dd < 0.62 && dd > 1e-3) {
        p.x += (dx / dd) * (0.62 - dd);
        p.z += (dz / dd) * (0.62 - dd);
      }
    });
  };

  // ===================== the great ballroom =====================
  const LUSTRE = (x, beat) => {
    if (x.stage === 6) return { y: 9.4, x: 0, z: H7.R4C.z, spin: 0.12, tilt: 0, chain: true };
    if (!x.fight) return { y: 12.5, x: 0, z: H7.R4C.z, spin: 0.08, tilt: 0 };
    const lit = (x.lit || []).filter((v) => v >= 4).length;
    const a = (beat / 24) * TAU;
    return {
      y: 8.6 + Math.sin((beat / 12) * TAU) * 0.6,
      x: Math.sin(a) * 4.5,
      z: H7.R4C.z + Math.cos(a) * 4.5,
      spin: 0.5 + lit * 0.25,
      tilt: 0.12 + lit * 0.03,
      chain: false,
      fast: false,
    };
  };
  const attack = (c, d) => {
    const B = H7.boss;
    if (d.k === 'p') {
      const L = B.lustre;
      d.pts.forEach(([px, pz], i) => {
        const dr = B.drops.find((o) => o.t < 0);
        if (!dr) return;
        dr.t = 0;
        dr.x = px;
        dr.z = pz;
        dr.start = d.s;
        dr.land = d.l;
        dr.hit = false;
        // from the rim of the turning lustre
        const a = (i / d.pts.length) * TAU + L.spin;
        dr.from.set(L.x + Math.sin(a) * 2.5, L.y - 0.6, L.z + Math.cos(a) * 2.5);
      });
      Sound.play('dollWarn');
    }
    if (d.k === 't') {
      d.ids.forEach((id) => {
        const cl = B.cells[id];
        if (!cl || cl.fixed) return;
        cl.st = 1;
        cl.at = d.at;
        cl.back = d.back;
        cl.warn = 0;
      });
      Sound.play('rumble', 0.5);
    }
  };
  const hostBall = (c, dt) => {
    const x = c.S.x;
    if (x.stage !== 5 || !x.fight || x.won) return;
    const bar = Math.floor(local.beat / 3);
    if (bar === local.lastBar) return;
    local.lastBar = bar;
    if (bar < (x.fightBar || 0) + 2) return;
    const lit = (x.lit || []).filter((v) => v >= 4).length;
    const pd = H7.rel(c.pos('dame'));
    const pv = H7.rel(c.pos('valet'));
    const C = H7.R4C;
    const inside = (q) => Math.abs(q.x) < 13 && Math.abs(q.z - C.z) < 13;
    // crystals almost every bar, more as the ball runs away
    if (bar % 2 === 0 || lit >= 2) {
      const pts = [];
      [pd, pv].forEach((q) => {
        if (Math.random() < 0.85) {
          const a = Math.random() * TAU;
          const r = Math.random() * 1.2;
          pts.push([clamp(q.x + Math.sin(a) * r, -17, 17), clamp(q.z + Math.cos(a) * r, C.z - 17, C.z + 17)]);
        }
      });
      for (let i = 0; i < lit; i++) {
        const a = Math.random() * TAU;
        const r = 2 + Math.random() * 11;
        pts.push([Math.sin(a) * r, C.z + Math.cos(a) * r]);
      }
      const d = { k: 'p', pts: pts.map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)]), s: bar * 3, l: (bar + 1) * 3 };
      attack(c, d);
      c.send('h7atk', d);
    }
    // squares fall every other bar, under your feet or round you
    if (bar % 2 === 1) {
      const ids = new Set();
      const n = 3 + lit * 2;
      [pd, pv].forEach((q) => {
        if (!inside(q)) return;
        const cl = H7.cellAt(q.x, q.z);
        if (cl && !cl.fixed && Math.random() < 0.6) ids.add(H7.boss.cells.indexOf(cl));
      });
      let guard = 0;
      while (ids.size < n && guard++ < 60) {
        const i = Math.floor(Math.random() * H7.boss.cells.length);
        const cl = H7.boss.cells[i];
        if (!cl.fixed && cl.st === 0) ids.add(i);
      }
      const d = { k: 't', ids: [...ids], at: (bar + 1) * 3, back: (bar + 4) * 3 };
      attack(c, d);
      c.send('h7atk', d);
    }
  };
  const pressBeat = (c, who, b) => {
    const x = c.S.x;
    if (x.stage !== 5 || !x.fight || x.won) return;
    local.presses[who] = b;
    // the tap is seen and heard on both screens
    const pw = c.pos(who);
    fxBoth(c, ['tap', [pw.x, pw.y + 1.3, pw.z]]);
    local.lone = { who, b };
    if (local.presses.dame !== b || local.presses.valet !== b) return;
    local.presses.dame = local.presses.valet = -9;
    local.lone = null;
    const pd = H7.rel(c.pos('dame'));
    const pv = H7.rel(c.pos('valet'));
    const d = Math.hypot(pd.x - pv.x, pd.z - pv.z);
    const mx = (pd.x + pv.x) / 2;
    const mz = (pd.z + pv.z) / 2;
    let best = -1;
    let bd = 1e9;
    H7.boss.cands.forEach((cd, k) => {
      if ((x.lit[k] || 0) >= 4) return;
      const dd = Math.hypot(mx - cd.x, mz - cd.z);
      if (dd < bd) {
        bd = dd;
        best = k;
      }
    });
    const cd = best >= 0 ? H7.boss.cands[best] : null;
    const nearC = cd && Math.hypot(pd.x - cd.x, pd.z - cd.z) < 4.2 && Math.hypot(pv.x - cd.x, pv.z - cd.z) < 4.2;
    if (d > 2.9) {
      if (local.fbCd <= 0) {
        local.fbCd = 3;
        flashBoth(c, TXT.s5.apart);
      }
      return;
    }
    if (!nearC) {
      if (local.fbCd <= 0) {
        local.fbCd = 3;
        flashBoth(c, TXT.s5.noCandle);
      }
      return;
    }
    const lv = (x.lit[best] || 0) + 1;
    const lit = x.lit.slice();
    lit[best] = lv;
    const full = lit.filter((v) => v >= 4).length;
    c.set((s) => (s.x.lit = lit));
    const pos = H7.P(cd.x, 2.4, cd.z).toArray();
    if (lv >= 4) {
      fxBoth(c, ['lit', pos]);
      if (full >= 4) {
        c.set((s) => {
          s.x.won = true;
          s.x.stage = 6;
        });
        local.endT = 0;
        fxBoth(c, ['win']);
        sayBoth(c, TXT.win, null, 4200);
      } else sayBoth(c, full === 3 ? TXT.s5.last : full === 2 ? TXT.s5.half : TXT.s5.lit, null, 2200);
    } else fxBoth(c, ['mesure', pos]);
  };

  Story.register('tr_h7', {
    init: () => ({
      stage: 1,
      fig: 0,
      run: false,
      bar0: 0,
      step: 0,
      cracks: 0,
      crackAt: [],
      sig: { dame: null, valet: null },
      mask: 0,
      spots: null,
      half: 1,
      gseed: (Math.random() * 1e9) | 0,
      lit: [0, 0, 0, 0],
      fight: false,
      fightBar: 0,
      won: false,
    }),
    voice: () => 1,
    partner: (c) => !(c.S.x.stage === 3 && c.S.x.mask === 1),
    hideRemote: (c) => c.S.x.stage === 3 && c.S.x.mask === 1,
    net: {
      h7b: (c, d) => {
        if (Net.isHost) return;
        local.bpm = d[1];
        const target = d[0] + (0.04 * d[1]) / 60;
        const err = target - local.beat;
        if (Math.abs(err) > 0.75) local.beat = target;
        else local.beat += err * 0.25;
      },
      h7fx: (c, d) => fx(c, d),
      h7say: (c, d) => HUD.say(d[0], T.master, d[1] || 2400),
      h7flash: (c, d) => flash(d[0]),
      h7sig: (c, d) => {
        const px = H7.proxy;
        if (!px) return;
        const kind = myProxyFem(c) ? px.fem : px.man;
        H7.showSign(kind, d[0], GLOW[mateRole(c.role)]);
        Sound.play('lantern');
      },
      h7mk: (c, d) => {
        local.marks[d[0]] = d[1];
        if (d[0] === laneOf(c.role) && d[1]) {
          Sound.play('tile');
          if (!(local.shownCd > 0)) {
            local.shownCd = 6;
            say(TXT.s4.shown, 1400);
          }
        }
      },
      h7lit: (c, d) => {
        const tl = H7.gallery.tiles[d[0]];
        if (tl) tl.litWant = d[1];
      },
      h7atk: (c, d) => attack(c, d),
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      H7.build();
      local.stage = 0;
      local.beat = 0;
      local.marks = { L: null, R: null };
      local.presses = { dame: -9, valet: -9 };
      local.lastBar = -1;
      local.breakT = 0;
      local.hitT = 0;
      local.said = {};
      local.maskSeen = 0;
      local.end2 = 0;
      local.halfSeen = 0;
      Object.values(H7.gallery.tiles).forEach((tl) => {
        tl.litWant = 0;
        tl.dropT = -1;
        tl.drop = 0;
      });
      c.spawn(respawnPos(c), Math.PI);
      Cam.yaw = Math.PI;
      Player.killY = H7.O.y - 8;
      Player.checkpoint = () => {
        onFall(c);
        return respawnPos(c);
      };
      Player.targets = null;
      local.env = { ex: R.renderer.toneMappingExposure, hi: R.hemi.intensity, hc: R.hemi.color.getHex(), hg: R.hemi.groundColor.getHex(), mi: R.moon.intensity, mc: R.moon.color.getHex(), fog: R.scene.fog.density };
      // candlelight indoors, a cold moon outside
      R.hemi.color.set('#ffcf9a');
      R.hemi.groundColor.set('#2a1018');
      R.hemi.intensity = 0.34;
      R.renderer.toneMappingExposure = 1.05;
      R.moon.color.set('#b8c4ff');
      R.moon.intensity = 0.35;
      City.mood({ gold: 0.25 });
      c.fog(0.006);
      Sound.mood('calm');
      HUD.visa(CARD + ' · ' + TITLE);
      if (H7.screen) H7.screen.show(TITLE, CARD + ' · la confiance', '#ff8fb0');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      if (c.S.x.stage === 1) {
        say(TXT.intro, 3600);
        say(TXT.rule, 3200);
      }
      this.apply(c);
    },
    exit() {
      Player.targets = null;
      Player.handPose = false;
      Remote.handPose = false;
      if (local.env) {
        R.hemi.intensity = local.env.hi;
        R.hemi.color.setHex(local.env.hc);
        R.hemi.groundColor.setHex(local.env.hg);
        R.moon.intensity = local.env.mi;
        R.moon.color.setHex(local.env.mc);
        R.scene.fog.density = local.env.fog;
        R.renderer.toneMappingExposure = local.env.ex;
        local.env = null;
      }
      City.mood({});
      local.style = null;
      beatUI(false);
      if (beatEl) {
        beatEl.remove();
        beatEl = null;
      }
      Bal.tick(local.beat, local.bpm, null, 0);
      Bal.murmur(0);
      HUD.boss(null);
      H7.hide();
    },
    apply(c) {
      if (!H7.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) {
        const prev = local.stage;
        local.stage = x.stage;
        if (prev && x.stage === 2) say(TXT.s2.fig[0], 2400);
        if (x.stage === 4) {
          local.marks = { L: null, R: null };
          setGalleryView(c);
        }
        if (x.stage === 5 && prev) say(TXT.s5.enter, 2600);
        if (x.stage === 6) {
          local.end2 = 0;
          Sound.mood('gold');
          City.mood({ gold: 0.6 });
          HUD.boss(null);
        }
      }
      if (x.stage === 4 && (x.half || 1) !== local.halfSeen) {
        if (local.halfSeen) say(TXT.s4.half2, 3200);
        local.marks = { L: null, R: null };
        setGalleryView(c);
      }
      // the masked ball: the curtain takes you into the crowd
      if (x.stage === 3 && x.mask === 1 && local.maskSeen !== 1) {
        local.maskSeen = 1;
        local.searchT = 0;
        local.mimic = 0;
        const sp = x.spots[c.role];
        // facing the middle of the ball, the crowd in front of you
        const yaw0 = Math.atan2(H7.R2C.x - sp[0], H7.R2C.z - sp[1]) + (Math.random() - 0.5) * 0.6;
        c.spawn(H7.P(sp[0], 0, sp[1]), yaw0);
        Cam.yaw = yaw0;
        Cam.pitch = 0.12;
        fx(c, ['curtain']);
        say(TXT.s3.enter, 2600);
      }
      if (x.stage === 3 && x.mask === 2 && local.maskSeen !== 2) {
        local.maskSeen = 2;
        fx(c, ['found', Player.body.p.clone().add(V3(0, 1.4, 0)).toArray()]);
      }
      const D = H7.doors;
      D.d0.want = x.stage >= 1 ? 1 : 0;
      D.d1.want = x.stage >= 3 ? 1 : 0;
      D.d2.want = x.stage > 3 || (x.stage === 3 && x.mask === 2) ? 1 : 0;
      D.d3.want = x.stage >= 5 ? 1 : 0;
      HUD.objective(fmtS(objective(c)));
    },
    host(c, dt) {
      if (!H7.built) return;
      const x = c.S.x;
      // the shared beat
      local.beatSent += dt;
      if (local.beatSent > 0.25) {
        local.beatSent = 0;
        c.send('h7b', [+local.beat.toFixed(4), local.bpm]);
      }
      const qd = H7.rel(c.pos('dame'));
      const qv = H7.rel(c.pos('valet'));
      const both = (z) => H7.at(z, qd) && H7.at(z, qv);
      local.fbCd = Math.max(0, local.fbCd - dt);
      if (x.stage === 1 && both('R1')) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2) hostWaltz(c, dt);
      if (x.stage === 3) {
        if (x.mask === 0 && x.sig.dame && x.sig.valet && H7.at('ALC_dame', qd) && H7.at('ALC_valet', qv)) {
          // two places far apart in the crowd
          const S = H7.SPOTS;
          let a = 0;
          let b = 1;
          for (let k = 0; k < 40; k++) {
            a = Math.floor(Math.random() * S.length);
            b = Math.floor(Math.random() * S.length);
            if (a !== b && Math.hypot(S[a][0] - S[b][0], S[a][1] - S[b][1]) > 15) break;
          }
          c.set((s) => {
            s.x.mask = 1;
            s.x.spots = { dame: S[a], valet: S[b] };
          });
        }
        if (x.mask === 2 && both('C2')) c.set((s) => (s.x.stage = 4));
      }
      if (x.stage === 4) {
        if ((x.half || 1) === 1 && both('L1')) c.set((s) => (s.x.half = 2));
        if (x.half === 2 && both('L2')) {
          sayBoth(c, TXT.s4.done, null, 2600);
          c.set((s) => (s.x.stage = 5));
        }
      }
      if (x.stage === 5) {
        if (!x.fight && both('R4')) {
          const fb = Math.floor(local.beat / 3) + 1;
          c.set((s) => {
            s.x.fight = true;
            s.x.fightBar = fb;
          });
          fxBoth(c, ['loose']);
          sayBoth(c, TXT.s5.intro, null, 2400);
        }
        hostBall(c, dt);
        // a lone tap: tell the other one, once in a while
        local.loneCd = Math.max(0, (local.loneCd || 0) - dt);
        const L = local.lone;
        if (L && local.beat > L.b * 3 + 0.7) {
          local.lone = null;
          if (local.loneCd <= 0 && x.fight && !x.won) {
            local.loneCd = 7;
            const other = mateRole(L.who);
            if (other === c.role) say(TXT.s5.lone, 2200);
            else c.send('h7say', [TXT.s5.lone, 2200]);
          }
        }
      }
      if (x.stage === 6) {
        local.endT += dt;
        if (local.endT > 6 && Math.hypot(qd.x, qd.z - H7.R4C.z) < 5 && Math.hypot(qv.x, qv.z - H7.R4C.z) < 5) c.goto('reward', (s) => (s.x.card = 'h7'));
      }
      // the tempo follows the ball
      let bpm = 84;
      if (x.stage === 2) bpm = [84, 88, 92][Math.min(2, x.fig)] || 92;
      if (x.stage === 3) bpm = 96;
      if (x.stage === 4) bpm = 72;
      if (x.stage === 5) bpm = 84 + (x.lit || []).filter((v) => v >= 4).length * 8;
      if (x.stage === 6) bpm = Math.max(60, local.bpm - dt * 6);
      local.bpm = bpm;
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'h7pick' && x.stage === 3 && x.mask === 0 && H7.SIGNS.includes(d.k)) {
        c.set((s) => (s.x.sig = { ...s.x.sig, [who]: d.k }));
        fxBoth(c, ['pick']);
      }
      if (d.a === 'h7inv' && x.stage === 3 && x.mask === 1) {
        const pd = c.pos('dame');
        const pv = c.pos('valet');
        if (Math.hypot(pd.x - pv.x, pd.z - pv.z) < 3.4) {
          c.set((s) => (s.x.mask = 2));
          sayBoth(c, TXT.s3.found, null, 3000);
          fxBoth(c, ['found', V3((pd.x + pv.x) / 2, pd.y + 1.6, (pd.z + pv.z) / 2).toArray()]);
        }
      }
      if (d.a === 'h7p') pressBeat(c, who, d.b);
      if (d.a === 'h7hit' && x.stage === 5 && x.fight && !x.won) {
        // the candle being danced near the one hit loses a measure
        const q = H7.rel(c.pos(who));
        let k = -1;
        H7.boss.cands.forEach((cd, i) => {
          const v = x.lit[i] || 0;
          if (v > 0 && v < 4 && Math.hypot(q.x - cd.x, q.z - cd.z) < 5) k = i;
        });
        if (k >= 0) {
          const lit = x.lit.slice();
          lit[k]--;
          c.set((s) => (s.x.lit = lit));
          fxBoth(c, ['lose', H7.P(H7.boss.cands[k].x, 2.4, H7.boss.cands[k].z).toArray()]);
          sayBoth(c, TXT.s5.lose, null, 1600);
        }
      }
    },
    update(c, dt, t) {
      if (!H7.built) return null;
      const x = c.S.x;
      const r = c.role;
      const p = Player.body.p;
      const q = H7.rel(p);
      // the beat runs on every screen (the guest is pulled to the host's)
      local.beat += (dt * local.bpm) / 60;
      local.hitT = Math.max(0, local.hitT - dt);
      local.shownCd = (local.shownCd || 0) - dt;
      let prompt = null;
      const st = { me: p, stage: x.stage, beat: local.beat, lit: (x.lit || []).filter((v) => v >= 4).length, music: !!local.style };
      const rp = Remote.pos;
      const dMate = Math.hypot(rp.x - p.x, rp.z - p.z);

      // ---------- music ----------
      let style = null;
      if (x.stage === 2 && H7.at('R1', q)) style = x.fig >= 3 ? null : 'salon';
      if (x.stage === 3) style = x.mask === 1 ? 'masque' : x.mask === 2 ? 'salon' : null;
      if (x.stage === 4) style = 'miroir';
      if (x.stage === 5 && x.fight) style = 'lustre';
      if (x.stage === 6) style = 'fin';
      local.style = style;
      Bal.tick(local.beat, local.bpm, style, x.stage === 4 ? 0.8 : 1);
      Bal.murmur(x.stage === 3 ? (x.mask === 1 ? 1 : x.mask === 0 ? 0.35 : 0.15) : 0);

      // ---------- the waltz ----------
      let beatOn = false;
      let hint = '';
      if (x.stage === 2) {
        st.waltz = waltzView(c);
        if (x.run && dMate < 4.5) facePartner();
        if (x.run && Remote.has && dMate < 3.4) st.thread = [myHand(hv), mateHand(hv2), clamp((3.4 - dMate) / 0.8, 0, 1)];
        if (x.run) {
          beatOn = true;
          const k = x.step;
          const lead = H7.leaderOf(x.fig, Math.max(1, k)) === r;
          const bar = Math.floor(local.beat / 3);
          hint = bar < x.bar0 + 1 ? 'un, deux, trois' : lead ? 'tu mènes · pas ' + Math.min(8, k) + ' / 8' : 'tu suis · ' + (dMate > 3.2 ? 'trop loin' : dMate < 0.5 ? 'trop près' : 'reste face à ' + Story.name(mateRole(r)));
        } else if (H7.at('R1', q) && x.fig < 3) {
          beatOn = true;
          hint = 'au cercle';
        }
      }

      // ---------- the masked ball ----------
      if (x.stage === 3) {
        const MS = { phase: x.mask, signs: x.sig, ready: !!(x.sig.dame && x.sig.valet), found: x.mask === 2 };
        if (x.mask === 0) {
          // pick a sign at a pedestal
          let best = null;
          let bd = 1.7;
          H7.SIGNS.forEach((k, i) => {
            const px = [-3.4, -1.7, 0, 1.7, 3.4][i];
            const d = Math.hypot(q.x - px, q.z + 53.6);
            if (d < bd) {
              bd = d;
              best = k;
            }
          });
          if (best && x.sig[r] !== best) {
            prompt = ['E', 'Choisir ' + SIGN_NAME[best] + ' comme signe'];
            if (Input.pressed('interact')) c.act({ a: 'h7pick', k: best });
          }
        }
        if (x.mask === 1) {
          local.searchT += dt;
          if (local.searchT > 40 && !local.mimic) {
            local.mimic = 1;
            say(TXT.s3.mimic, 2600);
          }
          // the partner as a mannequin among the others; the call beam is hidden
          MS.proxy = Remote.has ? rp : null;
          MS.proxyFem = myProxyFem(c);
          const bm = callBeam();
          if (bm) bm.visible = false;
          decoySignals(c, dt);
          crowdPush();
          // my sign: over my head here, over my mannequin on the other screen
          local.sigCd = Math.max(0, local.sigCd - dt);
          local.invCd = Math.max(0, local.invCd - dt);
          if (Input.pressed('ability') && local.sigCd <= 0) {
            local.sigCd = 2.2;
            c.send('h7sig', [x.sig[r]]);
            Sound.play('lantern');
            local.mySign = 2.6;
          }
          const tg = inviteTarget();
          if (tg) {
            prompt = ['E', 'Inviter ce masque à danser'];
            if (Input.pressed('interact') && local.invCd <= 0) {
              local.invCd = 1.2;
              if (tg === 'mate') c.act({ a: 'h7inv' });
              else {
                tg.refuse = 1;
                Sound.play('rune', false);
                say(TXT.s3.wrong, 1600);
              }
            }
          } else prompt = ['F', 'Lever ton signe'];
          // a refused invitation: the mask shakes its head
          H7.allDancers().forEach((d) => {
            if (d.refuse > 0) {
              d.refuse = Math.max(0, d.refuse - dt);
              d.body.rotation.y = Math.sin(d.refuse * 30) * 0.35 * d.refuse;
            } else if (d.body.rotation.y) d.body.rotation.y = 0;
          });
        }
        st.mask = MS;
        local.mySign = Math.max(0, (local.mySign || 0) - dt);
        st.mySign = local.mySign > 0 ? [x.sig[r], GLOW[r], local.mySign] : null;
      }

      // ---------- the gallery ----------
      if (x.stage === 4) {
        const half = x.half || 1;
        const myLane = laneOf(r);
        const mateLane = laneOf(mateRole(r));
        const mdx = rp.x - (local.remPrev ? local.remPrev.x : rp.x);
        const mdz = rp.z - (local.remPrev ? local.remPrev.z : rp.z);
        if (Math.hypot(mdx, mdz) > 0.01) local.remYaw = angleDamp(local.remYaw || 0, Math.atan2(mdx, mdz), 10, dt);
        local.remPrev = (local.remPrev || V3()).copy(rp);
        const ry = local.remYaw || 0;
        st.gal = { marks: local.marks, dame: r === 'dame' ? p : rp, valet: r === 'valet' ? p : rp, dameYaw: r === 'dame' ? Player.yaw : ry, valetYaw: r === 'valet' ? Player.yaw : ry };
        // the tile under me
        const tl = Player.body.grounded ? H7.standing(q) : null;
        if (tl) {
          const wrong = tl.lane !== myLane;
          const safe = !wrong && tl.half === half && tileSafe(x, tl);
          if (safe) {
            if (!tl.litWant) {
              tl.litWant = 1;
              c.send('h7lit', [tl.id, 1]);
            }
            if (local.marks[myLane] === tl.id) {
              local.marks[myLane] = null;
              c.send('h7mk', [myLane, null]);
            }
            local.standId = null;
          } else {
            if (local.standId !== tl.id) {
              local.standId = tl.id;
              local.standT = 0;
            }
            local.standT += dt;
            if (local.standT > (wrong ? 0.05 : 0.22) && tl.dropT < 0) {
              fxBoth(c, ['drop', null, tl.id]);
              if (wrong) say(TXT.s4.wrongLane, 1800);
            }
          }
        } else local.standId = null;
        // pointing a tile out to the other (straight, or in a mirror)
        const cam = R.camera;
        const dir = tmp.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const hit = H7.aimTile(cam.position, dir);
        const at = hit ? H7.tileAt(half, hit.x, hit.z) : null;
        local.aim = at && at.lane === mateLane ? at.id : null;
        st.gal.aim = local.aim;
        if (local.aim) {
          prompt = ['E', 'Montrer ce carreau à ' + Story.name(mateRole(r))];
          if (Input.pressed('interact')) {
            local.marks[mateLane] = local.aim;
            c.send('h7mk', [mateLane, local.aim]);
            Sound.play('tile');
          }
        }
      }

      // ---------- the great ballroom ----------
      if (x.stage === 5 || x.stage === 6) {
        const B = { lit: x.lit, lustre: LUSTRE(x, local.beat) };
        // which unlit candle are we both near
        let near = -1;
        H7.boss.cands.forEach((cd, k) => {
          if ((x.lit[k] || 0) >= 4) return;
          if (Math.hypot(q.x - cd.x, q.z - cd.z) < 4.2) near = k;
        });
        B.near = near;
        if (x.stage === 5 && x.fight) {
          beatOn = true;
          const hand = dMate < 2.9;
          hint = near >= 0 ? (hand ? 'E ensemble sur le « un »' : 'main dans la main') : 'vers un candélabre éteint';
          if (Remote.has && dMate < 3.4) st.thread = [myHand(hv), mateHand(hv2), clamp((3.4 - dMate) / 0.6, 0, 1)];
          // on the beat
          if (Input.pressed('interact')) {
            const b = Math.round(local.beat / 3);
            const off = local.beat - b * 3;
            if (Math.abs(off) <= 0.5) {
              c.act({ a: 'h7p', b });
              local.pressFx = 1;
            } else {
              if (!(local.offCd > 0)) {
                local.offCd = 2.5;
                flash(TXT.s5.offbeat);
              }
            }
          }
          local.offCd = (local.offCd || 0) - dt;
          // the crystals land on the beat: check the ones aimed near me
          H7.boss.drops.forEach((dr) => {
            if (dr.t < 0 || dr.hit) return;
            if (local.beat >= dr.land) {
              dr.hit = true;
              Sound.play('shatter');
              const dd = Math.hypot(q.x - dr.x, q.z - dr.z);
              Fx.burst(H7.P(dr.x, 0.6, dr.z), '#e8e0ff', 26, 4, 0.6, -8);
              if (dd < 1.5 && q.y < 2 && local.hitT <= 0) {
                local.hitT = 1.2;
                const nx = (q.x - dr.x) / (dd || 1);
                const nz = (q.z - dr.z) / (dd || 1);
                Player.body.v.set(nx * 8, 6, nz * 8);
                Cam.shake = Math.max(Cam.shake, 0.5);
                say(TXT.s5.hit, 1400);
                c.send('h7say', [TXT.s5.hitMate, 1400]);
                fxBoth(c, ['hit', p.clone().add(V3(0, 1, 0)).toArray()]);
                c.act({ a: 'h7hit' });
              }
            }
          });
          const full = (x.lit || []).filter((v) => v >= 4).length;
          HUD.boss('Le Grand Lustre', 1 - full / 4, 'Candélabres ' + full + ' / 4 · tempo ' + Math.round(local.bpm));
        } else HUD.boss(null);
        if (x.stage === 6) {
          local.end2 += dt;
          B.bow = clamp((local.end2 - 1.5) / 2.5, 0, 1);
          B.card = local.end2 > 4;
          // every square comes back
          H7.boss.cells.forEach((cl) => {
            if (cl.st === 1 || cl.st === 2) cl.st = 3;
          });
        }
        st.ball = B;
      } else HUD.boss(null);

      local.flashT = Math.max(0, (local.flashT || 0) - dt);
      beatUI(beatOn, local.beat, local.flashT > 0 ? local.flashMsg : hint, local.flashT > 0);
      // the beat dot pulses on a good press
      if (local.pressFx > 0) local.pressFx = Math.max(0, local.pressFx - dt * 3);

      H7.update(dt, t, st);
      local.objT -= dt;
      if (local.objT <= 0) {
        local.objT = 0.5;
        HUD.objective(fmtS(objective(c)));
      }
      if (x.stage === 6) return null;
      return prompt;
    },
  });

  const respawnPos = (c) => {
    const x = c.S.x;
    const r = c.role;
    const sub = {};
    if (x.stage === 3 && x.mask === 1 && x.spots) sub.spot = x.spots[r];
    if (x.stage === 3 && x.mask === 2) sub.found = true;
    if (x.stage === 4 && x.half === 2) sub.half2 = true;
    if (x.stage === 5 && x.fight) sub.arena = true;
    return H7.spawn(x.stage, r, sub);
  };
  // a fall: back to the safe place, and a word on both screens
  const onFall = (c) => {
    const x = c.S.x;
    if (x.stage === 4) {
      say(TXT.s4.fall, 1800);
      c.send('h7say', [TXT.s4.fallMate, 1800]);
    } else if (x.stage === 5) {
      say(TXT.s5.fall, 1800);
      c.send('h7say', [TXT.s5.fallMate, 1800]);
    }
  };
})();
