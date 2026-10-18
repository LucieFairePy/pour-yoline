// tr_sV « Le Valet de Pique » (Galerie des râteliers, table of spades; kits swapped: Yoline plays
// the valet): the table's world waits through the city, is unloaded at another épreuve and
// rebuilt identical. Then, with real input (Input.sim, tools/qa/campaign/lib.js):
// - the valet (low lane) jumps the pillars 0 to 3 (run + jump + double jump): his first
//   checkpoint on both screens;
// - the dame (high lane) climbs the stairs, aims at ring 0 and grapples it (F): her first
//   checkpoint on both screens;
// - she holds E on the winch: the portcullis rises on both screens; the valet walks under it:
//   his next checkpoint on both screens;
// - a strike on the target shield sent from the dame's page (as the level would) is refused (the
//   sword's); the valet strikes it (E): the drawbridge comes down on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_s', 'CourS')}, ${meshes('CourS.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_sV', { world: 'cour_s', fp: FP, built: 'CourS.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  for (const p of [A, B]) await p.ev('CB.W = CourS; 1');
  const x = (p) => json(p, '{ cpV: Story.S.x.cpV, cpD: Story.S.x.cpD, herse: Story.S.x.herse, br: Story.S.x.br }');
  const PADS = `const A5 = CourS.A, q = () => CourS.rel(Player.body.p);
    const padOf = (p) => { for (let i = 0; i < A5.pads.length; i++) { const [x, z, w, d, top] = A5.pads[i];
      if (Math.abs(p.x - x) < w / 2 + 0.3 && Math.abs(p.z - z) < d / 2 + 0.3 && Math.abs(p.y - top) < 0.6) return i; } return -1; };
    const padP = (i) => [A5.pads[i][0], A5.pads[i][4], A5.pads[i][1]];
    const settle = async () => { await CB.until(() => Player.body.grounded && q().y > -1, 9000, 50); await CB.sl(500); };
    const hopTo = async (to) => { await CB.leap(padP(to), { ms: 2600 }); await CB.sl(250); if (padOf(q()) === to) return true; if (q().y < -1.5 || padOf(q()) < 0) await settle(); return false; };`;
  try {
    // ---- the valet: pillars 0 to 3 ----
    const pillars = valet.ev(`(async () => { ${PADS}
      for (let g = 0; g < 16 && Story.S.x.cpV < 1; g++) { const h = padOf(q());
        if (h < 0) { await CB.walk(CourS.P(-6.5, 0, 10), 0.4, 10000); await hopTo(0); continue; }
        if (h < 3) await hopTo(h + 1); else await CB.sl(300); }
      return Story.S.x.cpV; })()`);
    // ---- the dame: stairs, ring 0 ----
    const ring = dame.ev(`(async () => { const A5 = CourS.A;
      await CB.walk(CourS.P(6.8, 0, 3.5), 0.4, 8000); await CB.trek(CourS.P(6.8, A5.HY, 14.5), 0.4, 12000);
      window.__gr = 0; const t = setInterval(() => { if (Player.mode === 'grapple') __gr = 1; }, 20);
      for (let k = 0; k < 12 && Story.S.x.cpD < 1; k++) { CB.aim(CourS.ringPos(0)); await CB.sl(200);
        if (Player.lockTarget === 0) { await CB.tap('ability'); await CB.until(() => Player.mode === 'walk' && Player.body.grounded, 6000); await CB.sl(400); } }
      clearInterval(t); return [Story.S.x.cpD, __gr]; })()`);
    const [cv, cd] = await Promise.all([pillars, ring]);
    if (!(await untilBoth(A, B, 'Story.S.x.cpV >= 1', 3000))) return fail(`the valet's pillars: cpV ${cv} ${await valet.ev('JSON.stringify(CB.rel())')}`);
    covered.push(`${who(valet)} as valet jumps the pillars 0 to 3 (run, jump, double jump): checkpoint on both screens`);
    if (!cd[1] || !(await untilBoth(A, B, 'Story.S.x.cpD >= 1', 3000))) return fail(`the dame's ring: ${JSON.stringify(cd)} ${await dame.ev('JSON.stringify(CB.rel())')}`);
    covered.push(`${who(dame)} as dame climbs the stairs and grapples ring 0 (aim, F): checkpoint on both screens`);

    // ---- the winch and the portcullis ----
    const winch = dame.ev(`(async () => { const A5 = CourS.A; await CB.trek(CourS.P(A5.winch[0][0] + 0.9, A5.HY, A5.winch[0][1]), 0.3, 8000);
      Input.sim.held.add('interact'); await CB.until(() => Story.S.x.cpV >= 2, 40000, 100); Input.sim.held.delete('interact'); return Story.S.x.cpV; })()`);
    const under = valet.ev(`(async () => { const hz = CourS.A.herse[0]; await CB.walk(CourS.P(-6.5, 1.2, hz - 1.1), 0.35, 8000);
      const up = await CB.until(() => Story.S.x.herse[0] === 1 && CourS.herseK(0) > 0.9, 30000, 50);
      await CB.walk(CourS.P(-6.5, 1.2, hz + 2.7), 0.5, 6000, true); return up; })()`);
    const upSeen = await untilBoth(A, B, 'Story.S.x.herse[0] === 1 && CourS.herseK(0) > 0.5', 20000);
    const [w1, u1] = await Promise.all([winch, under]);
    if (!upSeen) return fail(`the portcullis did not rise on both screens: ${JSON.stringify(await x(A))}`);
    if (!(await untilBoth(A, B, 'Story.S.x.cpV >= 2', 3000))) return fail(`under the portcullis: ${JSON.stringify([w1, u1, await x(A)])}`);
    covered.push('the dame holds E on the winch: the portcullis rises on both screens; the valet walks under it: checkpoint on both screens');

    // ---- the target shield: the sword's only ----
    const s0 = await x(A);
    await dame.ev("Story.ctx.act({ a: 'strike', i: 0 }); 1");
    await sleep(700);
    if (JSON.stringify((await x(A)).br) !== JSON.stringify(s0.br)) return fail('the dame struck the target');
    covered.push("a strike on the shield from the dame's page (the level's action) refused");
    await valet.ev(`(async () => { const A5 = CourS.A; await CB.walk(CourS.P(-9.4, 1.2, A5.target[0][1]), 0.35, 8000); CB.face([A5.target[0][0], 2.5, A5.target[0][1]]); await CB.tap('interact'); return 1; })()`);
    if (!(await untilBoth(A, B, 'Story.S.x.br[0] === 1', 3000))) return fail(`the valet's strike: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(valet)} strikes the shield (E): the drawbridge comes down on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
