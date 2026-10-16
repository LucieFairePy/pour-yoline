// tr_h3 « Les Yeux bandés »: the world is unloaded in the city and rebuilt on re-entry (same maze
// and fingerprint on both pages), then the maze (stage 1, the valet is blindfolded): the valet
// steps on a bell plate (the count goes up, the plate flashes on both screens), the dame reaches
// the halfway lantern-stone (the checkpoint is shared).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    'JSON.stringify([H3.seed, H3.maze.walls.length, H3.maze.plates.length, H3.maze.path.length, H3.maze.mid && [H3.maze.mid.x, H3.maze.mid.z], H3.stones.length, H3.plateMeshes.length])';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_h3');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_h3')");
    const bu = await p.ev('H3.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.mid = false; s.x.traps = 0; }); 1');
  await sleep(800);

  // valet (blindfolded in the maze): a bell plate
  await valet.ev("Story.ctx.act({ a: 'plate', k: 0, pos: [H3.maze.plates[0].x, 0, H3.maze.plates[0].z] }); 1");
  await sleep(500);
  const pl = (p) => p.ev('JSON.stringify([Story.S.x.traps, H3.plateMeshes[0].flash > 0])').then(JSON.parse);
  const a = await pl(A), b = await pl(B);
  if (a[0] !== 1 || b[0] !== 1 || !a[1] || !b[1]) return { covered, ok: false, notes: `bell plate not on both screens: ${JSON.stringify({ a, b })}` };
  covered.push(`valet steps on a bell plate: count and flash on both screens (${who(valet)})`);

  // dame: the halfway lantern-stone
  await dame.ev("Story.ctx.act({ a: 'mid', pos: [H3.maze.mid.x, 0, H3.maze.mid.z] }); 1");
  await sleep(900);
  const ma = await A.ev('Story.S.x.mid'), mb = await B.ev('Story.S.x.mid');
  if (!ma || !mb) return { covered, ok: false, notes: `halfway stone not on both pages: ${ma} / ${mb}` };
  covered.push(`dame reaches the halfway stone, checkpoint shared (${who(dame)})`);
  return { covered, ok: true };
};
