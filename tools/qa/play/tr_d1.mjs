// tr_d1 « Les Interrupteurs »: the world is unloaded in the city and rebuilt on re-entry (same
// fingerprint on both pages), then room 1's crossed boards: the dame presses a tile of board A
// (it toggles the cross on the valet's board B), the valet presses one of board B (it toggles the
// dame's board A); both grids agree on both screens and the pressed tile reacts on the partner's
// screen.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    "(() => { let n = 0; D1.group.traverse(() => n++); return JSON.stringify([n, D1.tiles.length, D1.ledges.length, Object.keys(D1.switches).sort().join(), Object.keys(D1.rings).sort().join(), Object.keys(D1.crystals).length, Object.keys(D1.pedestals).length]); })()";
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_d1');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_d1')");
    const bu = await p.ev('D1.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const grid = (p) => p.ev('JSON.stringify(Story.S.x.grid)').then(JSON.parse);
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.open = {}; s.x.grid = { L: [0, 0, 0, 0, 0, 0, 0, 0, 0], R: [0, 0, 0, 0, 0, 0, 0, 0, 0] }; }); 1');
  await sleep(900);

  // a tile on the wrong side is refused (the valet cannot press board A's tiles)
  await valet.ev("Story.ctx.act({ a: 'tile', side: 'L', i: 4 }); 1");
  await sleep(700);
  let a = await grid(A);
  if (a.R.some(Boolean)) return { covered, ok: false, notes: `the valet pressed a tile of the dame's side: ${JSON.stringify(a)}` };

  // the dame's centre tile toggles the cross on board B
  await dame.ev("Story.ctx.act({ a: 'tile', side: 'L', i: 4 }); 1");
  // the partner's screen marks the press (d1tile); it fades in a third of a second, so poll
  let pressed = 0;
  for (let k = 0; k < 12 && !(pressed > 0); k++) {
    await sleep(50);
    pressed = await valet.ev("(D1.tiles.find((t) => t.side === 'L' && t.i === 4) || {}).press || 0");
  }
  await sleep(700);
  a = await grid(A);
  let b = await grid(B);
  const wantR = '[0,1,0,1,1,1,0,1,0]';
  if (JSON.stringify(a.R) !== wantR || JSON.stringify(b.R) !== wantR) return { covered, ok: false, notes: `board B after the dame's tile 5: ${JSON.stringify(a.R)} / ${JSON.stringify(b.R)}` };
  if (!(pressed > 0)) return { covered, ok: false, notes: "the dame's tile press did not show on the valet's screen" };
  covered.push(`dame presses tile 5 of board A, board B lights a cross on both screens (${who(dame)})`);

  // the valet's corner tile toggles board A
  await valet.ev("Story.ctx.act({ a: 'tile', side: 'R', i: 0 }); 1");
  await sleep(900);
  a = await grid(A);
  b = await grid(B);
  const wantL = '[1,1,0,1,0,0,0,0,0]';
  if (JSON.stringify(a.L) !== wantL || JSON.stringify(b.L) !== wantL) return { covered, ok: false, notes: `board A after the valet's tile 1: ${JSON.stringify(a.L)} / ${JSON.stringify(b.L)}` };
  covered.push(`valet presses tile 1 of board B, board A lights its corner on both screens (${who(valet)})`);
  return { covered, ok: true };
};
