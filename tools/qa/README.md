# BORDERLINE regression tests

Two headless players (Yoline = host, William) play in local co-op in one Chrome, driven over the
DevTools protocol. No dependencies: Node 22+ and Google Chrome.

```
node tools/qa/suite.mjs                      # everything (about 15 min)
node tools/qa/suite.mjs --tests phases --phases tr_s1,tr_c10
node tools/qa/suite.mjs --tests cycles --cycles tr_c10:5
node tools/qa/suite.mjs --compare tools/qa/baseline/2026-10-16-main-85fdce1.json
```

What it checks:

| test | what passes |
|---|---|
| boot | both players start and agree on the phase |
| phases | each level loads on both screens, no page exception or console error |
| coop | each screen draws the partner where the partner really is (< 0.5 m) |
| save | the host saves the level; after a reload both players resume in it |
| cycles | city → level → city round trips; the city is measured after each return |

What it records per phase: draw calls, triangles, fps and 95th percentile frame time, GPU
geometries / textures / shader programs, scene meshes, materials, lights, JS heap, the time until
the world stops uploading (`settleMs`), and on Windows the dedicated GPU memory of the run's own
Chrome GPU process. `report.json` and `summary.md` go to `tools/qa/out/<run>/` (not committed);
`--shots` adds a screenshot of both screens per phase.

Options: `--port` (server, default 8850) and `--cdp` (DevTools, default 9420) must be unique per
person or agent running tests at the same time; `--url` tests an already running server; `--fresh`
reloads before each phase for cold numbers. The run's Chrome uses its own profile under `out/`,
runs at idle CPU priority and is closed at the end; no other Chrome is touched.

Numbers depend on the machine: compare runs from the same computer. Both players render on the
same GPU here, so the GPU memory is the sum of two game instances.

`baseline/` keeps reference reports of `main` before the foundation work, to compare against.

`avatar-parts.js` counts the triangles of an astronaut per part (limbs, gloves, helmet, visor…),
for the film's resolution or a lighter one: evaluate it in the game page, then
`__parts.classify(__parts.rig(true, { detail: 'game' }))`.

## Interactions and coverage

`tools/qa/play/<phase>.mjs` scripts drive real interactions of a level on both screens (test `play`):
each exports `default async ({ A, B, go, sleep, log }) => ({ covered: [...], ok, notes })`, where
A is Yoline (host) and B William (guest); `Story.role` gives each page's kit for the level, and
`Story.ctx.act(d)` sends an action as that player. Every summary ends with a **Coverage** section:
which phases loaded on both screens, which were unloaded and rebuilt, where co-op and save were
checked, and the interactions each script covered; phases without a script are listed as "load,
render and errors only", and the summary ends with how many playable phases have a script.

`play-kit.mjs` holds what the scripts share: `hands(A, B)` injects `campaign/lib.js` (real input
through `Input.sim`: `CB.walk`, `CB.go`, `CB.trek` which hops a lip like a player, `CB.tap`,
`CB.aim`…), `kits`, `until` / `untilBoth`, `key` (real key events: Enter closes a memory card),
`rebuild` (the world unloaded in the city and rebuilt identical) and `rebuildHeld` (a table of the
Cour: kept through the city, unloaded at another épreuve, rebuilt identical), and fingerprint
helpers (`owned`: a world's colliders, `meshes`: the meshes of its group). A script states in its
`notes` every step it set up instead of playing (`setup: …`).

`check-grapple.mjs` (fix-kit style, `--port` / `--cdp`) checks the grapple itself on tr_h6's ring:
the valet kit never locks, no lock looking away or out of range, F flies (the partner's screen
draws the rope's hook on the ring), Space lets go, a full flight lands past the gap on both screens.

Memory tools (Windows, same port options):

- `mem-tour.mjs`: city → level → city for every phase with `mem-gl.js` in each page, a ledger of
  the live WebGL allocations (textures, buffers, renderbuffers, by the phase that made them), the
  three.js counters and the Windows GPU counters (our process, and the whole adapter). `--root`
  tests another checkout, `--pages 1` the host alone, `--gc` forces a collection before each
  measure, `--lose` ends with `WEBGL_lose_context`.
- `mem-rebuild.mjs --phases a,b [--reload a] [--fp '<expr>']`: first build against the build after
  a trip to the city (counts, the world's unload record, spawn-view screenshots compared pixel by
  pixel), and a reload in the level after the rebuild.

## The campaign: a new game played to the credits

`campaign/run.mjs` starts a NEW game (fresh profile, no save) with two players in local co-op and
plays it the way two players do, to the credits, without ever calling `Story.goto` to skip ahead:

```
node tools/qa/campaign/run.mjs                        # Yoline creates the game
node tools/qa/campaign/run.mjs --host william         # William creates it
node tools/qa/campaign/run.mjs --from tr_c1 --stop tr_c1 --no-resume-checks   # one level
node tools/qa/campaign/run.mjs --from act5 --resume tools/qa/out/campaign-…   # an earlier run's save
```

`--stop <phase>` ends after that level, `--cap <s>` bounds the wait per level, `--no-resume-checks`
skips the four save/resume checks. A full run takes about 2 h 30 to 2 h 45 on this machine.

- Prologue: each player walks from their corner of the city to the plaza by the streets (a path
  finder over the physics boxes, `campaign/lib.js`); the welcome plays; then, for every épreuve,
  both walk to the lit door (`Trials.next`) and the host lets them in.
- Each level is played by `campaign/levels/<phase>.js`, injected in both pages: each page plays its
  own kit (`Story.role`) through the game's input path (`Input.sim`, read by `Input.poll` like the
  keyboard: the level's own `update()` sends the actions), real positions and real weapon hits.
  A solver notes each step and how it was done: « entrée réelle », « action du jeu »
  (`Story.ctx.act` with the object `update()` would send), « raccourci : raison » (a teleport or
  state read where real play was not feasible), « info partagée » (what one screen shows and the
  player would say out loud). A level without a solver is crossed with a labelled shortcut.
- Rewards (card counted on both pages), films (skipped by holding E: real key events through
  the DevTools protocol), memory cards and the letter (Enter) are handled by the runner. When a
  world is finished and its memory is marked in the city, both walk to it and look at it (E).
- Then the last memory, act3 (lift, roof bench), act4, act5 (three aces), the final, the epilogue
  and the credits.
- Save and resume: at four points (world 1 mid-way, the first level of world 2, inside the Cour,
  the start of act5) both pages are closed and reopened; both must resume at the saved phase with
  the same cards and done épreuves. Kits are checked against the plan in every level, and the two
  pages are compared (phase, cards, done, chapter) after every level.

Output: `tools/qa/out/campaign-<date>-<host>/journal.md` and `journal.json` (chronological: time,
phase, step, who, how, result), screenshots of each blocking step, `save.json`. The run stops on a
blocking step with its context and goes on past it with a labelled shortcut when there is one.
Ports default to 8863 / 9433 (`--port`, `--cdp`).
