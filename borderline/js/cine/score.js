const IntroScore = (ctx, dest, at = ctx.currentTime) => {
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3.5;
  master.connect(comp).connect(dest);
  const verb = ctx.createConvolver();
  const len = ctx.sampleRate * 4;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
  }
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  verb.connect(wet).connect(master);
  const music = ctx.createGain();
  music.gain.value = 0.5;
  music.connect(master);
  music.connect(verb);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.85;
  sfx.connect(master);
  sfx.connect(verb);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const nodes = [];
  const T = (s) => at + s;

  const env = (g, t, a, peak, hold, rel) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.linearRampToValueAtTime(0, t + a + hold + rel);
  };

  const pad = (notes, t0, dur, vol = 0.05, type = 'triangle', cut = 1600) => {
    notes.forEach((m, i) =>
      [-7, 7].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = det;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = cut;
        const g = ctx.createGain();
        env(g, T(t0) + i * 0.06, dur * 0.35, vol, dur * 0.3, dur * 0.35);
        o.connect(f).connect(g).connect(music);
        o.start(T(t0));
        o.stop(T(t0) + dur + 0.5);
        nodes.push(o);
      }),
    );
  };

  const bell = (m, t0, vol = 0.05, out = music, decay = 3) => {
    const o = ctx.createOscillator();
    o.frequency.value = hz(m);
    const o2 = ctx.createOscillator();
    o2.frequency.value = hz(m) * 2.76;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, T(t0));
    g.gain.linearRampToValueAtTime(vol, T(t0) + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, T(t0) + decay);
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(out);
    o.start(T(t0));
    o2.start(T(t0));
    o.stop(T(t0) + decay + 0.1);
    o2.stop(T(t0) + decay + 0.1);
    nodes.push(o, o2);
  };

  const noise = (t0, dur, f0, f1, q, vol, type = 'bandpass', a = 0.05) => {
    const n = ctx.createBufferSource();
    n.buffer = nb;
    n.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, T(t0));
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), T(t0) + dur);
    const g = ctx.createGain();
    env(g, T(t0), a, vol, Math.max(0, dur - a - dur * 0.3), dur * 0.3);
    n.connect(f).connect(g).connect(sfx);
    n.start(T(t0));
    n.stop(T(t0) + dur + 0.1);
    nodes.push(n);
  };

  const tone = (t0, dur, f0, f1, vol, type = 'sine', a = 0.02) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, T(t0));
    o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), T(t0) + dur);
    const g = ctx.createGain();
    env(g, T(t0), a, vol, Math.max(0, dur - a - dur * 0.4), dur * 0.4);
    o.connect(g).connect(sfx);
    o.start(T(t0));
    o.stop(T(t0) + dur + 0.1);
    nodes.push(o);
  };

  const boom = (t0, vol = 0.6) => {
    tone(t0, 1.8, 90, 28, vol, 'sine', 0.005);
    noise(t0, 2.2, 400, 60, 0.7, vol * 0.6, 'lowpass', 0.005);
    noise(t0, 1.2, 5000, 1500, 0.5, vol * 0.15, 'highpass', 0.005);
  };

  const heart = (t0, vol = 0.35) => {
    tone(t0, 0.22, 70, 40, vol, 'sine', 0.005);
    tone(t0 + 0.24, 0.2, 64, 38, vol * 0.7, 'sine', 0.005);
  };

  pad([53, 60, 64, 69, 72], 0, 9.5, 0.05);
  [72, 76, 79, 84, 79, 76, 81, 88].forEach((m, i) => bell(m, 0.8 + i * 0.95, 0.035));
  bell(84, 1.3, 0.05, music, 5);
  bell(88, 4.9, 0.05, music, 5);
  for (let i = 0; i < 8; i++) noise(9 + i * 0.18, 0.12, 300 + Math.random() * 5000, 800, 4, 0.18);
  tone(9, 0.6, 1200, 80, 0.1, 'square');
  pad([45, 52, 55, 58], 9.5, 8, 0.06, 'sawtooth', 600);
  noise(10, 7, 60, 260, 0.8, 0.5, 'lowpass', 2);
  tone(10, 7, 38, 26, 0.35, 'sawtooth', 2);
  noise(12, 5, 200, 2400, 1.5, 0.25, 'bandpass', 3);
  tone(16, 1.2, 200, 1800, 0.08, 'sawtooth', 0.8);
  noise(17, 5, 800, 3800, 1.2, 0.35, 'bandpass', 0.2);
  tone(17, 5, 55, 220, 0.12, 'sawtooth', 0.3);
  boom(21.8, 0.7);
  pad([57, 64, 67, 71, 74], 22.5, 8, 0.045);
  [79, 83, 86, 91].forEach((m, i) => bell(m, 23 + i * 0.7, 0.03, music, 5));
  boom(26.3, 0.35);
  pad([53, 60, 65, 69, 74], 30, 10.5, 0.05);
  [77, 81, 84, 88, 86, 84, 81, 79, 81, 84].forEach((m, i) => bell(m, 30.6 + i * 0.9, 0.03));
  bell(88, 39.4, 0.06, music, 6);
  pad([50, 57, 60, 65], 40, 10, 0.05, 'sawtooth', 900);
  for (let i = 0; i < 6; i++) noise(41 + i * 1.6, 2.2, 90, 50, 0.6, 0.25, 'lowpass', 0.6);
  for (let i = 0; i < 10; i++) noise(43 + i * 0.55, 0.6, 1500, 300, 1, 0.12, 'bandpass', 0.05);
  noise(47, 2.6, 80, 300, 0.6, 0.45, 'lowpass', 2.2);
  boom(49.45, 1);
  tone(49.5, 6, 3200, 3000, 0.05, 'sine', 0.05);
  for (let i = 0; i < 7; i++) heart(50.4 + i * 1.05, 0.35 - i * 0.03);
  tone(52, 14, 55, 55, 0.12, 'sawtooth', 2);
  tone(52, 14, 82.4, 82.4, 0.06, 'sawtooth', 2);
  pad([48, 54, 58, 62], 52.5, 7, 0.04, 'sine', 1200);
  for (let i = 0; i < 26; i++) bell(84 + ((i * 5) % 12), 53.5 + i * 0.32, 0.02, sfx, 1.5);
  pad([55, 62, 67, 71, 74], 58, 8, 0.05);
  noise(61.1, 1.4, 6000, 2000, 0.6, 0.2, 'highpass', 0.01);
  for (let i = 0; i < 16; i++) bell(86 + ((i * 7) % 12), 61.2 + i * 0.12, 0.04, sfx, 1.2);
  tone(66, 3.4, 80, 2400, 0.12, 'sawtooth', 2.4);
  noise(66, 3.5, 300, 6000, 1, 0.3, 'bandpass', 2.5);
  boom(69.3, 0.8);
  pad([48, 55, 60, 64, 67, 72], 69.5, 6, 0.07);
  [72, 76, 79, 84].forEach((m, i) => bell(m, 70.2 + i * 0.35, 0.05, music, 5));
  pad([53, 60, 65, 69], 75, 9, 0.045);
  noise(74, 10, 300, 200, 0.5, 0.05, 'lowpass', 2);
  tone(77.2, 2, 120, 180, 0.06, 'sine', 0.4);
  tone(80.4, 1.8, 120, 180, 0.06, 'sine', 0.4);
  [77, 81, 84].forEach((m, i) => bell(m, 82.3 + i * 0.6, 0.035));
  boom(84.6, 0.55);
  pad([41, 48, 53, 57, 60, 65], 84.6, 7.4, 0.07, 'sawtooth', 1400);
  [65, 72, 77, 81, 84].forEach((m, i) => bell(m, 84.8 + i * 0.25, 0.05, music, 6));

  return {
    stop() {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.8);
      setTimeout(
        () =>
          nodes.forEach((n) => {
            try {
              n.stop();
            } catch (e) {}
          }),
        900,
      );
    },
  };
};
