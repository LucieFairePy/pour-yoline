function warpSound() {
  if (!A.ac || !A.on) return;
  const ac = A.ac,
    t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = A.noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(180, t);
  f.frequency.exponentialRampToValueAtTime(4200, t + 1.4);
  f.frequency.exponentialRampToValueAtTime(300, t + 3.4);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.3, t + 1.35);
  g.gain.linearRampToValueAtTime(0.05, t + 2.2);
  g.gain.linearRampToValueAtTime(0, t + 3.6);
  src.connect(f);
  f.connect(g);
  g.connect(A.master);
  src.start(t, rr(0, 1.5));
  src.stop(t + 3.7);
  const o = ac.createOscillator(),
    og = ac.createGain(),
    tb = t + 1.4;
  o.frequency.setValueAtTime(90, tb);
  o.frequency.exponentialRampToValueAtTime(28, tb + 1.1);
  og.gain.setValueAtTime(0, tb);
  og.gain.linearRampToValueAtTime(0.45, tb + 0.02);
  og.gain.exponentialRampToValueAtTime(0.001, tb + 1.3);
  o.connect(og);
  og.connect(A.master);
  o.start(tb);
  o.stop(tb + 1.4);
}
function bubbleSound() {
  if (!A.ac || !A.on) return;
  const ac = A.ac,
    t = ac.currentTime + 0.01,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(820, t);
  o.frequency.exponentialRampToValueAtTime(1500, t + 0.07);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(g);
  g.connect(A.master);
  o.start(t);
  o.stop(t + 0.16);
}
let RUM = null;
function rumble(level) {
  if (!A.ac) return;
  const ac = A.ac;
  if (!RUM) {
    const src = ac.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 110;
    f.Q.value = 2;
    const g = ac.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    g.connect(A.master);
    src.start();
    RUM = { g, f };
  }
  RUM.g.gain.setTargetAtTime(level * 0.5, ac.currentTime, 0.6);
  RUM.f.frequency.setTargetAtTime(80 + level * 90, ac.currentTime, 0.6);
}
function crackSound() {
  if (!A.ac || !A.on) return;
  const ac = A.ac,
    t = ac.currentTime + 0.01;
  [0, 0.045, 0.11].forEach((dt, k) => {
    const src = ac.createBufferSource();
    src.buffer = A.noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800 + k * 900;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t + dt);
    g.gain.linearRampToValueAtTime(0.5 - k * 0.14, t + dt + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.06);
    src.connect(f);
    f.connect(g);
    g.connect(A.master);
    src.start(t + dt, rr(0, 1.5));
    src.stop(t + dt + 0.08);
  });
}
function paperSound(dur = 0.7, vol = 0.09) {
  if (!A.ac || !A.on) return;
  const ac = A.ac,
    t0 = ac.currentTime + 0.01,
    src = ac.createBufferSource();
  src.buffer = A.noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.7;
  f.frequency.value = 2600;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  for (let x = t0; x < t0 + dur; x += rr(0.015, 0.04))
    g.gain.linearRampToValueAtTime(
      vol * Math.pow(Math.random(), 1.6) * Math.sin((Math.PI * (x - t0)) / dur),
      x,
    );
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(A.master);
  src.start(t0, rr(0, 1.5));
  src.stop(t0 + dur + 0.05);
}
function crumbs(x, y, n = 24) {
  const cols = ['#a8102c', '#7a0a1f', '#d8324f', '#5e0414'];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6,
      v = 2 + Math.random() * 5;
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 1,
      decay: 0.012 + Math.random() * 0.01,
      s: 5 + Math.random() * 5,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      c: cols[i % 4],
      heart: false,
      chip: true,
    });
  }
}
function petalBurst(x, y, n = 12) {
  const cols = ['#c21a3a', '#e0405b', '#a8102c', '#f07d92', '#8e0b25'];
  for (let i = 0; i < n; i++)
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: -1 - Math.random() * 3.2,
      life: 1,
      decay: 0.0045 + Math.random() * 0.002,
      s: 9 + Math.random() * 11,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.08,
      c: cols[i % 5],
      petal: true,
      flip: Math.random() * 6,
    });
}
function bloomChime() {
  if (!A.ac || !A.on) return;
  const t = A.ac.currentTime + 0.05;
  [0, 4, 7, 12, 14, 16, 19, 24].forEach((iv, k) =>
    bell(60 + KEY + iv, t + k * 0.75 + Math.random() * 0.05, 0.55, 3.2, 0.042),
  );
  swell(t + 4.6, 1.6, 0.05);
}
