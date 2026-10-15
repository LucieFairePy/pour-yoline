# BORDERLINE: asset credits

Outside assets used by the game: what each one is, where it comes from, who made it, its licence,
and what was changed. Each licence was checked on the asset's own page. Credit is required for the
**CC-BY** assets, and the game also shows it on the pause screen. Crediting the CC0 assets is
optional, but they are listed too.

## Model

| File | Source | Author | Licence | Changes |
|------|--------|--------|---------|---------|
| `weapons/ak47.glb` | "AK-47", https://sketchfab.com/3d-models/ak-47-492ca153f57144b996553a83ef6fde09 | **Beerus** (https://sketchfab.com/beerusu798) | **CC-BY 4.0** | Re-oriented and rescaled (1.1 m rifle space, shown at x0.8, i.e. 0.88 m), origin moved to the top of the pistol grip. The 27 parts were joined into 4: body, magazine, bolt carrier with the charging handle, and trigger (pivot on its top). The 4K PBR atlas was re-encoded as JPEG: base colour 2K, metal/roughness and normal 1K. 20.4k triangles, 1.4 MB. |

> This work is based on "AK-47" (https://sketchfab.com/3d-models/ak-47-492ca153f57144b996553a83ef6fde09)
> by Beerus (https://sketchfab.com/beerusu798), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

## Effects (`weapons/vfx/`)

| File | Source | Author | Licence | Changes |
|------|--------|--------|---------|---------|
| `vfx_muzzle_front.png` (4 cells) | "Muzzle Flash particle sheet", https://opengameart.org/content/muzzle-flash-particle-sheet | leftshoe18 | CC0 | Cells normalised and mapped through a fire ramp; borders faded. |
| `vfx_muzzle_side.png` (4 cells) | Kenney "Particle Pack", https://kenney.nl/assets/particle-pack (`muzzle_01..04_rotated`) | Kenney | CC0 | Resized to 128 px, fire ramp tint, border fade. |
| `vfx_smoke.png` (4 cells) | Kenney "Particle Pack" (`smoke_04/05/07/08`) | Kenney | CC0 | Luminance to alpha, white RGB, 128 px. |
| `vfx_particles.png` (spark, glint, dust, chips) | Kenney "Particle Pack" (`trace_01`, `star_04`, `smoke_02`, `dirt_01`) | Kenney | CC0 | Luminance to alpha, white RGB, 128 px. |
| `vfx_decals.png` cells 0, 5 (concrete) | "Bullet Decal", https://opengameart.org/content/bullet-decal | musdasch | CC0 | Resized; cell 5 rotated and scaled. |
| `vfx_decals.png` cells 1, 6 (metal), 2 (wood), 4 (dirt) | composites of the musdasch hole with Kenney `circle_02`, `trace_01`, `dirt_03` | musdasch, Kenney | CC0 | Composited and tinted (no licensed metal/wood/dirt bullet-hole art was found). |
| `vfx_decals.png` cell 3 (glass) | "Broken Glass - Batch of 7 Seamless Textures with normalmaps", https://opengameart.org/content/broken-glass-batch-of-7-seamless-textures-with-normalmaps (`RadialCracksB_S.jpg`) | **Keith333** | **CC-BY 3.0** | Cropped around the impact, high-pass luminance to alpha, radial edge fade. |
| `vfx_decals.png` cell 7 (soot) | Kenney "Particle Pack" (`scorch_02`) | Kenney | CC0 | Luminance to alpha, near-black RGB. |

## Sounds (`weapons/audio/`)

All sounds are MP3s at 44.1 kHz, mono unless noted. Each was trimmed (about 2 ms before the
transient), faded out and peak-normalised.

| File | Source | Author | Licence | Notes |
|------|--------|--------|---------|-------|
| `shot_1..4.mp3` | "The Free Firearm Sound Library", https://opengameart.org/content/the-free-firearm-sound-library (`AK-47/C_28P.wav`) | The Free Firearm Sound Library team (freefirearmsfx.com) | CC0 | Four single AK-47 shots, close, 0.55 s each. |
| `shot_5.mp3` | "AK47 Shot", https://freesound.org/s/163457/ | LeMudCrab | CC0 | Fifth variant. |
| `shot_far.mp3` | same library (`AK-47/C_31P.wav`) | The Free Firearm Sound Library team | CC0 | Real mid-distance recording, used for the partner's shots beyond 45 m. |
| `tail.mp3` (stereo) | same library (`AK-47/C_31P.wav`) | The Free Firearm Sound Library team | CC0 | The outdoor echo after a shot, without the shot itself. |
| `mag_out.mp3`, `mag_in.mp3` | "AK-47 Assault Rifle being unloaded and reloaded", https://freesound.org/s/674742/ | serøutōnin--deprivəd | CC0 | Real AK magazine out and magazine in. |
| `bolt_back.mp3`, `bolt_fwd.mp3` | "AK-47 assault rifle being cocked 3x", https://freesound.org/s/675008/ | serøutōnin--deprivəd | CC0 | The third rack: pull and release. |
| `casing_1..4.mp3` | "Brass bullet shell casing drop onto concrete, multiple takes", https://freesound.org/s/210102/ | GrayJoy | CC0 | Four separate drops. |
| `handling.mp3` | "Gun reload sounds", https://opengameart.org/content/gun-reload-sounds (`gunreload1.wav`) | SpringySpringo | CC0 | Gear rattle (airsoft). |
| `impact_concrete_1.mp3`, `impact_metal_1.mp3`, `impact_wood.mp3`, `impact_glass.mp3` | "75 CC0 breaking/falling/hit sfx", https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx | rubberduck | CC0 | `bfh1_rock_hit_01`, `bfh1_metal_hit_03`, `bfh1_wood_hit_01`, `bfh1_glass_hit_01`. |
| `impact_concrete_2.mp3`, `impact_metal_2.mp3` | "100 CC0 SFX #2", https://opengameart.org/content/100-cc0-sfx-2 | rubberduck | CC0 | `sfx100v2_hit_03`, `sfx100v2_metal_hit_02`. |
| `impact_dirt.mp3` | Kenney "Impact Sounds", https://kenney.nl/assets/impact-sounds (`impactSoft_heavy_000`) | Kenney | CC0 | |

## Considered and not kept

- **Models.**
  - "AK-47 Game Ready" by Billy Jackman (Sketchfab, CC-BY) was not downloaded.
  - The CC0 AK-47 from 3dmodelscc0's "Free CC0 guns & explosives pack" (itch.io) is good (4.8k triangles, 2K PBR, separate magazine), but Beerus' model is more detailed at the same distance.
  - "AKM" by J-Toastie (Poly Pizza, CC-BY 3.0) is accurate and rigged, but only has flat colours.
  - Quaternius' "Ak47" (Poly Pizza, CC0) is a different, toy-like gun.
  - From OpenGameArt: "AK-47" by taradavies (CC0) has missing textures and is 53k triangles once subdivided; "High Poly AK-47" (CC0) is modelled on one side only with no UVs; "Soviet Assault Rifle 3D" by GGBotNet (CC0) is untextured.
  - The procedural rifle in `js/game/weapons.js` stays as the fallback until the model has loaded.
- **Sounds.** "Gunshot Sounds" on OpenGameArt says CC0 on its page, but its zip carries a CC-BY notice, so it was left out. Ricochets were only found under CC-BY-SA, so they are not used.

## Scenery textures and light (`textures/`, `fx/`) — Look pass, Terre 39 prototype

All CC0; credited as a courtesy. Taken from the local library `BORDERLINE_ASSETS_LIBRARY` (each
set's `_SOURCE_ET_LICENCE.json` / `License.txt` was checked).

| File | Source | Author | Licence | Changes |
|------|--------|--------|---------|---------|
| `textures/asphalt_alb.webp`, `asphalt_nrm.jpg` | "Asphalt 01", https://polyhaven.com/a/asphalt_01 | Poly Haven | CC0 | AO baked into the colour, desaturated, brightness matched to the game's asphalt; normal (OpenGL) and roughness packed in one JPEG; 1K. |
| `textures/stone_alb.webp`, `stone_nrm.jpg` | "Castle Wall Varriation", https://polyhaven.com/a/castle_wall_varriation | Poly Haven (Rob Tuytel) | CC0 | Normal and cavity AO computed from its height map; desaturated 45 %; 2K colour, 1K data. |
| `textures/wood_alb.webp`, `wood_nrm.jpg` | "Wooden Planks", https://polyhaven.com/a/wooden_planks | Poly Haven | CC0 | AO baked, colour matched to the game's wood; normal + roughness packed; 2K colour, 1K data. |
| `fx/lamp_cone.png` | "Light Masks" (`cone_d_blur`), https://kenney.nl/assets/light-masks | Kenney | CC0 | Luminance only, flipped, 128×256. |

## Sounds (`sounds/kenney/`) — Look pass

| File | Source | Author | Licence | Notes |
|------|--------|--------|---------|-------|
| `card_slide_*`, `card_place_*`, `card_fan_*`, `card_shove_*` | "Casino Audio", https://kenney.nl/assets/casino-audio | Kenney | CC0 | Trimmed, normalised (RMS −20 to −24 dBFS, peak ≤ −3 dBFS), mono MP3. |
| `ui_click_*` | "Interface Sounds", https://kenney.nl/assets/interface-sounds (`click_001`, `select_001`, `select_002`) | Kenney | CC0 | idem |
| `step_concrete_*`, `step_wood_*`, `land_*`, `glass_*` | "Impact Sounds", https://kenney.nl/assets/impact-sounds (`footstep_concrete`, `footstep_wood`, `impactSoft_heavy`, `impactGlass_heavy`) | Kenney | CC0 | idem |
| `switch_latch`, `switch_click`, `creak_*` | "RPG Audio", https://kenney.nl/assets/rpg-audio (`metalLatch`, `metalClick`, `creak1..3`) | Kenney | CC0 | idem |
