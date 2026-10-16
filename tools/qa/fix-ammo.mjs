// The rifle's ammo counter (« 30 / 30 ») and the gun hand go away when a level turns combat off.
// Before the fix they were only refreshed by Combat.update(), which a level stops calling once it
// is left: after the Roi de Pique (tr_sR) the counter stayed on screen in the Valet de Pique
// (tr_sV), and the right mouse button still aimed instead of using the ability. Checked on both
// screens after the ways out of a combat level: to another level, to the city, and into the film.
//   node tools/qa/fix-ammo.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

const STATE = `JSON.stringify((() => {
  const e = [...document.body.children].find((d) => d.tagName === 'DIV' && d.innerHTML.includes('RECHARGER'));
  return { phase: Story.S.phase, kit: Story.role, combat: Combat.on, counter: !!e && e.style.opacity !== '0', gunHand: Input.gunHand };
})())`;

run('ammo', async ({ A, B, go, sleep, log }) => {
  const rows = [];
  let ok = true;
  const both = async () => [JSON.parse(await A.ev(STATE)), JSON.parse(await B.ev(STATE))];
  // in a combat level: the one with the rifle sees the counter; then the way out
  const trip = async (lv, out, how) => {
    if (!(await go(lv))) return { lv, ok: false, why: lv + ' did not load' };
    let rifle = false;
    for (let i = 0; i < 40 && !rifle; i++) {
      await sleep(500);
      rifle = (await both()).some((s) => s.combat && s.kit === 'dame' && s.counter && s.gunHand);
    }
    await sleep(1000);
    await how();
    await sleep(2000);
    const after = await both();
    const gone = after.every((s) => !s.counter && !s.gunHand);
    const row = { from: lv, to: out, rifleInside: rifle, after, ok: rifle && gone };
    log(JSON.stringify(row));
    return row;
  };
  rows.push(await trip('tr_sR', 'tr_sV', () => go('tr_sV')));
  rows.push(await trip('garde', 'city', () => go('city')));
  rows.push(await trip('tr_ufo', 'city', () => go('city')));
  // the film of the spade table starts inside tr_sR, with combat turned off
  rows.push(
    await trip('tr_sR', 'film (tr_sR stage 3)', () => A.ev('Story.ctx.set((s) => { s.x.stage = 3; s.x.seen = []; }); 1')),
  );
  for (const r of rows) if (!r.ok) ok = false;
  return { ok, rows, notes: ok ? 'counter and gun hand gone after every way out, on both screens' : 'the counter or the gun hand stayed after leaving combat' };
});
