// city (the hub between épreuves): the city is never unloaded; after a level round trip it is the
// same (colliders, doors, benches, memory places) and the level's world is gone (Life.log). Then,
// with real input (Input.sim through tools/qa/campaign/lib.js, walking by the path finder):
// - the benches: the dame sits (E), the valet sits on the same bench and takes the other half,
//   each screen draws the partner seated; Space stands up, seen on the other screen;
// - a memory: E pressed far away does nothing; at the memory, E records it (S.seen on both
//   screens), its pillar goes out, the card opens and closes with Enter; the partner looks too;
// - the doors: the lit door (the next épreuve) does not open for one player alone; both at it:
//   both screens enter the épreuve.
// Setup labelled in notes: the save's done / seen are set (none done, then world 1 done) and the
// players are put at the plaza (as on a return from a level); restored at the end.
import { hands, kits, who as W, until, untilBoth, both, json, key, release } from '../play-kit.mjs';

export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: t });
  const save0 = await json(A, '{ done: Story.S.done, seen: Story.S.seen }');

  // ---- the city stays loaded through a level, the level's world goes ----
  // the city's own colliders (within 400 m of its centre: every world is built far away; a table
  // of the Cour may still be held through the city, Phys.count() would count it)
  const FP = "JSON.stringify([Phys.query(-400, -400, 400, 400).filter((b) => Math.abs(b.min[0]) < 400 && Math.abs(b.min[2]) < 400).length, City.benches.length, Object.keys(City.doors).length, Object.keys(City.places).length, !!City.roofBench])";
  const fp0 = await both(A, B, FP);
  const n0 = await both(A, B, 'Life.log.length');
  await go('tr_s1');
  await go('city');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev(`Life.log.slice(${n0[i]}).some((r) => r.world === 'tr_s1')`);
    const fp = await p.ev(FP);
    if (!un || fp !== fp0[i]) return fail(`${who(p)}: tr_s1 unloaded ${un}, city ${fp} vs ${fp0[i]}`);
  }
  covered.push(`city kept through a level (same colliders, doors, benches ${fp0[0]}), tr_s1 unloaded (both)`);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  await A.ev("Story.ctx.set((s) => { s.done = []; s.seen = []; s.chapter = 0; }); 1");
  for (const p of [A, B]) await p.ev('Story.ctx.spawn(City.hubSpawn[Story.role], Math.PI); 1');
  notes.push('setup: save set to no épreuve done, both put at the plaza');
  await sleep(1000);

  try {
    // ---- the benches (the plaza bench at 0,0,9.6) ----
    const BENCH = 'City.benches[0]';
    const sit = async (p) => {
      await p.ev(`CB.go(V3(${BENCH}.pos.x + (Story.role === 'dame' ? -0.6 : 0.6), 0, ${BENCH}.pos.z + 1.3 * Math.sign(Math.cos(${BENCH}.yaw))), { near: 0.5, ms: 15000 })`);
      for (let i = 0; i < 5 && (await p.ev('Player.mode')) !== 'sit'; i++) {
        await p.ev("CB.tap('interact')");
        await sleep(300);
      }
      return p.ev("Player.mode === 'sit'");
    };
    if (!(await sit(dame))) return fail(`${who(dame)} could not sit on the plaza bench: ${await dame.ev('JSON.stringify([Player.mode, CB.where()])')}`);
    const seen = (p) => p.ev(`JSON.stringify({ mode: Remote.state.mode, onBench: !!Benches.sitting(Remote.pos, Remote.state.mode) })`).then(JSON.parse);
    if (!(await until(valet, "Remote.state.mode === 'sit'", 4000))) return fail(`${who(valet)} does not see the dame seated: ${JSON.stringify(await seen(valet))}`);
    covered.push(`bench: ${who(dame)} as dame sits (E), seated on the partner's screen`);
    if (!(await sit(valet))) return fail(`${who(valet)} could not sit: ${await valet.ev('JSON.stringify([Player.mode, CB.where()])')}`);
    await sleep(800);
    const pd = await json(dame, 'Player.body.p.toArray()');
    const pv = await json(valet, 'Player.body.p.toArray()');
    const gap = Math.hypot(pd[0] - pv[0], pd[2] - pv[2]);
    const sa = await seen(dame);
    if (!(gap > 0.6 && gap < 1.1) || !sa.onBench || sa.mode !== 'sit') return fail(`two on the bench: gap ${gap.toFixed(2)} m, dame sees ${JSON.stringify(sa)}`);
    covered.push(`bench: ${who(valet)} as valet sits on the other half (${gap.toFixed(2)} m apart), both seated on both screens`);
    await valet.ev("CB.tap('jump')");
    await sleep(600);
    if ((await valet.ev('Player.mode')) !== 'walk' || !(await until(dame, "Remote.state.mode !== 'sit'", 4000)))
      return fail('Space did not stand the valet up on both screens');
    await dame.ev("CB.tap('jump')");
    await sleep(600);
    if ((await dame.ev('Player.mode')) !== 'walk') return fail('the dame did not stand up');
    covered.push('bench: Space stands up, seen on the other screen');

    // ---- a memory: world 1 done, its memory (message) comes back in the city ----
    await A.ev("Story.ctx.set((s) => { s.done = Trials.list.filter((t) => t.world === 1).map((t) => t.id); s.seen = []; s.chapter = s.done.length; }); 1");
    notes.push('setup: world 1 marked done (its memory comes back)');
    const place = await A.ev('Lore.completed(Story.S.done).map((w) => w.memory).pop()');
    const shown = `City.places[${JSON.stringify(place)}].shown && City.places[${JSON.stringify(place)}].pillar.userData.on`;
    if (!(await untilBoth(A, B, shown, 6000))) return fail(`memory ${place} not shown with its pillar on both screens`);
    covered.push(`memory ${place} shown, pillar lit on both screens`);
    const E = `City.places[${JSON.stringify(place)}].entry`;
    // E far from it (10 m): nothing
    await dame.ev(`CB.go(V3(${E}.x + 6, 0, ${E}.z + 8), { near: 1, ms: 30000 })`);
    await dame.ev("CB.tap('interact')");
    await sleep(800);
    if ((await A.ev(`Story.S.seen.includes(${JSON.stringify(place)})`)) || !(await dame.ev(`$('memory').hidden`)))
      return fail('E pressed 10 m away recorded the memory');
    covered.push('E 10 m away from the memory: refused');
    const look = async (p) => {
      await p.ev(`CB.go(V3(${E}.x, 0, ${E}.z), { near: 1.5, ms: 40000 })`);
      await sleep(300);
      await p.ev("CB.tap('interact')");
      return until(p, "!$('memory').hidden", 3000);
    };
    if (!(await look(dame))) return fail(`${who(dame)}: E at the memory did not open its card ${await dame.ev('JSON.stringify(CB.where())')}`);
    if (!(await untilBoth(A, B, `Story.S.seen.includes(${JSON.stringify(place)})`, 4000))) return fail('the memory was not recorded on both screens');
    if (await dame.ev(`City.places[${JSON.stringify(place)}].pillar.userData.on`)) return fail('the pillar stayed lit for the one who looked');
    await sleep(1500);
    await key(dame, 'Enter');
    if (!(await until(dame, "$('memory').hidden", 4000))) return fail('Enter did not close the memory card');
    covered.push(`memory looked at by ${who(dame)} (E): recorded on both screens, pillar out, card closed with Enter`);
    if (!(await look(valet))) return fail(`${who(valet)}: E at the memory did not open its card`);
    await sleep(1500);
    await key(valet, 'Enter');
    if (!(await until(valet, `$('memory').hidden && !City.places[${JSON.stringify(place)}].pillar.userData.on`, 4000)))
      return fail('the partner: card not closed or pillar still lit');
    covered.push(`memory looked at by ${who(valet)} too: card, pillar out on that screen`);

    // ---- the doors: the lit one (the next épreuve) needs both players ----
    const next = await json(A, 'Trials.next(Story.S.done)');
    const door = `City.doors[${JSON.stringify(next.door || next.id)}]`;
    if (!(await untilBoth(A, B, `!!${door} && ${door}.target === 1`, 4000))) return fail(`the door of ${next.phase} is not lit on both screens`);
    const at = (p, s) => p.ev(`CB.go(V3(${door}.entry.x + ${s}, 0, ${door}.entry.z), { near: 1.2, ms: 60000 })`);
    if (!(await at(dame, -1))) return fail(`${who(dame)} did not reach the door ${await dame.ev('JSON.stringify(CB.where())')}`);
    await sleep(2500);
    if ((await A.ev('Story.S.phase')) !== 'city') return fail('the door opened for one player alone');
    covered.push(`door of ${next.phase} (${next.title}) lit on both screens, refused to ${who(dame)} alone`);
    if (!(await at(valet, 1))) return fail(`${who(valet)} did not reach the door`);
    if (!(await untilBoth(A, B, `Story.S.phase === ${JSON.stringify(next.phase)}`, 8000))) return fail(`both at the door: not in ${next.phase} on both screens`);
    covered.push(`both walked to the door: ${next.phase} entered on both screens`);
  } finally {
    await release(A, B);
    await go('city');
    await A.ev(`Story.ctx.set((s) => { s.done = ${JSON.stringify(save0.done)}; s.seen = ${JSON.stringify(save0.seen)}; s.chapter = s.done.length; }); 1`);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
