// act2 (Maze, the dark mazes and the bomb): the world is unloaded in the city and rebuilt with the
// same mazes (walls, traps, dead ends: same seed), then the valet cuts the bomb's wires (right one:
// next module, and the wires are mended on screen; wrong one: boom) and the dame walks out of the
// second maze (stage 4 on both screens).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const until = async (p, expr, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await p.ev(expr).catch(() => false)) return true;
      await sleep(250);
    }
    return false;
  };
  // the group's objects and wall instances, and every cell's walls, traps and dead end of both mazes
  const FP = `(() => {
    let n = 0, k = 0;
    Maze.screen.mesh.parent.traverse((o) => { n++; if (o.isInstancedMesh) k += o.count; });
    const cells = ['m1', 'm2'].map((key) => {
      const m = Maze.mazes[key];
      let s = '';
      for (let z = 0; z < m.n; z++) for (let x = 0; x < m.n; x++) {
        const c = m.at(x, z);
        s += (c.n ? 1 : 0) + (c.e ? 2 : 0) + (c.s ? 4 : 0) + (c.w ? 8 : 0) + ',';
      }
      return s + JSON.stringify(m.traps) + JSON.stringify(m.dead);
    });
    return JSON.stringify([n, k, Object.keys(Maze.mazes).length, cells]);
  })()`;
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  await go('city');
  if (!(await until(A, '!Maze.built')) || !(await until(B, '!Maze.built')))
    return { covered, ok: false, notes: 'Maze still built in the city' };
  await go('act2');
  if (!(await until(A, 'Maze.built')) || !(await until(B, 'Maze.built')))
    return { covered, ok: false, notes: 'Maze not built again on re-entry' };
  await sleep(800);
  for (const p of [A, B]) {
    if (!(await p.ev("Life.log.some((r) => r.world === 'maze')")))
      return { covered, ok: false, notes: `${who(p)}: no unload of maze in Life.log` };
    const f = await p.ev(FP);
    const f0 = p === A ? fp0[0] : fp0[1];
    if (f !== f0) return { covered, ok: false, notes: `${who(p)}: the maze differs after rebuild` };
  }
  covered.push('unloaded in the city, rebuilt with the same mazes (both)');

  const valet = (await A.ev('Story.role')) === 'valet' ? A : B;
  const dame = valet === A ? B : A;
  const x = (p) =>
    p.ev('JSON.stringify({ stage: Story.S.x.stage, round: Story.S.x.bomb.round, booms: Story.S.x.booms })').then(JSON.parse);

  // stage 2 with a known module: heart 2 -> the rose wire (0)
  await A.ev("Story.ctx.set((s) => { s.x.stage = 2; s.x.booms = 0; s.x.bomb = { round: 0, sym: '♥', num: 2, t: 0 }; }); 1");
  await sleep(1000);
  // as the valet's own update does: the wire is cut on screen, then the action goes to the host
  await valet.ev("Maze.cutWire(0, true); Story.ctx.act({ a: 'wire', i: 0 }); 1");
  await sleep(1000);
  let a = await x(A);
  let b = await x(B);
  if (!(a.round === 1 && b.round === 1 && a.booms === 0 && b.booms === 0))
    return { covered, ok: false, notes: `right wire: ${JSON.stringify({ a, b })}` };
  // the next module mends the wires on screen (the level's apply, world side)
  if ((await valet.ev("Maze.mazes.wires.getObjectByName('wire0').scale.z")) !== 1)
    return { covered, ok: false, notes: 'the cut wire was not mended for the next module' };
  covered.push(`right wire cut, next module on both screens (${who(valet)} as valet)`);

  const sym = await A.ev('Story.S.x.bomb.sym');
  const num = await A.ev('Story.S.x.bomb.num');
  // the level's rule (js/levels/act2.js answer)
  const answer = (s, n) =>
    s === '♥' ? (n % 2 === 0 ? 0 : 1) : s === '♠' ? (n < 5 ? 2 : 3) : s === '♦' ? (n % 3 === 0 ? 1 : 2) : n % 2 === 0 ? 3 : 0;
  const wrong = (answer(sym, num) + 1) % 4;
  await valet.ev(`Story.ctx.act({ a: 'wire', i: ${wrong} }); 1`);
  await sleep(1000);
  a = await x(A);
  b = await x(B);
  if (!(a.round === 0 && b.round === 0 && a.booms === 1 && b.booms === 1))
    return { covered, ok: false, notes: `wrong wire: ${JSON.stringify({ a, b })}` };
  covered.push(`wrong wire, boom on both screens (${who(valet)} as valet)`);

  // stage 3: the dame walks the second maze; out of it, stage 4 for both
  await A.ev('Story.ctx.set((s) => { s.x.stage = 3; }); 1');
  await sleep(1500);
  await dame.ev('Player.teleport(Maze.P(0, 0.3, Maze.mazes.m2.exitZ + 2.5), 0); 1');
  const ok = (await until(A, 'Story.S.x.stage === 4', 6000)) && (await until(B, 'Story.S.x.stage === 4', 4000));
  if (!ok)
    return { covered, ok: false, notes: `dame out of the maze: stage ${await A.ev('Story.S.x.stage')} / ${await B.ev('Story.S.x.stage')}` };
  covered.push(`out of the second maze, stage 4 on both screens (${who(dame)} as dame)`);
  return { covered, ok: true };
};
