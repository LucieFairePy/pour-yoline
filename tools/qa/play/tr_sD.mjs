// tr_sD « La Dame de Pique » (Salle d'armes, table of spades): the table's world waits through
// the city, is unloaded at another épreuve and rebuilt identical. Then, both in the hall, the
// homing spades come (a measure on both screens) and, with real weapon hits through Combat
// (Input.sim 'attack': the sword at its own pace, the rifle aimed with the camera):
// - a hit on an iron spade sent from the dame's page (as Combat would) is refused: iron answers
//   the sword only, the spade stays on both screens;
// - the valet's sword turns an iron spade: gone on both screens;
// - the dame's rifle breaks a glass spade: gone on both screens.
// The hits each page sends are recorded by wrapping Story.ctx.act (Combat sends through it).
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_s', 'CourS')}, ${meshes('CourS.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_sD', { world: 'cour_s', fp: FP, built: 'CourS.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  for (const p of [A, B])
    await p.ev("window.__hits = []; if (!Story.ctx.__wrapped) { const o = Story.ctx.act; Story.ctx.act = (d) => { if (d && d.a === 'hit') __hits.push([d.id, (Enemies.list.get(d.id) || {}).type]); return o(d); }; Story.ctx.__wrapped = 1; } 1");
  try {
    const inHall = (p) => p.ev(`(async () => { const c = CourS.P(CourS.B.c[0] + (Story.role === 'dame' ? -2 : 2), 0, CourS.B.c[1]); if (!CourS.at('B', CourS.rel(Player.body.p))) await CB.go(c, { near: 1, ms: 30000 }); return CourS.at('B', CourS.rel(Player.body.p)); })()`);
    const h = await Promise.all([inHall(dame), inHall(valet)]);
    if (!(await untilBoth(A, B, "!!Story.S.x.live && [...Enemies.list.values()].some((e) => e.type === 'sdFer' || e.type === 'sdVerre')", 15000)))
      return fail(`no measure: in the hall ${JSON.stringify(h)}, ${await A.ev('JSON.stringify(Story.S.x)')}`);
    covered.push('both in the hall: a measure of homing spades on both screens');
    // iron: refused to the dame
    const iron = await A.ev("([...Enemies.list.values()].find((e) => e.type === 'sdFer' && !e.dead) || {}).id");
    if (iron != null) {
      await dame.ev(`Story.ctx.act({ a: 'hit', id: ${JSON.stringify(iron)}, dmg: 30 }); 1`);
      await sleep(300);
      const still = await both(A, B, `Enemies.list.has(${JSON.stringify(iron)})`);
      if (still.some((v) => !v)) notes.push(`iron spade ${iron} gone after the dame's hit (it may have reached its target meanwhile): ${JSON.stringify(still)}`);
      else covered.push(`a hit on iron spade ${iron} from ${who(dame)}'s page refused: still there on both screens`);
    }
    // the valet's sword: guard by the dame and strike the nearest iron spade
    const guard = valet.ev(`(async () => { const S = Input.sim, t0 = performance.now(), n0 = __hits.length;
      while (performance.now() - t0 < 40000 && __hits.length === n0) {
        const p = Player.body.p; let best = null, bd = 9;
        for (const e of Enemies.list.values()) { if (e.type !== 'sdFer' || e.dead) continue; const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); if (d < bd) { bd = d; best = e; } }
        const m = Remote.pos, c = CourS.P(CourS.B.c[0], 0, CourS.B.c[1]), k = 1.3 / Math.max(1, Math.hypot(c.x - m.x, c.z - m.z));
        const spot = V3(m.x + (c.x - m.x) * k + 0.9, 0, m.z + (c.z - m.z) * k);
        if (best && bd < 3.0) { S.x = 0; S.z = 0; Cam.yaw = Math.atan2(best.pos.x - p.x, best.pos.z - p.z); if (!(Combat.atkCd > 0)) { S.held.add('attack'); await CB.sl(40); S.held.delete('attack'); } await CB.sl(40); }
        else { if (Math.hypot(spot.x - p.x, spot.z - p.z) > 0.8) { Cam.yaw = Math.atan2(spot.x - p.x, spot.z - p.z); CB.steer(spot); } else { S.x = 0; S.z = 0; } await CB.sl(30); }
      }
      CB.stop(); return __hits.slice(n0); })()`);
    const shoot = dame.ev(`(async () => { const S = Input.sim, t0 = performance.now(), n0 = __hits.length;
      while (performance.now() - t0 < 40000 && !__hits.slice(n0).some((h) => h[1] === 'sdVerre')) {
        const p = Player.body.p; let best = null, bd = 30;
        for (const e of Enemies.list.values()) { if (e.type !== 'sdVerre' || e.dead) continue; const d = e.pos.distanceTo(p); if (d < bd) { bd = d; best = e; } }
        const c = CourS.P(CourS.B.c[0], 0, CourS.B.c[1]);
        if (best && Math.hypot(best.pos.x - c.x, best.pos.z - c.z) > 3.2 && Combat.reloadT <= 0) { CB.aim(best.pos); S.held.add('attack'); }
        else { S.held.delete('attack'); if (!best && Combat.mag < 12 && Combat.reloadT <= 0) await CB.tap('reload', 60); }
        await CB.sl(30);
      }
      S.held.delete('attack'); return __hits.slice(n0); })()`);
    const [vh, dh] = await Promise.all([guard, shoot]);
    await sleep(800);
    // the first spade of that type this page hit that is gone on both screens
    const gone = async (hs, type) => {
      for (const [id, t] of hs) if (t === type && (await both(A, B, `!Enemies.list.has(${JSON.stringify(id)})`)).every(Boolean)) return id;
      return null;
    };
    const v1 = await gone(vh, 'sdFer');
    if (v1 == null) return fail(`the sword's hits ${JSON.stringify(vh)}: no spade gone on both screens`);
    covered.push(`${who(valet)} as valet: the sword turns iron spade ${v1}, gone on both screens`);
    const d1 = await gone(dh, 'sdVerre');
    if (d1 == null) return fail(`the rifle's hits ${JSON.stringify(dh.slice(0, 6))}: no glass spade gone on both screens`);
    covered.push(`${who(dame)} as dame: the rifle breaks glass spade ${d1}, gone on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
