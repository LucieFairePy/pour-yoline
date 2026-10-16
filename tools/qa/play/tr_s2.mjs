// tr_s2 « Les Toits qui tombent »: the rooftops are unloaded in the city and rebuilt on the way
// back (same fingerprint on both screens), then section 1: the Dame's winch lowers the fire
// ladder and the Valet's push drops the plank across the gap; each is checked as a collider
// that turned on, on both screens.
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
  const FP = 'JSON.stringify([TrS2.pieces.length, TrS2.group.children.length])';

  // ---- unload in the city, rebuild on the way back ----
  if (!(await until('TrS2.built'))) return { covered, ok: false, notes: 'the rooftops are not built on entry' };
  const [fa, fb] = await both(FP);
  await go('city');
  const [ca, cb] = await both('TrS2.built');
  if (ca || cb) return { covered, ok: false, notes: `still built in the city: ${ca} / ${cb}` };
  await go('tr_s2');
  if (!(await until('TrS2.built'))) return { covered, ok: false, notes: 'the rooftops were not rebuilt' };
  const [la, lb] = await both("Life.log.some((r) => r.world === 'tr_s2')");
  if (!la || !lb) return { covered, ok: false, notes: `no unload logged: ${la} / ${lb}` };
  const [ga, gb] = await both(FP);
  if (ga !== fa || gb !== fb) return { covered, ok: false, notes: `fingerprint changed: ${fa} -> ${ga}, ${fb} -> ${gb}` };
  covered.push(`unloaded in the city, rebuilt with the same fingerprint ${ga} (both)`);

  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  // test setup on the host: section 1, ladder up, plank standing
  await A.ev('Story.ctx.set((s) => { s.x.sec = 1; s.x.ladder = false; s.x.plank = false; s.x.hold = []; }); 1');
  await sleep(1500);
  // the ground under a point (relative to the world), -Infinity over the void
  const ground = (x, y, z) => `Phys.groundAt(TrS2.O.x + ${x}, TrS2.O.y + ${y}, TrS2.O.z + ${z}) - TrS2.O.y`;

  // ---- the Dame's winch: the fire ladder comes down, its steps collide ----
  await dame.ev("Story.ctx.act({ a: 'winch' }); 1");
  await sleep(1800);
  const [la2, lb2] = await both('Story.S.x.ladder');
  const [sa, sb] = await both(ground(4.9, 3, 56.5));
  if (!(la2 && lb2 && sa > 2 && sb > 2))
    return { covered, ok: false, notes: `ladder not down on both screens: ${JSON.stringify({ la2, lb2, sa, sb })}` };
  covered.push(`dame winch (${who(dame)}): ladder down, its steps solid on both screens`);

  // ---- the Valet's push: the plank falls across the gap ----
  await valet.ev("Story.ctx.act({ a: 'plank' }); 1");
  await sleep(1800);
  const [pa, pb] = await both('Story.S.x.plank');
  const [ka, kb] = await both(ground(-3.5, 1.5, 78));
  if (!(pa && pb && ka > -1 && kb > -1))
    return { covered, ok: false, notes: `plank not across on both screens: ${JSON.stringify({ pa, pb, ka, kb })}` };
  covered.push(`valet pushes the plank (${who(valet)}): it lies across the gap and holds on both screens`);
  return { covered, ok: true };
};
