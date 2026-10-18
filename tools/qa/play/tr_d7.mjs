// tr_d7 « Le Temps » (part 1, the dial; dame = walker, valet = crank): the world is unloaded in the
// city and rebuilt identical on both pages. Then, with real input (Input.sim, tools/qa/campaign/
// lib.js; the clock is read from the level's own test hook window.__d7, what the screens show):
// - the dame at the crank holds E 2 s: the minute hand does not move (crank refused to her), and
//   the direction flip sent from her page (as the level would) is refused by the host;
// - the valet at the crank holds E: the minute hand turns on both screens and settles at the same
//   minute on both; F flips the crank's direction on both screens; holding E again turns it back.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuild, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('tr_d7', 'TrD7')}, ${meshes('TrD7.screen && TrD7.screen.mesh')}, TrD7.DISCS.length, TrD7.ROMAN.length])`;
  const rb = await rebuild(ctx, 'tr_d7', { world: 'tr_d7', fp: FP, built: 'TrD7.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  for (const p of [A, B]) await p.ev('window.__test = 1; 1');
  await sleep(500);
  const m = () => both(A, B, '+(window.__d7 && window.__d7.m || 0).toFixed(2)');
  // up the pulpit's stairs (they climb toward +z along its west side) to the crank
  const toCrank = (p) =>
    p.ev(`(async () => { const c = TrD7.CRANK_SPOT, q = TrD7.rel(Player.body.p);
      if (q.y < c.y - 1) { await CB.go(TrD7.P(-5.1, 0, -5.2), { near: 0.4, ms: 40000 }); await CB.trek(TrD7.P(-5.1, c.y, 3.0), 0.4, 15000); }
      await CB.trek(TrD7.P(c.x, c.y, c.z), 0.3, 6000); return TrD7.nearCrank(TrD7.rel(Player.body.p)); })()`);
  const holdE = (p, ms) => p.ev(`(async () => { Input.sim.held.add('interact'); await CB.sl(${ms}); Input.sim.held.delete('interact'); return 1; })()`);
  const still = '!!window.__d7 && Math.abs(window.__d7.mv || 0) < 0.01';
  try {
    // ---- the dame at the crank ----
    if (!(await toCrank(dame))) return fail(`${who(dame)} did not reach the crank ${await dame.ev('JSON.stringify(TrD7.rel(Player.body.p))')}`);
    const m0 = await m();
    const d0 = await A.ev('Story.S.x.s1.dir');
    await holdE(dame, 2000);
    await dame.ev("CB.tap('ability')");
    await dame.ev("Story.ctx.act({ a: 'dir' }); 1");
    await sleep(1000);
    const m1 = await m();
    const dd = await both(A, B, 'Story.S.x.s1.dir');
    if (Math.abs(m1[0] - m0[0]) > 0.05 || dd.some((v) => v !== d0)) return fail(`the dame turned the crank: minute ${JSON.stringify([m0, m1])}, dir ${JSON.stringify([d0, dd])}`);
    covered.push(`${who(dame)} as dame at the crank: E held 2 s and F do nothing, the flip from her page refused (minute ${m1[0]})`);
    await dame.ev('CB.walk(TrD7.P(-5.1, TrD7.CRANK_SPOT.y, 3.4), 0.4, 4000)');

    // ---- the valet at the crank ----
    if (!(await toCrank(valet))) return fail(`${who(valet)} did not reach the crank`);
    await holdE(valet, 1500);
    await untilBoth(A, B, still, 6000);
    await sleep(1200);
    const m2 = await m();
    const turned = m2[0] - m1[0];
    if (Math.abs(turned) < 1 || Math.abs(m2[0] - m2[1]) > 0.3) return fail(`the valet's crank: minute ${JSON.stringify([m1, m2])}`);
    covered.push(`${who(valet)} as valet holds E on the crank: the minute hand turns ${turned.toFixed(1)} min, the same on both screens (${m2[0]})`);
    await valet.ev("CB.tap('ability')");
    if (!(await untilBoth(A, B, `Story.S.x.s1.dir === ${-d0}`, 3000))) return fail(`F at the crank: direction ${JSON.stringify(await both(A, B, 'Story.S.x.s1.dir'))}`);
    covered.push('F at the crank: the direction flipped on both screens');
    await holdE(valet, 1500);
    await untilBoth(A, B, still, 6000);
    await sleep(1200);
    const m3 = await m();
    const back = m3[0] - m2[0];
    if (Math.sign(back) === Math.sign(turned) || Math.abs(back) < 1 || Math.abs(m3[0] - m3[1]) > 0.3) return fail(`after the flip: minute ${JSON.stringify([m2, m3])}`);
    covered.push(`E held again: the hand turns the other way ${back.toFixed(1)} min, the same on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
