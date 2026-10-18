// A grapple caught on the way lets go by itself. In tr_d6 (Le Montreur, stage 6), a dame who
// grapples her third's ring from the balconies' side is dragged under the top box and hangs
// there: before, the rope never let go unless Space was pressed (nothing says so), and a player
// stayed hanging. Here the dame does exactly that with real input and touches nothing after the
// throw: within a few seconds she must be out of the grapple.
//   node tools/qa/fix-grapple-stuck.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';
import { hands } from './play-kit.mjs';

run('grapple-stuck', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_d6'))) return { ok: false, notes: 'tr_d6 did not load' };
  await sleep(3000);
  await hands(A, B);
  await A.ev('Story.ctx.set((s) => { s.x.stage = 6; }); 1');
  await sleep(1500);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  await dame.ev('CB.W = D6W; 1');
  const rows = [];
  for (let s = 0; s < 3; s++) {
    // setup: on the apron of third s, on the balconies' side (where the campaign saw the rope pin her)
    await dame.ev(`(() => { const cx = (D6W.BOSS.secs[${s}][0] + D6W.BOSS.secs[${s}][1]) / 2;
      const p = D6W.P(cx + 5.6, 0.2, 185.1); Player.body.p.copy(p); Player.body.v.set(0, 0, 0); return 1; })()`);
    await sleep(800);
    const ring = await dame.ev(`(() => { const r = D6W.ringPos(${s}); return [r.x, r.y, r.z]; })()`);
    for (let i = 0; i < 8; i++) {
      await dame.ev(`CB.aim(V3(${ring.join(',')})); 1`);
      await sleep(40);
    }
    const locked = await dame.ev('Player.lockTarget >= 0');
    await dame.ev("CB.tap('ability')");
    await sleep(300);
    const flew = await dame.ev("Player.mode === 'grapple'");
    // hands off: no Space
    let hung = 0;
    let outAt = null;
    for (let i = 0; i < 24; i++) {
      await sleep(250);
      const m = await dame.ev('Player.mode');
      if (m !== 'grapple') {
        outAt = (i + 1) * 0.25;
        break;
      }
      hung = (i + 1) * 0.25;
    }
    const row = { third: s, locked, flew, outAfterS: outAt, hungS: hung };
    rows.push(row);
    log(JSON.stringify(row));
    await dame.ev('CB.until(() => Player.body.grounded, 4000)');
  }
  const tried = rows.filter((r) => r.flew);
  const ok = tried.length > 0 && tried.every((r) => r.outAfterS != null && r.outAfterS <= 5);
  return { ok, rows, notes: 'setup: stage 6 set by the host, the dame placed on the apron; aim, throw: real input; no Space after' };
});
