// tr_s1 « Premiers pas », stage 2: the bridge needs both players — the valet holds the winch, then
// the dame pulls the lever (kits are swapped in this level: Yoline plays the valet). Checks the rule
// both ways (lever alone does nothing) and that both screens agree.
export default async ({ A, B, sleep }) => {
  const covered = [];
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
