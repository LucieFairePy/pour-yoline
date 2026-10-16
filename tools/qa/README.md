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
