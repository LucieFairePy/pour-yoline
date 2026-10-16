// donjon « La Crypte » (kits swapped here: Story.role gives each page's kit): the world is unloaded
// in the city and rebuilt on re-entry (same fingerprint on both pages), then the lever corridor
// (stage 3): the dame stands on her high plate (it lights on both screens, alone it is not
// enough), the valet on his ledge plate, and the host opens the way to the nave (stage 4, both
// levers thrown on both screens).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    "(() => { let n = 0; Donjon.group.traverse(() => n++); return JSON.stringify([n, Donjon.group.children.length, Object.keys(Donjon.plates).sort().join()]); })()";
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('donjon');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'donjon')");
    const bu = await p.ev('Donjon.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${who(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) =>
    p.ev('JSON.stringify({ stage: Story.S.x.stage, plates: Story.S.x.plates, arms: [Donjon.plates.dame.arm.rotation.x, Donjon.plates.valet.arm.rotation.x] })').then(JSON.parse);
  // each page stands on its own kit's plate
  const onPlate = (p) =>
    p.ev('(() => { const q = Donjon.plates[Story.role].pos; Player.body.p.set(q.x, q.y + 0.05, q.z); Player.body.v.set(0, 0, 0); return 1; })()');

  await A.ev('Story.ctx.set((s) => { s.x.stage = 3; s.x.plates = []; }); 1');
  await sleep(1000);

  await onPlate(dame);
  await sleep(1000);
  let a = await x(A), b = await x(B);
  if (a.plates.join() !== 'dame' || b.plates.join() !== 'dame' || a.stage !== 3) return { covered, ok: false, notes: `the dame's plate alone: ${JSON.stringify({ a, b })}` };
  if (!(a.arms[0] > 0 && b.arms[0] > 0)) return { covered, ok: false, notes: `the dame's lever did not move on both screens: ${JSON.stringify({ a: a.arms, b: b.arms })}` };
  covered.push(`dame on her high plate: lit on both screens, the gate stays shut (${who(dame)})`);

  await onPlate(valet);
  await sleep(2400);
  a = await x(A);
  b = await x(B);
  if (a.stage !== 4 || b.stage !== 4) return { covered, ok: false, notes: `both plates held, stage did not move to 4: ${a.stage} / ${b.stage}` };
  if (!(a.arms[1] > 0 && b.arms[1] > 0)) return { covered, ok: false, notes: `the valet's lever did not move on both screens: ${JSON.stringify({ a: a.arms, b: b.arms })}` };
  covered.push(`valet on his ledge plate: both held, the nave opens on both screens (${who(valet)})`);
  return { covered, ok: true };
};
