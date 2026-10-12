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

  const thrust = (t0, dur) => {
    noise(t0, dur, 900, 700, 0.9, 0.09, 'bandpass', 0.15);
    noise(t0, dur, 180, 140, 0.7, 0.12, 'lowpass', 0.15);
  };
  const thud = (t0, vol = 0.25) => {
    tone(t0, 0.35, 120, 45, vol, 'sine', 0.004);
    noise(t0, 0.3, 900, 200, 0.8, vol * 0.5, 'lowpass', 0.004);
  };
  const breath = (t0, n, gap, vol = 0.05) => {
    for (let i = 0; i < n; i++)
      noise(t0 + i * gap, gap * 0.8, 1400, 700, 0.8, vol, 'bandpass', gap * 0.35);
  };

  // 0-12 : drift, hands held
  pad([53, 60, 64, 69, 72], 0, 13, 0.05);
  [72, 76, 79, 84, 79, 76, 81, 88, 84, 81, 79].forEach((m, i) => bell(m, 0.8 + i * 1.0, 0.035));
  bell(84, 1.3, 0.05, music, 5);
  bell(88, 6.2, 0.05, music, 5);
  breath(1, 5, 2.2, 0.03);
  for (let i = 0; i < 11; i++) heart(1 + i * 1.05, 0.16 * (1 - i / 14));
  // 12-22.6 : black hole opens, pull grows
  for (let i = 0; i < 8; i++) noise(12 + i * 0.18, 0.12, 300 + Math.random() * 5000, 800, 4, 0.18);
  tone(12, 0.6, 1200, 80, 0.1, 'square');
  pad([45, 52, 55, 58], 12.5, 10.5, 0.06, 'sawtooth', 600);
  noise(13, 9.6, 60, 260, 0.8, 0.5, 'lowpass', 3);
  tone(13, 9.6, 38, 24, 0.35, 'sawtooth', 3);
  noise(15, 7.6, 200, 2600, 1.5, 0.25, 'bandpass', 4);
  breath(16, 10, 0.6, 0.06);
  tone(19.5, 3, 200, 1800, 0.08, 'sawtooth', 1.5);
  // 22.6-28.5 : tunnel
  boom(22.6, 0.7);
  noise(22.6, 6, 800, 3800, 1.2, 0.35, 'bandpass', 0.3);
  tone(22.6, 6, 55, 220, 0.12, 'sawtooth', 0.4);
  // 28.5 : white hole, ejection
  boom(28.4, 0.5);
  noise(27.6, 3, 2000, 9000, 0.6, 0.2, 'highpass', 0.8);
  pad([57, 64, 67, 71, 74], 29, 9, 0.045);
  [79, 83, 86, 91].forEach((m, i) => bell(m, 29.4 + i * 0.7, 0.03, music, 5));
  // 30-38.5 : alone, drifting apart
  pad([53, 60, 65, 69, 74], 34, 10, 0.045);
  [77, 81, 84, 88, 86, 84, 81].forEach((m, i) => bell(m, 34.6 + i * 1.1, 0.028));
  breath(31, 7, 1.1, 0.05);
  // 38.5-48.6 : thrusters, reaching her
  thrust(38.5, 10.1);
  tone(38.5, 0.25, 300, 900, 0.05, 'square', 0.01);
  pad([50, 57, 62, 65, 69], 41, 8, 0.05, 'triangle', 1400);
  bell(88, 48.6, 0.07, music, 6);
  bell(81, 48.9, 0.05, music, 6);
  // 48.6-61.4 : together again, asteroid field
  pad([53, 60, 64, 69, 76], 49, 10, 0.05);
  for (let i = 0; i < 6; i++) noise(50 + i * 1.8, 2.2, 90, 50, 0.6, 0.2, 'lowpass', 0.6);
  [53.2, 55.8, 58.4].forEach((t) => thud(t, 0.22));
  noise(58.2, 3.2, 60, 400, 0.6, 0.45, 'lowpass', 2.6);
  // 61.4 : impact, blackout
  boom(61.4, 1);
  tone(61.5, 6, 3200, 3000, 0.05, 'sine', 0.05);
  for (let i = 0; i < 6; i++) heart(62.4 + i * 1.1, 0.35 - i * 0.04);
  // 64-81 : ship, beam, the Oui extracted
  noise(58, 6.6, 120, 900, 0.7, 0.3, 'lowpass', 5);
  tone(58, 7, 30, 55, 0.12, 'sawtooth', 5);
  tone(62, 18, 55, 55, 0.08, 'sawtooth', 2);
  tone(62, 18, 82.4, 82.4, 0.04, 'sawtooth', 2);
  tone(64.5, 2.6, 80, 1400, 0.08, 'sawtooth', 2);
  noise(64.5, 16, 400, 900, 0.8, 0.07, 'bandpass', 2);
  pad([48, 54, 58, 62], 66, 6, 0.04, 'sine', 1200);
  pad([55, 62, 67, 71, 74], 71, 5, 0.05);
  for (let i = 0; i < 16; i++) bell(84 + ((i * 5) % 12), 71.2 + i * 0.25, 0.02, sfx, 1.5);
  noise(75.2, 1.4, 6000, 2000, 0.6, 0.2, 'highpass', 0.01);
  for (let i = 0; i < 26; i++) bell(86 + ((i * 7) % 12), 75.4 + i * 0.18, 0.035, sfx, 1.2);
  pad([53, 60, 65, 69], 76, 6, 0.045);
  // 81-90 : departure, lightspeed
  tone(84, 2.5, 80, 1600, 0.12, 'sawtooth', 2.3);
  noise(84, 2.5, 300, 4000, 1, 0.22, 'bandpass', 2.3);
  boom(86.5, 0.75);
  noise(86.6, 2.8, 2000, 800, 0.6, 0.25, 'bandpass', 0.3);
  tone(86.6, 2.8, 40, 34, 0.25, 'sawtooth', 0.3);
  boom(89.4, 0.7);
  // 89.4-97 : Terre 39
  pad([48, 55, 60, 64, 67, 72], 89.6, 8, 0.07);
  [72, 76, 79, 84].forEach((m, i) => bell(m, 91.5 + i * 0.4, 0.05, music, 5));
  noise(94.4, 4.5, 400, 1600, 0.5, 0.15, 'bandpass', 2);
  // 97-133 : the city, drops, wake-ups
  pad([53, 60, 65, 69], 98, 10, 0.045);
  noise(97, 36, 300, 200, 0.5, 0.04, 'lowpass', 3);
  [101.4, 108.8].forEach((t) => {
    tone(t, 2.6, 120, 180, 0.06, 'sine', 0.4);
    noise(t, 2.8, 500, 900, 0.8, 0.06, 'bandpass', 0.4);
  });
  thud(103.8, 0.3);
  thud(111.2, 0.3);
  breath(115.2, 6, 1.2, 0.05);
  pad([50, 57, 62, 65, 69], 110, 12, 0.04);
  [77, 81, 84].forEach((m, i) => bell(m, 121.4 + i * 0.8, 0.035));
  breath(126, 6, 1.2, 0.05);
  pad([53, 60, 64, 69, 72], 124, 10, 0.045);
  [79, 84, 88].forEach((m, i) => bell(m, 131.6 + i * 0.6, 0.04, music, 4));
  // 133.4 : title
  boom(133.4, 0.55);
  pad([41, 48, 53, 57, 60, 65], 133.4, 6.6, 0.07, 'sawtooth', 1400);
  [65, 72, 77, 81, 84].forEach((m, i) => bell(m, 133.6 + i * 0.25, 0.05, music, 6));

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
