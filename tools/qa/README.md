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
render and errors only".

Memory tools (Windows, same port options):

- `mem-tour.mjs`: city → level → city for every phase with `mem-gl.js` in each page, a ledger of
  the live WebGL allocations (textures, buffers, renderbuffers, by the phase that made them), the
  three.js counters and the Windows GPU counters (our process, and the whole adapter). `--root`
  tests another checkout, `--pages 1` the host alone, `--gc` forces a collection before each
  measure, `--lose` ends with `WEBGL_lose_context`.
- `mem-rebuild.mjs --phases a,b [--reload a] [--fp '<expr>']`: first build against the build after
  a trip to the city (counts, the world's unload record, spawn-view screenshots compared pixel by
  pixel), and a reload in the level after the rebuild.
