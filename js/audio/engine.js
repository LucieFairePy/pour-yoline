const A = {
  ac: null,
  master: null,
  music: null,
  verb: null,
  an: null,
  bins: null,
  on: false,
  mood: 'happy',
  level: 0,
  bar: 0,
  nextBar: 0,
  prog: null,
  voicing: null,
  melody: null,
  noiseBuf: null,
  lanes: {},
  scribbles: [],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clock = () => (A.ac ? A.ac.currentTime : performance.now() / 1000);
const KEY = 5;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA = [0, 2, 4, 7, 9];
const rr = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hum = (t, amt = 0.006) => Math.max(0, t + (Math.random() * 2 - 1) * amt);
const vel = (v, amt = 0.1) =>
  Math.max(0.05, Math.min(1.3, v * (1 + (Math.random() * 2 - 1) * amt)));
const Ch = (deg, ext = {}) => ({ deg, ...ext });
const PROGS = {
  happy: [
    [Ch(0, { seventh: 1 }), Ch(5, { seventh: 1 }), Ch(3, { seventh: 1 }), Ch(4, { sus4: 1 })],
    [Ch(3, { seventh: 1 }), Ch(0, { ninth: 1 }), Ch(5, { seventh: 1 }), Ch(4)],
    [Ch(5, { seventh: 1 }), Ch(3, { seventh: 1 }), Ch(0, { ninth: 1 }), Ch(4)],
    [Ch(1, { seventh: 1 }), Ch(4), Ch(2, { seventh: 1 }), Ch(5, { seventh: 1 })],
  ],
  sad: [
    [Ch(5, { seventh: 1 }), Ch(1, { seventh: 1 }), Ch(3, { seventh: 1 }), Ch(2, { raise: 1 })],
    [Ch(5), Ch(3, { seventh: 1 }), Ch(1, { seventh: 1 }), Ch(2, { raise: 1 })],
  ],
};
const BPM = { happy: 84, sad: 66 };
const PATTERNS = {
  0: [[0, 'chord', 3.6, 0.7]],
  0.5: [
    [0, 'chord', 2.2, 0.7],
    [2.5, 'top2', 1.3, 0.45],
  ],
  1: [
    [0, 'chord', 1.4, 0.75],
    [1.5, 'top2', 0.9, 0.45],
    [2.5, 'chord', 1.3, 0.6],
    [3.5, 'top2', 0.45, 0.4],
  ],
  2: [
    [0, 'chord', 1.4, 0.8],
    [1.5, 'top2', 0.9, 0.5],
    [2.5, 'chord', 1.3, 0.65],
    [3.5, 'top2', 0.45, 0.45],
  ],
};
const PING = [
  [1, 1, 1],
  [2, 0.35, 0.55],
  [2.76, 0.2, 0.4],
  [5.4, 0.08, 0.2],
];

const tone = (deg, k) => (KEY + MAJOR[(deg + k) % 7]) % 12;
const rootMidi = (deg) => {
  const pc = tone(deg, 0);
  return 36 + pc + (pc < 4 ? 12 : 0);
};
function chordPcs(c) {
  const pcs = [tone(c.deg, 0), c.sus4 ? tone(c.deg, 3) : tone(c.deg, 2), tone(c.deg, 4)];
  if (c.raise) pcs[1] = (pcs[1] + 1) % 12;
  if (c.seventh) pcs.push(tone(c.deg, 6));
  if (c.ninth) pcs.push(tone(c.deg, 8));
  return pcs;
}
const nearestPc = (pc, near) => near + ((((pc - near) % 12) + 18) % 12) - 6;

function voiceChord(pcs, prev, low = 53, high = 77) {
  if (!prev) {
    const out = [];
    let m = low;
    for (const pc of pcs) {
      while (m % 12 !== pc) m++;
      out.push(m);
      m++;
    }
    return out;
  }
  let best = null,
    score = 1e9;
  for (let r = 0; r < pcs.length; r++) {
    const rot = pcs.slice(r).concat(pcs.slice(0, r));
    const notes = rot.map((pc, k) => {
      let n = nearestPc(pc, prev[Math.min(k, prev.length - 1)]);
      while (n < low) n += 12;
      while (n > high) n -= 12;
      return n;
    });
    const sc =
      notes.reduce((a, n, k) => a + Math.abs(n - prev[Math.min(k, prev.length - 1)]), 0) +
      (new Set(notes).size < notes.length ? 50 : 0);
    if (sc < score) {
      score = sc;
      best = notes;
    }
  }
  return best.sort((a, b) => a - b);
}

function audioInit() {
  if (A.ac) return;
  try {
    A.ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    return;
  }
  const ac = A.ac;
  A.master = ac.createGain();
  A.master.gain.value = 0;
  A.an = ac.createAnalyser();
  A.an.fftSize = 256;
  A.an.smoothingTimeConstant = 0.8;
  A.bins = new Uint8Array(A.an.frequencyBinCount);
  const len = ac.sampleRate * 3,
    buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  A.verb = ac.createConvolver();
  A.verb.buffer = buf;
  const verbOut = ac.createGain();
  verbOut.gain.value = 0.8;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 38;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  A.master.connect(hp);
  A.verb.connect(verbOut);
  verbOut.connect(hp);
  hp.connect(comp);
  comp.connect(ac.destination);
  comp.connect(A.an);
  A.music = ac.createGain();
  A.music.gain.value = 0.9;
  A.music.connect(A.master);
  const lane = (filter, verbAmt, gain = 1, lfo) => {
    const inp = ac.createGain();
    inp.gain.value = gain;
    let head = inp;
    if (filter) {
      const f = ac.createBiquadFilter();
      f.type = filter[0];
      f.frequency.value = filter[1];
      f.Q.value = filter[2];
      inp.connect(f);
      head = f;
      if (lfo) {
        const o = ac.createOscillator(),
          g = ac.createGain();
        o.frequency.value = lfo[0];
        g.gain.value = lfo[1];
        o.connect(g);
        g.connect(f.frequency);
        o.start();
      }
    }
    head.connect(A.music);
    const send = ac.createGain();
    send.gain.value = verbAmt;
    head.connect(send);
    send.connect(A.verb);
    return inp;
  };
  A.lanes = {
    pad: lane(['lowpass', 1100, 0.6], 0.35, 1, [0.07, 350]),
    ep: lane(['lowpass', 5200, 0.5], 0.25),
    bass: lane(['lowpass', 700, 0.6], 0.05, 0.55),
    bell: lane(null, 0.55, 0.9),
    fx: lane(null, 0.3),
  };
  const nl = ac.sampleRate * 2;
  A.noiseBuf = ac.createBuffer(1, nl, ac.sampleRate);
  const nd = A.noiseBuf.getChannelData(0);
  for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
  A.nextBar = ac.currentTime + 0.15;
  setInterval(schedule, 40);
}
