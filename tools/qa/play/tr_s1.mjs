// tr_s1 « Premiers pas »: the world is unloaded in the city and rebuilt on re-entry (same
// fingerprint on both pages). Then stage 2: the bridge needs both players — the valet holds the
// winch, then the dame pulls the lever (kits are swapped in this level: Yoline plays the valet).
// Checks the rule both ways (lever alone does nothing) and that both screens agree.
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const FP =
    'JSON.stringify([Object.keys(TrS1.ghosts).length, Object.keys(TrS1.pads).length, Object.keys(TrS1.gatePads).length, Object.keys(TrS1.altarPads).length, !!TrS1.screen, !!TrS1.screen2])';
  const page = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const fp0 = [await A.ev(FP), await B.ev(FP)];
  await go('city');
  await go('tr_s1');
  await sleep(800);
  for (const [i, p] of [A, B].entries()) {
    const un = await p.ev("Life.log.some((r) => r.world === 'tr_s1')");
    const bu = await p.ev('TrS1.built');
    const fp = await p.ev(FP);
    if (!un || !bu || fp !== fp0[i]) return { covered, ok: false, notes: `${page(p)}: unloaded ${un}, built ${bu}, fingerprint ${fp} vs ${fp0[i]}` };
  }
  covered.push('unloaded in the city, rebuilt identical (both pages)');

  const x = (p) => p.ev('JSON.stringify({ stage: Story.S.x.stage, winch: Story.S.x.winch, bridge: Story.S.x.bridge })').then(JSON.parse);
  const valet = (await A.ev('Story.role')) === 'valet' ? A : B;
  const dame = valet === A ? B : A;
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  // test setup on the host: jump to stage 2
  await A.ev('Story.ctx.set((s) => { s.x.stage = 2; s.x.winch = false; s.x.bridge = false; }); 1');
  await sleep(800);

  await dame.ev("Story.ctx.act({ a: 'lever' }); 1");
  await sleep(800);
  if ((await x(A)).bridge || (await x(B)).bridge) return { covered, ok: false, notes: 'the lever alone lowered the bridge' };
  covered.push(`lever alone refused (${who(dame)} as dame)`);

  await valet.ev("Story.ctx.act({ a: 'winch', v: 1 }); 1");
  await sleep(800);
  if (!(await x(A)).winch || !(await x(B)).winch) return { covered, ok: false, notes: 'the winch did not reach both screens' };
  covered.push(`winch held (${who(valet)} as valet)`);

  await dame.ev("Story.ctx.act({ a: 'lever' }); 1");
  await sleep(800);
  const a = await x(A), b = await x(B);
  if (!(a.bridge && b.bridge)) return { covered, ok: false, notes: `bridge not down on both screens: ${JSON.stringify({ a, b })}` };
  covered.push('lever with winch held: bridge down on both screens');
  return { covered, ok: true };
};
