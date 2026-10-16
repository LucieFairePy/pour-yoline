// tr_ufo « La Soucoupe »: the world is unloaded in the city and built again on entry (same
// fingerprint on both pages), then the two halves of tearing an anchor out in phase 1: the valet
// cuts the red chain at its post (cut), the dame tears the core out while it is open (rip).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const FP = 'JSON.stringify([TrUfo.anchors[1].length, TrUfo.anchors[3].length, TrUfo.cores.length, TrUfo.group.children.filter((o) => o.isGroup).length])';
  const fp0 = [await A.ev(FP), await B.ev(FP)];

  // ---- unload in the city, rebuild on entry ----
  await go('city');
  await go('tr_ufo');
  await sleep(800);
  for (const p of [A, B]) {
    const r = JSON.parse(await p.ev("JSON.stringify({ un: Life.log.some((r) => r.world === 'tr_ufo'), built: TrUfo.built })"));
    if (!r.un || !r.built) return { covered, ok: false, notes: `${who(p)}: unloaded ${r.un}, built again ${r.built}` };
  }
  const fp1 = [await A.ev(FP), await B.ev(FP)];
  if (fp1[0] !== fp0[0] || fp1[1] !== fp0[1]) return { covered, ok: false, notes: `fingerprint changed: ${JSON.stringify({ fp0, fp1 })}` };
  covered.push(`unloaded in the city and rebuilt, same fingerprint on both pages ${fp1[0]}`);

  // the arrival (stage 0) ends by itself after about 6.5 s
  for (let i = 0; i < 20 && (await A.ev('Story.S.x.stage')) < 1; i++) await sleep(600);
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.ph = 1; s.x.mode = 'shield'; s.x.anc = [1, 1, 1]; s.x.cuts = []; s.x.fall = null; }); 1");
  await sleep(800);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const x = (p) => p.ev('JSON.stringify({ cut: (Story.S.x.cuts || [])[0] || 0, anc: Story.S.x.anc, chain: TrUfo.anchors[1][0].borne.chain.visible, alive: TrUfo.anchors[1][0].alive })').then(JSON.parse);

  // ---- valet: cut the chain of anchor 0 at its post ----
  await valet.ev('(() => { const b = TrUfo.anchors[1][0].borne.pos; const l = Math.hypot(b.x, b.z) || 1; const k = 1 - 1.3 / l; Story.ctx.spawn(TrUfo.P(b.x * k, 0.3, b.z * k), 0); return 1; })()');
  await sleep(1300);
  await valet.ev("Story.ctx.act({ a: 'cut', ph: 1, i: 0 }); 1");
  await sleep(900);
  for (const p of [A, B]) {
    const s = await x(p);
    if (!(s.cut > 0) || s.chain) return { covered, ok: false, notes: `${who(p)} after the cut: ${JSON.stringify(s)}` };
  }
  covered.push(`chain cut by ${who(valet)} as valet: open on both pages (chain hidden)`);

  // ---- dame: tear the core out while the lock is open ----
  await dame.ev("Story.ctx.act({ a: 'rip', ph: 1, i: 0 }); 1");
  await sleep(900);
  for (const p of [A, B]) {
    const s = await x(p);
    if (s.anc[0] !== 0 || s.alive) return { covered, ok: false, notes: `${who(p)} after the rip: ${JSON.stringify(s)}` };
  }
  covered.push(`core torn out by ${who(dame)} as dame: anchor 0 down on both pages`);
  return { covered, ok: true };
};
