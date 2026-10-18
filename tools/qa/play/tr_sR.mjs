// tr_sR « Le Roi de Pique » (Salle du Trône, table of spades): the table's world waits through
// the city, is unloaded at another épreuve and rebuilt identical. Then, both in the throne
// room, the champion wakes (the fight on both screens) and:
// - a hit sent from the page of the one it faces (x.focus, as Combat would) is refused: its life
//   stays on both screens;
// - both fight with real input (Input.sim, the campaign's tactic: the focus keeps in front and
//   sidesteps, the other strikes its back with the sword or shoots the white core, everyone
//   jumps the shockwave rings): its life goes down on both screens.
import { hands, kits, who as W, until, untilBoth, both, json, release, rebuildHeld, owned, meshes } from '../play-kit.mjs';

export default async (ctx) => {
  const { A, B, sleep } = ctx;
  const covered = [];
  const notes = [];
  const who = W(A);
  const fail = (t) => ({ covered, ok: false, notes: [t, ...notes].join('; ') });
  const FP = `JSON.stringify([${owned('cour_s', 'CourS')}, ${meshes('CourS.root')}])`;
  const rb = await rebuildHeld(ctx, 'tr_sR', { world: 'cour_s', fp: FP, built: 'CourS.built' });
  if (!rb.ok) return fail(rb.notes);
  covered.push(rb.text);

  await hands(A, B);
  const { dame, valet } = await kits(A, B);
  for (const p of [A, B]) await p.ev('CB.W = CourS; 1');
  // the campaign's fight loop (tools/qa/campaign/levels/tr_sR.js), for ms or until stop()
  const FIGHT = (ms, stop) => `(async () => { const S = Input.sim, me = Story.role, X = () => Story.S.x, t0 = performance.now();
    const ringsNear = () => { const p = Player.body.p; for (const o of R.scene.children) { if (!o.isMesh || !o.geometry || o.geometry.type !== 'TorusGeometry' || !o.visible || o.position.y > CourS.O.y + 1) continue;
      const d = Math.hypot(p.x - o.position.x, p.z - o.position.z) - o.scale.x; if (d > 0.6 && d < 2.2) return true; } return false; };
    while (performance.now() - t0 < ${ms} && X().stage === 1 && !(${stop})) {
      const p = Player.body.p, b = Enemies.boss();
      if (ringsNear() && Player.body.grounded) { S.held.add('jump'); await CB.sl(60); S.held.delete('jump'); continue; }
      if (Combat.down) { CB.stop(); S.held.delete('attack'); await CB.sl(100); continue; }
      if (Remote.state && Remote.state.down) { S.held.delete('attack'); const rp = Remote.pos;
        if (Math.hypot(rp.x - p.x, rp.z - p.z) > 1.6) { Cam.yaw = Math.atan2(rp.x - p.x, rp.z - p.z); CB.steer(rp); S.held.add('sprint'); S.held.delete('interact'); } else { CB.stop(); S.held.add('interact'); }
        await CB.sl(40); continue; }
      S.held.delete('interact');
      if (!X().fight || !b) { await CB.walk([me === 'dame' ? -3 : 3, 0, 212], 0.6, 2000); continue; }
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), focus = X().focus === me; let spot;
      if (focus) { const side = b.st === 1 || b.st === 5 || b.st === 6 ? 3.5 : 0; spot = V3(b.pos.x + fx * 7.5 + fz * side, 0, b.pos.z + fz * 7.5 - fx * side); if (b.st === 2) spot = V3(b.pos.x + fx * 9, 0, b.pos.z + fz * 9); }
      else { const back = me === 'valet' ? 2.6 : 8; spot = V3(b.pos.x - fx * back, 0, b.pos.z - fz * back); }
      spot.x = clamp(spot.x, CourS.O.x - 15, CourS.O.x + 15); spot.z = clamp(spot.z, CourS.O.z + 192, CourS.O.z + 230);
      const d = Math.hypot(spot.x - p.x, spot.z - p.z);
      if (d > 0.7) { Cam.yaw = Math.atan2(spot.x - p.x, spot.z - p.z); CB.steer(spot); S.held.add('sprint'); } else { S.x = 0; S.z = 0; S.held.delete('sprint'); }
      if (!focus) {
        if (me === 'valet') { const db = Math.hypot(b.pos.x - p.x, b.pos.z - p.z); if (db < 4.0 && !(Combat.atkCd > 0)) { Cam.yaw = Math.atan2(b.pos.x - p.x, b.pos.z - p.z); S.held.add('attack'); await CB.sl(40); S.held.delete('attack'); } }
        else if (b.view && b.view.core) { const cp = b.view.core.getWorldPosition(V3()); if (d < 3) { CB.aim(cp); if (Combat.reloadT <= 0) S.held.add('attack'); } else S.held.delete('attack'); }
      } else S.held.delete('attack');
      await CB.sl(30);
    }
    CB.stop(); S.held.delete('attack'); S.held.delete('interact'); return [X().hp, X().focus]; })()`;
  try {
    // into the room until the champion wakes
    await Promise.all([A, B].map((p) => p.ev(FIGHT(30000, 'Story.S.x.fight && !!Enemies.boss()'))));
    if (!(await untilBoth(A, B, '!!Story.S.x.fight && Story.S.x.stage === 1', 5000))) return fail(`the champion did not wake: ${await A.ev('JSON.stringify(Story.S.x)')}`);
    covered.push('both walk into the throne room: the champion wakes on both screens');
    const focus = (await A.ev('Story.S.x.focus')) === 'dame' ? dame : valet;
    const hp0 = await A.ev('Enemies.boss().hp');
    const id = await A.ev('Enemies.boss().id');
    await focus.ev(`Story.ctx.act({ a: 'hit', id: ${JSON.stringify(id)}, dmg: 15, stun: 1, weak: true }); 1`);
    await sleep(600);
    const hp1 = await A.ev('Enemies.boss().hp');
    if (hp1 < hp0) return fail(`the focus hurt the champion: ${hp0} → ${hp1}`);
    covered.push(`a hit from the page of the one it faces (${who(focus)}) refused: its life unchanged`);
    const xhp0 = await A.ev('Story.S.x.hp');
    const r = await Promise.all([A, B].map((p) => p.ev(FIGHT(60000, `Story.S.x.hp < ${xhp0} - 0.04`))));
    if (!(await untilBoth(A, B, `Story.S.x.hp < ${xhp0} - 0.04 || Story.S.x.stage >= 2`, 5000))) return fail(`its life did not go down: ${JSON.stringify([xhp0, r])}`);
    const hp2 = await both(A, B, 'Story.S.x.hp');
    covered.push(`both fight from behind (real sword / rifle hits, the rings jumped): its life ${xhp0} → ${hp2[0]} on both screens`);
  } finally {
    await release(A, B);
  }
  return { covered, ok: true, notes: notes.join('; ') };
};
