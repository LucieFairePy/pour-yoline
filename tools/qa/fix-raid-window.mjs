// Le Caveau (raid), the Oracle's broken window.
//  1. Breaking a ritual clears the adds: the level kills every Pion, Spectre and Tour when the
//     sequence is complete. Before, it hit them with a sword blow (999 damage, stun 1), and the
//     weapon rules let a Tour (only the rifle hurts it) and a Spectre not lit by the rifle shrug it
//     off: they stayed in the window.
//  2. The last phase has two Regards (4 s and 10.5 s into the window), closer together than the
//     Égide's 10 s cooldown: the Valet who raised it at the first one could not raise it at the
//     second, which always hit. Here the Valet presses F (Input.sim) the moment each Regard is
//     announced, both players standing together: no Regard may land on them.
//   node tools/qa/fix-raid-window.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

run('raid-window', async ({ A, B, go, sleep, log }) => {
  if (!(await go('raid'))) return { ok: false, notes: 'raid did not load' };
  await A.until('Raid.built', 20000);
  await B.until('Raid.built', 20000);
  await sleep(2000);
  const dame = (await A.ev('Story.role')) === 'dame' ? A : B;
  const valet = dame === A ? B : A;
  // the arena: both inside, the host spawns the Oracle and deals the first ritual
  await A.ev('Story.ctx.set((s) => { s.x.stage = 3; }); 1');
  await sleep(500);
  await dame.ev('Story.ctx.spawn(Raid.arenaPos(-1, -9), 0); 1');
  await valet.ev('Story.ctx.spawn(Raid.arenaPos(1, -9), 0); 1');
  const r4 = 'Story.S.x.stage === 4 && Story.S.x.ritual';
  if (!((await A.until(r4, 15000)) && (await B.until(r4, 15000)))) return { ok: false, notes: 'the Oracle did not rise' };
  // the host records every hit on the players and keeps them up (only the Regards are counted)
  await A.ev(`window.__hurt = []; const h = Combat.hurt; Combat.hurt = (who, dmg) => { __hurt.push([who, dmg, +(performance.now() / 1000).toFixed(2)]); }; 1`);
  // the Valet reacts to each Regard's announcement with F, like a player would
  await valet.ev(`window.__gaze = []; const say = HUD.say; HUD.say = function (t, ...a) {
    if (t === CONFIG.raid.gaze) { __gaze.push(+(performance.now() / 1000).toFixed(2));
      Input.sim.held.add('ability'); setTimeout(() => Input.sim.held.delete('ability'), 150); }
    return say.call(this, t, ...a); }; 1`);
  // adds of every kind in the ritual (a Spectre not lit by the rifle, a shielded Tour)
  await A.ev(`['pion', 'spectre', 'tour'].forEach((k, i) => Enemies.spawn(k, Raid.arenaPos(-6 + i * 6, 8))); 1`);
  await sleep(1000);
  const addsQ = `JSON.stringify([...Enemies.list.values()].filter((e) => ['pion', 'spectre', 'tour'].includes(e.type)).map((e) => e.type))`;
  const addsBefore = JSON.parse(await A.ev(addsQ));
  // the activator (not the seer) completes the sequence (the level's own rune action)
  const act = (await A.ev('Story.S.x.seer')) === 'dame' ? valet : dame;
  for (let i = 0; i < 6 && (await A.ev('Story.S.x.ritual')); i++) {
    await act.ev(`(() => { const x = Story.S.x; Story.ctx.act({ a: 'rune', slot: (x.perm || [0, 1, 2, 3]).indexOf(x.seq[x.prog]) }); return 1; })()`);
    await sleep(500);
  }
  if (await A.ev('Story.S.x.ritual')) return { ok: false, notes: 'the ritual did not break' };
  // the window becomes one of the last phase (its two Regards); both stand together
  await A.ev('(() => { const o = Enemies.boss(); o.hp = o.max * 0.3; Story.ctx.set((s) => { s.x.ph = 3; }); return 1; })()');
  await valet.ev('Story.ctx.spawn(Raid.arenaPos(1, -9), 0); 1');
  await dame.ev('Story.ctx.spawn(Raid.arenaPos(0, -9), 0); 1');
  await sleep(1500);
  const addsAfter = { host: JSON.parse(await A.ev(addsQ)), guest: JSON.parse(await B.ev(addsQ)) };
  log(JSON.stringify({ addsBefore, addsAfter }));
  // the whole window: Regards at 4 s and 10.5 s (they land 2.6 s later)
  await sleep(13500);
  const gazes = await valet.ev('JSON.stringify(__gaze)');
  const hurt = JSON.parse(await A.ev('JSON.stringify(__hurt)'));
  const regards = hurt.filter((h) => h[1] === 70);
  const r = { addsBefore, addsAfter, gazesAnnounced: JSON.parse(gazes), regardHits: regards };
  log(JSON.stringify(r));
  const ok = addsBefore.length === 3 && !addsAfter.host.length && !addsAfter.guest.length && JSON.parse(gazes).length === 2 && !regards.length;
  return { ok, ...r };
});
