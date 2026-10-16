// A level's fall line and respawn don't outlive it. tr_d10 (Le Lac gelé) set Player.killY just under
// its ice and a checkpoint that reads its own state; after the win the reward phase kept them, the
// player was under that line, and the checkpoint threw on every frame (S.x had no stage): the
// reward never ended. Here: win state of tr_d10 → reward with a player below the old line → the
// reward must end in the city on both screens, without a page exception.
//   node tools/qa/fix-stale-checkpoint.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

run('stale-checkpoint', async ({ A, B, go, sleep, log, chrome }) => {
  if (!(await go('tr_d10'))) return { ok: false, notes: 'tr_d10 did not load' };
  await sleep(2500);
  const killY = await A.ev('Player.killY');
  // the reward of tr_d10, the players still standing in the lake (below the level's fall line)
  await A.ev("Story.goto('reward', (s) => { s.x.card = 'd10'; }); 1");
  await A.until("Story.S.phase === 'reward'", 15000);
  await B.until("Story.S.phase === 'reward'", 15000);
  for (const p of [A, B]) await p.ev(`Player.body.p.y = ${killY - 2}; 1`);
  const n0 = chrome.errors.length;
  let city = false;
  for (let i = 0; i < 60 && !city; i++) {
    await sleep(500);
    city = (await A.ev("Story.S.phase === 'city'")) && (await B.ev("Story.S.phase === 'city'"));
  }
  const errs = chrome.errors.slice(n0).filter((e) => e.kind === 'exception');
  log(JSON.stringify({ levelKillY: killY, rewardEndedInCity: city, exceptions: errs.length }));
  return { ok: city && !errs.length, levelKillY: killY, rewardEndedInCity: city, exceptions: errs.length, first: errs[0] && errs[0].text };
});
