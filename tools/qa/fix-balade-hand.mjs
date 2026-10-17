// La Balade: the hand is given when both players press E (each within 2.5 s of the other). Checked
// here with real presses (Input.sim, read by Input.poll like the keyboard), both players side by
// side on the path: pressed at the same instant, a few frames apart, half a second apart. Each
// time the hands must join on both screens, and stay joined; then both press again together and
// the hands must let go and stay apart, also when that release comes right after the grab (a
// release must not grab the hand again).
//   node tools/qa/fix-balade-hand.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

run('balade-hand', async ({ A, B, go, sleep, log }) => {
  if (!(await go('balade'))) return { ok: false, notes: 'balade did not load' };
  await A.until('Balade.built', 20000);
  await B.until('Balade.built', 20000);
  await sleep(2500);
  // side by side on the path, still (the hand prompt needs them within 1.8 m)
  const place = (p, dx) =>
    p.ev(`(() => { const q = Balade.spawn(1, Story.role); Player.teleport(Balade.P(${dx}, 0, Balade.rel(q).z), 0);
      Player.body.v && Player.body.v.set(0, 0, 0); return 1; })()`);
  await place(A, -0.5);
  await place(B, 0.5);
  await sleep(1500);
  const press = async (p) => {
    await p.ev("Input.sim.held.add('interact'); 1");
    await sleep(120);
    await p.ev("Input.sim.held.delete('interact'); 1");
  };
  const hand = async () => [await A.ev('!!Story.S.x.hand'), await B.ev('!!Story.S.x.hand')];
  const both = async (gap) => {
    if (!gap) await Promise.all([press(A), press(B)]);
    else {
      const a = press(A);
      await sleep(gap);
      await Promise.all([a, press(B)]);
    }
    await sleep(1200);
    const h1 = await hand();
    await sleep(1500);
    return [h1, await hand()];
  };
  const runs = [];
  for (const gap of [0, 40, 500]) {
    const [grab, grabLater] = await both(gap);
    const [rel, relLater] = await both(gap);
    runs.push({ gap, grab, grabLater, rel, relLater });
    log(JSON.stringify(runs[runs.length - 1]));
    await sleep(2800);
  }
  // a quick change of mind: hands joined, both let go together a moment later (inside the 2.5 s
  // the grab presses are remembered): the hands must stay apart
  await Promise.all([press(A), press(B)]);
  await sleep(700);
  const quickGrab = await hand();
  await Promise.all([press(A), press(B)]);
  await sleep(1200);
  const quickRel = await hand();
  await sleep(1500);
  const quickRelLater = await hand();
  const quick = { quickGrab, quickRel, quickRelLater };
  log(JSON.stringify(quick));
  const ok =
    runs.every((r) => r.grab.every(Boolean) && r.grabLater.every(Boolean) && !r.rel.some(Boolean) && !r.relLater.some(Boolean)) &&
    quickGrab.every(Boolean) && !quickRel.some(Boolean) && !quickRelLater.some(Boolean);
  return { ok, runs, quick };
});
