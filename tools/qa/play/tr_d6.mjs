// tr_d6 « Les Ombres »: the world is unloaded in the city and rebuilt on re-entry (same fingerprint
// on both pages), then each pilot drives the light: the dame saves a rig for room 1 (stage 1, the
// walker's screen glides its projector there), the valet throws a boss projector's lever (stage 6,
// both screens switch that light).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    '(() => { let n = 0; D6W.group.traverse(() => n++); return JSON.stringify([n, Object.keys(D6W.doors).length, Object.keys(D6W.consoles).length, D6W.WALLS.r1.boxes.length, D6W.puppet.strings.length]); })()';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_d6');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_d6')");
    const bu = await p.ev('D6W.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;

  // stage 1: the dame pilots room 1; her saved rig reaches both pages, the valet's projector follows
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.rig = {}; }); 1');
  await sleep(1000);
  await dame.ev("Story.ctx.act({ a: 'rig', id: 'r1', r: { L: [[2, 12, 1]], C: D6W.WALLS.r1.cuts.map((c) => [c.x, c.y, c.o]) } }); 1");
  await sleep(1200);
  const rig = (p) => p.ev('JSON.stringify(Story.S.x.rig.r1 && Story.S.x.rig.r1.L)');
  const ra = await rig(A), rb = await rig(B);
  if (ra !== '[[2,12,1]]' || rb !== '[[2,12,1]]') return { covered, ok: false, notes: `rig r1 not saved on both pages: ${ra} / ${rb}` };
  const lx = await valet.ev('D6W.WALLS.r1.lights[0].x');
  if (Math.abs(lx - 2) > 0.3) return { covered, ok: false, notes: `the valet's projector did not glide to the dame's rig (x = ${lx})` };
  covered.push(`dame rig for room 1, valet's projector follows (${who(dame)})`);

  // stage 6: the valet throws the first boss lever
  await A.ev('Story.ctx.set((s) => { s.x.stage = 6; s.x.lit = [1, 1, 1]; s.x.cut = [0, 0, 0, 0]; }); 1');
  await sleep(1200);
  const lit0 = await A.ev('Story.S.x.lit[0]');
  await valet.ev("Story.ctx.act({ a: 'lit', s: 0 }); 1");
  await sleep(900);
  const st = (p) => p.ev('JSON.stringify([Story.S.x.lit[0], D6W.WALLS.boss.lights[0].on])').then(JSON.parse);
  const a = await st(A), b = await st(B);
  if (a[0] === lit0 || a[0] !== b[0] || a[1] !== !!a[0] || b[1] !== !!b[0]) return { covered, ok: false, notes: `boss lever 0 not on both screens: before ${lit0}, ${JSON.stringify({ a, b })}` };
  covered.push(`valet throws boss lever 0, the light follows on both screens (${who(valet)})`);
  return { covered, ok: true };
};
