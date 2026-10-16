// tr_d2 « Les Miroirs »: the world is unloaded in the city and rebuilt on re-entry (same
// fingerprint on both pages), then room 1 (stage 1): each one turns a mirror of their own side of
// the glass, the dame m1 (west, ♥), the valet m3 (east, ♠). The new angle must reach both pages and
// both mirror heads must turn to it.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    'JSON.stringify([TrD2.mirrors.length, Object.keys(TrD2.sockets).length, Object.keys(TrD2.targets).length, Object.keys(TrD2.crystals).length, !!TrD2.screen])';
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_d2');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_d2')");
    const bu = await p.ev('TrD2.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; }); 1');
  await sleep(600);
  // how far a mirror head is from the shared angle (radians)
  const off = (id) =>
    `(() => { const m = TrD2.mirrors.find((mm) => mm.id === '${id}'); const w = (Story.S.x.mirrors['${id}'] * Math.PI) / 180; return Math.abs(Math.atan2(Math.sin(m.cur - w), Math.cos(m.cur - w))); })()`;

  // the host checks reach from the turner's position: stand 2 m from the stand first
  const turn = async (p, kit, id, x, z) => {
    await p.ev(`Player.body.p.copy(TrD2.P(${x}, 0.1, ${z})); Player.body.v.set(0, 0, 0); 1`);
    await sleep(1000);
    const before = await A.ev(`Story.S.x.mirrors['${id}']`);
    await p.ev(`Story.ctx.act({ a: 'rot', id: '${id}', dir: 1 }); 1`);
    await sleep(1000);
    const want = (before + 45) % 360;
    const a = await A.ev(`Story.S.x.mirrors['${id}']`), b = await B.ev(`Story.S.x.mirrors['${id}']`);
    if (a !== want || b !== want) return `mirror ${id} not turned on both pages: before ${before}, ${a} / ${b}`;
    const oa = await A.ev(off(id)), ob = await B.ev(off(id));
    if (oa > 0.1 || ob > 0.1) return `mirror ${id}: a head did not follow (${oa.toFixed(3)} / ${ob.toFixed(3)} rad off)`;
    covered.push(`${kit} turns mirror ${id}, both heads follow (${who(p)})`);
    return null;
  };
  const e1 = await turn(dame, 'dame', 'm1', -8, 12.2);
  if (e1) return { covered, ok: false, notes: e1 };
  const e2 = await turn(valet, 'valet', 'm3', 8, 21.8);
  if (e2) return { covered, ok: false, notes: e2 };
  return { covered, ok: true };
};
