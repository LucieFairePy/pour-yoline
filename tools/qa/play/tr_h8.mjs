// tr_h8 « L'Averse » (kits swapped: Yoline plays the valet): the world is unloaded in the city and
// rebuilt identical on both pages. Then, with real input (Input.sim, tools/qa/campaign/lib.js):
// - stage 1, one umbrella (the valet holds it): the dame walks 6 m away and presses E: no pass
//   (and the same pass sent as the level would is refused by the host: too far); she walks back
//   under it and presses E: the umbrella is hers on both screens; the valet takes it back (E);
// - stage 5, the grapple (the player mechanic, Player.targets / grappleLand): the valet aims at
//   the ring and presses F: nothing (not his kit); the dame aims at it (camera) until it locks
//   and presses F: she flies on the rope (seen as a grapple on the partner's screen) and lands on
//   the spot past the chasm, on both screens.
// Setup labelled in notes: stage 5 set by the host, both put on the dark roof before the ring.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuild, owned } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('tr_h8', 'H8')}, (() => { let m = 0, n = 0; H8.root.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) m++; if (o.isInstancedMesh) n += o.count; }); return [m, n]; })(), !!H8.RING_B.wp])`;
  const rb = await rebuild(ctx, 'tr_h8', { world: 'tr_h8', fp: FP, built: 'H8.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, umb: Story.S.x.umb, pass: Story.S.x.pass }');
  try {
    // ---- stage 1: the umbrella ----
    await A.ev("Story.ctx.set((s) => { s.x.stage = 1; s.x.umb = 'valet'; s.x.pass = 0; }); 1");
    await sleep(800);
    for (const p of [A, B]) await p.ev("Story.ctx.spawn(H8.spawn(1, Story.role, { shelter: 'bus' }), 0); 1");
    notes.push('setup: stage 1, both put in the bus shelter');
    await sleep(1500);
    await dame.ev('CB.walk(H8.P(-2, 0, 1.2), 0.4, 6000)');
    const far = await dame.ev('Math.hypot(Player.body.p.x - Remote.pos.x, Player.body.p.z - Remote.pos.z)');
    await dame.ev("CB.tap('interact')");
    await dame.ev("Story.ctx.act({ a: 'pass' }); 1");
    await sleep(1000);
    const s0 = [await x(A), await x(B)];
    if (s0.some((s) => s.umb !== 'valet' || s.pass)) return fail(`umbrella passed ${far.toFixed(1)} m apart: ${JSON.stringify(s0)}`);
    covered.push(`umbrella pass ${far.toFixed(1)} m apart refused: E and the level's action from ${who(dame)} (both screens)`);
    await dame.ev('CB.walk(Remote.pos.clone().add(V3(-1.2, 0, 0)), 0.3, 6000)');
    await sleep(300);
    await dame.ev("CB.tap('interact')");
    if (!(await untilBoth(A, B, "Story.S.x.umb === 'dame' && Story.S.x.pass === 1", 4000))) return fail(`pass to the dame: ${JSON.stringify([await x(A), await x(B)])}`);
    covered.push(`${who(dame)} as dame takes the umbrella (E) under it: hers on both screens`);
    await sleep(1200);
    await valet.ev("CB.tap('interact')");
    if (!(await untilBoth(A, B, "Story.S.x.umb === 'valet' && Story.S.x.pass === 2", 4000))) return fail(`pass back to the valet: ${JSON.stringify([await x(A), await x(B)])}`);
    covered.push(`${who(valet)} as valet takes it back (E): his on both screens`);

    // ---- stage 5: the grapple ----
    await A.ev("Story.ctx.set((s) => { s.x.stage = 5; s.x.bridge = true; }); 1");
    if (!(await untilBoth(A, B, 'Story.S.x.stage === 5', 4000))) return fail('stage 5 not on both screens');
    await sleep(800);
    await dame.ev('Story.ctx.spawn(H8.P(-12.5, 16.65, 321.6), Math.PI); 1');
    await valet.ev('Story.ctx.spawn(H8.P(-11.5, 16.65, 321.0), Math.PI); 1');
    notes.push('setup: stage 5, both put on the dark roof before the ring');
    await sleep(1500);
    const aim = (p) =>
      p.ev(`(async () => { for (let k = 0; k < 60; k++) { CB.aim(H8.RING_B.wp); await new Promise((r) => requestAnimationFrame(r)); if (Player.lockTarget === 0) break; } return Player.lockTarget; })()`);
    const lv = await aim(valet);
    await valet.ev("CB.tap('ability')");
    await sleep(600);
    const vm = await valet.ev('Player.mode');
    if (lv !== -1 || vm === 'grapple') return fail(`the valet locked / grappled the ring: lock ${lv}, mode ${vm}`);
    covered.push(`${who(valet)} as valet aims at the ring and presses F: no lock, no grapple`);
    await valet.ev('Story.ctx.spawn(H8.spawn(5, "valet"), 0); 1');
    await sleep(800);
    // the partner's screen watches the flight
    await valet.ev("window.__gr = { seen: false }; window.__grT = setInterval(() => { if (Remote.state.mode === 'grapple') __gr.seen = true; }, 30); 1");
    const ld = await aim(dame);
    if (ld !== 0) return fail(`the dame could not lock the ring (lock ${ld}, ${await dame.ev('JSON.stringify(CB.rel())')})`);
    await dame.ev("CB.tap('ability')");
    const flew = await until(dame, "Player.mode === 'grapple'", 1500, 30);
    if (!flew) return fail('F with the ring locked: no grapple');
    const landed = await until(dame, "Player.mode === 'walk' && Player.body.grounded", 6000, 100);
    await sleep(800);
    const q = await json(dame, 'H8.rel(Player.body.p).toArray().map((v) => +v.toFixed(2))');
    const land = [-17, 15, 332];
    const off = Math.hypot(q[0] - land[0], q[2] - land[2]);
    const seen = await valet.ev('clearInterval(__grT), __gr.seen');
    const there = await valet.ev(`H8.rel(Remote.pos).distanceTo(V3(${q.join(',')}))`);
    if (!landed || off > 1.5 || Math.abs(q[1] - land[1]) > 0.6) return fail(`grapple landing ${JSON.stringify(q)} (${off.toFixed(2)} m from the spot)`);
    if (!seen || there > 0.6) return fail(`the partner's screen: grapple seen ${seen}, partner ${there.toFixed(2)} m off`);
    covered.push(`${who(dame)} as dame: ring locked by aiming, F: grapple (seen on the partner's screen), landed past the chasm ${JSON.stringify(q)} on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
