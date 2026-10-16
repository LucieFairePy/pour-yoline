// tr_d3 « Les Poids »: the observatory is unloaded in the city and rebuilt on the way back (same
// fingerprint on both screens, the room-1 weights made again by the level), then room 1: the
// Dame cannot lift a heavy weight, the Valet can (it rides over his head on both screens), and
// the Dame carries a light one.
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
  const FP =
    'JSON.stringify([D3.blocks.length, Object.keys(D3.homes).length, D3.socketXZ.length, Object.keys(D3.scales).length, Object.keys(D3.levers).length, D3.shelves.length])';

  // ---- unload in the city, rebuild on the way back ----
  if (!(await until('D3.built && D3.blocks.length > 0'))) return { covered, ok: false, notes: 'the observatory is not built on entry' };
  const [fa, fb] = await both(FP);
  await go('city');
  const [ca, cb] = await both('D3.built');
  if (ca || cb) return { covered, ok: false, notes: `still built in the city: ${ca} / ${cb}` };
  await go('tr_d3');
  if (!(await until('D3.built && D3.blocks.length > 0'))) return { covered, ok: false, notes: 'the observatory was not rebuilt' };
  const [la, lb] = await both("Life.log.some((r) => r.world === 'tr_d3')");
  if (!la || !lb) return { covered, ok: false, notes: `no unload logged: ${la} / ${lb}` };
  const [ga, gb] = await both(FP);
  if (ga !== fa || gb !== fb) return { covered, ok: false, notes: `fingerprint changed: ${fa} -> ${ga}, ${fb} -> ${gb}` };
  covered.push(`unloaded in the city, rebuilt with the same fingerprint ${ga} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  const at = (p, i) => p.ev(`Story.S.x.blocks[${i}].at`);
  // test setup on the host: room 1
  await A.ev('Story.ctx.set((s) => { s.x.stage = 1; }); 1');
  await sleep(800);
  const hi = await A.ev("Story.S.x.blocks.findIndex((b) => b.kind === 'heavy' && b.at === 'H0')");
  const li = await A.ev("Story.S.x.blocks.findIndex((b) => b.kind === 'light' && b.at === 'L0')");
  if (hi < 0 || li < 0) return { covered, ok: false, notes: `no weight at home: heavy ${hi}, light ${li}` };

  // ---- the Dame cannot lift a heavy weight ----
  await dame.ev("Story.ctx.act({ a: 'pick', at: 'H0' }); 1");
  await sleep(900);
  if ((await at(A, hi)) !== 'H0') return { covered, ok: false, notes: 'the dame lifted a heavy weight' };
  covered.push(`dame refused on a heavy weight (${who(dame)})`);

  // ---- the Valet lifts it: it rides over his head on both screens ----
  await valet.ev("Story.ctx.act({ a: 'pick', at: 'H0' }); 1");
  await sleep(1200);
  if ((await at(A, hi)) !== 'carry:valet' || (await at(B, hi)) !== 'carry:valet')
    return { covered, ok: false, notes: 'the heavy weight is not carried by the valet on both screens' };
  const [da, db] = await both(`D3.blocks[${hi}].g.position.distanceTo(Story.role === 'valet' ? Player.body.p : Remote.pos)`);
  if (!(da < 3.5 && db < 3.5)) return { covered, ok: false, notes: `the weight does not follow the valet: ${da} / ${db}` };
  await valet.ev("Story.ctx.act({ a: 'put' }); 1");
  await sleep(900);
  if ((await at(A, hi)) !== 'H0' || (await at(B, hi)) !== 'H0') return { covered, ok: false, notes: 'the heavy weight did not go back home' };
  covered.push(`valet carries a heavy weight and puts it back (${who(valet)}), weight mesh over his head on both screens`);

  // ---- the Dame carries a light one ----
  await dame.ev("Story.ctx.act({ a: 'pick', at: 'L0' }); 1");
  await sleep(900);
  if ((await at(A, li)) !== 'carry:dame' || (await at(B, li)) !== 'carry:dame')
    return { covered, ok: false, notes: 'the light weight is not carried by the dame on both screens' };
  await dame.ev("Story.ctx.act({ a: 'put' }); 1");
  await sleep(900);
  if ((await at(A, li)) !== 'L0' || (await at(B, li)) !== 'L0') return { covered, ok: false, notes: 'the light weight did not go back home' };
  covered.push(`dame carries a light weight and puts it back (${who(dame)})`);
  return { covered, ok: true };
};
