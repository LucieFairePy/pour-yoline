const HB = { on: false, level: 0, period: 1.2, next: 0, beats: [], vibe: false };
function heart(on, level = 1, period) {
  if (on && !HB.on) {
    HB.next = clock() + 0.08;
    HB.beats = [];
  }
  HB.on = on;
  gsap.to(HB, { level: on ? level : 0, duration: 1.4, overwrite: 'auto' });
  if (period) gsap.to(HB, { period, duration: 1.2 });
}
function beatTick() {
  if (!HB.on) return;
  const now = clock();
  if (HB.next < now - 0.5) HB.next = now + 0.05;
  while (HB.next < now + 0.12) {
    const t = HB.next,
      s = HB.period / 1.2;
    HB.beats.push(t);
    if (A.ac && A.on && HB.level > 0.02) {
      thump(t, 0.34 * Math.min(HB.level, 1.3));
      thump(t + 0.22 * Math.min(s, 1), 0.2 * Math.min(HB.level, 1.3));
    }
    if (HB.vibe) setTimeout(() => buzz([25, 120, 18]), Math.max(0, (t - now) * 1000));
    HB.next += HB.period;
  }
}
function beatEnv() {
  const now = clock();
  while (HB.beats.length > 1 && HB.beats[1] <= now) HB.beats.shift();
  const b = HB.beats[0];
  if (b === undefined || b > now) return 0;
  const x = now - b,
    s = Math.min(1, HB.period / 1.2);
  return (
    (Math.exp(-Math.pow((x * 13) / s, 2)) +
      0.65 * Math.exp(-Math.pow(((x - 0.22 * s) * 13) / s, 2))) *
    HB.level
  );
}
