// tr_c2 « Le Téléphone »: the exchange is unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens), then room A (the Valet dials what the Dame reads) and room C (the
// one who does not call presses the plates; the caller cannot).
export default async ({ A, B, go, sleep }) => {
  const covered = [];
  const both = (e) => Promise.all([A.ev(e), B.ev(e)]);
  const until = async (e, ms = 8000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const [a, b] = await both(e);
      if (a && b) return true;
      await sleep(250);
    }
    return false;
  };
  const who = (p) => (p === A ? 'Yoline (host)' : 'William (guest)');
  const FP = 'JSON.stringify([TrC2.plates.length, Object.keys(TrC2.panels).length, TrC2.group.children.length])';

  // ---- unload in the city, rebuild on the way back ----
  if (!(await until('TrC2.built'))) return { covered, ok: false, notes: 'the exchange is not built on entry' };
  const [fa, fb] = await both(FP);
  await go('city');
  const [ca, cb] = await both('TrC2.built');
  if (ca || cb) return { covered, ok: false, notes: `still built in the city: ${ca} / ${cb}` };
  await go('tr_c2');
  if (!(await until('TrC2.built'))) return { covered, ok: false, notes: 'the exchange was not rebuilt' };
  const [la, lb] = await both("Life.log.some((r) => r.world === 'tr_c2')");
  if (!la || !lb) return { covered, ok: false, notes: `no unload logged: ${la} / ${lb}` };
  const [ga, gb] = await both(FP);
  if (ga !== fa || gb !== fb) return { covered, ok: false, notes: `fingerprint changed: ${fa} -> ${ga}, ${fb} -> ${gb}` };
  covered.push(`unloaded in the city, rebuilt with the same fingerprint ${ga} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const r = (p, k) => p.ev(`JSON.stringify(Story.S.x.${k})`).then(JSON.parse);

  // ---- room A: the Valet dials the right symbol ----
  await A.ev('Story.ctx.set((s) => { s.x.round = 1; s.x.r1 = { call: 0, seq: [2, 0, 1], prog: 0, dn: 0, last: 0 }; }); 1');
  await sleep(900);
  await valet.ev("Story.ctx.act({ a: 'dial', i: 2 }); 1");
  await sleep(900);
  const [a1, b1] = [await r(A, 'r1'), await r(B, 'r1')];
  if (a1.prog !== 1 || b1.prog !== 1 || a1.dn !== 1 || b1.dn !== 1)
    return { covered, ok: false, notes: `valet dial not on both screens: ${JSON.stringify({ a1, b1 })}` };
  const [pa, pb] = await both("!!TrC2.plates.find((p) => p.id === 'dial2')");
  if (!pa || !pb) return { covered, ok: false, notes: 'the dial plates are missing after the rebuild' };
  covered.push(`valet dials diamond (${who(valet)}): progress 1 / 3 on both screens`);

  // ---- room C: the Valet calls, the Dame presses ----
  await A.ev(
    "Story.ctx.set((s) => { s.x.round = 3; s.x.kn = 0; s.x.r3 = { sub: 0, caller: 'valet', seq: [0, 1, 2], prog: 0, t: 0, final: false, pressT: { dame: 0, valet: 0 }, beat: 0 }; }); 1",
  );
  await sleep(900);
  await valet.ev("Story.ctx.act({ a: 'key', i: 0 }); 1");
  await sleep(900);
  if ((await r(A, 'r3')).prog !== 0) return { covered, ok: false, notes: 'the caller pressed a plate' };
  covered.push(`caller refused on the plates (${who(valet)})`);
  await dame.ev("Story.ctx.act({ a: 'key', i: 0 }); 1");
  await sleep(900);
  const [a3, b3] = [await r(A, 'r3'), await r(B, 'r3')];
  const [ka, kb] = await both('Story.S.x.kp');
  if (a3.prog !== 1 || b3.prog !== 1 || ka !== 'cd0' || kb !== 'cd0')
    return { covered, ok: false, notes: `dame key not on both screens: ${JSON.stringify({ a3, b3, ka, kb })}` };
  covered.push(`dame presses heart (${who(dame)}): progress 1 / 3 and plate cd0 on both screens`);
  return { covered, ok: true };
};
