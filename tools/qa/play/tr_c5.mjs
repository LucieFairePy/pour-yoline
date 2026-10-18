// tr_c5 « La Bombe à cœurs II » (dame = defuser at stage 1, valet = the manual): the world is
// unloaded in the city and rebuilt identical on both pages. Then, with real input (Input.sim,
// tools/qa/campaign/lib.js; the module answers come from the manual's rules, C5.RULES, which the
// reader reads out from his screen):
// - the dame walks through the van door to the bomb: the van seals (both screens), the bomb's
//   clock runs; the valet opens the manual at the lectern (E) and closes it (Space);
// - a module action sent from the valet's page (as the level would) is refused: not the defuser;
// - the dame examines a module (E), works it wrongly once: a strike on both screens; then as the
//   manual says: the module defused on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuild, owned, meshes, obj3d } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  // the world's meshes but the bomb's module faces (dealt anew with each game: S.x.mods); the
  // colliders differ by page (the van door lets only the dame through)
  const FP = `JSON.stringify([${owned('tr_c5', 'C5')}, ${meshes('C5.books[1].g')}[0] - C5.slots.reduce((n, s) => { let k = 0; s.pivot.traverse((o) => (o.isMesh || o.isSprite) && k++); return n + k; }, 0), C5.slots.length, Object.keys(C5.books).length, C5.valves.length])`;
  const rb = await rebuild(ctx, 'tr_c5', { world: 'tr_c5', fp: FP, built: 'C5.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const mods = (p) => json(p, '{ strikes: Story.S.x.strikes || 0, mods: Story.S.x.mods[0] }');
  // one arrow push (the level reads the stick as arrows) and the page-side rules
  const LIB = `const push = async (d) => { Input.sim.x = d === 'r' ? 1 : d === 'l' ? -1 : 0; Input.sim.z = d === 'u' ? 1 : d === 'd' ? -1 : 0; await CB.sl(120); Input.sim.x = 0; Input.sim.z = 0; await CB.sl(120); };
    const R5 = C5.RULES, X = () => Story.S.x, sel = () => C5.dbg.sel;
    const changed = async (i, before) => CB.until(() => JSON.stringify(X().mods[0][i]) !== before, 1500, 40);`;
  try {
    // ---- the dame to the bomb, the van seals; the valet at the lectern ----
    const toBomb = dame.ev(`(async () => { await CB.go(C5.P(0, 0, 25.5), { near: 0.5, ms: 30000 }); return CB.go(C5.P(0.75, 0, C5.BOMB_Z[1] - 1.5), { near: 0.3, ms: 30000 }); })()`);
    const book = valet.ev(`(async () => { ${LIB}
      await CB.go(C5.P(0, 0, 15 - 0.9), { near: 0.35, ms: 40000 });
      await CB.tap('interact');
      const open = await CB.until(() => C5.dbg.read, 1500, 40);
      await CB.sl(1200); await push('r'); await CB.sl(800);
      await CB.tap('jump');
      const shut = await CB.until(() => !C5.dbg.read, 1500, 40);
      return [open, shut]; })()`);
    const [, rd] = await Promise.all([toBomb, book]);
    if (!(await untilBoth(A, B, 'Story.S.x.seal1 === true', 10000))) return fail(`the van did not seal: dame at ${await dame.ev('JSON.stringify(C5.rel(Player.body.p))')}`);
    covered.push(`${who(dame)} as dame walks through the van door to the bomb: the van sealed on both screens`);
    if (!rd[0] || !rd[1]) return fail(`manual at the lectern: opened ${rd[0]}, closed ${rd[1]}`);
    covered.push(`${who(valet)} as valet opens the manual at the lectern (E), turns a page, closes it (Space)`);

    // ---- pick a module the test can get wrong on purpose ----
    const m0 = await mods(A);
    const i = m0.mods.findIndex((m) => !m.solved && m.k !== 'maze');
    if (i < 0) return fail(`no module to work: ${JSON.stringify(m0)}`);
    const k = m0.mods[i].k;
    // the valet's page sends a module action: refused (he does not hold the bomb)
    const wrongAct = { wires: 'cut', keys: 'key', simon: 'simon', memo: 'memo', dial: 'dialok' }[k];
    await valet.ev(`Story.ctx.act({ a: ${JSON.stringify(wrongAct)}, f: 0, i: ${i}, n: 0 }); 1`);
    await sleep(800);
    if (JSON.stringify(await mods(A)) !== JSON.stringify(m0)) return fail(`a module action from the valet was taken: ${JSON.stringify(await mods(A))}`);
    covered.push(`module action from ${who(valet)} as valet refused (not the defuser)`);

    // ---- the dame examines module i (E), one wrong move: a strike ----
    const focus = await dame.ev(`(async () => { const z = C5.BOMB_Z[1] - 1.5, sx = [0.75, 0, -0.75][${i}];
      for (let k = 0; k < 4 && C5.dbg.focus !== ${i}; k++) {
        await CB.until(() => !C5.dbg.moving, 15000, 100);
        await CB.walk(C5.P(sx, 0, z), 0.15, 4000);
        await CB.sl(200); await CB.tap('interact');
        await CB.until(() => C5.dbg.focus === ${i}, 1500, 40);
      }
      return C5.dbg.focus; })()`);
    if (focus !== i) return fail(`the dame could not examine module ${i} (focus ${focus})`);
    const wrong = await dame.ev(`(async () => { ${LIB}
      const m = X().mods[0][${i}], before = JSON.stringify(m);
      if (m.k === 'wires') { const t = R5.wireAnswer(m.w, X().serial); let w = 0; while (w === t || m.cut.includes(w)) w++;
        for (let n = 0; n < 8 && sel() !== w; n++) await push(sel() < w ? 'd' : 'u'); await CB.tap('interact'); }
      else if (m.k === 'keys') { const t = R5.keyOrder(m)[m.pressed.length]; const w = [0, 1, 2, 3].find((n) => n !== t && !m.pressed.includes(n));
        if ((sel() ^ w) & 1) await push('r'); if ((sel() ^ w) & 2) await push('d'); await CB.tap('interact'); }
      else if (m.k === 'simon') { const n = R5.simonWant(m, X().serial, X().strikes || 0)[m.input.length]; await push(['u', 'r', 'd', 'l'][(n + 1) % 4]); }
      else if (m.k === 'memo') { const t = R5.memoWant(m), w = t > 0 ? t - 1 : t + 1; for (let n = 0; n < 6 && sel() !== w; n++) await push(sel() < w ? 'r' : 'l'); await CB.tap('interact'); }
      else if (m.k === 'dial') { if (R5.dialOk(m)) { await push('r'); await changed(${i}, before); } await CB.tap('interact'); }
      await CB.until(() => (X().strikes || 0) > 0, 2000, 40);
      return m.k; })()`);
    if (!(await untilBoth(A, B, '(Story.S.x.strikes || 0) === 1', 4000))) return fail(`wrong move on ${wrong}: no strike on both screens ${JSON.stringify(await both(A, B, 'Story.S.x.strikes'))}`);
    covered.push(`${who(dame)} as dame examines module ${i} (${k}, E) and works it wrongly: a strike on both screens`);

    // ---- then as the manual says ----
    const ok = await dame.ev(`(async () => { ${LIB}
      for (let guard = 0; guard < 50; guard++) {
        const m = X().mods[0][${i}];
        if (!m || m.solved || C5.dbg.focus !== ${i}) break;
        const before = JSON.stringify(m);
        if (m.k === 'wires') { const t = R5.wireAnswer(m.w, X().serial); for (let n = 0; n < 8 && sel() !== t; n++) await push(sel() < t ? 'd' : 'u'); await CB.tap('interact'); }
        else if (m.k === 'keys') { const t = R5.keyOrder(m)[m.pressed.length]; if ((sel() ^ t) & 1) await push('r'); if ((sel() ^ t) & 2) await push('d'); await CB.tap('interact'); }
        else if (m.k === 'simon') { const n = R5.simonWant(m, X().serial, X().strikes || 0)[m.input.length]; await push(['u', 'r', 'd', 'l'][n]); }
        else if (m.k === 'memo') { const t = R5.memoWant(m); for (let n = 0; n < 6 && sel() !== t; n++) await push(sel() < t ? 'r' : 'l'); await CB.tap('interact'); }
        else if (m.k === 'dial') { if (R5.dialOk(m)) await CB.tap('interact'); else await push('r'); }
        await changed(${i}, before);
      }
      return !!X().mods[0][${i}].solved; })()`);
    if (!ok || !(await untilBoth(A, B, `Story.S.x.mods[0][${i}].solved === true || !!Story.S.x.mods[0][${i}].solved`, 4000)))
      return fail(`module ${i} (${k}) not defused on both screens: ${JSON.stringify(await mods(A))}`);
    covered.push(`module ${i} (${k}) worked as the manual says: defused on both screens`);
    // let go of the module
    await until(dame, 'C5.dbg.focus !== ' + i, 2000);
    if ((await dame.ev('C5.dbg.focus')) === i) await dame.ev("CB.tap('jump')");
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
