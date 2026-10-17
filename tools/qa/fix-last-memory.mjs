// The last memory comes during the city visit. Every épreuve done, the newest world memory still to
// look at: once both players have looked at it (E), the last memory ('danse') has to appear on both
// screens, be looked at by both, and the city has to open act3. Before: 'danse' was only shown by
// the city's enter (never during the visit), and the 'seen' of the previous memory already counted
// as both players having looked at the last one, so the game stayed stuck in the city.
//   node tools/qa/fix-last-memory.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

// a player walks to a memory and presses E (keydown/keyup like the keyboard)
const look = async (p, id, sleep) => {
  await p.ev(`(() => { const e = City.places[${JSON.stringify(id)}].entry;
    Player.body.p.set(e.x, e.y + 0.2, e.z); Player.body.v && Player.body.v.set(0, 0, 0); return 1; })()`);
  await sleep(400);
  await p.ev("dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); 1");
  await sleep(250);
  await p.ev("dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); 1");
  await sleep(1500);
  // the memory card opens; the player reads it, then closes it with its button
  const open = await p.ev("!document.getElementById('memory').hidden");
  await p.ev("document.getElementById('memClose').click(); 1");
  await sleep(600);
  return open;
};

run('last-memory', async ({ A, B, go, sleep, log }) => {
  // the save just before the end: every épreuve done, every world memory seen but the newest
  await A.ev(`Story.goto('city', (s) => {
    s.done = Trials.list.filter((t) => Trials.built(t)).map((t) => t.id);
    const mem = Lore.completed(s.done).map((w) => w.memory);
    s.seen = mem.slice(0, -1);
    s.x = {};
  }); 1`);
  const q = "Story.S.phase === 'city'";
  if (!((await A.until(q, 25000)) && (await B.until(q, 25000)))) return { ok: false, notes: 'city did not load' };
  await sleep(2500);
  const last = await A.ev('Lore.completed(Story.S.done).map((w) => w.memory).pop()');
  const cardLast = [await look(A, last, sleep), await look(B, last, sleep)];
  await sleep(1200);
  const shown = { A: await A.ev("City.places.danse.shown"), B: await B.ev("City.places.danse.shown") };
  const lastByEarly = await A.ev('(Story.S.x.lastBy || []).length');
  log(JSON.stringify({ newestWorldMemory: last, danseShown: shown, lastByBeforeDanse: lastByEarly }));
  // the stay on the bench must not count before 'danse' is looked at: 6 s, still in the city
  await sleep(6000);
  const stillCity = await A.ev(q);
  const cardDanse = [await look(A, 'danse', sleep), await look(B, 'danse', sleep)];
  const act3 = (await A.until("Story.S.phase === 'act3'", 20000)) && (await B.until("Story.S.phase === 'act3'", 20000));
  const r = { newestWorldMemory: last, cardLast, cardDanse, danseShown: shown, lastByBeforeDanse: lastByEarly, stillCityBeforeDanse: stillCity, act3 };
  log(JSON.stringify(r));
  return { ok: shown.A && shown.B && cardDanse.every(Boolean) && lastByEarly === 0 && stillCity && act3, ...r };
});
