// Le Valet de Pique (tr_sV): the swinging maces and the pistons move on a clock shared by both
// screens. Before the fix each page drove them from its own clock (seconds since that page
// loaded), so after a reload, or simply with pages opened at different times, a mace or a piston
// was not at the same place on the two screens. Here the guest reloads in the level (its page
// clock restarts), then the time each page gives the world (CourS.update) is read on both at
// once: it must be the same within a frame or two, and so must the pistons' heights.
//   node tools/qa/fix-svclock.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

const BUILT = "Story.S.phase === 'tr_sV' && CourS.built";
// what the world is given each frame, with the moment it was given (Date.now is the same clock
// in both pages of this Chrome)
const HOOK = `(() => {
  if (!CourS.__fixT) {
    const u = CourS.update;
    CourS.update = (dt, t, p) => {
      window.__fixT = [t, Date.now()];
      return u(dt, t, p);
    };
    CourS.__fixT = 1;
  }
  return 1;
})()`;

run('svclock', async ({ A, B, go, reload, sleep, log }) => {
  if (!(await go('tr_sV')) || !(await A.until(BUILT)) || !(await B.until(BUILT))) return { ok: false, notes: 'tr_sV did not load' };
  await sleep(4000);
  // the guest reloads: its page clock starts again from zero
  await reload(B);
  if (!(await B.until(BUILT, 30000))) return { ok: false, notes: 'the guest did not come back in tr_sV' };
  await sleep(5000);
  await A.ev(HOOK);
  await B.ev(HOOK);
  await sleep(1000);
  const roles = [await A.ev('Story.role'), await B.ev('Story.role')];
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const q = 'JSON.stringify([...window.__fixT, CourS.pistonTop(0, window.__fixT[0]), CourS.pistonTop(1, window.__fixT[0])])';
    const [a, b] = (await Promise.all([A.ev(q), B.ev(q)])).map(JSON.parse);
    // both times brought to the same instant
    const off = a[0] - a[1] / 1000 - (b[0] - b[1] / 1000);
    rows.push({ offsetS: +off.toFixed(3), tA: +a[0].toFixed(2), tB: +b[0].toFixed(2), pistonA: +a[2].toFixed(2), pistonB: +b[2].toFixed(2) });
    await sleep(700);
  }
  const worst = Math.max(...rows.map((r) => Math.abs(r.offsetS)));
  log('kits', roles.join('/'), 'worst offset', worst, JSON.stringify(rows));
  return {
    ok: worst < 0.15,
    worstOffsetS: worst,
    kits: { A: roles[0], B: roles[1] },
    rows,
    notes: worst < 0.15 ? 'maces and pistons on the same clock on both screens' : `the two screens are ${worst.toFixed(2)} s apart`,
  };
});
