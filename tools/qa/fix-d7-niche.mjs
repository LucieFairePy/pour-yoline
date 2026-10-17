// tr_d7 (Le Temps), the dial: the big hand sweeping past VI sets its rider down on the VI pier. Once
// the hand had gone on, the VI niche's grille was shut (it only opens in front of the big hand):
// the dame was stranded on the pier until the valet brought the hand back.
// Here: the valet cranks (E held, Input.sim) the hand to V; the dame boards it there (set on the
// hand: the walk from a niche is not what is tested); the valet cranks on past VI to VIII; the dame,
// wherever the hand left her, walks (Input.sim) to the VI niche: she must get in, the hand far away.
//   node tools/qa/fix-d7-niche.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './fix-kit.mjs';

const LIB = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'campaign', 'lib.js'), 'utf8');

run('d7-niche', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_d7'))) return { ok: false, notes: 'tr_d7 did not load' };
  for (const p of [A, B]) await p.ev('window.__test = 1; 1');
  await sleep(2500);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  for (const p of [A, B]) await p.ev(LIB + ';1');
  // no sand curtain on the way (they would sweep her off the hand: another rule, not tested here)
  await A.ev('Story.ctx.set((s) => { s.x.s1.cur = []; }); 1');
  const aMin = (p) => p.ev('(((window.__d7.m % 60) + 60) % 60) / 5');
  // the valet at his crank turns the hand (clockwise) until it points at h
  const crankTo = async (h) => {
    await valet.ev("Input.sim.held.add('interact'); 1");
    for (let i = 0; i < 300; i++) {
      const a = await aMin(valet);
      if (Math.abs(a - h) < 0.12) break;
      await sleep(30);
    }
    await valet.ev("Input.sim.held.delete('interact'); 1");
    await sleep(1500); // the mechanism settles on the nearest five minutes
  };
  const rel = (p) => p.ev('JSON.stringify(TrD7.rel(Player.body.p).toArray().map((v) => +v.toFixed(2)))').then(JSON.parse);
  const atCrank = await valet.ev('TrD7.nearCrank(TrD7.rel(Player.body.p))');
  if (!atCrank) return { ok: false, notes: 'the valet is not at his crank' };
  await crankTo(5);
  const a5 = await aMin(dame);
  // the dame on the big hand, 12 m out
  await dame.ev(`(() => { const d = TrD7.hourDir(${a5}); Player.teleport(TrD7.P(TrD7.C1.x + d[0] * 12, 0.05, TrD7.C1.z + d[1] * 12), Player.yaw); return 1; })()`);
  await sleep(1200);
  const onHand = await dame.ev('Player.body.grounded && TrD7.onMinute(Player.body)');
  await crankTo(8);
  const a8 = await aMin(dame);
  await sleep(500);
  const left = await rel(dame);
  const onPier = Math.abs(left[0]) < 1.7 && left[2] > 23.3 && left[2] < 29.7 && left[1] > -0.4 && left[1] < 1;
  // she walks to the VI niche
  await dame.ev('B.walk(TrD7.nicheSpot(6, 19.4), 0.4, 6000).then(() => 1)');
  await sleep(600);
  const end = await rel(dame);
  const inNiche = await dame.ev('TrD7.nicheAt(TrD7.rel(Player.body.p))');
  const r = { handAtV: a5, boarded: onHand, handAfter: a8, leftAt: left, leftOnPier: onPier, walkedTo: end, nicheAt: inNiche };
  log(JSON.stringify(r));
  // she was set down on the pier by the hand, the hand is far from VI (its grille no longer open
  // for the hand), and she got into the VI niche on her own
  return { ok: onHand && onPier && Math.abs(a8 - 6) > 1 && inNiche === 6, ...r };
});
