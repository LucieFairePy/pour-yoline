// tr_hV « Le Valet de Cœur » (la serre, table of hearts; round 0: the dame cuts, the valet guides):
// the table's world waits through the city, is unloaded at another épreuve and rebuilt
// identical. Then, with real input (Input.sim, tools/qa/campaign/lib.js; the marked bushes are
// those the guide's screen shows from the belvédère, CourH.dbgV.deal()):
// - the valet walks round the disc and up the stairs to the belvédère: the marks are drawn on
//   his screen only;
// - a cut sent from the guide's page (as the level would) is refused: not the cutter;
// - the dame cuts a bush that is not marked (E): wrong on both screens, the roses re-dealt;
// - she cuts a marked bush (E): one rose in the bouquet on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_h', 'CourH')}, ${meshes('CourH.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_hV', { world: 'cour_h', fp: FP, built: 'CourH.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  const x = (p) => json(p, '{ stage: Story.S.x.stage, round: Story.S.x.round, cut: Story.S.x.cut | 0, roll: Story.S.x.roll | 0, bouquet: (Story.S.x.bouquet || []).length }');
  // chase slot i of the (maybe turning) garden, 0.9 m outward of the bush, and press E
  const CUT = `const cutSlot = async (i, ms = 25000) => { const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        const sp = CourH.slotPos(i, CourH.dbgV.angNow()), b = Player.body.p, cx = CourH.O.x + CourH.GARDEN.x, cz = CourH.O.z + CourH.GARDEN.z;
        const ox = sp.x - cx, oz = sp.z - cz, ol = Math.hypot(ox, oz) || 1, t = V3(sp.x + (ox / ol) * 0.9, 0, sp.z + (oz / ol) * 0.9);
        if (Math.hypot(t.x - b.x, t.z - b.z) < 0.35) { CB.stop(); await CB.sl(120); await CB.tap('interact'); return true; }
        Cam.yaw = Math.atan2(t.x - b.x, t.z - b.z); CB.steer(t); await CB.sl(30);
      }
      CB.stop(); return false; };`;
  try {
    if ((await A.ev("['dame', 'valet'][Math.min(Story.S.x.round, 1)]")) !== 'dame') return fail('round 0 cutter is not the dame');
    const up = await valet.ev(`(async () => { const s = 1, q = CourH.rel(Player.body.p);
      if (q.z < 26) { await CB.trek(CourH.P(s * 9.4, 0, Math.max(q.z, 10)), 0.5, 12000); await CB.trek(CourH.P(s * 9.4, 0, 25.6), 0.5, 12000); }
      await CB.trek(CourH.P(s * 6.6, 0, 25.9), 0.4, 8000); await CB.trek(CourH.P(s * 6.6, 4.2, 37.5), 0.5, 15000); await CB.trek(CourH.P(s * 3, 4.2, 39), 0.6, 8000);
      Cam.yaw = Math.PI; Cam.pitch = 0.42; return CourH.onBelv(Player.body.p); })()`);
    if (!up) return fail(`${who(valet)} did not reach the belvédère ${await valet.ev('JSON.stringify(CourH.rel(Player.body.p))')}`);
    await sleep(800);
    const marks = await both(A, B, '!!CourH.ST.marksOn');
    const mDame = dame === A ? marks[0] : marks[1];
    const mValet = valet === A ? marks[0] : marks[1];
    if (!mValet || mDame) return fail(`marks drawn: dame ${mDame}, valet ${mValet}`);
    covered.push(`${who(valet)} as guide walks up to the belvédère: the marks drawn on his screen only`);
    const D = await json(A, 'CourH.dbgV.deal().marks');
    const s0 = await x(A);
    await valet.ev(`Story.ctx.act({ a: 'cut', i: ${D[0]}, ang: CourH.dbgV.angNow() }); 1`);
    await sleep(800);
    if (JSON.stringify(await x(A)) !== JSON.stringify(s0)) return fail(`the guide cut a rose: ${JSON.stringify(await x(A))}`);
    covered.push("a cut from the guide's page (the level's action) refused");
    const nSlots = await A.ev('CourH.SLOTS.length');
    const wrong = [...Array(nSlots).keys()].find((i) => !D.includes(i));
    await dame.ev(`(async () => { ${CUT} return cutSlot(${wrong}); })()`);
    if (!(await untilBoth(A, B, `(Story.S.x.roll | 0) === ${s0.roll + 1} && (Story.S.x.cut | 0) === 0`, 4000))) return fail(`unmarked bush ${wrong}: ${JSON.stringify(await x(A))}`);
    covered.push(`${who(dame)} as cutter cuts bush ${wrong}, not marked (E): wrong on both screens, re-dealt`);
    await sleep(1500);
    const D2 = await json(A, 'CourH.dbgV.deal().marks');
    await dame.ev(`(async () => { ${CUT} return cutSlot(${D2[0]}); })()`);
    if (!(await untilBoth(A, B, `((Story.S.x.cut | 0) & ${1 << D2[0]}) !== 0 && (Story.S.x.bouquet || []).length === ${s0.bouquet + 1}`, 4000)) && !(await untilBoth(A, B, `((Story.S.x.cut | 0) & ${1 << D2[0]}) !== 0`, 1000)))
      return fail(`marked bush ${D2[0]}: ${JSON.stringify(await x(A))}`);
    covered.push(`she cuts marked bush ${D2[0]} (E): the rose in the bouquet on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
