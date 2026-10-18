// act3 « L'Heure dorée » (the city at golden hour, no world of its own): all with real input
// (Input.sim through tools/qa/campaign/lib.js, walking by the path finder):
// - the valet looks at memory p3 (E): found on both screens, its pillar out on both;
// - the lift refuses: both in the cabin with 1/3 memories, then the valet alone with 3/3 (the first
//   ride needs both on board) — the cabin stays down on both screens;
// - meanwhile the dame walks to p4 and p5 and looks at both (E);
// - both in the cabin: it rises, both reach the roof on both screens;
// - in the cabin, both press E (reach out a hand) within 2.5 s: hands held on both screens, E again lets go;
// - both walk to the roof bench and sit (E): the moment, on both screens, then act4 for both.
// Setup labelled in notes: both start at the plaza (as on a return from a level).
import { hands, kits, who as W, until, untilBoth, json, key, release } from '../play-kit.mjs';

export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  for (const p of [A, B]) await p.ev('Story.ctx.spawn(City.hubSpawn[Story.role], Math.PI); 1');
  notes.push('setup: both put at the plaza');
  await sleep(1000);
  const x = (p) => json(p, '{ found: Story.S.x.found, lift: Story.S.x.lift, hand: Story.S.x.hand, moment: Story.S.x.moment }');
  const closeCard = async (p) => {
    if (await until(p, "!$('memory').hidden", 3000)) {
      await sleep(1200);
      await key(p, 'Enter');
      await until(p, "$('memory').hidden", 3000);
    }
  };
  const look = async (p, id) => {
    const ok = await p.ev(`CB.go(V3(City.places.${id}.entry.x, 0, City.places.${id}.entry.z), { near: 1.4, ms: 90000 })`);
    await sleep(300);
    await p.ev("CB.tap('interact')");
    const got = await until(A, `Story.S.x.found.includes('${id}')`, 4000);
    await closeCard(p);
    return ok && got;
  };
  const L = 'City.LIFT';
  const cabin = (p) =>
    p.ev(`(async () => { const s = Story.role === 'dame' ? -0.9 : 0.9;
      await CB.go(V3(${L}.x + s, 0, ${L}.z + 4), { near: 0.8, ms: 90000 });
      await CB.until(() => Story.S.x.lift.y < 0.2, 20000);
      return CB.walk(V3(${L}.x + s, 0, ${L}.z + 0.3), 0.4, 8000); })()`);
  const onLift = (p) => p.ev(`City.onLift(Player.body.p, Story.S.x.lift.y)`);

  try {
    // ---- p3 by the valet ----
    if (!(await look(valet, 'p3'))) return fail(`${who(valet)} did not find p3 ${await valet.ev('JSON.stringify(CB.where())')}`);
    if (!(await untilBoth(A, B, "Story.S.x.found.includes('p3') && !City.places.p3.pillar.userData.on", 4000)))
      return fail('p3 not found / pillar not out on both screens');
    covered.push(`memory p3 looked at by ${who(valet)} as valet (E): found, pillar out on both screens`);

    // ---- the lift with 1/3: refused ----
    const [c1, c2] = await Promise.all([cabin(dame), cabin(valet)]);
    if (!c1 || !c2 || !(await onLift(dame)) || !(await onLift(valet))) return fail(`not both in the cabin: ${c1} ${c2}`);
    await sleep(3000);
    const r1 = [await x(A), await x(B)];
    if (r1.some((s) => s.lift.y > 0.2)) return fail(`the lift left with 1/3 memories: ${JSON.stringify(r1)}`);
    covered.push('both in the cabin with 1/3 memories: the lift stays down (both screens)');

    // ---- the dame finds p4 and p5; the valet waits alone in the cabin ----
    for (const id of ['p4', 'p5']) if (!(await look(dame, id))) return fail(`${who(dame)} did not find ${id} ${await dame.ev('JSON.stringify(CB.where())')}`);
    if (!(await untilBoth(A, B, 'Story.S.x.found.length === 3', 4000))) return fail('3/3 not on both screens');
    covered.push(`memories p4, p5 looked at by ${who(dame)} as dame (E): 3/3 on both screens`);
    if (!(await onLift(valet))) await cabin(valet);
    await sleep(3000);
    const r2 = [await x(A), await x(B)];
    if (r2.some((s) => s.lift.y > 0.2 || s.lift.used)) return fail(`the first ride left with the valet alone: ${JSON.stringify(r2)}`);
    covered.push('3/3 but the valet alone in the cabin: the first ride waits for both (both screens)');

    // ---- both in the cabin: up ----
    if (!(await cabin(dame))) return fail(`${who(dame)} did not get back in the cabin`);
    const up = 'Player.body.p.y > City.TOWER.y - 0.5';
    if (!(await until(dame, up, 30000)) || !(await until(valet, up, 10000))) return fail(`the lift did not take both up: ${JSON.stringify(await x(A))}`);
    if (!(await untilBoth(A, B, 'Story.S.x.lift.used && Story.S.x.lift.y > City.TOWER.y - 0.5 && Remote.pos.y > City.TOWER.y - 0.5', 6000)))
      return fail('the lift / partner not at the top on both screens');
    covered.push('both in the cabin: up the tower, both at the top on both screens');

    // ---- hands in the cabin: the valet steps next to the dame, both press E within 2.5 s ----
    await valet.ev('CB.walk(Remote.pos.clone().add(V3(0.9, 0, 0)), 0.3, 4000)');
    await sleep(300);
    await Promise.all([dame.ev("CB.tap('interact')"), sleep(400).then(() => valet.ev("CB.tap('interact')"))]);
    if (!(await untilBoth(A, B, 'Story.S.x.hand === true', 4000))) return fail(`hands not held: ${JSON.stringify(await x(A))}`);
    covered.push('both press E side by side: hands held on both screens');
    await dame.ev("CB.tap('interact')");
    if (!(await untilBoth(A, B, 'Story.S.x.hand === false', 4000))) return fail('E did not let go of the hand');
    covered.push(`E again (${who(dame)}): hands let go on both screens`);

    // ---- the roof bench ----
    const sit = (p) =>
      p.ev(`(async () => { const s = Story.role === 'dame' ? -0.9 : 0.9, b = City.roofBench;
        await CB.walk(V3(${L}.x + s, City.TOWER.y, ${L}.z - 3.5), 0.5, 8000);
        await CB.go(V3(b.pos.x + s * 0.55, City.TOWER.y, b.pos.z + 1.4), { near: 0.6, ms: 30000 });
        for (let i = 0; i < 6 && Player.mode !== 'sit'; i++) { await CB.tap('interact'); await CB.sl(400); }
        return Player.mode === 'sit'; })()`);
    const [s1, s2] = await Promise.all([sit(dame), sit(valet)]);
    if (!s1 || !s2) return fail(`not both seated on the roof bench: ${s1} ${s2}`);
    if (!(await untilBoth(A, B, 'Story.S.x.moment === true', 5000))) return fail('both seated: no moment');
    covered.push('both sit on the roof bench (E): the moment on both screens');
    if (!(await untilBoth(A, B, "Story.S.phase === 'act4'", 15000))) return fail('the moment did not lead to act4 on both screens');
    covered.push('then act4 on both screens');
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
