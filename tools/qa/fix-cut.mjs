// A reload during the film of a table (once its Roi is beaten) goes on with that film and then the
// reward, instead of starting the level over. ♣ ♥ ♠ play their film inside the level (tr_cK,
// tr_hK, tr_sR); ♦ goes to the 'cut' phase a few seconds after the win (tr_dK). Here each level
// is put in its won stage by the host, both pages reload, and both must be in the film, then
// both reach the reward of that Roi once the film is over.
//   node tools/qa/fix-cut.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

const CASES = [
  { ph: 'tr_cK', world: 'CourC', stage: 3, cut: 'cour_c', card: 'cK' },
  { ph: 'tr_hK', world: 'CourH', stage: 2, cut: 'cour_h', card: 'hK' },
  { ph: 'tr_sR', world: 'CourS', stage: 3, cut: 'cour_s', card: 'sR' },
  { ph: 'tr_dK', world: 'CourD', stage: 3, cut: 'cour_d', card: 'dK' },
];

run('cut', async ({ A, B, open, go, sleep, log }) => {
  const rows = [];
  let ok = true;
  for (const k of CASES) {
    const built = `Story.S.phase === '${k.ph}' && ${k.world}.built`;
    if (!(await go(k.ph)) || !(await A.until(built)) || !(await B.until(built))) return { ok: false, notes: k.ph + ' did not load' };
    await sleep(1500);
    await A.ev(`Story.ctx.set((s) => { s.x.stage = ${k.stage}; s.x.seen = []; }); 1`);
    await sleep(3000);
    const saved = await A.ev(`(JSON.parse(localStorage.getItem('borderline') || '{}').progress || {}).phase`);
    const back = await open();
    const st = (p) => p.ev(`JSON.stringify([Story.S.phase, Story.S.x.cut || null, Story.S.x.stage ?? null, Cut.on])`).then(JSON.parse);
    const inFilm = `Story.S.phase === 'cut' && Story.S.x.cut === '${k.cut}' && Cut.on`;
    const film = (await A.until(inFilm, 8000)) && (await B.until(inFilm, 8000));
    const row = { level: k.ph, saved, resumed: back, A: await st(A), B: await st(B), film };
    if (film) {
      // both watch it to the end
      await A.ev('Cut.seek(1e4); 1');
      await B.ev('Cut.seek(1e4); 1');
      const rw = `Story.S.phase === 'reward' && Story.S.x.card === '${k.card}'`;
      row.reward = (await A.until(rw, 20000)) && (await B.until(rw, 20000));
    }
    row.ok = !!(film && row.reward);
    if (!row.ok) ok = false;
    log(JSON.stringify(row));
    rows.push(row);
  }
  return { ok, rows, notes: ok ? 'each film resumed after a reload, then the reward' : 'a reload during a film did not resume it' };
});
