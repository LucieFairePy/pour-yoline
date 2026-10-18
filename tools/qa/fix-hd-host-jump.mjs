// tr_hD: a jump with the tower of coupes is a strike, whoever carries it. When the carrier was the
// host, its own jump was dropped: update() set local.jumpCd before c.act({ a: 'jump' }), and the
// host's action() read the same local.jumpCd (> 0) as its strike cooldown. Here the host carries
// (setup: the round whose carrier is the host's kit, the tower in hand), jumps (Space, real input):
// one strike on both screens; then the guest carries and jumps: one strike too.
//   node tools/qa/fix-hd-host-jump.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';
import { hands } from './play-kit.mjs';

const str = '(Story.S.x.str | 0)';
// the round whose carrier is `role` (round 0: the dame, round 1: the valet), tower in hand
const carry = (role) =>
  `Story.ctx.set((s) => { s.x.stage = 0; s.x.round = ${role === 'dame' ? 0 : 1}; s.x.carry = 1; s.x.str = 0; }); 1`;
const jump = async (p, sleep) => {
  await p.ev('CB.until(() => Player.body.grounded, 3000)');
  await sleep(1700); // past any earlier jump's cooldown
  await p.ev("CB.tap('jump', 120)");
};

run('hd-host-jump', async ({ A, B, go, sleep, log }) => {
  if (!(await go('tr_hD'))) return { ok: false, notes: 'tr_hD did not load' };
  await sleep(3000);
  await hands(A, B);
  const rows = {};
  for (const [name, p] of [['host', A], ['guest', B]]) {
    const role = await p.ev('Story.role');
    await A.ev(carry(role));
    await sleep(800);
    const ok0 = (await A.ev(`CourH.dbgD.carrierOf(Story.S.x) === ${JSON.stringify(role)} && Story.S.x.carry === 1`)) && (await B.ev('Story.S.x.carry === 1'));
    await jump(p, sleep);
    let a = 0;
    let b = 0;
    for (let i = 0; i < 12 && !(a === 1 && b === 1); i++) {
      await sleep(250);
      a = await A.ev(str);
      b = await B.ev(str);
    }
    rows[name] = { role, setup: ok0, strikeHost: a, strikeGuest: b };
    log(name, JSON.stringify(rows[name]));
  }
  const ok = Object.values(rows).every((r) => r.setup && r.strikeHost === 1 && r.strikeGuest === 1);
  return { ok, ...rows, notes: 'setup: round and tower in hand set by the host; the jumps are real input' };
});
