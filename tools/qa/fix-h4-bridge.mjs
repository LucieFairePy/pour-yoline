// tr_h4 (La Lanterne), the light bridge over the gap: the lantern hangs on its post pA, the bridge
// is lit, the valet WALKS (stick only, no jump, through Input.sim) from island l1 across to island
// a2. Before: the first stone started 1.2 m past l1's edge and the last one stopped 1.2 m short of
// a2 (the step-up needs ground under the feet): a walking player dropped into the void.
//   node tools/qa/fix-h4-bridge.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './fix-kit.mjs';

const LIB = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'campaign', 'lib.js'), 'utf8');

run('h4-bridge', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_h4'))) return { ok: false, notes: 'tr_h4 did not load' };
  await sleep(2500);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  for (const p of [A, B]) await p.ev(LIB + ';1');
  // stage 2, the lantern on its post pA past the gap (the dame grappled across and hung it)
  await A.ev("Story.ctx.set((s) => { s.x.stage = 2; s.x.lan = { who: null, post: 'pA' }; }); 1");
  const lit = "Story.S.x.stage === 2 && H4.light.post === 'pA' && H4.slabs.filter((s) => s.sec === 2).every((s) => s.b.on)";
  await dame.ev('Player.teleport(H4.P(-4, 0.05, 62.5), 0); 1');
  await valet.ev('Player.teleport(H4.P(-2, 0.05, 45.5), 0); 1');
  if (!((await A.until(lit, 10000)) && (await B.until(lit, 10000)))) return { ok: false, notes: 'the bridge did not light up' };
  await sleep(1500);
  const rel = () => valet.ev('JSON.stringify(H4.rel(Player.body.p).toArray().map((v) => +v.toFixed(2)))').then(JSON.parse);
  const start = await rel();
  // walk: the stick toward a2, never the jump button
  await valet.ev(`(() => { window.__minY = 99; window.__jump = false;
    const t = setInterval(() => { window.__minY = Math.min(window.__minY, H4.rel(Player.body.p).y);
      window.__jump = window.__jump || Input.sim.held.has('jump'); }, 16);
    return B.walk(H4.P(-2, 0, 60.5), 0.4, 9000).then((ok) => { clearInterval(t); return ok; }); })()`);
  await sleep(800);
  const end = await rel();
  const minY = await valet.ev('+window.__minY.toFixed(2)');
  const jumped = await valet.ev('window.__jump');
  const onA2 = await valet.ev('H4.at("a2", H4.rel(Player.body.p)) && Player.body.grounded');
  const r = { start, end, minY, jumped, onA2 };
  log(JSON.stringify(r));
  return { ok: !jumped && onA2 && minY > -0.3 && end[2] > 58, ...r };
});
