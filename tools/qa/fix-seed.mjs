// A save gives back the same puzzles: the arena (act1), the maze (act2) and the worlds (act5) are
// drawn from the shared seed S.seed, the card tables deal from their level seed (S.x.seed). Before
// the fix neither was saved, so after a reload both were drawn again. Here each level is saved by
// the host, both pages reload, and what both screens drew must be what the host drew before.
//   node tools/qa/fix-seed.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

// what each level drew: the seeds, plus the maze's walls, traps and dead ends and the worlds' puzzles
const FP = `JSON.stringify((() => {
  const x = Story.S.x;
  const r = { seed: Story.S.seed, xseed: x.seed };
  if (Story.S.phase === 'act2')
    r.maze = ['m1', 'm2'].map((key) => {
      const m = Maze.mazes[key];
      let s = '';
      for (let z = 0; z < m.n; z++) for (let i = 0; i < m.n; i++) {
        const c = m.at(i, z);
        s += (c.n ? 1 : 0) + (c.e ? 2 : 0) + (c.s ? 4 : 0) + (c.w ? 8 : 0) + ',';
      }
      return s + JSON.stringify(m.traps) + JSON.stringify(m.dead);
    });
  if (Story.S.phase === 'act5') r.puzzles = [x.lights, x.seq];
  return r;
})())`;
const WORLD = { act1: 'Arena', act2: 'Maze', act5: 'Worlds', tr_cK: 'CourC' };

run('seed', async ({ A, B, open, go, sleep, log }) => {
  const rows = [];
  let ok = true;
  for (const ph of Object.keys(WORLD)) {
    const built = `Story.S.phase === '${ph}' && ${WORLD[ph]}.built`;
    if (!(await go(ph)) || !(await A.until(built)) || !(await B.until(built))) return { ok: false, notes: ph + ' did not load' };
    await sleep(3000);
    const before = await A.ev(FP);
    const saved = await A.ev(`JSON.stringify((JSON.parse(localStorage.getItem('borderline') || '{}').progress || {}))`);
    const back = await open();
    if (back !== ph || !(await A.until(built)) || !(await B.until(built))) return { ok: false, notes: `${ph}: resumed in ${back}` };
    await sleep(500);
    const a = await A.ev(FP);
    const b = await B.ev(FP);
    const same = a === before && b === before;
    if (!same) ok = false;
    const row = { phase: ph, same, before: JSON.parse(before).seed + '/' + JSON.parse(before).xseed, afterA: JSON.parse(a).seed + '/' + JSON.parse(a).xseed, afterB: JSON.parse(b).seed + '/' + JSON.parse(b).xseed, saved };
    log(JSON.stringify(row));
    rows.push(row);
  }
  return { ok, rows, notes: ok ? 'same puzzles after a reload on both screens' : 'drawn again after a reload' };
});
