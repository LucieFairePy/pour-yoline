// tr_dK « Le Roi de Carreau » (La Coupole, the code of gems): the table's world waits through the
// city, is unloaded at another épreuve and rebuilt identical. Then, with real input (Input.sim,
// tools/qa/campaign/lib.js; the guess is any code of four different gems, never the hidden one):
// - both walk into the dome: the guessing starts (stage 2) on both screens;
// - the valet presses E at slot I (the dame's): nothing;
// - each sets their own two slots (E cycles the gem): the gems on both screens;
// - the dame pulls her lever alone: ready, nothing weighed yet; the valet pulls his: the Roi
//   weighs the guess, one answer (gold / silver) in the history on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_d', 'CourD')}, ${meshes('CourD.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_dK', { world: 'cour_d', fp: FP, built: 'CourD.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, slots: Story.S.x.slots, ready: Story.S.x.ready || {}, hist: (Story.S.x.hist || []).length, res: Story.S.x.res || null }');
  const SET = `const setSlot = async (i, v) => { const s = CourD.SLOTS[i];
      await CB.go(CourD.P(s.x, 0, s.z - 1.3), { near: 0.35, ms: 20000 }); CB.face(CourD.P(s.x, 1.5, s.z)); await CB.sl(200);
      for (let k = 0; k < 7 && Story.S.x.slots[i] !== v; k++) { const b = Story.S.x.slots[i]; await CB.tap('interact'); await CB.until(() => Story.S.x.slots[i] !== b, 2000, 40); await CB.sl(120); }
      return Story.S.x.slots[i] === v; };
    const pull = async () => { const L = CourD.LEVERS_C[Story.role];
      await CB.go(CourD.P(L[0], 0, L[1] - 1.3), { near: 0.35, ms: 20000 }); CB.face(CourD.P(L[0], 1.2, L[1])); await CB.sl(200);
      const k0 = (Story.S.x.hist || []).length; await CB.tap('interact');
      return CB.until(() => (Story.S.x.ready || {})[Story.role] || (Story.S.x.hist || []).length !== k0, 2500, 50); };`;
  try {
    await Promise.all([dame, valet].map((p) => p.ev(`CB.trek(CourD.P(${p === dame ? 1.2 : -1.2}, 0, 96), 0.5, 15000)`)));
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 2', 10000))) return fail(`not in the dome: ${JSON.stringify(await x(A))}`);
    covered.push('both walk into the dome: the guessing starts on both screens');
    await sleep(800);
    const slots = await json(A, 'CourD.SLOTS.map((s) => [s.i, s.who])');
    const dSlot = slots.find((s) => s[1] === 'dame')[0];
    const s0 = await x(A);
    await valet.ev(`(async () => { ${SET} const s = CourD.SLOTS[${dSlot}]; await CB.go(CourD.P(s.x, 0, s.z - 1.3), { near: 0.35, ms: 20000 }); CB.face(CourD.P(s.x, 1.5, s.z)); await CB.sl(200); await CB.tap('interact'); await CB.sl(800); return 1; })()`);
    if (JSON.stringify((await x(A)).slots) !== JSON.stringify(s0.slots)) return fail(`the valet changed the dame's slot: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(valet)} as valet presses E at slot ${dSlot + 1} (the dame's): nothing`);
    // a guess of four different gems (0 1 2 3), each sets their own slots
    const guess = [0, 1, 2, 3];
    const set = (p) => p.ev(`(async () => { ${SET} const r = []; for (const s of CourD.SLOTS) if (s.who === Story.role && !(Story.S.x.reveal || []).some((v) => v[0] === s.i)) r.push(await setSlot(s.i, ${JSON.stringify(guess)}[s.i])); return r; })()`);
    const r = await Promise.all([set(dame), set(valet)]);
    if (!(await untilBoth(A, B, `JSON.stringify(Story.S.x.slots) === ${JSON.stringify(JSON.stringify(guess))}`, 4000))) return fail(`slots: ${JSON.stringify(r)} ${JSON.stringify(await x(A))}`);
    covered.push(`each sets their own slots (E cycles the gem): ${guess.join(' ')} on both screens`);
    await dame.ev(`(async () => { ${SET} return pull(); })()`);
    if (!(await untilBoth(A, B, '(Story.S.x.ready || {}).dame === 1 && (Story.S.x.hist || []).length === 0', 3000))) return fail(`the dame's lever: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(dame)} as dame pulls her lever alone: ready on both screens, nothing weighed`);
    await valet.ev(`(async () => { ${SET} return pull(); })()`);
    if (!(await untilBoth(A, B, '(Story.S.x.hist || []).length === 1 && !!Story.S.x.res', 4000))) return fail(`both levers: ${JSON.stringify(await x(A))}`);
    const res = await json(A, 'Story.S.x.res');
    covered.push(`${who(valet)} as valet pulls his: the Roi weighs the guess, gold ${res.b} / silver ${res.w} in the history on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
