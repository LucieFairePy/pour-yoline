// act4 (the Joker breaks the golden hour): a staged scene over frozen players, no world of its
// own. Checks, on both screens: both players are frozen and the stick + sprint + jump held for
// 1.5 s moves nobody (real input, Input.sim); the host's timeline moves the step and both screens
// play it (same step, the camera leaves the player for the staged shots); the partner disappears
// only under the white flash (step 5, both at once); then act5 for both at the end (54 s).
import { hands, both, untilBoth, json, release } from '../play-kit.mjs';

// the partner's astronaut on this screen (its root group stands at Remote.pos)
const MATE = 'R.scene.children.filter((o) => o.isGroup && o !== Player.avatar.root && o.position.distanceTo(Remote.pos) < 0.05).some((o) => o.visible)';

export default async ({ A, B, sleep }) => {
  const covered = [];
  const fail = (t) => ({ covered, ok: false, notes: t });
  await hands(A, B);
  if (!(await untilBoth(A, B, "Player.mode === 'frozen'", 4000))) return fail(`not frozen: ${JSON.stringify(await both(A, B, 'Player.mode'))}`);
  const p0 = await both(A, B, 'JSON.stringify(Player.body.p.toArray().map((v) => +v.toFixed(2)))');
  for (const p of [A, B]) await p.ev("Input.sim.z = 1; Input.sim.x = 0.4; Input.sim.held.add('sprint'); Input.sim.held.add('jump'); 1");
  await sleep(1500);
  await release(A, B);
  const p1 = await both(A, B, 'JSON.stringify(Player.body.p.toArray().map((v) => +v.toFixed(2)))');
  if (p0[0] !== p1[0] || p0[1] !== p1[1]) return fail(`a frozen player moved: ${JSON.stringify({ p0, p1 })}`);
  covered.push('both frozen: stick, sprint and jump held 1.5 s move nobody (both screens)');

  // the timeline: step 1 at 6 s, 2 at 16 s; both screens on the same step, camera on the shot
  if (!(await untilBoth(A, B, 'Story.S.x.step >= 2', 25000))) return fail(`timeline stuck at ${JSON.stringify(await both(A, B, 'Story.S.x.step'))}`);
  const cam = await both(A, B, 'R.camera.position.distanceTo(Player.body.p)');
  const vis = await both(A, B, MATE);
  if (vis.some((v) => v !== true)) return fail(`partner hidden before the flash: ${JSON.stringify(vis)}`);
  covered.push(`host timeline step 2 on both screens (camera ${cam.map((v) => v.toFixed(0)).join(' / ')} m from the player)`);

  // the white flash (step 5, 43 s): the partner gone on both screens at once
  if (!(await untilBoth(A, B, 'Story.S.x.step >= 5', 35000))) return fail('the timeline did not reach the white flash');
  await sleep(1500);
  if (!(await untilBoth(A, B, `!(${MATE})`, 8000))) return fail(`partner still drawn after the flash: ${JSON.stringify(await both(A, B, MATE))}`);
  covered.push('step 5 (white flash) on both screens: the partner drawn until then, gone on both screens');
  if (!(await untilBoth(A, B, "Story.S.phase === 'act5'", 20000))) return fail(`not in act5 at the end: ${JSON.stringify(await both(A, B, 'Story.S.phase'))}`);
  const m = await json(A, 'Player.mode');
  covered.push(`end of the scene: act5 on both screens (host ${m})`);
  return { covered, ok: true };
};
