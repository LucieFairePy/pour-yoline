function melodyNote(pcs, strong) {
  const low = 74,
    high = 88;
  let note = A.melody ?? nearestPc(pcs[0], 81);
  if (strong) {
    const opts = [];
    for (let m = low; m <= high; m++) if (pcs.slice(0, 3).includes(m % 12)) opts.push(m);
    opts.sort((x, y) => Math.abs(x - note) - Math.abs(y - note));
    note = opts[Math.floor(Math.random() * 2)] ?? note;
  } else {
    const steps = [];
    for (let s = -10; s <= 20; s++) {
      const m = 60 + KEY + PENTA[((s % 5) + 5) % 5] + 12 * Math.floor(s / 5);
      if (m >= low && m <= high && m !== note && Math.abs(m - note) <= 5) steps.push(m);
    }
    if (steps.length) note = pickOne(steps);
  }
  return (A.melody = note);
}
function playBar(t) {
  const sad = A.mood === 'sad',
    beat = 60 / BPM[A.mood],
    L = sad ? Math.min(A.level, 0.5) : A.level;
  if (A.bar % 4 === 0 || !A.prog) A.prog = pickOne(PROGS[A.mood]);
  const c = A.prog[A.bar % 4],
    pcs = chordPcs(c);
  const voicing = voiceChord(pcs, A.voicing);
  A.voicing = voicing;
  const root = rootMidi(c.deg);
  padChord(voicing, t, beat * 4, sad ? 0.8 : L === 0 ? 0.75 : 1);
  for (const [pos, kind, ln, v] of PATTERNS[L] || PATTERNS[1]) {
    const notes = kind === 'chord' ? voicing : voicing.slice(-2);
    notes.forEach((m, k) =>
      epiano(
        m,
        hum(t + pos * beat + k * (kind === 'chord' ? 0.014 : 0.008), 0.003),
        vel(v * (sad ? 0.75 : 1)),
        ln * beat,
      ),
    );
  }
  if (L >= 1) {
    const nextRoot = rootMidi(A.prog[(A.bar + 1) % 4].deg);
    bass(root, hum(t), vel(0.85), beat * 1.4);
    const second = root + (Math.random() < 0.6 ? 7 : (pcs[1] - pcs[0] + 12) % 12);
    bass(second, hum(t + 2 * beat), vel(0.7), beat * 1.2);
    if (Math.random() < 0.7)
      bass(nextRoot + (nextRoot >= second ? -1 : 1), hum(t + 3.5 * beat), vel(0.5), beat * 0.45);
  } else if (L === 0.5) bass(root, t, 0.6, beat * 3.8);
  if (L >= 2)
    for (const half of [0, 2]) {
      if (Math.random() > 0.45) continue;
      const pos = half + pickOne([0, 0.5, 1]);
      bell(melodyNote(pcs, pos % 2 === 0), hum(t + pos * beat), vel(0.5));
    }
  A.bar++;
  return beat * 4;
}
function schedule() {
  const now = A.ac.currentTime;
  while (A.nextBar < now + 0.3)
    A.nextBar = Math.max(A.nextBar, now + 0.02) + playBar(Math.max(A.nextBar, now + 0.02));
}

function setLevel(l) {
  if (A.level === l) return;
  A.level = l;
  if (A.ac && A.on) {
    const t = A.ac.currentTime + 0.05;
    swell(t, 0.9, 0.045);
    if (A.voicing) bell(nearestPc(A.voicing[0] % 12, 84), t + 0.85, 0.45, 2.6);
  }
}
function setMood(m) {
  if (A.mood === m) return;
  A.mood = m;
  A.prog = null;
  A.bar = 0;
  if (A.ac) A.nextBar = Math.min(A.nextBar, A.ac.currentTime + 0.4);
}

