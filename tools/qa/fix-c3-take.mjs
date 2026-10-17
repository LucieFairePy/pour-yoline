// tr_c3 « La Bascule »: the crate is taken by the Valet kit standing by it. The host checked who
// asked but not where they stood: a 'take' sent from across the level (a late or forged message)
// lifted the crate. Here: the Valet, far from the crate, sends the level's own 'take' → the crate
// must stay put; then the Valet walks up to it and presses E (Input.sim) → it must be carried, on
// both screens.
//   node tools/qa/fix-c3-take.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

run('c3-take', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_c3'))) return { ok: false, notes: 'tr_c3 did not load' };
  await A.until('TrC3.built', 20000);
  await B.until('TrC3.built', 20000);
  await sleep(2000);
  const valet = (await A.ev('Story.role')) === 'valet' ? A : B;
  const valetIs = valet === A ? 'host' : 'guest';
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.lock = false; s.x.crate = { st: 'ground', x: 3, y: 0, z: 5 }; }); 1");
  await sleep(900);
  // far from the crate (the other end of island A)
  await valet.ev('Story.ctx.spawn(TrC3.P(-3, 0.05, 1), 0); 1');
  await sleep(1500);
  const dist = await valet.ev('(() => { const q = TrC3.rel(Player.body.p); return +Math.hypot(q.x - 3, q.z - 5).toFixed(2); })()');
  await valet.ev("Story.ctx.act({ a: 'take' }); 1");
  await sleep(1000);
  const far = [await A.ev('Story.S.x.crate.st'), await B.ev('Story.S.x.crate.st')];
  // next to it, the real key
  await valet.ev('Story.ctx.spawn(TrC3.P(3, 0.05, 4.1), 0); 1');
  await sleep(1500);
  await valet.ev("Input.sim.held.add('interact'); 1");
  await sleep(150);
  await valet.ev("Input.sim.held.delete('interact'); 1");
  await sleep(1200);
  const near = [await A.ev('Story.S.x.crate.st'), await B.ev('Story.S.x.crate.st')];
  const r = { valetIs, farDistance: dist, crateAfterFarTake: far, crateAfterNearE: near };
  log(JSON.stringify(r));
  return { ok: far.every((s) => s === 'ground') && near.every((s) => s === 'carry'), ...r };
});
