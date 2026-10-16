// tr_d4 « Le Code »: the vault is unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens), then room 1: each kit turns the dial of its own safe (the Dame
// cannot touch the Valet's), and the right code opens the Dame's safe on both screens.
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
  const FP = 'JSON.stringify([D4.keys.length, D4.cranks.length, D4.rings.length, D4.targets.length, Object.keys(D4.safes).length])';

  // ---- unload in the city, rebuild on the way back ----
  if (!(await until('D4.built'))) return { covered, ok: false, notes: 'the vault is not built on entry' };
  const [fa, fb] = await both(FP);
  await go('city');
  const [ca, cb] = await both('D4.built');
  if (ca || cb) return { covered, ok: false, notes: `still built in the city: ${ca} / ${cb}` };
  await go('tr_d4');
  if (!(await until('D4.built'))) return { covered, ok: false, notes: 'the vault was not rebuilt' };
  const [la, lb] = await both("Life.log.some((r) => r.world === 'tr_d4')");
  if (!la || !lb) return { covered, ok: false, notes: `no unload logged: ${la} / ${lb}` };
  const [ga, gb] = await both(FP);
  if (ga !== fa || gb !== fb) return { covered, ok: false, notes: `fingerprint changed: ${fa} -> ${ga}, ${fb} -> ${gb}` };
  covered.push(`unloaded in the city, rebuilt with the same fingerprint ${ga} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const dial = (p) => p.ev('JSON.stringify(Story.S.x.dial)').then(JSON.parse);
  // test setup on the host: room 1, every safe shut, every dial on 1
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; s.x.open = {}; s.x.dial = { h: 1, d: 1, s: 1, c: 1 }; }); 1');
  await sleep(1000);

  // ---- the Valet turns the dial of his safe (spade, on the ledge) ----
  await valet.ev("Story.ctx.act({ a: 'dial', s: 's' }); 1");
  await sleep(900);
  const [da, db] = [await dial(A), await dial(B)];
  if (da.s !== 2 || db.s !== 2) return { covered, ok: false, notes: `valet dial did not reach both screens: ${JSON.stringify({ da, db })}` };
  const [wa, wb] = await both('D4.safes.s.value');
  if (wa !== 2 || wb !== 2) return { covered, ok: false, notes: `the spade safe window shows ${wa} / ${wb}, not 2` };
  covered.push(`valet dial spade (${who(valet)}): 2 on both screens, safe window too`);

  // ---- the Dame cannot turn the Valet's dial ----
  await dame.ev("Story.ctx.act({ a: 'dial', s: 's' }); 1");
  await sleep(900);
  if ((await dial(A)).s !== 2 || (await dial(B)).s !== 2) return { covered, ok: false, notes: 'the dame turned the valet dial' };
  covered.push(`dame refused on the spade dial (${who(dame)})`);

  // ---- the right code opens the Dame's safe (diamond, on the balcony) ----
  await A.ev('Story.ctx.set((s) => { s.x.dial = { ...s.x.dial, d: s.x.codes.d }; }); 1');
  await sleep(800);
  await dame.ev("Story.ctx.act({ a: 'try', s: 'd' }); 1");
  await sleep(1600);
  const [oa, ob] = await both('!!Story.S.x.open.d');
  if (!oa || !ob) return { covered, ok: false, notes: `diamond safe not open on both screens: ${oa} / ${ob}` };
  const [ha, hb] = await both('D4.safes.d.hinge.rotation.y');
  if (!(ha < -0.5 && hb < -0.5)) return { covered, ok: false, notes: `diamond door did not swing: ${ha} / ${hb}` };
  covered.push(`dame opens diamond with the right code (${who(dame)}): open and door swung on both screens`);
  return { covered, ok: true };
};
