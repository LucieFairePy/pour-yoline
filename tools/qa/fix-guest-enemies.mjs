// The guest sees the host's enemies in every combat level. The enemy snapshots ('en') are handled
// by a handler shared by all combat levels (declared by garde); once garde's world could be
// unloaded, its handler was skipped as "late" and the guest's enemy list stayed empty everywhere
// but garde and tr_s2. Each level is entered from the city (so garde's world is unloaded), then
// both screens must show the same enemies.
//   node tools/qa/fix-guest-enemies.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

const LEVELS = ['donjon', 'raid', 'tr_s4', 'tr_s5', 'tr_s6', 'tr_sD', 'tr_sR', 'tr_ufo', 'garde', 'tr_s2'];
const N = 'Enemies.list.size';

run('guest-enemies', async ({ A, B, go, sleep, log }) => {
  const rows = [];
  for (const lv of LEVELS) {
    await go('city');
    await sleep(1500);
    if (!(await go(lv))) {
      rows.push({ lv, ok: false, why: 'did not load' });
      continue;
    }
    // tr_s2 has enemies (and sends them) only in its run, section 3
    if (lv === 'tr_s2') await A.ev('Story.ctx.set((s) => { s.x.sec = 3; }); 1');
    let host = 0;
    for (let i = 0; i < 8 && !host; i++) {
      await sleep(500);
      host = await A.ev(N);
    }
    // most levels spawn their enemies later (a stage, a wave): the host spawns one Pion near
    // itself, as a wave would — what is tested is that the guest receives it
    let spawned = false;
    if (!host) {
      await A.ev("Enemies.spawn('pion', Player.body.p.clone().add(V3(6, 0, 0))); 1");
      spawned = true;
      await sleep(500);
      host = await A.ev(N);
    }
    let guest = 0;
    for (let i = 0; i < 20 && guest !== host; i++) {
      await sleep(250);
      host = await A.ev(N);
      guest = await B.ev(N);
    }
    const row = { lv, host, guest, spawnedByTest: spawned, ok: guest > 0 && guest === host };
    rows.push(row);
    log(JSON.stringify(row));
  }
  return { ok: rows.every((r) => r.ok), rows };
});
