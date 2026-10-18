// tr_dD « La Dame de Carreau » (Galerie des Prismes; round 1: the dame guides, the valet's hands
// turn the mirrors): the table's world waits through the city, is unloaded at another épreuve
// and rebuilt identical. Then, with real input (Input.sim, tools/qa/campaign/lib.js; the presses
// are worked out from what the guide's screen shows: the beam traced through the mirrors, the
// golden target crystal — CourD.trace on the shared puzzle):
// - both walk into the gallery: the puzzle (stage 2) on both screens;
// - the guide presses E at a mirror: nothing (not her hands this round);
// - the valet turns a mirror (E): the mirror changes on both screens;
// - the valet pulls the lever with the beam off the target: a miss on both screens;
// - he turns the mirrors as the beam needs and pulls the lever: round 2 on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_d', 'CourD')}, ${meshes('CourD.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_dD', { world: 'cour_d', fp: FP, built: 'CourD.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, round: Story.S.x.round || 1, miss: Story.S.x.miss || 0, mir: Story.S.x.puz && Story.S.x.puz.mir }');
  const SOLVE = `const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1], st = (m) => (m.low ? 2 : m.a);
    const solve = (pz) => { const tc = pz.cry.find((c) => c.target); if (!tc) return null; let best = null;
      for (let k = 0; k < Math.pow(3, pz.mir.length); k++) { let v = k;
        const mir = pz.mir.map((m) => { const s = v % 3; v = Math.floor(v / 3); return { c: m.c, r: m.r, a: s === 2 ? 0 : s, low: s === 2 ? 1 : 0, s }; });
        if (!same(CourD.trace(pz.src, mir).exit, tc.slot)) continue;
        const presses = mir.map((m, i) => (m.s - st(pz.mir[i]) + 3) % 3), cost = presses.reduce((a, b) => a + b, 0);
        if (!best || cost < best.cost) best = { cost, presses }; }
      return best; };
    const press = async (i) => { const m = Story.S.x.puz.mir[i];
      await CB.go(CourD.P(CourD.cellX(m.c) + 1.3, 0, CourD.cellZ(m.r) - 0.2), { near: 0.35, ms: 25000 });
      CB.face(CourD.P(CourD.cellX(m.c), 1.3, CourD.cellZ(m.r)));
      const before = JSON.stringify(Story.S.x.puz.mir[i]); await CB.tap('interact');
      return CB.until(() => !Story.S.x.puz || JSON.stringify(Story.S.x.puz.mir[i]) !== before, 2500, 50); };
    const lever = async () => { await CB.go(CourD.P(CourD.LEVER_B[0], 0, CourD.LEVER_B[1] + 1.3), { near: 0.35, ms: 25000 });
      CB.face(CourD.P(CourD.LEVER_B[0], 1.2, CourD.LEVER_B[1])); await CB.sl(300); const n0 = Story.S.x.res ? Story.S.x.res.n : 0;
      for (let k = 0; k < 3; k++) { await CB.tap('interact'); if (await CB.until(() => Story.S.x.res && Story.S.x.res.n !== n0, 2500)) return true; }
      return false; };`;
  try {
    const side = (p) => (p === dame ? -1.2 : 1.2);
    await Promise.all([dame, valet].map((p) => p.ev(`CB.trek(CourD.P(${side(p)}, 0, 55), 0.5, 15000)`)));
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 2 && !!Story.S.x.puz', 10000))) return fail(`not in the gallery: ${JSON.stringify(await x(A))}`);
    covered.push('both walk into the gallery: the mirror puzzle on both screens');
    if ((await A.ev("(Story.S.x.round || 1) === 1 ? 'dame' : 'valet'")) !== 'dame') return fail('round 1 guide is not the dame');
    await sleep(1000);
    // the guide at a mirror: refused
    const s0 = await x(A);
    await dame.ev(`(async () => { ${SOLVE} await press(0); return 1; })()`);
    await sleep(600);
    if (JSON.stringify((await x(A)).mir) !== JSON.stringify(s0.mir)) return fail('the guide turned a mirror');
    covered.push(`${who(dame)} as guide presses E at a mirror: nothing`);
    await dame.ev('CB.go(CourD.P(3, 0, 56), { near: 0.8, ms: 15000 })');

    // ---- the hands: one turn, a wrong pull, then the solution ----
    const first = await valet.ev(`(async () => { ${SOLVE} const b = solve(Story.S.x.puz); const i = b && b.presses.findIndex((p) => p > 0);
      const k = i >= 0 ? i : 0; const ok = await press(k); return [k, ok, b ? b.cost : -1]; })()`);
    if (!first[1]) return fail(`the valet's E at mirror ${first[0]} did nothing`);
    const mA = await A.ev(`JSON.stringify(Story.S.x.puz.mir[${first[0]}])`);
    const mB = await B.ev(`JSON.stringify(Story.S.x.puz.mir[${first[0]}])`);
    if (mA !== mB || mA === JSON.stringify(s0.mir[first[0]])) return fail(`mirror ${first[0]}: ${mA} / ${mB}`);
    covered.push(`${who(valet)} as the hands turns mirror ${first[0]} (E): changed on both screens`);
    const cost = await valet.ev(`(() => { ${SOLVE} const b = solve(Story.S.x.puz); return b ? b.cost : -1; })()`);
    if (cost > 0) {
      const m0 = (await x(A)).miss;
      const lv = await valet.ev(`(async () => { ${SOLVE} return lever(); })()`);
      if (!(await untilBoth(A, B, `(Story.S.x.miss || 0) === ${m0 + 1} && Story.S.x.res.ok === 0`, 4000))) return fail(`lever pulled off target (${lv}): ${JSON.stringify(await x(A))}`);
      covered.push('the lever pulled with the beam off the target: a miss on both screens');
    } else notes.push('the first turn already solved it: no wrong pull');
    const done = await valet.ev(`(async () => { ${SOLVE} const t0 = performance.now();
      while (performance.now() - t0 < 120000 && Story.S.x.stage === 2 && (Story.S.x.round || 1) === 1) {
        const pz = Story.S.x.puz; if (!pz) { await CB.sl(300); continue; }
        const b = solve(pz); if (!b) { await CB.sl(1000); continue; }
        const i = b.presses.findIndex((p) => p > 0);
        if (i >= 0) { await press(i); await CB.sl(150); continue; }
        await lever(); await CB.sl(600);
      }
      return Story.S.x.round || 1; })()`);
    if (!(await untilBoth(A, B, '(Story.S.x.round || 1) === 2', 5000))) return fail(`not solved: round ${done}, ${JSON.stringify(await x(A))}`);
    covered.push('the hands turn the mirrors as the beam needs and pull the lever: round 2 on both screens');
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
