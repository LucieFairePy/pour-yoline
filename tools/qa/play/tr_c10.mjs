// tr_c10 « La Tour de Babel »: the world is unloaded in the city and rebuilt identical on both
// pages. Then, with real input (Input.sim, tools/qa/campaign/lib.js; the answers come from the
// level's own puzzle, C10.dbg.puzzle(), the one that draws both screens):
// - floor 0, the gate levers (the valet's): the dame at a lever presses E: nothing (and the same
//   pull sent as the level would is refused by the host: not her kit); the valet pulls a wrong
//   lever: lightning and the lock on both screens, the puzzle re-rolled; then the right lever
//   twice: the gate opens on both screens (state and the world's gate);
// - both walk up the north stairs to floor 1: the host moves to the bells (stage 1) on both;
// - floor 1, the bells (0-2 the dame's, 3-5 the valet's): a bell rung by the wrong player is
//   refused; the right bell by its owner: the sequence moves on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuild, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('tr_c10', 'C10')}, ${meshes('C10.screen.mesh')}])`;
  const rb = await rebuild(ctx, 'tr_c10', { world: 'tr_c10', fp: FP, built: 'C10.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, round: Story.S.x.round, roll: Story.S.x.roll, rung: Story.S.x.rung, solved: Story.S.x.solved }');
  const xs = async () => [await x(A), await x(B)];
  const walk = (p, pts) => p.ev(`(async () => { for (const q of ${JSON.stringify(pts)}) if (!(await CB.trek(C10.P(q[0], q[1], q[2]), 0.45, 12000))) return false; return true; })()`);
  const unlocked = () => untilBoth(A, B, 'C10.dbg.local.lockT <= 0', 8000);
  try {
    // ---- floor 0: the levers ----
    await walk(valet, [[3, 0, -20]]);
    await walk(dame, [[-3, 0, -20]]);
    const t = await A.ev('C10.dbg.puzzle().t');
    const wrong = (t + 1) % 6;
    const at = (p, i) => p.ev(`(async () => { const l = C10.rel(C10.leverPos(${i})); const ok = await CB.walk(C10.P(l.x, 0, l.z + 0.2), 0.35, 10000); Cam.yaw = 0; return ok; })()`);
    await at(dame, wrong);
    const s0 = await xs();
    await dame.ev("CB.tap('interact', 110)");
    await dame.ev(`Story.ctx.act({ a: 'lev0', i: ${t} }); 1`);
    await sleep(1000);
    if (JSON.stringify(await xs()) !== JSON.stringify(s0)) return fail(`the dame pulled a lever: ${JSON.stringify(await xs())}`);
    covered.push(`lever refused to ${who(dame)} as dame (E, and the level's pull from her page)`);
    await walk(dame, [[-3, 0, -20]]);

    if (!(await at(valet, wrong))) return fail(`${who(valet)} did not reach lever ${wrong}`);
    await valet.ev("CB.tap('interact', 110)");
    if (!(await untilBoth(A, B, `Story.S.x.roll === ${s0[0].roll + 1} && Story.S.x.round === 0 && C10.dbg.local.lockT > 0`, 4000)))
      return fail(`wrong lever: ${JSON.stringify(await xs())}, lock ${JSON.stringify(await both(A, B, 'C10.dbg.local.lockT'))}`);
    covered.push(`wrong lever pulled by ${who(valet)} as valet: lightning and lock on both screens, puzzle re-rolled`);
    for (const round of [1, 2]) {
      if (!(await unlocked())) return fail('the lock did not end');
      const r = await A.ev('C10.dbg.puzzle().t');
      if (!(await at(valet, r))) return fail(`${who(valet)} did not reach lever ${r}`);
      await valet.ev("CB.tap('interact', 110)");
      const want = round === 1 ? 'Story.S.x.round === 1' : 'Story.S.x.solved === 1 && C10.ST.gate0 === 1';
      if (!(await untilBoth(A, B, want, 4000))) return fail(`right lever ${r} (round ${round}): ${JSON.stringify(await xs())}`);
      await sleep(600);
    }
    covered.push(`right lever twice by ${who(valet)}: floor solved, the gate opens on both screens`);

    // ---- up to floor 1 (north stairs), both: stage 1 ----
    const up = (p, s) => walk(p, [[s, 0, -12], [0, 0, -4], [-8.7, 0, 4.5], [-8.7, 0, 8.7], [-7.6, 0, 8.7], [5.8, 10, 8.7], [7.6, 10, 8.4], [s < 0 ? 5 : 7, 10, 5]]);
    const [u1, u2] = await Promise.all([up(dame, -1), up(valet, 1)]);
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 1', 8000)))
      return fail(`not on floor 1: walked ${u1} ${u2}, at ${await dame.ev('JSON.stringify(C10.rel(Player.body.p))')} / ${await valet.ev('JSON.stringify(C10.rel(Player.body.p))')}`);
    covered.push('both walked up the stairs to the bells: floor 1 on both screens');

    // ---- floor 1: the bells ----
    await unlocked();
    const ring = async (p, i) => {
      await p.ev(`(async () => { const b = C10.rel(C10.bellPos(${i})); return CB.walk(C10.P(b.x, 10, b.z), 0.4, 12000); })()`);
      await p.ev("CB.tap('interact', 110)");
      await sleep(900);
    };
    const seq0 = await A.ev('C10.dbg.puzzle().seq[Story.S.x.rung | 0]');
    // the valet at one of the dame's bells (not the next one)
    const notHis = [0, 1, 2].find((i) => i !== seq0);
    const b0 = await xs();
    await ring(valet, notHis);
    if (JSON.stringify(await xs()) !== JSON.stringify(b0)) return fail(`the valet rang the dame's bell ${notHis}: ${JSON.stringify(await xs())}`);
    covered.push(`bell ${notHis} (the dame's) refused to ${who(valet)} as valet`);
    const owner = seq0 < 3 ? dame : valet;
    await ring(owner, seq0);
    if (!(await untilBoth(A, B, 'Story.S.x.rung === 1', 4000))) return fail(`right bell ${seq0}: ${JSON.stringify(await xs())}`);
    covered.push(`right bell ${seq0} rung by its owner ${who(owner)}: the sequence moves on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
