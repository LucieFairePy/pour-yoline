// tr_h7 « Le Bal »: the world is unloaded in the city and rebuilt identical on both pages. Then,
// with real input (Input.sim, tools/qa/campaign/lib.js):
// - stage 1: both walk through the doorway into the salon: the waltz (stage 2) on both screens;
// - stage 3, the masked ball: each picks a sign at a pedestal (E): both signs on both screens; each
//   walks to their own curtain: the crowd (mask 1), each placed apart and the partner no longer
//   drawn on either screen; an invitation sent from far away (as the level would) is refused by
//   the host; both walk to each other and invite (E): found (mask 2) on both screens, the partner
//   drawn again.
// Setup labelled in notes: stage 3 set by the host, both put at the corridor of the signs.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuild, owned, meshes } from '../play-kit.mjs';

const MATE = 'R.scene.children.filter((o) => o.isGroup && o !== Player.avatar.root && o.position.distanceTo(Remote.pos) < 0.05).some((o) => o.visible)';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('tr_h7', 'H7')}, ${meshes('H7.screen.mesh')}, H7.SPOTS.length, H7.crowd.length, H7.wanderers.length])`;
  const rb = await rebuild(ctx, 'tr_h7', { world: 'tr_h7', fp: FP, built: 'H7.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, sig: Story.S.x.sig, mask: Story.S.x.mask }');
  const walk = (p, pts, near = 0.45, stop = 'false') =>
    p.ev(`(async () => { for (const q of ${JSON.stringify(pts)}) { if (${stop}) return true; if (!(await CB.trek(H7.P(q[0], q[1], q[2]), ${near}, 12000, () => ${stop}))) return false; } return true; })()`);
  try {
    // ---- stage 1: into the salon ----
    for (const p of [A, B]) await p.ev('Story.ctx.spawn(H7.spawn ? H7.spawn(1, Story.role, {}) : Player.body.p.clone(), Math.PI); 1');
    await sleep(600);
    const path1 = (s) => [[s * 0.7, 0, -12.5], [s * 0.7, 0, -16], [s * 1.5, 0, -18]];
    const r1 = await Promise.all([walk(dame, path1(-1)), walk(valet, path1(1))]);
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 2', 8000))) return fail(`not in the salon: ${JSON.stringify(r1)}`);
    covered.push('both walk through the doorway into the salon: the waltz (stage 2) on both screens');

    // ---- stage 3: the masked ball ----
    await A.ev('Story.ctx.set((s) => { s.x.stage = 3; s.x.mask = 0; s.x.sig = { dame: null, valet: null }; }); 1');
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 3', 4000))) return fail('stage 3 not on both screens');
    await sleep(800);
    for (const p of [A, B]) await p.ev("Story.ctx.spawn(H7.P((Story.role === 'dame' ? -1 : 1) * 0.8, 0.05, -47), Math.PI); 1");
    notes.push('setup: stage 3, both put at the corridor of the signs');
    await sleep(800);
    const pick = async (p, s, sign) => {
      const px = [-3.4, -1.7, 0, 1.7, 3.4][await p.ev(`H7.SIGNS.indexOf(${JSON.stringify(sign)})`)];
      await walk(p, [[s * 0.8, 0, -51.2], [px, 0, -52.5]], 0.3);
      for (let i = 0; i < 6 && !(await p.ev('!!Story.S.x.sig[Story.role]')); i++) {
        await p.ev(`CB.face([${px}, 1, -53.6]); CB.tap('interact')`);
        await sleep(400);
      }
    };
    await pick(dame, -1, 'coeur');
    await pick(valet, 1, 'eventail');
    if (!(await untilBoth(A, B, "Story.S.x.sig.dame === 'coeur' && Story.S.x.sig.valet === 'eventail'", 4000))) return fail(`signs: ${JSON.stringify([await x(A), await x(B)])}`);
    covered.push(`signs picked at the pedestals (E) by ${who(dame)} as dame and ${who(valet)} as valet: both on both screens`);
    // an invitation before the crowd: refused
    await dame.ev("Story.ctx.act({ a: 'h7inv' }); 1");
    await sleep(600);
    if ((await A.ev('Story.S.x.mask')) !== 0) return fail('an invitation before the crowd was taken');
    const curtain = (p, s) => walk(p, [[s * 4.4, 0, -52.5], [s * 4.4, 0, -55.2], [s * 2.55, 0, -56.8]], 0.35, 'Story.S.x.mask === 1');
    await Promise.all([curtain(dame, -1), curtain(valet, 1)]);
    if (!(await untilBoth(A, B, 'Story.S.x.mask === 1 && !!Story.S.x.spots', 8000))) return fail(`not in the crowd: ${JSON.stringify(await x(A))}`);
    await sleep(1500);
    const hidden = await both(A, B, MATE);
    if (hidden.some((v) => v)) return fail(`partner still drawn in the crowd: ${JSON.stringify(hidden)}`);
    const apart = await dame.ev('Math.hypot(Player.body.p.x - Remote.pos.x, Player.body.p.z - Remote.pos.z)');
    covered.push(`both through their curtains: the crowd on both screens, ${apart.toFixed(0)} m apart, the partner hidden on both screens`);
    await dame.ev("Story.ctx.act({ a: 'h7inv' }); 1");
    await sleep(800);
    if ((await A.ev('Story.S.x.mask')) !== 1) return fail(`an invitation ${apart.toFixed(0)} m apart was taken`);
    covered.push(`an invitation ${apart.toFixed(0)} m apart (the level's action) refused by the host`);
    // both walk to each other and invite (E)
    const meet = (p) =>
      p.ev(`(async () => { const t0 = performance.now(); let inv = 0;
        while (performance.now() - t0 < 60000 && Story.S.x.mask === 1) {
          const b = Player.body.p, r = Remote.pos, d = Math.hypot(b.x - r.x, b.z - r.z);
          if (d > 0.9) { Cam.yaw = Math.atan2(r.x - b.x, r.z - b.z); CB.steer(r); if (d > 4) Input.sim.held.add('sprint'); else Input.sim.held.delete('sprint'); } else CB.stop();
          if (d < 1.8 && performance.now() - inv > 1400) { inv = performance.now(); CB.stop(); CB.face(Remote.pos); await CB.sl(60); await CB.tap('interact'); }
          await CB.sl(40);
        }
        CB.stop(); return Story.S.x.mask; })()`);
    const m = await Promise.all([meet(dame), meet(valet)]);
    if (!(await untilBoth(A, B, 'Story.S.x.mask === 2', 4000))) return fail(`not found: ${JSON.stringify(m)}`);
    if (!(await untilBoth(A, B, MATE, 4000))) return fail('the partner not drawn again once found');
    covered.push('both walk to each other in the crowd and invite (E): found on both screens, the partner drawn again');
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
