function panned(node, pan) {
  if (!A.ac.createStereoPanner) return node;
  const p = A.ac.createStereoPanner();
  p.pan.value = pan;
  node.connect(p);
  return p;
}

function epiano(m, t, v, dur) {
  const ac = A.ac,
    f = mtof(m);
  const car = ac.createOscillator();
  car.frequency.value = f;
  const mod = ac.createOscillator();
  mod.frequency.value = f;
  const idx = ac.createGain();
  idx.gain.setValueAtTime(f * 1.9 * v, t);
  idx.gain.exponentialRampToValueAtTime(f * 0.12 + 1, t + 0.45);
  const tine = ac.createOscillator();
  tine.frequency.value = f * 14;
  const tg = ac.createGain();
  tg.gain.setValueAtTime(f * 0.9 * v, t);
  tg.gain.exponentialRampToValueAtTime(1, t + 0.05);
  mod.connect(idx);
  idx.connect(car.frequency);
  tine.connect(tg);
  tg.connect(car.frequency);
  const amp = ac.createGain(),
    rel = Math.max(1.4, dur * 1.6),
    peak = 0.055 * v;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.004);
  amp.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.6);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + rel);
  car.connect(amp);
  panned(amp, Math.sin(t * 1.4) * 0.35).connect(A.lanes.ep);
  [car, mod, tine].forEach((o) => {
    o.start(t);
    o.stop(t + rel + 0.05);
  });
}
function padChord(notes, t, dur, level = 1) {
  const ac = A.ac,
    each = (0.03 * level) / Math.sqrt(notes.length);
  notes.forEach((m) =>
    [-7, 7].forEach((det) => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det + rr(-2, 2);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(each, t + 1);
      g.gain.setValueAtTime(each, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 1.8);
      o.connect(g);
      g.connect(A.lanes.pad);
      o.start(t);
      o.stop(t + dur + 1.9);
    }),
  );
}
function bass(m, t, v, dur) {
  const ac = A.ac;
  [
    ['triangle', 1, 0.16],
    ['sine', 0.5, 0.12],
  ].forEach(([type, mul, lv]) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = mtof(m) * mul;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lv * v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(lv * v * 0.55, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    o.connect(g);
    g.connect(A.lanes.bass);
    o.start(t);
    o.stop(t + dur + 0.3);
  });
}
function bell(m, t, v, decay = 2.4, level = 0.045) {
  const ac = A.ac,
    f = mtof(m),
    out = ac.createGain();
  panned(out, rr(-0.3, 0.3)).connect(A.lanes.bell);
  PING.forEach(([ratio, amp, dk]) => {
    const o = ac.createOscillator();
    o.frequency.value = f * ratio;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * amp * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * dk);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + decay * dk + 0.05);
  });
}
function swell(t, len = 0.9, level = 0.05) {
  const ac = A.ac,
    src = ac.createBufferSource();
  src.buffer = A.noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(3200, t + len);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + len * 0.85);
  g.gain.linearRampToValueAtTime(0, t + len);
  src.connect(f);
  f.connect(g);
  g.connect(A.lanes.fx);
  src.start(t, rr(0, 1));
  src.stop(t + len + 0.05);
}
function thump(t, v) {
  const ac = A.ac,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.setValueAtTime(80, t);
  o.frequency.exponentialRampToValueAtTime(36, t + 0.14);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g);
  g.connect(A.master);
  o.start(t);
  o.stop(t + 0.35);
}
