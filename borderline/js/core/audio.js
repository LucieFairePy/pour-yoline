const Sound = (() => {
  let ctx = null;
  let master, music, sfx, verb, noiseBuf;
  let voice = null;
  let mood = 'calm';

  const CHORDS = {
    calm: [
      [53, 60, 64, 69],
      [50, 57, 60, 65],
      [46, 53, 57, 62],
      [48, 55, 60, 64],
    ],
    tense: [
      [50, 57, 60, 63],
      [49, 56, 59, 64],
      [46, 53, 56, 61],
      [45, 52, 56, 60],
    ],
    gold: [
      [53, 60, 65, 69, 72],
      [55, 62, 67, 71, 74],
      [57, 64, 69, 72, 76],
      [50, 57, 62, 65, 69],
    ],
    dark: [
      [45, 52, 55, 58],
      [44, 51, 54, 57],
      [42, 49, 52, 55],
      [41, 48, 51, 56],
    ],
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const init = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = SETTINGS.vol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    music = ctx.createGain();
    music.gain.value = 0.32;
    sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    verb = ctx.createConvolver();
    verb.buffer = impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    music.connect(master);
    music.connect(verb);
    sfx.connect(master);
    verb.connect(wet).connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambience();
    loop();
  };

  const impulse = (sec) => {
    const len = ctx.sampleRate * sec;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return b;
  };

  const ambience = () => {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg).connect(f.frequency);
    n.connect(f).connect(g).connect(master);
    n.start();
    lfo.start();
    [36.7, 55.1].forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      o.detune.value = i ? 7 : -7;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      const og = ctx.createGain();
      og.gain.value = 0.05;
      o.connect(lp).connect(og).connect(music);
      o.start();
    });
  };

  let step = 0;
  const loop = () => {
    const t = ctx.currentTime + 0.05;
    const set = CHORDS[mood];
    const ch = set[step % set.length];
    const len = mood === 'tense' ? 4 : mood === 'gold' ? 6 : mood === 'dark' ? 5 : 7;
    ch.forEach((m, i) => pad(hz(m), t + i * 0.09, len + 1.5, mood === 'gold' ? 0.045 : 0.05));
    const arp = mood === 'tense' ? 8 : mood === 'gold' ? 9 : mood === 'dark' ? 2 : 5;
    for (let i = 0; i < arp; i++) {
      const m = ch[(i * 3 + step) % ch.length] + 12 + (i % 3 === 2 ? 12 : 0);
      bell(hz(m), t + (len / arp) * i + Math.random() * 0.06, 0.035 + Math.random() * 0.02, music);
    }
    step++;
    setTimeout(loop, len * 1000);
  };

  const pad = (f, t, len, vol) => {
    [-6, 6].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + len * 0.35);
      g.gain.linearRampToValueAtTime(0, t + len);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      o.connect(lp).connect(g).connect(music);
      o.start(t);
      o.stop(t + len + 0.1);
    });
  };

  const bell = (f, t, vol, out) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.76;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(out);
    o.start(t);
    o2.start(t);
    o.stop(t + 2.5);
    o2.stop(t + 2.5);
  };

  const noise = (t, dur, freq, q, vol, type = 'bandpass', out = sfx) => {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(out);
    n.start(t, Math.random());
    n.stop(t + dur + 0.05);
    return f;
  };

  const sweep = (t, f0, f1, dur, vol, type = 'sine', out = sfx) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const spatial = (pos, far = false) => {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'exponential';
    p.refDistance = far ? 14 : 6;
    p.rolloffFactor = far ? 0.85 : 1.1;
    p.maxDistance = far ? 900 : 400;
    setPos(p, pos);
    if (far && ctx.listener.positionX) {
      const l = ctx.listener;
      const d = Math.hypot(
        pos.x - l.positionX.value,
        pos.y - l.positionY.value,
        pos.z - l.positionZ.value,
      );
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.max(500, 16000 * Math.exp(-d / 110));
      lp.connect(sfx);
      p.connect(lp);
    } else p.connect(sfx);
    return p;
  };

  const setPos = (p, v) => {
    if (p.positionX) {
      p.positionX.value = v.x;
      p.positionY.value = v.y;
      p.positionZ.value = v.z;
    } else p.setPosition(v.x, v.y, v.z);
  };

  const fx = {
    step(v = 0.5) {
      noise(ctx.currentTime, 0.08, 900 + Math.random() * 500, 1.2, 0.05 * v);
    },
    jump() {
      sweep(ctx.currentTime, 220, 520, 0.18, 0.06);
    },
    djump() {
      sweep(ctx.currentTime, 330, 880, 0.22, 0.07, 'triangle');
      noise(ctx.currentTime, 0.25, 2400, 0.8, 0.05);
    },
    land(v) {
      noise(ctx.currentTime, 0.18, 300, 0.9, 0.06 + 0.1 * v, 'lowpass');
    },
    ui() {
      bell(hz(84), ctx.currentTime, 0.05, sfx);
    },
    call(pos) {
      const out = pos ? spatial(pos, true) : sfx;
      const t = ctx.currentTime;
      [76, 81, 88].forEach((m, i) => bell(hz(m), t + i * 0.14, 0.22, out));
    },
    beacon(pos, who) {
      const out = spatial(pos, true);
      const t = ctx.currentTime;
      const notes = who === 'dame' ? [64, 71] : [76, 83];
      notes.forEach((m, i) => bell(hz(m), t + i * 0.22, 0.12, out));
    },
    grapple() {
      sweep(ctx.currentTime, 1600, 300, 0.35, 0.06, 'sawtooth');
      noise(ctx.currentTime, 0.4, 3000, 2, 0.05);
    },
    creak() {
      sweep(ctx.currentTime, 140 + Math.random() * 40, 90, 0.3, 0.035, 'square');
    },
    fall() {
      sweep(ctx.currentTime, 600, 60, 1.1, 0.07);
    },
    door() {
      noise(ctx.currentTime, 0.6, 120, 0.7, 0.3, 'lowpass');
      sweep(ctx.currentTime, 90, 40, 0.5, 0.15);
    },
    rumble(v) {
      noise(ctx.currentTime, 0.5, 70, 0.5, 0.12 * v, 'lowpass');
    },
    heart(v = 1) {
      const t = ctx.currentTime;
      sweep(t, 70, 40, 0.18, 0.25 * v);
      sweep(t + 0.22, 65, 38, 0.16, 0.18 * v);
    },
    tile() {
      bell(hz(91), ctx.currentTime, 0.03, sfx);
    },
    card() {
      const t = ctx.currentTime;
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => bell(hz(m), t + i * 0.09, 0.12, sfx));
      pad(hz(48), t, 5, 0.12);
      pad(hz(55), t, 5, 0.1);
    },
    screen() {
      const t = ctx.currentTime;
      noise(t, 0.3, 4000, 0.6, 0.06, 'highpass');
      sweep(t, 60, 120, 0.8, 0.12, 'sawtooth');
    },
    reveal() {
      const t = ctx.currentTime;
      [72, 79, 84, 88].forEach((m, i) => bell(hz(m), t + i * 0.18, 0.1, sfx));
    },
    launch() {
      sweep(ctx.currentTime, 300, 1400, 1.3, 0.04, 'sawtooth');
      noise(ctx.currentTime, 1.3, 2500, 1, 0.05);
    },
    boom(pos) {
      const out = pos ? spatial(pos) : sfx;
      const t = ctx.currentTime;
      noise(t, 1.4, 160, 0.6, 0.5, 'lowpass', out);
      noise(t, 2.2, 3200, 0.4, 0.08, 'highpass', out);
    },
    glitch() {
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        noise(t + i * 0.07, 0.06, 500 + Math.random() * 4000, 3, 0.12);
        sweep(t + i * 0.07, 60 + Math.random() * 400, 40, 0.08, 0.06, 'square');
      }
    },
    shatter() {
      const t = ctx.currentTime;
      noise(t, 1.6, 5000, 0.5, 0.25, 'highpass');
      for (let i = 0; i < 10; i++)
        bell(hz(84 + Math.random() * 24), t + Math.random() * 0.5, 0.05, sfx);
    },
    cut() {
      noise(ctx.currentTime, 0.12, 2400, 4, 0.2);
    },
    switch() {
      const t = ctx.currentTime;
      sweep(t, 180, 90, 0.15, 0.15, 'square');
      bell(hz(79), t + 0.1, 0.08, sfx);
    },
    lift() {
      sweep(ctx.currentTime, 70, 110, 1.6, 0.06, 'sawtooth');
    },
    shoot(pos) {
      const out = pos ? spatial(pos) : sfx;
      const t = ctx.currentTime;
      noise(t, 0.09, 900, 0.8, 0.22, 'lowpass', out);
      noise(t, 0.05, 5000, 1, 0.06, 'highpass', out);
      sweep(t, 220, 60, 0.1, 0.12, 'square', out);
    },
    punch(pos) {
      const out = pos ? spatial(pos) : sfx;
      const t = ctx.currentTime;
      // sword swish then a metallic ring
      noise(t, 0.22, 2600, 2.5, 0.16, 'bandpass', out);
      sweep(t, 900, 300, 0.18, 0.05, 'sawtooth', out);
      bell(hz(88), t + 0.05, 0.03, out);
    },
    hurt() {
      const t = ctx.currentTime;
      sweep(t, 300, 90, 0.25, 0.18, 'square');
      noise(t, 0.2, 800, 1, 0.12, 'lowpass');
    },
    cloak() {
      const t = ctx.currentTime;
      sweep(t, 1200, 200, 0.6, 0.06, 'sine');
      noise(t, 0.6, 6000, 0.5, 0.05, 'highpass');
    },
    enemyDie() {
      const t = ctx.currentTime;
      noise(t, 0.5, 2000, 0.8, 0.25);
      sweep(t, 700, 60, 0.5, 0.15, 'sawtooth');
    },
    deflect() {
      bell(hz(96), ctx.currentTime, 0.05, sfx);
    },
    orb(pos) {
      const out = pos ? spatial(pos) : sfx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.45);
    },
    roar() {
      const t = ctx.currentTime;
      noise(t, 1.6, 200, 0.7, 0.5, 'lowpass');
      sweep(t, 90, 45, 1.6, 0.35, 'sawtooth');
    },
    slam() {
      const t = ctx.currentTime;
      noise(t, 1, 120, 0.6, 0.6, 'lowpass');
      sweep(t, 70, 30, 0.9, 0.5);
    },
    shieldDown() {
      const t = ctx.currentTime;
      [84, 79, 72, 67].forEach((m, i) => bell(hz(m), t + i * 0.08, 0.08, sfx));
      noise(t, 0.6, 3000, 0.8, 0.12, 'highpass');
    },
    portal() {
      const t = ctx.currentTime;
      sweep(t, 200, 1200, 0.35, 0.08, 'sine');
      noise(t, 0.4, 2500, 1.5, 0.08);
      bell(hz(79), t + 0.05, 0.05, sfx);
    },
    portalShoot() {
      const t = ctx.currentTime;
      sweep(t, 1400, 400, 0.18, 0.06, 'triangle');
      noise(t, 0.15, 3000, 2, 0.05);
    },
    grappleHit() {
      const t = ctx.currentTime;
      noise(t, 0.12, 2200, 3, 0.25);
      sweep(t, 900, 300, 0.12, 0.08, 'square');
      bell(hz(86), t, 0.05, sfx);
    },
    grappleOut() {
      sweep(ctx.currentTime, 300, 1400, 0.25, 0.05, 'sawtooth');
      noise(ctx.currentTime, 0.25, 1800, 1.5, 0.06);
    },
    flip() {
      noise(ctx.currentTime, 0.4, 900, 1.2, 0.08);
      sweep(ctx.currentTime, 500, 1100, 0.3, 0.04, 'triangle');
    },
    trap() {
      const t = ctx.currentTime;
      sweep(t, 400, 80, 0.5, 0.2, 'square');
    },
    // Un, deux, trois, Soleil: the doll's chant, stretched over dur seconds
    soleil(dur, pos) {
      const out = pos ? spatial(pos, true) : sfx;
      const t = ctx.currentTime;
      const notes = [72, 72, 74, 72, 76, 74];
      const at = [0, 0.16, 0.34, 0.52, 0.74, 0.92];
      notes.forEach((m, i) => {
        const tt = t + at[i] * Math.max(0.6, dur - 0.25);
        bell(hz(m), tt, 0.16, out);
        bell(hz(m - 12), tt, 0.06, out);
      });
    },
    dollTurn(pos) {
      const out = pos ? spatial(pos, true) : sfx;
      const t = ctx.currentTime;
      noise(t, 0.5, 300, 0.8, 0.25, 'lowpass', out);
      sweep(t, 120, 60, 0.5, 0.12, 'sawtooth');
    },
    dollWarn() {
      const t = ctx.currentTime;
      bell(hz(91), t, 0.05, sfx);
      bell(hz(96), t + 0.09, 0.04, sfx);
    },
    caught() {
      const t = ctx.currentTime;
      sweep(t, 660, 160, 0.6, 0.18, 'square');
      noise(t, 0.4, 1200, 1, 0.12);
    },
    thud(pos) {
      const out = pos ? spatial(pos) : sfx;
      const t = ctx.currentTime;
      noise(t, 0.8, 140, 0.6, 0.5, 'lowpass', out);
      sweep(t, 80, 35, 0.6, 0.3);
    },
    gallop() {
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) noise(t + i * 0.11, 0.08, 300, 1, 0.2, 'lowpass');
    },
    lantern() {
      const t = ctx.currentTime;
      [79, 84, 88, 91].forEach((m, i) => bell(hz(m), t + i * 0.18, 0.06, sfx));
    },
    chime() {
      const t = ctx.currentTime;
      bell(hz(88), t, 0.05, sfx);
      bell(hz(95), t + 0.12, 0.04, sfx);
    },
    rune(ok) {
      const t = ctx.currentTime;
      if (ok) [72, 79, 84].forEach((m, i) => bell(hz(m), t + i * 0.07, 0.08, sfx));
      else {
        sweep(t, 220, 110, 0.5, 0.2, 'sawtooth');
        sweep(t, 233, 116, 0.5, 0.2, 'sawtooth');
      }
    },
    gaze() {
      const t = ctx.currentTime;
      sweep(t, 80, 900, 2.2, 0.08, 'sawtooth');
      noise(t, 2.2, 600, 0.6, 0.15, 'bandpass');
    },
    dome() {
      const t = ctx.currentTime;
      sweep(t, 300, 900, 0.4, 0.07, 'triangle');
      bell(hz(84), t, 0.05, sfx);
    },
  };

  return {
    init,
    get ready() {
      return !!ctx;
    },
    play(name, ...a) {
      if (!ctx || !fx[name]) return;
      fx[name](...a);
    },
    mood(m) {
      mood = m;
    },
    volume(v) {
      if (master) master.gain.value = v;
    },
    listener(cam) {
      if (!ctx) return;
      const l = ctx.listener;
      const p = cam.position;
      const f = V3(0, 0, -1).applyQuaternion(cam.quaternion);
      if (l.positionX) {
        l.positionX.value = p.x;
        l.positionY.value = p.y;
        l.positionZ.value = p.z;
        l.forwardX.value = f.x;
        l.forwardY.value = f.y;
        l.forwardZ.value = f.z;
        l.upX.value = 0;
        l.upY.value = 1;
        l.upZ.value = 0;
      } else {
        l.setPosition(p.x, p.y, p.z);
        l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
      }
    },
    attachVoice(stream) {
      if (!ctx) init();
      if (!ctx) return;
      if (voice) voice.el.srcObject = null;
      const el = new Audio();
      el.muted = true;
      el.srcObject = stream;
      el.play().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      const g = ctx.createGain();
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'linear';
      p.refDistance = 4;
      p.maxDistance = 70;
      p.rolloffFactor = 1;
      src.connect(g).connect(p).connect(master);
      voice = { el, g, p };
    },
    voicePos(pos, gain) {
      if (!voice) return;
      setPos(voice.p, pos);
      voice.g.gain.value = gain;
    },
    get hasVoice() {
      return !!voice;
    },
    cine(dur) {
      if (!ctx) init();
      if (!ctx || typeof IntroScore === 'undefined') return null;
      return IntroScore(ctx, master);
    },
  };
})();
