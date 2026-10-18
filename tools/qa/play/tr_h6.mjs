// tr_h6 « Le Jardin » (dame = light and grapple, valet = water): the world is unloaded in the city
// and rebuilt identical on both pages. Then, with real input (Input.sim, tools/qa/campaign/lib.js;
// a bud grows while E is held facing it, the level's update() sends the aim):
// - stage 1, the vine needs both: the dame alone holds E on it 4 s: it does not grow; the valet
//   holds E too: grown on both screens, its bridge solid on both; both walk the vine bridge to
//   the far bank: stage 2 on both screens;
// - stage 4, the grapple: before the sunflower grows the dame cannot lock its ring; both grow it
//   (E held); the valet aims at the ring and presses F: nothing (not his kit); the dame aims, F:
//   she flies (a grapple on the partner's screen) and lands on the far terrace, on both screens.
// Setup labelled in notes: stage 4 set by the host, both put on the terrace T1.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuild, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('tr_h6', 'H6')}, ${meshes('H6.screen.mesh')}, Object.keys(H6.buds).length, Object.keys(H6.RINGS).length])`;
  const rb = await rebuild(ctx, 'tr_h6', { world: 'tr_h6', fp: FP, built: 'H6.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const grown = (id) => `!!(Story.S.x.grown && Story.S.x.grown[${JSON.stringify(id)}])`;
  const walk = (p, pts, near = 0.45) =>
    p.ev(`(async () => { for (const q of ${JSON.stringify(pts)}) if (!(await CB.trek(H6.P(q[0], q[1], q[2]), ${near}, 12000))) return JSON.stringify(H6.rel(Player.body.p)); return true; })()`);
  // hold E facing a bud for ms (or until it is grown)
  const hold = (p, id, ms) =>
    p.ev(`(async () => { const b = H6.buds[${JSON.stringify(id)}], t0 = performance.now();
      while (performance.now() - t0 < ${ms} && !(${grown(id)})) { const q = Player.body.p; Cam.yaw = Math.atan2(b.pos.x - q.x, b.pos.z - q.z); Input.sim.held.add('interact'); await CB.sl(100); }
      Input.sim.held.delete('interact'); return ${grown(id)}; })()`);
  const aim = (p, ring) =>
    p.ev(`(async () => { const r = H6.P(...H6.RINGS.${ring}.pos);
      for (let i = 0; i < 12; i++) { const q = Player.body.p, dx = r.x - q.x, dy = r.y - 1.2 - q.y, dz = r.z - q.z;
        Cam.yaw = Math.atan2(dx, dz); Cam.pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.95, 1.2); await CB.sl(40); }
      return Player.lockTarget; })()`);
  try {
    // ---- stage 1: the vine ----
    const sd = (p) => (p === dame ? -1 : 1);
    await Promise.all([walk(dame, [[-1.5, 0, 11.5]], 0.4), walk(valet, [[1.5, 0, 11.5]], 0.4)]);
    await hold(dame, 'vine', 4000);
    await sleep(500);
    if ((await both(A, B, grown('vine'))).some((v) => v)) return fail('the vine grew from the dame alone');
    covered.push(`${who(dame)} as dame alone holds E on the vine 4 s: it does not grow (it needs both)`);
    const g = await Promise.all([hold(dame, 'vine', 20000), hold(valet, 'vine', 20000)]);
    if (!(await untilBoth(A, B, `${grown('vine')} && H6.buds.vine.cols[0].on`, 5000))) return fail(`vine not grown / bridge not solid on both screens ${JSON.stringify(g)}`);
    covered.push('both hold E on the vine: grown on both screens, its bridge solid on both');
    const br = (s) => [[0.4 * s, 0, 13.6], [0.4 * s, 0, 22], [0.4 * s, 0, 30.5], [1.5 * s, 0, 34]];
    const w = await Promise.all([walk(dame, br(-1)), walk(valet, br(1))]);
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 2', 8000))) return fail(`vine bridge: ${JSON.stringify(w)}`);
    covered.push('both walk the vine bridge to the far bank: stage 2 on both screens');

    // ---- stage 4: the sunflower and its ring ----
    await A.ev('Story.ctx.set((s) => { s.x.stage = 4; }); 1');
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 4', 4000))) return fail('stage 4 not on both screens');
    await sleep(600);
    await dame.ev('Story.ctx.spawn(H6.P(-4, 6.05, 93), 0); 1');
    await valet.ev('Story.ctx.spawn(H6.P(8.5, 6.05, 93), 0); 1');
    notes.push('setup: stage 4, both put on the terrace T1');
    await sleep(1200);
    const l0 = await aim(dame, 'sun');
    if (l0 !== -1) return fail(`the ring locked before the sunflower grew (${l0})`);
    covered.push('ring of the sunflower: no lock for the dame before it grows');
    await walk(dame, [[2.5, 6, 93]], 0.4);
    const gs = await Promise.all([hold(dame, 'sun', 30000), hold(valet, 'sun', 30000)]);
    if (!(await untilBoth(A, B, grown('sun'), 5000))) return fail(`sunflower not grown: ${JSON.stringify(gs)}`);
    covered.push('both hold E on the sunflower: grown on both screens');
    await walk(valet, [[-3, 6, 93]], 0.4);
    const lv = await aim(valet, 'sun');
    await valet.ev("CB.tap('ability')");
    await sleep(500);
    if (lv !== -1 || (await valet.ev('Player.mode')) === 'grapple') return fail(`the valet locked / grappled the ring (${lv})`);
    covered.push(`${who(valet)} as valet aims at the ring and presses F: no lock, no grapple`);
    await walk(valet, [[8.5, 6, 93]], 0.4);
    await walk(dame, [[-4, 6, 93]], 0.4);
    await valet.ev("window.__gr = { seen: false }; window.__grT = setInterval(() => { if (Remote.state.mode === 'grapple') __gr.seen = true; }, 30); 1");
    const ld = await aim(dame, 'sun');
    if (ld < 0) return fail(`the dame could not lock the ring after it grew (${ld})`);
    await dame.ev("CB.tap('ability')");
    if (!(await until(dame, "Player.mode === 'grapple'", 1500, 30))) return fail('F with the ring locked: no grapple');
    await until(dame, "Player.mode !== 'grapple'", 5000, 50);
    await until(dame, 'Player.body.grounded', 4000, 50);
    await sleep(800);
    const q = await json(dame, 'H6.rel(Player.body.p).toArray().map((v) => +v.toFixed(2))');
    const seen = await valet.ev('clearInterval(__grT), __gr.seen');
    const there = await valet.ev(`H6.rel(Remote.pos).distanceTo(V3(${q.join(',')}))`);
    if (!(q[2] > 111.8 && q[1] > 5.5)) return fail(`grapple landing ${JSON.stringify(q)} (not on the far terrace)`);
    if (!seen || there > 0.6) return fail(`the partner's screen: grapple seen ${seen}, partner ${there.toFixed(2)} m off`);
    covered.push(`${who(dame)} as dame: ring locked, F: grapple (seen on the partner's screen), landed on the far terrace ${JSON.stringify(q)} on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
