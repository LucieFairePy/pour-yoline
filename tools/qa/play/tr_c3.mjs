// tr_c3 « La Bascule »: the islands are unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens), then the crate (only the Valet can carry it) and the lock lever
// on island B (the Dame, put next to it).
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
  // the world exports little: its display state, its surfaces and what its group holds
  const FP = 'JSON.stringify([Object.keys(TrC3.st).length, TrC3.surfaces().length, (() => { let n = 0; TrC3.group.traverse(() => n++); return n; })()])';

  // ---- unload in the city, rebuild on the way back ----
  if (!(await until('TrC3.built'))) return { covered, ok: false, notes: 'the islands are not built on entry' };
  const [fa, fb] = await both(FP);
  await go('city');
  const [ca, cb] = await both('TrC3.built');
  if (ca || cb) return { covered, ok: false, notes: `still built in the city: ${ca} / ${cb}` };
  await go('tr_c3');
  if (!(await until('TrC3.built'))) return { covered, ok: false, notes: 'the islands were not rebuilt' };
  const [la, lb] = await both("Life.log.some((r) => r.world === 'tr_c3')");
  if (!la || !lb) return { covered, ok: false, notes: `no unload logged: ${la} / ${lb}` };
  const [ga, gb] = await both(FP);
  if (ga !== fa || gb !== fb) return { covered, ok: false, notes: `fingerprint changed: ${fa} -> ${ga}, ${fb} -> ${gb}` };
  covered.push(`unloaded in the city, rebuilt with the same fingerprint ${ga} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  // test setup on the host: stage 1, plank free, the crate at its start
  await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.lock = false; s.x.crate = { st: 'ground', x: 3, y: 0, z: 5 }; }); 1");
  await sleep(900);

  // ---- the crate: too heavy for the Dame, the Valet carries it ----
  await dame.ev("Story.ctx.act({ a: 'take' }); 1");
  await sleep(900);
  if ((await A.ev('Story.S.x.crate.st')) !== 'ground') return { covered, ok: false, notes: 'the dame took the crate' };
  covered.push(`dame refused on the crate (${who(dame)})`);
  // the host only lets the crate be taken from beside it
  await valet.ev('Story.ctx.spawn(TrC3.P(3, 0.05, 4.1), 0); 1');
  await sleep(1200);
  await valet.ev("Story.ctx.act({ a: 'take' }); 1");
  await sleep(900);
  const [sa, sb] = await both('Story.S.x.crate.st');
  const [wa, wb] = await both('TrC3.st.crate.st');
  if (sa !== 'carry' || sb !== 'carry' || wa !== 'carry' || wb !== 'carry')
    return { covered, ok: false, notes: `crate not carried on both screens: ${JSON.stringify({ sa, sb, wa, wb })}` };
  await valet.ev("Story.ctx.act({ a: 'drop', x: 3, y: 0, z: 5 }); 1");
  await sleep(900);
  if ((await A.ev('Story.S.x.crate.st')) !== 'ground') return { covered, ok: false, notes: 'the crate was not put down' };
  covered.push(`valet carries the crate and puts it down (${who(valet)}), world state on both screens`);

  // ---- the lock lever: the Dame stands by it on island B ----
  await dame.ev('Player.teleport(TrC3.P(4.8, TrC3.ISLE + 0.05, 27.2), 0); 1');
  await sleep(1400);
  await dame.ev("Story.ctx.act({ a: 'lever' }); 1");
  await sleep(900);
  const [ka, kb] = await both('Story.S.x.lock');
  const [ta, tb] = await both('TrC3.st.lock');
  if (!(ka && kb && ta && tb)) return { covered, ok: false, notes: `plank not locked on both screens: ${JSON.stringify({ ka, kb, ta, tb })}` };
  covered.push(`dame locks the plank at the lever (${who(dame)}): lock in the state and the world on both screens`);
  return { covered, ok: true };
};
