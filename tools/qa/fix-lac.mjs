// Le Lac gelé (tr_d10): its own sounds (wind, the ice creaking under each step) must be heard over
// the game's music. The lake plays them on its own audio context (D10.AU); before the fix they
// came out 15 to 25 dB under the music (the wind bed at -48 dBFS, a step's creak hardly above it)
// and were masked. Here an analyser is put between each audio context and the speakers (on both
// screens), and the lake's wind and a step's creak are measured against the music.
//   node tools/qa/fix-lac.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

// an analyser before the speakers of every audio context that connects to them from now on (the
// lake's is made on entry), and one on the game's master bus (Sound.score hands it over)
const TAP = `(() => {
  if (window.__tap) return 1;
  const orig = AudioNode.prototype.connect;
  const L = (window.__tap = []);
  AudioNode.prototype.connect = function (dst, ...a) {
    if (dst instanceof AudioDestinationNode) {
      let m = L.find((m) => m.ctx === this.context);
      if (!m) {
        const an = this.context.createAnalyser();
        an.fftSize = 2048;
        orig.call(an, dst);
        L.push((m = { ctx: this.context, an }));
      }
      orig.call(this, m.an);
      return dst;
    }
    return orig.call(this, dst, ...a);
  };
  Sound.score((ctx, dest) => {
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    dest.connect(an);
    window.__music = { ctx, an };
    return null;
  });
  window.__level = (m) => {
    const d = new Float32Array(2048);
    m.an.getFloatTimeDomainData(d);
    let s = 0, p = 0;
    for (const v of d) { s += v * v; p = Math.max(p, Math.abs(v)); }
    return { rms: Math.sqrt(s / d.length), peak: p };
  };
  return 1;
})()`;

// 4 s of the lake alone (median rms of its context and of the music), then a step's creak
const MEASURE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lake = __tap.find((m) => m.ctx !== __music.ctx);
  if (!lake) return JSON.stringify({ lake: null });
  const bed = [], music = [];
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    bed.push(__level(lake).rms);
    music.push(__level(__music).rms);
  }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  let creak = 0;
  D10.AU.creak(Player.body.p.clone());
  for (let i = 0; i < 12; i++) {
    await sleep(25);
    creak = Math.max(creak, __level(lake).peak);
  }
  const db = (v) => +(20 * Math.log10(Math.max(v, 1e-6))).toFixed(1);
  return JSON.stringify({ state: lake.ctx.state, bedDb: db(med(bed)), musicDb: db(med(music)), creakPeakDb: db(creak) });
})()`;

run('lac', async ({ A, B, go, sleep, log }) => {
  await A.ev(TAP);
  await B.ev(TAP);
  const built = "Story.S.phase === 'tr_d10' && D10.built";
  if (!(await go('tr_d10')) || !(await A.until(built)) || !(await B.until(built))) return { ok: false, notes: 'tr_d10 did not load' };
  await sleep(4000);
  const rows = {};
  let ok = true;
  for (const [k, p] of [['A', A], ['B', B]]) {
    const r = JSON.parse(await p.ev(MEASURE));
    r.kit = await p.ev('Story.role');
    // heard: the wind no more than 6 dB under the music, a creak's peak above -26 dBFS
    r.ok = r.state === 'running' && r.bedDb >= r.musicDb - 6 && r.creakPeakDb >= -26;
    if (!r.ok) ok = false;
    rows[k] = r;
    log(k, JSON.stringify(r));
  }
  return { ok, rows, notes: ok ? "the lake's wind and creaks are heard over the music on both screens" : "the lake's sounds are under the music" };
});