function cadence() {
  if (!A.ac || !A.on) return;
  const t = A.ac.currentTime + 0.05,
    beat = 60 / BPM.happy;
  const V = voiceChord(chordPcs(Ch(4, { seventh: 1 })), A.voicing);
  const I = voiceChord(chordPcs(Ch(0, { ninth: 1 })), V);
  V.forEach((m, k) => epiano(m, t + k * 0.012, 0.85, beat));
  bass(rootMidi(4), t, 0.9, beat);
  const t2 = t + beat;
  I.forEach((m, k) => epiano(m, t2 + k * 0.02, 1, beat * 4));
  padChord(I, t2, beat * 4, 1.1);
  bass(rootMidi(0), t2, 1, beat * 4);
  [0, 4, 7, 12, 16, 19, 24].forEach((iv, k) =>
    bell(72 + KEY + iv, t2 + 0.1 + k * 0.09, 0.7, 3, 0.05),
  );
  A.voicing = I;
  A.prog = PROGS.happy[0];
  A.bar = 1;
  A.nextBar = t2 + beat * 4;
}
function fanfare() {
  if (!A.ac || !A.on) return;
  const t = A.ac.currentTime + 0.03,
    pcs = A.voicing ? A.voicing.map((m) => m % 12) : [KEY, (KEY + 4) % 12, (KEY + 7) % 12];
  for (let k = 0; k < 7; k++)
    bell(nearestPc(pcs[k % pcs.length], 76 + k * 2), t + k * 0.075, 0.7, 2.6, 0.05);
}
function sparkle() {
  if (!A.ac || !A.on) return;
  const pcs = A.voicing ? A.voicing.map((m) => m % 12) : [KEY];
  bell(nearestPc(pickOne(pcs), 86), A.ac.currentTime + 0.01, 0.5, 1.6, 0.03);
}
function noise(dur = 0.4, from = 2000, to = 300, vol = 0.2) {
  const ac = A.ac;
  if (!ac || !A.on) return;
  const src = ac.createBufferSource();
  src.buffer = A.noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  const t = ac.currentTime;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(A.master);
  src.start(t, rr(0, 1.5));
  src.stop(t + dur + 0.02);
}

function scribble(dur) {
  const ac = A.ac;
  if (!ac || !A.on || dur <= 0.03) return;
  const t0 = ac.currentTime + 0.005,
    end = t0 + dur;
  const src = ac.createBufferSource();
  src.buffer = A.noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.1;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  let s = t0;
  while (s < end - 0.04) {
    const len = Math.min(end - s, rr(0.09, 0.22)),
      peak = 0.05 * rr(0.7, 1),
      f0 = rr(2200, 4800);
    f.frequency.setValueAtTime(f0, s);
    f.frequency.linearRampToValueAtTime(f0 * rr(0.8, 1.25), s + len);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(peak, s + 0.018);
    for (let x = s + 0.03; x < s + len - 0.03; x += rr(0.012, 0.025))
      g.gain.linearRampToValueAtTime(peak * rr(0.35, 1), x);
    g.gain.linearRampToValueAtTime(0, s + len);
    if (Math.random() < 0.2) {
      const at = s + rr(0.02, Math.max(0.03, len - 0.08)),
        sf = rr(2600, 3400);
      const o = ac.createOscillator(),
        og = ac.createGain();
      o.frequency.setValueAtTime(sf, at);
      o.frequency.linearRampToValueAtTime(sf * rr(0.9, 1.1), at + 0.06);
      og.gain.setValueAtTime(0, at);
      og.gain.linearRampToValueAtTime(0.008, at + 0.01);
      og.gain.linearRampToValueAtTime(0, at + 0.05);
      o.connect(og);
      og.connect(A.master);
      o.start(at);
      o.stop(at + 0.08);
    }
    s += len + rr(0.02, 0.05);
  }
  src.connect(f);
  f.connect(g);
  panned(g, rr(-0.15, 0.15)).connect(A.master);
  src.start(t0, rr(0, 1.5));
  src.stop(end + 0.05);
  A.scribbles.push(src);
  if (A.scribbles.length > 40) A.scribbles.shift();
}
function hushScribbles() {
  A.scribbles.forEach((s) => {
    try {
      s.stop();
    } catch (e) {}
  });
  A.scribbles = [];
}
function setSound(on) {
  if (on) audioInit();
  A.on = on && !!A.ac;
  if (A.ac) {
    if (A.on && A.ac.state === 'suspended') A.ac.resume();
    A.master.gain.setTargetAtTime(A.on ? 0.7 : 0, A.ac.currentTime, 0.5);
  }
  $('#sound').setAttribute('aria-pressed', A.on);
  gsap.to('#soundTxt', {
    duration: 0.6,
    scrambleText: { text: A.on ? 'Son activé' : 'Son coupé', chars: 'lowerCase', speed: 0.5 },
  });
}
function energy() {
  if (!A.an || !A.on) return 0;
  A.an.getByteFrequencyData(A.bins);
  let s = 0;
  for (let i = 2; i < 24; i++) s += A.bins[i];
  return s / (22 * 255);
}
$('#sound').addEventListener('click', () => setSound(!A.on));
